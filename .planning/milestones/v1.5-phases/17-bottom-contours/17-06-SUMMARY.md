---
phase: 17-bottom-contours
plan: 06
subsystem: geometry (bottom contours: the channels, and their walls in the 3D board and the files)
status: checkpoint
tags: [bottom, channels, sawtooth, stagger, toe-in, walls, 3d, stl, D-03, D-05, D-10, D-11, D-16, D-21, D-40]
requires:
  - "17-02: bottom.ts (BottomChannelsSpec, DEFAULT_BOTTOM, foamOff), designBottomBoard"
  - "17-03: the seam (foamOffAt, bottomedHalfSection, thinAt / railEdgeAt), designCrossSectionInput(…, bottom)"
  - "17-05: bottomLayoutMarks, bottomFloorFlags, BottomMarkColumn"
provides:
  - "bottom.ts: ChannelCount, CHANNEL_STARTING_WIDTHS, startingChannels, ResolvedChannels, resolveChannels, chan, channelFit, channelStart, channelEdges, channelMarks, channelFoamOff, channelLayout, channelReadout, channelWallsAt, bottomWallSampler, bottomHasChannels, channelWallKey, CHANNEL_FLAT_KEY"
  - "bottom.ts: the channels are the last term of foamOff; bottomLayoutMarks gains Flat edge and Wall 1–4; bottomFloorFlags gains the channels (rail form)"
  - "volume.ts: CrossSectionVolumeInput.bottomWallsAt, BoardSection.ringLength / wallRows, BOTTOM_WALL_SLOTS, BOTTOM_RUN_WITH_WALLS, halfSectionPointCount, bottomedHalfWithWalls"
  - "board-surface.ts: the board's own ring length, SURFACE_FACE.channelWall, placedHalfSection(…, ringLength)"
  - "design.ts: designCrossSectionInput supplies bottomWallsAt only with channels"
affects: [17-07, 17-08, 17-09, 17-12]
tech-stack:
  added: []
  patterns:
    - "A channel board lays every section's bottom run out afresh to a fixed count with a top and a foot slot per wall, so a wall is a vertical step and every ring of one board has one length"
    - "A wall with no step at a station folds into one welded point; standing is decided by the one number's own step there"
key-files:
  created:
    - .planning/phases/17-bottom-contours/pictures/17-06-channels.png
    - .planning/phases/17-bottom-contours/pictures/17-06-pictures-source.tar.gz
  modified:
    - lib/geometry/bottom.ts
    - lib/geometry/bottom.test.ts
    - lib/geometry/volume.ts
    - lib/geometry/volume.test.ts
    - lib/geometry/design.ts
    - lib/geometry/board-surface.ts
    - lib/geometry/board-surface.test.ts
    - lib/geometry/board-surface-render.ts
    - lib/geometry/phase17-litres-pin.test.ts
decisions:
  - "The channels are their own term in foamOff, added last and never held at the 1/4\" floor (orchestrator ruling 3 / D-40): each channel's floor starts at a peak, so the channels never take foam off the stringer; where a floor would meet the deck the foam ends and the rail is flagged"
  - "startingChannels opens D-11's numbers with the count's own width unless the width was set by hand (the sketch's rule, within 0.01 mm)"
  - "A wall's top is read 1e-6 mm outside the wall and set back on the wall's line, so the face is exactly vertical; a wall with a step under 1e-6 mm folds into one point"
  - "Channel walls are a face kind of their own (SURFACE_FACE.channelWall), drawn sharp by the render's existing wall-and-cap path — no render code change"
  - "Where a cut takes a swallow's prong right through, the 3D board draws nothing between that collapsed ring and the prong's tip line (both hold no foam), so the mesh stays closed"
metrics:
  duration: "about 41 minutes (18:19 to 19:00 local), of which about 12 were two full unit-suite runs (about 6 minutes each) and 3 the browser specs"
  completed: 2026-11-08
actuals:
  tokens: 30000
  tasks: 2
  commits: 3
---

# Phase 17 Plan 06: The channels — the sawtooth, the three runs, Longest and Stagger, and real walls — Summary

Four, six or eight channels now cut into the bottom, last, into whatever the nose, center and tail cuts leave, exactly as
the founder's sketch 021 draws them. The 3D board and the CNC files carry each wall as a true vertical step. Nothing on
any screen changes yet, and no board opens with channels. The panel arrives in 17-09.

## What changes for the founder

- **The shape is his sawtooth.** The stringer is the first peak. Each channel's floor deepens outward to a square wall at
  the rail side, and the top of that wall is the next channel's peak. There is no flat between channels. The walls stand
  at Width, 2 × Width and 3 × Width out from Off Stringer. Smoothness runs the floor from a straight ramp to a scooped
  one. A channel narrower than an inch shallows out, as a concave does.
- **The three runs.**
  - **Parallel** rules the walls straight from the deepest station. Where the outline narrows, the outer channels run
    out through the rail.
  - **With the rail** keeps the last wall the same distance off the rail. Once the gaps close, the outer channels run
    out through the rail; it never pinches every channel.
  - **Toe-in** splays the set at the front fins' own angle: 3.2° on the Shortboard, 2.0° on the Fish. A single fin
    (the Longboard) has no toe, so it lays exactly as Parallel.
- **Longest and Stagger.** Each channel out from the longest pair starts a Stagger shorter, so the fronts step. A
  stagger never starts a channel closer than an inch ahead of the deepest station. Only the starts stagger: one deepest
  station and one end for all.
- **Read out, never set.** A set that won't fit is squeezed to leave 1/2" to the rail, and says so. Eight channels asked
  at 4" on the Shortboard read *4" (1 9/16" to fit) · ramp 11° · last wall 1/2" off the rail*. The ramp's angle and the
  last wall's distance are figures only; there is no Wall control.
- **Starting numbers (D-11).** Picking a count opens:
  - 5/16" deep, from 12" ahead of the front fins, deepest at the fins, out the tail;
  - Off Stringer 0, Smoothness 0, Parallel, the outer pair longest, a 2" stagger;
  - 2 1/2" / 1 3/4" / 1 1/4" wide for 4 / 6 / 8 channels, unless the width was set by hand.
- **DATA** gains the channels' Flat edge (when Off Stringer is set) and Wall 1 to Wall 4 in the layout marks. Each wall's
  cell is empty ahead of its own channel's start. A channel that leaves the rail under 1/4" is flagged in the rail form;
  a channel never reaches the stringer.
- **Real walls in 3D and the STL.** Every ring of a board with channels has a top and a foot point at each wall, so a
  wall is a square step rather than a slope between two points. The screen draws the walls sharp.

## The figures (each computed by the app, printed by a test or the picture script; none typed in a test)

- **Against the sketch:**
  - All 54 golden channel cases agree within 1e-9 mm: 3 counts × 3 runs × 3 length orders on the Shortboard and the
    Fish. That covers the fit, every channel's start, and the walls and marks every 6".
  - The five openings plus six channels equal the sketch's foam off within 1e-9 mm at every probe. The channels' own
    term equals the sketch's added term too.
- **Start ≥ Deepest ≥ End** held on 4,173 starting cuts: 107 boards × (15 names with and without a tail vee + 9
  channel sets).
- **Litres each set takes at its starting numbers:**

  | Board | Litres now | 4 channels | 6 | 8 | Sketch's slab, 6 |
  |---|---|---|---|---|---|
  | Shortboard | 29.61 | 0.38 | 0.38 | 0.36 | 0.38 |
  | Fish | 34.65 | 0.30 | 0.30 | 0.27 | 0.30 |
  | Mid-length | 49.40 | 0.39 | 0.39 | 0.37 | 0.40 |
  | Longboard | 73.61 | 0.25 | 0.25 | 0.23 | 0.27 |
  | Fish, winged | 34.58 | 0.30 | 0.30 | 0.27 | 0.31 |

- **The same foam under any center cut.** Six channels on the Shortboard take 0.3847 L under the Deep Single, 0.3845 L
  under the same single at 1/8", and 0.3844 L under a Flat Center.
- **3D and files.** Ten meshes were checked: the five boards with eight channels, at the starting numbers and with every
  section and the channels at 1/2". All ten have zero open, non-manifold or mis-wound edges and no zero-area triangle. The
  mesh holds 0.027% to 0.076% less than the litres, inside Phase 16's 0.15%. Each surface builds in 70–140 ms.
- **The walls make the litres more honest.** Each run was compared with a 400-point bottom. The walled run's error
  summed over the stations, against the 24-point run's, was:

  | Board | 6 channels, walled | 6 channels, 24-point |
  |---|---|---|
  | Shortboard | 34.9 mm² | 492 mm² |
  | Fish | 30.5 mm² | 493 mm² |
  | Longboard | 3.2 mm² | 44 mm² |

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | The channels in the one number: sawtooth, runs, Longest and Stagger, fit and squeeze | 490a53be | bottom.ts, bottom.test.ts |
| 2 | Real walls in the 3D board and the STL | 5275de50 | volume.ts/.test, design.ts, bottom.ts, board-surface.ts/.test, board-surface-render.ts, phase17-litres-pin.test.ts |
| 3 | The founder's look | checkpoint (this summary and the pictures) | pictures/17-06-channels.png, pictures/17-06-pictures-source.tar.gz |

## Verification

- `npx tsc --noEmit` exits 0. `npm run lint` shows 0 errors, plus the same unrelated `import-designs-action.test.ts`
  warning.
- **Full unit suite, both runs passed:**
  - after Task 1: 184 files, 11,210 passed, 2 skipped;
  - after Task 2: 184 files, 11,230 passed, 2 skipped, exit 0.
- `bottom.test.ts -t channels` passes the 54 golden cases and the five openings with six channels.
- **Browser specs** (`three-d-screen`, `three-d-export`, `desktop-baseline`, `--project=desktop`, `PW_PORT=3306
  IS_WEBPACK_TEST=1`): 25 passed, 1 skipped, exit 0. `git status --porcelain e2e` is empty.
- **Untouched:**
  - `finished-rail.ts`, `lib/db` and `drizzle/` have no diff from the base.
  - The 102-board pin passes three ways, and the forced zero seam is still `Object.is`.
  - A board without channels carries no `bottomWallsAt` and keeps 102-point rings.

## Deviations from Plan

1. **[Ruling 3 / D-40] The channels are not in the concaves' held sum.** 17-05's comment planned that. Instead they
   are a last term that is never held:
   - a channel's floor starts at a peak, so it never reaches the stringer floor;
   - near a thin rail the foam ends at a knife edge and is flagged.
   This is also what makes the openings with six channels match the golden exactly.
2. **[Measured, not bent] "The re-laid run takes at least the old run's litres" is false in general.** On the
   Longboard with eight channels the walled run takes 0.2342 L against the old 0.2346 L. A smeared wall can over-cut as
   well as under-cut. The test pins what holds instead:
   - the walled run's error to a 400-point bottom is under a third of the old run's, on four presets × three counts;
   - that error is under 2% of the channels' foam.
3. **[Rule 1] A pre-existing seam fault, found by the 1/2" sweep.** On the Fish (a swallow), every section and eight
   channels at 1/2" cut the prong's tip right through. The ring at 0.16 mm from the tail collapsed to one point, and the
   mesh had 8 non-manifold and 16 mis-wound edges. The old 24-point run gave the same fault. Fix: `buildBoardSurface`
   draws nothing between a collapsed ring and the prong's tip line, since neither holds foam. Every other board is
   unchanged.
4. **[Measured] The sketch reads its rail straight between 4,801 samples, and the front fins are not on a sample.** The
   app's exact last-wall distance differs from the sketch's by up to 6.1e-6 mm on the Fish. The golden channel cases
   read the app's own rail the sketch's way, to check the arithmetic at 1e-9. The gap itself is pinned under 1e-4 mm.
5. **Interfaces:**
   - `bottomWallsAt` returns one entry per channel a side, collapsed walls included. Whether a wall stands is decided
     in the seam by its own step.
   - The wall rows are marked with a face kind (`SURFACE_FACE.channelWall`), not a `SurfaceRing` row list. The render
     needed only a doc change.
   - New exports: `channelWallsAt`, `bottomWallSampler`, `bottomHasChannels`, `BoardSection.ringLength` / `wallRows`.
   - `startingChannels` takes `board` as the plan's signature has it but reads nothing from it, because D-11's stations
     are fin-relative.
6. **The picture** draws the sections at ×4, as orchestrator ruling 7 asked (the plan's text said ×8). A trial oblique
   view of the tail's rings was too cluttered to read and was dropped. The ring at the fins shows the walls instead.
7. **The commit trailer** is `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, as this session's attribution
   rule and the plan give it and as waves 1 to 5 recorded. Orchestrator ruling 6 named a different model, which did not
   do this work.

## Known Stubs

None.

## Threat Flags

None. There is no new endpoint, input or file path. T-17-04 (closed mesh) and T-17-03 (channel-free boards unchanged)
are mitigated and tested. T-17-11 holds: at most four walls a side are read.

## Founder's look: Approved (2026-11-08)

The founder, on the checkpoint card with the picture: *"Approved — merge it."* The channels as drawn: the sawtooth, the three runs, the length orders with only the starts staggered, the squeeze, the walls as real steps in the 3D board and the STL; the executor's two honest notes (the re-pinned litres relation, the swallow-prong mesh fix) accepted with the plan. Merged as 8fdca149.

Picture: `.planning/phases/17-bottom-contours/pictures/17-06-channels.png` (sources in `17-06-pictures-source.tar.gz`).

1. Each channel is a ramp down to a square wall at the rail side. The top of that wall is the next channel's peak, with
   no flat between (section 1, ×4, the sketch's walls as red dots).
2. On the Fish and the Shortboard, from above (section 2):
   - With the rail narrows the set toward the tail, and the outer channels run out through the rail rather than
     pinching;
   - Toe-in splays the walls at the fins' angle.
3. Only the starts stagger. Every channel is deepest at the front fins and they all end together (section 2, the three
   length orders).
4. The channels take the same foam under any centre cut: 0.3847 / 0.3845 / 0.3844 L (section 4).
5. The 3D ring at the fins has vertical walls (section 5).

## Self-Check: PASSED

All nine modified files, both pictures and this summary exist. Commits 490a53be and 5275de50 are on the branch.
