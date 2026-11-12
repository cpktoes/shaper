import { readFileSync } from "node:fs";
import { devices, expect, test, type Download, type Locator, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { presetDesignFields } from "../lib/blanks/preset-blanks";
import { readBrdText } from "../lib/export/brd";
import { BRD_MAGIC, unscrambleBrd } from "../lib/export/brd-scramble";
import { brdPreview, brdPreviewWords } from "../lib/export/brd-preview";
import { DEFAULT_BOTTOM, pickCut, startingChannels, switchChannelCount, type BoardBottom } from "../lib/geometry/bottom";
import { LIVE_DESIGN_RULES, designBottomBoard, designFinPlacement, designSideProfile } from "../lib/geometry/design";
import { buildOutline } from "../lib/geometry/outline";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { inchesToMm, mmToCentimetres } from "../lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "../lib/geometry/volume";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { boardFileStem } from "../lib/models/board-file";
import type { DesignSnapshotFields } from "../lib/models/design-snapshot";
import { OPEN_BOARD_STORAGE_KEY, openBoardCopyJson } from "../lib/models/open-board";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { setMetricUnits } from "./helpers/guide";
import { goToScreen } from "./helpers/screens";

/**
 * Export .brd File (Phase 16, plan 12; D-14, D-15 as amended by D-23, D-16; quick 261110-tvk): one tap on the 3D panel
 * downloads one AkuShaper board file of the board the screen draws, named from the board, with a status line that says
 * what arrived. Every downloaded file is unlocked and read back with the writer's own readers (`unscrambleBrd`,
 * `readBrdText`), every expected name comes from `boardFileStem`, and every word from `THREE_D_COPY`, so nothing here
 * is typed twice.
 *
 * The download is started inside the tap (Safari refuses one started after it), and the iPhone project is WebKit, so
 * these cases prove it there too. Every case runs signed out.
 */

/** WebKit draws its first frame more slowly on the suite's development server (about 5 s measured). */
const FIRST_FRAME_MS = 30_000;

/** The board name case 1 types into SUMMARY's Board Name box: an inch mark the file names must drop. */
const FISH_NAME = `Fish 5'10"`;

async function dismissStrips(page: Page) {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
      // The development server's round Next.js badge sits bottom left, over a phone's Cancel; a deployed site has none.
      document.addEventListener("DOMContentLoaded", () => {
        const hide = document.createElement("style");
        hide.textContent = "nextjs-portal{display:none !important}";
        document.head.appendChild(hide);
      });
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
}

/** A preset's fields as its card opens it, the way `keepBoard` stores them (a `bottom` of its own is optional). */
function presetFields(presetName: string, lengthMm?: number, bottom?: BoardBottom): DesignSnapshotFields {
  const preset = BOARD_PRESETS.find((p) => p.name === presetName);
  if (!preset) throw new Error(`no ${presetName} preset`);
  const base = presetDesignFields(preset);
  return {
    ...base,
    outline: lengthMm === undefined ? base.outline : { ...base.outline, length: lengthMm as typeof base.outline.length },
    volume: DEFAULT_VOLUME_SPEC,
    finsImportTemplate: true,
    railsImportFoilThickness: true,
    boardName: "",
    finSystem: "fcs2",
    ...(bottom ? { bottom } : {}),
  };
}

/** A preset as its card opens it, kept in this browser as an earlier visit would have left it. */
async function keepBoard(page: Page, presetName: string, lengthMm?: number, bottom?: BoardBottom) {
  const fields = presetFields(presetName, lengthMm, bottom);
  const raw = openBoardCopyJson(fields, { modelId: null, ownerId: null, locked: false, dirty: true });
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [OPEN_BOARD_STORAGE_KEY, raw] as const);
}

/**
 * A preset's bottom with 4 channels (and, when `deepSingle` is true, a Deep Single Concave), built with the app's own
 * helpers against the board the preset makes; `channels: false` is the same bottom with Channels None, the way the
 * Channels menu's None does it.
 */
function presetBottom(presetName: string, options: { deepSingle: boolean; channels: boolean }): BoardBottom {
  const fields = presetFields(presetName);
  const board = designBottomBoard(
    fields.outline,
    buildOutline(fields.outline),
    designSideProfile(fields, LIVE_DESIGN_RULES),
    designFinPlacement(fields),
  );
  const cuts = options.deepSingle ? pickCut(DEFAULT_BOTTOM, "center", "Deep Single Concave", board) : DEFAULT_BOTTOM;
  const four = { ...cuts, channels: startingChannels(4, board, cuts.channels) };
  return options.channels ? four : { ...four, channels: switchChannelCount(four.channels, 0, board) };
}

const boardHost = (page: Page) => page.locator("[data-board-3d]");
const exportButton = (page: Page) => page.getByRole("button", { name: THREE_D_COPY.exportButton, exact: true });
const exportStatus = (page: Page) => page.locator("[data-three-d-export] [role='status']");
const panel = (page: Page) => page.locator("[data-three-d-controls]");

async function waitForBoard(page: Page): Promise<Locator> {
  const host = boardHost(page);
  await expect(host).toHaveAttribute("data-board-state", "ready", { timeout: FIRST_FRAME_MS });
  return host;
}

/** The note is under the button, verbatim, whatever the state (case 7). */
async function expectNote(page: Page) {
  await expect(page.locator("[data-three-d-export]").getByText(THREE_D_COPY.exportNote, { exact: true })).toBeVisible();
}

/** The swallow line (quick 261110-veo): under the note on a swallow-tail board, the file written with a square tail. */
const swallowNote = (page: Page) => page.locator("[data-three-d-export]").getByText(THREE_D_COPY.exportSwallowNote, { exact: true });

/** The channels line (quick 261112-c2d): under the note on a board with channels, the file written without them. */
const channelsNote = (page: Page) => page.locator("[data-three-d-export]").getByText(THREE_D_COPY.exportChannelsNote, { exact: true });

/** The Board file preview (quick 261112-dbi): what Export .brd File opens, and where the download now starts. */
const previewDialog = (page: Page) => page.locator("[data-brd-preview]");
const previewSave = (page: Page) => previewDialog(page).getByRole("button", { name: THREE_D_COPY.previewSave, exact: true });

/** Taps Export .brd File and waits for the preview to open: nothing has been downloaded yet. */
async function openPreview(page: Page) {
  await expect(exportButton(page)).toBeEnabled();
  await exportButton(page).click();
  await expect(previewDialog(page)).toBeVisible();
  await expect(previewDialog(page).getByText(THREE_D_COPY.previewTitle, { exact: true })).toBeVisible();
}

/** Presses Save .brd File in the open preview and answers the download the browser received; the dialog closes. */
async function savePreview(page: Page): Promise<Download> {
  const [download] = await Promise.all([page.waitForEvent("download"), previewSave(page).click()]);
  await expect(previewDialog(page)).toHaveCount(0);
  return download;
}

/** Taps Export .brd File, then Save .brd File in the preview, and answers the download the browser received. */
async function exportFile(page: Page): Promise<Download> {
  await openPreview(page);
  return savePreview(page);
}

/** Under the SLICE caption: `Slice 9 of 22 · 28" from the tail`. */
const sliceLine = (page: Page) => previewDialog(page).locator("[data-brd-preview-slice-line]");
/** Under the drawings: the slice count, the widest gap and the file's own length × width × thickness. */
const factsLine = (page: Page) => previewDialog(page).locator("[data-brd-preview-facts]");

/** What the preview should have drawn, read from the bytes the browser saved (the app's own readers, nothing typed). */
function previewOfBytes(bytes: Uint8Array) {
  return brdPreview(readBrdText(unscrambleBrd(bytes)));
}

/** The slice number a slice line names, and how many there are. */
async function sliceNumbers(page: Page): Promise<{ n: number; of: number }> {
  const text = (await sliceLine(page).textContent()) ?? "";
  const m = /^Slice (\d+) of (\d+)/.exec(text);
  if (!m) throw new Error(`not a slice line: ${text}`);
  return { n: Number(m[1]), of: Number(m[2]) };
}

/** Taps or clicks the middle of one slice line in the top or side view (a tap anywhere picks the nearest slice). */
async function tapSliceLine(page: Page, view: "top" | "side", number: number) {
  const line = previewDialog(page).locator(`[data-brd-preview-${view}] [data-brd-slice="${number}"]`);
  await line.scrollIntoViewIfNeeded();
  const box = await line.boundingBox();
  if (!box) throw new Error(`slice ${number} has no box in the ${view} view`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches)) {
    await page.touchscreen.tap(x, y);
  } else {
    await page.mouse.click(x, y);
  }
}

/** The downloaded file's bytes, read from where the browser put it. */
async function downloadedBytes(download: Download): Promise<Uint8Array> {
  const path = await download.path();
  if (!path) throw new Error("the download has no file");
  return new Uint8Array(readFileSync(path));
}

/**
 * Reads a downloaded board file back whole for the board named `boardName`: its suggested name, AkuShaper's stamp, the
 * text unlocked and read strictly, and the status line's done line counting the cross-sections the file holds. Answers
 * what was read and the section count (the sections with more than one knot: an empty tip section has one).
 */
async function expectWholeBrd(page: Page, download: Download, boardName: string) {
  const stem = boardFileStem(boardName);
  expect(download.suggestedFilename()).toBe(`${stem}.brd`);
  const bytes = await downloadedBytes(download);
  expect(new TextDecoder().decode(bytes.subarray(0, BRD_MAGIC.length)), "the file wears AkuShaper's stamp").toBe(BRD_MAGIC);
  const read = readBrdText(unscrambleBrd(bytes));
  const sections = read.sections.filter((section) => section.knots.length > 1).length;
  expect(sections).toBeGreaterThan(0);
  await expect(exportStatus(page)).toHaveText(THREE_D_COPY.exportDone(`${stem}.brd`, sections));
  // The file's name alone is in ink; the rest of the line is muted.
  await expect(exportStatus(page).locator("span.text-surf-ink")).toHaveText(`${stem}.brd`);
  return { read, sections, stem };
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  await dismissStrips(page);
});

test.describe("Export .brd File on the 3D screen", () => {
  test("1. one tap downloads the named board's .brd, the board the screen draws, with the done line", async ({
    page,
  }) => {
    await keepBoard(page, "Fish");
    await page.goto("/design/summary");
    const nameBox = page.locator("[data-order-form-page]").getByRole("textbox", { name: /Board Name/ });
    await expect(nameBox).toBeEditable();
    // A name typed a moment before React owns the box is wiped when it takes over; type again until it holds.
    await expect(async () => {
      await nameBox.fill(FISH_NAME);
      await expect(nameBox).toHaveValue(FISH_NAME, { timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
    await goToScreen(page, "3D");
    await waitForBoard(page);

    // Idle: the line is in the page, empty.
    await expect(exportStatus(page)).toHaveCount(1);
    await expect(exportStatus(page)).toHaveText("");
    await expectNote(page);
    // The Fish has a swallow tail, which the file writes as a square one: the page says so, under the note.
    await expect(swallowNote(page)).toBeVisible();
    await expect(page.locator("[data-three-d-export-swallow]")).toHaveCount(1);
    // The Fish has no channels, so no channels line.
    await expect(channelsNote(page)).toHaveCount(0);
    // The screen's one accent-filled action, last on the panel. The two-way switch's pressed pill wears the accent as
    // every two-way pill in the app does, but it shows a state and carries `aria-pressed`, so it isn't counted (16-18).
    const action = panel(page).locator("button.bg-surf-accent:not([aria-pressed])");
    await expect(action).toHaveCount(1);
    await expect(action).toHaveText(THREE_D_COPY.exportButton);

    // Export opens the preview and downloads nothing; its top view draws a line across the board at every slice.
    await openPreview(page);
    await expect(previewDialog(page).locator("[data-brd-preview-top] [data-brd-slice]").first()).toBeAttached();
    const topLines = await previewDialog(page).locator("[data-brd-preview-top] [data-brd-slice]").count();
    const sideLines = await previewDialog(page).locator("[data-brd-preview-side] [data-brd-slice]").count();
    // The dialog says the swallow is written square, and the Fish has no channels to leave out.
    await expect(previewDialog(page).locator("[data-brd-preview-swallow]")).toHaveText(THREE_D_COPY.exportSwallowNote);
    await expect(previewDialog(page).locator("[data-brd-preview-channels]")).toHaveCount(0);
    const facts = (await factsLine(page).textContent()) ?? "";
    const download = await savePreview(page);
    const { read, stem, sections } = await expectWholeBrd(page, download, FISH_NAME);
    expect(stem).toBe(boardFileStem(FISH_NAME));
    expect(topLines, "the top view has a slice line for every cross-section in the file").toBe(sections);
    expect(sideLines, "so does the side view").toBe(sections);
    // The dialog was drawn from the very bytes saved: its facts line is the saved file's own reading.
    const saved = previewOfBytes(await downloadedBytes(download));
    const words = brdPreviewWords(saved, "imperial");
    expect(facts).toBe(THREE_D_COPY.previewFacts(saved.slices.length, words.gap, words.dims));
    // The file's length and width are the Fish preset's own, in centimetres.
    const fish = presetDesignFields(BOARD_PRESETS.find((preset) => preset.name === "Fish")!).outline;
    const header = new Map(read.header);
    expect(Number(header.get("p01"))).toBeCloseTo(mmToCentimetres(fish.length), 6);
    expect(Number(header.get("p04"))).toBeCloseTo(mmToCentimetres(fish.widePointWidth), 6);
    // Every cross-section the file holds, but the one-knot ones that close the tips, has the same number of knots.
    const knotCounts = new Set(read.sections.filter((section) => section.knots.length > 1).map((section) => section.knots.length));
    expect(knotCounts.size).toBe(1);
    await expectNote(page);
    await expect(swallowNote(page)).toBeVisible();
  });

  test("2. with no 3D drawing the message shows and Export still downloads the whole file, the same as with it", async ({
    page,
    context,
  }) => {
    // The board drawn as normal first, in a page of its own.
    const drawn = await context.newPage();
    await dismissStrips(drawn);
    await drawn.goto("/design/3d");
    await waitForBoard(drawn);
    const normal = await downloadedBytes(await exportFile(drawn));
    await drawn.close();

    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = function () {
        return null;
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await page.goto("/design/3d");
    await expect(boardHost(page)).toHaveAttribute("data-board-state", "no-webgl", { timeout: FIRST_FRAME_MS });
    await expect(page.locator("[data-canvas-message]").getByText(THREE_D_COPY.browserCantDraw.line1)).toBeVisible();
    await expectNote(page);
    const download = await exportFile(page);
    const { read } = await expectWholeBrd(page, download, "");
    // The same sections, the same bytes, as the drawn board's.
    expect(Buffer.from(await downloadedBytes(download)).equals(Buffer.from(normal))).toBe(true);
    expect(read.sections.length).toBe(readBrdText(unscrambleBrd(normal)).sections.length);
  });

  test("3. a board that can't be built: Export is dimmed and the line says why", async ({ page }) => {
    // 40" is a length a saved board may hold but outside the app's range, so the builder refuses it.
    await keepBoard(page, "Fish", inchesToMm(40));
    await page.goto("/design/3d");
    await expect(boardHost(page)).toHaveAttribute("data-board-state", "cant-build", { timeout: FIRST_FRAME_MS });
    await expect(exportButton(page)).toBeDisabled();
    await expect(exportStatus(page)).toHaveText(THREE_D_COPY.exportNothingYet);
    await expectNote(page);
  });

  test("4. the file never changes with the switches: Fins, Blank, Contour Stripes and Wire View leave the .brd byte for byte the same", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the switches' views are proven on every project in three-d-show; the bytes here");
    await keepBoard(page, "Fish");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    const corner = (name: string) => page.locator("[data-viewer-toolbar]").getByRole("button", { name, exact: true });
    await expect(corner(THREE_D_COPY.fins)).toHaveAttribute("aria-pressed", "true");
    await expect(corner(THREE_D_COPY.blank)).toHaveAttribute("aria-pressed", "false");
    await expect(corner(THREE_D_COPY.contourStripes)).toHaveAttribute("aria-pressed", "false");
    await expect(corner(THREE_D_COPY.wireView)).toHaveAttribute("aria-pressed", "false");
    const first = await exportFile(page);
    const firstBytes = await downloadedBytes(first);

    // Fins off, Blank on, Contour Stripes on: everything the picture can add or take away, flipped.
    await corner(THREE_D_COPY.fins).click();
    await corner(THREE_D_COPY.blank).click();
    await corner(THREE_D_COPY.contourStripes).click();
    await expect(corner(THREE_D_COPY.fins)).toHaveAttribute("aria-pressed", "false");
    await expect(corner(THREE_D_COPY.blank)).toHaveAttribute("aria-pressed", "true");
    await expect(corner(THREE_D_COPY.contourStripes)).toHaveAttribute("aria-pressed", "true");
    const second = await exportFile(page);
    const secondBytes = await downloadedBytes(second);

    expect(secondBytes.byteLength).toBe(firstBytes.byteLength);
    expect(Buffer.from(secondBytes).equals(Buffer.from(firstBytes)), "the file is the bare board whatever the switches say").toBe(
      true,
    );
    await expectWholeBrd(page, second, "");

    // Wire View takes over from Contour Stripes (D-42), and the file is the same again.
    await corner(THREE_D_COPY.wireView).click();
    await expect(corner(THREE_D_COPY.wireView)).toHaveAttribute("aria-pressed", "true");
    await expect(corner(THREE_D_COPY.contourStripes)).toHaveAttribute("aria-pressed", "false");
    const third = await downloadedBytes(await exportFile(page));
    expect(Buffer.from(third).equals(Buffer.from(firstBytes)), "Wire View never reaches the file").toBe(true);

    // The board flipped, raised and walked round, and the room off: the same again (D-16, D-43).
    await page.getByRole("group", { name: THREE_D_COPY.viewsGroup, exact: true }).getByRole("button", { name: THREE_D_COPY.views.bottom, exact: true }).click();
    const raise = page.getByRole("slider", { name: THREE_D_COPY.raiseNose, exact: true });
    await raise.focus();
    for (let i = 0; i < 4; i++) await raise.press("ArrowRight");
    await page.getByRole("group", { name: THREE_D_COPY.modeGroup, exact: true }).getByRole("button", {
      name: THREE_D_COPY.modeWalk,
      exact: true,
    }).click();
    await host.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(host).not.toHaveAttribute("data-viewer", /^0\.00 /);
    const fourth = await downloadedBytes(await exportFile(page));
    expect(Buffer.from(fourth).equals(Buffer.from(firstBytes)), "flipped, raised and walked round, the file is the same").toBe(true);
    // Two presses to no room: the first stops at the bright blue room.
    await corner(THREE_D_COPY.room).click();
    await corner(THREE_D_COPY.room).click();
    await expect(host).toHaveAttribute("data-bay", "off");
    const fifth = await downloadedBytes(await exportFile(page));
    expect(Buffer.from(fifth).equals(Buffer.from(firstBytes)), "with the room off, the file is the same").toBe(true);
  });

  test("5. a board with no name downloads Untitled Board.brd", async ({ page }) => {
    await page.goto("/design/3d");
    await waitForBoard(page);
    const download = await exportFile(page);
    expect(download.suggestedFilename()).toBe("Untitled Board.brd");
    await expectWholeBrd(page, download, "");
    await expectNote(page);
    // The board a new shaper starts on has no swallow, so there is no swallow line.
    await expect(swallowNote(page)).toHaveCount(0);
    await expect(channelsNote(page)).toHaveCount(0);
  });

  test("6. a failure says so in warning ink, and pressing Export again is the retry", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a forced failure; the download itself is proven on every project above");
    // The browser refuses to make an address for the file until the test lets it.
    await page.addInitScript(() => {
      const original = URL.createObjectURL.bind(URL);
      (window as unknown as { __failExport: boolean }).__failExport = true;
      URL.createObjectURL = (blob: Blob | MediaSource) => {
        if ((window as unknown as { __failExport: boolean }).__failExport) throw new Error("test: no address for the file");
        return original(blob);
      };
    });
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/design/3d");
    await waitForBoard(page);
    // The failure now comes at Save, the moment the download starts: the dialog closes and the page says so.
    await openPreview(page);
    await previewSave(page).click();
    await expect(previewDialog(page)).toHaveCount(0);
    await expect(exportStatus(page)).toHaveText(THREE_D_COPY.exportFailed);
    await expect(exportStatus(page)).toHaveClass(/text-surf-warning-ink/);
    expect(errors.some((text) => text.includes("could not be made"))).toBe(true);
    await expectNote(page);

    await page.evaluate(() => {
      (window as unknown as { __failExport: boolean }).__failExport = false;
    });
    const download = await exportFile(page);
    await expectWholeBrd(page, download, "");
    await expect(exportStatus(page)).not.toHaveClass(/text-surf-warning-ink/);
  });

  test("7. a board with channels downloads the board before its channels are cut, the same bytes as with Channels None", async ({
    page,
    context,
  }) => {
    // The same Shortboard with a Deep Single and Channels None, in a page of its own.
    const bare = await context.newPage();
    await dismissStrips(bare);
    await keepBoard(bare, "Shortboard", undefined, presetBottom("Shortboard", { deepSingle: true, channels: false }));
    await bare.goto("/design/3d");
    await waitForBoard(bare);
    await expect(bare.locator("[data-three-d-export]").getByText(THREE_D_COPY.exportChannelsNote, { exact: true })).toHaveCount(0);
    const bareBytes = await downloadedBytes(await exportFile(bare));
    await bare.close();

    await keepBoard(page, "Shortboard", undefined, presetBottom("Shortboard", { deepSingle: true, channels: true }));
    await page.goto("/design/3d");
    await waitForBoard(page);
    // The page says so: one line under the note, and no swallow line on a board with a square tail.
    await expectNote(page);
    await expect(channelsNote(page)).toBeVisible();
    await expect(page.locator("[data-three-d-export-channels]")).toHaveCount(1);
    await expect(swallowNote(page)).toHaveCount(0);
    await openPreview(page);
    await expect(previewDialog(page).locator("[data-brd-preview-channels]")).toHaveText(THREE_D_COPY.exportChannelsNote);
    await expect(previewDialog(page).locator("[data-brd-preview-swallow]")).toHaveCount(0);
    const download = await savePreview(page);
    const { read } = await expectWholeBrd(page, download, "");
    // Every section but the one-knot ones that close the tips has the same number of knots, as on a board without channels.
    const knotCounts = new Set(read.sections.filter((section) => section.knots.length > 1).map((section) => section.knots.length));
    expect(knotCounts.size).toBe(1);
    expect(Buffer.from(await downloadedBytes(download)).equals(Buffer.from(bareBytes)), "the channels are left out of the file").toBe(true);
  });

  test("8. a swallow-tail board with channels shows both lines", async ({ page }) => {
    await keepBoard(page, "Fish", undefined, presetBottom("Fish", { deepSingle: false, channels: true }));
    await page.goto("/design/3d");
    await waitForBoard(page);
    await expectNote(page);
    await expect(swallowNote(page)).toBeVisible();
    await expect(channelsNote(page)).toBeVisible();
    // And the preview says both too.
    await openPreview(page);
    await expect(previewDialog(page).locator("[data-brd-preview-swallow]")).toHaveText(THREE_D_COPY.exportSwallowNote);
    await expect(previewDialog(page).locator("[data-brd-preview-channels]")).toHaveText(THREE_D_COPY.exportChannelsNote);
  });

  test("9. the preview steps through the slices, and Cancel, Escape and a click outside save nothing", async ({ page }, testInfo) => {
    const desktop = testInfo.project.name === "desktop";
    await keepBoard(page, "Shortboard", undefined, presetBottom("Shortboard", { deepSingle: true, channels: true }));
    const downloads: string[] = [];
    page.on("download", (download) => downloads.push(download.suggestedFilename()));
    await page.goto("/design/3d");
    await waitForBoard(page);

    await openPreview(page);
    await expect(previewDialog(page).locator("[data-brd-preview-top] [data-brd-slice]").first()).toBeAttached();
    const opening = (await sliceLine(page).textContent()) ?? "";
    const { n, of } = await sliceNumbers(page);
    expect(of).toBeGreaterThan(5);
    await expect(previewDialog(page).locator("[data-brd-preview-slice]")).toHaveAttribute("data-brd-preview-slice-at", String(n));
    await expect(previewDialog(page).locator("[data-brd-preview-top] [data-brd-slice-selected]")).toHaveAttribute("data-brd-slice", String(n));
    await expect(previewDialog(page).locator("[data-brd-preview-side] [data-brd-slice-selected]")).toHaveAttribute("data-brd-slice", String(n));

    // ‹ moves toward the nose (the left, the next slice up from the tail) and › back.
    const towardNose = previewDialog(page).getByRole("button", { name: THREE_D_COPY.previewTowardNose, exact: true });
    const towardTail = previewDialog(page).getByRole("button", { name: THREE_D_COPY.previewTowardTail, exact: true });
    await towardNose.click();
    expect((await sliceNumbers(page)).n).toBe(n + 1);
    await expect(previewDialog(page).locator("[data-brd-preview-slice]")).toHaveAttribute("data-brd-preview-slice-at", String(n + 1));
    await towardTail.click();
    expect((await sliceNumbers(page)).n).toBe(n);
    await expect(sliceLine(page)).toHaveText(opening);

    // The arrow keys do the same, with focus in the dialog.
    if (desktop) {
      await page.keyboard.press("ArrowLeft");
      expect((await sliceNumbers(page)).n).toBe(n + 1);
      await page.keyboard.press("ArrowRight");
      expect((await sliceNumbers(page)).n).toBe(n);
    }

    // A tap or click on a view picks the slice nearest it: slice 3 in the top view, slice 15 in the side view.
    await tapSliceLine(page, "top", 3);
    expect((await sliceNumbers(page)).n).toBe(3);
    await expect(previewDialog(page).locator("[data-brd-preview-slice]")).toHaveAttribute("data-brd-preview-slice-at", "3");
    await tapSliceLine(page, "side", 15);
    expect((await sliceNumbers(page)).n).toBe(15);
    await expect(previewDialog(page).locator("[data-brd-preview-slice]")).toHaveAttribute("data-brd-preview-slice-at", "15");
    await expect(previewDialog(page).locator("[data-brd-preview-top] [data-brd-slice-selected]")).toHaveAttribute("data-brd-slice", "15");

    // Cancel, Escape and (on a computer) a click outside close it and save nothing.
    const before = await exportStatus(page).textContent();
    await previewDialog(page).getByRole("button", { name: THREE_D_COPY.previewCancel, exact: true }).click();
    await expect(previewDialog(page)).toHaveCount(0);
    await page.waitForTimeout(1_000);
    expect(downloads).toEqual([]);
    await expect(exportStatus(page)).toHaveText(before ?? "");

    await openPreview(page);
    await page.keyboard.press("Escape");
    await expect(previewDialog(page)).toHaveCount(0);
    await page.waitForTimeout(1_000);
    expect(downloads).toEqual([]);

    if (desktop) {
      await openPreview(page);
      await page.mouse.click(2, 2);
      await expect(previewDialog(page)).toHaveCount(0);
      await page.waitForTimeout(1_000);
      expect(downloads).toEqual([]);
      await expect(exportStatus(page)).toHaveText(before ?? "");
    }

    // Open again, on a fresh slice; Save; the opening line is the saved file's own nearest-the-wide-point slice.
    await openPreview(page);
    await expect(sliceLine(page)).toHaveText(opening);
    const download = await savePreview(page);
    expect(downloads.length).toBe(1);
    const saved = previewOfBytes(await downloadedBytes(download));
    const words = brdPreviewWords(saved, "imperial");
    expect(opening).toBe(THREE_D_COPY.previewSliceLine(saved.openingSlice + 1, saved.slices.length, words.stations[saved.openingSlice]));
  });

  test("10. in Metric the preview reads centimetres, from the saved file", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the units are proven on one project; the figures come from the file");
    await setMetricUnits(page);
    await keepBoard(page, "Shortboard", undefined, presetBottom("Shortboard", { deepSingle: true, channels: true }));
    await page.goto("/design/3d");
    await waitForBoard(page);
    await openPreview(page);
    await expect(previewDialog(page).locator("[data-brd-preview-top] [data-brd-slice]").first()).toBeAttached();
    const opening = (await sliceLine(page).textContent()) ?? "";
    const facts = (await factsLine(page).textContent()) ?? "";
    const download = await savePreview(page);
    const saved = previewOfBytes(await downloadedBytes(download));
    const words = brdPreviewWords(saved, "metric");
    expect(words.dims.endsWith(" cm")).toBe(true);
    expect(words.dims.match(/ cm/g)?.length, "cm once, at the end").toBe(1);
    expect(facts).toBe(THREE_D_COPY.previewFacts(saved.slices.length, words.gap, words.dims));
    expect(opening).toBe(THREE_D_COPY.previewSliceLine(saved.openingSlice + 1, saved.slices.length, words.stations[saved.openingSlice]));
  });
});

/**
 * The preview on a phone (brief item 5): the dialog fills the screen, all three drawings can be reached, and Cancel,
 * Save .brd File, ‹ and › stay in view and at least 44 dots on a finger.
 */
async function phoneChecks(page: Page) {
  await page.goto("/design/3d");
  await waitForBoard(page);
  await openPreview(page);
  const dialog = previewDialog(page);
  await expect(dialog.locator("[data-brd-preview-top] [data-brd-slice]").first()).toBeAttached();
  // The dialog zooms in as it opens; measure it once it has settled, or a box reads a hair under its size.
  await dialog.evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)).then(() => undefined));
  const viewport = page.viewportSize()!;
  const buttons: [string, Locator][] = [
    ["Cancel", dialog.getByRole("button", { name: THREE_D_COPY.previewCancel, exact: true })],
    ["Save", previewSave(page)],
  ];
  for (const [name, button] of buttons) {
    const box = (await button.boundingBox())!;
    expect(box.height, `${name} is a finger-sized box`).toBeGreaterThanOrEqual(44);
    expect(box.y >= 0 && box.y + box.height <= viewport.height + 0.5, `${name} is in view`).toBe(true);
    expect(box.x >= 0 && box.x + box.width <= viewport.width + 0.5, `${name} is across the screen`).toBe(true);
  }
  const steppers: [string, Locator][] = [
    ["‹", dialog.getByRole("button", { name: THREE_D_COPY.previewTowardNose, exact: true })],
    ["›", dialog.getByRole("button", { name: THREE_D_COPY.previewTowardTail, exact: true })],
  ];
  for (const [name, button] of steppers) {
    await button.scrollIntoViewIfNeeded();
    const box = (await button.boundingBox())!;
    expect(box.height, `${name} is 44 dots tall`).toBeGreaterThanOrEqual(44);
    expect(box.width, `${name} is 44 dots wide`).toBeGreaterThanOrEqual(44);
  }
  // Every drawing can be scrolled to, and the part showing is inside the scrolling body between header and footer.
  const body = (await dialog.locator("[data-brd-preview-body]").boundingBox())!;
  for (const drawing of ["[data-brd-preview-top]", "[data-brd-preview-slice]", "[data-brd-preview-side]"]) {
    const svg = dialog.locator(drawing);
    await svg.scrollIntoViewIfNeeded();
    await expect(svg).toBeVisible();
    const box = (await svg.boundingBox())!;
    const overlap = Math.min(box.y + box.height, body.y + body.height) - Math.max(box.y, body.y);
    expect(overlap, `${drawing} shows inside the body`).toBeGreaterThan(0);
  }
  // And a Save from here downloads the file.
  const download = await savePreview(page);
  await expectWholeBrd(page, download, "");
}

test.describe("the preview on an upright phone", () => {
  test("fits, with finger-sized buttons in view and every drawing reachable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "a phone's own layout");
    await phoneChecks(page);
  });
});

// The real sideways iPhone (844 × 390, measured on hardware) and Pixel 7, built the way rocker-custom.spec.ts builds them.
const {
  defaultBrowserType: iphoneLandscapeBrowserType,
  viewport: iphoneLandscapeEmulatorViewport,
  ...iphoneLandscapeRest
} = devices["iPhone 14 landscape"];
void iphoneLandscapeBrowserType;
void iphoneLandscapeEmulatorViewport;
const realSidewaysIphone = { ...iphoneLandscapeRest, viewport: { width: 844, height: 390 } };
const { defaultBrowserType: pixel7LandscapeBrowserType, ...pixel7Landscape } = devices["Pixel 7 landscape"];
void pixel7LandscapeBrowserType;

test.describe("the preview on a real iPhone held sideways", () => {
  test.use({ ...realSidewaysIphone });
  test("fits, with finger-sized buttons in view and every drawing reachable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "this describe supplies its own device (iPhone 14 landscape, 844 × 390)");
    await phoneChecks(page);
  });
});

test.describe("the preview on a Pixel 7 held sideways", () => {
  test.use({ ...pixel7Landscape });
  test("fits, with finger-sized buttons in view and every drawing reachable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "this describe supplies its own device (Pixel 7 landscape)");
    await phoneChecks(page);
  });
});
