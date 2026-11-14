import { describe, expect, it, vi } from "vitest";
// Fitting a board file is slow work, and a busy machine (the whole suite at once) can stretch a case past the default five
// seconds: the cases here are generous rather than flaky.
vi.setConfig({ testTimeout: 60_000 });
import { brdFinHeaderFields, brdText, formatBrdNumber } from "../export/brd";
import { readAnyBrd, type ReadBrdBoard } from "../export/brd-read";
import type { P2 } from "./bezier-fit";
import { buildBoardSurface } from "./board-surface";
import {
  BRD_FIN_SAME_MM,
  BRD_FIN_TIE_MM,
  brdFinFields,
  brdFinSystemWord,
  brdFinsFromLine,
  finMarksOfFile,
  finMarksOfPlacement,
  finSystemFromBrdWord,
  fitBrdFins,
  noBrdFins,
} from "./brd-fins";
import { fitBoardToBrd } from "./brd-fit";
import { designCrossSectionInput, designFinPlacement, designSideProfile, deriveEffectiveRails, LIVE_DESIGN_RULES, type DesignSummaryFields } from "./design";
import {
  DEFAULT_FIN_PLACEMENT_SPEC,
  FIN_BASE_LENGTH_RANGE_IN,
  FIN_POSITION_RANGE_IN,
  FIN_SYSTEMS,
  FIN_TOE_RANGE_IN,
  offRailTunerWindow,
  resetAdvanced,
  type FinAdvancedSpec,
  type FinPlacementSpec,
  type FinSetup,
  type ThrusterFrontModel,
  type TwinTemplate,
} from "./fins";
import { buildOutline } from "./outline";
import { inchesToMm, mm } from "./units";
import { phase16Boards, phase16WingBoards } from "./__fixtures__/phase16-boards";

/**
 * Fins in a board file, both ways (quick 261113-qyz). The proof with a known answer is the app's own export: a board's
 * fins written into the file's fin line as the format has them, read back by the forgiving reader, the outline fitted as
 * the look fits it, the fins fitted — and FINS' own four marks on the original must come back. The founder's twin is here
 * only as its nine figures, on a stock board (the file itself is never in the repo).
 */

const IN = (value: number) => inchesToMm(value) as number;
const ascii = (text: string) => Uint8Array.from(text, (ch) => ch.charCodeAt(0));

/** The text of a board as the app writes it, with no fins. */
function boardText(fields: DesignSummaryFields): string {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length),
    geometry,
    rockerAt: profile.rockerAt,
  });
  return brdText(surface).text;
}

/** The same text with the file's fin line (and word) set the way the writer sets them, spliced rather than re-written. */
function withFinLine(text: string, nine: readonly number[], word: string | null): string {
  const fields = brdFinHeaderFields({ p50: nine, p51: word ?? "" });
  const p50 = fields.find(([k]) => k === "p50")![1];
  const lines = text.split("\n").flatMap((line) => {
    if (!line.startsWith("p50 : ")) return [line];
    return word === null ? [`p50 : ${p50}`] : [`p51 : ${word}`, `p50 : ${p50}`];
  });
  return lines.join("\n");
}

function readBoard(text: string): ReadBrdBoard {
  const read = readAnyBrd(ascii(text));
  if (!read.ok) throw new Error("the app's own file would not read");
  return read.board;
}

const shortboard = phase16Boards().find((b) => b.label === "shortboard|asis|hard")!.fields;
const shortboardText = boardText(shortboard);
const shortboardRead = readBoard(shortboardText);
const shortboardFit = fitBoardToBrd({
  length: shortboardRead.length,
  outline: shortboardRead.outline,
  bottom: shortboardRead.bottom,
  deck: shortboardRead.deck,
});

/** The founder's twin's nine figures (centimetres), as figures only. */
const TWIN_NINE = [24.13, 13.208, 35.814, 12.7, 0, 0, 0, 0, 5.4];

function fitStock(nine: readonly number[], word: string | null = "Futures") {
  const board = readBoard(withFinLine(shortboardText, nine, word));
  return { board, fit: fitBrdFins(board.fins, board.outline, shortboardFit.outline) };
}

const place = (spec: FinPlacementSpec) => designFinPlacement({ outline: shortboard.outline, fins: spec, finsImportTemplate: true });
const specOf = (setup: FinSetup, adv: Partial<FinAdvancedSpec> = {}, model?: ThrusterFrontModel, template: TwinTemplate = "upright"): FinPlacementSpec => ({
  ...DEFAULT_FIN_PLACEMENT_SPEC,
  finSetup: setup,
  frontModel: model ?? DEFAULT_FIN_PLACEMENT_SPEC.frontModel,
  twinTemplate: template,
  advanced: { ...resetAdvanced(setup, template), ...adv },
});

describe("brdFinsFromLine: the rules a file's fins are held to", () => {
  // A plain 100-wide board (half-width 250 mm) 2000 mm long, as a file's outline reads: tail to nose, half-widths.
  const outline: P2[] = [[0, 150], [500, 250], [1500, 250], [2000, 0]];
  const length = mm(2000);
  const read = (nine: number[], word: string | null = null) => brdFinsFromLine(nine, outline, length, word);

  it("reads a twin's side fin from slots 0 to 3 and nothing from slots 6 to 8", () => {
    const fins = read([24.13, 13.208, 35.814, 12.7, 0, 0, 7, 8, 5.4]);
    expect(fins.side!.back[0]).toBeCloseTo(241.3, 9);
    expect(fins.side!.back[1]).toBeCloseTo(132.08, 9);
    expect(fins.side!.front[0]).toBeCloseTo(358.14, 9);
    expect(fins.side!.front[1]).toBeCloseTo(127, 9);
    expect(fins.centre).toBeNull();
    expect(fins.dropped).toBe(false);
  });

  it("reads a centre fin from slots 4 and 5 and a side pair with it", () => {
    const fins = read([24.13, 13.208, 35.814, 12.7, 8.89, 20.32, 0, 0, 0]);
    expect(fins.centre!.back).toBeCloseTo(88.9, 9);
    expect(fins.centre!.front).toBeCloseTo(203.2, 9);
    expect(fins.side).not.toBeNull();
  });

  it("reads all zeros as no fins at all", () => {
    expect(read([0, 0, 0, 0, 0, 0, 0, 0, 0])).toEqual({ side: null, centre: null, word: null, dropped: false });
    expect(noBrdFins()).toEqual({ side: null, centre: null, word: null, dropped: false });
  });

  it("reads a negative off-stringer as its size: a pair is mirrored", () => {
    const fins = read([24.13, -13.208, 35.814, -12.7, 0, 0, 0, 0, 0]);
    const mirrored = read([24.13, 13.208, 35.814, 12.7, 0, 0, 0, 0, 0]);
    expect(fins.side).toEqual(mirrored.side);
    expect(fins.side!.back[1]).toBeCloseTo(132.08, 9);
    expect(fins.side!.front[1]).toBeCloseTo(127, 9);
  });

  it("refuses a side fin whose front stands behind its back, or level with it, and says so", () => {
    for (const nine of [[35.814, 13.208, 24.13, 12.7], [24.13, 13.208, 24.13, 12.7]]) {
      const fins = read([...nine, 0, 0, 0, 0, 0]);
      expect(fins.side).toBeNull();
      expect(fins.dropped).toBe(true);
    }
  });

  it("refuses a fin that starts behind the tail or ends past the nose", () => {
    expect(read([-1, 13, 10, 12, 0, 0, 0, 0, 0]).side).toBeNull();
    expect(read([24, 13, 201, 12, 0, 0, 0, 0, 0]).side).toBeNull();
    expect(read([0, 0, 0, 0, -1, 10, 0, 0, 0]).centre).toBeNull();
    expect(read([0, 0, 0, 0, 10, 201, 0, 0, 0]).centre).toBeNull();
    expect(read([0, 0, 0, 0, 20, 10, 0, 0, 0]).dropped).toBe(true);
  });

  it("refuses a side fin with an end off the stringer by nothing, or beyond the outline", () => {
    expect(read([24, 0, 36, 12, 0, 0, 0, 0, 0]).side).toBeNull();
    expect(read([24, 13, 36, 0, 0, 0, 0, 0, 0]).side).toBeNull();
    // The half-width at 24 cm is about 150 + 100 * 240 / 500 = 198 mm; a back end 30 cm off the stringer is off the board.
    expect(read([24, 30, 36, 12, 0, 0, 0, 0, 0]).side).toBeNull();
    expect(read([24, 30, 36, 12, 0, 0, 0, 0, 0]).dropped).toBe(true);
  });

  it("keeps a side fin and drops a centre fin that does not sit on the board, each on its own", () => {
    const fins = read([24.13, 13.208, 35.814, 12.7, 30, 10, 0, 0, 0]);
    expect(fins.side).not.toBeNull();
    expect(fins.centre).toBeNull();
    expect(fins.dropped).toBe(true);
  });

  it("keeps the word only beside a fin that was kept", () => {
    expect(read([24.13, 13.208, 35.814, 12.7, 0, 0, 0, 0, 0], "Futures").word).toBe("Futures");
    expect(read([0, 0, 0, 0, 0, 0, 0, 0, 0], "Futures").word).toBeNull();
    expect(read([35.814, 13.208, 24.13, 12.7, 0, 0, 0, 0, 0], "Futures").word).toBeNull();
  });

  it("reads anything but nine finite figures as no fins", () => {
    expect(read([1, 2, 3]).side).toBeNull();
    expect(read([24.13, 13.208, 35.814, 12.7, 0, 0, 0, 0, Number.NaN]).side).toBeNull();
  });
});

describe("the fin system's word", () => {
  it("writes FINS' own name for every system and reads every name back to itself", () => {
    for (const system of FIN_SYSTEMS) {
      expect(brdFinSystemWord(system.value)).toBe(system.label);
      expect(finSystemFromBrdWord(system.label)).toBe(system.value);
    }
  });

  it("reads the spellings other programs use, ignoring case, spaces and punctuation", () => {
    const cases: [string, string | null][] = [
      ["fcs2", "fcs2"],
      ["FCS2", "fcs2"],
      ["FCS II", "fcs2"],
      ["fcsii", "fcs2"],
      ["fcs1", "fcsOriginal"],
      ["FCS I", "fcsOriginal"],
      ["fcsI", "fcsOriginal"],
      ["FCS (Original)", "fcsOriginal"],
      ["fcs original", "fcsOriginal"],
      ["FUTURES", "futures"],
      ["Futures Fins", "futures"],
      ["lok box", "lokbox"],
      ["Glassed", "glassOn"],
      ["glassed-on", "glassOn"],
      ["Glass-On", "glassOn"],
      ["FCS", null],
      ["Thunderbolt", null],
      ["", null],
      ["   ", null],
    ];
    for (const [word, system] of cases) expect(finSystemFromBrdWord(word), word).toBe(system);
  });
});

describe("brdFinFields: the fins a board's file carries", () => {
  const cm = (v: number) => v / 10;
  const fields = (spec: FinPlacementSpec) => brdFinFields(place(spec), "futures");

  it("writes a twin as its side pair alone, from the tail end, in centimetres", () => {
    const placement = place(specOf("twin"));
    const front = placement.marks.find((m) => m.role === "front" && m.side === 1)!;
    const out = fields(specOf("twin"))!;
    expect(out.p51).toBe("Futures");
    expect(out.p50).toHaveLength(9);
    expect(out.p50.slice(0, 4)).toEqual([cm(front.offTail), cm(Math.abs(front.lateral)), cm(front.leadingOffTail), cm(Math.abs(front.leadingLateral))]);
    expect(out.p50.slice(4)).toEqual([0, 0, 0, 0, 0]);
  });

  it("writes a single fin as its centre fin alone", () => {
    const placement = place(specOf("single"));
    const centre = placement.marks.find((m) => m.role === "center")!;
    const out = fields(specOf("single"))!;
    expect(out.p50).toEqual([0, 0, 0, 0, cm(centre.offTail), cm(centre.leadingOffTail), 0, 0, 0]);
  });

  it("writes a thruster and a 2+1 as a side pair and a centre fin", () => {
    for (const setup of ["thruster", "2plus1"] as const) {
      const out = fields(specOf(setup))!;
      expect(out.p50.slice(0, 4).every((v) => v > 0), setup).toBe(true);
      expect(out.p50[4], setup).toBeGreaterThan(0);
      expect(out.p50[5], setup).toBeGreaterThan(out.p50[4]);
      expect(out.p50.slice(6)).toEqual([0, 0, 0]);
    }
  });

  it("writes an Upright + Trailer as a side pair and the trailer", () => {
    const out = fields(specOf("twin", {}, undefined, "trailer"))!;
    expect(out.p50[4]).toBeGreaterThan(0);
  });

  it("writes nothing for a quad: the line has no room for its rear pair", () => {
    expect(fields(specOf("quad"))).toBeNull();
    expect(fields({ ...specOf("quad"), quadCenterFinOn: true })).toBeNull();
  });

  it("gives every system its own word", () => {
    for (const system of FIN_SYSTEMS) expect(brdFinFields(place(specOf("twin")), system.value)!.p51).toBe(system.label);
  });
});

describe("the writer's fin header", () => {
  it("writes p51 then p50 through the file's own number format, and a full-board file reads it back", () => {
    const out = brdFinFields(place(specOf("thruster")), "lokbox")!;
    const [p51, p50] = brdFinHeaderFields(out);
    expect(p51).toEqual(["p51", "Lokbox"]);
    expect(p50[0]).toBe("p50");
    expect(p50[1]).toBe(`[${out.p50.map(formatBrdNumber).join(",")}]`);
    const board = readBoard(withFinLine(shortboardText, out.p50, "Lokbox"));
    expect(board.fins.side).not.toBeNull();
    expect(board.fins.centre).not.toBeNull();
    expect(board.fins.word).toBe("Lokbox");
  });
});

describe("the founder's twin, as its nine figures on a stock board", () => {
  const { board, fit } = fitStock(TWIN_NINE);

  it("is read as a side pair alone with its word", () => {
    expect(board.fins.side).not.toBeNull();
    expect(board.fins.centre).toBeNull();
    expect(board.fins.word).toBe("Futures");
    expect(board.fins.dropped).toBe(false);
  });

  it("opens as a twin, Modern/Upright, never an Upright + Trailer or a Keel", () => {
    expect(fit).not.toBeNull();
    expect(fit!.spec.finSetup).toBe("twin");
    expect(fit!.spec.twinTemplate).toBe("upright");
  });

  it("holds the Aft/Forward position at its end and says it stopped 1/2\" short", () => {
    const a = fit!.spec.advanced;
    expect(a.forwardPositionOffset).toBeCloseTo(IN(FIN_POSITION_RANGE_IN.max), 9);
    expect(fit!.short).toHaveLength(1);
    expect(fit!.short[0].control).toBe("forwardPosition");
    expect(fit!.short[0].by).toBeCloseTo(IN(0.5), 6);
    expect(fit!.largest.which).toBe("sideOffTail");
    expect(fit!.largest.gap).toBeCloseTo(IN(0.5), 6);
  });

  it("lands the rail, the toe-in and the base length on the file's, exactly", () => {
    expect(fit!.gaps.side!.inFromRail).toBeLessThan(BRD_FIN_SAME_MM);
    expect(fit!.gaps.side!.toeIn).toBeLessThan(BRD_FIN_SAME_MM);
    expect(fit!.gaps.side!.base).toBeLessThan(BRD_FIN_SAME_MM);
    expect(fit!.file.side!.toeIn).toBeCloseTo(IN(0.2), 6);
    expect(fit!.file.side!.base).toBeCloseTo(IN(4.6), 6);
    expect(fit!.file.side!.offTail).toBeCloseTo(IN(9.5), 6);
  });

  it("takes the toe-in and the base as actual figures, not slider steps", () => {
    const a = fit!.spec.advanced;
    expect(a.forwardToeOverride).toBeCloseTo(IN(0.2), 6);
    expect(a.baseLenForward).toBeCloseTo(IN(4.6), 6);
    expect(a.baseLenForwardOverridden).toBe(true);
  });

  it("names the system from the file's word", () => {
    expect(fit!.finSystem).toBe("futures");
    expect(fit!.systemNamed).toBe(true);
    expect(fit!.fileWord).toBeNull();
  });

  it("never adds a fin the file does not have, and every value sits inside its control's range", () => {
    const placement = place(fit!.spec);
    expect(placement.marks.map((m) => m.role).sort()).toEqual(["front", "front"]);
    const a = fit!.spec.advanced;
    expect(Math.abs(a.forwardPositionOffset)).toBeLessThanOrEqual(IN(FIN_POSITION_RANGE_IN.max) + 1e-9);
    expect(a.forwardToeOverride!).toBeGreaterThanOrEqual(IN(FIN_TOE_RANGE_IN.min));
    expect(a.forwardToeOverride!).toBeLessThanOrEqual(IN(FIN_TOE_RANGE_IN.max));
    expect(a.baseLenForward).toBeGreaterThanOrEqual(IN(FIN_BASE_LENGTH_RANGE_IN.min));
    expect(a.baseLenForward).toBeLessThanOrEqual(IN(FIN_BASE_LENGTH_RANGE_IN.max));
    const window = offRailTunerWindow(placement.resolved.forwardOffRailTemplate, "forward");
    expect(placement.resolved.forwardOffRail).toBeGreaterThanOrEqual(window.min - 1e-9);
    expect(placement.resolved.forwardOffRail).toBeLessThanOrEqual(window.max + 1e-9);
  });

  it("leaves a control at its template when the file is within a hundredth of a millimetre of it", () => {
    // A twin written by the app at its own template reads back with every control untouched.
    const placement = place(specOf("twin"));
    const nine = brdFinFields(placement, "fcs2")!.p50;
    const { fit: back } = fitStock(nine, "FCS II");
    expect(back!.spec.finSetup).toBe("twin");
    expect(back!.spec.twinTemplate).toBe("upright");
    // Every control but the Off-Rail nudge is exactly at its template; the nudge holds the 0.15 mm the file's drawn outline
    // sits from the fitted one (the outline fit's own, and a hundredth of a sixteenth).
    const { forwardOffRailNudge, ...others } = back!.spec.advanced;
    const { forwardOffRailNudge: templateNudge, ...templateOthers } = resetAdvanced("twin", "upright");
    expect(others).toEqual(templateOthers);
    expect(Math.abs(forwardOffRailNudge - templateNudge)).toBeLessThan(0.5);
    expect(back!.short).toEqual([]);
  });
});

describe("the coordinator's AkuShaper variants, as figures", () => {
  it("a side pair with a centre fin 3 1/2\" to 8\" opens as a Thruster or an Upright + Trailer, whichever lands every mark", () => {
    // On the founder's own 6'4 1/2" twin the trailer reaches all six marks and the closest Thruster stops 0.23" short, so
    // it opens as an Upright + Trailer there; on this stock 6'0" the Basic Thruster lands them all exactly.
    const { fit } = fitStock([24.13, 13.208, 35.814, 12.7, 8.89, 20.32, 0, 0, 5.4]);
    expect(["thruster", "twin"]).toContain(fit!.spec.finSetup);
    expect(fit!.largest.gap).toBeLessThan(BRD_FIN_SAME_MM);
    expect(fit!.spec.finSetup === "twin" ? fit!.spec.twinTemplate : fit!.spec.frontModel).toBe(fit!.spec.finSetup === "twin" ? "trailer" : "basic");
  });

  it("a centre fin alone, 6\" to 14\", opens as a Single Fin, exact", () => {
    const { fit } = fitStock([0, 0, 0, 0, 15.24, 35.56, 0, 0, 0]);
    expect(fit!.spec.finSetup).toBe("single");
    expect(fit!.largest.gap).toBeLessThan(BRD_FIN_SAME_MM);
    expect(fit!.file.side).toBeNull();
    expect(fit!.file.centre!.base).toBeCloseTo(IN(8), 6);
    expect(fit!.spec.advanced.baseLenCenter).toBeCloseTo(IN(8), 6);
  });

  it("a side pair moved to 6\"/4\" and 12\"/3\" opens as a Keel, the toe held at FINS' 1/2\" top", () => {
    const { fit } = fitStock([15.24, 10.16, 30.48, 7.62, 0, 0, 0, 0, 5.4]);
    expect(fit!.spec.finSetup).toBe("twin");
    expect(fit!.spec.twinTemplate).toBe("keel");
    expect(fit!.short.map((s) => s.control)).toContain("toeIn");
    expect(fit!.spec.advanced.forwardToeOverride).toBeCloseTo(IN(FIN_TOE_RANGE_IN.max), 9);
    expect(fit!.gaps.side!.offTail).toBeLessThan(BRD_FIN_SAME_MM);
  });

  it("a file with no fins offers no fit", () => {
    const { board, fit } = fitStock([0, 0, 0, 0, 0, 0, 0, 0, 0], null);
    expect(board.fins).toEqual(noBrdFins());
    expect(fit).toBeNull();
  });

  it("slots 6 and 7 are never read: filling them changes nothing", () => {
    const a = fitStock([24.13, 13.208, 35.814, 12.7, 12.7, 22.86, 10.16, 9.5, 5.4]).board.fins;
    const b = fitStock([24.13, 13.208, 35.814, 12.7, 12.7, 22.86, 0, 0, 0]).board.fins;
    expect(a).toEqual(b);
  });
});

describe("a toe-out and an unnamed system", () => {
  it("a side fin whose front sits further from the stringer reads as no toe-in and says toe-out", () => {
    const { fit } = fitStock([24.13, 12.7, 35.814, 13.208, 0, 0, 0, 0, 0]);
    expect(fit!.toeOut).toBe(true);
    expect(fit!.file.side!.toeIn).toBe(0);
    expect(fit!.spec.advanced.forwardToeOverride === null || fit!.spec.advanced.forwardToeOverride === 0).toBe(true);
  });

  it("an unclear word opens on FCS II and the file's word is kept to be quoted; a clear one is not quoted", () => {
    const unclear = fitStock(TWIN_NINE, "Thunderbolt").fit!;
    expect(unclear.finSystem).toBe("fcs2");
    expect(unclear.systemNamed).toBe(false);
    expect(unclear.fileWord).toBe("Thunderbolt");
    const alone = fitStock(TWIN_NINE, "FCS").fit!;
    expect(alone.finSystem).toBe("fcs2");
    expect(alone.fileWord).toBe("FCS");
    const none = fitStock(TWIN_NINE, null).fit!;
    expect(none.finSystem).toBe("fcs2");
    expect(none.fileWord).toBeNull();
  });
});

describe("choosing between candidates", () => {
  it("a tie within 1/32\" goes to the one that moves FINS' controls least, then to the fixed order", () => {
    // A Thruster written on a stock board and read back must come back on the same model (the closest by far).
    for (const model of ["proportional", "basic", "mckeeSB", "mckeeGun"] as const) {
      const nine = brdFinFields(place(specOf("thruster", {}, model)), "fcs2")!.p50;
      const { fit } = fitStock(nine, "FCS II");
      expect(fit!.spec.finSetup).toBe("thruster");
      expect(fit!.spec.frontModel).toBe(model);
      expect(fit!.spec.advanced).toEqual(resetAdvanced("thruster", "upright"));
    }
    expect(BRD_FIN_TIE_MM).toBeCloseTo(IN(1 / 32), 9);
  });

  it("a 2+1 written as a 2+1 comes back as a 2+1, its long centre box leaning it away from a thruster", () => {
    const nine = brdFinFields(place(specOf("2plus1")), "fcs2")!.p50;
    const { fit } = fitStock(nine, "FCS II");
    expect(fit!.spec.finSetup).toBe("2plus1");
  });

  it("file marks are FINS' own: in from the rail is measured on the file's outline", () => {
    const { board } = fitStock(TWIN_NINE);
    const { marks } = finMarksOfFile(board.fins, board.outline);
    expect(marks.side!.offTail).toBeCloseTo(IN(9.5), 6);
    expect(marks.side!.inFromRail).toBeGreaterThan(0);
    expect(marks.centre).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The round trip: the test with a known answer.
// ---------------------------------------------------------------------------------------------------------------------

const i = (value: number) => mm(IN(value));
type Case = { name: string; setup: FinSetup; model?: ThrusterFrontModel; template?: TwinTemplate; adv?: Partial<FinAdvancedSpec>; unmoved?: boolean };
const CASES: Case[] = [
  { name: "single default", setup: "single", unmoved: true },
  { name: "single moved", setup: "single", adv: { centerPositionOffset: i(3 / 8), baseLenCenter: i(9), baseLenCenterOverridden: true } },
  { name: "twin upright default", setup: "twin", template: "upright", unmoved: true },
  { name: "twin upright moved", setup: "twin", template: "upright", adv: { forwardPositionOffset: i(-1 / 4), forwardOffRailNudge: i(1 / 8), forwardToeOverride: i(1 / 4), baseLenForward: i(5), baseLenForwardOverridden: true } },
  { name: "twin keel default", setup: "twin", template: "keel", unmoved: true },
  { name: "twin keel moved", setup: "twin", template: "keel", adv: { forwardPositionOffset: i(1 / 2), forwardToeOverride: i(3 / 16) } },
  { name: "twin trailer default", setup: "twin", template: "trailer", unmoved: true },
  { name: "twin trailer moved", setup: "twin", template: "trailer", adv: { forwardPositionOffset: i(1 / 4), centerPositionOffset: i(-1 / 2) } },
  { name: "thruster proportional default", setup: "thruster", model: "proportional", unmoved: true },
  { name: "thruster basic default", setup: "thruster", model: "basic", unmoved: true },
  { name: "thruster mckeeSB default", setup: "thruster", model: "mckeeSB", unmoved: true },
  { name: "thruster mckeeGun default", setup: "thruster", model: "mckeeGun", unmoved: true },
  { name: "thruster proportional moved", setup: "thruster", model: "proportional", adv: { forwardPositionOffset: i(3 / 8), centerPositionOffset: i(-1 / 8), forwardOffRailNudge: i(-1 / 16), forwardToeOverride: i(3 / 16) } },
  { name: "thruster mckeeSB moved", setup: "thruster", model: "mckeeSB", adv: { forwardPositionOffset: i(3 / 8), centerPositionOffset: i(-1 / 8), forwardOffRailNudge: i(-1 / 16), forwardToeOverride: i(3 / 16), baseLenForward: i(4.75), baseLenForwardOverridden: true } },
  { name: "thruster mckeeGun in whole millimetres", setup: "thruster", model: "mckeeGun", adv: { forwardPositionOffset: mm(7), forwardToeOverride: mm(5), forwardOffRailNudge: mm(3) } },
  { name: "2+1 default", setup: "2plus1", unmoved: true },
  { name: "2+1 moved", setup: "2plus1", adv: { forwardPositionOffset: i(-1 / 2), centerPositionOffset: i(1 / 4), baseLenForward: i(4), baseLenForwardOverridden: true } },
];

const SIXTEENTH_MM = IN(1 / 16);

function roundTrip(label: string, fields: DesignSummaryFields) {
  const base = boardText(fields);
  const read0 = readBoard(base);
  const fitted = fitBoardToBrd({ length: read0.length, outline: read0.outline, bottom: read0.bottom, deck: read0.deck });
  for (const c of CASES) {
    const template = c.template ?? "upright";
    const spec = specOf(c.setup, c.adv, c.model, template);
    const original = designFinPlacement({ outline: fields.outline, fins: spec, finsImportTemplate: true });
    const out = brdFinFields(original, "fcs2");
    expect(out, `${label} ${c.name} writes fins`).not.toBeNull();
    const board = readBoard(withFinLine(base, out!.p50, out!.p51));
    const fit = fitBrdFins(board.fins, board.outline, fitted.outline);
    const tag = `${label} · ${c.name}`;
    expect(fit, tag).not.toBeNull();
    // The same setup and twin template every time.
    expect(fit!.spec.finSetup, tag).toBe(c.setup);
    if (c.setup === "twin") expect(fit!.spec.twinTemplate, tag).toBe(template);
    // An unmoved Thruster comes back on its own model (a moved one may read as another model that draws the same fins).
    if (c.setup === "thruster" && c.unmoved) expect(fit!.spec.frontModel, tag).toBe(c.model);
    expect(fit!.finSystem, tag).toBe("fcs2");
    // FINS' own marks on the original against FINS' own on what opened.
    const was = finMarksOfPlacement(original);
    const now = finMarksOfPlacement(designFinPlacement({ outline: fitted.outline, fins: fit!.spec, finsImportTemplate: true }));
    if (was.side) {
      expect(Math.abs(now.side!.offTail - was.side.offTail), `${tag} off the tail`).toBeLessThan(BRD_FIN_SAME_MM);
      expect(Math.abs(now.side!.toeIn - was.side.toeIn), `${tag} toe-in`).toBeLessThan(BRD_FIN_SAME_MM);
      expect(Math.abs(now.side!.base - was.side.base), `${tag} base`).toBeLessThan(BRD_FIN_SAME_MM);
      expect(Math.abs(now.side!.inFromRail - was.side.inFromRail), `${tag} in from the rail`).toBeLessThan(SIXTEENTH_MM);
    } else expect(now.side, tag).toBeNull();
    if (was.centre) {
      expect(Math.abs(now.centre!.offTail - was.centre.offTail), `${tag} centre off the tail`).toBeLessThan(BRD_FIN_SAME_MM);
      expect(Math.abs(now.centre!.base - was.centre.base), `${tag} centre base`).toBeLessThan(BRD_FIN_SAME_MM);
    } else expect(now.centre, tag).toBeNull();
    // And never a fin the file does not have.
    expect(fit!.short, tag).toEqual([]);
  }
}

describe("the round trip on every preset and tail kind", () => {
  for (const board of phase16Boards().filter((b) => b.label.endsWith("|hard"))) {
    it(`${board.label}: 17 fin cases come back on the same setup with every mark inside the bars`, () => {
      roundTrip(board.label, board.fields);
    });
  }
});

describe("the round trip on every winged board", () => {
  for (const board of phase16WingBoards()) {
    it(`${board.label}: 17 fin cases come back on the same setup with every mark inside the bars`, () => {
      roundTrip(board.label, board.fields);
    });
  }
});

describe("the whole file through the real writer", () => {
  it("a board written with its fins reads back the same fins as a spliced line, with every curve line identical", () => {
    const placement = place(specOf("thruster", {}, "basic"));
    const out = brdFinFields(placement, "futures")!;
    const geometry = buildOutline(shortboard.outline);
    const profile = designSideProfile(shortboard, LIVE_DESIGN_RULES);
    const rails = deriveEffectiveRails(shortboard.rails, profile.effectiveFoil, shortboard.railsImportFoilThickness);
    const surface = buildBoardSurface({
      sections: designCrossSectionInput(geometry, profile, rails, shortboard.outline.length),
      geometry,
      rockerAt: profile.rockerAt,
    });
    const written = brdText(surface, { fins: out }).text;
    expect(written).toBe(withFinLine(shortboardText, out.p50, out.p51));
    expect(readBoard(written).fins.side!.back[0]).toBeCloseTo(placement.marks.find((m) => m.role === "front" && m.side === 1)!.offTail, 6);
  });
});
