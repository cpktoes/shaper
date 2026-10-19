/**
 * Two tables of planing words. `planingStations` (quick 261019-gqo, plan 02) words ROCKER's own PLANING tab:
 * five stations nose to tail, each with its rocker, the foam off the deck and off the bottom, and the full
 * planer passes for each (whole passes plus what is left, `measure-display.ts`'s `wholePasses`). It carries
 * the station readouts that left ROCKER's sidebar in plan 01, with OFF DECK added; its prints-as-zero rule
 * is `unsignedZeroMark` below, the rule `board-on-blank.tsx`'s old readouts kept before they moved here.
 * The rest of this header is about `planingTable`, the order form's table.
 *
 * The order form's PLANING table (Phase 13 item 8, quick task 260928-r9h; reworked into a small
 * Deck/Bottom table by quick 260928-tst) — the words for a small table beside the Rail Bands table
 * on page 2, the Shaper Reference sheet. The founder asked for this on 2026-09-27 ("summary needs
 * tip thickness and deck/bottom passes info somewhere"), redirected it on 2026-09-29 to page 2
 * beside the rail markings, condensed to make room, and then — after seeing that printed page — the
 * same day asked for it worded like the rail markings themselves: Deck and Bottom as headers, a
 * Foam Off row and a Passes row, at the rail table's own type size. The tips themselves are left to
 * page 1's rocker strip, which already prints all five thicknesses (nose tip and tail tip
 * included), so this table carries only what ROCKER's own Deck Skin and Center OFF BOTTOM readouts
 * show — how much foam comes off the deck and off the bottom at the centre, and how many planer
 * passes each is at the shaper's own Planer Max Depth.
 *
 * Every number is the side profile's own — `blank.cut.deckSkin` and `blank.centerGap` — read through
 * the SAME formatters ROCKER and the DATASHEET already read them through: `formatDeckSkin` for the
 * Deck's Foam Off cell (`components/rocker/board-on-blank.tsx`'s own Deck Skin slider text),
 * `unsignedZeroMark`/`formatMark` for the Bottom's Foam Off cell (the same figure as
 * `BlankSideView.foamOffBottom.center`, the DATASHEET's FOAM OFF Bottom cell and ROCKER's own Center
 * OFF BOTTOM readout), and `formatWholePasses(wholePasses(...))` for both Passes cells — the same
 * count ROCKER's sidebar line and PLANING tab print: whole passes plus what is left (`2 + 1/16"`, `2`,
 * `0`), changed from a bare rounded-up number by the founder's "match it" (2026-10-19, quick
 * 261019-gqo, plan 03, D-12). There is no second formula and no conversion factor here (CLAUDE.md
 * Rules 1 and 2): this module composes existing boundary formatters and nothing else.
 *
 * Passes are counted from the PRINTED depth and pass depth (`wholePasses`' own documented rule),
 * so the same board can read a different count in Imperial and Metric — exactly as ROCKER does.
 *
 * With no blank picked there is nothing to derive a planing number from, so the same table prints
 * with a dash in every cell and the footnote says to pick a blank instead of an empty box that would
 * read like something failed to print — one layout either way, and there is no write-in line
 * because a hand-worked figure could silently disagree with the app: "Pick a blank on ROCKER for the
 * planing numbers."
 *
 * Pure — no React, browser API or database import (CLAUDE.md Rule 1) — unit-tested in
 * planing.test.ts. `board-on-blank.tsx`'s and `rocker-datasheet.tsx`'s own zero rules are untouched
 * (out of scope for this module).
 */
import type { BlankCut } from "./blank";
import { formatDeckSkin, formatThinningStart, formatThinningStartBare } from "./blank-reasons";
import type { FoilStationKey } from "./foil";
import { formatMark, formatWholePasses, stationLabel, wholePasses } from "./measure-display";
import type { TipView } from "./tip-taper";
import { mm, type Mm, type UnitsSystem } from "./units";

/** What `planingTable` needs off a board's side profile — `BoardSideProfile` (`board-profile.ts`)
 * satisfies this structurally, so the order form passes `sideProfile` straight in. `tips` is each
 * tip's Thinning Start in force (Phase 14, D-12) — `BlankSideView.tips` already carries it. */
export interface PlaningInput {
  blank: {
    cut: Pick<BlankCut, "deckSkin">;
    centerGap: Mm;
    tips: { nose: Pick<TipView, "fromTip">; tail: Pick<TipView, "fromTip"> };
  } | null;
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

/** One row of the table: a label with a value under each of `Deck` and `Bottom`. */
export interface PlaningRow {
  label: string;
  deck: string;
  bottom: string;
}

/** The table's contents: the two column headers, the two rows, the footnote under them, and the
 * thinning line printed under the footnote — null with no blank picked, so nothing is printed. */
export interface PlaningTable {
  headers: { deck: string; bottom: string };
  rows: PlaningRow[];
  footnote: string;
  thinning: string | null;
}

const TABLE_HEADERS = { deck: "Deck", bottom: "Bottom" };
const LABEL_FOAM_OFF = "Foam Off";
const LABEL_PASSES = "Passes";
/** The rail table's own "nothing here" mark (U+2014), reused so the two tables agree on what a
 * missing value looks like. */
const NO_DATA_CELL = "—";

/**
 * Where each tip's thinning starts, measured from that tip — the line the order form prints under the
 * PLANING footnote (Phase 14, D-12, UI-SPEC §8): Imperial `Thinning starts from the tip: nose 12", tail
 * 25 1/2".`, Metric `Thinning starts from the tip: nose 30.5, tail 64.8 cm.` A start is a dim (CLAUDE.md
 * Rule 2), so Metric reads centimetres to one decimal; and since this is one line of running text,
 * Metric carries its unit once, at the end (CLAUDE.md: "a unit is carried once per line of running
 * text") — the nose through `formatThinningStartBare`, the tail through `formatThinningStart`. Imperial
 * keeps each value's own inch mark, as every Imperial figure does. No conversion happens here: both
 * formatters read through `units.ts`.
 */
export function thinningLine(noseFromTip: Mm, tailFromTip: Mm, system: UnitsSystem): string {
  return (
    `Thinning starts from the tip: nose ${formatThinningStartBare(noseFromTip, system)}, ` +
    `tail ${formatThinningStart(tailFromTip, system)}.`
  );
}

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
 * - a pass count prints as whole passes plus what is left (`1 + 1/16"`) — it began as a bare
 *   rounded-up number, the rail table's own label-plus-value idiom (Decision 3), and became the
 *   same wording ROCKER uses at the founder's "match it", 2026-10-19 (quick 261019-gqo, D-12);
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
 * and `wholePasses` — nothing here is a second reading of the same fact.
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
      thinning: null,
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
        deck: formatWholePasses(wholePasses(blank.cut.deckSkin, planerMaxDepth, system), system),
        bottom: formatWholePasses(wholePasses(blank.centerGap, planerMaxDepth, system), system),
      },
    ],
    footnote: `At the center, at ${formatMark(planerMaxDepth, system)} a pass — your Planer Max Depth.`,
    thinning: thinningLine(blank.tips.nose.fromTip, blank.tips.tail.fromTip, system),
  };
}

/** One printed foam figure on the PLANING tab: its text, and whether it reads in warning ink. */
export interface PlaningFigure {
  text: string;
  /** True only for a figure below zero that does not print as zero — the board would poke out of the blank there. */
  negative: boolean;
}

/** One station's line on ROCKER's PLANING tab, every string already worked out. */
export interface PlaningStationRow {
  key: FoilStationKey;
  /** The station's name: `Nose Tip`, `Nose @ 12"` (Metric `Nose @ 30.5 cm`), `Center`, `Tail @ 12"`, `Tail Tip`. */
  name: string;
  /** The board's rocker at the station, as a mark. */
  rocker: string;
  /** The foam to come off the deck at the station. */
  offDeck: PlaningFigure;
  /** The foam to come off the bottom at the station. */
  offBottom: PlaningFigure;
  /** Full planer passes for the deck foam: `1`, or `2 + 1/16"` — whole passes plus what is left. */
  deckPasses: string;
  /** Full planer passes for the bottom foam. */
  bottomPasses: string;
}

/** What `planingStations` needs off a board's side profile — `BoardSideProfile` satisfies this structurally. */
export interface PlaningStationsInput {
  stationRocker: Record<FoilStationKey, Mm>;
  blank: {
    foamOffDeck: Record<FoilStationKey, Mm>;
    foamOffBottom: Record<FoilStationKey, Mm>;
  } | null;
}

/** Nose to tail — the reading order of the DATASHEET's columns. */
const STATION_ORDER: readonly FoilStationKey[] = ["noseTip", "nose12", "center", "tail12", "tailTip"];

function stationName(key: FoilStationKey, system: UnitsSystem): string {
  switch (key) {
    case "noseTip":
      return "Nose Tip";
    case "nose12":
      return `Nose @ ${stationLabel(system)}`;
    case "center":
      return "Center";
    case "tail12":
      return `Tail @ ${stationLabel(system)}`;
    case "tailTip":
      return "Tail Tip";
  }
}

/** A foam figure as the tab prints it: the unsigned-zero mark, in warning only when a real minus prints. */
function planingFigure(value: Mm, system: UnitsSystem): PlaningFigure {
  const text = unsignedZeroMark(value, system);
  return { text, negative: value < 0 && text !== formatMark(mm(0), system) };
}

/**
 * The rows of ROCKER's PLANING tab (quick 261019-gqo, plan 02, D-07; the founder, 2026-10-19: "move the
 * controls data table (passes) to a new PLANING tab and add a OFF DECK column too"): the board's five
 * stations nose to tail, each with its rocker, the foam to come off the deck and off the bottom, and — under
 * each foam figure — the full planer passes plus what is left (`formatWholePasses(wholePasses(...))`, D-04).
 * Every figure is the side profile's own value read through the same boundary formatters the DATASHEET uses
 * (`formatMark`, with `unsignedZeroMark`'s prints-as-zero rule); the passes are counted from the printed
 * numbers at the shaper's own Planer Max Depth. Null with no blank picked — a hand-set board has no foam to
 * plane — so the tab says to pick a blank first. No conversion factor and no second formula lives here
 * (CLAUDE.md Rules 1 and 2).
 */
export function planingStations(
  profile: PlaningStationsInput,
  planerMaxDepth: Mm,
  system: UnitsSystem,
): PlaningStationRow[] | null {
  const { blank } = profile;
  if (blank === null) return null;
  return STATION_ORDER.map((key) => ({
    key,
    name: stationName(key, system),
    rocker: unsignedZeroMark(profile.stationRocker[key], system),
    offDeck: planingFigure(blank.foamOffDeck[key], system),
    offBottom: planingFigure(blank.foamOffBottom[key], system),
    deckPasses: formatWholePasses(wholePasses(blank.foamOffDeck[key], planerMaxDepth, system), system),
    bottomPasses: formatWholePasses(wholePasses(blank.foamOffBottom[key], planerMaxDepth, system), system),
  }));
}
