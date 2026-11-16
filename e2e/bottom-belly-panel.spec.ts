import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOTTOM_COPY } from "../components/bottom/bottom-copy";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { inchesToMm, parseImperial } from "../lib/geometry/units";
import { bottomFloorScanSettled, showBottomSection } from "./helpers/bottom";
import { goToScreen } from "./helpers/screens";

/**
 * A belly's Off Stringer (quick 261116-jqz): the Continuous Belly / Rolled Mid on the Shortboard gets the Tri-Plane's
 * slider, a flat panel each side of the stringer with the belly rolling from its edge out to the rail. Every figure is
 * read back off the page (the label line, DATA's column), never typed; only the number of presses is chosen. A figure
 * and its unit are held together by a no-break space, so it is folded to a space before parsing.
 *
 * This spec opens one board and reloads it on purpose, so it does not forget the open board on every load.
 */

const SIXTEENTH = inchesToMm(1 / 16);
const CUT = "Continuous Belly / Rolled Mid";
const SLIDER = BOTTOM_COPY.sliderName("center", BOTTOM_COPY.offStringer);

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

/** Picks the belly from the CENTER card's Cut menu, retried until React owns the menu. */
async function pickBelly(page: Page) {
  await showBottomSection(page, "center");
  const echo = page.locator('[data-bottom-card="center"] [data-bottom-cut-echo]');
  if ((await echo.textContent()) === CUT) return;
  await expect(async () => {
    await page.getByRole("combobox", { name: "Center Cut" }).click();
    await page.getByRole("option", { name: CUT, exact: true }).click({ timeout: 2_000 });
    await expect(echo).toHaveText(CUT, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

const fold = (text: string | null) => (text ?? "").replace(/[  ]/g, " ").trim();

/** The figure on the Off Stringer label line (`Off Stringer — 3"` reads 3", in millimetres). */
async function panelFigure(page: Page): Promise<number> {
  await showBottomSection(page, "center");
  const line = page.locator('[data-bottom-card="center"]').getByText(/^Off Stringer — /);
  const text = fold(await line.textContent());
  const found = /^Off Stringer — (.+)$/.exec(text);
  if (!found) throw new Error(`no figure in "${text}"`);
  const value = parseImperial(found[1]);
  if (value === null) throw new Error(`cannot read "${found[1]}"`);
  return value;
}

/** A picture of the page with the Off Stringer row in view, for the founder to look at. */
async function takePicture(page: Page, testInfo: TestInfo, name: string) {
  await showBottomSection(page, "center");
  await page.getByRole("slider", { name: SLIDER, exact: true }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: testInfo.outputPath(`${name}-${testInfo.project.name}.png`) });
}

test.describe("a belly's Off Stringer: a flat panel each side of the stringer", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "iphone", "one phone is the brief's ask");
    await dismissStrips(page);
  });

  test("the Shortboard's Continuous Belly opens at 0, moves to 3 inches, shows in DATA, and a reload keeps it", async ({ page }, testInfo) => {
    test.setTimeout(420_000);
    await openBottom(page);
    await pickBelly(page);
    await bottomFloorScanSettled(page);

    // 1. It opens at 0: the slider is there, nothing is drawn as a panel, and DATA has no layout marks.
    await expect(page.getByRole("slider", { name: SLIDER, exact: true })).toHaveCount(1);
    expect(await panelFigure(page)).toBe(0);
    await expect(page.locator('[data-bottom-pencil="panel"]')).toHaveCount(0);
    await takePicture(page, testInfo, "belly-panel-0");
    await page.getByRole("tab", { name: "DATA", exact: true }).click();
    await expect(page.locator("[data-bottom-marks]")).toHaveCount(0);
    await page.getByRole("tab", { name: "VIEWER", exact: true }).click();

    // 2. Forty-eight presses of 1/16" take it to 3": the label reads it, the panel line is drawn, DATA's column agrees.
    await showBottomSection(page, "center");
    const slider = page.getByRole("slider", { name: SLIDER, exact: true });
    await slider.focus();
    for (let i = 0; i < 48; i++) await page.keyboard.press("ArrowRight");
    await expect.poll(() => panelFigure(page), { timeout: 20_000 }).toBeCloseTo(inchesToMm(3), 0);
    await expect(page.locator('[data-bottom-pencil="panel"]').first()).toBeAttached();
    expect(await page.locator('[data-bottom-pencil="panel"]').first().getAttribute("d")).toBeTruthy();
    await takePicture(page, testInfo, "belly-panel-3");

    await page.getByRole("tab", { name: "DATA", exact: true }).click();
    const marks = page.locator("[data-bottom-marks]");
    await expect(marks).toBeVisible();
    const columns = await marks.locator("thead th").evaluateAll((ths) => ths.map((th) => th.getAttribute("data-bottom-mark-column") ?? ""));
    const at = columns.indexOf("center:flat");
    expect(at).toBeGreaterThan(0);
    const cells = await marks.locator("tbody tr").evaluateAll((trs, col) => trs.map((tr) => [...tr.querySelectorAll("td")][col - 1]?.textContent ?? ""), at);
    const filled = cells.map(fold).filter((c) => c !== BOTTOM_COPY.emptyCell && c !== "");
    expect(filled.length).toBeGreaterThanOrEqual(3);
    for (const cell of filled) expect(Math.abs(parseImperial(cell)! - inchesToMm(3)), cell).toBeLessThanOrEqual(SIXTEENTH);
    if (testInfo.project.name === "desktop") {
      await marks.scrollIntoViewIfNeeded();
      await marks.locator("tbody tr").first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page.screenshot({ path: testInfo.outputPath("belly-panel-data-desktop.png") });
    }
    await page.getByRole("tab", { name: "VIEWER", exact: true }).click();

    // 3. The figure survives a reload (the kept open board reads the same schema as a save and a board file).
    await expect(async () => {
      await page.reload();
      await expect(page).toHaveURL(/\/design\/bottom$/, { timeout: 5_000 });
      await showBottomSection(page, "center");
      expect(await panelFigure(page)).toBeCloseTo(inchesToMm(3), 0);
    }).toPass({ timeout: 60_000 });
  });
});
