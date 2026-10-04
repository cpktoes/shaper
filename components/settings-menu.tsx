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
import {
  CheckIcon,
  MailIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SunIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAppSettings } from "@/components/app-settings-provider";
import { useBlankMakers } from "@/components/blank-makers-provider";
import { useTheme } from "@/components/theme-provider";
import { isLastShownMaker } from "@/lib/blank-makers-preference";
import { KNOWN_BLANK_VENDORS, type BlankVendor } from "@/lib/blanks/vendors";
import { CONTACT_COPY, CONTACT_ROUTE } from "@/lib/contact/message";
import { PRIVACY_COPY, PRIVACY_ROUTE } from "@/lib/privacy/copy";
import { THEMES, type ThemeMode, type ThemePreference } from "@/lib/theme";

const MODE_ICON: Record<ThemeMode, typeof SunIcon> = { light: SunIcon, dark: MoonIcon };
const MODE_LABEL: Record<ThemeMode, string> = { light: "Light", dark: "Dark" };
/** Heading order. A mode with no themes registered simply does not render. */
const MODES: ThemeMode[] = ["light", "dark"];

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

/**
 * The popup's own content — the Units and Theme radio groups, the Blanks row that opens the fit
 * and tip defaults dialog, and the BLANK MAKERS tick boxes (quick task 260926-wmf) — factored out of `SettingsMenu` so
 * `components/design/phone-menu.tsx` can render the exact same rows inside its own single popup
 * (stacked above the account control) rather than copying the radio groups: one definition, so
 * the two menus can never drift apart. Must render inside a `Menu.Root` (it uses `Menu.RadioGroup`
 * and `Menu.GroupLabel`, which read a context only `Menu.Root` provides) — it owns no
 * `Menu.Trigger`/`Menu.Portal`/`Menu.Popup` of its own, since each caller supplies its own trigger
 * and popup chrome around this shared content.
 *
 * Every row is a component that returns its Base UI item DIRECTLY (`ThemeRow`, `UnitsRow`,
 * `BlankMakerRow`), never wrapped in a DOM node: Base UI registers a group's items by walking its
 * children, and a wrapper element leaves a row drawn but inert — no click, no keyboard focus.
 */
export function SettingsMenuContent() {
  const { preference, setPreference, systemTheme } = useTheme();

  return (
    <>
      <AppSettingsMenuItem />

      <Menu.RadioGroup
        value={preference}
        onValueChange={(next) => setPreference(next as ThemePreference)}
        // Same top spacing the "Light"/"Dark" mode headings already use, so the rhythm
        // between the two top-level groups matches the rhythm inside them.
        className="mt-1.5"
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

      {/* Quick task 260926-wmf: one tick box per blank maker. An unticked maker's blanks leave the
          ROCKER blank list. All ticked until a shaper chooses; the last ticked maker is locked, so
          the list can never be emptied. Spaced like Theme under Units. */}
      <Menu.Group className="mt-1.5">
        <Menu.GroupLabel className="px-2 pt-1 pb-2 text-[10px] font-bold tracking-architectural text-surf-ink-muted uppercase">
          Blank Makers
        </Menu.GroupLabel>
        {KNOWN_BLANK_VENDORS.map((vendor) => (
          <BlankMakerRow key={vendor} vendor={vendor} />
        ))}
      </Menu.Group>
    </>
  );
}

/**
 * One blank maker's tick box. Ticking or unticking applies at once and keeps the menu open, so a
 * shaper can change several in one visit. The last maker still ticked is disabled with a hint
 * rather than faded — it stays readable, and stays reachable from the keyboard.
 */
function BlankMakerRow({ vendor }: { vendor: BlankVendor }) {
  const { hidden, setMakerShown } = useBlankMakers();
  const locked = isLastShownMaker(hidden, vendor);
  return (
    <Menu.CheckboxItem
      checked={!hidden.includes(vendor)}
      onCheckedChange={(checked) => setMakerShown(vendor, checked)}
      disabled={locked}
      closeOnClick={false}
      label={vendor}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 outline-none select-none coarse:min-h-11 data-highlighted:bg-surf-well data-disabled:cursor-default"
    >
      <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-surf-ink-muted">
        <Menu.CheckboxItemIndicator render={<span className="flex items-center justify-center" />}>
          <CheckIcon aria-hidden className="size-3.5 text-surf-accent-ink" />
        </Menu.CheckboxItemIndicator>
      </span>
      <span className="flex-1 leading-tight">
        <span className="block text-sm text-surf-ink">{vendor}</span>
        {locked ? (
          <span className="block text-[11px] text-surf-ink-muted">Keep at least one maker ticked</span>
        ) : null}
      </span>
    </Menu.CheckboxItem>
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
              inside itself, so every row (the Blank Makers tick boxes included) stays reachable. */}
          <Menu.Popup className="max-h-(--available-height) min-w-64 origin-(--transform-origin) overflow-y-auto rounded-lg border border-surf-line-faint bg-surf-panel p-1.5 shadow-lg outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <ContactMenuItem />
            <PrivacyMenuItem />
            <div aria-hidden className="mx-2 my-1.5 border-t border-surf-line-faint" />
            <SettingsMenuContent />
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
