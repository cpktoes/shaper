import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BOARD_PRESETS } from "./presets";
import { summarizeDesign, type DesignSummary } from "./design";
import { DEFAULT_VOLUME_SPEC } from "./volume";
import { UNITS_SYSTEMS } from "./units";
import { formatDimsExample, formatSummaryLine, presetSummary } from "./summary-line";

const shortboard = BOARD_PRESETS.find((p) => p.id === "shortboard")!;

/** A fixed summary to exercise the string composition against known numbers. */
const FIXED_SUMMARY: DesignSummary = summarizeDesign({
  outline: shortboard.outline,
  rails: shortboard.rails,
  foil: shortboard.foil,
  railsImportFoilThickness: true,
  volume: DEFAULT_VOLUME_SPEC,
});

describe("formatSummaryLine", () => {
  it("imperial branch is byte-identical to today's rack card line", () => {
    // Mirrors CardMetadataLine's current composition exactly: feet-inches, two fraction
    // widths, then litres to one decimal followed by " L", joined by " · ".
    const line = formatSummaryLine(FIXED_SUMMARY, "imperial");
    expect(line).toMatch(/^\d+'\d+(?:\s\d+\/\d+)?" · \d+(?:\s\d+\/\d+)?" · \d+(?:\s\d+\/\d+)?" · \d+\.\d L$/);
  });

  it("metric branch reads three one-decimal cm numbers joined by ×, then cm, then litres", () => {
    const line = formatSummaryLine(FIXED_SUMMARY, "metric");
    expect(line).toMatch(/^\d+\.\d × \d+\.\d × \d+\.\d cm · \d+\.\d L$/);
  });

  it("the two systems never produce the same string for a real board", () => {
    expect(formatSummaryLine(FIXED_SUMMARY, "imperial")).not.toBe(formatSummaryLine(FIXED_SUMMARY, "metric"));
  });

  it("every registered system produces a non-empty line — adding or dropping a branch fails here", () => {
    for (const system of UNITS_SYSTEMS) {
      const line = formatSummaryLine(FIXED_SUMMARY, system);
      expect(line.length).toBeGreaterThan(0);
    }
    // Two distinct systems today; if a third is ever added without a branch this would collapse.
    const lines = new Set(UNITS_SYSTEMS.map((system) => formatSummaryLine(FIXED_SUMMARY, system)));
    expect(lines.size).toBe(UNITS_SYSTEMS.length);
  });
});

describe("formatDimsExample", () => {
  it("imperial form has no litres part", () => {
    const example = formatDimsExample(FIXED_SUMMARY, "imperial");
    expect(example).not.toContain(" L");
    expect(example).toMatch(/^\d+'\d+(?:\s\d+\/\d+)?" · \d+(?:\s\d+\/\d+)?" · \d+(?:\s\d+\/\d+)?"$/);
  });

  it("metric form ends at cm with no litres part", () => {
    const example = formatDimsExample(FIXED_SUMMARY, "metric");
    expect(example.endsWith("cm")).toBe(true);
    expect(example).not.toContain(" L");
    expect(example).toMatch(/^\d+\.\d × \d+\.\d × \d+\.\d cm$/);
  });
});

describe("presetSummary", () => {
  it("returns the same DesignSummary applyPreset's state would produce", () => {
    const summary = presetSummary(shortboard);
    expect(summary).toEqual(FIXED_SUMMARY);
  });

  it("every preset in BOARD_PRESETS produces a real summary with all four numbers", () => {
    for (const preset of BOARD_PRESETS) {
      const summary = presetSummary(preset);
      expect(summary.length).toBeGreaterThan(0);
      expect(summary.widePointWidth).toBeGreaterThan(0);
      expect(summary.centerThickness).toBeGreaterThan(0);
      expect(summary.volumeLitres).toBeGreaterThan(0);
    }
  });

  /**
   * Source-contract guard (the lib/theme.test.ts idiom): presetSummary's whole contract rests
   * on applyPreset producing exactly `{ ...DEFAULT_DESIGN_STATE, outline, rocker, foil, rails,
   * fins, boardStarted: true, dirty: true }` — i.e. every field DEFAULT_DESIGN_STATE supplies
   * that a preset does NOT override stays at its default, in particular
   * railsImportFoilThickness: true and volume: DEFAULT_VOLUME_SPEC. If a future change to
   * design-store.tsx alters either of those defaults, presetSummary would silently start
   * quoting numbers a preset click no longer actually produces — this test reads the real
   * source file and fails instead of drifting quietly.
   */
  it("design-store.tsx's DEFAULT_DESIGN_STATE still carries the defaults presetSummary assumes", () => {
    const source = readFileSync(
      new URL("../../components/design/design-store.tsx", import.meta.url),
      "utf8",
    );
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, ""))
      .join("\n");
    const defaultStateMatch = stripped.match(/const DEFAULT_DESIGN_STATE:\s*DesignState\s*=\s*\{[\s\S]*?\n\};/);
    expect(defaultStateMatch, "DEFAULT_DESIGN_STATE block not found in design-store.tsx").not.toBeNull();
    const block = defaultStateMatch![0];
    expect(block).toMatch(/railsImportFoilThickness:\s*true/);
    expect(block).toMatch(/volume:\s*DEFAULT_VOLUME_SPEC/);
  });
});
