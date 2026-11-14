import { expect, test, type Page } from "@playwright/test";

/**
 * Quick 261114-lym (the founder's request of 2026-09-14, "live coordinates", and his pick of 2026-11-14: hover only,
 * nothing on touch): a mouse or trackpad over the TEMPLATE curve reads the station up from the tail and the board's
 * width there, with a dot on the curve; over the ROCKER profile it reads the station, the rocker and the thickness,
 * with a dot on the bottom and one on the deck. A finger gets nothing.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}


/** Hovers at (x, y) until the read-out appears: the page's handlers arrive with hydration, after the server's own
 * drawing is already on the page, so the pointer is nudged a dot at a time until React owns the drawing. */
async function hoverUntil(page: Page, x: number, y: number, locator: ReturnType<Page["locator"]>) {
  let step = 0;
  await expect
    .poll(
      async () => {
        step += 1;
        await page.mouse.move(x + (step % 2), y + ((step >> 1) % 2));
        return locator.count();
      },
      { timeout: 20_000, intervals: [200, 300, 500] },
    )
    .toBeGreaterThan(0);
}

/** The middle of the board's own silhouette, in page dots. */
async function boardMiddle(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

test.describe("live coordinates under the pointer", () => {
  test.beforeEach(async ({ page }) => {
    await dismissStrips(page);
  });

  test("TEMPLATE on a computer: the station up from the tail and the width there, a dot on the curve; gone off the board", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a mouse's case");
    await page.goto("/design/outline");
    await expect(page.locator("[data-output-rail]")).toHaveCount(3);
    const svg = page.locator("svg:has([data-output-rail])").first();
    const { x, y } = await boardMiddle(page, "svg:has([data-output-rail])");
    const chip = page.locator('[data-readout-chip="hover"]');
    await hoverUntil(page, x, y, chip);
    await expect(chip).toBeVisible();
    await expect(chip).toContainText("Up from tail —");
    await expect(chip).toContainText("Width —");
    await expect(chip).toContainText('"');
    await expect(page.locator("[data-hover-dot]")).toHaveCount(1);
    // The read-out follows the pointer along the board (upright on a computer: along is down the page): a move changes
    // the station.
    const before = await chip.textContent();
    await page.mouse.move(x + 3, y + 60);
    await expect.poll(() => chip.textContent()).not.toBe(before);
    // Off the drawing, nothing.
    const box = (await svg.boundingBox())!;
    await page.mouse.move(box.x - 20, box.y - 20);
    await expect(chip).toHaveCount(0);
    await expect(page.locator("[data-hover-dot]")).toHaveCount(0);
  });

  test("ROCKER on a computer: the station, the rocker and the thickness, dots on the bottom and the deck; gone off the board", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a mouse's case");
    await page.goto("/design/rocker");
    const svg = page.locator('svg[aria-label^="Side profile"]').first();
    await expect(svg).toBeVisible();
    const { x, y, box } = await boardMiddle(page, 'svg[aria-label^="Side profile"]');
    const hover = page.locator("[data-rocker-hover]");
    await hoverUntil(page, x, y, hover);
    await expect(hover).toHaveCount(1);
    await expect(hover).toContainText("Up from tail —");
    await expect(hover).toContainText("Rocker —");
    await expect(hover).toContainText("Thickness —");
    await expect(hover.locator("circle")).toHaveCount(2);
    await page.mouse.move(box.x - 20, box.y - 20);
    await expect(hover).toHaveCount(0);
  });

  test("a phone: a tap on the board draws no hover read-out", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "a finger's case");
    await page.goto("/design/outline");
    await expect(page.locator("[data-output-rail]")).toHaveCount(3);
    const { x, y } = await boardMiddle(page, "svg:has([data-output-rail])");
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(300);
    await expect(page.locator('[data-readout-chip="hover"]')).toHaveCount(0);
    await expect(page.locator("[data-hover-dot]")).toHaveCount(0);
    await page.goto("/design/rocker");
    const svg = page.locator('svg[aria-label^="Side profile"]').first();
    await expect(svg).toBeVisible();
    const r = await boardMiddle(page, 'svg[aria-label^="Side profile"]');
    await page.touchscreen.tap(r.x, r.y);
    await page.waitForTimeout(300);
    await expect(page.locator("[data-rocker-hover]")).toHaveCount(0);
  });
});
