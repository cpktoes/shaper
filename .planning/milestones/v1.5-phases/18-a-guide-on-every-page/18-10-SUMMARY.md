---
phase: 18-a-guide-on-every-page
plan: 10
subsystem: guide
status: complete
tags: [guide, go-live, gate, founder-look]
requires:
  - "18-09: the fifty pictures and the project-notes paragraph"
provides:
  - "The GUIDE on every page, live on shaperassistant.com as main 79110e41 (2026-11-10)"
affects: [the founder's look, Phase 17's go-live (BOTTOM adopts the shared card after it)]
tech-stack:
  added: []
  patterns:
    - "The gate run on the branch itself when main has not moved and the branch descends from it: the same tree as the merged result, then a fast-forward push of the branch to main"
    - "The deploy marker is the tab button's own text (GUIDE</button> present, MODEL INFO absent on /design/fins); the tabs carry no aria-label"
key-files:
  created:
    - .planning/phases/18-a-guide-on-every-page/18-10-SUMMARY.md
  modified:
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/todos/completed/2026-11-08-a-guide-tab-on-every-page.md (moved from pending)
decisions:
  - "The gate ran on the page-guides checkout, not a temporary main-style checkout: origin/main stood at aee01785 from the first fetch to the push and page-guides descends from it, so the tree tested is the tree that went live"
  - "The browser suite ran on the webpack dev server (the bundler the suite was written against); two older checks fail under Turbopack's dev server only and are a follow-up, not this phase's"
  - "Five checks that timed out loading a page in the 2.5-hour run each passed when run alone and are named below as load flakes; the founder was told this rule before the push and said 'Push it once the suite is green'"
metrics:
  duration: "about 3 h 30 min, 2 h 30 min of it the browser suite"
  completed: 2026-11-10
  tasks: 3
  commits: 2
  files: 4
---

# Phase 18 Plan 10: The go-live gate — Summary

**The GUIDE on every page is live. `main` is `79110e41`, pushed 2026-11-10 at 09:56 Pacific, and the live site showed
the GUIDE tab on all five pages at 09:58. Every shaper now sees GUIDE as the last tab on TEMPLATE, ROCKER, RAILS,
VOLUME and FINS; FINS' MODEL INFO tab is gone and its words sit on the GUIDE's cards.**

## What was run, and how each ended

| Step | Command | Result |
|------|---------|--------|
| Fetch | `git fetch origin` (before the gate, and again before the push) | `origin/main` at `aee01785` both times; `page-guides` 0 behind |
| Unit tests | `npm test` | `TEST_EXIT=0` — 198 files, 9,932 passed, 2 skipped |
| Lint | `npm run lint` | `LINT_EXIT=0` — 0 errors, 1 old warning (`lib/db/import-designs-action.test.ts:42`) |
| Production build | `npm run build` with the suite's stand-in settings | `BUILD_EXIT=0` |
| Served pages | `next start -p 3121`, then each design page fetched | all five carry the GUIDE tab; none carries MODEL INFO; FINS' title is `Fin Setup & Placement` |
| Browser suite | `IS_WEBPACK_TEST=1 PW_PORT=3120 playwright test` (iPhone, Android, computer) | `E2E_EXIT=1` — 1,685 passed, 1,241 skipped, **5 failed**, 2.5 h |
| The five alone | each failed check re-run by itself | all passed (`RERUN_IPHONE_EXIT=0`, `RERUN_ANDROID_EXIT=0`, `RERUN_DESKTOP_EXIT=0`) |
| Push | `git push origin page-guides:main` (a fast-forward) | `aee01785..79110e41` |
| Live site | `/design/fins` fetched every 30 s | third try, 09:58:11: GUIDE tab present, MODEL INFO absent; then all five pages checked the same way |

The first build attempt failed on my own slip (the stand-in settings file was written with line numbers, so nothing
loaded) and was repeated with a clean file. The plan's marker `aria-label="GUIDE"` is not in the page: the tabs are
plain buttons, so the marker used is the button's own text.

## The five load flakes

Each timed out waiting for a page to load late in the long run, and each passed alone. None is a GUIDE check.

- iPhone — `e2e/app-settings.spec.ts:68`, the menu has one App Default Settings row
- Android — `e2e/new-board.spec.ts:185`, the Longboard's BLANK rows in Metric
- Android — `e2e/phone-sideways-top-bar.spec.ts:231`, every screen has the thin bar on a Pixel 7 held sideways
- Computer — `e2e/legal-pages.spec.ts:39`, the Privacy page reads the founder's whole document
- Computer — `e2e/wings.spec.ts:1242`, every wing label fits on the founder's Mid-length

## The computer reference pictures against main

Exactly five changed (TEMPLATE, ROCKER, RAILS, VOLUME, FINS); 3D did not. Measured dot for dot:

- **ROCKER, RAILS** — one 44 by 11 dot patch: the word GUIDE on the strip.
- **TEMPLATE, FINS** — the strip (GUIDE added; on FINS, GUIDE where MODEL INFO was) and a few dozen stray dots of
  text smoothing from the re-take. Nothing moved.
- **VOLUME** — the strip gained GUIDE, and **the ESTIMATE card sits one dot lower**. Its strip was a label and is now
  real tabs, so its folder starts at the same height as the other four pages' (122 dots down; it was 121). Shifted by
  that one dot, the old and new pictures match exactly. This is the one place "nothing else moves" is not literally
  true, and it is told to the founder.

## Departures from the plan

- **No temporary main-style checkout.** `origin/main` never moved, so the branch was the merged result; the push was a
  fast-forward of the branch. The founder's checkout and port 3005 were not touched. His local `main` is behind until
  he pulls.
- **The suite ended red and was judged green on the re-runs**, by the push-gate rule (a check that fails in the long
  run and passes alone is a named load flake).
- **The founder's look on his phone is still to come.** He asked for the push ("Push it once the suite is green") and
  the site is live; his look, and his word on the points below, are carried in STATE.md.

## For the founder's look

1. Every sentence and How to shape note is a first draft for his pen (`18-GUIDE-WORDS.md`).
2. D-21 — the board's name steps aside on narrow ROCKER and RAILS strips.
3. D-28 — how fast a GUIDE opens on a slow phone (`18-TIMING.md`); lazy drawing was not built.
4. MD-02 — the maker's inch rocker code on a Metric shaper's Customize Rocker card.
5. LW-05 — whether a drawing's caption is read to a screen reader.
6. VOLUME's ESTIMATE card one dot lower on a computer.

## The founder's rulings, 2026-11-10, after trying the live site on his phone

- **The board's name (D-21):** "Leave it off." The name stays off narrow ROCKER and RAILS strips; every tab word stays whole.
- **How fast a GUIDE opens (D-28):** "Fast enough, leave it." The quicker opening is not built.
- **The inch rocker code in Metric (MD-02):** "Keep the inch code." Nothing on screen changes; CLAUDE.md Rule 2 now names
  the Customize Rocker GUIDE card among the places that code shows.

Points 1, 5 and 6 above stay his, with no deadline: the words are his to edit at any time.

## Follow-ups, not this phase

- Two older checks fail under Turbopack's dev server only (`board-file.spec.ts:85`, `three-d-wire.spec.ts:178`).
- The load flakes above, and the earlier blank-makers one on Android.
- The review's LW-04, LW-06, IN-01, IN-03, IN-04 (`18-REVIEW-FIX.md`) and the verifier's four notes (`18-VERIFICATION.md`).
- BOTTOM's GUIDE adopts the shared card once Phase 17 is on main (the pending todo of 2026-11-09).

## Self-Check: PASSED

`git ls-remote origin refs/heads/main` reads `79110e41`; the live `/design/outline`, `/rocker`, `/rails`, `/volume`
and `/fins` each carry the GUIDE tab and no MODEL INFO.
