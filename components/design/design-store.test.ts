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
    "setDeckSkin",
    "setTipStyle",
    "setFineTuneSurface",
    "setFineTune",
    "resetFineTune",
    "setThinningStart",
    "setThinningStartAutomatic",
    "applyPreset",
    "applyModel",
  ]);

  it("the blank moves each write the blank", () => {
    for (const name of [
      "pickBlank",
      "removeBlank",
      "setPlacement",
      "setDeckSkin",
      "setTipStyle",
      "setFineTuneSurface",
      "setFineTune",
      "resetFineTune",
      "setThinningStart",
      "setThinningStartAutomatic",
    ]) {
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

  it("Remove This Blank seeds the hand-set rocker and foil through the tested handSetFromProfile (WR-01)", () => {
    // The five-station guarantee itself is proven in lib/geometry/board-profile.test.ts; this pins
    // that the store's move delegates to that pure function rather than copying stations inline.
    const body = handler("removeBlank");
    expect(body).toMatch(/handSetFromProfile\(\s*profileNow,\s*prev\.foil\s*\)/);
    expect(body).toMatch(/rocker:\s*handSet\.rocker/);
    expect(body).toMatch(/foil:\s*handSet\.foil/);
  });

  it("undo and redo restore the blank only through the history snapshot, never by name", () => {
    for (const name of ["undoEdit", "redoEdit"]) {
      const body = handler(name);
      expect(body).toContain("...result.restored");
      expect(body).not.toMatch(/\bblank:/);
    }
  });

});

describe("design-store.tsx — the board's cut rides on its blank (Phase 12, D-01, D-04, D-13)", () => {
  it("reads the live Deck Skin and Tip Style from Fit & Tip Defaults into liveCutRef, kept current like the tips", () => {
    expect(SOURCE).toMatch(/const liveDeckSkin = fitDefaults\.deckSkin;/);
    expect(SOURCE).toMatch(/const liveTipStyle = fitDefaults\.tipStyle;/);
    expect(SOURCE).toMatch(/liveCutRef\.current = \{ deckSkin: liveDeckSkin, tipStyle: liveTipStyle \}/);
  });

  it("a first pick bakes in the live cut; a switch keeps the board's own", () => {
    const body = handler("pickBlank");
    expect(body).toMatch(/deckSkin:\s*prev\.blank\?\.deckSkin\s*\?\?\s*liveCutRef\.current\.deckSkin/);
    expect(body).toMatch(/tipStyle:\s*prev\.blank\?\.tipStyle\s*\?\?\s*liveCutRef\.current\.tipStyle/);
    expect(body).toMatch(/fineTuneSurface:\s*prev\.blank\?\.fineTuneSurface\s*\?\?\s*DEFAULT_BLANK_CUT\.fineTuneSurface/);
  });

  it("setDeckSkin is a slider: a no-op with no blank, one coalescing key, writes only the skin", () => {
    const body = handler("setDeckSkin");
    expect(body.indexOf("if (!state.blank) return;")).toBeGreaterThanOrEqual(0);
    expect(body.indexOf("if (!state.blank) return;")).toBeLessThan(body.indexOf("noteEdit("));
    expect(body).toContain('noteEdit("blank:deckSkin")');
    expect(body).toMatch(/blank:\s*\{\s*\.\.\.prev\.blank,\s*deckSkin\s*\}/);
  });

  it("the side profile is built with the blank's own cut", () => {
    const start = SOURCE.search(/const sideProfile\b[^=]*=\s*useMemo\(/);
    const body = balancedFrom(SOURCE, SOURCE.indexOf("useMemo(", start));
    expect(body).toMatch(/deckSkin:\s*state\.blank\.deckSkin/);
    expect(body).toMatch(/tipStyle:\s*state\.blank\.tipStyle/);
    expect(body).toMatch(/fineTuneSurface:\s*state\.blank\.fineTuneSurface/);
  });

  it("setDeckSkin is on the context value, beside the other blank moves", () => {
    const start = SOURCE.search(/const value: DesignContextValue = \{/);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(balancedFrom(SOURCE, start + "const value: DesignContextValue =".length)).toMatch(/\n\s+setDeckSkin,/);
  });

  it("setTipStyle is a discrete choice: a no-op with no blank or on the style already on, one undo step per tap, writes only the style", () => {
    const body = handler("setTipStyle");
    const guard = body.indexOf("if (!state.blank || sideProfile.blank?.cut.tipStyle === tipStyle) return;");
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(guard).toBeLessThan(body.indexOf("noteEdit("));
    expect(body).toContain("noteEdit(null)");
    expect(body).toMatch(/blank:\s*\{\s*\.\.\.prev\.blank,\s*tipStyle\s*\}/);
  });

  it("setTipStyle is on the context value", () => {
    const start = SOURCE.search(/const value: DesignContextValue = \{/);
    expect(balancedFrom(SOURCE, start + "const value: DesignContextValue =".length)).toMatch(/\n\s+setTipStyle,/);
  });

  it("setFineTuneSurface is a discrete choice: a no-op with no blank or on the surface already on, one undo step per tap, writes only the surface", () => {
    const body = handler("setFineTuneSurface");
    const guard = body.indexOf("if (!state.blank || sideProfile.blank?.cut.fineTuneSurface === surface) return;");
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(guard).toBeLessThan(body.indexOf("noteEdit("));
    expect(body).toContain("noteEdit(null)");
    expect(body).toMatch(/blank:\s*\{\s*\.\.\.prev\.blank,\s*fineTuneSurface:\s*surface\s*\}/);
    // It moves no tweak and no other part of the cut: the geometry decides what the surface moves.
    expect(body).not.toMatch(/Offset|deckSkin|tipStyle:/);
  });

  it("setFineTuneSurface is on the context value", () => {
    const start = SOURCE.search(/const value: DesignContextValue = \{/);
    expect(balancedFrom(SOURCE, start + "const value: DesignContextValue =".length)).toMatch(/\n\s+setFineTuneSurface,/);
  });
});

describe("design-store.tsx — each tip's Thinning Start rides on the blank (Phase 14 D-02, D-11, D-24)", () => {
  /** The context value object, so a move can be proven to reach the screens. */
  function contextValue(): string {
    const start = SOURCE.search(/const value: DesignContextValue = \{/);
    expect(start).toBeGreaterThanOrEqual(0);
    return balancedFrom(SOURCE, start + "const value: DesignContextValue =".length);
  }

  it("the side profile is built with the board's own starts, through thinningStartsOf (Pitfall 5)", () => {
    const start = SOURCE.search(/const sideProfile\b[^=]*=\s*useMemo\(/);
    const body = balancedFrom(SOURCE, SOURCE.indexOf("useMemo(", start));
    expect(body).toMatch(/\.\.\.thinningStartsOf\(\s*state\.blank\s*\)/);
  });

  it("setThinningStart is a slider: a no-op with no blank, one coalescing key per tip", () => {
    const body = handler("setThinningStart");
    const guard = body.indexOf("if (!state.blank) return;");
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(guard).toBeLessThan(body.indexOf("noteEdit("));
    expect(body).toContain("noteEdit(`blank:thinningStart:${end}`)");
    expect(body).toMatch(/blank:\s*\{\s*\.\.\.prev\.blank,\s*\[key\]:\s*start\s*\}/);
  });

  it("setThinningStartAutomatic removes the stored key: a no-op on Automatic, one undo step, never stores an empty value", () => {
    const body = handler("setThinningStartAutomatic");
    const guard = body.indexOf("if (!state.blank || state.blank[key] === undefined) return;");
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(guard).toBeLessThan(body.indexOf("noteEdit("));
    expect(body).toContain("noteEdit(null)");
    expect(body).toMatch(/delete blank\[key\]/);
    expect(body).not.toContain(": undefined");
  });

  it("a switch of blanks keeps a hand-set start; a first pick has none", () => {
    expect(handler("pickBlank")).toMatch(/\.\.\.thinningStartsOf\(\s*prev\.blank\s*\)/);
  });

  it("↺ Reset Fine-Tune leaves both starts alone (D-06)", () => {
    expect(handler("resetFineTune")).not.toMatch(/ThinningStart/);
  });

  it("both moves are on the context value", () => {
    const value = contextValue();
    expect(value).toMatch(/\n\s+setThinningStart,/);
    expect(value).toMatch(/\n\s+setThinningStartAutomatic,/);
  });

  it("no store move is named like a hook (the hooks lint rule would read it as one)", () => {
    const names = [...SOURCE.matchAll(/\n  const ([A-Za-z0-9_]+) = \(/g)].map((m) => m[1]);
    expect(names).toContain("setThinningStartAutomatic");
    for (const name of names) {
      expect(name).not.toMatch(/^use(?:Automatic|Thinning)/);
    }
  });
});

describe("design-store.tsx — an untouched new board follows the live tip defaults, until its first edit (D-19)", () => {
  /** Every handler that edits the board — the first of any of them bakes the tips in. */
  const STARTS_THE_BOARD = [
    "updateOutline",
    "updateRocker",
    "updateFoil",
    "updateRailSection",
    "toggleTailHardEdge",
    "updateFins",
    "updateVolume",
    "setFinsImportTemplate",
    "toggleRailsImportFoilThickness",
    "setBoardName",
    "setFinSystem",
    "pickBlank",
    "setPlacement",
    "setDeckSkin",
    "setTipStyle",
    "setFineTuneSurface",
    "setFineTune",
    "resetFineTune",
    "setThinningStart",
    "setThinningStartAutomatic",
    "removeBlank",
    "toggleImportTemplateDimensions",
    "toggleImportRailThickness",
    "markSaved",
  ];

  it("reads the gear menu's tip defaults through useFitDefaults", () => {
    expect(SOURCE).toMatch(/import \{ useFitDefaults \} from "@\/components\/fit-defaults-provider"/);
    expect(SOURCE).toMatch(/=\s*useFitDefaults\(\)/);
  });

  it("the foil every consumer reads is the stored foil once started, else the stored foil with the live tips", () => {
    const { object, deps } = memo("foil");
    expect(object).toMatch(/state\.boardStarted\s*\?\s*state\.foil\s*:/);
    expect(object).toMatch(/noseTip:\s*liveNoseTip/);
    expect(object).toMatch(/tailTip:\s*liveTailTip/);
    expect(deps).toMatch(/state\.boardStarted/);
    expect(deps).toMatch(/liveNoseTip/);
    expect(deps).toMatch(/liveTailTip/);
  });

  it("the undo snapshot, the save snapshot and the side profile read that foil, never state.foil", () => {
    for (const name of ["historySnapshot", "designSnapshotFields", "sideProfile"]) {
      const { object, deps } = memo(name);
      expect(object, name).not.toMatch(/state\.foil\b/);
      expect(deps, name).not.toMatch(/state\.foil\b/);
      expect(deps, name).toMatch(/\bfoil\b/);
    }
    expect(SOURCE).not.toMatch(/\n    foil: state\.foil,/);
  });

  it("every edit starts from startedFrom(…), so the first one bakes the live tips into the board's own", () => {
    for (const name of STARTS_THE_BOARD) {
      expect(handler(name), name).toContain("startedFrom(");
    }
  });

  it("no handler that sets state skips startedFrom except opening a preset or a saved board, the save bookkeeping and undo", () => {
    const exempt = new Set(["applyPreset", "applyModel", "setModelId", "setOpenBoardLocked", "performSave", "undoEdit", "redoEdit"]);
    for (const { name, body } of allHandlers()) {
      if (exempt.has(name)) continue;
      expect(body, `${name} edits the board without startedFrom`).toContain("startedFrom(");
    }
  });

  it("opening a preset or a saved board sets its own tips, so neither calls startedFrom", () => {
    for (const name of ["applyPreset", "applyModel"]) {
      expect(handler(name), name).not.toContain("startedFrom(");
    }
  });

  it("markSaved starts the board (a saved board never follows a live setting, D-09)", () => {
    expect(handler("markSaved")).toMatch(/boardStarted:\s*true/);
  });

  it("startedFrom only ever touches the two tips, and only on an unstarted board", () => {
    const start = SOURCE.indexOf("function startedFrom(");
    expect(start).toBeGreaterThanOrEqual(0);
    const body = balancedFrom(SOURCE, SOURCE.indexOf("{", start));
    expect(body).toMatch(/if \(prev\.boardStarted\) return prev;/);
    expect(body).toMatch(/foil:\s*\{\s*\.\.\.prev\.foil,\s*noseTip:\s*liveTips\.noseTip,\s*tailTip:\s*liveTips\.tailTip\s*\}/);
  });
});
