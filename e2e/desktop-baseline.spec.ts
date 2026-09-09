import { expect, test } from "@playwright/test";

/**
 * PHON-05's "before" evidence: a picture of all five desktop design screens exactly as they look
 * today, before any phone work starts. Every later plan in Phase 9 re-runs this spec and must
 * leave every pixel unchanged — that is what "desktop untouched" means as a measurement rather
 * than a promise.
 *
 * `desktop` project only: phone projects (iphone, android) never take these shots, since they
 * render an intentionally different (stacked) layout by design.
 *
 * These baselines are macOS-rendered and local-only — there is no CI running them yet, so a
 * different rendering platform (a different OS, a different font-hinting engine) would
 * legitimately regenerate them from scratch. The tolerance is the config's own
 * `maxDiffPixels: 100`.
 *
 * The sign-in banner (`SignInBanner`, mounted above every /design/* screen) is put in one fixed
 * state before every shot — dismissed — via `sessionStorage`, set through `page.addInitScript`
 * before navigation, so the banner's own dismiss animation/absence never becomes part of what
 * this baseline is measuring.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";

test.describe("desktop baseline screenshots", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only baselines");
    await page.addInitScript(
      (key) => {
        window.sessionStorage.setItem(key, "true");
      },
      BANNER_DISMISSAL_KEY,
    );
  });

  test("TEMPLATE (/design/outline)", async ({ page }) => {
    await page.goto("/design/outline");
    await expect(page.locator("svg").first()).toBeVisible();
    await expect(page).toHaveScreenshot("outline-desktop.png");
  });

  test("ROCKER (/design/rocker)", async ({ page }) => {
    await page.goto("/design/rocker");
    await expect(page.locator("svg").first()).toBeVisible();
    await expect(page).toHaveScreenshot("rocker-desktop.png");
  });

  test("RAILS (/design/rails)", async ({ page }) => {
    await page.goto("/design/rails");
    await expect(page.locator("svg").first()).toBeVisible();
    await expect(page).toHaveScreenshot("rails-desktop.png");
  });

  test("VOLUME (/design/volume)", async ({ page }) => {
    await page.goto("/design/volume");
    await expect(page.getByText("Estimated Volume")).toBeVisible();
    await expect(page).toHaveScreenshot("volume-desktop.png");
  });

  test("FINS (/design/fins)", async ({ page }) => {
    await page.goto("/design/fins");
    await expect(page.locator("svg").first()).toBeVisible();
    await expect(page).toHaveScreenshot("fins-desktop.png");
  });
});
