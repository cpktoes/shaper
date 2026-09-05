"use client";

/**
 * The Volume Estimator sidebar, ported from reference/project/Volume.dc.html lines 24-104.
 * Reuses the aside layout, the section-heading and slider-row styling from
 * components/rails/rail-controls.tsx wholesale.
 */

import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SliderRow, sliderValue } from "@/components/design/slider-row";
import type { VolumeResult, VolumeSpec } from "@/lib/geometry/volume";
import { BOARD_TYPE_STEP_COUNT } from "@/lib/geometry/volume";
import { formatInchesFraction, inchesToMm, mmToInches } from "@/lib/geometry/units";

const WIDTH_BOUNDS = { min: 16, max: 24, step: 0.125 };
const CENTER_THICKNESS_BOUNDS = { min: 1.75, max: 3.5, step: 0.0625 };
const FEET_OPTIONS = [4, 5, 6, 7, 8, 9, 10];
const INCHES_OPTIONS = Array.from({ length: 12 }, (_, i) => i);

function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function PrimaryInputsHeading() {
  return (
    <div className="flex items-center justify-between gap-2.5 border-b border-outline-sidebar-divider pb-1.5">
      <div className="text-xs font-display text-surf-ink uppercase tracking-architectural font-extrabold">Primary Inputs</div>
    </div>
  );
}

interface VolumeControlsProps {
  effectiveVolume: VolumeSpec;
  volumeResult: VolumeResult;
  onChange: (patch: Partial<VolumeSpec>) => void;
  onToggleImportTemplateDimensions: () => void;
  onToggleImportRailThickness: () => void;
}

export function VolumeControls({
  effectiveVolume,
  volumeResult,
  onChange,
  onToggleImportTemplateDimensions,
  onToggleImportRailThickness,
}: VolumeControlsProps) {
  const lengthIn = mmToInches(effectiveVolume.length);
  const lengthFeet = Math.floor(lengthIn / 12);
  const lengthInches = Math.round(lengthIn - lengthFeet * 12);
  const setLengthIn = (totalIn: number) => onChange({ length: inchesToMm(clampFinite(totalIn, 60, 120)) });

  const widthIn = mmToInches(effectiveVolume.width);
  const centerThicknessIn = mmToInches(effectiveVolume.centerThickness);

  const { templateAvailable, railAvailable, importingTemplate, importingRailThickness } = volumeResult;
  const dimensionsDisabled = importingTemplate;
  const dimensionsOpacity = importingTemplate ? 0.4 : 1;
  const thicknessDisabled = importingRailThickness;

  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <div className="text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold">Volume Estimator</div>
        <div className="mt-0.5 text-sm text-surf-ink-muted font-normal">
          Approximate volume of a designed board
        </div>
      </div>

      <PrimaryInputsHeading />

      {/* D-13's method switch, in plain English: on measures the board's real drawn shape (the
          accurate cross-section litres, everywhere the app quotes volume); off is this screen's
          own standalone quick estimate from a board type and its factor tables. */}
      {templateAvailable && (
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-surf-ink-muted font-normal">
          <Checkbox
            checked={effectiveVolume.importTemplateDimensions}
            onCheckedChange={() => onToggleImportTemplateDimensions()}
          />
          Measure This Board&apos;s Real Shape (off = quick estimate from board type)
        </label>
      )}

      {railAvailable && (
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-surf-ink-muted font-normal">
          <Checkbox
            checked={effectiveVolume.importRailThickness}
            onCheckedChange={() => onToggleImportRailThickness()}
            disabled={!effectiveVolume.importTemplateDimensions}
          />
          Use This Board&apos;s Real Rail &amp; Thickness Data
        </label>
      )}

      {/* Board Length keeps its own hand-rolled markup — the feet/inches Select combo sits
          between the label and the slider, which SliderRow's fixed label-then-track layout has
          no room for. Named in slider-row.test.ts's allowlist alongside its TEMPLATE and FINS
          counterparts, which share this exact shape. */}
      <div style={{ opacity: dimensionsOpacity }}>
        <div className="mb-1.5 text-sm text-surf-ink-muted font-normal">
          Board Length — {lengthFeet}&apos;{lengthInches}&quot;
        </div>
        <div className="mb-2 flex gap-2">
          <Select
            value={lengthFeet}
            onValueChange={(v) => setLengthIn((v as number) * 12 + lengthInches)}
            disabled={dimensionsDisabled}
          >
            <SelectTrigger className="flex-1 border-outline-sidebar-input-border bg-outline-sidebar-input-bg text-outline-sidebar-text">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FEET_OPTIONS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}&apos;
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={lengthInches}
            onValueChange={(v) => setLengthIn(lengthFeet * 12 + (v as number))}
            disabled={dimensionsDisabled}
          >
            <SelectTrigger className="flex-1 border-outline-sidebar-input-border bg-outline-sidebar-input-bg text-outline-sidebar-text">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INCHES_OPTIONS.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}&quot;
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Slider
          value={lengthIn}
          min={60}
          max={120}
          step={1}
          disabled={dimensionsDisabled}
          onValueChange={(v) => setLengthIn(sliderValue(v))}
          className="slider-accent"
        />
      </div>

      <SliderRow
        density="tight"
        label={`Board Width — ${formatInchesFraction(effectiveVolume.width)}`}
        value={widthIn}
        min={WIDTH_BOUNDS.min}
        max={WIDTH_BOUNDS.max}
        step={WIDTH_BOUNDS.step}
        disabled={dimensionsDisabled}
        onValueChange={(v) =>
          onChange({ width: inchesToMm(clampFinite(v, WIDTH_BOUNDS.min, WIDTH_BOUNDS.max)) })
        }
      />

      <SliderRow
        density="tight"
        label={`Center Thickness — ${formatInchesFraction(effectiveVolume.centerThickness)}`}
        value={centerThicknessIn}
        min={CENTER_THICKNESS_BOUNDS.min}
        max={CENTER_THICKNESS_BOUNDS.max}
        step={CENTER_THICKNESS_BOUNDS.step}
        disabled={thicknessDisabled}
        onValueChange={(v) =>
          onChange({
            centerThickness: inchesToMm(clampFinite(v, CENTER_THICKNESS_BOUNDS.min, CENTER_THICKNESS_BOUNDS.max)),
          })
        }
      />

      {!importingRailThickness && (
        <SliderRow
          density="tight"
          label="Board Type"
          value={effectiveVolume.boardTypeIndex}
          min={0}
          max={BOARD_TYPE_STEP_COUNT - 1}
          step={1}
          disabled={thicknessDisabled}
          onValueChange={(v) =>
            onChange({ boardTypeIndex: clampFinite(v, 0, BOARD_TYPE_STEP_COUNT - 1) })
          }
          leftHint="Performance"
          rightHint="Beefy"
        />
      )}
    </div>
  );
}
