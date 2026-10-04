---
phase: quick-261003-uwi
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/app-settings-provider.tsx
  - components/app-settings-dialog.tsx
  - components/fit-defaults-dialog.tsx
  - components/theme-tiles.tsx
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
  - e2e/helpers/settings.ts
  - e2e/app-settings.spec.ts
  - e2e/fit-defaults.spec.ts
  - e2e/blank-makers.spec.ts
  - e2e/new-board.spec.ts
  - e2e/rocker-blanks.spec.ts
  - e2e/rocker-cut.spec.ts
  - e2e/contact.spec.ts
  - e2e/phone-layout.spec.ts
  - e2e/phone-sideways-top-bar.spec.ts
  - .planning/quick/261003-uwi-app-default-settings-pop-up-units-theme-/261003-uwi-SUMMARY.md
autonomous: true
requirements: [QT-261003-uwi]
estimate:
  # One executor in its own git worktree. Three tasks: the pop-up's new home (a provider inside
  # ThemeProvider), the menus' one row and the Imperial | Metric pair proved end to end (tracer);
  # the theme tiles (pure helpers with unit tests), the makers row and Change Fit Rules landing on the
  # fit part; then eight browser specs moved onto one helper and the whole suite on three projects.
  tokens: 340000
  raw_tokens: 340000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "On a computer the gear menu holds Contact, Privacy and ONE row, App Default Settings (detail line: Units, theme, blank makers, fit and tips); on a phone the ☰ sheet holds the six screen tiles, Home, Contact, Privacy, the same one row and the account. Neither menu has a Units, Theme, Blanks or Blank Makers group any more. Tapping the row closes the menu and opens a pop-up titled App Default Settings."
    - "The pop-up's UNITS is one row of two buttons, Imperial | Metric, each with today's example line under its name (6'2\" · 18 3/4\" · 2 1/4\" and 188.0 × 47.6 × 5.7 cm); the current one is pressed; a tap changes every number on screen at once and the choice survives a reload."
    - "THEME is five small tiles in one row — System, Daylight, Chalk, Slate, Phosphor — each a miniature painted from that theme's OWN colours whatever theme is on screen, its name under it, the current choice ticked; a tap switches the theme at once and survives a reload; System's tile is Daylight and Slate split corner to corner and its spoken name says what the device picks right now (e.g. System — follows your device, Slate right now)."
    - "BLANK MAKERS is the three makers as tick toggles in one row; unticking one takes its blanks off the ROCKER list at once (the Showing … only line), and the last ticked maker is locked with Keep at least one maker ticked."
    - "WHICH BLANKS FIT and NEW BOARDS START WITH work exactly as they did in Fit & Tip Defaults; the footer reads Restore Fit & Tip Defaults (it resets only those seven values, never units, theme or makers) and Done; there is no Save."
    - "ROCKER's two Change Fit Rules buttons keep their wording and open the same pop-up already scrolled to WHICH BLANKS FIT, with focus on that heading."
    - "On a 360x640 phone the pop-up has no sideways scroll and the five theme tiles sit in one row with every name whole; on a phone held sideways at 844x340 it scrolls inside itself down to Done; under a touch pointer every control in it is at least 44 dots tall."
  artifacts:
    - path: components/app-settings-provider.tsx
      provides: "The one App Default Settings pop-up, rendered once inside ThemeProvider; useAppSettings().openAppSettings(at?) opens it"
      contains: "openAppSettings"
    - path: components/app-settings-dialog.tsx
      provides: "The pop-up: UNITS pair, THEME tiles, BLANK MAKERS row, then the fit and tip fields (renamed with git mv from the Fit & Tip Defaults dialog)"
      contains: "App Default Settings"
    - path: components/theme-tiles.tsx
      provides: "Five theme tiles, each a miniature painted through rampVar from its own --ramp-<id>-* tokens"
      contains: "rampVar"
    - path: lib/theme.ts
      provides: "rampVar, THEME_TILE_ROLES, THEME_TILE_IDS, SYSTEM_TILE_HALVES, systemTileName — pure, unit-tested"
      contains: "export function rampVar"
    - path: e2e/helpers/settings.ts
      provides: "openSettingsMenu / appSettingsRow / openAppSettings — through the gear or ☰, whichever the window shows"
      contains: "export async function openAppSettings"
    - path: e2e/app-settings.spec.ts
      provides: "The new browser tests: one row in both menus, units, tiles and their colours, System following the device, makers, Change Fit Rules at the fit part, 360x640 and 844x340"
  key_links:
    - from: components/settings-menu.tsx
      to: components/app-settings-provider.tsx
      via: "AppSettingsMenuItem's Menu.Item calls useAppSettings().openAppSettings()"
      pattern: "openAppSettings\\(\\)"
    - from: components/rocker/blank-picker.tsx
      to: components/app-settings-provider.tsx
      via: "Change Fit Rules calls openAppSettings(\"fit\") (blank-flag.tsx the same)"
      pattern: "openAppSettings\\(\"fit\"\\)"
    - from: app/layout.tsx
      to: components/app-settings-provider.tsx
      via: "AppSettingsProvider mounted directly inside ThemeProvider, wrapping the design store's Provider, so the pop-up can read units, fit defaults, makers AND theme"
      pattern: "<AppSettingsProvider>"
    - from: components/theme-tiles.tsx
      to: app/globals.css
      via: "rampVar(id, role) → var(--ramp-<id>-<role>), the tokens every theme declares at :root"
      pattern: "rampVar\\("
---

<objective>
Condense the settings menu. Today the computer's gear menu and the phone's ☰ sheet each carry a Units group, a Theme
group (five rows with descriptions), a Blanks row and a Blank Makers group of tick boxes — on a phone the Theme rows run
past the bottom of the screen. After this task both menus carry ONE row, "App Default Settings", that opens a pop-up
(grown from today's Fit & Tip Defaults dialog) holding, condensed: Imperial | Metric on one row, five small theme tiles
that show what each theme looks like, the three blank makers on one row, then the fit and tip defaults exactly as they
work today.

Purpose: the founder's request (2026-10-03): "settings menu needs some condensing … Keep everything pretty condensed." The
menus get short enough to read at a glance on a phone, and every app-wide default lives in one place.

Output: a new provider and pop-up, the theme tiles, both menus trimmed to one row, ROCKER's Change Fit Rules landing on
the fit part, a shared browser-test helper, a new browser spec, eight older specs moved onto the pop-up, and a SUMMARY.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<decisions>
Founder request, verbatim (2026-10-03, after the phone tiles and Back/Next went live):
"settings menu needs some condensing. Maybe we make a "App Default Settings" section that opens a pop up like fit and
tips. Keep everything pretty condensed: Add units selection buttons on one row, Imperial/Metric. Theme choices, with
small example tiles of each option, and the fit and tip default values. Even what blank mfgs to use can be in that
section."

Orchestrator rulings (the founder may overrule at review):

- **S1 — One row in both menus.** The gear menu and the ☰ sheet replace the Units, Theme, Blanks and Blank Makers groups
  with ONE row, "App Default Settings", that opens the pop-up and closes the menu. Contact and Privacy stay where they
  are; the sheet keeps its six tiles, Home, Contact, Privacy and the account, unchanged.
- **S2 — The pop-up.** Today's Fit & Tip Defaults dialog grown into "App Default Settings" (one dialog, rendered once).
  Order, all condensed: UNITS (two buttons on one row, current one pressed via aria-pressed, applying on the tap); THEME
  (one small tile per option — System, Daylight, Chalk, Slate, Phosphor — in one row where it fits, each a miniature
  painted from its OWN --ramp-<id>-* tokens, never hand-copied hex, name under it, current choice ticked; System's tile
  shows what it follows and says so in its accessible name); BLANK MAKERS (three compact toggles on one row, the last one
  locked with the existing hint); then WHICH BLANKS FIT and NEW BOARDS START WITH exactly as today.
- **S3 — Applies at once.** No Save. Footer keeps Done; Restore Defaults keeps restoring the fit and tip values only and
  says so: "Restore Fit & Tip Defaults".
- **S4 — ROCKER's buttons.** The two buttons that open the dialog today keep their wording and open the same pop-up
  scrolled to, and focused on, the fit part.
- **S5 — Sizes.** 44-dot touch targets under a coarse pointer (pointer rule). Fits an upright 360-wide phone with no
  sideways scroll, scrolls inside itself on a short screen, theme tiles legible.
- **S6 — Copy.** Plain English. Title "App Default Settings"; a one-line description saying these are your defaults for
  this app and apply at once.

Planner rulings (each the founder may overrule at review):

- **U-1 — A new provider owns the pop-up.** In app/layout.tsx, ThemeProvider and BlankMakersProvider sit INSIDE
  FitDefaultsProvider, so a dialog rendered by FitDefaultsProvider (where it lives today) cannot read the theme or the
  makers. A new `AppSettingsProvider` (components/app-settings-provider.tsx), mounted directly inside ThemeProvider,
  renders the one pop-up and offers `useAppSettings().openAppSettings(at?)`. FitDefaultsProvider keeps its seven values
  and setters untouched and only loses the dialog. The dialog file moves with `git mv` from
  components/fit-defaults-dialog.tsx to components/app-settings-dialog.tsx (history kept, the name now honest).
- **U-2 — Each Units button keeps its example line.** Inside each button, under the name, today's example in 11px
  (6'2" · 18 3/4" · 2 1/4" / 188.0 × 47.6 × 5.7 cm, the Shortboard through `formatDimsExample`). Measured at plan time
  in the app's Inter: 108.5 and 110.8 dots, inside a button about 129 dots wide at 360. The preview the menu gave
  survives with no extra row.
- **U-3 — Tiles' names.** Each theme tile is a button named by the theme ("Daylight"), with its description as the
  mouse-hover title. System's visible name is "System"; its spoken name is "System — follows your device, Slate right
  now" ("your device" replaces "the OS" — plain English). System's miniature is Daylight's top-left half and Slate's
  bottom-right half, split corner to corner. Longest name, Phosphor, measures 49.9 dots at 11px against a 56-dot tile at
  360 wide (tiles have no side padding; 4-dot gaps).
- **U-4 — The one place a component paints from a ramp.** app/globals.css says the `--ramp-*` layer is never referenced
  by a component; the theme tiles are the one documented exception (they must show every theme at once, whichever is on
  screen), always through `rampVar()` in lib/theme.ts. The globals.css comment is amended to say so.
- **U-5 — Makers row.** Three equal columns. On a narrow phone a maker's name may wrap onto two lines inside its toggle
  (Arctic Foam 62 dots, Marko Foam 64.5 at 11px, against about 62 dots of room at 360 wide) rather than overflow; a
  touch toggle is 44 dots tall either way. Each toggle shows today's small tick box, so the existing hint's word
  "ticked" still reads true.
- **U-6 — ROCKER's note unchanged.** "Showing US Blanks only — change in Settings" stays as is: the gear is still named
  Settings and the pop-up is one tap from it.
- **U-7 — Order and copy.** UNITS, THEME, BLANK MAKERS, a hairline, then WHICH BLANKS FIT and NEW BOARDS START WITH. The
  description reads "Your defaults for this app. Changes apply at once." (283 dots — one line at 360 wide). All five
  group labels become h3 headings with today's label style.
- **U-8 — The menu row.** Label "App Default Settings", detail line "Units, theme, blank makers, fit and tips" (202
  dots at 11px; fits the gear menu's 256-dot minimum), sliders icon, 44 dots tall under a touch pointer — today's Blanks
  row's shape.
</decisions>

<context>
@.planning/STATE.md
@CLAUDE.md
@AGENTS.md
@components/settings-menu.tsx
@components/fit-defaults-dialog.tsx
@components/fit-defaults-provider.tsx
@components/design/phone-menu.tsx
@components/site-nav.tsx
@lib/theme.ts
@lib/theme.test.ts
@components/theme-provider.tsx
@components/units-provider.tsx
@components/blank-makers-provider.tsx
@components/viewer/two-option-toggle.tsx
@components/ui/dialog.tsx
@app/layout.tsx

Facts established at plan time (do not re-explore):

- app/layout.tsx nests: UnitsProvider › PrintInstructionsProvider › FitDefaultsProvider › BlankMakersProvider ›
  ThemeProvider › Provider (the design store) › SiteNav + children. global-error.tsx has no providers and no nav.
- `useTheme()` gives `{ preference, setPreference, resolved, systemTheme }` (systemTheme = what the device picks right
  now). `useUnits()` gives `{ system, setSystem }`. `useBlankMakers()` gives `{ hidden, setMakerShown }`;
  `isLastShownMaker(hidden, vendor)` is in lib/blank-makers-preference.ts; `KNOWN_BLANK_VENDORS` is in
  lib/blanks/vendors.ts. `useFitDefaults()` gives the seven values, `setDefault`, `restoreDefaults`, and today the
  dialog opener (the three callers: settings-menu.tsx's Blanks row, blank-flag.tsx ~line 107/118, blank-picker.tsx
  ~line 160/178 — both ROCKER buttons read "Change Fit Rules").
- Every theme declares, at bare `:root` in app/globals.css (lines ~205–313), `--ramp-<id>-ground`, `-sidebar`,
  `-canvas`, `-tab-active`, `-panel`, `-well`, `-ink`, `-ink-muted`, `-line`, `-line-faint`, `-accent`, `-on-accent`,
  `-accent-ink`, … `-fill`. lib/theme.test.ts already reads globals.css (`describe("agreement with globals.css")`).
- DialogContent (components/ui/dialog.tsx): `max-w-[calc(100%-2rem)] p-4 sm:max-w-sm`, a close X at top right, and the
  current dialog adds `max-h-[calc(100dvh-2rem)] overflow-y-auto`. At 360 wide the content box is 296 dots.
- Base UI 1.7.0: `Dialog.Popup`'s `initialFocus` accepts a function `(openType) => boolean | HTMLElement | null`.
- lib/units-isolation.test.ts names components/fit-defaults-dialog.tsx in its converted-files list (~line 357) and
  components/settings-menu.tsx in the "display site" candidates (~line 235, comments ~225 and ~251).
- Storage keys: units "shaper-units", theme "shaper-theme", fit defaults "shaper-fit-defaults", makers
  "shaper-blank-makers" (JSON array of HIDDEN makers). Banner/tip dismissal keys "shaper-sign-in-banner-dismissed" and
  "shaper-toolbar-tip-dismissed".
- Thickest blank centres in the catalogues: Arctic Foam 4.378" (10'6" G); US Blanks and Marko Foam 5.5". ROCKER's Center
  Thickness field tops out at 5". So with US Blanks and Marko Foam unticked, a 5" centre empties the ROCKER list and
  shows blank-picker's "Change Fit Rules" (`[data-blank-list-empty]`).
- FINS has its own "Settings ▸" button: the gear must always be found with `{ name: "Settings", exact: true }`.

Executor ground rules (from the orchestrator):

- You run in your own git worktree. If node_modules is missing: `cp -Rc /Users/kontoes/Code/shaper/node_modules
  ./node_modules`. If `npx tsc --noEmit` reports missing route types, run `npx next typegen` once.
- Port 3000 is the founder's own `next dev` on the main checkout — never start `next dev` there, never touch
  `.next/dev/lock`. Every Playwright call uses `PW_PORT=3168 IS_WEBPACK_TEST=1` (Playwright starts its own server).
- A foreground Bash call is cut off at 10 minutes. Run each whole-project browser run detached:
  `(nohup bash -c "<cmd> > <log> 2>&1; echo EXIT \$? >> <log>" &)` and poll the log for the EXIT line. Never a
  `pgrep -f playwright` wait loop; never leave a `tail -f … | grep` watcher running; never return (finish) while a run
  you started is still going.
- Under heavy load the 1,635-board suites (lib/geometry/blank-fit.test.ts, lib/geometry/phase14-curves.test.ts) can time
  out at 5 s — re-run those two with `--testTimeout=120000`. A lone timeout on a screen this task does not touch is
  load: re-run that file alone and record it.
- `npm run build` cannot run in a worktree; the orchestrator runs it after the merge.
- The desktop reference pictures (e2e/desktop-baseline.spec.ts) show no open menu and should not move; never pass
  `--update-snapshots`; re-record a picture only if its diff is explained, and say so in the SUMMARY.
- No human checkpoint. Task 1 is typed tracer — do NOT stop after it; carry on through Task 3.
- Commit messages in plain English for a shaper (what changes on the screen), each ending with the line
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stay inside `files_modified`. Do not touch STATE.md or ROADMAP.md.
</context>

<tasks>

<task type="tracer">
  <name>Task 1: One App Default Settings row opens the pop-up, and Imperial | Metric works from it (end to end)</name>
  <files>components/app-settings-provider.tsx, components/app-settings-dialog.tsx (git mv from components/fit-defaults-dialog.tsx), components/fit-defaults-provider.tsx, components/settings-menu.tsx, components/rocker/blank-flag.tsx, components/rocker/blank-picker.tsx, app/layout.tsx, lib/units-isolation.test.ts, e2e/helpers/settings.ts, e2e/app-settings.spec.ts</files>
  <read_first>
    - components/fit-defaults-provider.tsx lines 273–297 (where the dialog is held today) and the doc comment at the top
    - components/fit-defaults-dialog.tsx (whole file — it becomes the pop-up)
    - components/settings-menu.tsx lines 43–52 (the Shortboard example), 128–241 (the shared content), 335–367 (UnitsRow)
    - components/viewer/two-option-toggle.tsx (the pressed / unpressed colours to match)
    - app/layout.tsx lines 118–150
    - e2e/helpers/screens.ts (the hydration wait `waitForMenuButton` and `openPhoneMenu`'s animation wait — reuse the idea)
    - e2e/fit-defaults.spec.ts lines 19–60 (the banner / tip dismissal init scripts to copy)
  </read_first>
  <action>
Per S1, S2, S3, S6, U-1, U-2, U-7 and U-8. This task builds the pop-up's home and its first section; Task 2 adds the
theme tiles and the makers row and finishes trimming the menus.

1. New `components/app-settings-provider.tsx` ("use client"). Context value `{ openAppSettings: (at?: "fit") => void }`.
   State: `open` (boolean) and `at` ("fit" or null — what the pop-up was opened for). `openAppSettings` sets both (a
   plain open passes nothing, so `at` resets to null). Renders `children` then
   `<AppSettingsDialog open={open} onOpenChange={setOpen} at={at} />`. `useAppSettings()` throws
   "useAppSettings must be used within an AppSettingsProvider" outside it (the same shape as `useFitDefaults`). Doc
   comment in plain words: the one pop-up, rendered once here because a menu's popup unmounts the moment it closes; it
   sits inside ThemeProvider because ThemeProvider and BlankMakersProvider are nested inside FitDefaultsProvider, so this
   is the one place all four settings (units, fit and tip defaults, makers, theme) can be read.
2. app/layout.tsx: mount `<AppSettingsProvider>` directly inside `<ThemeProvider>`, wrapping `<Provider>`. Update the two
   comments that describe the old arrangement (the Units comment's "settings menu's Units group beside its Theme group",
   and FitDefaultsProvider's "and the nav's gear menu, which opens its dialog").
3. components/fit-defaults-provider.tsx: remove the dialog render, its open state, the opener field (from the context
   value, the `FitDefaultsContextValue` interface and the `useMemo` deps), the dialog import and the now-unused React
   import. Every value, setter, the write queue and the handoff effects stay byte-for-byte. Update the doc comments that
   mention the dialog.
4. `git mv components/fit-defaults-dialog.tsx components/app-settings-dialog.tsx`, then in it: export
   `AppSettingsDialog({ open, onOpenChange, at })`. Title "App Default Settings"; description "Your defaults for this
   app. Changes apply at once." Add a UNITS section ABOVE the two existing groups: a label "UNITS" in the file's
   `GROUP_LABEL_CLASS`, then a wrapper with `role="group"` and `aria-label="Units"` holding two buttons in two equal
   columns (6-dot gap): Imperial and Metric. Each: `type="button"`, `aria-pressed` for the current system, the same
   colours as TwoOptionToggle (pressed: accent fill, on-accent text and border; unpressed: line border, sidebar fill, ink
   text), `focus-ring-accent`, `coarse:min-h-11`, the name in 12px bold, then the example line in 11px (unpressed:
   ink-muted; pressed: on-accent — the contract's pairing rule). The example is the Shortboard run through
   `formatDimsExample(…, "imperial" | "metric")` — move `UNITS_EXAMPLE_SUMMARY` and its comment over from
   settings-menu.tsx. A tap calls `setSystem` only when the tapped system differs from the current one (the dialog's
   "only a real change counts" rule). Footer: the Restore button's label becomes "Restore Fit & Tip Defaults" (S3) — it
   still calls `restoreDefaults` and nothing else; Done unchanged. Keep `initialFocus` as it is (a touch pointer focuses
   the pop-up itself, a mouse or keyboard lands on the first control). Accept the `at` prop now; Task 2 makes it scroll.
   Update the file's doc comment (what the pop-up holds, who opens it, why it is rendered by AppSettingsProvider).
5. components/settings-menu.tsx: new export `AppSettingsMenuItem` — a plain `Menu.Item` (closes the menu on click) that
   calls `openAppSettings()`, with the sliders icon, "App Default Settings" and the detail line "Units, theme, blank
   makers, fit and tips", in today's Blanks-row classes (44 dots under a touch pointer). In the shared content component
   both menus render, replace the Units radio group AND the Blanks group with `<AppSettingsMenuItem />` as the first
   row; the Theme group and the Blank Makers group stay below it for this task (Task 2 moves them into the pop-up).
   Delete `UnitsRow` and the imports only it used (units hook, summary-line, presets, ruler icon, `UnitsSystem`), and
   the fit-defaults hook import. components/design/phone-menu.tsx needs no change in this task.
6. components/rocker/blank-flag.tsx and components/rocker/blank-picker.tsx: each "Change Fit Rules" button now calls
   `openAppSettings("fit")` from `useAppSettings()` (an arrow in `onClick`); wording unchanged (S4). blank-flag.tsx keeps
   its other `useFitDefaults()` use (the `settings` read ~line 167). Update the comments that name the gear menu's Fit &
   Tip Defaults dialog to "the fit part of App Default Settings".
7. lib/units-isolation.test.ts: the converted-files entry for the old dialog file now names
   components/app-settings-dialog.tsx (comment: the App Default Settings pop-up — Imperial | Metric examples and the fit
   and tip marks); in the "display site" candidates replace components/settings-menu.tsx with
   components/app-settings-dialog.tsx and update the two comments that named settings-menu.tsx.
8. New `e2e/helpers/settings.ts`: `appSettingsRow(page)` = menuitem named `/^App Default Settings/`;
   `appSettingsDialog(page)` = dialog named "App Default Settings"; `openSettingsMenu(page)` finds whichever trigger the
   window shows — the gear (`{ name: "Settings", exact: true }`) when the desktop row shows, else the banner's "Menu" —
   waits until React owns it (the `__reactFiber` check from helpers/screens.ts), then clicks it only while the row is not
   yet visible, retried with `toPass` (20 s) so a click before hydration is retried and an open menu is never toggled
   shut; returns the open menu. `openAppSettings(page)` opens the menu, clicks the row, waits for the dialog and for its
   open animation to finish (`getAnimations` as openPhoneMenu does), and returns the dialog. Doc comments in plain words.
9. New `e2e/app-settings.spec.ts` (all three projects unless a test says otherwise; dismiss the banner and the toolbar
   tip with init scripts before every test):
   a. "the menu has one App Default Settings row and no Units rows": open the menu on /design/outline; the row is
      visible and carries the detail line; the menu holds no `menuitemradio` named Imperial or Metric and no menuitem
      named Fit & Tip Defaults; Contact and Privacy rows are there; on a phone the six `[data-screen-tile]` tiles and
      `[data-phone-menu-account]` are still there. On the desktop project, repeat at 844x390 (a short screen, so ☰).
   b. "the row closes the menu and opens App Default Settings, Imperial pressed": click the row; the menu is hidden; the
      dialog shows its title and description; Imperial (`/^Imperial/`) is `aria-pressed="true"`, Metric `"false"`.
   c. "Metric applies at once and survives a reload": on "/" open the pop-up, tap Metric; Metric pressed; close with
      Done; the first preset card's textContent matches `/\d+\.\d × \d+\.\d × \d+\.\d cm/` (poll); localStorage
      "shaper-units" is "metric"; reload; reopen; Metric still pressed; tap Imperial and the card reads feet and inches
      again.
  </action>
  <verify>
    <automated>npx vitest run lib/units-isolation.test.ts lib/theme.test.ts && npx tsc --noEmit && npm run lint && PW_PORT=3168 IS_WEBPACK_TEST=1 npx playwright test e2e/app-settings.spec.ts --project=desktop --project=android --project=iphone</automated>
  </verify>
  <done>
Both menus show the App Default Settings row where Units and Blanks were; it opens the pop-up titled App Default
Settings; Imperial | Metric switch every number at once and the choice survives a reload, on all three projects; tsc,
lint and the two unit files are green. (Specs that drive the old Units rows or the old dialog name fail until Task 3 —
expected, and recorded in the commit body.) Committed, e.g. "One App Default Settings row in the menu opens a pop-up
with Imperial and Metric side by side".
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Theme tiles, the blank makers on one row, both menus down to one row, and Change Fit Rules landing on the fit part</name>
  <files>lib/theme.ts, lib/theme.test.ts, components/theme-tiles.tsx, components/app-settings-dialog.tsx, components/settings-menu.tsx, components/design/phone-menu.tsx, app/globals.css, CLAUDE.md, e2e/app-settings.spec.ts</files>
  <read_first>
    - lib/theme.ts (whole) and lib/theme.test.ts lines 1–90
    - app/globals.css lines 1–60 and 185–320 (the ramp layer and its comments)
    - components/theme-provider.tsx lines 88–153
    - components/settings-menu.tsx (as Task 1 left it — the Theme group, ThemeRow, BlankMakerRow and its tick box)
    - components/design/phone-menu.tsx (doc comment lines 1–40 and the popup body)
    - components/rocker/blank-picker.tsx lines 155–185 (the empty-list Change Fit Rules)
  </read_first>
  <behavior>
    Unit tests in lib/theme.test.ts, written first and seen failing:
    - `rampVar("slate", "ground")` is exactly `var(--ramp-slate-ground)`; `rampVar("daylight", "ink-muted")` is `var(--ramp-daylight-ink-muted)`.
    - For every id in THEMES and every role in THEME_TILE_ROLES, app/globals.css declares `--ramp-<id>-<role>:` (so a tile can never point at a missing token).
    - THEME_TILE_IDS is `["system", "daylight", "chalk", "slate", "phosphor"]` (System first, then THEMES in registry order).
    - SYSTEM_TILE_HALVES is `{ light: DEFAULT_LIGHT_THEME, dark: DEFAULT_DARK_THEME }`, and each names a registered theme of that mode.
    - `systemTileName(getTheme("slate")!)` is `System — follows your device, Slate right now`; with Daylight it ends `Daylight right now`.
    - components/theme-tiles.tsx (read as text, comments stripped) calls `rampVar(` and contains no hex colour literal (a `#` followed by 3–8 hex digits) — the tiles paint only from the tokens.
  </behavior>
  <action>
Per S1, S2, S4, S5, U-3, U-4, U-5 and U-7.

1. lib/theme.ts (pure, DOM-free as the file already is): `THEME_TILE_ROLES` = ground, panel, canvas, ink, ink-muted,
   line-faint, accent, fill (a readonly tuple; `ThemeTileRole` its member type); `rampVar(themeId, role)` returning
   `var(--ramp-<id>-<role>)`; `THEME_TILE_IDS` = "system" then every THEMES id in order; `SYSTEM_TILE_HALVES` = the
   default light and dark theme ids; `systemTileName(systemTheme)` = "System — follows your device, <label> right now".
   Doc comments say why: the App Default Settings pop-up shows every theme at once, so its tiles read each theme's own
   ramp, never the live `--surf-*` contract. Update the module header's "the settings menu … read this list" to name the
   pop-up's theme tiles. Make the behaviour tests pass.
2. New `components/theme-tiles.tsx` ("use client"): `ThemeTiles` reads `useTheme()` and renders a `role="group"`
   `aria-label="Theme"` grid whose columns are `repeat(auto-fit, minmax(3.25rem, 1fr))` with a 4-dot gap — five across
   from 276 dots of content up (every phone 360 wide and wider), wrapping only below that. One tile per THEME_TILE_IDS
   entry: a `type="button"` with `aria-pressed` (pressed = `preference` equals the id), `data-theme-tile="<id>"`, no side
   padding, `focus-ring-accent`; inside, a miniature (aria-hidden, 4:3, rounded, a hairline border in that theme's own
   line-faint) and the name under it in 11px ink, centred, never truncated. A tap calls `setPreference(id)` only when it
   differs from `preference`. The pressed tile gets a 2-dot ring in the live accent-ink around its miniature and a small
   tick badge in the miniature's top-right corner (live accent fill, on-accent tick) — the pop-up's own chrome, so it
   uses the live `surf-*` classes. A theme tile's title (hover) is its description; System's button gets
   `aria-label={systemTileName(systemTheme)}` and the same text as its title, visible name "System".
   The miniature, painted ONLY through inline `style` values built by `rampVar(id, role)` — no Tailwind arbitrary class
   built from a variable (Tailwind cannot see it), no hex literal: the miniature's root is the ground
   (`data-swatch="ground"`); a top strip about a quarter of its height in panel with a line-faint hairline under it,
   holding a short ink bar (the wordmark) and a short accent bar (the current-tab underline, `data-swatch="accent"`);
   below it the canvas with a small rounded board shape filled in that theme's fill and outlined in ink-muted. System's
   miniature is two full miniatures stacked — SYSTEM_TILE_HALVES.light under, .dark on top clipped to the bottom-right
   triangle by an inline `clip-path` polygon — each wrapped in an element with `data-swatch-half="light"` / `"dark"`.
3. components/app-settings-dialog.tsx: after UNITS add THEME (label "THEME", then `<ThemeTiles />`) and BLANK MAKERS
   (label "BLANK MAKERS", then a `role="group"` `aria-label="Blank Makers"` row of three equal columns, 6-dot gap): one
   toggle per KNOWN_BLANK_VENDORS maker — `type="button"`, `aria-pressed` = shown, `coarse:min-h-11`, a thin line-border
   chip holding today's 14–16-dot tick box (a check inside when shown, as BlankMakerRow draws it) and the maker's name in
   11px, left-aligned with `leading-tight` so a long name may wrap inside its chip (U-5). A tap calls
   `setMakerShown(vendor, !shown)`. The last shown maker (`isLastShownMaker`) is NOT `disabled` (it must stay focusable
   and readable): it gets `aria-disabled="true"`, its tap does nothing, and `aria-describedby` points at one muted 11px
   line under the row, "Keep at least one maker ticked", which renders only while a maker is locked. Then a hairline
   (line-faint), then the existing two groups unchanged, wrapped in an element with `data-app-settings-fit`. Turn all
   five group labels into `h3` elements with the same classes. The WHICH BLANKS FIT heading gets `tabIndex={-1}`, a ref
   and an `id`. Sections between UNITS and BLANK MAKERS may sit tighter than the fit groups' 24-dot rhythm (about 20),
   but nothing in the fit groups moves.
   S4 — `initialFocus`: when `at` is "fit", set the pop-up's own `scrollTop` so the WHICH BLANKS FIT heading sits at the
   top of its scroll area (its offset within the popup, which is fixed-position and so is the heading's offsetParent, less
   the popup's 16-dot top padding), then return the heading element (a heading never throws a phone keyboard up, so this
   applies on every pointer). Otherwise the existing rule. If the browser test shows the scroll is undone by focusing,
   set it again in a `requestAnimationFrame` — measure, do not guess.
4. Both menus down to one row (S1): delete the Theme radio group, `ThemeRow`, `BlankMakerRow` and the shared-content
   component from components/settings-menu.tsx with the imports only they used; the gear popup renders Contact,
   Privacy, the divider, then `<AppSettingsMenuItem />`; components/design/phone-menu.tsx imports `AppSettingsMenuItem`
   and renders it where the shared content was (tiles, Home, Contact, Privacy, divider, the row, divider, the account —
   the tiles and the account untouched). Rewrite the doc comments in both files that describe Units/Theme/Blank Makers
   rows (settings-menu header and the shared-content comment; phone-menu's "settings gear (Units, Theme)" and the
   `SettingsMenuContent` paragraph), and the gear popup's "Blank Makers tick boxes included" comment.
5. app/globals.css, comments only (U-4): the header's "Components only ever touch layer 3" and LAYER 1's "never
   referenced by a component" each gain the one exception — the App Default Settings theme tiles read each theme's own
   ramp through `rampVar()` in lib/theme.ts so every theme shows at once; nothing else may.
6. CLAUDE.md Rule 2, first sentence: Imperial or Metric is picked "in App Default Settings — the gear menu in the top
   bar on a computer, the ☰ menu on a phone" instead of "from the gear menu in the top bar". Nothing else in CLAUDE.md.
7. e2e/app-settings.spec.ts — extend and add:
   a+. Test a also asserts neither menu has any `menuitemradio` or `menuitemcheckbox` at all, and no group label
       reading "Blank Makers" (check the menu's `[role="group"]` names and its text outside the screen tiles).
   d. Theme tiles: `[data-theme-tile]` attributes in order system, daylight, chalk, slate, phosphor; on a fresh page
      System is pressed; tap Slate → `html` has classes `theme-slate` and `dark`, Slate pressed, the other four not;
      reload, reopen → still `theme-slate`, Slate pressed; tap System → `html` has no `theme-` class.
   e. Tiles paint their own colours: first tap Phosphor (so the live theme differs from most tiles); then for each of
      the four themes, the computed background of `[data-theme-tile="<id>"] [data-swatch="ground"]` and of its
      `[data-swatch="accent"]` equal the colour of that theme's raw `--ramp-<id>-ground` / `-accent` value (read with
      `getPropertyValue` on `document.documentElement`, normalised to `rgb(…)` by assigning it to a throwaway element's
      background and reading the computed style); System's `[data-swatch-half="light"] [data-swatch="ground"]` equals
      Daylight's ground and the dark half's equals Slate's.
   f. System follows the device: `page.emulateMedia({ colorScheme: "dark" })` → the System tile's name matches
      `/Slate right now/`; with System chosen, the computed `--surf-ground` on `html` equals Slate's ground;
      `colorScheme: "light"` → `/Daylight right now/`.
   g. Makers: the three toggles share one top (within 1 dot), all pressed and none `aria-disabled` on a fresh page;
      untick Arctic Foam → `aria-pressed="false"`; untick Marko Foam → US Blanks is `aria-disabled="true"`, still
      pressed, and the group's hint "Keep at least one maker ticked" is visible and is US Blanks' accessible description;
      tapping US Blanks leaves it pressed; tick Marko Foam → US Blanks loses `aria-disabled` and the hint is gone.
   h. Change Fit Rules lands on the fit part: in the pop-up untick US Blanks and Marko Foam, Done; open /design/rocker
      (wait for the list as blank-makers.spec.ts's `openRocker` does); "Showing Arctic Foam only — change in Settings"
      shows; type 5 into Center Thickness + Enter; `[data-blank-list-empty]` shows; click its "Change Fit Rules" → the
      dialog opens, `document.activeElement` is the WHICH BLANKS FIT heading, and the heading's top lies within the
      dialog's visible box (at or below the dialog's top, within 80 dots of it); on the phone projects the dialog's
      `scrollTop` is above 0. If 5" does not empty the list, also seed a 1/4" Planer Max Depth through the fit part
      before leaving the pop-up, and record that in the SUMMARY.
   i. 360x640 (phone projects; `setViewportSize({ width: 360, height: 640 })`): open the pop-up; `document.documentElement.scrollWidth`
      is at most 360; the dialog's `scrollWidth` is at most its `clientWidth` and its right edge at most 360; the five
      tiles share one top; every tile name's `scrollWidth` is at most its `clientWidth`; Imperial, Metric, the five tiles,
      the three makers, Restore Fit & Tip Defaults and Done are each at least 44 dots tall (`offsetHeight`).
   j. 844x340 (iphone project only; `setViewportSize({ width: 844, height: 340 })` — a short screen, so ☰): open the
      pop-up; its `scrollHeight` exceeds its `clientHeight`; Done, after `scrollIntoViewIfNeeded`, is in the viewport
      and the dialog's bottom is at most 340.
  </action>
  <verify>
    <automated>npx vitest run lib/theme.test.ts lib/units-isolation.test.ts && npx tsc --noEmit && npm run lint && PW_PORT=3168 IS_WEBPACK_TEST=1 npx playwright test e2e/app-settings.spec.ts --project=desktop --project=android --project=iphone</automated>
    <human-check>At the founder's review: open the pop-up in each of the four themes on a computer and on a phone — the five tiles read as small pictures of each theme, the names are legible, the tick sits on the current one, and the makers row and Imperial | Metric pair look like one family with Tip Style.</human-check>
  </verify>
  <done>
The pop-up shows UNITS, THEME (five tiles painted from their own tokens, System split and spoken as what the device
picks), BLANK MAKERS (one row, last one locked with the hint) and the fit part; both menus hold the single row; Change
Fit Rules opens the pop-up at WHICH BLANKS FIT with the heading focused; the 360x640 and 844x340 checks pass; the new
unit tests pass. Committed, e.g. "Pick a theme from small pictures of each one, blank makers on one row, and Change Fit
Rules opens straight at the fit settings".
  </done>
</task>

<task type="auto">
  <name>Task 3: Every older browser test reaches its setting through the pop-up, then the whole suite on three projects</name>
  <files>e2e/fit-defaults.spec.ts, e2e/blank-makers.spec.ts, e2e/new-board.spec.ts, e2e/rocker-blanks.spec.ts, e2e/rocker-cut.spec.ts, e2e/contact.spec.ts, e2e/phone-layout.spec.ts, e2e/phone-sideways-top-bar.spec.ts, .planning/quick/261003-uwi-app-default-settings-pop-up-units-theme-/261003-uwi-SUMMARY.md</files>
  <read_first>
    - e2e/helpers/settings.ts (Task 1)
    - e2e/fit-defaults.spec.ts (whole), e2e/blank-makers.spec.ts lines 1–155 and 196–205
    - e2e/new-board.spec.ts lines 38–75, e2e/rocker-blanks.spec.ts lines 173–205, e2e/rocker-cut.spec.ts lines 448–466
    - e2e/contact.spec.ts lines 44–72 and 145–150, e2e/phone-layout.spec.ts lines 209–230, e2e/phone-sideways-top-bar.spec.ts lines 249–290
  </read_first>
  <action>
Move every spec that drove the old menu rows or the old dialog onto `e2e/helpers/settings.ts`, deleting each spec's own
copy of the menu-trigger / open-the-menu helpers it no longer needs. Keep every behaviour each test proves; only the way
in and the names change. The dialog is now named "App Default Settings"; the restore button "Restore Fit & Tip
Defaults" (match it exactly). Where a text lookup inside the dialog could now match in two places, scope it to
`[data-app-settings-fit]`.

- e2e/fit-defaults.spec.ts: the menu-row and open-dialog helpers become the shared helper's; the first test asserts the
  App Default Settings row (with its detail line) opens the pop-up and the menu closes behind it, then every fit group,
  hint and default as before; the restore tests click Restore Fit & Tip Defaults and still prove the defaults return
  (and that units stay as they were); the 44-dot test measures the App Default Settings row, every field, both Tip
  Style pills and Restore Fit & Tip Defaults. Rename the describe to say the fit part of App Default Settings.
- e2e/blank-makers.spec.ts: opening the makers now opens the pop-up and returns its "Blank Makers" group; a maker is
  `group.getByRole("button", { name: new RegExp("^" + vendor) })`; checked state is `aria-pressed`; the locked one keeps
  `aria-disabled="true"` and the hint is checked as visible text in the group (and the locked button's accessible
  description), not inside the button's name; "closes the menu" becomes Done closing the pop-up; the "whole menu fits
  the screen" check becomes the dialog's bottom within the viewport; the 44-dot check stays. The ROCKER-list tests and
  their "Showing … only — change in Settings" expectations are unchanged (U-6).
- e2e/new-board.spec.ts (`openFitDefaults`) and e2e/rocker-blanks.spec.ts (lines ~183–200): open the pop-up through the
  helper; field names unchanged.
- e2e/rocker-cut.spec.ts `chooseUnits`: open the pop-up, tap the Units group's button whose name starts with the label,
  expect `aria-pressed="true"`, click Done, expect the dialog hidden.
- e2e/contact.spec.ts line ~148: the "menu is open" sentinel becomes the App Default Settings row.
- e2e/phone-layout.spec.ts: the "one popup holding both a units choice and the account control" test becomes the
  App Default Settings row and the account control (retitle to match).
- e2e/phone-sideways-top-bar.spec.ts "everything the desktop row offered is still here": the Imperial/Metric/System
  radio loop, the Fit & Tip row and the first tick box are replaced by the one App Default Settings row (scrolled into
  view, visible); everything else in the test stays.

Then the gates, in order:
1. `npx vitest run` (re-run blank-fit.test.ts and phase14-curves.test.ts with `--testTimeout=120000` if they time out
   under load), `npx tsc --noEmit`, `npm run lint`.
2. The eight migrated specs plus e2e/app-settings.spec.ts on all three projects (foreground is fine if it finishes
   inside 10 minutes; otherwise detach as below).
3. The whole browser suite once per project, each detached and polled, its log in your session's scratchpad directory
   (never inside the repo — Tailwind scans the working tree for class names):
   `(nohup bash -c "PW_PORT=3168 IS_WEBPACK_TEST=1 npx playwright test --project=desktop > <scratchpad>/uwi-desktop.log 2>&1; echo EXIT \$? >> <scratchpad>/uwi-desktop.log" &)`
   then the same for android and iphone, one after another (never two at once on one port). Poll each log for EXIT
   before starting the next. A lone timeout on a screen this task did not touch: re-run that file alone and record it.
   Desktop reference pictures must not move.
4. Write `.planning/quick/261003-uwi-app-default-settings-pop-up-units-theme-/261003-uwi-SUMMARY.md` (frontmatter
   `status: complete`) at that path inside the worktree: what changed on screen in plain English for a shaper, the
   planner rulings U-1 to U-8 as built (and any the browser forced you to adjust, with the measurement), the unit and
   browser counts per project, any re-runs and why, and the files touched. Commit it as the LAST commit.
  </action>
  <verify>
    <automated>npx vitest run && npx tsc --noEmit && npm run lint && PW_PORT=3168 IS_WEBPACK_TEST=1 npx playwright test e2e/app-settings.spec.ts e2e/fit-defaults.spec.ts e2e/blank-makers.spec.ts e2e/new-board.spec.ts e2e/rocker-blanks.spec.ts e2e/rocker-cut.spec.ts e2e/contact.spec.ts e2e/phone-layout.spec.ts e2e/phone-sideways-top-bar.spec.ts --project=desktop --project=android --project=iphone</automated>
  </verify>
  <done>
Every unit test, tsc and lint green; the nine specs above green on desktop, android and iphone; the whole browser suite
run once per project with every failure either fixed or shown to be load by a lone re-run; desktop pictures unmoved; the
SUMMARY committed last. Commits, e.g. "Browser tests reach Imperial, Metric, the blank makers and the fit settings
through App Default Settings" then "docs(quick-261003-uwi): summary — App Default Settings pop-up".
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser storage / cookie → providers | units, theme, fit defaults and makers are read back from localStorage and cookies a visitor can edit; each provider already parses them through its own allow-list (unchanged here) |
| theme id → inline style | the tiles build CSS `var()` references from theme ids |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-uwi-01 | Tampering | components/theme-tiles.tsx inline styles | low | mitigate | Tile styles are built only from THEME_TILE_IDS (the THEMES registry plus "system") and the fixed THEME_TILE_ROLES tuple via `rampVar` — never from a stored string; the unit test pins every id×role to a declared token and forbids hex literals in the tile file |
| T-uwi-02 | Tampering | stored theme / units / makers / fit values | low | accept | Unchanged: parseThemePreference, the units, makers and fit-defaults allow-lists still guard every read; the pop-up only re-presents the same providers' values |
| T-uwi-03 | Information disclosure | App Default Settings pop-up | low | accept | No new data is stored, sent or shown; the account writes are the providers' existing ones |
| T-uwi-04 | Denial of service | "last maker" lock | low | mitigate | The last shown maker is `aria-disabled` and `withMakerShown` already refuses to hide it, so the ROCKER list can never be emptied from the pop-up (test g) |
</threat_model>

<verification>
- `npx vitest run`, `npx tsc --noEmit`, `npm run lint` green in the worktree.
- e2e/app-settings.spec.ts and the eight migrated specs green on desktop, android and iphone; the whole browser suite run
  once per project (detached, polled), failures fixed or shown to be load by a lone re-run; desktop pictures unmoved.
- After the merge the orchestrator runs `npm run build` on the main checkout.
</verification>

<success_criteria>
- Both menus show one App Default Settings row in place of Units, Theme, Blanks and Blank Makers; the ☰ sheet's six
  tiles, Home, Contact, Privacy and the account are unchanged.
- The pop-up holds Imperial | Metric, five theme tiles painted from their own tokens, the makers on one row, and the fit
  and tip defaults exactly as before; everything applies at once; Restore Fit & Tip Defaults resets only those values.
- Change Fit Rules on ROCKER opens the pop-up at WHICH BLANKS FIT with focus there.
- The pop-up fits 360x640 with no sideways scroll and scrolls inside itself at 844x340; touch targets at least 44 dots.
</success_criteria>

<output>
Create `.planning/quick/261003-uwi-app-default-settings-pop-up-units-theme-/261003-uwi-SUMMARY.md` (worktree-relative,
frontmatter `status: complete`) and commit it inside the worktree as the last commit.
</output>
