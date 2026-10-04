"use client";

/**
 * D-08's "one menu": the phone top bar's single icon button that holds everything the desktop nav
 * spreads across three chrome pieces — the settings gear (Units, Theme) and the account control —
 * in ONE Base UI popup, stacked, not a button that opens a chooser of two menus. Built directly on
 * Base UI's `Menu` primitives, the same way `components/settings-menu.tsx` is — not any of the
 * three shadcn overlay wrappers this codebase deliberately keeps out of `components/ui/*`.
 *
 * `SettingsMenuContent` is `settings-menu.tsx`'s own popup content, reused here rather than
 * copied, so the Units/Theme rows can never drift between the desktop gear menu and this one.
 * `NavAuthControl` is the same account control the desktop nav renders — either a plain "Sign in"
 * button or Clerk's own self-contained account button, both safe to mount inside another popup's
 * content. Phase 10 owns testing the account flows that open from inside it.
 *
 * Quick 260929-u1t (P-1) adds `ContactMenuItem`, and quick 260930-03d adds `PrivacyMenuItem` right
 * after it — both the same shared rows the desktop gear menu renders — grouped with Home as this
 * popup's three "go to a page" rows: Home (hidden on `/`), Contact (hidden on `/contact`), Privacy
 * (hidden on `/privacy`), then ONE unconditional divider before the settings content. No two of
 * those three ever hide at once (each hides only on its own route), so the divider is always doing
 * real work separating at least one visible row from the settings below it.
 *
 * Since quick 261003-q2f (sketch 007's C1; the founder: "build it now, use on all screens that
 * condense the top bar into a menu") the popup is a SHEET whose first items are the six screen tiles
 * (`components/design/screen-tiles.tsx`) — a small picture of the current board as each screen draws
 * it, the screen's name and one line — wherever this menu shows: an upright phone, and any short
 * screen such as a phone held sideways. The rows that were already here follow, unchanged. The same
 * quick task removed the old bottom tab bar, so on a phone the tiles are how a shaper jumps between
 * screens, and the Back and Next pair at the end of each screen's controls is the usual walk.
 * `screens` is handed down from `site-nav.tsx` via `PhoneTopBar`, never imported directly here, so
 * the one `NAV_LINKS` list and this menu can never form an import loop.
 *
 * The sheet is placed by Base UI itself, with no new primitive: `Menu.Positioner` is anchored to the
 * top bar's own `<header>` (handed in as `anchor`), on its bottom side, start-aligned, with no
 * offset, no collision padding and no flipping or shifting — so it hangs exactly under the 48-dot
 * bar from the window's left edge — and the popup takes Base UI's own `--anchor-width` (the bar spans
 * the window, so the sheet does too) and `--available-height` (the room down to the window's bottom),
 * scrolling inside itself when its rows run past that, as the menu always has on a phone (quick
 * 260926-wmf). Arrow keys, Escape and a tap outside behave as in any menu here.
 */

import type { RefObject } from "react";
import { Menu } from "@base-ui/react/menu";
import { HouseIcon, MenuIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ContactMenuItem, PrivacyMenuItem, SettingsMenuContent } from "@/components/settings-menu";
import { NavAuthControl } from "@/components/auth/nav-auth-control";
import { ScreenTiles } from "@/components/design/screen-tiles";
import type { NavLink } from "@/components/site-nav";

export function PhoneMenu({
  screens,
  anchor,
}: {
  screens: readonly NavLink[];
  /** The top bar's own header — the sheet hangs from its bottom edge and takes its width. */
  anchor: RefObject<HTMLElement | null>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <Menu.Root>
      <Menu.Trigger
        // Icon-only, so it needs an accessible name — there is no visible text to borrow.
        aria-label="Menu"
        // 32px at rest matches Button's own `icon` variant; the touch-pointer variant below
        // grows it to 44px so a finger gets the full target without the icon looking oversized
        // to a mouse user who happens to be at phone width (a touchscreen laptop, or a resized
        // desktop browser).
        className="flex size-8 coarse:size-11 cursor-pointer items-center justify-center rounded-md text-surf-ink-muted transition-colors outline-none hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink data-popup-open:text-surf-ink"
      >
        <MenuIcon aria-hidden className="size-5" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          anchor={anchor}
          side="bottom"
          align="start"
          sideOffset={0}
          collisionPadding={0}
          collisionAvoidance={{ side: "none", align: "none" }}
          className="isolate z-50"
        >
          {/* The sheet (see the doc comment above): the window's width under the bar, no taller than
              the room below it, scrolling inside itself past that. The safe-area insets keep a real
              iPhone's notch and home bar off the tiles and rows; they are 0 everywhere else. */}
          <Menu.Popup className="max-h-(--available-height) w-(--anchor-width) overflow-y-auto overscroll-contain border-b border-surf-line-faint bg-surf-panel pt-3 pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] shadow-lg outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-2 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-top-2">
            {/* The six screens as pictures of the current board, first wherever this menu shows. */}
            <ScreenTiles screens={screens} />
            {/* Ten dots of air, no divider, between the tiles and the rows. */}
            <div aria-hidden className="h-2.5" />
            {/* A way back to the home screen from any design screen — the phone has no
                wordmark row to tap, so the menu carries it. Hidden on the home screen itself,
                where it would only close the menu. router.push keeps the board in memory (a hard
                navigation would drop the design store). Row sizing matches rack-card-menu.tsx's
                ROW_CLASS: 44px tall under a touch pointer, today's height for a mouse. No divider
                of its own — quick 260929-u1t moved the one divider below Contact, so Home and
                Contact read as one group of "go to a page" rows. */}
            {pathname !== "/" && (
              <Menu.Item
                onClick={() => router.push("/")}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-surf-ink outline-none select-none coarse:min-h-11 data-highlighted:bg-surf-well"
              >
                <HouseIcon aria-hidden className="size-4 text-surf-ink-muted" />
                Home
              </Menu.Item>
            )}
            <ContactMenuItem />
            <PrivacyMenuItem />
            <div aria-hidden className="mx-2 my-1.5 border-t border-surf-line-faint" />
            <SettingsMenuContent />
            {/* No Menu.Separator export exists on this Base UI version's Menu module — a plain
                divider row does the same job, matching the popup's own line token. */}
            <div aria-hidden className="mx-2 my-1.5 border-t border-surf-line-faint" />
            <div data-phone-menu-account className="flex items-center px-2 py-1.5">
              <NavAuthControl />
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
