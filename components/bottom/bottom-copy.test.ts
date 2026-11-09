import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatBottomStation } from "@/lib/geometry/blank-reasons";
import {
  BOTTOM_FLOOR,
  DEFAULT_BOTTOM,
  bottomFloorFlags,
  channelReadout,
  resolveBottom,
  resolveChannels,
  startingChannels,
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
import { formatDim, formatMark } from "@/lib/geometry/measure-display";
import { buildOutline } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { inchesToMm, mm, type Mm, type UnitsSystem } from "@/lib/geometry/units";
import { boardSections } from "@/lib/geometry/volume";
import {
  BOTTOM_COPY,
  CHANNELS_COPY,
  channelSmoothnessWords,
  channelWidthLabel,
  channelWidthWords,
  floorWarning,
  runOptionLabel,
  staggerLabel,
  staggerWords,
} from "./bottom-copy";

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

/** A preset's board as the bottom reads it (no sections: the channels' words need only the board). */
function presetBoard(id: string): BottomBoard {
  const preset = BOARD_PRESETS.find((p) => p.id === id)!;
  const fields = phase16Boards().find((b) => b.label === `${id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`)!.fields;
  return designBottomBoard(fields.outline, buildOutline(fields.outline), designSideProfile(fields, LIVE_DESIGN_RULES), designFinPlacement(fields));
}

describe("the CHANNELS block's words (D-10, D-11)", () => {
  const shortboard = presetBoard("shortboard");
  const longboard = presetBoard("longboard");
  const readoutOf = (board: BottomBoard, count: 4 | 6 | 8, change: Partial<BoardBottom["channels"]> = {}) => {
    const spec = { ...startingChannels(count, board, DEFAULT_BOTTOM.channels), ...change };
    return { spec, readout: channelReadout(resolveChannels(spec, board), board, "narrowest") };
  };

  it("Run: Parallel, With the rail, and Toe-in with the front fins' own toe to one decimal; Toe-in (no toe) on a single fin", () => {
    expect(runOptionLabel("parallel", shortboard.toeDegrees)).toBe("Parallel");
    expect(runOptionLabel("rail", shortboard.toeDegrees)).toBe("With the rail");
    expect(shortboard.toeDegrees).toBeGreaterThan(0);
    expect(runOptionLabel("toe", shortboard.toeDegrees)).toBe(`Toe-in · ${shortboard.toeDegrees.toFixed(1)}°`);
    expect(longboard.toeDegrees).toBe(0);
    expect(runOptionLabel("toe", longboard.toeDegrees)).toBe("Toe-in (no toe)");
  });

  it.each(SYSTEMS)("Channel Width (%s): the width, the ramp's degrees and the last wall off the rail, every length a mark", (system) => {
    const { readout } = readoutOf(shortboard, 6);
    expect(readout.squeezed).toBe(false);
    const words = `${formatMark(readout.width, system)} · ramp ${readout.rampDegrees}° · last wall ${formatMark(readout.lastWallOffRail, system)} off the rail`;
    expect(channelWidthWords(readout, system)).toBe(words);
    expect(channelWidthLabel(readout, system)).toBe(`Channel Width — ${words}`);
  });

  it("a squeezed set says what it was cut to: eight asked at 4\" on the Shortboard", () => {
    const { readout } = readoutOf(shortboard, 8, { width: inchesToMm(4) });
    expect(readout.squeezed).toBe(true);
    const mark = (v: Mm) => formatMark(v, "imperial");
    expect(channelWidthWords(readout, "imperial")).toBe(
      `${mark(readout.width)} (${mark(readout.fittedWidth)} to fit) · ramp ${readout.rampDegrees}° · last wall ${mark(readout.lastWallOffRail)} off the rail`,
    );
  });

  it.each(SYSTEMS)("Stagger (%s): a dim per channel, naming the shortest pair and where it starts; nothing for All the same", (system) => {
    for (const [longest, shortest] of [
      ["outer", "inner"],
      ["inner", "outer"],
    ] as const) {
      const { spec, readout } = readoutOf(shortboard, 6, { longest });
      const words = `${formatDim(spec.stagger, system)} per channel · the ${shortest} pair starts ${formatBottomStation(readout.shortestStart, system)} from the tail`;
      expect(staggerWords(spec, readout, system)).toBe(words);
      expect(staggerLabel(spec, readout, system)).toBe(`Stagger — ${words}`);
    }
    const same = readoutOf(shortboard, 6, { longest: "same" });
    expect(staggerWords(same.spec, same.readout, system)).toBeNull();
    expect(staggerLabel(same.spec, same.readout, system)).toBeNull();
  });

  it("Smoothness reads a straight ramp at 0 and scooped at 100; the echo, the count options, Start's pair and the spoken names", () => {
    expect(channelSmoothnessWords(0)).toBe("0% · a straight ramp");
    expect(channelSmoothnessWords(100)).toBe("100% · scooped");
    expect(channelSmoothnessWords(50)).toBe("50%");
    expect(CHANNELS_COPY.echo(0, "Flat Exit")).toBe("None");
    expect(CHANNELS_COPY.echo(6, "Flat Exit")).toBe("6, cut after the Flat Exit");
    expect(([0, 4, 6, 8] as const).map((n) => CHANNELS_COPY.countOption(n))).toEqual(["None", "4 channels", "6 channels", "8 channels"]);
    const at = BOTTOM_COPY.fromTip("tail", formatBottomStation(inchesToMm(23), "imperial"));
    expect(CHANNELS_COPY.startWords(at, "outer")).toBe(`${at} · the outer pair`);
    expect(CHANNELS_COPY.startWords(at, "inner")).toBe(`${at} · the inner pair`);
    expect(CHANNELS_COPY.startWords(at, "same")).toBe(at);
    const controls = [CHANNELS_COPY.width, BOTTOM_COPY.offStringer, BOTTOM_COPY.start, CHANNELS_COPY.stagger, BOTTOM_COPY.deepestAt, BOTTOM_COPY.end, BOTTOM_COPY.depth, BOTTOM_COPY.smoothness];
    expect(controls.map(CHANNELS_COPY.sliderName)).toEqual([
      "Channel Width",
      "Channels Off Stringer",
      "Channels Start",
      "Channels Stagger",
      "Channels Deepest At",
      "Channels End",
      "Channels Depth",
      "Channels Smoothness",
    ]);
  });
});

describe("BOTTOM's viewer (17-10): Height, Section at and the finished rail — words, and none of it saved", () => {
  it("Height's four buttons and their spoken names; Section at speaks its station from the tail", () => {
    expect([1, 2, 4, 8].map(BOTTOM_COPY.heightButton)).toEqual(["×1", "×2", "×4", "×8"]);
    expect([1, 2, 4, 8].map(BOTTOM_COPY.heightButtonName)).toEqual(["Height ×1", "Height ×2", "Height ×4", "Height ×8"]);
    for (const system of SYSTEMS) {
      const station = formatBottomStation(inchesToMm(36), system);
      expect(BOTTOM_COPY.sectionAtValue(station)).toBe(`${station} from the tail`);
    }
  });

  it("the ruler and the section's words ask only the section's own box: nothing under components/bottom reads the window or the device (C3)", () => {
    for (const file of ["bottom-editor.tsx", "bottom-section.tsx", "bottom-top-view.tsx", "bottom-controls.tsx", "bottom-data.tsx"]) {
      const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      expect(source, file).not.toMatch(/\binnerWidth\b|\bmatchMedia\b|\bouterWidth\b|\bdevicePixelRatio\b/);
    }
    expect(readFileSync(new URL("./bottom-section.tsx", import.meta.url), "utf8")).toMatch(/useSvgClientSize\(svgRef\)/);
  });

  it("the view state — the station, Height, the finished-rail tick, the live cut — lives in BottomEditor alone, never in the store or a saved board (UI-SPEC §14)", () => {
    const editor = readFileSync(new URL("./bottom-editor.tsx", import.meta.url), "utf8");
    for (const state of ["height", "showFinishedRail", "live"]) {
      expect(editor).toMatch(new RegExp(`const \\[${state}, set\\w+\\] = useState`));
    }
    // The station: a store of BottomEditor's own, made once when the page opens on the wide point.
    expect(editor).toMatch(/const \[stationStore\] = useState\(\(\) => createSectionStationStore\(\{ follow: "wide" \}\)\)/);
    const store = readFileSync(new URL("../design/design-store.tsx", import.meta.url), "utf8");
    const snapshot = readFileSync(new URL("../../lib/models/design-snapshot.ts", import.meta.url), "utf8");
    for (const source of [store, snapshot]) expect(source).not.toMatch(/sectionStation|showFinishedRail|SectionHeight|sectionHeight/);
  });
});
