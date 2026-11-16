import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
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
 *
 * This spec opens one board and reloads it on purpose, so it does not forget the open board on every load.
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

/** Picks a name from the TAIL card's Cut menu, retried until React owns the menu so a click before hydration is never lost. */
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

/** A label line inside the TAIL card, by the words it opens with. */
const labelLine = (page: Page, words: string) => page.locator('[data-bottom-card="tail"]').getByText(new RegExp(`^${words} — `));

/** The figure a label line carries: `Trough at Start — 4" from the stringer` reads 4" (in millimetres). */
async function figureOf(line: Locator): Promise<number> {
  const text = fold(await line.textContent());
  const found = /— (.+?) from the (?:stringer|tail)$/.exec(text);
  if (!found) throw new Error(`no figure in "${text}"`);
  const value = inches(found[1]);
  if (value === null) throw new Error(`cannot read "${found[1]}"`);
  return value;
}

/** The trough's drawn line, as the page draws it (the dotted one). */
const troughPath = (page: Page) => page.locator('[data-bottom-pencil="trough"]').first().getAttribute("d");

/** Moves a slider by the keyboard, one 1/16" a press, until its label line reads the figure asked for. */
async function setBySteps(page: Page, sliderName: string, line: Locator, targetMm: number) {
  await showBottomSection(page, "tail");
  const now = await figureOf(line);
  const steps = Math.round((targetMm - now) / SIXTEENTH);
  const slider = page.getByRole("slider", { name: sliderName, exact: true });
  await slider.focus();
  for (let i = 0; i < Math.abs(steps); i++) await page.keyboard.press(steps > 0 ? "ArrowRight" : "ArrowLeft");
  await expect.poll(() => figureOf(line), { timeout: 20_000 }).toBeCloseTo(targetMm, 0);
}

/** A picture of the page with the Trough menu in view, for the founder to look at. */
async function takePicture(page: Page, testInfo: TestInfo, name: string) {
  await showBottomSection(page, "tail");
  await page.getByRole("combobox", { name: "Tail Trough", exact: true }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: testInfo.outputPath(`${name}-${testInfo.project.name}.png`) });
}

test.describe("a double concave's trough: Parallel, Centered, By hand", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "iphone", "one phone is the brief's ask");
    await dismissStrips(page);
  });

  test("the Shortboard's Double Concave Exit through Parallel, Centered and By hand, and a reload keeps By hand", async ({ page }, testInfo) => {
    test.setTimeout(420_000);
    await openBottom(page);
    await pickCut(page, "Double Concave Exit");
    await bottomFloorScanSettled(page);
    const menu = () => page.getByRole("combobox", { name: "Tail Trough", exact: true });
    const toViewer = async () => {
      await page.getByRole("tab", { name: "VIEWER", exact: true }).click();
      await showBottomSection(page, "tail");
    };

    // 1. Parallel (where every double opens): one distance off the stringer all along the cut.
    await showBottomSection(page, "tail");
    await expect(page.getByRole("slider", { name: "Tail Trough At", exact: true })).toHaveCount(1);
    const troughAt = await figureOf(labelLine(page, "Trough At"));
    const parallelPath = await troughPath(page);
    expect(parallelPath).toBeTruthy();
    await takePicture(page, testInfo, "trough-parallel");
    const parallel = (await readTailMarks(page)).filter((r) => r.trough !== null);
    expect(parallel.length).toBeGreaterThanOrEqual(3);
    expect(new Set(parallel.map((r) => r.troughText)).size).toBe(1);
    await toViewer();

    // 2. Centered: Trough At leaves; the trough follows the cut's own width, further out toward Start.
    await pickTrough(page, "Centered");
    await expect(page.getByRole("slider", { name: "Tail Trough At", exact: true })).toHaveCount(0);
    await expect(page.locator("[data-bottom-trough-note]").first()).toHaveText(BOTTOM_COPY.troughRunNotes.centered);
    expect(await troughPath(page)).not.toBe(parallelPath);
    await takePicture(page, testInfo, "trough-centered");
    const centered = (await readTailMarks(page)).filter((r) => r.trough !== null);
    expect(centered.length).toBe(parallel.length);
    expect(new Set(centered.map((r) => r.troughText)).size).toBeGreaterThan(1);
    for (const row of centered) {
      expect(row.flat, `row ${row.station} has a flat`).not.toBeNull();
      expect(row.edge, `row ${row.station} has an edge`).not.toBeNull();
      expect(Math.abs(row.trough! - (row.flat! + row.edge!) / 2), `row ${row.station}`).toBeLessThanOrEqual(SIXTEENTH);
    }
    const byStation = [...centered].sort((a, b) => a.station - b.station);
    expect(byStation[byStation.length - 1].trough!).toBeGreaterThan(byStation[0].trough!);
    await toViewer();

    // 3. By hand: both ends open at Trough At, so nothing jumps; then the two sliders move it.
    await pickTrough(page, "By hand");
    await expect(page.getByRole("slider", { name: "Tail Trough At", exact: true })).toHaveCount(0);
    await expect(page.locator("[data-bottom-trough-note]").first()).toHaveText(BOTTOM_COPY.troughRunNotes.hand);
    const startLine = labelLine(page, "Trough at Start");
    const endLine = labelLine(page, "Trough at End");
    expect(await figureOf(startLine)).toBe(troughAt);
    expect(await figureOf(endLine)).toBe(troughAt);
    expect(await troughPath(page)).toBe(parallelPath);
    const unmoved = (await readTailMarks(page)).filter((r) => r.trough !== null);
    expect(unmoved.map((r) => r.troughText)).toEqual(parallel.map((r) => r.troughText));
    await toViewer();

    // The cut's own Start and End, read off the panel's station rows.
    const station = async (word: string) => {
      const text = fold(await labelLine(page, word).textContent());
      const found = /— (.+?) from the tail$/.exec(text);
      return inches(found![1])!;
    };
    const cutStart = await station("Start");
    const cutEnd = await station("End");
    expect(cutStart).toBeGreaterThan(cutEnd);

    /** Each filled trough cell sits on the straight line between the two figures, within one sixteenth. */
    const expectStraightLine = async (atStart: number, atEnd: number, what: string) => {
      const rows = (await readTailMarks(page)).filter((r) => r.trough !== null);
      expect(rows.length, what).toBeGreaterThanOrEqual(3);
      const line = (s: number) => {
        const clamped = Math.min(cutStart, Math.max(cutEnd, s));
        return atEnd + ((atStart - atEnd) * (clamped - cutEnd)) / (cutStart - cutEnd);
      };
      for (const row of rows) expect(Math.abs(row.trough! - line(row.station)), `${what}: row ${row.station}`).toBeLessThanOrEqual(SIXTEENTH);
      return rows;
    };

    // 4" at the Start, 1 1/2" at the End: the cells fall toward the tail.
    await setBySteps(page, "Tail Trough at Start", startLine, inchesToMm(4));
    await setBySteps(page, "Tail Trough at End", endLine, inchesToMm(1.5));
    expect(await troughPath(page)).not.toBe(parallelPath);
    await takePicture(page, testInfo, "trough-by-hand");
    const falling = await expectStraightLine(inchesToMm(4), inchesToMm(1.5), "4 to 1 1/2");
    const fallingSorted = [...falling].sort((a, b) => a.station - b.station);
    expect(fallingSorted[fallingSorted.length - 1].trough!).toBeGreaterThan(fallingSorted[0].trough!);
    if (testInfo.project.name === "desktop") {
      // the layout marks sit below the depths table: bring the Tail trough column into the picture
      await page.locator("[data-bottom-marks]").scrollIntoViewIfNeeded();
      await page.locator("[data-bottom-marks] tbody tr").first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page.screenshot({ path: testInfo.outputPath("trough-by-hand-data-desktop.png") });
    }
    await toViewer();

    // The other way round: 1 1/2" at the Start, 3 1/2" at the End: the cells rise toward the tail.
    await setBySteps(page, "Tail Trough at Start", startLine, inchesToMm(1.5));
    await setBySteps(page, "Tail Trough at End", endLine, inchesToMm(3.5));
    const rising = await expectStraightLine(inchesToMm(1.5), inchesToMm(3.5), "1 1/2 to 3 1/2");
    const risingSorted = [...rising].sort((a, b) => a.station - b.station);
    expect(risingSorted[0].trough!).toBeGreaterThan(risingSorted[risingSorted.length - 1].trough!);
    await toViewer();

    // 4. The rule and both figures survive a reload (the kept open board reads the same schema as a save).
    await expect(async () => {
      await page.reload();
      await showBottomSection(page, "tail");
      await expect(menu()).toContainText("By hand", { timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
    expect(await figureOf(labelLine(page, "Trough at Start"))).toBeCloseTo(inchesToMm(1.5), 0);
    expect(await figureOf(labelLine(page, "Trough at End"))).toBeCloseTo(inchesToMm(3.5), 0);
  });
});
