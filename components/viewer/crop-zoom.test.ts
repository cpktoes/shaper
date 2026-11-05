import { describe, expect, it } from "vitest";
import { AT_ONE_CROP, cropRect, cropSlide, cropStep, cropZoomAt, isAtOneCrop, type CropView } from "./crop-zoom";

const W = 804;
const H = 615;

/** The picture point a window point (px, py) shows at `view`. */
function pictureAt(view: CropView, width: number, height: number, px: number, py: number) {
  const r = cropRect(view, width, height);
  return { x: r.x + (px * r.width) / width, y: r.y + (py * r.height) / height };
}

/** Where on the window the picture's centre — the board's centre at 1x — is drawn at `view`. */
function centreOnWindow(view: CropView, width: number, height: number) {
  const r = cropRect(view, width, height);
  return { x: ((width / 2 - r.x) * width) / r.width, y: ((height / 2 - r.y) * height) / r.height };
}

describe("cropRect: the part of the camera's picture the window shows", () => {
  it("is the whole picture at 1x", () => {
    expect(cropRect(AT_ONE_CROP, W, H)).toEqual({ x: 0, y: 0, width: W, height: H });
  });

  it("is W/z by H/z centred on (W/2 + cx·W, H/2 + cy·H) at zoom z", () => {
    const view: CropView = { zoom: 4, cx: 0.05, cy: -0.1 };
    const r = cropRect(view, W, H);
    expect(r.width).toBeCloseTo(W / 4, 9);
    expect(r.height).toBeCloseTo(H / 4, 9);
    expect(r.x + r.width / 2).toBeCloseTo(W / 2 + 0.05 * W, 9);
    expect(r.y + r.height / 2).toBeCloseTo(H / 2 - 0.1 * H, 9);
  });

  it("keeps the same relative crop on a resized window (Wide view, a phone turned)", () => {
    const view: CropView = { zoom: 2.5, cx: 0.08, cy: 0.03 };
    const a = cropRect(view, W, H);
    const b = cropRect(view, 1180, 635);
    expect(a.x / W).toBeCloseTo(b.x / 1180, 12);
    expect(a.y / H).toBeCloseTo(b.y / 635, 12);
    expect(a.width / W).toBeCloseTo(b.width / 1180, 12);
    expect(a.height / H).toBeCloseTo(b.height / 635, 12);
  });
});

describe("cropZoomAt: zooming toward the pointer", () => {
  it("keeps the picture point under the pointer under it", () => {
    const px = 470;
    const py = 290;
    const before = pictureAt(AT_ONE_CROP, W, H, px, py);
    const next = cropZoomAt(AT_ONE_CROP, W, H, 2, px, py);
    expect(next.zoom).toBe(2);
    const after = pictureAt(next, W, H, px, py);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
    // And again from a zoomed, slid view.
    const from: CropView = { zoom: 2, cx: 0.04, cy: -0.02 };
    const p0 = pictureAt(from, W, H, 300, 200);
    const p1 = pictureAt(cropZoomAt(from, W, H, 3.5, 300, 200), W, H, 300, 200);
    expect(p1.x).toBeCloseTo(p0.x, 9);
    expect(p1.y).toBeCloseTo(p0.y, 9);
  });

  it("snaps to half steps inside 1x to 10x", () => {
    expect(cropZoomAt(AT_ONE_CROP, W, H, 2.3, W / 2, H / 2).zoom).toBe(2.5);
    expect(cropZoomAt(AT_ONE_CROP, W, H, 40, W / 2, H / 2).zoom).toBe(10);
    expect(cropZoomAt(AT_ONE_CROP, W, H, 0.2, W / 2, H / 2).zoom).toBe(1);
    expect(cropZoomAt(AT_ONE_CROP, W, H, 6, W / 2, H / 2, 4).zoom).toBe(4);
  });

  it("stops where the picture's centre would leave the window", () => {
    // Zooming hard on the window's very corner would carry the centre out; it stops at the window's edge.
    const next = cropZoomAt(AT_ONE_CROP, W, H, 10, 0, 0);
    const c = centreOnWindow(next, W, H);
    expect(c.x).toBeGreaterThanOrEqual(-1e-9);
    expect(c.x).toBeLessThanOrEqual(W + 1e-9);
    expect(c.y).toBeGreaterThanOrEqual(-1e-9);
    expect(c.y).toBeLessThanOrEqual(H + 1e-9);
  });

  it("leaves the view as it was for a non-finite input or an unmeasured window (T-16-20)", () => {
    const from: CropView = { zoom: 2, cx: 0.1, cy: 0 };
    expect(cropZoomAt(from, W, H, Number.NaN, 10, 10)).toBe(from);
    expect(cropZoomAt(from, W, H, 3, Number.POSITIVE_INFINITY, 10)).toBe(from);
    expect(cropZoomAt(from, 0, H, 3, 10, 10)).toBe(from);
    expect(cropZoomAt(from, W, Number.NaN, 3, 10, 10)).toBe(from);
  });
});

describe("cropStep: the zoom row's buttons and the keys", () => {
  it("one step in from 1x is 1.5x about the window's centre", () => {
    const next = cropStep(AT_ONE_CROP, W, H, 1);
    expect(next).toEqual({ zoom: 1.5, cx: 0, cy: 0 });
  });

  it("one step out at 1x stays at 1x, and the slide is kept", () => {
    expect(cropStep(AT_ONE_CROP, W, H, -1)).toEqual(AT_ONE_CROP);
    const slid: CropView = { zoom: 1, cx: 0.2, cy: -0.1 };
    expect(cropStep(slid, W, H, -1)).toEqual(slid);
  });

  it("keeps the window's centre point where it is", () => {
    const from: CropView = { zoom: 2, cx: 0.1, cy: 0.05 };
    const p0 = pictureAt(from, W, H, W / 2, H / 2);
    const p1 = pictureAt(cropStep(from, W, H, 2), W, H, W / 2, H / 2);
    expect(p1.x).toBeCloseTo(p0.x, 9);
    expect(p1.y).toBeCloseTo(p0.y, 9);
  });

  it("stops at 10x", () => {
    expect(cropStep({ zoom: 10, cx: 0, cy: 0 }, W, H, 1).zoom).toBe(10);
  });
});

describe("cropSlide: sliding the board across the window", () => {
  it("moves the board on the window by exactly (dx, dy), at 1x too", () => {
    for (const zoom of [1, 2.5, 6]) {
      const from: CropView = { zoom, cx: 0, cy: 0 };
      const before = centreOnWindow(from, W, H);
      const after = centreOnWindow(cropSlide(from, W, H, 37, -21), W, H);
      expect(after.x - before.x).toBeCloseTo(37, 9);
      expect(after.y - before.y).toBeCloseTo(-21, 9);
    }
  });

  it("stops with the board's centre on the window's edge, never past it", () => {
    for (const zoom of [1, 4]) {
      const far = cropSlide({ zoom, cx: 0, cy: 0 }, W, H, 50_000, -50_000);
      const c = centreOnWindow(far, W, H);
      expect(c.x).toBeCloseTo(W, 9);
      expect(c.y).toBeCloseTo(0, 9);
      // Sliding back moves it at once — no dead zone to drag back through.
      const back = centreOnWindow(cropSlide(far, W, H, -10, 10), W, H);
      expect(back.x).toBeCloseTo(W - 10, 9);
      expect(back.y).toBeCloseTo(10, 9);
    }
  });

  it("leaves the view as it was for a non-finite slide (T-16-20)", () => {
    const from: CropView = { zoom: 2, cx: 0, cy: 0 };
    expect(cropSlide(from, W, H, Number.NaN, 0)).toBe(from);
    expect(cropSlide(from, W, 0, 5, 5)).toBe(from);
  });
});

describe("isAtOneCrop", () => {
  it("is true only for the whole picture, centred", () => {
    expect(isAtOneCrop(AT_ONE_CROP)).toBe(true);
    expect(isAtOneCrop({ zoom: 1, cx: 0.1, cy: 0 })).toBe(false);
    expect(isAtOneCrop({ zoom: 1.5, cx: 0, cy: 0 })).toBe(false);
  });
});
