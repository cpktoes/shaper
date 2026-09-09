"use client";

/**
 * The "View Full Sized" dialog (RAIL-04, D-12–D-16): the VIEWER tab's rail cross-section drawn at
 * true, physical scale, so a shaper can hold a ruler or a scrap of foam against the screen. One
 * toolbar button opens it (`rail-band-editor.tsx`); Nose/Center/Tail tabs inside let a shaper flip
 * between rails without closing the dialog. It always offers all three tabs — a rail's band data
 * is computed even when its plot is hidden on VIEWER — opening on the first section whose sidebar
 * disclosure is open, Nose then Center then Tail, or Nose if every section is collapsed.
 *
 * Renders through the same `RailSectionPlot` every other rail drawing in this app shares — no
 * second plot component — but sized in explicit CSS pixels equal to the drawing's real inches
 * times a locally measured px-per-inch, never a percentage viewBox fit and never a multiply by the
 * browser's device pixel ratio. The drawing is never scaled down to fit the dialog: if a rail's
 * true size exceeds the dialog's available area, the plot's own container scrolls instead.
 */

import { useCallback, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TabbedPanel, type PanelTab } from "@/components/viewer/tabbed-panel";
import { useUnits } from "@/components/units-provider";
import { formatCalibrationMark } from "@/lib/geometry/measure-display";
import type { RailBandsOutput, RailSectionKey } from "@/lib/geometry/rail-bands";
import { inchesToMm, mmToInches, type Mm } from "@/lib/geometry/units";
import { RailSectionPlot, SCALE, buildRailLegend, computeRailPlotBounds } from "./rail-section-plot";

const SECTION_ORDER: RailSectionKey[] = ["nose", "center", "tail"];
const SECTION_TITLE: Record<RailSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };

/** The first section whose sidebar disclosure is open, Nose then Center then Tail order — Nose
 * when every section is collapsed, so the dialog is never a zero- or one-tab surface (UI-SPEC,
 * "Default tab"). */
function firstOpenSection(sectionOpen: Record<RailSectionKey, boolean>): RailSectionKey {
  return SECTION_ORDER.find((key) => sectionOpen[key]) ?? "nose";
}

/**
 * The Full Sized Template's own scale-check measurement, derived the same way rather than
 * hand-typed — neither jsPDF builder exports its own copy of this constant, and D-14's whole point
 * is that this bar and that square agree, so this dialog derives the identical value through
 * `lib/geometry/units.ts` instead of reaching into `components/template/*`, which stays untouched.
 */
const CHECK_BAR_MM: Mm = inchesToMm(2);

/**
 * CSS px per inch, measured rather than assumed — a live 1in-wide probe element, read and removed.
 * A screen has no guaranteed relationship between a CSS inch and a real one (browser zoom, an
 * uncalibrated display), so this is measured on the fly rather than trusting the CSS-spec value.
 * Falls back to that CSS-spec value (96) only when the measurement comes back non-positive
 * (T-08-12) — the same guard the app's own print-fit sizing already uses for the same reason,
 * replicated locally here rather than imported: that module scales printed PAGES to fit paper,
 * this one scales a drawing to true size, and CLAUDE.md names that module's own copy of this
 * technique as a sanctioned exception rather than a shared utility.
 */
function measurePxPerInch(): number {
  const probe = document.createElement("div");
  probe.style.cssText = "width:1in;height:0;position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px > 0 ? px : 96;
}

/** Measures the live CSS px-per-inch when the element this ref is attached to mounts. The probe
 * itself is appended to `document.body`, not to the dialog, so it would read correctly at any
 * moment — tying the reading to this element's mount is purely for freshness, so a shaper who
 * changes browser zoom and reopens the dialog gets a new reading rather than a stale one. The
 * returned callback is deliberately stable (an empty dependency array): React re-attaches a ref
 * callback whenever its identity changes, so an inline arrow here would remeasure on every render
 * while the dialog sits open, not just once per open. */
function useMeasuredPxPerInch(): [number, (node: Element | null) => void] {
  const [pxPerInch, setPxPerInch] = useState(96);
  const measureRef = useCallback((node: Element | null) => {
    if (node) {
      setPxPerInch(measurePxPerInch());
    }
  }, []);
  return [pxPerInch, measureRef];
}

export interface ViewFullSizedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The three sections' already-computed rail outputs — the same `bands` the VIEWER tab reads. */
  bands: RailBandsOutput;
  /** The smallest xAxisMin across the VIEWER's open sections, so this dialog's drawing shares the
   * VIEWER's own axis rather than a second, possibly-disagreeing one. */
  sharedXAxisMin: Mm;
  /** The sidebar's own open/collapsed record — read only to pick the dialog's default tab; a
   * collapsed section's rail is still drawn here, since its band data is always computed. */
  sectionOpen: Record<RailSectionKey, boolean>;
}

export function ViewFullSizedDialog({
  open,
  onOpenChange,
  bands,
  sharedXAxisMin,
  sectionOpen,
}: ViewFullSizedDialogProps) {
  const { system } = useUnits();
  const [activeSection, setActiveSection] = useState<RailSectionKey>(() => firstOpenSection(sectionOpen));

  // Re-picks the default tab every time the dialog transitions from closed to open — a render-
  // phase reset, the same pattern components/template/export-preview-dialog.tsx's own `wasOpen`
  // uses to re-arm state on a fresh open rather than inside a useEffect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setActiveSection(firstOpenSection(sectionOpen));
  }

  const [pxPerInch, measureRef] = useMeasuredPxPerInch();

  const output = bands[activeSection];
  const bounds = computeRailPlotBounds(output, sharedXAxisMin);
  // The plot's own viewBox width/height are expressed in SCALE units per real inch (chrome
  // padding for the axis-tick labels included) — dividing by SCALE recovers the drawing's true
  // physical size, in inches, chrome and all, so scaling the WHOLE box by the measured
  // px-per-inch below reproduces every part of it — segments, grid and chrome alike — at true
  // scale, rather than only the segments while the chrome eats into that scale.
  const plotWidthIn = bounds.width / SCALE;
  const plotHeightIn = bounds.height / SCALE;
  const checkBarWidthIn = mmToInches(CHECK_BAR_MM);
  const legend = buildRailLegend(output);

  const tabs: PanelTab<RailSectionKey>[] = SECTION_ORDER.map((key) => ({ id: key, label: SECTION_TITLE[key] }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-view-full-sized-dialog
        className="max-w-[95vw] sm:max-w-3xl max-h-[90dvh] overflow-y-auto border-surf-line-faint bg-surf-panel text-surf-ink"
      >
        {/* A page shaped to fit the drawing without shrinking it (G-08-5). The true-size rail
         * can run 8.69in wide for the default board — wider than portrait Letter or A4's
         * printable width — and an over-wide page makes Chrome auto-shrink the WHOLE page
         * (measured at 82%), which no print-dialog setting turns off. Landscape gives 10.37in
         * on Letter and 11.06in on A4 at this 8mm margin, comfortably clear of 8.69in.
         *
         * `@page` cannot be scoped by a CSS selector, so it can't live in actual-size.css
         * without making every rails-screen print landscape (breaking WR-01's closed-dialog
         * no-op). Rendered here instead: Base UI mounts this popup only while the dialog is
         * open, so this rule exists in the document exactly as long as the dialog does.
         *
         * Deliberately a plain, unadorned style element — no `href`, no stylesheet-precedence
         * prop. Either one would make React 19 hoist this into the document head and leave it
         * there after the dialog unmounts, silently turning every LATER rails print landscape
         * too. An ordinary in-place element unmounts with the dialog, taking the rule with it.
         *
         * The second rule undoes the popup's on-screen centring for print. components/ui/dialog.tsx
         * centres the popup with Tailwind's `-translate-x-1/2 -translate-y-1/2`, which Tailwind v4
         * compiles to the CSS `translate` property, not `transform` — so actual-size.css's
         * `transform: none` alone leaves the popup half its own width and height off the page
         * (measured on the as-shipped print at x −417px / y −124px). The reset can't live in
         * actual-size.css either: the CSS pipeline that compiles that stylesheet (Lightning CSS)
         * folds `translate: none` into `transform: translate(0, 0)` — measured in both the dev and
         * the production output — so the browser never sees a `translate` declaration and the
         * offset stays. This string reaches the browser verbatim, untouched by that pipeline. */}
        <style>
          {[
            "@page { size: landscape; margin: 8mm; }",
            "@media print { [data-view-full-sized-dialog] { translate: none !important; } }",
          ].join("\n")}
        </style>

        <DialogHeader data-print-hide>
          <DialogTitle className="text-surf-ink">{SECTION_TITLE[activeSection]} Rail — Actual Size</DialogTitle>
        </DialogHeader>

        <TabbedPanel tabs={tabs} active={activeSection} onSelect={setActiveSection} panelClassName="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surf-line-faint pb-3">
            <p className="max-w-md text-sm text-surf-ink-muted">
              {"This assumes a standard screen at 100% zoom — check it against the bar below."}
            </p>
            <div className="flex flex-none flex-col items-center gap-1">
              {/* Drawn as SVG paint (a `<rect fill>`), not a painted-on background colour. A
               * background colour is dropped from the printed page by default in Chrome and
               * Safari — a shaper has to tick "Background graphics" / "Print backgrounds" for it
               * to survive, which is off by default and is the whole reason this bar printed as
               * caption-only-no-bar until the shaper reported it on 2026-09-08. A `fill` is
               * foreground ink, so it prints unconditionally. app/design/summary/order-form.css
               * takes the other route (`print-color-adjust: exact`) for its page shading; that
               * route is deliberately not used here, because a scale-check reference a shaper
               * measures with a ruler must not depend on a property a print pipeline may ignore.
               *
               * No `viewBox`: the rect's `width="100%" height="100%"` resolves against the svg's
               * own box, so when actual-size.css swaps that box from a screen pixel width to the
               * printed `2in`, the rect follows with nothing else to keep in step. A viewBox
               * would insert a scale factor between the printed inch and what is drawn. */}
              <svg
                data-actual-size-box="check-bar"
                ref={measureRef}
                className="block h-1.5 text-surf-ink"
                aria-hidden
                style={
                  {
                    width: `${checkBarWidthIn * pxPerInch}px`,
                    "--vfs-w-in": checkBarWidthIn,
                  } as CSSProperties
                }
              >
                <rect x="0" y="0" width="100%" height="100%" rx="3" ry="3" fill="currentColor" />
              </svg>
              <span className="text-xs text-surf-ink-muted">Check bar: {formatCalibrationMark(CHECK_BAR_MM, system)}</span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-auto py-3">
            <div
              data-actual-size-box="plot"
              style={
                {
                  width: `${plotWidthIn * pxPerInch}px`,
                  height: `${plotHeightIn * pxPerInch}px`,
                  "--vfs-w-in": plotWidthIn,
                  "--vfs-h-in": plotHeightIn,
                } as CSSProperties
              }
            >
              <RailSectionPlot sectionKey={activeSection} output={output} xAxisMin={sharedXAxisMin} fit="width" />
            </div>

            {legend.length > 0 && (
              <div className="flex flex-none flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {legend.map((entry) => (
                  <span key={entry.label} className="flex items-center gap-1.5 text-[10px] text-surf-ink-muted">
                    <span
                      className="inline-block h-[9px] w-[9px] flex-shrink-0 rounded-full"
                      style={{ background: entry.color }}
                    />
                    {entry.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </TabbedPanel>

        <DialogFooter data-print-hide className="sm:justify-between">
          <p className="text-sm text-surf-ink-muted">
            {"In your print dialog, turn off 'Fit to page' — scaling to fit would break the true size."}
          </p>
          <Button
            type="button"
            onClick={() => window.print()}
            className="border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85"
          >
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
