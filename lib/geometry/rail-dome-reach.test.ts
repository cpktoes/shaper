import { describe, expect, it } from "vitest";
import { brdBottomStations, brdText } from "../export/brd";
import { buildBoardSurface } from "./board-surface";
import { phase16Boards } from "./__fixtures__/phase16-boards";
import {
  designBottomBoard,
  designCrossSectionInput,
  designFinPlacement,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
  railAnchorStations,
  railDomeNudgeTops,
  railStringerDistances,
  summarizeDesign,
  type DesignSummaryFields,
} from "./design";
import { DEFAULT_BOTTOM, resolveBottom } from "./bottom";
import { sectionFinishedRail } from "./finished-rail";
import { foamHalfWidth, buildOutline } from "./outline";
import {
  DECK_PERCENT_MIN,
  RAIL_DOME_NUDGE_MAX_IN,
  RAIL_DOME_STRINGER_ROOM_IN,
  RAIL_NUDGE_LIMIT_IN,
  RAIL_NUDGE_STEP_IN,
  ZERO_RAIL_NUDGES,
  computeRailBands,
  computeRailSectionOutput,
  domedDeckBandNudgeTop,
  railPlotBounds,
  type RailBandSpec,
  type RailSectionKey,
} from "./rail-bands";
import { boardSections } from "./volume";
import { inchesToMm, mm, mmToInches } from "./units";

/*
 * The Domed Deck Band's reach (quick 261116-tqs, D-04, D-05, D-06; the founder, 2026-11-16: "let's just allow it to go to the
 * stringer"): its slider runs from -2" to the stringer at each section, every reader of the dome follows, and a nudge
 * already inside +-2" means exactly what it meant. Every expected figure comes from the app's own functions; only inch
 * inputs are typed.
 */

const KEYS: readonly RailSectionKey[] = ["nose", "center", "tail"];
const inch = (v: number) => mmToInches(mm(v));
const TOL_IN = 1e-9;
const MIN_MARK_IN = 1 / 16;

const preset = phase16Boards().find((b) => b.label === "shortboard|asis|hard")!;
const fields: DesignSummaryFields = preset.fields;
const geometry = buildOutline(fields.outline);
const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
const anchors = railAnchorStations(profile.effectiveFoil, fields.outline.length);
const effective = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);

/** The rails with every section's deck domed (so the dome is drawn) and the given dome nudge (inches) on one section. */
function railsWithDome(key: RailSectionKey, nudgeIn: number): RailBandSpec {
  const domed = (k: RailSectionKey) => ({ ...effective[k], deckPercent: DECK_PERCENT_MIN + 5 });
  const next = { ...effective, nose: domed("nose"), center: domed("center"), tail: domed("tail") };
  return { ...next, [key]: { ...next[key], nudges: { ...ZERO_RAIL_NUDGES, domedDeckBand: mm(inchesToMm(nudgeIn)) } } };
}

describe("domedDeckBandNudgeTop", () => {
  const T = inchesToMm(2.5);

  it("puts the dome at the stringer and within one 1/16\" step of it, on the 1/16\" grid counted from -2\"", () => {
    for (const halfWidthIn of [7, 8.3, 9.77, 10.5, 12]) {
      const top = domedDeckBandNudgeTop(inchesToMm(halfWidthIn), T);
      const dome = 2.4 * inch(T) + top;
      expect(dome, `half-width ${halfWidthIn}`).toBeLessThanOrEqual(halfWidthIn - RAIL_DOME_STRINGER_ROOM_IN + TOL_IN);
      expect(dome + RAIL_NUDGE_STEP_IN).toBeGreaterThan(halfWidthIn - RAIL_DOME_STRINGER_ROOM_IN - TOL_IN);
      const steps = (top + RAIL_NUDGE_LIMIT_IN.domedDeckBand) / RAIL_NUDGE_STEP_IN;
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-7);
    }
  });

  it("is held between one step above the low end and RAIL_DOME_NUDGE_MAX_IN", () => {
    expect(domedDeckBandNudgeTop(inchesToMm(0.2), T)).toBeCloseTo(-RAIL_NUDGE_LIMIT_IN.domedDeckBand + RAIL_NUDGE_STEP_IN, 9);
    expect(domedDeckBandNudgeTop(inchesToMm(400), T)).toBe(RAIL_DOME_NUDGE_MAX_IN);
  });

  it("reaches the stringer: a dome at the top sits at, never past, the section's half-width", () => {
    expect(RAIL_DOME_STRINGER_ROOM_IN).toBe(0);
    const half = inchesToMm(9.5);
    const top = domedDeckBandNudgeTop(half, T);
    expect(2.4 * inch(T) + top).toBeLessThanOrEqual(inch(half) + TOL_IN);
  });
});

describe("railDomeNudgeTops and railStringerDistances on the Shortboard", () => {
  const tops = railDomeNudgeTops(geometry, anchors, effective);
  const stringers = railStringerDistances(geometry, anchors);

  it("each section's stringer is the foam's half-width at its anchor", () => {
    for (const key of KEYS) expect(stringers[key]).toBe(foamHalfWidth(geometry, anchors[key]));
  });

  it("each section's top is domedDeckBandNudgeTop at that half-width and the section's thickness", () => {
    for (const key of KEYS) expect(tops[key]).toBe(domedDeckBandNudgeTop(foamHalfWidth(geometry, anchors[key]), effective[key].boardThickness));
  });

  it("the centre reaches well past the old +2\"", () => {
    expect(tops.center).toBeGreaterThan(RAIL_NUDGE_LIMIT_IN.domedDeckBand);
  });

  it("a dome at each section's top lands on or just inside the stringer there", () => {
    for (const key of KEYS) {
      const out = computeRailSectionOutput(key, railsWithDome(key, tops[key])[key], false);
      expect(out.result.domedDeckBand, key).toBeLessThanOrEqual(stringers[key] + 1e-6);
      expect(inch(stringers[key]) - inch(out.result.domedDeckBand), key).toBeLessThan(RAIL_NUDGE_STEP_IN + TOL_IN);
    }
  });
});

describe("the engine's clamp on the dome nudge (D-04, D-05)", () => {
  const formula = (key: RailSectionKey, nudgeIn: number) => {
    const spec = railsWithDome(key, nudgeIn)[key];
    const r = computeRailSectionOutput(key, spec, false).result;
    return { r, want: Math.max(2.4 * inch(r.boardThickness) + nudgeIn, inch(r.deckMark3) + MIN_MARK_IN) };
  };

  it("any nudge inside the old +-2\" gives exactly what the formula gave: the dome is max(2.4 T + nudge, Deck Mark 3 + 1/16\")", () => {
    const steps = Math.round(RAIL_NUDGE_LIMIT_IN.domedDeckBand / RAIL_NUDGE_STEP_IN);
    for (const key of KEYS) {
      for (let i = -steps; i <= steps; i++) {
        const nudgeIn = i * RAIL_NUDGE_STEP_IN;
        const { r, want } = formula(key, nudgeIn);
        expect(Math.abs(inch(r.domedDeckBand) - want), `${key} ${nudgeIn}`).toBeLessThan(1e-6);
      }
    }
  });

  it("a nudge of +3\" now draws as 2.4 T + 3\", and a stored +20\" is held at RAIL_DOME_NUDGE_MAX_IN", () => {
    const three = formula("center", 3);
    expect(Math.abs(inch(three.r.domedDeckBand) - (2.4 * inch(three.r.boardThickness) + 3))).toBeLessThan(1e-6);
    const huge = formula("center", 20);
    expect(Math.abs(inch(huge.r.domedDeckBand) - (2.4 * inch(huge.r.boardThickness) + RAIL_DOME_NUDGE_MAX_IN))).toBeLessThan(1e-6);
  });

  it("the Deck Mark 3 rule still wins at -2\"", () => {
    const spec = { ...railsWithDome("center", -RAIL_NUDGE_LIMIT_IN.domedDeckBand).center };
    const r = computeRailSectionOutput("center", spec, false).result;
    expect(r.domedDeckBand).toBeGreaterThan(r.deckMark3);
    expect(inch(r.domedDeckBand) - inch(r.deckMark3)).toBeGreaterThanOrEqual(MIN_MARK_IN - TOL_IN);
  });
});

describe("every reader follows a wider dome, and a board inside the old window reads as it did (D-05)", () => {
  const tops = railDomeNudgeTops(geometry, anchors, effective);
  const wide = Math.min(3, tops.center);
  const narrow = RAIL_NUDGE_LIMIT_IN.domedDeckBand;

  const fieldsWith = (nudgeIn: number): DesignSummaryFields => ({ ...fields, rails: railsWithDome("center", nudgeIn) });

  it("the litres differ between a +2\" and a wider centre dome", () => {
    expect(wide).toBeGreaterThan(narrow);
    expect(summarizeDesign(fieldsWith(wide)).volumeLitres).not.toBe(summarizeDesign(fieldsWith(narrow)).volumeLitres);
  });

  it("the 3D board's section at the centre differs", () => {
    const at = (nudgeIn: number) => {
      const rails = deriveEffectiveRails(railsWithDome("center", nudgeIn), profile.effectiveFoil, fields.railsImportFoilThickness);
      return JSON.stringify(boardSections(designCrossSectionInput(geometry, profile, rails, fields.outline.length), [anchors.center]));
    };
    expect(at(wide)).not.toBe(at(narrow));
  });

  it("the finished rail differs", () => {
    const rail = (nudgeIn: number) => {
      const out = computeRailSectionOutput("center", railsWithDome("center", nudgeIn).center, false);
      return JSON.stringify(sectionFinishedRail(out.result, out.domed));
    };
    expect(rail(wide)).not.toBe(rail(narrow));
  });

  it("the .brd export text differs", () => {
    const text = (nudgeIn: number) => {
      const f = fieldsWith(nudgeIn);
      const rails = deriveEffectiveRails(f.rails, profile.effectiveFoil, f.railsImportFoilThickness);
      const board = designBottomBoard(f.outline, geometry, profile, designFinPlacement(f));
      const surface = buildBoardSurface({
        sections: designCrossSectionInput(geometry, profile, rails, f.outline.length, { bottom: DEFAULT_BOTTOM, board }),
        geometry,
        rockerAt: profile.rockerAt,
      });
      return brdText(surface, { bottomStations: brdBottomStations(resolveBottom(DEFAULT_BOTTOM, board)) }).text;
    };
    expect(text(wide)).not.toBe(text(narrow));
  });

  it("a board whose dome stays inside +-2\" is exactly what it was: the same sections with the nudge held to the old window", () => {
    // The engine's window only widened: -2" to +2" is read identically by the old clamp and the new one.
    for (const nudgeIn of [-2, -1, 0, 1, 2]) {
      const a = computeRailSectionOutput("center", railsWithDome("center", nudgeIn).center, false);
      const heldTo = Math.max(-RAIL_NUDGE_LIMIT_IN.domedDeckBand, Math.min(RAIL_NUDGE_LIMIT_IN.domedDeckBand, nudgeIn));
      const b = computeRailSectionOutput("center", railsWithDome("center", heldTo).center, false);
      expect(a.result).toEqual(b.result);
    }
  });
});

describe("RAILS' plots stop at the stringer (D-12)", () => {
  const stringers = railStringerDistances(geometry, anchors);

  it("the span is the old 2\" beyond the dome, unless that passes the stringer, where it stops there", () => {
    for (const key of KEYS) {
      const { result } = computeRailSectionOutput(key, effective[key], false);
      const old = railPlotBounds(result).xAxisMin;
      const held = railPlotBounds(result, { stringer: stringers[key] }).xAxisMin;
      expect(held).toBeCloseTo(Math.max(old, -stringers[key]), 6);
      expect(held).toBeGreaterThanOrEqual(old - 1e-9);
    }
  });

  it("a plot that stops short of the stringer keeps exactly its old span", () => {
    const { result } = computeRailSectionOutput("center", effective.center, false);
    const far = mm(inchesToMm(80));
    expect(railPlotBounds(result, { stringer: far })).toEqual(railPlotBounds(result));
  });

  it("a dome run to the stringer holds the span at the stringer, one that does not keeps its span", () => {
    const tops = railDomeNudgeTops(geometry, anchors, effective);
    const atTop = computeRailSectionOutput("center", railsWithDome("center", tops.center).center, false);
    const bounds = railPlotBounds(atTop.result, { stringer: stringers.center });
    expect(bounds.xAxisMin).toBeCloseTo(-stringers.center, 6);
    expect(railPlotBounds(atTop.result).xAxisMin).toBeLessThan(bounds.xAxisMin);
  });

  it("computeRailBands with stringers records each section's stringer and holds its bounds; without, nothing changes", () => {
    const bare = computeRailBands(effective);
    const held = computeRailBands(effective, "sixteenths", stringers);
    for (const key of KEYS) {
      expect("stringer" in bare[key]).toBe(false);
      expect(held[key].stringer).toBe(stringers[key]);
      expect(held[key].bounds.xAxisMin).toBeGreaterThanOrEqual(bare[key].bounds.xAxisMin - 1e-9);
      expect(held[key].bounds.yAxisMax).toBe(bare[key].bounds.yAxisMax);
    }
  });
});
