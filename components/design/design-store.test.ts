import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Source-contract tests for the design store (the lib/db/ownership.test.ts idiom: read the real
 * source file, strip comments, assert it keeps a rule). The store's field lists are written out
 * by hand in four places (RESEARCH Pitfall 7) — a new field missing from any one of them silently
 * drops out of undo, autosave, a preset reset or a reopen — and the side profile has to be the ONE
 * thing RAILS and VOLUME read (Pattern 5). These fail loudly if a later edit breaks either.
 */

/** Strips `//` line comments and `/* *\/` block comments, same helper as lib/db/ownership.test.ts. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

const SOURCE = stripComments(readFileSync(new URL("./design-store.tsx", import.meta.url), "utf8"));

/** The text from `start` to the brace/bracket/paren that closes the first opener at or after it. */
function balancedFrom(source: string, start: number): string {
  const open = source.slice(start).search(/[({[]/);
  if (open < 0) throw new Error("no opening bracket");
  let depth = 0;
  for (let i = start + open; i < source.length; i++) {
    const ch = source[i];
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    else if (ch === ")" || ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("unbalanced source");
}

/** A `useMemo(() => ({ … }), [ … ])` assigned to `const NAME`: its object and its dependency array. */
function memo(name: string): { object: string; deps: string } {
  const start = SOURCE.search(new RegExp(`const ${name}\\b[^=]*=\\s*useMemo\\(`));
  expect(start, `${name}'s useMemo not found`).toBeGreaterThanOrEqual(0);
  const call = balancedFrom(SOURCE, SOURCE.indexOf("useMemo(", start));
  const depsStart = call.lastIndexOf("[");
  return { object: call.slice(0, depsStart), deps: call.slice(depsStart) };
}

/** The whole body of `const NAME = (…) => …;` inside the provider — up to the next statement at the
 * provider's own two-space indent. */
function handler(name: string): string {
  const start = SOURCE.search(new RegExp(`\\n  const ${name} = `));
  expect(start, `${name} not found`).toBeGreaterThanOrEqual(0);
  const rest = SOURCE.slice(start + 1);
  const next = rest.slice(1).search(/\n  (?:const |function |useEffect|return )/);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

/** Every design-mutating handler the provider defines (anything that calls setState). */
function allHandlers(): { name: string; body: string }[] {
  const names = [...SOURCE.matchAll(/\n  const ([A-Za-z0-9_]+) = \(/g)].map((m) => m[1]);
  return names.map((name) => ({ name, body: handler(name) })).filter(({ body }) => body.includes("setState("));
}

describe("design-store.tsx — the blank rides in every hand-written field list (Pitfall 7)", () => {
  it("historySnapshot carries `blank` in its object and its dependency array, so undo brings a pick back", () => {
    const { object, deps } = memo("historySnapshot");
    expect(object).toMatch(/\bblank:\s*state\.blank\b/);
    expect(deps).toMatch(/\bstate\.blank\b/);
  });

  it("designSnapshotFields carries `blank` in its object and its dependency array, so autosave writes it", () => {
    const { object, deps } = memo("designSnapshotFields");
    expect(object).toMatch(/\bblank:\s*state\.blank\b/);
    expect(deps).toMatch(/\bstate\.blank\b/);
  });

  it("applyModel restores the saved blank, and applyPreset rebuilds the board from the preset's one mapping (its blank included)", () => {
    expect(handler("applyModel")).toMatch(/\bblank:\s*snapshot\.blank\b/);
    // D-03: a preset opens in its blank — the whole board comes from presetDesignFields, spread over
    // DEFAULT_DESIGN_STATE so every field a preset does not set (new ones included) resets safely.
    expect(handler("applyPreset")).toMatch(/\.\.\.DEFAULT_DESIGN_STATE,\s*\.\.\.presetDesignFields\(preset\)/);
  });

  it("DEFAULT_DESIGN_STATE starts with no blank and still carries the defaults presetSummary assumes", () => {
    const block = SOURCE.match(/const DEFAULT_DESIGN_STATE:\s*DesignState\s*=\s*\{[\s\S]*?\n\};/);
    expect(block, "DEFAULT_DESIGN_STATE block not found").not.toBeNull();
    expect(block![0]).toMatch(/\bblank:\s*null\b/);
    expect(block![0]).toMatch(/railsImportFoilThickness:\s*true/);
    expect(block![0]).toMatch(/volume:\s*DEFAULT_VOLUME_SPEC/);
  });
});

describe("design-store.tsx — one side profile feeds RAILS and VOLUME (Pattern 5)", () => {
  it("the blank is prepared once per blank copy, inside a useMemo (R14)", () => {
    const start = SOURCE.search(/const preparedBlank\b[^=]*=\s*useMemo\(/);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(balancedFrom(SOURCE, SOURCE.indexOf("useMemo(", start))).toContain("prepareBlank(");
  });

  it("the side profile is built once, with buildBoardProfile, inside a useMemo", () => {
    const start = SOURCE.search(/const sideProfile\b[^=]*=\s*useMemo\(/);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(balancedFrom(SOURCE, SOURCE.indexOf("useMemo(", start))).toContain("buildBoardProfile(");
  });

  it("effectiveRails reads the side profile's foil, never the stored foil directly", () => {
    const { object } = memo("effectiveRails");
    expect(object).toMatch(/deriveEffectiveRails\(\s*state\.rails,\s*sideProfile\.effectiveFoil\b/);
  });

  it("the cross-section volume integrates the side profile's own thickness curve", () => {
    const { object } = memo("crossSectionVolume");
    expect(object).toMatch(/thicknessAt:\s*sideProfile\.thicknessAt\b/);
    expect(object).toMatch(/foil:\s*sideProfile\.effectiveFoil\b/);
  });
});

describe("design-store.tsx — nothing but the shaper's own pick or removal changes the blank (R6, store half)", () => {
  const MAY_ASSIGN_BLANK = new Set([
    "pickBlank",
    "removeBlank",
    "setPlacement",
    "setFineTune",
    "resetFineTune",
    "applyPreset",
    "applyModel",
  ]);

  it("the five blank moves each write the blank", () => {
    for (const name of ["pickBlank", "removeBlank", "setPlacement", "setFineTune", "resetFineTune"]) {
      expect(handler(name), name).toMatch(/\bblank:/);
    }
  });

  it("no other state-setting handler assigns `blank:` — not the foil, outline, rocker, rails, fins, volume or a setting", () => {
    const handlers = allHandlers();
    // The lookup itself must find the ordinary mutators, or this test would pass vacuously.
    for (const name of ["updateFoil", "updateOutline", "updateRocker", "updateRailSection", "updateFins", "updateVolume"]) {
      expect(handlers.map((h) => h.name), name).toContain(name);
    }
    for (const { name, body } of handlers) {
      if (MAY_ASSIGN_BLANK.has(name)) continue;
      expect(body, `${name} assigns the blank`).not.toMatch(/\bblank:/);
    }
  });

  it("undo and redo restore the blank only through the history snapshot, never by name", () => {
    for (const name of ["undoEdit", "redoEdit"]) {
      const body = handler(name);
      expect(body).toContain("...result.restored");
      expect(body).not.toMatch(/\bblank:/);
    }
  });

  it("the store never reads the fit-defaults provider (11-10 wires D-19)", () => {
    expect(SOURCE).not.toContain("useFitDefaults");
  });
});
