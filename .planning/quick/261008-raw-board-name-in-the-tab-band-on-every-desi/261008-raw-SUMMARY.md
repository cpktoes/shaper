---
phase: quick-261008-raw
plan: 01
subsystem: design-screens / tab band
tags: [board-name, tab-band, rename, first-save, board-lock, phone-chrome, playwright]
requires:
  - quick 261008-lsy (board lock: padlock, noteRenamed, data-lock-exempt sweeps)
provides:
  - the board's name (or "Untitled") at the right end of the tab band on TEMPLATE, ROCKER, RAILS, VOLUME, FINS
  - one first-save in the design store (saveForFirstTime) shared by the top bar's Save and the band's Untitled
  - the practice rack can rename (saveStandInName), so the browser suite and the founder's practice server can try it
affects:
  - components/viewer/tabbed-panel.tsx (new `trailing` slot; phone tabs 18 -> 8 dots of side padding)
  - app/design/actions.ts (renameModel: signed-out practice-rack branch only)
  - the five desktop baseline pictures (NOT re-recorded - founder decides)
tech-stack:
  added: []
  patterns:
    - optional render-prop slot proven byte-identical when unset against a pre-edit fixture
    - in-flight ref guard so two buttons share one first save
key-files:
  created:
    - components/design/board-name-copy.ts
    - components/design/board-name-tab.tsx
    - components/design/board-name-tab.test.ts
    - components/viewer/tabbed-panel.test.ts
    - components/viewer/__fixtures__/tabbed-panel-before.json
    - e2e/board-name-band.spec.ts
  modified:
    - components/viewer/tabbed-panel.tsx
    - components/design/design-store.tsx
    - components/design/save-button.tsx
    - components/setup/board-name-prompt.tsx
    - components/outline/outline-editor.tsx
    - components/rocker/rocker-editor.tsx
    - components/rails/rail-band-editor.tsx
    - components/volume/volume-estimator.tsx
    - components/fins/fin-placement-editor.tsx
    - app/design/actions.ts
    - app/test-rack/page.tsx
    - lib/rack-stand-in-server.ts
    - lib/models/rack-stand-in.ts
    - lib/models/rack-stand-in.test.ts
decisions:
  - "Founder answers (2026-10-08): Untitled even if a name was typed on SUMMARY (popup opens with it filled in); TEMPLATE/VOLUME keep a 25-dot tap area on phones, ROCKER/RAILS/FINS get 44; Wide View hides the name with the band."
  - "A name button sits OUTSIDE the role=tablist row; the tab list holds only tabs."
  - "Phone tabs tightened 18 -> 8 dots under the existing max-shell + short-screen pair (never a third rule)."
metrics:
  tasks: 3
  commits: 3
status: complete
actuals:
  tokens: 20000
  tasks: 3
  commits: 3
---

# Phase quick-261008-raw Plan 01: The board's name in the tab band Summary

The board's name (or "Untitled") now sits right-aligned in the coloured tab band on TEMPLATE, ROCKER, RAILS, VOLUME and FINS - on a computer, an upright phone and a phone held sideways - and pressing it renames the board, or on a never-saved board names and saves it exactly like the top bar's Save.

## What a shaper sees

- **The name.** Small, semibold, grey, on the same line as the VIEWER / DATA / ... tabs, at the band's right end. A name that doesn't fit ends in "..."; on a computer the full name is the tooltip. It never wraps, never pushes a tab off screen, and the band is exactly as tall as before (21 / 31 dots on a phone, 29 / 30 on a computer).
- **A saved board:** pressing the name opens the same "Rename board" popup the Board Rack uses. Save renames the board for real; the band, SUMMARY's Board Name box and the Board Rack all show the new name.
- **A board never saved:** reads "Untitled". Signed out, pressing it opens "Sign in to save your boards" (the same dialog the top bar's Save opens) and then the name popup; signed in, the "Name this board" popup names AND saves it. If a name was already typed on SUMMARY the popup starts with it, though the band still says Untitled until the save lands.
- **A locked board:** the Board Rack's small grey padlock after the name; it can still be renamed and stays locked.
- **Phones:** every tab's side padding goes from 18 to 8 dots (both phone rules - narrow width and short height - never a third), so the name has room beside ROCKER's three tabs (before: 10 dots left at 360 wide, not enough even for "Untitled"). RAILS's phone NOSE / CENTER / TAIL row tightens the same so the two stacked rows still match. Computers, a touch screen wide enough for the desktop layout, and RAILS's View Full Sized window keep 18.
- **Touch:** on ROCKER, RAILS and FINS the name's tap area is the tabs' exact 44 dots; on TEMPLATE and VOLUME it reaches 2 dots past the band each way (the menu button sits just above and the drawing's own buttons just below).
- **SUMMARY** is unchanged. **Wide View** (computer, TEMPLATE and ROCKER) hides the name along with the band, as the band always hid.

## Commits (code only)

| Task | Commit | What |
|------|--------|------|
| 1 (tracer) | 8c30717 | Name on TEMPLATE's band, rename end to end through the practice rack; `trailing` slot, fixture, copy file, practice-rack rename |
| 2 | 001a0a3 | The other four screens, Untitled's name-and-save path, one shared first save, padlock on a locked board |
| 3 | 5ecc7af | Phone tabs 18 -> 8 dots, measured browser proof at every width |

## Verification

- `npm test`: 131 files, 4622 passed, 2 skipped, 0 failed. (Run on the final code; no timeouts.)
- `npx tsc --noEmit -p .` and `npm run lint`: clean.
- Tracer gate: t1 passed before expansion.
- Targeted Playwright after the last code commit (board-name-band, phone-chrome, phone-rails, rocker-top-view, touch-sizing, phone-sideways-top-bar, board-lock, board-lock-screens; all three projects): 211 passed, 242 skipped (project-gated), 0 failed, exit 0.
- Full browser suite: see "Full suite" below.

### Measured, from `e2e/board-name-band.spec.ts` (console lines `[board-name] ...`)

Strip heights 21 (TEMPLATE, VOLUME) and 31 (ROCKER, RAILS, FINS) on every phone size and sideways; 29 or 30 on a computer at 1280, 1024 and 820. Tab side padding 8 on every phone measurement, 18 on every computer one. Name gap to the last tab is at least 6 dots everywhere; on ROCKER at 360 the name's box is 65 dots wide and "Untitled" shows whole (p1b). The long (45-character) name ends in an ellipsis on ROCKER at every phone width and on RAILS at 820 on a computer.

## Pictures for the founder

Quick folder `pictures/` holds expected (the old baseline), actual (now) and Playwright's diff for each of the five desktop baselines (`outline|rocker|rails|volume|fins-desktop-{expected,actual,diff}.png`). The baselines under `e2e/desktop-baseline.spec.ts-snapshots/` are untouched and NOT re-recorded.

Changed-pixel boxes (expected vs actual, every pixel any channel differs), 1280 x 800:

| Screen | In the band's right end (x >= 1190, y 93-123) | Anywhere else |
|--------|-----------------------------------------------|---------------|
| TEMPLATE | 285 px, x 1210-1254, y 102-112 | 90 px, sidebar text, 1-level anti-aliasing noise (x 21-358, y 295-783) |
| ROCKER | 285 px, x 1210-1254, y 103-113 | 28 px, same kind of noise in the sidebar |
| RAILS | 285 px, x 1210-1254, y 103-113 | 101 px, same kind of noise in the sidebar |
| VOLUME | 285 px, x 1210-1254, y 102-112 | none |
| FINS | 285 px, x 1210-1254, y 103-113 | none |

The 285 pixels are the word "Untitled", identical on all five. The sidebar pixels are not from this change: with the name temporarily switched off in the tab strip (reverted, never committed) all five baselines PASSED, so that scatter is the pre-existing sub-tolerance anti-aliasing the 100-pixel tolerance already allows for; only the name pushes a picture past it. All five fail as expected until re-recorded.

Re-record (after the founder approves the pictures): stop any dev server from this checkout, run `PW_PORT=3191 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop --update-snapshots`, and add a dated RE-RECORDED entry to that spec's header (what changed: "Untitled" at each band's right end; boxes above; old and new SHA-256), committed on its own.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Scratch capture script could not resolve `react` from the scratchpad**
- **Found during:** Task 1, step 1 (fixture capture)
- **Fix:** ran the same script with `NODE_PATH=<repo>/node_modules`; the script stays in the scratchpad, the fixture is committed unchanged.

**2. [Rule 1 - Bug] Task 1 commit carries a clumsy sentence in the e2e spec's header comment**
- **Found during:** after commit 8c30717 (a BSD `sed -i` in my own chain failed and the intended wording fix never ran).
- **Fix:** corrected in the Task 2 commit (001a0a3); no behaviour involved.

**3. Phone tests get the long name by renaming board 1 from the band, not by opening stand-in board 6**
- **Why:** the phones' swipe rack would need turning to board 6; renaming board 1 to the same 45-character `STAND_IN_LONG_NAME` through the band's own tap-to-rename gives the same measurement and also proves a tap opens the popup and saves. Plan intent kept.

**4. TDD note (Task 2).** The two new source-contract tests were written after the implementation, not seen failing first; they were added in the same commit and both pass against the finished code. (Task 1's fixture was captured before the edit, as planned.)

**Not done / plan said but already moot:** the plan's ship note says the board lock isn't live yet; the orchestrator confirmed it is live and migrated, so no migration step is pending. No database, schema, migration or `.env*` file was touched; nothing was pushed.

## Existing specs touched

None needed fixing: no existing assertion pinned the old 18-dot tab padding or met the name. (`e2e/phone-chrome.spec.ts`, `phone-rails.spec.ts`, `rocker-top-view.spec.ts`, `touch-sizing.spec.ts`, `phone-sideways-top-bar.spec.ts`, `board-lock.spec.ts`, `board-lock-screens.spec.ts` all pass unchanged.)

## Known Stubs

None.

## Threat Flags

None. `renameModel`'s new signed-out branch reaches only `saveStandInName`, which is off unless NODE_ENV is not production and SHAPER_RACK_STAND_IN is "1" (T-raw-02; the literal `process.env.NODE_ENV` read is pinned by rack-stand-in.test.ts, which also still pins the three allowed importers). `lib/db/ownership.test.ts` still passes: `await auth()` first, exactly five actions.

## Full suite

`PW_PORT=3191 npx playwright test --reporter=list` on the final code (log: the session scratchpad's full-suite.log): **1003 passed, 6 failed, 701 skipped (project-gated), 31.7 min, EXIT=1.**

The 6 failures:

- 5 of them are the expected desktop-baseline pictures (TEMPLATE, ROCKER, RAILS, VOLUME, FINS), failing only because of the word "Untitled" at each band's right end (see Pictures for the founder).
- 1 other: `touch-drag.spec.ts:777` (android, a thumb drags ROCKER's placement slider) failed once in the full run with "requests during the drag: /__nextjs_font/geist-latin.woff2" - the dev server fetched its font file in the middle of the drag. It passed 3 of 3 when re-run alone straight after, so it reads as a flaky dev-server font fetch rather than a result of this change; it is nonetheless the one failure that is not a baseline picture, and is reported as such.
