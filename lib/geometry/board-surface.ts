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
 *    outboard of the stringer (exactly the closure the litres assume), cut at the stringer if it starts
 *    inboard — never squeezed — and split into deck, rail and bottom runs, each resampled by arc length to
 *    a fixed count (`SURFACE_POINTS`), so the bottom edge — a hard edge's corner, a Sharp Bottom Tuck's
 *    corner — is always the same ring index.
 * 2. While the tail's hard edge fades, the section itself carries the ring (`BoardSection.blended`): the
 *    tucked and the hard-edged halves sampled alike and blended point for point by the hard weight
 *    (`blendFinishedRails`, D-20/D-27) — the very ring the litres count (D-31). Nothing is blended here.
 * 3. Inside a swallow's notch the half is moved out to stand on the notch's wall (`inner`): the rail lands
 *    on the drawn curve (`outer`), the inside edge on the wall. Everywhere else `inner` is the stringer, 0.
 * 4. The half is mirrored to the other rail. Points on the stringer are shared by both sides, so the deck
 *    is one surface across the stringer.
 *
 * The tips (research Pattern 3): inside a swallow's notch each station is two pieces, each from the notch's
 * square wall out to the rail, the two walls meeting along one shared edge at the crotch; a diamond's V is
 * ordinary foam narrowing to nothing at its tip; a station with no foam is one point; a tail end with width
 * (a square or squash tail) is closed with a flat cap.
 *
 * Pure (CLAUDE.md Rule 1): no React, browser, database or `three` import.
 */

import { BOARD_LENGTH_RANGE_IN } from "./board";
import { HALF_SECTION_POINT_COUNT, SECTION_POINTS, sampledFinishedRail } from "./finished-rail";
import { foilStationPoints, sampleFoil } from "./foil";
import { type OutlineGeometry, sampleOutline, tailCutStation } from "./outline";
import { hardEdgeBlendsFrom, hardEdgeEndsAt } from "./rail-bands";
import { inchesToMm, mm, type Mm } from "./units";
import { type BoardSection, type CrossSectionVolumeInput, boardSections, crossSectionStations } from "./volume";

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

/** Points in one half-section: the three runs, sharing their two joins. */
const HALF_POINTS = HALF_SECTION_POINT_COUNT;
/** The half-section's index of the bottom edge (the rail run's last point, the bottom run's first). */
const BOTTOM_EDGE = SURFACE_POINTS.deck + SURFACE_POINTS.rail - 2;

/**
 * What each triangle of the surface is, for the screen's normals (board-surface-render.ts): the deck and
 * rail above the bottom edge, the bottom below it, a notch wall on either side, or a tip's flat cap.
 */
export const SURFACE_FACE = {
  upper: 0,
  bottom: 1,
  wallRight: 2,
  wallLeft: 3,
  capTail: 4,
  capNose: 5,
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
 * edge (the hard weight, or 1 under a Sharp Bottom Tuck); `isSlice` marks the litres' own stations.
 */
export interface SurfaceRing {
  station: Mm;
  pieces: { first: number; count: number; inner: Mm }[];
  bottomEdge: number[];
  sharpness: number;
  isSlice: boolean;
}

/**
 * The closed surface. `positions` is x, y, z per vertex; `indices` three vertex indices per triangle,
 * wound so every face points out of the foam; `faceKinds` one `SURFACE_FACE` value per triangle.
 */
export interface BoardSurface {
  positions: Float64Array;
  indices: Uint32Array;
  faceKinds: Uint8Array;
  rings: SurfaceRing[];
  length: Mm;
  triangleCount: number;
}

type P2 = [number, number];

/** Stations closer than this are one station. */
const SAME_STATION_MM = 1e-6;

function assertFinite(field: string, value: number, station: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`3D board: ${field} at station ${station} mm is not a finite number`);
  }
}

/**
 * Where the surface takes a ring, tail to nose: the litres' own stations (so every slice the files carry
 * is a ring of the drawn mesh, D-24), both 12" stations, the centre, the tail cut's corner and — while the
 * tail's hard edge is on — where its fade begins and ends (D-30), filled in so no two neighbours are more than
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
  if (rails.tailHardEdge) {
    // Both ends of the fade (D-30): where the blend begins and where the hard edge is gone.
    for (const s of [hardEdgeBlendsFrom(rails, length), hardEdgeEndsAt(rails, length)]) {
      if (inside(s)) required.push(s);
    }
  }
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
 * One station's half-section as the surface lays it (`HALF_SECTION_POINT_COUNT` points, inside edge on the
 * deck round the rail to the inside edge on the bottom; distance across from the stringer, height above the
 * bottom): the section's own sampled finished rail (`sampledFinishedRail`), or inside the hard edge's fade the
 * very ring the litres count (`BoardSection.blended`, D-31), moved out by `inner` so its inside edge stands on
 * a swallow's notch wall (0 everywhere else). Nothing is sampled or blended here that the litres don't read.
 * A section with no foam is one point at `outer`, half its thickness up.
 */
export function placedHalfSection(section: BoardSection, outer: number, inner: number): [number, number][] {
  if (!section.result || section.halfWidth <= 0) {
    return Array.from({ length: HALF_POINTS }, () => [outer, section.thickness / 2] as P2);
  }
  const half = section.blended ?? sampledFinishedRail(section.result, section.domed, section.halfWidth);
  return half.map(([y, h]) => [inner + y, h] as P2);
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

  // Each station's two half-sections placed at the outline.
  const placed = sections.map((section) => {
    const s = section.station;
    const inNotch = swallow && s < close;
    const outer = inNotch ? sampleOutline(geometry, s) : section.halfWidth;
    const inner = inNotch ? Math.max(0, outer - section.halfWidth) : 0;
    const half = placedHalfSection(section, outer, inner);
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
    const right: number[] = new Array(HALF_POINTS);
    const left: number[] = new Array(HALF_POINTS);
    const wallPoint = (side: 1 | -1, j: number): P2 => {
      const bottom = half[HALF_POINTS - 1];
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
      for (let j = 0; j < HALF_POINTS; j++) right[j] = vertex(half[j][0], half[j][1]);
      left[HALF_POINTS - 1] = vertex(-half[HALF_POINTS - 1][0], half[HALF_POINTS - 1][1]);
      for (let j = HALF_POINTS - 2; j >= 1; j--) left[j] = vertex(-half[j][0], half[j][1]);
      left[0] = vertex(-half[0][0], half[0][1]);
      pieces.push({ first: start, count: allocated - before, inner: mm(0) });
      if (besideNotch) {
        // The crotch: both walls come to the stringer and share its points, bottom to deck.
        wallRight = new Array(W + 2);
        wallRight[0] = right[HALF_POINTS - 1];
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
      for (let j = 0; j < HALF_POINTS; j++) right[j] = vertex(half[j][0], half[j][1]);
      wallRight = new Array(W + 2);
      wallRight[0] = right[HALF_POINTS - 1];
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
      left[HALF_POINTS - 1] = vertex(-half[HALF_POINTS - 1][0], half[HALF_POINTS - 1][1]);
      wallLeft[0] = left[HALF_POINTS - 1];
      for (let j = HALF_POINTS - 2; j >= 1; j--) left[j] = vertex(-half[j][0], half[j][1]);
      pieces.push({ first: start, count: allocated - before, inner: mm(inner) });
    }

    const base = pieces[0].first;
    const bottomEdge = [...new Set([right[BOTTOM_EDGE] - base, left[BOTTOM_EDGE] - base])];
    rings.push({
      station: s,
      pieces,
      bottomEdge,
      sharpness: Math.max(section.hardWeight, section.sharpBottomTuck ? 1 : 0),
      isSlice: slices.has(s),
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

  for (let i = 0; i < rings.length - 1; i++) {
    const A = slots[i];
    const B = slots[i + 1];
    for (let j = 0; j < HALF_POINTS - 1; j++) {
      const kind = j < BOTTOM_EDGE ? SURFACE_FACE.upper : SURFACE_FACE.bottom;
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

  // The two ends: a flat fan from each end piece's centre, when the piece has width.
  const cap = (ring: SurfaceRing, nose: boolean) => {
    for (const piece of ring.pieces) {
      if (piece.count < 3) continue;
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
    triangleCount: indices.length / 3,
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

/** A vertex of the surface as a point. */
function pointAt(positions: Float64Array, v: number): Vec3 {
  return [positions[3 * v], positions[3 * v + 1], positions[3 * v + 2]];
}

/** The vertices of one piece of a ring, in loop order. */
export function pieceVertices(piece: SurfaceRing["pieces"][number]): number[] {
  return Array.from({ length: piece.count }, (_, k) => piece.first + k);
}

/**
 * The vertex of `vertices` furthest along `axis` (1 across, 2 up) in the direction `sign`; between two
 * level within a millionth of a millimetre, the one nearer the stringer, then the first in loop order.
 */
export function extremeVertex(positions: Float64Array, vertices: readonly number[], axis: 1 | 2, sign: 1 | -1): number {
  let best = vertices[0];
  for (const v of vertices) {
    const d = sign * (positions[3 * v + axis] - positions[3 * best + axis]);
    if (d > 1e-9) best = v;
    else if (d > -1e-9 && Math.abs(positions[3 * v + 1]) < Math.abs(positions[3 * best + 1]) - 1e-9) best = v;
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
 * Pitfall 11). Every point is a vertex of the drawn mesh, the very numbers.
 */
export function boardSlices(surface: BoardSurface): { station: Mm; loops: Vec3[][] }[] {
  return surface.rings
    .filter((ring) => ring.isSlice && ring.pieces.some((piece) => piece.count > 1))
    .map((ring) => ({
      station: ring.station,
      loops: ring.pieces.map((piece) => pieceVertices(piece).map((v) => pointAt(surface.positions, v))),
    }));
}

/**
 * The board's outline as the files carry it (R8, D-26), in TEMPLATE's silhouette order: each ring's widest
 * point on the right rail, tail to nose, then on the left rail, nose to tail; on a swallow the notch's
 * inside edges then close the tail — along the left piece's wall to the crotch and back along the right's.
 * A closed loop: its last point joins its first. Every point is a vertex of the mesh.
 */
export function boardOutlineLoop(surface: BoardSurface): Vec3[] {
  const { positions, rings } = surface;
  const all = (ring: SurfaceRing) => ring.pieces.flatMap(pieceVertices);
  const right = rings.map((ring) => extremeVertex(positions, all(ring), 1, 1));
  const left = rings.map((ring) => extremeVertex(positions, all(ring), 1, -1)).reverse();
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
