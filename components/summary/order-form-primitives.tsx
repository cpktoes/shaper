"use client";

/**
 * The drafting vocabulary of a shop order form — the handful of shapes every panel on
 * `components/summary/order-form.tsx` is built from.
 *
 * A real order form is not a dashboard. It is hairline-boxed, ALL-CAPS, dense, and every field is
 * either a printed value or a ruled line someone writes on with a pen. These primitives exist so
 * that vocabulary is declared once rather than re-improvised per panel, and so the whole sheet can
 * be re-proportioned by editing this file instead of forty class strings.
 */

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A hairline-boxed panel with an optional ALL-CAPS caption — the form's basic unit, the muse's
 * boxed `CONTOURS` / `ROCKER` / `LAMINATING` panels.
 *
 * `flush` drops the body padding so a drawing can run to the box's edge; `padded` (the default)
 * keeps it for text and fields.
 */
export function FormBox({
  caption,
  variant = "padded",
  captionRight,
  className,
  bodyClassName,
  style,
  children,
}: {
  caption?: string;
  variant?: "padded" | "flush";
  /** Rendered opposite the caption on the same line — a unit, a count, a secondary label. */
  captionRight?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Escape hatch for per-panel CSS custom properties — the outline panel uses it to switch off
   * `--outline-board-fill` for the drawings inside it. Not for one-off layout: that belongs in
   * `className`. */
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div
      style={style}
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[3px] border border-surf-black",
        className,
      )}
    >
      {caption && (
        // The caption never wraps; a long `captionRight` truncates instead. At the 9pt floor a
        // two-word note was enough to fold a panel's own name onto two lines, which reads as a
        // broken box rather than a full one.
        <div className="flex flex-none items-baseline justify-between gap-2 border-b border-surf-black px-1.5 py-[3px]">
          <span className="flex-none whitespace-nowrap font-display font-extrabold tracking-architectural text-surf-black uppercase leading-none order-form-caption">
            {caption}
          </span>
          {captionRight && (
            <span className="min-w-0 truncate whitespace-nowrap text-right font-bold text-surf-muted leading-none order-form-micro">
              {captionRight}
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          variant === "padded" ? "p-1.5" : "p-0",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * The muse's vertical spine labels — `RIDER INFO`, `SURFBOARD SHAPE AND DESIGN`, `GLASSING` —
 * running bottom-to-top down the left edge of the band they name.
 *
 * `writing-mode: vertical-rl` + `rotate(180deg)` rather than a `rotate(-90deg)` transform: the
 * rotation form takes the element out of layout flow, so the band would have to be told the
 * label's width by hand. The writing-mode form stays in flow and the flex row sizes around it.
 */
export function RailLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        // `order-form-spine` fixes the width rather than letting the label size to its own text, so
        // every band on the sheet insets its content by the same amount — see order-form.css's
        // column-geometry block, which the logo/rail-sections/laminating right edge depends on.
        "flex items-center justify-center rounded-[3px] border border-surf-black",
        "order-form-spine bg-(--order-form-shade)",
        className,
      )}
    >
      <span
        className="font-display font-extrabold tracking-architectural text-surf-black uppercase order-form-caption"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {children}
      </span>
    </div>
  );
}

/**
 * One order-form field: an ALL-CAPS label and, beside it, either a value or a ruled line to write
 * on.
 *
 * **The write-in/live split is the point of this component.** Today only Board Name and Fin System
 * carry live state; every other field on the sheet prints as a blank rule the shaper fills in by
 * pen. The goal is for all of them to become live eventually, so the difference is expressed as
 * *presence of a `value`* and nothing else — no separate blank-field component, no different
 * markup, no layout that has to change. Handing an existing `<OrderFormField label="PH #" />` a
 * `value`/`onChange` pair is the whole migration for that field.
 *
 * A field with a `value` but no `onChange` is a read-only printed value (Length, Volume) — the
 * third state, and the one most of the calculated numbers use.
 */
export function OrderFormField({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  className,
  labelClassName,
}: {
  label: string;
  /** Omitted → a blank ruled line. Present without `onChange` → a printed read-only value.
   * Present with `onChange` → a live input. */
  value?: string;
  onChange?: (next: string) => void;
  placeholder?: string;
  /** Printed immediately before the value/rule — the muse's `PRICE: $`. */
  prefix?: string;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <label className={cn("flex min-w-0 items-baseline gap-1", className)}>
      <span
        className={cn(
          "flex-none font-display font-extrabold tracking-architectural text-surf-black uppercase order-form-caption",
          labelClassName,
        )}
      >
        {label}:
      </span>
      {prefix && <span className="flex-none font-bold text-surf-black order-form-value">{prefix}</span>}
      {onChange ? (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-b border-surf-black bg-transparent font-bold text-surf-black outline-none placeholder:font-normal placeholder:text-surf-muted/60 focus:border-surf-accent-cyan-ink order-form-value"
        />
      ) : (
        // Both remaining states are one element: a bottom-ruled box holding the value, or holding
        // nothing at all. The `&nbsp;` keeps an empty rule at full line height so a blank field is
        // the same size as a filled one and the rows stay aligned down the sheet.
        <span className="min-w-0 flex-1 truncate border-b border-surf-black font-bold text-surf-black order-form-value">
          {value || " "}
        </span>
      )}
    </label>
  );
}

/**
 * A tick-box option — the muse's `LEASH CUP` / `SANDED` / `GLOSS & POLISH` checkboxes. Drawn, not
 * interactive, for the same reason the write-in fields are blank: these are glassing instructions
 * the shop ticks in pen. `OrderFormField`'s note above applies equally here when they go live.
 */
export function OrderFormTick({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="aspect-square h-[0.85em] flex-none border border-surf-black" />
      <span className="font-bold text-surf-black uppercase order-form-value">{label}</span>
    </div>
  );
}

/**
 * The shop's identity block, top-left, where the muse carries the Kontoes Surfboards logo and
 * phone number.
 *
 * A placeholder on purpose: this is the app's own wordmark and details, and uploading a real shop
 * logo and contact block is a paid-tier feature that has not been built. It is isolated in its own
 * component so that feature replaces one element rather than editing the sheet's header.
 */
export function LogoBlock() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-1 rounded-[3px] border border-surf-black bg-(--order-form-shade) px-3 py-2 text-center">
      <div className="font-display font-extrabold tracking-architectural text-surf-black uppercase leading-none order-form-wordmark">
        Shaper
      </div>
      <div className="h-px w-2/3 bg-surf-black" />
      <div className="font-bold text-surf-black uppercase leading-tight order-form-value">
        Custom Surfboard Order
      </div>
      <div className="font-normal text-surf-muted leading-tight order-form-micro">
        Your shop name, town &amp; phone
        <br />
        go here — upload a logo later
      </div>
    </div>
  );
}
