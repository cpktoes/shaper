"use client";

/**
 * A two-option segmented control, extracted from `components/fins/fin-controls.tsx`'s private
 * `PillButton` (UI-SPEC "Flat/Domed toggle (D-18)"). The three class strings that make up its look
 * are copied byte-for-byte from `PillButton` — no new styling, no new spacing value, no third
 * variant. `fin-controls.tsx` keeps its own `PillButton` unchanged; the UI-SPEC calls for
 * extraction, not migrating every existing call site in that phase.
 *
 * Phase 12 (12-UI-SPEC §4) added three things around that unchanged look, all for accessibility
 * and none visible to a mouse:
 * - `aria-pressed` on each pill, so a screen reader announces which of the two is on;
 * - an optional `ariaLabel`, which makes the pair a named `role="group"` (the Tip Style pair uses
 *   it, so the two pills read as one setting);
 * - `focus-ring-accent` (the accent ring, shown on keyboard focus only) and `coarse:min-h-11` (44px
 *   on a touch pointer, never on a mouse at any width). `PillButton` already had these two — it
 *   gained them in 09-REVIEW.md WR-02 — and this copy was extracted without them; now both agree.
 *
 * Exactly two options, laid out side by side — never more.
 */

export interface TwoOptionToggleProps<T extends string> {
  options: readonly [T, T];
  labels: readonly [string, string];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Names the pair for a screen reader. When given, the wrapper becomes `role="group"` with this
   * name; when not, the wrapper stays a plain box, exactly as before. Always a constant from the
   * caller, never user text. */
  ariaLabel?: string;
}

export function TwoOptionToggle<T extends string>({
  options,
  labels,
  value,
  onChange,
  className = "",
  ariaLabel,
}: TwoOptionToggleProps<T>) {
  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
    >
      {options.map((option, i) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={`focus-ring-accent cursor-pointer rounded-md border px-1 py-2.5 text-[11px] font-bold coarse:min-h-11 ${
              active ? "border-surf-on-accent bg-surf-accent text-surf-on-accent" : "border-surf-line bg-surf-sidebar text-surf-ink"
            }`}
          >
            {labels[i]}
          </button>
        );
      })}
    </div>
  );
}
