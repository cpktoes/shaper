---
phase: 17-bottom-contours
plan: 18
subsystem: rails-drawing
status: complete
tags: [bottom, channels, rails, finished-rail, gap-closure, G-17-6]
requires:
  - 17-UAT.md test 6 (gap G-17-6) and the founder's ruling of 2026-11-10 ("channels are the last cut, made after the rail is shaped")
  - .planning/debug/finished-rail-rounds-channels.md (the diagnosis)
provides:
  - sectionsFoamOff and bottomSectionsSampler in lib/geometry/bottom.ts (the one number without the channels; the sampler is for 17-20's litres)
  - RAILS cuts the channels into its thin bottom line and its Finished Rail, straight up at every wall
  - RAILS' rail lift from the vee or belly alone
affects:
  - 17-20 (the 3D board, the CNC files and the litres can read bottomSectionsSampler)
tech-stack:
  added: []
  patterns:
    - "Channels cut last: a section's bottom carries `channelCut` (the channels in its own frame, sampled every 1/64\", two points at every wall) beside `across` (the vee or belly)"
key-files:
  created:
    - e2e/rails-channels.spec.ts
    - .planning/phases/17-bottom-contours/pictures/17-18-rails-channels.png
    - .planning/phases/17-bottom-contours/pictures/17-18-pictures-source.tar.gz
  modified:
    - lib/geometry/bottom.ts
    - lib/geometry/rail-bands.ts
    - lib/geometry/rail-bottom.ts
    - lib/geometry/design.ts
    - lib/geometry/bottom.test.ts
    - lib/geometry/rail-bottom.test.ts
    - lib/geometry/design.test.ts
decisions:
  - "RAILS draws the curve of the tuck that a channel crosses as it is drawn without channels (its guide points moved onto the vee), then cuts the channel into it, so the rail away from a channel is the same rail as before"
  - "A channel's floor is held at the section's deck when the channels' sampled cut is built, so both lines are held there"
  - "The flat-tail check moves Off Stringer to 3\" as well as Deepest At: with the starting width Deepest At alone never takes a channel through the rail at the tail anchor"
metrics:
  duration: about 3 hours (the machine shared with two other plans' test runs)
  completed: 2026-11-11
actuals:
  tokens: 26000
  tasks: 2
  commits: 4
---

# Phase 17 Plan 18: Channels on RAILS, cut straight up — Summary

**RAILS now draws each channel the way it is cut: last, after the rail is shaped. Every wall stands straight up at its own place, on both the thin bottom line and the thick Finished Rail line. RAILS' rail is thinned by the vee or belly alone, never by a channel.**

## What changed on the screen

- **The walls stand straight up.** Take a board with a Rolled Vee (or a belly) and channels. On RAILS, every channel wall in the tail's cross-section is now a straight vertical step, on the thin bottom line and on the thick Finished Rail line, and the channel's floor runs right up to the wall. Before, the thick line was 24 straight pieces about a quarter inch long, so it cut a slanted chord across each wall. The thin line also sloped over an eighth of an inch at every wall.
- **A channel under the rail's curve cuts up into the curve.** The Longboard's rolled rail is the example. Where the curve of the tuck passes over a channel, the curve is now drawn in pieces no longer than 1/64". Wherever the channel's floor stands higher than the rail, the channel takes the rail up to its floor. Where the floor stays below the rail, the rail is drawn as it was and no wall shows.
- **Nothing is drawn above the deck.** A channel's floor that would reach the deck is drawn at the deck.
- **RAILS' rail is the one the vee or belly leaves.** RAILS lowers its rail thickness by the vee's or belly's lift only. A channel that runs out through the rail no longer counts as lifting the rail.
- **Nothing else moved:**
  - Boards without channels draw exactly as before. On the four presets, hard and soft tails, each of the five vees and the two bellies, RAILS' three sections and the finished rail on every lifted section match the capture taken before the change byte for byte.
  - A flat bottom still hands RAILS the very same rails on all 102 boards.
  - The one number (`foamOff`), BOTTOM's DATA and every litres figure are unchanged. The litres' own fix belongs to 17-20.

## The walls the diagnosis measured, before and after

Every figure comes from the app's own maths. "Before" is the diagnosis's measurement; "after" is what the new tests hold, checked to a millionth of a millimetre.

| Board, wall (in from the rail) | Wall height | Thick line before | Thick line after | Thin line before | Thin line after |
|---|---|---|---|---|---|
| Fish, Rolled Vee, 8 channels at Off Stringer 3", 4.088" | 0.041" | 0.016" under the floor | on the floor, full step | 1/8" slope | straight up, 0.041" |
| same, 3.190" | 0.113" | 0.024" under | on the floor | 1/8" slope | straight up, 0.113" |
| same, 2.291" | 0.162" | 0.122" under | on the floor | 1/8" slope | straight up, 0.162" |
| same, 1.393" | 0.194" | 0.093" under | on the floor | 1/8" slope | straight up, 0.194" |
| Fish, Rolled Vee, the starting 8, 4.237" | 0.181" | 0.164" of it missed | the whole 0.181" | 1/8" slope | straight up, 0.181" |
| Longboard, Rolled Vee, 6 channels, 2.486" (under the rail's curve) | 0.136" | no wall at all | cuts 0.026" up into the curve, where its floor stands above the rail | 1/8" slope | straight up, 0.136" |

## Founder's look: Pending

- `.planning/phases/17-bottom-contours/pictures/17-18-rails-channels.png` shows RAILS' tail section with the Finished Rail on, before (left) and after (right), at 1280 wide in Imperial, on three boards:
  - **Fish, Rolled Vee, eight channels at Off Stringer 3".** This is the case nearest his screenshot. Before, the thick line chords across the walls. After, four clean vertical steps, each channel floor running up to its wall.
  - **Fish, Rolled Vee, the starting eight.** The same: every wall in the plot stands straight up, the one about 4.2" in from the rail included.
  - **Longboard, Rolled Vee, six channels.** Before, the outer walls were a notch and a slope. After, they stand straight up, and the inner wall cuts straight up into the rolled rail's curve. The rail above the channels is the same rail as before.
  - **One thing to look for:** on the Longboard, the blue band mark at 3" now sits on the vee's own bottom, a little below the drawn channel floor. The plan keeps the marks on the vee's or belly's bottom because they are laid out before the channels are cut. Before, the marks rode up and down on the channels.

### A question for the founder (not built)

- **Channels on a board with no vee or belly.** RAILS still draws no bottom under a board whose channels are cut with no vee or belly, the same as before this plan. Should RAILS show the channels there too?
- **BOTTOM's DATA "Rail lift" column.** It still reads the whole one number at the rail, so a channel that runs out through the rail shows up there. RAILS now leaves that channel out. This is unchanged, and it is his call whether DATA should match RAILS.

## Deviations from Plan

**1. [Rule 1 - Bug] The tuck's curve follows its drawn shape, not a re-mapped one**
- **Found during:** Task 2
- **Issue:** Moving every point of a curve through the vee's map separately gives a slightly different curve from today's drawing, which moves the curve's guide points. On the Longboard the gap was up to 0.65 mm, so a curve crossing a channel would have jumped away from the rest of the drawn rail.
- **Fix:** Where a channel reaches a curve, the curve is sampled exactly as it is drawn today (guide points moved), and the channel is then cut into it.
- **Files:** lib/geometry/rail-bottom.ts. **Commit:** 72a45bd4.

**2. [Rule 3 - Blocking] The flat-tail test also sets Off Stringer to 3"**
- **Found during:** Task 2
- **Issue:** The plan's recipe moves Deepest At forward until the outer channel runs out through the rail at the tail anchor. With the starting widths, no preset gets there within 40". The set is narrower than the rail at 12" from the tail, and the channels are deepest at or behind that anchor.
- **Fix:** The test sets Off Stringer to 3" and then moves Deepest At forward an inch at a time. The Shortboard gets there at +4". The test also proves that the whole one number at the rail is above 0 there, so it is not passing by accident.
- **Files:** lib/geometry/design.test.ts. **Commit:** c086ad1b.

**3. [Rule 1 - Bug] A wall's two heights are held against the deck at the wall itself**
- **Found during:** Task 2
- **Issue:** The deck hold was read a millionth of a millimetre either side of a wall, so a held wall could stand 1e-8 mm above the deck.
- **Fix:** Both values of a wall are held at the wall's own x.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit`, `npm run lint` | pass. Lint's one known warning is in lib/db/import-designs-action.test.ts:42, which this plan does not touch |
| Channel-free capture: 56 boards, 88 lifted sections | byte-identical after Task 1 and after Task 2 |
| `rail-bottom.test.ts`, `design.test.ts`, `bottom.test.ts`, `components/rails` | pass |
| `npm test` after Task 1 | only timeouts failed (25 tests in 13 files, with three plans' suites running on one machine). All 13 files re-run without the time limit: 3,680 passed |
| `npm test` after Task 2 | 12,138 passed, 2 skipped, 1 timed out under load (bottom.test.ts CR-01, the known one) — re-run alone with the plan's files: 1,568 passed |
| Browser, desktop: `rails-channels.spec.ts` and `rails-advanced.spec.ts` | 27 passed, 1 skipped (a phone-only test) |
| Browser, desktop and iPhone: `rails-channels`, `rails-advanced`, `phone-rails`, `board-lock-screens` | 109 passed, 41 skipped (each project's other-device tests), 0 failed |

## TDD Gate Compliance

Task 2 went through both gates:
- RED, commit c086ad1b: the Longboard curve test and the deck test failed.
- GREEN, commit 72a45bd4.

The sections-number and rail-lift tests passed already in RED, because Task 1, the tracer, built those functions. The plan put them in Task 1 on purpose.

## Threat Flags

None. No new endpoint or storage. The new sampling is bounded by a section's own reach (about 800 samples), and a cut that is not a finite number is read as 0 (T-17-22).

## Known Stubs

None.

## Commits

| Task | Commit | What |
|---|---|---|
| 1 (tracer) | 6c1e7bd6 | fix: RAILS draws each channel wall straight up, and a channel no longer thins RAILS' rail |
| 2 (RED) | c086ad1b | test: every channel wall on RAILS stands straight up, under the rail's curve and at the deck too |
| 2 (GREEN) | 72a45bd4 | feat: RAILS cuts a channel straight up into the rail's curve too, and never above the deck |

## Self-Check: PASSED

- e2e/rails-channels.spec.ts, pictures/17-18-rails-channels.png and pictures/17-18-pictures-source.tar.gz exist
- 6c1e7bd6, c086ad1b and 72a45bd4 are on the branch
- No change to lib/geometry/volume.ts, lib/export/, components/3d/, lib/db/schema.ts, drizzle/, STATE.md or ROADMAP.md
