import { expect, test, type Page } from "@playwright/test";

/**
 * TEST-01's proof for Phase 9's tracer (09-02): TEMPLATE stacks on the iphone and android
 * projects — the drawing pinned across the full width above a controls region that alone
 * scrolls, and the six-tab bottom bar under the thumb — while the desktop project proves the
 * sidebar-beside-canvas shell and both phone bars are untouched. Later plans in this phase (top
 * bar and menu, orientation, Fine adjust) extend this same file rather than starting a new one.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const SCREEN_LABELS = ["TEMPLATE", "ROCKER", "RAILS", "VOLUME", "FINS", "SUMMARY"];

/** Matches desktop-baseline.spec.ts's own approach: dismiss the sign-in banner via
 * sessionStorage, set before navigation, so its own height never confuses a layout assertion. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
}

test.describe("phone shell — TEMPLATE stacks with the drawing pinned above the controls", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only shell assertions");
    await dismissSignInBanner(page);
  });

  test("the drawing sits above the controls region, spans the full width, and only the controls region scrolls", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    const drawing = page.locator("main");
    const controls = page.locator("aside");
    await expect(drawing).toBeVisible();
    await expect(controls).toBeVisible();

    const drawingBox = await drawing.boundingBox();
    const controlsBox = await controls.boundingBox();
    if (!drawingBox || !controlsBox) throw new Error("missing bounding box");

    // Stacked, not side by side (PHON-01): the drawing's bottom edge sits at or above the
    // controls region's top edge.
    expect(drawingBox.y + drawingBox.height).toBeLessThanOrEqual(controlsBox.y + 1);

    const viewportSize = page.viewportSize();
    if (!viewportSize) throw new Error("no viewport size");
    // PHON-06: the drawing spans at least 90% of the viewport width.
    expect(drawingBox.width / viewportSize.width).toBeGreaterThanOrEqual(0.9);

    // Nothing scrolls sideways.
    const scrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
    expect(scrollWidth).toBe(viewportSize.width);

    // The page itself never scrolls — the controls region is the phone's one scroller.
    const doc = await page.evaluate(() => ({
      scrollHeight: document.scrollingElement?.scrollHeight ?? 0,
      clientHeight: document.scrollingElement?.clientHeight ?? 0,
    }));
    expect(Math.abs(doc.scrollHeight - doc.clientHeight)).toBeLessThanOrEqual(1);

    // ...while the controls region really is the scroller. The scrolling box itself is
    // `data-design-controls-scroll` (the inner scroll div on most screens, the aside itself on
    // VOLUME's simpler sidebar) — not necessarily `aside`, which can also carry a dev-only footer
    // as a sibling flex item and so never overflows itself even while its scrolling child does.
    const scroller = page.locator("[data-design-controls-scroll]");
    const controlsScroll = await scroller.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(controlsScroll.scrollHeight).toBeGreaterThan(controlsScroll.clientHeight);
  });

  test("the bottom tab bar shows all six screens in order, TEMPLATE marked, every tab at least 44px", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    const tabBar = page.getByRole("navigation", { name: "Screens" });
    await expect(tabBar).toBeVisible();

    const tabs = tabBar.getByRole("link");
    await expect(tabs).toHaveCount(6);
    expect(await tabs.allTextContents()).toEqual(SCREEN_LABELS);

    const templateTab = tabBar.getByRole("link", { name: "TEMPLATE" });
    await expect(templateTab).toHaveClass(/border-surf-accent/);

    for (const tab of await tabs.all()) {
      const box = await tab.boundingBox();
      if (!box) throw new Error("tab is missing a bounding box");
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  });

  // Held-out overflow check (UI-SPEC "Bottom tab bar / overflow"): at these three narrow phone
  // widths, all six labels render whole on one line — no wrap, clip or ellipsis.
  for (const width of [360, 375, 393]) {
    test(`all six tab labels stay whole at ${width}px wide`, async ({ page }) => {
      await page.setViewportSize({ width, height: 640 });
      await page.goto("/design/outline");

      const tabBar = page.getByRole("navigation", { name: "Screens" });
      const tabs = tabBar.getByRole("link");
      await expect(tabs).toHaveCount(6);

      // The bar must fit the screen as well as keep its labels whole: a row of six unshrinkable
      // tabs that spills past the edge makes the whole page scroll sideways (caught at 360px by
      // 09-04's held-out ROCKER check after the wave-3 merge).
      const docScrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
      expect(docScrollWidth, `the page scrolled sideways at ${width}px`).toBe(width);

      for (const tab of await tabs.all()) {
        const fit = await tab.evaluate((el) => ({
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        }));
        expect(fit.scrollWidth).toBeLessThanOrEqual(fit.clientWidth);
        const text = await tab.textContent();
        expect(text ?? "").not.toContain("…");
      }
    });
  }
});

test.describe("phone compact top bar and the one menu", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only top bar assertions");
    await dismissSignInBanner(page);
  });

  test("the desktop link row is hidden and the compact top bar shows the wordmark, Save and Menu", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // The desktop screen-link row (SiteNav's own <nav>, distinguished from the phone tab bar's
    // <nav aria-label="Screens"> by carrying no aria-label at all) is present in the tree but
    // hidden by its own max-shell:hidden rule on a design route at phone width.
    const desktopNav = page.locator("nav:not([aria-label])");
    await expect(desktopNav).toBeHidden();

    const topBar = page.getByRole("banner");
    await expect(topBar).toBeVisible();
    await expect(topBar.getByRole("link", { name: "SHAPER" })).toBeVisible();
    // SaveButton's own accessible name before the first save.
    await expect(topBar.getByRole("button", { name: "Save Board" })).toBeVisible();
    const menuButton = topBar.getByRole("button", { name: "Menu" });
    await expect(menuButton).toBeVisible();

    // The whole row is one non-wrapping line at 360px wide.
    await page.setViewportSize({ width: 360, height: 640 });
    const fit = await topBar.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(Math.abs(fit.scrollHeight - fit.clientHeight)).toBeLessThanOrEqual(1);
  });

  test("the Menu button opens one popup holding both a units choice and the account control", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    const menuButton = page.getByRole("banner").getByRole("button", { name: "Menu" });
    await menuButton.click();

    const popup = page.getByRole("menu");
    await expect(popup).toBeVisible();
    await expect(popup.getByText("Imperial")).toBeVisible();
    await expect(popup.getByText("Metric")).toBeVisible();
    // The account row (NavAuthControl) is the same component the desktop nav renders — located
    // by its own stable hook rather than a state-dependent label, since this suite's deliberately
    // fake Clerk credentials never settle `isLoaded` true (NavAuthControl's own documented
    // fallback while unresolved), so asserting on "Sign in" text would be testing this harness's
    // Clerk stand-in rather than the phone menu's own composition.
    await expect(popup.locator("[data-phone-menu-account]")).toBeVisible();
  });
});

test.describe("phone orientation and the construction overlay default", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only orientation/overlay assertions");
    await dismissSignInBanner(page);
  });

  test("the rotate button is gone and the drag points already show, with nobody tapping anything", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // D-05/D-11: on a phone, turning the phone does the rotate button's job.
    await expect(page.getByRole("button", { name: /^Rotate the board/ })).toBeHidden();

    // D-02: the construction overlay (and so its drag targets) is on by default on a touch
    // device — present the moment the screen opens, before any tap.
    const dragTargets = page.locator("[data-drag-target]");
    await expect(dragTargets.first()).toBeVisible();
    expect(await dragTargets.count()).toBeGreaterThan(0);
  });
});

test.describe("phone Fine adjust group", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only Fine adjust assertions");
    await dismissSignInBanner(page);
  });

  test("folds the repeated sliders behind one 44px tap, last in the controls scroller", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    const fineAdjustButton = page.getByRole("button", { name: "Fine adjust" });
    await expect(fineAdjustButton).toBeVisible();
    const buttonBox = await fineAdjustButton.boundingBox();
    if (!buttonBox) throw new Error("Fine adjust button is missing a bounding box");
    expect(buttonBox.height).toBeGreaterThanOrEqual(44);

    // Width — one of D-03's eight folded sliders — is not visible before the group is tapped.
    const widthLabel = page.getByText(/^Width — /);
    await expect(widthLabel).toBeHidden();

    // Last item in the controls scroller: every other row, including the always-open Settings
    // checkbox, sits above it.
    const settingsRow = page.getByText("View Construction Lines");
    const settingsBox = await settingsRow.boundingBox();
    if (!settingsBox) throw new Error("Settings row is missing a bounding box");
    expect(buttonBox.y).toBeGreaterThanOrEqual(settingsBox.y);

    await fineAdjustButton.click();
    await expect(widthLabel).toBeVisible();
  });
});

test.describe("desktop shell — unchanged", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only shell assertions");
    await dismissSignInBanner(page);
  });

  test("the sidebar sits left of the canvas and the phone bars are hidden", async ({ page }) => {
    await page.goto("/design/outline");

    const sidebar = page.locator("aside");
    const canvas = page.locator("main");
    await expect(sidebar).toBeVisible();
    await expect(canvas).toBeVisible();

    const sidebarBox = await sidebar.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!sidebarBox || !canvasBox) throw new Error("missing bounding box");
    expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(canvasBox.x + 1);

    await expect(page.getByRole("navigation", { name: "Screens" })).toBeHidden();
    await expect(page.getByRole("banner")).toBeHidden();
  });

  test("the rotate button is visible and the drag targets stay hidden until the construction toggle is pressed", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    // PHON-05: desktop's rotate button and off-by-default overlay are exactly what they are
    // today — unaffected by this plan's touch-only defaults.
    await expect(page.getByRole("button", { name: /^Rotate the board/ })).toBeVisible();

    const dragTargets = page.locator("[data-drag-target]");
    expect(await dragTargets.count()).toBe(0);

    await page.getByRole("button", { name: "Show construction lines" }).click();
    await expect(dragTargets.first()).toBeVisible();
  });

  test("no Fine adjust control appears and the Width slider is visible without tapping anything", async ({
    page,
  }) => {
    await page.goto("/design/outline");

    await expect(page.getByRole("button", { name: "Fine adjust" })).toBeHidden();
    await expect(page.getByText(/^Width — /)).toBeVisible();
  });
});
