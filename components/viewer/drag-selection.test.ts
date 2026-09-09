import { describe, expect, it } from "vitest";
import {
  TAP_MAX_TRAVEL_PX,
  nextSelection,
  remoteDragPoint,
  type DragSelection,
} from "./drag-selection";

/**
 * Unit tests for the shared pick/drag state machine (D-01 through D-09, 260909-ktq Task 1).
 *
 * RED (this commit): `./drag-selection` does not exist yet, so every import below fails.
 * GREEN (the next commit): `drag-selection.ts` implements exactly the transitions asserted here.
 */

describe("TAP_MAX_TRAVEL_PX", () => {
  it("is 8", () => {
    expect(TAP_MAX_TRAVEL_PX).toBe(8);
  });
});

describe("remoteDragPoint", () => {
  it("moves the point by the finger's travel, not to the finger", () => {
    expect(remoteDragPoint({ x: 100, y: 50 }, { x: 300, y: 400 }, { x: 340, y: 380 })).toEqual({
      x: 140,
      y: 30,
    });
  });

  it("returns pointStart unchanged when fingerNow equals fingerStart", () => {
    const pointStart = { x: 12, y: -7 };
    expect(remoteDragPoint(pointStart, { x: 50, y: 50 }, { x: 50, y: 50 })).toEqual(pointStart);
  });

  it("is pure: same inputs produce equal outputs and no argument is mutated", () => {
    const pointStart = { x: 1, y: 2 };
    const fingerStart = { x: 3, y: 4 };
    const fingerNow = { x: 9, y: 1 };
    const first = remoteDragPoint(pointStart, fingerStart, fingerNow);
    const second = remoteDragPoint(pointStart, fingerStart, fingerNow);
    expect(first).toEqual(second);
    expect(pointStart).toEqual({ x: 1, y: 2 });
    expect(fingerStart).toEqual({ x: 3, y: 4 });
    expect(fingerNow).toEqual({ x: 9, y: 1 });
  });
});

type Target = "widepoint" | "noseHandle";

describe("nextSelection", () => {
  it("a touch on a point picks it immediately (D-02)", () => {
    const state: DragSelection<Target> = { selected: null, mode: "idle" };
    expect(nextSelection(state, { type: "touchDown", hit: "widepoint" })).toEqual({
      selected: "widepoint",
      mode: "direct",
    });
  });

  it("a nearer point wins the pick, even mid-pick (D-04)", () => {
    const state: DragSelection<Target> = { selected: "widepoint", mode: "idle" };
    expect(nextSelection(state, { type: "touchDown", hit: "noseHandle" })).toEqual({
      selected: "noseHandle",
      mode: "direct",
    });
  });

  it("empty canvas with a pick starts a remote drag (D-03)", () => {
    const state: DragSelection<Target> = { selected: "widepoint", mode: "idle" };
    expect(nextSelection(state, { type: "touchDown", hit: null })).toEqual({
      selected: "widepoint",
      mode: "remote",
    });
  });

  it("empty canvas with no pick does nothing (D-05)", () => {
    const state: DragSelection<Target> = { selected: null, mode: "idle" };
    expect(nextSelection(state, { type: "touchDown", hit: null })).toEqual({
      selected: null,
      mode: "idle",
    });
  });

  it("a tap on a point leaves it picked", () => {
    const state: DragSelection<Target> = { selected: "widepoint", mode: "direct" };
    expect(nextSelection(state, { type: "touchUp", travelPx: 0 })).toEqual({
      selected: "widepoint",
      mode: "idle",
    });
  });

  it("a direct drag leaves it picked too", () => {
    const state: DragSelection<Target> = { selected: "widepoint", mode: "direct" };
    expect(nextSelection(state, { type: "touchUp", travelPx: 120 })).toEqual({
      selected: "widepoint",
      mode: "idle",
    });
  });

  it("a tap on empty canvas lets the pick go (D-05)", () => {
    const state: DragSelection<Target> = { selected: "widepoint", mode: "remote" };
    expect(nextSelection(state, { type: "touchUp", travelPx: 0 })).toEqual({
      selected: null,
      mode: "idle",
    });
  });

  it("the threshold is inclusive: exactly TAP_MAX_TRAVEL_PX is still a tap", () => {
    const state: DragSelection<Target> = { selected: "widepoint", mode: "remote" };
    expect(nextSelection(state, { type: "touchUp", travelPx: TAP_MAX_TRAVEL_PX })).toEqual({
      selected: null,
      mode: "idle",
    });
  });

  it("one pixel past the threshold it is a drag and the pick survives", () => {
    const state: DragSelection<Target> = { selected: "widepoint", mode: "remote" };
    expect(
      nextSelection(state, { type: "touchUp", travelPx: TAP_MAX_TRAVEL_PX + 1 }),
    ).toEqual({ selected: "widepoint", mode: "idle" });
  });

  it("a cancelled gesture never changes the pick (D-05)", () => {
    const state: DragSelection<Target> = { selected: "widepoint", mode: "remote" };
    expect(nextSelection(state, { type: "cancel" })).toEqual({
      selected: "widepoint",
      mode: "idle",
    });
  });

  it("returns a new object and never mutates the state passed in", () => {
    const state: DragSelection<Target> = { selected: "widepoint", mode: "idle" };
    const frozen = Object.freeze({ ...state });
    const result = nextSelection(frozen, { type: "touchDown", hit: "noseHandle" });
    expect(result).not.toBe(frozen);
    expect(frozen).toEqual({ selected: "widepoint", mode: "idle" });
  });

  it("is generic over the target name: SideProfileDragTarget-shaped strings behave identically", () => {
    type SideProfileDragTarget = "noseTipHandle" | "tailTipHandle";
    const state: DragSelection<SideProfileDragTarget> = { selected: null, mode: "idle" };
    expect(nextSelection(state, { type: "touchDown", hit: "noseTipHandle" })).toEqual({
      selected: "noseTipHandle",
      mode: "direct",
    });
  });
});
