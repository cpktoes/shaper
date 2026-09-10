import { expect, test, type Page } from "@playwright/test";

/**
 * Proves the Summary order form's phone preview (260909-i7r): on a phone, each sheet must draw as a
 * true shrunken picture of the printed page — laid out at its full design width and scaled down as
 * one piece — rather than being re-laid-out at the phone's own narrower width.
 *
 * Every phone case below runs on BOTH phone projects, `iphone` and `android` — never skip a single
 * phone project by name, only `desktop`. `iphone` is WebKit and `android` is Chromium, and the two
 * engines disagree about exactly the bug this file exists to catch: WebKit resolves a `zoom`-shrunk
 * container's `cqw` units against the SHRUNKEN size, dropping every type size to its clamp floor,
 * while Chromium gets it right. A Chromium-only pass here would have shipped an iPhone still showing
 * a different document than the one that prints.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY = "shaper-print-rail-instructions";

/** The width the order form is drawn and calibrated at — matches `--order-form-design-width`. */
const DESIGN_WIDTH = 880;
/** Tall over wide, from the sheet's own `aspect-ratio: 7.87 / 10.37` in order-form.css. */
const SHEET_ASPECT = 10.37 / 7.87;
/** The SHAPER ASSISTANT wordmark's type at the design width — `2.8cqw` of 880 — measured identical in both
 * engines once the sheet is laid out at its design width rather than the screen's. */
const WORDMARK_PX = 24.64;

/** Matches phone-screens.spec.ts's own idiom: dismiss the sign-in banner via sessionStorage, set
 * before navigation, so its height never confuses a layout assertion. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
}

/** Turns on the Rail Band Instructions print preference before the page loads, the same idiom
 * summary-print-size.spec.ts already uses. */
async function enableRailBandInstructions(page: Page) {
  await page.addInitScript((key) => {
    try {
      window.localStorage.setItem(key, "true");
    } catch {
      // Defensive, matching the phone specs' own guard around localStorage writes.
    }
  }, PRINT_RAIL_INSTRUCTIONS_STORAGE_KEY);
}

type PreviewGeometry = {
  /** The page wrapper's own content width — `clientWidth` less its computed left/right padding. */
  pageInnerWidth: number;
  /** The page wrapper's content box left edge in viewport coordinates (its own left border edge
   * plus its left padding) — the frame every sheet position below is measured relative to, since
   * the wrapper itself may sit beside a sidebar rather than at the viewport's own left edge. */
  pageContentLeft: number;
  /** The first sheet's painted box, from `getBoundingClientRect`. */
  firstSheet: { width: number; height: number; left: number; right: number };
  /** The first sheet's laid-out width, from `offsetWidth` — unaffected by any `transform` scale. */
  firstSheetOffsetWidth: number;
  /** The computed font size (px) of the SHAPER ASSISTANT wordmark, wherever it appears on the stack. */
  wordmarkPx: number;
  /** Every sheet's painted left/right edge. */
  sheetEdges: { left: number; right: number }[];
  /** The scaler's own painted bottom edge, so a "no dead space below the last sheet" check can
   * compare it against the last sheet's own bottom edge. */
  scalerBottom: number;
  lastSheetBottom: number;
  pageScrollWidth: number;
  pageClientWidth: number;
};

/** Reads every geometry figure a case needs in one `page.evaluate`, so no two figures can be read
 * a layout pass apart. */
async function readPreviewGeometry(page: Page): Promise<PreviewGeometry> {
  return page.evaluate(() => {
    const pageEl = document.querySelector("[data-order-form-page]") as HTMLElement;
    const pageStyle = getComputedStyle(pageEl);
    const pageRect = pageEl.getBoundingClientRect();
    const paddingLeft = parseFloat(pageStyle.paddingLeft);
    const paddingRight = parseFloat(pageStyle.paddingRight);
    const pageInnerWidth = pageEl.clientWidth - paddingLeft - paddingRight;
    const pageContentLeft = pageRect.left + paddingLeft;

    const sheets = Array.from(document.querySelectorAll("[data-order-form-sheet]")) as HTMLElement[];
    const firstSheetEl = sheets[0];
    const firstSheetRect = firstSheetEl.getBoundingClientRect();

    const wordmarkEl = document.querySelector(".order-form-wordmark") as HTMLElement;
    const wordmarkPx = parseFloat(getComputedStyle(wordmarkEl).fontSize);

    const sheetEdges = sheets.map((sheet) => {
      const rect = sheet.getBoundingClientRect();
      return { left: rect.left, right: rect.right };
    });

    const scalerEl = document.querySelector("[data-order-form-scaler]") as HTMLElement;
    const scalerRect = scalerEl.getBoundingClientRect();
    const lastSheetRect = sheets[sheets.length - 1].getBoundingClientRect();

    return {
      pageInnerWidth,
      pageContentLeft,
      firstSheet: {
        width: firstSheetRect.width,
        height: firstSheetRect.height,
        left: firstSheetRect.left,
        right: firstSheetRect.right,
      },
      firstSheetOffsetWidth: firstSheetEl.offsetWidth,
      wordmarkPx,
      sheetEdges,
      scalerBottom: scalerRect.bottom,
      lastSheetBottom: lastSheetRect.bottom,
      pageScrollWidth: pageEl.scrollWidth,
      pageClientWidth: pageEl.clientWidth,
    };
  });
}

test.describe("Summary order form — phone preview (260909-i7r)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissSignInBanner(page);
  });

  test("the whole sheet is shrunk to fit the screen", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only preview assertions");

    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-sheet]").first()).toBeVisible();
    const geometry = await readPreviewGeometry(page);

    expect(
      Math.abs(geometry.firstSheet.width - geometry.pageInnerWidth),
      "the painted sheet width should match the page wrapper's inner width",
    ).toBeLessThanOrEqual(1);

    expect(
      geometry.firstSheet.height / geometry.firstSheet.width,
      "the painted sheet's shape should still be the paper's own 10.37/7.87",
    ).toBeCloseTo(SHEET_ASPECT, 1);

    for (const edge of geometry.sheetEdges) {
      expect(edge.left, "every sheet's left edge should lie inside the viewport").toBeGreaterThanOrEqual(-1);
      expect(edge.right, "every sheet's right edge should lie inside the viewport").toBeLessThanOrEqual(
        geometry.pageClientWidth + 1,
      );
    }

    // The page wrapper's own scrollWidth is not asserted here: today it still carries the Print
    // Order Form button row's unrelated overflow (Fact 6), which is fixed separately in Task 3 —
    // that task adds its own page-wide "nothing scrolls sideways" case once the row wraps. This
    // case's own scope is the sheet stack, which the edge checks above already confirm sits fully
    // inside the viewport.
  });

  test("it is the same sheet a computer draws, only smaller", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only preview assertions");

    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-sheet]").first()).toBeVisible();
    const geometry = await readPreviewGeometry(page);

    // This is the case that fails today: without the scaling rule, a phone lays the sheet out at
    // its own (342/364px) width instead of the design width, and the wordmark falls to its 16px
    // clamp floor instead of reading the desktop's own 24.64px.
    expect(
      geometry.firstSheetOffsetWidth,
      "the sheet's laid-out width should be the design width, even though it paints smaller",
    ).toBe(DESIGN_WIDTH);

    expect(geometry.wordmarkPx, "the wordmark should compute to the desktop's own size").toBeCloseTo(
      WORDMARK_PX,
      1,
    );
  });

  test("the Rail Band Instructions sheet gets the same treatment", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only preview assertions");

    await enableRailBandInstructions(page);
    await page.goto("/design/summary");
    // The preference converges to the localStorage value a beat after the first paint, so wait for
    // the real count rather than "any".
    await expect(page.locator("[data-order-form-sheet]")).toHaveCount(3);

    const geometry = await readPreviewGeometry(page);

    for (const edge of geometry.sheetEdges) {
      expect(edge.left, "every sheet's left edge should lie inside the viewport").toBeGreaterThanOrEqual(-1);
    }

    expect(
      Math.abs(geometry.firstSheet.width - geometry.pageInnerWidth),
      "each sheet should still paint at the page wrapper's inner width with three sheets on the stack",
    ).toBeLessThanOrEqual(1);

    expect(
      Math.abs(geometry.scalerBottom - geometry.lastSheetBottom),
      "the scaler should reserve exactly the space the three sheets occupy, with no dead space below the last one",
    ).toBeLessThanOrEqual(1);
  });

  test("a computer still shows the order form at full size", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only regression assertion");

    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-sheet]").first()).toBeVisible();

    const geometry = await readPreviewGeometry(page);

    expect(
      Math.abs(geometry.firstSheet.width - DESIGN_WIDTH),
      "the painted sheet should be the design width",
    ).toBeLessThanOrEqual(1);
    expect(
      geometry.firstSheetOffsetWidth,
      "the sheet's laid-out width should equal its painted width on a computer",
    ).toBe(DESIGN_WIDTH);
    expect(geometry.wordmarkPx, "the wordmark should be the desktop's own size").toBeCloseTo(
      WORDMARK_PX,
      1,
    );

    // The stack is centred: the sheet's left edge, measured from the page wrapper's own content
    // edge (not the viewport's — the wrapper itself sits beside the site nav), should be half of
    // the leftover width inside that content box.
    const leftoverWidth = geometry.pageInnerWidth - geometry.firstSheet.width;
    const sheetLeftInWrapper = geometry.firstSheet.left - geometry.pageContentLeft;
    expect(
      Math.abs(sheetLeftInWrapper - leftoverWidth / 2),
      "the sheet should be centred in the page wrapper",
    ).toBeLessThanOrEqual(1);

    expect(
      geometry.pageScrollWidth,
      "a computer should never scroll sideways",
    ).toBe(geometry.pageClientWidth);
  });

  test("the Print Order Form button sits fully on the screen on a phone", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only regression assertion");

    await page.goto("/design/summary");
    await expect(page.locator("[data-order-form-sheet]").first()).toBeVisible();

    const printButton = page.getByRole("button", { name: "Print Order Form" });
    const buttonBox = await printButton.boundingBox();
    expect(buttonBox, "the Print Order Form button should have a bounding box").not.toBeNull();

    const viewportSize = page.viewportSize();
    expect(viewportSize, "the page should have a viewport size").not.toBeNull();

    expect(
      buttonBox!.x,
      "the Print Order Form button's left edge should be at or right of 0",
    ).toBeGreaterThanOrEqual(0);
    expect(
      buttonBox!.x + buttonBox!.width,
      "the Print Order Form button's right edge should be at or left of the viewport width",
    ).toBeLessThanOrEqual(viewportSize!.width);

    // Now that the button row wraps, it no longer overhangs the page wrapper — this is the whole
    // reason the Summary used to scroll sideways on a phone (Fact 6), independent of the sheet
    // stack's own scaling fix proven above.
    const geometry = await readPreviewGeometry(page);
    expect(
      geometry.pageScrollWidth,
      "the page should not scroll sideways now that the button row wraps",
    ).toBe(geometry.pageClientWidth);
  });
});
