---
phase: 16-3d-board-and-cnc-export
plan: 02
subsystem: rails (controls), saved boards, saved-boards check
status: complete
tags: [rails, hard-edge, D-05, D-17, D-18, D-20, snapshot, report]
requires:
  - "16-01: RailBandSpec.tailHardEdgeEndsAt, hardEdgeEndsAt, HARD_EDGE_ENDS_AT_RANGE_IN, formatHardEdgeEndsAt, hardEdgeEndsAtSlider, HARD_EDGE_SWITCH, designCrossSectionInput, summarizeDesignWith"
provides:
  - "The Hard Edge Ends At row in the tail's Advanced menu on RAILS"
  - "setTailHardEdgeEndsAt (store); resetRailAdvanced('tail') deletes tailHardEdgeEndsAt in the same undo step"
  - "The store's litres built through designCrossSectionInput (D-05)"
  - "Snapshot rule 13: tailHardEdgeEndsAt optional and forgiving, version still 5"
  - "lib/models/hard-edge-report.ts: hardEdgeLitresMove, hardEdgeReportLines"
  - "scripts/check-saved-boards.ts --hard-edge-report"
affects: [16-03, 16-04, 16-05]
tech-stack:
  added: []
  patterns:
    - "A refused snapshot value leaves no key behind (a .transform strips the undefined), so a bad value reads exactly like an absent one"
    - "A locked board is seeded in a browser test as a kept saved board (modelId + ownerId + locked), the open-board copy's own trusted shape"
key-files:
  created:
    - lib/models/hard-edge-report.ts
    - lib/models/hard-edge-report.test.ts
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-02-rails-hard-edge-ends-at.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-02-pictures-source.tar.gz
  modified:
    - components/rails/rail-controls.tsx
    - components/rails/rail-band-editor.tsx
    - components/design/design-store.tsx
    - components/design/design-store.test.ts
    - lib/models/design-snapshot.ts
    - lib/models/design-snapshot.test.ts
    - e2e/rails-advanced.spec.ts
    - scripts/check-saved-boards.ts
decisions:
  - "Hard Edge Ends At sits last in the tail's Advanced menu, directly above Reset, shown only while Hard Edge is on (UI-SPEC §17)"
  - "Reset Advanced Settings on the tail deletes the stored distance (the board reads 18 inches), in the same undo step as the rest"
  - "The saved-board reader drops any Hard Edge Ends At that is not a number from 14 to 24 inches, leaving no key; version stays 5"
  - "The hard-edge report prints ids and litres only, largest move first, and never changes the check's exit code"
metrics:
  duration: "about 34 minutes"
  completed: 2026-11-04
actuals:
  tokens: 17000
  tasks: 2
  commits: 3
---

# Phase 16 Plan 02: Hard Edge Ends At on RAILS, saved with the board, and the founder's litres report Summary

RAILS now has a "Hard Edge Ends At" slider at the bottom of the tail's Advanced menu, shown while Hard Edge is on.
It runs 14" to 24" (18" by default), is saved with the board, goes back to 18" on Reset, and moves VOLUME's litres. A
new read-only `--hard-edge-report` lists, for each saved board with a hard edge, its litres before and after the fade.

## What changes for the founder

- **A new slider on RAILS.** Tick Hard Edge on the tail and open its Advanced menu. The last slider, directly above
  `↺ Reset Advanced Settings`, now reads `Hard Edge Ends At — 18"`. It sets how far from the tail the hard edge fades
  into the tucked rail: 14" to 24" in half-inch steps. In Metric it reads `45.7 cm` and moves in whole centimetres. It
  looks like the sliders above it, with no hint, note or pop-up.
- **VOLUME follows it.** Moving the slider changes the litres slightly. On the stock board, 18" reads 30.27 L and 24"
  reads 30.28 L. Nothing on screen says the litres moved, as you asked (D-18).
- **It stays put.** The board keeps the setting through a reload and a save. Untick Hard Edge and the slider goes away
  (the tuck rows come back, as before). Tick it again and the slider shows the same distance. `↺ Reset Advanced
  Settings` puts it back to 18" along with everything else it resets, and one Undo brings it all back.
- **Old boards are safe.** A board saved before this reads 18", which is what 16-01 already gave it, and nothing is
  rewritten until you save it. The database didn't change. A saved board holding a value that makes no sense (text, or
  a distance outside 14"–24") also opens at 18" and is never refused.
- **A report to run before go-live.** `scripts/check-saved-boards.ts --hard-edge-report` lists, for each saved board
  with a hard-edged tail, its id and its litres before and after the fade, largest move first. It only reads, and it
  never shows a board's name or an account. It hasn't been run on the live site; that's your command in the go-live
  plan (the one-line command is in the script's header, next to the rack report's).
- **One small thing you may notice in Metric.** 18" is 45.72 cm, which falls between two whole centimetres. So the
  first arrow-key step or drag from 45.7 cm lands on 47.0 cm, and every step after that is exactly 1 cm. Every Metric
  slider in the app works this way (the Thinning Start slider too). For the same reason the Metric track runs 36–60 cm,
  the whole centimetres inside 14"–24".

## The report on the 40 test boards (not the live site)

Run with the 40-board test set from 16-01, using each board's label as its id (scratch `report40.ts`, archived). The
figures match 16-01's table to every digit.

```
hard-edge report: 40 saved boards; 40 open; 20 with a hard-edged tail
longboard|asis|hard: 75.03 → 73.96 L (-1.0703)
longboard|pin|hard: 70.39 → 69.32 L (-1.0703)
longboard|round|hard: 70.39 → 69.32 L (-1.0703)
longboard|diamond|hard: 74.65 → 73.65 L (-1.0061)
longboard|swallow|hard: 75.52 → 74.52 L (-0.9949)
midlength|diamond|hard: 50.99 → 50.96 L (-0.0317)
midlength|swallow|hard: 51.66 → 51.63 L (-0.0314)
midlength|asis|hard: 49.41 → 49.38 L (-0.0289)
midlength|pin|hard: 49.41 → 49.38 L (-0.0289)
midlength|round|hard: 49.41 → 49.38 L (-0.0289)
shortboard|diamond|hard: 30.18 → 30.16 L (-0.0220)
shortboard|asis|hard: 29.61 → 29.59 L (-0.0219)
shortboard|pin|hard: 28.77 → 28.75 L (-0.0219)
shortboard|round|hard: 28.77 → 28.75 L (-0.0219)
shortboard|swallow|hard: 30.64 → 30.61 L (-0.0215)
fish|diamond|hard: 34.08 → 34.06 L (-0.0160)
fish|asis|hard: 34.65 → 34.64 L (-0.0156)
fish|swallow|hard: 34.65 → 34.64 L (-0.0156)
fish|pin|hard: 31.87 → 31.86 L (-0.0155)
fish|round|hard: 31.87 → 31.86 L (-0.0155)
largest move: longboard|asis|hard, -1.0703 L
```

On the live site each line starts with the saved board's row id instead of a label. A board that does not open is
counted in the first line (`…; k open, d did not open; …`) and never listed.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Tracer: the row, the store, the saved board, VOLUME following | d209bf49 | rail-controls.tsx, rail-band-editor.tsx, design-store.tsx (+ its source test), design-snapshot.ts (+test), rails-advanced.spec.ts |
| 2 | Every state of the row, Reset in one undo step, the read-only report | 3a629a1e | design-store.tsx, rails-advanced.spec.ts, hard-edge-report.ts (+test), check-saved-boards.ts, the two pictures |
| 3 | The founder tries it before this merges | — (checkpoint) | pictures/16-02-rails-hard-edge-ends-at.png, this SUMMARY |

Tracer gate: after Task 1, its browser case passed on iPhone, Android and the computer (with typecheck, lint and the
full unit suite green). Then Task 2 began.

## Verification

- `npm test`: 164 files, 6882 passed, 2 skipped. `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors. The one
  warning, in `lib/db/import-designs-action.test.ts`, was there before this plan.
- `PW_PORT=3202 IS_WEBPACK_TEST=1 npx playwright test e2e/rails-advanced.spec.ts e2e/undo-redo.spec.ts
  e2e/board-lock.spec.ts e2e/phone-rails.spec.ts`: 126 passed, 65 skipped, 1 failed. The failure was a 30-second
  page-load timeout in `board-lock.spec.ts` p1 on iPhone while the machine was busy. That file re-run alone: 10 passed,
  14 skipped (ruling 11).
- The new describe `Hard Edge Ends At (Phase 16, D-20)` has cases 1–8. All pass on every project they run on. Case 5,
  the 820-wide one-line check, runs on the computer only.
- `e2e/desktop-baseline.spec.ts --project=desktop`: 5 passed. No reference picture moved.
- `git diff --stat 5b07f43e HEAD -- drizzle lib/db/schema.ts lib/geometry .planning/STATE.md .planning/ROADMAP.md` is
  empty: no database change, nothing in `lib/geometry/`, and no tracking files.
- Acceptance greps: `Tail Rail hard edge ends at` 1, `Hard Edge Ends At — ` 1, no inch arithmetic in rail-controls.tsx,
  `setTailHardEdgeEndsAt` ×3 and `designCrossSectionInput(` ×1 in the store, `tailHardEdgeEndsAt` ×4 in the snapshot
  reader, `hard-edge-report` ×8 in the script, no name/account words in the report module, the reset deletes the field.

## Deviations from Plan

1. **[Rule 3 - Blocking] `components/design/design-store.test.ts` updated** (it isn't in `files_modified`). This test
   reads the store's source, and it checked that the litres memo spelled out `thicknessAt: sideProfile.thicknessAt`
   and `foil: sideProfile.effectiveFoil`. The plan moves that memo onto `designCrossSectionInput` (D-05), which broke
   the check. The test now confirms the memo hands `outlineGeometry, sideProfile, effectiveRails,
   state.outline.length` to that helper, and that the helper in `lib/geometry/design.ts` reads the profile's own
   thickness curve and foil. The rule it guards still holds, and nothing in `lib/geometry/` changed. Commit d209bf49.
2. **The rule-13 tests have their own `describe`** with their own `wire()` helper, not rule 12's block. Rule 12's
   `wire()` is typed without the new key.
3. **The reader leaves no key at all for a refused value.** On its own, `.catch(undefined)` would leave
   `tailHardEdgeEndsAt: undefined` on the rails. An extra `.transform` strips it, so garbage parses exactly like an
   absent field (`"tailHardEdgeEndsAt" in rails` is false), as the SPEC prohibition asks.
4. **Metric step check (case 4).** The plan said "one keyboard step moves it by 1.0 cm". In practice, from 45.72 cm the
   first step lands on the 1 cm track (47.0 cm), and each step after is 1.0 cm. The test now checks exactly that, plus
   whole-millimetre storage. This comes from `measureSlider` in `lib/geometry/`, which isn't mine to change. It's
   flagged for the founder above.
5. **The locked board (case 6)** comes from a kept saved board in the browser's storage (a trusted id, account and
   `locked: true`), not from `board-lock.spec.ts`'s practice-rack clicks. It's the same lock the editor reads, without
   a walk through the rack.
6. **TDD gate.** Task 2 is `tdd="true"`. I saw RED first (the report test failed because the module didn't exist), then
   GREEN. Both are in one commit because the orchestrator's ruling 6 asks for one commit per task. There's no separate
   `test(...)` commit.
7. **Tracer checkpoint.** Auto mode is off, but the orchestrator's rulings name Task 3 as this plan's only checkpoint.
   So the tracer gate was the automated re-run, and I didn't stop for a person after Task 1.

## Threat surface

- T-16-03 mitigated: `z.number().min(14").max(24").optional().catch(undefined)` plus the strip. Tests cover `"x"`,
  NaN, null, Infinity, 1e9, 10", 30", -18" and an object: each opens with no stored value, reads 18", and the rest
  of the board opens unchanged.
- T-16-04 mitigated: the report module never names a board's name or an account. A test feeds in two frozen saved
  boards named "Chris's Secret Fish" and checks the name never appears. The production command reuses the existing
  EXIT trap that deletes the pulled env file.
- T-16-05 mitigated: the report reuses the one existing read-only select. There's no write path, and it wasn't run
  against any database.
- No new endpoints, routes or storage.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: lib/models/hard-edge-report.ts, lib/models/hard-edge-report.test.ts,
  pictures/16-02-rails-hard-edge-ends-at.png, pictures/16-02-pictures-source.tar.gz (pictures.config.ts, shots.spec.ts,
  compose.py, report40.ts, litres-default.ts, slider.ts)
- FOUND commits: d209bf49, 3a629a1e

## Founder's look

Pending — presented by the orchestrator at the Wave 2 checkpoint.
