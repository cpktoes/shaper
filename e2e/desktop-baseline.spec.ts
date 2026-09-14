import { expect, test } from "@playwright/test";

/**
 *
 * RE-RECORDED 2026-09-13 (quick task: a Home icon beside the settings gear) — the one deliberate
 * re-record since these were created in 09-01. The founder asked for a desktop change, so the
 * desktop changed: the five images now show a house icon beside the gear at 1280px and the six
 * screen links shifted left to make room; the diff images confirmed nothing below the nav row
 * moved. The standing rule is unchanged for everything else — phone work must never move a
 * desktop pixel, and these baselines are still the proof. Re-record only for an intended desktop
 * change, from the main checkout, after inspecting the diff.
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
// 260909-hny insurance: the toolbar tip is `display: none` at desktop width regardless of
// dismissal state (the phone-width CSS gate alone holds it there), so this changes no pixel here.
// It's dismissed anyway for the same reason every sibling spec now does: if Playwright's WebKit
// ever implements `-webkit-touch-callout`, nothing here should start depending on that to stay
// pixel-stable.
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

test.describe("desktop baseline screenshots", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only baselines");
    await page.addInitScript(
      (key) => {
        window.sessionStorage.setItem(key, "true");
      },
      BANNER_DISMISSAL_KEY,
    );
    await page.addInitScript(
      (key) => {
        window.localStorage.setItem(key, "true");
      },
      TOOLBAR_TIP_DISMISSAL_KEY,
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
