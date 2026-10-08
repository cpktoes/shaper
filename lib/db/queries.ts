/**
 * Plain async read functions — never Server Actions, because reads belong in Server Components
 * (RESEARCH.md Architectural Responsibility Map). `listModels` is called only from
 * app/page.tsx, a Server Component that has already derived `clerkId` itself via `await auth()`;
 * the parameter here is never client-supplied, so this file has nothing resembling a client-sent
 * owner field even though the function does take an identifier — see lib/db/ownership.test.ts's
 * "no caller-supplied owner parameter" check, which this signature is written to satisfy while
 * still scoping every read.
 */

import { desc, eq } from "drizzle-orm";
import { db } from "./client";
import { models, userPreferences } from "./schema";
import { parseUnitsPreference } from "@/lib/units-preference";
import { parsePrintRailInstructionsPreference } from "@/lib/print-instructions-preference";
import {
  parseFitDefaultValue,
  parseTipStyleValue,
  type FitDefaultsPreference,
} from "@/lib/fit-defaults-preference";
import { parseHiddenBlankMakersColumn } from "@/lib/blank-makers-preference";
import { parseRackOrderColumn } from "@/lib/models/rack-order";
import type { BlankVendor } from "@/lib/blanks/vendors";
import type { UnitsSystem } from "@/lib/geometry/units";

export interface ListedModel {
  id: string;
  name: string;
  snapshot: unknown;
  updatedAt: Date;
  /** Whether the shaper has locked this board (quick 261008-lsy); null or false means unlocked. */
  locked: boolean | null;
}

/**
 * Every saved board for one shaper, newest-touched first (id descending as the tiebreak so the
 * order is stable across renders of the same second).
 *
 * Read-only contract: this function performs a `select` and nothing else — no counters, no
 * last-viewed stamp, no write of any kind — so calling it twice returns the same rows and
 * changes nothing in the database. That also means the rack reflects rows committed as of the
 * page render that called this: a change made to a board from another tab or another device
 * shows up only on the next navigation here. This phase promises no live cross-tab sync.
 */
export async function listModels(clerkId: string): Promise<ListedModel[]> {
  return db.select({
      id: models.id,
      name: models.name,
      snapshot: models.snapshot,
      updatedAt: models.updatedAt,
      locked: models.locked,
    })
    .from(models)
    .where(eq(models.clerkUserId, clerkId))
    .orderBy(desc(models.updatedAt), desc(models.id));
}

/**
 * A shaper's saved units preference, or `null` when the row is missing (no preferences row yet
 * — the account has never had anything written to it) or when its `units` column holds
 * anything outside the two registered systems (a hand-edit, a legacy value, table drift). The
 * value is run through `parseUnitsPreference`'s allow-list rather than trusted as-is, so a junk
 * column value reads as "no choice" and renders Imperial instead of crashing or being honored.
 *
 * Read-only contract, same register as `listModels`: one `select`, no counters, no last-seen
 * stamp, no write of any kind.
 */
export async function readUnitsPreference(clerkId: string): Promise<UnitsSystem | null> {
  const [row] = await db.select({ units: userPreferences.units })
    .from(userPreferences)
    .where(eq(userPreferences.clerkUserId, clerkId));
  return parseUnitsPreference(row?.units ?? null);
}

/**
 * A shaper's saved "Include Rail Band Instructions in Print" preference, or `null` when the row
 * is missing or its column holds anything outside a real boolean (a hand-edit, table drift).
 * Follows `readUnitsPreference` exactly — one `select`, run through the allow-list parser,
 * nothing written.
 */
export async function readPrintRailInstructionsPreference(clerkId: string): Promise<boolean | null> {
  const [row] = await db.select({ printRailInstructions: userPreferences.printRailInstructions })
    .from(userPreferences)
    .where(eq(userPreferences.clerkUserId, clerkId));
  return parsePrintRailInstructionsPreference(row?.printRailInstructions ?? null);
}

/**
 * A shaper's seven saved fit and tip defaults — Extra Length, Planer Max Depth and Width Margin
 * (the rules that decide which blanks fit, Phase 12 D-10), and the Deck Skin, Nose Tip, Tail Tip
 * and Tip Style a new board starts with — with `null` for each one they haven't chosen. The six
 * numbers are millimetres. A missing row reads as seven nulls; each number column is run through
 * `parseFitDefaultValue`'s allow-list (finite, inside that setting's bounds) and the Tip Style
 * through `parseTipStyleValue` (exactly `pinDeck` or `bottom`), so a hand-edited or drifted value
 * reads as "not chosen" and the standard default shows instead.
 *
 * Selects exactly these seven columns and nothing else — a projection, never the whole row — so
 * this read and the units/print reads above each ask only for the columns they use. The retired
 * Extra Center Thickness column was dropped by migration 0008 (D-19, quick task 260927-qrn).
 *
 * Read-only contract, same register as `listModels`: one `select`, no counters, no last-seen
 * stamp, no write of any kind.
 */
export async function readFitDefaultsPreference(clerkId: string): Promise<FitDefaultsPreference> {
  const [row] = await db.select({
      extraLengthMm: userPreferences.extraLengthMm,
      planerMaxDepthMm: userPreferences.planerMaxDepthMm,
      widthMarginMm: userPreferences.widthMarginMm,
      deckSkinMm: userPreferences.deckSkinMm,
      noseTipThicknessMm: userPreferences.noseTipThicknessMm,
      tailTipThicknessMm: userPreferences.tailTipThicknessMm,
      tipStyle: userPreferences.tipStyle,
    })
    .from(userPreferences)
    .where(eq(userPreferences.clerkUserId, clerkId));
  return {
    extraLength: parseFitDefaultValue("extraLength", row?.extraLengthMm ?? null),
    planerMaxDepth: parseFitDefaultValue("planerMaxDepth", row?.planerMaxDepthMm ?? null),
    widthMargin: parseFitDefaultValue("widthMargin", row?.widthMarginMm ?? null),
    deckSkin: parseFitDefaultValue("deckSkin", row?.deckSkinMm ?? null),
    noseTipThickness: parseFitDefaultValue("noseTipThickness", row?.noseTipThicknessMm ?? null),
    tailTipThickness: parseFitDefaultValue("tailTipThickness", row?.tailTipThicknessMm ?? null),
    tipStyle: parseTipStyleValue(row?.tipStyle ?? null),
  };
}

/**
 * The blank makers a shaper has switched off in the gear menu's BLANK MAKERS tick boxes (quick task
 * 260926-wmf), or `null` when the row is missing or they have never chosen — which the app shows as
 * every maker on. The column's JSON text is run through `parseHiddenBlankMakersColumn`'s allow-list,
 * so a hand-edited or drifted value keeps only makers the app knows, and malformed text (or a value
 * hiding every maker) reads as "not chosen".
 *
 * Selects exactly this one column and nothing else, so the reads above never ask for it and this
 * one never asks for theirs.
 *
 * Read-only contract, same register as `listModels`: one `select`, no counters, no last-seen
 * stamp, no write of any kind.
 */
export async function readBlankMakersPreference(clerkId: string): Promise<BlankVendor[] | null> {
  const [row] = await db.select({ hiddenBlankMakers: userPreferences.hiddenBlankMakers })
    .from(userPreferences)
    .where(eq(userPreferences.clerkUserId, clerkId));
  return parseHiddenBlankMakersColumn(row?.hiddenBlankMakers ?? null);
}

/**
 * The shaper's own order of their saved boards on the Board Rack (Phase 15, D-03), or `null` when
 * the row is missing or they have never arranged it — which the rack shows as today's automatic
 * order. The column's JSON text is run through `parseRackOrderColumn`'s allow-list, so a drifted or
 * hand-edited value keeps only well-formed ids, and malformed text reads as "not arranged".
 *
 * Selects exactly this one column and nothing else, so the reads above never ask for it and this
 * one never asks for theirs.
 *
 * Read-only contract, same register as `listModels`: one `select`, no counters, no last-seen
 * stamp, no write of any kind.
 */
export async function readRackOrder(clerkId: string): Promise<string[] | null> {
  const [row] = await db.select({ rackOrder: userPreferences.rackOrder })
    .from(userPreferences)
    .where(eq(userPreferences.clerkUserId, clerkId));
  return parseRackOrderColumn(row?.rackOrder ?? null);
}
