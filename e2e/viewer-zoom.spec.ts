import { expect, test, type Locator, type Page } from "@playwright/test";
import { openRocker, pickFirstFittingBlank } from "./helpers/blank-picker";

/**
 * The browser proof for zooming a drawing (quick 261007-fnz, 2026-10-07), shown first on ROCKER's
 * side view. The founder's brief: the mouse wheel and a trackpad pinch zoom the drawing from 1x to
 * 10x in half steps toward the pointer, a phone pinches and pans, a drag pans once zoomed in, a
 * small control shows the level with zoom out, zoom in and reset, a double-click or a double-tap
 * goes back to 1x, lines and words keep their size on screen, a grid appears as the shaper zooms
 * in, and nothing is saved.
 *
 * What a shaper would see, test by test, is in each test's name. No blank name is typed here: the
 * tests pick "the first card under FITS THIS BOARD" through `helpers/blank-picker.ts` (quick 261015-ve9).
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

/** ROCKER's side view — the one drawing carrying the board's profile silhouette. */
function sideView(page: Page): Locator {
  return page.locator('svg:has([data-board-silhouette="profile"])');
}

function zoomLevel(page: Page): Locator {
  return page.locator("[data-viewer-zoom] [data-zoom-level]");
}

/**
 * The nose tip's measuring dot on the board's bottom: of the leftmost ink dots (nose-left; the
 * bottom and the deck share the nose tip's x), the lower one. Marked on first read so every later
 * read measures the very same dot.
 */
async function noseDotCentre(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const centre = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const marked = document.querySelector("[data-test-nose-dot]");
    if (marked) return centre(marked);
    const dots = [...document.querySelectorAll('[data-measuring-points] circle[fill="var(--outline-ink)"]')];
    let best: Element | null = null;
    for (const dot of dots) {
      if (!best) {
        best = dot;
        continue;
      }
      const c = centre(dot);
      const b = centre(best);
      if (c.x < b.x - 0.5 || (Math.abs(c.x - b.x) <= 0.5 && c.y > b.y)) best = dot;
    }
    if (!best) throw new Error("no measuring dots");
    best.setAttribute("data-test-nose-dot", "");
    return centre(best);
  });
}

async function pageStillness(page: Page) {
  return page.evaluate(() => ({ scrollY: window.scrollY, scale: window.visualViewport?.scale ?? 1 }));
}

test.describe("261007-fnz ROCKER zoom — computer", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a mouse and its wheel");
  });

  test("tracer: the wheel zooms ROCKER toward the pointer", async ({ page }) => {
    await dismissChrome(page);
    await openRocker(page);
    await pickFirstFittingBlank(page);
    await page.getByRole("button", { name: "Show measuring points" }).click();
    const svg = sideView(page);
    const baseViewBox = await svg.getAttribute("viewBox");
    await expect(zoomLevel(page)).toHaveText("1x");
    const before = await pageStillness(page);

    const start = await noseDotCentre(page);
    // A mouse event's position is a whole pixel, so the pointer lands up to half a pixel off the
    // dot's centre; at 6x that half pixel is three. What the zoom holds still is the point under the
    // pointer, so the dot is expected where that point puts it: six times its 1x offset from it.
    const pointer = { x: Math.round(start.x), y: Math.round(start.y) };
    await page.mouse.move(pointer.x, pointer.y);
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, -100);
    }
    await expect(zoomLevel(page)).toHaveText("6x");
    await expect(svg).not.toHaveAttribute("viewBox", baseViewBox ?? "");

    const end = await noseDotCentre(page);
    const expected = { x: pointer.x + (start.x - pointer.x) * 6, y: pointer.y + (start.y - pointer.y) * 6 };
    expect(Math.hypot(end.x - expected.x, end.y - expected.y)).toBeLessThan(1.5);
    expect(await pageStillness(page)).toEqual(before);
  });

  test("a trackpad pinch (ctrl+wheel) zooms the drawing, never the page", async ({ page }) => {
    await dismissChrome(page);
    await openRocker(page);
    const box = await svgBox(page);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.down("Control");
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -15);
    await page.keyboard.up("Control");
    await expect.poll(async () => levelNumber(page)).toBeGreaterThan(1.5);
    expect(await page.evaluate(() => ({ dpr: window.devicePixelRatio, scale: window.visualViewport?.scale }))).toEqual({
      dpr: 1,
      scale: 1,
    });
  });

  test("zoom in, zoom out and reset, from 1x to 10x and back, and a double-click goes back to 1x", async ({ page }) => {
    await dismissChrome(page);
    await openRocker(page);
    const svg = sideView(page);
    const baseViewBox = (await svg.getAttribute("viewBox")) ?? "";
    await expect(zoomOutButton(page)).toBeDisabled();
    await expect(resetButton(page)).toBeDisabled();
    await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("1.5x");
    await zoomOutButton(page).click();
    await expect(zoomLevel(page)).toHaveText("1x");
    await expect(zoomOutButton(page)).toBeDisabled();
    await expect(resetButton(page)).toBeDisabled();
    for (let i = 0; i < 18; i++) {
      if (await zoomInButton(page).isDisabled()) break;
      await zoomInButton(page).click();
    }
    await expect(zoomLevel(page)).toHaveText("10x");
    await expect(zoomInButton(page)).toBeDisabled();
    await resetButton(page).click();
    await expect(zoomLevel(page)).toHaveText("1x");
    await expect(svg).toHaveAttribute("viewBox", baseViewBox);

    for (let i = 0; i < 4; i++) await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("3x");
    const box = await svgBox(page);
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    await expect(zoomLevel(page)).toHaveText("1x");
    await expect(svg).toHaveAttribute("viewBox", baseViewBox);
  });

  test("above 1x a drag pans the drawing, never past its edge; at 1x a drag changes nothing", async ({ page }) => {
    await dismissChrome(page);
    await openRocker(page);
    const svg = sideView(page);
    const base = parseBox((await svg.getAttribute("viewBox")) ?? "");
    const box = await svgBox(page);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // At 1x: nothing.
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 120, cy + 40, { steps: 6 });
    await page.mouse.up();
    expect(parseBox((await svg.getAttribute("viewBox")) ?? "")).toEqual(base);

    for (let i = 0; i < 4; i++) await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("3x");
    const before = parseBox((await svg.getAttribute("viewBox")) ?? "");
    const unitsPerPx = before.width / box.width;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 60, cy, { steps: 6 });
    await page.mouse.up();
    const after = parseBox((await svg.getAttribute("viewBox")) ?? "");
    // The drawing moved right with the pointer: the view moved left by 60 px of drawing.
    expect(after.x).toBeCloseTo(before.x - 60 * unitsPerPx, 1);
    expect(after.y).toBeCloseTo(before.y, 3);

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 3000, cy + 3000, { steps: 10 });
    await page.mouse.up();
    const far = parseBox((await svg.getAttribute("viewBox")) ?? "");
    expect(far.x).toBeCloseTo(base.x, 3);
    expect(far.y).toBeCloseTo(base.y, 3);
    await expect(zoomLevel(page)).toHaveText("3x");
  });

  for (const orientation of ["nose left", "nose up"] as const) {
    test(`lines, dots and words keep their screen size at 6x (${orientation})`, async ({ page }) => {
      await dismissChrome(page);
      await openRocker(page);
      await pickFirstFittingBlank(page);
      await page.getByRole("button", { name: "Show measuring points" }).click();
      if (orientation === "nose up") await page.getByRole("button", { name: "Rotate the board" }).click();
      await expect(zoomLevel(page)).toHaveText("1x");
      await page.waitForTimeout(300);
      const atOne = await screenSizes(page);
      for (let i = 0; i < 10; i++) await zoomInButton(page).click();
      await expect(zoomLevel(page)).toHaveText("6x");
      await page.waitForTimeout(300);
      const atSix = await screenSizes(page);
      for (const key of Object.keys(atOne) as (keyof typeof atOne)[]) {
        expect(atOne[key], `${key} at 1x`).toBeGreaterThan(0);
        expect(Math.abs(atSix[key] - atOne[key]), `${key}: ${atOne[key]} px at 1x, ${atSix[key]} px at 6x`).toBeLessThan(0.05);
      }
    });
  }

  test("nothing about the zoom is saved: no storage key, and a reload is 1x", async ({ page }) => {
    await dismissChrome(page);
    await openRocker(page);
    for (let i = 0; i < 4; i++) await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("3x");
    const keys = await page.evaluate(() => [...Object.keys(window.localStorage), ...Object.keys(window.sessionStorage)]);
    expect(keys.filter((key) => /zoom/i.test(key))).toEqual([]);
    const values = await page.evaluate(() =>
      [...Object.values(window.localStorage), ...Object.values(window.sessionStorage)].join("\n"),
    );
    expect(values).not.toMatch(/zoom/i);
    await page.reload();
    await expect(zoomLevel(page)).toHaveText("1x");
  });

  test("the placement slider still slides the board along the blank while zoomed in", async ({ page }) => {
    await dismissChrome(page);
    await openRocker(page);
    await pickFirstFittingBlank(page);
    for (let i = 0; i < 4; i++) await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("3x");
    const readings = async () => (await sideView(page).locator("text").allTextContents()).join("|");
    const before = await readings();
    const slider = page.getByText(/^Placement — /).locator("xpath=..").getByRole("slider");
    // The BLANK button (quick 261015-ve9) stands a little taller than the old picked card, which can
    // leave the slider just under the sidebar's fold on a 800-dot window: bring it into view first.
    await slider.scrollIntoViewIfNeeded();
    const b = await slider.boundingBox();
    if (!b) throw new Error("no placement slider");
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 - 40, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByText(/^Placement — .+ toward nose$/)).toBeVisible();
    await expect.poll(readings).not.toBe(before);
    await expect(zoomLevel(page)).toHaveText("3x");
  });
});

test.describe("261007-fnz ROCKER zoom — the grid", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a mouse and its wheel");
  });

  test("no grid at 1x, fresh or in a blank, nose left or nose up", async ({ page }) => {
    await dismissChrome(page);
    await openRocker(page);
    const grid = page.locator("[data-zoom-grid]");
    await expect(zoomLevel(page)).toHaveText("1x");
    await expect(grid).toHaveCount(0);
    await pickFirstFittingBlank(page);
    await expect(grid).toHaveCount(0);
    await page.getByRole("button", { name: "Rotate the board" }).click();
    await expect(zoomLevel(page)).toHaveText("1x");
    await expect(grid).toHaveCount(0);
  });

  test("at 6x on the nose: 1/2\" lines with the 1\" lines darker, counted from the tail tip and the baseline", async ({
    page,
  }) => {
    await dismissChrome(page);
    await openRocker(page);
    await pickFirstFittingBlank(page);
    await zoomToSixOnTheNose(page);
    const grid = await readGrid(page);
    expect(grid.spacingPx).toBeGreaterThanOrEqual(20);
    expect(grid.spacingPx).toBeLessThan(40);
    expect(grid.majorsEverySecond).toBe(true);
    expect(grid.anchoredAlong).toBe(true);
    expect(grid.anchoredAcross).toBe(true);
  });

  test("Metric at 6x: 1 cm lines with the 2 cm lines darker", async ({ page, browser }) => {
    await dismissChrome(page);
    await openRocker(page);
    await pickFirstFittingBlank(page);
    await zoomToSixOnTheNose(page);
    const imperial = await readGrid(page);

    const metricPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await dismissChrome(metricPage);
    await metricPage.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
    await metricPage.context().addCookies([{ name: "shaper-units", value: "metric", domain: "localhost", path: "/" }]);
    await openRocker(metricPage);
    await pickFirstFittingBlank(metricPage);
    await zoomToSixOnTheNose(metricPage);
    const metric = await readGrid(metricPage);
    expect(metric.spacingPx).toBeGreaterThanOrEqual(20);
    expect(metric.majorsEverySecond).toBe(true);
    // 1 cm against 1/2": 10 / 12.7 of the spacing.
    expect(metric.spacingPx / imperial.spacingPx).toBeCloseTo(10 / 12.7, 2);
    await metricPage.close();
  });

  test("the grid's lines draw one screen pixel wide at 3x and at 6x", async ({ page }) => {
    await dismissChrome(page);
    await openRocker(page);
    await pickFirstFittingBlank(page);
    for (let i = 0; i < 4; i++) await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("3x");
    expect(await gridLineWidths(page)).toEqual(["1px non-scaling-stroke"]);
    for (let i = 0; i < 6; i++) await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("6x");
    expect(await gridLineWidths(page)).toEqual(["1px non-scaling-stroke"]);
  });
});

/** Task 1's wheel path: the pointer on the nose's measuring dot, ten notches, 6x. */
async function zoomToSixOnTheNose(page: Page) {
  await page.getByRole("button", { name: "Show measuring points" }).click();
  const dot = await noseDotCentre(page);
  await page.mouse.move(Math.round(dot.x), Math.round(dot.y));
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(200);
    await page.mouse.wheel(0, -100);
  }
  await expect(zoomLevel(page)).toHaveText("6x");
  await expect(page.locator("[data-zoom-grid]")).toHaveCount(1);
}

/** The distinct widths and vector effects the grid's lines are drawn with. */
async function gridLineWidths(page: Page): Promise<string[]> {
  return page.evaluate(() => [
    ...new Set(
      [...document.querySelectorAll("[data-zoom-grid] line")].map((line) => {
        const style = getComputedStyle(line);
        return `${style.strokeWidth} ${style.vectorEffect}`;
      }),
    ),
  ]);
}

/** The grid's lines across the board (nose left: the vertical ones), read on screen and in the drawing. */
async function readGrid(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('svg:has([data-board-silhouette="profile"])');
    const baseline = svg?.querySelector(":scope > g > line");
    const lines = [...document.querySelectorAll("[data-zoom-grid] line")] as SVGLineElement[];
    if (!svg || !baseline || lines.length === 0) throw new Error("no grid");
    const tailX = Number(baseline.getAttribute("x1"));
    const baselineY = Number(baseline.getAttribute("y1"));
    // The attributes, not `baseVal` (which is single precision), so the anchor check is exact.
    const n = (l: Element, a: string) => Number(l.getAttribute(a));
    const isWhole = (v: number) => Math.abs(v - Math.round(v)) < 1e-6;
    const along = lines.filter((l) => n(l, "x1") === n(l, "x2")).sort((a, b) => n(a, "x1") - n(b, "x1"));
    const across = lines.filter((l) => n(l, "y1") === n(l, "y2")).sort((a, b) => n(a, "y1") - n(b, "y1"));
    const stepUnits = n(along[1], "x1") - n(along[0], "x1");
    const screen = along.map((l) => l.getBoundingClientRect().left);
    const gaps = screen.slice(1).map((x, i) => x - screen[i]);
    const majors = along.map((l) => l.hasAttribute("data-major"));
    const firstMajor = majors.indexOf(true);
    return {
      spacingPx: gaps.reduce((a, b) => a + b, 0) / gaps.length,
      majorsEverySecond: firstMajor >= 0 && majors.every((m, i) => m === ((i - firstMajor) % 2 === 0)),
      anchoredAlong: along.every((l) => isWhole((n(l, "x1") - tailX) / stepUnits)),
      anchoredAcross: across.length > 0 && across.every((l) => isWhole((n(l, "y1") - baselineY) / stepUnits)),
    };
  });
}

test.describe("261007-fnz ROCKER zoom — touch screens", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "a phone");
  });

  test("at 1x the zoom control is not drawn and the toolbar row is unchanged", async ({ page }) => {
    await dismissChrome(page);
    await openRocker(page);
    await expect(page.locator("[data-viewer-zoom]")).toBeHidden();
    await expect(page.locator("[data-viewer-toolbar]:visible")).toHaveCount(1);
    // An upright phone's row holds the measuring-points button alone (viewer-toolbar.spec.ts).
    await expect(page.locator("[data-viewer-toolbar]:visible button:visible")).toHaveCount(1);
  });
});

test.describe("261007-fnz ROCKER zoom — fingers (Android, real touch input)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "android", "CDP touch input is Chromium's");
  });

  test("two fingers pinch the drawing in, the page never zooms, and a double-tap goes back to 1x", async ({ page }) => {
    await dismissChrome(page);
    await openRocker(page);
    const cdp = await page.context().newCDPSession(page);
    const box = await svgBox(page);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await pinch(cdp, cx, cy, 40, 160);
    await expect.poll(async () => levelNumber(page)).toBeGreaterThan(1);
    expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
    await expect(zoomLevel(page)).toBeVisible();
    await expect(resetButton(page)).toBeVisible();
    await expect(zoomInButton(page)).toBeHidden();
    await expect(zoomOutButton(page)).toBeHidden();

    for (let i = 0; i < 2; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy, id: 0 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    }
    await expect(zoomLevel(page)).toBeHidden();
    await expect(page.locator("[data-viewer-zoom]")).toHaveAttribute("data-at-one", "");
  });

  test("once zoomed in one finger pans the drawing, clamped; after reset one finger is the browser's again", async ({
    page,
  }) => {
    await dismissChrome(page);
    await openRocker(page);
    const svg = sideView(page);
    const base = parseBox((await svg.getAttribute("viewBox")) ?? "");
    const box = await svgBox(page);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // 3x through the wheel, dispatched on the drawing: the zoom buttons are not drawn on a touch
    // screen, and a pinch would not land on an exact level.
    await svg.evaluate((el, at) => {
      for (let i = 0; i < 4; i++) {
        el.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, clientX: at.x, clientY: at.y, bubbles: true, cancelable: true }));
      }
    }, { x: cx, y: cy });
    await expect(zoomLevel(page)).toHaveText("3x");
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));
    expect(await svg.evaluate((el) => getComputedStyle(el).touchAction)).toBe("none");

    const cdp = await page.context().newCDPSession(page);
    const scrolls = () =>
      page.evaluate(() => ({
        main: document.querySelector("main")?.scrollTop ?? 0,
        window: window.scrollY,
        scale: window.visualViewport?.scale ?? 1,
      }));
    const scrollBefore = await scrolls();
    const before = parseBox((await svg.getAttribute("viewBox")) ?? "");
    await swipe(cdp, cx, cy, cx + 80, cy + 90, 6);
    const after = parseBox((await svg.getAttribute("viewBox")) ?? "");
    expect(after.x + after.y).toBeLessThan(before.x + before.y);
    expect(after.x).toBeLessThanOrEqual(before.x);
    expect(after.y).toBeLessThanOrEqual(before.y);
    expect(await scrolls()).toEqual(scrollBefore);

    // A long drag ends on the frame's edge.
    await swipe(cdp, cx, cy, cx + 600, cy + 600, 10);
    const far = parseBox((await svg.getAttribute("viewBox")) ?? "");
    expect(far.x).toBeCloseTo(base.x, 3);
    expect(far.y).toBeCloseTo(base.y, 3);

    // A pinch that ends with one finger still down hands over to that finger without a jump.
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: cx - 40, y: cy, id: 0 },
        { x: cx + 40, y: cy, id: 1 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: cx - 50, y: cy, id: 0 },
        { x: cx + 50, y: cy, id: 1 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx + 50, y: cy, id: 1 }] });
    const handed = parseBox((await svg.getAttribute("viewBox")) ?? "");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx + 51, y: cy, id: 1 }] });
    const nudged = parseBox((await svg.getAttribute("viewBox")) ?? "");
    const pxPerUnit = box.width / nudged.width;
    expect(Math.hypot(nudged.x - handed.x, nudged.y - handed.y) * pxPerUnit).toBeLessThan(2);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    // Reset: the whole drawing, and one finger is the browser's again.
    await resetButton(page).click();
    await expect(page.locator("[data-viewer-zoom]")).toHaveAttribute("data-at-one", "");
    const reset = parseBox((await svg.getAttribute("viewBox")) ?? "");
    expect(reset).toEqual(base);
    expect(await svg.evaluate((el) => getComputedStyle(el).touchAction)).toBe("pan-x pan-y");
    const atOneScroll = await scrolls();
    await swipe(cdp, cx, cy, cx + 80, cy - 120, 6);
    expect(parseBox((await svg.getAttribute("viewBox")) ?? "")).toEqual(base);
    expect(await scrolls()).toEqual(atOneScroll);
  });
});

function zoomInButton(page: Page): Locator {
  return page.locator("[data-viewer-zoom]").getByRole("button", { name: "Zoom in" });
}

function zoomOutButton(page: Page): Locator {
  return page.locator("[data-viewer-zoom]").getByRole("button", { name: "Zoom out" });
}

function resetButton(page: Page): Locator {
  return page.locator("[data-viewer-zoom]").getByRole("button", { name: "Back to 1x — the whole drawing" });
}

async function levelNumber(page: Page): Promise<number> {
  return Number(await zoomLevel(page).getAttribute("data-zoom-level"));
}

async function svgBox(page: Page) {
  const b = await sideView(page).boundingBox();
  if (!b) throw new Error("the side view has no box");
  return b;
}

function parseBox(s: string) {
  const [x, y, width, height] = s.trim().split(/[\s,]+/).map(Number);
  return { x, y, width, height };
}

/**
 * Every ROCKER line, dot and word the zoom must hold at one size, measured on screen: a stroke's
 * width or a text's font size times the element's own screen scale (`getScreenCTM`).
 */
async function screenSizes(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('svg:has([data-board-silhouette="profile"])');
    if (!svg) throw new Error("no side view");
    const scaleOf = (el: Element) => {
      const m = (el as SVGGraphicsElement).getScreenCTM();
      if (!m) throw new Error("no screen matrix");
      return Math.hypot(m.a, m.b);
    };
    const stroke = (el: Element | null | undefined) => {
      if (!el) throw new Error("missing element");
      return Number.parseFloat(getComputedStyle(el).strokeWidth) * scaleOf(el);
    };
    const font = (el: Element | null | undefined) => {
      if (!el) throw new Error("missing text");
      return Number.parseFloat(getComputedStyle(el).fontSize) * scaleOf(el);
    };
    const top = svg.querySelector(":scope > g");
    const dot = svg.querySelector("[data-measuring-points] circle") as SVGCircleElement | null;
    if (!dot) throw new Error("no measuring dot");
    const cardTexts = svg.querySelectorAll("g:has(> rect) > text");
    const readingTexts = svg.querySelectorAll('g[transform^="translate(0,"]:not(:has(> rect)) > text');
    const title = [...svg.querySelectorAll("text")].find((t) => t.textContent === "Thickness");
    return {
      outline: stroke(svg.querySelector('[data-board-silhouette="profile"]')),
      baseline: stroke(top?.querySelector(":scope > line")),
      // A station card's leader: a station-line stroke that is neither the baseline (a child of
      // the top group) nor a grid line.
      leader: stroke(
        [...svg.querySelectorAll('line[stroke="var(--outline-station-line)"]')].find(
          (line) => line.parentElement !== top && !line.closest("[data-zoom-grid]"),
        ),
      ),
      blankLine: stroke(svg.querySelector("[data-blank-silhouette]")),
      dotRadius: dot.r.baseVal.value * scaleOf(dot),
      cardName: font(cardTexts[0]),
      cardValue: font(cardTexts[1]),
      readingValue: font(readingTexts[0]),
      title: font(title),
    };
  });
}

type Cdp = Awaited<ReturnType<ReturnType<Page["context"]>["newCDPSession"]>>;

/** Two fingers landing `from` px apart about (cx, cy) and spreading to `to` px. */
async function pinch(cdp: Cdp, cx: number, cy: number, from: number, to: number) {
  const points = (d: number) => [
    { x: cx - d / 2, y: cy, id: 0 },
    { x: cx + d / 2, y: cy, id: 1 },
  ];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points(from) });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: points(from + ((to - from) * i) / 8) });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/** One finger from (x0, y0) to (x1, y1). */
async function swipe(cdp: Cdp, x0: number, y0: number, x1: number, y1: number, steps: number) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0, id: 0 }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y: y0 + ((y1 - y0) * i) / steps, id: 0 }],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/* ── Plan 02 (2026-10-07): the same zoom on TEMPLATE, each RAILS plot, FINS and the TOP VIEW tab ── */

/** TEMPLATE's drawing — the one svg carrying the board's outline silhouette. */
function templateSvg(page: Page): Locator {
  return page.locator('svg:has([data-board-silhouette="outline"])');
}

/** Opens TEMPLATE once React owns the drawing's toolbar (a click before hydration is lost). */
async function openTemplate(page: Page) {
  await page.goto("/design/outline");
  await expect(templateSvg(page)).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const el = document.querySelector("[data-viewer-toolbar] button");
    return !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
  });
}

/** A drag point's centre on screen and its grab reach in screen pixels (the hit circle's radius
 * times the circle's own screen scale). */
async function dragPoint(page: Page, target: string) {
  return page.locator(`[data-drag-target="${target}"]`).evaluate((el) => {
    const circle = el as SVGCircleElement;
    const m = circle.getScreenCTM();
    if (!m) throw new Error("no screen matrix");
    const r = circle.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, reach: circle.r.baseVal.value * Math.hypot(m.a, m.b) };
  });
}

/** Every slider's value, read the way a screen reader reads it. */
async function sliderValues(page: Page): Promise<string[]> {
  return page.getByRole("slider").evaluateAll((els) => els.map((el) => el.getAttribute("aria-valuenow") ?? ""));
}

/** TEMPLATE's lines, dots and words at their on-screen size: a stroke's width, a dot's radius or a
 * text's font size times the element's own screen scale. */
async function templateScreenSizes(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('svg:has([data-board-silhouette="outline"])');
    if (!svg) throw new Error("no TEMPLATE drawing");
    const scaleOf = (el: Element) => {
      const m = (el as SVGGraphicsElement).getScreenCTM();
      if (!m) throw new Error("no screen matrix");
      return Math.hypot(m.a, m.b);
    };
    const stroke = (el: Element | null | undefined, what: string) => {
      if (!el) throw new Error(`missing ${what}`);
      return Number.parseFloat(getComputedStyle(el).strokeWidth) * scaleOf(el);
    };
    const font = (el: Element | null | undefined, what: string) => {
      if (!el) throw new Error(`missing ${what}`);
      return Number.parseFloat(getComputedStyle(el).fontSize) * scaleOf(el);
    };
    const radius = (el: Element | null | undefined, what: string) => {
      if (!el) throw new Error(`missing ${what}`);
      return (el as SVGCircleElement).r.baseVal.value * scaleOf(el);
    };
    const notGrid = (els: Iterable<Element>) => [...els].find((el) => !el.closest("[data-zoom-grid]"));
    return {
      outline: stroke(svg.querySelector('[data-board-silhouette="outline"]'), "outline"),
      stationLine: stroke(notGrid(svg.querySelectorAll('line[stroke="var(--outline-station-line)"]')), "station line"),
      constructionLine: stroke(svg.querySelector('line[stroke="var(--outline-construction)"]'), "construction line"),
      dimensionTick: stroke(svg.querySelector("[data-output-rail] line:nth-of-type(2)"), "dimension tick"),
      chipText: font(svg.querySelector("[data-callout-chip] text"), "chip text"),
      outputValue: font(svg.querySelector("[data-output-rail] text"), "output value"),
      knotDot: radius(svg.querySelector('circle[fill="var(--outline-widepoint-knot)"]'), "widepoint knot"),
      dragPoint: radius(svg.querySelector("[data-drag-target]"), "drag point"),
    };
  });
}

/** A point over the board's tail half (no construction lines, so no drag point under it). */
async function overTheTailHalf(page: Page) {
  const b = await page.locator('[data-board-silhouette="outline"]').boundingBox();
  if (!b) throw new Error("no outline");
  return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height * 0.7) };
}

test.describe("261007-fnz TEMPLATE zoom — computer", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a mouse and its wheel");
  });

  test("tracer: TEMPLATE zooms and a drag point still drags", async ({ page }) => {
    await dismissChrome(page);
    await openTemplate(page);
    await page.getByRole("button", { name: "Show drag points" }).click();
    const svg = templateSvg(page);
    await expect(zoomLevel(page)).toHaveText("1x");
    const atOne = await dragPoint(page, "widepoint");

    // Over the tail half of the board, a little below and inboard of the widepoint, so the
    // widepoint stays on screen at 3x.
    await page.mouse.move(Math.round(atOne.x + 40), Math.round(atOne.y + 60));
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, -100);
    }
    await expect(zoomLevel(page)).toHaveText("3x");
    const atThree = await dragPoint(page, "widepoint");
    // The same reach on screen at any zoom: finer on the board, never harder to grab.
    expect(Math.abs(atThree.reach - atOne.reach)).toBeLessThan(0.5);

    // The widepoint's drag moves WP Offset along the board (lib/geometry/outline-drag.ts's
    // "widepoint" case; Width is slider-only), exactly as desktop-regression.spec.ts proves at 1x.
    const offset = page.getByText(/^Offset — /);
    const before = await offset.textContent();
    const viewBox = await svg.getAttribute("viewBox");
    await page.mouse.move(atThree.x, atThree.y);
    await page.mouse.down();
    await page.mouse.move(atThree.x, atThree.y - 20, { steps: 4 });
    await page.mouse.move(atThree.x, atThree.y - 40, { steps: 4 });
    await page.mouse.up();
    // The solver ran, and the drawing did not pan under the point.
    await expect(offset).not.toHaveText(before ?? "");
    await expect(svg).toHaveAttribute("viewBox", viewBox ?? "");
    await expect(zoomLevel(page)).toHaveText("3x");
  });

  test("a drag away from every drag point pans at 3x and changes no slider; at 1x it changes nothing", async ({ page }) => {
    await dismissChrome(page);
    await openTemplate(page);
    await page.getByRole("button", { name: "Show drag points" }).click();
    const svg = templateSvg(page);
    const box = await svg.boundingBox();
    if (!box) throw new Error("no TEMPLATE box");
    // Right of the board, between the output rail's readings: no drag point within reach.
    const at = { x: box.x + box.width * 0.85, y: box.y + box.height * 0.62 };
    const sliders = await sliderValues(page);
    const base = parseBox((await svg.getAttribute("viewBox")) ?? "");

    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x - 60, at.y - 30, { steps: 6 });
    await page.mouse.up();
    expect(parseBox((await svg.getAttribute("viewBox")) ?? "")).toEqual(base);
    expect(await sliderValues(page)).toEqual(sliders);

    for (let i = 0; i < 4; i++) await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("3x");
    const before = parseBox((await svg.getAttribute("viewBox")) ?? "");
    const unitsPerPx = before.height / box.height;
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x, at.y - 60, { steps: 6 });
    await page.mouse.up();
    const after = parseBox((await svg.getAttribute("viewBox")) ?? "");
    // The drawing followed the pointer up: the view moved down by 60 px of drawing.
    expect(after.y).toBeCloseTo(before.y + 60 * unitsPerPx, 1);
    expect(await sliderValues(page)).toEqual(sliders);
  });

  for (const orientation of ["nose up", "turned flat"] as const) {
    test(`lines, dots, chips and words keep their screen size at 6x (${orientation})`, async ({ page }) => {
      await dismissChrome(page);
      await openTemplate(page);
      await page.getByRole("button", { name: "Show drag points" }).click();
      if (orientation === "turned flat") {
        await page.getByRole("button", { name: "Rotate the board to horizontal" }).click();
      }
      await expect(zoomLevel(page)).toHaveText("1x");
      await page.waitForTimeout(300);
      const atOne = await templateScreenSizes(page);
      for (let i = 0; i < 10; i++) await zoomInButton(page).click();
      await expect(zoomLevel(page)).toHaveText("6x");
      await page.waitForTimeout(300);
      const atSix = await templateScreenSizes(page);
      for (const key of Object.keys(atOne) as (keyof typeof atOne)[]) {
        expect(atOne[key], `${key} at 1x`).toBeGreaterThan(0);
        expect(Math.abs(atSix[key] - atOne[key]), `${key}: ${atOne[key]} px at 1x, ${atSix[key]} px at 6x`).toBeLessThan(
          0.05,
        );
      }
    });
  }

  test('the grid: none at 1x; at 3x the 1" lines, counted from the tail tip and the stringer', async ({ page }) => {
    await dismissChrome(page);
    await openTemplate(page);
    const grid = page.locator("[data-zoom-grid]");
    await expect(zoomLevel(page)).toHaveText("1x");
    await expect(grid).toHaveCount(0);
    const at = await overTheTailHalf(page);
    await page.mouse.move(at.x, at.y);
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, -100);
    }
    await expect(zoomLevel(page)).toHaveText("3x");
    await expect(grid).toHaveCount(1);
    const read = await page.evaluate(() => {
      const svg = document.querySelector('svg:has([data-board-silhouette="outline"])');
      const outline = svg?.querySelector('[data-board-silhouette="outline"]') as SVGPathElement | null;
      const stringer = [...(svg?.querySelectorAll('line[stroke="var(--outline-station-line)"]') ?? [])].find(
        (l) => !l.closest("[data-zoom-grid]") && l.getAttribute("x1") === l.getAttribute("x2"),
      );
      const lines = [...document.querySelectorAll("[data-zoom-grid] line")] as SVGLineElement[];
      if (!outline || !stringer || lines.length === 0) throw new Error("no grid");
      const n = (l: Element, a: string) => Number(l.getAttribute(a));
      const bbox = outline.getBBox();
      const tailY = bbox.y + bbox.height;
      const stringerX = n(stringer, "x1");
      const across = lines.filter((l) => n(l, "x1") === n(l, "x2")).sort((a, b) => n(a, "x1") - n(b, "x1"));
      const along = lines.filter((l) => n(l, "y1") === n(l, "y2")).sort((a, b) => n(a, "y1") - n(b, "y1"));
      const step = n(across[1], "x1") - n(across[0], "x1");
      const isWhole = (v: number) => Math.abs(v - Math.round(v)) < 1e-3;
      const screen = across.map((l) => l.getBoundingClientRect().left);
      const gaps = screen.slice(1).map((x, i) => x - screen[i]);
      return {
        spacingPx: gaps.reduce((a, b) => a + b, 0) / gaps.length,
        allMajor: lines.every((l) => l.hasAttribute("data-major")),
        anchoredAcross: across.every((l) => isWhole((n(l, "x1") - stringerX) / step)),
        anchoredAlong: along.length > 0 && along.every((l) => isWhole((n(l, "y1") - tailY) / step)),
      };
    });
    // M5: 7.66 px per inch at 1x on 1280×800, so about 23 px at 3x — the 1" rung, every line a 1" line.
    expect(read.spacingPx).toBeGreaterThan(20);
    expect(read.spacingPx).toBeLessThan(26);
    expect(read.allMajor).toBe(true);
    expect(read.anchoredAcross).toBe(true);
    expect(read.anchoredAlong).toBe(true);
  });
});

test.describe("261007-fnz TEMPLATE zoom — fingers (Android, real touch input)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "android", "CDP touch input is Chromium's");
  });

  test("a pinch zooms TEMPLATE; a finger still picks and drags a point, on it and from afar; a second finger ends the drag", async ({
    page,
  }) => {
    await dismissChrome(page);
    await openTemplate(page);
    const cdp = await page.context().newCDPSession(page);
    const offset = page.getByText(/^Offset — /);
    const readout = page.locator("svg text").filter({ hasText: /^Offset — / });
    const widepoint = page.locator('[data-drag-target="widepoint"]');
    await expect(widepoint).toBeVisible();

    // Two fingers about the widepoint itself, so it stays where it is while the drawing grows.
    const w0 = await dragPoint(page, "widepoint");
    await pinch(cdp, w0.x, w0.y, 60, 120);
    await expect.poll(async () => levelNumber(page)).toBeGreaterThan(1);
    const level = await levelNumber(page);

    // One finger on the point: it is picked and dragged, exactly as at 1x.
    const w1 = await dragPoint(page, "widepoint");
    const before = await offset.textContent();
    await swipe(cdp, w1.x, w1.y, w1.x, w1.y - 30, 4);
    await expect(offset).not.toHaveText(before ?? "");
    await expect(widepoint).toHaveAttribute("data-selected", "true");
    expect(await levelNumber(page)).toBe(level);

    // A finger well away from every point drags the picked point from afar (260909-ktq), and
    // never pans the drawing.
    const box = await templateSvg(page).boundingBox();
    if (!box) throw new Error("no TEMPLATE box");
    const viewBox = await templateSvg(page).getAttribute("viewBox");
    const far = { x: box.x + box.width - 20, y: box.y + box.height * 0.8 };
    const beforeRemote = await offset.textContent();
    await swipe(cdp, far.x, far.y, far.x, far.y - 30, 4);
    await expect(offset).not.toHaveText(beforeRemote ?? "");
    await expect(templateSvg(page)).toHaveAttribute("viewBox", viewBox ?? "");
    expect(await levelNumber(page)).toBe(level);

    // A second finger landing mid-drag ends the drag: the board keeps the shape it reached, and
    // the two fingers zoom instead.
    const w2 = await dragPoint(page, "widepoint");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: w2.x, y: w2.y, id: 0 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: w2.x, y: w2.y - 12, id: 0 }] });
    await expect(readout).toBeVisible();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: w2.x, y: w2.y - 12, id: 0 },
        { x: w2.x + 60, y: w2.y - 12, id: 1 },
      ],
    });
    await expect(readout).toHaveCount(0);
    const reached = await offset.textContent();
    for (let i = 1; i <= 6; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: w2.x - 10 * i, y: w2.y - 12 - 6 * i, id: 0 },
          { x: w2.x + 60 + 10 * i, y: w2.y - 12, id: 1 },
        ],
      });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    expect(await offset.textContent()).toBe(reached);
    await expect.poll(async () => levelNumber(page)).toBeGreaterThan(level);
  });
});

/* ── Plan 02: RAILS (each plot its own zoom) and FINS (up to 4x) ───────────────────────────── */

type RailKey = "nose" | "center" | "tail";

/** One RAILS plot on the computer's plot row (a phone held sideways lands there too). */
function railPlot(page: Page, key: RailKey): Locator {
  return page.locator(`[data-rail-plot-row="desktop"] svg[data-rail-section-plot="${key}"]`);
}

/** That plot's own zoom level, read off its own zoom row (at the right end of its title line). */
function railLevel(page: Page, key: RailKey): Locator {
  return page.locator(`[data-rail-zoom-host="${key}"] [data-viewer-zoom] [data-zoom-level]`);
}

async function openRails(page: Page) {
  await page.goto("/design/rails");
  await expect(page.locator('[data-rail-plot-row="desktop"][data-rail-plot-fit="measured"]')).toBeAttached({
    timeout: 30_000,
  });
}

/** `steps` wheel notches toward the reader, dispatched on the drawing itself at (x, y): the way the
 * phone tests reach an exact level (Playwright has no wheel on a mobile WebKit, and a pinch does
 * not land on an exact level). */
async function wheelOn(target: Locator, at: { x: number; y: number }, steps: number) {
  await target.evaluate(
    (el, { at, steps }) => {
      for (let i = 0; i < steps; i++) {
        el.dispatchEvent(
          new WheelEvent("wheel", { deltaY: -100, clientX: at.x, clientY: at.y, bubbles: true, cancelable: true }),
        );
      }
    },
    { at, steps },
  );
}

/** A RAILS plot's axis numbers, dots and lines at their on-screen size. */
async function railScreenSizes(plot: Locator) {
  return plot.evaluate((svg) => {
    const scaleOf = (el: Element) => {
      const m = (el as SVGGraphicsElement).getScreenCTM();
      if (!m) throw new Error("no screen matrix");
      return Math.hypot(m.a, m.b);
    };
    const number = svg.querySelector("text");
    const dot = svg.querySelector("circle") as SVGCircleElement | null;
    const tick = [...svg.querySelectorAll('line[stroke="var(--color-surf-ink-muted)"]')][0] as SVGLineElement | undefined;
    if (!number || !dot || !tick) throw new Error("missing plot parts");
    return {
      axisNumber: Number.parseFloat(getComputedStyle(number).fontSize) * scaleOf(number),
      dot: dot.r.baseVal.value * scaleOf(dot),
      tickLength: Math.hypot(
        tick.x2.baseVal.value - tick.x1.baseVal.value,
        tick.y2.baseVal.value - tick.y1.baseVal.value,
      ) * scaleOf(tick),
    };
  });
}

test.describe("261007-fnz RAILS zoom — computer", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a mouse and its wheel");
  });

  test("each plot zooms on its own: NOSE to 3x leaves CENTER and TAIL at 1x, with a finer grid and RAILS's own grid kept", async ({
    page,
  }) => {
    await dismissChrome(page);
    await openRails(page);
    const nose = railPlot(page, "nose");
    for (const key of ["nose", "center", "tail"] as const) await expect(railLevel(page, key)).toHaveText("1x");
    await expect(page.locator("[data-zoom-grid]")).toHaveCount(0);
    await page.waitForTimeout(300);
    const atOne = await railScreenSizes(nose);
    const ownLinesAtOne = await nose.evaluate(
      (svg) =>
        [...svg.querySelectorAll("line")].filter(
          (l) => !l.closest("[data-zoom-grid]") && (l.getAttribute("stroke") ?? "").includes("12%"),
        ).length,
    );

    const box = await nose.boundingBox();
    if (!box) throw new Error("no NOSE plot");
    await page.mouse.move(Math.round(box.x + box.width * 0.8), Math.round(box.y + box.height * 0.6));
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, -100);
    }
    await expect(railLevel(page, "nose")).toHaveText("3x");
    await expect(railLevel(page, "center")).toHaveText("1x");
    await expect(railLevel(page, "tail")).toHaveText("1x");
    await page.waitForTimeout(300);

    const read = await nose.evaluate((svg) => {
      const n = (l: Element, a: string) => Number(l.getAttribute(a));
      const apex = svg.querySelector('line[stroke-dasharray="2 3"]');
      if (!apex) throw new Error("no apex line");
      const apexX = n(apex, "x1");
      const fine = [...svg.querySelectorAll("[data-zoom-grid] line")];
      const own = [...svg.querySelectorAll("line")].filter(
        (l) => !l.closest("[data-zoom-grid]") && (l.getAttribute("stroke") ?? "").includes("12%"),
      );
      const fineAcross = fine.filter((l) => n(l, "x1") === n(l, "x2")).map((l) => n(l, "x1")).sort((a, b) => a - b);
      const ownAcross = own.filter((l) => n(l, "x1") === n(l, "x2")).map((l) => n(l, "x1"));
      const isWholeInch = (x: number) => Math.abs((x - apexX) / 56 - Math.round((x - apexX) / 56)) < 1e-6;
      return {
        fineStep: fineAcross[1] - fineAcross[0],
        fineOnAWholeInch: fineAcross.some(isWholeInch),
        ownCount: own.length,
        ownAcrossUnique: new Set(ownAcross).size === ownAcross.length,
      };
    });
    // M5: about 59.6 px per inch at 1x, so 179 at 3x — the 1/8" rung (7 drawing units at 56 per inch).
    expect(read.fineStep).toBeCloseTo(7, 6);
    expect(read.fineOnAWholeInch).toBe(false);
    expect(read.ownCount).toBe(ownLinesAtOne);
    expect(read.ownAcrossUnique).toBe(true);

    const atThree = await railScreenSizes(nose);
    for (const key of Object.keys(atOne) as (keyof typeof atOne)[]) {
      expect(Math.abs(atThree[key] - atOne[key]), `${key}: ${atOne[key]} px at 1x, ${atThree[key]} px at 3x`).toBeLessThan(
        0.05,
      );
    }
  });
});

test.describe("261007-fnz RAILS zoom — a phone held sideways (Android, real touch input)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "android", "CDP touch input is Chromium's");
  });

  test("at 1x a thumb scrolls the drawing column; zoomed in it pans the plot instead; after reset it scrolls again", async ({
    page,
  }) => {
    await dismissChrome(page);
    await page.setViewportSize({ width: 844, height: 340 });
    await openRails(page);
    const main = page.locator("main");
    const plot = railPlot(page, "center");
    const cdp = await page.context().newCDPSession(page);
    const scrollTop = () => main.evaluate((el) => el.scrollTop);
    // Back to the top once any fling from the last swipe has run out.
    const toTop = async () => {
      await expect
        .poll(
          async () => {
            await main.evaluate((el) => {
              el.scrollTop = 0;
            });
            await page.waitForTimeout(250);
            return scrollTop();
          },
          { timeout: 10_000 },
        )
        .toBe(0);
    };
    // Where to put a thumb on the CENTER plot: the middle of the part of it the column shows.
    const thumbSpot = async () => {
      const m = await main.boundingBox();
      const b = await plot.boundingBox();
      if (!m || !b) throw new Error("no column or plot");
      const top = Math.max(b.y, m.y);
      const bottom = Math.min(b.y + b.height, m.y + m.height);
      expect(bottom - top, "the CENTER plot is on screen").toBeGreaterThan(20);
      return { x: b.x + b.width * 0.5, y: bottom - 6 };
    };
    // Proof this column can scroll at all (phone-rails.spec.ts proves the same at this size).
    expect(await main.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);

    // 1x: the browser's — the column scrolls and the plot stays put.
    expect(await plot.evaluate((el) => getComputedStyle(el).touchAction)).toBe("pan-x pan-y");
    const base = await plot.getAttribute("viewBox");
    let at = await thumbSpot();
    await swipe(cdp, at.x, at.y, at.x, at.y - 120, 8);
    await expect.poll(scrollTop).toBeGreaterThan(0);
    await expect(plot).toHaveAttribute("viewBox", base ?? "");

    // 3x on that plot alone: one finger pans the plot and the column stays where it is.
    await toTop();
    at = await thumbSpot();
    await wheelOn(plot, at, 4);
    await expect(railLevel(page, "center")).toHaveText("3x");
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));
    expect(await plot.evaluate((el) => getComputedStyle(el).touchAction)).toBe("none");
    const before = parseBox((await plot.getAttribute("viewBox")) ?? "");
    await swipe(cdp, at.x, at.y, at.x - 40, at.y - 120, 8);
    const after = parseBox((await plot.getAttribute("viewBox")) ?? "");
    // The finger went up and left, so the drawing did: the view moved down and right (clamped).
    expect(after.y).toBeGreaterThan(before.y);
    expect(after.x).toBeGreaterThanOrEqual(before.x);
    await page.waitForTimeout(300);
    expect(await scrollTop()).toBe(0);

    // Reset: 1x again, and the thumb is the browser's again.
    const reset = page
      .locator('[data-rail-zoom-host="center"]')
      .getByRole("button", { name: "Back to 1x — the whole drawing" });
    await reset.click();
    await expect(plot).toHaveAttribute("viewBox", base ?? "");
    expect(await plot.evaluate((el) => getComputedStyle(el).touchAction)).toBe("pan-x pan-y");
    await toTop();
    at = await thumbSpot();
    await swipe(cdp, at.x, at.y, at.x, at.y - 120, 8);
    await expect.poll(scrollTop).toBeGreaterThan(0);
    await expect(plot).toHaveAttribute("viewBox", base ?? "");
  });
});

/** FINS's tail diagram. */
function finsSvg(page: Page): Locator {
  return page.locator("[data-fin-plot] svg").first();
}

async function openFins(page: Page) {
  await page.goto("/design/fins");
  await expect(finsSvg(page)).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const el = document.querySelector("[data-viewer-zoom] button");
    return !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
  });
}

/** FINS's lines, dots and words at their on-screen size. */
async function finScreenSizes(page: Page) {
  return finsSvg(page).evaluate((svg) => {
    const scaleOf = (el: Element) => {
      const m = (el as SVGGraphicsElement).getScreenCTM();
      if (!m) throw new Error("no screen matrix");
      return Math.hypot(m.a, m.b);
    };
    const stroke = (el: Element | null | undefined, what: string) => {
      if (!el) throw new Error(`missing ${what}`);
      return Number.parseFloat(getComputedStyle(el).strokeWidth) * scaleOf(el);
    };
    const label = svg.querySelector("[data-fin-dim]");
    const dot = svg.querySelector('circle[fill="var(--outline-ink)"]') as SVGCircleElement | null;
    if (!label || !dot) throw new Error("missing label or dot");
    return {
      outline: stroke(svg.querySelector('path[stroke="var(--outline-ink)"]'), "outline"),
      centreline: stroke(
        [...svg.querySelectorAll('line[stroke="var(--outline-station-line)"]')].find((l) => !l.closest("[data-zoom-grid]")),
        "centreline",
      ),
      dimensionLine: stroke(svg.querySelector('line[stroke="var(--outline-dim-ink)"]'), "dimension line"),
      finMark: stroke(svg.querySelector('line[stroke="var(--color-surf-accent-ink)"]'), "fin mark"),
      label: Number.parseFloat(getComputedStyle(label).fontSize) * scaleOf(label),
      dot: dot.r.baseVal.value * scaleOf(dot),
    };
  });
}

test.describe("261007-fnz FINS zoom — computer", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a mouse and its wheel");
  });

  test("FINS stops at 4x — zoom in, and the wheel — with the 1/2\" grid at 3x and lines and labels at their 1x size", async ({
    page,
  }) => {
    await dismissChrome(page);
    await openFins(page);
    await expect(zoomLevel(page)).toHaveText("1x");
    await page.waitForTimeout(300);
    const atOne = await finScreenSizes(page);

    for (let i = 0; i < 4; i++) await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("3x");
    const grid = await finsSvg(page).evaluate((svg) => {
      const n = (l: Element, a: string) => Number(l.getAttribute(a));
      const lines = [...svg.querySelectorAll("[data-zoom-grid] line")];
      const across = lines.filter((l) => n(l, "x1") === n(l, "x2")).map((l) => n(l, "x1")).sort((a, b) => a - b);
      const along = lines.filter((l) => n(l, "y1") === n(l, "y2")).map((l) => n(l, "y1"));
      const whole = (v: number) => Math.abs(v - Math.round(v)) < 1e-6;
      return {
        step: across[1] - across[0],
        // Counted from the stringer (x 260) and the tail tip (y 320), 7 drawing units to the 1/2".
        anchored: across.every((x) => whole((x - 260) / 7)) && along.length > 0 && along.every((y) => whole((y - 320) / 7)),
      };
    });
    expect(grid.step).toBeCloseTo(7, 6);
    expect(grid.anchored).toBe(true);

    await zoomInButton(page).click();
    await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("4x");
    await expect(zoomInButton(page)).toBeDisabled();
    await page.waitForTimeout(300);
    const atFour = await finScreenSizes(page);
    for (const key of Object.keys(atOne) as (keyof typeof atOne)[]) {
      expect(Math.abs(atFour[key] - atOne[key]), `${key}: ${atOne[key]} px at 1x, ${atFour[key]} px at 4x`).toBeLessThan(
        0.05,
      );
    }

    const box = await finsSvg(page).boundingBox();
    if (!box) throw new Error("no FINS box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, -100);
    }
    await expect(zoomLevel(page)).toHaveText("4x");
  });
});

test.describe("261007-fnz FINS zoom — fingers (Android, real touch input)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "android", "CDP touch input is Chromium's");
  });

  test("at 3x one finger drags the diagram around and scrolls nothing", async ({ page }) => {
    await dismissChrome(page);
    await openFins(page);
    const svg = finsSvg(page);
    const box = await svg.boundingBox();
    if (!box) throw new Error("no FINS box");
    const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await wheelOn(svg, at, 4);
    await expect(zoomLevel(page)).toHaveText("3x");
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));
    expect(await svg.evaluate((el) => getComputedStyle(el).touchAction)).toBe("none");
    const scrolls = () =>
      page.evaluate(() => ({ main: document.querySelector("main")?.scrollTop ?? 0, window: window.scrollY }));
    const scrollBefore = await scrolls();
    const before = parseBox((await svg.getAttribute("viewBox")) ?? "");
    const cdp = await page.context().newCDPSession(page);
    await swipe(cdp, at.x, at.y, at.x + 50, at.y + 60, 6);
    const after = parseBox((await svg.getAttribute("viewBox")) ?? "");
    expect(after.x).toBeLessThan(before.x);
    expect(after.y).toBeLessThan(before.y);
    await page.waitForTimeout(300);
    expect(await scrolls()).toEqual(scrollBefore);
  });
});

/* ── Plan 02: the TOP VIEW tab zooms; the computer's corner picture never does ─────────────── */

/** The blank seen from above — the TOP VIEW tab's drawing on a phone, the corner picture on a computer. */
function topViewSvg(page: Page): Locator {
  return page.locator('svg[aria-label^="The board\'s outline seen from above"]').first();
}

async function openTopViewTab(page: Page) {
  await openRocker(page);
  await pickFirstFittingBlank(page);
  await page.getByRole("tab", { name: "TOP VIEW" }).click();
  await expect(topViewSvg(page)).toBeVisible();
}

test.describe("261007-fnz the TOP VIEW tab — fingers (Android, real touch input)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "android", "CDP touch input is Chromium's");
  });

  test("a pinch zooms the TOP VIEW tab; at 3x one finger moves it and scrolls nothing; reset gives the finger back", async ({
    page,
  }) => {
    await dismissChrome(page);
    await openTopViewTab(page);
    const svg = topViewSvg(page);
    const base = (await svg.getAttribute("viewBox")) ?? "";
    await expect(page.locator("[data-viewer-zoom]")).toBeHidden();
    const box = await svg.boundingBox();
    if (!box) throw new Error("no TOP VIEW box");
    const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const cdp = await page.context().newCDPSession(page);
    await pinch(cdp, at.x, at.y, 40, 120);
    await expect.poll(async () => levelNumber(page)).toBeGreaterThan(1);
    await expect(zoomLevel(page)).toBeVisible();
    await resetButton(page).click();
    await expect(svg).toHaveAttribute("viewBox", base);

    await wheelOn(svg, at, 4);
    await expect(zoomLevel(page)).toHaveText("3x");
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));
    expect(await svg.evaluate((el) => getComputedStyle(el).touchAction)).toBe("none");
    const scrolls = () =>
      page.evaluate(() => ({ main: document.querySelector("main")?.scrollTop ?? 0, window: window.scrollY }));
    const scrollBefore = await scrolls();
    const before = parseBox((await svg.getAttribute("viewBox")) ?? "");
    await swipe(cdp, at.x, at.y, at.x + 40, at.y + 60, 6);
    const after = parseBox((await svg.getAttribute("viewBox")) ?? "");
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(0);
    expect(after.y).toBeLessThanOrEqual(before.y);
    await page.waitForTimeout(300);
    expect(await scrolls()).toEqual(scrollBefore);

    await resetButton(page).click();
    await expect(svg).toHaveAttribute("viewBox", base);
    expect(await svg.evaluate((el) => getComputedStyle(el).touchAction)).toBe("pan-x pan-y");
  });
});

test.describe("261007-fnz the TOP VIEW tab — iPhone", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "an iPhone");
  });

  test("the TOP VIEW tab zooms in and its zoom row appears; at 1x nothing new is drawn", async ({ page }) => {
    await dismissChrome(page);
    await openTopViewTab(page);
    const svg = topViewSvg(page);
    await expect(page.locator("[data-viewer-zoom]")).toBeHidden();
    await expect(page.locator("[data-zoom-grid]")).toHaveCount(0);
    const box = await svg.boundingBox();
    if (!box) throw new Error("no TOP VIEW box");
    await wheelOn(svg, { x: box.x + box.width / 2, y: box.y + box.height * 0.2 }, 4);
    await expect(zoomLevel(page)).toHaveText("3x");
    await expect(resetButton(page)).toBeVisible();
  });
});

test.describe("261007-fnz the computer's corner picture of the blank never zooms", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a mouse and its wheel");
  });

  test("the wheel over the corner picture leaves it exactly as it was", async ({ page }) => {
    await dismissChrome(page);
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const inset = page.locator("[data-top-view-inset] svg");
    await expect(inset).toBeVisible();
    const viewBox = (await inset.getAttribute("viewBox")) ?? "";
    const box = await inset.boundingBox();
    if (!box) throw new Error("no corner picture");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, -100);
    }
    await expect(inset).toHaveAttribute("viewBox", viewBox);
    await expect(page.locator("[data-top-view-inset] [data-zoom-grid]")).toHaveCount(0);
    for (let i = 0; i < 4; i++) await zoomInButton(page).click();
    await expect(inset).toHaveAttribute("viewBox", viewBox);
  });
});

/* ── Quick 261015-my3 (2026-10-15, D7): the WINGS close-up zooms like the VIEWER ──────────────── */

/** The WINGS close-up's svg. */
function wingsSvg(page: Page): Locator {
  return page.locator("svg[data-wing-close-up]");
}

/**
 * TEMPLATE with the two default wings ("+ Add a wing", "+ Add wing 2") on the default board, on the
 * WINGS tab, once React owns its toolbar. The first wing's pop-up is closed with "Got it".
 */
async function openWings(page: Page) {
  await openTemplate(page);
  await page.getByRole("tab", { name: "ADD WINGS" }).click();
  await page.getByRole("button", { name: "+ Add a wing" }).click();
  const dialog = page.getByRole("dialog", { name: "Dial in your wing placement" });
  await dialog.getByRole("button", { name: "Got it" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "+ Add wing 2" }).click();
  await expect(page.getByRole("tab", { name: "WINGS · 2" })).toBeVisible();
  await expect(wingsSvg(page)).toBeVisible();
  await page.waitForTimeout(300);
}

/** The close-up's lines and words at their on-screen size: a stroke's width or a text's font size
 * times the element's own screen scale. */
async function wingsScreenSizes(page: Page) {
  return wingsSvg(page).evaluate((svg) => {
    const scaleOf = (el: Element) => {
      const m = (el as SVGGraphicsElement).getScreenCTM();
      if (!m) throw new Error("no screen matrix");
      return Math.hypot(m.a, m.b);
    };
    const stroke = (el: Element | null | undefined, what: string) => {
      if (!el) throw new Error(`missing ${what}`);
      return Number.parseFloat(getComputedStyle(el).strokeWidth) * scaleOf(el);
    };
    const font = (el: Element | null | undefined, what: string) => {
      if (!el) throw new Error(`missing ${what}`);
      return Number.parseFloat(getComputedStyle(el).fontSize) * scaleOf(el);
    };
    const radius = (el: Element | null | undefined, what: string) => {
      if (!el) throw new Error(`missing ${what}`);
      return (el as SVGCircleElement).r.baseVal.value * scaleOf(el);
    };
    const card = svg.querySelector('[data-callout-chip^="WING 1"]');
    const cardTexts = card ? card.querySelectorAll(":scope > text") : [];
    return {
      board: stroke(svg.querySelector('[data-board-silhouette="wings"]'), "board line"),
      stringer: stroke(svg.querySelector("[data-wing-stringer]"), "stringer"),
      finMark: stroke(svg.querySelector("[data-fin-mark] line"), "fin mark"),
      noWingsCurve: stroke(svg.querySelector("[data-wing-base-outline]"), "no-wings curve"),
      cardFrame: stroke(card?.querySelector("rect"), "card frame"),
      cardName: font(cardTexts[0], "card name"),
      cardValue: font(cardTexts[1], "card value"),
      runRow: font(card?.querySelector('[data-wing-card-row="run"] text'), "RUN row"),
      tailBlockWords: font(svg.querySelector("[data-tail-block-words] tspan"), "tail block words"),
      grabPoint: radius(svg.querySelector("[data-wing-grab]"), "grab point"),
    };
  });
}

/** A point over the board below its widest part, clear of every grab point. */
async function overTheTail(page: Page) {
  const b = await page.locator('[data-board-silhouette="wings"]').boundingBox();
  if (!b) throw new Error("no board line");
  return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height * 0.55) };
}

test.describe("261015-my3 WINGS zoom — computer", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a mouse and its wheel");
  });

  test("the wheel zooms the close-up toward the pointer: the point under it stays put", async ({ page }) => {
    await dismissChrome(page);
    await openWings(page);
    const svg = wingsSvg(page);
    const base = (await svg.getAttribute("viewBox")) ?? "";
    await expect(zoomLevel(page)).toHaveText("1x");
    const at = await overTheTail(page);
    // The board-space point under the pointer, before and after.
    const boardPointUnder = () =>
      svg.evaluate((el, p) => {
        const m = (el as SVGSVGElement).getScreenCTM()!.inverse();
        const q = new DOMPoint(p.x, p.y).matrixTransform(m);
        return { x: q.x, y: q.y };
      }, at);
    const before = await boardPointUnder();
    await page.mouse.move(at.x, at.y);
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, -100);
    }
    await expect(zoomLevel(page)).toHaveText("3x");
    await expect(svg).not.toHaveAttribute("viewBox", base);
    const after = await boardPointUnder();
    const pxPerUnit = await svg.evaluate((el) => (el as SVGSVGElement).getScreenCTM()!.a);
    expect(Math.hypot(after.x - before.x, after.y - before.y) * pxPerUnit).toBeLessThan(2);
  });

  test("zoom in, zoom out and reset, and a double-click goes back to 1x", async ({ page }) => {
    await dismissChrome(page);
    await openWings(page);
    const svg = wingsSvg(page);
    const base = (await svg.getAttribute("viewBox")) ?? "";
    await expect(zoomOutButton(page)).toBeDisabled();
    await expect(resetButton(page)).toBeDisabled();
    await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("1.5x");
    await zoomOutButton(page).click();
    await expect(zoomLevel(page)).toHaveText("1x");
    for (let i = 0; i < 4; i++) await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("3x");
    await resetButton(page).click();
    await expect(zoomLevel(page)).toHaveText("1x");
    await expect(svg).toHaveAttribute("viewBox", base);
    for (let i = 0; i < 4; i++) await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("3x");
    const at = await overTheTail(page);
    await page.mouse.dblclick(at.x, at.y);
    await expect(zoomLevel(page)).toHaveText("1x");
    await expect(svg).toHaveAttribute("viewBox", base);
  });

  test("above 1x a drag on the close-up pans it, never past its edge; at 1x a drag changes nothing", async ({ page }) => {
    await dismissChrome(page);
    await openWings(page);
    const svg = wingsSvg(page);
    const base = parseBox((await svg.getAttribute("viewBox")) ?? "");
    const at = await overTheTail(page);

    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 80, at.y + 40, { steps: 6 });
    await page.mouse.up();
    expect(parseBox((await svg.getAttribute("viewBox")) ?? "")).toEqual(base);

    for (let i = 0; i < 4; i++) await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("3x");
    const before = parseBox((await svg.getAttribute("viewBox")) ?? "");
    const unitsPerPx = await svg.evaluate((el) => 1 / (el as SVGSVGElement).getScreenCTM()!.a);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x, at.y - 60, { steps: 6 });
    await page.mouse.up();
    const after = parseBox((await svg.getAttribute("viewBox")) ?? "");
    // The drawing followed the pointer up: the view moved down by 60 px of drawing.
    expect(after.y).toBeCloseTo(before.y + 60 * unitsPerPx, 1);

    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 3000, at.y + 3000, { steps: 10 });
    await page.mouse.up();
    const far = parseBox((await svg.getAttribute("viewBox")) ?? "");
    expect(far.x).toBeCloseTo(base.x, 3);
    expect(far.y).toBeCloseTo(base.y, 3);
  });

  test("lines, cards, words and grab points keep their screen size at 6x, and the board line stays the VIEWER's weight", async ({
    page,
  }) => {
    await dismissChrome(page);
    await openWings(page);
    await page.getByRole("button", { name: "Show drag points" }).click();
    await expect(zoomLevel(page)).toHaveText("1x");
    await page.waitForTimeout(300);
    const atOne = await wingsScreenSizes(page);
    for (let i = 0; i < 10; i++) await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("6x");
    await page.waitForTimeout(300);
    const atSix = await wingsScreenSizes(page);
    for (const key of Object.keys(atOne) as (keyof typeof atOne)[]) {
      expect(atOne[key], `${key} at 1x`).toBeGreaterThan(0);
      const tolerance = key.startsWith("card") || key.endsWith("Row") || key === "tailBlockWords" ? 0.5 : 0.05;
      expect(Math.abs(atSix[key] - atOne[key]), `${key}: ${atOne[key]} px at 1x, ${atSix[key]} px at 6x`).toBeLessThan(tolerance);
    }
    // D1: at 6x the board line is still the VIEWER's own at 1x in this window.
    await page.getByRole("tab", { name: "VIEWER" }).click();
    await expect(templateSvg(page)).toBeVisible();
    await page.waitForTimeout(300);
    const viewerLine = await page.locator('[data-board-silhouette="outline"]').evaluate((el) => {
      const m = (el as SVGGraphicsElement).getScreenCTM()!;
      return Number.parseFloat(getComputedStyle(el).strokeWidth) * Math.hypot(m.a, m.b);
    });
    expect(Math.abs(atSix.board - viewerLine)).toBeLessThanOrEqual(0.05);
  });

  test("at 3x a grab point drags its wing to where the pointer is, and the close-up holds still while it is held", async ({
    page,
  }) => {
    await dismissChrome(page);
    await openWings(page);
    // Wing 1, unlocked, so its outer point slides it along the rail.
    await page.getByRole("checkbox", { name: "Lock to front fin" }).click();
    await page.getByRole("button", { name: "Show drag points" }).click();
    const svg = wingsSvg(page);
    const grab = page.locator('[data-wing-grab="outer"][data-wing="1"]');
    const at0 = await grab.boundingBox();
    if (!at0) throw new Error("no grab point");
    // Zoom toward the grab point itself so it stays on screen.
    await page.mouse.move(at0.x + at0.width / 2, at0.y + at0.height / 2);
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, -100);
    }
    await expect(zoomLevel(page)).toHaveText("3x");
    await page.waitForTimeout(200);
    const at = await grab.boundingBox();
    if (!at) throw new Error("no grab point at 3x");
    const start = { x: at.x + at.width / 2, y: at.y + at.height / 2 };
    const position = page.locator('[data-wing-controls="1"]').getByText(/^Position from tail — /);
    const inches = (t: string | null) => {
      const m = (t ?? "").split(" — ")[1]?.match(/^(\d+)?\s*(?:(\d+)\/(\d+))?"/);
      if (!m) throw new Error(`not an inch reading: ${t}`);
      return Number(m[1] ?? 0) + (m[2] ? Number(m[2]) / Number(m[3]) : 0);
    };
    const before = inches(await position.textContent());
    const ppi = await svg.evaluate((el) => Number((el as SVGSVGElement).dataset.unitsPerInch) * (el as SVGSVGElement).getScreenCTM()!.a);
    const viewBox = await svg.getAttribute("viewBox");
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await expect(svg).toHaveAttribute("data-held", "true");
    await page.mouse.move(start.x, start.y - ppi / 2, { steps: 6 });
    // Held still: the window and the zoomed view read what they read before the press.
    await expect(svg).toHaveAttribute("viewBox", viewBox ?? "");
    await page.mouse.up();
    // Half an inch toward the nose, within one 1/16" step.
    await expect.poll(async () => Math.abs(inches(await position.textContent()) - before - 0.5)).toBeLessThanOrEqual(1 / 16 + 1e-9);
    await expect(zoomLevel(page)).toHaveText("3x");
  });


  // The orchestrator's ruling (2026-10-15): "zoom like the viewer" includes the VIEWER's grid. At 3x
  // on a 1280 x 800 window the close-up draws about 66 px per inch, so the finest rung 20 px apart is
  // 1/2" (1 cm in Metric), the inch (2 cm) lines darker.
  for (const system of ["imperial", "metric"] as const) {
    const [stepMm, majorMm, words] = system === "imperial" ? [12.7, 25.4, "1/2-inch lines, the inch lines"] : [10, 20, "1 cm lines, the 2 cm lines"];
    test(`the grid (${system}): none at 1x; at 3x on the tail the ${words} darker, counted from the tail tip and the stringer`, async ({
      page,
    }) => {
      await dismissChrome(page);
      if (system === "metric") await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
      await openWings(page);
      const grid = page.locator("[data-wing-close-up] [data-zoom-grid]");
      await expect(zoomLevel(page)).toHaveText("1x");
      await expect(grid).toHaveCount(0);
      const at = await overTheTail(page);
      await page.mouse.move(at.x, at.y);
      for (let i = 0; i < 4; i++) {
        await page.waitForTimeout(200);
        await page.mouse.wheel(0, -100);
      }
      await expect(zoomLevel(page)).toHaveText("3x");
      await expect(grid).toHaveCount(1);
      const read = await wingsSvg(page).evaluate(
        (svg, { stepMm, majorMm }) => {
          const n = (l: Element, a: string) => Number(l.getAttribute(a));
          const unitsPerMm = Number((svg as SVGSVGElement).dataset.unitsPerInch) / 25.4;
          const stringer = svg.querySelector("[data-wing-stringer]")!;
          const stringerX = n(stringer, "x1");
          const tailY = n(stringer, "y2") - 6;
          const lines = [...svg.querySelectorAll("[data-zoom-grid] line")];
          const across = lines.filter((l) => n(l, "x1") === n(l, "x2"));
          const along = lines.filter((l) => n(l, "y1") === n(l, "y2"));
          const onGrid = (units: number, stepMmHere: number) => {
            const k = units / unitsPerMm / stepMmHere;
            return Math.abs(k - Math.round(k)) < 2e-3;
          };
          const offset = (l: Element) => (n(l, "x1") === n(l, "x2") ? n(l, "x1") - stringerX : tailY - n(l, "y1"));
          const spacing = across.length > 1 ? Math.abs(n(across[1], "x1") - n(across[0], "x1")) / unitsPerMm : 0;
          return {
            spacingMm: Math.round(spacing * 10) / 10,
            acrossOnGrid: across.length > 0 && across.every((l) => onGrid(offset(l), stepMm)),
            alongOnGrid: along.length > 0 && along.every((l) => onGrid(offset(l), stepMm)),
            majorsOnTheirGrid: lines.filter((l) => l.hasAttribute("data-major")).every((l) => onGrid(offset(l), majorMm)),
            someMinor: lines.some((l) => !l.hasAttribute("data-major")),
            someMajor: lines.some((l) => l.hasAttribute("data-major")),
          };
        },
        { stepMm, majorMm },
      );
      expect(read).toEqual({
        spacingMm: stepMm,
        acrossOnGrid: true,
        alongOnGrid: true,
        majorsOnTheirGrid: true,
        someMinor: true,
        someMajor: true,
      });
    });
  }

  test("switching to VIEWER and back starts the close-up at 1x; nothing about the zoom is saved", async ({ page }) => {
    await dismissChrome(page);
    await openWings(page);
    for (let i = 0; i < 4; i++) await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("3x");
    await page.getByRole("tab", { name: "VIEWER" }).click();
    await expect(zoomLevel(page)).toHaveText("1x");
    await page.getByRole("tab", { name: /^WINGS/ }).click();
    await expect(zoomLevel(page)).toHaveText("1x");
    for (let i = 0; i < 4; i++) await zoomInButton(page).click();
    await expect(zoomLevel(page)).toHaveText("3x");
    const keys = await page.evaluate(() => [...Object.keys(window.localStorage), ...Object.keys(window.sessionStorage)]);
    expect(keys.filter((key) => /zoom/i.test(key))).toEqual([]);
    const values = await page.evaluate(() =>
      [...Object.values(window.localStorage), ...Object.values(window.sessionStorage)].join("\n"),
    );
    expect(values).not.toMatch(/zoom/i);
    await page.reload();
    await page.waitForFunction(() => {
      const el = document.querySelector("[data-viewer-toolbar] button");
      return !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
    });
    // A reload starts a fresh board (signed out, nothing saved here), so the tab may read ADD WINGS.
    await page.getByRole("tab", { name: /WINGS/ }).click();
    await expect(wingsSvg(page)).toBeVisible();
    await expect(zoomLevel(page)).toHaveText("1x");
  });
});

test.describe("261015-my3 WINGS zoom — fingers (Android, real touch input)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "android", "CDP touch input is Chromium's");
  });

  test("two fingers pinch the close-up in and the page never zooms; a double-tap goes back to 1x; one finger on a grab point drags its wing while zoomed", async ({
    page,
  }) => {
    test.slow();
    await dismissChrome(page);
    await page.goto("/design/outline");
    await page.getByRole("tab", { name: "ADD WINGS" }).click();
    await page.locator("[data-design-controls-scroll]").getByRole("button", { name: "+ Add a wing" }).click();
    const dialog = page.getByRole("dialog", { name: "Dial in your wing placement" });
    await dialog.getByRole("button", { name: "Got it" }).click();
    await expect(dialog).toHaveCount(0);
    // Unlocked, so the outer grab point slides wing 1 along the rail.
    await page.getByRole("checkbox", { name: "Lock to front fin" }).click();
    await expect(page.getByRole("slider", { name: "Wing 1 position from tail" })).toBeEnabled();
    // The drawing back in view above the stacked controls.
    await wingsSvg(page).scrollIntoViewIfNeeded();
    const svg = wingsSvg(page);
    const grab = page.locator('[data-wing-grab="outer"][data-wing="1"]');
    await expect(grab).toHaveCount(1);
    const cdp = await page.context().newCDPSession(page);

    const g0 = await grab.boundingBox();
    if (!g0) throw new Error("no grab point");
    const gc = { x: g0.x + g0.width / 2, y: g0.y + g0.height / 2 };
    // Two fingers either side of the grab point (30 px off it, outside its 22 px reach), spreading:
    // the close-up zooms in about the grab point, which stays where it is.
    await pinch(cdp, gc.x, gc.y, 60, 140);
    await expect.poll(async () => levelNumber(page)).toBeGreaterThan(1);
    expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
    const level = await levelNumber(page);

    // One finger on the grab point drags the wing toward the nose, and never pans.
    const g1 = await grab.boundingBox();
    if (!g1) throw new Error("no grab point zoomed");
    const position = page.locator('[data-wing-controls="1"]').getByText(/^Position from tail — /);
    const before = await position.textContent();
    const viewBox = await svg.getAttribute("viewBox");
    await swipe(cdp, g1.x + g1.width / 2, g1.y + g1.height / 2, g1.x + g1.width / 2, g1.y + g1.height / 2 - 40, 6);
    await expect(position).not.toHaveText(before ?? "");
    expect(await levelNumber(page)).toBe(level);
    await expect(svg).toHaveAttribute("viewBox", viewBox ?? "");

    // A double-tap on empty canvas goes back to 1x.
    const box = await svg.boundingBox();
    if (!box) throw new Error("no close-up box");
    const empty = { x: box.x + box.width - 30, y: box.y + box.height - 30 };
    for (let i = 0; i < 2; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: empty.x, y: empty.y, id: 0 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(80);
    }
    await expect.poll(async () => levelNumber(page)).toBe(1);
  });
});
