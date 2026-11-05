import { readFileSync } from "node:fs";
import { expect, test, type Download, type Locator, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { presetDesignFields } from "../lib/blanks/preset-blanks";
import { readZip, type ZipEntryRead } from "../lib/export/zip";
import { readStl } from "../lib/export/stl";
import { BOARD_PRESETS } from "../lib/geometry/presets";
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
    // The screen's one accent-filled button, last on the panel.
    await expect(panel(page).locator("button.bg-surf-accent")).toHaveCount(1);
    await expect(panel(page).locator("button.bg-surf-accent")).toHaveText(THREE_D_COPY.exportButton);

    const download = await exportZip(page);
    const { entries, stem } = await expectWholeZip(page, download, FISH_NAME);
    expect(stem).toBe(boardFileStem(FISH_NAME));
    // The STL is the very triangles the screen draws.
    expect(stlOf(entries, stem).count).toBe(Number(await host.getAttribute("data-triangles")));
    await expectNote(page);
  });
});
