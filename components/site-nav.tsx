"use client";

/**
 * Top nav shared by the whole app (mounted once in app/layout.tsx), so a shaper can move between
 * the setup screen, the outline editor, the rail band calculator, the volume estimator, the fin
 * placement screen and the summary dashboard entirely via client-side navigation — never by
 * editing the URL, which would drop the in-memory board (no persistence until Phase 2). The SHAPER
 * wordmark links back to `/` for the same reason. Client component because it reads the active
 * path (usePathname) to highlight the current link.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsMenu } from "@/components/settings-menu";

const NAV_LINKS = [
  { href: "/design/outline", label: "TEMPLATE" },
  { href: "/design/rails", label: "RAILS" },
  { href: "/design/volume", label: "VOLUME" },
  { href: "/design/fins", label: "FINS" },
  { href: "/design/summary", label: "SUMMARY" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      data-print-hide
      className="flex flex-none items-center justify-between gap-10 border-b border-surf-line-faint bg-surf-base px-12 py-6"
    >
      <Link
        href="/"
        className="text-sm font-extrabold tracking-architectural text-surf-black transition-colors hover:text-surf-accent-cyan-ink"
      >
        SHAPER
      </Link>
      <div className="flex items-center gap-5">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                "border-b-2 pb-0.5 text-xs font-bold tracking-architectural uppercase transition-colors " +
                (active
                  ? "border-surf-accent-cyan text-surf-black"
                  : "border-transparent text-surf-muted hover:text-surf-black")
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
        <SettingsMenu />
      </div>
    </nav>
  );
}
