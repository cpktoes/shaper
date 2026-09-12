"use client";

/**
 * Two hooks that read a CSS media query as React state, in exactly the shape
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
 * of that: nobody should reach for either hook below to move a layout.
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
