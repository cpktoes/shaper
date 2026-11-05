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

/** The board's box on the canvas: every pixel unlike the ground, in CSS dots (null if none). */
function litBox(pic: Picture, ground = groundOf(pic)) {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (let y = 0; y < pic.height; y++) {
    for (let x = 0; x < pic.width; x++) {
      if (!unlike(pixel(pic, x, y), ground, 12)) continue;
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
 * A point on plain lit foam inside `region` (fractions of the canvas): its 7 × 7 patch all well unlike the ground
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
        if (!unlike(p, ground, 30)) ok = false;
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
