import { expect, test, type Locator, type Page } from "@playwright/test";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";

/**
 * Quick 261113-si7: a board can be 4'0" to 12'0" long, and up to 31" wide from 8'0" on (the founder,
 * 2026-11-13). Proved here on TEMPLATE, on a computer and an upright iPhone, by pressing the real
 * Length, Width and Offset sliders to their new ends and reading what the screen says:
 *
 * - Length reaches 4'0" and 12'0" (Imperial) and 365.0 cm at its top (Metric, where the 10 mm track
 *   rounds inward, as it always has);
 * - Width tops out at 31" on a board of 8'0" or longer — 8'0" itself included — and at 25" under it;
 * - a wide board shortened under 8'0" reads 25" with the thumb at its end, and gets 31" back when
 *   lengthened again, because nothing was rewritten;
 * - on a 4'0" the Offset slider's two ends are +8" and -8", where the wide point can really go.
 *
 * Every key press is retried until React owns the slider (a press on the server-rendered markup
 * reaches nothing), the same idiom as rocker-cut.spec.ts.
 */

/** A row's slider, found by the start of its label line (the label line is its sibling's parent). */
function sliderUnder(page: Page, label: RegExp): Locator {
  return page.getByText(label).locator("xpath=..").getByRole("slider");
}

async function sliderEnds(slider: Locator): Promise<{ value: number; min: number; max: number }> {
  return slider.evaluate((el) => {
    const input = el as HTMLInputElement;
    return { value: Number(input.value), min: Number(input.min), max: Number(input.max) };
  });
}

/** Presses a key on a slider until the line above it reads `expected` (so a press that landed before
 * React owned the slider is simply tried again). */
async function pressUntil(slider: Locator, key: string, line: Locator, expected: string | RegExp) {
  await expect(async () => {
    await slider.press(key);
    await expect(line).toHaveText(expected, { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}

/** One of TEMPLATE's two Board Length boxes picked to a value, from its open list. */
async function pickLengthBox(page: Page, which: 0 | 1, option: string) {
  const box = page.locator('[data-slot="select-trigger"]').nth(which);
  await box.click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test.describe("TEMPLATE reaches the new board sizes", () => {
  test.beforeEach(async ({ page }) => {
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("Imperial: Length 4'0\" to 12'0\"; Width 31\" from 8'0\" (included) and 25\" under it, held and handed back", async ({ page }) => {
    await page.goto("/design/outline");
    const lengthLine = page.getByText(/^Board Length — /);
    const widthLine = page.getByText(/^Width — /);
    const length = sliderUnder(page, /^Board Length — /);
    const width = sliderUnder(page, /^Width — /);

    // The two feet lists run 4' to 12'.
    await expect(lengthLine).toBeVisible();
    await pressUntil(length, "End", lengthLine, `Board Length — 12'0"`);
    await page.locator('[data-slot="select-trigger"]').nth(0).click();
    for (const feet of ["4'", "5'", "6'", "7'", "8'", "9'", "10'", "11'", "12'"]) {
      await expect(page.getByRole("option", { name: feet, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("option", { name: "3'", exact: true })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "13'", exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");

    // 12'0": the Width slider reaches 31".
    await pressUntil(width, "End", widthLine, `Width — 31"`);
    await expect.poll(() => sliderEnds(width)).toMatchObject({ max: 31, min: 16 });

    // 8'0" is a wide board too (the founder's ruling): the end is still 31".
    await pickLengthBox(page, 0, "8'");
    await expect(lengthLine).toHaveText(`Board Length — 8'0"`);
    await expect(widthLine).toHaveText(`Width — 31"`);
    expect((await sliderEnds(width)).max).toBe(31);

    // Under 8'0" the board reads 25", the thumb at its end; nothing stored was rewritten.
    await pickLengthBox(page, 0, "7'");
    await pickLengthBox(page, 1, '11"');
    await expect(lengthLine).toHaveText(`Board Length — 7'11"`);
    await expect(widthLine).toHaveText(`Width — 25"`);
    const held = await sliderEnds(width);
    expect(held.max).toBe(25);
    expect(held.value).toBe(held.max);

    // Back to 8'0": 31" again.
    await pickLengthBox(page, 1, '0"');
    await pickLengthBox(page, 0, "8'");
    await expect(lengthLine).toHaveText(`Board Length — 8'0"`);
    await expect(widthLine).toHaveText(`Width — 31"`);
    expect((await sliderEnds(width)).value).toBe(31);

    // The short end: Home on the Length slider is 4'0".
    await pressUntil(length, "Home", lengthLine, `Board Length — 4'0"`);
    await expect(widthLine).toHaveText(`Width — 25"`);
  });

  test("a 4'0\" board's Offset slider ends where the wide point can go: +8\" and -8\"", async ({ page }) => {
    await page.goto("/design/outline");
    const lengthLine = page.getByText(/^Board Length — /);
    const offsetLine = page.getByText(/^Offset — /);
    const length = sliderUnder(page, /^Board Length — /);
    const offset = sliderUnder(page, /^Offset — /);
    await expect(lengthLine).toBeVisible();

    await pressUntil(length, "Home", lengthLine, `Board Length — 4'0"`);
    await pressUntil(offset, "End", offsetLine, `Offset — +8"`);
    await pressUntil(offset, "Home", offsetLine, `Offset — -8"`);
    expect(await sliderEnds(offset)).toMatchObject({ min: -8, max: 8 });

    // From 4'8" up it is the full 12", as ever.
    await pickLengthBox(page, 0, "6'");
    await expect(lengthLine).toHaveText(`Board Length — 6'0"`);
    expect(await sliderEnds(offset)).toMatchObject({ min: -12, max: 12 });
  });

  test("Metric: Length's top is 365.0 cm and its bottom 122.0 cm", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
    await page.context().addCookies([{ name: "shaper-units", value: "metric", domain: "localhost", path: "/" }]);
    await page.goto("/design/outline");
    const lengthLine = page.getByText(/^Board Length — /);
    const length = sliderUnder(page, /^Board Length — /);
    await expect(lengthLine).toBeVisible();

    await pressUntil(length, "End", lengthLine, `Board Length — 365.0 cm`);
    await pressUntil(length, "Home", lengthLine, `Board Length — 122.0 cm`);
  });
});
