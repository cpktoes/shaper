---
phase: quick-260905-pne
plan: 01
subsystem: testing
tags: [vitest, source-contract-test, units, volume, security-register]

# Dependency graph
requires:
  - phase: 06-the-design-screens-in-metric
    provides: "The Volume card's litres figure already reads the same in both systems (plan 06-07); this task adds the durable test that promise was missing."
provides:
  - "A permanent guard in lib/units-isolation.test.ts pinning the Volume card's litres figure to a plain two-decimal render with no units-system argument on any line it lives on"
  - "Closes Phase 6 security register threat 06-07 / T-06-02 (Tampering, high) with a test that runs on every commit instead of a one-shot grep"
affects: ["06-the-design-screens-in-metric", "07-metric-on-paper"]

actuals:
  tokens: 2061
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Source-contract testing: read real source through the file's existing readStripped helper, assert structural properties per-line (not file-wide) so correctly system-dependent rows aren't false-flagged"

key-files:
  created: []
  modified:
    - lib/units-isolation.test.ts

key-decisions:
  - "Negative assertions are scoped to the specific lines mentioning quotedVolumeLitres, never file-wide — the card correctly hands `system` to formatArea/formatCubicVolume/formatMark for its area, cubic and thickness rows, so a file-wide 'no system mention' assertion would be false today"
  - "The display-boundary assertion (lib/geometry/measure-display.ts never pairs Litres with UnitsSystem) is a forward guard, documented as such since it passes vacuously today (Litres is named zero times there)"

patterns-established: []

requirements-completed: [QT-260905-pne]

coverage:
  - id: D1
    description: "The Volume card's litres figure is durably pinned as a plain two-decimal number with no units-system argument, closing Phase 6 security register threat 06-07 / T-06-02"
    requirement: "SCRN-05"
    verification:
      - kind: unit
        ref: "lib/units-isolation.test.ts#the Volume card's litres figure reads the same in both systems (SCRN-05, 06-07 / T-06-02)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-05
status: complete
---

# Phase quick-260905-pne: Pin the Volume Card's Litres Rendering to Both Units Systems Summary

**Five new source-contract assertions in `lib/units-isolation.test.ts` durably pin the Volume card's litres figure to a plain two-decimal render that never branches on the shaper's chosen units system — closing Phase 6 security register threat 06-07 / T-06-02, which plan 06-07 had previously "proven" only with one-shot greps that ran once and left nothing behind.**

## Performance

- **Duration:** 12 min
- **Tasks:** 1
- **Files modified:** 1 (`lib/units-isolation.test.ts`)

## Accomplishments

- Added a new `describe` block, "the Volume card's litres figure reads the same in both systems (SCRN-05, 06-07 / T-06-02)", to the end of `lib/units-isolation.test.ts`, holding five `it()` blocks:
  1. The litres figure renders as a plain two-decimal number followed by a literal `L` (matches both the full Volume card and the Summary's compact card).
  2. No line mentioning `quotedVolumeLitres` takes the chosen units system or calls a `formatXxx` display formatter — evaluated per line, not file-wide, so the card's correctly system-dependent area/cubic/thickness rows are untouched.
  3. The litres figure is the only hand-rolled `.toFixed(` number on the card.
  4. `components/volume/volume-estimator.tsx` hands the litres figure to the card untouched — no system mention, no formatter call, on the lines that carry it.
  5. `lib/geometry/measure-display.ts` offers no signature naming both `Litres` and `UnitsSystem` on the same line — a forward guard, documented in the code as vacuous today (that file names `Litres` zero times) and deliberately still permitting a future no-system litres formatter.
- Ran the mutation proof required by the plan: appended `{system}` to one of the two litres render lines in `components/volume/volume-calculation-card.tsx`, confirmed the second assertion above went RED naming that exact line, then restored the card with `git checkout --` and confirmed `git diff --quiet` on it exits 0. The card shipped byte-identical to before the proof.
- The threat named in the doc comment is now findable by search: `grep -c '06-07 / T-06-02' lib/units-isolation.test.ts` → 2 (once in the block's own doc comment, once in the describe title). `SCRN-05` likewise appears twice.

## Mutation Proof (recorded per plan requirement)

Command: `npx vitest run lib/units-isolation.test.ts` after editing line 136 of
`components/volume/volume-calculation-card.tsx` to `{quotedVolumeLitres.toFixed(2)} L {system}`.

Failure message quoted verbatim:

```
FAIL  lib/units-isolation.test.ts > the Volume card's litres figure reads the same in both systems (SCRN-05, 06-07 / T-06-02) > no line the litres figure lives on takes the units system or a display formatter
AssertionError: this quotedVolumeLitres line mentions the units system — litres must read the same in both systems, so it may never be branched on the chosen system: "{quotedVolumeLitres.toFixed(2)} L {system}": expected '              {quotedVolumeLitres.toF…' not to match /\bsystem\b/
```

After `git checkout -- components/volume/volume-calculation-card.tsx`, `git diff --quiet components/volume/volume-calculation-card.tsx` exited 0 (clean). `git show --stat HEAD` shows exactly one changed file (`lib/units-isolation.test.ts`), 125 insertions, 0 deletions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Pin the Volume card's litres figure to take no units-system argument** - `82e23f2` (test)

_Note: this quick task has no separate metadata/docs commit — the SUMMARY.md commit below is the final commit for this worktree, per the orchestrator's instruction to commit docs here rather than defer to STATE.md updates._

## Files Created/Modified

- `lib/units-isolation.test.ts` - Appended one new `describe` block (five `it()` assertions) pinning the Volume card's litres figure as a units-system-independent plain number; no other content in the file was touched.

## Decisions Made

- Negative assertions scoped to lines containing `quotedVolumeLitres`, never to the whole file, because the card's `formatArea`/`formatCubicVolume`/`formatMark` calls for its area/cubic/thickness rows correctly DO take the chosen system — a file-wide "no system mention" assertion would be false today.
- The display-boundary assertion (`lib/geometry/measure-display.ts` never pairs `Litres` with `UnitsSystem` on one line) is documented in-code as a forward guard: it passes vacuously right now since that file names `Litres` zero times, and it deliberately still permits a future litres formatter that takes no system.

## Deviations from Plan

None - plan executed exactly as written. All five assertions match the plan's specification; the mutation proof ran and passed as designed; no production file was left modified.

## Issues Encountered

The initial `git commit -m "$(cat <<'EOF' ... EOF)"` heredoc form failed in this shell environment ("unexpected EOF while looking for matching"). Worked around by writing the commit message to a scratch file and committing with `git commit -F <file>` — same message content, no change to the commit's actual text.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 6's security register (`.planning/phases/06-the-design-screens-in-metric/06-SECURITY.md`) can now mark threat **06-07 / T-06-02** closed. The evidence: `lib/units-isolation.test.ts`, describe block `"the Volume card's litres figure reads the same in both systems (SCRN-05, 06-07 / T-06-02)"`, five passing assertions, and the mutation proof above showing the guard fails when the litres figure is branched on the units system.
- `npx vitest run lib/units-isolation.test.ts` → 19 passed, 0 failed (14 pre-existing + 5 new).
- `npm test` → 33 test files, 2012 passed | 2 skipped (2014) — unchanged file/test counts plus the 5 new tests.
- `npx tsc --noEmit` shows only the pre-existing, documented-as-environmental `LayoutProps` errors on `app/design/layout.tsx` and `app/layout.tsx` (worktree phantom errors, not caused by this change).
- `npm run lint` exits 0 (9 pre-existing warnings, unrelated to this change, 0 errors).

---
*Phase: quick-260905-pne*
*Completed: 2026-09-05*

## Self-Check: PASSED

- FOUND: commit `82e23f2` (`git log --oneline --all | grep 82e23f2`)
- FOUND: `lib/units-isolation.test.ts`
- FOUND: `.planning/quick/260905-pne-pin-the-volume-card-s-litres-rendering-t/260905-pne-SUMMARY.md`
