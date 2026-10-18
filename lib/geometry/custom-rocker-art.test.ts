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
  blankAloneLayout,
  blankAloneStations,
  blankFrameOverlay,
  boardInBlankFrame,
  NO_FIGURE,
  type BlankAloneLayout,
  type LayoutBox,
} from "./custom-rocker-art";
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
const LONG_COPY = LONGBOARD.blank.copy;

describe("the blank alone: its own five stations, as ordered (P-11)", { timeout: LAYOUT_TIMEOUT_MS }, () => {
  for (const system of UNITS_SYSTEMS) {
    it(`reads the catalogue's printed figures as ordered, ${system}`, () => {
      for (const [, s] of SPECS) {
        const bent = bentOf(LONG_COPY, s);
        const stations = blankAloneStations(bent, s, system);
        const L = LONG_COPY.lengthMm;
        expect(stations.map((st) => st.key)).toEqual(["tailTip", "tail12", "center", "nose12", "noseTip"]);
        expect(stations.map((st) => st.x)).toEqual([0, inchesToMm(12), L / 2, L - inchesToMm(12), L]);
        const ordered = customPrintedStations(LONG_COPY, s);
        const printed = printedBlankStations(LONG_COPY);
        const show = (v: number | null) => (v === null ? NO_FIGURE : formatMark(mm(v), system));
        for (const st of stations) {
          expect(st.reading.value).toBe(show(ordered[st.key].rocker));
          expect(st.chip.value).toBe(show(printed[st.key].thickness));
          const nat = show(printed[st.key].rocker);
          expect(st.reading.natural).toBe(printed[st.key].rocker !== null && nat !== st.reading.value ? `NAT ${nat}` : null);
          expect(st.bottom).toBeCloseTo(bent.rocker.sample(st.x), 9);
          expect(st.deck).toBeCloseTo(st.bottom + bent.thickness.sample(st.x), 9);
        }
        expect(stations[1].chip.name).toBe(`Tail @ ${stationLabel(system)}`);
        expect(stations[3].chip.name).toBe(`Nose @ ${stationLabel(system)}`);
      }
    });
  }

  it('the centre is "Center · zero" when its figure prints 0, "Center" otherwise', () => {
    let zero = 0;
    let other = 0;
    for (const record of PICKABLE) {
      const prepared = prepareBlank(record);
      const centre = blankAloneStations(prepared, undefined, "imperial")[2];
      if (centre.reading.value === formatMark(mm(0), "imperial")) {
        expect(centre.reading.name).toBe("Center · zero");
        zero++;
      } else {
        expect(centre.reading.name).toBe("Center");
        other++;
      }
    }
    expect(zero).toBeGreaterThan(0);
    expect(other).toBeGreaterThan(0);
  });

  it("a natural spec reads the printed figures with no NAT figure anywhere", () => {
    const stations = blankAloneStations(prepareBlank(LONG_COPY), undefined, "imperial");
    expect(stations.every((st) => st.reading.natural === null)).toBe(true);
  });
});

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

/** Neighbours on a rail keep at least this much air between them. */
const RAIL_GAP_PX = 2;

function inside(box: LayoutBox, w: number, h: number): boolean {
  const e = 1e-6;
  return box.x >= -e && box.y >= -e && box.x + box.width <= w + e && box.y + box.height <= h + e;
}

function pointInside(p: { x: number; y: number }, w: number, h: number): boolean {
  const e = 1e-6;
  return p.x >= -e && p.y >= -e && p.x <= w + e && p.y <= h + e;
}

const BOXES = [
  { name: "computer", width: 790, height: 540, orientation: "horizontal" as const },
  { name: "Pixel 7 sideways", width: 520, height: 200, orientation: "horizontal" as const },
  { name: "iPhone upright", width: 366, height: 240, orientation: "vertical" as const },
  // The box measured on the built popup (2026-10-16): the drawing pinned at 45% of an iPhone 14's
  // height, less the card's padding and its key line — smaller than the plan's estimate.
  { name: "iPhone upright, as built", width: 350, height: 180, orientation: "vertical" as const },
];

const LAYOUT_SPECS: [string, BlankRockerSpec | undefined][] = [
  ["natural", undefined],
  ['+2"N +2"T', spec(nose(2), tail(2))],
  ['-1"N24" +1/2"T', spec(nose(-1, 24), tail(0.5))],
];

const SAMPLE_COUNT = 120;

function layoutFor(record: BlankRecord, s: BlankRockerSpec | undefined, box: (typeof BOXES)[number]): BlankAloneLayout {
  const bent = bentFor(record, s);
  const L = bent.lengthMm;
  const samples = Array.from({ length: SAMPLE_COUNT + 1 }, (_, i) => {
    const x = (L * i) / SAMPLE_COUNT;
    const bottom = bent.rocker.sample(x);
    return { x, bottom, deck: bottom + bent.thickness.sample(x) };
  });
  return blankAloneLayout({
    width: box.width,
    height: box.height,
    orientation: box.orientation,
    lengthMm: L,
    samples,
    stations: blankAloneStations(bent, s, "imperial"),
  });
}

describe("the blank-alone layout in Metric, where the station names run longer", { timeout: LAYOUT_TIMEOUT_MS }, () => {
  for (const box of BOXES) {
    it(`${box.name}: neighbours on each rail keep their air on every natural pickable blank`, () => {
      for (const record of PICKABLE) {
        const bent = bentFor(record, undefined);
        const L = bent.lengthMm;
        const samples = Array.from({ length: SAMPLE_COUNT + 1 }, (_, i) => {
          const x = (L * i) / SAMPLE_COUNT;
          const bottom = bent.rocker.sample(x);
          return { x, bottom, deck: bottom + bent.thickness.sample(x) };
        });
        const layout = blankAloneLayout({
          width: box.width,
          height: box.height,
          orientation: box.orientation,
          lengthMm: L,
          samples,
          stations: blankAloneStations(bent, undefined, "metric"),
        });
        for (const rail of ["chip", "reading"] as const) {
          const boxes = layout.stations.map((st) => st[rail].box);
          for (let i = 0; i + 1 < boxes.length; i++) {
            expect(intersects(boxes[i], boxes[i + 1], RAIL_GAP_PX), `${record.vendor} ${record.name}: ${rail} ${i}`).toBe(false);
            expect(inside(boxes[i], box.width, box.height)).toBe(true);
          }
        }
      }
    });
  }
});

describe("the blank-alone layout, on every pickable blank in three boxes", { timeout: LAYOUT_TIMEOUT_MS }, () => {
  it("reads every pickable blank", () => {
    expect(PICKABLE.length).toBe(219);
  });

  for (const box of BOXES) {
    it(`${box.name} (${box.width}×${box.height}, ${box.orientation})`, () => {
      // Thousands of checks: collected as sentences and asserted once, so the run stays quick.
      const problems: string[] = [];
      const check = (ok: boolean, what: string) => {
        if (!ok) problems.push(what);
      };
      const e = 1e-6;
      for (const record of PICKABLE) {
        for (const [label, s] of LAYOUT_SPECS) {
          const where = `${record.vendor} ${record.name}, ${label}`;
          const layout = layoutFor(record, s, box);
          const L = record.lengthMm;
          check(layout.scale > 0, `${where}: scale`);
          // One uniform scale: along and across alike.
          const tail0 = layout.point(0, 0);
          const nose0 = layout.point(L, 0);
          check(Math.abs(Math.hypot(nose0.x - tail0.x, nose0.y - tail0.y) - L * layout.scale) < e, `${where}: along`);
          const up = layout.point(0, 100);
          check(Math.abs(Math.hypot(up.x - tail0.x, up.y - tail0.y) - 100 * layout.scale) < e, `${where}: across`);
          // Nose left lying flat, nose up standing.
          check(box.orientation === "horizontal" ? nose0.x < tail0.x : nose0.y < tail0.y, `${where}: nose`);

          // Everything inside the box.
          check(layout.outline.every((p) => pointInside(p, box.width, box.height)), `${where}: outline`);
          check(pointInside(layout.baseline.from, box.width, box.height) && pointInside(layout.baseline.to, box.width, box.height), `${where}: baseline`);
          for (const t of layout.titles) check(inside(t.box, box.width, box.height), `${where}: ${t.text.text}`);
          for (const st of layout.stations) {
            for (const lab of [st.chip, st.reading]) {
              check(inside(lab.box, box.width, box.height), `${where}: ${st.key} box`);
              check(pointInside(lab.leader.rail, box.width, box.height) && pointInside(lab.leader.curve, box.width, box.height), `${where}: ${st.key} leader`);
            }
          }

          // On each rail, no two label boxes meet; no label meets a title.
          for (const rail of ["chip", "reading"] as const) {
            const boxes = layout.stations.map((st) => st[rail].box);
            for (let i = 0; i < boxes.length; i++) {
              for (let j = i + 1; j < boxes.length; j++) {
                check(!intersects(boxes[i], boxes[j], RAIL_GAP_PX), `${where}: ${rail} ${layout.stations[i].key} meets ${layout.stations[j].key}`);
              }
              for (const t of layout.titles) check(!intersects(boxes[i], t.box), `${where}: ${rail} meets ${t.text.text}`);
            }
          }

          // Every leader ends on its own curve point (the deck for a chip, the bottom for a reading)
          // and starts on its own label's edge, whichever way the label slid along its rail.
          const stations = blankAloneStations(bentFor(record, s), s, "imperial");
          layout.stations.forEach((st, i) => {
            const deck = layout.point(stations[i].x, stations[i].deck);
            const bottom = layout.point(stations[i].x, stations[i].bottom);
            check(Math.abs(st.chip.leader.curve.x - deck.x) < e && Math.abs(st.chip.leader.curve.y - deck.y) < e, `${where}: ${st.key} chip leader end`);
            check(Math.abs(st.reading.leader.curve.x - bottom.x) < e && Math.abs(st.reading.leader.curve.y - bottom.y) < e, `${where}: ${st.key} reading leader end`);
            for (const lab of [st.chip, st.reading]) {
              const { rail } = lab.leader;
              const b = lab.box;
              const within = rail.x >= b.x - e && rail.x <= b.x + b.width + e && rail.y >= b.y - e && rail.y <= b.y + b.height + e;
              const onEdge =
                Math.abs(rail.x - b.x) < e || Math.abs(rail.x - b.x - b.width) < e || Math.abs(rail.y - b.y) < e || Math.abs(rail.y - b.y - b.height) < e;
              check(within && onEdge, `${where}: ${st.key} leader start`);
            }
          });
        }
      }
      expect(problems).toEqual([]);
    });
  }
});
