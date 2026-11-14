import { describe, expect, it, vi } from "vitest";
// Fitting a board file is slow work, and a busy machine (the whole suite at once) can stretch a case past the default five
// seconds: the cases here are generous rather than flaky. A case with its own, longer limit keeps it.
vi.setConfig({ testTimeout: 60_000 });
import { brdBottomStations, brdText } from "../export/brd";
import { brdFitLook, brdRailLines } from "../export/brd-fit-preview";
import { readAnyBrd } from "../export/brd-read";
import { brdBoardFields } from "../models/brd-board";
import { readBoardEntry } from "../models/board-file";
import { buildSnapshot } from "../models/design-snapshot";
import { phase16RailCharacterBoards } from "./__fixtures__/phase16-boards";
import type { P2 } from "./bezier-fit";
import { boardStringerLines, buildBoardSurface } from "./board-surface";
import { DEFAULT_BOTTOM, cutKind, resolveBottom, startingCut, type BoardBottom } from "./bottom";
import { ghostRail } from "./bottom-draw";
import { BRD_BOTTOM_WINDOW } from "./brd-bottom";
import {
  BRD_RAIL_NARROW_MIN_MM,
  BRD_RAIL_STRIP_MM,
  brdAnchorSections,
  brdOurRailHalf,
  brdRailBegins,
  brdRailBoard,
  brdRailGap,
  brdRailLineGap,
  brdRailRegion,
  brdRailWholeGap,
  brdRailWindows,
  brdRailsSpec,
  fitBrdRails,
  newBoardRailSetting,
  type BrdRailLine,
  type BrdRailSettings,
} from "./brd-rails";
import {
  designBottomBoard,
  designCrossSectionInput,
  designFinPlacement,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
  type DesignSummaryFields,
} from "./design";
import { buildOutline } from "./outline";
import {
  DEFAULT_RAIL_BAND_SPEC,
  RAIL_NUDGE_KEYS,
  RAIL_NUDGE_LIMIT_IN,
  RAIL_NUDGE_STEP_IN,
  RAIL_RATIO_RANGE,
  RAIL_SCALE_RANGE,
  deckProfileSliderStep,
  type RailBandSpec,
  type RailSectionSpec,
} from "./rail-bands";
import { inchesToMm, mm, mmToInches } from "./units";
import { boardSections } from "./volume";

/**
 * The rail fit (quick 261113-kvo). The measures are checked on made-up halves; the fit on boards with known rails, written by
 * the app's own `.brd` writer, read back and fitted by the whole look (`brdFitLook`): the round trip is the test with a known
 * answer.
 */

/* ============ made-up halves ============ */

/** A half section, stringer bottom first: a flat bottom out to 100, round a rail to the widest point at 110, back over a flat deck. */
function halfWith(change: (x: number, y: number, k: number) => [number, number] | null = () => null): P2[] {
  const points: P2[] = [];
  for (let x = 0; x <= 100; x += 1) points.push([x, 0]);
  for (let a = 0; a <= 90; a += 6) points.push([100 + 10 * Math.sin((a * Math.PI) / 180), 10 - 10 * Math.cos((a * Math.PI) / 180) + (a === 90 ? 0 : 0)]);
  for (let x = 110; x >= 0; x -= 1) points.push([x, 20 + (110 - x) * 0]);
  return points.map(([x, y], k) => change(x, y, k) ?? [x, y]);
}

describe("brdRailRegion", () => {
  it("is the outer 3 inches of the bottom, the widest point and the whole deck", () => {
    const half = halfWith();
    const region = brdRailRegion(half);
    const reach = 110;
    expect(BRD_RAIL_STRIP_MM).toBeCloseTo(inchesToMm(3), 9);
    // every point of the region is on the bottom run at least reach - 3" out, or past the widest point
    const apex = half.findIndex((p) => p[0] === reach);
    const first = half.indexOf(region[0]);
    expect(first).toBeLessThanOrEqual(apex);
    expect(region[0][0]).toBeGreaterThanOrEqual(reach - BRD_RAIL_STRIP_MM);
    expect(half[first - 1][0]).toBeLessThan(reach - BRD_RAIL_STRIP_MM);
    expect(region[region.length - 1]).toBe(half[half.length - 1]);
  });

  it("is empty for an empty half, and the whole half when it is narrower than the strip", () => {
    expect(brdRailRegion([])).toEqual([]);
    const narrow: P2[] = [[0, 0], [10, 0], [10, 5], [0, 5]];
    expect(brdRailRegion(narrow)).toEqual(narrow);
  });
});

describe("brdRailGap and brdRailWholeGap", () => {
  const file = halfWith();

  it("reads 0 for a half against itself", () => {
    const g = brdRailGap(file, file);
    expect(g.largest).toBeCloseTo(0, 9);
    expect(g.mean).toBeCloseTo(0, 9);
    expect(brdRailWholeGap(file, file).largest).toBeCloseTo(0, 9);
  });

  it("reads 2 for a half moved 2 mm up, the largest to 1e-9", () => {
    const up = file.map(([x, y]): P2 => [x, y + 2]);
    expect(brdRailGap(file, up).largest).toBeCloseTo(2, 9);
    expect(brdRailWholeGap(file, up).largest).toBeCloseTo(2, 9);
  });

  it("sees a difference on the bottom well in from the rail in the whole gap and not in the rail gap", () => {
    // 5 mm of dent at x = 10: more than 3 inches (76.2 mm) in from the widest point at 110
    const dented = file.map(([x, y], k): P2 => (k === 10 ? [x, y - 5] : [x, y]));
    expect(brdRailGap(file, dented).largest).toBeCloseTo(0, 9);
    expect(brdRailWholeGap(file, dented).largest).toBeGreaterThan(4.9);
  });

  it("says whether the largest gap is on the deck, at the rail or on the bottom, and how far in from the rail", () => {
    const bump = (where: (p: P2, k: number) => boolean, to: (p: P2) => P2) => file.map((p, k): P2 => (where(p, k) ? to(p) : p));
    const deckPoint = file.findIndex(([x, y]) => y === 20 && x === 60);
    const onDeck = brdRailGap(file, bump((_p, k) => k === deckPoint, ([x, y]) => [x, y + 6]));
    expect(onDeck.where).toBe("deck");
    expect(onDeck.inFromRail).toBeCloseTo(50, 1);
    expect(onDeck.largest).toBeCloseTo(6, 6);
    const bottomPoint = file.findIndex(([x, y]) => y === 0 && x === 60);
    const onBottom = brdRailGap(file, bump((_p, k) => k === bottomPoint, ([x, y]) => [x, y - 6]));
    expect(onBottom.where).toBe("bottom");
    expect(onBottom.inFromRail).toBeCloseTo(50, 1);
    const apex = file.findIndex(([x]) => x === 110);
    const atRail = brdRailGap(file, bump((_p, k) => k === apex, ([x, y]) => [x + 6, y]));
    expect(atRail.where).toBe("rail");
    expect(atRail.inFromRail).toBeCloseTo(0, 1);
  });
});

describe("brdAnchorSections", () => {
  const L = mm(1800);
  it("picks the section nearest the tail 12 inches, the middle and the nose 12 inches, each section once", () => {
    const stations = [100, 304, 700, 905, 1400, 1500].map((s) => ({ station: mm(s) }));
    const chosen = brdAnchorSections(stations, L);
    expect(chosen.tail?.station).toBe(304);
    expect(chosen.center?.station).toBe(905);
    expect(chosen.nose?.station).toBe(1500);
  });

  it("gives the nearest pair first and leaves a key with none when the file has too few sections", () => {
    const chosen = brdAnchorSections([{ station: mm(304) }, { station: mm(320) }], L);
    expect(chosen.tail?.station).toBe(304);
    expect(chosen.center?.station).toBe(320);
    expect(chosen.nose).toBeNull();
    expect(brdAnchorSections([], L)).toEqual({ nose: null, center: null, tail: null });
  });
});

describe("brdRailWindows", () => {
  const line = (reach: number): BrdRailLine => ({ station: mm(500), points: [[0, 0], [reach, 0], [reach, 30], [0, 40]] });
  it("never reads wider than nine-tenths, keeps today's window for a rail that begins 1/8 inch past that line, and narrows one that begins 1/2 inch past it", () => {
    const lines = [line(100), line(100), line(100)];
    const usual = BRD_BOTTOM_WINDOW * 100;
    const nine = 100 - usual;
    const { windows, narrowed } = brdRailWindows(lines, [mm(nine - 5), mm(nine + inchesToMm(1 / 8)), mm(nine + inchesToMm(1 / 2))]);
    expect(windows[0]).toBeUndefined();
    expect(windows[1]).toBeUndefined();
    expect(windows[2]).toBeCloseTo(usual - inchesToMm(1 / 2), 9);
    expect(narrowed).toBe(true);
    expect(BRD_RAIL_NARROW_MIN_MM).toBeCloseTo(inchesToMm(1 / 4), 9);
    expect(brdRailWindows(lines.slice(0, 2), [mm(nine), mm(nine + inchesToMm(1 / 8))]).narrowed).toBe(false);
  });
});

/* ============ round trips: boards with known rails, written, read back, fitted ============ */

const stock = phase16RailCharacterBoards().find((b) => b.label === "stock|hard")!.fields;
const n16 = (n: number) => inchesToMm(n / 16);
const withRails = (f: DesignSummaryFields, change: (r: RailBandSpec) => RailBandSpec): DesignSummaryFields => ({ ...f, rails: change(f.rails) });
const sec = (s: RailSectionSpec, ch: Partial<RailSectionSpec>): RailSectionSpec => ({ ...s, ...ch });
const all3 = (r: RailBandSpec, ch: Partial<RailSectionSpec>): RailBandSpec => ({ ...r, nose: sec(r.nose, ch), center: sec(r.center, ch), tail: sec(r.tail, ch) });

interface Case {
  name: string;
  fields: DesignSummaryFields;
  bottom?: (b: ReturnType<typeof designBottomBoard>) => BoardBottom;
  /** Every rail's boxes come back exactly the written ones (the others may draw the same rail by other settings). */
  exact: boolean;
}
const CASES: Case[] = [
  { name: "H1 the new board's rails", fields: stock, exact: true },
  { name: "H2 Hard Edge off", fields: withRails(stock, (r) => ({ ...r, tailHardEdge: false })), exact: true },
  { name: "H3 centre Deck Profile 85%", fields: withRails(stock, (r) => ({ ...r, center: sec(r.center, { deckPercent: 85 }) })), exact: true },
  { name: "H4 Symmetrical 50/50 everywhere, Hard Edge off (a log's rail)", fields: withRails(stock, (r) => ({ ...all3(r, { symmetrical: true, ratioTopPercent: 50 }), tailHardEdge: false })), exact: false },
  { name: "H5 tail Single Tuck and Sharp Bottom Tuck, Hard Edge off", fields: withRails(stock, (r) => ({ ...r, tailHardEdge: false, tail: sec(r.tail, { singleTuck: true, sharpBottomTuck: true }) })), exact: true },
  { name: "H6 nose 70/30, Family 1", fields: withRails(stock, (r) => ({ ...r, nose: sec(r.nose, { ratioTopPercent: 70, family: 1 }) })), exact: false },
  {
    name: "H7 centre 90%, Deck Mark 1 +1/4, Domed Deck Band +1, Bottom Tuck 3 -1/4",
    fields: withRails(stock, (r) => ({ ...r, center: sec(r.center, { deckPercent: 90, nudges: { ...r.center.nudges, deckMark1: n16(4), domedDeckBand: n16(16), bottomTuck3: n16(-4) } }) })),
    exact: false,
  },
  {
    name: "H8 a 1/4 Deep Single Concave",
    fields: stock,
    bottom: (b) => ({ ...structuredClone(DEFAULT_BOTTOM), center: { ...startingCut("center", "Deep Single Concave", b), depth: n16(4) } }),
    exact: true,
  },
  {
    name: "H9 a 3/16 Panel Vee tail",
    fields: stock,
    bottom: (b) => ({ ...structuredClone(DEFAULT_BOTTOM), tail: { ...startingCut("tail", "Panel Vee", b), depth: n16(3) } }),
    exact: true,
  },
  { name: "H10 50/50 and 80% everywhere", fields: withRails(stock, (r) => all3(r, { ratioTopPercent: 50, deckPercent: 80 })), exact: true },
];

/** The board written by the app's own writer and read back. */
function writtenAndRead(c: Case) {
  const f = c.fields;
  const geometry = buildOutline(f.outline);
  const profile = designSideProfile(f, LIVE_DESIGN_RULES);
  const effective = deriveEffectiveRails(f.rails, profile.effectiveFoil, f.railsImportFoilThickness);
  const board0 = designBottomBoard(f.outline, geometry, profile, designFinPlacement(f));
  const bottom = c.bottom ? c.bottom(board0) : null;
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, effective, f.outline.length, bottom ? { bottom, board: board0 } : undefined),
    geometry,
    rockerAt: profile.rockerAt,
  });
  const text = brdText(surface, bottom ? { bottomStations: brdBottomStations(resolveBottom(bottom, board0)) } : {}).text;
  const read = readAnyBrd(Uint8Array.from(text, (ch) => ch.charCodeAt(0)));
  if (!read.ok) throw new Error("the app's own file would not read");
  return read.board;
}

/** A rail value: the largest of the sections' largest gaps plus the mean of their means (the fit's own bar). */
function railValue(lines: readonly BrdRailLine[], board: ReturnType<typeof brdRailBoard>, rails: RailBandSpec): number {
  let largest = 0;
  let sum = 0;
  for (const line of lines) {
    const gap = brdRailLineGap(line, brdOurRailHalf(board, rails, line.station));
    largest = Math.max(largest, gap.largest);
    sum += gap.mean;
  }
  return largest + sum / lines.length;
}

const results = CASES.map((c) => {
  const file = writtenAndRead(c);
  const look = brdFitLook(file);
  return { c, file, look };
});

/* ============ the board the rails are measured on ============ */


/** The stock 6'0" board's own fit, as the whole look made it from the written H1 file. */
const stockFit = results[0].look.fit;

describe("brdRailBoard", () => {
  it("is the board brdBoardFields opens: half width, thickness and the bottom's foam off agree at 50 stations", () => {
    const concave: BoardBottom = (() => {
      const base = designBottomBoard(
        stockFit.outline,
        buildOutline(stockFit.outline),
        designSideProfile({ outline: stockFit.outline, rocker: stockFit.rocker, foil: stockFit.foil, blank: null }, LIVE_DESIGN_RULES),
        designFinPlacement({ outline: stockFit.outline }),
      );
      return { ...structuredClone(DEFAULT_BOTTOM), center: { ...startingCut("center", "Deep Single Concave", base), depth: inchesToMm(4 / 16) } };
    })();
    for (const bottom of [null, concave]) {
      const board = brdRailBoard(stockFit, bottom);
      const opened = brdBoardFields(stockFit, "x.brd", bottom)!;
      const geometry = buildOutline(opened.outline);
      const profile = designSideProfile(opened, LIVE_DESIGN_RULES);
      const placed = designBottomBoard(opened.outline, geometry, profile, designFinPlacement(opened));
      const input = designCrossSectionInput(geometry, profile, opened.rails, opened.outline.length, opened.bottom ? { bottom: opened.bottom, board: placed } : undefined);
      expect(board.length).toBe(opened.outline.length);
      expect(board.foil).toEqual(profile.effectiveFoil);
      for (let i = 1; i < 50; i++) {
        const station = mm((board.length * i) / 50);
        expect(board.input.halfWidthAt(station)).toBeCloseTo(input.halfWidthAt(station), 9);
        expect(board.input.thicknessAt!(station)).toBeCloseTo(input.thicknessAt!(station), 9);
        const across = mm(board.input.halfWidthAt(station) / 2);
        if (input.foamOffAt) expect(board.input.foamOffAt!(station, across)).toBeCloseTo(input.foamOffAt(station, across), 9);
        else expect(board.input.foamOffAt).toBeUndefined();
      }
    }
  });
});

describe("brdOurRailHalf", () => {
  it("is the ring the litres and the 3D board read, stringer bottom first and lowered to the stringer bottom", () => {
    const board = brdRailBoard(stockFit, null);
    const rails: RailBandSpec = { ...DEFAULT_RAIL_BAND_SPEC, tailHardEdge: false, center: { ...DEFAULT_RAIL_BAND_SPEC.center, deckPercent: 85 } };
    for (const fraction of [0.2, 0.5, 0.8]) {
      const station = mm(board.length * fraction);
      const half = brdOurRailHalf(board, rails, station);
      const ring = ghostRail(boardSections({ ...board.input, rails }, [station]), station)!;
      expect(half).toHaveLength(ring.length);
      const base = ring[ring.length - 1][1];
      ring.forEach(([x, y], k) => {
        const [hx, hy] = half[ring.length - 1 - k];
        expect(hx).toBeCloseTo(x, 9);
        expect(hy).toBeCloseTo(y - base, 9);
      });
      expect(half[0][1]).toBe(0);
    }
  });
});

/* ============ every value on its control's step ============ */

describe("brdRailsSpec", () => {
  const settings: BrdRailSettings = {
    nose: { ...newBoardRailSetting("nose"), scale: 0.85, symmetrical: true },
    center: { ...newBoardRailSetting("center"), ratio: 55.5, deckPercent: 87.5, scale: 0.7 },
    tail: { ...newBoardRailSetting("tail"), hardEdge: true, symmetrical: true, singleTuck: true },
  };
  it("is a new board's section with the fitted controls, the foil's thickness, the centre's scale 1 and no Symmetrical under a Hard Edge", () => {
    const rails = brdRailsSpec(settings, stockFit.foil);
    expect(rails.nose.boardThickness).toBe(stockFit.foil.nose12);
    expect(rails.center.boardThickness).toBe(stockFit.foil.center);
    expect(rails.tail.boardThickness).toBe(stockFit.foil.tail12);
    expect(rails.nose.scaleFromCenter).toBe(0.85);
    expect(rails.center.scaleFromCenter).toBe(1);
    expect(rails.center.ratioTopPercent).toBe(55.5);
    expect(rails.tailHardEdge).toBe(true);
    expect(rails.tail.symmetrical).toBe(false);
    expect(rails.tail.singleTuck).toBe(false);
    expect(rails.nose.cornerCutOffsetOverride).toBe(DEFAULT_RAIL_BAND_SPEC.nose.cornerCutOffsetOverride);
    expect(rails.tailHardEdgeBlendsFrom).toBeUndefined();
    expect(rails.tailHardEdgeEndsAt).toBeUndefined();
  });

  it("a new board's settings come back as a new board's rails, to the foil's thickness", () => {
    const fresh = { nose: newBoardRailSetting("nose"), center: newBoardRailSetting("center"), tail: newBoardRailSetting("tail") };
    const rails = brdRailsSpec(fresh, stockFit.foil);
    for (const key of ["nose", "center", "tail"] as const) expect({ ...rails[key], boardThickness: 0 }).toEqual({ ...DEFAULT_RAIL_BAND_SPEC[key], boardThickness: 0 });
    expect(rails.tailHardEdge).toBe(DEFAULT_RAIL_BAND_SPEC.tailHardEdge);
  });
});

describe("round trips: boards with known rails come back from the whole look", () => {
  for (const { c, file, look } of results) {
    describe(c.name, () => {
      const rails = look.rails!;
      const { lines } = brdRailLines(file);
      const board = brdRailBoard(look.fit, look.bottom!.bottom);
      const written = deriveEffectiveRails(c.fields.rails, look.fit.foil, true);

      it("fits rails no more than 0.2 mm above the written rails' own figure on the same read-back board", () => {
        expect(rails).not.toBeNull();
        const fitted = railValue(lines, board, rails.rails);
        expect(fitted).toBeLessThanOrEqual(railValue(lines, board, written) + 0.2);
        expect(rails.closeness.largest + rails.closeness.typical).toBeCloseTo(fitted, 6);
      });

      it("keeps every value inside its control's range and on its step, and never Symmetrical or a tuck under a Hard Edge", () => {
        for (const key of ["nose", "center", "tail"] as const) {
          const s = rails.settings[key];
          expect(s.ratio).toBeGreaterThanOrEqual(RAIL_RATIO_RANGE.min);
          expect(s.ratio).toBeLessThanOrEqual(RAIL_RATIO_RANGE.max);
          expect(Math.abs(s.ratio / RAIL_RATIO_RANGE.step - Math.round(s.ratio / RAIL_RATIO_RANGE.step))).toBeLessThan(1e-9);
          expect(s.deckPercent).toBeGreaterThanOrEqual(75 - 1e-9);
          expect(s.deckPercent).toBeLessThanOrEqual(100);
          const step = deckProfileSliderStep(mmToInches(look.fit.foil[key === "nose" ? "nose12" : key === "tail" ? "tail12" : "center"]));
          expect(Math.abs((100 - s.deckPercent) / step - Math.round((100 - s.deckPercent) / step))).toBeLessThan(1e-6);
          expect([1, 2, 3, 4, 5]).toContain(s.family);
          expect(s.scale).toBeGreaterThanOrEqual(RAIL_SCALE_RANGE.min - 1e-9);
          expect(s.scale).toBeLessThanOrEqual(RAIL_SCALE_RANGE.max + 1e-9);
          expect(Math.abs(s.scale / RAIL_SCALE_RANGE.step - Math.round(s.scale / RAIL_SCALE_RANGE.step))).toBeLessThan(1e-9);
          if (key === "center") expect(s.scale).toBe(1);
          for (const nudge of RAIL_NUDGE_KEYS) {
            const inches = mmToInches(s.nudges[nudge]);
            expect(Math.abs(inches)).toBeLessThanOrEqual(RAIL_NUDGE_LIMIT_IN[nudge] + 1e-9);
            expect(Math.abs(inches / RAIL_NUDGE_STEP_IN - Math.round(inches / RAIL_NUDGE_STEP_IN))).toBeLessThan(1e-9);
          }
          if (key === "tail" && s.hardEdge) expect(rails.rails.tail.symmetrical || rails.rails.tail.singleTuck || rails.rails.tail.sharpBottomTuck).toBe(false);
          if (key !== "tail") expect(s.hardEdge).toBe(false);
        }
      });

      if (c.exact) {
        it("brings back every rail's boxes exactly, Ratio within 2.5 and Deck Profile within 2 steps", () => {
          for (const key of ["nose", "center", "tail"] as const) {
            const s = rails.settings[key];
            const truth = c.fields.rails[key];
            expect(s.symmetrical).toBe(truth.symmetrical);
            expect(s.singleTuck).toBe(truth.singleTuck);
            expect(s.sharpBottomTuck).toBe(truth.sharpBottomTuck);
            expect(Math.abs(s.ratio - truth.ratioTopPercent)).toBeLessThanOrEqual(2.5);
            const step = deckProfileSliderStep(mmToInches(look.fit.foil[key === "nose" ? "nose12" : key === "tail" ? "tail12" : "center"]));
            expect(Math.abs(s.deckPercent - truth.deckPercent) / step).toBeLessThanOrEqual(2 + 1e-9);
          }
          expect(rails.settings.tail.hardEdge).toBe(c.fields.rails.tailHardEdge);
        });
      }
    });
  }

  it("H1 reads bottom-first with no window narrowed, and the nose's scale (the one thing a hair of rail cannot see) 0.95", () => {
    const { look } = results[0];
    expect(look.rails!.order).toBe("bottom-first");
    expect(look.rails!.narrowed).toBe(false);
    expect(look.rails!.settings.center.scale).toBe(1);
  });

  it("H4 (a log's soft 50/50 rail) goes rails-first: a flat bottom in every section and Symmetrical rails near 50/50", () => {
    const { look } = results[3];
    expect(look.rails!.order).toBe("rails-first");
    expect(look.rails!.narrowed).toBe(true);
    for (const key of ["nose", "center", "tail"] as const) {
      expect(cutKind(look.bottom!.bottom[key].name)).toBe("flat");
      expect(look.rails!.settings[key].symmetrical).toBe(true);
      expect(Math.abs(look.rails!.settings[key].ratio - 50)).toBeLessThanOrEqual(2.5);
    }
  });

  it("H8 brings the written bottom back: a single concave 4 steps deep in the centre, and no other cut", () => {
    const { look } = results[7];
    expect(cutKind(look.bottom!.bottom.center.name)).toBe("single");
    expect(Math.round(look.bottom!.bottom.center.depth / n16(1))).toBe(4);
    expect(cutKind(look.bottom!.bottom.nose.name)).toBe("flat");
    expect(cutKind(look.bottom!.bottom.tail.name)).toBe("flat");
  });

  it("the rails ride in the opened board and read back deep-equal through the board reader (H5: the tail's Single and Sharp ticked)", () => {
    const { look } = results[4];
    const fields = brdBoardFields(look.fit, "h5.brd", look.bottom?.bottom ?? null, look.rails!.rails)!;
    expect(fields).not.toBeNull();
    const back = readBoardEntry({ name: fields.boardName, design: buildSnapshot(fields) }, {})!.fields;
    expect(back.rails).toEqual(look.rails!.rails);
    expect(back.rails.tail.singleTuck).toBe(true);
    expect(back.rails.tail.sharpBottomTuck).toBe(true);
    expect(back.rails.tailHardEdge).toBe(false);
  });
});

describe("fitBrdRails", () => {
  it("polishes from given settings with the boxes and Family held, and never moves a box", () => {
    const { file, look } = results[4];
    const { lines } = brdRailLines(file);
    const board = brdRailBoard(look.fit, look.bottom!.bottom);
    const from = look.rails!.settings;
    const again = fitBrdRails(lines, board, from);
    for (const key of ["nose", "center", "tail"] as const) {
      expect(again[key].family).toBe(from[key].family);
      expect(again[key].symmetrical).toBe(from[key].symmetrical);
      expect(again[key].singleTuck).toBe(from[key].singleTuck);
      expect(again[key].sharpBottomTuck).toBe(from[key].sharpBottomTuck);
      expect(again[key].hardEdge).toBe(from[key].hardEdge);
    }
  });

  it("gives a new board's rails for an anchor the file has no section near", () => {
    const { file, look } = results[0];
    const { lines } = brdRailLines(file);
    const board = brdRailBoard(look.fit, look.bottom!.bottom);
    const one = fitBrdRails([lines[Math.floor(lines.length / 2)]], board);
    const fresh = { nose: newBoardRailSetting("nose"), center: newBoardRailSetting("center"), tail: newBoardRailSetting("tail") };
    const empty = fitBrdRails([], board);
    expect(empty).toEqual(fresh);
    expect(Object.values(one).filter((s, k) => JSON.stringify(s) === JSON.stringify(Object.values(fresh)[k])).length).toBeGreaterThanOrEqual(2);
  });
});

describe("brdRailBegins", () => {
  it("is how far in from the widest point a fitted rail meets a flat bottom: small for a boxy rail, larger for a rolled one", () => {
    const { look } = results[0];
    const rolled = results[3].look;
    const stations = [mm(inchesToMm(36))];
    const boxy = brdRailBegins(look.fit, look.rails!.rails, stations)[0];
    const soft = brdRailBegins(rolled.fit, rolled.rails!.rails, stations)[0];
    expect(boxy).toBeGreaterThan(0);
    expect(soft).toBeGreaterThan(boxy);
  });
});

/* ============ R5: fitting rails never moves the stringer ============ */

describe("the stringer (R5)", () => {
  for (const index of [0, 3, 7]) {
    const { c, look } = results[index];
    it(`${c.name}: the 3D board's stringer lines with the fitted rails equal those with a new board's rails, to 0.01 mm`, () => {
      const stringer = (rails: RailBandSpec) => {
        const f = brdBoardFields(look.fit, "x.brd", look.bottom?.bottom ?? null, rails)!;
        const geometry = buildOutline(f.outline);
        const profile = designSideProfile(f, LIVE_DESIGN_RULES);
        const effective = deriveEffectiveRails(f.rails, profile.effectiveFoil, f.railsImportFoilThickness);
        const board = designBottomBoard(f.outline, geometry, profile, designFinPlacement(f));
        const surface = buildBoardSurface({
          sections: designCrossSectionInput(geometry, profile, effective, f.outline.length, f.bottom ? { bottom: f.bottom, board } : undefined),
          geometry,
          rockerAt: profile.rockerAt,
        });
        return boardStringerLines(surface);
      };
      const fitted = stringer(look.rails!.rails);
      const fresh = stringer(DEFAULT_RAIL_BAND_SPEC);
      let shared = 0;
      const rings = Math.min(fitted.deck.length, fresh.deck.length);
      for (let i = 0; i < rings; i++) {
        if (Math.abs(fitted.deck[i][0] - fresh.deck[i][0]) > 1e-9) continue;
        shared++;
        expect(Math.abs(fitted.deck[i][2] - fresh.deck[i][2])).toBeLessThan(0.01);
        expect(Math.abs(fitted.bottom[i][2] - fresh.bottom[i][2])).toBeLessThan(0.01);
      }
      expect(shared).toBeGreaterThan(20);
    });
  }
});
