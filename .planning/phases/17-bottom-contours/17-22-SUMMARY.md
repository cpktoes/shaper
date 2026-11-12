---
phase: 17-bottom-contours
plan: 22
subsystem: rails-drawing
status: complete
tags: [bottom, concave, channels, rails, gap-closure, G-17-6]
requires:
  - 17-21 (RAILS shows flat-tail channels; a section no vee or belly lifts carries a flat bottom with the channels cut in)
  - 17-18 (channels cut straight up on RAILS; sectionsFoamOff)
  - the founder's answers of 2026-11-11, "Draw the concave" (at his look at 17-21) and "Always draw it" (on this plan)
provides:
  - railBandsOnTheBottom stands every section no vee or belly lifts on the sections' own foam (sectionsFoamOff), so every concave is drawn on RAILS, channels or not
affects:
  - RAILS' VIEWER plots, View Full Sized and the order form's Rail Band Reference (every concave now drawn)
tech-stack:
  added: []
  patterns:
    - "A section with no lift carries `bottom: { lift: 0, across: the concave's own foam, channelCut? }` wherever that foam is not 0 within its reach or channels are cut into it; otherwise it is the bands' own object"
key-files:
  created:
    - .planning/phases/17-bottom-contours/pictures/17-22-rails-concave-alone.png
    - .planning/phases/17-bottom-contours/pictures/17-22-rails-concave-channels.png
    - .planning/phases/17-bottom-contours/pictures/17-22-pictures-source.tar.gz
  modified:
    - lib/geometry/design.ts
    - lib/geometry/rail-bottom.test.ts
    - e2e/rails-channels.spec.ts
    - lib/geometry/rail-bands.ts
    - lib/geometry/rail-bottom.ts
    - components/rails/rail-section-plot.tsx
    - components/design/design-store.tsx
decisions:
  - "D-41's 'a concave changes nothing on RAILS' is retired (the founder, 2026-11-11: \"Always draw it\"); its first half — a vee or belly lifts and thins the rail — stands as built"
  - "A board whose three cuts are all flat (or 0 deep) skips the sampling on any section with no channel walls, so a flat board samples nothing and gets the very same objects back"
  - "A centre card's concave that still runs at the tail section is drawn there, because it is the bottom that section stands on (for the founder to confirm)"
  - "A concave's faint end reaching a section by under a thousandth of an inch still gives that section its hollow: the rule reads the bottom's own number and never rounds it (for the founder to confirm)"
metrics:
  duration: about 95 minutes (a network outage stopped the run part-way)
  completed: 2026-11-11
actuals:
  tokens: 9500
  tasks: 2
  commits: 3
---

# Phase 17 Plan 22: RAILS draws every concave — Summary

**RAILS now draws every concave under the rail: a nose concave at the nose section, a single or double concave at the centre, a tail concave at the tail, with or without channels. Where there are channels, they are cut into the concave last, every wall straight up. A concave never thins the rail, so the rail RAILS bands, its readout and its DATA are exactly what they were. No litres figure moved.**

## What changed on the screen

- **Before:** on RAILS, the bottom line under every section ran flat under a concave. On a tail concave with channels, the channels were cut into that flat line and the concave was not drawn.
- **After:** the bottom line hollows up into whatever concave is cut at that section, rising toward the stringer.
  - **With channels**, the channels are cut into the concave last, each wall straight up on the thin bottom line and on the thick Finished Rail line.
  - **The rail itself does not change.** A concave runs out to nothing at the rail, so the rail is not lifted or thinned. RAILS' rail thickness, its readout card (`From ROCKER & FOIL`, never naming BOTTOM) and its DATA figures are the flat board's.
  - **A band mark inside the concave sits on its surface**, the way marks already sit on a vee. A mark outside it stays where it was. Channels never move a mark.
  - **The plot's frame never moves**, because a concave only ever lifts the bottom line, never drops it below the rail's own bottom.
- **The same drawing shows on View Full Sized and on the order form's Rail Band Reference.**
- **Unchanged:**
  - every section with no concave and no channels, which is drawn exactly as before
  - every section a vee or belly lifts
  - every flat-tail channel section from 17-21
  - all 102 flat boards from Phase 16
  - RAILS' GUIDE and the RAILS screen tile

  All of these match the capture taken before the first edit byte for byte.

### Which section shows a concave, and which marks move

These come from the app's own maths (`railBandsOnTheBottom`, `railPlotDots`, `railPointOnBottom`), in inches. "Concave" is the most the concave stands up inside that section's plot. Each preset was checked with Hard Edge on and off; the figures are the same both ways unless a row says otherwise. Every rise is the same with 0 and with 6 channels.

| Concave card | Section drawn | Shortboard | Fish | Mid-length | Longboard (rolled rail) |
|---|---|---|---|---|---|
| Teardrop Nose Concave | nose | 0.136, no mark moves | 0.112, none | 0.098, none | 0.091; Rail Tuck 2 +0.015 |
| Blended Nose Concave | nose | 0.187, none | 0.159, none | 0.142, none | 0.133; Tuck 1 +0.003, Tuck 2 +0.033 |
| Slight Single Concave Entry | centre | 0.048, none | 0.037, none | 0.032, none | 0.019; Tuck 1 +0.002, Tuck 2 +0.008 |
| Deep Single Concave | centre | 0.129, none | 0.128, none | 0.148; Bands 1 and 2 +0.001 | 0.143; Tuck 1 +0.012, Tuck 2 +0.058 |
| Deep Single Concave | tail | 0.068, none | 0.082, none | 0.052, none | 0.042; Tuck 2 +0.010 (soft tail only) |
| Shallow Single Concave | centre | 0.023, none | 0.020, none | 0.023, none | 0.017; Tuck 1 +0.001, Tuck 2 +0.007 |
| Shallow Single Concave | tail | 0.094, none | 0.093, none | 0.110, none | 0.104; Tuck 2 +0.026 (soft tail only) |
| Early Double Concave | centre | not drawn | 0.002, none | 0.003, none | 0.002; Tuck 2 +0.001 |
| Early Double Concave | tail | not drawn | 0.086, none | not drawn | 0.125; **Tuck 2 +0.116** (soft tail only) |
| Double Concave Exit | tail | 0.122, none | 0.086, none | 0.124; Bands 1 and 2 +0.001 | 0.054; Tuck 1 +0.011, Tuck 2 +0.039 (soft tail only) |
| Extending Single Concave | tail | 0.140, none | 0.100, none | 0.165; Band 2 +0.001 | 0.070; Tuck 2 +0.017 (soft tail only) |

Faint ends that also get drawn, too small to see:
- the Teardrop's at the Shortboard's centre section (under 0.001")
- the Teardrop's and the Blended's at the Fish's centre section (0.012" and 0.003")

The Mid-length's other "moves" are under 0.0005". With the Hard Edge on, the Longboard's tail marks stand outside the concave and do not move.

## Founder's look: Approved (2026-11-11)

The founder looked at both before-and-after pictures, with the Longboard's moved marks ringed, and approved ("Approved").

- `.planning/phases/17-bottom-contours/pictures/17-22-rails-concave-alone.png` shows three boards with no channels, before (left) and after (right), with the Finished Rail on, 1280 wide, in Imperial:
  - the Shortboard's Blended Nose Concave at the nose section
  - the Shortboard's Deep Single Concave at the centre section
  - the Longboard as it opens (rolled rail) with the Early Double Concave at the tail section

  **What he should see:** before, a flat bottom line under every concave; after, the line hollows up toward the stringer. On the Longboard, Rail Tuck 2 is ringed in red: it rides up 0.116" onto the concave. Every other mark, the rail curve and the band lines stand where they were.
- `.planning/phases/17-bottom-contours/pictures/17-22-rails-concave-channels.png` shows the tail section, before and after, on five boards:
  - the Shortboard with the Extending Single Concave and six channels
  - the Shortboard with the Double Concave Exit and six
  - the Fish with the Extending Single Concave and eight
  - the Fish with the Double Concave Exit and eight
  - the Longboard as it opens with the Double Concave Exit and six

  **What he should see:** before, the channels cut into a flat line; after, the same channels cut into the concave, every wall straight up on both lines and the floors riding on the hollow. On the Longboard, Rail Tuck 1 (+0.011") and Rail Tuck 2 (+0.039") are ringed. On the other four boards no mark moves.

Band marks that move on each starter board as it opens (no channels; the same with channels):

| Board as it opens | Marks that move |
|---|---|
| Shortboard | none, on every concave card |
| Fish | none, on every concave card |
| Mid-length | Bands 1 and 2 by 0.001" at most |
| Longboard (rolled rail) | Rail Tuck 1 up to +0.012", Rail Tuck 2 up to +0.116" (Early Double Concave, tail section) |

### Decided for you to confirm or overrule

1. **A centre concave still running at the tail section is drawn there.** The Longboard's Early Double Concave shows most at the tail section (0.125") and barely at the centre (0.002"). It is drawn at the tail because that is the bottom that section stands on.
2. **A concave's faint end still gives a section its hollow.** On the Shortboard, the Teardrop Nose Concave reaches the centre section by under a thousandth of an inch, so that section is drawn on it, though no eye can see it. The rule reads the bottom's own number and never rounds it (your rule of 2026-11-05: round only for display).

## Deviations from Plan

**1. [Rule 1 - Bug in the new test] The "none moves" check counted the bottom line's own end**
- **Found during:** Task 2
- **Issue:** The marks test counted every band end that rose. The bottom connector's inner end stands inside the concave, so it rises with the planed bottom. But it is the bottom line itself and carries no mark dot. So the test reported moves on the Shortboard and the Fish where no mark moves.
- **Fix:** "None moves" now counts the mark dots (`railPlotDots`) only. Every band end is still checked to rise by exactly its share of the hollow and never drop.
- **Files:** lib/geometry/rail-bottom.test.ts. **Commit:** 69e6ba31.

**2. A sixth argument for the test helper**
- `channelsSetup` gained an optional `changeCut`, so the deck test can set the Extending Single Concave to 1/2" deep. Every existing caller is unchanged.

**3. The tracer's feedback gate ran without stopping**
- The config is not in auto mode, which would normally mean stopping after the tracer for a human check. The orchestrator's brief, as for 17-21, collects the founder's look afterwards. So the tracer's checks were run end to end instead, and work continued:
  - the unit suites with the three litres pins (986 passed)
  - `rails-channels` and `rails-advanced` on desktop (30 passed, 1 skipped)

## Verification

| Check | Result |
|---|---|
| 17-21 on the base | 17-21-SUMMARY.md present; `railBandsOnTheBottom` had 17-21's lift-0 branch with a flat `liftIn`; `rail-bottom.test.ts` passed (28 tests) |
| Captures: 144 kept boards, 304 concave boards, 497 litres figures | Kept boards are a flat bottom, each vee and belly with 0 and 6 channels, and a flat bottom with 4, 6 and 8 channels. `rails-kept.json` and `litres.json` were byte-identical after both tasks. `rails-concave.json` changed only where the plan says (`concave-cmp.ts`, 0 problems). 292 sections gained a bottom: 80 nose, 176 centre, 36 tail. 108 channel sections now stand on their concave. Every `across` point is exactly `sectionsFoamOff`. The rails, every lifted section and every other field are identical, and no rail lift is ever above 0. After Task 2 the concave capture is byte-identical to Task 1's |
| `npx tsc --noEmit`, `npm run lint` | pass. Lint's one known warning is in lib/db/import-designs-action.test.ts:42, which this plan does not touch |
| `npm test` after Task 1 | 12,255 passed, 1 failed (bottom.test.ts CR-01, a timeout). CR-01 passes alone given time; it never reads the changed function |
| `npm test` before Task 2's commit | 12,280 passed, 22 failed. Every failure was a timeout, during a load spike (load average 97–166) from runs beside this one. All ten files re-run alone: 2,420 passed, and 2 timed out again (blank-fit R7 and CR-01, both on the known list). With a 60 s limit, blank-fit and bottom.test.ts passed (1,288) |
| Task 1 unit suites with the three litres pins | 986 passed |
| Task 1 browser, desktop: `rails-channels`, `rails-advanced` | 30 passed, 1 skipped |
| Task 2 unit suites with the litres pins | 1,032 passed |
| Task 2 browser, desktop and iPhone: `rails-channels`, `rails-advanced`, `phone-rails`, `summary-rail-instructions-fit`, `board-lock-screens` | 113 passed, 47 skipped (each project's other-device tests), 2 failed on timeouts (see below) |
| The two Task 2 browser timeouts | `board-lock-screens.spec.ts:824` and `rails-advanced.spec.ts:1109` |

Both browser tests timed out while opening a stock board from the home page, before RAILS draws anything. Neither one uses a concave.
- **Alone, on a cold server:** both failed again. `page.goto` waited for the first compile, which took 15–34 s per page.
- **On a warmed server, with load near 98:** both failed again. The card click did not reach TEMPLATE inside the test's own 30 s.
- **With a 180 s test limit:** both passed (2 passed, 1.3 min).

No desktop baseline changed, and `--update-snapshots` was never used.

The files changed since the base are only the plan's `files_modified`. None of these were touched: volume.ts, board-surface.ts, bottom.ts, bottom-draw.ts, components/bottom/, components/summary/, lib/export/, components/3d/, the database, STATE.md, ROADMAP.md.

## Threat Flags

None. No new endpoint, storage or input.
- The sampling now also runs on a section with no lift and no channels: every 1/8" over the section's reach, as 17-18 bounds it (T-17-36, accepted).
- A board whose cuts are all flat skips it.

## Known Stubs

None.

## Commits

| Task | Commit | What |
|---|---|---|
| 1 (tracer) | ac53802a | fix: RAILS draws every concave under the rail, and the rail itself stays the same |
| 2 | 69e6ba31 | test: the geometry holds every concave on RAILS, and the before-and-after pictures |

## Self-Check: PASSED

- Both pictures, the source archive and every modified file exist
- ac53802a and 69e6ba31 are on the branch
