/**
 * The DXF wireframe (Phase 16, D-14, D-26; research §C, §D): the board's outline, its side profile along the
 * deck and the bottom, and its slices, as 3D lines — what Shape3D's Scan import reads as guidelines.
 *
 * An R12 ASCII DXF (`$ACADVER` AC1009), the plainest form and the widest read — what BoardCAD, an open-source
 * surfboard CAD, writes. `$INSUNITS` 4 says millimetres and `$MEASUREMENT` 1 says metric. Each curve is a
 * `POLYLINE` flagged 8 (a 3D polyline; 9 when closed) with its points as `VERTEX` entries flagged 32 (a 3D
 * polyline's vertex), then `SEQEND`. Each family of curve sits on its own layer, so Shape3D can be given the
 * slices alone if its import mixes them up (research §C, the acceptance test's step 3). Numbers are the
 * surface's own millimetres to three decimals; nothing here converts them.
 *
 * `readDxf` is this writer's own reader, for the tests: it reads the header's variables and every polyline.
 *
 * Pure: no React, browser or database import.
 */
import type { Vec3 } from "../geometry/board-surface";
import { CRLF, formatMm } from "./xyz";

/** One curve of the wireframe: its layer, its points in order, and whether its last point joins its first. */
export interface DxfPolyline {
  layer: string;
  points: readonly Vec3[];
  closed: boolean;
}

/** The DXF version: AC1009 is R11/R12. */
export const DXF_VERSION = "AC1009";
/** `$INSUNITS` 4: millimetres. */
export const DXF_MILLIMETRES = 4;
/** `$MEASUREMENT` 1: metric. */
export const DXF_METRIC = 1;
/** A POLYLINE's flag 8: a 3D polyline; with 1 added (9) it is closed. */
export const DXF_POLYLINE_3D = 8;
export const DXF_POLYLINE_CLOSED = 1;
/** A VERTEX's flag 32: a vertex of a 3D polyline. */
export const DXF_VERTEX_3D = 32;

/** The curves as an R12 ASCII DXF, in the order given. */
export function writeDxf(polylines: readonly DxfPolyline[]): string {
  const out: string[] = [];
  const group = (code: number, value: string | number) => {
    out.push(String(code), String(value));
  };
  group(0, "SECTION");
  group(2, "HEADER");
  group(9, "$ACADVER");
  group(1, DXF_VERSION);
  group(9, "$INSUNITS");
  group(70, DXF_MILLIMETRES);
  group(9, "$MEASUREMENT");
  group(70, DXF_METRIC);
  group(0, "ENDSEC");
  group(0, "SECTION");
  group(2, "ENTITIES");
  for (const polyline of polylines) {
    group(0, "POLYLINE");
    group(8, polyline.layer);
    group(66, 1);
    group(10, formatMm(0));
    group(20, formatMm(0));
    group(30, formatMm(0));
    group(70, DXF_POLYLINE_3D + (polyline.closed ? DXF_POLYLINE_CLOSED : 0));
    for (const p of polyline.points) {
      group(0, "VERTEX");
      group(8, polyline.layer);
      group(10, formatMm(p[0]));
      group(20, formatMm(p[1]));
      group(30, formatMm(p[2]));
      group(70, DXF_VERTEX_3D);
    }
    group(0, "SEQEND");
    group(8, polyline.layer);
  }
  group(0, "ENDSEC");
  group(0, "EOF");
  return out.join(CRLF) + CRLF;
}

/** A polyline read back: its layer, its points, its flag, and each vertex's flag. */
export interface DxfPolylineRead {
  layer: string;
  points: Vec3[];
  flags: number;
  vertexFlags: number[];
}

/** A DXF read back: the header's variables (each `$NAME` to its value) and every polyline. */
export interface DxfRead {
  header: Record<string, string>;
  polylines: DxfPolylineRead[];
}

/** Reads an ASCII DXF of 3D polylines (what `writeDxf` makes) by its group-code pairs. */
export function readDxf(text: string): DxfRead {
  const lines = text.split(/\r?\n/);
  const pairs: [number, string][] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) pairs.push([Number(lines[i].trim()), lines[i + 1].trim()]);

  const header: Record<string, string> = {};
  const polylines: DxfPolylineRead[] = [];
  let section = "";
  let variable = "";
  let polyline: DxfPolylineRead | null = null;
  let vertex: { x: number; y: number; z: number; flags: number } | null = null;
  let entity = "";
  const endVertex = () => {
    if (vertex && polyline) {
      polyline.points.push([vertex.x, vertex.y, vertex.z]);
      polyline.vertexFlags.push(vertex.flags);
    }
    vertex = null;
  };
  for (let i = 0; i < pairs.length; i++) {
    const [code, value] = pairs[i];
    if (code === 0) {
      endVertex();
      entity = value;
      if (value === "SECTION" && pairs[i + 1]?.[0] === 2) section = pairs[i + 1][1];
      if (value === "ENDSEC") section = "";
      if (value === "POLYLINE") {
        polyline = { layer: "", points: [], flags: 0, vertexFlags: [] };
        polylines.push(polyline);
      } else if (value === "VERTEX") {
        vertex = { x: 0, y: 0, z: 0, flags: 0 };
      } else if (value === "SEQEND") {
        polyline = null;
      }
      continue;
    }
    if (section === "HEADER") {
      if (code === 9) variable = value;
      else if (variable) header[variable] = value;
      continue;
    }
    if (entity === "VERTEX" && vertex) {
      if (code === 10) vertex.x = Number(value);
      else if (code === 20) vertex.y = Number(value);
      else if (code === 30) vertex.z = Number(value);
      else if (code === 70) vertex.flags = Number(value);
    } else if (entity === "POLYLINE" && polyline) {
      if (code === 8) polyline.layer = value;
      else if (code === 70) polyline.flags = Number(value);
    }
  }
  endVertex();
  return { header, polylines };
}
