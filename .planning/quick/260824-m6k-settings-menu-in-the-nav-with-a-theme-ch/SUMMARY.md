---
id: 260824-m6k
slug: settings-menu-in-the-nav-with-a-theme-ch
date: 2026-08-24
type: quick
status: complete
---

# Settings menu with a theme chooser — summary

A gear at the right end of the nav opens a menu with a **System / Light / Dark** chooser.
This is the control 260824-llx deliberately left out.

## Shape

| file | role |
|---|---|
| `lib/theme.ts` | pure, DOM-free: preference type, storage key, resolve rules, class mapping, and the init script's source |
| `lib/theme.test.ts` | 21 tests, including a drift guard that runs the real init script |
| `components/theme-provider.tsx` | context; two `useSyncExternalStore` reads |
| `components/settings-menu.tsx` | Base UI `Menu` + `RadioGroup`, surf tokens |
| `app/layout.tsx` | provider, `suppressHydrationWarning`, inline script in `<head>` |
| `components/site-nav.tsx` | the gear, behind a hairline rule |

## Decisions worth keeping

**System is the absence of both classes**, not a third theme. Bare `:root` is light and the
`prefers-color-scheme` block covers OS dark, so "follow the OS" is correctly encoded as no
class — which is also what keeps the no-JS first paint correct.

**The inline script is tested, not trusted.** It cannot import from `lib/theme.ts` (it ships
as a string in the HTML), so it is a second implementation of `applyThemePreference`. The
suite `eval`s the exported string against a fake `document`/`localStorage` and asserts it
agrees with the module for all three preferences, for `null`, and for junk. Drift fails a
test instead of silently shipping a flash.

**`useSyncExternalStore`, not effect-plus-setState.** The first draft read localStorage and
matchMedia in effects; eslint's `react-hooks/set-state-in-effect` flagged both as cascading
renders. Rewritten rather than suppressed — the store form is SSR-safe by construction
(`getServerSnapshot` returns the same default the server rendered) and picks up cross-tab
sync for free via the `storage` event.

**Base UI's `Menu`, built in app code** rather than a `components/ui/*` wrapper — same reason
as `.slider-accent`: `components/ui/*` is shadcn-generated and may be regenerated.

## Verified

- `npm run build` ✓ · `npx tsc --noEmit` ✓ · `npm test` 659/659 ✓ · `npx eslint .` 0 errors
  (9 warnings, all pre-existing in `scripts/*.mjs`) · fresh dev server: no server errors
- In-browser, all on hard loads: menu opens on first click; Dark applies instantly and the
  menu itself themes; **Light overrides an OS dark preference and survives a reload**;
  System clears both classes and the page then follows a live OS flip with no class present;
  the indicator tracks the stored value; trigger exposes an accessible name.
- Init script confirmed inside `<head>` and before `<body>` in the served HTML, and the
  server markup confirmed to carry **no** theme class — so the script is genuinely what
  prevents the flash rather than the markup happening to be right.

## Two dead ends worth recording

1. **A stale Turbopack module graph** produced a phantom `useTheme must be used within a
   ThemeProvider` error after the root layout gained a provider. The layout was correct;
   restarting the dev server cleared it.
2. **The browser console and `preview_logs` buffers are cumulative** and kept replaying both
   that error and the later `MenuGroupContext` one long after each was fixed, which made a
   working build look broken twice. The reliable signal was a *fresh* server's log
   ("No server errors found"), not the console buffer.

The real bug in between was genuine: `Menu.GroupLabel` sat beside `Menu.RadioGroup` instead
of inside it. Base UI throws on that, React tore the tree down on each open, and the trigger's
`aria-expanded` snapped back to `false` — which read exactly like "the click does nothing".

## Not done

- **Units toggle** — founder chose to skip. 211 formatter call sites, 113 inch-domain slider
  bounds, 17 files, plus how cm should read where imperial uses fractions and feet-inches.
- **Keyboard-open via the automation harness** was not confirmed (focus did not persist
  across tool calls); menu semantics, roving focus and escape come from Base UI, and the
  trigger is a native `<button>`, so Enter/Space activation is the browser's own behaviour.
