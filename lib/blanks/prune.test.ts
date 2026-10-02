import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  MAX_BLANKS_REMOVED_PER_RUN,
  planBlankRemoval,
  readSeedOptions,
  staleBlanks,
  type BlankKey,
} from "./prune";
import { readSeedCatalog } from "./seed-files";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SEED_SCRIPT_PATH = join(REPO_ROOT, "scripts/seed-blanks.ts");

/** A local copy of lib/db/ownership.test.ts's stripComments: drops block and `//` line comments. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

const US = "US Blanks";
const OLD: BlankKey = { vendor: US, name: `10'0"T` };
const NEW: BlankKey = { vendor: US, name: `10'10"T` };
const OTHERS: BlankKey[] = [
  { vendor: US, name: `6'2"A` },
  { vendor: "Arctic Foam", name: `6'0" G` },
  { vendor: "Marko Foam", name: `7'0" MF` },
];

/** n distinct made-up stale blanks, for the boundary tests. */
function manyStale(n: number): BlankKey[] {
  return Array.from({ length: n }, (_, i) => ({ vendor: US, name: `old ${i}` }));
}

describe("readSeedOptions", () => {
  it("reads no arguments as a plain seed run", () => {
    expect(readSeedOptions([])).toEqual({ status: "ok", check: false, prune: false });
  });

  it("reads --check and --prune on their own", () => {
    expect(readSeedOptions(["--check"])).toEqual({ status: "ok", check: true, prune: false });
    expect(readSeedOptions(["--prune"])).toEqual({ status: "ok", check: false, prune: true });
  });

  it("refuses --check together with --prune, in either order, naming both", () => {
    for (const args of [["--check", "--prune"], ["--prune", "--check"]]) {
      const result = readSeedOptions(args);
      expect(result.status).toBe("refused");
      if (result.status === "refused") {
        expect(result.reason).toContain("--check");
        expect(result.reason).toContain("--prune");
      }
    }
  });

  it("ignores an argument it does not know, exactly as before", () => {
    expect(readSeedOptions(["--verbose"])).toEqual({ status: "ok", check: false, prune: false });
  });
});

describe("staleBlanks", () => {
  it("finds nothing stale when the same pairs come in a different order", () => {
    expect(staleBlanks([...OTHERS].reverse(), OTHERS)).toEqual([]);
  });

  it("finds exactly the one renamed blank", () => {
    expect(staleBlanks([...OTHERS, OLD], [...OTHERS, NEW])).toEqual([{ vendor: OLD.vendor, name: OLD.name }]);
  });

  it("calls a blank from a maker the catalogue does not have stale", () => {
    const clark = { vendor: "Clark Foam", name: `6'2"A` };
    expect(staleBlanks([...OTHERS, clark], OTHERS)).toEqual([clark]);
  });

  it("matches maker and name as a pair, never as one joined string", () => {
    // the same name under another maker
    expect(staleBlanks([{ vendor: "Arctic Foam", name: `6'2"A` }], [{ vendor: US, name: `6'2"A` }])).toEqual([
      { vendor: "Arctic Foam", name: `6'2"A` },
    ]);
    // a split of "US Blanks 9'0"" that would collide if joined with a space
    const split = { vendor: "US", name: `Blanks 9'0"` };
    expect(staleBlanks([split], [{ vendor: US, name: `9'0"` }])).toEqual([split]);
  });

  it("matches exactly: other capitals or a trailing space are stale", () => {
    const catalogue = [{ vendor: US, name: `6'2"A` }];
    expect(staleBlanks([{ vendor: "us blanks", name: `6'2"A` }], catalogue)).toHaveLength(1);
    expect(staleBlanks([{ vendor: US, name: `6'2"A ` }], catalogue)).toHaveLength(1);
    expect(staleBlanks([{ vendor: `${US} `, name: `6'2"A` }], catalogue)).toHaveLength(1);
  });

  it("returns a stale pair given twice once, sorted by maker then name, holding only maker and name", () => {
    const stored = [
      { vendor: "Marko Foam", name: "b", extra: 1 },
      { vendor: US, name: "b", extra: 2 },
      { vendor: US, name: "a", extra: 3 },
      { vendor: US, name: "b", extra: 4 },
      { vendor: "Arctic Foam", name: "z", extra: 5 },
    ];
    const result = staleBlanks(stored, []);
    expect(result).toEqual([
      { vendor: "Arctic Foam", name: "z" },
      { vendor: "Marko Foam", name: "b" },
      { vendor: US, name: "a" },
      { vendor: US, name: "b" },
    ]);
    for (const entry of result) expect(Object.keys(entry).sort()).toEqual(["name", "vendor"]);
  });

  it("with an empty catalogue calls every stored blank stale (the refusal belongs to planBlankRemoval)", () => {
    expect(staleBlanks(OTHERS, [])).toHaveLength(OTHERS.length);
  });

  it("drift guard: the real catalogue read against itself has nothing stale", () => {
    expect(staleBlanks(readSeedCatalog(), readSeedCatalog())).toEqual([]);
  });
});

describe("planBlankRemoval", () => {
  it("removes nothing when nothing is stale, and the one blank when one is", () => {
    expect(planBlankRemoval(OTHERS, OTHERS)).toEqual({ status: "remove", blanks: [] });
    expect(planBlankRemoval([...OTHERS, OLD], [...OTHERS, NEW])).toEqual({ status: "remove", blanks: [OLD] });
  });

  it("pins the limit at 5", () => {
    expect(MAX_BLANKS_REMOVED_PER_RUN).toBe(5);
  });

  it("removes exactly the limit, and refuses one more, saying the limit and the count", () => {
    const atLimit = manyStale(MAX_BLANKS_REMOVED_PER_RUN);
    const allowed = planBlankRemoval([...OTHERS, ...atLimit], OTHERS);
    expect(allowed.status).toBe("remove");
    if (allowed.status === "remove") expect(allowed.blanks).toHaveLength(MAX_BLANKS_REMOVED_PER_RUN);

    const over = manyStale(MAX_BLANKS_REMOVED_PER_RUN + 1);
    const refused = planBlankRemoval([...OTHERS, ...over], OTHERS);
    expect(refused.status).toBe("refused");
    if (refused.status === "refused") {
      expect(refused.reason).toContain(String(MAX_BLANKS_REMOVED_PER_RUN));
      expect(refused.reason).toContain(String(over.length));
    }
  });

  it("refuses an empty catalogue first, with a full table and with an empty one", () => {
    for (const stored of [OTHERS, [], manyStale(MAX_BLANKS_REMOVED_PER_RUN + 3)]) {
      const result = planBlankRemoval(stored, []);
      expect(result.status).toBe("refused");
      if (result.status === "refused") expect(result.reason).toContain("catalogue files gave no blanks");
    }
  });
});

describe("the seed script's one removal statement (source contract)", () => {
  const source = stripComments(readFileSync(SEED_SCRIPT_PATH, "utf8"));

  it("has exactly one db.delete(, on blanks, constrained on maker AND name", () => {
    const calls = source.match(/db\.delete\(/g) ?? [];
    expect(calls).toHaveLength(1);
    const start = source.indexOf("db.delete(");
    const statement = source.slice(start, source.indexOf(";", start));
    expect(statement.startsWith("db.delete(blanks)")).toBe(true);
    const where = statement.slice(statement.indexOf(".where("));
    expect(where).toContain("and(");
    expect(where).toContain("eq(blanks.vendor,");
    expect(where).toContain("eq(blanks.name,");
  });

  it("has no raw SQL way to delete", () => {
    expect(source).not.toContain("db.execute(");
    expect(source).not.toMatch(/\bsql`/);
    expect(source).not.toMatch(/delete\s+from/i);
  });

  it("reads its options before the env file, and plans before it deletes", () => {
    expect(source.indexOf("readSeedOptions(")).toBeGreaterThanOrEqual(0);
    expect(source.indexOf("readSeedOptions(")).toBeLessThan(source.indexOf("loadEnvFile("));
    const del = source.indexOf("db.delete(");
    expect(source.indexOf(".onConflictDoUpdate(")).toBeGreaterThanOrEqual(0);
    expect(source.indexOf(".onConflictDoUpdate(")).toBeLessThan(del);
    expect(source.indexOf("planBlankRemoval(")).toBeGreaterThanOrEqual(0);
    expect(source.indexOf("planBlankRemoval(")).toBeLessThan(del);
  });
});
