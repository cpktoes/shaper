"use client";

/**
 * The Summary screen as a **shop order form** — one portrait page, laid out like the paper form a
 * custom board actually gets ordered on (`LB_order_form.pdf`, Kontoes Surfboards) rather than like
 * a dashboard.
 *
 * The muse's structure is kept intact, because it is what makes the sheet legible to someone who
 * has filled one in before: a boxed header (shop identity, `RIDER INFO`, a `SHAPER USE ONLY`
 * sub-box), a `SURFBOARD SHAPE AND DESIGN` body with vertical spine labels down the left edge, and
 * a `GLASSING` band across the bottom. What changes is that the panels a shaper would have ticked
 * or sketched by hand are replaced by this app's calculated output:
 *
 * - `TAIL SHAPE` is gone — the tail is built into the outline, so ticking it would be a second,
 *   disagreeable source of truth.
 * - `CONTOURS`/`RAILS` checkboxes become the real rail section plots and the rail band marking
 *   data — the numbers a shaper cuts foam to.
 * - `FIN SETUP` checkboxes become a fin *system* selector, since which fins go on the board is
 *   now designed on the fins screen; only the box hardware is still an ordering choice.
 * - `ROCKER` stays a placeholder box until the rocker screen exists.
 *
 * Every calculated value is read from the shared design store (`components/design/design-store.tsx`)
 * and rendered through the *existing* view components — `OutlineViewer`, `RailSectionPlot`,
 * `RailDataTable`. No panel here reimplements a view or redoes a calculation, so a printed number
 * cannot drift from the screen it came from.
 *
 * **Sizing.** The sheet is a fixed portrait aspect box whose type scales with its own width in
 * `cqw` units (see `app/design/summary/order-form.css`). That is what lets the same layout be
 * measured on screen and printed to paper: `useOrderFormPrintFit` pins the sheet to the printable
 * page box before measuring, and because the type is tied to the *container* rather than the
 * viewport, the layout it measures is the layout that prints.
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
 * One cell of the dimensions row — an ALL-CAPS caption over the measurement, the muse's
 * `LENGTH: / NOSE: / CENTER: / TAIL: / THICKNESS:` strip.
 */
function DimensionCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-[1px] border-r border-surf-black px-1.5 py-1 last:border-r-0">
      <span className="font-display font-extrabold tracking-architectural text-surf-muted uppercase leading-none order-form-caption">
        {label}
      </span>
      <span className="truncate font-extrabold text-surf-black leading-none order-form-dim">{value}</span>
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
 * One drawing inside the shared outline panel, captioned beneath it the way the paper muse
 * captions its own pair.
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

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-surf-muted/10 px-6 py-8">
      {/*
       * Two nested elements, deliberately. The outer one is the `@container` the sheet's type
       * queries — a container query never matches the container itself — and it is also what
       * `useOrderFormPrintFit` pins to the printable page box. The inner one is the paper.
       */}
      <div ref={rootRef} data-order-form-root className="@container w-full max-w-[880px] flex-none">
        <div
          data-order-form-sheet
          className="flex flex-col gap-1 border-[1.5px] border-surf-black bg-surf-base p-1.5"
        >
          {/* ─── BAND 1 — header ────────────────────────────────────────────────────────── */}
          <div className="flex flex-none gap-1 order-form-band-header">
            <div className="w-[34%] min-w-0">
              <LogoBlock />
            </div>

            <RailLabel>Rider Info</RailLabel>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <OrderFormField label="Name" />
              <OrderFormField label="Ph #" />
              <div className="flex gap-3">
                <OrderFormField label="Height" className="flex-1" />
                <OrderFormField label="Weight" className="flex-1" />
              </div>

              <FormBox
                caption="Shaper Use Only"
                className="mt-auto bg-surf-muted/10"
                bodyClassName="gap-1 p-1.5"
              >
                {/* Board Name is live (the store has carried it since the landscape summary); the
                    rest of this box is written in by the shop. */}
                <OrderFormField
                  label="Board Name"
                  value={boardName}
                  onChange={setBoardName}
                  placeholder="Name this board"
                />
                <div className="flex gap-3">
                  <OrderFormField label="Blank &amp; Rocker" className="flex-[1.4]" />
                  <OrderFormField label="Board #" className="flex-1" />
                  <OrderFormField label="Price" prefix="$" className="flex-1" />
                </div>
              </FormBox>
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
                  label="WP Offset"
                  value={formatSignedInchesFraction(outline.widePointOffset)}
                />
                <DimensionCell
                  label="Tail"
                  value={formatInchesFraction(outlineGeometry.tailWidthAt12in)}
                />
                <DimensionCell
                  label="Thickness"
                  value={formatInchesFraction(railBands.center.boardThickness)}
                />
                <DimensionCell
                  label="Volume"
                  value={`${volumeResult.volumeLitres.toFixed(1)} L`}
                />
              </div>

              {/* Rocker — a placeholder box, exactly as the muse draws it, until the rocker screen
                  exists to fill it. Kept rather than dropped so the sheet's proportions do not have
                  to be redrawn when that feature lands. */}
              <FormBox
                caption="Rocker"
                captionRight="added with the rocker screen"
                className="flex-none order-form-band-rocker"
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

              {/* The body row: marking data, the two board drawings, the fin numbers. */}
              <div className="flex min-h-0 flex-1 gap-1">
                <FormBox
                  caption="Rail Bands"
                  captionRight="marking data"
                  className="min-w-0 flex-[2.5]"
                  bodyClassName="p-1"
                >
                  <RailDataTable sections={sections} compact />
                </FormBox>

                {/*
                 * Deck and bottom share one box rather than taking a box each: two captions, two
                 * borders and two sets of padding for what a shaper reads as a single pair of
                 * views is chrome the sheet cannot spare, and the width it gives back goes to the
                 * marking data and the fin numbers either side.
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
                  caption="Outline"
                  captionRight="no dimensions — see above"
                  variant="flush"
                  className="min-w-0 flex-[2.1]"
                  bodyClassName="flex-row gap-1 p-1"
                  style={
                    {
                      "--outline-board-fill": "transparent",
                      "--outline-widepoint-line": "var(--outline-station-line)",
                      "--outline-widepoint-knot": "transparent",
                    } as CSSProperties
                  }
                >
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
                      cropToBoard
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
                      cropToBoard
                      finMarks={finPlacement.marks}
                    />
                  </OutlineHalf>
                </FormBox>

                {/* The fin numbers sit next to the drawing that carries the fin marks, so the
                    table and the picture it describes are read together. */}
                <FormBox
                  caption="Fin Placement"
                  captionRight={finSetupLabel}
                  className="min-w-0 flex-[2.3]"
                  bodyClassName="gap-1 overflow-y-auto p-1"
                >
                  <div data-print-unfold className="min-h-0 flex-1 overflow-y-auto">
                    {finPlacement.sections.map((sec) => (
                      <div key={sec.label} className="mb-1.5 last:mb-0">
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
                                className="flex justify-between gap-1 border-b border-surf-muted/25 order-form-row"
                              >
                                <span className="truncate text-surf-muted">{row.label}</span>
                                <span className="flex-none font-bold text-surf-black">
                                  {formatInchesFraction(row.value, 16)}
                                </span>
                              </div>
                            ))}
                            {grp.fullSpread !== null && (
                              <div className="flex justify-between gap-1 border-b border-surf-muted/25 order-form-row">
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
                </FormBox>
              </div>

              {/* The rail cross-sections, across the full width of the body. Side by side on one
                  shared axis they are directly comparable and the band stays short; stacked in a
                  column each plot would be a third of this width and three times this tall, which
                  a portrait page cannot spare. */}
              <FormBox
                caption="Rail Sections"
                captionRight="nose · center · tail"
                className="flex-none order-form-band-plots"
                bodyClassName="p-1"
              >
                <div className="flex min-h-0 flex-1 items-center justify-center gap-1">
                  {SECTION_KEYS.map((key) => (
                    <div
                      key={key}
                      className="flex h-full min-w-0 flex-1 items-center justify-center"
                    >
                      <RailSectionPlot
                        sectionKey={key}
                        output={railBands[key]}
                        xAxisMin={sharedXAxisMin}
                        fit="height"
                      />
                    </div>
                  ))}
                </div>
              </FormBox>
            </div>
          </div>

          {/* ─── BAND 3 — glassing ──────────────────────────────────────────────────────── */}
          <div className="flex flex-none gap-1 order-form-band-glassing">
            <RailLabel>Glassing</RailLabel>

            <FormBox caption="Laminating" className="min-w-0 flex-1" bodyClassName="gap-1.5 p-1.5">
              <OrderFormField label="Deck" placeholder="Choose weight" />
              <OrderFormField label="Bottom" placeholder="Choose weight" />
            </FormBox>

            {/* The muse's FIN SETUP checkboxes are gone: which fins go on the board is designed on
                the fins screen and drawn on the Bottom panel above. What is left is the box
                hardware the glasser installs, which is genuinely an ordering choice. */}
            <FormBox caption="Fin System" className="min-w-0 flex-1" bodyClassName="justify-center p-1.5">
              <select
                value={finSystem}
                onChange={(e) => setFinSystem(e.target.value as FinSystem)}
                className="w-full rounded-[2px] border border-surf-black bg-surf-base px-1.5 py-1 font-bold text-surf-black outline-none focus:border-surf-accent-blue order-form-value"
              >
                {FIN_SYSTEMS.map((sys) => (
                  <option key={sys.value} value={sys.value}>
                    {sys.label}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-surf-muted order-form-micro">
                {finSetupLabel} · designed on the fins screen
              </div>
            </FormBox>

            <FormBox caption="Finish" className="min-w-0 flex-1" bodyClassName="gap-1 p-1.5">
              <div className="flex gap-3">
                <OrderFormTick label="Leash Cup" />
                <OrderFormTick label="Drill Hole" />
              </div>
              <div className="flex gap-3">
                <OrderFormTick label="Sanded" />
                <OrderFormTick label="Gloss &amp; Polish" />
              </div>
            </FormBox>
          </div>
        </div>
      </div>

      {/* Below the paper, and never on it. */}
      <div data-print-hide className="mt-4 flex flex-none items-center gap-3">
        <Button
          type="button"
          onClick={printOrderForm}
          className="border-surf-accent-blue bg-surf-accent-blue text-surf-base hover:bg-surf-accent-blue/85"
        >
          Print Order Form
        </Button>
        <span className="text-xs text-surf-muted">Prints to one portrait page.</span>
      </div>
    </div>
  );
}
