import { expect, test, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOTTOM_COPY } from "../components/bottom/bottom-copy";
import { BOTTOM_DEPTH_STEP_IN } from "../lib/geometry/bottom";
import { formatBottomDepth } from "../lib/geometry/measure-display";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { inchesToMm, mm, parseImperial } from "../lib/geometry/units";
import { showBottomSection } from "./helpers/bottom";
import { goToScreen } from "./helpers/screens";
import { openAppSettings } from "./helpers/settings";

/**
 * BOTTOM's Depth steps in 1/64" (0.1 mm in Metric) and reads to it (quick 261116-tqs, D-09, the founder, 2026-11-16:
 * "1/64" (or .1mm) for depth"). On the Shortboard's Deep Single Concave the Depth slider takes one arrow press and the label
 * reads the next 1/64" (a tenth of a millimetre in Metric); a reload keeps the figure, which sits between 1/16"s. Every
 * expected reading is the app's own `formatBottomDepth`; the only figure chosen is the step the slider is meant to take.
 *
 * This spec opens one board and reloads it on purpose, so it does not forget the open board on every load.
 */

const CUT = "Deep Single Concave";
const DEPTH_SLIDER = BOTTOM_COPY.sliderName("center", BOTTOM_COPY.depth);

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

/** Picks the Deep Single Concave from the CENTER card's Cut menu, retried until React owns the menu. */
async function pickCut(page: Page) {
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

/** The Depth row's label line, e.g. `Depth — 1/4"`, as text. */
async function depthLine(page: Page): Promise<string> {
  await showBottomSection(page, "center");
  const line = page.locator('[data-bottom-card="center"]').getByText(/^Depth — /).first();
  return fold(await line.textContent());
}

/** The figure after the dash, in millimetres: Imperial through the app's own parser, Metric `3.2 mm` read as a number. */
async function depthMm(page: Page, system: "imperial" | "metric"): Promise<number> {
  const text = await depthLine(page);
  const figure = /^Depth — (.+)$/.exec(text)?.[1];
  if (!figure) throw new Error(`no figure in "${text}"`);
  if (system === "metric") {
    const found = /^(\d+(?:\.\d)?) mm$/.exec(figure);
    if (!found) throw new Error(`not a tenth of a millimetre: "${figure}"`);
    return Number(found[1]);
  }
  const value = parseImperial(figure);
  if (value === null) throw new Error(`cannot read "${figure}"`);
  return value;
}

test.describe("BOTTOM's Depth steps and reads in 1/64\" (0.1 mm in Metric)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "iphone", "one phone is the brief's ask");
    await dismissStrips(page);
  });

  test("the Deep Single Concave's Depth takes one press for 1/64\", reads it as a reduced fraction, and a reload keeps it; in Metric one press is 0.1 mm", async ({ page }) => {
    test.setTimeout(420_000);
    await openBottom(page);
    await pickCut(page);

    // Imperial: the label is the app's own reading of the depth, and one press moves it exactly 1/64".
    const before = await depthMm(page, "imperial");
    expect(await depthLine(page)).toBe(`Depth — ${fold(formatBottomDepth(mm(before), "imperial"))}`);
    const slider = page.getByRole("slider", { name: DEPTH_SLIDER, exact: true });
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    const after = before + inchesToMm(BOTTOM_DEPTH_STEP_IN);
    await expect.poll(() => depthMm(page, "imperial"), { timeout: 20_000 }).toBeCloseTo(after, 3);
    expect(await depthLine(page)).toBe(`Depth — ${fold(formatBottomDepth(mm(after), "imperial"))}`);
    // It sits between two 1/16"s now, which the old reader could not say.
    expect(await depthLine(page)).toMatch(/\d+\/64"$/);

    // A reload keeps the figure, between steps and all.
    await expect(async () => {
      await page.reload();
      await expect(page).toHaveURL(/\/design\/bottom$/, { timeout: 5_000 });
      expect(await depthMm(page, "imperial")).toBeCloseTo(after, 3);
    }).toPass({ timeout: 60_000 });

    // Metric: the same depth reads to a tenth of a millimetre, and one press moves it by one tenth.
    const dialog = await openAppSettings(page);
    const button = dialog.getByRole("group", { name: "Units" }).getByRole("button", { name: /^Metric/ });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();
    const tenth = await depthMm(page, "metric");
    expect(await depthLine(page)).toBe(`Depth — ${fold(formatBottomDepth(mm(after), "metric"))}`);
    await page.getByRole("slider", { name: DEPTH_SLIDER, exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => depthMm(page, "metric"), { timeout: 20_000 }).toBeGreaterThan(tenth + 0.04);
    const moved = await depthMm(page, "metric");
    expect(moved - tenth).toBeLessThan(0.21);
    expect(await depthLine(page)).toMatch(/^Depth — \d+\.\d mm$/);
  });
});
