"use client";

/**
 * The ROCKER sidebar. The Rocker group's six shape controls sit two to a line, mirroring how
 * `outline-controls.tsx` already pairs its own sliders on the TEMPLATE sidebar. Each tip's Angle
 * sits beside that same tip's Smoothness, because one dragged handle on the drawing sets both
 * together; the two Flatness controls share the middle line, since they are the two ends of the
 * one flat spot running through the centre of the board. Nose Rocker and Tail Rocker keep full
 * lines of their own, as the two headline figures a shaper quotes first about a board. Below that
 * sits the Thickness group's five sliders, one per line — the five-station nose-to-tail
 * progression has no natural pairs. Both groups are collapsible, mirroring `rail-controls.tsx`'s
 * house style: the same `SectionHeading` treatment, the same slider label/track markup (`mb-2
 * text-sm ...` label, `.slider-accent` track), so this sidebar reads as the same system as the
 * rail sidebar directly below it in the nav. Presentational only — `rocker-editor.tsx` owns the
 * design state and the section-open state; this component just renders it (mirroring how
 * `RailControls` is shaped).
 *
 * Every slider below is now drawn by the shared `SliderRow` component
 * (components/design/slider-row.tsx). Each one still commits its own number through its own
 * conversion at its call site — the two lifts convert between inches and millimetres, the two
 * Angle sliders carry a branded degrees type, the rest are plain percentages — `SliderRow` never
 * sees or touches that conversion; it only renders the row and reports the raw number back
 * through `onValueChange`. The paired two-per-line rows keep their flex parent here; each child
 * now passes its own flex sizing through `SliderRow`'s `className` instead of a wrapper div.
 *
 * Quick task 260829-rda replaced the four typed rocker-lift sliders with eight shape controls
 * (Nose/Tail Rocker, Angle, Smoothness, Flatness), matching `outline-controls.tsx`'s own
 * angle/fullness/rail-length slider treatment — the rocker line is now built the same way the
 * board's outline curve is. The two 12" figures move from typed sliders to a read-only pair,
 * measured off the `RockerGeometry` the editor builds once per render and passes in.
 */

import type { ReactNode } from "react";
import { SliderRow } from "@/components/design/slider-row";
import { FOIL_THICKNESS_RANGE_IN, type FoilSpec } from "@/lib/geometry/foil";
import {
  ROCKER_ANGLE_RANGE_DEG,
  ROCKER_FLATNESS_RANGE,
  ROCKER_LIFT_RANGE_IN,
  ROCKER_SMOOTHNESS_RANGE,
  type RockerGeometry,
  type RockerSpec,
} from "@/lib/geometry/rocker";
import { degrees, formatInchesFraction, inchesToMm, mmToInches } from "@/lib/geometry/units";

export type RockerControlsSectionKey = "rocker" | "thickness";

interface RockerControlsProps {
  rocker: RockerSpec;
  foil: FoilSpec;
  /** The built curve, so the derived 12" read-out can show a number without rebuilding it here —
   * built once by `rocker-editor.tsx` and shared with the datasheet and viewer. */
  geometry: RockerGeometry;
  onChangeRocker: (patch: Partial<RockerSpec>) => void;
  onChangeFoil: (patch: Partial<FoilSpec>) => void;
  sectionOpen: Record<RockerControlsSectionKey, boolean>;
  onToggleSectionOpen: (key: RockerControlsSectionKey) => void;
}

function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Copied verbatim from `rail-controls.tsx`'s `SectionHeading` — same border, uppercase,
 * extrabold, `tracking-architectural` treatment every collapsible group in this app shares. */
function SectionHeading({
  children,
  onToggle,
  open,
}: {
  children: ReactNode;
  onToggle: () => void;
  open: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-1.5 flex w-full items-center justify-between border-b border-surf-line-faint pb-2 text-xs font-display text-surf-ink uppercase tracking-architectural font-extrabold"
    >
      <span>{children}</span>
      <span>{open ? "▾" : "▸"}</span>
    </button>
  );
}

export function RockerControls({
  rocker,
  foil,
  geometry,
  onChangeRocker,
  onChangeFoil,
  sectionOpen,
  onToggleSectionOpen,
}: RockerControlsProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionHeading open={sectionOpen.rocker} onToggle={() => onToggleSectionOpen("rocker")}>
          Rocker
        </SectionHeading>
        {sectionOpen.rocker && (
          <div className="flex flex-col gap-3.5 pt-3">
            <div className="mb-1.5 text-[10px] text-surf-ink-muted font-normal">
              Rocker is measured up from a flat surface with the board bottom-down — the center is
              the zero it&apos;s measured against. The two 12&quot; figures below are measured off
              the drawn curve, not set by hand.
            </div>

            <SliderRow
              label={`Nose Rocker — ${formatInchesFraction(rocker.noseLift)}`}
              value={mmToInches(rocker.noseLift)}
              min={ROCKER_LIFT_RANGE_IN.min}
              max={ROCKER_LIFT_RANGE_IN.max}
              step={ROCKER_LIFT_RANGE_IN.step}
              onValueChange={(v) =>
                onChangeRocker({
                  noseLift: inchesToMm(clampFinite(v, ROCKER_LIFT_RANGE_IN.min, ROCKER_LIFT_RANGE_IN.max)),
                })
              }
            />

            <div className="flex items-end gap-4">
              <SliderRow
                className="flex-1"
                label={`Nose Angle — ${rocker.noseAngle}°`}
                value={rocker.noseAngle}
                min={ROCKER_ANGLE_RANGE_DEG.min}
                max={ROCKER_ANGLE_RANGE_DEG.max}
                step={ROCKER_ANGLE_RANGE_DEG.step}
                onValueChange={(v) =>
                  onChangeRocker({
                    noseAngle: degrees(clampFinite(v, ROCKER_ANGLE_RANGE_DEG.min, ROCKER_ANGLE_RANGE_DEG.max)),
                  })
                }
              />

              <SliderRow
                className="flex-1"
                label={`Nose Smoothness — ${rocker.noseSmoothness}%`}
                value={rocker.noseSmoothness}
                min={ROCKER_SMOOTHNESS_RANGE.min}
                max={ROCKER_SMOOTHNESS_RANGE.max}
                step={ROCKER_SMOOTHNESS_RANGE.step}
                onValueChange={(v) =>
                  onChangeRocker({
                    noseSmoothness: clampFinite(v, ROCKER_SMOOTHNESS_RANGE.min, ROCKER_SMOOTHNESS_RANGE.max),
                  })
                }
              />
            </div>

            <div className="flex items-end gap-4">
              <SliderRow
                className="flex-1"
                label={`Nose Flatness — ${rocker.noseFlatness}%`}
                value={rocker.noseFlatness}
                min={ROCKER_FLATNESS_RANGE.min}
                max={ROCKER_FLATNESS_RANGE.max}
                step={ROCKER_FLATNESS_RANGE.step}
                onValueChange={(v) =>
                  onChangeRocker({
                    noseFlatness: clampFinite(v, ROCKER_FLATNESS_RANGE.min, ROCKER_FLATNESS_RANGE.max),
                  })
                }
              />

              <SliderRow
                className="flex-1"
                label={`Tail Flatness — ${rocker.tailFlatness}%`}
                value={rocker.tailFlatness}
                min={ROCKER_FLATNESS_RANGE.min}
                max={ROCKER_FLATNESS_RANGE.max}
                step={ROCKER_FLATNESS_RANGE.step}
                onValueChange={(v) =>
                  onChangeRocker({
                    tailFlatness: clampFinite(v, ROCKER_FLATNESS_RANGE.min, ROCKER_FLATNESS_RANGE.max),
                  })
                }
              />
            </div>

            <div className="flex items-end gap-4">
              <SliderRow
                className="flex-1"
                label={`Tail Smoothness — ${rocker.tailSmoothness}%`}
                value={rocker.tailSmoothness}
                min={ROCKER_SMOOTHNESS_RANGE.min}
                max={ROCKER_SMOOTHNESS_RANGE.max}
                step={ROCKER_SMOOTHNESS_RANGE.step}
                onValueChange={(v) =>
                  onChangeRocker({
                    tailSmoothness: clampFinite(v, ROCKER_SMOOTHNESS_RANGE.min, ROCKER_SMOOTHNESS_RANGE.max),
                  })
                }
              />

              <SliderRow
                className="flex-1"
                label={`Tail Angle — ${rocker.tailAngle}°`}
                value={rocker.tailAngle}
                min={ROCKER_ANGLE_RANGE_DEG.min}
                max={ROCKER_ANGLE_RANGE_DEG.max}
                step={ROCKER_ANGLE_RANGE_DEG.step}
                onValueChange={(v) =>
                  onChangeRocker({
                    tailAngle: degrees(clampFinite(v, ROCKER_ANGLE_RANGE_DEG.min, ROCKER_ANGLE_RANGE_DEG.max)),
                  })
                }
              />
            </div>

            <SliderRow
              label={`Tail Rocker — ${formatInchesFraction(rocker.tailLift)}`}
              value={mmToInches(rocker.tailLift)}
              min={ROCKER_LIFT_RANGE_IN.min}
              max={ROCKER_LIFT_RANGE_IN.max}
              step={ROCKER_LIFT_RANGE_IN.step}
              onValueChange={(v) =>
                onChangeRocker({
                  tailLift: inchesToMm(clampFinite(v, ROCKER_LIFT_RANGE_IN.min, ROCKER_LIFT_RANGE_IN.max)),
                })
              }
            />

            {/* Read-only, derived off the built curve — a shaper sees the two standard 12"
                figures without being able to force them (they were the abrupt-kink source before
                260829-rda). */}
            <div className="flex items-center justify-between border-t border-surf-line-faint pt-2.5 text-[10px] text-surf-ink-muted font-normal">
              <span>Nose @ 12&quot; — {formatInchesFraction(geometry.noseLiftAt12in)}</span>
              <span>Tail @ 12&quot; — {formatInchesFraction(geometry.tailLiftAt12in)}</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <SectionHeading open={sectionOpen.thickness} onToggle={() => onToggleSectionOpen("thickness")}>
          Thickness
        </SectionHeading>
        {sectionOpen.thickness && (
          <div className="flex flex-col gap-3.5 pt-3">
            <SliderRow
              label={`Nose Tip — ${formatInchesFraction(foil.noseTip)}`}
              value={mmToInches(foil.noseTip)}
              min={FOIL_THICKNESS_RANGE_IN.min}
              max={FOIL_THICKNESS_RANGE_IN.max}
              step={FOIL_THICKNESS_RANGE_IN.step}
              onValueChange={(v) =>
                onChangeFoil({
                  noseTip: inchesToMm(clampFinite(v, FOIL_THICKNESS_RANGE_IN.min, FOIL_THICKNESS_RANGE_IN.max)),
                })
              }
            />

            <SliderRow
              label={`Nose @ 12" — ${formatInchesFraction(foil.nose12)}`}
              value={mmToInches(foil.nose12)}
              min={FOIL_THICKNESS_RANGE_IN.min}
              max={FOIL_THICKNESS_RANGE_IN.max}
              step={FOIL_THICKNESS_RANGE_IN.step}
              onValueChange={(v) =>
                onChangeFoil({
                  nose12: inchesToMm(clampFinite(v, FOIL_THICKNESS_RANGE_IN.min, FOIL_THICKNESS_RANGE_IN.max)),
                })
              }
            />

            <SliderRow
              label={`Center — ${formatInchesFraction(foil.center)}`}
              value={mmToInches(foil.center)}
              min={FOIL_THICKNESS_RANGE_IN.min}
              max={FOIL_THICKNESS_RANGE_IN.max}
              step={FOIL_THICKNESS_RANGE_IN.step}
              onValueChange={(v) =>
                onChangeFoil({
                  center: inchesToMm(clampFinite(v, FOIL_THICKNESS_RANGE_IN.min, FOIL_THICKNESS_RANGE_IN.max)),
                })
              }
            />

            <SliderRow
              label={`Tail @ 12" — ${formatInchesFraction(foil.tail12)}`}
              value={mmToInches(foil.tail12)}
              min={FOIL_THICKNESS_RANGE_IN.min}
              max={FOIL_THICKNESS_RANGE_IN.max}
              step={FOIL_THICKNESS_RANGE_IN.step}
              onValueChange={(v) =>
                onChangeFoil({
                  tail12: inchesToMm(clampFinite(v, FOIL_THICKNESS_RANGE_IN.min, FOIL_THICKNESS_RANGE_IN.max)),
                })
              }
            />

            <SliderRow
              label={`Tail Tip — ${formatInchesFraction(foil.tailTip)}`}
              value={mmToInches(foil.tailTip)}
              min={FOIL_THICKNESS_RANGE_IN.min}
              max={FOIL_THICKNESS_RANGE_IN.max}
              step={FOIL_THICKNESS_RANGE_IN.step}
              onValueChange={(v) =>
                onChangeFoil({
                  tailTip: inchesToMm(clampFinite(v, FOIL_THICKNESS_RANGE_IN.min, FOIL_THICKNESS_RANGE_IN.max)),
                })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
