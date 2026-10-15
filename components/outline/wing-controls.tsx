"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SliderRow } from "@/components/design/slider-row";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { useUnits } from "@/components/units-provider";
import { TwoOptionToggle } from "@/components/viewer/two-option-toggle";
import type { OutlineSpec } from "@/lib/geometry/board";
import { formatDim, formatMark, formatSignedMark, measureSlider } from "@/lib/geometry/measure-display";
import { inchesToMm, mm, mmToInches } from "@/lib/geometry/units";
import {
  MAX_WINGS,
  WING_DEPTH_RANGE_IN,
  WING_FIN_OFFSET_RANGE_IN,
  WING_POSITION_MIN_IN,
  WING_RUN_RANGE_IN,
  WING_STEP_IN,
  WING_STEP_MM,
  effectiveWingRadius,
  wingPositionRangeIn,
  wingRadiusTop,
  type FrontFinEdges,
  type Wing,
} from "@/lib/geometry/wings";
import { SectionHeading, TemplateSettings } from "./outline-controls";

/**
 * The WINGS tab's sidebar (quick 261014-wii, 2026-10-14, D2, D3, D8, D9, P8; sketch 014 B, "A,
 * sidebar swaps"). While the WINGS tab is open the sidebar holds ONLY these controls, in the
 * Template Builder's own dress — the same title block, ruled section headings, slider rows and
 * Settings block as `outline-controls.tsx` — and no board length or other template control.
 *
 * Per wing: its position from the tail (a DIM — centimetres to one decimal in Metric, the Thinning
 * Start precedent), a lock to the front fin with the fin edge and an offset, its depth and its run
 * along the stringer, and the corner radius, whose top moves with the run and depth (P8). Every
 * number moves in 1/16" (1 mm in Metric) through `measureSlider`, and every one reads through
 * `measure-display.ts` (CLAUDE.md Rule 2). Each slider reads the wing as the screen shows it — a
 * locked wing at its resolved station — and writes the whole wings list back, so the stored station
 * is always the last one shown (P2), which is what unlocking keeps.
 *
 * `SliderRow` only, never a raw slider (`slider-row.test.ts`). A locked board greys every control.
 */
export interface WingControlsProps {
  /** The resolved outline — a locked wing at its fin edge plus offset. */
  outline: OutlineSpec;
  onChange: (patch: Partial<OutlineSpec>) => void;
  /** Adds the next wing — shared with the empty tab's card, so both add the same wing. */
  onAddWing: () => void;
  /** The front fin's edges as FINS places them, or `null` for a setup with no front fin. */
  frontFin: FrontFinEdges | null;
  showConstruction: boolean;
  onToggleConstruction: () => void;
  showFins: boolean;
  onToggleShowFins: () => void;
}

export function WingControls({
  outline,
  onChange,
  onAddWing,
  frontFin,
  showConstruction,
  onToggleConstruction,
  showFins,
  onToggleShowFins,
}: WingControlsProps) {
  const { system } = useUnits();
  const boardLocked = useControlsLocked();
  const wings = outline.wings ?? [];

  const setWing = (index: number, patch: Partial<Wing>) => {
    onChange({ wings: wings.map((w, i) => (i === index ? { ...w, ...patch } : w)) });
  };
  const removeWing = (index: number) => {
    onChange({ wings: wings.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold">Wings</div>
        <div className="mt-0.5 text-sm text-surf-ink-muted font-normal">
          Up to two, locked to the front fin or placed by hand
        </div>
      </div>

      {wings.map((wing, index) => {
        const n = index + 1;
        const lockedToFin = wing.lock !== null && frontFin !== null;
        const position = measureSlider(wing.station, wingPositionRangeIn(outline.length), WING_STEP_IN, WING_STEP_MM, system);
        const offset = measureSlider(wing.finOffset, WING_FIN_OFFSET_RANGE_IN, WING_STEP_IN, WING_STEP_MM, system);
        const depth = measureSlider(wing.depth, WING_DEPTH_RANGE_IN, WING_STEP_IN, WING_STEP_MM, system);
        const run = measureSlider(wing.run, WING_RUN_RANGE_IN, WING_STEP_IN, WING_STEP_MM, system);
        const radiusTop = wingRadiusTop(wing, system);
        const radius = measureSlider(
          mm(Math.min(wing.radius, radiusTop)),
          { min: 0, max: mmToInches(radiusTop) },
          WING_STEP_IN,
          WING_STEP_MM,
          system,
        );
        // P8: a stored radius never sits above its slider's top — a depth or run change pulls it in.
        const withShape = (patch: Pick<Wing, "depth"> | Pick<Wing, "run">) => {
          const next = { ...wing, ...patch };
          setWing(index, { ...patch, radius: mm(Math.min(wing.radius, wingRadiusTop(next, system))) });
        };
        return (
          <div key={index} className="flex flex-col gap-4" data-wing-controls={n}>
            <SectionHeading
              action={
                <button
                  type="button"
                  disabled={boardLocked}
                  onClick={() => removeWing(index)}
                  className="cursor-pointer text-xs font-sans font-normal normal-case tracking-normal text-surf-ink-muted underline underline-offset-2 hover:text-surf-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remove
                </button>
              }
            >
              Wing {n}
            </SectionHeading>

            <SliderRow
              label="Position from tail"
              displayValue={formatDim(wing.station, system)}
              value={position.value}
              min={position.min}
              max={position.max}
              step={position.step}
              disabled={lockedToFin}
              onValueChange={(v) => setWing(index, { station: position.toMm(v) })}
              leftHint={formatDim(inchesToMm(WING_POSITION_MIN_IN), system)}
              rightHint={`Centre ${formatDim(mm(outline.length / 2), system)}`}
              sliderLabel={`Wing ${n} position from tail`}
              sliderValueText={formatDim(wing.station, system)}
            />

            <div>
              <label className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
                <Checkbox
                  checked={lockedToFin}
                  disabled={boardLocked || frontFin === null}
                  // Ticking follows the trailing edge; unticking keeps the station the screen shows (P2).
                  onCheckedChange={(checked) =>
                    setWing(index, checked ? { lock: "front-trailing" } : { lock: null, station: wing.station })
                  }
                />
                Lock to front fin
                {frontFin === null && <span className="text-xs">(this fin setup has no front fin)</span>}
              </label>
            </div>

            {lockedToFin && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="mb-2 text-sm text-surf-ink-muted font-normal">Fin edge</div>
                  <TwoOptionToggle
                    options={["front-trailing", "front-leading"] as const}
                    labels={["Trailing", "Leading"] as const}
                    value={wing.lock === "front-leading" ? "front-leading" : "front-trailing"}
                    onChange={(lock) => setWing(index, { lock })}
                    ariaLabel={`Wing ${n} fin edge`}
                    disabled={boardLocked}
                    className="[&>button]:flex-1"
                  />
                </div>
                <SliderRow
                  className="flex-1"
                  label="Offset from the fin"
                  displayValue={formatSignedMark(wing.finOffset, system)}
                  value={offset.value}
                  min={offset.min}
                  max={offset.max}
                  step={offset.step}
                  onValueChange={(v) => setWing(index, { finOffset: offset.toMm(v) })}
                  leftHint="Toward tail"
                  rightHint="Toward nose"
                  sliderLabel={`Wing ${n} offset from the fin`}
                />
              </div>
            )}

            <div className="flex gap-4">
              <SliderRow
                className="flex-1"
                label="Depth"
                displayValue={formatMark(wing.depth, system)}
                value={depth.value}
                min={depth.min}
                max={depth.max}
                step={depth.step}
                onValueChange={(v) => withShape({ depth: depth.toMm(v) })}
                leftHint="Shallow"
                rightHint="Deep"
                sliderLabel={`Wing ${n} depth`}
              />
              <SliderRow
                className="flex-1"
                label="Run along the stringer"
                displayValue={formatMark(wing.run, system)}
                value={run.value}
                min={run.min}
                max={run.max}
                step={run.step}
                onValueChange={(v) => withShape({ run: run.toMm(v) })}
                leftHint="Square"
                rightHint={formatMark(inchesToMm(WING_RUN_RANGE_IN.max), system)}
                sliderLabel={`Wing ${n} run along the stringer`}
              />
            </div>

            <SliderRow
              label="Corner radius"
              displayValue={formatMark(effectiveWingRadius(wing), system)}
              value={radius.value}
              min={radius.min}
              max={radius.max}
              step={radius.step}
              onValueChange={(v) => setWing(index, { radius: radius.toMm(v) })}
              leftHint="Sharp"
              rightHint={`Round · ${formatMark(radiusTop, system)} fits`}
              sliderLabel={`Wing ${n} corner radius`}
            />
          </div>
        );
      })}

      {wings.length < MAX_WINGS && (
        <Button variant="outline" className="w-full" disabled={boardLocked} onClick={onAddWing}>
          {wings.length === 0 ? "+ Add a wing" : "+ Add wing 2"}
        </Button>
      )}

      <TemplateSettings
        // P16: on the WINGS tab the construction setting also shows each wing's grab points.
        constructionNote="(the wing's grab points too)"
        showConstruction={showConstruction}
        onToggleConstruction={onToggleConstruction}
        showFins={showFins}
        onToggleShowFins={onToggleShowFins}
      />

      <p className="text-xs text-surf-ink-muted font-normal" data-wing-fin-note>
        {frontFin
          ? `Front fins ${formatMark(frontFin.trailing, system)} off the tail at the trailing edge, from the FINS page. Edit fin placement on FINS, then come back here.`
          : "This fin setup has no front fins."}
      </p>
    </div>
  );
}
