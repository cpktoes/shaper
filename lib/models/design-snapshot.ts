/**
 * The design-snapshot boundary.
 *
 * The single place a design is validated on its way into and out of the database — the model
 * boundary equivalent of `lib/geometry/units.ts`'s unit boundary. `DesignSnapshotFields` is the
 * same eleven-field object `design-store.tsx` calls `designSnapshotFields`: outline, rocker, foil,
 * rails, fins, volume, finsImportTemplate, railsImportFoilThickness, boardName, finSystem and
 * blank (D-11 — the whole `DesignState`, minus `modelId`, `boardStarted` and `dirty`, which are
 * session bookkeeping, not board design).
 *
 * Five rules govern this file:
 *
 * 1. The branded `Mm`/`Degrees`/`Litres` types (lib/geometry/units.ts) are plain numbers at
 *    runtime, so every one of them is validated here as `z.number()` — never re-branded at the
 *    Zod layer, because branding is compile-time only. The final cast back to the real
 *    `DesignSnapshotFields` type at the end of `parseSnapshot` is the one place that gap is
 *    bridged, deliberately, in one spot rather than scattered through the schema.
 * 2. `DESIGN_SNAPSHOT_VERSION` is what keeps this format reversible. 04-01 is what actually
 *    exercises it: rocker and foil are new top-level fields, so version 2's `parseSnapshot`
 *    tolerates a snapshot written under version 1 — missing both fields entirely — by filling
 *    each one from its matching geometry module's own DEFAULT_* constant (`DEFAULT_ROCKER_SPEC`,
 *    `DEFAULT_FOIL_SPEC`) rather than rejecting the row. A board saved before this phase just
 *    reopens with a sensible default side profile (D-15) — no migration, no error.
 * 3. Version 3 (quick task 260829-rda) extended rule 2 from backfill to MIGRATION: the rocker
 *    changed SHAPE to an eight-field Bezier, and a version-2 four-lift rocker was converted onto it
 *    on read (its tip lifts carried over, the shape controls defaulted). Rule 4 below supersedes
 *    that conversion: the four-lift shape is current again, and a version-3 Bezier is now the one
 *    read back as five stations.
 * 4. Version 4 (Phase 11, D-01/D-14) changes the rocker's shape back to five stations and adds the
 *    board's blank.
 *    - The ROCKER is the hand-set fallback `FiveStationRocker` — `noseTip`, `nose12`, `tail12`,
 *      `tailTip`, the centre always 0. That is exactly version 2's four-lift shape, so a version-2
 *      rocker parses as today's value unchanged. A version-3 eight-field Bezier (detected by
 *      `noseLift`, a field only it has) is built at the board's own length and read at the five
 *      stations (`bezierToFiveStations`), so it reopens showing the very numbers its old curve
 *      showed. A version-1 snapshot (no rocker key at all) reads the default Bezier the same way,
 *      because that is the curve version 3 drew for such a board (11-RESEARCH.md A5). The Bezier
 *      builder survives in `lib/geometry/rocker.ts` only for this migration.
 *    - The BLANK is `null` (no blank — the hand-set fallback, D-02) or the board's own copy of its
 *      blank's catalogue rows, carried BY VALUE (D-01) so a later catalogue correction can never
 *      move a saved board, plus the placement and the two 12" fine-tunes. Absent means `null`.
 *    - A saved snapshot is untrusted input — a saved row and the browser both feed this parser, and
 *      the blank copy brings an array and free text with it — so the blank is validated for SIZE as
 *      well as shape: at most 32 stations, identity strings at most 120 characters, a flag at most
 *      400, every number finite and inside a sane range, stations strictly tail-to-nose, placement
 *      within ±4000 mm, each fine-tune within ±50 mm, and the copy must pass the same pickable rule
 *      (`isPickable`) the blank list uses. `app/design/actions.ts` re-parses every save through here.
 *    - The board's LENGTH is bounded too (WR-05): a length more than a factor of two outside the
 *      app's own 60"-120" range rejects the snapshot, and a blank on a board outside that range
 *      (but not that far) is dropped, so the board reopens hand-set instead of crashing the rack.
 *    - `foil.center` stays the board's ONE stored centre thickness (D-12); the blank carries no
 *      board centre of its own.
 * 5. Version 5 (Phase 12, D-07/D-14) puts the board's CUT on its blank: `deckSkin`, `tipStyle` and
 *    `fineTuneSurface` — all three or none, anything else rejected. A blank with none of them is a
 *    Phase 11 blank, and it is carried over on read: the out-of-the-box skin, the shaper's Tip Style
 *    (passed in, `ParseSnapshotOptions`), fine-tunes on the Deck, and the two 12" fine-tunes set so
 *    the five station thicknesses read exactly what Phase 11 showed (clamped to the ±50 mm bound so
 *    the result re-parses). The trigger is the blank's SHAPE (`hasPhase11Blank`), never the
 *    envelope's version number, because `saveModel` re-stamps whatever arrives with the current
 *    version — a tab left open across the deploy saves a Phase 11 blank stamped 5. Phase 11's
 *    proportional formula survives only in `lib/geometry/phase11-foil.ts`, for this.
 *
 * Imports only from lib/geometry/*, the pure catalogue rule in `lib/blanks/catalog.ts` and the
 * validation library — never the ORM layer or the auth SDK. That keeps this file inside vitest's `lib/**\/*.test.ts` include pattern and inside Rule
 * 1's spirit: nothing database- or auth-shaped belongs beside a geometry-adjacent boundary
 * module.
 */

import { z } from "zod";
import { blankRecordShapeSchema, isPickable } from "@/lib/blanks/catalog";
import { DEFAULT_BLANK_CUT, type BlankRecord, type BoardBlank, type TipStyle } from "@/lib/geometry/blank";
import { prepareBlank } from "@/lib/geometry/blank-fit";
import { BOARD_LENGTH_RANGE_IN, DEFAULT_BOARD_SPEC, type OutlineSpec } from "@/lib/geometry/board";
import {
  DEFAULT_FIN_PLACEMENT_SPEC,
  type FinPlacementSpec,
  type FinSystem,
} from "@/lib/geometry/fins";
import { DEFAULT_FOIL_SPEC, type FoilSpec } from "@/lib/geometry/foil";
import { carryPhase11Blank } from "@/lib/geometry/phase11-foil";
import { DEFAULT_RAIL_BAND_SPEC, type RailBandSpec } from "@/lib/geometry/rail-bands";
import {
  DEFAULT_ROCKER_SPEC,
  bezierToFiveStations,
  type FiveStationRocker,
  type RockerSpec,
} from "@/lib/geometry/rocker";
import { inchesToMm, mm, type Mm } from "@/lib/geometry/units";
import { DEFAULT_VOLUME_SPEC, type VolumeSpec } from "@/lib/geometry/volume";

export const DESIGN_SNAPSHOT_VERSION = 5;

const tailShapeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pin") }),
  z.object({ kind: z.literal("round") }),
  z.object({ kind: z.literal("squash"), endWidth: z.number() }),
  z.object({ kind: z.literal("diamond"), endWidth: z.number(), depth: z.number() }),
  z.object({ kind: z.literal("swallow"), endWidth: z.number(), crotchDepth: z.number() }),
]);

/**
 * The board lengths a saved board can hold at all (WR-05): anything more than a factor of two
 * outside the app's own board-length range (`BOARD_LENGTH_RANGE_IN`, 60"-120", so 30"-240") is not
 * a board this app ever drew, and the snapshot is rejected as invalid. The lower end also keeps
 * every board long enough for its five stations to run in order (tail tip, tail 12", centre,
 * nose 12", nose tip — the centre must sit past the 12" station), which the side profile needs to
 * be drawn at all; `design-snapshot.test.ts` checks that still holds.
 */
export const SNAPSHOT_BOARD_LENGTH_MM = {
  min: inchesToMm(BOARD_LENGTH_RANGE_IN.min / 2),
  max: inchesToMm(BOARD_LENGTH_RANGE_IN.max * 2),
} as const;

/** Float slack when deciding whether a saved board's length is inside the app's own range. */
const BOARD_LENGTH_TOLERANCE_MM = 1;

/**
 * Whether a board's length is inside the app's own board-length range (60"-120"), give or take a
 * millimetre of round-trip slack — the only boards the blank maths is built for. A saved board in
 * a blank whose length is outside it reopens hand-set instead (see `parseSnapshot`).
 */
export function isBoardLengthInRange(length: number): boolean {
  return (
    length >= inchesToMm(BOARD_LENGTH_RANGE_IN.min) - BOARD_LENGTH_TOLERANCE_MM &&
    length <= inchesToMm(BOARD_LENGTH_RANGE_IN.max) + BOARD_LENGTH_TOLERANCE_MM
  );
}

const outlineSpecSchema = z.object({
  length: z.number().min(SNAPSHOT_BOARD_LENGTH_MM.min).max(SNAPSHOT_BOARD_LENGTH_MM.max),
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

/** The five-station hand-set rocker (version 4, D-14) — four typed lifts, the centre always 0 and
 * never stored. The very same shape version 2 saved, so a version-2 rocker needs no conversion. */
const fiveStationRockerSchema = z.object({
  noseTip: z.number(),
  nose12: z.number(),
  tail12: z.number(),
  tailTip: z.number(),
});

/** Version 3's eight-field Bezier rocker (quick task 260829-rda) — kept so a board saved under
 * version 3 still parses; `parseSnapshot` reads it back as five stations. Plain `z.number()` per
 * branded field, never re-branded at the Zod layer — same posture as `outlineSpecSchema` above. */
const bezierV3RockerSchema = z.object({
  noseLift: z.number(),
  tailLift: z.number(),
  noseAngle: z.number(),
  tailAngle: z.number(),
  noseSmoothness: z.number(),
  tailSmoothness: z.number(),
  noseFlatness: z.number(),
  tailFlatness: z.number(),
});

/** The two shapes share no field name, so the union is unambiguous in either order — today's
 * five-station shape listed first so current saves take the fast path. */
const rockerSpecSchema = z.union([fiveStationRockerSchema, bezierV3RockerSchema]);

/** How far the board's centre may sit from the blank's centre, in mm either way. */
const BLANK_PLACEMENT_MAX_MM = 4000;
/** The largest 12" fine-tune either way, in mm (~2"). */
const BLANK_OFFSET_MAX_MM = 50;
/** The thickest deck skin a saved board may carry, in mm (~2") — the same sanity bound as a
 * fine-tune; the Deck Skin control itself stops far short of it. */
export const BLANK_DECK_SKIN_MAX_MM = 50;

/** The board's own copy of its blank's catalogue record (D-01): well-formed by the ONE blank shape
 * rule in `lib/blanks/catalog.ts` (`blankRecordShapeSchema` — bounded, stations strictly tail to
 * nose; the catalogue read holds every row to the same rule), and one the blank list could have
 * offered (`isPickable`). */
// The cast is the same deliberate brand bridge as rule 1: every field was just validated.
const blankRecordSchema = blankRecordShapeSchema.refine((record) => isPickable(record as BlankRecord), {
  message: "this blank is missing a thickness the board's foil needs (not pickable)",
});

/** A board's blank (D-01): its catalogue copy, where the board sits on it (positive toward the
 * nose, D-08), the two 12" fine-tunes (D-11) and — from version 5 — how the board is cut from it
 * (Phase 12: deck skin, Tip Style, fine-tune surface; all three or none, rule 5). It carries no
 * board centre thickness — that stays `foil.center` (D-12). */
export const boardBlankSchema = z
  .object({
    copy: blankRecordSchema,
    placement: z.number().min(-BLANK_PLACEMENT_MAX_MM).max(BLANK_PLACEMENT_MAX_MM),
    nose12Offset: z.number().min(-BLANK_OFFSET_MAX_MM).max(BLANK_OFFSET_MAX_MM),
    tail12Offset: z.number().min(-BLANK_OFFSET_MAX_MM).max(BLANK_OFFSET_MAX_MM),
    deckSkin: z.number().min(0).max(BLANK_DECK_SKIN_MAX_MM).optional(),
    tipStyle: z.enum(["pinDeck", "bottom"]).optional(),
    fineTuneSurface: z.enum(["deck", "bottom"]).optional(),
  })
  .refine(
    (blank) => {
      const present = [blank.deckSkin, blank.tipStyle, blank.fineTuneSurface].filter((v) => v !== undefined);
      return present.length === 0 || present.length === 3;
    },
    { message: "a blank carries its deck skin, Tip Style and fine-tune surface together, or none of them" },
  );

/** Five thickness values, including both tips (D-05) — `foilSpecSchema`'s only structural
 * difference from `rockerSpecSchema` is the extra `center` field. */
const foilSpecSchema = z.object({
  noseTip: z.number(),
  nose12: z.number(),
  center: z.number(),
  tail12: z.number(),
  tailTip: z.number(),
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
    rocker: rockerSpecSchema,
    foil: foilSpecSchema,
    rails: railBandSpecSchema,
    fins: finPlacementSpecSchema,
    volume: volumeSpecSchema,
    finsImportTemplate: z.boolean(),
    railsImportFoilThickness: z.boolean(),
    boardName: z.string(),
    finSystem: finSystemSchema,
    blank: boardBlankSchema.nullable(),
  })
  .partial();

/** A Zod object with a numeric `version` and a `design` object mirroring the eleven snapshot
 * fields (see the module doc-comment for the tolerance rule this schema enforces). */
export const designSnapshotSchema = z.object({
  version: z.number(),
  design: designFieldsSchema,
});

/** The eleven fields a save captures (D-11) — everything `DesignState` holds except `modelId`,
 * `boardStarted` and `dirty`, which are session bookkeeping, not board design. */
export interface DesignSnapshotFields {
  outline: OutlineSpec;
  /** The hand-set fallback rocker (D-14). Kept while a blank is picked, as the rocker the board
   * returns to only if the shaper removes the blank (which re-seeds it from the drawn curve). */
  rocker: FiveStationRocker;
  foil: FoilSpec;
  rails: RailBandSpec;
  fins: FinPlacementSpec;
  volume: VolumeSpec;
  finsImportTemplate: boolean;
  /** Whether RAILS reads its three thickness stations from the foil (D-09/D-10) — defaults to
   * true on backfill (`design.railsImportFoilThickness ?? true` below) so a board saved before
   * this phase reopens linked and immediately reads its own backfilled foil (D-15), rather than a
   * stale rails thickness it never had a chance to disagree with. */
  railsImportFoilThickness: boolean;
  boardName: string;
  finSystem: FinSystem;
  /** The board's blank, by value (D-01), or `null` for the hand-set fallback (D-02). */
  blank: BoardBlank | null;
}

export interface DesignSnapshot {
  version: number;
  design: DesignSnapshotFields;
}

/** Wraps a design in the current version — the write path a Server Action calls before a save. */
export function buildSnapshot(fields: DesignSnapshotFields): DesignSnapshot {
  return { version: DESIGN_SNAPSHOT_VERSION, design: fields };
}

/** True when a parsed rocker object is version 3's eight-field Bezier — detected by `noseLift`, a
 * field only that shape has (the five-station shape has no field in common with it). */
function isBezierV3Rocker(rocker: object): boolean {
  return "noseLift" in rocker;
}

/**
 * True when a stored (or incoming) value holds a Phase 11 blank — a blank object with no
 * `tipStyle` of its own (rule 5). Decided by the blank's SHAPE, never by the envelope's version
 * number: a save re-stamps the current version on whatever arrives (Pitfall 5).
 */
export function hasPhase11Blank(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const design = (value as { design?: unknown }).design;
  if (typeof design !== "object" || design === null) return false;
  const blank = (design as { blank?: unknown }).blank;
  return typeof blank === "object" && blank !== null && !Object.prototype.hasOwnProperty.call(blank, "tipStyle");
}

/** How a Phase 11 blank is carried over (rule 5). */
export interface ParseSnapshotOptions {
  /** The Tip Style a carried-over board takes — the shaper's account default (D-14). Absent means
   * the out-of-the-box one (`DEFAULT_BLANK_CUT.tipStyle`). */
  tipStyle?: TipStyle;
}

/** A carried-over fine-tune pulled inside the snapshot's own bound, so the board re-parses. */
function clampOffset(value: number): Mm {
  return mm(Math.min(BLANK_OFFSET_MAX_MM, Math.max(-BLANK_OFFSET_MAX_MM, value)));
}

/**
 * Validates and unwraps a stored (or incoming) snapshot back into usable design fields, filling
 * any field an older version omitted from the matching geometry module's own DEFAULT_* constant.
 * The rocker is always returned as five stations — a version-3 Bezier or a missing rocker is read
 * at the board's own five stations (rule 4). A Phase 11 blank is carried over to its version-5 cut
 * (rule 5); a blank that already has its cut is returned exactly as parsed. Throws (via Zod) on a
 * structurally wrong or oversized value rather than half-accepting it.
 */
export function parseSnapshot(value: unknown, options: ParseSnapshotOptions = {}): DesignSnapshotFields {
  const parsed = designSnapshotSchema.parse(value);
  const design = parsed.design;

  // The outline first: an older rocker is read at the board's OWN length.
  const outline = (design.outline ?? DEFAULT_BOARD_SPEC.outline) as OutlineSpec;
  const rocker: FiveStationRocker = !design.rocker
    ? bezierToFiveStations(DEFAULT_ROCKER_SPEC, outline.length)
    : isBezierV3Rocker(design.rocker)
      ? bezierToFiveStations(design.rocker as RockerSpec, outline.length)
      : (design.rocker as FiveStationRocker);

  const foil = (design.foil ?? DEFAULT_FOIL_SPEC) as FoilSpec;

  // Tolerate and migrate (WR-05): a blank on a board whose length is outside the app's own
  // range is dropped, so the board reopens hand-set rather than crashing every screen that lays
  // it on its blank (the blank maths is only built for boards in that range).
  const kept = (design.blank && isBoardLengthInRange(outline.length) ? design.blank : null) as BoardBlank | null;

  // Rule 5: a blank with no cut is a Phase 11 blank — carry it over so its five station
  // thicknesses read what Phase 11 showed. It already passed the bounded, pickable schema, so
  // preparing it cannot throw.
  let blank = kept;
  if (kept && kept.tipStyle === undefined) {
    const carried = carryPhase11Blank(
      prepareBlank(kept.copy),
      {
        length: outline.length,
        centerThickness: foil.center,
        noseTip: foil.noseTip,
        tailTip: foil.tailTip,
        nose12Offset: kept.nose12Offset,
        tail12Offset: kept.tail12Offset,
      },
      kept.placement,
      options.tipStyle ?? DEFAULT_BLANK_CUT.tipStyle,
    );
    blank = {
      ...kept,
      ...carried,
      nose12Offset: clampOffset(carried.nose12Offset),
      tail12Offset: clampOffset(carried.tail12Offset),
    };
  }

  // The cast below is the one deliberate bridge from "validated plain numbers" back to the
  // branded Mm/Degrees/Litres types real design state is built from — see rule 1 in the module
  // doc-comment. Each field was validated shape-for-shape above; only the numeric brand is
  // erased at runtime and restored here.
  return {
    outline,
    rocker,
    foil,
    rails: (design.rails ?? DEFAULT_RAIL_BAND_SPEC) as RailBandSpec,
    fins: (design.fins ?? DEFAULT_FIN_PLACEMENT_SPEC) as FinPlacementSpec,
    volume: (design.volume ?? DEFAULT_VOLUME_SPEC) as VolumeSpec,
    finsImportTemplate: design.finsImportTemplate ?? true,
    railsImportFoilThickness: design.railsImportFoilThickness ?? true,
    boardName: design.boardName ?? "",
    finSystem: (design.finSystem ?? "fcs2") as FinSystem,
    blank,
  };
}
