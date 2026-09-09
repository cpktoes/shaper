import { expect, test, type Page } from "@playwright/test";

/**
 * 09-03's own proof, extending 09-02's phone-shell test file's own pattern to the three screens
 * this plan moved onto `DesignScreenShell`: ROCKER (a 66dvh pinned area, board standing with the
 * phone, D-18's narrower-than-full-width drawing accepted), VOLUME (nothing pinned, one plain
 * scrolling column, D-01), and FINS (a 55dvh pinned area, full-width diagram, `ToeAimTableModal`
 * still reachable through the shell's `outsideColumns` slot). This is this plan's own new spec
 * file — 09-02's own test file stays 09-02's, per that file's own header comment.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
// 260909-hny insurance: today this changes no measurement, because the toolbar tip is already
// `display: none` in every Playwright project (see e2e/phone-toolbar-tip.spec.ts's header
// comment). It's dismissed here anyway so that if Playwright's WebKit ever implements
// `-webkit-touch-callout`, a strip does not silently appear above every pinned-height and
// bounding-box assertion in this file.
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";
const SCREEN_LABELS = ["TEMPLATE", "ROCKER", "RAILS", "VOLUME", "FINS", "SUMMARY"];

/** Matches 09-02's own test file's approach: dismiss the sign-in banner via sessionStorage,
 * set before navigation, so its own height never confuses a layout assertion. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

test.describe("phone routes — ROCKER, VOLUME and FINS never scroll sideways", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only shell assertions");
    await dismissSignInBanner(page);
  });

  for (const [path, label] of [
    ["/design/rocker", "ROCKER"],
    ["/design/volume", "VOLUME"],
    ["/design/fins", "FINS"],
  ] as const) {
    test(`${label} (${path}): nothing scrolls sideways and its own tab is marked`, async ({ page }) => {
      await page.goto(path);

      const viewportSize = page.viewportSize();
      if (!viewportSize) throw new Error("no viewport size");
      const scrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
      expect(scrollWidth).toBe(viewportSize.width);

      const tabBar = page.getByRole("navigation", { name: "Screens" });
      await expect(tabBar).toBeVisible();
      const tabs = tabBar.getByRole("link");
      await expect(tabs).toHaveCount(6);
      expect(await tabs.allTextContents()).toEqual(SCREEN_LABELS);

      const ownTab = tabBar.getByRole("link", { name: label });
      await expect(ownTab).toHaveClass(/border-surf-accent/);
    });
  }
});

test.describe("ROCKER on a phone — the board stands up, narrower than full width (D-18)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only ROCKER assertions");
    await dismissSignInBanner(page);
  });

  test("the drawing is pinned above the controls, within the 66dvh ceiling, handles already show, rotate is gone", async ({
    page,
  }) => {
    await page.goto("/design/rocker");

    const drawing = page.locator("main");
    const controls = page.locator("aside");
    await expect(drawing).toBeVisible();
    await expect(controls).toBeVisible();

    const drawingBox = await drawing.boundingBox();
    const controlsBox = await controls.boundingBox();
    if (!drawingBox || !controlsBox) throw new Error("missing bounding box");

    // Stacked: the drawing sits entirely above the controls region.
    expect(drawingBox.y + drawingBox.height).toBeLessThanOrEqual(controlsBox.y + 1);

    // D-18: assert the pinned-area CEILING, not a full-width drawing. A rocker drawing narrower
    // than the viewport is accepted and expected here — only the height ratio is asserted.
    const viewportSize = page.viewportSize();
    if (!viewportSize) throw new Error("no viewport size");
    const heightRatio = drawingBox.height / viewportSize.height;
    expect(heightRatio).toBeLessThanOrEqual(0.68);
    expect(heightRatio).toBeGreaterThanOrEqual(0.4);

    // D-05/D-11: turning the phone does the rotate button's job, so it is absent here.
    await expect(page.getByRole("button", { name: /^Rotate the board/ })).toBeHidden();

    // D-02: the construction overlay (the four curve handles) is on by default on a touch
    // device — present the moment the screen opens, before any tap.
    const dragTargets = page.locator("[data-drag-target]");
    await expect(dragTargets.first()).toBeVisible();
    expect(await dragTargets.count()).toBeGreaterThan(0);
  });
});

test.describe("VOLUME on a phone — one plain scrolling column, nothing pinned", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only VOLUME assertions");
    await dismissSignInBanner(page);
  });

  test("the card and the controls are both in one scroller, card first, reachable by scrolling", async ({
    page,
  }) => {
    await page.goto("/design/volume");

    const card = page.locator("main");
    const controls = page.locator("aside");
    await expect(card).toBeVisible();
    await expect(controls).toBeVisible();

    const cardBox = await card.boundingBox();
    const controlsBox = await controls.boundingBox();
    if (!cardBox || !controlsBox) throw new Error("missing bounding box");

    // Card first, controls beneath it — D-01's one-column reading for a screen with no drawing.
    expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(controlsBox.y + 1);

    // The shared shell root — `main` and `aside`'s own parent — is the one scroller here
    // (`phonePinned="none"`): nothing is pinned, so the whole shell scrolls as a page rather than
    // the controls region scrolling on its own the way a pinned screen's does.
    const shellRoot = card.locator("xpath=..");
    const scroll = await shellRoot.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);

    // The card itself is reachable by scrolling this element to the bottom — not clipped by a
    // pinned area that does not exist on this screen.
    await shellRoot.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await expect(controls).toBeInViewport();
  });
});

test.describe("FINS on a phone — pinned to 55dvh, full-width diagram, toe-aim table intact", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only FINS assertions");
    await dismissSignInBanner(page);
  });

  test("the diagram sits above the controls and spans the width; the toe-aim table still opens", async ({
    page,
  }) => {
    await page.goto("/design/fins");

    const drawing = page.locator("main");
    const controls = page.locator("aside");
    await expect(drawing).toBeVisible();
    await expect(controls).toBeVisible();

    const drawingBox = await drawing.boundingBox();
    const controlsBox = await controls.boundingBox();
    if (!drawingBox || !controlsBox) throw new Error("missing bounding box");
    expect(drawingBox.y + drawingBox.height).toBeLessThanOrEqual(controlsBox.y + 1);

    // FINS keeps the full-width reading — only ROCKER is exempt (D-18).
    const viewportSize = page.viewportSize();
    if (!viewportSize) throw new Error("no viewport size");
    expect(drawingBox.width / viewportSize.width).toBeGreaterThanOrEqual(0.9);

    // RESEARCH.md Pitfall 5: the toe-aim table modal must still open and render — it is passed
    // through the shell's `outsideColumns` slot precisely so a pinned area never clips it. The
    // opening link only shows for a McKee front fin model with the Advanced section expanded, so
    // this is a conditional bonus check, not a hard requirement of every fin setup.
    const advancedToggle = page.getByRole("button", { name: "Advanced" });
    if (await advancedToggle.count()) {
      await advancedToggle.first().click();
      const openToeTable = page.getByRole("button", { name: /aim tables/i });
      if (await openToeTable.count()) {
        await openToeTable.first().click();
        await expect(page.getByRole("dialog")).toBeVisible();
      }
    }
  });
});

test.describe("desktop — ROCKER, VOLUME and FINS keep the sidebar-beside-canvas shell", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only shell assertions");
    await dismissSignInBanner(page);
  });

  for (const path of ["/design/rocker", "/design/volume", "/design/fins"] as const) {
    test(`${path}: the sidebar sits left of the canvas and the phone tab bar is hidden`, async ({ page }) => {
      await page.goto(path);

      const sidebar = page.locator("aside");
      const canvas = page.locator("main");
      await expect(sidebar).toBeVisible();
      await expect(canvas).toBeVisible();

      const sidebarBox = await sidebar.boundingBox();
      const canvasBox = await canvas.boundingBox();
      if (!sidebarBox || !canvasBox) throw new Error("missing bounding box");
      expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(canvasBox.x + 1);

      await expect(page.getByRole("navigation", { name: "Screens" })).toBeHidden();
    });
  }
});
