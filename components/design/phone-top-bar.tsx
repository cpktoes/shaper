"use client";

/**
 * The phone's compact top bar (D-08): the wordmark, the Save control and the one menu button, in
 * one non-wrapping row. Mounted beside the desktop nav row in `components/site-nav.tsx`, shown
 * only below the shell breakpoint (`hidden max-shell:flex`) — the two are always both in the
 * server-rendered tree, and the width variant alone decides which paints, exactly like
 * `components/design/phone-tab-bar.tsx`.
 *
 * `SaveButton` is reused unchanged — its own four strings (Save, Saving…, Saved, Not saved) are
 * the whole story on a phone too, no phone-specific rewording.
 */

import Link from "next/link";
import { SaveButton } from "@/components/design/save-button";
import { PhoneMenu } from "@/components/design/phone-menu";

export function PhoneTopBar() {
  return (
    <header
      data-print-hide
      className="hidden max-shell:flex h-14 flex-none items-center justify-between border-b border-surf-line-faint bg-surf-ground px-4"
    >
      {/* Same wordmark class string as SiteNav's own — copied, not approximated. */}
      <Link
        href="/"
        className="text-sm font-extrabold tracking-architectural text-surf-ink transition-colors hover:text-surf-accent-ink"
      >
        SHAPER
      </Link>
      <div className="flex items-center gap-3">
        <SaveButton />
        <span aria-hidden className="h-4 w-px bg-surf-line-faint" />
        <PhoneMenu />
      </div>
    </header>
  );
}
