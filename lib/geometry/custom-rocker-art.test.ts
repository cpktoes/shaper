import { describe, expect, it } from "vitest";
import { isPickable } from "@/lib/blanks/catalog";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import type { BlankRecord } from "./blank";
import { prepareBlank } from "./blank-fit";
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
  boardFrameOverlay,
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

describe("the board's frame reads the same lines off the side view", () => {
  for (const [label, s] of SPECS) {
    it(`${label}: shifted by the blank's start, read off the side view's own bottom and deck`, () => {
      const profile = designSideProfile({ ...LONGBOARD, blank: { ...LONGBOARD.blank, rocker: s } }, LIVE_DESIGN_RULES);
      const view = profile.blank!;
      const board = boardFrameOverlay(s, view);
      const own = blankFrameOverlay(s, view.onBlank.prepared);
      const L = view.record.lengthMm;
      // 41 stations along the blank, each read both ways.
      for (let i = 0; i <= 40; i++) {
        const x = (L * i) / 40;
        const k = own.natural.findIndex((pt) => Math.abs(pt.s - x) < 1e-6);
        if (k < 0) continue;
        expect(board.natural[k].s).toBeCloseTo(x + view.start, 9);
        expect(board.natural[k].h).toBeCloseTo(view.bottomAt(mm(x + view.start)) - bendAt(normalizeSpec(s, L), L, x), 6);
      }
      expect(board.spans.map((sp) => [sp.end, sp.order, sp.bottom.length])).toEqual(
        own.spans.map((sp) => [sp.end, sp.order, sp.bottom.length]),
      );
      board.spans.forEach((span, j) => {
        span.bottom.forEach((pt, k) => {
          expect(pt.s).toBeCloseTo(own.spans[j].bottom[k].s + view.start, 9);
          const deck = span.deck[k].h - pt.h;
          expect(deck).toBeCloseTo(view.deckAt(mm(pt.s)) - view.bottomAt(mm(pt.s)), 6);
        });
      });
      expect(board.bendMarks.map((m) => m.s)).toEqual(own.bendMarks.map((m) => m.s + view.start));
    });
  }
});

const PICKABLE: BlankRecord[] = readSeedCatalog().filter(isPickable);
const LONG_COPY = LONGBOARD.blank.copy;

describe("the blank alone: its own five stations, as ordered (P-11)", () => {
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
];

const LAYOUT_SPECS: [string, BlankRockerSpec | undefined][] = [
  ["natural", undefined],
  ['+2"N +2"T', spec(nose(2), tail(2))],
  ['-1"N24" +1/2"T', spec(nose(-1, 24), tail(0.5))],
];

const SAMPLE_COUNT = 120;

function layoutFor(record: BlankRecord, s: BlankRockerSpec | undefined, box: (typeof BOXES)[number]): BlankAloneLayout {
  const bent = withCustomRocker(prepareBlank(record), s);
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

describe("the blank-alone layout in Metric, where the station names run longer", () => {
  for (const box of BOXES) {
    it(`${box.name}: neighbours on each rail keep their air on every natural pickable blank`, () => {
      for (const record of PICKABLE) {
        const bent = prepareBlank(record);
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

describe("the blank-alone layout, on every pickable blank in three boxes", () => {
  it("reads every pickable blank", () => {
    expect(PICKABLE.length).toBe(219);
  });

  for (const box of BOXES) {
    it(`${box.name} (${box.width}×${box.height}, ${box.orientation})`, () => {
      for (const record of PICKABLE) {
        for (const [label, s] of LAYOUT_SPECS) {
          const where = `${record.vendor} ${record.name}, ${label}`;
          const layout = layoutFor(record, s, box);
          const L = record.lengthMm;
          expect(layout.scale, where).toBeGreaterThan(0);
          // One uniform scale: along and across alike.
          const tail0 = layout.point(0, 0);
          const nose0 = layout.point(L, 0);
          expect(Math.hypot(nose0.x - tail0.x, nose0.y - tail0.y), where).toBeCloseTo(L * layout.scale, 6);
          const up = layout.point(0, 100);
          expect(Math.hypot(up.x - tail0.x, up.y - tail0.y), where).toBeCloseTo(100 * layout.scale, 6);
          // Nose left lying flat, nose up standing.
          if (box.orientation === "horizontal") expect(nose0.x, where).toBeLessThan(tail0.x);
          else expect(nose0.y, where).toBeLessThan(tail0.y);

          // Everything inside the box.
          for (const p of layout.outline) expect(pointInside(p, box.width, box.height), `${where}: outline`).toBe(true);
          expect(pointInside(layout.baseline.from, box.width, box.height), where).toBe(true);
          expect(pointInside(layout.baseline.to, box.width, box.height), where).toBe(true);
          for (const t of layout.titles) expect(inside(t.box, box.width, box.height), `${where}: ${t.text.text}`).toBe(true);
          for (const st of layout.stations) {
            for (const label of [st.chip, st.reading]) {
              expect(inside(label.box, box.width, box.height), `${where}: ${st.key} box`).toBe(true);
              expect(pointInside(label.leader.rail, box.width, box.height), `${where}: ${st.key} leader`).toBe(true);
              expect(pointInside(label.leader.curve, box.width, box.height), `${where}: ${st.key} leader`).toBe(true);
            }
          }

          // On each rail, no two label boxes meet; no label meets a title.
          for (const rail of ["chip", "reading"] as const) {
            const boxes = layout.stations.map((st) => st[rail].box);
            for (let i = 0; i < boxes.length; i++) {
              for (let j = i + 1; j < boxes.length; j++) {
                expect(intersects(boxes[i], boxes[j], RAIL_GAP_PX),`${where}: ${rail} ${layout.stations[i].key} meets ${layout.stations[j].key}`).toBe(false);
              }
              for (const t of layout.titles) expect(intersects(boxes[i], t.box), `${where}: ${rail} meets ${t.text.text}`).toBe(false);
            }
          }

          // Every leader ends on its own curve point: the deck for a chip, the bottom for a reading.
          const bent = withCustomRocker(prepareBlank(record), s);
          const stations = blankAloneStations(bent, s, "imperial");
          layout.stations.forEach((st, i) => {
            const deck = layout.point(stations[i].x, stations[i].deck);
            const bottom = layout.point(stations[i].x, stations[i].bottom);
            expect(st.chip.leader.curve.x).toBeCloseTo(deck.x, 9);
            expect(st.chip.leader.curve.y).toBeCloseTo(deck.y, 9);
            expect(st.reading.leader.curve.x).toBeCloseTo(bottom.x, 9);
            expect(st.reading.leader.curve.y).toBeCloseTo(bottom.y, 9);
          });
        }
      }
    });
  }
});
