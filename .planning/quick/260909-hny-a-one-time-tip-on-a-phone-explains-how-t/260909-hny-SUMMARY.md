---
phase: quick-260909-hny
plan: 01
subsystem: ui
tags: [react, useSyncExternalStore, localStorage, tailwind-v4, playwright, ios-safari]

requires:
  - phase: quick-09
    provides: the phone design-screen shell, the sign-in banner's dismissal pattern, and the
      iOS-only `-webkit-touch-callout` CSS feature-detection guard this plan reuses
provides:
  - a one-time, permanently-dismissible tip on iPhone/iPad design screens telling a shaper how to
    hide Safari's own toolbar for more drawing room
  - lib/models/toolbar-tip.ts as a documented sibling to banner-dismissal.ts, for any future
    permanent (vs per-visit) dismissal
affects: [phone-ui, printing, e2e-suite]

actuals:
  tokens: 9440
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Permanent (localStorage) one-time dismissal, paired with sessionStorage's per-visit
      dismissal already established by banner-dismissal.ts — two sibling modules, two different
      lifetimes, documented against each other."
    - "Three-gate visibility: two CSS gates (phone width, iOS feature-detection) decide whether an
      always-server-rendered element paints; one React gate (useSyncExternalStore over
      localStorage) decides whether it exists in the DOM at all. Width/platform never becomes a
      JavaScript check."

key-files:
  created:
    - lib/models/toolbar-tip.ts
    - lib/models/toolbar-tip.test.ts
    - components/design/toolbar-tip.tsx
    - components/design/toolbar-tip.test.ts
    - e2e/phone-toolbar-tip.spec.ts
  modified:
    - app/design/layout.tsx
    - e2e/phone-layout.spec.ts
    - e2e/phone-screens.spec.ts
    - e2e/phone-rails.spec.ts
    - e2e/touch-sizing.spec.ts
    - e2e/keyboard-focus.spec.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/viewer-toolbar.spec.ts
    - e2e/phone-fins-landscape.spec.ts

key-decisions:
  - "The dismissal key lives in its own module (lib/models/toolbar-tip.ts), not folded into
    banner-dismissal.ts, because that file's own doc comment argues at length for a per-visit
    store — adding a permanent key there would make that argument a lie."
  - "The two banners (sign-in offer, toolbar tip) stay independent — dismissing one never hides
    the other, so a shaper who never dismisses the standing sign-in offer still sees the tip."
  - "Init-script insurance was added to all eight phone/desktop specs that dismiss the sign-in
    banner, not just the six the plan named at planning time — e2e/viewer-toolbar.spec.ts and
    e2e/phone-fins-landscape.spec.ts landed on this checkout after the plan was written and also
    dismiss the sign-in banner, so the same 'every spec that dismisses the sign-in banner' rule
    applies to them."

patterns-established:
  - "A `display:none` element is invisible to Playwright's `getByRole` (excluded from the
    accessibility tree) even though it is still attached to the DOM — a plain CSS locator plus
    `dispatchEvent` is the correct way to exercise a CSS-gated control's dismissal wiring in an
    emulator that cannot render the gate itself."

requirements-completed: [QT-260909-hny]

coverage:
  - id: D1
    description: "The tip's visibility rule and permanent remembering live in a pure, tested
      module (lib/models/toolbar-tip.ts) beside the sign-in banner's own, with the same
      storage-failure discipline."
    requirement: "QT-260909-hny"
    verification:
      - kind: unit
        ref: "lib/models/toolbar-tip.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "A one-time strip on an iPhone/iPad design screen tells a shaper how to hide
      Safari's toolbar, gated by phone width (CSS) and iOS-only feature detection (CSS), mounted
      after the sign-in banner, never printed, and dismissible for good via a full-height Got it
      button."
    requirement: "QT-260909-hny"
    verification:
      - kind: unit
        ref: "components/design/toolbar-tip.test.ts (source-contract: variant order, print-hide,
          model import, permanent store, flex-none, mount order in app/design/layout.tsx)"
        status: pass
      - kind: e2e
        ref: "e2e/phone-toolbar-tip.spec.ts (DOM contract, permanent dismissal wiring, desktop
          guard) — PW_PORT=3119 npx playwright test e2e/phone-toolbar-tip.spec.ts"
        status: pass
    human_judgment: true
    rationale: "Playwright's WebKit does not implement -webkit-touch-callout (probed at planning
      time and reconfirmed in this run — case 3 in phone-toolbar-tip.spec.ts skips itself for
      exactly this reason), so no automated browser test in this repo can prove the tip actually
      paints, wraps, and sits above the drawing on a real iPhone. Only a person on a real device
      can close that gap."
  - id: D3
    description: "No board number, no drawing, and no desktop pixel changed; every existing test
      in the whole suite still passes; the five desktop baseline screenshots match with no
      snapshot regenerated."
    requirement: "QT-260909-hny"
    verification:
      - kind: unit
        ref: "npx vitest run (48 files, 2334 passed, 2 skipped)"
        status: pass
      - kind: e2e
        ref: "PW_PORT=3119 npx playwright test (118 passed, 110 skipped, 0 failed)"
        status: pass
      - kind: other
        ref: "git status --porcelain e2e/desktop-baseline.spec.ts-snapshots/ (empty)"
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-09-09
status: complete
---

# Phase quick-260909-hny Plan 01: One-time iPhone toolbar-hiding tip Summary

**A one-time strip on an iPhone design screen tells a shaper how to hide Safari's own toolbar for
more drawing room, remembered permanently per phone via a new `lib/models/toolbar-tip.ts` sibling
to the sign-in banner's dismissal module — with no desktop pixel or printed page affected.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-09T20:35:00Z (worktree base commit)
- **Completed:** 2026-09-09T20:57:18Z
- **Tasks:** 2 completed
- **Files modified/created:** 14

## Accomplishments

- Built the founder's own fallback for a request the web has no API for: since no website can
  hide a phone browser's own toolbar (and the one trick that would — a Home-Screen web app
  manifest — silently breaks printing on iOS), the app now tells a shaper once, quietly, how to
  do it themselves via Safari's own page menu.
- The tip disappears the instant Got it is tapped and never returns on that phone — not on the
  next screen, not after a reload, not next week — via a new permanent-storage sibling to the
  existing per-visit sign-in-banner dismissal.
- Proved the three visibility gates (phone width, iOS-only, not-yet-dismissed) with the right
  tool for each: a source-contract test for the two CSS gates Playwright's WebKit cannot render,
  and a real-browser e2e suite for the DOM contract and the dismissal wiring.
- Extended init-script insurance to every phone/desktop e2e spec that dismisses the sign-in
  banner — eight files total, including two that landed on this checkout after the plan was
  written — so a future emulator upgrade can never silently shift an existing layout assertion.
- Confirmed zero regressions: the whole vitest suite (2334 tests), the whole Playwright suite
  (118 tests across three projects), and all five desktop baseline screenshots are untouched.

## Task Commits

Each task was committed atomically, with Task 1 following its own RED/GREEN cycle since it
carried `tdd="true"`:

1. **Task 1 (RED): failing tests for the toolbar-hiding tip** - `95ccb72` (test)
2. **Task 1 (GREEN): the tip itself** - `b547223` (feat)
3. **Task 2: browser proof and existing-test insurance** - `ae9d40d` (test)

_Task 1 was typed `tracer` — its own `<verify>` (vitest + tsc + lint + the grep checks) was
re-run end-to-end immediately after commit `b547223`, per the autonomous-run tracer feedback
gate, before Task 2's expansion work began._

## Files Created/Modified

- `lib/models/toolbar-tip.ts` - the pure visibility rule (`!dismissed`) and the two
  try/catch-guarded localStorage helpers, doc-commented against `banner-dismissal.ts`
- `lib/models/toolbar-tip.test.ts` - mirrors `banner-dismissal.test.ts` case for case, plus a
  test proving the two dismissal keys never collide
- `components/design/toolbar-tip.tsx` - the strip: `data-print-hide`, `data-toolbar-tip`, the two
  stacked CSS gates, the exact Safari wording, and a `Button` at default size for the 44px Got it
  tap target
- `components/design/toolbar-tip.test.ts` - source-contract test guarding the CSS gate order, the
  print-hide attribute, the model import, and the mount order in `app/design/layout.tsx`
- `app/design/layout.tsx` - mounts `<ToolbarTip />` immediately after `<SignInBanner />`, doc
  comment extended (not rewritten) to explain the mount order and the two banners' independence
- `e2e/phone-toolbar-tip.spec.ts` - four cases: DOM contract, permanent dismissal wiring, a
  self-activating conditional-visibility case for when Playwright's WebKit catches up, and the
  desktop guard
- `e2e/phone-layout.spec.ts`, `e2e/phone-screens.spec.ts`, `e2e/phone-rails.spec.ts`,
  `e2e/touch-sizing.spec.ts`, `e2e/keyboard-focus.spec.ts`, `e2e/desktop-baseline.spec.ts`,
  `e2e/viewer-toolbar.spec.ts`, `e2e/phone-fins-landscape.spec.ts` - each now also dismisses the
  toolbar tip in its init script, with a one-line comment explaining it changes no measurement
  today and exists as insurance against a future emulator upgrade

## Decisions Made

- Kept the permanent dismissal key out of `banner-dismissal.ts` entirely, in its own module,
  because that file's doc comment specifically argues for a per-visit store — see key-decisions
  in frontmatter.
- Extended init-script insurance to two specs not named in the plan
  (`e2e/viewer-toolbar.spec.ts`, `e2e/phone-fins-landscape.spec.ts`) because both landed on this
  checkout after the plan was written and both dismiss the sign-in banner — the orchestrator's
  ruling was "every spec that dismisses the sign-in banner," not the plan's frozen list of six.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `data-print-hide`'s rendered attribute value is `"true"`, not empty**
- **Found during:** Task 2, first e2e run of `phone-toolbar-tip.spec.ts`
- **Issue:** The DOM-contract test asserted `toHaveAttribute("data-print-hide", "")`, but React
  renders a bare boolean JSX attribute as the literal string `"true"` (matching what
  `SignInBanner`'s own `data-print-hide` renders as) — the assertion failed on both phone
  projects.
- **Fix:** Changed the expected value to `"true"` with a comment explaining why.
- **Files modified:** `e2e/phone-toolbar-tip.spec.ts`
- **Verification:** Re-ran the spec; all 5 non-skipped cases passed.
- **Committed in:** `ae9d40d` (part of the task 2 commit; this file had no prior commit)

**2. [Rule 1 - Bug] `getByRole` cannot find a `display:none` button**
- **Found during:** Task 2, first e2e run of `phone-toolbar-tip.spec.ts`
- **Issue:** The permanent-dismissal test used
  `tip.getByRole("button", { name: "Got it" }).dispatchEvent("click")`, which timed out on both
  phone projects — a `display: none` element (which the Got it button is, in every Playwright
  project per the plan's own probe) is excluded from the accessibility tree entirely, so
  `getByRole` never resolves it, even though `dispatchEvent` itself does not require visibility.
- **Fix:** Switched to a plain CSS locator (`tip.locator("button", { hasText: "Got it" })`), which
  resolves the button by its position in the DOM regardless of computed display, then dispatches
  the click as before. Added a comment recording why `getByRole` cannot be used here.
- **Files modified:** `e2e/phone-toolbar-tip.spec.ts`
- **Verification:** Re-ran the spec; the dismissal case passed on both `iphone` and `android`.
- **Committed in:** `ae9d40d` (part of the task 2 commit; this file had no prior commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1, both isolated to the new e2e spec file, both
caught by actually running the suite before committing).
**Impact on plan:** No scope creep — both fixes are corrections to the new test file's own
assertions, discovered by running it, not changes to the shipped feature.

## Issues Encountered

`npx tsc --noEmit` initially failed with `Cannot find name 'LayoutProps'` in two files — a known
fresh-worktree gap where Next.js's generated route types haven't been written yet. Resolved by
running `npx next typegen` once, per the orchestrator's own guidance; not a deviation, since it
generates no source change and the plan's own execution constraints already listed `npx tsc
--noEmit` as the required check rather than `npm run build`.

## Human verification deferred

The plan's own probe (reconfirmed in this run) established that Playwright's WebKit does not
implement `-webkit-touch-callout`, so no browser test here — the emulator or the source-contract
test — can prove the tip actually **paints** on a real iPhone: that it appears under the top bar,
wraps its sentence correctly, sits above the drawing without stealing height, and that its Got it
button is genuinely 44px under a real finger. A person should open a design screen on a real
iPhone or iPad in Safari and confirm:

1. The tip appears the first time a design screen is opened, reading exactly "For more drawing
   room, tap the page menu in Safari's address bar and choose Hide Toolbar."
2. Tapping Got it makes it disappear immediately, and it does not return after navigating to
   another design screen, reloading, or closing and reopening Safari.
3. The tip never appears on an Android phone or on a desktop browser at any width.
4. Printing a full-sized rail template or the order form from the same iPhone shows no browser
   advice at the top of the page.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The founder's toolbar-hiding request is fully addressed on the one platform where an answer
exists (iOS Safari), with the fallback the founder themselves suggested. No blockers. The
real-iPhone check above is the only remaining verification step, and it is a one-time manual
confirmation rather than a blocker to further work.

---
*Phase: quick-260909-hny*
*Completed: 2026-09-09*
