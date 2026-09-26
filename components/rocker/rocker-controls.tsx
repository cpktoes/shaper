"use client";

/**
 * The ROCKER sidebar. Two collapsible groups, mirroring `rail-controls.tsx`'s house style — the
 * same `SectionHeading` treatment and the same shared `SliderRow` (components/design/slider-row.tsx),
 * so this sidebar reads as the same system as the rail sidebar directly below it in the nav.
 * Presentational only — `rocker-editor.tsx` owns the design state and the section-open state; this
 * component just renders it (mirroring how `RailControls` is shaped).
 *
 * ROCKER (Phase 11, D-14) is the hand-set fallback a board carries until a blank is picked: four
 * plain sliders — Nose Tip, Nose @ 12", Tail @ 12", Tail Tip — over `ROCKER_LIFT_RANGE_IN`, each
 * writing its own station of the board's `FiveStationRocker`. The centre is always 0 (the flat the
 * rocker is measured up from) and is not a control. This retires quick task 260829-rda's
 * Angle/Smoothness/Flatness shape controls, the read-only 12" pair they derived, and their intro:
 * the Bezier they steered is migration-only now (`lib/geometry/rocker.ts`, deviation 3). The
 * founder chose four typed stations knowing a hand-typed 12" value can put a kink back into the
 * curve there (D-14); do not bring the shape controls back without asking.
 *
 * THICKNESS is the five-station foil, one slider per line — the nose-to-tail progression has no
 * natural pairs. Unchanged by this plan.
 *
 * Every slider commits its own number through `measureSlider`'s conversion at its call site —
 * `SliderRow` never sees or touches that conversion; it only renders the row and reports the raw
 * number back through `onValueChange`. Every slider here is on screen from the moment the page
 * opens, on a phone the same as on a desktop (the Phase 9 "Fine adjust" fold was withdrawn on
 * 2026-09-09).
 */

import { type ReactNode } from "react";
import { SliderRow } from "@/components/design/slider-row";
import { useUnits } from "@/components/units-provider";
import { FOIL_THICKNESS_RANGE_IN, type FoilSpec } from "@/lib/geometry/foil";
import { formatMark, measureSlider, stationLabel } from "@/lib/geometry/measure-display";
import { ROCKER_LIFT_RANGE_IN, type FiveStationRocker } from "@/lib/geometry/rocker";

export type RockerControlsSectionKey = "rocker" | "thickness";

interface RockerControlsProps {
  /** The board's hand-set rocker (D-14) — four typed stations, the centre always 0. */
  rocker: FiveStationRocker;
  foil: FoilSpec;
  onChangeRocker: (patch: Partial<FiveStationRocker>) => void;
  onChangeFoil: (patch: Partial<FoilSpec>) => void;
  sectionOpen: Record<RockerControlsSectionKey, boolean>;
  onToggleSectionOpen: (key: RockerControlsSectionKey) => void;
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
  const { system } = useUnits();
  const rockerNoseTipSlider = measureSlider(rocker.noseTip, ROCKER_LIFT_RANGE_IN, ROCKER_LIFT_RANGE_IN.step, 1, system);
  const rockerNose12Slider = measureSlider(rocker.nose12, ROCKER_LIFT_RANGE_IN, ROCKER_LIFT_RANGE_IN.step, 1, system);
  const rockerTail12Slider = measureSlider(rocker.tail12, ROCKER_LIFT_RANGE_IN, ROCKER_LIFT_RANGE_IN.step, 1, system);
  const rockerTailTipSlider = measureSlider(rocker.tailTip, ROCKER_LIFT_RANGE_IN, ROCKER_LIFT_RANGE_IN.step, 1, system);
  const noseTipSlider = measureSlider(foil.noseTip, FOIL_THICKNESS_RANGE_IN, FOIL_THICKNESS_RANGE_IN.step, 1, system);
  const nose12Slider = measureSlider(foil.nose12, FOIL_THICKNESS_RANGE_IN, FOIL_THICKNESS_RANGE_IN.step, 1, system);
  const centerSlider = measureSlider(foil.center, FOIL_THICKNESS_RANGE_IN, FOIL_THICKNESS_RANGE_IN.step, 1, system);
  const tail12Slider = measureSlider(foil.tail12, FOIL_THICKNESS_RANGE_IN, FOIL_THICKNESS_RANGE_IN.step, 1, system);
  const tailTipSlider = measureSlider(foil.tailTip, FOIL_THICKNESS_RANGE_IN, FOIL_THICKNESS_RANGE_IN.step, 1, system);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionHeading open={sectionOpen.rocker} onToggle={() => onToggleSectionOpen("rocker")}>
          Rocker
        </SectionHeading>
        {sectionOpen.rocker && (
          <div className="flex flex-col gap-3.5 pt-3">
            <div className="text-xs text-surf-ink-muted font-normal">
              Hand-set until you pick a blank — measured up from a flat surface with the board
              bottom-down.
            </div>

            <SliderRow
              label={`Nose Tip — ${formatMark(rocker.noseTip, system)}`}
              value={rockerNoseTipSlider.value}
              min={rockerNoseTipSlider.min}
              max={rockerNoseTipSlider.max}
              step={rockerNoseTipSlider.step}
              onValueChange={(v) => onChangeRocker({ noseTip: rockerNoseTipSlider.toMm(v) })}
            />

            <SliderRow
              label={`Nose @ ${stationLabel(system)} — ${formatMark(rocker.nose12, system)}`}
              value={rockerNose12Slider.value}
              min={rockerNose12Slider.min}
              max={rockerNose12Slider.max}
              step={rockerNose12Slider.step}
              onValueChange={(v) => onChangeRocker({ nose12: rockerNose12Slider.toMm(v) })}
            />

            <SliderRow
              label={`Tail @ ${stationLabel(system)} — ${formatMark(rocker.tail12, system)}`}
              value={rockerTail12Slider.value}
              min={rockerTail12Slider.min}
              max={rockerTail12Slider.max}
              step={rockerTail12Slider.step}
              onValueChange={(v) => onChangeRocker({ tail12: rockerTail12Slider.toMm(v) })}
            />

            <SliderRow
              label={`Tail Tip — ${formatMark(rocker.tailTip, system)}`}
              value={rockerTailTipSlider.value}
              min={rockerTailTipSlider.min}
              max={rockerTailTipSlider.max}
              step={rockerTailTipSlider.step}
              onValueChange={(v) => onChangeRocker({ tailTip: rockerTailTipSlider.toMm(v) })}
            />
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
              label={`Nose Tip — ${formatMark(foil.noseTip, system)}`}
              value={noseTipSlider.value}
              min={noseTipSlider.min}
              max={noseTipSlider.max}
              step={noseTipSlider.step}
              onValueChange={(v) => onChangeFoil({ noseTip: noseTipSlider.toMm(v) })}
            />

            <SliderRow
              label={`Nose @ ${stationLabel(system)} — ${formatMark(foil.nose12, system)}`}
              value={nose12Slider.value}
              min={nose12Slider.min}
              max={nose12Slider.max}
              step={nose12Slider.step}
              onValueChange={(v) => onChangeFoil({ nose12: nose12Slider.toMm(v) })}
            />

            <SliderRow
              label={`Center — ${formatMark(foil.center, system)}`}
              value={centerSlider.value}
              min={centerSlider.min}
              max={centerSlider.max}
              step={centerSlider.step}
              onValueChange={(v) => onChangeFoil({ center: centerSlider.toMm(v) })}
            />

            <SliderRow
              label={`Tail @ ${stationLabel(system)} — ${formatMark(foil.tail12, system)}`}
              value={tail12Slider.value}
              min={tail12Slider.min}
              max={tail12Slider.max}
              step={tail12Slider.step}
              onValueChange={(v) => onChangeFoil({ tail12: tail12Slider.toMm(v) })}
            />

            <SliderRow
              label={`Tail Tip — ${formatMark(foil.tailTip, system)}`}
              value={tailTipSlider.value}
              min={tailTipSlider.min}
              max={tailTipSlider.max}
              step={tailTipSlider.step}
              onValueChange={(v) => onChangeFoil({ tailTip: tailTipSlider.toMm(v) })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
