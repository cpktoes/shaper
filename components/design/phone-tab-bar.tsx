"use client";

/**
 * The bottom tab bar (D-06/D-07): the app's six design screens under the thumb on a phone, one
 * tap away, mirroring what the desktop top nav already does for the same six routes. Mounted once
 * in `app/design/layout.tsx` as the last child, so it appears on every design screen and nowhere
 * else (the setup screen and the rack are Phase 10's).
 *
 * Shown only below the shell breakpoint (`hidden max-shell:flex`) — the desktop top nav is the
 * only navigation at and above it, hidden by the matching `max-shell:hidden` rule on its own
 * link row in `components/site-nav.tsx`. Both are always in the server-rendered tree; the width
 * variant alone decides which paints, so there is no JavaScript width check and no flash between
 * layouts on any device.
 *
 * Labels come from `NAV_LINKS`, exported by `site-nav.tsx` — never re-typed here — so the six
 * words and their order can never drift between the desktop nav and this bar.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/components/site-nav";

export function PhoneTabBar() {
  const pathname = usePathname();

  return (
    <nav
      data-print-hide
      aria-label="Screens"
      className="hidden max-shell:flex h-14 flex-none items-stretch border-t border-surf-line-faint bg-surf-panel px-2"
      // The bar is bottom-anchored, so its own height (h-14, 56px) never sits inside the
      // home-indicator area — the safe-area inset is ADDITIONAL space beneath the 56px content,
      // not a shrink of it. viewportFit: "cover" in app/layout.tsx is what makes this padding do
      // anything at all.
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Each tab keeps its label whole (`min-w-fit`), so the row can only fit a 360px phone if
          the six labels plus their padding stay inside the bar. Measured at 360px: with 4px of
          padding a side the row ran 4px past the screen edge and the whole page scrolled
          sideways; at 2px a side it fits with about 12px to spare, and the narrowest tab still
          clears 44px. Wider phones share the slack out through `flex-1` as before. */}
      {NAV_LINKS.map((link) => {
        const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              "flex min-w-fit flex-1 items-center justify-center border-t-2 px-0.5 text-center text-[11px] font-bold tracking-[0.1em] uppercase transition-colors " +
              (active
                ? "border-surf-accent text-surf-ink"
                : "border-transparent text-surf-ink-muted hover:text-surf-ink")
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
