/**
 * A blank's rocker as ordered from the maker (quick 261016-mkb, 2026-10-16) — the founder's sketch
 * 016 D ("This now looks perfect. Let's build it.").
 *
 * A shaper who orders a blank can ask the maker to bend its rocker: more lift at the nose, less at
 * the tail, starting the bend at the centre or a set number of inches in from a tip. US Blanks
 * prints that order in one notation, and the app uses it everywhere (D-01):
 *
 *     -1/4"N18" +1/8"T36" +1/8"T18"
 *
 * nose changes first, then tail; `+` adds rocker at that tip, `-` takes it away; a figure after the
 * N or T is where the bend starts, in whole inches in from that tip; no figure means the bend starts
 * at the centre; changes stack.
 *
 * The bend itself is spike 002's even bend: each change adds `amount × u²`, where `u` runs from 0 at
 * the bend point to 1 at its tip — no kink where it starts (zero slope there), the full amount
 * exactly at the tip. It is a step after the blank's own curve, never a new curve family (the
 * sketch-findings skill): the natural rocker is fitted exactly as every blank's is, and the bend is
 * added on top of it, so a blank with no changes is the very blank it always was.
 *
 * Positions along the blank are millimetres from its tail tip, 0 to the blank's length `L`; the
 * centre is `L / 2`, the app's centre everywhere else (P-6).
 *
 * Pure geometry (CLAUDE.md Rule 1): no React, browser or database import. Every length is stored in
 * millimetres (Rule 2); inches appear only through `units.ts`, and the note's formatter is the one
 * place an inch figure is shown to a Metric shaper, by the founder's decision (D-01).
 */
import type { BlankRecord, BoardBlank } from "./blank";
import { levelCurve, prepareBlank, type PreparedBlank } from "./blank-fit";
import { preparePchip } from "./pchip";
import { type Mm, inchesToMm, mm, mmToInches } from "./units";

/** One change to the blank's natural rocker, in the makers' own terms (D-01). */
export interface RockerChange {
  /** Which tip the change lifts (`+`) or lowers (`-`). */
  end: "nose" | "tail";
  /** How much the change adds at its tip — positive adds rocker, negative takes it away. */
  amount: Mm;
  /** Where the bend starts, in whole inches (as millimetres) in from that tip; absent = the centre. */
  fromTip?: Mm;
}

/** The blank's rocker as ordered. Empty = natural = every board saved before 2026-10-16. */
export interface BlankRockerSpec {
  changes: RockerChange[];
}

/** The most a single change may add or take away at its tip: 2" either way (D-05). */
export const ROCKER_CHANGE_MAX_MM: Mm = inchesToMm(2);
/** The nearest a bend may start to its tip, in whole inches (D-05). */
export const ROCKER_BEND_MIN_FROM_TIP_IN = 3;
/** At most two changes per end — a maker's two-point adjustment (D-05). */
export const MAX_CHANGES_PER_END = 2;
/**
 * The floor ignores points where a change has less than this share of its full amount — the
 * sketch's `u < 0.02` skip — because dividing by a share that small blows a harmless point up into
 * a floor that means nothing.
 */
export const ROCKER_FLOOR_SHARE = 0.02;
/** The bent curve's knot spacing and the floor's scan step: every 1/16". */
export const ROCKER_KNOT_STEP_MM: Mm = inchesToMm(1 / 16);

/** An amount this small is no change at all. */
const ZERO_AMOUNT_MM = 1e-9;
/** Two knots closer than this are one knot. */
const KNOT_MERGE_MM = 1e-6;
/** Two specs whose every field agrees within this are the same spec. */
const SAME_SPEC_MM = 1e-6;

/** True when the spec changes nothing — absent, empty, or only zero amounts. */
export function isNaturalSpec(spec?: BlankRockerSpec | null): boolean {
  return !spec || !spec.changes.some((change) => Math.abs(change.amount) >= ZERO_AMOUNT_MM);
}

/**
 * Where a change's bend starts, in millimetres from the tail tip: the centre (`L / 2`, P-6) when it
 * names no figure, `L − fromTip` for a nose change, `fromTip` for a tail change.
 */
export function bendPoint(change: RockerChange, lengthMm: Mm): number {
  if (change.fromTip === undefined) return lengthMm / 2;
  return change.end === "nose" ? lengthMm - change.fromTip : change.fromTip;
}

/** This change's share of its full amount at `x`: 0 at and inside its bend point, 1 at its tip. */
function shareAt(change: RockerChange, lengthMm: Mm, x: number): number {
  const p = bendPoint(change, lengthMm);
  if (change.end === "nose") return x > p ? (x - p) / (lengthMm - p) : 0;
  return x < p ? (p - x) / p : 0;
}

/**
 * The even bend at `x` (the sketch's `delta`, spike 002): every change adds `amount × u²` past its
 * bend point, `u` running 0 at the bend point to 1 at its tip, and the changes add — so two changes
 * stack, the first in full and the second on top of it (D-05: `+1/2"N +1/2"N18"` lifts the nose tip
 * exactly 1").
 */
export function bendAt(spec: BlankRockerSpec | undefined, lengthMm: Mm, x: number): number {
  if (!spec) return 0;
  let sum = 0;
  for (const change of spec.changes) {
    const u = shareAt(change, lengthMm, x);
    if (u > 0) sum += change.amount * u * u;
  }
  return sum;
}

/** The centre's position as a whole number of inches in from either tip (rounded down). */
function centreWholeInches(lengthMm: Mm): number {
  return Math.floor(mmToInches(mm(lengthMm / 2)) + 1e-9);
}

/** A change in whole inches from its tip, `null` for the centre — the working form of `normalizeSpec`. */
interface WorkingChange {
  amount: number;
  fromTipIn: number | null;
}

/**
 * The spec the app would have written (D-05, P-9): zero changes dropped; each amount within ±2";
 * each bend point a whole inch, at least 3" in from its tip, and at or past the centre read as the
 * centre; each end's changes ordered from the centre outward (the centre first, then the bend
 * furthest from the tip), at most two; a second change at least one inch nearer its tip than the
 * first (pulled there, never past 3" — and when the first already sits at 3", the first moves to 4");
 * nose changes before tail changes. Returns a fresh object; the input is never written to.
 */
export function normalizeSpec(spec: BlankRockerSpec | undefined, lengthMm: Mm): BlankRockerSpec {
  if (!spec) return { changes: [] };
  const centreIn = centreWholeInches(lengthMm);
  const ends: Record<"nose" | "tail", WorkingChange[]> = { nose: [], tail: [] };
  for (const change of spec.changes) {
    if (!Number.isFinite(change.amount) || Math.abs(change.amount) < ZERO_AMOUNT_MM) continue;
    if (change.end !== "nose" && change.end !== "tail") continue;
    const amount = Math.max(-ROCKER_CHANGE_MAX_MM, Math.min(ROCKER_CHANGE_MAX_MM, change.amount));
    let fromTipIn: number | null = null;
    if (change.fromTip !== undefined && Number.isFinite(change.fromTip)) {
      const whole = Math.round(mmToInches(change.fromTip));
      fromTipIn = whole >= centreIn ? null : Math.max(ROCKER_BEND_MIN_FROM_TIP_IN, whole);
    }
    ends[change.end].push({ amount, fromTipIn });
  }

  const changes: RockerChange[] = [];
  for (const end of ["nose", "tail"] as const) {
    // From the centre outward: the centre first, then the bend furthest in from the tip.
    const ordered = ends[end]
      .map((change, index) => ({ change, index }))
      .sort((a, b) => {
        const fa = a.change.fromTipIn ?? centreIn;
        const fb = b.change.fromTipIn ?? centreIn;
        return fb - fa || a.index - b.index;
      })
      .slice(0, MAX_CHANGES_PER_END)
      .map(({ change }) => ({ ...change }));
    if (ordered.length === 2) {
      const [first, second] = ordered;
      const firstIn = first.fromTipIn ?? centreIn;
      const secondIn = second.fromTipIn ?? centreIn;
      if (secondIn > firstIn - 1) {
        if (firstIn - 1 >= ROCKER_BEND_MIN_FROM_TIP_IN) {
          second.fromTipIn = firstIn - 1;
        } else {
          // P-9: the first sits at 3", so it moves to 4" and the second takes 3".
          first.fromTipIn = ROCKER_BEND_MIN_FROM_TIP_IN + 1 >= centreIn ? null : ROCKER_BEND_MIN_FROM_TIP_IN + 1;
          second.fromTipIn = ROCKER_BEND_MIN_FROM_TIP_IN;
        }
      }
    }
    for (const change of ordered) {
      changes.push(
        change.fromTipIn === null
          ? { end, amount: mm(change.amount) }
          : { end, amount: mm(change.amount), fromTip: inchesToMm(change.fromTipIn) },
      );
    }
  }
  return { changes };
}

/** Two changes agree field for field within `SAME_SPEC_MM`. */
function sameChange(a: RockerChange, b: RockerChange): boolean {
  if (a.end !== b.end || Math.abs(a.amount - b.amount) > SAME_SPEC_MM) return false;
  if (a.fromTip === undefined || b.fromTip === undefined) return a.fromTip === b.fromTip;
  return Math.abs(a.fromTip - b.fromTip) <= SAME_SPEC_MM;
}

/**
 * Whether two specs are the same rocker: both natural, or equal change for change within 1e-6 mm.
 * Given the blank's length, both are put through `normalizeSpec` first; without it they are compared
 * as written (zero changes dropped), which is right for two specs the app has already normalised.
 */
export function sameRockerSpec(a?: BlankRockerSpec | null, b?: BlankRockerSpec | null, lengthMm?: Mm): boolean {
  if (isNaturalSpec(a) && isNaturalSpec(b)) return true;
  if (isNaturalSpec(a) || isNaturalSpec(b)) return false;
  const tidy = (spec: BlankRockerSpec) =>
    lengthMm === undefined
      ? spec.changes.filter((change) => Math.abs(change.amount) >= ZERO_AMOUNT_MM)
      : normalizeSpec(spec, lengthMm).changes;
  const left = tidy(a!);
  const right = tidy(b!);
  return left.length === right.length && left.every((change, i) => sameChange(change, right[i]));
}

/** What a bent prepared blank carries beside its bent rocker (`PreparedBlank.custom`). */
export interface CustomRockerOf {
  /** The normalised spec the rocker was bent by. */
  spec: BlankRockerSpec;
  /** The blank's natural rocker, levelled — the popup's dashed line (plan 02). */
  natural: PreparedBlank["rocker"];
}

/** The natural prepared blank under a bent one (or the blank itself when it is not bent). */
export function naturalOf(prepared: PreparedBlank): PreparedBlank {
  if (!prepared.custom) return prepared;
  const { custom, ...rest } = prepared;
  return { ...rest, rocker: custom.natural };
}

/** The spec a prepared blank was bent by, or undefined for a natural blank. */
export function rockerSpecOf(prepared: PreparedBlank): BlankRockerSpec | undefined {
  return prepared.custom?.spec;
}

/**
 * The blank bent by `spec` — its rocker as ordered. The natural curve is the blank's own fitted
 * rocker; the bent curve is a real pchip through knots every 1/16", at both tips, at every station
 * the catalogue printed and at every bend point, each knot the natural curve plus the bend there.
 * It is then levelled on its own true low point by `levelCurve`, exactly as every blank is levelled
 * (P-8) — never clamped — so even a hand-made spec past a floor draws honestly.
 *
 * Measured at plan time (2026-10-16): at every printed station the curve reads exactly printed +
 * bend; between knots it stays within 5.2e-5 mm of natural + bend; it builds in 0.3–1.8 ms; the
 * crop re-level and the Bottom fine-tune scan in `boardOnBlank`, which walk `curve.xs`, behave.
 *
 * Thickness, width and record are the natural blank's very own — the fit never changes. A natural
 * spec returns the natural blank itself; bending an already-bent blank starts again from natural,
 * so bends never stack across calls.
 */
export function withCustomRocker(prepared: PreparedBlank, spec?: BlankRockerSpec | null): PreparedBlank {
  const base = naturalOf(prepared);
  const L = base.lengthMm;
  const s = normalizeSpec(spec ?? undefined, L);
  if (isNaturalSpec(s)) return base;

  // Knots: the 1/16" grid, then the knots that must read exactly (both tips, every printed station,
  // every bend point) — which win over a grid knot within 1e-6 mm of them.
  const knots: { x: number; exact: boolean }[] = [];
  for (let k = 0; k * ROCKER_KNOT_STEP_MM < L; k++) knots.push({ x: k * ROCKER_KNOT_STEP_MM, exact: k === 0 });
  knots.push({ x: L, exact: true });
  for (const station of base.record.stations) {
    if (station.fromTailMm >= 0 && station.fromTailMm <= L) knots.push({ x: station.fromTailMm, exact: true });
  }
  for (const change of s.changes) knots.push({ x: bendPoint(change, L), exact: true });
  knots.sort((a, b) => a.x - b.x || Number(b.exact) - Number(a.exact));
  const merged: { x: number; exact: boolean }[] = [];
  for (const knot of knots) {
    const last = merged[merged.length - 1];
    if (last && knot.x - last.x <= KNOT_MERGE_MM) {
      if (knot.exact && !last.exact) merged[merged.length - 1] = knot;
      continue;
    }
    merged.push(knot);
  }

  const natural = base.rocker.curve;
  const curve = preparePchip(merged.map(({ x }) => ({ x, y: natural.sample(x) + bendAt(s, L, x) })));
  return { ...base, rocker: levelCurve(curve, 0, L), custom: { spec: s, natural: base.rocker } };
}

/**
 * The ONE way a board's blank is prepared (quick 261016-mkb): its own copy of the catalogue rows,
 * fitted by `prepare` (the live `prepareBlank` unless a report asks for an older rule), then bent by
 * the rocker the board ordered. The design store, opening a saved board, the rack and summary
 * pipeline, the before-and-after rules and the scripts all go through here, so a custom rocker
 * reaches every drawing and figure the same way. Catalogue-level callers — the blank list, the
 * reports — still prepare records, because a catalogue record has no rocker of its own.
 */
export function prepareBoardBlank(
  blank: Pick<BoardBlank, "copy" | "rocker">,
  prepare: (record: BlankRecord) => PreparedBlank = prepareBlank,
): PreparedBlank {
  return withCustomRocker(prepare(blank.copy), blank.rocker);
}
