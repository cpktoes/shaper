import { expect, test, type Locator, type Page } from "@playwright/test";
import { formatMark } from "../lib/geometry/measure-display";
import { inchesToMm } from "../lib/geometry/units";

/**
 * Quick 261018-dw6 — the FINS Off-Rail fine tuner (the founder, 2026-10-18).
 *
 * In Advanced, an Off-Rail slider under Aft/Forward position moves the front (or twin, or side) pair
 * in toward the stringer or out toward the rail; on a quad whose rear fins are placed from the
 * stringer, a second Off-Rail slider in Rear Fins moves both rears together. The label always reads
 * where the fins end up. Neither Aft/Forward position label carries a bracketed note any more.
 *
 * Every helper is copied locally, as every spec in this suite does. Expected strings are built with
 * the app's own formatMark where a figure comes from a calculation.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Opens FINS' ADVANCED fold (a plain disclosure button), once React owns it. */
async function openAdvanced(page: Page) {
  const button = page.getByRole("button", { name: /^Advanced/ });
  await expect(button).toBeVisible();
  await expect
    .poll(() => button.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactFiber"))))
    .toBe(true);
  await button.click();
  await expect(page.getByRole("button", { name: /Reset Advanced Settings/ })).toBeVisible();
}

async function pickFinSetup(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}

async function topY(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("no bounding box");
  return box.y;
}

/** The Off-Rail label lines in the controls, nose to tail: the forward tuner first, then (on a quad)
 * the rear Off-Rail row. */
function offRailLabels(page: Page): Locator {
  return page.getByText(/^Off-Rail — /);
}

/** The DATA tab's row with this exact name: its bold value, as a shaper reads it. */
function dataValue(page: Page, rowName: string): Locator {
  return page
    .locator("div.justify-between")
    .filter({ has: page.getByText(rowName, { exact: true }) })
    .locator("span.font-bold");
}

async function openDataTab(page: Page) {
  await page.getByRole("tab", { name: "DATA", exact: true }).click();
  await expect(page.getByText("Trailing Edge").first()).toBeVisible();
}

function forwardSlider(page: Page): Locator {
  return page.getByRole("slider", { name: "Forward fins off-rail" }).filter({ visible: true });
}

const IMPERIAL_BASE = '1 3/16"';

test.describe("FINS Off-Rail tuner on a computer — the front pair", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only structure and wording proof");
    await dismissSignInBanner(page);
  });

  test("sits under Aft/Forward position, reads the template, moves in 1/16\" steps and shows on DATA", async ({
    page,
  }) => {
    await page.goto("/design/fins");
    await openAdvanced(page);

    const label = offRailLabels(page);
    await expect(label).toHaveCount(1);
    await expect(label).toHaveText(`Off-Rail — ${IMPERIAL_BASE}`);
    const aft = page.getByText(/^Aft\/Forward position — /).first();
    expect(await topY(label)).toBeGreaterThan(await topY(aft));
    // Directly under it: nearer than the Toe-In row that follows.
    expect(await topY(label)).toBeLessThan(await topY(page.getByText(/^Toe-In — /).first()));

    // Neither Aft/Forward label carries a bracketed note any more.
    const aftTexts = await page.getByText(/^Aft\/Forward position — /).allTextContents();
    expect(aftTexts.length).toBeGreaterThan(0);
    for (const text of aftTexts) expect(text).not.toContain("(");

    // Nothing about the board has moved yet: no Modified flag on DATA.
    await openDataTab(page);
    await expect(dataValue(page, "Off-Rail")).toHaveText(IMPERIAL_BASE);
    await expect(page.getByText("· Modified")).toHaveCount(0);
    await page.getByRole("tab", { name: "VIEWER", exact: true }).click();

    const slider = forwardSlider(page);
    await slider.focus();
    await slider.press("ArrowRight");
    await slider.press("ArrowRight");
    await expect(label).toHaveText('Off-Rail — 1 5/16"');
    await openDataTab(page);
    await expect(dataValue(page, "Off-Rail")).toHaveText('1 5/16"');
    await expect(page.getByText("· Modified")).toBeVisible();
    await page.getByRole("tab", { name: "VIEWER", exact: true }).click();

    await slider.press("End");
    await expect(label).toHaveText('Off-Rail — 2"');
    await slider.press("Home");
    await expect(label).toHaveText('Off-Rail — 7/8"');

    // Reset Advanced Settings: back on the template, and the Modified flag goes.
    await page.getByRole("button", { name: /Reset Advanced Settings/ }).click();
    await expect(label).toHaveText(`Off-Rail — ${IMPERIAL_BASE}`);
    await openDataTab(page);
    await expect(page.getByText("· Modified")).toHaveCount(0);
  });

  test("the nudge survives a change of thruster model but not a change of fin setup", async ({ page }) => {
    await page.goto("/design/fins");
    await openAdvanced(page);
    const label = offRailLabels(page);
    const slider = forwardSlider(page);

    await slider.focus();
    await slider.press("ArrowRight");
    await slider.press("ArrowRight");
    await expect(label).toHaveText('Off-Rail — 1 5/16"');

    // Proportional's own off-rail is 1 1/8"; the kept 1/8" makes 1 1/4".
    await page.getByRole("button", { name: "Proportional", exact: true }).click();
    await expect(label).toHaveText('Off-Rail — 1 1/4"');

    // A new fin setup puts the fins back on the template: the quad's own front is 1 3/16".
    await pickFinSetup(page, "Quad");
    await expect(label.first()).toHaveText(`Off-Rail — ${IMPERIAL_BASE}`);
  });

  test("a Twin reads its own heading and its own 1 1/4\" template, and nudges the same way", async ({ page }) => {
    await page.goto("/design/fins");
    await pickFinSetup(page, "Twin");
    await openAdvanced(page);
    await expect(page.getByText("Forward Fins — Main Twins")).toBeVisible();
    const label = offRailLabels(page);
    await expect(label).toHaveText('Off-Rail — 1 1/4"');
    const slider = forwardSlider(page);
    await slider.focus();
    await slider.press("ArrowRight");
    await expect(label).toHaveText('Off-Rail — 1 5/16"');
  });

  test("a single fin has no forward pair and no Off-Rail row", async ({ page }) => {
    await page.goto("/design/fins");
    await pickFinSetup(page, "Single Fin");
    await openAdvanced(page);
    await expect(offRailLabels(page)).toHaveCount(0);
  });
});

/** The slider's thumb centre and its track, so a test can say where along the track the dot rests. */
async function thumbFraction(label: Locator): Promise<number> {
  const row = label.locator("xpath=..");
  const track = await row.locator('[data-slot="slider-track"]').boundingBox();
  const thumb = await row.locator('[data-slot="slider-thumb"]').boundingBox();
  if (!track || !thumb) throw new Error("slider track or thumb has no bounding box");
  return (thumb.x + thumb.width / 2 - track.x) / track.width;
}

function rearSlider(page: Page): Locator {
  return page.getByRole("slider", { name: "Rear fins off-rail" }).filter({ visible: true });
}

test.describe("FINS Off-Rail tuner on a computer — a quad's rear pair", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only structure and wording proof");
    await dismissSignInBanner(page);
  });

  test("moves both rears together, the spread on DATA follows, and Reset puts them back", async ({ page }) => {
    await page.goto("/design/fins");
    await pickFinSetup(page, "Quad");
    await openAdvanced(page);

    const rearLabel = offRailLabels(page).nth(1);
    await expect(offRailLabels(page)).toHaveCount(2);
    await expect(rearLabel).toHaveText('Off-Rail — 2 3/16"');
    // 1/2" either way, so the dot rests in the middle of its track.
    expect(Math.abs((await thumbFraction(rearLabel)) - 0.5)).toBeLessThan(0.03);

    await openDataTab(page);
    const halfSpread = dataValue(page, "Off-Stringer (1/2 Spread)");
    const full = page
      .locator("div.justify-between")
      .filter({ hasText: /^Full Spread/ })
      .locator("span.font-bold");
    const startHalf = await halfSpread.textContent();
    const startFull = await full.textContent();
    await expect(page.getByText("· Modified")).toHaveCount(0);

    const slider = rearSlider(page);
    await slider.focus();
    await slider.press("ArrowLeft");
    await expect(rearLabel).toHaveText('Off-Rail — 2 1/8"');
    await slider.press("Home");
    await expect(rearLabel).toHaveText('Off-Rail — 1 11/16"');
    // Closer to the rail: the two rears are further apart.
    const outHalf = await halfSpread.textContent();
    const outFull = await full.textContent();
    expect(outHalf).not.toBe(startHalf);
    expect(outFull).not.toBe(startFull);
    await expect(page.getByText("· Modified")).toBeVisible();

    await slider.press("End");
    await expect(rearLabel).toHaveText('Off-Rail — 2 11/16"');
    const inHalf = await halfSpread.textContent();
    expect(inHalf).not.toBe(startHalf);
    expect(inHalf).not.toBe(outHalf);

    await page.getByRole("button", { name: /Reset Advanced Settings/ }).click();
    await expect(rearLabel).toHaveText('Off-Rail — 2 3/16"');
    await expect(halfSpread).toHaveText(startHalf ?? "");
    await expect(full).toHaveText(startFull ?? "");
    await expect(page.getByText("· Modified")).toHaveCount(0);
  });

  test("Basic - Off-Rail keeps its one existing slider and gets no second control", async ({ page }) => {
    await page.goto("/design/fins");
    await pickFinSetup(page, "Quad");
    await openAdvanced(page);
    await expect(rearSlider(page)).toHaveCount(1);

    await page.getByRole("button", { name: "Basic - Off-Rail", exact: true }).click();
    await expect(rearSlider(page)).toHaveCount(0);
    const rearBlock = page.getByText(/^Rear Fins — /).locator("xpath=..");
    await expect(rearBlock.getByText(/^Off-Rail — /)).toHaveCount(1);
  });
});

// Kept so the expected strings above and below are built from the app's own formatter where a figure
// comes from a calculation rather than from the founder's list.
test("the app's own formatter agrees with the strings this spec types", () => {
  expect(formatMark(inchesToMm(1.1875), "imperial")).toBe(IMPERIAL_BASE);
  expect(formatMark(inchesToMm(1.1875), "metric")).toBe("30 mm");
});
