"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_RAIL_BAND_SPEC,
  computeRailBands,
  type RailBandSpec,
  type RailSectionKey,
  type RailSectionSpec,
} from "@/lib/geometry/rail-bands";
import { mm, type Mm } from "@/lib/geometry/units";
import { RailControls } from "./rail-controls";
import { RailDataTable } from "./rail-data-table";
import { RailSectionPlot, buildRailLegend } from "./rail-section-plot";

type RailPage = "viewer" | "data";

const SECTION_KEYS: RailSectionKey[] = ["nose", "center", "tail"];
const SECTION_TITLE: Record<RailSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };

/**
 * Owns the design state: a single RailBandSpec object plus UI-only state (which sections/
 * Advanced disclosures are open, which page is active) that never touches the design itself.
 * Everything in `spec` is millimetres; inches exist only inside the controls/plot/table where a
 * label or slider value is rendered.
 */
export function RailBandEditor() {
  const [spec, setSpec] = useState<RailBandSpec>(DEFAULT_RAIL_BAND_SPEC);
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

  const bands = useMemo(() => computeRailBands(spec), [spec]);

  const updateSection = (key: RailSectionKey, patch: Partial<RailSectionSpec>) => {
    setSpec((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };
  const toggleHardEdge = () => setSpec((prev) => ({ ...prev, tailHardEdge: !prev.tailHardEdge }));
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
    <div className="flex min-h-0 w-full flex-1 flex-wrap">
      <aside className="min-h-0 w-full max-w-[400px] flex-1 basis-[340px] overflow-y-auto bg-outline-sidebar-bg p-6 text-outline-sidebar-text">
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
      </aside>
      <main className="flex min-w-0 flex-1 basis-[480px] flex-col gap-2 bg-outline-page-bg p-2">
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
