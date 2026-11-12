import { readFileSync } from "node:fs";
import { expect, test, type Download, type Locator, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { presetDesignFields } from "../lib/blanks/preset-blanks";
import { readBrdText } from "../lib/export/brd";
import { BRD_MAGIC, unscrambleBrd } from "../lib/export/brd-scramble";
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

/** Taps Export .brd File and answers the download the browser received. */
async function exportFile(page: Page): Promise<Download> {
  await expect(exportButton(page)).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent("download"), exportButton(page).click()]);
  return download;
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

    const download = await exportFile(page);
    const { read, stem } = await expectWholeBrd(page, download, FISH_NAME);
    expect(stem).toBe(boardFileStem(FISH_NAME));
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
    await exportButton(page).click();
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
    const download = await exportFile(page);
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
  });
});
