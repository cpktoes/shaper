/**
 * How the PICK A BLANK popup draws its cards (quick 261015-ve9, D-02, D-04, D-13 — the founder's
 * decisions of 2026-10-15): Flat or Upright, and whether the shaper's own board is drawn dashed on
 * every blank (Show my board). Flat and On by default, on every device.
 *
 * A per-viewer convenience kept in this browser only (localStorage), never on an account and never
 * in a cookie: it changes how the popup looks, nothing about any board. The stored value is
 * untrusted; each field is kept only when it is one of its allowed values, and anything else falls
 * back to that field's default on its own. Never throws.
 *
 * No React, browser global or database import.
 */

export const BLANK_PICKER_VIEW_STORAGE_KEY = "shaper-blank-picker-view";

export interface BlankPickerView {
  /** How each blank is drawn: lying flat (nose left) or standing upright (nose up). */
  drawn: "flat" | "upright";
  /** Draw the shaper's board dashed on every blank. */
  showBoard: boolean;
}

export const DEFAULT_BLANK_PICKER_VIEW: BlankPickerView = { drawn: "flat", showBoard: true };

/** Reads a stored view back, field by field; a non-object reads as the default. */
export function parseBlankPickerView(value: unknown): BlankPickerView {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return DEFAULT_BLANK_PICKER_VIEW;
  const record = value as Record<string, unknown>;
  const drawn = record.drawn === "flat" || record.drawn === "upright" ? record.drawn : DEFAULT_BLANK_PICKER_VIEW.drawn;
  const showBoard = typeof record.showBoard === "boolean" ? record.showBoard : DEFAULT_BLANK_PICKER_VIEW.showBoard;
  return { drawn, showBoard };
}

/** Reads the stored JSON text: the default for nothing stored or malformed JSON. */
export function parseBlankPickerViewText(text: string | null | undefined): BlankPickerView {
  if (!text) return DEFAULT_BLANK_PICKER_VIEW;
  try {
    return parseBlankPickerView(JSON.parse(text));
  } catch {
    return DEFAULT_BLANK_PICKER_VIEW;
  }
}

/** The JSON text written to storage. */
export function blankPickerViewJson(view: BlankPickerView): string {
  return JSON.stringify({ drawn: view.drawn, showBoard: view.showBoard });
}
