import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_SPEC, type OutlineSpec } from "./board";
import { deriveEffectiveFins } from "./design";
import { DEFAULT_FIN_PLACEMENT_SPEC, computeFinPlacement, importedFinTailFromOutline, type FinPlacementSpec } from "./fins";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm, mm } from "./units";
import { frontFinEdges, resolveWingStations } from "./wing-lock";
import type { FrontFinEdges, Wing, WingLock } from "./wings";

// A wing locked to the front fin (quick 261014-wii, 2026-10-14, D8, P2, P3). Every expected value is
// read off the app's own fin placement — never a typed answer (CLAUDE.md Rule 1).

/** The fins exactly as FINS places them with Import Template ticked (or not). */
function placeFins(outline: OutlineSpec, fins: FinPlacementSpec, importTemplate = true) {
  const g = buildOutline(outline);
  const effective = deriveEffectiveFins(fins, importTemplate, outline, g);
  return computeFinPlacement(effective, importTemplate ? importedFinTailFromOutline(g) : null);
}

function edgesOf(outline: OutlineSpec, fins: FinPlacementSpec, importTemplate = true): FrontFinEdges {
  const edges = frontFinEdges(placeFins(outline, fins, importTemplate).marks);
  if (!edges) throw new Error("this fin setup has no front fin");
  return edges;
}

function lockedWing(station: number, lock: WingLock, offsetIn: number): Wing {
  return {
    station: mm(station),
    depth: inchesToMm(3 / 8),
    run: inchesToMm(1 / 4),
    radius: mm(0),
    lock,
    finOffset: inchesToMm(offsetIn),
  };
}

/** A 6'0" McKee SB thruster on a narrow squash tail — the one corner where a wing moves its own
 * target (the 12" width at or under 12.5" moves the front fin, F19). */
const NARROW: OutlineSpec = {
  ...DEFAULT_BOARD_SPEC.outline,
  tail: { kind: "squash", endWidth: inchesToMm(2) },
  tailFullness: 2.75,
};

describe("frontFinEdges reads the front fin's edges off FINS' placement", () => {
  it.each([{ id: "default", outline: DEFAULT_BOARD_SPEC.outline, fins: DEFAULT_FIN_PLACEMENT_SPEC }, ...BOARD_PRESETS])(
    "$id",
    ({ outline, fins }) => {
      const marks = placeFins(outline, fins).marks;
      const front = marks.find((m) => m.role === "front");
      const edges = frontFinEdges(marks);
      if (fins.finSetup === "single") {
        expect(front).toBeUndefined();
        expect(edges).toBeNull();
        return;
      }
      expect(edges).toEqual({ trailing: front!.offTail, leading: front!.leadingOffTail });
    },
  );
});

describe("resolveWingStations keeps a locked wing on its fin edge (D8, P2, P3)", () => {
  it("no locked wing hands back the same outline, untouched", () => {
    const outline = { ...DEFAULT_BOARD_SPEC.outline, wings: [lockedWing(inchesToMm(11), null, 0)] };
    const result = resolveWingStations(outline, DEFAULT_FIN_PLACEMENT_SPEC, true);
    expect(result.outline).toBe(outline);
    expect(result.passes).toBe(0);
    const bare = DEFAULT_BOARD_SPEC.outline;
    expect(resolveWingStations(bare, DEFAULT_FIN_PLACEMENT_SPEC, true).outline).toBe(bare);
  });

  it("the default board: a wing at its fin's trailing edge settles in one pass, unsnapped", () => {
    const edges = edgesOf(DEFAULT_BOARD_SPEC.outline, DEFAULT_FIN_PLACEMENT_SPEC);
    const outline = { ...DEFAULT_BOARD_SPEC.outline, wings: [lockedWing(edges.trailing, "front-trailing", 0)] };
    const result = resolveWingStations(outline, DEFAULT_FIN_PLACEMENT_SPEC, true);
    expect(result.passes).toBe(1);
    expect(Math.abs(result.outline.wings![0].station - edges.trailing)).toBeLessThan(1e-9);
    // P3: not snapped to 1/16" — the FINS page's own edge, exactly.
    expect(result.outline).toBe(outline);
  });

  it("a narrow tail: a wing locked 1 inch ahead of the trailing edge follows the fin it moves, in two or three passes", ({ annotate }) => {
    const bare = buildOutline(NARROW);
    expect(bare.tailWidthAt12in).toBeLessThanOrEqual(inchesToMm(12.5));
    const start = edgesOf(NARROW, DEFAULT_FIN_PLACEMENT_SPEC).trailing + inchesToMm(1);
    const outline = { ...NARROW, wings: [lockedWing(start, "front-trailing", 1)] };
    const result = resolveWingStations(outline, DEFAULT_FIN_PLACEMENT_SPEC, true);
    expect(result.passes).toBeGreaterThan(1);
    expect(result.passes).toBeLessThanOrEqual(3);
    const station = result.outline.wings![0].station;
    const onResult = edgesOf(result.outline, DEFAULT_FIN_PLACEMENT_SPEC).trailing + inchesToMm(1);
    const gap = Math.abs(station - onResult);
    expect(gap).toBeLessThan(inchesToMm(1 / 32));
    expect(buildOutline(result.outline).tailWidthAt12in).toBeLessThan(bare.tailWidthAt12in);
    annotate(`passes ${result.passes}, residual gap ${gap.toFixed(4)} mm`);
  });

  it("a narrow tail: a wing locked at the leading edge settles in at most three passes", () => {
    const start = edgesOf(NARROW, DEFAULT_FIN_PLACEMENT_SPEC).leading;
    const outline = { ...NARROW, wings: [lockedWing(start, "front-leading", 0)] };
    const result = resolveWingStations(outline, DEFAULT_FIN_PLACEMENT_SPEC, true);
    expect(result.passes).toBeGreaterThanOrEqual(1);
    expect(result.passes).toBeLessThanOrEqual(3);
  });

  it("a quad on a normal tail settles in one pass — its fins never read the 12-inch width above 12.5 inches", () => {
    const quad: FinPlacementSpec = { ...DEFAULT_FIN_PLACEMENT_SPEC, finSetup: "quad", quadRearModel: "mckeeSB" };
    const start = edgesOf(DEFAULT_BOARD_SPEC.outline, quad).leading;
    const outline = { ...DEFAULT_BOARD_SPEC.outline, wings: [lockedWing(start, "front-leading", 0)] };
    const result = resolveWingStations(outline, quad, true);
    expect(result.passes).toBe(1);
  });

  it("with Import Template off the wing follows the standalone calculator's front fin", () => {
    const standalone = frontFinEdges(computeFinPlacement(DEFAULT_FIN_PLACEMENT_SPEC).marks)!;
    const target = standalone.trailing + inchesToMm(1);
    const atTarget = { ...DEFAULT_BOARD_SPEC.outline, wings: [lockedWing(target, "front-trailing", 1)] };
    const settled = resolveWingStations(atTarget, DEFAULT_FIN_PLACEMENT_SPEC, false);
    expect(settled.passes).toBe(1);
    expect(settled.outline).toBe(atTarget);
    const elsewhere = { ...DEFAULT_BOARD_SPEC.outline, wings: [lockedWing(inchesToMm(20), "front-trailing", 1)] };
    const moved = resolveWingStations(elsewhere, DEFAULT_FIN_PLACEMENT_SPEC, false);
    expect(moved.outline.wings![0].station).toBe(target);
  });

  it("a fin setup with no front fin cannot lock: the outline comes back untouched", () => {
    const longboard = BOARD_PRESETS.find((p) => p.id === "longboard")!;
    const outline = { ...longboard.outline, wings: [lockedWing(inchesToMm(11), "front-trailing", 0)] };
    const result = resolveWingStations(outline, longboard.fins, true);
    expect(result.outline).toBe(outline);
    expect(result.passes).toBe(0);
  });
});
