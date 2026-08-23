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
      className="flex flex-none items-center gap-10 border-b border-surf-muted/20 bg-surf-base px-12 py-6"
    >
      <Link
        href="/"
        className="text-sm font-extrabold tracking-architectural text-surf-black transition-colors hover:text-outline-accent"
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
                  ? "border-outline-accent text-outline-accent"
                  : "border-transparent text-surf-muted hover:text-outline-accent")
              }
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
