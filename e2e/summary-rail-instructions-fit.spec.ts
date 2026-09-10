import { expect, test, type Page } from "@playwright/test";

/**
 * Proves the printed Rail Band Instructions sheet (the order form's third sheet) stops throwing
 * away its own example rail drawing on a narrow page (quick 260910-kz2, PRNT-05).
 *
 * Today, on the touch print path, the example rail's own SVG measures literally 0x0 at every page
 * area from 450 dots down, and the sheet clips itself by as much as 98 dots — with no second page,
 * no error and no warning. This file's narrow sweep exists because of that: a green tick with no
 * numbers written down is exactly what let that silent loss reach the founder's printer once
 * already, so every width below sweeps and LOGS what it measured, not just a pass mark.
 *
 * A NEW file, not an edit to `e2e/summary-print-touch-box.spec.ts`, `e2e/summary-rail-key.spec.ts`
 * or `e2e/summary-print-size.spec.ts` — those three are the gates that protect the founder's
 * printer and are never touched again. This spec copies its preference helper and sweep widths
 * locally rather than importing from any of them, for the same reason those files already give.
 *
 * **This spec was written but NOT run here.** `npm run dev` fails inside a worktree with
 * Turbopack's "Could not find the Next.js package" (the same failure `npm run build` gives), and
 * the Playwright suite starts its own dev server — a worktree executor cannot run Playwright at
 * all. It type-checks and lints clean; the browser run is Task 3 of quick task 260910-kz2, on the
 * main checkout, by the orchestrator.
 */

const PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY = "shaper-print-rail-instructions";

/** The page areas that used to clip, plus the widest one the plan's own facts still call "narrow"
 * (531 — the width the printed key first turns on at). Copied from `must_haves.key_links` in
 * `260910-kz2-PLAN.md`, not re-derived: a worktree cannot run a browser to re-measure them. */
const NARROW_SWEEP_WIDTHS = [268, 300, 330, 360, 390, 420, 450, 480, 531];

/** The same seven widths `e2e/summary-print-touch-box.spec.ts` and `e2e/summary-rail-key.spec.ts`
 * already sweep, minus the two this control only needs to sample (560, 618, 733, 900) — enough to
 * prove "every page that prints correctly today prints identically after this" without repeating
 * the full protected sweep in a file that is allowed to be edited. */
const CONTROL_WIDTHS = [560, 618, 733, 900];

/** The figure card and drawing's own size at every control width, measured at plan time and
 * unchanged by this fix (`260910-kz2-PLAN.md` must_haves table) — within the same 0.5px tolerance
 * `e2e/summary-rail-key.spec.ts` already uses for its own card-height/drawing-width comparisons. */
const EXPECTED_CONTROL_CARD_HEIGHT_PX = 501.98;
const EXPECTED_CONTROL_DRAWING_WIDTH_PX = 373.84;
const CONTROL_TOLERANCE_PX = 0.5;

/** Half a screen dot — the same tolerance `e2e/summary-rail-key.spec.ts` uses for its own pixel
 * comparisons, applied here to "does a sheet clip its own content at all". */
const OVERFLOW_TOLERANCE_PX = 0.5;

/** The narrow sweep's own floor: a real drawing, not a smear. Well below any of the plan's measured
 * "with the change" figures (the smallest is 36.38 x 17.53 at 268 dots), so this is a floor that
 * proves the drawing is genuinely there, not a pixel-exact replica of the plan's own table — the
 * plan's own numbers are not to be re-asserted here as a re-baseline risk if the fix's proportions
 * ever move slightly within the plan's own stated tolerance. */
const MIN_EXAMPLE_RAIL_SVG_DOT = 15;

/** The figure's drawing box must still be a real width, not squeezed to a sliver, at the narrowest
 * page this fix is designed to reach (268 dots) — again a floor, not a re-baseline of the plan's
 * own 36-137px range across the sweep. */
const MIN_FIGURE_DRAWING_WIDTH_DOT = 100;

/** The desktop sheet's own fixed box, unchanged by this task (`e2e/summary-print-size.spec.ts`'s
 * own gate, and the plan's must_haves) — the desktop print path never reaches the new cap at all,
 * because its sheet is a fixed size no matter how wide the window is. */
const EXPECTED_DESKTOP_SHEET_WIDTH_PX = 733.44;
const EXPECTED_DESKTOP_SHEET_HEIGHT_PX = 990.55;
const EXPECTED_DESKTOP_CARD_HEIGHT_PX = 501.98;
const DESKTOP_TOLERANCE_PX = 0.5;

/** A few desktop viewport widths well apart, to prove the sheet's size really is independent of the
 * window — not just true at one width by coincidence. */
const DESKTOP_VIEWPORT_WIDTHS = [900, 1280, 1600];

/** Turns on the Rail Band Instructions print preference before the page loads — the same mechanism
 * `e2e/summary-print-touch-box.spec.ts` and `e2e/summary-rail-key.spec.ts` already use, copied here
 * rather than imported so neither protected file is ever touched. */
async function enableRailBandInstructions(page: Page) {
  await page.addInitScript((key) => {
    try {
      window.localStorage.setItem(key, "true");
    } catch {
      // Defensive, matching the touch-box spec's own guard around localStorage writes.
    }
  }, PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY);
}

/** Whether, and by how much, each of the three order-form sheets clips its own content, in PRINT
 * media — the same `scrollHeight > clientHeight` check `e2e/summary-print-touch-box.spec.ts`'s own
 * case 6(b) and `e2e/summary-rail-key.spec.ts`'s `readOverflow` already make, re-proved locally
 * here (never imported) so this spec stands on its own if either file ever moves. */
async function readSheetOverflows(
  page: Page,
): Promise<{ index: number; scrollHeight: number; clientHeight: number; clippedBy: number }[]> {
  await page.emulateMedia({ media: "print" });
  const result = await page.locator("[data-order-form-sheet]").evaluateAll((sheets) =>
    sheets.map((sheet, index) => ({
      index,
      scrollHeight: sheet.scrollHeight,
      clientHeight: sheet.clientHeight,
      clippedBy: Math.max(0, sheet.scrollHeight - sheet.clientHeight),
    })),
  );
  await page.emulateMedia({ media: "screen" });
  return result;
}

/** Reads the third sheet's own figure card height, its drawing box's own width and height, the
 * example rail's own SVG size, and the printed key's own box (or `null` if it is not drawn at this
 * width) — all in PRINT media. Scoped to the THIRD `[data-order-form-sheet]` throughout, never the
 * first: the Summary dashboard's own compact Rail Plots row on sheet 1 can carry the same
 * `data-rail-section-plot="center"` selector the example rail uses, which the plan's own measured
 * facts name as an easy and misleading mis-selection. The drawing box is found the same way
 * `e2e/summary-rail-key.spec.ts`'s own `readFigureBox` finds it: `[data-rail-figure]`'s first
 * element child is the row, and that row's first element child is always the drawing, never the
 * key (the key is a `<ul>`, drawn only as the row's SECOND child when it exists at all). */
async function readThirdSheetFigure(page: Page): Promise<{
  figureCardHeight: number;
  figureDrawingWidth: number;
  figureDrawingHeight: number;
  exampleRailSvg: { width: number; height: number };
  keyBox: { width: number; height: number } | null;
}> {
  await page.emulateMedia({ media: "print" });
  const result = await page.evaluate(() => {
    const sheets = document.querySelectorAll("[data-order-form-sheet]");
    const thirdSheet = sheets[2] as HTMLElement | undefined;
    if (!thirdSheet) {
      throw new Error("expected a third [data-order-form-sheet] (the Rail Band Instructions sheet)");
    }
    const figureCard = thirdSheet.querySelector("[data-rail-figure]") as HTMLElement | null;
    if (!figureCard) {
      throw new Error("[data-rail-figure] is missing from the third sheet");
    }
    const drawing = figureCard.querySelector(":scope > div > div") as HTMLElement | null;
    if (!drawing) {
      throw new Error("[data-rail-figure] is missing its drawing box (expected card > row > drawing)");
    }
    const exampleSvg = thirdSheet.querySelector("svg[data-rail-section-plot]") as SVGSVGElement | null;
    if (!exampleSvg) {
      throw new Error("the example rail's own svg[data-rail-section-plot] is missing from the third sheet");
    }
    const keyEl = thirdSheet.querySelector("[data-rail-line-key]") as HTMLElement | null;
    const cardRect = figureCard.getBoundingClientRect();
    const drawingRect = drawing.getBoundingClientRect();
    const svgRect = exampleSvg.getBoundingClientRect();
    return {
      figureCardHeight: cardRect.height,
      figureDrawingWidth: drawingRect.width,
      figureDrawingHeight: drawingRect.height,
      exampleRailSvg: { width: svgRect.width, height: svgRect.height },
      keyBox: keyEl
        ? { width: keyEl.getBoundingClientRect().width, height: keyEl.getBoundingClientRect().height }
        : null,
    };
  });
  await page.emulateMedia({ media: "screen" });
  return result;
}

test.describe("Summary order form — the Rail Band Instructions sheet keeps its example rail on a small page (260910-kz2)", () => {
  test("touch: at every narrow page area from 268 to 531 dots, nothing clips and the example rail has a real size", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "desktop",
      "touch-only sweep — the desktop sheet is a fixed size and never reaches this cap (see the desktop test below)",
    );
    // Nine viewport-and-read passes, no clicks — lighter than e2e/summary-rail-key.spec.ts's own
    // click sweep, but still generous headroom on WebKit mobile per that file's own measured cost.
    test.setTimeout(90_000);

    await enableRailBandInstructions(page);
    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-sheet]")).toHaveCount(3);

    // Load-bearing precondition, in the house style e2e/summary-print-touch-box.spec.ts states for
    // its own cases: without this, a project that quietly stopped emulating a coarse pointer would
    // pass the rest of this case by accident and prove nothing about the touch print path.
    const isCoarsePointer = await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches);
    expect(isCoarsePointer, "expected this project to report a coarse pointer — this sweep is the touch print path").toBe(
      true,
    );

    console.log(`\n[260910-kz2] narrow sweep — clipping, example rail size, figure drawing width`);

    for (const width of NARROW_SWEEP_WIDTHS) {
      await page.setViewportSize({ width, height: 1400 });
      const overflows = await readSheetOverflows(page);
      const figure = await readThirdSheetFigure(page);

      console.log(
        `[260910-kz2]   width=${width}  clipped=[${overflows.map((o) => o.clippedBy.toFixed(1)).join(", ")}]  ` +
          `card=${figure.figureCardHeight.toFixed(2)}  drawing=${figure.figureDrawingWidth.toFixed(2)}x${figure.figureDrawingHeight.toFixed(2)}  ` +
          `exampleRailSvg=${figure.exampleRailSvg.width.toFixed(2)}x${figure.exampleRailSvg.height.toFixed(2)}  ` +
          `key=${figure.keyBox ? `${figure.keyBox.width.toFixed(2)}x${figure.keyBox.height.toFixed(2)}` : "off"}`,
      );

      overflows.forEach((o) =>
        expect(o.clippedBy, `width=${width}: sheet #${o.index} clips by ${o.clippedBy.toFixed(2)}px`).toBeLessThanOrEqual(
          OVERFLOW_TOLERANCE_PX,
        ),
      );
      expect(
        figure.exampleRailSvg.width,
        `width=${width}: example rail SVG width is ${figure.exampleRailSvg.width.toFixed(2)}px — expected a real drawing, not a smear or nothing`,
      ).toBeGreaterThanOrEqual(MIN_EXAMPLE_RAIL_SVG_DOT);
      expect(
        figure.exampleRailSvg.height,
        `width=${width}: example rail SVG height is ${figure.exampleRailSvg.height.toFixed(2)}px`,
      ).toBeGreaterThanOrEqual(MIN_EXAMPLE_RAIL_SVG_DOT);
      expect(
        figure.figureDrawingWidth,
        `width=${width}: figure drawing width is ${figure.figureDrawingWidth.toFixed(2)}px`,
      ).toBeGreaterThanOrEqual(MIN_FIGURE_DRAWING_WIDTH_DOT);
      if (figure.keyBox) {
        expect(
          figure.keyBox.height,
          `width=${width}: the key (${figure.keyBox.height.toFixed(2)}px) is taller than the drawing (${figure.figureDrawingHeight.toFixed(2)}px) — it must never be the taller item in the row`,
        ).toBeLessThanOrEqual(figure.figureDrawingHeight);
      }
    }
  });

  test("touch: at 560/618/733/900 the figure card and drawing are unchanged from today", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "desktop",
      "control sweep on the touch print path — the desktop project is covered separately below",
    );

    await enableRailBandInstructions(page);
    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-sheet]")).toHaveCount(3);

    console.log(`\n[260910-kz2] control sweep — the widths that already ship, unchanged`);

    for (const width of CONTROL_WIDTHS) {
      await page.setViewportSize({ width, height: 1400 });
      const overflows = await readSheetOverflows(page);
      const figure = await readThirdSheetFigure(page);

      console.log(
        `[260910-kz2]   width=${width}  card=${figure.figureCardHeight.toFixed(2)}  drawing=${figure.figureDrawingWidth.toFixed(2)}x${figure.figureDrawingHeight.toFixed(2)}  ` +
          `key=${figure.keyBox ? `${figure.keyBox.width.toFixed(2)}x${figure.keyBox.height.toFixed(2)}` : "off"}`,
      );

      overflows.forEach((o) =>
        expect(o.clippedBy, `width=${width}: sheet #${o.index} clips by ${o.clippedBy.toFixed(2)}px`).toBeLessThanOrEqual(
          OVERFLOW_TOLERANCE_PX,
        ),
      );
      expect(
        Math.abs(figure.figureCardHeight - EXPECTED_CONTROL_CARD_HEIGHT_PX),
        `width=${width}: figure card height moved from ${EXPECTED_CONTROL_CARD_HEIGHT_PX} to ${figure.figureCardHeight.toFixed(2)}`,
      ).toBeLessThanOrEqual(CONTROL_TOLERANCE_PX);
      expect(
        Math.abs(figure.figureDrawingWidth - EXPECTED_CONTROL_DRAWING_WIDTH_PX),
        `width=${width}: figure drawing width moved from ${EXPECTED_CONTROL_DRAWING_WIDTH_PX} to ${figure.figureDrawingWidth.toFixed(2)}`,
      ).toBeLessThanOrEqual(CONTROL_TOLERANCE_PX);
      if (figure.keyBox) {
        expect(
          figure.keyBox.height,
          `width=${width}: the key (${figure.keyBox.height.toFixed(2)}px) is taller than the drawing (${figure.figureDrawingHeight.toFixed(2)}px)`,
        ).toBeLessThanOrEqual(figure.figureDrawingHeight);
      }
    }
  });

  test("desktop: the sheet and figure card stay a fixed size regardless of window width", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only assertion — proves a computer's print is untouched");

    await enableRailBandInstructions(page);
    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-sheet]")).toHaveCount(3);

    console.log(`\n[260910-kz2] desktop — sheet and card size at several window widths`);

    for (const width of DESKTOP_VIEWPORT_WIDTHS) {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ media: "print" });
      const sheetBox = await page
        .locator("[data-order-form-sheet]")
        .first()
        .evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        });
      await page.emulateMedia({ media: "screen" });
      const figure = await readThirdSheetFigure(page);

      console.log(
        `[260910-kz2]   viewport=${width}  sheet=${sheetBox.width.toFixed(2)}x${sheetBox.height.toFixed(2)}  card=${figure.figureCardHeight.toFixed(2)}`,
      );

      expect(
        Math.abs(sheetBox.width - EXPECTED_DESKTOP_SHEET_WIDTH_PX),
        `viewport=${width}: desktop sheet width moved from ${EXPECTED_DESKTOP_SHEET_WIDTH_PX} to ${sheetBox.width.toFixed(2)}`,
      ).toBeLessThanOrEqual(DESKTOP_TOLERANCE_PX);
      expect(
        Math.abs(sheetBox.height - EXPECTED_DESKTOP_SHEET_HEIGHT_PX),
        `viewport=${width}: desktop sheet height moved from ${EXPECTED_DESKTOP_SHEET_HEIGHT_PX} to ${sheetBox.height.toFixed(2)}`,
      ).toBeLessThanOrEqual(DESKTOP_TOLERANCE_PX);
      expect(
        Math.abs(figure.figureCardHeight - EXPECTED_DESKTOP_CARD_HEIGHT_PX),
        `viewport=${width}: desktop figure card height moved from ${EXPECTED_DESKTOP_CARD_HEIGHT_PX} to ${figure.figureCardHeight.toFixed(2)}`,
      ).toBeLessThanOrEqual(DESKTOP_TOLERANCE_PX);
    }
  });
});
