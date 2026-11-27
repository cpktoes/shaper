import { expect, test, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { BOTTOM_COPY } from "../components/bottom/bottom-copy";
import { BOTTOM_DEPTH_STEP_IN, BOTTOM_DEPTH_STEP_MM, BOTTOM_MARK_RANGES_IN, type BottomSectionKey } from "../lib/geometry/bottom";
import { formatBottomDepth } from "../lib/geometry/measure-display";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { inchesToMm, mm, parseImperial } from "../lib/geometry/units";
import { showBottomSection } from "./helpers/bottom";
import { goToScreen } from "./helpers/screens";
import { openAppSettings } from "./helpers/settings";

/**
 * A nose concave's Rail Roll on BOTTOM (the founder, 2026-11-25, quick 261125-mf8, D-01, D-08): on the Shortboard with a
 * Blended Nose Concave picked, the Nose Rail Roll slider sits right after Nose Off Rail at 0; one arrow press is one 1/64"
 * and the line reads it as a reduced fraction; End takes it to the slider's top and the cross-section's drawing changes; a
 * reload keeps it; in Metric it reads to a tenth of a millimetre and one press back moves it one tenth. A Reverse Vee Nose
 * shows no Rail Roll, and neither does a centre Deep Single Concave. Every expected reading is the app's own
 * `formatBottomDepth`; the only figure chosen is the step.
 *
 * This spec opens one board and reloads it on purpose, so it does not forget the open board on every load.
 */

const NOSE_CUT = "Blended Nose Concave";
const ROLL_SLIDER = BOTTOM_COPY.sliderName("nose", BOTTOM_COPY.railRoll);
const OFF_RAIL_SLIDER = BOTTOM_COPY.sliderName("nose", BOTTOM_COPY.offRail);

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

const SECTION_WORD: Record<BottomSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };
const card = (page: Page, section: BottomSectionKey) => page.locator(`[data-bottom-card="${section}"]`);

/** Picks a name from a section's Cut menu, retried until React owns the menu. */
async function pick(page: Page, section: BottomSectionKey, name: string) {
  await showBottomSection(page, section);
  const echo = card(page, section).locator("[data-bottom-cut-echo]");
  if ((await echo.textContent()) === name) return;
  await expect(async () => {
    await page.getByRole("combobox", { name: `${SECTION_WORD[section]} Cut` }).click();
    await page.getByRole("option", { name, exact: true }).click({ timeout: 2_000 });
    await expect(echo).toHaveText(name, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

async function sliderNames(page: Page, section: BottomSectionKey): Promise<string[]> {
  return card(page, section)
    .getByRole("slider")
    .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? ""));
}

const sectionPaths = (page: Page) =>
  page.locator("[data-bottom-section] path").evaluateAll((els) => els.map((el) => el.getAttribute("d") ?? "").join("|"));

const fold = (text: string | null) => (text ?? "").replace(/[  ]/g, " ").trim();

/** The Rail Roll row's label line, e.g. `Rail Roll — 1/64"`, as text. */
async function rollLine(page: Page): Promise<string> {
  await showBottomSection(page, "nose");
  const line = card(page, "nose").getByText(/^Rail Roll — /).first();
  return fold(await line.textContent());
}

/** The figure after the dash, in millimetres: Imperial through the app's own parser, Metric `3.2 mm` read as a number. */
async function rollMm(page: Page, system: "imperial" | "metric"): Promise<number> {
  const text = await rollLine(page);
  const figure = /^Rail Roll — (.+)$/.exec(text)?.[1];
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

test.describe("BOTTOM's Rail Roll on a nose concave", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "iphone", "one phone is the brief's ask");
    await dismissStrips(page);
  });

  test("the Blended Nose Concave's Rail Roll sits after Off Rail, steps 1/64\", lifts the section, survives a reload and reads in tenths of a millimetre in Metric", async ({ page }) => {
    test.setTimeout(420_000);
    await openBottom(page);

    // Only the three nose concaves carry it: not a Reverse Vee Nose, not a centre Deep Single Concave.
    await pick(page, "nose", "Reverse Vee Nose");
    await expect.poll(() => sliderNames(page, "nose")).not.toContain(ROLL_SLIDER);
    await pick(page, "center", "Deep Single Concave");
    await expect.poll(() => sliderNames(page, "center")).not.toContain(BOTTOM_COPY.sliderName("center", BOTTOM_COPY.railRoll));
    await expect(card(page, "center").getByText(/^Rail Roll — /)).toHaveCount(0);
    await pick(page, "center", "Flat Center");

    await pick(page, "nose", NOSE_CUT);
    await expect.poll(() => sliderNames(page, "nose")).toContain(ROLL_SLIDER);
    const names = await sliderNames(page, "nose");
    expect(names.indexOf(ROLL_SLIDER)).toBe(names.indexOf(OFF_RAIL_SLIDER) + 1);

    // It opens at 0, read as the app reads a depth of nothing.
    expect(await rollLine(page)).toBe(`${BOTTOM_COPY.railRoll} — ${fold(formatBottomDepth(mm(0), "imperial"))}`);

    // One press is one 1/64", read as a reduced fraction.
    const slider = page.getByRole("slider", { name: ROLL_SLIDER, exact: true });
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    const step = inchesToMm(BOTTOM_DEPTH_STEP_IN);
    await expect.poll(() => rollMm(page, "imperial"), { timeout: 20_000 }).toBeCloseTo(step, 3);
    expect(await rollLine(page)).toBe(`${BOTTOM_COPY.railRoll} — ${fold(formatBottomDepth(mm(step), "imperial"))}`);
    expect(await rollLine(page)).toMatch(/\d+\/\d+"$/);

    // End takes it to the slider's top, and the cross-section's bottom curves up to the rail.
    const before = await sectionPaths(page);
    await page.keyboard.press("End");
    const top = inchesToMm(BOTTOM_MARK_RANGES_IN.railRoll.max);
    await expect.poll(() => rollMm(page, "imperial"), { timeout: 20_000 }).toBeCloseTo(top, 3);
    expect(await rollLine(page)).toBe(`${BOTTOM_COPY.railRoll} — ${fold(formatBottomDepth(mm(top), "imperial"))}`);
    await expect.poll(() => sectionPaths(page), { timeout: 20_000 }).not.toBe(before);

    // A reload keeps the figure.
    await expect(async () => {
      await page.reload();
      await expect(page).toHaveURL(/\/design\/bottom$/, { timeout: 5_000 });
      expect(await rollMm(page, "imperial")).toBeCloseTo(top, 3);
    }).toPass({ timeout: 60_000 });

    // Metric: the same roll reads to a tenth of a millimetre, and one press back toward the middle moves it one tenth.
    const dialog = await openAppSettings(page);
    const button = dialog.getByRole("group", { name: "Units" }).getByRole("button", { name: /^Metric/ });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();
    expect(await rollLine(page)).toBe(`${BOTTOM_COPY.railRoll} — ${fold(formatBottomDepth(mm(top), "metric"))}`);
    const tenth = await rollMm(page, "metric");
    await page.getByRole("slider", { name: ROLL_SLIDER, exact: true }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => rollMm(page, "metric"), { timeout: 20_000 }).toBeCloseTo(tenth - BOTTOM_DEPTH_STEP_MM, 3);
    expect(await rollLine(page)).toMatch(/^Rail Roll — \d+\.\d mm$/);
  });

  test("at Depth 0 the Rail Roll greys out still showing the roll, survives a reload, and comes back live as it was (quick 261126-czw, D-01)", async ({ page }) => {
    test.setTimeout(420_000);
    await openBottom(page);
    await pick(page, "nose", NOSE_CUT);
    await expect.poll(() => sliderNames(page, "nose")).toContain(ROLL_SLIDER);

    // Rail Roll to 1/8": eight presses of 1/64".
    const roll = page.getByRole("slider", { name: ROLL_SLIDER, exact: true });
    await roll.focus();
    const presses = Math.round(1 / 8 / BOTTOM_DEPTH_STEP_IN);
    for (let k = 0; k < presses; k++) await page.keyboard.press("ArrowRight");
    const set = inchesToMm(presses * BOTTOM_DEPTH_STEP_IN);
    await expect.poll(() => rollMm(page, "imperial"), { timeout: 20_000 }).toBeCloseTo(set, 3);
    const line = await rollLine(page);
    expect(line).toBe(`${BOTTOM_COPY.railRoll} — ${fold(formatBottomDepth(mm(set), "imperial"))}`);
    await expect(roll).toBeEnabled();

    // Depth to 0: the row greys and its slider stills, still reading the roll the shaper set.
    const depth = page.getByRole("slider", { name: BOTTOM_COPY.sliderName("nose", BOTTOM_COPY.depth), exact: true });
    await depth.focus();
    await page.keyboard.press("Home");
    await expect(roll).toBeDisabled({ timeout: 20_000 });
    expect(await rollLine(page)).toBe(line);
    // And a line under it says why (the founder, 2026-11-27).
    const hint = card(page, "nose").locator("[data-bottom-roll-hint]");
    await expect(hint).toHaveText(BOTTOM_COPY.railRollNeedsDepth);

    // A reload at Depth 0 keeps the roll and the greyed row.
    await expect(async () => {
      await page.reload();
      await expect(page).toHaveURL(/\/design\/bottom$/, { timeout: 5_000 });
      expect(await rollLine(page)).toBe(line);
      await expect(page.getByRole("slider", { name: ROLL_SLIDER, exact: true })).toBeDisabled({ timeout: 2_000 });
    }).toPass({ timeout: 60_000 });

    // Depth above 0 again: the row is live with the same roll, untouched.
    await page.getByRole("slider", { name: BOTTOM_COPY.sliderName("nose", BOTTOM_COPY.depth), exact: true }).focus();
    await page.keyboard.press("End");
    await expect(page.getByRole("slider", { name: ROLL_SLIDER, exact: true })).toBeEnabled({ timeout: 20_000 });
    expect(await rollLine(page)).toBe(line);
    await expect(card(page, "nose").locator("[data-bottom-roll-hint]")).toHaveCount(0);
  });
});
