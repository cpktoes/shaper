"use client";

import { createContext, useContext } from "react";

/**
 * The lock flag itself, kept in its own small file (quick 261008-lsy, Plan 02) so the shared rows —
 * `SliderRow` and `MeasureField` — can read it without importing the design store (and through it the
 * database client), which their node-environment unit tests cannot load. `BoardLockScope`
 * (`board-lock-scope.tsx`) is what provides it; outside any scope it reads false.
 */
export const BoardLockContext = createContext(false);

/** True while the open board is locked and this control sits on a design screen. */
export function useControlsLocked(): boolean {
  return useContext(BoardLockContext);
}
