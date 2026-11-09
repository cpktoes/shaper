import { describe, expect, it } from "vitest";
import { formatBottomStation } from "@/lib/geometry/blank-reasons";
import {
  BOTTOM_FLOOR,
  DEFAULT_BOTTOM,
  bottomFloorFlags,
  resolveBottom,
  startingCut,
  type BoardBottom,
  type BottomBoard,
  type BottomCutName,
  type BottomFloorFlag,
  type BottomSectionKey,
} from "@/lib/geometry/bottom";
import { phase16Boards } from "@/lib/geometry/__fixtures__/phase16-boards";
import { deriveEffectiveRails, designBottomBoard, designCrossSectionInput, designFinPlacement, designSideProfile, LIVE_DESIGN_RULES } from "@/lib/geometry/design";
import { FOIL_THICKNESS_RANGE_IN } from "@/lib/geometry/foil";
import { formatMark } from "@/lib/geometry/measure-display";
import { buildOutline } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { inchesToMm, mm, type Mm, type UnitsSystem } from "@/lib/geometry/units";
import { boardSections } from "@/lib/geometry/volume";
import { BOTTOM_COPY, floorWarning } from "./bottom-copy";

/*
 * BOTTOM's words built from figures (Phase 17, 17-09). Every expected figure is the app's own formatter's output — a
 * station through `formatBottomStation`, the floor through `formatMark` — never a typed number (CLAUDE.md Rule 1).
 */

const SYSTEMS: UnitsSystem[] = ["imperial", "metric"];
const LENGTH = inchesToMm(74);
const board: Pick<BottomBoard, "length"> = { length: LENGTH };
const FIX = "Lower the Depth, or move the cut away from the tip.";
const flag = (section: BottomFloorFlag["section"], stringer: number[], rails: number[]): BottomFloorFlag => ({
  section,
  stringer: stringer.map(mm),
  rails: rails.map(mm),
  at: null,
});

describe("floorWarning: the floor in words (D-09, D-33 as amended by D-40)", () => {
  it("the floor is the app's 1/4\" (FOIL_THICKNESS_RANGE_IN.min) as a mark: 1/4\" and 6 mm", () => {
    expect(BOTTOM_FLOOR).toBe(inchesToMm(FOIL_THICKNESS_RANGE_IN.min));
    expect(formatMark(BOTTOM_FLOOR, "imperial")).toBe('1/4"');
    expect(formatMark(BOTTOM_FLOOR, "metric")).toBe("6 mm");
  });

  it("says nothing for a cut that meets no floor", () => {
    expect(floorWarning(undefined, board, "imperial")).toBeNull();
    expect(floorWarning(flag("center", [], []), board, "imperial")).toBeNull();
  });

  it.each(SYSTEMS)("the stringer form (%s): a Nose cut's station is the held one nearest the nose, read from the nose", (system) => {
    const stations = [LENGTH - inchesToMm(9), LENGTH - inchesToMm(3), LENGTH - inchesToMm(6)];
    const floor = formatMark(BOTTOM_FLOOR, system);
    const at = formatBottomStation(inchesToMm(3), system);
    expect(floorWarning(flag("nose", stations, []), board, system)).toBe(
      `This cut meets the ${floor} floor ${at} from the nose: the stringer is left at ${floor} there, shallower than the depth set. ${FIX}`,
    );
  });

  it.each(SYSTEMS)("the stringer form (%s): a Center or Tail cut's station is the held one nearest the tail", (system) => {
    const floor = formatMark(BOTTOM_FLOOR, system);
    for (const section of ["center", "tail"] as const) {
      const at = formatBottomStation(inchesToMm(12), system);
      expect(floorWarning(flag(section, [inchesToMm(18), inchesToMm(12)], []), board, system)).toBe(
        `This cut meets the ${floor} floor ${at} from the tail: the stringer is left at ${floor} there, shallower than the depth set. ${FIX}`,
      );
    }
  });

  it.each(SYSTEMS)("the rail form (%s): a lift that leaves the rail under the floor, near the tip nearer the flagged station", (system) => {
    const floor = formatMark(BOTTOM_FLOOR, system);
    const near = (tip: string) => `This cut leaves the rail under ${floor} near the ${tip}: the rail is thinner there than the floor. ${FIX}`;
    expect(floorWarning(flag("nose", [], [LENGTH - inchesToMm(2)]), board, system)).toBe(near("nose"));
    expect(floorWarning(flag("tail", [], [inchesToMm(1), inchesToMm(4)]), board, system)).toBe(near("tail"));
    expect(floorWarning(flag("center", [], [inchesToMm(20)]), board, system)).toBe(near("tail"));
    expect(floorWarning(flag("center", [], [LENGTH - inchesToMm(20)]), board, system)).toBe(near("nose"));
    expect(floorWarning(flag("channels", [], [inchesToMm(0)]), board, system)).toBe(
      `The channels leave the rail under ${floor} near the tail: the rail is thinner there than the floor. ${FIX}`,
    );
  });

  it("both forms in one sentence each, and the fix said once", () => {
    const text = floorWarning(flag("center", [inchesToMm(20)], [inchesToMm(5)]), board, "imperial")!;
    expect(text.startsWith("This cut meets the")).toBe(true);
    expect(text).toContain("This cut leaves the rail under");
    expect(text.split(FIX)).toHaveLength(2);
    expect(text.endsWith(FIX)).toBe(true);
  });
});

/** A preset as the store opens it (the Phase 16 fixture boards the maths' own tests use), with a bottom picked. */
function presetFlags(id: string, names: Partial<Record<BottomSectionKey, BottomCutName>>, depth?: Partial<Record<BottomSectionKey, Mm>>) {
  const preset = BOARD_PRESETS.find((p) => p.id === id)!;
  const found = phase16Boards().find((b) => b.label === `${id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`)!;
  const fields = found.fields;
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const bottomBoard = designBottomBoard(fields.outline, geometry, profile, designFinPlacement(fields));
  const bottom: BoardBottom = structuredClone(DEFAULT_BOTTOM);
  for (const [section, name] of Object.entries(names) as [BottomSectionKey, BottomCutName][]) {
    bottom[section] = startingCut(section, name, bottomBoard);
    const d = depth?.[section];
    if (d !== undefined) bottom[section] = { ...bottom[section], depth: d };
  }
  const sections = boardSections(designCrossSectionInput(geometry, profile, rails, fields.outline.length, { bottom, board: bottomBoard }));
  return { flags: bottomFloorFlags(resolveBottom(bottom, bottomBoard), bottomBoard, sections), bottomBoard };
}

describe("the floor sentence on the presets (the maths' own flags)", () => {
  it("a Rolled Belly Entry at 1/2\" on the Shortboard reads the rail form, near the nose", () => {
    const { flags, bottomBoard } = presetFlags("shortboard", { nose: "Rolled Belly Entry" }, { nose: inchesToMm(1 / 2) });
    const text = floorWarning(
      flags.find((f) => f.section === "nose"),
      bottomBoard,
      "imperial",
    );
    expect(text).toBe(`This cut leaves the rail under 1/4" near the nose: the rail is thinner there than the floor. ${FIX}`);
  }, 120_000);

  it("D-42 (\"Warn, keep the numbers\"): the Fish's Panel Vee and the Mid-length's Spiral Vee warn on a fresh pick", () => {
    for (const [id, name] of [
      ["fish", "Panel Vee"],
      ["midlength", "Spiral Vee"],
    ] as const) {
      const { flags, bottomBoard } = presetFlags(id, { tail: name });
      const text = floorWarning(
        flags.find((f) => f.section === "tail"),
        bottomBoard,
        "metric",
      );
      expect(text, `${id} ${name}`).toBe(`This cut leaves the rail under 6 mm near the tail: the rail is thinner there than the floor. ${FIX}`);
    }
  }, 120_000);
});

describe("the rows' words", () => {
  it("Trough At reads its mark from the stringer; Smoothness a percent", () => {
    expect(BOTTOM_COPY.fromStringer(formatMark(inchesToMm(4), "imperial"))).toBe('4" from the stringer');
    expect(BOTTOM_COPY.percent(50)).toBe("50%");
    expect(BOTTOM_COPY.closesToPoint).toBe("Closes to a point toward the center");
  });
});
