/**
 * `scripts/check-saved-boards.ts --rack-report` (Phase 15 D-13), worked out here so it is literally
 * what the home page runs for each shaper (code review IN-06): every account's boards are drawn as
 * that shaper's own rack is — `rackModelsAndDrops` with that account's Tip Style for its Phase 11
 * boards, looked up only when `rackNeedsTipStyle` says the rack needs it, exactly as `app/page.tsx`
 * does. The caller looks the Tip Styles up (a database read, `carryOverTipStyle`); this only groups,
 * draws and counts.
 *
 * Nothing it returns names an account: the per-account counts carry no ids, and only board ids
 * appear among the boards left out. Pure: no React, browser API or database import.
 */

import type { TipStyle } from "@/lib/geometry/blank";
import { rackModelsAndDrops, rackNeedsTipStyle } from "./rack-models";

/** A saved board as the report reads it: its id, its owner and its stored snapshot. */
export interface RackReportRow {
  id: string;
  clerkUserId: string;
  snapshot: unknown;
}

export interface RackReport {
  /** Every saved board. */
  saved: number;
  /** How many of them the rack can draw. */
  drawn: number;
  /** Boards per account, from most to fewest — no account named. */
  perAccount: number[];
  /** The ids of the boards the rack would leave out, account by account. */
  dropped: string[];
}

/** Each account's boards, in the order the accounts first appear. */
function rowsByAccount(rows: readonly RackReportRow[]): Map<string, RackReportRow[]> {
  const byAccount = new Map<string, RackReportRow[]>();
  for (const row of rows) {
    const own = byAccount.get(row.clerkUserId);
    if (own) own.push(row);
    else byAccount.set(row.clerkUserId, [row]);
  }
  return byAccount;
}

/** The accounts whose rack would look up the shaper's Tip Style (`rackNeedsTipStyle`, as the home
 * page decides it) — the only ones the caller needs to read a Tip Style for. */
export function accountsNeedingTipStyle(rows: readonly RackReportRow[]): string[] {
  return [...rowsByAccount(rows)].filter(([, own]) => rackNeedsTipStyle(own)).map(([account]) => account);
}

/**
 * The report: each account's boards run through the home page's own path with that account's Tip
 * Style (`tipStyles`, by account; an account missing from it is drawn with no Tip Style handed in,
 * as the home page draws a rack with no Phase 11 board). The rack's per-board log is silenced and no
 * board name is read.
 */
export function rackReport(rows: readonly RackReportRow[], tipStyles: ReadonlyMap<string, TipStyle>): RackReport {
  let drawn = 0;
  const dropped: string[] = [];
  const perAccount: number[] = [];
  for (const [account, own] of rowsByAccount(rows)) {
    const tipStyle = rackNeedsTipStyle(own) ? tipStyles.get(account) : undefined;
    const result = rackModelsAndDrops(
      own.map((row) => ({ id: row.id, name: "", snapshot: row.snapshot, updatedAt: new Date(0) })),
      () => {},
      { tipStyle },
    );
    drawn += result.models.length;
    dropped.push(...result.dropped);
    perAccount.push(own.length);
  }
  return { saved: rows.length, drawn, perAccount: perAccount.sort((a, b) => b - a), dropped };
}
