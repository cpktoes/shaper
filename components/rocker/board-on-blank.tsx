"use client";

/**
 * The lower half of the ROCKER sidebar's BLANK section: Placement, Deck Skin and the one full-passes line
 * (Phase 11, D-08, R3, R4; Phase 12, D-01, D-03, D-06, D-12; 12-UI-SPEC §1–§3, §11; moved under the blank
 * picker and stripped of its station readouts by quick 261019-gqo, 2026-10-19, D-02/D-03/D-10).
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
 * Under the Deck Skin row, one line of full planer passes at the center (quick 261019-gqo, D-03,
 * D-04): `Full passes at the center — Deck 1 · Bottom 1 + 1/16"` — the whole passes at the shaper's
 * Planer Max Depth plus what is left over for a last, lighter pass, for the deck (the Deck Skin) and
 * the bottom (the center's foam off the bottom). Counted from the printed numbers, so a shaper who
 * divides them by hand gets the same answer; a hint under it names the setting that decides it.
 * (The old line rounded the bottom's count up and left the deck out.)
 *
 * The station-by-station readouts that used to sit here (the board's rocker and the foam off the
 * bottom at the five stations) left the sidebar on purpose and are not lost: they are on the DATASHEET
 * (YOUR BOARD Rocker, FOAM OFF Deck and Bottom) for now, and come back, with the foam off the deck
 * added, as the PLANING tab in the next step of this task (plan 02).
 *
 * No blank (D-12): the slider is disabled at centre ("Placement — pick a blank first") and there is
 * no Deck Skin row, no full-passes line and no hint — hidden, not disabled; the skin means nothing
 * without a foil cut from a blank. A blank with no room to slide (only possible with Extra Length
 * set under 1") has Placement disabled at centre with a note, and still shows everything below it.
 *
 * Every number goes through `lib/geometry/measure-display.ts` (CLAUDE.md Rule 2).
 *
 * Quick 261006-v20 (2026-10-06): the sidebar follows the tab in view. The `live` prop says whether the
 * Placement slider (in each of its three states) and the Deck Skin slider are live on the tab on screen
 * — Placement on VIEWER and TOP VIEW, Deck Skin on VIEWER only (`rocker-live-controls.ts`). A slider that
 * is not live stays where it is, dimmed and inert, inside the one `Live` wrapper (`live.tsx`). The
 * full-passes line and the Planer Max Depth note are text, not controls, and stay undimmed on every tab
 * (D-02). Both default to live, so a caller that passes nothing gets the section exactly as before.
 */

import { useDesign } from "@/components/design/design-store";
import { SliderRow } from "@/components/design/slider-row";
import { useFitDefaults } from "@/components/fit-defaults-provider";
import { useUnits } from "@/components/units-provider";
import { FIT_DEFAULTS_RANGE_IN } from "@/lib/fit-defaults-preference";
import { placementRange } from "@/lib/geometry/blank-fit";
import { deckSkinHint, formatDeckSkin, formatPlacement, placementSlider } from "@/lib/geometry/blank-reasons";
import { formatMark, formatWholePasses, measureSlider, wholePasses } from "@/lib/geometry/measure-display";
import { Live } from "./live";

/** A disabled slider sits at centre over a token range; nothing can move it. */
const IDLE_RANGE = { value: 0, min: -1, max: 1, step: 1 };

/** The Deck Skin slider's range — the one constant the Fit & Tip Defaults dialog shares (D-01). */
const DECK_SKIN_RANGE_IN = FIT_DEFAULTS_RANGE_IN.deckSkin;

export function BoardOnBlankSection({
  live = { placement: true, deckSkin: true },
}: {
  /** Which of the two sliders the tab in view leaves live (quick 261006-v20). */
  live?: { placement: boolean; deckSkin: boolean };
}) {
  const { system } = useUnits();
  const { defaults } = useFitDefaults();
  const { blank, sideProfile, outline, setPlacement, setDeckSkin } = useDesign();
  const view = sideProfile.blank;

  if (!blank || !view) {
    return (
      <Live on={live.placement}>
        <SliderRow
          label="Placement — pick a blank first"
          {...IDLE_RANGE}
          disabled
          leftHint="Toward the nose"
          rightHint="Toward the tail"
          onValueChange={() => {}}
        />
      </Live>
    );
  }

  const range = placementRange(blank.copy.lengthMm, outline.length);
  const noRoom = range.max <= 0;
  const skinSlider = measureSlider(view.cut.deckSkin, DECK_SKIN_RANGE_IN, DECK_SKIN_RANGE_IN.step, 1, system);
  // The full passes at the center (quick 261019-gqo, D-03/D-04/P-05): the deck's foam is the board's Deck
  // Skin, the bottom's is the center's foam off the bottom — the same two numbers the Summary reads.
  const deckPasses = formatWholePasses(wholePasses(view.cut.deckSkin, defaults.planerMaxDepth, system), system);
  const bottomPasses = formatWholePasses(wholePasses(view.centerGap, defaults.planerMaxDepth, system), system);
  // A 12" fine-tune taken off the Deck changes the foam off the deck at that station, so the skin
  // is no longer the same everywhere (WR-02).
  const deckTweaked = view.cut.fineTuneSurface === "deck" && (blank.nose12Offset !== 0 || blank.tail12Offset !== 0);
  const skinHint = deckSkinHint(view.cut.deckSkin, view.cut.tipStyle, deckTweaked, system);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3.5">
        {noRoom ? (
          <Live on={live.placement}>
            <SliderRow
              label="Placement — centered"
              {...IDLE_RANGE}
              disabled
              leftHint="Toward the nose"
              rightHint="Toward the tail"
              note="This blank is too short to slide your board along it."
              onValueChange={() => {}}
            />
          </Live>
        ) : (
          (() => {
            // The clamped placement the side profile actually uses (stored as given, clamped on read).
            const slider = placementSlider(view.placement, range, system);
            return (
              <Live on={live.placement}>
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
              </Live>
            );
          })()
        )}

        <Live on={live.deckSkin}>
          <SliderRow
            label={`Deck Skin — ${formatDeckSkin(view.cut.deckSkin, system)}`}
            value={skinSlider.value}
            min={skinSlider.min}
            max={skinSlider.max}
            step={skinSlider.step}
            leftHint={skinHint}
            onValueChange={(v) => setDeckSkin(skinSlider.toMm(v))}
          />
        </Live>
      </div>

      <p data-full-passes className="mt-3 text-xs text-surf-ink-muted">
        {"Full passes at the center — Deck "}
        <span data-full-passes-deck className="font-semibold tabular-nums text-surf-ink">
          {deckPasses}
        </span>
        {" · Bottom "}
        <span data-full-passes-bottom className="font-semibold tabular-nums text-surf-ink">
          {bottomPasses}
        </span>
      </p>

      <p className="mt-0.5 text-xs text-surf-ink-muted">
        {`At ${formatMark(defaults.planerMaxDepth, system)} a pass — your Planer Max Depth.`}
      </p>
    </div>
  );
}
