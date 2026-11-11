import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { crc32 as nodeCrc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import type { Vec3 } from "../geometry/board-surface";
import { DXF_METRIC, DXF_MILLIMETRES, DXF_POLYLINE_3D, DXF_VERSION, DXF_VERTEX_3D, readDxf, writeDxf } from "./dxf";
import { readStl, stlHeader, writeStl } from "./stl";
import { CRLF, formatMm, readXyz, writeXyz } from "./xyz";
import { crc32, readZip, writeZip, ZIP_DOS_DATE } from "./zip";

/**
 * The four formats byte by byte (Phase 16, D-26), each through its own reader. The sample curves here are
 * made up on the spot (the board's own files are proven in cnc-files.test.ts); every expected value is the
 * sample itself read back, or an independent implementation (Node's own CRC-32) — never a typed figure.
 */

/** A made-up curve with awkward numbers: negatives, fractions past three decimals, a near-zero. */
const sampleLoop = (n: number, shift: number): Vec3[] =>
  Array.from({ length: n }, (_, i) => [shift + i * 12.70049, Math.sin(i + shift) * 251.1234, -Math.cos(i) * 33.33349]);
const near = (a: readonly number[], b: readonly number[], tolerance: number) =>
  a.every((v, j) => Math.abs(v - b[j]) <= tolerance);

describe("XYZ text", () => {
  const loops = [sampleLoop(7, 0), sampleLoop(5, 3)];
  const text = writeXyz(loops);

  it("reads back the same loops to 1e-3 mm", () => {
    const back = readXyz(text);
    expect(back.length).toBe(loops.length);
    back.forEach((loop, i) => {
      expect(loop.length).toBe(loops[i].length);
      loop.forEach((p, k) => expect(near(p, loops[i][k], 5e-4 + 1e-9)).toBe(true));
    });
  });

  it("ends every line CRLF, puts one blank line between loops and no header", () => {
    expect(text.endsWith(CRLF)).toBe(true);
    expect(text.replace(/\r\n/g, "").includes("\n")).toBe(false);
    expect(text.replace(/\r\n/g, "").includes("\r")).toBe(false);
    const lines = text.split(CRLF).slice(0, -1);
    expect(lines.filter((line) => line === "").length).toBe(loops.length - 1);
    expect(lines.indexOf("")).toBe(loops[0].length);
    expect(lines[0]).toBe(`${formatMm(loops[0][0][0])} ${formatMm(loops[0][0][1])} ${formatMm(loops[0][0][2])}`);
  });

  it("writes each number with three decimals, a `.`, single spaces and never -0.000", () => {
    for (const line of text.split(CRLF).filter((l) => l !== "")) {
      expect(line).toMatch(/^-?\d+\.\d{3} -?\d+\.\d{3} -?\d+\.\d{3}$/);
    }
    expect(formatMm(-0.0004)).toBe(formatMm(0));
    expect(formatMm(-0)).toBe(formatMm(0));
    expect(() => formatMm(Number.NaN)).toThrow();
  });
});

describe("DXF (R12 ASCII)", () => {
  const polylines = [
    { layer: "A", points: sampleLoop(6, 0), closed: true },
    { layer: "B", points: sampleLoop(4, 1), closed: false },
  ];
  const text = writeDxf(polylines);
  const read = readDxf(text);

  it("says R12, millimetres and metric in its header", () => {
    expect(read.header.$ACADVER).toBe(DXF_VERSION);
    expect(read.header.$ACADVER).toBe("AC1009");
    expect(Number(read.header.$INSUNITS)).toBe(DXF_MILLIMETRES);
    expect(Number(read.header.$MEASUREMENT)).toBe(DXF_METRIC);
  });

  it("writes 3D polylines flagged 8 (open) or 9 (closed), every vertex flagged 32", () => {
    expect(read.polylines.map((p) => p.layer)).toEqual(polylines.map((p) => p.layer));
    expect(read.polylines[0].flags).toBe(DXF_POLYLINE_3D + 1);
    expect(read.polylines[1].flags).toBe(DXF_POLYLINE_3D);
    for (const p of read.polylines) for (const flag of p.vertexFlags) expect(flag).toBe(DXF_VERTEX_3D);
  });

  it("reads back the same points to 1e-3 mm", () => {
    read.polylines.forEach((p, i) => {
      expect(p.points.length).toBe(polylines[i].points.length);
      p.points.forEach((q, k) => expect(near(q, polylines[i].points[k], 5e-4 + 1e-9)).toBe(true));
    });
  });

  it("is group-code pairs in CRLF lines, ending with EOF, with a SEQEND per polyline", () => {
    const lines = text.split(CRLF).slice(0, -1);
    expect(lines.length % 2).toBe(0);
    for (let i = 0; i < lines.length; i += 2) expect(lines[i]).toMatch(/^\d+$/);
    expect(lines.slice(-2)).toEqual(["0", "EOF"]);
    expect(lines.filter((line, i) => i % 2 === 1 && line === "SEQEND").length).toBe(polylines.length);
    expect(lines.filter((line, i) => i % 2 === 1 && line === "POLYLINE").length).toBe(polylines.length);
  });
});

describe("binary STL", () => {
  // A closed tetrahedron, wound outward.
  const positions = new Float64Array([0, 0, 0, 10.5, 0, 0, 0, 20.25, 0, 0, 0, 30.125]);
  const indices = new Uint32Array([0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3]);
  const header = stlHeader("Test board");
  const bytes = writeStl(positions, indices, header);
  const read = readStl(bytes);

  it("is an 80-byte header, a little-endian count and 50 bytes a triangle", () => {
    expect(bytes.length).toBe(80 + 4 + 50 * (indices.length / 3));
    expect(new DataView(bytes.buffer).getUint32(80, true)).toBe(indices.length / 3);
    expect(read.count).toBe(indices.length / 3);
    for (let t = 0; t < read.count; t++) expect(new DataView(bytes.buffer).getUint16(84 + 50 * t + 48, true)).toBe(0);
  });

  it("has a header that never begins with `solid`, padded to 80 ASCII bytes", () => {
    expect(read.header).toBe(header);
    expect(header.startsWith("solid")).toBe(false);
    expect(Array.from(bytes.subarray(0, 80)).every((b) => b >= 0x20 && b <= 0x7e)).toBe(true);
    const sneaky = readStl(writeStl(positions, indices, "solid trouble é"));
    expect(sneaky.header).toBe("solid trouble ?");
  });

  it("carries each corner as float32 and each face's outward unit normal", () => {
    for (let t = 0; t < read.count; t++) {
      const corners = [0, 1, 2].map((k) => indices[3 * t + k]);
      corners.forEach((v, k) => {
        for (let j = 0; j < 3; j++) expect(read.triangles[t][k][j]).toBe(Math.fround(positions[3 * v + j]));
      });
      const n = read.normals[t];
      expect(Math.hypot(...n)).toBeCloseTo(1, 6);
      // Outward: the normal points away from the solid's centroid.
      const centroid = [0, 1, 2].map((j) => (positions[j] + positions[3 + j] + positions[6 + j] + positions[9 + j]) / 4);
      const face = [0, 1, 2].map((j) => read.triangles[t].reduce((s, p) => s + p[j], 0) / 3);
      expect(n[0] * (face[0] - centroid[0]) + n[1] * (face[1] - centroid[1]) + n[2] * (face[2] - centroid[2])).toBeGreaterThan(0);
    }
  });

  it("refuses a file whose length does not match its count", () => {
    expect(() => readStl(bytes.subarray(0, bytes.length - 1))).toThrow();
  });
});

describe("store-only zip", () => {
  const encoder = new TextEncoder();
  const files = [
    { name: "a.txt", data: encoder.encode("one\r\ntwo\r\n") },
    { name: "Fish 5'10 ünïcode 🏄.stl", data: new Uint8Array([0, 1, 2, 255, 254]) },
    { name: "empty.txt", data: new Uint8Array(0) },
  ];
  const bytes = writeZip(files);
  const view = new DataView(bytes.buffer);

  it("computes the same CRC-32 as Node's own", () => {
    for (const file of files) expect(crc32(file.data)).toBe(nodeCrc32(file.data));
    const big = encoder.encode("x".repeat(100_000));
    expect(crc32(big)).toBe(nodeCrc32(big));
  });

  it("reads every entry back with its name, bytes and CRC", () => {
    const read = readZip(bytes);
    expect(read.map((e) => e.name)).toEqual(files.map((f) => f.name));
    read.forEach((entry, i) => {
      expect(entry.crcOk).toBe(true);
      expect(Array.from(entry.data)).toEqual(Array.from(files[i].data));
    });
  });

  it("stores (method 0), version 20, UTF-8 names (flag 0x0800) and one fixed date", () => {
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(4, true)).toBe(20);
    expect(view.getUint16(6, true)).toBe(0x0800);
    expect(view.getUint16(8, true)).toBe(0);
    expect(view.getUint16(12, true)).toBe(ZIP_DOS_DATE);
    // The fixed date reads 2026-01-01 in DOS form.
    expect([(ZIP_DOS_DATE >> 9) + 1980, (ZIP_DOS_DATE >> 5) & 0xf, ZIP_DOS_DATE & 0x1f]).toEqual([2026, 1, 1]);
    expect(Buffer.from(writeZip(files)).equals(Buffer.from(bytes))).toBe(true);
  });

  it("flags a damaged entry's CRC", () => {
    const damaged = bytes.slice();
    damaged[30 + encoder.encode(files[0].name).length] ^= 0xff;
    expect(readZip(damaged)[0].crcOk).toBe(false);
    expect(readZip(damaged)[1].crcOk).toBe(true);
  });
});

describe("nothing under lib/export needs WebGL, React, the page or an inch (SPEC prohibition, R7, Rule 2)", () => {
  // Built at run time so this test never matches its own source or a sibling test's literals.
  const modules = ["th" + "ree", "re" + "act", "re" + "act-dom"];
  const moduleNames = modules.map((m) => m.replace(/-/g, "\\-")).join("|");
  const importForm = new RegExp(
    `(?:\\bfrom\\s*|\\bimport\\s*\\(?\\s*|\\brequire\\s*\\(\\s*)["'](?:${moduleNames})(?:["'/])`,
  );
  const globals = ["docu" + "ment.", "win" + "dow."];
  const inchConstants = ["25" + ".4", "304" + ".8"];
  const sources = readdirSync(__dirname).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));

  it("finds the writers to check", () => {
    for (const writer of ["zip.ts", "stl.ts", "dxf.ts", "xyz.ts", "cnc-files.ts", "md5.ts", "des.ts", "brd-scramble.ts", "brd.ts"]) expect(sources).toContain(writer);
  });

  it.each(sources)("%s imports no three.js or React, names no browser global and carries no inch constant", (name) => {
    const source = readFileSync(join(__dirname, name), "utf8");
    expect(importForm.test(source)).toBe(false);
    for (const g of globals) expect(source.includes(g), g).toBe(false);
    for (const c of inchConstants) expect(source.includes(c), c).toBe(false);
  });

  it("would catch each import form it looks for", () => {
    const th = modules[0];
    for (const form of [`from "${th}"`, `import "${th}"`, `require("${th}")`, `import("${th}/addons")`, `from '${modules[1]}'`]) {
      expect(importForm.test(form), form).toBe(true);
    }
    expect(importForm.test(`from "${th}-ish-not"`)).toBe(false);
  });
});
