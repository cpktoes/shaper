---
phase: 16-3d-board-and-cnc-export
plan: 08
subsystem: navigation (top row, phone menu tiles, Back + Next)
status: complete
tags: [3d, nav, screen-tiles, step-nav, D-01, D-02, D-03, D-18]
requires:
  - "16-06: the /design/3d route and its screen inside DesignScreenShell (which mounts StepNav)"
  - "rack-art.ts: buildRackBoardArt, turnedBoardPoints, stringerPoints (Phase 15 / quick 261103-drw)"
provides:
  - "NAV_LINKS with { href: \"/design/3d\", label: \"3D\" } as the seventh entry"
  - "screenWord keeps a label that does not start with a letter as written (3D stays 3D)"
  - "lib/geometry/three-d-tile-art.ts: THREE_D_TILE_TURN_RAD, threeDTileArt(art), threeDTilePicture(profile, geometry), ThreeDTilePicture"
  - "ScreenTileKind \"threeD\"; screenTileLines().threeD === \"Spin and export\"; TILE_KIND \"/design/3d\": \"threeD\""
  - "The phone sheet grid grid-cols-4 gap-2 shell:grid-cols-7; the desktop cluster gap-3 lg:gap-4 xl:gap-5"
affects: [16-10, 16-14]
tech-stack:
  added: []
  patterns:
    - "The 3D tile picture lives in its own pure module because rack-art.ts imports screen-tiles.ts (no import cycle)"
    - "A pure picture-or-fallback function (threeDTilePicture) so the tile's backstop is unit-tested, not only the throw"
key-files:
  created:
    - lib/geometry/three-d-tile-art.ts
    - lib/geometry/three-d-tile-art.test.ts
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-08-seven-screens.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-08-pictures-source.tar.gz
  modified:
    - components/site-nav.tsx
    - components/design/screen-tiles.tsx
    - lib/geometry/screen-tiles.ts
    - lib/geometry/screen-tiles.test.ts
    - lib/screen-steps.ts
    - lib/screen-steps.test.ts
    - e2e/step-nav.spec.ts
    - e2e/site-nav-width.spec.ts
    - components/design/step-nav.tsx
    - components/design/phone-top-bar.tsx
    - components/design/phone-menu.tsx
    - components/design/board-lock-scope.tsx
    - app/not-found.tsx
    - CLAUDE.md
    - .claude/skills/sketch-findings-shaper/SKILL.md
    - .claude/skills/sketch-findings-shaper/references/phone-chrome.md
decisions:
  - "The 3D tile draws the rack's 50-degree turn laid nose left and DECK UP (y = -x), a true quarter turn of the rack's standing board, so it matches the 3D screen's first view (nose left, deck up, camera 50 degrees above). The plan's y = x would have mirrored it, nose rocker kicking down"
  - "The tile's fallback lives in a pure function, threeDTilePicture, which returns the turned picture or TEMPLATE's lying outline; the component only draws what it returns (no stringer on the fallback)"
  - "screenWord's letter test is 'its capital and small forms differ', so any label starting with a digit or symbol is shown exactly as written"
metrics:
  duration: "about 65 minutes"
  completed: 2026-11-04
estimate:
  tokens: 85000
actuals:
  tokens: 12200
  tasks: 2
  commits: 4
---

# Phase 16 Plan 08: Seven screens Summary

3D is now the seventh design screen everywhere a shaper moves between them. It sits last in the computer's top row,
it has its own tile on the phone's ☰ menu (a picture of your board turned three-quarters, captioned "Spin and export"),
and SUMMARY's Next button takes you there. The code comments, CLAUDE.md and the sketch notes all say seven.

## What changes for the founder

- **On a computer**, the row of screen names along the top now ends `… FINS  SUMMARY  3D`. The gaps between the names
  get a little narrower on narrower windows (12 dots below 1024 wide, 16 up to 1279, 20 from 1280 as before), so all
  seven names, the gear, Save and Sign in still fit on one line at 820 wide. At 1280 and wider the gaps haven't changed.
  The existing names just sit 40 dots further left to make room for 3D.
- **On a phone**, the ☰ menu now has seven tiles. Held upright they're four across and two down (TEMPLATE, ROCKER,
  RAILS, VOLUME on top; FINS, SUMMARY, 3D below). Held sideways they're one row of seven. The 3D tile shows your own
  board turned three-quarters, nose to the left with its stringer down the deck, the way the 3D screen first shows
  it. If the app can't work out that turned view for some board, the tile shows its outline lying down instead,
  like the TEMPLATE tile, so the menu never breaks.
- **Back and Next**: SUMMARY's pair now reads `← Fins` and `3D →`, and 3D has a single `← Summary` across its row. The
  button says "3D", not "3d".
- Nothing announces the new screen (D-18). The name in the row and the tile are all there is.

## The picture

`.planning/phases/16-3d-board-and-cnc-export/pictures/16-08-seven-screens.png`, shot from this worktree's dev server
(signed out, the default board), covers:

1. The top row at 820, 1024 and 1280 wide, on the 3D screen so `3D` is the lit name. The row is 81 dots tall at all
   three widths, with no sideways scroll. The test harness draws no Sign in button (its stand-in Clerk key loads
   nothing), so the picture shows the row without it. `e2e/site-nav-width.spec.ts` checks the row's fit with the
   account control's room, and it passed.
2. The ☰ sheet upright at 360 wide (Chromium, Android-sized) and 390 × 664 (WebKit, iPhone 14), and sideways at
   844 × 390 (WebKit). Playwright's own "iPhone 14 landscape" is an emulated 750 × 340, below the 820 line, so the
   real size was set by hand. Sideways the tiles are one row of seven, each 110.3 dots wide, above 16-14's planned
   floor of 104.
3. The 3D tile three times larger beside TEMPLATE's.
4. SUMMARY's Back + Next and 3D's lone Back at 1280.

**Open item 4 (TEMPLATE at 360 wide), measured:** the word `TEMPLATE` sits **1.6 dots** inside its tile's border on
each side at 360 wide. The UI-SPEC estimated 2.6. At 390 it's 5.4, and sideways 17.8. It doesn't touch the border,
but it's tight. The founder's call: leave it, or ask for slightly tighter letter spacing in the four-across grid.

Upright, the two rows of tiles differ in height. That's not new: on a board in a blank, ROCKER's second line makes the
top row taller. On this hand-set default board, it's the bottom row that's taller, because "Spin and export" wraps
onto two lines. Within each row every tile is the same height. 16-14's `e2e/phone-screen-tiles.spec.ts` will pin the
grid.

## Verification

- `npx tsc --noEmit` clean. `npm run lint`: 0 errors, plus one warning that was already there, in a file this plan
  doesn't touch (`lib/db/import-designs-action.test.ts`, `_calls`).
- `npm test`: every file green. Under machine load (load average 200+) several heavy geometry files timed out in the
  full sweep. All of them passed when re-run alone with `--testTimeout=120000`, and
  `lib/models/rack-stand-in.test.ts` (which sets its own 30 s limit) passed alone in 24 s.
  The new and changed files: `lib/screen-steps.test.ts`, `lib/geometry/screen-tiles.test.ts` and
  `lib/geometry/three-d-tile-art.test.ts`, 69+ tests, green.
- `e2e/site-nav-width.spec.ts` on all three projects: 12 passed, 24 skipped by design (each describe is pinned to one
  project). It logged 24 dots of slack right of the cluster at 820, 844, 863, 1024, 1080, 1133 and 1279. No test
  needed changing; only its header comment now says seven links and records the new gaps.
- `e2e/step-nav.spec.ts` on all three projects, port 3208: every test passed on every project across the runs. The
  failures seen along the way were all the cold dev server under load:
  - `startTheFirstPreset`'s 2 s wait for the page's load event, with the page already on TEMPLATE.
  - `page.goto` timing out at 30 s.
  - The dev server's own "Fast Refresh had to perform a full reload" interrupting a `goto`.

  That last one reproduced identically on an untouched copy of the base commit 070c2996, run on port 3209 and then
  deleted. The final full run: 27 passed, 5 skipped by design, and its one load flake passed on re-run.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The 3D tile laid deck up, not mirrored**
- **Found during:** Task 1
- **Issue:** The plan's interface note maps the rack's points as `x = −station, y = x`. In SVG, where y runs down,
  that is a mirror image of the rack's standing board, not a quarter turn: the deck faces down and the nose's
  rocker kicks downward. It would not match the 3D screen's first view (nose left, deck up, `view-3d.ts`'s
  `REST_TURN`).
- **Fix:** `y = −x`, the rack's standing picture turned a quarter turn. A unit test pins "deck up": the stringer at
  the nose stands higher than at the middle.
- **Files:** `lib/geometry/three-d-tile-art.ts`, `lib/geometry/three-d-tile-art.test.ts`
- **Commit:** 3b259327

**2. [Rule 2 - Missing test of the fallback] `threeDTilePicture`**
- **Found during:** Task 1
- **Issue:** The plan puts the try/fallback inside the React hook, where a node unit test can't reach it, so only the
  throw would have been proven.
- **Fix:** A pure `threeDTilePicture(profile, geometry)` returns `{ kind: "turned", … }` or
  `{ kind: "fallback", …outlineTileArt(geometry, "lying") }`. The hook memoises it, and tests prove both branches.
- **Commit:** 3b259327

**3. [Scope, docs] CLAUDE.md's Layout list of screen folders**
- That list said `app/design/{outline,rails,fins,volume,summary}/ — the five design screens`, stale since ROCKER. It
  now names all seven folders, in order, carrying the sentence that 3D is the seventh screen, last after SUMMARY. The
  `components/` line beside it gained `rocker` and `3d` too.
- **Commit:** 184d0791

Nothing was changed outside the plan's `files_modified`. `components/3d/`, `e2e/helpers/screens.ts`, the six-count
specs and the desktop pictures were not touched.

## Red until 16-14 (expected, by design)

`NAV_LINKS` now holds seven, so these fail until 16-14 (wave 5) lands. None was run here.

- `e2e/helpers/screens.ts`: the shared `SCREENS` (six) and `expectSixTilesInMenu`. Every spec using it follows.
- `e2e/phone-screen-tiles.spec.ts`: six tiles, 3 × 2 upright, one row of six over 120 wide sideways (floor 120 → 104),
  six desktop links.
- `e2e/phone-layout.spec.ts`: six tiles (the TEMPLATE wholeness loop should pass, at 1.6 dots measured).
- `e2e/phone-screens.spec.ts`, `e2e/phone-home.spec.ts` (six desktop links), `e2e/legal-pages.spec.ts:76`,
  `e2e/error-pages.spec.ts:59` and `:86`.
- `e2e/phone-trip.spec.ts`: walks six and ends on SUMMARY.
- `e2e/board-lock-screens.spec.ts:558`: all six greyed in turn.
- `e2e/touch-sizing.spec.ts:199` and `e2e/app-settings.spec.ts:56`: six tiles.
- `e2e/desktop-baseline.spec.ts`: all five desktop pictures. The nav row gained `3D`, and at 1280 the six existing
  links sit 40 dots further left.
- Also reading the shared helper or counting screens, worth a look at 16-14: `e2e/phone-chrome.spec.ts`,
  `e2e/phone-sideways-top-bar.spec.ts`, `e2e/contact.spec.ts`, `e2e/site-footer.spec.ts`, `e2e/undo-redo.spec.ts`,
  `e2e/rocker-custom.spec.ts`, `e2e/helpers/rocker-sidebar.ts`, `e2e/prod/phone-controls-clear-undo.spec.ts`.

## Known Stubs

None.

## Threat Flags

None. The 3D tile's denial-of-service backstop (T-16-19) is in place and unit-tested, and `screenStepsAround` is
unchanged (T-16-18).

## Self-Check: PASSED

- FOUND: lib/geometry/three-d-tile-art.ts, lib/geometry/three-d-tile-art.test.ts
- FOUND: .planning/phases/16-3d-board-and-cnc-export/pictures/16-08-seven-screens.png and 16-08-pictures-source.tar.gz
- FOUND commits: 3b259327, 184d0791, 7edc8bd3
- Acceptance greps: the 3D nav entry 1, the gaps 1, the grid 1, the TILE_KIND entry 1, `rack-art` in screen-tiles.ts 0;
  the six-wording grep 0 in all eight files; `seven` 5 in CLAUDE.md and 3 in phone-chrome.md

## Founder's look

Presented by the orchestrator at the Wave 4 checkpoint, 2026-11-04, with the seven-screens picture. The founder:
"Approved, TEMPLATE tile fine as is" — the 360-wide TEMPLATE tile keeps its lettering (UI-SPEC open item 4 closed).
Merged into `board-3d` as 73b544d6. The two deviations (the tile drawn with a true quarter turn; the testable fallback)
were accepted by the orchestrator.
