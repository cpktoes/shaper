import { describe, expect, it, vi } from "vitest";
// Fitting a board file is slow work, and a busy machine (the whole suite at once) can stretch a case past the default five
// seconds: the cases here are generous rather than flaky. A case with its own, longer limit keeps it.
vi.setConfig({ testTimeout: 60_000 });
import { brdBottomStations, brdText } from "../export/brd";
import { readAnyBrd } from "../export/brd-read";
import { brdBoardFields } from "../models/brd-board";
import { phase16Boards } from "./__fixtures__/phase16-boards";
import type { P2 } from "./bezier-fit";
import { bottomStationSlider } from "./blank-reasons";
import { buildBoardSurface } from "./board-surface";
import {
  BOTTOM_CUT_NAMES,
  BOTTOM_MARK_RANGES_IN,
  BOTTOM_MARK_STEP_IN,
  DEFAULT_BOTTOM,
  cutKind,
  keepStationsInOrder,
  resolveBottom,
  resolveCut,
  sectionsFoamOff,
  startingCut,
  stationFromNearestTip,
  storeCutStation,
  type BoardBottom,
  type BottomBoard,
  type BottomCutName,
  type BottomCutSpec,
  type BottomSectionKey,
} from "./bottom";
import {
  BRD_BOTTOM_ACROSS_STEPS,
  BRD_BOTTOM_BELLY_SHARE,
  BRD_BOTTOM_BLEND_MAX_IN,
  BRD_BOTTOM_FLAT_MM,
  BRD_BOTTOM_WINDOW,
  brdBottomBlends,
  brdBottomFromPicks,
  brdBottomScorer,
  brdBottomSections,
  brdFittedBottomBoard,
  brdStringerLift,
  fitBottomToBrd,
  measureBrdBottom,
  readBrdBottom,
  type BrdBottomSection,
  type BrdBottomTarget,
  type BrdSectionLine,
} from "./brd-bottom";
import { BRD_FIT_TIP_SKIP_MM, fitBoardToBrd } from "./brd-fit";
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
import { inchesToMm, mm, mmToInches } from "./units";

/**
 * The .brd bottom fit (quick 261113-gwr). Every expected figure comes from the app's own functions (Rule 1): a board with a
 * known bottom is written by the app's own `.brd` writer, read back and fitted, and must come back as that bottom. Each case
 * is one fit of a few hundred milliseconds, so each carries its own generous limit.
 */

const LONG = 120_000;
const BOARDS = phase16Boards();
const fieldsOf = (label: string): DesignSummaryFields => {
  const found = BOARDS.find((b) => b.label === label);
  if (!found) throw new Error(`no board ${label}`);
  return found.fields;
};

/** A board of the app's own, ready to be written with any bottom. */
function builder(label: string) {
  const fields = fieldsOf(label);
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const board = designBottomBoard(fields.outline, geometry, profile, designFinPlacement(fields));
  const write = (bottom: BoardBottom): string => {
    const surface = buildBoardSurface({
      sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length, { bottom, board }),
      geometry,
      rockerAt: profile.rockerAt,
    });
    return brdText(surface, { bottomStations: brdBottomStations(resolveBottom(bottom, board)) }).text;
  };
  return { fields, board, write };
}

const SHORT = builder("shortboard|asis|hard");
const MID = builder("midlength|asis|hard");

/** A written file, read back, its side fit made, and its bottom fitted: what Open a board file does. */
function fitText(text: string) {
  const read = readAnyBrd(Uint8Array.from(text, (ch) => ch.charCodeAt(0)));
  if (!read.ok) throw new Error("the app's own file would not read");
  const b = read.board;
  const fit = fitBoardToBrd({ length: b.length, outline: b.outline, bottom: b.bottom, deck: b.deck });
  const board = brdFittedBottomBoard(fit);
  const found = fitBottomToBrd(b.sections, board);
  if (!found) throw new Error("no bottom found");
  return { read: b, fit, board, found };
}

const withCuts = (cuts: Partial<Record<BottomSectionKey, BottomCutSpec>>): BoardBottom => ({ ...structuredClone(DEFAULT_BOTTOM), ...cuts });

describe("readBrdBottom", () => {
  const across = Array.from({ length: BRD_BOTTOM_ACROSS_STEPS + 1 }, (_, j) => j);
  const shape = (f: (u: number) => number) => across.map((j) => f(j / BRD_BOTTOM_ACROSS_STEPS));

  it("calls every value within 1 mm flat, depth 0", () => {
    expect(readBrdBottom(across, shape(() => 0.9))).toEqual({ kind: "flat", depth: 0 });
    expect(readBrdBottom(across, shape((u) => (u < 0.5 ? -0.8 : 0.8)))).toEqual({ kind: "flat", depth: 0 });
  });

  it("reads a straight rise as a vee of its rise, a cosine rise as a belly", () => {
    expect(readBrdBottom(across, shape((u) => 3 * u))).toEqual({ kind: "vee", depth: 3 });
    const belly = readBrdBottom(across, shape((u) => 3 * (1 - Math.cos((Math.PI * u) / 2))));
    expect(belly.kind).toBe("belly");
    expect(belly.depth).toBeCloseTo(3, 9);
    expect(0.28).toBeLessThan(BRD_BOTTOM_BELLY_SHARE);
  });

  it("reads a fall as a single concave of its depth, and a rise then a fall as a double of its top", () => {
    expect(readBrdBottom(across, shape((u) => -4 * u))).toEqual({ kind: "single", depth: 4 });
    const double = readBrdBottom(across, shape((u) => (u <= 0.625 ? (2.5 * u) / 0.625 : 2.5 - (2 * (u - 0.625)) / 0.375)));
    expect(double.kind).toBe("double");
    expect(double.depth).toBeCloseTo(2.5, 9);
  });
});

describe("brdBottomSections", () => {
  const L = mm(1000);
  /** A section from the stringer: its bottom height at each x, then up the rail to a deck. */
  const section = (station: number, height: (x: number) => number, reach = 100): BrdSectionLine => ({
    station: mm(station),
    points: [...Array.from({ length: 21 }, (_, k): P2 => [(reach * k) / 20, height((reach * k) / 20)]), [reach, 30], [reach / 2, 60], [0, 60]],
  });

  it("leaves out a section within the skipped inch of a tip, and keeps one at exactly 25.4 mm", () => {
    const found = brdBottomSections([section(10, () => 0), section(25.4, () => 0), section(500, () => 0), section(985, () => 0), section(1000 - 25.4, () => 0)], L);
    expect(found.map((s) => s.station)).toEqual([25.4, 500, 1000 - 25.4]);
    expect(BRD_FIT_TIP_SKIP_MM).toBeCloseTo(25.4, 9);
  });

  it("reads the widest reach, and the window from the stringer to 9/10 of it in 24 steps", () => {
    const [s] = brdBottomSections([section(500, () => 0, 120)], L);
    expect(s.reach).toBeCloseTo(120, 9);
    expect(s.across).toHaveLength(BRD_BOTTOM_ACROSS_STEPS + 1);
    expect(s.across[0]).toBe(0);
    expect(s.across[BRD_BOTTOM_ACROSS_STEPS]).toBeCloseTo(BRD_BOTTOM_WINDOW * 120, 9);
    expect(s.across[1]).toBeCloseTo((BRD_BOTTOM_WINDOW * 120) / BRD_BOTTOM_ACROSS_STEPS, 9);
  });

  it("calls a section straying 0.9 mm flat and one straying 1.1 mm not", () => {
    const [a, b] = brdBottomSections([section(300, (x) => (0.9 * x) / 100), section(600, (x) => (1.1 * x) / 90)], L);
    expect(a.flat).toBe(true);
    expect(a.reads.kind).toBe("flat");
    expect(b.flat).toBe(false);
    expect(b.reads.kind).toBe("vee");
    expect(BRD_BOTTOM_FLAT_MM).toBe(1);
  });

  it("measures the height against the height at the stringer, and drops a section with no width or one point", () => {
    const lifted: BrdSectionLine = { station: mm(500), points: [[0, 5], [50, 5], [100, 7], [100, 40]] };
    const [s] = brdBottomSections([lifted, { station: mm(400), points: [[0, 0]] }, { station: mm(450), points: [[0, 0], [0, 10]] }], L);
    expect(s.file[0]).toBe(0);
    expect(s.file[BRD_BOTTOM_ACROSS_STEPS]).toBeCloseTo(((7 - 5) * (BRD_BOTTOM_WINDOW * 100 - 50)) / 50, 9);
  });
});

describe("brdBottomSections with a window per section (quick 261113-kvo)", () => {
  const L = mm(1000);
  const section = (station: number, reach = 100): BrdSectionLine => ({
    station: mm(station),
    points: [...Array.from({ length: 21 }, (_, k): P2 => [(reach * k) / 20, (0.3 * reach * k) / 20 / 20]), [reach, 30], [reach / 2, 60], [0, 60]],
  });

  it("with no windows, or windows that are all undefined, reads exactly as before, and stores the nine-tenths window", () => {
    const sections = [section(200), section(500, 120)];
    const plain = brdBottomSections(sections, L);
    expect(brdBottomSections(sections, L, [])).toEqual(plain);
    expect(brdBottomSections(sections, L, [undefined, undefined])).toEqual(plain);
    expect(plain.map((s) => s.window)).toEqual([BRD_BOTTOM_WINDOW * 100, BRD_BOTTOM_WINDOW * 120].map((w) => expect.closeTo(w, 9)));
  });

  it("reads a section with its own window out to that window in 24 steps, and keeps the others' nine-tenths", () => {
    const [a, b] = brdBottomSections([section(200), section(500)], L, [mm(60), undefined]);
    expect(a.window).toBe(60);
    expect(a.across).toHaveLength(BRD_BOTTOM_ACROSS_STEPS + 1);
    expect(a.across[BRD_BOTTOM_ACROSS_STEPS]).toBeCloseTo(60, 9);
    expect(a.reach).toBeCloseTo(100, 9);
    expect(b.across[BRD_BOTTOM_ACROSS_STEPS]).toBeCloseTo(BRD_BOTTOM_WINDOW * 100, 9);
  });

  it("is never wider than nine-tenths of the reach, and takes windows by the section's place in the list even when one is dropped", () => {
    const [wide] = brdBottomSections([section(200)], L, [mm(99)]);
    expect(wide.window).toBeCloseTo(BRD_BOTTOM_WINDOW * 100, 9);
    // The first is within the skipped inch and is dropped: the second window still belongs to the second section.
    const [kept] = brdBottomSections([section(5), section(500)], L, [mm(10), mm(50)]);
    expect(kept.station).toBe(500);
    expect(kept.window).toBe(50);
  });

  it("blends the windows as it blends the reaches, and keeps today's blend where nothing narrowed", () => {
    const [a, b] = brdBottomSections([section(inchesToMm(10), 100), section(inchesToMm(30), 140)], mm(inchesToMm(120)), [mm(40), mm(100)]);
    const out = brdBottomBlends([a, b]);
    [1, 2, 3].forEach((k) => {
      const t = k / 4;
      expect(out[k].across[BRD_BOTTOM_ACROSS_STEPS]).toBeCloseTo(40 + t * 60, 9);
    });
    const [c, d] = brdBottomSections([section(inchesToMm(10), 100), section(inchesToMm(30), 140)], mm(inchesToMm(120)));
    const plain = brdBottomBlends([c, d]);
    [1, 2, 3].forEach((k) => expect(plain[k].across[BRD_BOTTOM_ACROSS_STEPS]).toBeCloseTo(BRD_BOTTOM_WINDOW * (100 + (k / 4) * 40), 12));
  });
});

describe("brdBottomBlends", () => {
  const L = mm(inchesToMm(120));
  const flat = (station: number): BrdBottomSection => brdBottomSections([{ station: mm(station), points: [[0, 0], [100, 0], [100, 30]] }], L)[0];
  const vee = (station: number, reach: number, rise: number): BrdBottomSection =>
    brdBottomSections([{ station: mm(station), points: [[0, 0], [reach, rise], [reach, rise + 30]] }], L)[0];

  it("puts blends at every 5 inches between two sections 20 inches apart: ceil(20 / 6) = 4 spaces", () => {
    const a = vee(inchesToMm(10), 100, 4);
    const b = vee(inchesToMm(30), 140, 8);
    const out = brdBottomBlends([a, b]);
    expect(out).toHaveLength(2 + 3);
    expect(out.map((t) => mmToInches(t.station))).toEqual([10, 15, 20, 25, 30].map((x) => expect.closeTo(x, 9)));
    const targetA = a.file;
    const targetB = b.file;
    [1, 2, 3].forEach((k) => {
      const t = k / 4;
      const blend = out[k];
      expect(blend.across[BRD_BOTTOM_ACROSS_STEPS]).toBeCloseTo((BRD_BOTTOM_WINDOW * (100 + t * 40) * BRD_BOTTOM_ACROSS_STEPS) / BRD_BOTTOM_ACROSS_STEPS, 9);
      blend.target.forEach((v, j) => expect(v).toBeCloseTo((1 - t) * targetA[j] + t * targetB[j], 9));
    });
    expect(out[0].target).toEqual(targetA);
    expect(out[4].target).toEqual(targetB);
  });

  it("blends two flat sections flat, adds none within 6 inches, and none beyond the first and last section", () => {
    const flats = brdBottomBlends([flat(inchesToMm(10)), flat(inchesToMm(30))]);
    expect(flats).toHaveLength(5);
    for (const t of flats) expect(t.target.every((v) => v === 0)).toBe(true);
    expect(brdBottomBlends([flat(inchesToMm(10)), flat(inchesToMm(10 + BRD_BOTTOM_BLEND_MAX_IN))])).toHaveLength(2);
    expect(brdBottomBlends([flat(inchesToMm(10))])).toHaveLength(1);
    expect(brdBottomBlends([])).toEqual([]);
  });
});

describe("brdFittedBottomBoard", () => {
  it("is the board Open as a Board opens: the same readers as designBottomBoard of its fields", () => {
    const { read, fit } = fitText(SHORT.write(DEFAULT_BOTTOM));
    expect(read.sections.length).toBeGreaterThan(10);
    const fields = brdBoardFields(fit, "x.brd")!;
    const opened = designBottomBoard(fields.outline, buildOutline(fields.outline), designSideProfile(fields, LIVE_DESIGN_RULES), designFinPlacement(fields));
    const ours = brdFittedBottomBoard(fit);
    expect(ours.length).toBeCloseTo(opened.length, 9);
    expect(ours.widePoint).toBeCloseTo(opened.widePoint, 9);
    expect(ours.widePointWidth).toBeCloseTo(opened.widePointWidth, 9);
    expect(ours.frontFins).toBeCloseTo(opened.frontFins, 9);
    expect(ours.toeDegrees).toBeCloseTo(opened.toeDegrees, 9);
    for (let i = 0; i <= 50; i++) {
      const s = mm((opened.length * i) / 50);
      expect(ours.railAt(s)).toBeCloseTo(opened.railAt(s), 9);
      expect(ours.thicknessAt(s)).toBeCloseTo(opened.thicknessAt(s), 9);
    }
  });
});

describe("the fast form of a cut is exact", () => {
  // A seeded generator, so the 200 bottoms are the same every run.
  const random = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rnd = random(2611);
  const board = SHORT.board;
  const L = board.length;
  const grid = bottomStationSlider(mm(0), L, "imperial");
  const nGrid = Math.round((grid.max - grid.min) / grid.step);
  const stations = [0.06, 0.12, 0.2, 0.33, 0.5, 0.66, 0.8, 0.9].map((share) => mm(share * L));
  const targets: BrdBottomTarget[] = stations.map((station) => ({
    station,
    across: Array.from({ length: 12 }, (_, j) => mm(j * 9)),
    target: Array.from({ length: 12 }, () => mm(rnd() * 3 - 1)),
  }));

  const pick = <T,>(items: readonly T[]): T => items[Math.floor(rnd() * items.length)];
  function randomCut(key: BottomSectionKey, onlyOther: boolean): BottomCutSpec {
    const names = (BOTTOM_CUT_NAMES[key] as readonly BottomCutName[]).filter((n) => cutKind(n) !== "flat" && (!onlyOther || n !== "Teardrop Nose Concave"));
    let spec: BottomCutSpec = { ...startingCut(key, pick(names), board), depth: inchesToMm(Math.ceil(rnd() * 8) / 16) };
    for (const field of ["start", "deepest", "end"] as const) {
      if (rnd() < 0.5) continue;
      const at = grid.toMm(grid.min + Math.floor(rnd() * (nGrid + 1)) * grid.step);
      spec = keepStationsInOrder(key, { ...spec, ...storeCutStation(key, field, at, board) }, field, board, "narrowest");
    }
    for (const field of ["offRail", "offStringer", "troughAt"] as const) {
      if (rnd() < 0.5) continue;
      const { min, max } = BOTTOM_MARK_RANGES_IN[field];
      const x = min + Math.floor((rnd() * (max - min)) / BOTTOM_MARK_STEP_IN) * BOTTOM_MARK_STEP_IN;
      spec = { ...spec, [field]: inchesToMm(x) };
      if (cutKind(spec.name) === "double") spec = keepStationsInOrder(key, spec, "deepest", board, "narrowest");
    }
    return spec;
  }

  /** The value the slow way: resolveBottom and sectionsFoamOff at every point, then the largest gap plus the mean. */
  function slowValue(bottom: BoardBottom): number {
    const resolved = resolveBottom(bottom, board);
    let largest = 0;
    let sum = 0;
    let n = 0;
    for (const t of targets) {
      const at0 = sectionsFoamOff(resolved, board, t.station, mm(0));
      t.across.forEach((y, j) => {
        const gap = Math.abs(t.target[j] - (sectionsFoamOff(resolved, board, t.station, y) - at0));
        sum += gap;
        n++;
        largest = Math.max(largest, gap);
      });
    }
    return largest + sum / n;
  }

  it("matches resolveBottom + sectionsFoamOff to 1e-9 over 200 random bottoms (stations on the slider grid, marks on 1/16\")", () => {
    const scorer = brdBottomScorer(board, targets);
    for (let i = 0; i < 200; i++) {
      const specs = { nose: randomCut("nose", true), center: randomCut("center", true), tail: randomCut("tail", true) };
      if (rnd() < 0.3) specs[pick(["nose", "center", "tail"] as const)] = startingCut("nose", "Flat Entry", board);
      expect(scorer.valueOfSpecs(specs)).toBeCloseTo(slowValue(withCuts(specs)), 9);
    }
  });

  it("matches for a Teardrop too (a cut that closes to a point goes the slow way) and for a Spiral Vee at several depths", () => {
    const scorer = brdBottomScorer(board, targets);
    for (let i = 0; i < 20; i++) {
      const nose = { ...startingCut("nose", "Teardrop Nose Concave", board), depth: inchesToMm(Math.ceil(rnd() * 8) / 16) };
      const tail = { ...startingCut("tail", "Spiral Vee", board), depth: inchesToMm(Math.ceil(rnd() * 8) / 16) };
      const specs = { nose, center: startingCut("center", "Flat Center", board), tail };
      expect(scorer.valueOfSpecs(specs)).toBeCloseTo(slowValue(withCuts(specs)), 9);
    }
  });

  it("keeps its remembered work honest while it refines a Spiral Vee, whose lift is its Vee Lift and not its depth", () => {
    const scorer = brdBottomScorer(board, targets);
    const specs = { nose: startingCut("nose", "Flat Entry", board), center: startingCut("center", "Flat Center", board), tail: { ...startingCut("tail", "Spiral Vee", board), depth: inchesToMm(2 / 16) } };
    const refined = scorer.refine(specs);
    expect(refined.value).toBeCloseTo(slowValue(withCuts(refined.specs)), 9);
  });

  it("refines to the same value the slow way reports for what it returns, and never gets worse than where it began", () => {
    const scorer = brdBottomScorer(board, targets);
    const specs = { nose: startingCut("nose", "Blended Nose Concave", board), center: startingCut("center", "Deep Single Concave", board), tail: startingCut("tail", "Panel Vee", board) };
    const before = scorer.valueOfSpecs(specs);
    const refined = scorer.refine(specs);
    expect(refined.value).toBeLessThanOrEqual(before + 1e-9);
    expect(refined.value).toBeCloseTo(slowValue(withCuts(refined.specs)), 9);
  });
});

describe("fitBottomToBrd", () => {
  it("is null when there is no section to read", () => {
    expect(fitBottomToBrd([], SHORT.board)).toBeNull();
    expect(fitBottomToBrd([{ station: mm(5), points: [[0, 0], [10, 0]] }], SHORT.board)).toBeNull();
  });

  it("finds every section and every cut flat for the app's own flat Shortboard", () => {
    const { found } = fitText(SHORT.write(DEFAULT_BOTTOM));
    expect(found.sections.length).toBeGreaterThan(10);
    expect(found.sections.every((s) => s.flat && s.reads.kind === "flat")).toBe(true);
    for (const key of ["nose", "center", "tail"] as const) expect(cutKind(found.bottom[key].name)).toBe("flat");
    expect(found.closeness.largest).toBeLessThan(BRD_BOTTOM_FLAT_MM);
  }, LONG);

  /**
   * Sections that are exactly `bottom`'s at 40 stations, each less than 6" from the next (so the fit adds no blends, which a
   * cut's own fade between two sections would not match exactly): the file's bottom IS this bottom.
   */
  function sectionsOf(bottom: BoardBottom, board: BottomBoard): BrdSectionLine[] {
    const resolved = resolveBottom(bottom, board);
    return Array.from({ length: 40 }, (_, k) => 0.03 + (0.94 * k) / 39).map((share) => {
      const station = mm(share * board.length);
      const reach = board.railAt(station) / BRD_BOTTOM_WINDOW;
      const at0 = sectionsFoamOff(resolved, board, station, mm(0));
      const run = Array.from({ length: 61 }, (_, k): P2 => {
        const x = (reach * k) / 60;
        return [x, sectionsFoamOff(resolved, board, station, mm(x)) - at0];
      });
      return { station, points: [...run, [reach, run[60][1] + 20], [0, run[60][1] + 40]] };
    });
  }

  it("gives back a bottom whose sections are exactly one bottom's at its starting numbers, no slider moved", () => {
    const board = SHORT.board;
    const wanted = withCuts({ center: { ...startingCut("center", "Deep Single Concave", board), depth: inchesToMm(4 / 16) } });
    const found = fitBottomToBrd(sectionsOf(wanted, board), board)!;
    for (const key of ["nose", "center", "tail"] as const) {
      expect(found.bottom[key].name).toBe(wanted[key].name);
      expect(found.bottom[key].depth).toBeCloseTo(wanted[key].depth, 9);
      expect(found.bottom[key].start).toBeCloseTo(wanted[key].start, 9);
      expect(found.bottom[key].deepest).toBeCloseTo(wanted[key].deepest, 9);
      expect(found.bottom[key].end).toBeCloseTo(wanted[key].end, 9);
    }
    expect(found.closeness.largest).toBeLessThan(0.1);
  }, LONG);

  it("finds a Deepest At moved 6 inches along the slider grid, within an inch, and every moved figure sits on its own slider's step", () => {
    const board = SHORT.board;
    const base = startingCut("center", "Deep Single Concave", board);
    const grid = bottomStationSlider(mm(0), board.length, "imperial");
    const wantedStation = grid.toMm(Math.round((mmToInches(board.length) - mmToInches(base.deepest) - 6) * 2) / 2);
    const moved = keepStationsInOrder("center", { ...base, ...storeCutStation("center", "deepest", wantedStation, board), depth: inchesToMm(4 / 16) }, "deepest", board, "narrowest");
    const wanted = withCuts({ center: moved });
    expect(Math.abs(moved.deepest - base.deepest)).toBeGreaterThan(inchesToMm(5));
    const found = fitBottomToBrd(sectionsOf(wanted, board), board)!;
    expect(cutKind(found.bottom.center.name)).toBe("single");
    expect(Math.abs(mmToInches(resolveCut("center", found.bottom.center, board).deepest) - mmToInches(resolveCut("center", moved, board).deepest))).toBeLessThanOrEqual(1);
    expectOnSliders(found.bottom, board);
  }, LONG);

  function expectOnSliders(bottom: BoardBottom, board: BottomBoard) {
    const lengthIn = mmToInches(board.length);
    for (const key of ["nose", "center", "tail"] as const) {
      const spec = bottom[key];
      if (cutKind(spec.name) === "flat") continue;
      const start = startingCut(key, spec.name, board, key === "center" ? bottom.tail.name : undefined);
      const resolved = resolveCut(key, spec, board);
      const base = resolveCut(key, start, board);
      for (const field of ["start", "deepest", "end"] as const) {
        if (Math.abs(resolved[field] - base[field]) < 1e-6) continue; // left at the name's own number
        const fromNose = (lengthIn - mmToInches(resolved[field])) / 0.5;
        expect(Math.abs(fromNose - Math.round(fromNose))).toBeLessThan(1e-9);
      }
      for (const field of ["offRail", "offStringer", "troughAt"] as const) {
        if (Math.abs(spec[field] - start[field]) < 1e-6) continue;
        const steps = mmToInches(spec[field]) / BOTTOM_MARK_STEP_IN;
        expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-9);
        expect(mmToInches(spec[field])).toBeGreaterThanOrEqual(BOTTOM_MARK_RANGES_IN[field].min - 1e-9);
        expect(mmToInches(spec[field])).toBeLessThanOrEqual(BOTTOM_MARK_RANGES_IN[field].max + 1e-9);
      }
      const depthSteps = mmToInches(spec.depth) / BOTTOM_MARK_STEP_IN;
      expect(Math.abs(depthSteps - Math.round(depthSteps))).toBeLessThan(1e-9);
      expect(depthSteps).toBeGreaterThanOrEqual(1);
      expect(depthSteps).toBeLessThanOrEqual(8);
    }
  }

  it("measures the chosen bottom exactly as measureBrdBottom does, against the file's own figures", () => {
    const { found, board } = fitText(SHORT.write(withCuts({ center: { ...startingCut("center", "Deep Single Concave", SHORT.board), depth: inchesToMm(3 / 16) } })));
    const again = measureBrdBottom(found.bottom, found.sections, board);
    expect(again.closeness.largest).toBeCloseTo(found.closeness.largest, 9);
    expect(again.closeness.typical).toBeCloseTo(found.closeness.typical, 9);
    expect(again.closeness.station).toBe(found.closeness.station);
    for (const s of found.sections) {
      expect(s.ours).toHaveLength(s.file.length);
      expect(s.gap.largest).toBeCloseTo(Math.max(...s.file.map((v, j) => Math.abs(v - s.ours[j]))), 9);
    }
    expectOnSliders(found.bottom, board);
  }, LONG);

  it("builds a bottom from picks the way a pick on BOTTOM does: starting numbers, a center single built for the picked tail", () => {
    const board = SHORT.board;
    const picks = {
      nose: { name: "Flat Entry" as const, steps: 0 },
      center: { name: "Deep Single Concave" as const, steps: 4 },
      tail: { name: "Panel Vee" as const, steps: 2 },
    };
    const bottom = brdBottomFromPicks(picks, board);
    expect(bottom.center).toEqual({ ...startingCut("center", "Deep Single Concave", board, "Panel Vee"), depth: inchesToMm(4 / 16) });
    expect(bottom.tail.depth).toBeCloseTo(inchesToMm(2 / 16), 9);
    expect(bottom.channels).toEqual(DEFAULT_BOTTOM.channels);
    expect(bottom.wingRule).toBe("narrowest");
  });
});

describe("round trips: a board with a known bottom, written, read back and fitted, comes back", () => {
  const I = inchesToMm;
  type Move = { field: "start" | "deepest" | "end"; station: (b: BottomBoard) => number } | { mark: "offRail" | "troughAt" | "offStringer"; inches: number };
  type Case = { name: string; cuts: Partial<Record<BottomSectionKey, { name: BottomCutName; steps?: number; moves?: Move[] }>> };

  const alone: Case[] = [];
  for (const key of ["nose", "center", "tail"] as const) {
    for (const name of BOTTOM_CUT_NAMES[key]) if (cutKind(name) !== "flat") alone.push({ name: `${key}: ${name}`, cuts: { [key]: { name } } });
  }
  const mixes: Case[] = [
    { name: "Deep Single Concave + Double Concave Exit", cuts: { center: { name: "Deep Single Concave" }, tail: { name: "Double Concave Exit" } } },
    { name: "Tri-Plane Hull Center + Panel Vee", cuts: { center: { name: "Tri-Plane Hull Center" }, tail: { name: "Panel Vee" } } },
    { name: "Teardrop Nose Concave + Shallow Single Concave + Spiral Vee", cuts: { nose: { name: "Teardrop Nose Concave" }, center: { name: "Shallow Single Concave" }, tail: { name: "Spiral Vee" } } },
    { name: "Blended Nose Concave 1/16\" + Deep Single Concave 3/16\" + Rolled Vee 1/8\"", cuts: { nose: { name: "Blended Nose Concave", steps: 1 }, center: { name: "Deep Single Concave", steps: 3 }, tail: { name: "Rolled Vee", steps: 2 } } },
  ];
  /** Stations the way a drag stores them: on the slider's half-inch grid from the nose. */
  const onGrid = (board: BottomBoard, fromTail: number) => bottomStationSlider(mm(0), board.length, "imperial").toMm(Math.round(mmToInches(mm(board.length - fromTail)) * 2) / 2);
  const fromNose = (inches: number) => (b: BottomBoard) => b.length - I(inches);
  const moved: Case[] = [
    { name: "Deep Single Concave, Deepest At 8\" toward the nose", cuts: { center: { name: "Deep Single Concave", moves: [{ field: "deepest", station: (b) => onGrid(b, resolveCut("center", startingCut("center", "Deep Single Concave", b), b).deepest + I(8)) }] } } },
    { name: "Double Concave Exit 1/8\", Trough At 4 1/2\" and Off Rail 1/2\"", cuts: { tail: { name: "Double Concave Exit", steps: 2, moves: [{ mark: "troughAt", inches: 4.5 }, { mark: "offRail", inches: 0.5 }] } } },
    { name: "Blended Nose Concave 1/4\" from the nose, deepest 18\" from it", cuts: { nose: { name: "Blended Nose Concave", steps: 4, moves: [{ field: "deepest", station: fromNose(18) }, { field: "start", station: fromNose(0) }] } } },
    { name: "Panel Vee 3/16\" from 30\", deepest 8\"", cuts: { tail: { name: "Panel Vee", steps: 3, moves: [{ field: "start", station: (b) => onGrid(b, I(30)) }, { field: "deepest", station: (b) => onGrid(b, I(8)) }] } } },
    { name: "Teardrop 3/16\" deepest 14\" + Deep Single 3/16\" Off Rail 1\" + Double Concave Exit 1/8\" Trough At 4\"", cuts: { nose: { name: "Teardrop Nose Concave", steps: 3, moves: [{ field: "deepest", station: fromNose(14) }] }, center: { name: "Deep Single Concave", steps: 3, moves: [{ mark: "offRail", inches: 1 }] }, tail: { name: "Double Concave Exit", steps: 2, moves: [{ mark: "troughAt", inches: 4 }] } } },
  ];

  function bottomOf(c: Case, board: BottomBoard): BoardBottom {
    const bottom = structuredClone(DEFAULT_BOTTOM);
    for (const key of ["tail", "center", "nose"] as const) {
      const entry = c.cuts[key];
      if (!entry) continue;
      let spec = startingCut(key, entry.name, board, key === "center" ? c.cuts.tail?.name : undefined);
      if (entry.steps) spec = { ...spec, depth: inchesToMm(entry.steps / 16) };
      for (const move of entry.moves ?? []) {
        if ("field" in move) spec = keepStationsInOrder(key, { ...spec, ...storeCutStation(key, move.field, mm(move.station(board)), board) }, move.field, board, "narrowest");
        else {
          spec = { ...spec, [move.mark]: inchesToMm(move.inches) };
          if (cutKind(spec.name) === "double") spec = keepStationsInOrder(key, spec, "deepest", board, "narrowest");
        }
      }
      bottom[key] = spec;
    }
    return bottom;
  }

  const depthSteps = (spec: BottomCutSpec) => (cutKind(spec.name) === "flat" ? 0 : Math.round(mmToInches(spec.depth) / BOTTOM_MARK_STEP_IN));

  function check(c: Case, source: ReturnType<typeof builder>, strictMoves: boolean) {
    const wanted = bottomOf(c, source.board);
    const { found, board, read } = fitText(source.write(wanted));
    for (const key of ["nose", "center", "tail"] as const) {
      expect(cutKind(found.bottom[key].name), `${c.name}: ${key} kind`).toBe(cutKind(wanted[key].name));
      expect(depthSteps(found.bottom[key]), `${c.name}: ${key} depth`).toBe(depthSteps(wanted[key]));
    }
    // The found bottom is no more than 0.2 mm further from the file than the bottom that was written.
    const scorer = brdBottomScorer(board, brdBottomBlends(found.sections));
    const value = (b: BoardBottom) => scorer.valueOfSpecs({ nose: b.nose, center: b.center, tail: b.tail });
    expect(value(found.bottom), `${c.name}: how close`).toBeLessThanOrEqual(value(wanted) + 0.2);
    expect(read.sections.length).toBeGreaterThan(10);
    if (!strictMoves) return;
    for (const key of ["nose", "center", "tail"] as const) {
      for (const move of c.cuts[key]?.moves ?? []) {
        const a = resolveCut(key, wanted[key], source.board);
        const b = resolveCut(key, found.bottom[key], board);
        if ("field" in move) {
          const here = (r: typeof a, bd: BottomBoard) => mmToInches(stationFromNearestTip(key, r[move.field], bd));
          expect(Math.abs(here(b, board) - here(a, source.board)), `${c.name}: ${key} ${move.field}`).toBeLessThanOrEqual(4);
        } else {
          expect(Math.abs(mmToInches(found.bottom[key][move.mark]) - mmToInches(wanted[key][move.mark])), `${c.name}: ${key} ${move.mark}`).toBeLessThanOrEqual(1 / 8 + 1e-9);
        }
      }
    }
  }

  it.each(alone.map((c) => [c.name, c] as const))("the Shortboard with %s alone, at its starting depth", (_name, c) => check(c, SHORT, false), LONG);
  it.each(mixes.map((c) => [c.name, c] as const))("the Shortboard with the mix %s", (_name, c) => check(c, SHORT, false), LONG);
  it.each(moved.slice(0, 4).map((c) => [c.name, c] as const))("the Shortboard with sliders moved: %s", (_name, c) => check(c, SHORT, true), LONG);
  it("the Shortboard with a three-cut mix whose sliders were moved: every kind and depth comes back", () => check(moved[4], SHORT, false), LONG);
  it.each(mixes.map((c) => [c.name, c] as const))("the Mid-length with the mix %s", (_name, c) => check(c, MID, false), LONG);
});

describe("the stringer lift", () => {
  it("is zero under a flat, a vee and a belly, and the concave's depth under a concave", () => {
    const board = SHORT.board;
    const flat = brdStringerLift(DEFAULT_BOTTOM, board);
    const vee = brdStringerLift(withCuts({ tail: { ...startingCut("tail", "Panel Vee", board), depth: inchesToMm(4 / 16) } }), board);
    const belly = brdStringerLift(withCuts({ center: { ...startingCut("center", "Continuous Belly / Rolled Mid", board), depth: inchesToMm(4 / 16) } }), board);
    const concave = withCuts({ center: { ...startingCut("center", "Deep Single Concave", board), depth: inchesToMm(4 / 16) } });
    const lift = brdStringerLift(concave, board);
    const deepest = resolveCut("center", concave.center, board).deepest;
    for (let i = 0; i <= 40; i++) {
      const s = mm((board.length * i) / 40);
      expect(flat(s)).toBe(0);
      expect(vee(s)).toBe(0);
      expect(belly(s)).toBe(0);
      expect(lift(s)).toBeGreaterThanOrEqual(0);
    }
    expect(lift(deepest)).toBeCloseTo(Math.min(inchesToMm(4 / 16), board.thicknessAt(deepest) - inchesToMm(1 / 4)), 6);
    expect(lift(mm(0))).toBe(0);
  });
});
