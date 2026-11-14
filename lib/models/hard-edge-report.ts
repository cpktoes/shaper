/**
 * `scripts/check-saved-boards.ts --hard-edge-report` (Phase 16, D-20/D-30; the 14 D-18 report rule): the founder's
 * read-only check, before a go-live, that every real saved board's litres move as the hard edge's blend says.
 * Before Phase 16 a hard-edged tail kept its full hard edge out to halfway between the 12" mark and the centre,
 * then switched off (`HARD_EDGE_SWITCH`, named only here and in the pin test); now it is full to the board's Hard
 * Edge Blends From (18" when the board says nothing) and has fully blended into the centre's tucked rail by its
 * Hard Edge Ends At (30"). (Since quick 261113-psx the live rule's default is 12" to the board's centre; this report's
 * "after" is that live rule as the file reads boards, so it now blends from 12" to the centre.) For each saved board with a hard-edged tail this prints both settings as the board reads
 * them, works out the litres both ways with the app's own functions, and lists the move.
 *
 * It prints board ids, the two settings and litres only — never a board's name, an account, a snapshot or a
 * connection string — and a board that did not open is counted, never printed. Pure: no React, browser API or
 * database import; the script does the one read-only select and hands the opened boards in.
 */

import {
  LIVE_DESIGN_RULES,
  summarizeDesign,
  summarizeDesignWith,
  type DesignSummaryFields,
} from "@/lib/geometry/design";
import { formatDim } from "@/lib/geometry/measure-display";
import { hardEdgeBlendsFrom, hardEdgeEndsAt } from "@/lib/geometry/rail-bands";
import type { Litres, Mm } from "@/lib/geometry/units";
import { HARD_EDGE_SWITCH } from "@/lib/geometry/volume";

/** One board's litres under the old switch (`before`) and the live blend (`after`). */
export interface HardEdgeLitresMove {
  before: Litres;
  after: Litres;
}

/**
 * A board's litres before Phase 16 (the old switch, by name) and now (the live blend, which reads the board's own
 * Hard Edge Blends From and Ends At). Null when the tail has no hard edge: the two rules read such a board the same.
 */
export function hardEdgeLitresMove(fields: DesignSummaryFields): HardEdgeLitresMove | null {
  if (!fields.rails.tailHardEdge) return null;
  return {
    before: summarizeDesignWith(fields, { ...LIVE_DESIGN_RULES, hardEdge: HARD_EDGE_SWITCH }).volumeLitres,
    after: summarizeDesign(fields).volumeLitres,
  };
}

/** A saved board as the report reads it: its row id, and its opened fields — null when it did not open. */
export interface HardEdgeReportRow {
  id: string;
  fields: DesignSummaryFields | null;
}

/** A move in litres to four places, with its sign: `-0.0219`, `+0.0066`. */
function signedLitres(difference: number): string {
  return `${difference > 0 ? "+" : ""}${difference.toFixed(4)}`;
}

/** One setting as the board reads it, in inches (the founder reads this report in Imperial), with `(default)` when
 * the board stores no usable value of its own — so a default never reads as something a shaper chose. */
function settingText(read: Mm, stored: unknown): string {
  return `${formatDim(read, "imperial")}${stored === read ? "" : " (default)"}`;
}

/**
 * The report's lines, in order:
 *   hard-edge report: N saved boards; k open[, d did not open]; h with a hard-edged tail
 *   <id>: blends from <from> · ends at <to> — <before> → <after> L (<move>)   one per hard-edged board, largest move first
 *   largest move: <id>, <move> L                                              (or: largest move: none)
 * The settings in inches as the board reads them (`(default)` where it stores none of its own, or one the readers
 * refused); litres to two places as every screen shows them; the move to four, so a move too small to show on a
 * card still shows here. A board whose litres cannot be worked out is counted as not opening.
 */
export function hardEdgeReportLines(rows: readonly HardEdgeReportRow[]): string[] {
  let open = 0;
  const moves: { id: string; settings: string; before: number; after: number }[] = [];
  for (const row of rows) {
    if (!row.fields) continue;
    let move: HardEdgeLitresMove | null;
    let settings = "";
    try {
      move = hardEdgeLitresMove(row.fields);
      if (move) {
        const { rails, outline } = row.fields;
        const from = hardEdgeBlendsFrom(rails, outline.length);
        const to = hardEdgeEndsAt(rails, outline.length);
        settings = `blends from ${settingText(from, rails.tailHardEdgeBlendsFrom)} · ends at ${settingText(to, rails.tailHardEdgeEndsAt)}`;
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
    `hard-edge report: ${rows.length} saved boards; ${open} open${notOpen > 0 ? `, ${notOpen} did not open` : ""}; ` +
      `${moves.length} with a hard-edged tail`,
    ...sorted.map(
      (m) =>
        `${m.id}: ${m.settings} — ${m.before.toFixed(2)} → ${m.after.toFixed(2)} L (${signedLitres(m.after - m.before)})`,
    ),
  ];
  const largest = sorted[0];
  lines.push(largest ? `largest move: ${largest.id}, ${signedLitres(largest.after - largest.before)} L` : "largest move: none");
  return lines;
}
