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

/** The six design screens, in order — the one copy every reader shares, so the labels and order can
 * never drift: the desktop row below, the phone menu's six screen tiles (handed this same list as a
 * prop by this file, see the `PhoneTopBar` mount below; quick 261003-q2f) and the Back and Next
 * pair at the end of each screen's controls (`step-nav.tsx`). */
export const NAV_LINKS = [
  { href: "/design/outline", label: "TEMPLATE" },
  { href: "/design/rocker", label: "ROCKER" },
  { href: "/design/rails", label: "RAILS" },
  { href: "/design/volume", label: "VOLUME" },
  { href: "/design/fins", label: "FINS" },
  { href: "/design/summary", label: "SUMMARY" },
] as const;

/** One entry of NAV_LINKS, exported so `components/design/phone-menu.tsx` can type the `screens`
 * prop it receives without re-deriving the shape itself (quick 260930-r8s). */
export type NavLink = (typeof NAV_LINKS)[number];

/** Below the shell breakpoint, every page the app draws uses the phone's top bar — there is no
 * fixed list of addresses this applies to, because the not-found page can sit at any address
 * (P-2, quick 260930-fjm). Its menu opens the six screen tiles on every page, so no page needs a
 * bar of its own (the old bottom tab bar each page used to mount was removed in quick
 * 261003-q2f). Before this change a mistyped address gave a phone the desktop link row squeezed
 * into its width, with no phone top bar at all (measured 2026-09-30, quick 260930-fjm).
 *
 * Since quick 260930-r8s (Phase 13 item 9d, the founder: "On horizontal phone, we need to reduce
 * the nav bar to one thin line... so that Shaper Assistant does wrap[sic, doesn't wrap]") this row
 * also hides on a short screen, 500 dots tall or less, AT ANY WIDTH — not only below the shell
 * breakpoint — and the phone's thin bar takes its place there too. That is CLAUDE.md's third
 * switch: width alone picks the LAYOUT (the desktop shell stays, so a sideways phone keeps its
 * controls beside the board), pointer alone picks a control's SIZE, and screen height alone
 * decides what a short screen does — written inline as `[@media(max-height:500px)]`, exactly as
 * `design-screen-shell.tsx`, RAILS and FINS already do, never as a named variant. A real desktop
 * window is never under 500 dots tall, so a mouse never sees this. Measured before this change: at
 * 844x390 (a real iPhone sideways) and 863x360 (a real Pixel 7 sideways) this row drew 93 dots
 * tall in the test harness (about 105 on the live site, where Clerk's real account button is
 * wider than the harness's signed-out stand-in) with SHAPER ASSISTANT wrapped onto two lines; the
 * phone's bar draws 56 dots with the name on one line.
 *
 * The row's side margins are 24 dots up to 1279 wide and 48 from 1280 (`xl:px-12`). They used to
 * widen at 1024 (`lg:px-12`); keeping them at 24 up to 1279 is what makes room for the Home house
 * from 1024 up (see the house's own comment below; the founder, 2026-10-04). */
const DESKTOP_NAV_CLASS =
  "flex flex-none items-center justify-between gap-10 border-b border-surf-line-faint bg-surf-ground px-6 py-6 xl:px-12 max-shell:hidden [@media(max-height:500px)]:hidden";

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
              chrome. Shown from 1024px up (the founder, 2026-10-04, after an iPad 9th gen held
              sideways showed none): an iPad held sideways is 1024 to 1194 wide — 1080 on that
              iPad, 1133 on an iPad mini, 1024 on older models — so every iPad on its side gets
              the house. It used to start at 1280. Held upright, that iPad is 810 wide and gets
              the phone's top bar, whose menu has its own Home row. The room comes from the row's
              side margins staying at 24px up to 1279 (`xl:px-12` above): at 1024 that leaves
              SHAPER ASSISTANT on one line with 38px to spare beyond the 40px gap (measured on the
              live site, signed out, mouse and touch alike). Below 1024 — a narrow but tall
              window, 820 to 1023 wide, or an 11-inch iPad held upright — the wordmark stays the
              way home, since at 820 the cluster already ends at the padding edge with the
              wordmark wrapped onto two lines. (A phone held sideways never reaches this row:
              since quick 260930-r8s it gets the phone's thin bar, where Home is the wordmark and
              the menu's own Home row.) */}
          <Link
            href="/"
            aria-label="Home"
            className="hidden lg:flex -mr-1 cursor-pointer items-center rounded-md p-1 text-surf-ink-muted transition-colors outline-none hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink"
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
          of them, and (since quick 260930-r8s, item 9d) on a short screen at ANY width, replacing
          the desktop row there too. Both are always in the server-rendered tree; CSS alone decides
          which paints, so the first frame is right on every device with no JavaScript check.
          `NAV_LINKS` is handed down as a prop rather than imported back inside `PhoneTopBar` (which
          mounts the menu that needs it): the menu lives inside the component this file already
          imports, so importing the list from there too would form an import loop. Handing it down
          keeps one list and no loop. */}
      <PhoneTopBar screens={NAV_LINKS} />
    </>
  );
}
