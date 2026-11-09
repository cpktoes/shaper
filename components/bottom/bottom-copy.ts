/**
 * Every word BOTTOM draws (Phase 17, UI-SPEC § Copywriting), in one place, so a wording change is one edit and the
 * browser tests read the same strings the screen does — the 3D screen's own pattern (`components/3d/three-d-copy.ts`).
 *
 * The strings are the UI-SPEC's verbatim. Numbers never live here: each `(value) =>` entry is handed a figure already
 * written through `measure-display.ts` / `formatBottomStation` (CLAUDE.md Rule 2) and only places it in its words.
 * Later plans add theirs (17-09 the other cuts' rows and the channels, 17-10 the Height buttons and `Section at`,
 * 17-11 GUIDE).
 */
import type { BottomSectionKey } from "@/lib/geometry/bottom";

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

  /** The single concave's rows (UI-SPEC § The side panel, slider rows). */
  offRail: "Off Rail",
  offRailLeft: "At the rail",
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
