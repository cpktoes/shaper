---
phase: quick-261008-lsy
plan: 02
subsystem: board-lock (greying half)
tags: [design-screens, controls, accessibility, playwright, board-lock]
requires: [261008-lsy-01]
provides:
  - "BoardLockScope (wraps every /design screen) and useControlsLocked(); the flag itself lives in use-controls-locked.ts"
  - "SliderRow and MeasureField grey themselves automatically on a locked board"
  - "Explicit disabled={locked} on every other board-changing control on all six screens; data-lock-exempt on every view-only one"
  - "TwoOptionToggle disabled prop; checkbox greyed look that actually shows (data-disabled classes)"
  - "TEMPLATE drawing draws no grab points while locked"
  - "SUMMARY: Board Name read-only, Fin System greyed on screen and full ink in print"
  - "board-lock-scope.test.ts: the control inventory (eight files)"
  - "e2e/board-lock-screens.spec.ts: the browser walk, computer + both phones + sideways"
affects: []
tech-stack:
  added: []
  patterns:
    - "One plain React context for presentation, backed by the store's real guard"
    - "A source-reading inventory test that fails on any control neither tied to the lock nor marked data-lock-exempt"
key-files:
  created:
    - components/design/board-lock-scope.tsx
    - components/design/use-controls-locked.ts
    - components/design/board-lock-scope.test.ts
    - e2e/board-lock-screens.spec.ts
  modified:
    - app/design/layout.tsx
    - components/design/slider-row.tsx
    - components/design/measure-field.tsx
    - components/ui/checkbox.tsx
    - components/viewer/two-option-toggle.tsx
    - components/outline/outline-controls.tsx
    - components/outline/outline-editor.tsx
    - components/rocker/rocker-controls.tsx
    - components/rocker/blank-picker.tsx
    - components/rocker/blank-flag.tsx
    - components/rails/rail-controls.tsx
    - components/rails/rail-legend-ticks.tsx
    - components/fins/fin-controls.tsx
    - components/volume/volume-controls.tsx
    - components/summary/order-form.tsx
    - components/summary/order-form-primitives.tsx
decisions:
  - "The lock flag and its hook live in their own small file (use-controls-locked.ts); board-lock-scope.tsx provides it and re-exports it (see Deviation 1)"
  - "PillButton reads the lock itself; the inventory checks its own button instead of listing every use"
status: complete
actuals:
  tokens: 21100
  tasks: 3
  commits: 3
---

# Phase quick-261008-lsy Plan 02: The board lock (greying half) Summary

On a locked board every control that changes the board is now greyed and genuinely switched off on all six design screens, on a computer, an upright phone and a phone held sideways, while everything that only changes the view still works, the printed order form is unchanged, and pressing Unlock brings it all back at once.

## What a shaper sees now

Open a locked board and:

- **TEMPLATE:** the feet and inches pickers (or the typed centimetre box), the length slider, every slider and the five tail-shape buttons are greyed. The drawing still shows its construction but has no points to grab. "View Construction Lines" still ticks.
- **ROCKER:** every slider and typed box (the DATASHEET's typed thickness cells too), the blank picks, "Switch to This Blank", "Move to Where It Fits", "Remove This Blank", "Reset Fine-Tune", the Automatic buttons and the Tip Style and Fine-tune toggles are greyed. The VIEWER, DATASHEET and TOP VIEW tabs, section open/close, and the "Change Blank" list still work.
- **RAILS:** all sliders, Sym, Hard Edge, Remove, Use Single Tuck, the foil-thickness link and "Reset Advanced Settings" are greyed. Opening and closing a section or Advanced, the nine legend ticks and "Include Rail Band Instructions in Print" still work.
- **VOLUME:** the two import ticks, the length pickers and every slider are greyed.
- **FINS:** the import tick, length pickers, sliders, tail shapes, fin setups, model pills, the 5th/Center fin tick, the Override button and "Reset Advanced Settings" are greyed. The McKee toe-in table link opens and closes the table, and "Fin Placement Callouts" still toggles.
- **SUMMARY:** the Board Name can be read and printed but not typed into; the Fin System choice is greyed on screen. Print Order Form, Export Template and the print tick work. On paper a locked board's Fin System prints in full ink (measured, below).
- **Everywhere:** tabs, zoom, rotate, fullscreen, show/hide ticks, the ☰ tiles, Back + Next, App Default Settings and the gear menu are untouched. Pressing Unlock brings every control back.

## Commits

| Task | Commit | What |
| ---- | ------ | ---- |
| 1 (tracer) | 40f30f6 | The lock scope, the two shared rows, the checkbox look, TEMPLATE greyed with no grab points, the inventory test (RED then green), s-template |
| 2 | 0fe0f77 | TwoOptionToggle disabled; ROCKER, RAILS, FINS greyed; inventory covers six files; s-rocker, s-rocker-hand-set, s-rails, s-fins |
| 3 | 427c4f4 | VOLUME and SUMMARY; read-only Board Name; print-safe Fin System; inventory covers eight files; s-volume, s-summary, p-screens, p-sideways |

## Mechanism

- `BoardLockScope` wraps `app/design/layout.tsx`'s content, so all six screens (SUMMARY too) are inside it and the top bar, gear menu, ☰ sheet and App Default Settings (mounted from the root layout) are outside it.
- `SliderRow` and `MeasureField` read it and treat it as `disabled` (a locked board dims the row and disables the slider or box). Everything else got an explicit `disabled={locked}`; the view-only ones carry `data-lock-exempt`.
- `components/design/board-lock-scope.test.ts` reads each lockable file, strips comments, finds every `<button`, `<Button`, `<Checkbox`, `<Select`, `<Slider`, `<TwoOptionToggle`, `<input`, `<Input`, `<select`, and fails (file:line) on any that is neither `disabled={…locked…}` nor `data-lock-exempt`. It also asserts the two shared rows call `useControlsLocked()`, `TwoOptionToggle` can be disabled, `PillButton` reads the lock, Board Name carries `readOnly={locked}` and the layout wraps in `<BoardLockScope>`.
- **RED proof (Task 1):** with only TEMPLATE's file listed and none of its disables written, the test failed on exactly the five unprotected controls (the two Selects at lines 145 and 160, the raw Slider at 188, the tail-shape button at 306 and the Checkbox at 429); it went green after the edits. Task 2 and 3 additions were driven the same way (the list of offenders came from the failing test).

## Test results

- `npm test`: **129 files, 4603 passed, 2 skipped, 0 failed** (one plain run, no timeouts; the plan 01 baseline was 128 files / 4591).
- `npx tsc --noEmit -p .` clean; `npm run lint` clean.
- Playwright `e2e/board-lock-screens.spec.ts` (`PW_PORT=3191`), three runs back to back after the last test edit: **11 passed, 16 skipped (project-pinned), 0 failed** each time. Per project: desktop 7 (s-template, s-rocker, s-rocker-hand-set, s-rails, s-fins, s-volume, s-summary), iphone 2 (p-screens, p-sideways), android 2 (p-screens, p-sideways).
- Related specs run on the desktop project after Tasks 1 and 2: touch-drag, undo-redo, outline-ghost, desktop-baseline, board-lock, rocker-live-controls, rocker-blanks, rocker-cut: all green.
- Whole browser suite: see "Full browser suite" at the end.

## Print proof (the founder's "a locked board must still PRINT in full ink")

s-summary reads the Fin System select's computed opacity, colour, `-webkit-text-fill-color`, border and background. Locked on screen: opacity under 1 (greyed). Locked with `emulateMedia({ media: "print" })`: opacity `"1"`. After Unlock the same select in print media has an identical record, so a locked board's print equals an unlocked one's. The Board Name is `readOnly`, never `disabled`, so it needs no print rule at all and prints as before. The only print-only classes added are `print:disabled:opacity-100 print:disabled:[-webkit-text-fill-color:currentColor]` on that one select.

## Deviations from Plan

**1. [Rule 3 - Blocking] The lock hook moved to its own file so the shared rows stay unit-testable**
- **Found during:** Task 1 verify (`npx vitest run components/design`).
- **Issue:** the plan puts `useControlsLocked` in `board-lock-scope.tsx`, which imports the design store, which imports the database client. `slider-row.tsx` importing it made `slider-row.test.ts` (node environment, no `DATABASE_URL`) fail to load.
- **Fix:** the context and `useControlsLocked()` live in `components/design/use-controls-locked.ts` (no store import); `board-lock-scope.tsx` provides the context and re-exports `useControlsLocked`. The shared rows and every control file import from the small file. Behaviour and the plan's exports are unchanged.
- **Commit:** 40f30f6.

**2. [Rule 1 - Bug in my first draft] Hooks called conditionally**
- `SliderRow` / `MeasureField` first wrote `disabled || useControlsLocked()`; ESLint's rules-of-hooks flagged it. Both now read the hook on its own line first. **Commit:** 40f30f6.

**3. [Plan assertion adjusted - measured] s-template "Unlock brings every range back"**
- A few TEMPLATE sliders are off for their own reasons even on an unlocked board (the diamond-only depth on a round tail, a pinned tail block), so "every range enabled after Unlock" is false by design. The test asserts at least eight come back. VOLUME and FINS (board imports its template, Advanced collapsed) keep nearly every slider off on an unlocked default board too, so their "Unlock brings it back" check is that some board-changing control (a tick, a pill) is live again.

**4. [Plan adjusted - measured] FINS test board**
- No stand-in preset draws the McKee toe-in table link, and a locked board cannot be changed to a McKee model. s-fins therefore opens the mid-length quad unlocked, picks McKee SB/Gun, goes back to the rack, locks that very board from its ⋯ (Plan 01's "takes effect in the open editor at once" path), and returns to FINS. This also exercises that path.

**5. [Plan simplification] PillButton not listed in the inventory's tag list**
- Because PillButton reads the lock itself (as planned), the inventory checks PillButton's own `<button disabled={disabled || locked}>` instead of requiring `disabled={…locked…}` on each of its uses.

**6. Test hardening only:** the post-open "Unlock is in the bar" wait got a 20 s timeout after one cold-start flake on the android sideways test (passed in every later run).

## Watch items

- **One look change on an UNLOCKED board:** the plan's `data-disabled:` classes on the shared checkbox make a Base UI checkbox that is disabled for its own reasons finally look disabled. The one such tick in the app is VOLUME's "Use This Board's Real Rail & Thickness Data" when "Measure This Board's Real Shape" is off: it was already inert, but looked live; it now dims to half strength. No desktop baseline picture shows that state (all five baselines passed unchanged).
- ROCKER's `Live` wrapper already dims rows that don't follow the tab; a locked row inside a not-live group dims twice (about 16%). Accepted by the plan.
- The unlocked-board desktop baselines under `e2e/desktop-baseline.spec.ts-snapshots/` did not change and were not re-recorded.

## Known Stubs

None.

## Threat Flags

None. T-lsy-08/09 are covered (store guard from Plan 01, inventory test, no drag handler while locked, browser proof); T-lsy-10 accepted as planned (controls are `disabled`, never `inert`, so screen readers still hear their values).

## How the founder can look at it

Practice rack at `/test-rack?boards=5` (the `review-stand-ins` launch entry on port 3005): ⋯ on a board, **Lock board**, then **Open This Board**, and walk TEMPLATE, ROCKER, RAILS, VOLUME, FINS and SUMMARY. Things worth poking at: dragging on the TEMPLATE drawing (no grab points), the ROCKER DATASHEET typed cells, a RAILS section open/close, FINS Advanced and the toe-in table (needs a McKee model, so on the practice rack lock a board after choosing one), SUMMARY's Board Name and Fin System, then print preview of SUMMARY on a locked board, then **Unlock**.

## Full browser suite

`PW_PORT=3191 npx playwright test --reporter=list` on the main checkout, after the last commit (427c4f4): **970 passed, 686 skipped (project-pinned tests), 0 failed, 0 flaky, exit 0**, 30.2 minutes (1656 tests; Plan 01's run was 959 + 670 = 1629, the difference being this plan's 11 + 16). Final line and exit code read in their own step. No desktop baseline picture changed (all five `desktop-baseline.spec.ts` pictures passed unchanged, in the full suite and in two earlier targeted runs).

## Self-Check: PASSED

- Created files exist: `components/design/board-lock-scope.tsx`, `components/design/use-controls-locked.ts`, `components/design/board-lock-scope.test.ts`, `e2e/board-lock-screens.spec.ts`.
- Commits 40f30f6, 0fe0f77, 427c4f4 are on main.
- No file under `lib/geometry/` changed; nothing was pushed; no database or `.env*` file was touched.

## Follow-up: the greyed look

**What the founder found (2026-10-08, walking the practice rack):** several controls were correctly switched off on a locked board but did not look greyed: TEMPLATE's Board Length label, ROCKER's Center Thickness label, RAILS' Family and Ratio sliders with their captions, the Sym tick and "Use Board's Rocker & Foil Thickness", FINS' Fin Setup label. Appearance only; the disabled state was right.

**What changed (commit 8052da1):** every row whose control was greyed but whose label, caption, tick marks or value kept full ink now fades with it, with the same `opacity-40` the `SliderRow` rows use (so a screen reads uniformly greyed, the way VOLUME did):
- TEMPLATE: the whole Board Length row.
- ROCKER: the Center Thickness row; the Fine-tune off and Tip Style labels and hints; the "Removing it keeps the rocker and foil..." caption under Remove This Blank.
- RAILS: the Family column, the Ratio column (with Sym and Hard Edge), the foil-thickness link block, and in Advanced the Corner Cut Offset and Bottom Tuck 3 blocks.
- FINS: the Inputs "Import Template Values" tick, the Fin Setup / Thruster Model / Quad Model / Twin Template labels, the McKee note, the 5th/Center fin tick, the Rear Off-Tail label and its value beside Override, and the Board Length / Tail Width / Tail Shape rows (these three already faded while the board imports its template; they now also fade when locked with the import off).
- VOLUME: the two tick labels and the dimensions row (which now also fades when locked with the import off).
- SUMMARY: the Board Name field fades on screen while locked and prints in full ink (`print:opacity-100`), like the Fin System.
Pill buttons and tail-shape buttons are not double-faded: only their labels fade, the buttons already carry their own disabled fade. Nothing changes on an unlocked board: every new class is conditional on the lock.

**The new check** (`e2e/board-lock-screens.spec.ts`, "reads as greyed, label and all"; 18 tests = look-template, look-rocker (boards 1 and 5), look-rails (also with every Advanced open), look-volume, look-fins (boards 1 and 3, also with Advanced open) and look-summary, on desktop, iPhone and Pixel 7 upright; the phones open board 1 only, because the swipe rack has no hover). For every board-changing control in the controls panel (anything not `data-lock-exempt`, including slider thumbs) it multiplies the opacity of the control and every ancestor, requires 0.6 or less, then does the same for every visible text in the control's row (the nearest ancestor holding text beyond controls' own; a `<label>` is its own row; a row of more than six controls or 240 characters is a whole section and is skipped). SUMMARY checks the Board Name and Fin System. It names the offender and its row.

**What it named on the code before the fix** (desktop; the phones named the same): TEMPLATE "Board Length — 6'2"" (three times, once per picker and the slider); ROCKER "Center Thickness" label, "The board's one center thickness..." caption, the Fine-tune off and Tip Style labels and their hints; RAILS "Use Board's Rocker & Foil Thickness" with its caption, "Family — med", Boxy / Medium / Knifey, "Ratio — 60/40", "Sym", the 30/70 / 50/50 / 60/40 / 70/30 ticks, "Family — med/knifey", "Hard Edge"; FINS "Inputs", "Import Template Values", "Fin Setup" (once per button), "Thruster Model" (once per pill); the later runs added FINS Advanced's Override row and SUMMARY's Board Name. After the fix all 18 pass.

**Measured:** a screenshot of RAILS (Nose and Center rails) and FINS (quad, Inputs through Fin Setup) on a locked board reads uniformly greyed; headings, the Advanced disclosure and "Copy preset values" (a dev-only button) stay in full ink, as exempt.

**Verification:** `npm test` 129 files, 4603 passed, 2 skipped; tsc and lint clean; look tests 18 passed.

### Follow-up: exporting and printing a locked board (founder, 2026-10-08)

The founder: "when a board is locked, I do still want to export/print out the order form and the templates." **Nothing was greyed or blocked** on any of these paths (the export window, View Full Sized and the print buttons are not in the lock's reach, and are marked `data-lock-exempt` where they sit in a lockable file), so no component needed changing; the proof is new (commit 8c09fe9, `e2e/board-lock-screens.spec.ts`, "still exports and prints exactly as an unlocked one does", 9 tests = x-template, x-summary, x-rails on desktop, iPhone and Pixel 7 upright):

- **TEMPLATE:** the toolbar's Export Template opens the window; Overview Sheet, Full Sized Template and Full Sized Template - Paper Saver are each picked (`aria-pressed`), A4 and Letter each switch, and Download PDF produces a `.pdf` for every one (the download event is caught; the window closes itself after each, as it does unlocked).
- **SUMMARY:** Export Template does the same; Print Order Form calls `window.print` (stubbed and counted); the **whole** printed form, every element of `[data-order-form-page]` in print media (opacity, ink, text fill, background, border colour; more than 200 elements), is identical locked and after Unlock (desktop); the Include Rail Band Instructions tick still ticks.
- **RAILS:** View Full Sized opens and its Print button calls `window.print`; the print tick toggles; the gear menu (or ☰ on a phone) opens App Default Settings and it opens. (The gear menu holds no print options today, only units, theme, blank makers and fit defaults.)
- **No change, no save:** after all of it the controls text (TEMPLATE, RAILS) or the form text (SUMMARY) equals what it was, Unlock is still in the bar, and no server-action request was sent by the export, print or settings steps. The only requests are the print-instructions preference save when that tick is pressed (a setting about printing, never the board), and the test sets those aside.
- Test hardening: tests that open a locked board retry their set-up once if a cold dev server answers the first client-side navigation with a full page load (which forgets the open board); the first two failing runs of this follow-up were exactly that.

**Totals after the last commit (8c09fe9):** `npm test` 129 files, 4603 passed, 2 skipped (unchanged component code since the look fix); tsc and lint clean; `board-lock-screens.spec.ts` + `board-lock.spec.ts` two back-to-back runs after the last edit: 48 passed, 30 skipped, 0 failed (the earlier run of the pair had one s-fins flake, since hardened). **Whole browser suite: 997 passed, 686 skipped, 0 failed, exit 0** (1683 tests, 30.6 minutes; 970 + the 18 look tests + the 9 export tests). No desktop baseline picture changed.
