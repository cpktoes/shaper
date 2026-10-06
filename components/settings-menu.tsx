"use client";

/**
 * The nav's settings menu — a gear at the right end of the top bar.
 *
 * Built directly on Base UI's Menu primitives rather than as a `components/ui/*` wrapper, for
 * the same reason `.slider-accent` lives in app/globals.css: `components/ui/*` is
 * shadcn-generated and may be regenerated, so app-owned styling has to survive that. It is
 * also styled with the surf tokens rather than the shadcn neutral scale.
 *
 * Since quick 261003-uwi the menu is short: Contact, Privacy, and ONE row, App Default Settings,
 * which opens the pop-up holding Imperial or Metric, the theme tiles, the blank makers and the fit
 * and tip defaults (components/app-settings-dialog.tsx). Quick 261006-fom (D-06, P-4) adds Share
 * after Privacy (components/share-menu-item.tsx). The phone's ☰ sheet
 * (components/design/phone-menu.tsx) renders the same rows from here, so the two menus can never
 * drift apart.
 */

import { Menu } from "@base-ui/react/menu";
import { MailIcon, SettingsIcon, ShieldCheckIcon, SlidersHorizontalIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAppSettings } from "@/components/app-settings-provider";
import { ShareMenuItem } from "@/components/share-menu-item";
import { CONTACT_COPY, CONTACT_ROUTE } from "@/lib/contact/message";
import { PRIVACY_COPY, PRIVACY_ROUTE } from "@/lib/privacy/copy";

/**
 * "Contact" and "Privacy" rows shared by the desktop gear menu and the phone menu (Contact:
 * quick 260929-u1t, C-1, P-1; Privacy: quick 260930-03d, P-1/P-6) — two thin exports over one
 * private `PageMenuItem`, so the two rows can never drift apart the way two hand-copied rows
 * eventually would. Privacy sits directly under Contact in both menus, so it is visible the
 * moment either menu opens: the phone menu is taller than a phone's screen and scrolls inside
 * itself (quick 260926-wmf), so a row placed last would sit below the fold, under the account
 * control, and "two taps" would become "tap, scroll, tap".
 *
 * Each row is left out entirely on its own page — `usePathname()` returns its own route there, the
 * same way `phone-menu.tsx`'s own Home row hides on `/`. Contact and Privacy can never both be
 * hidden at once (each hides only on its own route), so the divider after them is always doing
 * real work separating at least one visible row from what follows — the gear menu's popup now
 * renders a plain, unconditional divider after the two rows, the same shape the phone menu's own
 * divider already had.
 */
function PageMenuItem({
  route,
  label,
  Icon,
}: {
  route: string;
  label: string;
  Icon: typeof MailIcon;
}) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === route) {
    return null;
  }

  return (
    <Menu.Item
      onClick={() => router.push(route)}
      // Verbatim the same row classes phone-menu.tsx's Home row already uses, so the two rows
      // read as one family: 44px tall under a touch pointer, today's height for a mouse.
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-surf-ink outline-none select-none coarse:min-h-11 data-highlighted:bg-surf-well"
    >
      <Icon aria-hidden className="size-4 text-surf-ink-muted" />
      {label}
    </Menu.Item>
  );
}

export function ContactMenuItem() {
  return <PageMenuItem route={CONTACT_ROUTE} label={CONTACT_COPY.menuLabel} Icon={MailIcon} />;
}

export function PrivacyMenuItem() {
  return (
    <PageMenuItem route={PRIVACY_ROUTE} label={PRIVACY_COPY.menuLabel} Icon={ShieldCheckIcon} />
  );
}

/**
 * The one "App Default Settings" row (quick 261003-uwi) both menus carry. A plain Menu.Item, so a
 * tap closes the menu, then opens the App Default Settings pop-up — rendered by
 * `AppSettingsProvider`, not here, because this popup unmounts the moment it closes. The pop-up
 * holds what the menus used to list row by row: Imperial or Metric, the theme, the blank makers and
 * the fit and tip defaults. 44 dots tall under a touch pointer, today's height for a mouse.
 */
export function AppSettingsMenuItem() {
  const { openAppSettings } = useAppSettings();
  return (
    <Menu.Item
      onClick={() => openAppSettings()}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 outline-none select-none coarse:min-h-11 data-highlighted:bg-surf-well"
    >
      <SlidersHorizontalIcon aria-hidden className="size-4 shrink-0 text-surf-ink-muted" />
      <span className="flex-1 leading-tight">
        <span className="block text-sm text-surf-ink">App Default Settings</span>
        <span className="block text-[11px] text-surf-ink-muted">Units, theme, blank makers, fit and tips</span>
      </span>
    </Menu.Item>
  );
}

export function SettingsMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger
        // Icon-only, so it needs an accessible name — there is no visible text to borrow.
        aria-label="Settings"
        className="-mr-1 flex cursor-pointer items-center rounded-md p-1 text-surf-ink-muted transition-colors outline-none hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink data-popup-open:text-surf-ink"
      >
        <SettingsIcon aria-hidden className="size-4" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={10} className="isolate z-50">
          {/* Never taller than the room Base UI measures below the gear — past that it scrolls
              inside itself, so every row stays reachable on any window. */}
          <Menu.Popup className="max-h-(--available-height) min-w-64 origin-(--transform-origin) overflow-y-auto rounded-lg border border-surf-line-faint bg-surf-panel p-1.5 shadow-lg outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <ContactMenuItem />
            <PrivacyMenuItem />
            <ShareMenuItem />
            <div aria-hidden className="mx-2 my-1.5 border-t border-surf-line-faint" />
            <AppSettingsMenuItem />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
