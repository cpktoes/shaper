import { expect, test, type Locator, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { countDifferent, decodePng } from "./helpers/canvas-pixels";

/**
 * Zooming and sliding the 3D board (Phase 16, plan 09, UI-SPEC §4–§5, D-13, D-28): the zoom row every drawing has,
 * the wheel, a pinch, a slide by right-drag, Shift-drag or two fingers, double-click back to 1x, the keys, and Wide
 * view. The camera never moves — zoom and slide crop the picture it takes — so the room's `data-room` report never
 * changes and the board is lit the same zoomed as at 1x.
 *
 * The host reports what the tests read: `data-crop` (the level, then the slide as two fractions of the picture),
 * `data-turn`, `data-room` and `data-frames`.
 */

/** WebKit draws its first frame more slowly on the suite's development server (about 5 s measured). */
const FIRST_FRAME_MS = 30_000;

async function dismissStrips(page: Page) {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
      // These measure the board against a plain ground, so the room is off (the Room switch's own path, 16-18).
      (globalThis as { __shaper3dBareRoom?: boolean }).__shaper3dBareRoom = true;
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
}

function boardHost(page: Page) {
  return page.locator("[data-board-3d]");
}

async function frames(host: Locator) {
  return Number((await host.getAttribute("data-frames")) ?? 0);
}

async function waitForBoard(page: Page) {
  const host = boardHost(page);
  await expect(host).toHaveAttribute("data-board-state", "ready", { timeout: FIRST_FRAME_MS });
  await expect.poll(async () => frames(host), { timeout: FIRST_FRAME_MS }).toBeGreaterThanOrEqual(1);
  // React owns the zoom row's buttons (a click before hydration is lost).
  await page.waitForFunction(() => {
    const el = document.querySelector("[data-viewer-zoom] button");
    return !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
  });
  return host;
}

/** Waits until the board has stopped drawing: the same frame count across a quarter second. */
async function drawn(host: Locator) {
  let last = -1;
  await expect
    .poll(
      async () => {
        const now = await frames(host);
        const same = now === last;
        last = now;
        return same;
      },
      { intervals: [250], timeout: 10_000 },
    )
    .toBe(true);
}

function zoomRow(page: Page) {
  return page.getByRole("group", { name: "Zoom", exact: true });
}

function zoomLevel(page: Page) {
  return zoomRow(page).locator("[data-zoom-level]");
}

async function cropOf(host: Locator): Promise<{ zoom: number; cx: number; cy: number }> {
  const [zoom, cx, cy] = ((await host.getAttribute("data-crop")) ?? "1 0 0").split(" ").map(Number);
  return { zoom, cx, cy };
}

/** What the hidden live region says. */
function spoken(page: Page) {
  return page.locator("[data-three-d-spoken]");
}

/** The canvas's picture in CSS dots, with the corner toolbar and zoom row hidden so only the board is read. */
async function canvasPixels(host: Locator) {
  return decodePng(
    await host.screenshot({ scale: "css", style: "[data-viewer-zoom], [data-viewer-toolbar] { visibility: hidden !important; }" }),
  );
}

type Picture = Awaited<ReturnType<typeof canvasPixels>>;

function pixel(pic: Picture, x: number, y: number): [number, number, number] {
  const i = 4 * (Math.round(y) * pic.width + Math.round(x));
  return [pic.rgba[i], pic.rgba[i + 1], pic.rgba[i + 2]];
}

/** The ground the board stands on: a pixel a little in from the canvas's top-left corner. */
function groundOf(pic: Picture) {
  return pixel(pic, 10, 10);
}

const unlike = (a: readonly number[], b: readonly number[], tol: number) => a.some((v, i) => Math.abs(v - b[i]) > tol);

/** How far in from each corner the canvas's rounded edge shows the page behind it, not its ground. */
const CORNER_DOTS = 8;

/** The board's box on the canvas: every pixel unlike the ground, in CSS dots (null if none). The four rounded
 * corners are skipped. */
function litBox(pic: Picture, ground = groundOf(pic)) {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (let y = 0; y < pic.height; y++) {
    for (let x = 0; x < pic.width; x++) {
      const inCorner =
        (x < CORNER_DOTS || x >= pic.width - CORNER_DOTS) && (y < CORNER_DOTS || y >= pic.height - CORNER_DOTS);
      if (inCorner || !unlike(pixel(pic, x, y), ground, 12)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return Number.isFinite(left) ? { left, top, right, bottom } : null;
}

/** The mean colour of the (2r+1)² patch about (x, y). */
function patchMean(pic: Picture, x: number, y: number, r = 2): [number, number, number] {
  const sum = [0, 0, 0];
  let n = 0;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const p = pixel(pic, x + dx, y + dy);
      sum[0] += p[0];
      sum[1] += p[1];
      sum[2] += p[2];
      n++;
    }
  }
  return [sum[0] / n, sum[1] / n, sum[2] / n];
}

/**
 * A point on plain lit foam inside `region` (fractions of the canvas): its 7 × 7 patch all unlike the ground
 * and nearly one colour — off the stringer, off the rail's edge — so its colour can be compared zoomed and not.
 */
function foamPoint(pic: Picture, region: { x0: number; x1: number; y0: number; y1: number }) {
  const ground = groundOf(pic);
  const candidates: { x: number; y: number; d: number }[] = [];
  const mx = ((region.x0 + region.x1) / 2) * pic.width;
  const my = ((region.y0 + region.y1) / 2) * pic.height;
  for (let y = Math.ceil(region.y0 * pic.height); y <= region.y1 * pic.height; y += 3) {
    for (let x = Math.ceil(region.x0 * pic.width); x <= region.x1 * pic.width; x += 3) {
      candidates.push({ x, y, d: Math.hypot(x - mx, y - my) });
    }
  }
  candidates.sort((a, b) => a.d - b.d);
  for (const { x, y } of candidates) {
    let ok = true;
    const lo = [255, 255, 255];
    const hi = [0, 0, 0];
    for (let dy = -3; dy <= 3 && ok; dy++) {
      for (let dx = -3; dx <= 3 && ok; dx++) {
        const p = pixel(pic, x + dx, y + dy);
        if (!unlike(p, ground, 12)) ok = false;
        for (let c = 0; c < 3; c++) {
          lo[c] = Math.min(lo[c], p[c]);
          hi[c] = Math.max(hi[c], p[c]);
        }
      }
    }
    if (ok && hi.every((v, c) => v - lo[c] <= 6)) return { x, y };
  }
  throw new Error("no plain foam found on the board");
}

/** Runs `change`, then waits for the scene to draw the frame it asked for and to rest. */
async function afterFrame(host: Locator, change: () => Promise<unknown>) {
  const before = await frames(host);
  await change();
  await expect.poll(async () => frames(host), { timeout: 10_000 }).toBeGreaterThan(before);
  await drawn(host);
}

/** One wheel notch at (x, y) on the canvas (CSS dots from its corner), after the wheel's burst gap. */
async function wheelAt(page: Page, host: Locator, x: number, y: number, deltaY: number) {
  const box = await host.boundingBox();
  if (!box) throw new Error("the 3D canvas has no box");
  await page.mouse.move(box.x + x, box.y + y);
  await page.waitForTimeout(200);
  await page.mouse.wheel(0, deltaY);
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  await dismissStrips(page);
});

test.describe("zooming the 3D board", () => {
  test("1. the zoom row every drawing has zooms the camera's picture, and the wheel zooms toward the pointer", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer drives the mouse's zoom row");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await drawn(host);

    // The inherited row: − level + Back to 1x, the out and reset buttons dimmed at 1x.
    await expect(zoomRow(page)).toBeVisible();
    await expect(zoomLevel(page)).toHaveText("1x");
    await expect(zoomRow(page).getByRole("button", { name: "Back to 1x — the whole drawing", exact: true })).toBeDisabled();
    await expect(zoomRow(page).getByRole("button", { name: "Zoom out", exact: true })).toBeDisabled();
    await expect(zoomRow(page).getByRole("button", { name: "Zoom in", exact: true })).toBeEnabled();
    const roomBefore = await host.getAttribute("data-room");
    expect(roomBefore).toBeTruthy();
    const atOne = await canvasPixels(host);

    // Zoom in: 1.5x, the picture changes, and the camera and the lights have not moved.
    await afterFrame(host, () => zoomRow(page).getByRole("button", { name: "Zoom in", exact: true }).click());
    await expect(zoomLevel(page)).toHaveText("1.5x");
    expect((await cropOf(host)).zoom).toBe(1.5);
    expect(await host.getAttribute("data-room")).toBe(roomBefore);
    const zoomed = await canvasPixels(host);
    expect(countDifferent(atOne.rgba, zoomed.rgba, 2) / (zoomed.width * zoomed.height)).toBeGreaterThan(0.01);
    await expect(zoomRow(page).getByRole("button", { name: "Zoom out", exact: true })).toBeEnabled();

    // One wheel notch up over the foam near the nose's end of the board: 2x, and the same foam stays under the
    // pointer.
    const box = litBox(zoomed);
    if (!box) throw new Error("no board on the canvas");
    const p = foamPoint(zoomed, {
      x0: (box.left + (box.right - box.left) * 0.15) / zoomed.width,
      x1: (box.left + (box.right - box.left) * 0.3) / zoomed.width,
      y0: (box.top + (box.bottom - box.top) * 0.25) / zoomed.height,
      y1: (box.top + (box.bottom - box.top) * 0.75) / zoomed.height,
    });
    const colourBefore = patchMean(zoomed, p.x, p.y);
    await afterFrame(host, () => wheelAt(page, host, p.x, p.y, -100));
    await expect(zoomLevel(page)).toHaveText("2x");
    const closer = await canvasPixels(host);
    const colourAfter = patchMean(closer, p.x, p.y);
    expect(colourAfter.every((v, c) => Math.abs(v - colourBefore[c]) <= 8)).toBe(true);
    expect(await host.getAttribute("data-room")).toBe(roomBefore);
    // The page never scrolled from the wheel.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    // Back to 1x: the whole picture again, and a screen reader hears it.
    await afterFrame(host, () => zoomRow(page).getByRole("button", { name: "Back to 1x — the whole drawing", exact: true }).click());
    await expect(zoomLevel(page)).toHaveText("1x");
    expect(await cropOf(host)).toEqual({ zoom: 1, cx: 0, cy: 0 });
    await expect(spoken(page)).toHaveText(THREE_D_COPY.oneXSpoken);
    const back = await canvasPixels(host);
    expect(countDifferent(atOne.rgba, back.rgba, 2)).toBeLessThan(50);
  });
});

/** The canvas's corner on the page, in CSS dots. */
async function hostBox(host: Locator) {
  const box = await host.boundingBox();
  if (!box) throw new Error("the 3D canvas has no box");
  return box;
}

/** A mouse drag across the canvas from its centre by (dx, dy) with `button`, Shift held if asked. */
async function mouseDrag(
  page: Page,
  host: Locator,
  dx: number,
  dy: number,
  { button = "left", shift = false, during }: { button?: "left" | "right" | "middle"; shift?: boolean; during?: () => Promise<void> } = {},
) {
  const box = await hostBox(host);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  if (shift) await page.keyboard.down("Shift");
  await page.mouse.down({ button });
  await page.mouse.move(x + dx, y + dy, { steps: 6 });
  if (during) await during();
  await page.mouse.up({ button });
  if (shift) await page.keyboard.up("Shift");
}

async function backToOneByButton(page: Page, host: Locator) {
  await afterFrame(host, () => zoomRow(page).getByRole("button", { name: "Back to 1x — the whole drawing", exact: true }).click());
  await expect(zoomLevel(page)).toHaveText("1x");
}

test.describe("sliding the 3D board", () => {
  test("2. a right-drag or a Shift-drag slides the board exactly with the pointer, and a long one can't lose it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer drives the mouse");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await drawn(host);
    const turn = await host.getAttribute("data-turn");
    const room = await host.getAttribute("data-room");
    const start = litBox(await canvasPixels(host));
    if (!start) throw new Error("no board on the canvas");

    // Right-drag 100 dots across and 40 down: the board's near corner moves exactly as far. The cursor shows the
    // slide while the button is down.
    let cursorWhileSliding = "";
    await afterFrame(host, () =>
      mouseDrag(page, host, 100, 40, {
        button: "right",
        during: async () => {
          cursorWhileSliding = await host.evaluate((el) => (el as HTMLElement).style.cursor);
        },
      }),
    );
    expect(cursorWhileSliding).toBe("move");
    expect(await host.evaluate((el) => (el as HTMLElement).style.cursor)).toBe("");
    const slid = litBox(await canvasPixels(host));
    if (!slid) throw new Error("the board went missing");
    expect(Math.abs(slid.left - start.left - 100)).toBeLessThanOrEqual(2);
    expect(Math.abs(slid.top - start.top - 40)).toBeLessThanOrEqual(2);
    // Sliding is not turning, the camera stays put, and Back to 1x (now live, to undo the slide) brings it back.
    expect(await host.getAttribute("data-turn")).toBe(turn);
    expect(await host.getAttribute("data-room")).toBe(room);
    await expect(zoomLevel(page)).toHaveText("1x");
    await backToOneByButton(page, host);
    const back = litBox(await canvasPixels(host));
    expect(back?.left).toBe(start.left);

    // Shift + drag (a one-button trackpad) slides the same way.
    await afterFrame(host, () => mouseDrag(page, host, 100, 40, { shift: true }));
    const shifted = litBox(await canvasPixels(host));
    if (!shifted) throw new Error("the board went missing");
    expect(Math.abs(shifted.left - start.left - 100)).toBeLessThanOrEqual(2);
    expect(Math.abs(shifted.top - start.top - 40)).toBeLessThanOrEqual(2);
    expect(await host.getAttribute("data-turn")).toBe(turn);
    await backToOneByButton(page, host);

    // A very long slide stops with the board's centre on the canvas's edge: half the board is still in view.
    await afterFrame(host, () => mouseDrag(page, host, 3_000, 0, { button: "right" }));
    expect((await cropOf(host)).cx).toBeCloseTo(-0.5, 4);
    const far = await canvasPixels(host);
    const farBox = litBox(far);
    if (!farBox) throw new Error("the board was slid out of the window");
    expect(farBox.left).toBeLessThan(far.width - 50);
    expect(farBox.right).toBeGreaterThanOrEqual(far.width - 2);
    // The right-click menu never opened (the page would have lost the mouse's up).
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("3. a double-click goes back to 1x: zoom and slide undone, the turn kept", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer drives the mouse");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await drawn(host);
    // Turn the board a little first, so "the turn kept" means something.
    await afterFrame(host, async () => {
      await host.focus();
      await page.keyboard.press("ArrowRight");
    });
    const turn = await host.getAttribute("data-turn");
    expect(turn).not.toBe("0.0000 0.0000 0.0000 1.0000");
    const turnedAtOne = litBox(await canvasPixels(host));
    await afterFrame(host, () => zoomRow(page).getByRole("button", { name: "Zoom in", exact: true }).click());
    await afterFrame(host, () => zoomRow(page).getByRole("button", { name: "Zoom in", exact: true }).click());
    await afterFrame(host, () => mouseDrag(page, host, 60, -30, { button: "right" }));
    expect(await cropOf(host)).not.toEqual({ zoom: 1, cx: 0, cy: 0 });

    const box = await hostBox(host);
    await afterFrame(host, () => page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2));
    await expect(zoomLevel(page)).toHaveText("1x");
    expect(await cropOf(host)).toEqual({ zoom: 1, cx: 0, cy: 0 });
    expect(await host.getAttribute("data-turn")).toBe(turn);
    await expect(spoken(page)).toHaveText(THREE_D_COPY.oneXSpoken);
    expect(litBox(await canvasPixels(host))).toEqual(turnedAtOne);
  });

  test("4. the keys: plus and minus zoom, Shift with an arrow slides, 0 goes back to 1x — the page never scrolls", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer has the keyboard");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await drawn(host);
    await host.focus();
    const turn = await host.getAttribute("data-turn");

    // Shift + → slides the board a twentieth of the canvas to the right (read at 1x, where the whole board is in
    // view); the turn is untouched.
    const before = litBox(await canvasPixels(host));
    if (!before) throw new Error("no board on the canvas");
    const { width } = await hostBox(host);
    await afterFrame(host, () => page.keyboard.press("Shift+ArrowRight"));
    const after = litBox(await canvasPixels(host));
    if (!after) throw new Error("the board went missing");
    expect(Math.abs(after.left - before.left - width / 20)).toBeLessThanOrEqual(2);
    expect(await host.getAttribute("data-turn")).toBe(turn);
    await afterFrame(host, () => page.keyboard.press("Shift+ArrowDown"));
    expect((await cropOf(host)).cy).toBeLessThan(0);

    // + (or =) and − zoom one step about the canvas's centre.
    await afterFrame(host, () => page.keyboard.type("+"));
    await expect(zoomLevel(page)).toHaveText("1.5x");
    await afterFrame(host, () => page.keyboard.press("Minus"));
    await expect(zoomLevel(page)).toHaveText("1x");
    await afterFrame(host, () => page.keyboard.press("Equal"));
    await expect(zoomLevel(page)).toHaveText("1.5x");

    // 0: back to 1x at once, and a screen reader hears it.
    await afterFrame(host, () => page.keyboard.press("Digit0"));
    await expect(zoomLevel(page)).toHaveText("1x");
    expect(await cropOf(host)).toEqual({ zoom: 1, cx: 0, cy: 0 });
    await expect(spoken(page)).toHaveText(THREE_D_COPY.oneXSpoken);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    // The canvas keeps focus throughout, and Tab still leaves it.
    await expect(host).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(host).not.toBeFocused();
  });
});

test.describe("fingers on the 3D board (Android, real touch input)", () => {
  test("5. two fingers pinch-zoom and slide, only the level and Back to 1x draw, a double-tap goes back, the page never scrolls", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "trusted touches through Chromium's own input pipeline");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await drawn(host);
    // At 1x a touch screen shows no zoom row at all.
    await expect(zoomRow(page)).toBeHidden();
    const turn = await host.getAttribute("data-turn");
    const room = await host.getAttribute("data-room");
    const scroller = page.locator("[data-design-controls-scroll]").first();
    const panelScroll = await scroller.evaluate((el) => el.scrollTop);

    const box = await hostBox(host);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const cdp = await page.context().newCDPSession(page);
    const two = (d: number, shift = 0) => [
      { x: cx - d / 2 + shift, y: cy, id: 0 },
      { x: cx + d / 2 + shift, y: cy, id: 1 },
    ];
    // Spread the fingers from 100 to 250 dots apart: 2.5x.
    await afterFrame(host, async () => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: two(100) });
      for (let i = 1; i <= 8; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: two(100 + (150 * i) / 8) });
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    });
    await expect(zoomLevel(page)).toHaveText("2.5x");
    expect(await host.getAttribute("data-turn")).toBe(turn);
    // The touch rule: the level and Back to 1x, no zoom buttons beside them.
    await expect(zoomRow(page)).toBeVisible();
    await expect(zoomRow(page).getByRole("button", { name: "Back to 1x — the whole drawing", exact: true })).toBeVisible();
    await expect(zoomRow(page).getByRole("button", { name: "Zoom in", exact: true })).toBeHidden();
    await expect(zoomRow(page).getByRole("button", { name: "Zoom out", exact: true })).toBeHidden();

    // Both fingers moving together slide the board, at the same level.
    const before = await cropOf(host);
    await afterFrame(host, async () => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: two(150) });
      for (let i = 1; i <= 8; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: two(150, (60 * i) / 8) });
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    });
    const after = await cropOf(host);
    expect(after.zoom).toBe(2.5);
    expect(after.cx).toBeLessThan(before.cx);
    expect(await host.getAttribute("data-turn")).toBe(turn);
    expect(await host.getAttribute("data-room")).toBe(room);

    // A double-tap: back to 1x, the zoom row gone again.
    await afterFrame(host, async () => {
      for (let i = 0; i < 2; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy, id: 0 }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      }
    });
    expect(await cropOf(host)).toEqual({ zoom: 1, cx: 0, cy: 0 });
    await expect(zoomRow(page)).toBeHidden();
    await cdp.detach();

    // Nothing scrolled: not the page, not the panel.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(await scroller.evaluate((el) => el.scrollTop)).toBe(panelScroll);
  });

  test("6. an upright iPhone at 1x shows only the five switches over the board", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "the iPhone's own touch rule");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await drawn(host);
    await expect(page.locator("[data-viewer-zoom]")).toHaveCount(1);
    await expect(zoomRow(page)).toBeHidden();
    await expect(page.getByRole("button", { name: "Hide the sidebar for a wider view" })).toBeHidden();
    // No Rotate button on the 3D screen (D-04), since turning the phone already turns the board: Fins, Blank, Contour
    // Stripes, Wire View and the Room alone (D-35, D-42, D-43).
    await expect(page.locator("[data-viewer-toolbar] button:visible")).toHaveCount(5);
    const names = await page
      .locator("[data-viewer-toolbar] button:visible")
      .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")));
    expect(names).toEqual([THREE_D_COPY.fins, THREE_D_COPY.blank, THREE_D_COPY.contourStripes, THREE_D_COPY.wireView, THREE_D_COPY.room]);
  });
});

test.describe("Wide view on the 3D screen", () => {
  test("7. Wide view hides the sidebar and widens the canvas at the same zoom; it shows from 820 wide, and below it the zoom row stays under the icon row", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's sidebar");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await drawn(host);
    const aside = page.locator("aside").first();
    await expect(aside).toBeVisible();
    await afterFrame(host, () => zoomRow(page).getByRole("button", { name: "Zoom in", exact: true }).click());
    await afterFrame(host, () => zoomRow(page).getByRole("button", { name: "Zoom in", exact: true }).click());
    const crop = await cropOf(host);
    expect(crop.zoom).toBe(2);
    const narrow = await hostBox(host);
    const turn = await host.getAttribute("data-turn");

    const wide = page.getByRole("button", { name: "Hide the sidebar for a wider view", exact: true });
    await expect(wide).toHaveAttribute("title", "Wide view");
    await afterFrame(host, () => wide.click());
    await expect(aside).toBeHidden();
    const shown = page.getByRole("button", { name: "Show the sidebar", exact: true });
    await expect(shown).toHaveAttribute("aria-pressed", "true");
    expect((await hostBox(host)).width).toBeGreaterThan(narrow.width + 200);
    await expect(zoomLevel(page)).toHaveText("2x");
    expect(await cropOf(host)).toEqual(crop);
    expect(await host.getAttribute("data-turn")).toBe(turn);
    // The board is still drawn, re-framed for the wider canvas.
    expect(litBox(await canvasPixels(host))).not.toBeNull();

    await afterFrame(host, () => shown.click());
    await expect(aside).toBeVisible();
    await expect(zoomLevel(page)).toHaveText("2x");

    // 820 wide: the shell, with Wide view and the zoom row under the icon row.
    await page.setViewportSize({ width: 820, height: 800 });
    await expect(wide).toBeVisible();
    const at820 = await hostBox(host);
    const row820 = await zoomRow(page).boundingBox();
    expect(row820 && row820.y - at820.y).toBeGreaterThanOrEqual(38);
    await expect(zoomLevel(page)).toHaveText("2x");
    // Below 820: no Wide view, and the zoom row stays under the icons, which hold the corner at every width (D-35).
    await page.setViewportSize({ width: 800, height: 800 });
    await expect(wide).toBeHidden();
    await expect
      .poll(async () => {
        const h = await hostBox(host);
        const r = await zoomRow(page).boundingBox();
        return r ? Math.round(r.y - h.y) : null;
      })
      .toBeGreaterThanOrEqual(38);
    await expect(zoomLevel(page)).toHaveText("2x");
  });

  test("8. with no 3D drawing there is no zoom row, but Wide view stays", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's sidebar");
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = function () {
        return null;
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await page.goto("/design/3d");
    await expect(boardHost(page)).toHaveAttribute("data-board-state", "no-webgl", { timeout: FIRST_FRAME_MS });
    await expect(page.locator("[data-canvas-message]")).toBeVisible();
    await expect(page.locator("[data-viewer-zoom]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Hide the sidebar for a wider view", exact: true })).toBeVisible();
  });
});

test.describe("the lights never move", () => {
  test("9. zoomed to 4x and slid, the camera and the lights are where they were, and the same foam is the same colour", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's software renderer gives the same pixels every run");
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await drawn(host);
    const room = await host.getAttribute("data-room");
    const atOne = await canvasPixels(host);
    // Plain foam near the board's middle, so the crop's hold at 4x never stops the zoom early.
    const p = foamPoint(atOne, { x0: 0.42, x1: 0.58, y0: 0.4, y1: 0.6 });
    const colourAtOne = patchMean(atOne, p.x, p.y);

    // Six notches at that point: 4x, the same foam still under the pointer.
    for (let i = 0; i < 6; i++) await afterFrame(host, () => wheelAt(page, host, p.x, p.y, -100));
    await expect(zoomLevel(page)).toHaveText("4x");
    expect(await host.getAttribute("data-room")).toBe(room);
    const atFour = await canvasPixels(host);
    const colourAtFour = patchMean(atFour, p.x, p.y);
    expect(colourAtFour.every((v, c) => Math.abs(v - colourAtOne[c]) <= 6)).toBe(true);

    // Slid 40 dots right: the same foam has moved with the board and is still the same colour.
    await afterFrame(host, () => mouseDrag(page, host, 40, 0, { button: "right" }));
    expect(await host.getAttribute("data-room")).toBe(room);
    const slid = await canvasPixels(host);
    const colourSlid = patchMean(slid, p.x + 40, p.y);
    expect(colourSlid.every((v, c) => Math.abs(v - colourAtOne[c]) <= 6)).toBe(true);
  });
});
