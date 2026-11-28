/**
 * The board set behind the nose rail's blend record (quick 261127-kkw, D-02): the boards whose litres, 3D shape
 * and board-file bytes were written down from the app BEFORE the nose's blend got its two sliders, so a board
 * that never moves them can be shown to be cut exactly as it was — to the last digit and the last byte.
 *
 * - `noseBlendSweepBoards`: 40 hand-set boards, eight lengths by five one-setting changes to the stock nose
 *   rail. Every one has a nose rail that differs from the centre's, so the nose's blend is at work on each.
 *   The lengths take in both ends of the range the app draws (4'0" and 12'0"), two boards whose centre is
 *   nearer than 30" (4'0" and 4'8") and two whose centre is off the sliders' 1/2" grid (63 1/2" and 73 7/8").
 * - `noseBlendPinBoards`: the 102 boards of Phase 16's third pin under their own labels, then the 40.
 * - `NOSE_BLEND_PRESET_LABELS`: the four presets as recorded, each with its own Hard Edge.
 *
 * TEST SUPPORT ONLY. The record's script (scripts/extract-nose-blend-pin.ts) and its test
 * (lib/geometry/nose-blend-pin.test.ts) are the only things that import this file. It reads `node:crypto` for
 * the two digests, so nothing a screen imports may ever import it.
 */
import { createHash } from "node:crypto";
import { brdFile } from "../../export/brd";
import { DEFAULT_BOARD_SPEC } from "../board";
import { holdOutlineToLength } from "../board-size";
import { buildBoardSurface, type BoardSurface } from "../board-surface";
import {
  designCrossSectionInput,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
  type DesignSummaryFields,
} from "../design";
import { buildOutline } from "../outline";
import { DEFAULT_RAIL_BAND_SPEC, type RailSectionSpec } from "../rail-bands";
import { inchesToMm } from "../units";
import { DEFAULT_VOLUME_SPEC } from "../volume";
import { phase16SurfaceBoards } from "./phase16-boards";

export interface NoseBlendBoard {
  label: string;
  fields: DesignSummaryFields;
}

/** The sweep's eight lengths, in inches. */
export const NOSE_BLEND_SWEEP_LENGTHS_IN = [48, 56, 63.5, 72, 73.875, 86, 108, 144] as const;

/** The five one-setting changes to the stock nose rail; each makes the nose differ from the centre. */
export const NOSE_BLEND_SWEEP_NOSES: Readonly<Record<string, (nose: RailSectionSpec) => RailSectionSpec>> = {
  knifey: (nose) => ({ ...nose, family: 5 }),
  boxy: (nose) => ({ ...nose, family: 1 }),
  symmetrical: (nose) => ({ ...nose, symmetrical: true }),
  "single-tuck": (nose) => ({ ...nose, singleTuck: true }),
  "sharp-tuck": (nose) => ({ ...nose, sharpBottomTuck: true }),
};

/** The label of one sweep board. */
export function noseBlendSweepLabel(lengthIn: number, nose: string): string {
  return `sweep|${lengthIn}|${nose}`;
}

/** The 40 hand-set boards, length by length, each with the five nose changes in the order above. */
export function noseBlendSweepBoards(): NoseBlendBoard[] {
  const boards: NoseBlendBoard[] = [];
  for (const lengthIn of NOSE_BLEND_SWEEP_LENGTHS_IN) {
    for (const [nose, change] of Object.entries(NOSE_BLEND_SWEEP_NOSES)) {
      boards.push({
        label: noseBlendSweepLabel(lengthIn, nose),
        fields: {
          outline: holdOutlineToLength({ ...DEFAULT_BOARD_SPEC.outline, length: inchesToMm(lengthIn) }),
          rocker: DEFAULT_BOARD_SPEC.rocker,
          foil: DEFAULT_BOARD_SPEC.foil,
          rails: { ...DEFAULT_RAIL_BAND_SPEC, nose: change(DEFAULT_RAIL_BAND_SPEC.nose) },
          railsImportFoilThickness: true,
          volume: DEFAULT_VOLUME_SPEC,
          blank: null,
        },
      });
    }
  }
  return boards;
}

/** All 142 boards the record holds litres for: Phase 16's 102, then the 40. */
export function noseBlendPinBoards(): NoseBlendBoard[] {
  return [...phase16SurfaceBoards(), ...noseBlendSweepBoards()];
}

/** The four presets on their recorded blanks, each with its own Hard Edge. */
export const NOSE_BLEND_PRESET_LABELS = [
  "shortboard|asis|hard",
  "fish|asis|hard",
  "midlength|asis|hard",
  "longboard|asis|soft",
] as const;

/** The boards whose 3D shape the record holds: the four presets, then all 40 sweep boards. */
export function noseBlendSurfaceLabels(): string[] {
  return [...NOSE_BLEND_PRESET_LABELS, ...noseBlendSweepBoards().map((board) => board.label)];
}

/** The boards whose board file the record holds: the four presets, then the eight `symmetrical` sweep boards. */
export function noseBlendFileLabels(): string[] {
  return [
    ...NOSE_BLEND_PRESET_LABELS,
    ...NOSE_BLEND_SWEEP_LENGTHS_IN.map((lengthIn) => noseBlendSweepLabel(lengthIn, "symmetrical")),
  ];
}

/** A board's 3D surface, built as the 3D page and the board file build it (lib/export/brd.test.ts `flatSurface`). */
export function noseBlendSurface(fields: DesignSummaryFields): BoardSurface {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  return buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length),
    geometry,
    rockerAt: profile.rockerAt,
  });
}

function bytesOf(array: Float64Array | Uint32Array | Uint8Array): Uint8Array {
  return new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
}

/** SHA-256, in hex, over the raw bytes of a surface's `positions`, then `indices`, then `faceKinds`: every
 * vertex, every triangle and every face's kind, so one moved bit anywhere changes it. */
export function noseBlendSurfaceDigest(surface: BoardSurface): string {
  const hash = createHash("sha256");
  hash.update(bytesOf(surface.positions));
  hash.update(bytesOf(surface.indices));
  hash.update(bytesOf(surface.faceKinds));
  return hash.digest("hex");
}

/** SHA-256, in hex, of the bytes of the board's .brd file as Export .brd File writes them, named "Board". */
export function noseBlendFileDigest(surface: BoardSurface): string {
  return createHash("sha256").update(brdFile(surface, "Board").data).digest("hex");
}
