import { describe, expect, it } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { GHOST_RING_POINTS, buildBlankGhost } from "./blank-ghost";
import { buildBlankTopView } from "./blank-top-view";
import { buildBoardSurface, enclosedVolumeMm3, meshCheck } from "./board-surface";
import type { BlankSideView } from "./board-profile";
import { LIVE_DESIGN_RULES, designCrossSectionInput, designSideProfile } from "./design";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { mm } from "./units";

/**
 * Phase 16 D-08 (UI-SPEC §3 "The blank ghost"): the blank ROCKER draws, as a see-through shell round the 3D board.
 * Every expected value is read from the app's own functions — the top view's outline (`buildBlankTopView`) and the
 * side view's bottom and deck (`BlankSideView`) — never a typed number. Positions are stored as 32-bit floats for the
 * screen, so each is compared with its expected value rounded the same way (`Math.fround`), to 1e-6 mm.
 */

/** ROCKER's own sampling of the top view (components/rocker/rocker-top-view.tsx), and a coarser one. */
const SAMPLINGS = [120, 40];

const NO_FOAM_MM = 1e-3;

function presetCase(preset: (typeof BOARD_PRESETS)[number], samples: number) {
  const fields = presetDesignFields(preset);
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const top = buildBlankTopView({ blank: profile.blank, geometry, length: profile.length, samples });
  return { name: preset.name, fields, geometry, profile, top };
}

const CASES = SAMPLINGS.flatMap((samples) => BOARD_PRESETS.map((preset) => presetCase(preset, samples)));

function vertex(positions: Float32Array, v: number): [number, number, number] {
  return [positions[3 * v], positions[3 * v + 1], positions[3 * v + 2]];
}

function near(got: number, want: number) {
  expect(Math.abs(got - Math.fround(want))).toBeLessThanOrEqual(1e-6);
}

describe("buildBlankGhost", () => {
  it("is null on a hand-set board, which has no blank", () => {
    const { geometry, profile } = CASES[0];
    const top = buildBlankTopView({ blank: null, geometry, length: profile.length, samples: 120 });
    expect(buildBlankGhost(null, top)).toBeNull();
  });

  it("every preset opens in a blank, so every preset has a ghost", () => {
    for (const c of CASES) {
      expect(c.profile.blank, c.name).not.toBeNull();
      expect(buildBlankGhost(c.profile.blank, c.top), c.name).not.toBeNull();
    }
  });

  it.each(CASES.map((c) => [`${c.name} (${c.top.blankOutline.length} stations)`, c] as const))(
    "%s: each section is the top view's half-width and the side view's deck and bottom",
    (_, c) => {
      const blank = c.profile.blank!;
      const ghost = buildBlankGhost(blank, c.top)!;
      const rings = c.top.blankOutline.filter(
        (s) => s.halfWidth > NO_FOAM_MM && blank.deckAt(s.station) - blank.bottomAt(s.station) > NO_FOAM_MM,
      );
      expect(ghost.positions.length / 3).toBe(rings.length * GHOST_RING_POINTS + 2);
      const quarter = GHOST_RING_POINTS / 4;
      rings.forEach(({ station, halfWidth }, i) => {
        const base = i * GHOST_RING_POINTS;
        const deck = blank.deckAt(station);
        const bottom = blank.bottomAt(station);
        const mid = (deck + bottom) / 2;
        // The deck and the bottom on the stringer, at the section's centre.
        const top = vertex(ghost.positions, base);
        near(top[0], station);
        near(top[1], 0);
        near(top[2], deck);
        const under = vertex(ghost.positions, base + 2 * quarter);
        near(under[1], 0);
        near(under[2], bottom);
        // The two rails' apexes: the top view's half-width, at mid-thickness.
        for (const [k, side] of [
          [quarter, 1],
          [3 * quarter, -1],
        ] as const) {
          const apex = vertex(ghost.positions, base + k);
          near(apex[0], station);
          near(apex[1], side * halfWidth);
          near(apex[2], mid);
        }
        // Nothing in the section is wider than the apex, higher than the deck or lower than the bottom.
        for (let j = 0; j < GHOST_RING_POINTS; j++) {
          const [x, y, z] = vertex(ghost.positions, base + j);
          expect(x).toBe(Math.fround(station));
          expect(Math.abs(y)).toBeLessThanOrEqual(Math.fround(halfWidth) + 1e-6);
          expect(z).toBeLessThanOrEqual(Math.fround(deck) + 1e-4);
          expect(z).toBeGreaterThanOrEqual(Math.fround(bottom) - 1e-4);
        }
      });
    },
  );

  it.each(CASES.map((c) => [c.name, c] as const))("%s: the skin is closed, wound outward, with unit normals", (_, c) => {
    const ghost = buildBlankGhost(c.profile.blank, c.top)!;
    expect(meshCheck(ghost)).toEqual({ openEdges: 0, nonManifoldEdges: 0, misWoundEdges: 0, zeroAreaTriangles: 0 });
    expect(enclosedVolumeMm3(ghost)).toBeGreaterThan(0);
    for (let v = 0; v < ghost.normals.length / 3; v++) {
      expect(Math.hypot(ghost.normals[3 * v], ghost.normals[3 * v + 1], ghost.normals[3 * v + 2])).toBeCloseTo(1, 5);
    }
  });

  it.each(BOARD_PRESETS.map((p) => [p.name, presetCase(p, 120)] as const))(
    "%s: the blank holds more foam than the board cut from it",
    (_, c) => {
      const ghost = buildBlankGhost(c.profile.blank, c.top)!;
      const surface = buildBoardSurface({
        sections: designCrossSectionInput(c.geometry, c.profile, c.fields.rails, c.profile.length),
        geometry: c.geometry,
        rockerAt: c.profile.rockerAt,
      });
      expect(enclosedVolumeMm3(ghost)).toBeGreaterThan(enclosedVolumeMm3(surface));
    },
  );

  it.each(CASES.map((c) => [c.name, c] as const))("%s: its outline runs round the widest point of every station", (_, c) => {
    const blank = c.profile.blank!;
    const ghost = buildBlankGhost(blank, c.top)!;
    const stations = c.top.blankOutline;
    const foam = (s: (typeof stations)[number]) =>
      s.halfWidth > NO_FOAM_MM && blank.deckAt(s.station) - blank.bottomAt(s.station) > NO_FOAM_MM;
    const rings = stations.filter(foam);
    const tips = [stations[0], stations[stations.length - 1]].filter((s) => !foam(s)).length;
    expect(ghost.outline).toHaveLength(2 * rings.length + tips);
    const key = (p: readonly number[]) => p.map((v) => v.toFixed(6)).join(" ");
    const loop = new Set(ghost.outline.map(key));
    for (const s of rings) {
      const mid = (blank.deckAt(s.station) + blank.bottomAt(s.station)) / 2;
      expect(loop.has(key([s.station, s.halfWidth, mid]))).toBe(true);
      expect(loop.has(key([s.station, -s.halfWidth, mid]))).toBe(true);
    }
  });

  it("a tip printed 0 wide closes to a point on the stringer; a tip with width closes flat", () => {
    for (const c of CASES) {
      const blank = c.profile.blank!;
      const ghost = buildBlankGhost(blank, c.top)!;
      const n = ghost.positions.length / 3;
      const stations = c.top.blankOutline;
      for (const [tip, index] of [
        [stations[0], n - 2],
        [stations[stations.length - 1], n - 1],
      ] as const) {
        const point = vertex(ghost.positions, index);
        near(point[0], tip.station);
        near(point[1], 0);
        near(point[2], (blank.deckAt(tip.station) + blank.bottomAt(tip.station)) / 2);
      }
    }
  });

  it("a blank figure that is not a number gives no ghost rather than a broken shape (T-16-23)", () => {
    const c = CASES[0];
    const blank = c.profile.blank!;
    for (const broken of [
      { ...blank, bottomAt: () => mm(Number.NaN) },
      { ...blank, deckAt: () => mm(Number.POSITIVE_INFINITY) },
    ] satisfies BlankSideView[]) {
      expect(buildBlankGhost(broken, c.top)).toBeNull();
    }
    const top = { ...c.top, blankOutline: c.top.blankOutline.map((s, i) => (i === 3 ? { ...s, halfWidth: mm(Number.NaN) } : s)) };
    expect(buildBlankGhost(blank, top)).toBeNull();
  });
});
