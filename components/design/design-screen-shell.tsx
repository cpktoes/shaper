"use client";

import type { ReactNode } from "react";
import { StepNav } from "@/components/design/step-nav";
import { SiteFooter } from "@/components/site-footer";

/**
 * The one layout every design screen (TEMPLATE, ROCKER, RAILS, VOLUME, FINS) is built on: a
 * control sidebar beside a drawing on a desktop screen, and the same two pieces stacked — drawing
 * pinned across the top, controls scrolling beneath it — on a phone. Before this component the
 * sidebar-beside-canvas layout was hand-copied into all five editors with zero breakpoints, so
 * fixing the phone layout meant fixing it five times. Now it is written once here, and a desktop
 * shaper sees byte-for-byte what they always have: every phone rule below is an ADDITIVE
 * `max-shell:` override layered on the unprefixed desktop base, gated on the `max-shell`/`shell`
 * custom variants declared in `app/globals.css` — a single width test at 820px (D-10, 10-SWEEP-2.md,
 * 2026-09-11: the shaper's own decision, reverting the width-and-height version 10-05 tried and
 * withdrew) — never a second branch, never a default flip a desktop mouse could ever trigger.
 *
 * Two structural exceptions this file must never lose, because they are what let RAILS and FINS
 * fit the same shell without editing it:
 *   - `printHide` puts `data-print-hide` on the root, so a screen whose own print path lives
 *     outside this shell (RAILS' View Full Sized dialog) can hide the whole shell from paper.
 *   - `outsideColumns` renders as a SIBLING of the two-column root, not inside either column — for
 *     content that must not be clipped or scrolled by either the sidebar or the canvas (FINS'
 *     ToeAimTableModal).
 *
 * `phonePinned` decides how tall the pinned drawing area may grow on a phone before the controls
 * take the rest of the screen as the page's one scroller; `"none"` means there is nothing to pin
 * at all (VOLUME, the RAILS INSTRUCTIONS tab) and the whole shell becomes one vertical scroller
 * instead, with the drawing (or read-only content) simply first in that scroll order.
 */

export type PhonePinned = "66dvh" | "55dvh" | "50dvh" | "none";

export interface DesignScreenShellProps {
  /** The sidebar body — a screen's own control column (sliders, typed fields, toggles). */
  controls: ReactNode;
  /** The main working area — normally a `TabbedPanel` wrapping the screen's drawing. */
  canvas: ReactNode;
  /** Hides the sidebar entirely so `canvas` gets the full width. Outline/rocker only. */
  wideView?: boolean;
  /** The dev-only "Copy preset values" row, pinned below the scrolling controls. */
  sidebarFooter?: ReactNode;
  /** Content rendered as a sibling of the two-column root — FINS' `ToeAimTableModal`. */
  outsideColumns?: ReactNode;
  /** Sets `data-print-hide` on the root — RAILS, whose own print path lives outside this shell. */
  printHide?: boolean;
  /** VOLUME's aside: one scrolling box with no inner scroll div and no dev footer. */
  simpleSidebar?: boolean;
  /** How tall the pinned drawing may grow on a phone, or `"none"` for a single scrolling column. */
  phonePinned?: PhonePinned;
}

/**
 * Tailwind cannot see an interpolated class name, so the pinned-height class for each
 * `phonePinned` value is a complete literal string here, never built by concatenation.
 */
const PHONE_PINNED_MAX_HEIGHT_CLASS: Record<Exclude<PhonePinned, "none">, string> = {
  "66dvh": "max-shell:max-h-[66dvh]",
  "55dvh": "max-shell:max-h-[55dvh]",
  "50dvh": "max-shell:max-h-[50dvh]",
};

export function DesignScreenShell({
  controls,
  canvas,
  wideView = false,
  sidebarFooter,
  outsideColumns,
  printHide = false,
  simpleSidebar = false,
  phonePinned = "66dvh",
}: DesignScreenShellProps) {
  const nonePinned = phonePinned === "none";

  const rootClassName = nonePinned
    ? "flex min-h-0 w-full flex-1 flex-nowrap max-shell:flex-col max-shell:overflow-y-auto"
    : "flex min-h-0 w-full flex-1 flex-nowrap max-shell:flex-col";

  // `simpleAsideBase`/`nonSimpleAsideBase` are byte-identical to what `asideClassName` used to
  // compute unconditionally — `wideView` only ever layers an ADDITIVE transform on top of one of
  // these four literal strings (below), never edits them, so a desktop baseline with `wideView`
  // false renders exactly the classes it always has.
  const simpleAsideBase = nonePinned
    ? "h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] overflow-y-auto border-r border-surf-line-faint bg-surf-sidebar p-10 text-surf-ink " +
      "max-shell:order-last max-shell:h-auto max-shell:flex-none max-shell:w-full max-shell:max-w-none max-shell:basis-auto max-shell:border-r-0 max-shell:border-t max-shell:overflow-visible"
    : // simpleSidebar && !nonePinned: no current caller exercises this combination (VOLUME, the
      // only `simpleSidebar` caller, always pairs it with `phonePinned="none"`) — kept, not
      // deleted, for a future caller that might.
      "h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] overflow-y-auto border-r border-surf-line-faint bg-surf-sidebar p-10 text-surf-ink " +
      "max-shell:order-last max-shell:h-auto max-shell:w-full max-shell:max-w-none max-shell:basis-auto max-shell:border-r-0 max-shell:border-t";

  const nonSimpleAsideBase = nonePinned
    ? "flex h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] flex-col border-r border-surf-line-faint bg-surf-sidebar text-surf-ink " +
      "max-shell:order-last max-shell:h-auto max-shell:min-h-0 max-shell:flex-none max-shell:w-full max-shell:max-w-none max-shell:basis-auto max-shell:border-r-0 max-shell:border-t max-shell:overflow-visible"
    : "flex h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] flex-col border-r border-surf-line-faint bg-surf-sidebar text-surf-ink " +
      "max-shell:order-last max-shell:h-auto max-shell:min-h-0 max-shell:flex-1 max-shell:w-full max-shell:max-w-none max-shell:basis-auto max-shell:border-r-0 max-shell:border-t max-shell:overflow-y-auto";

  // 09-REVIEW.md CR-01: the aside is now ALWAYS in the tree (see the return statement below) —
  // a phone has no concept of "widening the canvas" (it's already full width), so removing this
  // element outright when `wideView` is true would strip a phone shaper's only reachable
  // controls, with no way back. `wideView` still hides the whole sidebar on DESKTOP (its actual,
  // only job), but purely via an additive CSS swap here, never a second conditional branch that
  // could also fire below the shell breakpoint:
  //   - the non-simple base's own leading class IS its display rule (`flex`) — swap only that
  //     one token for `hidden` (the two are never both present on the element) and add a
  //     `max-shell:flex` override that restores it below the shell breakpoint.
  //   - the simple base carries no display class of its own (an `<aside>` is block by default),
  //     so its own hidden/shown pair is simply appended: `hidden max-shell:block`.
  const asideClassName = simpleSidebar
    ? wideView
      ? `${simpleAsideBase} hidden max-shell:block`
      : simpleAsideBase
    : wideView
      ? `hidden ${nonSimpleAsideBase.slice("flex ".length)} max-shell:flex`
      : nonSimpleAsideBase;

  // Phase 13 item 13's fix (2026-10-03, found by walking the live site by machine): on an upright
  // phone the controls END with extra room, so the last row can always be scrolled clear of the
  // floating Undo/Redo pair. Before this, ROCKER's Tail Thinning Starts row — then the last control
  // on the screen, its Automatic button right-aligned exactly where the pair floats — ended under
  // the Redo button with nothing below it to scroll it clear, so the button could not be tapped.
  // Since quick 261003-q2c the last row was the Back and Next pair; since quick 261006-fom (D-03) it
  // is the site footer under that pair — the copyright line with its Terms and Privacy links — and
  // the arithmetic is the same: whatever is last, it ends 68px plus the inset up.
  //
  // The numbers since quick 261003-q2f, which removed the old bottom tab bar: this scroller now runs
  // to the window's bottom edge, and the pair (`phone-undo-bar.tsx`) sits 16px plus the home-bar
  // inset above that edge, 44px tall on a touch screen — so its top is 60px plus the inset up. The
  // last row must end 68px plus the inset up, 8px of daylight: the scroller's 16px of bottom padding
  // plus this block's 52px plus the inset (`calc(3.25rem+env(safe-area-inset-bottom))`). (It was
  // 48px when the pair sat 12px above the old 56px tab bar.) VOLUME's simpler sidebar and the
  // Summary's order form carry the same room their own way and move together with this one.
  //
  // The room is an empty `::after` block at the end of the scrolling content, NOT more bottom
  // padding, on purpose. `max-shell:pb-16` was tried first and failed 26 of the iPhone project's
  // ROCKER tests: on a short phone this box's window can be shorter than 80px (it is 57px on the
  // dev server at 390x664, under a 66dvh drawing), and once its padding is taller than the window
  // its content box is empty — at which point WebKit treats everything inside as fully clipped and
  // `innerText` reads "" for every control in the column. A block at the end of the content adds
  // the same room to the scroll and leaves the padding, and so the content box, exactly as it was.
  //
  // It rides the width switch (`max-shell:`) because the pair's own phone position does: the same
  // layout fact, a stacked column running to the window's bottom (CLAUDE.md's Layout section). On a computer, and
  // on a phone held sideways (the desktop shell), the pair floats over the drawing instead and this
  // rule never applies. The dev-only `sidebarFooter` below happens to sit right where the pair
  // floats, which is why no dev-server test could ever see the fault;
  // `e2e/prod/phone-controls-clear-undo.spec.ts` proves the room on a production build.
  const controlsScrollClassName =
    "min-h-0 flex-1 overflow-y-auto p-10 max-shell:p-4 max-shell:after:block max-shell:after:h-[calc(3.25rem+env(safe-area-inset-bottom))] max-shell:after:content-['']";

  // 10-SWEEP-2.md: a phone held SIDEWAYS (about 844x390 on a real iPhone) clears 820px and lands
  // in this desktop branch (D-10), where a real desktop window was always tall enough that nobody
  // noticed this column had no scrollbar. At ~390dvh tall it bites immediately -- RAILS with three
  // sections open pushes content below the fold with nothing to reach it.
  //
  // Shape A (an unconditional `overflow-y-auto`, no height gate) was tried first and reverted: it
  // moved the RAILS and VOLUME desktop screenshot baselines under e2e/*-snapshots/, meaning it
  // changed what a mouse sees even though no scrollbar ever became visible there -- the flex
  // column's own sizing math shifts slightly once it can clip/scroll instead of growing past its
  // box, and that shift reached a real desktop window. Per the standing rule, a moved baseline is
  // the signal to switch shapes, not to re-record it.
  //
  // Shape B, shipped here instead: gate the scroll on `[@media(max-height:500px)]`, this
  // codebase's own existing idiom for "this screen is short" (CLAUDE.md's Layout section;
  // `components/fins/fin-viewer.tsx`'s identical media query). A real desktop window is never
  // under 500px tall, so this rule can never reach a mouse at all -- not "reaches it but draws the
  // same," genuinely never applies -- which is what keeps the screenshot baselines untouched.
  //
  // Phase 13 item 9e (13-SPEC.md, the founder, 2026-09-30: "phone real estate is expensive, we
  // need to save all of it" / "minimize all horizontal space on both phone orientations"), quick
  // 260930-s23, P-1/P-5/P-6: on a phone the drawing's own margin shrinks from the desktop's 12px
  // (upright, `p-3`) or 4px (wide view, `p-1`) down to a 2px rim on every side it can, with the
  // floor set by what has to stay clear, not by a round number. These additive rules ride the
  // SAME two switches CLAUDE.md's Layout section already keeps separate — the short-screen query
  // below for a sideways phone, `max-shell:` further down for an upright one — carrying the SAME
  // values, because both describe the identical thing: "this is a phone, give the drawing the
  // room its frame used to waste." The bottom was first built as the one place the two rules
  // diverged — a 61px sideways band so 9c's floating Undo/Redo pair (16px in from the window's
  // bottom-right corner, 44px tall on a touch screen, `fixed` to the viewport over THIS column in
  // the desktop shell a sideways phone lands in) never covered a chip. The founder chose the plan's
  // Alternative A instead (13-SPEC.md item 9e, 2026-09-30, "1 = alt A"): the bottom is 2px sideways
  // too, every dot going to the drawing, and the pair floats over the drawing's bottom-right corner
  // once there is an edit to take back — on a Pixel 7 sideways that draws TEMPLATE's board 385 long
  // instead of 347 and FINS's tail 200 tall instead of 169. Upright the same pair floats over the
  // CONTROLS column, so nothing changes there. The right edge reads
  // `env(safe-area-inset-right)` rather than a bare 2px: a real iPhone held sideways puts its notch
  // or Dynamic Island at the screen's right edge (this app asks for edge-to-edge rendering,
  // `viewportFit: "cover"`), and the old 38px gutter happened to clear it by accident — a flat 2px
  // would not. The inset is 0 in every test browser and in portrait, so no measured number in this
  // plan's spec moves; on a real sideways iPhone the right padding grows to roughly 47px instead,
  // which is accounted for and accepted (P-6) rather than hidden. A narrow phone held sideways (an
  // iPhone SE or mini, under the 820px shell width) matches BOTH this short-screen query and the
  // `max-shell:` one below; Tailwind writes this file's `[@media(max-height:500px)]:` rules after
  // its `max-shell:` rules in the compiled stylesheet (checked directly), and since Alternative A
  // the two say the same thing on every side, so the order no longer costs that phone anything.
  const mainBase = wideView
    ? "flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-0 bg-surf-canvas p-1 [@media(max-height:500px)]:overflow-y-auto [@media(max-height:500px)]:pt-0.5 [@media(max-height:500px)]:pb-0.5 [@media(max-height:500px)]:pl-0.5 [@media(max-height:500px)]:pr-[max(2px,env(safe-area-inset-right))]"
    : "flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-0 bg-surf-canvas p-3 [@media(max-height:500px)]:overflow-y-auto [@media(max-height:500px)]:pt-0.5 [@media(max-height:500px)]:pb-0.5 [@media(max-height:500px)]:pl-0.5 [@media(max-height:500px)]:pr-[max(2px,env(safe-area-inset-right))]";

  // The phone stack must stay byte-identical to before this fix. Every viewport this project's own
  // Playwright suite exercises under the phone-stack width (< 820px) is also taller than 500px, so
  // the new height-gated rule above never fires there in practice -- but `max-shell:overflow-visible`
  // is added defensively to both branches anyway (previously only the `nonePinned` branch declared
  // it, redundantly, since the base carried no overflow rule at all), so even a hypothetical narrow
  // AND short viewport (an embedded in-app browser, say) cannot change the phone stack's own
  // overflow behaviour.
  //
  // Item 9e (quick 260930-s23, P-1): the old flat `max-shell:p-2` (8px on every side) becomes the
  // same 2px rim the short-screen rule above uses, split the same four ways and for the same
  // reasons — an UPRIGHT phone has no floating pair to clear below this column (it floats over the
  // controls instead, which sort AFTER this element on a phone), so unlike the sideways case the
  // bottom here stays 2px like every other side; the right edge still reads
  // `env(safe-area-inset-right)` for the same notch-at-the-edge reason (P-6), even though a
  // portrait phone's notch sits at the TOP, not a side — the inset is 0 there in practice, so this
  // is a no-op for every real upright phone and costs nothing to keep symmetric with the sideways
  // rule above.
  const mainPhone = nonePinned
    ? "max-shell:order-first max-shell:flex-none max-shell:basis-auto max-shell:pt-0.5 max-shell:pb-0.5 max-shell:pl-0.5 max-shell:pr-[max(2px,env(safe-area-inset-right))] max-shell:h-auto max-shell:overflow-visible"
    : `max-shell:order-first max-shell:flex-none max-shell:basis-auto max-shell:pt-0.5 max-shell:pb-0.5 max-shell:pl-0.5 max-shell:pr-[max(2px,env(safe-area-inset-right))] max-shell:overflow-visible ${PHONE_PINNED_MAX_HEIGHT_CLASS[phonePinned]}`;

  const mainClassName = `${mainBase} ${mainPhone}`;

  return (
    <div
      className={rootClassName}
      data-print-hide={printHide ? true : undefined}
      // 09-REVIEW.md WR-01: which element actually scrolls on a phone depends on `phonePinned`
      // and `simpleSidebar` together, not on `data-design-controls-scroll` alone — see the
      // comment on that attribute below. `data-design-page-scroll` names the one case
      // `data-design-controls-scroll` cannot: `simpleSidebar` + `phonePinned="none"` (VOLUME,
      // its only caller) on a PHONE, where this root div is the whole shell's one scroller.
      data-design-page-scroll={nonePinned ? true : undefined}
    >
      {
        // `data-design-controls-scroll` is a test-only hook — a stable, pixel-inert Playwright
        // locator, the same idiom as `data-drag-target` on the outline/rocker viewers. Which
        // element it names as the scrolling box depends on the mode:
        //   - normally (not `simpleSidebar`): the inner controls div right below, the one
        //     wrapping `{controls}` in the `controlsScrollClassName` branch.
        //   - `simpleSidebar` on DESKTOP: the aside itself (VOLUME has no inner scroll div), so
        //     the attribute moves onto `<aside>` in that branch instead.
        //   - `simpleSidebar` + `phonePinned="none"` on a PHONE (VOLUME again, its only caller):
        //     NEITHER of those scrolls — `asideClassName` ends in `max-shell:overflow-visible`
        //     on purpose — because the shell ROOT div above is the phone's one scroller instead
        //     (`max-shell:overflow-y-auto` in `rootClassName`'s `nonePinned` branch). Naming
        //     `<aside>` as the scroller here would be a lie, so the root instead carries the
        //     second, equally pixel-inert `data-design-page-scroll` hook for exactly this case.
        //     `e2e/phone-screens.spec.ts`'s own VOLUME test reaches this element via its own
        //     `xpath=..` locator rather than either hook, on purpose — not changed here.
      }
      <aside className={asideClassName} data-design-controls-scroll={simpleSidebar ? true : undefined}>
        {simpleSidebar ? (
          <>
            {controls}
            <StepNav />
            {
              // The site footer, the last thing in VOLUME's controls, right after the Back and Next
              // pair (quick 261006-fom, D-03 — it used to be the pair itself, and the room below
              // moved from the pair onto the footer unchanged). The aside's own 40px of padding plus
              // the footer's 28px of bottom padding and the home-bar inset
              // (`max-shell:pb-[calc(1.75rem+...)]`) give 68px plus the inset under it — the same end
              // the other screens' scroller padding and end block give (above), so on an upright
              // phone it scrolls 8px clear of the floating Undo/Redo pair in the window's corner
              // (quick 261003-q2f; it was 24px when the pair sat above the old bottom tab bar). Any
              // change to the pair's phone position must move this number together with that block.
            }
            <SiteFooter className="max-shell:pb-[calc(1.75rem+env(safe-area-inset-bottom))]" />
          </>
        ) : (
          <>
            <div data-design-controls-scroll className={controlsScrollClassName}>
              {controls}
              {
                // The Back and Next pair, then the site footer (quick 261006-fom, D-03), are the end
                // of the controls, so both live inside the scroller: they scroll with them, and the
                // scroller's own end room (above) keeps the footer's links clear of the floating
                // Undo/Redo pair on an upright phone. Never in `sidebarFooter`, never pinned, never
                // in the drawing column.
              }
              <StepNav />
              <SiteFooter />
            </div>
            {sidebarFooter}
          </>
        )}
      </aside>
      <main className={mainClassName}>{canvas}</main>
      {outsideColumns}
    </div>
  );
}
