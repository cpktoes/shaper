/**
 * The order form's PLANING column (Phase 13 item 8, quick task 260928-r9h; reworked into a small
 * Deck/Bottom table by quick 260928-tst) — the words for a small block beside the Rail Bands table
 * on page 2, the Shaper Reference sheet. The founder asked for this on 2026-09-27 ("summary needs
 * tip thickness and deck/bottom passes info somewhere") and redirected it on 2026-09-29 to page 2,
 * beside the rail markings, condensed to make room: the tips themselves are left to page 1's rocker
 * strip, which already prints all five thicknesses (nose tip and tail tip included), so this column
 * carries only what ROCKER's own Deck Skin and Center OFF BOTTOM readouts show — how much comes off
 * the deck, how much comes off the bottom at the centre, and how many planer passes that is at the
 * shaper's own Planer Max Depth.
 *
 * Every number is the side profile's own — `blank.cut.deckSkin` and `blank.centerGap` — read through
 * the SAME formatters ROCKER and the DATASHEET already read them through: `formatDeckSkin` for the
 * Deck Skin label (`components/rocker/board-on-blank.tsx`'s own Deck Skin slider text),
 * `unsignedZeroMark`/`formatMark` for the amount that comes off the bottom (the same figure as
 * `BlankSideView.foamOffBottom.center`, the DATASHEET's FOAM OFF Bottom cell and ROCKER's own Center
 * OFF BOTTOM readout), and `planerPasses`/`formatPasses` for the pass count —
 * `board-on-blank.tsx`'s own "Planer passes at the center" with its "At … a pass" hint. There is no
 * second formula and no conversion factor here (CLAUDE.md Rules 1 and 2): this module composes
 * existing boundary formatters and nothing else.
 *
 * Passes are counted from the PRINTED depth and pass depth (`planerPasses`'s own documented rule),
 * so the same board can read one pass different in Imperial and Metric — exactly as ROCKER does.
 *
 * With no blank picked there is nothing to derive a planing number from, so the column holds one
 * plain line instead of an empty box that would read like something failed to print (the plan's
 * `<no_blank_decision>`: one layout on every print, an empty box reads as a fault, and there is no
 * write-in line because a hand-worked figure could silently disagree with the app):
 * "Pick a blank on ROCKER for the planing numbers."
 *
 * Pure — no React, browser API or database import (CLAUDE.md Rule 1) — unit-tested in
 * planing.test.ts. `board-on-blank.tsx`'s and `rocker-datasheet.tsx`'s own zero rules are untouched
 * (out of scope for this module).
 */
import type { BlankCut } from "./blank";
import { formatDeckSkin } from "./blank-reasons";
import { formatMark, formatPasses, planerPasses } from "./measure-display";
import { mm, type Mm, type UnitsSystem } from "./units";

/** What `planingBox` needs off a board's side profile — `BoardSideProfile` (`board-profile.ts`)
 * satisfies this structurally, so the order form passes `sideProfile` straight in. */
export interface PlaningInput {
  blank: { cut: Pick<BlankCut, "deckSkin">; centerGap: Mm } | null;
}

/** One row of the column: a label over a value, with an optional note under it. */
export interface PlaningItem {
  label: string;
  value: string;
  note: string | null;
}

/** The column's contents: three items with a blank, or none with the no-blank line instead. */
export interface PlaningBox {
  items: PlaningItem[];
  /** "Pick a blank on ROCKER for the planing numbers." without a blank, null with one. */
  noBlankLine: string | null;
}

const NO_BLANK_LINE = "Pick a blank on ROCKER for the planing numbers.";

/**
 * `formatMark`'s own text, except that a printed `-` plus a printed zero becomes the printed zero —
 * ROCKER's own prints-as-zero rule (`components/rocker/board-on-blank.tsx`'s `markOrZero`),
 * reproduced here rather than imported (that component's own helper is private, and this module may
 * take no React import): a real shortfall never reads a `-0"` a shaper could mistake for a genuine
 * negative amount, in either system.
 */
function unsignedZeroMark(value: Mm, system: UnitsSystem): string {
  const zero = formatMark(mm(0), system);
  const printed = formatMark(value, system);
  return printed === zero || printed === `-${zero}` ? zero : printed;
}

export function planingBox(profile: PlaningInput, planerMaxDepth: Mm, system: UnitsSystem): PlaningBox {
  const { blank } = profile;
  if (blank === null) return { items: [], noBlankLine: NO_BLANK_LINE };

  const passes = planerPasses(blank.centerGap, planerMaxDepth, system);
  return {
    items: [
      { label: "Deck Skin", value: formatDeckSkin(blank.cut.deckSkin, system), note: null },
      { label: "Off Bottom @ Center", value: unsignedZeroMark(blank.centerGap, system), note: null },
      {
        label: "Planer Passes",
        value: formatPasses(passes),
        note: `at ${formatMark(planerMaxDepth, system)} a pass`,
      },
    ],
    noBlankLine: null,
  };
}

/** One row of the table: a label with a value under each of `Deck` and `Bottom`. */
export interface PlaningRow {
  label: string;
  deck: string;
  bottom: string;
}

/** The table's contents: the two column headers, the two rows, and the footnote under them. */
export interface PlaningTable {
  headers: { deck: string; bottom: string };
  rows: PlaningRow[];
  footnote: string;
}

const TABLE_HEADERS = { deck: "Deck", bottom: "Bottom" };
const LABEL_FOAM_OFF = "Foam Off";
const LABEL_PASSES = "Passes";
/** The rail table's own "nothing here" mark (U+2014), reused so the two tables agree on what a
 * missing value looks like. */
const NO_DATA_CELL = "—";

/**
 * The founder's 2026-09-29 words, after seeing item 8's printed page: "Let's organize this like the
 * rail dims. Deck and Bottom are headers." `planingTable` is that table, laid out exactly like the
 * rail markings beside it — same header rule, same row rule, same `--summary-font-label`/
 * `--summary-font-row` type sizes (`components/summary/order-form.tsx` draws the `<table>`; this
 * module only words its cells).
 *
 * Each decision below is `<decisions>` in the quick 260928-tst plan, restated in one line:
 * - a zero prints `0`, never a dash — a dash is reserved for "no blank picked" (Decision 1);
 * - the pass depth lives in the footnote, not a row or the caption, because a footnote wraps freely
 *   and never widens the table (Decision 2);
 * - a pass count prints as a bare whole number, the rail table's own label-plus-value idiom
 *   (Decision 3);
 * - the row labels are the DATASHEET's own `Foam Off` and the PLANING caption's own `Passes`
 *   (Decision 4);
 * - Metric carries its unit on every Foam Off value, since each column mixes a depth row with a
 *   count row and a header unit would sit over the counts too (Decision 5);
 * - with no blank picked, the same table prints with `—` in all four cells and a footnote saying to
 *   pick one, so page 2 has one layout either way (Decision 6).
 *
 * The Deck value is the deck skin — identical to the DATASHEET's own FOAM OFF Deck cell at Center
 * (`BlankSideView.foamOffDeck.center`), which is why the footnote's "At the center" covers both
 * columns even though the Deck figure does not vary along the board. There is no second formula and
 * no conversion factor here (CLAUDE.md Rules 1 and 2): every value is read straight off the side
 * profile's own `blank.cut.deckSkin` and `blank.centerGap` through the existing boundary formatters
 * and `planerPasses`, exactly as `planingBox` above did.
 */
export function planingTable(profile: PlaningInput, planerMaxDepth: Mm, system: UnitsSystem): PlaningTable {
  const { blank } = profile;
  if (blank === null) {
    return {
      headers: TABLE_HEADERS,
      rows: [
        { label: LABEL_FOAM_OFF, deck: NO_DATA_CELL, bottom: NO_DATA_CELL },
        { label: LABEL_PASSES, deck: NO_DATA_CELL, bottom: NO_DATA_CELL },
      ],
      footnote: NO_BLANK_LINE,
    };
  }

  return {
    headers: TABLE_HEADERS,
    rows: [
      {
        label: LABEL_FOAM_OFF,
        deck: formatDeckSkin(blank.cut.deckSkin, system),
        bottom: unsignedZeroMark(blank.centerGap, system),
      },
      {
        label: LABEL_PASSES,
        deck: String(planerPasses(blank.cut.deckSkin, planerMaxDepth, system)),
        bottom: String(planerPasses(blank.centerGap, planerMaxDepth, system)),
      },
    ],
    footnote: `At the center, at ${formatMark(planerMaxDepth, system)} a pass — your Planer Max Depth.`,
  };
}
