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

/**
 * Quick 260930-fjm, Task 4 (the founder's revision, 2026-09-30): "the preview picture doesn't need
 * the nav bar and button icons. Just a tightly cropped shot of the board." These are the
 * data-attribute hooks the capture script unions to find the crop box — the board's own outline,
 * its drag handles, the three station read-outs and the four named data chips — and nothing of
 * the site nav or the viewer's own toolbar buttons. `data-board-silhouette` and `data-drag-target`
 * already existed for other reasons; `data-output-rail` and `data-callout-chip` were added for
 * this, because no stable hook for "a station label" or "a data card" existed before.
 */
export const PREVIEW_CROP_SELECTORS = [
  '[data-board-silhouette="outline"]',
  "[data-drag-target]",
  "[data-output-rail]",
  "[data-callout-chip]",
] as const;

/** Space kept around the measured union before the crop (Task 4), so the tightest label or
 * control point never touches the picture's own frame. */
export const PREVIEW_CROP_MARGIN_PX = 16;

/**
 * Hides the viewer's own floating toolbar row (Rotate, Construction Lines, Wide view, Export
 * Template) before the clipped screenshot (Task 4). That row is pinned absolutely over the
 * drawing's own top-right corner (`ViewerToolbar` in `components/viewer/toolbar-button.tsx`), so
 * it can fall inside the crop rectangle even though it is never one of `PREVIEW_CROP_SELECTORS`'
 * own elements. `[data-viewer-toolbar]` already existed as a browser-test hook for that same row,
 * reused here rather than adding a second one.
 */
export const PREVIEW_HIDE_TOOLBAR_CSS = "[data-viewer-toolbar]{display:none!important}";

/** Selects the viewer panel whose own computed border colour and corner radius the picture's
 * frame copies (Task 4), so the frame always matches the app's real chrome instead of a colour
 * sampled once and left to drift. Added for this — nothing named "the viewer panel" existed
 * before. */
export const PREVIEW_PANEL_SELECTOR = "[data-viewer-panel]";

/**
 * The finished picture's frame (Task 4): how far its border sits in from the 1200x630 edge, how
 * thick the border is, and the least white space kept between the border and the cropped board
 * once it's scaled to fit. Matches the founder-approved reference (`option-A2-cropped.png`).
 */
export const PREVIEW_FRAME = {
  /** Distance from the picture's own edge to the frame's border. */
  insetPx: 14,
  /** The frame's own border thickness. */
  borderWidthPx: 3,
  /** The least white space kept between the frame's border and the board on every side — `object-
   * fit: contain` never adds less, though a board with a different aspect ratio may get more. */
  minPaddingPx: 34,
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
