---
id: 260824-m6k
slug: settings-menu-in-the-nav-with-a-theme-ch
date: 2026-08-24
type: quick
status: planned
---

# Settings menu in the nav, with a theme chooser

A gear button at the right end of the top nav opens a settings menu whose first (and, for
now, only) group is a theme chooser: **System / Light / Dark**. This is the toggle control
that quick task 260824-llx deliberately left out — the theming system is already built and
verified, so this task is only the control surface plus persistence.

## Scope decision

The founder chose "Menu + theme only" and said the inches/centimetre toggle is **skipped for
now**. It is not stubbed, not greyed out, not present. The menu is built so a second group
drops in later without rework, and that is the whole accommodation made for it.

Reason it was split: a working inches↔cm toggle means 211 formatter call sites and 113
inch-domain slider bounds across 17 files, plus product decisions about how cm should read
where the imperial side uses fractions and feet-inches.

## Design

**`lib/theme.ts` — pure, unit-tested, no DOM import.**
Holds the preference type, the storage key, the resolve rules and the class-application
logic. Takes a structurally-typed `{ classList: { add, remove } }` rather than importing
`Element`, so it tests under Vitest's `node` environment with no jsdom.

**The inline script is tested, not trusted.** A pre-hydration script has to duplicate the
module's logic (it cannot import anything — it runs as a raw string during HTML parsing).
Duplicated logic drifts, so `THEME_INIT_SCRIPT` is exported from the same module and the
test suite `eval`s it against a hand-rolled fake `document`/`localStorage` and asserts it
lands on the same class the module's own function would. Drift breaks a test.

**`components/theme-provider.tsx`** — context holding `{preference, setPreference, resolved}`.
Reads `localStorage` in an effect rather than during render: the server cannot know the
stored value, and a lazy `useState` initialiser would hydration-mismatch. Safe here because
the only thing that reflects the preference is inside a popover that starts closed, so the
one-frame "System" state is never visible. `resolved` tracks a `matchMedia` listener so the
menu's own indicator stays right when the OS flips while the app is open.

**`components/settings-menu.tsx`** — Base UI `Menu` with `RadioGroup`/`RadioItem`, styled
with surf tokens. Built here rather than as a `components/ui/*` wrapper for the reason
already established for `.slider-accent` in globals.css: `components/ui/*` is
shadcn-generated and may be regenerated, so app-owned styling must not live there.

**`app/layout.tsx`** — mount the provider, add `suppressHydrationWarning` to `<html>`, and
put the init script in `<head>`. Per the Next 16 guide at
`node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`:
a raw `<script dangerouslySetInnerHTML>` runs synchronously during HTML parsing, before the
first paint. `next/script` would defer and reintroduce the flash.

## Why the class, not `data-theme`

The Next guide's example uses `data-theme`. This app is class-based — the theming system's
selectors are `:root.dark` / `:root.light`, and Tailwind's `dark:` variant matches
`.dark`. Same technique, different attribute.

Mapping: `system` → no class (the `prefers-color-scheme` default does the work),
`light` → `.light`, `dark` → `.dark`.

## Tasks

1. `lib/theme.ts` + `lib/theme.test.ts`.
2. `components/theme-provider.tsx`.
3. `components/settings-menu.tsx`.
4. Wire `app/layout.tsx` (provider, `suppressHydrationWarning`, init script).
5. Add the gear to `components/site-nav.tsx`.
6. Verify: build, tsc, tests, and in-browser — all three options, persistence across reload,
   no flash on reload in dark, OS-flip tracking, keyboard access.

## Accessibility bar

The trigger is an icon-only button, so it needs an accessible name (`aria-label`) and a
visible focus ring. Menu semantics, roving focus, escape-to-close and arrow keys come from
Base UI. Gear icon gets `aria-hidden` since the button is already labelled.
