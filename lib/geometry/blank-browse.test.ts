import { describe, expect, it } from "vitest";
import { isPickable } from "@/lib/blanks/catalog";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "@/lib/fit-defaults-preference";
import { DEFAULT_BLANK_CUT, type BlankRecord } from "./blank";
import {
  BLANK_SORTS,
  browseFiltersActive,
  browseRows,
  EMPTY_BROWSE_FILTERS,
  filterBrowseRows,
  formatRangeValue,
  groupBrowseRows,
  rangeBounds,
  rangeChipText,
  rangeSlider,
  sortBrowseRows,
  withRangeEnd,
  type BlankSort,
  type BrowseRow,
  type MmRange,
} from "./blank-browse";
import { blankTipRockers, FLOOR_EPSILON_MM, listBlanks, prepareBlank, type BoardFitContext, type PreparedBlank } from "./blank-fit";
import { matchesBlankSearch } from "./blank-reasons";
import { DEFAULT_BOARD_SPEC } from "./board";
import { formatLength, formatMark } from "./measure-display";
import { buildOutline, sampleOutline } from "./outline";
import { inchesToMm, mm, mmToInches, UNITS_SYSTEMS, type Mm } from "./units";

// The popup's filter, sort and group rules (quick 261015-ve9, D-06, D-07, P-8 to P-11). Every row
// is read from the seeded catalogue judged for the default board; no catalogue figure is typed here
// (CLAUDE.md Rule 1).

const PREPARED: PreparedBlank[] = readSeedCatalog()
  .filter(isPickable)
  .map((record) => prepareBlank(record));

/** Each prepared blank's catalogue record — a copy, so a test can tell the lookup from `prepared.record`. */
const RECORD_OF = new Map<PreparedBlank, BlankRecord>(PREPARED.map((p) => [p, { ...p.record }]));

function defaultContext(): BoardFitContext {
  const outline = DEFAULT_BOARD_SPEC.outline;
  const geometry = buildOutline(outline);
  const foil = DEFAULT_BOARD_SPEC.foil;
  return {
    board: {
      length: outline.length,
      centerThickness: foil.center,
      noseTip: foil.noseTip,
      tailTip: foil.tailTip,
      nose12Offset: mm(0),
      tail12Offset: mm(0),
      ...DEFAULT_BLANK_CUT,
    },
    halfWidthAt: (s: Mm) => sampleOutline(geometry, s),
    widePointStation: geometry.widePointStation,
  };
}

const LIST = listBlanks(PREPARED, defaultContext(), toFitSettings(DEFAULT_FIT_DEFAULTS));

/** A fixed star set: the first fitting blank, the first that won't fit, and one not in the catalogue. */
const STARS = new Set<string>([
  `${LIST.fits[0].prepared.record.vendor}|${LIST.fits[0].prepared.record.name}`,
  `${LIST.wontFit[0].prepared.record.vendor}|${LIST.wontFit[0].prepared.record.name}`,
  "Nobody|Nothing",
]);
const isStarred = (vendor: string, name: string) => STARS.has(`${vendor}|${name}`);

const ROWS = browseRows(LIST, RECORD_OF, isStarred);

const keyOf = (row: BrowseRow) => `${row.record.vendor}|${row.record.name}`;

/** Ties by length, then name, then maker. */
function tieOrder(a: BrowseRow, b: BrowseRow): number {
  if (a.lengthMm !== b.lengthMm) return a.lengthMm - b.lengthMm;
  if (a.record.name !== b.record.name) return a.record.name < b.record.name ? -1 : 1;
  return a.record.vendor < b.record.vendor ? -1 : a.record.vendor > b.record.vendor ? 1 : 0;
}

describe("the rows the tests read", () => {
  it("lists blanks that fit and blanks that don't, some with a volume and some without", () => {
    expect(LIST.fits.length).toBeGreaterThan(10);
    expect(LIST.wontFit.length).toBeGreaterThan(0);
    expect(ROWS.some((r) => r.volume !== null)).toBe(true);
    expect(ROWS.some((r) => r.volume === null)).toBe(true);
  });
});

describe("browseRows", () => {
  it("is one row per listed verdict, FITS then WON'T FIT, reading the record lookup, the verdict and the stars", () => {
    const verdicts = [...LIST.fits, ...LIST.wontFit];
    expect(ROWS).toHaveLength(verdicts.length);
    ROWS.forEach((row, i) => {
      const verdict = verdicts[i];
      expect(row.verdict).toBe(verdict);
      expect(row.record).toBe(RECORD_OF.get(verdict.prepared));
      expect(row.fits).toBe(verdict.fits);
      expect(row.starred).toBe(isStarred(row.record.vendor, row.record.name));
      expect(row.lengthMm).toBe(verdict.prepared.lengthMm);
      expect(row.noseRocker).toBe(blankTipRockers(verdict.prepared).nose);
      expect(row.centerThickness).toBe(verdict.prepared.centerThicknessMm);
      expect(row.volume).toBe(verdict.prepared.record.volumeLitres);
    });
    expect(ROWS.filter((r) => r.starred)).toHaveLength(2);
  });
});

describe("filterBrowseRows", () => {
  it("returns every row with nothing set", () => {
    expect(filterBrowseRows(ROWS, EMPTY_BROWSE_FILTERS)).toEqual(ROWS);
  });

  it("searches with matchesBlankSearch, curly quotes folded", () => {
    const name = ROWS.find((r) => r.record.name.includes(`'`) || r.record.name.includes(`"`))!.record.name;
    const curly = name.replace(/'/g, "’").replace(/"/g, "”");
    for (const query of [name, curly, ROWS[0].record.vendor.toLowerCase()]) {
      const got = filterBrowseRows(ROWS, { ...EMPTY_BROWSE_FILTERS, query });
      expect(got.map(keyOf)).toEqual(ROWS.filter((r) => matchesBlankSearch(r.record, query)).map(keyOf));
      expect(got.length).toBeGreaterThan(0);
    }
  });

  it("keeps a length range inclusive of both ends", () => {
    const lengths = [...new Set(ROWS.map((r) => r.lengthMm))].sort((a, b) => a - b);
    const range: MmRange = { from: mm(lengths[2]), to: mm(lengths[lengths.length - 3]) };
    const got = filterBrowseRows(ROWS, { ...EMPTY_BROWSE_FILTERS, length: range });
    expect(got.length).toBe(
      ROWS.filter((r) => r.lengthMm >= range.from - FLOOR_EPSILON_MM && r.lengthMm <= range.to + FLOOR_EPSILON_MM).length,
    );
    expect(got.some((r) => r.lengthMm === range.from)).toBe(true);
    expect(got.some((r) => r.lengthMm === range.to)).toBe(true);
    expect(got.some((r) => r.lengthMm < range.from)).toBe(false);
    expect(got.some((r) => r.lengthMm > range.to)).toBe(false);
  });

  it("keeps a nose-rocker range inclusive of both ends", () => {
    const rockers = [...new Set(ROWS.map((r) => r.noseRocker))].sort((a, b) => a - b);
    const range: MmRange = { from: mm(rockers[1]), to: mm(rockers[rockers.length - 2]) };
    const got = filterBrowseRows(ROWS, { ...EMPTY_BROWSE_FILTERS, noseRocker: range });
    expect(got.some((r) => r.noseRocker === range.from)).toBe(true);
    expect(got.some((r) => r.noseRocker === range.to)).toBe(true);
    expect(got.every((r) => r.noseRocker >= range.from && r.noseRocker <= range.to)).toBe(true);
    expect(got.length).toBe(ROWS.filter((r) => r.noseRocker >= range.from && r.noseRocker <= range.to).length);
  });

  it("Starred only keeps the starred rows only", () => {
    const got = filterBrowseRows(ROWS, { ...EMPTY_BROWSE_FILTERS, starredOnly: true });
    expect(got).toHaveLength(2);
    expect(got.every((r) => r.starred)).toBe(true);
  });
});

describe("sortBrowseRows", () => {
  const keyFor: Record<BlankSort, (r: BrowseRow) => number | null> = {
    length: (r) => r.lengthMm,
    noseRocker: (r) => r.noseRocker,
    centerThickness: (r) => r.centerThickness,
    volume: (r) => r.volume,
  };

  it("lists the four sorts with their words, Length first", () => {
    expect(BLANK_SORTS.map((s) => s.id)).toEqual(["length", "noseRocker", "centerThickness", "volume"]);
    expect(BLANK_SORTS.map((s) => s.label)).toEqual(["Length", "Nose rocker", "Center thickness", "Volume"]);
  });

  it.each(BLANK_SORTS.map((s) => s.id))("%s: never decreasing, ties by length then name then maker, input untouched", (sort) => {
    const before = ROWS.map(keyOf);
    const sorted = sortBrowseRows(ROWS, sort);
    expect(ROWS.map(keyOf)).toEqual(before);
    expect(sorted).toHaveLength(ROWS.length);
    for (let i = 1; i < sorted.length; i++) {
      const a = keyFor[sort](sorted[i - 1]);
      const b = keyFor[sort](sorted[i]);
      if (a !== null && b !== null) {
        expect(b).toBeGreaterThanOrEqual(a);
        if (a === b) expect(tieOrder(sorted[i - 1], sorted[i])).toBeLessThanOrEqual(0);
      } else if (a === null) {
        // Volume: once a row without one appears, every later row is without one too.
        expect(b).toBeNull();
        expect(tieOrder(sorted[i - 1], sorted[i])).toBeLessThanOrEqual(0);
      }
    }
  });

  it("Volume puts every row without a printed volume after every row with one", () => {
    const sorted = sortBrowseRows(ROWS, "volume");
    const firstNull = sorted.findIndex((r) => r.volume === null);
    expect(firstNull).toBeGreaterThan(0);
    expect(sorted.slice(firstNull).every((r) => r.volume === null)).toBe(true);
    expect(sorted.slice(0, firstNull).every((r) => r.volume !== null)).toBe(true);
  });
});

describe("groupBrowseRows", () => {
  it.each(BLANK_SORTS.map((s) => s.id))("%s: starred, fits, won't fit — a starred row only in starred, each in sort order", (sort) => {
    const groups = groupBrowseRows(ROWS, sort);
    expect(groups.map((g) => g.key)).toEqual(["starred", "fits", "wontFit"]);
    const [starred, fits, wontFit] = groups;
    // One starred blank fits and one doesn't: both sit in ★ STARRED only (P-10).
    expect(starred.rows.map((r) => r.fits).sort()).toEqual([false, true]);
    expect(fits.rows.every((r) => r.fits && !r.starred)).toBe(true);
    expect(wontFit.rows.every((r) => !r.fits && !r.starred)).toBe(true);
    expect(starred.rows.length + fits.rows.length + wontFit.rows.length).toBe(ROWS.length);
    const order = sortBrowseRows(ROWS, sort).map(keyOf);
    for (const group of groups) {
      const positions = group.rows.map((r) => order.indexOf(keyOf(r)));
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }
  });

  it("drops an empty group", () => {
    const unstarred = ROWS.map((r) => ({ ...r, starred: false }));
    expect(groupBrowseRows(unstarred, "length").map((g) => g.key)).toEqual(["fits", "wontFit"]);
    expect(groupBrowseRows(unstarred.filter((r) => r.fits), "length").map((g) => g.key)).toEqual(["fits"]);
    expect(groupBrowseRows([], "length")).toEqual([]);
  });
});

describe("rangeBounds (P-11)", () => {
  const lengths = ROWS.map((r) => r.lengthMm);
  const rockers = ROWS.map((r) => r.noseRocker);
  const minOf = (v: number[]) => Math.min(...v);
  const maxOf = (v: number[]) => Math.max(...v);

  it("Imperial length: whole inches, snapped outward by less than an inch", () => {
    const b = rangeBounds(lengths, "length", "imperial")!;
    const inch = inchesToMm(1);
    for (const end of [b.from, b.to]) expect(mmToInches(end)).toBeCloseTo(Math.round(mmToInches(end)), 9);
    expect(b.from).toBeLessThanOrEqual(minOf(lengths));
    expect(b.to).toBeGreaterThanOrEqual(maxOf(lengths));
    expect(minOf(lengths) - b.from).toBeLessThan(inch);
    expect(b.to - maxOf(lengths)).toBeLessThan(inch);
  });

  it("Metric length: whole centimetres, snapped outward by less than a centimetre", () => {
    const b = rangeBounds(lengths, "length", "metric")!;
    const cm = mm(10);
    for (const end of [b.from, b.to]) expect(end % cm).toBeCloseTo(0, 9);
    expect(b.from).toBeLessThanOrEqual(minOf(lengths));
    expect(b.to).toBeGreaterThanOrEqual(maxOf(lengths));
    expect(minOf(lengths) - b.from).toBeLessThan(cm);
    expect(b.to - maxOf(lengths)).toBeLessThan(cm);
  });

  it("nose rocker: 1/8\" in Imperial and 1 mm in Metric, snapped outward", () => {
    const imperial = rangeBounds(rockers, "noseRocker", "imperial")!;
    const eighth = inchesToMm(1 / 8);
    for (const end of [imperial.from, imperial.to]) {
      expect(mmToInches(end) * 8).toBeCloseTo(Math.round(mmToInches(end) * 8), 9);
    }
    expect(imperial.from).toBeLessThanOrEqual(minOf(rockers));
    expect(imperial.to).toBeGreaterThanOrEqual(maxOf(rockers));
    expect(minOf(rockers) - imperial.from).toBeLessThan(eighth);
    expect(imperial.to - maxOf(rockers)).toBeLessThan(eighth);

    const metric = rangeBounds(rockers, "noseRocker", "metric")!;
    for (const end of [metric.from, metric.to]) expect(end).toBeCloseTo(Math.round(end), 9);
    expect(metric.from).toBeLessThanOrEqual(minOf(rockers));
    expect(metric.to).toBeGreaterThanOrEqual(maxOf(rockers));
    expect(minOf(rockers) - metric.from).toBeLessThan(1);
    expect(metric.to - maxOf(rockers)).toBeLessThan(1);
  });

  it("a value already on the grid stays put, and no values give null", () => {
    const b = rangeBounds([inchesToMm(72), inchesToMm(80)], "length", "imperial")!;
    expect(b.from).toBeCloseTo(inchesToMm(72), 9);
    expect(b.to).toBeCloseTo(inchesToMm(80), 9);
    expect(rangeBounds([], "length", "imperial")).toBeNull();
    expect(rangeBounds([], "noseRocker", "metric")).toBeNull();
  });
});

describe("rangeSlider", () => {
  const lengths = ROWS.map((r) => r.lengthMm);
  const rockers = ROWS.map((r) => r.noseRocker);

  it("Imperial: 1\" for length and 1/8\" for nose rocker, between the bounds in inches", () => {
    const lb = rangeBounds(lengths, "length", "imperial")!;
    const ls = rangeSlider(lb.from, lb, "length", "imperial");
    expect(ls.step).toBe(1);
    expect(ls.min).toBeCloseTo(mmToInches(lb.from), 9);
    expect(ls.max).toBeCloseTo(mmToInches(lb.to), 9);
    expect(ls.toMm(ls.max)).toBeCloseTo(lb.to, 6);

    const rb = rangeBounds(rockers, "noseRocker", "imperial")!;
    const rs = rangeSlider(rb.to, rb, "noseRocker", "imperial");
    expect(rs.step).toBe(1 / 8);
    expect(rs.min).toBeCloseTo(mmToInches(rb.from), 9);
    expect(rs.max).toBeCloseTo(mmToInches(rb.to), 9);
    expect(rs.toMm(rs.max)).toBeCloseTo(rb.to, 6);
  });

  it("Metric: 10 mm for length and 1 mm for nose rocker, between the bounds in millimetres", () => {
    const lb = rangeBounds(lengths, "length", "metric")!;
    const ls = rangeSlider(lb.from, lb, "length", "metric");
    expect(ls.step).toBe(10);
    expect(ls.min).toBeCloseTo(lb.from, 6);
    expect(ls.max).toBeCloseTo(lb.to, 6);
    expect(ls.toMm(ls.max)).toBeCloseTo(lb.to, 6);

    const rb = rangeBounds(rockers, "noseRocker", "metric")!;
    const rs = rangeSlider(rb.from, rb, "noseRocker", "metric");
    expect(rs.step).toBe(1);
    expect(rs.min).toBeCloseTo(rb.from, 6);
    expect(rs.max).toBeCloseTo(rb.to, 6);
    expect(rs.toMm(rs.max)).toBeCloseTo(rb.to, 6);
  });
});

describe("rangeChipText and formatRangeValue", () => {
  it.each(UNITS_SYSTEMS)("any, or the two ends — a length as a length, a rocker as a mark — %s", (system) => {
    expect(rangeChipText("length", null, system)).toBe("Length: any");
    expect(rangeChipText("noseRocker", null, system)).toBe("Nose rocker: any");
    const length: MmRange = { from: inchesToMm(72), to: inchesToMm(86) };
    const rocker: MmRange = { from: inchesToMm(3), to: inchesToMm(5.5) };
    expect(rangeChipText("length", length, system)).toBe(
      `Length: ${formatLength(length.from, system)} – ${formatLength(length.to, system)}`,
    );
    expect(rangeChipText("noseRocker", rocker, system)).toBe(
      `Nose rocker: ${formatMark(rocker.from, system)} – ${formatMark(rocker.to, system)}`,
    );
    expect(formatRangeValue(length.from, "length", system)).toBe(formatLength(length.from, system));
    expect(formatRangeValue(rocker.to, "noseRocker", system)).toBe(formatMark(rocker.to, system));
  });
});

describe("withRangeEnd", () => {
  const bounds: MmRange = { from: inchesToMm(70), to: inchesToMm(90) };

  it("starting from no range, the end not moved sits at its bound", () => {
    expect(withRangeEnd(null, bounds, "from", inchesToMm(75))).toEqual({ from: inchesToMm(75), to: bounds.to });
    expect(withRangeEnd(null, bounds, "to", inchesToMm(80))).toEqual({ from: bounds.from, to: inchesToMm(80) });
  });

  it("from stops at to, and to stops at from", () => {
    const range: MmRange = { from: inchesToMm(74), to: inchesToMm(78) };
    expect(withRangeEnd(range, bounds, "from", inchesToMm(85))).toEqual({ from: range.to, to: range.to });
    expect(withRangeEnd(range, bounds, "to", inchesToMm(71))).toEqual({ from: range.from, to: range.from });
    expect(withRangeEnd(range, bounds, "to", inchesToMm(80))).toEqual({ from: range.from, to: inchesToMm(80) });
  });
});

describe("browseFiltersActive", () => {
  it("is false with nothing set or only spaces searched, true for any one filter", () => {
    expect(browseFiltersActive(EMPTY_BROWSE_FILTERS)).toBe(false);
    expect(browseFiltersActive({ ...EMPTY_BROWSE_FILTERS, query: "   " })).toBe(false);
    const range: MmRange = { from: inchesToMm(70), to: inchesToMm(80) };
    expect(browseFiltersActive({ ...EMPTY_BROWSE_FILTERS, query: "Marko" })).toBe(true);
    expect(browseFiltersActive({ ...EMPTY_BROWSE_FILTERS, length: range })).toBe(true);
    expect(browseFiltersActive({ ...EMPTY_BROWSE_FILTERS, noseRocker: range })).toBe(true);
    expect(browseFiltersActive({ ...EMPTY_BROWSE_FILTERS, starredOnly: true })).toBe(true);
  });
});
