import { expect, test, type Locator, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { join } from "node:path";
import { parseCsv } from "../lib/blanks/csv";
import { FIT_DEFAULTS_RANGE_IN } from "../lib/fit-defaults-preference";
import { FOIL_THICKNESS_RANGE_IN } from "../lib/geometry/foil";
import { formatMarkBare, measureSlider } from "../lib/geometry/measure-display";
import { planingBox } from "../lib/geometry/planing";
import { inchesToMm, mm, type Mm, type UnitsSystem } from "../lib/geometry/units";

/**
 * Browser proof for the order form's PLANING column (Phase 13 item 8, the founder's 2026-09-29
 * redirect to page 2, beside the rail markings, condensed to make room).
 *
 * Runs signed out on the seed-CSV catalogue, exactly like `summary-blank.spec.ts`:
 * `playwright.config.ts` sets `SHAPER_BLANKS_SOURCE=seed-csv` for its own dev server, so ROCKER's
 * list reads the committed catalogue CSVs and no database is touched.
 *
 * Nothing here is typed. Every expected value in cases A and B is read off ROCKER's own screen
 * before the Summary is reached — the one exception is the no-blank sentence in case A, which is
 * the module's own fixed wording (`lib/geometry/planing.ts`'s `NO_BLANK_LINE`). Case D's candidate
 * lists are built by calling the app's own `planingBox` and `formatMarkBare` in Node, never by
 * hand-typing a string.
 *
 * Per `<plan_time_measurements>` in the plan this spec was written from: on a touch print at 733
 * dots and narrower, the rail table was ALREADY taller than its own box before this change — a
 * pre-existing overflow, unchanged by this plan and out of scope for it. Case D therefore asserts
 * that the rail table and the fin grid stay inside their own boxes only at the computer's print;
 * at every touch width it asserts only that nothing NEW broke (rows stay equal height, no cell
 * clips sideways, no sheet spills past its own edge) — the same set of checks the plan's own
 * `<threat_model>` (T-r9h-03) calls for.
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

/** The candidate lists page.evaluate below writes into the DOM. */
interface PlaningCandidateLists {
  railCells: string[];
  skin: string[];
  offBottom: string[];
  passes: string[];
  note: string[];
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
  planingBoxOverflow: number;
  planingDescendantOverflow: number[];
  railCaptionBottom: number;
  planingCaptionBottom: number;
  planingLabelHeights: number[];
  sheetOverflow: number[];
  labelColWidth: number;
  valueColWidth: number;
  planingColWidth: number;
  widest: { railCell: string; skin: string; offBottom: string; passes: string; note: string };
}

/**
 * Runs entirely inside the browser (`page.evaluate`) — self-contained, no reference to anything
 * outside its own argument, because Playwright serialises this function to run in the page.
 *
 * Picks each list's widest string by drawn width — a `Range` over the actual element it is about
 * to be written into (`summary-blank.spec.ts`'s own technique), so the measurement reflects the
 * real print-time font at whatever width the caller has already set the viewport to — writes the
 * widest rail string into every rail value cell and the widest planing strings into the three
 * `[data-planing-value]` elements and the `[data-planing-note]`, then reads back every
 * relationship the plan's `<verify>` and `T-r9h-03` care about.
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

  const planingValueEls = Array.from(referenceSheet.querySelectorAll<HTMLElement>("[data-planing-value]"));
  const planingNoteEls = Array.from(referenceSheet.querySelectorAll<HTMLElement>("[data-planing-note]"));

  const widestRailCell = valueCells.length > 0 ? widestOf(valueCells[0], lists.railCells) : "";
  for (const cell of valueCells) cell.textContent = widestRailCell;

  const widestSkin = planingValueEls[0] ? widestOf(planingValueEls[0], lists.skin) : "";
  const widestOffBottom = planingValueEls[1] ? widestOf(planingValueEls[1], lists.offBottom) : "";
  const widestPasses = planingValueEls[2] ? widestOf(planingValueEls[2], lists.passes) : "";
  const widestNote = planingNoteEls[0] ? widestOf(planingNoteEls[0], lists.note) : "";

  const railBandsRow = referenceSheet.querySelector<HTMLElement>("[data-rail-bands-row]");
  if (!railBandsRow) throw new Error("[data-rail-bands-row] not found");
  const railBox = railBandsRow.children[0] as HTMLElement;
  const planingBoxEl = railBandsRow.children[1] as HTMLElement;
  const railCaptionBottom = (railBox.children[0] as HTMLElement).getBoundingClientRect().bottom;
  const planingCaptionBottom = (planingBoxEl.children[0] as HTMLElement).getBoundingClientRect().bottom;

  const planingEl = referenceSheet.querySelector<HTMLElement>("[data-planing]");
  if (!planingEl) throw new Error("[data-planing] not found");
  const planingDescendants = Array.from(planingEl.querySelectorAll<HTMLElement>("*"));
  const planingLabelHeights = Array.from(
    referenceSheet.querySelectorAll<HTMLElement>("[data-planing-label]"),
  ).map((el) => el.getBoundingClientRect().height);

  return {
    railRowHeights: rows.map((r) => r.getBoundingClientRect().height),
    headerCellHeights: headerCells.map((c) => c.getBoundingClientRect().height),
    cellOverflow: valueCells.map((c) => c.scrollWidth - c.clientWidth),
    railContentHeight: contentHeightOf(railTable),
    railBoxHeight: railTable.getBoundingClientRect().height,
    finContentHeight: contentHeightOf(finGrid),
    finBoxHeight: finGrid.getBoundingClientRect().height,
    planingBoxOverflow: planingEl.scrollHeight - planingEl.clientHeight,
    planingDescendantOverflow: planingDescendants.map((d) => d.scrollWidth - d.clientWidth),
    railCaptionBottom,
    planingCaptionBottom,
    planingLabelHeights,
    sheetOverflow: sheets.map((s) => s.scrollHeight - s.clientHeight),
    labelColWidth: rows[0] ? (rows[0].children[0] as HTMLElement).getBoundingClientRect().width : 0,
    valueColWidth: valueCells[0] ? valueCells[0].getBoundingClientRect().width : 0,
    planingColWidth: planingEl.getBoundingClientRect().width,
    widest: {
      railCell: widestRailCell,
      skin: widestSkin,
      offBottom: widestOffBottom,
      passes: widestPasses,
      note: widestNote,
    },
  };
}

/** The spread between the largest and smallest of a list of pixel measurements. */
function spread(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

/** Every assertion case D makes on one `measureAndWrite` result — shared between the computer
 * print and every touch-sweep width, with two checks reserved for the computer print only (the
 * pre-existing touch overflow this plan leaves untouched, see the file's own doc comment). */
function assertMeasurement(result: PlaningMeasurement, label: string, computerOnly: boolean) {
  expect(spread(result.railRowHeights), `${label}: rail row heights differ — a label wrapped`).toBeLessThanOrEqual(
    0.5,
  );
  expect(spread(result.headerCellHeights), `${label}: header cell heights differ`).toBeLessThanOrEqual(0.5);
  for (const overflow of result.cellOverflow) {
    expect(overflow, `${label}: a rail value cell overflowed sideways`).toBeLessThanOrEqual(0.5);
  }
  expect(result.planingBoxOverflow, `${label}: the PLANING box overflowed`).toBeLessThanOrEqual(0.5);
  for (const overflow of result.planingDescendantOverflow) {
    expect(overflow, `${label}: something inside PLANING overflowed sideways`).toBeLessThanOrEqual(0.5);
  }
  expect(
    Math.abs(result.railCaptionBottom - result.planingCaptionBottom),
    `${label}: the two caption rows do not line up`,
  ).toBeLessThanOrEqual(0.5);
  for (const overflow of result.sheetOverflow) {
    expect(overflow, `${label}: a sheet overflowed its own page box`).toBeLessThanOrEqual(0.5);
  }
  if (computerOnly) {
    expect(
      result.railContentHeight,
      `${label}: rail content (${result.railContentHeight.toFixed(1)}) taller than its box (${result.railBoxHeight.toFixed(1)})`,
    ).toBeLessThanOrEqual(result.railBoxHeight + 0.5);
    expect(
      result.finContentHeight,
      `${label}: fin content (${result.finContentHeight.toFixed(1)}) taller than its box (${result.finBoxHeight.toFixed(1)}) — a quad no longer clears Shaper Use Only`,
    ).toBeLessThanOrEqual(result.finBoxHeight + 0.5);
    expect(
      spread(result.planingLabelHeights),
      `${label}: a PLANING label wrapped to two lines`,
    ).toBeLessThanOrEqual(0.5);
  }
}

const SYSTEMS: UnitsSystem[] = ["imperial", "metric"];

test.describe("Summary — the PLANING column (Phase 13 item 8, quick 260928-r9h)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  for (const system of SYSTEMS) {
    test(`with no blank picked, the PLANING column says to pick a blank and nothing else (${system})`, async ({
      page,
    }) => {
      await selectSystem(page, system);
      await page.goto("/design/summary");

      const row = page.locator("[data-rail-bands-row]");
      await expect(row).toBeVisible();
      const planingCol = row.locator(":scope > div").nth(1);
      const captionSpan = planingCol.locator(":scope > div").nth(0).locator("span.order-form-caption");
      await expect(captionSpan).toHaveText("Planing");
      await expect(page.locator("[data-planing-empty]")).toHaveText(
        "Pick a blank on ROCKER for the planing numbers.",
      );
      await expect(page.locator("[data-planing-item]")).toHaveCount(0);
    });

    test(`with a blank picked, the PLANING column prints ROCKER's own Deck Skin, foam off the bottom at the center and planer passes (${system})`, async ({
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

      const passes = ((await page.locator("[data-bottom-passes] span").last().textContent()) ?? "").trim();

      const depthRaw = (await page.getByText(/ a pass — your Planer Max Depth\.$/).textContent()) ?? "";
      const depthMatch = depthRaw.match(/^At (.+) a pass — your Planer Max Depth\.$/);
      expect(depthMatch, `ROCKER's depth line did not match the expected shape: "${depthRaw}"`).not.toBeNull();
      const depth = depthMatch![1];

      if (system === "imperial") {
        expect(offBottom.endsWith('"'), `Off Bottom @ Center "${offBottom}" is not an Imperial mark`).toBe(true);
      } else {
        expect(offBottom, `Off Bottom @ Center "${offBottom}" is not a Metric mark`).toMatch(/ mm$/);
      }

      await goToSummary(page);

      const row = page.locator("[data-rail-bands-row]");
      const planingCol = row.locator(":scope > div").nth(1);
      await expect(planingCol.locator("[data-planing-item]")).toHaveCount(3);
      const labels = await planingCol.locator("[data-planing-label]").allTextContents();
      const values = await planingCol.locator("[data-planing-value]").allTextContents();
      expect(labels).toEqual(["Deck Skin", "Off Bottom @ Center", "Planer Passes"]);
      expect(values).toEqual([skin, offBottom, passes]);
      const notes = planingCol.locator("[data-planing-note]");
      await expect(notes).toHaveCount(1);
      await expect(notes).toHaveText(`at ${depth} a pass`);
      await expect(planingCol.locator("[data-planing-empty]")).toHaveCount(0);
    });

    test(`on paper, with a blank picked, both pages print at true size on Letter and A4 with the PLANING column on the back (${system})`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "page.pdf() is Chromium-headless only");

      await selectSystem(page, system);
      await openRocker(page);
      await pickFirstFittingBlank(page);
      await goToSummary(page);
      await expect(page.locator("[data-planing-item]")).toHaveCount(3);

      // The no-blank PDF is already summary-print-size.spec.ts's first case, and that sheet now
      // carries the condensed table and the no-blank line — nothing further to prove for it here.
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

      const skinValues = new Set<string>();
      for (let v = 0; v <= inchesToMm(FIT_DEFAULTS_RANGE_IN.deckSkin.max); v += 0.5) {
        const box = planingBox({ blank: { cut: { deckSkin: mm(v) }, centerGap: mm(0) } }, inchesToMm(1 / 8), system);
        skinValues.add(box.items[0].value);
      }

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

      const centerGapMinMm = -inchesToMm(FOIL_THICKNESS_RANGE_IN.max + FIT_DEFAULTS_RANGE_IN.deckSkin.max);
      const centerGapMaxMm = inchesToMm(thickestCatalogueThicknessIn());
      const offBottomValues = new Set<string>();
      const passesValues = new Set<string>();
      const noteValues = new Set<string>();
      for (let g = centerGapMinMm; g <= centerGapMaxMm; g += 0.5) {
        for (const depth of passDepths) {
          const box = planingBox({ blank: { cut: { deckSkin: mm(0) }, centerGap: mm(g) } }, depth, system);
          offBottomValues.add(box.items[1].value);
          passesValues.add(box.items[2].value);
          if (box.items[2].note !== null) noteValues.add(box.items[2].note);
        }
      }

      // Non-vacuity guard: every list must genuinely carry a spread of numbers, not one repeated
      // value.
      expect(skinValues.size, "Deck Skin candidates").toBeGreaterThan(20);
      expect(offBottomValues.size, "Off Bottom @ Center candidates").toBeGreaterThan(20);
      expect(passesValues.size, "Planer Passes candidates").toBeGreaterThan(20);
      expect(noteValues.size, "note candidates").toBeGreaterThan(20);

      const lists: PlaningCandidateLists = {
        railCells: [...railCells],
        skin: [...skinValues],
        offBottom: [...offBottomValues],
        passes: [...passesValues],
        note: [...noteValues],
      };

      const report = (label: string, result: PlaningMeasurement) =>
        `[260928-r9h] ${label}: label ${result.labelColWidth.toFixed(1)}px, value ${result.valueColWidth.toFixed(1)}px, ` +
        `PLANING ${result.planingColWidth.toFixed(1)}px, rail content ${result.railContentHeight.toFixed(1)} vs box ${result.railBoxHeight.toFixed(1)}, ` +
        `fin content ${result.finContentHeight.toFixed(1)} vs box ${result.finBoxHeight.toFixed(1)}, widest: ${JSON.stringify(result.widest)}`;

      // (i) the computer's print — viewport 1280 x 800, no touch attribute.
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.emulateMedia({ media: "print" });
      const computerResult = await page.evaluate(measureAndWrite, lists);
      await page.emulateMedia({ media: "screen" });
      const computerLine = report(`computer print (${system})`, computerResult);
      console.log(computerLine);
      await testInfo.attach(`computer print (${system})`, { body: computerLine, contentType: "text/plain" });
      assertMeasurement(computerResult, `computer print (${system})`, true);

      // (ii) after forceTouchSheet, at each width in SWEEP_WIDTHS.
      await forceTouchSheet(page);
      for (const width of SWEEP_WIDTHS) {
        await page.setViewportSize({ width, height: 1400 });
        await page.emulateMedia({ media: "print" });
        const result = await page.evaluate(measureAndWrite, lists);
        await page.emulateMedia({ media: "screen" });
        const line = report(`touch ${width} (${system})`, result);
        console.log(line);
        await testInfo.attach(`touch ${width} (${system})`, { body: line, contentType: "text/plain" });
        assertMeasurement(result, `touch ${width} (${system})`, false);
      }
    });
  }
});
