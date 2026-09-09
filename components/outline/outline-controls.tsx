"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  BOARD_LENGTH_RANGE_IN,
  TAIL_PRESETS,
  WIDEPOINT_WIDTH_RANGE_IN,
  type OutlineSpec,
  type TailShape,
} from "@/lib/geometry/board";
import type { OutlineGeometry } from "@/lib/geometry/outline";
import {
  degrees,
  inchesToMm,
  mm,
  type Mm,
  mmToInches,
} from "@/lib/geometry/units";
import {
  formatDim,
  formatLength,
  formatMark,
  formatSignedDim,
  measureSlider,
  typedFieldBounds,
} from "@/lib/geometry/measure-display";
import { SliderRow, sliderValue } from "@/components/design/slider-row";
import { MeasureField } from "@/components/design/measure-field";
import { FineAdjustDisclosure } from "@/components/design/fine-adjust-group";
import { useUnits } from "@/components/units-provider";
import { TailShapeIcon, type IconTailShape } from "./tail-shape-icon";

/** D-03: the four folded rows' own complete literal class strings — Tailwind cannot see an
 * interpolated class name, so each row below carries its own full string rather than one built
 * by concatenation. The order number places the row in the reading order the closed group opens
 * back into (Width and Offset first, Tail Angle and Fullness last); the hidden rule folds it away
 * while that group is closed, reading `data-fine-adjust` off the `group`-marked column below. No
 * row is ever rendered a second time — only its own existing `<div className="flex gap-4">`
 * wrapper gains these two phone-only rules. */
const FINE_ADJUST_WIDEPOINT_CLASS =
  "flex gap-4 max-shell:order-51 max-shell:group-data-[fine-adjust=closed]:hidden";
const FINE_ADJUST_RAIL_LENGTHS_CLASS =
  "flex gap-4 max-shell:order-52 max-shell:group-data-[fine-adjust=closed]:hidden";
const FINE_ADJUST_NOSE_TIP_CLASS =
  "flex gap-4 max-shell:order-53 max-shell:group-data-[fine-adjust=closed]:hidden";
const FINE_ADJUST_TAIL_TIP_CLASS =
  "flex gap-4 max-shell:order-54 max-shell:group-data-[fine-adjust=closed]:hidden";

const TAIL_SHAPES: IconTailShape[] = ["pin", "round", "diamond", "squash", "swallow"];

interface OutlineControlsProps {
  outline: OutlineSpec;
  geometry: OutlineGeometry;
  onChange: (patch: Partial<OutlineSpec>) => void;
  showConstruction: boolean;
  onToggleConstruction: () => void;
}

function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Reads the tail shape's end width uniformly — pin/round carry no endWidth field, so they read as zero. */
function tailEndWidthIn(tail: TailShape): number {
  switch (tail.kind) {
    case "pin":
    case "round":
      return 0;
    default:
      return mmToInches(tail.endWidth);
  }
}

function withEndWidth(tail: TailShape, endWidth: Mm): TailShape {
  switch (tail.kind) {
    case "pin":
    case "round":
      return tail;
    case "squash":
      return { ...tail, endWidth };
    case "diamond":
      return { ...tail, endWidth };
    case "swallow":
      return { ...tail, endWidth };
  }
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1.5 border-b border-surf-line-faint pb-2 text-xs font-display text-surf-ink uppercase tracking-architectural font-extrabold">
      {children}
    </div>
  );
}

export function OutlineControls({
  outline,
  geometry,
  onChange,
  showConstruction,
  onToggleConstruction,
}: OutlineControlsProps) {
  const { system } = useUnits();
  // D-03: screen-only state, like `showConstruction`/`orientation` elsewhere in this phase — never
  // saved, never in the design snapshot, resets to closed on every navigation to the screen.
  const [fineAdjustOpen, setFineAdjustOpen] = useState(false);
  const lengthIn = mmToInches(outline.length);
  const lengthFeet = Math.floor(lengthIn / 12);
  const lengthInches = Math.round(lengthIn - lengthFeet * 12);

  const setLengthIn = (totalIn: number) => {
    onChange({
      length: inchesToMm(
        clampFinite(totalIn, BOARD_LENGTH_RANGE_IN.min, BOARD_LENGTH_RANGE_IN.max),
      ),
    });
  };

  const tailBlockPinned = geometry.tailBlockPinned;
  const isDiamond = outline.tail.kind === "diamond";
  const isSwallow = outline.tail.kind === "swallow";

  const diamondDepthClamped =
    isDiamond &&
    outline.tail.kind === "diamond" &&
    mmToInches(geometry.effectiveDiamondDepth) < mmToInches(outline.tail.depth) - 1e-6;

  return (
    // `group` + `data-fine-adjust` (D-03) let the four folded rows below read their shown/hidden
    // state off this one column, purely through CSS — no row is ever rendered a second time.
    <div className="group flex flex-col gap-5" data-fine-adjust={fineAdjustOpen ? "open" : "closed"}>
      <div>
        <div className="text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold">Template Builder</div>
        <div className="mt-0.5 text-sm text-surf-ink-muted font-normal">
          Design and print full sized surfboard templates
        </div>
      </div>

      <SectionHeading>Board Length</SectionHeading>
      {/* Board Length keeps its own hand-rolled markup: a label row, then either the feet/inches
          Select combo (Imperial) or one typed centimetre field (Metric, D-08), then the slider —
          a shape SliderRow's fixed label-then-track layout has no slot for either way. Named in
          slider-row.test.ts's allowlist alongside its FINS and VOLUME counterparts, which share
          this exact shape. */}
      {(() => {
        const boardLength = measureSlider(outline.length, BOARD_LENGTH_RANGE_IN, 1, 10, system);
        // The typed field's own bounds are in ITS domain (centimetres in Metric, D-08) — never
        // the slider's raw millimetre bounds. See typedFieldBounds's doc comment / CR-01.
        const boardLengthFieldBounds = typedFieldBounds(boardLength, "length", system);
        return (
          <div>
            <div className="mb-2 text-sm text-surf-ink-muted font-normal">
              Board Length — {formatLength(outline.length, system)}
            </div>
            <div className="mb-2 flex gap-2">
              {system === "imperial" ? (
                <>
                  <Select
                    value={lengthFeet}
                    onValueChange={(v) => setLengthIn((v as number) * 12 + lengthInches)}
                  >
                    <SelectTrigger className="flex-1 border-outline-sidebar-input-border bg-outline-sidebar-input-bg text-outline-sidebar-text">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 6, 7, 8, 9, 10].map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}&apos;
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={lengthInches}
                    onValueChange={(v) => setLengthIn(lengthFeet * 12 + (v as number))}
                  >
                    <SelectTrigger className="flex-1 border-outline-sidebar-input-border bg-outline-sidebar-input-bg text-outline-sidebar-text">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i).map((i) => (
                        <SelectItem key={i} value={i}>
                          {i}&quot;
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <MeasureField
                  value={outline.length}
                  onCommit={(next) => onChange({ length: next })}
                  label="Board Length"
                  family="length"
                  min={boardLengthFieldBounds.min}
                  max={boardLengthFieldBounds.max}
                  system={system}
                />
              )}
            </div>
            <Slider
              value={boardLength.value}
              min={boardLength.min}
              max={boardLength.max}
              step={boardLength.step}
              onValueChange={(v) => onChange({ length: boardLength.toMm(sliderValue(v)) })}
              className="slider-accent"
            />
          </div>
        );
      })()}

      <SectionHeading>Nose Controls</SectionHeading>
      <div className={FINE_ADJUST_NOSE_TIP_CLASS}>
        <SliderRow
          className="flex-1"
          label="Nose Angle"
          displayValue={`${outline.noseAngle}°`}
          value={outline.noseAngle}
          min={35}
          max={90}
          step={1}
          onValueChange={(v) => onChange({ noseAngle: degrees(clampFinite(v, 35, 90)) })}
          leftHint="Pointy"
          rightHint="Round"
        />
        <SliderRow
          className="flex-1"
          label="Fullness"
          displayValue={`${outline.noseFullness}%`}
          value={outline.noseFullness}
          min={0}
          max={100}
          step={0.25}
          onValueChange={(v) => onChange({ noseFullness: clampFinite(v, 0, 100) })}
          leftHint="Thin"
          rightHint="Full"
        />
      </div>

      <SectionHeading>Widepoint Controls</SectionHeading>
      <div className={FINE_ADJUST_WIDEPOINT_CLASS}>
        {(() => {
          const width = measureSlider(
            outline.widePointWidth,
            WIDEPOINT_WIDTH_RANGE_IN,
            0.125,
            1,
            system,
          );
          return (
            <SliderRow
              className="flex-1"
              label="Width"
              displayValue={formatDim(outline.widePointWidth, system)}
              value={width.value}
              min={width.min}
              max={width.max}
              step={width.step}
              onValueChange={(v) => onChange({ widePointWidth: width.toMm(v) })}
            />
          );
        })()}
        {(() => {
          const offset = measureSlider(outline.widePointOffset, { min: -12, max: 12 }, 0.25, 1, system);
          return (
            <SliderRow
              className="flex-1"
              label="Offset"
              displayValue={formatSignedDim(outline.widePointOffset, system)}
              value={offset.value}
              min={offset.min}
              max={offset.max}
              step={offset.step}
              onValueChange={(v) => onChange({ widePointOffset: offset.toMm(v) })}
              leftHint="Tail"
              rightHint="Nose"
            />
          );
        })()}
      </div>
      <div className={FINE_ADJUST_RAIL_LENGTHS_CLASS}>
        <SliderRow
          className="flex-1"
          label="Tail Rail"
          displayValue={`${outline.tailRailLength}%`}
          value={outline.tailRailLength}
          min={0}
          max={100}
          step={0.25}
          onValueChange={(v) => onChange({ tailRailLength: clampFinite(v, 0, 100) })}
          leftHint="Short"
          rightHint="Long"
        />
        <SliderRow
          className="flex-1"
          label="Nose Rail"
          displayValue={`${outline.noseRailLength}%`}
          value={outline.noseRailLength}
          min={0}
          max={100}
          step={0.25}
          onValueChange={(v) => onChange({ noseRailLength: clampFinite(v, 0, 100) })}
          leftHint="Short"
          rightHint="Long"
        />
      </div>

      <SectionHeading>Tail Controls</SectionHeading>
      {/* 09-REVIEW.md WR-02: a hand-rolled <button>, not the shared Button component, so it never
          got Button's own coarse:h-11 for free -- `coarse:min-h-11` mirrors that same
          pointer-keyed rule by hand (a finger needs 44px; a mouse at any width still gets the
          smaller resting height). */}
      <div className="mt-2 mb-6 grid grid-cols-5 gap-2.5">
        {TAIL_SHAPES.map((shape) => {
          const active = outline.tail.kind === shape;
          const preset = TAIL_PRESETS[shape];
          return (
            <button
              key={shape}
              type="button"
              onClick={() =>
                onChange({
                  tail: preset.tail,
                  tailAngle: preset.tailAngle,
                  tailFullness: preset.tailFullness,
                })
              }
              className="focus-ring-accent flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-0.5 py-1.5 coarse:min-h-11"
              style={{
                // Inline styles were invisible to both earlier passes: the border migration
                // grepped for `border-surf-muted/N` classes, and the color-mix sweep only
                // looked in globals.css. So this kept an ad-hoc 30% mix long after every other
                // border moved to the line token — and an accent-on-accent edge, which is no
                // edge at all. It now matches the equivalent pills in fin-controls.tsx.
                borderColor: active
                  ? "var(--color-surf-on-accent)"
                  : "var(--color-surf-line)",
                background: active ? "var(--color-surf-accent)" : "var(--color-surf-sidebar)",
                // Two different surfaces, so two different foregrounds. This was one shared value
                // back when ink and on-accent were both #111111; under theming the active chip is
                // ink-on-cyan at 1.4:1 unless it takes the fill's own paired colour.
                color: active ? "var(--color-surf-on-accent)" : "var(--color-surf-ink)",
              }}
            >
              <TailShapeIcon shape={shape} active={active} />
              <span className="text-[9px] font-bold capitalize">{shape}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-4">
        {(() => {
          const tailBlockMm = tailBlockPinned ? mm(0) : inchesToMm(tailEndWidthIn(outline.tail));
          const tailBlock = measureSlider(tailBlockMm, { min: 0, max: 16 }, 0.125, 1, system);
          return (
            <SliderRow
              className="flex-1"
              label="Tail Block"
              displayValue={formatDim(tailBlockMm, system)}
              value={tailBlock.value}
              min={tailBlock.min}
              max={tailBlock.max}
              step={tailBlock.step}
              disabled={tailBlockPinned}
              onValueChange={(v) => onChange({ tail: withEndWidth(outline.tail, tailBlock.toMm(v)) })}
            />
          );
        })()}
        {(() => {
          const depthRangeIn = { min: isDiamond ? 1 : 1, max: isDiamond ? 5 : 8 };
          const depthCurrentMm =
            isDiamond && outline.tail.kind === "diamond"
              ? outline.tail.depth
              : isSwallow && outline.tail.kind === "swallow"
                ? outline.tail.crotchDepth
                : inchesToMm(1);
          const depth = measureSlider(depthCurrentMm, depthRangeIn, 0.0625, 1, system);
          return (
            <SliderRow
              className="flex-1"
              label="Depth"
              displayValue={
                isDiamond
                  ? formatMark(geometry.effectiveDiamondDepth, system)
                  : isSwallow && outline.tail.kind === "swallow"
                    ? formatMark(outline.tail.crotchDepth, system)
                    : "—"
              }
              value={depth.value}
              min={depth.min}
              max={depth.max}
              step={depth.step}
              disabled={!isDiamond && !isSwallow}
              onValueChange={(v) => {
                if (isDiamond && outline.tail.kind === "diamond") {
                  onChange({ tail: { ...outline.tail, depth: depth.toMm(v) } });
                } else if (isSwallow && outline.tail.kind === "swallow") {
                  onChange({ tail: { ...outline.tail, crotchDepth: depth.toMm(v) } });
                }
              }}
              note={diamondDepthClamped ? 'Clamped to 2" less than Tail Block' : undefined}
            />
          );
        })()}
      </div>

      <div className={FINE_ADJUST_TAIL_TIP_CLASS}>
        <SliderRow
          className="flex-1"
          label="Tail Angle"
          displayValue={`${outline.tailAngle}°`}
          value={outline.tailAngle}
          min={30}
          max={90}
          step={1}
          disabled={isDiamond}
          onValueChange={(v) => onChange({ tailAngle: degrees(clampFinite(v, 30, 90)) })}
          leftHint="Pointy"
          rightHint="Round"
        />
        <SliderRow
          className="flex-1"
          label="Fullness"
          displayValue={`${outline.tailFullness}%`}
          value={outline.tailFullness}
          min={0}
          max={100}
          step={0.25}
          onValueChange={(v) => onChange({ tailFullness: clampFinite(v, 0, 100) })}
          leftHint="Thin"
          rightHint="Full"
        />
      </div>

      <div className="mt-auto border-t border-outline-sidebar-divider pt-3">
        <div className="mb-2 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold">
          Settings
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
          <Checkbox checked={showConstruction} onCheckedChange={() => onToggleConstruction()} />
          View Construction Lines
        </label>
      </div>

      {/* D-03: last item in the controls scroller on a phone, below every other control — every
          other child above keeps its implicit CSS order of 0, so this header and the four rows
          it reveals land last purely through `order`, with no `max-shell:` rule reaching a
          desktop screen at all. */}
      <FineAdjustDisclosure
        open={fineAdjustOpen}
        onToggle={() => setFineAdjustOpen((v) => !v)}
        className="max-shell:order-50"
      />
    </div>
  );
}
