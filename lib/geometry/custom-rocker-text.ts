/**
 * Every word and number the Customize Rocker popup, its button and the DATASHEET's custom rows show
 * (quick 261016-mkb, sketch 016 D, 2026-10-16). Pure (CLAUDE.md Rule 1): no React, browser or
 * database import. Every figure prints through `measure-display.ts` (Rule 2) — amounts as marks
 * (1/16" or whole millimetres), where a bend starts as a dim (like a Thinning Start) — and only the
 * note itself, the maker's order code, stays in inches in both systems (D-01).
 */

/** The button under the blank card (D-04). */
export function customizeButtonLabel(custom: boolean): string {
  return custom ? "Edit Custom Rocker" : "Customize Rocker";
}

/** The popup's title (D-04). */
export function customizeTitle(custom: boolean): string {
  return custom ? "Edit Custom Rocker" : "Customize Rocker";
}

/** The footer's words (D-09). */
export const FOOTER_WORDS = {
  cancel: "Cancel",
  saveNew: "Use and save as a new blank",
  editCurrent: "Use and edit current blank",
  useNatural: "Use the natural rocker",
} as const;

type End = "nose" | "tail";

/** A Rocker slider's accessible name: `Nose rocker change`, `Second tail rocker change`. */
export function rockerSliderName(end: End, index: number): string {
  const name = `${end === "nose" ? "Nose" : "Tail"} rocker change`;
  return index === 0 ? name : `Second ${name.toLowerCase()}`;
}
