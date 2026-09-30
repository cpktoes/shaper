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
  RulerIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  SunIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useBlankMakers } from "@/components/blank-makers-provider";
import { useFitDefaults } from "@/components/fit-defaults-provider";
import { useTheme } from "@/components/theme-provider";
import { useUnits } from "@/components/units-provider";
import { isLastShownMaker } from "@/lib/blank-makers-preference";
import { KNOWN_BLANK_VENDORS, type BlankVendor } from "@/lib/blanks/vendors";
import { CONTACT_COPY, CONTACT_ROUTE } from "@/lib/contact/message";
import { formatDimsExample, presetSummary } from "@/lib/geometry/summary-line";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import type { UnitsSystem } from "@/lib/geometry/units";
import { THEMES, type ThemeMode, type ThemePreference } from "@/lib/theme";

/**
 * The D-06 live example board — a fixed reference (Shortboard) run through the same
 * `summarizeDesign()` pipeline the cards use, computed once at module load. Fixed rather than
 * the board in progress so the row never moves while a shaper edits (UI-SPEC's resolved
 * assumption): switching units mid-edit should not also make the menu's own example jump.
 */
const UNITS_EXAMPLE_SUMMARY = presetSummary(
  // Shortboard is always present in BOARD_PRESETS — see lib/geometry/presets.ts.
  BOARD_PRESETS.find((preset) => preset.id === "shortboard")!,
);

const MODE_ICON: Record<ThemeMode, typeof SunIcon> = { light: SunIcon, dark: MoonIcon };
const MODE_LABEL: Record<ThemeMode, string> = { light: "Light", dark: "Dark" };
/** Heading order. A mode with no themes registered simply does not render. */
const MODES: ThemeMode[] = ["light", "dark"];

/**
 * A "Contact" row shared by the desktop gear menu and the phone menu (quick 260929-u1t, C-1,
 * P-1) — one exported component, so the two menus can never drift apart the way two hand-copied
 * rows eventually would. It sits FIRST in both menus: the phone menu is taller than a phone's
 * screen and scrolls inside itself (quick 260926-wmf), so a row placed last would sit below the
 * fold, while a row placed first is visible the moment either menu opens.
 *
 * Left out entirely on the Contact page itself — `usePathname()` returns null there, the same way
 * `phone-menu.tsx`'s own Home row hides on `/`. `divider` renders the popup's own rule after the
 * row; the gear menu passes it (Contact, then a divider, then the settings), while the phone menu
 * supplies its own single divider after Home-or-Contact so the two rows can share one rule instead
 * of doubling it when both are visible.
 */
export function ContactMenuItem({ divider = false }: { divider?: boolean } = {}) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === CONTACT_ROUTE) {
    return null;
  }

  return (
    <Fragment>
      <Menu.Item
        onClick={() => router.push(CONTACT_ROUTE)}
        // Verbatim the same row classes phone-menu.tsx's Home row already uses, so the two rows
        // read as one family: 44px tall under a touch pointer, today's height for a mouse.
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-surf-ink outline-none select-none coarse:min-h-11 data-highlighted:bg-surf-well"
      >
        <MailIcon aria-hidden className="size-4 text-surf-ink-muted" />
        {CONTACT_COPY.menuLabel}
      </Menu.Item>
      {divider && <div aria-hidden className="mx-2 my-1.5 border-t border-surf-line-faint" />}
    </Fragment>
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
  const { system, setSystem } = useUnits();
  const { openDialog } = useFitDefaults();

  return (
    <>
      {/* Units sits above Theme (D-05) — a sibling Menu.RadioGroup, not nested inside it.
          Base UI walks a RadioGroup's own children to register its items, so neither
          group may be wrapped in an intervening element. */}
      <Menu.RadioGroup value={system} onValueChange={(next) => setSystem(next as UnitsSystem)}>
        <Menu.GroupLabel className="px-2 pt-1 pb-2 text-[10px] font-bold tracking-architectural text-surf-ink-muted uppercase">
          Units
        </Menu.GroupLabel>

        <UnitsRow
          value="imperial"
          label="Imperial"
          detail={formatDimsExample(UNITS_EXAMPLE_SUMMARY, "imperial")}
        />
        <UnitsRow
          value="metric"
          label="Metric"
          detail={formatDimsExample(UNITS_EXAMPLE_SUMMARY, "metric")}
        />
      </Menu.RadioGroup>

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

      {/* D-09: the shaper's seven fit and tip defaults (Phase 12 added Planer Max Depth, Deck
          Skin and Tip Style — hence the detail line's "planer, skin"). The row only opens a dialog — typed
          numbers inside the menu would fight its own arrow-key and typeahead handling — and the
          dialog is rendered by FitDefaultsProvider, not here, because this popup unmounts the
          moment it closes. A plain Menu.Item closes the menu on click, which is what we want. */}
      <div aria-hidden className="mx-2 my-1.5 border-t border-surf-line-faint" />
      <Menu.Group>
        <Menu.GroupLabel className="px-2 pt-1 pb-2 text-[10px] font-bold tracking-architectural text-surf-ink-muted uppercase">
          Blanks
        </Menu.GroupLabel>
        <Menu.Item
          onClick={openDialog}
          className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 outline-none select-none coarse:min-h-11 data-highlighted:bg-surf-well"
        >
          <SlidersHorizontalIcon aria-hidden className="size-4 shrink-0 text-surf-ink-muted" />
          <span className="flex-1 leading-tight">
            <span className="block text-sm text-surf-ink">Fit & Tip Defaults</span>
            <span className="block text-[11px] text-surf-ink-muted">Spare foam, planer, skin and tips</span>
          </span>
        </Menu.Item>
      </Menu.Group>

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
            <ContactMenuItem divider />
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

/**
 * `ThemeRow` with the icon fixed to a ruler for both rows (D-07) instead of a per-value icon —
 * unlike Theme, where the icon varies by mode, Units has only one dimension of variation (the
 * system), so one icon suffices and a second would imply a distinction that doesn't exist.
 */
function UnitsRow({
  value,
  label,
  detail,
}: {
  value: UnitsSystem;
  label: string;
  detail: string;
}) {
  return (
    <Menu.RadioItem
      value={value}
      closeOnClick={false}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 outline-none select-none data-highlighted:bg-surf-well"
    >
      <RulerIcon aria-hidden className="size-4 shrink-0 text-surf-ink-muted" />
      <span className="flex-1 leading-tight">
        <span className="block text-sm text-surf-ink">{label}</span>
        <span className="block text-[11px] text-surf-ink-muted">{detail}</span>
      </span>
      <Menu.RadioItemIndicator
        render={<span className="flex size-4 shrink-0 items-center justify-center" />}
      >
        <CheckIcon aria-hidden className="size-4 text-surf-accent-ink" />
      </Menu.RadioItemIndicator>
    </Menu.RadioItem>
  );
}
