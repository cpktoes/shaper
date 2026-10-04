import { devices, expect, test, type Locator, type Page } from "@playwright/test";
import { SCREENS, expectNoScreensNavigation, goToScreen, openPhoneMenu, screenTile } from "./helpers/screens";

/**
 * Phase 13 item 9d (quick 260930-r8s) — the founder, having walked the live site with a phone
 * held sideways: "On horizontal phone, we need to reduce the nav bar to one thin line. I think we
 * should go with the phones hamberger button to reduce the menu items so that Shaper Assistant
 * does wrap[sic]." This file is the browser proof for CLAUDE.md's third switch — screen height
 * alone, at any width — now also deciding which top bar draws: below this, a phone held sideways
 * got the desktop row squeezed into a short screen (measured 93 dots tall with the name wrapped
 * onto two lines, about 105 on the live site, which renders Clerk's real wider account button);
 * after this plan the same screen gets the phone's own 48-dot bar (item 9e, quick 260930-s23,
 * P-7, made it thinner still — 56 when this plan first shipped it), name on one line, with the
 * six screens reachable from its Menu instead of the desktop row. Since quick 261003-q2f that Menu
 * opens a sheet whose first items are the six screen tiles (one row of six at this width), and an
 * upright phone's Menu opens the same tiles (three by two) — there is no bottom tab bar anywhere.
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
 * the `banner` (the phone bar) is visible at (within a dot of) `--phone-top-bar-h`, 48; the name
 * inside it sits on exactly one line (a DOM Range over its text, counting the distinct rounded
 * `top` values of the Range's own client rects); the bar's Menu button is visible; no navigation
 * named "Screens" exists (the old bottom tab bar, removed in quick 261003-q2f); and the page never
 * scrolls sideways. */
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
  // Item 9e (quick 260930-s23, P-7): the bar itself is 48 now, not 56 — this literal moves with
  // it. The assertion above, against the token, stays as it is.
  expect(Math.abs(bannerBox.height - 48)).toBeLessThanOrEqual(1);

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

  await expectNoScreensNavigation(page);

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBe(width);
}

/** `page.goto`, retried: real WebKit's dev server occasionally pushes a background Fast Refresh
 * full reload right after `/design/outline`'s first paint, which can interrupt a `page.goto` that
 * follows soon after (the same WebKit-only dev-server quirk e2e/phone-layout.spec.ts and
 * e2e/phone-toolbar-tip.spec.ts's own comments document, both of which route around it with a
 * client-side nav instead). This file's whole point is proving every address with a fresh hard
 * load, so it retries the `goto` itself rather than switching to a click. */
async function gotoRoute(page: Page, route: string) {
  await expect(async () => {
    await page.goto(route);
  }).toPass({ timeout: 15_000 });
}

/** Opens the phone bar's Menu and returns the sheet, settled past its own opening animation —
 * the shared helper (e2e/helpers/screens.ts) since quick 261003-q2f. */
async function openMenu(page: Page): Promise<Locator> {
  return openPhoneMenu(page);
}

/** Every address this file proves draws the thin bar on, not only the six design screens: the
 * home screen and a mistyped address both mount `SiteNav` too (P-2, quick 260930-fjm). */
const ROUTES = [...SCREENS.map((screen) => screen.href), "/", "/no-such-page"];

/** Walks all six screens from the Menu, starting on TEMPLATE: for each screen in turn, moves
 * there by its tile (`goToScreen`), confirms the move was client-side (the marker set once before
 * the walk survives every stop), confirms exactly one tile in the Screens group is ticked and it is
 * the screen just reached, then closes the menu with Escape before moving to the next screen —
 * proving the whole six-screen loop, not only one hop (T-r8s-01). */
async function walkAllSixFromTheMenu(page: Page) {
  await page.goto("/design/outline");
  await page.evaluate(() => {
    (window as unknown as { __r8sMarker?: number }).__r8sMarker = 1;
  });

  for (const screen of SCREENS) {
    await goToScreen(page, screen.label);
    await expect(page).toHaveURL(new RegExp(`${screen.href}$`));
    expect(await page.evaluate(() => (window as unknown as { __r8sMarker?: number }).__r8sMarker)).toBe(1);

    const popup = await openMenu(page);
    const group = popup.getByRole("group", { name: "Screens" });
    const current = group.locator('[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAttribute("data-screen-tile", screen.href);
    await expect(current).toContainText(screen.label);

    await page.keyboard.press("Escape");
    await expect(popup).toBeHidden();
  }
}

/** Opens the menu and confirms all six screen tiles sit whole inside the sheet's own box — none
 * clipped by the fold — in ONE row at this desktop-shell width, each at least 44 dots tall under a
 * touch pointer. Logs the sheet's height and the tiles' bottom edge for the SUMMARY. Returns the
 * sheet, left open. */
async function assertAllSixInFirstView(page: Page): Promise<Locator> {
  const popup = await openMenu(page);
  const popupBox = await popup.boundingBox();
  if (!popupBox) throw new Error("popup has no bounding box");

  const tiles = popup.getByRole("group", { name: "Screens" }).getByRole("menuitem");
  await expect(tiles).toHaveCount(SCREENS.length);

  let lastTileBottom = 0;
  const tops = new Set<number>();
  for (let index = 0; index < SCREENS.length; index += 1) {
    const tileBox = await tiles.nth(index).boundingBox();
    if (!tileBox) throw new Error("screen tile has no bounding box");
    expect(tileBox.y).toBeGreaterThanOrEqual(popupBox.y - 1);
    expect(tileBox.y + tileBox.height).toBeLessThanOrEqual(popupBox.y + popupBox.height + 1);
    expect(tileBox.height).toBeGreaterThanOrEqual(43.5);
    tops.add(Math.round(tileBox.y));
    lastTileBottom = Math.max(lastTileBottom, tileBox.y + tileBox.height);
  }
  expect(tops.size, "the six tiles sit in one row").toBe(1);
  console.log(`[q2f] sideways sheet height ${popupBox.height}, tiles' bottom ${lastTileBottom}`);

  return popup;
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
    await expect(popup.getByRole("menuitem").first()).toHaveAttribute("data-screen-tile", "/design/outline");
    await expect(screenTile(page, "TEMPLATE")).toHaveAttribute("aria-current", "page");

    // A marker that only a client-side move preserves — a hard navigation would wipe it along
    // with an unsaved board (T-r8s-02).
    await page.evaluate(() => {
      (window as unknown as { __r8sMarker?: number }).__r8sMarker = 1;
    });

    await goToScreen(page, "ROCKER");
    expect(await page.evaluate(() => (window as unknown as { __r8sMarker?: number }).__r8sMarker)).toBe(1);

    await openMenu(page);
    await expect(screenTile(page, "ROCKER")).toHaveAttribute("aria-current", "page");
    await expect(screenTile(page, "TEMPLATE")).not.toHaveAttribute("aria-current", "page");
  });

  test("every screen has the thin bar", async ({ page }) => {
    // Eight routes, each with a full assertThinBar pass — the same budget
    // e2e/contact.spec.ts's own eight-route walk uses.
    test.setTimeout(90_000);
    for (const route of ROUTES) {
      await gotoRoute(page, route);
      await assertThinBar(page, 863, 360);
      const height = await page.getByRole("banner").evaluate((el) => el.getBoundingClientRect().height);
      console.log(`[r8s] ${route} banner height ${height}`);
    }
  });

  test("the menu walks to all six screens, current one ticked, without reloading", async ({ page }) => {
    await walkAllSixFromTheMenu(page);
  });

  test("all six screens are in view the moment the menu opens", async ({ page }) => {
    await page.goto("/design/outline");
    await assertAllSixInFirstView(page);
  });

  test("everything the desktop row offered is still here", async ({ page }) => {
    await page.goto("/design/outline");

    const banner = page.getByRole("banner");
    await expect(banner.getByRole("link", { name: "SHAPER ASSISTANT" })).toBeVisible();
    await expect(banner.getByRole("button", { name: "Save Board" })).toBeVisible();

    const popup = await openMenu(page);
    for (const name of ["Home", "Contact", "Privacy"]) {
      const row = popup.getByRole("menuitem", { name, exact: true });
      await row.scrollIntoViewIfNeeded();
      await expect(row).toBeVisible();
    }
    // Units, theme, blank makers and the fit and tip defaults all live behind this one row.
    const appSettings = popup.getByRole("menuitem", { name: /^App Default Settings/ });
    await appSettings.scrollIntoViewIfNeeded();
    await expect(appSettings).toBeVisible();

    const account = popup.locator("[data-phone-menu-account]");
    await account.scrollIntoViewIfNeeded();
    await expect(account).toBeVisible();

    // On the home screen the wordmark is plain text (a dead tap, per phone-top-bar.tsx's own
    // comment), and the Home row has nothing left to go home to.
    await page.goto("/");
    const homeBanner = page.getByRole("banner");
    await expect(homeBanner.getByText("SHAPER ASSISTANT", { exact: true })).toBeVisible();
    await expect(homeBanner.getByRole("link", { name: "SHAPER ASSISTANT" })).toHaveCount(0);

    const homePopup = await openMenu(page);
    await expect(homePopup.getByRole("menuitem", { name: "Home", exact: true })).toHaveCount(0);
    for (const screen of SCREENS) {
      await expect(screenTile(page, screen.label)).toBeVisible();
    }
    await expect(homePopup.locator('[data-screen-tile][aria-current="page"]')).toHaveCount(0);
  });

  test("arrow keys start on the first screen", async ({ page }) => {
    await page.goto("/design/outline");
    await waitForReactOwner(page, 'header button[aria-label="Menu"]');

    const trigger = page.getByRole("banner").getByRole("button", { name: "Menu" });
    await trigger.focus();
    await page.keyboard.press("ArrowDown");

    const popup = page.getByRole("menu");
    await expect(popup).toBeVisible();
    await expect(popup.locator("[data-highlighted]")).toHaveAttribute("data-screen-tile", "/design/outline");
  });
});

// The real sideways iPhone width (844 CSS px), built the same way e2e/phone-layout.spec.ts
// builds `realSidewaysIphoneViewport` — Playwright's own `iPhone 14 landscape` descriptor reports
// an emulator's 750x340, so its viewport is swapped for the 844x390 real hardware reported.
const {
  defaultBrowserType: iphoneLandscapeBrowserType,
  viewport: iphoneLandscapeEmulatorViewport,
  ...iphoneLandscapeRest
} = devices["iPhone 14 landscape"];
void iphoneLandscapeBrowserType;
void iphoneLandscapeEmulatorViewport;
const realSidewaysIphoneViewport = { ...iphoneLandscapeRest, viewport: { width: 844, height: 390 } };

test.describe("a real iPhone held sideways gets the phone's thin bar too (quick 260930-r8s, item 9d)", () => {
  test.use({ ...realSidewaysIphoneViewport });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "iphone",
      "this describe supplies its own viewport (a real sideways iPhone, 844x390, WebKit)",
    );
    await dismissSignInBanner(page);
  });

  test("every screen has the thin bar", async ({ page }) => {
    // Eight routes, each with a full assertThinBar pass — the same budget
    // e2e/contact.spec.ts's own eight-route walk uses.
    test.setTimeout(90_000);
    for (const route of ROUTES) {
      await gotoRoute(page, route);
      await assertThinBar(page, 844, 390);
      const height = await page.getByRole("banner").evaluate((el) => el.getBoundingClientRect().height);
      console.log(`[r8s] ${route} banner height ${height}`);
    }
  });

  test("the menu walks to all six screens", async ({ page }) => {
    await walkAllSixFromTheMenu(page);
  });

  test("with Safari's bar showing (844x340), all six screens are in view", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 340 });
    await page.goto("/design/outline");
    await assertAllSixInFirstView(page);
  });
});

test.describe("a tall computer window keeps the desktop row; its gear menu has no screens group (quick 260930-r8s)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only: this describe sets its own viewport sizes");
    await dismissSignInBanner(page);
  });

  for (const size of [
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
    { width: 820, height: 800 },
  ]) {
    test(`at ${size.width}x${size.height} the desktop row shows, and the gear menu has no screens group`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await page.goto("/design/outline");

      const shortScreen = await page.evaluate(() => window.matchMedia("(max-height: 500px)").matches);
      expect(shortScreen).toBe(false);

      const desktopNav = page.locator("nav:not([aria-label])");
      await expect(desktopNav).toBeVisible();
      for (const screen of SCREENS) {
        await expect(desktopNav.getByRole("link", { name: screen.label })).toBeVisible();
      }
      await expect(page.getByRole("banner")).toBeHidden();

      const gear = page.getByRole("button", { name: "Settings", exact: true });
      await gear.click();
      const popup = page.getByRole("menu");
      await expect(popup).toBeVisible();
      await expect(popup.getByRole("menuitem", { name: "Contact", exact: true })).toBeVisible();
      for (const screen of SCREENS) {
        await expect(popup.getByRole("menuitem", { name: screen.label, exact: true })).toHaveCount(0);
      }
      await expect(page.locator("[data-screen-tile]")).toHaveCount(0);
    });
  }
});

test.describe("an upright phone's menu opens on the six screen tiles too (quick 261003-q2f)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only: each phone project's own upright viewport");
    await dismissSignInBanner(page);
  });

  test("the desktop row stays hidden, there is no bottom tab bar, and the menu starts with the six tiles", async ({
    page,
  }, testInfo) => {
    await page.goto("/design/outline");

    const shortScreen = await page.evaluate(() => window.matchMedia("(max-height: 500px)").matches);
    expect(shortScreen).toBe(false);

    await expect(page.getByRole("banner")).toBeVisible();
    await expectNoScreensNavigation(page);
    await expect(page.locator("nav:not([aria-label])")).toBeHidden();

    const popup = await openMenu(page);
    await expect(popup.getByRole("menuitem").first()).toHaveAttribute("data-screen-tile", "/design/outline");
    for (const screen of SCREENS) {
      await expect(screenTile(page, screen.label)).toBeVisible();
    }

    if (testInfo.project.name === "android") {
      await page.keyboard.press("Escape");
      await expect(popup).toBeHidden();

      const trigger = page.getByRole("banner").getByRole("button", { name: "Menu" });
      await trigger.focus();
      await page.keyboard.press("ArrowDown");

      const reopened = page.getByRole("menu");
      await expect(reopened).toBeVisible();
      await expect(reopened.locator("[data-highlighted]")).toHaveAttribute("data-screen-tile", "/design/outline");
    }
  });
});
