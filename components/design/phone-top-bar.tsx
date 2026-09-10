"use client";

/**
 * The phone's compact top bar (D-08): the wordmark, the Save control and the one menu button, in
 * one non-wrapping row. Mounted beside the desktop nav row in `components/site-nav.tsx`, shown
 * only below the shell breakpoint (`hidden max-shell:flex`) — the two are always both in the
 * server-rendered tree, and the width variant alone decides which paints, exactly like
 * `components/design/phone-tab-bar.tsx`.
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

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SaveButton } from "@/components/design/save-button";
import { PhoneMenu } from "@/components/design/phone-menu";

/** Deliberately one size smaller than SiteNav's own desktop wordmark class (D-01), now that the
 * name is longer — `tracking-architectural` and the weight still match, so the phone mark keeps
 * the app's one architectural tracking value, and only steps down from `text-sm` to `text-xs`.
 * Measured at planning time on `/design/outline` at 360px with a coarse pointer: the bar's inside
 * width is 328px, its right-hand cluster is 149.0px wide in Save's widest face (`min-w-20`, wider
 * than the everyday filled Save button), and `SHAPER ASSISTANT` at `text-xs` is 150.3px — leaving
 * 28.7px of clear air before Save, more than a same-size alternative would. Hoisted here (rather
 * than inlined twice below) so the linked and plain-text renderings of the mark can never drift. */
const WORDMARK_CLASS = "text-xs font-extrabold tracking-architectural text-surf-ink";

export function PhoneTopBar() {
  const pathname = usePathname();
  const onHomeScreen = pathname === "/";

  return (
    <header
      data-print-hide
      className="hidden max-shell:flex h-14 flex-none items-center justify-between border-b border-surf-line-faint bg-surf-ground px-4"
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
        <PhoneMenu />
      </div>
    </header>
  );
}
