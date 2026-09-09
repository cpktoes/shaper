---
phase: quick-260909-hq9
plan: 01
subsystem: ui
tags: [tailwind, phone-shell, nextjs, playwright]

requires:
  - phase: 09-the-design-screens-on-a-phone
    provides: the compact top bar (PhoneTopBar), the six-tab bottom bar (PhoneTabBar), the
      max-shell/coarse variant convention, and the design routes' own phone-shell tests these
      changes extend rather than duplicate
provides:
  - "/" (the home screen) now wears the same phone shell as the five design screens: the compact
    top bar (SHAPER as plain text, Save, the one menu) on top, the six-tab bottom bar below, and
    phone-sized margins/headings/card gaps in between
  - a saved-board three-dot menu that is thumb-sized (44px trigger and rows) on a touch pointer
affects: [10-the-whole-app-on-a-phone]

actuals:
  tokens: 6735
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "onPhoneShellRoute in site-nav.tsx is now the single gate deciding both the desktop link
      row's max-shell:hidden and whether PhoneTopBar mounts, widened to match '/' as well as
      '/design/*' — one route check, not two independent ones"
    - "PhoneTopBar reads usePathname (the same house pattern PhoneTabBar already used) to switch
      its wordmark between a Link (everywhere) and a plain span (on the page it points at)"
    - "PhoneTabBar is mounted per-route as the LAST child of the root layout's flex column —
      app/design/layout.tsx does it after props.children, app/page.tsx does it after a single
      fragment covering both the signed-in and signed-out branches"

key-files:
  created:
    - e2e/phone-home.spec.ts
  modified:
    - components/site-nav.tsx
    - components/design/phone-top-bar.tsx
    - app/page.tsx
    - components/setup/setup-screen.tsx
    - components/setup/board-rack.tsx
    - components/setup/rack-card-menu.tsx

key-decisions:
  - "No seventh HOME tab was added to the bottom bar (per the plan's own decision) — the bar's
    own 360px width comment already showed a seventh label would break the row; SHAPER in the top
    bar stays the way home."
  - "setup-screen.tsx's old px-6/md:px-8 split was replaced with an unprefixed px-8 (32px) base
    plus a single max-shell:px-4 (16px) override, rather than layering a new phone rule on top of
    the old split — the old split's 768px boundary sat below the app's 820px shell breakpoint and
    would have raced the new rule inside 768-819px."

requirements-completed: [QT-260909-hq9]

coverage:
  - id: D1
    description: "On a phone, / shows the compact top bar (SHAPER as text, Save, Menu) and the
      six-tab bottom bar with no tab marked"
    requirement: "QT-260909-hq9"
    verification:
      - kind: e2e
        ref: "e2e/phone-home.spec.ts › phone home screen — the compact top bar"
        status: pass
      - kind: e2e
        ref: "e2e/phone-home.spec.ts › phone home screen — the six-tab bottom bar"
        status: pass
    human_judgment: false
  - id: D2
    description: "A preset tap opens TEMPLATE and tapping SHAPER in the top bar returns home with
      the rack showing (both bars really navigate)"
    requirement: "QT-260909-hq9"
    verification:
      - kind: e2e
        ref: "e2e/phone-home.spec.ts › phone home screen — the round trip proves both bars navigate"
        status: pass
    human_judgment: false
  - id: D3
    description: "Phone margins (16px inset, including the 768-819px band), a single-line headline
      at 360px, one card per row with a 16px gap, and no sideways/vertical page scroll at 360,
      375, 393px"
    requirement: "QT-260909-hq9"
    verification:
      - kind: e2e
        ref: "e2e/phone-home.spec.ts › phone home screen — nothing scrolls sideways or vertically"
        status: pass
      - kind: e2e
        ref: "e2e/phone-home.spec.ts › phone home screen — margins, headings and thumb-sized cards"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every reachable phone control on the home screen clears 44px: the six tabs,
      Save, the menu button, every card; the saved-board three-dot trigger and its rows are sized
      via the same coarse: idiom but cannot be exercised by this signed-out suite"
    requirement: "QT-260909-hq9"
    verification:
      - kind: e2e
        ref: "e2e/phone-home.spec.ts › the tab bar shows all six screens in order, none marked, every tab at least 44px"
        status: pass
      - kind: e2e
        ref: "e2e/phone-home.spec.ts › the Save and Menu buttons in the top bar each measure at least 44x44"
        status: pass
      - kind: e2e
        ref: "e2e/phone-home.spec.ts › every preset card takes a full row, one under the other, each at least 44px tall"
        status: pass
    human_judgment: true
    rationale: "The rack card menu (three-dot trigger and Rename/Duplicate/Delete rows) cannot be
      reached by this suite — it runs signed out against a fake database, so no saved board and
      therefore no three-dot menu ever renders. Its 44px sizing is proven by grep-counted class
      checks in the plan's own <verify>, not by a click-through test; the real-device pass is
      explicitly Phase 10's."
  - id: D5
    description: "At 820px and above the home screen is completely unmoved: link row visible, no
      tab bar, no compact bar, 32px inset, 30px headline, four preset cards across"
    requirement: "QT-260909-hq9"
    verification:
      - kind: e2e
        ref: "e2e/phone-home.spec.ts › desktop home screen — unmoved"
        status: pass
      - kind: e2e
        ref: "e2e/phone-home.spec.ts › desktop home screen — margins and headings unmoved"
        status: pass
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts (all five screenshots, --project=desktop)"
        status: pass
    human_judgment: false

duration: ~35min
completed: 2026-09-09
status: complete
---

# Quick Task 260909-hq9: Phone Home Screen Gets the App's Shell Summary

**The home screen ("/") now wears the same phone shell as the five design screens — compact top
bar, six-tab bottom bar, 16px phone margins, a one-line headline, one-card-per-row, and a
thumb-sized saved-board menu — with the desktop layout completely unmoved.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-09-09
- **Tasks:** 2
- **Files modified:** 6 (+1 new test file)

## Accomplishments

- Widened `site-nav.tsx`'s single route check (renamed `onDesignRoute` → `onPhoneShellRoute`) so
  the home screen gets the phone shell alongside the five design screens — one check, not a
  second copy of the bar.
- `phone-top-bar.tsx`'s SHAPER wordmark now switches between a working `Link` (on the design
  screens) and plain text (on the home screen it would otherwise point at), via one hoisted class
  constant so the two can never drift.
- `app/page.tsx` now mounts `PhoneTabBar` as the last child of a single returned fragment covering
  both the signed-in and signed-out branches, so the bar is mounted exactly once either way.
- `setup-screen.tsx`, `board-rack.tsx` and `rack-card-menu.tsx` got phone-sized margins, headings,
  card gaps and a thumb-sized saved-board menu, all gated on the app's existing `max-shell:` (width)
  and `coarse:` (pointer) variants — no hand-rolled media query, no new colour or size.
- A new `e2e/phone-home.spec.ts` (21 tests across three projects, 13 + 24 running per task) is now
  the home screen's own standing proof, on both phone projects and the desktop one.

## Task Commits

Each task was committed atomically:

1. **Task 1: The home screen gets the same top and bottom bars as a design screen** - `4cfcca0` (feat)
2. **Task 2: Phone-sized margins, headings and thumb-sized cards between the two bars** - `83f0af9` (feat)

_Both tasks were TDD (`tdd="true"`): the RED failures were watched and confirmed in-terminal for
every new test before implementation, so no separate `test(...)` commit was made — each task
commit carries both the failing-then-passing spec and the implementation together, matching this
plan's own single-tracer-commit shape rather than the finer-grained plan-level TDD gate (that gate
applies when the whole plan's `type: tdd`, which this plan does not set)._

## Files Created/Modified

- `components/site-nav.tsx` - the one route check widened from design-only to design-or-home
- `components/design/phone-top-bar.tsx` - wordmark is text on `/`, a link everywhere else
- `app/page.tsx` - `PhoneTabBar` mounted once, as the fragment's last child, on both auth branches
- `components/setup/setup-screen.tsx` - phone-width container padding, headline size, grid gaps;
  new `data-setup-content` measurement hook
- `components/setup/board-rack.tsx` - phone-width section gap, heading size, grid gaps
- `components/setup/rack-card-menu.tsx` - thumb-sized trigger (`coarse:size-11`) and rows
  (`coarse:min-h-11`)
- `e2e/phone-home.spec.ts` (new) - the home screen's own phone-shell, margin, heading, card-row,
  touch-target and round-trip proof, plus the desktop "unmoved" counterpart

## Decisions Made

- No seventh HOME tab on the bottom bar — the existing bar's own width comment already proved a
  seventh label breaks the row at 360px; SHAPER in the top bar is the way home, unchanged.
- Replaced the setup screen's old `px-6`/`md:px-8` split with an unprefixed `px-8` base plus one
  `max-shell:px-4` override, instead of adding a third competing rule — the old split's 768px
  boundary sat below the app's own 820px shell breakpoint and would otherwise race the new phone
  rule inside the 768-819px band.
- Comments near the counted `<verify>` greps were written in prose (e.g. "a phone-width override")
  rather than repeating the literal Tailwind class token, per the plan's own instruction — see
  Deviations below for the one place this was caught and fixed mid-task.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Doc comments repeated the literal class tokens the `<verify>` step counts**
- **Found during:** Task 2, immediately after writing the implementation comments
- **Issue:** The plan explicitly warns: "When a comment ... needs to talk about a Tailwind class
  name that a check below counts, write it in words ... never as the literal class — a comment
  that repeats a counted token makes the count lie." My first pass at the doc comments in
  `setup-screen.tsx`, `board-rack.tsx` and `rack-card-menu.tsx` did exactly that — e.g. writing
  `max-shell:pt-6/pb-8` and `coarse:size-11` inside prose comments — which inflated the `grep -o`
  counts (11 instead of ≥4, 2 instead of the exact 1 the plan's done criteria required for the
  measurement hook, etc.).
- **Fix:** Rewrote every offending comment to describe the rule in words ("a phone-width override
  brings the gap down to 16px") before any class name, keeping the class strings themselves
  untouched. Re-ran the `<verify>` greps to confirm every counted number now matches the plan's
  exact and minimum expectations.
- **Files modified:** `components/setup/setup-screen.tsx`, `components/setup/board-rack.tsx`,
  `components/setup/rack-card-menu.tsx`
- **Verification:** `grep -o` counts re-run and matched (6/4/1/1/1/2 against the plan's ≥4/≥4/≥1/≥1/=1/=2)
- **Committed in:** `83f0af9` (Task 2 commit — caught before commit, so no separate fix commit)

---

**Total deviations:** 1 auto-fixed (Rule 1, self-caught before commit)
**Impact on plan:** No scope creep — this was a self-correction of my own draft comments against
the plan's own explicit instruction, made before the task was committed.

## Issues Encountered

- One `RAILS (/design/rails)` desktop baseline screenshot failed with a 2%-pixel diff on the first
  full-suite run (`PW_PORT=3121 npx playwright test`), unrelated to any file this plan touches.
  Re-running `e2e/desktop-baseline.spec.ts` alone passed cleanly, and a second full-suite run
  passed all 137 non-skipped tests with zero failures — confirmed flaky (likely a rail-plot render
  timing race under full-suite load), not a regression from this plan's changes. No snapshot was
  regenerated at any point (`git status --porcelain e2e/desktop-baseline.spec.ts-snapshots` reads
  0 throughout).

## Human verification deferred

Per this session's `workflow.human_verify_mode` (end-of-phase) and the orchestrator's ruling that
Task 1 (a `tracer`) must not stop for a checkpoint, the following `<human-check>` item from Task
2's own `<verify>` was not performed interactively during this run and should be spot-checked by a
person before/alongside shipping:

> "On a phone-sized browser window open the home screen: the slim bar is on top, the six tabs are
> along the bottom, the SHAPE A NEW BOARD headline fits on one line, the page sits a thumb's width
> in from each edge, and the four board-type cards run one under the other with an easy gap
> between them. Tap one — TEMPLATE opens. Tap SHAPER — you are home again with your board in the
> rack. Widen the window past a tablet and the home screen is exactly the one you know: six links
> across the top, no tab strip, big headline, four cards across."

Every measurable part of this same claim (bar visibility, headline single-line, 16px insets,
44px targets, the real preset-to-editor-and-back round trip, and the desktop "nothing moved"
counterpart) is already proven by `e2e/phone-home.spec.ts` on both phone projects and desktop —
this is a visual spot-check on top of that automated proof, not a substitute for it.

## What this leaves for Phase 10

`.planning/REQUIREMENTS.md` (PHON-08, "The Whole App on a Phone") is split across this quick task
and Phase 10:

- **Delivered here (PHON-08's layout half):** the compact top bar and six-tab bottom bar mounted
  on the home screen, phone-sized page margins/headline/card gaps, and the 44px sweep over every
  control visible on the home screen while signed out — the tabs, Save, the menu button, every
  card, and the saved-board three-dot trigger's and rows' *sizing rules* (though not their
  click-through behaviour, since this suite runs signed out).
- **Still Phase 10's:** the account menu and sign-in flows opened from the home screen's one menu;
  the Rename / Duplicate / Delete dialogs, including their typed fields (still 32px tall — they
  come from `components/ui/input.tsx`, off-limits to this task); a signed-in rack of real saved
  boards (unreachable by this suite's fake-Clerk/fake-database setup); and the real-device pass
  across all of the above, including the saved-board three-dot menu this task could only size, not
  click-test.

Phase 10's planning should treat PHON-08's layout half as done and scope its own plan around the
account/sign-in surface and the real-device verification instead of re-deriving the layout work
above.

## Next Phase Readiness

- The home screen's phone shell is complete and proven by its own standing e2e suite; Phase 10 can
  build directly on it (the compact top bar's one menu, the bottom bar, and the phone-sized rack
  layout) without re-touching `site-nav.tsx`, `phone-top-bar.tsx`, `app/page.tsx`,
  `setup-screen.tsx` or `board-rack.tsx` for layout reasons.
- No blockers. `rack-card-menu.tsx`'s Rename/Duplicate/Delete flows and their dialogs are the one
  piece of unfinished touch work on this screen, and they're explicitly Phase 10's per the plan.

## Self-Check: PASSED

All 8 claimed files found on disk (7 code/test files + this SUMMARY); both task commits
(`4cfcca0`, `83f0af9`) found in `git log --oneline --all`.

---
*Quick task: 260909-hq9*
*Completed: 2026-09-09*
