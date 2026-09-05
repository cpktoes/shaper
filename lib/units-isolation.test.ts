import { existsSync, readFileSync } from "node:fs";
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

  it("lib/geometry/units.ts and lib/geometry/summary-line.ts stay pure (Rule 1)", () => {
    for (const relative of ["lib/geometry/units.ts", "lib/geometry/summary-line.ts"]) {
      const source = readStripped(relative);
      expect(source, `${relative} imports React`).not.toMatch(/from\s+["']react["']/);
      expect(source, `${relative} references a browser global`).not.toMatch(
        /\b(window|document|localStorage|sessionStorage)\b/,
      );
      expect(source, `${relative} imports from lib/db`).not.toMatch(/from\s+["']@\/lib\/db/);
    }
  });

  it("every display site that already shows a design summary gets its numbers from the boundary", () => {
    // card-metadata-line.tsx doesn't exist as its own module in this worktree yet, and
    // preset-card.tsx hasn't gained its dims line yet either — both land via the sibling 05-03
    // plan, which runs concurrently in its own worktree and isn't merged into this one. Rather
    // than hard-code an expectation this worktree cannot satisfy, each candidate is checked only
    // if it exists AND already renders a DesignSummary — a marker that is true for board-rack-
    // card.tsx and settings-menu.tsx today, and becomes true for the other two the moment 05-03
    // lands, tightening this guard automatically with no edit required here.
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
        `${relative} shows a design summary but does not import from the units boundary`,
      ).toMatch(/@\/lib\/geometry\/(summary-line|units)/);
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
