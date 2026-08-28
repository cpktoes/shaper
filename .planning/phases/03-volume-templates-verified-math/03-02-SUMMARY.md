---
phase: 03-volume-templates-verified-math
plan: 02
subsystem: testing
tags: [github-actions, ci, vitest, vercel, geometry]

# Dependency graph
requires: []
provides:
  - "A GitHub Actions CI workflow (.github/workflows/ci.yml) running npm test, npm run lint and npm run build on every push and pull request, verified credential-free"
  - "Direct unit tests for deriveTemplateValues, deriveRailValues and deriveEffectiveVolume in lib/geometry/design.test.ts, closing the transitive-only coverage gap RESEARCH.md flagged"
  - "A live-recompute invariant test proving a widened widepoint width increases the litres figure through the full derivation pipeline"
  - "A disclosure assertion proving computeVolume's templateAvailable/importingTemplate fields correctly distinguish drawn-geometry volume from area-factor-estimated volume"
affects: [03-01, 03-03, 03-04, 03-05, 03-06, 03-07]

actuals:
  tokens: 1989
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "CI env-var placeholders declared inline in the workflow YAML, never as repository secrets — this workflow needs no real credential to run"

key-files:
  created:
    - .github/workflows/ci.yml
  modified:
    - lib/geometry/design.test.ts

key-decisions:
  - "node-version pinned to \"24\" (not RESEARCH.md's guessed \"22\") after `npx vercel projects ls` showed the live shaper Vercel project reports Node 24.x — Assumption A3 verified empirically, not left open"
  - "CI triggers on push for all branches (not just main) plus pull_request, per the plan's explicit instruction to watch this phase's own working branch go green before merge"
  - "Task 2 kept as a single test(...) commit rather than a test-then-feat pair: the task's own <action> forbids touching lib/geometry/ implementation, and all three derive functions already behaved correctly — every new assertion passed on first run"

requirements-completed: [VOL-01]

coverage:
  - id: D1
    description: "CI workflow (.github/workflows/ci.yml) runs npm test, npm run lint and npm run build on every push and pull request using only format-valid placeholder DATABASE_URL/Clerk env values, proven sufficient by an actual credential-free build"
    requirement: VOL-01
    verification:
      - kind: unit
        ref: "grep-based structural check: actions/setup-node@v4, npm ci, npm test, npm run lint, npm run build, cache: \"npm\", push+pull_request triggers, zero `secrets.` references, zero live-key/real-endpoint strings — all confirmed"
        status: pass
      - kind: other
        ref: "Manual credential-free build reproduction: `npm ci && npm test && npm run lint && npm run build` in a scratch clone with only the three placeholder env values set — all four commands exited 0"
        status: pass
    human_judgment: true
    rationale: "The workflow itself only runs green on GitHub once pushed — this plan's own <verification> section defers that confirmation to the phase acceptance walkthrough (plan 07), so a human must confirm the Actions run is green on GitHub before this deliverable is fully proven."
  - id: D2
    description: "deriveTemplateValues, deriveRailValues and deriveEffectiveVolume are each asserted directly against real geometry for every board preset, not only transitively through summarizeDesign"
    requirement: VOL-01
    verification:
      - kind: unit
        ref: "lib/geometry/design.test.ts#deriveTemplateValues, #deriveRailValues, #deriveEffectiveVolume"
        status: pass
    human_judgment: false
  - id: D3
    description: "Live-recompute invariant: widening a board preset's widepoint width and re-running summarizeDesign produces a strictly larger litres figure — the pure-function proof that the pipeline responds to an outline change"
    requirement: VOL-01
    verification:
      - kind: unit
        ref: "lib/geometry/design.test.ts#live-recompute invariant (VOL-01)"
        status: pass
    human_judgment: false
  - id: D4
    description: "computeVolume's templateAvailable and importingTemplate fields correctly disclose whether a litres figure came from the drawn outline or the area-factor estimate"
    requirement: VOL-01
    verification:
      - kind: unit
        ref: "lib/geometry/design.test.ts#computeVolume method disclosure (transparency prohibition)"
        status: pass
    human_judgment: false

duration: 18min
completed: 2026-08-28
status: complete
---

# Phase 03 Plan 02: Verified Math CI Summary

**GitHub Actions CI gate proven credential-free by an actual build (Node pinned to the Vercel project's real 24.x, not the guessed 22), plus direct unit tests closing the one real coverage gap in the volume derivation pipeline**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-08-28T17:54:00Z (approx.)
- **Completed:** 2026-08-28T18:01:00Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- `.github/workflows/ci.yml` created and empirically proven sufficient: cloned the current checkout into a scratch directory outside the repo, ran `npm ci`, then `npm test` / `npm run lint` / `npm run build` with only three format-valid placeholder env values set (`DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) — all four commands exited 0, verifying Assumptions A1 and A2 rather than assuming them
- Discovered the real Vercel project Node version (24.x, via `npx vercel projects ls`) and pinned the workflow's `node-version` to `"24"` instead of RESEARCH.md's unverified `"22"` guess — closing Assumption A3 as well
- Extended `lib/geometry/design.test.ts` with direct unit tests for `deriveTemplateValues`, `deriveRailValues` and `deriveEffectiveVolume` (all four toggle combinations), closing the exact gap RESEARCH.md's Validation Architecture flagged: these three functions were previously only exercised transitively through `summarizeDesign`
- Added the live-recompute invariant test: widening a preset's widepoint width and re-running `summarizeDesign` produces a strictly larger litres figure through the full `buildOutline → computeRailBands → derive*() → computeVolume` pipeline — the pure-function stand-in for "the Volume screen updates as the shaper drags the outline"
- Added the transparency-prohibition assertion: `computeVolume`'s `templateAvailable` stays `true` regardless of the import toggle (the drawn geometry is always available) while `importingTemplate` tracks the toggle — the exact pair of fields `volume-calculation-card.tsx` reads to disclose which method produced a litres figure

## Task Commits

Each task was committed atomically:

1. **Task 1: Find out what a credential-free build actually needs, then write the CI workflow** - `43a83c0` (feat)
2. **Task 2: Test the three derivations that feed the litres figure, directly** - `43eb77d` (test)

_Note: Task 2 carries `tdd="true"` in the plan, but produced a single `test(...)` commit rather than a test-then-feat pair — see TDD Gate Compliance below._

## Files Created/Modified

- `.github/workflows/ci.yml` - New CI workflow: `push` (all branches) + `pull_request` triggers, one `ubuntu-latest` job with `actions/checkout@v4`, `actions/setup-node@v4` (Node 24, npm cache), then `npm ci` / `npm test` / `npm run lint` / `npm run build`, with three placeholder env values in a job-level `env:` block
- `lib/geometry/design.test.ts` - Extended from 23 lines / 12 tests (3 `it.each` blocks × 4 presets) to 154 lines / 36 tests: added `deriveTemplateValues`, `deriveRailValues`, `deriveEffectiveVolume` (two describe blocks covering all four toggle combinations), the live-recompute invariant, and the `computeVolume` method-disclosure assertion — all `it.each(BOARD_PRESETS)`, following the file's existing idiom

## Decisions Made

- **Node version 24, not 22:** RESEARCH.md's workflow skeleton assumed Node "22" as an unverified placeholder (Assumption A3). Rather than ship that guess, ran `npx vercel projects ls` from inside the scratch clone, which reported the live `shaper` Vercel project's Node Version column as `24.x`. Pinned the workflow to `"24"` and recorded A3 as verified, not open.
- **`push:` with no branch filter:** the plan's own instruction was explicit — this phase needs to watch the workflow go green on its own working branch before anything reaches `main`, and a per-branch run costs nothing at this repo's size.
- **Single `test(...)` commit for Task 2, not test-then-feat:** the task's `<action>` explicitly forbids changing any file under `lib/geometry/` other than the test file, and instructs "report the discrepancy rather than adjusting the implementation to match the test." All three derive functions and `computeVolume`'s disclosure fields already behaved correctly — every new assertion in this task passed on the first run. This is coverage-add work on already-correct code, not new-behavior TDD, so there was no implementation half of the pair to commit.

## Deviations from Plan

None - plan executed exactly as written. Both Wave-0 open questions RESEARCH.md flagged (Open Question 1: does `next build` need env vars; Assumption A3: Node version match) were resolved empirically during Task 1, exactly as the task instructed, rather than deviated from.

## TDD Gate Compliance

Task 2 carries `tdd="true"` in its frontmatter, but this plan's `type` is `execute` (not `tdd`), so the plan-level RED/GREEN/REFACTOR gate enforcement in `references/execute-mvp-tdd.md` does not apply here. At the task level, the standard RED-must-fail expectation does not hold by design: the task's own `<action>` text explicitly forbids implementation changes ("Do not change any file under `lib/geometry/` other than this test file; if an assertion fails, report the discrepancy rather than adjusting the implementation to match the test"). All three derive functions (`deriveTemplateValues`, `deriveRailValues`, `deriveEffectiveVolume`) and `computeVolume`'s disclosure fields were already correctly implemented and exercised transitively through the existing `summarizeDesign` suite — this task's job was to prove that correctness directly, not to drive new behavior into existence. Every new assertion passed immediately on the first `npx vitest run`. Result: one `test(...)` commit (`43eb77d`), no paired `feat(...)` commit, and no gate violation — this is expected coverage-hardening work on already-correct code, not a case where GREEN was skipped or RED was bypassed.

## Issues Encountered

None. The scratch-clone build reproduction (`git clone --no-hardlinks . <scratch-dir>` from the current worktree checkout, then `npm ci` there) worked cleanly on the first attempt, so no fallback (differently-shaped placeholder connection string, or lazy `neon()` construction) was needed.

## User Setup Required

None - no external service configuration required. The CI workflow needs no repository secret or Actions configuration to run; it is picked up automatically by GitHub the next time this branch's commits reach a repository with Actions enabled.

## Next Phase Readiness

- CI gate is in place and self-verified credential-free; the actual GitHub-green confirmation is deferred to the phase acceptance walkthrough (plan 07) per this plan's own `<verification>` section — that is a human/GitHub-side check, not something this executor can perform inside a worktree.
- `lib/geometry/design.test.ts` now directly covers every function on VOL-01's derivation path; later phases building on `lib/geometry/design.ts` (e.g. a future foil-based Simpson volume method, per `volume.ts`'s recorded deviation 3) inherit direct test coverage rather than only transitive coverage.
- No blockers for the remaining Phase 03 plans (template export, order-form print refit, etc.) — this plan touched no template/PDF surface.

---
*Phase: 03-volume-templates-verified-math*
*Completed: 2026-08-28*
