"use client";

/**
 * The INSTRUCTIONS tab's "Turning Marks Into Rail Bands" figure (RAIL-05, D-01/D-02) — the
 * prototype's own fixed example board: a plan-view PNG traced with hand-drawn deck-mark, rail-mark
 * and tuck overlays, a side-view SVG strip carrying the same marks, the `@12"`/`@Center`/`@12"`
 * station labels and the "Taper Tuck to a Sharp Edge" note. It is a teaching illustration of a
 * generic board, never the shaper's own outline (D-01) — nothing here reads the design store.
 *
 * The ported data (the path strings, the viewBoxes, the colour/width/dash maps) lives in
 * `rail-reference-paths.ts`, pinned against the prototype's own source by a parity test. This file
 * lays the four columns out as one box that fits the space its caller gives it, up to the
 * prototype's own rendered size (never the prototype's own hard-coded `0.7492` transform, UI-SPEC
 * "The figure's fit") — a shaper needs the whole example board on screen at once, not stretched
 * wide enough to run off the bottom of the column — filters the ported paths by `visibleGroups`,
 * and reads its two literal figures — the station labels and the tail-distance range — through the
 * display boundary (RAIL-06).
 *
 * `fit` (quick 260910-kz2, PRNT-05) decides which dimension that space is measured in. `"width"`
 * (the default) is today's exact behaviour, unchanged: the drawing takes its WIDTH from a fixed
 * flex-basis and derives its height from the aspect ratio — what the RAILS tab's own scrolling
 * INSTRUCTIONS page asks for, since it has no fixed box to fit and the figure should simply be as
 * big as its own cap allows. `"height"` takes the drawing's HEIGHT from the box its caller hands it
 * and derives the width instead — what the printed Rail Band Instructions sheet asks for, because a
 * sheet of paper has a FIXED amount of height to divide between this figure and the example rail
 * beside it, and the old width-only sizing had no way to shrink when that height ran out: it simply
 * clipped, silently, with the example rail drawing squeezed to nothing below it.
 *
 * Beside that drawing sits an OPTIONAL key (quick 260910-jfp, PRNT-05) — a colour-dot-plus-name
 * list naming every line the shaper left ticked, drawn in the blank paper that was already there
 * and costing no vertical space. It is opt-in via `showLineKey` (default `false`): the RAILS tab's
 * INSTRUCTIONS page already shows the same nine names as tick boxes and does not want a second,
 * unclickable copy beside its own drawing, so only `RailInstructionsSheet` (the printed order
 * form's third sheet) asks for it. It is also deliberately not drawn at all below
 * `KEY_ROW_MIN_WIDTH_PX` of row width — squeezed narrower than that, a wrapped label could grow
 * taller than the drawing itself, and the founder's whole reason for choosing this placement is
 * that it costs nothing.
 */

import type { ReactNode } from "react";
import { useUnits } from "@/components/units-provider";
import { formatDim, stationLabel } from "@/lib/geometry/measure-display";
import { inchesToMm, type UnitsSystem } from "@/lib/geometry/units";
import {
  PLAN_REF_PATHS,
  PLAN_REF_VIEWBOX,
  REF_DASH_PX,
  REF_GROUP_SCREEN_COLORS,
  REF_GROUP_DEFAULT_WIDTH,
  REF_GROUP_WIDTHS,
  SIDE_REF_PATHS,
  SIDE_REF_VIEWBOX,
  type RailReferenceGroup,
  type RailReferencePath,
} from "./rail-reference-paths";

/** The bottom-tuck-to-hard-edge distance range (Step 3's own copy, and this figure's taper note,
 * D-04) — a position along the board, so it's a dim: composed through the display boundary with
 * the unit carried once at the end of the range, mirroring `templateNameBlockDimsText`'s own
 * "strip the earlier end's redundant unit" idiom (`components/template/build-template-pdf.ts`).
 * Imperial reproduces the prototype's own `16-22"` verbatim; Metric reads centimetres end to end.
 * Never hand-typed, never a conversion factor inlined here — `inchesToMm`/`formatDim` do the job. */
const TAPER_TUCK_RANGE_IN = { from: 16, to: 22 } as const;

/** Exported so `RailInstructions` (Task 3) composes the identical range for Step 3's own copy,
 * rather than a second, potentially-drifting composition of the same two literal inches. */
export function formatTaperTuckRange(system: UnitsSystem): string {
  const from = formatDim(inchesToMm(TAPER_TUCK_RANGE_IN.from), system);
  const to = formatDim(inchesToMm(TAPER_TUCK_RANGE_IN.to), system);
  const fromBare = system === "metric" ? from.replace(/ cm$/, "") : from.replace(/"$/, "");
  return `${fromBare}-${to}`;
}

interface RailReferenceLegendEntry {
  key: RailReferenceGroup;
  label: string;
  color: string;
}

/** The 9px round colour dot both the RAILS tab's clickable ticks (`RailLegendTicks`) and this
 * figure's own printed, unclickable key draw — one swatch expression, so a dot and the line it
 * names can never resolve to different ink (both read `entry.color`, which is always
 * `REF_GROUP_SCREEN_COLORS[key]`, the same map `refPathElements` below strokes the paths with). */
export function RailLegendSwatch({ color }: { color: string }) {
  return (
    <span className="inline-block h-[9px] w-[9px] flex-shrink-0 rounded-full" style={{ background: color }} />
  );
}

/** The prototype's own nine legend entries (Rails.dc.html lines 1290-1298), in its own order —
 * D-01/D-02's "all nine start ticked" is the shared `RailLegendProvider`'s own seed
 * (`rail-legend-provider.tsx`), not this list. */
export const RAIL_REFERENCE_LEGEND: RailReferenceLegendEntry[] = [
  { key: "deckMark1", label: "Deck Marks 1", color: REF_GROUP_SCREEN_COLORS.deckMark1 },
  { key: "deckBand1", label: "Deck Band 1", color: REF_GROUP_SCREEN_COLORS.deckBand1 },
  { key: "deckMark3", label: "Deck Marks 3", color: REF_GROUP_SCREEN_COLORS.deckMark3 },
  { key: "deckBand2", label: "Deck Band 2", color: REF_GROUP_SCREEN_COLORS.deckBand2 },
  { key: "deckMark3Full", label: "Deck Mark 3 Center (full board)", color: REF_GROUP_SCREEN_COLORS.deckMark3Full },
  { key: "railMark1", label: "Rail Marks 1", color: REF_GROUP_SCREEN_COLORS.railMark1 },
  { key: "railBand1", label: "Rail Band 1", color: REF_GROUP_SCREEN_COLORS.railBand1 },
  { key: "railTuck1", label: "Rail Tucks 1", color: REF_GROUP_SCREEN_COLORS.railTuck1 },
  { key: "tuckBlend", label: "Tuck blend to hard tail", color: REF_GROUP_SCREEN_COLORS.tuckBlend },
];

// The prototype's own 499x630 layout box (Rails.dc.html line 417), before its hard-coded
// `scale(0.7492)` — ported here as proportions of one box that fits its container, never that
// literal transform (UI-SPEC "The figure's fit"). The note column's true visual footprint (the
// "Taper Tuck..." text) is roughly 144px wide inside that same box; the prototype achieves this by
// giving the column itself only an 8px flex-basis and letting the note text overflow into the
// box's own unused right margin (justify-content: center over-provisions 499px of width for 357px
// of packed columns). That overflow trick has no responsive equivalent, so this port gives the
// note column its own honest share of the width instead — the column widths below sum back to the
// prototype's own 499px total, so the whole figure keeps its original proportions.
const FIGURE_HEIGHT = 630;
const FIGURE_GAP = 14;
const FIGURE_COLUMNS = { plan: 223, label: 19, side: 65, note: 150 } as const;
const FIGURE_CONTENT_WIDTH =
  FIGURE_COLUMNS.plan + FIGURE_COLUMNS.label + FIGURE_COLUMNS.side + FIGURE_COLUMNS.note + FIGURE_GAP * 3;

// The prototype's own rendered size for this whole figure (Rails.dc.html lines 415-417): its
// 499x630 layout box sat inside a 500px-tall frame at a hard-coded `scale(0.7492)`, so it actually
// drew at 630 * 0.7492 = 472px tall. That is the ceiling this figure now scales up to, so the
// whole example board stays on screen instead of stretching to fill an arbitrarily wide column.
// The width is derived from the height and the two existing layout constants above, never typed
// by hand, so it can never drift out of the 499:630 ratio those columns already sum to (it lands
// on 373.85px, the prototype's own frame width).
const FIGURE_MAX_RENDERED_HEIGHT = 472;
const FIGURE_MAX_RENDERED_WIDTH = (FIGURE_MAX_RENDERED_HEIGHT * FIGURE_CONTENT_WIDTH) / FIGURE_HEIGHT;

// The card's own height chrome (quick 260910-kz2) — its `p-3.5` padding (14px, Tailwind's spacing
// scale: 3.5 * 4px) top and bottom, plus its `border` (Tailwind's default 1px) top and bottom.
// Named as two factors rather than one typed total, so `rail-plan-side-figure.test.ts` can pin
// each factor against the card's own Tailwind classes independently, and a future edit to either
// class is caught rather than silently drifting from this number.
const FIGURE_CARD_PADDING_PX = 14;
const FIGURE_CARD_BORDER_PX = 1;
const FIGURE_CARD_CHROME_PX = FIGURE_CARD_PADDING_PX * 2 + FIGURE_CARD_BORDER_PX * 2;

/** The tallest this card is ever drawn — the prototype's own rendered figure height plus the
 * card's own chrome. Exported so `RailInstructionsSheet` (quick 260910-kz2) can cap the box it
 * hands this figure at exactly this number rather than a second, potentially-drifting copy of it:
 * the pixel cap has exactly one home. Composed from the two constants above, never typed as the
 * literal 502 the browser measures this as (501.98, sub-pixel rendering aside). */
export const FIGURE_MAX_CARD_HEIGHT_PX = FIGURE_MAX_RENDERED_HEIGHT + FIGURE_CARD_CHROME_PX;

function widthPercent(column: number): string {
  return `${(column / FIGURE_CONTENT_WIDTH) * 100}%`;
}

// The key's own three constants (quick 260910-jfp). Measured at plan time (see PLAN.md
// must_haves.key_links) so none of these is a guess: the gap between drawing and key, the
// narrowest column the key may ever be drawn in, and the row width at which it turns on.
/** The gap between the drawing and the key, in the row's flex `gap`. */
const KEY_GAP_PX = 12;
/** The narrowest the key's own column is ever allowed to be when it draws — guaranteed by the
 * `@min-[...]/rail-key` container query on the row below, not by a `min-width` on the key itself
 * (a `min-width` there would re-open the very drawing-shrink path this key must never cause). */
const KEY_MIN_COLUMN_PX = 100;
/** The row width at which the key turns on — below it, the key is not drawn at all and the figure
 * is byte-identical to today's. `Math.ceil` rounds UP on purpose: rounding up can only ever turn
 * the key on LATER, never earlier, so this can never draw the key in a column narrower than
 * `KEY_MIN_COLUMN_PX`. The matching literal lives in the Tailwind class below
 * (`@min-[486px]/rail-key:block`) — Tailwind cannot compose a class name from a variable, so that
 * literal is unavoidable, and `rail-plan-side-figure.test.ts` pins the two against each other. */
export const KEY_ROW_MIN_WIDTH_PX = Math.ceil(FIGURE_MAX_RENDERED_WIDTH + KEY_GAP_PX + KEY_MIN_COLUMN_PX);

/** Renders one ported path array, filtered by `visibleGroups` — the side view's own `black` board
 * outline is never gated (the prototype's `show` map hardcodes it `true`, Rails.dc.html line
 * 1386), so it always renders regardless of the legend. */
function refPathElements(paths: RailReferencePath[], visibleGroups: Set<RailReferenceGroup>): ReactNode[] {
  return paths
    .filter((p) => p.group === "black" || visibleGroups.has(p.group))
    .map((p, i) => (
      <path
        key={`${p.group}-${i}`}
        d={p.d}
        fill="none"
        stroke={REF_GROUP_SCREEN_COLORS[p.group]}
        strokeWidth={REF_GROUP_WIDTHS[p.group] ?? REF_GROUP_DEFAULT_WIDTH}
        strokeDasharray={REF_DASH_PX[p.dash] ?? "none"}
      />
    ));
}

/** The station labels' `cqw` percentage, factored out of `LABEL_FONT_SIZE` below so it appears
 * exactly once in this file — both the clamp string and the key's own font size (quick 260910-jfp)
 * are built from this one number, and can never drift into two different copies of the same
 * percentage. */
const LABEL_FONT_CQW = 3.2;

/** A label's font size, tied to the figure's own container width rather than the viewport's — the
 * same `clamp(min, N cqw, max)` idiom `app/design/summary/order-form.css` already establishes for
 * a surface that scales as one box. This needs no change for the new render-size cap above: at the
 * capped `FIGURE_MAX_RENDERED_WIDTH` (373.85px) this clamp computes to 373.85 * 0.032 = 11.96px,
 * which is the prototype's own 16px label at its own 0.7492 rendering (16 * 0.7492 = 11.99px). The
 * container query already tracks the capped box, so the cap brings the labels to the prototype's
 * size automatically. The key beside the drawing (quick 260910-jfp) takes the same number in px —
 * see `KEY_FONT_SIZE_PX` below. */
const LABEL_FONT_SIZE = `clamp(9px, ${LABEL_FONT_CQW}cqw, 20px)`;

/** The key's own font size (quick 260910-jfp). Not a `cqw` of its own: the key sits BESIDE the
 * drawing's `@container`, outside it, so a `cqw` there would read the key column's own
 * page-dependent width instead of the figure's fixed one. It therefore takes the station labels'
 * percentage directly against the figure's fixed rendered width — the same 11.96px the labels
 * themselves compute to at that cap, so the key prints at the sheet's own floor size, never below
 * it. */
const KEY_FONT_SIZE_PX = FIGURE_MAX_RENDERED_WIDTH * (LABEL_FONT_CQW / 100);

/**
 * The plan and side reference figure (RAIL-05). `visibleGroups` decides which of the nine
 * gateable line families draw — the board outline, side strip and station labels are unaffected
 * by the set and always render (RAIL-05 empty-state: unticking every box never blanks the box).
 *
 * `showLineKey` (quick 260910-jfp, default `false`) asks for the printed key beside the drawing —
 * see this file's head comment for who asks for it and why. The key itself only ever appears when
 * `showLineKey` is true AND at least one line is ticked, so there is nothing left behind — no
 * heading, no empty column, no border round nothing — when every line is unticked.
 *
 * `fit` (quick 260910-kz2, default `"width"`) decides which dimension the figure fits itself to —
 * see this file's head comment for the two modes and who asks for which.
 */
export function RailPlanSideFigure({
  visibleGroups,
  showLineKey = false,
  fit = "width",
}: {
  visibleGroups: Set<RailReferenceGroup>;
  showLineKey?: boolean;
  fit?: "width" | "height";
}) {
  const { system } = useUnits();
  const keyEntries = RAIL_REFERENCE_LEGEND.filter((e) => visibleGroups.has(e.key));

  return (
    // Pinned to the prototype's own literal light values in every theme (UI-SPEC Color) — the
    // PNG background cannot invert for a dark theme, so this one card stays light on purpose, the
    // same reasoning app/globals.css's @media print block already pins Daylight tokens for print.
    // In the height-driven mode (quick 260910-kz2) the card fills the box its caller hands it and
    // lays out as a column, so the row below can take that height rather than the row's own
    // content dictating it — the width-driven mode's classes are untouched, byte for byte.
    <div
      className={
        fit === "height"
          ? "flex h-full w-full flex-col rounded-lg border border-surf-line-faint bg-surf-ground p-3.5"
          : "mx-auto w-full rounded-lg border border-surf-line-faint bg-surf-ground p-3.5"
      }
      data-rail-figure
    >
      {/* The row holding the drawing and its optional key (quick 260910-jfp). `justify-center`
          reproduces today's own `mx-auto` the moment the key is absent — whether because
          `showLineKey` is off, every line is unticked, or the key's own container query below has
          hidden it on a narrow page — since the drawing is then the row's only item. When the key
          IS shown, `justify-center` is a no-op: the key's own `flex-1` has already claimed every
          pixel of free space, which is what pushes the drawing flush left with the key in the
          blank column to its right.

          In the height-driven mode (quick 260910-kz2) the row is also the column's flexible
          child (`min-h-0 flex-1`), allowed to shrink all the way to nothing — it is what actually
          divides the card's own height between the drawing and (if drawn) the key. */}
      <div
        className={
          fit === "height"
            ? "@container/rail-key flex min-h-0 w-full flex-1 items-start justify-center"
            : "@container/rail-key flex w-full items-start justify-center"
        }
        style={{ gap: `${KEY_GAP_PX}px` }}
      >
        <div
          className="@container relative min-w-0"
          style={
            fit === "height"
              ? {
                  // The drawing's HEIGHT leads here, filling the row, with its WIDTH derived from
                  // the aspect ratio it already declares — the opposite of the width-driven
                  // branch below. `maxWidth: "100%"` is an inert guard against the row ever
                  // running out of width before it runs out of height (considered and measured at
                  // plan time: it never binds on any real page, since the height runs out first).
                  aspectRatio: `${FIGURE_CONTENT_WIDTH} / ${FIGURE_HEIGHT}`,
                  height: "100%",
                  width: "auto",
                  maxWidth: "100%",
                }
              : {
                  aspectRatio: `${FIGURE_CONTENT_WIDTH} / ${FIGURE_HEIGHT}`,
                  flex: `0 1 ${FIGURE_MAX_RENDERED_WIDTH}px`,
                }
          }
        >
          <div className="absolute inset-0 flex" style={{ gap: `${(FIGURE_GAP / FIGURE_CONTENT_WIDTH) * 100}%` }}>
            <div className="relative h-full flex-none" style={{ width: widthPercent(FIGURE_COLUMNS.plan) }}>
              <img
                src="/rail-bands-plan-bg.png"
                alt="Plan and side view of an example board showing where the rail sections sit"
                className="absolute inset-0 h-full w-full [filter:var(--surf-raster-filter)] [mix-blend-mode:var(--surf-raster-blend)]"
              />
              <svg
                viewBox={PLAN_REF_VIEWBOX}
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                {refPathElements(PLAN_REF_PATHS, visibleGroups)}
              </svg>
            </div>

            <div
              className="relative h-full flex-none text-surf-ink"
              style={{ width: widthPercent(FIGURE_COLUMNS.label), fontSize: LABEL_FONT_SIZE }}
            >
              <span
                className="absolute inset-x-0 text-center whitespace-nowrap"
                style={{ top: "19.01%", transform: "translateY(-50%)" }}
              >
                {stationLabel(system)}
              </span>
              <span
                className="absolute inset-x-0 top-1/2 text-center whitespace-nowrap"
                style={{ transform: "translateY(-50%)" }}
              >
                @Center
              </span>
              <span
                className="absolute inset-x-0 text-center whitespace-nowrap"
                style={{ top: "81.23%", transform: "translateY(-50%)" }}
              >
                {stationLabel(system)}
              </span>
            </div>

            <div className="relative h-full flex-none" style={{ width: widthPercent(FIGURE_COLUMNS.side) }}>
              <svg
                viewBox={SIDE_REF_VIEWBOX}
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                {refPathElements(SIDE_REF_PATHS, visibleGroups)}
              </svg>
            </div>

            <div className="relative h-full flex-none" style={{ width: widthPercent(FIGURE_COLUMNS.note) }}>
              <div
                className="absolute left-0 text-surf-ink"
                style={{ top: "62%", fontSize: LABEL_FONT_SIZE, lineHeight: 1.4 }}
              >
                Taper Tuck to
                <br />
                a Sharp Edge at
                <br />
                {formatTaperTuckRange(system)} off Tail
              </div>
            </div>
          </div>
        </div>

        {showLineKey && keyEntries.length > 0 && (
          // A KEY, not a control (founder decision 3): no checkbox, no touch target, nothing
          // clickable — the ticks stay where they already are, on the RAILS screen and under the
          // Summary's own print buttons. `hidden @min-[486px]/rail-key:block` is the one guard
          // that keeps this from ever costing the figure a pixel of height: below that row width
          // the key simply is not drawn, and `justify-center` above re-centres the drawing exactly
          // as it is today. `min-w-0` plus wrapping labels mean the key's own min-content
          // contribution is its longest WORD, not its longest label, so it can never widen the
          // sheet even before the container query removes it.
          <ul
            data-rail-line-key
            className="hidden min-w-0 flex-1 @min-[486px]/rail-key:block"
            style={{ fontSize: `${KEY_FONT_SIZE_PX}px`, lineHeight: 1.4 }}
          >
            {keyEntries.map((entry) => (
              <li key={entry.key} className="flex items-baseline gap-1.5 text-surf-ink [overflow-wrap:break-word]">
                <RailLegendSwatch color={entry.color} />
                <span className="min-w-0">{entry.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
