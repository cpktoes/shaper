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
 */

import { Menu } from "@base-ui/react/menu";
import { MenuIcon } from "lucide-react";
import { SettingsMenuContent } from "@/components/settings-menu";
import { NavAuthControl } from "@/components/auth/nav-auth-control";

export function PhoneMenu() {
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
          <Menu.Popup className="min-w-64 origin-(--transform-origin) rounded-lg border border-surf-line-faint bg-surf-panel p-1.5 shadow-lg outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
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
