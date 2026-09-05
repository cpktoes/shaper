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
 * `userPreferences` (05-02) holds one row per shaper for account-level settings — currently
 * just the units system (Imperial/Metric, UNIT-03). Unlike `models`, `clerkUserId` here is the
 * **primary key**, not just an indexed column: a shaper has exactly one preferences row, so a
 * write is a natural upsert rather than an insert-many. `units` is **nullable on purpose** —
 * "this shaper hasn't chosen a system yet" is a real, distinct state from "chose Imperial"
 * (D-10), and the column has to be able to say so. This is not a users table by another name:
 * it holds per-user *preferences*, not identity — Clerk still owns that.
 */

import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type UserPreferenceRow = typeof userPreferences.$inferSelect;
