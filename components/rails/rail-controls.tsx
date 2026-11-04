"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  DEFAULT_TIP_RAIL_SCALE,
  RAIL_NUDGE_LIMIT_IN,
  RAIL_NUDGE_NAMES,
  RAIL_NUDGE_STEP_IN,
  RAIL_RATIO_RANGE,
  RAIL_SCALE_RANGE,
  deckProfileSliderStep,
  railFamilyLabel,
  hardEdgeBlendsFrom,
  hardEdgeEndsAt,
  railNudgesOf,
  type RailBandSpec,
  type RailFamily,
  type RailNudgeKey,
  type RailSectionKey,
  type RailSectionOutput,
  type RailSectionSpec,
} from "@/lib/geometry/rail-bands";
import { formatMark, formatSignedMark, measureSlider, stationLabel } from "@/lib/geometry/measure-display";
import { formatHardEdgeEndsAt, hardEdgeEndsAtSlider } from "@/lib/geometry/blank-reasons";
import { railsImportedReadout } from "@/lib/geometry/imported-readout";
import { ImportedReadoutCard } from "@/components/design/imported-readout-card";
import { mmToInches, type Mm, type UnitsSystem } from "@/lib/geometry/units";
import { SliderRow, sliderValue } from "@/components/design/slider-row";
import { useUnits } from "@/components/units-provider";
import { cn } from "@/lib/utils";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { usePrintRailInstructions } from "@/components/print-instructions-provider";

interface RailControlsProps {
  /** The effective spec (D-09) — `boardThickness` on each section already reflects the foil's
   * value while `railsImportFoilThickness` is on, so the Inputs card and the bands it feeds always
   * agree with the same number. */
  spec: RailBandSpec;
  bands: Record<RailSectionKey, RailSectionOutput>;
  onChangeSection: (key: RailSectionKey, patch: Partial<RailSectionSpec>) => void;
  onToggleHardEdge: () => void;
  /** The tail's Hard Edge Ends At slider (Phase 16, D-20), in millimetres from the tail. */
  onChangeHardEdgeEndsAt: (value: Mm) => void;
  /** One mark's nudge off its formula (quick 261102-gec plan 02, PC19) — its own undo step per mark. */
  onChangeNudge: (key: RailSectionKey, nudgeKey: RailNudgeKey, value: Mm) => void;
  /** Reset Advanced Settings for one rail (PC20) — one undo step. */
  onResetAdvanced: (key: RailSectionKey) => void;
  /** Each rail's View box (quick 261017-vdh): the same open/closed state that used to be the
   * heading's ▾/▸ arrow. Unticked hides the rail's controls, its plot and its DATA table section. */
  sectionOpen: Record<RailSectionKey, boolean>;
  onToggleSectionOpen: (key: RailSectionKey) => void;
  advancedOpen: Record<RailSectionKey, boolean>;
  onToggleAdvancedOpen: (key: RailSectionKey) => void;
  /** Whether the three thickness values are imported from ROCKER's foil (D-09/D-10) — ticked by
   * default. While on, the thickness sliders are hidden and one line says what was imported. */
  railsImportFoilThickness: boolean;
  onToggleRailsImportFoilThickness: () => void;
  /** The rail the upright layout's NOSE/CENTER/TAIL switch is showing, passed only while VIEWER is
   * open (quick 261005-big, the founder's request 2026-10-05). When set, the other two rails' groups
   * are hidden below the shell breakpoint and untouched at or above it; left out (DATA,
   * INSTRUCTIONS), all three show. */
  phoneSection?: RailSectionKey;
  /** The board's length, which the tail's hard-edge settings run against (to its centre, D-30). */
  boardLength: Mm;
}

const NT_THICKNESS_BOUNDS = { min: 1, max: 2.5, step: 1 / 16 };
const CENTER_THICKNESS_BOUNDS = { min: 1.75, max: 3.5, step: 1 / 16 };

const SECTION_TITLE: Record<RailSectionKey, string> = { nose: "Nose Rail", center: "Center Rail", tail: "Tail Rail" };

/** The per-section thickness label's name (D-03): Imperial keeps today's literal station
 * suffix byte-identical (no space before the station mark); Metric composes the honest
 * station conversion through `stationLabel`, with its own leading space (reading `30.5 cm`)
 * rather than hand-typing a second station string. The centre entry's wording is untouched in
 * both systems. */
function sectionThicknessLabel(system: UnitsSystem): Record<RailSectionKey, string> {
  // No space before the station mark in Imperial (byte-identical to today), one space before
  // it in Metric (matching the UI-SPEC's fixed string) — composed rather than hand-typed so
  // the literal never appears twice in source.
  const nt = `Thickness @${system === "imperial" ? "" : " "}${stationLabel(system)}`;
  return { nose: nt, center: "Board Thickness", tail: nt };
}

function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** RAILS' ruled heading look (the founder's canvas, quick 261017-vdh): the INPUTS heading and each
 * rail's heading share it. A plain `div` — a rail's open/closed arrow became a View tick box. */
const RULED_HEADING =
  "mt-1.5 flex w-full items-center justify-between border-b border-surf-line-faint pb-2 text-xs font-display text-surf-ink uppercase tracking-architectural font-extrabold";

/** A rail's ADVANCED fold: the one heading on this screen that keeps its ▾/▸ arrow. */
function AdvancedHeading({
  children,
  onToggle,
  open,
}: {
  children: React.ReactNode;
  onToggle: () => void;
  open: boolean;
}) {
  return (
    <button
      type="button"
      data-lock-exempt
      onClick={onToggle}
      className="focus-ring-accent flex w-full items-center justify-between border-b border-surf-line-faint pb-2 pl-3 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold"
    >
      <span>{children}</span>
      <span>{open ? "▾" : "▸"}</span>
    </button>
  );
}

/** The Ratio slider's marks under its track on the 20-80 range (quick 261102-gec plan 02, R8, PC14,
 * 2026-11-02): 20/80 at the left end, 50/50 in the middle and 80/20 at the right end. The old 60/40 mark is
 * gone: on a 20-80 track it sits two-thirds along, and it runs into 50/50 whenever the column is under 154
 * dots — every computer column and a 360-dot phone (measured in the app's Inter, the plan's M9). A right-end
 * 80/20 clears 50/50 by 23 dots even in the narrowest column (the 820-dot window), so it reads cleanly where
 * the old 70/30 did not (fast 184, the founder 2026-10-19: "drop the 70/30 marks"). */
function RatioTickCaptions() {
  return (
    <div className="relative mt-0.5 h-3">
      <span data-ratio-mark className="absolute left-0 text-[9px] text-surf-ink-muted font-normal">20/80</span>
      <span data-ratio-mark className="absolute left-1/2 -translate-x-1/2 text-[9px] text-surf-ink-muted font-normal">50/50</span>
      <span data-ratio-mark className="absolute right-0 text-[9px] text-surf-ink-muted font-normal">80/20</span>
    </div>
  );
}

interface RailSectionControlsProps {
  sectionKey: RailSectionKey;
  spec: RailSectionSpec;
  output: RailSectionOutput;
  onChange: (patch: Partial<RailSectionSpec>) => void;
  onChangeNudge: (nudgeKey: RailNudgeKey, value: Mm) => void;
  onResetAdvanced: () => void;
  open: boolean;
  onToggleOpen: () => void;
  advancedOpen: boolean;
  onToggleAdvancedOpen: () => void;
  tailHardEdge?: boolean;
  onToggleHardEdge?: () => void;
  /** The tail's stored Hard Edge Blends From and Ends At (Phase 16, D-20/D-30); absent reads 18" and 30"
   * through `hardEdgeBlendsFrom` / `hardEdgeEndsAt`. */
  tailHardEdgeBlendsFrom?: Mm;
  tailHardEdgeEndsAt?: Mm;
  /** The board's length: the two hard-edge settings' windows run to its centre (D-30). */
  boardLength: Mm;
  onChangeHardEdgeEndsAt?: (value: Mm) => void;
  /** While imported (D-09/D-10), the thickness slider is HIDDEN, not greyed (quick 261017-vdh): the
   * foil-derived value already sitting in `spec.boardThickness` is named in RAILS' Inputs card
   * instead. Every other control on the section is untouched. */
  thicknessImported: boolean;
  system: UnitsSystem;
  /** True for the two rails the upright layout's NOSE/CENTER/TAIL switch is not showing: the whole
   * group is display:none below the shell breakpoint (same width rule that draws the switch). */
  hiddenOnPhone?: boolean;
  /** True for the one rail the upright layout's switch IS showing (only while VIEWER is open). */
  phonePicked?: boolean;
}

function RailSectionControls({
  sectionKey,
  spec,
  output,
  onChange,
  onChangeNudge,
  onResetAdvanced,
  open,
  onToggleOpen,
  advancedOpen,
  onToggleAdvancedOpen,
  tailHardEdge,
  onToggleHardEdge,
  tailHardEdgeBlendsFrom,
  tailHardEdgeEndsAt,
  boardLength,
  onChangeHardEdgeEndsAt,
  thicknessImported,
  system,
  hiddenOnPhone,
  phonePicked,
}: RailSectionControlsProps) {
  const locked = useControlsLocked();
  const isTail = sectionKey === "tail";
  const thicknessBounds = sectionKey === "center" ? CENTER_THICKNESS_BOUNDS : NT_THICKNESS_BOUNDS;
  // Inches-domain thickness stays around for the Deck Profile step — the step formula is a model-side
  // snap (`deckProfileSliderStep`, tested in rail-bands.test.ts) and never becomes system-aware.
  const boardThicknessIn = mmToInches(spec.boardThickness);
  // Deck Profile stops at 75% (quick 261102-gec plan 02, R7, PC23): the slider still runs Flat on the
  // left to Heavily Domed on the right, so it holds 175 - deckPercent over 75-100. A board saved below 75%
  // shows its thumb at the right end and draws at 75% (the rules hold it there), and its saved number is
  // only rewritten if the shaper moves this slider.
  const deckSliderStep = deckProfileSliderStep(boardThicknessIn);
  const deckProfileSliderValue = clampFinite(175 - spec.deckPercent, 75, 100);
  const thicknessSlider = measureSlider(spec.boardThickness, thicknessBounds, thicknessBounds.step, 1, system);
  const hardEdgeOn = isTail ? !!tailHardEdge : false;
  const thicknessLabel = sectionThicknessLabel(system)[sectionKey];
  // Exactly the six nudges, a missing one as 0 (plan 04, PC29), so a label never reads a nudge that is not
  // a number — a board in memory from before the Domed Deck Band nudge has no dome key.
  const nudges = railNudgesOf(spec.nudges);
  const scaleFromCenter = spec.scaleFromCenter ?? DEFAULT_TIP_RAIL_SCALE;

  /** One nudge slider (quick 261102-gec plan 02, R15, PC18, PC24): the track holds the nudge — ±2" for
   * the Domed Deck Band (plan 04, R18, PC34), ±3/4" for Bottom Tuck 3 (R19, fast task 188), ±1/2" for the
   * deck marks, ±1/4" for Apex Thickness and Bottom Tuck 1, every window read from `RAIL_NUDGE_LIMIT_IN`, in
   * 1/16" steps (whole millimetres in Metric, -50 to +50 mm on the dome) — while the label reads the mark it
   * lands on and the nudge itself, e.g. "Deck Mark 1 — 2 5/8" (+1/8")", the FINS Off-Rail tuners' pattern.
   * Apex Thickness adds ", trimmed to fit" while the apex had to shrink to fit on the rail (R4); that is
   * information, so it never takes the warning colour. The dome carries no such note when the rules hold
   * it 1/16" past Deck Mark 3 (PC33): its label already reads the mark where it stops, as every floor's
   * does. */
  const nudgeRow = (key: RailNudgeKey) => {
    const limit = RAIL_NUDGE_LIMIT_IN[key];
    const slider = measureSlider(nudges[key], { min: -limit, max: limit }, RAIL_NUDGE_STEP_IN, 1, system);
    const mark = key === "apexThickness" ? output.result.apexLenRange : output.result[key];
    const markText = formatMark(mark, system);
    const trimmed = key === "apexThickness" && output.result.apexTrimmed ? ", trimmed to fit" : "";
    return (
      <SliderRow
        key={key}
        label={`${RAIL_NUDGE_NAMES[key]} — ${markText} (${formatSignedMark(nudges[key], system)})${trimmed}`}
        value={slider.value}
        min={slider.min}
        max={slider.max}
        step={slider.step}
        onValueChange={(v) => onChangeNudge(key, slider.toMm(v))}
        sliderLabel={`${SECTION_TITLE[sectionKey]} ${RAIL_NUDGE_NAMES[key]} nudge`}
        sliderValueText={markText}
      />
    );
  };
  // The tuck sliders follow Single Tuck and Hard Edge exactly as the rules do (R14). Bottom Tuck 2 has no
  // slider (plan 04, R17: always halfway), so Single Tuck hides only Bottom Tuck 1's; a Hard Edge tail has
  // no tucks at all, so Use Single Tuck and both tuck sliders hide.
  const showTucks = !isTail || !hardEdgeOn;
  const showBottomTuck1 = showTucks && !spec.singleTuck;

  /** Hard Edge Ends At (Phase 16, D-20, the founder 2026-11-03; UI-SPEC §17): how far from the tail the hard
   * edge has faded into the tucked rail, 14" to 24" in 1/2" steps (whole centimetres in Metric, stored as whole
   * millimetres). Only on the tail and only while Hard Edge is on — the exact complement of the tuck rows, so it
   * takes their place at the bottom of the menu. The distance is a dim, read through the one named formatter.
   * No hint and no note: nothing on screen says the litres moved (D-18). */
  const hardEdgeEndsAtRow = () => {
    const length = boardLength;
    const settings = { tailHardEdgeBlendsFrom, tailHardEdgeEndsAt };
    const value = hardEdgeEndsAt(settings, length);
    const slider = hardEdgeEndsAtSlider(value, hardEdgeBlendsFrom(settings, length), length, system);
    const text = formatHardEdgeEndsAt(value, system);
    return (
      <SliderRow
        label={`Hard Edge Ends At — ${text}`}
        value={slider.value}
        min={slider.min}
        max={slider.max}
        step={slider.step}
        onValueChange={(v) => onChangeHardEdgeEndsAt?.(slider.toMm(v))}
        sliderLabel="Tail Rail hard edge ends at"
        sliderValueText={`${text} from the tail`}
      />
    );
  };

  // The group's controls, built once so the two places that may draw them (below) never drift.
  const controls = (
    <>
      {!thicknessImported && (
        <SliderRow
          label={`${thicknessLabel} — ${formatMark(spec.boardThickness, system)}`}
          value={thicknessSlider.value}
          min={thicknessSlider.min}
          max={thicknessSlider.max}
          step={thicknessSlider.step}
          onValueChange={(v) => onChange({ boardThickness: thicknessSlider.toMm(v) })}
        />
      )}

      <SliderRow
        label={`Deck Profile — ${formatMark(output.railThicknessClamped, system)} (Tapered Thickness)`}
        value={deckProfileSliderValue}
        min={75}
        max={100}
        step={deckSliderStep}
        onValueChange={(v) => onChange({ deckPercent: clampFinite(175 - v, 75, 100) })}
        leftHint="Flat"
        rightHint="Heavily Domed"
      />

      {/* Family and Ratio (below) both keep their own hand-rolled markup. Family's hint row
          carries three captions (Boxy/Medium/Knifey) where SliderRow's fixed hint slot only
          has room for two; Ratio's own hint row is RatioTickCaptions' three marks (20/80, 50/50,
          80/20), placed where they fall on the track, which SliderRow's two-ended hint line
          can't hold. Both are named in slider-row.test.ts's allowlist. */}
      <div className="flex gap-3.5">
        <div className={cn("min-w-0 flex-1", locked && "opacity-40")}>
          <div className="mb-2 min-h-5 leading-5 text-sm text-surf-ink-muted font-normal">
            Family — {railFamilyLabel(spec.family)}
          </div>
          <Slider
            value={spec.family}
            min={1}
            max={5}
            step={1}
            disabled={locked}
            onValueChange={(v) => onChange({ family: clampFinite(sliderValue(v), 1, 5) as RailFamily })}
            className="slider-accent"
          />
          <div className="mt-0.5 flex justify-between text-xs text-surf-ink-muted font-normal">
            <span>Boxy</span>
            <span>Medium</span>
            <span>Knifey</span>
          </div>
        </div>

        <div className={cn("min-w-0 flex-1", locked && "opacity-40")}>
          {/* The same 20-dot heading line as Family's beside it (`min-h-5 leading-5`), so the two tracks sit
              on one line whatever the Sym box measures (the founder, 2026-10-19: "the sliders themselves
              should be on one plane") — it was 16 dots, which lifted Ratio's track 4 dots above Family's. */}
          {/* The heading line holds only the readout now (quick 261102-gec plan 02, PC15): "Ratio —
              40.5/59.5" is 118.5 dots in Inter, and Sym beside it would need 51 more — 170 dots in a
              half column that is 122.5 dots at an 820-dot window (the plan's M9). The readout alone
              fits every column. */}
          <div className="mb-2 flex h-5 items-center leading-5">
            <div data-ratio-readout className="text-sm text-surf-ink-muted font-normal">
              Ratio — {spec.ratioTopPercent}/{100 - spec.ratioTopPercent}
            </div>
          </div>
          {/* 20/80 to 80/20 in halves (R8), so 62.5/37.5 is reachable; snapped to the half so a
              drag can never store a hair off it. */}
          <Slider
            value={spec.ratioTopPercent}
            min={RAIL_RATIO_RANGE.min}
            max={RAIL_RATIO_RANGE.max}
            step={RAIL_RATIO_RANGE.step}
            disabled={locked}
            onValueChange={(v) =>
              onChange({
                ratioTopPercent:
                  Math.round(clampFinite(sliderValue(v), RAIL_RATIO_RANGE.min, RAIL_RATIO_RANGE.max) / RAIL_RATIO_RANGE.step) *
                  RAIL_RATIO_RANGE.step,
              })
            }
            className="slider-accent"
          />
          <RatioTickCaptions />
          {/* Symmetrical on a line of its own under the marks (PC15, the founder's answer 2026-11-02),
              the same checkbox it always was, reading its full word since fast task 190 (R21, the
              founder: "Change sym to Symmetrical"). On the tail it and Hard Edge can never both be on —
              a hard edge has no tucks to mirror — so ticking either clears the other, in the store, where
              every path through (the Reset too) keeps the rule. 09-REVIEW.md IN-01: only the shared
              Button/Input/Slider primitives get their coarse: touch sizing for free, so this hand-rolled
              label row carries its own explicit coarse:min-h-11 -- see WR-02 for what happens to a
              hand-rolled control that skips this. */}
          <label className="mt-2 flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
            <Checkbox
              disabled={locked}
              checked={spec.symmetrical}
              onCheckedChange={() => onChange({ symmetrical: !spec.symmetrical })}
            />
            Symmetrical
          </label>
          {isTail && (
            <label className="mt-2 flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
              <Checkbox disabled={locked} checked={hardEdgeOn} onCheckedChange={() => onToggleHardEdge?.()} />
              Hard Edge
            </label>
          )}
        </div>
      </div>

      <div>
        <AdvancedHeading open={advancedOpen} onToggle={onToggleAdvancedOpen}>
          Advanced
        </AdvancedHeading>
        {advancedOpen && (
          <div className="flex flex-col gap-3 pl-3 pt-3">
            {/* The fuller Advanced menu (quick 261102-gec plan 02, the founder's brief 2026-11-02), in
                the order PC32 (plan 04) set and PC40 (plan 05) extends: the scale on the nose and tail; Apex
                Thickness, Deck Mark 1, Deck Mark 3 and the Domed Deck Band right under it (R18, the founder:
                "I would like to add an advanced slider for the domed deck mark though."); Use Single Tuck
                just above the slider it hides; Bottom Tuck 1 and 3; Sharp Bottom Tuck (R22); on a hard-edged tail, in
                the tuck rows' place, Hard Edge Ends At (Phase 16, D-20) last before Reset; Reset. Deck Mark 2 and Bottom Tuck 2 have no slider (R17:
                "Always in the middle is great") — each is always halfway to its parent mark. */}
            {sectionKey !== "center" && (
              // "Scaled from center by" (R10): nose and tail only — the centre is always 1. A plain
              // number, not a measurement, so it reads two decimals and never goes through units.ts.
              <SliderRow
                label={`Scaled from center by — ${scaleFromCenter.toFixed(2)}`}
                value={scaleFromCenter}
                min={RAIL_SCALE_RANGE.min}
                max={RAIL_SCALE_RANGE.max}
                step={RAIL_SCALE_RANGE.step}
                onValueChange={(v) =>
                  onChange({
                    scaleFromCenter: clampFinite(
                      Math.round(v / RAIL_SCALE_RANGE.step) / Math.round(1 / RAIL_SCALE_RANGE.step),
                      RAIL_SCALE_RANGE.min,
                      RAIL_SCALE_RANGE.max,
                    ),
                  })
                }
                sliderLabel={`${SECTION_TITLE[sectionKey]} scaled from center by`}
                sliderValueText={scaleFromCenter.toFixed(2)}
              />
            )}
            {nudgeRow("apexThickness")}
            {nudgeRow("deckMark1")}
            {nudgeRow("deckMark3")}
            {nudgeRow("domedDeckBand")}

            {/* Use Single Tuck on a line of its own (quick 261102-gec, PC12). Hidden on the tail while
                Hard Edge is on, as it always was. */}
            {showTucks && (
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal",
                  locked && "opacity-40",
                )}
              >
                <Checkbox
                  disabled={locked}
                  checked={spec.singleTuck}
                  onCheckedChange={() => onChange({ singleTuck: !spec.singleTuck })}
                />
                Use Single Tuck
              </label>
            )}
            {showBottomTuck1 && nudgeRow("bottomTuck1")}
            {showTucks && nudgeRow("bottomTuck3")}

            {/* Sharp Bottom Tuck (quick 261102-gec plan 05, R22, PC40 — the founder, 2026-11-02: "an
                advanced checkbox for leaving the bottom edge fairly sharp (follow the angle at bottom
                tuck 3)"). Ticked, the finished rail keeps the corner at Bottom Tuck 3 as the cut leaves
                it, so the box sits right after Bottom Tuck 3's slider. It hides with the tuck controls
                on the tail while Hard Edge is on: a hard edge is already sharp at the bottom. */}
            {showTucks && (
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal",
                  locked && "opacity-40",
                )}
              >
                <Checkbox
                  disabled={locked}
                  checked={spec.sharpBottomTuck}
                  onCheckedChange={() => onChange({ sharpBottomTuck: !spec.sharpBottomTuck })}
                />
                Sharp Bottom Tuck
              </label>
            )}

            {/* Hard Edge Ends At (Phase 16, D-20): the tail's last slider while Hard Edge is on, directly above
                Reset, in the place the tuck rows hold on a tucked tail (UI-SPEC §17). */}
            {isTail && hardEdgeOn && hardEdgeEndsAtRow()}

            {/* Reset Advanced Settings (PC20): every nudge to 0, the scale to its default (1.00 since fast task 189), Single Tuck and
                Sharp Bottom Tuck off (plan 05) and, on the tail, Hard Edge back on and Hard Edge Ends At back to 18" (Phase 16) — one
                store action, so one undo step. */}
            <button
              type="button"
              disabled={locked}
              onClick={() => onResetAdvanced()}
              className="focus-ring-accent cursor-pointer text-left text-[11px] font-bold text-surf-accent-ink disabled:cursor-default disabled:opacity-40"
            >
              ↺ Reset Advanced Settings
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div
      data-rail-group={sectionKey}
      className={hiddenOnPhone ? "flex flex-col gap-3.5 max-shell:hidden" : "flex flex-col gap-3.5"}
    >
      {/* The heading row — the rail's name and its View box — is view-only as a whole, so it is
          marked `data-lock-exempt` too (quick 261102-gec): with the Corner Cut row gone, a tail with
          Hard Edge on has nothing in Advanced but Reset, and the board lock's greyed-look sweep would
          otherwise read this live heading as part of Reset's row. No pixel changes. */}
      <div className={RULED_HEADING} data-lock-exempt>
        <span>{SECTION_TITLE[sectionKey]}</span>
        {/* The View box (quick 261017-vdh, the founder's canvas): the old ▾/▸ open/closed state,
            drawn as a tick box at the heading's right end. View-only, so a locked board keeps it
            live (`data-lock-exempt`). On the upright layout's VIEWER tab the picked rail draws none
            (see the rule below), hence `max-shell:hidden` — the phone's one plot follows the
            NOSE/CENTER/TAIL switch, never this box, and a box that does not do what it says would
            be worse than none. */}
        <label
          className={cn(
            "flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-xs font-normal normal-case tracking-normal text-surf-ink-muted",
            phonePicked && "max-shell:hidden",
          )}
        >
          <Checkbox
            data-lock-exempt
            checked={open}
            onCheckedChange={() => onToggleOpen()}
            aria-label={`View ${SECTION_TITLE[sectionKey]}`}
          />
          View
        </label>
      </div>
      {open && controls}
      {/* The upright-phone rule (quick 261017-vdh, the planner's call on BRIEF 2c): below 820 dots
          the NOSE/CENTER/TAIL switch picks the rail in view, so the picked rail's controls always
          show there even when its View box is unticked on a computer or on DATA — drawn only in
          this wrapper, which is `display: contents` below the shell width and `display: none` at or
          above it (where the View box rules). The other two rails stay hidden by `hiddenOnPhone`. */}
      {!open && phonePicked && <div className="contents shell:hidden">{controls}</div>}
    </div>
  );
}

export function RailControls({
  spec,
  bands,
  onChangeSection,
  onToggleHardEdge,
  onChangeHardEdgeEndsAt,
  onChangeNudge,
  onResetAdvanced,
  sectionOpen,
  onToggleSectionOpen,
  advancedOpen,
  onToggleAdvancedOpen,
  railsImportFoilThickness,
  onToggleRailsImportFoilThickness,
  phoneSection,
  boardLength,
}: RailControlsProps) {
  const { system } = useUnits();
  const locked = useControlsLocked();
  const { included: printRailInstructions, setIncluded: setPrintRailInstructions } = usePrintRailInstructions();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold">Rail Band Calculator</div>
        <div className="mt-0.5 text-sm text-surf-ink-muted font-normal">
          Design and shape consistent rails
        </div>
      </div>

      {/* INPUTS (quick 261017-vdh, the founder's canvas): one tick box imports the three thicknesses
          from ROCKER's foil. Ticked, a readout card names what came in (quick 261018-fg1, sketch 017 C:
          nose, centre and tail thickness in large figures) and the thickness sliders are gone (hidden,
          not greyed); unticked, no card and each rail's own slider is back. The card sits just outside
          the tick box's greyed wrapper, so a locked board never greys it: it is information, not a
          control. */}
      <div>
        <div className={RULED_HEADING}>Inputs</div>
        <div className={cn("pt-2", locked && "opacity-40")}>
          <label className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
            <Checkbox
              disabled={locked}
              checked={railsImportFoilThickness}
              onCheckedChange={() => onToggleRailsImportFoilThickness()}
            />
            Import Rocker &amp; Foil Values
          </label>
        </div>
        {railsImportFoilThickness && (
          <ImportedReadoutCard
            className="mt-2"
            readout={railsImportedReadout(
              spec.nose.boardThickness,
              spec.center.boardThickness,
              spec.tail.boardThickness,
              system,
            )}
          />
        )}
      </div>

      <RailSectionControls
        sectionKey="nose"
        spec={spec.nose}
        output={bands.nose}
        onChange={(patch) => onChangeSection("nose", patch)}
        onChangeNudge={(nudgeKey, value) => onChangeNudge("nose", nudgeKey, value)}
        onResetAdvanced={() => onResetAdvanced("nose")}
        open={sectionOpen.nose}
        onToggleOpen={() => onToggleSectionOpen("nose")}
        advancedOpen={advancedOpen.nose}
        onToggleAdvancedOpen={() => onToggleAdvancedOpen("nose")}
        thicknessImported={railsImportFoilThickness}
        system={system}
        boardLength={boardLength}
        hiddenOnPhone={phoneSection !== undefined && phoneSection !== "nose"}
        phonePicked={phoneSection === "nose"}
      />

      <RailSectionControls
        sectionKey="center"
        spec={spec.center}
        output={bands.center}
        onChange={(patch) => onChangeSection("center", patch)}
        onChangeNudge={(nudgeKey, value) => onChangeNudge("center", nudgeKey, value)}
        onResetAdvanced={() => onResetAdvanced("center")}
        open={sectionOpen.center}
        onToggleOpen={() => onToggleSectionOpen("center")}
        advancedOpen={advancedOpen.center}
        onToggleAdvancedOpen={() => onToggleAdvancedOpen("center")}
        thicknessImported={railsImportFoilThickness}
        system={system}
        boardLength={boardLength}
        hiddenOnPhone={phoneSection !== undefined && phoneSection !== "center"}
        phonePicked={phoneSection === "center"}
      />

      <RailSectionControls
        sectionKey="tail"
        spec={spec.tail}
        output={bands.tail}
        onChange={(patch) => onChangeSection("tail", patch)}
        onChangeNudge={(nudgeKey, value) => onChangeNudge("tail", nudgeKey, value)}
        onResetAdvanced={() => onResetAdvanced("tail")}
        open={sectionOpen.tail}
        onToggleOpen={() => onToggleSectionOpen("tail")}
        advancedOpen={advancedOpen.tail}
        onToggleAdvancedOpen={() => onToggleAdvancedOpen("tail")}
        tailHardEdge={spec.tailHardEdge}
        onToggleHardEdge={onToggleHardEdge}
        tailHardEdgeBlendsFrom={spec.tailHardEdgeBlendsFrom}
        tailHardEdgeEndsAt={spec.tailHardEdgeEndsAt}
        onChangeHardEdgeEndsAt={onChangeHardEdgeEndsAt}
        thicknessImported={railsImportFoilThickness}
        system={system}
        boardLength={boardLength}
        hiddenOnPhone={phoneSection !== undefined && phoneSection !== "tail"}
        phonePicked={phoneSection === "tail"}
      />

      <div>
        <label className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
          <Checkbox
            data-lock-exempt
            checked={printRailInstructions}
            onCheckedChange={() => setPrintRailInstructions(!printRailInstructions)}
          />
          Include Rail Band Instructions in Print
        </label>
        <div className="mt-1 text-xs text-surf-ink-muted font-normal">
          Adds a third reference page to the printed order form, explaining what each rail band
          mark means.
        </div>
      </div>
    </div>
  );
}

export type { RailControlsProps };
