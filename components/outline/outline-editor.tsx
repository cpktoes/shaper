"use client";

import { useState } from "react";
import { DownloadIcon, LocateFixedIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDesign } from "@/components/design/design-store";
import type { ViewerOrientation } from "@/components/viewer/callout-primitives";
import { RotateBoardIcon, ViewerToolbarButton } from "@/components/viewer/toolbar-button";
import { ExportPreviewDialog } from "@/components/template/export-preview-dialog";
import { DesignScreenShell } from "@/components/design/design-screen-shell";
import * as ViewerMedia from "@/components/design/use-viewer-media";
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
  const [justCopiedPreset, setJustCopiedPreset] = useState(false);
  /** View state, like the construction override below — not design data, and deliberately not a
   * stored preference (D-03), so a reload always comes back vertical. Still what the rotate
   * button writes to and what a fine pointer displays unchanged (D-10); on a coarse pointer
   * `boardOrientation` below ignores it entirely in favour of the device's own orientation. */
  const [orientation, setOrientation] = useState<ViewerOrientation>("vertical");
  /** D-02's construction-overlay default, as an explicit override rather than the overlay's own
   * on/off flag: `null` means "no explicit choice yet, use the pointer-driven default";
   * `true`/`false` means the shaper (or wide view, below) has said so directly. Reading
   * `showConstruction` as `constructionOverride ?? coarsePointer` — a plain computed value, never
   * its own piece of state a render-time or effect setState call would have to keep in sync — is
   * what lets a touch device start with the overlay on without ever calling setState outside an
   * event handler (this codebase's lint config rejects both; a render-time setState caused a real
   * bug in plan 02-05). */
  const [constructionOverride, setConstructionOverride] = useState<boolean | null>(null);
  /** Wide view hides the `aside` below so `main` gets the full window width. Also local view
   * state, not design data, deliberately not persisted — a reload always comes back with the
   * sidebar showing. `preWideViewConstruction` remembers whatever the construction overlay was
   * showing before wide view forced it on, so leaving wide view restores it rather than leaving
   * the shaper on a setting they never chose. */
  const [wideView, setWideView] = useState(false);
  const [preWideViewConstruction, setPreWideViewConstruction] = useState(false);

  // D-09/D-10: on a coarse (touch) pointer only, the board follows the phone's own orientation —
  // nose-up in portrait, flat in landscape — computed fresh every render, never stored. On a fine
  // pointer `coarsePointer` is false for the life of the component, so `boardOrientation` is
  // always just `orientation` and the rotate button behaves exactly as it does today (D-10).
  const coarsePointer = ViewerMedia.useCoarsePointer();
  const portraitViewport = ViewerMedia.usePortraitViewport();
  const boardOrientation: ViewerOrientation = coarsePointer
    ? portraitViewport
      ? "vertical"
      : "horizontal"
    : orientation;

  // D-02: the construction overlay — the five drag targets, their guide chords and knot dots —
  // starts ON for a touch device instead of desktop's off-by-default-behind-the-toggle, and stays
  // whatever the shaper last chose once they have tapped the toggle at least once. Because the
  // server cannot know the pointer type, `coarsePointer` (and so `showConstruction`) may flip on
  // one render after hydration — the board itself is never late.
  const showConstruction = constructionOverride ?? coarsePointer;

  function handleToggleConstruction() {
    setConstructionOverride(!showConstruction);
  }

  function handleToggleWideView() {
    if (wideView) {
      setConstructionOverride(preWideViewConstruction);
      setWideView(false);
    } else {
      setPreWideViewConstruction(showConstruction);
      setConstructionOverride(true);
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
        // D-05/D-11: the rotate button's one job on a phone is done by turning the phone, so it
        // is absent below the shell breakpoint — the first of the phase's three removed controls
        // (wide view, on the toolbar button below, is the third, added after the post-execution
        // code review — see 09-REVIEW.md CR-01). Now gated on width AND pointer (quick task
        // 260909-h3g): on any coarse pointer, `boardOrientation` above follows the device's own
        // orientation query and never reads this button's state, so the button had nothing to
        // do. That surfaced on a phone held sideways — 844px on an iPhone 14, 863px on a Pixel 7,
        // both wider than the 820px shell breakpoint, so the width rule alone let the dead button
        // back on screen. A touchscreen laptop hits the same case and is covered by the same
        // rule. A mouse-driven desktop is unaffected at every width.
        className="max-shell:hidden coarse:hidden"
      >
        <RotateBoardIcon className="size-6" />
      </ViewerToolbarButton>
      <ViewerToolbarButton
        onClick={handleToggleConstruction}
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
        // 09-REVIEW.md CR-01: on a phone the drawing already has the whole width and the
        // controls are the entire column stacked beneath it, so there is nothing to widen —
        // pressing this button would only hide every control, with no way back (the small icon
        // that caused it would be gone too). Absent below the shell breakpoint, gated on width
        // alone — unlike Rotate above, which is now gated on the pointer too — because a
        // touchscreen laptop at desktop width genuinely does have a sidebar to hide, so this
        // button still does its real job there. `DesignScreenShell` also refuses to fully drop
        // the controls on a phone even if `wideView` is somehow still true, belt-and-suspenders
        // for a desktop shaper who narrows the window after pressing this.
        className="max-shell:hidden"
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
              orientation={boardOrientation}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DesignScreenShell
      controls={
        <OutlineControls
          outline={outline}
          geometry={outlineGeometry}
          onChange={updateOutline}
          showConstruction={showConstruction}
          onToggleConstruction={handleToggleConstruction}
        />
      }
      canvas={
        // Normal view keeps TabbedPanel's folder-tab strip and its own padded card (the same
        // panel and edge Rails and Fins use, which is what makes the four screens read as one
        // application rather than four layouts) — untouched from before wide view existed.
        // Wide view drops that chrome instead of reusing it: with the sidebar already gone and
        // only the one VIEWER tab to label, the tab row and the extra nested card are pure
        // overhead, not signal. The board's drawing is height-bound, not width-bound —
        // components/viewer/callout-primitives.tsx's own comment: "these drawings are
        // height-bound, so horizontal slack never shrinks the board" — so hiding the sidebar
        // alone never made the board bigger; what does is vertical room, and `bare` trims three
        // padded layers down to one and removes the tab row entirely, both only while wide view
        // is on.
        //
        // `bare={wideView}` rather than branching between `<TabbedPanel>` and a plain `<div>`
        // here (WR-02): those are different element types at the same tree position, so
        // React's reconciler used to tear down and rebuild `viewerContent` — the drawing, its
        // drag state, the toolbar buttons, `ExportPreviewDialog` — on every Wide View toggle,
        // discarding any in-flight interaction. `<TabbedPanel>` is now the one component that
        // always sits here; only its internal chrome varies.
        <TabbedPanel bare={wideView} tabs={[{ id: "viewer" as const, label: "VIEWER" }]} active="viewer">
          {viewerContent}
        </TabbedPanel>
      }
      wideView={wideView}
      sidebarFooter={
        // A flex column, not one scrolling box: the controls scroll in the region above (handled
        // by DesignScreenShell) and this dev preset button sits in a footer that does not. As a
        // plain last child of a scrolling aside it was only ever pinned by luck — outline and
        // rails happened to fit, so it looked right there, while the longer fins controls pushed
        // it past the bottom edge where it could only be met mid-scroll. Hidden entirely, not
        // resized, while wide view is on (DesignScreenShell hides the whole sidebar then) — a
        // quick task already had to fix this footer once because it was only pinned by luck.
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
      phonePinned="66dvh"
    />
  );
}
