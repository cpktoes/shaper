/**
 * Every word BOTTOM draws (Phase 17, UI-SPEC § Copywriting), in one place, so a wording change is one edit and the
 * browser tests read the same strings the screen does — the 3D screen's own pattern (`components/3d/three-d-copy.ts`).
 *
 * The strings are the UI-SPEC's verbatim. Numbers never live here: each `(value) =>` entry is handed a figure already
 * written through `measure-display.ts` / `formatBottomStation` (CLAUDE.md Rule 2) and only places it in its words.
 * Later plans add theirs (17-09 the other cuts' rows and the channels, 17-10 the Height buttons and `Section at`,
 * 17-11 GUIDE).
 */
import { BOARD_NAME_COPY } from "@/components/design/board-name-copy";
import { formatBottomStation } from "@/lib/geometry/blank-reasons";
import {
  BOTTOM_DATA_DEPTH_SHOWN,
  BOTTOM_FLOOR,
  stationFromNearestTip,
  type BottomBoard,
  type BottomChannelsSpec,
  type BottomFloorFlag,
  type BottomMarkColumn,
  type BottomSectionKey,
  type BottomWingRule,
  type channelReadout,
  type ResolvedChannels,
} from "@/lib/geometry/bottom";
import { CHANNEL_RUN_NAME, formatChannelAngle } from "@/lib/geometry/bottom-print";
import { formatDim, formatMark, formatMarkOrLessBare } from "@/lib/geometry/measure-display";
import type { Mm, UnitsSystem } from "@/lib/geometry/units";

/** A section's name as the panel and the screen readers say it. */
export const BOTTOM_SECTION_NAME: Record<BottomSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };

/** The open board as GUIDE's intro names it: its own name, or `board` when it has none (blank, or the band's
 * `Untitled` for a board not saved yet), so the sentence reads `your board`. */
function guideBoardName(boardName: string | null): string {
  const trimmed = boardName?.trim() ?? "";
  return trimmed === "" || trimmed === BOARD_NAME_COPY.untitled ? "board" : trimmed;
}

export const BOTTOM_COPY = {
  /** The page `<title>` names the screen after its panel, as RAILS' page does. */
  pageTitle: "Bottom Contours — Shaper Assistant",
  pageDescription: "Map, measure and cut a surfboard's bottom contours, with calculated depths and layout marks.",

  /** The panel's title block (drawn in capitals by its style). */
  title: "Bottom Contours",
  subtitle: "Map, measure and cut the bottom",
  inputsHeading: "Inputs",

  /**
   * WINGS, on a winged board only (D-19): the one setting for the whole bottom — which outline every cut's Off Rail is
   * measured from. The heading echoes the placed wings (`1/4" wing at 11 1/2"`; two wings `wings at 11 1/2" and
   * 7 1/2"`), each depth a mark and each station a dim, handed in already written.
   */
  wingsHeading: "Wings",
  wingsEcho: (wings: readonly { depth: string; station: string }[]) =>
    wings.length === 1 ? `${wings[0].depth} wing at ${wings[0].station}` : `wings at ${wings.map((w) => w.station).join(" and ")}`,
  wingRuleLabel: "Measure Off Rail from",
  wingRuleOptions: { narrowest: "Narrowest outline", natural: "Natural outline, before the wing" } satisfies Record<BottomWingRule, string>,
  wingRuleNotes: {
    narrowest: "The real rail behind the wing, and that narrower line carried forward past it — so no cut ever crosses the rail.",
    natural: "The curve you drew before the wing. Behind the wing it sits outside the real rail, so a cut can run out through the step.",
  } satisfies Record<BottomWingRule, string>,

  /** A section card. */
  cutLabel: "Cut",
  cutSelectName: (section: BottomSectionKey) => `${BOTTOM_SECTION_NAME[section]} Cut`,
  flatNote: "Nothing is cut in this section.",

  /** A cut's rows (UI-SPEC § The side panel, slider rows), in D-04's order. */
  offRail: "Off Rail",
  offRailLeft: "At the rail",
  offStringer: "Off Stringer",
  offStringerLeft: "At the stringer",
  troughAt: "Trough At",
  /** `4" from the stringer`: Trough At's value as its label reads it. */
  fromStringer: (mark: string) => `${mark} from the stringer`,
  veeLift: "Vee Lift",
  start: "Start",
  deepestAt: "Deepest At",
  end: "End",
  stationLeft: "Nose",
  stationRight: "Tail",
  depth: "Depth",
  depthLeft: "Nothing cut",
  smoothness: "Smoothness",
  smoothnessLeft: "Straight to the edge",
  smoothnessRight: "Rounded out",
  /** `50%`: Smoothness as its label and a screen reader read it. */
  percent: (value: number) => `${value}%`,
  /** The tick box on the three Nose single concaves (D-06, D-32), ticked by the Teardrop's starting numbers only. */
  closesToPoint: "Closes to a point toward the center",
  /** `58" from the tail` (a Nose cut's `from the nose`): a station as its label reads it, from the cut's nearest tip. */
  fromTip: (section: BottomSectionKey, station: string) => `${station} from the ${section === "nose" ? "nose" : "tail"}`,
  /** A slider's spoken name: `Center Off Rail`, `Center Deepest At`. */
  sliderName: (section: BottomSectionKey, control: string) => `${BOTTOM_SECTION_NAME[section]} ${control}`,

  /** The tabs. */
  viewerTab: "VIEWER",
  dataTab: "DATA",
  guideTab: "GUIDE",

  /**
   * GUIDE (D-17, D-18; UI-SPEC § Copywriting "GUIDE"). The nineteen cards' own three lines are the founder's and live
   * in `bottom-guide-words.ts`, copied from his page; these are the words around them.
   *
   * The intro names the open board as the tab band does. A board never named reads `your board` — never `your
   * Untitled`, which is the band's word for "not saved yet" and not a name.
   */
  guideIntro: (boardName: string | null) =>
    `What each cut is, what it does, and how it is shaped. Every cut is drawn on your ${guideBoardName(boardName)} at its starting numbers — from above with its shade, and across where it is deepest, Height ×8 — the way VIEWER draws it.`,
  /** The four group headings (drawn in capitals by their style), in the order the cards are listed. */
  guideGroups: { nose: "Nose", center: "Center", tail: "Tail", channels: "Channels · cut last, inside TAIL" },
  /** The tag on a card whose cut is on the open board (the channels' card: when any are cut). */
  guideOnThisBoard: "On this board",
  /** The label over a card's shaping note. */
  guideHowToShape: "How to shape",

  /** The top view. */
  topViewCaption: "BOTTOM VIEW",
  /** The caption's right end: `Nose left · 6'2"`, and on a winged board the wings too — `Nose left · 5'8" · wing 1/4"
   * at 11 1/2"`, two wings `· wings at 11 1/2" and 7 1/2"`. */
  topViewNoseLeft: (length: string, wings: readonly { depth: string; station: string }[] = []) => {
    if (wings.length === 0) return `Nose left · ${length}`;
    const note = wings.length === 1 ? `wing ${wings[0].depth} at ${wings[0].station}` : `wings at ${wings.map((w) => w.station).join(" and ")}`;
    return `Nose left · ${length} · ${note}`;
  },
  topViewName: (boardName: string) => `The bottom of ${boardName} from below, with the contours shaded`,

  /** The section. */
  sectionCaption: (station: string) => `SECTION · ${station} FROM THE TAIL`,
  sectionCaptionWidth: (width: string) => ` · ${width} WIDE`,
  sectionName: (station: string, width: string) => `Cross-section ${station} from the tail, ${width} wide`,
  planedBottom: "PLANED BOTTOM",
  /** The gauge readings' words, in a box of 625 dots or more (D-30); below it the value alone. */
  gaugeAtStringer: (value: string) => `${value} at the stringer`,
  gaugeRailLift: (value: string) => `${value} rail lift`,
  gaugeStringerLeft: (value: string) => `${value} stringer left`,
  gaugeInChannel: (value: string) => `${value} in the channel`,
  gaugeInTrough: (value: string) => `${value} in the trough`,

  /** DATA (D-15, D-16, D-34). */
  dataFirstLine: (foamOff: string, now: string, before: string, stringerFinishes: string, planed: string) =>
    `Foam off ${foamOff} L · ${now} L now, ${before} L before contours · the stringer finishes ${stringerFinishes} at the center, planed ${planed} · contours only take foam away.`,
  depthsHeading: "Depths under a straightedge",
  depthsColumns: { station: "From the tail", width: "Width", deepest: "Deepest cut", railLift: "Rail lift", stringerLeft: "Stringer left" },
  rowTail: "Tail",
  rowNoseTip: "Nose tip",
  emptyCell: "—",

  /** The finished rail from RAILS (D-13): a tick row in INPUTS, off when the page opens, never saved. */
  showFinishedRail: "Show the finished rail from RAILS",

  /** The Height control (D-13, UI-SPEC §3.5): the group's word and name, each button's face and spoken name. */
  height: "Height",
  heightButton: (factor: number) => `×${factor}`,
  heightButtonName: (factor: number) => `Height ×${factor}`,

  /**
   * The side view under the cross-section (quick 261112-ogx): the caption (the Board file preview's own words, one formatter
   * for both: `SIDE VIEW · TRUE HEIGHT`, `SIDE VIEW · HEIGHT ×4`), its own Height group's and buttons' spoken names, and the
   * drawing's spoken name.
   */
  sideViewAt: (height: string) => `SIDE VIEW · ${height}`,
  sideHeight: "Side view height",
  sideHeightButtonName: (factor: number) => `Side view height ×${factor}`,
  sideViewName: (boardName: string, twoLines: boolean, heightLabel: string) =>
    `The side of ${boardName}, the deck and the bottom${twoLines ? " at the stringer and at the rail" : ""}, ${heightLabel.toLowerCase()}`,

  /** `Section at` (UI-SPEC §3.6): the row's word, the slider's spoken name, and its spoken value `36" from the tail`. */
  sectionAt: "Section at",
  sectionAtValue: (station: string) => `${station} from the tail`,

  /** DATA's second table (D-16): its heading, Metric ` (mm)` — the app's header form, not the sketch's ` · mm`. */
  marksHeading: (metric: boolean) => `Layout marks · off the stringer${metric ? " (mm)" : ""}`,

  /**
   * DATA's first note (UI-SPEC § Copywriting "DATA", the sketch's line 855). Its middle sentence is the founder's own of
   * 2026-11-11 ("Use the sentence"), after 17-21's "Match RAILS": Rail lift counts the vee or belly alone, and a channel
   * never counts. The printed tables sheet carries the same note.
   */
  depthsNote:
    "Deepest cut is the largest gap under a straightedge laid rail to rail at that station. Rail lift is the vee's or belly's lift at the rail; a channel is cut after the rail is shaped and never counts. Stringer left is the planed thickness less the cut at the stringer.",
} as const;

/**
 * The placed wings as WINGS' heading and the top view's caption say them: each wing's depth a mark (`1/4"`, Metric
 * `6 mm`) and its station from the tail a dim (`11 1/2"`, Metric `29.2 cm`) — CLAUDE.md Rule 2. Takes the wings as the
 * board draws them (`placedWings`), in the order they are stored (wing 1 first).
 */
export function wingWords(wings: readonly { depth: Mm; station: Mm }[], system: UnitsSystem): { depth: string; station: string }[] {
  return wings.map((wing) => ({ depth: formatMark(wing.depth, system), station: formatBottomStation(wing.station, system) }));
}

/**
 * A cell of the depths table — Deepest cut or Rail lift — on DATA and on the printed BOTTOM CONTOURS page alike, the
 * one function both read so the screen and the paper can never drift.
 *
 * Three readings, by how much foam is off there:
 * - under `BOTTOM_DATA_DEPTH_SHOWN` (the sketch's 0.25 mm) nothing is cut, and the cell is the dash;
 * - a cut that is there but too shallow for the tape reads less than its smallest step — `<1/16"`, Metric `<1` under a
 *   head that says mm — never `0"` (the founder, 2026-11-10: "say <1/16 if it's not actually 0");
 * - everything else is the depth as a mark.
 */
export function bottomDepthCell(value: Mm, system: UnitsSystem): string {
  return value < BOTTOM_DATA_DEPTH_SHOWN ? BOTTOM_COPY.emptyCell : formatMarkOrLessBare(value, system);
}

/** A layout-marks column's words (D-16; UI-SPEC § Copywriting "DATA"): each section's mark — `Nose edge`, `Center
 * flat`, `Center trough`, `Center edge`, `Tail flat` — then the channels' `Flat edge` and `Wall 1` … `Wall 4`. */
export function layoutMarkColumnName(column: Pick<BottomMarkColumn, "section" | "mark" | "index">): string {
  if (column.section === "channels") return column.mark === "wall" ? `Wall ${column.index ?? 1}` : "Flat edge";
  return `${BOTTOM_SECTION_NAME[column.section]} ${column.mark}`;
}

/** A stagger this small is no stagger in DATA's note (the sketch's 0.5 mm). */
const STAGGER_SAID = 0.5;

/**
 * DATA's second note, said only when the layout-marks table is drawn (the sketch's own sentence, line 856): how the marks
 * are measured; then, only when channels are cut — the same test that gives DATA its `Wall` columns (a count of 4, 6 or 8
 * and some depth) — how the channels abut, and for a staggered set that a wall is ruled only from where its own channel
 * starts, `the outer pair first, each channel out from it 2" shorter` (the stagger a dim, `formatDim`). A board with no
 * channels never mentions them (the founder at 17-10's look, 2026-11-09).
 */
export function layoutMarksNote(channels: Pick<ResolvedChannels, "count" | "depth" | "longest" | "stagger">, system: UnitsSystem): string {
  const measured =
    "Layout marks are measured out from the stringer at each station, the way a concave's edge or a channel's walls are ruled onto the blank.";
  if (channels.count < 4 || channels.depth <= 0) return measured;
  const staggered = channels.longest !== "same" && channels.stagger > STAGGER_SAID;
  const stagger = staggered
    ? `; a wall is ruled only from where its own channel starts — the ${channels.longest} pair first, each channel out from it ${formatDim(channels.stagger, system)} shorter`
    : "";
  return `${measured} The channels abut: the stringer is the first peak, each channel's floor deepens out to its wall, and the top of that wall is the next channel's peak${stagger}.`;
}

/** DATA's third note: the two rows drawn in full ink, `Wide point 36" and front fins 10 7/8" from the tail …` — a board
 * with no front pair names its `fin`, as the top view's `FIN · 14"` does. Each station through `formatBottomStation`. */
export function referenceRowsNote(board: Pick<BottomBoard, "widePoint" | "frontFins">, frontPair: boolean, system: UnitsSystem): string {
  return `Wide point ${formatBottomStation(board.widePoint, system)} and ${frontPair ? "front fins" : "fin"} ${formatBottomStation(board.frontFins, system)} from the tail are the two rows in full ink.`;
}

/** The floor note in DATA (D-09, D-33 as amended by D-40; the orchestrator's ruling at 17-09): the panel's own sentence
 * (`floorWarning`), never a third wording, named for the cut it belongs to — `Deep Single Concave: This cut meets …`;
 * the channels' sentence already names them. `null` when the cut meets nothing. */
export function dataFloorNote(
  flag: BottomFloorFlag | undefined,
  cutName: string,
  board: Pick<BottomBoard, "length">,
  system: UnitsSystem,
): string | null {
  const sentence = floorWarning(flag, board, system);
  if (sentence === null || !flag) return null;
  return flag.section === "channels" ? sentence : `${cutName}: ${sentence}`;
}

/** The floor's fix, said once after either form (UI-SPEC § Warnings and edge copy). */
const FLOOR_FIX = "Lower the Depth, or move the cut away from the tip.";

/**
 * The floor in words (D-09, D-33 as amended by D-40) — the sentence under a cut's (or the channels') Depth row, from that
 * cut's own `bottomFloorFlags` entry; `null` when it meets nothing. Two forms, each said only when it holds:
 *
 * - **the stringer form**, a concave the floor holds: `This cut meets the 1/4" floor 3" from the nose: the stringer is
 *   left at 1/4" there, shallower than the depth set.` — `{at}` is the held station nearest the cut's own tip, read from
 *   that tip (the nose for a Nose cut, the tail otherwise);
 * - **the rail form**, a lift (or a channel) that leaves the rail under 1/4": `This cut leaves the rail under 1/4" near
 *   the tail: the rail is thinner there than the floor.` (the channels: `The channels leave …`) — `near the {nose|tail}`
 *   is the tip nearer the flagged station nearest the cut's own tip.
 *
 * Then the fix, once. The floor is `BOTTOM_FLOOR` (the app's 1/4", `FOIL_THICKNESS_RANGE_IN.min`) as a mark — `6 mm` in
 * Metric — and the station a dim through `formatBottomStation` (CLAUDE.md Rule 2). Words the founder may rewrite.
 */
export function floorWarning(flag: BottomFloorFlag | undefined, board: Pick<BottomBoard, "length">, system: UnitsSystem): string | null {
  if (!flag || (flag.stringer.length === 0 && flag.rails.length === 0)) return null;
  const floor = formatMark(BOTTOM_FLOOR, system);
  const fromNose = flag.section === "nose";
  const nearestOwnTip = (stations: readonly Mm[]): Mm => (fromNose ? Math.max(...stations) : Math.min(...stations)) as Mm;
  const parts: string[] = [];
  if (flag.stringer.length > 0 && flag.section !== "channels") {
    const at = formatBottomStation(stationFromNearestTip(flag.section, nearestOwnTip(flag.stringer), board), system);
    parts.push(`This cut meets the ${floor} floor ${at} from the ${fromNose ? "nose" : "tail"}: the stringer is left at ${floor} there, shallower than the depth set.`);
  }
  if (flag.rails.length > 0) {
    const tip = nearestOwnTip(flag.rails) > board.length / 2 ? "nose" : "tail";
    const who = flag.section === "channels" ? "The channels leave" : "This cut leaves";
    parts.push(`${who} the rail under ${floor} near the ${tip}: the rail is thinner there than the floor.`);
  }
  return [...parts, FLOOR_FIX].join(" ");
}

/* ============ the CHANNELS block, inside TAIL (D-10, D-11; UI-SPEC § The channels block) ============ */

type ChannelCountChoice = BottomChannelsSpec["count"];
type ChannelReadout = ReturnType<typeof channelReadout>;

export const CHANNELS_COPY = {
  /** The sub-heading (drawn `CHANNELS`). */
  heading: "Channels",
  /** The sub-heading's echo: `None`, or `6, cut after the Flat Exit`. */
  echo: (count: ChannelCountChoice, tailName: string) => (count > 0 ? `${count}, cut after the ${tailName}` : "None"),
  /** The count menu: its label, its spoken name and its options. */
  countLabel: "Channels",
  countSelectName: "Channels",
  countOption: (count: ChannelCountChoice) => (count === 0 ? "None" : `${count} channels`),
  /** Run and Longest, side by side. */
  runLabel: "Run",
  runSelectName: "Channel Run",
  longestLabel: "Longest",
  longestSelectName: "Longest Channels",
  longestOption: { inner: "Inner pair", outer: "Outer pair", same: "All the same" } as const satisfies Record<BottomChannelsSpec["longest"], string>,
  /**
   * The Angle row, under Run and Longest for With the rail and Toe-in only (D-44): its label, its slider's spoken
   * name, and the Reset link — drawn only when the angle was set by hand — with its spoken name.
   */
  angle: "Angle",
  angleSliderName: "Channel Angle",
  angleReset: "Reset",
  angleResetName: "Reset Channel Angle",
  /** The rows' labels. Off Stringer, Start, Deepest At, End, Depth and Smoothness are the section rows' own words. */
  width: "Channel Width",
  stagger: "Stagger",
  staggerLeft: "All start together",
  smoothnessLeft: "Straight ramp into the wall",
  smoothnessRight: "Scooped",
  /** The sliders' spoken names (UI-SPEC § Screen readers): `Channel Width`, then `Channels {control}`. */
  sliderName: (control: string) => (control === "Channel Width" ? control : `Channels ${control}`),
  /** Start's suffix: the pair that starts there (nothing for All the same). */
  startWords: (station: string, longest: BottomChannelsSpec["longest"]) => (longest === "same" ? station : `${station} · the ${longest} pair`),
  /** A flat TAIL with channels (sketch line 1050). */
  flatNoteWithChannels: "Nothing is cut in this section but the channels.",
} as const;

/**
 * A Run option's words (D-10, D-44): the plain names `Parallel` · `With the rail` · `Toe-in`, the same three paper
 * prints (`CHANNEL_RUN_NAME`). The angle a run is laid at reads on the Angle row under the menu, not in the option.
 */
export function runOptionLabel(run: BottomChannelsSpec["run"]): string {
  return CHANNEL_RUN_NAME[run];
}

/**
 * The Angle row's value words (D-44): the angle in use, then where it comes from. On the run's own angle:
 * `9.1° · the rail's own`, `3.2° · the fins' toe-in`, or `0.0° · these fins have no toe-in` on a board whose fins
 * have none (a single fin). Set by hand, the run's own is still said, so a shaper can see what Reset goes back to:
 * `7.5° · set by hand · the rail's own is 9.1°`, `5.0° · set by hand · the fins' toe-in is 3.2°`, or
 * `5.0° · set by hand · these fins have no toe-in`. `own` is the run's own angle (`channelDefaultAngle`) and both are
 * degrees, written by paper's own formatter.
 */
export function channelAngleWords(run: Exclude<BottomChannelsSpec["run"], "parallel">, inUse: number, own: number, byHand: boolean): string {
  const angle = formatChannelAngle(inUse);
  if (run === "rail") return byHand ? `${angle} · set by hand · the rail's own is ${formatChannelAngle(own)}` : `${angle} · the rail's own`;
  if (!(own > 0)) return byHand ? `${angle} · set by hand · these fins have no toe-in` : `${angle} · these fins have no toe-in`;
  return byHand ? `${angle} · set by hand · the fins' toe-in is ${formatChannelAngle(own)}` : `${angle} · the fins' toe-in`;
}

/**
 * The Channel Width row's value words — read out, never set (D-10): the width asked for, `({fitted} to fit)` when the
 * set had to be squeezed, the ramp's whole degrees and the last wall's distance off the rail, every figure from
 * `channelReadout` and every length a mark: `1 3/4" · ramp 10° · last wall 1 5/8" off the rail`.
 */
export function channelWidthWords(readout: ChannelReadout, system: UnitsSystem): string {
  const fitted = readout.squeezed ? ` (${formatMark(readout.fittedWidth, system)} to fit)` : "";
  return `${formatMark(readout.width, system)}${fitted} · ramp ${readout.rampDegrees}° · last wall ${formatMark(readout.lastWallOffRail, system)} off the rail`;
}

/** The Channel Width label line: `Channel Width — 1 3/4" · ramp 10° · last wall 1 5/8" off the rail`. */
export function channelWidthLabel(readout: ChannelReadout, system: UnitsSystem): string {
  return `${CHANNELS_COPY.width} — ${channelWidthWords(readout, system)}`;
}

/**
 * The Stagger row's value words (D-10): the stagger a dim per channel, then where the shortest pair starts from the tail
 * — the outer pair when the inner is longest, the inner otherwise: `2" per channel · the inner pair starts 19" from the
 * tail`. `null` for All the same, where the row is hidden.
 */
export function staggerWords(channels: Pick<BottomChannelsSpec, "stagger" | "longest">, readout: ChannelReadout, system: UnitsSystem): string | null {
  if (channels.longest === "same") return null;
  const shortest = channels.longest === "inner" ? "outer" : "inner";
  return `${formatDim(channels.stagger, system)} per channel · the ${shortest} pair starts ${formatBottomStation(readout.shortestStart, system)} from the tail`;
}

/** The Stagger label line, or `null` for All the same. */
export function staggerLabel(channels: Pick<BottomChannelsSpec, "stagger" | "longest">, readout: ChannelReadout, system: UnitsSystem): string | null {
  const words = staggerWords(channels, readout, system);
  return words === null ? null : `${CHANNELS_COPY.stagger} — ${words}`;
}

/** The channels' Smoothness words: `0% · a straight ramp`, `100% · scooped`, a plain percent between. */
export function channelSmoothnessWords(value: number): string {
  const percent = BOTTOM_COPY.percent(value);
  return value === 0 ? `${percent} · a straight ramp` : value === 100 ? `${percent} · scooped` : percent;
}
