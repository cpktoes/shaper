import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "@/lib/fit-defaults-preference";
import { boardFigures, RULES_LIVE } from "./before-after";
import type { BoardBlank } from "./blank";
import { boardOnBlank, prepareBlank, thinningStartsOf } from "./blank-fit";
import { buildBoardProfile } from "./board-profile";
import { summarizeDesign, type DesignSummaryFields } from "./design";
import type { FoilStationKey } from "./foil";
import { BOARD_PRESETS } from "./presets";
import { DEFAULT_FALLBACK_ROCKER, rockerStationPositions } from "./rocker";
import { inchesToMm, mm } from "./units";
import { DEFAULT_VOLUME_SPEC } from "./volume";

/**
 * A board's hand-set Thinning Starts reach every place a board is worked out (Phase 14 D-24,
 * RESEARCH Pitfall 5): the board's own blank derivation, the one side profile every screen reads,
 * and the before-and-after figures, all through the one helper `thinningStartsOf`. A path that
 * forgot the starts would quietly show the Automatic board on one screen and the hand-set one on
 * another. Every expected number is computed by the app's own functions — never typed (CLAUDE.md
 * Rule 1).
 */

const SETTINGS = toFitSettings(DEFAULT_FIT_DEFAULTS);
const KEYS: readonly FoilStationKey[] = ["tailTip", "tail12", "center", "nose12", "noseTip"];

/** A preset as the store opens it, with its blank's two starts replaced. */
function presetWith(
  preset: (typeof BOARD_PRESETS)[number],
  starts: { noseThinningStart?: number; tailThinningStart?: number },
): DesignSummaryFields & { blank: BoardBlank } {
  const fields = presetDesignFields(preset);
  const blank: BoardBlank = { ...fields.blank };
  delete blank.noseThinningStart;
  delete blank.tailThinningStart;
  if (starts.noseThinningStart !== undefined) blank.noseThinningStart = mm(starts.noseThinningStart);
  if (starts.tailThinningStart !== undefined) blank.tailThinningStart = mm(starts.tailThinningStart);
  return { ...fields, blank, railsImportFoilThickness: true, volume: DEFAULT_VOLUME_SPEC };
}

describe("a start set by hand gives the same board through every path (Pitfall 5)", () => {
  const handSetStarts = { tailThinningStart: inchesToMm(18), noseThinningStart: inchesToMm(15) };

  for (const preset of BOARD_PRESETS) {
    it(`${preset.name}: the five thicknesses and five rocker numbers agree through the blank, the side profile and the figures, and the litres move`, () => {
      const fields = presetWith(preset, handSetStarts);
      const { blank, foil } = fields;
      const length = fields.outline.length;
      const prepared = prepareBlank(blank.copy);

      // (a) The board laid on its blank directly.
      const onBlank = boardOnBlank(
        prepared,
        {
          length,
          centerThickness: foil.center,
          noseTip: foil.noseTip,
          tailTip: foil.tailTip,
          nose12Offset: blank.nose12Offset,
          tail12Offset: blank.tail12Offset,
          deckSkin: blank.deckSkin,
          tipStyle: blank.tipStyle,
          fineTuneSurface: blank.fineTuneSurface,
          ...thinningStartsOf(blank),
        },
        blank.placement,
      );
      expect(onBlank.tips.tail.automatic).toBe(false);
      expect(onBlank.tips.nose.automatic).toBe(false);

      // (b) The one side profile every screen reads.
      const profile = buildBoardProfile({
        length,
        rocker: fields.rocker ?? DEFAULT_FALLBACK_ROCKER,
        foil,
        blank: {
          prepared,
          placement: blank.placement,
          nose12Offset: blank.nose12Offset,
          tail12Offset: blank.tail12Offset,
          deckSkin: blank.deckSkin,
          tipStyle: blank.tipStyle,
          fineTuneSurface: blank.fineTuneSurface,
          ...thinningStartsOf(blank),
        },
      });

      // (c) The figures the cards and the reports read.
      const figures = boardFigures(fields, RULES_LIVE, SETTINGS);

      for (const { key, station } of rockerStationPositions(length)) {
        const thickness = mm(onBlank.thicknessAt(station));
        const rocker = mm(onBlank.rockerAt(station));
        expect(profile.effectiveFoil[key], `profile thickness ${key}`).toBe(thickness);
        expect(profile.stationRocker[key], `profile rocker ${key}`).toBe(rocker);
        expect(figures.thicknessMm[key], `figures thickness ${key}`).toBe(thickness);
        expect(figures.rockerMm[key], `figures rocker ${key}`).toBe(rocker);
      }

      // The hand-set starts really change the board: a 12" number moves, and so do the litres.
      const automatic = boardFigures(presetWith(preset, {}), RULES_LIVE, SETTINGS);
      expect(KEYS.some((key) => automatic.thicknessMm[key] !== figures.thicknessMm[key])).toBe(true);
      expect(summarizeDesign(fields).volumeLitres).not.toBe(summarizeDesign(presetWith(preset, {})).volumeLitres);
      expect(summarizeDesign(fields).volumeLitres).toBe(figures.litres);
    });
  }
});

/** Strips `//` line comments and `/* *\/` block comments, same helper as components/design/design-store.test.ts. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

/** The text from `start` to the brace/bracket/paren that closes the first opener at or after it
 * (same helper as components/design/design-store.test.ts — copied, not imported across). */
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

/** A `useMemo(() => ({ … }), [ … ])` (typed or not) assigned to `const NAME`: its object and its
 * dependency array — the design-store test's `memo` helper, taught to skip a `<Type>` argument. */
function memo(source: string, name: string): { object: string; deps: string } {
  const start = source.search(new RegExp(`const ${name}\\b[^=]*=\\s*useMemo(?:<[^>]*>)?\\(`));
  expect(start, `${name}'s useMemo not found`).toBeGreaterThanOrEqual(0);
  const call = balancedFrom(source, source.indexOf("useMemo", start));
  const depsStart = call.lastIndexOf("[");
  return { object: call.slice(0, depsStart), deps: call.slice(depsStart) };
}

/** A source file, read relative to this test and stripped of comments. */
function sourceOf(site: string): string {
  return stripComments(readFileSync(new URL(site, import.meta.url), "utf8"));
}

describe("every place that builds a board from its stored blank passes its starts through the one helper", () => {
  // The library paths (14-12), the blank list and the blank flag on ROCKER, and the read-only
  // saved-boards check (14-17).
  const SITES = [
    "./board-profile.ts",
    "./design.ts",
    "../../components/rocker/use-blank-list.ts",
    "../../components/rocker/blank-flag.tsx",
    "../../scripts/check-saved-boards.ts",
  ] as const;

  it.each(SITES)("%s calls thinningStartsOf(", (site) => {
    expect(sourceOf(site)).toContain("thinningStartsOf(");
  });

  // Pitfall 6: a start missing from a memo's dependency list leaves the list's verdicts (or the
  // flag) judged on the old start after the shaper moves it.
  it.each(["../../components/rocker/use-blank-list.ts", "../../components/rocker/blank-flag.tsx"])(
    "%s's board-fit ctx memo passes both starts and re-judges when either changes",
    (site) => {
      const { object, deps } = memo(sourceOf(site), "ctx");
      expect(object).toContain("...thinningStartsOf({ noseThinningStart, tailThinningStart })");
      expect(deps).toMatch(/\bnoseThinningStart\b/);
      expect(deps).toMatch(/\btailThinningStart\b/);
    },
  );

  it("../../scripts/check-saved-boards.ts passes the starts at both of its board-input sites", () => {
    expect(sourceOf("../../scripts/check-saved-boards.ts").match(/thinningStartsOf\(/g) ?? []).toHaveLength(2);
  });
});
