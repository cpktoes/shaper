import { describe, expect, it } from "vitest";
import { isPickable } from "@/lib/blanks/catalog";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import type { BlankRecord } from "./blank";
import { placementRange, prepareBlank } from "./blank-fit";
import { printedBlankStations } from "./board-profile";
import {
  bendAt,
  bendPoint,
  customPrintedStations,
  normalizeSpec,
  withCustomRocker,
  type BlankRockerSpec,
  type RockerChange,
} from "./custom-rocker";
import {
  blankFrameOverlay,
  BLANK_VIEW,
  blankViewLayout,
  blankViewStations,
  boardInBlankFrame,
  NO_FIGURE,
  textWidthPx,
  type BlankViewStation,
  type LayoutBox,
} from "./custom-rocker-art";
import { FIGURE_TAGS } from "./custom-rocker-text";
import { BOARD_LENGTH_RANGE_IN } from "./board";
import { designSideProfile, LIVE_DESIGN_RULES } from "./design";
import { formatMark, stationLabel } from "./measure-display";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm, mm, UNITS_SYSTEMS } from "./units";

// The Customize Rocker popup's drawing data (quick 261016-mkb, D-07, P-3, P-11, P-14). Real blanks
// only: the sketch's two boards found by reading the presets' own records, and every pickable blank in
// the seeded catalogue for the layout. No figure is typed by hand.

const nose = (amountIn: number, fromTipIn?: number): RockerChange =>
  fromTipIn === undefined
    ? { end: "nose", amount: inchesToMm(amountIn) }
    : { end: "nose", amount: inchesToMm(amountIn), fromTip: inchesToMm(fromTipIn) };
const tail = (amountIn: number, fromTipIn?: number): RockerChange =>
  fromTipIn === undefined
    ? { end: "tail", amount: inchesToMm(amountIn) }
    : { end: "tail", amount: inchesToMm(amountIn), fromTip: inchesToMm(fromTipIn) };
const spec = (...changes: RockerChange[]): BlankRockerSpec => ({ changes });

/** The tests that walk every pickable blank need more than vitest's 5 s on a loaded machine. */
const LAYOUT_TIMEOUT_MS = 120_000;

function presetFields(id: string) {
  const preset = BOARD_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`no ${id} preset`);
  const fields = presetDesignFields(preset);
  if (!fields.blank) throw new Error(`${id} opens in no blank`);
  return { ...fields, blank: fields.blank };
}

const LONGBOARD = presetFields("longboard");
const SHORTBOARD = presetFields("shortboard");

const SPECS: [string, BlankRockerSpec][] = [
  ['+1/2"N', spec(nose(0.5))],
  ['+1/2"N +1/2"N18"', spec(nose(0.5), nose(0.5, 18))],
  ['-1/4"N18" +1/8"T36" +1/8"T18"', spec(nose(-0.25, 18), tail(0.125, 36), tail(0.125, 18))],
  ['+1/2"T +1/4"T6"', spec(tail(0.5), tail(0.25, 6))],
];

function bentOf(copy: BlankRecord, s: BlankRockerSpec) {
  return withCustomRocker(prepareBlank(copy), s);
}

describe("the overlay is drawn from ONE spec — the curve's own (the founder's round-ten catch)", () => {
  for (const [boardName, fields] of [
    ["the Longboard in its blank", LONGBOARD],
    ["the Shortboard in its blank", SHORTBOARD],
  ] as const) {
    for (const [label, s] of SPECS) {
      it(`${label} on ${boardName}`, () => {
        const copy = fields.blank.copy;
        const L = copy.lengthMm;
        const bent = bentOf(copy, s);
        const overlay = blankFrameOverlay(s, bent);
        const n = normalizeSpec(s, L);

        // One span per change, from its bend point to its own tip, ordered as the note orders them.
        expect(overlay.spans).toHaveLength(n.changes.length);
        for (const end of ["nose", "tail"] as const) {
          const own = n.changes.filter((c) => c.end === end);
          const spans = overlay.spans.filter((sp) => sp.end === end);
          expect(spans.map((sp) => sp.order)).toEqual(own.map((_, i) => (i === 0 ? 1 : 2)));
          own.forEach((change, i) => {
            const span = spans[i];
            const p = bendPoint(change, L);
            const xs = span.bottom.map((pt) => pt.s);
            const [from, to] = end === "nose" ? [p, L] : [0, p];
            expect(Math.min(...xs)).toBe(from);
            expect(Math.max(...xs)).toBe(to);
            const second = own[1];
            for (let k = 0; k < span.bottom.length; k++) {
              const x = span.bottom[k].s;
              const drawn = bent.rocker.sample(x);
              // Blue (second) is the drawn bottom itself; red (first) is the drawn bottom less the
              // second change's bend on that end (P-14).
              const expected = i === 1 || !second ? drawn : drawn - bendAt({ changes: [second] }, L, x);
              expect(span.bottom[k].h).toBeCloseTo(expected, 9);
              // The deck is the bottom plus the blank's own thickness there.
              expect(span.deck[k].s).toBe(x);
              expect(span.deck[k].h).toBeCloseTo(span.bottom[k].h + bent.thickness.sample(x), 9);
            }
          });
        }

        // The natural line is the drawn bottom less the whole bend, and IS the drawn bottom wherever
        // no change has a share.
        expect(overlay.natural.length).toBeGreaterThan(200);
        for (const pt of overlay.natural) {
          const drawn = bent.rocker.sample(pt.s);
          const bend = bendAt(n, L, pt.s);
          expect(pt.h).toBeCloseTo(drawn - bend, 9);
          if (bend === 0) expect(Math.abs(pt.h - drawn)).toBeLessThan(1e-9);
        }

        // A bend mark at each distinct bend point, from the drawn bottom to the drawn deck.
        const points = [...new Set(n.changes.map((c) => bendPoint(c, L)))].sort((a, b) => a - b);
        expect(overlay.bendMarks.map((m) => m.s)).toEqual(points);
        for (const mark of overlay.bendMarks) {
          expect(mark.bottom).toBeCloseTo(bent.rocker.sample(mark.s), 9);
          expect(mark.deck).toBeCloseTo(mark.bottom + bent.thickness.sample(mark.s), 9);
          expect(mark.deck).toBeGreaterThan(mark.bottom);
        }
      });
    }
  }

  it("two changes from the centre share one bend mark", () => {
    const s = spec(nose(0.5), tail(0.25));
    const overlay = blankFrameOverlay(s, bentOf(LONGBOARD.blank.copy, s));
    expect(overlay.bendMarks).toHaveLength(1);
    expect(overlay.bendMarks[0].s).toBe(LONGBOARD.blank.copy.lengthMm / 2);
  });

  it("a natural spec draws no spans, no marks and no natural line", () => {
    const bent = prepareBlank(LONGBOARD.blank.copy);
    for (const s of [undefined, spec(), spec(nose(0))]) {
      expect(blankFrameOverlay(s, bent)).toEqual({ natural: [], spans: [], bendMarks: [] });
    }
  });
});

describe("the board inside the blank, in the blank's own frame (quick 261017-ojc, P-3)", () => {
  const fieldsWith = (s: BlankRockerSpec | undefined, extra: Partial<typeof LONGBOARD.blank> = {}) => ({
    ...LONGBOARD,
    blank: { ...LONGBOARD.blank, ...extra, rocker: s ?? { changes: [] } },
  });
  const range = placementRange(LONGBOARD.blank.copy.lengthMm, LONGBOARD.outline.length);
  const variants: [string, Partial<typeof LONGBOARD.blank>][] = [
    ["as the preset opens", {}],
    ["Pin deck tips", { tipStyle: "pinDeck" }],
    ["Bottom tips", { tipStyle: "bottom" }],
    ["a Bottom fine-tune", { nose12Offset: inchesToMm(0.25), tail12Offset: inchesToMm(-0.125), fineTuneSurface: "bottom" }],
    ["placed off centre", { placement: mm(range.max / 2) }],
  ];
  const specs: [string, BlankRockerSpec | undefined][] = [["natural", undefined], ...SPECS];

  for (const [label, s] of specs) {
    for (const [how, extra] of variants) {
      it(`${label}, ${how}: one shift carries the board's heights into the blank's frame`, () => {
        const profile = designSideProfile(fieldsWith(s, extra), LIVE_DESIGN_RULES);
        const view = profile.blank!;
        const board = boardInBlankFrame(profile)!;
        const L = profile.length;
        // The same shift at 41 even stations along the board: the blank's own bent bottom there less
        // the side view's blank bottom (in the board's frame).
        for (let i = 0; i <= 40; i++) {
          const sBoard = (L * i) / 40;
          const here = view.onBlank.prepared.rocker.sample(sBoard - view.start) - view.bottomAt(mm(sBoard));
          expect(Math.abs(here - board.shift), `${label} ${how} at ${i}/40`).toBeLessThan(1e-9);
        }
        // The outline and the stations are the profile's own heights, shifted, x from the blank's tail tip.
        expect(board.outline[0].x).toBeCloseTo(-view.start, 9);
        expect(board.outline[board.outline.length - 1].x).toBeCloseTo(L - view.start, 9);
        for (const st of board.stations) {
          const sBoard = mm(st.x + view.start);
          expect(st.bottom).toBeCloseTo(profile.rockerAt(sBoard) + board.shift, 9);
          expect(st.deck).toBeCloseTo(profile.deckAt(sBoard) + board.shift, 9);
          expect(st.thickness).toBe(profile.effectiveFoil[st.key]);
        }
      });
    }

    it(`${label}: the drawn bent blank and the board's blank are one curve`, () => {
      const profile = designSideProfile(fieldsWith(s), LIVE_DESIGN_RULES);
      const view = profile.blank!;
      const copy = LONGBOARD.blank.copy;
      const bent = withCustomRocker(prepareBlank(copy), s);
      for (let i = 0; i <= 40; i++) {
        const x = (copy.lengthMm * i) / 40;
        expect(Math.abs(view.onBlank.prepared.rocker.sample(x) - bent.rocker.sample(x))).toBeLessThan(1e-9);
      }
    });

    it(`${label}: with no fine-tune the board's bottom sits the centre gap above the blank's (what P-3 keeps out of BOARD)`, () => {
      const profile = designSideProfile(fieldsWith(s), LIVE_DESIGN_RULES);
      const view = profile.blank!;
      const board = boardInBlankFrame(profile)!;
      expect(Math.abs(board.shift - (view.centerGap + view.onBlank.cropMinimum))).toBeLessThan(1e-9);
    });
  }

  it("the board's rocker reads as the page reads it, and nothing past the board's tips", () => {
    for (const preset of BOARD_PRESETS) {
      const fields = presetDesignFields(preset);
      if (!fields.blank) continue;
      const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
      const view = profile.blank!;
      const board = boardInBlankFrame(profile)!;
      const L = profile.length;
      // The board stops short of both blank tips on every preset that opens in a blank.
      expect(view.start, preset.id).toBeLessThan(0);
      expect(view.end, preset.id).toBeGreaterThan(L);
      expect(board.rockerAt(0), preset.id).toBeNull();
      expect(board.rockerAt(view.record.lengthMm), preset.id).toBeNull();
      expect(board.rockerAt(L / 2 - view.start)!, preset.id).toBeCloseTo(profile.stationRocker.center, 9);
      for (let i = 0; i <= 20; i++) {
        const sBoard = (L * i) / 20;
        expect(board.rockerAt(sBoard - view.start)!, preset.id).toBeCloseTo(profile.rockerAt(mm(sBoard)), 9);
      }
    }
  });

  it("a hand-set board has no blank to sit in", () => {
    const profile = designSideProfile({ ...LONGBOARD, blank: null }, LIVE_DESIGN_RULES);
    expect(boardInBlankFrame(profile)).toBeNull();
  });
});

const PICKABLE: BlankRecord[] = readSeedCatalog().filter(isPickable);
/** Each real blank bent once per spec, shared by the layout tests (they run thousands of layouts). */
const BENT = new Map<BlankRecord, Map<BlankRockerSpec | undefined, ReturnType<typeof withCustomRocker>>>();
function bentFor(record: BlankRecord, s: BlankRockerSpec | undefined) {
  let bySpec = BENT.get(record);
  if (!bySpec) BENT.set(record, (bySpec = new Map()));
  let bent = bySpec.get(s);
  if (!bent) bySpec.set(s, (bent = withCustomRocker(prepareBlank(record), s)));
  return bent;
}


/** Two boxes meet, or come closer than `gap` px. */
function intersects(a: LayoutBox, b: LayoutBox, gap = 0): boolean {
  return a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;
}

/** Two labels keep at least this much air between them. */
const RAIL_GAP_PX = 2;

function inside(box: LayoutBox, w: number, h: number): boolean {
  const e = 1e-6;
  return box.x >= -e && box.y >= -e && box.x + box.width <= w + e && box.y + box.height <= h + e;
}

function pointInside(p: { x: number; y: number }, w: number, h: number): boolean {
  const e = 1e-6;
  return p.x >= -e && p.y >= -e && p.x <= w + e && p.y <= h + e;
}

const LAYOUT_SPECS: [string, BlankRockerSpec | undefined][] = [
  ["natural", undefined],
  ['+2"N +2"T', spec(nose(2), tail(2))],
  ['-1"N24" +1/2"T', spec(nose(-1, 24), tail(0.5))],
];

const SAMPLE_COUNT = 120;

// ---------------------------------------------------------------------------------------------
// The one drawing (quick 261017-ojc, 2026-10-17)
// ---------------------------------------------------------------------------------------------

describe("text widths read from Inter Bold's own advances (P-14)", () => {
  // Measured in Chromium, 2026-10-17: the table never reads under and never more than a quarter over.
  const MEASURED: [string, number, number, number][] = [
    ["CUSTOM", 9, 0.08, 44.4],
    ['4 15/16"', 12, 0, 47.9],
    ["Nose @ 30.5 cm", 9, 0.08, 82.1],
    ["114", 12, 0, 18.5],
    ["Thickness", 10, 0.08, 57.9],
  ];
  for (const [text, px, tracking, real] of MEASURED) {
    it(`${text} at ${px} px`, () => {
      const w = textWidthPx(text, px, tracking);
      expect(w).toBeGreaterThanOrEqual(real);
      expect(w).toBeLessThanOrEqual(1.25 * real);
    });
  }
});

function longboardBoard(s: BlankRockerSpec | undefined) {
  const profile = designSideProfile({ ...LONGBOARD, blank: { ...LONGBOARD.blank, rocker: s ?? { changes: [] } } }, LIVE_DESIGN_RULES);
  return boardInBlankFrame(profile)!;
}

describe("the one drawing's five stations (D-02, D-03, P-2 … P-6)", () => {
  const specs: [string, BlankRockerSpec | undefined][] = [["natural", undefined], ...SPECS];
  for (const system of UNITS_SYSTEMS) {
    for (const withBoard of [false, true]) {
      it(`${system}, board ${withBoard ? "shown" : "off"}`, () => {
        const copy = LONGBOARD.blank.copy;
        const L = copy.lengthMm;
        const printed = printedBlankStations(copy);
        const show = (v: number | null) => (v === null ? NO_FIGURE : formatMark(mm(v), system));
        for (const [label, s] of specs) {
          const bent = bentOf(copy, s ?? { changes: [] });
          const board = withBoard ? longboardBoard(s) : null;
          const stations = blankViewStations(bent, s, system, board);
          const ordered = customPrintedStations(copy, s);
          const custom = label !== "natural";
          expect(stations.map((st) => st.key)).toEqual(["tailTip", "tail12", "center", "nose12", "noseTip"]);
          expect(stations.map((st) => st.x)).toEqual([0, inchesToMm(12), L / 2, L - inchesToMm(12), L]);
          for (const st of stations) {
            const where = `${label} ${st.key}`;
            expect(st.bottom, where).toBeCloseTo(bent.rocker.sample(st.x), 9);
            expect(st.deck, where).toBeCloseTo(st.bottom + bent.thickness.sample(st.x), 9);
            // Rocker: NAT always; CUSTOM at all five exactly when the spec is not natural (P-4); BOARD
            // at all five exactly when a board is shown, `—` muted where it does not reach (P-3).
            const keys = st.rocker.map((f) => f.key);
            expect(keys, where).toEqual(["nat", ...(custom ? ["custom"] : []), ...(withBoard ? ["board"] : [])]);
            const nat = st.rocker[0];
            expect(nat.tag).toBe(FIGURE_TAGS.nat);
            expect(nat.value, where).toBe(show(printed[st.key].rocker));
            expect(nat.muted).toBe(printed[st.key].rocker === null);
            if (custom) expect(st.rocker[1].value, where).toBe(show(ordered[st.key].rocker));
            if (board) {
              const fig = st.rocker[st.rocker.length - 1];
              const r = board.rockerAt(st.x);
              expect(fig.tag).toBe(FIGURE_TAGS.board);
              expect(fig.value, where).toBe(r === null ? NO_FIGURE : formatMark(r, system));
              expect(fig.muted, where).toBe(r === null);
              expect(st.boardBottom === null, where).toBe(r === null);
              if (r !== null) expect(st.boardBottom!, where).toBeCloseTo(r + board.shift, 9);
            } else {
              expect(st.boardBottom).toBeNull();
            }
            // Thickness: one untagged figure with no board; BLANK and BOARD with one (P-5).
            if (board) {
              const own = board.stations.find((b) => b.key === st.key)!;
              expect(st.thickness.map((f) => [f.key, f.tag])).toEqual([
                ["blank", FIGURE_TAGS.blank],
                ["board", FIGURE_TAGS.board],
              ]);
              expect(st.thickness[0].value).toBe(show(printed[st.key].thickness));
              expect(st.thickness[1].value).toBe(formatMark(own.thickness, system));
              expect(st.board).toEqual({ x: own.x, bottom: own.bottom, deck: own.deck });
            } else {
              expect(st.thickness).toEqual([
                { key: "blank", tag: null, value: show(printed[st.key].thickness), muted: printed[st.key].thickness === null },
              ]);
              expect(st.board).toBeNull();
            }
          }
          expect(stations[0].name).toBe("Tail Tip");
          expect(stations[1].name).toBe(`Tail @ ${stationLabel(system)}`);
          expect(stations[2].name).toBe("Center");
          expect(stations[3].name).toBe(`Nose @ ${stationLabel(system)}`);
          expect(stations[4].name).toBe("Nose Tip");
        }
      });
    }
  }

  it("the Longboard in its own blank: BOARD reads `—` at both blank tips, a figure at the other three", () => {
    const s = SPECS[2][1];
    const board = longboardBoard(s);
    const stations = blankViewStations(bentOf(LONGBOARD.blank.copy, s), s, "imperial", board);
    const boardFig = (key: string) => stations.find((st) => st.key === key)!.rocker.find((f) => f.key === "board")!;
    expect(boardFig("tailTip").value).toBe(NO_FIGURE);
    expect(boardFig("noseTip").value).toBe(NO_FIGURE);
    for (const key of ["tail12", "center", "nose12"]) expect(boardFig(key).muted, key).toBe(false);
  });
});

/** The gate's popup sizes: the svg's own box with the toolbar band already off (P-8, P-9). */
const VIEW_BOXES = [
  { name: "computer", width: 778, height: 469, orientation: "horizontal" as const, scroll: false },
  { name: "narrow browser window", width: 784, height: 194, orientation: "horizontal" as const, scroll: false },
  { name: "Pixel 7 sideways", width: 523, height: 143, orientation: "horizontal" as const, scroll: true },
  { name: "iPhone sideways", width: 502, height: 181, orientation: "horizontal" as const, scroll: true },
  { name: "iPhone upright", width: 356, height: 203, orientation: "vertical" as const, scroll: false },
  { name: "Pixel 7 upright", width: 378, height: 279, orientation: "vertical" as const, scroll: false },
];

/** Everything one blank and one spec feed the layout, built once and shared by every box. */
interface ViewCase {
  record: BlankRecord;
  label: string;
  bent: ReturnType<typeof withCustomRocker>;
  blank: { x: number; bottom: number; deck: number }[];
  overlay: ReturnType<typeof blankFrameOverlay>;
  board: NonNullable<ReturnType<typeof boardInBlankFrame>>;
  /** The board ends within 12" of each blank tip (P-13). */
  boardWithin12: boolean;
  stations: Map<string, BlankViewStation[]>;
}

const VIEW_CASES: ViewCase[] = [];
function viewCases(): ViewCase[] {
  if (VIEW_CASES.length > 0) return VIEW_CASES;
  const twelve = inchesToMm(12);
  for (const record of PICKABLE) {
    for (const [label, s] of LAYOUT_SPECS) {
      const bent = bentFor(record, s);
      const L = bent.lengthMm;
      const blank = Array.from({ length: SAMPLE_COUNT + 1 }, (_, i) => {
        const x = (L * i) / SAMPLE_COUNT;
        const bottom = bent.rocker.sample(x);
        return { x, bottom, deck: bottom + bent.thickness.sample(x) };
      });
      // The Longboard's design with its blank swapped to this record, its length the blank's less
      // 3 1/2", held within the app's board lengths.
      const lengthIn = Math.min(BOARD_LENGTH_RANGE_IN.max, Math.max(BOARD_LENGTH_RANGE_IN.min, L / inchesToMm(1) - 3.5));
      const profile = designSideProfile(
        {
          ...LONGBOARD,
          outline: { ...LONGBOARD.outline, length: inchesToMm(lengthIn) },
          blank: { ...LONGBOARD.blank, copy: record, placement: mm(0), rocker: s ?? { changes: [] } },
        },
        LIVE_DESIGN_RULES,
      );
      const board = boardInBlankFrame(profile)!;
      const boardTail = -board.start;
      const boardNose = board.length - board.start;
      const stations = new Map<string, BlankViewStation[]>();
      for (const system of UNITS_SYSTEMS) {
        stations.set(`${system}|off`, blankViewStations(bent, s, system, null));
        stations.set(`${system}|on`, blankViewStations(bent, s, system, board));
      }
      VIEW_CASES.push({
        record,
        label,
        bent,
        blank,
        overlay: blankFrameOverlay(s, bent),
        board,
        boardWithin12: boardTail <= twelve && L - boardNose <= twelve,
        stations,
      });
    }
  }
  return VIEW_CASES;
}

/** Two segments cross (or touch). */
function segmentsMeet(p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }, s: { x: number; y: number }): boolean {
  const cross = (a: typeof p, b: typeof p, c: typeof p) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = cross(r, s, p);
  const d2 = cross(r, s, q);
  const d3 = cross(p, q, r);
  const d4 = cross(p, q, s);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function onBoxEdge(p: { x: number; y: number }, b: LayoutBox): boolean {
  const e = 1e-6;
  const within = p.x >= b.x - e && p.x <= b.x + b.width + e && p.y >= b.y - e && p.y <= b.y + b.height + e;
  const edge =
    Math.abs(p.x - b.x) < e || Math.abs(p.x - b.x - b.width) < e || Math.abs(p.y - b.y) < e || Math.abs(p.y - b.y - b.height) < e;
  return within && edge;
}

describe("the one drawing's layout, on every pickable blank in every popup size (D-01, P-8, P-9, P-13)", { timeout: LAYOUT_TIMEOUT_MS }, () => {
  for (const box of VIEW_BOXES) {
    it(`${box.name} (${box.width}×${box.height}, ${box.orientation}${box.scroll ? ", scrolls" : ""})`, () => {
      const problems: string[] = [];
      const check = (ok: boolean, what: string) => {
        if (!ok && problems.length < 40) problems.push(what);
      };
      const e = 1e-6;
      const smallest = { scale: 1, where: "" };
      for (const c of viewCases()) {
        const L = c.bent.lengthMm;
        for (const system of UNITS_SYSTEMS) {
          for (const withBoard of [false, true]) {
            const where = `${c.record.vendor} ${c.record.name}, ${c.label}, ${system}, board ${withBoard ? "on" : "off"}`;
            const stations = c.stations.get(`${system}|${withBoard ? "on" : "off"}`)!;
            const layout = blankViewLayout({
              width: box.width,
              height: box.height,
              orientation: box.orientation,
              lengthMm: L,
              blank: c.blank,
              board: withBoard ? c.board.outline : null,
              overlay: c.overlay,
              stations,
              dimensions: true,
              scroll: box.scroll,
            });
            if (layout.labelScale < smallest.scale) {
              smallest.scale = layout.labelScale;
              smallest.where = where;
            }
            check(layout.scale > 0, `${where}: scale`);
            // One uniform scale, nose left lying flat and up standing.
            const tail0 = layout.point(0, 0);
            const nose0 = layout.point(L, 0);
            check(Math.abs(Math.hypot(nose0.x - tail0.x, nose0.y - tail0.y) - L * layout.scale) < e, `${where}: along`);
            const up = layout.point(0, 100);
            check(Math.abs(Math.hypot(up.x - tail0.x, up.y - tail0.y) - 100 * layout.scale) < e, `${where}: across`);
            check(box.orientation === "horizontal" ? nose0.x < tail0.x : nose0.y < tail0.y, `${where}: nose`);
            // The height: the box's, or at least it on a short screen (P-9).
            check(box.scroll ? layout.height >= box.height - e : Math.abs(layout.height - box.height) < e, `${where}: height`);
            // What the box is asked to grow to never reads the box's own height, so a box grown to it
            // lays out the same and shrinks back when less is needed (P-9).
            check(layout.neededHeight <= layout.height + e, `${where}: needed height`);
            if (box.scroll && layout.neededHeight > box.height) {
              const grown = blankViewLayout({
                width: box.width,
                height: Math.round(layout.neededHeight),
                orientation: box.orientation,
                lengthMm: L,
                blank: c.blank,
                board: withBoard ? c.board.outline : null,
                overlay: c.overlay,
                stations,
                dimensions: true,
                scroll: true,
              });
              check(Math.abs(grown.neededHeight - layout.neededHeight) < e && grown.labelScale === layout.labelScale, `${where}: grown box`);
            }
            // The label scale: 1 on a computer, never under 0.8 (P-8).
            if (box.name === "computer" || box.name === "narrow browser window") check(layout.labelScale === 1, `${where}: label scale ${layout.labelScale}`);
            check(layout.labelScale >= 0.8, `${where}: label scale ${layout.labelScale}`);

            // Every label inside the drawing, and no two within 2 px.
            const boxes: [string, LayoutBox][] = [
              ...layout.cards.map((l): [string, LayoutBox] => [`card ${l.key}`, l.box]),
              ...layout.stacks.map((l): [string, LayoutBox] => [`stack ${l.key}`, l.box]),
              ...layout.titles.map((t): [string, LayoutBox] => [`title ${t.key}`, t.box]),
            ];
            check(layout.cards.length === 5 && layout.stacks.length === 5 && layout.titles.length === 2, `${where}: label count`);
            for (const [name, b] of boxes) check(inside(b, layout.width, layout.height), `${where}: ${name} outside`);
            for (let i = 0; i < boxes.length; i++) {
              for (let j = i + 1; j < boxes.length; j++) {
                check(!intersects(boxes[i][1], boxes[j][1], RAIL_GAP_PX), `${where}: ${boxes[i][0]} meets ${boxes[j][0]}`);
              }
            }
            // The foam inside too.
            check(layout.blankOutline.every((p) => pointInside(p, layout.width, layout.height)), `${where}: outline`);
            if (layout.boardOutline) check(layout.boardOutline.every((p) => pointInside(p, layout.width, layout.height)), `${where}: board outline`);

            // Leaders: each starts on its own label's edge and ends on what it measures; ticks there.
            layout.cards.forEach((card, i) => {
              const st = stations[i];
              const targets = st.thickness.map((f) => (f.key === "board" ? layout.point(st.board!.x, st.board!.deck) : layout.point(st.x, st.deck)));
              check(card.leaders.length === targets.length, `${where}: ${st.key} card leaders`);
              card.leaders.forEach((leader, n) => {
                const end = leader[leader.length - 1];
                check(Math.abs(end.x - targets[n].x) < e && Math.abs(end.y - targets[n].y) < e, `${where}: ${st.key} card leader ${n} end`);
                check(onBoxEdge(leader[0], card.box), `${where}: ${st.key} card leader ${n} start`);
              });
              if (card.leaders.length === 2) {
                const [a, b] = card.leaders.map((l) => l[0]);
                check(Math.hypot(a.x - b.x, a.y - b.y) >= BLANK_VIEW.leaderSeparation - e, `${where}: ${st.key} card leaders apart`);
              }
              check(
                card.ticks.length === targets.length && card.ticks.every((t, n) => Math.abs(t.x - targets[n].x) < e && Math.abs(t.y - targets[n].y) < e),
                `${where}: ${st.key} card ticks`,
              );
            });
            layout.stacks.forEach((stack, i) => {
              const st = stations[i];
              const leader = stack.leaders[0];
              const bottom = layout.point(st.x, st.bottom);
              const far = st.boardBottom === null ? bottom : layout.point(st.x, Math.max(st.bottom, st.boardBottom));
              const end = leader[leader.length - 1];
              check(Math.abs(end.x - far.x) < e && Math.abs(end.y - far.y) < e, `${where}: ${st.key} stack leader end`);
              check(leader.some((p) => Math.abs(p.x - bottom.x) < e && Math.abs(p.y - bottom.y) < e), `${where}: ${st.key} stack leader through the bottom`);
              check(onBoxEdge(leader[0], stack.box), `${where}: ${st.key} stack leader start`);
              check(stack.ticks.some((t) => Math.abs(t.x - bottom.x) < e && Math.abs(t.y - bottom.y) < e), `${where}: ${st.key} stack tick`);
            });
            // Leaders of different stations never cross while the board ends within 12" of each tip (P-13).
            if (!withBoard || c.boardWithin12) {
              for (const rail of [layout.cards, layout.stacks]) {
                const segs = rail.map((label) => label.leaders.flatMap((l) => l.slice(1).map((p, n) => [l[n], p] as const)));
                for (let i = 0; i < segs.length; i++) {
                  for (let j = i + 1; j < segs.length; j++) {
                    for (const [p, q] of segs[i]) {
                      for (const [r, s] of segs[j]) check(!segmentsMeet(p, q, r, s), `${where}: ${rail[i].key} and ${rail[j].key} leaders cross`);
                    }
                  }
                }
              }
            }
          }
        }
      }
      console.log(`[ojc P-8] ${box.name} ${box.width}×${box.height}: smallest label scale ${smallest.scale} (${smallest.where || "every layout at 1"})`);
      expect(problems).toEqual([]);
    });

    it(`${box.name}: Dimensions off fits the foam to the box with only the gutter (D-07, P-16)`, () => {
      const problems: string[] = [];
      const check = (ok: boolean, what: string) => {
        if (!ok && problems.length < 40) problems.push(what);
      };
      const g = BLANK_VIEW.gutter;
      for (const c of viewCases()) {
        for (const withBoard of [false, true]) {
          const where = `${c.record.vendor} ${c.record.name}, ${c.label}, board ${withBoard ? "on" : "off"}`;
          const layout = blankViewLayout({
            width: box.width,
            height: box.height,
            orientation: box.orientation,
            lengthMm: c.bent.lengthMm,
            blank: c.blank,
            board: withBoard ? c.board.outline : null,
            overlay: c.overlay,
            stations: c.stations.get(`imperial|${withBoard ? "on" : "off"}`)!,
            dimensions: false,
            scroll: box.scroll,
          });
          check(layout.cards.length === 0 && layout.stacks.length === 0 && layout.titles.length === 0, `${where}: labels`);
          check(layout.height === box.height, `${where}: height`);
          const pts = [
            ...layout.blankOutline,
            ...(layout.boardOutline ?? []),
            layout.baseline.from,
            layout.baseline.to,
            ...c.overlay.natural.map((p) => layout.point(p.s, p.h)),
            ...c.overlay.spans.flatMap((sp) => [...sp.bottom, ...sp.deck].map((p) => layout.point(p.s, p.h))),
          ];
          const xs = pts.map((p) => p.x);
          const ys = pts.map((p) => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          const e = 1e-6;
          check(minX >= g - e && minY >= g - e && maxX <= box.width - g + e && maxY <= box.height - g + e, `${where}: inside the gutter`);
          // Tight on one axis.
          const tightX = Math.abs(maxX - minX - (box.width - 2 * g)) < 1e-6;
          const tightY = Math.abs(maxY - minY - (box.height - 2 * g)) < 1e-6;
          check(tightX || tightY, `${where}: not tight (${(maxX - minX).toFixed(2)} × ${(maxY - minY).toFixed(2)})`);
        }
      }
      expect(problems).toEqual([]);
    });
  }
});
