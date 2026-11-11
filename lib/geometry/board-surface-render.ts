/**
 * What the 3D screen draws of the board's surface (Phase 16, R3, D-07): the very vertices of
 * `buildBoardSurface`, with normals that keep the sharp edges sharp, and the stringer's lines.
 *
 * Sharp by marking, not by angle (research Pattern 4). Round a section, ordinary points turn up to about 60°
 * between neighbours on a tight rail, while a Sharp Bottom Tuck's corner turns only 7°–35° — so no crease
 * angle can tell the two apart: one would facet the rail, or round the tuck. Instead the bottom edge's row is
 * marked by the surface itself (`SurfaceRing.bottomEdge`): each of its vertices is drawn twice, once for the
 * rail above it and once for the bottom below, and each copy's normal is the smooth normal leaning toward its
 * own side's by the ring's `sharpness` — the hard edge's weight (full to 12", fading with D-20), or 1 under a
 * Sharp Bottom Tuck. A swallow's notch walls, the flat caps at the tips and a channel's vertical walls (Phase 17,
 * D-10, D-21: `SURFACE_FACE.channelWall`, the rows of the ring the surface lays at each wall) are always drawn sharp:
 * each takes its own copies of its vertices, so the floor beside a wall keeps its own normal and the wall its own. The
 * STL reads the surface itself, welded, and carries face normals only.
 *
 * Pure (CLAUDE.md Rule 1): no React, browser or `three` import.
 */

import {
  type BoardSurface,
  type SurfaceRing,
  type Vec3,
  extremeVertex,
  pieceVertices,
  SURFACE_FACE,
} from "./board-surface";

type V3 = [number, number, number];

function unit(v: V3, fallback: V3 | null): V3 | null {
  const l = Math.hypot(v[0], v[1], v[2]);
  if (l < 1e-20) return fallback;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function mix(a: V3, b: V3, t: number): V3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * The surface as the screen draws it: every surface vertex first, in its own order, then a copy of each
 * ring's bottom-edge vertices for the bottom's triangles, then a copy of every vertex a notch wall or a cap
 * touches for that wall or cap alone. Normals are area-weighted and unit length; at the bottom edge the rail's
 * vertex and the bottom's copy each take `normalize(mix(smooth, their own side's, sharpness))`.
 */
export function renderMesh(surface: BoardSurface): {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
} {
  const { positions, indices, faceKinds, rings } = surface;
  const vertexCount = positions.length / 3;
  const triangleCount = indices.length / 3;

  const smooth = new Float64Array(3 * vertexCount);
  const upper = new Float64Array(3 * vertexCount);
  const lower = new Float64Array(3 * vertexCount);
  /** (vertex, kind) → the summed normal of that wall's or cap's faces at the vertex. */
  const grouped = new Map<number, V3>();
  const groupKey = (v: number, kind: number) => v * 8 + kind;

  const add = (into: Float64Array, v: number, n: V3) => {
    into[3 * v] += n[0];
    into[3 * v + 1] += n[1];
    into[3 * v + 2] += n[2];
  };
  for (let t = 0; t < triangleCount; t++) {
    const a = indices[3 * t];
    const b = indices[3 * t + 1];
    const c = indices[3 * t + 2];
    const ux = positions[3 * b] - positions[3 * a];
    const uy = positions[3 * b + 1] - positions[3 * a + 1];
    const uz = positions[3 * b + 2] - positions[3 * a + 2];
    const vx = positions[3 * c] - positions[3 * a];
    const vy = positions[3 * c + 1] - positions[3 * a + 1];
    const vz = positions[3 * c + 2] - positions[3 * a + 2];
    // Twice the area along the face's outward normal: the area weighting comes free.
    const n: V3 = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const kind = faceKinds[t];
    for (const v of [a, b, c]) {
      if (kind === SURFACE_FACE.upper || kind === SURFACE_FACE.bottom) {
        add(smooth, v, n);
        add(kind === SURFACE_FACE.upper ? upper : lower, v, n);
      } else {
        const key = groupKey(v, kind);
        const sum = grouped.get(key) ?? [0, 0, 0];
        grouped.set(key, [sum[0] + n[0], sum[1] + n[1], sum[2] + n[2]]);
      }
    }
  }
  const at = (array: Float64Array, v: number): V3 => [array[3 * v], array[3 * v + 1], array[3 * v + 2]];

  const outPositions: number[] = Array.from(positions);
  const outNormals: number[] = new Array(3 * vertexCount).fill(0);
  const setNormal = (v: number, n: V3) => {
    outNormals[3 * v] = n[0];
    outNormals[3 * v + 1] = n[1];
    outNormals[3 * v + 2] = n[2];
  };
  const copyOf = (v: number, n: V3): number => {
    const index = outPositions.length / 3;
    outPositions.push(positions[3 * v], positions[3 * v + 1], positions[3 * v + 2]);
    outNormals.push(n[0], n[1], n[2]);
    return index;
  };

  // Every surface vertex: its smooth normal (a vertex only a wall or cap touches takes that one's).
  const groupedFirst = new Map<number, V3>();
  for (const [key, sum] of grouped) {
    const v = Math.floor(key / 8);
    if (!groupedFirst.has(v)) groupedFirst.set(v, sum);
  }
  for (let v = 0; v < vertexCount; v++) {
    const own = unit(at(smooth, v), null);
    setNormal(v, own ?? unit(groupedFirst.get(v) ?? [0, 0, 1], [0, 0, 1])!);
  }

  // The bottom edge: the rail keeps the vertex, the bottom gets a copy.
  const bottomCopy = new Map<number, number>();
  for (const ring of rings) {
    for (const offset of ring.bottomEdge) {
      const v = ring.pieces[0].first + offset;
      if (bottomCopy.has(v)) continue;
      const n = unit(at(smooth, v), [0, 0, 1])!;
      const railSide = unit(at(upper, v), n)!;
      const bottomSide = unit(at(lower, v), n)!;
      setNormal(v, unit(mix(n, railSide, ring.sharpness), n)!);
      bottomCopy.set(v, copyOf(v, unit(mix(n, bottomSide, ring.sharpness), n)!));
    }
  }

  // The walls and the caps: their own copies, always sharp.
  const groupCopy = new Map<number, number>();
  const outIndices = new Uint32Array(indices.length);
  for (let t = 0; t < triangleCount; t++) {
    const kind = faceKinds[t];
    for (let e = 0; e < 3; e++) {
      const v = indices[3 * t + e];
      let out = v;
      if (kind === SURFACE_FACE.bottom) out = bottomCopy.get(v) ?? v;
      else if (kind !== SURFACE_FACE.upper) {
        const key = groupKey(v, kind);
        let copy = groupCopy.get(key);
        if (copy === undefined) {
          copy = copyOf(v, unit(grouped.get(key)!, [0, 0, 1])!);
          groupCopy.set(key, copy);
        }
        out = copy;
      }
      outIndices[3 * t + e] = out;
    }
  }

  return {
    positions: Float32Array.from(outPositions),
    normals: Float32Array.from(outNormals),
    indices: outIndices,
  };
}

/** A ring's vertices on the stringer (y = 0) within its first piece. */
function onStringer(positions: Float64Array, ring: SurfaceRing): number[] {
  return pieceVertices(ring.pieces[0]).filter((v) => Math.abs(positions[3 * v + 1]) <= 1e-9);
}

/**
 * The stringer's two painted lines (D-07), tail to nose, read off the surface's own vertices: `deck` along
 * the deck's stringer points and `bottom` along the bottom's. They meet round the nose tip; at a tail end with
 * width the deck line starts at the bottom and runs up the end, so the stringer goes round it too. On a
 * swallow both start at the crotch — there is no foam to paint across the open notch — and the deck line
 * starts by running up the crotch's face (the rack's rule, `stringerPoints` in rack-art.ts).
 */
export function stringerLines(surface: BoardSurface): { deck: Vec3[]; bottom: Vec3[] } {
  const { positions, rings } = surface;
  const point = (v: number): Vec3 => [positions[3 * v], positions[3 * v + 1], positions[3 * v + 2]];
  const lastNotch = rings.findLastIndex((ring) => ring.pieces.length === 2);
  const start = lastNotch >= 0 ? Math.min(lastNotch + 1, rings.length - 1) : 0;

  const deckOf = (ring: SurfaceRing) => extremeVertex(positions, onStringer(positions, ring), 2, 1);
  const bottomOf = (ring: SurfaceRing) => extremeVertex(positions, onStringer(positions, ring), 2, -1);

  const deck: number[] = [];
  const bottom: number[] = [];
  const first = rings[start];
  deck.push(bottomOf(first));
  if (lastNotch >= 0 && start + 1 < rings.length) {
    // The crotch's face: the shared wall points the surface keeps right after the crotch ring's loop.
    const end = rings[start + 1].pieces[0].first;
    const face: number[] = [];
    for (let v = first.pieces[0].first + first.pieces[0].count; v < end; v++) face.push(v);
    face.sort((a, b) => positions[3 * a + 2] - positions[3 * b + 2]);
    deck.push(...face);
  }
  for (let i = start; i < rings.length; i++) {
    deck.push(deckOf(rings[i]));
    bottom.push(bottomOf(rings[i]));
  }
  deck.push(bottomOf(rings[rings.length - 1]));

  const once = (line: number[]) => line.filter((v, i) => i === 0 || v !== line[i - 1]).map(point);
  return { deck: once(deck), bottom: once(bottom) };
}
