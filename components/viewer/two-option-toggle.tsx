"use client";

/**
 * A two-option segmented control, extracted from `components/fins/fin-controls.tsx`'s private
 * `PillButton` (UI-SPEC "Flat/Domed toggle (D-18)"). Every class string below is copied
 * byte-for-byte from `PillButton` — no new styling, no new spacing value, no third variant.
 * `fin-controls.tsx` keeps its own `PillButton` unchanged; the UI-SPEC calls for extraction, not
 * migrating every existing call site in this phase.
 *
 * Exactly two options, laid out side by side — never more.
 */

export interface TwoOptionToggleProps<T extends string> {
  options: readonly [T, T];
  labels: readonly [string, string];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function TwoOptionToggle<T extends string>({ options, labels, value, onChange, className = "" }: TwoOptionToggleProps<T>) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {options.map((option, i) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`cursor-pointer rounded-md border px-1 py-2.5 text-[11px] font-bold ${
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
