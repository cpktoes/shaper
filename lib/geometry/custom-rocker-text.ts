/**
 * Every word and number the Customize Rocker popup, its button and the DATASHEET's custom rows show
 * (quick 261016-mkb, sketch 016 D, 2026-10-16). Pure (CLAUDE.md Rule 1): no React, browser or
 * database import. Every figure prints through `measure-display.ts` (Rule 2) — a change's amount as a
 * mark (1/16" or a whole millimetre, P-1), where a bend starts as a dim, exactly like a Thinning Start
 * (`formatThinningStart`, P-2) — and only the note itself, the maker's order code, stays in inches in
 * both systems (D-01; written by `custom-rocker.ts`).
 */

import { formatThinningStart } from "./blank-reasons";
import { columnUnitSuffix, formatSignedMark } from "./measure-display";
import { inchesToMm, type Mm, type UnitsSystem } from "./units";

type End = "nose" | "tail";

const END_WORD: Record<End, string> = { nose: "nose", tail: "tail" };
const END_TITLE: Record<End, string> = { nose: "Nose", tail: "Tail" };

/** The button under the blank card (D-04). */
export function customizeButtonLabel(custom: boolean): string {
  return custom ? "Edit Custom Rocker" : "Customize Rocker";
}

/** The popup's title (D-04). */
export function customizeTitle(custom: boolean): string {
  return custom ? "Edit Custom Rocker" : "Customize Rocker";
}

/** The two ends' headings, in the page's section-heading style (D-05). */
export function endHeading(end: End): string {
  return END_TITLE[end];
}

/** A change row's label: `Change`, then `Second change` (D-05). */
export function rockerChangeLabel(index: number): string {
  return index === 0 ? "Change" : "Second change";
}

/** The Rocker slider's own label and the Bend starts slider's, over each track. */
export const ROCKER_SLIDER_LABEL = "Rocker";
export const BEND_SLIDER_LABEL = "Bend starts";

/** A change's amount in its value box — a signed mark: `+1/2"`, `-1/4"`, `+13 mm`, `0"` (P-1). */
export function rockerAmountText(amount: Mm, system: UnitsSystem): string {
  return formatSignedMark(amount, system);
}

/**
 * Where a change's bend starts, in its value box (P-2): `At the centre`, or the whole inches in from
 * the tip as a dim — `18" in`, or in Metric `45.7 cm in` (the slider still moves in whole inches,
 * because the bend point is part of the maker's order code).
 */
export function bendStartText(fromTipIn: number | null, system: UnitsSystem): string {
  if (fromTipIn === null) return "At the centre";
  return `${formatThinningStart(inchesToMm(fromTipIn), system)} in`;
}

/** The hint under a Rocker slider when it sits on its floor (D-06). */
export const FLOOR_HINT = "Floor — the tip would drop below the centre";

/** The two ends of a Rocker slider's hint line; the left one says so when the slider is on its floor. */
export function amountHints(atFloor: boolean): [string, string] {
  return [atFloor ? FLOOR_HINT : "Less", "More"];
}

/** The two ends of a Bend starts slider's hint line: the tip, then the centre (a first change) or
 * nearer the centre (a second, which never reaches it). */
export function bendStartHints(end: End, index: number): [string, string] {
  return [`Near the ${END_WORD[end]}`, index === 0 ? "At the centre" : "Nearer the centre"];
}

/** The link that adds a maker's two-point adjustment (D-05). */
export function addSecondChangeLabel(end: End): string {
  return `+ Add a second ${END_WORD[end]} change`;
}

/** A second change's Remove link. */
export const REMOVE_CHANGE_LABEL = "Remove";

/** Clears every change (D-05). */
export const NATURAL_ROCKER_LABEL = "↺ Natural rocker";

/** The one line under the rows. */
export const CUSTOM_ROCKER_FIT_LINE = "The fit never changes — bending a blank leaves its thickness and width alone.";

/**
 * The drawing's key (D-07), in parts so the two colour words can take their colours: `tone` 1 is the
 * first change's colour, 2 the second's, absent the plain ink.
 */
export const OVERLAY_KEY: readonly { text: string; tone?: 1 | 2 }[] = [
  { text: "Natural dashed · " },
  { text: "the first change red", tone: 1 },
  { text: " · " },
  { text: "the second change blue", tone: 2 },
  { text: ", on top of the first" },
];

/** The Show my board switch's name. */
export const SHOW_BOARD_LABEL = "Show my board";

/** The footer's words (D-09). */
export const FOOTER_WORDS = {
  cancel: "Cancel",
  saveNew: "Use and save as a new blank",
  editCurrent: "Use and edit current blank",
  useNatural: "Use the natural rocker",
} as const;

/** A Rocker slider's accessible name: `Nose rocker change`, `Second tail rocker change`. */
export function rockerSliderName(end: End, index: number): string {
  return index === 0 ? `${END_TITLE[end]} rocker change` : `Second ${END_WORD[end]} rocker change`;
}

/** A Bend starts slider's accessible name: `Nose bend starts`, `Second tail bend starts`. */
export function bendSliderName(end: End, index: number): string {
  return index === 0 ? `${END_TITLE[end]} bend starts` : `Second ${END_WORD[end]} bend starts`;
}

/** The DATASHEET's custom-blank rows (D-03): the catalogue's printed figures, then as ordered. */
export function naturalRockerRowLabel(system: UnitsSystem): string {
  return `Natural Rocker${columnUnitSuffix("mark", system)}`;
}

export function customRockerRowLabel(system: UnitsSystem): string {
  return `Custom Rocker${columnUnitSuffix("mark", system)}`;
}

/** The DATASHEET's footnote under a custom blank (D-03). */
export function customRockerFootnote(note: string): string {
  return `Natural Rocker is the catalog page's. Custom Rocker is the blank as ordered (${note}) — check it on the foam.`;
}
