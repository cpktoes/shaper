"use client";

/**
 * The shared floating toolbar row and button drawn over a viewer panel's board drawing — today
 * the TEMPLATE screen (`components/outline/outline-editor.tsx`), the ROCKER screen
 * (`components/rocker/rocker-editor.tsx`) and the RAILS screen
 * (`components/rails/rail-band-editor.tsx`), each holding a handful of icon buttons (Rotate,
 * Construction Lines, Wide view, Export Template, or on RAILS, View Full Sized).
 *
 * The three screens used to hand-mirror this button: the same border/radius/padding class
 * string, the same absolute box treatment, the same hover-accent fill, and the same
 * `RotateBoardIcon` glyph — copied byte-for-byte into multiple files. That mirroring got edited
 * in all seven button instances twice in one day (2026-08-30, quick tasks 260830-1g3 and
 * 260830-1vn): once to add the accent fill, once to remove a border-colour regression it
 * introduced. The accent fill and its paired on-accent icon colour — a rule this codebase has
 * been bitten by three times (see quick task 260825-rmb's SUMMARY.md) — must never again live in
 * files that can drift apart. This module is the one place both the class string and the glyph
 * live; any screen that grows this same toolbar reuses it rather than mirroring it again.
 *
 * Quick task 260909-hd9 replaced each button's own hand-picked position (a slot measured in from
 * the panel's corner) with `ViewerToolbar`, one flex row pinned to the corner that the buttons sit
 * inside — see that component's own doc comment below for why. Hiding a button (rotate on a
 * phone, wide view on a phone) now costs the row nothing, because there is no longer a numbered
 * parking space left standing empty.
 */

import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The one pinned box every viewer toolbar row shares, over the panel's top-right corner.
 *
 * `top-0 right-0` is zero not because the row sits at the panel's true outer corner, but because
 * `TabbedPanel`'s content card already supplies a padding inset (`p-3`, or `p-1` in `bare` mode)
 * — an absolutely positioned child offsets from its containing block's padding box, so adding a
 * further offset here would double that inset and shift the row off its mark.
 *
 * `flex-row-reverse`, not `flex`: the row is pinned by its right edge, so the FIRST child lands
 * in the corner and each later child steps left — which is what lets a hidden button's
 * neighbours close the gap it leaves rather than stopping short of the corner. It also means the
 * JSX order reads exactly like the old numbered slots (corner first, stepping left), so a future
 * fifth button is appended at the end of the JSX and lands at the far left, exactly where the
 * next slot would have been. A plain `flex` row would need a new button PREPENDED instead to keep
 * the same visual growth — the kind of trap this codebase writes comments to avoid.
 *
 * `gap-1.5` is 6px, chosen by measurement, not guesswork: a button's drawn box is 34px (a 24px
 * icon, 4px padding each side, 1px border each side, under Preflight's `box-sizing: border-box`),
 * and the old hand-picked step between slots was 40px. 34 + 6 = 40, so this gap reproduces
 * today's desktop line-up exactly — `app/globals.css` does not override Tailwind's `--spacing`
 * (still 0.25rem) and sets no root font size, so no arbitrary value or fractional pixel is
 * needed. This is the same 6px `components/viewer/tabbed-panel.tsx` already uses on its tab
 * strip.
 *
 * `items-start` keeps each button's height its own content's height, matching what it had when
 * every button was pinned individually.
 */
const VIEWER_TOOLBAR_ROW_CLASS = "absolute top-0 right-0 z-10 flex flex-row-reverse items-start gap-1.5";

/**
 * The box every toolbar button shares: bordered `surf-ground` at rest (opaque, since the row it
 * sits in floats absolutely over the drawing and board lines must not run under the glyph),
 * filling with the accent colour on hover with its icon following to the paired on-accent colour
 * in the same variant, and a focus ring. The border stays the neutral `surf-line` token in every
 * state — resting, hovered, and (on a toggle) pressed — rather than tinting to match the fill:
 * measured against the page, a tinted edge only cleared the 3:1 non-text contrast target in one
 * of the four themes (quick task 260830-1vn).
 *
 * The button itself no longer carries the out-of-flow keyword or the stacking level — those now
 * live on `ViewerToolbar`'s row below (quick task 260909-hd9), which is what packs a hidden
 * button's neighbours into the corner instead of leaving its old parking space empty.
 * `flex-none` is insurance so a narrow panel can never squeeze a button narrower than its icon.
 */
const TOOLBAR_BUTTON_BASE =
  "flex flex-none cursor-pointer items-center rounded-md border border-surf-line bg-surf-ground p-1 text-surf-ink-muted transition-colors outline-none hover:bg-surf-accent hover:text-surf-on-accent focus-visible:ring-2 focus-visible:ring-surf-accent-ink";

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
  // `slot` stays omitted from the underlying `<button>` props on purpose, even though the prop
  // it used to name is gone (quick task 260909-hd9, positioning moved to `ViewerToolbar`): `slot`
  // is also a real HTML attribute, so keeping it out of this component's own props means any call
  // site still passing one is a hard TypeScript error rather than a silently ignored attribute.
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
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * The one row of floating icon buttons pinned to a viewer panel's top-right corner — TEMPLATE,
 * ROCKER and RAILS each wrap their `ViewerToolbarButton`s (and, on TEMPLATE, `ExportPreviewDialog`
 * for its trigger) in exactly one of these, in place of the button-by-button numbered slots this
 * replaced (quick task 260909-hd9).
 *
 * The row, not any individual button, owns the pinned box (`VIEWER_TOOLBAR_ROW_CLASS` above) — so
 * hiding a button (rotate on a phone, wide view on a phone) removes it from the flex layout
 * entirely rather than leaving an empty numbered parking space behind. The founder's report this
 * fixes: "buttons don't display are still taking up room."
 *
 * `data-viewer-toolbar` is a hook for the browser tests to find the row without depending on its
 * class string.
 */
export function ViewerToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-viewer-toolbar className={cn(VIEWER_TOOLBAR_ROW_CLASS, className)}>
      {children}
    </div>
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
