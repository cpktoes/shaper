"use client";

/**
 * The nav's settings menu — a gear at the right end of the top bar.
 *
 * Built directly on Base UI's Menu primitives rather than as a `components/ui/*` wrapper, for
 * the same reason `.slider-accent` lives in app/globals.css: `components/ui/*` is
 * shadcn-generated and may be regenerated, so app-owned styling has to survive that. It is
 * also styled with the surf tokens rather than the shadcn neutral scale, which is what the
 * rest of the chrome uses.
 *
 * The menu currently holds one group. It is structured as a labelled group precisely so a
 * second one (a units chooser, when that work happens) drops in below a separator without
 * rearranging anything.
 */

import { Menu } from "@base-ui/react/menu";
import { CheckIcon, MonitorIcon, MoonIcon, SettingsIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { THEME_PREFERENCES, type ThemePreference } from "@/lib/theme";

const THEME_OPTIONS: Record<
  ThemePreference,
  { label: string; hint: string; Icon: typeof MonitorIcon }
> = {
  system: { label: "System", hint: "Follow the OS setting", Icon: MonitorIcon },
  light: { label: "Light", hint: "Always light", Icon: SunIcon },
  dark: { label: "Dark", hint: "Always dark", Icon: MoonIcon },
};

export function SettingsMenu() {
  const { preference, setPreference } = useTheme();

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
          <Menu.Popup className="min-w-56 origin-(--transform-origin) rounded-lg border border-surf-line-faint bg-surf-ground p-1.5 shadow-lg outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <Menu.RadioGroup
              value={preference}
              onValueChange={(next) => setPreference(next as ThemePreference)}
            >
              {/* Inside the RadioGroup, not beside it: Base UI's group parts read a context
                  that only Menu.Group/Menu.RadioGroup provide, and it throws otherwise. It is
                  also the more correct place — this is the radiogroup's accessible name. */}
              <Menu.GroupLabel className="px-2 pt-1 pb-2 text-[10px] font-bold tracking-architectural text-surf-ink-muted uppercase">
                Theme
              </Menu.GroupLabel>

              {THEME_PREFERENCES.map((option) => {
                const { label, hint, Icon } = THEME_OPTIONS[option];
                return (
                  <Menu.RadioItem
                    key={option}
                    value={option}
                    closeOnClick={false}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-surf-ink outline-none select-none data-highlighted:bg-surf-well"
                  >
                    <Icon aria-hidden className="size-4 shrink-0 text-surf-ink-muted" />
                    <span className="flex-1">{label}</span>
                    {/* The hint is the only thing distinguishing System from whichever of
                        Light/Dark the OS currently resolves to, so it earns its place. */}
                    <span className="sr-only">{hint}</span>
                    <Menu.RadioItemIndicator
                      // `keepMounted` is off by default, so the icon is simply absent for
                      // unselected rows — the flex layout leaves the gap either way.
                      render={
                        <span className="flex size-4 shrink-0 items-center justify-center" />
                      }
                    >
                      <CheckIcon aria-hidden className="size-4 text-surf-accent-ink" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                );
              })}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
