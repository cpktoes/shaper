import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { sortRackEntries, type RackEntry } from "./rack-order";
import {
  IN_PROGRESS_KEY,
  applyStoredOrder,
  insertAfter,
  insertFirst,
  moveInOrder,
  moveOneStep,
  orderAfterDuplicate,
  orderWithNewBoardFirst,
  rackEntryKey,
  rackIndexToSavedIndex,
  savedIdsInOrder,
  RACK_ORDER_MAX_IDS,
  RACK_ORDER_MAX_ID_LENGTH,
  parseRackOrderColumn,
  parseRackOrderInput,
  rackOrderColumnValue,
  throwUnlessSaved,
  turnedKeyAfterRemoval,
  turnedKeyOnArrival,
  type InProgressRackEntry,
  type SavedRackEntry,
} from "./rack-order";

const inProgress: RackEntry = { kind: "in-progress" };

function saved(id: string, updatedAt: string, name = `Board ${id}`): RackEntry {
  return { kind: "saved", id, name, updatedAt: new Date(updatedAt) };
}

describe("sortRackEntries", () => {
  it("puts the in-progress entry first no matter where it appears in the input", () => {
    const a = saved("a", "2026-01-01T00:00:00Z");
    const b = saved("b", "2026-01-02T00:00:00Z");

    expect(sortRackEntries([a, b, inProgress])[0]).toEqual(inProgress);
    expect(sortRackEntries([a, inProgress, b])[0]).toEqual(inProgress);
    expect(sortRackEntries([inProgress, a, b])[0]).toEqual(inProgress);
  });

  it("orders saved entries most-recently-touched first", () => {
    const older = saved("a", "2026-01-01T00:00:00Z");
    const newer = saved("b", "2026-01-05T00:00:00Z");
    const newest = saved("c", "2026-01-10T00:00:00Z");

    const result = sortRackEntries([older, newest, newer]);
    expect(result.map((e) => (e.kind === "saved" ? e.id : null))).toEqual(["c", "b", "a"]);
  });

  it("breaks an exact updatedAt tie deterministically by id, stable across repeated calls", () => {
    const first = saved("aaa", "2026-01-01T00:00:00Z");
    const second = saved("zzz", "2026-01-01T00:00:00Z");

    const orderOne = sortRackEntries([first, second]).map((e) => (e.kind === "saved" ? e.id : null));
    const orderTwo = sortRackEntries([second, first]).map((e) => (e.kind === "saved" ? e.id : null));

    expect(orderOne).toEqual(orderTwo);
    // Calling the function twice on the same input returns the same order both times.
    const repeatOne = sortRackEntries([first, second]).map((e) => (e.kind === "saved" ? e.id : null));
    expect(repeatOne).toEqual(orderOne);
  });

  it("keeps two entries with identical names as two distinct entries — id is the identity", () => {
    const a = saved("id-1", "2026-01-01T00:00:00Z", "Same Name");
    const b = saved("id-2", "2026-01-02T00:00:00Z", "Same Name");

    const result = sortRackEntries([a, b]);
    expect(result).toHaveLength(2);
    expect(result.map((e) => (e.kind === "saved" ? e.id : null))).toEqual(["id-2", "id-1"]);
  });

  it("returns an empty list for no in-progress entry and no saved entries", () => {
    expect(sortRackEntries([])).toEqual([]);
  });

  it("does not mutate its input array", () => {
    const a = saved("a", "2026-01-01T00:00:00Z");
    const b = saved("b", "2026-01-05T00:00:00Z");
    const input = [a, b];
    const inputCopy = [...input];

    sortRackEntries(input);

    expect(input).toEqual(inputCopy);
    expect(input[0]).toBe(a);
    expect(input[1]).toBe(b);
  });
});

// ---------------------------------------------------------------------------------------------
// Phase 15 — the shaper's own order (D-01, D-02, D-03, D-16, R9).
// ---------------------------------------------------------------------------------------------

function savedEntry(id: string, updatedAt: string): SavedRackEntry {
  return { kind: "saved", id, name: `Board ${id}`, updatedAt: new Date(updatedAt) };
}

function keysOf(entries: readonly RackEntry[]): string[] {
  return entries.map(rackEntryKey);
}

describe("D-03: the automatic order holds until the first move", () => {
  it("applyStoredOrder with no stored list is exactly sortRackEntries", () => {
    const entries: RackEntry[] = [
      savedEntry("a", "2026-01-01T00:00:00Z"),
      inProgress,
      savedEntry("b", "2026-01-05T00:00:00Z"),
      savedEntry("c", "2026-01-03T00:00:00Z"),
    ];
    expect(applyStoredOrder(entries, null)).toEqual(sortRackEntries(entries));
  });

  it("listed boards follow the list and ignore when they were last touched", () => {
    const entries: RackEntry[] = [
      savedEntry("a", "2026-01-01T00:00:00Z"),
      savedEntry("b", "2026-01-10T00:00:00Z"),
      savedEntry("c", "2026-01-05T00:00:00Z"),
      inProgress,
    ];
    expect(keysOf(applyStoredOrder(entries, ["c", "a"]))).toEqual([IN_PROGRESS_KEY, "b", "c", "a"]);
  });

  it("editing a listed board (a newer updatedAt) never moves it", () => {
    const before = [savedEntry("a", "2026-01-01T00:00:00Z"), savedEntry("b", "2026-01-02T00:00:00Z")];
    const after = [savedEntry("a", "2026-03-01T00:00:00Z"), savedEntry("b", "2026-01-02T00:00:00Z")];
    expect(keysOf(applyStoredOrder(before, ["b", "a"]))).toEqual(["b", "a"]);
    expect(keysOf(applyStoredOrder(after, ["b", "a"]))).toEqual(["b", "a"]);
  });

  it("keeps the caller's richer objects through the merge", () => {
    type Rich = (SavedRackEntry & { extra: number }) | InProgressRackEntry;
    const rich: Rich[] = [{ ...savedEntry("a", "2026-01-01T00:00:00Z"), extra: 7 }];
    const [first] = applyStoredOrder(rich, ["a"]);
    expect(first).toBe(rich[0]);
  });
});

describe("R9: the unsaved board stays first", () => {
  it("is first with or without a stored list, wherever it sits in the input", () => {
    const entries: RackEntry[] = [
      savedEntry("a", "2026-01-01T00:00:00Z"),
      savedEntry("b", "2026-01-02T00:00:00Z"),
      inProgress,
    ];
    expect(rackEntryKey(applyStoredOrder(entries, null)[0])).toBe(IN_PROGRESS_KEY);
    expect(rackEntryKey(applyStoredOrder(entries, ["a", "b"])[0])).toBe(IN_PROGRESS_KEY);
    expect(rackEntryKey(applyStoredOrder(entries, [])[0])).toBe(IN_PROGRESS_KEY);
  });

  it("has no id, so the saved-id list never holds it", () => {
    const entries: RackEntry[] = [inProgress, savedEntry("a", "2026-01-01T00:00:00Z")];
    expect(savedIdsInOrder(entries)).toEqual(["a"]);
    expect(rackEntryKey(inProgress)).toBe("in-progress");
    expect(rackEntryKey(savedEntry("a", "2026-01-01T00:00:00Z"))).toBe("a");
  });

  it("nothing can land in front of it: the first rack place maps to the first saved place", () => {
    expect(rackIndexToSavedIndex(0, true)).toBe(0);
    expect(rackIndexToSavedIndex(1, true)).toBe(0);
    expect(rackIndexToSavedIndex(4, true)).toBe(3);
    expect(rackIndexToSavedIndex(3, false)).toBe(3);
    expect(rackIndexToSavedIndex(0, false)).toBe(0);
  });
});

describe("moving a board in the shaper's list", () => {
  it("moveInOrder puts the board at its index in the resulting list", () => {
    expect(moveInOrder(["a", "b", "c", "d"], "a", 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveInOrder(["a", "b", "c", "d"], "d", 0)).toEqual(["d", "a", "b", "c"]);
  });

  it("moveInOrder clamps an out-of-range index", () => {
    expect(moveInOrder(["a", "b", "c"], "a", 99)).toEqual(["b", "c", "a"]);
    expect(moveInOrder(["a", "b", "c"], "c", -5)).toEqual(["c", "a", "b"]);
  });

  it("moveInOrder returns an equal copy for a board not in the list", () => {
    const ids = ["a", "b"];
    const result = moveInOrder(ids, "x", 1);
    expect(result).toEqual(ids);
    expect(result).not.toBe(ids);
  });

  it("moveOneStep moves one place, and says when the board is already at an end", () => {
    expect(moveOneStep(["a", "b"], "a", -1)).toEqual({ ids: ["a", "b"], outcome: "first" });
    expect(moveOneStep(["a", "b"], "b", 1)).toEqual({ ids: ["a", "b"], outcome: "last" });
    expect(moveOneStep(["a", "b"], "a", 1)).toEqual({ ids: ["b", "a"], outcome: "moved" });
    expect(moveOneStep(["a", "b", "c"], "c", -1)).toEqual({ ids: ["a", "c", "b"], outcome: "moved" });
    expect(moveOneStep(["a", "b"], "x", 1)).toEqual({ ids: ["a", "b"], outcome: "missing" });
  });

  it("insertFirst and insertAfter place a board, moving it rather than repeating it", () => {
    expect(insertFirst(["a", "b"], "n")).toEqual(["n", "a", "b"]);
    expect(insertFirst(["a", "n", "b"], "n")).toEqual(["n", "a", "b"]);
    expect(insertAfter(["a", "b", "c"], "b", "copy")).toEqual(["a", "b", "copy", "c"]);
    expect(insertAfter(["a"], "gone", "copy")).toEqual(["copy", "a"]);
    expect(insertAfter(["copy", "a", "b"], "a", "copy")).toEqual(["a", "copy", "b"]);
    expect(insertAfter(["a", "b", "copy"], "a", "copy")).toEqual(["a", "copy", "b"]);
  });
});

describe("D-01: a new board goes first", () => {
  it("in an arranged rack, the new board stands at the front of the whole displayed order", () => {
    const entries = [
      savedEntry("n", "2026-02-01T00:00:00Z"),
      savedEntry("a", "2026-01-01T00:00:00Z"),
      savedEntry("b", "2026-01-10T00:00:00Z"),
      savedEntry("c", "2026-01-05T00:00:00Z"),
    ];
    expect(orderWithNewBoardFirst(entries, ["c", "a"], "n")).toEqual(["n", "b", "c", "a"]);
  });

  it("puts the new board first even when the stored list already names it further back", () => {
    const entries = [savedEntry("n", "2026-02-01T00:00:00Z"), savedEntry("a", "2026-01-01T00:00:00Z")];
    expect(orderWithNewBoardFirst(entries, ["a", "n"], "n")).toEqual(["n", "a"]);
  });

  it("a saved board missing from the list stands first, right behind the unsaved board", () => {
    const entries: RackEntry[] = [
      inProgress,
      savedEntry("a", "2026-01-01T00:00:00Z"),
      savedEntry("n", "2026-02-01T00:00:00Z"),
    ];
    expect(keysOf(applyStoredOrder(entries, ["a"]))).toEqual([IN_PROGRESS_KEY, "n", "a"]);
  });
});

describe("D-02 / D-16: a duplicate goes right after its original", () => {
  // b newest, a, c oldest — and the copy newest of all, as the database returns it.
  const entries = [
    savedEntry("b", "2026-01-10T00:00:00Z"),
    savedEntry("a", "2026-01-05T00:00:00Z"),
    savedEntry("c", "2026-01-01T00:00:00Z"),
    savedEntry("copy", "2026-02-01T00:00:00Z"),
  ];

  it("D-16: fixes the order even in a rack never arranged", () => {
    expect(orderAfterDuplicate(entries, null, "a", "copy")).toEqual(["b", "a", "copy", "c"]);
  });

  it("in an arranged rack, the copy stands right after its original", () => {
    expect(orderAfterDuplicate(entries, ["c", "a"], "a", "copy")).toEqual(["b", "c", "a", "copy"]);
  });

  it("an original no longer in the rack puts the copy first", () => {
    expect(orderAfterDuplicate(entries, null, "gone", "copy")).toEqual(["copy", "b", "a", "c"]);
  });
});

describe("two devices: the stored list is only read through the merge", () => {
  it("skips an unknown id and counts a repeated id once", () => {
    const entries = [savedEntry("a", "2026-01-01T00:00:00Z"), savedEntry("b", "2026-01-02T00:00:00Z")];
    expect(keysOf(applyStoredOrder(entries, ["zzz", "a", "b", "a"]))).toEqual(["a", "b"]);
  });

  it("skips a deleted board's id left in the list", () => {
    const entries = [savedEntry("a", "2026-01-01T00:00:00Z"), savedEntry("c", "2026-01-02T00:00:00Z")];
    expect(keysOf(applyStoredOrder(entries, ["a", "deleted", "c"]))).toEqual(["a", "c"]);
  });

  it("never mutates its inputs (frozen inputs do not throw)", () => {
    const a = Object.freeze(savedEntry("a", "2026-01-01T00:00:00Z"));
    const b = Object.freeze(savedEntry("b", "2026-01-02T00:00:00Z"));
    const entries = Object.freeze([b, inProgress, a]) as readonly RackEntry[];
    const stored = Object.freeze(["a", "b"]);
    const ids = Object.freeze(["a", "b", "c"]);

    expect(() => applyStoredOrder(entries, stored)).not.toThrow();
    expect(() => applyStoredOrder(entries, null)).not.toThrow();
    expect(() => moveInOrder(ids, "a", 2)).not.toThrow();
    expect(() => moveOneStep(ids, "b", 1)).not.toThrow();
    expect(() => insertFirst(ids, "n")).not.toThrow();
    expect(() => insertAfter(ids, "a", "n")).not.toThrow();
    expect(() => orderAfterDuplicate([a, b], stored, "a", "n")).not.toThrow();
    expect(() => orderWithNewBoardFirst([a, b], stored, "n")).not.toThrow();
    expect(entries.map(rackEntryKey)).toEqual(["b", IN_PROGRESS_KEY, "a"]);
    expect(stored).toEqual(["a", "b"]);
    expect(ids).toEqual(["a", "b", "c"]);
  });
});

// ---------------------------------------------------------------------------------------------
// Phase 15 — how the order is written on the account, and which board is turned.
// ---------------------------------------------------------------------------------------------

describe("the stored list never reads corrupt", () => {
  it("reads an empty column, junk text and anything that is not a list as no order", () => {
    expect(parseRackOrderColumn(null)).toBeNull();
    expect(parseRackOrderColumn(undefined)).toBeNull();
    expect(parseRackOrderColumn("")).toBeNull();
    expect(parseRackOrderColumn("not json")).toBeNull();
    expect(parseRackOrderColumn("{}")).toBeNull();
    expect(parseRackOrderColumn("42")).toBeNull();
    expect(parseRackOrderColumn("null")).toBeNull();
    expect(parseRackOrderColumn('"a"')).toBeNull();
    expect(parseRackOrderColumn("[1, 2")).toBeNull();
  });

  it("keeps string ids, first occurrence wins, dropping anything else", () => {
    expect(parseRackOrderColumn('["a","b","a",3,""]')).toEqual(["a", "b"]);
    expect(parseRackOrderColumn(JSON.stringify(["a", null, { id: "b" }, ["c"], "x".repeat(65), "d"]))).toEqual([
      "a",
      "d",
    ]);
    expect(parseRackOrderColumn("[]")).toEqual([]);
  });

  it("caps a long list at its first 500 ids", () => {
    const ids = Array.from({ length: 600 }, (_, i) => `id-${i}`);
    const read = parseRackOrderColumn(JSON.stringify(ids));
    expect(read).toHaveLength(RACK_ORDER_MAX_IDS);
    expect(read).toEqual(ids.slice(0, 500));
  });

  it("writes the list as JSON text that reads back the same", () => {
    expect(rackOrderColumnValue(["a", "b"])).toBe('["a","b"]');
    expect(parseRackOrderColumn(rackOrderColumnValue(["a", "b"]))).toEqual(["a", "b"]);
    expect(parseRackOrderColumn(rackOrderColumnValue([]))).toEqual([]);
  });
});

describe("a save that stored nothing is a failed save (code review IN-02)", () => {
  it("passes a stored order through quietly", () => {
    expect(() => throwUnlessSaved({ saved: true })).not.toThrow();
  });

  it("throws for saved: false, or for no answer at all, so the rack puts the board back and says so", () => {
    expect(() => throwUnlessSaved({ saved: false })).toThrow();
    expect(() => throwUnlessSaved(undefined)).toThrow();
    expect(() => throwUnlessSaved(null)).toThrow();
  });
});

describe("the strict input: a save takes the whole list or nothing", () => {
  it("accepts a list of distinct ids, as a copy", () => {
    const input = ["a", "b"];
    const parsed = parseRackOrderInput(input);
    expect(parsed).toEqual(["a", "b"]);
    expect(parsed).not.toBe(input);
    expect(parseRackOrderInput([])).toEqual([]);
  });

  it("accepts exactly 500 ids and an id of exactly 64 characters", () => {
    expect(parseRackOrderInput(Array.from({ length: 500 }, (_, i) => `id-${i}`))).toHaveLength(500);
    expect(parseRackOrderInput(["x".repeat(RACK_ORDER_MAX_ID_LENGTH)])).toEqual(["x".repeat(64)]);
  });

  it("rejects anything that is not a list", () => {
    expect(parseRackOrderInput("a")).toBeNull();
    expect(parseRackOrderInput(null)).toBeNull();
    expect(parseRackOrderInput(undefined)).toBeNull();
    expect(parseRackOrderInput({ 0: "a", length: 1 })).toBeNull();
  });

  it("rejects a non-string or empty id", () => {
    expect(parseRackOrderInput([1])).toBeNull();
    expect(parseRackOrderInput(["a", null])).toBeNull();
    expect(parseRackOrderInput([""])).toBeNull();
  });

  it("rejects a repeated id", () => {
    expect(parseRackOrderInput(["a", "a"])).toBeNull();
  });

  it("rejects 501 ids and an id of 65 characters rather than trimming them", () => {
    expect(parseRackOrderInput(Array.from({ length: 501 }, (_, i) => `id-${i}`))).toBeNull();
    expect(parseRackOrderInput(["x".repeat(65)])).toBeNull();
  });
});

describe("D-07: the board shown turned when the home page opens", () => {
  it("is the unsaved board when there is one", () => {
    expect(turnedKeyOnArrival([IN_PROGRESS_KEY, "a", "b"], null, true)).toBe(IN_PROGRESS_KEY);
    expect(turnedKeyOnArrival([IN_PROGRESS_KEY, "a", "b"], "b", true)).toBe(IN_PROGRESS_KEY);
  });

  it("is the open board when it is on the rack", () => {
    expect(turnedKeyOnArrival(["a", "b"], "b", false)).toBe("b");
  });

  it("is the first board otherwise, and nothing on an empty rack", () => {
    expect(turnedKeyOnArrival(["a", "b"], "gone", false)).toBe("a");
    expect(turnedKeyOnArrival(["a", "b"], null, false)).toBe("a");
    expect(turnedKeyOnArrival([], null, false)).toBeNull();
  });
});

describe("after a delete: the turn passes to a neighbour", () => {
  it("passes to the next board in the old order", () => {
    expect(turnedKeyAfterRemoval(["a", "b", "c"], ["a", "c"], "b")).toBe("c");
  });

  it("passes to the previous board when the deleted board was last", () => {
    expect(turnedKeyAfterRemoval(["a", "b", "c"], ["a", "b"], "c")).toBe("b");
  });

  it("skips neighbours that went too", () => {
    expect(turnedKeyAfterRemoval(["a", "b", "c", "d"], ["a", "d"], "b")).toBe("d");
    expect(turnedKeyAfterRemoval(["a", "b", "c", "d"], ["a"], "c")).toBe("a");
  });

  it("is nothing once the rack is empty", () => {
    expect(turnedKeyAfterRemoval(["a"], [], "a")).toBeNull();
  });

  it("leaves a turned board that is still there alone", () => {
    expect(turnedKeyAfterRemoval(["a", "b", "c"], ["a", "b"], "a")).toBe("a");
  });

  it("falls back to the first board when nothing was turned or the turned key is unknown", () => {
    expect(turnedKeyAfterRemoval(["a", "b"], ["b"], null)).toBe("b");
    expect(turnedKeyAfterRemoval(["a", "b"], ["b"], "zzz")).toBe("b");
  });
});

describe("the order rules stay pure", () => {
  it("imports no React, browser API or database", () => {
    const source = readFileSync(new URL("./rack-order.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/from "react"|window\.|document\.|@\/lib\/db/);
  });
});
