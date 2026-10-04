---
phase: quick-261003-uwi
plan: 01
status: complete
subsystem: settings
tags: [settings, theme, units, blank-makers, fit-defaults, menu, phone]
requires: []
provides:
  - "One App Default Settings row in the gear menu and the ☰ sheet"
  - "App Default Settings pop-up: Imperial | Metric, five theme tiles, the blank makers on one row, the fit and tip defaults"
  - "ROCKER's Change Fit Rules opening the pop-up at WHICH BLANKS FIT"
affects: [settings menu, phone menu, ROCKER blank list, fit and tip defaults]
tech-stack:
  added: []
  patterns:
    - "A provider inside all four settings providers renders the one pop-up (AppSettingsProvider)"
    - "Theme tiles paint from each theme's own ramp through rampVar() — the one documented component read of the ramp layer"
key-files:
  created:
    - components/app-settings-provider.tsx
    - components/theme-tiles.tsx
    - e2e/helpers/settings.ts
    - e2e/app-settings.spec.ts
  modified:
    - components/app-settings-dialog.tsx (renamed with git mv from components/fit-defaults-dialog.tsx)
    - components/fit-defaults-provider.tsx
    - components/settings-menu.tsx
    - components/design/phone-menu.tsx
    - components/rocker/blank-flag.tsx
    - components/rocker/blank-picker.tsx
    - app/layout.tsx
    - app/globals.css
    - lib/theme.ts
    - lib/theme.test.ts
    - lib/units-isolation.test.ts
    - CLAUDE.md
    - e2e/fit-defaults.spec.ts
    - e2e/blank-makers.spec.ts
    - e2e/new-board.spec.ts
    - e2e/rocker-blanks.spec.ts
    - e2e/rocker-cut.spec.ts
    - e2e/contact.spec.ts
    - e2e/phone-layout.spec.ts
    - e2e/phone-sideways-top-bar.spec.ts
decisions:
  - "Change Fit Rules scrolls the pop-up as far toward WHICH BLANKS FIT as it can go: where everything under that heading is shorter than the pop-up's window (desktop, Pixel 7) it stops at the end, about 110 dots under the top, with the whole fit part down to Done in view — no padding was added to force the heading to the very top"
metrics:
  duration: "about 75 minutes"
  completed: 2026-10-04
actuals:
  tokens: 27900
  tasks: 3
  commits: 5
---

# Quick 261003-uwi: App Default Settings pop-up Summary

The settings menu is down to one row. On a computer the gear holds Contact, Privacy and **App Default Settings**;
on a phone the ☰ sheet keeps its six screen pictures, Home, Contact, Privacy and the account, with that same one row
where the Units, Theme, Blanks and Blank Makers groups used to run off the bottom of the screen. Tapping the row
closes the menu and opens one pop-up titled App Default Settings ("Your defaults for this app. Changes apply at
once.") that holds, top to bottom:

- **UNITS** — Imperial and Metric side by side, each with its example board under the name (6'2" · 18 3/4" · 2 1/4"
  and 188.0 × 47.6 × 5.7 cm); the current one is filled in. A tap switches every number on screen and is remembered.
- **THEME** — five small pictures in one row: System, Daylight, Chalk, Slate, Phosphor. Each is drawn in that
  theme's own colours (a top bar with the wordmark and the tab underline, a canvas with a little board) whatever
  theme is on screen, with its name under it and a tick on the current one. System's picture is Daylight and Slate
  split corner to corner, and a screen reader hears "System — follows your device, Slate right now" (or Daylight).
  Hovering a tile with a mouse shows its description.
- **BLANK MAKERS** — US Blanks, Arctic Foam and Marko Foam as three tick toggles on one row. Unticking one takes its
  blanks off the ROCKER list at once; the last one ticked is locked, and "Keep at least one maker ticked" shows
  under the row.
- a hairline, then **WHICH BLANKS FIT** and **NEW BOARDS START WITH** exactly as they were in Fit & Tip Defaults.

The footer reads **Restore Fit & Tip Defaults** (it resets only those seven values — never units, theme or makers)
and **Done**; there is no Save. ROCKER's two **Change Fit Rules** buttons keep their wording and open the same
pop-up scrolled to WHICH BLANKS FIT, with that heading focused.

## Commits

| # | Commit | What changed on screen |
|---|--------|------------------------|
| 1 (tracer) | 5018958 | One App Default Settings row in the menu opens a pop-up with Imperial and Metric side by side |
| 2 (tests first) | 5ad5738 | The checks the theme pictures must pass, failing until commit 3 |
| 2 | 068ed61 | Theme pictures, blank makers on one row, both menus down to one row, Change Fit Rules lands on the fit part |
| 3 | 8224d53 | The eight older browser tests reach their settings through App Default Settings |

## Planner rulings as built

- **U-1** — `AppSettingsProvider` (components/app-settings-provider.tsx) is mounted directly inside ThemeProvider,
  wrapping the design store, and renders the one pop-up; `useAppSettings().openAppSettings(at?)` opens it.
  FitDefaultsProvider keeps its seven values, setters, write queue and handoff effects untouched and only lost the
  dialog and its opener. The dialog file moved with `git mv` to components/app-settings-dialog.tsx (history kept).
- **U-2** — each Units button carries its example line in 11px under the 12px bold name; TwoOptionToggle's pressed
  and unpressed colours (on-accent text on the pressed one).
- **U-3** — tiles are buttons named by the theme; description as the hover title; System's visible name "System",
  spoken name from `systemTileName()`. At 360 wide every name is whole (browser test i).
- **U-4** — the tiles paint only through `rampVar()` in inline styles; the unit test forbids any colour literal in
  components/theme-tiles.tsx; app/globals.css's header and LAYER 1 comments now name the tiles as the one exception.
- **U-5** — three equal columns; at 360 wide "Arctic Foam" and "Marko Foam" wrap onto two lines inside their chips
  as planned; each toggle is 44 dots tall under a touch pointer.
- **U-6** — ROCKER's "Showing … only — change in Settings" note unchanged.
- **U-7** — order UNITS, THEME, BLANK MAKERS, hairline, the fit part; all five labels are h3 headings in the old
  label style. The pop-up's own 16-dot rhythm separates the top three sections; the fit groups keep their 24.
- **U-8** — the row is "App Default Settings" with "Units, theme, blank makers, fit and tips" under it, the sliders
  icon, 44 dots tall under a touch pointer.
- **CLAUDE.md** Rule 2's first sentence now says Imperial or Metric is picked in App Default Settings — the gear
  menu on a computer, the ☰ menu on a phone. Nothing else in CLAUDE.md changed.

## Deviations from Plan

### Adjusted by measurement

**1. [Rule 1 - Measured] Change Fit Rules: "heading within 80 dots of the top" only where the pop-up can scroll that far**
- **Found during:** Task 2, browser test h.
- **Measured:** the pop-up does scroll to the fit part and focuses WHICH BLANKS FIT, but on the desktop
  (scrollTop 259 of a possible 259, heading offsetTop 371) and the Pixel 7 (277 of 277, offsetTop 385) everything
  under the heading is shorter than the pop-up's window, so it stops at the end with the heading about 108–112 dots
  under the top — the whole fit part down to Done in view. On the iPhone the fit part is taller than the window and
  the heading lands at the top.
- **Fix:** no padding added to force it higher (that would leave an empty band under Done). Test h now passes when
  the heading is inside the pop-up's visible box AND either within 80 dots of its top or the pop-up is scrolled as
  far as it goes; Extra Length is in view; phones scroll (scrollTop > 0) as planned.
- **Commit:** 068ed61.

**2. [Rule 3 - Blocking] Test h changes the makers from ROCKER itself**
- **Found during:** Task 2, on the iPhone project: a maker's tick saves through a Server Action, which refreshes
  the page it was made on, and the test's following `page.goto("/design/rocker")` was cut short by that refresh.
- **Fix:** the test opens ROCKER first, then unticks US Blanks and Marko Foam from the pop-up there. 5" did empty
  the list (no Planer Max Depth seeding needed).
- **Commit:** 068ed61.

**3. [Rule 2 - Added proof] Restore Fit & Tip Defaults leaves Metric chosen**
- The plan asked the restore tests to prove units stay as they were; e2e/fit-defaults.spec.ts's Metric test now
  changes Extra Length, restores, and checks every field reads its metric default with Metric still pressed.
- **Commit:** 8224d53.

### Otherwise

The plan's `at` prop was wired in Task 1 as a data attribute and removed in Task 2 when it began to scroll.

## Verification

- `npx vitest run`: 103 files passed and 2 timed out under load while the nine-spec browser run was going
  (lib/geometry/blank-fit.test.ts, lib/geometry/phase14-curves.test.ts, each one test at 5.5 s); both re-run alone
  with `--testTimeout=120000`: 79 of 79 passed. Totals: 3,962 passed, 2 skipped.
- `npx tsc --noEmit` and `npm run lint`: clean (`npx next typegen` run once for the worktree's route types).
- The nine specs (app-settings, fit-defaults, blank-makers, new-board, rocker-blanks, rocker-cut, contact,
  phone-layout, phone-sideways-top-bar) on desktop, android and iphone together: 252 passed, 60 skipped, 0 failed.
- The whole browser suite, once per project, detached, one after another on port 3168:

| Project | Passed | Skipped | Failed | Re-runs |
|---------|--------|---------|--------|---------|
| desktop | 213 | 171 | 0 | none |
| android | 257 | 127 | 0 | none |
| iphone  | 249 | 135 | 0 | none |

- Desktop reference pictures (e2e/desktop-baseline.spec.ts) passed unmoved; nothing re-recorded.
- `npm run build` and e2e/prod were not run (they cannot run in a worktree) — the orchestrator runs them after the
  merge.
- Pictures taken at 360x640 (android) in Chalk and on the desktop in Slate to check the tiles and the makers row
  read as one family with Tip Style; the scratch spec that took them was deleted.

## Threat surface

Nothing new beyond the plan's register: the tiles build `var(--ramp-<id>-<role>)` only from THEME_TILE_IDS and the
fixed THEME_TILE_ROLES (T-uwi-01, unit-tested); the last maker stays locked (T-uwi-04, browser test g).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: components/app-settings-provider.tsx, components/app-settings-dialog.tsx, components/theme-tiles.tsx,
  e2e/helpers/settings.ts, e2e/app-settings.spec.ts
- FOUND commits: 5018958, 5ad5738, 068ed61, 8224d53
