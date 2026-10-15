import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_SPEC, type OutlineSpec } from "./board";
import { deriveEffectiveFins } from "./design";
import { DEFAULT_FIN_PLACEMENT_SPEC, computeFinPlacement, importedFinTailFromOutline, type FinPlacementSpec } from "./fins";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm, mm } from "./units";
import { lockedWingStation, resolveWingStations, wingFinBoxWarning, wingFinEdges } from "./wing-lock";
import { wingFinBoxDistance, wingOrderGap, wingPositionTop, type Wing, type WingFinEdges, type WingLock } from "./wings";

// A wing locked to the fins (quick 261014-wii, 2026-10-14, D8, P2, P3; the slot locks, the order rule
// and the top, quick 261015-hz7, 2026-10-15, D1–D3). Every expected value is read off the app's own
// fin placement and outline — never a typed answer (CLAUDE.md Rule 1).

/** The fins exactly as FINS places them with Import Template ticked (or not). */
function placeFins(outline: OutlineSpec, fins: FinPlacementSpec, importTemplate = true) {
  const g = buildOutline(outline);
  const effective = deriveEffectiveFins(fins, importTemplate, outline, g);
  return computeFinPlacement(effective, importTemplate ? importedFinTailFromOutline(g) : null);
}

function edgesOf(outline: OutlineSpec, fins: FinPlacementSpec, importTemplate = true): WingFinEdges {
  return wingFinEdges(placeFins(outline, fins, importTemplate).marks);
}

function frontOf(outline: OutlineSpec, fins: FinPlacementSpec, importTemplate = true): number {
  const front = edgesOf(outline, fins, importTemplate).front;
  if (front === null) throw new Error("this fin setup has no front fin");
  return front;
}

function lockedWing(station: number, lock: WingLock, offsetIn: number, depthIn = 3 / 8, runIn = 1 / 4): Wing {
  return {
    station: mm(station),
    depth: inchesToMm(depthIn),
    run: inchesToMm(runIn),
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

const MIDLENGTH = BOARD_PRESETS.find((p) => p.id === "midlength")!;
const SHORTBOARD = BOARD_PRESETS.find((p) => p.id === "shortboard")!;
const LONGBOARD = BOARD_PRESETS.find((p) => p.id === "longboard")!;
const SHORTBOARD_QUAD: FinPlacementSpec = { ...SHORTBOARD.fins, finSetup: "quad" };

describe("wingFinEdges reads the front and rear fins' trailing edges off FINS' placement (D1)", () => {
  it.each([
    { id: "default", outline: DEFAULT_BOARD_SPEC.outline, fins: DEFAULT_FIN_PLACEMENT_SPEC },
    ...BOARD_PRESETS,
    { id: "shortboard as a quad", outline: SHORTBOARD.outline, fins: SHORTBOARD_QUAD },
  ])("$id", ({ outline, fins }) => {
    const marks = placeFins(outline, fins).marks;
    const front = marks.find((m) => m.role === "front");
    const rear = marks.find((m) => m.role === "rear");
    expect(wingFinEdges(marks)).toEqual({ front: front ? front.offTail : null, rear: rear ? rear.offTail : null });
    if (fins.finSetup === "single") expect(front).toBeUndefined();
    if (fins.finSetup === "quad") expect(rear).toBeDefined();
    else expect(rear).toBeUndefined();
  });
});

describe("lockedWingStation follows the slot's own trailing edge (D1, D3)", () => {
  const g = buildOutline(MIDLENGTH.outline);
  const edges = edgesOf(MIDLENGTH.outline, MIDLENGTH.fins);

  it("wing 1 follows the front fins, wing 2 the rear fins, each plus its offset", () => {
    expect(lockedWingStation(lockedWing(0, "front-trailing", 1), 0, edges, g)).toBe(edges.front! + inchesToMm(1));
    expect(lockedWingStation(lockedWing(0, "rear-trailing", -1), 1, edges, g)).toBe(edges.rear! - inchesToMm(1));
  });

  it("a lock its slot may not hold, or a wing by hand, keeps its own station", () => {
    const station = inchesToMm(20);
    expect(lockedWingStation(lockedWing(station, "rear-trailing", 0), 0, edges, g)).toBe(station);
    expect(lockedWingStation(lockedWing(station, "front-trailing", 0), 1, edges, g)).toBe(station);
    expect(lockedWingStation(lockedWing(station, null, 0), 0, edges, g)).toBe(station);
  });

  it("never past the top", () => {
    const far = { front: mm(wingPositionTop(g) + inchesToMm(2)), rear: null };
    expect(lockedWingStation(lockedWing(0, "front-trailing", 0), 0, far, g)).toBe(wingPositionTop(g));
  });
});

describe("resolveWingStations keeps a locked wing on its fin edge (D8, P2, P3)", () => {
  it("no wings, one wing by hand, and two in-order wings by hand hand back the same outline with 0 passes", () => {
    const bare = DEFAULT_BOARD_SPEC.outline;
    expect(resolveWingStations(bare, DEFAULT_FIN_PLACEMENT_SPEC, true)).toEqual({ outline: bare, passes: 0 });
    const one = { ...bare, wings: [lockedWing(inchesToMm(11), null, 0)] };
    const result = resolveWingStations(one, DEFAULT_FIN_PLACEMENT_SPEC, true);
    expect(result.outline).toBe(one);
    expect(result.passes).toBe(0);
    const two = { ...bare, wings: [lockedWing(inchesToMm(11), null, 0), lockedWing(inchesToMm(8), null, 0)] };
    const both = resolveWingStations(two, DEFAULT_FIN_PLACEMENT_SPEC, true);
    expect(both.outline).toBe(two);
    expect(both.passes).toBe(0);
  });

  it("the default board: a wing at its fin's trailing edge settles in one pass, unsnapped", () => {
    const trailing = frontOf(DEFAULT_BOARD_SPEC.outline, DEFAULT_FIN_PLACEMENT_SPEC);
    const outline = { ...DEFAULT_BOARD_SPEC.outline, wings: [lockedWing(trailing, "front-trailing", 0)] };
    const result = resolveWingStations(outline, DEFAULT_FIN_PLACEMENT_SPEC, true);
    expect(result.passes).toBe(1);
    expect(Math.abs(result.outline.wings![0].station - trailing)).toBeLessThan(1e-9);
    // P3: not snapped to 1/16" — the FINS page's own edge, exactly.
    expect(result.outline).toBe(outline);
  });

  it("a narrow tail: a wing locked 1 inch ahead of the trailing edge follows the fin it moves, in two or three passes", ({ annotate }) => {
    const bare = buildOutline(NARROW);
    expect(bare.tailWidthAt12in).toBeLessThanOrEqual(inchesToMm(12.5));
    const start = frontOf(NARROW, DEFAULT_FIN_PLACEMENT_SPEC) + inchesToMm(1);
    const outline = { ...NARROW, wings: [lockedWing(start, "front-trailing", 1)] };
    const result = resolveWingStations(outline, DEFAULT_FIN_PLACEMENT_SPEC, true);
    expect(result.passes).toBeGreaterThan(1);
    expect(result.passes).toBeLessThanOrEqual(3);
    const station = result.outline.wings![0].station;
    const onResult = frontOf(result.outline, DEFAULT_FIN_PLACEMENT_SPEC) + inchesToMm(1);
    const gap = Math.abs(station - onResult);
    expect(gap).toBeLessThan(inchesToMm(1 / 32));
    expect(buildOutline(result.outline).tailWidthAt12in).toBeLessThan(bare.tailWidthAt12in);
    annotate(`passes ${result.passes}, residual gap ${gap.toFixed(4)} mm`);
  });

  it("with Import Template off the wing follows the standalone calculator's front fin", () => {
    const standalone = wingFinEdges(computeFinPlacement(DEFAULT_FIN_PLACEMENT_SPEC).marks).front!;
    const target = standalone + inchesToMm(1);
    const atTarget = { ...DEFAULT_BOARD_SPEC.outline, wings: [lockedWing(target, "front-trailing", 1)] };
    const settled = resolveWingStations(atTarget, DEFAULT_FIN_PLACEMENT_SPEC, false);
    expect(settled.passes).toBe(1);
    expect(settled.outline).toBe(atTarget);
    const elsewhere = { ...DEFAULT_BOARD_SPEC.outline, wings: [lockedWing(inchesToMm(20), "front-trailing", 1)] };
    const moved = resolveWingStations(elsewhere, DEFAULT_FIN_PLACEMENT_SPEC, false);
    expect(moved.outline.wings![0].station).toBe(target);
  });

  it("a fin setup with no front fin cannot lock: the outline comes back untouched", () => {
    const outline = { ...LONGBOARD.outline, wings: [lockedWing(inchesToMm(11), "front-trailing", 0)] };
    const result = resolveWingStations(outline, LONGBOARD.fins, true);
    expect(result.outline).toBe(outline);
    expect(result.passes).toBe(0);
  });
});

describe("wing 2 locks to a quad's rear fins and always sits behind wing 1 (D1, D2, D3)", () => {
  const edges = edgesOf(MIDLENGTH.outline, MIDLENGTH.fins);
  const g = buildOutline(MIDLENGTH.outline);

  it("the Mid-length quad: wing 2 rear-locked settles on the rear trailing edge", () => {
    const outline = {
      ...MIDLENGTH.outline,
      wings: [lockedWing(edges.front!, "front-trailing", 0, 3 / 16), lockedWing(edges.rear!, "rear-trailing", 0, 3 / 16, 1 / 2)],
    };
    const result = resolveWingStations(outline, MIDLENGTH.fins, true);
    const settled = edgesOf(result.outline, MIDLENGTH.fins);
    expect(Math.abs(result.outline.wings![1].station - settled.rear!)).toBeLessThan(inchesToMm(1 / 32));
    expect(result.passes).toBeLessThanOrEqual(3);
  });

  it("wing 1 with a 2 inch run at offset -3 inches holds wing 2 at wing 1 less 4 inches", ({ annotate }) => {
    const w1 = lockedWing(edges.front!, "front-trailing", -3, 3 / 16, 2);
    const outline = { ...MIDLENGTH.outline, wings: [w1, lockedWing(edges.rear!, "rear-trailing", 0, 3 / 16, 1 / 2)] };
    const result = resolveWingStations(outline, MIDLENGTH.fins, true);
    const [r1, r2] = result.outline.wings!;
    const front = edgesOf(result.outline, MIDLENGTH.fins).front!;
    expect(Math.abs(r1.station - (front - inchesToMm(3)))).toBeLessThan(inchesToMm(1 / 32));
    expect(wingOrderGap(r1)).toBe(2 * inchesToMm(2));
    expect(Math.abs(r2.station - (r1.station - wingOrderGap(r1)))).toBeLessThan(1e-9);
    // Held: its own target (the rear trailing edge) is nose-ward of the limit.
    expect(edgesOf(result.outline, MIDLENGTH.fins).rear!).toBeGreaterThan(r2.station);
    expect(result.passes).toBeLessThanOrEqual(3);
    annotate(`wing 1 ${(r1.station / 25.4).toFixed(4)}", wing 2 ${(r2.station / 25.4).toFixed(4)}", passes ${result.passes}`);
  });

  it("a wing 2 placed by hand is pushed toward the tail by a locked wing 1", () => {
    const outline = {
      ...MIDLENGTH.outline,
      wings: [lockedWing(edges.front!, "front-trailing", -3, 3 / 16, 1 / 4), lockedWing(inchesToMm(10), null, 0, 3 / 16, 1 / 2)],
    };
    const result = resolveWingStations(outline, MIDLENGTH.fins, true);
    const [r1, r2] = result.outline.wings!;
    expect(r2.station).toBeLessThan(inchesToMm(10));
    expect(Math.abs(r2.station - (r1.station - wingOrderGap(r1)))).toBeLessThan(1e-9);
  });

  it("never pushes wing 2 past 2 inches: no room puts it on the floor", () => {
    const outline = {
      ...MIDLENGTH.outline,
      wings: [lockedWing(inchesToMm(3), null, 0, 3 / 16, 2), lockedWing(inchesToMm(2.5), null, 0, 3 / 16, 1 / 2)],
    };
    const result = resolveWingStations(outline, MIDLENGTH.fins, true);
    expect(result.outline.wings![1].station).toBe(inchesToMm(2));
    expect(result.passes).toBe(0);
  });

  it("a rear lock on a thruster and a front lock on wing 2 are inert: the stored station is kept", () => {
    const thruster = {
      ...DEFAULT_BOARD_SPEC.outline,
      wings: [lockedWing(inchesToMm(11), null, 0, 3 / 16), lockedWing(inchesToMm(6), "rear-trailing", 0, 3 / 16, 1 / 2)],
    };
    const t = resolveWingStations(thruster, DEFAULT_FIN_PLACEMENT_SPEC, true);
    expect(t.outline).toBe(thruster);
    expect(t.passes).toBe(0);
    const wrongSlot = {
      ...MIDLENGTH.outline,
      wings: [lockedWing(inchesToMm(14), null, 0, 3 / 16), lockedWing(inchesToMm(6), "front-trailing", 0, 3 / 16, 1 / 2)],
    };
    const w = resolveWingStations(wrongSlot, MIDLENGTH.fins, true);
    expect(w.outline).toBe(wrongSlot);
    expect(w.passes).toBe(0);
  });

  it("a wing stored past the top resolves to the top", () => {
    const outline = { ...MIDLENGTH.outline, wings: [lockedWing(inchesToMm(60), null, 0, 3 / 16)] };
    const result = resolveWingStations(outline, MIDLENGTH.fins, true);
    expect(result.outline.wings![0].station).toBe(wingPositionTop(g));
    expect(outline.wings[0].station).toBe(inchesToMm(60));
  });

  it("settles in at most three passes over both quads, offsets -3 to +3 inches and depths 1/16 to 1 inch", ({ annotate }) => {
    let worst = 0;
    let worstResidual = 0;
    for (const board of [
      { outline: MIDLENGTH.outline, fins: MIDLENGTH.fins },
      { outline: SHORTBOARD.outline, fins: SHORTBOARD_QUAD },
    ]) {
      const e = edgesOf(board.outline, board.fins);
      for (const offsetIn of [-3, 0, 3]) {
        for (const depthIn of [1 / 16, 1 / 2, 1]) {
          const outline = {
            ...board.outline,
            wings: [
              lockedWing(e.front!, "front-trailing", offsetIn, depthIn),
              lockedWing(e.rear!, "rear-trailing", 0, 3 / 16, 1 / 2),
            ],
          };
          const result = resolveWingStations(outline, board.fins, true);
          expect(result.passes).toBeLessThanOrEqual(3);
          worst = Math.max(worst, result.passes);
          const again = resolveWingStations(result.outline, board.fins, true).outline.wings!;
          result.outline.wings!.forEach((w, i) => {
            const residual = Math.abs(again[i].station - w.station);
            worstResidual = Math.max(worstResidual, residual);
            expect(residual).toBeLessThan(inchesToMm(1 / 32));
          });
        }
      }
    }
    annotate(`worst passes ${worst}, worst residual ${(worstResidual / 25.4).toFixed(4)}"`);
  });
});

describe("the founder's scaling rule: a deep wing too close behind a fin box (D4, F14)", () => {
  const marks = placeFins(DEFAULT_BOARD_SPEC.outline, DEFAULT_FIN_PLACEMENT_SPEC).marks;
  const te = marks.find((m) => m.role === "front")!.offTail;
  const at = (depthIn: number, behindIn: number) => ({
    station: mm(te - inchesToMm(behindIn)),
    depth: inchesToMm(depthIn),
  });

  it("a wing exactly 3/16 inch deep at the trailing edge: no warning", () => {
    expect(wingFinBoxWarning(at(3 / 16, 0), marks)).toBeNull();
  });

  it("3/8 inch deep: at the mark and 7/16 behind warn with 1/2 inch; exactly 1/2 behind and 1/16 ahead do not", () => {
    const d = wingFinBoxDistance(inchesToMm(3 / 8));
    expect(Math.abs(d - inchesToMm(1 / 2))).toBeLessThan(1e-9);
    expect(wingFinBoxWarning(at(3 / 8, 0), marks)).toBe(d);
    expect(wingFinBoxWarning(at(3 / 8, 7 / 16), marks)).toBe(d);
    expect(wingFinBoxWarning(at(3 / 8, 1 / 2), marks)).toBeNull();
    expect(wingFinBoxWarning(at(3 / 8, -1 / 16), marks)).toBeNull();
  });

  it("1 inch deep: 1 11/16 behind warns with 1 3/4; 1 3/4 behind does not", () => {
    const d = wingFinBoxDistance(inchesToMm(1));
    expect(wingFinBoxWarning(at(1, 1 + 11 / 16), marks)).toBe(d);
    expect(wingFinBoxWarning(at(1, 1.75), marks)).toBeNull();
  });

  it("1/4 inch deep at the trailing edge warns with 1/4 inch", () => {
    expect(wingFinBoxWarning(at(1 / 4, 0), marks)).toBe(wingFinBoxDistance(inchesToMm(1 / 4)));
  });

  it("the Mid-length: a 1/4 inch wing 2 at the rear trailing edge warns, 3/16 does not; the centre fin never does", () => {
    const quad = placeFins(MIDLENGTH.outline, MIDLENGTH.fins).marks;
    const rear = quad.find((m) => m.role === "rear")!.offTail;
    expect(wingFinBoxWarning({ station: rear, depth: inchesToMm(1 / 4) }, quad)).toBe(wingFinBoxDistance(inchesToMm(1 / 4)));
    expect(wingFinBoxWarning({ station: rear, depth: inchesToMm(3 / 16) }, quad)).toBeNull();
    const centre = quad.find((m) => m.role === "center")!;
    expect(centre.side).toBe(0);
    // A 1/2" wing at the centre fin's trailing edge: warned only if a side fin is also that close.
    const nearSide = quad.some((m) => m.side !== 0 && m.offTail - centre.offTail >= 0 && m.offTail - centre.offTail < inchesToMm(3 / 4));
    expect(nearSide).toBe(false);
    expect(wingFinBoxWarning({ station: centre.offTail, depth: inchesToMm(1 / 2) }, quad)).toBeNull();
  });
});
