/**
 * The tips step of Phase 14 — where each tip's thinning starts, and the steady taper from there down
 * to the tip setting.
 *
 * - **Where it starts** (D-02, D-03, D-11, D-23): each tip, nose and tail, has its own start, either
 *   Automatic or set by hand anywhere from 6" to the board's centre. Automatic is 12" unless the board
 *   cannot run down steadily from there; then it is the first half inch further in that can. It never
 *   starts nearer the tip than 12", and it reads only the planer cut, the tip setting and the board's
 *   length — never the 12" fine-tune, the Deck Skin or the Tip Style (D-04).
 * - **The steady taper** (D-01): the level planer cut exactly as it is from the start inward, and from
 *   the start to the tip one parabola that leaves the planer cut along the planer cut's own slope and
 *   lands on the tip setting:
 *   `T(d) = tip + (2·sec − m)·d + ((m − sec)/W)·d²`, `sec = (P(W) − tip)/W`,
 *   `m = max(0, min(P′(W), 2·sec))`. It replaces Phase 12's S-shaped ease.
 * - **The too-close flag** (D-05, D-21): a start set by hand is drawn exactly as set, thin spot or bend
 *   included, and flagged — `thin` when the planer cut at the start is already thinner than the tip
 *   setting, otherwise `steep` when the taper leaves the planer cut with a change of slope above 1/32" of
 *   thickness per inch of length. The flag is never a fit failure.
 *
 * Every distance `d` here is millimetres in from ONE tip (the tail's d is the board station, the nose's
 * is the length minus it). The planer cut `P` is the board's own level cut under the blank, before any
 * thinning and before any fine-tune.
 *
 * No React/browser/database import — pure geometry, tested in tip-taper.test.ts (CLAUDE.md Rule 1).
 */
import { MEASURE_STATION_MM } from "./outline";
import { inchesToMm, mm, type Mm } from "./units";

/** The grid every start sits on: half an inch, measured from the tip (UI-SPEC §3 guarantee 1). */
export const THINNING_START_STEP_MM = inchesToMm(0.5);

/** The nearest to the tip a start may be set by hand: 6" (D-02). */
export const THINNING_START_MIN_MM = inchesToMm(6);

/**
 * The sharp-bend line's threshold (D-21): a change of slope of more than 1/32" of thickness per inch of
 * length where the taper leaves the planer cut. A plain ratio, the same in both systems.
 */
export const SHARP_BEND_SLOPE = inchesToMm(1 / 32) / inchesToMm(1);

/** The slack every "can it run down steadily" comparison allows (the fit check's own 1e-6 mm). */
export const STEADY_EPSILON_MM = 1e-6;

/** The 1/8" grid the thin spot is looked for on, from the tip to the start. */
const THIN_SPOT_STEP_MM = inchesToMm(1 / 8);

/** Which tip. */
export type TipEnd = "nose" | "tail";

/**
 * Why a start set by hand is too close to the tip (D-05, D-21): a thin spot (the board's thinnest
 * thickness before any fine-tune, and how far in from the tip that is) or a sharp bend.
 */
export type TipFlag = { kind: "thin"; thinnest: Mm; at: Mm } | { kind: "steep" };

/**
 * The level planer cut seen from one tip: its thickness and its slope as functions of `d`, the distance
 * in from that tip. The slope is d(thickness)/d(d) — positive when the cut thickens going in.
 */
export interface PlanerCut {
  at(d: number): number;
  slopeAt(d: number): number;
}

/**
 * One tip's start, resolved. Named `fromTip` rather than `start`, because `BlankSideView.start` already
 * means where the blank's tail sits in board coordinates.
 */
export interface TipView {
  /** The start in force: Automatic's pick, or the hand-set value pulled inside `range`. */
  fromTip: Mm;
  /** The same point measured from the board's tail tip (board coordinates). */
  station: Mm;
  /** No hand-set start is stored for this tip (or the stored one is not a number). */
  automatic: boolean;
  /** What Automatic picks for this board right now (equals `fromTip` when `automatic`). */
  automaticStart: Mm;
  /** Whether Automatic found a start that can run down steadily (false: it fell back to 12"). */
  automaticFound: boolean;
  /** The slider's reach: 6" to half the length rounded inward to the half inch. */
  range: { min: Mm; max: Mm };
  /** The start is further in than the 12" station, so that tip's 12" numbers belong to the taper (D-07). */
  reachesStation: boolean;
  /** Null on Automatic and whenever the board runs down fine; otherwise why it is too close. */
  flag: TipFlag | null;
}

/**
 * How far a start may reach (D-02, D-11): from 6" to half the board's length rounded inward to the
 * half-inch grid, so the two tips' tapers can never overlap.
 */
export function thinningStartRange(length: Mm): { min: Mm; max: Mm } {
  return {
    min: THINNING_START_MIN_MM,
    max: mm(Math.floor(length / 2 / THINNING_START_STEP_MM + 1e-9) * THINNING_START_STEP_MM),
  };
}

/**
 * A stored start pulled inside the range on READ — nothing is written back, so lengthening a shortened
 * board brings the stored value back (the Placement precedent). A stored value under 6" reads 6". A value
 * that is not a number reads as the range's minimum (`tipView` treats one as Automatic before it gets
 * here).
 */
export function pullThinningStart(stored: number, length: Mm): Mm {
  const { min, max } = thinningStartRange(length);
  if (Number.isNaN(stored)) return min;
  return mm(Math.min(max, Math.max(min, stored)));
}

/**
 * Whether the board can run down steadily from a start `W` in from the tip (D-03, D-23): the planer cut
 * there is at least the tip setting, it is not getting thicker toward the tip, and its slope is no more
 * than twice the average slope from there to the tip — each with `STEADY_EPSILON_MM` of slack.
 */
export function canRunDownSteadily(cut: PlanerCut, tip: Mm, W: number): boolean {
  const thickness = cut.at(W);
  const slope = cut.slopeAt(W);
  const sec = (thickness - tip) / W;
  return (
    thickness >= tip - STEADY_EPSILON_MM &&
    slope >= -STEADY_EPSILON_MM &&
    slope <= 2 * sec + STEADY_EPSILON_MM
  );
}

/**
 * Automatic's start (D-03, D-23): the 12" station itself when the board can run down steadily from
 * there; otherwise the first half inch further in that can, up to the far end of the range; and if
 * none can, the 12" station again with `found: false`, quietly. Reads only the planer cut, the tip
 * setting and the length — no fine-tune, Deck Skin or Tip Style can reach it (D-04).
 */
export function automaticStart(cut: PlanerCut, tip: Mm, length: Mm): { start: Mm; found: boolean } {
  if (canRunDownSteadily(cut, tip, MEASURE_STATION_MM)) return { start: MEASURE_STATION_MM, found: true };
  const { max } = thinningStartRange(length);
  for (let k = 25; k * THINNING_START_STEP_MM <= max + 1e-9; k++) {
    const start = mm(k * THINNING_START_STEP_MM);
    if (canRunDownSteadily(cut, tip, start)) return { start, found: true };
  }
  return { start: MEASURE_STATION_MM, found: false };
}

/**
 * The steady taper from a start `W` (D-01): the planer cut itself from `W` inward, and inside `W` the
 * parabola that reads the tip setting exactly at the tip, meets the planer cut at `W` and leaves it
 * along slope `m`. When the board can run down steadily from `W` it rises steadily from the tip and is
 * never thinner than the tip setting; when it cannot (a start set by hand too close) it is drawn as is.
 */
export function steadyTaper(cut: PlanerCut, tip: Mm, W: number): (d: number) => number {
  const sec = (cut.at(W) - tip) / W;
  const m = Math.max(0, Math.min(cut.slopeAt(W), 2 * sec));
  const a = 2 * sec - m;
  const b = (m - sec) / W;
  return (d: number) => (d >= W ? cut.at(d) : tip + a * d + b * d * d);
}

/**
 * Why a start `W` set by hand is too close (D-05, D-21), or null when it is not. A thin spot wins over a
 * sharp bend: `thin` when the planer cut at `W` is thinner than the tip setting, with the lowest point of
 * `taper` on a 1/8" grid from the tip up to and including `W` (before any fine-tune, D-04); otherwise
 * `steep` when the taper's slope at `W` differs from the planer cut's by more than `SHARP_BEND_SLOPE` (a
 * planer cut getting thicker toward the tip counting as a bend by the same measure).
 */
export function tipFlag(
  cut: PlanerCut,
  tip: Mm,
  W: number,
  taper: (d: number) => number,
): TipFlag | null {
  if (canRunDownSteadily(cut, tip, W)) return null;

  const thickness = cut.at(W);
  if (thickness < tip - STEADY_EPSILON_MM) {
    let thinnest = taper(0);
    let at = 0;
    const consider = (d: number) => {
      const value = taper(d);
      if (value < thinnest) {
        thinnest = value;
        at = d;
      }
    };
    let k = 1;
    for (; k * THIN_SPOT_STEP_MM <= W; k++) consider(k * THIN_SPOT_STEP_MM);
    if ((k - 1) * THIN_SPOT_STEP_MM < W) consider(W);
    return { kind: "thin", thinnest: mm(thinnest), at: mm(at) };
  }

  const sec = (thickness - tip) / W;
  const slope = cut.slopeAt(W);
  const m = Math.max(0, Math.min(slope, 2 * sec));
  if (Math.abs(slope - m) > SHARP_BEND_SLOPE) return { kind: "steep" };
  return null;
}

/**
 * One tip resolved on its own (D-02, D-11): the start in force, the taper from it, and everything the
 * screen reads about it. A stored start that is absent or not a number reads as Automatic (D-24); any
 * other is pulled inside the range on read. On Automatic the flag is always null, and so is a hand-set
 * start on a tip whose Automatic found no steady start (the line could not truthfully say Automatic would
 * cure it, D-23).
 */
export function tipView(input: {
  cut: PlanerCut;
  tip: Mm;
  length: Mm;
  stored: number | undefined;
  end: TipEnd;
}): { view: TipView; taper: (d: number) => number } {
  const { cut, tip, length, stored, end } = input;
  const automatic = stored === undefined || !Number.isFinite(stored);
  const auto = automaticStart(cut, tip, length);
  const fromTip = automatic ? auto.start : pullThinningStart(stored, length);
  const taper = steadyTaper(cut, tip, fromTip);
  const view: TipView = {
    fromTip,
    station: end === "tail" ? fromTip : mm(length - fromTip),
    automatic,
    automaticStart: auto.start,
    automaticFound: auto.found,
    range: thinningStartRange(length),
    reachesStation: fromTip - MEASURE_STATION_MM > STEADY_EPSILON_MM,
    flag: automatic || !auto.found ? null : tipFlag(cut, tip, fromTip, taper),
  };
  return { view, taper };
}
