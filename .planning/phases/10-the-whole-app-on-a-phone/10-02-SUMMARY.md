---
phase: 10-the-whole-app-on-a-phone
plan: 02
subsystem: auth
tags: [clerk, tailwind, playwright, vitest, touch-sizing]

requires:
  - phase: 09-the-design-screens-on-a-phone
    provides: the coarse pointer variant, the phone menu shell, and the "enlarge the row, not the glyph" touch-sizing idiom this plan reuses

provides:
  - The nav menu's signed-out "Sign in" row grows to 44px tall under a touch pointer (D-06), keeping its 14px text and its 20px desktop height
  - Clerk's signed-in avatar gets an 8px coarse-gated pad on its real trigger element via appearance.elements.userButtonTrigger, never a wrapper (D-05)
  - The loading placeholder matches the same 44px coarse footprint so the nav never jumps height when Clerk settles
  - The sign-in banner's dismiss X grows from 16x16 to 44x44 on touch while the banner itself stays pinned at 36px tall (PHON-07), via overflow margins rather than stretching the row
  - A source-and-compiled-stylesheet Vitest contract (nav-auth-control.test.ts) proving all of the above, since Playwright cannot render any of these three controls signed out under this suite's fake Clerk keys

affects: [10-04-end-of-phase-sweep]

actuals:
  tokens: 5140
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Source-and-compiled-stylesheet Vitest contract (readStripped + tagAround regex slicing, plus @tailwindcss/node compile()) as the proof for a control Playwright cannot render — extended here from components/rails/view-full-sized-dialog.test.ts/.css.test.ts to cover THREE controls in one file, all gated behind the same useUser().isLoaded-never-settles limitation"

key-files:
  created:
    - components/auth/nav-auth-control.test.ts
    - e2e/phone-account.spec.ts
  modified:
    - components/auth/nav-auth-control.tsx
    - components/auth/sign-in-banner.tsx

key-decisions:
  - "Playwright cannot reach the Sign-in row, the Clerk avatar, OR the sign-in banner in this suite (not just the avatar, as the plan assumed) — useUser().isLoaded never settles true under the suite's deliberately fake Clerk keys, confirmed by polling for 20+ seconds. e2e/phone-account.spec.ts was narrowed to the one state that IS reachable (the loading placeholder); nav-auth-control.test.ts was widened to carry the compiled-stylesheet proof for all three controls instead."
  - "npm ci was run in this worktree (no node_modules existed at all, and a symlink to the main checkout's node_modules made Turbopack panic with 'Symlink points out of the filesystem root') — a routine environment bootstrap from the already-committed package-lock.json, not a new-package install, so it does not trigger the package-legitimacy gate."

patterns-established:
  - "When a plan's e2e proof turns out to be unreachable in Playwright for a reason bigger than the plan anticipated, narrow the e2e file to what's genuinely observable and widen the plan's own Vitest contract file to cover the rest — don't invent a new file outside the plan's declared scope."

requirements-completed: [PHON-07]

coverage:
  - id: D1
    description: "The nav menu's signed-out Sign in row is 44px tall on a touch pointer (D-06), 20px unchanged on desktop, with 14px text everywhere"
    requirement: PHON-07
    verification:
      - kind: unit
        ref: "components/auth/nav-auth-control.test.ts#D-06: the signed-out Sign in button carries all three coarse row-growth tokens and keeps text-sm"
        status: pass
      - kind: unit
        ref: "components/auth/nav-auth-control.test.ts#D-05/D-06: the avatar padding, placeholder square and Sign-in row-growth candidates all emit a pointer:coarse rule with a real declaration"
        status: pass
    human_judgment: true
    rationale: "Playwright cannot render this control signed out in this suite (useUser().isLoaded never settles under the fake Clerk keys) — the compiled-CSS contract proves the rule compiles to a real 44px rule, but the real pixel measurement on a phone is the founder's own pass, deferred to the end-of-phase sweep."
  - id: D2
    description: "Clerk's signed-in avatar gets a coarse-gated 8px pad on its real trigger element (D-05), no wrapper, appearance-only"
    requirement: PHON-07
    verification:
      - kind: unit
        ref: "components/auth/nav-auth-control.test.ts#D-05: the signed-in branch returns Clerk's button directly, with no wrapper, carrying the coarse padding class"
        status: pass
    human_judgment: true
    rationale: "No real Clerk instance is reachable from this suite's fake keys, so the avatar never renders in Playwright at all. The founder's own real-device re-measurement of .cl-userButtonTrigger after this change is required (D-05's own instruction) and is deferred to the end-of-phase sweep."
  - id: D3
    description: "The loading placeholder claims the same 44px footprint as the grown row/avatar under a coarse pointer, so the nav never jumps"
    requirement: PHON-07
    verification:
      - kind: e2e
        ref: "e2e/phone-account.spec.ts#account control — loading placeholder (the one state Playwright can reach) > phone: the phone menu's placeholder is at least 44x44 under a coarse pointer"
        status: pass
      - kind: e2e
        ref: "e2e/phone-account.spec.ts#account control — loading placeholder (the one state Playwright can reach) > desktop: the nav's own placeholder measures exactly 28x28, unchanged for a mouse"
        status: pass
    human_judgment: false
  - id: D4
    description: "The sign-in banner's dismiss X grows to 44x44 on touch (32x32 on desktop) while the banner itself stays pinned at 36px tall on all three projects"
    requirement: PHON-07
    verification:
      - kind: unit
        ref: "components/auth/nav-auth-control.test.ts#the dismiss button is a fixed square that grows under a coarse pointer, overflowing the row instead of stretching it"
        status: pass
      - kind: unit
        ref: "components/auth/nav-auth-control.test.ts#PHON-07: the banner's coarse square and overflow-margin candidates all emit a pointer:coarse rule with a real declaration"
        status: pass
    human_judgment: true
    rationale: "SignInBanner is gated behind the same isLoaded check and never renders in this suite (confirmed empirically by navigating to a /design/* route with no dismissal and polling for its copy for 20+ seconds). Real pixel measurement of the dismiss square and the banner's own 36px height is the founder's own pass, deferred to the end-of-phase sweep."

duration: 40min
completed: 2026-09-11
status: complete
---

# Phase 10 Plan 02: Touch-Sizing the Account Controls Summary

**Three account-control touch-target fixes (D-05, D-06, PHON-07) plus a source-and-compiled-stylesheet Vitest contract covering all three, after discovering Playwright cannot render any of them signed out under this suite's fake Clerk keys.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-09-11T02:36:00Z (approx.)
- **Completed:** 2026-09-11T03:14:09Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- The nav menu's "Sign in" row grows from a bare 20px sliver to a 44px-tall touch target under a coarse pointer, keeping its 14px text and its unchanged 20px desktop height (D-06)
- Clerk's signed-in avatar (measured 28x28 with zero padding in the founder's own session) gets an 8px pad per side via `appearance.elements.userButtonTrigger`, growing the real interactive element rather than wrapping it in a decorative box (D-05)
- The loading placeholder now matches the same 44px footprint as the row and the avatar under touch, so the nav never changes height the instant Clerk settles
- The sign-in banner's dismiss X — flagged by Phase 9's own UI-SPEC and never fixed — grows from 16x16 to 44x44 on touch (32x32 on desktop), using overflow margins so the banner itself never grows past its measured 36px height
- A new Vitest contract (`nav-auth-control.test.ts`) pins all of the above twice: once against the component's own source, once by compiling the real classes through `app/globals.css` and asserting on the emitted CSS — because Playwright cannot render any of these three states signed out in this test harness

## Task Commits

Each task was committed atomically:

1. **Task 1: "Sign in" in the phone menu becomes a row a thumb can hit** — `d992e74` (feat)
2. **Task 2: The avatar gets a tap target, and the control stops jumping when Clerk finally loads** — `fcb8832` (feat)
3. **Task 3: The banner's dismiss X becomes a real target without making the banner any taller** — `73e90dd` (feat)

**Plan metadata:** (this commit, made after this SUMMARY)

## Files Created/Modified

- `components/auth/nav-auth-control.tsx` — the Sign in row's coarse tokens (D-06), the loading placeholder's `coarse:size-11`, and Clerk's `appearance` prop (D-05)
- `components/auth/sign-in-banner.tsx` — the dismiss button's fixed-square idiom plus the overflow margins that hold the banner at 36px
- `components/auth/nav-auth-control.test.ts` (new) — source-and-compiled-stylesheet contract for all three touch-sizing fixes across both files
- `e2e/phone-account.spec.ts` (new) — Playwright proof for the one state actually reachable in this suite: the loading placeholder, on phone vs. desktop

## Decisions Made

- **Playwright cannot reach the Sign-in row, the avatar, or the banner in this suite — not just the avatar, as the plan assumed.** `useUser().isLoaded` never settles `true` under this suite's deliberately fake Clerk keys (confirmed by polling the account slot's DOM, and separately the banner's own copy, for over 20 seconds each — well past this suite's assertion timeouts). `e2e/phone-layout.spec.ts` already documented this exact finding for the avatar; this plan found it also gates the Sign-in row and the banner, since both are built on the same `useUser()` hook. Adapted per the orchestrator's own pre-authorized rule ("if a measurement is impossible in Playwright, prove it with the compiled-stylesheet contract instead"): `e2e/phone-account.spec.ts` was narrowed to the loading placeholder (the one state that renders unconditionally), and `components/auth/nav-auth-control.test.ts` was widened beyond its originally-scoped Task 2 content to carry the full proof for all three fixes, using the exact source-contract + compiled-CSS pattern `components/rails/view-full-sized-dialog.test.ts`/`.css.test.ts` already established — the plan itself named this as the pattern to follow.
- **`npm ci` was run in this worktree.** It had no `node_modules` directory at all. A symlink to the main checkout's `node_modules` made Turbopack panic ("Symlink [project]/node_modules is invalid, it points out of the filesystem root"), so a real install was needed. This materializes the already-committed `package-lock.json` — a routine environment bootstrap, not a new-package install, so it does not trigger the package-legitimacy checkpoint (CLAUDE.md's `npm run build` worktree caveat turned out to also apply to `npm run dev`/Playwright's own dev server without a real `node_modules`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree had no `node_modules`; symlinking to the main checkout made Turbopack refuse to start**
- **Found during:** Task 1, first Playwright run
- **Issue:** `PW_PORT=3121 npx playwright test ...` timed out waiting on `config.webServer` — the dev server couldn't resolve the `next` package (`node_modules` didn't exist in this worktree at all). A symlink to the main checkout's `node_modules` resolved `next` for `tsc`/`eslint`, but Turbopack's own dev server refused it outright: "Symlink [project]/node_modules is invalid, it points out of the filesystem root."
- **Fix:** Ran `npm ci --prefer-offline --no-audit --no-fund` to materialize a real, local `node_modules` from the already-committed `package-lock.json`.
- **Files modified:** none tracked (`node_modules/` is gitignored)
- **Verification:** `npm run dev`/Playwright's own webServer started and served 200s afterward; the rest of this plan's verification ran clean.
- **Committed in:** not applicable (untracked)

**2. [Rule 1 - Bug in the plan's own assumption] `useUser().isLoaded` never settles true under this suite's fake Clerk keys — for all three controls, not just the avatar**
- **Found during:** Task 1, while debugging why the Sign-in row's `boundingBox()` assertion timed out with "element(s) not found"
- **Issue:** The plan's Task 1/Task 3 `<verify>` blocks assumed Playwright could measure the Sign-in row and the sign-in banner directly. Empirically (polling the DOM for 20+ seconds on both), neither ever renders in this suite: `NavAuthControl` stays on its `!isLoaded` placeholder branch permanently, and `SignInBanner`'s own `if (!isLoaded) return null;` means it never appears on a `/design/*` route either, even without dismissing it.
- **Fix:** Narrowed `e2e/phone-account.spec.ts` to the loading placeholder (the one reachable state) and widened `components/auth/nav-auth-control.test.ts` to carry the full source-and-compiled-stylesheet proof for the Sign-in row's tokens, Clerk's `appearance` prop, and the banner's dismiss-square classes/margins — the exact pattern the plan itself named (`view-full-sized-dialog.test.ts`/`.css.test.ts`) for the one control it already knew was unreachable (the avatar), now applied to all three.
- **Files modified:** `e2e/phone-account.spec.ts`, `components/auth/nav-auth-control.test.ts`
- **Verification:** All 8 Vitest cases in `nav-auth-control.test.ts` pass; both reachable Playwright cases in `e2e/phone-account.spec.ts` pass on iphone/android/desktop; the full regression sweep (`desktop-baseline.spec.ts`, `phone-layout.spec.ts`, `phone-screens.spec.ts`) passes with zero failures.
- **Committed in:** `fcb8832` (Task 2) and `73e90dd` (Task 3)

---

**Total deviations:** 2 auto-fixed (1 blocking environment issue, 1 plan-assumption bug)
**Impact on plan:** Both were necessary to get any verification running at all in this worktree, and to deliver a truthful, non-hanging proof instead of a test that would time out on every run. No scope creep — the underlying code changes (D-05, D-06, PHON-07) match the plan exactly; only the *proof mechanism* moved, and only as far as the plan's own named pattern already allowed.

## Issues Encountered

- **Bash-tool heredoc quirk mangled two commit messages.** A `git commit -m "$(cat <<'EOF' ... EOF)"` heredoc containing parentheses/apostrophes was silently truncated mid-sentence by this sandbox's command handling (not real bash — real bash treats a single-quoted heredoc delimiter's body as fully literal), with stray `EOF )` text appended. Recovered the tip commit (`fcb8832`, Task 2) via `git commit --amend -F <message-file>` — safe here because it was the branch tip, created moments earlier in this same session, with zero dependents, not a hook-failure scenario. The non-tip commit (`d992e74`, Task 1) could not be safely reworded without a `git reset`/rebase, which the auto-mode classifier declined when attempted; its message carries a minor cosmetic truncation (a missing closing parenthesis and stray `EOF )` text at the very end) but its substantive content and the commit's actual file changes are unaffected. The intended full message: "Sign in in the nav menu was a bare 20px-tall button — the one control in that menu under the finger-size guideline. Its row now grows to 44px under a touch pointer (the same "enlarge the row, not the glyph" trick the app already uses for the rack card's menu rows); the word itself keeps its normal 14px size, and nothing changes for a mouse." All later commit messages in this plan used `git commit -F <file>` instead of a heredoc, which did not reproduce the issue.
- **Worktree's `.next/dev/types` didn't exist until `next dev` had run once**, causing `npx tsc --noEmit` to report two false-positive `LayoutProps` errors in `app/layout.tsx`/`app/design/layout.tsx` — neither file is touched by this plan. Warming the dev server once (serving one request, then stopping it) resolved this; re-ran `tsc --noEmit` clean afterward. Recorded so a future executor recognizes this as a worktree-warm-up artifact, not a real regression.
- **Disk was at 100% capacity mid-run** (a Turbopack cache compaction failure appeared in one Playwright run's server log, though it did not cause any test failure). Cleaned up `.next/`, `test-results/`, and `playwright-report/` after every verification pass to keep this worktree's footprint low for the two sibling parallel executors sharing the same machine.

## Human Verification Deferred to End-of-Phase UAT

- **The Clerk avatar's real hit-area growth (D-05).** Re-measure `.cl-userButtonTrigger` in the founder's actual signed-in session at www.shaperassistant.com after this change (previously 28x28 with zero padding, 2026-09-10) — confirm it now measures at least 44x44 under a touch pointer. If Clerk's own runtime-injected stylesheet outranks the `coarse:p-2` utility class, the documented fallback (already written as a comment beside the `appearance` prop) is the same class with Tailwind's important variant, `coarse:p-2!` — not a wrapper element.
- **The signed-out "Sign in" row's real device measurement (D-06).** Confirm at least 44px tall on an iPhone and an Android phone, still exactly 20px on desktop, 14px text throughout — Playwright cannot render this control signed out in this suite, so the compiled-CSS contract is the automated half of this proof and the real pixel measurement is the founder's own pass.
- **The sign-in banner's dismiss X real device measurement (PHON-07).** Confirm 44x44 on both phone profiles, 32x32 on desktop, and the banner itself still measuring 36px tall on all three — same reason as above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All three touch-sizing fixes for the account controls are in place and covered by an automated contract that will fail loudly if a future edit regresses the Clerk `appearance` prop, drops a wrapper back in, or loses a coarse token.
- The three real-device measurements above feed directly into plan 10-04's end-of-phase sweep — no further code work is expected there for this plan's surfaces, only measurement and sign-off.
- No blockers for sibling plans in this wave (10-01, 10-03): this plan touched only its own four declared files.

## Self-Check: PASSED

All four plan files and the SUMMARY itself exist on disk; all three task commits (`d992e74`, `fcb8832`, `73e90dd`) are present in `git log`.

---
*Phase: 10-the-whole-app-on-a-phone*
*Completed: 2026-09-11*
