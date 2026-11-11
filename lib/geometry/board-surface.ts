/**
 * The 3D board's surface (Phase 16, D-05): the 3D board, the STL and VOLUME's litres are ONE surface read
 * three ways. This file never makes a cross-section of its own. It asks `boardSections` (volume.ts) for the
 * very sections the litres add up, at more stations, and only ARRANGES them: each station's finished rail
 * is placed at the outline, lifted onto the side profile's rocker, cut at the stringer (or at a swallow's
 * notch wall), and lofted to the next station into one closed triangle mesh.
 *
 * Shape3D's axes, millimetres: x along the board from the tail tip toward the nose (x = the station), y
 * across (the two rails at ±y, mirror images), z up toward the deck, z = 0 at the lowest point of the
 * bottom (the side profile's `rockerAt` is levelled that way).
 *
 * How a station becomes a ring (research Pattern 2):
 *
 * 1. `sampledFinishedRail` (finished-rail.ts) gives the station's finished rail with its rail at the
 *    section's half-width from the stringer: carried flat along the deck and the bottom if it starts
 *    outboard of the stringer (exactly the closure the litres assume), and split into deck, rail and bottom
 *    runs, each resampled by arc length to a fixed count (`SURFACE_POINTS`), so the bottom edge — a hard edge's
 *    corner, a Sharp Bottom Tuck's corner — is always the same ring index. Where the rail starts inboard of the
 *    stringer (a station narrower than its rail's bands, near a tip) the section carries a ring drawn into its
 *    room (`BoardSection.drawn`, D-34), so the stringer stays on the side profile.
 * 2. While a tip's rail blends into the centre's (the tail's between Tail Rail Blends From and Ends At, the
 *    nose's from the centre to the nose 12" mark, D-32), the section itself carries the ring
 *    (`BoardSection.blended`): the two end rails' halves sampled alike and blended point for point by the
 *    tip's weight (`blendFinishedRails`, D-20/D-27) — the very ring the litres count (D-31) — and how sharp
 *    its bottom edge is drawn (`BoardSection.sharpness`). Nothing is blended here. Near a wing (D-37) the
 *    section carries its ring too (`BoardSection.drawn`): built on the deck line the two sides share with only
 *    its rail moved onto the outline, so the deck and the flat bottom run smooth across the wing; and rings stand at
 *    each wing's own step and through the shared stretch (`surfaceStations`), so the outline steps where TEMPLATE
 *    does.
 * 3. Inside a swallow's notch the half is moved out to stand on the notch's wall (`inner`): the rail lands
 *    on the drawn curve (`outer`), the inside edge on the wall. Everywhere else `inner` is the stringer, 0.
 * 4. The half is mirrored to the other rail. Points on the stringer are shared by both sides, so the deck
 *    is one surface across the stringer.
 *
 * The tips (research Pattern 3, D-34): inside a swallow's notch each station is two pieces, each from the
 * notch's square wall out to the rail, the two walls meeting along one shared edge at the crotch; a diamond's V
 * is ordinary foam narrowing to nothing at its tip; a station with no foam is one edge from the bottom to the deck
 * at the outline's own point, so a tip ends on the side profile from the side and on the outline's point from
 * above, with no cap and no slice (the founder: "Let's not do that little flip."); a tail end with width (a square
 * or squash tail) is closed with a flat cap. On every tail the rail is carried around the end (D-38): over the last
 * inch the section's heights roll down (`tailRollDrop`), so the deck rolls over into the tail's edge, and rings crowd
 * through the roll to draw it.
 *
 * Pure (CLAUDE.md Rule 1): no React, browser, database or `three` import.
 */

import { BOARD_LENGTH_RANGE_IN } from "./board";
import { HALF_SECTION_POINT_COUNT, SECTION_POINTS, sampledFinishedRail } from "./finished-rail";
import { foilStationPoints, sampleFoil } from "./foil";
import { type OutlineGeometry, sampleOutline, tailCutStation } from "./outline";
import { hardEdgeBlendsFrom, hardEdgeEndsAt } from "./rail-bands";
import { inchesToMm, mm, mmToInches, type Mm } from "./units";
import {
  type BoardSection,
  type CrossSectionVolumeInput,
  boardSections,
  crossSectionStations,
  halfSectionPointCount,
  railCharacterDifferences,
  tailRollStations,
} from "./volume";
import { WING_HAIR_MM, wingShareSpan, wingStepShape, wingTakeAt } from "./wings";

/** A point of the surface, in millimetres, in Shape3D's axes (x along, y across, z up). */
export type Vec3 = readonly [number, number, number];

/** The loft's station spacing, in inches: no two neighbouring stations are further apart than this. */
export const SURFACE_STATION_STEP_IN = 0.5;

/**
 * How many points each run of a half-section is resampled to: the deck (inside edge to the outermost
 * point), the rail (to the bottom edge) and the bottom (back to the inside edge); and how many points
 * stand inside a swallow's notch wall between its bottom and deck corners. One fineness for the screen and
 * the files (D-26).
 */
export const SURFACE_POINTS = { ...SECTION_POINTS, wall: 4 } as const;

/** Points in one half-section on a board without channels: the three runs, sharing their two joins. A board with
 * channels has eight more, the same on every one of its rings (`halfSectionPointCount`, Phase 17, D-21). */
const HALF_POINTS = HALF_SECTION_POINT_COUNT;
/** The half-section's index of the bottom edge (the rail run's last point, the bottom run's first). */
const BOTTOM_EDGE = SURFACE_POINTS.deck + SURFACE_POINTS.rail - 2;

/**
 * What each triangle of the surface is, for the screen's normals (board-surface-render.ts): the deck and
 * rail above the bottom edge, the bottom below it, a notch wall on either side, a tip's flat cap, or a channel's
 * vertical wall (Phase 17, D-10, D-21) — which, like a notch wall, the screen always draws sharp.
 */
export const SURFACE_FACE = {
  upper: 0,
  bottom: 1,
  wallRight: 2,
  wallLeft: 3,
  capTail: 4,
  capNose: 5,
  channelWall: 6,
} as const;

/** What `buildBoardSurface` reads: the litres' own cross-section input, the outline and the rocker. */
export interface BoardSurfaceInput {
  sections: CrossSectionVolumeInput;
  geometry: OutlineGeometry;
  rockerAt: (station: Mm) => Mm;
}

/**
 * One station of the surface. Its vertices are contiguous in `positions`; each `piece` is a closed loop of
 * them, in order (one piece, or two inside a swallow's notch — the right one first), every loop turning the
 * same way, with `inner` the piece's inside edge (0 at the stringer, the notch wall's distance across
 * inside the notch). Outside the notch the first vertex of the loop is the deck's stringer point.
 * `bottomEdge` holds the bottom-edge vertex of each side as an offset from `pieces[0].first` (right, then
 * left; one entry when both sides weld to the same point). `sharpness` is how sharp the screen draws that
 * edge (its section's `sharpness`: 1 where both ends of a blend are sharp, the sharp end's share where one
 * is, D-32); `isSlice` marks the litres' own stations. `right` and `left` are the two half-sections' vertices
 * point for point (`HALF_SECTION_POINT_COUNT` each, inside edge on the deck round the rail to the inside edge on the
 * bottom), the same slot on every ring, so a loft line between two rings runs along the mesh's own edges. `walls` is
 * each side's notch wall, bottom corner to deck corner, the same heights by slot on every ring inside the notch and at
 * the crotch, null everywhere else. `wingTake` is how much the wings have cut the outline in at this station, 0 on a board
 * with none: the wire view reads it, and it places nothing.
 */
export interface SurfaceRing {
  station: Mm;
  pieces: { first: number; count: number; inner: Mm }[];
  bottomEdge: number[];
  sharpness: number;
  walls: { right: number[]; left: number[] } | null;
  isSlice: boolean;
  right: number[];
  left: number[];
  wingTake: Mm;
}

/**
 * The closed surface. `positions` is x, y, z per vertex; `indices` three vertex indices per triangle,
 * wound so every face points out of the foam; `faceKinds` one `SURFACE_FACE` value per triangle. `width` is the board's
 * full width at its wide point, the figure a shaper quotes it by.
 */
export interface BoardSurface {
  positions: Float64Array;
  indices: Uint32Array;
  faceKinds: Uint8Array;
  rings: SurfaceRing[];
  length: Mm;
  width: Mm;
  triangleCount: number;
  /**
   * The rows of a ring (counted from the deck's stringer point, as `right` is) that are the top of a channel wall, the
   * wall's foot being the next row down; the same rows on every ring of the board, innermost wall first, empty on a board
   * without channels (quick 261110-veo: the board file keeps each wall's two points under fixed numbers).
   */
  channelWallRows: number[];
}

type P2 = [number, number];

/** Rings each way through the stretch a wing's two sides share (D-37), so its short ease isn't straddled. */
const WING_SHARE_RINGS = 12;

/** Rings through the tail's roll (D-38), enough that its curve reads as one curve. */
const TAIL_ROLL_RINGS = 14;

/** Stations closer than this are one station. */
const SAME_STATION_MM = 1e-6;

function assertFinite(field: string, value: number, station: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`3D board: ${field} at station ${station} mm is not a finite number`);
  }
}

/**
 * Where the surface takes a ring, tail to nose: the litres' own stations (so every slice the files carry
 * is a ring of the drawn mesh, D-24), both 12" stations, the centre, the tail cut's corner and — whenever the
 * tail's rail differs from the centre's (D-32; every hard-edged tail among them) — where its blend begins and
 * ends (D-30), at each wing's own step (D-33: every point of the step, or a hair either side of a square step's one
 * station, which has two widths) and every twelfth of the way through the stretch the wing's two sides share (D-37)
 * and through the tail's roll (D-38) — filled in so no two neighbours are more than
 * `SURFACE_STATION_STEP_IN` apart (the board split evenly). Stations closer than a millionth of a
 * millimetre are one, and the litres' own value is the one kept.
 */
export function surfaceStations(input: BoardSurfaceInput): Mm[] {
  const { length, foil, rails } = input.sections;
  const cut = tailCutStation(input.geometry);
  const required: number[] = [...crossSectionStations(length, cut)];
  const anchors = foilStationPoints(foil, length);
  const inside = (s: number) => s > 0 && s < length;
  for (const s of [anchors[1].station, anchors[2].station, anchors[3].station, cut]) {
    if (inside(s)) required.push(s);
  }
  if (railCharacterDifferences(rails, "tail").length > 0) {
    // Both ends of the tail's blend (D-30, D-32): where it begins and where the rail is the centre's.
    for (const s of [hardEdgeBlendsFrom(rails, length), hardEdgeEndsAt(rails, length)]) {
      if (inside(s)) required.push(s);
    }
  }
  for (const wing of input.geometry.wings ?? []) {
    const { points } = wingStepShape(wing);
    points.forEach((point, i) => {
      // Two step points at one station with different depths: a square step, two widths at one spot.
      const square = points.some(
        (other, j) => j !== i && Math.abs(other.station - point.station) < SAME_STATION_MM && other.inward !== point.inward,
      );
      for (const s of square ? [point.station - WING_HAIR_MM, point.station + WING_HAIR_MM] : [point.station]) {
        if (inside(s)) required.push(s);
      }
    });
    const { middle, reach } = wingShareSpan(wing);
    for (let k = -WING_SHARE_RINGS; k <= WING_SHARE_RINGS; k++) {
      const s = middle + (k * reach) / WING_SHARE_RINGS;
      if (inside(s)) required.push(s);
    }
  }
  required.push(...tailRollStations(TAIL_ROLL_RINGS).slice(1));
  const kept: number[] = [];
  const keep = (s: number) => {
    if (!kept.some((k) => Math.abs(k - s) < SAME_STATION_MM)) kept.push(s);
  };
  required.forEach(keep);
  const panels = Math.max(2, Math.ceil(length / inchesToMm(SURFACE_STATION_STEP_IN)));
  for (let i = 0; i <= panels; i++) keep((i * length) / panels);
  return kept.sort((a, b) => a - b).map(mm);
}

/**
 * A tip with no width as a half-section (D-34): one edge at `outer`, the deck run's points on the side profile's
 * deck, the rail run's stepping down to the bottom and the bottom run's on the bottom. The rail run stands on the
 * notch wall's own heights (`thickness × k / (wall + 1)`), so a swallow's point shares one set of vertices
 * between its rail and its wall and the skin stays closed. `ringLength` is the board's own (`halfSectionPointCount`):
 * a board with channels has a longer bottom run, so its tip edges do too.
 */
function tipEdge(outer: number, thickness: number, ringLength: number): P2[] {
  const { deck, rail, wall } = SURFACE_POINTS;
  const bottom = ringLength - deck - rail + 2;
  const levels = wall + 1;
  const edge: P2[] = [];
  for (let j = 0; j < deck; j++) edge.push([outer, thickness]);
  for (let j = 1; j < rail; j++) edge.push([outer, (thickness * Math.round((1 - j / (rail - 1)) * levels)) / levels]);
  for (let j = 1; j < bottom; j++) edge.push([outer, 0]);
  return edge;
}

/**
 * One station's half-section as the surface lays it (`ringLength` points — the board's own, `HALF_SECTION_POINT_COUNT`
 * unless it has channels — inside edge on the deck round the rail to the inside edge on the bottom; distance across
 * from the stringer, height above the bottom): the section's own sampled finished rail (`sampledFinishedRail`), or
 * the very ring the litres count — near a wing (`BoardSection.drawn`, D-37), inside a tip's blend
 * (`BoardSection.blended`, D-31, D-32), with its bottom cut (Phase 17) — moved out by `inner` so its inside edge
 * stands on a swallow's notch wall (0 everywhere else). Nothing is sampled or blended here that the litres don't read.
 * A section with no foam is the tip's own edge at `outer` (`tipEdge`).
 */
export function placedHalfSection(section: BoardSection, outer: number, inner: number, ringLength: number = HALF_POINTS): [number, number][] {
  if (!section.result || section.halfWidth <= 0) return tipEdge(outer, section.thickness * (section.rollScale ?? 1), ringLength);
  const half = section.drawn ?? section.blended ?? sampledFinishedRail(section.result, section.domed, section.halfWidth);
  return half.map(([y, h]) => [inner + y, h] as P2);
}

/** The area a half-section encloses, its points closed back along the stringer (the shoelace sum), in mm². */
function halfPolygonArea(half: readonly P2[]): number {
  let twice = 0;
  for (let k = 0; k < half.length; k++) {
    const [y0, h0] = half[k];
    const [y1, h1] = half[(k + 1) % half.length];
    twice += y0 * h1 - y1 * h0;
  }
  return twice / 2;
}

/** A position's key for welding the points of one ring that land on the same spot. */
function weldKey(y: number, z: number): string {
  return `${Math.round(y * 1e6) + 0},${Math.round(z * 1e6) + 0}`;
}

interface RingSlots {
  right: number[];
  left: number[];
  wallRight: number[] | null;
  wallLeft: number[] | null;
}

/**
 * The board's closed surface (D-05): the litres' own sections, at `surfaceStations`, lofted along the
 * rocker. Refuses, naming the value, a board whose length is outside `BOARD_LENGTH_RANGE_IN` or any value
 * that is not a finite number — nothing is half-built.
 */
export function buildBoardSurface(input: BoardSurfaceInput): BoardSurface {
  const { sections: sectionInput, geometry, rockerAt } = input;
  const length = sectionInput.length;
  assertFinite("the length", length, 0);
  if (length < inchesToMm(BOARD_LENGTH_RANGE_IN.min) || length > inchesToMm(BOARD_LENGTH_RANGE_IN.max)) {
    throw new Error(
      `3D board: the length ${length} mm is outside ${BOARD_LENGTH_RANGE_IN.min}"–${BOARD_LENGTH_RANGE_IN.max}"`,
    );
  }

  const stations = surfaceStations(input);
  const thicknessAt =
    sectionInput.thicknessAt ?? ((station: Mm) => sampleFoil(sectionInput.foil, length, station));
  for (const s of stations) {
    assertFinite("the station", s, s);
    assertFinite("the width", sectionInput.halfWidthAt(s), s);
    assertFinite("the thickness", thicknessAt(s), s);
    assertFinite("the rocker", rockerAt(s), s);
  }

  const sections = boardSections(sectionInput, stations);
  const slices = new Set<number>(crossSectionStations(length, sectionInput.cutStation ?? mm(0)));
  const first = geometry.points[0];
  const close = geometry.centreCloseStation;
  const swallow = close > first.station;
  // The board's own ring length, the same on every ring and tip edge (Phase 17, D-21): the usual count, or eight more
  // on a board with channels — and the rows of the ring whose faces are the channels' vertical walls, the same rows on
  // every ring of it.
  const ringLength = halfSectionPointCount(sectionInput);
  const channelWallRows = new Set(sections.find((section) => section.wallRows)?.wallRows ?? []);

  // Each station's two half-sections placed at the outline.
  const placed = sections.map((section) => {
    const s = section.station;
    const inNotch = swallow && s < close;
    const outer = inNotch ? sampleOutline(geometry, s) : section.halfWidth;
    const inner = inNotch ? Math.max(0, outer - section.halfWidth) : 0;
    const half = placedHalfSection(section, outer, inner, ringLength);
    if (half.length !== ringLength) throw new Error(`3D board: a ring of ${half.length} points at ${s} mm on a board whose rings have ${ringLength}`);
    const z0 = rockerAt(s);
    for (const [y, h] of half) {
      assertFinite("a surface point's distance across", y, s);
      assertFinite("a surface point's height", h, s);
    }
    return { section, inner, half, z0 };
  });

  const positions: number[] = [];
  const rings: SurfaceRing[] = [];
  const slots: RingSlots[] = [];
  const W = SURFACE_POINTS.wall;

  placed.forEach(({ section, inner, half, z0 }, i) => {
    const s = section.station;
    const notch = inner > 0;
    const besideNotch = !notch && ((placed[i - 1]?.inner ?? 0) > 0 || (placed[i + 1]?.inner ?? 0) > 0);
    const weld = new Map<string, number>();
    let allocated = 0;
    const vertex = (y: number, h: number): number => {
      const z = z0 + h;
      const key = weldKey(y, z);
      const hit = weld.get(key);
      if (hit !== undefined) return hit;
      const index = positions.length / 3;
      positions.push(s, y, z);
      weld.set(key, index);
      allocated++;
      return index;
    };
    const last = ringLength - 1;
    const right: number[] = new Array(ringLength);
    const left: number[] = new Array(ringLength);
    const wallPoint = (side: 1 | -1, j: number): P2 => {
      const bottom = half[last];
      const top = half[0];
      const t = j / (W + 1);
      return [side * (bottom[0] + (top[0] - bottom[0]) * t), bottom[1] + (top[1] - bottom[1]) * t];
    };
    const pieces: SurfaceRing["pieces"] = [];
    let wallRight: number[] | null = null;
    let wallLeft: number[] | null = null;

    if (!notch) {
      const start = positions.length / 3;
      const before = allocated;
      for (let j = 0; j < ringLength; j++) right[j] = vertex(half[j][0], half[j][1]);
      left[last] = vertex(-half[last][0], half[last][1]);
      for (let j = last - 1; j >= 1; j--) left[j] = vertex(-half[j][0], half[j][1]);
      left[0] = vertex(-half[0][0], half[0][1]);
      pieces.push({ first: start, count: allocated - before, inner: mm(0) });
      if (besideNotch) {
        // The crotch: both walls come to the stringer and share its points, bottom to deck.
        wallRight = new Array(W + 2);
        wallRight[0] = right[last];
        wallRight[W + 1] = right[0];
        for (let j = 1; j <= W; j++) {
          const [y, h] = wallPoint(1, j);
          wallRight[j] = vertex(y, h);
        }
        wallLeft = wallRight.slice();
      }
    } else {
      // Right piece: deck from the wall, round the rail, along the bottom to the wall, up the wall.
      let start = positions.length / 3;
      let before = allocated;
      for (let j = 0; j < ringLength; j++) right[j] = vertex(half[j][0], half[j][1]);
      wallRight = new Array(W + 2);
      wallRight[0] = right[last];
      wallRight[W + 1] = right[0];
      for (let j = 1; j <= W; j++) {
        const [y, h] = wallPoint(1, j);
        wallRight[j] = vertex(y, h);
      }
      pieces.push({ first: start, count: allocated - before, inner: mm(inner) });
      // Left piece, the mirror walked the same way round: down the wall, along the bottom, round the rail.
      start = positions.length / 3;
      before = allocated;
      left[0] = vertex(-half[0][0], half[0][1]);
      wallLeft = new Array(W + 2);
      wallLeft[W + 1] = left[0];
      for (let j = W; j >= 1; j--) {
        const [y, h] = wallPoint(-1, j);
        wallLeft[j] = vertex(y, h);
      }
      left[last] = vertex(-half[last][0], half[last][1]);
      wallLeft[0] = left[last];
      for (let j = last - 1; j >= 1; j--) left[j] = vertex(-half[j][0], half[j][1]);
      pieces.push({ first: start, count: allocated - before, inner: mm(inner) });
    }

    const base = pieces[0].first;
    const bottomEdge = [...new Set([right[BOTTOM_EDGE] - base, left[BOTTOM_EDGE] - base])];
    rings.push({
      station: s,
      pieces,
      bottomEdge,
      sharpness: section.sharpness,
      walls: wallRight && wallLeft ? { right: wallRight, left: wallLeft } : null,
      isSlice: slices.has(s),
      right,
      left,
      wingTake: wingTakeAt(geometry, s),
    });
    slots.push({ right, left, wallRight, wallLeft });
  });

  const indices: number[] = [];
  const kinds: number[] = [];
  const tri = (a: number, b: number, c: number, kind: number) => {
    if (a === b || b === c || a === c) return; // a welded point: no triangle
    indices.push(a, b, c);
    kinds.push(kind);
  };
  // a, b along ring i; c, d the same two slots on ring i + 1.
  const quad = (a: number, b: number, c: number, d: number, kind: number) => {
    tri(a, c, b, kind);
    tri(b, c, d, kind);
  };

  // Where the bottom cuts a swallow's prong right through (Phase 17, D-40: the foam ends where the lifted bottom meets
  // the deck), a ring's half closes up into one point. From the ring beside it with foam the loft is a cone that closes
  // there; between that point and the prong's own tip edge — a line with no width — there is no foam at all, and the
  // rail's strip and the notch wall's would lay the same triangles twice, so nothing is drawn between them.
  const flatHalf = placed.map(({ half }) => Math.abs(halfPolygonArea(half)) < 1e-9);
  const pole = slots.map((slot) => slot.right.every((v) => v === slot.right[0]) && slot.left.every((v) => v === slot.left[0]));
  for (let i = 0; i < rings.length - 1; i++) {
    const A = slots[i];
    const B = slots[i + 1];
    if (flatHalf[i] && flatHalf[i + 1] && (pole[i] || pole[i + 1])) continue;
    for (let j = 0; j < ringLength - 1; j++) {
      const kind = j < BOTTOM_EDGE ? SURFACE_FACE.upper : channelWallRows.has(j) ? SURFACE_FACE.channelWall : SURFACE_FACE.bottom;
      quad(A.right[j], A.right[j + 1], B.right[j], B.right[j + 1], kind);
      quad(A.left[j + 1], A.left[j], B.left[j + 1], B.left[j], kind);
    }
    if (A.wallRight && B.wallRight && A.wallLeft && B.wallLeft) {
      for (let j = 0; j <= W; j++) {
        quad(A.wallRight[j], A.wallRight[j + 1], B.wallRight[j], B.wallRight[j + 1], SURFACE_FACE.wallRight);
        quad(A.wallLeft[j + 1], A.wallLeft[j], B.wallLeft[j + 1], B.wallLeft[j], SURFACE_FACE.wallLeft);
      }
    }
  }

  // The two ends: a flat fan from each end piece's centre, when the piece has width (a tip's edge has none).
  const cap = (ring: SurfaceRing, nose: boolean) => {
    for (const piece of ring.pieces) {
      if (piece.count < 3 || !pieceHasWidth(positions, piece)) continue;
      let cy = 0;
      let cz = 0;
      for (let k = 0; k < piece.count; k++) {
        cy += positions[3 * (piece.first + k) + 1];
        cz += positions[3 * (piece.first + k) + 2];
      }
      const centre = positions.length / 3;
      positions.push(ring.station, cy / piece.count, cz / piece.count);
      for (let k = 0; k < piece.count; k++) {
        const a = piece.first + k;
        const b = piece.first + ((k + 1) % piece.count);
        if (nose) tri(centre, b, a, SURFACE_FACE.capNose);
        else tri(centre, a, b, SURFACE_FACE.capTail);
      }
    }
  };
  cap(rings[0], false);
  cap(rings[rings.length - 1], true);

  return {
    positions: Float64Array.from(positions),
    indices: Uint32Array.from(indices),
    faceKinds: Uint8Array.from(kinds),
    rings,
    length: mm(length),
    width: mm(2 * geometry.halfWidePointWidth),
    triangleCount: indices.length / 3,
    channelWallRows: [...channelWallRows].sort((a, b) => b - a),
  };
}

/** The volume a closed, outward-wound mesh holds, in cubic millimetres: Σ a·(b×c)/6 over its triangles. */
export function enclosedVolumeMm3(mesh: { positions: ArrayLike<number>; indices: ArrayLike<number> }): number {
  const p = mesh.positions;
  const ix = mesh.indices;
  let v = 0;
  for (let t = 0; t < ix.length; t += 3) {
    const a = 3 * ix[t];
    const b = 3 * ix[t + 1];
    const c = 3 * ix[t + 2];
    v +=
      p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) -
      p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) +
      p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  return v / 6;
}

/**
 * Whether a mesh is one closed skin: `openEdges` counts edges in only one triangle, `nonManifoldEdges`
 * edges in more than two, `misWoundEdges` edges two triangles run the same way (inconsistent winding), and
 * `zeroAreaTriangles` triangles with (next to) no area. All four are 0 for a watertight surface.
 */
export function meshCheck(mesh: { positions: ArrayLike<number>; indices: ArrayLike<number> }): {
  openEdges: number;
  nonManifoldEdges: number;
  misWoundEdges: number;
  zeroAreaTriangles: number;
} {
  const p = mesh.positions;
  const ix = mesh.indices;
  const n = p.length / 3;
  const undirected = new Map<number, number>();
  const directed = new Map<number, number>();
  let zeroAreaTriangles = 0;
  for (let t = 0; t < ix.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = ix[t + e];
      const b = ix[t + ((e + 1) % 3)];
      const u = a < b ? a * n + b : b * n + a;
      undirected.set(u, (undirected.get(u) ?? 0) + 1);
      const d = a * n + b;
      directed.set(d, (directed.get(d) ?? 0) + 1);
    }
    const a = 3 * ix[t];
    const b = 3 * ix[t + 1];
    const c = 3 * ix[t + 2];
    const ux = p[b] - p[a];
    const uy = p[b + 1] - p[a + 1];
    const uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a];
    const vy = p[c + 1] - p[a + 1];
    const vz = p[c + 2] - p[a + 2];
    const area = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
    if (area < 1e-10) zeroAreaTriangles++;
  }
  let openEdges = 0;
  let nonManifoldEdges = 0;
  for (const count of undirected.values()) {
    if (count === 1) openEdges++;
    else if (count > 2) nonManifoldEdges++;
  }
  let misWoundEdges = 0;
  for (const count of directed.values()) if (count > 1) misWoundEdges++;
  return { openEdges, nonManifoldEdges, misWoundEdges, zeroAreaTriangles };
}

/** How far apart the wire view's rings stand along the board, in inches (D-42: "one per 1.5in crosssections"). */
export const WIRE_RING_STEP_IN = 1.5;
/** How many inches of the board's width each long line takes (D-42: "1 per inch of center width lengthwise"). */
export const WIRE_LINE_SPACING_IN = 1;

/** The wire view's drawing (D-42), every point in the surface's own axes and on its skin. */
export interface WireLines {
  /** Where the rings stand, tail to nose. */
  ringStations: Mm[];
  /** Each a closed loop round a ring: one per station, or one for each piece inside a swallow's notch. */
  rings: Vec3[][];
  /** The long lines on the deck, one point per surface ring, tail to nose. */
  deck: Vec3[][];
  /** The long lines on the bottom, the same way. */
  bottom: Vec3[][];
  /** One closed loop along the rail's apex, right round the board: the CNC outline file's, but for a swallow's notch. */
  outline: Vec3[];
}

/** A point part way from `a` to `b`. */
function between(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** A half-section's vertices part way from one ring to the next: each on the mesh's own edge between the two. */
function halfBetween(positions: Float64Array, a: readonly number[], b: readonly number[], t: number): Vec3[] {
  return a.map((v, j) => between(pointAt(positions, v), pointAt(positions, b[j]), t));
}

/** Drops a point that repeats the one before it, and a last one that repeats the first: this is a closed loop. */
function loopWithoutRepeats(points: Vec3[]): Vec3[] {
  const same = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-9;
  const out = points.filter((p, i) => i === 0 || !same(p, points[i - 1]));
  while (out.length > 1 && same(out[out.length - 1], out[0])) out.pop();
  return out;
}

/**
 * The point at `share` of a half-section's run from its inside edge across the board: 0 at the inside edge (the stringer,
 * or a notch's wall), 1 at the outline without its wings, `wingTake` past the rail's apex. `run` is the run's vertices,
 * inside edge first; the point lies on the edge between two of them. A line asking for more than the run has stops at the
 * rail, so it never stands in the air of a wing's step. A tip with no width answers with its own end of the run.
 */
function pointAcrossRun(positions: Float64Array, run: readonly number[], share: number, wingTake: number): Vec3 {
  const across = (i: number) => Math.abs(positions[3 * run[i] + 1]);
  const target = across(0) + share * (across(run.length - 1) + wingTake - across(0));
  for (let i = 0; i + 1 < run.length; i++) {
    const [from, to] = [across(i), across(i + 1)];
    if (to < target) continue;
    const t = to > from ? Math.max(0, (target - from) / (to - from)) : 0;
    return between(pointAt(positions, run[i]), pointAt(positions, run[i + 1]), t);
  }
  return pointAt(positions, run[run.length - 1]);
}

/**
 * The board drawn in very thin black lines (D-42, the founder's Shape3D view): a ring across it every `WIRE_RING_STEP_IN`, as many
 * as whole steps fit the length, standing evenly about its middle so none falls on a tip; on the deck and again on the
 * bottom, one long line per `WIRE_LINE_SPACING_IN` of its width, counted in whole inches rounded down ("a 20.5\"
 * wide board still gets 20 bands on the deck and 20 on the bottom"); and one outline loop at the rail's apex.
 *
 * A long line holds one share of the half-width at every ring, so it runs out toward the rail where the board widens
 * and the lines fan into each tip. The half-width is the outline's without its wings (the founder: "I'd like to use this
 * to identify contours"): a wing cuts the rail in, not the foam behind it, so a line runs straight across the wing's
 * station and only a real contour bends it, such as the blend a wing shares with the rail, which a line near the rail
 * shows. An outer line that would stand past the cut-in rail stops at the rail. Inside a swallow's notch the share is of
 * each piece, wall to rail, so each piece gets its own lines and none stands in the notch's air. A ring between two of
 * the surface's own rings is worked out along the mesh's edges between them. So every point lies on the surface.
 */
export function wireLines(surface: BoardSurface): WireLines {
  const { positions, rings, length, width } = surface;
  const step = inchesToMm(WIRE_RING_STEP_IN);
  const ringCount = Math.floor(mmToInches(length) / WIRE_RING_STEP_IN);
  const firstRing = (length - (ringCount - 1) * step) / 2;
  const ringStations = Array.from({ length: ringCount }, (_, i) => mm(firstRing + i * step));

  const loops: Vec3[][] = [];
  let next = 1;
  for (const station of ringStations) {
    while (next < rings.length - 1 && rings[next].station < station) next++;
    const [a, b] = [rings[next - 1], rings[next]];
    const t = (station - a.station) / (b.station - a.station);
    const right = halfBetween(positions, a.right, b.right, t);
    const left = halfBetween(positions, a.left, b.left, t);
    if (a.pieces.length === 2 || b.pieces.length === 2) loops.push(loopWithoutRepeats(right), loopWithoutRepeats(left));
    else loops.push(loopWithoutRepeats([...right, ...left.reverse()]));
  }

  // Evenly across the whole width, each line in the middle of its own inch: the signed share of the half-width.
  const lineCount = Math.floor(mmToInches(width) / WIRE_LINE_SPACING_IN + 1e-9);
  const shares = Array.from({ length: lineCount }, (_, k) => (2 * k + 1) / lineCount - 1);
  const apex = SURFACE_POINTS.deck - 1;
  const face = (runOf: (half: readonly number[]) => number[]): Vec3[][] => {
    const lineOn = (share: number, side: "right" | "left", along: readonly SurfaceRing[]) =>
      along.map((ring) => pointAcrossRun(positions, runOf(ring[side]), Math.abs(share), ring.wingTake));
    const lines = shares.map((share) => lineOn(share, share < 0 ? "left" : "right", rings));
    // A line down the stringer stands on the right piece's wall in a notch; the left piece's wall gets its own.
    const lastNotch = rings.findLastIndex((ring) => ring.pieces.length === 2);
    if (lastNotch >= 0 && shares.includes(0)) lines.push(lineOn(0, "left", rings.slice(0, lastNotch + 2)));
    return lines;
  };
  return {
    ringStations,
    rings: loops,
    deck: face((half) => half.slice(0, apex + 1)),
    bottom: face((half) => half.slice(apex).reverse()),
    outline: boardOutlineLoop(surface),
  };
}

/** The wire view as line segments, two ends to a segment and x, y, z to an end: what the screen hands the drawing. */
export function wireSegments(wire: WireLines): Float32Array {
  const ends: number[] = [];
  const segment = (a: Vec3, b: Vec3) => ends.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  const closed = (loop: readonly Vec3[]) => loop.forEach((p, i) => segment(p, loop[(i + 1) % loop.length]));
  const open = (line: readonly Vec3[]) => line.slice(1).forEach((p, i) => segment(line[i], p));
  wire.rings.forEach(closed);
  wire.deck.forEach(open);
  wire.bottom.forEach(open);
  closed(wire.outline);
  return Float32Array.from(ends);
}

/** A vertex of the surface as a point. */
function pointAt(positions: Float64Array, v: number): Vec3 {
  return [positions[3 * v], positions[3 * v + 1], positions[3 * v + 2]];
}

/** Whether a ring's piece spans any distance across: a tip with no width is one edge and does not (D-34). */
function pieceHasWidth(positions: ArrayLike<number>, piece: SurfaceRing["pieces"][number]): boolean {
  let least = Infinity;
  let most = -Infinity;
  for (let k = 0; k < piece.count; k++) {
    const y = positions[3 * (piece.first + k) + 1];
    least = Math.min(least, y);
    most = Math.max(most, y);
  }
  return most - least > 1e-9;
}

/** The vertices of one piece of a ring, in loop order. */
export function pieceVertices(piece: SurfaceRing["pieces"][number]): number[] {
  return Array.from({ length: piece.count }, (_, k) => piece.first + k);
}

/**
 * The vertex of `vertices` furthest along `axis` (1 across, 2 up) in the direction `sign`; between two
 * level within a millionth of a millimetre, the one nearer the stringer, then the higher, then the first in
 * loop order. The higher comes before loop order so the two rails choose alike: a hard edge's rail stands
 * straight up, every point of that wall equally wide, and loop order reaches the right rail's wall from the top
 * and the left's from the bottom (the founder, 2026-11-06, D-46).
 */
export function extremeVertex(positions: Float64Array, vertices: readonly number[], axis: 1 | 2, sign: 1 | -1): number {
  let best = vertices[0];
  for (const v of vertices) {
    const d = sign * (positions[3 * v + axis] - positions[3 * best + axis]);
    if (d > 1e-9) best = v;
    else if (d > -1e-9) {
      const nearer = Math.abs(positions[3 * best + 1]) - Math.abs(positions[3 * v + 1]);
      if (nearer > 1e-9 || (nearer > -1e-9 && positions[3 * v + 2] - positions[3 * best + 2] > 1e-9)) best = v;
    }
  }
  return best;
}

/** Drops a vertex that repeats the one before it (and, for a loop, a last one that repeats the first). */
function withoutRepeats(vertices: number[], loop: boolean): number[] {
  const out = vertices.filter((v, i) => i === 0 || v !== vertices[i - 1]);
  if (loop) while (out.length > 1 && out[out.length - 1] === out[0]) out.pop();
  return out;
}

/**
 * The slices the CNC files carry (D-24): one per litres station with foam, tail to nose, each the closed
 * loop of that station's ring — two loops inside a swallow's notch, the right piece first (research
 * Pitfall 11). Every point is a vertex of the drawn mesh, the very numbers. A tip's edge has no width and is
 * never a slice (D-34).
 */
export function boardSlices(surface: BoardSurface): { station: Mm; loops: Vec3[][] }[] {
  return surface.rings
    .filter((ring) => ring.isSlice && ring.pieces.some((piece) => pieceHasWidth(surface.positions, piece)))
    .map((ring) => ({
      station: ring.station,
      loops: ring.pieces.map((piece) => pieceVertices(piece).map((v) => pointAt(surface.positions, v))),
    }));
}

/**
 * The two rails of the outline: each ring's widest point on the right rail, tail to nose, and on the left rail, nose
 * to tail. At a tip with no width the rail's widest point is on the tip's edge, strictly between its bottom and its
 * deck at the height nearest the next ring's widest point, so the outline doesn't climb the edge to reach it (D-34).
 */
function outlineRails(surface: BoardSurface): { right: number[]; left: number[] } {
  const { positions, rings } = surface;
  const all = (ring: SurfaceRing) => ring.pieces.flatMap(pieceVertices);
  const rail = (sign: 1 | -1) => {
    const widest = rings.map((ring) => extremeVertex(positions, all(ring), 1, sign));
    const onEdge = (i: number, neighbour: number) => {
      const ring = rings[i];
      if (ring.pieces.some((piece) => pieceHasWidth(positions, piece))) return;
      const height = positions[3 * widest[neighbour] + 2];
      const across = positions[3 * widest[i] + 1];
      const edge = all(ring).filter((v) => Math.abs(positions[3 * v + 1] - across) <= 1e-9);
      const heights = edge.map((v) => positions[3 * v + 2]);
      const [low, high] = [Math.min(...heights), Math.max(...heights)];
      const inside = edge.filter((v) => positions[3 * v + 2] > low && positions[3 * v + 2] < high);
      // A tip with no thickness has one point and no "between": that point is the outline's.
      widest[i] = inside.reduce(
        (best, v) => (Math.abs(positions[3 * v + 2] - height) < Math.abs(positions[3 * best + 2] - height) ? v : best),
        inside[0] ?? widest[i],
      );
    };
    onEdge(0, 1);
    onEdge(rings.length - 1, rings.length - 2);
    return widest;
  };
  return { right: rail(1), left: rail(-1).reverse() };
}

/**
 * The board's outline as the wire view draws it (D-42), in TEMPLATE's silhouette order: the two rails, then on a swallow
 * the notch's inside edges close the tail — along the left piece's deck corner on its wall to the crotch and back along
 * the right's, the lines the foam's own edge shows. A closed loop: its last point joins its first. Every point is a
 * vertex of the mesh. The files carry `boardFileOutlineLoop`, the same from above.
 */
export function boardOutlineLoop(surface: BoardSurface): Vec3[] {
  const { positions, rings } = surface;
  const { right, left } = outlineRails(surface);
  const notch: number[] = [];
  const lastNotch = rings.findLastIndex((ring) => ring.pieces.length === 2);
  if (lastNotch >= 0 && lastNotch + 1 < rings.length) {
    // Each piece's loop starts at its deck corner on the wall.
    for (let i = 0; i <= lastNotch; i++) notch.push(rings[i].pieces[1].first);
    notch.push(rings[lastNotch + 1].pieces[0].first); // the crotch, on the stringer
    for (let i = lastNotch; i >= 0; i--) notch.push(rings[i].pieces[0].first);
  }
  return withoutRepeats([...right, ...left, ...notch], true).map((v) => pointAt(positions, v));
}

/**
 * The board's outline as the files carry it (R8, D-26): `boardOutlineLoop` everywhere but a swallow's notch, where a
 * program that reads the heights would see the loop jump straight up the edge at each swallow point, from the rail to the
 * deck corner (D-34). So here the notch's inside edges run at one height share up the wall, tips to crotch: the wall
 * slot the right rail's point stands on (a swallow's point shares its heights with its wall). A ring with no width is
 * the rail's own point, already in the loop, so each wall starts from it with no step. From above it is exactly
 * `boardOutlineLoop`. A closed loop: its last point joins its first. Every point is a vertex of the mesh.
 */
export function boardFileOutlineLoop(surface: BoardSurface): Vec3[] {
  const { positions, rings } = surface;
  const lastNotch = rings.findLastIndex((ring) => ring.pieces.length === 2);
  if (lastNotch < 0 || lastNotch + 1 >= rings.length) return boardOutlineLoop(surface);
  const { right, left } = outlineRails(surface);
  const height = (v: number) => positions[3 * v + 2];
  const tipWall = rings[0].walls?.right ?? [];
  const slot = tipWall.reduce(
    (best, v, j) => (Math.abs(height(v) - height(right[0])) < Math.abs(height(tipWall[best]) - height(right[0])) ? j : best),
    0,
  );
  const along = (side: "right" | "left") =>
    rings
      .slice(0, lastNotch + 1)
      .flatMap((ring) => (ring.walls && ring.pieces.some((piece) => pieceHasWidth(positions, piece)) ? [ring.walls[side][slot]] : []));
  const crotch = rings[lastNotch + 1].walls; // on the stringer, where the two walls meet
  const notch = [...along("left"), ...(crotch ? [crotch.right[slot]] : []), ...along("right").reverse()];
  return withoutRepeats([...right, ...left, ...notch], true).map((v) => pointAt(positions, v));
}

/**
 * The board's side profile as the files carry it (R8, D-26): each ring's highest point (the deck) and
 * lowest point (the bottom), tail to nose — on the stringer outside a swallow's notch, on the right piece
 * inside it. Every point is a vertex of the mesh.
 */
export function boardProfileLines(surface: BoardSurface): { deck: Vec3[]; bottom: Vec3[] } {
  const { positions, rings } = surface;
  const line = (sign: 1 | -1) =>
    rings.map((ring) => pointAt(positions, extremeVertex(positions, pieceVertices(ring.pieces[0]), 2, sign)));
  return { deck: line(1), bottom: line(-1) };
}

/**
 * Every full ring of the surface as a board file's cross-section is read (quick 261110-veo): the ring's right half,
 * bottom first — slot 0 the bottom at the stringer, the last slot the deck at the stringer — with EVERY slot kept (a slot
 * the surface welded repeats its neighbour's point), so slot k is the same place on every half and a file can hold the
 * same knots in the same places on every section. A ring is a full one when it is one piece with width: never a tip's
 * edge, never a station inside a swallow's notch. The rings come tail to nose, each as `{ station, points }` with the
 * points in the surface's own axes. Beside them: `walls`, each channel wall's `{ foot, top }` slot (innermost first; the foot
 * is the slot nearer the stringer, the channel's roof, and the top the next one out, where the wall meets the planed
 * bottom — the file's names for the pair, whatever way up they stand), empty on a board without channels; `bottomEdge`, the slot of the bottom edge (the tuck);
 * and `widest`, the slot of the rail's widest point. Every point is a vertex of the mesh.
 */
export function boardSectionHalves(surface: BoardSurface): {
  halves: { station: Mm; points: Vec3[] }[];
  walls: { foot: number; top: number }[];
  bottomEdge: number;
  widest: number;
} {
  const full = surface.rings.filter((ring) => ring.pieces.length === 1 && pieceHasWidth(surface.positions, ring.pieces[0]));
  const count = surface.rings[0]?.right.length ?? 0;
  return {
    halves: full.map((ring) => ({
      station: ring.station,
      points: ring.right
        .slice()
        .reverse()
        .map((v) => pointAt(surface.positions, v)),
    })),
    walls: surface.channelWallRows.map((row) => ({ foot: count - 1 - (row + 1), top: count - 1 - row })),
    bottomEdge: count - 1 - BOTTOM_EDGE,
    widest: count - SURFACE_POINTS.deck,
  };
}

/**
 * The stringer's deck and bottom lines as a board file's rocker curves carry them: every ring, tail to nose, its deck
 * point (the first vertex of the right half) and its bottom point (the last) — on the stringer, or on the right piece's
 * notch wall inside a swallow's notch. Unlike `boardProfileLines`, which takes each ring's lowest vertex wherever it
 * stands, the bottom here is always the one at the inside edge, so a concave that lifts the stringer shows as it is.
 * Every point is a vertex of the mesh.
 */
export function boardStringerLines(surface: BoardSurface): { deck: Vec3[]; bottom: Vec3[] } {
  const { positions, rings } = surface;
  return {
    deck: rings.map((ring) => pointAt(positions, ring.right[0])),
    bottom: rings.map((ring) => pointAt(positions, ring.right[ring.right.length - 1])),
  };
}

/**
 * The right half of `boardFileOutlineLoop`, tail to nose, as a board file's outline carries it. On a swallow it starts
 * at the crotch on the stringer, runs back along the right notch edge to the swallow's point, then along the right rail
 * to the nose; elsewhere it is the right rail. Every point is a vertex of the mesh.
 */
export function boardFileHalfOutline(surface: BoardSurface): Vec3[] {
  const { positions, rings } = surface;
  const { right } = outlineRails(surface);
  const lastNotch = rings.findLastIndex((ring) => ring.pieces.length === 2);
  if (lastNotch < 0 || lastNotch + 1 >= rings.length) return right.map((v) => pointAt(positions, v));
  // The same wall slot `boardFileOutlineLoop` walks (the one the right rail's tail point stands on).
  const height = (v: number) => positions[3 * v + 2];
  const tipWall = rings[0].walls?.right ?? [];
  const slot = tipWall.reduce(
    (best, v, j) => (Math.abs(height(v) - height(right[0])) < Math.abs(height(tipWall[best]) - height(right[0])) ? j : best),
    0,
  );
  const wall = rings
    .slice(0, lastNotch + 1)
    .flatMap((ring) => (ring.walls && ring.pieces.some((piece) => pieceHasWidth(positions, piece)) ? [ring.walls.right[slot]] : []))
    .reverse();
  const crotch = rings[lastNotch + 1].walls;
  return withoutRepeats([...(crotch ? [crotch.right[slot]] : []), ...wall, ...right], false).map((v) => pointAt(positions, v));
}
