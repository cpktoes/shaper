/**
 * Every fin the 3D board can draw, for the Phase 16 fin pin (plan 16-17, D-35): each preset as it opens, then switched
 * to every fin setup (each twin template) with FINS' own Reset, 4 × 8 = 32 cases. Between them they reach every role
 * FINS can produce, on every preset, with FINS' own default figures. The marks are FINS' with Import Template on, as
 * the store opens them; the rocker is the preset's own, on the blank it opened in at go-live 2, so the record never
 * moves when a catalogue does.
 *
 * Pure: no React, browser or drawing-library import.
 */
import { designSideProfile, deriveEffectiveFins, LIVE_DESIGN_RULES } from "../design";
import type { FinOutline, FinOutlinePoint } from "../fin-outline";
import {
  computeFinPlacement,
  importedFinTailFromOutline,
  resetAdvanced,
  type FinMark,
  type FinPlacementSpec,
  type FinSetup,
  type TwinTemplate,
} from "../fins";
import { buildOutline } from "../outline";
import { BOARD_PRESETS, type BoardPreset } from "../presets";
import type { Mm } from "../units";
import { recordedPresetDesignFields } from "./phase14-preset-blanks";

export interface Phase16FinCase {
  /** `<preset id>|<case>`: the case is `opened`, or a setup (`twin/keel`). */
  label: string;
  preset: BoardPreset;
  /** FINS' spec as the board reads it (Import Template on). */
  spec: FinPlacementSpec;
  marks: FinMark[];
  rockerAt: (station: Mm) => Mm;
}

/** The seven setups, in FINS' terms: a twin once per template. */
const SETUPS: readonly { label: string; setup: FinSetup; twin?: TwinTemplate }[] = [
  { label: "single", setup: "single" },
  { label: "twin/upright", setup: "twin", twin: "upright" },
  { label: "twin/keel", setup: "twin", twin: "keel" },
  { label: "twin/trailer", setup: "twin", twin: "trailer" },
  { label: "thruster", setup: "thruster" },
  { label: "2plus1", setup: "2plus1" },
  { label: "quad", setup: "quad" },
];

/** One case: FINS' marks for `fins` on this preset's own outline, and the preset's own rocker. */
function finCase(label: string, preset: BoardPreset, fins: FinPlacementSpec): Phase16FinCase {
  const geometry = buildOutline(preset.outline);
  const spec = deriveEffectiveFins(fins, true, preset.outline, geometry);
  const { marks } = computeFinPlacement(spec, importedFinTailFromOutline(geometry));
  const { rockerAt } = designSideProfile(recordedPresetDesignFields(preset), LIVE_DESIGN_RULES);
  return { label: `${preset.id}|${label}`, preset, spec, marks: [...marks], rockerAt };
}

/** Every preset in `BOARD_PRESETS` order, as opened and then switched to each of the seven setups with FINS' Reset. */
export function phase16FinCases(): Phase16FinCase[] {
  return BOARD_PRESETS.flatMap((preset) => [
    finCase("opened", preset, preset.fins),
    ...SETUPS.map(({ label, setup, twin }) =>
      finCase(label, preset, {
        ...preset.fins,
        finSetup: setup,
        twinTemplate: twin ?? preset.fins.twinTemplate,
        advanced: resetAdvanced(setup),
      }),
    ),
  ]);
}

export interface FinMeasures {
  /** The outline's area, closed along its base. */
  area: number;
  /** The first point of greatest v: the fin's highest point. */
  top: FinOutlinePoint;
  /** The first point of greatest u: how far back the fin reaches. */
  rearmost: FinOutlinePoint;
  /** The line from the middle of the root to the highest point, against straight up, in degrees. */
  sweepDeg: number;
}

/** What a fin measures, the same way before and after D-35. */
export function finMeasures(outline: FinOutline): FinMeasures {
  const { points, base } = outline;
  let twice = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    twice += a.u * b.v - b.u * a.v;
  }
  let top = points[0];
  let rearmost = points[0];
  for (const p of points) {
    if (p.v > top.v) top = p;
    if (p.u > rearmost.u) rearmost = p;
  }
  return {
    area: Math.abs(twice) / 2,
    top,
    rearmost,
    sweepDeg: (Math.atan2(top.u - base / 2, top.v) * 180) / Math.PI,
  };
}
