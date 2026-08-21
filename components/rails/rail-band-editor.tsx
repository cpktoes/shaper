"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDesign } from "@/components/design/design-store";
import { type RailBandSpec, type RailSectionKey, type RailSectionSpec } from "@/lib/geometry/rail-bands";
import { mm, mmToInches, type Mm } from "@/lib/geometry/units";
import { RailControls } from "./rail-controls";
import { RailDataTable } from "./rail-data-table";
import { RailSectionPlot, buildRailLegend } from "./rail-section-plot";

type RailPage = "viewer" | "data";

const SECTION_KEYS: RailSectionKey[] = ["nose", "center", "tail"];
const SECTION_TITLE: Record<RailSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };

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
  const { rails: spec, updateRailSection, toggleTailHardEdge, railBands: bands } = useDesign();
  const [justCopiedPreset, setJustCopiedPreset] = useState(false);

  function handleCopyPreset() {
    const text = buildPresetSource(spec);
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

  return (
    <div className="flex min-h-0 w-full flex-1 flex-nowrap">
      <aside className="h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] overflow-y-auto bg-outline-sidebar-bg p-6 text-outline-sidebar-text">
        <RailControls
          spec={spec}
          bands={bands}
          onChangeSection={updateSection}
          onToggleHardEdge={toggleHardEdge}
          sectionOpen={sectionOpen}
          onToggleSectionOpen={toggleSectionOpen}
          advancedOpen={advancedOpen}
          onToggleAdvancedOpen={toggleAdvancedOpen}
        />
        {process.env.NODE_ENV === "development" && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-4 w-full border border-outline-sidebar-divider bg-outline-sidebar-input-bg text-outline-sidebar-text hover:border-outline-accent hover:bg-outline-accent hover:text-outline-ink"
            onClick={handleCopyPreset}
          >
            {justCopiedPreset ? "Copied!" : "Copy preset values"}
          </Button>
        )}
      </aside>
      <main className="flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-2 bg-outline-page-bg p-2">
        <div className="flex flex-none gap-1.5">
          {(["viewer", "data"] as RailPage[]).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setActivePage(page)}
              className={
                "cursor-pointer rounded-t-lg border px-[18px] py-2.5 text-sm font-bold " +
                (activePage === page
                  ? "border-[#e4ddc9] border-b-0 bg-white text-outline-ink"
                  : "border-transparent bg-transparent text-[#8a8272]")
              }
            >
              {page === "viewer" ? "VIEWER" : "DATA"}
            </button>
          ))}
        </div>

        {activePage === "viewer" && (
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[#e4ddc9] bg-white p-5">
            <div className="mb-3 self-start text-xl font-extrabold text-outline-ink">Rail Viewer</div>
            <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto">
              {openSections.map((key) => (
                <div key={key} className="flex w-full max-w-[420px] flex-col items-center">
                  <div className="mb-2 text-base font-extrabold text-outline-ink">{SECTION_TITLE[key]}</div>
                  <RailSectionPlot sectionKey={key} output={bands[key]} xAxisMin={sharedXAxisMin} />
                </div>
              ))}
            </div>
            {legend.length > 0 && (
              <div className="mt-4 flex flex-none flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {legend.map((entry) => (
                  <span key={entry.label} className="flex items-center gap-1.5 text-[10px] text-[#8a8272]">
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
      </main>
    </div>
  );
}
