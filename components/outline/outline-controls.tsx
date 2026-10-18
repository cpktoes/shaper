"use client";

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
  wholeFeetAndInches,
} from "@/lib/geometry/units";
import {
  diamondDepthClampNote,
  formatDim,
  formatLength,
  formatMark,
  formatSignedDim,
  measureSlider,
  typedFieldBounds,
} from "@/lib/geometry/measure-display";
import { SliderRow, sliderValue } from "@/components/design/slider-row";
import { MeasureField } from "@/components/design/measure-field";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { useUnits } from "@/components/units-provider";
import { TailShapeIcon, type IconTailShape } from "./tail-shape-icon";

const TAIL_SHAPES: IconTailShape[] = ["pin", "round", "diamond", "squash", "swallow"];

interface OutlineControlsProps {
  outline: OutlineSpec;
  geometry: OutlineGeometry;
  onChange: (patch: Partial<OutlineSpec>) => void;
  showConstruction: boolean;
  onToggleConstruction: () => void;
  showFins: boolean;
  onToggleShowFins: () => void;
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

/**
 * A sidebar section's ruled heading. Exported (quick 261014-wii, P10) so the WINGS sidebar wears
 * the Template Builder's own headings; `action` draws a control at the right end of the ruled line
 * (a wing's "Remove"). Without it the markup is exactly what it always was.
 */
export function SectionHeading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  if (action) {
    return (
      <div className="mt-1.5 flex items-baseline justify-between border-b border-surf-line-faint pb-2 text-xs font-display text-surf-ink uppercase tracking-architectural font-extrabold">
        <span>{children}</span>
        {action}
      </div>
    );
  }
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
  showFins,
  onToggleShowFins,
}: OutlineControlsProps) {
  const { system } = useUnits();
  const locked = useControlsLocked();
  // Rounded to whole inches before the split, so an 8'0" board never reads 7'12" (wholeFeetAndInches).
  const { feet: lengthFeet, inches: lengthInches } = wholeFeetAndInches(outline.length);

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
    <div className="flex flex-col gap-5">
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
          // A locked board greys the whole row (label, pickers, slider), the way every SliderRow does.
          <div className={locked ? "opacity-40" : undefined}>
            <div className="mb-2 text-sm text-surf-ink-muted font-normal">
              Board Length — {formatLength(outline.length, system)}
            </div>
            <div className="mb-2 flex gap-2">
              {system === "imperial" ? (
                <>
                  <Select
                    value={lengthFeet}
                    disabled={locked}
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
                    disabled={locked}
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
              disabled={locked}
              onValueChange={(v) => onChange({ length: boardLength.toMm(sliderValue(v)) })}
              className="slider-accent"
            />
          </div>
        );
      })()}

      <SectionHeading>Nose Controls</SectionHeading>
      <div className="flex gap-4">
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
      <div className="flex gap-4">
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
      <div className="flex gap-4">
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
              disabled={locked}
              onClick={() =>
                onChange({
                  tail: preset.tail,
                  tailAngle: preset.tailAngle,
                  tailFullness: preset.tailFullness,
                })
              }
              className="focus-ring-accent flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-0.5 py-1.5 coarse:min-h-11 disabled:cursor-default disabled:opacity-40"
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
              note={diamondDepthClamped ? diamondDepthClampNote(system) : undefined}
            />
          );
        })()}
      </div>

      <div className="flex gap-4">
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

      <TemplateSettings
        showConstruction={showConstruction}
        onToggleConstruction={onToggleConstruction}
        showFins={showFins}
        onToggleShowFins={onToggleShowFins}
      />
    </div>
  );
}

export interface TemplateSettingsProps {
  /** A short note after "View Construction Lines" — the WINGS sidebar's "(the wing's grab points
   * too)" (quick 261014-wii, P16); the Template Builder passes none. */
  constructionNote?: string;
  showConstruction: boolean;
  onToggleConstruction: () => void;
  showFins: boolean;
  onToggleShowFins: () => void;
}

/**
 * TEMPLATE's Settings block, shared by the Template Builder and the WINGS sidebar (quick 261014-wii,
 * P10) so the two never drift: View Construction Lines, and Show fins (D4) — the fins where FINS
 * puts them, marks only, no dims. Both are screen settings, never saved, and both stay usable on a
 * locked board (`data-lock-exempt`), since neither changes the board.
 */
export function TemplateSettings({
  constructionNote,
  showConstruction,
  onToggleConstruction,
  showFins,
  onToggleShowFins,
}: TemplateSettingsProps) {
  return (
    <div className="mt-auto border-t border-outline-sidebar-divider pt-3">
      <div className="mb-2 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold">
        Settings
      </div>
      <label className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
        <Checkbox data-lock-exempt checked={showConstruction} onCheckedChange={() => onToggleConstruction()} />
        View Construction Lines
        {constructionNote && <span className="text-xs">{constructionNote}</span>}
      </label>
      <label className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
        <Checkbox data-lock-exempt checked={showFins} onCheckedChange={() => onToggleShowFins()} />
        Show fins <span className="text-xs">(marks only, no dims)</span>
      </label>
    </div>
  );
}
