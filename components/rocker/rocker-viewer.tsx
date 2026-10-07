"use client";

/**
 * Rocker/foil side-profile viewer — a read-only drawing of ONE side profile (Phase 11).
 *
 * The drawing builds no curve of its own. It is handed the board's side profile
 * (`BoardSideProfile`, `lib/geometry/board-profile.ts`) and draws exactly that: the bottom is the
 * profile's rocker, the deck is its rocker plus its thickness (`deckAt`, R10), both sampled at
 * `SAMPLES` points along the board. How densely a curve is sampled is a drawing parameter only
 * (R15) — a curve that looks faceted gets more samples here, never a different interpolation.
 *
 * Drawn horizontal, nose on the LEFT by default (D-03) — this screen's own default, unlike the
 * outline viewer's vertical default. All SVG geometry comes from numbers computed in
 * `lib/geometry`, written into JSX attributes; never string-built markup, and never raw HTML
 * injection (threat T-QO-01, same posture as `outline-viewer.tsx`). The blank's vendor and name
 * reach this component only as the drawing's accessible name, a plain React attribute value
 * (threat T-11-21).
 *
 * The board draws as one closed, solid shape — deck-over-bottom construction (D-01): the bottom
 * curve and the deck curve, closed at both tips so the two read as a single board silhouette.
 *
 * The blank (D-15): when the ROCKER editor also hands this component the board's blank
 * (`blank`, a `BlankSideView`), the blank's own side silhouette draws BEHIND the board — filled
 * with the faint `--outline-foam-shade` wash and outlined with a solid 1px `--outline-blank-line`
 * (solid because the blank is a real object; dashes mean reference lines in this app). The board's
 * own fill is opaque, so the only shade left visible is the foam to come off (Phase 12): the deck
 * skin above the board, the gap below it (the foam planed off the bottom, which widens toward a tip
 * lifted under Pin deck, as the deck band does toward a tip thinned under Bottom), and the blank's
 * leftover past each tip. Both bands are the same shade on purpose — they sit on opposite sides of
 * the board's own outline, so they can never be confused. The frame then fits the whole blank rather than the board alone
 * (`rocker-view-frame.ts`'s `blankSpanIn` / `boardOffsetX`), so the board draws slightly smaller
 * inside it; the rails, cards and titles stay on the board's own five stations. One other thing is
 * added for a blank (Phase 14 D-12): in the `"full"` grammar, a short dashed line across the board
 * where each tip's thinning starts (`blank.tips.<end>.station`), in the blank's line colour, with no
 * text — the drawing's accessible name says the two distances in words. Nothing more: a thickness
 * failure shows as the board poking through the blank's line, width failures are not drawn at all,
 * and no warning colour appears here. The Summary order form never passes a blank, so its compact
 * box draws the board alone, with no thinning mark, as before.
 *
 * Nothing on the drawing is draggable any more (D-14). The three-knot Bezier that the old tip
 * handles, construction lines and drag readout card used to steer is no longer a live rocker, so
 * all of that retired with it; shaping happens in the sidebar. What the toolbar's
 * measuring-points toggle shows instead (`showMeasuringPoints`) is plain dots: the board's five
 * stations on its bottom and its deck and, with a blank, every station the catalogue measured on
 * the blank's own bottom and deck.
 *
 * Drafting grammar, per `.planning/sketches/MANIFEST.md` and quick task 260829-uue: each
 * station's read-outs split across TWO rails, one on each side of the board — a rocker rail below
 * the baseline (the bottom curve it measures) and a thickness rail above the deck curve (the deck
 * it measures) — drawn in the TEMPLATE screen's own two-part grammar (`callout-primitives.tsx`):
 * a filled card (`CalloutChipFrame`) for a figure the shaper sets, and a plain reading — no card,
 * a 45-degree `DimensionTick` on the curve instead — for a figure computed for them. Which is
 * which depends on whether the board sits in a blank (UI-SPEC section 9):
 *
 * - No blank: the four rocker figures (both tips, both 12" stations) are cards — the shaper types
 *   all four — and all five thickness figures are cards.
 * - In a blank: all four rocker figures are readings (the blank decides them), the Center, Nose Tip
 *   and Tail Tip thickness are cards (the shaper sets them) and the two 12" thicknesses are
 *   readings (the blank derives them, whatever the fine-tune).
 *
 * The Center rocker is always a muted em-dash reading: it is the rocker's own zero reference, not
 * a measurement. Every read-out, either kind, is leadered from its own rail to the exact point on
 * the curve it measures. That is the `"full"` grammar (`callouts="full"`, the default).
 *
 * Each rail also carries its own title (quick task 260830-2dy, words in `RAIL_LABEL_TEXTS`):
 * `Thickness` for the deck rail, `Rocker` for the bottom one — the same two words the sidebar's
 * collapsible sections (`rocker-controls.tsx`) and the DATASHEET's row groups
 * (`rocker-datasheet.tsx`) already use, so the drawing never needs a third vocabulary. Nose-left a
 * title sits centred OUTSIDE its own rail (founder-approved); nose-up it sits directly ABOVE its
 * own rail's Center card instead, centred on that card's own column, because a word turned upright
 * on screen presents its full WIDTH across the rail rather than its height, and only the card's own
 * column has room to spare for that (quick task 260830-31h). Every position, size and band a title
 * needs is decided in `rocker-view-frame.ts` (`railLabelSize`/`deckLabelY`/`bottomLabelY`/
 * `labelStationX`); `RailTitle` below supplies only the words and the paint, `"full"` grammar only.
 *
 * A third grammar, `"compact"` (quick task 260829-vus), is the Summary order form's own: the box
 * it prints into is 0.92in tall, far too short for a card's own two-row stack at a printed 9pt, so
 * every reading there is a bare value instead — no card surface, no station name. Which figure is
 * which is carried by position (five stations along the board) and by side (deck = thickness,
 * bottom = rocker) instead of a name row, reinforced by the order form's own caption on the box.
 * `rocker-view-frame.ts`'s `compactRows`/`compactRailReadingXs`/`compactValuePrintPx` decide every
 * band depth, row baseline, type size and reading x position this grammar needs; this component
 * derives none of them (Rule 1).
 *
 * Orientation (D-03): the toolbar's rotate-in-place button flips this viewer between "horizontal"
 * (the default, nose left) and "vertical" (nose up, so the five stations read top-to-bottom the
 * way a blank datasheet's columns do) — the OPPOSITE of the Template viewer's own default. Every
 * physical element (the baseline, the blank and board silhouettes, the station tick lines) is
 * drawn once in the canonical horizontal coordinate space and lives inside one rotated `<g>`, per
 * the technique quick task 260825-vot proved on the outline viewer — no projector call site is
 * ever duplicated for the second orientation. Only the label TEXT counter-rotates (`Upright`
 * below), so it always reads upright on screen regardless of which way the board is turned.
 */

import { type ReactNode, useRef } from "react";
import {
  CALLOUT_PX,
  CalloutChipFrame,
  DimensionTick,
  useSvgFitScale,
  type ViewerOrientation,
} from "@/components/viewer/callout-primitives";
import { useUnits } from "@/components/units-provider";
import { thinningMarksSentence } from "@/lib/geometry/blank-reasons";
import type { BlankSideView, BoardSideProfile } from "@/lib/geometry/board-profile";
import { FOIL_THICKNESS_RANGE_IN, type FoilStationKey } from "@/lib/geometry/foil";
import { formatMark, stationLabel } from "@/lib/geometry/measure-display";
import { ROCKER_LIFT_RANGE_IN } from "@/lib/geometry/rocker";
import { mm, type Mm, mmToInches } from "@/lib/geometry/units";
import {
  BLANK_LINE_PX,
  cardPinScale,
  COMPACT_BASELINE_DASH,
  COMPACT_BASELINE_WIDTH,
  COMPACT_LEADER_WIDTH,
  COMPACT_TICK_SIZE,
  COMPACT_VALUE_SIZE,
  compactRailReadingXs,
  compactValueWidth,
  KNOT_DOT_PX,
  PAD_X,
  RAIL_LABEL_TEXTS,
  THINNING_MARK_DASH,
  THINNING_MARK_OVERSHOOT,
  type RockerCardType,
  type RockerCompactRow,
  type RockerViewLayoutInput,
  rockerViewLayout,
} from "./rocker-view-frame";

/** Board sampling density — enough to read as smooth at this frame's scale, well past the five
 * stations the profile's curves are built through. A drawing parameter only (R15). */
const SAMPLES = 60;
/** Blank silhouette sampling density, along the blank's own length — denser than the board's
 * because the blank is longer and its catalogue curve carries more stations. A drawing parameter
 * only (R15): raising it never changes how the blank's curves are interpolated. */
const BLANK_SAMPLES = 120;

export interface RockerViewerProps {
  /**
   * The board's one side profile (`lib/geometry/board-profile.ts`, Pattern 5) — the drawing's only
   * source for the board's shape and for every number on its rails. The drawing never builds a
   * curve of its own.
   */
  profile: BoardSideProfile;
  /**
   * The blank the board sits in, drawn behind it with the foam to come off shaded (D-15). Only the
   * ROCKER editor passes this; the Summary order form never does, so its compact box keeps
   * drawing the board alone. Omitted, the drawing is the board on its dashed baseline with
   * nothing behind it — no empty-blank outline, no placeholder, no prompt.
   */
  blank?: BlankSideView;
  /**
   * Which rail grammar this viewer draws (04-05 Task 2, widened to a third mode by quick task
   * 260829-vus) — mirrors `RockerStationRails` in `rocker-view-frame.ts`, passed straight through
   * as that module's own `stationRails`. `"full"` (the default) draws the two card rails
   * `rocker-editor.tsx` uses. `"none"` suppresses both rails, their tick lines and the
   * board-length label, leaving only the closed board shape and baseline — mirrors
   * `outline-viewer.tsx`'s `hideCallouts`. `"compact"` draws the Summary order form's own
   * bare-value rails instead: five thickness readings above the board, four rocker readings
   * below, no card surface and no station name.
   *
   * This prop also decides whether the layout module reserves a band on either side of the board
   * at all (`stationRails`, quick task 260829-uue) — a consumer that never draws a rail is not
   * paying for the band that rail would need.
   */
  callouts?: "full" | "compact" | "none";
  /** D-03: `"horizontal"` (nose left, the default) or `"vertical"` (nose up, stations read
   * top-to-bottom). Driven by the toolbar's rotate button, never persisted. */
  orientation?: ViewerOrientation;
  /** Draws the measuring points when true: the board's five stations as plain dots on its bottom
   * and its deck, and, with a blank, every station the catalogue measured as dots on the blank's
   * own bottom and deck. Nothing in it is draggable. Defaults to `false`. */
  showMeasuringPoints?: boolean;
  /**
   * The frame's scale rule (`rocker-view-frame.ts`'s `RockerViewLayoutInput.fitToBoard`): `true`
   * scales every board's own length (or, with a blank, the blank's) to fill the drawing's long
   * axis, so a short board no longer draws small with blank space beside it. Defaults to `false`,
   * which keeps the fixed range-derived frame every board has always shared. A per-consumer choice,
   * not an editor-only one (quick task 260829-uue) — `components/rocker/rocker-editor.tsx` passes
   * `true` so a shaper's own board fills the editor panel, and `components/summary/order-form.tsx`
   * opts in too, for the same reason on the printed sheet: its own frame carries no card rail to
   * size around (`callouts="compact"` is already set there), so nothing about the print path's
   * stability depends on this staying fixed the way `outline-viewer.tsx`'s `fixedFrame` still does.
   */
  fitToBoard?: boolean;
  /**
   * Paints the board silhouette with the usual `--outline-board-fill` wash when `true` (the
   * default, every editor view). The Summary order form passes `false` so its printed profile is
   * an outline-only drawing — the sheet's boxes are ink-frugal by standing decision (260826-lg8),
   * and an unfilled profile keeps the compact readings' leaders legible against paper.
   */
  boardFill?: boolean;
}

/**
 * Wraps callout text so it reads screen-upright even when the content group is rotated, without
 * needing per-call rotation math. Mirrors `callout-primitives.tsx`'s `UprightAt` — see that
 * component's comment for the full linear-algebra argument (a child rotated by the NEGATIVE of
 * the parent's rotation, about the same anchor, composes to a pure translation). This viewer's
 * parent rotates `rotate(90)` for vertical (rather than the outline viewer's `rotate(-90)` for
 * horizontal), so the child here undoes it with `rotate(-90 x y)`.
 */
function Upright({
  x,
  y,
  vertical,
  children,
}: {
  x: number;
  y: number;
  vertical: boolean;
  children: ReactNode;
}) {
  if (!vertical) return <>{children}</>;
  return <g transform={`rotate(-90 ${x.toFixed(2)} ${y.toFixed(2)})`}>{children}</g>;
}

/**
 * A named input card, mirroring the TEMPLATE screen's own `CalloutChip` (finding 8): a bordered
 * box on `CalloutChipFrame` holding the station name over its value, leadered — no tick, which is
 * how the template's own grammar marks an input's leader — from the rail's near edge to the exact
 * point on the curve it measures.
 */
function StationCard({
  x,
  rail,
  tickEnd,
  curveY,
  cardDy,
  cardWidth,
  cardHeight,
  vertical,
  name,
  value,
  type,
  valueColor = "var(--outline-ink)",
}: {
  x: number;
  rail: number;
  tickEnd: number;
  curveY: number;
  cardDy: number;
  cardWidth: number;
  cardHeight: number;
  vertical: boolean;
  name: string;
  value: string;
  /** The card's own type stack, scaled by `cardScale` together with the card box — the layout
   * module's own field, so this component derives no arithmetic of its own (Rule 1). */
  type: RockerCardType;
  valueColor?: string;
}) {
  const cardX = x - cardWidth / 2;
  return (
    <g>
      <line x1={x} y1={tickEnd} x2={x} y2={curveY} stroke="var(--outline-station-line)" strokeWidth={1} />
      <Upright x={x} y={rail} vertical={vertical}>
        {/* `cardDy` (0 in horizontal, a no-op) shifts the card along the rotated station axis in
            vertical, centring it on the station it names — the outer composition is a pure
            translation (finding 4), so this inner `translate(0, dy)` lands exactly there. */}
        <g transform={`translate(0, ${cardDy.toFixed(2)})`}>
          <CalloutChipFrame x={cardX} y={rail} width={cardWidth} height={cardHeight} />
          <text
            x={x}
            y={rail + type.cardNameDy}
            textAnchor="middle"
            style={{ fontSize: type.nameSize, fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: "0.08em" }}
            fill="var(--outline-callout-label)"
          >
            {name}
          </text>
          <text
            x={x}
            y={rail + type.cardValueDy}
            textAnchor="middle"
            style={{ fontSize: type.valueSize, fontWeight: 700, fontFamily: "var(--font-body)" }}
            fill={valueColor}
          >
            {value}
          </text>
        </g>
      </Upright>
    </g>
  );
}

/**
 * A derived reading, mirroring the TEMPLATE screen's own `OutputRail` (finding 8): no card
 * surface at all — a leader to the measured point, a 45-degree `DimensionTick` there, then the
 * value over the station name, the reverse of a card's own stacking. Rides the same rail anchor
 * and the same card-sized band a `StationCard` would, so the two line up along one rail and a
 * card's own containment proof carries this one with it.
 */
function StationReadout({
  x,
  rail,
  tickEnd,
  curveY,
  cardDy,
  vertical,
  name,
  value,
  type,
  valueColor = "var(--outline-ink)",
}: {
  x: number;
  rail: number;
  tickEnd: number;
  curveY: number;
  cardDy: number;
  vertical: boolean;
  name: string;
  value: string;
  /** The card's own type stack, scaled by `cardScale` together with the card box — the layout
   * module's own field, so this component derives no arithmetic of its own (Rule 1). */
  type: RockerCardType;
  valueColor?: string;
}) {
  return (
    <g>
      <line x1={x} y1={tickEnd} x2={x} y2={curveY} stroke="var(--outline-station-line)" strokeWidth={1} />
      <DimensionTick x={x} y={curveY} />
      <Upright x={x} y={rail} vertical={vertical}>
        <g transform={`translate(0, ${cardDy.toFixed(2)})`}>
          <text
            x={x}
            y={rail + type.readoutValueDy}
            textAnchor="middle"
            style={{ fontSize: type.valueSize, fontWeight: 700, fontFamily: "var(--font-body)" }}
            fill={valueColor}
          >
            {value}
          </text>
          <text
            x={x}
            y={rail + type.readoutNameDy}
            textAnchor="middle"
            style={{ fontSize: type.nameSize, fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: "0.08em" }}
            fill="var(--outline-callout-label)"
          >
            {name}
          </text>
        </g>
      </Upright>
    </g>
  );
}

/**
 * A rail's own title — `Thickness` for the deck rail, `Rocker` for the bottom one (quick task
 * 260830-2dy, `RAIL_LABEL_TEXTS`), so the drawing itself says which rail is which rather than a
 * shaper having to infer it from which side of the board a number sits on. The two words are
 * exactly the ones the sidebar's collapsible sections (`rocker-controls.tsx`) and the DATASHEET's
 * row groups (`rocker-datasheet.tsx`) already use — one vocabulary across the whole screen.
 *
 * Nose-left the title sits OUTSIDE the rail, centred on the board's middle station (unchanged,
 * founder-approved). Nose-up it sits directly ABOVE its own rail's Center card instead, centred on
 * that card's own column (quick task 260830-31h) — not beside the rail, because a word turned
 * upright on screen presents its full WIDTH across the rail, and the only place with that much
 * spare room is the card's own column, not a thin outboard strip.
 *
 * Every position, size and band this needs comes off `layout` (Rule 1) — this component performs
 * no arithmetic of its own, which is why wrapping the text in `Upright` alone is enough to make
 * it read correctly nose-up too, the same treatment a station name row already carries. `callouts
 * === "full"` only; nothing is added to the `"compact"` or `"none"` branches.
 *
 * A note for the next editor, because its absence produced the 260830-31h regression: the anchor
 * fields mean different things in the two orientations (`deckLabelY`/`bottomLabelY` are baselines
 * nose-left but cross-axis centring nose-up; `labelStationX` is the opposite), and a counter-
 * rotated run presents its RUN LENGTH across the rail while its cap points along it — so a band
 * sized only for cap height is not enough nose-up.
 *
 * A separate note: SVG applies trailing letter-spacing after the final glyph, so a centred tracked
 * string sits a fraction of a space left of true centre — accepted, and identical to what the
 * station name rows above already do.
 */
function RailTitle({
  x,
  y,
  size,
  vertical,
  text,
}: {
  x: number;
  y: number;
  size: number;
  vertical: boolean;
  text: string;
}) {
  return (
    <Upright x={x} y={y} vertical={vertical}>
      <text
        x={x}
        y={y}
        textAnchor="middle"
        style={{ fontSize: size, fontWeight: 700, fontFamily: "var(--font-body)", letterSpacing: "0.08em" }}
        fill="var(--outline-callout-label)"
      >
        {text}
      </text>
    </Upright>
  );
}

/**
 * A bare compact reading (quick task 260829-vus, `callouts="compact"` only): no card surface, no
 * station name — position (which of the five stations) and side (deck = thickness, bottom =
 * rocker) carry what a card's own name text used to.
 *
 * `textX` is wherever `compactRailReadingXs`' separation sweep placed this reading, which may not
 * be `stationX` (the point it actually measures) — so the leader doglegs, `(textX, leaderStartY)`
 * to `(stationX, kneeY)` to `(stationX, curveY)`, keeping the reading pointed at the exact place
 * on the curve it measures even when the sweep nudged its type off that station.
 *
 * The tick is drawn inline at `COMPACT_TICK_SIZE` rather than through `DimensionTick` — that
 * component's own tick is a fixed module constant (`CALLOUT_TICK_SIZE`) with no size parameter,
 * and `CALLOUT_TICK_SIZE`'s 4 units would print as a 4px dot at this drawing's printed scale, too
 * small to read as a tick.
 */
function CompactReading({
  textX,
  stationX,
  row,
  curveY,
  value,
}: {
  /** Where the separation sweep placed this reading's own type. */
  textX: number;
  /** The station this reading actually measures, in the frame's own canonical x. */
  stationX: number;
  row: RockerCompactRow;
  curveY: number;
  value: string;
}) {
  return (
    <g>
      <polyline
        points={`${textX.toFixed(2)},${row.leaderStartY.toFixed(2)} ${stationX.toFixed(2)},${row.kneeY.toFixed(2)} ${stationX.toFixed(2)},${curveY.toFixed(2)}`}
        stroke="var(--outline-station-line)"
        strokeWidth={COMPACT_LEADER_WIDTH}
        fill="none"
      />
      <line
        x1={stationX - COMPACT_TICK_SIZE}
        y1={curveY + COMPACT_TICK_SIZE}
        x2={stationX + COMPACT_TICK_SIZE}
        y2={curveY - COMPACT_TICK_SIZE}
        stroke="var(--outline-dim-ink)"
        strokeWidth={1.1}
      />
      <text
        x={textX}
        y={row.textY}
        textAnchor="middle"
        style={{ fontSize: COMPACT_VALUE_SIZE, fontWeight: 700, fontFamily: "var(--font-body)" }}
        fill="var(--outline-ink)"
      >
        {value}
      </text>
    </g>
  );
}

/** A closed silhouette path: the bottom curve in the order given, then the deck curve back the
 * other way, then an implicit closing edge — the deck-over-bottom construction (D-01). */
function closedProfilePath(bottom: { x: number; y: number }[], deck: { x: number; y: number }[]): string {
  return [
    `M ${bottom[0].x.toFixed(2)} ${bottom[0].y.toFixed(2)}`,
    ...bottom.slice(1).map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    ...deck
      .slice()
      .reverse()
      .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    "Z",
  ].join(" ");
}

export function RockerViewer({
  profile,
  blank,
  callouts = "full",
  orientation = "horizontal",
  showMeasuringPoints = false,
  fitToBoard = false,
  boardFill = true,
}: RockerViewerProps) {
  const { system } = useUnits();
  const vertical = orientation === "vertical";
  const svgRef = useRef<SVGSVGElement>(null);
  const { length } = profile;
  const lengthIn = mmToInches(length);

  // The board, sampled in pure inches with no projection yet — split out from the drawing below so
  // the deck envelope (`"compact"` mode's own `maxDeckIn`) can be derived BEFORE the layout, and
  // therefore the scale, is built. The deck is the profile's own `deckAt` — rocker plus thickness,
  // never a third curve (R10).
  const samples: { stationIn: number; rockerLiftIn: number; deckIn: number }[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const station = mm((length * i) / SAMPLES);
    samples.push({
      stationIn: mmToInches(station),
      rockerLiftIn: mmToInches(profile.rockerAt(station)),
      deckIn: mmToInches(profile.deckAt(station)),
    });
  }

  // The blank's own side silhouette (D-15), sampled along the blank from its tail tip to its nose
  // tip in the board's own coordinates — so it may run past either end of the board. Its bottom is
  // levelled exactly as the board's rocker is, so along the board the two bottoms are one line.
  const blankSamples: { stationIn: number; bottomIn: number; deckIn: number }[] = [];
  if (blank) {
    for (let i = 0; i <= BLANK_SAMPLES; i++) {
      const station = mm(blank.start + ((blank.end - blank.start) * i) / BLANK_SAMPLES);
      blankSamples.push({
        stationIn: mmToInches(station),
        bottomIn: mmToInches(blank.bottomAt(station)),
        deckIn: mmToInches(blank.deckAt(station)),
      });
    }
  }
  // How far the blank reaches past the board and how high and low it sits — the frame fits all of
  // it (`rocker-view-frame.ts` owns what that does to the scale and frame, Rule 1).
  const blankSpanIn: RockerViewLayoutInput["blankSpanIn"] = blank
    ? {
        tailOverhangIn: mmToInches(mm(Math.max(0, -blank.start))),
        noseOverhangIn: mmToInches(mm(Math.max(0, blank.end - length))),
        lowestBottomIn: Math.min(...blankSamples.map((s) => s.bottomIn)),
        highestDeckIn: Math.max(...blankSamples.map((s) => s.deckIn)),
      }
    : undefined;

  // The tallest a drawn board can ever get: the highest rocker lift plus the thickest foil, so
  // the deck curve can never be clipped by the frame regardless of what a shaper dials in. Every
  // mode but `"compact"` reserves this constant on the frame's cross axis regardless of the
  // board actually loaded (`rocker-view-frame.ts`'s own `maxDeckIn` contract).
  const worstCaseDeckIn = ROCKER_LIFT_RANGE_IN.max + FOIL_THICKNESS_RANGE_IN.max;
  // `"compact"` reserves only the LOADED board's own deck envelope instead — the order form's box
  // is short and wide, so an empty reserved unit comes straight out of the printed type. Falls
  // back to the worst-case constant on a corrupt/non-finite envelope (threat T-VUS-01), mirroring
  // `rocker-view-frame.ts`'s own `resolveEffectiveLengthIn` fallback.
  let maxDeckIn = worstCaseDeckIn;
  if (callouts === "compact") {
    const deckEnvelopeIn = Math.max(...samples.map((s) => s.deckIn));
    maxDeckIn = Number.isFinite(deckEnvelopeIn) && deckEnvelopeIn > 0 ? deckEnvelopeIn : worstCaseDeckIn;
  }

  // Frame pass: the same pure layout function, evaluated first only to read the frame dimensions
  // `useSvgFitScale` measures against. Safe to read before the card scale is even known because
  // every frame extent (`width`/`height`, and therefore `viewBox`) is reserved at the pin's own
  // CEILING (`maxCardPinScale`), never at the live card scale (`rocker-view-frame.ts`'s own
  // T-03J-02 note) — so this pass hands `useSvgFitScale` the exact same numbers the drawing pass
  // below will, whatever card scale that second pass resolves to.
  const framePass = rockerViewLayout({
    lengthIn,
    maxDeckIn,
    orientation,
    fitToBoard,
    stationRails: callouts,
    blankSpanIn,
  });
  const fitScale = useSvgFitScale(svgRef, framePass.width, framePass.height);
  // The card-pin scale (quick task 260830-03j): 1 (unpinned) whenever this call's own
  // `stationRails` never draws a card at all (`cardPinScale`/`maxCardPinScale`'s own ceiling
  // forces that), so the Summary order form's `"compact"`/`"none"` paths are unaffected no matter
  // what this resolves to.
  const cardScale = cardPinScale(fitScale, CALLOUT_PX.value, orientation);

  // The drawing pass: the one place the drawing's scale and frame are decided
  // (`rocker-view-frame.ts`) — `scale`, `baselineY`, `boardOffsetX` and the frame below all come
  // from here, so every curve, card and dot is projected at one scale.
  const layout = rockerViewLayout({
    lengthIn,
    maxDeckIn,
    orientation,
    fitToBoard,
    stationRails: callouts,
    cardScale,
    blankSpanIn,
  });
  const {
    scale,
    baselineY,
    railY,
    tickEndY,
    deckRailY,
    deckTickEndY,
    cardDy,
    cardWidth,
    cardHeight,
    cardType,
    compactRows,
    railLabelSize,
    deckLabelY,
    bottomLabelY,
    labelStationX,
    boardOffsetX,
  } = layout;

  // Nose on the left: station = length (nose tip) draws `boardOffsetX` in from the frame's left pad
  // (0 without a blank; the blank's nose overhang with one, so the blank's own nose lands on the
  // pad); station = 0 (tail tip) draws further right.
  const pxX = (stationIn: number) => PAD_X + boardOffsetX + (lengthIn - stationIn) * scale;
  const pxY = (heightIn: number) => baselineY - heightIn * scale;

  // One closed shape: the bottom curve tail-to-nose, the deck curve nose-to-tail, closed at both
  // tips — drawn as a single solid board silhouette, the same way `outline-viewer.tsx`'s own
  // board path closes plan-view left and right halves.
  const boardPath = closedProfilePath(
    samples.map((s) => ({ x: pxX(s.stationIn), y: pxY(s.rockerLiftIn) })),
    samples.map((s) => ({ x: pxX(s.stationIn), y: pxY(s.deckIn) })),
  );
  // The blank's silhouette, built the same way along the blank's own length.
  const blankPath = blank
    ? closedProfilePath(
        blankSamples.map((s) => ({ x: pxX(s.stationIn), y: pxY(s.bottomIn) })),
        blankSamples.map((s) => ({ x: pxX(s.stationIn), y: pxY(s.deckIn) })),
      )
    : null;

  const noseX = pxX(lengthIn);
  const tailX = pxX(0);

  /** The five stations' rail entries, read straight off the profile — the same numbers RAILS and
   * the DATASHEET read, never re-derived here. `rockerKind`/`thicknessKind` pick a card (a number
   * the shaper sets) or a plain reading (one computed for them) per UI-SPEC section 9, and depend
   * on whether the board sits in a blank at all (`profile.blank`), not on whether this drawing was
   * handed the blank's silhouette to draw. */
  const inBlank = profile.blank !== null;
  const stationNames: Record<FoilStationKey, string> = {
    tailTip: "Tail Tip",
    tail12: `Tail @ ${stationLabel(system)}`,
    center: "Center",
    nose12: `Nose @ ${stationLabel(system)}`,
    noseTip: "Nose Tip",
  };
  const stations = profile.stations.map(({ key, station }) => {
    const twelve = key === "tail12" || key === "nose12";
    return {
      key,
      name: stationNames[key],
      stationIn: mmToInches(station),
      // The Center rocker is the curve's own zero reference, never printed as a number.
      rockerValue: key === "center" ? null : formatMark(profile.stationRocker[key], system),
      thicknessValue: formatMark(profile.effectiveFoil[key], system),
      rockerKind: (key !== "center" && !inBlank ? "input" : "derived") as "input" | "derived",
      thicknessKind: (inBlank && twelve ? "derived" : "input") as "input" | "derived",
      rockerHeightIn: mmToInches(profile.rockerAt(station)),
      deckHeightIn: mmToInches(profile.deckAt(station)),
    };
  });

  // `"compact"` mode's two reading rows (quick task 260829-vus). `pxX` puts the nose at the
  // frame's left, so ascending x runs nose to tail — the reverse of `stations`' own tail-to-nose
  // order above. Every band depth, row baseline, type size and x position these lists hand to
  // `CompactReading` comes off `layout`/`compactRailReadingXs`; nothing here is computed that this
  // component doesn't already need to project the curve itself (Rule 1).
  const ascendingStations = [...stations].reverse();
  // Deck row: all five stations.
  const compactDeckList = ascendingStations.map((s) => ({
    stationX: pxX(s.stationIn),
    width: compactValueWidth(s.thicknessValue),
  }));
  const compactDeckXs = compactRailReadingXs(layout, compactDeckList);
  // Bottom row: all four rocker figures — tips and @ 12" alike — on ONE shared baseline, through
  // ONE sweep. The centre station's own rocker figure — the curve's own zero — is deliberately
  // absent.
  const compactBottomStations = ascendingStations.filter((s) => s.rockerValue !== null);
  const compactBottomList = compactBottomStations.map((s) => ({
    stationX: pxX(s.stationIn),
    width: compactValueWidth(s.rockerValue ?? ""),
  }));
  const compactBottomXs = compactRailReadingXs(layout, compactBottomList);

  // The viewBox string comes straight off the layout — the one place this drawing's frame is
  // decided. The vertical frame is built from its own rotated content, NOT a transposition of the
  // horizontal frame — the defect quick task 260825-w8d fixed on the outline viewer.
  const { viewBox } = layout;
  /** User units per CSS pixel — what the px-denominated dot radius and blank line are drawn in. */
  const handleUnit = fitScale > 0 ? 1 / fitScale : 1;

  // The measuring points: the board's five stations on its bottom and its deck, and with a blank,
  // every station the catalogue measured — rocker stations on the blank's bottom, thickness
  // stations on its deck (each attribute's own list, so a width-only station draws nothing here).
  const boardPoints = stations.flatMap((s) => [
    { cx: pxX(s.stationIn), cy: pxY(s.rockerHeightIn) },
    { cx: pxX(s.stationIn), cy: pxY(s.deckHeightIn) },
  ]);
  const blankPoints = blank
    ? [
        ...blank.measuredStations.rocker.map((station) => ({
          cx: pxX(mmToInches(station)),
          cy: pxY(mmToInches(blank.bottomAt(station))),
        })),
        ...blank.measuredStations.thickness.map((station: Mm) => ({
          cx: pxX(mmToInches(station)),
          cy: pxY(mmToInches(blank.deckAt(station))),
        })),
      ]
    : [];

  // The thinning marks (Phase 14 D-12, UI-SPEC §6): one short dashed line across the board where
  // each tip's thinning starts, at the station the profile resolved for it (`blank.tips`, already
  // pulled inside the slider's reach, Automatic's for a start that is not a number), from the
  // board's bottom to its deck there — sampled exactly as the measuring points are — each end
  // pushed `THINNING_MARK_OVERSHOOT` past the board (down below the bottom, up above the deck).
  // `"full"` grammar with a blank only: the order form's compact box is never handed a blank.
  const thinningMarks =
    blank && callouts === "full"
      ? (["nose", "tail"] as const).map((end) => {
          const station = blank.tips[end].station;
          const x = pxX(mmToInches(station));
          return {
            end,
            x,
            bottomY: pxY(mmToInches(profile.rockerAt(station))) + THINNING_MARK_OVERSHOOT,
            topY: pxY(mmToInches(profile.deckAt(station))) - THINNING_MARK_OVERSHOOT,
          };
        })
      : [];

  // With a blank, the name also says where the two marks sit, in words (UI-SPEC Copywriting), so a
  // screen reader hears what the marks show; the distances read through 14-11's formatter.
  const ariaLabel = blank
    ? `Side profile of the board inside the ${blank.record.vendor} ${blank.record.name} blank, with the foam to come off the deck and the bottom shaded, and ${thinningMarksSentence(blank.tips.nose.fromTip, blank.tips.tail.fromTip, system)}`
    : "Side profile of the board, showing the rocker line and deck thickness";

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      // Absolutely positioned to fill its container — `outline-viewer.tsx`'s own svg takes the
      // same treatment, and for the same reason: a box must never take its height from the
      // drawing inside it, or a fixed-size panel (the Summary order form's rocker box) inflates
      // to the drawing's own aspect ratio instead of holding still. The immediate parent supplies
      // both `relative` and a definite size in every consumer of this component.
      // No `touch-none` any more: it was here only so a finger dragging a handle could not be
      // handed to native scrolling (D-14 retired the handles). A drawing with nothing to drag
      // should let a thumb scroll a short screen's drawing column like any other picture.
      // `select-none` and the iOS long-press callout suppression stay: a long press on the
      // drawing's labels should not start a text selection.
      className="absolute inset-0 block h-full w-full select-none"
      style={{ WebkitTouchCallout: "none" }}
      role="img"
      aria-label={ariaLabel}
    >
      {/* Every child below is drawn in the canonical (horizontal, nose-left) coordinate space,
          untouched — the rotation lives on this ONE group, so pxX/pxY and their call sites keep
          drawing the layout they always drew. React omits an `undefined` attribute, so in
          horizontal this is a plain pass-through container with no transform. */}
      <g transform={vertical ? "rotate(90)" : undefined}>
        {/* The flat surface the board sits on — the rocker's own zero reference, bottom-up — drawn
            faint and dashed, spanning only the drawn board's own length. Compact draws it at its
            own heavier stroke and longer dash (`COMPACT_BASELINE_*`): the 1-unit line washes out
            entirely at the order form's printed scale, the same wash-out COMPACT_LEADER_WIDTH
            already corrects for the leaders. */}
        <line
          x1={tailX}
          y1={baselineY}
          x2={noseX}
          y2={baselineY}
          stroke="var(--outline-station-line)"
          strokeWidth={callouts === "compact" ? COMPACT_BASELINE_WIDTH : 1}
          strokeDasharray={callouts === "compact" ? COMPACT_BASELINE_DASH : "4 3"}
        />
        {/* The blank (D-15), after the baseline and before the board: the faint foam wash inside a
            solid 1px line. The board paints over it next, so only the foam to come off stays
            shaded. */}
        {blankPath && (
          <path
            data-blank-silhouette
            d={blankPath}
            fill="var(--outline-foam-shade)"
            stroke="var(--outline-blank-line)"
            strokeWidth={BLANK_LINE_PX * handleUnit}
            strokeLinejoin="round"
          />
        )}
        <path
          data-board-silhouette="profile"
          d={boardPath}
          fill={boardFill ? "var(--outline-board-fill)" : "none"}
          stroke="var(--outline-ink)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* The thinning marks (D-12), after the board and before the callouts so they cross the
            board's own fill and turn with it in both orientations. No text: the drawing's name and
            the sidebar carry the words. Dashed and in the blank's line colour, darker than a
            leader's, so where a mark meets a 12" leader the two still read as different lines. */}
        {thinningMarks.map((m) => (
          <line
            key={m.end}
            data-thinning-mark={m.end}
            x1={m.x}
            y1={m.bottomY}
            x2={m.x}
            y2={m.topY}
            stroke="var(--outline-blank-line)"
            strokeWidth={1}
            strokeDasharray={THINNING_MARK_DASH}
            fill="none"
          />
        ))}

        {callouts === "full" && (
          <>
            {stations.map((s) => {
              const x = pxX(s.stationIn);
              const deckCurveY = pxY(s.deckHeightIn);
              const rockerCurveY = pxY(s.rockerHeightIn);
              return (
                <g key={s.key}>
                  {/* Deck side: a card for a thickness the shaper sets, a plain reading for one
                      the blank derives. */}
                  {s.thicknessKind === "input" ? (
                    <StationCard
                      x={x}
                      rail={deckRailY}
                      tickEnd={deckTickEndY}
                      curveY={deckCurveY}
                      cardDy={cardDy}
                      cardWidth={cardWidth}
                      cardHeight={cardHeight}
                      vertical={vertical}
                      name={s.name}
                      value={s.thicknessValue}
                      type={cardType}
                    />
                  ) : (
                    <StationReadout
                      x={x}
                      rail={deckRailY}
                      tickEnd={deckTickEndY}
                      curveY={deckCurveY}
                      cardDy={cardDy}
                      vertical={vertical}
                      name={s.name}
                      value={s.thicknessValue}
                      type={cardType}
                    />
                  )}
                  {/* Bottom side: a card for a rocker figure the shaper types, a plain reading for
                      one the blank decides. The centre keeps its em-dash as a plain reading in the
                      muted label colour — it stands in for a value that is zero by construction
                      rather than one that was measured. */}
                  {s.rockerKind === "input" ? (
                    <StationCard
                      x={x}
                      rail={railY}
                      tickEnd={tickEndY}
                      curveY={rockerCurveY}
                      cardDy={cardDy}
                      cardWidth={cardWidth}
                      cardHeight={cardHeight}
                      vertical={vertical}
                      name={s.name}
                      value={s.rockerValue ?? ""}
                      type={cardType}
                    />
                  ) : (
                    <StationReadout
                      x={x}
                      rail={railY}
                      tickEnd={tickEndY}
                      curveY={rockerCurveY}
                      cardDy={cardDy}
                      vertical={vertical}
                      name={s.name}
                      value={s.rockerValue ?? "—"}
                      type={cardType}
                      valueColor={s.rockerValue !== null ? "var(--outline-ink)" : "var(--outline-callout-label)"}
                    />
                  )}
                </g>
              );
            })}
            {/* Rail titles (quick task 260830-2dy, moved nose-up by 260830-31h): the drawing's own
                definitive name for each rail. Nose-left, outside both rails' own cards, centred on
                the board's middle station; nose-up, directly above its own rail's Center card,
                centred on that card's own column instead — see `RailTitle`'s own doc comment. The
                words themselves come from `RAIL_LABEL_TEXTS` (this module's own layout, not a
                second copy here), so the drawing's vocabulary and the layout that proves it fits
                can never disagree. */}
            <RailTitle x={labelStationX} y={deckLabelY} size={railLabelSize} vertical={vertical} text={RAIL_LABEL_TEXTS.deck} />
            <RailTitle x={labelStationX} y={bottomLabelY} size={railLabelSize} vertical={vertical} text={RAIL_LABEL_TEXTS.bottom} />
          </>
        )}

        {/* Compact rails (quick task 260829-vus): two rows of bare readings, no card surface and
            no station name. Every position, band and type size these draw at comes off `layout`
            and the two lists built above; this branch only zips a reading's own value onto the x
            the separation sweep chose for it. */}
        {callouts === "compact" && (
          <>
            {ascendingStations.map((s, i) => (
              <CompactReading
                key={`compact-deck-${s.key}`}
                textX={compactDeckXs[i]}
                stationX={pxX(s.stationIn)}
                row={compactRows.deck}
                curveY={pxY(s.deckHeightIn)}
                value={s.thicknessValue}
              />
            ))}
            {compactBottomStations.map((s, i) => (
              <CompactReading
                key={`compact-bottom-${s.key}`}
                textX={compactBottomXs[i]}
                stationX={pxX(s.stationIn)}
                row={compactRows.bottom}
                curveY={pxY(s.rockerHeightIn)}
                value={s.rockerValue ?? ""}
              />
            ))}
          </>
        )}

        {/* The measuring points: plain dots, nothing to grab. The blank's measured stations draw
            first in the blank's own line colour, then the board's five stations in ink on top. */}
        {showMeasuringPoints && (
          <g data-measuring-points pointerEvents="none">
            {blankPoints.map((p, i) => (
              <circle
                key={`blank-point-${i}`}
                cx={p.cx}
                cy={p.cy}
                r={KNOT_DOT_PX * handleUnit}
                fill="var(--outline-blank-line)"
                pointerEvents="none"
              />
            ))}
            {boardPoints.map((p, i) => (
              <circle
                key={`board-point-${i}`}
                cx={p.cx}
                cy={p.cy}
                r={KNOT_DOT_PX * handleUnit}
                fill="var(--outline-ink)"
                pointerEvents="none"
              />
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}
