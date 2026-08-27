/**
 * The design-snapshot boundary.
 *
 * The single place a design is validated on its way into and out of the database — the model
 * boundary equivalent of `lib/geometry/units.ts`'s unit boundary. `DesignSnapshotFields` is the
 * same seven-field object `design-store.tsx` calls `designSnapshotFields`: outline, rails, fins,
 * volume, finsImportTemplate, boardName, finSystem (D-11 — the whole `DesignState`, minus
 * `modelId` and `boardStarted`, which are session bookkeeping, not board design).
 *
 * Two rules govern this file:
 *
 * 1. The branded `Mm`/`Degrees`/`Litres` types (lib/geometry/units.ts) are plain numbers at
 *    runtime, so every one of them is validated here as `z.number()` — never re-branded at the
 *    Zod layer, because branding is compile-time only. The final cast back to the real
 *    `DesignSnapshotFields` type at the end of `parseSnapshot` is the one place that gap is
 *    bridged, deliberately, in one spot rather than scattered through the schema.
 * 2. `DESIGN_SNAPSHOT_VERSION` is what keeps this format reversible: Phase 4 adds rocker and
 *    foil to the design, so `parseSnapshot` tolerates a snapshot written by an older version —
 *    one missing a whole top-level field a newer version added — by filling that field from the
 *    matching geometry module's own DEFAULT_* constant rather than rejecting the row. That is
 *    what lets a future phase's schema grow without a data migration for every board saved
 *    before it shipped.
 *
 * Imports only from lib/geometry/* and the validation library — never the ORM layer or the auth
 * SDK. That keeps this file inside vitest's `lib/**\/*.test.ts` include pattern and inside Rule
 * 1's spirit: nothing database- or auth-shaped belongs beside a geometry-adjacent boundary
 * module.
 */

import { z } from "zod";
import { DEFAULT_BOARD_SPEC, type OutlineSpec } from "@/lib/geometry/board";
import {
  DEFAULT_FIN_PLACEMENT_SPEC,
  type FinPlacementSpec,
  type FinSystem,
} from "@/lib/geometry/fins";
import { DEFAULT_RAIL_BAND_SPEC, type RailBandSpec } from "@/lib/geometry/rail-bands";
import { DEFAULT_VOLUME_SPEC, type VolumeSpec } from "@/lib/geometry/volume";

export const DESIGN_SNAPSHOT_VERSION = 1;

const tailShapeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pin") }),
  z.object({ kind: z.literal("round") }),
  z.object({ kind: z.literal("squash"), endWidth: z.number() }),
  z.object({ kind: z.literal("diamond"), endWidth: z.number(), depth: z.number() }),
  z.object({ kind: z.literal("swallow"), endWidth: z.number(), crotchDepth: z.number() }),
]);

const outlineSpecSchema = z.object({
  length: z.number(),
  widePointWidth: z.number(),
  widePointOffset: z.number(),
  tailRailLength: z.number(),
  noseRailLength: z.number(),
  noseAngle: z.number(),
  noseFullness: z.number(),
  tailAngle: z.number(),
  tailFullness: z.number(),
  tail: tailShapeSchema,
});

const railSectionSpecSchema = z.object({
  boardThickness: z.number(),
  deckPercent: z.number(),
  family: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  ratioTopPercent: z.number(),
  symmetrical: z.boolean(),
  cornerCutOffsetOverride: z.number().nullable(),
  removeCornerCut: z.boolean(),
  singleTuck: z.boolean(),
  bottomTuck3Override: z.number().nullable(),
});

const railBandSpecSchema = z.object({
  nose: railSectionSpecSchema,
  center: railSectionSpecSchema,
  tail: railSectionSpecSchema,
  tailHardEdge: z.boolean(),
});

const finAdvancedSpecSchema = z.object({
  baseLenForward: z.number(),
  baseLenForwardOverridden: z.boolean(),
  baseLenRear: z.number(),
  baseLenRearOverridden: z.boolean(),
  baseLenCenter: z.number(),
  baseLenCenterOverridden: z.boolean(),
  centerPositionOffset: z.number(),
  forwardPositionOffset: z.number(),
  forwardToeOverride: z.number().nullable(),
  rearPositionOffset: z.number(),
  rearToeOverride: z.number().nullable(),
  quadRearOffRailOverride: z.number().nullable(),
  quadRearOffTailOverride: z.number().nullable(),
  quadRearOffTailOverridden: z.boolean(),
});

const finPlacementSpecSchema = z.object({
  boardLength: z.number(),
  tailWidth12: z.number(),
  tailShape: z.enum(["pin", "round", "diamond", "squash", "swallow"]),
  finSetup: z.enum(["single", "twin", "thruster", "2plus1", "quad"]),
  frontModel: z.enum(["proportional", "basic", "mckeeSB", "mckeeGun"]),
  quadRearModel: z.enum(["basic", "basicOffRail", "mckeeSB", "mckeeLB"]),
  twinTemplate: z.enum(["upright", "keel", "trailer"]),
  quadCenterFinOn: z.boolean(),
  advanced: finAdvancedSpecSchema,
});

const volumeSpecSchema = z.object({
  length: z.number(),
  width: z.number(),
  centerThickness: z.number(),
  boardTypeIndex: z.number(),
  importTemplateDimensions: z.boolean(),
  importRailThickness: z.boolean(),
});

const finSystemSchema = z.enum(["fcs2", "fcsOriginal", "futures", "lokbox", "probox", "glassOn"]);

// `.partial()` at this one level (not recursively) is the version-tolerance mechanism: a whole
// top-level field missing from an older snapshot parses as `undefined` here and is backfilled
// from a DEFAULT_* constant in `parseSnapshot` below, rather than failing the whole row. A field
// that IS present is still validated against its full nested shape — tolerance is for absence,
// never for a malformed present value.
const designFieldsSchema = z
  .object({
    outline: outlineSpecSchema,
    rails: railBandSpecSchema,
    fins: finPlacementSpecSchema,
    volume: volumeSpecSchema,
    finsImportTemplate: z.boolean(),
    boardName: z.string(),
    finSystem: finSystemSchema,
  })
  .partial();

/** A Zod object with a numeric `version` and a `design` object mirroring the seven snapshot
 * fields (see the module doc-comment for the tolerance rule this schema enforces). */
export const designSnapshotSchema = z.object({
  version: z.number(),
  design: designFieldsSchema,
});

/** The seven fields a save captures (D-11) — everything `DesignState` holds except `modelId` and
 * `boardStarted`, which are session bookkeeping, not board design. */
export interface DesignSnapshotFields {
  outline: OutlineSpec;
  rails: RailBandSpec;
  fins: FinPlacementSpec;
  volume: VolumeSpec;
  finsImportTemplate: boolean;
  boardName: string;
  finSystem: FinSystem;
}

export interface DesignSnapshot {
  version: number;
  design: DesignSnapshotFields;
}

/** Wraps a design in the current version — the write path a Server Action calls before a save. */
export function buildSnapshot(fields: DesignSnapshotFields): DesignSnapshot {
  return { version: DESIGN_SNAPSHOT_VERSION, design: fields };
}

/**
 * Validates and unwraps a stored (or incoming) snapshot back into usable design fields, filling
 * any field an older version omitted from the matching geometry module's own DEFAULT_* constant.
 * Throws (via Zod) on a structurally wrong value rather than half-accepting it.
 */
export function parseSnapshot(value: unknown): DesignSnapshotFields {
  const parsed = designSnapshotSchema.parse(value);
  const design = parsed.design;

  // The cast below is the one deliberate bridge from "validated plain numbers" back to the
  // branded Mm/Degrees/Litres types real design state is built from — see rule 1 in the module
  // doc-comment. Each field was validated shape-for-shape above; only the numeric brand is
  // erased at runtime and restored here.
  return {
    outline: (design.outline ?? DEFAULT_BOARD_SPEC.outline) as OutlineSpec,
    rails: (design.rails ?? DEFAULT_RAIL_BAND_SPEC) as RailBandSpec,
    fins: (design.fins ?? DEFAULT_FIN_PLACEMENT_SPEC) as FinPlacementSpec,
    volume: (design.volume ?? DEFAULT_VOLUME_SPEC) as VolumeSpec,
    finsImportTemplate: design.finsImportTemplate ?? true,
    boardName: design.boardName ?? "",
    finSystem: (design.finSystem ?? "fcs2") as FinSystem,
  };
}
