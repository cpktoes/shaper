"use client";

/**
 * The ROCKER sidebar, top to bottom (Phase 11, 11-UI-SPEC "The sidebar, top to bottom", reordered by
 * the founder's canvas, quick 261017-vdh, 2026-10-17): INPUTS → BLANK → BOARD ON BLANK → Rocker & Foil
 * (only with no blank) or Foil (with one). BLANK, BOARD ON BLANK and the last section are the same
 * collapsible `SectionHeading` `rail-controls.tsx` uses, all open on arrival; the open/closed map is
 * view state owned by `rocker-editor.tsx`, never saved.
 *
 * INPUTS is not collapsible and has no tick box: ROCKER always uses the template, so it just says
 * which (the `TEMPLATE details are imported: …` line, `boardLine()`, moved here from under the
 * subtitle) and holds Center Thickness (R1, D-12), the board's ONE centre thickness, the same stored
 * `foil.center` RAILS and VOLUME read — one `SliderRow` with its value in its label (`Center Thickness —
 * 2 1/2"`), no typed box (quick 261018-ejc, the founder 2026-10-18: "doesn't need a type in box, just the
 * slider"). An exact centre is typed in the DATASHEET table's Center cell, so ROCKER needs no entry in
 * `slider-row.test.ts`'s allowlist. Changing it re-judges the blank list and re-checks the picked blank;
 * it never clears the pick. The heading and the line are text and never dim; only the Center Thickness
 * row is `Live`.
 *
 * BLANK (`blank-picker.tsx`) and BOARD ON BLANK (`board-on-blank.tsx`) read the store themselves.
 *
 * Rocker & Foil (D-14), with no blank, is the hand-set fallback a board carries until a blank is
 * picked: ONE section holding a small table — a ROCKER column and a THICKNESS column, a NOSE group
 * (Tip, then @ 12") and a TAIL group (@ 12", then Tip), nose to tail along the board — each cell a value
 * box over its own `SliderRow`. The rocker cells run over `ROCKER_LIFT_RANGE_IN`; the centre is always
 * 0 (the flat the rocker is measured up from) and is not a control. The founder chose four typed
 * stations knowing a hand-typed 12" value can put a kink back into the curve there (D-14); do not bring
 * the Angle/Smoothness/Flatness shape controls back without asking. With a blank picked the rocker
 * comes off the blank, so the grid is not shown at all.
 *
 * Foil (the old THICKNESS section, renamed when a blank is picked), nose to tail. The two tips are
 * absolute in both states and stored on the board (D-10).
 * With no blank the two 12" stations are absolute too. With a blank picked they are the blank's own
 * thickness there less the deck skin and the centre gap (Phase 12, 12-UI-SPEC §5) plus the shaper's
 * signed fine-tune (D-11): the label shows the
 * FINAL thickness, the slider moves only the tweak (±1/4" / ±6 mm around 0), and the two-ended hint
 * reads "From blank …" and "Tweak …" (or "No tweak"). "↺ Reset Fine-Tune" clears both tweaks; with
 * both at zero it stays in place, dimmed and inert, so nothing above it shifts.
 *
 * Phase 12 (D-04, 12-UI-SPEC §4): with a blank picked, THICKNESS ends with the board's own Tip Style
 * — a quiet `Pin deck` / `Bottom` pair, read from the side profile's resolved cut (`view.cut`), with
 * the selected option's hint under it. A tap re-derives each tip from its tip to its Thinning Starts
 * point (Phase 14, D-07); nothing inside that point moves. With no blank it is not on the page at all
 * (D-12).
 * Directly under the Tail @ 12" row — with the two 12" fine-tunes it governs — sits `Fine-tune off:
 * Deck / Bottom` (D-13, 12-UI-SPEC §5a), the same anatomy: which surface a tweak moves. The slider's
 * reach stays ±1/4" (D-20), and a carried-over tweak beyond it still reads its true stored value.
 * With a blank, the intro says how the foil now comes off: deck and bottom follow the blank's, and each
 * tip is thinned from its Thinning Starts point (D-07). When a tip's start is further in than the 12"
 * station, that 12" row's left hint reads "From the tip taper …" rather than "From blank …", because the
 * thickness there then belongs to the taper.
 *
 * Phase 14 (D-09 to D-11, D-10's order): with a blank picked, THICKNESS closes with Nose Thinning Starts
 * and Tail Thinning Starts, after Tip Style — each a `SliderRow` from 6" (left, the tip) to the board's
 * centre (right), the distance in force in its label, the state on the hint line's left and an
 * Automatic button on its right; under it, only for a start set by hand that is too close to its tip,
 * one sentence in warning ink (D-05). With no blank neither row is on the page (hidden, not disabled).
 *
 * Every slider commits its own number through `measureSlider`'s conversion at its call site, and
 * every number reads through `lib/geometry/measure-display.ts` (CLAUDE.md Rule 2). Every control is
 * on screen from the moment the page opens, on a phone the same as on a desktop.
 *
 * Quick 261006-v20 (2026-10-06): the sidebar follows the tab in view (D-01). On VIEWER every control
 * is live, as before; on DATASHEET only Center Thickness and the two tip thicknesses (the grid's two Tip
 * thickness cells with no blank, Foil's Nose Tip and Tail Tip with one); on TOP VIEW (small screens
 * only) only the BLANK section and BOARD ON BLANK's Placement. Every other group stays exactly where it
 * is, dimmed and inert, never hidden (D-02), through the one `Live` wrapper (`live.tsx`). Which group is
 * live on which tab is the pure table in `rocker-live-controls.ts`, read once per render as `live`. A
 * section that is wholly not live has its heading wrapped too; where only part of a section is (Rocker &
 * Foil and Foil on DATASHEET, BOARD ON BLANK on either tab) the heading stays live and each row or cell
 * gets its own wrapper, so the column's `gap-3.5` stays exactly where it is (D-11). The Rocker & Foil
 * heading is live while `live.rocker || live.thicknessHeading` — worked out at the call site, so the
 * pure table and its test keep their ten keys.
 */

import { type ReactNode } from "react";
import { SliderRow } from "@/components/design/slider-row";
import { useUnits } from "@/components/units-provider";
import type { BlankCatalogResult } from "@/lib/db/blanks";
import type { SavedBlanksAccount } from "@/lib/saved-blanks-preference";
import type { BoardBlank, FineTuneSurface, TipStyle } from "@/lib/geometry/blank";
import type { BoardSideProfile } from "@/lib/geometry/board-profile";
import { FOIL_THICKNESS_RANGE_IN, type FoilSpec } from "@/lib/geometry/foil";
import {
  formatMark,
  formatSignedMark,
  measureSlider,
  stationLabel,
} from "@/lib/geometry/measure-display";
import { ROCKER_LIFT_RANGE_IN, type FiveStationRocker } from "@/lib/geometry/rocker";
import {
  automaticButtonLabel,
  fineTuneSourceHint,
  formatThinningStart,
  thicknessIntroWithBlank,
  thinningStartHint,
  thinningStartLine,
  thinningStartRowLabel,
  thinningStartSlider,
  thinningStartSliderLabel,
} from "@/lib/geometry/blank-reasons";
import type { TipEnd, TipView } from "@/lib/geometry/tip-taper";
import { mm, type Mm, type UnitsSystem } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";
import { TwoOptionToggle } from "@/components/viewer/two-option-toggle";
import { BlankPicker } from "./blank-picker";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { BoardOnBlankSection } from "./board-on-blank";
import { Live } from "./live";
import { liveControls, type RockerTab } from "./rocker-live-controls";
import { keepFiguresTogether } from "@/lib/geometry/keep-figures-together";

export type RockerControlsSectionKey = "blank" | "boardOnBlank" | "rockerAndFoil" | "foil";

/** The 12" fine-tune's reach either way from the blank-derived thickness, in inches (±6 mm metric,
 * rounded inward by `measureSlider`) — `(researcher's choice — founder may overrule)` (UI-SPEC §5). */
const FINE_TUNE_RANGE_IN = { min: -0.25, max: 0.25 } as const;
const FINE_TUNE_STEP_IN = 0.0625;

/** The Tip Style hints (12-UI-SPEC copy table, D-16: under Pin deck a tip that needs more foam than
 * the cut leaves makes the tip rocker fall rather than grow). */
const TIP_STYLE_HINT: Record<TipStyle, string> = {
  pinDeck:
    "The deck stays put and the extra comes off the bottom, so the tip rocker grows — or falls, if the tip needs more foam than the cut leaves.",
  bottom: "The bottom stays put and the extra comes off the deck, so the rocker stays the blank's own.",
};

/** The Fine-tune off hints (12-UI-SPEC copy table, D-13). */
const FINE_TUNE_SURFACE_HINT: Record<FineTuneSurface, string> = {
  deck: "Tweaks add or take foam on the deck; the rocker stays the blank's.",
  bottom: "Tweaks move the bottom, so the rocker re-levels and its numbers can shift.",
};

interface RockerControlsProps {
  /** The tab in view — the editor's derived `activeTab`, never the requested one (quick 261006-v20). */
  tab: RockerTab;
  /** The INPUTS section's line, `TEMPLATE details are imported: 6'0" × 19"` — `boardLine()`, moved here
   * from under the subtitle. Text only: no tick box on ROCKER, the page always uses the template. */
  templateLine: string;
  /** The pickable catalogue, streamed from the page and never awaited there (Pattern 8). */
  blanks: Promise<BlankCatalogResult>;
  /** The shaper's own saved blanks (quick 261016-mkb, D-09), streamed beside the catalogue. */
  savedBlanks: Promise<SavedBlanksAccount>;
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
  /** The board's own Tip Style (D-04) — one undo step per tap; shown only with a blank picked. */
  onTipStyle: (tipStyle: TipStyle) => void;
  /** Which surface the board's 12" fine-tunes move (D-13) — one undo step per tap; blank picked only. */
  onFineTuneSurface: (surface: FineTuneSurface) => void;
  /** Sets where one tip's thinning starts, by hand (Phase 14, D-11) — one undo step per drag per tip. */
  onThinningStart: (end: TipEnd, start: Mm) => void;
  /** Puts one tip back on Automatic (D-11) — one undo step; a no-op on a tip already on Automatic. */
  onThinningStartAutomatic: (end: TipEnd) => void;
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
      data-lock-exempt
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

/** The Rocker & Foil grid's column headings, group headings and row labels (the founder's canvas, quick
 * 261017-vdh). The caller adds `opacity-40` on a locked board, like every label beside a locked control. */
const GRID_HEAD =
  "text-[10px] font-display font-extrabold uppercase tracking-architectural text-surf-ink-muted";
const GRID_GROUP =
  "col-span-3 mt-1 border-b border-surf-line-faint pb-1 text-[10px] font-display font-extrabold uppercase tracking-architectural text-surf-ink";
const GRID_ROW_LABEL = "pb-px text-xs text-surf-ink-muted";

type GridSlider = ReturnType<typeof measureSlider>;

/**
 * One cell of the Rocker & Foil grid: the value in a bordered box over its own slider (`SliderRow`'s
 * `valueBox`, the Customize Rocker popup's look, with no label of its own). `SliderRow` reads the board
 * lock itself; the cell's own `Live` wrapper makes it inert on a tab where it is not live. `cell` is the
 * test hook (`{nose|tail}-{tip|12}-{rocker|thickness}`), `name` the slider's screen-reader name.
 */
function HandSetCell({
  cell,
  live,
  name,
  value,
  slider,
  system,
  onChange,
}: {
  cell: string;
  live: boolean;
  name: string;
  value: Mm;
  slider: GridSlider;
  system: UnitsSystem;
  onChange: (next: Mm) => void;
}) {
  const text = formatMark(value, system);
  return (
    <Live on={live}>
      <div data-hand-set-cell={cell} className="min-w-0">
        <SliderRow
          label=""
          valueBox={text}
          density="tight"
          value={slider.value}
          min={slider.min}
          max={slider.max}
          step={slider.step}
          sliderLabel={name}
          sliderValueText={text}
          onValueChange={(v) => onChange(slider.toMm(v))}
        />
      </div>
    </Live>
  );
}

/** A 12" station with a blank picked: the final thickness in the label, the tweak on the slider. */
function FineTuneRow({
  label,
  finalThickness,
  derived,
  reachesStation,
  offset,
  system,
  onChange,
}: {
  label: string;
  finalThickness: Mm;
  derived: Mm;
  /** That tip's start is further in than the 12" station (the profile's own flag, D-07). */
  reachesStation: boolean;
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
      leftHint={fineTuneSourceHint(reachesStation, derived, system)}
      rightHint={tweak === formatSignedMark(mm(0), system) ? "No tweak" : `Tweak ${tweak}`}
      onValueChange={(v) => onChange(slider.toMm(v))}
    />
  );
}

/**
 * The Automatic button on a Thinning Starts row's hint line (14-UI-SPEC §2): a text link in the
 * ↺ Reset Fine-Tune look, minus `self-start` (the hint line centres it) and plus `shrink-0` (a long hint
 * wraps beside it instead of squeezing it). On Automatic it stays in place, dimmed and inert, so nothing
 * shifts; the hint beside it says in words what the dimming means.
 */
function AutomaticButton({ end, automatic, onPress }: { end: TipEnd; automatic: boolean; onPress: () => void }) {
  const locked = useControlsLocked();
  return (
    <button
      type="button"
      disabled={locked}
      aria-label={automaticButtonLabel(end)}
      aria-pressed={automatic}
      aria-disabled={automatic ? "true" : undefined}
      tabIndex={automatic ? -1 : undefined}
      onClick={() => {
        if (!automatic) onPress();
      }}
      className={cn(
        "focus-ring-accent shrink-0 cursor-pointer text-left text-[11px] font-bold text-surf-accent-ink coarse:flex coarse:min-h-11 coarse:items-center disabled:cursor-default disabled:opacity-40",
        automatic && "pointer-events-none opacity-40",
      )}
    >
      Automatic
    </button>
  );
}

/**
 * One tip's Thinning Starts row (Phase 14, D-09 to D-11, 14-UI-SPEC §1 and §4): the distance in force in
 * the label, the slider from 6" (left, the tip) to the board's centre (right), the state on the hint
 * line's left and the Automatic button on its right — and, only for a start set by hand that is too
 * close to its tip, one sentence in warning ink under it. Everything it shows comes from the side
 * profile's per-tip view through `lib/geometry/blank-reasons.ts`; it computes and converts nothing.
 * The slider itself carries its tip's name and speaks its value the way the label prints it, so a
 * screen reader tells the two twin sliders apart (Phase 14 code review WR-01).
 */
function ThinningStartRow({
  end,
  tip,
  tipSetting,
  system,
  onChange,
  onAutomatic,
}: {
  end: TipEnd;
  tip: TipView;
  tipSetting: Mm;
  system: UnitsSystem;
  onChange: (end: TipEnd, start: Mm) => void;
  onAutomatic: (end: TipEnd) => void;
}) {
  const slider = thinningStartSlider(tip, system);
  const line = thinningStartLine(end, tip, tipSetting, system);
  return (
    <div>
      <SliderRow
        label={thinningStartRowLabel(end, tip, system)}
        value={slider.value}
        min={slider.min}
        max={slider.max}
        step={slider.step}
        leftHint={thinningStartHint(tip, system)}
        hintAction={<AutomaticButton end={end} automatic={tip.automatic} onPress={() => onAutomatic(end)} />}
        sliderLabel={thinningStartSliderLabel(end)}
        sliderValueText={formatThinningStart(tip.fromTip, system)}
        onValueChange={(v) => onChange(end, slider.toMm(v))}
      />
      {line && <p className="mt-2 text-xs text-surf-warning-ink">{line}</p>}
    </div>
  );
}

export function RockerControls({
  tab,
  templateLine,
  blanks,
  savedBlanks,
  rocker,
  foil,
  blank,
  sideProfile,
  onChangeRocker,
  onChangeFoil,
  onFineTune,
  onResetFineTune,
  onTipStyle,
  onFineTuneSurface,
  onThinningStart,
  onThinningStartAutomatic,
  sectionOpen,
  onToggleSectionOpen,
}: RockerControlsProps) {
  const { system } = useUnits();
  const locked = useControlsLocked();
  const rockerNoseTipSlider = measureSlider(rocker.noseTip, ROCKER_LIFT_RANGE_IN, ROCKER_LIFT_RANGE_IN.step, 1, system);
  const rockerNose12Slider = measureSlider(rocker.nose12, ROCKER_LIFT_RANGE_IN, ROCKER_LIFT_RANGE_IN.step, 1, system);
  const rockerTail12Slider = measureSlider(rocker.tail12, ROCKER_LIFT_RANGE_IN, ROCKER_LIFT_RANGE_IN.step, 1, system);
  const rockerTailTipSlider = measureSlider(rocker.tailTip, ROCKER_LIFT_RANGE_IN, ROCKER_LIFT_RANGE_IN.step, 1, system);
  const noseTipThicknessSlider = measureSlider(foil.noseTip, FOIL_THICKNESS_RANGE_IN, FOIL_THICKNESS_RANGE_IN.step, 1, system);
  const nose12ThicknessSlider = measureSlider(foil.nose12, FOIL_THICKNESS_RANGE_IN, FOIL_THICKNESS_RANGE_IN.step, 1, system);
  const tail12ThicknessSlider = measureSlider(foil.tail12, FOIL_THICKNESS_RANGE_IN, FOIL_THICKNESS_RANGE_IN.step, 1, system);
  const tailTipThicknessSlider = measureSlider(foil.tailTip, FOIL_THICKNESS_RANGE_IN, FOIL_THICKNESS_RANGE_IN.step, 1, system);
  const centerSlider = measureSlider(foil.center, FOIL_THICKNESS_RANGE_IN, FOIL_THICKNESS_RANGE_IN.step, 1, system);
  const view = blank ? sideProfile.blank : null;
  const live = liveControls(tab);
  const noTweak = !blank || (blank.nose12Offset === 0 && blank.tail12Offset === 0);
  const station = stationLabel(system);

  return (
    <div className="flex flex-col gap-5">
      <div data-rocker-inputs>
        <div className="mt-1.5 border-b border-surf-line-faint pb-2 text-xs font-display text-surf-ink uppercase tracking-architectural font-extrabold">
          Inputs
        </div>
        <div className="flex flex-col gap-3 pt-3">
          <div className="text-xs text-surf-ink-muted font-normal">{keepFiguresTogether(templateLine)}</div>
          <Live on={live.center}>
            <SliderRow
              label={`Center Thickness — ${formatMark(foil.center, system)}`}
              value={centerSlider.value}
              min={centerSlider.min}
              max={centerSlider.max}
              step={centerSlider.step}
              sliderLabel="Center Thickness"
              sliderValueText={formatMark(foil.center, system)}
              onValueChange={(v) => onChangeFoil({ center: centerSlider.toMm(v) })}
            />
          </Live>
        </div>
      </div>

      <Live on={live.blank}>
        <div>
          <SectionHeading open={sectionOpen.blank} onToggle={() => onToggleSectionOpen("blank")}>
            Blank
          </SectionHeading>
          {sectionOpen.blank && (
            <div className="pt-3">
              <BlankPicker catalog={blanks} savedBlanks={savedBlanks} />
            </div>
          )}
        </div>
      </Live>

      <div>
        <SectionHeading open={sectionOpen.boardOnBlank} onToggle={() => onToggleSectionOpen("boardOnBlank")}>
          Board on Blank
        </SectionHeading>
        {sectionOpen.boardOnBlank && (
          <div className="pt-3">
            <BoardOnBlankSection live={{ placement: live.placement, deckSkin: live.deckSkin }} />
          </div>
        )}
      </div>

      {!blank && (
        <Live on={live.rocker || live.thicknessHeading}>
          <div>
            <SectionHeading open={sectionOpen.rockerAndFoil} onToggle={() => onToggleSectionOpen("rockerAndFoil")}>
              Rocker &amp; Foil
            </SectionHeading>
            {sectionOpen.rockerAndFoil && (
              // The intro and the grid share ONE wrapper, the nose tip rocker the first slider in it —
              // phone-layout.spec.ts finds this section through the intro line's parent.
              <div className="flex flex-col gap-3.5 pt-3">
                <div className="text-xs text-surf-ink-muted font-normal">Hand-set until you pick a blank.</div>

                <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1fr)] items-end gap-x-4 gap-y-2">
                  <div />
                  <div className={cn(GRID_HEAD, locked && "opacity-40")}>Rocker</div>
                  <div className={cn(GRID_HEAD, locked && "opacity-40")}>Thickness</div>

                  <div className={cn(GRID_GROUP, locked && "opacity-40")}>Nose</div>
                  <div className={cn(GRID_ROW_LABEL, locked && "opacity-40")}>Tip</div>
                  <HandSetCell
                    cell="nose-tip-rocker"
                    live={live.rocker}
                    name="Nose tip rocker"
                    value={rocker.noseTip}
                    slider={rockerNoseTipSlider}
                    system={system}
                    onChange={(next) => onChangeRocker({ noseTip: next })}
                  />
                  <HandSetCell
                    cell="nose-tip-thickness"
                    live={live.tipThickness}
                    name="Nose tip thickness"
                    value={foil.noseTip}
                    slider={noseTipThicknessSlider}
                    system={system}
                    onChange={(next) => onChangeFoil({ noseTip: next })}
                  />
                  <div className={cn(GRID_ROW_LABEL, locked && "opacity-40")}>@ {station}</div>
                  <HandSetCell
                    cell="nose-12-rocker"
                    live={live.rocker}
                    name={`Nose ${station} rocker`}
                    value={rocker.nose12}
                    slider={rockerNose12Slider}
                    system={system}
                    onChange={(next) => onChangeRocker({ nose12: next })}
                  />
                  <HandSetCell
                    cell="nose-12-thickness"
                    live={live.fineTune}
                    name={`Nose ${station} thickness`}
                    value={foil.nose12}
                    slider={nose12ThicknessSlider}
                    system={system}
                    onChange={(next) => onChangeFoil({ nose12: next })}
                  />

                  <div className={cn(GRID_GROUP, locked && "opacity-40")}>Tail</div>
                  <div className={cn(GRID_ROW_LABEL, locked && "opacity-40")}>@ {station}</div>
                  <HandSetCell
                    cell="tail-12-rocker"
                    live={live.rocker}
                    name={`Tail ${station} rocker`}
                    value={rocker.tail12}
                    slider={rockerTail12Slider}
                    system={system}
                    onChange={(next) => onChangeRocker({ tail12: next })}
                  />
                  <HandSetCell
                    cell="tail-12-thickness"
                    live={live.fineTune}
                    name={`Tail ${station} thickness`}
                    value={foil.tail12}
                    slider={tail12ThicknessSlider}
                    system={system}
                    onChange={(next) => onChangeFoil({ tail12: next })}
                  />
                  <div className={cn(GRID_ROW_LABEL, locked && "opacity-40")}>Tip</div>
                  <HandSetCell
                    cell="tail-tip-rocker"
                    live={live.rocker}
                    name="Tail tip rocker"
                    value={rocker.tailTip}
                    slider={rockerTailTipSlider}
                    system={system}
                    onChange={(next) => onChangeRocker({ tailTip: next })}
                  />
                  <HandSetCell
                    cell="tail-tip-thickness"
                    live={live.tipThickness}
                    name="Tail tip thickness"
                    value={foil.tailTip}
                    slider={tailTipThicknessSlider}
                    system={system}
                    onChange={(next) => onChangeFoil({ tailTip: next })}
                  />
                </div>
              </div>
            )}
          </div>
        </Live>
      )}

      {blank && view && (
        <Live on={live.thicknessHeading}>
          <div>
            <SectionHeading open={sectionOpen.foil} onToggle={() => onToggleSectionOpen("foil")}>
              Foil
            </SectionHeading>
            {sectionOpen.foil && (
              <div className="flex flex-col gap-3.5 pt-3">
                <div className="text-xs text-surf-ink-muted font-normal">{thicknessIntroWithBlank(system)}</div>

                <Live on={live.tipThickness}>
                  <ThicknessRow
                    label="Nose Tip"
                    value={foil.noseTip}
                    system={system}
                    onChange={(next) => onChangeFoil({ noseTip: next })}
                  />
                </Live>

                  <Live on={live.fineTune}>
                    <FineTuneRow
                      label={`Nose @ ${station}`}
                      finalThickness={sideProfile.effectiveFoil.nose12}
                      derived={view.derived12.nose12}
                      reachesStation={view.tips.nose.reachesStation}
                      offset={blank.nose12Offset}
                      system={system}
                      onChange={(next) => onFineTune({ nose12Offset: next })}
                    />
                  </Live>
                  <Live on={live.fineTune}>
                    <FineTuneRow
                      label={`Tail @ ${station}`}
                      finalThickness={sideProfile.effectiveFoil.tail12}
                      derived={view.derived12.tail12}
                      reachesStation={view.tips.tail.reachesStation}
                      offset={blank.tail12Offset}
                      system={system}
                      onChange={(next) => onFineTune({ tail12Offset: next })}
                    />
                  </Live>
                  {/* Directly under the two 12" rows it governs (§5a); Tip Style stays last. */}
                  <Live on={live.fineTune}>
                    <div className="flex flex-col">
                      <div className={cn("mb-2 text-sm text-surf-ink-muted font-normal", locked && "opacity-40")}>Fine-tune off</div>
                      <TwoOptionToggle
                        options={["deck", "bottom"] as const}
                        labels={["Deck", "Bottom"] as const}
                        value={view.cut.fineTuneSurface}
                        onChange={onFineTuneSurface}
                        disabled={locked}
                        ariaLabel="Fine-tune off"
                        className="self-start"
                      />
                      <div className={cn("mt-2 text-xs text-surf-ink-muted font-normal", locked && "opacity-40")}>
                        {FINE_TUNE_SURFACE_HINT[view.cut.fineTuneSurface]}
                      </div>
                    </div>
                  </Live>

                <Live on={live.tipThickness}>
                  <ThicknessRow
                    label="Tail Tip"
                    value={foil.tailTip}
                    system={system}
                    onChange={(next) => onChangeFoil({ tailTip: next })}
                  />
                </Live>

                {blank && (
                  // Stays in place when there is nothing to reset — dimmed and inert, so the rows
                  // above never shift. No confirmation: undo brings the tweaks back. Its `self-start`
                  // keeps working inside the `flex flex-col` wrapper (quick 261006-v20, D-10).
                  <Live on={live.fineTune}>
                    <button
                      type="button"
                      disabled={locked}
                      aria-disabled={noTweak ? "true" : undefined}
                      tabIndex={noTweak ? -1 : undefined}
                      onClick={() => {
                        if (!noTweak) onResetFineTune();
                      }}
                      className={cn(
                        "focus-ring-accent cursor-pointer self-start text-left text-[11px] font-bold text-surf-accent-ink coarse:flex coarse:min-h-11 coarse:items-center disabled:cursor-default disabled:opacity-40",
                        noTweak && "pointer-events-none opacity-40",
                      )}
                    >
                      ↺ Reset Fine-Tune
                    </button>
                  </Live>
                )}

                {view && (
                  // At its natural width — "those who want it will find it" (§4); only the two Thinning
                  // Starts rows come after it (Phase 14, D-10).
                  <Live on={live.tipStyle}>
                    <div className="flex flex-col">
                      <div className={cn("mb-2 text-sm text-surf-ink-muted font-normal", locked && "opacity-40")}>Tip Style</div>
                      <TwoOptionToggle
                        options={["pinDeck", "bottom"] as const}
                        labels={["Pin deck", "Bottom"] as const}
                        value={view.cut.tipStyle}
                        onChange={onTipStyle}
                        disabled={locked}
                        ariaLabel="Tip Style"
                        className="self-start"
                      />
                      <div className={cn("mt-2 text-xs text-surf-ink-muted font-normal", locked && "opacity-40")}>{TIP_STYLE_HINT[view.cut.tipStyle]}</div>
                    </div>
                  </Live>
                )}

                {view && (
                  // Close THICKNESS, nose then tail (D-10): which surface (Tip Style), then where each tip's
                  // thinning starts. Shown only with a blank picked — hidden, not disabled (D-09).
                  <>
                    <Live on={live.thinning}>
                      <ThinningStartRow
                        end="nose"
                        tip={view.tips.nose}
                        tipSetting={foil.noseTip}
                        system={system}
                        onChange={onThinningStart}
                        onAutomatic={onThinningStartAutomatic}
                      />
                    </Live>
                    <Live on={live.thinning}>
                      <ThinningStartRow
                        end="tail"
                        tip={view.tips.tail}
                        tipSetting={foil.tailTip}
                        system={system}
                        onChange={onThinningStart}
                        onAutomatic={onThinningStartAutomatic}
                      />
                    </Live>
                  </>
                )}
              </div>
            )}
          </div>
        </Live>
      )}
    </div>
  );
}
