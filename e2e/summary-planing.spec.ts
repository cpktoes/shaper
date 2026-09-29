import { expect, test, type Locator, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { join } from "node:path";
import { parseCsv } from "../lib/blanks/csv";
import { FIT_DEFAULTS_RANGE_IN } from "../lib/fit-defaults-preference";
import { FOIL_THICKNESS_RANGE_IN } from "../lib/geometry/foil";
import { formatMarkBare, measureSlider, planerPasses } from "../lib/geometry/measure-display";
import { planingTable } from "../lib/geometry/planing";
import { inchesToMm, mm, parseImperial, parseMetric, type Mm, type UnitsSystem } from "../lib/geometry/units";

/**
 * Browser proof for the order form's PLANING table (Phase 13 item 8, the founder's 2026-09-29
 * redirect to page 2, beside the rail markings, condensed to make room; reworked into a small
 * Deck/Bottom table by quick 260928-tst, after the founder saw the printed page: "Let's organize
 * this like the rail dims. Deck and Bottom are headers.").
 *
 * Runs signed out on the seed-CSV catalogue, exactly like `summary-blank.spec.ts`:
 * `playwright.config.ts` sets `SHAPER_BLANKS_SOURCE=seed-csv` for its own dev server, so ROCKER's
 * list reads the committed catalogue CSVs and no database is touched.
 *
 * Nothing here is typed. Every expected value in cases A and B is read off ROCKER's own screen
 * before the Summary is reached — the one exception is the no-blank sentence in case A, which is
 * the module's own fixed wording (`lib/geometry/planing.ts`'s `NO_BLANK_LINE`). Case D's candidate
 * lists are built by calling the app's own `planingTable` and `formatMarkBare` in Node, never by
 * hand-typing a string.
 *
 * Per `<plan_time_measurements>` in the quick 260928-tst plan this spec was reworked from: at 560
 * dots the rail table and the PLANING table can no longer sit side by side, so the rail labels wrap
 * there — a change from item 8, where the 20% column was stacked label over value and never wrapped.
 * Case D therefore logs the 560-dot print (rail row spread and rail content vs box) without
 * asserting anything about the rail rows there; every other width and the computer print still
 * assert one-line rail rows, unchanged from item 8. That 560-dot assertion is handed to item 8b,
 * whose own spec takes it over.
 *
 * Every helper below is COPIED from another spec rather than imported, per this repo's own
 * convention that each spec carries its own: `dismissChrome`, `blankList`, `firstFittingRow`,
 * `pickedCard`, `openRocker`, `pickFirstFittingBlank`, `goToSummary` and the CSV-reading pattern
 * are `e2e/summary-blank.spec.ts`'s own; `EXPECTED_SHEET_WIDTH_DOTS`, `EXPECTED_SHEET_HEIGHT_DOTS`,
 * `SHEET_TOLERANCE_DOTS`, `EXPECTED_SCALE`, `SCALE_TOLERANCE`, `PageGeometry`,
 * `findNextStreamKeyword`, `extractPageGeometries` and `assertPageIsCorrect` are
 * `e2e/summary-print-size.spec.ts`'s own, kept verbatim with their doc comments; `SWEEP_WIDTHS` and
 * `forceTouchSheet` are `e2e/summary-print-touch-box.spec.ts`'s own.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissChrome(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** ROCKER's list, once the streamed catalogue has arrived and been judged. */
function blankList(page: Page): Locator {
  return page.getByRole("list", { name: "Blanks" });
}

/** The first blank under FITS THIS BOARD. */
function firstFittingRow(page: Page): Locator {
  return blankList(page).locator('li[data-group="fits"] button').first();
}

/** ROCKER's picked-blank card. */
function pickedCard(page: Page): Locator {
  return page.locator("[data-picked-blank]");
}

async function openRocker(page: Page) {
  await page.goto("/design/rocker");
  await expect(blankList(page)).toBeVisible({ timeout: 30_000 });
  // The list streams in server-rendered and becomes live only once React hydrates it; a tap before
  // then is lost. Wait until React owns the first row and the search box.
  await page.waitForFunction(() => {
    const owned = (el: Element | null) => !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
    return (
      owned(document.querySelector('ul[aria-label="Blanks"] button')) &&
      owned(document.querySelector('input[aria-label="Search blanks"]'))
    );
  });
}

/** Pick the first blank under FITS THIS BOARD and return `vendor name`, read off the row's
 * accessible name (`Use <vendor> <name>`) before the tap. */
async function pickFirstFittingBlank(page: Page): Promise<string> {
  const row = firstFittingRow(page);
  const ariaLabel = (await row.getAttribute("aria-label")) ?? "";
  const expected = ariaLabel.replace(/^Use /, "").replace(/, doesn't fit: .*$/, "");
  expect(expected.length).toBeGreaterThan(0);
  await row.click();
  await expect(pickedCard(page)).toBeVisible();
  return expected;
}

/** Walk to SUMMARY by the app's own link — a full page load would reset the design in memory. */
async function goToSummary(page: Page) {
  await page.getByRole("link", { name: "SUMMARY", exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/design\/summary$/);
}

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

/** The page widths case D's sweep tests — bracketing the design width from well below to well
 * above (`e2e/summary-print-touch-box.spec.ts`'s own). */
const SWEEP_WIDTHS = [560, 618, 680, 733, 760, 812, 900];

/** Forces the touch attribute onto the root directly — used where a case needs the touch box on a
 * specific engine (Chromium, for measuring at print sizes) independent of whichever pointer that
 * project's own device profile emulates (`e2e/summary-print-touch-box.spec.ts`'s own). */
async function forceTouchSheet(page: Page) {
  await page.locator("[data-order-form-root]").evaluate((el) => el.setAttribute("data-print-touch", "true"));
}

/** Switches the app's own units preference before the first navigation — the design lives in
 * memory and the preference is read once at hydration, so this must run before `page.goto`. */
async function selectSystem(page: Page, system: UnitsSystem) {
  if (system === "metric") {
    await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
  }
}

/** The thickest `thickness_in` printed anywhere in the committed catalogue CSVs — read straight
 * off `db/seed/blanks/*.csv` with the same `parseCsv` the seed and `summary-blank.spec.ts` use, so
 * this number is never hand-typed (CLAUDE.md Rule 1). */
function thickestCatalogueThicknessIn(): number {
  const dir = join(__dirname, "..", "db", "seed", "blanks");
  let thickest = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".csv"))) {
    const [header, ...rows] = parseCsv(readFileSync(join(dir, file), "utf8"));
    const col = header.indexOf("thickness_in");
    expect(col, `${file} has a thickness_in column`).toBeGreaterThanOrEqual(0);
    for (const row of rows) {
      const value = Number.parseFloat(row[col] ?? "");
      if (Number.isFinite(value)) thickest = Math.max(thickest, value);
    }
  }
  return thickest;
}

/** The candidate lists page.evaluate below writes onto the live sheet — one list per
 * `[data-planing-cell]` (row-major: Foam Off deck, Foam Off bottom, Passes deck, Passes bottom)
 * plus the footnote. */
interface PlaningCandidateLists {
  railCells: string[];
  deckFoam: string[];
  bottomFoam: string[];
  deckPasses: string[];
  bottomPasses: string[];
  footnote: string[];
}

/** What `measureAndWrite` reads back after writing the widest candidates onto the live sheet. */
interface PlaningMeasurement {
  railRowHeights: number[];
  headerCellHeights: number[];
  cellOverflow: number[];
  railContentHeight: number;
  railBoxHeight: number;
  finContentHeight: number;
  finBoxHeight: number;
  /** The `[data-planing]` panel's own `scrollHeight - clientHeight`. */
  planingPanelOverflow: number;
  /** The `<table data-planing-table>`'s own drawn width minus its parent's `clientWidth`. */
  tableOverflow: number;
  /** Every `[data-planing-cell]` and `[data-planing-header]`'s own `scrollWidth - clientWidth`. */
  planingCellHeaderOverflow: number[];
  /** Whether each `[data-planing-label]` drew on one line — a `Range` over its own contents. */
  planingLabelOneLine: boolean[];
  railCaptionBottom: number;
  planingCaptionBottom: number;
  /** The rail header row's first value header's (`Nose`) text top. */
  railHeaderTop: number;
  /** The PLANING table's first column header's (`Deck`) text top. */
  planingHeaderTop: number;
  sheetOverflow: number[];
  labelColWidth: number;
  valueColWidth: number;
  /** The PLANING FormBox's own drawn width — the `.order-form-planing-col` element itself. */
  planingColWidth: number;
  /** The PLANING FormBox's right edge and the Rail Bands FormBox's left edge — PLANING sits first. */
  planingColRight: number;
  railBoxLeft: number;
  widest: {
    railCell: string;
    deckFoam: string;
    bottomFoam: string;
    deckPasses: string;
    bottomPasses: string;
    footnote: string;
  };
}

/**
 * Runs entirely inside the browser (`page.evaluate`) — self-contained, no reference to anything
 * outside its own argument, because Playwright serialises this function to run in the page.
 *
 * Picks each list's widest string by drawn width — a `Range` over the actual element it is about
 * to be written into (`summary-blank.spec.ts`'s own technique), so the measurement reflects the
 * real print-time font at whatever width the caller has already set the viewport to — writes the
 * widest rail string into every rail value cell and the widest planing strings into the four
 * `[data-planing-cell]` elements (row-major) and the `[data-planing-footnote]`, then reads back
 * every relationship the plan's `<verify>` and `T-tst-03` care about.
 */
function measureAndWrite(lists: PlaningCandidateLists): PlaningMeasurement {
  const widestOf = (probe: Element, candidates: string[]): string => {
    const range = document.createRange();
    let widest = candidates[0] ?? "";
    let widestPx = -1;
    for (const s of candidates) {
      probe.textContent = s;
      range.selectNodeContents(probe);
      const px = range.getBoundingClientRect().width;
      if (px > widestPx) {
        widestPx = px;
        widest = s;
      }
    }
    probe.textContent = widest;
    return widest;
  };

  /** The lowest descendant bottom edge minus the element's own top — "the content height" of a
   * container whose own box may be shorter (or taller) than what it holds. */
  const contentHeightOf = (el: Element): number => {
    const top = el.getBoundingClientRect().top;
    let maxBottom = top;
    const walk = (node: Element) => {
      for (const child of Array.from(node.children)) {
        const rect = child.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) maxBottom = Math.max(maxBottom, rect.bottom);
        walk(child);
      }
    };
    walk(el);
    return maxBottom - top;
  };

  const sheets = Array.from(document.querySelectorAll<HTMLElement>("[data-order-form-sheet]"));
  const referenceSheet = sheets[1];
  if (!referenceSheet) throw new Error("page 2's [data-order-form-sheet] was not found");

  const unfolds = Array.from(referenceSheet.querySelectorAll<HTMLElement>("[data-print-unfold]"));
  const railTable = unfolds[0];
  const finGrid = unfolds[1];
  if (!railTable || !finGrid) throw new Error("expected two [data-print-unfold] elements on page 2");

  const railHeaderRow = railTable.children[0] as HTMLElement;
  const headerCells = Array.from(railHeaderRow.children) as HTMLElement[];

  const rows = Array.from(railTable.querySelectorAll<HTMLElement>(":scope > div > div.flex")).filter(
    (row) => row.children.length === 4,
  );
  const valueCells = rows.flatMap((row) => Array.from(row.children).slice(1)) as HTMLElement[];

  const widestRailCell = valueCells.length > 0 ? widestOf(valueCells[0], lists.railCells) : "";
  for (const cell of valueCells) cell.textContent = widestRailCell;

  const planingCellEls = Array.from(referenceSheet.querySelectorAll<HTMLElement>("[data-planing-cell]"));
  const planingHeaderEls = Array.from(referenceSheet.querySelectorAll<HTMLElement>("[data-planing-header]"));
  const planingLabelEls = Array.from(referenceSheet.querySelectorAll<HTMLElement>("[data-planing-label]"));
  const planingFootnoteEl = referenceSheet.querySelector<HTMLElement>("[data-planing-footnote]");

  const widestDeckFoam = planingCellEls[0] ? widestOf(planingCellEls[0], lists.deckFoam) : "";
  const widestBottomFoam = planingCellEls[1] ? widestOf(planingCellEls[1], lists.bottomFoam) : "";
  const widestDeckPasses = planingCellEls[2] ? widestOf(planingCellEls[2], lists.deckPasses) : "";
  const widestBottomPasses = planingCellEls[3] ? widestOf(planingCellEls[3], lists.bottomPasses) : "";
  const widestFootnote = planingFootnoteEl ? widestOf(planingFootnoteEl, lists.footnote) : "";

  const railBandsRow = referenceSheet.querySelector<HTMLElement>("[data-rail-bands-row]");
  if (!railBandsRow) throw new Error("[data-rail-bands-row] not found");
  // PLANING is the row's FIRST box and Rail Bands the second — planing comes before rail shaping
  // (the founder, 2026-09-29).
  const planingFormBoxEl = railBandsRow.children[0] as HTMLElement;
  const railBox = railBandsRow.children[1] as HTMLElement;
  const railCaptionBottom = (railBox.children[0] as HTMLElement).getBoundingClientRect().bottom;
  const planingCaptionBottom = (planingFormBoxEl.children[0] as HTMLElement).getBoundingClientRect().bottom;

  const planingEl = referenceSheet.querySelector<HTMLElement>("[data-planing]");
  if (!planingEl) throw new Error("[data-planing] not found");

  const planingTableEl = referenceSheet.querySelector<HTMLElement>("[data-planing-table]");
  if (!planingTableEl) throw new Error("[data-planing-table] not found");
  const tableParent = planingTableEl.parentElement as HTMLElement;
  const tableOverflow = planingTableEl.getBoundingClientRect().width - tableParent.clientWidth;

  const labelRange = document.createRange();
  const planingLabelOneLine = planingLabelEls.map((el) => {
    labelRange.selectNodeContents(el);
    const tops = new Set(Array.from(labelRange.getClientRects()).map((r) => Math.round(r.top)));
    return tops.size === 1;
  });

  const railHeaderTop = (railHeaderRow.children[1] as HTMLElement | undefined)?.getBoundingClientRect().top ?? 0;
  const planingHeaderTop = planingHeaderEls[0] ? planingHeaderEls[0].getBoundingClientRect().top : 0;

  return {
    railRowHeights: rows.map((r) => r.getBoundingClientRect().height),
    headerCellHeights: headerCells.map((c) => c.getBoundingClientRect().height),
    cellOverflow: valueCells.map((c) => c.scrollWidth - c.clientWidth),
    railContentHeight: contentHeightOf(railTable),
    railBoxHeight: railTable.getBoundingClientRect().height,
    finContentHeight: contentHeightOf(finGrid),
    finBoxHeight: finGrid.getBoundingClientRect().height,
    planingPanelOverflow: planingEl.scrollHeight - planingEl.clientHeight,
    tableOverflow,
    planingCellHeaderOverflow: [...planingCellEls, ...planingHeaderEls].map((d) => d.scrollWidth - d.clientWidth),
    planingLabelOneLine,
    railCaptionBottom,
    planingCaptionBottom,
    railHeaderTop,
    planingHeaderTop,
    sheetOverflow: sheets.map((s) => s.scrollHeight - s.clientHeight),
    labelColWidth: rows[0] ? (rows[0].children[0] as HTMLElement).getBoundingClientRect().width : 0,
    valueColWidth: valueCells[0] ? valueCells[0].getBoundingClientRect().width : 0,
    planingColWidth: planingFormBoxEl.getBoundingClientRect().width,
    planingColRight: planingFormBoxEl.getBoundingClientRect().right,
    railBoxLeft: railBox.getBoundingClientRect().left,
    widest: {
      railCell: widestRailCell,
      deckFoam: widestDeckFoam,
      bottomFoam: widestBottomFoam,
      deckPasses: widestDeckPasses,
      bottomPasses: widestBottomPasses,
      footnote: widestFootnote,
    },
  };
}

/** The spread between the largest and smallest of a list of pixel measurements. */
function spread(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

/**
 * Every assertion case D makes on one `measureAndWrite` result. `mode` is `"computer"` for the
 * computer's print, `"touch"` for every phone width from 618 dots up (where the rail markings still
 * fit one line beside the wider PLANING table), and `"touch-560"` for the narrowest phone print,
 * where the two tables no longer fit side by side and the rail rows are known to wrap (handed to
 * item 8b) — so nothing about the rail rows is asserted there, only logged in the report line.
 */
function assertMeasurement(result: PlaningMeasurement, label: string, mode: "computer" | "touch" | "touch-560") {
  expect(
    result.planingColRight,
    `${label}: the PLANING table is not to the LEFT of Rail Bands (planing comes before rail shaping)`,
  ).toBeLessThanOrEqual(result.railBoxLeft + 0.5);
  expect(result.tableOverflow, `${label}: the PLANING table overflowed its own box`).toBeLessThanOrEqual(0.5);
  for (const overflow of result.planingCellHeaderOverflow) {
    expect(overflow, `${label}: a planing cell or header overflowed sideways`).toBeLessThanOrEqual(0.5);
  }
  for (const oneLine of result.planingLabelOneLine) {
    expect(oneLine, `${label}: a PLANING row label wrapped to two lines`).toBe(true);
  }
  expect(result.planingPanelOverflow, `${label}: the PLANING box overflowed`).toBeLessThanOrEqual(0.5);
  expect(
    Math.abs(result.railCaptionBottom - result.planingCaptionBottom),
    `${label}: the two caption rows do not line up`,
  ).toBeLessThanOrEqual(0.5);
  for (const overflow of result.sheetOverflow) {
    expect(overflow, `${label}: a sheet overflowed its own page box`).toBeLessThanOrEqual(0.5);
  }
  for (const overflow of result.cellOverflow) {
    expect(overflow, `${label}: a rail value cell overflowed sideways`).toBeLessThanOrEqual(0.5);
  }

  if (mode !== "touch-560") {
    expect(
      spread(result.railRowHeights),
      `${label}: rail row heights differ — a label wrapped`,
    ).toBeLessThanOrEqual(0.5);
    expect(spread(result.headerCellHeights), `${label}: header cell heights differ`).toBeLessThanOrEqual(0.5);
    expect(
      Math.abs(result.railHeaderTop - result.planingHeaderTop),
      `${label}: the two header rows' text does not line up`,
    ).toBeLessThanOrEqual(0.5);
  }

  if (mode === "computer") {
    expect(
      result.railContentHeight,
      `${label}: rail content (${result.railContentHeight.toFixed(1)}) taller than its box (${result.railBoxHeight.toFixed(1)})`,
    ).toBeLessThanOrEqual(result.railBoxHeight + 0.5);
    expect(
      result.finContentHeight,
      `${label}: fin content (${result.finContentHeight.toFixed(1)}) taller than its box (${result.finBoxHeight.toFixed(1)}) — a quad no longer clears Shaper Use Only`,
    ).toBeLessThanOrEqual(result.finBoxHeight + 0.5);
  }
}

const SYSTEMS: UnitsSystem[] = ["imperial", "metric"];

test.describe("Summary — the PLANING table (Phase 13 item 8, quick 260928-r9h; reworked 260928-tst)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  for (const system of SYSTEMS) {
    test(`with no blank picked, the PLANING table shows dashes and says to pick a blank (${system})`, async ({
      page,
    }) => {
      await selectSystem(page, system);
      await page.goto("/design/summary");

      const row = page.locator("[data-rail-bands-row]");
      await expect(row).toBeVisible();
      const planingCol = row.locator(":scope > div").nth(0);
      const captionSpan = planingCol.locator(":scope > div").nth(0).locator("span.order-form-caption");
      await expect(captionSpan).toHaveText("Planing");

      const headers = planingCol.locator("[data-planing-header]");
      await expect(headers).toHaveCount(2);
      expect(await headers.allTextContents()).toEqual(["Deck", "Bottom"]);

      const labels = planingCol.locator("[data-planing-label]");
      await expect(labels).toHaveCount(2);
      expect(await labels.allTextContents()).toEqual(["Foam Off", "Passes"]);

      const cells = planingCol.locator("[data-planing-cell]");
      await expect(cells).toHaveCount(4);
      expect(await cells.allTextContents()).toEqual(["—", "—", "—", "—"]);

      await expect(planingCol.locator("[data-planing-footnote]")).toHaveText(
        "Pick a blank on ROCKER for the planing numbers.",
      );
    });

    test(`with a blank picked, the PLANING table prints ROCKER's own foam off and passes, and the deck's passes worked the same way (${system})`, async ({
      page,
    }) => {
      await selectSystem(page, system);
      await openRocker(page);
      await pickFirstFittingBlank(page);

      const skinRaw = (await page.getByText(/^Deck Skin — /).textContent()) ?? "";
      const skin = skinRaw.replace(/^Deck Skin — /, "");

      const offBottom = (
        (await page.locator('[data-readouts] [data-readout-row="center"] > div').nth(2).textContent()) ?? ""
      ).trim();

      const passesText = ((await page.locator("[data-bottom-passes] span").last().textContent()) ?? "").trim();
      const bottomPasses = passesText.replace(/ passes?$/, "");

      const depthRaw = (await page.getByText(/ a pass — your Planer Max Depth\.$/).textContent()) ?? "";
      const depthMatch = depthRaw.match(/^At (.+) a pass — your Planer Max Depth\.$/);
      expect(depthMatch, `ROCKER's depth line did not match the expected shape: "${depthRaw}"`).not.toBeNull();
      const depth = depthMatch![1];

      if (system === "imperial") {
        expect(offBottom.endsWith('"'), `Off Bottom @ Center "${offBottom}" is not an Imperial mark`).toBe(true);
      } else {
        expect(offBottom, `Off Bottom @ Center "${offBottom}" is not a Metric mark`).toMatch(/ mm$/);
      }

      // The deck's pass count is worked the same way `planerPasses` works the bottom's — parsing
      // ROCKER's own printed Deck Skin and depth strings, never a typed number (CLAUDE.md Rule 1).
      const parse = (s: string): Mm | null => (system === "imperial" ? parseImperial(s) : parseMetric(s, "mm"));
      let deckPasses: string;
      if (skin === "none") {
        deckPasses = "0";
      } else {
        const skinParsed = parse(skin);
        const depthParsed = parse(depth);
        expect(skinParsed, `could not parse Deck Skin "${skin}"`).not.toBeNull();
        expect(depthParsed, `could not parse the depth "${depth}"`).not.toBeNull();
        deckPasses = String(planerPasses(skinParsed!, depthParsed!, system));
      }

      await goToSummary(page);

      const row = page.locator("[data-rail-bands-row]");
      const planingCol = row.locator(":scope > div").nth(0);

      const headers = planingCol.locator("[data-planing-header]");
      expect(await headers.allTextContents()).toEqual(["Deck", "Bottom"]);

      const labels = planingCol.locator("[data-planing-label]");
      expect(await labels.allTextContents()).toEqual(["Foam Off", "Passes"]);

      const cells = planingCol.locator("[data-planing-cell]");
      expect(await cells.allTextContents()).toEqual([skin, offBottom, deckPasses, bottomPasses]);

      await expect(planingCol.locator("[data-planing-footnote]")).toHaveText(
        `At the center, at ${depth} a pass — your Planer Max Depth.`,
      );
    });

    test(`on paper, with a blank picked, both pages print at true size on Letter and A4 with the PLANING table on the back (${system})`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "page.pdf() is Chromium-headless only");

      await selectSystem(page, system);
      await openRocker(page);
      await pickFirstFittingBlank(page);
      await goToSummary(page);

      const cells = page.locator("[data-planing-cell]");
      await expect(cells).toHaveCount(4);
      expect(await cells.first().textContent()).not.toBe("—");

      // The no-blank PDF is already summary-print-size.spec.ts's first case, and that sheet now
      // carries the table and the no-blank line — nothing further to prove for it here.
      for (const format of ["Letter", "A4"] as const) {
        const pdfBytes = await page.pdf({ format, printBackground: false });
        const geometries = extractPageGeometries(pdfBytes);
        expect(geometries, `${format} (${system}): expected exactly two content pages`).toHaveLength(2);
        geometries.forEach((geometry, i) => assertPageIsCorrect(geometry, `${format} (${system}) page ${i + 1}`));
      }
    });

    test(`the rail markings never wrap and a quad's fins still clear the shop box, with the widest numbers any board can carry, on a computer's print and at every phone print width (${system})`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "measures layout at print sizes; one engine is enough");

      await selectSystem(page, system);
      await openRocker(page);
      await pickFirstFittingBlank(page);
      // A quad fills the Fin Placement box the most.
      await page.getByRole("link", { name: "FINS", exact: true }).filter({ visible: true }).first().click();
      await page.getByRole("button", { name: "Quad", exact: true }).first().click();
      await goToSummary(page);

      // Every candidate built from the app's own helpers, never typed (CLAUDE.md Rule 1).
      const railCells = new Set<string>(["Hard Edge", "—"]);
      for (let v = 0; v <= inchesToMm(FOIL_THICKNESS_RANGE_IN.max); v += 0.5) {
        railCells.add(formatMarkBare(mm(v), system));
      }

      const skinSweep: Mm[] = [];
      for (let v = 0; v <= inchesToMm(FIT_DEFAULTS_RANGE_IN.deckSkin.max); v += 0.5) skinSweep.push(mm(v));

      const centerGapMinMm = -inchesToMm(FOIL_THICKNESS_RANGE_IN.max + FIT_DEFAULTS_RANGE_IN.deckSkin.max);
      const centerGapMaxMm = inchesToMm(thickestCatalogueThicknessIn());
      const gapSweep: Mm[] = [];
      for (let g = centerGapMinMm; g <= centerGapMaxMm; g += 0.5) gapSweep.push(mm(g));

      const passDepths: Mm[] =
        system === "imperial"
          ? (() => {
              const minK = Math.round(FIT_DEFAULTS_RANGE_IN.planerMaxDepth.min * 16);
              const maxK = Math.round(FIT_DEFAULTS_RANGE_IN.planerMaxDepth.max * 16);
              const out: Mm[] = [];
              for (let k = minK; k <= maxK; k++) out.push(inchesToMm(k / 16));
              return out;
            })()
          : (() => {
              const view = measureSlider(
                mm(0),
                FIT_DEFAULTS_RANGE_IN.planerMaxDepth,
                FIT_DEFAULTS_RANGE_IN.planerMaxDepth.step,
                1,
                "metric",
              );
              const out: Mm[] = [];
              for (let v = view.min; v <= view.max; v += 1) out.push(mm(v));
              return out;
            })();

      const arbitraryDepth = passDepths[0];

      const deckFoam = new Set<string>();
      for (const skin of skinSweep) {
        const t = planingTable({ blank: { cut: { deckSkin: skin }, centerGap: mm(0) } }, arbitraryDepth, system);
        deckFoam.add(t.rows[0].deck);
      }

      const bottomFoam = new Set<string>();
      for (const gap of gapSweep) {
        const t = planingTable({ blank: { cut: { deckSkin: mm(0) }, centerGap: gap } }, arbitraryDepth, system);
        bottomFoam.add(t.rows[0].bottom);
      }

      const deckPasses = new Set<string>();
      for (const skin of skinSweep) {
        for (const depth of passDepths) {
          const t = planingTable({ blank: { cut: { deckSkin: skin }, centerGap: mm(0) } }, depth, system);
          deckPasses.add(t.rows[1].deck);
        }
      }

      const bottomPasses = new Set<string>();
      for (const gap of gapSweep) {
        for (const depth of passDepths) {
          const t = planingTable({ blank: { cut: { deckSkin: mm(0) }, centerGap: gap } }, depth, system);
          bottomPasses.add(t.rows[1].bottom);
        }
      }

      const footnote = new Set<string>();
      for (const depth of passDepths) {
        const t = planingTable(
          { blank: { cut: { deckSkin: inchesToMm(1 / 8) }, centerGap: inchesToMm(1 / 8) } },
          depth,
          system,
        );
        footnote.add(t.footnote);
      }

      // Non-vacuity guard: every list must genuinely carry a spread of numbers, not one repeated
      // value. The Deck Skin control runs from none to 1" (quick 260928-lm6), so the deck foam-off
      // list holds at least every sixteenth in that range; the footnote list holds exactly one
      // "at … a pass" per Planer Max Depth the control offers (four sixteenths in Imperial, five
      // whole millimetres in Metric); the deck passes list must include 0 (a none skin) and the most
      // passes the deck can ever need (the widest skin at the finest pass depth).
      expect(deckFoam.size, "Deck Foam Off candidates").toBeGreaterThanOrEqual(
        Math.round(FIT_DEFAULTS_RANGE_IN.deckSkin.max * 16) + 1,
      );
      expect(bottomFoam.size, "Bottom Foam Off candidates").toBeGreaterThan(20);
      expect(bottomPasses.size, "Bottom Passes candidates").toBeGreaterThan(20);
      expect(deckPasses.has("0"), "Deck Passes candidates should include 0 (a none skin)").toBe(true);
      const maxDeckPasses = String(
        planerPasses(inchesToMm(FIT_DEFAULTS_RANGE_IN.deckSkin.max), passDepths[0], system),
      );
      expect(
        deckPasses.has(maxDeckPasses),
        `Deck Passes candidates should include ${maxDeckPasses}, the most passes the deck can need`,
      ).toBe(true);
      expect(footnote.size, "footnote candidates").toBe(passDepths.length);

      const lists: PlaningCandidateLists = {
        railCells: [...railCells],
        deckFoam: [...deckFoam],
        bottomFoam: [...bottomFoam],
        deckPasses: [...deckPasses],
        bottomPasses: [...bottomPasses],
        footnote: [...footnote],
      };

      const report = (label: string, result: PlaningMeasurement) =>
        `[260928-tst] ${label}: label ${result.labelColWidth.toFixed(1)}px, value ${result.valueColWidth.toFixed(1)}px, ` +
        `PLANING ${result.planingColWidth.toFixed(1)}px, rail row spread ${spread(result.railRowHeights).toFixed(2)}, ` +
        `rail content ${result.railContentHeight.toFixed(1)} vs box ${result.railBoxHeight.toFixed(1)}, ` +
        `fin content ${result.finContentHeight.toFixed(1)} vs box ${result.finBoxHeight.toFixed(1)}, widest: ${JSON.stringify(result.widest)}`;

      // (i) the computer's print — viewport 1280 x 800, no touch attribute.
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.emulateMedia({ media: "print" });
      const computerResult = await page.evaluate(measureAndWrite, lists);
      await page.emulateMedia({ media: "screen" });
      const computerLine = report(`computer print (${system})`, computerResult);
      console.log(computerLine);
      await testInfo.attach(`computer print (${system})`, { body: computerLine, contentType: "text/plain" });
      assertMeasurement(computerResult, `computer print (${system})`, "computer");

      // (ii) after forceTouchSheet, at each width in SWEEP_WIDTHS — 560 asserts nothing about the
      // rail rows (the wrap is known and handed to item 8b), every other width does.
      await forceTouchSheet(page);
      for (const width of SWEEP_WIDTHS) {
        await page.setViewportSize({ width, height: 1400 });
        await page.emulateMedia({ media: "print" });
        const result = await page.evaluate(measureAndWrite, lists);
        await page.emulateMedia({ media: "screen" });
        const line = report(`touch ${width} (${system})`, result);
        console.log(line);
        await testInfo.attach(`touch ${width} (${system})`, { body: line, contentType: "text/plain" });
        assertMeasurement(result, `touch ${width} (${system})`, width === 560 ? "touch-560" : "touch");
      }
    });
  }
});
