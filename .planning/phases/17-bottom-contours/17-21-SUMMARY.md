---
phase: 17-bottom-contours
plan: 21
subsystem: rails-drawing, bottom-data
status: complete
tags: [bottom, channels, rails, data, gap-closure, G-17-6]
requires:
  - 17-18 (channels cut straight up on RAILS where a vee or belly lifts the rail; sectionsFoamOff)
  - 17-20 (the litres cut channels straight up; the litres must not move here)
  - the founder's two answers at his look at 17-18, 2026-11-11 ("Show channels too", "Match RAILS")
provides:
  - railBandsOnTheBottom gives a flat bottom with the channels cut into it to a section no vee or belly lifts
  - the store reads railBandsOnTheBottom on every board
  - bottomDataRows' Rail lift is sectionsFoamOff at the rail (the vee or belly alone)
affects:
  - RAILS' VIEWER plots, View Full Sized and the order form's Rail Band Reference (flat-tail channels now drawn)
  - BOTTOM's DATA and the printed BOTTOM CONTOURS page's depths table (Rail lift)
tech-stack:
  added: []
  patterns:
    - "A section with no lift but a channel in reach carries `bottom: { lift: 0, across: flat, channelCut }` — every map in rail-bottom.ts is then the identity and only the channels are cut in"
key-files:
  created:
    - .planning/phases/17-bottom-contours/pictures/17-21-rails-flat-tail-channels.png
    - .planning/phases/17-bottom-contours/pictures/17-21-data-rail-lift.png
    - .planning/phases/17-bottom-contours/pictures/17-21-pictures-source.tar.gz
  modified:
    - lib/geometry/design.ts
    - lib/geometry/design.test.ts
    - components/design/design-store.tsx
    - e2e/rails-channels.spec.ts
    - lib/geometry/rail-bands.ts
    - lib/geometry/rail-bottom.ts
    - lib/geometry/rail-bottom.test.ts
    - components/rails/rail-section-plot.tsx
    - lib/geometry/bottom.ts
    - lib/geometry/bottom.test.ts
    - e2e/bottom-viewer.spec.ts
decisions:
  - "An unlifted section's planed bottom is drawn flat even under a concave (D-41 kept): only the channels are cut into it"
  - "A section with no lift whose channels cut nothing within its reach comes back as the same object, so the store still hands back `railBands` itself on such a board"
  - "RAILS' browser test finds the readout card by a caption starting `From ROCKER`, because a lifted board's card reads `From ROCKER, FOIL & BOTTOM`; the new flat-tail test also checks the exact `From ROCKER & FOIL` caption"
metrics:
  duration: about 50 minutes
  completed: 2026-11-11
actuals:
  tokens: 7600
  tasks: 3
  commits: 4
---

# Phase 17 Plan 21: Channels on a flat tail on RAILS, and DATA's Rail lift matching RAILS — Summary

**RAILS now draws the channels on a board with no vee or belly, cut last, with each wall straight up on both lines. The rail it bands, its thickness and its marks stay as they are. BOTTOM's DATA Rail lift now counts the vee or belly only, the same figure RAILS uses. No litres figure moved.**

## What changed on the screen

### RAILS: "Show channels too"

- **Before:** on a board with channels but a flat tail (no vee, no belly), RAILS' tail section showed a plain flat bottom with no channels.
- **After:** the tail section shows the flat planed bottom with every channel cut into it. Each wall stands straight up at its own place, on the thin bottom line and on the thick Finished Rail line, the same way 17-18 draws the channels on a vee board.
  - On the Longboard's rolled rail, a channel cuts up into the rail's curve only where its floor stands higher than the rail.
  - No channel is ever drawn above the deck.
- **The rail itself does not move.** RAILS' rail thickness, its readout card (`From ROCKER & FOIL`, with no mention of BOTTOM), every band line and every mark dot are exactly what they are with the channels set to None. A channel is cut after the rail is shaped.
- **The same drawing shows on View Full Sized and on the order form's Rail Band Reference**, as a vee board's channels already did.
- **A concave is still not drawn on RAILS.** On a tail concave with channels, the channels are cut into a flat bottom and the concave itself is not drawn. That is the third question below.
- **Unchanged:** a board without channels whose bottom lifts no rail (a flat bottom, or a concave alone), and every section a vee or belly lifts. These match the capture taken before the first edit byte for byte.

### DATA: "Match RAILS"

- **Before:** DATA's Rail lift column counted a channel that runs out through the rail at the tail. On the Fish with a flat tail and eight channels the tail row read 5/16".
- **After:** Rail lift is the vee's or belly's lift at the rail only, the figure RAILS thins the rail by. A flat tail reads the dash. On a vee board, every row now reads RAILS' own figure, the same as with no channels.
- **The printed BOTTOM CONTOURS page's depths table follows**, because it reads DATA's own rows.
- **Unchanged:** Deepest cut (still the deepest gap under a straightedge, channels included), Stringer left, Width, the reference rows, the floor flag, the Foam off line and the litres line.

Tail row Rail lift, before and after, from the app's own figures (`bottomDataRows`, in inches; the same for Hard Edge and soft tails):

| Board, flat tail | 4 channels | 6 channels | 8 channels |
|---|---|---|---|
| Shortboard | 0.250" → dash | 0.045" → dash | 0.187" → dash |
| Fish | 0.313" → dash | 0.268" → dash | 0.313" → dash |
| Longboard | 0.219" → dash | 0.134" → dash | 0.125" → dash |
| Mid-length | 0 (dash) → dash | 0 → dash | 0 → dash |

Before, DATA rounded these to the tape: 1/4", `<1/16"`, 3/16", 5/16", 1/4", 5/16", 1/4", 1/8", 1/8". No other row of these boards changed. Across the 185 captured boards, Rail lift changed on 79 rows, one row on each of 79 boards, and every one of those boards carries channels.

## Founder's look: Pending

- `.planning/phases/17-bottom-contours/pictures/17-21-rails-flat-tail-channels.png` shows RAILS' tail section, Finished Rail on, 1280 wide, Imperial, before (left) and after (right). Two boards:
  - the Shortboard with a flat tail and its starting six channels
  - the Fish with a flat tail and its starting eight

  **What he should see:** before, a plain flat bottom; after, the channels cut in, every wall straight up on both the thin and thick lines. The rail curve, the band lines and the coloured mark dots stand exactly where they were.
- `.planning/phases/17-bottom-contours/pictures/17-21-data-rail-lift.png` shows the Fish with a flat tail and its starting eight channels. Left to right: BOTTOM's DATA before, DATA after, and BOTTOM's VIEWER after with the section at the tail row. The tail row's Rail lift cell is ringed in red.

  **What he should see:** the tail row's Rail lift goes from 5/16" to the dash, and every other cell reads the same. The VIEWER is the section at the very tail of the fish, so it is only a sliver of board. Its gauge at the rail still reads `5/16" rail lift`. That is the first question below.

### Questions for the founder (not built)

1. **BOTTOM's section gauge.** On screen and on the printed BOTTOM CONTOURS page, BOTTOM's section drawing still measures the gap drawn at the rail, channel included. So at the Fish's tail it reads 5/16" "rail lift" while DATA now reads the dash. Should the gauge:
   - read the vee or belly alone,
   - keep measuring the drawn gap under other words (for example "in the channel"),
   - or stay as it is?
2. **DATA's note words.** The note says "Rail lift is that gap at the rail." A suggested sentence, his to correct: "Rail lift is the vee's or belly's lift at the rail; a channel is cut after the rail is shaped and never counts."
3. **A concave under channels on RAILS.** On a tail concave with channels, RAILS cuts the channels into the flat planed bottom and still does not draw the concave (D-41). Should RAILS draw the concave under them?

## Deviations from Plan

**1. [Rule 1 - Bug] The old Rolled Vee test's readout read**
- **Found during:** Task 1
- **Issue:** The generalised plot reader looked up RAILS' readout card by the exact caption `From ROCKER & FOIL`. On the Rolled Vee board the card reads `From ROCKER, FOIL & BOTTOM`, so the existing test failed.
- **Fix:** The reader now finds the card by a caption starting `From ROCKER`. The new flat-tail test also checks the exact `From ROCKER & FOIL` caption, both with eight channels and with None. The Rolled Vee test keeps its assertions exactly.
- **Files:** e2e/rails-channels.spec.ts. **Commit:** 74182d0c.

**2. The tracer's feedback gate ran without stopping**
- The config is not in auto mode, which would normally mean stopping after the tracer for a human check. The orchestrator's brief asked for the whole plan with the founder's look collected afterwards, as for 17-18. So the tracer's own checks were re-run end to end instead: the unit suites, `rails-channels` and `rails-advanced` (27 passed, 1 skipped). Work then continued.

## Verification

| Check | Result |
|---|---|
| 17-20 on the base | 17-20-SUMMARY.md present, `sectionsOffAt` in volume.ts, `phase17-channel-litres.test.ts` 53 passed |
| Captures (185 boards' litres and DATA rows; 136 RAILS entries) | `rails-kept.json` and `litres.json` byte-identical after every task. `data.json` byte-identical after Tasks 1 and 2. After Task 3 every field but `railLift` is identical, and every `railLift` equals `sectionsFoamOff` at the rail (recomputed; 0 mismatches) |
| `npx tsc --noEmit`, `npm run lint` | pass. Lint's one known warning is in lib/db/import-designs-action.test.ts:42, untouched |
| `npm test` after Task 1 | 12,203 passed. 2 files failed, on timeouts under load: bottom.test.ts CR-01 and one unnamed file. bottom.test.ts, finished-rail.test.ts and rack-art re-run alone: all pass |
| `npm test` before Task 2's commit | 12,233 passed. 23 failed: the 20 expected RED tests of Task 3, plus 3 timeouts (blank-fit ×2, CR-01). blank-fit alone: 86 passed |
| `npm test` after Task 3 | 12,255 passed, 1 failed (CR-01, timeout). bottom.test.ts alone: 1,202 passed |
| Task 1 browser, desktop: `rails-channels`, `rails-advanced` | 28 passed, 1 skipped |
| Task 2 browser, desktop and iPhone: `rails-channels`, `rails-advanced`, `phone-rails`, `summary-rail-instructions-fit` | 80 passed, 34 skipped (each project's other-device tests), 0 failed |
| Task 3 unit: bottom, components/bottom, components/summary, the three litres pins | 2,151 passed |
| Task 3 browser, desktop: `bottom-viewer`, `bottom-screen`, `bottom-metric`, `summary-bottom-page`, `bottom-wings` | 24 passed, 1 skipped |
| Files changed from the base | only the plan's `files_modified`. None of volume.ts, board-surface.ts, lib/export/, components/3d/, the database, STATE.md or ROADMAP.md |

No fixture JSON or extraction script carries DATA's rows, so nothing was regenerated.

## TDD Gate Compliance

Task 3 went through both gates:
- RED, commit 4136c06a: 20 tests failed. These were the 18 flat-tail boards and the two Rolled Vee boards with six channels.
- GREEN, commit 0ea8e609: 75 DATA tests pass, including the check that, on every flat-tail board, the channel at the rail is deep enough that it would have shown in DATA before.

## Threat Flags

None. No new endpoint, storage or input. The new sampling runs only on a board with channels: an empty walls list returns at once. It is 17-18's own bounded sampling (T-17-32).

## Known Stubs

None.

## Commits

| Task | Commit | What |
|---|---|---|
| 1 (tracer) | 74182d0c | fix: RAILS shows the channels on a flat tail too, and the rail it bands stays the same |
| 2 | 45aa9e99 | test: the geometry holds the channels on a flat tail, and the before-and-after picture |
| 3 (RED) | 4136c06a | test: DATA's Rail lift should count the vee or belly alone, as RAILS does |
| 3 (GREEN) | 0ea8e609 | fix: DATA's Rail lift counts the vee or belly alone, as RAILS does |

## Self-Check: PASSED

- Both pictures, the source archive and every modified file exist
- 74182d0c, 45aa9e99, 4136c06a and 0ea8e609 are on the branch
