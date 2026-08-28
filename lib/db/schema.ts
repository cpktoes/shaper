/**
 * Drizzle schema — one table. There is deliberately no local `users` table: Clerk is the source
 * of truth for identity, and nothing in v1 needs per-user data beyond what Clerk already holds
 * (RESEARCH.md Alternatives, assumption A2). If a later phase needs richer per-user data,
 * retrofitting a users table is a straightforward addition, not a rewrite.
 *
 * The `snapshot` column holds the full serialized `DesignSnapshot` (lib/models/design-snapshot.ts)
 * — outline, rails, fins, volume, finsImportTemplate, boardName, finSystem, wrapped with a
 * version number. This file only describes storage shape; it never validates or interprets that
 * JSON — that boundary lives entirely in lib/models/design-snapshot.ts.
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
