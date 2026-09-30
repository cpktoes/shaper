import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import {
  PREVIEW_ALT_FILE,
  PREVIEW_CAPTURE,
  PREVIEW_CROP_MARGIN_PX,
  PREVIEW_CROP_SELECTORS,
  PREVIEW_FRAME,
  PREVIEW_HIDE_TOOLBAR_CSS,
  PREVIEW_IMAGE_ALT,
  PREVIEW_IMAGE_FILE,
  PREVIEW_IMAGE_MAX_BYTES,
  PREVIEW_IMAGE_ROUTE,
  PREVIEW_IMAGE_SIZE,
  PREVIEW_PANEL_SELECTOR,
  pngDimensions,
  previewImageProblems,
} from "./preview-image";

/**
 * TDD RED for quick 260930-fjm, Task 1: the founder's option A capture recipe (F-1) written down
 * as data (P-13), the PNG dimension reader and the problem-finder that gates the capture script,
 * and the committed-file checks that only go green once Task 1 step 4 has run.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUTLINE_EDITOR_PATH = join(REPO_ROOT, "components", "outline", "outline-editor.tsx");
const OUTLINE_VIEWER_PATH = join(REPO_ROOT, "components", "outline", "outline-viewer.tsx");
const CALLOUT_PRIMITIVES_PATH = join(REPO_ROOT, "components", "viewer", "callout-primitives.tsx");
const TABBED_PANEL_PATH = join(REPO_ROOT, "components", "viewer", "tabbed-panel.tsx");
const IMAGE_PATH = join(REPO_ROOT, PREVIEW_IMAGE_FILE);
const ALT_PATH = join(REPO_ROOT, PREVIEW_ALT_FILE);

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/** Builds a minimal well-formed PNG buffer: the 8-byte signature, then an IHDR chunk with the
 * given width/height written big-endian via DataView at the offsets pngDimensions reads. */
function makePngBuffer(width: number, height: number): Uint8Array {
  const buffer = new Uint8Array(33);
  buffer.set(PNG_SIGNATURE, 0);
  // Bytes 8-11: chunk length (13 for IHDR), 12-15: "IHDR", 16-19: width, 20-23: height.
  const view = new DataView(buffer.buffer);
  view.setUint32(8, 13);
  buffer.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  view.setUint32(16, width);
  view.setUint32(20, height);
  return buffer;
}

describe("pngDimensions", () => {
  it("reads width and height from a well-formed PNG buffer", () => {
    const buffer = makePngBuffer(1200, 630);
    expect(pngDimensions(buffer)).toEqual({ width: 1200, height: 630 });
  });

  it("returns null for a buffer that does not start with the PNG signature", () => {
    const buffer = new Uint8Array(30);
    expect(pngDimensions(buffer)).toBeNull();
  });

  it("returns null for a buffer shorter than 24 bytes", () => {
    const buffer = makePngBuffer(1200, 630).slice(0, 20);
    expect(pngDimensions(buffer)).toBeNull();
  });
});

describe("previewImageProblems", () => {
  it("returns [] for a well-formed 1200x630 buffer under the byte limit", () => {
    const buffer = makePngBuffer(1200, 630);
    expect(previewImageProblems(buffer)).toEqual([]);
  });

  it("names 'not a PNG' for a buffer that isn't one", () => {
    const buffer = new Uint8Array(30);
    const problems = previewImageProblems(buffer);
    expect(problems.some((p) => /not a PNG/i.test(p))).toBe(true);
  });

  it("names the wrong size, including the size found", () => {
    const buffer = makePngBuffer(2880, 1512);
    const problems = previewImageProblems(buffer);
    expect(problems.some((p) => p.includes("2880") && p.includes("1512"))).toBe(true);
  });

  it("names the byte count when too big", () => {
    const big = new Uint8Array(PREVIEW_IMAGE_MAX_BYTES + 12_000);
    big.set(makePngBuffer(1200, 630), 0);
    const view = new DataView(big.buffer);
    view.setUint32(16, 1200);
    view.setUint32(20, 630);
    const problems = previewImageProblems(big);
    expect(problems.some((p) => p.includes(big.byteLength.toLocaleString()))).toBe(true);
  });
});

describe("PREVIEW_CAPTURE", () => {
  it("viewport matches PREVIEW_IMAGE_SIZE's aspect ratio (1440/756 = 1200/630)", () => {
    expect(PREVIEW_CAPTURE.viewport.width / PREVIEW_CAPTURE.viewport.height).toBeCloseTo(
      PREVIEW_IMAGE_SIZE.width / PREVIEW_IMAGE_SIZE.height,
    );
  });

  it("the 2x capture is only ever shrunk, never upscaled", () => {
    expect(PREVIEW_CAPTURE.viewport.width * PREVIEW_CAPTURE.deviceScaleFactor).toBeGreaterThanOrEqual(
      PREVIEW_IMAGE_SIZE.width,
    );
  });

  it("each button name appears verbatim in the outline editor's source (P-13)", () => {
    const source = readFileSync(OUTLINE_EDITOR_PATH, "utf8");
    for (const button of PREVIEW_CAPTURE.buttons) {
      expect(source).toContain(button);
    }
  });

  it("presetName names a real preset in BOARD_PRESETS", () => {
    expect(BOARD_PRESETS.some((preset) => preset.name === PREVIEW_CAPTURE.presetName)).toBe(true);
  });
});

describe("the committed preview image and alt file", () => {
  it("app/opengraph-image.png has no previewImageProblems", () => {
    const bytes = new Uint8Array(readFileSync(IMAGE_PATH));
    expect(previewImageProblems(bytes)).toEqual([]);
  });

  it("app/opengraph-image.alt.txt equals PREVIEW_IMAGE_ALT exactly, with no trailing newline", () => {
    const text = readFileSync(ALT_PATH, "utf8");
    expect(text).toBe(PREVIEW_IMAGE_ALT);
    expect(text.endsWith("\n")).toBe(false);
  });

  it("PREVIEW_IMAGE_ROUTE is the served address", () => {
    expect(PREVIEW_IMAGE_ROUTE).toBe("/opengraph-image.png");
  });
});

/**
 * Quick 260930-fjm, Task 4 (the founder's revision): the preview picture is now a tight crop of
 * the board itself, framed to match the app's chrome, with no nav bar and no toolbar icon. These
 * pin the crop/frame recipe as data (P-13's pattern) and prove every selector it relies on is
 * really in the source it claims to read, the same idiom `outline editor button names` above use.
 */
describe("PREVIEW_CROP_SELECTORS, PREVIEW_PANEL_SELECTOR and PREVIEW_CROP_MARGIN_PX (Task 4)", () => {
  it("each crop selector's data attribute appears verbatim in the component that should draw it", () => {
    const outlineViewerSource = readFileSync(OUTLINE_VIEWER_PATH, "utf8");
    const calloutPrimitivesSource = readFileSync(CALLOUT_PRIMITIVES_PATH, "utf8");
    expect(outlineViewerSource).toContain('data-board-silhouette="outline"');
    expect(outlineViewerSource).toContain("data-drag-target");
    expect(calloutPrimitivesSource).toContain("data-output-rail");
    expect(calloutPrimitivesSource).toContain("data-callout-chip");
  });

  it("names exactly the board, its handles, the station read-outs and the named data chips", () => {
    expect(PREVIEW_CROP_SELECTORS).toEqual([
      '[data-board-silhouette="outline"]',
      "[data-drag-target]",
      "[data-output-rail]",
      "[data-callout-chip]",
    ]);
  });

  it("PREVIEW_PANEL_SELECTOR's data attribute appears verbatim in the viewer panel it should mark", () => {
    const tabbedPanelSource = readFileSync(TABBED_PANEL_PATH, "utf8");
    expect(tabbedPanelSource).toContain("data-viewer-panel");
    expect(PREVIEW_PANEL_SELECTOR).toBe("[data-viewer-panel]");
  });

  it("the crop margin is a small positive number of CSS pixels", () => {
    expect(PREVIEW_CROP_MARGIN_PX).toBe(16);
  });

  it("PREVIEW_HIDE_TOOLBAR_CSS hides the same row the browser tests already find by data-viewer-toolbar", () => {
    const toolbarButtonSource = readFileSync(
      join(REPO_ROOT, "components", "viewer", "toolbar-button.tsx"),
      "utf8",
    );
    expect(toolbarButtonSource).toContain("data-viewer-toolbar");
    expect(PREVIEW_HIDE_TOOLBAR_CSS).toBe("[data-viewer-toolbar]{display:none!important}");
  });
});

describe("PREVIEW_FRAME (Task 4)", () => {
  it("pins the frame's inset, border width and minimum padding", () => {
    expect(PREVIEW_FRAME).toEqual({ insetPx: 14, borderWidthPx: 3, minPaddingPx: 34 });
  });

  it("the border sits inside the inset, and every number is positive", () => {
    expect(PREVIEW_FRAME.borderWidthPx).toBeGreaterThan(0);
    expect(PREVIEW_FRAME.borderWidthPx).toBeLessThan(PREVIEW_FRAME.insetPx);
    expect(PREVIEW_FRAME.minPaddingPx).toBeGreaterThan(0);
  });
});
