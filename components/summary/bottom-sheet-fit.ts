/**
 * How the order form's BOTTOM CONTOURS page is laid out, and whether its two tables fit on it (Phase 17, D-29;
 * UI-SPEC §8).
 *
 * The page carries four parts, top to bottom: the bottom seen from above, a cross-section at each cut's deepest
 * station, the two tables from BOTTOM's DATA tab, and a How to shape note for each cut. A board with one or two cuts
 * fits all four on one sheet. A long board with a cut in every section does not — nineteen rows of numbers twice over
 * will not sit under four drawings — and a number a shaper cuts foam to is never dropped or shrunk to fit. So this
 * file decides, from the board alone, whether the two tables stay on the page or take a sheet of their own, and the
 * order form counts its sheets and numbers its pages from the same answer. And on a board so long that its two tables
 * will not share even that sheet — over 11'6" (25 rows, every 6" and the nose tip) with a layout-mark column — each
 * table takes a sheet to itself, whole from Tail to Nose tip (quick 261113-vya).
 *
 * And once the tables have gone, the page's own parts — the picture, the sections and the notes — can still fill it on
 * a board drawn tall with a cut in every section, or under a long note. The rule then gives the room itself: the bottom
 * from above, the page's one part made to give way, is drawn the fewest whole dots smaller that make the page fit
 * (`topViewRoom`, quick 261125-v2j), rather than left for the browser to squeeze, labels and all — found by halving
 * rather than one dot at a time, and never under half the picture's own room (quick 261126-czw, D-04).
 *
 * Pure and the same on the server and in the browser: nothing here measures a screen. The heights below are the
 * page's own parts as they measured on the two sheets this form prints on — a computer's printed sheet and a phone's —
 * written down as arithmetic and checked against the real pages by `e2e/summary-planing.spec.ts`'s fit sweep, on both
 * papers and at every phone sheet width. They are sizes of things on paper — rows of type, picture boxes — never a
 * board's own measurement, so no inch or millimetre figure appears here (CLAUDE.md Rule 2).
 */
import { BOTTOM_COPY, layoutMarksNote, referenceRowsNote } from "@/components/bottom/bottom-copy";
import { BOTTOM_GUIDE_WORDS, guideHowOnPaper } from "@/components/bottom/bottom-guide-words";
import { formatBottomStation } from "@/lib/geometry/blank-reasons";
import {
  bottomDataRows,
  bottomLayoutMarks,
  stationFromNearestTip,
  type BottomBoard,
  type BottomDataRow,
  type ResolvedBottom,
} from "@/lib/geometry/bottom";
import { TOP_VIEW_ROOM_ABOVE, TOP_VIEW_ROOM_BELOW, type BottomCutKey } from "@/lib/geometry/bottom-draw";
import { bottomPrintCuts, type BottomPrintCut } from "@/lib/geometry/bottom-print";
import { formatDimBare } from "@/lib/geometry/measure-display";
import type { Mm, UnitsSystem } from "@/lib/geometry/units";

/**
 * The top view's picture, in its own dots: 660 wide, a 62-dot gutter down the left for the rows' names (NOSE, CENTER,
 * TAIL, CHANNELS), the board in what is left. `maxRoom` caps how tall a short, wide board may be drawn; under the board
 * each cut takes one 20-dot row for its Start, Deepest and End. `crop` is how much of the empty room above the upper
 * labels the page leaves off: the screen keeps that room for a second row of labels, and the page has only the one.
 */
export const BOTTOM_TOP_VIEW = { width: 660, gutter: 62, maxRoom: 190, rowsGap: 10, row: 20, foot: 2, crop: 10 } as const;

/** The share of the picture's width the board's length takes (`bottom-draw.ts`'s own 900 of 1000). */
const TOP_VIEW_LENGTH_SHARE = 0.9;

/** A cross-section's picture box, in dots: one cut alone takes the page's width, two or more sit two across. */
export const BOTTOM_SECTION_BOX = {
  lone: { width: 650, height: 120 },
  pair: { width: 322, height: 100 },
} as const;

/** The most layout-mark columns the marks table can carry and still sit beside the depths table. */
export const BOTTOM_TABLES_BESIDE_MAX_COLUMNS = 6;

/**
 * The top view's box for a board with this many cuts: the board's room, where the rows start, and the part of the
 * picture the page shows — from `top` down, `height` tall. `roomCap` is the most room the page gives the board — the
 * layout's `topViewRoom`, which is fewer dots than the board's natural room only on a page that would otherwise run
 * over its sheet (quick 261125-v2j), and never under half of it (quick 261126-czw); left out, the board takes its natural room, capped at `maxRoom`.
 */
export function bottomTopViewBox(
  board: Pick<BottomBoard, "length" | "widePointWidth">,
  cuts: number,
  roomCap: number = BOTTOM_TOP_VIEW.maxRoom,
): { boardBoxWidth: number; room: number; frameHeight: number; rowsTop: number; top: number; height: number } {
  const boardBoxWidth = BOTTOM_TOP_VIEW.width - BOTTOM_TOP_VIEW.gutter;
  const natural = (board.widePointWidth * TOP_VIEW_LENGTH_SHARE * boardBoxWidth) / board.length;
  const room = Math.min(BOTTOM_TOP_VIEW.maxRoom, Math.ceil(natural), roomCap);
  const rowsTop = TOP_VIEW_ROOM_ABOVE + room + BOTTOM_TOP_VIEW.rowsGap;
  return {
    boardBoxWidth,
    room,
    frameHeight: TOP_VIEW_ROOM_ABOVE + room + TOP_VIEW_ROOM_BELOW,
    rowsTop,
    top: BOTTOM_TOP_VIEW.crop,
    height: rowsTop + cuts * BOTTOM_TOP_VIEW.row + BOTTOM_TOP_VIEW.foot - BOTTOM_TOP_VIEW.crop,
  };
}

/** DATA's layout marks: a column per mark in shop order, a row per station. */
export type BottomLayoutMarks = ReturnType<typeof bottomLayoutMarks>;

/**
 * One How to shape note: the cut's head and the GUIDE's own words for it, as paper prints them — the Rail Roll's line
 * only on a nose concave whose Rail Roll is above 0 (`guideHowOnPaper`, quick 261125-v2j).
 */
export interface BottomSheetNote {
  head: string;
  how: string;
}

/** The page's layout for one board. */
export interface BottomSheetLayout {
  /** The cuts on the board, in print order (`bottomPrintCuts`). */
  cuts: BottomPrintCut[];
  /** A How to shape note per cut, in the same order. */
  notes: BottomSheetNote[];
  /** The depths table's rows: the tail, every 6", the nose tip (`bottomDataRows`, DATA's own). */
  dataRows: BottomDataRow[];
  /** The layout marks, row for row with `dataRows` (`bottomLayoutMarks`, DATA's own); no column when no cut has one. */
  marks: BottomLayoutMarks;
  /** Whether the two tables sit side by side (the marks table is narrow enough) or one above the other. */
  tablesBeside: boolean;
  /** Whether the two tables take a sheet of their own, after the page. */
  tablesOnOwnSheet: boolean;
  /**
   * Whether the two tables, on that sheet of their own, still do not fit together: a board too long for them to share
   * it — over 11'6", with a layout-mark column — prints the depths on one sheet and the layout marks on the next, each
   * whole, Tail to Nose tip. False on every board that prints today. Only ever true when `tablesOnOwnSheet` is.
   */
  tablesSplit: boolean;
  /**
   * DATA's notes on how to read the tables, for the tables' own sheet: every note DATA has for the board, in DATA's
   * order (the founder, 2026-11-11: "Make it fit") — fewer only on a hand-set board longer than any stock board, whose
   * sheet takes as many as fit. Empty when the tables stay on the page, which has no room for them.
   */
  tableNotes: string[];
  /**
   * Whether the tables' own sheet draws its rows without their one dot of padding above and below — each row two dots
   * tighter, the type the same size — because every note would not otherwise fit under them. False on every sheet
   * whose notes fit today's rows, and whenever the tables stay on the page.
   */
  tablesTight: boolean;
  /**
   * DATA's notes for each of the two split sheets, in DATA's order: the depths sheet takes the depths note and the
   * full-ink rows note, the marks sheet the layout-marks note and the full-ink rows note (both tables draw those two
   * rows bold). Both empty unless `tablesSplit`.
   */
  splitNotes: { depths: string[]; marks: string[] };
  /**
   * DATA's notes on a sheet of their own, after the tables' sheet, in DATA's order — every one — when they fit under the
   * tables neither at today's rows nor at the tight rows (a 9'7" to 10'0" board with channels; quick 261114-l6s, the
   * founder: "Notes onto the next sheet"). Empty whenever `tableNotes` or `splitNotes` carry them, or there are none.
   */
  notesOnOwnSheet: string[];
  /** How many sheets the bottom prints on: 1, 2 when the tables take their own, 3 when each table takes one or the
   * tables' notes take one after the tables. */
  sheets: 1 | 2 | 3;
  /**
   * The board's room in the top view, in the picture's dots (quick 261125-v2j): its natural room
   * (`bottomTopViewBox(board, cuts.length).room`) on every page whose parts fit, and fewer whole dots — the most whole
   * dots that fit, found by halving (`bottomTopViewRoomThatFits`), never under half the natural room — on a page whose
   * picture, sections and How to shape notes would otherwise leave under the hairline once the tables have taken their
   * own sheet (quick 261126-czw, D-04). Only the board's own room shrinks; the rows' names, the labels and the rows
   * under the board stay full size.
   */
  topViewRoom: number;
}

/**
 * One printed sheet's sizes, in its own dots: what the page holds between the board's name at the top and the page
 * mark at the foot, and how tall each thing on it stands. Every figure is a measured size of a thing on the page.
 */
interface SheetSizes {
  /** The room for the page's parts. */
  room: number;
  /** The top view's box around its picture: the caption row, the frame and the padding. */
  pictureFrame: number;
  /** A row of sections — the caption, the picture and the two lines of words under it: one cut alone, or two across. */
  sectionsLone: number;
  sectionsPair: number;
  /** The How to shape box around its notes, and one line of a note. */
  notesFrame: number;
  noteLine: number;
  /** A table's box around it — side by side, or at the page's full width. */
  tableFrameBeside: number;
  tableFrameWide: number;
  /** A table's heading row on one line and on two, and one row of numbers. */
  tableHeadOne: number;
  tableHeadTwo: number;
  tableRow: number;
  /** One row of numbers with its cells' padding off: the tables' own sheet, when its notes need the room. */
  tableRowTight: number;
}

/**
 * The two sheets the page is counted on. A computer prints the sheet at its own fixed size; a phone prints one a
 * little shorter for its width, in type a little smaller (`order-form.css`). Neither is always the tighter — a page of
 * pictures is tighter on the phone's, a page of words on the computer's — so a page fits only when it fits both. A
 * phone's narrower sheets and the sheet on the screen measured as roomy as these two or within a dot or two of them.
 */
const SHEETS: readonly SheetSizes[] = [
  {
    room: 922,
    pictureFrame: 32,
    sectionsLone: 194.5,
    sectionsPair: 170.9,
    notesFrame: 29,
    noteLine: 15,
    tableFrameBeside: 32,
    tableFrameWide: 30.5,
    tableHeadOne: 19,
    tableHeadTwo: 34,
    tableRow: 18.6,
    tableRowTight: 16.6,
  },
  {
    room: 882,
    pictureFrame: 30.8,
    sectionsLone: 190.8,
    sectionsPair: 167.2,
    notesFrame: 28.1,
    noteLine: 13.8,
    tableFrameBeside: 30.8,
    tableFrameWide: 29.4,
    tableHeadOne: 17.6,
    tableHeadTwo: 31.4,
    tableRow: 17.35,
    tableRowTight: 15.35,
  },
];

/** The things on the page that are the same on both sheets. */
const PAGE = {
  /** The top view's own dots, printed: the sheet's inner width over the picture's 660. */
  pictureScale: 1.069,
  /** The space between two parts of the page, and between two tables or two rows of sections. */
  gap: 4,
  /** The space between two notes, and above the tables' notes. */
  noteGap: 3,
  tableNotesHead: 2,
  /**
   * How many letters of a note are counted to a line. The page's narrowest line takes more than this of every note
   * the GUIDE has, so the count is never short of the lines a note really takes (and is sometimes one over).
   */
  noteLetters: 116,
  /**
   * The room a page must have left over to count as fitting. A hairline: the arithmetic agrees with the measured pages
   * to a fraction of a dot. Where the page's own parts would leave less, the rule itself draws the bottom's picture a
   * few dots smaller (`BottomSheetLayout.topViewRoom`, quick 261125-v2j), down to half its room at most (quick
   * 261126-czw); the browser's own give-way on the picture is the guard for a line another browser sets differently,
   * and past that floor, so no row or note is ever cut off.
   */
  spare: 4,
} as const;

/**
 * The cut's GUIDE card: a section's cut by its name, the channels by their own card. Its note is the paper's
 * (`guideHowOnPaper`): the Rail Roll's line is kept only when the cut's own Rail Roll is above 0 — 0 on the channels
 * and on every cut that takes none (quick 261125-v2j).
 */
function noteFor(cut: BottomPrintCut, resolved: ResolvedBottom, system: UnitsSystem): BottomSheetNote {
  const key = cut.key === "channels" ? "Channels" : resolved[cut.key].name;
  const roll = cut.key === "channels" ? 0 : resolved[cut.key].railRoll;
  const card = BOTTOM_GUIDE_WORDS.find((c) => c.key === key);
  return { head: cut.head, how: card ? guideHowOnPaper(card, system, roll) : "" };
}

/** How many lines this many letters of a note take. */
function linesOf(letters: number): number {
  return Math.max(1, Math.ceil(letters / PAGE.noteLetters));
}

/** A How to shape note's lines on the page: its head run in before its words. */
function noteLines(note: BottomSheetNote): number {
  return linesOf(note.head.length + 2 + note.how.length);
}

/**
 * The height of everything on the page but the tables: the picture, the sections and the notes, and the gaps between.
 * `roomCap` is the board's room in the picture (`bottomTopViewBox`'s); left out, its natural room.
 */
function pageHeightWithoutTables(
  sheet: SheetSizes,
  board: Pick<BottomBoard, "length" | "widePointWidth">,
  notes: readonly BottomSheetNote[],
  roomCap?: number,
): number {
  const cuts = notes.length;
  const picture = bottomTopViewBox(board, cuts, roomCap).height * PAGE.pictureScale + sheet.pictureFrame;
  const rows = Math.ceil(cuts / 2);
  const sections = cuts === 1 ? sheet.sectionsLone : rows * sheet.sectionsPair + (rows - 1) * PAGE.gap;
  const words = sheet.notesFrame + notes.reduce((sum, note) => sum + noteLines(note) * sheet.noteLine, 0) + (cuts - 1) * PAGE.noteGap;
  return picture + PAGE.gap + sections + PAGE.gap + words;
}

/**
 * The two tables' height. Side by side they stand as tall as one, under headings held to two lines so their rows line
 * up; one above the other each takes the page's width, and the marks table's many headings are counted on two lines.
 * `tight` counts the full-width tables' rows with their padding off (the tables' own sheet only).
 */
function tablesHeight(sheet: SheetSizes, rows: number, markColumns: number, beside: boolean, tight = false): number {
  const numbers = rows * (tight && !beside ? sheet.tableRowTight : sheet.tableRow);
  if (beside) return sheet.tableFrameBeside + sheet.tableHeadTwo + numbers;
  const depths = sheet.tableFrameWide + sheet.tableHeadOne + numbers;
  return markColumns === 0 ? depths : depths + PAGE.gap + sheet.tableFrameWide + sheet.tableHeadTwo + numbers;
}

/**
 * One table alone on its own sheet, at the page's full width and today's rows (a board too long for both to share a
 * sheet): the depths under a one-line heading row, the layout marks under their wrapped two.
 */
function oneTableHeight(sheet: SheetSizes, rows: number, table: "depths" | "marks"): number {
  return sheet.tableFrameWide + (table === "depths" ? sheet.tableHeadOne : sheet.tableHeadTwo) + rows * sheet.tableRow;
}

/** The tables' notes' height under the tables, the gap above them included; nothing when there is no note. */
function tableNotesHeight(sheet: SheetSizes, notes: readonly string[]): number {
  if (notes.length === 0) return 0;
  const lines = notes.reduce((sum, note) => sum + linesOf(note.length), 0);
  return PAGE.gap + PAGE.tableNotesHead + lines * sheet.noteLine + (notes.length - 1) * PAGE.noteGap;
}

/** The least room left over on either sheet once this much is on it. */
function spareAfter(height: (sheet: SheetSizes) => number): number {
  return Math.min(...SHEETS.map((sheet) => sheet.room - height(sheet)));
}

/**
 * The layout of the BOTTOM CONTOURS page for one board. `frontPair` is whether the board has a front pair of fins (the
 * tables' third note names `front fins` or `fin`, as DATA does). `cuts` is empty for a flat bottom — the order form
 * prints no such page then, and nothing here is asked.
 */
export function bottomSheetLayout(resolved: ResolvedBottom, board: BottomBoard, system: UnitsSystem, frontPair: boolean): BottomSheetLayout {
  const cuts = bottomPrintCuts(resolved);
  const notes = cuts.map((cut) => noteFor(cut, resolved, system));
  const dataRows = bottomDataRows(resolved, board);
  const marks = bottomLayoutMarks(resolved, board);
  const rows = dataRows.length;
  const markColumns = marks.columns.length;
  const narrow = markColumns > 0 && markColumns <= BOTTOM_TABLES_BESIDE_MAX_COLUMNS;
  const withTables = spareAfter((sheet) => pageHeightWithoutTables(sheet, board, notes) + PAGE.gap + tablesHeight(sheet, rows, markColumns, narrow));
  const tablesOnOwnSheet = cuts.length > 0 && withTables < PAGE.spare;
  // On a sheet of their own the two tables have the page to themselves, so each takes its full width — and DATA's
  // notes on reading them follow, every one (the founder, 2026-11-11: "Make it fit"). Where they would not all fit
  // under today's rows, the rows lose their padding to make the room; the type is never made smaller. Whether the
  // tables take that sheet at all is decided above, at today's rows, so no board prints a sheet more or fewer.
  const tablesBeside = narrow && !tablesOnOwnSheet;
  // Split only where today's last rung — the full-width tables with their rows tight and no note at all — still would
  // not leave the room a sheet needs. Every sheet that fits today (every board up to 11'6", and any board whose bottom
  // has no layout-mark column) stays exactly as it is.
  const tablesSplit =
    tablesOnOwnSheet && markColumns > 0 && spareAfter((sheet) => tablesHeight(sheet, rows, markColumns, false, true)) < PAGE.spare;
  let tableNotes: string[] = [];
  let tablesTight = false;
  let notesOnOwnSheet: string[] = [];
  const splitNotes: { depths: string[]; marks: string[] } = { depths: [], marks: [] };
  if (tablesSplit) {
    // One table a sheet has room to spare, at today's rows; each keeps its own note and the rows note, in DATA's order,
    // for as long as they fit — they all do, but they are counted.
    const rowsNote = referenceRowsNote(board, frontPair, system);
    for (const table of ["depths", "marks"] as const) {
      const wanted = [table === "depths" ? BOTTOM_COPY.depthsNote : layoutMarksNote(resolved.channels, system), rowsNote];
      for (const note of wanted) {
        const fits = spareAfter((sheet) => oneTableHeight(sheet, rows, table) + tableNotesHeight(sheet, [...splitNotes[table], note])) >= PAGE.spare;
        if (!fits) break;
        splitNotes[table].push(note);
      }
    }
  } else if (tablesOnOwnSheet) {
    const wanted = [BOTTOM_COPY.depthsNote, ...(markColumns > 0 ? [layoutMarksNote(resolved.channels, system)] : []), referenceRowsNote(board, frontPair, system)];
    const fits = (list: readonly string[], tight: boolean) =>
      spareAfter((sheet) => tablesHeight(sheet, rows, markColumns, false, tight) + tableNotesHeight(sheet, list)) >= PAGE.spare;
    if (fits(wanted, false)) {
      tableNotes = wanted;
    } else if (fits(wanted, true)) {
      // The 9'0" to 9'6" Longboards with channels (17-23, "Make it fit"): the rows two dots closer hold every note.
      tablesTight = true;
      tableNotes = wanted;
    } else {
      // A 9'7" to 10'0" board with channels: even the tight rows leave 25 to 30 dots too little for the notes, so every
      // note goes whole onto the sheet after the tables (the founder, 2026-11-14: "Notes onto the next sheet") rather
      // than two of them dropping. The tables keep today's rows unless they need the tight ones on their own.
      notesOnOwnSheet = wanted;
      tablesTight = !fits([], false);
    }
  }
  const sheets = tablesSplit || notesOnOwnSheet.length > 0 ? 3 : tablesOnOwnSheet ? 2 : 1;
  // The page's own parts (quick 261125-v2j). Once the tables have left, the picture, the sections and the notes are all
  // that is on the page, and on a board drawn tall with a cut in every section and 8 channels — or with a long note —
  // they can still fill it. The picture is the page's one part made to give way, so the rule gives it: the board's room
  // is the most whole dots that let the page fit, found by halving rather than one dot at a time (quick 261126-czw,
  // D-04), and never under half the picture's own room (`BOTTOM_TOP_VIEW_MIN_ROOM_SHARE`). At that floor the rule stops
  // giving: the picture is drawn at half its room and, if the page's own parts are still too tall, the browser's own
  // give-way on the picture (the guard already in place) squeezes the rest, so nothing runs off the sheet. No board the
  // tests or the two printed-page specs cover comes near it (v2j measured the deepest give at 166 of 190 dots). Where the
  // tables stay on the page it already fits by the tables' own test above. Whether the tables leave was decided at the
  // picture's whole room, so no board prints a sheet more or fewer for this.
  const naturalRoom = bottomTopViewBox(board, cuts.length).room;
  const topViewRoom = tablesOnOwnSheet
    ? bottomTopViewRoomThatFits(
        naturalRoom,
        Math.max(1, Math.ceil(naturalRoom * BOTTOM_TOP_VIEW_MIN_ROOM_SHARE)),
        (room) => spareAfter((sheet) => pageHeightWithoutTables(sheet, board, notes, room)) >= PAGE.spare,
      )
    : naturalRoom;
  return {
    cuts,
    notes,
    dataRows,
    marks,
    tablesBeside,
    tablesOnOwnSheet,
    tablesSplit,
    tableNotes,
    tablesTight,
    splitNotes,
    notesOnOwnSheet,
    sheets,
    topViewRoom,
  };
}

/**
 * The least share of the top view's natural room the page gives the board (quick 261126-czw, D-04): the picture never
 * comes down past half its own room to make the page fit.
 */
export const BOTTOM_TOP_VIEW_MIN_ROOM_SHARE = 0.5;

/**
 * The most whole dots of room, from `floor` up to `natural`, for which `fits` holds (quick 261126-czw, D-04): `natural`
 * when it fits; `floor` when even the floor does not; otherwise a halving search between a fitting low end and a
 * non-fitting high end. The page's height only grows with the room (`pageHeightWithoutTables` adds the room times the
 * picture's scale and nothing else moves), so this is exactly the room a step-down one dot at a time finds, in about
 * log2(natural) + 2 tries of `fits` instead of up to `natural`.
 */
export function bottomTopViewRoomThatFits(natural: number, floor: number, fits: (room: number) => boolean): number {
  if (fits(natural)) return natural;
  if (floor >= natural || !fits(floor)) return Math.min(floor, natural);
  let low = floor;
  let high = natural;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (fits(mid)) low = mid;
    else high = mid;
  }
  return low;
}

/** The room, in dots, a sheet must have left over for its parts to count as fitting (for the tests). */
export const BOTTOM_SHEET_SPARE = PAGE.spare;

/**
 * The room the arithmetic leaves on each sheet the bottom prints on, on the tighter of the two sheets it is counted
 * on: `page` for the BOTTOM CONTOURS page as it is laid out, `tables` for the tables' own sheet (null when they stay on
 * the page, or when each takes a sheet), its rows counted tight when the layout says so, `split` for the depths
 * sheet and the layout-marks sheet of a board whose tables take one each (null otherwise), and `notes` for the notes'
 * own sheet when they take one (null otherwise). The page is counted with the picture at the layout's own room
 * (`topViewRoom`), the room it is drawn at. For the tests: a figure under `BOTTOM_SHEET_SPARE` is a page the rule
 * failed to fit.
 */
export function bottomSheetSpare(
  layout: BottomSheetLayout,
  board: Pick<BottomBoard, "length" | "widePointWidth">,
): { page: number; tables: number | null; split: { depths: number; marks: number } | null; notes: number | null } {
  const rows = layout.dataRows.length;
  const markColumns = layout.marks.columns.length;
  const page = spareAfter(
    (sheet) =>
      pageHeightWithoutTables(sheet, board, layout.notes, layout.topViewRoom) +
      (layout.tablesOnOwnSheet ? 0 : PAGE.gap + tablesHeight(sheet, rows, markColumns, layout.tablesBeside)),
  );
  const tables =
    layout.tablesOnOwnSheet && !layout.tablesSplit
      ? spareAfter((sheet) => tablesHeight(sheet, rows, markColumns, false, layout.tablesTight) + tableNotesHeight(sheet, layout.tableNotes))
      : null;
  const split = layout.tablesSplit
    ? {
        depths: spareAfter((sheet) => oneTableHeight(sheet, rows, "depths") + tableNotesHeight(sheet, layout.splitNotes.depths)),
        marks: spareAfter((sheet) => oneTableHeight(sheet, rows, "marks") + tableNotesHeight(sheet, layout.splitNotes.marks)),
      }
    : null;
  // The notes' own sheet holds the notes alone: their lines, their gaps and the head above them.
  const notes = layout.notesOnOwnSheet.length > 0 ? spareAfter((sheet) => tableNotesHeight(sheet, layout.notesOnOwnSheet)) : null;
  return { page, tables, split, notes };
}

/**
 * A cut's three stations in words, each taped from that cut's nearest tip (D-07) — `Start 58" · Deepest 23 1/2" · End 4"
 * from the tail`, a Nose cut `from the nose`. The top view ticks the same three under the board, but two ticks close
 * together cannot both carry a label, so the page says every one of them here too. In Metric the line carries its unit
 * once, at the end (CLAUDE.md Rule 2): `Start 147.3 · Deepest 59.7 · End 10.2 cm from the tail`.
 */
export function bottomSheetStationsLine(
  key: BottomCutKey,
  stations: { start: Mm; deepest: Mm; end: Mm },
  board: Pick<BottomBoard, "length">,
  system: UnitsSystem,
): string {
  const taped = (station: Mm) => (key === "channels" ? station : stationFromNearestTip(key, station, board));
  const tip = key === "nose" ? "nose" : "tail";
  return (
    `Start ${formatDimBare(taped(stations.start), system)} · Deepest ${formatDimBare(taped(stations.deepest), system)} · ` +
    `End ${formatBottomStation(taped(stations.end), system)} from the ${tip}`
  );
}

/** A gauge reading's value on a printed cross-section, as the shared drawing rule placed it — in the picture's dots. */
export interface SheetGaugeLabelInput {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  /** What the screen would write there: the value, with its words where the rule gives them (`3/8" in the channel`). */
  text: string;
  /** The value alone (`3/8"`). */
  bare: string;
  /** Where the gauge's own tick stands, across the picture. */
  tickX: number;
}

/** A gauge reading's value where the page writes it; `null` when it has no clear place and reads in the words below. */
export type SheetGaugeLabel = { x: number; y: number; anchor: "start" | "middle" | "end"; text: string } | null;

/** How far from its tick a value moved beside it stands, the air kept between two values (dots), and how far a line of
 * figures rises above and falls below its baseline (shares of its size). */
const GAUGE_LABEL = { beside: 5, air: 3, rise: 0.75, descent: 0.25 } as const;

/**
 * Where each gauge value stands on a printed cross-section. The shared drawing rule (`sectionGauges`) places them for
 * the screen's wide box; in the page's narrow paired boxes two of its choices can fail — a second line under the first
 * can fall past the picture's foot, and two values on one line can run into each other. Paper cannot be nudged, so the
 * page settles each value in turn, earlier ones first, taking the first place that stands clear:
 *
 * 1. where the rule put it, as the rule wrote it;
 * 2. the same place, the value alone;
 * 3. the value alone on the first line under the straightedge, just right of its own tick — then just left of it;
 * 4. nowhere: the tick still shows where the gauge sits, and the words under the picture carry the reading.
 *
 * A place stands clear when its letters end above the picture's foot and touch no value already placed — and, for a
 * value the page moved, when it begins and ends inside the picture's width. Widths are the page's own estimate (6.2
 * dots a letter at 11), never a browser measurement, so every printer lays the values out the same way. `lineOne` is
 * the first line's baseline under the straightedge.
 */
export function placeSheetGaugeLabels(
  labels: readonly SheetGaugeLabelInput[],
  box: { width: number; height: number },
  lineOne: number,
  valueDots: number,
): SheetGaugeLabel[] {
  type Place = NonNullable<SheetGaugeLabel>;
  const span = (place: Place) => {
    const width = place.text.length * 6.2 * (valueDots / 11);
    const x1 = place.anchor === "start" ? place.x : place.anchor === "end" ? place.x - width : place.x - width / 2;
    return { x1, x2: x1 + width, top: place.y - valueDots * GAUGE_LABEL.rise, foot: place.y + valueDots * GAUGE_LABEL.descent };
  };
  const placed: Place[] = [];
  const clear = (place: Place, moved: boolean) => {
    const a = span(place);
    if (a.foot > box.height) return false;
    if (moved && (a.x1 < 0 || a.x2 > box.width)) return false;
    return placed.every((other) => {
      const b = span(other);
      return a.x1 >= b.x2 + GAUGE_LABEL.air || a.x2 <= b.x1 - GAUGE_LABEL.air || a.top >= b.foot || a.foot <= b.top;
    });
  };
  return labels.map((label) => {
    const given: Place = { x: label.x, y: label.y, anchor: label.anchor, text: label.text };
    const candidates: { place: Place; moved: boolean }[] = [
      { place: given, moved: false },
      { place: { ...given, text: label.bare }, moved: false },
      { place: { x: label.tickX + GAUGE_LABEL.beside, y: lineOne, anchor: "start", text: label.bare }, moved: true },
      { place: { x: label.tickX - GAUGE_LABEL.beside, y: lineOne, anchor: "end", text: label.bare }, moved: true },
    ];
    const place = candidates.find((candidate) => clear(candidate.place, candidate.moved))?.place ?? null;
    if (place) placed.push(place);
    return place;
  });
}
