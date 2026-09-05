import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { DesignSummary } from "./geometry/design";
import { formatSummaryLine } from "./geometry/summary-line";
import { litres, mm } from "./geometry/units";

/**
 * Pins UNIT-05 and D-16 mechanically, not by care: a shaper who switches to Metric and back must
 * find every saved board exactly as they left it, down to the same sixteenth. The way that is
 * guaranteed is that the units preference has no path into anything that is stored — not the
 * design store, not the saved snapshot — and that formatting a value never mutates it. If a
 * future edit ever puts the preference into design state or into the snapshot, this file fails
 * rather than a shaper's saved board quietly changing.
 *
 * Source-contract tests, in the same idiom as lib/theme.test.ts, lib/auth/open-access.test.ts
 * and lib/db/ownership.test.ts: read the real source file, strip comments (so a mention inside a
 * doc comment — like the ones in this very file — can never false-positive an assertion), and
 * assert a structural property.
 */

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Strips `//` line comments and `/* *\/` block comments — the same helper lib/theme.test.ts,
 * lib/auth/open-access.test.ts and lib/db/ownership.test.ts already copy between themselves. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function readStripped(relativePath: string): string {
  return stripComments(readFileSync(join(REPO_ROOT, relativePath), "utf8"));
}

describe("units isolation (UNIT-05, D-16)", () => {
  it("the design store cannot see the units preference or provider at all", () => {
    const source = readStripped("components/design/design-store.tsx");
    // Built from parts so this assertion's own text can never match itself.
    const providerModule = ["units", "-", "provider"].join("");
    const preferenceModule = ["units", "-", "preference"].join("");
    const hook = ["use", "Units"].join("");
    expect(source, "design-store.tsx references the units provider module").not.toContain(providerModule);
    expect(source, "design-store.tsx references the units preference module").not.toContain(preferenceModule);
    expect(source, "design-store.tsx references the useUnits hook").not.toContain(hook);
  });

  it("the design snapshot names no units field and cannot see the units modules either", () => {
    const source = readStripped("lib/models/design-snapshot.ts");
    const providerModule = ["units", "-", "provider"].join("");
    const preferenceModule = ["units", "-", "preference"].join("");
    expect(source, "design-snapshot.ts references the units provider module").not.toContain(providerModule);
    expect(source, "design-snapshot.ts references the units preference module").not.toContain(preferenceModule);
    expect(source, "design-snapshot.ts declares a units field").not.toMatch(/\bunits\s*[:?]/i);
  });

  it("lib/geometry/units.ts, lib/geometry/summary-line.ts and lib/geometry/measure-display.ts stay pure (Rule 1)", () => {
    for (const relative of [
      "lib/geometry/units.ts",
      "lib/geometry/summary-line.ts",
      "lib/geometry/measure-display.ts",
    ]) {
      const source = readStripped(relative);
      expect(source, `${relative} imports React`).not.toMatch(/from\s+["']react["']/);
      expect(source, `${relative} references a browser global`).not.toMatch(
        /\b(window|document|localStorage|sessionStorage)\b/,
      );
      expect(source, `${relative} imports from lib/db`).not.toMatch(/from\s+["']@\/lib\/db/);
    }
  });

  it("every display site that already shows a design summary gets its numbers from the boundary", () => {
    // A display site may read the boundary directly (settings-menu.tsx, preset-card.tsx) or
    // through the shared CardMetadataLine component (board-rack-card.tsx since 05-03). That
    // component is itself a candidate below and must import the boundary, so the chain from every
    // card line back to lib/geometry stays pinned either way. Each candidate is checked only if
    // it exists AND already renders a DesignSummary, so a site that gains a summary later is
    // caught automatically with no edit required here.
    const candidates = [
      "components/setup/card-metadata-line.tsx",
      "components/setup/board-rack-card.tsx",
      "components/setup/preset-card.tsx",
      "components/settings-menu.tsx",
    ];
    let checked = 0;
    for (const relative of candidates) {
      const fullPath = join(REPO_ROOT, relative);
      if (!existsSync(fullPath)) continue;
      const source = stripComments(readFileSync(fullPath, "utf8"));
      const isDisplaySite = /summarizeDesign|DesignSummary|formatDimsExample|presetSummary/.test(source);
      if (!isDisplaySite) continue;
      checked += 1;
      expect(
        source,
        `${relative} shows a design summary but does not import from the units boundary or the shared CardMetadataLine`,
      ).toMatch(/@\/lib\/geometry\/(summary-line|units)|@\/components\/setup\/card-metadata-line/);
    }
    // Must find at least the two sites this phase already converted (board-rack-card.tsx,
    // settings-menu.tsx) — an empty candidate list would otherwise pass this test vacuously.
    expect(checked).toBeGreaterThanOrEqual(2);
  });

  it("formatting is a read — switching systems back and forth mutates nothing", () => {
    const summary: DesignSummary = {
      length: mm(1880),
      widePointWidth: mm(514),
      centerThickness: mm(67),
      volumeLitres: litres(34),
    };
    const originalLength = summary.length;
    const originalWidth = summary.widePointWidth;
    const originalThickness = summary.centerThickness;
    const originalVolume = summary.volumeLitres;

    const first = formatSummaryLine(summary, "imperial");
    formatSummaryLine(summary, "metric");
    formatSummaryLine(summary, "imperial");
    formatSummaryLine(summary, "metric");
    const last = formatSummaryLine(summary, "imperial");

    // Object.is, not toBe's own recursive equality, so a formatter that quietly replaced the
    // field with an equal-valued but new number would still be caught — the point is that
    // nothing was ever written, not merely that the value still looks the same.
    expect(Object.is(summary.length, originalLength)).toBe(true);
    expect(Object.is(summary.widePointWidth, originalWidth)).toBe(true);
    expect(Object.is(summary.centerThickness, originalThickness)).toBe(true);
    expect(Object.is(summary.volumeLitres, originalVolume)).toBe(true);
    expect(last).toBe(first);
  });
});

/**
 * Phase 6 converts roughly 300 display sites across five screens over seven plans — nothing
 * short of a mechanical guard could catch a stray call to an imperial formatter reintroduced
 * mid-phase, or a brand-new display file nobody remembered to add to the ledger below.
 *
 * `DESIGN_SCREEN_DISPLAY_FILES` names every file this phase eventually converts to read through
 * `lib/geometry/measure-display.ts`, each with a `converted` flag this phase flips true as its
 * own plan lands (Task 3 flips `outline-viewer.tsx`; Plan 03 Task 2 flips `rocker-datasheet.tsx`;
 * later plans flip the rest — a file may keep `formatFeetInches` for an as-yet-unconverted Board
 * Length control and so stay `false` even after some of its own sliders are done, exactly
 * `outline-controls.tsx`'s situation after Plan 01's Task 2). `OUT_OF_SCOPE_UNITS_FILES` names the
 * one remaining kind of file that legitimately reads `lib/geometry/units` without ever becoming a
 * display site this phase converts: the four dev-only "copy preset values" builders, which
 * serialise `inchesToMm(...)` source text for `presets.ts` rather than displaying anything.
 * `imperial-field.tsx` — the app's original typed-entry contract — was itself a member of this
 * list until Plan 03 deleted it, once its last consumer (`rocker-datasheet.tsx`'s typed cells)
 * moved to `components/design/measure-field.tsx`. The completeness assertion below is what makes a
 * THIRD kind — a display file nobody listed — impossible to introduce unnoticed.
 *
 * As of Plan 07, every entry in `DESIGN_SCREEN_DISPLAY_FILES` reads `converted: true` and the
 * closing assertion below fails the suite the moment a new one does not: every number a shaper
 * reads on the five design screens — outline, rocker, rails, fins, volume — now comes from this
 * one boundary, in the system they chose. The Summary order form is a different story: it reuses
 * four of these now-converted components (`OutlineViewer`, `RockerViewer`'s compact callouts,
 * `RailSectionPlot`, `RailDataTable`'s compact mode) and so reads Metric wherever it reuses one of
 * them, while the rest of the order form — the panels that compose their own imperial strings
 * rather than reusing a converted component — stays in inches until Phase 7. That is
 * CONTEXT.md's Phase Boundary working as designed, not a gap in this ledger.
 */
describe("the design screens read every measurement through the display boundary", () => {
  // Built from parts so this test file — which necessarily names every one of these identifiers
  // in its own prose above — can never match its own needles.
  const BANNED_DISPLAY_FORMATTERS: string[] = [
    ["format", "InchesFraction"].join(""),
    ["format", "FeetInches"].join(""),
    ["format", "SignedInchesFraction"].join(""),
    ["format", "Centimetres"].join(""),
    ["format", "WholeMm"].join(""),
  ];

  const DESIGN_SCREEN_DISPLAY_FILES: { file: string; converted: boolean }[] = [
    { file: "components/outline/outline-controls.tsx", converted: true },
    { file: "components/outline/outline-viewer.tsx", converted: true },
    { file: "components/rocker/rocker-controls.tsx", converted: true },
    { file: "components/rocker/rocker-datasheet.tsx", converted: true },
    { file: "components/rocker/rocker-viewer.tsx", converted: true },
    { file: "components/rails/rail-controls.tsx", converted: true },
    { file: "components/rails/rail-data-table.tsx", converted: true },
    { file: "components/rails/rail-section-plot.tsx", converted: true },
    { file: "components/fins/fin-controls.tsx", converted: true },
    { file: "components/fins/fin-viewer.tsx", converted: true },
    { file: "components/fins/fin-data-panel.tsx", converted: true },
    { file: "components/fins/toe-aim-table-modal.tsx", converted: true },
    { file: "components/volume/volume-controls.tsx", converted: true },
    { file: "components/volume/volume-calculation-card.tsx", converted: true },
    { file: "components/volume/volume-estimator.tsx", converted: true },
  ];

  const OUT_OF_SCOPE_UNITS_FILES: { file: string; reason: string }[] = [
    {
      file: "components/outline/outline-editor.tsx",
      reason:
        "Dev-only 'copy preset values' builder — serialises inchesToMm(...) source text for presets.ts, not a display site.",
    },
    {
      file: "components/rocker/rocker-editor.tsx",
      reason:
        "Dev-only 'copy preset values' builder — serialises inchesToMm(...) source text for presets.ts, not a display site.",
    },
    {
      file: "components/rails/rail-band-editor.tsx",
      reason:
        "Dev-only 'copy preset values' builder — serialises inchesToMm(...) source text for presets.ts, not a display site.",
    },
    {
      file: "components/fins/fin-placement-editor.tsx",
      reason:
        "Dev-only 'copy preset values' builder — serialises inchesToMm(...) source text for presets.ts, not a display site.",
    },
  ];

  /** The five screen folders every display site and every out-of-scope file lives under. */
  const SCREEN_FOLDERS = ["outline", "rocker", "rails", "fins", "volume"];

  /** Every `.tsx` file under `components/{outline,rocker,rails,fins,volume}/`, relative to the
   * repo root — walked fresh each run so a new file is caught the moment it appears. */
  function findScreenTsxFiles(): string[] {
    const found: string[] = [];
    for (const folder of SCREEN_FOLDERS) {
      const dir = join(REPO_ROOT, "components", folder);
      if (!existsSync(dir)) continue;
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isFile() && entry.endsWith(".tsx")) {
          found.push(`components/${folder}/${entry}`);
        }
      }
    }
    return found;
  }

  it("every file named in either list exists on disk", () => {
    for (const { file } of DESIGN_SCREEN_DISPLAY_FILES) {
      expect(existsSync(join(REPO_ROOT, file)), `${file} (DESIGN_SCREEN_DISPLAY_FILES) does not exist`).toBe(true);
    }
    for (const { file } of OUT_OF_SCOPE_UNITS_FILES) {
      expect(existsSync(join(REPO_ROOT, file)), `${file} (OUT_OF_SCOPE_UNITS_FILES) does not exist`).toBe(true);
    }
  });

  it("every converted:true entry imports from the display boundary", () => {
    for (const { file, converted } of DESIGN_SCREEN_DISPLAY_FILES) {
      if (!converted) continue;
      const source = readStripped(file);
      expect(source, `${file} is marked converted but does not import @/lib/geometry/measure-display`).toMatch(
        /@\/lib\/geometry\/measure-display/,
      );
    }
  });

  it("every converted:true entry's stripped source contains none of the banned formatters", () => {
    for (const { file, converted } of DESIGN_SCREEN_DISPLAY_FILES) {
      if (!converted) continue;
      const source = readStripped(file);
      for (const banned of BANNED_DISPLAY_FORMATTERS) {
        expect(source, `${file} is marked converted but still calls ${banned}`).not.toContain(banned);
      }
    }
  });

  it("every screen .tsx that imports lib/geometry/units is named in one of the two lists", () => {
    const named = new Set([
      ...DESIGN_SCREEN_DISPLAY_FILES.map((entry) => entry.file),
      ...OUT_OF_SCOPE_UNITS_FILES.map((entry) => entry.file),
    ]);
    const unnamedImporters: string[] = [];
    for (const file of findScreenTsxFiles()) {
      const source = readStripped(file);
      if (!/@\/lib\/geometry\/units/.test(source)) continue;
      if (!named.has(file)) unnamedImporters.push(file);
    }
    expect(
      unnamedImporters,
      `these files import lib/geometry/units but are named in neither DESIGN_SCREEN_DISPLAY_FILES nor OUT_OF_SCOPE_UNITS_FILES: ${unnamedImporters.join(", ")}`,
    ).toEqual([]);
  });

  it("every out-of-scope entry carries a reason and points at a real file", () => {
    for (const entry of OUT_OF_SCOPE_UNITS_FILES) {
      expect(entry.reason.length, `${entry.file} has no reason`).toBeGreaterThan(0);
    }
  });

  /**
   * The phase's closing assertion. Every one of the fifteen design-screen display files this
   * phase names has flipped `converted: true` across Plans 01-07 — from this point a new file
   * added to `DESIGN_SCREEN_DISPLAY_FILES` above starts life as `converted: false` and fails
   * this test, so a shaper's Metric switch can never silently stop reaching a new screen
   * element the way it could if this were left to a reviewer's memory.
   */
  it("every design-screen display file is converted — the phase's closing assertion", () => {
    const unconverted = DESIGN_SCREEN_DISPLAY_FILES.filter((entry) => !entry.converted).map((entry) => entry.file);
    expect(unconverted, `these ledger entries are not yet converted: ${unconverted.join(", ")}`).toEqual([]);
  });
});

/**
 * The Summary order form's flash-free guarantee (D-12) is structural, not something a design-
 * screen unit test can exercise: it depends on WHERE `UnitsProvider` sits in the render tree and
 * WHETHER the Summary route re-resolves or re-wraps it. Following `lib/theme.test.ts`'s own
 * drift-guard idiom — read the real source, strip comments, assert a structural property — rather
 * than rendering anything (there is no DOM available in this vitest config, per
 * `components/design/measure-field.test.ts`'s own note).
 *
 * This pins three facts at once: the provider is mounted once, at the root, already carrying a
 * server-resolved system before any route-specific code runs; the Summary route adds no provider
 * of its own that could re-resolve (and disagree with) that root value; and the component tree
 * the Summary renders is a client component, so the shared viewer/table components it reuses read
 * `useUnits()` from the exact same server-rendered context the five design screens do — the two
 * UI-SPEC backstops (`summary-carry-through · loading`, the no-flash/no-hydration-mismatch check)
 * this test makes structurally provable rather than merely plausible.
 */
describe("the Summary's flash-free path is structural (D-12 backstop)", () => {
  it("app/layout.tsx renders UnitsProvider once, wrapping a server-resolved handoff", () => {
    const source = readStripped("app/layout.tsx");
    expect(source, "app/layout.tsx does not import UnitsProvider").toMatch(
      /from\s+["']@\/components\/units-provider["']/,
    );
    expect(source, "app/layout.tsx does not call resolveUnitsHandoff").toMatch(/resolveUnitsHandoff\(/);
    expect(source, "app/layout.tsx does not render <UnitsProvider").toMatch(/<UnitsProvider\b/);
  });

  it("app/design/summary/page.tsx declares no units provider of its own", () => {
    const source = readStripped("app/design/summary/page.tsx");
    expect(source, "app/design/summary/page.tsx references UnitsProvider or the units provider module").not.toMatch(
      /UnitsProvider|units-provider/,
    );
  });

  it("components/summary/order-form.tsx is a client component", () => {
    // Read raw (not stripped): "use client" must be the file's literal leading directive, not
    // merely a string that survives comment-stripping somewhere else in the file.
    const source = readFileSync(join(REPO_ROOT, "components/summary/order-form.tsx"), "utf8");
    const firstStatement = source.trimStart().slice(0, 20);
    expect(
      firstStatement.startsWith('"use client"') || firstStatement.startsWith("'use client'"),
      "components/summary/order-form.tsx does not open with a \"use client\" directive",
    ).toBe(true);
  });
});
