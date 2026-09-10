import { expect, test, type Page } from "@playwright/test";

/**
 * Measures the touch-device print box quick task 260910-2ny added: a computer's sheet is
 * untouched, and a touch device's sheet is shaped like the paper itself (D-01) so it survives
 * Safari's automatic shrink-to-fit. Measured in Chromium AND WebKit — via the `iphone` and
 * `android` projects — because WebKit is the engine family this fix exists for, plus a real
 * Chromium PDF proving the shorter sheet still paginates one sheet per page, with nothing blank
 * at the end (D-03).
 *
 * Does NOT modify `e2e/summary-print-size.spec.ts` — that file is the measured desktop gate and
 * carries its own one permitted comment edit already (D-01); this file is a new, separate spec so
 * that one is never touched again, and it does not import that file's helpers either, for the same
 * reason.
 *
 * What this file does NOT and CANNOT measure: iOS Safari's own print path. Playwright's `iphone`
 * project drives WebKit, not Safari; `page.pdf()` is Chromium-headless only; and no browser engine
 * in this repo applies Safari's automatic shrink-to-fit. A green run here is evidence the phone
 * rule is wired up and produces the box it is meant to — it is not proof of what a real iPhone
 * printer receives. That half is the founder's own phone, in quick task 260910-2ny's Task 7.
 */

const PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY = "shaper-print-rail-instructions";

/** The desktop sheet's own box, unchanged by this task — the same figures
 * `e2e/summary-print-size.spec.ts` measures out of a real PDF. */
const EXPECTED_DESKTOP_WIDTH_DOTS = 733.44;
const EXPECTED_DESKTOP_HEIGHT_DOTS = 990.55;

/** The touch sheet's own box, measured at plan time in real Chromium and real WebKit with
 * `npx tsx` against the stylesheet's own calc() expression: 733.438 x 949.156px. */
const EXPECTED_TOUCH_WIDTH_DOTS = 733.44;
const EXPECTED_TOUCH_HEIGHT_DOTS = 949.16;
/** The squarest portrait paper's own height/width — `min(11 / 8.5, 11.69 / 8.27)` — the ratio the
 * touch box is built from, not a magic figure. */
const EXPECTED_TOUCH_RATIO = 1.294118;

const DOT_TOLERANCE = 1;
const RATIO_TOLERANCE = 0.0005;

/** Reads the first sheet's printed box directly from computed style after switching the page to
 * print media. No `beforeprint` handler needs to run for this: `order-form.css`'s `!important`
 * declarations apply the instant print media does — "the stylesheet, not the handler, decides the
 * size" is the contract that file's own head comment describes, and this reads exactly that. */
async function readFirstSheetBoxPx(page: Page): Promise<{ width: number; height: number }> {
  await page.emulateMedia({ media: "print" });
  const box = await page
    .locator("[data-order-form-sheet]")
    .first()
    .evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
  await page.emulateMedia({ media: "screen" });
  return box;
}

/** Counts real PDF page OBJECTS (`/Type /Page`, carefully never matching the `/Type /Pages` tree
 * root) rather than pages carrying drawn content. A blank page still gets a page object in the
 * PDF's own object table, so this is what actually proves the printed document has — or does not
 * have — a trailing blank page; a content-stream-based count would be blind to it. */
function countPdfPageObjects(pdfBytes: Buffer): number {
  const raw = pdfBytes.toString("latin1");
  const matches = raw.match(/\/Type\s*\/Page(?!s)\b/g);
  return matches ? matches.length : 0;
}

/** Turns on the Rail Band Instructions print preference before the page loads — the same
 * mechanism `e2e/summary-print-size.spec.ts` already uses, carried here rather than imported so
 * that file is never touched. */
async function enableRailBandInstructions(page: Page) {
  await page.addInitScript((key) => {
    try {
      window.localStorage.setItem(key, "true");
    } catch {
      // Defensive, matching e2e/summary-print-size.spec.ts's own guard around localStorage writes.
    }
  }, PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY);
}

test.describe("Summary order form — touch print box (260910-2ny)", () => {
  test("a computer's sheet is untouched (D-01)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "this case is the desktop control, on a mouse pointer");

    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-root]")).not.toHaveAttribute("data-print-touch", "true");

    const box = await readFirstSheetBoxPx(page);
    expect(
      Math.abs(box.width - EXPECTED_DESKTOP_WIDTH_DOTS),
      `desktop sheet width ${box.width.toFixed(2)} vs expected ${EXPECTED_DESKTOP_WIDTH_DOTS}`,
    ).toBeLessThanOrEqual(DOT_TOLERANCE);
    expect(
      Math.abs(box.height - EXPECTED_DESKTOP_HEIGHT_DOTS),
      `desktop sheet height ${box.height.toFixed(2)} vs expected ${EXPECTED_DESKTOP_HEIGHT_DOTS}`,
    ).toBeLessThanOrEqual(DOT_TOLERANCE);
  });

  test("a touch device's sheet is the shape of the paper", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "this case is the touch-device measurement, on iphone/android");

    await page.goto("/design/summary");

    // Load-bearing precondition, in the house style (see e2e/summary-print-size.spec.ts): without
    // this a project that quietly stopped emulating touch would pass the rest of this case by
    // accident and prove nothing.
    const isCoarsePointer = await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches);
    expect(
      isCoarsePointer,
      `${testInfo.project.name}: window.matchMedia("(pointer: coarse)") does not match — this project is no longer emulating a touch pointer`,
    ).toBe(true);

    await expect(page.locator("[data-order-form-root]")).toHaveAttribute("data-print-touch", "true");

    const box = await readFirstSheetBoxPx(page);
    expect(
      Math.abs(box.width - EXPECTED_TOUCH_WIDTH_DOTS),
      `touch sheet width ${box.width.toFixed(2)} vs expected ${EXPECTED_TOUCH_WIDTH_DOTS}`,
    ).toBeLessThanOrEqual(DOT_TOLERANCE);
    expect(
      Math.abs(box.height - EXPECTED_TOUCH_HEIGHT_DOTS),
      `touch sheet height ${box.height.toFixed(2)} vs expected ${EXPECTED_TOUCH_HEIGHT_DOTS}`,
    ).toBeLessThanOrEqual(DOT_TOLERANCE);

    // The ratio, not just the two figures — this is what says WHY the box is this shape: the
    // squarest portrait paper's own height/width, not a number picked to look right.
    const ratio = box.height / box.width;
    expect(
      Math.abs(ratio - EXPECTED_TOUCH_RATIO),
      `touch sheet ratio ${ratio.toFixed(6)} vs expected ${EXPECTED_TOUCH_RATIO}`,
    ).toBeLessThanOrEqual(RATIO_TOLERANCE);
  });

  test("the shorter sheet still makes one sheet per page, with nothing blank at the end (D-03)", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "page.pdf() is Chromium-headless only");

    await enableRailBandInstructions(page);
    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-sheet]")).toHaveCount(3);

    // Force the touch box on directly — this case measures whether the SHORTER sheet still
    // paginates correctly on the one engine that can produce a real PDF, independent of whichever
    // pointer the desktop project itself emulates.
    await page.locator("[data-order-form-root]").evaluate((el) => el.setAttribute("data-print-touch", "true"));

    const pdfBytes = await page.pdf({ format: "Letter", printBackground: false });
    const pageCount = countPdfPageObjects(pdfBytes);
    expect(pageCount, `expected exactly 3 pages with the touch box forced on, counted ${pageCount}`).toBe(3);
  });

  test("the control: the same three sheets, without the touch box forced on, still make three pages", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "page.pdf() is Chromium-headless only");

    // Without this control, the case above could pass on a stylesheet that had never worked, and
    // nobody would know which half of the comparison was being measured.
    await enableRailBandInstructions(page);
    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-sheet]")).toHaveCount(3);

    const pdfBytes = await page.pdf({ format: "Letter", printBackground: false });
    const pageCount = countPdfPageObjects(pdfBytes);
    expect(pageCount, `expected exactly 3 pages without the touch box forced on, counted ${pageCount}`).toBe(3);
  });
});
