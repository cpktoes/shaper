/**
 * Keeps each figure in a line of running text on one line when the side panel wraps it (quick
 * 261017-vdh, found on main after the merge): RAILS' "Thickness details are imported: … · 2 1/2"
 * center · …" broke between the `2` and its `1/2"` in the 340-dot sidebar. The space inside a
 * whole-and-fraction figure (`2 1/2"`) and the space between a number and its unit (`33 mm`,
 * `30.5 cm`, `30.1 L`) become non-breaking spaces, so the line can only wrap between words.
 *
 * Display-only: it never changes what the line says, only where it may break, so the line builders
 * (and their tests) keep plain spaces and each side panel applies this as it draws the line.
 *
 * Pure — no React, browser or database import (CLAUDE.md Rule 1).
 */
const NBSP = " ";

export function keepFiguresTogether(text: string): string {
  return text.replace(/(\d) (?=\d+\/\d+)/g, `$1${NBSP}`).replace(/(\d) (?=(?:mm|cm|L)\b)/g, `$1${NBSP}`);
}
