import { describe, expect, it } from "vitest";
import {
  basisOf,
  orderFromBasis,
  rackOrderViewAfterFailure,
  rackOrderViewAfterMove,
  rackOrderViewFrom,
  rackOrderViewOnArrival,
  shownOrder,
} from "./rack-order-sync";

/**
 * Which order the Board Rack shows when the page's refresh hands it a stored order (code review
 * CR-01): never an older save's order over a newer move still saving, always the account's order
 * once the saver is idle.
 */

const A = ["a", "b", "c"];
const B = ["b", "a", "c"];
const C = ["b", "c", "a"];

describe("basisOf / orderFromBasis", () => {
  it("round-trips an order and the never-arranged rack", () => {
    expect(orderFromBasis(basisOf(A))).toEqual(A);
    expect(orderFromBasis(basisOf(null))).toBeNull();
    expect(orderFromBasis('{"not":"a list"}')).toBeNull();
  });
});

describe("arriving on the page", () => {
  it("shows the stored order, and the saver starts from it", () => {
    const view = rackOrderViewFrom(basisOf(A));
    expect(shownOrder(view)).toEqual(A);
    expect(view.base).toBe(basisOf(A));
    expect(rackOrderViewFrom(basisOf(null)).local).toBeNull();
    expect(shownOrder(rackOrderViewFrom(basisOf(null)))).toBeNull();
  });
});

describe("a stored order arriving while the saver is idle is taken", () => {
  it("after a Duplicate placed a copy, or another device moved a board", () => {
    const moved = rackOrderViewAfterMove(rackOrderViewFrom(basisOf(A)), B);
    const withCopy = [...B, "copy"];
    const next = rackOrderViewOnArrival(moved, basisOf(withCopy), true);
    expect(shownOrder(next)).toEqual(withCopy);
    expect(next.local).toBeNull();
    expect(next.base).toBe(basisOf(withCopy));
  });

  it("the refresh of the shaper's own last save changes nothing on screen", () => {
    const moved = rackOrderViewAfterMove(rackOrderViewFrom(basisOf(A)), B);
    const next = rackOrderViewOnArrival(moved, basisOf(B), true);
    expect(shownOrder(next)).toEqual(B);
    expect(next.base).toBe(basisOf(B));
  });

  it("an order it has already seen is no change at all", () => {
    const view = rackOrderViewAfterMove(rackOrderViewFrom(basisOf(A)), B);
    expect(rackOrderViewOnArrival(view, basisOf(A), true)).toBe(view);
    expect(rackOrderViewOnArrival(view, basisOf(A), false)).toBe(view);
  });
});

describe("a stored order arriving while a save is waiting or travelling never snaps a move back", () => {
  it("keeps the newer move on screen, keeps the saver's starting order, and notes the arrival as seen", () => {
    // Move 1 (B) saved; move 2 (C) on its way when B's refresh arrives.
    const afterTwoMoves = rackOrderViewAfterMove(rackOrderViewAfterMove(rackOrderViewFrom(basisOf(A)), B), C);
    const next = rackOrderViewOnArrival(afterTwoMoves, basisOf(B), false);
    expect(shownOrder(next)).toEqual(C);
    expect(next.seen).toBe(basisOf(B));
    expect(next.base).toBe(basisOf(A));
  });

  it("the older order, once seen, is not taken later when the saver goes idle", () => {
    const afterTwoMoves = rackOrderViewAfterMove(rackOrderViewFrom(basisOf(A)), C);
    const seenWhileBusy = rackOrderViewOnArrival(afterTwoMoves, basisOf(B), false);
    // The saver goes idle with the page still holding B's refresh: nothing new has arrived.
    expect(rackOrderViewOnArrival(seenWhileBusy, basisOf(B), true)).toBe(seenWhileBusy);
    expect(shownOrder(seenWhileBusy)).toEqual(C);
    // C's own refresh arrives: taken, and the rack shows what it already showed.
    const settled = rackOrderViewOnArrival(seenWhileBusy, basisOf(C), true);
    expect(shownOrder(settled)).toEqual(C);
    expect(settled.local).toBeNull();
  });

  it("a never-arranged rack keeps the automatic order on screen while busy", () => {
    const failed = rackOrderViewAfterFailure(rackOrderViewFrom(basisOf(null)), null);
    const next = rackOrderViewOnArrival(failed, basisOf(A), false);
    expect(shownOrder(next)).toBeNull();
  });
});

describe("moves and failures", () => {
  it("a move shows the new order at once, never holding the caller's array", () => {
    const ids = [...B];
    const view = rackOrderViewAfterMove(rackOrderViewFrom(basisOf(A)), ids);
    ids.reverse();
    expect(shownOrder(view)).toEqual(B);
  });

  it("a failed save shows the order handed back — the automatic order when that is null", () => {
    const moved = rackOrderViewAfterMove(rackOrderViewFrom(basisOf(A)), B);
    expect(shownOrder(rackOrderViewAfterFailure(moved, A))).toEqual(A);
    expect(shownOrder(rackOrderViewAfterFailure(moved, null))).toBeNull();
  });
});
