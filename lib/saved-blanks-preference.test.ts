import { describe, expect, it } from "vitest";
import { presetDesignFields } from "./blanks/preset-blanks";
import type { BlankRecord } from "./geometry/blank";
import { blankStarIdentity, normalizeSpec, type BlankRockerSpec } from "./geometry/custom-rocker";
import { BOARD_PRESETS } from "./geometry/presets";
import { inchesToMm } from "./geometry/units";
import {
  REMOVE_CONNECTION_MESSAGE,
  REMOVE_SIGNED_OUT_MESSAGE,
  SAVE_CONNECTION_MESSAGE,
  SAVE_SIGNED_OUT_MESSAGE,
  SAVED_BLANKS_FULL_MESSAGE,
  SAVED_BLANKS_MAX,
  SAVED_BLANKS_STORAGE_KEY,
  parseSavedBlankInput,
  parseSavedBlanks,
  parseSavedBlanksText,
  removeBlankFailureMessage,
  savedBlankFromRow,
  savedBlankIdentity,
  savedBlanksJson,
  withReplacedSavedBlank,
  withSavedBlank,
  withoutSavedBlank,
  type SavedBlank,
} from "./saved-blanks-preference";
import { starKey } from "./starred-blanks-preference";

/** Real catalogue blanks, read through the presets — never typed numbers. */
function presetCopy(id: string): BlankRecord {
  return presetDesignFields(BOARD_PRESETS.find((p) => p.id === id)!).blank!.copy;
}
const LONG = presetCopy("longboard");
const SHORT = presetCopy("shortboard");

const NOSE_UP: BlankRockerSpec = { changes: [{ end: "nose", amount: inchesToMm(0.5) }] };
const TAIL_18: BlankRockerSpec = { changes: [{ end: "tail", amount: inchesToMm(0.25), fromTip: inchesToMm(18) }] };

function saved(id: string, copy: BlankRecord, rocker: BlankRockerSpec): SavedBlank {
  return { id, copy, rocker: normalizeSpec(rocker, copy.lengthMm) };
}

describe("the browser list's constants (P-5)", () => {
  it("one key, a cap of 100 and the sentence a shaper reads at the cap", () => {
    expect(SAVED_BLANKS_STORAGE_KEY).toBe("shaper-saved-blanks");
    expect(SAVED_BLANKS_MAX).toBe(100);
    expect(SAVED_BLANKS_FULL_MESSAGE).toBe("You have 100 saved blanks — remove one in Pick a Blank to save another.");
  });
});

describe("the failed-write sentences (quick 261017-sru)", () => {
  it("the two save sentences read exactly as they always have", () => {
    expect(SAVE_SIGNED_OUT_MESSAGE).toBe("Sign in again to save blanks to your account.");
    expect(SAVE_CONNECTION_MESSAGE).toBe("Couldn't save the blank — check your connection and try again.");
  });

  it("the two remove sentences say remove, not save", () => {
    expect(REMOVE_SIGNED_OUT_MESSAGE).toBe("Sign in again to remove blanks from your account.");
    expect(REMOVE_CONNECTION_MESSAGE).toBe("Couldn't remove the blank — check your connection and try again.");
  });

  it("a failed Remove reads the sign-in sentence when the sign-in lapsed, the connection sentence otherwise", () => {
    expect(removeBlankFailureMessage({ ok: false, reason: "signed-out" })).toBe(
      "Sign in again to remove blanks from your account.",
    );
    expect(removeBlankFailureMessage({ ok: false, reason: "invalid" })).toBe(
      "Couldn't remove the blank — check your connection and try again.",
    );
    expect(removeBlankFailureMessage(null)).toBe("Couldn't remove the blank — check your connection and try again.");
  });
});

describe("parseSavedBlankInput — the strict reader of a copy and a rocker", () => {
  it("reads a real catalogue blank and a valid rocker, the rocker normalised", () => {
    const messy: BlankRockerSpec = { changes: [{ end: "tail", amount: inchesToMm(0.25), fromTip: inchesToMm(18.3) }] };
    expect(parseSavedBlankInput({ copy: LONG, rocker: messy })).toEqual({
      copy: LONG,
      rocker: normalizeSpec(messy, LONG.lengthMm),
    });
  });

  it("refuses a copy that fails the snapshot's blank rule", () => {
    const unpickable = { ...LONG, stations: LONG.stations.map((s) => (s.label === "C" ? { ...s, thicknessMm: null } : s)) };
    const longName = { ...LONG, name: "x".repeat(121) };
    const outOfOrder = { ...LONG, stations: [...LONG.stations].reverse() };
    for (const copy of [unpickable, longName, outOfOrder, null, "9'4\"B"]) {
      expect(parseSavedBlankInput({ copy, rocker: NOSE_UP })).toBeNull();
    }
  });

  it("refuses a natural or malformed rocker, and anything that is not an object", () => {
    for (const rocker of [{ changes: [] }, { changes: [{ end: "nose", amount: 0 }] }, { changes: [{ end: "deck", amount: 5 }] }, "bent", null]) {
      expect(parseSavedBlankInput({ copy: LONG, rocker })).toBeNull();
    }
    for (const value of [null, undefined, 7, "blank", [LONG, NOSE_UP]]) expect(parseSavedBlankInput(value)).toBeNull();
  });
});

describe("savedBlankFromRow", () => {
  it("reads a good row and drops a bad one", () => {
    expect(savedBlankFromRow({ id: "row-1", copy: LONG, rocker: NOSE_UP })).toEqual(saved("row-1", LONG, NOSE_UP));
    expect(savedBlankFromRow({ id: "row-1", copy: { vendor: "x" }, rocker: NOSE_UP })).toBeNull();
    expect(savedBlankFromRow({ id: "row-1", copy: LONG, rocker: { changes: [] } })).toBeNull();
    expect(savedBlankFromRow({ id: 7, copy: LONG, rocker: NOSE_UP })).toBeNull();
  });
});

describe("the browser list's allow-list reader", () => {
  it("keeps good entries, drops a bad id, a bad pair and a repeat by identity (the first kept)", () => {
    const list = parseSavedBlanks([
      { id: "a", copy: LONG, rocker: NOSE_UP },
      { id: "", copy: LONG, rocker: TAIL_18 },
      { id: "x".repeat(65), copy: LONG, rocker: TAIL_18 },
      { id: "b", copy: LONG, rocker: { changes: [] } },
      { id: "c", copy: LONG, rocker: NOSE_UP },
      { id: "d", copy: SHORT, rocker: TAIL_18 },
      "junk",
    ]);
    expect(list).toEqual([saved("a", LONG, NOSE_UP), saved("d", SHORT, TAIL_18)]);
  });

  it(`keeps at most ${SAVED_BLANKS_MAX}`, () => {
    // Every entry a different blank by identity: 32 sixteenths, each from four bend points.
    const many = Array.from({ length: SAVED_BLANKS_MAX + 5 }, (_, i) => ({
      id: `id-${i}`,
      copy: LONG,
      rocker: {
        changes: [{ end: "nose", amount: inchesToMm(((i % 32) + 1) / 16), fromTip: inchesToMm([40, 12, 18, 24][Math.floor(i / 32)]) }],
      },
    }));
    expect(new Set(many.map((entry) => savedBlankIdentity(parseSavedBlankInput(entry)!))).size).toBe(many.length);
    expect(parseSavedBlanks(many)).toHaveLength(SAVED_BLANKS_MAX);
  });

  it("reads malformed JSON, a non-list or nothing stored as no saved blanks, and never throws", () => {
    for (const text of [null, undefined, "", "{", "{}", '"x"', "42"]) expect(parseSavedBlanksText(text)).toEqual([]);
    expect(parseSavedBlanks({ id: "a" })).toEqual([]);
  });

  it("round-trips through its own JSON", () => {
    const list = [saved("a", LONG, NOSE_UP), saved("b", SHORT, TAIL_18)];
    expect(parseSavedBlanksText(savedBlanksJson(list))).toEqual(list);
  });
});

describe("the list's edits", () => {
  const a = saved("a", LONG, NOSE_UP);
  const b = saved("b", SHORT, TAIL_18);

  it("withSavedBlank appends, and returns the SAME list for a repeat identity or at the cap", () => {
    const one = withSavedBlank([], a);
    expect(one).toEqual([a]);
    const both = withSavedBlank(one, b);
    expect(both).toEqual([a, b]);
    expect(withSavedBlank(both, { ...a, id: "another" })).toBe(both);
    const full = Array.from({ length: SAVED_BLANKS_MAX }, (_, i) => ({ ...a, id: `f${i}` }));
    expect(withSavedBlank(full, b)).toBe(full);
  });

  it("withoutSavedBlank removes by id, the same list when absent", () => {
    const list = [a, b];
    expect(withoutSavedBlank(list, "a")).toEqual([b]);
    expect(withoutSavedBlank(list, "zz")).toBe(list);
  });

  it("withReplacedSavedBlank edits in place, keeping the id and the position", () => {
    const list = [a, b];
    const rocker = normalizeSpec(TAIL_18, LONG.lengthMm);
    expect(withReplacedSavedBlank(list, "a", LONG, rocker)).toEqual([{ id: "a", copy: LONG, rocker }, b]);
    expect(withReplacedSavedBlank(list, "zz", LONG, rocker)).toBe(list);
  });

  it("a saved blank's identity is its star key", () => {
    expect(savedBlankIdentity(a)).toBe(starKey(...blankStarIdentity(a.copy, a.rocker)));
  });
});
