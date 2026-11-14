---
phase: 16-3d-board-and-cnc-export
plan: 14
subsystem: browser suite (screen walk, phone menu checks, desktop reference pictures)
status: complete
tags: [3d, e2e, screen-tiles, desktop-baseline, D-01, D-03, D-18]
requires:
  - "16-08: NAV_LINKS ends { href: \"/design/3d\", label: \"3D\" }; the sheet grid grid-cols-4 gap-2 shell:grid-cols-7; the 3D tile's line \"Spin and export\""
  - "16-06/16-07: /design/3d with data-board-3d and data-board-state=\"ready\""
provides:
  - "e2e/helpers/screens.ts SCREENS with 3D last; expectSevenTilesInMenu (replaces expectSixTilesInMenu, every caller renamed)"
  - "phone-screen-tiles' expectFourOverThree check (two tops, four then three; four lefts; one height per row)"
  - "Five desktop reference pictures with 3D in the top row"
affects: [16-09, 16-10, 16-11, 16-12, 16-13]
tech-stack:
  added: []
  patterns:
    - "A walk that lands on 3D gets test.slow() (first draw about 5 s on the iphone project)"
    - "Desktop pictures re-recorded only after an exact pixel comparison sorts every changed pixel into top row / moved / one-level flicker"
key-files:
  created:
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-14-desktop-pictures-diff.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-14-pictures-source.tar.gz
  modified:
    - e2e/helpers/screens.ts
    - e2e/phone-screen-tiles.spec.ts
    - e2e/phone-layout.spec.ts
    - e2e/phone-sideways-top-bar.spec.ts
    - e2e/phone-trip.spec.ts
    - e2e/touch-sizing.spec.ts
    - e2e/app-settings.spec.ts
    - e2e/phone-home.spec.ts
    - e2e/error-pages.spec.ts
    - e2e/legal-pages.spec.ts
    - e2e/site-footer.spec.ts
    - e2e/phone-screens.spec.ts
    - e2e/contact.spec.ts
    - e2e/prod/phone-controls-clear-undo.spec.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/rails-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/fins-desktop-desktop-darwin.png
decisions:
  - "Upright, the two rows of tiles need not share a height: the top row grows when ROCKER's tile carries the blank's rocker on a second line, so 'one height' is checked per row"
  - "FINS' 109 one-colour-level corner pixels were kept in the new picture: they render the same on every pass here and are not movement"
metrics:
  duration: "about 65 minutes"
  completed: 2026-11-04
actuals:
  tokens: 12200
  tasks: 2
  commits: 4
---

# Phase 16 Plan 14: The browser suite counts seven screens Summary

The browser tests' shared walk and every check that counted six screens now count seven, 3D last; the phone menu
is proven four over three upright and one row of seven sideways (every tile over 104 dots wide), and the five
desktop reference pictures were re-recorded after a pixel-by-pixel comparison showed only the top row changed.

## What changes for the founder

Nothing on the site itself: this plan touches only the automatic checks and their reference pictures.

- **The phone checks know about 3D.** Every check that opens the phone's ☰ menu now expects seven screen tiles,
  with 3D last. On an upright phone they check four across on top (TEMPLATE, ROCKER, RAILS, VOLUME) and three
  underneath (FINS, SUMMARY, 3D). On a phone held sideways they check one row of seven, each tile still over 104
  dots wide. (I measured 110 on an iPhone and 113 on a Pixel 7.) The 3D tile has to show its board picture and the
  line "Spin and export".
- **The whole phone trip ends on 3D.** The machine walk from the home screen through every screen now reads the
  order form on the way past SUMMARY. It then goes on to 3D, waits for the board to draw, and heads home.
- **A phone held sideways walks all seven screens** from its menu, and the site footer is checked on 3D as well.
- **The five desktop pictures.** On a computer the row of screen names now ends with 3D, and the six names before
  it sit a little further left. The pictures of TEMPLATE, ROCKER, RAILS, VOLUME and FINS were compared with the
  old ones before they were replaced. Every change is inside that row, and nothing on any drawing or sidebar moved.
  `pictures/16-14-desktop-pictures-diff.png` shows all five, with the changed pixels in red.

## Specs changed

All of these changes only count to seven or say "seven" in their wording, apart from the two noted:

| Spec | Change |
|------|--------|
| `e2e/helpers/screens.ts` | `SCREENS` gains `{ href: "/design/3d", label: "3D" }`; `expectSixTilesInMenu` → `expectSevenTilesInMenu` with `toHaveCount(7)` |
| `e2e/phone-screen-tiles.spec.ts` | seven tiles; the new `expectFourOverThree` (upright, both tests); the 3D tile's picture and line; sideways floor 120 → 104 (title "over 104"); `heights` of length 7; seven desktop links (titles) |
| `e2e/phone-layout.spec.ts` | seven tiles (twice); the TEMPLATE wholeness loop unchanged and green at 360/375/393 |
| `e2e/phone-sideways-top-bar.spec.ts` | `walkAllSevenFromTheMenu` (with `test.slow()`), `assertAllSevenInFirstView` (one row of seven); the nine-route walks' budget 90 → 120 s; titles say seven |
| `e2e/phone-trip.spec.ts` | walks seven by tile and ends on 3D with the board `ready`, then home. The summary checks moved into `expectSummaryReadsClean` and now run at the SUMMARY stop. `test.slow()` |
| `e2e/touch-sizing.spec.ts`, `e2e/app-settings.spec.ts` | seven tiles |
| `e2e/phone-home.spec.ts`, `e2e/error-pages.spec.ts` | the helper's new name; titles and prose say seven |
| `e2e/legal-pages.spec.ts`, `e2e/contact.spec.ts`, `e2e/phone-screens.spec.ts` | the helper's new name (phone-screens' comment says seven). legal-pages' six TABLE rows stay six |
| `e2e/site-footer.spec.ts` | `/design/3d` joins `DESIGN_SCREENS` |
| `e2e/prod/phone-controls-clear-undo.spec.ts` | its prose says seven. It already walks `SCREENS`, so 3D comes with it. `test.slow()` added. Checked only with `--list` (6 tests) |
| `e2e/desktop-baseline.spec.ts` | the dated `RE-RECORDED 2026-11-04 (Phase 16, plan 16-14)` block; the five pictures |

The three false positives were left alone: fit-defaults' six number rows, rocker-panel's six sliders and
legal-pages' six table rows. No spec checks for a notice of the new screen (D-18).

## The desktop pictures (1280 × 800)

Every changed pixel was sorted into three groups: inside the top row (above y 60), moved below it (a colour
channel more than 2 levels apart), or one-level flicker below it.

| Screen | Top row (box x 486-982, y 32-50) | Moved below | One-level flicker | SHA-256 old → new |
|--------|------|------|------|------|
| TEMPLATE | 3239 | 0 | 0 | 8605d28b → c3c675b2 |
| ROCKER | 3247 | 0 | 0 | b989d40d → 407cbee1 |
| RAILS | 3248 | 0 | 0 | e3ca0666 → b853ef2a |
| VOLUME | 3246 | 0 | 0 | 14f11e4c → d3377877 |
| FINS | 3222 | 0 | 109 | 13cca29f → f915b9db |

- The FINS flicker is at the rounded corners of the sidebar cards (x 40/41 and 357/358), one colour level apart.
  It came out the same on all three renders, so it is how this server draws the corners now. Nothing moved there.
- The first full re-record caught ROCKER with 3 three-level flickers in its sidebar text. ROCKER was re-recorded
  once more and came out clean. Its committed picture is that second render.
- VOLUME still reads 30.29 L.
- The pictures were rendered by the webpack dev server (`IS_WEBPACK_TEST=1`, port 3214) in this worktree. The
  orchestrator confirms them under the main checkout's Turbopack run after the merge.

## Test runs (port 3214, webpack dev server, all three projects)

| Specs | Result |
|-------|--------|
| phone-screen-tiles | 38 passed, 28 skipped (the skips are by design: phone-only and desktop-only cases), 0 failed |
| phone-layout + phone-sideways-top-bar + phone-trip | 47 passed, 55 skipped, 0 failed |
| touch-sizing + app-settings + phone-home + error-pages | 118 passed, 47 skipped, 0 failed |
| legal-pages + site-footer + contact | 114 passed, 0 failed |
| step-nav + phone-screens | 43 passed, 17 skipped, 0 failed |
| desktop-baseline (desktop) | 5 passed with the new pictures |
| board-lock-screens `p-screens` (not changed, run for a look) | iphone failed on the first, cold run and passed when the file ran again. This is the known cold-server race |

These are the reporter's totals across iphone, android and desktop. I did not split them by project; no project
had a failure. `npx tsc --noEmit` passes. `npm run lint` gives 0 errors and 1 warning, which was already there
(`lib/db/import-designs-action.test.ts`). `npm test`: 7318 tests passed. One test,
`lib/models/rack-stand-in.test.ts`, timed out under load and passed when its file ran on its own.

## 3D-screen failures for the orchestrator

None. Every walk that lands on `/design/3d` reached `data-board-state="ready"` on all three projects.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Upright tiles: "one height" holds per row, not across both rows**
- **Found during:** Task 1 (tracer)
- **Issue:** I first checked that all seven tiles were the same height. That failed by 4 dots on both phones,
  because the top row is taller when ROCKER's tile carries the blank's rocker on a second line (the Shortboard is
  on a 6'3"RP).
- **Fix:** `expectFourOverThree` checks one height within each row.
- **Commit:** c455ed75

**2. [Rule 3 - Blocking] The helper's rename reached specs not in `files_modified`**
- **Found during:** Task 1
- **Issue:** `e2e/phone-screens.spec.ts` and `e2e/contact.spec.ts` call the renamed helper, so they would not
  type-check without the new name.
- **Fix:** renamed the call in both (and a comment in phone-screens). Ruling 4 also asked for
  `e2e/prod/phone-controls-clear-undo.spec.ts` to be updated, so its wording says seven and it has
  `test.slow()`.
- **Commits:** c455ed75, f7e88a4d

**3. [Rule 1 - Bug] phone-trip's summary checks would have run on 3D**
- **Found during:** Task 1
- **Issue:** The trip checked the order form after the walk, assuming the walk ended on SUMMARY. It now ends on 3D.
- **Fix:** the summary checks moved into `expectSummaryReadsClean` and run at the SUMMARY stop. The walk then waits
  for the 3D board to draw before going home.
- **Commit:** f7e88a4d

Not changed, though they mention six screens: `e2e/undo-redo.spec.ts:258-266` has its own six routes and makes no
count assertion. `e2e/board-lock-screens.spec.ts:558` names five screens by hand plus SUMMARY. Neither fails on
seven, and both are outside this plan's files. They are worth a look for whichever plan brings undo/redo and the
locked-board greying to 3D.

## Known Stubs

None.

## Founder's look

Presented by the orchestrator at the Wave 5 checkpoint, 2026-11-04, with the five-picture diff. The founder: "Approved."
Merged into `board-3d` as 0f04da65. The three deviations (row-by-row tile heights, the helper's rename in two more
specs, the order form checked at the SUMMARY stop) were accepted by the orchestrator. The Turbopack confirmation of the
five pictures could not run from the main checkout while the founder's review server held its dev lock; the webpack
pictures stand, as in every earlier phase, and the branch gate's production-build specs and a full suite on a fresh
copy were run after the merge.
