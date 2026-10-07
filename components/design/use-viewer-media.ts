"use client";

/**
 * Hooks that read a CSS media query as React state, in exactly the shape
 * `components/auth/sign-in-banner.tsx` already uses for its own browser-only read: a subscribe
 * function, a client snapshot, and a fixed server snapshot, so the server render stays
 * deterministic and the client corrects itself on the very next render after hydration — no
 * hydration-mismatch warning, at the cost of the on-by-default construction overlay or the
 * board's orientation potentially settling one frame after hydration on a touch device (the board
 * itself is never late).
 *
 * This is the ONE sanctioned use of a JavaScript media query in this phase, and only this one: it
 * drives React *state* — which way the board faces, whether the construction overlay starts on —
 * that cannot be expressed as a CSS variant. The stacked-versus-desktop LAYOUT switch stays
 * CSS-only — the `max-shell`/`shell` custom variants declared directly in `app/globals.css`, a
 * single width test (D-10, 10-SWEEP-2.md, 2026-09-11: the shaper's own decision, reverting a
 * width-and-height version 10-05 tried and withdrew) — and this standing rule is unchanged by any
 * of that: nobody should reach for any hook below to move a layout.
 *
 * Phase 15 D-04: the home page's Board Rack reads `useCoarsePointer` to pick the hover rack (a
 * mouse) or the swipe rack (a finger), which changes how the rack behaves, never which page
 * layout draws.
 *
 * Quick 261006-qfm (2026-10-06): ROCKER reads `useBelowShellWidth` and `useShortScreen` to decide
 * two pieces of React STATE — whether the blank seen from above draws as a small drawing in the
 * corner of the VIEWER panel, and whether a third TOP VIEW tab exists to hold it instead. Neither
 * moves a layout: the stacked-versus-desktop layout stays the CSS `max-shell`/`shell` switch, and a
 * short screen's own layout rules stay the inline `[@media(max-height:500px)]` ones. Both read the
 * same lines those CSS rules draw, so the corner drawing and the tab can never both be missing or
 * both be drawn. Their server snapshot is a computer (`false`), corrected on the first render after
 * hydration — the same posture `boardOrientation` has on ROCKER, and no hydration mismatch.
 */

import * as React from "react";

function subscribeToMediaQuery(query: string) {
  return (onStoreChange: () => void) => {
    if (typeof window === "undefined") return () => {};
    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addEventListener("change", onStoreChange);
    return () => mediaQueryList.removeEventListener("change", onStoreChange);
  };
}

function readMediaQuery(query: string): boolean {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}

/** One shared hook body so every media-query read here takes the same shape — a query string in,
 * a boolean out, the given value while the server (and the very first client frame) cannot know
 * the real answer yet. */
function useMediaQueryMatch(query: string, serverSnapshot: boolean): boolean {
  return React.useSyncExternalStore(
    subscribeToMediaQuery(query),
    () => readMediaQuery(query),
    () => serverSnapshot,
  );
}

const COARSE_POINTER_QUERY = "(pointer: coarse)";
const PORTRAIT_QUERY = "(orientation: portrait)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/**
 * Below the shell breakpoint (820 dots). `app/globals.css` writes the `max-shell` variant as
 * `(width < 820px)`, but the built stylesheet ships it as `not all and (min-width: 820px)` (read
 * off the built CSS on 2026-10-06, quick 261006-qfm D-10) — the same widths exactly, in the form
 * older Safari understands (the range form needs Safari 16.4). Written here the way it ships.
 */
const BELOW_SHELL_WIDTH_QUERY = "not all and (min-width: 820px)";
/** A short screen: the inline short-screen rule's own text (CLAUDE.md's Layout section). */
const SHORT_SCREEN_QUERY = "(max-height: 500px)";

/**
 * True on a touch (coarse) pointer device — never for a desktop mouse, at any viewport width.
 * Server snapshot: `false`, matching desktop's own off-by-default behaviour so a shaper never
 * sees the construction overlay or touch sizing flash on before settling to whichever the real
 * pointer type turns out to be.
 */
export function useCoarsePointer(): boolean {
  return useMediaQueryMatch(COARSE_POINTER_QUERY, false);
}

/**
 * True while the device is upright (portrait). Server snapshot: `true` — portrait is how a
 * shaper first opens a phone, and this value is only ever read on a coarse pointer (see
 * `outline-editor.tsx`), so a fine-pointer desktop never uses it at all.
 */
export function usePortraitViewport(): boolean {
  return useMediaQueryMatch(PORTRAIT_QUERY, true);
}

/**
 * True when the shaper has asked their device for less motion. The Board Rack then swaps a board
 * straight between its side profile and its outline, and drops a carried board without the glide
 * (SPEC constraint 8). Server snapshot: `false` — the rack's first frame is a still picture either
 * way, and the real preference is read on the very next render.
 */
export function useReducedMotion(): boolean {
  return useMediaQueryMatch(REDUCED_MOTION_QUERY, false);
}

/**
 * True below the shell breakpoint — an upright phone, or any window narrower than 820 dots — the
 * same widths the `max-shell` CSS variant matches. Server snapshot: `false` (a computer). ROCKER
 * reads it to put the blank seen from above in its own TOP VIEW tab rather than in the VIEWER
 * panel's corner (quick 261006-qfm); never read it to move a layout.
 */
export function useBelowShellWidth(): boolean {
  return useMediaQueryMatch(BELOW_SHELL_WIDTH_QUERY, false);
}

/**
 * True on a short screen, 500 dots tall or less — a phone held sideways, at any width. Server
 * snapshot: `false` (a computer). ROCKER reads it for the same TOP VIEW tab as above (quick
 * 261006-qfm), because a short screen has no room for a corner drawing beside the side view.
 */
export function useShortScreen(): boolean {
  return useMediaQueryMatch(SHORT_SCREEN_QUERY, false);
}
