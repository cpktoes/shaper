"use client";

/**
 * The ROCKER sidebar — eight rocker-shape sliders and five thickness sliders, in two collapsible
 * groups mirroring `rail-controls.tsx`'s house style: the same `SectionHeading` treatment, the
 * same slider label/track markup (`mb-2 text-sm ...` label, `.slider-accent` track), so this
 * sidebar reads as the same system as the rail sidebar directly below it in the nav. Presentational
 * only — `rocker-editor.tsx` owns the design state and the section-open state; this component just
 * renders it (mirroring how `RailControls` is shaped).
 *
 * Each slider below is written out individually rather than through a shared ControlSlider
 * component — copying the label/track markup per station, per the plan's read_first note, rather
 * than factoring a wrapper that would hide each slider's own commit-callback call site.
 *
 * Quick task 260829-rda replaced the four typed rocker-lift sliders with eight shape controls
 * (Nose/Tail Rocker, Angle, Smoothness, Flatness), matching `outline-controls.tsx`'s own
 * angle/fullness/rail-length slider treatment — the rocker line is now built the same way the
 * board's outline curve is. The two 12" figures move from typed sliders to a read-only pair,
 * measured off the `RockerGeometry` the editor builds once per render and passes in.
 */

import type { ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
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

function sliderValue(v: number | readonly number[]): number {
  return typeof v === "number" ? v : (v[0] ?? 0);
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

            <div>
              <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                Nose Rocker — {formatInchesFraction(rocker.noseLift)}
              </div>
              <Slider
                value={mmToInches(rocker.noseLift)}
                min={ROCKER_LIFT_RANGE_IN.min}
                max={ROCKER_LIFT_RANGE_IN.max}
                step={ROCKER_LIFT_RANGE_IN.step}
                onValueChange={(v) =>
                  onChangeRocker({
                    noseLift: inchesToMm(
                      clampFinite(sliderValue(v), ROCKER_LIFT_RANGE_IN.min, ROCKER_LIFT_RANGE_IN.max),
                    ),
                  })
                }
                className="slider-accent"
              />
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                  Nose Angle — {rocker.noseAngle}°
                </div>
                <Slider
                  value={rocker.noseAngle}
                  min={ROCKER_ANGLE_RANGE_DEG.min}
                  max={ROCKER_ANGLE_RANGE_DEG.max}
                  step={ROCKER_ANGLE_RANGE_DEG.step}
                  onValueChange={(v) =>
                    onChangeRocker({
                      noseAngle: degrees(
                        clampFinite(sliderValue(v), ROCKER_ANGLE_RANGE_DEG.min, ROCKER_ANGLE_RANGE_DEG.max),
                      ),
                    })
                  }
                  className="slider-accent"
                />
              </div>

              <div className="flex-1">
                <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                  Nose Smoothness — {rocker.noseSmoothness}%
                </div>
                <Slider
                  value={rocker.noseSmoothness}
                  min={ROCKER_SMOOTHNESS_RANGE.min}
                  max={ROCKER_SMOOTHNESS_RANGE.max}
                  step={ROCKER_SMOOTHNESS_RANGE.step}
                  onValueChange={(v) =>
                    onChangeRocker({
                      noseSmoothness: clampFinite(
                        sliderValue(v),
                        ROCKER_SMOOTHNESS_RANGE.min,
                        ROCKER_SMOOTHNESS_RANGE.max,
                      ),
                    })
                  }
                  className="slider-accent"
                />
              </div>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                  Nose Flatness — {rocker.noseFlatness}%
                </div>
                <Slider
                  value={rocker.noseFlatness}
                  min={ROCKER_FLATNESS_RANGE.min}
                  max={ROCKER_FLATNESS_RANGE.max}
                  step={ROCKER_FLATNESS_RANGE.step}
                  onValueChange={(v) =>
                    onChangeRocker({
                      noseFlatness: clampFinite(
                        sliderValue(v),
                        ROCKER_FLATNESS_RANGE.min,
                        ROCKER_FLATNESS_RANGE.max,
                      ),
                    })
                  }
                  className="slider-accent"
                />
              </div>

              <div className="flex-1">
                <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                  Tail Flatness — {rocker.tailFlatness}%
                </div>
                <Slider
                  value={rocker.tailFlatness}
                  min={ROCKER_FLATNESS_RANGE.min}
                  max={ROCKER_FLATNESS_RANGE.max}
                  step={ROCKER_FLATNESS_RANGE.step}
                  onValueChange={(v) =>
                    onChangeRocker({
                      tailFlatness: clampFinite(
                        sliderValue(v),
                        ROCKER_FLATNESS_RANGE.min,
                        ROCKER_FLATNESS_RANGE.max,
                      ),
                    })
                  }
                  className="slider-accent"
                />
              </div>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                  Tail Smoothness — {rocker.tailSmoothness}%
                </div>
                <Slider
                  value={rocker.tailSmoothness}
                  min={ROCKER_SMOOTHNESS_RANGE.min}
                  max={ROCKER_SMOOTHNESS_RANGE.max}
                  step={ROCKER_SMOOTHNESS_RANGE.step}
                  onValueChange={(v) =>
                    onChangeRocker({
                      tailSmoothness: clampFinite(
                        sliderValue(v),
                        ROCKER_SMOOTHNESS_RANGE.min,
                        ROCKER_SMOOTHNESS_RANGE.max,
                      ),
                    })
                  }
                  className="slider-accent"
                />
              </div>

              <div className="flex-1">
                <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                  Tail Angle — {rocker.tailAngle}°
                </div>
                <Slider
                  value={rocker.tailAngle}
                  min={ROCKER_ANGLE_RANGE_DEG.min}
                  max={ROCKER_ANGLE_RANGE_DEG.max}
                  step={ROCKER_ANGLE_RANGE_DEG.step}
                  onValueChange={(v) =>
                    onChangeRocker({
                      tailAngle: degrees(
                        clampFinite(sliderValue(v), ROCKER_ANGLE_RANGE_DEG.min, ROCKER_ANGLE_RANGE_DEG.max),
                      ),
                    })
                  }
                  className="slider-accent"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                Tail Rocker — {formatInchesFraction(rocker.tailLift)}
              </div>
              <Slider
                value={mmToInches(rocker.tailLift)}
                min={ROCKER_LIFT_RANGE_IN.min}
                max={ROCKER_LIFT_RANGE_IN.max}
                step={ROCKER_LIFT_RANGE_IN.step}
                onValueChange={(v) =>
                  onChangeRocker({
                    tailLift: inchesToMm(
                      clampFinite(sliderValue(v), ROCKER_LIFT_RANGE_IN.min, ROCKER_LIFT_RANGE_IN.max),
                    ),
                  })
                }
                className="slider-accent"
              />
            </div>

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
            <div>
              <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                Nose Tip — {formatInchesFraction(foil.noseTip)}
              </div>
              <Slider
                value={mmToInches(foil.noseTip)}
                min={FOIL_THICKNESS_RANGE_IN.min}
                max={FOIL_THICKNESS_RANGE_IN.max}
                step={FOIL_THICKNESS_RANGE_IN.step}
                onValueChange={(v) =>
                  onChangeFoil({
                    noseTip: inchesToMm(
                      clampFinite(sliderValue(v), FOIL_THICKNESS_RANGE_IN.min, FOIL_THICKNESS_RANGE_IN.max),
                    ),
                  })
                }
                className="slider-accent"
              />
            </div>

            <div>
              <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                Nose @ 12&quot; — {formatInchesFraction(foil.nose12)}
              </div>
              <Slider
                value={mmToInches(foil.nose12)}
                min={FOIL_THICKNESS_RANGE_IN.min}
                max={FOIL_THICKNESS_RANGE_IN.max}
                step={FOIL_THICKNESS_RANGE_IN.step}
                onValueChange={(v) =>
                  onChangeFoil({
                    nose12: inchesToMm(
                      clampFinite(sliderValue(v), FOIL_THICKNESS_RANGE_IN.min, FOIL_THICKNESS_RANGE_IN.max),
                    ),
                  })
                }
                className="slider-accent"
              />
            </div>

            <div>
              <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                Center — {formatInchesFraction(foil.center)}
              </div>
              <Slider
                value={mmToInches(foil.center)}
                min={FOIL_THICKNESS_RANGE_IN.min}
                max={FOIL_THICKNESS_RANGE_IN.max}
                step={FOIL_THICKNESS_RANGE_IN.step}
                onValueChange={(v) =>
                  onChangeFoil({
                    center: inchesToMm(
                      clampFinite(sliderValue(v), FOIL_THICKNESS_RANGE_IN.min, FOIL_THICKNESS_RANGE_IN.max),
                    ),
                  })
                }
                className="slider-accent"
              />
            </div>

            <div>
              <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                Tail @ 12&quot; — {formatInchesFraction(foil.tail12)}
              </div>
              <Slider
                value={mmToInches(foil.tail12)}
                min={FOIL_THICKNESS_RANGE_IN.min}
                max={FOIL_THICKNESS_RANGE_IN.max}
                step={FOIL_THICKNESS_RANGE_IN.step}
                onValueChange={(v) =>
                  onChangeFoil({
                    tail12: inchesToMm(
                      clampFinite(sliderValue(v), FOIL_THICKNESS_RANGE_IN.min, FOIL_THICKNESS_RANGE_IN.max),
                    ),
                  })
                }
                className="slider-accent"
              />
            </div>

            <div>
              <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                Tail Tip — {formatInchesFraction(foil.tailTip)}
              </div>
              <Slider
                value={mmToInches(foil.tailTip)}
                min={FOIL_THICKNESS_RANGE_IN.min}
                max={FOIL_THICKNESS_RANGE_IN.max}
                step={FOIL_THICKNESS_RANGE_IN.step}
                onValueChange={(v) =>
                  onChangeFoil({
                    tailTip: inchesToMm(
                      clampFinite(sliderValue(v), FOIL_THICKNESS_RANGE_IN.min, FOIL_THICKNESS_RANGE_IN.max),
                    ),
                  })
                }
                className="slider-accent"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
