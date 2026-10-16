/**
 * The rules behind the PICK A BLANK popup's filter bar (quick 261015-ve9, sketch 015 B — the
 * founder's decisions of 2026-10-15): which cards show, in what order, under which heading, and
 * what the length and nose-rocker range chips and their sliders read.
 *
 * - The rows (`browseRows`): one per blank the list judged (FITS and WON'T FIT alike), carrying the
 *   numbers a shaper filters and sorts by — the blank's measured length, its nose rocker
 *   (`blankTipRockers`: the catalogue's printed N0, the founder's ruling of 2026-10-16), its printed
 *   centre thickness and its printed volume — and whether it is starred (D-06).
 * - The filters (D-07, `filterBrowseRows`): the search (`matchesBlankSearch`, curly quotes folded as
 *   everywhere else), a length range and a nose-rocker range (each inclusive at both ends), and
 *   ★ Starred only. The maker chips are NOT a filter here: they ARE Settings → Blank Makers (D-12),
 *   so the makers a shaper unticks never reach the list in the first place.
 * - The sort (D-07, `sortBrowseRows`): Length (the default), Nose rocker, Center thickness or
 *   Volume, smallest first; ties by length, then name, then maker, so the order never depends on the
 *   input. A blank with no printed volume goes after every one with a volume.
 * - The groups (`groupBrowseRows`): ★ STARRED first, whatever the sort, then FITS THIS BOARD, then
 *   WON'T FIT THIS BOARD. A starred blank shows only in ★ STARRED, never repeated in its fit group
 *   (P-10) — its card still greys and says why when it doesn't fit.
 * - The ranges (P-11): a range's ends are millimetres, whatever system set them. Its slider's ends
 *   (`rangeBounds`) snap OUTWARD onto the step grid of the system in use — 1" or 1 cm for length,
 *   1/8" or 1 mm for nose rocker — so the shortest and longest blank are always reachable. A blank's
 *   length is a length (`formatLength`); its rocker is a mark (`formatMark`) (CLAUDE.md Rule 2).
 *
 * Pure — no React, browser or database import (CLAUDE.md Rule 1). Every conversion goes through
 * `units.ts` and every label through `measure-display.ts`.
 */

import type { BlankRecord } from "./blank";
import { blankTipRockers, FLOOR_EPSILON_MM, type BlankVerdict, type PreparedBlank } from "./blank-fit";
import { matchesBlankSearch } from "./blank-reasons";
import { formatLength, formatMark, measureSlider, type MeasureSliderView } from "./measure-display";
import { inchesToMm, mm, mmToInches, type Mm, type UnitsSystem } from "./units";

/** The four ways the cards can be ordered (D-07). */
export type BlankSort = "length" | "noseRocker" | "centerThickness" | "volume";

/** The sort's choices with the words its select shows, Length first (the default). */
export const BLANK_SORTS: readonly { id: BlankSort; label: string }[] = [
  { id: "length", label: "Length" },
  { id: "noseRocker", label: "Nose rocker" },
  { id: "centerThickness", label: "Center thickness" },
  { id: "volume", label: "Volume" },
];

/** A range's two ends, in millimetres, `from ≤ to`. */
export interface MmRange {
  from: Mm;
  to: Mm;
}

/** What the filter bar narrows the cards by — view state for the visit, never saved (D-13). */
export interface BlankBrowseFilters {
  query: string;
  /** Null means any length. */
  length: MmRange | null;
  /** Null means any nose rocker. */
  noseRocker: MmRange | null;
  starredOnly: boolean;
}

/** Nothing set: every row shows. */
export const EMPTY_BROWSE_FILTERS: BlankBrowseFilters = {
  query: "",
  length: null,
  noseRocker: null,
  starredOnly: false,
};

/** One blank as the popup filters, sorts and groups it. */
export interface BrowseRow {
  verdict: BlankVerdict;
  /** The catalogue's own record — what a pick stores and what the card's words read. */
  record: BlankRecord;
  fits: boolean;
  starred: boolean;
  /** The blank's measured length. */
  lengthMm: Mm;
  /** The nose rocker every card, filter and sort share (`blankTipRockers`). */
  noseRocker: Mm;
  /** The blank's printed centre thickness. */
  centerThickness: Mm;
  /** The printed volume in litres, or null where the catalogue prints none. */
  volume: number | null;
}

/** The rows for a judged list: FITS then WON'T FIT, each in the list's own order. */
export function browseRows(
  list: { fits: readonly BlankVerdict[]; wontFit: readonly BlankVerdict[] },
  recordOf: ReadonlyMap<PreparedBlank, BlankRecord>,
  isStarred: (vendor: string, name: string) => boolean,
): BrowseRow[] {
  return [...list.fits, ...list.wontFit].map((verdict) => {
    const { prepared } = verdict;
    const record = recordOf.get(prepared) ?? prepared.record;
    return {
      verdict,
      record,
      fits: verdict.fits,
      starred: isStarred(record.vendor, record.name),
      lengthMm: prepared.lengthMm,
      noseRocker: blankTipRockers(prepared).nose,
      centerThickness: prepared.centerThicknessMm,
      volume: record.volumeLitres,
    };
  });
}

/** Is `value` inside the range, both ends included, with the floors' own slack? */
function inRange(value: number, range: MmRange | null): boolean {
  if (range === null) return true;
  return value >= range.from - FLOOR_EPSILON_MM && value <= range.to + FLOOR_EPSILON_MM;
}

/** The rows the filter bar lets through (D-07). Never re-judges a blank. */
export function filterBrowseRows(rows: readonly BrowseRow[], filters: BlankBrowseFilters): BrowseRow[] {
  return rows.filter(
    (row) =>
      matchesBlankSearch(row.record, filters.query) &&
      inRange(row.lengthMm, filters.length) &&
      inRange(row.noseRocker, filters.noseRocker) &&
      (!filters.starredOnly || row.starred),
  );
}

/** Shortest first; the same length by name, then maker — the list's own order (`listBlanks`). */
function byLengthThenName(a: BrowseRow, b: BrowseRow): number {
  if (a.lengthMm !== b.lengthMm) return a.lengthMm - b.lengthMm;
  if (a.record.name !== b.record.name) return a.record.name < b.record.name ? -1 : 1;
  if (a.record.vendor !== b.record.vendor) return a.record.vendor < b.record.vendor ? -1 : 1;
  return 0;
}

/** The number a sort orders by; null only for a volume the catalogue doesn't print. */
function sortKey(row: BrowseRow, sort: BlankSort): number | null {
  switch (sort) {
    case "length":
      return row.lengthMm;
    case "noseRocker":
      return row.noseRocker;
    case "centerThickness":
      return row.centerThickness;
    case "volume":
      return row.volume;
  }
}

/** The rows in the chosen order, smallest first; ties by length, then name, then maker. A new
 * array — the input is never reordered. */
export function sortBrowseRows(rows: readonly BrowseRow[], sort: BlankSort): BrowseRow[] {
  return [...rows].sort((a, b) => {
    const ka = sortKey(a, sort);
    const kb = sortKey(b, sort);
    if (ka === null && kb !== null) return 1;
    if (kb === null && ka !== null) return -1;
    if (ka !== null && kb !== null && ka !== kb) return ka - kb;
    return byLengthThenName(a, b);
  });
}

export type BrowseGroupKey = "starred" | "fits" | "wontFit";

/** One heading's cards. */
export interface BrowseGroup {
  key: BrowseGroupKey;
  rows: BrowseRow[];
}

/**
 * ★ STARRED, then FITS THIS BOARD, then WON'T FIT THIS BOARD, each in the chosen sort's order; an
 * empty group is left out. A starred row is in ★ STARRED only, whether or not it fits (P-10).
 */
export function groupBrowseRows(rows: readonly BrowseRow[], sort: BlankSort): BrowseGroup[] {
  const sorted = sortBrowseRows(rows, sort);
  const groups: BrowseGroup[] = [
    { key: "starred", rows: sorted.filter((row) => row.starred) },
    { key: "fits", rows: sorted.filter((row) => !row.starred && row.fits) },
    { key: "wontFit", rows: sorted.filter((row) => !row.starred && !row.fits) },
  ];
  return groups.filter((group) => group.rows.length > 0);
}

/** Is any filter set? Clear Filters shows when one is (P-9); a search of only spaces is no search. */
export function browseFiltersActive(filters: BlankBrowseFilters): boolean {
  return (
    filters.query.trim() !== "" || filters.length !== null || filters.noseRocker !== null || filters.starredOnly
  );
}

/** Which range a chip and its drawer set. */
export type RangeKind = "length" | "noseRocker";

/**
 * Each range's slider step in each system, written once (D-07): length moves 1" or 1 cm, nose
 * rocker 1/8" or 1 mm. `stepIn` is in inches and `stepMm` in millimetres, the two steps
 * `measureSlider` takes — and the grid `rangeBounds` snaps a slider's ends onto.
 */
const RANGE_STEPS: Record<RangeKind, { stepIn: number; stepMm: number }> = {
  length: { stepIn: 1, stepMm: 10 },
  noseRocker: { stepIn: 1 / 8, stepMm: 1 },
};

/** The step a range's ends snap to, in millimetres, for the system in use. */
function gridMm(kind: RangeKind, system: UnitsSystem): number {
  const step = RANGE_STEPS[kind];
  return system === "metric" ? step.stepMm : inchesToMm(step.stepIn);
}

/**
 * A range slider's two ends for these values: the smallest snapped DOWN and the largest snapped UP
 * onto the step grid of the system in use (P-11), so the shortest and the longest blank are always
 * inside the slider. Null when there are no values.
 */
export function rangeBounds(values: readonly number[], kind: RangeKind, system: UnitsSystem): MmRange | null {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  const grid = gridMm(kind, system);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  // The same signed 1e-9 nudge the formatters use, so a value already on the grid stays on it.
  const from = Math.floor(min / grid + 1e-9) * grid;
  const to = Math.ceil(max / grid - 1e-9) * grid;
  return { from: mm(from === 0 ? 0 : from), to: mm(to === 0 ? 0 : to) };
}

/**
 * One end's slider (`measureSlider`, never a conversion of its own): Imperial steps 1" for length and
 * 1/8" for nose rocker between the bounds in inches; Metric steps 10 mm and 1 mm between the bounds
 * in millimetres.
 */
export function rangeSlider(value: Mm, bounds: MmRange, kind: RangeKind, system: UnitsSystem): MeasureSliderView {
  const step = RANGE_STEPS[kind];
  return measureSlider(
    value,
    { min: mmToInches(bounds.from), max: mmToInches(bounds.to) },
    step.stepIn,
    step.stepMm,
    system,
  );
}

/** One range end as the drawer and the chip read it: a length (`formatLength`) or a mark (`formatMark`). */
export function formatRangeValue(value: Mm, kind: RangeKind, system: UnitsSystem): string {
  return kind === "length" ? formatLength(value, system) : formatMark(value, system);
}

const RANGE_NAMES: Record<RangeKind, string> = { length: "Length", noseRocker: "Nose rocker" };

/** The chip's words: `Length: any`, or `Length: 6'0" – 7'2"`; `Nose rocker: 3" – 5 1/2"`. */
export function rangeChipText(kind: RangeKind, range: MmRange | null, system: UnitsSystem): string {
  const name = RANGE_NAMES[kind];
  if (range === null) return `${name}: any`;
  return `${name}: ${formatRangeValue(range.from, kind, system)} – ${formatRangeValue(range.to, kind, system)}`;
}

/**
 * The range after one end is moved. `from` can't pass `to`, nor `to` pass `from` — each stops at the
 * other. Starting from no range, the end not being moved sits at its bound.
 */
export function withRangeEnd(range: MmRange | null, bounds: MmRange, end: "from" | "to", value: Mm): MmRange {
  const current = range ?? bounds;
  if (end === "from") return { from: mm(Math.min(value, current.to)), to: current.to };
  return { from: current.from, to: mm(Math.max(value, current.from)) };
}
