/**
 * CHECKS THE PHASE 12 SETTINGS COLUMNS — a read-only proof that the shaper's three new account
 * defaults have somewhere to live: `user_preferences` holds `planer_max_depth_mm` (double precision),
 * `deck_skin_mm` (double precision) and `tip_style` (text), migration 0006 (D-01, D-03, D-04). It also
 * proves the retired `extra_center_thickness_mm` column is STILL there — that column is dropped only
 * in a follow-up step after the deploy (D-19, CLAUDE.md Database), so finding it gone means a DROP
 * ran too early.
 *
 * Why a separate check at all: `drizzle-kit migrate` prints "migrations applied successfully" even
 * when it applied nothing, so that line proves nothing on its own. This script asks the database.
 *
 * It writes nothing. It prints exactly two lines:
 *   user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text (3 of 3 new columns); extra_center_thickness_mm kept
 *   drizzle migrations recorded: <n>
 * with `missing` in place of any column it did not find, and exits 1 when any of the three new
 * columns is missing or has another type, or when `extra_center_thickness_mm` is gone. Only column
 * names, their types and a count are ever printed — never the connection string, never row data.
 *
 * Commands (D-20: nothing in package.json — no npm script, no dependency; `--no-install` means npx
 * can only ever run the tsx already in node_modules, never download one):
 *
 *   development, from the main checkout (reads .env.local — the Neon development branch):
 *     npx --no-install tsx scripts/check-preference-columns.ts
 *   development, from a worktree (names the main checkout's env file):
 *     CHECK_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/check-preference-columns.ts
 *   production — the founder only (plan 12-10), after `npm run db:migrate:prod` and BEFORE the
 *   deploy. The production env is pulled to a temporary file and deleted on exit:
 *     bash -c 'trap "rm -f .env.production.pull" EXIT; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-preference-columns.ts'
 *
 * Which env file is read is controlled by `CHECK_ENV_FILE` (default `.env.local`, resolved from the
 * current directory), mirroring `SEED_ENV_FILE` in scripts/seed-blanks.ts: when the file exists, any
 * DATABASE_URL / DATABASE_URL_UNPOOLED already in the shell is dropped first, because
 * `process.loadEnvFile` never overwrites a variable that already exists. The database client reads
 * DATABASE_URL the moment it loads, so it is imported only after the env file is loaded.
 */

import { existsSync } from "node:fs";
import path from "node:path";

/** The three Phase 12 columns and the type each must have. */
const NEW_COLUMNS = [
  { name: "planer_max_depth_mm", type: "double precision" },
  { name: "deck_skin_mm", type: "double precision" },
  { name: "tip_style", type: "text" },
] as const;

/** Retired by Phase 12 D-10, but it must survive this phase's migration run (D-19). */
const RETIRED_COLUMN = "extra_center_thickness_mm";

async function main(): Promise<void> {
  const envFile = path.resolve(process.cwd(), process.env.CHECK_ENV_FILE ?? ".env.local");
  if (existsSync(envFile)) {
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_URL_UNPOOLED;
    process.loadEnvFile(envFile);
  } else if (process.env.CHECK_ENV_FILE) {
    throw new Error(`CHECK_ENV_FILE names ${process.env.CHECK_ENV_FILE}, which does not exist`);
  }
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "no DATABASE_URL — run this from the project folder that holds .env.local, or set CHECK_ENV_FILE",
    );
  }

  // Relative imports on purpose: the script always uses the lib/ files that sit next to it.
  const { sql } = await import("drizzle-orm");
  const { db } = await import("../lib/db/client");

  // Read-only: two selects, nothing else.
  const columnResult = await db.execute(sql`
    select column_name, data_type
    from information_schema.columns
    where table_name = 'user_preferences'
      and column_name in ('planer_max_depth_mm', 'deck_skin_mm', 'tip_style', 'extra_center_thickness_mm')
  `);
  const found = new Map<string, string>();
  for (const row of columnResult.rows as Array<{ column_name: string; data_type: string }>) {
    found.set(String(row.column_name), String(row.data_type));
  }

  const countResult = await db.execute(sql`select count(*) as n from drizzle.__drizzle_migrations`);
  const recorded = String((countResult.rows[0] as { n: unknown } | undefined)?.n ?? "?");

  const described = NEW_COLUMNS.map(({ name }) => `${name} ${found.get(name) ?? "missing"}`);
  const present = NEW_COLUMNS.filter(({ name, type }) => found.get(name) === type).length;
  const retiredKept = found.has(RETIRED_COLUMN);

  console.log(
    `user_preferences: ${described.join(", ")} (${present} of ${NEW_COLUMNS.length} new columns); ` +
      `${RETIRED_COLUMN} ${retiredKept ? "kept" : "missing"}`,
  );
  console.log(`drizzle migrations recorded: ${recorded}`);

  if (present !== NEW_COLUMNS.length || !retiredKept) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(
    `Could not check the user_preferences columns: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
