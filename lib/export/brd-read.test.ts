import { describe, expect, it } from "vitest";
import { buildBoardSurface, type BoardSurface } from "../geometry/board-surface";
import { lineHighestAt } from "../geometry/brd-fit";
import {
  designCrossSectionInput,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
  type DesignSummaryFields,
} from "../geometry/design";
import { BOARD_LENGTH_RANGE_IN } from "../geometry/board";
import { buildOutline } from "../geometry/outline";
import { inchesToMm, mm } from "../geometry/units";
import { phase16Boards } from "../geometry/__fixtures__/phase16-boards";
import { BOARD_FILE_ACCEPT } from "../models/board-file";
import { brdFile, brdText } from "./brd";
import {
  BRD_FILE_ACCEPT,
  BRD_READ_MAX_BYTES,
  BRD_READ_MAX_KNOTS,
  isBrdFileName,
  readAnyBrd,
  type ReadBrdBoard,
} from "./brd-read";
import { BRD_MAGIC, scrambleBrd } from "./brd-scramble";

/**
 * The forgiving .brd reader (quick 261113-d9b): this app's own files (locked, plain, plain with Windows line ends), a small
 * hand-made text laid out the way AkuShaper lays its own out (made here from the format's facts, never from anyone's board),
 * and every way a file can be damaged. Expected figures are read off the app's own functions (Rule 1).
 */

const bytesOf = (text: string): Uint8Array => Uint8Array.from(text, (ch) => ch.charCodeAt(0));

function flatSurface(fields: DesignSummaryFields): BoardSurface {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  return buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length),
    geometry,
    rockerAt: profile.rockerAt,
  });
}

const shortboard = phase16Boards().find((b) => b.label === "shortboard|asis|hard")!.fields;
const surface = flatSurface(shortboard);
const own = brdText(surface).text;

const mustRead = (bytes: Uint8Array): ReadBrdBoard => {
  const result = readAnyBrd(bytes);
  if (!result.ok) throw new Error(`expected a board, got ${JSON.stringify(result)}`);
  return result.board;
};

/** A hand-made file in AkuShaper's layout: odd header fields, a square tail, a knot with its second flag true, guide points. */
function aku(over: { p01?: string; mutate?: (lines: string[]) => string[]; outlineKnots?: string[] } = {}): string {
  const outlineKnots = over.outlineKnots ?? [
    "(cp [0.0,0.0,0.0,0.0,0.0,0.0] false false)",
    "(cp [0.0,7.5,0.0,7.5,0.0,7.5] false false)",
    "(cp [91.5,23.5,70.0,23.5,115.0,23.5] true false)",
    "(cp [183.0,0.0,183.0,9.0,183.0,0.0] true false)",
  ];
  const lines = [
    `p01 : ${over.p01 ?? "183.0"}`,
    "p02 : 185.5",
    "p03 : 6.4",
    "p04 : 47.0",
    "p07 : V4.4",
    'p08 : "Somebody\'s Secret Board"',
    "p45 : ",
    "p10 : C:\\Users\\Somebody\\Boards\\secret-board.brd",
    "p58 : 1234567890123456789012345678901234567890",
    "p50 : [0.0,0.0,0.0,0.0]",
    "p15 : 3.08E-4",
    "p32 : (",
    ...outlineKnots,
    ")",
    "p33 : (",
    "(cp [0.0,4.0,0.0,4.0,0.0,4.0] true false)",
    "(cp [91.5,0.0,60.0,0.0,120.0,0.0] true true)",
    "(cp [183.0,11.0,170.0,6.0,183.0,11.0] true false)",
    ")",
    "p34 : (",
    "(cp [0.0,5.5,0.0,5.5,0.0,5.5] true false)",
    "(cp [91.5,6.4,60.0,6.4,120.0,6.4] true false)",
    "(cp [183.0,11.0,170.0,9.0,183.0,11.0] true false)",
    ")",
    "p35 : (",
    "(p36 0.0 -1.0 -1.0",
    "(cp [not,even,numbers] true false)",
    ")",
    "gps : (",
    "(gp [1.0,2.0])",
    ")",
    ")",
  ];
  return (over.mutate ? over.mutate(lines) : lines).join("\r\n") + "\r\n";
}

describe("the file's name", () => {
  it("says whether it is a .brd, in any case", () => {
    expect(isBrdFileName("board.brd")).toBe(true);
    expect(isBrdFileName("BOARD.BRD")).toBe(true);
    expect(isBrdFileName("Shortboard_decrypt.brd")).toBe(true);
    expect(isBrdFileName("board.json")).toBe(false);
    expect(isBrdFileName("brd")).toBe(false);
  });

  it("is added to Open a board file only: the shared accept list stays JSON", () => {
    expect(BRD_FILE_ACCEPT).toBe(".brd");
    expect(BOARD_FILE_ACCEPT).not.toContain(".brd");
    expect(BRD_READ_MAX_BYTES).toBe(2 * 1024 * 1024);
  });
});

describe("this app's own files", () => {
  const forms: [string, Uint8Array][] = [
    ["scrambled", brdFile(surface, "Shortboard").data],
    ["plain", bytesOf(own)],
    ["plain with Windows line ends", bytesOf(own.replace(/\n/g, "\r\n"))],
  ];

  it.each(forms)("reads the %s file, length exactly the file's p01, three lines from tail to nose", (_name, data) => {
    const board = mustRead(data);
    expect(board.length).toBeCloseTo(surface.length, 6);
    for (const line of [board.outline, board.bottom, board.deck]) {
      expect(line.length).toBeGreaterThan(2);
      expect(line[0][0]).toBeCloseTo(0, 6);
      expect(line[line.length - 1][0]).toBeCloseTo(board.length, 6);
    }
    expect(board.width).toBeCloseTo(surface.width, 6);
    expect(board.thickness).toBeGreaterThan(0);
  });

  it("reads the same board from all three forms", () => {
    const [a, b, c] = forms.map(([, data]) => mustRead(data));
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });

  it("gives the outline as half-widths, never negative", () => {
    const board = mustRead(forms[0][1]);
    expect(Math.min(...board.outline.map(([, y]) => y))).toBeGreaterThanOrEqual(0);
  });
});

describe("a hand-made file in AkuShaper's layout", () => {
  const board = mustRead(bytesOf(aku()));

  it("reads, with a square tail 75 mm up the end", () => {
    expect(board.length).toBeCloseTo(1830, 6);
    expect(lineHighestAt(board.outline, 0)).toBeCloseTo(75, 6);
    expect(board.width).toBeCloseTo(470, 6);
    expect(board.thickness).toBeCloseTo(64, 6);
  });

  it("holds none of the header's text", () => {
    const everything = JSON.stringify(board);
    expect(everything).not.toMatch(/Somebody|secret|Users|1234567890|V4\.4/);
    expect(Object.keys(board).sort()).toEqual(["bottom", "deck", "length", "outline", "thickness", "width"]);
  });

  it("reads the same locked, and never looks at the cross-sections (the junk in them is not read)", () => {
    expect(mustRead(scrambleBrd(aku()))).toEqual(board);
  });

  it("reads with plain line ends too", () => {
    expect(mustRead(bytesOf(aku().replace(/\r\n/g, "\n")))).toEqual(board);
  });
});

describe("every way a file can be damaged", () => {
  const unreadable = { ok: false, problem: "unreadable" } as const;

  it("refuses an empty file", () => {
    expect(readAnyBrd(new Uint8Array(0))).toEqual(unreadable);
  });

  it("refuses the stamp followed by junk", () => {
    const junk = new Uint8Array(BRD_MAGIC.length + 64);
    junk.set(bytesOf(BRD_MAGIC));
    for (let i = BRD_MAGIC.length; i < junk.length; i++) junk[i] = (i * 37 + 11) % 256;
    expect(readAnyBrd(junk)).toEqual(unreadable);
  });

  it("refuses plain text that is not a board", () => {
    expect(readAnyBrd(bytesOf("hello"))).toEqual(unreadable);
    expect(readAnyBrd(bytesOf(aku({ mutate: (l) => l.filter((x, i, all) => !(i >= all.indexOf("p33 : (") && i <= all.indexOf("p33 : (") + 4)) })))).toEqual(unreadable);
  });

  it("refuses a file over the size cap without reading it", () => {
    expect(readAnyBrd(new Uint8Array(BRD_READ_MAX_BYTES + 1))).toEqual(unreadable);
  });

  it.each([
    ["five numbers", "(cp [0.0,0.0,0.0,0.0,0.0] false false)"],
    ["a NaN", "(cp [NaN,0.0,0.0,0.0,0.0,0.0] false false)"],
    ["an Infinity", "(cp [0.0,Infinity,0.0,0.0,0.0,0.0] false false)"],
    ["a number far beyond any board", "(cp [0.0,99999.0,0.0,0.0,0.0,0.0] false false)"],
    ["an empty number", "(cp [0.0,,0.0,0.0,0.0,0.0] false false)"],
    ["a flag that is neither", "(cp [0.0,0.0,0.0,0.0,0.0,0.0] maybe false)"],
  ])("refuses a knot with %s", (_why, knot) => {
    const text = aku({ mutate: (l) => l.map((x, i) => (i === l.indexOf("p32 : (") + 1 ? knot : x)) });
    expect(readAnyBrd(bytesOf(text))).toEqual(unreadable);
  });

  it("refuses a curve with more knots than the cap", () => {
    const many = Array.from({ length: BRD_READ_MAX_KNOTS + 1 }, (_, i) => {
      const x = (183 * i) / BRD_READ_MAX_KNOTS;
      return `(cp [${x},5.0,${x},5.0,${x},5.0] true false)`;
    });
    expect(readAnyBrd(bytesOf(aku({ outlineKnots: many })))).toEqual(unreadable);
    expect(readAnyBrd(bytesOf(aku({ outlineKnots: many.slice(0, BRD_READ_MAX_KNOTS) })))).toMatchObject({ ok: true });
  });

  it("refuses a curve that does not reach from the tail to the nose", () => {
    const short = [
      "(cp [0.0,0.0,0.0,0.0,0.0,0.0] false false)",
      "(cp [100.0,20.0,100.0,20.0,100.0,20.0] true false)",
    ];
    expect(readAnyBrd(bytesOf(aku({ outlineKnots: short })))).toEqual(unreadable);
  });

  it("refuses a missing or non-positive length", () => {
    expect(readAnyBrd(bytesOf(aku({ mutate: (l) => l.filter((x) => !x.startsWith("p01")) })))).toEqual(unreadable);
    expect(readAnyBrd(bytesOf(aku({ p01: "0.0" })))).toEqual(unreadable);
    expect(readAnyBrd(bytesOf(aku({ p01: "abc" })))).toEqual(unreadable);
  });

  it("says out-of-range, with the length, for a board this app cannot make", () => {
    const tooLong = readAnyBrd(bytesOf(aku({ p01: "400.0" })));
    expect(tooLong.ok).toBe(false);
    expect(tooLong).toMatchObject({ problem: "out-of-range" });
    expect((tooLong as { length: number }).length).toBeCloseTo(mm(4000), 6);
    expect((tooLong as { length: number }).length).toBeGreaterThan(inchesToMm(BOARD_LENGTH_RANGE_IN.max));
    const tooShort = readAnyBrd(bytesOf(aku({ p01: "100.0" })));
    expect(tooShort).toMatchObject({ ok: false, problem: "out-of-range" });
    expect((tooShort as { length: number }).length).toBeLessThan(inchesToMm(BOARD_LENGTH_RANGE_IN.min));
  });
});
