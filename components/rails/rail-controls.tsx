"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  MIN_BOTTOM_TUCK_SEPARATION_IN,
  railFamilyLabel,
  type RailBandSpec,
  type RailFamily,
  type RailSectionKey,
  type RailSectionOutput,
  type RailSectionSpec,
} from "@/lib/geometry/rail-bands";
import { formatMark, measureSlider, stationLabel } from "@/lib/geometry/measure-display";
import { mm, mmToInches, type UnitsSystem } from "@/lib/geometry/units";
import { SliderRow, sliderValue } from "@/components/design/slider-row";
import { useUnits } from "@/components/units-provider";
import { usePrintRailInstructions } from "@/components/print-instructions-provider";

interface RailControlsProps {
  /** The effective spec (D-09) — `boardThickness` on each section already reflects the foil's
   * value while `railsImportFoilThickness` is on, so a slider label and the bands it feeds always
   * agree with the same number. */
  spec: RailBandSpec;
  bands: Record<RailSectionKey, RailSectionOutput>;
  onChangeSection: (key: RailSectionKey, patch: Partial<RailSectionSpec>) => void;
  onToggleHardEdge: () => void;
  sectionOpen: Record<RailSectionKey, boolean>;
  onToggleSectionOpen: (key: RailSectionKey) => void;
  advancedOpen: Record<RailSectionKey, boolean>;
  onToggleAdvancedOpen: (key: RailSectionKey) => void;
  /** Whether the three thickness sliders read from the foil (D-09/D-10) — checked by default. */
  railsImportFoilThickness: boolean;
  onToggleRailsImportFoilThickness: () => void;
}

const NT_THICKNESS_BOUNDS = { min: 1, max: 2.5, step: 1 / 16 };
const CENTER_THICKNESS_BOUNDS = { min: 1.75, max: 3.5, step: 1 / 16 };
const TUCK_BOUNDS = { min: 0, max: 1.5, step: 1 / 16 };
// Corner Cut Offset's computed defaults (cornerCutRailOffsetForInches in lib/geometry/rail-bands.ts)
// are 1/8, 3/32, 1/16, 1/32, and 0 — a 1/16 step can't represent the 3/32 or 1/32 defaults, so this
// slider needs its own finer-grained, narrower-range bounds. TUCK_BOUNDS stays as-is for Bottom Tuck 3.
const CORNER_CUT_BOUNDS = { min: 0, max: 0.25, step: 1 / 32 };

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

function SectionHeading({
  children,
  onToggle,
  open,
  small,
}: {
  children: React.ReactNode;
  onToggle: () => void;
  open: boolean;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        small
          ? "flex w-full items-center justify-between border-b border-surf-line-faint pb-2 pl-3 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold"
          : "mt-1.5 flex w-full items-center justify-between border-b border-surf-line-faint pb-2 text-xs font-display text-surf-ink uppercase tracking-architectural font-extrabold"
      }
    >
      <span>{children}</span>
      <span>{open ? "▾" : "▸"}</span>
    </button>
  );
}

function RatioTickCaptions() {
  return (
    <div className="relative mt-0.5 h-3">
      <span className="absolute left-0 text-[9px] text-surf-ink-muted font-normal">30/70</span>
      <span className="absolute left-1/2 -translate-x-1/2 text-[9px] text-surf-ink-muted font-normal">50/50</span>
      <span className="absolute left-3/4 -translate-x-1/2 text-[9px] text-surf-ink-muted font-normal">60/40</span>
      <span className="absolute right-0 text-[9px] text-surf-ink-muted font-normal">70/30</span>
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
  /** While linked (D-09/D-10), the thickness slider disables and shows the foil-derived value
   * already sitting in `spec.boardThickness` — every other control on the section is untouched. */
  thicknessDisabled: boolean;
  system: UnitsSystem;
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
  thicknessDisabled,
  system,
}: RailSectionControlsProps) {
  const isTail = sectionKey === "tail";
  const thicknessBounds = sectionKey === "center" ? CENTER_THICKNESS_BOUNDS : NT_THICKNESS_BOUNDS;
  // Inches-domain thickness stays around for deckProfileStep — the deck-profile step formula is a
  // model-side snap (pinned by golden fixtures) and never becomes system-aware.
  const boardThicknessIn = mmToInches(spec.boardThickness);
  const deckProfileSliderStep = deckProfileStep(boardThicknessIn);
  const deckProfileSliderValue = 166 - spec.deckPercent;
  const thicknessSlider = measureSlider(spec.boardThickness, thicknessBounds, thicknessBounds.step, 1, system);
  const cornerCutOffsetMm = output.result.cornerCutOffset ?? mm(0);
  const cornerCutSlider = measureSlider(cornerCutOffsetMm, CORNER_CUT_BOUNDS, CORNER_CUT_BOUNDS.step, 1, system);
  const bottomTuck3DerivedIn = mmToInches(output.result.bottomTuck3Derived);
  // Dynamic bounds (GSD-added, not a static constant like TUCK_BOUNDS): Bottom Tuck 3 must never
  // be draggable at or below Bottom Tuck 1 (which itself depends on symmetrical/family/scale/
  // thickness) — the min enforces the same strict separation as the geometry-layer floor. The max
  // tracks the un-overridden derived value (computed in lib/, not here) so a symmetrical 4" value
  // is always reachable and never pinned below a static 1.5" max that can't represent it. This
  // bound is always computed in inches, regardless of system — measureSlider derives the metric
  // domain from it the same way it does for every static *_BOUNDS constant.
  const bottomTuck3Bounds = {
    min: mmToInches(output.result.bottomTuck1) + MIN_BOTTOM_TUCK_SEPARATION_IN,
    max: Math.max(TUCK_BOUNDS.max, bottomTuck3DerivedIn),
    step: TUCK_BOUNDS.step,
  };
  const bottomTuck3Slider = measureSlider(
    output.result.bottomTuck3,
    bottomTuck3Bounds,
    bottomTuck3Bounds.step,
    1,
    system,
  );
  const hardEdgeOn = isTail ? !!tailHardEdge : false;
  const thicknessLabel = sectionThicknessLabel(system)[sectionKey];

  const resetAdvanced = () => {
    onChange({
      cornerCutOffsetOverride: null,
      bottomTuck3Override: null,
      removeCornerCut: false,
      singleTuck: false,
    });
  };

  return (
    <div className="flex flex-col gap-3.5">
      <SectionHeading open={open} onToggle={onToggleOpen}>
        {SECTION_TITLE[sectionKey]}
      </SectionHeading>
      {open && (
        <>
          <SliderRow
            label={`${thicknessLabel} — ${formatMark(spec.boardThickness, system)}`}
            value={thicknessSlider.value}
            min={thicknessSlider.min}
            max={thicknessSlider.max}
            step={thicknessSlider.step}
            disabled={thicknessDisabled}
            onValueChange={(v) => onChange({ boardThickness: thicknessSlider.toMm(v) })}
          />

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
            <div className="min-w-0 flex-1">
              <div className="mb-2 min-h-5 leading-5 text-sm text-surf-ink-muted font-normal">
                Family — {railFamilyLabel(spec.family)}
              </div>
              <Slider
                value={spec.family}
                min={1}
                max={5}
                step={1}
                onValueChange={(v) => onChange({ family: clampFinite(sliderValue(v), 1, 5) as RailFamily })}
                className="slider-accent"
              />
              <div className="mt-0.5 flex justify-between text-xs text-surf-ink-muted font-normal">
                <span>Boxy</span>
                <span>Medium</span>
                <span>Knifey</span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex h-4 items-center justify-between leading-4">
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
                onValueChange={(v) => onChange({ ratioTopPercent: clampFinite(sliderValue(v), 30, 70) })}
                className="slider-accent"
              />
              <RatioTickCaptions />
              {isTail && (
                <label className="mt-2 flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
                  <Checkbox checked={hardEdgeOn} onCheckedChange={() => onToggleHardEdge?.()} />
                  Hard Edge
                </label>
              )}
            </div>
          </div>

          <div>
            <SectionHeading small open={advancedOpen} onToggle={onToggleAdvancedOpen}>
              Advanced
            </SectionHeading>
            {advancedOpen && (
              <div className="flex flex-col gap-3 pl-3 pt-3">
                {/* Corner Cut Offset and Bottom Tuck 3 (below) both keep their own hand-rolled
                    markup — each one's heading line carries its own checkbox (Remove / Use
                    Single Tuck) beside the label, which SliderRow's plain-string `label` prop has
                    no slot for. Both are named in slider-row.test.ts's allowlist. */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="text-sm text-surf-ink-muted font-normal">
                      Corner Cut Offset — {formatMark(cornerCutOffsetMm, system)}
                    </div>
                    <label className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
                      <Checkbox
                        checked={spec.removeCornerCut}
                        onCheckedChange={() => onChange({ removeCornerCut: !spec.removeCornerCut })}
                      />
                      Remove
                    </label>
                  </div>
                  <div className={spec.removeCornerCut ? "opacity-40" : undefined}>
                    <Slider
                      value={cornerCutSlider.value}
                      min={cornerCutSlider.min}
                      max={cornerCutSlider.max}
                      step={cornerCutSlider.step}
                      disabled={spec.removeCornerCut}
                      onValueChange={(v) =>
                        onChange({ cornerCutOffsetOverride: cornerCutSlider.toMm(sliderValue(v)) })
                      }
                      className="slider-accent"
                    />
                  </div>
                  <div className="mt-0.5 text-xs text-surf-ink-muted font-normal">
                    0 = falls on Rail Mark 1
                  </div>
                </div>

                {(!isTail || !hardEdgeOn) && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="text-sm text-surf-ink-muted font-normal">
                        Bottom Tuck 3 — {formatMark(output.result.bottomTuck3, system)}
                      </div>
                      <label className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
                        <Checkbox
                          checked={spec.singleTuck}
                          onCheckedChange={() => onChange({ singleTuck: !spec.singleTuck })}
                        />
                        Use Single Tuck
                      </label>
                    </div>
                    <Slider
                      value={bottomTuck3Slider.value}
                      min={bottomTuck3Slider.min}
                      max={bottomTuck3Slider.max}
                      step={bottomTuck3Slider.step}
                      onValueChange={(v) => onChange({ bottomTuck3Override: bottomTuck3Slider.toMm(sliderValue(v)) })}
                      className="slider-accent"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={resetAdvanced}
                  className="cursor-pointer text-left text-[11px] font-bold text-surf-accent-ink"
                >
                  ↺ Reset Advanced Settings
                </button>
              </div>
            )}
          </div>
        </>
      )}
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
}: RailControlsProps) {
  const { system } = useUnits();
  const { included: printRailInstructions, setIncluded: setPrintRailInstructions } = usePrintRailInstructions();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold">Rail Band Calculator</div>
        <div className="mt-0.5 text-sm text-surf-ink-muted font-normal">
          Rail band calculator for shaping consistent rails
        </div>
      </div>

      <div>
        <label className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
          <Checkbox
            checked={railsImportFoilThickness}
            onCheckedChange={() => onToggleRailsImportFoilThickness()}
          />
          Use Board&#39;s Rocker &amp; Foil Thickness
        </label>
        <div className="mt-1 text-xs text-surf-ink-muted font-normal">
          {railsImportFoilThickness
            ? "Thickness comes from the ROCKER screen — turn this off to type your own numbers."
            : "You're typing your own thickness here — turn this on to use the board's foil instead."}
        </div>
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
        thicknessDisabled={railsImportFoilThickness}
        system={system}
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
        thicknessDisabled={railsImportFoilThickness}
        system={system}
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
        thicknessDisabled={railsImportFoilThickness}
        system={system}
      />

      <div>
        <label className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
          <Checkbox
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
