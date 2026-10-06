/**
 * The Board Rack's turn (Phase 15 R3): each board standing on its tail, rail facing you, turning its
 * real turn to show its outline.
 *
 * The turn is worked out, not animated from pictures. Along the board at 65 stations (tail 0 to nose
 * at the board's length) the cross-section is taken as an ellipse — the outline's half-width across,
 * half the thickness deep — and projected at the turn angle θ from the board's OWN numbers: its
 * rocker and deck (`BoardSideProfile`, the very profile `summarizeDesign` reads) and its outline
 * (`sampleOutline`). So at 0 degrees the picture is exactly the board's side profile, deck facing
 * right; as it turns the rail swings away, the deck comes round and the stringer slides from the rail
 * edge to the centre; and from just under 90 degrees (`RACK_OUTLINE_SWITCH_RAD`) up it is exactly the
 * TEMPLATE silhouette (`silhouette` in `screen-tiles.ts`), a swallow's notch included. The formula is
 * the one the Board Rack sketches proved (`.claude/skills/sketch-findings-shaper/references/board-rack.md`,
 * "The turn maths").
 *
 * Every coordinate is in the board's own millimetres: `station` along the board from the tail, `x`
 * across it from the turning axis, positive toward the deck at rest. The turning axis sits at half
 * the board's greatest deck height (`tMid`), so the side view and the outline both stand centred.
 *
 * Pure, like everything under `lib/geometry/` (CLAUDE.md Rule 1): no React, browser or database
 * imports, so the turn can be checked against the presets in isolation.
 */

import type { BoardSideProfile } from "./board-profile";
import { sampleOutline, type OutlineGeometry } from "./outline";
import { polylinePath, silhouette } from "./screen-tiles";
import { type Mm, mm } from "./units";

/** How many steps the rack samples along a board: 64 steps, so 65 stations tail to nose. */
export const RACK_ART_STEPS = 64;

/** From this angle (about 89.5 degrees) up the board draws as its exact TEMPLATE silhouette, which
 * carries a swallow's notch the per-station ellipses can't. */
export const RACK_OUTLINE_SWITCH_RAD = 1.562;

/** The clear dots between a board's drawn left edge and the furthest-right reach of its vertical
 * words (their descenders). */
export const SPINE_ANCHOR_GAP = 4;

/** How far, as a share of the font size, a descender reaches right of the words' baseline once they
 * are turned to read tail to nose — so the baseline stands this much further left. */
export const SPINE_DESCENDER_EM = 0.25;

/** One station along the board: its bottom (rocker), its deck and its outline's half-width. */
export interface RackStation {
  station: Mm;
  rocker: Mm;
  deck: Mm;
  half: Mm;
}

/** Everything the rack needs to draw one board at any angle, in millimetres. */
export interface RackBoardArt {
  length: Mm;
  /** 65 stations, tail (0) to nose (`length`). */
  stations: readonly RackStation[];
  /** The turning axis: half the greatest deck height. */
  tMid: number;
  /** The greatest deck height along the board. */
  maxDeck: number;
  /** The outline's greatest half-width. */
  maxHalf: number;
  /** The TEMPLATE silhouette, as `screen-tiles.ts` draws it. */
  silhouette: readonly { station: number; w: number }[];
}

/** A point of a turned board: `station` along it from the tail, `x` across it from the turning axis
 * (positive toward the deck at rest), both in millimetres. */
export interface RackPoint {
  station: number;
  x: number;
}

function assertFinite(field: string, value: number, index: number): void {
  if (!Number.isFinite(value)) throw new Error(`rack art: ${field} at station ${index} is not a finite number`);
}

/**
 * A board's rack art from its own side profile and outline. Throws an `Error` naming the first
 * value that isn't a finite number, so a board whose picture can't be worked out is caught before
 * the rack draws it (WR-05).
 */
export function buildRackBoardArt(
  profile: BoardSideProfile,
  geometry: OutlineGeometry,
  steps: number = RACK_ART_STEPS,
): RackBoardArt {
  const length = profile.length;
  assertFinite("length", length, 0);
  const stations: RackStation[] = [];
  for (let i = 0; i <= steps; i++) {
    const station = mm((length * i) / steps);
    const rocker = profile.rockerAt(station);
    assertFinite("rocker", rocker, i);
    const deck = profile.deckAt(station);
    assertFinite("deck", deck, i);
    const half = sampleOutline(geometry, station);
    assertFinite("half-width", half, i);
    stations.push({ station, rocker, deck, half });
  }
  const outline = silhouette(geometry);
  outline.forEach((point, i) => {
    assertFinite("outline station", point.station, i);
    assertFinite("outline half-width", point.w, i);
  });
  const maxDeck = Math.max(...stations.map((st) => st.deck));
  const maxHalf = Math.max(...stations.map((st) => st.half));
  return { length, stations, tMid: maxDeck / 2, maxDeck, maxHalf, silhouette: outline };
}

/** Where one station's cross-section is centred across the board, turned by an angle whose cosine
 * is `cos`: halfway between its rocker and its deck, measured from the turning axis. */
function sectionCentre({ rocker, deck }: RackStation, tMid: number, cos: number): number {
  return ((rocker + deck) / 2 - tMid) * cos;
}

/** Half of one station's cross-section as it shows turned: its ellipse (half the thickness deep,
 * the outline's half-width across) projected at the angle whose cosine and sine are `cos`, `sin`. */
function sectionHalf({ rocker, deck, half }: RackStation, cos: number, sin: number): number {
  return Math.sqrt(((deck - rocker) / 2) ** 2 * cos ** 2 + half ** 2 * sin ** 2);
}

/**
 * The board's drawn outline at turn angle `theta` (radians), as a closed polygon: the right edge tail
 * to nose, then the left edge nose to tail. From `RACK_OUTLINE_SWITCH_RAD` up it is the TEMPLATE
 * silhouette itself, each half-width `w` landing at x = -w.
 */
export function turnedBoardPoints(art: RackBoardArt, theta: number): RackPoint[] {
  // `0 - w`, not `-w`: the stringer point closing the tail lands on x = 0, never a negative zero.
  if (theta >= RACK_OUTLINE_SWITCH_RAD) return art.silhouette.map(({ station, w }) => ({ station, x: 0 - w }));
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const right: RackPoint[] = [];
  const left: RackPoint[] = [];
  for (const st of art.stations) {
    const xc = sectionCentre(st, art.tMid, cos);
    const ext = sectionHalf(st, cos, sin);
    right.push({ station: st.station, x: xc + ext });
    left.push({ station: st.station, x: xc - ext });
  }
  return [...right, ...left.reverse()];
}

/** Rack millimetres to screen dots: x across from the board's axis at `cx`, stations up from the floor. */
function toScreen(points: readonly RackPoint[], scale: number, cx: number, floorY: number) {
  return points.map((p) => ({ x: cx + p.x * scale, y: floorY - p.station * scale }));
}

/** The board's outline at `theta` as an SVG path, `scale` dots per millimetre, its axis at `cx`,
 * standing on the floor at `floorY`. */
export function turnedBoardPath(art: RackBoardArt, theta: number, scale: number, cx: number, floorY: number): string {
  return polylinePath(toScreen(turnedBoardPoints(art, theta), scale, cx, floorY), true);
}

/** The stringer at `theta`, tail to nose: on the deck edge at rest, on the centreline turned. */
export function stringerPoints(art: RackBoardArt, theta: number): RackPoint[] {
  const cos = Math.cos(theta);
  return art.stations.map(({ station, deck }) => ({ station, x: (deck - art.tMid) * cos }));
}

/** The stringer at `theta` as an open SVG path, placed like `turnedBoardPath`. */
export function stringerPath(art: RackBoardArt, theta: number, scale: number, cx: number, floorY: number): string {
  return polylinePath(toScreen(stringerPoints(art, theta), scale, cx, floorY), false);
}

/**
 * How far the drawn board reaches from its axis at `theta`, on whichever side reaches further, in
 * dots — what the rack opens around a turning board: half the side view at rest, the TEMPLATE
 * outline's widest half-width turned, and in between exactly what `drawnSpan` finds. It is read off
 * the drawing rather than estimated from the board's greatest thickness and width, because part-way
 * round a board reaches further than either suggests: its cross-sections sit off the axis (thin
 * through the middle, high at the nose), which carries the drawn edge up to 3.7 dots past such an
 * estimate at about 35 degrees on the computer's rack — enough for a neighbour's words to touch it
 * (rack-room.test.ts).
 */
export function halfExtent(art: RackBoardArt, theta: number, scale: number): number {
  const { left, right } = drawnSpan(art, theta);
  return Math.max(-left, right) * scale;
}

/**
 * How far the drawn board reaches either side of its axis at `theta`, in millimetres: exactly the
 * least and greatest x of `turnedBoardPoints`, worked out from the same edges without building the
 * polygon — the rack asks this for every board on every frame.
 */
export function drawnSpan(art: RackBoardArt, theta: number): { left: number; right: number } {
  let left = Infinity;
  let right = -Infinity;
  if (theta >= RACK_OUTLINE_SWITCH_RAD) {
    for (const { w } of art.silhouette) {
      const x = 0 - w;
      if (x < left) left = x;
      if (x > right) right = x;
    }
    return { left, right };
  }
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  for (const st of art.stations) {
    const xc = sectionCentre(st, art.tMid, cos);
    const ext = sectionHalf(st, cos, sin);
    if (xc - ext < left) left = xc - ext;
    if (xc + ext > right) right = xc + ext;
  }
  return { left, right };
}

/**
 * Where a board's vertical words start, in dots from its axis: the baseline point of words turned
 * with `rotate(-90)`, whose glyphs sit to the left of it. It stands `gap` dots left of the board's
 * own drawn left edge at `theta`, less `SPINE_DESCENDER_EM` of the font size for descenders reaching
 * right of the baseline — so no word ever crosses its board (the SPEC's prohibition, R4).
 */
export function spineAnchorX(
  art: RackBoardArt,
  theta: number,
  scale: number,
  fontSize: number,
  gap: number = SPINE_ANCHOR_GAP,
): number {
  return drawnSpan(art, theta).left * scale - gap - SPINE_DESCENDER_EM * fontSize;
}
