"use client";

/**
 * Top nav shared by the whole app (mounted once in app/layout.tsx), so a shaper can move between
 * the setup screen, the outline editor, the rail band calculator, the volume estimator, the fin
 * placement screen and the summary dashboard entirely via client-side navigation, never by
 * editing the URL. An anonymous or never-saved board still lives only in the design store's
 * memory, so a hard navigation would drop it — but a saved board on a signed-in shaper's account
 * now survives one, since it autosaves to Postgres regardless of how the shaper moves between
 * screens. The SHAPER ASSISTANT wordmark links back to `/` for the same client-side-navigation
 * reason.
 * Client component because it reads the active path (usePathname) to highlight the current link,
 * and mounts the nav's right-hand chrome cluster: the settings menu, the Save control (D-05), and
 * the sign-in/account control (D-02).
 */

import Link from "next/link";
import { HouseIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { SettingsMenu } from "@/components/settings-menu";
import { NavAuthControl } from "@/components/auth/nav-auth-control";
import { SaveButton } from "@/components/design/save-button";
import { PhoneTopBar } from "@/components/design/phone-top-bar";

/** Exported so `components/design/phone-tab-bar.tsx` reads the same six words and order rather
 * than re-declaring them — the labels can never drift between the desktop nav and the phone tab
 * bar because there is only one copy. */
export const NAV_LINKS = [
  { href: "/design/outline", label: "TEMPLATE" },
  { href: "/design/rocker", label: "ROCKER" },
  { href: "/design/rails", label: "RAILS" },
  { href: "/design/volume", label: "VOLUME" },
  { href: "/design/fins", label: "FINS" },
  { href: "/design/summary", label: "SUMMARY" },
] as const;

/** Below the shell breakpoint, every page the app draws uses the phone's top bar — there is no
 * fixed list of addresses this applies to, because the not-found page can sit at any address
 * (P-2, quick 260930-fjm). Each page mounts its own bottom tab bar as its own last child instead:
 * app/page.tsx, app/design/layout.tsx, the Contact and Privacy pages, app/not-found.tsx and
 * app/error.tsx. Before this change a mistyped address gave a phone the desktop link row squeezed
 * into its width, with no phone top bar at all (measured 2026-09-30, quick 260930-fjm). */
const DESKTOP_NAV_CLASS =
  "flex flex-none items-center justify-between gap-10 border-b border-surf-line-faint bg-surf-ground px-6 py-6 lg:px-12 max-shell:hidden";

export function SiteNav() {
  const pathname = usePathname();

  return (
    <>
      <nav data-print-hide className={DESKTOP_NAV_CLASS}>
        <Link
          href="/"
          className="text-sm font-extrabold tracking-architectural text-surf-ink transition-colors hover:text-surf-accent-ink"
        >
          SHAPER ASSISTANT
        </Link>
        <div className="flex items-center gap-4 lg:gap-5">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  "border-b-2 pb-0.5 text-xs font-bold tracking-architectural uppercase transition-colors " +
                  (active
                    ? "border-surf-accent text-surf-ink"
                    : "border-transparent text-surf-ink-muted hover:text-surf-ink")
                }
              >
                {link.label}
              </Link>
            );
          })}
          {/* Sits inside the same right-hand cluster as the screen links, separated by a rule
              rather than by distance: it is chrome, not a sixth screen, so it should read as a
              different kind of thing without drifting away from the group. */}
          <span aria-hidden className="ml-1 h-4 w-px bg-surf-line-faint" />
          {/* A way home that isn't the wordmark, sitting beside the gear as the same kind of
              chrome. Shown only from 1280px up: at 1024px (the touch-tablet band) the row has
              48px of headroom and e2e/site-nav-width.spec.ts guards a 24px floor, and at
              820–863px (a phone held sideways) the cluster already ends at the padding edge —
              so below 1280 the wordmark stays the way home, exactly as before. */}
          <Link
            href="/"
            aria-label="Home"
            className="hidden xl:flex -mr-1 cursor-pointer items-center rounded-md p-1 text-surf-ink-muted transition-colors outline-none hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink"
          >
            <HouseIcon aria-hidden className="size-4" />
          </Link>
          <SettingsMenu />
          {/* Save (D-05) and the auth control (D-02) share this cluster, both chrome rather than
              a design screen, in the order a shaper acts: save the work, then who's signed in. */}
          <span aria-hidden className="h-4 w-px bg-surf-line-faint" />
          <SaveButton />
          <NavAuthControl />
        </div>
      </nav>
      {/* The phone's compact top bar (D-08) — a sibling of the desktop row above, shown on every
          address below the shell breakpoint (P-2), since the not-found page can render at any
          of them. Both are always in the server-rendered tree; the CSS width variant on each
          decides which paints, so the first frame is right on every device with no JavaScript
          check. */}
      <PhoneTopBar />
    </>
  );
}
