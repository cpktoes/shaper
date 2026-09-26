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
