import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The browser proof for zooming a drawing (quick 261007-fnz, 2026-10-07), shown first on ROCKER's
 * side view. The founder's brief: the mouse wheel and a trackpad pinch zoom the drawing from 1x to
 * 10x in half steps toward the pointer, a phone pinches and pans, a drag pans once zoomed in, a
 * small control shows the level with zoom out, zoom in and reset, a double-click or a double-tap
 * goes back to 1x, lines and words keep their size on screen, a grid appears as the shaper zooms
 * in, and nothing is saved.
 *
 * What a shaper would see, test by test, is in each test's name. No blank name is typed here: the
 * tests pick "the first row under FITS THIS BOARD", exactly as `rocker-top-view.spec.ts` does.
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

function blankList(page: Page): Locator {
  return page.getByRole("list", { name: "Blanks" });
}

async function openRocker(page: Page) {
  await page.goto("/design/rocker");
  await expect(blankList(page)).toBeVisible({ timeout: 30_000 });
  // The list streams in server-rendered and becomes live only once React hydrates it.
  await page.waitForFunction(() => {
    const owned = (el: Element | null) => !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
    return (
      owned(document.querySelector('ul[aria-label="Blanks"] button')) &&
      owned(document.querySelector('input[aria-label="Search blanks"]'))
    );
  });
}

async function pickFirstFittingBlank(page: Page): Promise<string> {
  const row = blankList(page).locator('li[data-group="fits"] button').first();
  const name = (await row.locator("[data-blank-name]").innerText()).trim();
  expect(name.length).toBeGreaterThan(0);
  await row.click();
  await expect(page.locator("[data-picked-blank]")).toContainText(name);
  return name;
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
    await page.getByRole("button", { name: "Show construction lines" }).click();
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
    await page.getByRole("button", { name: "Show construction lines" }).click();
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
      await page.getByRole("button", { name: "Show construction lines" }).click();
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
