"use client";

/**
 * The shared floating toolbar row and button drawn over a viewer panel's board drawing — today
 * the TEMPLATE screen (`components/outline/outline-editor.tsx`), the ROCKER screen
 * (`components/rocker/rocker-editor.tsx`) and the RAILS screen
 * (`components/rails/rail-band-editor.tsx`), each holding a handful of icon buttons (Rotate,
 * Construction Lines, Wide view, Print Template, or on RAILS, View Full Sized) — and the 3D screen
 * (`components/3d/three-d-screen.tsx`), whose row holds Wide view and the switches for what the
 * picture includes. ROCKER's row also holds the blank-from-above toggle on a computer (quick
 * 261006-qfm, `BlankTopViewIcon` below).
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
  "flex flex-none cursor-pointer items-center rounded-md border border-surf-line bg-surf-ground p-1 text-surf-ink-muted transition-colors outline-none hover:bg-surf-accent hover:text-surf-on-accent focus-visible:ring-2 focus-visible:ring-surf-accent-ink disabled:cursor-default disabled:opacity-40 disabled:hover:bg-surf-ground disabled:hover:text-surf-ink-muted";

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
   * a one-shot action (Print Template, Rotate) — this component only sets `aria-pressed` when
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

/**
 * The glyph on ROCKER's "Hide / Show the blank from above" toggle (quick 261006-qfm). The founder,
 * 2026-10-06: "On a large desktop screen, the mini blank/board image can be turned on/off by another
 * button." It pictures what the button shows: a blank seen from above, a board inside it pointed at
 * the left (its nose, as ROCKER draws nose-left), and the stringer's dash-dot running through both.
 * It is the ONE glyph for both states — only the button's label changes, like `RotateBoardIcon`.
 */
export function BlankTopViewIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x={2.5} y={6.5} width={19} height={11} rx={3.5} stroke="currentColor" strokeWidth={1.25} />
      <path
        d="M5 12C7.6 9.4 11.5 8.8 15.2 8.8 17.6 8.8 19 10 19 12 19 14 17.6 15.2 15.2 15.2 11.5 15.2 7.6 14.6 5 12Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path d="M1.5 12H22.5" stroke="currentColor" strokeWidth={1} strokeDasharray="3 1.5 1 1.5" />
    </svg>
  );
}

/**
 * The glyph on the 3D screen's Contour Stripes switch (Phase 16, D-35 — the founder, 2026-11-04: "An icon
 * too"). It pictures what the button draws: a board seen from above, nose left, with two bands of light
 * running along it, each kinking once near the middle where the bands kink at a bump. It is the ONE glyph
 * for both states; the button's pressed fill says which.
 */
export function ContourStripesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M1.5 12C5.5 7.5 11 6 16.2 6 20 6 22.5 8.6 22.5 12 22.5 15.4 20 18 16.2 18 11 18 5.5 16.5 1.5 12Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path d="M6.5 10.2H11.2L12.8 8.8 14.4 10.2H20" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M6.5 13.8H9.2L10.8 15.2 12.4 13.8H20" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The glyph on FINS' Bottom Contours toggle (Phase 17, plan 13 — the founder, at his second look, 2026-11-09:
 * "the icon isn't great. maybe more like an oceanography contour lines for topography"). It is a scrap of a
 * depth chart: two uneven closed rings, the inner one following the outer the way neighbouring depth lines
 * do, round a short mark at the low spot. lucide has nothing that reads that way — its nearest are perfect
 * circles (a target) and stacked sheets (layers) — so it is drawn here beside the page's other glyphs, in
 * lucide's own grammar (a 2-unit round stroke) so it weighs the same as the lucide ruler on the button beside
 * it. A third ring was tried and measured: at this size it left under one dot of clear ground between rings
 * and clotted, where two rings and the mark keep at least a dot and a half. It is the ONE glyph for both
 * states; the button's pressed fill says which.
 */
export function BottomContoursIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M22 12.1C22.3 14 22.5 16.9 21.5 18.4C20.4 19.8 17.4 20.7 15.6 20.8C13.8 20.9 12.3 19.5 10.6 18.9C8.9 18.4 6.8 18.7 5.3 17.5C3.9 16.4 1.8 13.9 1.8 12.1C1.9 10.3 4 8 5.4 6.7C6.8 5.4 8.5 4.7 10.2 4.1C11.9 3.6 14 2.9 15.6 3.3C17.3 3.8 18.8 5.5 19.9 6.9C21 8.4 21.8 10.2 22 12.1Z" />
      <path d="M18.1 12.4C18.3 13.4 18.6 15.1 18 15.8C17.4 16.5 15.6 16.8 14.7 16.7C13.8 16.6 13.2 15.6 12.4 15.3C11.5 15 10.5 15.5 9.7 15C8.8 14.6 7.4 13.3 7.4 12.4C7.3 11.5 8.6 10.2 9.4 9.6C10.2 8.9 11.2 8.8 12.1 8.6C12.9 8.3 13.9 8.1 14.6 8.3C15.4 8.5 16.1 9.2 16.7 9.9C17.3 10.6 17.9 11.4 18.1 12.4Z" />
      <path d="M12.6 11.9 14.2 12.9" />
    </svg>
  );
}

/**
 * The glyph on the Customize Rocker popup's Show my board toggle (quick 261017-ojc, P-11, 2026-10-17 —
 * the founder: "lets make icons in the upper right like the other pages have"). lucide has no
 * surfboard, so it is drawn here beside the page's other two: a blank seen from the side, both ends
 * lifting like a rockered blank, with the board inside it as a filled lens — what pressing it draws.
 * It is the ONE glyph for both states; the button's pressed fill says which.
 */
export function BoardInBlankIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M1.5 10.5C5 9 8 8.8 12 8.8S19 9 22.5 10C21 12.5 17 14.8 12 14.8S4 13 1.5 10.5Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path d="M4.3 11.2C7 10.5 9 10.4 12 10.4S17.5 10.6 20.2 10.9C18.5 12.3 16 13.3 12 13.3S6.2 12.4 4.3 11.2Z" fill="currentColor" />
    </svg>
  );
}

/**
 * The glyph on RAILS' Finished Rail toggle (fast task, 2026-11-02 — the founder, after plan 02's look:
 * "the finished rail icon should look more like a finished rail"). It pictures what the button draws: a
 * finished rail cross-section the way the VIEWER draws it — the deck running in from the left, a full
 * rounded apex a little below half height (a 60/40 rail), tucking under to the bottom, the board running
 * off the left edge — as one solid, smooth silhouette, in place of lucide's generic spline. Solid and
 * smooth on purpose: its neighbour `GhostBandsIcon` is dashed and angular, after the founder's first
 * look found a pair drawn around the same curve "way too similar". One glyph for both states; the
 * button's pressed fill says which.
 */
export function FinishedRailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M1.5 6.5H9.5C16.5 6.5 21.5 9.2 21.5 12.6C21.5 15.6 18.3 17.5 13 17.5H1.5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The glyph on RAILS' Ghost Bands toggle (the same fast task — the founder: "another icon that ghosts
 * the bands so that the finished rail is clearly seen"). It pictures what the button fades: the cut
 * bands alone — the faceted chain a shaper actually cuts, deck mark to rail mark to tuck, with the
 * mark dots at its corners — drawn dashed, the way a ghosted line reads. No smooth curve and no fill,
 * so it cannot be mistaken for `FinishedRailIcon` beside it. One glyph for both states, like every
 * toggle on this row.
 */
export function GhostBandsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M1.5 6.5H16.5L21.5 10V15L18.5 17.5H1.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeDasharray="2.6 1.6"
      />
      <circle cx={16.5} cy={6.5} r={1.5} fill="currentColor" />
      <circle cx={21.5} cy={10} r={1.5} fill="currentColor" />
      <circle cx={21.5} cy={15} r={1.5} fill="currentColor" />
      <circle cx={18.5} cy={17.5} r={1.5} fill="currentColor" />
    </svg>
  );
}
