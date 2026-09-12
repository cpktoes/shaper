---
phase: 10-the-whole-app-on-a-phone
plan: 06
subsystem: ui
tags: [tailwind, css, playwright, responsive, setup-screen, gap-closure]

requires:
  - phase: 10-05
    provides: "the width-and-height layout switch that keeps a phone held sideways in the phone shell, which is what lets this cap reach a sideways phone at all"
provides:
  - "components/setup/card-thumbnail.tsx's board-picture height cap, now three-quarters of the setup screen's own scroller instead of a fixed 387px"
  - "e2e/phone-home.spec.ts's card-height assertion, re-pointed at the measured ratio, plus a rewritten 819/820px boundary test expressed as an inequality"
  - "e2e/phone-setup-landscape.spec.ts, now covering three sideways viewports (emulated 750x340, hand-set 844x390 standing in for a real iPhone, and Pixel 7 landscape's own 863x360) instead of one"
affects: [setup-screen, card-thumbnail, preset-card, board-rack-card]

actuals:
  tokens: 46000
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A card-height cap expressed as `max-h-[calc(NNdvh - Mpx)]` — a viewport-height share clamping an aspect-ratio-driven box, rather than a fixed pixel height that overrides the ratio outright. Lets the ratio still govern on a tall-enough screen and the share govern everywhere else, from one declaration."

key-files:
  created: []
  modified:
    - components/setup/card-thumbnail.tsx
    - e2e/phone-home.spec.ts
    - e2e/phone-setup-landscape.spec.ts

key-decisions:
  - "The card cap is 75dvh minus two measured constants (56px of shell chrome above the scroller, 162.6px of the preset card's own text/padding chrome below the thumbnail) rather than the plan's own placeholder figures — both were measured fresh on this checkout on 2026-09-11, not taken from the plan or calculated on paper."
  - "The preset card variant, not the in-progress or saved variant, supplies the card-chrome constant. Preset (162.59375px) measured larger than in-progress (158.39px) — its text-sm descriptor line is taller than the other two variants' text-xs third line — and the saved variant (structurally identical to in-progress: name, dims line, a text-xs third line, CTA) cannot be reached at all in this suite, which runs entirely signed out against a fake database with no saved boards to render. Using the larger of the two reachable variants is the safe upper bound; see 'Human Verification Deferred' below for what a real saved board should confirm."
  - "Task 1's RED/GREEN split landed as two separate commits (test, then feat) rather than one combined commit, matching the standing TDD convention even though this plan's own frontmatter is type: execute, not type: tdd — the task itself carries tdd=\"true\"."

patterns-established:
  - "A phone-shell height cap on a card element is written as a maximum (`max-h-[...]`), never a fixed height, specifically so the element's own `aspect-ratio` declaration keeps acting as the upper bound on a tall screen and the share becomes the clamp on a short one — the CSS mechanism this plan's own doc comment now credits by name."

requirements-completed: [PHON-08]

coverage:
  - id: D1
    description: "A board card's picture is capped at about three-quarters of the setup screen's scroller, on any phone, upright or sideways — the shaper's own 2026-09-11 decision, measured (not calculated) at five named viewports."
    requirement: PHON-08
    verification:
      - kind: e2e
        ref: "e2e/phone-home.spec.ts#every preset card is about three-quarters of the scroller's visible height, and its board drawing still reads as a distinct outline — asserts the ratio is between 0.70 and 0.82 on iphone and android"
        status: pass
      - kind: e2e
        ref: "e2e/phone-setup-landscape.spec.ts — three describes, one per sideways viewport (750x340, 844x390, 863x360), each asserting the same ratio band, the two-up grid, next-card visibility and distinct outline widths"
        status: pass
      - kind: other
        ref: "Manual measurement (scratch Playwright run, not committed): the ratio computes to 0.7499-0.7500 at all five named viewports (iPhone upright, Pixel 7 upright, and all three sideways widths) — see the ratio table below"
        status: pass
    human_judgment: false
  - id: D2
    description: "Desktop is untouched: at 1280x800 the cap never applies and the thumbnail still follows the 340/620 ratio, proved rather than assumed."
    verification:
      - kind: e2e
        ref: "e2e/phone-home.spec.ts#the thumbnail box's height still follows its own width and the 340/620 ratio — the phone cap never reaches here (desktop project)"
        status: pass
      - kind: e2e
        ref: "e2e/phone-home.spec.ts#at 819px the phone cap applies..., and at 820px it is back to the width/ratio height exactly (desktop project, both viewports)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every card text line survives at today's size and order; no geometry or OutlineViewer option changed; the four presets remain tellable apart at the new size."
    verification:
      - kind: other
        ref: "git diff --stat against preset-card.tsx, board-rack-card.tsx, setup-screen.tsx, outline-viewer.tsx and lib/ reports no changes"
        status: pass
      - kind: e2e
        ref: "e2e/phone-home.spec.ts and e2e/phone-setup-landscape.spec.ts both assert the first two presets draw outlines at visibly different widths at every measured viewport"
        status: pass
    human_judgment: false

duration: ~50min
completed: 2026-09-11
status: complete
---

# Phase 10 Plan 06: A Board Card Fits the Screen It's Actually On — Summary

**The setup screen's card thumbnail stopped capping at a fixed 387 dots and now caps at three-quarters of the screen a shaper can actually see, measured (not calculated) at five viewports — upright and sideways, iPhone and Android — landing at 0.7499-0.7500 everywhere it was checked.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 2 of 2
- **Files modified:** 3 (0 created, 3 modified)

## Accomplishments

- **The cap is now a share of the screen, not a number of dots.** `components/setup/card-thumbnail.tsx`'s inner box changed from `max-shell:h-[387px]` (a definite height, fixed regardless of screen size) to `max-shell:max-h-[calc(75dvh-204.6px)]` (a maximum, which lets the box's own `aspect-[340/620]` ratio still govern on a tall-enough screen and the share become the clamp everywhere else).
- **Both constants in that formula were measured fresh, not taken from the plan.** Shell chrome (the gap between viewport height and the setup screen's own scroller) measured identically at 56px at two different heights (640px and 900px), confirming it really is a constant. Card chrome (the gap between a rendered card and its thumbnail box) measured 162.59375px on the preset variant — the largest of the two variants this signed-out suite can reach, and larger than in-progress's 158.39px because the preset's `text-sm` descriptor line is taller than the other variants' `text-xs` third line.
- **The resulting ratio is almost exactly 0.75 everywhere it was checked** — not just inside the 0.70-0.82 band the tests assert, but landing on the shaper's own "three-quarters" figure to four decimal places, at both phone projects, upright, and at all three sideways widths (see the table below).
- **The old fixed-387px assertion is gone from the suite**, replaced by a ratio check (`e2e/phone-home.spec.ts`) that measures the card against the scroller's own `clientHeight` rather than a number nobody could defend once the screen changed size.
- **The sideways case — the one a real phone found and no test covered — now has three, not one.** `e2e/phone-setup-landscape.spec.ts` covers Playwright's emulated 750x340 iPhone-landscape descriptor, a hand-set 844x390 viewport standing in for the real iPhone the shaper measured, and Playwright's own `Pixel 7 landscape` descriptor (863x360), which happens to already match the shaper's own Pixel 7 measurement. Each describe's own name says which kind of number its viewport is, so nobody mistakes an emulator's figure for a phone's again.
- **The 819/820px boundary test no longer pins to a pixel figure that is now viewport-relative.** It asserts a strict inequality (`thumbnail height < width * 620/340`) at 819px, where the phone cap applies, and equality within a dot at 820px, where the ratio alone governs — the same partition the old test proved, expressed the way this plan's own cap now works.

## Ratio Table (measured, not calculated)

| Viewport | Kind | Scroller height | Card height | Ratio |
|---|---|---|---|---|
| 390 x 664 (iPhone 14, upright) | Playwright device descriptor | 608px | 456.0px | 0.7500 |
| 412 x 839 (Pixel 7, upright) | Playwright device descriptor | 783px | 587.2px | 0.7500 |
| 844 x 390 (real iPhone, sideways) | Hand-set, standing in for 10-SWEEP.md's measured hardware | 334px | 250.5px | 0.7500 |
| 863 x 360 (Pixel 7, sideways) | Playwright's own `Pixel 7 landscape` descriptor, matches 10-SWEEP.md's measured hardware | 304px | 228.0px | 0.7499 |
| 750 x 340 (emulated iPhone, sideways) | Playwright's `iPhone 14 landscape` descriptor — an emulator's number, not hardware's | 284px | 213.0px | 0.7499 |

Measured with a scratch Playwright script (not committed — deleted after use, per the plan's "measure, do not calculate" instruction) that reads `[data-setup-content]`'s scrolling ancestor's `clientHeight` and the first preset card's `boundingBox().height` at each viewport, on the `iphone` (WebKit) project.

## Before/After Card Height at 844 x 390 (the sideways case a real phone found)

| | Before (D-08's fixed cap) | After (this plan) |
|---|---|---|
| Card height at 844x390 | ~757px (10-SWEEP.md measurement — grew because the old width-only shell switch turned the cap off at this width, fixed separately by 10-05) | 250.5px |
| Visible scroller height at 844x390 | 237px (10-SWEEP.md) | 334px (10-05's width-and-height switch keeps this a phone; this plan's own shell-chrome measurement) |
| Card-to-scroller ratio | 3.19 (more than three whole cards' worth of height, off-screen) | 0.75 |

The "before" figures are 10-SWEEP.md's own real-device measurements, taken before 10-05 landed; they are not re-measured here since the width-only switch they exercise no longer exists on this checkout. They are quoted for contrast, not as a regression check.

## Task Commits

1. **Task 1: The card becomes a share of the screen instead of a number of dots**
   - `07d4339` (test) — RED: the ratio assertion, failing against today's fixed 387px cap on the `iphone` project (measured 0.90, outside the 0.70-0.82 band)
   - `98a4246` (feat) — GREEN: the `max-h-[calc(75dvh-204.6px)]` cap, plus the doc comment rewrite carrying both measured constants and their measurement date
2. **Task 2: Prove the card fits sideways too** — `ff35a40` (test) — three sideways viewports in `e2e/phone-setup-landscape.spec.ts`, plus the rewritten 819/820px boundary test in `e2e/phone-home.spec.ts`

## Files Modified

- `components/setup/card-thumbnail.tsx` — the cap itself, and its doc comment
- `e2e/phone-home.spec.ts` — the upright ratio assertion, and the rewritten 819/820px boundary test
- `e2e/phone-setup-landscape.spec.ts` — three sideways viewports instead of one, each labelled as emulated or hand-set

## Verification Run (this plan's own required checks)

- `npx tsc --noEmit` — exits 0.
- `npx vitest run` — 59 test files, 2459 passed, 2 skipped, 0 failed.
- `PW_PORT=3121 IS_WEBPACK_TEST=1 npx playwright test` (full suite, all three projects) — **210 passed, 189 skipped (per-project scoping), 0 failed.**
- `git diff --stat` against `preset-card.tsx`, `board-rack-card.tsx`, `setup-screen.tsx`, `outline-viewer.tsx` and `lib/` — no changes, confirming this really is the one-file change D-02 promises.

## Decisions Made

- Used the preset card's measured chrome (162.59375px), not the plan's placeholder number, as the constant baked into the CSS — it is the larger of the two variants reachable in this signed-out suite, and structurally the saved variant should not exceed it (see below).
- Split Task 1's RED and GREEN work into two separate commits rather than the one combined commit the first attempt produced, to match this codebase's standing `test`-then-`feat` TDD commit convention.
- Rewrote the acceptance-criteria assertion for "the first two presets draw distinct widths" to compare the shortboard and the fish specifically (their actual order in `BOARD_PRESETS`), rather than a set-based "some pair differs somewhere" check, since the plan's wording named "the first two."

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Task 1's RED/GREEN work initially landed as one combined commit**
- **Found during:** Reviewing Task 1's own commit right after making it
- **Issue:** The executor protocol's TDD flow calls for a `test(...)` commit (RED) followed by a separate `feat(...)` commit (GREEN); the first pass combined both changes into a single `feat(...)` commit.
- **Fix:** `git reset --soft HEAD^` before any further work depended on that commit, then re-staged and re-committed the test file and the implementation file separately, in the correct order, with messages that match the RED/GREEN convention.
- **Files modified:** None beyond the two already in scope (`e2e/phone-home.spec.ts`, `components/setup/card-thumbnail.tsx`) — this was a commit-history correction, not a code change.
- **Commits:** `07d4339` (test, RED), `98a4246` (feat, GREEN), replacing the single combined commit.

No other deviations. Both measured constants (shell chrome, card chrome) matched the plan's own flagged-assumption checks: shell chrome was confirmed constant across two viewport heights, and a single share expression held the 0.70-0.82 band at all four named viewports (in fact landing almost exactly on 0.75 at all five viewports measured, including the two upright ones).

## Human Verification Deferred to the Real-Device Sweep

- **Whether a fish still reads as a fish at this size, in the hand.** No test can answer this — it is the one question 10-SWEEP.md itself named as unanswerable by a machine. Every viewport this plan measured keeps the four presets' outline widths visibly distinct (the narrowest gap, at 863x360 and 750x340, is still large enough to round to different whole pixels), but "tellable apart on a screen" and "tellable apart in a shaper's hand" are not the same test. Plan 10-08 walks this by hand.
- **The saved-board card variant's own chrome.** This suite runs entirely signed out against a fake database, so no saved board — and therefore no `RackCardMenu`-carrying card — ever renders here to measure directly. The saved variant's text stack (name, dims line, "Last touched" line, CTA) is structurally identical to the in-progress variant's (162.59 vs 158.39px measured), so the preset's larger chrome should already be a safe upper bound, but this has not been confirmed against a real saved board on a real phone. Plan 10-08's real-device sweep, which walks a signed-in rack, is where this gets checked.

## Next Phase Readiness

- No blockers. The cap, its doc comment, and every test that touches it are green across all three Playwright projects and the full Vitest suite.
- Gap 2's second `missing` item (walking the rack's rename, duplicate and delete on a real signed-in phone) remains plan 10-08's own work, as the plan's own `<gaps_this_plan_closes>` section says — untouched here.

## Self-Check: PASSED

All 3 files listed in "Files Modified" confirmed present on disk. All 3 commit hashes (`07d4339`, `98a4246`, `ff35a40`) confirmed present in `git log --oneline --all`. No missing items.

---
*Phase: 10-the-whole-app-on-a-phone*
*Completed: 2026-09-11*
