"use client";

/**
 * The BOARD ON BLANK section of the ROCKER sidebar (Phase 11, D-08, R3, R4; 11-UI-SPEC §3, §4).
 *
 * The placement slider slides the board along its blank, both ways from centre (0 = the two
 * centres line up), each end half an inch short of where the board's tip would meet the blank's.
 * The stored placement is positive toward the NOSE, but the slider's LEFT end is toward the nose —
 * matching the drawing's nose-left view and the nose-first order of everything on this screen —
 * so `placementSlider` feeds the slider the negated value and negates back on the way out
 * (unit-tested there: a drag to the left raises the stored value).
 *
 * Under it, with a blank picked, the live readouts: the rocker and the foam to come off at the
 * board's five stations, nose to tail, re-read on every slider move from the store's one side
 * profile — one sample of one prepared blank, never a list verdict and never a network request
 * (R14). A Foam Off below zero (the board pokes out of the foam there) reads in warning ink with
 * its minus sign; one that prints as zero reads as zero.
 *
 * No blank: the slider is disabled at centre ("Placement — pick a blank first") and there is no
 * readouts block — the hand-set ROCKER sliders already show every rocker number. A blank with no
 * room to slide (only possible with Extra Length set under 1") is disabled at centre with a note.
 *
 * Every number goes through `lib/geometry/measure-display.ts` (CLAUDE.md Rule 2).
 */

import { useDesign } from "@/components/design/design-store";
import { SliderRow } from "@/components/design/slider-row";
import { useUnits } from "@/components/units-provider";
import { placementRange } from "@/lib/geometry/blank-fit";
import { formatPlacement, placementSlider } from "@/lib/geometry/blank-reasons";
import type { FoilStationKey } from "@/lib/geometry/foil";
import { formatMark, stationLabel } from "@/lib/geometry/measure-display";
import { mm, type Mm, type UnitsSystem } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";

/** The five stations, nose to tail — the order every list and table on this screen reads in. */
const STATIONS_NOSE_TO_TAIL: readonly FoilStationKey[] = ["noseTip", "nose12", "center", "tail12", "tailTip"];

function stationName(key: FoilStationKey, system: UnitsSystem): string {
  switch (key) {
    case "noseTip":
      return "Nose Tip";
    case "nose12":
      return `Nose @ ${stationLabel(system)}`;
    case "center":
      return "Center";
    case "tail12":
      return `Tail @ ${stationLabel(system)}`;
    case "tailTip":
      return "Tail Tip";
  }
}

/** A value that prints as zero reads as an unsigned zero — never a warning `-0`. */
function markOrZero(value: Mm, system: UnitsSystem): { text: string; negative: boolean } {
  const zero = formatMark(mm(0), system);
  const printed = formatMark(value, system);
  if (printed === zero || printed === `-${zero}`) return { text: zero, negative: false };
  return { text: printed, negative: value < 0 };
}

/** The 10px/800 uppercase header role the datasheet's station headers use. */
const HEADER_CLASS = "text-[10px] font-extrabold uppercase tracking-architectural text-surf-ink-muted";
const VALUE_CLASS = "text-right text-xs font-semibold tabular-nums";

/** A disabled slider sits at centre over a token range; nothing can move it. */
const IDLE_RANGE = { value: 0, min: -1, max: 1, step: 1 };

export function BoardOnBlankSection() {
  const { system } = useUnits();
  const { blank, sideProfile, outline, setPlacement } = useDesign();
  const view = sideProfile.blank;

  if (!blank || !view) {
    return (
      <SliderRow
        label="Placement — pick a blank first"
        {...IDLE_RANGE}
        disabled
        leftHint="Toward the nose"
        rightHint="Toward the tail"
        onValueChange={() => {}}
      />
    );
  }

  const range = placementRange(blank.copy.lengthMm, outline.length);
  const noRoom = range.max <= 0;

  return (
    <div className="flex flex-col">
      {noRoom ? (
        <SliderRow
          label="Placement — centered"
          {...IDLE_RANGE}
          disabled
          leftHint="Toward the nose"
          rightHint="Toward the tail"
          note="This blank is too short to slide your board along it."
          onValueChange={() => {}}
        />
      ) : (
        (() => {
          // The clamped placement the side profile actually uses (stored as given, clamped on read).
          const slider = placementSlider(view.placement, range, system);
          return (
            <SliderRow
              label={`Placement — ${formatPlacement(view.placement, system)}`}
              value={slider.value}
              min={slider.min}
              max={slider.max}
              step={slider.step}
              leftHint="Toward the nose"
              rightHint="Toward the tail"
              onValueChange={(v) => setPlacement(slider.toMm(v))}
            />
          );
        })()
      )}

      <div data-readouts className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1">
        <div className={HEADER_CLASS}>STATION</div>
        <div className={cn(HEADER_CLASS, "text-right")}>ROCKER</div>
        <div className={cn(HEADER_CLASS, "text-right")}>FOAM OFF</div>
        {STATIONS_NOSE_TO_TAIL.map((key) => {
          const rocker = markOrZero(sideProfile.stationRocker[key], system);
          const foam = markOrZero(view.foamOff[key], system);
          return (
            <div key={key} data-readout-row={key} className="contents">
              <div className="text-xs text-surf-ink-muted">{stationName(key, system)}</div>
              <div className={cn(VALUE_CLASS, key === "center" ? "text-surf-ink-muted" : "text-surf-ink")}>
                {rocker.text}
              </div>
              <div className={cn(VALUE_CLASS, foam.negative ? "text-surf-warning-ink" : "text-surf-ink")}>
                {foam.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
