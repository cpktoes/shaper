/**
 * Fins in a `.brd` board file, both ways (quick 261113-qyz, the founder, 2026-11-13: "Try this, i think it has fin info.
 * Also, we should export our fin info into the .brd export if the format handles it.").
 *
 * The format's fin facts, as verified in AkuShaper 3.1.3 on the founder's Mac: one header line, `p50 : [a,b,c,d,e,f,g,h,i]`,
 * nine numbers in centimetres, x measured from the tail end (x = 0) and y off the stringer. Slots 0-1 are a side fin's
 * back end (from the tail, off the stringer), slots 2-3 its front end (a front nearer the stringer than the back is the
 * fin's toe-in), slots 4-5 a centre fin's back and front from the tail (it stands on the stringer). Slot 7 is the side fin's
 * DEPTH in centimetres and slot 8 the side fins' SPLAY ANGLE (a cant) in degrees — both read off AkuShaper's own Fins panel
 * by the founder, 2026-11-13, for a file whose p50 held 9.5 and 5.4: a front fin "Depth 3 3/4"", "Splay Angle 5.4 Deg"; slot 6
 * is believed to be the centre fin's depth by the same pattern, not separately verified. FINS has no control for a fin's depth
 * or a splay angle, so neither is fitted: they are read only so the preview can say so (`BrdFileFins.depth`, `.splay`) and
 * are written as zero. AkuShaper's "Fin setup" is DERIVED from the numbers: all zero is NONE, a centre alone SINGLE, a side
 * pair alone TWIN, both TRI; its list goes on to QUAD and FIVE, and how a quad's or a five-fin's rear pair is stored in the
 * file is not known yet (2026-11-13), so neither is read or written. `p51` is a word that reads `Futures` in the founder's
 * file, believed to name the fin system.
 *
 * FINS never stores where a fin sits: it CALCULATES the placement from a setup, a model or template and a few controls
 * (`FinPlacementSpec`). So reading a file's fins is a fit, like the outline's: find the setup and the controls whose
 * calculated fins land on the file's, and say how close. Writing is the other direction: the board's calculated fins,
 * through the format's terms above.
 *
 * What the fit aims at is the four figures FINS shows as marks: how far the fin sits off the tail, how far in from the
 * rail, its toe-in and its base length (and, for a centre fin, off the tail and base length). Every trial is FINS' own
 * placement (`designFinPlacement`) on the board that will open, so "ours" is exactly what FINS will draw. Each control is
 * set to the ACTUAL figure that puts our fin on the file's, held inside the control's own range (`FIN_*_RANGE_IN`, the very
 * constants FINS' sliders run over), never rounded to a slider step: the founder's rule is to round only for display, and
 * FINS' sliders already hold values off their Imperial step. A control stays at its template when the file's figure is
 * within a hundredth of a millimetre of it, so an unmoved board opens unmodified. Where a range stops short (a twin's
 * Aft/Forward position carries the pair as far as 10" off the tail, the founder's ruling of 2026-11-13; every other pair
 * and the centre fin run 1 1/2" either way from their template), the fit says which control and by how much.
 *
 * Written from the format facts above, never from another program's code. Pure: no React, browser, database or
 * `lib/export` import (CLAUDE.md Rule 1); lengths are millimetres, every inch figure goes through `units.ts`.
 */
import type { P2 } from "./bezier-fit";
import type { OutlineSpec } from "./board";
import { designFinPlacement } from "./design";
import {
  DEFAULT_FIN_PLACEMENT_SPEC,
  FIN_BASE_LENGTH_RANGE_IN,
  FIN_SYSTEMS,
  FIN_TOE_RANGE_IN,
  finPositionRangeIn,
  offRailTunerWindow,
  resetAdvanced,
  type FinAdvancedSpec,
  type FinPlacementResult,
  type FinPlacementSpec,
  type FinSetup,
  type FinSystem,
  type ThrusterFrontModel,
  type TwinTemplate,
} from "./fins";
import { centimetresToMm, inchesToMm, mm, mmToCentimetres, mmToInches, type Mm } from "./units";

/** A figure within this of another is the same figure: a control stays at its template when the file is this close (1/100 mm). */
export const BRD_FIN_SAME_MM = 0.01;

/**
 * Candidates whose worst gap is within this of the closest one are a tie (1/32"), settled by which moves FINS' controls
 * least from its own template, then by a fixed order.
 */
export const BRD_FIN_TIE_MM: Mm = inchesToMm(1 / 32);

/** A fin's end may stand this far outside the file's outline and still count as on the board (the outline is sampled). */
export const BRD_FIN_EDGE_SLACK_MM = 0.5;

/** The deepest fin and the widest splay angle read as sensible figures (30 cm, 45 degrees); anything else is not said. */
export const BRD_FIN_DEPTH_MAX_CM = 30;
export const BRD_FIN_SPLAY_MAX_DEGREES = 45;

/** The longest p51 word kept, in characters. */
export const BRD_FIN_WORD_MAX = 32;

/** What a file's fin line holds, in millimetres: P2 is (from the tail, off the stringer). */
export interface BrdFileFins {
  /** The side pair's right-hand fin: its back end and its front end. */
  side: { back: P2; front: P2 } | null;
  /** The centre fin's back and front, from the tail. */
  centre: { back: Mm; front: Mm } | null;
  /** The file's p51 word, kept only beside a fin the rules kept, 1 to 32 plain characters. */
  word: string | null;
  /** The side fins' depth (slot 7) and splay angle in degrees (slot 8), when a side fin was kept and the figure is a sensible non-zero one. Said, never fitted. */
  depth: Mm | null;
  splay: number | null;
  /** True when the line held a fin the rules refused (off the board, front behind its back). */
  dropped: boolean;
}

/** A file with no fins: what every sample file's all-zero line reads as. */
export function noBrdFins(): BrdFileFins {
  return { side: null, centre: null, word: null, depth: null, splay: null, dropped: false };
}

/** The outline's half-width at a distance from the tail: the widest of the outline's segments reaching it. */
function halfWidthAt(outline: readonly P2[], x: number): number {
  let best = 0;
  for (let i = 0; i + 1 < outline.length; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[i + 1];
    if (x < Math.min(x0, x1) || x > Math.max(x0, x1)) continue;
    best = Math.max(best, x1 === x0 ? Math.max(y0, y1) : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));
  }
  return best;
}

/**
 * What the file's fin line says, held to rules (the file is anyone's). `nineCm` is the line's nine figures in centimetres,
 * `outline` the file's own outline (tail to nose, half-widths) and `length` its length. Slots 6 is never read; slots 7 and 8 (a side
 * fin's depth and the splay angle) are kept beside a side fin only to be said. A side
 * fin is kept only when 0 <= back x < front x <= length and each end stands off the stringer by more than nothing and
 * no further than the file's own outline reaches at that x (a negative off-stringer reads as its size: the pair is mirrored);
 * a centre fin only when 0 <= back < front <= length. A fin the rules refuse is left out and `dropped` says so.
 */
export function brdFinsFromLine(
  nineCm: readonly number[],
  outline: readonly P2[],
  length: Mm,
  word: string | null,
): BrdFileFins {
  const result = noBrdFins();
  if (nineCm.length !== 9 || nineCm.some((n) => !Number.isFinite(n))) return result;
  const [bx, by, fx, fy, cb, cf] = nineCm.slice(0, 6).map((n) => centimetresToMm(n) as number);

  if (bx !== 0 || by !== 0 || fx !== 0 || fy !== 0) {
    const back: P2 = [bx, Math.abs(by)];
    const front: P2 = [fx, Math.abs(fy)];
    const onBoard =
      back[0] >= 0 &&
      back[0] < front[0] &&
      front[0] <= length &&
      back[1] > 0 &&
      front[1] > 0 &&
      back[1] <= halfWidthAt(outline, back[0]) + BRD_FIN_EDGE_SLACK_MM &&
      front[1] <= halfWidthAt(outline, front[0]) + BRD_FIN_EDGE_SLACK_MM;
    if (onBoard) result.side = { back, front };
    else result.dropped = true;
  }
  if (cb !== 0 || cf !== 0) {
    if (cb >= 0 && cb < cf && cf <= length) result.centre = { back: mm(cb), front: mm(cf) };
    else result.dropped = true;
  }
  if ((result.side || result.centre) && word !== null) result.word = word;
  if (result.side) {
    const [depth, splay] = [nineCm[7], nineCm[8]];
    if (depth > 0 && depth <= BRD_FIN_DEPTH_MAX_CM) result.depth = centimetresToMm(depth);
    if (splay > 0 && splay <= BRD_FIN_SPLAY_MAX_DEGREES) result.splay = splay;
  }
  return result;
}

// ---------------------------------------------------------------------------------------------------------------------
// The fin system's word (p51).
// ---------------------------------------------------------------------------------------------------------------------

/** The word the file carries for a fin system: FINS' own name for it. */
export function brdFinSystemWord(system: FinSystem): string {
  return FIN_SYSTEMS.find((s) => s.value === system)?.label ?? FIN_SYSTEMS[0].label;
}

/** A word in its plainest form: lower case, letters and digits only. */
const plain = (word: string) => word.toLowerCase().replace(/[^a-z0-9]/g, "");

/** The spellings other programs use, beside every FINS label (each by its plainest form). `FCS` alone names no system. */
const SYSTEM_SPELLINGS: readonly (readonly [string, FinSystem])[] = [
  ["fcs2", "fcs2"],
  ["fcsii", "fcs2"],
  ["fcs1", "fcsOriginal"],
  ["fcsi", "fcsOriginal"],
  ["fcsoriginal", "fcsOriginal"],
  ["futures", "futures"],
  ["futuresfins", "futures"],
  ["glassed", "glassOn"],
  ["glassedon", "glassOn"],
];

/** The fin system a file's p51 word clearly names, or null (an unclear word, `FCS` alone, anything else). */
export function finSystemFromBrdWord(word: string): FinSystem | null {
  const key = plain(word);
  if (key === "") return null;
  for (const system of FIN_SYSTEMS) if (plain(system.label) === key) return system.value;
  return SYSTEM_SPELLINGS.find(([spelling]) => spelling === key)?.[1] ?? null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Marks: the four figures FINS shows for a fin pair, two for the centre fin.
// ---------------------------------------------------------------------------------------------------------------------

export type BrdFinMarkKey = "sideOffTail" | "sideInFromRail" | "sideToeIn" | "sideBase" | "centreOffTail" | "centreBase";

/** The FINS controls a fit sets, by the words FINS uses (the forward pair is a twin's pair, a thruster's front pair, a 2+1's side bites). */
export type BrdFinControlKey = "forwardPosition" | "centrePosition" | "offRail" | "toeIn" | "forwardBase" | "centreBase";

export interface BrdSideMarks {
  offTail: Mm;
  inFromRail: Mm;
  toeIn: Mm;
  base: Mm;
}

export interface BrdCentreMarks {
  offTail: Mm;
  base: Mm;
}

export interface BrdFinMarks {
  side: BrdSideMarks | null;
  centre: BrdCentreMarks | null;
}

/** FINS' own marks for the right-hand front fin and the centre fin of a placement (null where there is none). */
export function finMarksOfPlacement(placement: FinPlacementResult): BrdFinMarks {
  const front = placement.marks.find((m) => m.role === "front" && m.side === 1);
  const centre = placement.marks.find((m) => m.role === "center");
  return {
    side: front
      ? {
          offTail: front.offTail,
          inFromRail: front.lateralValue ?? mm(Number.NaN),
          toeIn: front.toe,
          base: front.baseLength,
        }
      : null,
    centre: centre ? { offTail: centre.offTail, base: centre.baseLength } : null,
  };
}

/** The file's own marks, as FINS names them, from its fin ends and its own outline. `toeOut` says the file's front end sits further from the stringer than its back. */
export function finMarksOfFile(file: BrdFileFins, outline: readonly P2[]): { marks: BrdFinMarks; toeOut: boolean } {
  let toeOut = false;
  let side: BrdSideMarks | null = null;
  if (file.side) {
    const toe = file.side.back[1] - file.side.front[1];
    toeOut = toe < 0;
    side = {
      offTail: mm(file.side.back[0]),
      inFromRail: mm(halfWidthAt(outline, file.side.back[0]) - file.side.back[1]),
      toeIn: mm(Math.max(toe, 0)),
      base: mm(file.side.front[0] - file.side.back[0]),
    };
  }
  const centre = file.centre
    ? { offTail: file.centre.back, base: mm(file.centre.front - file.centre.back) }
    : null;
  return { marks: { side, centre }, toeOut };
}

// ---------------------------------------------------------------------------------------------------------------------
// The fit.
// ---------------------------------------------------------------------------------------------------------------------

export interface BrdFinsFit {
  /** The fins FINS opens with: its own controls set so our calculated fins land on the file's. */
  spec: FinPlacementSpec;
  /** The fin system the board opens with: the file's word when it clearly names one, else FCS II. */
  finSystem: FinSystem;
  /** Whether the file's word named a system FINS has. */
  systemNamed: boolean;
  /** The file's word when it names no system FINS has (already plain and at most 32 characters), else null. */
  fileWord: string | null;
  /** The file's marks, and ours on the board that opens. */
  file: BrdFinMarks;
  ours: BrdFinMarks;
  /** How far ours are from the file's, each mark (the file's fins only). */
  gaps: BrdFinMarks;
  /** The widest gap, and the mark it is. */
  largest: { gap: Mm; which: BrdFinMarkKey };
  /** Each control that stopped at the end of its range, and how far short of the file's figure that left it. */
  short: { control: BrdFinControlKey; by: Mm }[];
  /** The file's side fin points away from the stringer toward its front: FINS has no toe-out, so it reads as no toe-in. */
  toeOut: boolean;
}

interface Candidate {
  setup: FinSetup;
  frontModel?: ThrusterFrontModel;
  twinTemplate?: TwinTemplate;
}

/** The candidates a file's fins offer, in the fixed order that settles a tie. */
function candidatesFor(file: BrdFileFins): Candidate[] {
  if (file.side && file.centre) {
    return [
      { setup: "thruster", frontModel: "mckeeSB" },
      { setup: "thruster", frontModel: "mckeeGun" },
      { setup: "thruster", frontModel: "basic" },
      { setup: "thruster", frontModel: "proportional" },
      { setup: "2plus1" },
      { setup: "twin", twinTemplate: "trailer" },
    ];
  }
  // A side pair alone is never an Upright + Trailer: that template adds a centre fin the file does not have.
  if (file.side) return [{ setup: "twin", twinTemplate: "upright" }, { setup: "twin", twinTemplate: "keel" }];
  if (file.centre) return [{ setup: "single" }];
  return [];
}

const hold = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
/** A figure in millimetres held inside a FINS control's range, which is in inches. */
const holdInRange = (value: number, range: { min: number; max: number }): number =>
  hold(value, inchesToMm(range.min), inchesToMm(range.max));

/** Where the forward pair's trailing edge sits from the tail on the template itself. */
function forwardOffTail(placement: FinPlacementResult, setup: FinSetup): number {
  const r = placement.resolved;
  return setup === "twin" ? r.twinOffTail : setup === "2plus1" ? r.sideOffTail : r.frontOffTail;
}

const place = (outline: OutlineSpec, fins: FinPlacementSpec): FinPlacementResult =>
  designFinPlacement({ outline, fins, finsImportTemplate: true });

interface Trial {
  order: number;
  spec: FinPlacementSpec;
  ours: BrdFinMarks;
  gaps: BrdFinMarks;
  worst: number;
  which: BrdFinMarkKey;
  short: { control: BrdFinControlKey; by: Mm }[];
  /** How far FINS' controls moved from their template, in inches, summed. */
  moved: number;
}

function trial(
  order: number,
  c: Candidate,
  file: BrdFinMarks,
  outline: OutlineSpec,
): Trial {
  const twinTemplate = c.twinTemplate ?? DEFAULT_FIN_PLACEMENT_SPEC.twinTemplate;
  const spec0: FinPlacementSpec = {
    ...DEFAULT_FIN_PLACEMENT_SPEC,
    finSetup: c.setup,
    frontModel: c.frontModel ?? DEFAULT_FIN_PLACEMENT_SPEC.frontModel,
    twinTemplate,
    advanced: resetAdvanced(c.setup, twinTemplate),
  };
  const p0 = place(outline, spec0);
  const adv: FinAdvancedSpec = { ...spec0.advanced };
  const short: Trial["short"] = [];
  let moved = 0;
  const noteShort = (control: BrdFinControlKey, want: number, held: number) => {
    if (Math.abs(want - held) > BRD_FIN_SAME_MM) short.push({ control, by: mm(Math.abs(want - held)) });
  };

  const hasSide = file.side !== null && p0.flags.hasForwardSection;
  const hasCentre = file.centre !== null && p0.flags.hasCenterSection;

  if (hasSide && file.side) {
    const want = file.side.offTail - forwardOffTail(p0, c.setup);
    // The forward pair's own range for this setup and template: a twin's reaches 10" off the tail (the founder, 2026-11-13).
    const held = holdInRange(want, finPositionRangeIn(c.setup, twinTemplate, "forward"));
    if (Math.abs(held) >= BRD_FIN_SAME_MM) adv.forwardPositionOffset = mm(held);
    noteShort("forwardPosition", want, held);
    moved += mmToInches(mm(Math.abs(adv.forwardPositionOffset)));
  }
  if (hasCentre && file.centre) {
    const want = file.centre.offTail - p0.resolved.centerOffTail;
    const held = holdInRange(want, finPositionRangeIn(c.setup, twinTemplate, "center"));
    if (Math.abs(held) >= BRD_FIN_SAME_MM) adv.centerPositionOffset = mm(held);
    noteShort("centrePosition", want, held);
    moved += mmToInches(mm(Math.abs(adv.centerPositionOffset)));
    const wantBase = file.centre.base;
    const heldBase = holdInRange(wantBase, FIN_BASE_LENGTH_RANGE_IN);
    if (Math.abs(heldBase - spec0.advanced.baseLenCenter) >= BRD_FIN_SAME_MM) {
      adv.baseLenCenter = mm(heldBase);
      adv.baseLenCenterOverridden = true;
      moved += mmToInches(mm(Math.abs(heldBase - spec0.advanced.baseLenCenter)));
    }
    noteShort("centreBase", wantBase, heldBase);
  }
  if (hasSide && file.side) {
    // The template's own off-rail and toe, read with the position already moved (the off-rail is read where the fin stands).
    const p1 = place(outline, { ...spec0, advanced: adv });
    const t = p1.resolved.forwardOffRailTemplate;
    const window = offRailTunerWindow(t, "forward");
    const target = file.side.inFromRail;
    const heldRail = hold(target, window.min, window.max);
    if (Math.abs(heldRail - t) >= BRD_FIN_SAME_MM) {
      adv.forwardOffRailNudge = mm(heldRail - t);
      moved += mmToInches(mm(Math.abs(heldRail - t)));
    }
    noteShort("offRail", target, heldRail);

    const toeTemplate = p1.resolved.forwardToe;
    const heldToe = holdInRange(file.side.toeIn, FIN_TOE_RANGE_IN);
    if (Math.abs(heldToe - toeTemplate) >= BRD_FIN_SAME_MM) {
      adv.forwardToeOverride = mm(heldToe);
      moved += mmToInches(mm(Math.abs(heldToe - toeTemplate)));
    }
    noteShort("toeIn", file.side.toeIn, heldToe);

    const heldBase = holdInRange(file.side.base, FIN_BASE_LENGTH_RANGE_IN);
    if (Math.abs(heldBase - spec0.advanced.baseLenForward) >= BRD_FIN_SAME_MM) {
      adv.baseLenForward = mm(heldBase);
      adv.baseLenForwardOverridden = true;
      moved += mmToInches(mm(Math.abs(heldBase - spec0.advanced.baseLenForward)));
    }
    noteShort("forwardBase", file.side.base, heldBase);
  }

  const spec: FinPlacementSpec = { ...spec0, advanced: adv };
  const ours = finMarksOfPlacement(place(outline, spec));
  const diff = (a: number | undefined, b: number | undefined) =>
    a === undefined || b === undefined || Number.isNaN(a) || Number.isNaN(b) ? Number.POSITIVE_INFINITY : Math.abs(a - b);
  const gaps: BrdFinMarks = {
    side: file.side
      ? {
          offTail: mm(diff(ours.side?.offTail, file.side.offTail)),
          inFromRail: mm(diff(ours.side?.inFromRail, file.side.inFromRail)),
          toeIn: mm(diff(ours.side?.toeIn, file.side.toeIn)),
          base: mm(diff(ours.side?.base, file.side.base)),
        }
      : null,
    centre: file.centre
      ? { offTail: mm(diff(ours.centre?.offTail, file.centre.offTail)), base: mm(diff(ours.centre?.base, file.centre.base)) }
      : null,
  };
  const entries: [BrdFinMarkKey, number][] = [];
  if (gaps.side) {
    entries.push(
      ["sideOffTail", gaps.side.offTail],
      ["sideInFromRail", gaps.side.inFromRail],
      ["sideToeIn", gaps.side.toeIn],
      ["sideBase", gaps.side.base],
    );
  }
  if (gaps.centre) entries.push(["centreOffTail", gaps.centre.offTail], ["centreBase", gaps.centre.base]);
  let [which, worst] = entries[0];
  for (const [key, gap] of entries) if (gap > worst) [which, worst] = [key, gap];
  return { order, spec, ours, gaps, worst, which, short, moved };
}

/**
 * The setup and FINS controls whose calculated fins land closest on a file's, on the outline that opens (`outline`, the
 * fitted one) — `fileOutline` is the file's own, for the file's in-from-the-rail figure. Null when the file has no fin
 * the rules kept. The candidates are by content (a side pair alone: a twin, Modern/Upright or Keel; side and centre: a
 * thruster on each front model, a 2+1, or an Upright + Trailer; a centre alone: a single fin); the closest wins, and
 * candidates within `BRD_FIN_TIE_MM` of it are settled by the least movement of FINS' controls, then the fixed order.
 */
export function fitBrdFins(file: BrdFileFins, fileOutline: readonly P2[], outline: OutlineSpec): BrdFinsFit | null {
  const candidates = candidatesFor(file);
  if (candidates.length === 0) return null;
  const { marks, toeOut } = finMarksOfFile(file, fileOutline);
  const trials = candidates.map((c, i) => trial(i, c, marks, outline));
  const best = Math.min(...trials.map((t) => t.worst));
  const near = trials.filter((t) => t.worst <= best + BRD_FIN_TIE_MM);
  near.sort((a, b) => Math.round(a.moved * 1e6) - Math.round(b.moved * 1e6) || a.order - b.order);
  const pick = near[0];
  const named = file.word !== null ? finSystemFromBrdWord(file.word) : null;
  return {
    spec: pick.spec,
    finSystem: named ?? "fcs2",
    systemNamed: named !== null,
    fileWord: named === null ? file.word : null,
    file: marks,
    ours: pick.ours,
    gaps: pick.gaps,
    largest: { gap: mm(pick.worst), which: pick.which },
    short: pick.short,
    toeOut,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Writing.
// ---------------------------------------------------------------------------------------------------------------------

/** The two header fields a file carries for a board's fins: the nine centimetre figures of p50, and the p51 word. */
export interface BrdFinFields {
  p50: readonly number[];
  p51: string;
}

/**
 * The fins a board's `.brd` carries, from FINS' own placement: the right-hand front fin (a pair is mirrored in the
 * format) and the centre fin, each from its trailing edge to its leading edge, off the tail and off the stringer, in
 * centimetres, with slots 6-8 zero (FINS has no fin depth or splay angle to write); and the fin system's word. Null when the
 * board has a rear fin (a quad): how AkuShaper stores a quad's or five-fin's rear pair is not known yet (2026-11-13), and the
 * front pair alone would read as a twin, so a quad writes no fins for now; or no fin at all.
 */
export function brdFinFields(placement: FinPlacementResult, system: FinSystem): BrdFinFields | null {
  if (placement.marks.some((m) => m.role === "rear")) return null;
  const side = placement.marks.find((m) => m.role === "front" && m.side === 1);
  const centre = placement.marks.find((m) => m.role === "center");
  if (!side && !centre) return null;
  const cm = (value: number) => mmToCentimetres(mm(value));
  return {
    p50: [
      side ? cm(side.offTail) : 0,
      side ? cm(Math.abs(side.lateral)) : 0,
      side ? cm(side.leadingOffTail) : 0,
      side ? cm(Math.abs(side.leadingLateral)) : 0,
      centre ? cm(centre.offTail) : 0,
      centre ? cm(centre.leadingOffTail) : 0,
      0,
      0,
      0,
    ],
    p51: brdFinSystemWord(system),
  };
}
