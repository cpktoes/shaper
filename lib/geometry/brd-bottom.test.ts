import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
// Fitting a board file is slow work, and a busy machine (the whole suite at once) can stretch a case past the default five
// seconds: the cases here are generous rather than flaky. A case with its own, longer limit keeps it.
vi.setConfig({ testTimeout: 60_000 });
import { brdBottomStations, brdText } from "../export/brd";
import { readAnyBrd } from "../export/brd-read";
import { brdBoardFields } from "../models/brd-board";
import { asD30Read, phase16Boards } from "./__fixtures__/phase16-boards";
import type { P2 } from "./bezier-fit";
import { bottomStationSlider } from "./blank-reasons";
import { buildBoardSurface } from "./board-surface";
import {
  BOTTOM_CUT_NAMES,
  BOTTOM_DEPTH_RANGE_IN,
  BOTTOM_DEPTH_STEP_IN,
  BOTTOM_MARK_RANGES_IN,
  BOTTOM_MARK_STEP_IN,
  DEFAULT_BOTTOM,
  FLAT_CUT_NAMES,
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
  BRD_BOTTOM_CONCAVE_TIE_MM,
  BRD_BOTTOM_DISH_MM,
  BRD_BOTTOM_DISH_OUT,
  BRD_BOTTOM_DISH_TURN_MM,
  BRD_BOTTOM_FLAT_MM,
  BRD_BOTTOM_TRI_PLANE_MM,
  BRD_BOTTOM_EXTRA_CUT_MM,
  BRD_BOTTOM_NOSE_RETRY_MM,
  BRD_BOTTOM_WINDOW,
  brdBottomBlends,
  brdBottomFromPicks,
  brdBottomScorer,
  brdBottomSections,
  brdFittedBottomBoard,
  brdNoseDish,
  brdStringerLift,
  chooseBrdBottom,
  chooseBrdNoseRetry,
  fitBottomToBrd,
  measureBrdBottom,
  polishBrdBottom,
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
  // The bottom fit's precision was measured on boards whose rails blend as D-30 read them, before quick 261113-psx moved
  // the default (the rails fit then finds a different tail on the new default's boards, which is its own test); so the
  // two builders write boards read as D-30 read them and these cases test the same files as before.
  return asD30Read(found.fields);
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

  // A nose concave's Rail Roll (quick 261125-mf8): the fast form carries it beside the cut's base, the Teardrop the slow way.
  // A generator of its own, seeded afresh, so the cases above draw what they always drew.
  const rolledNose = (r: () => number): BottomCutSpec => {
    const names: BottomCutName[] = ["Teardrop Nose Concave", "Blended Nose Concave", "Slight Single Concave Entry"];
    const name = names[Math.floor(r() * names.length)];
    let spec: BottomCutSpec = { ...startingCut("nose", name, board), depth: inchesToMm(Math.ceil(r() * 8) / 16) };
    for (const field of ["start", "deepest", "end"] as const) {
      if (r() < 0.5) continue;
      const at = grid.toMm(grid.min + Math.floor(r() * (nGrid + 1)) * grid.step);
      spec = keepStationsInOrder("nose", { ...spec, ...storeCutStation("nose", field, at, board) }, field, board, "narrowest");
    }
    const { min, max } = BOTTOM_MARK_RANGES_IN.offRail;
    spec = { ...spec, offRail: inchesToMm(min + Math.floor((r() * (max - min)) / BOTTOM_MARK_STEP_IN) * BOTTOM_MARK_STEP_IN) };
    const steps = Math.round(BOTTOM_MARK_RANGES_IN.railRoll.max / BOTTOM_DEPTH_STEP_IN);
    return { ...spec, railRoll: inchesToMm((1 + Math.floor(r() * steps)) * BOTTOM_DEPTH_STEP_IN) };
  };

  it("matches the slow way to 1e-9 with a Rail Roll on the nose concave (quick 261125-mf8), over 100 bottoms", () => {
    const r = random(261125);
    const scorer = brdBottomScorer(board, targets);
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const nose = rolledNose(r);
      seen.add(nose.name);
      const specs = { nose, center: randomCut("center", true), tail: randomCut("tail", true) };
      expect(resolveCut("nose", nose, board).railRoll).toBeGreaterThan(0);
      expect(scorer.valueOfSpecs(specs)).toBeCloseTo(slowValue(withCuts(specs)), 9);
    }
    expect(seen.size).toBe(3);
  });

  it("the polish with the roll free keeps its remembered work honest, never gets worse, and holds every roll to BOTTOM's range", () => {
    const scorer = brdBottomScorer(board, targets);
    const nose = { ...startingCut("nose", "Blended Nose Concave", board), depth: inchesToMm(3 / 16), railRoll: inchesToMm(1 / 8) };
    const specs = { nose, center: startingCut("center", "Deep Single Concave", board), tail: startingCut("tail", "Panel Vee", board) };
    const before = scorer.valueOfSpecs(specs);
    const polished = scorer.polish(specs, true);
    expect(polished.value).toBeLessThanOrEqual(before + 1e-9);
    expect(polished.value).toBeCloseTo(slowValue(withCuts(polished.specs)), 9);
    for (const key of ["nose", "center", "tail"] as const) {
      const roll = polished.specs[key].railRoll;
      if (roll === undefined) continue;
      expect(key).toBe("nose");
      expect(roll).toBeGreaterThan(0);
      expect(mmToInches(roll)).toBeLessThanOrEqual(BOTTOM_MARK_RANGES_IN.railRoll.max + 1e-9);
    }
  }, LONG);

  it("the polish frees the roll only when asked: left alone, a rolled nose keeps its roll and an unrolled one gets no key", () => {
    const scorer = brdBottomScorer(board, targets);
    const rolled = { ...startingCut("nose", "Blended Nose Concave", board), depth: inchesToMm(3 / 16), railRoll: inchesToMm(3 / 32) };
    const centre = startingCut("center", "Deep Single Concave", board);
    const tail = startingCut("tail", "Panel Vee", board);
    expect(scorer.polish({ nose: rolled, center: centre, tail }).specs.nose.railRoll).toBe(rolled.railRoll);
    const plain: BottomCutSpec = { ...rolled };
    delete plain.railRoll;
    const out = scorer.polish({ nose: plain, center: centre, tail }).specs;
    for (const key of ["nose", "center", "tail"] as const) expect("railRoll" in out[key], key).toBe(false);
  }, LONG);
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

  /**
   * The kind a written cut is expected to come back as. A written Tri-Plane Hull Center at its starting 1/8" is a near tie
   * with a Continuous Belly with a flat panel (the belly scores 0.07 mm closer, 0.02 mm and 0.20 mm farther in the three cases
   * that write one), and the Tri-Plane is the rarest bottom: it is kept only when 1 mm closer (D-05, quick 261116-jqz), so
   * every near tie comes back as the belly, at the same depth and no further from the file than the bottom written.
   */
  const comesBackAs = (name: BottomCutName) => (name === "Tri-Plane Hull Center" ? "belly" : cutKind(name));

  function check(c: Case, source: ReturnType<typeof builder>, strictMoves: boolean) {
    const wanted = bottomOf(c, source.board);
    const { found, board, read } = fitText(source.write(wanted));
    for (const key of ["nose", "center", "tail"] as const) {
      expect(cutKind(found.bottom[key].name), `${c.name}: ${key} kind`).toBe(comesBackAs(wanted[key].name));
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

  /**
   * A Spiral Vee on its own, started well ahead of the name's own Start (quick 261124-x9h, D-01, D-04). Before this task the
   * fit never scored "no centre cut + Spiral Vee" on such a file: the seed reached for a centre Early Double Concave over a
   * tail vee, and the fit swaps one section at a time, so the Spiral Vee alone was two swaps away. These three came back as
   * Early Double Concave + Spiral Vee, Early Double Concave + Panel Vee and Early Double Concave + Panel Vee.
   */
  const spiralStart = (ahead: number) => (b: BottomBoard) => onGrid(b, resolveCut("tail", startingCut("tail", "Spiral Vee", b), b).start + I(ahead));
  const spiralAlone: Case[] = [
    { name: "Spiral Vee 1/8\" started 20\" further up the board", cuts: { tail: { name: "Spiral Vee", steps: 2, moves: [{ field: "start", station: spiralStart(20) }] } } },
    { name: "Spiral Vee 1/8\" started 26\" further up the board", cuts: { tail: { name: "Spiral Vee", steps: 2, moves: [{ field: "start", station: spiralStart(26) }] } } },
    { name: "Spiral Vee 3/16\" started 26\" further up the board", cuts: { tail: { name: "Spiral Vee", steps: 3, moves: [{ field: "start", station: spiralStart(26) }] } } },
  ];
  it.each(spiralAlone.map((c) => [c.name, c] as const))("the Mid-length with a %s comes back as a Spiral Vee with no centre cut", (_name, c) => {
    check(c, MID, false);
    const { found } = fitText(MID.write(bottomOf(c, MID.board)));
    expect([found.bottom.nose.name, found.bottom.center.name, found.bottom.tail.name]).toEqual(["Flat Entry", "Flat Center", "Spiral Vee"]);
    expect(found.closeness.largest).toBeLessThan(BRD_BOTTOM_FLAT_MM);
  }, LONG);
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

describe("the Tri-Plane Hull Center is reached for last, and a belly carries a flat panel (quick 261116-jqz, D-04, D-05)", () => {
  const I = inchesToMm;
  type Specs = Record<BottomSectionKey, BottomCutSpec>;
  const board = SHORT.board;
  const specsOf = (center: BottomCutName): Specs => ({
    nose: startingCut("nose", "Flat Entry", board),
    center: startingCut("center", center, board),
    tail: startingCut("tail", "Flat Exit", board),
  });
  const candidate = (center: BottomCutName, value: number) => ({ specs: specsOf(center), value });

  describe("chooseBrdBottom", () => {
    const TRI = "Tri-Plane Hull Center" as const;
    const BELLY = "Continuous Belly / Rolled Mid" as const;

    it("a Tri-Plane just under the margin ahead loses; at exactly the margin it wins", () => {
      const belly = candidate(BELLY, 2);
      const under = candidate(TRI, 2 - (BRD_BOTTOM_TRI_PLANE_MM - 0.01));
      expect(chooseBrdBottom([under, belly], under)).toBe(belly);
      const at = candidate(TRI, 2 - BRD_BOTTOM_TRI_PLANE_MM);
      expect(chooseBrdBottom([at, belly], belly)).toBe(at);
    });

    it("a Tri-Plane seed with another candidate a little behind loses: the seed's stickiness never saves it", () => {
      const seed = candidate(TRI, 2);
      const other = candidate(BELLY, 2 + 0.1);
      expect(chooseBrdBottom([seed, other], seed)).toBe(other);
    });

    it("a pool of Tri-Planes alone keeps the closest", () => {
      const a = candidate(TRI, 3);
      const b = candidate(TRI, 2);
      expect(chooseBrdBottom([a, b], a)).toBe(b);
    });

    it("with no Tri-Plane in the pool it is today's rule: the seed when it is near and among the fewest cuts, else the fewest cuts' closest", () => {
      const seed = candidate("Deep Single Concave", 2);
      const closer = candidate("Shallow Single Concave", 2 - BRD_BOTTOM_EXTRA_CUT_MM / 2);
      expect(chooseBrdBottom([seed, closer], seed)).toBe(seed);
      const muchCloser = candidate("Shallow Single Concave", 2 - BRD_BOTTOM_EXTRA_CUT_MM - 0.5);
      expect(chooseBrdBottom([seed, muchCloser], seed)).toBe(muchCloser);
      const twoCuts = { specs: { ...specsOf("Deep Single Concave"), tail: startingCut("tail", "Panel Vee", board) }, value: 1.9 };
      expect(chooseBrdBottom([seed, twoCuts], seed)).toBe(seed);
    });
  });

  /** Sections exactly `bottom`'s at 40 stations, less than 6" apart so the fit adds no blends: the file's bottom IS it. */
  function exactSections(bottom: BoardBottom, b: BottomBoard): BrdSectionLine[] {
    const resolved = resolveBottom(bottom, b);
    return Array.from({ length: 40 }, (_, k) => 0.03 + (0.94 * k) / 39).map((share) => {
      const station = mm(share * b.length);
      const reach = b.railAt(station) / BRD_BOTTOM_WINDOW;
      const at0 = sectionsFoamOff(resolved, b, station, mm(0));
      const run = Array.from({ length: 61 }, (_, k): P2 => {
        const x = (reach * k) / 60;
        return [x, sectionsFoamOff(resolved, b, station, mm(x)) - at0];
      });
      return { station, points: [...run, [reach, run[60][1] + 20], [0, run[60][1] + 40]] };
    });
  }

  it.each([["the Shortboard", SHORT], ["the Mid-length", MID]] as const)(
    "%s: a 3/8\" Continuous Belly with a 1 1/2\" panel comes back as a belly with that panel, to within 1/16\", and exact",
    (_name, source) => {
      const wanted = withCuts({
        center: { ...startingCut("center", "Continuous Belly / Rolled Mid", source.board), depth: I(3 / 8), offStringer: I(1.5) },
      });
      const found = fitBottomToBrd(exactSections(wanted, source.board), source.board)!;
      expect(cutKind(found.bottom.center.name)).toBe("belly");
      expect(Math.abs(found.bottom.center.offStringer - wanted.center.offStringer)).toBeLessThanOrEqual(I(1 / 16) + 1e-9);
      expect(found.closeness.largest).toBeLessThan(0.1);
    },
    LONG,
  );

  it("a Tri-Plane at its starting 1/8\", read from exact sections, comes back as a belly with a panel: the near tie goes to the belly", () => {
    const wanted = withCuts({ center: startingCut("center", "Tri-Plane Hull Center", board) });
    const found = fitBottomToBrd(exactSections(wanted, board), board)!;
    expect(found.bottom.center.name).not.toBe("Tri-Plane Hull Center");
    expect(cutKind(found.bottom.center.name)).toBe("belly");
    expect(found.bottom.center.offStringer).toBeGreaterThan(0);
  }, LONG);

  it.each([
    ["the Shortboard alone", SHORT, undefined],
    ["the Mid-length alone", MID, undefined],
    ["the Shortboard with a Panel Vee", SHORT, "Panel Vee"],
    ["the Mid-length with a Panel Vee", MID, "Panel Vee"],
  ] as const)("%s: a 1/2\" Tri-Plane written to a file and read back is still a Tri-Plane (rare, not gone)", (_name, source, tail) => {
    const bottom = withCuts({
      center: { ...startingCut("center", "Tri-Plane Hull Center", source.board), depth: I(1 / 2) },
      ...(tail ? { tail: startingCut("tail", tail, source.board) } : {}),
    });
    const { found } = fitText(source.write(bottom));
    expect(found.bottom.center.name).toBe("Tri-Plane Hull Center");
  }, LONG);
});

describe("the polish: the chosen bottom's sliders land at any value, names held (quick 261116-tqs, D-01, D-03, D-11)", () => {
  const I = inchesToMm;
  const board = SHORT.board;
  const KEYS = ["nose", "center", "tail"] as const;

  /** Sections exactly `bottom`'s at 40 stations, less than 6" apart so the fit adds no blends: the file's bottom IS it. */
  function exact(bottom: BoardBottom): BrdSectionLine[] {
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

  /** The fit's grid answer for a file written as `wanted`, and the same bottom polished. */
  function both(wanted: BoardBottom) {
    const lines = exact(wanted);
    const grid = fitBottomToBrd(lines, board)!;
    const polished = polishBrdBottom(grid.bottom, grid.sections, board);
    const scorer = brdBottomScorer(board, brdBottomBlends(grid.sections));
    const valueOf = (b: BoardBottom) => scorer.valueOfSpecs({ nose: b.nose, center: b.center, tail: b.tail });
    return { grid, polished, valueOf, measured: measureBrdBottom(polished, grid.sections, board) };
  }

  /** A cut written with numbers that sit on none of BOTTOM's steps. */
  const offGrid = (key: BottomSectionKey, name: BottomCutName, tail?: BottomCutName): BottomCutSpec => {
    let spec: BottomCutSpec = { ...startingCut(key, name, board, tail), depth: I(0.11) };
    spec = { ...spec, ...storeCutStation(key, "start", I(37.3), board) };
    spec = { ...spec, ...storeCutStation(key, "deepest", I(key === "tail" ? 17.7 : 21.7), board) };
    spec = { ...spec, ...storeCutStation(key, "end", I(5.4), board) };
    if (spec.offRail > 0) spec = { ...spec, offRail: I(1.37) };
    return keepStationsInOrder(key, spec, "deepest", board, "narrowest");
  };

  const CASES: [string, BoardBottom][] = [
    ["a Deep Single Concave", withCuts({ center: { ...startingCut("center", "Deep Single Concave", board), depth: I(4 / 16) } })],
    ["a Double Concave Exit", withCuts({ tail: { ...startingCut("tail", "Double Concave Exit", board), depth: I(3 / 16) } })],
    ["a Panel Vee", withCuts({ tail: { ...startingCut("tail", "Panel Vee", board), depth: I(3 / 16) } })],
    ["a Continuous Belly with a panel", withCuts({ center: { ...startingCut("center", "Continuous Belly / Rolled Mid", board), depth: I(3 / 8), offStringer: I(1.5) } })],
    ["a Teardrop Nose Concave", withCuts({ nose: { ...startingCut("nose", "Teardrop Nose Concave", board), depth: I(1 / 4) } })],
  ];

  it.each(CASES)("%s: the names are the grid answer's, and the polish is never farther off by the fit's own score or the widest miss", (_n, wanted) => {
    const { grid, polished, valueOf, measured } = both(wanted);
    for (const key of KEYS) expect(polished[key].name).toBe(grid.bottom[key].name);
    expect(valueOf(polished)).toBeLessThanOrEqual(valueOf(grid.bottom) + 1e-9);
    expect(measured.closeness.largest).toBeLessThanOrEqual(grid.closeness.largest + 1e-6);
    expect(polished.channels).toEqual(grid.bottom.channels);
    expect(polished.wingRule).toBe(grid.bottom.wingRule);
  }, LONG);

  it("a Deep Single Concave written off every step: the grid answer misses, the polished one misses by strictly less", () => {
    const wanted = withCuts({ center: offGrid("center", "Deep Single Concave") });
    const { grid, polished, measured } = both(wanted);
    expect(grid.closeness.largest).toBeGreaterThan(0);
    expect(measured.closeness.largest).toBeLessThan(grid.closeness.largest);
    expect(polished.center.name).toBe(grid.bottom.center.name);
  }, LONG);

  it("a Double Concave Exit and a Panel Vee written off every step: the polished bottom misses by strictly less than the grid's", () => {
    for (const [key, name] of [["tail", "Double Concave Exit"], ["tail", "Panel Vee"]] as const) {
      const { grid, measured } = both(withCuts({ [key]: offGrid(key, name) }));
      expect(grid.closeness.largest).toBeGreaterThan(0);
      expect(measured.closeness.largest).toBeLessThan(grid.closeness.largest);
    }
  }, LONG);

  it("every polished value is inside its own control's range, the stations are in order, a flat is untouched, and Smoothness, Vee Lift and Closes to a point are the grid answer's", () => {
    const wanted = withCuts({ center: offGrid("center", "Deep Single Concave"), tail: offGrid("tail", "Double Concave Exit") });
    const { grid, polished } = both(wanted);
    expect(polished.nose).toEqual(grid.bottom.nose);
    for (const key of KEYS) {
      const spec = polished[key];
      if (cutKind(spec.name) === "flat") continue;
      const was = grid.bottom[key];
      expect(spec.smoothness).toBe(was.smoothness);
      expect(spec.veeLift).toBe(was.veeLift);
      expect(spec.closesToPoint).toBe(was.closesToPoint);
      const r = resolveCut(key, spec, board);
      for (const field of ["start", "deepest", "end"] as const) {
        expect(r[field]).toBeGreaterThanOrEqual(0);
        expect(r[field]).toBeLessThanOrEqual(board.length);
      }
      expect(r.start).toBeGreaterThanOrEqual(r.deepest - 1e-9);
      expect(r.deepest).toBeGreaterThanOrEqual(r.end - 1e-9);
      expect(mmToInches(spec.depth)).toBeGreaterThanOrEqual(BOTTOM_MARK_STEP_IN - 1e-9);
      expect(mmToInches(spec.depth)).toBeLessThanOrEqual(BOTTOM_DEPTH_RANGE_IN.max + 1e-9);
      for (const field of ["offRail", "offStringer", "troughAt"] as const) {
        expect(mmToInches(spec[field])).toBeGreaterThanOrEqual(Math.min(BOTTOM_MARK_RANGES_IN[field].min, mmToInches(was[field])) - 1e-9);
        expect(mmToInches(spec[field])).toBeLessThanOrEqual(BOTTOM_MARK_RANGES_IN[field].max + 1e-9);
      }
    }
  }, LONG);

  it("a double's Off Stringer moves in the polish, and the refine's own mark lists still leave it where the name started", () => {
    const wanted = withCuts({ tail: { ...startingCut("tail", "Double Concave Exit", board), depth: I(3 / 16), offStringer: I(0.25) } });
    const { grid, polished } = both(wanted);
    expect(grid.bottom.tail.name).toBe("Double Concave Exit");
    // The grid answer is the name's own 3/4", the polish brings it nearer the written 1/4".
    expect(grid.bottom.tail.offStringer).toBeCloseTo(startingCut("tail", "Double Concave Exit", board).offStringer, 9);
    expect(Math.abs(polished.tail.offStringer - I(0.25))).toBeLessThan(Math.abs(grid.bottom.tail.offStringer - I(0.25)));
  }, LONG);

  it("a bottom of three flat cuts comes back as it went in", () => {
    const flat = fitBottomToBrd(exact(DEFAULT_BOTTOM), board)!;
    expect(polishBrdBottom(flat.bottom, flat.sections, board)).toEqual(flat.bottom);
  }, LONG);

  /*
   * The nose tried once more with a Rail Roll (quick 261125-mf8, D-05): the Shortboard's Blended Nose Concave 3/16" deep,
   * written with a Rail Roll, as sections that are exactly the written bottom's.
   */
  const rolledFile = (rollIn: number) =>
    withCuts({ nose: { ...startingCut("nose", "Blended Nose Concave", board), depth: I(3 / 16), railRoll: I(rollIn) } });
  const shown = (b: BoardBottom, sections: readonly BrdBottomSection[]) => {
    const { largest, typical } = measureBrdBottom(b, sections, board).closeness;
    return { largest, both: largest + typical };
  };
  const noRollKey = (b: BoardBottom) => KEYS.every((key) => !("railRoll" in b[key]));

  it("a 1/8\" Rail Roll: the grid answer has none and misses by over a millimetre; the polished nose is a Blended Nose Concave with about that roll", () => {
    const { grid, polished, measured } = both(rolledFile(1 / 8));
    expect(noRollKey(grid.bottom)).toBe(true);
    expect(shown(grid.bottom, grid.sections).largest).toBeGreaterThan(BRD_BOTTOM_NOSE_RETRY_MM);
    expect(polished.nose.name).toBe("Blended Nose Concave");
    expect(Math.abs(polished.nose.railRoll! - I(1 / 8))).toBeLessThan(I(1 / 32));
    expect(measured.closeness.largest).toBeLessThan(BRD_BOTTOM_FLAT_MM);
  }, LONG);

  it("a 1/4\" Rail Roll: the grid's nose is not a concave; the polished one is a Blended Nose Concave with about that roll, a quarter millimetre closer", () => {
    const { grid, polished, measured } = both(rolledFile(1 / 4));
    expect(noRollKey(grid.bottom)).toBe(true);
    expect(cutKind(grid.bottom.nose.name)).not.toBe("single");
    expect(polished.nose.name).toBe("Blended Nose Concave");
    expect(Math.abs(polished.nose.railRoll! - I(1 / 4))).toBeLessThan(I(1 / 32));
    expect(measured.closeness.largest).toBeLessThan(BRD_BOTTOM_FLAT_MM);
    expect(shown(polished, grid.sections).both).toBeLessThanOrEqual(shown(grid.bottom, grid.sections).both - BRD_BOTTOM_EXTRA_CUT_MM);
  }, LONG);

  // Rewritten by quick 261125-v2f (D-01's idea 3, told to the founder before the build): this case used to pin the leftover
  // centre belly the grid reads a small roll as. The nose's dish now brings the retry, and the roll takes that belly's place.
  it("a 1/16\" Rail Roll, whose grid answer is under the millimetre gate: the nose's dish brings the retry, and the roll takes the leftover centre belly's place (quick 261125-v2f)", () => {
    const { grid, polished } = both(rolledFile(1 / 16));
    expect(shown(grid.bottom, grid.sections).largest).toBeLessThan(BRD_BOTTOM_NOSE_RETRY_MM);
    // The grid answer: the nose concave over a leftover centre cut, no roll.
    expect(cutKind(grid.bottom.center.name)).not.toBe("flat");
    expect(noRollKey(grid.bottom)).toBe(true);
    // Polished: the grid's own nose name with about the written roll, and nothing in the centre or the tail.
    expect(polished.nose.name).toBe(grid.bottom.nose.name);
    expect(Math.abs((polished.nose.railRoll ?? 0) - I(1 / 16))).toBeLessThan(I(1 / 32));
    expect(cutKind(polished.center.name)).toBe("flat");
    expect(cutKind(polished.tail.name)).toBe("flat");
    expect(shown(polished, grid.sections).largest).toBeLessThan(shown(grid.bottom, grid.sections).largest);
  }, LONG);

  it("the roll is never in the name choice: the grid answer carries no Rail Roll on any of the three files", () => {
    for (const rollIn of [1 / 16, 1 / 8, 1 / 4]) {
      const grid = fitBottomToBrd(exact(rolledFile(rollIn)), board)!;
      expect(noRollKey(grid.bottom), String(rollIn)).toBe(true);
    }
  }, LONG);

  it("no trial switch was ported: the bottom's maths, the fit and the preview read no environment variable and hold none of the spike's names", () => {
    for (const file of ["lib/geometry/bottom.ts", "lib/geometry/brd-bottom.ts", "lib/export/brd-fit-preview.ts"]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source, file).not.toMatch(/process\.env/);
      expect(source, file).not.toMatch(/SPIKE|edgeRoll|acrossShape|spikeSec/);
    }
  });
});

describe("the shape across the nose: a dish that turns up again before the rail (quick 261125-v2f, D-01)", () => {
  const I = inchesToMm;
  const board = SHORT.board;

  /** Sections exactly `bottom`'s at 40 stations (the polish describe's own helper, copied so that one stays as it is). */
  function exact(bottom: BoardBottom): BrdSectionLine[] {
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
  const dishOf = (bottom: BoardBottom) => brdNoseDish(brdBottomSections(exact(bottom), board.length), board);
  const nose = (name: BottomCutName, depthIn: number, rollIn?: number): BoardBottom =>
    withCuts({ nose: { ...startingCut("nose", name, board), depth: I(depthIn), ...(rollIn ? { railRoll: I(rollIn) } : {}) } });

  it.each([[1 / 16], [1 / 8], [1 / 4]])("a Blended Nose Concave 3/16\" with a %s\" Rail Roll shows the dish, and its seed gives back the written depth and roll", (rollIn) => {
    const dish = dishOf(nose("Blended Nose Concave", 3 / 16, rollIn));
    expect(dish).not.toBeNull();
    expect(dish!.station).toBeGreaterThanOrEqual(board.length / 2);
    expect(dish!.dish).toBeGreaterThanOrEqual(BRD_BOTTOM_DISH_MM);
    expect(dish!.turn).toBeGreaterThanOrEqual(BRD_BOTTOM_DISH_TURN_MM);
    expect(dish!.out).toBeGreaterThanOrEqual(BRD_BOTTOM_DISH_OUT);
    expect(dish!.out).toBeLessThan(1);
    expect(Math.abs(dish!.railRoll - I(rollIn))).toBeLessThan(I(1 / 64));
    expect(Math.abs(dish!.depth - I(3 / 16))).toBeLessThan(I(1 / 64));
    expect(dish!.offRail).toBeGreaterThanOrEqual(I(BOTTOM_MARK_RANGES_IN.offRail.min));
    expect(dish!.offRail).toBeLessThanOrEqual(I(BOTTOM_MARK_RANGES_IN.offRail.max));
  }, LONG);

  it.each([
    ["a Blended Nose Concave 3/16\" with no roll", nose("Blended Nose Concave", 3 / 16)],
    ["a Teardrop Nose Concave 1/4\" with no roll", nose("Teardrop Nose Concave", 1 / 4)],
    ["a Rolled Belly Entry 1/8\"", nose("Rolled Belly Entry", 1 / 8)],
    ["a Reverse Vee Nose 1/8\"", nose("Reverse Vee Nose", 1 / 8)],
    ["a centre Continuous Belly 1/8\"", withCuts({ center: { ...startingCut("center", "Continuous Belly / Rolled Mid", board), depth: I(1 / 8) } })],
    ["three flat cuts", DEFAULT_BOTTOM],
  ] as const)("%s shows no dish that turns up", (_name, bottom) => {
    expect(dishOf(bottom)).toBeNull();
  }, LONG);

  it("no trial switch from spike 007 was ported: the fit holds none of its scaffolding", () => {
    const source = readFileSync(join(process.cwd(), "lib/geometry/brd-bottom.ts"), "utf8");
    expect(source).not.toMatch(/S7_|__s7|globalThis/);
  });
});

describe("the nose retry's choice, with the founder's tie in numbers (quick 261125-v2f, D-03)", () => {
  const I = inchesToMm;
  const board = SHORT.board;
  const cut = (key: BottomSectionKey, name: BottomCutName, rollIn?: number): BottomCutSpec =>
    cutKind(name) === "flat"
      ? startingCut(key, name, board)
      : { ...startingCut(key, name, board), depth: I(1 / 8), ...(rollIn ? { railRoll: I(rollIn) } : {}) };
  const flat = (key: BottomSectionKey) => cut(key, FLAT_CUT_NAMES[key]);
  const at = (nose: BottomCutSpec, center: BottomCutSpec, shown: number) => ({ specs: { nose, center, tail: flat("tail") }, shown });
  // Today's shown figure, any value well clear of the bars below.
  const T = 4 * BRD_BOTTOM_EXTRA_CUT_MM;
  const TIE = BRD_BOTTOM_CONCAVE_TIE_MM;
  const EXTRA = BRD_BOTTOM_EXTRA_CUT_MM;
  const rolled = cut("nose", "Blended Nose Concave", 1 / 8);

  it("today a Rolled Belly Entry: a Blended Nose Concave with a Rail Roll and the same cuts wins a little further off, inside the tie", () => {
    const today = at(cut("nose", "Rolled Belly Entry"), flat("center"), T);
    const near = at(rolled, flat("center"), T + 0.8 * TIE);
    const far = at(rolled, flat("center"), T + 1.2 * TIE);
    expect(chooseBrdNoseRetry(today, [near])).toBe(near);
    expect(chooseBrdNoseRetry(today, [far])).toBe(today);
  });

  it("the same concave with no Rail Roll takes no tie: it must be the 0.25 mm a renamed nose earns closer", () => {
    const today = at(cut("nose", "Rolled Belly Entry"), flat("center"), T);
    const short = at(cut("nose", "Blended Nose Concave"), flat("center"), T - 0.96 * EXTRA);
    const enough = at(cut("nose", "Blended Nose Concave"), flat("center"), T - 1.04 * EXTRA);
    expect(chooseBrdNoseRetry(today, [short])).toBe(today);
    expect(chooseBrdNoseRetry(today, [enough])).toBe(enough);
  });

  it("today a Blended Nose Concave over a Continuous Belly: the rolled concave over a flat centre (a cut fewer) wins up to 0.25 mm further off", () => {
    const today = at(cut("nose", "Blended Nose Concave"), cut("center", "Continuous Belly / Rolled Mid"), T);
    const inside = at(rolled, flat("center"), T + 0.96 * EXTRA);
    const outside = at(rolled, flat("center"), T + 1.04 * EXTRA);
    expect(chooseBrdNoseRetry(today, [inside])).toBe(inside);
    expect(chooseBrdNoseRetry(today, [outside])).toBe(today);
  });

  it("today a Flat Entry over a Continuous Belly: the rolled concave over that belly (a cut more) must be 0.25 mm closer", () => {
    const belly = cut("center", "Continuous Belly / Rolled Mid");
    const today = at(flat("nose"), belly, T);
    const short = at(rolled, belly, T - 0.96 * EXTRA);
    const enough = at(rolled, belly, T - 1.04 * EXTRA);
    expect(chooseBrdNoseRetry(today, [short])).toBe(today);
    expect(chooseBrdNoseRetry(today, [enough])).toBe(enough);
  });

  it("today a Flat Entry over a Tri-Plane Hull Center (the one centre vee): the rolled concave over a flat centre takes no tie, a vee is held to the ordinary bar (quick 261126-czw, D-02)", () => {
    expect(cutKind("Tri-Plane Hull Center")).toBe("vee");
    const today = at(flat("nose"), cut("center", "Tri-Plane Hull Center"), T);
    const tie = at(rolled, flat("center"), T + 0.8 * TIE);
    const enough = at(rolled, flat("center"), T - 1.04 * EXTRA);
    expect(chooseBrdNoseRetry(today, [tie])).toBe(today);
    expect(chooseBrdNoseRetry(today, [enough])).toBe(enough);
  });

  it("today a Flat Entry over a Continuous Belly: the rolled concave over a flat centre (the same cuts) still takes the tie for a belly (quick 261126-czw, D-02)", () => {
    const today = at(flat("nose"), cut("center", "Continuous Belly / Rolled Mid"), T);
    const near = at(rolled, flat("center"), T + 0.8 * TIE);
    const far = at(rolled, flat("center"), T + 1.2 * TIE);
    expect(chooseBrdNoseRetry(today, [near])).toBe(near);
    expect(chooseBrdNoseRetry(today, [far])).toBe(today);
  });

  it("the same nose name and the same cuts win at any gain over rounding noise, and lose at none", () => {
    const today = at(cut("nose", "Blended Nose Concave"), flat("center"), T);
    const gain = at(rolled, flat("center"), T - I(1 / 64) / 1000);
    const none = at(rolled, flat("center"), T);
    expect(chooseBrdNoseRetry(today, [gain])).toBe(gain);
    expect(chooseBrdNoseRetry(today, [none])).toBe(today);
  });

  it("no passing try keeps today itself, and of two passing tries within 0.25 mm the one with fewer cuts wins", () => {
    const belly = cut("center", "Continuous Belly / Rolled Mid");
    const today = at(cut("nose", "Blended Nose Concave"), belly, T);
    expect(chooseBrdNoseRetry(today, [])).toBe(today);
    expect(chooseBrdNoseRetry(today, [at(rolled, belly, T + EXTRA)])).toBe(today);
    const closer = at(rolled, belly, T - 0.5 * EXTRA);
    const fewer = at(rolled, flat("center"), T - 0.2 * EXTRA);
    expect(chooseBrdNoseRetry(today, [closer, fewer])).toBe(fewer);
  });
});
