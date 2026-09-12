"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Maximize2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewerToolbar, ViewerToolbarButton } from "@/components/viewer/toolbar-button";
import { useDesign } from "@/components/design/design-store";
import { DesignScreenShell } from "@/components/design/design-screen-shell";
import { type RailBandSpec, type RailSectionKey, type RailSectionSpec } from "@/lib/geometry/rail-bands";
import { mm, mmToInches, type Mm } from "@/lib/geometry/units";
import { RailControls } from "./rail-controls";
import { TabbedPanel } from "@/components/viewer/tabbed-panel";
import { RailDataTable } from "./rail-data-table";
import { RailInstructions } from "./rail-instructions";
import { RailSectionPlot, buildRailLegend, computeRailPlotBounds } from "./rail-section-plot";
import { ViewFullSizedDialog, firstOpenSection } from "./view-full-sized-dialog";

type RailPage = "viewer" | "data" | "instructions";

const SECTION_KEYS: RailSectionKey[] = ["nose", "center", "tail"];
const SECTION_TITLE: Record<RailSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };

// Sanity ceiling only. This was 420 — inherited from the per-plot `max-w-[420px]` class — which
// made it the *binding* constraint on every normal viewport: at 1200x800 the plots rendered 420
// wide inside an 800-wide column with height nowhere near binding, wasting 380px and keeping the
// axis labels small. The solver below already takes the min of container width and the
// height-derived width, so those are the real limits; this now only stops a plot ballooning on an
// ultrawide display.
const MAX_PLOT_W = 900;

/** Rounds a millimetre value to inches, 3 decimal places — matches outline-editor.tsx's own helper. */
function roundedInches(value: Mm): number {
  return Number(mmToInches(value).toFixed(3));
}

/** Builds a pasteable `RailSectionSpec` source block, nested `indent` spaces inside its caller. */
function buildSectionSource(spec: RailSectionSpec, indent: string): string {
  const pad = `${indent}  `;
  const cornerCutOffsetOverride =
    spec.cornerCutOffsetOverride === null ? "null" : `inchesToMm(${roundedInches(spec.cornerCutOffsetOverride)})`;
  const bottomTuck3Override =
    spec.bottomTuck3Override === null ? "null" : `inchesToMm(${roundedInches(spec.bottomTuck3Override)})`;

  return [
    "{",
    `${pad}boardThickness: inchesToMm(${roundedInches(spec.boardThickness)}),`,
    `${pad}deckPercent: ${spec.deckPercent},`,
    `${pad}family: ${spec.family},`,
    `${pad}ratioTopPercent: ${spec.ratioTopPercent},`,
    `${pad}symmetrical: ${spec.symmetrical},`,
    `${pad}cornerCutOffsetOverride: ${cornerCutOffsetOverride},`,
    `${pad}removeCornerCut: ${spec.removeCornerCut},`,
    `${pad}singleTuck: ${spec.singleTuck},`,
    `${pad}bottomTuck3Override: ${bottomTuck3Override},`,
    `${indent}}`,
  ].join("\n");
}

/** Builds a pasteable `BoardPreset["rails"]` source block from the live rail-band spec. */
function buildPresetSource(spec: RailBandSpec): string {
  return [
    "rails: {",
    `  nose: ${buildSectionSource(spec.nose, "  ")},`,
    `  center: ${buildSectionSource(spec.center, "  ")},`,
    `  tail: ${buildSectionSource(spec.tail, "  ")},`,
    `  tailHardEdge: ${spec.tailHardEdge},`,
    "},",
  ].join("\n");
}

/**
 * Reads the design state from the shared `DesignProvider` (components/design/design-store.tsx)
 * instead of owning it locally — this screen is one of four views onto a single board design.
 * UI-only state (which sections/Advanced disclosures are open, which page is active) stays local
 * — it never touches the design itself. Everything in `spec` is millimetres; inches exist only
 * inside the controls/plot/table where a label or slider value is rendered.
 *
 * Development-only: below `RailControls` this file also renders a "Copy preset values" button,
 * gated on `process.env.NODE_ENV === "development"` so the bundler dead-code-eliminates it from
 * production. It reads the live `rails` spec back out as pasteable `lib/geometry/presets.ts`
 * source — the Rails half of the same shaper-tuning capture loop as
 * components/outline/outline-editor.tsx (CONTEXT.md D-03).
 */
export function RailBandEditor() {
  const {
    rails,
    effectiveRails,
    railsImportFoilThickness,
    toggleRailsImportFoilThickness,
    updateRailSection,
    toggleTailHardEdge,
    railBands: bands,
  } = useDesign();
  const [justCopiedPreset, setJustCopiedPreset] = useState(false);

  function handleCopyPreset() {
    // Captures the shaper's own stored rails, not the foil-derived effectiveRails — a captured
    // preset must record what was actually authored on this section, never a number borrowed from
    // whatever the link happened to be showing at capture time.
    const text = buildPresetSource(rails);
    console.log(text);
    setJustCopiedPreset(true);
    navigator.clipboard.writeText(text).catch(() => {
      // Clipboard write rejected (unavailable or permission denied) — the console.log above already
      // carries the same text, so this is a silent no-op rather than a thrown error.
    });
    window.setTimeout(() => setJustCopiedPreset(false), 1500);
  }
  const [sectionOpen, setSectionOpen] = useState<Record<RailSectionKey, boolean>>({
    nose: true,
    center: true,
    tail: true,
  });
  const [advancedOpen, setAdvancedOpen] = useState<Record<RailSectionKey, boolean>>({
    nose: false,
    center: false,
    tail: false,
  });
  const [activePage, setActivePage] = useState<RailPage>("viewer");
  // Holds the "View Full Sized" dialog's open state locally, the same way outline-editor.tsx's
  // Export Template dialog is opened from this screen's own toolbar rather than the dialog owning
  // its own trigger (RAIL-04, D-12).
  const [viewFullSizedOpen, setViewFullSizedOpen] = useState(false);
  // D-12: which rail the phone's NOSE/CENTER/TAIL switch shows. Seeded from the same
  // firstOpenSection rule the View Full Sized dialog already uses (Nose, unless a later section is
  // open and Nose is not) rather than re-deriving it — screen state only, never saved, never in
  // the design snapshot.
  const [phoneSection, setPhoneSection] = useState<RailSectionKey>(() => firstOpenSection(sectionOpen));

  const updateSection = updateRailSection;
  const toggleHardEdge = toggleTailHardEdge;
  const toggleSectionOpen = (key: RailSectionKey) => setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleAdvancedOpen = (key: RailSectionKey) => setAdvancedOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  // Which sections appear in both the VIEWER and DATA columns — a collapsed section drops out of
  // both, exactly as the prototype's outputCards does. Order is always Nose, Center, Tail.
  const openSections = SECTION_KEYS.filter((key) => sectionOpen[key]);

  // Uniform scale across the plots requires one shared x-axis minimum (the smallest across all
  // open sections' own bounds) passed to every plot alongside one shared render width.
  const sharedXAxisMin: Mm =
    openSections.length > 0 ? mm(Math.min(...openSections.map((key) => bands[key].bounds.xAxisMin))) : mm(0);

  const legend = openSections.length > 0 ? buildRailLegend(bands[openSections[0]]) : [];

  // Every open section's viewBox WIDTH is identical (computeRailPlotBounds derives it from
  // sharedXAxisMin alone, not per-section thickness) -- only viewBox HEIGHT differs. Rendering
  // every plot at one common pixel width `plotWidth` therefore automatically gives every plot the
  // same scale (renderedWidth / viewBoxWidth) and the same left/right edges, which is exactly the
  // user's "shared scale, aligned x-axes" requirement -- see PLAN.md's derivation. `vbW` reads
  // openSections[0] only because every open section agrees on it; `sumOfVbH` is the one value that
  // actually varies per section and drives how much of the container's height the stack needs.
  const vbW = openSections.length > 0 ? computeRailPlotBounds(bands[openSections[0]], sharedXAxisMin).width : MAX_PLOT_W;
  const sumOfVbH = openSections.reduce(
    (sum, key) => sum + computeRailPlotBounds(bands[key], sharedXAxisMin).height,
    0,
  );
  const openSectionsKey = openSections.join(",");

  const plotsContainerRef = useRef<HTMLDivElement | null>(null);
  const titleRefs = useRef<Partial<Record<RailSectionKey, HTMLDivElement | null>>>({});
  const [plotWidth, setPlotWidth] = useState(MAX_PLOT_W);

  // Solves for the single width every open plot renders at. Re-measures the actual title heights
  // and inter-section gap (rather than hardcoding them) so a font or spacing change can't silently
  // throw the fit off -- and re-runs whenever the container resizes, a section opens/closes, any
  // thickness change alters a plot's natural viewBox height (sumOfVbH), or the VIEWER/DATA tab
  // switch mounts a fresh container node (the plots container unmounts on the DATA tab, so the
  // previous ResizeObserver's node goes stale and must be re-attached on return to VIEWER).
  useLayoutEffect(() => {
    const container = plotsContainerRef.current;
    if (!container) return;

    const recompute = () => {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      // Degenerate measurement (initial paint before layout, or a hidden/zero-size pane): fall
      // back to the width cap rather than emitting a 0-width plot.
      if (containerWidth <= 0 || containerHeight <= 0 || sumOfVbH <= 0) {
        setPlotWidth(containerWidth > 0 ? Math.min(containerWidth, MAX_PLOT_W) : MAX_PLOT_W);
        return;
      }

      const rowGap = parseFloat(getComputedStyle(container).rowGap || "0") || 0;
      const chrome = openSections.reduce((sum, key) => {
        const titleEl = titleRefs.current[key];
        if (!titleEl) return sum;
        const marginBottom = parseFloat(getComputedStyle(titleEl).marginBottom) || 0;
        return sum + titleEl.offsetHeight + marginBottom;
      }, rowGap * Math.max(0, openSections.length - 1));

      const availablePlotH = containerHeight - chrome;
      const widthFromHeight = availablePlotH > 0 ? (availablePlotH * vbW) / sumOfVbH : 0;
      // Floor to a whole pixel and bias down (never up) -- offsetHeight measurements above already
      // round to the nearest pixel, so rounding the solved width up here could compound into a
      // sub-pixel stack overflow; rounding down cannot.
      const solvedWidth = widthFromHeight > 0 ? Math.floor(Math.min(containerWidth, MAX_PLOT_W, widthFromHeight)) : Math.floor(Math.min(containerWidth, MAX_PLOT_W));
      setPlotWidth(Number.isFinite(solvedWidth) && solvedWidth > 0 ? solvedWidth : Math.floor(Math.min(containerWidth, MAX_PLOT_W)));
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSectionsKey, vbW, sumOfVbH, activePage]);

  return (
    <DesignScreenShell
      // data-print-hide (D-15): when the View Full Sized dialog prints, only its own content
      // reaches paper (app/design/rails/actual-size.css's @media print rules) -- this shell's
      // root, and so the sidebar, tab strip and VIEWER/DATA/INSTRUCTIONS content below, are all
      // marked so none of them print alongside it. The dialog's own content is unaffected: Base
      // UI's Dialog portals it outside this subtree, so it is never a descendant of this
      // attribute. Losing this on a shell migration regresses quick task 260908-q0n.
      printHide
      // D-01/D-12: VIEWER and DATA pin the drawing to a 50dvh ceiling on a phone (one
      // cross-section is roughly square, so it needs less room than TEMPLATE/ROCKER's full
      // drawings); INSTRUCTIONS is read-only reference content with no control targeting it, so it
      // collapses the pinned split entirely and scrolls as one column instead.
      //
      // 10-11: that last sentence used to be written down and never acted on. On a phone the
      // sidebar sorts AFTER the canvas in scroll order (DesignScreenShell's own `max-shell:order-
      // last`), so a shaper reading INSTRUCTIONS to its end used to land on a full column of
      // sliders that change nothing they can see there — confirmed on a real phone on 2026-09-11
      // ("rails keeps the controls under all 3 tabs"). The wrapper below is always present, on
      // every tab, so the shell always receives the same shape of `controls`; only its class moves
      // with the active tab, hiding it on a phone for INSTRUCTIONS alone. Nothing is taken away —
      // every rail-band control is still exactly where it always was, one tap away on VIEWER or
      // DATA, where it acts on something visible. A desktop mouse is deliberately untouched: there
      // the column sits BESIDE the reading rather than after it, so a mouse never met this problem,
      // and changing what it sees is outside this phase's standing rule — whether the desktop
      // should someday match this is left as an open question for the founder, not decided here.
      phonePinned={activePage === "instructions" ? "none" : "50dvh"}
      controls={
        <div className={activePage === "instructions" ? "max-shell:hidden" : undefined}>
          <RailControls
            spec={effectiveRails}
            bands={bands}
            onChangeSection={updateSection}
            onToggleHardEdge={toggleHardEdge}
            sectionOpen={sectionOpen}
            onToggleSectionOpen={toggleSectionOpen}
            advancedOpen={advancedOpen}
            onToggleAdvancedOpen={toggleAdvancedOpen}
            railsImportFoilThickness={railsImportFoilThickness}
            onToggleRailsImportFoilThickness={toggleRailsImportFoilThickness}
          />
        </div>
      }
      sidebarFooter={
        process.env.NODE_ENV === "development" ? (
          <div className="flex-none border-t border-surf-line-faint p-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full border border-outline-sidebar-divider bg-outline-sidebar-input-bg text-outline-sidebar-text hover:border-surf-accent hover:bg-surf-accent hover:text-surf-on-accent"
              onClick={handleCopyPreset}
            >
              {justCopiedPreset ? "Copied!" : "Copy preset values"}
            </Button>
          </div>
        ) : undefined
      }
      canvas={
        <TabbedPanel
          tabs={[
            { id: "viewer" as const, label: "VIEWER" },
            { id: "data" as const, label: "DATA" },
            { id: "instructions" as const, label: "INSTRUCTIONS" },
          ]}
          active={activePage}
          onSelect={setActivePage}
        >
        {activePage === "viewer" && (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <ViewerToolbar>
              <ViewerToolbarButton label="View Full Sized" onClick={() => setViewFullSizedOpen(true)}>
                <Maximize2Icon className="size-6" />
              </ViewerToolbarButton>
            </ViewerToolbar>
            <ViewFullSizedDialog
              open={viewFullSizedOpen}
              onOpenChange={setViewFullSizedOpen}
              bands={bands}
              sharedXAxisMin={sharedXAxisMin}
              sectionOpen={sectionOpen}
            />
            <div
              ref={plotsContainerRef}
              data-rail-plot-row="desktop"
              className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 max-shell:hidden"
            >
              {openSections.map((key) => (
                <div key={key} className="flex flex-none flex-col items-center" style={{ width: plotWidth }}>
                  <div
                    ref={(el) => {
                      titleRefs.current[key] = el;
                    }}
                    className="mb-1 flex-none text-base font-extrabold text-surf-ink"
                  >
                    {SECTION_TITLE[key]}
                  </div>
                  <RailSectionPlot sectionKey={key} output={bands[key]} xAxisMin={sharedXAxisMin} />
                </div>
              ))}
            </div>
            {/* Phone only (D-12): one rail cross-section at a time behind a NOSE/CENTER/TAIL
                switch. Rendered in the same server tree as the desktop plot row above, both
                always present in the markup and chosen purely by max-shell:/hidden CSS, so the
                first paint is right on every device with no JavaScript width check and no flash
                between layouts — the same rule the nav bars follow. The extra RailSectionPlot
                instance here is cheap: it derives from `bands`, which is already computed for
                every section whether or not its plot is shown.

                Deliberately NOT a second nested `<TabbedPanel>` instance: this whole block already
                sits inside the VIEWER tab's own content, itself already wrapped in the outer
                VIEWER/DATA/INSTRUCTIONS TabbedPanel's own card. Nesting a second full TabbedPanel
                here (tab strip + its two padded card layers) measured out to just 270px of a
                390px iPhone — 69%, well under PHON-06's 90% floor — because the two components'
                card chrome compounds instead of sharing one border. The tab row below copies
                TabbedPanel's own tab-button classes verbatim (same idiom, same look, same
                behaviour as the View Full Sized dialog's Nose/Center/Tail tabs) without a second
                nested card, so the plot gets the pinned area's actual full width. */}
            <div data-rail-plot-row="phone" className="hidden min-h-0 w-full flex-1 flex-col max-shell:flex">
              <div className="flex flex-none gap-1.5" role="tablist">
                {(
                  [
                    { id: "nose" as const, label: "NOSE" },
                    { id: "center" as const, label: "CENTER" },
                    { id: "tail" as const, label: "TAIL" },
                  ] as const
                ).map((tab) => {
                  const on = tab.id === phoneSection;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setPhoneSection(tab.id)}
                      className={
                        "cursor-pointer rounded-t-lg border px-[18px] py-1.5 text-xs font-display font-bold tracking-architectural uppercase " +
                        (on
                          ? "border-surf-line border-b-0 bg-surf-tab-active text-surf-ink"
                          : "border-transparent bg-transparent text-surf-ink-muted")
                      }
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <div className="-mt-px flex min-h-0 flex-1 flex-col items-center justify-center rounded-tr-lg rounded-b-lg border border-surf-line p-1">
                <RailSectionPlot sectionKey={phoneSection} output={bands[phoneSection]} xAxisMin={sharedXAxisMin} fit="width" />
              </div>
            </div>
            {legend.length > 0 && (
              <div className="mt-4 flex flex-none flex-wrap items-center justify-center gap-x-6 gap-y-2">
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
        )}

        {activePage === "data" && (
          <RailDataTable
            sections={openSections.map((key) => ({
              key,
              title: SECTION_TITLE[key],
              dataGroups: bands[key].dataGroups,
            }))}
          />
        )}

        {activePage === "instructions" && <RailInstructions />}
        </TabbedPanel>
      }
    />
  );
}
