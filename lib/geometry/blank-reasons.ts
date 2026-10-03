/**
 * Every plain-English sentence the blank screens compose around a number (Phase 11, 11-UI-SPEC
 * Copywriting Contract): why a blank won't fit, where the board sits on its blank, what went wrong
 * with a floor, why the list is empty, the list's intro line, a row's meta line and the offer line.
 *
 * They all live here, tested in both systems, so no component ever composes copy around a raw
 * number (CLAUDE.md Rule 2). Every number goes through the display boundary in
 * `measure-display.ts` — `formatMark` for amounts, thicknesses, placements and the settings;
 * `formatLength` for a board's or a blank's length; `formatDim` for a distance along the board;
 * `stationLabel` for the 12" station — and every inch figure below is authored through `units.ts`.
 *
 * Product strings use American spelling (`center`, `catalog`) and straight ASCII inch marks,
 * exactly as the UI-SPEC prints them. Catalogue names are passed through as data, never altered.
 *
 * Pure — no React, browser or database import (CLAUDE.md Rule 1).
 */
import type { BlankRecord, BlankShortfall, RunsOutCause, TipStyle } from "./blank";
import { MIN_FOIL_THICKNESS_MM } from "./blank-fit";
import {
  formatDim,
  formatDimBare,
  formatLength,
  formatMark,
  formatSignedMark,
  measureSlider,
  stationLabel,
  type MeasureSliderView,
} from "./measure-display";
import { MEASURE_STATION_MM } from "./outline";
import type { TipEnd, TipView } from "./tip-taper";
import { inchesToMm, mm, mmToInches, type Mm, type UnitsSystem } from "./units";

/**
 * How close to a named place a failure must be to be called by that place's name — the widepoint,
 * a tip, a 12" station, the center (`(researcher's choice — founder may overrule)` in the UI-SPEC).
 */
export const REASON_SNAP_MM = inchesToMm(1);

/** Float slack on the snap, so a station exactly 1" from a named place still snaps to it. */
const SNAP_SLACK_MM = 1e-9;

/** The flag's two headlines (11-UI-SPEC "The flag and the offer"). */
export const FLAG_HEADLINES = {
  /** F1, F3, F4, F5: the blank fits at no placement, or no longer passes a floor. */
  doesNotFit: "This blank doesn't fit your board",
  /** F2: the blank fits somewhere else along its length, just not where the board sits now. */
  notHere: "Doesn't fit at this placement",
} as const;

/**
 * F5's added sentence, when no blank in the catalogues being searched fits (so there is no offer).
 * `catalogs` names them — "the three catalogs" unless a shaper has switched blank makers off in the
 * settings menu, when the caller passes the narrower phrase (`catalogsPhrase` in
 * `lib/blanks/vendors.ts`), so the sentence never claims to have searched a hidden maker.
 */
export function nothingFitsSentence(catalogs: string = "the three catalogs"): string {
  return `No blank in ${catalogs} fits this board right now.`;
}

/** F5's sentence with every maker shown — byte for byte the sentence it has always been. */
export const NOTHING_FITS_SENTENCE = nothingFitsSentence();

/** The smallest step each system prints: 1/16" or 1 mm. */
function smallestStep(system: UnitsSystem): Mm {
  return system === "metric" ? mm(1) : inchesToMm(1 / 16);
}

/**
 * An amount of foam, through `formatMark` — or `under 1/16"` / `under 1 mm` when it would print as
 * zero, so a real shortfall never reads `0"`.
 */
function formatAmount(amount: Mm, system: UnitsSystem): string {
  const printed = formatMark(amount, system);
  if (printed === formatMark(mm(0), system)) return `under ${formatMark(smallestStep(system), system)}`;
  return printed;
}

/** Where along the board a shortfall is, first match wins (11-UI-SPEC "Reason vocabulary"). */
function formatWhere(
  shortfall: BlankShortfall,
  board: { length: Mm; widePointStation: Mm },
  system: UnitsSystem,
): string {
  const s = shortfall.station;
  const L = board.length;
  const near = (place: number) => Math.abs(s - place) <= REASON_SNAP_MM + SNAP_SLACK_MM;
  if (shortfall.kind === "wide" && near(board.widePointStation)) return "at the widepoint";
  if (near(L)) return "at the nose tip";
  if (near(0)) return "at the tail tip";
  if (near(L - MEASURE_STATION_MM)) return `${stationLabel(system)} from the nose`;
  if (near(MEASURE_STATION_MM)) return `${stationLabel(system)} from the tail`;
  if (near(L / 2)) return "at the center";
  const fromNose = L - s;
  return fromNose < s
    ? `${formatDim(mm(fromNose), system)} from the nose`
    : `${formatDim(mm(s), system)} from the tail`;
}

/**
 * The runs-out sentence's clause, picked by `shortfall.cause` (Phase 13 item 4, FD-4) — a missing
 * cause reads as `thinCenter`, the wording every runs-out had before the other causes existed.
 * `end` is `"nose"` when the station is past the board's centre, else `"tail"` — the half a
 * fine-tune, a tip setting or a Thinning Starts point names. An exhaustive switch, so a cause
 * without its own sentence fails to compile (Phase 14 added the fifth, `thinningStart`).
 */
function runsOutClause(
  cause: RunsOutCause | undefined,
  end: "nose" | "tail",
  centerThickness: Mm,
  system: UnitsSystem,
): string {
  switch (cause ?? "thinCenter") {
    case "thinCenter":
      return `this blank is too thick for a ${formatMark(centerThickness, system)} center`;
    case "fineTune":
      return `your ${end} fine-tune takes too much off there`;
    case "offBlank":
      return `your board runs past the end of this blank`;
    case "tipSetting":
      return `your ${end} tip is set thinner than that`;
    case "thinningStart":
      return `your ${end} thinning starts too close to the tip`;
  }
}

/**
 * The reason line under a WON'T FIT row and in the flag (D-06, R12): `{amount} too thin {where}` or
 * `{amount} too wide {where}` — e.g. `1/8" too thin 12" from the nose` / `3 mm too thin 30.5 cm
 * from the nose`, `1/2" too wide at the widepoint`. `station` is measured from the board's tail tip.
 * Every reason names a station and an amount.
 *
 * When the board itself would run under the least foam a board may be (Phase 12 D-18), the reason
 * names that least amount and its cause instead of an amount (Phase 13 item 4, FD-4):
 * `Less than {1/4" | 6 mm} would be left {where} — {clause}`, where `{clause}` is one of five,
 * picked by `shortfall.cause` — `this blank is too thick for a {center} center` (thinCenter, and
 * what a missing cause reads as too), `your {end} fine-tune takes too much off there` (fineTune),
 * `your board runs past the end of this blank` (offBlank), `your {end} tip is set thinner than
 * that` (tipSetting), or `your {end} thinning starts` … `too close` to that tip, word for word as
 * UI-SPEC §10 gives it (thinningStart, Phase 14 D-05). No sentence here ends in a full stop — the
 * flag adds one, the list row shows the line bare.
 */
export function formatShortfall(
  shortfall: BlankShortfall,
  board: { length: Mm; widePointStation: Mm; centerThickness: Mm },
  system: UnitsSystem,
): string {
  const where = formatWhere(shortfall, board, system);
  if (shortfall.kind === "runsOut") {
    const end = shortfall.station > board.length / 2 ? "nose" : "tail";
    return (
      `Less than ${formatMark(MIN_FOIL_THICKNESS_MM, system)} would be left ${where} — ` +
      runsOutClause(shortfall.cause, end, board.centerThickness, system)
    );
  }
  const what = shortfall.kind === "wide" ? "too wide" : "too thin";
  return `${formatAmount(shortfall.amount, system)} ${what} ${where}`;
}

/**
 * The one rule for "the board takes no deck skin" (Phase 13 item 4b, FD-6/FD-8): true whenever
 * `skin` PRINTS as zero in `system`, exactly the prints-as-zero test `formatPlacement` uses for
 * `centered`. Every sentence that mentions the Deck Skin reads this same rule, so the label and
 * every flag, empty-list body and list intro agree on what counts as none, and no line ever quotes
 * a `0"` or `0 mm` skin.
 */
function takesNoDeckSkin(skin: Mm, system: UnitsSystem): boolean {
  return formatMark(skin, system) === formatMark(mm(0), system);
}

/**
 * The ROCKER Deck Skin slider's value text (Phase 13 item 4b, FD-8): the word `none` when the board
 * takes no deck skin — 0 means the planer takes nothing off the blank's deck — else `formatMark`.
 * `centered` in `formatPlacement` is the precedent for a word standing in for a printed zero.
 */
export function formatDeckSkin(skin: Mm, system: UnitsSystem): string {
  return takesNoDeckSkin(skin, system) ? "none" : formatMark(skin, system);
}

/**
 * The ROCKER Deck Skin slider's hint (Phase 13 item 4b, FD-6/FD-8), in today's precedence: Bottom
 * first (`Off the deck — more at the tips`), then a Deck fine-tune (`deckTweaked` — the caller's "a
 * 12" fine-tune is taken off the Deck", WR-02: `Off the deck — a 12" fine-tune changes it there; see
 * the DATASHEET's Deck row`), then the skin itself (`Off the deck at every station`, or, when the
 * board takes no deck skin, `Nothing off the deck at any station`). The Bottom and fine-tune hints
 * stay the same at 0 because both are still true there: the tips' extra still comes off the deck
 * under Bottom, and a lowering Deck fine-tune still takes foam off the deck at that station.
 */
export function deckSkinHint(skin: Mm, tipStyle: TipStyle, deckTweaked: boolean, system: UnitsSystem): string {
  if (tipStyle === "bottom") return "Off the deck — more at the tips";
  if (deckTweaked) return `Off the deck — a ${stationLabel(system)} fine-tune changes it there; see the DATASHEET's Deck row`;
  return takesNoDeckSkin(skin, system) ? "Nothing off the deck at any station" : "Off the deck at every station";
}

/**
 * The flag body for a board whose 12" fine-tune on the Deck is bigger than its Deck Skin
 * (`tweakExceedsDeckSkin`, Phase 12 D-13): no blank anywhere can take it, and nothing in the Fit &
 * Tip Defaults dialog changes that, so the sentence names the three fixes that do — all on ROCKER:
 * `Your +3/16" fine-tune is more than this board's 1/8" Deck Skin, so the deck would sit above any
 * blank's deck there. Raise the Deck Skin, reset the fine-tune, or take it off the Bottom`. `tweak`
 * is the larger of the two 12" offsets; `skin` is the board's own Deck Skin. No full stop at the end —
 * the flag adds one, as it does for every reason line here.
 *
 * When the board takes no deck skin (Phase 13 item 4b, FD-6/FD-8), any upward Deck fine-tune still
 * lifts the deck above the blank's own, so the sentence reads `Your +1/16" fine-tune raises the
 * deck, but this board takes no Deck Skin, so the deck would sit above any blank's deck there. Add a
 * Deck Skin, reset the fine-tune, or take it off the Bottom` — "Raise" becomes "Add", since there is
 * no skin left to raise.
 */
export function tweakOverSkinLine(tweak: Mm, skin: Mm, system: UnitsSystem): string {
  if (takesNoDeckSkin(skin, system)) {
    return (
      `Your ${formatSignedMark(tweak, system)} fine-tune raises the deck, but this board takes no Deck Skin, ` +
      `so the deck would sit above any blank's deck there. Add a Deck Skin, reset the fine-tune, or take it off the Bottom`
    );
  }
  return (
    `Your ${formatSignedMark(tweak, system)} fine-tune is more than this board's ` +
    `${formatMark(skin, system)} Deck Skin, so the deck would sit above any blank's deck there. ` +
    `Raise the Deck Skin, reset the fine-tune, or take it off the Bottom`
  );
}

/**
 * The placement slider's value text (R3): `1/2" toward nose`, `1/4" toward tail`, `13 mm toward
 * nose` — and exactly `centered` whenever the amount prints as zero in the chosen system.
 * Placement is stored positive toward the nose (D-08).
 */
export function formatPlacement(placement: Mm, system: UnitsSystem): string {
  const printed = formatMark(mm(Math.abs(placement)), system);
  if (printed === formatMark(mm(0), system)) return "centered";
  return `${printed} ${placement > 0 ? "toward nose" : "toward tail"}`;
}

/**
 * The placement slider (R3): built on `measureSlider` with the placement NEGATED, so the slider's
 * left end is the most nose-ward placement — matching the drawing's nose-left view and the
 * nose-first order of every list on the screen (`(researcher's choice — founder may overrule)` in
 * the UI-SPEC). `toMm` negates back, so a drag to the left raises the stored, nose-positive
 * placement. Step 1/16" / 1 mm; bounds round inward, never past the range.
 *
 * Both ends sit on the step grid SYMMETRICALLY about zero (IN-01): the slider snaps to
 * `min + k·step`, so an end that is off the grid (a US Blanks length such as 72.748" leaves a
 * reach that is not a whole sixteenth) would put every reachable position off the grid and the
 * thumb could never land exactly on centred. Imperial rounds each end's reach inward to a whole
 * 1/16" here; Metric's `metricSliderRange` already rounds each end inward to a whole millimetre.
 * Either way zero is always a step on the grid, and `formatPlacement` then reads `centered`.
 */
export function placementSlider(
  placement: Mm,
  range: { min: Mm; max: Mm },
  system: UnitsSystem,
): MeasureSliderView {
  const negate = (value: number) => (value === 0 ? 0 : -value);
  const step = 1 / 16;
  /** A reach, in inches, rounded inward onto the 1/16" grid (the same 1e-9 nudge as every grid
   * rounding in `units.ts`, so a reach exactly on the grid never loses a step to float noise). */
  const onGrid = (reachIn: number) => Math.floor(Math.max(0, reachIn) / step + 1e-9) * step;
  const noseReachIn = mmToInches(range.max);
  const tailReachIn = negate(mmToInches(range.min));
  const rangeIn =
    system === "imperial"
      ? { min: negate(onGrid(noseReachIn)), max: onGrid(tailReachIn) }
      : { min: negate(noseReachIn), max: tailReachIn };
  const view = measureSlider(mm(negate(placement)), rangeIn, step, 1, system);
  // `view.value` is already the negated placement in the slider's own unit; only `toMm` turns back.
  return { ...view, toMm: (dragged: number) => mm(negate(view.toMm(dragged))) };
}

/**
 * Where a tip's thinning starts, as a distance in from that tip (Phase 14, D-22, UI-SPEC §9): a dim,
 * read through `formatDim` — Imperial `25 1/2"`, Metric centimetres to one decimal, `64.8 cm`. A
 * start at the 12" station therefore prints exactly the digits of `stationLabel` (`12"` / `30.5 cm`),
 * never `305 mm`, so the start and the 12" station two rows above it never read two ways. Every place
 * the distance appears — the row label, the hint, the too-close line, the drawing's accessible name,
 * the DATASHEET and the order form — reads through this one formatter or its bare twin below.
 */
export function formatThinningStart(start: Mm, system: UnitsSystem): string {
  return formatDim(start, system);
}

/**
 * The bare twin of `formatThinningStart` (D-22, UI-SPEC §9), through `formatDimBare`: Metric `64.8`
 * with no unit, for the DATASHEET's `From tip (cm)` cells and the printed pair that carries `cm` once
 * at the end of its line. Imperial keeps its inch mark (`25 1/2"`), as every Imperial cell does.
 */
export function formatThinningStartBare(start: Mm, system: UnitsSystem): string {
  return formatDimBare(start, system);
}

/**
 * The Thinning Starts slider (D-11, UI-SPEC §3): the tip at the left end and the board's centre at the
 * right, on BOTH tips, so dragging right always means "starts further in". The tip view's range (6"
 * to half the length) is turned into the inch-domain range `measureSlider` takes, each end rounded
 * inward onto the 1/2" grid (the same 1e-9 nudge as every grid rounding in `units.ts`), with a 1/2"
 * Imperial step and a 10 mm Metric step — so in Metric the 6" end reads 160 mm and the half-length
 * end rounds inward to a whole centimetre (`metricSliderRange`).
 *
 * A start off the Metric grid (Automatic's 25 1/2" is 647.7 mm) is drawn where it is, never snapped
 * (`measureSlider` only clamps a Metric value); only a drag's `toMm` snaps, to a whole millimetre on
 * the 10 mm grid. The component never converts a unit (D-22).
 */
export function thinningStartSlider(
  view: Pick<TipView, "fromTip" | "range">,
  system: UnitsSystem,
): MeasureSliderView {
  const stepIn = 0.5;
  const onGridUp = (x: number) => Math.ceil(x / stepIn - 1e-9) * stepIn;
  const onGridDown = (x: number) => Math.floor(x / stepIn + 1e-9) * stepIn;
  const rangeIn = {
    min: onGridUp(mmToInches(view.range.min)),
    max: onGridDown(mmToInches(view.range.max)),
  };
  return measureSlider(view.fromTip, rangeIn, stepIn, 10, system);
}

/**
 * The Thinning Starts row's hint line, left (D-11, UI-SPEC §1) — exactly one of three states:
 * `Picked automatically` (Automatic, at the 12" station); `Automatic: 12" is too short` /
 * `Automatic: 30.5 cm is too short` (Automatic, further in — read off `reachesStation`, the same
 * boolean the 12" row's hint reads, so the two lines can never disagree); `Automatic would be 25 1/2"`
 * (set by hand — what pressing the Automatic button would do).
 */
export function thinningStartHint(
  view: Pick<TipView, "automatic" | "reachesStation" | "automaticStart">,
  system: UnitsSystem,
): string {
  if (!view.automatic) return `Automatic would be ${formatThinningStart(view.automaticStart, system)}`;
  return view.reachesStation ? `Automatic: ${stationLabel(system)} is too short` : "Picked automatically";
}

/**
 * The too-close line under a Thinning Starts row set by hand (D-05, D-21, UI-SPEC §4) — two sentences,
 * each WITH its full stops (the line is its own paragraph, not a reason a flag adds a stop to):
 *
 * - thin spot (the planer cut at the start is already under the tip setting): where the board is
 *   thinnest and by how much, against the tip setting, then the Automatic start that clears it — the
 *   UI-SPEC's Arctic 10'9" tail reads 9/16" at 12" under a 5/8" tip, Automatic 25 1/2";
 * - sharp bend (a change of slope above 1/32" per inch where the taper leaves the planer cut): where the
 *   bend is, then the Automatic start that runs it down steadily — the UI-SPEC's 9'4" tail, 12" by hand,
 *   Automatic 15 1/2".
 *
 * The exact wording is the UI-SPEC Copywriting Contract's "The too-close line" table, pinned word for
 * word in `blank-reasons.test.ts`.
 *
 * Distances read through `formatThinningStart`, thicknesses through `formatMark`. Null when the flag is
 * null — always on Automatic (D-23), on a steady hand-set start, and on a tip whose Automatic found no
 * steady start (`tipView` gives no flag then, so "Automatic would … clear that" is never said falsely) —
 * and null when the thinnest thickness PRINTS the same as the tip setting, so the line never contradicts
 * itself (`5/8"`, under the `5/8"` …).
 */
export function thinningStartLine(
  end: TipEnd,
  view: Pick<TipView, "fromTip" | "automaticStart" | "flag">,
  tipSetting: Mm,
  system: UnitsSystem,
): string | null {
  const { flag } = view;
  if (flag === null) return null;
  const automatic = formatThinningStart(view.automaticStart, system);
  if (flag.kind === "steep") {
    return (
      `The ${end} thinning starts with a sharp bend, ${formatThinningStart(view.fromTip, system)} from the tip. ` +
      `Automatic would start it ${automatic} from the tip and run it down steadily.`
    );
  }
  const thinnest = formatMark(flag.thinnest, system);
  const tip = formatMark(tipSetting, system);
  if (thinnest === tip) return null;
  return (
    `The board is thinnest ${formatThinningStart(flag.at, system)} from the ${end} tip: ${thinnest}, ` +
    `under the ${tip} set for the tip. Automatic would start the thinning ${automatic} from the tip and clear that.`
  );
}

/**
 * The 12" fine-tune row's left hint (D-07, UI-SPEC §10): `From the tip taper 1 5/16"` when that tip's
 * start is further in than the 12" station — the 12" thickness then belongs to the taper, not to the
 * planer cut — and `From blank 1 5/16"` otherwise, the value one thickness through `formatMark`. The row
 * hands in the profile's own `reachesStation`, never a comparison of its own.
 */
export function fineTuneSourceHint(reachesStation: boolean, derived: Mm, system: UnitsSystem): string {
  return `${reachesStation ? "From the tip taper" : "From blank"} ${formatMark(derived, system)}`;
}

/** `Nose` / `Tail` — a tip's name at the start of a row label. */
function tipName(end: TipEnd): string {
  return end === "nose" ? "Nose" : "Tail";
}

/**
 * A Thinning Starts row's label (D-09, UI-SPEC §1): `Nose Thinning Starts — 12"` / `Tail Thinning
 * Starts — 64.8 cm`, always carrying the distance in force, Automatic's or the shaper's, through
 * `formatThinningStart`.
 */
export function thinningStartRowLabel(end: TipEnd, view: Pick<TipView, "fromTip">, system: UnitsSystem): string {
  return `${thinningStartSliderLabel(end)} — ${formatThinningStart(view.fromTip, system)}`;
}

/**
 * A Thinning Starts slider's accessible name (Phase 14 code review WR-01): `Nose Thinning Starts` /
 * `Tail Thinning Starts`, the row's product name without the distance — the distance is the slider's
 * spoken value, read through `formatThinningStart` beside it, so a screen reader tells the two twin
 * sliders apart by tip and hears the start the way the label prints it.
 */
export function thinningStartSliderLabel(end: TipEnd): string {
  return `${tipName(end)} Thinning Starts`;
}

/**
 * The Automatic button's accessible name (D-11, UI-SPEC §2): `Use Automatic for the nose thinning
 * start` / `…the tail thinning start`, so the two buttons that both read `Automatic` are told apart.
 */
export function automaticButtonLabel(end: TipEnd): string {
  return `Use Automatic for the ${end} thinning start`;
}

/**
 * The side profile's accessible-name clause for the two thinning marks (D-12, UI-SPEC "Viewer and
 * DATASHEET"): `a dashed line across the board where each tip's thinning starts: 30.5 cm from the nose
 * tip and 64.8 cm from the tail tip`. No full stop — it ends the drawing's name.
 */
export function thinningMarksSentence(noseFromTip: Mm, tailFromTip: Mm, system: UnitsSystem): string {
  return (
    `a dashed line across the board where each tip's thinning starts: ` +
    `${formatThinningStart(noseFromTip, system)} from the nose tip and ` +
    `${formatThinningStart(tailFromTip, system)} from the tail tip`
  );
}

/**
 * THICKNESS's opening line with a blank picked (UI-SPEC "Sidebar: THICKNESS", §10): true wherever the
 * starts are, replacing "the tips are thinned in the last 12"". The station reads through
 * `stationLabel` (`12"` / `30.5 cm`).
 */
export function thicknessIntroWithBlank(system: UnitsSystem): string {
  return (
    `Deck and bottom follow your blank's; each tip is thinned from its Thinning Starts point, below. ` +
    `Set the tips, and fine-tune the ${stationLabel(system)} stations if you need to.`
  );
}

/**
 * The three rules the list's floors and their sentences quote (Phase 12 D-10): Extra Length, and —
 * for the centre — the Deck Skin the verdicts use (the board's own, or the account default when no
 * blank is picked) plus one pass of the shaper's Planer Max Depth. Callers hand in the SAME numbers
 * the verdicts were judged with, so the words and the list can never disagree.
 */
export interface CenterFloorRules {
  extraLength: Mm;
  planerMaxDepth: Mm;
  deckSkin: Mm;
}

/**
 * `{skin} deck skin and a {pass} bottom pass` — the centre floor, in the shaper's words. When the
 * board takes no deck skin (Phase 13 item 4b, FD-6/FD-8), the phrase drops the skin entirely —
 * `{pass} bottom pass` — since a skin that is already none cannot be lowered to help.
 */
function skinAndPass(rules: CenterFloorRules, system: UnitsSystem): string {
  if (takesNoDeckSkin(rules.deckSkin, system)) return `${formatMark(rules.planerMaxDepth, system)} bottom pass`;
  return `${formatMark(rules.deckSkin, system)} deck skin and a ${formatMark(rules.planerMaxDepth, system)} bottom pass`;
}

/**
 * The flag body for a picked blank that no longer passes a floor (F3, F4): `It's 1 1/2" too short —
 * you've asked for at least 2" of spare length.` / `It's 1/16" too thin at the center — there isn't
 * room for your 1/8" deck skin and a 1/8" bottom pass.` Every number but the shortfall comes from
 * `rules` — the shaper's own settings and the board's own skin. When that skin is none (Phase 13
 * item 4b, FD-6/FD-8), the center sentence names only the bottom pass: `there isn't room for your
 * 1/8" bottom pass.`
 */
export function floorShortfallMessage(
  kind: "length" | "center",
  shortBy: Mm,
  rules: CenterFloorRules,
  system: UnitsSystem,
): string {
  const amount = formatAmount(shortBy, system);
  return kind === "length"
    ? `It's ${amount} too short — you've asked for at least ${formatMark(rules.extraLength, system)} of spare length.`
    : `It's ${amount} too thin at the center — there isn't room for your ${skinAndPass(rules, system)}.`;
}

/**
 * The empty list's heading and body (E1, E2, E3), naming the board's number, the catalogue's best
 * and the rule that ruled every blank out. `kind` is `listBlanks`'s `emptyReason`. `catalogs` names
 * the catalogues searched — "the three catalogs" unless a shaper has switched blank makers off, when
 * the caller passes the narrower phrase so the longest blank quoted is one they can actually see.
 * When the rules' Deck Skin is none (Phase 13 item 4b, FD-6/FD-8), the E2 body's closing advice
 * drops "your Deck Skin" — a skin that is already none cannot be lowered to help.
 */
export function emptyListMessage(
  kind: "length" | "thickness" | "both",
  numbers: {
    boardLength: Mm;
    longest: Mm;
    centre: Mm;
    thickestCenter: Mm;
    rules: CenterFloorRules;
  },
  system: UnitsSystem,
  catalogs: string = "the three catalogs",
): { heading: string; body: string } {
  const extraLength = formatMark(numbers.rules.extraLength, system);
  if (kind === "length") {
    return {
      heading: "No blank is long enough",
      body:
        `Your board is ${formatLength(numbers.boardLength, system)} and the longest blank in ${catalogs} ` +
        `is ${formatLength(numbers.longest, system)}, so none leaves the ${extraLength} of spare ` +
        `length you've asked for. Shorten the board on the TEMPLATE screen, or ask for less spare length.`,
    };
  }
  if (kind === "thickness") {
    const advice = takesNoDeckSkin(numbers.rules.deckSkin, system)
      ? "Try a thinner center, or change your Planer Max Depth."
      : "Try a thinner center, or change your Deck Skin or Planer Max Depth.";
    return {
      heading: "No blank is thick enough",
      body:
        `Your center is ${formatMark(numbers.centre, system)} and the thickest blank is ` +
        `${formatMark(numbers.thickestCenter, system)} at the center, so none leaves room for a ` +
        `${skinAndPass(numbers.rules, system)}. ${advice}`,
    };
  }
  return {
    heading: "No blank passes both rules",
    body:
      `Nothing in ${catalogs} is both ${extraLength} longer than your board and thick enough at the ` +
      `center for a ${skinAndPass(numbers.rules, system)}.`,
  };
}

/**
 * The line above the list, live from the rules the list is judged by (D-04, D-10). With no blank
 * picked, the Deck Skin it quotes is the account default (12-UI-SPEC §11). When that skin is none
 * (Phase 13 item 4b, FD-6/FD-8), the room-at-the-center clause names only the bottom pass.
 */
export function listIntro(rules: CenterFloorRules, system: UnitsSystem): string {
  return (
    `Shortest first. Each is at least ${formatMark(rules.extraLength, system)} longer than your board, ` +
    `with room at the center for a ${skinAndPass(rules, system)}. ` +
    `Greyed blanks don't fit somewhere — the line under each says where.`
  );
}

/**
 * A blank row's second line: `{vendor} · {length} · {centre} center` — the blank's measured length
 * through `formatLength` (the same formatter as the board's own length, so the two compare
 * directly) and its printed centre-station thickness. A record with no centre thickness (never a
 * pickable one) shows vendor and length only.
 */
export function blankRowMeta(
  record: Pick<BlankRecord, "vendor" | "lengthMm" | "stations">,
  system: UnitsSystem,
): string {
  const head = `${record.vendor} · ${formatLength(record.lengthMm, system)}`;
  const centre = record.stations.find((station) => station.label === "C")?.thicknessMm ?? null;
  return centre === null ? head : `${head} · ${formatMark(centre, system)} center`;
}

/** Curly quotes an iPhone types (’ ‘ ” “) folded to straight ones, so `6’2` finds `6'2"`. */
function foldQuotes(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

/**
 * The list's search (11-UI-SPEC §2 state B): a case-insensitive substring over `{vendor} {name}`,
 * curly quotes folded to straight ones on both sides first. An empty (or all-space) query matches
 * every blank. Plain `String.prototype.includes` — the shaper's text is never turned into a
 * regular expression, so `(`, `*` or `[` are read literally and can never throw (T-11-31).
 */
export function matchesBlankSearch(record: Pick<BlankRecord, "vendor" | "name">, query: string): boolean {
  const needle = foldQuotes(query.trim()).toLowerCase();
  if (needle === "") return true;
  return foldQuotes(`${record.vendor} ${record.name}`).toLowerCase().includes(needle);
}

/**
 * A row's volume, where the catalogue prints one: `34.0 L` — one decimal, read the same in both
 * systems (CLAUDE.md Rule 2). Null when the catalogue has no volume, so nothing takes its place.
 */
export function blankRowVolume(record: Pick<BlankRecord, "volumeLitres">): string | null {
  return record.volumeLitres === null ? null : `${record.volumeLitres.toFixed(1)} L`;
}

/**
 * The line under the ROCKER subtitle: `Length and width from TEMPLATE: 5'10" × 19 1/2"`, and in
 * Metric `… 177.8 × 49.5 cm` — the unit carried once, at the end of the line (the house rule for
 * running text). The length reads through `formatLength` (the same formatter a blank's length reads
 * through, so the two compare directly), the width through `formatDim`.
 */
export function boardLine(length: Mm, width: Mm, system: UnitsSystem): string {
  const lengthText = system === "metric" ? formatDimBare(length, system) : formatLength(length, system);
  return `Length and width from TEMPLATE: ${lengthText} × ${formatDim(width, system)}`;
}

/** The offer beside a flag: `Closest blank that fits: {vendor} {name}, {length}`. */
export function offerLine(record: Pick<BlankRecord, "vendor" | "name" | "lengthMm">, system: UnitsSystem): string {
  return `Closest blank that fits: ${record.vendor} ${record.name}, ${formatLength(record.lengthMm, system)}`;
}
