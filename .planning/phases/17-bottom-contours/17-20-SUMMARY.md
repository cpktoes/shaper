---
phase: 17-bottom-contours
plan: 20
subsystem: litres-3d-board
status: complete
tags: [bottom, channels, finished-rail, litres, 3d, gap-closure, G-17-6]
requires:
  - 17-18 (bottomSectionsSampler, the vees' and bellies' foam without the channels)
  - 17-19 (the 49 channelled boards' litres, pinned before this change)
  - the founder's ruling of 2026-11-10 on G-17-6 ("channels are the last cut, made after the rail is shaped")
provides:
  - CrossSectionVolumeInput.sectionsOffAt, handed in by designCrossSectionInput on a board with channels
  - the channels cut straight up into the finished rail in every section the litres count, the 3D board draws and the CNC files carry
  - a real vertical face for a channel wall under a soft or rolled rail's curve (BoardSection.bottomEdgeRow marks the rail's true bottom edge on those rings)
  - the 3D board's sharp bottom edge and face kinds read from the section's own bottom edge row
affects:
  - 17-21 (RAILS on a flat tail, DATA's Rail lift) — not built here
  - the .brd export on branch close-bottom-17 reads these rings through board-surface.ts and carries the fix once both are on main
tech-stack:
  added: []
  patterns:
    - "Channels cut last: each point stands at the higher of the rail lifted by the vee or belly and the channel's floor"
    - "A ring with a wall standing under the rail's curve starts its walled run on the rail's run; the ring keeps its length and every wall its two slots"
key-files:
  created:
    - .planning/phases/17-bottom-contours/pictures/17-20-before-and-after.png
    - .planning/phases/17-bottom-contours/pictures/17-20-pictures-source.tar.gz
  modified:
    - lib/geometry/volume.ts
    - lib/geometry/design.ts
    - lib/geometry/board-surface.ts
    - lib/geometry/volume.test.ts
    - lib/geometry/board-surface.test.ts
    - lib/geometry/phase17-channel-litres.test.ts
decisions:
  - "A wall that does not stand, on a ring where another wall stands under the curve, is held at its own across inside the walled run (or at the run's outer end if past it), not at the bottom edge: the bottom edge then lies inboard of a standing wall, so holding a wall outboard of it there would fold the ring"
  - "The litres relations read every station the litres read, the tail roll's last inch included (TAIL_ROLL_PANELS now exported)"
  - "The 400-point check of the walled run is dense under the rail's curve too, since a wall under the curve is now a real face"
metrics:
  duration: about 1 hour 40 minutes
  completed: 2026-11-11
requirements: [R5, R11, R15]
actuals:
  tokens: 10900
  tasks: 3
  commits: 4
---

# Phase 17 Plan 20: channels cut straight up into the finished rail, in the solid board

**On a board with channels, the litres, the 3D board and the CNC files now cut each channel the way a shaper does: last, straight up into the finished rail. A vee, belly or concave still lifts the rail exactly as before. Where a channel wall stands under the curve of a soft or rolled rail, it is now a real vertical wall at its own place.**

## What changed for the board

- **A channel's floor no longer rides up the rail.** Before, a channel that ran out under the rail's curve was pushed up the curve by the vee's lifting rule, so its floor climbed the rail. Now the vee or belly lifts the rail first. The channel is then cut into what that leaves, straight up. Each point of the section is at the higher of the two: the lifted rail, or the channel's floor.
- **Walls under the curve have a face.** The soft-tailed Shortboard's outer wall at 6" from the tail used to lose its face entirely. So did most of the Longboard's walls under its rolled rail. Each is now a vertical step at its own distance across, the same height as the cut there.
- **The 3D board stays one solid.** Every cross-section keeps the same number of points, and every wall keeps its place from one section to the next. The board's sharp bottom edge is still drawn at the rail's true bottom edge. The faces outboard of that edge are shaded as rail.
- **BOTTOM's finished-rail ghost** (the thin grey line under "Show the finished rail from RAILS") is this same section, so it shows the change too.
- **What did not change:**
  - Boards without channels are untouched.
  - BOTTOM's thin-rail warning still falls only on the bottom.
  - The foam still ends where a channel meets the deck.
  - RAILS' drawing and DATA's Rail lift are untouched (those are 17-21's).

## The litres, before and after

"Before" is 17-19's record. "After" is the app today. Every figure was printed by `phase17-channel-litres.test.ts` from the app's own maths, to four places. The app itself shows two.

| Board | Tail | Channels | Before (L) | After (L) | Change |
|---|---|---|---|---|---|
| Shortboard, Hard Edge | flat | 4 / 6 / 8 | 29.2330 / 29.2287 / 29.2542 | the same | none, to the last digit |
| Shortboard, Hard Edge | Rolled Vee | 4 / 6 / 8 | 28.8658 / 28.8609 / 28.8868 | the same | none, to the last digit |
| Shortboard, soft tail | flat | 4 | 29.1971 | 29.1994 | +0.0023 |
| Shortboard, soft tail | flat | 6 | 29.1932 | 29.1956 | +0.0024 |
| Shortboard, soft tail | flat | 8 | 29.2182 | 29.2206 | +0.0025 |
| Shortboard, soft tail | Rolled Vee | 4 | 28.8423 | 28.8427 | +0.0004 |
| Shortboard, soft tail | Rolled Vee | 6 | 28.8376 | 28.8379 | +0.0003 |
| Shortboard, soft tail | Rolled Vee | 8 | 28.8633 | 28.8637 | +0.0004 |
| Fish, Hard Edge | flat | 4 / 6 / 8 | 34.3490 / 34.3451 / 34.3749 | the same | none, to the last digit |
| Fish, Hard Edge | Rolled Vee | 4 / 6 / 8 | 33.9978 / 33.9938 / 34.0237 | the same | none, to the last digit |
| Fish, soft tail | flat | 4 / 6 / 8 | 34.3166 / 34.3127 / 34.3426 | the same | under a millionth of a litre (six channels: −0.00000004) |
| Fish, soft tail | Rolled Vee | 4 / 6 / 8 | 33.9736 / 33.9697 / 33.9996 | the same | under a millionth of a litre |
| Mid-length, Hard Edge | flat | 4 / 6 / 8 | 49.0109 / 49.0124 / 49.0337 | the same | none, to the last digit |
| Mid-length, Hard Edge | Rolled Vee | 4 / 6 / 8 | 48.5730 / 48.5747 / 48.5958 | the same | none, to the last digit |
| Mid-length, soft tail | flat | 4 | 48.9744 | 48.9763 | +0.0019 |
| Mid-length, soft tail | flat | 6 | 48.9760 | 48.9783 | +0.0023 |
| Mid-length, soft tail | flat | 8 | 48.9969 | 48.9989 | +0.0020 |
| Mid-length, soft tail | Rolled Vee | 4 | 48.5496 | 48.5498 | +0.0003 |
| Mid-length, soft tail | Rolled Vee | 6 | 48.5512 | 48.5515 | +0.0003 |
| Mid-length, soft tail | Rolled Vee | 8 | 48.5722 | 48.5726 | +0.0005 |
| Longboard, Hard Edge | flat | 4 / 6 / 8 | 74.3257 / 74.3262 / 74.3504 | the same | none, to the last digit |
| Longboard, Hard Edge | Rolled Vee | 4 / 6 / 8 | 73.8173 / 73.8177 / 73.8401 | the same | none, to the last digit |
| Longboard, soft (rolled) rail | flat | 4 | 73.3600 | 73.4138 | +0.0537 |
| Longboard, soft (rolled) rail | flat | 6 | 73.3633 | 73.4267 | +0.0634 |
| Longboard, soft (rolled) rail | flat | 8 | 73.3800 | 73.4294 | +0.0495 |
| Longboard, soft (rolled) rail | Rolled Vee | 4 | 72.9750 | 73.0127 | +0.0376 |
| Longboard, soft (rolled) rail | Rolled Vee | 6 | 72.9784 | 73.0287 | +0.0503 |
| Longboard, soft (rolled) rail | Rolled Vee | 8 | 72.9933 | 73.0315 | +0.0382 |
| The diagnosis's RAILS board: Fish, Hard Edge, Rolled Vee, 8 channels at Off Stringer 3" | | 8 | 34.1215 | 34.1215 | none, to the last digit |

**In plain words.** The litres moved only where a channel reaches the curve of a soft or rolled rail. The board gains a little foam there. Before, the vee's rule lifted the whole curve with the channel; now the channel is cut only where it actually is.

- **Hard Edge tails:** every Hard Edge board, the RAILS board included, reads exactly what it read before. Its rail stands straight up, so cutting straight up changes nothing.
- **The Fish:** it moves less than a millionth of a litre.
- **Shortboard and Mid-length with a soft tail:** they gain two to three thousandths of a litre on a flat tail, and under a thousandth with a Rolled Vee.
- **The Longboard's rolled rail** (most of its channels reach under the curve): it gains four to six hundredths. On screen, the Longboard with six channels on a flat tail goes from 73.36 L to 73.43 L.
- **Two-decimal readings:** the Shortboard with a soft tail and six channels goes from 29.19 L to 29.20 L. The Mid-length with a soft tail and four channels goes from 48.97 L to 48.98 L. Every other board outside the Longboard reads the same two decimals as before.

BOTTOM's DATA first line (Foam off), the order form and the rack cards all read these same litres.

### Which rule held each board (the test's own working)

The test works out each board's rule from the app's own sections. Each rule is a limit, and a board past its limit would have failed the test. None did.

| Rule | Limit | Boards it held | Largest change |
|---|---|---|---|
| Exact (no channel ever reaches the rail's run) | the pin to the last digit | **none**: on every one of the 49 boards the outer channel runs out through the rail somewhere near the tail | — |
| Hard Edge tail | within 0.00001 L | the 25 Hard Edge boards (24 + the RAILS board) | 0 (each equals its pin to the last digit) |
| Soft tail, Shortboard / Fish / Mid-length | within 0.01 L | 18 boards | +0.0025 L (Shortboard, flat, 8 channels) |
| Soft tail, Longboard | within 0.15 L | 6 boards | +0.0634 L (flat, 6 channels) |

## Founder's look: Approved (2026-11-11)

The founder looked at the before-and-after picture and the litres table and approved ("Approved"); merged onto claude/bottom-uat-17-d1559c as 8522f594.

- `.planning/phases/17-bottom-contours/pictures/17-20-before-and-after.png` (in this worktree: `.planning/phases/17-bottom-contours/pictures/17-20-before-and-after.png`). It is one sheet, two boards, each with three rows of before (left) and after (right):
  - **Longboard (rolled rail), six channels, BOTTOM's section 6" from the tail, finished rail from RAILS ticked, Height x4.** In the whole-section row, the thin grey diagonal lines that rode above the channel floors near both rails are gone. The grey finished-rail line now runs along the channel floors.
  - **Longboard close-up of the right rail.** This is the clearest picture. Before, the grey line climbed above the channel floor and slanted across the wall. After, it lies on the floor, the rail's curve comes down to the outer wall's top, and the wall drops straight to the floor.
  - **Shortboard with a soft tail (Hard Edge unticked), six channels, the same section and close-up.** Before, the grey line came down the rail with a kink and a slope beside the outer channel. After, it comes down the rail's curve and meets the outer channel's wall, which stands straight up.
  - **The 3D screen's Bottom view, both boards.** The change is a fraction of an inch at the rail near the tail, too small to see at this distance. These are included to show nothing else on the underside moved.

## Deviations from Plan

**1. [Rule 3 - Blocking] The litres test reads the tail roll's stations too**
- **Found during:** Task 1
- **Issue:** The Fish with a soft tail and six channels moved by 0.00000006 L even though, at the 51 litres stations, the test found no channel reaching its rail. The litres also count the tail's roll over its last inch, on stations of their own. A channel reaches the rail there.
- **Fix:** The test reads both sets of stations. `TAIL_ROLL_PANELS` is now exported from `volume.ts`, so the test can read the same stations.
- **Files:** lib/geometry/volume.ts, lib/geometry/phase17-channel-litres.test.ts. **Commit:** 9a11e27f

**2. [Rule 1 - Bug] A wall that does not stand, outboard of one that does, is held at its own place**
- **Found during:** Task 2
- **Issue:** The plan said a wall that does not stand is held at the bottom edge as before. On a ring where another wall stands under the curve, the bottom edge lies inboard of that standing wall. A wall outboard of it would then have to sit inboard of a wall it lies outside, and the ring would fold back on itself.
- **Fix:** On such a ring, a wall that does not stand keeps its own across inside the walled run, its two slots on one spot. A wall past the run's outer end is held at that end. Every other ring is laid out exactly as before.
- **Files:** lib/geometry/volume.ts. **Commit:** d3694f76

**3. [Rule 1 - Bug] Two of Task 1's tests updated for Task 2's rings**
- **Issue:**
  - Task 1's "a rail point no channel reaches is exactly as before" compared points by their place in the list. A ring with a wall under the curve lays its rail's run afresh, so its points shift places.
  - The 400-point check sampled densely on the bottom only. That check smeared the new walls under the curve, so it no longer measured the truth.
- **Fix:**
  - The first test now skips rings that carry a `bottomEdgeRow`. Task 2's own tests cover those rings.
  - The dense check now also cuts each segment of the rail's run into 16 pieces. Its limits are unchanged and it passes on every preset and count.
- **Files:** lib/geometry/volume.test.ts. **Commit:** d3694f76

**4. The lift rule became one shared function.** `bottomedHalfSection`'s lift is now the module-level `liftedBy`, with the same arithmetic, so the test for a wall under the curve uses the very same rule. Boards without channels are untouched; the flat pin, the Phase 16 pins and the board-surface suites stay green.

**5. Tracer gate.** The project's config is interactive (`auto_advance: false`). The tracer's automated check passed end to end, so I carried on into Tasks 2 and 3: the plan is `autonomous: true`, and the orchestrator ruled that the founder looks after hand-back.

**6. How the close-ups' "before" was taken.** The close-ups are 3x captures. For their "before", `volume.ts`, `design.ts` and `board-surface.ts` were put back to the base commit (e30eab3e) in this worktree for one capture run. They were then restored with `git checkout -- <those three files>`, and the tree was checked clean. The whole-section and 3D "before" pictures are cut straight from 17-19's own `17-19-before.png`.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean after every task |
| `npm run lint` | 0 errors; the one known warning in lib/db/import-designs-action.test.ts:42 |
| Task 1 suites (volume, channel pin, flat pin, Phase 16 surface pin, board-surface, bottom-draw) | 2,518 passed |
| `npm test` after Task 1 | 12,195 passed, 2 skipped, 1 timed out under load (bottom.test.ts CR-01, the known one): alone, 1,160 passed |
| Task 2 suites (volume, board-surface, render, channel pin, bottom, bottom-draw) | 3,183 passed |
| `npm test` after Task 2 | 12,203 passed, 2 skipped, 2 timed out under load (bottom.test.ts CR-01; board-surface.test.ts "the wire view's lines", 5 s): both files alone, 2,414 passed |
| `scripts/extract-phase17-channel-litres-pin.ts` | refuses to run ("the pin records the litres from before the channel rule changed — it is never re-run"), exit 1, nothing written |
| Browser, desktop: bottom-viewer, bottom-screen, bottom-metric, summary-bottom-page, three-d-screen, rails-channels | 34 passed, 2 skipped, 0 failed (PW_PORT=3320, IS_WEBPACK_TEST=1) |
| Desktop baselines | none changed; `--update-snapshots` never used |

## TDD Gate Compliance

Task 2 went through both gates:
- RED, commit 947cb3fd: 8 tests failed. One passed already, the Longboard's "no point above the higher of the lift and the floor", because Task 1 (the tracer) had already made it true. It stays as a guard.
- GREEN, commit d3694f76.

## The .brd export

The .brd export being built on branch `close-bottom-17` reads these same rings through `lib/geometry/board-surface.ts`, so it carries this fix once both are on main. Nothing in `lib/export/` or `components/3d/` was touched. In `board-surface.ts` only the two reads changed: the ring's sharp bottom edge, and each strip's face kind. The end of the file is left alone.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, file access or storage.
- T-17-26: boards without channels carry no new input key, and Hard Edge tails are held within 0.00001 L (they came out exact).
- T-17-27: the 3D board is closed, with no open, non-manifold, mis-wound or zero-area faces. Its (mesh − litres)/litres is in (−0.15%, 0] on the soft Shortboard and on the Longboard with six and with eight channels, as well as on the five golden boards.
- T-17-28: every sampler value that is not a finite number is read as no cut, and every loop runs over the ring's fixed count.

## Commits

| Task | Commit | What |
|---|---|---|
| 1 (tracer) | 9a11e27f | fix: the litres and the 3D board cut a channel straight up into the finished rail |
| 2 (RED) | 947cb3fd | test: a channel wall under a soft or rolled rail's curve must have its own vertical face |
| 2 (GREEN) | d3694f76 | feat: a channel wall under a soft or rolled rail's curve stands straight up in the litres and the 3D board |
| 3 | 4e6383fb | docs: the founder's before-and-after pictures and their script |

## Self-Check: PASSED

- pictures/17-20-before-and-after.png and pictures/17-20-pictures-source.tar.gz exist
- 9a11e27f, 947cb3fd, d3694f76 and 4e6383fb are on the branch
- No change to lib/export/, components/3d/, lib/db/schema.ts, drizzle/, STATE.md or ROADMAP.md
