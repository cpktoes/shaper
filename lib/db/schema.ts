/**
 * Drizzle schema. There is deliberately no local `users` table: Clerk is the source of truth
 * for identity, and nothing here duplicates it — every table below is keyed by the Clerk user
 * id rather than owning an identity row of its own (RESEARCH.md Alternatives, assumption A2).
 *
 * `models` holds one row per saved board. The `snapshot` column holds the full serialized
 * `DesignSnapshot` (lib/models/design-snapshot.ts) — outline, rails, fins, volume,
 * finsImportTemplate, boardName, finSystem, wrapped with a version number. This file only
 * describes storage shape; it never validates or interprets that JSON — that boundary lives
 * entirely in lib/models/design-snapshot.ts.
 *
 * `userPreferences` (05-02, extended 08-02) holds one row per shaper for account-level
 * settings — the units system (Imperial/Metric, UNIT-03) and, from Phase 8, whether to include
 * the Rail Band Instructions sheet when printing (PRNT-05). Unlike `models`, `clerkUserId` here
 * is the **primary key**, not just an indexed column: a shaper has exactly one preferences row,
 * so a write is a natural upsert rather than an insert-many. Both `units` and
 * `printRailInstructions` are **nullable on purpose** — "this shaper hasn't chosen yet" is a
 * real, distinct state from an explicit choice (D-10 for units, D-07/Pitfall 3 for the print
 * toggle), and each column has to be able to say so; neither carries a `.notNull()` or a
 * `.default()`. This is not a users table by another name: it holds per-user *preferences*, not
 * identity — Clerk still owns that.
 *
 * Phase 11 (D-09) adds five more columns to the same row: the shaper's fit and tip defaults —
 * Extra Length, Extra Center Thickness and Width Margin (the three rules that decide which real
 * blanks a board fits into, D-04/D-05), and the Nose and Tail Tip thicknesses a new board starts
 * from. All five are millimetres, stored as `double precision`, and all five are nullable with no
 * default for the same reason as `units`: "this shaper hasn't chosen" is a real state, and the app
 * shows the standard default until they do. Every read of these columns goes through
 * `lib/fit-defaults-preference.ts`'s allow-list, and every read of this table selects only the
 * columns it needs — so the existing units and print reads never ask for a column that a
 * not-yet-migrated database doesn't have. Quick task 260926-wmf adds one more nullable text column,
 * `hidden_blank_makers`: the blank makers a shaper has switched off, read through
 * `lib/blank-makers-preference.ts`'s allow-list.
 *
 * `blanks` (Phase 11) holds the three vendor foam-blank catalogues — one row per blank, public
 * catalogue data that belongs to no shaper, so it has no owner column at all and is read through
 * its own file (`lib/db/blanks.ts`), never through the owner-scoped `queries.ts`. It stores the
 * catalogue's RAW stations only (R8): each station exactly as the catalogue printed it, converted
 * once to millimetres by the tested reader, with `null` for a cell the catalogue left empty (never
 * 0). Nothing interpolated is ever stored — curves through the stations are drawn on top of these
 * rows, so the curve method can change without re-seeding. The stations live in ONE `jsonb` column
 * rather than a normalised stations table: a board's chosen blank is copied into the board by value
 * (D-01), and a jsonb list makes that copy a straight object copy, while also making per-station
 * columns (`t12`, `n6`, …) impossible — blanks carry anywhere from 5 to 15 stations. Unique on
 * (vendor, name) so the seed can upsert. Filled by `scripts/seed-blanks.ts` from the committed CSVs
 * under `db/seed/blanks/`.
 */

import type { BlankStation } from "@/lib/geometry/blank";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const models = pgTable(
  "models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    name: text("name").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("models_clerk_user_id_idx").on(table.clerkUserId)],
);

export type ModelRow = typeof models.$inferSelect;

export const userPreferences = pgTable("user_preferences", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  units: text("units"),
  printRailInstructions: boolean("print_rail_instructions"),
  extraLengthMm: doublePrecision("extra_length_mm"),
  // Retired by Phase 12 (D-10): no longer read or written. It stays declared, and stays in the
  // database, until a follow-up step after the deploy drops it (D-19, CLAUDE.md Database).
  extraCenterThicknessMm: doublePrecision("extra_center_thickness_mm"),
  widthMarginMm: doublePrecision("width_margin_mm"),
  noseTipThicknessMm: doublePrecision("nose_tip_thickness_mm"),
  tailTipThicknessMm: doublePrecision("tail_tip_thickness_mm"),
  // Phase 12 (D-01, D-03, D-04): the shaper's Planer Max Depth and Deck Skin defaults (both
  // millimetres) and Tip Style default (Pin deck / Bottom; the allowed values live in the reader's
  // allow-list, lib/fit-defaults-preference.ts). Null = not chosen, like every column above.
  planerMaxDepthMm: doublePrecision("planer_max_depth_mm"),
  deckSkinMm: doublePrecision("deck_skin_mm"),
  tipStyle: text("tip_style"),
  // Quick task 260926-wmf: the blank makers a shaper switched OFF in the gear menu's BLANK MAKERS
  // tick boxes, as JSON text of catalogue vendor names (e.g. `["Arctic Foam"]`). Null = not chosen,
  // which means every maker is on. The allow-list lives in lib/blank-makers-preference.ts.
  hiddenBlankMakers: text("hidden_blank_makers"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type UserPreferenceRow = typeof userPreferences.$inferSelect;

export const blanks = pgTable(
  "blanks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vendor: text("vendor").notNull(),
    name: text("name").notNull(),
    lengthMm: doublePrecision("length_mm").notNull(),
    deckLengthMm: doublePrecision("deck_length_mm"),
    volumeLitres: doublePrecision("volume_litres"),
    catalogSlug: text("catalog_slug").notNull(),
    pdfPage: integer("pdf_page").notNull(),
    stations: jsonb("stations").$type<BlankStation[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("blanks_vendor_name_idx").on(table.vendor, table.name)],
);

export type BlankRow = typeof blanks.$inferSelect;
