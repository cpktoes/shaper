"use client";

/**
 * The Customize Rocker popup's rows (quick 261016-mkb, D-05, D-06; sketch 016 D, rounds five to
 * seven): NOSE and TAIL, each one or two change rows of two sliders on one line — Rocker (1/16" steps,
 * 1 mm in Metric, P-1) with its value box, beside Bend starts (whole inches from 3" in to the centre,
 * labelled in cm in Metric, P-2); `+ Add a second nose change` for a maker's two-point adjustment; a
 * Remove on a second change; ↺ Natural rocker under both ends; and the one line saying the fit never
 * changes.
 *
 * Every rule lives in `lib/geometry/custom-rocker.ts` (Rule 1): each Rocker slider stops at its floor
 * (`draftFloor`, D-06 — its left hint then says so), a second change's Bend starts is capped one inch
 * nearer the tip than the first's and moving the first pushes the second ahead of it
 * (`bendStartRange`, `withDraftBendStart`), and every amount is re-held to its floor whenever anything
 * moves. Every word and figure comes from `custom-rocker-text.ts`, through the display boundary (Rule
 * 2). This component holds no state: the popup owns the draft and hands it down.
 *
 * Every control is `disabled={locked}`: the popup can't open on a locked board, but the lock
 * inventory holds every file that can change one (T-mkb-08).
 */

import type { ReactNode } from "react";
import { SliderRow } from "@/components/design/slider-row";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import type { PreparedBlank } from "@/lib/geometry/blank-fit";
import {
  bendStartRange,
  draftFloor,
  NATURAL_DRAFT,
  withDraftAmount,
  withDraftBendStart,
  withoutChange,
  withSecondChange,
  type RockerDraft,
} from "@/lib/geometry/custom-rocker";
import {
  addSecondChangeLabel,
  amountHints,
  BEND_SLIDER_LABEL,
  bendSliderName,
  bendSliderPosition,
  bendStartFromSlider,
  bendStartHints,
  bendStartText,
  CUSTOM_ROCKER_FIT_LINE,
  endHeading,
  NATURAL_ROCKER_LABEL,
  REMOVE_CHANGE_LABEL,
  ROCKER_SLIDER_LABEL,
  rockerAmountText,
  rockerChangeLabel,
  rockerSliderName,
} from "@/lib/geometry/custom-rocker-text";
import { measureSlider } from "@/lib/geometry/measure-display";
import { inchesToMm, mm, mmToInches, type UnitsSystem } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";

type End = "nose" | "tail";

/** The most a change may add at its tip, in inches (D-05: "+2" stays the top"). */
const AMOUNT_MAX_IN = 2;
const AMOUNT_STEP_IN = 1 / 16;
/** An amount within this of its floor is on it. */
const ON_FLOOR_MM = 1e-6;

/** The 11px/700 text-link idiom, grown to 44px on a touch pointer. */
const TEXT_LINK_CLASS =
  "focus-ring-accent cursor-pointer text-left text-xs font-bold disabled:cursor-default disabled:opacity-40 coarse:flex coarse:min-h-11 coarse:items-center";

/** The slider step a Rocker moves by: 1/16" in Imperial, 1 mm in Metric (P-1). */
export function rockerStepMm(system: UnitsSystem) {
  return system === "metric" ? mm(1) : inchesToMm(AMOUNT_STEP_IN);
}

export interface CustomRockerRowsProps {
  /** The board's blank, prepared — the floor is read off its natural rocker. */
  prepared: PreparedBlank;
  draft: RockerDraft;
  onDraftChange: (draft: RockerDraft) => void;
  system: UnitsSystem;
}

function EndHeading({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-extrabold tracking-architectural text-surf-ink-muted uppercase">{children}</div>;
}

export function CustomRockerRows({ prepared, draft, onDraftChange, system }: CustomRockerRowsProps) {
  const locked = useControlsLocked();
  const stepMm = rockerStepMm(system);
  const L = prepared.lengthMm;

  const changeRow = (end: End, index: number) => {
    const row = draft[end][index];
    const floor = draftFloor(prepared, draft, end, index, stepMm);
    const amount = measureSlider(row.amount, { min: mmToInches(floor), max: AMOUNT_MAX_IN }, AMOUNT_STEP_IN, 1, system);
    const atFloor = row.amount <= floor + ON_FLOOR_MM;
    const [lessHint, moreHint] = amountHints(atFloor);
    const range = bendStartRange(L, draft, end, index);
    const bendValue = row.fromTipIn ?? range.centreAt ?? range.max;
    const [leftHint, rightHint] = bendStartHints(end, index);
    const amountText = rockerAmountText(row.amount, system);
    const bendText = bendStartText(row.fromTipIn, system);
    return (
      <div
        key={`${end}-${index}`}
        data-custom-rocker-change={`${end}-${index + 1}`}
        className={cn("flex flex-col gap-1", index > 0 && "border-t border-dashed border-surf-line-faint pt-2")}
      >
        <div className="flex items-baseline gap-2 text-sm text-surf-ink">
          <span>{rockerChangeLabel(index)}</span>
          {index > 0 && (
            <button
              type="button"
              disabled={locked}
              onClick={() => onDraftChange(withoutChange(prepared, draft, end, index, stepMm))}
              className={cn(TEXT_LINK_CLASS, "text-surf-ink-muted")}
            >
              {REMOVE_CHANGE_LABEL}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {/* Two to three: Bend starts carries the longer value box ("At the centre"), so it takes the
              wider share and its label never cuts off on the computer's 340-wide column. */}
          <SliderRow
            className="min-w-0 flex-[2_1_0%]"
            label={ROCKER_SLIDER_LABEL}
            valueBox={amountText}
            value={amount.value}
            min={amount.min}
            max={amount.max}
            step={amount.step}
            disabled={locked}
            sliderLabel={rockerSliderName(end, index)}
            sliderValueText={amountText}
            leftHint={atFloor ? <span data-rocker-floor-hint>{lessHint}</span> : lessHint}
            rightHint={moreHint}
            onValueChange={(v) => onDraftChange(withDraftAmount(prepared, draft, end, index, amount.toMm(v), stepMm))}
          />
          {/* The thumb runs the way the drawing lies (fast task 170): a tail slider is mirrored over its
              range, so pushing it right pushes the bend toward the tail on the right of the drawing;
              `bendStartFromSlider` turns the thumb back into inches in from the tip. */}
          <SliderRow
            className="min-w-0 flex-[3_1_0%]"
            label={BEND_SLIDER_LABEL}
            valueBox={bendText}
            value={bendSliderPosition(end, range, bendValue)}
            min={range.min}
            max={range.max}
            step={1}
            disabled={locked}
            sliderLabel={bendSliderName(end, index)}
            sliderValueText={bendText}
            leftHint={leftHint}
            rightHint={rightHint}
            onValueChange={(v) =>
              onDraftChange(withDraftBendStart(prepared, draft, end, index, bendStartFromSlider(end, range, v), stepMm))
            }
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {(["nose", "tail"] as const).map((end, e) => {
        const rows = draft[end];
        const canAdd = rows.length === 1 && Math.abs(rows[0].amount) > ON_FLOOR_MM;
        return (
          <section
            key={end}
            data-custom-rocker-end={end}
            className={cn("flex flex-col gap-2", e > 0 && "border-t border-surf-line-faint pt-3")}
          >
            <EndHeading>{endHeading(end)}</EndHeading>
            {rows.map((_, index) => changeRow(end, index))}
            {canAdd && (
              <button
                type="button"
                disabled={locked}
                onClick={() => onDraftChange(withSecondChange(prepared, draft, end, stepMm))}
                className={cn(TEXT_LINK_CLASS, "self-start text-surf-accent-ink")}
              >
                {addSecondChangeLabel(end)}
              </button>
            )}
          </section>
        );
      })}
      <div className="flex flex-col gap-1.5 border-t border-surf-line-faint pt-3">
        <button
          type="button"
          disabled={locked}
          onClick={() => onDraftChange(NATURAL_DRAFT)}
          className={cn(TEXT_LINK_CLASS, "self-start text-surf-ink")}
        >
          {NATURAL_ROCKER_LABEL}
        </button>
        <p className="text-xs text-surf-ink-muted">{CUSTOM_ROCKER_FIT_LINE}</p>
      </div>
    </div>
  );
}
