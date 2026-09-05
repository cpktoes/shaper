"use client";

/**
 * The shared floating toolbar button drawn over a viewer panel's board drawing — today the
 * TEMPLATE screen (`components/outline/outline-editor.tsx`) and the ROCKER screen
 * (`components/rocker/rocker-editor.tsx`), each stepping a small row of icon buttons (Rotate,
 * Construction Lines, Wide view, and on TEMPLATE, Export Template) along the panel's top-right
 * edge.
 *
 * Both screens used to hand-mirror this button: the same border/radius/padding class string, the
 * same absolute box treatment, the same hover-accent fill, and the same `RotateBoardIcon` glyph —
 * copied byte-for-byte into two files. That mirroring got edited in all seven button instances
 * twice in one day (2026-08-30, quick tasks 260830-1g3 and 260830-1vn): once to add the accent
 * fill, once to remove a border-colour regression it introduced. The accent fill and its paired
 * on-accent icon colour — a rule this codebase has been bitten by three times (see quick task
 * 260825-rmb's SUMMARY.md) — must never again live in two files that can drift
 * apart. This module is the one place both the class string and the glyph now live; a third
 * screen that grows this same toolbar reuses it rather than mirroring it a third time.
 */

import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Which of the toolbar's fixed slots a button occupies, stepping left along the panel's
 * top-right edge: 0 sits in the corner, 1/2/3 step further left in order.
 */
export type ViewerToolbarSlot = 0 | 1 | 2 | 3;

/**
 * Complete, literal Tailwind class names for each slot. Tailwind's compiler only picks up class
 * names it can see whole in the source — a computed string built by concatenating a number onto
 * a "right-" prefix (e.g. `` `right-${slot * 10}` ``) is invisible to it, and the button would
 * silently render with no position at all. This looks like a harmless simplification; it is not.
 *
 * Slot 0's offsets are zero not because the button sits at the panel's true outer corner, but
 * because `TabbedPanel`'s content card already supplies a padding inset (`p-3`, or `p-1` in
 * `bare` mode) — an absolutely positioned child offsets from its containing block's padding box,
 * so adding a further offset here would double that inset and shift the button off its mark.
 */
const TOOLBAR_SLOT_POSITION: Record<ViewerToolbarSlot, string> = {
  0: "top-0 right-0",
  1: "top-0 right-10",
  2: "top-0 right-20",
  3: "top-0 right-30",
};

/**
 * The box every toolbar button shares: bordered `surf-ground` at rest (opaque, since the button
 * sits absolutely over the drawing and board lines must not run under the glyph), filling with
 * the accent colour on hover with its icon following to the paired on-accent colour in the same
 * variant, a focus ring, and the absolute positioning + stacking every instance needs. The border
 * stays the neutral `surf-line` token in every state — resting, hovered, and (on a toggle)
 * pressed — rather than tinting to match the fill: measured against the page, a tinted edge only
 * cleared the 3:1 non-text contrast target in one of the four themes (quick task 260830-1vn).
 */
const TOOLBAR_BUTTON_BASE =
  "absolute z-10 flex cursor-pointer items-center rounded-md border border-surf-line bg-surf-ground p-1 text-surf-ink-muted transition-colors outline-none hover:bg-surf-accent hover:text-surf-on-accent focus-visible:ring-2 focus-visible:ring-surf-accent-ink";

/**
 * Add-on classes for a genuine on/off toggle: keeps the accent fill (and its paired on-accent
 * icon colour) once the toggle is on, even after the pointer leaves — hung off `aria-pressed`,
 * which only this component sets, and only when `pressed` is actually supplied. Hovering a
 * pressed button changes nothing, because hover and pressed paint the identical accent variant.
 */
const TOOLBAR_BUTTON_PRESSED_ADDON = "aria-pressed:bg-surf-accent aria-pressed:text-surf-on-accent";

export interface ViewerToolbarButtonProps
  extends Omit<ComponentProps<"button">, "aria-label" | "children" | "type" | "slot"> {
  /** The accessible name, and the tooltip too when `title` is omitted. */
  label: string;
  /**
   * Which slot along the top-right edge this button occupies.
   */
  slot: ViewerToolbarSlot;
  /**
   * Whether this button is a toggle, and whether it is currently on. Omit this prop entirely for
   * a one-shot action (Export Template, Rotate) — this component only sets `aria-pressed` when
   * `pressed` is actually supplied, so a one-shot button never carries a pressed attribute at
   * all. Setting it to `false` (rather than omitting it) still marks the button as a toggle that
   * happens to be off right now; only leaving the prop out means "this isn't a toggle."
   */
  pressed?: boolean;
  children: ReactNode;
}

export function ViewerToolbarButton({
  label,
  title,
  slot,
  pressed,
  children,
  className,
  ref,
  ...rest
}: ViewerToolbarButtonProps) {
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      aria-label={label}
      title={title ?? label}
      {...(pressed === undefined ? {} : { "aria-pressed": pressed })}
      className={cn(
        TOOLBAR_BUTTON_BASE,
        pressed === undefined ? null : TOOLBAR_BUTTON_PRESSED_ADDON,
        TOOLBAR_SLOT_POSITION[slot],
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * The rotate-board glyph shown on the Rotate button of both viewer toolbars, lifted verbatim
 * from `.planning/sketches/006-orientation-switch/index.html`'s `#rotateBtn`.
 *
 * Both orientations shown at once, the way a phone's "rotate screen" icon does it: an upright
 * board, the same board on its side nose-left, and one arrow between them — clearer than a
 * single tilted shape. It is the ONE glyph for both button states (only the button's `aria-label`
 * changes). One planshape reused twice through `<use>`, at the SAME 0.62 scale, so it reads as
 * one board being turned rather than two boards of different sizes; `strokeWidth` is 2.42 so the
 * drawn weight lands at 1.5 after that shared scale. The gap between the two copies is what keeps
 * it readable small — sketch 006's proof sheet found the glyph gets tight below about 16px, which
 * is why the button uses `size-6` (24px): the founder asked for a larger icon, and sketch 006's
 * README already carried this as its one open caveat, recommending a 20-22px icon in a slightly
 * larger button if the sketch ever got built.
 */
export function RotateBoardIcon({ className }: { className?: string }) {
  // SVG ids are document-global — a literal id would collide with another element's <use href>
  // if this ever rendered twice on one page. useId gives a per-instance id; React's own id
  // punctuation (colons) is stripped so it stays a valid URL fragment for the href below.
  const glyphId = `shaper-board-glyph-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <defs>
        <path
          id={glyphId}
          d="M12 3.3C11.0 6.2 9.88 9.5 9.85 12.6 9.82 15.6 10.4 18.2 11.1 20.3a0.95 0.95 0 0 0 1.8 0C13.6 18.2 14.18 15.6 14.15 12.6 14.12 9.5 13.0 6.2 12 3.3Z"
        />
      </defs>
      <g stroke="currentColor" strokeLinejoin="round" fill="none" strokeWidth={2.42}>
        <use href={`#${glyphId}`} transform="translate(17.2,12.5) scale(0.62) translate(-12,-12.3)" />
        <use href={`#${glyphId}`} transform="translate(8.5,17) rotate(-90) scale(0.62) translate(-12,-12.3)" />
      </g>
      <path d="M14.5 6.5A8 8 0 0 0 4.5 11.8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M4.29 13.89 3.06 11.66 5.94 11.94Z" fill="currentColor" />
    </svg>
  );
}
