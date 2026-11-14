import { describe, expect, it, vi } from "vitest";
// Fitting a board file is slow work, and a busy machine (the whole suite at once) can stretch a case past the default five
// seconds: the cases here are generous rather than flaky.
vi.setConfig({ testTimeout: 60_000 });
import { buildBoardSurface } from "../geometry/board-surface";
import { designCrossSectionInput, designSideProfile, deriveEffectiveRails, LIVE_DESIGN_RULES } from "../geometry/design";
import { buildOutline } from "../geometry/outline";
import { phase16Boards } from "../geometry/__fixtures__/phase16-boards";
import { brdBoardFields } from "../models/brd-board";
import { brdText } from "./brd";
import { brdFitLook } from "./brd-fit-preview";
import { brdLookFromBytes } from "./brd-look";
import { BRD_READ_MAX_BYTES, readAnyBrd } from "./brd-read";

/**
 * The look in one call (quick 261113-kvo, Task 3), on the app's own Shortboard: written by the app's writer, so the right answer is
 * the look `brdFitLook` makes of the read board and the fields `brdBoardFields` makes of it.
 */
const fields = phase16Boards().find((b) => b.label === "shortboard|asis|hard")!.fields;
const text = (() => {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const surface = buildBoardSurface({ sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length), geometry, rockerAt: profile.rockerAt });
  return brdText(surface).text;
})();
const bytes = Uint8Array.from(text, (ch) => ch.charCodeAt(0));

describe("brdLookFromBytes", () => {
  const result = brdLookFromBytes(bytes, "Short.brd");

  it("gives, for a readable file, the very look brdFitLook makes of the read board, and the fields it opens as", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    const read = readAnyBrd(bytes);
    if (!read.ok) throw new Error("the app's own file would not read");
    const look = brdFitLook(read.board);
    expect(result.look).toEqual(look);
    expect(result.fields).toEqual(brdBoardFields(look.fit, "Short.brd", look.bottom?.bottom ?? null, look.rails?.rails ?? null));
    expect(result.fields?.boardName).toBe("Short");
    expect(result.fields?.rails).toEqual(look.rails!.rails);
  });

  it("crosses to the page by structured clone: the clone is deep-equal, so nothing in it is a function or a class instance", () => {
    expect(structuredClone(result)).toEqual(result);
    // and nothing but plain data survives a JSON round trip either (no function, no undefined-only key hiding a class)
    const plain = (value: unknown): boolean => {
      if (value === null || typeof value !== "object") return typeof value !== "function";
      if (Array.isArray(value)) return value.every(plain);
      return Object.getPrototypeOf(value) === Object.prototype && Object.values(value).every(plain);
    };
    expect(plain(result)).toBe(true);
  });

  it("says unreadable for empty bytes and for junk, and never throws", () => {
    expect(brdLookFromBytes(new Uint8Array(0), "x.brd")).toEqual({ ok: false, problem: "unreadable" });
    expect(brdLookFromBytes(Uint8Array.from("this is not a board file at all", (ch) => ch.charCodeAt(0)), "x.brd")).toEqual({ ok: false, problem: "unreadable" });
    expect(brdLookFromBytes(new Uint8Array([0xff, 0xfe, 0x00, 0x01]), "x.brd")).toEqual({ ok: false, problem: "unreadable" });
  });

  it("says too-big for a file over the reader's cap, before reading it", () => {
    expect(brdLookFromBytes(new Uint8Array(BRD_READ_MAX_BYTES + 1), "big.brd")).toEqual({ ok: false, problem: "too-big" });
  });

  it("says out-of-range, with the board's own length, for a board this app cannot make", () => {
    const longer = text.replace(/^p01 : .*$/m, "p01 : 400.0");
    expect(longer).not.toBe(text);
    const out = brdLookFromBytes(Uint8Array.from(longer, (ch) => ch.charCodeAt(0)), "long.brd");
    expect(out.ok).toBe(false);
    expect(out).toMatchObject({ ok: false, problem: "out-of-range" });
    expect((out as { length: number }).length).toBeCloseTo(4000, 6);
  });
});
