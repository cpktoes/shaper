import { expect, test, type Page } from "@playwright/test";
import { SCREENS, expectNoScreensNavigation, expectSixTilesInMenu, goToScreen } from "./helpers/screens";

/**
 * Phase 10 plan 04, Task 1 — the machine pass over PHON-10's whole trip, walked once by
 * Playwright on both phone projects immediately BEFORE the founder is ever handed a phone. It
 * exists so a broken route is caught for free, rather than costing the founder's own time during
 * the real-device sweep in `10-SWEEP.md`.
 *
 * It is NOT the proof of PHON-10. Signed out, on this suite's deliberately fake Clerk keys
 * (`playwright.config.ts`), this run cannot:
 *   1. Sign in or sign up (Clerk never renders real UI on a fake key — confirmed by 10-01 and
 *      10-02's own SUMMARYs).
 *   2. Reach the saved-board rack's card menu, or its rename/duplicate/delete dialogs (they only
 *      render for a signed-in shaper with a saved board).
 *   3. Reproduce the iOS long-press callout appearing over a drag.
 *   4. Reproduce a sticky `:hover` state lingering after a tap (a real-iOS-Safari behavior).
 *   5. Collapse Safari's own toolbar mid-scroll.
 *   6. Render a real safe area (`env(safe-area-inset-bottom)` resolves to 0 in every Playwright
 *      project — there is no notch to inset around).
 *
 * Every one of those six is handed to the real-device sweep (`10-SWEEP.md`), not proved here.
 * This spec's own job is narrower and duplicates nothing the three wave-1 specs already own: it
 * proves the ROUTE is walkable end to end — home, a preset, all six screens, the summary, and
 * back home — not that any individual control is the right size (`e2e/phone-dialogs.spec.ts`,
 * `e2e/phone-account.spec.ts`, `e2e/phone-home.spec.ts`, `e2e/phone-screens.spec.ts` already own
 * that).
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

/** Matches the house pattern every phone spec in this suite repeats for itself. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

test.describe("the whole trip, walked once by machine before the founder is handed a phone", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "PHON-10's phone trip only — desktop is unmoved");
    await dismissSignInBanner(page);
  });

  test("home -> pick a preset -> all six screens by tapping their tiles in the menu -> summary reads clean -> back home with the board in the rack", async ({
    page,
  }) => {
    // 1. Home: no bottom tab bar (there is none anywhere since quick 261003-q2f).
    await page.goto("/");
    await expectNoScreensNavigation(page);

    // 2. Pick the first preset. Lands on TEMPLATE (/design/outline).
    const firstPreset = page.getByRole("button").filter({ hasText: "Start Shaping" }).first();
    await firstPreset.click();
    await page.waitForURL("**/design/outline");

    // 3. Walk all six screens in order, by opening the top bar's menu and tapping each screen's
    // tile rather than by calling `goto` — this is what actually proves the route is walkable
    // through the UI a shaper will use, not just that the destination page itself renders.
    // TEMPLATE is already open from the preset pick; the remaining five are reached by tapping
    // their tiles in turn, and after each move the menu shows that screen's tile ticked. (The tiles
    // sit at the top of the window, clear of the dev server's own bottom-left corner badge, which
    // used to sit over the old bottom tab bar and swallow real taps.)
    for (const screen of SCREENS) {
      await goToScreen(page, screen.label);
      await expect(page).toHaveURL(new RegExp(`${screen.href}$`));
      await expectSixTilesInMenu(page, screen.label);
    }

    // We should now be on SUMMARY, the last screen.
    expect(page.url()).toContain("/design/summary");

    // 4. On the summary screen: no sideways scroll, and the Print Order Form control sits fully
    // inside the viewport — the two gross-layout facts this spec owns; the summary's own
    // per-element sizing already lives in e2e/summary-preview.spec.ts and is not repeated here.
    await expect(page.locator("[data-order-form-sheet]").first()).toBeVisible();

    const viewportSize = page.viewportSize();
    if (!viewportSize) throw new Error("no viewport size");
    const scrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
    expect(scrollWidth).toBe(viewportSize.width);

    // The button sits well down a portrait order form and is reached by scrolling, same as
    // e2e/summary-preview.spec.ts's own "sits fully on the screen" test — its own bounding-box
    // check is horizontal only (x/width), for the same reason: the page scrolls vertically by
    // design, only sideways scroll (Fact 6 in that file) is the regression this guards against.
    // Scrolled into view, it must sit fully within the viewport on BOTH axes at that moment.
    const printButton = page.getByRole("button", { name: "Print Order Form" });
    await printButton.scrollIntoViewIfNeeded();
    const printBox = await printButton.boundingBox();
    if (!printBox) throw new Error("Print Order Form button is missing a bounding box");
    expect(printBox.x).toBeGreaterThanOrEqual(0);
    expect(printBox.x + printBox.width).toBeLessThanOrEqual(viewportSize.width);
    expect(printBox.y).toBeGreaterThanOrEqual(0);
    expect(printBox.y + printBox.height).toBeLessThanOrEqual(viewportSize.height + 1);

    // 5. Return home through the top bar's wordmark link.
    await page.getByRole("banner").getByRole("link", { name: "SHAPER ASSISTANT" }).click();
    await page.waitForURL("/");

    // Still no bottom tab bar on the home route, and the in-progress board this trip just walked
    // now shows up in the rack (autosave, this signed-out session's own local board).
    await expectNoScreensNavigation(page);
    await expect(page.getByRole("heading", { name: "Your Boards" })).toBeVisible();
    await expect(
      page.getByRole("button").filter({ hasText: "Continue This Board" }).first(),
    ).toBeVisible();
  });
});

test.describe("desktop — unmoved by this plan", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only regression pass");
    await dismissSignInBanner(page);
  });

  test("the desktop project runs clean with no snapshot regenerated", async ({ page }) => {
    await page.goto("/");
    await expectNoScreensNavigation(page);
    await expect(page.locator("[data-screen-tile]")).toHaveCount(0);
    const desktopNav = page.locator("nav:not([aria-label])");
    await expect(desktopNav).toBeVisible();
  });
});
