"use client";

/**
 * `Live` — the one wrapper that makes a group of ROCKER's sidebar controls follow the tab in view
 * (quick 261006-v20, 2026-10-06). The founder's rule: on DATASHEET only the three thicknesses the table
 * can type stay live, on TOP VIEW only the blank picker and Placement (`rocker-live-controls.ts`).
 *
 * Not live means dimmed and inert, never hidden (D-02): the group stays on the page at its own size and
 * place, so nothing in the sidebar moves when a shaper switches tabs, and they can still see what is
 * there. It dims to the app's own `opacity-40` (the dimming Reset Fine-Tune and a disabled `SliderRow`
 * already use), and the HTML `inert` attribute takes it out of reach: no focus, no clicks, no taps, no
 * keys, out of the accessibility tree.
 *
 * A group is dimmed once, never twice (D-09): on TOP VIEW the whole THICKNESS section is wrapped AND its
 * rows are, and nested `opacity-40` would compound to 16%. So a `Live` reads whether every wrapper above
 * it is live; one inside a not-live wrapper still carries `inert` and `data-live="false"` but adds no
 * opacity of its own.
 *
 * The wrapper is `flex flex-col`, not a plain block `div` (D-10): every group it wraps is a flex item of
 * a `flex flex-col` column, and a one-item flex column keeps that item stretched to the full width, keeps
 * its `self-start` working (Reset Fine-Tune) and adds no line box. On VIEWER it carries no `inert`, no
 * opacity and no stacking context, so the screen draws exactly as before.
 */

import { createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** True while every `Live` above is live. */
const AncestorLiveContext = createContext(true);

export function Live({ on, children }: { on: boolean; children: ReactNode }) {
  const ancestorLive = useContext(AncestorLiveContext);
  const live = ancestorLive && on;
  return (
    <AncestorLiveContext.Provider value={live}>
      <div
        inert={!live}
        data-live={live ? "true" : "false"}
        className={cn("flex flex-col", ancestorLive && !on && "opacity-40")}
      >
        {children}
      </div>
    </AncestorLiveContext.Provider>
  );
}
