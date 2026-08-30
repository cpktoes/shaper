"use client";

/**
 * The ROCKER screen shell — sidebar plus a tabbed viewer panel, mirroring `outline-editor.tsx`'s
 * shell exactly (D-01/D-02): an `aside` sidebar (`bg-surf-sidebar`, `p-10` scrolling region)
 * beside a `main` canvas (`bg-surf-canvas`, `p-3`) holding a `TabbedPanel`.
 *
 * 04-02 Task 1 widened the sidebar to the full `RockerControls` (all four rocker lifts, all five
 * thicknesses) and added the VIEWER tab's toolbar — a rotate-in-place button and a hide-board-
 * outline toggle, the same box treatment the Template screen's own toolbar uses. Task 2 added the
 * second tab: DATASHEET, the D-07 full five-station table with typed imperial entry. Two tabs
 * rather than one split view, because the drawing wants full panel height and the table wants
 * full panel width — the toolbar stays inside the VIEWER tab only. Task 3 adds a third toolbar
 * button — the construction-lines toggle, the hide-board-outline button's sibling — that reveals
 * `RockerViewer`'s construction overlay and its two tip drag targets (quick task 260829-snm
 * reduced this from nine drag targets to two, and the patch is now handed straight to
 * `updateRocker` — one mutator, since a tip drag can only ever touch the rocker spec). 04-05
 * Task 1 adds a fourth: below `RockerControls`, a
 * development-only "Copy preset values" button mirroring the Template screen's own capture
 * affordance (`outline-editor.tsx`) — it reads the live `rocker`/`foil` back out as pasteable
 * `lib/geometry/presets.ts` source, gated on `process.env.NODE_ENV === "development"` so the
 * bundler dead-code-eliminates it from production, the same D-03 tuning loop the outline presets
 * were captured through.
 */

import { useId, useState } from "react";
import { LayoutTemplateIcon, LocateFixedIcon } from "lucide-react";
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
  /** D-08: hides the faint plan-view width reference so the rocker line reads alone. Local view
   * state, not design data, deliberately not persisted — mirrors `showConstruction`'s posture on
   * the Template screen. */
  const [showOutlineReference, setShowOutlineReference] = useState(true);
  /** Reveals the construction-line overlay and its two tip drag targets on the side profile.
   * Local view state, not design data, deliberately not persisted — mirrors `showConstruction`'s
   * posture on the Template screen; defaults to `false` there too. */
  const [showConstruction, setShowConstruction] = useState(false);
  const [activeTab, setActiveTab] = useState<RockerTab>("viewer");
  const [justCopiedPreset, setJustCopiedPreset] = useState(false);

  function toggleSection(key: RockerControlsSectionKey) {
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
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
          region grows. */}
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
      <main className="flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-0 bg-surf-canvas p-3">
        <TabbedPanel tabs={ROCKER_TABS} active={activeTab} onSelect={setActiveTab}>
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
                onClick={() => setShowOutlineReference((v) => !v)}
                aria-pressed={!showOutlineReference}
                aria-label={showOutlineReference ? "Hide board outline" : "Show board outline"}
                title={showOutlineReference ? "Hide board outline" : "Show board outline"}
                // The one control in this toolbar allowed the accent fill (D-08), same posture as
                // Template's Construction-Lines button — icon colour folded into the SAME
                // aria-pressed className expression as the fill, never a separate always-on class
                // (this codebase has been bitten by that exact bug three times, see
                // .planning/quick/260825-rmb-*/SUMMARY.md).
                className="absolute top-0 right-10 z-10 flex cursor-pointer items-center rounded-md border border-surf-line bg-surf-ground p-1 text-surf-ink-muted transition-colors outline-none hover:bg-surf-well hover:text-surf-ink aria-pressed:border-surf-accent aria-pressed:bg-surf-accent aria-pressed:text-surf-on-accent aria-pressed:hover:bg-surf-accent focus-visible:ring-2 focus-visible:ring-surf-accent-ink"
              >
                <LayoutTemplateIcon className="size-6" />
              </button>
              <button
                type="button"
                onClick={() => setShowConstruction((v) => !v)}
                aria-pressed={showConstruction}
                aria-label={showConstruction ? "Hide construction lines" : "Show construction lines"}
                title={showConstruction ? "Hide construction lines" : "Show construction lines"}
                // Not accent-filled: the UI spec's Color table reserves the accent fill for the
                // Hide Board Outline toggle and the drag targets themselves, not a third toolbar
                // button — so this one takes a neutral pressed state instead (the same
                // `bg-surf-well` tone the other two buttons already use on hover).
                className="absolute top-0 right-20 z-10 flex cursor-pointer items-center rounded-md border border-surf-line bg-surf-ground p-1 text-surf-ink-muted transition-colors outline-none hover:bg-surf-well hover:text-surf-ink aria-pressed:bg-surf-well aria-pressed:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink"
              >
                <LocateFixedIcon className="size-6" />
              </button>
              <RockerViewer
                rocker={rocker}
                foil={foil}
                length={outline.length}
                outlineGeometry={outlineGeometry}
                orientation={orientation}
                showOutlineReference={showOutlineReference}
                showConstruction={showConstruction}
                onDrag={updateRocker}
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
