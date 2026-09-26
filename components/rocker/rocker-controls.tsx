"use client";

/**
 * The ROCKER sidebar, top to bottom in the brief's order (Phase 11, 11-UI-SPEC "The sidebar, top to
 * bottom"): CENTER THICKNESS → BLANK → BOARD ON BLANK → ROCKER (only with no blank) → THICKNESS.
 * Every group is the same collapsible `SectionHeading` `rail-controls.tsx` uses, all open on
 * arrival; the open/closed map is view state owned by `rocker-editor.tsx`, never saved.
 *
 * CENTER THICKNESS (R1, D-12) is the page's first control: the board's ONE centre thickness, the
 * same stored `foil.center` RAILS and VOLUME read — a typed field on the label line and a slider,
 * the Board Length hand-rolled shape compacted to one line (the one raw `<Slider>` here, named in
 * `slider-row.test.ts`'s allowlist). Changing it re-judges the blank list and re-checks the picked
 * blank; it never clears the pick.
 *
 * BLANK (`blank-picker.tsx`) and BOARD ON BLANK (`board-on-blank.tsx`) read the store themselves.
 *
 * ROCKER (D-14) is the hand-set fallback a board carries until a blank is picked: four plain
 * sliders — Nose Tip, Nose @ 12", Tail @ 12", Tail Tip — over `ROCKER_LIFT_RANGE_IN`. The centre is
 * always 0 (the flat the rocker is measured up from) and is not a control. The founder chose four
 * typed stations knowing a hand-typed 12" value can put a kink back into the curve there (D-14); do
 * not bring the Angle/Smoothness/Flatness shape controls back without asking. With a blank picked
 * the rocker comes off the blank, so this section is not shown at all.
 *
 * THICKNESS, nose to tail. The two tips are absolute in both states and stored on the board (D-10).
 * With no blank the two 12" stations are absolute too. With a blank picked they are the blank's own
 * foil scaled to the centre (D-18) plus the shaper's signed fine-tune (D-11): the label shows the
 * FINAL thickness, the slider moves only the tweak (±1/4" / ±6 mm around 0), and the two-ended hint
 * reads "From blank …" and "Tweak …" (or "No tweak"). "↺ Reset Fine-Tune" clears both tweaks; with
 * both at zero it stays in place, dimmed and inert, so nothing above it shifts.
 *
 * Every slider commits its own number through `measureSlider`'s conversion at its call site, and
 * every number reads through `lib/geometry/measure-display.ts` (CLAUDE.md Rule 2). Every control is
 * on screen from the moment the page opens, on a phone the same as on a desktop.
 */

import { type ReactNode } from "react";
import { MeasureField } from "@/components/design/measure-field";
import { SliderRow, sliderValue } from "@/components/design/slider-row";
import { Slider } from "@/components/ui/slider";
import { useUnits } from "@/components/units-provider";
import type { BlankCatalogResult } from "@/lib/db/blanks";
import type { BoardBlank } from "@/lib/geometry/blank";
import type { BoardSideProfile } from "@/lib/geometry/board-profile";
import { FOIL_THICKNESS_RANGE_IN, type FoilSpec } from "@/lib/geometry/foil";
import {
  formatMark,
  formatSignedMark,
  measureSlider,
  stationLabel,
  typedFieldBounds,
} from "@/lib/geometry/measure-display";
import { ROCKER_LIFT_RANGE_IN, type FiveStationRocker } from "@/lib/geometry/rocker";
import { mm, type Mm, type UnitsSystem } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";
import { BlankPicker } from "./blank-picker";
import { BoardOnBlankSection } from "./board-on-blank";

export type RockerControlsSectionKey = "center" | "blank" | "boardOnBlank" | "rocker" | "thickness";

/** The 12" fine-tune's reach either way from the blank-derived thickness, in inches (±6 mm metric,
 * rounded inward by `measureSlider`) — `(researcher's choice — founder may overrule)` (UI-SPEC §5). */
const FINE_TUNE_RANGE_IN = { min: -0.25, max: 0.25 } as const;
const FINE_TUNE_STEP_IN = 0.0625;

interface RockerControlsProps {
  /** The pickable catalogue, streamed from the page and never awaited there (Pattern 8). */
  blanks: Promise<BlankCatalogResult>;
  /** The board's hand-set rocker (D-14) — four typed stations, the centre always 0. */
  rocker: FiveStationRocker;
  foil: FoilSpec;
  /** The board's blank, or null for the hand-set fallback. */
  blank: BoardBlank | null;
  /** The store's one side profile — the final thicknesses and, with a blank, the derived 12"s. */
  sideProfile: BoardSideProfile;
  onChangeRocker: (patch: Partial<FiveStationRocker>) => void;
  onChangeFoil: (patch: Partial<FoilSpec>) => void;
  onFineTune: (patch: Partial<{ nose12Offset: Mm; tail12Offset: Mm }>) => void;
  onResetFineTune: () => void;
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

/** One absolute thickness slider over `FOIL_THICKNESS_RANGE_IN`. */
function ThicknessRow({
  label,
  value,
  system,
  onChange,
}: {
  label: string;
  value: Mm;
  system: UnitsSystem;
  onChange: (next: Mm) => void;
}) {
  const slider = measureSlider(value, FOIL_THICKNESS_RANGE_IN, FOIL_THICKNESS_RANGE_IN.step, 1, system);
  return (
    <SliderRow
      label={`${label} — ${formatMark(value, system)}`}
      value={slider.value}
      min={slider.min}
      max={slider.max}
      step={slider.step}
      onValueChange={(v) => onChange(slider.toMm(v))}
    />
  );
}

/** A 12" station with a blank picked: the final thickness in the label, the tweak on the slider. */
function FineTuneRow({
  label,
  finalThickness,
  derived,
  offset,
  system,
  onChange,
}: {
  label: string;
  finalThickness: Mm;
  derived: Mm;
  offset: Mm;
  system: UnitsSystem;
  onChange: (next: Mm) => void;
}) {
  const slider = measureSlider(offset, FINE_TUNE_RANGE_IN, FINE_TUNE_STEP_IN, 1, system);
  const tweak = formatSignedMark(offset, system);
  return (
    <SliderRow
      label={`${label} — ${formatMark(finalThickness, system)}`}
      value={slider.value}
      min={slider.min}
      max={slider.max}
      step={slider.step}
      leftHint={`From blank ${formatMark(derived, system)}`}
      rightHint={tweak === formatSignedMark(mm(0), system) ? "No tweak" : `Tweak ${tweak}`}
      onValueChange={(v) => onChange(slider.toMm(v))}
    />
  );
}

export function RockerControls({
  blanks,
  rocker,
  foil,
  blank,
  sideProfile,
  onChangeRocker,
  onChangeFoil,
  onFineTune,
  onResetFineTune,
  sectionOpen,
  onToggleSectionOpen,
}: RockerControlsProps) {
  const { system } = useUnits();
  const rockerNoseTipSlider = measureSlider(rocker.noseTip, ROCKER_LIFT_RANGE_IN, ROCKER_LIFT_RANGE_IN.step, 1, system);
  const rockerNose12Slider = measureSlider(rocker.nose12, ROCKER_LIFT_RANGE_IN, ROCKER_LIFT_RANGE_IN.step, 1, system);
  const rockerTail12Slider = measureSlider(rocker.tail12, ROCKER_LIFT_RANGE_IN, ROCKER_LIFT_RANGE_IN.step, 1, system);
  const rockerTailTipSlider = measureSlider(rocker.tailTip, ROCKER_LIFT_RANGE_IN, ROCKER_LIFT_RANGE_IN.step, 1, system);
  const centerSlider = measureSlider(foil.center, FOIL_THICKNESS_RANGE_IN, FOIL_THICKNESS_RANGE_IN.step, 1, system);
  // The typed field's bounds in ITS own domain (whole millimetres in Metric, inches in Imperial).
  const centerFieldBounds = typedFieldBounds(centerSlider, "mark", system);
  const view = blank ? sideProfile.blank : null;
  const noTweak = !blank || (blank.nose12Offset === 0 && blank.tail12Offset === 0);
  const station = stationLabel(system);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionHeading open={sectionOpen.center} onToggle={() => onToggleSectionOpen("center")}>
          Center Thickness
        </SectionHeading>
        {sectionOpen.center && (
          <div className="pt-3">
            {/* The Board Length hand-rolled shape compacted to one line: label and typed field on
                the label line, the slider beneath — allow-listed in slider-row.test.ts. */}
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm text-surf-ink-muted font-normal">Center Thickness</span>
              <MeasureField
                value={foil.center}
                onCommit={(next) => onChangeFoil({ center: next })}
                label="Center Thickness"
                family="mark"
                min={centerFieldBounds.min}
                max={centerFieldBounds.max}
                system={system}
              />
            </div>
            <Slider
              value={centerSlider.value}
              min={centerSlider.min}
              max={centerSlider.max}
              step={centerSlider.step}
              onValueChange={(v) => onChangeFoil({ center: centerSlider.toMm(sliderValue(v)) })}
              className="slider-accent"
            />
            <div className="mt-2 text-xs text-surf-ink-muted font-normal">
              The board&apos;s one center thickness — Rails and Volume read it too.
            </div>
          </div>
        )}
      </div>

      <div>
        <SectionHeading open={sectionOpen.blank} onToggle={() => onToggleSectionOpen("blank")}>
          Blank
        </SectionHeading>
        {sectionOpen.blank && (
          <div className="pt-3">
            <BlankPicker catalog={blanks} />
          </div>
        )}
      </div>

      <div>
        <SectionHeading open={sectionOpen.boardOnBlank} onToggle={() => onToggleSectionOpen("boardOnBlank")}>
          Board on Blank
        </SectionHeading>
        {sectionOpen.boardOnBlank && (
          <div className="pt-3">
            <BoardOnBlankSection />
          </div>
        )}
      </div>

      {!blank && (
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
                label={`Nose @ ${station} — ${formatMark(rocker.nose12, system)}`}
                value={rockerNose12Slider.value}
                min={rockerNose12Slider.min}
                max={rockerNose12Slider.max}
                step={rockerNose12Slider.step}
                onValueChange={(v) => onChangeRocker({ nose12: rockerNose12Slider.toMm(v) })}
              />

              <SliderRow
                label={`Tail @ ${station} — ${formatMark(rocker.tail12, system)}`}
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
      )}

      <div>
        <SectionHeading open={sectionOpen.thickness} onToggle={() => onToggleSectionOpen("thickness")}>
          Thickness
        </SectionHeading>
        {sectionOpen.thickness && (
          <div className="flex flex-col gap-3.5 pt-3">
            <div className="text-xs text-surf-ink-muted font-normal">
              {blank
                ? `Your blank's own foil, scaled down to your center. Set the tips; fine-tune the ${station} stations if you need to.`
                : "Hand-set until you pick a blank."}
            </div>

            <ThicknessRow
              label="Nose Tip"
              value={foil.noseTip}
              system={system}
              onChange={(next) => onChangeFoil({ noseTip: next })}
            />

            {blank && view ? (
              <>
                <FineTuneRow
                  label={`Nose @ ${station}`}
                  finalThickness={sideProfile.effectiveFoil.nose12}
                  derived={view.derived12.nose12}
                  offset={blank.nose12Offset}
                  system={system}
                  onChange={(next) => onFineTune({ nose12Offset: next })}
                />
                <FineTuneRow
                  label={`Tail @ ${station}`}
                  finalThickness={sideProfile.effectiveFoil.tail12}
                  derived={view.derived12.tail12}
                  offset={blank.tail12Offset}
                  system={system}
                  onChange={(next) => onFineTune({ tail12Offset: next })}
                />
              </>
            ) : (
              <>
                <ThicknessRow
                  label={`Nose @ ${station}`}
                  value={foil.nose12}
                  system={system}
                  onChange={(next) => onChangeFoil({ nose12: next })}
                />
                <ThicknessRow
                  label={`Tail @ ${station}`}
                  value={foil.tail12}
                  system={system}
                  onChange={(next) => onChangeFoil({ tail12: next })}
                />
              </>
            )}

            <ThicknessRow
              label="Tail Tip"
              value={foil.tailTip}
              system={system}
              onChange={(next) => onChangeFoil({ tailTip: next })}
            />

            {blank && (
              // Stays in place when there is nothing to reset — dimmed and inert, so the rows
              // above never shift. No confirmation: undo brings the tweaks back.
              <button
                type="button"
                aria-disabled={noTweak ? "true" : undefined}
                tabIndex={noTweak ? -1 : undefined}
                onClick={() => {
                  if (!noTweak) onResetFineTune();
                }}
                className={cn(
                  "focus-ring-accent cursor-pointer self-start text-left text-[11px] font-bold text-surf-accent-ink coarse:flex coarse:min-h-11 coarse:items-center",
                  noTweak && "pointer-events-none opacity-40",
                )}
              >
                ↺ Reset Fine-Tune
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
