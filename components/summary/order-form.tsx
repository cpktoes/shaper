"use client";

/**
 * The Summary screen as a **shop order form** — laid out like the paper form a custom board actually
 * gets ordered on (`LB_order_form.pdf`, Kontoes Surfboards) rather than like a dashboard.
 *
 * **Two pages, printing front and back.**
 *
 * *Page 1 is the order form.* The muse's structure is kept intact, because it is what makes the
 * sheet legible to someone who has filled one in before: a boxed header (shop identity, `RIDER
 * INFO`, a `SHAPER USE ONLY` sub-box), a `SURFBOARD SHAPE AND DESIGN` body with vertical spine
 * labels down the left edge, and a `GLASSING` band across the bottom. What changes is that the
 * panels a shaper would have ticked or sketched by hand are replaced by this app's calculated
 * output:
 *
 * - `TAIL SHAPE` is gone — the tail is built into the outline, so ticking it would be a second,
 *   disagreeable source of truth.
 * - `CENTER` becomes `WIDEPOINT` and `WP OFFSET`, since a width means little without saying where
 *   along the board it was measured.
 * - `CONTOURS`/`RAILS` checkboxes become the real rail section plots.
 * - `FIN SETUP` checkboxes become a fin *system* selector, since which fins go on the board is
 *   now designed on the fins screen; only the box hardware is still an ordering choice.
 * - `ROCKER` stays a placeholder box until the rocker screen exists.
 *
 * *Page 2 is the shaper's reference* — the rail band marking data and the fin placement numbers.
 * These were on the front, in two narrow columns either side of the drawings, and the type they
 * could afford there was smaller than a number you cut foam to has any business being. On their own
 * page they get a half-page each. What the front gets back is the muse's own use for that space:
 * its board outlines live inside a big `COLOR DESIGN AND LOGOS` panel, blank around the drawings so
 * a customer can sketch artwork on it.
 *
 * Every calculated value is read from the shared design store (`components/design/design-store.tsx`)
 * and rendered through the *existing* view components — `OutlineViewer`, `RailSectionPlot`,
 * `RailDataTable`. No panel here reimplements a view or redoes a calculation, so a printed number
 * cannot drift from the screen it came from.
 *
 * **Sizing.** Each sheet is a fixed portrait aspect box whose type scales with the *container's*
 * width in `cqw` units (see `app/design/summary/order-form.css`). That is what lets the same layout
 * be measured on screen and printed to paper: `useOrderFormPrintFit` pins every sheet to the
 * printable page box before measuring, and because the type is tied to the container rather than
 * the viewport, the layout it measures is the layout that prints.
 */

import type { CSSProperties, ReactNode } from "react";
import { useDesign } from "@/components/design/design-store";
import { OutlineViewer } from "@/components/outline/outline-viewer";
import { RailDataTable } from "@/components/rails/rail-data-table";
import { RailSectionPlot } from "@/components/rails/rail-section-plot";
import { Button } from "@/components/ui/button";
import {
  FormBox,
  LogoBlock,
  OrderFormField,
  OrderFormTick,
  RailLabel,
} from "./order-form-primitives";
import { useOrderFormPrintFit } from "./use-print-fit";
import { cn } from "@/lib/utils";
import { FIN_SETUPS, FIN_SYSTEMS, type FinSystem } from "@/lib/geometry/fins";
import type { RailSectionKey } from "@/lib/geometry/rail-bands";
import {
  formatFeetInches,
  formatInchesFraction,
  formatSignedInchesFraction,
  inchesToMm,
  mm,
} from "@/lib/geometry/units";

const SECTION_KEYS: RailSectionKey[] = ["nose", "center", "tail"];
const SECTION_TITLE: Record<RailSectionKey, string> = {
  nose: "Nose",
  center: "Center",
  tail: "Tail",
};

/**
 * One sheet of paper. Both pages share the border, the padding and the `data-order-form-sheet` hook
 * that the print path and the aspect-ratio rule key off, so neither can drift from the other.
 */
function Sheet({
  variant = "form",
  children,
}: {
  /** "reference" is page 2, which carries only two tables and can therefore afford much larger
   * type than the densely packed order form — see `order-form.css`, where the variant redeclares
   * the whole type scale. */
  variant?: "form" | "reference";
  children: ReactNode;
}) {
  return (
    <div
      data-order-form-sheet
      className={cn(
        "flex flex-col gap-1 border-[1.5px] border-surf-black bg-surf-base p-1.5",
        variant === "reference" && "order-form-sheet-reference",
      )}
    >
      {children}
    </div>
  );
}

/** The `PAGE 1 OF 2` / `PAGE 2 OF 2` marker, so the pair reads as a pair when it comes off the printer. */
function PageMark({ page, title }: { page: number; title: string }) {
  return (
    <div className="flex flex-none items-baseline justify-between gap-2 pt-0.5 text-surf-muted order-form-micro">
      <span className="font-display font-extrabold tracking-architectural uppercase">{title}</span>
      <span>Page {page} of 2</span>
    </div>
  );
}

/**
 * One cell of the dimensions row — an ALL-CAPS caption over the measurement, the muse's
 * `LENGTH: / NOSE: / CENTER: / TAIL: / THICKNESS:` strip.
 */
function DimensionCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-[3px] border-r border-surf-black px-2 py-1.5 last:border-r-0">
      <span className="font-display font-extrabold tracking-architectural text-surf-muted uppercase leading-none order-form-caption">
        {label}
      </span>
      {/* `leading-none` would make the line box shorter than the glyphs it holds, so the span's own
          `overflow: hidden` (from `truncate`) clipped the measurements by ~2px. Tight, but tall
          enough to contain its own ink. */}
      <span className="truncate font-extrabold text-surf-black leading-[1.15] order-form-dim">{value}</span>
    </div>
  );
}

/**
 * The rocker box's nose/tail height ticks — `HIGH` / `MEDIUM` / `LOW`, one column either side of
 * the profile, exactly as the paper muse draws them. Placeholder chrome until the rocker screen
 * exists to supply a real curve and real numbers.
 */
function RockerTicks() {
  return (
    <div className="flex flex-none flex-col justify-center gap-[2px]">
      {["High", "Medium", "Low"].map((level) => (
        <OrderFormTick key={level} label={level} />
      ))}
    </div>
  );
}

/**
 * One drawing inside the colour-design panel, captioned beneath it the way the paper muse captions
 * its own pair. The drawings sit in the middle third of the panel, leaving blank paper either side
 * for the artwork the panel is named for.
 */
function OutlineHalf({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* The viewer's <svg> is absolutely positioned to fill its box, so the box needs to be
          `relative` and to have a size of its own — it must never take its height from the
          drawing, or the panel would demand the drawing's full aspect ratio and inflate the row. */}
      <div className="relative min-h-0 w-full flex-1">{children}</div>
      <div className="flex-none pt-0.5 text-center font-display font-extrabold tracking-architectural text-surf-black uppercase order-form-caption">
        {label}
      </div>
    </div>
  );
}

export function OrderForm() {
  const {
    outline,
    outlineGeometry,
    railBands,
    finPlacement,
    effectiveFins,
    volumeResult,
    boardName,
    setBoardName,
    finSystem,
    setFinSystem,
  } = useDesign();
  const { rootRef, printOrderForm } = useOrderFormPrintFit();

  const sections = SECTION_KEYS.map((key) => ({
    key,
    title: SECTION_TITLE[key],
    dataGroups: railBands[key].dataGroups,
  }));

  // One shared x-axis minimum across all three plots, then cropped at -6.5in — the same derivation
  // the landscape summary used. Three plots on one axis are comparable at a glance; three plots on
  // three different axes are not, which is the whole reason a shaper looks at them side by side.
  const rawSharedXAxisMinMm = Math.min(...SECTION_KEYS.map((key) => railBands[key].bounds.xAxisMin));
  const sharedXAxisMin = mm(Math.max(rawSharedXAxisMinMm, inchesToMm(-6.5)));

  const finSetupLabel =
    FIN_SETUPS.find((s) => s.value === effectiveFins.finSetup)?.label ?? effectiveFins.finSetup;

  const thicknessDisplay = formatInchesFraction(railBands.center.boardThickness);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-surf-muted/10 px-6 py-8">
      {/*
       * The outer element is the `@container` the sheets' type queries — a container query never
       * matches the container itself — and it is what `useOrderFormPrintFit` walks to find the
       * sheets. It is no longer itself a page: it is the stack of them.
       */}
      <div
        ref={rootRef}
        data-order-form-root
        className="@container flex w-full max-w-[880px] flex-none flex-col gap-8"
      >
        {/* ══════════ PAGE 1 — the order form ══════════════════════════════════════════════ */}
        <Sheet>
          {/* ─── BAND 1 — header ────────────────────────────────────────────────────────── */}
          <div className="flex flex-none gap-1 order-form-band-header">
            {/* Spans the spine, the gap and the left column together, so its right edge lands on
                Rail Sections' and Laminating's — see order-form.css's column-geometry block. */}
            <div className="order-form-logo-col min-w-0">
              <LogoBlock />
            </div>

            <RailLabel>Rider Info</RailLabel>

            {/* `justify-between` rather than a stack at the top: with the shaper's box gone to page
                2 the rider fields have more height than they need, and an order form would rather
                spend it on the gaps between ruled lines — these get written on by hand. */}
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 py-0.5">
              <OrderFormField label="Name" />
              <OrderFormField label="Ph #" />
              <div className="flex gap-3">
                <OrderFormField label="Height" className="flex-1" />
                <OrderFormField label="Weight" className="flex-1" />
              </div>
            </div>
          </div>

          {/* ─── BAND 2 — surfboard shape and design ────────────────────────────────────── */}
          <div className="flex min-h-0 flex-1 gap-1">
            <RailLabel>Surfboard Shape and Design</RailLabel>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
              {/* Dimensions. Volume rides along at the end of the row: it is this app's headline
                  calculated number and a shaper reads it in exactly the same breath as the
                  thickness, even though the paper muse has no cell for it. */}
              <div className="flex flex-none rounded-[3px] border border-surf-black order-form-band-dims">
                <DimensionCell label="Length" value={formatFeetInches(outline.length)} />
                <DimensionCell
                  label="Nose"
                  value={formatInchesFraction(outlineGeometry.noseWidthAt12in)}
                />
                {/* Widepoint and its offset, not a "center width". The muse's `CENTER` cell assumes
                    the widest point IS the middle of the board, which is only true of a board whose
                    offset happens to be zero — and the offset is an input a shaper sets deliberately.
                    Reporting the width without saying where along the board it was measured leaves
                    the sheet's most-used marking number ambiguous. Both come straight from the
                    outline spec, in the same signed form the outline editor's Offset slider shows. */}
                <DimensionCell
                  label="Widepoint"
                  value={formatInchesFraction(outline.widePointWidth)}
                />
                <DimensionCell
                  label="Offset"
                  value={formatSignedInchesFraction(outline.widePointOffset)}
                />
                <DimensionCell
                  label="Tail"
                  value={formatInchesFraction(outlineGeometry.tailWidthAt12in)}
                />
                <DimensionCell label="Thickness" value={thicknessDisplay} />
                <DimensionCell
                  label="Volume"
                  value={`${volumeResult.volumeLitres.toFixed(1)} L`}
                />
              </div>

              {/* The drawings row: the rail cross-sections down the left third, the template
                  window filling the rest. */}
              <div className="flex min-h-0 flex-1 gap-1">
                {/* The plots are stacked now rather than laid side by side, which is what the left
                    column buys them: each is a third of the sheet wide instead of a ninth, and each
                    gets its own caption since they are no longer read left-to-right. Their numbers
                    are on page 2. */}
                <FormBox
                  caption="Rail Sections"
                  captionRight="overleaf"
                  className="order-form-left-col min-w-0"
                  bodyClassName="gap-1 p-1"
                >
                  {SECTION_KEYS.map((key) => (
                    <div key={key} className="flex min-h-0 flex-1 flex-col justify-center">
                      <div className="flex-none font-display font-extrabold tracking-architectural text-surf-muted uppercase order-form-micro">
                        {SECTION_TITLE[key]}
                      </div>
                      <div className="flex min-h-0 flex-1 items-center justify-center">
                        <RailSectionPlot
                          sectionKey={key}
                          output={railBands[key]}
                          xAxisMin={sharedXAxisMin}
                          fit="height"
                        />
                      </div>
                    </div>
                  ))}
                </FormBox>

              {/* The right-hand column: the rocker strip over the template window. */}
              <div className="flex min-h-0 min-w-0 flex-[2] flex-col gap-1">
{/* Rocker — a placeholder box, exactly as the muse draws it, until the rocker
                     screen exists to fill it. Kept rather than dropped so the sheet's proportions
                     do not have to be redrawn when that feature lands.

                     It sits above the template window and only as wide as it, rather than spanning
                     the whole body: a rocker profile is the board seen from the side, so the one
                     panel it belongs over is the one showing the board from above. Narrowing it also
                     let the rail plots take the full height of the row beside it. */}
                <FormBox
                  caption="Rocker"
                  captionRight="placeholder"
                  className="flex-none order-form-rocker"
                  bodyClassName="p-0"
                >
                  <div className="flex min-h-0 flex-1 items-stretch gap-1 px-1.5 py-1">
                    {/* The muse's own placeholder: a nose/tail rocker height ticked either side of a
                        drawn profile. Kept whole so the box does not have to be redrawn when the
                        rocker screen fills it — only its contents get replaced. */}
                    <RockerTicks />
                    <div className="relative min-h-0 min-w-0 flex-1">
                      <svg
                        viewBox="0 0 600 80"
                        preserveAspectRatio="none"
                        className="absolute inset-0 block h-full w-full"
                      >
                        <path
                          d="M 10 14 Q 150 60 300 64 Q 450 60 590 22"
                          fill="none"
                          stroke="var(--color-surf-muted)"
                          strokeWidth={2}
                          strokeDasharray="7 5"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                      <span className="absolute bottom-0 left-1 font-display font-extrabold tracking-architectural text-surf-muted uppercase order-form-micro">
                        Nose
                      </span>
                      <span className="absolute right-1 bottom-0 font-display font-extrabold tracking-architectural text-surf-muted uppercase order-form-micro">
                        Tail
                      </span>
                    </div>
                    <RockerTicks />
                  </div>
                </FormBox>

                {/*
                 * The muse's own big panel, and its own name for it — the template window.
               *
               * Its frame is fixed (`fixedFrame` on the viewer below), sized once from the board
               * ranges in `lib/geometry/board.ts` so one window holds any board the editor can
               * produce. The board inside still fits the window's height, so every board prints as
               * large as the window allows; what a narrower or shorter board leaves behind is blank
               * paper inside the frame — which on this panel is exactly where the colour design
               * gets drawn.
               *
               * Three theming overrides, all of them turning editor affordances back into plain
               * draughtsmanship, because this panel is a template to mark a blank from rather
               * than a screen to design on:
               *
               * - `--outline-board-fill` — the interior wash. globals.css already suppresses this
               *   token for print, on the grounds that ink inside the outline is wasted on a
               *   template meant to be cut along and marked on. This sheet is that template
               *   wherever it is looked at, so the override only brings the screen into line with
               *   what already prints, leaving both drawings defined by their stroke alone.
               * - `--outline-widepoint-line` — the widepoint station arrives rose, to set it
               *   apart from the drag handles it sits among on the editor. Here there are no
               *   handles, and one ink reads as a drawing rather than as an interface.
               * - `--outline-widepoint-knot` — the two rail knots, gone. They carry no stroke, so
               *   a transparent fill removes them outright.
               *
               * `--outline-widepoint-dash` is deliberately NOT overridden. The viewer's own note
               * on these lines is that a widepoint near centre lands within a few pixels of the
               * mid-length centreline, and that colour was what told the two apart. With the
               * colour now matched, the dash is the only thing still doing that job.
               *
               * Tokens rather than another `OutlineViewer` prop: this is retheming, which is what
               * the tokens are for, and that component already carries five display gates.
               */}
              <FormBox
                  caption="Color Design &amp; Logos"
                  captionRight="dimensions above"
                  variant="flush"
                  className="min-h-0 min-w-0 flex-1"
                bodyClassName="p-1.5"
                style={
                  {
                    "--outline-board-fill": "transparent",
                    "--outline-widepoint-line": "var(--outline-station-line)",
                    "--outline-widepoint-knot": "transparent",
                  } as CSSProperties
                }
              >
                <div className="flex min-h-0 min-w-0 flex-1 flex-row gap-3">
                  <OutlineHalf label="Deck">
                    <OutlineViewer
                      geometry={outlineGeometry}
                      outline={outline}
                      showConstruction={false}
                      // Dimensions have their own row on this sheet, so the drawings carry none —
                      // and the deck side carries no fin marks either: fins are cut from the bottom.
                      // The faint interior lines stay, though: a shaper marking a blank works off
                      // the stringer and the stations, and those are drawing, not annotation.
                      hideCallouts
                      showStationLines
                      fixedFrame
                      hideFinMarks
                    />
                  </OutlineHalf>

                  <OutlineHalf label="Bottom">
                    <OutlineViewer
                      geometry={outlineGeometry}
                      outline={outline}
                      showConstruction={false}
                      hideCallouts
                      showStationLines
                      fixedFrame
                      finMarks={finPlacement.marks}
                    />
                  </OutlineHalf>
                  </div>
                </FormBox>
              </div>
            </div>
          </div>
        </div>

        {/* ─── BAND 3 — glassing ──────────────────────────────────────────────────────── */}
          <div className="flex flex-none gap-1 order-form-band-glassing">
            <RailLabel>Glassing</RailLabel>

            {/* The boxes sit in a content column rather than directly in the band, so this row has
                the drawings row's inner width and `order-form-left-col` means the same number of
                pixels in both — which is what puts Laminating's right edge under Rail Sections'. */}
            <div className="flex min-w-0 flex-1 gap-1">
              <FormBox
                caption="Laminating"
                className="order-form-left-col min-w-0"
                bodyClassName="justify-center gap-2 p-2"
              >
                <OrderFormField label="Deck" placeholder="Choose weight" />
                <OrderFormField label="Bottom" placeholder="Choose weight" />
              </FormBox>

              {/* The muse's FIN SETUP checkboxes are gone: which fins go on the board is designed on
                  the fins screen and drawn on the Bottom panel above. What is left is the box
                  hardware the glasser installs, which is genuinely an ordering choice. */}
              <FormBox
                caption="Fin System"
                className="min-w-0 flex-1"
                bodyClassName="justify-center gap-1 p-2"
              >
                <select
                  value={finSystem}
                  onChange={(e) => setFinSystem(e.target.value as FinSystem)}
                  className="w-full rounded-[2px] border border-surf-black bg-surf-base px-1.5 py-1 font-bold text-surf-black outline-none focus:border-surf-accent-cyan-ink order-form-value"
                >
                  {FIN_SYSTEMS.map((sys) => (
                    <option key={sys.value} value={sys.value}>
                      {sys.label}
                    </option>
                  ))}
                </select>
                <div className="text-surf-muted order-form-micro">
                  {finSetupLabel} · from the fins screen
                </div>
              </FormBox>

              {/* Leash and finish were one box of four ticks in two rows. They are separate jobs —
                  one is hardware set into the blank, the other is how the glass gets taken down —
                  and at a third of the row there is no width for two ticks across anyway. */}
              <FormBox
                caption="Leash"
                className="min-w-0 flex-1"
                bodyClassName="justify-center gap-2 p-2"
              >
                <OrderFormTick label="Leash Cup" />
                <OrderFormTick label="Drill Hole" />
              </FormBox>

              <FormBox
                caption="Finish"
                className="min-w-0 flex-1"
                bodyClassName="justify-center gap-2 p-2"
              >
                <OrderFormTick label="Sanded" />
                <OrderFormTick label="Gloss &amp; Polish" />
              </FormBox>
            </div>
          </div>

          <PageMark page={1} title="Custom Surfboard Order" />
        </Sheet>

        {/* ══════════ PAGE 2 — the shaper's reference ══════════════════════════════════════ */}
        <Sheet variant="reference">
          {/*
           * A back page comes off the printer as a loose sheet and gets carried to the blank on its
           * own, so it has to say which board it belongs to without the front in hand. Board name
           * and the four numbers that identify a board — nothing a shaper would have to cross-check
           * against page 1.
           */}
          <div className="flex flex-none items-baseline justify-between gap-3 border-b-[1.5px] border-surf-black pb-1 order-form-band-refhead">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="font-display font-extrabold tracking-architectural text-surf-black uppercase leading-none order-form-wordmark">
                Shaper
              </span>
              <span className="truncate font-bold text-surf-black order-form-value">
                {boardName || "Unnamed board"}
              </span>
            </div>
            <span className="flex-none font-bold text-surf-muted order-form-value">
              {formatFeetInches(outline.length)} · {formatInchesFraction(outline.widePointWidth)} ·{" "}
              {thicknessDisplay} · {volumeResult.volumeLitres.toFixed(1)} L
            </span>
          </div>

          <div className="flex min-h-0 flex-1 gap-1">
            <RailLabel>Shaping Data</RailLabel>

            {/* Stacked, not side by side. This is the whole point of the second sheet: on the front
                these were two narrow columns either side of the drawings, and the type they could
                afford there was smaller than a number you cut foam to has any business being. One
                above the other, each gets the full width of the page as well as a large share of its
                height — and the reading order matches the order a blank gets worked: bands marked
                first, fins set last. */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
              <FormBox
                caption="Rail Bands"
                captionRight="plots overleaf"
                className="min-h-0 min-w-0 flex-[1.6]"
                bodyClassName="p-2"
              >
                <RailDataTable sections={sections} compact />
              </FormBox>

              <FormBox
                caption="Fin Placement"
                captionRight={finSetupLabel}
                className="min-h-0 min-w-0 flex-1"
                bodyClassName="gap-1 overflow-hidden p-2"
              >
                {/*
                 * Two columns, so a row's label stays within reading distance of its measurement.
                 * At full page width a single column puts them at opposite edges, which is the shape
                 * that makes a reader's eye slip a line — and a shaper reading the wrong fin number
                 * off this sheet drills the wrong hole.
                 *
                 * A GRID, not CSS `columns`. Multi-column was the first attempt, on the reasoning
                 * that it adapts to a section count that is not fixed — one section for a single fin,
                 * two for a thruster, three for a quad with its centre fin. It does adapt, but in a
                 * fixed-height box it adapts SIDEWAYS: the third section spilled into a third column
                 * 697px off the edge of the sheet, where `overflow: hidden` erased it. A quad's
                 * centre fin silently had no numbers at all.
                 *
                 * The column COUNT follows the section count, so every section sits in one row and
                 * the panel's height is set by the tallest section rather than by stacked rows. Two
                 * fixed columns wrapped a quad's third section onto a second row that needed 156px
                 * more height than this panel has. Three columns across 688px still leaves each
                 * label beside its own number, which was the whole reason for columns.
                 *
                 * Capped at three: a fourth would be narrower than the numbers deserve, and would
                 * rather wrap.
                 */}
                <div
                  data-print-unfold
                  className="grid min-h-0 flex-1 items-start gap-x-6 overflow-hidden"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(finPlacement.sections.length, 3)}, minmax(0, 1fr))`,
                  }}
                >
                {finPlacement.sections.map((sec) => (
                  <div key={sec.label} className="mb-2 last:mb-0">
                    <div className="mb-0.5 border-b border-surf-black font-display font-extrabold tracking-architectural text-surf-black uppercase order-form-group">
                      {sec.label}
                    </div>
                    {sec.groups.map((grp) => (
                      <div key={grp.heading} className="mb-1 last:mb-0">
                        <div className="font-bold text-surf-muted uppercase order-form-micro">
                          {grp.heading}
                        </div>
                        {grp.rows.map((row) => (
                          <div
                            key={row.label}
                            className="flex justify-between gap-1 border-b border-surf-muted/25 leading-tight order-form-row"
                          >
                            <span className="truncate text-surf-muted">{row.label}</span>
                            <span className="flex-none font-bold text-surf-black">
                              {formatInchesFraction(row.value, 16)}
                            </span>
                          </div>
                        ))}
                        {grp.fullSpread !== null && (
                          <div className="flex justify-between gap-1 border-b border-surf-muted/25 leading-tight order-form-row">
                            <span className="truncate text-surf-muted">Full Spread</span>
                            <span className="flex-none font-bold text-surf-black">
                              {formatInchesFraction(grp.fullSpread, 16)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                </div>
                {/* Outside the columned container on purpose: the notes qualify every number in the
                    panel, so flowing them as one more column item — landing them under whichever
                    section happened to end last — would read as a footnote to that section alone. */}
                {finPlacement.notes.length > 0 && (
                  <div className="flex-none border-t border-surf-muted/25 pt-1 text-surf-muted order-form-micro">
                    {finPlacement.notes.map((note) => (
                      <div key={note}>{note}</div>
                    ))}
                  </div>
                )}
              </FormBox>

              {/*
               * The muse keeps this box in the header, where the shop fills it in as the order is
               * taken. It sits here instead because this whole page is the shaper's — the front is
               * the customer's copy of what they asked for, and the blank number, the price and the
               * rocker the blank came off are the shop's own record of the job.
               *
               * It lands at the foot of the page rather than the top on purpose: the tables above
               * are what a shaper reads *while* working the blank, and this is what gets filled in
               * before and after. It also puts the sheet's white space to use.
               */}
              <FormBox
                caption="Shaper Use Only"
                className="flex-none bg-(--order-form-shade)"
                bodyClassName="gap-2 p-2"
              >
                {/* Board Name is live (the store has carried it since the landscape summary); the
                    rest of this box is written in by the shop. */}
                <OrderFormField
                  label="Board Name"
                  value={boardName}
                  onChange={setBoardName}
                  placeholder="Name this board"
                />
                <div className="flex gap-6">
                  <OrderFormField label="Blank &amp; Rocker" className="flex-[1.4]" />
                  <OrderFormField label="Board #" className="flex-1" />
                  <OrderFormField label="Price" prefix="$" className="flex-1" />
                </div>
              </FormBox>
            </div>
          </div>

          <PageMark page={2} title="Shaper Reference" />
        </Sheet>
      </div>

      {/* Below the paper, and never on it. */}
      <div data-print-hide className="mt-4 flex flex-none items-center gap-3">
        <Button
          type="button"
          onClick={printOrderForm}
          className="border-surf-black bg-surf-accent-cyan text-surf-black hover:bg-surf-accent-cyan/85"
        >
          Print Order Form
        </Button>
        <span className="text-xs text-surf-muted">
          Two portrait pages — print double-sided for a front-and-back form.
        </span>
      </div>
    </div>
  );
}
