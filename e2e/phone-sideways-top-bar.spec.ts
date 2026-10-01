import { devices, expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Phase 13 item 9d (quick 260930-r8s) — the founder, having walked the live site with a phone
 * held sideways: "On horizontal phone, we need to reduce the nav bar to one thin line. I think we
 * should go with the phones hamberger button to reduce the menu items so that Shaper Assistant
 * does wrap[sic]." This file is the browser proof for CLAUDE.md's third switch — screen height
 * alone, at any width — now also deciding which top bar draws: below this, a phone held sideways
 * got the desktop row squeezed into a short screen (measured 93 dots tall with the name wrapped
 * onto two lines, about 105 on the live site, which renders Clerk's real wider account button);
 * after this plan the same screen gets the phone's own 56-dot bar, name on one line, with the six
 * screens reachable from its Menu instead of the desktop row.
 *
 * This file starts as Task 1's tracer (one Pixel 7 sideways test) and is Task 2's home for the
 * full proof: both real sideways phones, every route, the Menu's walk between all six screens,
 * the fold check, a tall computer window, and an upright phone — all deliberately in one file so
 * the shared helpers below are written once.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

/** The sibling specs' own dismissals (e.g. e2e/phone-layout.spec.ts), set before navigation so
 * neither strip ever confuses a layout or bar-height assertion. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Waits until React owns the element matching `selector` (it carries a `__reactFiber…` key) —
 * the same probe `e2e/desktop-baseline.spec.ts` uses, needed so a click right after navigation
 * never races hydration. */
async function waitForReactOwner(page: Page, selector: string) {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
  }, selector);
}

/** The full proof that a given viewport draws the phone's thin bar, not the desktop row: the
 * window really is `width` x `height`; the height-alone media query matches, alongside the
 * width-alone query that keeps the desktop SHELL underneath; the bare desktop `<nav>` is hidden;
 * the `banner` (the phone bar) is visible at (within a dot of) `--phone-top-bar-h`, 56; the name
 * inside it sits on exactly one line (a DOM Range over its text, counting the distinct rounded
 * `top` values of the Range's own client rects); the bar's Menu button is visible; the six-tab
 * bottom bar (`nav[aria-label="Screens"]`) stays hidden, since the desktop shell never shows it;
 * and the page never scrolls sideways. */
async function assertThinBar(page: Page, width: number, height: number) {
  const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
  expect(viewport.width).toBe(width);
  expect(viewport.height).toBe(height);

  const media = await page.evaluate(() => ({
    shortScreen: window.matchMedia("(max-height: 500px)").matches,
    wideEnoughForDesktopShell: window.matchMedia("(min-width: 820px)").matches,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
  }));
  expect(media.shortScreen).toBe(true);
  expect(media.wideEnoughForDesktopShell).toBe(true);
  expect(media.coarsePointer).toBe(true);

  await expect(page.locator("nav:not([aria-label])")).toBeHidden();

  const banner = page.getByRole("banner");
  await expect(banner).toBeVisible();

  const barHeightToken = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--phone-top-bar-h")),
  );
  const bannerBox = await banner.boundingBox();
  if (!bannerBox) throw new Error("banner has no bounding box");
  expect(Math.abs(bannerBox.height - barHeightToken)).toBeLessThanOrEqual(1);
  expect(Math.abs(bannerBox.height - 56)).toBeLessThanOrEqual(1);

  const wordmark = banner.getByText("SHAPER ASSISTANT", { exact: true });
  await expect(wordmark).toBeVisible();
  const wordmarkLineCount = await wordmark.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops = new Set(Array.from(range.getClientRects()).map((rect) => Math.round(rect.top)));
    return tops.size;
  });
  expect(wordmarkLineCount).toBe(1);

  await expect(banner.getByRole("button", { name: "Menu" })).toBeVisible();

  await expect(page.getByRole("navigation", { name: "Screens" })).toBeHidden();

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBe(width);
}

/** Opens the phone bar's Menu and returns the popup, settled past its own opening animation —
 * otherwise a bounding box read mid-animation is a frame short of its final size (the same wait
 * e2e/blank-makers.spec.ts and e2e/fit-defaults.spec.ts use). */
async function openMenu(page: Page): Promise<Locator> {
  await waitForReactOwner(page, 'header button[aria-label="Menu"]');
  await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
  const popup = page.getByRole("menu");
  await expect(popup).toBeVisible();
  await popup.evaluate(async (el) => {
    await Promise.all(el.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => undefined)));
  });
  return popup;
}

/** Clicks a screen row in the (already open, or freshly reopened) Menu and waits for the move to
 * land, retrying the whole open-click gesture if a click lands a frame before Base UI's anchored
 * positioning has fully settled: on this popup a too-early click still closes the menu (Base UI's
 * own default on any item click) without ever reaching the row's own `onClick`, so retrying the
 * click alone — with the menu already gone — would find nothing to click. Reopening is therefore
 * part of the retried gesture, the same "retry the whole interaction" idiom
 * e2e/blank-makers.spec.ts and e2e/contact.spec.ts use for their own popups. */
async function navigateViaMenu(page: Page, label: string, hrefPattern: RegExp) {
  await expect(async () => {
    const menu = page.getByRole("menu");
    if (!(await menu.isVisible())) {
      await openMenu(page);
    }
    await page.getByRole("menu").getByRole("menuitem", { name: label, exact: true }).click();
    await expect(page).toHaveURL(hrefPattern, { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}

// Dropping `defaultBrowserType` matches e2e/phone-layout.spec.ts's own approach: it cannot be set
// via `test.use` inside a describe (Playwright forces a new worker for it), and it's redundant
// anyway since the `android` project this describe is pinned to already runs Chromium.
const { defaultBrowserType: pixel7LandscapeBrowserType, ...pixel7LandscapeViewport } =
  devices["Pixel 7 landscape"];
void pixel7LandscapeBrowserType;

test.describe("a Pixel 7 held sideways gets the phone's thin bar, not the desktop row (quick 260930-r8s, item 9d)", () => {
  test.use({ ...pixel7LandscapeViewport });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "android",
      "this describe supplies its own device (Pixel 7 landscape, 863x360)",
    );
    await dismissSignInBanner(page);
  });

  test("TEMPLATE shows the thin bar, and its menu takes the shaper to ROCKER", async ({ page }) => {
    await page.goto("/design/outline");
    await assertThinBar(page, 863, 360);

    // The desktop shell still renders underneath the thin bar — controls beside the board, never
    // stacked above them: height alone decides which BAR draws, never the layout (O-1).
    const sidebarBox = await page.locator("aside").boundingBox();
    const canvasBox = await page.locator("main").boundingBox();
    if (!sidebarBox || !canvasBox) throw new Error("missing bounding box");
    expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(canvasBox.x + 1);

    const popup = await openMenu(page);
    await expect(popup.getByRole("menuitem").first()).toHaveText("TEMPLATE");
    await expect(popup.getByRole("menuitem", { name: "TEMPLATE", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // A marker that only a client-side move preserves — a hard navigation would wipe it along
    // with an unsaved board (T-r8s-02).
    await page.evaluate(() => {
      (window as unknown as { __r8sMarker?: number }).__r8sMarker = 1;
    });

    await navigateViaMenu(page, "ROCKER", /\/design\/rocker$/);
    expect(await page.evaluate(() => (window as unknown as { __r8sMarker?: number }).__r8sMarker)).toBe(1);

    const popupAgain = await openMenu(page);
    await expect(popupAgain.getByRole("menuitem", { name: "ROCKER", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(popupAgain.getByRole("menuitem", { name: "TEMPLATE", exact: true })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
