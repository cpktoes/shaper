/**
 * The picked blank as the 3D screen's see-through ghost (Phase 16, D-08, UI-SPEC §3 "The blank ghost"): the blank
 * ROCKER draws, as a glassy shell round the board, so the shaper sees the foam that comes off.
 *
 * It is the blank's OWN curves, never new ones:
 * - its width, station by station, is the top view's outline (`buildBlankTopView(...).blankOutline`, the very line
 *   ROCKER's top view draws — the catalogue's printed widths, a round nose drawn round);
 * - its bottom and its deck are the side view's (`BlankSideView.bottomAt` / `deckAt`, the prepared blank ROCKER's side
 *   view draws, in the board's rocker frame, placed where the board sits in it).
 *
 * Each station's section is a plain rounded box — NOT a maker's rail, which no catalogue prints: a flat deck and a
 * flat bottom, the rail rounded with a radius of about half the blank's thickness there (`GHOST_RAIL_RADIUS_SHARE`),
 * its corners superellipse quarters (`GHOST_CORNER_EXPONENT`) so it reads as a blank's boxy rail rather than a tube.
 * The widest point is the rail's apex at mid-thickness, exactly the top view's half-width; the top and the bottom on
 * the stringer are exactly the side view's deck and bottom.
 *
 * The sections are lofted tail to nose into one closed, outward-wound skin. A tip printed 0 wide closes to a point on
 * the stringer at mid-thickness; a tip with width closes with a flat cap. `outline` is the widest line all round —
 * one rail's apexes tail to nose, the other's back — which the screen draws as a one-dot line, so where the veil is
 * faint the shaper still sees how far the foam reaches.
 *
 * Axes and units are the board surface's (board-surface.ts): millimetres, x along the board from its tail tip, y
 * across, z up in the side profile's rocker frame — so the ghost sits in the 3D board's own group and turns with it.
 * It is a picture only: nothing here reaches the CNC files (D-16).
 *
 * Pure (CLAUDE.md Rule 1): no React, browser, database or `three` import.
 */

import type { Vec3 } from "./board-surface";
import type { BlankSideView } from "./board-profile";
import type { BlankTopView } from "./blank-top-view";

/** The ghost's skin: x, y, z and a unit normal per vertex, three vertex indices per triangle, and its widest line. */
export interface BlankGhost {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  /** The widest point all round, at mid-thickness: one closed loop. */
  outline: Vec3[];
}

/** The rail's radius as a share of the blank's thickness at the station (the research's "about half"). */
export const GHOST_RAIL_RADIUS_SHARE = 0.5;

/** Near a tip, where the blank is narrower than it is thick, the rail's radius stops at this share of the half-width,
 * so a short flat stays on the deck and the bottom and no two points of a section ever coincide. */
export const GHOST_RAIL_RADIUS_MAX_SHARE_OF_HALF_WIDTH = 0.85;

/** The rail corners' superellipse exponent: 2 is a circle; higher is squarer, like a blank's rail. */
export const GHOST_CORNER_EXPONENT = 2.6;

/** Segments along each quarter's flat run (deck or bottom) and round each quarter's rail corner. */
const FLAT_SEGMENTS = 3;
const CORNER_SEGMENTS = 8;

/** Points in one quarter of a section, from the stringer to the rail's apex, both ends included. */
const QUARTER_POINTS = FLAT_SEGMENTS + CORNER_SEGMENTS + 1;
/** Points in one closed section loop: four quarters sharing their ends. */
export const GHOST_RING_POINTS = 4 * (QUARTER_POINTS - 1);

/** A width or a thickness smaller than this is no foam there. */
const NO_FOAM_MM = 1e-3;

interface GhostStation {
  station: number;
  halfWidth: number;
  bottom: number;
  deck: number;
}

/**
 * One quarter of a section as (across, up from mid-thickness) pairs, from the deck's stringer point to the rail's
 * apex: the flat deck, then the superellipse corner down to the apex. The two ends are set exactly — the stringer
 * point at the full half-thickness, the apex at the full half-width — so the section meets the side view and the top
 * view to the last digit.
 */
function quarter(halfWidth: number, halfThickness: number): [number, number][] {
  const radius = Math.min(GHOST_RAIL_RADIUS_SHARE * 2 * halfThickness, GHOST_RAIL_RADIUS_MAX_SHARE_OF_HALF_WIDTH * halfWidth);
  const flatEnd = halfWidth - radius;
  const out: [number, number][] = [];
  for (let k = 0; k <= FLAT_SEGMENTS; k++) out.push([(flatEnd * k) / FLAT_SEGMENTS, halfThickness]);
  const power = 2 / GHOST_CORNER_EXPONENT;
  for (let k = 1; k <= CORNER_SEGMENTS; k++) {
    if (k === CORNER_SEGMENTS) {
      out.push([halfWidth, 0]);
      break;
    }
    const theta = (Math.PI / 2) * (1 - k / CORNER_SEGMENTS);
    out.push([flatEnd + radius * Math.cos(theta) ** power, halfThickness * Math.sin(theta) ** power]);
  }
  return out;
}

/**
 * One closed section loop as (y, z) pairs: the deck's stringer point, round the +y rail, the bottom's stringer point,
 * round the −y rail, and back (the first point not repeated). The deck point is exactly `deck`, the bottom point
 * exactly `bottom`, the apexes exactly ±`halfWidth`.
 */
function sectionLoop(s: GhostStation): [number, number][] {
  const mid = (s.bottom + s.deck) / 2;
  const q = quarter(s.halfWidth, (s.deck - s.bottom) / 2);
  const loop: [number, number][] = [];
  // Deck to the +y apex.
  for (let k = 0; k < q.length - 1; k++) loop.push([q[k][0], k === 0 ? s.deck : mid + q[k][1]]);
  // The +y apex down to the bottom's stringer point.
  for (let k = q.length - 1; k > 0; k--) loop.push([q[k][0], k === q.length - 1 ? mid : mid - q[k][1]]);
  // The bottom's stringer point to the −y apex.
  for (let k = 0; k < q.length - 1; k++) loop.push([-q[k][0], k === 0 ? s.bottom : mid - q[k][1]]);
  // The −y apex back up toward the deck.
  for (let k = q.length - 1; k > 0; k--) loop.push([-q[k][0], k === q.length - 1 ? mid : mid + q[k][1]]);
  return loop;
}

/**
 * The blank's ghost, or null with no blank — a hand-set board has none (D-08) — or when any of the blank's figures
 * is not a finite number, or it has fewer than two stations with foam (T-16-23: no ghost rather than a broken shape).
 */
export function buildBlankGhost(blank: BlankSideView | null, top: BlankTopView): BlankGhost | null {
  if (!blank || top.blankOutline.length < 2) return null;

  const stations: GhostStation[] = [];
  for (const { station, halfWidth } of top.blankOutline) {
    const bottom = blank.bottomAt(station);
    const deck = blank.deckAt(station);
    if (![station, halfWidth, bottom, deck].every(Number.isFinite)) return null;
    stations.push({ station, halfWidth, bottom, deck });
  }
  const hasFoam = (s: GhostStation) => s.halfWidth > NO_FOAM_MM && s.deck - s.bottom > NO_FOAM_MM;
  const rings = stations.filter(hasFoam);
  if (rings.length < 2) return null;

  const first = stations[0];
  const last = stations[stations.length - 1];
  // A tip with no foam (a round nose printed 0 wide) closes to one point on the stringer at its mid-thickness; a
  // tip with width (a square tail) closes with a flat cap round its own centre.
  const tailTip = hasFoam(first) ? rings[0] : first;
  const noseTip = hasFoam(last) ? rings[rings.length - 1] : last;
  const tipPoint = (s: GhostStation): Vec3 => [s.station, 0, (s.bottom + s.deck) / 2];

  const m = GHOST_RING_POINTS;
  const vertexCount = rings.length * m + 2;
  const positions = new Float64Array(vertexCount * 3);
  rings.forEach((s, i) => {
    sectionLoop(s).forEach(([y, z], j) => positions.set([s.station, y, z], 3 * (i * m + j)));
  });
  const tailIndex = rings.length * m;
  const noseIndex = tailIndex + 1;
  positions.set(tipPoint(tailTip), 3 * tailIndex);
  positions.set(tipPoint(noseTip), 3 * noseIndex);

  const indices: number[] = [];
  for (let i = 0; i + 1 < rings.length; i++) {
    for (let j = 0; j < m; j++) {
      const a = i * m + j;
      const b = i * m + ((j + 1) % m);
      const c = (i + 1) * m + j;
      const d = (i + 1) * m + ((j + 1) % m);
      // Along the board (+x) then round the loop: the cross product points out of the foam.
      indices.push(a, c, b, b, c, d);
    }
  }
  const lastRing = (rings.length - 1) * m;
  for (let j = 0; j < m; j++) {
    const next = (j + 1) % m;
    indices.push(tailIndex, j, next);
    indices.push(noseIndex, lastRing + next, lastRing + j);
  }

  // Smooth normals: each vertex the area-weighted sum of its triangles' faces, so the glass reads as one curved skin.
  const normals = new Float64Array(vertexCount * 3);
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]];
    const ux = positions[3 * b] - positions[3 * a];
    const uy = positions[3 * b + 1] - positions[3 * a + 1];
    const uz = positions[3 * b + 2] - positions[3 * a + 2];
    const vx = positions[3 * c] - positions[3 * a];
    const vy = positions[3 * c + 1] - positions[3 * a + 1];
    const vz = positions[3 * c + 2] - positions[3 * a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      normals[3 * v] += nx;
      normals[3 * v + 1] += ny;
      normals[3 * v + 2] += nz;
    }
  }
  for (let v = 0; v < vertexCount; v++) {
    const l = Math.hypot(normals[3 * v], normals[3 * v + 1], normals[3 * v + 2]) || 1;
    normals[3 * v] /= l;
    normals[3 * v + 1] /= l;
    normals[3 * v + 2] /= l;
  }

  // The widest line: the tail's tip point when it has no foam, one rail's apexes tail to nose, the nose's tip point
  // when it has none, then the other rail's apexes back. A loop, so a square tip is closed straight across.
  const apex = (s: GhostStation, side: 1 | -1): Vec3 => [s.station, side * s.halfWidth, (s.bottom + s.deck) / 2];
  const outline: Vec3[] = [];
  if (!hasFoam(first)) outline.push(tipPoint(first));
  for (const s of rings) outline.push(apex(s, 1));
  if (!hasFoam(last)) outline.push(tipPoint(last));
  for (let i = rings.length - 1; i >= 0; i--) outline.push(apex(rings[i], -1));

  return {
    positions: Float32Array.from(positions),
    normals: Float32Array.from(normals),
    indices: Uint32Array.from(indices),
    outline,
  };
}
