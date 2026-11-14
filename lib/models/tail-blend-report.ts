/**
 * `scripts/check-saved-boards.ts --tail-blend-report` (quick 261113-psx; the 14 D-18 report rule): the founder's
 * read-only check, before the new default goes live, of which real saved boards' litres it moves. The founder
 * (2026-11-13) made a board that says nothing read Tail Rail Blends From = 12" and Tail Rail Ends At = the top of its
 * slider (the board's centre), where D-30 read 18" and L/6 + 18". A board that moved the sliders keeps its own figures
 * exactly, so only a board that stores neither setting, or only one of them, or one outside its window, can move.
 * For each such board this prints the two settings before (as D-30 read them) and after (as the site reads them
 * now), the litres both ways with the app's own functions, and the move.
 *
 * "Before" is the board with both settings stored as D-30 resolved them (`withD30TailRailBlend`), which the live
 * rule reads exactly as the site read before the change; "after" is the board as stored.
 *
 * It prints board ids, settings and litres only — never a board's name, an account, a snapshot or a connection
 * string — and a board that did not open is counted, never printed. Pure: no React, browser API or database
 * import; the script does the one read-only select and hands the opened boards in.
 */

import { summarizeDesign, type DesignSummaryFields } from "@/lib/geometry/design";
import { formatDim } from "@/lib/geometry/measure-display";
import {
  d30HardEdgeBlendsFrom,
  d30HardEdgeEndsAt,
  hardEdgeBlendsFrom,
  hardEdgeEndsAt,
  withD30TailRailBlend,
} from "@/lib/geometry/rail-bands";
import type { Litres, Mm } from "@/lib/geometry/units";

/** One board's litres under D-30's old default pair (`before`) and under the board as stored (`after`). */
export interface TailBlendLitresMove {
  before: Litres;
  after: Litres;
}

/**
 * A board's litres as the site read it before the new default (the board with D-30's resolved pair stored) and as it
 * reads it now. Null when the two are the very same number: a board whose stored pair sits inside its windows (or whose
 * tail and centre rails are alike, so nothing blends) reads the same both ways, to the last digit.
 */
export function tailBlendLitresMove(fields: DesignSummaryFields): TailBlendLitresMove | null {
  const before = summarizeDesign({ ...fields, rails: withD30TailRailBlend(fields.rails, fields.outline.length) }).volumeLitres;
  const after = summarizeDesign(fields).volumeLitres;
  return before === after ? null : { before, after };
}

/** A saved board as the report reads it: its row id, and its opened fields — null when it did not open. */
export interface TailBlendReportRow {
  id: string;
  fields: DesignSummaryFields | null;
}

/** A move in litres to four places, with its sign: `-0.0219`, `+0.0066`. */
function signedLitres(difference: number): string {
  return `${difference > 0 ? "+" : ""}${difference.toFixed(4)}`;
}

/** One setting before and after, in inches (the founder reads this report in Imperial), with `(default)` when the
 * board stores no usable value of its own — so a default never reads as something a shaper chose. */
function settingText(before: Mm, after: Mm, stored: unknown): string {
  return `${formatDim(before, "imperial")} → ${formatDim(after, "imperial")}${stored === after ? "" : " (default)"}`;
}

/**
 * The report's lines, in order:
 *   tail-blend report: N saved boards; k open[, d did not open]; m whose litres move
 *   <id>: blends from <before> → <after> · ends at <before> → <after> — <before> → <after> L (<move>)
 *                                                                one per board whose litres move, the largest move first
 *   largest move: <id>, <move> L                                 (or: largest move: none)
 * The settings in inches, before as D-30 read them and after as the site reads them now (`(default)` where the board
 * stores none of its own, or one the readers refused); litres to two places as every screen shows them; the move to
 * four, so a move too small to show on a card still shows here. A board whose litres cannot be worked out is counted as
 * not opening.
 */
export function tailBlendReportLines(rows: readonly TailBlendReportRow[]): string[] {
  let open = 0;
  const moves: { id: string; settings: string; before: number; after: number }[] = [];
  for (const row of rows) {
    if (!row.fields) continue;
    let move: TailBlendLitresMove | null;
    let settings = "";
    try {
      move = tailBlendLitresMove(row.fields);
      if (move) {
        const { rails, outline } = row.fields;
        settings =
          `blends from ${settingText(d30HardEdgeBlendsFrom(rails, outline.length), hardEdgeBlendsFrom(rails, outline.length), rails.tailHardEdgeBlendsFrom)}` +
          ` · ends at ${settingText(d30HardEdgeEndsAt(rails, outline.length), hardEdgeEndsAt(rails, outline.length), rails.tailHardEdgeEndsAt)}`;
      }
    } catch {
      continue;
    }
    open++;
    if (move) moves.push({ id: row.id, settings, before: move.before, after: move.after });
  }
  const notOpen = rows.length - open;
  const size = (m: { before: number; after: number }) => Math.abs(m.after - m.before);
  // Largest move first; equal moves keep the order the boards were read in.
  const sorted = moves
    .map((m, index) => ({ m, index }))
    .sort((a, b) => size(b.m) - size(a.m) || a.index - b.index)
    .map(({ m }) => m);

  const lines = [
    `tail-blend report: ${rows.length} saved boards; ${open} open${notOpen > 0 ? `, ${notOpen} did not open` : ""}; ` +
      `${moves.length} whose litres move`,
    ...sorted.map(
      (m) =>
        `${m.id}: ${m.settings} — ${m.before.toFixed(2)} → ${m.after.toFixed(2)} L (${signedLitres(m.after - m.before)})`,
    ),
  ];
  const largest = sorted[0];
  lines.push(largest ? `largest move: ${largest.id}, ${signedLitres(largest.after - largest.before)} L` : "largest move: none");
  return lines;
}
