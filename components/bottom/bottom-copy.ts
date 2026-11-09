/**
 * Every word BOTTOM draws (Phase 17, UI-SPEC § Copywriting), in one place, so a wording change is one edit and the
 * browser tests read the same strings the screen does — the 3D screen's own pattern (`components/3d/three-d-copy.ts`).
 *
 * The strings are the UI-SPEC's verbatim. Numbers never live here: each `(value) =>` entry is handed a figure already
 * written through `measure-display.ts` / `formatBottomStation` (CLAUDE.md Rule 2) and only places it in its words.
 * Later plans add theirs (17-09 the other cuts' rows and the channels, 17-10 the Height buttons and `Section at`,
 * 17-11 GUIDE).
 */
import { formatBottomStation } from "@/lib/geometry/blank-reasons";
import { BOTTOM_FLOOR, stationFromNearestTip, type BottomBoard, type BottomFloorFlag, type BottomSectionKey } from "@/lib/geometry/bottom";
import { formatMark } from "@/lib/geometry/measure-display";
import type { Mm, UnitsSystem } from "@/lib/geometry/units";

/** A section's name as the panel and the screen readers say it. */
export const BOTTOM_SECTION_NAME: Record<BottomSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };

export const BOTTOM_COPY = {
  /** The page `<title>` names the screen after its panel, as RAILS' page does. */
  pageTitle: "Bottom Contours — Shaper Assistant",
  pageDescription: "Map, measure and cut a surfboard's bottom contours, with calculated depths and layout marks.",

  /** The panel's title block (drawn in capitals by its style). */
  title: "Bottom Contours",
  subtitle: "Map, measure and cut the bottom",
  inputsHeading: "Inputs",

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

  /** The tabs. GUIDE joins in 17-11. */
  viewerTab: "VIEWER",
  dataTab: "DATA",

  /** The top view. */
  topViewCaption: "BOTTOM VIEW",
  topViewNoseLeft: (length: string) => `Nose left · ${length}`,
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
} as const;

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
