"use client";

/**
 * The ROCKER screen shell — sidebar plus a tabbed viewer panel, mirroring `outline-editor.tsx`'s
 * shell exactly (D-01/D-02): an `aside` sidebar (`bg-surf-sidebar`, `p-10` scrolling region)
 * beside a `main` canvas (`bg-surf-canvas`, `p-3`) holding a `TabbedPanel`.
 *
 * 04-02 Task 1 widens the sidebar to the full `RockerControls` (all four rocker lifts, all five
 * thicknesses) and adds the VIEWER tab's toolbar — a rotate-in-place button and a hide-board-
 * outline toggle, the same box treatment the Template screen's own toolbar uses. The DATASHEET
 * tab and typed entry arrive in Task 2; construction-line dragging in Task 3.
 */

import { useId, useState } from "react";
import { LayoutTemplateIcon } from "lucide-react";
import { useDesign } from "@/components/design/design-store";
import { TabbedPanel } from "@/components/viewer/tabbed-panel";
import type { ViewerOrientation } from "@/components/viewer/callout-primitives";
import { RockerControls, type RockerControlsSectionKey } from "./rocker-controls";
import { RockerViewer } from "./rocker-viewer";

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

  function toggleSection(key: RockerControlsSectionKey) {
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-nowrap">
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
              onChangeRocker={updateRocker}
              onChangeFoil={updateFoil}
              sectionOpen={sectionOpen}
              onToggleSectionOpen={toggleSection}
            />
          </div>
        </div>
      </aside>
      <main className="flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-0 bg-surf-canvas p-3">
        <TabbedPanel tabs={[{ id: "viewer" as const, label: "VIEWER" }]} active="viewer">
          {/* `relative` makes this div the positioning context for the two toolbar buttons below,
              absolutely positioned over the drawing — the same box treatment as the Template
              screen's own toolbar (`outline-editor.tsx`'s `viewerContent`). */}
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
            <RockerViewer
              rocker={rocker}
              foil={foil}
              length={outline.length}
              outlineGeometry={outlineGeometry}
              orientation={orientation}
              showOutlineReference={showOutlineReference}
            />
          </div>
        </TabbedPanel>
      </main>
    </div>
  );
}
