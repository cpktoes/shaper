"use client";

import type { ReactNode } from "react";
import { useDesign } from "@/components/design/design-store";
import { BoardLockContext, useControlsLocked } from "@/components/design/use-controls-locked";

/**
 * The visible half of the board lock (quick 261008-lsy, Plan 02). When the open board is locked,
 * every control that would change it is greyed AND truly disabled — for a mouse, a finger, the
 * keyboard and a screen reader — so a shaper sees at a glance that nothing will take, instead of
 * finding sliders that silently don't move. The REAL guard is the design store (Plan 01 refuses every
 * change while locked, and the server refuses the save); this scope only makes that refusal visible.
 *
 * `BoardLockScope` wraps the six design screens in `app/design/layout.tsx`. The top bar, its gear
 * menu, the phone's ☰ sheet and App Default Settings are mounted from the root layout, OUTSIDE it,
 * so they stay usable — which is also why `MeasureField`, used by App Default Settings too, is
 * never greyed there. Outside any scope `useControlsLocked()` reads false.
 *
 * Who reads it:
 * - AUTOMATIC: `SliderRow` and `MeasureField` treat a locked board as `disabled`. Every one on a
 *   design screen changes the board.
 * - EXPLICIT: everything else (raw sliders, selects, tick boxes, two-option toggles, pills,
 *   steppers, Reset buttons, the Fin System select) is given `disabled={locked}` by its own file.
 * - VIEW-ONLY controls — tabs, zoom, rotate, Show Construction and the other show/hide ticks, section
 *   open/close, the toe/aim table, the print ticks, Print and Export — carry `data-lock-exempt` and
 *   are never disabled. A locked board is for looking at, and for printing.
 *
 * Why not one `<fieldset disabled>` or `inert` around each panel: either would also switch off the
 * view-only controls that live in the same panels; `inert` would also hide the values from screen
 * readers; and neither stops a Base UI slider drag (Base UI reads only its own `disabled` prop,
 * never a native fieldset). `board-lock-scope.test.ts` is the inventory that fails on any control
 * that is neither tied to the lock nor marked view-only.
 *
 * The flag and `useControlsLocked()` live in `use-controls-locked.ts`, a file with no store import, so
 * the shared rows (and their node-environment tests) can read it; this file provides it and re-exports it.
 */

export function BoardLockScope({ children }: { children: ReactNode }) {
  const { locked } = useDesign();
  return <BoardLockContext.Provider value={locked}>{children}</BoardLockContext.Provider>;
}

export { useControlsLocked };
