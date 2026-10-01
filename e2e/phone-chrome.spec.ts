import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Phase 13 item 9e (13-SPEC.md, the founder, 2026-09-30): "Phone real estate is expensive, we
 * need to save all of it" and "minimize all horizontal space on both phone orientations" —
 * clarified as every band and gutter of chrome around a design screen's drawing, in both
 * directions, upright and sideways, with thumb-sized tap targets (44 CSS px) as the only floor.
 * A computer is untouched.
 *
 * Two switches carry the new rules, and this file proves both stay the ones CLAUDE.md's Layout
 * section already names — never a third: `max-shell:` (width alone) for an upright phone,
 * `[@media(max-height:500px)]:` (height alone) for a phone held sideways, both carrying the SAME
 * values except the one place they deliberately differ (the sideways bottom clearance for the
 * floating Undo/Redo pair). `coarse:` (pointer alone) adds a 44px touch box to every tappable
 * tab, reaching only into frame a phone no longer wastes — never changing what a mouse or an
 * iPad-sized touch screen draws.
 *
 * Before this plan (measured by the planner on item 9d's merged base, Playwright WebKit/Chromium,
 * real phone sizes, "Drawing area" meaning the space the drawing is fitted into):
 *
 * | Phone | Screen | Top bar | Frame above | Frame below | Sides | Drawing area h x w |
 * |---|---|---|---|---|---|---|
 * | 390x844 | ROCKER | 56 | 25 | 34 | 34/34 | 460x322 |
 * | 412x915 | ROCKER | 56 | 25 | 34 | 34/34 | 507x344 |
 * | 844x390 | ROCKER | 56 | 25 | 38 | 38/38 | 229x416 |
 * | 863x360 | ROCKER | 56 | 25 | 38 | 38/38 | 199x426 |
 *
 * After this task: upright, the frame above a tabbed screen's drawing is 11, below and at the
 * sides 5; sideways, the frame above is 11 and the column's own bottom padding is 61 (so the
 * drawing stays 64 clear of the floating Undo/Redo pair in the desktop shell a sideways phone
 * lands in). Every tappable tab answers a 44px touch band. The top bar itself (still 56 here —
 * Task 3 makes it 48) is proved separately by `e2e/phone-sideways-top-bar.spec.ts`.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissChrome(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** `page.goto`, retried: real WebKit's dev server occasionally pushes a background Fast Refresh
 * full reload right after a first paint, which can interrupt a `page.goto` that follows soon
 * after — the same WebKit-only dev-server quirk `e2e/phone-sideways-top-bar.spec.ts`'s own
 * `gotoRoute` helper documents and routes around. */
async function gotoRoute(page: Page, route: string) {
  await expect(async () => {
    await page.goto(route);
  }).toPass({ timeout: 15_000 });
}

async function waitForReactOwnedMain(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector("main");
    return !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
  });
}

/** React-owned, then two animation frames, then polls `main`'s own box until two consecutive
 * reads agree — guards the rare extra layout pass a `ResizeObserver`-driven fit (RAILS' plot
 * solver) can still have queued after the two rAFs alone. */
async function settle(page: Page) {
  await waitForReactOwnedMain(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  let previous: string | null = null;
  await expect(async () => {
    const box = await page.locator("main").boundingBox();
    const current = box ? `${box.x}|${box.y}|${box.width}|${box.height}` : "none";
    const matched = current === previous;
    previous = current;
    if (!matched) throw new Error("still settling");
  }).toPass({ timeout: 5_000, intervals: [100] });
}

/** Playwright's own `toBeCloseTo` takes a count of DECIMAL PLACES, not a pixel tolerance — wrong
 * for this file's "plus or minus 1 CSS px" measurements. This asserts the plain pixel delta the
 * plan's own prose uses throughout. */
function expectWithin(actual: number, expected: number, delta = 1) {
  expect(Math.abs(actual - expected), `expected ${actual} to be within ${delta} of ${expected}`).toBeLessThanOrEqual(
    delta,
  );
}

async function mainPadding(page: Page) {
  return page.locator("main").evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      top: parseFloat(cs.paddingTop),
      right: parseFloat(cs.paddingRight),
      bottom: parseFloat(cs.paddingBottom),
      left: parseFloat(cs.paddingLeft),
    };
  });
}

/** The inside of `[data-viewer-panel]` — its own box minus border and padding — which is "the
 * drawing area": the space the drawing (or a text page) is actually fitted into. */
async function contentBox(page: Page) {
  return page.locator("[data-viewer-panel]").evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const bl = parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
    const br = parseFloat(cs.borderRightWidth) + parseFloat(cs.paddingRight);
    const bt = parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop);
    const bb = parseFloat(cs.borderBottomWidth) + parseFloat(cs.paddingBottom);
    return { x: rect.x + bl, y: rect.y + bt, width: rect.width - bl - br, height: rect.height - bt - bb };
  });
}

async function topBarBox(page: Page) {
  return page.getByRole("banner").boundingBox();
}

/** `touchBox`'s own proof (P-3): the tab's computed `::after` height is 44px; a point `reach`
 * dots above the tab's top and `reach` below its bottom lands on the tab (or inside it); a point
 * 1 dot above the top bar's own bottom edge does not (the top bar keeps its own dots); a point 1
 * dot inside the drawing area's top does not (the drawing keeps its own). `reach` defaults to 10,
 * the phone case; the iPad-like tall touch screen uses 5 (the box reaches 7 dots in there, per
 * P-3, so 5 is comfortably inside it without asserting the exact theoretical reach). */
async function assertTabTouchBox(
  tab: Locator,
  bounds: { topBarBottom: number; drawingTop: number },
  reach = 10,
) {
  await expect(tab).toBeVisible();
  const afterHeight = await tab.evaluate((el) => parseFloat(getComputedStyle(el, "::after").height));
  expectWithin(afterHeight, 44, 0.5);

  const outcome = await tab.evaluate(
    (el, args) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const hits = (y: number) => {
        const hit = document.elementFromPoint(cx, y);
        return !!hit && (hit === el || el.contains(hit));
      };
      return {
        above: hits(rect.top - args.reach),
        below: hits(rect.bottom + args.reach),
        aboveTopBar: hits(args.topBarBottom - 1),
        intoDrawing: hits(args.drawingTop + 1),
      };
    },
    { reach, topBarBottom: bounds.topBarBottom, drawingTop: bounds.drawingTop },
  );
  expect(outcome.above, `touch box should reach ${reach}px above the tab`).toBe(true);
  expect(outcome.below, `touch box should reach ${reach}px below the tab`).toBe(true);
  expect(outcome.aboveTopBar, "touch box must not reach 1px above the top bar's bottom edge").toBe(false);
  expect(outcome.intoDrawing, "touch box must not reach 1px into the drawing area").toBe(false);
}

async function assertNoTouchBox(tab: Locator) {
  const content = await tab.evaluate((el) => getComputedStyle(el, "::after").content);
  expect(content).toBe("none");
}

/** The real sideways iPhone width (844 CSS px) and the Pixel 7's own 863x360 — set explicitly
 * with `page.setViewportSize` rather than a device descriptor, matching this plan's own
 * measurements and `e2e/phone-sideways-top-bar.spec.ts`'s approach. */
const IPHONE_UPRIGHT = { width: 390, height: 844 };
const IPHONE_SIDEWAYS = { width: 844, height: 390 };
const ANDROID_UPRIGHT = { width: 412, height: 915 };
const ANDROID_SIDEWAYS = { width: 863, height: 360 };

test.describe("ROCKER — the slimmer phone frame and the 44px touch box (item 9e, quick 260930-s23)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "this describe's own upright/sideways sizes are phone-only");
    await dismissChrome(page);
  });

  test("iphone upright (390x844): frame, tab height, drawing area and touch boxes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "iphone-only viewport");
    await page.setViewportSize(IPHONE_UPRIGHT);
    await gotoRoute(page, "/design/rocker");
    await settle(page);

    const padding = await mainPadding(page);
    expectWithin(padding.top, 2, 0.5);
    expectWithin(padding.right, 2, 0.5);
    expectWithin(padding.bottom, 2, 0.5);
    expectWithin(padding.left, 2, 0.5);

    const topBar = await topBarBox(page);
    const main = await page.locator("main").boundingBox();
    const viewerTab = page.getByRole("tab", { name: "VIEWER" });
    const datasheetTab = page.getByRole("tab", { name: "DATASHEET" });
    const viewerBox = await viewerTab.boundingBox();
    const content = await contentBox(page);
    if (!topBar || !main || !viewerBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] ROCKER 390x844 upright — top bar ${topBar.height}, tab top ${viewerBox.y - (topBar.y + topBar.height)}, ` +
        `tab height ${viewerBox.height}, drawing area ${content.width}x${content.height} at (${content.x},${content.y})`,
    );

    expectWithin(viewerBox.y - (topBar.y + topBar.height), 11, 1);
    expectWithin(viewerBox.height, 22, 1);
    expectWithin(content.y - (viewerBox.y + viewerBox.height), 11, 1);
    expectWithin(main.y + main.height - (content.y + content.height), 5, 1);
    expectWithin(content.x - main.x, 5, 1);
    expectWithin(main.x + main.width - (content.x + content.width), 5, 1);

    // Growth floors (today 460x322).
    expect(content.height).toBeGreaterThanOrEqual(500);
    expect(content.width).toBeGreaterThanOrEqual(375);

    const bounds = { topBarBottom: topBar.y + topBar.height, drawingTop: content.y };
    await assertTabTouchBox(viewerTab, bounds);
    await assertTabTouchBox(datasheetTab, bounds);

    // DATASHEET keeps an 8px reading margin.
    await datasheetTab.click();
    await expect(page.locator("[data-viewer-panel]")).toHaveCSS("padding-left", "8px");
    await expect(page.locator("[data-viewer-panel]")).toHaveCSS("padding-top", "9px");

    // Nothing scrolls sideways.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(IPHONE_UPRIGHT.width);
  });

  test("android upright (412x915): frame, tab height, drawing area and touch boxes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "android-only viewport");
    await page.setViewportSize(ANDROID_UPRIGHT);
    await gotoRoute(page, "/design/rocker");
    await settle(page);

    const padding = await mainPadding(page);
    expectWithin(padding.top, 2, 0.5);
    expectWithin(padding.right, 2, 0.5);
    expectWithin(padding.bottom, 2, 0.5);
    expectWithin(padding.left, 2, 0.5);

    const topBar = await topBarBox(page);
    const main = await page.locator("main").boundingBox();
    const viewerTab = page.getByRole("tab", { name: "VIEWER" });
    const datasheetTab = page.getByRole("tab", { name: "DATASHEET" });
    const viewerBox = await viewerTab.boundingBox();
    const content = await contentBox(page);
    if (!topBar || !main || !viewerBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] ROCKER 412x915 upright — top bar ${topBar.height}, tab top ${viewerBox.y - (topBar.y + topBar.height)}, ` +
        `tab height ${viewerBox.height}, drawing area ${content.width}x${content.height} at (${content.x},${content.y})`,
    );

    expectWithin(viewerBox.y - (topBar.y + topBar.height), 11, 1);
    expectWithin(viewerBox.height, 22, 1);
    expectWithin(content.y - (viewerBox.y + viewerBox.height), 11, 1);
    expectWithin(main.y + main.height - (content.y + content.height), 5, 1);
    expectWithin(content.x - main.x, 5, 1);
    expectWithin(main.x + main.width - (content.x + content.width), 5, 1);

    // Growth floors (today 507x344).
    expect(content.height).toBeGreaterThanOrEqual(545);
    expect(content.width).toBeGreaterThanOrEqual(397);

    const bounds = { topBarBottom: topBar.y + topBar.height, drawingTop: content.y };
    await assertTabTouchBox(viewerTab, bounds);
    await assertTabTouchBox(datasheetTab, bounds);

    await datasheetTab.click();
    await expect(page.locator("[data-viewer-panel]")).toHaveCSS("padding-left", "8px");
    await expect(page.locator("[data-viewer-panel]")).toHaveCSS("padding-top", "9px");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(ANDROID_UPRIGHT.width);
  });

  test("iphone sideways (844x390): frame, drawing width, touch boxes and the Undo/Redo clearance", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "iphone-only viewport");
    await page.setViewportSize(IPHONE_SIDEWAYS);
    await gotoRoute(page, "/design/rocker");
    await settle(page);

    const paddingBottom = await page
      .locator("main")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    expectWithin(paddingBottom, 61, 0.5);

    const topBar = await topBarBox(page);
    const viewerTab = page.getByRole("tab", { name: "VIEWER" });
    const datasheetTab = page.getByRole("tab", { name: "DATASHEET" });
    const viewerBox = await viewerTab.boundingBox();
    const content = await contentBox(page);
    if (!topBar || !viewerBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] ROCKER 844x390 sideways — main padding-bottom ${paddingBottom}, drawing area ${content.width}x${content.height}, ` +
        `drawing bottom clearance to window bottom ${IPHONE_SIDEWAYS.height - (content.y + content.height)}`,
    );

    expectWithin(viewerBox.y - (topBar.y + topBar.height), 11, 1);
    // Growth floor (today 416 wide).
    expect(content.width).toBeGreaterThanOrEqual(478);
    expectWithin(IPHONE_SIDEWAYS.height - (content.y + content.height), 64, 1);

    const bounds = { topBarBottom: topBar.y + topBar.height, drawingTop: content.y };
    await assertTabTouchBox(viewerTab, bounds);
    await assertTabTouchBox(datasheetTab, bounds);

    // The Undo/Redo pair stays clear of the drawing once there is something to take back.
    const slider = page.locator("aside [data-slot='slider-thumb'] input[type='range']").first();
    await expect
      .poll(() => slider.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactFiber"))))
      .toBe(true);
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    const pair = page.locator("[data-phone-undo-bar]");
    await expect(pair).toBeVisible();
    const pairBox = await pair.boundingBox();
    if (!pairBox) throw new Error("undo/redo pair has no bounding box");
    expect(pairBox.y).toBeGreaterThanOrEqual(content.y + content.height + 3);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(IPHONE_SIDEWAYS.width);
  });

  test("android sideways (863x360): frame, drawing width and touch boxes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "android-only viewport");
    await page.setViewportSize(ANDROID_SIDEWAYS);
    await gotoRoute(page, "/design/rocker");
    await settle(page);

    const paddingBottom = await page
      .locator("main")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    expectWithin(paddingBottom, 61, 0.5);

    const topBar = await topBarBox(page);
    const viewerTab = page.getByRole("tab", { name: "VIEWER" });
    const datasheetTab = page.getByRole("tab", { name: "DATASHEET" });
    const viewerBox = await viewerTab.boundingBox();
    const content = await contentBox(page);
    if (!topBar || !viewerBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] ROCKER 863x360 sideways — main padding-bottom ${paddingBottom}, drawing area ${content.width}x${content.height}, ` +
        `drawing bottom clearance to window bottom ${ANDROID_SIDEWAYS.height - (content.y + content.height)}`,
    );

    expectWithin(viewerBox.y - (topBar.y + topBar.height), 11, 1);
    // Growth floor (today 426 wide).
    expect(content.width).toBeGreaterThanOrEqual(488);
    expectWithin(ANDROID_SIDEWAYS.height - (content.y + content.height), 64, 1);

    const bounds = { topBarBottom: topBar.y + topBar.height, drawingTop: content.y };
    await assertTabTouchBox(viewerTab, bounds);
    await assertTabTouchBox(datasheetTab, bounds);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(ANDROID_SIDEWAYS.width);
  });
});

test.describe("ROCKER — a tall touch screen (iPad-like) keeps today's look (item 9e)", () => {
  test("1180x820, a touch device, desktop shell: today's 12px frames and 30px tabs, touch box still reaches", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "a touch pointer is required (WebKit project)");
    await dismissChrome(page);
    await page.setViewportSize({ width: 1180, height: 820 });
    await gotoRoute(page, "/design/rocker");
    await settle(page);

    const padding = await mainPadding(page);
    expectWithin(padding.top, 12, 0.5);

    await expect(page.getByRole("banner")).toHaveCount(0); // the desktop row shows, not the phone bar, at this width.

    const viewerTab = page.getByRole("tab", { name: "VIEWER" });
    const datasheetTab = page.getByRole("tab", { name: "DATASHEET" });
    const viewerBox = await viewerTab.boundingBox();
    if (!viewerBox) throw new Error("VIEWER tab has no bounding box");
    expectWithin(viewerBox.height, 30, 1);

    const panel = page.locator("[data-viewer-panel]");
    await expect(panel).toHaveCSS("padding", "12px");
    await expect(panel).toHaveCSS("border-width", "1px");

    const content = await contentBox(page);
    const bounds = { topBarBottom: 0, drawingTop: content.y };
    await assertTabTouchBox(viewerTab, bounds, 5);
    await assertTabTouchBox(datasheetTab, bounds, 5);
  });
});

test.describe("ROCKER — a computer is untouched (item 9e)", () => {
  for (const size of [
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
    { width: 820, height: 800 },
  ]) {
    test(`${size.width}x${size.height}: today's 12px frames, 30px tabs, no touch box on a mouse`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "mouse-only sizes");
      await dismissChrome(page);
      await page.setViewportSize(size);
      await gotoRoute(page, "/design/rocker");
      await settle(page);

      const padding = await mainPadding(page);
      expectWithin(padding.top, 12, 0.5);
      expectWithin(padding.right, 12, 0.5);
      expectWithin(padding.bottom, 12, 0.5);
      expectWithin(padding.left, 12, 0.5);

      const viewerTab = page.getByRole("tab", { name: "VIEWER" });
      const datasheetTab = page.getByRole("tab", { name: "DATASHEET" });
      const viewerBox = await viewerTab.boundingBox();
      if (!viewerBox) throw new Error("VIEWER tab has no bounding box");
      expectWithin(viewerBox.height, 30, 1);

      const panel = page.locator("[data-viewer-panel]");
      await expect(panel).toHaveCSS("padding", "12px");
      await expect(panel).toHaveCSS("border-width", "1px");

      await assertNoTouchBox(viewerTab);
      await assertNoTouchBox(datasheetTab);
    });
  }
});
