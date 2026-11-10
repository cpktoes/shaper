import { expect, test, type Locator, type Page } from "@playwright/test";
import { BOTTOM_COPY, layoutMarkColumnName } from "../components/bottom/bottom-copy";
import { BOTTOM_GUIDE_WORDS, guideHow } from "../components/bottom/bottom-guide-words";
import { bottomSheetLayout, bottomSheetStationsLine } from "../components/summary/bottom-sheet-fit";
import { BOTTOM_DATA_DEPTH_SHOWN, bottomDataRows, bottomLayoutMarks, type BottomDataRow } from "../lib/geometry/bottom";
import { columnUnitSuffix, formatDimBare, formatMarkBare } from "../lib/geometry/measure-display";
import type { Mm, UnitsSystem } from "../lib/geometry/units";
import { boardWithBottom, openOnBoard, type BoardWithBottom } from "./helpers/bottom-print";

/**
 * The order form's BOTTOM CONTOURS page (Phase 17, D-29; UI-SPEC §8) — the page a shaper takes to the bay to cut the
 * bottom from: the bottom from above, a section at each cut's deepest station, DATA's two tables, and a How to shape
 * note for each cut.
 *
 * What this file proves, on the real page:
 *
 * - a flat board's order form is the two pages it always was (three with the Rail Band Instructions ticked), with no
 *   such page anywhere;
 * - one cut adds the page, third, numbered with the others, and the Rail Band Instructions follow it;
 * - every number on the page is the board's own, said in the system the shaper picked — in Metric the stations read in
 *   centimetres, the depths and marks in whole millimetres, and not one inch mark is left on the page;
 * - a board whose cuts fill the page prints its two tables whole on a sheet of their own, never dropped.
 *
 * Boards with a bottom are opened through `helpers/bottom-print.ts`, which builds them with the BOTTOM screen's own
 * starting numbers; no expected figure below is typed — each is read from the board through the app's own unit rules
 * (CLAUDE.md Rules 1 and 2). Whether the page FITS its sheet, on both papers and on a phone's, is
 * `e2e/summary-planing.spec.ts`'s sweep.
 */

const SYSTEMS: UnitsSystem[] = ["imperial", "metric"];

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

/** `e2e/summary-planing.spec.ts`'s own, copied per this repo's convention that each spec carries its helpers. */
async function dismissChrome(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** `e2e/summary-planing.spec.ts`'s own: the localStorage key and the cookie the server paints its first page from. */
async function selectSystem(page: Page, system: UnitsSystem) {
  if (system === "metric") {
    await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
    await page.context().addCookies([{ name: "shaper-units", value: "metric", domain: "localhost", path: "/" }]);
  }
}

function sheets(page: Page): Locator {
  return page.locator("[data-order-form-sheet]");
}

/** A sheet's foot reads its title, the site's address and `Page N of M` — the spaces matched loosely, since a
 * browser may hand back a non-breaking one. */
function pageMark(title: string, page: number, of: number): RegExp {
  return new RegExp(`${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s")}[\\s\\S]*Page\\s${page}\\sof\\s${of}\\s*$`);
}

/**
 * Ticks "Include Rail Band Instructions in Print" under the paper and waits for its sheet. Retried until the tick
 * lands, because a tap made before React owns the box is lost — and never tapped twice, which would untick it.
 */
async function tickRailInstructions(page: Page, sheetsBefore: number) {
  const label = page.getByText("Include Rail Band Instructions in Print", { exact: true });
  await expect(async () => {
    if ((await sheets(page).count()) === sheetsBefore) await label.click({ timeout: 2_000 });
    await expect(sheets(page)).toHaveCount(sheetsBefore + 1, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/** Opens SUMMARY on a board with a bottom and waits until the kept board — not the stock one drawn first — is up. */
async function openSummaryOn(page: Page, board: BoardWithBottom) {
  await openOnBoard(page, board);
  await page.goto("/design/summary");
  await expect(page.locator("[data-bottom-sheet]")).toBeVisible({ timeout: 60_000 });
}

/** DATA's own cell rules (`components/bottom/bottom-data.tsx`), which the printed tables follow word for word. */
function depthCell(value: Mm, system: UnitsSystem): string {
  return value < BOTTOM_DATA_DEPTH_SHOWN ? BOTTOM_COPY.emptyCell : formatMarkBare(value, system);
}
function rowLabel(row: BottomDataRow, system: UnitsSystem): string {
  if (row.label === "tail") return BOTTOM_COPY.rowTail;
  if (row.label === "nose") return BOTTOM_COPY.rowNoseTip;
  return formatDimBare(row.station, system);
}

/** A table's body, as rows of cell text. */
async function tableCells(table: Locator): Promise<string[][]> {
  return table.locator("tbody tr").evaluateAll((rows) =>
    rows.map((row) => [...row.children].map((cell) => (cell.textContent ?? "").replace(/\s+/g, " ").trim())),
  );
}
async function tableHeads(table: Locator): Promise<string[]> {
  return table.locator("thead th").evaluateAll((cells) => cells.map((cell) => (cell.textContent ?? "").replace(/\s+/g, " ").trim()));
}

test.describe("Summary — the printed BOTTOM CONTOURS page (Phase 17, D-29)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  test("a flat board's order form is the two pages it always was — three with the Rail Band Instructions", async ({ page }) => {
    test.slow(); // the first draw of SUMMARY on a dev server, then a second layout with the tick
    await page.goto("/design/summary");

    await expect(sheets(page)).toHaveCount(2);
    await expect(sheets(page).nth(0)).toHaveText(/Page\s1\sof\s2\s*$/);
    await expect(sheets(page).nth(1)).toHaveText(pageMark("Shaper Reference", 2, 2));
    await expect(page.locator("[data-bottom-sheet]")).toHaveCount(0);
    await expect(page.locator("[data-bottom-tables-sheet]")).toHaveCount(0);
    await expect(page.getByText("Two portrait pages — print double-sided for a front-and-back form.", { exact: true })).toBeVisible();

    await tickRailInstructions(page, 2);
    await expect(sheets(page).nth(0)).toHaveText(/Page\s1\sof\s3\s*$/);
    await expect(sheets(page).nth(2)).toHaveText(pageMark("Rail Band Reference", 3, 3));
    await expect(page.locator("[data-bottom-sheet]")).toHaveCount(0);
    await expect(
      page.getByText("Two portrait pages, printed double-sided — plus a single-sided Rail Band Instructions page.", { exact: true }),
    ).toBeVisible();
  });

  test("a Deep Single Concave adds the page third, and the Rail Band Instructions follow it", async ({ page }) => {
    test.slow(); // two layouts of a four-sheet form on a dev server
    const board = boardWithBottom("shortboard", { center: "Deep Single Concave" });
    await openSummaryOn(page, board);

    await expect(sheets(page)).toHaveCount(3);
    await expect(sheets(page).nth(0)).toHaveText(/Page\s1\sof\s3\s*$/);
    await expect(sheets(page).nth(1)).toHaveText(pageMark("Shaper Reference", 2, 3));
    const bottomSheet = sheets(page).nth(2);
    await expect(bottomSheet.locator("[data-bottom-sheet]")).toHaveCount(1);
    await expect(bottomSheet).toHaveText(pageMark("Bottom Contours", 3, 3));

    // Its caption, and the cut's own head over its section.
    const body = bottomSheet.locator("[data-bottom-sheet]");
    await expect(body.getByText("Bottom Contours", { exact: true })).toBeVisible();
    await expect(body.getByText("Center: Deep Single Concave", { exact: true })).toBeVisible();
    await expect(body.locator('[data-bottom-sheet-section="center"]')).toBeVisible();
    await expect(body.locator("[data-bottom-sheet-section]")).toHaveCount(1);
    await expect(body.locator('[data-bottom-sheet-height="center"]')).toHaveText(/×\s?4/);

    // The four parts, top to bottom: the bottom from above, the section, the tables, how to shape it.
    const tops: number[] = [];
    for (const part of ["top", "sections", "tables", "notes"]) {
      const box = await body.locator(`[data-bottom-sheet-part="${part}"]`).boundingBox();
      expect(box, `the page's ${part} part is drawn`).not.toBeNull();
      expect(box!.height, `the page's ${part} part has a height`).toBeGreaterThan(10);
      tops.push(box!.y);
    }
    expect([...tops].sort((a, b) => a - b), "the four parts stand in order down the page").toEqual(tops);

    // The top view carries its marks: the wide point and the front fins above, the cut's three stations below.
    await expect(body.locator("[data-bottom-sheet-mark]")).toHaveCount(2);
    await expect(body.locator('[data-bottom-sheet-row="center"]')).toHaveText(/Start[\s\S]*Deepest[\s\S]*End/i);
    await expect(body.locator('[data-bottom-sheet-deepest="center"]')).toHaveCount(1);

    await tickRailInstructions(page, 3);
    await expect(sheets(page).nth(0)).toHaveText(/Page\s1\sof\s4\s*$/);
    await expect(sheets(page).nth(2).locator("[data-bottom-sheet]")).toHaveCount(1);
    await expect(sheets(page).nth(2)).toHaveText(pageMark("Bottom Contours", 3, 4));
    await expect(sheets(page).nth(3)).toHaveText(pageMark("Rail Band Reference", 4, 4));
  });

  for (const system of SYSTEMS) {
    test(`every number on the page is the board's own, in the shaper's system (${system})`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "one computer pass is enough to pin the figures");
      test.slow();
      const board = boardWithBottom("shortboard", { center: "Deep Single Concave", channels: 6 });
      await selectSystem(page, system);
      await openSummaryOn(page, board);
      const body = page.locator("[data-bottom-sheet]");

      // Two cuts, two sections, each with its three stations in words and a gauge reading.
      await expect(body.locator("[data-bottom-sheet-section]")).toHaveCount(2);
      await expect(body.getByText("Channels: 6", { exact: true })).toBeVisible();
      const { center, channels } = board.resolved;
      await expect(body.locator('[data-bottom-sheet-stations="center"]')).toHaveText(
        bottomSheetStationsLine("center", { start: center.start, deepest: center.deepest, end: center.end }, board.board, system),
      );
      await expect(body.locator('[data-bottom-sheet-stations="channels"]')).toHaveText(
        bottomSheetStationsLine("channels", { start: channels.start, deepest: channels.deepest, end: channels.end }, board.board, system),
      );
      await expect(body.locator('[data-bottom-sheet-readings="center"]')).toHaveText(/^At the deepest:\s\S/);
      expect(await body.locator("[data-bottom-sheet-gauge]").count(), "gauge readings on the sections").toBeGreaterThan(0);

      // The depths table: DATA's rows, every one, in this system's units.
      const rows = bottomDataRows(board.resolved, board.board);
      expect(rows.length, "the board has rows to print").toBeGreaterThan(8);
      const columns = BOTTOM_COPY.depthsColumns;
      const depths = body.locator("table[data-bottom-sheet-depths]");
      expect(await tableHeads(depths)).toEqual([
        `${columns.station}${columnUnitSuffix("dim", system)}`,
        `${columns.width}${columnUnitSuffix("dim", system)}`,
        `${columns.deepest}${columnUnitSuffix("mark", system)}`,
        `${columns.railLift}${columnUnitSuffix("mark", system)}`,
        `${columns.stringerLeft}${columnUnitSuffix("mark", system)}`,
      ]);
      expect(await tableCells(depths)).toEqual(
        rows.map((row) => [
          rowLabel(row, system),
          row.width === null ? BOTTOM_COPY.emptyCell : formatDimBare(row.width, system),
          depthCell(row.deepest, system),
          depthCell(row.railLift, system),
          row.stringerLeft === null ? BOTTOM_COPY.emptyCell : formatMarkBare(row.stringerLeft, system),
        ]),
      );
      // Non-vacuity: the cut is really in the table — some row carries a depth.
      expect(rows.some((row) => row.deepest >= BOTTOM_DATA_DEPTH_SHOWN), "a row with a depth to cut").toBe(true);

      // The layout marks: a column for each line a shaper rules, row for row with the depths.
      const marks = bottomLayoutMarks(board.resolved, board.board);
      expect(marks.columns.length, "the channels give the marks table columns").toBeGreaterThan(1);
      const marksTable = body.locator("table[data-bottom-sheet-marks]");
      expect(await tableHeads(marksTable)).toEqual([
        `${columns.station}${columnUnitSuffix("dim", system)}`,
        ...marks.columns.map((column) => layoutMarkColumnName(column)),
      ]);
      expect(await tableCells(marksTable)).toEqual(
        marks.rows.map((markRow, r) => [
          rowLabel(rows[r], system),
          ...markRow.cells.map((value) => (value === null ? BOTTOM_COPY.emptyCell : formatMarkBare(value, system))),
        ]),
      );

      // How to shape: the GUIDE's own note for each cut, word for word (the spacing said this system's way).
      const noteFor = (key: string) => guideHow(BOTTOM_GUIDE_WORDS.find((card) => card.key === key)!, system);
      const notes = body.locator('[data-bottom-sheet-part="notes"] p');
      await expect(notes).toHaveCount(2);
      await expect(notes.nth(0)).toHaveText(`Center: Deep Single Concave. ${noteFor("Deep Single Concave")}`);
      await expect(notes.nth(1)).toHaveText(`Channels: 6. ${noteFor("Channels")}`);

      const words = (await body.textContent()) ?? "";
      if (system === "metric") {
        // Not one inch mark on a Metric shaper's page (CLAUDE.md Rule 2).
        expect(words, "a Metric page carries no inch mark").not.toMatch(/["″]/);
        expect(words).toMatch(/\bmm\b/);
        expect(words).toMatch(/\bcm\b/);
      } else {
        expect(words, "an Imperial page carries no millimetres").not.toMatch(/\d\s?mm\b/);
        expect(words).toMatch(/\d"/);
      }
    });
  }

  test("a board whose cuts fill the page prints its two tables whole on a sheet of their own", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer pass is enough to pin the sheet count");
    test.slow();
    const board = boardWithBottom("longboard", {
      nose: "Teardrop Nose Concave",
      center: "Early Double Concave",
      tail: "Spiral Vee",
      channels: 8,
    });
    // Non-vacuity: this really is a board the page cannot hold, by the rule the order form itself asks.
    const layout = bottomSheetLayout(board.resolved, board.board, "imperial", board.frontPair);
    expect(layout.cuts.length, "a cut in every section, and channels").toBe(4);
    expect(layout.tablesOnOwnSheet, "the fit rule sends this board's tables to their own sheet").toBe(true);

    await openSummaryOn(page, board);
    await expect(sheets(page)).toHaveCount(4);
    const bottomSheet = sheets(page).nth(2);
    await expect(bottomSheet).toHaveText(pageMark("Bottom Contours", 3, 4));
    await expect(bottomSheet.locator("[data-bottom-sheet-section]")).toHaveCount(4);
    await expect(bottomSheet.locator('[data-bottom-sheet-part="notes"] p')).toHaveCount(4);
    await expect(bottomSheet.locator("table")).toHaveCount(0);

    const tablesSheet = sheets(page).nth(3);
    await expect(tablesSheet.locator("[data-bottom-tables-sheet]")).toHaveCount(1);
    await expect(tablesSheet).toHaveText(pageMark("Bottom Contours · Tables", 4, 4));
    const rows = bottomDataRows(board.resolved, board.board);
    await expect(tablesSheet.locator("table[data-bottom-sheet-depths] tbody tr")).toHaveCount(rows.length);
    await expect(tablesSheet.locator("table[data-bottom-sheet-marks] tbody tr")).toHaveCount(rows.length);
    await expect(tablesSheet.locator("table[data-bottom-sheet-marks] thead th")).toHaveCount(
      bottomLayoutMarks(board.resolved, board.board).columns.length + 1,
    );
    // DATA's notes on reading the tables follow them — as many as the sheet has room for, by the rule's own list.
    await expect(tablesSheet.locator('[data-bottom-sheet-part="table-notes"] p')).toHaveText(layout.tableNotes);
    await expect(page.getByText("Two portrait pages, printed double-sided — plus two Bottom Contours pages.", { exact: true })).toBeVisible();

    await tickRailInstructions(page, 4);
    await expect(sheets(page).nth(3)).toHaveText(pageMark("Bottom Contours · Tables", 4, 5));
    await expect(sheets(page).nth(4)).toHaveText(pageMark("Rail Band Reference", 5, 5));
  });
});
