"use client";

/**
 * The nav's settings menu — a gear at the right end of the top bar.
 *
 * Built directly on Base UI's Menu primitives rather than as a `components/ui/*` wrapper, for
 * the same reason `.slider-accent` lives in app/globals.css: `components/ui/*` is
 * shadcn-generated and may be regenerated, so app-owned styling has to survive that. It is
 * also styled with the surf tokens rather than the shadcn neutral scale.
 *
 * Nothing here enumerates themes. The list, their labels and which mode each belongs to all
 * come from THEMES in lib/theme.ts, so adding a fifth theme is an edit there plus its block
 * in globals.css — this file does not change.
 */

import { Fragment } from "react";
import { Menu } from "@base-ui/react/menu";
import { CheckIcon, MonitorIcon, MoonIcon, SettingsIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { THEMES, type ThemeMode, type ThemePreference } from "@/lib/theme";

const MODE_ICON: Record<ThemeMode, typeof SunIcon> = { light: SunIcon, dark: MoonIcon };
const MODE_LABEL: Record<ThemeMode, string> = { light: "Light", dark: "Dark" };
/** Heading order. A mode with no themes registered simply does not render. */
const MODES: ThemeMode[] = ["light", "dark"];

export function SettingsMenu() {
  const { preference, setPreference, systemTheme } = useTheme();

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
          <Menu.Popup className="min-w-64 origin-(--transform-origin) rounded-lg border border-surf-line-faint bg-surf-panel p-1.5 shadow-lg outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <Menu.RadioGroup
              value={preference}
              onValueChange={(next) => setPreference(next as ThemePreference)}
            >
              {/* Inside the RadioGroup, not beside it: Base UI's group parts read a context
                  only Menu.Group/Menu.RadioGroup provide, and it throws otherwise. It is also
                  the more correct place — this is the radiogroup's accessible name. */}
              <Menu.GroupLabel className="px-2 pt-1 pb-2 text-[10px] font-bold tracking-architectural text-surf-ink-muted uppercase">
                Theme
              </Menu.GroupLabel>

              <ThemeRow
                value="system"
                Icon={MonitorIcon}
                label="System"
                /* The only row whose subtitle moves. With four themes "follow the OS" is
                   ambiguous until you name what it currently picks — and that is
                   `systemTheme`, NOT the theme on screen. With an explicit theme chosen the
                   two differ, and showing the latter would claim the OS had chosen it. */
                detail={`Follows the OS — ${systemTheme.label} right now`}
              />

              {MODES.map((mode) => {
                const themes = THEMES.filter((t) => t.mode === mode);
                if (themes.length === 0) return null;
                const Icon = MODE_ICON[mode];
                return (
                  // Fragment, not a wrapper div. Base UI registers menu items by walking the
                  // RadioGroup's children, so an intervening DOM node leaves the rows
                  // rendered but inert — they take no click and no keyboard focus.
                  <Fragment key={mode}>
                    <div className="mt-1.5 px-2 pt-1 pb-1 text-[10px] font-bold tracking-architectural text-surf-ink-muted uppercase">
                      {MODE_LABEL[mode]}
                    </div>
                    {themes.map((theme) => (
                      <ThemeRow
                        key={theme.id}
                        value={theme.id}
                        Icon={Icon}
                        label={theme.label}
                        detail={theme.description}
                      />
                    ))}
                  </Fragment>
                );
              })}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function ThemeRow({
  value,
  Icon,
  label,
  detail,
}: {
  value: string;
  Icon: typeof SunIcon;
  label: string;
  detail: string;
}) {
  return (
    <Menu.RadioItem
      value={value}
      closeOnClick={false}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 outline-none select-none data-highlighted:bg-surf-well"
    >
      <Icon aria-hidden className="size-4 shrink-0 text-surf-ink-muted" />
      <span className="flex-1 leading-tight">
        <span className="block text-sm text-surf-ink">{label}</span>
        <span className="block text-[11px] text-surf-ink-muted">{detail}</span>
      </span>
      <Menu.RadioItemIndicator
        // `keepMounted` is off by default, so the icon is simply absent for unselected rows —
        // the flex layout leaves the gap either way.
        render={<span className="flex size-4 shrink-0 items-center justify-center" />}
      >
        <CheckIcon aria-hidden className="size-4 text-surf-accent-ink" />
      </Menu.RadioItemIndicator>
    </Menu.RadioItem>
  );
}
