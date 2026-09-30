import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import {
  PREVIEW_ALT_FILE,
  PREVIEW_CAPTURE,
  PREVIEW_IMAGE_ALT,
  PREVIEW_IMAGE_FILE,
  PREVIEW_IMAGE_MAX_BYTES,
  PREVIEW_IMAGE_ROUTE,
  PREVIEW_IMAGE_SIZE,
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
