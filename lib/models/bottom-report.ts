/**
 * `scripts/check-saved-boards.ts --bottom-report` (Phase 17, D-24): the founder's read-only check, before BOTTOM's
 * saving ships, that nothing a shaper has saved changes when it does. For every saved board it says three things:
 * that the board opens; whether it has a bottom cut (none can, before the page that makes them is live); and its
 * litres beside the litres the site reads today.
 *
 * "Today" is the board read with its bottom left out — exactly what the deployed site does, since its reader has
 * never heard of the key and drops it. A board saved before BOTTOM has no bottom to leave out, so the two figures
 * are one number worked out twice; they are both printed so the report still tells the truth on the day a saved
 * board does carry a cut.
 *
 * It prints board ids and litres only — never a board's name, an account, a snapshot or a connection string. Pure:
 * no React, browser API or database import; the script does the one read-only select and hands the rows in, and
 * nothing here writes anything anywhere.
 */

import { DEFAULT_BOTTOM, bottomHasCut } from "@/lib/geometry/bottom";
import { summarizeDesign } from "@/lib/geometry/design";
import { parseSnapshot, type DesignSnapshotFields } from "./design-snapshot";

/** One saved board as the report reads it. */
export interface BottomReportLine {
  id: string;
  /** Whether the board opens and its litres can be worked out. False leaves the three figures below at their zeros. */
  opens: boolean;
  /** Whether its bottom takes any foam — a cut with a depth, or channels. */
  hasCut: boolean;
  /** Its litres as this version of the app reads them, bottom and all. */
  litres: number;
  /** Its litres as the deployed site reads them today: the same board with its bottom left out. */
  litresToday: number;
}

/**
 * Every saved board, in the order handed in: does it open, does it have a cut, and what are its litres. A row that
 * is not a board, or whose litres cannot be worked out, comes back as not opening — never thrown. Reads only.
 */
export function bottomReport(rows: readonly { id: string; snapshot: unknown }[]): BottomReportLine[] {
  return rows.map(({ id, snapshot }) => {
    try {
      const fields = parseSnapshot(snapshot);
      const flat: DesignSnapshotFields = { ...fields };
      delete flat.bottom;
      const litresToday = summarizeDesign(flat).volumeLitres;
      const litres = fields.bottom === undefined ? litresToday : summarizeDesign(fields).volumeLitres;
      if (!Number.isFinite(litres) || !Number.isFinite(litresToday)) throw new Error("litres not worked out");
      return { id, opens: true, hasCut: bottomHasCut(fields.bottom ?? DEFAULT_BOTTOM), litres, litresToday };
    } catch {
      return { id, opens: false, hasCut: false, litres: 0, litresToday: 0 };
    }
  });
}

/** A move in litres to four places, with its sign: `-0.0219`, `+0.0066`. */
function signedLitres(difference: number): string {
  return `${difference > 0 ? "+" : ""}${difference.toFixed(4)}`;
}

/**
 * The report's lines, in order:
 *   bottom report: N saved boards; k open[, d did not open]; c with a cut; m whose litres differ from today's
 *   <id>: opens · no cut — <litres> L (same as today)                    one line per saved board, in the order read
 *   <id>: opens · has a cut — <litres> L (today <litres> L, <move>)
 *   <id>: did not open
 *   every saved board opens flat, with the litres it reads today: yes     (or: no — N to look at)
 * Litres to two places as every screen shows them, a move to four. "Differ" is the exact figure, not the rounded
 * one, so a move too small to show on a card still counts.
 */
export function bottomReportLines(rows: readonly { id: string; snapshot: unknown }[]): string[] {
  const report = bottomReport(rows);
  const open = report.filter((line) => line.opens);
  const notOpen = report.length - open.length;
  const withCut = open.filter((line) => line.hasCut).length;
  const moved = open.filter((line) => line.litres !== line.litresToday).length;
  const toLookAt = report.filter((line) => !line.opens || line.hasCut || line.litres !== line.litresToday).length;

  return [
    `bottom report: ${report.length} saved boards; ${open.length} open${notOpen > 0 ? `, ${notOpen} did not open` : ""}; ` +
      `${withCut} with a cut; ${moved} whose litres differ from today's`,
    ...report.map((line) => {
      if (!line.opens) return `${line.id}: did not open`;
      const cut = line.hasCut ? "has a cut" : "no cut";
      const today =
        line.litres === line.litresToday
          ? "same as today"
          : `today ${line.litresToday.toFixed(2)} L, ${signedLitres(line.litres - line.litresToday)}`;
      return `${line.id}: opens · ${cut} — ${line.litres.toFixed(2)} L (${today})`;
    }),
    `every saved board opens flat, with the litres it reads today: ${toLookAt === 0 ? "yes" : `no — ${toLookAt} to look at`}`,
  ];
}
