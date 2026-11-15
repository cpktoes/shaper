import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_SPEC, type OutlineSpec } from "./geometry/board";
import { degrees, mm } from "./geometry/units";
import { COALESCE_WINDOW_MS, beginHold, emptyHistory, endHold, holdHasRecorded, recordEdit, redo, undo } from "./design-history";
import { outlinesMatch, pickOutlineGhost } from "./outline-ghost";

/** A minimal stand-in for the store's own history entry shape — just enough for
 * `pickOutlineGhost` to read, exactly like `DesignHistorySnapshot` does. */
interface Snapshot {
  outline: OutlineSpec;
}

function snap(outline: OutlineSpec): Snapshot {
  return { outline };
}

const LIVE = DEFAULT_BOARD_SPEC.outline;

/** A variant of the default outline with one field changed — every changed number goes through
 * `mm()`/`degrees()`, never a raw literal in a branded field. */
function withLength(value: number): OutlineSpec {
  return { ...LIVE, length: mm(value) };
}

describe("pickOutlineGhost", () => {
  it("an empty past returns null", () => {
    expect(pickOutlineGhost([], LIVE)).toBeNull();
  });

  it("one past entry whose outline differs from the live one returns that entry's own outline object", () => {
    const past = [snap(withLength(1800))];
    expect(pickOutlineGhost(past, LIVE)).toBe(past[0]!.outline);
  });

  it("top entry's outline equals the live one (a rocker edit made elsewhere); the entry below differs: returns the lower entry's outline", () => {
    const lower = snap(withLength(1800));
    const top = snap(LIVE); // same values as live — a non-outline edit recorded this
    expect(pickOutlineGhost([lower, top], LIVE)).toBe(lower.outline);
  });

  it("every entry's outline equals the live one returns null", () => {
    const past = [snap(LIVE), snap({ ...LIVE }), snap({ ...LIVE, tail: { ...LIVE.tail } })];
    expect(pickOutlineGhost(past, LIVE)).toBeNull();
  });

  it("an entry with the same values but reordered keys and a different object counts as the same and is skipped", () => {
    const reordered: OutlineSpec = {
      tail: LIVE.tail,
      tailFullness: LIVE.tailFullness,
      tailAngle: LIVE.tailAngle,
      noseFullness: LIVE.noseFullness,
      noseAngle: LIVE.noseAngle,
      noseRailLength: LIVE.noseRailLength,
      tailRailLength: LIVE.tailRailLength,
      widePointOffset: LIVE.widePointOffset,
      widePointWidth: LIVE.widePointWidth,
      length: LIVE.length,
    };
    expect(reordered).not.toBe(LIVE);
    expect(pickOutlineGhost([snap(reordered)], LIVE)).toBeNull();
  });

  it("a difference only inside the tail counts — a squash endWidth difference", () => {
    const wideSquash: OutlineSpec = { ...LIVE, tail: { kind: "squash", endWidth: mm(100) } };
    const narrowerSquash: OutlineSpec = { ...LIVE, tail: { kind: "squash", endWidth: mm(110) } };
    expect(pickOutlineGhost([snap(wideSquash)], narrowerSquash)).toBe(wideSquash);
  });

  it("a difference only inside the tail counts — a pin tail against a round one", () => {
    const pinOutline: OutlineSpec = { ...LIVE, tail: { kind: "pin" } };
    const roundOutline: OutlineSpec = { ...LIVE, tail: { kind: "round" } };
    expect(pickOutlineGhost([snap(pinOutline)], roundOutline)).toBe(pinOutline);
  });

  it("two differing entries, past [A, B] with live C: returns B, the most recent, not A", () => {
    const a = snap(withLength(1700));
    const b = snap(withLength(1800));
    const c = withLength(1900);
    expect(pickOutlineGhost([a, b], c)).toBe(b.outline);
  });
});

describe("pickOutlineGhost — driven by the real undo-history stacks", () => {
  it("A then edit to B returns A", () => {
    const a = withLength(1700);
    const b = withLength(1800);
    let history = emptyHistory<Snapshot>();
    history = recordEdit(history, snap(a), "outline:length", 0);
    expect(pickOutlineGhost(history.past, b)).toBe(a);
  });

  it("B then a second edit to C more than COALESCE_WINDOW_MS later returns B", () => {
    const a = withLength(1700);
    const b = withLength(1800);
    const c = withLength(1900);
    let history = emptyHistory<Snapshot>();
    history = recordEdit(history, snap(a), "outline:length", 0);
    history = recordEdit(history, snap(b), "outline:length", COALESCE_WINDOW_MS + 1);
    expect(pickOutlineGhost(history.past, c)).toBe(b);
  });

  it("two moves under the same key inside the window fold into one step and still return A", () => {
    const a = withLength(1700);
    const mid = withLength(1750);
    const b = withLength(1800);
    let history = emptyHistory<Snapshot>();
    history = recordEdit(history, snap(a), "outline:length", 0);
    history = recordEdit(history, snap(mid), "outline:length", 100);
    expect(history.past).toHaveLength(1);
    expect(pickOutlineGhost(history.past, b)).toBe(a);
  });

  it("undo from C returns B as the restored board and A as the ghost", () => {
    const a = withLength(1700);
    const b = withLength(1800);
    const c = withLength(1900);
    let history = emptyHistory<Snapshot>();
    history = recordEdit(history, snap(a), "outline:length", 0);
    history = recordEdit(history, snap(b), "outline:length", COALESCE_WINDOW_MS + 1);
    const result = undo(history, snap(c))!;
    expect(result.restored.outline).toBe(b);
    expect(pickOutlineGhost(result.history.past, result.restored.outline)).toBe(a);
  });

  it("undo from B (the only edit) leaves an empty past and returns null", () => {
    const a = withLength(1700);
    const b = withLength(1800);
    let history = emptyHistory<Snapshot>();
    history = recordEdit(history, snap(a), "outline:length", 0);
    const result = undo(history, snap(b))!;
    expect(result.history.past).toHaveLength(0);
    expect(pickOutlineGhost(result.history.past, result.restored.outline)).toBeNull();
  });

  it("redo puts C back and the ghost is B again", () => {
    const a = withLength(1700);
    const b = withLength(1800);
    const c = withLength(1900);
    let history = emptyHistory<Snapshot>();
    history = recordEdit(history, snap(a), "outline:length", 0);
    history = recordEdit(history, snap(b), "outline:length", COALESCE_WINDOW_MS + 1);
    const afterUndo = undo(history, snap(c))!;
    const afterRedo = redo(afterUndo.history, snap(afterUndo.restored.outline))!;
    expect(afterRedo.restored.outline).toBe(c);
    expect(pickOutlineGhost(afterRedo.history.past, afterRedo.restored.outline)).toBe(b);
  });

  it("the future stack is never read — the undone shape is never returned as a ghost", () => {
    // pickOutlineGhost takes no `future` argument at all: this is a type-level guarantee,
    // proved here by confirming the signature only accepts `past`.
    const a = withLength(1700);
    const b = withLength(1800);
    let history = emptyHistory<Snapshot>();
    history = recordEdit(history, snap(a), "outline:length", 0);
    const afterUndo = undo(history, snap(b))!;
    // afterUndo.history.future now holds B — pickOutlineGhost over its past (empty) must not
    // somehow reach into future and return B as a ghost.
    expect(afterUndo.history.future).toHaveLength(1);
    expect(pickOutlineGhost(afterUndo.history.past, afterUndo.restored.outline)).toBeNull();
  });
});

describe("outlinesMatch", () => {
  it("true for an outline and a key-reordered copy", () => {
    const reordered: OutlineSpec = {
      tail: LIVE.tail,
      tailFullness: LIVE.tailFullness,
      tailAngle: LIVE.tailAngle,
      noseFullness: LIVE.noseFullness,
      noseAngle: LIVE.noseAngle,
      noseRailLength: LIVE.noseRailLength,
      tailRailLength: LIVE.tailRailLength,
      widePointOffset: LIVE.widePointOffset,
      widePointWidth: LIVE.widePointWidth,
      length: LIVE.length,
    };
    expect(outlinesMatch(LIVE, reordered)).toBe(true);
  });

  it("false when any one scalar field differs", () => {
    expect(outlinesMatch(LIVE, { ...LIVE, noseAngle: degrees(40) })).toBe(false);
    expect(outlinesMatch(LIVE, { ...LIVE, tailFullness: 10 })).toBe(false);
  });

  it("false when the tail kind differs", () => {
    expect(outlinesMatch({ ...LIVE, tail: { kind: "pin" } }, { ...LIVE, tail: { kind: "round" } })).toBe(false);
  });

  it("false when a tail dimension differs", () => {
    expect(
      outlinesMatch(
        { ...LIVE, tail: { kind: "squash", endWidth: mm(100) } },
        { ...LIVE, tail: { kind: "squash", endWidth: mm(110) } },
      ),
    ).toBe(false);
  });
});

/**
 * The pinned ghost (quick 261114-vwy): the to-do of 2026-10-02 measured a slow held drag from 60 walking the
 * ghost 60, 61, 62, 63, 64 (one notch behind the live line), and a drag back through its start making the
 * ghost vanish for an instant. With the hold rule the ghost is the grab shape at every sample.
 */
describe("pickOutlineGhost — pinned to the grab shape while a control is held", () => {
  const sameSnapshot = (a: Snapshot, b: Snapshot) => outlinesMatch(a.outline, b.outline);

  it("a slow held drag, 600 ms between changes, shows the grab shape at every sample and is one step", () => {
    const grab = withLength(1800);
    let history = beginHold(emptyHistory<Snapshot>());
    let live = grab;
    let at = 1_000;
    const seen: (OutlineSpec | null)[] = [];
    for (const length of [1810, 1820, 1830, 1840, 1850]) {
      const next = withLength(length);
      history = recordEdit(history, snap(live), "outline:length", at);
      live = next;
      at += COALESCE_WINDOW_MS + 100;
      seen.push(pickOutlineGhost(history.past, live, holdHasRecorded(history)));
    }
    expect(seen.every((ghost) => ghost === grab)).toBe(true);
    expect(history.past).toHaveLength(1);

    history = endHold(history, snap(live), sameSnapshot);
    expect(pickOutlineGhost(history.past, live, holdHasRecorded(history))).toBe(grab);
    expect(undo(history, snap(live))!.restored.outline).toBe(grab);
  });

  it("the live shape passing back through the grab shape keeps the ghost on it, never null, never an older shape", () => {
    // An earlier, finished edit from 1780 to 1800, so there IS an older shape the ghost could flip to.
    const older = withLength(1780);
    const grab = withLength(1800);
    let history = recordEdit(emptyHistory<Snapshot>(), snap(older), "outline:length", 0);

    history = beginHold(history);
    let live = grab;
    let at = 10_000;
    const walk = [1810, 1820, 1810, 1800, 1790];
    const seen: (OutlineSpec | null)[] = [];
    for (const length of walk) {
      history = recordEdit(history, snap(live), "outline:length", at);
      live = withLength(length);
      at += 16;
      seen.push(pickOutlineGhost(history.past, live, holdHasRecorded(history)));
    }
    // At the fourth sample the live shape IS the grab shape; pinned, the ghost is still the grab shape.
    expect(seen[3]).toBe(grab);
    expect(seen.every((ghost) => ghost === grab)).toBe(true);
    expect(pickOutlineGhost(history.past, live, false)).not.toBeNull();
  });

  it("a hold that ends where it began leaves the ghost exactly as it was before the press", () => {
    const older = withLength(1780);
    const grab = withLength(1800);
    let history = recordEdit(emptyHistory<Snapshot>(), snap(older), "outline:length", 0);
    const ghostBefore = pickOutlineGhost(history.past, grab, holdHasRecorded(history));
    expect(ghostBefore).toBe(older);

    history = beginHold(history);
    history = recordEdit(history, snap(grab), "outline:length", 1_000);
    history = recordEdit(history, snap(withLength(1810)), "outline:length", 1_700);
    history = endHold(history, snap(grab), sameSnapshot);
    expect(history.past).toHaveLength(1);
    expect(pickOutlineGhost(history.past, grab, holdHasRecorded(history))).toBe(older);
  });

  it("before the hold's first change the ordinary rule still applies — a press alone moves nothing", () => {
    const older = withLength(1780);
    const grab = withLength(1800);
    let history = recordEdit(emptyHistory<Snapshot>(), snap(older), "outline:length", 0);
    history = beginHold(history);
    expect(holdHasRecorded(history)).toBe(false);
    expect(pickOutlineGhost(history.past, grab, holdHasRecorded(history))).toBe(older);
  });

  it("pinned with an empty past is still null", () => {
    expect(pickOutlineGhost([], LIVE, true)).toBeNull();
  });
});
