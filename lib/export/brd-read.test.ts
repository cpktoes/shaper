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
  BRD_READ_MAX_SECTIONS,
  brdFinWord,
  isBrdFileName,
  parseBrdFinLine,
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
    expect(Object.keys(board).sort()).toEqual(["bottom", "deck", "fins", "length", "outline", "sections", "thickness", "width"]);
  });

  it("reads the same locked", () => {
    expect(mustRead(scrambleBrd(aku()))).toEqual(board);
  });

  it("drops a section with junk in it on its own, and the board still reads (the made-up section here holds words, not knots)", () => {
    expect(board.sections).toEqual([]);
  });

  it("reads with plain line ends too", () => {
    expect(mustRead(bytesOf(aku().replace(/\r\n/g, "\n")))).toEqual(board);
  });

  // A board drawn over guide points carries a `gps : (` block INSIDE its outline, bottom or deck, before the curve's
  // own closing bracket — not only inside a cross-section. Such a file used to be turned away as unreadable.
  it("skips a gps guide-point block inside the outline, the bottom or the deck, and reads the same board", () => {
    const guides = ["gps : (", "(gp [20.49,-0.21])", "(gp [12.93,-0.13])", ")"];
    for (const curve of ["p32 : (", "p33 : (", "p34 : ("]) {
      const text = aku({
        mutate: (l) => {
          const close = l.indexOf(")", l.indexOf(curve));
          return [...l.slice(0, close), ...guides, ...l.slice(close)];
        },
      });
      expect(mustRead(bytesOf(text))).toEqual(board);
    }
  });

  it("skips a gps block written on one line inside a curve without swallowing the curve's closing bracket", () => {
    const text = aku({
      mutate: (l) => {
        const close = l.indexOf(")", l.indexOf("p32 : ("));
        return [...l.slice(0, close), "gps : ( (gp [20.49,-0.21]) (gp [12.93,-0.13]) )", ...l.slice(close)];
      },
    });
    expect(mustRead(bytesOf(text))).toEqual(board);
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

  it("holds the header's length, width and thickness to the same 10,000 cm limit as a knot, so none can read as Infinity (quick 261114-118, IN-01)", () => {
    // A length outside the limit is a figure that is not usable at all: the file is unreadable, never an out-of-range board of "Infinity".
    expect(readAnyBrd(bytesOf(aku({ p01: "1e308" })))).toEqual(unreadable);
    expect(readAnyBrd(bytesOf(aku({ p01: "10001" })))).toEqual(unreadable);
    // A width or thickness outside it reads as absent (null), as a non-number does, and the board still reads.
    for (const field of ["p03", "p04"]) {
      const huge = mustRead(bytesOf(aku({ mutate: (l) => l.map((x) => (x.startsWith(`${field} :`) ? `${field} : 1e308` : x)) })));
      expect(huge[field === "p03" ? "thickness" : "width"]).toBeNull();
      expect(huge.length).toBeCloseTo(1830, 6);
    }
    // At the limit a figure still counts, and an ordinary file keeps its width and thickness.
    expect(mustRead(bytesOf(aku({ mutate: (l) => l.map((x) => (x.startsWith("p04 :") ? "p04 : 10000" : x)) }))).width).toBeCloseTo(100_000, 6);
    const ordinary = mustRead(bytesOf(aku()));
    expect(ordinary.width).toBeCloseTo(470, 6);
    expect(ordinary.thickness).toBeCloseTo(64, 6);
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

/**
 * The cross-sections (quick 261113-gwr). A hand-made file in AkuShaper's layout: a one-knot all-zero section closing the tail, two
 * five-knot sections whose knots carry `true false`, the first with a `gps : (` guide-point block inside it, and a one-knot
 * section closing the nose. Made-up numbers only.
 */
describe("the cross-sections", () => {
  const section = (station: string, knots: string[], gps = false): string[] => [
    `(p36 ${station} -1.0 -1.0`,
    ...knots,
    ...(gps ? ["gps : (", "(gp [20.49,-0.21])", "(gp [12.93,-0.13])", ")"] : []),
    ")",
  ];
  const FIVE = (scale: number): string[] => [
    "(cp [0.0,0.0,-5.0,0.0,5.0,0.0] true false)",
    `(cp [${10 * scale},-0.1,${9 * scale},-0.1,${11 * scale},-0.1] true false)`,
    `(cp [${11 * scale},0.5,${11 * scale},0.2,${11 * scale},0.9] true false)`,
    `(cp [${9 * scale},1.2,${10 * scale},1.0,${8 * scale},1.5] true false)`,
    "(cp [0.0,1.7,2.0,1.7,-3.0,1.7] true false)",
  ];
  const EMPTY = "(cp [0.0,0.0,0.0,0.0,0.0,0.0] false false)";
  const withSections = (blocks: string[][], over: { mutate?: (lines: string[]) => string[] } = {}): string =>
    aku({
      mutate: (lines) => {
        const at = lines.indexOf("p35 : (");
        const out = [...lines.slice(0, at + 1), ...blocks.flat(), ")"];
        return over.mutate ? over.mutate(out) : out;
      },
    });
  const layout = () => withSections([section("0.0", [EMPTY]), section("30.48", FIVE(1), true), section("92.7", FIVE(1.2)), section("183.0", [EMPTY])]);
  const read = (text: string) => mustRead(bytesOf(text));

  it("reads the two real sections, in millimetres from the tail, each starting at the stringer, with the knots as read", () => {
    const board = read(layout());
    expect(board.sections).toHaveLength(2);
    expect(board.sections.map((s) => s.station)).toEqual([expect.closeTo(304.8, 6), expect.closeTo(927, 6)]);
    for (const s of board.sections) {
      expect(s.knots).toHaveLength(5);
      expect(s.points[0][0]).toBeCloseTo(0, 9);
      expect(s.points[0][1]).toBeCloseTo(0, 9);
      expect(s.points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
      expect(s.points.length).toBeGreaterThan(5);
    }
    expect(board.sections[0].knots[1]).toEqual({ point: [10, -0.1], before: [9, -0.1], after: [11, -0.1], smooth: true });
    // The board itself reads as before.
    expect(board.length).toBeCloseTo(1830, 6);
  });

  it("reads the plain, the Windows-ended and the stamped copy the same", () => {
    const plain = read(layout());
    expect(read(layout().replace(/\r\n/g, "\n"))).toEqual(plain);
    expect(mustRead(scrambleBrd(layout()))).toEqual(plain);
  });

  it("skips a gps block that stands after a section's closing bracket too", () => {
    const after = withSections([section("0.0", [EMPTY]), section("30.48", FIVE(1)), ["gps : (", "(gp [1.0,2.0])", ")"], section("92.7", FIVE(1.2)), section("183.0", [EMPTY])]);
    expect(read(after).sections.map((s) => s.station)).toEqual(read(layout()).sections.map((s) => s.station));
  });

  it("reads every section when a section carries its guide points on one line, not swallowing the section's closing bracket (quick 261114-118, WR-02)", () => {
    const oneLine = (station: string, knots: string[]): string[] => [`(p36 ${station} -1.0 -1.0`, ...knots, "gps : ( (gp [1.0,2.0]) (gp [3.0,4.0]) )", ")"];
    const blocks = [section("30.48", FIVE(1)), oneLine("92.7", FIVE(1.2)), section("150.0", FIVE(1.1))];
    const board = read(withSections([section("0.0", [EMPTY]), ...blocks, section("183.0", [EMPTY])]));
    expect(board.sections.map((s) => s.station)).toEqual([expect.closeTo(304.8, 6), expect.closeTo(927, 6), expect.closeTo(1500, 6)]);
    // The same three with the block over several lines read back the same.
    const spread = read(withSections([section("0.0", [EMPTY]), section("30.48", FIVE(1)), section("92.7", FIVE(1.2), true), section("150.0", FIVE(1.1)), section("183.0", [EMPTY])]));
    expect(board.sections).toEqual(spread.sections);
  });

  it("drops a section with one bad knot line and keeps the others, the board still reading", () => {
    const bad = FIVE(1);
    bad[2] = "(cp [11.0,not,11.0,0.2,11.0,0.9] true false)";
    const board = read(withSections([section("0.0", [EMPTY]), section("30.48", bad), section("92.7", FIVE(1.2)), section("183.0", [EMPTY])]));
    expect(board.sections).toHaveLength(1);
    expect(board.sections[0].station).toBeCloseTo(927, 6);
    expect(board.length).toBeCloseTo(1830, 6);
  });

  it("drops a section with a line that is not a knot, a bad station, or a station off the board", () => {
    const junk = [...FIVE(1).slice(0, 2), "some words", ...FIVE(1).slice(2)];
    const base = [section("92.7", FIVE(1.2))];
    expect(read(withSections([section("30.48", junk), ...base])).sections).toHaveLength(1);
    expect(read(withSections([section("abc", FIVE(1)), ...base])).sections).toHaveLength(1);
    expect(read(withSections([section("-3.0", FIVE(1)), ...base])).sections).toHaveLength(1);
    expect(read(withSections([section("191.0", FIVE(1)), ...base])).sections).toHaveLength(1);
    expect(read(withSections([section("-0.5", FIVE(1)), ...base])).sections).toHaveLength(2);
  });

  it("drops a section with more knots than the cap, and keeps only the first BRD_READ_MAX_SECTIONS sections", () => {
    const many = Array.from({ length: BRD_READ_MAX_KNOTS + 1 }, (_, i) => `(cp [${(i * 10) / BRD_READ_MAX_KNOTS},0.0,0.0,0.0,0.0,0.0] true false)`);
    expect(read(withSections([section("30.48", many), section("92.7", FIVE(1.2))])).sections).toHaveLength(1);
    const lots = Array.from({ length: BRD_READ_MAX_SECTIONS + 10 }, (_, i) => section(String(5 + i), FIVE(1)));
    const board = read(withSections(lots));
    expect(board.sections).toHaveLength(BRD_READ_MAX_SECTIONS);
    expect(board.sections[0].station).toBeCloseTo(50, 6);
  });

  it("reads with sections [] for a file with no p35 block, an empty one, or one that never closes", () => {
    expect(read(aku({ mutate: (l) => l.slice(0, l.indexOf("p35 : (")) })).sections).toEqual([]);
    expect(read(withSections([])).sections).toEqual([]);
    const unclosed = aku({ mutate: (l) => [...l.slice(0, l.indexOf("p35 : (") + 1), ...section("30.48", FIVE(1)).slice(0, -1)] });
    expect(read(unclosed).sections).toEqual([]);
  });

  it("sorts sections by station", () => {
    const board = read(withSections([section("92.7", FIVE(1.2)), section("30.48", FIVE(1))]));
    expect(board.sections.map((s) => s.station)).toEqual([expect.closeTo(304.8, 6), expect.closeTo(927, 6)]);
  });

  it("reads every fitted section of the app's own Shortboard, the two one-knot tips dropped", () => {
    const { sectionCount } = brdText(surface);
    const board = mustRead(bytesOf(own));
    expect(board.sections).toHaveLength(sectionCount);
    expect(board.sections.every((s) => s.knots.length >= 2)).toBe(true);
    expect(board.sections[0].station).toBeGreaterThan(0);
    expect(board.sections[board.sections.length - 1].station).toBeLessThan(board.length);
  });
});

describe("the fins (quick 261113-qyz)", () => {
  /** The hand-made file with its fin line (and word) set; the original line `p50 : [0.0,0.0,0.0,0.0]` is the four-number one. */
  const withFins = (p50: string | null, p51: string | null = null, where: "header" | "afterCurves" = "header"): ReadBrdBoard =>
    mustRead(
      bytesOf(
        aku({
          mutate: (lines) => {
            const out = lines.filter((l) => !l.startsWith("p50 : "));
            const at = out.indexOf("p15 : 3.08E-4");
            const fields = [...(p51 === null ? [] : [`p51 : ${p51}`]), ...(p50 === null ? [] : [`p50 : ${p50}`])];
            if (where === "header") out.splice(at, 0, ...fields);
            else out.push(...fields);
            return out;
          },
        }),
      ),
    );
  // Sized for this narrow hand-made board (about 12 cm of half-width 24 cm from the tail).
  const TWIN = "[24.13,8.0,35.814,7.5,0.0,0.0,0.0,0.0,5.4]";

  it("reads the four-number line the fixture carries as no fins", () => {
    const board = mustRead(bytesOf(aku()));
    expect(board.fins).toEqual({ side: null, centre: null, word: null, depth: null, splay: null, dropped: false });
  });

  it("reads all zeros, and no fin line at all, as no fins", () => {
    expect(withFins("[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0]").fins).toEqual({ side: null, centre: null, word: null, depth: null, splay: null, dropped: false });
    expect(withFins(null).fins).toEqual({ side: null, centre: null, word: null, depth: null, splay: null, dropped: false });
  });

  it("reads a side fin and the word beside it, in millimetres from the tail", () => {
    const fins = withFins(TWIN, "Futures").fins;
    expect(fins.side!.back[0]).toBeCloseTo(241.3, 6);
    expect(fins.side!.back[1]).toBeCloseTo(80, 6);
    expect(fins.side!.front[0]).toBeCloseTo(358.14, 6);
    expect(fins.side!.front[1]).toBeCloseTo(75, 6);
    expect(fins.centre).toBeNull();
    expect(fins.word).toBe("Futures");
    expect(fins.dropped).toBe(false);
  });

  it("reads a centre fin and a side pair together, and the same locked", () => {
    const text = aku({ mutate: (l) => l.map((x) => (x.startsWith("p50 : ") ? "p50 : [24.13,8.0,35.814,7.5,8.89,20.32,0.0,0.0,0.0]" : x)) });
    const plain = mustRead(bytesOf(text)).fins;
    expect(plain.centre!.back).toBeCloseTo(88.9, 6);
    expect(plain.centre!.front).toBeCloseTo(203.2, 6);
    expect(plain.side).not.toBeNull();
    expect(mustRead(scrambleBrd(text)).fins).toEqual(plain);
  });

  it("ignores a fin line that stands after the curves, as it does the sizes", () => {
    expect(withFins(TWIN, "Futures", "afterCurves").fins).toEqual({ side: null, centre: null, word: null, depth: null, splay: null, dropped: false });
  });

  it("reads a fin line that is not nine finite figures as no fins, and a fin that is not on the board as dropped", () => {
    for (const bad of ["[1,2,3]", "[a,b,c,d,e,f,g,h,i]", "[1,2,3,4,5,6,7,8,9,10]", "24.13", "[24.13,8.0,35.814,7.5,,0.0,0.0,0.0,0.0]", "[1e999,0,0,0,0,0,0,0,0]", "[20000,0,0,0,0,0,0,0,0]"]) {
      expect(withFins(bad).fins, bad).toEqual({ side: null, centre: null, word: null, depth: null, splay: null, dropped: false });
    }
    // A side fin whose front is behind its back, and a centre fin past the nose.
    const refused = withFins("[35.814,8.0,24.13,7.5,100.0,190.0,0.0,0.0,0.0]").fins;
    expect(refused.side).toBeNull();
    expect(refused.centre).toBeNull();
    expect(refused.dropped).toBe(true);
  });

  it("keeps a plain word, and refuses an empty, an over-long, a path-like or a letterless one", () => {
    expect(withFins(TWIN, "FCS II").fins.word).toBe("FCS II");
    expect(withFins(TWIN, "FCS (Original)").fins.word).toBe("FCS (Original)");
    expect(withFins(TWIN, "").fins.word).toBeNull();
    expect(withFins(TWIN, "A".repeat(33)).fins.word).toBeNull();
    expect(withFins(TWIN, "C:\\Users\\Somebody").fins.word).toBeNull();
    expect(withFins(TWIN, '"Somebody\'s board"').fins.word).toBeNull();
    expect(withFins(TWIN, "12345").fins.word).toBeNull();
    expect(withFins(TWIN, "A".repeat(32)).fins.word).toBe("A".repeat(32));
  });

  it("parses the line and the word the same way on their own", () => {
    expect(parseBrdFinLine(" [1, 2, 3, 4, 5, 6, 7, 8, 9] ")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(parseBrdFinLine("[1,2,3]")).toBeNull();
    expect(brdFinWord("  Futures ")).toBe("Futures");
    expect(brdFinWord("no/way<")).toBeNull();
  });

  it("never lets any other header text through with the fins", () => {
    const everything = JSON.stringify(withFins(TWIN, "Futures"));
    expect(everything).not.toMatch(/Somebody|secret|Users|1234567890|V4\.4/);
  });

  it("reads this app's own file with no fins as no fins, and one written with fins as those fins", () => {
    expect(mustRead(bytesOf(own)).fins).toEqual({ side: null, centre: null, word: null, depth: null, splay: null, dropped: false });
    const written = brdText(surface, { fins: { p50: [24.13, 13.208, 35.814, 12.7, 8.89, 20.32, 0, 0, 0], p51: "Probox" } }).text;
    const fins = mustRead(bytesOf(written)).fins;
    expect(fins.word).toBe("Probox");
    expect(fins.side!.back[0]).toBeCloseTo(241.3, 6);
    expect(fins.centre!.front).toBeCloseTo(203.2, 6);
  });
});
