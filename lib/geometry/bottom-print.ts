/**
 * The bottom in words, for paper (Phase 17, D-26, D-29; UI-SPEC § Paper).
 *
 * One line per cut on the board, in the order a bottom is read — Nose, Center, Tail, Channels — with a flat section
 * left out, so a board whose bottom is flat prints no line at all and its sheets stay exactly as they were. The
 * Overview Sheet lists these lines under a `Bottom:` head; the order form's BOTTOM CONTOURS page heads each of its
 * parts with the same cut names (`bottomPrintCuts`), and counts itself in only when this list is not empty.
 *
 * Pure: no React, no browser, no database. Every figure is read through the app's own formatters — a depth, a lift, a
 * distance off the rail or the stringer and a channel's width are marks (`formatMark`: sixteenths of an inch, whole
 * millimetres); a station and a stagger are dims (`formatBottomStation`: inches, centimetres to one decimal). No
 * conversion happens here. A cut's depth, its vee lift and the channels' depth read through `formatMarkOrLess`: a line
 * is only printed for a cut that is there, so a depth too small for the tape reads `<1/16"` (`<1 mm`), never `0"` —
 * the sliders step by a whole sixteenth or millimetre, so only a board file made outside the app can hold one.
 *
 * A cut's run is a pair of stations in one line of running text, so in Metric the pair carries its unit once, at the
 * end (`147.3 to 10.2 cm`) — the printed-pair rule the order form's thinning line already follows
 * (`planing.ts`'s `thinningLine`). Every other figure carries its own unit, because one line mixes marks and dims.
 */
import { formatBottomStation } from "./blank-reasons";
import {
  BOTTOM_SECTIONS,
  channelFit,
  refAt,
  stationFromNearestTip,
  type BottomBoard,
  type BottomChannelsSpec,
  type BottomSectionKey,
  type ResolvedBottom,
  type ResolvedChannels,
  type ResolvedCut,
} from "./bottom";
import type { BottomCutKey } from "./bottom-draw";
import { formatDimBare, formatMark, formatMarkOrLess } from "./measure-display";
import { mm, type Mm, type UnitsSystem } from "./units";

/** A section's name as paper heads it — the screen's own words (`BOTTOM_SECTION_NAME`; a test holds the two together). */
export const BOTTOM_PRINT_SECTION: Readonly<Record<BottomSectionKey, string>> = { nose: "Nose", center: "Center", tail: "Tail" };

/** The channels' head word — the screen's own sub-heading. */
export const BOTTOM_PRINT_CHANNELS = "Channels";

/** The one extra line a winged board prints when Off Rail is measured from the outline drawn before the wing (D-19). */
export const BOTTOM_PRINT_NATURAL_NOTE = "Off Rail measured from the natural outline, before the wing.";

/** How far apart the two outlines must stand before the wing rule changes anything a shaper could measure. */
const WING_RULE_MATTERS: Mm = mm(1e-6);

/** One cut that is on the board: which it is, the head its part of the page carries, and where it is deepest. */
export interface BottomPrintCut {
  key: BottomCutKey;
  /** `Center: Deep Single Concave`; the channels read `Channels: 6`. */
  head: string;
  /** The station where the cut is deepest, from the tail. */
  deepest: Mm;
}

/** Whether a section's cut takes any foam: not a flat, and deeper than nothing (`bottomHasCut`'s own rule). */
function cutIsOn(cut: ResolvedCut): boolean {
  return cut.kind !== "flat" && cut.depth > 0;
}

/** Whether channels are cut: a count picked and a depth above nothing (`bottomHasChannels`' own rule). */
function channelsAreOn(ch: ResolvedChannels): boolean {
  return ch.count > 0 && ch.depth > 0;
}

/**
 * The cuts on the board, in print order: Nose, Center, Tail, then Channels. Empty for a flat bottom — the test every
 * printed page reads before it adds anything.
 */
export function bottomPrintCuts(resolved: ResolvedBottom): BottomPrintCut[] {
  const cuts: BottomPrintCut[] = [];
  for (const section of BOTTOM_SECTIONS) {
    const cut = resolved[section];
    if (cutIsOn(cut)) cuts.push({ key: section, head: `${BOTTOM_PRINT_SECTION[section]}: ${cut.name}`, deepest: cut.deepest });
  }
  const ch = resolved.channels;
  if (channelsAreOn(ch)) cuts.push({ key: "channels", head: `${BOTTOM_PRINT_CHANNELS}: ${ch.count}`, deepest: ch.deepest });
  return cuts;
}

/**
 * A run between two stations as one line carries it: Imperial `58" to 4"`, Metric `147.3 to 10.2 cm` — the unit once,
 * at the end of the pair.
 */
function rangeWords(from: Mm, to: Mm, system: UnitsSystem): string {
  return `${formatDimBare(from, system)} to ${formatBottomStation(to, system)}`;
}

/** `58" to 4" from the tail, deepest 23 7/16"` — each station taped from the cut's nearest tip (D-07). */
function stationWords(section: BottomSectionKey, cut: Pick<ResolvedCut, "start" | "deepest" | "end">, board: BottomBoard, system: UnitsSystem): string {
  const taped = (s: Mm) => stationFromNearestTip(section, s, board);
  const tip = section === "nose" ? "nose" : "tail";
  return `${rangeWords(taped(cut.start), taped(cut.end), system)} from the ${tip}, deepest ${formatBottomStation(taped(cut.deepest), system)}`;
}

/** One section's cut in one line. */
function cutLine(section: BottomSectionKey, cut: ResolvedCut, board: BottomBoard, system: UnitsSystem): string {
  const head = `${BOTTOM_PRINT_SECTION[section]}: ${cut.name}`;
  const depth = formatMarkOrLess(cut.depth, system);
  const where = stationWords(section, cut, board, system);
  if (cut.kind === "single") {
    const point = cut.closesToPoint ? ", closes to a point" : "";
    return `${head} ${depth}, ${where}; ${formatMark(cut.offRail, system)} off the rail${point}.`;
  }
  if (cut.kind === "double") {
    const lift = cut.spiral ? ` with ${formatMarkOrLess(cut.veeLift, system)} vee lift` : "";
    return (
      `${head} ${depth}${lift}, ${where}; ${formatMark(cut.offRail, system)} off the rail, ` +
      `flat ${formatMark(cut.offStringer, system)} and trough ${formatMark(cut.troughAt, system)} off the stringer.`
    );
  }
  // A vee or a belly lifts the rail; the Tri-Plane's flat panel is the one across mark it has.
  const panel = cut.offStringer > 0 ? `; panel ${formatMark(cut.offStringer, system)} off the stringer` : "";
  return `${head} ${depth} rail lift, ${where}${panel}.`;
}

/**
 * The words for how the channels run — the screen's own Run options (`runOptionLabel`, held together by a test):
 * `Parallel`, `With the rail`, `Toe-in · 3.2°`, or `Toe-in (no toe)` on a board with no toe.
 */
export function channelRunWords(run: BottomChannelsSpec["run"], toeDegrees: number): string {
  if (run === "parallel") return "Parallel";
  if (run === "rail") return "With the rail";
  return toeDegrees > 0 ? `Toe-in · ${toeDegrees.toFixed(1)}°` : "Toe-in (no toe)";
}

/** The channels in one line. The width is the width the set gets — the fitted one when it had to be squeezed. */
function channelsLine(resolved: ResolvedBottom, board: BottomBoard, system: UnitsSystem): string {
  const ch = resolved.channels;
  const width = channelFit(ch, board, resolved.wingRule).width;
  const longest = ch.longest === "same" ? "all the same length" : `${ch.longest} pair longest, ${formatBottomStation(ch.stagger, system)} stagger`;
  return (
    `${BOTTOM_PRINT_CHANNELS}: ${ch.count} at ${formatMark(width, system)}, ${formatMarkOrLess(ch.depth, system)} deep, ` +
    `${rangeWords(ch.start, ch.end, system)} from the tail, deepest ${formatBottomStation(ch.deepest, system)}; ` +
    `${channelRunWords(ch.run, board.toeDegrees)}, ${longest}.`
  );
}

/**
 * Whether the wing rule changes where anything on this bottom is measured from: a cut that is set in from the rail (a
 * single, a double, the channels) standing where the outline drawn before the wing and the Narrowest outline are two
 * different lines. On a board with no wing they are the same line everywhere, so this is never true there (D-19:
 * "Nothing on a wingless board"); a vee or a belly runs out to the rail itself and has no Off Rail to measure.
 */
function wingRuleMatters(resolved: ResolvedBottom, board: BottomBoard): boolean {
  const apart = (s: Mm) => Math.abs(refAt(board, "natural", s) - refAt(board, "narrowest", s)) > WING_RULE_MATTERS;
  const runs: { start: Mm; deepest: Mm; end: Mm }[] = [];
  for (const section of BOTTOM_SECTIONS) {
    const cut = resolved[section];
    if (cutIsOn(cut) && (cut.kind === "single" || cut.kind === "double")) runs.push(cut);
  }
  if (channelsAreOn(resolved.channels)) runs.push(resolved.channels);
  return runs.some((run) => apart(run.start) || apart(run.deepest) || apart(run.end));
}

/**
 * The bottom as the Overview Sheet lists it: one line per cut, Nose, Center, Tail, Channels, a flat left out — and
 * `[]` for a flat bottom. When Off Rail is measured from the natural outline on a winged board, one more line says so.
 */
export function bottomPrintLines(resolved: ResolvedBottom, board: BottomBoard, system: UnitsSystem): string[] {
  const lines: string[] = [];
  for (const section of BOTTOM_SECTIONS) {
    const cut = resolved[section];
    if (cutIsOn(cut)) lines.push(cutLine(section, cut, board, system));
  }
  if (channelsAreOn(resolved.channels)) lines.push(channelsLine(resolved, board, system));
  if (lines.length > 0 && resolved.wingRule === "natural" && wingRuleMatters(resolved, board)) lines.push(BOTTOM_PRINT_NATURAL_NOTE);
  return lines;
}
