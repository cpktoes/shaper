"use client";

/**
 * The one typed measurement box in the app that speaks both systems (D-08, D-12).
 *
 * Earlier phases would have built this as a sibling pair — an `ImperialField` and a metric
 * counterpart — but Phase 5 already made the chosen units system the primary noun a design-screen
 * component reads (`useUnits()`), so a field taking a `system` argument has no "default" system
 * left to special-case one branch over the other. One component with an imperial branch and a
 * metric branch keeps that symmetry: the imperial branch below is `ImperialField`'s behaviour,
 * unchanged, and the metric branch is its exact structural counterpart.
 *
 * Both branches delegate entirely to `commitTypedMeasure`
 * (`@/lib/geometry/measure-display`) for parse, clamp, snap and error copy — this component holds
 * only the focus/blur/raw-string plumbing `ImperialField` already established (aria wiring, class
 * strings, the Enter-commits/blur-commits/revert-on-unreadable contract). It performs no parse, no
 * clamp, no snap and no conversion of its own, and declares no error copy of its own.
 *
 * `system` is read from props, not `useUnits()` — the caller already knows the system (it needed
 * it to compute this field's `min`/`max` from its own `measureSlider` result), and passing it down
 * keeps this field usable inside a table cell that threads `system` from further up, without a
 * second, independent read of the units context.
 *
 * `ImperialField` (`components/rocker/imperial-field.tsx`) is retired in Plan 03, once the ROCKER
 * datasheet's typed cells move over to this component.
 */

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  commitTypedMeasure,
  formatDim,
  formatDimBare,
  formatLength,
  formatMark,
  formatMarkBare,
  type MeasureFamily,
} from "@/lib/geometry/measure-display";
import type { Mm, UnitsSystem } from "@/lib/geometry/units";

export interface MeasureFieldProps {
  value: Mm;
  onCommit: (next: Mm) => void;
  /** The field's accessible name — read via `aria-label`, exactly as `ImperialField`'s is. */
  label: string;
  family: MeasureFamily | "length";
  /** Display-domain bounds (inches imperial; the field's own cm/mm unit in Metric) — taken from
   * the caller's own `measureSlider` result so the field and its slider can never disagree. */
  min: number;
  max: number;
  system: UnitsSystem;
  /** Bare mode (no unit suffix) for D-12's in-table cells; standalone (the default) suffixes the
   * value with its own unit. */
  bare?: boolean;
  /** Passed straight to the underlying `Input`, matching the Select/Slider `disabled` prop a
   * caller's Imperial branch already sets when a value is driven from elsewhere (e.g. the VOLUME
   * screen's "Measure This Board's Real Shape" import toggle) — a typed value under a value the
   * shaper can't otherwise touch would be a correctness gap, not a cosmetic one. */
  disabled?: boolean;
}

/** The blurred display for the current stored value — the same string `commitTypedMeasure` would
 * hand back on a successful commit, computed once here so focus/blur both read from one place. */
function displayFor(
  value: Mm,
  family: MeasureFamily | "length",
  system: UnitsSystem,
  bare: boolean,
): string {
  if (family === "length") return formatLength(value, system);
  if (family === "dim") return bare ? formatDimBare(value, system) : formatDim(value, system);
  return bare ? formatMarkBare(value, system) : formatMark(value, system);
}

export function MeasureField({
  value,
  onCommit,
  label,
  family,
  min,
  max,
  system,
  bare = false,
  disabled = false,
}: MeasureFieldProps) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(() => displayFor(value, family, system, bare));
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  function commit(typed: string) {
    const result = commitTypedMeasure({ typed, current: value, family, min, max, system, bare });
    setError(result.error);
    setRaw(result.display);
    if (result.error === null) onCommit(result.value);
  }

  return (
    <div className="inline-flex flex-col items-end">
      <Input
        type="text"
        inputMode="text"
        disabled={disabled}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={focused ? raw : displayFor(value, family, system, bare)}
        onFocus={() => {
          setFocused(true);
          setError(null);
          setRaw(displayFor(value, family, system, bare));
        }}
        onChange={(event) => setRaw(event.target.value)}
        onBlur={() => {
          commit(raw);
          setFocused(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(raw);
          }
        }}
        // Same ~64px fixed width as ImperialField, sized for the longest formattable value
        // (metric's longest is "365.0 cm" at 8 characters, still shorter than ImperialField's own
        // "23 15/16\"" at 9) — right-aligned numeric text, matching every measurement column.
        className="h-7 w-16 min-w-16 max-w-16 rounded-md border border-surf-line bg-surf-ground px-1.5 text-right text-sm text-surf-ink"
      />
      {error && (
        <div id={errorId} className="mt-0.5 w-24 text-right text-[10px] text-surf-warning-ink">
          {error}
        </div>
      )}
    </div>
  );
}
