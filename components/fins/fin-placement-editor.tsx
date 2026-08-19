"use client";

import { useMemo, useState } from "react";
import { useDesign } from "@/components/design/design-store";
import { toeAimTableFor } from "@/lib/geometry/fins";
import { FinControls } from "./fin-controls";
import { FinDataPanel } from "./fin-data-panel";
import { FinModelInfo } from "./fin-model-info";
import { FinViewer } from "./fin-viewer";
import { ToeAimTableModal } from "./toe-aim-table-modal";

type FinTab = "viewer" | "data" | "info";

const TAB_LABEL: Record<FinTab, string> = { viewer: "VIEWER", data: "DATA", info: "MODEL INFO" };
const TAB_ORDER: FinTab[] = ["viewer", "data", "info"];

/**
 * Reads the design state from the shared `DesignProvider` (components/design/design-store.tsx)
 * instead of owning it locally — this screen is one of four views onto a single board design.
 * UI-only state (which disclosures are open, which tab is active, whether the aim-table modal is
 * open) stays local — it never touches the design itself. Everything in `spec`/`effectiveFins` is
 * millimetres; inches exist only inside the controls/viewer/data panel where a label or slider
 * value is rendered. Layout mirrors components/rails/rail-band-editor.tsx.
 */
export function FinPlacementEditor() {
  const {
    effectiveFins: spec,
    updateFins,
    finPlacement: result,
    finTailOutline,
    finsImportTemplate,
    setFinsImportTemplate,
  } = useDesign();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showCallouts, setShowCallouts] = useState(true);
  const [activeTab, setActiveTab] = useState<FinTab>("viewer");
  const [toeTableOpen, setToeTableOpen] = useState(false);

  const toeTableView = useMemo(
    () => toeAimTableFor(spec.boardLength, spec.tailWidth12),
    [spec.boardLength, spec.tailWidth12],
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-wrap">
      <aside className="min-h-0 w-full max-w-[400px] flex-1 basis-[340px] overflow-y-auto bg-outline-sidebar-bg p-6 text-outline-sidebar-text">
        <FinControls
          spec={spec}
          result={result}
          onChange={updateFins}
          advancedOpen={advancedOpen}
          onToggleAdvanced={() => setAdvancedOpen((v) => !v)}
          settingsOpen={settingsOpen}
          onToggleSettings={() => setSettingsOpen((v) => !v)}
          showCallouts={showCallouts}
          onToggleCallouts={() => setShowCallouts((v) => !v)}
          onOpenToeTable={() => setToeTableOpen(true)}
          importTemplate={finsImportTemplate}
          onToggleImportTemplate={() => setFinsImportTemplate(!finsImportTemplate)}
        />
      </aside>
      <main className="flex min-w-0 flex-1 basis-[480px] flex-col gap-0 bg-outline-page-bg p-2">
        <div className="flex flex-none gap-1.5">
          {TAB_ORDER.map((tab) => (
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
              {TAB_LABEL[tab]}
            </button>
          ))}
        </div>

        {activeTab === "viewer" && (
          <div className="flex min-h-0 flex-1 flex-col items-center rounded-xl border border-[#e4ddc9] bg-white p-5">
            <div className="mb-3 self-start text-xl font-extrabold text-outline-ink">Fin Viewer</div>
            <FinViewer
              result={result}
              tailShape={spec.tailShape}
              tailWidth12={spec.tailWidth12}
              showCallouts={showCallouts}
              outlineOverride={finTailOutline}
            />
          </div>
        )}

        {activeTab === "data" && (
          <FinDataPanel
            result={result}
            boardLength={spec.boardLength}
            tailWidth12={spec.tailWidth12}
            finSetup={spec.finSetup}
            tailShape={spec.tailShape}
          />
        )}

        {activeTab === "info" && <FinModelInfo />}
      </main>

      <ToeAimTableModal
        open={toeTableOpen}
        onClose={() => setToeTableOpen(false)}
        boardLength={spec.boardLength}
        tailWidth12={spec.tailWidth12}
        view={toeTableView}
      />
    </div>
  );
}
