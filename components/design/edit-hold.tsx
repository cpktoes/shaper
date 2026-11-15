"use client";

import { createContext, useContext } from "react";

/**
 * How a control tells the design history it is being HELD (quick 261114-vwy, the founder's ruling of
 * 2026-11-14 on the to-do of 2026-10-02): `beginHold` the moment a slider's dot is pressed or a drag point
 * grabbed, `endHold` when it is released. Between the two, every change is one Undo step and TEMPLATE's
 * ghost stays pinned to the shape at the grab — the rules themselves are `beginHold`/`endHold` in
 * `lib/design-history.ts`; this is only the wire.
 *
 * Its own small file, like `use-controls-locked.ts`, so the shared `Slider` (`components/ui/slider.tsx`)
 * and the viewers can report a hold without importing the design store. Outside the store — the home
 * page's blank filter, a print, a thumbnail — both calls do nothing. Both are safe to call more than
 * once: a second press while held changes nothing, and a release with nothing held is a no-op, which is
 * what lets the store back every hold with a window-level "any pointer came up".
 */
export interface EditHold {
  /** A slider or a drag point was pressed. */
  beginHold: () => void;
  /** It was released, cancelled, or lost. */
  endHold: () => void;
}

const NO_HOLD: EditHold = { beginHold: () => {}, endHold: () => {} };

export const EditHoldContext = createContext<EditHold>(NO_HOLD);

/** The two calls a held control makes; no-ops outside the design store. */
export function useEditHold(): EditHold {
  return useContext(EditHoldContext);
}
