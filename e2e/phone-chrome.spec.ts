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
 * | 390x844 | TEMPLATE | 56 | 25 | 34 | 34/34 | 461x322 |
 * | 390x844 | ROCKER | 56 | 25 | 34 | 34/34 | 460x322 |
 * | 390x844 | RAILS | 56 | 25 | 34 | 34/34 | 325x322 |
 * | 390x844 | VOLUME (text) | 56 | 25 | 34 | 34/34 | 388x322 |
 * | 390x844 | FINS | 56 | 25 | 34 | 34/34 | 367x322 |
 * | 412x915 | TEMPLATE | 56 | 25 | 34 | 34/34 | 508x344 |
 * | 412x915 | ROCKER | 56 | 25 | 34 | 34/34 | 507x344 |
 * | 412x915 | RAILS | 56 | 25 | 34 | 34/34 | 361x344 |
 * | 412x915 | VOLUME (text) | 56 | 25 | 34 | 34/34 | 388x344 |
 * | 412x915 | FINS | 56 | 25 | 34 | 34/34 | 406x344 |
 * | 844x390 | TEMPLATE | 56 | 25 | 38 | 38/38 | 230x416 |
 * | 844x390 | ROCKER | 56 | 25 | 38 | 38/38 | 229x416 |
 * | 844x390 | RAILS | 56 | 25 | scrolls | 38/38 | plots 416 wide |
 * | 844x390 | VOLUME (text) | 56 | 25 | 38 | 38/38 | 230x416 |
 * | 844x390 | FINS | 56 | 25 | 38 | 38/38 | 229x416 |
 * | 863x360 | TEMPLATE | 56 | 25 | 38 | 38/38 | 200x426 |
 * | 863x360 | ROCKER | 56 | 25 | 38 | 38/38 | 199x426 |
 * | 863x360 | RAILS | 56 | 25 | scrolls | 38/38 | plots 426 wide |
 * | 863x360 | VOLUME (text) | 56 | 25 | 38 | 38/38 | 200x426 |
 * | 863x360 | FINS | 56 | 25 | 38 | 38/38 | 199x426 |
 *
 * After this task: upright, the frame above a tabbed (`drawing`) screen is 11, below and at the
 * sides 5; a labelled (non-interactive) screen's own frame above is 2 (TEMPLATE) or 10 (VOLUME,
 * `text`); `text` screens keep an 8px reading margin, which is why VOLUME's own sides/below read
 * 13, not 5. Sideways, the frame above a tabbed screen is still 11 and the bottom is the same 5
 * (`text`, VOLUME: 13) — the plan first kept a 64-dot band there so the floating Undo/Redo pair
 * never covered a chip; the founder chose its Alternative A (2026-09-30), every dot to the drawing
 * and the pair floating over the drawing's bottom-right corner once there is an edit to take back.
 * RAILS sideways SCROLLS instead of a fixed clearance (260914-v2v), so only its own
 * `padding-bottom: 2px` is asserted there. Every tappable tab answers a 44px touch band — on
 * RAILS, upright, TWO stacked rows of them (the outer VIEWER/DATA/INSTRUCTIONS strip and the
 * phone-only NOSE/CENTER/TAIL switch inside VIEWER), each boxed to 11px of clearance so neither
 * ever reaches the other. The top bar itself was 56 before this plan; Task 3 (P-7) makes it 48,
 * with Save and the menu button keeping their full 44px — asserted in its own describe block
 * below on all four phone sizes, and proved sideways in more detail by
 * `e2e/phone-sideways-top-bar.spec.ts`.
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

/** A lighter touch-box check for RAILS's own second (nested) NOSE/CENTER/TAIL row (P-9): the
 * `::after` height and the 10px-reach probes, without the generic `assertTabTouchBox`'s
 * top-bar/drawing boundary checks, which don't apply the same way to a SECOND stacked tab row —
 * that row's own boundary is the outer VIEWER/DATA/INSTRUCTIONS strip, proved separately by
 * `assertNotHitAbove`/`assertNotHitBelow` below. */
async function assertBasicTouchBox(tab: Locator, reach = 10) {
  await expect(tab).toBeVisible();
  const afterHeight = await tab.evaluate((el) => parseFloat(getComputedStyle(el, "::after").height));
  expectWithin(afterHeight, 44, 0.5);
  const outcome = await tab.evaluate(
    (el, r) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const hits = (y: number) => {
        const hit = document.elementFromPoint(cx, y);
        return !!hit && (hit === el || el.contains(hit));
      };
      return { above: hits(rect.top - r), below: hits(rect.bottom + r) };
    },
    reach,
  );
  expect(outcome.above, `touch box should reach ${reach}px above the tab`).toBe(true);
  expect(outcome.below, `touch box should reach ${reach}px below the tab`).toBe(true);
}

/** P-9's own overlap proof: a point `reach + 1` dots above a tab's own top (just past where its
 * touch box should stop) must land on something else, never the tab itself — and the mirrored
 * check `reach + 1` dots below. Used to prove RAILS's two stacked tappable rows (the outer
 * VIEWER/DATA/INSTRUCTIONS strip and the phone-only NOSE/CENTER/TAIL switch beneath it) never
 * reach into one another. */
async function assertNotHitAbove(tab: Locator, reach: number): Promise<boolean> {
  return tab.evaluate((el, r) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const y = rect.top - r - 1;
    const hit = document.elementFromPoint(cx, y);
    return !!hit && (hit === el || el.contains(hit));
  }, reach);
}

async function assertNotHitBelow(tab: Locator, reach: number): Promise<boolean> {
  return tab.evaluate((el, r) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const y = rect.bottom + r + 1;
    const hit = document.elementFromPoint(cx, y);
    return !!hit && (hit === el || el.contains(hit));
  }, reach);
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

  test("iphone sideways (844x390): frame, drawing width, touch boxes and the Undo/Redo pair over the corner", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "iphone-only viewport");
    await page.setViewportSize(IPHONE_SIDEWAYS);
    await gotoRoute(page, "/design/rocker");
    await settle(page);

    const paddingBottom = await page
      .locator("main")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    expectWithin(paddingBottom, 2, 0.5);

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
    expectWithin(IPHONE_SIDEWAYS.height - (content.y + content.height), 5, 1);

    const bounds = { topBarBottom: topBar.y + topBar.height, drawingTop: content.y };
    await assertTabTouchBox(viewerTab, bounds);
    await assertTabTouchBox(datasheetTab, bounds);

    // The Undo/Redo pair appears once there is something to take back (Alternative A: over the corner).
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
    // Alternative A (the founder, 2026-09-30): the pair floats over the drawing's bottom-right
    // corner — on screen, inside the window, and overlapping the drawing area rather than below it.
    expect(pairBox.y + pairBox.height).toBeLessThanOrEqual(IPHONE_SIDEWAYS.height);
    expect(pairBox.y).toBeLessThan(content.y + content.height);

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
    expectWithin(paddingBottom, 2, 0.5);

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
    expectWithin(ANDROID_SIDEWAYS.height - (content.y + content.height), 5, 1);

    const bounds = { topBarBottom: topBar.y + topBar.height, drawingTop: content.y };
    await assertTabTouchBox(viewerTab, bounds);
    await assertTabTouchBox(datasheetTab, bounds);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(ANDROID_SIDEWAYS.width);
  });
});

test.describe("TEMPLATE — the slimmer phone frame, a label not a button (item 9e, quick 260930-s23)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "this describe's own upright/sideways sizes are phone-only");
    await dismissChrome(page);
  });

  function label(page: Page) {
    return page.locator("main > div").first().locator("span").filter({ hasText: "VIEWER" });
  }

  test("iphone upright (390x844): label frame and drawing area", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "iphone-only viewport");
    await page.setViewportSize(IPHONE_UPRIGHT);
    await gotoRoute(page, "/design/outline");
    await settle(page);

    const padding = await mainPadding(page);
    expectWithin(padding.top, 2, 0.5);
    expectWithin(padding.right, 2, 0.5);
    expectWithin(padding.bottom, 2, 0.5);
    expectWithin(padding.left, 2, 0.5);

    const topBar = await topBarBox(page);
    const main = await page.locator("main").boundingBox();
    const labelBox = await label(page).boundingBox();
    const content = await contentBox(page);
    if (!topBar || !main || !labelBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] TEMPLATE 390x844 upright — label top ${labelBox.y - (topBar.y + topBar.height)}, ` +
        `label height ${labelBox.height}, drawing area ${content.width}x${content.height} at (${content.x},${content.y})`,
    );

    expectWithin(labelBox.y - (topBar.y + topBar.height), 2, 1);
    expect(labelBox.height).toBeGreaterThanOrEqual(20);
    expect(labelBox.height).toBeLessThanOrEqual(23);
    expectWithin(content.y - (labelBox.y + labelBox.height), 2, 1);
    expectWithin(main.y + main.height - (content.y + content.height), 5, 1);
    expectWithin(content.x - main.x, 5, 1);
    expectWithin(main.x + main.width - (content.x + content.width), 5, 1);

    // Growth floors (today 461x322).
    expect(content.height).toBeGreaterThanOrEqual(501);
    expect(content.width).toBeGreaterThanOrEqual(372);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(IPHONE_UPRIGHT.width);
  });

  test("android upright (412x915): label frame and drawing area", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "android-only viewport");
    await page.setViewportSize(ANDROID_UPRIGHT);
    await gotoRoute(page, "/design/outline");
    await settle(page);

    const padding = await mainPadding(page);
    expectWithin(padding.top, 2, 0.5);
    expectWithin(padding.right, 2, 0.5);
    expectWithin(padding.bottom, 2, 0.5);
    expectWithin(padding.left, 2, 0.5);

    const topBar = await topBarBox(page);
    const main = await page.locator("main").boundingBox();
    const labelBox = await label(page).boundingBox();
    const content = await contentBox(page);
    if (!topBar || !main || !labelBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] TEMPLATE 412x915 upright — label top ${labelBox.y - (topBar.y + topBar.height)}, ` +
        `label height ${labelBox.height}, drawing area ${content.width}x${content.height} at (${content.x},${content.y})`,
    );

    expectWithin(labelBox.y - (topBar.y + topBar.height), 2, 1);
    expect(labelBox.height).toBeGreaterThanOrEqual(20);
    expect(labelBox.height).toBeLessThanOrEqual(23);
    expectWithin(content.y - (labelBox.y + labelBox.height), 2, 1);
    expectWithin(main.y + main.height - (content.y + content.height), 5, 1);
    expectWithin(content.x - main.x, 5, 1);
    expectWithin(main.x + main.width - (content.x + content.width), 5, 1);

    // Growth floors (today 508x344).
    expect(content.height).toBeGreaterThanOrEqual(548);
    expect(content.width).toBeGreaterThanOrEqual(394);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(ANDROID_UPRIGHT.width);
  });

  test("iphone sideways (844x390): label frame, drawing width and the Undo/Redo pair over the corner", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "iphone-only viewport");
    await page.setViewportSize(IPHONE_SIDEWAYS);
    await gotoRoute(page, "/design/outline");
    await settle(page);

    const paddingBottom = await page
      .locator("main")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    expectWithin(paddingBottom, 2, 0.5);

    const topBar = await topBarBox(page);
    const labelBox = await label(page).boundingBox();
    const content = await contentBox(page);
    if (!topBar || !labelBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] TEMPLATE 844x390 sideways — main padding-bottom ${paddingBottom}, drawing area ${content.width}x${content.height}, ` +
        `drawing bottom clearance to window bottom ${IPHONE_SIDEWAYS.height - (content.y + content.height)}`,
    );

    expectWithin(labelBox.y - (topBar.y + topBar.height), 2, 1);
    // Growth floor (today 416 wide).
    expect(content.width).toBeGreaterThanOrEqual(466);
    expectWithin(IPHONE_SIDEWAYS.height - (content.y + content.height), 5, 1);

    // TEMPLATE sideways repeats the Undo/Redo check: under Alternative A the pair floats over the
    // drawing's corner on every drawing screen, not only ROCKER's.
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
    // Alternative A (the founder, 2026-09-30): the pair floats over the drawing's bottom-right
    // corner — on screen, inside the window, and overlapping the drawing area rather than below it.
    expect(pairBox.y + pairBox.height).toBeLessThanOrEqual(IPHONE_SIDEWAYS.height);
    expect(pairBox.y).toBeLessThan(content.y + content.height);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(IPHONE_SIDEWAYS.width);
  });

  test("android sideways (863x360): label frame and drawing width", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "android-only viewport");
    await page.setViewportSize(ANDROID_SIDEWAYS);
    await gotoRoute(page, "/design/outline");
    await settle(page);

    const paddingBottom = await page
      .locator("main")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    expectWithin(paddingBottom, 2, 0.5);

    const topBar = await topBarBox(page);
    const labelBox = await label(page).boundingBox();
    const content = await contentBox(page);
    if (!topBar || !labelBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] TEMPLATE 863x360 sideways — main padding-bottom ${paddingBottom}, drawing area ${content.width}x${content.height}, ` +
        `drawing bottom clearance to window bottom ${ANDROID_SIDEWAYS.height - (content.y + content.height)}`,
    );

    expectWithin(labelBox.y - (topBar.y + topBar.height), 2, 1);
    // Growth floor (today 426 wide).
    expect(content.width).toBeGreaterThanOrEqual(476);
    expectWithin(ANDROID_SIDEWAYS.height - (content.y + content.height), 5, 1);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(ANDROID_SIDEWAYS.width);
  });
});

test.describe("VOLUME — the slimmer phone frame, a label and an 8px reading margin (item 9e)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "this describe's own upright/sideways sizes are phone-only");
    await dismissChrome(page);
  });

  function label(page: Page) {
    return page.locator("main > div").first().locator("span").filter({ hasText: "ESTIMATE" });
  }

  test("iphone upright (390x844): label frame and the 13px text margin", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "iphone-only viewport");
    await page.setViewportSize(IPHONE_UPRIGHT);
    await gotoRoute(page, "/design/volume");
    await settle(page);

    const padding = await mainPadding(page);
    expectWithin(padding.top, 2, 0.5);
    expectWithin(padding.right, 2, 0.5);
    expectWithin(padding.bottom, 2, 0.5);
    expectWithin(padding.left, 2, 0.5);

    const topBar = await topBarBox(page);
    const main = await page.locator("main").boundingBox();
    const labelBox = await label(page).boundingBox();
    const content = await contentBox(page);
    if (!topBar || !main || !labelBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] VOLUME 390x844 upright — label top ${labelBox.y - (topBar.y + topBar.height)}, ` +
        `label height ${labelBox.height}, drawing area ${content.width}x${content.height} at (${content.x},${content.y})`,
    );

    expectWithin(labelBox.y - (topBar.y + topBar.height), 2, 1);
    expect(labelBox.height).toBeGreaterThanOrEqual(20);
    expect(labelBox.height).toBeLessThanOrEqual(23);
    expectWithin(content.y - (labelBox.y + labelBox.height), 10, 1);
    expectWithin(main.y + main.height - (content.y + content.height), 13, 1);
    expectWithin(content.x - main.x, 13, 1);
    expectWithin(main.x + main.width - (content.x + content.width), 13, 1);

    // Growth floor, width only (today 322 wide; the card's own content reflow can shrink its
    // height, per the plan's own measured table — height is not a reliable growth signal here).
    expect(content.width).toBeGreaterThanOrEqual(362);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(IPHONE_UPRIGHT.width);
  });

  test("android upright (412x915): label frame and the 13px text margin", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "android-only viewport");
    await page.setViewportSize(ANDROID_UPRIGHT);
    await gotoRoute(page, "/design/volume");
    await settle(page);

    const padding = await mainPadding(page);
    expectWithin(padding.top, 2, 0.5);
    expectWithin(padding.right, 2, 0.5);
    expectWithin(padding.bottom, 2, 0.5);
    expectWithin(padding.left, 2, 0.5);

    const topBar = await topBarBox(page);
    const main = await page.locator("main").boundingBox();
    const labelBox = await label(page).boundingBox();
    const content = await contentBox(page);
    if (!topBar || !main || !labelBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] VOLUME 412x915 upright — label top ${labelBox.y - (topBar.y + topBar.height)}, ` +
        `label height ${labelBox.height}, drawing area ${content.width}x${content.height} at (${content.x},${content.y})`,
    );

    expectWithin(labelBox.y - (topBar.y + topBar.height), 2, 1);
    expect(labelBox.height).toBeGreaterThanOrEqual(20);
    expect(labelBox.height).toBeLessThanOrEqual(23);
    expectWithin(content.y - (labelBox.y + labelBox.height), 10, 1);
    expectWithin(main.y + main.height - (content.y + content.height), 13, 1);
    expectWithin(content.x - main.x, 13, 1);
    expectWithin(main.x + main.width - (content.x + content.width), 13, 1);

    expect(content.width).toBeGreaterThanOrEqual(384);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(ANDROID_UPRIGHT.width);
  });

  test("iphone sideways (844x390): label frame and the 13px sideways bottom", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "iphone-only viewport");
    await page.setViewportSize(IPHONE_SIDEWAYS);
    await gotoRoute(page, "/design/volume");
    await settle(page);

    const paddingBottom = await page
      .locator("main")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    expectWithin(paddingBottom, 2, 0.5);

    const topBar = await topBarBox(page);
    const labelBox = await label(page).boundingBox();
    const content = await contentBox(page);
    if (!topBar || !labelBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] VOLUME 844x390 sideways — main padding-bottom ${paddingBottom}, drawing area ${content.width}x${content.height}, ` +
        `clearance to window bottom ${IPHONE_SIDEWAYS.height - (content.y + content.height)}`,
    );

    expectWithin(labelBox.y - (topBar.y + topBar.height), 2, 1);
    expect(content.width).toBeGreaterThanOrEqual(456);
    // VOLUME is `text`: the same 2px bottom padding plus its own 8px reading margin is 13, not
    // the drawing screens' 5.
    expectWithin(IPHONE_SIDEWAYS.height - (content.y + content.height), 13, 1);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(IPHONE_SIDEWAYS.width);
  });

  test("android sideways (863x360): label frame and the 13px sideways bottom", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "android-only viewport");
    await page.setViewportSize(ANDROID_SIDEWAYS);
    await gotoRoute(page, "/design/volume");
    await settle(page);

    const paddingBottom = await page
      .locator("main")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    expectWithin(paddingBottom, 2, 0.5);

    const topBar = await topBarBox(page);
    const labelBox = await label(page).boundingBox();
    const content = await contentBox(page);
    if (!topBar || !labelBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] VOLUME 863x360 sideways — main padding-bottom ${paddingBottom}, drawing area ${content.width}x${content.height}, ` +
        `clearance to window bottom ${ANDROID_SIDEWAYS.height - (content.y + content.height)}`,
    );

    expectWithin(labelBox.y - (topBar.y + topBar.height), 2, 1);
    expect(content.width).toBeGreaterThanOrEqual(466);
    expectWithin(ANDROID_SIDEWAYS.height - (content.y + content.height), 13, 1);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(ANDROID_SIDEWAYS.width);
  });
});

test.describe("FINS — the slimmer phone frame and the 44px touch box across three tabs (item 9e)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "this describe's own upright/sideways sizes are phone-only");
    await dismissChrome(page);
  });

  test("iphone upright (390x844): frame, tab height, drawing area and touch boxes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "iphone-only viewport");
    await page.setViewportSize(IPHONE_UPRIGHT);
    await gotoRoute(page, "/design/fins");
    await settle(page);

    const padding = await mainPadding(page);
    expectWithin(padding.top, 2, 0.5);
    expectWithin(padding.right, 2, 0.5);
    expectWithin(padding.bottom, 2, 0.5);
    expectWithin(padding.left, 2, 0.5);

    const topBar = await topBarBox(page);
    const main = await page.locator("main").boundingBox();
    const viewerTab = page.getByRole("tab", { name: "VIEWER" });
    const dataTab = page.getByRole("tab", { name: "DATA" });
    const infoTab = page.getByRole("tab", { name: "MODEL INFO" });
    const viewerBox = await viewerTab.boundingBox();
    const content = await contentBox(page);
    if (!topBar || !main || !viewerBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] FINS 390x844 upright — tab top ${viewerBox.y - (topBar.y + topBar.height)}, ` +
        `tab height ${viewerBox.height}, drawing area ${content.width}x${content.height} at (${content.x},${content.y})`,
    );

    expectWithin(viewerBox.y - (topBar.y + topBar.height), 11, 1);
    expectWithin(viewerBox.height, 22, 1);
    expectWithin(content.y - (viewerBox.y + viewerBox.height), 11, 1);
    expectWithin(main.y + main.height - (content.y + content.height), 5, 1);
    expectWithin(content.x - main.x, 5, 1);
    expectWithin(main.x + main.width - (content.x + content.width), 5, 1);

    // Growth floors (today 367x322).
    expect(content.height).toBeGreaterThanOrEqual(407);
    expect(content.width).toBeGreaterThanOrEqual(372);

    const bounds = { topBarBottom: topBar.y + topBar.height, drawingTop: content.y };
    await assertTabTouchBox(viewerTab, bounds);
    await assertTabTouchBox(dataTab, bounds);
    await assertTabTouchBox(infoTab, bounds);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(IPHONE_UPRIGHT.width);
  });

  test("android upright (412x915): frame, tab height, drawing area and touch boxes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "android-only viewport");
    await page.setViewportSize(ANDROID_UPRIGHT);
    await gotoRoute(page, "/design/fins");
    await settle(page);

    const padding = await mainPadding(page);
    expectWithin(padding.top, 2, 0.5);
    expectWithin(padding.right, 2, 0.5);
    expectWithin(padding.bottom, 2, 0.5);
    expectWithin(padding.left, 2, 0.5);

    const topBar = await topBarBox(page);
    const main = await page.locator("main").boundingBox();
    const viewerTab = page.getByRole("tab", { name: "VIEWER" });
    const dataTab = page.getByRole("tab", { name: "DATA" });
    const infoTab = page.getByRole("tab", { name: "MODEL INFO" });
    const viewerBox = await viewerTab.boundingBox();
    const content = await contentBox(page);
    if (!topBar || !main || !viewerBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] FINS 412x915 upright — tab top ${viewerBox.y - (topBar.y + topBar.height)}, ` +
        `tab height ${viewerBox.height}, drawing area ${content.width}x${content.height} at (${content.x},${content.y})`,
    );

    expectWithin(viewerBox.y - (topBar.y + topBar.height), 11, 1);
    expectWithin(viewerBox.height, 22, 1);
    expectWithin(content.y - (viewerBox.y + viewerBox.height), 11, 1);
    expectWithin(main.y + main.height - (content.y + content.height), 5, 1);
    expectWithin(content.x - main.x, 5, 1);
    expectWithin(main.x + main.width - (content.x + content.width), 5, 1);

    // Growth floors (today 406x344).
    expect(content.height).toBeGreaterThanOrEqual(446);
    expect(content.width).toBeGreaterThanOrEqual(394);

    const bounds = { topBarBottom: topBar.y + topBar.height, drawingTop: content.y };
    await assertTabTouchBox(viewerTab, bounds);
    await assertTabTouchBox(dataTab, bounds);
    await assertTabTouchBox(infoTab, bounds);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(ANDROID_UPRIGHT.width);
  });

  test("iphone sideways (844x390): frame, drawing width and touch boxes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "iphone-only viewport");
    await page.setViewportSize(IPHONE_SIDEWAYS);
    await gotoRoute(page, "/design/fins");
    await settle(page);

    const paddingBottom = await page
      .locator("main")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    expectWithin(paddingBottom, 2, 0.5);

    const topBar = await topBarBox(page);
    const viewerTab = page.getByRole("tab", { name: "VIEWER" });
    const dataTab = page.getByRole("tab", { name: "DATA" });
    const infoTab = page.getByRole("tab", { name: "MODEL INFO" });
    const viewerBox = await viewerTab.boundingBox();
    const content = await contentBox(page);
    if (!topBar || !viewerBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] FINS 844x390 sideways — drawing area ${content.width}x${content.height}, ` +
        `clearance to window bottom ${IPHONE_SIDEWAYS.height - (content.y + content.height)}`,
    );

    expectWithin(viewerBox.y - (topBar.y + topBar.height), 11, 1);
    // Growth floor (today 416 wide).
    expect(content.width).toBeGreaterThanOrEqual(466);
    expectWithin(IPHONE_SIDEWAYS.height - (content.y + content.height), 5, 1);

    const bounds = { topBarBottom: topBar.y + topBar.height, drawingTop: content.y };
    await assertTabTouchBox(viewerTab, bounds);
    await assertTabTouchBox(dataTab, bounds);
    await assertTabTouchBox(infoTab, bounds);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(IPHONE_SIDEWAYS.width);
  });

  test("android sideways (863x360): frame, drawing width and touch boxes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "android-only viewport");
    await page.setViewportSize(ANDROID_SIDEWAYS);
    await gotoRoute(page, "/design/fins");
    await settle(page);

    const paddingBottom = await page
      .locator("main")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    expectWithin(paddingBottom, 2, 0.5);

    const topBar = await topBarBox(page);
    const viewerTab = page.getByRole("tab", { name: "VIEWER" });
    const dataTab = page.getByRole("tab", { name: "DATA" });
    const infoTab = page.getByRole("tab", { name: "MODEL INFO" });
    const viewerBox = await viewerTab.boundingBox();
    const content = await contentBox(page);
    if (!topBar || !viewerBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] FINS 863x360 sideways — drawing area ${content.width}x${content.height}, ` +
        `clearance to window bottom ${ANDROID_SIDEWAYS.height - (content.y + content.height)}`,
    );

    expectWithin(viewerBox.y - (topBar.y + topBar.height), 11, 1);
    // Growth floor (today 426 wide).
    expect(content.width).toBeGreaterThanOrEqual(476);
    expectWithin(ANDROID_SIDEWAYS.height - (content.y + content.height), 5, 1);

    const bounds = { topBarBottom: topBar.y + topBar.height, drawingTop: content.y };
    await assertTabTouchBox(viewerTab, bounds);
    await assertTabTouchBox(dataTab, bounds);
    await assertTabTouchBox(infoTab, bounds);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(ANDROID_SIDEWAYS.width);
  });
});

test.describe("RAILS — the slimmer phone frame and TWO stacked rows of tappable tabs (item 9e, P-9)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "this describe's own upright/sideways sizes are phone-only");
    await dismissChrome(page);
  });

  test("iphone upright (390x844): frame, both tab rows, drawing area and the no-overlap proof", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "iphone-only viewport");
    await page.setViewportSize(IPHONE_UPRIGHT);
    await gotoRoute(page, "/design/rails");
    await settle(page);

    const padding = await mainPadding(page);
    expectWithin(padding.top, 2, 0.5);
    expectWithin(padding.right, 2, 0.5);
    expectWithin(padding.bottom, 2, 0.5);
    expectWithin(padding.left, 2, 0.5);

    const topBar = await topBarBox(page);
    const main = await page.locator("main").boundingBox();
    const viewerTab = page.getByRole("tab", { name: "VIEWER" });
    const dataTab = page.getByRole("tab", { name: "DATA" });
    const instructionsTab = page.getByRole("tab", { name: "INSTRUCTIONS" });
    const viewerBox = await viewerTab.boundingBox();
    const content = await contentBox(page);
    if (!topBar || !main || !viewerBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] RAILS 390x844 upright — outer tab top ${viewerBox.y - (topBar.y + topBar.height)}, ` +
        `outer tab height ${viewerBox.height}, drawing area ${content.width}x${content.height} at (${content.x},${content.y})`,
    );

    expectWithin(viewerBox.y - (topBar.y + topBar.height), 11, 1);
    expectWithin(viewerBox.height, 22, 1);
    expectWithin(content.y - (viewerBox.y + viewerBox.height), 11, 1);
    expectWithin(main.y + main.height - (content.y + content.height), 5, 1);
    expectWithin(content.x - main.x, 5, 1);
    expectWithin(main.x + main.width - (content.x + content.width), 5, 1);

    // Growth floors (today 325x322).
    expect(content.height).toBeGreaterThanOrEqual(365);
    expect(content.width).toBeGreaterThanOrEqual(372);

    const bounds = { topBarBottom: topBar.y + topBar.height, drawingTop: content.y };
    await assertTabTouchBox(viewerTab, bounds);
    await assertTabTouchBox(dataTab, bounds);
    await assertTabTouchBox(instructionsTab, bounds);

    // The phone-only NOSE/CENTER/TAIL switch, visible on VIEWER (the default tab) only upright.
    const noseTab = page.getByRole("tab", { name: "NOSE" });
    const centerTab = page.getByRole("tab", { name: "CENTER" });
    const tailTab = page.getByRole("tab", { name: "TAIL" });
    await assertBasicTouchBox(noseTab);
    await assertBasicTouchBox(centerTab);
    await assertBasicTouchBox(tailTab);

    // P-9's own no-overlap proof: the two stacked rows' touch boxes never reach one another.
    expect(
      await assertNotHitAbove(noseTab, 11),
      "a point 1px above NOSE's touch box must not hit NOSE",
    ).toBe(false);
    expect(
      await assertNotHitBelow(viewerTab, 11),
      "a point 1px below VIEWER's touch box must not hit VIEWER",
    ).toBe(false);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(IPHONE_UPRIGHT.width);
  });

  test("android upright (412x915): frame, both tab rows, drawing area and the no-overlap proof", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "android-only viewport");
    await page.setViewportSize(ANDROID_UPRIGHT);
    await gotoRoute(page, "/design/rails");
    await settle(page);

    const padding = await mainPadding(page);
    expectWithin(padding.top, 2, 0.5);
    expectWithin(padding.right, 2, 0.5);
    expectWithin(padding.bottom, 2, 0.5);
    expectWithin(padding.left, 2, 0.5);

    const topBar = await topBarBox(page);
    const main = await page.locator("main").boundingBox();
    const viewerTab = page.getByRole("tab", { name: "VIEWER" });
    const dataTab = page.getByRole("tab", { name: "DATA" });
    const instructionsTab = page.getByRole("tab", { name: "INSTRUCTIONS" });
    const viewerBox = await viewerTab.boundingBox();
    const content = await contentBox(page);
    if (!topBar || !main || !viewerBox) throw new Error("missing a bounding box");

    console.log(
      `[9e] RAILS 412x915 upright — outer tab top ${viewerBox.y - (topBar.y + topBar.height)}, ` +
        `outer tab height ${viewerBox.height}, drawing area ${content.width}x${content.height} at (${content.x},${content.y})`,
    );

    expectWithin(viewerBox.y - (topBar.y + topBar.height), 11, 1);
    expectWithin(viewerBox.height, 22, 1);
    expectWithin(content.y - (viewerBox.y + viewerBox.height), 11, 1);
    expectWithin(main.y + main.height - (content.y + content.height), 5, 1);
    expectWithin(content.x - main.x, 5, 1);
    expectWithin(main.x + main.width - (content.x + content.width), 5, 1);

    // Growth floors (today 361x344).
    expect(content.height).toBeGreaterThanOrEqual(401);
    expect(content.width).toBeGreaterThanOrEqual(394);

    const bounds = { topBarBottom: topBar.y + topBar.height, drawingTop: content.y };
    await assertTabTouchBox(viewerTab, bounds);
    await assertTabTouchBox(dataTab, bounds);
    await assertTabTouchBox(instructionsTab, bounds);

    const noseTab = page.getByRole("tab", { name: "NOSE" });
    const centerTab = page.getByRole("tab", { name: "CENTER" });
    const tailTab = page.getByRole("tab", { name: "TAIL" });
    await assertBasicTouchBox(noseTab);
    await assertBasicTouchBox(centerTab);
    await assertBasicTouchBox(tailTab);

    expect(
      await assertNotHitAbove(noseTab, 11),
      "a point 1px above NOSE's touch box must not hit NOSE",
    ).toBe(false);
    expect(
      await assertNotHitBelow(viewerTab, 11),
      "a point 1px below VIEWER's touch box must not hit VIEWER",
    ).toBe(false);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(ANDROID_UPRIGHT.width);
  });

  test("iphone sideways (844x390): frame, drawing width and touch boxes — the column scrolls, no fixed clearance", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "iphone-only viewport");
    await page.setViewportSize(IPHONE_SIDEWAYS);
    await gotoRoute(page, "/design/rails");
    await settle(page);

    const paddingBottom = await page
      .locator("main")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    expectWithin(paddingBottom, 2, 0.5);

    const topBar = await topBarBox(page);
    const viewerTab = page.getByRole("tab", { name: "VIEWER" });
    const dataTab = page.getByRole("tab", { name: "DATA" });
    const instructionsTab = page.getByRole("tab", { name: "INSTRUCTIONS" });
    const viewerBox = await viewerTab.boundingBox();
    const content = await contentBox(page);
    if (!topBar || !viewerBox) throw new Error("missing a bounding box");

    console.log(`[9e] RAILS 844x390 sideways — drawing area ${content.width}x${content.height} (column scrolls)`);

    expectWithin(viewerBox.y - (topBar.y + topBar.height), 11, 1);
    // Growth floor (today 416 wide, the plots' own width).
    expect(content.width).toBeGreaterThanOrEqual(466);
    // RAILS sideways SCROLLS (260914-v2v) instead of a fixed window-bottom clearance — only the
    // column's own 2px bottom padding is asserted (already checked above).

    const bounds = { topBarBottom: topBar.y + topBar.height, drawingTop: content.y };
    await assertTabTouchBox(viewerTab, bounds);
    await assertTabTouchBox(dataTab, bounds);
    await assertTabTouchBox(instructionsTab, bounds);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(IPHONE_SIDEWAYS.width);
  });

  test("android sideways (863x360): frame, drawing width and touch boxes — the column scrolls, no fixed clearance", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "android-only viewport");
    await page.setViewportSize(ANDROID_SIDEWAYS);
    await gotoRoute(page, "/design/rails");
    await settle(page);

    const paddingBottom = await page
      .locator("main")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    expectWithin(paddingBottom, 2, 0.5);

    const topBar = await topBarBox(page);
    const viewerTab = page.getByRole("tab", { name: "VIEWER" });
    const dataTab = page.getByRole("tab", { name: "DATA" });
    const instructionsTab = page.getByRole("tab", { name: "INSTRUCTIONS" });
    const viewerBox = await viewerTab.boundingBox();
    const content = await contentBox(page);
    if (!topBar || !viewerBox) throw new Error("missing a bounding box");

    console.log(`[9e] RAILS 863x360 sideways — drawing area ${content.width}x${content.height} (column scrolls)`);

    expectWithin(viewerBox.y - (topBar.y + topBar.height), 11, 1);
    // Growth floor (today 426 wide, the plots' own width).
    expect(content.width).toBeGreaterThanOrEqual(476);

    const bounds = { topBarBottom: topBar.y + topBar.height, drawingTop: content.y };
    await assertTabTouchBox(viewerTab, bounds);
    await assertTabTouchBox(dataTab, bounds);
    await assertTabTouchBox(instructionsTab, bounds);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(ANDROID_SIDEWAYS.width);
  });
});

/** Every one of the five design screens, for the iPad-like and computer checks below — `tabs`
 * empty means a non-interactive single label (TEMPLATE, VOLUME), with nothing to tap. */
const ALL_FIVE_SCREENS: Array<{ path: `/design/${string}`; label: string; tabs: string[] }> = [
  { path: "/design/outline", label: "TEMPLATE", tabs: [] },
  { path: "/design/rocker", label: "ROCKER", tabs: ["VIEWER", "DATASHEET"] },
  { path: "/design/rails", label: "RAILS", tabs: ["VIEWER", "DATA", "INSTRUCTIONS"] },
  { path: "/design/volume", label: "VOLUME", tabs: [] },
  { path: "/design/fins", label: "FINS", tabs: ["VIEWER", "DATA", "MODEL INFO"] },
];

test.describe("All five screens — a tall touch screen (iPad-like) keeps today's look (item 9e)", () => {
  for (const screen of ALL_FIVE_SCREENS) {
    test(`${screen.label} at 1180x820, a touch device, desktop shell: today's 12px frames and 30px tabs, touch box still reaches`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "iphone", "a touch pointer is required (WebKit project)");
      await dismissChrome(page);
      await page.setViewportSize({ width: 1180, height: 820 });
      await gotoRoute(page, screen.path);
      await settle(page);

      const padding = await mainPadding(page);
      expectWithin(padding.top, 12, 0.5);

      await expect(page.getByRole("banner")).toHaveCount(0); // the desktop row shows, not the phone bar, at this width.

      const panel = page.locator("[data-viewer-panel]");
      await expect(panel).toHaveCSS("padding", "12px");
      await expect(panel).toHaveCSS("border-width", "1px");

      if (screen.tabs.length === 0) return; // a non-interactive label has nothing to tap.

      const content = await contentBox(page);
      const bounds = { topBarBottom: 0, drawingTop: content.y };
      for (const tabName of screen.tabs) {
        const tab = page.getByRole("tab", { name: tabName });
        const box = await tab.boundingBox();
        if (!box) throw new Error(`${tabName} tab has no bounding box`);
        expectWithin(box.height, 30, 1);
        await assertTabTouchBox(tab, bounds, 5);
      }
    });
  }
});

test.describe("All five screens — a computer is untouched (item 9e)", () => {
  for (const size of [
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
    { width: 820, height: 800 },
  ]) {
    for (const screen of ALL_FIVE_SCREENS) {
      test(`${screen.label} at ${size.width}x${size.height}: today's 12px frames, 30px tabs, no touch box on a mouse`, async ({
        page,
      }, testInfo) => {
        test.skip(testInfo.project.name !== "desktop", "mouse-only sizes");
        await dismissChrome(page);
        await page.setViewportSize(size);
        await gotoRoute(page, screen.path);
        await settle(page);

        const padding = await mainPadding(page);
        expectWithin(padding.top, 12, 0.5);
        expectWithin(padding.right, 12, 0.5);
        expectWithin(padding.bottom, 12, 0.5);
        expectWithin(padding.left, 12, 0.5);

        const panel = page.locator("[data-viewer-panel]");
        await expect(panel).toHaveCSS("padding", "12px");
        await expect(panel).toHaveCSS("border-width", "1px");

        if (screen.tabs.length === 0) return;

        for (const tabName of screen.tabs) {
          const tab = page.getByRole("tab", { name: tabName });
          const box = await tab.boundingBox();
          if (!box) throw new Error(`${tabName} tab has no bounding box`);
          expectWithin(box.height, 30, 1);
          await assertNoTouchBox(tab);
        }
      });
    }
  }
});

test.describe("The phone top bar is 48 dots, with Save and the menu still full-sized (item 9e, P-7)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phone top bar only ever draws on a phone project");
    await dismissChrome(page);
  });

  for (const [sizeLabel, size, project] of [
    ["iphone upright 390x844", IPHONE_UPRIGHT, "iphone"],
    ["iphone sideways 844x390", IPHONE_SIDEWAYS, "iphone"],
    ["android upright 412x915", ANDROID_UPRIGHT, "android"],
    ["android sideways 863x360", ANDROID_SIDEWAYS, "android"],
  ] as const) {
    test(`${sizeLabel}: the bar is 48 tall, matches the token, and Save/the menu are each at least 44x44`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== project, `${project}-only viewport`);
      await page.setViewportSize(size);
      await gotoRoute(page, "/design/rocker");
      await settle(page);

      const topBar = await topBarBox(page);
      if (!topBar) throw new Error("top bar has no bounding box");
      const token = await page.evaluate(() =>
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--phone-top-bar-h")),
      );
      console.log(`[9e] top bar ${sizeLabel} — height ${topBar.height}, token ${token}`);

      expectWithin(topBar.height, 48, 1);
      expectWithin(topBar.height, token, 1);

      const saveButton = page.getByRole("banner").getByRole("button", { name: "Save Board" });
      const saveBox = await saveButton.boundingBox();
      if (!saveBox) throw new Error("Save Board button has no bounding box");
      expect(saveBox.width).toBeGreaterThanOrEqual(44);
      expect(saveBox.height).toBeGreaterThanOrEqual(44);

      const menuButton = page.getByRole("banner").getByRole("button", { name: "Menu" });
      const menuBox = await menuButton.boundingBox();
      if (!menuBox) throw new Error("Menu button has no bounding box");
      expect(menuBox.width).toBeGreaterThanOrEqual(44);
      expect(menuBox.height).toBeGreaterThanOrEqual(44);
    });
  }
});
