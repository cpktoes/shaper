/**
 * `scripts/check-saved-boards.ts --surface-report` (Phase 16, D-33 and D-34; the 14 D-18 report rule): the founder's
 * read-only check, before go-live 2, that every real saved board's litres move as D-33 and D-34 say. Behind a wing
 * only the rail steps in now, so the deck stays where it was and a winged board holds a little more foam; and a
 * rail wider than its station near a tip is drawn into its room instead of cut off, and VOLUME counts the foam
 * that adds (Q3). The rule before both (`RAIL_CHARACTER_FADE`, named only here and in the 102-board pin test) is the
 * "before"; the live rule the "after". Every other board reads the same under both, so only the boards that move
 * are listed, each with its wing count and tail kind, the two things that move it.
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
import { RAIL_CHARACTER_FADE } from "@/lib/geometry/volume";

/** One board's litres under the rule before plan 16-16 (`before`) and the live rule (`after`). */
export interface SurfaceLitresMove {
  before: Litres;
  after: Litres;
}

/**
 * A board's litres before the wing and tip rule (by name) and now (the live rule). Null when the two read the same:
 * a board with no wing and room for its rail all the way to each tip.
 */
export function surfaceLitresMove(fields: DesignSummaryFields): SurfaceLitresMove | null {
  const before = summarizeDesignWith(fields, { ...LIVE_DESIGN_RULES, hardEdge: RAIL_CHARACTER_FADE }).volumeLitres;
  const after = summarizeDesign(fields).volumeLitres;
  return before === after ? null : { before, after };
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
 *   <id>: <no wings | 1 wing | 2 wings> · <tail kind> tail — <before> → <after> L (<move>)
 *   largest move: <id>, <move> L                                              (or: largest move: none)
 * One line per board that moves, largest move first; litres to two places as every screen shows them, the move to
 * four, so a move too small to show on a card still shows here. A board whose litres cannot be worked out is counted
 * as not opening.
 */
export function surfaceReportLines(rows: readonly SurfaceReportRow[]): string[] {
  let open = 0;
  const moves: { id: string; text: string; before: number; after: number }[] = [];
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
      moves.push({ id: row.id, text, before: move.before, after: move.after });
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
      (m) => `${m.id}: ${m.text} — ${m.before.toFixed(2)} → ${m.after.toFixed(2)} L (${signedLitres(m.after - m.before)})`,
    ),
  ];
  const largest = sorted[0];
  lines.push(largest ? `largest move: ${largest.id}, ${signedLitres(largest.after - largest.before)} L` : "largest move: none");
  return lines;
}
