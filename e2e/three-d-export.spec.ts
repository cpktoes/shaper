import { readFileSync } from "node:fs";
import { expect, test, type Download, type Locator, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { presetDesignFields } from "../lib/blanks/preset-blanks";
import { readZip, type ZipEntryRead } from "../lib/export/zip";
import { readStl } from "../lib/export/stl";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { inchesToMm } from "../lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "../lib/geometry/volume";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { boardFileStem } from "../lib/models/board-file";
import type { DesignSnapshotFields } from "../lib/models/design-snapshot";
import { OPEN_BOARD_STORAGE_KEY, openBoardCopyJson } from "../lib/models/open-board";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { goToScreen } from "./helpers/screens";

/**
 * Export for CNC… (Phase 16, plan 12; D-14, D-15 as amended by D-23, D-16): one tap on the 3D panel downloads one zip —
 * the DXF, the STL and the text set of the board the screen draws — named from the board, with a status line that says
 * what arrived. Every downloaded file is read back with the writers' own readers (`readZip`, `readStl`), every expected
 * name comes from `boardFileStem`, and every word from `THREE_D_COPY`, so nothing here is typed twice.
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

/** A preset as its card opens it, kept in this browser as an earlier visit would have left it. */
async function keepBoard(page: Page, presetName: string, lengthMm?: number) {
  const preset = BOARD_PRESETS.find((p) => p.name === presetName);
  if (!preset) throw new Error(`no ${presetName} preset`);
  const base = presetDesignFields(preset);
  const fields: DesignSnapshotFields = {
    ...base,
    outline: lengthMm === undefined ? base.outline : { ...base.outline, length: lengthMm as typeof base.outline.length },
    volume: DEFAULT_VOLUME_SPEC,
    finsImportTemplate: true,
    railsImportFoilThickness: true,
    boardName: "",
    finSystem: "fcs2",
  };
  const raw = openBoardCopyJson(fields, { modelId: null, ownerId: null, locked: false, dirty: true });
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [OPEN_BOARD_STORAGE_KEY, raw] as const);
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

/** Taps Export for CNC… and answers the download the browser received. */
async function exportZip(page: Page): Promise<Download> {
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

/** The names a zip of `stem` with `slices` slices must hold, in the writer's order. */
function expectedNames(stem: string, slices: number): string[] {
  const pad = slices > 99 ? 3 : 2;
  return [
    `${stem}.dxf`,
    `${stem}.stl`,
    `${stem}-outline.txt`,
    `${stem}-profile.txt`,
    ...Array.from({ length: slices }, (_, i) => `${stem}-slice-${String(i + 1).padStart(pad, "0")}.txt`),
  ];
}

/**
 * Reads a downloaded zip back whole for the board named `boardName`: its suggested name, every CRC, exactly the D-14
 * names with two-digit slice numbers, and the status line's done line counting the slice files it holds. Answers the
 * entries and the slice count.
 */
async function expectWholeZip(page: Page, download: Download, boardName: string) {
  const stem = boardFileStem(boardName);
  expect(download.suggestedFilename()).toBe(`${stem}-3d.zip`);
  const entries = readZip(await downloadedBytes(download));
  expect(entries.every((entry) => entry.crcOk), "every CRC checks").toBe(true);
  const slices = entries.filter((entry) => entry.name.startsWith(`${stem}-slice-`)).length;
  expect(slices).toBeGreaterThan(0);
  expect(entries.map((entry) => entry.name)).toEqual(expectedNames(stem, slices));
  await expect(exportStatus(page)).toHaveText(THREE_D_COPY.exportDone(`${stem}-3d.zip`, slices));
  // The file's name alone is in ink; the rest of the line is muted.
  await expect(exportStatus(page).locator("span.text-surf-ink")).toHaveText(`${stem}-3d.zip`);
  return { entries, slices, stem };
}

function stlOf(entries: ZipEntryRead[], stem: string) {
  const stl = entries.find((entry) => entry.name === `${stem}.stl`);
  if (!stl) throw new Error("no STL in the zip");
  return readStl(stl.data);
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  await dismissStrips(page);
});

test.describe("Export for CNC… on the 3D screen", () => {
  test("1. one tap downloads the named board's zip: the DXF, the STL and the text set, with the done line", async ({
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
    const host = await waitForBoard(page);

    // Idle: the line is in the page, empty.
    await expect(exportStatus(page)).toHaveCount(1);
    await expect(exportStatus(page)).toHaveText("");
    await expectNote(page);
    // The screen's one accent-filled action, last on the panel. The two-way switch's pressed pill wears the accent as
    // every two-way pill in the app does, but it shows a state and carries `aria-pressed`, so it isn't counted (16-18).
    const action = panel(page).locator("button.bg-surf-accent:not([aria-pressed])");
    await expect(action).toHaveCount(1);
    await expect(action).toHaveText(THREE_D_COPY.exportButton);

    const download = await exportZip(page);
    const { entries, stem } = await expectWholeZip(page, download, FISH_NAME);
    expect(stem).toBe(boardFileStem(FISH_NAME));
    // The STL is the very triangles the screen draws.
    expect(stlOf(entries, stem).count).toBe(Number(await host.getAttribute("data-triangles")));
    await expectNote(page);
  });

  test("2. with no 3D drawing the message shows and Export still downloads the whole zip, the same as with it", async ({
    page,
    context,
  }) => {
    // The board drawn as normal first, in a page of its own.
    const drawn = await context.newPage();
    await dismissStrips(drawn);
    await drawn.goto("/design/3d");
    await waitForBoard(drawn);
    const normal = await downloadedBytes(await exportZip(drawn));
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
    const download = await exportZip(page);
    const { entries } = await expectWholeZip(page, download, "");
    // The same names, the same slice count — the same bytes — as the drawn board's.
    expect(Buffer.from(await downloadedBytes(download)).equals(Buffer.from(normal))).toBe(true);
    expect(entries.map((entry) => entry.name)).toEqual(readZip(normal).map((entry) => entry.name));
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

  test("4. the files never change with the switches: Fins, Blank, Contour Stripes and Wire View leave the zip byte for byte the same", async ({
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
    const first = await exportZip(page);
    const firstBytes = await downloadedBytes(first);

    // Fins off, Blank on, Contour Stripes on: everything the picture can add or take away, flipped.
    await corner(THREE_D_COPY.fins).click();
    await corner(THREE_D_COPY.blank).click();
    await corner(THREE_D_COPY.contourStripes).click();
    await expect(corner(THREE_D_COPY.fins)).toHaveAttribute("aria-pressed", "false");
    await expect(corner(THREE_D_COPY.blank)).toHaveAttribute("aria-pressed", "true");
    await expect(corner(THREE_D_COPY.contourStripes)).toHaveAttribute("aria-pressed", "true");
    const second = await exportZip(page);
    const secondBytes = await downloadedBytes(second);

    expect(secondBytes.byteLength).toBe(firstBytes.byteLength);
    expect(Buffer.from(secondBytes).equals(Buffer.from(firstBytes)), "the zip is the bare board whatever the switches say").toBe(
      true,
    );
    const { entries, stem } = await expectWholeZip(page, second, "");
    expect(stlOf(entries, stem).count).toBe(Number(await host.getAttribute("data-triangles")));

    // Wire View takes over from Contour Stripes (D-42), and the zip is the same again.
    await corner(THREE_D_COPY.wireView).click();
    await expect(corner(THREE_D_COPY.wireView)).toHaveAttribute("aria-pressed", "true");
    await expect(corner(THREE_D_COPY.contourStripes)).toHaveAttribute("aria-pressed", "false");
    const third = await downloadedBytes(await exportZip(page));
    expect(Buffer.from(third).equals(Buffer.from(firstBytes)), "Wire View never reaches the zip").toBe(true);

    // The board flipped, raised and walked round, and the room off: the same again (D-16, D-43).
    await page.locator("[data-three-d-racks]").getByRole("button", { name: THREE_D_COPY.flip, exact: true }).click();
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
    const fourth = await downloadedBytes(await exportZip(page));
    expect(Buffer.from(fourth).equals(Buffer.from(firstBytes)), "flipped, raised and walked round, the zip is the same").toBe(true);
    await corner(THREE_D_COPY.room).click();
    await expect(host).toHaveAttribute("data-bay", "off");
    const fifth = await downloadedBytes(await exportZip(page));
    expect(Buffer.from(fifth).equals(Buffer.from(firstBytes)), "with the room off, the zip is the same").toBe(true);
  });

  test("5. a board with no name downloads Untitled Board-3d.zip", async ({ page }) => {
    await page.goto("/design/3d");
    await waitForBoard(page);
    const download = await exportZip(page);
    expect(download.suggestedFilename()).toBe("Untitled Board-3d.zip");
    await expectWholeZip(page, download, "");
    await expectNote(page);
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
    const download = await exportZip(page);
    await expectWholeZip(page, download, "");
    await expect(exportStatus(page)).not.toHaveClass(/text-surf-warning-ink/);
  });
});
