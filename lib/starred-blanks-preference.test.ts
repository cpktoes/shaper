import { describe, expect, it } from "vitest";
import { BLANK_TEXT_MAX } from "./blanks/catalog";
import {
  applyStarChange,
  decideStarredBlanksHandoff,
  joinStarredBlanks,
  parseStarredBlanks,
  parseStarredBlanksInput,
  parseStarredBlanksText,
  STARRED_BLANKS_MAX,
  STARRED_BLANKS_STORAGE_KEY,
  STARRED_BLANKS_TO_JOIN_STORAGE_KEY,
  starKey,
  starredBlanksJson,
  withStar,
  type StarredBlank,
  type StarredBlanksHandoff,
} from "./starred-blanks-preference";

// The stored stars are untrusted (quick 261015-ve9, D-06, T-ve9-05 / T-ve9-06).

const LONGEST = "x".repeat(BLANK_TEXT_MAX);
const TOO_LONG = "x".repeat(BLANK_TEXT_MAX + 1);

describe("starred blanks preference", () => {
  it("is stored under shaper-starred-blanks, at most 500", () => {
    expect(STARRED_BLANKS_STORAGE_KEY).toBe("shaper-starred-blanks");
    expect(STARRED_BLANKS_MAX).toBe(500);
  });

  describe("parseStarredBlanks", () => {
    it("keeps [maker, name] string pairs, each 1 to BLANK_TEXT_MAX characters", () => {
      expect(parseStarredBlanks([["US Blanks", `6'2"A`], ["Marko Foam", LONGEST]])).toEqual([
        ["US Blanks", `6'2"A`],
        ["Marko Foam", LONGEST],
      ]);
      expect(parseStarredBlanks([])).toEqual([]);
    });

    it("drops numbers, objects, three-element arrays, empty strings and over-long strings", () => {
      expect(
        parseStarredBlanks([
          3,
          { vendor: "US Blanks", name: "A" },
          ["US Blanks", "A", "B"],
          ["US Blanks"],
          ["", "A"],
          ["US Blanks", ""],
          ["US Blanks", TOO_LONG],
          [TOO_LONG, "A"],
          [1, 2],
          null,
          "US Blanks",
          ["Arctic Foam", "Keep"],
        ]),
      ).toEqual([["Arctic Foam", "Keep"]]);
    });

    it("drops repeats, keeping the first", () => {
      expect(parseStarredBlanks([["A", "1"], ["B", "2"], ["A", "1"]])).toEqual([
        ["A", "1"],
        ["B", "2"],
      ]);
    });

    it("keeps at most STARRED_BLANKS_MAX", () => {
      const many = Array.from({ length: STARRED_BLANKS_MAX + 50 }, (_, i) => ["Maker", `Blank ${i}`]);
      const got = parseStarredBlanks(many);
      expect(got).toHaveLength(STARRED_BLANKS_MAX);
      expect(got[0]).toEqual(["Maker", "Blank 0"]);
    });

    it("reads anything that is not a list as no stars, and never throws", () => {
      let deep: unknown = ["A", "B"];
      for (let i = 0; i < 5000; i++) deep = [deep];
      for (const junk of [null, undefined, "stars", 3, {}, { 0: ["A", "B"] }, true, deep]) {
        expect(() => parseStarredBlanks(junk)).not.toThrow();
      }
      for (const junk of [null, undefined, "stars", 3, {}, true]) {
        expect(parseStarredBlanks(junk)).toEqual([]);
      }
      expect(parseStarredBlanks(deep)).toEqual([]);
    });
  });

  describe("parseStarredBlanksText", () => {
    it("reads nothing stored, malformed JSON and a non-list as no stars", () => {
      for (const junk of [null, undefined, "", "not-json", "[oops", "{}", '{"x":1}', "12"]) {
        expect(parseStarredBlanksText(junk)).toEqual([]);
      }
    });

    it("round-trips what starredBlanksJson writes", () => {
      const stars: StarredBlank[] = [
        ["US Blanks", `6'2"A`],
        ["Marko Foam", "10'2\" M"],
      ];
      expect(parseStarredBlanksText(starredBlanksJson(stars))).toEqual(stars);
    });
  });

  it("starKey can't be fooled by a separator inside a name", () => {
    expect(starKey("A", "B|C")).not.toBe(starKey("A|B", "C"));
    expect(starKey("A", "B")).toBe(starKey("A", "B"));
  });

  describe("withStar", () => {
    const start: StarredBlank[] = [["A", "1"]];

    it("adds at the end and removes", () => {
      const added = withStar(start, "B", "2", true);
      expect(added).toEqual([
        ["A", "1"],
        ["B", "2"],
      ]);
      expect(withStar(added, "A", "1", false)).toEqual([["B", "2"]]);
    });

    it("returns the same list when nothing changes", () => {
      expect(withStar(start, "A", "1", true)).toBe(start);
      expect(withStar(start, "B", "2", false)).toBe(start);
      const full = Array.from({ length: STARRED_BLANKS_MAX }, (_, i): StarredBlank => ["Maker", `Blank ${i}`]);
      expect(withStar(full, "Maker", "One more", true)).toBe(full);
      expect(withStar(start, "B", TOO_LONG, true)).toBe(start);
      expect(withStar(start, "", "2", true)).toBe(start);
    });
  });
});

// Part 2 — stars on the shaper's account (quick 261016-usz, 2026-10-16, D-03 / D-04 and the
// planner's choices P-1 to P-8). Made-up [maker, name] pairs only.

const A: StarredBlank = ["Maker A", "One"];
const B: StarredBlank = ["Maker A", "Two"];
const P: StarredBlank = ["Maker P", "Account"];
const Q: StarredBlank = ["Maker Q", "Stale"];
const S: StarredBlank = ["Maker S", "Synced"];
const X: StarredBlank = ["Maker X", "Browser"];
const Y: StarredBlank = ["Maker Y", "Both"];
const Z: StarredBlank = ["Maker Z", "Account only"];

const SIGNED_OUT: StarredBlanksHandoff = { kind: "signed-out" };
const UNREADABLE: StarredBlanksHandoff = { kind: "account-unreadable" };
const signedIn = (account: StarredBlank[]): StarredBlanksHandoff => ({ kind: "signed-in", account });

function pairs(count: number, maker: string): StarredBlank[] {
  return Array.from({ length: count }, (_, i): StarredBlank => [maker, `Blank ${i}`]);
}

describe("starred blanks on the account (quick 261016-usz)", () => {
  it("keeps the stars still waiting to join an account under their own key (P-1)", () => {
    expect(STARRED_BLANKS_TO_JOIN_STORAGE_KEY).toBe("shaper-starred-blanks-to-join");
    expect(STARRED_BLANKS_TO_JOIN_STORAGE_KEY).not.toBe(STARRED_BLANKS_STORAGE_KEY);
  });

  describe("parseStarredBlanksInput (P-6)", () => {
    it("refuses anything that is not a list", () => {
      for (const junk of [null, undefined, "stars", 3, { 0: ["A", "B"] }, {}]) {
        expect(parseStarredBlanksInput(junk)).toBeNull();
      }
    });

    it("keeps an empty list as an empty list", () => {
      expect(parseStarredBlanksInput([])).toEqual([]);
    });

    it("keeps exactly what the stored-list reader keeps", () => {
      const messy = [A, 3, ["", "x"], ["Maker", TOO_LONG], A, B, null];
      expect(parseStarredBlanksInput(messy)).toEqual([A, B]);
      expect(parseStarredBlanksInput(messy)).toEqual(parseStarredBlanks(messy));
      const many = pairs(STARRED_BLANKS_MAX + 20, "Maker");
      expect(parseStarredBlanksInput(many)).toHaveLength(STARRED_BLANKS_MAX);
    });
  });

  describe("joinStarredBlanks", () => {
    it("puts the account's stars first, then each browser-only star in its own order", () => {
      expect(joinStarredBlanks([P, Z], [X, A])).toEqual([P, Z, X, A]);
    });

    it("keeps a star on both once, in the account's place", () => {
      expect(joinStarredBlanks([P, Y], [Y, X])).toEqual([P, Y, X]);
    });

    it("stops at the cap: 499 + 3 keeps the first browser-only star, and 500 stays as it was", () => {
      const nearlyFull = pairs(STARRED_BLANKS_MAX - 1, "Account");
      const joined = joinStarredBlanks(nearlyFull, [X, A, B]);
      expect(joined).toHaveLength(STARRED_BLANKS_MAX);
      expect(joined[STARRED_BLANKS_MAX - 1]).toEqual(X);
      const full = pairs(STARRED_BLANKS_MAX, "Account");
      expect(joinStarredBlanks(full, [X])).toEqual(full);
    });

    it("changes neither input", () => {
      const account: StarredBlank[] = [P];
      const browserOnly: StarredBlank[] = [X];
      joinStarredBlanks(account, browserOnly);
      expect(account).toEqual([P]);
      expect(browserOnly).toEqual([X]);
    });
  });

  describe("decideStarredBlanksHandoff", () => {
    it("signed out: shows this browser's stars and writes nothing, even with stars waiting to join (D-02)", () => {
      expect(decideStarredBlanksHandoff({ handoff: SIGNED_OUT, browser: [A, B], toJoin: [B] })).toEqual({
        starred: [A, B],
        writeBrowser: null,
        writeToJoin: null,
        saveToAccount: null,
      });
      expect(decideStarredBlanksHandoff({ handoff: SIGNED_OUT, browser: [A], toJoin: null })).toEqual({
        starred: [A],
        writeBrowser: null,
        writeToJoin: null,
        saveToAccount: null,
      });
    });

    it("account unreadable: the same as signed out — the waiting stars are kept, nothing is saved (P-3)", () => {
      expect(decideStarredBlanksHandoff({ handoff: UNREADABLE, browser: [A, X], toJoin: [X] })).toEqual({
        starred: [A, X],
        writeBrowser: null,
        writeToJoin: null,
        saveToAccount: null,
      });
    });

    describe("signed in, nothing waiting to join — the account replaces the browser", () => {
      it("a star removed on another device stays removed here", () => {
        expect(decideStarredBlanksHandoff({ handoff: signedIn([A]), browser: [A, B], toJoin: [] })).toEqual({
          starred: [A],
          writeBrowser: [A],
          writeToJoin: null,
          saveToAccount: null,
        });
      });

      it("writes nothing when the browser already matches the account", () => {
        expect(decideStarredBlanksHandoff({ handoff: signedIn([A, B]), browser: [A, B], toJoin: [] })).toEqual({
          starred: [A, B],
          writeBrowser: null,
          writeToJoin: null,
          saveToAccount: null,
        });
      });

      it("another shaper's synced stars never leak into this account", () => {
        expect(decideStarredBlanksHandoff({ handoff: signedIn([]), browser: [X, Y], toJoin: [] })).toEqual({
          starred: [],
          writeBrowser: [],
          writeToJoin: null,
          saveToAccount: null,
        });
      });
    });

    describe("signed in, joining stars made while signed out (P-1)", () => {
      it("joins only the waiting stars, after the account's, and saves the result", () => {
        expect(decideStarredBlanksHandoff({ handoff: signedIn([P]), browser: [S, X], toJoin: [X] })).toEqual({
          starred: [P, X],
          writeBrowser: [P, X],
          writeToJoin: [],
          saveToAccount: [P, X],
        });
      });

      it("saves nothing when every waiting star is already on the account, but still clears the wait", () => {
        expect(decideStarredBlanksHandoff({ handoff: signedIn([P, X]), browser: [P, X], toJoin: [X] })).toEqual({
          starred: [P, X],
          writeBrowser: null,
          writeToJoin: [],
          saveToAccount: null,
        });
      });
    });

    describe("signed in, a browser from before the account kept stars (P-2)", () => {
      it("joins every star this browser holds, after the account's", () => {
        expect(decideStarredBlanksHandoff({ handoff: signedIn([Y, Z]), browser: [X, Y], toJoin: null })).toEqual({
          starred: [Y, Z, X],
          writeBrowser: [Y, Z, X],
          writeToJoin: [],
          saveToAccount: [Y, Z, X],
        });
      });

      it("with no stars here, shows the account's and starts the waiting list empty", () => {
        expect(decideStarredBlanksHandoff({ handoff: signedIn([A]), browser: [], toJoin: null })).toEqual({
          starred: [A],
          writeBrowser: [A],
          writeToJoin: [],
          saveToAccount: null,
        });
      });
    });

    it("a waiting star no longer starred here joins nothing (P-8)", () => {
      expect(decideStarredBlanksHandoff({ handoff: signedIn([P]), browser: [P], toJoin: [Q] })).toEqual({
        starred: [P],
        writeBrowser: null,
        writeToJoin: [],
        saveToAccount: null,
      });
    });

    it("changes none of its inputs", () => {
      const account: StarredBlank[] = [P];
      const browser: StarredBlank[] = [S, X];
      const toJoin: StarredBlank[] = [X];
      decideStarredBlanksHandoff({ handoff: signedIn(account), browser, toJoin });
      expect(account).toEqual([P]);
      expect(browser).toEqual([S, X]);
      expect(toJoin).toEqual([X]);
    });
  });

  describe("applyStarChange", () => {
    it("is null whenever the star list would not change", () => {
      const full = pairs(STARRED_BLANKS_MAX, "Maker");
      for (const savesToAccount of [false, true]) {
        const base = { savesToAccount, toJoin: [] as StarredBlank[] };
        expect(applyStarChange({ ...base, starred: [A], vendor: A[0], name: A[1], on: true })).toBeNull();
        expect(applyStarChange({ ...base, starred: [A], vendor: B[0], name: B[1], on: false })).toBeNull();
        expect(applyStarChange({ ...base, starred: full, vendor: "Maker", name: "Extra", on: true })).toBeNull();
        expect(applyStarChange({ ...base, starred: [A], vendor: "Maker", name: TOO_LONG, on: true })).toBeNull();
      }
    });

    describe("in this browser only (signed out, or the account unreadable)", () => {
      it("a new star waits to join an account, and nothing is saved", () => {
        expect(
          applyStarChange({ savesToAccount: false, starred: [A], toJoin: [], vendor: X[0], name: X[1], on: true }),
        ).toEqual({ starred: [A, X], toJoin: [X], save: null });
      });

      it("unstarring a waiting star takes it off both lists", () => {
        expect(
          applyStarChange({ savesToAccount: false, starred: [A, X], toJoin: [X], vendor: X[0], name: X[1], on: false }),
        ).toEqual({ starred: [A], toJoin: [], save: null });
      });

      it("unstarring a star that came from an account only changes this browser (P-5)", () => {
        expect(
          applyStarChange({ savesToAccount: false, starred: [A, X], toJoin: [X], vendor: A[0], name: A[1], on: false }),
        ).toEqual({ starred: [X], toJoin: [X], save: null });
      });

      it("a browser from before the account kept stars treats every star as waiting (P-2)", () => {
        expect(
          applyStarChange({ savesToAccount: false, starred: [A], toJoin: null, vendor: X[0], name: X[1], on: true }),
        ).toEqual({ starred: [A, X], toJoin: [A, X], save: null });
      });
    });

    describe("on the account (signed in)", () => {
      it("starring saves the new list and leaves the waiting list alone", () => {
        expect(
          applyStarChange({ savesToAccount: true, starred: [A], toJoin: [], vendor: X[0], name: X[1], on: true }),
        ).toEqual({ starred: [A, X], toJoin: null, save: [A, X] });
      });

      it("unstarring saves the new list", () => {
        expect(
          applyStarChange({ savesToAccount: true, starred: [A, X], toJoin: [], vendor: A[0], name: A[1], on: false }),
        ).toEqual({ starred: [X], toJoin: null, save: [X] });
      });

      it("unstarring a star still on the waiting list takes it off that list too", () => {
        expect(
          applyStarChange({ savesToAccount: true, starred: [A, X], toJoin: [X], vendor: X[0], name: X[1], on: false }),
        ).toEqual({ starred: [A], toJoin: [], save: [A] });
      });
    });
  });
});
