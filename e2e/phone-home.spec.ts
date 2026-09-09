import { expect, test, type Page } from "@playwright/test";

/**
 * 260909-hq9's own proof: the founder reported the phone home screen ("Phone Homepage layout is
 * terrible. We should mimic the other phone page layout.") — Phase 9 gave the five design screens
 * a phone shell (`e2e/phone-layout.spec.ts`, `e2e/phone-screens.spec.ts`) and deliberately left `/`
 * out of scope for that phase. This file is the home screen's own standing proof, on both phone
 * projects and the desktop one, that `/` now wears the same shell.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const SCREEN_LABELS = ["TEMPLATE", "ROCKER", "RAILS", "VOLUME", "FINS", "SUMMARY"];

/** Matches the sibling phone specs' own approach: dismiss the sign-in banner via sessionStorage,
 * set before navigation, so its own height never confuses a layout assertion. The home screen
 * renders no sign-in banner itself, but carrying this helper matches the house pattern (each spec
 * file keeps its own copy rather than sharing one) and costs nothing. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
}

test.describe("phone home screen — the compact top bar", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only shell assertions");
    await dismissSignInBanner(page);
  });

  test("the desktop link row is hidden, the compact top bar shows SHAPER/Save/Menu, and SHAPER is not a link here", async ({
    page,
  }) => {
    await page.goto("/");

    const desktopNav = page.locator("nav:not([aria-label])");
    await expect(desktopNav).toBeHidden();

    const topBar = page.getByRole("banner");
    await expect(topBar).toBeVisible();
    await expect(topBar.getByText("SHAPER")).toBeVisible();
    // On the page it points at, the wordmark is plain text, not a dead-tap link.
    await expect(topBar.getByRole("link", { name: "SHAPER" })).toHaveCount(0);
    await expect(topBar.getByRole("button", { name: "Save Board" })).toBeVisible();
    await expect(topBar.getByRole("button", { name: "Menu" })).toBeVisible();
  });
});

test.describe("phone home screen — the six-tab bottom bar", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only shell assertions");
    await dismissSignInBanner(page);
  });

  test("the tab bar shows all six screens in order, none marked, every tab at least 44px", async ({
    page,
  }) => {
    await page.goto("/");

    const tabBar = page.getByRole("navigation", { name: "Screens" });
    await expect(tabBar).toBeVisible();

    const tabs = tabBar.getByRole("link");
    await expect(tabs).toHaveCount(6);
    expect(await tabs.allTextContents()).toEqual(SCREEN_LABELS);

    for (const tab of await tabs.all()) {
      await expect(tab).not.toHaveClass(/border-surf-accent/);
      const box = await tab.boundingBox();
      if (!box) throw new Error("tab is missing a bounding box");
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("phone home screen — nothing scrolls sideways or vertically", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only shell assertions");
    await dismissSignInBanner(page);
  });

  for (const width of [360, 375, 393]) {
    test(`at ${width}px wide, the page itself doesn't scroll in either direction`, async ({ page }) => {
      await page.setViewportSize({ width, height: 640 });
      await page.goto("/");

      const scrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
      expect(scrollWidth).toBe(width);

      const doc = await page.evaluate(() => ({
        scrollHeight: document.scrollingElement?.scrollHeight ?? 0,
        clientHeight: document.scrollingElement?.clientHeight ?? 0,
      }));
      expect(Math.abs(doc.scrollHeight - doc.clientHeight)).toBeLessThanOrEqual(1);
    });
  }
});

test.describe("phone home screen — the round trip proves both bars navigate", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only shell assertions");
    await dismissSignInBanner(page);
  });

  test("a preset tap opens TEMPLATE, and SHAPER in the top bar there returns home with the rack showing", async ({
    page,
  }) => {
    await page.goto("/");

    const firstPreset = page.getByRole("button").filter({ hasText: "Start Shaping" }).first();
    await firstPreset.click();
    await page.waitForURL("**/design/outline");

    // On a design route the wordmark IS a link — this is the return path home.
    await page.getByRole("banner").getByRole("link", { name: "SHAPER" }).click();
    await page.waitForURL("/");

    await expect(page.getByRole("heading", { name: "Your Boards" })).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
    const viewportSize = page.viewportSize();
    if (!viewportSize) throw new Error("no viewport size");
    expect(scrollWidth).toBe(viewportSize.width);
  });
});

test.describe("desktop home screen — unmoved", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only shell assertions");
    await dismissSignInBanner(page);
  });

  test("the desktop link row is visible with its six links, and neither phone bar renders", async ({
    page,
  }) => {
    await page.goto("/");

    const desktopNav = page.locator("nav:not([aria-label])");
    await expect(desktopNav).toBeVisible();
    for (const label of SCREEN_LABELS) {
      await expect(desktopNav.getByRole("link", { name: label })).toBeVisible();
    }

    await expect(page.getByRole("navigation", { name: "Screens" })).toBeHidden();
    await expect(page.getByRole("banner")).toBeHidden();
  });
});
