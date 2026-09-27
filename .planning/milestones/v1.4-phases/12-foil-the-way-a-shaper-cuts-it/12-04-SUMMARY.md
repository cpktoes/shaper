---
phase: 12-foil-the-way-a-shaper-cuts-it
plan: 04
subsystem: fit defaults dialog, gear menu, two-way pill
status: complete
tags: [fit-defaults, tip-style, accessibility, touch-sizing, e2e]
requires:
  - "12-03: FitDefaultsKey (seven, tipStyle last), FitDefaultsPreference / FitDefaults with tipStyle, the stored and read Tip Style default, parseFitDefaultsPatch's Tip Style allow-list"
provides:
  - "TwoOptionToggleProps.ariaLabel (role=\"group\" wrapper when given), aria-pressed on each pill, focus-ring-accent + coarse:min-h-11"
  - "provider setDefault<K extends FitDefaultsKey>(key: K, value: FitDefaultsPreference[K])"
  - "the dialog's Tip Style row (last in NEW BOARDS START WITH)"
  - "the gear menu detail line \"Spare foam, planer, skin and tips\""
affects:
  - "12-08 (the ROCKER sidebar's own Tip Style pills reuse TwoOptionToggle with ariaLabel=\"Tip Style\" and get aria-pressed / 44px for free)"
tech-stack:
  added: []
  patterns:
    - "Dialog rows as a discriminated list ({ kind: \"measure\"; key } | { kind: \"tipStyle\" }) so a choice row sits among the typed rows"
    - "Setter typed per key (generic K) so a key can only be paired with its own kind of value"
key-files:
  created: []
  modified:
    - components/viewer/two-option-toggle.tsx
    - components/viewer/two-option-toggle.test.ts
    - components/fit-defaults-provider.tsx
    - components/fit-defaults-dialog.tsx
    - components/settings-menu.tsx
    - app/actions/fit-defaults.ts
    - e2e/fit-defaults.spec.ts
    - e2e/touch-sizing.spec.ts
key-decisions:
  - "The dialog's Tip Style tap compares against the resolved value, so tapping Pin deck when nothing is chosen stores nothing (proved in the browser: no localStorage entry, no cookie)"
  - "A desktop check was added beside the phone one: RAILS's Flat / Domed pills stay under 44px on a mouse, proving the new height is pointer-keyed"
metrics:
  duration: "about 25 minutes"
  completed: 2026-09-26
  tasks: 2
  files: 8
actuals:
  tokens: 7000
  tasks: 2
  commits: 3
---

# Phase 12 Plan 04: Tip Style default and the accessible two-way pill Summary

A shaper can now set their Tip Style, Pin deck or Bottom, once in the gear menu's Fit & Tip Defaults,
and every new board starts with it. The two-way pill that shows it, which is also RAILS's Flat / Domed
pair, now tells a screen reader which side is on. It shows the accent ring on keyboard focus and is
44px tall under a finger. A mouse sees nothing new.

## What a shaper sees

- **Fit & Tip Defaults** has a seventh row, last under NEW BOARDS START WITH: **Tip Style**, with the
  hint "Pin deck takes the tips' extra off the bottom; Bottom takes it off the deck." and a
  `Pin deck` / `Bottom` pair on the right. Pin deck is on out of the box.
  - A tap takes effect at once. The browser remembers it, and so does the account when signed in.
  - Tapping the option already on stores nothing.
  - Restore Defaults puts it back to Pin deck along with every number.
- **The gear menu row** still reads "Fit & Tip Defaults", with the same icon in the same place. The
  line under it now reads "Spare foam, planer, skin and tips".
- **RAILS, INSTRUCTIONS page:** the Flat / Domed pills are 44px tall on a phone, as FINS's pills
  already were. On a desktop with a mouse they are exactly as before.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Tip Style becomes a shaper's own default (tracer) | `62529ed` | two-option-toggle.tsx (+test), fit-defaults-provider.tsx, fit-defaults-dialog.tsx, e2e/fit-defaults.spec.ts |
| 2 | Gear menu detail line; RAILS pills finger-sized; account-save notes say seven | `be5165b` | settings-menu.tsx, app/actions/fit-defaults.ts, e2e/fit-defaults.spec.ts, e2e/touch-sizing.spec.ts |

**Tracer gate:** this was an autonomous run. After Task 1's commit, its `<verify>` passed end to end:
the toggle test, `tsc`, and fit-defaults on all three projects (20 passed, 1 skipped). Only then did
Task 2 start.

## Code changes

- `TwoOptionToggle`:
  - New optional `ariaLabel`. When it is given, the wrapper becomes `role="group"` with that name.
    Without it, the wrapper is exactly as before, which is how RAILS uses it.
  - `aria-pressed={active}` on each pill.
  - The class run is now `focus-ring-accent cursor-pointer rounded-md border px-1 py-2.5 text-[11px] font-bold coarse:min-h-11 …`.
    The three pinned class strings are byte-identical and still contiguous.
  - The header comment explains that `PillButton` already had the focus ring and the touch height
    (09-REVIEW WR-02), and that this copy was extracted without them.
  - The source-contract test gained three assertions: `aria-pressed={active}`, the conditional
    `role=`, and the full `focus-ring-accent … coarse:min-h-11` run. The five original assertions
    are unchanged.
- Provider:
  - `setDefault` is now `<K extends FitDefaultsKey>(key: K, value: FitDefaultsPreference[K])`, and
    the context type matches.
  - It still commits a one-key patch. There is one commented `as FitDefaultsPatch`, needed because a
    computed key widens the object type.
  - The now-unused `FitDefaultsMmKey` and `Mm` imports are gone, and a stale "five fields" comment
    now says seven.
- Dialog:
  - `GROUPS` holds `rows: DialogRow[]` with `DialogRow = { kind: "measure"; key } | { kind: "tipStyle" }`.
  - The Tip Style row uses the same `flex items-start justify-between gap-4` layout: the label is
    `text-sm text-surf-ink`, the hint is `mt-0.5 text-xs text-surf-ink-muted`, and the pair sits in
    a `shrink-0` column.
  - The pair is `ariaLabel="Tip Style"`, with
    `onChange={(next) => { if (next !== defaults.tipStyle) setDefault("tipStyle", next); }}`.
- `app/actions/fit-defaults.ts`: only comments changed (`git diff` shows comment lines only). They
  now say seven settings, name Planer Max Depth, Deck Skin and Tip Style, and note that the retired
  key is refused.

## Verification

- `npx next typegen` (once), then `npx tsc --noEmit`: clean.
- `npx vitest run`: 74 files, 2,923 passed, 2 skipped. That is 3 more than 12-03's 2,920, and the
  two skips were already there. The run includes `lib/db`.
- `npm run lint`: 0 errors, and the same 11 old warnings in `scripts/extract-prototype-*.mjs`.
- `IS_WEBPACK_TEST=1 PW_PORT=3154`:
  - `e2e/fit-defaults.spec.ts` + `e2e/touch-sizing.spec.ts` on all projects: 57 passed, 24 skipped.
    The skips are the desktop-only and touch-only halves.
  - The two new Flat / Domed tests ran where they should: iPhone and Android at 44px or more,
    desktop under 44px.
  - `e2e/phone-rails.spec.ts` + `e2e/keyboard-focus.spec.ts` on all projects: 33 passed, 33 skipped.
    The skips are the spec files' own project gates.
  - `e2e/desktop-baseline.spec.ts --project=desktop`: 5/5 passed, with no update flag.
- No failures, no retries, and no timeouts under sibling load.

## Desktop baselines (SHA-256), before and after

| Picture | Before | After |
|---------|--------|-------|
| outline (TEMPLATE) | ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0 | ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0 (unchanged) |
| rocker | 75ee2ce14d11fadb7d863762f4a2f72c8f8a367c1960080a8e5509ba55101731 | 75ee2ce14d11fadb7d863762f4a2f72c8f8a367c1960080a8e5509ba55101731 (unchanged) |
| rails | 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373 | 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373 (unchanged, matches the plan) |
| volume | e6d97a8ddbe815b1d5b32f2593762c6c7c3faf3885d5f94375a3fcf5ba5a8372 | e6d97a8ddbe815b1d5b32f2593762c6c7c3faf3885d5f94375a3fcf5ba5a8372 (unchanged) |
| fins | a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62 | a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62 (unchanged) |

`git diff --name-only main..HEAD -- e2e/desktop-baseline.spec.ts-snapshots` lists only
`rocker-desktop-desktop-darwin.png`, which 12-03 re-recorded.

## Deviations from Plan

None. Every change is in the eight allowed files. Two small additions are worth noting:

1. **An extra desktop test in `e2e/touch-sizing.spec.ts`.** It checks that RAILS's Flat / Domed pills
   stay under 44px on a mouse. The plan asked only for the phone check. This one proves the new
   height follows the pointer and not the screen width (CLAUDE.md Layout). It asserts "under 44" and
   does not pin an exact pixel height, so it will not break on a font-rendering change.
2. **The menu-text assertion moved in Task 2's commit, as the orchestrator ruled.** In
   `e2e/fit-defaults.spec.ts`, "Spare foam and tip thickness" became "Spare foam, planer, skin and
   tips", in the same commit as `settings-menu.tsx`. So `e2e/fit-defaults.spec.ts` appears in both
   task commits.

No test-only allow-list or compile fix was needed outside the list.

## Human check (recorded, not stopped for; end-of-phase mode)

- Signed in on a real device, set Tip Style to Bottom in Fit & Tip Defaults. Then open the gear menu
  on another device signed in to the same account: Bottom should be selected there too. Clerk never
  settles under the suite's fake key, so the browser tests cannot reach this account round trip. The
  save path is the unchanged patch-shaped Server Action, which checks every patch again on the server
  with `parseFitDefaultsPatch`.
- On a real phone, the Tip Style pills and RAILS's Flat / Domed pills should feel finger-sized. On a
  desktop with a keyboard, tabbing onto a pill should show the accent ring.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register.
- T-12-13: the pill only ever sends its two fixed options, `pinDeck` and `bottom`. The server checks
  every patch again, and the browser copy is re-parsed through the same allow-list when it is read.
- T-12-14: `aria-label` is always a fixed string from the code (`"Tip Style"`), never anything a user
  typed.
- T-12-SC: nothing was installed, and `package.json` / `package-lock.json` are untouched.

## Self-Check: PASSED

- All eight modified files exist, and `git diff --name-only 5f9c072..HEAD` lists exactly them.
- Commits `62529ed` and `be5165b` are on this branch. Both end with the
  `Co-Authored-By: Claude Fable 5.1` trailer.
- Acceptance greps:
  - `two-option-toggle.tsx` contains `aria-pressed={active}`, `focus-ring-accent`, `coarse:min-h-11`
    and the contiguous base run.
  - `fit-defaults-dialog.tsx` contains `ariaLabel="Tip Style"` and the hint sentence.
  - `settings-menu.tsx` contains the new detail line and no longer contains the old one.
- The RAILS baseline hash matches the plan. STATE.md and ROADMAP.md are untouched.
