/**
 * SEEDS THE BLANK CATALOGUE — loads the three committed vendor catalogues under `db/seed/blanks/`
 * through the tested reader (`lib/blanks/seed-files.ts`, never a CSV parse of its own) and writes
 * them into the `blanks` table: one row per blank, its stations exactly as the catalogue printed
 * them, converted once to millimetres, with an empty cell stored as null — never 0, and never an
 * interpolated value (R8). Curves through the stations are drawn on top of these rows, so the curve
 * method can change without re-seeding.
 *
 * Safe to run again: the whole catalogue goes in as ONE `INSERT … ON CONFLICT (vendor, name)
 * DO UPDATE` statement, so a blank already there is updated in place rather than duplicated. The
 * Neon HTTP driver has no interactive transactions, and it does not need one — a single statement
 * is atomic on its own: either every blank lands or none does. WITHOUT `--prune` the seed only ever
 * adds or updates: it can never remove a blank.
 *
 * `--prune` takes out of the table the blanks that are no longer in the catalogue files. After the
 * upsert it removes every blank whose maker and name are both missing from the files — one
 * statement per blank, matched on maker AND name, one line printed per blank removed:
 *   removed (no longer in the catalogue): <maker> <name>
 * Use it after a blank is renamed in, or withdrawn from, the catalogue files: the next plain run
 * would otherwise fail its count check and name the blank. It is guarded — it refuses, removing
 * nothing and exiting 1, when the catalogue read is empty or when more than
 * `MAX_BLANKS_REMOVED_PER_RUN` (5, in lib/blanks/prune.ts) blanks would go in one run. `--check`
 * never writes, so `--check --prune` is refused before any database work. A board a shaper has
 * already saved is never affected: it carries its own copy of its blank.
 *
 * Every run ends with a read-only count of what the table now holds:
 *   blanks: <total> (US Blanks <n>, Arctic Foam <n>, Marko Foam <n>); pickable: <n>
 * then exits 1, with one plain line saying what was expected and what was found, when the table
 * is empty, when its total differs from the catalogue's own count (read through `readSeedCatalog`,
 * never a typed number), or when any one vendor's count differs from that vendor's count in the
 * catalogue — so `--check` fails on an unseeded or half-seeded table, not only on a wrong row.
 * Finally it checks that every stored blank reads back exactly as its CSV rows (exit 1 if one does
 * not).
 *
 * Commands (D-20: nothing in package.json — no npm script, no dependency; `--no-install` means npx
 * can only ever run the tsx already in node_modules, never download one):
 *
 *   development (reads .env.local — the Neon development branch):
 *     npx --no-install tsx scripts/seed-blanks.ts
 *   development, also removing blanks that have left the catalogue files:
 *     npx --no-install tsx scripts/seed-blanks.ts --prune
 *   read-only check, writes nothing:
 *     npx --no-install tsx scripts/seed-blanks.ts --check
 *   production — ONLY after the code is pushed, deployed, and `npm run db:migrate:prod` has run
 *   (CLAUDE.md, Database). The production env is pulled to a temporary file and deleted on exit:
 *     bash -c 'trap "rm -f .env.production.pull" EXIT; npx vercel env pull --yes --environment=production .env.production.pull && SEED_ENV_FILE=.env.production.pull npx --no-install tsx scripts/seed-blanks.ts && SEED_ENV_FILE=.env.production.pull npx --no-install tsx scripts/seed-blanks.ts --check'
 *   production, after a blank is renamed or withdrawn (the same, with --prune on the seeding run):
 *     bash -c 'trap "rm -f .env.production.pull" EXIT; npx vercel env pull --yes --environment=production .env.production.pull && SEED_ENV_FILE=.env.production.pull npx --no-install tsx scripts/seed-blanks.ts --prune && SEED_ENV_FILE=.env.production.pull npx --no-install tsx scripts/seed-blanks.ts --check'
 *
 * Which env file is read is controlled by `SEED_ENV_FILE` (default `.env.local`, resolved from the
 * current directory), mirroring `MIGRATE_ENV_FILE` in drizzle.config.ts: when the file exists, any
 * DATABASE_URL / DATABASE_URL_UNPOOLED already in the shell is dropped first, because
 * `process.loadEnvFile` never overwrites a variable that already exists. The connection string is
 * never printed. The database client reads DATABASE_URL the moment it loads, so it is imported only
 * after the env file is loaded.
 */

import { existsSync } from "node:fs";
import path from "node:path";
// Pure and import-free, so it is safe to load before the env file is read.
import { planBlankRemoval, readSeedOptions, staleBlanks } from "../lib/blanks/prune";

async function main(): Promise<void> {
  const options = readSeedOptions(process.argv.slice(2));
  if (options.status === "refused") {
    console.error(options.reason);
    process.exitCode = 1;
    return;
  }
  const { check: checkOnly, prune } = options;

  const envFile = path.resolve(process.cwd(), process.env.SEED_ENV_FILE ?? ".env.local");
  if (existsSync(envFile)) {
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_URL_UNPOOLED;
    process.loadEnvFile(envFile);
  } else if (process.env.SEED_ENV_FILE) {
    throw new Error(`SEED_ENV_FILE names ${process.env.SEED_ENV_FILE}, which does not exist`);
  }
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "no DATABASE_URL — run this from the project folder that holds .env.local, or set SEED_ENV_FILE",
    );
  }

  // Relative imports on purpose: the script always uses the lib/ files that sit next to it.
  const { and, eq, sql } = await import("drizzle-orm");
  const { db } = await import("../lib/db/client");
  const { blanks } = await import("../lib/db/schema");
  const { blankRecordToRow, blankRowToRecord } = await import("../lib/db/blanks");
  const { readSeedCatalog, SEED_CSV_DIR } = await import("../lib/blanks/seed-files");
  const { isPickable } = await import("../lib/blanks/catalog");

  const catalog = readSeedCatalog(SEED_CSV_DIR);

  if (!checkOnly) {
    // `excluded.<column>` is the row the insert proposed. Only a column name taken from the schema
    // object ever reaches sql.raw — never a value from the CSVs, which travel as parameters.
    const excluded = (column: { name: string }) => sql.raw(`excluded."${column.name}"`);
    await db
      .insert(blanks)
      .values(catalog.map(blankRecordToRow))
      .onConflictDoUpdate({
        target: [blanks.vendor, blanks.name],
        set: {
          lengthMm: excluded(blanks.lengthMm),
          deckLengthMm: excluded(blanks.deckLengthMm),
          volumeLitres: excluded(blanks.volumeLitres),
          catalogSlug: excluded(blanks.catalogSlug),
          pdfPage: excluded(blanks.pdfPage),
          stations: excluded(blanks.stations),
          updatedAt: new Date(),
        },
      });

    // --prune only: take out the blanks that have left the catalogue files. The plan decides what
    // may go (and refuses on an empty catalogue or more than the limit); the statement below is
    // this script's only delete, one per blank, matched on maker AND name, values as parameters.
    if (prune) {
      const inTable = await db.select({ vendor: blanks.vendor, name: blanks.name }).from(blanks);
      const plan = planBlankRemoval(inTable, catalog);
      if (plan.status === "refused") {
        console.error(plan.reason);
        process.exitCode = 1;
      } else if (plan.blanks.length === 0) {
        console.log("nothing to remove: every blank in the table is in the catalogue files");
      } else {
        for (const blank of plan.blanks) {
          const removed = await db.delete(blanks)
            .where(and(eq(blanks.vendor, blank.vendor), eq(blanks.name, blank.name)))
            .returning({ vendor: blanks.vendor, name: blanks.name });
          for (const row of removed) {
            console.log(`removed (no longer in the catalogue): ${row.vendor} ${row.name}`);
          }
        }
      }
    }
  }

  // Read-only from here on.
  const rows = await db
    .select({
      vendor: blanks.vendor,
      name: blanks.name,
      lengthMm: blanks.lengthMm,
      deckLengthMm: blanks.deckLengthMm,
      volumeLitres: blanks.volumeLitres,
      catalogSlug: blanks.catalogSlug,
      pdfPage: blanks.pdfPage,
      stations: blanks.stations,
    })
    .from(blanks);
  const stored = rows.map(blankRowToRecord);

  const perVendor = (vendor: string) => stored.filter((record) => record.vendor === vendor).length;
  console.log(
    `blanks: ${stored.length} (US Blanks ${perVendor("US Blanks")}, Arctic Foam ${perVendor("Arctic Foam")}, Marko Foam ${perVendor("Marko Foam")}); pickable: ${stored.filter(isPickable).length}`,
  );

  // The counts first: an empty or short table fails here, in --check mode too (WR-03). Every
  // expected number is counted from the catalogue itself.
  const vendors = [...new Set([...catalog, ...stored].map((record) => record.vendor))];
  const vendorMismatches = vendors
    .map((vendor) => ({
      vendor,
      expected: catalog.filter((record) => record.vendor === vendor).length,
      found: perVendor(vendor),
    }))
    .filter(({ expected, found }) => expected !== found);
  if (stored.length === 0 || stored.length !== catalog.length || vendorMismatches.length > 0) {
    const byVendor = vendorMismatches.map(({ vendor, expected, found }) => `${vendor} expected ${expected}, found ${found}`);
    console.error(
      `The blanks table does not hold the whole catalogue: expected ${catalog.length} blanks, found ${stored.length}` +
        (byVendor.length > 0 ? ` (${byVendor.join("; ")})` : "") +
        ".",
    );
    process.exitCode = 1;
  }

  // Without --prune, name any blank the table holds that the catalogue files no longer have. (With
  // --prune a refusal has already said why, so this line is not printed.)
  const leftOver = staleBlanks(stored, catalog);
  if (!prune && leftOver.length > 0) {
    console.error(
      `  no longer in the catalogue files: ${leftOver.map((blank) => `${blank.vendor} ${blank.name}`).join(", ")} — run the seed with --prune to remove ${leftOver.length === 1 ? "it" : "them"}`,
    );
    process.exitCode = 1;
  }

  // Every stored blank must read back exactly as the CSVs give it — every station value at full
  // precision, every empty cell still null.
  const expected = new Map(catalog.map((record) => [`${record.vendor}\u0000${record.name}`, record]));
  const differing = stored.filter((record) => {
    const csv = expected.get(`${record.vendor}\u0000${record.name}`);
    return !csv || JSON.stringify(csv) !== JSON.stringify(record);
  });
  const missing = catalog.length - (stored.length - differing.length);
  console.log(
    `matching the catalogue CSVs exactly: ${stored.length - differing.length} of ${catalog.length}`,
  );
  if (differing.length > 0) {
    for (const record of differing) {
      console.error(`  differs from (or is not in) the CSVs: ${record.vendor} ${record.name}`);
    }
    process.exitCode = 1;
  }
  if (missing > 0) {
    console.error(`  ${missing} catalogue blank(s) are not in the table`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(
    `Could not seed the blank catalogue: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
