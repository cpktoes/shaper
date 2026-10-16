/**
 * One blank drawn as a small catalogue picture, for its card in ROCKER's PICK A BLANK popup and the
 * thumbnail on the BLANK button (quick 261015-ve9, sketch 015 B — the founder's pick, 2026-10-15).
 *
 * The founder wants to choose foam by looking at it, the way a shaper reads a blank catalogue page:
 * the blank's outline from above over its rocker from the side (lying flat, nose left), or standing
 * nose-up with the rocker beside it (upright). Each blank FILLS its card (D-03): one uniform scale per
 * card — never stretched — so the blank keeps its true proportion and is fitted inside a fixed-aspect
 * box (about 3.1:1 lying flat). Blanks of different lengths are therefore drawn at different scales.
 *
 * The curves are the main view's own (D-14): `prepareBlank(record)`'s `width`, `rocker` and
 * `thickness` — the square-root rule through every printed station, a 0-wide nose drawn round
 * (`round-tip.ts`, quick 261007-c3h) — sampled exactly the way the ROCKER top view samples a blank
 * (`blankOutlineStations`): an even grid plus every printed width station plus dense samples inside
 * each tip's last printed segment. The side view is the levelled bottom (its low point on the flat
 * surface) up to the deck, bottom + thickness.
 *
 * Show my board (D-04): the shaper's own board — TEMPLATE's silhouette — is placed on each blank with
 * the fit check's own mapping (`blankStationOf`, at that blank's verdict placement) and drawn dashed.
 *
 * Everything here is in art units: the box's own coordinates, about one CSS pixel per unit on a
 * 320-px flat card, so a component can write stroke widths and dashes in pixels. Blank stations `u`
 * run from the blank's tail tip (0) to its nose tip (`lengthMm`); a signed half-width `w` is positive
 * on the rail drawn up (flat) or right (upright).
 *
 * No React/browser/database import — pure geometry, unit-tested in blank-card-art.test.ts, per
 * CLAUDE.md Rule 1. Components only turn these points into paths.
 */
import { blankStationOf, type PreparedBlank } from "./blank-fit";
import { blankOutlineStations } from "./blank-top-view";
import { mm, type Mm } from "./units";

/** A drawing box: its size in art units, the padding kept clear on every side, and the gap between
 * the outline and the side view. */
export interface CardBox {
  width: number;
  height: number;
  pad: number;
  gap: number;
  /**
   * Fill the box along the blank's length and let the box's other side follow the blank (fast 162,
   * the founder 2026-10-16: "make the blanks fill the card width like the sketch"): the blank is
   * scaled to the box's length-wise room alone, and the drawing's box comes back with its
   * across-the-blank size set by the blank's own proportions — a short wide blank's drawing grows a
   * little taller instead of the blank shrinking. Absent, the blank is fitted inside the fixed box.
   */
  fillAlong?: boolean;
}

/** A card's drawing lying flat (D-02's default): about 3.1:1, one art unit about one CSS pixel on a
 * 320-px card. */
export const FLAT_CARD_BOX: CardBox = { width: 320, height: 103, pad: 4, gap: 8 };

/** A card's drawing lying flat as the popup draws it: FLAT_CARD_BOX's width and padding, the blank
 * filling the card's width, the height following the blank (fast 162). */
export const FLAT_CARD_FILL_BOX: CardBox = { ...FLAT_CARD_BOX, fillAlong: true };

/** A card's drawing standing upright, nose up (plan 02's Upright switch). */
export const UPRIGHT_CARD_BOX: CardBox = { width: 96, height: 200, pad: 3, gap: 6 };

/** The small flat drawing on the BLANK button (D-01). */
export const THUMB_BOX: CardBox = { width: 92, height: 30, pad: 1, gap: 3 };

/** How many even steps a card's outline is sampled in; the tips get their dense samples on top. */
export const CARD_ART_STEPS = 48;

export type CardPose = "flat" | "upright";

export interface ArtPoint {
  x: number;
  y: number;
}

/** Everything one blank's drawing needs, in art units. */
export interface BlankCardArt {
  pose: CardPose;
  box: CardBox;
  /** The blank's length — the station frame the mapping reads. */
  lengthMm: Mm;
  /** Art units per millimetre, the same both ways (never stretched, D-03). */
  scale: number;
  /**
   * The mapping's origin. Flat: `x` is where the nose tip sits and `y` the stringer line — a point
   * (u, w) lands at (x + (lengthMm − u)·scale, y − w·scale). Upright: `x` is the stringer line and
   * `y` where the nose tip sits — (u, w) lands at (x + w·scale, y + (lengthMm − u)·scale).
   */
  origin: ArtPoint;
  /** The blank from above, closed: one rail tail to nose, then the other nose to tail. */
  outline: ArtPoint[];
  /** The blank from the side, closed: the bottom tail to nose, then the deck nose to tail. */
  side: ArtPoint[];
  /** The measuring points, a pair (one on each rail) per printed width, at exactly half of it. */
  widthDots: ArtPoint[];
  /** The stringer, nose tip to tail tip. */
  stringer: [ArtPoint, ArtPoint];
  /** The centre mark across the outline at half the blank's length. */
  centreMark: [ArtPoint, ArtPoint];
  /** The flat surface the side view rests on — under it lying flat, beside it standing upright. */
  baseline: [ArtPoint, ArtPoint];
}

/** A corrupt width (NaN, ∞, or below zero) reads as no foam there, as the top view reads it. */
function halfWidthOf(fullWidth: number): number {
  const half = fullWidth / 2;
  return Number.isFinite(half) && half > 0 ? half : 0;
}

/** Where blank station `u` and signed half-width `w` land in the art's own units. */
export function artPointOf(art: Pick<BlankCardArt, "pose" | "lengthMm" | "scale" | "origin">, u: number, w: number): ArtPoint {
  const along = (art.lengthMm - u) * art.scale;
  return art.pose === "flat"
    ? { x: art.origin.x + along, y: art.origin.y - w * art.scale }
    : { x: art.origin.x + w * art.scale, y: art.origin.y + along };
}

/**
 * One blank's drawing for a card (D-03, D-14): the outline from above and the side view, true to
 * proportion, fitted inside `box` at one uniform scale and centred in it. Flat lies nose left with
 * the side view under the outline; upright stands nose up with the side view to the right of the
 * outline, its bottom facing the outline.
 */
export function blankCardArt(prepared: PreparedBlank, pose: CardPose, box: CardBox): BlankCardArt {
  const L = prepared.lengthMm;
  const printed = prepared.record.stations.filter((station) => station.widthMm !== null);
  const stations = blankOutlineStations(
    printed.map((station) => station.fromTailMm),
    0,
    L,
    CARD_ART_STEPS,
  );
  const samples = stations.map((u) => {
    const bottom = prepared.rocker.sample(u);
    const thickness = Math.max(0, prepared.thickness.sample(u));
    return { u, half: halfWidthOf(prepared.width.sample(u)), bottom, deck: bottom + thickness };
  });
  const hmax = samples.reduce((max, s) => Math.max(max, s.half), 0);
  const dmax = samples.reduce((max, s) => Math.max(max, s.deck), 0);
  const across = 2 * hmax + dmax;

  const alongRoom = (pose === "flat" ? box.width : box.height) - 2 * box.pad;
  const acrossRoom = (pose === "flat" ? box.height : box.width) - 2 * box.pad - box.gap;
  const scale = box.fillAlong ? alongRoom / L : Math.min(alongRoom / L, across > 0 ? acrossRoom / across : Infinity);
  // Filling along the length, the drawing's box takes its other side from the blank (fast 162).
  const acrossSize = across * scale + box.gap + 2 * box.pad;
  const drawn: CardBox = !box.fillAlong ? box : pose === "flat" ? { ...box, height: acrossSize } : { ...box, width: acrossSize };

  // Centre the blank's length along the box and the stack (outline, gap, side view) across it.
  const alongStart = ((pose === "flat" ? drawn.width : drawn.height) - L * scale) / 2;
  const acrossStart = ((pose === "flat" ? drawn.height : drawn.width) - (across * scale + box.gap)) / 2;
  const stringerAt = acrossStart + hmax * scale;
  // The flat surface: below the lower rail by the gap and the tallest deck (flat), or just past the
  // widest rail by the gap (upright, the side view growing away from the outline).
  const surface = pose === "flat" ? stringerAt + hmax * scale + box.gap + dmax * scale : stringerAt + hmax * scale + box.gap;
  const origin: ArtPoint = pose === "flat" ? { x: alongStart, y: stringerAt } : { x: stringerAt, y: alongStart };
  const art = { pose, lengthMm: L, scale, origin };
  const at = (u: number, w: number) => artPointOf(art, u, w);
  const sideAt = (u: number, h: number): ArtPoint => {
    const p = at(u, 0);
    return pose === "flat" ? { x: p.x, y: surface - h * scale } : { x: surface + h * scale, y: p.y };
  };

  const outline = [
    ...samples.map((s) => at(s.u, s.half)),
    ...samples
      .slice()
      .reverse()
      .map((s) => at(s.u, -s.half)),
  ];
  const side = [
    ...samples.map((s) => sideAt(s.u, s.bottom)),
    ...samples
      .slice()
      .reverse()
      .map((s) => sideAt(s.u, s.deck)),
  ];
  const widthDots = printed.flatMap((station) => {
    const half = station.widthMm! / 2;
    return [at(station.fromTailMm, half), at(station.fromTailMm, -half)];
  });
  const centreHalf = halfWidthOf(prepared.width.sample(L / 2));
  const baseline: [ArtPoint, ArtPoint] =
    pose === "flat"
      ? [{ x: at(L, 0).x, y: surface }, { x: at(0, 0).x, y: surface }]
      : [{ x: surface, y: at(L, 0).y }, { x: surface, y: at(0, 0).y }];

  return {
    pose,
    box: drawn,
    lengthMm: L,
    scale,
    origin,
    outline,
    side,
    widthDots,
    stringer: [at(L, 0), at(0, 0)],
    centreMark: [at(L / 2, centreHalf), at(L / 2, -centreHalf)],
    baseline,
  };
}

/**
 * The shaper's own board on this blank (D-04): TEMPLATE's silhouette (signed half-widths, as
 * `silhouette` returns them), each board station placed on the blank by the fit check's own mapping
 * (`blankStationOf` at `placement`) and drawn through the art's mapping, so the board sits on every
 * card exactly where the app would place it.
 */
export function boardOnBlankArt(
  art: BlankCardArt,
  board: { length: Mm; silhouette: readonly { station: number; w: number }[] },
  placement: Mm,
): ArtPoint[] {
  return board.silhouette.map(({ station, w }) =>
    artPointOf(art, blankStationOf(mm(station), placement, board.length, art.lengthMm), w),
  );
}
