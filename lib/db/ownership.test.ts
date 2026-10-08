import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-contract tests, in the same idiom as lib/theme.test.ts (which reads a source file and
 * asserts it agrees with a rule). These are the machine-checkable form of this phase's central
 * access-control mitigation (T-02-02..04): a shaper editing another shaper's board by guessing
 * or reusing its row id (IDOR). They fail loudly if a later edit reintroduces that shape.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const ACTIONS_PATH = join(REPO_ROOT, "app/design/actions.ts");
const QUERIES_PATH = join(REPO_ROOT, "lib/db/queries.ts");
const UNITS_ACTIONS_PATH = join(REPO_ROOT, "app/actions/units.ts");
const PRINT_INSTRUCTIONS_ACTIONS_PATH = join(REPO_ROOT, "app/actions/print-instructions.ts");
const FIT_DEFAULTS_ACTIONS_PATH = join(REPO_ROOT, "app/actions/fit-defaults.ts");
const BLANK_MAKERS_ACTIONS_PATH = join(REPO_ROOT, "app/actions/blank-makers.ts");
const RACK_ORDER_ACTIONS_PATH = join(REPO_ROOT, "app/actions/rack-order.ts");
const ACCOUNT_ACTIONS_PATH = join(REPO_ROOT, "app/actions/account.ts");
const BLANKS_READ_PATH = join(REPO_ROOT, "lib/db/blanks.ts");
const SCHEMA_PATH = join(REPO_ROOT, "lib/db/schema.ts");

/** Strips `//` line comments and `/* *\/` block comments, same helper as lib/auth/open-access.test.ts. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

/** Every `export async function NAME(params) {` declaration, with its full body (naive
 * brace-matched — sufficient for this file's small, flat function bodies). */
function exportedAsyncFunctions(source: string): { name: string; params: string; body: string }[] {
  const results: { name: string; params: string; body: string }[] = [];
  const re = /export\s+async\s+function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)[^{]*\{/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const [, name, params] = match;
    const bodyStart = match.index + match[0].length;
    let depth = 1;
    let i = bodyStart;
    for (; i < source.length && depth > 0; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") depth--;
    }
    results.push({ name, params, body: source.slice(bodyStart, i - 1) });
  }
  return results;
}

/** Every exported function signature (async or not) — used for the no-owner-parameter check,
 * which also applies to `listModels` (a plain read function, not a Server Action). */
function exportedFunctionSignatures(source: string): { name: string; params: string }[] {
  const results: { name: string; params: string }[] = [];
  const re = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    results.push({ name: match[1], params: match[2] });
  }
  return results;
}

describe("ownership (D-11's counterpart: never trust client-supplied identity)", () => {
  const actionsSource = stripComments(readFileSync(ACTIONS_PATH, "utf8"));
  const queriesSource = stripComments(readFileSync(QUERIES_PATH, "utf8"));
  const unitsActionsSource = stripComments(readFileSync(UNITS_ACTIONS_PATH, "utf8"));
  const printInstructionsActionsSource = stripComments(readFileSync(PRINT_INSTRUCTIONS_ACTIONS_PATH, "utf8"));
  const fitDefaultsActionsSource = stripComments(readFileSync(FIT_DEFAULTS_ACTIONS_PATH, "utf8"));
  const blankMakersActionsSource = stripComments(readFileSync(BLANK_MAKERS_ACTIONS_PATH, "utf8"));
  const rackOrderActionsSource = stripComments(readFileSync(RACK_ORDER_ACTIONS_PATH, "utf8"));
  // Quick 261006-g4u (2026-10-06, D-07): the Your data page's Export and Delete actions.
  const accountActionsSource = stripComments(readFileSync(ACCOUNT_ACTIONS_PATH, "utf8"));

  it("every exported async function in app/design/actions.ts, app/actions/units.ts, app/actions/print-instructions.ts, app/actions/fit-defaults.ts, app/actions/blank-makers.ts and app/actions/rack-order.ts awaits auth() before any database call", () => {
    const fns = [
      ...exportedAsyncFunctions(actionsSource),
      ...exportedAsyncFunctions(unitsActionsSource),
      ...exportedAsyncFunctions(printInstructionsActionsSource),
      ...exportedAsyncFunctions(fitDefaultsActionsSource),
      ...exportedAsyncFunctions(blankMakersActionsSource),
      ...exportedAsyncFunctions(rackOrderActionsSource),
      ...exportedAsyncFunctions(accountActionsSource),
    ];
    expect(fns.length).toBeGreaterThan(0);
    for (const fn of fns) {
      const authIndex = fn.body.indexOf("await auth()");
      const dbCallIndex = fn.body.search(/\bdb\.(select|insert|update|delete)\s*\(/);
      expect(authIndex, `${fn.name} never calls await auth()`).toBeGreaterThanOrEqual(0);
      if (dbCallIndex >= 0) {
        expect(
          authIndex,
          `${fn.name} calls a database method before await auth()`,
        ).toBeLessThan(dbCallIndex);
      }
    }
  });

  it("no exported function signature accepts a caller-supplied owner parameter", () => {
    const signatures = [
      ...exportedFunctionSignatures(actionsSource),
      ...exportedFunctionSignatures(queriesSource),
      ...exportedFunctionSignatures(unitsActionsSource),
      ...exportedFunctionSignatures(printInstructionsActionsSource),
      ...exportedFunctionSignatures(fitDefaultsActionsSource),
      ...exportedFunctionSignatures(blankMakersActionsSource),
      ...exportedFunctionSignatures(rackOrderActionsSource),
      ...exportedFunctionSignatures(accountActionsSource),
    ];
    expect(signatures.length).toBeGreaterThan(0);
    const offenders = signatures.filter((fn) => /userId|ownerId|clerkUserId/.test(fn.params));
    expect(offenders, JSON.stringify(offenders)).toEqual([]);
  });

  it("app/design/actions.ts exports exactly the five expected actions and no others", () => {
    // Written before renameModel/duplicateModel/deleteModel exist (02-04's RED step) — a fifth
    // action added later without being named here fails this test loudly rather than silently
    // skipping the ownership checks above.
    const fns = exportedAsyncFunctions(actionsSource).map((fn) => fn.name).sort();
    expect(fns).toEqual(["deleteModel", "duplicateModel", "renameModel", "saveModel", "setModelLocked"]);
  });

  it("app/actions/units.ts exports exactly the expected action and no others", () => {
    // Mirrors the assertion above for app/design/actions.ts — a second action added here later
    // without being named fails this test loudly rather than silently skipping these contracts.
    const fns = exportedAsyncFunctions(unitsActionsSource).map((fn) => fn.name).sort();
    expect(fns).toEqual(["saveUnitsPreference"]);
  });

  it("app/actions/print-instructions.ts exports exactly the expected action and no others", () => {
    // Mirrors the assertion above for app/actions/units.ts.
    const fns = exportedAsyncFunctions(printInstructionsActionsSource).map((fn) => fn.name).sort();
    expect(fns).toEqual(["savePrintRailInstructionsPreference"]);
  });

  it("app/actions/fit-defaults.ts exports exactly the expected action and no others", () => {
    // Mirrors the assertion above for app/actions/print-instructions.ts (Phase 11, D-09).
    const fns = exportedAsyncFunctions(fitDefaultsActionsSource).map((fn) => fn.name).sort();
    expect(fns).toEqual(["saveFitDefaultsPreference"]);
  });

  it("app/actions/blank-makers.ts exports exactly the expected action and no others", () => {
    // Mirrors the assertion above for app/actions/fit-defaults.ts (quick task 260926-wmf).
    const fns = exportedAsyncFunctions(blankMakersActionsSource).map((fn) => fn.name).sort();
    expect(fns).toEqual(["saveBlankMakersPreference"]);
  });

  it("app/actions/rack-order.ts exports exactly the expected action and no others", () => {
    // Mirrors the assertion above for app/actions/blank-makers.ts (Phase 15, R8, D-03).
    const fns = exportedAsyncFunctions(rackOrderActionsSource).map((fn) => fn.name).sort();
    expect(fns).toEqual(["saveRackOrder"]);
  });

  it("app/actions/account.ts exports exactly the expected actions and no others", () => {
    // Mirrors the assertion above for app/actions/rack-order.ts (quick 261006-g4u, D-07): the Your
    // data page's Export my designs and Delete my account.
    const fns = exportedAsyncFunctions(accountActionsSource).map((fn) => fn.name).sort();
    expect(fns).toEqual(["deleteMyAccount", "exportMyDesigns"]);
  });

  it("every Drizzle statement touching an owned table constrains on the owning-user column", () => {
    for (const [label, source] of [
      ["app/design/actions.ts", actionsSource],
      ["lib/db/queries.ts", queriesSource],
      ["app/actions/units.ts", unitsActionsSource],
      ["app/actions/print-instructions.ts", printInstructionsActionsSource],
      ["app/actions/fit-defaults.ts", fitDefaultsActionsSource],
      ["app/actions/blank-makers.ts", blankMakersActionsSource],
      ["app/actions/rack-order.ts", rackOrderActionsSource],
      ["app/actions/account.ts", accountActionsSource],
    ] as const) {
      // Split on each db.<verb>( call so every statement is inspected against the text between
      // it and the NEXT db call (or end of source) — the statement's own where/values clause.
      const callRe = /\bdb\.(select|insert|update|delete)\s*\(/g;
      const calls: { verb: string; start: number }[] = [];
      let m: RegExpExecArray | null;
      while ((m = callRe.exec(source))) {
        calls.push({ verb: m[1], start: m.index });
      }
      expect(calls.length, `${label}: expected at least one db call`).toBeGreaterThan(0);
      calls.forEach((call, i) => {
        const end = i + 1 < calls.length ? calls[i + 1].start : source.length;
        const statement = source.slice(call.start, end);
        if (call.verb === "insert") {
          // An insert establishes ownership by setting the column explicitly in its values,
          // not by a WHERE clause (there's nothing to constrain on a row that doesn't exist yet).
          expect(statement, `${label}: insert does not set clerkUserId`).toMatch(/clerkUserId\s*:/);
        } else {
          // Generalised to accept any table's clerkUserId column (an identifier followed by
          // `.clerkUserId`), not just `models.clerkUserId` — so `userPreferences.clerkUserId`
          // in the units read/write is checked by the same assertion, not a second copy of it.
          expect(statement, `${label}: ${call.verb} does not scope by clerkUserId`).toMatch(
            /eq\(\s*[A-Za-z_][A-Za-z0-9_]*\.clerkUserId\s*,/,
          );
        }
      });
    }
  });
});

/**
 * The vendor blank catalogue (Phase 11) is public data that belongs to no shaper, so it cannot pass
 * the owned-table loop above and is deliberately NOT in it. It is held to a stricter contract
 * instead: its one read file only ever SELECTs, only from `blanks`, never names a shaper's table
 * and takes no identity — and the `blanks` table itself has no owner column and no
 * station-numbered columns (its stations live in one jsonb list, R8).
 */
describe("the public blank catalogue read (Phase 11)", () => {
  const blanksSource = stripComments(readFileSync(BLANKS_READ_PATH, "utf8"));
  const schemaSource = stripComments(readFileSync(SCHEMA_PATH, "utf8"));

  /** The `blanks` pgTable block of schema.ts, from its declaration to its row type. */
  function blanksTableBlock(): string {
    const start = schemaSource.search(/pgTable\(\s*"blanks"/);
    const end = schemaSource.indexOf("export type BlankRow", start);
    expect(start, "schema.ts declares no blanks table").toBeGreaterThanOrEqual(0);
    expect(end, "schema.ts exports no BlankRow type after the blanks table").toBeGreaterThan(start);
    return schemaSource.slice(start, end);
  }

  it("lib/db/blanks.ts reads, and never inserts, updates or deletes", () => {
    expect(blanksSource).toMatch(/\bdb\s*\.\s*select\s*\(/);
    expect(blanksSource).not.toMatch(/\bdb\s*\.\s*(insert|update|delete|execute)\s*\(/);
    expect(blanksSource).not.toMatch(/\bsql\s*`/);
  });

  it("every select in lib/db/blanks.ts reads from the blanks table and nothing else", () => {
    const selects = [...blanksSource.matchAll(/\bdb\s*\.\s*select\s*\(/g)].map((m) => m.index);
    expect(selects.length).toBeGreaterThan(0);
    selects.forEach((start, i) => {
      const end = i + 1 < selects.length ? selects[i + 1] : blanksSource.length;
      const statement = blanksSource.slice(start, end);
      const froms = [...statement.matchAll(/\.from\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g)].map((m) => m[1]);
      expect(froms, "a select in lib/db/blanks.ts reads from something other than blanks").toEqual([
        "blanks",
      ]);
    });
    // Never a shaper's table, not even by name.
    expect(blanksSource).not.toMatch(/\b(models|userPreferences)\b/);
  });

  it("no function exported from lib/db/blanks.ts takes a shaper identity", () => {
    const signatures = exportedFunctionSignatures(blanksSource);
    expect(signatures.map((fn) => fn.name).sort()).toEqual([
      "blankRecordToRow",
      "blankRowToRecord",
      "loadPickableBlanks",
    ]);
    const offenders = signatures.filter((fn) => /userId|ownerId|clerkUserId|clerkId/.test(fn.params));
    expect(offenders, JSON.stringify(offenders)).toEqual([]);
  });

  it("the blanks table has no owner column", () => {
    expect(blanksTableBlock()).not.toMatch(/clerk_user_id|clerkUserId|owner|user_id/i);
  });

  it("the blanks table has no column named after a station — the stations are one jsonb list", () => {
    const block = blanksTableBlock();
    expect(block).toMatch(/jsonb\(\s*"stations"\s*\)/);
    const columnNames = [...block.matchAll(/\b[a-zA-Z]+\(\s*("[^"]+")/g)].map((m) => m[1]);
    expect(columnNames).toContain('"vendor"');
    const stationLike = columnNames.filter((name) => /"(t|n)\d+"|"c_|station_\d/i.test(name));
    expect(stationLike).toEqual([]);
  });
});
