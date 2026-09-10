import { expect, test, type Page } from "@playwright/test";
import { inflateSync } from "node:zlib";

/**
 * Prints the Summary order form to a real PDF and reads the page geometry back out of it — the
 * only way to prove what a printer actually receives, rather than trusting a CSS declaration or a
 * JavaScript handler's own math.
 *
 * Three facts, measured at planning time, that decide how this file is written:
 *
 * - `page.pdf()` only exists on Chromium-headless (it drives the same print pipeline a real Chrome
 *   print uses); WebKit and Firefox throw. This suite's `iphone` and `android` projects are not
 *   Chromium, so every case here skips on every project but `desktop`.
 * - Chromium's print path lays out at the PAPER's width and ignores the screen viewport entirely —
 *   measured identical at a 1280x800 desktop, an iPhone 14 and an 880x900 window. A phone-viewport
 *   print case would therefore prove nothing and is deliberately not written here.
 * - The middle case below switches the app's own print JavaScript OFF — a deliberate simulation of
 *   a suppressed handler, not a description of what a phone's print path actually does. The
 *   founder's own iPhone print (260910-2ny-PROBE-READING.md) showed `beforeprint` DOES fire there
 *   and its writes DO reach the print snapshot; this case instead proves the stylesheet's own
 *   paper-unit declarations hold even in the case where that JavaScript never ran at all — a
 *   stronger guarantee than the app actually needs, kept because it is cheap to keep.
 */

const PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY = "shaper-print-rail-instructions";

/** The sheet's printed box, measured out of a real PDF at planning time: 733.44 x 990.55 screen
 * dots (the inner edge of the sheet's own border; the outer edge is one dot larger, 734 x 991).
 * The tolerance below covers both edges. */
const EXPECTED_SHEET_WIDTH_DOTS = 733.44;
const EXPECTED_SHEET_HEIGHT_DOTS = 990.55;
const SHEET_TOLERANCE_DOTS = 1.5;

/** True size is 72/96 points per screen dot. Any other value is a silent shrink. */
const EXPECTED_SCALE = 0.75;
const SCALE_TOLERANCE = 0.001;

type PageGeometry = {
  /** Points-per-screen-dot the page content was drawn at. */
  scale: number;
  rects: { width: number; height: number }[];
};

/** Finds the next "stream" keyword that is not the tail end of "endstream" — the character right
 * before a real content-stream "stream" is never "d". */
function findNextStreamKeyword(raw: string, from: number): number {
  let idx = raw.indexOf("stream", from);
  while (idx !== -1) {
    if (raw[idx - 1] !== "d") return idx;
    idx = raw.indexOf("stream", idx + 1);
  }
  return -1;
}

/**
 * Walks a PDF's raw bytes, inflating every `stream ... endstream` object and keeping the ones
 * that are page content streams — identified by carrying both a `cm` and an `re` operator, one
 * per page. Cross-checked at planning time against Python's `pypdf`; both give identical numbers,
 * so no PDF library needs to be added to this project.
 */
function extractPageGeometries(pdfBytes: Buffer): PageGeometry[] {
  const raw = pdfBytes.toString("latin1");
  const geometries: PageGeometry[] = [];
  let searchFrom = 0;

  while (true) {
    const streamIdx = findNextStreamKeyword(raw, searchFrom);
    if (streamIdx === -1) break;

    let dataStart = streamIdx + "stream".length;
    if (raw[dataStart] === "\r") dataStart++;
    if (raw[dataStart] === "\n") dataStart++;

    const endIdx = raw.indexOf("endstream", dataStart);
    if (endIdx === -1) break;
    const chunk = raw.slice(dataStart, endIdx);
    searchFrom = endIdx + "endstream".length;

    let inflated: Buffer;
    try {
      inflated = inflateSync(Buffer.from(chunk, "latin1"));
    } catch {
      // Not every stream object is zlib-deflated content (fonts, images, xref streams differ) —
      // skip anything that does not inflate as a content stream.
      continue;
    }
    const text = inflated.toString("latin1");
    if (!/\bcm\b/.test(text) || !/\bre\b/.test(text)) continue;

    // `a b c d e f cm` — the content transform. The page's outer `cm` (1/300in units) times the
    // nested `cm` (screen dots to that unit) gives points per screen dot.
    const cmMatches = [
      ...text.matchAll(/(-?[\d.]+)\s+-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+\s+cm/g),
    ];
    if (cmMatches.length < 2) continue;
    const scale = Number(cmMatches[0][1]) * Number(cmMatches[1][1]);

    // `x y width height re` — every rectangle drawn in this content stream, in screen dots once
    // inside the nested transform above.
    const reMatches = [...text.matchAll(/-?[\d.]+\s+-?[\d.]+\s+(-?[\d.]+)\s+(-?[\d.]+)\s+re/g)];
    const rects = reMatches.map((m) => ({ width: Number(m[1]), height: Number(m[2]) }));

    geometries.push({ scale, rects });
  }

  return geometries;
}

/**
 * Asserts one printed page is correct: no silent shrink, and the sheet's border — its outer and
 * inner edge, a dot apart — shows up among the page's rectangles.
 */
function assertPageIsCorrect(geometry: PageGeometry, pageLabel: string) {
  expect(geometry.scale, `${pageLabel}: content scale (points per screen dot)`).toBeGreaterThan(
    EXPECTED_SCALE - SCALE_TOLERANCE,
  );
  expect(geometry.scale, `${pageLabel}: content scale (points per screen dot)`).toBeLessThan(
    EXPECTED_SCALE + SCALE_TOLERANCE,
  );

  const matchingRect = geometry.rects.find(
    (rect) =>
      Math.abs(rect.width - EXPECTED_SHEET_WIDTH_DOTS) <= SHEET_TOLERANCE_DOTS &&
      Math.abs(rect.height - EXPECTED_SHEET_HEIGHT_DOTS) <= SHEET_TOLERANCE_DOTS,
  );
  expect(
    matchingRect,
    `${pageLabel}: no rectangle near ${EXPECTED_SHEET_WIDTH_DOTS} x ${EXPECTED_SHEET_HEIGHT_DOTS} dots among ${JSON.stringify(geometry.rects)}`,
  ).toBeDefined();
}

/** Replaces `window.addEventListener` so the app's `beforeprint`/`afterprint` handler is never
 * installed — reproducing the phone's print path, where the handler's work never reached the
 * print snapshot. Every other event type is forwarded untouched. */
async function suppressPrintHandler(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = window.addEventListener.bind(window);
    window.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type === "beforeprint" || type === "afterprint") return;
      return originalAddEventListener(type, listener, options);
    }) as typeof window.addEventListener;
  });
}

/** Turns on the Rail Band Instructions print preference before the page loads, the same way the
 * phone specs already set sessionStorage ahead of navigation. */
async function enableRailBandInstructions(page: Page) {
  await page.addInitScript((key) => {
    try {
      window.localStorage.setItem(key, "true");
    } catch {
      // Defensive, matching the phone specs' own guard around localStorage writes.
    }
  }, PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY);
}

test.describe("Summary order form — printed sheet size (phone-print fix)", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "page.pdf() is Chromium-headless only");
  });

  test("prints two pages at true size with the print handler running", async ({ page }) => {
    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-sheet]")).toHaveCount(2);

    const pdfBytes = await page.pdf({ format: "Letter", printBackground: false });
    const geometries = extractPageGeometries(pdfBytes);

    expect(geometries, "expected exactly two content pages").toHaveLength(2);
    geometries.forEach((geometry, i) => assertPageIsCorrect(geometry, `page ${i + 1}`));
  });

  test("prints two pages at true size even when the browser never runs the print handler", async ({
    page,
  }) => {
    await suppressPrintHandler(page);
    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-sheet]")).toHaveCount(2);

    const pdfBytes = await page.pdf({ format: "Letter", printBackground: false });

    // Prove the suppression really happened, or this case silently becomes a duplicate of the
    // first — no data-printing attribute and no inline width on the root means beforeprint never
    // ran, which is exactly the phone's own situation this case reproduces.
    const root = page.locator("[data-order-form-root]");
    await expect(root).not.toHaveAttribute("data-printing", "true");
    const inlineWidth = await root.evaluate((el) => el.style.width);
    expect(inlineWidth, "root carries an inline width — the print handler ran after all").toBe("");

    const geometries = extractPageGeometries(pdfBytes);

    // This is the case that fails today: without the stylesheet's own paper-unit declarations,
    // today's suppressed print puts the sheets at 755 x 647 and 755 x 892 — no rectangle lands in
    // the asserted band.
    expect(geometries, "expected exactly two content pages").toHaveLength(2);
    geometries.forEach((geometry, i) => assertPageIsCorrect(geometry, `page ${i + 1}`));
  });

  test("the Rail Band Instructions sheet gets the same page box", async ({ page }) => {
    await suppressPrintHandler(page);
    await enableRailBandInstructions(page);
    await page.goto("/design/summary");
    // The preference is server-resolved first (no cookie is set here) and only converges to the
    // localStorage value this init script wrote after a post-hydration re-render, so the third
    // sheet can appear a beat after the first two — wait for the real count rather than "any".
    await expect(page.locator("[data-order-form-sheet]")).toHaveCount(3);

    const pdfBytes = await page.pdf({ format: "Letter", printBackground: false });
    const geometries = extractPageGeometries(pdfBytes);

    expect(geometries, "expected exactly three content pages").toHaveLength(3);
    geometries.forEach((geometry, i) => assertPageIsCorrect(geometry, `page ${i + 1}`));
  });
});
