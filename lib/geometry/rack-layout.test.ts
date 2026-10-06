import { describe, expect, it } from "vitest";
import { BOARD_PRESETS } from "./presets";
import {
  HOVER_MULTI_ROW_HEIGHT,
  HOVER_ONE_ROW_HEIGHT,
  HOVER_ROW_BAND,
  HOVER_ROW_TOP_ROOM,
  RACK_REFERENCE_LENGTH_MM,
  hoverPointerZone,
  hoverRackHeight,
  hoverRackLayout,
  hoverSlotAt,
  hoverSlotPosition,
  rackHeightLines,
  rackScale,
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
