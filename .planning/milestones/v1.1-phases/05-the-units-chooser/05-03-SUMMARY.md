---
phase: 05-the-units-chooser
plan: 03
subsystem: ui
tags: [units, geometry, react, setup-screen]

requires:
  - phase: 05-the-units-chooser
    provides: "05-01's CardMetadataLine (first written inline in board-rack-card.tsx), useUnits(), formatSummaryLine, and presetSummary"
provides:
  - "components/setup/card-metadata-line.tsx — the one shared component both rack cards and preset cards read to draw a board's four-number line"
  - "A dimensions line on every preset card (SCRN-04), sitting between the name and the descriptor, matching the rack card's line for line (D-14)"
affects: [05-05-shared-slider-row, 06-design-screens-in-metric]

actuals:
  tokens: 3200
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "One composition point per shared UI string: CardMetadataLine is now its own module rather than a component two call sites each redefine, mirroring how lib/geometry/summary-line.ts already centralizes the string itself"

key-files:
  created:
    - components/setup/card-metadata-line.tsx
  modified:
    - components/setup/board-rack-card.tsx
    - components/setup/preset-card.tsx
    - lib/geometry/summary-line.test.ts

key-decisions:
  - "CardMetadataLine's extraction was a pure move — same props, same span, same classes — verified byte-identical rather than reconstructed from memory of what the rack card looked like"
  - "presetSummary(preset) is computed once per render via useMemo keyed on preset, matching how preset-card.tsx already treats buildOutline, so no second geometry pass was added"

requirements-completed: [SCRN-04, RACK-01]

coverage:
  - id: D1
    description: "Every preset card on the setup screen now shows a dimensions line — length, width, thickness, litres — between the board name and the descriptive sentence, in the chosen units system"
    requirement: "SCRN-04"
    verification:
      - kind: unit
        ref: "lib/geometry/summary-line.test.ts#preset card dims line coverage (05-03) — every preset renders a complete, non-broken line in every system"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint:human-verify Task 3, steps 1-2 — approved"
        status: pass
    human_judgment: true
    rationale: "The line's on-screen position, sizing and grey against the descriptor is a visual judgment call only a human eye confirms; the checkpoint was run and approved."
  - id: D2
    description: "A preset card's four numbers are provably the same numbers a shaper gets after clicking it — both draw from presetSummary, the same summarizeDesign pipeline applyPreset feeds"
    requirement: "SCRN-04"
    verification:
      - kind: unit
        ref: "lib/geometry/summary-line.test.ts#presetSummary — design-store.tsx's DEFAULT_DESIGN_STATE still carries the defaults presetSummary assumes"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint:human-verify Task 3, step 3 (click Shortboard, go through to shaping, return to rack) — approved"
        status: pass
    human_judgment: true
    rationale: "The preset-card-to-rack-card number match after a real click-through is a live-interaction behavior only a browser session confirms end to end."
  - id: D3
    description: "Rack cards and preset cards draw their line from one shared component (card-metadata-line.tsx) instead of two separate definitions that could drift"
    requirement: "RACK-01"
    verification:
      - kind: unit
        ref: "lib/geometry/summary-line.test.ts#two summaries with identical dimensions produce identical lines regardless of card type"
        status: pass
    human_judgment: false
  - id: D4
    description: "The rack card's rendered line stayed exactly the same, in both systems, after the extraction — the move introduced no visible change"
    verification:
      - kind: manual_procedural
        ref: "checkpoint:human-verify Task 3, step 2 (Metric/Imperial toggle across all cards) — approved"
        status: pass
    human_judgment: true
    rationale: "Byte-identical rendering before/after a refactor is confirmed by eye against the previously-shipped 05-01 checkpoint screenshots, not by a snapshot test."

duration: 5min
completed: 2026-09-04
status: complete
---

# Phase 5 Plan 3: One Shared Card Line, and Preset Cards Gain Their Dimensions Line Summary

**Preset cards on the setup screen now show a length × width × thickness × litres line — the same numbers a shaper gets by clicking the preset — drawn through the same shared component the rack cards already use.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-09-04T22:20:00Z
- **Completed:** 2026-09-04T22:25:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 4 (1 new, 3 modified)

## Accomplishments

- A shaper looking at any of the four preset cards on the setup screen now sees a line of four
  numbers — length, width, thickness, then volume in litres — sitting right under the preset's
  name and above its description sentence. Before this plan, a preset card showed only a name, a
  picture and a sentence, with no numbers at all.
- Those numbers are guaranteed to match what happens when the shaper actually clicks the preset:
  the card reads them from the exact same calculation pipeline (`summarizeDesign`) that runs on the
  board state a click writes into the store, so the card can never show a number the shaper doesn't
  then get.
- The line on a preset card now looks identical to the line on a saved board's rack card — same
  size, same grey, same weight — because both are now drawn by one shared piece of code
  (`CardMetadataLine`, pulled out into its own file) instead of the rack card owning a private copy.
  Nobody can accidentally make the two kinds of card write a board's size two different ways.
- Nothing else about the preset cards changed: no hint or arrow was added pointing at the gear
  menu, and the picture, name, descriptive sentence and "Start Shaping" label are untouched.

## Task Commits

Tasks 1 and 2 were executed by a prior executor agent in an isolated worktree; the orchestrator
merged that worktree into `main`. This continuation confirmed the merged commits, recorded the
approved checkpoint, and closed out the plan's documentation.

1. **Task 1: One shared card line, read by both card types** — `8b50d25` (refactor)
2. **Task 2 (RED): Coverage tests for the preset card dims line** — `4ff92b1` (test)
3. **Task 2 (GREEN): Preset cards gain a dimensions line** — `fd3ebeb` (feat)
4. **Orchestrator merge of the executor worktree into `main`** — `e5d89f9` (chore, the point at
   which this plan's code landed on `main`)
5. **Task 3: Check both card types in the browser** — `checkpoint:human-verify`, resume-signal
   "approved" (no commit of its own; this is the checkpoint this SUMMARY closes out)

**Plan metadata:** committed alongside this SUMMARY.

_Note: Task 2 was a `tdd="true"` task — RED (failing coverage tests) → GREEN (the card gains the
line) — no separate REFACTOR commit was needed._

## Files Created/Modified

- `components/setup/card-metadata-line.tsx` (new) — `CardMetadataLine`, moved out of
  `board-rack-card.tsx` verbatim: same `{ summary: DesignSummary }` prop, same
  `useUnits()`/`formatSummaryLine` body, same `text-xs leading-[1.4] font-semibold
  text-surf-ink-muted` span. Its doc comment explains it is the one place a board's four numbers
  become the line a shaper reads, shared by the rack's saved and in-progress cards and, from this
  plan onward, the preset cards too.
- `components/setup/board-rack-card.tsx` — the local `CardMetadataLine` definition was deleted;
  the file now imports the shared one from `card-metadata-line.tsx`. Both call sites (the
  in-progress card and the saved card) call it exactly as before. The file's doc comment now
  points at the shared module.
- `components/setup/preset-card.tsx` — gained one `<CardMetadataLine summary={...} />` between the
  name span and the descriptor span, where `summary` is `presetSummary(preset)` computed once per
  render via `useMemo` keyed on `preset` (matching the file's existing `buildOutline` pattern). No
  wrapper element was added — the button's existing `flex flex-col gap-2` spaces the new line
  automatically.
- `lib/geometry/summary-line.test.ts` — extended with the "preset card dims line coverage (05-03)"
  describe block: every `BOARD_PRESETS` entry produces a complete, non-`NaN`, non-`undefined` line
  in both systems and ends in the litres suffix; the Shortboard's imperial line matches the
  feet-and-inches shape and its metric line contains the centimetre unit exactly once; and two
  summaries with identical dimensions produce identical lines regardless of which card type built
  them.

## Decisions Made

See `key-decisions` above. In short: the extraction was treated strictly as a move (no behavior or
markup change), and the preset card's summary is computed once per render rather than adding a
second geometry pass.

## Deviations from Plan

None — plan executed exactly as written. The prior executor's Task 1 and Task 2 commits matched
the plan's action and acceptance criteria; `npm test`, `npx tsc --noEmit` and `npm run lint` all
passed clean at each commit as reported in those commits' own messages, and re-confirmed here on
`main` (1887 tests passing, 2 pre-existing skips, 28 files).

### Process note (not a code fix)

**1. [Process] Checkpoint verified on port 3005, not 3000**
- **Found during:** Task 3 (browser checkpoint)
- **Issue:** The plan's `<how-to-verify>` says to run `npm run dev` and open
  `http://localhost:3000`, but port 3000 was already held by another project's dev server on the
  verification machine — a condition already noted and worked around in 05-01.
- **Fix:** The shaper ran the checkpoint against `http://localhost:3005` (the `shaper-dev-3005`
  launch entry added in 05-01's plan). No application code changed as a result.
- **Verification:** All six checkpoint steps in the plan's `<how-to-verify>` were carried out
  against port 3005 and approved.

---

**Total deviations:** 0 code auto-fixes; 1 process note (verification port), already covered by
05-01's launch-config addition.
**Impact on plan:** None on correctness or scope.

## Issues Encountered

None. `npx vitest run` passes at 28 files / 1887 tests / 2 pre-existing skips on `main` after the
merge. `git status --short` is clean.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- SCRN-04 is satisfied: every preset card shows its dimensions in the chosen system.
- RACK-01 is fully complete: rack cards and preset cards both read through
  `components/setup/card-metadata-line.tsx`, the single composition point D-14 required.
- Phase 5's Wave 2 is now fully closed (05-02, 05-03, 05-04 all complete); Wave 3 (05-05 shared
  slider row, 05-06 shared viewer toolbar button) is unblocked.
- No blockers.

---
*Phase: 05-the-units-chooser*
*Completed: 2026-09-04*
