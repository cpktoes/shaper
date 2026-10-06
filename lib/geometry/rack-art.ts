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
  for (const { station, rocker, deck, half } of art.stations) {
    const xc = ((rocker + deck) / 2 - art.tMid) * cos;
    const ext = Math.sqrt(((deck - rocker) / 2) ** 2 * cos ** 2 + half ** 2 * sin ** 2);
    right.push({ station, x: xc + ext });
    left.push({ station, x: xc - ext });
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
 * Half the room the whole picture takes across at `theta`, in dots — a spacing figure for opening the
 * rack around a turning board: half the side view at rest, the outline's half-width turned.
 */
export function halfExtent(art: RackBoardArt, theta: number, scale: number): number {
  const side = ((art.maxDeck * scale) / 2) * Math.cos(theta);
  const outline = art.maxHalf * scale * Math.sin(theta);
  return Math.sqrt(side ** 2 + outline ** 2);
}

/** How far the drawn board reaches either side of its axis at `theta`, in millimetres. */
export function drawnSpan(art: RackBoardArt, theta: number): { left: number; right: number } {
  let left = Infinity;
  let right = -Infinity;
  for (const { x } of turnedBoardPoints(art, theta)) {
    if (x < left) left = x;
    if (x > right) right = x;
  }
  return { left, right };
}

/**
 * Where a board's vertical words start, in dots from its axis: the baseline point of words turned
 * with `rotate(-90)`, whose glyphs sit to the left of it. It stands `gap` dots left of the board's
 * own drawn left edge at `theta`, less a quarter of the font size for descenders reaching right of
 * the baseline — so no word ever crosses its board (the SPEC's prohibition, R4).
 */
export function spineAnchorX(art: RackBoardArt, theta: number, scale: number, fontSize: number, gap = 4): number {
  return drawnSpan(art, theta).left * scale - gap - 0.25 * fontSize;
}
