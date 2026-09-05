"use client";

import { useState } from "react";
import { DownloadIcon, LocateFixedIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDesign } from "@/components/design/design-store";
import type { ViewerOrientation } from "@/components/viewer/callout-primitives";
import { RotateBoardIcon, ViewerToolbarButton } from "@/components/viewer/toolbar-button";
import { ExportPreviewDialog } from "@/components/template/export-preview-dialog";
import type { OutlineSpec } from "@/lib/geometry/board";
import { mmToInches } from "@/lib/geometry/units";
import { OutlineControls } from "./outline-controls";
import { TabbedPanel } from "@/components/viewer/tabbed-panel";
import { OutlineViewer } from "./outline-viewer";

/**
 * Reads the design state from the shared `DesignProvider` (components/design/design-store.tsx)
 * instead of owning it locally — this screen is one of four views onto a single board design.
 * `showConstruction` stays local: it's a view preference, not design data. Everything from the
 * store is millimetres; inches exist only inside the controls/viewer where a label or slider
 * value is rendered.
 *
 * Development-only: below `OutlineControls` this file also renders a "Copy preset values" button,
 * gated on `process.env.NODE_ENV === "development"` so the bundler dead-code-eliminates it from
 * production. It reads the live `outline` back out as pasteable `lib/geometry/presets.ts` source —
 * this is how a `BoardPreset` gets shaper-tuned in the real editor (CONTEXT.md D-03) rather than
 * hand-guessed.
 */

/** Rounds a millimetre value to inches, 3 decimal places, matching the precision the capture affordance emits. */
function roundedInches(value: OutlineSpec["length"]): number {
  return Number(mmToInches(value).toFixed(3));
}

/** Builds a pasteable `BoardPreset["outline"]` source block from the live outline spec. */
function buildPresetSource(spec: OutlineSpec): string {
  const tailFields: string[] = [`kind: "${spec.tail.kind}"`];
  if (spec.tail.kind === "squash" || spec.tail.kind === "diamond" || spec.tail.kind === "swallow") {
    tailFields.push(`endWidth: inchesToMm(${roundedInches(spec.tail.endWidth)})`);
  }
  if (spec.tail.kind === "diamond") {
    tailFields.push(`depth: inchesToMm(${roundedInches(spec.tail.depth)})`);
  }
  if (spec.tail.kind === "swallow") {
    tailFields.push(`crotchDepth: inchesToMm(${roundedInches(spec.tail.crotchDepth)})`);
  }

  return [
    "outline: {",
    `  length: inchesToMm(${roundedInches(spec.length)}),`,
    `  widePointWidth: inchesToMm(${roundedInches(spec.widePointWidth)}),`,
    `  widePointOffset: inchesToMm(${roundedInches(spec.widePointOffset)}),`,
    `  tailRailLength: ${spec.tailRailLength},`,
    `  noseRailLength: ${spec.noseRailLength},`,
    `  noseAngle: degrees(${spec.noseAngle}),`,
    `  noseFullness: ${spec.noseFullness},`,
    `  tailAngle: degrees(${spec.tailAngle}),`,
    `  tailFullness: ${spec.tailFullness},`,
    `  tail: { ${tailFields.join(", ")} },`,
    "},",
  ].join("\n");
}

export function OutlineEditor() {
  const { outline, updateOutline, outlineGeometry, finPlacement } = useDesign();
  const [showConstruction, setShowConstruction] = useState(false);
  const [justCopiedPreset, setJustCopiedPreset] = useState(false);
  /** View state, like `showConstruction` — not design data, and deliberately not a stored
   * preference (D-03), so a reload always comes back vertical. */
  const [orientation, setOrientation] = useState<ViewerOrientation>("vertical");
  /** Wide view hides the `aside` below so `main` gets the full window width. Also local view
   * state, not design data, deliberately not persisted — a reload always comes back with the
   * sidebar showing. `preWideViewConstruction` remembers whatever `showConstruction` was set to
   * before wide view forced it on, so leaving wide view restores it rather than leaving the
   * shaper on a setting they never chose. Both are set together inside the click handler below,
   * not from a render-time effect — this codebase's lint config rejects setting state during
   * render, and doing so caused a real bug in plan 02-05. */
  const [wideView, setWideView] = useState(false);
  const [preWideViewConstruction, setPreWideViewConstruction] = useState(false);

  function handleToggleWideView() {
    if (wideView) {
      setShowConstruction(preWideViewConstruction);
      setWideView(false);
    } else {
      setPreWideViewConstruction(showConstruction);
      setShowConstruction(true);
      setWideView(true);
    }
  }

  function handleCopyPreset() {
    const text = buildPresetSource(outline);
    console.log(text);
    setJustCopiedPreset(true);
    navigator.clipboard.writeText(text).catch(() => {
      // Clipboard write rejected (unavailable or permission denied) — the console.log above already
      // carries the same text, so this is a silent no-op rather than a thrown error.
    });
    window.setTimeout(() => setJustCopiedPreset(false), 1500);
  }

  // The viewer panel's content: the four toolbar buttons plus the drawing itself. Pulled out of
  // the JSX tree into a variable, rather than written twice, because wide view (below) swaps out
  // the chrome AROUND this content — not the content itself — and two copies of ~40 lines of
  // absolutely-positioned buttons is exactly the kind of duplication that drifts.
  const viewerContent = (
    // `relative` makes this div — the viewer panel's own content area — the positioning
    // context for the rotate button below, per D-06: the button sits INSIDE the panel's
    // content, absolutely positioned over the drawing, not in a header row beside the
    // panel title (the mockup had it there and the founder explicitly corrected this) and
    // not inline with the VIEWER tab. `TabbedPanel` itself is untouched.
    <div className="relative flex min-h-0 flex-1 items-stretch justify-center gap-6">
      <ExportPreviewDialog
        trigger={
          // Slot 1 (right-10) sits immediately left of Rotate's slot 0 (right-0), so the two
          // read as one icon-button pair. This button has no ON state to hold a fill after the
          // pointer leaves — the dialog it opens covers the drawing, so any fill painted on the
          // button underneath would be invisible while the dialog is open and only flash as it
          // closes, which is why it carries no `pressed` prop at all.
          <ViewerToolbarButton label="Export Template" slot={1}>
            <DownloadIcon className="size-6" />
          </ViewerToolbarButton>
        }
      />
      <ViewerToolbarButton
        onClick={() => setOrientation((o) => (o === "vertical" ? "horizontal" : "vertical"))}
        label={
          orientation === "vertical"
            ? "Rotate the board to horizontal"
            : "Rotate the board to vertical"
        }
        title="Rotate the board"
        slot={0}
      >
        <RotateBoardIcon className="size-6" />
      </ViewerToolbarButton>
      <ViewerToolbarButton
        onClick={() => setShowConstruction((v) => !v)}
        pressed={showConstruction}
        label={showConstruction ? "Hide construction lines" : "Show construction lines"}
        slot={2}
        // Icon is LocateFixedIcon, not a ruler: it echoes the draggable control point drawn on
        // the construction overlay itself (components/outline/outline-viewer.tsx's drag
        // targets — a ring with a filled centre dot, plus tick marks reads closest to
        // LocateFixed of the candidates lucide-react offers), so the button previews the very
        // glyph the shaper is about to see on the board.
      >
        <LocateFixedIcon className="size-6" />
      </ViewerToolbarButton>
      <ViewerToolbarButton
        onClick={handleToggleWideView}
        pressed={wideView}
        label={wideView ? "Show the sidebar" : "Hide the sidebar for a wider view"}
        title={wideView ? "Show the sidebar" : "Wide view"}
        slot={3}
      >
        {wideView ? <PanelLeftOpenIcon className="size-6" /> : <PanelLeftCloseIcon className="size-6" />}
      </ViewerToolbarButton>
      <div className="flex min-h-0 max-h-full min-w-[340px] flex-1 flex-col items-center">
        <div className="relative flex min-h-0 w-full flex-1 justify-center">
          {/* A plain filled box — the drawing sizes itself inside it via preserveAspectRatio.
              No aspect-ratio wrapper: the viewBox widens for wide boards, so any ratio pinned
              here would fight it, and a card that demands a height from its own contents is
              what broke the print sheet (see OutlineViewer's svg). Tried deriving the ratio
              from `outlineViewMetrics` to kill the side letterboxing; as a flex item it
              resolved its width from the wrong basis and collapsed the drawing to 0.41 scale.
              The centred letterbox is the better trade. */}
          <div className="relative h-full min-h-0 w-full min-w-0">
            <OutlineViewer
              geometry={outlineGeometry}
              outline={outline}
              showConstruction={showConstruction}
              onOutlineDrag={updateOutline}
              finMarks={finPlacement.marks}
              hideFinMarks
              pinCalloutText
              orientation={orientation}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-nowrap">
      {/* A flex column, not one scrolling box: the controls scroll in the region below and the dev
          preset button sits in a footer that does not. As a plain last child of a scrolling aside it
          was only ever pinned by luck — outline and rails happened to fit, so it looked right there,
          while the longer fins controls pushed it past the bottom edge where it could only be met
          mid-scroll. */}
      {/* Hidden entirely, not resized, while wide view is on — the internal structure (scrolling
          controls region + flex-none dev preset footer) stays untouched; a quick task already had
          to fix that footer once because it was only pinned by luck. */}
      {!wideView && (
        <aside className="flex h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] flex-col border-r border-surf-line-faint bg-surf-sidebar text-surf-ink">
          <div className="min-h-0 flex-1 overflow-y-auto p-10">
            <OutlineControls
              outline={outline}
              geometry={outlineGeometry}
              onChange={updateOutline}
              showConstruction={showConstruction}
              onToggleConstruction={() => setShowConstruction((v) => !v)}
            />
          </div>
          {process.env.NODE_ENV === "development" && (
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
          )}
        </aside>
      )}
      <main
        className={
          wideView
            ? "flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-0 bg-surf-canvas p-1"
            : "flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-0 bg-surf-canvas p-3"
        }
      >
        {/* Normal view keeps TabbedPanel's folder-tab strip and its own padded card (the same
            panel and edge Rails and Fins use, which is what makes the four screens read as one
            application rather than four layouts) — untouched from before wide view existed.
            Wide view drops that chrome instead of reusing it: with the sidebar already gone and
            only the one VIEWER tab to label, the tab row and the extra nested card are pure
            overhead, not signal. The board's drawing is height-bound, not width-bound —
            components/viewer/callout-primitives.tsx's own comment: "these drawings are
            height-bound, so horizontal slack never shrinks the board" — so hiding the sidebar
            alone never made the board bigger; what does is vertical room, and `bare` trims three
            padded layers down to one and removes the tab row entirely, both only while wide view
            is on.

            `bare={wideView}` rather than branching between `<TabbedPanel>` and a plain `<div>`
            here (WR-02): those are different element types at the same tree position, so
            React's reconciler used to tear down and rebuild `viewerContent` — the drawing, its
            drag state, the toolbar buttons, `ExportPreviewDialog` — on every Wide View toggle,
            discarding any in-flight interaction. `<TabbedPanel>` is now the one component that
            always sits here; only its internal chrome varies. */}
        <TabbedPanel bare={wideView} tabs={[{ id: "viewer" as const, label: "VIEWER" }]} active="viewer">
          {viewerContent}
        </TabbedPanel>
      </main>
    </div>
  );
}
