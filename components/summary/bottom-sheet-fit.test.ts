import { describe, expect, it } from "vitest";
import { BOTTOM_COPY, layoutMarksNote, referenceRowsNote } from "@/components/bottom/bottom-copy";
import { BOTTOM_GUIDE_WORDS, guideHow } from "@/components/bottom/bottom-guide-words";
import { phase16Boards } from "@/lib/geometry/__fixtures__/phase16-boards";
import { BOARD_LENGTH_RANGE_IN } from "@/lib/geometry/board";
import { widePointWidthRangeIn } from "@/lib/geometry/board-size";
import { formatBottomStation } from "@/lib/geometry/blank-reasons";
import {
  BOTTOM_CUT_NAMES,
  BOTTOM_SECTIONS,
  bottomDataRows,
  bottomLayoutMarks,
  DEFAULT_BOTTOM,
  resolveBottom,
  startingChannels,
  startingCut,
  stationFromNearestTip,
  type BoardBottom,
  type BottomBoard,
  type BottomCutName,
  type BottomSectionKey,
  type ChannelCount,
} from "@/lib/geometry/bottom";
import { bottomSection, sectionGauges, TOP_VIEW_ROOM_ABOVE, TOP_VIEW_ROOM_BELOW, type GaugeKind } from "@/lib/geometry/bottom-draw";
import { bottomPrintCuts } from "@/lib/geometry/bottom-print";
import type { DesignSummaryFields } from "@/lib/geometry/design";
import { designBottomBoard, designFinPlacement, designSideProfile, LIVE_DESIGN_RULES } from "@/lib/geometry/design";
import { formatDimBare, formatMark } from "@/lib/geometry/measure-display";
import { buildOutline } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { inchesToMm, mmToInches, UNITS_SYSTEMS, type UnitsSystem } from "@/lib/geometry/units";
import {
  BOTTOM_SECTION_BOX,
  BOTTOM_SHEET_SPARE,
  BOTTOM_TABLES_BESIDE_MAX_COLUMNS,
  BOTTOM_TOP_VIEW,
  bottomSheetLayout,
  bottomSheetSpare,
  bottomSheetStationsLine,
  bottomTopViewBox,
  placeSheetGaugeLabels,
  type BottomSheetLayout,
} from "./bottom-sheet-fit";

/** The words the screen puts after a gauge's value, by kind (`BOTTOM_COPY`'s own, with the value taken off). */
const GAUGE_WORDS: Record<GaugeKind, string> = {
  stringer: BOTTOM_COPY.gaugeAtStringer("").trim(),
  railLift: BOTTOM_COPY.gaugeRailLift("").trim(),
  stringerLeft: BOTTOM_COPY.gaugeStringerLeft("").trim(),
  channel: BOTTOM_COPY.gaugeInChannel("").trim(),
  trough: BOTTOM_COPY.gaugeInTrough("").trim(),
};

/*
 * The boards are the four presets as their cards open them (the Phase 16 set), each built through the app, with cuts
 * on the starting numbers the BOTTOM screen gives them. Nothing expected here is typed: every list, note and station
 * is put together from the app's own functions (CLAUDE.md Rule 1). The page's real heights are measured in a browser
 * by `e2e/summary-planing.spec.ts`; what is pinned here is the rule's own promises.
 */

type Names = Partial<Record<BottomSectionKey, BottomCutName>>;

interface Built {
  id: string;
  board: BottomBoard;
  frontPair: boolean;
}

function build(id: string, fields: DesignSummaryFields): Built {
  const fins = designFinPlacement(fields);
  return {
    id,
    board: designBottomBoard(fields.outline, buildOutline(fields.outline), designSideProfile(fields, LIVE_DESIGN_RULES), fins),
    frontPair: fins.marks.some((mark) => mark.role === "front"),
  };
}

function presetFields(id: string): DesignSummaryFields {
  const preset = BOARD_PRESETS.find((p) => p.id === id)!;
  const label = `${preset.id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`;
  return phase16Boards().find((b) => b.label === label)!.fields;
}

const BOARDS: Built[] = BOARD_PRESETS.map((preset) => build(preset.id, presetFields(preset.id)));
const byId = (id: string) => BOARDS.find((b) => b.id === id)!;

/** A bottom with the named sections on their starting numbers, and channels picked as the store picks them. */
function bottomOf(board: BottomBoard, names: Names, count: ChannelCount | 0 = 0): BoardBottom {
  const bottom = structuredClone(DEFAULT_BOTTOM);
  for (const section of BOTTOM_SECTIONS) {
    const name = names[section];
    if (name) bottom[section] = startingCut(section, name, board);
  }
  if (count > 0) bottom.channels = startingChannels(count as ChannelCount, board, bottom.channels);
  return bottom;
}

const SETS: Record<string, { names: Names; count: ChannelCount | 0 }> = {
  single: { names: { center: "Deep Single Concave" }, count: 0 },
  single6: { names: { center: "Deep Single Concave" }, count: 6 },
  opening: { names: { nose: "Teardrop Nose Concave", center: "Continuous Belly / Rolled Mid", tail: "Rolled Vee" }, count: 0 },
  every8: { names: { nose: "Teardrop Nose Concave", center: "Early Double Concave", tail: "Spiral Vee" }, count: 8 },
  two: { names: { center: "Deep Single Concave", tail: "Spiral Vee" }, count: 0 },
  three: { names: { nose: "Teardrop Nose Concave", center: "Early Double Concave", tail: "Spiral Vee" }, count: 0 },
  ch4: { names: {}, count: 4 },
  ch8: { names: {}, count: 8 },
  tail6: { names: { tail: "Spiral Vee" }, count: 6 },
};

const CASES = BOARDS.flatMap((built) =>
  Object.entries(SETS).map(([set, { names, count }]) => ({
    label: `${built.id} ${set}`,
    built,
    resolved: resolveBottom(bottomOf(built.board, names, count), built.board),
  })),
);

const layoutOf = (c: (typeof CASES)[number], system: UnitsSystem) => bottomSheetLayout(c.resolved, c.built.board, system, c.built.frontPair);

describe("bottomTopViewBox: the bottom from above, in the page's own dots", () => {
  it("the board takes the picture's width less the gutter for the rows' names", () => {
    for (const { board } of BOARDS) {
      expect(bottomTopViewBox(board, 1).boardBoxWidth).toBe(BOTTOM_TOP_VIEW.width - BOTTOM_TOP_VIEW.gutter);
    }
  });

  it("every cut adds one row under the board, and nothing else moves", () => {
    for (const { board } of BOARDS) {
      const one = bottomTopViewBox(board, 1);
      for (const cuts of [2, 3, 4]) {
        const more = bottomTopViewBox(board, cuts);
        expect(more.height - one.height).toBe((cuts - 1) * BOTTOM_TOP_VIEW.row);
        expect(more.room).toBe(one.room);
        expect(more.rowsTop).toBe(one.rowsTop);
        expect(more.frameHeight).toBe(one.frameHeight);
      }
    }
  });

  it("the page leaves off the empty room above the labels, and only that", () => {
    for (const { board } of BOARDS) {
      const box = bottomTopViewBox(board, 2);
      expect(box.top).toBe(BOTTOM_TOP_VIEW.crop);
      expect(box.top).toBeLessThan(TOP_VIEW_ROOM_ABOVE);
      expect(box.top + box.height).toBe(box.rowsTop + 2 * BOTTOM_TOP_VIEW.row + BOTTOM_TOP_VIEW.foot);
      expect(box.rowsTop).toBe(TOP_VIEW_ROOM_ABOVE + box.room + BOTTOM_TOP_VIEW.rowsGap);
      expect(box.frameHeight).toBe(TOP_VIEW_ROOM_ABOVE + box.room + TOP_VIEW_ROOM_BELOW);
    }
  });

  it("a wider board for its length is drawn taller, up to a cap — and never past it", () => {
    const { board } = byId("shortboard");
    const wider = { length: board.length, widePointWidth: inchesToMm(30) };
    expect(bottomTopViewBox(wider, 1).room).toBeGreaterThan(bottomTopViewBox(board, 1).room);
    const absurd = { length: board.length, widePointWidth: board.length };
    expect(bottomTopViewBox(absurd, 1).room).toBe(BOTTOM_TOP_VIEW.maxRoom);
  });

  it("two sections across are each under half the lone section's width, so a pair fits where one does", () => {
    expect(BOTTOM_SECTION_BOX.pair.width * 2).toBeLessThan(BOTTOM_SECTION_BOX.lone.width);
  });
});

describe("bottomSheetLayout: what the page carries", () => {
  it.each(CASES)("$label — the cuts, notes and both tables are the app's own, in both systems", (c) => {
    for (const system of UNITS_SYSTEMS) {
      const layout = layoutOf(c, system);
      const cuts = bottomPrintCuts(c.resolved);
      expect(layout.cuts).toEqual(cuts);
      expect(layout.dataRows).toEqual(bottomDataRows(c.resolved, c.built.board));
      expect(layout.marks).toEqual(bottomLayoutMarks(c.resolved, c.built.board));
      expect(layout.notes).toHaveLength(cuts.length);
      cuts.forEach((cut, index) => {
        const key = cut.key === "channels" ? "Channels" : c.resolved[cut.key].name;
        const card = BOTTOM_GUIDE_WORDS.find((w) => w.key === key)!;
        expect(card, `no GUIDE card for ${key}`).toBeDefined();
        expect(layout.notes[index]).toEqual({ head: cut.head, how: guideHow(card, system) });
        expect(layout.notes[index].how.length).toBeGreaterThan(0);
      });
    }
  });

  it.each(CASES)("$label — the sheet count follows the tables, and the tables are never dropped", (c) => {
    for (const system of UNITS_SYSTEMS) {
      const layout = layoutOf(c, system);
      expect(layout.sheets).toBe(layout.tablesSplit ? 3 : layout.tablesOnOwnSheet ? 2 : 1);
      // The depths table has a row for the tail, every 6" and the nose tip whichever sheet it prints on.
      expect(layout.dataRows.length).toBeGreaterThan(2);
      expect(layout.marks.rows).toHaveLength(layout.dataRows.length);
      if (layout.tablesOnOwnSheet) expect(layout.tablesBeside).toBe(false);
      if (layout.tablesBeside) {
        expect(layout.marks.columns.length).toBeGreaterThan(0);
        expect(layout.marks.columns.length).toBeLessThanOrEqual(BOTTOM_TABLES_BESIDE_MAX_COLUMNS);
      }
    }
  });

  it.each(CASES)("$label — every sheet the bottom prints on has room for what the rule put on it", (c) => {
    for (const system of UNITS_SYSTEMS) {
      const layout = layoutOf(c, system);
      const spare = bottomSheetSpare(layout, c.built.board);
      expect(spare.page, "the page's own parts do not fit their sheet").toBeGreaterThanOrEqual(0);
      if (layout.tablesSplit) {
        expect(spare.tables).toBeNull();
        expect(spare.split!.depths, "the depths do not fit their own sheet").toBeGreaterThanOrEqual(0);
        expect(spare.split!.marks, "the layout marks do not fit their own sheet").toBeGreaterThanOrEqual(0);
      } else if (layout.tablesOnOwnSheet) {
        expect(spare.tables, "the tables do not fit their own sheet").not.toBeNull();
        expect(spare.tables!).toBeGreaterThanOrEqual(0);
        expect(spare.split).toBeNull();
      } else {
        expect(spare.tables).toBeNull();
        expect(spare.split).toBeNull();
      }
    }
  });

  it.each(CASES)("$label — DATA's notes on reading the tables print only on the tables' own sheet, in DATA's order", (c) => {
    for (const system of UNITS_SYSTEMS) {
      const layout = layoutOf(c, system);
      if (!layout.tablesOnOwnSheet) {
        expect(layout.tableNotes).toEqual([]);
        continue;
      }
      const wanted = [
        BOTTOM_COPY.depthsNote,
        ...(layout.marks.columns.length > 0 ? [layoutMarksNote(c.resolved.channels, system)] : []),
        referenceRowsNote(c.built.board, c.built.frontPair, system),
      ];
      expect(layout.tableNotes).toEqual(wanted.slice(0, layout.tableNotes.length));
    }
  });

  it.each(CASES)("$label — switching Imperial and Metric never changes how many sheets print", (c) => {
    const imperial = layoutOf(c, "imperial");
    const metric = layoutOf(c, "metric");
    expect(metric.sheets).toBe(imperial.sheets);
    expect(metric.tablesBeside).toBe(imperial.tablesBeside);
  });

  it("a Shortboard with a Deep Single Concave and 6 channels prints all four parts on one sheet, tables side by side", () => {
    const c = CASES.find((x) => x.label === "shortboard single6")!;
    for (const system of UNITS_SYSTEMS) {
      const layout = layoutOf(c, system);
      expect(layout.cuts.map((cut) => cut.key)).toEqual(["center", "channels"]);
      expect(layout.sheets).toBe(1);
      expect(layout.tablesBeside).toBe(true);
    }
  });

  it("a Longboard with a cut in every section sends its two tables to a sheet of their own, every row kept", () => {
    for (const set of ["opening", "three", "every8"]) {
      const c = CASES.find((x) => x.label === `longboard ${set}`)!;
      for (const system of UNITS_SYSTEMS) {
        const layout = layoutOf(c, system);
        expect(layout.sheets).toBe(2);
        expect(layout.tablesOnOwnSheet).toBe(true);
        expect(layout.dataRows).toEqual(bottomDataRows(c.resolved, c.built.board));
      }
    }
  });

  it("a flat bottom has no cut to lay out — the order form prints no such page", () => {
    const { board, frontPair } = byId("shortboard");
    const layout = bottomSheetLayout(resolveBottom(DEFAULT_BOTTOM, board), board, "imperial", frontPair);
    expect(layout.cuts).toEqual([]);
    expect(layout.notes).toEqual([]);
    expect(layout.tablesOnOwnSheet).toBe(false);
    expect(layout.tableNotes).toEqual([]);
    expect(layout.sheets).toBe(1);
  });

  // Quick 261113-si7 raised the longest board to 12'0" (144"), where the tables' 25 rows no longer fit one sheet; quick
  // 261113-vya answers that with a sheet each (the tests after this one). This check stays at the longest board the app
  // allowed BEFORE si7 (10'0"): its two tables still share their own sheet, exactly as they print today.
  const LONGEST_BEFORE_SI7_IN = 120;
  it("the longest board before quick si7 (10'0\"), with every cut and 8 channels, keeps every row of both tables on their sheet", () => {
    const fields = presetFields("longboard");
    const longest = build("longest", { ...fields, outline: { ...fields.outline, length: inchesToMm(LONGEST_BEFORE_SI7_IN) } });
    const { names, count } = SETS.every8;
    const resolved = resolveBottom(bottomOf(longest.board, names, count), longest.board);
    for (const system of UNITS_SYSTEMS) {
      const layout = bottomSheetLayout(resolved, longest.board, system, longest.frontPair);
      expect(layout.dataRows.length).toBeGreaterThan(layoutOf(CASES.find((x) => x.label === "longboard every8")!, system).dataRows.length);
      expect(layout.tablesOnOwnSheet).toBe(true);
      const spare = bottomSheetSpare(layout, longest.board);
      expect(spare.page).toBeGreaterThanOrEqual(0);
      expect(spare.tables!).toBeGreaterThanOrEqual(0);
    }
  });

  /** A Longboard of this length, built through the app, with a bottom of the named setup — 31" wide, as a 12'0" board is. */
  function longboardAt(lengthIn: number, setup: { names: Names; count: ChannelCount | 0 }) {
    const fields = presetFields("longboard");
    const built = build("long", { ...fields, outline: { ...fields.outline, length: inchesToMm(lengthIn) } });
    return { built, resolved: resolveBottom(bottomOf(built.board, setup.names, setup.count), built.board) };
  }

  it("the longest board the app allows (12'0\"), with every cut and 8 channels, prints its two tables a sheet each, every row kept", () => {
    const { built, resolved } = longboardAt(BOARD_LENGTH_RANGE_IN.max, SETS.every8);
    for (const system of UNITS_SYSTEMS) {
      const layout = bottomSheetLayout(resolved, built.board, system, built.frontPair);
      expect(layout.dataRows).toEqual(bottomDataRows(resolved, built.board));
      expect(layout.dataRows).toHaveLength(25);
      expect(layout.marks.rows).toHaveLength(25);
      expect(layout.tablesOnOwnSheet).toBe(true);
      expect(layout.tablesSplit).toBe(true);
      expect(layout.sheets).toBe(3);
      expect(layout.tablesBeside).toBe(false);
      expect(layout.tablesTight).toBe(false);
      expect(layout.tableNotes).toEqual([]);
      expect(layout.splitNotes.depths).toEqual([BOTTOM_COPY.depthsNote, referenceRowsNote(built.board, built.frontPair, system)]);
      expect(layout.splitNotes.marks).toEqual([layoutMarksNote(resolved.channels, system), referenceRowsNote(built.board, built.frontPair, system)]);
      const spare = bottomSheetSpare(layout, built.board);
      expect(spare.page).toBeGreaterThanOrEqual(0);
      expect(spare.tables).toBeNull();
      expect(spare.split).not.toBeNull();
      expect(spare.split!.depths).toBeGreaterThanOrEqual(BOTTOM_SHEET_SPARE);
      expect(spare.split!.marks).toBeGreaterThanOrEqual(BOTTOM_SHEET_SPARE);
    }
  });

  it("a 12'0\" board whose bottom has no layout-mark column keeps its one tables sheet, both its notes, its rows as they are", () => {
    const { built, resolved } = longboardAt(BOARD_LENGTH_RANGE_IN.max, { names: { tail: "Panel Vee" }, count: 0 });
    for (const system of UNITS_SYSTEMS) {
      const layout = bottomSheetLayout(resolved, built.board, system, built.frontPair);
      expect(layout.marks.columns).toHaveLength(0);
      expect(layout.dataRows).toHaveLength(25);
      expect(layout.tablesSplit).toBe(false);
      expect(layout.splitNotes).toEqual({ depths: [], marks: [] });
      if (layout.tablesOnOwnSheet) {
        expect(layout.sheets).toBe(2);
        expect(layout.tablesTight).toBe(false);
        expect(layout.tableNotes).toEqual([BOTTOM_COPY.depthsNote, referenceRowsNote(built.board, built.frontPair, system)]);
      } else {
        expect(layout.sheets).toBe(1);
      }
    }
  });

  it("the split begins where today's last rung fails: 11'6\" keeps one tables sheet, tight and bare; 11'6 1/16\" splits", () => {
    for (const system of UNITS_SYSTEMS) {
      const before = longboardAt(138, SETS.every8);
      const keep = bottomSheetLayout(before.resolved, before.built.board, system, before.built.frontPair);
      expect(keep.dataRows).toHaveLength(24);
      expect(keep.tablesSplit).toBe(false);
      expect(keep.sheets).toBe(2);
      expect(keep.tablesTight).toBe(true);
      expect(keep.tableNotes).toEqual([]);
      expect(keep.splitNotes).toEqual({ depths: [], marks: [] });
      expect(bottomSheetSpare(keep, before.built.board).split).toBeNull();
      // 11'6 1/16" is where the 25th row begins (`bottomDataStations`: every 6" below the length less a millimetre).
      const after = longboardAt(138 + 1 / 16, SETS.every8);
      const over = bottomSheetLayout(after.resolved, after.built.board, system, after.built.frontPair);
      expect(over.dataRows).toHaveLength(25);
      expect(over.tablesSplit).toBe(true);
      expect(over.sheets).toBe(3);
    }
  });
});

/*
 * The founder's answer of 2026-11-11, "Make it fit": DATA's note took his longer sentence, and on the 9'+ Longboard the
 * tables' own sheet then had no room for its other notes (with channels it already printed only the first). Now every
 * note DATA has for the board prints there. Where the notes would not otherwise fit, that sheet's rows lose their one
 * dot of padding above and below — the type stays the same size — and every sheet whose notes fit keeps its rows. The
 * setups are every nose × tail name with a centre Early Double Concave at 0 and 8 channels, and every centre name at 0,
 * 4, 6 and 8 channels, built as `bottomOf` builds them, on every board of the Phase 16 set, in both systems.
 */
describe("the 9'+ Longboard's tables sheet prints every note (the founder, 2026-11-11: \"Make it fit\")", () => {
  const SETUPS: { names: Names; count: ChannelCount | 0 }[] = [];
  for (const nose of BOTTOM_CUT_NAMES.nose)
    for (const tail of BOTTOM_CUT_NAMES.tail) for (const count of [0, 8] as const) SETUPS.push({ names: { nose, center: "Early Double Concave", tail }, count });
  for (const center of BOTTOM_CUT_NAMES.center) for (const count of [0, 4, 6, 8] as const) SETUPS.push({ names: { center }, count });

  /** The tables' sheet's spare room counted at today's rows, whatever the layout chose. */
  const regularSpare = (layout: BottomSheetLayout, board: BottomBoard) => bottomSheetSpare({ ...layout, tablesTight: false }, board).tables;

  function layoutsOf(label: string) {
    const built16 = build(label, phase16Boards().find((b) => b.label === label)!.fields);
    return SETUPS.flatMap(({ names, count }) => {
      const resolved = resolveBottom(bottomOf(built16.board, names, count), built16.board);
      return UNITS_SYSTEMS.map((system) => {
        const layout = bottomSheetLayout(resolved, built16.board, system, built16.frontPair);
        const wanted = [
          BOTTOM_COPY.depthsNote,
          ...(layout.marks.columns.length > 0 ? [layoutMarksNote(resolved.channels, system)] : []),
          referenceRowsNote(built16.board, built16.frontPair, system),
        ];
        return { layout, wanted, board: built16.board, what: `${Object.values(names).join(", ")} · ${count} channels · ${system}` };
      });
    });
  }

  const longboards = phase16Boards().filter((b) => b.label.startsWith("longboard|")).map((b) => b.label);
  const others = phase16Boards().filter((b) => !b.label.startsWith("longboard|")).map((b) => b.label);

  it("the set is the 96 setups, on ten Longboards and thirty other boards", () => {
    expect(SETUPS).toHaveLength(96);
    expect(longboards).toHaveLength(10);
    expect(others).toHaveLength(30);
  });

  it.each(longboards)("%s: every note DATA has prints on the tables' own sheet, its rows tight only where the notes need them", (label) => {
    let tight = 0;
    let ownSheet = 0;
    for (const { layout, wanted, board, what } of layoutsOf(label)) {
      expect(layout.sheets, what).toBe(layout.tablesOnOwnSheet ? 2 : 1);
      if (!layout.tablesOnOwnSheet) {
        expect(layout.tablesTight, `${what}: tables on the page never tighten`).toBe(false);
        expect(layout.tableNotes).toEqual([]);
        continue;
      }
      ownSheet++;
      expect(layout.tableNotes, `${what}: every note`).toEqual(wanted);
      expect(bottomSheetSpare(layout, board).tables!, `${what}: the tables' sheet has room`).toBeGreaterThanOrEqual(0);
      if (layout.tablesTight) {
        tight++;
        // Tight only where today's rows leave no room for every note.
        expect(regularSpare(layout, board)!, `${what}: tight although the notes fit today's rows`).toBeLessThan(bottomSheetSpare(layout, board).tables!);
        expect(regularSpare(layout, board)!, `${what}: tight although the notes fit today's rows`).toBeLessThan(BOTTOM_SHEET_SPARE);
      } else {
        expect(layout.tablesTight, what).toBe(false);
      }
    }
    expect(ownSheet, "the Longboard's tables take their own sheet on some setups (non-vacuity)").toBeGreaterThan(0);
    expect(tight, "and some of them need the tighter rows (non-vacuity)").toBeGreaterThan(0);
  }, 60_000);

  it.each(others)("%s: every note prints with the rows as they are — nothing tightens", (label) => {
    for (const { layout, wanted, what } of layoutsOf(label)) {
      expect(layout.tablesTight, what).toBe(false);
      expect(layout.sheets, what).toBe(layout.tablesOnOwnSheet ? 2 : 1);
      expect(layout.tableNotes, what).toEqual(layout.tablesOnOwnSheet ? wanted : []);
    }
  }, 60_000);
});

/*
 * Quick 261113-vya: the rule is where today's last rung fails, so no board that fits today can ever move. Swept over the
 * four shapes at 4'0" to 12'0", each at the narrowest, the stock and the widest width its length allows, with eleven
 * bottoms (the nine of SETS, a Panel Vee tail alone and a Rolled Belly nose with that tail — neither has a layout-mark
 * column), in both systems. Lengths are named with `inchesToMm`; the 25th row begins at 11'6 1/16" because
 * `bottomDataStations` takes every station below the length less a millimetre — nothing here is a typed threshold of the rule.
 */
describe("the split's reach: no board up to 11'6\" ever splits, and every marked bottom over it does", () => {
  const BOTTOMS: Record<string, { names: Names; count: ChannelCount | 0 }> = {
    ...SETS,
    panel: { names: { tail: "Panel Vee" }, count: 0 },
    belly: { names: { nose: "Rolled Belly Entry", tail: "Panel Vee" }, count: 0 },
  };
  /** 4'0" to 11'0" every 6", then 11'5" and 11'6"; and the three lengths over 11'6" the sweep names. */
  const FITTING_IN = [...Array.from({ length: 15 }, (_, k) => 48 + 6 * k), 137, 138];
  const OVER_IN = [138 + 1 / 16, 141, 144];

  interface Swept {
    what: string;
    layout: BottomSheetLayout;
    board: BottomBoard;
    marked: boolean;
  }
  function sweep(lengths: number[]): Swept[] {
    const out: Swept[] = [];
    for (const preset of BOARD_PRESETS) {
      const fields = presetFields(preset.id);
      for (const lengthIn of lengths) {
        const range = widePointWidthRangeIn(inchesToMm(lengthIn));
        const stock = Math.min(range.max, Math.max(range.min, +mmToInches(fields.outline.widePointWidth).toFixed(4)));
        for (const widthIn of [...new Set([range.min, stock, range.max])]) {
          const built = build("swept", { ...fields, outline: { ...fields.outline, length: inchesToMm(lengthIn), widePointWidth: inchesToMm(widthIn) } });
          for (const [name, { names, count }] of Object.entries(BOTTOMS)) {
            const resolved = resolveBottom(bottomOf(built.board, names, count), built.board);
            for (const system of UNITS_SYSTEMS) {
              const layout = bottomSheetLayout(resolved, built.board, system, built.frontPair);
              out.push({
                what: `${preset.id} ${lengthIn}" x ${widthIn}" ${name} ${system}`,
                layout,
                board: built.board,
                marked: layout.marks.columns.length > 0,
              });
            }
          }
        }
      }
    }
    return out;
  }
  // Computed once for the file's tests below.
  const fitting = sweep(FITTING_IN);
  const over = sweep(OVER_IN);

  it("the sweep is the 11 bottoms on four shapes, three widths each, in both systems", () => {
    expect(fitting).toHaveLength(BOARD_PRESETS.length * FITTING_IN.length * 3 * 11 * 2);
    expect(over).toHaveLength(BOARD_PRESETS.length * OVER_IN.length * 3 * 11 * 2);
  });

  it("no board up to 11'6\" splits, and none prints more than its page and one tables sheet", () => {
    for (const { what, layout } of fitting) {
      expect(layout.tablesSplit, what).toBe(false);
      expect(layout.splitNotes, what).toEqual({ depths: [], marks: [] });
      expect(layout.sheets, what).toBeLessThanOrEqual(2);
    }
    // Non-vacuity: some of these boards do take a sheet for their tables, and some of them at 11'6" are tight.
    expect(fitting.some(({ layout }) => layout.tablesOnOwnSheet)).toBe(true);
    expect(fitting.some(({ layout, board }) => layout.tablesTight && layout.dataRows.length === 24 && board.length > inchesToMm(137))).toBe(true);
  });

  it("over 11'6\", every bottom with a layout-mark column splits, each sheet roomy and every note kept; one without never does", () => {
    let splits = 0;
    let unmarked = 0;
    for (const { what, layout, board, marked } of over) {
      expect(layout.dataRows, what).toHaveLength(25);
      if (layout.cuts.length === 0) continue;
      if (marked) {
        splits++;
        expect(layout.tablesSplit, what).toBe(true);
        expect(layout.sheets, what).toBe(3);
        const spare = bottomSheetSpare(layout, board);
        expect(spare.split!.depths, what).toBeGreaterThanOrEqual(BOTTOM_SHEET_SPARE);
        expect(spare.split!.marks, what).toBeGreaterThanOrEqual(BOTTOM_SHEET_SPARE);
        expect(layout.splitNotes.depths, what).toHaveLength(2);
        expect(layout.splitNotes.marks, what).toHaveLength(2);
        expect(layout.tableNotes, what).toEqual([]);
        expect(layout.tablesTight, what).toBe(false);
      } else {
        unmarked++;
        expect(layout.tablesSplit, what).toBe(false);
        expect(layout.sheets, what).toBeLessThanOrEqual(2);
      }
    }
    expect(splits, "marked bottoms were swept (non-vacuity)").toBeGreaterThan(0);
    expect(unmarked, "bottoms with no layout marks were swept (non-vacuity)").toBeGreaterThan(0);
  });

  it("the rule by its own definition: split exactly when the tables' sheet, tight and with no note, would leave under the spare", () => {
    let own = 0;
    let splits = 0;
    for (const { what, layout, board } of [...fitting, ...over]) {
      if (!layout.tablesOnOwnSheet) {
        // The tables stay on the page: nothing to split.
        expect(layout.tablesSplit, what).toBe(false);
        continue;
      }
      own++;
      const lastRung = bottomSheetSpare({ ...layout, tablesSplit: false, tablesTight: true, tableNotes: [] }, board).tables!;
      expect(layout.tablesSplit, `${what}: today's last rung leaves ${lastRung.toFixed(1)}`).toBe(lastRung < BOTTOM_SHEET_SPARE);
      if (layout.tablesSplit) splits++;
    }
    expect(own, "layouts whose tables take their own sheet (non-vacuity)").toBeGreaterThan(0);
    expect(splits, "and some of them split (non-vacuity)").toBeGreaterThan(0);
  });
});

describe("bottomSheetStationsLine: a cut's three stations in words", () => {
  it.each(CASES)("$label — each station taped from the cut's nearest tip, through the app's own unit rule", (c) => {
    for (const system of UNITS_SYSTEMS) {
      for (const cut of bottomPrintCuts(c.resolved)) {
        const spec = cut.key === "channels" ? c.resolved.channels : c.resolved[cut.key];
        const taped = (station: typeof spec.start) => (cut.key === "channels" ? station : stationFromNearestTip(cut.key, station, c.built.board));
        const line = bottomSheetStationsLine(cut.key, spec, c.built.board, system);
        expect(line).toBe(
          `Start ${formatDimBare(taped(spec.start), system)} · Deepest ${formatDimBare(taped(spec.deepest), system)} · ` +
            `End ${formatBottomStation(taped(spec.end), system)} from the ${cut.key === "nose" ? "nose" : "tail"}`,
        );
        if (system === "metric") {
          // One line of running text carries its unit once (CLAUDE.md Rule 2), and never an inch mark.
          expect(line.match(/\bcm\b/g)).toHaveLength(1);
          expect(line).not.toContain('"');
        } else {
          expect(line).not.toMatch(/\b(cm|mm)\b/);
        }
      }
    }
  });
});

describe("placeSheetGaugeLabels: each gauge value where it stands clear on a printed section", () => {
  const BOX = { width: 322, height: 100 };
  const LINE_ONE = 89; // a straightedge 26 dots above the foot, and the first line 15 under it
  const SIZE = 11.5;
  const width = (text: string) => text.length * 6.2 * (SIZE / 11);
  /** A placed value's box by the page's estimate — worked out here on its own, not borrowed from the rule. */
  const boxOf = (p: { x: number; y: number; anchor: "start" | "middle" | "end"; text: string }) => {
    const x1 = p.anchor === "start" ? p.x : p.anchor === "end" ? p.x - width(p.text) : p.x - width(p.text) / 2;
    return { x1, x2: x1 + width(p.text), top: p.y - SIZE * 0.75, foot: p.y + SIZE * 0.25 };
  };
  const touch = (a: ReturnType<typeof boxOf>, b: ReturnType<typeof boxOf>) => a.x1 < b.x2 && b.x1 < a.x2 && a.top < b.foot && b.top < a.foot;

  it("a value with room stays where the drawing rule put it, words and all", () => {
    const given = { x: 161, y: LINE_ONE, anchor: "middle" as const, text: '1/4" at the stringer', bare: '1/4"', tickX: 161 };
    expect(placeSheetGaugeLabels([given], BOX, LINE_ONE, SIZE)).toEqual([{ x: 161, y: LINE_ONE, anchor: "middle", text: given.text }]);
  });

  it("a second line that would fall past the picture's foot moves up beside its own tick, the number alone", () => {
    const stringer = { x: 161, y: LINE_ONE, anchor: "middle" as const, text: '1/16"', bare: '1/16"', tickX: 161 };
    const channel = { x: 188, y: LINE_ONE + 13, anchor: "middle" as const, text: '3/8" in the channel', bare: '3/8"', tickX: 188 };
    const [first, second] = placeSheetGaugeLabels([stringer, channel], BOX, LINE_ONE, SIZE);
    expect(first).toEqual({ x: 161, y: LINE_ONE, anchor: "middle", text: '1/16"' });
    expect(second).toEqual({ x: 193, y: LINE_ONE, anchor: "start", text: '3/8"' });
    expect(touch(boxOf(first!), boxOf(second!))).toBe(false);
  });

  it("a value that would run into one already placed stands on the other side of its tick", () => {
    const rail = { x: 300, y: LINE_ONE, anchor: "end" as const, text: '1/8"', bare: '1/8"', tickX: 300 };
    const channel = { x: 272, y: LINE_ONE, anchor: "middle" as const, text: '5/16" in the channel', bare: '5/16"', tickX: 272 };
    const [first, second] = placeSheetGaugeLabels([rail, channel], BOX, LINE_ONE, SIZE);
    expect(first).toEqual({ x: 300, y: LINE_ONE, anchor: "end", text: '1/8"' });
    expect(second).toEqual({ x: 267, y: LINE_ONE, anchor: "end", text: '5/16"' });
    expect(touch(boxOf(first!), boxOf(second!))).toBe(false);
  });

  it("a value with no clear place at all is left to the words under the picture", () => {
    const crowd = [150, 161, 172].map((x) => ({ x, y: LINE_ONE, anchor: "middle" as const, text: '1/4"', bare: '1/4"', tickX: x }));
    const placed = placeSheetGaugeLabels(crowd, { width: 322, height: 100 }, LINE_ONE, SIZE);
    expect(placed[0]).not.toBeNull();
    expect(placed.filter((p) => p === null).length).toBeGreaterThan(0);
    const kept = placed.filter((p) => p !== null).map((p) => boxOf(p!));
    for (let a = 0; a < kept.length; a++) for (let b = a + 1; b < kept.length; b++) expect(touch(kept[a], kept[b])).toBe(false);
  });

  it.each(CASES)("$label — on the real sections no two values touch and none falls past the picture's foot", (c) => {
    const cuts = bottomPrintCuts(c.resolved);
    const box = cuts.length === 1 ? BOTTOM_SECTION_BOX.lone : BOTTOM_SECTION_BOX.pair;
    for (const system of UNITS_SYSTEMS) {
      for (const cut of cuts) {
        const drawing = bottomSection(c.resolved, c.built.board, cut.deepest, 4, box, { live: null });
        const dot = 1 / drawing.px;
        const gauges = sectionGauges(drawing, c.resolved, c.built.board, system);
        const inputs = gauges.flatMap((gauge) => {
          const bare = formatMark(gauge.value, system);
          return gauge.labels.map((label) => ({
            x: label.x * dot,
            y: label.y * dot,
            anchor: label.anchor,
            text: label.words ? `${bare} ${GAUGE_WORDS[gauge.kind]}` : bare,
            bare,
            tickX: gauge.lines[0].x * dot,
          }));
        });
        const height = drawing.height * dot;
        const placed = placeSheetGaugeLabels(inputs, { width: box.width, height }, drawing.y0 * dot + 15, SIZE);
        expect(placed).toHaveLength(inputs.length);
        const kept = placed.filter((p) => p !== null).map((p) => boxOf(p!));
        for (const k of kept) expect(k.foot, `${cut.key} (${system}): a value ends above the picture's foot`).toBeLessThanOrEqual(height);
        for (let a = 0; a < kept.length; a++) {
          for (let b = a + 1; b < kept.length; b++) expect(touch(kept[a], kept[b]), `${cut.key} (${system}): two values touch`).toBe(false);
        }
        // Every reading keeps its number on the picture somewhere: the rule only ever drops one when the box is crowded.
        if (inputs.length > 0) expect(kept.length, `${cut.key} (${system}): at least one value is drawn`).toBeGreaterThan(0);
      }
    }
  });
});
