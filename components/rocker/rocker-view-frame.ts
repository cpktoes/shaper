/**
 * The rocker/foil side-profile viewer's scale and frame — the ONE place this drawing's scale and
 * frame are decided, for both orientations, and for all three rail grammars (quick task 260829-uue,
 * widened to a compact third grammar by 260829-vus). Pure geometry, no React import (per `import
 * type` only for the orientation-shaped literal below), so it can be verified in
 * `rocker-view-frame.test.ts` in isolation from `rocker-viewer.tsx`.
 *
 * Two rails, symmetric about the board: a deck rail above the board (thickness read-outs) and a
 * bottom rail below it (rocker read-outs) — see `deckRailY`/`railY` below. Each rail also carries
 * its own title (`"Thickness"` over the deck rail, `"Rocker"` over the bottom one, `"full"` mode
 * only, words held in `RAIL_LABEL_TEXTS`) — this module decides that title's band, baseline, size
 * and station, per 260830-2dy's `<design_decision>` sections 2 and 3 (nose-left) and 260830-31h's
 * sections 1-4 (nose-up, where a title heads its own rail's Center card directly, centred on that
 * card's own column, rather than sitting outboard of the rail); `rocker-viewer.tsx` supplies only
 * the words and the paint. `rocker-viewer.tsx` draws from the `RockerViewLayout` this module
 * produces; it derives no scale, band or type-stack arithmetic of its own (quick task 260829-tmj,
 * extended by 260829-uue, 260829-vus, 260830-2dy and 260830-31h).
 *
 * The compact grammar (`stationRails: "compact"`) is the Summary order form's own rails: five bare
 * thickness readings above the board, four bare rocker readings below — no card surface, no
 * station name (see this plan's `<design_decision>` section 2 for why the card grammar does not
 * fit at this box's printed size). Every band depth, row baseline, type size and reading x position
 * that grammar needs lives here too, so `rocker-viewer.tsx` still derives nothing of its own.
 */

import { BOARD_LENGTH_RANGE_IN } from "@/lib/geometry/board";

/** Which way the rocker drawing is currently turned — mirrors `ViewerOrientation` in
 * `callout-primitives.tsx`, kept as its own literal union here so this module carries no
 * React-shaped import. */
export type RockerViewOrientation = "horizontal" | "vertical";

/** Which rail a station card belongs to: `"deck"` (thickness, above the board) or `"bottom"`
 * (rocker, below the board). */
export type RockerCardSide = "deck" | "bottom";

/** Which rail grammar `rocker-viewer.tsx` draws (quick task 260829-uue, widened to a third mode by
 * 260829-vus):
 *
 * - `"full"` reserves a card-rail band on both sides of the board and draws the two-part
 *   card/reading grammar `rocker-editor.tsx` uses — a named input chip at a slider-set figure, a
 *   plain reading (tick + value + station name) at a derived one.
 * - `"none"` reserves no band at all — the frame is the board plus a hairline of pad
 *   (`BARE_PAD`), the original card-less contract this module has always carried.
 * - `"compact"` reserves the Summary order form's own bare-value rails: five thickness readings
 *   on the deck side, four rocker readings on the bottom side, no card surface and no station
 *   name (position and side carry that instead — see this plan's `<design_decision>` section 2).
 *   Horizontal-only by contract: its one consumer, the order form, never rotates this box, so this
 *   mode ignores the `orientation` argument entirely — a rotated single-row rail would present its
 *   own width across the rail the way a card does, which this grammar has no room to spend.
 */
export type RockerStationRails = "full" | "compact" | "none";

export interface RockerViewLayoutInput {
  /** The board's own length, in inches. May be a corrupt/degenerate value carried by a saved
   * design (0, negative, `NaN`) — see the fallback rule on `scale` below (threat T-TMJ-02). */
  lengthIn: number;
  /** The worst-case deck height (rocker lift + foil thickness) any board this app can produce,
   * in inches. Reserved on the frame's cross axis regardless of scale — see the header comment
   * on `PX_PER_INCH`'s replacement, `scale`, for why this stays a constant rather than fitting
   * to this board's own values (planner finding 3: the drawing is long-axis-bound in every
   * realistic panel, so trimming this reserve would only grow the empty band, not shrink it). */
  maxDeckIn: number;
  orientation: RockerViewOrientation;
  /**
   * A per-consumer scale choice, not an editor-only one (planner finding 7, revised by quick
   * task 260829-uue). `true` scales every board's own length to fill the frame's long axis, so a
   * 5'0" board and a 10'0" board both draw at the same share of the panel — both
   * `components/rocker/rocker-editor.tsx` and, now, the Summary order form's card-less rocker box
   * (`components/summary/order-form.tsx`) pass this. `false` keeps the fixed range-derived scale
   * this viewer has always used, the same precedent 260823-h6l set for the outline viewer's own
   * `fixedFrame` — still the right default for a consumer whose frame must never resize around
   * whichever board happens to be loaded.
   */
  fitToBoard: boolean;
  /**
   * Which rail grammar this call draws (quick task 260829-uue, widened to `"compact"` by
   * 260829-vus) — see `RockerStationRails`. A band is reserved on the frame's cross axis only
   * when a mode actually draws into it: `"full"` reserves the card-rail band, `"compact"`
   * reserves its own bare-value bands (`COMPACT_DECK_BAND` / `COMPACT_BOTTOM_BAND`), `"none"`
   * reserves nothing but a hairline of pad. No default: every call site has to say which it is.
   */
  stationRails: RockerStationRails;
  /**
   * A per-consumer pin choice (quick task 260830-03j), mirroring `callout-primitives.tsx`'s own
   * `pinCalloutText` contract: 1 (the default) means "unpinned", i.e. exactly the card size this
   * module has always drawn — the order form's own path (`stationRails` is never `"full"` there)
   * forces the applied scale to 1 regardless of what this field carries, so the pin can never
   * reach the print path. Only the rocker EDITOR passes a scale above 1, computed by `cardPinScale`
   * from its own live fit measurement. Clamped into `[1, maxCardPinScale(orientation)]` inside
   * `rockerViewLayout`; a non-finite value resolves to 1, the same fallback posture
   * `resolveEffectiveLengthIn` gives a corrupt `lengthIn` (threat T-03J-01).
   */
  cardScale?: number;
}

/** One compact-mode reading row's three anchors, in canonical (horizontal) coordinates — see
 * `rockerViewLayout`'s `compactRows` construction below for the derivation of each. */
export interface RockerCompactRow {
  /** The SVG text baseline the reading's value sits on. */
  textY: number;
  /** Where the reading's leader line leaves the type, headed for `kneeY` then the curve. */
  leaderStartY: number;
  /** Where the leader turns to run straight down (or up) the station, toward the curve. */
  kneeY: number;
}

/** The two rows `rocker-viewer.tsx` draws in `"compact"` mode: one on the deck rail (five
 * thickness figures) and one on the bottom rail (all four rocker figures, tips and @ 12" alike,
 * sharing a single text baseline). The bottom rail was originally split across two staggered rows
 * to keep a tip and its neighbouring @ 12" figure apart on a 10'0" board (260829-vus decision 4);
 * collapsed to one aligned row on the founder's own print review — `compactRailReadingXs`' sweep
 * already separates same-row neighbours, doglegging their leaders, so the stagger bought nothing
 * the sweep does not. */
export interface RockerCompactRows {
  deck: RockerCompactRow;
  bottom: RockerCompactRow;
}

/** A card's whole type stack, scaled by the applied `cardScale` — see `RockerViewLayout.cardType`.
 * `nameSize`/`valueSize` replace `STATION_NAME_SIZE`/`STATION_VALUE_SIZE` at the call site; the
 * four `*Dy` fields replace `CARD_NAME_DY`/`CARD_VALUE_DY`/`READOUT_VALUE_DY`/`READOUT_NAME_DY`. */
export interface RockerCardType {
  nameSize: number;
  valueSize: number;
  cardNameDy: number;
  cardValueDy: number;
  readoutValueDy: number;
  readoutNameDy: number;
}

export interface RockerViewLayout {
  /** User units per inch, shared by BOTH axes — a shaper checks a rocker line with a
   * straightedge, so the drawing never exaggerates the vertical axis for legibility (one `scale`
   * field is what makes that true by construction, not by convention). */
  scale: number;
  viewH: number;
  baselineY: number;
  /** Where a bottom-rail station tick line stops — always `baselineY + BOTTOM_RAIL_GAP`, in both
   * orientations, so a tick still stops at the card's own near edge rather than running into its
   * middle once the vertical rail moves off this same value (see `railY`). */
  tickEndY: number;
  /** The bottom (rocker) rail's own anchor. `baselineY + BOTTOM_RAIL_GAP` in horizontal; in
   * vertical a rotated card presents its WIDTH across the rail rather than its height, so the
   * anchor clears the baseline by `BOTTOM_RAIL_GAP + cardWidth / 2` instead. */
  railY: number;
  /** Where a deck-rail station tick line stops — the mirror of `tickEndY` on the board's other
   * side, always `deckTopY - RAIL_GAP` in both orientations. Not the same gap the bottom rail
   * uses — see `BOTTOM_RAIL_GAP` for why the two sides measure differently. */
  deckTickEndY: number;
  /** The deck (thickness) rail's own anchor. In horizontal a deck card hangs UP from the rail, so
   * the anchor is its own top edge (`deckTickEndY - cardHeight`); in vertical the anchor is the
   * card's cross-axis centre, the same convention `railY` uses (`deckTickEndY - cardWidth / 2`). */
  deckRailY: number;
  /** Extra offset applied to a card's own position along the rotated station axis — 0 in
   * horizontal; `-cardHeight / 2` in vertical, centring each card on the station it names. Shared
   * by both rails. */
  cardDy: number;
  cardWidth: number;
  cardHeight: number;
  /** The applied card-pin scale, after clamping — 1 in every mode but `"full"`, where it echoes
   * whatever `cardScale` resolved to (quick task 260830-03j). `rocker-viewer.tsx` reads this only
   * to know what was actually applied; it derives no arithmetic from it (Rule 1). */
  cardScale: number;
  /** The card's own type stack, scaled by `cardScale` together with the card box — a name/value
   * pair can never escape its own card frame because one scalar moves both (quick task
   * 260830-03j). Each field is the matching module constant times `cardScale`. */
  cardType: RockerCardType;
  /** The compact rails' own three row anchors (`"compact"` mode only) — populated in every mode
   * so the field is never `NaN`; outside compact it is unused and the existing card fields above
   * carry the drawing. */
  compactRows: RockerCompactRows;
  /** The rail titles' own type size, in SVG user units — `RAIL_LABEL_SIZE * appliedScale`, the
   * SAME scalar that scales the card box and `cardType`, so a title and the numbers under it
   * move as one unit and hold a constant on-screen size in both orientations (quick task
   * 260830-2dy, extending 260830-03j's pin to the titles). Populated in every mode so the field
   * is never `NaN`; outside `"full"` it is unused. */
  railLabelSize: number;
  /** The deck (thickness) title's own anchor, in canonical coordinates. Nose-left this is a text
   * BASELINE — the deck rail's own ceiling-sized far edge, less `RAIL_LABEL_GAP`, so the title is
   * frame-invariant: it never walks when the card-pin scale changes. Nose-up this is the title's
   * own CROSS-AXIS CENTRING instead, equal to `deckRailY` itself — the deck rail's own LIVE
   * anchor, so the title tracks the cards it heads rather than drifting off-centre from the
   * column it names whenever the live pin is under the ceiling (quick task 260830-31h,
   * `<design_decision>` section 1). Populated in every mode so the field is never `NaN`; outside
   * `"full"` it is unused. */
  deckLabelY: number;
  /** The bottom (rocker) title's own anchor, in canonical coordinates. Nose-left this is a text
   * BASELINE — the bottom rail's own ceiling-sized far edge, plus `RAIL_LABEL_GAP` and the
   * title's own cap height, so the GLYPH edge (not the baseline) sits `RAIL_LABEL_GAP` clear of
   * the cards, matching the deck title's own visual distance. Nose-up this is the title's own
   * CROSS-AXIS CENTRING instead, equal to `railY` itself, the same live-anchor rule `deckLabelY`
   * follows (quick task 260830-31h). Populated in every mode so the field is never `NaN`; outside
   * `"full"` it is unused. */
  bottomLabelY: number;
  /** Both titles' shared station x, in canonical coordinates. Nose-left this is the board's own
   * middle station, unchanged. Nose-up this is the title's own BASELINE instead — the middle
   * station backed off by the Center card's own half-height (its extent along the rotated station
   * axis) and a gap in EMs (`RAIL_LABEL_STATION_GAP_EM`), so each title sits directly above its
   * own Center card rather than beside its rail (quick task 260830-31h, `<design_decision>`
   * sections 1-2).
   *
   * A note for the next editor, because its absence is what produced this regression: the two
   * anchor fields SWAP ROLES between orientations. Nose-left the two `*LabelY` fields are text
   * BASELINES and `labelStationX` is the horizontal CENTRING. Nose-up the `*LabelY` fields become
   * the horizontal CENTRING and `labelStationX` becomes the BASELINE. Populated in every mode so
   * the field is never `NaN`; outside `"full"` it is unused. */
  labelStationX: number;
  minX: number;
  minY: number;
  width: number;
  height: number;
  /** The four frame numbers above, each at two decimals, ready for an svg `viewBox` attribute. */
  viewBox: string;
}

/** The drawing's own canonical width, in SVG user units — unchanged by `fitToBoard`; what grows
 * or shrinks per board is `scale`, never this frame constant. */
export const VIEW_W = 900;
/** Left/right pad inside `VIEW_W` the board's own drawn span sits within. */
export const PAD_X = 40;
/** Gap between the worst-case deck line and the DECK rail's tick marks. */
export const RAIL_GAP = 20;
/**
 * The BOTTOM (rocker) rail's own gap — deliberately larger than `RAIL_GAP`, because the two rails
 * measure from references the drawn board sits at very differently (founder review, 2026-08-30).
 *
 * The deck rail hangs off `deckTopY`, the WORST-CASE deck line this module always reserves
 * (`maxDeckIn`, 14in of rocker lift plus foil) — a line no realistic board reaches, so the deck
 * cards already float far clear of the drawn deck curve. The bottom rail hangs off `baselineY`,
 * the flat surface the board's bottom curve actually TOUCHES at the centre station, where rocker
 * is zero by construction. One shared gap therefore reads as two different distances: measured on
 * a 6'0" board, the deck cards cleared the drawn board by 124.6 units while the bottom cards
 * cleared it by exactly `RAIL_GAP` — the crowding the founder saw.
 *
 * A fixed value, not a per-board one: the frame must never resize around whichever board happens
 * to be loaded (the same rule `maxDeckIn`'s worst-case reserve exists to protect), so this cannot
 * chase the deck side's own board-dependent slack. Double `RAIL_GAP` gives the bottom cards
 * clearance comparable to the board box's own drawn depth without the frame growing enough to
 * shrink the board noticeably.
 */
export const BOTTOM_RAIL_GAP = 40;
/** Each station card's height, in SVG user units — room for a station-name row over a single
 * value row at this drawing's existing type scale (quick task 260829-uue: a card now holds one
 * value instead of two, so this dropped from 50). */
export const STATION_CARD_HEIGHT = 35;
/** Gutter left between neighbouring cards on a rail, and between a rail's outer edge and the
 * frame — named so it is one constant everywhere instead of a bare literal repeated at each use. */
export const CARD_GUTTER = 8;
/** The pad a compact, card-less frame leaves around the board so a stroked edge is not
 * half-clipped. */
export const BARE_PAD = 8;

/** The rocker rail's type scale, in SVG user units — the sizes `rocker-viewer.tsx` used to
 * hard-code inline. */
export const STATION_NAME_SIZE = 10;
export const STATION_VALUE_SIZE = 13;
/** A card's two stacked rows (an INPUT, per the TEMPLATE screen's grammar): name over value,
 * both measured from the card's own rail anchor. */
export const CARD_NAME_DY = 13;
export const CARD_VALUE_DY = 28;
/** A plain reading's two stacked rows (a DERIVED value, per the TEMPLATE screen's grammar): value
 * over station name, the reverse stacking of a card — centred in the same band depth a card
 * occupies at the same rail anchor, so a card containment proof carries a plain reading with it. */
export const READOUT_VALUE_DY = STATION_CARD_HEIGHT / 2 - 2;
export const READOUT_NAME_DY = READOUT_VALUE_DY + STATION_VALUE_SIZE;

/**
 * The two rail titles' own type scale and band constants (quick task 260830-2dy) — see this
 * plan's `<design_decision>` sections 2-4 for the full derivation.
 */
/** The rail titles' own font size, in SVG user units — one unit above the station-name row
 * (`STATION_NAME_SIZE`, 10) and one below the value row (`STATION_VALUE_SIZE`, 13): a heading
 * over the rail, not louder than the numbers it heads. */
export const RAIL_LABEL_SIZE = 12;
/** Clear space between a rail's own outer (ceiling-sized) card edge and the title's nearest
 * glyph edge — the same distance on every side, which is what keeps a title the same visual
 * distance from its own cards regardless of orientation or which rail it sits on. */
export const RAIL_LABEL_GAP = 8;
/** Clear space between a title and the frame's own outer edge, on the far side of the title from
 * its rail. */
export const RAIL_LABEL_EDGE_GUTTER = 4;
/** Cap height as a share of font size for a rail title — `Thickness` and `Rocker` are two
 * capitalised words with no descenders, so a band only has to clear the cap. Deliberately its
 * own constant rather than a reach into `COMPACT_CAP_RATIO`, which belongs to the order form's
 * digit-only readings and must stay free to move without dragging the editor's titles with it. */
export const RAIL_LABEL_CAP_RATIO = 0.72;
/** The two rail titles' own words (quick task 260830-2dy; moved into this module by 260830-31h so
 * the drawing's vocabulary and this module's own containment proof can never disagree — see this
 * plan's `<design_decision>` section 5). Byte-identical to the sidebar's collapsible sections
 * (`rocker-controls.tsx`) and the DATASHEET's row groups (`rocker-datasheet.tsx`); `rocker-viewer.tsx`
 * reads these rather than holding its own copies. */
export const RAIL_LABEL_TEXTS = { deck: "Thickness", bottom: "Rocker" } as const;
/** This face's widest glyph's em-advance at this weight — a deliberately generous per-character
 * bound for a containment PROOF, not a text-metrics engine (quick task 260830-31h), the same
 * posture `COMPACT_DEFAULT_CHAR_ADVANCE` takes for the order form's own digit readings. Kept as
 * its own constant rather than a reach into that one, for the same reason `RAIL_LABEL_CAP_RATIO`'s
 * own note gives: these are mixed-case words, narrower than digits, and this drawing's titles must
 * stay free to move without dragging the print path's readings with them. */
export const RAIL_LABEL_EM_ADVANCE = 0.6;
/** The `letterSpacing` a rail title is actually drawn with (`rocker-viewer.tsx`'s `RailTitle`) —
 * folded into the run-width bound because tracking widens a string's printed run past its bare
 * glyph advances. */
export const RAIL_LABEL_TRACKING_EM = 0.08;
/** How far a title clears its own Center card along the station axis nose-up, as a share of the
 * title's own type size rather than a bare unit count (quick task 260830-31h, `<design_decision>`
 * section 2): both the card and the title are pin-scaled, so only a gap riding the SAME pin holds
 * a constant fraction of the title's own type clear at every card scale — a fixed-unit gap would
 * drift as the frame's fit scale changed while the two things it separates did not. Set to exactly
 * what `RAIL_LABEL_GAP` already is as a share of `RAIL_LABEL_SIZE` nose-left, so a title sits the
 * same fraction of its own type clear of its cards in both orientations. */
export const RAIL_LABEL_STATION_GAP_EM = RAIL_LABEL_GAP / RAIL_LABEL_SIZE;

/** A rail title's own printed run width, in SVG user units, at `size` — the same deliberately
 * generous, per-character bound `RAIL_LABEL_EM_ADVANCE`'s note describes, used ONLY to prove a
 * title's run fits its own card column nose-up (quick task 260830-31h); not a text-metrics engine.
 * Grows with both the string's own length and the type size, so a title renamed to something
 * longer than today's two words is still proved against, rather than escaping silently. */
export function railLabelRunWidth(text: string, size: number): number {
  return text.length * (RAIL_LABEL_EM_ADVANCE + RAIL_LABEL_TRACKING_EM) * size;
}

/**
 * The compact rails' own type scale and band constants (quick task 260829-vus) — see this plan's
 * `<design_decision>` sections 1-5 for the full derivation. Every value here is named so the
 * relationship it protects survives any future change to the printed box size, rather than a bare
 * literal repeated at each use.
 */
/** The size that lands on 12px = 9pt of printed type at the order form's own printed scale — see
 * `compactValuePrintPx` and `ORDER_FORM_ROCKER_BOX_PX`. */
export const COMPACT_VALUE_SIZE = 24;
/** Cap height as a share of font size for these readings — they are digits, a fraction slash and
 * an inch mark, none of which descend, so a band only has to clear the cap, not a full
 * descender. */
export const COMPACT_CAP_RATIO = 0.72;
/** Gap left between the board box's own edge (the baseline or the worst-case deck line) and the
 * nearest glyph edge of a compact reading. */
export const COMPACT_CURVE_GAP = 8;
/** Gap left outside the outermost row, at the frame's own edge. */
export const COMPACT_EDGE_GUTTER = 4;
/** Minimum clear space `compactRailReadingXs` leaves between two readings sharing a row. */
export const COMPACT_READING_GUTTER = 6;
/** Half-length of a compact reading's 45-degree dimension tick — `CALLOUT_TICK_SIZE`'s 4 units
 * would print as a 4px dot at this drawing's printed scale, too small to read as a tick. */
export const COMPACT_TICK_SIZE = 7;
/** Stroke width of a compact reading's leader — a 1-unit leader prints at half a pixel and
 * washes out on paper. */
export const COMPACT_LEADER_WIDTH = 1.6;
/** The compact baseline's stroke and dash — the full grammar's 1-unit `4 3` dashed baseline
 * suffers the same half-pixel wash-out as a 1-unit leader at the order form's printed scale, so
 * the datum the rocker figures measure from was invisible on the sheet. 2 units at `8 6` prints
 * as a 1px line with 4px dashes: legible, and still subordinate to the board's own ink-coloured
 * 2-unit outline by colour and dash rather than by weight. */
export const COMPACT_BASELINE_WIDTH = 2;
export const COMPACT_BASELINE_DASH = "8 6";

/** Cap height of a compact reading's type, in SVG user units. */
export const COMPACT_CAP = COMPACT_VALUE_SIZE * COMPACT_CAP_RATIO;
/** How deep the deck (thickness) band is: curve gap, one row's cap height, edge gutter. */
export const COMPACT_DECK_BAND = COMPACT_CURVE_GAP + COMPACT_CAP + COMPACT_EDGE_GUTTER;
/** How deep the bottom (rocker) band is: curve gap, the single row's cap height, edge gutter —
 * the same depth as the deck band now that all four rocker figures share one row. */
export const COMPACT_BOTTOM_BAND = COMPACT_CURVE_GAP + COMPACT_CAP + COMPACT_EDGE_GUTTER;

/** The range-derived fixed scale — `PX_PER_INCH` before this module existed, and still what
 * `fitToBoard: false` (the order form's path) resolves to for every board length alike. */
const FIXED_SCALE = (VIEW_W - PAD_X * 2) / BOARD_LENGTH_RANGE_IN.max;

/**
 * Each station card's width, in SVG user units — derived from the rail's own narrowest column
 * pitch, the 12in tip-to-station span, rather than written as a literal, so the relationship
 * that keeps neighbouring cards apart survives any future change to the frame's scale.
 *
 * Under `fitToBoard`, the scale is `820 / lengthIn`, which is SMALLEST at the longest board — so
 * the narrowest 12in column pitch any board can produce is still `12 * FIXED_SCALE`, the same
 * worst case this expression already encoded before `fitToBoard` existed (planner finding 6).
 * The gutter between neighbouring cards only ever grows as the board gets shorter.
 */
export const STATION_CARD_WIDTH = 12 * FIXED_SCALE - CARD_GUTTER;

/**
 * How deep a card band has to be on a rail — a band has to be as deep as the card actually
 * presents across it: its own height nose-left, its own width nose-up (a rotated card presents
 * its WIDTH across the rail, planner finding 4). One band per side, sized for a card, even when
 * only some of that rail's figures are on cards (planner finding 9 / plan finding 6) — a card is
 * the deepest thing either rail carries, so a shallower band would save the frame nothing, and
 * one shared anchor is what keeps a card and a plain reading line up along the same rail.
 */
export function cardBandDepth(orientation: RockerViewOrientation): number {
  const pinCeiling = maxCardPinScale(orientation);
  return RAIL_GAP + pinCeiling * (orientation === "horizontal" ? STATION_CARD_HEIGHT : STATION_CARD_WIDTH) + CARD_GUTTER;
}

/**
 * The BOTTOM rail's own band depth — `cardBandDepth` plus the extra clearance `BOTTOM_RAIL_GAP`
 * buys over `RAIL_GAP`. The band has to grow by exactly what the rail moved, or the bottom card's
 * far edge walks straight out of the frame.
 */
export function bottomCardBandDepth(orientation: RockerViewOrientation): number {
  return cardBandDepth(orientation) + (BOTTOM_RAIL_GAP - RAIL_GAP);
}

/**
 * How deep a rail title's own band is, per orientation (quick task 260830-2dy, reshaped by
 * 260830-31h) — the two orientations differ because a title genuinely stacks OUTBOARD of the rail
 * nose-left, but shares its rail's own card COLUMN nose-up instead (this plan's `<design_decision>`
 * sections 0 and 4).
 *
 * Nose-left: the gap off the rail's own ceiling-sized far edge, the title's own cap-height at the
 * pin CEILING, and the edge gutter to the frame — unchanged from 260830-2dy, byte for byte.
 * Reserved at `maxCardPinScale`, never at the live `appliedScale` — the identical rule
 * `cardBandDepth` already follows, and the reason the frame -> fit scale -> card size -> frame
 * loop stays closed (threat T-2DY-03, mirroring the module's own T-03J-02 note).
 *
 * Nose-up: nothing stacks outboard any more, so there is nothing to reserve by default — but a
 * hardcoded 0 would be the same class of mistake this task fixes, a number asserted rather than
 * derived. Instead this returns the part of the longest title's own run, at the vertical CEILING
 * (the worst case for the same frame-invariance reason as the horizontal arm), that the card
 * column plus its gutter does NOT already cover: 0 today, since the longest run (~155 units) fits
 * with room to spare inside the column (~156 units) plus its gutter — and a positive, self-widening
 * reserve the moment a title is ever renamed to something that column can no longer hold.
 */
export function railLabelBandDepth(orientation: RockerViewOrientation): number {
  if (orientation === "horizontal") {
    return RAIL_LABEL_GAP + maxCardPinScale("horizontal") * RAIL_LABEL_SIZE + RAIL_LABEL_EDGE_GUTTER;
  }
  const ceiling = maxCardPinScale("vertical");
  const ceilingLabelSize = RAIL_LABEL_SIZE * ceiling;
  const longestRun = Math.max(
    railLabelRunWidth(RAIL_LABEL_TEXTS.deck, ceilingLabelSize),
    railLabelRunWidth(RAIL_LABEL_TEXTS.bottom, ceilingLabelSize),
  );
  const columnReserve = (STATION_CARD_WIDTH * ceiling) / 2 + CARD_GUTTER;
  const overhang = longestRun / 2 - columnReserve;
  return overhang > 0 ? overhang + RAIL_LABEL_EDGE_GUTTER : 0;
}

/**
 * The station-pitch ceiling on `cardScale` (quick task 260830-03j) — how far a card may grow along
 * the station axis before it touches its neighbour at the narrowest pitch any board produces (the
 * 12in tip-to-@12" span at `FIXED_SCALE`, already `fitToBoard`'s own worst case per
 * `STATION_CARD_WIDTH`'s derivation note).
 *
 * Nose-left a card presents its WIDTH along the station axis, and `STATION_CARD_WIDTH` IS
 * `12 * FIXED_SCALE - CARD_GUTTER` — the same numerator and denominator, so this resolves to
 * EXACTLY 1: horizontal is already saturated and provably cannot change, not merely unchanged by
 * convention. Nose-up a rotated card presents its HEIGHT along the station axis instead
 * (`STATION_CARD_HEIGHT`), so the ceiling is `82 / 35` ≈ 2.11 — the vertical rail has been
 * carrying more than twice the headroom it uses. `Math.max(1, ...)` so a ceiling can never fall
 * below the unpinned size.
 */
export function maxCardPinScale(orientation: RockerViewOrientation): number {
  const pitch = 12 * FIXED_SCALE - CARD_GUTTER;
  const extent = orientation === "horizontal" ? STATION_CARD_WIDTH : STATION_CARD_HEIGHT;
  return Math.max(1, pitch / extent);
}

/** Clamps `value` into `[min, max]`, treating a non-finite `value` as `min` — the same fallback
 * posture `resolveEffectiveLengthIn` gives a corrupt `lengthIn` (threat T-03J-01), generalised so
 * `cardPinScale` and `rockerViewLayout`'s own `appliedScale` share one guard. */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * The card-pin scale that lands the card's own value row on `targetValuePx` CSS pixels under the
 * viewer's live `fitScale` (quick task 260830-03j) — the rocker editor's own counterpart to
 * `callout-primitives.tsx`'s `pinnedCalloutSizes`. Returns 1 (unpinned) for a non-finite or
 * non-positive `fitScale`/`targetValuePx` — a corrupt or not-yet-measured fit must never produce a
 * `NaN` card (threat T-03J-01) — and otherwise clamps the wanted scale into
 * `[1, maxCardPinScale(orientation)]`: never below the unpinned size, and never past the point
 * where a card would touch its neighbour.
 */
export function cardPinScale(fitScale: number, targetValuePx: number, orientation: RockerViewOrientation): number {
  if (!Number.isFinite(fitScale) || fitScale <= 0 || !Number.isFinite(targetValuePx) || targetValuePx <= 0) {
    return 1;
  }
  const wanted = targetValuePx / (STATION_VALUE_SIZE * fitScale);
  return clamp(wanted, 1, maxCardPinScale(orientation));
}

/**
 * A corrupt saved board must not blank the screen (threat T-TMJ-02): a zero, negative or
 * non-finite length falls back to `BOARD_LENGTH_RANGE_IN.max` (the same board `FIXED_SCALE`
 * itself is derived from) rather than propagating a `NaN`; any finite positive length is clamped
 * into `BOARD_LENGTH_RANGE_IN` first, so a value outside the app's own slider range still
 * produces a sane frame. Shared by `scale` and the vertical frame's own long-axis span below, so
 * the two never disagree about how long the drawn board actually is.
 */
function resolveEffectiveLengthIn(lengthIn: number): number {
  if (!Number.isFinite(lengthIn) || lengthIn <= 0) return BOARD_LENGTH_RANGE_IN.max;
  return Math.min(Math.max(lengthIn, BOARD_LENGTH_RANGE_IN.min), BOARD_LENGTH_RANGE_IN.max);
}

/**
 * The fit-to-board scale rule, mirroring `outlineViewMetrics`'s `lengthFitScale`
 * (`components/outline/outline-viewer.tsx`): every board's nose-to-tail spans the full
 * `VIEW_W - 2 * PAD_X` (820-unit) drawing area, instead of every board sharing one scale derived
 * from the longest board this app can produce.
 */
function resolveScale(lengthIn: number, fitToBoard: boolean): number {
  if (!fitToBoard) return FIXED_SCALE;
  return (VIEW_W - PAD_X * 2) / resolveEffectiveLengthIn(lengthIn);
}

/**
 * The rocker drawing's scale and frame, for a given board and orientation — the single source
 * `rocker-viewer.tsx` reads `pxX`, `pxY` and `toBoardPoint`'s inverse from, so a drag can never
 * solve against a different scale than the drawing was made with (planner finding 9).
 *
 * The horizontal frame is built from its own formulas. The vertical frame is built from its own
 * rotated content — both rails' own outer edges on the cross axis, the label's own band to the
 * tail card's far edge on the long axis — rather than a transposition of the horizontal frame,
 * the defect quick task 260825-w8d fixed on the outline viewer. Compact ignores the `orientation`
 * argument entirely (`RockerStationRails`'s own contract) and always takes the horizontal-frame
 * path — every branch below that would otherwise read `horizontal` reads `effectiveHorizontal`
 * instead, so a `"compact"` layout is identical whichever orientation the caller happens to pass.
 */
export function rockerViewLayout({
  lengthIn,
  maxDeckIn,
  orientation,
  fitToBoard,
  stationRails,
  cardScale = 1,
}: RockerViewLayoutInput): RockerViewLayout {
  const scale = resolveScale(lengthIn, fitToBoard);
  const horizontal = orientation === "horizontal";
  const showStationCards = stationRails === "full";
  const effectiveHorizontal = horizontal || stationRails === "compact";

  // The applied card-pin scale, resolved once — 1 (unpinned) whenever this call does not draw
  // cards at all, so the pin is provably unreachable from the compact/none paths regardless of
  // what the caller passes (quick task 260830-03j). `pinCeiling` is keyed off `effectiveHorizontal`,
  // not the raw `orientation` argument: `"compact"` mode's own contract (`RockerStationRails`'s
  // header comment) is that it is identical whichever orientation the caller passes, and
  // `maxCardWidth`/`maxCardHeight` below (also read by the rail-title anchors, quick task
  // 260830-2dy) would otherwise leak the raw argument into a mode that must ignore it entirely.
  // For `"full"`/`"none"`, `effectiveHorizontal` already equals `horizontal`, so this resolves to
  // exactly `maxCardPinScale(orientation)` there — no behaviour change on either of those paths.
  const pinCeiling = maxCardPinScale(effectiveHorizontal ? "horizontal" : orientation);
  const appliedScale = showStationCards ? clamp(cardScale, 1, pinCeiling) : 1;
  const cardWidth = STATION_CARD_WIDTH * appliedScale;
  const cardHeight = STATION_CARD_HEIGHT * appliedScale;
  // The frame's own reserve, at the CEILING, never at `appliedScale` — see the header note above
  // `cardBandDepth` (a mirror of `outline-viewer.tsx`'s `MAX_CALLOUT_SIZES`, threat T-03J-02):
  // sizing the frame from the live card scale would close the frame -> fit scale -> card size ->
  // frame loop, so every frame extent below is derived from these instead of `cardWidth`/`cardHeight`.
  const maxCardWidth = STATION_CARD_WIDTH * pinCeiling;
  const maxCardHeight = STATION_CARD_HEIGHT * pinCeiling;

  // Bands and baseline, symmetric about the board. A band is reserved on EITHER side only when a
  // mode actually draws into it: "full" reserves the card-rail band, "compact" reserves its own
  // bare-value bands (sized for 9pt printed type — this plan's `<design_decision>` section 5),
  // "none" reserves only a hairline of pad.
  let deckTopY: number;
  let baselineY: number;
  let viewH: number;
  if (stationRails === "compact") {
    deckTopY = COMPACT_DECK_BAND;
    baselineY = deckTopY + maxDeckIn * scale;
    viewH = baselineY + COMPACT_BOTTOM_BAND;
  } else {
    const topPad = showStationCards ? railLabelBandDepth(orientation) : BARE_PAD;
    const band = showStationCards ? cardBandDepth(orientation) : 0;
    deckTopY = topPad + band;
    baselineY = deckTopY + maxDeckIn * scale;
    viewH =
      baselineY +
      (showStationCards ? bottomCardBandDepth(orientation) + railLabelBandDepth(orientation) : BARE_PAD);
  }

  // Bottom (rocker) rail — its own, larger gap (see `BOTTOM_RAIL_GAP`): this rail measures from
  // the baseline the board's bottom curve actually touches, not from the worst-case line the deck
  // rail clears.
  const tickEndY = baselineY + BOTTOM_RAIL_GAP;
  const railY = effectiveHorizontal ? tickEndY : tickEndY + cardWidth / 2;

  // Deck (thickness) rail — the mirror of the bottom rail on the board's other side.
  const deckTickEndY = deckTopY - RAIL_GAP;
  const deckRailY = effectiveHorizontal ? deckTickEndY - cardHeight : deckTickEndY - cardWidth / 2;

  // Centres each card on the station it names (planner_assumptions #4), shared by both rails.
  const cardDy = effectiveHorizontal ? 0 : -cardHeight / 2;

  // The compact rails' own two row anchors — populated in every mode so the field is never
  // `NaN`; outside compact it is unused and the card fields above carry the drawing.
  const deckTextY = deckTopY - COMPACT_CURVE_GAP;
  const bottomTextY = baselineY + COMPACT_CURVE_GAP + COMPACT_CAP;
  const compactRows: RockerCompactRows = {
    deck: { textY: deckTextY, leaderStartY: deckTextY + 2, kneeY: deckTopY - 2 },
    bottom: {
      textY: bottomTextY,
      leaderStartY: bottomTextY - COMPACT_CAP - 2,
      kneeY: baselineY + 2,
    },
  };

  const boardSpan = resolveEffectiveLengthIn(lengthIn) * scale;

  // Rail titles' own anchors (quick task 260830-2dy, reworked nose-up by 260830-31h) — see this
  // plan's `<design_decision>` sections 2-3 (2dy) and 1-2 (31h). Computed in every mode so none
  // can ever be `NaN`; a title is only actually drawn when `stationRails === "full"`.
  const railLabelSize = RAIL_LABEL_SIZE * appliedScale;
  let deckLabelY: number;
  let bottomLabelY: number;
  let labelStationX: number;
  if (effectiveHorizontal) {
    // Nose-left the title genuinely stacks outboard of the rail's own CEILING-sized far edge
    // (`maxCardHeight`), not the live one, so its position is frame-invariant: it never walks when
    // the card-pin scale changes. Unchanged from 260830-2dy, byte for byte.
    const deckRailFarY = deckTickEndY - maxCardHeight;
    deckLabelY = deckRailFarY - RAIL_LABEL_GAP;
    const bottomRailFarY = tickEndY + maxCardHeight;
    bottomLabelY = bottomRailFarY + RAIL_LABEL_GAP + railLabelSize * RAIL_LABEL_CAP_RATIO;
    labelStationX = PAD_X + boardSpan / 2;
  } else {
    // Nose-up the title heads its own rail's Center card directly, so its cross-axis anchor IS
    // that rail's own LIVE anchor (`deckRailY`/`railY`, quick task 260830-31h, `<design_decision>`
    // section 1) — it tracks the cards it heads instead of drifting off-centre from the column it
    // names whenever the live pin is under the ceiling. A deliberate departure from the ceiling
    // anchoring the horizontal arm above keeps: the FRAME itself still reads only ceiling values
    // (nothing in `minX`/`minY`/`width`/`height` reads these two fields), so containment is proved
    // separately, at the ceiling, in `rocker-view-frame.test.ts`'s run-containment suite — the
    // worst case for every term below.
    deckLabelY = deckRailY;
    bottomLabelY = railY;
    // Back off the middle station by the Center card's own half-height (its extent along the
    // rotated station axis) and a gap in EMs (`RAIL_LABEL_STATION_GAP_EM`) — nose is up, so
    // subtracting moves the word up the screen, clear of the card it heads.
    labelStationX = PAD_X + boardSpan / 2 - cardHeight / 2 - railLabelSize * RAIL_LABEL_STATION_GAP_EM;
  }

  let minX: number;
  let minY: number;
  let width: number;
  let height: number;

  if (effectiveHorizontal) {
    minX = 0;
    minY = 0;
    width = VIEW_W;
    height = viewH;
  } else {
    // Cross axis (rotated "width"): from the bottom rail's own outer edge to the deck rail's own
    // outer edge — both rails now, rather than only the bottom one. Measured from the tick ends at
    // the CEILING-sized `maxCardWidth`, not the live rail anchors, so this reserve never depends
    // on `appliedScale` (quick task 260830-03j; algebraically today's expressions when the ceiling
    // is 1). Without cards there is no rail to clear, so the cross axis falls back to the board's
    // own worst-case box plus a hairline of pad on each side. (Compact never reaches this branch —
    // `effectiveHorizontal` is always true there.)
    // Each rail title's own band sits OUTSIDE the card-rail band, on the far side from the board
    // (quick task 260830-2dy) — the same `railLabelBandDepth` the horizontal frame's `topPad`/
    // `viewH` use, added after the existing `+ maxCardWidth + CARD_GUTTER` term.
    const crossFar = showStationCards
      ? tickEndY + maxCardWidth + CARD_GUTTER + railLabelBandDepth(orientation)
      : baselineY + BARE_PAD;
    const crossNear = showStationCards
      ? deckTickEndY - maxCardWidth - CARD_GUTTER - railLabelBandDepth(orientation)
      : deckTopY - BARE_PAD;
    minX = -crossFar;
    width = crossFar - crossNear;

    // Long axis (rotated "height"): from the nose card's own far edge to the tail card's own far
    // edge, mirrored off the same `PAD_X`/`maxCardHeight` terms — ceiling-sized, not `cardHeight`,
    // for the same frame-invariance reason as the cross axis above. The old (now-removed)
    // board-length label's own long-axis reserve is gone with it (this plan's `<design_decision>`
    // section 1) — the rail titles reserve on the CROSS axis instead, above.
    if (showStationCards) {
      minY = PAD_X - maxCardHeight / 2 - 4;
      const maxY = PAD_X + boardSpan + maxCardHeight / 2 + 4;
      height = maxY - minY;
    } else {
      minY = PAD_X - BARE_PAD;
      const maxY = PAD_X + boardSpan + BARE_PAD;
      height = maxY - minY;
    }
  }

  // The card's own type stack, scaled by the same `appliedScale` that scaled the card box — one
  // scalar moves both, so the text can never escape its own card frame (quick task 260830-03j).
  const cardType: RockerCardType = {
    nameSize: STATION_NAME_SIZE * appliedScale,
    valueSize: STATION_VALUE_SIZE * appliedScale,
    cardNameDy: CARD_NAME_DY * appliedScale,
    cardValueDy: CARD_VALUE_DY * appliedScale,
    readoutValueDy: READOUT_VALUE_DY * appliedScale,
    readoutNameDy: READOUT_NAME_DY * appliedScale,
  };

  const viewBox = `${minX.toFixed(2)} ${minY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;

  return {
    scale,
    viewH,
    baselineY,
    tickEndY,
    railY,
    deckTickEndY,
    deckRailY,
    cardDy,
    cardWidth,
    cardHeight,
    cardScale: appliedScale,
    cardType,
    compactRows,
    railLabelSize,
    deckLabelY,
    bottomLabelY,
    labelStationX,
    minX,
    minY,
    width,
    height,
    viewBox,
  };
}

/** Per-character em-advance table for the bold body face this drawing's readings are set in — an
 * advance ESTIMATE for sizing decisions, not a text-metrics engine. `compactRailReadingXs`'s own
 * separation sweep is what actually protects the layout from a mis-estimated width; this table
 * only has to be close enough to size the sweep's inputs sensibly. */
const COMPACT_CHAR_ADVANCE: Record<string, number> = {
  " ": 0.3,
  '"': 0.35,
  "/": 0.42,
  "-": 0.4,
};
/** Advance for every character not in the table above — the digits, this face's widest glyphs at
 * this weight. */
const COMPACT_DEFAULT_CHAR_ADVANCE = 0.6;

/** The printed width of a formatted inch string (e.g. `2 15/16"`) at `size` user units, from the
 * per-character advance table above. */
export function compactValueWidth(text: string, size: number = COMPACT_VALUE_SIZE): number {
  let advance = 0;
  for (const ch of text) {
    advance += COMPACT_CHAR_ADVANCE[ch] ?? COMPACT_DEFAULT_CHAR_ADVANCE;
  }
  return advance * size;
}

export interface CompactReadingInput {
  /** The reading's natural (station) centre x, in the frame's own canonical coordinates. */
  stationX: number;
  /** The reading's printed width, from `compactValueWidth`. */
  width: number;
}

/**
 * The text centre x for each reading on ONE compact row, given the readings in ascending
 * `stationX` order (the nose-left projection puts the nose at the frame's left, so ascending x
 * runs nose to tail).
 *
 * Three passes: left-to-right, pushing each reading right until it clears its predecessor by
 * `COMPACT_READING_GUTTER`; then right-to-left, pulling readings left so the last one's right edge
 * lands inside the frame's own edge gutter and each still clears its successor; then a final clamp
 * of the first reading's left edge to the frame's own edge gutter. When nothing collides this
 * returns the station centres untouched.
 *
 * An over-subscribed row (more readings than the row can hold at their natural width) distributes
 * its shortfall — the leaders dogleg back to their own station — rather than letting two numbers
 * print on top of each other. That is what makes a tip reading at the frame's own edge safe: `PAD_X`
 * is 40 units and a tip value can be 48 units wide, and this sweep is what keeps its box inside the
 * frame regardless of exactly how wide the estimate above says it is.
 */
export function compactRailReadingXs(layout: RockerViewLayout, readings: CompactReadingInput[]): number[] {
  const n = readings.length;
  if (n === 0) return [];
  const centers = readings.map((r) => r.stationX);

  // Pass 1: left to right — push each reading right until it clears its predecessor.
  for (let i = 1; i < n; i++) {
    const minCenter =
      centers[i - 1] + readings[i - 1].width / 2 + COMPACT_READING_GUTTER + readings[i].width / 2;
    if (centers[i] < minCenter) centers[i] = minCenter;
  }

  // Pass 2: right to left — pull left so the last reading's right edge lands inside the frame's
  // own edge gutter, and each reading still clears its successor.
  const maxRightEdge = layout.minX + layout.width - COMPACT_EDGE_GUTTER;
  const lastRightEdge = centers[n - 1] + readings[n - 1].width / 2;
  if (lastRightEdge > maxRightEdge) {
    centers[n - 1] = maxRightEdge - readings[n - 1].width / 2;
  }
  for (let i = n - 2; i >= 0; i--) {
    const maxCenter =
      centers[i + 1] - readings[i + 1].width / 2 - COMPACT_READING_GUTTER - readings[i].width / 2;
    if (centers[i] > maxCenter) centers[i] = maxCenter;
  }

  // Pass 3: clamp the first reading's own left edge to the frame's own edge gutter.
  const minLeftEdge = layout.minX + COMPACT_EDGE_GUTTER;
  const firstLeftEdge = centers[0] - readings[0].width / 2;
  if (firstLeftEdge < minLeftEdge) {
    centers[0] = minLeftEdge + readings[0].width / 2;
  }

  return centers;
}

/**
 * The Summary order form's own ROCKER box, in printed CSS px at 96px/in — derived, not measured,
 * from the sheet's own chain (`order-form.tsx`, `use-print-fit.ts`, `order-form.css`,
 * `order-form-primitives.tsx`'s `FormBox`). This is the one place that derivation is recorded;
 * anyone changing the sheet's column geometry, band percentages or this box's own flex share has
 * to update it here.
 *
 * Width: printable page width `min(8.5in Letter, 8.27in A4) - 2 * 8mm @page margin` = 7.640in =
 * 733.4px; less the sheet's own 1.5px border + `p-1.5` (6px) on both sides = 718.4px; less band
 * 2's `--order-form-spine` (24px) + `--order-form-gap` (4px) = 690.4px; the drawings row gives
 * `--order-form-left` (0.32) to the rail plots (220.9px) plus a 4px gap, leaving the right column
 * 465.5px; less the `FormBox`'s own 2px border and its body's `px-1.5` (12px) = 451.5px.
 *
 * Height: printable page height `10.370in x 0.995 FIT_SAFETY` = 990.5px; less the sheet inset
 * (15px) = 975.5px; less the header band (12%, 117.1px), the glassing band (11%, 107.3px), the
 * page mark (~17px) and three 4px gaps = drawings row 722.1px; less the dims strip (7.4%, 53.4px)
 * and a 4px gap = 664.7px; `.order-form-rocker` is 18% of the right column = 119.6px; less the
 * `FormBox`'s own 2px border, its ~21px caption row and its body's `py-1` (8px) = 88.6px.
 *
 * These are derived, not measured — the executor cannot run `npm run dev` inside a worktree. An
 * error in the taller direction only keeps the frame width-bound, i.e. only keeps the type at its
 * 9pt target — the safe direction to be wrong in. The founder's post-merge print check is the real
 * verification of this number; see this plan's `<post_merge_check>`.
 */
export const ORDER_FORM_ROCKER_BOX_PX = { width: 451.5, height: 88.6 } as const;

export interface RenderedBoxPx {
  width: number;
  height: number;
}

/** The px-per-user-unit a `preserveAspectRatio="xMidYMid meet"` fit applies when this layout's
 * frame is rendered into `box` — the smaller of the two axis ratios, since the SVG scales
 * uniformly on both axes (one `scale` field, the same straightedge rule `RockerViewLayout.scale`
 * itself protects). */
export function renderedUnitPx(layout: RockerViewLayout, box: RenderedBoxPx = ORDER_FORM_ROCKER_BOX_PX): number {
  return Math.min(box.width / layout.width, box.height / layout.height);
}

/** A compact reading's printed type size, in CSS px, when this layout's frame renders into `box` —
 * `compactValuePrintPx(layout) >= 11.9` is this module's own pin on the 9pt target; `>= 10.67` is
 * the 8pt floor. See this plan's `<design_decision>` section 5 for the board-length/deck-envelope
 * table this holds across. */
export function compactValuePrintPx(layout: RockerViewLayout, box: RenderedBoxPx = ORDER_FORM_ROCKER_BOX_PX): number {
  return COMPACT_VALUE_SIZE * renderedUnitPx(layout, box);
}

export interface StationCardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A station card's rect, in the frame's own coordinate space, on the given rail (`side`).
 *
 * In horizontal that is `{ x: stationX - cardWidth / 2, y: rail }` — a card straddles its
 * station and sits at its own rail's anchor. `stationX` is the station's own already-projected x
 * (the canonical `pxX(stationIn)` the caller computed with this SAME layout's `scale`).
 *
 * In vertical, apply the `Upright` composition identity (planner finding 4): the content group
 * carries `rotate(90)`, so a rect drawn at canonical `(x_s - W/2, rail)` with size `W x H` lands,
 * in the rotated frame, at `x` in `[-rail - W/2, -rail + W/2]`, `y` in `[x_s, x_s + H]` — the
 * card's WIDTH now lies across the rail. `cardDy` (0 in horizontal, `-cardHeight / 2` in
 * vertical) shifts the card along the rotated station axis, which is how it gets centred on the
 * station it names.
 */
export function stationCardRect(
  layout: RockerViewLayout,
  stationX: number,
  orientation: RockerViewOrientation,
  side: RockerCardSide,
): StationCardRect {
  const rail = side === "deck" ? layout.deckRailY : layout.railY;
  if (orientation === "horizontal") {
    return {
      x: stationX - layout.cardWidth / 2,
      y: rail,
      width: layout.cardWidth,
      height: layout.cardHeight,
    };
  }
  return {
    x: -rail - layout.cardWidth / 2,
    y: stationX + layout.cardDy,
    width: layout.cardWidth,
    height: layout.cardHeight,
  };
}
