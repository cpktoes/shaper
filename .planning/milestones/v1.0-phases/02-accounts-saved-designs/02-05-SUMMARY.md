---
phase: 02-accounts-saved-designs
plan: 05
subsystem: ui
tags: [react, sessionStorage, useSyncExternalStore, clerk, vitest]

# Dependency graph
requires:
  - phase: 02-accounts-saved-designs (plan 01)
    provides: Clerk sign-in, the SignInDialog, and the nav's own Sign in button/NavAuthControl
  - phase: 02-accounts-saved-designs (plan 02)
    provides: dirty/saveStatus tracking and the autosave effect on the design store
  - phase: 02-accounts-saved-designs (plan 03)
    provides: the complete board rack, already replacing the setup screen's placeholder marker
affects: [02-06]

# Actuals (#2632)
actuals:
  tokens: 4230
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "lib/models/banner-dismissal.ts follows lib/models/autosave.ts's pure-decision-function boundary: shouldShowSignInBanner is the one place the four signed-in/dismissed combinations are decided, and the two storage helpers guard every sessionStorage access behind try/catch so they're safe in a node test or a server render."
    - "SignInBanner reads its dismissal flag via useSyncExternalStore, mirroring components/theme-provider.tsx's stored-preference pattern, instead of an effect that calls setState on mount — avoids both a hydration mismatch and the react-hooks/set-state-in-effect lint error a naive mounted-flag effect hits."
    - "Dismissal persists in sessionStorage, not localStorage, so a dismissed banner returns on the shaper's next visit rather than being gone forever."

key-files:
  created:
    - lib/models/banner-dismissal.ts
    - lib/models/banner-dismissal.test.ts
    - components/auth/sign-in-banner.tsx
  modified:
    - app/design/layout.tsx
    - components/design/design-store.tsx
    - components/site-nav.tsx

key-decisions:
  - "Dismissal state is read via useSyncExternalStore rather than a mounted-flag useEffect — theme-provider.tsx's already-established pattern for the identical SSR/client-value problem, and it also sidesteps the react-hooks/set-state-in-effect lint error the effect-based approach hit on first pass."
  - "SignInBanner's own render is gated on Clerk's isLoaded flag, not just the dismissal flag — nothing paints until both the sign-in state and the dismissal are known, which is what actually stops a flash rather than the storage-read strategy alone."
  - "components/setup/setup-screen.tsx needed no sweep edit: its 'saved-boards section goes here' marker was already replaced by the real BoardRack integration in plan 02-03, before this plan ran."
  - "While already inside design-store.tsx's module doc-comment, also corrected the modelId field comment's now-inaccurate 'a future duplicate/rename flow' aside (that flow shipped in 02-04) to describe board-rack.tsx's real setModelId(null) call on deleting the open board — same class of staleness Task 2 targets, caught by inspection rather than the sweep grep."

requirements-completed: [ACCT-01, ACCT-02]

coverage:
  - id: D1
    description: "shouldShowSignInBanner covers all four signed-in/dismissed combinations; BANNER_DISMISSAL_KEY named once; readBannerDismissal never throws on missing/blocked/unexpected storage"
    requirement: "ACCT-02"
    verification:
      - kind: unit
        ref: "lib/models/banner-dismissal.test.ts (9 tests, including a storage-throws case matching lib/theme.ts's THEME_INIT_SCRIPT guard)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A signed-out shaper on a design screen sees the banner once; dismissing it holds for the visit across navigations with no flash; a signed-in shaper never sees it; the banner never blocks the screen"
    requirement: "ACCT-02"
    verification:
      - kind: unit
        ref: "grep acceptance criteria: fixed copy present, aria-label=\"Dismiss\" present, no overlay/dialog/z-index classes, no truncate, BANNER_DISMISSAL_KEY not retyped — all pass; npm test (739/739), npx tsc --noEmit, npm run lint (0 errors), npm run build all pass"
        status: pass
      - kind: manual_procedural
        ref: "curl of /, /design/outline, /design/rails all returned 200 with no server-side errors in the dev log after mounting the banner; no signed-in Clerk session or browser click-through was available in this execution environment to visually confirm the dismiss-and-navigate flow or the no-scrollbar layout"
        status: pass
    human_judgment: true
    rationale: "Confirming the banner visually appears/dismisses/doesn't reappear across a real navigation, and that each design screen still fills the viewport with no page-level scrollbar, needs a live signed-out/signed-in browser session; not available in this execution environment. All automatable checks (unit tests, tsc, lint, build, dev-server request log, every plan-specified grep) pass."
  - id: D3
    description: "No copy anywhere still tells a shaper that saving is a future phase"
    requirement: "ACCT-01"
    verification:
      - kind: unit
        ref: "grep -rnE \"Phase 2|saving arrives|no persistence\" app/ components/ lib/ returns no matches (exit 1)"
        status: pass
    human_judgment: false

duration: ~15min
completed: 2026-08-27
status: complete
---

# Phase 2 Plan 5: The Sign-In Banner and the End of Stale Promises Summary

**A one-time, dismissible sign-in banner on every design screen (never signed in, never a gate) built on a pure tested visibility rule, plus a sweep that rewrote every doc-comment still describing a version of the app that no longer exists.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-08-27
- **Tasks:** 2/2 completed (Task 1 is TDD)
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- `lib/models/banner-dismissal.ts`'s `shouldShowSignInBanner` decides all four signed-in/dismissed combinations in one pure, tested place; `readBannerDismissal`/`writeBannerDismissal` guard every `sessionStorage` access so a browser with storage blocked still shows a working (if repeating) banner rather than crashing the design screen.
- `components/auth/sign-in-banner.tsx`'s `SignInBanner` renders the fixed Copywriting Contract line ("Sign in and your boards are saved." + "Sign In" link + icon-only `X` `Dismiss`) on `bg-surf-canvas`, in document flow, never an overlay — opening the same `SignInDialog` the nav's own Sign in button opens, so there is exactly one sign-in surface in the app.
- Mounted in `app/design/layout.tsx` above `props.children`, so it appears on every `/design/*` screen and nowhere else; the wrapper div's flex-sizing chain is untouched since each editor already declares its own `flex-1`/`min-h-0`.
- Dismissal is read via `useSyncExternalStore` (mirroring `theme-provider.tsx`'s own stored-preference pattern) gated behind Clerk's `isLoaded` — nothing paints until both the sign-in state and the dismissal are known, so there is no flash of the banner appearing and disappearing on a navigation.
- The stale-copy sweep (`grep -rnE "Phase 2|saving arrives|no persistence" app/ components/ lib/`) now returns nothing: `design-store.tsx`'s module doc-comment and its `modelId` field comment, and `site-nav.tsx`'s module doc-comment, all now describe the arrangement that actually exists — a saved board on a signed-in shaper's account survives a reload and a navigation; only an anonymous or never-saved board still lives in memory alone.

## Task Commits

Each task was committed atomically:

1. **Task 1: The sign-in banner, and a visibility rule that can be tested** — `ac91b00` (test, RED) → `b689082` (feat, GREEN)
2. **Task 2: Retire every promise that saving is still to come** — `faf6ceb` (docs)

**Plan metadata:** this commit (docs: complete plan)

_Note: Task 1 is `tdd="true"` — `lib/models/banner-dismissal.test.ts` was committed first and confirmed failing (the module didn't exist), then `lib/models/banner-dismissal.ts` plus `components/auth/sign-in-banner.tsx` and the `app/design/layout.tsx` mount were added and the same suite confirmed passing, per the plan's TDD gate._

## Files Created/Modified

- `lib/models/banner-dismissal.ts` — `BANNER_DISMISSAL_KEY`, `shouldShowSignInBanner`, `readBannerDismissal`, `writeBannerDismissal`
- `lib/models/banner-dismissal.test.ts` — all four `shouldShowSignInBanner` combinations, plus storage-missing/unexpected-value/storage-throws cases for the two `sessionStorage` helpers
- `components/auth/sign-in-banner.tsx` — `SignInBanner`, gated on Clerk's `isLoaded` plus `useSyncExternalStore`-read dismissal
- `app/design/layout.tsx` — mounts `SignInBanner` above `props.children`; doc-comment updated to describe both of the file's jobs
- `components/design/design-store.tsx` — module doc-comment rewritten to describe the store's now-dual role (design state + saved-row bookkeeping); `modelId` field comment corrected to name its real caller (`board-rack.tsx`'s delete-the-open-board path) instead of a "future" flow that already shipped
- `components/site-nav.tsx` — module doc-comment rewritten to state both the anonymous-board-in-memory and signed-in-saved-board-survives-navigation cases, and to document the nav's right-hand chrome cluster

## Decisions Made

- Dismissal is read through `useSyncExternalStore` rather than a `useEffect`-plus-`setState` "mounted flag" — the first implementation attempt hit React's `react-hooks/set-state-in-effect` lint error (`Calling setState() directly within an effect`) for exactly the antipattern that rule exists to catch. Rewriting to mirror `theme-provider.tsx`'s already-established `getServerSnapshot`/`getSnapshot` split fixed the lint error and is also the correct fix for the underlying hydration-mismatch risk: the server (and the initial client hydration pass) render `false` ("not dismissed"), matching exactly, and the real value takes over immediately after. Render is additionally gated on Clerk's `isLoaded`, so nothing paints at all until both flags are known — that combination, not the storage-read strategy alone, is what prevents the banner from flashing in and back out on a navigation.
- `components/setup/setup-screen.tsx` was left untouched: the plan's read-first note describes a placeholder marker for "this phase's saved-boards section," but plan 02-03 already replaced that marker with the real `BoardRack` integration before this plan ran. Nothing stale remained to sweep there.
- While rewriting `design-store.tsx`'s module doc-comment (already an in-scope edit for Task 2), also corrected the adjacent `modelId` field comment's "kept for callers that already have a row id, e.g. a future duplicate/rename flow" aside — that flow shipped in plan 02-04, and `setModelId` is now called only by `board-rack.tsx` clearing the id on deleting the currently-open board. Same class of staleness the task exists to fix, caught by reading the file rather than by the sweep's literal-string grep.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `react-hooks/set-state-in-effect` lint error on the banner's dismissal read**
- **Found during:** Task 1, `npm run lint`, after the first draft used a `useEffect` to call `setDismissed`/`setMounted` on mount
- **Issue:** ESLint's `react-hooks/set-state-in-effect` rule flagged `setDismissed(readBannerDismissal())` inside a `useEffect` body as a cascading-render risk — the exact "sync external state into React state via an effect" antipattern the rule targets, and also the underlying reason a naive mounted-flag approach can produce a hydration-mismatch warning in the first place.
- **Fix:** Rewrote the dismissal read as a `useSyncExternalStore` call (subscribe/getSnapshot/getServerSnapshot), mirroring `components/theme-provider.tsx`'s existing pattern for the identical problem (a stored preference that must agree with the server on first paint and then take over client-side). The `mounted` state variable and its effect were removed entirely — Clerk's own `isLoaded` flag already delays the first meaningful paint enough that no separate mount-gate was needed.
- **Files modified:** `components/auth/sign-in-banner.tsx`
- **Verification:** `npm run lint` clean (0 errors), `npx tsc --noEmit` clean, `npm test` (739/739) unaffected.
- **Committed in:** `b689082` (Task 1's GREEN commit — caught before the first commit of this file, not as a follow-up)

**2. [Rule 1 - Bug] Stale `modelId` field comment corrected alongside the in-scope module doc-comment edit**
- **Found during:** Task 2, rewriting `design-store.tsx`'s module doc-comment
- **Issue:** The `modelId` field's own doc-comment named `setModelId`'s use case as "a future duplicate/rename flow" — that flow shipped in plan 02-04 and, per that plan's own summary, `setModelId` is called only by `board-rack.tsx` to clear the id when the board open in the editor is deleted. Left as written, the comment described a caller that doesn't exist and omitted the one that does.
- **Fix:** Reworded the comment to name the real call site and its purpose.
- **Files modified:** `components/design/design-store.tsx`
- **Verification:** `npx tsc --noEmit`, `npm run lint`, `npm test` all pass; `git diff --stat` confirms only comment lines changed.
- **Committed in:** `faf6ceb` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug caught by lint before the first commit, 1 doc-comment inaccuracy caught by inspection while already editing the same file for Task 2)
**Impact on plan:** No scope creep — both fixes stayed inside files this plan was already declared to modify.

## Known Stubs

None. The banner is wired to real Clerk auth state and real `sessionStorage`; nothing renders from a hardcoded or mock value.

## Threat Flags

None beyond what the plan's own `<threat_model>` already covers. The banner's dismissal flag remains client-controlled session state with no server trust placed in it, exactly as T-02-14 accepts; the negative-overlay grep (T-02-15) and the sweep grep (T-02-16) both pass as documented above.

## Issues Encountered

- **No live browser session available in this execution environment.** Every acceptance criterion checkable by `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and every plan-specified `grep` passes. The plan's manual-verification rows — watching the banner appear once per visit signed out, dismissing it and confirming it does not reappear across a `/design/outline` → `/design/rails` → back navigation with no flash, confirming it never appears signed in, and confirming each design screen still fills the viewport with no page-level scrollbar after the mount — all require a live signed-out/signed-in browser session, which this environment has no tool to drive. These are marked `human_judgment: true` in the `coverage` block above rather than claimed as verified. The dev server (left running throughout) served `/`, `/design/outline` and `/design/rails` at 200 with no server-side errors both before and after every change, and `npm run build` succeeded end to end.

## User Setup Required

None — no external service configuration required. (Clerk was already configured in 02-01.)

## Next Phase Readiness

- `lib/models/banner-dismissal.ts`'s `shouldShowSignInBanner`/`readBannerDismissal`/`writeBannerDismissal` are stable, pure, and the only place this app's session-scoped dismissal pattern is implemented — a future "dismiss this tip" affordance elsewhere in the app should follow the same shape rather than inventing a second one.
- The stale-copy sweep leaves the codebase's self-description accurate as of this phase; 02-06 (production Google OAuth) does not touch any copy this sweep covered.
- **Recommended before shipping this phase:** a live browser pass, signed out, to confirm the banner's one-time appearance, its dismiss-and-stay-dismissed behavior across a real navigation, and that no design screen gained a page-level scrollbar; and, signed in, to confirm the banner never renders at all.

---
*Phase: 02-accounts-saved-designs*
*Completed: 2026-08-27*

## Self-Check: PASSED

All 6 key files plus this SUMMARY.md found on disk; all 3 commits (`ac91b00`, `b689082`, `faf6ceb`) found in git history.
