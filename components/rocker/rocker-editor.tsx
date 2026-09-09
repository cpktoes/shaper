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
 * hands that width to the drawing. The toolbar button and the rotate glyph are now shared — both
 * screens draw their floating toolbar from `components/viewer/toolbar-button.tsx`'s
 * `ViewerToolbarButton` and `RotateBoardIcon` (05-06), which overturns this file's earlier
 * "faithful local mirror, not a shared extraction" posture: that class string and glyph were
 * hand-edited in all seven button instances across both files, twice in one day, and that real
 * cost is what changed the decision, not this screen's own needs. `buildRockerPresetSource`
 * stays a local counterpart to `outline-editor.tsx`'s own preset-capture function — the dev-only
 * capture affordance was never part of this extraction. `bare` removes the tab strip, and this
 * screen has two tabs (DATASHEET is unreachable while wide view is on) — safe because the button
 * that turns wide view on lives inside the VIEWER tab's own toolbar and stays on screen in both
 * states, so the active tab is invariantly VIEWER whenever wide view is on, and one press always
 * brings the strip back.
 *
 * 09-03 moves this screen onto the shared `DesignScreenShell` (the same migration
 * `outline-editor.tsx` went through in 09-02): the hand-rolled `aside`/`main` markup above is gone,
 * and `DesignScreenShell` renders it from props instead — desktop is byte-identical, and the phone
 * stack is the shell's own `max-shell:` layer, never this file's own layout code.
 *
 * On a phone this screen keeps D-09's nose-up reading and gets the SAME 66dvh pinned-area ceiling
 * TEMPLATE uses — not a shorter one — even though the rocker frame does not fill the width there.
 * Measured during planning (2026-09-08) by running `rockerViewLayout()` from
 * `./rocker-view-frame.ts` at real phone sizes: nose-up, the rocker frame is about 0.55–0.64 wide
 * for every 1.0 tall (the card rails reserve a fixed band on the cross axis), so the drawing is
 * height-bound on every phone, not width-bound. At a shorter ceiling once considered the 74"
 * default board drew only 181px wide on a 375px-wide iPhone SE (half the screen); at this file's
 * 66dvh it draws about 266 x 400px there and 336 x 506px on a 390px iPhone 14. Lying the rocker
 * flat instead would have filled the width at about a fifth of the screen's height, but the
 * founder chose to keep the board standing with the phone and accepted a rocker drawing narrower
 * than the full phone width (D-18) — do not "fix" this by narrowing `rocker-view-frame.ts`'s
 * card-rail reservation or reintroducing a shorter pinned-area ceiling; both were considered and
 * set aside.
 */

import { useState } from "react";
import { LocateFixedIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useDesign } from "@/components/design/design-store";
import { Button } from "@/components/ui/button";
import { DesignScreenShell } from "@/components/design/design-screen-shell";
import * as ViewerMedia from "@/components/design/use-viewer-media";
import { TabbedPanel, type PanelTab } from "@/components/viewer/tabbed-panel";
import { RotateBoardIcon, ViewerToolbar, ViewerToolbarButton } from "@/components/viewer/toolbar-button";
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
   * Template screen's vertical default, so a reload always comes back horizontal here. Untouched
   * on a fine pointer (D-10); on a coarse pointer `boardOrientation` below ignores it entirely in
   * favour of the device's own orientation (D-09/D-18). */
  const [orientation, setOrientation] = useState<ViewerOrientation>("horizontal");
  /** D-02's construction-overlay default, as an explicit override rather than the overlay's own
   * on/off flag — the same `constructionOverride ?? coarsePointer` shape `outline-editor.tsx`
   * uses: `null` means "no explicit choice yet, use the pointer-driven default"; `true`/`false`
   * means the shaper (or wide view, below) has said so directly. A plain computed value, never a
   * second piece of state kept in sync by an effect or a render-time setState — this codebase's
   * lint config rejects both. */
  const [constructionOverride, setConstructionOverride] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<RockerTab>("viewer");
  const [justCopiedPreset, setJustCopiedPreset] = useState(false);
  /** Wide view hides the `aside` below so `main` gets the full window width. Local view state, not
   * design data, deliberately not persisted — a reload always comes back with the sidebar showing.
   * `preWideViewConstruction` remembers whatever the construction overlay was showing before wide
   * view forced it on, so leaving wide view restores it rather than leaving the shaper on a
   * setting they never chose. Both are set together inside the click handler below, not from a
   * render-time effect — this codebase's lint config rejects setting state during render, and
   * doing so caused a real bug in plan 02-05. Mirrors `outline-editor.tsx`'s own `wideView`/
   * `preWideViewConstruction` pair. */
  const [wideView, setWideView] = useState(false);
  const [preWideViewConstruction, setPreWideViewConstruction] = useState(false);

  // D-09/D-10/D-18: on a coarse (touch) pointer only, the board follows the phone's own
  // orientation — nose-up in portrait, flat in landscape — computed fresh every render, never
  // stored. On a fine pointer `coarsePointer` is false for the life of the component, so
  // `boardOrientation` is always just `orientation` and the rotate button behaves exactly as it
  // does today (D-10).
  const coarsePointer = ViewerMedia.useCoarsePointer();
  const portraitViewport = ViewerMedia.usePortraitViewport();
  const boardOrientation: ViewerOrientation = coarsePointer
    ? portraitViewport
      ? "vertical"
      : "horizontal"
    : orientation;

  // D-02: the construction overlay — the four Bezier handles, their chords and the three knot
  // dots — starts ON for a touch device instead of desktop's off-by-default-behind-the-toggle,
  // and stays whatever the shaper last chose once they have tapped the toggle at least once.
  const showConstruction = constructionOverride ?? coarsePointer;

  function toggleSection(key: RockerControlsSectionKey) {
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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
    <DesignScreenShell
      controls={
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
      }
      canvas={
        <TabbedPanel bare={wideView} tabs={ROCKER_TABS} active={activeTab} onSelect={setActiveTab}>
          {activeTab === "viewer" ? (
            // `relative` makes this div the positioning context for the two toolbar buttons
            // below, absolutely positioned over the drawing — the same box treatment as the
            // Template screen's own toolbar (`outline-editor.tsx`'s `viewerContent`). The
            // toolbar stays inside this tab only (Task 2's plan text) — DATASHEET has no drawing
            // to rotate or hide a reference under.
            <div className="relative flex min-h-0 flex-1 items-center justify-center">
              <ViewerToolbar>
                <ViewerToolbarButton
                  onClick={() => setOrientation((o) => (o === "horizontal" ? "vertical" : "horizontal"))}
                  label="Rotate the board"
                  // D-05/D-11: the rotate button's one job on a phone is done by turning the
                  // phone, so it is absent below the shell breakpoint — the first of the phase's
                  // three removed controls (wide view, on the toolbar button below, is the
                  // third, added after the post-execution code review — see 09-REVIEW.md CR-01).
                  // Now gated on width AND pointer (quick task 260909-h3g): on any coarse
                  // pointer, `boardOrientation` above follows the device's own orientation query
                  // and never reads this button's state, so the button had nothing to do. That
                  // surfaced on a phone held sideways — 844px on an iPhone 14, 863px on a Pixel
                  // 7, both wider than the 820px shell breakpoint, so the width rule alone let
                  // the dead button back on screen. A touchscreen laptop hits the same case and
                  // is covered by the same rule. A mouse-driven desktop is unaffected at every
                  // width.
                  className="max-shell:hidden coarse:hidden"
                >
                  <RotateBoardIcon className="size-6" />
                </ViewerToolbarButton>
                <ViewerToolbarButton
                  onClick={handleToggleConstruction}
                  pressed={showConstruction}
                  label={showConstruction ? "Hide construction lines" : "Show construction lines"}
                >
                  <LocateFixedIcon className="size-6" />
                </ViewerToolbarButton>
                <ViewerToolbarButton
                  onClick={handleToggleWideView}
                  pressed={wideView}
                  label={wideView ? "Show the sidebar" : "Hide the sidebar for a wider view"}
                  title={wideView ? "Show the sidebar" : "Wide view"}
                  // 09-REVIEW.md CR-01: on a phone the drawing already has the whole width and
                  // the controls are the entire column stacked beneath it, so there is nothing
                  // to widen — pressing this button would only hide every control, with no way
                  // back (the small icon that caused it would be gone too). Absent below the
                  // shell breakpoint, gated on width alone — unlike Rotate above, which is now
                  // gated on the pointer too — because a touchscreen laptop at desktop width
                  // genuinely does have a sidebar to hide, so this button still does its real
                  // job there. `DesignScreenShell` also refuses to fully drop the controls on a
                  // phone even if `wideView` is somehow still true, belt-and-suspenders for a
                  // desktop shaper who narrows the window after pressing this.
                  className="max-shell:hidden"
                >
                  {wideView ? <PanelLeftOpenIcon className="size-6" /> : <PanelLeftCloseIcon className="size-6" />}
                </ViewerToolbarButton>
              </ViewerToolbar>
              <RockerViewer
                rocker={rocker}
                foil={foil}
                length={outline.length}
                orientation={boardOrientation}
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
      }
      wideView={wideView}
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
      phonePinned="66dvh"
    />
  );
}
