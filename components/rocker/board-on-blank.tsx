"use client";

/**
 * The BOARD ON BLANK section of the ROCKER sidebar (Phase 11, D-08, R3, R4; Phase 12, D-01, D-03,
 * D-06, D-12; 12-UI-SPEC §1–§3, §11).
 *
 * The placement slider slides the board along its blank, both ways from centre (0 = the two
 * centres line up), each end half an inch short of where the board's tip would meet the blank's.
 * The stored placement is positive toward the NOSE, but the slider's LEFT end is toward the nose —
 * matching the drawing's nose-left view and the nose-first order of everything on this screen —
 * so `placementSlider` feeds the slider the negated value and negates back on the way out
 * (unit-tested there: a drag to the left raises the stored value).
 *
 * Directly under it, the Deck Skin slider (Phase 12, D-01): how much foam the planer takes off the
 * blank's deck. It is the board's own, stored on its blank (the first pick took the shaper's Fit &
 * Tip Defaults value), 0"–1" in 1/16" steps (0–25 mm in Metric, Phase 13 item 4b — this range was
 * 1/16"–1/2" until 2026-09-28) through the same range constant the Fit & Tip Defaults dialog uses
 * (`DECK_SKIN_RANGE_IN` reads `FIT_DEFAULTS_RANGE_IN.deckSkin` directly, with no edit of its own).
 * Its hint says where the skin comes off: the same at every station under Pin deck, more at the
 * tips under Bottom — and, when a 12" fine-tune is taken off the Deck, that the fine-tune changes
 * it there and where the numbers are. A drag lowers or raises the board's deck at every station and
 * moves the foam off the bottom by the same amount; it never clears the pick. At 0 the board takes
 * no deck skin, so the label reads `Deck Skin — none` and, under Pin deck with no Deck fine-tune,
 * the hint reads `Nothing off the deck at any station` (Phase 13 item 4b, FD-6/FD-8). A saved skin
 * past the 1" end — only a hand-crafted save can hold one — reads its true value on the label, with
 * the thumb pinned at the slider's end, and nothing is written until the shaper drags (FD-7).
 *
 * Under those, the live readouts: the board's own rocker (under Pin deck the tips include the lift)
 * and the foam off the BOTTOM at the board's five stations, nose to tail, re-read on every slider
 * move from the store's one side profile — one sample of one prepared blank, never a list verdict
 * and never a network request (R14). A value below zero (the board's bottom would drop below the
 * blank's there) reads in warning ink with its minus sign; one that prints as zero reads as zero.
 * The deck has no column here: the foam off the deck is the Deck Skin, printed just above, at every
 * station until a 12" fine-tune taken off the Deck changes it there (or, under Bottom, the tip
 * thinning adds to it toward the tips, and a negative tip setting can take it below — D-16). The
 * DATASHEET's FOAM OFF · Deck row carries the per-station numbers.
 *
 * Under the grid, the planer passes at the center (D-03): the center's foam off the bottom divided
 * by the shaper's Planer Max Depth, rounded up — counted from the printed numbers, so a shaper who
 * divides them by hand gets the same count — with a hint naming the setting that decides it.
 *
 * No blank (D-12): the slider is disabled at centre ("Placement — pick a blank first") and there is
 * no Deck Skin row, no readouts and no passes line — hidden, not disabled; the skin means nothing
 * without a foil cut from a blank. A blank with no room to slide (only possible with Extra Length
 * set under 1") has Placement disabled at centre with a note, and still shows everything below it.
 *
 * Every number goes through `lib/geometry/measure-display.ts` (CLAUDE.md Rule 2).
 */

import { useDesign } from "@/components/design/design-store";
import { SliderRow } from "@/components/design/slider-row";
import { useFitDefaults } from "@/components/fit-defaults-provider";
import { useUnits } from "@/components/units-provider";
import { FIT_DEFAULTS_RANGE_IN } from "@/lib/fit-defaults-preference";
import { placementRange } from "@/lib/geometry/blank-fit";
import { deckSkinHint, formatDeckSkin, formatPlacement, placementSlider } from "@/lib/geometry/blank-reasons";
import type { FoilStationKey } from "@/lib/geometry/foil";
import { formatMark, formatPasses, measureSlider, planerPasses, stationLabel } from "@/lib/geometry/measure-display";
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

/** The Deck Skin slider's range — the one constant the Fit & Tip Defaults dialog shares (D-01). */
const DECK_SKIN_RANGE_IN = FIT_DEFAULTS_RANGE_IN.deckSkin;

export function BoardOnBlankSection() {
  const { system } = useUnits();
  const { defaults } = useFitDefaults();
  const { blank, sideProfile, outline, setPlacement, setDeckSkin } = useDesign();
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
  const skinSlider = measureSlider(view.cut.deckSkin, DECK_SKIN_RANGE_IN, DECK_SKIN_RANGE_IN.step, 1, system);
  const passes = planerPasses(view.centerGap, defaults.planerMaxDepth, system);
  // A 12" fine-tune taken off the Deck changes the foam off the deck at that station, so the skin
  // is no longer the same everywhere (WR-02).
  const deckTweaked = view.cut.fineTuneSurface === "deck" && (blank.nose12Offset !== 0 || blank.tail12Offset !== 0);
  const skinHint = deckSkinHint(view.cut.deckSkin, view.cut.tipStyle, deckTweaked, system);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3.5">
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

        <SliderRow
          label={`Deck Skin — ${formatDeckSkin(view.cut.deckSkin, system)}`}
          value={skinSlider.value}
          min={skinSlider.min}
          max={skinSlider.max}
          step={skinSlider.step}
          leftHint={skinHint}
          onValueChange={(v) => setDeckSkin(skinSlider.toMm(v))}
        />
      </div>

      <div data-readouts className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1">
        <div className={HEADER_CLASS}>STATION</div>
        <div className={cn(HEADER_CLASS, "text-right")}>ROCKER</div>
        <div className={cn(HEADER_CLASS, "text-right")}>OFF BOTTOM</div>
        {STATIONS_NOSE_TO_TAIL.map((key) => {
          const rocker = markOrZero(sideProfile.stationRocker[key], system);
          const offBottom = markOrZero(view.foamOffBottom[key], system);
          return (
            <div key={key} data-readout-row={key} className="contents">
              <div className="text-xs text-surf-ink-muted">{stationName(key, system)}</div>
              <div className={cn(VALUE_CLASS, key === "center" ? "text-surf-ink-muted" : "text-surf-ink")}>
                {rocker.text}
              </div>
              <div className={cn(VALUE_CLASS, offBottom.negative ? "text-surf-warning-ink" : "text-surf-ink")}>
                {offBottom.text}
              </div>
            </div>
          );
        })}
      </div>

      <div
        data-bottom-passes
        className="mt-2 flex items-baseline justify-between gap-2 border-t border-surf-line-faint pt-2"
      >
        <span className="text-xs text-surf-ink-muted">Planer passes at the center</span>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            passes === 0 ? "text-surf-ink-muted" : "text-surf-ink",
          )}
        >
          {formatPasses(passes)}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-surf-ink-muted">
        {`At ${formatMark(defaults.planerMaxDepth, system)} a pass — your Planer Max Depth.`}
      </p>
    </div>
  );
}
