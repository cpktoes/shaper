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
 * Ten rules govern this file:
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
 *      app's own 4'0"-12'0" range (30" to 288") rejects the snapshot, and a blank on a board outside that range
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
 * 6. Phase 14 (D-02, D-24) lets a blank carry where each tip's thinning starts —
 *    `noseThinningStart` and `tailThinningStart`, millimetres in from that tip; absent means
 *    Automatic. The version stays 5, because the reader before this rule tolerates them: it drops
 *    unknown blank keys and accepts any version number (measured — `saved-board-open.test.ts`'s
 *    rollback test, written on that reader). Each is read forgivingly: a value that is not a
 *    number, or is outside 0 to `BLANK_THINNING_START_MAX_MM`, reads as Automatic and never rejects
 *    the board, and the parsed blank then carries no key for it at all. Opening a board never
 *    rewrites a stored start. They are independent of the cut (not counted by rule 5's "all three
 *    or none"), the Phase 11 carry-over sets none, and no database change is needed — the saved
 *    board is one JSON column.
 * 7. Wings (quick 261014-wii, 2026-10-14, P1) ride on the outline as an optional `wings` list —
 *    absent means no wings, which is every board saved before them. The version stays 5, for rule
 *    6's reason: the reader before this rule drops an unknown outline key (measured, F23), so a
 *    rollback opens a winged board without its wings rather than failing. Each wing is validated
 *    strictly — at most two, every number finite and bounded, a depth above 0, a lock that is
 *    `"front-trailing"`, `"front-leading"`, `"rear-trailing"` or `null` — but the list is read
 *    forgivingly as a whole: anything malformed reads as no wings and the board still opens, with
 *    the key removed, exactly as rule 6 removes an Automatic start. Opening a board never rewrites a
 *    stored wing.
 *    The slot locks (quick 261015-hz7, 2026-10-15, D1, D10): wing 1 may lock only to the front fins'
 *    trailing edge (`"front-trailing"`), wing 2 only to a quad's rear fins' trailing edge
 *    (`"rear-trailing"`). On read, the first build's `"front-leading"` reads as `"front-trailing"`
 *    (the Fin edge picker is gone — "Fin edge should always be to trailing edge for the lock"), and
 *    a lock the wing's slot may not hold (a front lock on wing 2, a rear lock on wing 1) reads as
 *    placed by hand at its stored station. A rear lock on a fin setup without rear fins is a
 *    placement fact, left for the resolver to treat as inert. Wings stored out of order or past the
 *    centre or the widepoint are left exactly as stored and corrected when the board is drawn
 *    (`clampWingStations`, D2, D3). The version stays 5: the reader before this rule rejects
 *    `"rear-trailing"` in its strict enum, which reads that board as no wings rather than failing.
 * 8. A blank may carry its rocker as ordered from the maker (quick 261016-mkb, 2026-10-16, D-01) —
 *    `rocker`, a list of changes in US Blanks' terms (`blankRockerSpecSchema`); absent means the
 *    natural rocker, which is every board saved before it. The version stays 5, for rule 6's reason:
 *    the reader before this rule drops an unknown blank key (`boardBlankSchema` is a plain
 *    `z.object`), so a rollback opens a custom-rocker board on the natural rocker rather than
 *    failing. Strict per change — an end that is `"nose"` or `"tail"`, an amount within ±2", a bend
 *    point inside 0 to `BLANK_THINNING_START_MAX_MM`, at most four changes and two per end — but
 *    forgiving as a whole: anything malformed reads as natural and the board still opens, with the
 *    key removed. A valid spec is read through `normalizeSpec`, so the board shows the spec the app
 *    would have written; a natural one leaves no key at all. No database change is needed — the
 *    saved board is one JSON column.
 * 9. The FINS Off-Rail tuner stores two nudges in a board's fin settings, `forwardOffRailNudge` and
 *    `rearOffRailNudge` (quick 261018-dw6, 2026-10-18, D-01) — each a signed distance from where the
 *    fin setup's own template puts the pair. Absent means 0, which is every board saved before them,
 *    so an old board opens with its fins exactly where they were. The version stays 5, for rule 6's
 *    reason: the reader before this rule drops unknown keys (`finAdvancedSpecSchema` is a plain
 *    `z.object`), so a rollback opens a nudged board with its fins on the template rather than
 *    failing. Read forgivingly — anything that is not a finite number reads 0 and never rejects the
 *    board. No bound is applied here: the engine holds any stored value inside each pair's tuner
 *    window (D-02 for the front and side fins, D-02b for the stringer-placed quad rears), so no
 *    crafted value can push a fin off the board. No database change is needed.
 * 10. Each rail section carries `scaleFromCenter` ("Scaled from center by") and `nudges` (six
 *    plus-or-minus amounts, one per mark a shaper can tweak — `RAIL_NUDGE_KEYS`) for the founder's
 *    Chris Rails v2 sheets (quick 261102-gec, 2026-11-02, PC1). Absent means the section's default —
 *    `DEFAULT_TIP_RAIL_SCALE` (1 since fast task 189; 0.75 before it) on the nose and tail, 1 on the centre, every nudge 0 — which is every board saved before
 *    them. Read forgivingly, rule 9's way: anything that is not a number reads its default and never
 *    rejects the board. No bound is applied here: the engine holds the scale, each nudge, the Ratio and
 *    Deck Profile inside their windows (PC6, R7), so no crafted value draws a nonsense rail. The version
 *    stays 5, for rule 6's reason: the reader before this rule drops unknown keys (M8). The three legacy
 *    keys — `cornerCutOffsetOverride`, `removeCornerCut` and `bottomTuck3Override` — stay REQUIRED and are
 *    carried exactly as read (PC2), because that reader requires them: a board saved without them would
 *    not open on `main` or a rolled-back deployment. The v2 rules never read them (R12). No database
 *    change is needed.
 *    Amended by plan 04 (quick 261102-gec, R17 and R18, 2026-11-02): SIX nudges now. Deck Mark 2 and
 *    Bottom Tuck 2 lost theirs (the founder: "Always in the middle is great" — each is always half its
 *    parent mark), so a stored `deckMark2` or `bottomTuck2` amount from a board saved before the ruling is
 *    dropped on read (the nudges object strips unknown keys) and moves no mark. The Domed Deck Band gained
 *    one (`domedDeckBand`, ±2", never onto Deck Mark 3 — the engine holds both), and a board saved without
 *    it reads 0, so it opens exactly as it was. Nothing is rewritten until the shaper saves. The version
 *    stays 5, for rule 6's reason; no database change — rails live in the `snapshot` JSON column.
 * 11. The tail's Symmetrical and Hard Edge can never both be on (fast task 190, R21, 2026-11-02 — the
 *    founder: "tail sym and hard edge cannot both be selected"; a hard edge has no tucks to mirror). The
 *    store keeps the rule as a shaper ticks either box; this reader keeps it for a board saved before the
 *    rule, or by hand: a tail stored with both opens with Hard Edge winning and Symmetrical off, nothing
 *    rewritten until the shaper saves. The other rails' Symmetrical is never touched. Version stays 5.
 * 12. Each rail section carries `sharpBottomTuck`, the Sharp Bottom Tuck box (quick 261102-gec plan 05,
 *    R22, 2026-11-02 — the founder: "an advanced checkbox for leaving the bottom edge fairly sharp (follow
 *    the angle at bottom tuck 3)"). Absent — every board saved before it — or anything that is not a
 *    boolean reads off, so an old board opens exactly as it was and a crafted value never rejects the
 *    board. The version stays 5, for rule 6's reason: the reader on `main` (and a rolled-back deployment)
 *    drops the unknown key, so a board saved here with the box ticked still opens there, unticked. No
 *    database change — rails live in the `snapshot` JSON column.
 * 13. The rails carry the tail's two hard-edge settings, each optional (Phase 16, D-20 the founder
 *    2026-11-03, D-30 2026-11-04), both in millimetres from the tail tip: `tailHardEdgeBlendsFrom` (Hard
 *    Edge Blends From, where the hard edge starts blending into the tucked rail) and `tailHardEdgeEndsAt`
 *    (Hard Edge Ends At, where the rail has fully blended into the centre's tucked rail). Absent — every
 *    board saved before them, and a board saved with only the first, single Ends At — reads the default pair
 *    through `hardEdgeBlendsFrom` / `hardEdgeEndsAt` — 12" and the top of Ends At's slider (the board's centre) since quick
 *    261113-psx, the founder 2026-11-13; D-30's 18" and L/6 + 18" before. Anything that is not a finite number that could sit on
 *    some board (Blends From 12"-30", Ends At 14" to the centre of the longest board) leaves no key at all,
 *    so a crafted value never rejects the board; a value that fits some board but not this one, or a pair
 *    that crosses, is forgiven by those readers on every read. Nothing is rewritten until the shaper saves.
 *    The version stays 5, for rule 6's reason: the reader on `main` (and a rolled-back deployment) drops the
 *    unknown keys, so a board saved here opens there with its old hard edge. No database change — rails
 *    live in the `snapshot` JSON column.
 * 14. The board carries its bottom, optional (Phase 17, D-24): `bottom` — the Nose, Center and Tail cuts, the
 *    channels, and the rule a winged board measures Off Rail from — every length in millimetres. It is
 *    written only when the bottom is not the opening one (flat, no channels, Narrowest), so a board never
 *    touched on BOTTOM saves key for key as it did before the page existed, and absent reads as that
 *    opening bottom: every board saved before opens flat with nothing rewritten. It is read forgivingly,
 *    part by part: a cut whose name its section never had, a channel count that is not 0, 4, 6 or 8, a
 *    number that is not finite or could not sit on any board, reads that ONE part — the Nose, the Center,
 *    the Tail, the channels or the wing rule — as its opening value and keeps the others; a bottom that is
 *    not an object at all, or that reads as the opening one, leaves no key. So a crafted bottom never
 *    rejects the board and never crashes the rack. The bounds are outer ones, as rule 7's are — BOTTOM's
 *    sliders set the real ranges, and `resolveBottom` holds every station on the board on each read. The
 *    version stays 5, for rule 6's reason: the reader on `main` (and a rolled-back deployment) drops the
 *    unknown key, so a board saved here opens there flat — its cuts are not lost from the stored row, but
 *    a save from there would write the board back without them. No database change — the bottom lives in
 *    the `snapshot` JSON column.
 *    The channels' `angle` (D-44, the founder, 2026-11-10: an Angle on the two angled runs, "Set default by
 *    the rail and the fins toe in, but overiderable") is the one channel key that may be missing: `null`
 *    means "this run's own angle", and a board saved before the Angle slider existed has no key at all, so
 *    absent reads as `null` and every one of those boards keeps the rest of its channels untouched. A value
 *    that is not a number, not finite, or outside 0° to the slider's far end reads as `null` too — that ONE
 *    key, never the channels. The key is always there once read, so a bottom that is the opening one still
 *    compares equal to it and still leaves no key.
 *
 * Imports only from lib/geometry/*, the pure catalogue rule in `lib/blanks/catalog.ts` and the
 * validation library — never the ORM layer or the auth SDK. That keeps this file inside vitest's `lib/**\/*.test.ts` include pattern and inside Rule
 * 1's spirit: nothing database- or auth-shaped belongs beside a geometry-adjacent boundary
 * module.
 */

import { z } from "zod";
import { blankRecordShapeSchema, isPickable } from "@/lib/blanks/catalog";
import { DEFAULT_BLANK_CUT, type BlankRecord, type BoardBlank, type TipStyle } from "@/lib/geometry/blank";
import {
  MAX_CHANGES_PER_END,
  ROCKER_CHANGE_MAX_MM,
  normalizeSpec,
  prepareBoardBlank,
  type BlankRockerSpec,
} from "@/lib/geometry/custom-rocker";
import { BOARD_LENGTH_RANGE_IN, DEFAULT_BOARD_SPEC, type OutlineSpec } from "@/lib/geometry/board";
import {
  BOTTOM_CUT_NAMES,
  CHANNEL_ANGLE_MAX,
  DEFAULT_BOTTOM,
  isDefaultBottom,
  type BoardBottom,
  type BottomSectionKey,
} from "@/lib/geometry/bottom";
import {
  DEFAULT_FIN_PLACEMENT_SPEC,
  type FinPlacementSpec,
  type FinSystem,
} from "@/lib/geometry/fins";
import { DEFAULT_FOIL_SPEC, type FoilSpec } from "@/lib/geometry/foil";
import { carryPhase11Blank } from "@/lib/geometry/phase11-foil";
import {
  DEFAULT_RAIL_BAND_SPEC,
  DEFAULT_TIP_RAIL_SCALE,
  HARD_EDGE_BLENDS_FROM_RANGE_IN,
  HARD_EDGE_MIN_BLEND_IN,
  RAIL_NUDGE_KEYS,
  ZERO_RAIL_NUDGES,
  type RailBandSpec,
  type RailNudgeKey,
} from "@/lib/geometry/rail-bands";
import {
  DEFAULT_ROCKER_SPEC,
  bezierToFiveStations,
  type FiveStationRocker,
  type RockerSpec,
} from "@/lib/geometry/rocker";
import { inchesToMm, mm, type Mm } from "@/lib/geometry/units";
import { DEFAULT_VOLUME_SPEC, type VolumeSpec } from "@/lib/geometry/volume";
import { MAX_WINGS, slotWingLocks, type Wing } from "@/lib/geometry/wings";

export const DESIGN_SNAPSHOT_VERSION = 5;

const tailShapeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pin") }),
  z.object({ kind: z.literal("round") }),
  z.object({ kind: z.literal("squash"), endWidth: z.number() }),
  z.object({ kind: z.literal("diamond"), endWidth: z.number(), depth: z.number() }),
  z.object({ kind: z.literal("swallow"), endWidth: z.number(), crotchDepth: z.number() }),
]);

/**
 * The shortest board a saved board or board file can carry, in inches. Until quick 261113-si7 this
 * was half the shortest board the app made (60" / 2 = 30"); the app now makes 4'0" boards, and half
 * of THAT, 24", would put the board's centre exactly on its 12" stations (12" = 12"), where the five
 * stations no longer run in order. So the floor stays 30" by name: a board a quarter under 4'0" still
 * opens (hand-set, with no blank), and a 24" one is refused.
 */
export const SNAPSHOT_SHORTEST_IN = 30;

/**
 * The board lengths a saved board can hold at all (WR-05): shorter than `SNAPSHOT_SHORTEST_IN` or
 * more than a factor of two over the longest board the app draws (`BOARD_LENGTH_RANGE_IN`, 4'0"-12'0",
 * so up to 288") is not a board this app ever drew, and the snapshot is rejected as invalid. The
 * lower end also keeps every board long enough for its five stations to run in order (tail tip, tail
 * 12", centre, nose 12", nose tip — the centre must sit past the 12" station), which the side profile
 * needs to be drawn at all; `design-snapshot.test.ts` checks that still holds.
 */
export const SNAPSHOT_BOARD_LENGTH_MM = {
  min: inchesToMm(SNAPSHOT_SHORTEST_IN),
  max: inchesToMm(BOARD_LENGTH_RANGE_IN.max * 2),
} as const;

/** Float slack when deciding whether a saved board's length is inside the app's own range. */
const BOARD_LENGTH_TOLERANCE_MM = 1;

/**
 * Whether a board's length is inside the app's own board-length range (4'0"-12'0"), give or take a
 * millimetre of round-trip slack — the only boards the blank maths is built for. A saved board in
 * a blank whose length is outside it reopens hand-set instead (see `parseSnapshot`).
 */
export function isBoardLengthInRange(length: number): boolean {
  return (
    length >= inchesToMm(BOARD_LENGTH_RANGE_IN.min) - BOARD_LENGTH_TOLERANCE_MM &&
    length <= inchesToMm(BOARD_LENGTH_RANGE_IN.max) + BOARD_LENGTH_TOLERANCE_MM
  );
}

/**
 * One wing (rule 7). Every bound is in millimetres and generous — the sliders set the real ranges
 * (2" to the centre, 1/16" to 1" deep, a 0 to 2" run, ±3" off the fin); these only keep a stored
 * value a number the step's maths can draw. Depth must be above 0, because the step's share
 * divides by it.
 */
const wingSchema = z.object({
  station: z.number().min(0).max(SNAPSHOT_BOARD_LENGTH_MM.max),
  depth: z.number().gt(0).max(50),
  run: z.number().min(0).max(100),
  radius: z.number().min(0).max(5000),
  lock: z.enum(["front-trailing", "front-leading", "rear-trailing"]).nullable(),
  finOffset: z.number().min(-200).max(200),
});

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
  // Rule 7: strict per wing, forgiving as a whole — a malformed list reads as no wings.
  wings: z.array(wingSchema).max(MAX_WINGS).optional().catch(undefined),
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

/**
 * The furthest in from its tip a stored thinning start may sit, in mm (~16') — a generous bound,
 * far past any board's centre (Phase 14 D-24). Anything outside it, or anything that is not a
 * number, reads as Automatic rather than rejecting the board.
 */
export const BLANK_THINNING_START_MAX_MM = 5000;

/** The two thinning-start keys a blank may carry (rule 6). */
const THINNING_START_KEYS = ["noseThinningStart", "tailThinningStart"] as const;

/** The board's own copy of its blank's catalogue record (D-01): well-formed by the ONE blank shape
 * rule in `lib/blanks/catalog.ts` (`blankRecordShapeSchema` — bounded, stations strictly tail to
 * nose; the catalogue read holds every row to the same rule), and one the blank list could have
 * offered (`isPickable`). */
// The cast is the same deliberate brand bridge as rule 1: every field was just validated.
// Exported for the shaper's saved blanks (quick 261016-mkb), which keep a blank's copy the same way.
export const blankRecordSchema = blankRecordShapeSchema.refine((record) => isPickable(record as BlankRecord), {
  message: "this blank is missing a thickness the board's foil needs (not pickable)",
});

/**
 * A blank's rocker as ordered (rule 8, quick 261016-mkb): at most four changes and at most two per
 * end, each an end, an amount within ±2" and, optionally, where its bend starts in from that tip.
 * Strict here; `boardBlankSchema` reads it forgivingly, so a malformed spec reads as natural.
 */
export const blankRockerSpecSchema = z
  .object({
    changes: z
      .array(
        z.object({
          end: z.enum(["nose", "tail"]),
          amount: z.number().min(-ROCKER_CHANGE_MAX_MM).max(ROCKER_CHANGE_MAX_MM),
          fromTip: z.number().min(0).max(BLANK_THINNING_START_MAX_MM).optional(),
        }),
      )
      .max(MAX_CHANGES_PER_END * 2),
  })
  .refine(
    (spec) =>
      (["nose", "tail"] as const).every(
        (end) => spec.changes.filter((change) => change.end === end).length <= MAX_CHANGES_PER_END,
      ),
    { message: "a blank's rocker carries at most two changes per end" },
  );

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
    // Rule 6 (Phase 14 D-24): where each tip's thinning starts. A number inside the bound is kept as
    // stored; absent, malformed or out of bounds reads as Automatic and never rejects the board.
    // Independent of the cut — the refine below does not count them.
    noseThinningStart: z.number().min(0).max(BLANK_THINNING_START_MAX_MM).optional().catch(undefined),
    tailThinningStart: z.number().min(0).max(BLANK_THINNING_START_MAX_MM).optional().catch(undefined),
    // Rule 8 (quick 261016-mkb): the blank's rocker as ordered. Strict per change, forgiving as a
    // whole — malformed reads as natural and never rejects the board. Not counted by the cut refine.
    rocker: blankRockerSpecSchema.optional().catch(undefined),
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

/** Rule 10 (quick 261102-gec): the six nudges, each read forgivingly as 0, the whole object as every
 * nudge 0 when it is absent or not an object. It walks `RAIL_NUDGE_KEYS`, so plan 04's change of keys
 * (R17, R18) needed no edit here: the dome key is read with the rest, and the two retired keys, no longer
 * on the list, are stripped as unknown. */
const railMarkNudgesSchema = z
  .object(
    Object.fromEntries(RAIL_NUDGE_KEYS.map((key) => [key, z.number().catch(0)])) as Record<
      RailNudgeKey,
      z.ZodCatch<z.ZodNumber>
    >,
  )
  .catch(ZERO_RAIL_NUDGES);

/** One rail section, built from its default "Scaled from center by" (rule 10): `DEFAULT_TIP_RAIL_SCALE` on the nose and
 * tail, 1 on the centre. The three legacy keys stay required and are carried as read (PC2). */
const railSectionSpecSchema = (defaultScale: number) =>
  z.object({
    boardThickness: z.number(),
    deckPercent: z.number(),
    family: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    ratioTopPercent: z.number(),
    symmetrical: z.boolean(),
    cornerCutOffsetOverride: z.number().nullable(),
    removeCornerCut: z.boolean(),
    singleTuck: z.boolean(),
    // Rule 12 (plan 05, R22): the Sharp Bottom Tuck box — absent or not a boolean reads off.
    sharpBottomTuck: z.boolean().catch(false),
    bottomTuck3Override: z.number().nullable(),
    scaleFromCenter: z.number().catch(defaultScale),
    nudges: railMarkNudgesSchema,
  });

/**
 * Rule 13's outer bounds, in millimetres from the tail tip (D-30): the widest either setting could ever be on a
 * board the app draws. Blends From 12" to 30"; Ends At from 12" + 2" to the centre of the longest board
 * (`BOARD_LENGTH_RANGE_IN.max`). Where each actually sits on a given board — and that the two never cross — is
 * the readers' work (`hardEdgeBlendsFrom`, `hardEdgeEndsAt`), never this one's.
 */
const HARD_EDGE_BLENDS_FROM_MIN_MM = inchesToMm(HARD_EDGE_BLENDS_FROM_RANGE_IN.min);
const HARD_EDGE_BLENDS_FROM_MAX_MM = inchesToMm(HARD_EDGE_BLENDS_FROM_RANGE_IN.max);
const HARD_EDGE_ENDS_AT_MIN_MM = inchesToMm(HARD_EDGE_BLENDS_FROM_RANGE_IN.min + HARD_EDGE_MIN_BLEND_IN);
const HARD_EDGE_ENDS_AT_MAX_MM = inchesToMm(BOARD_LENGTH_RANGE_IN.max / 2);

const railBandSpecSchema = z
  .object({
    nose: railSectionSpecSchema(DEFAULT_TIP_RAIL_SCALE),
    center: railSectionSpecSchema(1),
    tail: railSectionSpecSchema(DEFAULT_TIP_RAIL_SCALE),
    tailHardEdge: z.boolean(),
    // Rule 13 (Phase 16, D-20/D-30): optional and forgiving — anything that could sit on no board at all
    // reads absent; a value that fits some board but not this one is forgiven by the readers.
    tailHardEdgeBlendsFrom: z
      .number()
      .min(HARD_EDGE_BLENDS_FROM_MIN_MM)
      .max(HARD_EDGE_BLENDS_FROM_MAX_MM)
      .optional()
      .catch(undefined),
    tailHardEdgeEndsAt: z
      .number()
      .min(HARD_EDGE_ENDS_AT_MIN_MM)
      .max(HARD_EDGE_ENDS_AT_MAX_MM)
      .optional()
      .catch(undefined),
  })
  // Rule 13: a value the reader refused leaves no key behind (not even an undefined one), so the parsed
  // rails of a board without a usable value are exactly a board without the field.
  .transform(({ tailHardEdgeBlendsFrom, tailHardEdgeEndsAt, ...rest }) => ({
    ...rest,
    ...(tailHardEdgeBlendsFrom === undefined ? {} : { tailHardEdgeBlendsFrom: mm(tailHardEdgeBlendsFrom) }),
    ...(tailHardEdgeEndsAt === undefined ? {} : { tailHardEdgeEndsAt: mm(tailHardEdgeEndsAt) }),
  }))
  // Rule 11 (fast task 190, R21): the tail's Symmetrical and Hard Edge can never both be on. A board
  // saved with both (none of the presets; a board saved before the rule could) opens with Hard Edge
  // winning and Symmetrical off — read that way, never rewritten until the shaper saves.
  .transform((rails) =>
    rails.tailHardEdge && rails.tail.symmetrical ? { ...rails, tail: { ...rails.tail, symmetrical: false } } : rails,
  );

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
  // Rule 9: absent or broken reads 0 (the template), never rejects the board.
  forwardOffRailNudge: z.number().catch(0),
  rearOffRailNudge: z.number().catch(0),
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

/*
 * The bottom (rule 14). Outer bounds only, in the wing schema's spirit: they keep a stored value a number
 * the maths can draw, and BOTTOM's own sliders set the real ranges (Off Rail to 6", Off Stringer to 9", a
 * trough to 8", depth and lift to 1/2", a channel to 4" wide, a stagger to 8"). Each bound stands clear of
 * its slider's far end, so a value a shaper really set is never read as bad. A station may be signed — a
 * Tail cut's Deepest At and the channels' Start and Deepest At are measured from the front fins — and none
 * can be further off than the longest board a snapshot holds.
 */
const bottomAcrossSchema = z.number().min(0).max(inchesToMm(12));
const bottomDepthSchema = z.number().min(0).max(inchesToMm(1));
const bottomStationSchema = z.number().min(-SNAPSHOT_BOARD_LENGTH_MM.max).max(SNAPSHOT_BOARD_LENGTH_MM.max);
const bottomSmoothnessSchema = z.number().min(0).max(100);

/** One section's cut: only that section's six names. A bad cut reads as the section's flat — a fresh copy. */
const bottomCutSchema = (section: BottomSectionKey) =>
  z
    .object({
      name: z.enum(BOTTOM_CUT_NAMES[section] as readonly string[]),
      offRail: bottomAcrossSchema,
      offStringer: bottomAcrossSchema,
      troughAt: bottomAcrossSchema,
      start: bottomStationSchema,
      deepest: bottomStationSchema,
      end: bottomStationSchema,
      depth: bottomDepthSchema,
      veeLift: bottomDepthSchema,
      smoothness: bottomSmoothnessSchema,
      closesToPoint: z.boolean(),
    })
    .catch(() => ({ ...DEFAULT_BOTTOM[section] }));

const bottomChannelsSchema = z
  .object({
    count: z.union([z.literal(0), z.literal(4), z.literal(6), z.literal(8)]),
    width: bottomAcrossSchema,
    offStringer: bottomAcrossSchema,
    startFromFins: bottomStationSchema,
    deepestFromFins: bottomStationSchema,
    end: bottomStationSchema,
    depth: bottomDepthSchema,
    smoothness: bottomSmoothnessSchema,
    run: z.enum(["parallel", "rail", "toe"]),
    // D-44: forgiving on its own, so a missing or bad angle never costs a board the rest of its channels.
    angle: z.number().min(0).max(CHANNEL_ANGLE_MAX).nullable().catch(null),
    longest: z.enum(["inner", "outer", "same"]),
    stagger: bottomAcrossSchema,
  })
  .catch(() => ({ ...DEFAULT_BOTTOM.channels }));

/** A board's bottom as stored. Each part forgives itself; anything the app never wrote is dropped. */
const bottomSchema = z.object({
  nose: bottomCutSchema("nose"),
  center: bottomCutSchema("center"),
  tail: bottomCutSchema("tail"),
  channels: bottomChannelsSchema,
  wingRule: z.enum(["narrowest", "natural"]).catch("narrowest"),
});

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
    // Rule 14: a bottom that is not one at all reads as absent rather than rejecting the board.
    bottom: bottomSchema.optional().catch(undefined),
  })
  .partial();

/** A Zod object with a numeric `version` and a `design` object mirroring the eleven snapshot
 * fields and the optional bottom (see the module doc-comment for the tolerance rules this schema
 * enforces). */
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
  /** The board's bottom (rule 14, Phase 17 D-24). Left out — never `undefined` — when the bottom is the
   * opening one: flat in all three sections, no channels, Narrowest. Read it as `bottom ?? DEFAULT_BOTTOM`. */
  bottom?: BoardBottom;
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
 * A parsed blank with any thinning-start key that read as Automatic (`undefined` — absent,
 * malformed or out of bounds) removed (rule 6), so a board on Automatic is identical, key for key,
 * to one that never had a start. Returns a new object; the parsed value is never written to.
 */
function withoutAutomaticStarts<T extends object>(blank: T): T {
  const copy = { ...blank } as Record<string, unknown>;
  for (const key of THINNING_START_KEYS) {
    if (key in copy && copy[key] === undefined) delete copy[key];
  }
  return copy as T;
}

/**
 * A parsed blank's rocker read by rule 8: a key that read as malformed (`undefined`) is removed; a
 * valid spec becomes the spec the app would have written (`normalizeSpec`, at the blank's own
 * length), and a natural one is removed too — so a board on its natural rocker is identical, key for
 * key, to one saved before custom rockers. Returns a new object; the parsed value is never written to.
 */
function withReadRocker<T extends object>(blank: T): T {
  if (!("rocker" in blank)) return blank;
  const copy = { ...blank } as Record<string, unknown>;
  const spec = copy.rocker as BlankRockerSpec | undefined;
  const lengthMm = (copy.copy as { lengthMm: Mm }).lengthMm;
  const normal = spec === undefined ? undefined : normalizeSpec(spec as BlankRockerSpec, lengthMm);
  if (!normal || normal.changes.length === 0) delete copy.rocker;
  else copy.rocker = normal;
  return copy as T;
}

/**
 * A parsed outline with a `wings` key that read as malformed (`undefined`) removed (rule 7).
 * Returns a new object only when there is something to remove.
 */
function withoutUnreadWings<T extends object>(outline: T): T {
  if (!("wings" in outline) || (outline as { wings?: unknown }).wings !== undefined) return outline;
  const copy = { ...outline } as Record<string, unknown>;
  delete copy.wings;
  return copy as T;
}

/**
 * A parsed outline's wing locks read by the slot rules (rule 7, quick 261015-hz7, D10): the legacy
 * `"front-leading"` as `"front-trailing"`, then a lock its slot may not hold as none, the station
 * kept. Returns the same outline, and the same wing objects, wherever nothing changes.
 */
function withSlotWingLocks<T extends object>(outline: T): T {
  const wings = (outline as { wings?: readonly { lock: string | null }[] }).wings;
  if (!wings) return outline;
  const legacy = wings.map((w) => (w.lock === "front-leading" ? { ...w, lock: "front-trailing" } : w)) as Wing[];
  const slotted = slotWingLocks(legacy);
  if (slotted.every((w, i) => w === wings[i])) return outline;
  return { ...outline, wings: slotted };
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

  // The outline first: an older rocker is read at the board's OWN length. Rule 7: a wings list
  // that read as malformed comes back as a present-but-undefined key (F24) — delete it, so the
  // board is key for key one that never had wings.
  // The slot locks (quick 261015-hz7) are read here too, without rewriting anything stored.
  const outline = (
    design.outline ? withSlotWingLocks(withoutUnreadWings(design.outline)) : DEFAULT_BOARD_SPEC.outline
  ) as OutlineSpec;
  const rocker: FiveStationRocker = !design.rocker
    ? bezierToFiveStations(DEFAULT_ROCKER_SPEC, outline.length)
    : isBezierV3Rocker(design.rocker)
      ? bezierToFiveStations(design.rocker as RockerSpec, outline.length)
      : (design.rocker as FiveStationRocker);

  const foil = (design.foil ?? DEFAULT_FOIL_SPEC) as FoilSpec;

  // Tolerate and migrate (WR-05): a blank on a board whose length is outside the app's own
  // range is dropped, so the board reopens hand-set rather than crashing every screen that lays
  // it on its blank (the blank maths is only built for boards in that range).
  const kept = (
    design.blank && isBoardLengthInRange(outline.length)
      ? withReadRocker(withoutAutomaticStarts(design.blank))
      : null
  ) as BoardBlank | null;

  // Rule 5: a blank with no cut is a Phase 11 blank — carry it over so its five station
  // thicknesses read what Phase 11 showed. It already passed the bounded, pickable schema, so
  // preparing it cannot throw.
  let blank = kept;
  if (kept && kept.tipStyle === undefined) {
    const carried = carryPhase11Blank(
      prepareBoardBlank(kept),
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

  // Rule 14: the bottom is kept only when it read as one AND is not the opening bottom — a stored
  // opening bottom, and one whose every part read as bad, are the same board as one with no key.
  const readBottom = design.bottom as BoardBottom | undefined;
  const bottom = readBottom !== undefined && !isDefaultBottom(readBottom) ? readBottom : undefined;

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
    // Never a present-but-undefined key: both stores spread these fields over a board's state.
    ...(bottom !== undefined ? { bottom } : {}),
  };
}
