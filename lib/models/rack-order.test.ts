import { describe, expect, it } from "vitest";
import { sortRackEntries, type RackEntry } from "./rack-order";

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
