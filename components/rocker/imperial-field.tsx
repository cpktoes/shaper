"use client";

/**
 * A typed imperial-fraction entry field — the app's first typed numeric control wired directly to
 * geometry state (D-06). Built once here rather than inlined nine times across the datasheet
 * table (Task 2's `RockerDatasheet`).
 *
 * Behaviour, per the UI spec's Component Notes and Copywriting Contract:
 * - Not focused: renders `formatInchesFraction(value)`.
 * - On focus: swaps to a raw editable string seeded from that same formatted text.
 * - On blur or Enter: runs `parseImperial` on the raw string. On success, clamps into `min`/`max`
 *   (inches), snaps with `roundToSixteenthInch`, calls `onCommit`, and reformats. On failure,
 *   shows the fixed error line and reverts to `formatInchesFraction(value)` — the field is never
 *   left blank and never holds an invalid value.
 * - Every value crossing between the typed string and the stored Mm goes through
 *   `lib/geometry/units.ts` — this component never restates the inch conversion factor.
 *
 * T-04-04 (threat register): the typed string never becomes state directly — `parseImperial`
 * returns null on anything unreadable, and every accepted value is clamped/snapped before it ever
 * reaches `onCommit`.
 */

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  formatInchesFraction,
  inchesToMm,
  type Mm,
  mmToInches,
  parseImperial,
  roundToSixteenthInch,
} from "@/lib/geometry/units";

interface ImperialFieldProps {
  value: Mm;
  onCommit: (next: Mm) => void;
  /** The field's accessible name — read via `aria-label`, since the datasheet's own column/row
   * headings live outside this component (it has no visible label of its own). */
  label: string;
  /** Inch-domain bounds, matching whichever range constant the caller's field belongs to
   * (`ROCKER_LIFT_RANGE_IN` or `FOIL_THICKNESS_RANGE_IN`) — never restated here. */
  min?: number;
  max?: number;
}

export function ImperialField({ value, onCommit, label, min, max }: ImperialFieldProps) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(() => formatInchesFraction(value));
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  function commit(typed: string) {
    const parsedMm = parseImperial(typed);
    if (parsedMm === null) {
      // The exact wording from the UI spec's Copywriting Contract Error-state row — names the
      // text the shaper typed and suggests a number, a fraction, or feet-and-inches.
      setError(
        `Couldn't read '${typed}' as inches — try a number, a fraction like 2 5/8, or feet and inches like 6'2.`,
      );
      setRaw(formatInchesFraction(value));
      return;
    }
    let inches = mmToInches(parsedMm);
    if (min !== undefined) inches = Math.max(min, inches);
    if (max !== undefined) inches = Math.min(max, inches);
    const snapped = roundToSixteenthInch(inchesToMm(inches));
    setError(null);
    setRaw(formatInchesFraction(snapped));
    onCommit(snapped);
  }

  return (
    <div className="inline-flex flex-col items-end">
      <Input
        type="text"
        inputMode="text"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={focused ? raw : formatInchesFraction(value)}
        onFocus={() => {
          setFocused(true);
          setError(null);
          setRaw(formatInchesFraction(value));
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
        // ~64px fixed width, sized for the longest formattable value ("23 15/16\""), so nothing
        // dynamic can outgrow it — right-aligned numeric text, matching every other measurement
        // column in this app.
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
