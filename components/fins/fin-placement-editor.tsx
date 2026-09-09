"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUnits } from "@/components/units-provider";
import { useDesign } from "@/components/design/design-store";
import { DesignScreenShell } from "@/components/design/design-screen-shell";
import { toeAimTableFor, type FinAdvancedSpec, type FinPlacementSpec } from "@/lib/geometry/fins";
import { mmToInches, type Mm } from "@/lib/geometry/units";
import { FinControls } from "./fin-controls";
import { FinDataPanel } from "./fin-data-panel";
import { FinModelInfo } from "./fin-model-info";
import { FinViewer } from "./fin-viewer";
import { TabbedPanel } from "@/components/viewer/tabbed-panel";
import { ToeAimTableModal } from "./toe-aim-table-modal";

type FinTab = "viewer" | "data" | "info";

const TAB_LABEL: Record<FinTab, string> = { viewer: "VIEWER", data: "DATA", info: "MODEL INFO" };
const TAB_ORDER: FinTab[] = ["viewer", "data", "info"];

/** Rounds a millimetre value to inches, 3 decimal places — matches outline-editor.tsx's own helper. */
function roundedInches(value: Mm): number {
  return Number(mmToInches(value).toFixed(3));
}

/** Builds a pasteable `FinAdvancedSpec` source block, nested `indent` spaces inside its caller. */
function buildAdvancedSource(spec: FinAdvancedSpec, indent: string): string {
  const pad = `${indent}  `;
  const forwardToeOverride =
    spec.forwardToeOverride === null ? "null" : `inchesToMm(${roundedInches(spec.forwardToeOverride)})`;
  const rearToeOverride =
    spec.rearToeOverride === null ? "null" : `inchesToMm(${roundedInches(spec.rearToeOverride)})`;
  const quadRearOffRailOverride =
    spec.quadRearOffRailOverride === null
      ? "null"
      : `inchesToMm(${roundedInches(spec.quadRearOffRailOverride)})`;
  const quadRearOffTailOverride =
    spec.quadRearOffTailOverride === null
      ? "null"
      : `inchesToMm(${roundedInches(spec.quadRearOffTailOverride)})`;

  return [
    "{",
    `${pad}baseLenForward: inchesToMm(${roundedInches(spec.baseLenForward)}),`,
    `${pad}baseLenForwardOverridden: ${spec.baseLenForwardOverridden},`,
    `${pad}baseLenRear: inchesToMm(${roundedInches(spec.baseLenRear)}),`,
    `${pad}baseLenRearOverridden: ${spec.baseLenRearOverridden},`,
    `${pad}baseLenCenter: inchesToMm(${roundedInches(spec.baseLenCenter)}),`,
    `${pad}baseLenCenterOverridden: ${spec.baseLenCenterOverridden},`,
    `${pad}centerPositionOffset: inchesToMm(${roundedInches(spec.centerPositionOffset)}),`,
    `${pad}forwardPositionOffset: inchesToMm(${roundedInches(spec.forwardPositionOffset)}),`,
    `${pad}forwardToeOverride: ${forwardToeOverride},`,
    `${pad}rearPositionOffset: inchesToMm(${roundedInches(spec.rearPositionOffset)}),`,
    `${pad}rearToeOverride: ${rearToeOverride},`,
    `${pad}quadRearOffRailOverride: ${quadRearOffRailOverride},`,
    `${pad}quadRearOffTailOverride: ${quadRearOffTailOverride},`,
    `${pad}quadRearOffTailOverridden: ${spec.quadRearOffTailOverridden},`,
    `${indent}}`,
  ].join("\n");
}

/** Builds a pasteable `BoardPreset["fins"]` source block from the live (raw, non-imported) fin spec. */
function buildPresetSource(spec: FinPlacementSpec): string {
  return [
    "fins: {",
    `  boardLength: inchesToMm(${roundedInches(spec.boardLength)}),`,
    `  tailWidth12: inchesToMm(${roundedInches(spec.tailWidth12)}),`,
    `  tailShape: "${spec.tailShape}",`,
    `  finSetup: "${spec.finSetup}",`,
    `  frontModel: "${spec.frontModel}",`,
    `  quadRearModel: "${spec.quadRearModel}",`,
    `  twinTemplate: "${spec.twinTemplate}",`,
    `  quadCenterFinOn: ${spec.quadCenterFinOn},`,
    `  advanced: ${buildAdvancedSource(spec.advanced, "  ")},`,
    "},",
  ].join("\n");
}

/**
 * Reads the design state from the shared `DesignProvider` (components/design/design-store.tsx)
 * instead of owning it locally — this screen is one of four views onto a single board design.
 * UI-only state (which disclosures are open, which tab is active, whether the aim-table modal is
 * open) stays local — it never touches the design itself. Everything in `spec`/`effectiveFins` is
 * millimetres; inches exist only inside the controls/viewer/data panel where a label or slider
 * value is rendered. Layout mirrors components/rails/rail-band-editor.tsx.
 *
 * Development-only: below `FinControls` this file also renders a "Copy preset values" button,
 * gated on `process.env.NODE_ENV === "development"` so the bundler dead-code-eliminates it from
 * production. It reads the raw `fins` spec (not `effectiveFins`) back out as pasteable
 * `lib/geometry/presets.ts` source, so a captured preset carries the shaper's own advanced/model
 * fields rather than whatever the outline happened to override — the Fins half of the same
 * shaper-tuning capture loop as components/outline/outline-editor.tsx (CONTEXT.md D-03).
 *
 * 09-03: moved onto the shared `DesignScreenShell`, `phonePinned="55dvh"` — the diagram pins to a
 * little over half the phone screen and scales to the available width through its own existing
 * viewBox fitting (no orientation rule applies to the fin viewer). `ToeAimTableModal` is passed
 * through the shell's `outsideColumns` slot so it keeps rendering as a sibling of the two-column
 * root, exactly as it does today — inside either column it would be clipped by the pinned area on
 * a phone (RESEARCH.md Pitfall 5).
 */
export function FinPlacementEditor() {
  const {
    fins: rawSpec,
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
  const [justCopiedPreset, setJustCopiedPreset] = useState(false);
  const { system } = useUnits();

  function handleCopyPreset() {
    const text = buildPresetSource(rawSpec);
    console.log(text);
    setJustCopiedPreset(true);
    navigator.clipboard.writeText(text).catch(() => {
      // Clipboard write rejected (unavailable or permission denied) — the console.log above already
      // carries the same text, so this is a silent no-op rather than a thrown error.
    });
    window.setTimeout(() => setJustCopiedPreset(false), 1500);
  }

  const toeTableView = useMemo(
    () => toeAimTableFor(spec.boardLength, spec.tailWidth12, system),
    [spec.boardLength, spec.tailWidth12, system],
  );

  return (
    <DesignScreenShell
      controls={
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
      }
      canvas={
        <TabbedPanel
          tabs={TAB_ORDER.map((tab) => ({ id: tab, label: TAB_LABEL[tab] }))}
          active={activeTab}
          onSelect={setActiveTab}
        >
          {activeTab === "viewer" && (
            <div className="flex min-h-0 flex-1 flex-col items-center">
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
        </TabbedPanel>
      }
      sidebarFooter={
        // A flex column, not one scrolling box: the controls scroll in the region above (handled
        // by DesignScreenShell) and this dev preset button sits in a footer that does not. As a
        // plain last child of a scrolling aside it was only ever pinned by luck — outline and
        // rails happened to fit, so it looked right there, while the longer fins controls pushed
        // it past the bottom edge where it could only be met mid-scroll.
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
      outsideColumns={
        <ToeAimTableModal
          open={toeTableOpen}
          onClose={() => setToeTableOpen(false)}
          boardLength={spec.boardLength}
          tailWidth12={spec.tailWidth12}
          view={toeTableView}
        />
      }
      phonePinned="55dvh"
    />
  );
}
