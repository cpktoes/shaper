"use client";

/**
 * The ROCKER sidebar — four rocker-lift sliders and five thickness sliders, in two collapsible
 * groups mirroring `rail-controls.tsx`'s house style: the same `SectionHeading` treatment, the
 * same slider label/track markup (`mb-2 text-sm ...` label, `.slider-accent` track), so this
 * sidebar reads as the same system as the rail sidebar directly below it in the nav. Presentational
 * only — `rocker-editor.tsx` owns the design state and the section-open state; this component just
 * renders it (mirroring how `RailControls` is shaped).
 *
 * Each of the nine sliders below is written out individually rather than through a shared
 * ControlSlider component — copying the label/track markup per station, per the plan's read_first
 * note, rather than factoring a wrapper that would hide each slider's own commit-callback call site.
 */

import type { ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import { FOIL_THICKNESS_RANGE_IN, type FoilSpec } from "@/lib/geometry/foil";
import { ROCKER_LIFT_RANGE_IN, type RockerSpec } from "@/lib/geometry/rocker";
import { formatInchesFraction, inchesToMm, mmToInches } from "@/lib/geometry/units";

export type RockerControlsSectionKey = "rocker" | "thickness";

interface RockerControlsProps {
  rocker: RockerSpec;
  foil: FoilSpec;
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
              the zero it&apos;s measured against.
            </div>

            <div>
              <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                Nose Tip — {formatInchesFraction(rocker.noseTip)}
              </div>
              <Slider
                value={mmToInches(rocker.noseTip)}
                min={ROCKER_LIFT_RANGE_IN.min}
                max={ROCKER_LIFT_RANGE_IN.max}
                step={ROCKER_LIFT_RANGE_IN.step}
                onValueChange={(v) =>
                  onChangeRocker({
                    noseTip: inchesToMm(
                      clampFinite(sliderValue(v), ROCKER_LIFT_RANGE_IN.min, ROCKER_LIFT_RANGE_IN.max),
                    ),
                  })
                }
                className="slider-accent"
              />
            </div>

            <div>
              <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                Nose @ 12&quot; — {formatInchesFraction(rocker.nose12)}
              </div>
              <Slider
                value={mmToInches(rocker.nose12)}
                min={ROCKER_LIFT_RANGE_IN.min}
                max={ROCKER_LIFT_RANGE_IN.max}
                step={ROCKER_LIFT_RANGE_IN.step}
                onValueChange={(v) =>
                  onChangeRocker({
                    nose12: inchesToMm(
                      clampFinite(sliderValue(v), ROCKER_LIFT_RANGE_IN.min, ROCKER_LIFT_RANGE_IN.max),
                    ),
                  })
                }
                className="slider-accent"
              />
            </div>

            <div>
              <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                Tail @ 12&quot; — {formatInchesFraction(rocker.tail12)}
              </div>
              <Slider
                value={mmToInches(rocker.tail12)}
                min={ROCKER_LIFT_RANGE_IN.min}
                max={ROCKER_LIFT_RANGE_IN.max}
                step={ROCKER_LIFT_RANGE_IN.step}
                onValueChange={(v) =>
                  onChangeRocker({
                    tail12: inchesToMm(
                      clampFinite(sliderValue(v), ROCKER_LIFT_RANGE_IN.min, ROCKER_LIFT_RANGE_IN.max),
                    ),
                  })
                }
                className="slider-accent"
              />
            </div>

            <div>
              <div className="mb-2 text-sm text-surf-ink-muted font-normal">
                Tail Tip — {formatInchesFraction(rocker.tailTip)}
              </div>
              <Slider
                value={mmToInches(rocker.tailTip)}
                min={ROCKER_LIFT_RANGE_IN.min}
                max={ROCKER_LIFT_RANGE_IN.max}
                step={ROCKER_LIFT_RANGE_IN.step}
                onValueChange={(v) =>
                  onChangeRocker({
                    tailTip: inchesToMm(
                      clampFinite(sliderValue(v), ROCKER_LIFT_RANGE_IN.min, ROCKER_LIFT_RANGE_IN.max),
                    ),
                  })
                }
                className="slider-accent"
              />
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
