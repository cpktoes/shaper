---
phase: 17-bottom-contours
plan: 03
subsystem: geometry (bottom contours: the cut in the litres, the 3D board and the CNC files)
status: checkpoint
tags: [bottom, litres, seam, 3d, cnc, floor, D-05, D-06, D-20, D-21, D-33, D-34, D-38]
requires:
  - "17-01: phase17-litres-pin.json and its refusing script, designFinPlacement"
  - "17-02: bottom.ts (foamOff, resolveBottom, bottomHasCut, BottomBoard), designBottomBoard"
provides:
  - "volume.ts: CrossSectionVolumeInput.foamOffAt, bottomedHalfSection, BOTTOM_COLUMN_FLOOR, BoardSection.flooredAt"
  - "bottom.ts: bottomSampler, bottomLitresLine"
  - "design.ts: designCrossSectionInput(…, bottom?), DesignSummaryFields.bottom / fins / finsImportTemplate"
  - "lib/geometry/bottom-source.test.ts: the source rules"
affects: [17-04, 17-05, 17-06, 17-07]
tech-stack:
  added: []
  patterns:
    - "One seam at the end of boardSectionsWith: each finished half has its bottom lifted (deck held, 1/4\" floor per column) and its area corrected by the ring's own change, the movedOn level variant"
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
  - "A section with no foam off anywhere is returned exactly as built (no drawn half set), so a flat board's sections, surface and files are untouched, not merely equal"
  - "blendArea is left as the section's own: the litres integrate only area (computeCrossSectionVolumeWith), blendArea is an audit figure"
  - "bottomSampler remembers the last station's board readers (rail, curves, thickness, notch wall), since the seam asks for every point of a section at one station; the numbers are the same either way"
  - "bottomLitresLine works the foam off from the two printed figures in whole hundredths, so it can read 0.01 L under the unrounded difference (Shortboard: 0.74 printed for 0.747)"
metrics:
  duration: "about 30 minutes of work (14:29 to 14:59 by the clock), including two full unit-suite runs of about 4 minutes each and the three desktop browser specs (2.4 minutes)"
  completed: 2026-11-08
actuals:
  tokens: 21000
  tasks: 2
  commits: 3
---

# Phase 17 Plan 03: The cut counted in the litres, drawn by the 3D board and carried by the CNC files — Summary

A bottom contour now takes foam out of the board everywhere the app counts or draws it: the litres, the 3D board, the
STL and the CNC slices all read the same lifted cross-sections. The deck never moves, at least 1/4" of foam is always
left under it at every point across, and every board with a flat bottom reads exactly the litres it read before, to
the last digit.

## What changes for the founder

Nothing on any screen yet. Every board still opens flat, and the screens start reading the bottom in 17-04. Underneath:

- **The cut is now counted.** Give a board a concave, a vee or a belly and its litres fall by the foam the cut takes
  off. A rack card will count a saved board's cut the same way VOLUME does.
- **The deck stays where it was planed.** A contour only takes foam from below: a concave lifts the stringer and leaves
  the rails; a vee or a belly leaves the stringer and lifts the rails.
- **The 1/4" floor holds at every point across, rails included (D-33).** Where a tip is thin, a full-depth vee or
  belly is cut shallower near the rails rather than through the deck.
- **The 3D board and the CNC files show the cut** with no change of their own, and the 3D board still holds a hair
  less foam than the litres (0.03% to 0.06% under on every board tried, inside Phase 16's limit of 0.15%).
- **Flat boards don't move.** All 102 pinned test boards read their pinned litres to the last digit three ways: with no
  bottom, with the default flat bottom, and with flat sections carrying other numbers and the channels off. No preset
  card moves, because the presets stay flat.

## The figures (the app's own, each computed by the picture script; none is typed in a test)

| Board | Cuts (starting numbers) | Litres flat | With the cuts | Foam off (DATA's line) | Sketch's slab figure | App / sketch | 3D mesh vs litres | STL closed |
|---|---|---|---|---|---|---|---|---|
| Shortboard | Deep Single Concave | 29.61 | 28.87 | 0.74 L | 0.75 L | 1.000 | −0.043% | yes |
| Fish | Panel Vee | 34.65 | 34.34 | 0.31 L | 0.31 L | 0.993 | −0.041% | yes |
| Mid-length | Rolled Belly Entry · Shallow Single · Rolled Vee | 49.40 | 47.40 | 2.00 L | 2.05 L | 0.978 | −0.026% | yes |
| Longboard | Rolled Belly Entry · Shallow Single · Rolled Vee | 73.61 | 71.18 | 2.43 L | 2.84 L | 0.858 | −0.057% | yes |
| Fish, winged | Extending Single Concave | 34.58 | 34.45 | 0.13 L | 0.13 L | 1.002 | −0.039% | yes |

The mesh relation was also run with a Rolled Belly Entry, a Deep Single and a Rolled Vee on all five boards, at their
starting numbers and with every Depth at 1/2": 0 open, non-manifold, mis-wound or zero-area triangles every time; the
mesh 0.027% to 0.063% under the litres; no column inverted, no area NaN. A surface with a cut builds in 53–125 ms.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | The seam: the bottom lifted, the deck held, the floor at every column, flat boards bit for bit | e8ab0ede | volume.ts/.test, design.ts/.test, bottom.ts/.test, phase17-litres-pin.test.ts |
| 2 | The 3D board and the CNC files carry the cut; the source rules | 7c52aa57 | board-surface.test.ts, cnc-files.test.ts, bottom.test.ts, bottom-source.test.ts |
| 3 | The founder's look | checkpoint (picture committed with this summary) | pictures/17-03-litres-and-sections.png, pictures/17-03-pictures-source.tar.gz |

## Verification

- **The pin, three ways and forced:** `phase17-litres-pin.test.ts` passes 207 cases: all 102 boards read their pinned
  litres (`toPrecision(17)`) with no bottom, `DEFAULT_BOTTOM`, and flat sections with other numbers and channels off;
  with the seam forced on through `foamOffAt: () => 0`, every station area is `Object.is` equal and the litres still
  read the pin. The pin script now refuses: `extract-phase17-litres-pin.ts` prints "the pin records the litres from
  before the bottom seam — it is never re-run" and exits 1; the pin file is unchanged.
- **The column map** (`volume.test.ts`): the deck run and the rail's outermost point never move (`Object.is`); a
  planed-bottom point rises by exactly the foam off; with nothing to take off every point comes back as the same pair;
  asked for more than the foam holds, no bottom point leaves under 1/4" and each shortened point is listed in
  `flooredAt`; a column with no deck over it is left alone, nothing NaN.
- **Litres relations** (`design.test.ts`): every one of this wave's 10 cuts on the five boards makes the litres fall,
  never by more than the sketch's slab figure (+0.5%); every single concave on the four short-railed boards falls within
  0.5% of the sketch's; the Shortboard's and winged Fish's openings within 0.5%; the Mid-length's three cuts together
  fall by what the three take off one at a time (within 0.1%).
- **3D and files** (`board-surface.test.ts`, `cnc-files.test.ts`): the 10 trio runs above; a swallow (a single run into
  the notch cuts nothing there, station areas `Object.is`; a Panel Vee cuts both pieces); a diamond (a Panel Vee cuts
  behind the tail block); the blank-less `stock|hard` board; the surface ring equals the bottomed half point for point.
  The Shortboard's CNC slice at its Deep Single's deepest station stands `foamOff(station, 0)` above the flat board's
  at the stringer within 0.05 mm, read back from the XYZ file; the STL welds back to one closed skin.
- **Source rules** (`bottom-source.test.ts`): `volume.ts` imports none of `./outline`, `./wings`, `./fins`, `./bottom`;
  no file under `components/` or `lib/export/` defines `sec`, `rise`, `chan` or names a `cutOff` (proved against its
  own fixture strings, and finding them in `bottom.ts`); no app file names or imports the reference copy.
- **Tests that can fail:** dropping the notch wall from `bottomSampler` failed 2 tests (reverted).
- `npx tsc --noEmit` exits 0; `npm run lint` 0 errors (the same unrelated warning in
  `lib/db/import-designs-action.test.ts`); `npm test` 183 files, 10,666 passed after Task 1 and 10,684 after Task 2.
  `PW_PORT=3303 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts e2e/volume-fins-panels.spec.ts
  e2e/three-d-export.spec.ts --project=desktop`: 22 passed, EXIT 0, no picture changed.
- `git diff --stat 7c380616 HEAD -- lib/geometry/finished-rail.ts lib/geometry/__fixtures__/phase17-litres-pin.json
  drizzle lib/db/schema.ts lib/geometry/board-surface.ts lib/export/cnc-files.ts lib/export/dxf.ts lib/export/xyz.ts
  lib/export/stl.ts` prints nothing. The surface, STL, DXF and XYZ writers needed no change.

## Deviations from Plan

1. **[Measured, not bent] The Fish's opening falls 0.69% short of the sketch, not within 0.5%.** The gap is the 1/4"
   column floor (D-33) at the tail's last 6", where the rail is thin: with no column floor the same cut falls within
   0.06% of the sketch. The test pins exactly that (the fall with the floor is less; with the floor lifted it is within
   0.5%) rather than the plan's 0.5% on the Fish. Raised for the founder below.
2. **[Measured, not bent] The Mid-length trio has no figure of its own in the golden.** The plan asked for it within
   0.5% of the golden "where the golden has them"; the golden has each cut alone. The trio's fall equals the sum of the
   three cuts alone within 0.1%, and is not more than the three sketch figures together — pinned as that. Its bellies
   and vees fall 1.5–3.5% short of the sketch on every board (more on the Longboard, 14–18%), the finished rail taking
   foam the sketch's slab counted, as D-34 records.
3. **[Measured, not bent] Smoothness moves the litres by 0.0004 L, not under 0.0001 L (D-06).** On the Shortboard's Deep
   Single, Smoothness 0, 50 and 100 read 28.86585, 28.86604 and 28.86624 L. The two section curves hold the same foam
   exactly; the difference is the 3D ring's 24 points across the bottom sampling a rounded concave less closely than a
   straight one. The plan's prohibition keeps that point count, so the test pins "under 0.1% of the foam the cut takes
   off" (it is 0.05%). A denser bottom run on cut boards (the research's channel re-lay, 17-05) would close it.
4. **[Rule 3] `designCrossSectionInput` keeps one `return { … }`** with `foamOffAt` spread in, because
   `components/design/design-store.test.ts` reads that function's source for `thicknessAt: profile.thicknessAt` inside its
   `return {`. A first version that returned a `const input` failed it; no file outside the plan was changed.
5. **The commit trailer** is `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, the model that did the work and
   the session's attribution rule, as waves 1 and 2 recorded; the orchestrator's ruling named another model.
6. **One commit per task** (the orchestrator's ruling), so no separate test-first commits; the column-map, pin and
   litres tests were written against the new functions before they were run.

## Notes for later plans

- **The CNC files' z = 0.** The files keep z = 0 at the planed bottom's lowest point (the rocker). On a board whose
  lowest rocker point is cut (a concave or vee across the whole bottom there), the lowest foam point can stand a hair
  above z = 0. Nothing was changed in the writers; worth a look when 17-05+ words the export.
- **`flooredAt`** lists every point the floor shortened (several rail points can share one distance across); 17-05's
  warning reads it.

## Known Stubs

None.

## Threat Flags

None: no new endpoint, input or file path; the bottom reaches `volume.ts` as one closure built in `design.ts`.

## Founder's look: Pending

Picture: `.planning/phases/17-bottom-contours/pictures/17-03-litres-and-sections.png` (sources in
`17-03-pictures-source.tar.gz`). Awaiting "approved", or changes. Three things to look at:

1. Each bottomed section holds its deck and only takes foam from below.
2. The litres fall by about what the sketch said on the short-railed boards; every flat figure is exactly today's.
3. Near a thin tip a full-depth vee or belly is cut shallower at the rails (the last row). Look closely: the floor
   leaves a small downward lip right at the rail, where the deck over the rail is under 1/4" thick, so the vee rises
   toward the rail and then drops back to the planed bottom at its very edge.

## Self-Check: PASSED

All created files exist; commits e8ab0ede and 7c52aa57 are on the branch; both pictures are in `pictures/`.
