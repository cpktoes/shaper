import { expect, test, type Page } from "@playwright/test";

/**
 * Proves the rail plan/side figure's new line key (quick 260910-jfp, PRNT-05) costs nothing: the
 * figure card is the same height with the key drawn as without it, the drawing itself never
 * shrinks to make room, the key is actually present at every width in the founder's own print
 * sweep, it lists exactly the lines he left ticked in the legend's own order, and nothing
 * overflows in either state.
 *
 * A NEW file, not an edit to `e2e/summary-print-touch-box.spec.ts` — that file is the gate that
 * protects the founder's printer, it went green only today after three rounds, and the whole
 * point of a separate file is that it is never touched again. This spec copies what it needs
 * locally (`SWEEP_WIDTHS`, the enable-preference helper) rather than importing from that file, for
 * the same reason `260910-2ny-BROWSER-READING.md` already records for
 * `e2e/summary-print-size.spec.ts`.
 *
 * **This spec was written but NOT run here.** `npm run dev` fails inside a worktree with
 * Turbopack's "Could not find the Next.js package" (the same failure `npm run build` gives), and
 * the Playwright suite starts its own dev server — a worktree executor cannot run Playwright at
 * all. It types-checks and lints clean; the browser run is Task 3, on a clean checkout, by the
 * orchestrator.
 */

const PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY = "shaper-print-rail-instructions";

/** The same widths `e2e/summary-print-touch-box.spec.ts` sweeps — copied, not imported, so that
 * file is never depended on. 560 is the narrowest page in the existing sweep, leaving only about
 * 30px of clearance over the key's own 516px-card / 486px-row turn-on threshold; 618 is the
 * founder's own page. */
const SWEEP_WIDTHS = [560, 618, 680, 733, 760, 812, 900];

/** `RAIL_REFERENCE_LEGEND`'s own nine labels, in its own order (`rail-plan-side-figure.tsx`) —
 * copied rather than imported, since this file drives the browser through the rendered page
 * rather than through the module graph. */
const RAIL_LINE_KEY_LABELS = [
  "Deck Marks 1",
  "Deck Band 1",
  "Deck Marks 3",
  "Deck Band 2",
  "Deck Mark 3 Center (full board)",
  "Rail Marks 1",
  "Rail Band 1",
  "Rail Tucks 1",
  "Tuck blend to hard tail",
];

/** Half a screen dot — the same tolerance `e2e/summary-print-touch-box.spec.ts` uses for its own
 * pixel comparisons. */
const HEIGHT_TOLERANCE_PX = 0.5;

/** Turns on the Rail Band Instructions print preference before the page loads — the same
 * mechanism `e2e/summary-print-touch-box.spec.ts` already uses, copied here rather than imported
 * so that file is never touched. */
async function enableRailBandInstructions(page: Page) {
  await page.addInitScript((key) => {
    try {
      window.localStorage.setItem(key, "true");
    } catch {
      // Defensive, matching the touch-box spec's own guard around localStorage writes.
    }
  }, PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY);
}

/** Finds one of the nine mirrored ticks under the print buttons by its own label text — the row
 * that also carries the "Include Rail Band Instructions" toggle, so the label text itself is what
 * disambiguates one line's tick from the others (every one of the nine labels is a distinct
 * string, none a substring of another). */
function lineTickCheckbox(page: Page, label: string) {
  return page.locator("[data-print-hide] label", { hasText: label }).locator('[data-slot="checkbox"]');
}

/** Sets every one of the nine mirrored ticks to `ticked`, in SCREEN media — the control row
 * carries `data-print-hide` and is `display: none` in print media, so it cannot be clicked there.
 * Idempotent: only clicks a checkbox whose current `aria-checked` disagrees with the target, so
 * calling this twice in a row is a safe no-op the second time. */
async function setAllLineTicks(page: Page, ticked: boolean) {
  await page.emulateMedia({ media: "screen" });
  for (const label of RAIL_LINE_KEY_LABELS) {
    const checkbox = lineTickCheckbox(page, label);
    const isChecked = (await checkbox.getAttribute("aria-checked")) === "true";
    if (isChecked !== ticked) {
      await checkbox.click();
    }
  }
}

/** Unticks exactly the named lines, in SCREEN media — the caller is expected to have already
 * called `setAllLineTicks(page, true)`, so this always starts from every line ticked. */
async function untickLines(page: Page, labels: string[]) {
  await page.emulateMedia({ media: "screen" });
  for (const label of labels) {
    await lineTickCheckbox(page, label).click();
  }
}

/** Reads the figure card's own height and its drawing box's own width, in PRINT media —
 * `[data-rail-figure]` is the card itself; its first element child is the row, and THAT row's
 * first element child is always the drawing (`@container relative min-w-0`), never the key: the
 * key is an `<ul>`, never a `<div>`, and it is the row's second child only when it exists at all,
 * so `:scope > div > div` finds the drawing unambiguously regardless of whether the key is
 * present. */
async function readFigureBox(page: Page): Promise<{ cardHeight: number; drawingWidth: number }> {
  await page.emulateMedia({ media: "print" });
  const box = await page.locator("[data-rail-figure]").evaluate((el) => {
    const card = el as HTMLElement;
    const cardRect = card.getBoundingClientRect();
    const drawing = card.querySelector(":scope > div > div") as HTMLElement | null;
    if (!drawing) {
      throw new Error("[data-rail-figure] is missing its drawing box (expected card > row > drawing)");
    }
    const drawingRect = drawing.getBoundingClientRect();
    return { cardHeight: cardRect.height, drawingWidth: drawingRect.width };
  });
  await page.emulateMedia({ media: "screen" });
  return box;
}

/** Whether nothing on any of the three sheets overflows its own band, in PRINT media — the same
 * check `e2e/summary-print-touch-box.spec.ts`'s own case 6(b) already makes, re-proved locally
 * here so this spec stands on its own if that file ever moves. */
async function readOverflow(page: Page): Promise<boolean[]> {
  await page.emulateMedia({ media: "print" });
  const overflow = await page
    .locator("[data-order-form-sheet]")
    .evaluateAll((sheets) => sheets.map((sheet) => sheet.scrollHeight > sheet.clientHeight + 0.5));
  await page.emulateMedia({ media: "screen" });
  return overflow;
}

/** Reads the key's own entries as plain label text, in PRINT media, in DOM order. `null` means
 * `[data-rail-line-key]` is not in the DOM at all — the correct state with every line unticked,
 * never an empty list with a heading or a border round nothing. */
async function readKeyEntries(page: Page): Promise<string[] | null> {
  await page.emulateMedia({ media: "print" });
  const key = page.locator("[data-rail-line-key]");
  const count = await key.count();
  if (count === 0) {
    await page.emulateMedia({ media: "screen" });
    return null;
  }
  const entries = await key.locator("li").allTextContents();
  await page.emulateMedia({ media: "screen" });
  return entries;
}

test.describe("Summary order form — rail plan/side line key (260910-jfp)", () => {
  test("the key costs no height, the drawing does not shrink, and it is present at every swept width", async ({
    page,
  }) => {
    await enableRailBandInstructions(page);
    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-sheet]")).toHaveCount(3);

    console.log(`\n[260910-jfp] key-on/key-off card height + drawing width sweep`);
    for (const width of SWEEP_WIDTHS) {
      await page.setViewportSize({ width, height: 1400 });

      await setAllLineTicks(page, true);
      const on = await readFigureBox(page);
      const onKeyVisible = await page.locator("[data-rail-line-key]").isVisible();
      const onOverflow = await readOverflow(page);

      await setAllLineTicks(page, false);
      const off = await readFigureBox(page);
      const offKeyPresent = (await page.locator("[data-rail-line-key]").count()) > 0;
      const offOverflow = await readOverflow(page);

      console.log(
        `[260910-jfp]   width=${width}  card height on=${on.cardHeight.toFixed(2)}px off=${off.cardHeight.toFixed(2)}px  ` +
          `drawing width on=${on.drawingWidth.toFixed(2)}px off=${off.drawingWidth.toFixed(2)}px  ` +
          `key present+visible=${onKeyVisible}  ` +
          `overflow on=[${onOverflow.map((o) => (o ? "OVERFLOW" : "ok")).join(", ")}] ` +
          `off=[${offOverflow.map((o) => (o ? "OVERFLOW" : "ok")).join(", ")}]`,
      );

      expect(
        onKeyVisible,
        `width=${width}: [data-rail-line-key] should be present and visible with every line ticked`,
      ).toBe(true);
      expect(
        offKeyPresent,
        `width=${width}: [data-rail-line-key] should not exist in the DOM at all with every line unticked`,
      ).toBe(false);

      expect(
        Math.abs(on.cardHeight - off.cardHeight),
        `width=${width}: card height moved between key-on (${on.cardHeight.toFixed(2)}) and key-off (${off.cardHeight.toFixed(2)})`,
      ).toBeLessThanOrEqual(HEIGHT_TOLERANCE_PX);

      expect(
        Math.abs(on.drawingWidth - off.drawingWidth),
        `width=${width}: drawing width moved between key-on (${on.drawingWidth.toFixed(2)}) and key-off (${off.drawingWidth.toFixed(2)})`,
      ).toBeLessThanOrEqual(HEIGHT_TOLERANCE_PX);

      onOverflow.forEach((overflowed, i) =>
        expect(overflowed, `width=${width}: sheet #${i} overflows its band with every line ticked`).toBe(false),
      );
      offOverflow.forEach((overflowed, i) =>
        expect(overflowed, `width=${width}: sheet #${i} overflows its band with every line unticked`).toBe(false),
      );
    }

    // Leave every line ticked — the default a fresh session would show — rather than ending the
    // test on the all-unticked state the sweep above finishes in.
    await setAllLineTicks(page, true);
  });

  test("the key lists exactly the lines the shaper left ticked, in the legend's own order", async ({ page }) => {
    await enableRailBandInstructions(page);
    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-sheet]")).toHaveCount(3);
    // The founder's own page width — this is a content-correctness check, not a layout sweep, so
    // one representative width is enough; the layout sweep above already proves the key draws at
    // every swept width.
    await page.setViewportSize({ width: 618, height: 1400 });

    await setAllLineTicks(page, true);
    const nineEntries = await readKeyEntries(page);
    expect(nineEntries).toEqual(RAIL_LINE_KEY_LABELS);

    await untickLines(page, ["Deck Marks 3", "Rail Marks 1"]);
    const sevenEntries = await readKeyEntries(page);
    expect(sevenEntries).toEqual(RAIL_LINE_KEY_LABELS.filter((l) => l !== "Deck Marks 3" && l !== "Rail Marks 1"));

    await setAllLineTicks(page, false);
    const zeroEntries = await readKeyEntries(page);
    expect(zeroEntries).toBeNull();

    // Restore the default so a re-run of this test (or a test after it) starts from a known state.
    await setAllLineTicks(page, true);
  });
});
