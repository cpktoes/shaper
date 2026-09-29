/**
 * The order form's PLANING column (Phase 13 item 8, quick task 260928-r9h) — the words for a small
 * block beside the Rail Bands table on page 2, the Shaper Reference sheet. The founder asked for
 * this on 2026-09-27 ("summary needs tip thickness and deck/bottom passes info somewhere") and
 * redirected it on 2026-09-29 to page 2, beside the rail markings, condensed to make room: the tips
 * themselves are left to page 1's rocker strip, which already prints all five thicknesses (nose tip
 * and tail tip included), so this column carries only what ROCKER's own Deck Skin and Center OFF
 * BOTTOM readouts show — how much comes off the deck, how much comes off the bottom at the centre,
 * and how many planer passes that is at the shaper's own Planer Max Depth.
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
