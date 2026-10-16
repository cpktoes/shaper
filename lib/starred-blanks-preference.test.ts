import { describe, expect, it } from "vitest";
import { BLANK_TEXT_MAX } from "./blanks/catalog";
import {
  parseStarredBlanks,
  parseStarredBlanksText,
  STARRED_BLANKS_MAX,
  STARRED_BLANKS_STORAGE_KEY,
  starKey,
  starredBlanksJson,
  withStar,
  type StarredBlank,
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
