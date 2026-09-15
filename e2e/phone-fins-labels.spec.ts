import { expect, test, type Page } from "@playwright/test";

/**
 * Quick task 260914-rj0's own proof: on the FINS drawing, the three off-tail height numbers —
 * how far the front fins, the rear fins and the centre fin sit up from the tail — each have to
 * read as their own number. On the Mid-length board (a quad with a centre fin on) the rear fins'
 * and the centre fin's numbers used to land 1.48 drawing units apart on a phone and print over
 * one another as `6 1/4"5/8"`. `components/fins/fin-label-layout.ts` fixes that; this file proves
 * it in a real browser, on a real phone, in both Imperial and Metric.
 *
 * Why this measures the real INK and not a bounding box: the em box of a line of type is taller
 * than the letters actually drawn in it (a fraction's numerator sits above the baseline, its
 * denominator below, with padding on both sides). Two labels' boxes can touch — even nest inside
 * each other's line-height — while the numbers themselves are still perfectly readable. It is the
 * ink, not the box, that has to be clear, so this file draws each label into a canvas 2d context
 * with the label's own real computed font and measures `actualBoundingBox*`, the same technique a
 * type-setting tool would use to trim whitespace around a glyph.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";
const UNITS_STORAGE_KEY = "shaper-units";

async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Board Length only renders as a typed field in Metric (D-08) — setting the browser preference
 * before navigation reaches Metric without clicking through the phone menu (copied from
 * `e2e/undo-redo.spec.ts`'s own `setMetricUnits`). */
async function setMetricUnits(page: Page) {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "metric");
  }, UNITS_STORAGE_KEY);
}

/**
 * Client-side navigation to the Mid-length board's FINS screen, waits for the drawing's real fit
 * scale to settle, and proves the test is not vacuous before returning.
 *
 * Never `page.goto` after picking the preset: the board lives in memory in the design store, and
 * a fresh navigation would throw it away and put the default thruster back on screen.
 */
async function navigateToMidlengthFins(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button").filter({ hasText: "Mid-length" }).first().click();
  await page.waitForURL("**/design/outline");
  await page.getByRole("link", { name: "FINS" }).click();
  await page.waitForURL("**/design/fins");

  const offTailLabels = page.locator('[data-fin-dim="off-tail"]');

  // `useSvgFitScale` returns 1 until a layout effect measures the svg, so a label's computed
  // font-size reads exactly 14px on first paint and only then jumps to the real value (10.93px
  // desktop, 21.57px android, 32.67px iphone). Gate on "anything other than 14px" — NOT on
  // "> 14px", which is true on the phones but false on the desktop project.
  await expect
    .poll(() => offTailLabels.first().evaluate((el) => getComputedStyle(el).fontSize))
    .not.toBe("14px");

  // Prove the test is not vacuous: if the Mid-length preset ever stops being a quad with a
  // centre fin, this should fail loudly rather than quietly measure nothing.
  await expect(offTailLabels).toHaveCount(3);
  const roles = await offTailLabels.evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-fin-role")).sort(),
  );
  expect(roles).toEqual(["center", "front", "rear"]);
}

interface OffTailInkBox {
  role: string;
  text: string;
  x: number;
  y: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** `Math.min(svg.clientWidth / 530, svg.clientHeight / 406)` — turns drawing (viewBox) units
   * into CSS pixels. Same for all three labels, since they share one svg. */
  fitScale: number;
}

/** Measures the real ink of every off-tail label, in one page evaluation. */
async function measureOffTailInk(page: Page): Promise<OffTailInkBox[]> {
  return page.locator('[data-fin-dim="off-tail"]').evaluateAll((els) =>
    els.map((el) => {
      const svgEl = (el as SVGTextElement).closest("svg");
      if (!svgEl) throw new Error("off-tail label has no ancestor svg");
      const fitScale = Math.min(svgEl.clientWidth / 530, svgEl.clientHeight / 406);

      const style = getComputedStyle(el);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2d canvas context unavailable");
      ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const anchor = el.getAttribute("text-anchor");
      ctx.textAlign = anchor === "end" ? "right" : anchor === "middle" ? "center" : "left";
      // ctx.textBaseline left at its default "alphabetic" to match SVG's default text baseline.

      const text = el.textContent ?? "";
      const metrics = ctx.measureText(text);
      const x = Number(el.getAttribute("x"));
      const y = Number(el.getAttribute("y"));

      return {
        role: el.getAttribute("data-fin-role") ?? "",
        text,
        x,
        y,
        left: x - metrics.actualBoundingBoxLeft,
        right: x + metrics.actualBoundingBoxRight,
        top: y - metrics.actualBoundingBoxAscent,
        bottom: y + metrics.actualBoundingBoxDescent,
        fitScale,
      };
    }),
  );
}

/** True if two ink boxes overlap at all, as rectangles. */
function boxesOverlap(a: OffTailInkBox, b: OffTailInkBox): boolean {
  const overlapsX = a.left < b.right && b.left < a.right;
  const overlapsY = a.top < b.bottom && b.top < a.bottom;
  return overlapsX && overlapsY;
}

function assertNoInkOverlaps(boxes: OffTailInkBox[]): void {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(boxesOverlap(boxes[i]!, boxes[j]!)).toBe(false);
    }
  }
}

test.describe("FINS off-tail height labels — a real phone, both unit systems", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "iphone" && testInfo.project.name !== "android",
      "phone-only ink-clearance proof",
    );
    await dismissSignInBanner(page);
  });

  for (const system of ["imperial", "metric"] as const) {
    test(`${system}: the rear and centre labels keep clear air, no ink boxes overlap, and nothing prints past the tail`, async ({
      page,
    }) => {
      if (system === "metric") await setMetricUnits(page);
      await navigateToMidlengthFins(page);

      const boxes = await measureOffTailInk(page);
      expect(boxes).toHaveLength(3);

      if (system === "metric") {
        // Prove this run really is Metric, not a silent Imperial run: formatMark's metric form
        // is "159 mm" — three digits, a space and two m glyphs, the widest lowercase letter
        // there is, which is exactly why the plan trusts a real browser here instead of an
        // estimate.
        for (const box of boxes) {
          expect(box.text.endsWith(" mm")).toBe(true);
        }
      }

      const rear = boxes.find((b) => b.role === "rear");
      const centre = boxes.find((b) => b.role === "center");
      if (!rear || !centre) throw new Error("missing rear or centre off-tail label");
      const [upper, lower] = [rear, centre].sort((a, b) => a.top - b.top);

      // The rule leaves 2.52 CSS px of air by construction (FIN_LABEL_CLEARANCE_EM's own
      // header comment) — 2 CSS px has real headroom. If this ever fails, raise
      // FIN_LABEL_CLEARANCE_EM and re-run; never lower this threshold.
      expect(lower.top - upper.bottom).toBeGreaterThanOrEqual(2 / upper.fitScale);

      assertNoInkOverlaps(boxes);

      // No off-tail label's ink ever prints below the board's tail line (TAIL_Y = 320).
      for (const box of boxes) {
        expect(box.bottom).toBeLessThanOrEqual(320.5);
      }
    });
  }
});

test.describe("FINS off-tail height labels — desktop is the nothing-moved-for-a-mouse proof", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only baseline proof");
    await dismissSignInBanner(page);
  });

  test("the three labels' x/y attributes sit exactly where they sat before this task", async ({ page }) => {
    await navigateToMidlengthFins(page);

    const attrs = await page.locator('[data-fin-dim="off-tail"]').evaluateAll((els) =>
      els.map((el) => ({
        role: el.getAttribute("data-fin-role"),
        x: Number(el.getAttribute("x")),
        y: Number(el.getAttribute("y")),
      })),
    );
    const byRole = Object.fromEntries(attrs.map((a) => [a.role, a])) as Record<
      string,
      { x: number; y: number }
    >;

    expect(byRole.front!.x).toBeCloseTo(66, 2);
    expect(byRole.front!.y).toBeCloseTo(250, 2);
    expect(byRole.rear!.x).toBeCloseTo(95.347, 2);
    expect(byRole.rear!.y).toBeCloseTo(290.25, 2);
    expect(byRole.center!.x).toBeCloseTo(150.347, 2);
    expect(byRole.center!.y).toBeCloseTo(288.771, 2);

    const boxes = await measureOffTailInk(page);
    assertNoInkOverlaps(boxes);
  });
});
