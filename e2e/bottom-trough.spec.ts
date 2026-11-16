import { expect, test, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOTTOM_COPY } from "../components/bottom/bottom-copy";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { inchesToMm, parseImperial } from "../lib/geometry/units";
import { bottomFloorScanSettled, showBottomSection } from "./helpers/bottom";
import { goToScreen } from "./helpers/screens";

/**
 * A double concave's trough runs three ways (quick 261115-mc1): Parallel, Centered, By hand. Read off the page, never
 * typed: DATA's Tail trough column is the board's own answer, and every figure is parsed back from the words the screen
 * wrote. A figure and its unit are held together by a no-break space, so it is folded to a space before parsing.
 */

/** One sixteenth of an inch, in millimetres: DATA writes a mark to the nearest one, so that is how close a check is. */
const SIXTEENTH = inchesToMm(1 / 16);

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Opens the Shortboard from the home page and walks to BOTTOM by the top row, so the board stays the one opened. */
async function openBottom(page: Page) {
  const preset = BOARD_PRESETS.find((p) => p.id === "shortboard")!;
  await page.goto("/");
  const card = page
    .getByRole("button")
    .filter({ hasText: preset.name })
    .filter({ hasText: /Start Shaping|\d\.\d L/ })
    .first();
  await expect(async () => {
    if (!/\/design\/outline$/.test(page.url()) && (await card.count()) > 0) {
      await card.scrollIntoViewIfNeeded({ timeout: 2_000 });
      await card.click({ timeout: 2_000 });
    }
    await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 5_000 });
  }).toPass({ timeout: 90_000 });
  await goToScreen(page, "BOTTOM");
}

/** Picks a name from a section's Cut menu, retried until React owns the menu so a click before hydration is never lost. */
async function pickCut(page: Page, name: string) {
  await showBottomSection(page, "tail");
  const echo = page.locator('[data-bottom-card="tail"] [data-bottom-cut-echo]');
  if ((await echo.textContent()) === name) return;
  await expect(async () => {
    await page.getByRole("combobox", { name: "Tail Cut" }).click();
    await page.getByRole("option", { name, exact: true }).click({ timeout: 2_000 });
    await expect(echo).toHaveText(name, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/** Picks a rule from the TAIL card's Trough menu, retried the same way. */
async function pickTrough(page: Page, option: string) {
  await showBottomSection(page, "tail");
  const menu = page.getByRole("combobox", { name: "Tail Trough", exact: true });
  await expect(async () => {
    if (!(await page.getByRole("option", { name: option, exact: true }).isVisible())) await menu.click({ timeout: 2_000 });
    await page.getByRole("option", { name: option, exact: true }).click({ timeout: 2_000 });
    await expect(menu).toContainText(option, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

const fold = (text: string | null) => (text ?? "").replace(/[  ]/g, " ").trim();
const inches = (text: string) => parseImperial(fold(text));

/** DATA's layout marks as numbers: each row's station and its flat, trough and edge cells (null where not ruled). */
async function readTailMarks(page: Page) {
  await page.getByRole("tab", { name: "DATA", exact: true }).click();
  const marks = page.locator("[data-bottom-marks]");
  await expect(marks).toBeVisible();
  const columns = await marks.locator("thead th").evaluateAll((ths) => ths.map((th) => th.getAttribute("data-bottom-mark-column") ?? ""));
  const at = (key: string) => columns.indexOf(key);
  const rows = await marks.locator("tbody tr").evaluateAll((trs) =>
    trs.map((tr) => ({ station: tr.querySelector("th")?.textContent ?? "", cells: [...tr.querySelectorAll("td")].map((td) => td.textContent ?? "") })),
  );
  const cell = (cells: string[], key: string) => {
    const text = fold(cells[at(key) - 1]);
    return text === BOTTOM_COPY.emptyCell ? null : inches(text);
  };
  return rows.map((row) => ({
    station: fold(row.station) === "Tail" ? 0 : (inches(row.station) ?? Number.NaN),
    flat: cell(row.cells, "tail:flat"),
    trough: cell(row.cells, "tail:trough"),
    edge: cell(row.cells, "tail:edge"),
    troughText: fold(row.cells[at("tail:trough") - 1]),
  }));
}

test.describe("a double concave's trough: Parallel, Centered, By hand", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the tracer runs on a computer");
    await dismissStrips(page);
  });

  test("Centered: the Shortboard's Double Concave Exit puts the trough halfway between the flat and the edge, further out toward Start", async ({ page }) => {
    test.setTimeout(240_000);
    await openBottom(page);
    await pickCut(page, "Double Concave Exit");
    await bottomFloorScanSettled(page);

    // Parallel (where every double opens): one distance off the stringer all along the cut.
    const trough = page.getByRole("slider", { name: "Tail Trough At", exact: true });
    await expect(trough).toHaveCount(1);
    const parallel = (await readTailMarks(page)).filter((r) => r.trough !== null);
    expect(parallel.length).toBeGreaterThanOrEqual(3);
    expect(new Set(parallel.map((r) => r.troughText)).size).toBe(1);

    // Centered: Trough At has nothing to do, so it leaves; the trough follows the cut's own width.
    await page.getByRole("tab", { name: "VIEWER", exact: true }).click();
    await pickTrough(page, "Centered");
    await expect(page.getByRole("slider", { name: "Tail Trough At", exact: true })).toHaveCount(0);
    await expect(page.locator("[data-bottom-trough-note]").first()).toHaveText(BOTTOM_COPY.troughRunNotes.centered);
    const centered = (await readTailMarks(page)).filter((r) => r.trough !== null);
    expect(centered.length).toBe(parallel.length);
    expect(new Set(centered.map((r) => r.troughText)).size).toBeGreaterThan(1);
    for (const row of centered) {
      expect(row.flat, `row ${row.station} has a flat`).not.toBeNull();
      expect(row.edge, `row ${row.station} has an edge`).not.toBeNull();
      const middle = (row.flat! + row.edge!) / 2;
      expect(Math.abs(row.trough! - middle), `row ${row.station}`).toBeLessThanOrEqual(SIXTEENTH);
    }
    // Further forward (a longer way from the tail) the trough stands further off the stringer.
    const sorted = [...centered].sort((a, b) => a.station - b.station);
    expect(sorted[sorted.length - 1].trough!).toBeGreaterThan(sorted[0].trough!);
  });
});
