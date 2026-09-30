/**
 * The link-preview picture's pure parts (quick 260930-fjm, Phase 13 item 12, Task 1): the
 * founder's option A capture recipe (F-1) written down as data (P-13) so it is reviewable and a
 * renamed button fails a unit test instead of silently breaking the next capture, the PNG
 * dimension reader, and the problem-finder that gates `scripts/capture-link-preview.ts` before it
 * ever writes a file.
 *
 * No React, Next, Node or browser import — bytes come in as a `Uint8Array`, read through a
 * `DataView`, so this stays as pure and as independently testable as `lib/geometry/`.
 */

export const PREVIEW_IMAGE_FILE = "app/opengraph-image.png";

export const PREVIEW_ALT_FILE = "app/opengraph-image.alt.txt";

/** Where Next serves the static picture file convention. */
export const PREVIEW_IMAGE_ROUTE = "/opengraph-image.png";

export const PREVIEW_IMAGE_SIZE = { width: 1200, height: 630 };

/** Keeps the picture small enough for WhatsApp and iMessage to show it. */
export const PREVIEW_IMAGE_MAX_BYTES = 300_000;

/** The founder's own suggestion for the picture's alt text. */
export const PREVIEW_IMAGE_ALT =
  "Shaper Assistant's Template screen: a shortboard outline, nose to the left, with its control points, station marks and measurements";

/**
 * The founder's option A (F-1), written down as data (P-13): the viewport, the scale, the
 * preset's name and the three button names the capture script clicks in order, plus how long it
 * waits after each step. A source-reading test in `preview-image.test.ts` requires each button
 * name to appear verbatim in `components/outline/outline-editor.tsx`, so a renamed button fails a
 * unit test rather than silently breaking the next capture.
 */
export const PREVIEW_CAPTURE = {
  viewport: { width: 1440, height: 756 },
  deviceScaleFactor: 2,
  presetName: "Shortboard",
  buttons: [
    "Rotate the board to horizontal",
    "Show construction lines",
    "Hide the sidebar for a wider view",
  ],
  settleMs: {
    afterPreset: 1200,
    afterTemplate: 1500,
    afterButton: 800,
    afterSidebar: 900,
    afterStyle: 300,
  },
  hideDevIndicatorCss: "nextjs-portal{display:none!important}",
} as const;

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/**
 * Returns `{ width, height }` read big-endian from a PNG's IHDR chunk (offsets 16 and 20), or
 * `null` when the bytes don't start with the 8-byte PNG signature or are shorter than 24 bytes —
 * too short to hold the width/height fields at all.
 */
export function pngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return { width, height };
}

/**
 * Plain-English problems with a captured picture, or `[]` when it's ready to ship: not a PNG, the
 * wrong size (naming the size found), and too big (naming the byte count). Every message is safe
 * to show verbatim in a thrown Error from the capture script.
 */
export function previewImageProblems(bytes: Uint8Array): string[] {
  const problems: string[] = [];

  const dimensions = pngDimensions(bytes);
  if (!dimensions) {
    problems.push("not a PNG file");
  } else if (dimensions.width !== PREVIEW_IMAGE_SIZE.width || dimensions.height !== PREVIEW_IMAGE_SIZE.height) {
    problems.push(
      `is ${dimensions.width} by ${dimensions.height}, not ${PREVIEW_IMAGE_SIZE.width} by ${PREVIEW_IMAGE_SIZE.height}`,
    );
  }

  if (bytes.byteLength > PREVIEW_IMAGE_MAX_BYTES) {
    problems.push(
      `is ${bytes.byteLength.toLocaleString("en-US")} bytes, over the ${PREVIEW_IMAGE_MAX_BYTES.toLocaleString("en-US")} limit`,
    );
  }

  return problems;
}
