"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/**
 * Reads a slider's committed value out of Base UI's `onValueChange` callback, which hands back
 * either a bare number or a one-element array depending on the slider's arity. Every one of the
 * five control sidebars (TEMPLATE, ROCKER, RAILS, FINS, VOLUME) used to declare an identical copy
 * of this function; it now lives here once.
 */
export function sliderValue(v: number | readonly number[]): number {
  return typeof v === "number" ? v : (v[0] ?? 0);
}

export interface SliderRowProps {
  /** The label line's text. */
  label: string;
  /**
   * When present, the label line renders as `label — displayValue`; when absent, the label
   * renders alone. Three of the five sidebars already fold the value straight into `label`, and
   * forcing them to split it here would change the wording a shaper reads.
   */
  displayValue?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /**
   * Called with the value already read out of the Base UI callback via `sliderValue`. This prop
   * is the whole point of the extraction: each slider's own conversion — inches to millimetres, a
   * branded degrees value, a plain percentage — stays visible at its call site, where a reader
   * can see it and where a future units hook plugs in, rather than being hidden behind one
   * generic numeric callback in here.
   */
  onValueChange: (value: number) => void;
  /** Dims the whole row and disables the slider underneath it. */
  disabled?: boolean;
  /** The two-ended hint line under the track. Rendered only when at least one is present. */
  leftHint?: string;
  rightHint?: string;
  /** The warning-coloured line under the hints. */
  note?: string;
  /** For the flex sizing the paired two-per-line layouts need; composed with the disabled
   * dimming through `cn` rather than overriding it. */
  className?: string;
  /**
   * The label's bottom margin. `"default"` matches the four sidebars that use the wider gap;
   * `"tight"` preserves the FINS sidebar's slightly closer spacing. This exists so the migration
   * changes nothing visually — the two must never be normalised to one value.
   */
  density?: "default" | "tight";
}

export function SliderRow({
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
  className,
  density = "default",
}: SliderRowProps) {
  return (
    <div className={cn(className, disabled && "opacity-40")}>
      <div
        className={cn(
          "text-sm text-surf-ink-muted font-normal",
          density === "tight" ? "mb-1.5" : "mb-2",
        )}
      >
        {displayValue !== undefined ? `${label} — ${displayValue}` : label}
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(v) => onValueChange(sliderValue(v))}
        className="slider-accent"
      />
      {(leftHint || rightHint) && (
        <div className="mt-0.5 flex justify-between text-xs text-surf-ink-muted font-normal">
          <span>{leftHint}</span>
          <span>{rightHint}</span>
        </div>
      )}
      {note && <div className="mt-0.5 text-[10px] text-surf-warning-ink">{note}</div>}
    </div>
  );
}
