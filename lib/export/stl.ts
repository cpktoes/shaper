/**
 * A binary STL of the board's surface (Phase 16, D-14, D-26; research §D): the very triangles the 3D screen
 * draws, which Shape3D also takes as a scan. "STL files contain no scale information" — the numbers are
 * the board's own millimetres, in Shape3D's axes, and nothing here converts them.
 *
 * The layout: an 80-byte header that never begins with `solid` (a reader would take the file for the text
 * form), the triangle count as a little-endian 32-bit number, then 50 bytes a triangle — its face normal and
 * its three corners as little-endian 32-bit floats, and a 16-bit attribute of 0.
 *
 * `readStl` is this writer's own reader, for the tests.
 *
 * Pure: no React, browser or database import.
 */
import type { Vec3 } from "../geometry/board-surface";

const HEADER_BYTES = 80;
const TRIANGLE_BYTES = 50;
const HEADER_PREFIX = "Shaper Assistant board ";
const HEADER_SUFFIX = " mm";

/**
 * The STL's header for a board: `Shaper Assistant board {stem} mm`, ASCII only — every character outside
 * printable ASCII becomes `?` — with the stem shortened if it must be so the ` mm` always fits in 80 bytes.
 * It begins with `Shaper`, so it can never begin with `solid`.
 */
export function stlHeader(stem: string): string {
  const ascii = Array.from(stem, (ch) => (/^[\x20-\x7e]$/.test(ch) ? ch : "?")).join("");
  const room = HEADER_BYTES - HEADER_PREFIX.length - HEADER_SUFFIX.length;
  return `${HEADER_PREFIX}${ascii.slice(0, room)}${HEADER_SUFFIX}`;
}

/**
 * The triangles as a binary STL. `positions` is x, y, z per vertex and `indices` three vertex indices per
 * triangle, wound so each face points out of the foam; each face's normal is worked out from its corners
 * (right-hand rule). `header` is written as ASCII (anything else becomes `?`), cut or padded with spaces to
 * 80 bytes.
 */
export function writeStl(positions: ArrayLike<number>, indices: ArrayLike<number>, header: string): Uint8Array {
  const count = Math.floor(indices.length / 3);
  const out = new Uint8Array(HEADER_BYTES + 4 + TRIANGLE_BYTES * count);
  const view = new DataView(out.buffer);
  for (let i = 0; i < HEADER_BYTES; i++) {
    const code = i < header.length ? header.charCodeAt(i) : 0x20;
    out[i] = code >= 0x20 && code <= 0x7e ? code : 0x3f;
  }
  view.setUint32(HEADER_BYTES, count, true);
  let at = HEADER_BYTES + 4;
  for (let t = 0; t < count; t++) {
    const a = 3 * indices[3 * t];
    const b = 3 * indices[3 * t + 1];
    const c = 3 * indices[3 * t + 2];
    const ux = positions[b] - positions[a];
    const uy = positions[b + 1] - positions[a + 1];
    const uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a];
    const vy = positions[c + 1] - positions[a + 1];
    const vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    view.setFloat32(at, nx / length, true);
    view.setFloat32(at + 4, ny / length, true);
    view.setFloat32(at + 8, nz / length, true);
    at += 12;
    for (const corner of [a, b, c]) {
      view.setFloat32(at, positions[corner], true);
      view.setFloat32(at + 4, positions[corner + 1], true);
      view.setFloat32(at + 8, positions[corner + 2], true);
      at += 12;
    }
    view.setUint16(at, 0, true);
    at += 2;
  }
  return out;
}

/** A binary STL read back: its header (trailing spaces and NULs dropped), its count, and each triangle. */
export interface StlRead {
  header: string;
  count: number;
  normals: Vec3[];
  triangles: Vec3[][];
}

/** Reads a binary STL. Throws if its length does not match the count it states. */
export function readStl(bytes: Uint8Array): StlRead {
  if (bytes.byteLength < HEADER_BYTES + 4) throw new Error("STL too short for its header");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const header = String.fromCharCode(...bytes.subarray(0, HEADER_BYTES)).replace(/[\s\u0000]+$/, "");
  const count = view.getUint32(HEADER_BYTES, true);
  if (bytes.byteLength !== HEADER_BYTES + 4 + TRIANGLE_BYTES * count) {
    throw new Error("STL length does not match its triangle count");
  }
  const normals: Vec3[] = [];
  const triangles: Vec3[][] = [];
  const float3 = (at: number): Vec3 => [
    view.getFloat32(at, true),
    view.getFloat32(at + 4, true),
    view.getFloat32(at + 8, true),
  ];
  for (let t = 0; t < count; t++) {
    const at = HEADER_BYTES + 4 + TRIANGLE_BYTES * t;
    normals.push(float3(at));
    triangles.push([float3(at + 12), float3(at + 24), float3(at + 36)]);
  }
  return { header, count, normals, triangles };
}
