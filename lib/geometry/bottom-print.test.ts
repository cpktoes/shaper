import { describe, expect, it } from "vitest";
import { BOTTOM_SECTION_NAME, CHANNELS_COPY, runOptionLabel } from "@/components/bottom/bottom-copy";
import { phase16Boards } from "./__fixtures__/phase16-boards";
import { formatBottomStation } from "./blank-reasons";
import {
  BOTTOM_CUT_NAMES,
  BOTTOM_SECTIONS,
  bottomHasCut,
  channelFit,
  cutKind,
  DEFAULT_BOTTOM,
  resolveBottom,
  startingChannels,
  startingCut,
  stationFromNearestTip,
  type BoardBottom,
  type BottomBoard,
  type BottomCutName,
  type BottomSectionKey,
  type ChannelCount,
} from "./bottom";
import { BOTTOM_PRINT_NATURAL_NOTE, bottomPrintCuts, bottomPrintLines, channelRunWords } from "./bottom-print";
import type { DesignSummaryFields } from "./design";
import { designBottomBoard, designFinPlacement, designSideProfile, LIVE_DESIGN_RULES } from "./design";
import { frontFinStation } from "./fins";
import { formatDimBare, formatMark, formatMarkOrLess } from "./measure-display";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm, mm, UNITS_SYSTEMS, type Mm, type UnitsSystem } from "./units";

/*
 * Every expected line here is put together from the app's own formatters and the cut's own numbers — never typed
 * (CLAUDE.md Rule 1). The boards are the four presets as their cards open them (the Phase 16 set), and a Fish with a
 * wing, each built through the app.
 */

function presetFields(): { id: string; fields: DesignSummaryFields }[] {
  const all = phase16Boards();
  const presets = BOARD_PRESETS.map((preset) => {
    const label = `${preset.id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`;
    return { id: preset.id as string, fields: all.find((b) => b.label === label)!.fields };
  });
  const fish = presets.find((p) => p.id === "fish")!;
  const wing = {
    station: mm(frontFinStation(designFinPlacement(fish.fields)) + inchesToMm(4)),
    depth: inchesToMm(1 / 4),
    run: inchesToMm(1),
    radius: mm(0),
    lock: null,
    finOffset: mm(0),
  };
  return [...presets, { id: "fishwing", fields: { ...fish.fields, outline: { ...fish.fields.outline, wings: [wing] } } }];
}

function boardOf(fields: DesignSummaryFields): BottomBoard {
  return designBottomBoard(fields.outline, buildOutline(fields.outline), designSideProfile(fields, LIVE_DESIGN_RULES), designFinPlacement(fields));
}

const BOARDS = presetFields().map(({ id, fields }) => ({ id, board: boardOf(fields) }));
const byId = (id: string) => BOARDS.find((b) => b.id === id)!.board;

/** A bottom with the named sections on their starting numbers, and channels picked as the store picks them. */
function bottomOf(board: BottomBoard, names: Partial<Record<BottomSectionKey, BottomCutName>>, count: ChannelCount | 0 = 0): BoardBottom {
  const bottom = structuredClone(DEFAULT_BOTTOM);
  for (const section of BOTTOM_SECTIONS) {
    const name = names[section];
    if (name) bottom[section] = startingCut(section, name, board);
  }
  if (count > 0) bottom.channels = startingChannels(count as ChannelCount, board, bottom.channels);
  return bottom;
}

const lines = (board: BottomBoard, bottom: BoardBottom, system: UnitsSystem) => bottomPrintLines(resolveBottom(bottom, board), board, system);

/** A range as one line of running text carries it: the unit once, at the end, in Metric (`58.1 to 0.0 cm`). */
const range = (from: Mm, to: Mm, system: UnitsSystem) => `${formatDimBare(from, system)} to ${formatBottomStation(to, system)}`;

/** `58" to 4" from the tail, deepest 23 7/16"` for a cut, taped from its nearest tip. */
function stations(section: BottomSectionKey, cut: { start: Mm; deepest: Mm; end: Mm }, board: BottomBoard, system: UnitsSystem): string {
  const taped = (s: Mm) => stationFromNearestTip(section, s, board);
  const tip = section === "nose" ? "nose" : "tail";
  return `${range(taped(cut.start), taped(cut.end), system)} from the ${tip}, deepest ${formatBottomStation(taped(cut.deepest), system)}`;
}

describe("a flat bottom prints no lines", () => {
  it.each(BOARDS.map((b) => [b.id, b.board] as const))("%s", (_id, board) => {
    for (const system of UNITS_SYSTEMS) {
      expect(lines(board, DEFAULT_BOTTOM, system)).toEqual([]);
      expect(bottomPrintCuts(resolveBottom(DEFAULT_BOTTOM, board))).toEqual([]);
    }
  });

  it("a cut picked but left at no depth is flat too — the same rule the order form's page count reads", () => {
    const board = byId("shortboard");
    const bottom = bottomOf(board, { center: "Deep Single Concave" });
    bottom.center = { ...bottom.center, depth: mm(0) };
    expect(bottomHasCut(bottom)).toBe(false);
    expect(lines(board, bottom, "imperial")).toEqual([]);
  });

  it("channels picked but left at no depth print nothing", () => {
    const board = byId("shortboard");
    const bottom = bottomOf(board, {}, 6);
    bottom.channels = { ...bottom.channels, depth: mm(0) };
    expect(bottomHasCut(bottom)).toBe(false);
    expect(lines(board, bottom, "imperial")).toEqual([]);
  });
});

describe("one line per cut, in the order Nose, Center, Tail, Channels; flats left out", () => {
  it.each(BOARDS.map((b) => [b.id, b.board] as const))("%s: every name, alone, prints exactly one line that opens with its section and name", (_id, board) => {
    for (const section of BOTTOM_SECTIONS) {
      for (const name of BOTTOM_CUT_NAMES[section]) {
        const bottom = bottomOf(board, { [section]: name });
        for (const system of UNITS_SYSTEMS) {
          const out = lines(board, bottom, system);
          if (cutKind(name) === "flat") {
            expect(out).toEqual([]);
          } else {
            expect(out).toHaveLength(1);
            expect(out[0].startsWith(`${BOTTOM_SECTION_NAME[section]}: ${name} `)).toBe(true);
            expect(out[0].endsWith(".")).toBe(true);
          }
          expect(out.length > 0).toBe(bottomHasCut(bottom));
        }
      }
    }
  });

  it("three cuts and channels print four lines in that order, and the cuts list names the same four", () => {
    const board = byId("longboard");
    const bottom = bottomOf(board, { nose: "Teardrop Nose Concave", center: "Continuous Belly / Rolled Mid", tail: "Rolled Vee" }, 4);
    const resolved = resolveBottom(bottom, board);
    const out = bottomPrintLines(resolved, board, "imperial");
    expect(out.map((line) => line.split(":")[0])).toEqual([BOTTOM_SECTION_NAME.nose, BOTTOM_SECTION_NAME.center, BOTTOM_SECTION_NAME.tail, CHANNELS_COPY.heading]);
    const cuts = bottomPrintCuts(resolved);
    expect(cuts.map((c) => c.key)).toEqual(["nose", "center", "tail", "channels"]);
    expect(cuts.map((c) => c.head)).toEqual([
      `${BOTTOM_SECTION_NAME.nose}: ${bottom.nose.name}`,
      `${BOTTOM_SECTION_NAME.center}: ${bottom.center.name}`,
      `${BOTTOM_SECTION_NAME.tail}: ${bottom.tail.name}`,
      `${CHANNELS_COPY.heading}: 4`,
    ]);
    expect(cuts.map((c) => c.deepest)).toEqual([resolved.nose.deepest, resolved.center.deepest, resolved.tail.deepest, resolved.channels.deepest]);
    // every line opens with its cut's head
    out.forEach((line, i) => expect(line.startsWith(cuts[i].head)).toBe(true));
  });

  it("a flat between two cuts is left out, the others keep their order", () => {
    const board = byId("midlength");
    const out = lines(board, bottomOf(board, { nose: "Blended Nose Concave", tail: "Spiral Vee" }), "imperial");
    expect(out.map((line) => line.split(":")[0])).toEqual([BOTTOM_SECTION_NAME.nose, BOTTOM_SECTION_NAME.tail]);
  });
});

describe("each kind of cut reads its own numbers, marks as marks and stations as dims", () => {
  describe.each(UNITS_SYSTEMS.map((s) => [s] as const))("%s", (system) => {
    it("a single concave: its depth, its run from the tail, its deepest station and its distance off the rail", () => {
      const board = byId("shortboard");
      const bottom = bottomOf(board, { center: "Deep Single Concave" });
      const cut = resolveBottom(bottom, board).center;
      expect(lines(board, bottom, system)).toEqual([
        `Center: Deep Single Concave ${formatMark(cut.depth, system)}, ${stations("center", cut, board, system)}; ${formatMark(cut.offRail, system)} off the rail.`,
      ]);
    });

    it("a nose cut is taped from the nose, and the Teardrop says it closes to a point", () => {
      const board = byId("longboard");
      const bottom = bottomOf(board, { nose: "Teardrop Nose Concave" });
      const cut = resolveBottom(bottom, board).nose;
      expect(cut.closesToPoint).toBe(true);
      expect(lines(board, bottom, system)).toEqual([
        `Nose: Teardrop Nose Concave ${formatMark(cut.depth, system)}, ${stations("nose", cut, board, system)}; ${formatMark(cut.offRail, system)} off the rail, closes to a point.`,
      ]);
      // from the nose the start is the smaller figure: a nose cut starts near the nose and ends toward the center
      expect(stationFromNearestTip("nose", cut.start, board)).toBeLessThan(stationFromNearestTip("nose", cut.end, board));
    });

    it("a nose single that does not close to a point says nothing about it", () => {
      const board = byId("midlength");
      const out = lines(board, bottomOf(board, { nose: "Blended Nose Concave" }), system);
      expect(out[0]).not.toContain("closes to a point");
      expect(out[0]).toContain("from the nose");
    });

    it("a double concave adds its flat and its trough off the stringer", () => {
      const board = byId("shortboard");
      const bottom = bottomOf(board, { center: "Early Double Concave" });
      const cut = resolveBottom(bottom, board).center;
      expect(lines(board, bottom, system)).toEqual([
        `Center: Early Double Concave ${formatMark(cut.depth, system)}, ${stations("center", cut, board, system)}; ` +
          `${formatMark(cut.offRail, system)} off the rail, flat ${formatMark(cut.offStringer, system)} and trough ${formatMark(cut.troughAt, system)} off the stringer.`,
      ]);
    });

    it("the Spiral Vee is a double with its vee lift named after the depth", () => {
      const board = byId("midlength");
      const bottom = bottomOf(board, { tail: "Spiral Vee" });
      const cut = resolveBottom(bottom, board).tail;
      expect(cut.spiral).toBe(true);
      expect(lines(board, bottom, system)).toEqual([
        `Tail: Spiral Vee ${formatMark(cut.depth, system)} with ${formatMark(cut.veeLift, system)} vee lift, ${stations("tail", cut, board, system)}; ` +
          `${formatMark(cut.offRail, system)} off the rail, flat ${formatMark(cut.offStringer, system)} and trough ${formatMark(cut.troughAt, system)} off the stringer.`,
      ]);
    });

    it.each([
      ["tail", "Panel Vee", "fish"],
      ["tail", "Rolled Vee", "longboard"],
      ["center", "Continuous Belly / Rolled Mid", "longboard"],
      ["nose", "Rolled Belly Entry", "longboard"],
      ["nose", "Reverse Vee Nose", "shortboard"],
    ] as const)("a vee or a belly reads its lift at the rail and no distance off the rail: %s %s", (section, name, id) => {
      const board = byId(id);
      const bottom = bottomOf(board, { [section]: name });
      const cut = resolveBottom(bottom, board)[section];
      expect(lines(board, bottom, system)).toEqual([
        `${BOTTOM_SECTION_NAME[section]}: ${name} ${formatMark(cut.depth, system)} rail lift, ${stations(section, cut, board, system)}.`,
      ]);
    });

    it("the Tri-Plane adds its flat panel off the stringer", () => {
      const board = byId("shortboard");
      const bottom = bottomOf(board, { center: "Tri-Plane Hull Center" });
      const cut = resolveBottom(bottom, board).center;
      expect(cut.offStringer).toBeGreaterThan(0);
      expect(lines(board, bottom, system)).toEqual([
        `Center: Tri-Plane Hull Center ${formatMark(cut.depth, system)} rail lift, ${stations("center", cut, board, system)}; panel ${formatMark(cut.offStringer, system)} off the stringer.`,
      ]);
    });

    it.each([4, 6, 8] as const)("%i channels: the count, the width they get, the depth, the run, which pair is longest and the stagger", (count) => {
      const board = byId("shortboard");
      const bottom = bottomOf(board, {}, count);
      const resolved = resolveBottom(bottom, board);
      const ch = resolved.channels;
      const width = channelFit(ch, board, resolved.wingRule).width;
      const longest = ch.longest === "same" ? "all the same length" : `${ch.longest} pair longest, ${formatBottomStation(ch.stagger, system)} stagger`;
      expect(lines(board, bottom, system)).toEqual([
        `Channels: ${count} at ${formatMark(width, system)}, ${formatMark(ch.depth, system)} deep, ` +
          `${range(ch.start, ch.end, system)} from the tail, deepest ${formatBottomStation(ch.deepest, system)}; ${runOptionLabel(ch.run, board.toeDegrees)}, ${longest}.`,
      ]);
    });

    it("channels all the same length carry no stagger", () => {
      const board = byId("shortboard");
      const bottom = bottomOf(board, {}, 6);
      bottom.channels = { ...bottom.channels, longest: "same" };
      const out = lines(board, bottom, system);
      expect(out[0].endsWith(", all the same length.")).toBe(true);
      expect(out[0]).not.toContain("stagger");
    });

    it("the inner pair longest says so", () => {
      const board = byId("shortboard");
      const bottom = bottomOf(board, {}, 6);
      bottom.channels = { ...bottom.channels, longest: "inner" };
      expect(lines(board, bottom, system)[0]).toContain(`, inner pair longest, ${formatBottomStation(bottom.channels.stagger, system)} stagger.`);
    });

    it("channels squeezed to fit print the width they get, not the width asked for", () => {
      const board = byId("shortboard");
      const bottom = bottomOf(board, {}, 8);
      bottom.channels = { ...bottom.channels, width: inchesToMm(4) };
      const resolved = resolveBottom(bottom, board);
      const fit = channelFit(resolved.channels, board, resolved.wingRule);
      expect(fit.squeezed).toBe(true);
      const out = bottomPrintLines(resolved, board, system);
      expect(out[0].startsWith(`Channels: 8 at ${formatMark(fit.width, system)}, `)).toBe(true);
      expect(formatMark(fit.width, system)).not.toBe(formatMark(bottom.channels.width, system));
    });
  });

  it("the run's words are the screen's own, for every run on every board", () => {
    for (const { board } of BOARDS) {
      for (const run of ["parallel", "rail", "toe"] as const) {
        expect(channelRunWords(run, board.toeDegrees)).toBe(runOptionLabel(run, board.toeDegrees));
      }
    }
    for (const toe of [0, 3.2]) expect(channelRunWords("toe", toe)).toBe(runOptionLabel("toe", toe));
  });
});

describe("Metric: a range pair carries its unit once, marks read whole millimetres and stations centimetres", () => {
  const board = byId("shortboard");
  const bottom = bottomOf(board, { center: "Deep Single Concave" }, 6);
  const out = lines(board, bottom, "metric");

  it("no inch mark anywhere", () => {
    for (const line of out) expect(line).not.toContain('"');
  });

  it("each line's range reads `{start} to {end} cm` with the start bare", () => {
    for (const line of out) {
      expect(line).toMatch(/, \d+\.\d to \d+\.\d cm from the tail, deepest \d+\.\d cm/);
    }
  });

  it("the depth and the distance off the rail are whole millimetres", () => {
    expect(out[0]).toMatch(/^Center: Deep Single Concave \d+ mm, /);
    expect(out[0]).toMatch(/; \d+ mm off the rail\.$/);
    expect(out[1]).toMatch(/^Channels: 6 at \d+ mm, \d+ mm deep, /);
    expect(out[1]).toMatch(/, \d+\.\d cm stagger\.$/);
  });

  it("Imperial carries the inch mark on every figure", () => {
    const imperial = lines(board, bottom, "imperial");
    expect(imperial[0]).toMatch(/^Center: Deep Single Concave [\d /]+", [\d /]+" to [\d /]+" from the tail, deepest [\d /]+"; [\d /]+" off the rail\.$/);
    for (const line of imperial) expect(line).not.toMatch(/ (mm|cm)\b/);
  });
});

describe("the wing rule's note (D-19): one more line when Off Rail is measured from the natural outline on a winged board", () => {
  const winged = byId("fishwing");
  const plain = byId("fish");
  const single = (board: BottomBoard, rule: BoardBottom["wingRule"]): BoardBottom => ({ ...bottomOf(board, { center: "Deep Single Concave" }), wingRule: rule });

  it("Natural on a winged board with a cut that is measured off the rail adds the note as the last line", () => {
    for (const system of UNITS_SYSTEMS) {
      const out = lines(winged, single(winged, "natural"), system);
      expect(out).toHaveLength(2);
      expect(out[1]).toBe(BOTTOM_PRINT_NATURAL_NOTE);
    }
  });

  it("Narrowest, the rule every board opens with, adds nothing", () => {
    expect(lines(winged, single(winged, "narrowest"), "imperial")).toHaveLength(1);
  });

  it("a board with no wing never prints it — the two outlines are the same line there", () => {
    expect(lines(plain, single(plain, "natural"), "imperial")).toHaveLength(1);
  });

  it("a winged board whose only cut runs out to the rail (a vee) has no Off Rail to speak of", () => {
    const vee: BoardBottom = { ...bottomOf(winged, { tail: "Panel Vee" }), wingRule: "natural" };
    expect(lines(winged, vee, "imperial")).toHaveLength(1);
  });

  it("channels are measured off the rail too", () => {
    const channels: BoardBottom = { ...bottomOf(winged, {}, 6), wingRule: "natural" };
    const out = lines(winged, channels, "imperial");
    expect(out).toHaveLength(2);
    expect(out[1]).toBe(BOTTOM_PRINT_NATURAL_NOTE);
  });

  it("a flat bottom prints nothing, whatever the rule", () => {
    expect(lines(winged, { ...structuredClone(DEFAULT_BOTTOM), wingRule: "natural" }, "imperial")).toEqual([]);
  });
});

describe("a cut that is there never reads as a nought (17-15; the founder, 2026-11-10)", () => {
  // The sliders step by a whole sixteenth or a whole millimetre, so only a board file made outside the app can hold a
  // depth this small. A stand-in depth, not a board's figure: there, and under half a step of either tape.
  const TINY = mm(0.4);
  const less = (system: UnitsSystem) => formatMarkOrLess(TINY, system);

  it("the stand-in is one the plain mark would print as a nought", () => {
    for (const system of UNITS_SYSTEMS) expect(formatMark(TINY, system)).toBe(formatMark(mm(0), system));
    expect(less("imperial")).toBe('<1/16"');
    expect(less("metric")).toBe("<1 mm");
  });

  describe.each(UNITS_SYSTEMS.map((s) => [s] as const))("%s", (system) => {
    it("a single concave's depth", () => {
      const board = byId("shortboard");
      const bottom = bottomOf(board, { center: "Deep Single Concave" });
      bottom.center = { ...bottom.center, depth: TINY };
      const cut = resolveBottom(bottom, board).center;
      expect(lines(board, bottom, system)).toEqual([
        `Center: Deep Single Concave ${less(system)}, ${stations("center", cut, board, system)}; ${formatMark(cut.offRail, system)} off the rail.`,
      ]);
    });

    it("a Spiral Vee's depth and its vee lift", () => {
      const board = byId("midlength");
      const bottom = bottomOf(board, { tail: "Spiral Vee" });
      bottom.tail = { ...bottom.tail, depth: TINY, veeLift: TINY };
      const cut = resolveBottom(bottom, board).tail;
      expect(cut.depth).toBe(TINY);
      expect(cut.veeLift).toBe(TINY);
      expect(lines(board, bottom, system)).toEqual([
        `Tail: Spiral Vee ${less(system)} with ${less(system)} vee lift, ${stations("tail", cut, board, system)}; ` +
          `${formatMark(cut.offRail, system)} off the rail, flat ${formatMark(cut.offStringer, system)} and trough ${formatMark(cut.troughAt, system)} off the stringer.`,
      ]);
    });

    it("a vee's rail lift, and the channels' depth", () => {
      const board = byId("fish");
      const bottom = bottomOf(board, { tail: "Panel Vee" }, 6);
      bottom.tail = { ...bottom.tail, depth: TINY };
      bottom.channels = { ...bottom.channels, depth: TINY };
      const out = lines(board, bottom, system);
      expect(out).toHaveLength(2);
      expect(out[0]).toContain(`Tail: Panel Vee ${less(system)} rail lift, `);
      expect(out[1]).toContain(`, ${less(system)} deep, `);
    });

    it("a cut on a tape-readable depth reads exactly as it always has", () => {
      const board = byId("shortboard");
      const bottom = bottomOf(board, { center: "Deep Single Concave" });
      const cut = resolveBottom(bottom, board).center;
      expect(formatMarkOrLess(cut.depth, system)).toBe(formatMark(cut.depth, system));
    });
  });
});
