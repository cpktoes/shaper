import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildBoardSurface, SURFACE_FACE, type BoardSurface, type BoardSurfaceInput } from "./board-surface";
import { renderMesh, stringerLines } from "./board-surface-render";
import {
  designCrossSectionInput,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
  type DesignSummaryFields,
} from "./design";
import { foilStationPoints } from "./foil";
import { buildOutline } from "./outline";
import { phase16Boards } from "./__fixtures__/phase16-boards";

/**
 * What the screen draws of the surface (Phase 16, R3, research Pattern 4): the same vertices, the bottom
 * edge's row drawn twice so it stays as sharp as the ring says, the walls and caps always sharp, and the
 * stringer read off the surface. Every expected normal is worked out here from the surface's own faces.
 */

function surfaceOf(fields: DesignSummaryFields) {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const sections = designCrossSectionInput(geometry, profile, rails, fields.outline.length);
  const input: BoardSurfaceInput = { sections, geometry, rockerAt: profile.rockerAt };
  return { input, geometry, surface: buildBoardSurface(input) };
}

const BOARDS = phase16Boards();
const fieldsOf = (label: string) => BOARDS.find((board) => board.label === label)!.fields;

type V3 = [number, number, number];
const unit = (v: V3): V3 => {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** The area-weighted normal at vertex `v` over the faces whose kind `pick` accepts, worked out afresh. */
function faceNormalAt(surface: BoardSurface, v: number, pick: (kind: number) => boolean): V3 {
  const p = surface.positions;
  const sum: V3 = [0, 0, 0];
  for (let t = 0; t < surface.triangleCount; t++) {
    const [a, b, c] = [0, 1, 2].map((e) => surface.indices[3 * t + e]);
    if (a !== v && b !== v && c !== v) continue;
    if (!pick(surface.faceKinds[t])) continue;
    const u = [p[3 * b] - p[3 * a], p[3 * b + 1] - p[3 * a + 1], p[3 * b + 2] - p[3 * a + 2]];
    const w = [p[3 * c] - p[3 * a], p[3 * c + 1] - p[3 * a + 1], p[3 * c + 2] - p[3 * a + 2]];
    sum[0] += u[1] * w[2] - u[2] * w[1];
    sum[1] += u[2] * w[0] - u[0] * w[2];
    sum[2] += u[0] * w[1] - u[1] * w[0];
  }
  return unit(sum);
}

/** The render mesh's normal of `index`, and of the one copy of surface vertex `v` past the surface's own. */
function normalOf(mesh: ReturnType<typeof renderMesh>, index: number): V3 {
  return [mesh.normals[3 * index], mesh.normals[3 * index + 1], mesh.normals[3 * index + 2]];
}
function copiesOf(mesh: ReturnType<typeof renderMesh>, surface: BoardSurface, v: number): number[] {
  const out: number[] = [];
  const own = surface.positions.length / 3;
  for (let k = own; k < mesh.positions.length / 3; k++) {
    if (
      mesh.positions[3 * k] === mesh.positions[3 * v] &&
      mesh.positions[3 * k + 1] === mesh.positions[3 * v + 1] &&
      mesh.positions[3 * k + 2] === mesh.positions[3 * v + 2]
    ) {
      out.push(k);
    }
  }
  return out;
}

const expectClose = (a: V3, b: V3) => {
  for (let i = 0; i < 3; i++) expect(Math.abs(a[i] - b[i])).toBeLessThan(1e-5);
};
const isStrip = (kind: number) => kind === SURFACE_FACE.upper || kind === SURFACE_FACE.bottom;
const mixUnit = (a: V3, b: V3, t: number): V3 => unit([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);

/** Checks a ring's bottom-edge copies against the normals worked out from its faces at its sharpness. */
function checkBottomEdge(surface: BoardSurface, mesh: ReturnType<typeof renderMesh>, ringIndex: number) {
  const ring = surface.rings[ringIndex];
  expect(ring.bottomEdge).toHaveLength(2);
  for (const offset of ring.bottomEdge) {
    const v = ring.pieces[0].first + offset;
    const smooth = faceNormalAt(surface, v, isStrip);
    const railSide = faceNormalAt(surface, v, (k) => k === SURFACE_FACE.upper);
    const bottomSide = faceNormalAt(surface, v, (k) => k === SURFACE_FACE.bottom);
    const copies = copiesOf(mesh, surface, v);
    expect(copies).toHaveLength(1);
    expectClose(normalOf(mesh, v), mixUnit(smooth, railSide, ring.sharpness));
    expectClose(normalOf(mesh, copies[0]), mixUnit(smooth, bottomSide, ring.sharpness));
  }
}

describe("renderMesh: the surface's own vertices, the bottom edge sharp by marking", () => {
  const hard = surfaceOf(fieldsOf("shortboard|asis|hard"));
  const soft = surfaceOf(fieldsOf("shortboard|asis|soft"));
  const anchors = foilStationPoints(hard.input.sections.foil, hard.input.sections.length);

  it("keeps every surface vertex, in order, and adds only copies of them", () => {
    for (const { surface } of [hard, soft]) {
      const mesh = renderMesh(surface);
      const own = surface.positions.length;
      expect(mesh.positions.length).toBeGreaterThan(own);
      expect(Array.from(mesh.positions.subarray(0, own))).toEqual(Array.from(Float32Array.from(surface.positions)));
      expect(mesh.indices.length).toBe(surface.indices.length);
      expect(mesh.normals.length).toBe(mesh.positions.length);
      // Each drawn triangle is the surface's triangle at the very same points.
      let moved = 0;
      for (let i = 0; i < surface.indices.length; i++) {
        for (let a = 0; a < 3; a++) {
          if (mesh.positions[3 * mesh.indices[i] + a] !== Math.fround(surface.positions[3 * surface.indices[i] + a])) moved++;
        }
      }
      expect(moved).toBe(0);
    }
  });

  it("gives every vertex a unit-length normal", () => {
    for (const { surface } of [hard, soft]) {
      const mesh = renderMesh(surface);
      for (let k = 0; k < mesh.normals.length / 3; k++) {
        expect(Math.abs(Math.hypot(...normalOf(mesh, k)) - 1)).toBeLessThan(1e-6);
      }
    }
  });

  it("a hard-edged ring (sharpness 1) splits the bottom edge into the rail's and the bottom's own normals", () => {
    const mesh = renderMesh(hard.surface);
    const i = hard.surface.rings.findIndex((ring) => ring.station > anchors[1].station * 0.5 && ring.sharpness === 1);
    expect(i).toBeGreaterThan(0);
    checkBottomEdge(hard.surface, mesh, i);
  });

  it("a tucked ring (sharpness 0) draws both copies with the one smooth normal", () => {
    const mesh = renderMesh(soft.surface);
    const i = soft.surface.rings.findIndex((ring) => ring.station >= anchors[2].station);
    expect(soft.surface.rings[i].sharpness).toBe(0);
    checkBottomEdge(soft.surface, mesh, i);
    const v = soft.surface.rings[i].pieces[0].first + soft.surface.rings[i].bottomEdge[0];
    expectClose(normalOf(mesh, v), normalOf(mesh, copiesOf(mesh, soft.surface, v)[0]));
  });

  it("a fading ring leans each copy toward its own side by the hard weight", () => {
    const mesh = renderMesh(hard.surface);
    const i = hard.surface.rings.findIndex((ring) => ring.sharpness > 0.3 && ring.sharpness < 0.7);
    expect(i).toBeGreaterThan(0);
    checkBottomEdge(hard.surface, mesh, i);
  });

  it("a Sharp Bottom Tuck station is drawn sharp", () => {
    const fields = fieldsOf("shortboard|asis|soft");
    const tucked: DesignSummaryFields = {
      ...fields,
      rails: { ...fields.rails, center: { ...fields.rails.center, sharpBottomTuck: true } },
    };
    const { surface } = surfaceOf(tucked);
    const i = surface.rings.findIndex((ring) => ring.station >= anchors[2].station);
    expect(surface.rings[i].sharpness).toBe(1);
    checkBottomEdge(surface, renderMesh(surface), i);
  });

  it("a swallow's notch walls and a square tail's cap get their own copies, always sharp", () => {
    for (const label of ["fish|asis|soft", "shortboard|asis|soft"]) {
      const { surface } = surfaceOf(fieldsOf(label));
      const mesh = renderMesh(surface);
      const p = surface.positions;
      // Each wall's and cap's own area-weighted normal at each of its vertices, summed afresh.
      const sums = new Map<string, V3>();
      for (let t = 0; t < surface.triangleCount; t++) {
        const kind = surface.faceKinds[t];
        if (isStrip(kind)) continue;
        const [a, b, c] = [0, 1, 2].map((e) => surface.indices[3 * t + e]);
        const u = [p[3 * b] - p[3 * a], p[3 * b + 1] - p[3 * a + 1], p[3 * b + 2] - p[3 * a + 2]];
        const w = [p[3 * c] - p[3 * a], p[3 * c + 1] - p[3 * a + 1], p[3 * c + 2] - p[3 * a + 2]];
        const n: V3 = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
        for (const v of [a, b, c]) {
          const s = sums.get(`${v}|${kind}`) ?? [0, 0, 0];
          sums.set(`${v}|${kind}`, [s[0] + n[0], s[1] + n[1], s[2] + n[2]]);
        }
      }
      expect(sums.size).toBeGreaterThan(0);
      let shared = 0;
      let off = 0;
      for (let t = 0; t < surface.triangleCount; t++) {
        const kind = surface.faceKinds[t];
        if (isStrip(kind)) continue;
        for (let e = 0; e < 3; e++) {
          const drawn = mesh.indices[3 * t + e];
          if (drawn < surface.positions.length / 3) shared++;
          const want = unit(sums.get(`${surface.indices[3 * t + e]}|${kind}`)!);
          const got = normalOf(mesh, drawn);
          if (Math.max(...[0, 1, 2].map((i) => Math.abs(got[i] - want[i]))) > 1e-5) off++;
        }
      }
      expect(shared).toBe(0);
      expect(off).toBe(0);
    }
  });
});

describe("stringerLines: the painted stringer, read off the surface (D-07)", () => {
  for (const label of ["shortboard|asis|hard", "fish|asis|hard", "midlength|diamond|soft", "longboard|pin|soft"]) {
    it(`${label}: the deck line runs over each ring's stringer point, tail to nose; a swallow's starts at the crotch`, () => {
      const { geometry, surface } = surfaceOf(fieldsOf(label));
      const { deck, bottom } = stringerLines(surface);
      const p = surface.positions;
      const swallow = geometry.centreCloseStation > geometry.points[0].station;
      const from = swallow ? geometry.centreCloseStation : 0;
      const rings = surface.rings.filter((ring) => ring.station >= from);
      // Every deck-line point at a ring's station is that ring's own stringer point on the deck.
      for (const ring of rings) {
        const top = ring.pieces[0].first; // the loop starts at the deck's stringer point
        expect(deck.some((q) => q[0] === p[3 * top] && q[1] === p[3 * top + 1] && q[2] === p[3 * top + 2])).toBe(true);
        expect(p[3 * top + 1]).toBe(0);
      }
      for (const q of [...deck, ...bottom]) expect(Math.abs(q[1])).toBeLessThanOrEqual(1e-9);
      expect(deck[0][0]).toBe(from);
      expect(bottom[0][0]).toBe(from);
      // Round the nose: both lines end at the nose tip.
      expect(deck[deck.length - 1]).toEqual(bottom[bottom.length - 1]);
      expect(deck[deck.length - 1][0]).toBe(surface.length);
      // Tail to nose, never back.
      for (let i = 1; i < bottom.length; i++) expect(bottom[i][0]).toBeGreaterThan(bottom[i - 1][0]);
      if (swallow) {
        // Up the crotch's face first: the deck line starts at the crotch's bottom and climbs to its deck.
        const atCrotch = deck.filter((q) => q[0] === from);
        expect(atCrotch.length).toBeGreaterThan(2);
        for (let i = 1; i < atCrotch.length; i++) expect(atCrotch[i][2]).toBeGreaterThan(atCrotch[i - 1][2]);
      }
    });
  }
});

describe("the render file is pure (C5)", () => {
  it("imports no React, three or browser API", () => {
    const source = readFileSync(join(__dirname, "board-surface-render.ts"), "utf8");
    expect(source).not.toMatch(/from ["'](react|three)/);
    expect(source).not.toMatch(/document\.|window\./);
  });
});
