/**
 * What the suggested-blanks block says (quick 261113-gwo, the founder, 2026-11-13: "Maybe suggest a blank (from each mfg?) that
 * gets the rocker very close"): the one block the closest-fit preview shows under the rocker table and the one-page overview
 * prints, in the shaper's own system. Every word is in `BRD_BLANK_COPY` for the founder to reword after his look, and
 * `brdBlankWords` builds every line once, so the screen and the paper cannot disagree.
 *
 * Rule 2 (CLAUDE.md): a gap and a rocker difference are marks (whole millimetres in Metric), where the widest gap sits is a dim
 * (centimetres in Metric). The blank's name and the Customize Rocker order code stay as the maker writes them: `formatRockerNote`
 * is the one place an inch figure is shown to a Metric shaper.
 *
 * Pure: no React, browser or database import (CLAUDE.md Rule 1).
 */
import { brdFileStations } from "../geometry/brd-fit";
import type { BrdBlankSuggestion } from "../geometry/brd-blank-suggest";
import { formatRockerNote } from "../geometry/custom-rocker";
import { formatMarkOrLess, formatSignedMark, stationLabel } from "../geometry/measure-display";
import { mm, type UnitsSystem } from "../geometry/units";
import { gapWhere, lessThan, type BrdFitLook } from "./brd-fit-preview";

/** Where the suggestions are: still being worked out, not available, or ready (one entry per maker the shaper shows). */
export type BrdBlankState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; suggestions: BrdBlankSuggestion[] };

/**
 * The block as words. `lines` holds one inner list per maker (its head line, then its Customize Rocker line when it has one),
 * or a single inner list holding the one quiet line while loading or when the catalogue did not load.
 */
export interface BrdBlankWords {
  /** Where the suggestions are, so a screen or a page can tell the quiet lines from the real block. */
  status: BrdBlankState["status"];
  caption: string;
  intro: string | null;
  lines: string[][];
}

export const BRD_BLANK_COPY = {
  caption: "SUGGESTED BLANKS",
  intro:
    "One blank from each maker that this board fits in by your App Default Settings, its rocker closest to the file's. The figures are the board's rocker on that blank against the file's ROCKER figures: + is more rocker, - less; the gaps leave out the last inch at each end.",
  loading: "Looking for blanks…",
  unavailable: "The blank catalog didn't load, so no blank is suggested. Pick one on ROCKER.",
  none: (vendor: string) => `${vendor}: no blank this board fits in.`,
  head: (blank: string, within: string, where: string, nose: string, nose12: string, tail12: string, tail: string, station: string) =>
    `${blank}: within ${within}, the widest gap ${where}. Nose ${nose}, nose ${station} ${nose12}, tail ${station} ${tail12}, tail ${tail}.`,
  bends: (code: string, within: string) => `Customize Rocker to ${code}: within ${within}.`,
} as const;

/** The block's words in `system`. The file's figures are the ones the ROCKER table shows (`brdFileStations`). */
export function brdBlankWords(state: BrdBlankState, look: BrdFitLook, system: UnitsSystem): BrdBlankWords {
  const caption = BRD_BLANK_COPY.caption;
  if (state.status === "loading") return { status: "loading", caption, intro: null, lines: [[BRD_BLANK_COPY.loading]] };
  if (state.status === "unavailable") return { status: "unavailable", caption, intro: null, lines: [[BRD_BLANK_COPY.unavailable]] };

  const length = look.fit.outline.length;
  const file = brdFileStations(look.board);
  const station = stationLabel(system);
  const within = (largest: number) => lessThan(formatMarkOrLess(mm(largest), system));
  return {
    status: "ready",
    caption,
    intro: BRD_BLANK_COPY.intro,
    lines: state.suggestions.map(({ vendor, pick }) => {
      if (pick === null) return [BRD_BLANK_COPY.none(vendor)];
      const diff = (key: "noseTip" | "nose12" | "tail12" | "tailTip") =>
        formatSignedMark(mm(pick.lift[key] - file.find((st) => st.key === key)!.lift), system);
      const head = BRD_BLANK_COPY.head(
        `${pick.record.vendor} ${pick.record.name}`,
        within(pick.gap.largest),
        gapWhere(pick.gap.at, length, system),
        diff("noseTip"),
        diff("nose12"),
        diff("tail12"),
        diff("tailTip"),
        station,
      );
      return pick.bends === null ? [head] : [head, BRD_BLANK_COPY.bends(formatRockerNote(pick.bends.spec), within(pick.bends.largest))];
    }),
  };
}
