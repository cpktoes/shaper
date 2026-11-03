/**
 * The Board Rack's turn (Phase 15 R3): each board standing on its tail, rail facing you, turning its
 * real turn to show its outline.
 *
 * The turn is worked out, not animated from pictures. Along the board the cross-section is taken as
 * an ellipse — the outline's half-width across, half the thickness deep — and projected at the turn
 * angle θ from the board's OWN numbers: its rocker and deck (`BoardSideProfile`, the very profile
 * `summarizeDesign` reads) and its outline (`buildOutline`'s points). So at 0 degrees the picture is
 * exactly the board's side profile, deck facing right; as it turns the rail swings away, the deck
 * comes round and the stringer slides from the rail edge to the centre; and at 90 degrees it is
 * exactly the TEMPLATE silhouette (`silhouette` in `screen-tiles.ts`). The formula is the one the
 * Board Rack sketches proved (`.claude/skills/sketch-findings-shaper/references/board-rack.md`,
 * "The turn maths").
 *
 * ONE rule draws every angle (quick 261103-drw). The rack used to draw 65 cross-sections and, from
 * about 89.5 degrees up, swap to the TEMPLATE silhouette — so a swallow turned with a square tail
 * and a diamond with a spike, then both jumped to the real tail at the end of the turn. Now:
 *
 * - The drawn stations (`sections`) are the 65 even stations plus the outline's own stations and the
 *   tail's closing station, so turned they ARE the TEMPLATE outline's points, and at every angle the
 *   drawing has the same points — nothing can jump.
 * - The half-width is read along the outline's own points, led by a diamond's tip (`tailAwareEdge`).
 *   `sampleOutline` can't be used here: before the outline's first point it falls back to its last
 *   point's half-width — the nose's 0 — which inside a diamond's V drew a thin spike of the tail's
 *   thickness behind a squared tail block. (`sampleOutline` itself stays as it is — the prototype's
 *   parity and the litres read it.)
 * - A swallow's tail is two pieces, each the cross-section from the notch's edge out to the rail. Seen
 *   at an angle, each piece's nearest point to the stringer is where the cut meets the ellipse's lower
 *   arc (`notchGap`); a gap shows only where that is past the stringer. So edge-on the far tail tip
 *   fills the notch, as on a real board seen from the side; the notch opens as the board turns; and
 *   at 90 degrees it is the TEMPLATE V.
 *
 * Every coordinate is in the board's own millimetres: `station` along the board from the tail, `x`
 * across it from the turning axis, positive toward the deck at rest. The turning axis sits at half
 * the board's greatest deck height (`tMid`), so the side view and the outline both stand centred.
 *
 * Pure, like everything under `lib/geometry/` (CLAUDE.md Rule 1): no React, browser or database
 * imports, so the turn can be checked against the presets in isolation.
 */

import type { BoardSideProfile } from "./board-profile";
import type { OutlineGeometry } from "./outline";
import { polylinePath, silhouette } from "./screen-tiles";
import { type Mm, mm } from "./units";

/** How many steps the rack samples along a board: 64 steps, so 65 stations tail to nose. */
export const RACK_ART_STEPS = 64;

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

/** A swallow's notch: its drawn stations from the tail to the crotch, and how far the notch's edge
 * stands from the stringer at each — the straight line from the tail's corner to the crotch. */
export interface RackNotch {
  sections: readonly RackStation[];
  edge: readonly number[];
}

/** Everything the rack needs to draw one board at any angle, in millimetres. */
export interface RackBoardArt {
  length: Mm;
  /** 65 even stations, tail (0) to nose (`length`) — the stringer's. */
  stations: readonly RackStation[];
  /** The drawn stations, tail to nose: the 65, the outline's own stations and the tail's closing
   * station, each once — from a diamond's tip (or the tail) to the nose. */
  sections: readonly RackStation[];
  /** A swallow's notch, or null for every other tail. */
  notch: RackNotch | null;
  /** Where the tail closes on the stringer: a swallow's crotch, a diamond's tip, else the tail (0). */
  closeStation: number;
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

/** One side of the outline, tail to nose, as (station, half-width): the outline's own points, led by
 * the tail's closing point when that stands behind them — a diamond's tip, the point of its V. */
function tailAwareEdge(geometry: OutlineGeometry): { station: number; w: number }[] {
  const points = geometry.points.map((p) => ({ station: p.station as number, w: p.halfWidth as number }));
  const close = geometry.centreCloseStation;
  return close < points[0].station ? [{ station: close, w: 0 }, ...points] : points;
}

/** The half-width at `station`, read along the edge's straight lines — the same arithmetic as
 * `sampleOutline` (outline.ts), so wherever the edge is the outline's own points the two agree exactly. */
function halfOnEdge(edge: readonly { station: number; w: number }[], station: number): number {
  for (let i = 0; i < edge.length - 1; i++) {
    const p0 = edge[i];
    const p1 = edge[i + 1];
    if (station >= p0.station && station <= p1.station) {
      const t = p1.station > p0.station ? (station - p0.station) / (p1.station - p0.station) : 0;
      return p0.w + (p1.w - p0.w) * t;
    }
  }
  return edge[edge.length - 1].w;
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
  const outline = silhouette(geometry);
  outline.forEach((point, i) => {
    assertFinite("outline station", point.station, i);
    assertFinite("outline half-width", point.w, i);
  });
  const edge = tailAwareEdge(geometry);
  const section = (station: Mm, i: number): RackStation => {
    const rocker = profile.rockerAt(station);
    assertFinite("rocker", rocker, i);
    const deck = profile.deckAt(station);
    assertFinite("deck", deck, i);
    const half = halfOnEdge(edge, station);
    assertFinite("half-width", half, i);
    return { station, rocker, deck, half: mm(half) };
  };

  const stations: RackStation[] = [];
  for (let i = 0; i <= steps; i++) stations.push(section(mm((length * i) / steps), i));

  // The drawn stations: the 65, the outline's own and the closing station, each once, tail to nose.
  const closeStation = geometry.centreCloseStation;
  const wanted = new Set<number>(stations.map((st) => st.station));
  for (const p of edge) wanted.add(p.station);
  wanted.add(closeStation);
  const sections = [...wanted]
    .filter((s) => s >= edge[0].station && s <= length)
    .sort((a, b) => a - b)
    .map((s, i) => section(mm(s), i));

  // A swallow: the crotch stands ahead of the outline's first point, the tail's corner.
  const corner = geometry.points[0];
  let notch: RackNotch | null = null;
  if (closeStation > corner.station) {
    const inside = sections.filter((st) => st.station <= closeStation);
    const run = closeStation - corner.station;
    notch = { sections: inside, edge: inside.map((st) => corner.halfWidth * ((closeStation - st.station) / run)) };
  }

  const maxDeck = Math.max(...sections.map((st) => st.deck));
  const maxHalf = Math.max(...sections.map((st) => st.half));
  return { length, stations, sections, notch, closeStation, tMid: maxDeck / 2, maxDeck, maxHalf, silhouette: outline };
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
 * How far from its section's centre a swallow's notch shows open at one station, turned by the angle
 * whose cosine and sine are `cos`, `sin` — positive where a gap shows, at or below 0 where the two tail
 * pieces still overlap. Each piece is the cross-section ellipse (`b` deep, `half` across) from the
 * notch's edge `a` out to the rail; projected, a point (u across, v deep) lands at u sin + v cos, which
 * rises along the ellipse's lower arc, so the piece's nearest point to the stringer is where the cut
 * meets that arc, v = -b sqrt(1 - (a / half)^2). Edge-on that lies behind the stringer (the far piece
 * fills the notch); turned it is `a` itself, the TEMPLATE V. Never past the drawn edge (`sectionHalf`).
 */
function notchGap(st: RackStation, a: number, cos: number, sin: number): number {
  const b = (st.deck - st.rocker) / 2;
  const r = st.half > 0 ? Math.min(1, a / st.half) : 1;
  return Math.min(a * sin - b * Math.sqrt(1 - r * r) * cos, sectionHalf(st, cos, sin));
}

/**
 * The points that close the tail, after the low edge (tail to nose) and the high edge (nose back to
 * the tail). Any tail but a swallow closes at one point: the middle of its end line, which turned is
 * TEMPLATE's own closing point on the stringer. A swallow closes up one inner edge of its notch to the
 * apex and back down the other — the same number of points at every angle, so nothing ever jumps:
 * stations where the pieces still overlap all sit on the apex, the straight-line crossing where the gap
 * closes, rather than drawing a slit up the middle.
 */
function closingPoints(art: RackBoardArt, cos: number, sin: number): RackPoint[] {
  const { notch } = art;
  if (!notch) return [{ station: art.closeStation, x: sectionCentre(art.sections[0], art.tMid, cos) }];
  const ns = notch.sections;
  const gap = ns.map((st, j) => notchGap(st, notch.edge[j], cos, sin));
  const centre = ns.map((st) => sectionCentre(st, art.tMid, cos));
  // At the crotch the edge is 0, so the gap there is -b cos: some station always closes it.
  let k = gap.findIndex((g) => g <= 0);
  if (k < 0) k = ns.length - 1;
  let apex: RackPoint = { station: ns[0].station, x: centre[0] };
  if (k > 0) {
    const t = gap[k - 1] / (gap[k - 1] - gap[k]);
    apex = {
      station: ns[k - 1].station + t * (ns[k].station - ns[k - 1].station),
      x: centre[k - 1] + t * (centre[k] - centre[k - 1]),
    };
  }
  const up = ns.map((st, j) => (j < k ? { station: st.station, x: centre[j] + gap[j] } : apex));
  const down = ns.map((st, j) => (j < k ? { station: st.station, x: centre[j] - gap[j] } : apex));
  return [...up, ...down.reverse()];
}

/**
 * The board's drawn outline at turn angle `theta` (radians), as a closed polygon: the low edge tail to
 * nose, the high edge nose to tail, then the points that close the tail (`closingPoints`). At rest the
 * low edge is the rocker and the high edge the deck; turned, the low edge lands at x = -w along the
 * outline's right half, so the drawing reads in the TEMPLATE silhouette's own order.
 */
export function turnedBoardPoints(art: RackBoardArt, theta: number): RackPoint[] {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const low: RackPoint[] = [];
  const high: RackPoint[] = [];
  for (const st of art.sections) {
    const xc = sectionCentre(st, art.tMid, cos);
    const ext = sectionHalf(st, cos, sin);
    low.push({ station: st.station, x: xc - ext });
    high.push({ station: st.station, x: xc + ext });
  }
  return [...low, ...high.reverse(), ...closingPoints(art, cos, sin)];
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

/** The stringer at `theta`, tail to nose: on the deck edge at rest, on the centreline turned. A
 * swallow's starts at the crotch of its notch — there is no foam to run it across the open notch. */
export function stringerPoints(art: RackBoardArt, theta: number): RackPoint[] {
  const cos = Math.cos(theta);
  const along = art.notch
    ? [art.notch.sections[art.notch.sections.length - 1], ...art.stations.filter((st) => st.station > art.closeStation)]
    : art.stations;
  return along.map(({ station, deck }) => ({ station, x: (deck - art.tMid) * cos }));
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
 * polygon — the rack asks this for every board on every frame. The points closing the tail always lie
 * between the two edges, so the edges alone decide it.
 */
export function drawnSpan(art: RackBoardArt, theta: number): { left: number; right: number } {
  let left = Infinity;
  let right = -Infinity;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  for (const st of art.sections) {
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
