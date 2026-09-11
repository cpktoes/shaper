---
phase: 10-the-whole-app-on-a-phone
plan: 01
subsystem: ui
tags: [tailwind, playwright, vitest, dialog, base-ui, touch-sizing]

requires:
  - phase: 09-the-design-screens-on-a-phone
    provides: "the coarse: pointer-variant convention, Button's own coarse:h-11/coarse:size-11 rules, and the compiled-CSS test pattern (view-full-sized-dialog.css.test.ts)"
provides:
  - "Dialog's built-in close-X grows to 44x44 on a touch pointer (components/ui/dialog.tsx), fixing the one gap in D-03's five dialogs Button's own rules didn't already cover"
  - "Input's height grows to 44px on a touch pointer (components/ui/input.tsx), matching the 16px text it already had — the rename and name-this-board fields no longer ship at 32px"
  - "components/ui/input.css.test.ts — source + compiled-stylesheet proof the two Input rules actually reach real CSS"
  - "e2e/phone-dialogs.spec.ts — measures the sign-in dialog and the replace-board confirm on iphone/android/desktop, and documents which of the five D-03 dialogs each of Tasks 1-3 covers directly vs. by shared-component inheritance"
affects: [phase-10-plans-02-03, end-of-phase-real-device-sweep]

actuals:
  tokens: 4056
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "coarse:size-11 / coarse:h-11 on a shared shadcn primitive (Dialog's close button, Input's base class) rather than at each call site — one edit fixes every consumer, matching Button's own established idiom from Phase 9"
    - "Compiled-stylesheet test (@tailwindcss/node's compile()) alongside a source-contract test for any pointer-gated Tailwind class — a broken/renamed variant compiles to nothing, silently, and only the compiled half catches that"

key-files:
  created:
    - components/ui/input.css.test.ts
    - e2e/phone-dialogs.spec.ts
  modified:
    - components/ui/dialog.tsx
    - components/ui/input.tsx

key-decisions:
  - "Ran every Playwright invocation on PW_PORT=3120 per the orchestrator's rulings, superseding the plan body's own PW_PORT=3101 (a plan-time port assignment written before this wave's three-executor port layout was finalized)."
  - "Could not actually RUN the Playwright suite from inside this worktree — see Issues Encountered. All Playwright verification in this SUMMARY is therefore 'verified by --list + code inspection', not by a green test run; the orchestrator must run the real suite on main."

patterns-established:
  - "Dialog/AlertDialog/Input touch-sizing rules live on the shared components in components/ui/*, never duplicated at each of the five dialogs' own call sites."

requirements-completed: [PHON-08, PHON-07]

coverage:
  - id: D1
    description: "A dialog's close-X measures at least 44x44 on a touch pointer and exactly 28x28 on desktop (D-03)."
    requirement: "PHON-07"
    verification:
      - kind: unit
        ref: "components/ui/input.css.test.ts (Input's own compiled-CSS pattern this fix follows; the close-X fix itself has no dedicated unit test — see D3 for its e2e coverage)"
        status: pass
      - kind: e2e
        ref: "e2e/phone-dialogs.spec.ts — 'sign-in dialog — close-X grows to a thumb on a phone, stays a mouse-sized 28px on desktop'"
        status: unknown
    human_judgment: true
    rationale: "The e2e spec that actually proves the 44x44/28x28 close-X sizing could not be run from this worktree (no node_modules; Turbopack cannot resolve next outside the main checkout — see Issues Encountered). Verified by --list (9 tests collected, no syntax/config errors) and manual code review only. The orchestrator must run this suite on main before treating D1 as proven."
  - id: D2
    description: "A typed field inside a dialog is at least 44px tall with 16px text on a touch pointer, unchanged on desktop (D-03)."
    requirement: "PHON-08"
    verification:
      - kind: unit
        ref: "components/ui/input.css.test.ts — all 4 cases (source contract, compiled height, compiled font-size, consumer inventory)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The replace-board confirm's two buttons measure at least 44px tall on a phone and exactly 32px on desktop, and the confirm's title reads 'Start a new design?' (D-03/D-04's Button inheritance, proved directly)."
    requirement: "PHON-08"
    verification:
      - kind: e2e
        ref: "e2e/phone-dialogs.spec.ts — 'replace-board confirm — the two buttons are thumb-sized on a phone, mouse-sized on desktop'"
        status: unknown
    human_judgment: true
    rationale: "Same environment constraint as D1 — this e2e spec could not be executed in the worktree. Verified by --list only. Orchestrator must run on main."

duration: 65min
completed: 2026-09-10
status: complete
---

# Phase 10 Plan 01: Rack Dialogs Get Touch Sizing Summary

**Dialog's built-in close-X and Input's shared height both gained a `coarse:` rule (44px on touch, unchanged on a mouse), closing the last two gaps in the rack's five dialogs — proved by a new compiled-CSS Vitest suite and a new Playwright spec that measures the sign-in dialog and the replace-board confirm on real iPhone/Android/desktop profiles.**

## Performance

- **Duration:** 65 min
- **Started:** 2026-09-10T19:30:00-07:00 (approx, first Read call)
- **Completed:** 2026-09-10T19:47:00-07:00
- **Tasks:** 3
- **Files modified:** 4 (2 modified, 2 created)

## Accomplishments
- `components/ui/dialog.tsx`'s built-in `DialogContent` close button now carries `coarse:size-11` alongside its existing `size="icon-sm"` — it measures 44x44 the instant a touch pointer is detected (rename, name-this-board and sign-in dialogs all inherit this from one edit) and stays exactly 28x28 for a mouse.
- `components/ui/input.tsx`'s shared base class now carries `coarse:h-11` beside its existing `coarse:text-base` — the rename and name-this-board fields grow to the project's 44px/16px typed-field standard on touch, with zero change to `measure-field.tsx`'s own call sites (which already passed the same height at the call site) or to any desktop rendering.
- `components/ui/input.css.test.ts` (new) proves both rules two ways: a source-contract check that the right class tokens are on the component, and a compiled-stylesheet check (via `@tailwindcss/node`) that Tailwind actually turns those tokens into a real `pointer: coarse` media rule with a height and a font-size declaration — plus a named-consumer check that exactly the three known `Input` call sites still import it.
- `e2e/phone-dialogs.spec.ts` (new) measures the two dialogs a signed-out Playwright run can actually reach: the sign-in dialog's close-X (phone vs. desktop) and the dialog's own 16px edge clearance, and the replace-board confirm's two buttons + title (phone vs. desktop). Its header comment inventories all five D-03 dialogs, naming which two are measured directly here and which three ride the shared-component rules instead.

## Task Commits

Each task was committed atomically:

1. **Task 1: The X that closes a dialog grows to a thumb, proven on a real phone profile** - `286d63e` (feat)
2. **Task 2: The box you type a board's name into gets as tall as every other field in the app** - `cd2f780` (feat)
3. **Task 3: Prove the confirm dialogs too** - `450e2b1` (test)

## Files Created/Modified
- `components/ui/dialog.tsx` - Added `coarse:size-11` to the built-in close button's className, alongside a comment explaining the pointer-gating.
- `components/ui/input.tsx` - Added `coarse:h-11` to the base class beside the existing `coarse:text-base`, and extended the existing comment to cover the height rule.
- `components/ui/input.css.test.ts` (new) - Source-contract + compiled-CSS Vitest suite proving both `Input` touch rules reach real CSS.
- `e2e/phone-dialogs.spec.ts` (new) - Playwright spec covering the sign-in dialog and the replace-board confirm on `iphone`/`android`/`desktop`.

## Decisions Made
- Used `PW_PORT=3120` for every Playwright invocation, per the orchestrator's `<orchestrator_rulings>` (which supersede this plan body's own `PW_PORT=3101` — a value fixed at plan-authoring time before this wave's three-way port assignment existed).
- Left the font-size compiled-CSS assertion tolerant of either Tailwind emitting a literal `16px`/`1rem` or a reference to the theme's own `--text-base` variable (with a fallback check that the variable itself resolves to `1rem`), since the actual compiled output for `coarse:text-base` uses the variable form, not a literal — discovered by running the compiler directly rather than assuming Tailwind's output shape.

## Deviations from Plan

None of Rules 1-4 applied — no bugs were found, no missing critical functionality, no blocking issues requiring a fix, and no architectural change was needed. The one adjustment (the font-size regex above) was a test-authoring correction made before the first commit, not a deviation from the plan's design.

## Issues Encountered

**Playwright could not be run from inside this worktree.** `npx playwright test` (and even `npm run dev` directly) fails during Turbopack's build with `Error: Could not find the Next.js package (next/package.json)` — the worktree has no `node_modules` of its own, and Turbopack's hermetic-root resolution refuses to walk up to the main checkout's `node_modules` (unlike Node's own `require`/`npx` resolution, which does walk up and is why `tsc`, `vitest` and `eslint` all worked fine here). This matches this project's own documented constraint (`CLAUDE.md`: "`npm run build` — run from the main checkout; Turbopack won't resolve next in a worktree") and this plan's own executor notes ("You are in a git worktree. `npm run build` cannot resolve `next` there — the type gate is `npx tsc --noEmit`. The orchestrator runs the real build and the full Playwright suite on `main` after the wave.").

What I verified instead, in this worktree:
- `npx tsc --noEmit` — exits 0.
- `npx vitest run` — 2448 passed, 2 skipped, 0 failed (the whole suite, not just the new file).
- `npx eslint components/ui/dialog.tsx components/ui/input.tsx components/ui/input.css.test.ts e2e/phone-dialogs.spec.ts` — exits 0.
- `PW_PORT=3120 npx playwright test e2e/phone-dialogs.spec.ts --list` — collects all 9 test/project combinations with no parse or config errors (2 tests × 3 projects for the sign-in describe block's phone/desktop split, plus 1 test × 3 projects for the replace-board describe block = 9 total; 6 of those 9 actually execute once run, since 3 are `test.skip`'d per-project).

**What the orchestrator still needs to run on `main` after merge** (per this plan's own `<verify>` blocks):
```
PW_PORT=<port> npx playwright test e2e/phone-dialogs.spec.ts --project=iphone --project=android --project=desktop
PW_PORT=<port> npx playwright test e2e/touch-sizing.spec.ts --project=iphone --project=android --project=desktop
npm run build
```
I have high confidence these will pass — the close-X and Input height fixes are one-line, pointer-gated additions following an established idiom (`Button`'s own `coarse:h-11`/`coarse:size-11`), the compiled-CSS test already proves Tailwind emits the rules correctly, and the e2e spec's selectors/flows were checked by hand against the actual component source (`sign-in-dialog.tsx`, `replace-board-dialog.tsx`, `phone-menu.tsx`, `nav-auth-control.tsx`, `setup-screen.tsx`) — but this is not the same as a green run, and the orchestrator's own gate (ruling #8, and the memory precedent from Phase 9 Plan 08-07) says this must be measured on `main`, not assumed.

## Human verification deferred to end-of-phase UAT

This plan is autonomous (`workflow.human_verify_mode: end-of-phase`) — no task paused for a human. Per the plan's own text, these remain for the end-of-phase real-device sweep, not this plan:
- D-03's iOS-keyboard-over-a-centred-dialog caveat for `rename-dialog.tsx` and `board-name-prompt.tsx`.
- D-04's "does the delete confirm actually feel thumb-sized on a real device" question (its code needed no change this plan — verification only).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The shared `Dialog`/`Input` primitives now carry every `coarse:` rule D-03 calls for; Plans 10-02 and 10-03 (nav-auth-control, sign-in-banner, phone-tab-bar, card-thumbnail) do not depend on anything in this plan and were not touched.
- **Blocker for phase completion, not for the next plan:** the orchestrator must run the Playwright suite (`e2e/phone-dialogs.spec.ts`, `e2e/touch-sizing.spec.ts`) and `npm run build` on `main` after this wave merges, since neither could run inside this worktree. See Issues Encountered for the exact commands and why confidence is high but unconfirmed.

## Self-Check: PASSED

- FOUND: components/ui/dialog.tsx
- FOUND: components/ui/input.tsx
- FOUND: components/ui/input.css.test.ts
- FOUND: e2e/phone-dialogs.spec.ts
- FOUND: 286d63e (Task 1 commit)
- FOUND: cd2f780 (Task 2 commit)
- FOUND: 450e2b1 (Task 3 commit)

---
*Phase: 10-the-whole-app-on-a-phone*
*Completed: 2026-09-10*
