/**
 * CHECKS THE ACCOUNT SETTINGS COLUMNS — a read-only proof that the shaper's newer account settings
 * have somewhere to live: `user_preferences` holds `planer_max_depth_mm` (double precision),
 * `deck_skin_mm` (double precision) and `tip_style` (text), migration 0006 (Phase 12 D-01, D-03,
 * D-04), and `hidden_blank_makers` (text), migration 0007 (quick task 260926-wmf: the blank makers a
 * shaper switched off in the gear menu). It also reports the state of the retired
 * `extra_center_thickness_mm` column — dropped by migration 0008 (quick task 260927-qrn, D-19).
 *
 * By default the retired column is expected ABSENT: from migration 0008 on, "gone" is the normal
 * state everywhere the check runs. Pass `--before-drop` for the one case where PRESENT is expected
 * instead — production's single run just before its own DROP (a removal deploys first and drops
 * after, D-19, CLAUDE.md Database "removals wait for the deploy"). Any other option is refused
 * before any database work, with exit 1.
 *
 * Why a separate check at all: `drizzle-kit migrate` prints "migrations applied successfully" even
 * when it applied nothing, so that line proves nothing on its own. This script asks the database.
 *
 * It writes nothing. It prints exactly two lines:
 *   user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text (4 of 4 columns); extra_center_thickness_mm absent (expected absent)
 *   drizzle migrations recorded: <n>
 * with `missing` in place of any column it did not find, and the retired column's line-1 ending one
 * of `present (expected present)`, `absent (expected absent)`, `present (expected absent)` or
 * `absent (expected present)`. Exits 1 when fewer than 4 of the 4 columns match their types, or when
 * the retired column's actual state differs from the expected one. Only column names, their types
 * and a count are ever printed — never the connection string, never row data. When the check itself
 * fails (the database can't be reached, say) it prints one fixed sentence with the error's kind and
 * code only — never the driver's message, which can name the database host — unless `--verbose` is
 * added to the command, which appends that message for debugging.
 *
 * Commands (D-20: nothing in package.json — no npm script, no dependency; `--no-install` means npx
 * can only ever run the tsx already in node_modules, never download one):
 *
 *   development, from the main checkout (reads .env.local — the Neon development branch):
 *     npx --no-install tsx scripts/check-preference-columns.ts
 *   development, from a worktree (names the main checkout's env file):
 *     CHECK_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/check-preference-columns.ts
 *   production — quick task 260927-qrn, run once, in the founder's terminal, from the main checkout,
 *   only AFTER the deploy that stops naming the column is live: it pulls the production settings to
 *   a temporary file, checks the column is still there, runs the drop, checks it is gone, and
 *   deletes the file on exit. Any failed step stops the rest.
 *     bash -c 'trap "rm -f .env.production.pull" EXIT INT TERM; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-preference-columns.ts --before-drop && MIGRATE_ENV_FILE=.env.production.pull npx --no-install drizzle-kit migrate && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-preference-columns.ts'
 *   Earlier production runs (plan 12-10, quick 260926-wmf) used the check on its own, after
 *   `npm run db:migrate:prod`.
 *
 * Which env file is read is controlled by `CHECK_ENV_FILE` (default `.env.local`, resolved from the
 * current directory), mirroring `SEED_ENV_FILE` in scripts/seed-blanks.ts: when the file exists, any
 * DATABASE_URL / DATABASE_URL_UNPOOLED already in the shell is dropped first, because
 * `process.loadEnvFile` never overwrites a variable that already exists. The database client reads
 * DATABASE_URL the moment it loads, so it is imported only after the env file is loaded.
 */

import { existsSync } from "node:fs";
import path from "node:path";

/** The Phase 12 columns, then quick task 260926-wmf's, and the type each must have. */
const NEW_COLUMNS = [
  { name: "planer_max_depth_mm", type: "double precision" },
  { name: "deck_skin_mm", type: "double precision" },
  { name: "tip_style", type: "text" },
  { name: "hidden_blank_makers", type: "text" },
] as const;

/**
 * Retired by Phase 12 D-10, dropped by migration 0008 (quick task 260927-qrn, D-19). Expected
 * absent unless `--before-drop`.
 */
const RETIRED_COLUMN = "extra_center_thickness_mm";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg !== "--before-drop" && arg !== "--verbose") {
      console.error(`Unknown option "${arg}": the only options are --before-drop and --verbose.`);
      process.exitCode = 1;
      return;
    }
  }
  const expectPresent = args.includes("--before-drop");

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
      and column_name in ('planer_max_depth_mm', 'deck_skin_mm', 'tip_style', 'hidden_blank_makers', 'extra_center_thickness_mm')
  `);
  const found = new Map<string, string>();
  for (const row of columnResult.rows as Array<{ column_name: string; data_type: string }>) {
    found.set(String(row.column_name), String(row.data_type));
  }

  const countResult = await db.execute(sql`select count(*) as n from drizzle.__drizzle_migrations`);
  const recorded = String((countResult.rows[0] as { n: unknown } | undefined)?.n ?? "?");

  const described = NEW_COLUMNS.map(({ name }) => `${name} ${found.get(name) ?? "missing"}`);
  const present = NEW_COLUMNS.filter(({ name, type }) => found.get(name) === type).length;
  const retiredPresent = found.has(RETIRED_COLUMN);
  const expectedWord = expectPresent ? "expected present" : "expected absent";
  const actualWord = retiredPresent ? "present" : "absent";

  console.log(
    `user_preferences: ${described.join(", ")} (${present} of ${NEW_COLUMNS.length} columns); ` +
      `${RETIRED_COLUMN} ${actualWord} (${expectedWord})`,
  );
  console.log(`drizzle migrations recorded: ${recorded}`);

  if (present !== NEW_COLUMNS.length || retiredPresent !== expectPresent) {
    process.exitCode = 1;
  }
}

/**
 * A failure in words that never quote the database driver: its own message can name the database
 * host (`getaddrinfo ENOTFOUND ep-…neon.tech`), so by default only the error's kind (`name`) and
 * its `code`, when it has one, are printed. `--verbose` appends the driver's message for debugging.
 */
function describeFailure(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const rawCode =
    typeof error === "object" && error !== null && "code" in error ? (error as { code: unknown }).code : undefined;
  const kind = rawCode === undefined || rawCode === null ? name : `${name}, code ${String(rawCode)}`;
  if (process.argv.includes("--verbose")) {
    return `(${kind}): ${error instanceof Error ? error.message : String(error)}`;
  }
  return `(${kind}). Run again with --verbose to see the database driver's own message.`;
}

main().catch((error: unknown) => {
  console.error(`Could not check the user_preferences columns ${describeFailure(error)}`);
  process.exitCode = 1;
});
