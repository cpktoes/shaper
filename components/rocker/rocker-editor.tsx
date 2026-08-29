"use client";

/**
 * The ROCKER screen shell — sidebar plus a tabbed viewer panel, mirroring `outline-editor.tsx`'s
 * shell exactly (D-01/D-02): an `aside` sidebar (`bg-surf-sidebar`, `p-10` scrolling region)
 * beside a `main` canvas (`bg-surf-canvas`, `p-3`) holding a `TabbedPanel`.
 *
 * 04-01 Task 1 wires one control (the nose-tip rocker slider) so the tab exists, routes, and
 * redraws live — the rest of the datasheet (typed entry, construction-line drag, the DATASHEET
 * tab) arrives in later plans of this phase.
 */

import { useDesign } from "@/components/design/design-store";
import { TabbedPanel } from "@/components/viewer/tabbed-panel";
import { FOIL_THICKNESS_RANGE_IN } from "@/lib/geometry/foil";
import { ROCKER_LIFT_RANGE_IN } from "@/lib/geometry/rocker";
import { formatInchesFraction, inchesToMm, mmToInches } from "@/lib/geometry/units";
import { Slider } from "@/components/ui/slider";
import { RockerViewer } from "./rocker-viewer";

function sliderValue(v: number | readonly number[]): number {
  return typeof v === "number" ? v : (v[0] ?? 0);
}

function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * One rocker/foil slider row. Reuses `rail-controls.tsx`'s `ControlSlider` layout verbatim — the
 * `mb-2` label line, `.slider-accent` track and `mt-0.5` hint row — so this sidebar agrees with
 * the rail sidebar directly below it in the nav (UI-SPEC's Spacing Scale exceptions).
 */
function ControlSlider({
  label,
  value,
  min,
  max,
  step,
  onValueChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-sm text-surf-ink-muted font-normal">{label}</div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onValueChange(sliderValue(v))}
        className="slider-accent"
      />
    </div>
  );
}

export function RockerEditor() {
  const { rocker, updateRocker, foil, updateFoil, outline } = useDesign();

  const noseTipIn = mmToInches(rocker.noseTip);
  const centerThicknessIn = mmToInches(foil.center);

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

            <ControlSlider
              label={`Nose Tip Rocker — ${formatInchesFraction(rocker.noseTip)}`}
              value={noseTipIn}
              min={ROCKER_LIFT_RANGE_IN.min}
              max={ROCKER_LIFT_RANGE_IN.max}
              step={ROCKER_LIFT_RANGE_IN.step}
              onValueChange={(v) =>
                updateRocker({
                  noseTip: inchesToMm(clampFinite(v, ROCKER_LIFT_RANGE_IN.min, ROCKER_LIFT_RANGE_IN.max)),
                })
              }
            />

            <ControlSlider
              label={`Center Thickness — ${formatInchesFraction(foil.center)}`}
              value={centerThicknessIn}
              min={FOIL_THICKNESS_RANGE_IN.min}
              max={FOIL_THICKNESS_RANGE_IN.max}
              step={FOIL_THICKNESS_RANGE_IN.step}
              onValueChange={(v) =>
                updateFoil({
                  center: inchesToMm(clampFinite(v, FOIL_THICKNESS_RANGE_IN.min, FOIL_THICKNESS_RANGE_IN.max)),
                })
              }
            />
          </div>
        </div>
      </aside>
      <main className="flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-0 bg-surf-canvas p-3">
        <TabbedPanel tabs={[{ id: "viewer" as const, label: "VIEWER" }]} active="viewer">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <RockerViewer rocker={rocker} foil={foil} length={outline.length} />
          </div>
        </TabbedPanel>
      </main>
    </div>
  );
}
