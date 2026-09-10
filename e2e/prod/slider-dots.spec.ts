import { expect, test } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../../lib/models/toolbar-tip";

/**
 * Production-build proof that every slider dot is on screen once its row is (quick task
 * 260909-nvw). This lives under e2e/prod/ and runs through playwright.prod.config.ts against
 * `next start`, never the dev server: React's StrictMode on the dev server runs effects twice and
 * hides the bug this guards — a slider that loads folded behind the phone's Fine adjust header
 * measured a zero-width box, got no dot position, and in production stayed hidden until its value
 * changed (`--position: NaN%; visibility: hidden` on the live site). The wrapper in
 * components/ui/slider.tsx now remounts the dot when its row first gets a size, which is what the
 * fold-open assertion below proves. The desktop shell lays its rows out at load, so its case is the
 * sanity half: dots visible with no fold at all.
 */

async function dismissPhoneBanners(page: import("@playwright/test").Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** `--position: <n>%` off each dot's inline style; NaN or a missing value reads as null. */
async function dotPositions(page: import("@playwright/test").Page): Promise<(number | null)[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.slider-accent [data-slot="slider-thumb"]')).map((thumb) => {
      const match = (thumb.getAttribute("style") ?? "").match(/--position: ?([-0-9.]+)%/);
      const n = match ? Number(match[1]) : NaN;
      return Number.isFinite(n) ? n : null;
    }),
  );
}

test.describe("every slider dot is on screen once its row is (production build)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissPhoneBanners(page);
  });

  test("phone: the rows folded behind Fine adjust get their dots the moment the fold opens", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the fold exists only on a phone");
    await page.goto("/design/outline", { waitUntil: "networkidle" });
    const before = await dotPositions(page);
    expect(before.length).toBeGreaterThanOrEqual(11);
    // The folded rows start with no position at all — that is the production state this guards.
    expect(before.filter((p) => p === null).length).toBeGreaterThan(0);

    await page.getByRole("button", { name: /fine adjust/i }).click();
    await expect.poll(async () => (await dotPositions(page)).filter((p) => p === null).length, {
      message: "every dot should have a finite position once the fold is open",
    }).toBe(0);
    const visible = await page.locator('.slider-accent [data-slot="slider-thumb"]:visible').count();
    expect(visible).toBe(before.length);
    for (const p of await dotPositions(page)) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });

  test("desktop: every dot is positioned at load, no fold involved", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
    await page.goto("/design/outline", { waitUntil: "networkidle" });
    const positions = await dotPositions(page);
    expect(positions.length).toBeGreaterThanOrEqual(11);
    expect(positions.filter((p) => p === null)).toHaveLength(0);
  });
});
