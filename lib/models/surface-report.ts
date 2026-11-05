/**
 * `scripts/check-saved-boards.ts --surface-report` (Phase 16, D-33 to D-38; the 14 D-18 report rule): the founder's
 * read-only check, before go-live 2, of what every real saved board will read when plan 16-16's surface goes live.
 * It covers EVERY saved board, because the tail's roll reaches them all: a wing's two sides share its step, a rail
 * wider than its station near a tip is drawn into its room, and the deck rolls over into the tail's edge. "Before" is
 * what the live site reads today (`HARD_EDGE_FADE`, go-live 1's rule), "after" what it will read (the live rule), so
 * each line is the move he will see. The bracket gives this plan's share of that move, against `RAIL_CHARACTER_FADE`:
 * the rest is the whole rail's fade, which `--rail-character-report` lists with its reasons, for the boards it reaches.
 *
 * It prints board ids, wing counts, tail kinds and litres only — never a board's name, an account, a snapshot or a
 * connection string — and a board that did not open is counted, never printed. Pure: no React, browser API or
 * database import; the script does the one read-only select and hands the opened boards in.
 */

import {
  LIVE_DESIGN_RULES,
  summarizeDesign,
  summarizeDesignWith,
  type DesignSummaryFields,
} from "@/lib/geometry/design";
import type { Litres } from "@/lib/geometry/units";
import { HARD_EDGE_FADE, RAIL_CHARACTER_FADE } from "@/lib/geometry/volume";

/** One board's litres as the site reads them today (`before`), with the whole rail's fade but none of this plan
 * (`faded`), and under the live rule (`after`). */
export interface SurfaceLitresMove {
  before: Litres;
  faded: Litres;
  after: Litres;
}

/** A board's litres as the site reads them today, before this plan, and at go-live 2. Null when today's and go-live
 * 2's figures are the very same number. */
export function surfaceLitresMove(fields: DesignSummaryFields): SurfaceLitresMove | null {
  const before = summarizeDesignWith(fields, { ...LIVE_DESIGN_RULES, hardEdge: HARD_EDGE_FADE }).volumeLitres;
  const faded = summarizeDesignWith(fields, { ...LIVE_DESIGN_RULES, hardEdge: RAIL_CHARACTER_FADE }).volumeLitres;
  const after = summarizeDesign(fields).volumeLitres;
  return before === after ? null : { before, faded, after };
}

/** A saved board as the report reads it: its row id, and its opened fields — null when it did not open. */
export interface SurfaceReportRow {
  id: string;
  fields: DesignSummaryFields | null;
}

/** A move in litres to four places, with its sign: `-0.0219`, `+0.0066`. */
function signedLitres(difference: number): string {
  return `${difference > 0 ? "+" : ""}${difference.toFixed(4)}`;
}

/** How many wings a board has, in words. */
function wingsText(count: number): string {
  if (count === 0) return "no wings";
  return count === 1 ? "1 wing" : `${count} wings`;
}

/**
 * The report's lines, in order:
 *   surface report: N saved boards; k open[, d did not open]; m whose litres move
 *   <id>: <no wings | 1 wing | 2 wings> · <tail kind> tail — <before> → <after> L (<move>, this plan <share>)
 *   largest move: <id>, <move> L                                              (or: largest move: none)
 * One line per board that moves, largest move first; litres to two places as every screen shows them, the moves to
 * four, so a move too small to show on a card still shows here. A board whose litres cannot be worked out is counted
 * as not opening.
 */
export function surfaceReportLines(rows: readonly SurfaceReportRow[]): string[] {
  let open = 0;
  const moves: { id: string; text: string; before: number; faded: number; after: number }[] = [];
  for (const row of rows) {
    if (!row.fields) continue;
    let move: SurfaceLitresMove | null;
    try {
      move = surfaceLitresMove(row.fields);
    } catch {
      continue;
    }
    open++;
    if (move) {
      const { outline } = row.fields;
      const text = `${wingsText(outline.wings?.length ?? 0)} · ${outline.tail.kind} tail`;
      moves.push({ id: row.id, text, before: move.before, faded: move.faded, after: move.after });
    }
  }
  const notOpen = rows.length - open;
  const size = (m: { before: number; after: number }) => Math.abs(m.after - m.before);
  // Largest move first; equal moves keep the order the boards were read in.
  const sorted = moves
    .map((m, index) => ({ m, index }))
    .sort((a, b) => size(b.m) - size(a.m) || a.index - b.index)
    .map(({ m }) => m);

  const lines = [
    `surface report: ${rows.length} saved boards; ${open} open${notOpen > 0 ? `, ${notOpen} did not open` : ""}; ` +
      `${moves.length} whose litres move`,
    ...sorted.map(
      (m) =>
        `${m.id}: ${m.text} — ${m.before.toFixed(2)} → ${m.after.toFixed(2)} L ` +
        `(${signedLitres(m.after - m.before)}, this plan ${signedLitres(m.after - m.faded)})`,
    ),
  ];
  const largest = sorted[0];
  lines.push(largest ? `largest move: ${largest.id}, ${signedLitres(largest.after - largest.before)} L` : "largest move: none");
  return lines;
}
