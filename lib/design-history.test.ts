import { describe, expect, it } from "vitest";
import {
  COALESCE_WINDOW_MS,
  HISTORY_LIMIT,
  beginHold,
  canRedo,
  canUndo,
  emptyHistory,
  endHold,
  holdHasRecorded,
  isHolding,
  isTextEntryTarget,
  recordEdit,
  redo,
  undo,
  undoShortcut,
} from "./design-history";

/** A trivial stand-in snapshot — the module must never care what is inside it. */
interface Stub {
  value: number;
}

function stub(value: number): Stub {
  return { value };
}

describe("emptyHistory / canUndo / canRedo", () => {
  it("a fresh history can neither undo nor redo", () => {
    const history = emptyHistory<Stub>();
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });
});

describe("recordEdit + undo/redo — the stacks", () => {
  it("recording an edit makes undo available; undo hands back the recorded snapshot", () => {
    const h0 = emptyHistory<Stub>();
    const h1 = recordEdit(h0, stub(1), "k", 0);
    expect(canUndo(h1)).toBe(true);

    const result = undo(h1, stub(2));
    expect(result).not.toBeNull();
    expect(result!.restored).toEqual(stub(1));
    // current value is now available to redo
    expect(canRedo(result!.history)).toBe(true);
  });

  it("redo hands back exactly what undo took away, and returns history to where it was", () => {
    const h0 = emptyHistory<Stub>();
    const h1 = recordEdit(h0, stub(1), "k", 0);
    const afterUndo = undo(h1, stub(2))!;
    const afterRedo = redo(afterUndo.history, afterUndo.restored)!;
    expect(afterRedo.restored).toEqual(stub(2));
    expect(canRedo(afterRedo.history)).toBe(false);
    expect(canUndo(afterRedo.history)).toBe(true);
  });

  it("undo on an empty past returns null; same for redo on an empty future", () => {
    const h0 = emptyHistory<Stub>();
    expect(undo(h0, stub(1))).toBeNull();
    expect(redo(h0, stub(1))).toBeNull();
  });

  it("three edits then three undos walk all the way back to the first snapshot, in order", () => {
    let h = emptyHistory<Stub>();
    // Each edit uses a different key so nothing coalesces.
    h = recordEdit(h, stub(0), "a", 0);
    h = recordEdit(h, stub(1), "b", 1000);
    h = recordEdit(h, stub(2), "c", 2000);

    let current = stub(3);
    const restored: Stub[] = [];
    for (let i = 0; i < 3; i++) {
      const result = undo(h, current)!;
      restored.push(result.restored);
      h = result.history;
      current = result.restored;
    }
    expect(restored).toEqual([stub(2), stub(1), stub(0)]);
    expect(canUndo(h)).toBe(false);
  });
});

describe("redo is thrown away by a new edit", () => {
  it("record, undo (redo available), record a new edit — redo is gone", () => {
    let h = emptyHistory<Stub>();
    h = recordEdit(h, stub(1), "k1", 0);
    const afterUndo = undo(h, stub(2))!;
    h = afterUndo.history;
    expect(canRedo(h)).toBe(true);

    h = recordEdit(h, stub(5), "k2", 5000);
    expect(canRedo(h)).toBe(false);
  });
});

describe("coalescing — one drag is one step", () => {
  it("two edits with the same key, the second within COALESCE_WINDOW_MS, leave exactly one entry — the state from before the first", () => {
    let h = emptyHistory<Stub>();
    h = recordEdit(h, stub(1), "drag", 0);
    h = recordEdit(h, stub(2), "drag", 100);
    expect(h.past).toEqual([stub(1)]);
  });

  it("fifty edits with the same key, each 10ms after the last, still leave exactly one entry", () => {
    let h = emptyHistory<Stub>();
    for (let i = 0; i < 50; i++) {
      h = recordEdit(h, stub(i), "drag", i * 10);
    }
    expect(h.past).toEqual([stub(0)]);
  });

  it("two edits with the same key more than COALESCE_WINDOW_MS apart are two entries", () => {
    let h = emptyHistory<Stub>();
    h = recordEdit(h, stub(1), "drag", 0);
    h = recordEdit(h, stub(2), "drag", COALESCE_WINDOW_MS + 1);
    expect(h.past).toEqual([stub(1), stub(2)]);
  });

  it("two edits with different keys, however close together, are always two entries", () => {
    let h = emptyHistory<Stub>();
    h = recordEdit(h, stub(1), "a", 0);
    h = recordEdit(h, stub(2), "b", 1);
    expect(h.past).toEqual([stub(1), stub(2)]);
  });

  it("a null key never coalesces — two consecutive null-key edits are two entries — and blocks the next edit from folding onto it", () => {
    let h = emptyHistory<Stub>();
    h = recordEdit(h, stub(1), null, 0);
    h = recordEdit(h, stub(2), null, 1);
    expect(h.past).toEqual([stub(1), stub(2)]);

    // A following edit with a real key, right after a null-key edit, must not fold onto it —
    // there is nothing for it to fold onto since the null-key edit set lastKey back to null.
    h = recordEdit(h, stub(3), "k", 2);
    expect(h.past).toEqual([stub(1), stub(2), stub(3)]);
  });

  it("an edit immediately after an undo never folds onto the entry the undo left behind, even with the same key inside the window", () => {
    let h = emptyHistory<Stub>();
    h = recordEdit(h, stub(1), "k", 0);
    const afterUndo = undo(h, stub(2))!;
    h = afterUndo.history;
    // Now record a new edit with the same key, well inside the window.
    h = recordEdit(h, stub(afterUndo.restored.value), "k", 50);
    expect(h.past).toEqual([stub(afterUndo.restored.value)]);
  });
});

describe("the cap", () => {
  it("HISTORY_LIMIT edits leave HISTORY_LIMIT entries; one more drops the oldest, never the newest, order preserved", () => {
    let h = emptyHistory<Stub>();
    for (let i = 0; i < HISTORY_LIMIT; i++) {
      // Different keys, far apart, so nothing coalesces.
      h = recordEdit(h, stub(i), `k${i}`, i * (COALESCE_WINDOW_MS + 1));
    }
    expect(h.past.length).toBe(HISTORY_LIMIT);
    expect(h.past[0]).toEqual(stub(0));
    expect(h.past[h.past.length - 1]).toEqual(stub(HISTORY_LIMIT - 1));

    h = recordEdit(h, stub(HISTORY_LIMIT), `kLast`, HISTORY_LIMIT * (COALESCE_WINDOW_MS + 1));
    expect(h.past.length).toBe(HISTORY_LIMIT);
    expect(h.past[0]).toEqual(stub(1));
    expect(h.past[h.past.length - 1]).toEqual(stub(HISTORY_LIMIT));
  });
});

describe("undoShortcut", () => {
  it("Cmd+Z and Ctrl+Z both read as undo", () => {
    expect(undoShortcut({ key: "z", metaKey: true, ctrlKey: false, shiftKey: false, altKey: false })).toBe("undo");
    expect(undoShortcut({ key: "z", metaKey: false, ctrlKey: true, shiftKey: false, altKey: false })).toBe("undo");
  });

  it("Shift+Cmd+Z and Shift+Ctrl+Z both read as redo", () => {
    expect(undoShortcut({ key: "z", metaKey: true, ctrlKey: false, shiftKey: true, altKey: false })).toBe("redo");
    expect(undoShortcut({ key: "z", metaKey: false, ctrlKey: true, shiftKey: true, altKey: false })).toBe("redo");
  });

  it("an upper-case Z (what a browser reports when Shift is held) reads the same as z", () => {
    expect(undoShortcut({ key: "Z", metaKey: true, ctrlKey: false, shiftKey: true, altKey: false })).toBe("redo");
  });

  it("a bare z, a Cmd+S, an Alt+Cmd+Z and any other key read as null", () => {
    expect(undoShortcut({ key: "z", metaKey: false, ctrlKey: false, shiftKey: false, altKey: false })).toBeNull();
    expect(undoShortcut({ key: "s", metaKey: true, ctrlKey: false, shiftKey: false, altKey: false })).toBeNull();
    expect(undoShortcut({ key: "z", metaKey: true, ctrlKey: false, shiftKey: false, altKey: true })).toBeNull();
    expect(undoShortcut({ key: "a", metaKey: true, ctrlKey: false, shiftKey: false, altKey: false })).toBeNull();
  });
});

describe("isTextEntryTarget", () => {
  it("input type=text, type=number, no type, textarea, and contenteditable all count as text entry", () => {
    expect(isTextEntryTarget({ tagName: "input", type: "text" })).toBe(true);
    expect(isTextEntryTarget({ tagName: "input", type: "number" })).toBe(true);
    expect(isTextEntryTarget({ tagName: "input", type: null })).toBe(true);
    expect(isTextEntryTarget({ tagName: "textarea" })).toBe(true);
    expect(isTextEntryTarget({ tagName: "div", isContentEditable: true })).toBe(true);
  });

  it("input type=range (a slider thumb) does not count, nor do checkbox/radio/button/submit/reset/color/file", () => {
    expect(isTextEntryTarget({ tagName: "input", type: "range" })).toBe(false);
    expect(isTextEntryTarget({ tagName: "input", type: "checkbox" })).toBe(false);
    expect(isTextEntryTarget({ tagName: "input", type: "radio" })).toBe(false);
    expect(isTextEntryTarget({ tagName: "input", type: "button" })).toBe(false);
    expect(isTextEntryTarget({ tagName: "input", type: "submit" })).toBe(false);
    expect(isTextEntryTarget({ tagName: "input", type: "reset" })).toBe(false);
    expect(isTextEntryTarget({ tagName: "input", type: "color" })).toBe(false);
    expect(isTextEntryTarget({ tagName: "input", type: "file" })).toBe(false);
  });

  it("select, a div, a button, an svg and null all do not count", () => {
    expect(isTextEntryTarget({ tagName: "select" })).toBe(false);
    expect(isTextEntryTarget({ tagName: "div" })).toBe(false);
    expect(isTextEntryTarget({ tagName: "button" })).toBe(false);
    expect(isTextEntryTarget({ tagName: "svg" })).toBe(false);
    expect(isTextEntryTarget(null)).toBe(false);
  });
});

/** The stand-in's own "same board" test, the store's JSON comparison in miniature. */
const sameStub = (a: Stub, b: Stub) => a.value === b.value;

/**
 * A held control (quick 261114-vwy, the founder's ruling of 2026-11-14): everything between the press
 * and the release is one step, however slowly the hand moves. The 600 ms gaps below are longer than
 * COALESCE_WINDOW_MS, exactly the slow drag the to-do of 2026-10-02 measured splitting into five steps.
 */
describe("beginHold / endHold — one hold is one step", () => {
  /** A slow drag from 60 up through the given values, every change 600 ms after the last. */
  function heldDrag(history: ReturnType<typeof emptyHistory<Stub>>, values: number[], from = 60) {
    let h = beginHold(history);
    let before = from;
    let at = 1_000;
    for (const value of values) {
      h = recordEdit(h, stub(before), "k", at);
      before = value;
      at += COALESCE_WINDOW_MS + 100;
    }
    return { history: h, live: stub(before) };
  }

  it("a hold of five changes 600 ms apart is ONE step, and Undo returns to where the hold began", () => {
    const { history, live } = heldDrag(emptyHistory<Stub>(), [61, 62, 63, 64, 65]);
    expect(isHolding(history)).toBe(true);
    expect(holdHasRecorded(history)).toBe(true);
    expect(history.past).toHaveLength(1);

    const released = endHold(history, live, sameStub);
    expect(isHolding(released)).toBe(false);
    expect(released.past).toHaveLength(1);

    const undone = undo(released, live)!;
    expect(undone.restored).toEqual(stub(60));
    expect(canUndo(undone.history)).toBe(false);
  });

  it("Redo puts the whole hold back in one step", () => {
    const { history, live } = heldDrag(emptyHistory<Stub>(), [61, 62, 63, 64, 65]);
    const released = endHold(history, live, sameStub);
    const undone = undo(released, live)!;
    const redone = redo(undone.history, undone.restored)!;
    expect(redone.restored).toEqual(stub(65));
    expect(canRedo(redone.history)).toBe(false);
    expect(redone.history.past).toHaveLength(1);
  });

  it("a hold that comes back to its starting value records nothing — and keeps whatever Redo was waiting", () => {
    // One real edit, undone, so a redo is waiting when the hold begins.
    const edited = recordEdit(emptyHistory<Stub>(), stub(50), "k", 0);
    const undone = undo(edited, stub(60))!;
    expect(canRedo(undone.history)).toBe(true);

    // Press, wander 51, 52, 51, and come back to 50 — slowly.
    const { history, live } = heldDrag(undone.history, [51, 52, 51, 50], 50);
    expect(live).toEqual(stub(50));
    expect(history.past).toHaveLength(1);
    expect(history.future).toEqual([]);

    const released = endHold(history, live, sameStub);
    expect(released.past).toBe(undone.history.past);
    expect(released.future).toBe(undone.history.future);
    expect(canUndo(released)).toBe(false);
    expect(canRedo(released)).toBe(true);
    expect(isHolding(released)).toBe(false);
  });

  it("a press that never moves the value simply closes, leaving the history as it was", () => {
    const edited = recordEdit(emptyHistory<Stub>(), stub(50), "k", 0);
    const held = beginHold(edited);
    expect(isHolding(held)).toBe(true);
    expect(holdHasRecorded(held)).toBe(false);
    const released = endHold(held, stub(60), sameStub);
    expect(released.past).toBe(edited.past);
    expect(isHolding(released)).toBe(false);
  });

  it("endHold with no hold open returns the very same history object (the window backstop's no-op)", () => {
    const edited = recordEdit(emptyHistory<Stub>(), stub(50), "k", 0);
    expect(endHold(edited, stub(60), sameStub)).toBe(edited);
  });

  it("a second press while one is held changes nothing", () => {
    const held = beginHold(emptyHistory<Stub>());
    expect(beginHold(held)).toBe(held);
  });

  it("the hold's first change never folds onto an edit made just before the press, even within the window", () => {
    const nudged = recordEdit(emptyHistory<Stub>(), stub(60), "k", 1_000);
    const held = beginHold(nudged);
    const moved = recordEdit(held, stub(61), "k", 1_100);
    expect(moved.past).toHaveLength(2);
    expect(moved.past[1]).toEqual(stub(61));
  });

  it("a change under a DIFFERENT key during the hold still folds into the hold's one step", () => {
    const { history } = heldDrag(emptyHistory<Stub>(), [61, 62]);
    const other = recordEdit(history, stub(62), "other", 99_000);
    expect(other.past).toHaveLength(1);
    expect(other.past[0]).toEqual(stub(60));
  });

  it("a nudge after the release, outside the window, is its own step; one inside the window folds (today's rule)", () => {
    const { history, live } = heldDrag(emptyHistory<Stub>(), [61, 62]);
    const released = endHold(history, live, sameStub);

    const late = recordEdit(released, stub(62), "k", released.lastAt + COALESCE_WINDOW_MS + 1);
    expect(late.past).toHaveLength(2);

    const straggler = recordEdit(released, stub(62), "k", released.lastAt + 10);
    expect(straggler.past).toHaveLength(1);
  });

  it("Undo during a hold closes it, and the held control's next change starts a fresh step", () => {
    const { history, live } = heldDrag(emptyHistory<Stub>(), [61, 62]);
    const undone = undo(history, live)!;
    expect(isHolding(undone.history)).toBe(false);
    expect(undone.restored).toEqual(stub(60));
    const next = recordEdit(undone.history, stub(60), "k", 99_000);
    expect(next.past).toHaveLength(1);
  });

  it("a hold that pushes past HISTORY_LIMIT still knows it recorded, and the oldest step goes", () => {
    let h = emptyHistory<Stub>();
    for (let i = 0; i < HISTORY_LIMIT; i++) h = recordEdit(h, stub(i), null, i * 1_000);
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    const held = beginHold(h);
    const moved = recordEdit(held, stub(100), "k", 999_000);
    expect(holdHasRecorded(moved)).toBe(true);
    expect(moved.past).toHaveLength(HISTORY_LIMIT);
    expect(moved.past[0]).toEqual(stub(1));
    expect(moved.past[HISTORY_LIMIT - 1]).toEqual(stub(100));
  });
});
