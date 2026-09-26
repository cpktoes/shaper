/**
 * The committed blank catalogues — the ONE file that names the three seed CSVs under
 * `db/seed/blanks/`. The seed script (11-05), the database fallback for browser tests (11-05), the
 * preset generator (11-10) and the tests all read the catalogue through `readSeedCatalog`, so the
 * list of files and how they are read can never drift apart.
 *
 * NODE ONLY: this reads from disk with `node:fs`. Nothing that runs in a browser may import it —
 * the pure mapping it delegates to lives in `csv.ts` and `catalog.ts`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BlankRecord } from "@/lib/geometry/blank";
import { rowsToBlankRecords } from "./catalog";
import { parseCsv } from "./csv";

/** The three vendor catalogues, in the order they are read. */
export const SEED_CSV_FILES = [
  "us_blanks_stations.csv",
  "arctic_foam_stations.csv",
  "marko_foam_stations.csv",
] as const;

/**
 * `<repo>/db/seed/blanks/`, resolved from this file's own location — correct wherever the source
 * file itself runs (vitest, tsx). Inside a Next.js server bundle `import.meta.url` points at the
 * built chunk instead, so a server caller passes its own directory (built from `process.cwd()`).
 */
export const SEED_CSV_DIR = fileURLToPath(new URL("../../db/seed/blanks/", import.meta.url));

/** Reads and maps all three catalogues: every blank, in file order, pickable or not. */
export function readSeedCatalog(dir: string = SEED_CSV_DIR): BlankRecord[] {
  return SEED_CSV_FILES.flatMap((file) =>
    rowsToBlankRecords(parseCsv(readFileSync(join(dir, file), "utf8")), file),
  );
}
