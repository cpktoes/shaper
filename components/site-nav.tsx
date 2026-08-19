"use client";

/**
 * Top nav shared by every screen under app/design/*, so a shaper can move between the outline
 * editor, the rail band calculator, the volume estimator, the fin placement screen and the
 * summary dashboard without editing the URL. Client component because it reads the active path
 * (usePathname) to highlight the current link.
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
    <nav className="flex flex-none items-center gap-6 border-b border-outline-sidebar-divider bg-outline-sidebar-bg px-6 py-3">
      <span className="text-sm font-extrabold tracking-[0.15em] text-outline-sidebar-text">SHAPER</span>
      <div className="flex items-center gap-5">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                "border-b-2 pb-0.5 text-xs font-bold tracking-[0.15em] uppercase transition-colors " +
                (active
                  ? "border-outline-accent text-outline-accent"
                  : "border-transparent text-outline-sidebar-text-muted hover:text-outline-accent")
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
