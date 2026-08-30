"use client";

/**
 * The ROCKER screen shell — sidebar plus a tabbed viewer panel, mirroring `outline-editor.tsx`'s
 * shell exactly (D-01/D-02): an `aside` sidebar (`bg-surf-sidebar`, `p-10` scrolling region)
 * beside a `main` canvas (`bg-surf-canvas`, `p-3`) holding a `TabbedPanel`.
 *
 * 04-02 Task 1 widened the sidebar to the full `RockerControls` (all four rocker lifts, all five
 * thicknesses) and added the VIEWER tab's toolbar — a rotate-in-place button, the same box
 * treatment the Template screen's own toolbar uses. Task 2 added the second tab: DATASHEET, the
 * D-07 full five-station table with typed imperial entry. Two tabs rather than one split view,
 * because the drawing wants full panel height and the table wants full panel width — the toolbar
 * stays inside the VIEWER tab only. Task 3 adds a second toolbar button — the construction-lines
 * toggle — that reveals `RockerViewer`'s construction overlay and its two tip drag targets (quick
 * task 260829-snm reduced this from nine drag targets to two, and the patch is now handed
 * straight to `updateRocker` — one mutator, since a tip drag can only ever touch the rocker
 * spec). 04-05 Task 1 adds a third affordance: below `RockerControls`, a
 * development-only "Copy preset values" button mirroring the Template screen's own capture
 * affordance (`outline-editor.tsx`) — it reads the live `rocker`/`foil` back out as pasteable
 * `lib/geometry/presets.ts` source, gated on `process.env.NODE_ENV === "development"` so the
 * bundler dead-code-eliminates it from production, the same D-03 tuning loop the outline presets
 * were captured through.
 *
 * Quick task 260829-ugd adds the same hide-sidebar wide view `outline-editor.tsx` carries: a third
 * toolbar button that removes the `aside` from the tree entirely (rather than shrinking it) and
 * hands that width to the drawing. This is a faithful local mirror, not a shared extraction — the
 * same posture this file already takes with `RotateBoardIcon` and `buildRockerPresetSource`.
 * `bare` removes the tab strip, and this screen has two tabs (DATASHEET is unreachable while wide
 * view is on) — safe because the button that turns wide view on lives inside the VIEWER tab's own
 * toolbar and stays on screen in both states, so the active tab is invariantly VIEWER whenever
 * wide view is on, and one press always brings the strip back.
 */

import { useId, useState } from "react";
import { LocateFixedIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useDesign } from "@/components/design/design-store";
import { Button } from "@/components/ui/button";
import { TabbedPanel, type PanelTab } from "@/components/viewer/tabbed-panel";
import type { ViewerOrientation } from "@/components/viewer/callout-primitives";
import { type FoilSpec } from "@/lib/geometry/foil";
import { buildRocker, type RockerSpec } from "@/lib/geometry/rocker";
import { type Mm, mmToInches } from "@/lib/geometry/units";
import { RockerControls, type RockerControlsSectionKey } from "./rocker-controls";
import { RockerDatasheet } from "./rocker-datasheet";
import { RockerViewer } from "./rocker-viewer";

/** Rounds a millimetre value to inches, 3 decimal places, matching `outline-editor.tsx`'s
 * `roundedInches` precision for the same capture affordance. */
function roundedInches(value: Mm): number {
  return Number(mmToInches(value).toFixed(3));
}

/** Builds a pasteable `BoardPreset["rocker"]`/`["foil"]` source block from the live rocker and
 * foil specs — the ROCKER-screen counterpart to `outline-editor.tsx`'s `buildPresetSource`.
 * Emits the current eight-field `RockerSpec` shape (quick task 260829-rda), the two lifts and
 * two angles authored through `inchesToMm()`/`degrees()` the way `presets.ts` itself authors
 * them, so the dev-only capture affordance still round-trips straight into that file. */
function buildRockerPresetSource(rocker: RockerSpec, foil: FoilSpec): string {
  return [
    "rocker: {",
    `  noseLift: inchesToMm(${roundedInches(rocker.noseLift)}),`,
    `  tailLift: inchesToMm(${roundedInches(rocker.tailLift)}),`,
    `  noseAngle: degrees(${rocker.noseAngle}),`,
    `  tailAngle: degrees(${rocker.tailAngle}),`,
    `  noseSmoothness: ${rocker.noseSmoothness},`,
    `  tailSmoothness: ${rocker.tailSmoothness},`,
    `  noseFlatness: ${rocker.noseFlatness},`,
    `  tailFlatness: ${rocker.tailFlatness},`,
    "},",
    "foil: {",
    `  noseTip: inchesToMm(${roundedInches(foil.noseTip)}),`,
    `  nose12: inchesToMm(${roundedInches(foil.nose12)}),`,
    `  center: inchesToMm(${roundedInches(foil.center)}),`,
    `  tail12: inchesToMm(${roundedInches(foil.tail12)}),`,
    `  tailTip: inchesToMm(${roundedInches(foil.tailTip)}),`,
    "},",
  ].join("\n");
}

type RockerTab = "viewer" | "datasheet";
const ROCKER_TABS: readonly PanelTab<RockerTab>[] = [
  { id: "viewer", label: "VIEWER" },
  { id: "datasheet", label: "DATASHEET" },
];

/**
 * The Template screen's rotate-board glyph, copied verbatim from `outline-editor.tsx` per D-03
 * ("carries the same rotate-in-place button the Template screen has"). See that file's own long
 * comment for why the glyph is built this way (one planshape reused twice through `<use>`, a
 * `useId`-scoped id so it never collides if this ever rendered twice on one page). Not extracted
 * into a shared module — `outline-editor.tsx` doesn't export it either, so copying keeps each
 * screen's toolbar self-contained, the same posture this screen's own `ControlSlider`-style
 * markup already takes.
 */
function RotateBoardIcon({ className }: { className?: string }) {
  const glyphId = `shaper-board-glyph-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <defs>
        <path
          id={glyphId}
          d="M12 3.3C11.0 6.2 9.88 9.5 9.85 12.6 9.82 15.6 10.4 18.2 11.1 20.3a0.95 0.95 0 0 0 1.8 0C13.6 18.2 14.18 15.6 14.15 12.6 14.12 9.5 13.0 6.2 12 3.3Z"
        />
      </defs>
      <g stroke="currentColor" strokeLinejoin="round" fill="none" strokeWidth={2.42}>
        <use href={`#${glyphId}`} transform="translate(17.2,12.5) scale(0.62) translate(-12,-12.3)" />
        <use href={`#${glyphId}`} transform="translate(8.5,17) rotate(-90) scale(0.62) translate(-12,-12.3)" />
      </g>
      <path d="M14.5 6.5A8 8 0 0 0 4.5 11.8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M4.29 13.89 3.06 11.66 5.94 11.94Z" fill="currentColor" />
    </svg>
  );
}

export function RockerEditor() {
  const { rocker, updateRocker, foil, updateFoil, outline, outlineGeometry } = useDesign();
  // Built once per render and passed to the controls, the datasheet and the viewer, so the curve
  // is derived in exactly one place per render (quick task 260829-rda).
  const geometry = buildRocker(rocker, outline.length);
  const [sectionOpen, setSectionOpen] = useState<Record<RockerControlsSectionKey, boolean>>({
    rocker: true,
    thickness: true,
  });
  /** View state, like Template's own `orientation`/`showConstruction` — not design data, never
   * persisted. Per D-03 this screen's default is horizontal (nose left), the OPPOSITE of the
   * Template screen's vertical default, so a reload always comes back horizontal here. */
  const [orientation, setOrientation] = useState<ViewerOrientation>("horizontal");
  /** Reveals the construction-line overlay and its two tip drag targets on the side profile.
   * Local view state, not design data, deliberately not persisted — mirrors `showConstruction`'s
   * posture on the Template screen; defaults to `false` there too. */
  const [showConstruction, setShowConstruction] = useState(false);
  const [activeTab, setActiveTab] = useState<RockerTab>("viewer");
  const [justCopiedPreset, setJustCopiedPreset] = useState(false);
  /** Wide view hides the `aside` below so `main` gets the full window width. Local view state, not
   * design data, deliberately not persisted — a reload always comes back with the sidebar showing.
   * `preWideViewConstruction` remembers whatever `showConstruction` was set to before wide view
   * forced it on, so leaving wide view restores it rather than leaving the shaper on a setting they
   * never chose. Both are set together inside the click handler below, not from a render-time
   * effect — this codebase's lint config rejects setting state during render, and doing so caused a
   * real bug in plan 02-05. Mirrors `outline-editor.tsx`'s own `wideView`/`preWideViewConstruction`
   * pair. */
  const [wideView, setWideView] = useState(false);
  const [preWideViewConstruction, setPreWideViewConstruction] = useState(false);

  function toggleSection(key: RockerControlsSectionKey) {
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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

  /** `outline-editor.tsx`'s `handleCopyPreset`, copied verbatim for the rocker/foil pair. */
  function handleCopyPreset() {
    const text = buildRockerPresetSource(rocker, foil);
    console.log(text);
    setJustCopiedPreset(true);
    navigator.clipboard.writeText(text).catch(() => {
      // Clipboard write rejected (unavailable or permission denied) — the console.log above already
      // carries the same text, so this is a silent no-op rather than a thrown error.
    });
    window.setTimeout(() => setJustCopiedPreset(false), 1500);
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-nowrap">
      {/* A flex column, not one scrolling box — mirrors `outline-editor.tsx`'s aside exactly (quick
          task 260823-ux2): the controls scroll in the region below and the dev preset button sits
          in a footer that does not, so it is always reachable regardless of how much the controls
          region grows. Hidden entirely, not resized, while wide view is on — the internal
          structure (scrolling controls region + flex-none dev preset footer) stays untouched; a
          quick task already had to fix that footer once because it was only pinned by luck. */}
      {!wideView && (
        <aside className="flex h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] flex-col border-r border-surf-line-faint bg-surf-sidebar text-surf-ink">
          <div className="min-h-0 flex-1 overflow-y-auto p-10">
            <div className="flex flex-col gap-5">
              <div>
                <div className="text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold">
                  Rocker &amp; Foil
                </div>
                <div className="mt-0.5 text-sm text-surf-ink-muted font-normal">
                  Shape the board&apos;s side profile — the bottom curve and the deck it carries
                </div>
              </div>

              <RockerControls
                rocker={rocker}
                foil={foil}
                geometry={geometry}
                onChangeRocker={updateRocker}
                onChangeFoil={updateFoil}
                sectionOpen={sectionOpen}
                onToggleSectionOpen={toggleSection}
              />
            </div>
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
        <TabbedPanel bare={wideView} tabs={ROCKER_TABS} active={activeTab} onSelect={setActiveTab}>
          {activeTab === "viewer" ? (
            // `relative` makes this div the positioning context for the two toolbar buttons
            // below, absolutely positioned over the drawing — the same box treatment as the
            // Template screen's own toolbar (`outline-editor.tsx`'s `viewerContent`). The
            // toolbar stays inside this tab only (Task 2's plan text) — DATASHEET has no drawing
            // to rotate or hide a reference under.
            <div className="relative flex min-h-0 flex-1 items-center justify-center">
              <button
                type="button"
                onClick={() => setOrientation((o) => (o === "horizontal" ? "vertical" : "horizontal"))}
                aria-label="Rotate the board"
                title="Rotate the board"
                className="absolute top-0 right-0 z-10 flex cursor-pointer items-center rounded-md border border-surf-line bg-surf-ground p-1 text-surf-ink-muted transition-colors outline-none hover:bg-surf-well hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink"
              >
                <RotateBoardIcon className="size-6" />
              </button>
              <button
                type="button"
                onClick={() => setShowConstruction((v) => !v)}
                aria-pressed={showConstruction}
                aria-label={showConstruction ? "Hide construction lines" : "Show construction lines"}
                title={showConstruction ? "Hide construction lines" : "Show construction lines"}
                // Not accent-filled: the accent fill is now unclaimed on this toolbar — matching
                // the Template screen's accent-filled Construction Lines button would be a
                // one-line flip the founder has not asked for — so this one keeps the neutral
                // pressed state instead (the same `bg-surf-well` tone the other buttons already
                // use on hover).
                className="absolute top-0 right-10 z-10 flex cursor-pointer items-center rounded-md border border-surf-line bg-surf-ground p-1 text-surf-ink-muted transition-colors outline-none hover:bg-surf-well hover:text-surf-ink aria-pressed:bg-surf-well aria-pressed:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink"
              >
                <LocateFixedIcon className="size-6" />
              </button>
              <button
                type="button"
                onClick={handleToggleWideView}
                aria-pressed={wideView}
                aria-label={wideView ? "Show the sidebar" : "Hide the sidebar for a wider view"}
                title={wideView ? "Show the sidebar" : "Wide view"}
                // Same box as the two buttons beside it. This is both the way in and the way out
                // of wide view — it lives inside the VIEWER tab's own toolbar, which stays on
                // screen in both states, so there is always a visible route back. Never
                // accent-filled: that fill is unclaimed on this toolbar, not this button's.
                className="absolute top-0 right-20 z-10 flex cursor-pointer items-center rounded-md border border-surf-line bg-surf-ground p-1 text-surf-ink-muted transition-colors outline-none hover:bg-surf-well hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink"
              >
                {wideView ? <PanelLeftOpenIcon className="size-6" /> : <PanelLeftCloseIcon className="size-6" />}
              </button>
              <RockerViewer
                rocker={rocker}
                foil={foil}
                length={outline.length}
                orientation={orientation}
                showConstruction={showConstruction}
                onDrag={updateRocker}
                fitToBoard
              />
            </div>
          ) : (
            <RockerDatasheet
              rocker={rocker}
              foil={foil}
              geometry={geometry}
              outlineGeometry={outlineGeometry}
              length={outline.length}
              onChangeRocker={updateRocker}
              onChangeFoil={updateFoil}
            />
          )}
        </TabbedPanel>
      </main>
    </div>
  );
}
