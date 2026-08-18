"use client";

import { useMemo, useState } from "react";
import { computeFinPlacement, DEFAULT_FIN_PLACEMENT_SPEC, type FinPlacementSpec } from "@/lib/geometry/fins";
import { FinControls } from "./fin-controls";
import { FinViewer } from "./fin-viewer";

type FinTab = "viewer" | "data" | "info";

/**
 * Owns the design state: a single FinPlacementSpec object plus UI-only state (which disclosures
 * are open, which tab is active, whether the aim-table modal is open) that never touches the
 * design itself. Everything in `spec` is millimetres; inches exist only inside the
 * controls/viewer/data panel where a label or slider value is rendered. Layout mirrors
 * components/rails/rail-band-editor.tsx.
 */
export function FinPlacementEditor() {
  const [spec, setSpec] = useState<FinPlacementSpec>(DEFAULT_FIN_PLACEMENT_SPEC);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showCallouts, setShowCallouts] = useState(true);
  const [activeTab, setActiveTab] = useState<FinTab>("viewer");
  // toeTableOpen itself is read starting in Task 3 (the aim-table modal); the setter is wired
  // now so the "View precise McKee toe-in aim tables" link is functional as soon as it renders.
  const [, setToeTableOpen] = useState(false);

  const result = useMemo(() => computeFinPlacement(spec), [spec]);

  const updateSpec = (patch: Partial<FinPlacementSpec>) => setSpec((prev) => ({ ...prev, ...patch }));

  return (
    <div className="flex min-h-0 w-full flex-1 flex-wrap">
      <aside className="min-h-0 w-full max-w-[400px] flex-1 basis-[340px] overflow-y-auto bg-outline-sidebar-bg p-6 text-outline-sidebar-text">
        <FinControls
          spec={spec}
          result={result}
          onChange={updateSpec}
          advancedOpen={advancedOpen}
          onToggleAdvanced={() => setAdvancedOpen((v) => !v)}
          settingsOpen={settingsOpen}
          onToggleSettings={() => setSettingsOpen((v) => !v)}
          showCallouts={showCallouts}
          onToggleCallouts={() => setShowCallouts((v) => !v)}
          onOpenToeTable={() => setToeTableOpen(true)}
        />
      </aside>
      <main className="flex min-w-0 flex-1 basis-[480px] flex-col gap-0 bg-outline-page-bg p-2">
        <div className="flex flex-none gap-1.5">
          {(["viewer"] as FinTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={
                "cursor-pointer rounded-t-lg border px-[18px] py-2.5 text-sm font-bold " +
                (activeTab === tab
                  ? "border-[#e4ddc9] border-b-0 bg-white text-outline-ink"
                  : "border-transparent bg-transparent text-[#8a8272]")
              }
            >
              VIEWER
            </button>
          ))}
        </div>

        {activeTab === "viewer" && (
          <div className="flex min-h-0 flex-1 flex-col items-center rounded-xl border border-[#e4ddc9] bg-white p-5">
            <div className="mb-3 self-start text-xl font-extrabold text-outline-ink">Fin Viewer</div>
            <FinViewer result={result} tailShape={spec.tailShape} tailWidth12={spec.tailWidth12} showCallouts={showCallouts} />
          </div>
        )}
      </main>
    </div>
  );
}
