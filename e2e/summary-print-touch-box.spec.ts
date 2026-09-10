import { expect, test, type Page } from "@playwright/test";

/**
 * Measures the touch-device print box quick task 260910-2ny built, in its SECOND form: a computer's
 * sheet is untouched (D-01), and a touch device's sheet takes its WIDTH FROM THE PAGE and its SHAPE
 * FROM THE PAPER instead of an absolute box — the founder's second iPhone print
 * (260910-2ny-PROBE-READING-2.md) showed the first, shape-only fix still overhanging his paper by
 * about 19% on each edge, because iOS Safari does not honour an absolute inch width at all.
 *
 * Every touch assertion below is a RELATIONSHIP, not an absolute dot count — the touch sheet no
 * longer has a size of its own, so asserting one would assert the test viewport rather than the
 * app. That is also more honest about what actually needs proving: that the sheet's width equals
 * whatever the page hands it, at more than one page width, in more than one engine.
 *
 * Does NOT modify `e2e/summary-print-size.spec.ts` — that file is the measured desktop gate and
 * carries its own one permitted comment edit already (D-01); this file is a separate spec so that
 * one is never touched again, and it does not import that file's helpers either, for the same
 * reason.
 *
 * **What this file does NOT and CANNOT measure.** It measures that the touch rules are wired up,
 * that the sheet's width really does come from the page and its shape from the paper, that nothing
 * absolute is left in the chain, that the pages still paginate one sheet per page, and that every
 * size on the sheet scales with the page. It does NOT measure iOS Safari's own print path:
 * Playwright's `iphone`/`android` projects drive WebKit, not shipping Safari; `page.pdf()` is
 * Chromium-headless only; and no browser engine in this repo applies Safari's own automatic
 * shrink-to-fit or its own uniform margins. A green run here is evidence the CSS resolves as
 * intended — it is not proof of what a real iPhone's printer receives. That half is the founder's
 * own phone, once, in quick task 260910-2ny's Task 12.
 *
 * **The conversion a reader needs to turn a dot figure into ink.** A container-relative (`cqw`)
 * size prints at `72 x dots x P / C` points, for `P` the printed sheet width in inches and `C` the
 * page area in dots. On the founder's own measured 7.347in of paper
 * (260910-2ny-PROBE-READING-2.md), the smallest token lands at a flat 8.65pt for any page area at
 * or above the 733.44-dot design width, rising above 9pt below that as the 12px clamp floor takes
 * over.
 */

const PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY = "shaper-print-rail-instructions";

/** The desktop sheet's own box, unchanged by this task — the same figures
 * `e2e/summary-print-size.spec.ts` measures out of a real PDF. */
const EXPECTED_DESKTOP_WIDTH_DOTS = 733.44;
const EXPECTED_DESKTOP_HEIGHT_DOTS = 990.55;

/** The squarest portrait paper's own height/width — `8.5 / 11`, US Letter — the ratio the touch
 * sheet's `aspect-ratio` is built from, not a magic figure. */
const EXPECTED_TOUCH_RATIO = 1.294118;

/** The width the touch sheet is drawn and calibrated at — `--order-form-design-width` is 880px on
 * screen, but the PRINTED design width (what the desktop box above works out to) is this figure. */
const DESIGN_WIDTH_DOTS = 733.44;

/** The founder's own measured usable page width, once Safari takes its own margins
 * (260910-2ny-PROBE-READING-2.md) — used only to report the points conversion in the console table
 * below, never as an assertion input; no browser here can measure a real iPhone's own margins. */
const FOUNDER_PRINTABLE_WIDTH_IN = 7.347;

const DOT_TOLERANCE = 1;
const RATIO_TOLERANCE = 0.0005;

/** The page widths case 6's sweep tests — bracketing the design width from well below to well
 * above. 733 and 812 matter most: the design width itself, and the width round 1's own printout
 * implies the founder's phone laid out at. */
const SWEEP_WIDTHS = [560, 618, 680, 733, 760, 812, 900];

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

/** Reads the three relationships that ARE the mechanism: the sheet's width against the root's, the
 * root's width against the page wrapper's own content width, and the sheet's own height/width
 * ratio. All three read straight off computed style in print media — nothing here assumes a dot
 * count. */
async function readTouchRelationships(page: Page): Promise<{
  rootWidth: number;
  pageWidth: number;
  sheetWidth: number;
  sheetHeight: number;
}> {
  await page.emulateMedia({ media: "print" });
  const result = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("[data-order-form-root]");
    const pageEl = document.querySelector<HTMLElement>("[data-order-form-page]");
    const sheet = document.querySelector<HTMLElement>("[data-order-form-sheet]");
    if (!root || !pageEl || !sheet) {
      throw new Error("missing [data-order-form-root], [data-order-form-page] or [data-order-form-sheet]");
    }
    return {
      rootWidth: root.getBoundingClientRect().width,
      pageWidth: pageEl.getBoundingClientRect().width,
      sheetWidth: sheet.getBoundingClientRect().width,
      sheetHeight: sheet.getBoundingClientRect().height,
    };
  });
  await page.emulateMedia({ media: "screen" });
  return result;
}

/** Asserts and REPORTS the three relationships case 2 and case 3 both check, at whatever page
 * width the caller has already set up — printing the measured numbers rather than just a pass
 * mark, per this plan's own D-06 lesson about a green tick with no numbers. */
async function assertTouchRelationships(page: Page, label: string) {
  // Load-bearing precondition, in the house style (see e2e/summary-print-size.spec.ts): without
  // this a project that quietly stopped emulating touch would pass the rest of this case by
  // accident and prove nothing.
  const isCoarsePointer = await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches);
  expect(
    isCoarsePointer,
    `${label}: window.matchMedia("(pointer: coarse)") does not match — this project is no longer emulating a touch pointer`,
  ).toBe(true);

  await expect(page.locator("[data-order-form-root]")).toHaveAttribute("data-print-touch", "true");

  const rel = await readTouchRelationships(page);
  const ratio = rel.sheetHeight / rel.sheetWidth;
  console.log(
    `[260910-2ny] ${label}: root ${rel.rootWidth.toFixed(2)}px, page ${rel.pageWidth.toFixed(2)}px, sheet ${rel.sheetWidth.toFixed(2)}x${rel.sheetHeight.toFixed(2)}px, ratio ${ratio.toFixed(6)}`,
  );

  expect(
    Math.abs(rel.sheetWidth - rel.rootWidth),
    `${label}: sheet width (${rel.sheetWidth.toFixed(2)}) does not equal root width (${rel.rootWidth.toFixed(2)})`,
  ).toBeLessThanOrEqual(DOT_TOLERANCE);
  expect(
    Math.abs(rel.rootWidth - rel.pageWidth),
    `${label}: root width (${rel.rootWidth.toFixed(2)}) does not equal the page wrapper's own content width (${rel.pageWidth.toFixed(2)})`,
  ).toBeLessThanOrEqual(DOT_TOLERANCE);
  expect(
    Math.abs(ratio - EXPECTED_TOUCH_RATIO),
    `${label}: sheet ratio ${ratio.toFixed(6)} vs expected ${EXPECTED_TOUCH_RATIO}`,
  ).toBeLessThanOrEqual(RATIO_TOLERANCE);
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

/** Forces the touch attribute onto the root directly — used where a case needs the touch box on a
 * specific engine (Chromium, for `page.pdf()`) independent of whichever pointer that project's own
 * device profile emulates. */
async function forceTouchSheet(page: Page) {
  await page.locator("[data-order-form-root]").evaluate((el) => el.setAttribute("data-print-touch", "true"));
}

type FontSample = { index: number; label: string; fontPx: number };

type SweepRow = {
  width: number;
  smallestPx: number;
  smallestLabel: string;
  distinctSizes: number[];
  overflowBySheet: boolean[];
  samples: FontSample[];
};

/** Resizes the viewport to `width`, then walks every element inside every
 * `[data-order-form-sheet]` and records its computed font size, plus whether each sheet's content
 * overflows its own band. This is case 6's one measurement, repeated at every width in
 * `SWEEP_WIDTHS`. */
async function collectSweepRow(page: Page, width: number): Promise<SweepRow> {
  const viewport = page.viewportSize();
  await page.setViewportSize({ width, height: viewport?.height ?? 1400 });

  const raw = await page.evaluate(() => {
    const sheets = Array.from(document.querySelectorAll<HTMLElement>("[data-order-form-sheet]"));
    const samples: { label: string; fontPx: number }[] = [];
    const overflowBySheet: boolean[] = [];
    for (const sheet of sheets) {
      overflowBySheet.push(sheet.scrollHeight > sheet.clientHeight + 0.5);
      const all: HTMLElement[] = [sheet, ...Array.from(sheet.querySelectorAll<HTMLElement>("*"))];
      for (const el of all) {
        const fontPx = Number.parseFloat(getComputedStyle(el).fontSize);
        if (!Number.isFinite(fontPx)) continue;
        const cls = el.getAttribute("class");
        const label = el.tagName.toLowerCase() + (cls ? "." + cls.split(/\s+/)[0] : "");
        samples.push({ label, fontPx });
      }
    }
    return { samples, overflowBySheet };
  });

  const samples: FontSample[] = raw.samples.map((s, index) => ({ index, ...s }));
  const distinctSizes = [...new Set(samples.map((s) => Math.round(s.fontPx * 100) / 100))].sort((a, b) => a - b);
  const smallest = samples.reduce<FontSample | undefined>(
    (min, s) => (!min || s.fontPx < min.fontPx ? s : min),
    undefined,
  );

  return {
    width,
    smallestPx: smallest?.fontPx ?? Number.NaN,
    smallestLabel: smallest?.label ?? "(no sized element found)",
    distinctSizes,
    overflowBySheet: raw.overflowBySheet,
    samples,
  };
}

test.describe("Summary order form — touch print box (260910-2ny)", () => {
  test("a computer's sheet is untouched (D-01)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "this case is the desktop control, on a mouse pointer");

    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-root]")).not.toHaveAttribute("data-print-touch", "true");

    const box = await readFirstSheetBoxPx(page);
    console.log(`[260910-2ny] desktop control: sheet ${box.width.toFixed(2)}x${box.height.toFixed(2)}px`);
    expect(
      Math.abs(box.width - EXPECTED_DESKTOP_WIDTH_DOTS),
      `desktop sheet width ${box.width.toFixed(2)} vs expected ${EXPECTED_DESKTOP_WIDTH_DOTS}`,
    ).toBeLessThanOrEqual(DOT_TOLERANCE);
    expect(
      Math.abs(box.height - EXPECTED_DESKTOP_HEIGHT_DOTS),
      `desktop sheet height ${box.height.toFixed(2)} vs expected ${EXPECTED_DESKTOP_HEIGHT_DOTS}`,
    ).toBeLessThanOrEqual(DOT_TOLERANCE);
  });

  test("a touch device's sheet takes its width from the page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "this case is the touch-device measurement, on iphone/android");

    await page.goto("/design/summary");
    await assertTouchRelationships(page, `${testInfo.project.name} @ design viewport`);
  });

  test("the same relationships hold at a materially different page width", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "this case is the touch-device measurement, on iphone/android");

    await page.goto("/design/summary");
    const original = page.viewportSize();
    const widened = { width: (original?.width ?? 400) + 300, height: original?.height ?? 800 };
    await page.setViewportSize(widened);
    // If any of the three relationships moves with the viewport, something absolute is still in
    // the chain — which is the exact defect this whole revision exists to remove, and a
    // fixed-viewport test would never see it.
    await assertTouchRelationships(page, `${testInfo.project.name} @ ${widened.width}px viewport`);
  });

  test("the shorter sheet still makes one sheet per page, with nothing blank at the end (D-03)", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "page.pdf() is Chromium-headless only");

    await enableRailBandInstructions(page);
    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-sheet]")).toHaveCount(3);

    // Force the touch box on directly — this case measures whether the touch mechanism still
    // paginates correctly on the one engine that can produce a real PDF, independent of whichever
    // pointer the desktop project itself emulates.
    await forceTouchSheet(page);

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

  test("THE MEASUREMENT — the printed type size and the narrowest page that still fits", async ({ page }) => {
    await enableRailBandInstructions(page);
    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-sheet]")).toHaveCount(3);
    await forceTouchSheet(page);
    await page.emulateMedia({ media: "print" });

    const rows: SweepRow[] = [];
    for (const width of SWEEP_WIDTHS) {
      rows.push(await collectSweepRow(page, width));
    }

    console.log(`\n[260910-2ny] touch type-size and fit sweep (design width = ${DESIGN_WIDTH_DOTS} dots)`);
    for (const row of rows) {
      console.log(
        `[260910-2ny]   width=${row.width}  smallest=${row.smallestPx.toFixed(3)}px (${row.smallestLabel})  ` +
          `distinct=[${row.distinctSizes.map((s) => s.toFixed(2)).join(", ")}]  ` +
          `overflow=[${row.overflowBySheet.map((o) => (o ? "OVERFLOW" : "ok")).join(", ")}]`,
      );
    }

    const smallestOverall = rows.reduce((min, r) => (r.smallestPx < min.smallestPx ? r : min), rows[0]);
    // 733, not 733.44: SWEEP_WIDTHS is whole dots, so this is the sweep's own stand-in for
    // DESIGN_WIDTH_DOTS — close enough that the reported points figure differs from the flat 8.65pt
    // figure in this file's head comment by a rounding error, not a real difference.
    const smallestAtDesignWidth = rows.find((r) => r.width === 733) ?? smallestOverall;
    const pointsAtFounderPage =
      (72 * smallestAtDesignWidth.smallestPx * FOUNDER_PRINTABLE_WIDTH_IN) / smallestAtDesignWidth.width;
    console.log(
      `[260910-2ny] smallest token across the sweep: ${smallestOverall.smallestPx.toFixed(3)}px at width ${smallestOverall.width} (${smallestOverall.smallestLabel})`,
    );
    console.log(
      `[260910-2ny] on the founder's own measured ${FOUNDER_PRINTABLE_WIDTH_IN}in of paper, the smallest token at the design width prints at ~${pointsAtFounderPage.toFixed(2)}pt (72 x dots x P / C)`,
    );

    // (a) Every text size on the sheet scales with the page — compared at the two widths ABOVE the
    // design width, 760 and 812, where no clamp floor is in play. A size that does not scale is a
    // fixed-pixel size, and a fixed-pixel size prints disproportionately small on a page area wider
    // than the design width — photographically wrong rather than merely small.
    const above1 = rows.find((r) => r.width === 760);
    const above2 = rows.find((r) => r.width === 812);
    expect(above1, "SWEEP_WIDTHS must include 760").toBeDefined();
    expect(above2, "SWEEP_WIDTHS must include 812").toBeDefined();
    const growthRatio = above2!.width / above1!.width;
    const count = Math.min(above1!.samples.length, above2!.samples.length);
    expect(
      count,
      "the two widths above the design width produced no elements to compare — the sweep found nothing sized",
    ).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const a = above1!.samples[i];
      const b = above2!.samples[i];
      const actualRatio = b.fontPx / a.fontPx;
      expect(
        Math.abs(actualRatio - growthRatio) / growthRatio,
        `${b.label} (element #${i}) does not scale with the page: ${a.fontPx.toFixed(3)}px at ${above1!.width} dots -> ${b.fontPx.toFixed(3)}px at ${above2!.width} dots (ratio ${actualRatio.toFixed(4)}, expected ~${growthRatio.toFixed(4)}) — a fixed-pixel size prints disproportionately small on a page wider than the design width`,
      ).toBeLessThanOrEqual(0.005);
    }

    // (b) Nothing overflows at any width in the sweep, with the Rail Band Instructions sheet on.
    for (const row of rows) {
      row.overflowBySheet.forEach((overflowed, sheetIndex) => {
        expect(overflowed, `sheet #${sheetIndex} overflows its band at a page width of ${row.width} dots`).toBe(
          false,
        );
      });
    }

    await page.emulateMedia({ media: "screen" });
  });
});
