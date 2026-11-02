"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  railFamilyLabel,
  type RailBandSpec,
  type RailFamily,
  type RailSectionKey,
  type RailSectionOutput,
  type RailSectionSpec,
} from "@/lib/geometry/rail-bands";
import { formatMark, measureSlider, stationLabel } from "@/lib/geometry/measure-display";
import { railsImportedReadout } from "@/lib/geometry/imported-readout";
import { ImportedReadoutCard } from "@/components/design/imported-readout-card";
import { mmToInches, type UnitsSystem } from "@/lib/geometry/units";
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

/** rawStep/steps/percentStep from the prototype's `deckProfileFor`, so both slider endpoints
 * (including 100% Flat) stay exactly reachable regardless of the section's own thickness. */
function deckProfileStep(thicknessIn: number): number {
  const rawStep = Math.max(0.01, (0.0625 / thicknessIn) * 100);
  const steps = Math.max(1, Math.round(34 / rawStep));
  return 34 / steps;
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

/** The Ratio slider's marks under its track, each at its own place on the 30-70 range. No 70/30 at the right
 * end: in a half-width column it ran into 60/40 and read "60/4070/30" (the founder, 2026-10-19: "drop the
 * 70/30 marks"). */
function RatioTickCaptions() {
  return (
    <div className="relative mt-0.5 h-3">
      <span className="absolute left-0 text-[9px] text-surf-ink-muted font-normal">30/70</span>
      <span className="absolute left-1/2 -translate-x-1/2 text-[9px] text-surf-ink-muted font-normal">50/50</span>
      <span className="absolute left-3/4 -translate-x-1/2 text-[9px] text-surf-ink-muted font-normal">60/40</span>
    </div>
  );
}

interface RailSectionControlsProps {
  sectionKey: RailSectionKey;
  spec: RailSectionSpec;
  output: RailSectionOutput;
  onChange: (patch: Partial<RailSectionSpec>) => void;
  open: boolean;
  onToggleOpen: () => void;
  advancedOpen: boolean;
  onToggleAdvancedOpen: () => void;
  tailHardEdge?: boolean;
  onToggleHardEdge?: () => void;
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
  open,
  onToggleOpen,
  advancedOpen,
  onToggleAdvancedOpen,
  tailHardEdge,
  onToggleHardEdge,
  thicknessImported,
  system,
  hiddenOnPhone,
  phonePicked,
}: RailSectionControlsProps) {
  const locked = useControlsLocked();
  const isTail = sectionKey === "tail";
  const thicknessBounds = sectionKey === "center" ? CENTER_THICKNESS_BOUNDS : NT_THICKNESS_BOUNDS;
  // Inches-domain thickness stays around for deckProfileStep — the deck-profile step formula is a
  // model-side snap (pinned by golden fixtures) and never becomes system-aware.
  const boardThicknessIn = mmToInches(spec.boardThickness);
  const deckProfileSliderStep = deckProfileStep(boardThicknessIn);
  const deckProfileSliderValue = 166 - spec.deckPercent;
  const thicknessSlider = measureSlider(spec.boardThickness, thicknessBounds, thicknessBounds.step, 1, system);
  const hardEdgeOn = isTail ? !!tailHardEdge : false;
  const thicknessLabel = sectionThicknessLabel(system)[sectionKey];

  // Quick 261102-gec (PC12): the Corner Cut and the old Bottom Tuck 3 setting are gone with the
  // prototype's rules, so Reset puts Single Tuck back off, as before; plan 02 widens it to the scale
  // and the seven nudges. A saved board's old Corner Cut and Bottom Tuck 3 settings stay stored, unread.
  const resetAdvanced = () => {
    onChange({ singleTuck: false });
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
        min={66}
        max={100}
        step={deckProfileSliderStep}
        onValueChange={(v) => onChange({ deckPercent: clampFinite(166 - v, 66, 100) })}
        leftHint="Flat"
        rightHint="Heavily Domed"
      />

      {/* Family and Ratio (below) both keep their own hand-rolled markup. Family's hint row
          carries three captions (Boxy/Medium/Knifey) where SliderRow's fixed hint slot only
          has room for two; Ratio's own hint row is the four-caption RatioTickCaptions plus a
          Sym checkbox sharing its heading line, neither of which SliderRow's plain-string
          label and two-hint layout can hold. Both are named in slider-row.test.ts's
          allowlist. */}
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
          <div className="mb-2 flex h-5 items-center justify-between leading-5">
            <div className="text-sm text-surf-ink-muted font-normal">
              Ratio — {spec.ratioTopPercent}/{100 - spec.ratioTopPercent}
            </div>
            {/* 09-REVIEW.md IN-01: only the shared Button/Input/Slider primitives get their
                coarse: touch sizing for free (Slider's own coarse:after:-inset-4 is why the
                Family/Ratio sliders right beside this row need no explicit rule of their
                own). This is a hand-rolled label row, not one of those primitives, so it
                carries its own explicit coarse:min-h-11 -- see WR-02 for what happens to a
                hand-rolled control that skips this. */}
            <label className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
              <Checkbox
                disabled={locked}
                checked={spec.symmetrical}
                onCheckedChange={() => onChange({ symmetrical: !spec.symmetrical })}
              />
              Sym
            </label>
          </div>
          <Slider
            value={spec.ratioTopPercent}
            min={30}
            max={70}
            step={1}
            disabled={locked}
            onValueChange={(v) => onChange({ ratioTopPercent: clampFinite(sliderValue(v), 30, 70) })}
            className="slider-accent"
          />
          <RatioTickCaptions />
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
            {/* Use Single Tuck on a line of its own (quick 261102-gec, PC12): it used to share the
                Bottom Tuck 3 slider's heading line, and that slider went with the prototype's rules.
                Hidden on the tail while Hard Edge is on, exactly as that row was. */}
            {(!isTail || !hardEdgeOn) && (
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

            <button
              type="button"
              disabled={locked}
              onClick={resetAdvanced}
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
  sectionOpen,
  onToggleSectionOpen,
  advancedOpen,
  onToggleAdvancedOpen,
  railsImportFoilThickness,
  onToggleRailsImportFoilThickness,
  phoneSection,
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
        open={sectionOpen.nose}
        onToggleOpen={() => onToggleSectionOpen("nose")}
        advancedOpen={advancedOpen.nose}
        onToggleAdvancedOpen={() => onToggleAdvancedOpen("nose")}
        thicknessImported={railsImportFoilThickness}
        system={system}
        hiddenOnPhone={phoneSection !== undefined && phoneSection !== "nose"}
        phonePicked={phoneSection === "nose"}
      />

      <RailSectionControls
        sectionKey="center"
        spec={spec.center}
        output={bands.center}
        onChange={(patch) => onChangeSection("center", patch)}
        open={sectionOpen.center}
        onToggleOpen={() => onToggleSectionOpen("center")}
        advancedOpen={advancedOpen.center}
        onToggleAdvancedOpen={() => onToggleAdvancedOpen("center")}
        thicknessImported={railsImportFoilThickness}
        system={system}
        hiddenOnPhone={phoneSection !== undefined && phoneSection !== "center"}
        phonePicked={phoneSection === "center"}
      />

      <RailSectionControls
        sectionKey="tail"
        spec={spec.tail}
        output={bands.tail}
        onChange={(patch) => onChangeSection("tail", patch)}
        open={sectionOpen.tail}
        onToggleOpen={() => onToggleSectionOpen("tail")}
        advancedOpen={advancedOpen.tail}
        onToggleAdvancedOpen={() => onToggleAdvancedOpen("tail")}
        tailHardEdge={spec.tailHardEdge}
        onToggleHardEdge={onToggleHardEdge}
        thicknessImported={railsImportFoilThickness}
        system={system}
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
