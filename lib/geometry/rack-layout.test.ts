import { afterEach, describe, expect, it, vi } from "vitest";
import { BOARD_PRESETS } from "./presets";
import { SPINE_ANCHOR_GAP, SPINE_DESCENDER_EM } from "./rack-art";
import {
  DROP_STRIP,
  HOVER_MULTI_ROW_HEIGHT,
  HOVER_ONE_ROW_HEIGHT,
  HOVER_ROW_BAND,
  HOVER_ROW_TOP_ROOM,
  HOVER_SLOT,
  HOVER_WORD_SIZE,
  RACK_REFERENCE_LENGTH_MM,
  SPINE_CLEARANCE,
  SPINE_FLOOR_SIZE,
  SPINE_GLYPH_EM,
  SPINE_HALO_WIDTH,
  SPINE_WORD_GAP,
  SWIPE_SLOT,
  SWIPE_TOP_PAD,
  SWIPE_WORD_SIZE,
  boardExtra,
  fitSpineWords,
  hoverPointerZone,
  hoverRackHeight,
  hoverRackLayout,
  hoverSlotAt,
  hoverSlotPosition,
  rackHeightLines,
  rackRoomOffsets,
  rackScale,
  swipeMiddleIndex,
  swipePadding,
  swipeRackHeightFromScroller,
  swipeScrollLeftFor,
  swipeSlotAt,
  spineWordColumn,
  swipeSlotCentre,
  swipeTrackWidth,
  turnAngle,
} from "./rack-layout";
import { centimetresToMm, inchesToMm } from "./units";

/** A quiver built from the presets' own lengths plus a 9'4" log, cycled to `count` boards. */
const QUIVER_LENGTHS = [...BOARD_PRESETS.map((preset) => preset.outline.length), inchesToMm(112)];
const WIDEST_HALF = Math.max(...BOARD_PRESETS.map((preset) => preset.outline.widePointWidth / 2));

function quiver(count: number): number[] {
  return Array.from({ length: count }, (_, k) => QUIVER_LENGTHS[k % QUIVER_LENGTHS.length]);
}

function layoutFor(count: number, contentWidth: number) {
  const lengths = quiver(count);
  return hoverRackLayout({
    count,
    contentWidth,
    longestMm: Math.max(...lengths),
    widestHalfMm: WIDEST_HALF,
  });
}

const WIDTHS = [960, 756, 568];

describe("R2: one true scale on one floor line", () => {
  it("never draws below the 7'0\" reference, and the tallest board sets the scale above it", () => {
    expect(RACK_REFERENCE_LENGTH_MM).toBe(inchesToMm(84));
    expect(rackScale(380, inchesToMm(62))).toBe(380 / inchesToMm(84));
    expect(rackScale(380, inchesToMm(112))).toBe(380 / inchesToMm(112));
  });

  it("lays a 30-board quiver out with ONE scale for the whole rack at every width", () => {
    const lengths = quiver(30);
    const longest = Math.max(...lengths);
    for (const width of WIDTHS) {
      const layout = layoutFor(30, width);
      expect(layout.scale).toBe(rackScale(layout.rackHeight, longest));
      // Every board in a row shares the row's floor line.
      for (let row = 0; row < layout.rows; row++) {
        const floors = new Set<number>();
        for (let k = row * layout.perRow; k < Math.min(layout.count, (row + 1) * layout.perRow); k++) {
          floors.add(hoverSlotPosition(layout, k).floorY);
        }
        expect(floors.size).toBe(1);
      }
    }
  });
});

describe("Edge: the longest and shortest boards (R2)", () => {
  const shortestPreset = Math.min(...BOARD_PRESETS.map((preset) => preset.outline.length));

  it("draws a lone short board at its share of the 7'0\" reference, not stretched to fill", () => {
    const layout = hoverRackLayout({
      count: 1,
      contentWidth: 960,
      longestMm: inchesToMm(62),
      widestHalfMm: WIDEST_HALF,
    });
    expect(layout.rackHeight).toBe(HOVER_ONE_ROW_HEIGHT);
    expect(inchesToMm(62) * layout.scale).toBeCloseTo((HOVER_ONE_ROW_HEIGHT * 62) / 84, 9);
    // The shortest preset is under the reference too, so it draws shorter than the rack.
    expect(shortestPreset * layout.scale).toBeLessThan(layout.rackHeight);
  });

  it("lets a 9'4\" board set the scale for every board beside it", () => {
    const layout = layoutFor(5, 960);
    expect(layout.scale).toBe(rackScale(layout.rackHeight, inchesToMm(112)));
    expect(inchesToMm(112) * layout.scale).toBeCloseTo(layout.rackHeight, 9);
    expect(shortestPreset * layout.scale).toBeLessThan(layout.rackHeight);
  });
});

describe("Edge: 30 or more boards (R2, R5, R6) — the hover rack's rows", () => {
  const cases = [
    { count: 15, width: 960 },
    { count: 15, width: 756 },
    { count: 15, width: 568 },
    { count: 30, width: 960 },
    { count: 30, width: 756 },
    { count: 30, width: 568 },
    { count: 100, width: 960 },
    { count: 100, width: 568 },
  ];

  it("fifteen boards stand in one row at 960 and in two rows of up to 8 at 756 and 568", () => {
    const wide = layoutFor(15, 960);
    expect(wide.rows).toBe(1);
    expect(wide.rackHeight).toBe(HOVER_ONE_ROW_HEIGHT);
    const mid = layoutFor(15, 756);
    expect(mid.rows).toBe(2);
    expect(mid.rackHeight).toBe(HOVER_MULTI_ROW_HEIGHT);
    expect(mid.perRow).toBe(8);
    expect(layoutFor(15, 568).rows).toBe(2);
  });

  it("thirty boards at 960 stand in two balanced rows of 15", () => {
    const layout = layoutFor(30, 960);
    expect(layout.rows).toBe(2);
    expect(layout.perRow).toBe(15);
  });

  it.each(cases)("balances $count boards at $width and fits every row inside the width", ({ count, width }) => {
    const layout = layoutFor(count, width);
    expect(layout.perRow).toBe(Math.ceil(count / layout.rows));
    expect(layout.gutter + layout.reserve + layout.perRow * layout.slot).toBeLessThanOrEqual(width);

    // Rows within one board of each other, and every board in exactly one slot.
    const perRowCounts = Array.from({ length: layout.rows }, () => 0);
    const seen = new Set<string>();
    for (let k = 0; k < count; k++) {
      const pos = hoverSlotPosition(layout, k);
      perRowCounts[pos.row]++;
      seen.add(`${pos.row}:${pos.col}`);
    }
    expect(seen.size).toBe(count);
    expect(Math.max(...perRowCounts) - Math.min(...perRowCounts)).toBeLessThanOrEqual(1);

    // One row at the 380 height whenever every board fits, else the 288 height.
    if (layout.rows === 1) expect(layout.rackHeight).toBe(HOVER_ONE_ROW_HEIGHT);
    else expect(layout.rackHeight).toBe(HOVER_MULTI_ROW_HEIGHT);
  });

  it.each(cases)("finds every one of $count boards at $width from its own slot", ({ count, width }) => {
    const layout = layoutFor(count, width);
    for (let k = 0; k < count; k++) {
      const pos = hoverSlotPosition(layout, k);
      expect(hoverSlotAt(layout, pos.x, pos.floorY - 1)).toBe(k);
      // A pointer in a row's band still belongs to that row.
      expect(hoverSlotAt(layout, pos.x, pos.floorY + 10)).toBe(k);
      expect(hoverPointerZone(layout, pos.floorY - 1)).toEqual({ row: pos.row, zone: "drawing" });
      expect(hoverPointerZone(layout, pos.floorY + 1)).toEqual({ row: pos.row, zone: "band" });
    }
  });

  it("never gives fewer rows at a narrower width", () => {
    for (const count of [1, 5, 15, 30, 100]) {
      let previousRows = 0;
      for (let width = 1024; width >= 320; width -= 2) {
        const layout = layoutFor(count, width);
        expect(layout.rows).toBeGreaterThanOrEqual(previousRows);
        previousRows = layout.rows;
        // The 288 height is only ever for two or more rows: a quiver that misses one row at 380
        // by a board never draws as a single shrunken row at 288.
        expect(layout.rackHeight).toBe(layout.rows === 1 ? HOVER_ONE_ROW_HEIGHT : HOVER_MULTI_ROW_HEIGHT);
        expect(layout.gutter + layout.reserve + layout.perRow * layout.slot).toBeLessThanOrEqual(width);
      }
    }
  });

  it("clamps a pointer outside the rack to the nearest board", () => {
    const layout = layoutFor(15, 756);
    expect(hoverSlotAt(layout, -500, -500)).toBe(0);
    expect(hoverSlotAt(layout, 10_000, 10_000)).toBe(14);
  });

  it("reserves every row's band, so one row is 24 + 380 + 116 tall", () => {
    for (const { count, width } of cases) {
      const layout = layoutFor(count, width);
      expect(layout.rowBlock).toBe(HOVER_ROW_TOP_ROOM + layout.rackHeight + HOVER_ROW_BAND);
      expect(hoverRackHeight(layout)).toBe(layout.rows * layout.rowBlock);
    }
    expect(hoverRackHeight(layoutFor(15, 960))).toBe(520);
  });
});

describe("Rule 2: height lines every foot, or every 50 cm in Metric", () => {
  it("draws 4′ to 7′ for a short quiver, reaching the 7'0\" reference", () => {
    const lines = rackHeightLines("imperial", inchesToMm(70));
    expect(lines.map((line) => line.label)).toEqual(["4′", "5′", "6′", "7′"]);
    expect(lines.map((line) => line.heightMm)).toEqual([4, 5, 6, 7].map((feet) => inchesToMm(12 * feet)));
  });

  it("reaches 9′ under a 9'4\" board", () => {
    const lines = rackHeightLines("imperial", inchesToMm(112));
    expect(lines.at(-1)?.label).toBe("9′");
    expect(lines).toHaveLength(6);
  });

  it("draws bare 150 and 200 in Metric", () => {
    const lines = rackHeightLines("metric", inchesToMm(70));
    expect(lines.map((line) => line.label)).toEqual(["150", "200"]);
    expect(lines.map((line) => line.heightMm)).toEqual([centimetresToMm(150), centimetresToMm(200)]);
    for (const line of rackHeightLines("metric", inchesToMm(130))) {
      expect(line.label).toMatch(/^\d+$/);
    }
  });
});

describe("R5 / R6: the turn follows distance", () => {
  it("turns a board fully under the cursor, halfway at half the reach, and not at all beyond it", () => {
    expect(turnAngle(0, 48)).toBe(Math.PI / 2);
    expect(turnAngle(24, 48)).toBe(Math.PI / 4);
    expect(turnAngle(-24, 48)).toBe(Math.PI / 4);
    expect(turnAngle(48, 48)).toBe(0);
    expect(turnAngle(100, 48)).toBe(0);
  });

  it("leaves two boards at 45 degrees each with the cursor exactly between them", () => {
    const left = turnAngle(-HOVER_SLOT / 2, HOVER_SLOT);
    const right = turnAngle(HOVER_SLOT / 2, HOVER_SLOT);
    expect(left).toBe(Math.PI / 4);
    expect(right).toBe(left);
  });
});

describe("The rack opens around a turning board", () => {
  /** The rule, written out from the inputs: every board left of a widened board steps left by half
   * its extra width, every board right of it steps right by the same, and it stays where it is. */
  function expectedOffsets(extras: readonly number[]): number[] {
    return extras.map((_, k) => {
      let offset = 0;
      extras.forEach((extra, j) => {
        if (j < k) offset += extra / 2;
        if (j > k) offset -= extra / 2;
      });
      return offset;
    });
  }

  it.each([[[0, 0, 30, 0, 0]], [[10, 0, 20]], [[0]], [[12, 7, 0, 3, 40, 0]]])(
    "moves the neighbours of %j aside by half the extra width each side",
    (extras) => {
      expect(rackRoomOffsets(extras)).toEqual(expectedOffsets(extras));
    },
  );

  it("never moves the turning board itself", () => {
    const offsets = rackRoomOffsets([0, 0, 30, 0, 0]);
    expect(offsets[2]).toBe(0);
    expect(offsets[1]).toBeLessThan(0);
    expect(offsets[3]).toBeGreaterThan(0);
  });

  it("asks for extra room only when a board's picture and a column of words are wider than its slot", () => {
    for (const [slot, size] of [
      [HOVER_SLOT, HOVER_WORD_SIZE],
      [SWIPE_SLOT, SWIPE_WORD_SIZE],
    ]) {
      const column = spineWordColumn(size);
      // The widest half-picture that still leaves its slot room for a column of words.
      const fits = (slot - column) / 2;
      expect(boardExtra(fits - 3, slot, column)).toBe(0);
      expect(boardExtra(fits, slot, column)).toBe(0);
      expect(boardExtra(fits + 5, slot, column)).toBeCloseTo(2 * 5, 9);
      expect(boardExtra(39, slot, column)).toBe(2 * 39 + column - slot);
    }
  });

  it("will not work the room out without the word column", () => {
    // @ts-expect-error the word column is boardExtra's required third argument
    const forgotten = boardExtra(39, HOVER_SLOT);
    // Were it ever let through, a missing column would not quietly count as nothing.
    expect(forgotten).toBeNaN();
  });
});

describe("The room a board's vertical words take", () => {
  it("is the gap, the descender allowance, the glyphs, half the halo and the clearance", () => {
    for (const size of [HOVER_WORD_SIZE, SWIPE_WORD_SIZE]) {
      expect(spineWordColumn(size)).toBe(
        SPINE_ANCHOR_GAP + SPINE_DESCENDER_EM * size + SPINE_GLYPH_EM * size + SPINE_HALO_WIDTH / 2 + SPINE_CLEARANCE,
      );
    }
  });

  it("grows with the words' size by the descender allowance and the glyphs alone", () => {
    expect(spineWordColumn(HOVER_WORD_SIZE) - spineWordColumn(SWIPE_WORD_SIZE)).toBeCloseTo(
      (SPINE_DESCENDER_EM + SPINE_GLYPH_EM) * (HOVER_WORD_SIZE - SWIPE_WORD_SIZE),
      9,
    );
  });
});

describe("The phone's track", () => {
  const width = 390;
  const count = 15;

  it("pads both ends so the first and last boards can reach the middle", () => {
    expect(swipePadding(width)).toBe((width - SWIPE_SLOT) / 2);
    expect(swipeTrackWidth(count, width)).toBe(2 * swipePadding(width) + count * SWIPE_SLOT);
  });

  it("puts board i in the middle at its own scroll position, and finds it again", () => {
    for (let i = 0; i < count; i++) {
      expect(swipeSlotCentre(i, width) - swipeScrollLeftFor(i)).toBe(width / 2);
      expect(swipeMiddleIndex(swipeScrollLeftFor(i) + 13, count)).toBe(i);
      expect(swipeMiddleIndex(swipeScrollLeftFor(i) - 13, count)).toBe(i);
      expect(swipeSlotAt(swipeSlotCentre(i, width), count, width)).toBe(i);
    }
  });

  it("clamps a scroll or a tap beyond either end to the first or last board", () => {
    expect(swipeMiddleIndex(-200, count)).toBe(0);
    expect(swipeMiddleIndex(10_000, count)).toBe(count - 1);
    expect(swipeSlotAt(0, count, width)).toBe(0);
    expect(swipeSlotAt(swipeTrackWidth(count, width), count, width)).toBe(count - 1);
  });

  it("grows by one slot per board at the same drawn height", () => {
    expect(swipeTrackWidth(16, width) - swipeTrackWidth(15, width)).toBe(SWIPE_SLOT);
    expect(swipeTrackWidth(31, width) - swipeTrackWidth(30, width)).toBe(SWIPE_SLOT);
  });

  it("takes the rack's height from the scroller, less the top pad and the drop strip", () => {
    expect(swipeRackHeightFromScroller(398)).toBe(398 - SWIPE_TOP_PAD - DROP_STRIP);
    expect(swipeRackHeightFromScroller(10)).toBe(0);
  });
});

describe("Edge: a long name (R1) — the words shrink, then cut the name, never the numbers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function graphemes(text: string): string[] {
    return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment);
  }

  /** A stand-in for the browser's text measure: every grapheme is 0.6 of the font size wide. */
  const measure = (text: string, fontSize: number) => graphemes(text).length * fontSize * 0.6;
  const total = (name: string, line: string, size: number) =>
    measure(name, size) + SPINE_WORD_GAP + measure(line, size);

  const line = `6'2" x 19 3/4" · 31 L`;

  it("keeps the base size when the words fit", () => {
    const fit = fitSpineWords({ name: "Daylight", line, maxLength: 372, baseSize: 12, measure });
    expect(fit).toEqual({ fontSize: 12, name: "Daylight", cut: false });
  });

  it("shrinks in half-point steps to the first size that fits", () => {
    const name = "Daylight Single";
    const maxLength = total(name, line, 11);
    expect(total(name, line, 11.5)).toBeGreaterThan(maxLength);
    const fit = fitSpineWords({ name, line, maxLength, baseSize: 12, measure });
    expect(fit).toEqual({ fontSize: 11, name, cut: false });
  });

  it("cuts only the name, by whole graphemes, once the floor size still does not fit", () => {
    const name = "The Very Long Name Of A Quad Fish";
    const keep = 5;
    const maxLength = measure(line, SPINE_FLOOR_SIZE) + SPINE_WORD_GAP + (keep + 1) * SPINE_FLOOR_SIZE * 0.6;
    const fit = fitSpineWords({ name, line, maxLength, baseSize: 12, measure });
    expect(fit.fontSize).toBe(SPINE_FLOOR_SIZE);
    expect(fit.cut).toBe(true);
    expect(fit.name).toBe(`${graphemes(name).slice(0, keep).join("")}…`);
    // The card line is never part of the cut: what is left of the name plus the whole line fits.
    expect(total(fit.name, line, SPINE_FLOOR_SIZE)).toBeLessThanOrEqual(maxLength);
  });

  it("never splits an accented letter or a surfer emoji", () => {
    const accented = "é";
    const surfer = String.fromCodePoint(0x1f3c4, 0x200d, 0x2642, 0xfe0f);
    const name = `Caf${accented} ${surfer} Twin ${surfer}${accented}${accented}`;
    const whole = graphemes(name);
    // Room for `keep` letters plus the ellipsis; at whole.length - 1 the whole name would fit uncut.
    for (let keep = 1; keep < whole.length - 1; keep++) {
      const maxLength = measure(line, SPINE_FLOOR_SIZE) + SPINE_WORD_GAP + (keep + 1) * SPINE_FLOOR_SIZE * 0.6;
      const fit = fitSpineWords({ name, line, maxLength, baseSize: 12, measure });
      expect(fit.cut).toBe(true);
      expect(fit.name.endsWith("…")).toBe(true);
      const kept = fit.name.slice(0, -1);
      expect(whole.join("").startsWith(kept)).toBe(true);
      expect(kept).toBe(whole.slice(0, keep).join(""));
    }
  });

  it("keeps one grapheme and the ellipsis when nothing longer fits", () => {
    const fit = fitSpineWords({ name: "Daylight", line, maxLength: 1, baseSize: 12, measure });
    expect(fit).toEqual({ fontSize: SPINE_FLOOR_SIZE, name: "D…", cut: true });
  });

  it("cuts by code point, never inside an emoji's surrogate pair, where Intl.Segmenter is missing", () => {
    const surfer = String.fromCodePoint(0x1f3c4);
    const name = `${surfer}${surfer}${surfer}${surfer}`;
    const pointMeasure = (text: string, fontSize: number) => Array.from(text).length * fontSize * 0.6;
    const maxLength = pointMeasure(line, SPINE_FLOOR_SIZE) + SPINE_WORD_GAP + 3 * SPINE_FLOOR_SIZE * 0.6;
    vi.stubGlobal("Intl", { ...Intl, Segmenter: undefined });
    const fit = fitSpineWords({ name, line, maxLength, baseSize: 12, measure: pointMeasure });
    expect(fit).toEqual({ fontSize: SPINE_FLOOR_SIZE, name: `${surfer}${surfer}…`, cut: true });
  });
});
