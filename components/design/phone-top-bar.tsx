"use client";

/**
 * The phone's compact top bar (D-08): the wordmark, the Save control and the one menu button, in
 * one non-wrapping row. Mounted beside the desktop nav row in `components/site-nav.tsx`, shown
 * below the shell breakpoint (`hidden max-shell:flex`) — the two are always both in the
 * server-rendered tree, and the width variant alone decides which paints. Since quick 260930-r8s (Phase 13 item 9d) it is also
 * shown on a short screen, 500 dots tall or less, AT ANY WIDTH — a height-alone media query
 * written inline on the header's own className below, the same inline form
 * `design-screen-shell.tsx`, RAILS and FINS already use — so a phone held sideways gets this one
 * thin line instead of the desktop row, which used to wrap SHAPER ASSISTANT onto two lines there.
 * Now 48 dots (`--phone-top-bar-h`, item 9e, quick 260930-s23, P-7 — was 56), still read from the
 * one token in `app/globals.css`. Wherever this bar draws, its menu opens a sheet that hangs from
 * the bar's own bottom edge and spans the window, starting with the six screen tiles (quick
 * 261003-q2f) — so the header hands itself to the menu as the sheet's anchor.
 *
 * `SaveButton` is reused unchanged — its own four strings (Save, Saving…, Saved, Not saved) are
 * the whole story on a phone too, no phone-specific rewording. Save has always been rendered on
 * `/` too: the desktop nav row already puts `SaveButton` there at every width, so this bar only
 * moves it into the phone chrome, it does not invent new behaviour on that screen.
 *
 * This bar is now mounted on the home screen (`/`) as well as the design screens (260909-hq9), so
 * the wordmark has two faces depending on which page it's on: on `/` a `<Link href="/">` would be
 * a dead tap (it points at the page you're already reading), so it renders as plain text there;
 * everywhere else it stays the link back home it has always been. `WORDMARK_CLASS` is hoisted to
 * one module-level constant precisely so those two branches can never drift apart.
 */

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SaveButton } from "@/components/design/save-button";
import { PhoneMenu } from "@/components/design/phone-menu";
import type { NavLink } from "@/components/site-nav";

/** Deliberately one size smaller than SiteNav's own desktop wordmark class (D-01), now that the
 * name is longer — `tracking-architectural` and the weight still match, so the phone mark keeps
 * the app's one architectural tracking value, and only steps down from `text-sm` to `text-xs`.
 * Measured at planning time on `/design/outline` at 360px with a coarse pointer: the bar's inside
 * width is 328px, its right-hand cluster is 149.0px wide in Save's widest face (`min-w-20`, wider
 * than the everyday filled Save button), and `SHAPER ASSISTANT` at `text-xs` is 150.3px — leaving
 * 28.7px of clear air before Save, more than a same-size alternative would. Hoisted here (rather
 * than inlined twice below) so the linked and plain-text renderings of the mark can never drift. */
const WORDMARK_CLASS = "text-xs font-extrabold tracking-architectural text-surf-ink";

export function PhoneTopBar({ screens }: { screens: readonly NavLink[] }) {
  const pathname = usePathname();
  const onHomeScreen = pathname === "/";
  // The menu's sheet hangs from this header's bottom edge and takes its width (quick 261003-q2f).
  const headerRef = useRef<HTMLElement>(null);

  return (
    <header
      ref={headerRef}
      data-print-hide
      // Item 9e (orchestrator amendment, 2026-09-30, from the planner's own P-13 finding): the
      // flat `px-4` becomes `env(safe-area-inset-left)`/`-right`-aware padding, each floored at
      // the same 1rem (16px) `px-4` always drew — so on a real iPhone held sideways neither the
      // wordmark (left) nor the menu button (right) sits under the notch or Dynamic Island,
      // whichever side it's on. The inset is 0 in every test browser and in portrait, so no
      // measured number in this suite moves; this is the same idea `design-screen-shell.tsx`'s
      // drawing column uses for its own right edge (P-6), applied here to both sides since the
      // bar spans the full window width rather than sitting beside a controls column.
      className="hidden max-shell:flex [@media(max-height:500px)]:flex h-(--phone-top-bar-h) flex-none items-center justify-between border-b border-surf-line-faint bg-surf-ground pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
    >
      {onHomeScreen ? (
        <span className={WORDMARK_CLASS}>SHAPER ASSISTANT</span>
      ) : (
        <Link href="/" className={`${WORDMARK_CLASS} transition-colors hover:text-surf-accent-ink`}>
          SHAPER ASSISTANT
        </Link>
      )}
      <div className="flex items-center gap-3">
        <SaveButton />
        <span aria-hidden className="h-4 w-px bg-surf-line-faint" />
        <PhoneMenu screens={screens} anchor={headerRef} />
      </div>
    </header>
  );
}
