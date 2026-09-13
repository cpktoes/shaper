"use client";

/**
 * A pair of thumb-sized arrow buttons that put back the last thing a shaper did to the board on a
 * phone — the on-screen twin of the desktop's Cmd/Ctrl+Z. Both act on `useDesign()`'s
 * `canUndo`/`canRedo`/`undoEdit`/`redoEdit`, the same shared board-design state every design
 * screen already reads from, so a slider move, a typed number or a dragged point can be taken
 * back or put forward the same way regardless of which screen it happened on.
 *
 * IT RENDERS NOTHING UNTIL THERE IS SOMETHING TO UNDO. Returns `null` while both `canUndo` and
 * `canRedo` are false, so a freshly loaded design screen is byte-for-byte what it was before this
 * component existed — none of `e2e/phone-layout.spec.ts`, `e2e/touch-sizing.spec.ts` or
 * `e2e/phone-screens.spec.ts`'s existing bounding-box measurements can be disturbed by a new
 * element that was never there to begin with.
 *
 * WHY IT FLOATS INSTEAD OF JOINING EITHER EXISTING PHONE BAR. `phone-top-bar.tsx`'s own doc
 * comment records, measured, that at 360px the top bar's inside width is 328px, its right-hand
 * cluster (Save plus the menu button) already runs 149.0px against a 150.3px wordmark — 28.7px of
 * clear air, nowhere near room for two 44px buttons. `phone-tab-bar.tsx`'s own comment records its
 * six tab labels fit 360px "with about 12px to spare" — same story. So this is its own small
 * floating pair instead, anchored bottom-right, sitting just above the tab bar
 * (`calc(3.5rem + env(safe-area-inset-bottom) + 0.75rem)` — 3.5rem is `PhoneTabBar`'s own `h-14`).
 *
 * `pointer-events-none` on the wrapper, `pointer-events-auto` on each button only, means the gap
 * around and between the two buttons passes a tap straight through to whatever is underneath —
 * this pair never swallows a touch it isn't sitting directly on.
 *
 * `hidden max-shell:flex` is the exact width switch `PhoneTabBar` and `PhoneTopBar` already use
 * (CLAUDE.md's Layout section) — this element is always in the server-rendered tree, and the
 * width variant alone decides which paints, so a mouse at desktop width never sees a pixel of it
 * move: `display: none` costs nothing to lay out. `data-print-hide` matters for the same reason
 * every other piece of phone chrome carries it — the Summary screen prints, and a floating round
 * button on a printed order form would be a real defect.
 */

import { Redo2Icon, Undo2Icon } from "lucide-react";
import { useDesign } from "@/components/design/design-store";

export function PhoneUndoBar() {
  const { canUndo, canRedo, undoEdit, redoEdit } = useDesign();

  if (!canUndo && !canRedo) return null;

  return (
    <div
      data-print-hide
      data-phone-undo-bar
      className="pointer-events-none fixed right-4 z-40 hidden max-shell:flex items-center gap-2"
      style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <button
        type="button"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={undoEdit}
        className="pointer-events-auto flex size-10 coarse:size-11 cursor-pointer items-center justify-center rounded-full border border-surf-line-faint bg-surf-panel text-surf-ink shadow-lg transition-colors outline-none hover:text-surf-accent-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink disabled:cursor-default disabled:opacity-40"
      >
        <Undo2Icon aria-hidden className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={redoEdit}
        className="pointer-events-auto flex size-10 coarse:size-11 cursor-pointer items-center justify-center rounded-full border border-surf-line-faint bg-surf-panel text-surf-ink shadow-lg transition-colors outline-none hover:text-surf-accent-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink disabled:cursor-default disabled:opacity-40"
      >
        <Redo2Icon aria-hidden className="size-5" />
      </button>
    </div>
  );
}
