"use client";

/**
 * A pair of thumb-sized (finger) or 40px (mouse) arrow buttons that put back the last thing a
 * shaper did to the board — the on-screen twin of the desktop's Cmd/Ctrl+Z. Both act on
 * `useDesign()`'s `canUndo`/`canRedo`/`undoEdit`/`redoEdit`, the same shared board-design state
 * every design screen already reads from, so a slider move, a typed number or a dragged point can
 * be taken back or put forward the same way regardless of which screen it happened on.
 *
 * IT RENDERS NOTHING UNTIL THERE IS SOMETHING TO UNDO. Returns `null` while both `canUndo` and
 * `canRedo` are false, so a freshly loaded design screen is byte-for-byte what it was before this
 * component existed — none of `e2e/phone-layout.spec.ts`, `e2e/touch-sizing.spec.ts` or
 * `e2e/phone-screens.spec.ts`'s existing bounding-box measurements can be disturbed by a new
 * element that was never there to begin with, and (quick 260930-lo8) that is also why a freshly
 * opened screen on a computer is byte-for-byte what it was before this task, which is what keeps
 * the five desktop reference screenshots unchanged.
 *
 * Since quick 260930-lo8 (the founder's F-1, F-2, 2026-09-30, 13-SPEC.md item 9c): the same
 * floating pair now shows on a computer too, once there is something to take back (F-2 — the
 * early return above is exactly what already made that true, unchanged), at the window's own
 * bottom-right corner, the same look as on a phone (F-1 — one pair, mounted once, fixed to the
 * window, never a button built into any viewer card's own toolbar or corner).
 *
 * WHY IT FLOATS INSTEAD OF JOINING THE TOP BAR, ON A PHONE. `phone-top-bar.tsx`'s own doc comment
 * records, measured, that at 360px the top bar's inside width is 328px, its right-hand cluster (Save
 * plus the menu button) already runs 149.0px against a 150.3px wordmark — 28.7px of clear air,
 * nowhere near room for two 44px buttons. So this is its own small floating pair instead, anchored
 * bottom-right, over the end of the controls.
 *
 * THE UPRIGHT PHONE'S OFFSET (quick 261003-q2f): 16 dots in from the window's bottom-right corner —
 * the computer's own 16 — plus the home-bar inset on a real iPhone
 * (`calc(1rem + env(safe-area-inset-bottom))`). It used to sit 12 dots above the old bottom tab bar,
 * which that quick task removed; the controls now run to the window's bottom edge, and every design
 * screen's controls end with enough room after their last row (Back and Next) to scroll that row
 * clear of the pair, with about 8 dots of daylight (`design-screen-shell.tsx` and the order form
 * carry that room).
 *
 * THE COMPUTER OFFSET: a plain 16px from the window's bottom and right edges (`shell:bottom-4`
 * plus the existing `right-4`), over the drawing card's own corner (its own padding is only 12px),
 * the same way the pair already floats over a phone's controls. Chosen by measuring four offset
 * candidates on all six screens at nine window sizes, scrolled and unscrolled: 16px left the pair
 * over text in the fewest of 69 screen states (14, against 23-24 for the others), and in every one
 * of those 69 states no button, link, typed field or tab sat within 12px of it. One known,
 * recorded trade-off: on RAILS, while the pair is showing, it sits over the colour key's last
 * entry ("Board Thickness") under the three plots — no bottom-right position clears it; left for
 * the founder rather than changed here.
 *
 * WHY THE OFFSET LIVES IN TWO WIDTH-KEYED CLASSES, NOT AN INLINE STYLE. An inline `style` outranks
 * every class (short of `!important`), so a `bottom` in an inline style would leave the computer no
 * offset of its own. `max-shell:bottom-[calc(1rem+env(safe-area-inset-bottom))]` is the upright
 * phone's; `shell:bottom-4` is the computer's (and a phone held sideways, which lands in the desktop
 * shell), applying only at and above the shell breakpoint.
 *
 * THE THREE SWITCHES (CLAUDE.md's Layout section), applied here: width (`max-shell:`/`shell:`)
 * picks the offset, because which offset is right depends on the layout — whether the controls run
 * to the window's bottom under the pair (stacked) or the pair floats over the drawing card (desktop); pointer (`coarse:`) picks a button's size, 40px for a mouse or 44px for a finger,
 * on any width; height picks nothing here. So a touch laptop, or a phone held sideways (which
 * lands in the desktop shell), gets 44px buttons in the 16px corner, as it should.
 *
 * `pointer-events-none` on the wrapper, `pointer-events-auto` on each button only, means the gap
 * around and between the two buttons passes a tap or click straight through to whatever is
 * underneath — this pair never swallows an input it isn't sitting directly on.
 *
 * `data-print-hide` matters for the same reason every other piece of phone chrome carries it — the
 * Summary screen prints, and a floating round button on a printed order form would be a real
 * defect. `data-print-hide` is honoured only by the Summary's and RAILS' own print stylesheets
 * (quick 260930-lo8 measured that a print of TEMPLATE still carried the pair), so the wrapper also
 * carries Tailwind's own `print:hidden`, which hides it on every printout from any screen.
 *
 * WHY THE FILE, EXPORT AND ATTRIBUTE KEEP THEIR PHONE-ERA NAMES even though the pair now serves
 * every width: the worktree merge guard this task runs under refuses any deletion, and three
 * browser specs locate the pair by `data-phone-undo-bar` — renaming any of the three would be a
 * bigger, unrelated change than this task's job.
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
      className="pointer-events-none fixed right-4 z-40 flex items-center gap-2 max-shell:bottom-[calc(1rem+env(safe-area-inset-bottom))] shell:bottom-4 print:hidden"
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
