---
phase: 10-the-whole-app-on-a-phone
plan: 07
subsystem: ui
tags: [tailwind, css, playwright, clerk, testing]

requires:
  - phase: 10-05
    provides: "the width-and-height max-shell/shell layout switch, which decides which viewports still render SiteNav's full row versus PhoneTopBar"
provides:
  - "components/auth/nav-auth-control.tsx's avatar padding, now carrying Tailwind's important flag so it outranks Clerk's own runtime stylesheet"
  - "components/auth/nav-auth-control.test.ts's compiled-CSS proof that the flagged class emits !important and the unflagged one does not"
  - "e2e/site-nav-width.spec.ts — the standing nav-row-width regression test the mid-phase overflow fix (5dae1f1) shipped without"
  - "components/ui/input.css.test.ts's consumer-count case, now actually counting every importer instead of checking three known ones"
affects: [nav-auth-control, site-nav, input-consumers]

actuals:
  tokens: 4500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Tailwind v4's trailing `!` important marker as the pre-authorised fallback when a utility class handed to a third-party component's styling prop can lose the cascade to that vendor's own runtime stylesheet"
    - "A completeness-claiming test backed by a real repo-wide file search (grep -rlF over both trees a consumer could live in), not a fixed list of known files, with the search needle built from parts and test files excluded so the test can't match itself"

key-files:
  created:
    - e2e/site-nav-width.spec.ts
  modified:
    - components/auth/nav-auth-control.tsx
    - components/auth/nav-auth-control.test.ts
    - components/ui/input.css.test.ts

key-decisions:
  - "The avatar's touch padding now carries Tailwind's `!` important marker (coarse:p-2!), per D-05's own pre-authorisation, because the real-phone sweep came back 'unsure, looks the same to me' for the plain class — treated as a failure, not a shrug, since a tap target can't be judged by eye."
  - "The nav-row width regression test's touch case uses Galaxy Tab S9 landscape (1024x640, Chromium) rather than iPad Mini landscape (WebKit), specifically so the file runs correctly under this plan's own --project=android acceptance-criterion invocation — iPad Mini landscape only runs on the iphone/WebKit project and would have skipped under that command."
  - "input.css.test.ts's consumer-count case now greps both components/ and app/ for real importers of @/components/ui/input, sorts both sides, and excludes test files — belt-and-braces alongside a needle built from string parts, so the test can never match its own source."

patterns-established:
  - "When a real-phone sweep reports 'looks the same, unsure' for a CSS-only tap-target fix, that counts as FAIL per this phase's own rule (a size can't be judged by eye) and triggers the pre-authorised escalation named at plan time, rather than a fresh design discussion."

requirements-completed: [PHON-07]

coverage:
  - id: T1
    description: "The avatar trigger's padding compiles to a padding declaration carrying !important inside a coarse-pointer media rule; the same utility without the flag compiles to the identical padding with no !important."
    requirement: PHON-07
    verification:
      - kind: unit
        ref: "components/auth/nav-auth-control.test.ts#D-05: the signed-in branch returns Clerk's button directly, with no wrapper, carrying the important-flagged coarse padding class"
        status: pass
      - kind: unit
        ref: "components/auth/nav-auth-control.test.ts#nav-auth-control.tsx — compiled-CSS proof the important flag outranks an ordinary rule (D-05 fallback)"
        status: pass
    human_judgment: true
    rationale: "Whether Clerk's own injected rule is itself flagged important — the one case where this fix would still lose — cannot be settled by any test in this repository. Deferred to the real-device sweep as a tap behaviour (see 'Human Verification Deferred' below), not a size judgement."
  - id: T2
    description: "The top nav row (wordmark, six links, settings, Save, account) fits without horizontal scroll at 820, 844 and 863px wide on a mouse, and on a touch screen wide/tall enough to keep the desktop shell."
    verification:
      - kind: e2e
        ref: "e2e/site-nav-width.spec.ts — all non-skipped cases, --project=desktop --project=android"
        status: pass
    human_judgment: false
  - id: T3
    description: "The shared Input component's consumer-count test asserts a real, sorted set-equality between every file that imports it and the three known consumers, not three independent presence checks."
    verification:
      - kind: unit
        ref: "components/ui/input.css.test.ts#edge case: exactly the three known consumers of Input exist — a fourth would be a deliberate decision, not an accident (WR-02)"
        status: pass
    human_judgment: false

duration: ~50min
completed: 2026-09-11
status: complete
---

# Phase 10 Plan 07: The Avatar's Tap Target, the Nav Row's Missing Test, and a Test That Now Counts — Summary

**The account avatar's touch padding now carries Tailwind's important flag so Clerk's own runtime stylesheet can't quietly override it, the nav row that once ran off the side of the screen now has a standing test behind it, and a test that claimed to count every consumer of the shared text field now actually does.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 3 of 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- **The avatar's tap target now wins the cascade.** `nav-auth-control.tsx`'s signed-in branch hands
  Clerk `coarse:p-2!` instead of `coarse:p-2` — the same padding, now carrying Tailwind's trailing
  `!` important marker, still gated to a touch pointer, still no wrapper. Compiled against this
  checkout's own `app/globals.css` (Tailwind v4.3.3):
  - `coarse:p-2!` compiles to `padding: calc(var(--spacing) * 2) !important;` inside `@media
    (pointer: coarse)` — **8px a side, so the 28px button reads 44x44.**
  - The same utility without the flag, `coarse:p-2`, compiles to the identical
    `padding: calc(var(--spacing) * 2);` with **no** `!important` — proving the flag, not the
    padding value, is what changed.
  - A new compiled-CSS test case in `nav-auth-control.test.ts` asserts both.
- **A standing test now guards the nav-row overflow fix.** `e2e/site-nav-width.spec.ts` asserts, at
  every case: the document never scrolls sideways, the nav element's own content never overflows
  its box, and both end items (the wordmark, the account-control cluster) sit inside the
  viewport's edges. It runs at 820, 844 and 863px on a mouse (desktop project), and once more on
  Galaxy Tab S9 landscape (1024x640, Chromium, touch) — a screen genuinely wide and tall enough to
  keep the desktop shell, so the account control's touch-grown width is actually exercised.
- **The consumer-count test now counts.** `input.css.test.ts`'s "exactly the three known consumers"
  case now runs `grep -rlF` for the real import specifier across both `components/` and `app/`,
  excludes test files, sorts both sides, and asserts set equality against the three known
  consumers — instead of checking that three named files still import `Input`. Proved non-vacuous
  by temporarily adding a fourth importing file (see below).
- **IN-01 recorded where it lives.** `input.css.test.ts`'s header now carries a one-line pointer to
  `nav-auth-control.test.ts`'s IN-01 finding and its "no action required" disposition, so a future
  reader meets the caveat in the code.

## Task Commits

1. **Task 1: Say it in a way Clerk's own styling cannot outrank — the avatar's tap target** —
   `6f303d2` (fix) — RED (2 failing source-contract assertions) then GREEN in one commit, per the
   tracer task's TDD flow: test extended first and confirmed failing, then the component fixed.
2. **Task 2: The top row can't run off the side of the screen any more** — `0226a78` (test)
3. **Task 3: Make the test that counts, count** — `242df2b` (test)

## Files Created/Modified

- `components/auth/nav-auth-control.tsx` — signed-in branch's `appearance` prop now hands Clerk
  `coarse:p-2!`; comment rewritten to record the sweep's "unsure, looks the same" result and why
  the important flag is the pre-authorised answer, not a new decision
- `components/auth/nav-auth-control.test.ts` — source-contract regex updated to the new class
  string; new `describe` block compiling both the flagged and unflagged utility and asserting on
  the emitted CSS
- `e2e/site-nav-width.spec.ts` (new) — the nav-row-width regression test
- `components/ui/input.css.test.ts` — consumer-count case rewritten to a real file search; header
  gains the IN-01 pointer note

## Compiled Padding Value and Resulting Button Size (Task 1)

Verified against this checkout on 2026-09-11 with the app's own Tailwind (v4.3.3):

| Candidate | Compiles to | Resolves to |
|---|---|---|
| `coarse:p-2!` | `padding: calc(var(--spacing) * 2) !important;` inside `@media (pointer: coarse)` | **8px a side** — the 28x28 avatar trigger becomes **44x44** |
| `coarse:p-2` (unflagged) | `padding: calc(var(--spacing) * 2);` inside the same media rule, no `!important` | Same 8px value, but loses the cascade to a rule of equal or higher specificity |

## Non-Vacuity Checks

**Task 1 — revert-and-restore (no `git stash`, per this repo's rule):** patched the class string
in `nav-auth-control.tsx` back to `coarse:p-2` (no flag) with `sed`, ran
`npx vitest run components/auth/nav-auth-control.test.ts`:

- **Reverted:** 2 of 10 tests fail — both assertions expecting the `!`-flagged class string.
- **Restored:** 10 of 10 pass.

**Task 2 — temporarily widening the nav's own padding:** changed `site-nav.tsx`'s base padding
class from `px-6` to `px-24` (a local, uncommitted edit — `lg:px-12` itself is gated behind
Tailwind's 1024px `lg:` breakpoint and does not apply in the 820-863px band this spec tests, so
widening it first produced a false pass; the base `px-6` class is what actually applies at these
widths), ran `PW_PORT=3122 IS_WEBPACK_TEST=1 npx playwright test e2e/site-nav-width.spec.ts
--project=desktop --project=android`:

- **Widened:** 2 of 3 desktop-project cases FAIL (820px and 844px; 863px still had enough room to
  pass), the touch case still passes.
- **Restored** (`git checkout -- components/site-nav.tsx`): all 4 non-skipped cases pass.
- `git status` confirms `components/site-nav.tsx` unmodified and no stray files after the check.

**Task 3 — temporarily adding a fourth importer:** created a scratch file
`components/ui/scratch-fourth-consumer.tsx` importing `Input`, ran
`npx vitest run components/ui/input.css.test.ts`:

- **With the scratch file:** the consumer-count case FAILS — the discovered set includes the
  fourth file, the expected set doesn't.
- **Removed:** all 4 tests in the file pass.
- `git status` confirms no stray file left behind.

## Viewports the Nav-Row Spec Runs At, and Why

- **820, 844, 863px wide, mouse-driven (desktop project), height 700:** 820px is where commit
  `5dae1f1`'s own message measured the first 51px overflow; 863px is a real Pixel 7 held sideways
  (10-SWEEP.md, 2026-09-11), where the touch-grown account control made the overflow 7px worse.
  844px fills the middle of the band.
- **Galaxy Tab S9 landscape (1024x640, Chromium, touch), android project:** after 10-05, a *short*
  touch screen in the 820-863px band is now the phone layout (`max-shell` fires on `width < 820px`
  OR `coarse pointer AND height < 500px`), where `SiteNav`'s row is hidden and `PhoneTopBar` renders
  instead — so a short sideways phone could never exercise this row at all. This device is
  genuinely wide (1024px) AND tall (640px) enough to keep the desktop shell, which is the only way
  to exercise the touch-grown account control against `SiteNav`'s real row. It uses the same
  Chromium-only device family plan 10-05's `slider-touch.spec.ts` Case B settled on, rather than
  the WebKit `iPad Mini landscape` descriptor `phone-layout.spec.ts` uses elsewhere, specifically
  so this file runs correctly under this plan's own acceptance-criterion invocation
  (`--project=desktop --project=android` — `iPad Mini landscape` only runs on the `iphone`
  project and would have skipped silently under that exact command).

## Full Verification

- `npx vitest run` — **2461 passed, 2 skipped, 0 failed** (59 test files)
- `npx tsc --noEmit` — clean, no errors
- `PW_PORT=3122 IS_WEBPACK_TEST=1 npx playwright test` (full suite, all three projects) —
  **211 passed, 193 skipped, 1 failed (14.5m)**

### The one failure, and why it isn't a regression

`e2e/phone-setup-landscape.spec.ts` (a file this plan is explicitly forbidden from touching — it
belongs to plan 10-06/prior work) failed with `Internal Next.js error: Router action dispatched
before initialization`, a dev-server-side routing error, not a layout or CSS assertion failure.
This machine ran three concurrent Playwright suites during this plan's execution (this worktree's
own full run, the sibling 10-06 executor's full run on a different port, plus an unrelated
project's own suite) — `uptime` showed a load average of ~25-28 throughout. Re-running the exact
failing test in isolation immediately after the full run, with no other change:

```
PW_PORT=3122 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-setup-landscape.spec.ts --project=iphone
```

**1 passed (26.3s).** This confirms the failure was resource-contention-induced dev-server flake,
not a regression introduced by this plan's changes — none of which touch that file, its route, or
`card-thumbnail.tsx`. `npx vitest run` and `npx tsc --noEmit` (both fast, unaffected by
contention) stayed green throughout every check in this plan.

## Human Verification Deferred to the Real-Device Sweep

**The avatar's real tap size**, verbatim, for plan 10-08 to lift into the sweep sheet:

> Tap the very edge of the round picture, about a finger-width out from its rim, five times. If
> the account menu opens every time, the space is really there; if some taps do nothing, it is
> not.

This is a behaviour, not a size judgement — the residual risk this plan cannot close by itself is
whether Clerk's own injected rule for the avatar trigger is *itself* flagged `!important`, in
which case this fix loses too and no automated test in this repository could tell.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fresh worktree had no generated Next.js route types**
- **Found during:** Task 1's first `npx tsc --noEmit` run
- **Issue:** `app/design/layout.tsx` and `app/layout.tsx` failed with `Cannot find name
  'LayoutProps'` — the same fresh-worktree gap 10-05's own SUMMARY recorded and resolved the same
  way.
- **Fix:** Ran `npx next typegen`, which generates `.next/types/*` without a full build.
  `.next/` is gitignored, so this left no tracked-file trace.
- **Files modified:** None (generated, gitignored output only)

**2. [Rule 1 - Bug, caught during Task 2's non-vacuity check] The plan's own suggested edit
   (`lg:px-12`) would not have proven the test non-vacuous**
- **Found during:** Task 2's acceptance-criterion non-vacuity check
- **Issue:** First attempt widened `lg:px-12` → `lg:px-32`, expecting the spec to fail at
  820-863px. It didn't — `lg:` is Tailwind's 1024px breakpoint, which never applies in the tested
  band, so this edit changed nothing observable there.
- **Fix:** Widened the base `px-6` class instead (`px-6` → `px-24`), which does apply at every
  width including 820-863px, and confirmed 2 of 3 desktop cases then failed as expected.
- **Files modified:** None in the final state — both attempts were local, uncommitted, and
  reverted via `git checkout -- components/site-nav.tsx` before committing the test.

### PW_PORT used

This plan's own executor notes named port 3108; the orchestrator's parallel-execution rulings for
this wave assigned port 3122 instead, since another executor (10-06) was running concurrently on
its own port. Every Playwright invocation in this plan used **3122**, per the orchestrator's
explicit ruling, which takes precedence over the plan's own (now stale) port assignment.

---

**Total deviations:** 2 auto-fixed (1 blocking/tooling, 1 bug in a plan-suggested verification
edit) — neither touched a file outside this plan's `files_modified` list, and neither changes what
any test proves.

## Self-Check: PASSED

Verified on disk:
- `[ -f components/auth/nav-auth-control.tsx ]` — FOUND
- `[ -f components/auth/nav-auth-control.test.ts ]` — FOUND
- `[ -f e2e/site-nav-width.spec.ts ]` — FOUND
- `[ -f components/ui/input.css.test.ts ]` — FOUND

Verified in `git log --oneline --all`:
- `6f303d2` — FOUND
- `0226a78` — FOUND
- `242df2b` — FOUND

No missing items.

---
*Phase: 10-the-whole-app-on-a-phone*
*Completed: 2026-09-11*
