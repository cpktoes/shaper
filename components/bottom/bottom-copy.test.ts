import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatBottomStation } from "@/lib/geometry/blank-reasons";
import {
  BOTTOM_DATA_DEPTH_SHOWN,
  BOTTOM_FLOOR,
  DEFAULT_BOTTOM,
  bottomDataRows,
  bottomFloorFlags,
  CHANNEL_ANGLE_MAX,
  channelDefaultAngle,
  channelFit,
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
import { CHANNEL_RUN_NAME, formatChannelAngle } from "@/lib/geometry/bottom-print";
import { formatDim, formatMark, formatMarkBare } from "@/lib/geometry/measure-display";
import { buildOutline } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { inchesToMm, mm, type Mm, type UnitsSystem } from "@/lib/geometry/units";
import { boardSections } from "@/lib/geometry/volume";
import {
  BOTTOM_COPY,
  bottomDepthCell,
  CHANNELS_COPY,
  channelAngleWords,
  channelSmoothnessWords,
  channelWidthLabel,
  channelWidthWords,
  dataFloorNote,
  floorWarning,
  layoutMarkColumnName,
  layoutMarksNote,
  referenceRowsNote,
  runOptionLabel,
  staggerLabel,
  staggerWords,
  wingWords,
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
    return { spec, readout: channelReadout(resolveChannels(spec, board, "narrowest"), board, "narrowest") };
  };

  it("Run: three plain names — the angle is the Angle row's to say (D-44)", () => {
    expect((["parallel", "rail", "toe"] as const).map(runOptionLabel)).toEqual(["Parallel", "With the rail", "Toe-in"]);
    for (const run of ["parallel", "rail", "toe"] as const) expect(runOptionLabel(run)).toBe(CHANNEL_RUN_NAME[run]);
  });

  describe("the Angle row's words (D-44)", () => {
    it("the row's label, its slider's spoken name and its Reset", () => {
      expect(CHANNELS_COPY.angle).toBe("Angle");
      expect(CHANNELS_COPY.angleSliderName).toBe("Channel Angle");
      expect(CHANNELS_COPY.angleReset).toBe("Reset");
      expect(CHANNELS_COPY.angleResetName).toBe("Reset Channel Angle");
    });

    it("the founder's six lines, word for word", () => {
      expect(channelAngleWords("rail", 9.1, 9.1, false)).toBe("9.1° · the rail's own");
      expect(channelAngleWords("toe", 3.2, 3.2, false)).toBe("3.2° · the fins' toe-in");
      expect(channelAngleWords("toe", 0, 0, false)).toBe("0.0° · these fins have no toe-in");
      expect(channelAngleWords("rail", 7.5, 9.1, true)).toBe("7.5° · set by hand · the rail's own is 9.1°");
      expect(channelAngleWords("toe", 5, 3.2, true)).toBe("5.0° · set by hand · the fins' toe-in is 3.2°");
      // Ours: an angle set by hand on a board whose fins have none still says why there is nothing to go back to.
      expect(channelAngleWords("toe", 5, 0, true)).toBe("5.0° · set by hand · these fins have no toe-in");
    });

    it.each(["shortboard", "fish", "midlength", "longboard"])("%s: the words carry the maths' own angles — the one in use first, the run's own after", (id) => {
      const board = presetBoard(id);
      for (const run of ["rail", "toe"] as const) {
        const spec = { ...startingChannels(6, board, DEFAULT_BOTTOM.channels), run };
        const own = channelDefaultAngle(run, resolveChannels(spec, board, "narrowest"), board, "narrowest");
        const atDefault = resolveChannels(spec, board, "narrowest");
        expect(atDefault.angle).toBe(own);
        const words = channelAngleWords(run, atDefault.angle, own, false);
        expect(words.startsWith(`${formatChannelAngle(own)} · `)).toBe(true);
        expect(words).not.toContain("set by hand");
        const byHand = resolveChannels({ ...spec, angle: 7.5 }, board, "narrowest");
        expect(byHand.angle).toBe(7.5);
        const handWords = channelAngleWords(run, byHand.angle, own, true);
        expect(handWords.startsWith(`${formatChannelAngle(7.5)} · set by hand · `)).toBe(true);
        if (run === "rail" || own > 0) expect(handWords.endsWith(` is ${formatChannelAngle(own)}`)).toBe(true);
        else expect(handWords.endsWith("these fins have no toe-in")).toBe(true);
      }
    });

    it("degrees to one decimal with the degree sign, the same in both systems — an angle has no inch or millimetre in it", () => {
      expect(formatChannelAngle(0)).toBe("0.0°");
      expect(formatChannelAngle(9.0678)).toBe("9.1°");
      expect(formatChannelAngle(CHANNEL_ANGLE_MAX)).toBe("15.0°");
    });

    it("the longest row still fits two lines of a 340-dot panel: label, dash and words stay under 60 characters", () => {
      const worst = [
        channelAngleWords("rail", CHANNEL_ANGLE_MAX, CHANNEL_ANGLE_MAX, true),
        channelAngleWords("toe", CHANNEL_ANGLE_MAX, CHANNEL_ANGLE_MAX, true),
        channelAngleWords("toe", CHANNEL_ANGLE_MAX, 0, true),
        channelAngleWords("rail", CHANNEL_ANGLE_MAX, CHANNEL_ANGLE_MAX, false),
        channelAngleWords("toe", 0, 0, false),
      ];
      for (const words of worst) expect(`${CHANNELS_COPY.angle} — ${words}`.length, words).toBeLessThan(60);
    });
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

  it.each(SYSTEMS)("Channel Width (%s) never reads a distance below nothing, anywhere on Off Stringer's slider (the code review's CR-01)", (system) => {
    let pastTheRail = 0;
    for (const board of [shortboard, longboard, presetBoard("midlength"), presetBoard("fish")]) {
      for (const count of [4, 6, 8] as const) {
        for (let quarters = 0; quarters <= 36; quarters++) {
          const { spec, readout } = readoutOf(board, count, { run: "rail", offStringer: inchesToMm(quarters / 4) });
          const words = channelWidthWords(readout, system);
          expect(words, `${count} · ${quarters / 4}"`).not.toMatch(/-\d|−/);
          // The slider does take the flat past the rail at the deepest station, and there the words read nothing.
          if (channelFit(resolveChannels(spec, board, "narrowest"), board, "narrowest").offRail < 0) {
            pastTheRail++;
            expect(words).toMatch(new RegExp(`last wall ${formatMark(mm(0), system)} off the rail$`));
          }
        }
      }
    }
    expect(pastTheRail).toBeGreaterThan(0);
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

describe("DATA's second table and notes (17-10, D-16)", () => {
  it("the layout-marks columns read each section's mark, then the channels' flat edge and walls", () => {
    expect(layoutMarkColumnName({ section: "nose", mark: "edge" })).toBe("Nose edge");
    expect(layoutMarkColumnName({ section: "center", mark: "flat" })).toBe("Center flat");
    expect(layoutMarkColumnName({ section: "center", mark: "trough" })).toBe("Center trough");
    expect(layoutMarkColumnName({ section: "tail", mark: "flat" })).toBe("Tail flat");
    expect(layoutMarkColumnName({ section: "channels", mark: "flat" })).toBe("Flat edge");
    expect([1, 2, 3, 4].map((index) => layoutMarkColumnName({ section: "channels", mark: "wall", index }))).toEqual(["Wall 1", "Wall 2", "Wall 3", "Wall 4"]);
    expect(BOTTOM_COPY.marksHeading(false)).toBe("Layout marks · off the stringer");
    expect(BOTTOM_COPY.marksHeading(true)).toBe("Layout marks · off the stringer (mm)");
  });

  it("the marks note speaks of the channels only when they are cut (the founder, 2026-11-09), and names the stagger only for a staggered set", () => {
    const measured = "Layout marks are measured out from the stringer at each station, the way a concave's edge or a channel's walls are ruled onto the blank.";
    const base = `${measured} The channels abut: the stringer is the first peak, each channel's floor deepens out to its wall, and the top of that wall is the next channel's peak`;
    const two = inchesToMm(2);
    const quarter = inchesToMm(1 / 4);
    // No channels cut — None, or a set with no depth — never mentions them.
    expect(layoutMarksNote({ count: 0, depth: quarter, longest: "outer", stagger: two }, "imperial")).toBe(measured);
    expect(layoutMarksNote({ count: 6, depth: mm(0), longest: "outer", stagger: two }, "imperial")).toBe(measured);
    // Channels cut: how they abut, and the stagger only when there is one.
    expect(layoutMarksNote({ count: 6, depth: quarter, longest: "same", stagger: two }, "imperial")).toBe(`${base}.`);
    expect(layoutMarksNote({ count: 6, depth: quarter, longest: "outer", stagger: mm(0) }, "imperial")).toBe(`${base}.`);
    for (const system of SYSTEMS) {
      expect(layoutMarksNote({ count: 6, depth: quarter, longest: "outer", stagger: two }, system)).toBe(
        `${base}; a wall is ruled only from where its own channel starts — the outer pair first, each channel out from it ${formatDim(two, system)} shorter.`,
      );
    }
  });

  it("the reference-rows note: the wide point and the front fins (or a single fin) through the station formatter", () => {
    const at = { widePoint: inchesToMm(36), frontFins: inchesToMm(10.875) };
    for (const system of SYSTEMS) {
      expect(referenceRowsNote(at, true, system)).toBe(
        `Wide point ${formatBottomStation(at.widePoint, system)} and front fins ${formatBottomStation(at.frontFins, system)} from the tail are the two rows in full ink.`,
      );
    }
    expect(referenceRowsNote(at, true, "imperial")).toBe('Wide point 36" and front fins 10 7/8" from the tail are the two rows in full ink.');
    expect(referenceRowsNote(at, false, "imperial")).toMatch(/ and fin 10 7\/8" from the tail /);
  });

  it("the floor note in DATA is the panel's own sentence, named for its cut — never a third wording", () => {
    for (const system of SYSTEMS) {
      const concave = flag("center", [inchesToMm(30)], []);
      expect(dataFloorNote(concave, "Deep Single Concave", board, system)).toBe(`Deep Single Concave: ${floorWarning(concave, board, system)}`);
      const channels = flag("channels", [], [inchesToMm(2)]);
      expect(dataFloorNote(channels, "", board, system)).toBe(floorWarning(channels, board, system));
      expect(dataFloorNote(undefined, "Deep Single Concave", board, system)).toBeNull();
    }
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

describe("BOTTOM's WINGS row (17-12, D-19): the words, and every figure through the app's own formatters", () => {
  const one = [{ depth: inchesToMm(1 / 4), station: inchesToMm(11.5) }];
  const two = [...one, { depth: inchesToMm(1 / 8), station: inchesToMm(7.5) }];

  it("a wing's depth is a mark and its station a dim, in both systems", () => {
    for (const system of SYSTEMS) {
      expect(wingWords(two, system)).toEqual(two.map((w) => ({ depth: formatMark(w.depth, system), station: formatBottomStation(w.station, system) })));
    }
    expect(wingWords(one, "imperial")).toEqual([{ depth: '1/4"', station: '11 1/2"' }]);
    // Metric: whole millimetres for the depth, centimetres to one decimal for the station (CLAUDE.md Rule 2).
    expect(wingWords(one, "metric")).toEqual([{ depth: "6 mm", station: "29.2 cm" }]);
    expect(wingWords([], "imperial")).toEqual([]);
  });

  it("the heading echoes one wing with its depth, two wings by their stations", () => {
    expect(BOTTOM_COPY.wingsEcho(wingWords(one, "imperial"))).toBe('1/4" wing at 11 1/2"');
    expect(BOTTOM_COPY.wingsEcho(wingWords(two, "imperial"))).toBe('wings at 11 1/2" and 7 1/2"');
    expect(BOTTOM_COPY.wingsEcho(wingWords(one, "metric"))).toBe("6 mm wing at 29.2 cm");
  });

  it("the top view's caption names the wings on a winged board, and reads as it always has without any", () => {
    expect(BOTTOM_COPY.topViewNoseLeft("6'2\"")).toBe("Nose left · 6'2\"");
    expect(BOTTOM_COPY.topViewNoseLeft("5'8\"", wingWords(one, "imperial"))).toBe("Nose left · 5'8\" · wing 1/4\" at 11 1/2\"");
    expect(BOTTOM_COPY.topViewNoseLeft("5'8\"", wingWords(two, "imperial"))).toBe("Nose left · 5'8\" · wings at 11 1/2\" and 7 1/2\"");
  });

  it("the menu opens on the narrowest outline, and each rule has its own note", () => {
    expect(DEFAULT_BOTTOM.wingRule).toBe("narrowest");
    expect(Object.keys(BOTTOM_COPY.wingRuleOptions)).toEqual(["narrowest", "natural"]);
    expect(BOTTOM_COPY.wingRuleOptions).toEqual({ narrowest: "Narrowest outline", natural: "Natural outline, before the wing" });
    expect(BOTTOM_COPY.wingRuleNotes.narrowest).toMatch(/^The real rail behind the wing/);
    expect(BOTTOM_COPY.wingRuleNotes.natural).toMatch(/^The curve you drew before the wing/);
  });
});

describe("bottomDepthCell: the Deepest cut and Rail lift cells, on DATA and on the printed page (17-15; the founder, 2026-11-10)", () => {
  // The three depths below are stand-ins for the three bands of the rule, not a board's figures: one under the
  // quarter-millimetre line, one between it and half a millimetre, one between half a millimetre and half a sixteenth.
  const NOTHING = mm(0.1);
  const UNDER_BOTH_TAPES = mm(0.4);
  const UNDER_THE_INCH_TAPE_ONLY = mm(0.7);

  it("under a quarter of a millimetre nothing is cut, and the cell is the dash — the rule as it always was", () => {
    for (const system of SYSTEMS) {
      expect(bottomDepthCell(mm(0), system)).toBe(BOTTOM_COPY.emptyCell);
      expect(bottomDepthCell(NOTHING, system)).toBe(BOTTOM_COPY.emptyCell);
      expect(bottomDepthCell(mm(BOTTOM_DATA_DEPTH_SHOWN - 1e-6), system)).toBe(BOTTOM_COPY.emptyCell);
    }
  });

  it("a depth that is there but too small for the tape reads less than its smallest step, never a nought", () => {
    expect(bottomDepthCell(BOTTOM_DATA_DEPTH_SHOWN, "imperial")).toBe('<1/16"');
    expect(bottomDepthCell(BOTTOM_DATA_DEPTH_SHOWN, "metric")).toBe("<1");
    expect(bottomDepthCell(UNDER_BOTH_TAPES, "imperial")).toBe('<1/16"');
    expect(bottomDepthCell(UNDER_BOTH_TAPES, "metric")).toBe("<1");
    for (const system of SYSTEMS) {
      for (const depth of [BOTTOM_DATA_DEPTH_SHOWN, UNDER_BOTH_TAPES]) {
        expect(bottomDepthCell(depth, system)).not.toBe(formatMarkBare(mm(0), system));
      }
    }
  });

  it("a millimetre tape reads what an inch tape cannot: between half a millimetre and half a sixteenth", () => {
    expect(bottomDepthCell(UNDER_THE_INCH_TAPE_ONLY, "imperial")).toBe('<1/16"');
    expect(bottomDepthCell(UNDER_THE_INCH_TAPE_ONLY, "metric")).toBe(formatMarkBare(mm(1), "metric"));
  });

  it("from half a step up the cell is the mark itself, as it always was", () => {
    const halfSixteenth = inchesToMm(1 / 32);
    expect(bottomDepthCell(halfSixteenth, "imperial")).toBe(formatMarkBare(inchesToMm(1 / 16), "imperial"));
    expect(bottomDepthCell(mm(0.5), "metric")).toBe(formatMarkBare(mm(1), "metric"));
    for (const system of SYSTEMS) {
      for (const sixteenths of [1, 2, 3, 5, 8]) {
        const depth = inchesToMm(sixteenths / 16);
        expect(bottomDepthCell(depth, system)).toBe(formatMarkBare(depth, system));
      }
    }
  });

  it("on the four stock boards with a cut in every section and eight channels, no depth cell reads a nought — and some read less-than", () => {
    let lessThan = 0;
    for (const preset of BOARD_PRESETS) {
      const found = phase16Boards().find((b) => b.label === `${preset.id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`)!;
      const fields = found.fields;
      const bottomBoard = designBottomBoard(fields.outline, buildOutline(fields.outline), designSideProfile(fields, LIVE_DESIGN_RULES), designFinPlacement(fields));
      const bottom: BoardBottom = structuredClone(DEFAULT_BOTTOM);
      bottom.nose = startingCut("nose", "Teardrop Nose Concave", bottomBoard);
      bottom.center = startingCut("center", "Early Double Concave", bottomBoard);
      bottom.tail = startingCut("tail", "Spiral Vee", bottomBoard);
      bottom.channels = startingChannels(8, bottomBoard, bottom.channels);
      const rows = bottomDataRows(resolveBottom(bottom, bottomBoard), bottomBoard);
      expect(rows.length, preset.id).toBeGreaterThan(8);
      for (const system of SYSTEMS) {
        const nought = formatMarkBare(mm(0), system);
        for (const row of rows) {
          for (const depth of [row.deepest, row.railLift]) {
            const cell = bottomDepthCell(depth, system);
            expect(cell, `${preset.id} ${system} at ${row.station}`).not.toBe(nought);
            if (cell.startsWith("<")) {
              lessThan += 1;
              // What used to print as a nought, and nothing else, is what reads less-than now.
              expect(formatMarkBare(depth, system), `${preset.id} ${system} at ${row.station}`).toBe(nought);
              expect(depth).toBeGreaterThanOrEqual(BOTTOM_DATA_DEPTH_SHOWN);
            } else if (cell !== BOTTOM_COPY.emptyCell) {
              expect(cell).toBe(formatMarkBare(depth, system));
            }
          }
        }
      }
    }
    expect(lessThan, "the stock boards do carry such depths (non-vacuity)").toBeGreaterThan(0);
  }, 120_000);
});

describe("DATA's note says what Rail lift counts, in the founder's words (2026-11-11: \"Use the sentence\")", () => {
  const FOUNDER = "Rail lift is the vee's or belly's lift at the rail; a channel is cut after the rail is shaped and never counts.";
  const FIRST = "Deepest cut is the largest gap under a straightedge laid rail to rail at that station.";
  const LAST = "Stringer left is the planed thickness less the cut at the stringer.";

  it("the middle sentence is his, word for word; the first and last are as they were; the old gap sentence is gone", () => {
    const note = BOTTOM_COPY.depthsNote;
    expect(note).toContain(FOUNDER);
    expect(note.startsWith(FIRST)).toBe(true);
    expect(note.endsWith(LAST)).toBe(true);
    expect(note).not.toContain("Rail lift is that gap at the rail.");
    // Three sentences in all, each ending in a full stop.
    expect(note.split(/(?<=\.)\s+/)).toEqual([FIRST, FOUNDER, LAST]);
  });
});
