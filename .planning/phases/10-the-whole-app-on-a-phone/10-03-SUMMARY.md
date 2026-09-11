---
phase: 10-the-whole-app-on-a-phone
plan: 03
subsystem: ui
tags: [nextjs, tailwind, playwright, phone-layout, setup-screen]

requires:
  - phase: 09-the-design-screens-on-a-phone
    provides: the max-shell:/coarse: switch pair, the phone shell breakpoint at 820px, the
      Playwright iphone/android/desktop project setup this plan's tests build on
provides:
  - Bottom tab bar hidden on the home route, shown on every design route
  - One shared CardThumbnail component carrying the phone-only 387px height cap, used by both
    the preset cards and the saved-board rack cards
  - A standing Playwright proof that a board card fits a phone screen upright, sideways, and
    stays byte-identical on a desktop mouse
affects: [10-04, phase-10-end-of-phase-uat]

actuals:
  tokens: 5433
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Route-based visibility as a component's own concern (PhoneTabBar reading usePathname()
      and returning null), the same shape PhoneTopBar's onHomeScreen already used — a third,
      independent switch beside max-shell:/coarse:, not a fourth way of doing what either does"
    - "A phone-only sizing cap (max-shell:h-[387px]) sitting beside an unremoved aspect-ratio
      class — CSS resolves the definite-height case over the ratio automatically, so no
      max-shell:aspect-auto override was needed once measured"

key-files:
  created:
    - components/setup/card-thumbnail.tsx
    - e2e/phone-setup-landscape.spec.ts
  modified:
    - components/design/phone-tab-bar.tsx
    - components/setup/preset-card.tsx
    - components/setup/board-rack-card.tsx
    - e2e/phone-home.spec.ts

key-decisions:
  - "D-07 implemented as an exact-equality route check inside PhoneTabBar itself, not at either
    of its two mount points (app/page.tsx, app/design/layout.tsx) — both stayed byte-identical,
    confirmed by git diff against the phase's starting commit"
  - "D-08's 387px thumbnail cap measured and confirmed against this checkout rather than trusted
    from the plan: actual numbers came out 358x550 (iphone, paths 91/112/90/75 wide by ~357
    long) and 380x550 (android, paths 95/115/94/79 wide by ~360 long) — both essentially exactly
    what the plan predicted, so no figure needed correcting"
  - "D-02's shared CardThumbnail takes the exact same two props board-rack-card.tsx's old local
    copy took, so both call sites in that file needed zero changes beyond the import swap"

patterns-established:
  - "A card's thumbnail box is now one shared component (card-thumbnail.tsx) rather than
    duplicated markup — any future card type gets the phone cap for free by importing it"

requirements-completed: [PHON-08]

coverage:
  - id: D1
    description: "The six-tab bottom bar is hidden on the home route and shown on every design
      route, via an exact-equality pathname check that cannot be defeated by a crafted path"
    requirement: "PHON-08"
    verification:
      - kind: e2e
        ref: "e2e/phone-home.spec.ts#the Screens navigation is absent on the home route, and present after picking a preset"
        status: pass
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts#the bottom tab bar shows all six screens in order, TEMPLATE marked, every tab at least 44px"
        status: pass
      - kind: unit
        ref: "npx tsc --noEmit (whole project)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both the preset cards and the saved-board rack cards draw their thumbnail from
      one shared CardThumbnail component carrying a phone-only 387px height cap, with the
      340x620 viewBox and aspect-ratio class left untouched"
    requirement: "PHON-08"
    verification:
      - kind: e2e
        ref: "e2e/phone-home.spec.ts#every preset card's thumbnail is capped at 387px tall, and its board drawing still reads as a distinct outline"
        status: pass
      - kind: e2e
        ref: "e2e/phone-home.spec.ts#the thumbnail box's height still follows its own width and the 340/620 ratio — the phone cap never reaches here"
        status: pass
      - kind: unit
        ref: "npx vitest run (whole geometry suite — no test moved)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A card fits upright on a phone screen (520-580px tall, board drawing >=350px
      long), the same card stays two-up when the phone is held sideways (750x340), the 819/820px
      shell boundary is proven not to overlap, and the desktop card is unchanged"
    requirement: "PHON-08"
    verification:
      - kind: e2e
        ref: "e2e/phone-setup-landscape.spec.ts#the grid stays two-up, every card the same height as upright, at 750 x 340"
        status: pass
      - kind: e2e
        ref: "e2e/phone-home.spec.ts#at 819px the thumbnail box is capped at 387px, and at 820px it is back to the width/ratio height"
        status: pass
      - kind: e2e
        ref: "PW_PORT=3122 npx playwright test --project=desktop (full desktop project, no snapshot regenerated)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The board drawing at 387px thumbnail height still reads as a distinct
      shortboard/fish/mid-length/longboard silhouette 'in the hand' on a real device — not just
      by pixel-width measurement"
    human_judgment: true
    rationale: "Playwright proves the four outline paths measure 74-115px wide and ~357-360px
      long (well inside this plan's own prohibition threshold), but whether that reads as a
      legible silhouette on a physical phone screen is a visual judgment call the plan itself
      defers to end-of-phase UAT (workflow.human_verify_mode: end-of-phase) — not something this
      autonomous plan is permitted to sign off on itself."

duration: 40min
completed: 2026-09-10
status: complete
---

# Phase 10 Plan 03: Home Screen Gets the Boards Back Summary

**Hid the phone's six-tab navigation bar on the home screen and capped the board-card picture at 387px tall, so a whole board card fits a phone screen instead of running off the bottom of it.**

## Performance

- **Duration:** ~40min
- **Started:** 2026-09-10T19:36:00-07:00 (phase execution begin commit)
- **Completed:** 2026-09-11T03:13:00Z
- **Tasks:** 3/3
- **Files modified:** 6 (4 modified, 2 new)

## Accomplishments

- The bottom row of six screen tabs (TEMPLATE/ROCKER/RAILS/VOLUME/FINS/SUMMARY) no longer
  renders on the phone home screen — only on the six design routes — giving the setup screen's
  cards back the 56px + safe-area the bar was costing them, with both of its mount points
  (`app/page.tsx`, `app/design/layout.tsx`) left byte-identical.
- A single shared `CardThumbnail` component now draws the board picture for every card on the
  setup screen (both preset cards and both saved-board rack variants), carrying one new rule —
  a 387px height cap on a phone — so the two card files can never draw that box two different
  ways again.
- A preset card on a phone measures 358x550 (iPhone) / 380x550 (Android) instead of the old
  761px, with its board drawing still 357-360px long and 74-115px wide across the four presets —
  well clear of the plan's own "must stay tellable apart" floor.
- Standing Playwright coverage now proves: the card fits upright, the same card stays two-up
  when a phone is held sideways at 750x340, the phone/desktop card sizing switches over cleanly
  at the 819px/820px boundary with no overlap, and the desktop card (222x494, thumbnail 170x310)
  is measured byte-identical to before this plan.

## Task Commits

Each task was committed atomically:

1. **Task 1: The six tabs step off the home screen, and the test that pinned them there is rewritten** - `3abc1f6` (feat)
2. **Task 2: One shared board thumbnail, capped so a whole card fits a phone screen** - `6003e0f` (feat)
3. **Task 3: Measure the new card — upright, sideways, and on a desktop where nothing may move** - `99de254` (test)

**Plan metadata:** committed separately after this summary (see final_commit step).

## Files Created/Modified

- `components/design/phone-tab-bar.tsx` - added the exact-equality home-route check and rewrote
  the doc comment to describe both real mount points and the third-switch reasoning
- `components/setup/card-thumbnail.tsx` (new) - the one shared thumbnail box, exporting
  `CardThumbnail`, carrying the `max-shell:h-[387px]` phone cap
- `components/setup/preset-card.tsx` - now renders `<CardThumbnail>` instead of its own inlined
  two-div block
- `components/setup/board-rack-card.tsx` - removed its local `CardThumbnail` function, imports
  the shared one; both call sites (saved and in-progress variants) unchanged
- `e2e/phone-home.spec.ts` - inverted the six-tab-bar test (absent on home, present on a design
  route); added the phone card-measurement test, the desktop card-regression test and the
  819/820px boundary test
- `e2e/phone-setup-landscape.spec.ts` (new) - the sideways-phone two-up-grid proof at 750x340

## Decisions Made

- The route check lives inside `phone-tab-bar.tsx` as an exact-equality comparison (`pathname === "/"`),
  never a prefix or pattern match, per the plan's own threat register entry T-10-07 — verified
  by the rewritten test proving absence-on-home and presence-on-`/design/outline`.
- No `max-shell:aspect-auto` override was added beside the height cap: measured directly in
  WebKit at iPhone-14 width, a plain `h-[387px]` rule already wins over the still-declared
  `aspect-[340/620]` class (an element with both a definite width and a definite height ignores
  its own `aspect-ratio`), so the extra override the plan flagged as a fallback was not needed.
- D-08's numbers were re-measured rather than trusted from the plan (orchestrator ruling #5):
  the actual figures (358x550 / 380x550, paths 91-115px wide by 356.4-360.2px long) came out
  essentially identical to the plan's own predictions, so nothing needed correcting.

## Deviations from Plan

None — plan executed exactly as written. All three tasks matched their `<action>` blocks with
no Rule 1-4 fixes required.

## Issues Encountered

**Running the dev server inside this git worktree required a workaround not mentioned in the
plan's own executor notes, which only flagged `npm run build` as broken here.** Turbopack (the
default bundler behind both `next build` and `next dev` in this Next.js version) refuses to
resolve `node_modules` from inside a nested worktree directory — it treats the worktree as a
hermetic filesystem root and either fails outright (no `node_modules` present) or panics with
"Symlink [project]/node_modules is invalid, it points out of the filesystem root" (when one is
added). Resolution, entirely local to this worktree and touching no git-tracked file:
- Copied `.next/types` from the main checkout into the worktree (gitignored, read-only —
  supplies the `LayoutProps` global type Next.js 16 generates, which `npx tsc --noEmit` needs)
  and symlinked `node_modules` in the same way, for `tsc`/`vitest`/`eslint`.
- Started `next dev -p 3122 --webpack` manually (the documented Turbopack opt-out flag) with the
  same three fake-Clerk env vars `playwright.config.ts`'s own `webServer.env` sets, so
  Playwright's `reuseExistingServer: true` picked up this already-running server instead of
  trying to spawn its own Turbopack one (which would have hit the same panic).
- The dev server process was stopped before returning control; the `.next/types` copy and
  `node_modules` symlink are both gitignored and were never staged.

This let every command the plan's own `<verify>` blocks specify — `npx tsc --noEmit`, the full
Playwright phone+desktop suite, and the desktop-only full-project run — actually execute inside
the worktree, matching orchestrator ruling #9 ("run the FULL phone + desktop suite after every
task"), rather than deferring that proof to the orchestrator's post-wave run on `main`.

One Playwright test failed on two separate full-suite runs with a timeout/navigation-interruption
error unrelated to any file this plan touches (`phone-layout.spec.ts`'s "Width and Nose Angle are
on screen" test once, `phone-home.spec.ts`'s "16px margins" test once) — both passed cleanly when
re-run in isolation, confirming pre-existing suite-timing flakiness under full-suite load rather
than a regression from this plan's changes.

## Human verification deferred to end-of-phase UAT

Per `workflow.human_verify_mode: end-of-phase`, no task in this autonomous plan stopped for a
human. One item needs a real device, not a Playwright measurement, before phase sign-off:

- **Does a fish still read as a fish at this card size, in the hand?** Playwright confirms the
  four preset outline paths measure 74-115px wide and 356-360px long at the 387px thumbnail cap
  (D4 in the coverage block above) — comfortably inside this plan's own "must stay tellable
  apart" floor — but whether that reads as legible on a physical phone screen, not an emulated
  viewport, is the founder's own call per D-08's original screenshot-based decision.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The setup screen and the home-route tab bar are done for this phase's PHON-08 requirement. Ready
for the phase's remaining plans (dialogs/touch-sizing under PHON-07/09, sign-in/account controls)
and the end-of-phase real-device sweep, which should specifically confirm the deferred fish/board
legibility check above and the sideways-two-up-grid ruling this plan records as a Claude ruling
rather than a founder decision.

---
*Phase: 10-the-whole-app-on-a-phone*
*Completed: 2026-09-10*

## Self-Check: PASSED

- FOUND: `.planning/phases/10-the-whole-app-on-a-phone/10-03-SUMMARY.md`
- FOUND: commit `3abc1f6`
- FOUND: commit `6003e0f`
- FOUND: commit `99de254`
