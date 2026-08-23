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
import { TAIL_PRESETS, type OutlineSpec, type TailShape } from "@/lib/geometry/board";
import type { OutlineGeometry } from "@/lib/geometry/outline";
import {
  degrees,
  formatFeetInches,
  formatInchesFraction,
  inchesToMm,
  mm,
  mmToInches,
} from "@/lib/geometry/units";
import { TailShapeIcon, type IconTailShape } from "./tail-shape-icon";

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

function sliderValue(v: number | readonly number[]): number {
  return typeof v === "number" ? v : (v[0] ?? 0);
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

function withEndWidth(tail: TailShape, endWidthIn: number): TailShape {
  const endWidth = inchesToMm(endWidthIn);
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
    <div className="mt-1.5 border-b border-surf-muted/20 pb-2 text-xs font-display text-surf-black uppercase tracking-architectural font-extrabold">
      {children}
    </div>
  );
}

function SliderRow({
  label,
  displayValue,
  value,
  min,
  max,
  step,
  onValueChange,
  disabled,
  leftHint,
  rightHint,
  note,
}: {
  label: string;
  displayValue: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
  leftHint?: string;
  rightHint?: string;
  note?: string;
}) {
  return (
    <div className={disabled ? "flex-1 opacity-40" : "flex-1"}>
      <div className="mb-2 text-sm text-surf-muted font-normal">
        {label} — {displayValue}
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(v) => onValueChange(sliderValue(v))}
        className="[&_[data-slot=slider-range]]:bg-surf-accent-cyan [&_[data-slot=slider-thumb]]:border-surf-accent-cyan [&_[data-slot=slider-thumb]]:bg-surf-accent-cyan"
      />
      {(leftHint || rightHint) && (
        <div className="mt-0.5 flex justify-between text-xs text-surf-muted font-normal">
          <span>{leftHint}</span>
          <span>{rightHint}</span>
        </div>
      )}
      {note && <div className="mt-0.5 text-[10px] text-surf-accent-orange-ink">{note}</div>}
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
  const lengthIn = mmToInches(outline.length);
  const lengthFeet = Math.floor(lengthIn / 12);
  const lengthInches = Math.round(lengthIn - lengthFeet * 12);

  const setLengthIn = (totalIn: number) => {
    onChange({ length: inchesToMm(clampFinite(totalIn, 60, 120)) });
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
        <div className="text-lg leading-tight font-display text-surf-black uppercase tracking-architectural font-extrabold">Template Builder</div>
        <div className="mt-0.5 text-sm text-surf-muted font-normal">
          Design and print full sized surfboard templates
        </div>
      </div>

      <SectionHeading>Board Length</SectionHeading>
      <div>
        <div className="mb-2 text-sm text-surf-muted font-normal">
          Board Length — {formatFeetInches(outline.length)}
        </div>
        <div className="mb-2 flex gap-2">
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
        </div>
        <Slider
          value={lengthIn}
          min={60}
          max={120}
          step={1}
          onValueChange={(v) => setLengthIn(sliderValue(v))}
          className="[&_[data-slot=slider-range]]:bg-surf-accent-cyan [&_[data-slot=slider-thumb]]:border-surf-accent-cyan [&_[data-slot=slider-thumb]]:bg-surf-accent-cyan"
        />
      </div>

      <SectionHeading>Nose Controls</SectionHeading>
      <div className="flex gap-4">
        <SliderRow
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
        <SliderRow
          label="Width"
          displayValue={formatInchesFraction(outline.widePointWidth)}
          value={mmToInches(outline.widePointWidth)}
          min={16}
          max={25}
          step={0.125}
          onValueChange={(v) =>
            onChange({ widePointWidth: inchesToMm(clampFinite(v, 16, 25)) })
          }
        />
        <SliderRow
          label="Offset"
          displayValue={
            outline.widePointOffset === mm(0)
              ? formatInchesFraction(outline.widePointOffset)
              : mmToInches(outline.widePointOffset) > 0
                ? `+${formatInchesFraction(outline.widePointOffset)}`
                : `-${formatInchesFraction(mm(-outline.widePointOffset))}`
          }
          value={mmToInches(outline.widePointOffset)}
          min={-12}
          max={12}
          step={0.25}
          onValueChange={(v) =>
            onChange({ widePointOffset: inchesToMm(clampFinite(v, -12, 12)) })
          }
          leftHint="Tail"
          rightHint="Nose"
        />
      </div>
      <div className="flex gap-4">
        <SliderRow
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
              className="flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-0.5 py-1.5"
              style={{
                borderColor: active
                  ? "var(--color-surf-accent-cyan)"
                  : "color-mix(in srgb, var(--color-surf-muted) 30%, transparent)",
                background: active ? "var(--color-surf-accent-cyan)" : "var(--color-surf-base)",
                // Black on cyan is 12.28:1; the same black off-state keeps the label legible
                // on white, so the fill alone carries the selected state.
                color: "var(--color-surf-black)",
              }}
            >
              <TailShapeIcon shape={shape} active={active} />
              <span className="text-[9px] font-bold capitalize">{shape}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-4">
        <SliderRow
          label="Tail Block"
          displayValue={formatInchesFraction(
            tailBlockPinned ? mm(0) : inchesToMm(tailEndWidthIn(outline.tail)),
          )}
          value={tailBlockPinned ? 0 : tailEndWidthIn(outline.tail)}
          min={0}
          max={16}
          step={0.125}
          disabled={tailBlockPinned}
          onValueChange={(v) => onChange({ tail: withEndWidth(outline.tail, clampFinite(v, 0, 16)) })}
        />
        <SliderRow
          label="Depth"
          displayValue={
            isDiamond
              ? formatInchesFraction(geometry.effectiveDiamondDepth)
              : isSwallow && outline.tail.kind === "swallow"
                ? formatInchesFraction(outline.tail.crotchDepth)
                : "—"
          }
          value={
            isDiamond && outline.tail.kind === "diamond"
              ? mmToInches(outline.tail.depth)
              : isSwallow && outline.tail.kind === "swallow"
                ? mmToInches(outline.tail.crotchDepth)
                : 1
          }
          min={isDiamond ? 1 : 1}
          max={isDiamond ? 5 : 8}
          step={0.0625}
          disabled={!isDiamond && !isSwallow}
          onValueChange={(v) => {
            if (isDiamond && outline.tail.kind === "diamond") {
              onChange({ tail: { ...outline.tail, depth: inchesToMm(clampFinite(v, 1, 5)) } });
            } else if (isSwallow && outline.tail.kind === "swallow") {
              onChange({
                tail: { ...outline.tail, crotchDepth: inchesToMm(clampFinite(v, 1, 8)) },
              });
            }
          }}
          note={diamondDepthClamped ? 'Clamped to 2" less than Tail Block' : undefined}
        />
      </div>

      <div className="flex gap-4">
        <SliderRow
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
        <div className="mb-2 text-[10px] font-display text-surf-black uppercase tracking-architectural font-extrabold">
          Settings
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-surf-muted font-normal">
          <Checkbox checked={showConstruction} onCheckedChange={() => onToggleConstruction()} />
          View Construction Lines
        </label>
      </div>
    </div>
  );
}
