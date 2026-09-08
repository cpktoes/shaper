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

import { useEffect, useState, type CSSProperties } from "react";
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

/** Measures the live CSS px-per-inch once the dialog is actually open — measuring while the
 * dialog is closed (`display: none`) would read back zero and always fall back. */
function useMeasuredPxPerInch(active: boolean): number {
  const [pxPerInch, setPxPerInch] = useState(96);
  useEffect(() => {
    if (!active) return;
    setPxPerInch(measurePxPerInch());
  }, [active]);
  return pxPerInch;
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

  const pxPerInch = useMeasuredPxPerInch(open);

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
        <DialogHeader data-print-hide>
          <DialogTitle className="text-surf-ink">{SECTION_TITLE[activeSection]} Rail — Actual Size</DialogTitle>
        </DialogHeader>

        <TabbedPanel tabs={tabs} active={activeSection} onSelect={setActiveSection} panelClassName="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surf-line-faint pb-3">
            <p className="max-w-md text-sm text-surf-ink-muted">
              {"This assumes a standard screen at 100% zoom — check it against the bar below."}
            </p>
            <div className="flex flex-none flex-col items-center gap-1">
              <div
                data-actual-size-box="check-bar"
                className="h-1.5 rounded-full bg-[var(--color-surf-ink)]"
                style={
                  {
                    width: `${checkBarWidthIn * pxPerInch}px`,
                    "--vfs-w-in": checkBarWidthIn,
                  } as CSSProperties
                }
              />
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
