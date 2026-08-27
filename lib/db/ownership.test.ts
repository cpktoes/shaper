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

  it("every exported async function in app/design/actions.ts awaits auth() before any database call", () => {
    const fns = exportedAsyncFunctions(actionsSource);
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
    ];
    expect(signatures.length).toBeGreaterThan(0);
    const offenders = signatures.filter((fn) => /userId|ownerId|clerkUserId/.test(fn.params));
    expect(offenders, JSON.stringify(offenders)).toEqual([]);
  });

  it("every Drizzle statement touching the models table constrains on the owning-user column", () => {
    for (const [label, source] of [
      ["app/design/actions.ts", actionsSource],
      ["lib/db/queries.ts", queriesSource],
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
          expect(statement, `${label}: ${call.verb} does not scope by clerkUserId`).toMatch(
            /eq\(\s*models\.clerkUserId\s*,/,
          );
        }
      });
    }
  });
});
