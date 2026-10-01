"use client";

/**
 * D-08's "one menu": the phone top bar's single icon button that holds everything the desktop nav
 * spreads across three chrome pieces — the settings gear (Units, Theme) and the account control —
 * in ONE Base UI popup, stacked, not a button that opens a chooser of two menus. Built directly on
 * Base UI's `Menu` primitives, the same way `components/settings-menu.tsx` is — not any of the
 * three shadcn overlay wrappers this codebase deliberately keeps out of `components/ui/*` — and
 * styled with the identical popup class string so the two popups read as one design language.
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
 * Since quick 260930-r8s (Phase 13 item 9d) this popup also carries the six design screens as its
 * very first group, ABOVE Home — a new row for each entry of `screens` (handed down from
 * `site-nav.tsx` via `PhoneTopBar`, never imported directly here, so the one `NAV_LINKS` list and
 * this menu can never form an import loop). This group is drawn ONLY at the desktop-shell width
 * (`hidden shell:block` on the group, `hidden shell:flex` on each row): below that width the
 * bottom tab bar already offers the six screens, so an upright phone's menu is unchanged. At and
 * above the shell width there is no tab bar, and — since this same quick task also hides the
 * desktop link row on a short screen — a phone held sideways has no other way between screens, so
 * this group is the only way there.
 *
 * Each row stays a real `Menu.Item` even while hidden by CSS, never left out of the React tree: Base
 * UI 1.7.0 treats a row that is not drawn (via the browser's own `checkVisibility()`) as
 * unavailable to arrow-key navigation and type-to-jump alike, and a `display: none` row is out of
 * the accessibility tree — so on an upright phone these six rows are simply not there for a
 * finger, a keyboard or a screen reader, with no JavaScript width check and no second copy of the
 * 820-dot shell number outside `app/globals.css` (whose compiled-CSS guard owns it). The hide sits
 * on each row itself, not only on the group, so older Safari's `display`-only fallback (no
 * `checkVisibility()`) reads the same answer.
 *
 * No visible "Screens" heading sits above the group — unlike Units or Theme below, which do have
 * one. Measured with the menu open on a sideways phone: the popup's own box is 324 dots tall on an
 * iPhone at 844x390 and 294 on a Pixel 7 at 863x360 (274 on an iPhone with Safari's own bar
 * showing, at 844x340). Six rows at 44 dots under a touch pointer, plus the popup's 6-dot top
 * padding, is 270 — enough for all six whole in the first view on all three, but a 27-dot heading
 * like Units' would push SUMMARY under the fold on two of them. So the group carries
 * `aria-label="Screens"` only (Base UI's `Menu.Group` passes it straight to its own `role="group"`
 * element) for a screen reader, with nothing drawn for a sighted shaper to read — the same shape
 * the Home/Contact/Privacy group above the settings already uses. The rest of the menu still
 * scrolls inside itself below the six rows, as it already does on a phone (quick 260926-wmf).
 *
 * The current screen's row carries a tick (`CheckIcon`, the same mark the Units and Theme rows use
 * for "this one") and `aria-current="page"`, using the same active test the desktop row and the
 * tab bar already use. Tapping a row moves with `router.push` — a client-side move that keeps an
 * unsaved board in memory, exactly like the Home row below — except tapping the current screen,
 * which only closes the menu (there is nowhere to move to).
 */

import { Menu } from "@base-ui/react/menu";
import { CheckIcon, HouseIcon, MenuIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ContactMenuItem, PrivacyMenuItem, SettingsMenuContent } from "@/components/settings-menu";
import { NavAuthControl } from "@/components/auth/nav-auth-control";
import type { NavLink } from "@/components/site-nav";

export function PhoneMenu({ screens }: { screens: readonly NavLink[] }) {
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
        <Menu.Positioner side="bottom" align="end" sideOffset={10} className="isolate z-50">
          {/* Height-limited to the room below the button, scrolling inside itself: on a phone the menu is taller than the screen (quick task 260926-wmf). */}
          <Menu.Popup className="max-h-(--available-height) min-w-64 origin-(--transform-origin) overflow-y-auto rounded-lg border border-surf-line-faint bg-surf-panel p-1.5 shadow-lg outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            {/* The six design screens — drawn only at the desktop-shell width, where the bottom
                tab bar is absent (quick 260930-r8s, item 9d; see the doc comment above). No
                visible heading (P-4 above); `aria-label` names the group for a screen reader. */}
            <Menu.Group aria-label="Screens" className="hidden shell:block">
              {screens.map((link) => {
                const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
                return (
                  <Menu.Item
                    key={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      if (!active) router.push(link.href);
                    }}
                    className="hidden shell:flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-surf-ink outline-none select-none coarse:min-h-11 data-highlighted:bg-surf-well"
                  >
                    <span aria-hidden className="size-4 shrink-0" />
                    <span className="flex-1 text-xs font-bold tracking-architectural">{link.label}</span>
                    {active && (
                      <CheckIcon aria-hidden className="size-4 shrink-0 text-surf-accent-ink" />
                    )}
                  </Menu.Item>
                );
              })}
            </Menu.Group>
            <div
              aria-hidden
              className="hidden shell:block mx-2 my-1.5 border-t border-surf-line-faint"
            />
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
