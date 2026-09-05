---
phase: 05-the-units-chooser
plan: 04
subsystem: geometry
tags: [units, geometry, vitest, source-contract-tests, claude-md]

requires:
  - phase: 05-the-units-chooser
    provides: "05-01's UnitsSystem type, formatCentimetres, and the units preference boundary this plan's whole-millimetre family and parser sit beside"
provides:
  - "formatWholeMm, roundToWholeMm and parseMetric in lib/geometry/units.ts — the metric side of the number rules Phases 6 and 7 call and add none of their own"
  - "lib/units-isolation.test.ts, the source-contract test that pins UNIT-05: the units preference cannot reach design state, the saved snapshot, or a stored row"
  - "CLAUDE.md's Rule 2 rewritten to describe the chosen-system rule instead of claiming the app is inches-only"
affects: [06-the-design-screens-in-metric, 07-metric-on-paper]

actuals:
  tokens: 4950
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "formatWholeMm and roundToWholeMm apply the same signed-epsilon nudge formatCentimetres and formatInchesFraction already document, so the whole-mm and cm formatters can never disagree about which way the same value rounds on a tie boundary"
    - "parseMetric follows parseImperial's return-null-never-throw contract exactly: a bare number reads as the field's own unit, an explicit cm/mm suffix overrides it, and anything unreadable (comma decimals, imperial fractions, unmatched text) returns null so a typed field can revert to its last good value"
    - "lib/units-isolation.test.ts extends the house source-contract idiom (lib/theme.test.ts, lib/auth/open-access.test.ts, lib/db/ownership.test.ts): read real source, strip comments, assert a structural property — plus one behavioral case (Object.is on a DesignSummary's own fields before/after repeated formatting) for the one property no source scan can prove"
    - "The isolation test's display-site check is existence-and-marker-gated (existsSync plus a DesignSummary-usage marker) rather than hard-coding paths that only exist after a concurrently-running sibling plan (05-03) merges — it tightens automatically the moment card-metadata-line.tsx and preset-card.tsx gain their dims lines, with no edit required here"

key-files:
  created:
    - lib/units-isolation.test.ts
  modified:
    - lib/geometry/units.ts
    - lib/geometry/units.test.ts
    - CLAUDE.md

key-decisions:
  - "The isolation test's 'every display site gets its numbers from the boundary' check scans a fixed candidate list (card-metadata-line.tsx, board-rack-card.tsx, preset-card.tsx, settings-menu.tsx) but only asserts the boundary import for whichever candidates BOTH exist AND already render a DesignSummary — board-rack-card.tsx and settings-menu.tsx qualify today; preset-card.tsx and a standalone card-metadata-line.tsx don't yet, because that work belongs to the concurrently-running 05-03 plan in its own worktree. A floor assertion (at least 2 candidates checked) stops the test from vacuously passing by finding nothing."
  - "formatWholeMm returns a bare whole-millimetre string with no unit suffix, matching formatCentimetres's convention of composing the unit once at the call site (lib/geometry/summary-line.ts), not baking it into the formatter"
  - "parseMetric's regex requires the whole trimmed string to match end-to-end (^...$), which is what makes a comma decimal, an imperial fraction, or any trailing unmatched text fail cleanly to null rather than partially parsing a prefix"

requirements-completed: [UNIT-05]

coverage:
  - id: D1
    description: "lib/geometry/units.ts exports formatWholeMm, roundToWholeMm and parseMetric — the whole-millimetre marks family, its model-side snap, and the metric parser — each following the same signed-epsilon tie-break and return-null-never-throw contracts the existing imperial formatters use"
    requirement: "UNIT-05"
    verification:
      - kind: unit
        ref: "lib/geometry/units.test.ts#formatWholeMm, #roundToWholeMm, #parseMetric"
        status: pass
    human_judgment: false
  - id: D2
    description: "formatCentimetres and formatWholeMm describe the same millimetre value consistently — never disagreeing about which way a value on a rounding boundary goes"
    requirement: "UNIT-05"
    verification:
      - kind: unit
        ref: "lib/geometry/units.test.ts#formatWholeMm > reads the same value formatCentimetres reads as 6.7, and > rounds a value exactly on the half-millimetre boundary away from zero"
        status: pass
    human_judgment: false
  - id: D3
    description: "The units preference cannot enter DesignState, the design snapshot, or any saved row, and formatting a DesignSummary never mutates it — UNIT-05 held mechanically rather than by review"
    requirement: "UNIT-05"
    verification:
      - kind: unit
        ref: "lib/units-isolation.test.ts (all 5 cases)"
        status: pass
      - kind: manual_procedural
        ref: "Once-run behavioral check: temporarily importing useUnits into components/design/design-store.tsx made the suite fail; reverting made it pass again (working tree confirmed clean via git status --short afterward)"
        status: pass
    human_judgment: false
  - id: D4
    description: "CLAUDE.md's Rule 2 no longer claims the app is inches-only, and states the chosen-system rule, the centimetre/millimetre split, and that storage stays in millimetres"
    requirement: "UNIT-05"
    verification:
      - kind: other
        ref: "grep -c 'gear menu' / 'lib/geometry/units.ts' / 'use-print-fit' / 'whole millimetres' / '## Rule 1' / '@AGENTS.md' CLAUDE.md — all returned the exact counts the plan's acceptance criteria required"
        status: pass
    human_judgment: true
    rationale: "Whether the rewritten Rule 2 actually reads as plain English a shaper (not just a developer) can follow is a judgment call about prose quality that grep cannot make — the plan's own verification step asks for it to be 'read out loud'."

duration: 20min
completed: 2026-09-04
status: complete
---

# Phase 5 Plan 4: The Metric Number Rules, the UNIT-05 Isolation Guard, and an Honest CLAUDE.md

**`lib/geometry/units.ts` gains the whole-millimetre marks formatter, its model-side snap, and a metric parser with the same null-on-unreadable contract as `parseImperial`; a new source-contract test mechanically pins that the units preference can never reach a saved board; and CLAUDE.md's Rule 2 no longer claims the app only shows inches.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-04T18:15:00Z (approx.)
- **Completed:** 2026-09-04T18:22:48Z
- **Tasks:** 3
- **Files modified:** 4 (1 new, 3 modified)

## Accomplishments

- `lib/geometry/units.ts` now carries every metric formatter, snap and parser Phases 6 and 7
  need: `formatWholeMm` reads D-02's **marks** family (rail band marks, rocker heights, the five
  foil station thicknesses) as a bare whole millimetre, `roundToWholeMm` is the matching
  model-side snap, and `parseMetric` reads a bare number as a field's own unit (cm or mm) with an
  explicit suffix able to override it. All three carry the same signed-epsilon tie-break
  discipline and return-null-never-throw contract the existing imperial functions already use,
  so `formatCentimetres` and `formatWholeMm` never disagree about which way the same value rounds
  on a boundary, and a typed field can always revert to its last good value on bad input.
- `lib/units-isolation.test.ts` is a new source-contract test — in the same idiom as
  `lib/theme.test.ts`, `lib/auth/open-access.test.ts` and `lib/db/ownership.test.ts` — that holds
  UNIT-05 mechanically rather than by care: the design store and the saved snapshot cannot see
  the units preference or provider modules at all, the two pure geometry modules
  (`units.ts`, `summary-line.ts`) stay free of React/browser/database imports, every display site
  that already shows a board's numbers gets them from the units boundary, and formatting a
  design summary in either system, repeatedly, never changes the summary's own field values.
- CLAUDE.md's Rule 2 is rewritten: it now says a shaper picks Imperial or Metric from the gear
  menu (saved on the account when signed in, remembered by the browser when signed out), explains
  the dims-vs-marks split for Metric, restates that storage never changes (still millimetres in
  the branded types), keeps the one-boundary rule and the `use-print-fit.ts` exception verbatim,
  states plainly that the preference is display-only, and names exactly where the chooser applies
  today versus what's still inches.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): failing tests for the metric formatter family and parser** — `3f3df75` (test)
2. **Task 1 (GREEN): implement the whole-millimetre formatter, snap, and metric parser** —
   `6f268b2` (feat)
3. **Task 2: pin UNIT-05 so the units preference can never touch a saved board** — `dab627b`
   (feat — new test file, no separate implementation commit needed)
4. **Task 3: rewrite CLAUDE.md Rule 2 to describe the units chooser** — `816662a` (docs)

**Plan metadata:** committed alongside this SUMMARY.

_Note: Task 1 was `tdd="true"` — RED (failing tests) → GREEN (implementation); no separate
REFACTOR commit was needed, since the GREEN implementation was clean on the first pass. Task 2
had no natural RED step of its own (there was no prior behavior to prove absent) so it landed as
a single `feat` commit that both creates the guard and proves it fails-then-passes._

## Files Created/Modified

- `lib/geometry/units.ts` — gained `formatWholeMm`, `roundToWholeMm`, and `parseMetric` beside
  the existing imperial and D-01 centimetre functions.
- `lib/geometry/units.test.ts` — three new `describe` blocks (`formatWholeMm`, `roundToWholeMm`,
  `parseMetric`) covering rounding, tie-breaking, suffix override, case/whitespace tolerance,
  null cases, and round-trip precision within half a millimetre.
- `lib/units-isolation.test.ts` (new) — the UNIT-05 source-contract guard: five test cases
  covering the design store, the design snapshot, the two pure modules' import hygiene, converted
  display sites, and the formatting-is-a-read behavioral check.
- `CLAUDE.md` — Rule 2 rewritten; Rule 1, Stack, Commands, Database, and Layout untouched, and
  the `@AGENTS.md` include at the top of the file undisturbed.

## Decisions Made

See `key-decisions` in the frontmatter. In short: the isolation test's display-site check is
gated on existence-plus-marker rather than a hard-coded expectation of files the sibling 05-03
plan (running concurrently in its own worktree) hasn't yet produced in this one, so the guard
tightens automatically once that plan's work merges rather than requiring an edit here;
`formatWholeMm` composes no unit suffix of its own, matching `formatCentimetres`'s convention;
and `parseMetric`'s anchored regex is what makes partial/ambiguous input (a comma decimal, an
imperial fraction, trailing garbage) fail to `null` cleanly rather than silently parsing a
prefix.

## Deviations from Plan

None — plan executed exactly as written. The one place a decision was needed beyond the plan's
literal text (how to write assertion 4 of Task 2 given that `card-metadata-line.tsx` doesn't
exist as a standalone file yet and `preset-card.tsx` hasn't gained its dims line in this
worktree) is documented above as a key-decision rather than a deviation, since it stays fully
within the plan's own stated intent ("a positive check that the numbers on screen came from the
one place conversions are allowed to happen") — it just implements that check in a way that is
true of this worktree's actual state rather than of a sibling worktree's uncommitted future state.

## Issues Encountered

None. `npm test` passes at 28 files / 1878 tests / 2 pre-existing skips after all three tasks.
`npx tsc --noEmit` shows only the two known phantom `LayoutProps` errors in `app/design/layout.tsx`
and `app/layout.tsx` that the project's own execution notes flag as a worktree artifact to ignore
(not caused by this plan's changes — neither file was touched). `npm run lint` exits with 0
errors (9 pre-existing warnings, all in files this plan never touched).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `lib/geometry/units.ts` now carries the complete metric number-rules surface (D-01's
  centimetre formatter from 05-01, plus this plan's whole-millimetre formatter, snap, and parser)
  — Phase 6 and Phase 7 have every conversion they need and should add none of their own.
- `lib/units-isolation.test.ts` is a permanent guard in the test suite going forward: any future
  edit that lets the units preference leak into `DesignState`, the design snapshot, or a saved
  row will fail this suite immediately, and its display-site check will automatically start
  covering `preset-card.tsx` and `card-metadata-line.tsx` once 05-03's work lands.
- CLAUDE.md's Rule 2 is now honest about what the app does today (setup screen cards convert;
  the five design screens and printed output are still inches) — no phase after this one needs
  to revisit this specific wording gap again; Phase 6 and 7 will each update the "where this
  applies today" sentence as their own screens convert.
- No blockers. Ready for 05-05/05-06 (Wave 3's folded refactors) once Wave 2's siblings (05-02,
  05-03) also land.

---
*Phase: 05-the-units-chooser*
*Completed: 2026-09-04*

## Self-Check: PASSED

- FOUND: `lib/units-isolation.test.ts`
- FOUND: `export function formatWholeMm` in `lib/geometry/units.ts`
- FOUND: `export function roundToWholeMm` in `lib/geometry/units.ts`
- FOUND: `export function parseMetric` in `lib/geometry/units.ts`
- FOUND: commit `3f3df75` (test)
- FOUND: commit `6f268b2` (feat)
- FOUND: commit `dab627b` (feat)
- FOUND: commit `816662a` (docs)
