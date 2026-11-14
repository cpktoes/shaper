---
phase: 17-bottom-contours
plan: 03
subsystem: geometry (bottom contours: the cut in the litres, the 3D board and the CNC files)
status: checkpoint
tags: [bottom, litres, seam, 3d, cnc, knife-edge, D-05, D-06, D-20, D-21, D-34, D-38, D-40]
requires:
  - "17-01: phase17-litres-pin.json and its refusing script, designFinPlacement"
  - "17-02: bottom.ts (foamOff, resolveBottom, bottomHasCut, BottomBoard), designBottomBoard"
provides:
  - "volume.ts: CrossSectionVolumeInput.foamOffAt, bottomedHalfSection, BOTTOM_COLUMN_FLOOR, BoardSection.thinAt and railEdgeAt"
  - "bottom.ts: bottomSampler, bottomLitresLine; foamOff holds only concaves at the stringer's 1/4\" floor (D-40)"
  - "design.ts: designCrossSectionInput(…, bottom?), DesignSummaryFields.bottom / fins / finsImportTemplate"
  - "lib/geometry/bottom-source.test.ts: the source rules"
affects: [17-04, 17-05, 17-06, 17-07, 17-09]
tech-stack:
  added: []
  patterns:
    - "One seam at the end of boardSectionsWith: each finished half has its bottom lifted (deck held, the rail's lower run tapered to nothing at the rail's outermost height, a knife edge where a lift meets the deck) and its area corrected by the ring's own change, the movedOn level variant"
    - "The bottom reaches volume.ts as one closure built in design.ts, only when bottomHasCut"
key-files:
  created:
    - lib/geometry/bottom-source.test.ts
    - .planning/phases/17-bottom-contours/pictures/17-03-litres-and-sections.png
    - .planning/phases/17-bottom-contours/pictures/17-03-pictures-source.tar.gz
  modified:
    - lib/geometry/volume.ts
    - lib/geometry/volume.test.ts
    - lib/geometry/design.ts
    - lib/geometry/design.test.ts
    - lib/geometry/bottom.ts
    - lib/geometry/bottom.test.ts
    - lib/geometry/phase17-litres-pin.test.ts
    - lib/geometry/board-surface.test.ts
    - lib/export/cnc-files.test.ts
decisions:
  - "D-40 (the founder, 2026-11-08): a vee or belly never touches the stringer and is never clamped; it runs out through the rail and thins it; where it reaches the deck the foam ends in a knife edge; a rail left under 1/4\" is flagged, not cut shallower. Only a concave is held at the stringer's 1/4\" floor"
  - "The rail's lower run rises by f · (1 − h / a), a being the rail's outermost height (not the deck's height over each point), so the underside only rises out from the stringer; past a the rail is cut away and the lift's own line runs on to the deck"
  - "A section with no foam off anywhere is returned exactly as built (no drawn half set), so a flat board's sections, surface and files are untouched, not merely equal"
  - "blendArea is left as the section's own: the litres integrate only area (computeCrossSectionVolumeWith), blendArea is an audit figure"
  - "bottomSampler remembers the last station's board readers, since the seam asks for every point of a section at one station; the numbers are the same either way"
  - "bottomLitresLine works the foam off from the two printed figures in whole hundredths, so it can read 0.01 L under the unrounded difference (Shortboard: 0.74 printed for 0.747) — approved by the founder as it stands"
metrics:
  duration: "about 30 minutes for the plan (14:29 to 14:59), then about an hour for the founder's ruling D-40, most of it waiting on unit-suite runs (4 to 5 minutes each, slower with the machine loaded)"
  completed: 2026-11-08
actuals:
  tokens: 27000
  tasks: 2
  commits: 5
---

# Phase 17 Plan 03: The cut counted in the litres, drawn by the 3D board and carried by the CNC files — Summary

A bottom contour now takes foam out of the board everywhere the app counts or draws it: the litres, the 3D board, the
STL and the CNC slices all read the same lifted cross-sections. The deck never moves. A concave never leaves less than
1/4" under the stringer. A vee or a belly never touches the stringer: it runs out through the rail and thins it, and
where it reaches the deck the foam simply ends in a knife edge — no lip anywhere. Every board with a flat bottom reads
exactly the litres it read before, to the last digit.

## What changes for the founder

Nothing on any screen yet. Every board still opens flat, and the screens start reading the bottom in 17-04. Underneath:

- **The cut is now counted.** Give a board a concave, a vee or a belly and its litres fall by the foam the cut takes
  off. A rack card will count a saved board's cut the same way VOLUME does.
- **The deck stays where it was planed.** A contour only takes foam from below: a concave lifts the stringer and leaves
  the rails; a vee or a belly leaves the stringer and lifts the rails.
- **A vee or belly thins the rail, never the stringer (D-40, your ruling).** It runs all the way out to the rail at the
  depth you set. If that takes the rail under 1/4", the rail is flagged for the warning 17-09 will word, never cut
  shallower. If it reaches the deck, the foam ends there in a knife edge, a hair inboard of where the rail was (1/16"
  or less on the Shortboard's thin tips at 1/2"). No point of the bottom ever stands above the deck, and the bottom
  never steps back down.
- **A concave is still held at the stringer** so 1/4" of foam is always left there.
- **The 3D board and the CNC files show the cut** with no change of their own, and the 3D board still holds a hair
  less foam than the litres (0.02% to 0.06% under on every board tried, inside Phase 16's limit of 0.15%).
- **Flat boards don't move.** All 102 pinned test boards read their pinned litres to the last digit three ways. No
  preset card moves, because the presets stay flat.

## The figures (the app's own, each computed by the picture script; none is typed in a test)

After D-40:

| Board | Cuts (starting numbers) | Litres flat | With the cuts | Foam off (DATA's line) | Sketch's slab figure | App / sketch | 3D mesh vs litres | STL closed |
|---|---|---|---|---|---|---|---|---|
| Shortboard | Deep Single Concave | 29.61 | 28.87 | 0.74 L | 0.75 L | 1.000 | −0.043% | yes |
| Fish | Panel Vee | 34.65 | 34.34 | 0.31 L | 0.31 L | 0.999 | −0.041% | yes |
| Mid-length | Rolled Belly Entry · Shallow Single · Rolled Vee | 49.40 | 47.41 | 1.99 L | 2.05 L | 0.974 | −0.027% | yes |
| Longboard | Rolled Belly Entry · Shallow Single · Rolled Vee | 73.61 | 71.38 | 2.23 L | 2.84 L | 0.787 | −0.056% | yes |
| Fish, winged | Extending Single Concave | 34.58 | 34.45 | 0.13 L | 0.13 L | 1.002 | −0.039% | yes |

What moved from the card he saw: the Fish's Panel Vee now falls 0.3134 L against the sketch's 0.3137 L (0.12% short,
was 0.69%); the Mid-length's three cuts take 1.99 L (was 2.00); **the Longboard's take 2.23 L (was 2.43 L, which he
approved)**. The Longboard's soft rail starts only about 40% of the way out, so most of its bottom is rail curve, and the
new rail rule lifts a point on that curve less the higher it stands. The Shortboard and the winged Fish did not move.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | The seam: the bottom lifted, the deck held, flat boards bit for bit | e8ab0ede | volume.ts/.test, design.ts/.test, bottom.ts/.test, phase17-litres-pin.test.ts |
| 2 | The 3D board and the CNC files carry the cut; the source rules | 7c52aa57 | board-surface.test.ts, cnc-files.test.ts, bottom.test.ts, bottom-source.test.ts |
| — | First checkpoint summary and picture | d3c5bd9e | 17-03-SUMMARY.md, pictures |
| — | The founder's ruling D-40: a vee or belly thins the rail, no lip, never the stringer | 257a3a41 | volume.ts/.test, bottom.ts/.test, design.test.ts, phase17-litres-pin.test.ts, board-surface.test.ts |
| 3 | The founder's look | checkpoint (picture and this summary committed together) | pictures/17-03-litres-and-sections.png, pictures/17-03-pictures-source.tar.gz |

## Founder's ruling D-40 applied

His words (17-CONTEXT.md D-40 on the orchestrator's branch, commit 1065d47c): *"Belly and Vee should never take
thickness off the stringer. The result is a lifted, thinned rail, which should be carried through to the RAILS page."*
and *"It should not remove overall thickness of the tail station in question. Also, no lips should ever be present.
The contour should extend to the rail and make it effectively thinner."*

What changed:

- `bottom.ts` `foamOff`: the concaves' sum is held at the planed thickness less 1/4" (the stringer floor, D-09); the
  vees' and bellies' sum is added unheld. A vee's or belly's foam off at the stringer is exactly 0.
- `volume.ts` `bottomedHalfSection`: the per-column floor is gone. A point on the bottom rises by the foam off there; a
  point up the rail's lower run rises by `f · (1 − h / a)`, `a` the rail's outermost height, so the underside only
  rises out from the stringer. Walking the underside out from the stringer, the first place it reaches the deck is found
  by halving (48 steps) and becomes a knife edge on the deck. Every point outboard of it is drawn there, the deck inboard
  of it untouched. The section records `thinAt` (every bottom point with less than 1/4" under the deck, the knife edge
  included) and `railEdgeAt`, replacing `flooredAt`.
- The first version kept the research's taper by the deck's height over each point. It left dips of up to 2.2 mm on the
  rail curve near thin tips — lips in their own right — and the sweep below catches them (10 boards fail when that
  taper is put back).

How it is proven:

- Every lift cut (Rolled Belly Entry, Reverse Vee Nose, Continuous Belly / Rolled Mid, Panel Vee, Rolled Vee) on ten
  boards — the four presets, the Shortboard's and the Fish's swallow and diamond, the winged Fish and the blank-less
  stock board — at its starting numbers and at 1/2". At every 3D station, the foam off at the stringer is exactly 0 and
  the stringer's deck and bottom points are where they were planed. Walked out from the stringer, no point of the
  underside is lower than the one inboard of it, and none stands above the deck. Every board but the Longboard shows
  knife edges somewhere.
- A scratch sweep of the same cuts, also run from tip to tip, covered 21,247 cut sections with 3,431 knife edges.
  There were 0 dips and 0 points above the deck. All 90 meshes at 1/2" or tip to tip were closed, between 0.023% and
  0.062% under the litres. **No knife edge gave a degenerate ring:** the collapsed points weld into one vertex and the
  mesh stays one closed skin, so nothing was clamped.
- `bottom.test.ts`: a lift alone equals the sketch's own uncapped cut at every golden probe, and equals the sum of the
  cuts where the foam is under 3/4" (more than the old floor allowed somewhere, 0 at the stringer). A concave set
  deeper than the foam holds is held so 1/4" stays under the stringer on all five boards. At 1/2" a concave never
  reaches the floor on these boards, so the hold is shown at 2".
- The Fish's opening Panel Vee is now within 0.5% of the sketch (0.12%), tested directly.

## Verification

- **The pin, three ways and forced:** `phase17-litres-pin.test.ts` passes 207 cases; the forced zero sampler leaves
  every station area `Object.is` equal and sets neither `thinAt` nor `railEdgeAt`. The pin script refuses to run and
  exits 1; the pin file is unchanged.
- **Litres relations** (`design.test.ts`): every one of this wave's 10 cuts falls on the five boards, never by more than
  the sketch's slab figure (+0.5%); every single concave on the four short-railed boards within 0.5% of the sketch's;
  the Shortboard's, Fish's and winged Fish's openings within 0.5%; the Mid-length trio equals its three cuts alone within
  0.1%; Smoothness moves a Deep Single under 0.1% of its own foam off.
- **3D and files** (`board-surface.test.ts`, `cnc-files.test.ts`): the 10 trio runs (starting numbers and 1/2") closed,
  mesh within (−0.15%, 0], nothing above the deck. The D-40 sweep above passes, and so do the swallow, diamond and
  blank-less cases. Thin tips at 1/2" show knife edges and thin-rail flags and stay closed. The CNC slice at the Deep
  Single's deepest point stands `foamOff(station, 0)` above the flat board's within 0.05 mm.
- `npx tsc --noEmit` exits 0; `npm run lint` 0 errors (the same unrelated warning).
- Full suite after D-40 (183 files): 10,700 passed. Three of the new sweep's boards timed out at 5 s under the full-suite
  load, and so did five tests in `blank-fit`, `finished-rail` and `rack-art` in an earlier run beside the picture script.
  Each passed alone. The heavy Phase 17 surface tests now carry a 120 s limit, as the file's other sweeps do, and the
  whole file passes (1,237 tests).
- The three desktop browser specs (`desktop-baseline`, `volume-fins-panels`, `three-d-export`, `PW_PORT=3303 IS_WEBPACK_TEST=1`, desktop): 22 passed, EXIT 0, no picture changed.
- `finished-rail.ts`, the pin file, `drizzle/`, `lib/db/schema.ts`, `board-surface.ts` and the export writers show no
  diff from the base.

## Deviations from Plan

1. **[Founder's ruling D-40] The per-column 1/4" floor of D-33 is withdrawn for vees and bellies** — they thin the rail
   and end in a knife edge instead. `BoardSection.flooredAt` became `thinAt` plus `railEdgeAt`: 17-05 and 17-09 word the
   warning from those.
2. **[Measured, not bent] Vees and bellies fall short of the sketch's slab figure:** 0.957 to 0.999 of it on the four
   short-railed boards, 0.72 to 0.78 on the Longboard, because the finished rail takes foam the slab counted. The tests
   pin "never more than the sketch's", not a near match, for these.
3. **[Measured, not bent] Smoothness moves the litres by 0.0004 L, not under 0.0001 L (D-06).** The two curves hold the
   same foam; the 3D cross-section has only 24 points across the bottom, and the plan forbids changing that count. Pinned
   as "under 0.1% of the cut's own foam".
4. **[Rule 3] `designCrossSectionInput` keeps one `return { … }`**, because `components/design/design-store.test.ts` reads
   that function's source.
5. **The commit trailer** is `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, the model that did the work and
   the session's attribution rule, as waves 1 and 2 recorded. The orchestrator asked twice for another model's name; I
   did not write a co-author line for a model that did not do the work.
6. **One commit per task** (the orchestrator's ruling), plus one commit for the founder's ruling.

## Notes for later plans

- **RAILS (17-04):** a lift's rail is now lifted and thinned in the 3D sections; reading it at the three anchors is
  17-04's, as D-35/D-40 say.
- **The CNC files' z = 0** stays at the planed bottom's lowest point (the rocker). A cut across the lowest rocker point
  can leave the lowest foam a hair above it. The writers are unchanged.
- **A knife edge narrows the outline** the 3D board and the files draw at that station, by the little the rail edge
  moved in.

## Known Stubs

None.

## Threat Flags

None: no new endpoint, input or file path; the bottom reaches `volume.ts` as one closure built in `design.ts`.

## Founder's look: Approved (2026-11-08)

The founder, on the checkpoint card with the picture: *"Approved — merge it."* His rulings at this plan's two looks: D-40 (a vee or belly never takes thickness off the stringer, runs out through the rail and thins it, no lip — applied in this worktree before the merge), D-41 (RAILS draws the angle in the bottom of the displayed rail — plan 17-04) and D-42 (a center single fades out before a tail vee peaks — plan 17-05); the concave's hollow at the stringer confirmed: *"Ah, got it … a concave hollows the stringer and this makes sense."* Merged as 65a2762a.

Picture (redrawn after D-40):
`.planning/phases/17-bottom-contours/pictures/17-03-litres-and-sections.png` (sources in
`17-03-pictures-source.tar.gz`). Awaiting "approved", or changes.

1. Each bottomed section holds its deck and only takes foam from below.
2. The litres table above, with the Longboard's three cuts now 2.23 L (was 2.43 L).
3. The last two rows: the Shortboard with a Rolled Belly Entry and a Rolled Vee at 1/2", at 3" and 1 1/2" from the
   tail and 6" and 4" from the nose. The lift runs straight out until it meets the deck, and the rail ends there. There
   is no lip, and the stringer is untouched.

## Self-Check: PASSED

All created files exist; commits e8ab0ede, 7c52aa57, d3c5bd9e and 257a3a41 are on the branch; both pictures are in
`pictures/`.
