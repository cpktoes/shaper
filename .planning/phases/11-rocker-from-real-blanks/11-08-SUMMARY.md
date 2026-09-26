---
phase: 11-rocker-from-real-blanks
plan: 08
subsystem: preferences / gear menu
status: complete
tags: [fit-defaults, gear-menu, dialog, preference-provider, units]
requires:
  - 11-02 (lib/fit-defaults-preference.ts — keys, defaults, bounds, allow-list parser, cookie, handoff)
  - 11-06 (resolveFitDefaultsHandoff, saveFitDefaultsPreference)
provides:
  - "FitDefaultsProvider({ handoff, children }) and useFitDefaults() -> { preference, defaults, settings, setDefault, restoreDefaults, openDialog }"
  - "FitDefaultsDialog({ open, onOpenChange }), rendered once by the provider"
  - "Gear-menu BLANKS group with the Fit & Tip Defaults row (desktop gear and phone Menu)"
affects:
  - 11-10 and 11-11 read useFitDefaults() (new boards' tips; which blanks fit)
tech-stack:
  added: []
  patterns:
    - "Third instance of the units / print-instructions provider pattern; the external-store snapshot is the raw stored string, parsed once per change"
key-files:
  created:
    - components/fit-defaults-provider.tsx
    - components/fit-defaults-dialog.tsx
    - e2e/fit-defaults.spec.ts
  modified:
    - app/layout.tsx
    - components/settings-menu.tsx
    - lib/units-isolation.test.ts
decisions:
  - "A dialog field that is committed without a visible change (a blur, or re-typing what it already shows) stores nothing, so a setting nobody chose stays not chosen; in Metric this also stops the 2\" default being re-stored as a rounded 51 mm"
  - "On a touch pointer the dialog focuses itself on open instead of its first field, so a phone's keyboard does not cover the dialog before it is read; a mouse or keyboard user still lands in Extra Length"
  - "When browser storage is blocked, a committed value is held in page memory so it still applies on screen for the rest of the visit"
metrics:
  duration: "about 15 minutes"
  completed: 2026-09-26
actuals:
  tokens: 9500
  tasks: 2
  commits: 3
---

# Phase 11 Plan 08: Fit & Tip Defaults in the gear menu Summary

The five shaper defaults (Extra Length, Extra Center Thickness, Width Margin, Nose Tip, Tail Tip)
can now be set from a new BLANKS row in the gear menu. The server works them out before the first
paint, a change applies the moment it is entered, and they are saved the same way the
Imperial/Metric choice is: on the account when signed in, in the browser when signed out.

## What a shaper sees

- The gear menu (and the phone's one Menu, which shows the same settings) has a new **BLANKS**
  group under Theme with one row: **Fit & Tip Defaults**, "Spare foam and tip thickness".
- Tapping it closes the menu and opens a dialog with two groups. **WHICH BLANKS FIT** holds Extra
  Length 2", Extra Center Thickness 3/8" and Width Margin 1", each with its one-line explanation.
  **NEW BOARDS START WITH** holds Nose Tip 5/16" and Tail Tip 1/4", with "Boards you've already
  started keep their own tips." In Metric the five read 51 mm, 10 mm, 25 mm, 8 mm and 6 mm.
- Each number takes effect when it is entered (Enter or leaving the field). Out-of-range values
  clamp silently to the declared bounds, and unreadable text shows the usual typed-field error line.
  **Restore Defaults** returns all five to their defaults with no question asked; **Done** only closes.
- Nothing else on screen changes yet: the ROCKER screen and new boards start reading these values
  in 11-10 and 11-11.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Every screen can read the five defaults from the first paint (tracer) | 56c1da9 | components/fit-defaults-provider.tsx, app/layout.tsx |
| 2 | Fit & Tip Defaults in the gear menu opens the five typed fields | 6011b16 | components/fit-defaults-dialog.tsx, components/fit-defaults-provider.tsx, components/settings-menu.tsx, lib/units-isolation.test.ts, e2e/fit-defaults.spec.ts |

## How it is built

- `app/layout.tsx` now awaits the units, print-instructions and fit-defaults handoffs together in
  one `Promise.all`, so the third one costs no extra wait. `FitDefaultsProvider` is mounted inside
  `PrintInstructionsProvider` and above `ThemeProvider`, which puts it above the design store and the
  nav's gear menu.
- `FitDefaultsProvider` copies `print-instructions-provider.tsx`: a module-level listener set with a
  `storage` subscription, `reconciledRef`, a `createPreferenceWriteQueue<FitDefaultsPreference>` over
  `saveFitDefaultsPreference`, and the adoption and one-shot promotion effects. The one difference is
  that the `useSyncExternalStore` snapshot is the **raw stored string**. The server snapshot is
  `JSON.stringify(handoff.preference)`, and the value is parsed through `parseFitDefaultsPreference`
  in a `useMemo`, so the store never loops on a fresh object and garbage in storage reads as the
  defaults (T-11-23, T-11-25).
- `setDefault` merges into a fresh read of the store, not this render's value, so two commits in
  the same tick build on each other. It writes localStorage plus the `shaper-fit-defaults` cookie,
  flips `reconciledRef`, emits synchronously and then queues the account write.
- The dialog is rendered once by the provider, not inside the menu popup, which unmounts when it
  closes. Every field is a standalone `MeasureField` with `family="mark"`. Its bounds come from
  `measureSlider` + `typedFieldBounds` over `FIT_DEFAULTS_RANGE_IN`.
- `components/fit-defaults-dialog.tsx` is listed in the units-isolation display ledger
  (`converted: true`). It sits outside the walked screen folders, so it has to be named to be
  checked.

## Verification

- `npx tsc --noEmit` exits 0. `npx vitest run`: 69 files, 2683 passed, 2 skipped. `npm run lint`: 0 errors
  (the 11 warnings are all pre-existing, in scripts and other files).
- `IS_WEBPACK_TEST=1 PW_PORT=3158 npx playwright test e2e/fit-defaults.spec.ts`: 14 passed, 1 skipped
  (the touch-size test skips on desktop by design), on iphone, android and desktop. It covers opening
  from the gear and the phone Menu, every group, hint and default, a committed `3` reading `3"` and
  surviving a reload (with the cookie checked), Restore Defaults surviving a second reload, the Metric
  millimetre defaults, "passing through a field stores nothing", and 44px touch sizes for the row,
  each field and Restore Defaults, with Done reachable.
- `e2e/desktop-baseline.spec.ts --project=desktop -g "TEMPLATE|RAILS|FINS"`: 3 passed. A closed gear
  menu moved no baseline. The phone-home, phone-account and phone-layout menu tests plus that
  baseline subset: 29 passed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Entering and leaving a field without changing it stored the default as a chosen value**
- **Found during:** Task 2 (browser check of the stored cookie)
- **Issue:** `MeasureField` commits on blur. Opening the dialog focused Extra Length, and moving to
  any other field re-committed its shown value, which wrote `extraLength: 50.8` where nobody had
  chosen anything. In Metric, the shown `51 mm` would have been stored as 51 mm, silently moving the
  2" default.
- **Fix:** The dialog only calls `setDefault` when the committed value reads differently (through
  `formatMark`) from the value already on screen. The new e2e test "passing through a field without
  changing it stores nothing" guards this in Metric.
- **Files modified:** components/fit-defaults-dialog.tsx, e2e/fit-defaults.spec.ts
- **Commit:** 6011b16

**2. [Rule 2 - Missing critical functionality] The phone keyboard covered the dialog on open**
- **Found during:** Task 2
- **Issue:** The dialog is opened from a menu row rather than its own trigger. Base UI therefore
  cannot tell a tap from a click, and it focused the first field on every device. On a phone that
  raises the keyboard straight away.
- **Fix:** `initialFocus` focuses the dialog itself on a coarse pointer, and keeps the default
  (first field) for a mouse or keyboard.
- **Files modified:** components/fit-defaults-dialog.tsx
- **Commit:** 6011b16

**3. [Rule 2] Blocked browser storage fallback**
- **Issue:** The print provider's pattern loses a pick entirely when localStorage throws, so the
  value would not even apply on screen.
- **Fix:** The provider keeps the last written value in page memory and reads it when storage
  throws. The value applies for the visit and is gone after a reload.
- **Commit:** 56c1da9

**4. [Test harness] Touch sizes measured with `offsetHeight`**
- Bounding boxes read a 44px field as 43.99997px, because the dialog is centred with a half-size
  translate. The spec measures layout height instead, following the project's own
  "measure layout, not transformed rects" note.

## Human verification deferred to end-of-phase UAT

- Signed in: change a default on one device, then sign in on another browser and see it arrive.
  Also check that a signed-out pick is promoted into an account that has none. The browser suite
  runs on fake Clerk keys, so the account path is not reachable there. It is covered by the 11-02
  and 11-06 unit tests.
- On a real iPhone: the dialog opens without raising the keyboard, and Done stays reachable when a
  field is focused and the keyboard is up.

## Known Stubs

None. The provider's values are not read by the ROCKER screen or the design store yet. That is by
plan (11-10 and 11-11), not a stub.

## Threat Flags

None. The only new surface is a client call to the existing `saveFitDefaultsPreference` Server
Action (11-06), which re-validates every field server-side and takes identity from the session.

## Self-Check: PASSED

- FOUND: components/fit-defaults-provider.tsx, components/fit-defaults-dialog.tsx, e2e/fit-defaults.spec.ts
- FOUND commits: 56c1da9, 6011b16
