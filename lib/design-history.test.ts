import { describe, expect, it } from "vitest";
import {
  COALESCE_WINDOW_MS,
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  emptyHistory,
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
