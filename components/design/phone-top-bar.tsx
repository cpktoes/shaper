"use client";

/**
 * The phone's compact top bar (D-08): the wordmark, the Save control and the one menu button, in
 * one non-wrapping row. Mounted beside the desktop nav row in `components/site-nav.tsx`, shown
 * below the shell breakpoint (`hidden max-shell:flex`) — the two are always both in the
 * server-rendered tree, and the width variant alone decides which paints. Since quick 260930-r8s (Phase 13 item 9d) it is also
 * shown on a short screen, 500 dots tall or less, AT ANY WIDTH — a height-alone media query
 * written inline on the header's own className below, the same inline form
 * `design-screen-shell.tsx`, RAILS and FINS already use — so a phone held sideways gets this one
 * thin line instead of the desktop row, which used to wrap the app's name onto two lines there.
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
 * a dead tap (it points at the page you're already reading), so it renders as a plain picture there;
 * everywhere else it stays the link back home it has always been. `WORDMARK_CLASS` is hoisted to
 * one module-level constant precisely so those two branches can never drift apart.
 */

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SaveButton } from "@/components/design/save-button";
import { PhoneMenu } from "@/components/design/phone-menu";
import type { NavLink } from "@/components/site-nav";
import { Wordmark } from "@/components/wordmark";

/** The founder's logo in the phone's bar (quick 261010-km7, D-14), sized by the room the bar has
 * rather than by a font. Its width is the window's width less 201 dots, and never more than
 * 175.4 dots, the size the logo draws on a computer — so the brand is one size wherever it has
 * room, and in this 48-dot bar a 21.8-dot-tall logo is already half the height of the 44-dot
 * controls beside it; any larger would crowd the bar. The 201 is the bar's two 16-dot side
 * paddings, plus the right-hand cluster at 149.0 dots (measured at planning time with a touch
 * pointer, in Save's widest face, `min-w-20`, wider than the everyday filled Save button), plus
 * Save's 20 dots of clear air (the rule `e2e/phone-layout.spec.ts` has always held). In round
 * numbers: 159.0 dots wide at 360, 174.0 at 375, 175.4 from 377 up and on every sideways or
 * short-screen bar. With "Unlock" showing (82.7 wide, a cluster of 151.7) the air is 17.3 at 360,
 * 30.9 at 390 and 52.9 at 412, all above that button's own 8-dot floor
 * (`e2e/board-lock.spec.ts`). The 5.37rem floor is the 85.9 dots the old name's narrowest
 * two-line shape took, so below 287 dots wide it still shrinks to fit as the name did. The
 * `.com` at the end stands 3.6 dots tall at 360 and 4.0 at the full size. Hoisted here (rather
 * than inlined twice below) so the linked and plain renderings of the logo can never drift. The
 * colour is `text-surf-ink`: the logo is drawn in whatever ink surrounds it, so each theme's own
 * ink follows with nothing else to say. */
const WORDMARK_CLASS = "block w-[min(10.9625rem,100vw_-_12.5625rem)] min-w-[5.37rem] text-surf-ink";

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
        <span className={WORDMARK_CLASS}>
          <Wordmark className="block h-auto w-full" />
        </span>
      ) : (
        <Link href="/" className={`${WORDMARK_CLASS} transition-colors hover:text-surf-accent-ink`}>
          <Wordmark className="block h-auto w-full" />
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
