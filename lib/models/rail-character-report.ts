/**
 * `scripts/check-saved-boards.ts --rail-character-report` (Phase 16, D-32; the 14 D-18 report rule): the founder's
 * read-only check, before go-live 2, of how far D-32 alone moves every real saved board's litres. Go-live 1 faded only
 * the tail's hard edge (`HARD_EDGE_FADE`) and every other rail box — Family, Symmetrical, Single Tuck, Sharp Bottom
 * Tuck — switched halfway between two anchors; D-32 fades the tail's whole rail into the centre's between the board's
 * Tail Rail Blends From and Ends At, and the centre's into the nose's on its own from the centre to the nose 12" mark
 * (`RAIL_CHARACTER_FADE`). Like with like: both figures are those two rules alone, so the "after" here is not what a
 * board will read at go-live 2. That is `--surface-report`, which also carries the wings, the tips, the tail's roll,
 * the sharp tuck and the exact rail thickness; its whole move less its "this plan" share is this report's move, to the
 * last digit. For each saved board whose tail differs from its centre in more than the Hard Edge, or whose nose differs
 * at all, this prints what differs on each side in RAILS' own words, the tail's two settings as the board reads them,
 * and its litres both ways with the app's own functions.
 *
 * It prints board ids, settings and litres only — never a board's name, an account, a snapshot or a connection
 * string — and a board that did not open is counted, never printed. Pure: no React, browser API or database
 * import; the script does the one read-only select and hands the opened boards in.
 */

import { LIVE_DESIGN_RULES, summarizeDesignWith, type DesignSummaryFields } from "@/lib/geometry/design";
import { formatDim } from "@/lib/geometry/measure-display";
import { hardEdgeBlendsFrom, hardEdgeEndsAt } from "@/lib/geometry/rail-bands";
import type { Litres, Mm } from "@/lib/geometry/units";
import {
  HARD_EDGE_FADE,
  RAIL_CHARACTER_FADE,
  railCharacterDifferences,
  type RailCharacterKey,
} from "@/lib/geometry/volume";

/** What the report's figures are, in the founder's words, printed with them so its "after" is never read as go-live 2's. */
export const RAIL_CHARACTER_REPORT_NOTE =
  "each line is the whole rail's fade alone: what the site reads today → with that fade and nothing else; " +
  "--surface-report gives what every board will read at go-live 2";

/** One board's litres under go-live 1's rule (`before`) and with the whole rail's fade alone (`after`). */
export interface RailCharacterLitresMove {
  before: Litres;
  after: Litres;
}

/** The settings as RAILS names them. */
const RAILS_WORDS: Record<RailCharacterKey, string> = {
  hardEdge: "Hard Edge",
  family: "Family",
  symmetrical: "Symmetrical",
  singleTuck: "Single Tuck",
  sharpBottomTuck: "Sharp Bottom Tuck",
};

/** Whether D-32 reaches a board at all: its tail differs from its centre in more than the Hard Edge, or its nose
 * differs in anything. Every other board reads the same under both rules, to the last digit (the report's test proves
 * it on the 102 boards). It may still move at go-live 2, for the reasons `--surface-report` lists. */
function railCharacterMoves(fields: DesignSummaryFields): boolean {
  const tail = railCharacterDifferences(fields.rails, "tail");
  return tail.some((key) => key !== "hardEdge") || railCharacterDifferences(fields.rails, "nose").length > 0;
}

/**
 * A board's litres under go-live 1's rule and with the whole rail's fade alone, both by name; the fade reads the
 * board's own Tail Rail Blends From and Ends At. Null when the tail differs from the centre in at most the Hard Edge
 * and the nose not at all: the two rules read such a board the same.
 */
export function railCharacterLitresMove(fields: DesignSummaryFields): RailCharacterLitresMove | null {
  if (!railCharacterMoves(fields)) return null;
  return {
    before: summarizeDesignWith(fields, { ...LIVE_DESIGN_RULES, hardEdge: HARD_EDGE_FADE }).volumeLitres,
    after: summarizeDesignWith(fields, { ...LIVE_DESIGN_RULES, hardEdge: RAIL_CHARACTER_FADE }).volumeLitres,
  };
}

/** A saved board as the report reads it: its row id, and its opened fields — null when it did not open. */
export interface RailCharacterReportRow {
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

/** What differs on one side, in RAILS' words, or `same as the centre`. */
function differencesText(keys: readonly RailCharacterKey[]): string {
  return keys.length > 0 ? keys.map((key) => RAILS_WORDS[key]).join(", ") : "same as the centre";
}

/**
 * The report's lines, in order:
 *   rail-character report: N saved boards; k open[, d did not open]; m whose tail or nose rail differs from the centre's
 *   <id>: tail <differences> · blends from <from> · ends at <to>; nose <differences> — <before> → <after> L (<move>)
 *   largest move: <id>, <move> L                                              (or: largest move: none)
 *   `RAIL_CHARACTER_REPORT_NOTE`
 * One line per board D-32 reaches, largest move first. The differences in RAILS' words (`same as the centre` where
 * there are none); the settings in inches as the board reads them (`(default)` where it stores none of its own, or
 * one the readers refused); litres to two places as every screen shows them; the move to four, so a move too small
 * to show on a card still shows here. A board whose litres cannot be worked out is counted as not opening.
 */
export function railCharacterReportLines(rows: readonly RailCharacterReportRow[]): string[] {
  let open = 0;
  const moves: { id: string; text: string; before: number; after: number }[] = [];
  for (const row of rows) {
    if (!row.fields) continue;
    let move: RailCharacterLitresMove | null;
    let text = "";
    try {
      move = railCharacterLitresMove(row.fields);
      if (move) {
        const { rails, outline } = row.fields;
        const from = hardEdgeBlendsFrom(rails, outline.length);
        const to = hardEdgeEndsAt(rails, outline.length);
        text =
          `tail ${differencesText(railCharacterDifferences(rails, "tail"))}` +
          ` · blends from ${settingText(from, rails.tailHardEdgeBlendsFrom)}` +
          ` · ends at ${settingText(to, rails.tailHardEdgeEndsAt)}` +
          `; nose ${differencesText(railCharacterDifferences(rails, "nose"))}`;
      }
    } catch {
      continue;
    }
    open++;
    if (move) moves.push({ id: row.id, text, before: move.before, after: move.after });
  }
  const notOpen = rows.length - open;
  const size = (m: { before: number; after: number }) => Math.abs(m.after - m.before);
  // Largest move first; equal moves keep the order the boards were read in.
  const sorted = moves
    .map((m, index) => ({ m, index }))
    .sort((a, b) => size(b.m) - size(a.m) || a.index - b.index)
    .map(({ m }) => m);

  const lines = [
    `rail-character report: ${rows.length} saved boards; ${open} open${notOpen > 0 ? `, ${notOpen} did not open` : ""}; ` +
      `${moves.length} whose tail or nose rail differs from the centre's`,
    ...sorted.map(
      (m) => `${m.id}: ${m.text} — ${m.before.toFixed(2)} → ${m.after.toFixed(2)} L (${signedLitres(m.after - m.before)})`,
    ),
  ];
  const largest = sorted[0];
  lines.push(largest ? `largest move: ${largest.id}, ${signedLitres(largest.after - largest.before)} L` : "largest move: none");
  lines.push(RAIL_CHARACTER_REPORT_NOTE);
  return lines;
}
