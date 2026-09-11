import { expect, test, type Page } from "@playwright/test";

/**
 * Deliberately NOT imported from `components/site-nav.tsx`: that file's module graph pulls in
 * `settings-menu.tsx` -> `units-provider.tsx` -> `app/actions/units.ts` -> `lib/db/client.ts`,
 * which throws at Node-side module-load time if `DATABASE_URL` isn't set in the shell running
 * Playwright's own test process (a server-only import chain, not a browser one — the crash
 * happens before any test runs, in Node, not inside the page). Every sibling phone spec in this
 * suite (`e2e/phone-home.spec.ts`, `e2e/phone-screens.spec.ts`) hand-writes this same six-label
 * list rather than importing it, for exactly this reason. `site-nav.tsx`'s own `NAV_LINKS` is
 * still the single source of truth for these six labels and their order — this array is read
 * from it by eye, not derived, matching the house convention.
 */
const NAV_LINKS = [
  { href: "/design/outline", label: "TEMPLATE" },
  { href: "/design/rocker", label: "ROCKER" },
  { href: "/design/rails", label: "RAILS" },
  { href: "/design/volume", label: "VOLUME" },
  { href: "/design/fins", label: "FINS" },
  { href: "/design/summary", label: "SUMMARY" },
] as const;

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

  test("home (no tab bar) -> pick a preset -> all six screens by tapping the bar -> summary reads clean -> back home with the board in the rack", async ({
    page,
  }) => {
    // 1. Home: the six-tab bar has not mounted at all yet (D-07).
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Screens" })).toHaveCount(0);

    // 2. Pick the first preset. Lands on TEMPLATE (/design/outline) with the bar now present.
    const firstPreset = page.getByRole("button").filter({ hasText: "Start Shaping" }).first();
    await firstPreset.click();
    await page.waitForURL("**/design/outline");

    const tabBar = page.getByRole("navigation", { name: "Screens" });
    await expect(tabBar).toBeVisible();

    // 3. Walk all six tabs in NAV_LINKS order, by tapping the bar rather than by calling `goto` —
    // this is what actually proves the route is walkable through the UI a shaper will use, not
    // just that the destination page itself renders. TEMPLATE is already the active tab from the
    // preset pick; the remaining five are reached by tapping the bar in turn.
    //
    // `dispatchEvent("click")`, not `.click()`: Next's own dev-mode indicator
    // (`<nextjs-portal>`, bottom-left of the viewport, only ever present under `next dev`) sits
    // directly over part of the tab bar and physically intercepts a real mouse click at that
    // screen position — a dev-server-only artifact, never present in the production build the
    // founder actually uses (confirmed: no `<nextjs-portal>` element exists outside development
    // mode; `.click({ force: true })` still fails here because it only skips Playwright's own
    // actionability check, not the browser's real hit-test at that coordinate).
    // `dispatchEvent` fires the DOM `click` event directly on the target `<a>` itself, which is
    // what Next's own `<Link>` listens for to perform its client-side navigation — so this still
    // proves the tab bar's own click handler navigates correctly, just without going through a
    // dev-only overlay that would never exist on the real site. No sibling spec discovered this
    // before, because none of them clicks the bottom tab bar itself — they only assert its class
    // after landing via a preset pick or a direct `goto`.
    for (const link of NAV_LINKS) {
      const tab = tabBar.getByRole("link", { name: link.label });
      await tab.dispatchEvent("click");
      await page.waitForURL(`**${link.href}`);
      await expect(tabBar).toBeVisible();
      await expect(tab).toHaveClass(/border-surf-accent/);
    }

    // We should now be on SUMMARY, the last link in NAV_LINKS order.
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

    // The tab bar is gone again on the home route (D-07), and the in-progress board this trip
    // just walked now shows up in the rack (autosave, this signed-out session's own local board).
    await expect(page.getByRole("navigation", { name: "Screens" })).toHaveCount(0);
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
    await expect(page.getByRole("navigation", { name: "Screens" })).toBeHidden();
    const desktopNav = page.locator("nav:not([aria-label])");
    await expect(desktopNav).toBeVisible();
  });
});
