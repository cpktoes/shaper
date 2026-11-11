---
phase: quick-261110-tvk
plan: 01
subsystem: 3d-export
tags: [brd, akushaper, shape3d, bezier, des, md5, export]
requires:
  - phase: 16-3d-board-and-cnc-export
    provides: buildBoardSurface, boardSlices, boardFileOutlineLoop, the zip/DXF/STL/XYZ writers
  - phase: 17-bottom
    provides: BOTTOM's cut (concaves and channels) already in the surface's slices
provides:
  - "Export .brd File: one scrambled AkuShaper board file per tap, replacing the zip on the 3D button"
  - "MD5, DES-CBC and AkuShaper's .brd envelope in pure TypeScript (lib/export)"
  - "Bezier knot fitter (lib/geometry/bezier-fit.ts) and three new surface readers"
affects: [3d-page, e2e]
tech-stack:
  added: []
  patterns:
    - "Every .brd curve is fitted to points read off the very surface the 3D screen draws, within 0.5 mm both ways"
key-files:
  created:
    - lib/export/md5.ts
    - lib/export/des.ts
    - lib/export/brd-scramble.ts
    - lib/export/brd-scramble.test.ts
    - lib/export/brd.ts
    - lib/export/brd.test.ts
    - lib/geometry/bezier-fit.ts
    - lib/geometry/bezier-fit.test.ts
  modified:
    - lib/geometry/board-surface.ts
    - lib/export/formats.test.ts
    - components/3d/export-cnc.ts
    - components/3d/three-d-copy.ts
    - components/3d/three-d-screen.tsx
    - e2e/three-d-export.spec.ts
    - e2e/board-lock-screens.spec.ts
key-decisions:
  - "A squared tail or nose that already has its own cross-section at the tip gets no extra empty section beside it (two sections at one station would divide by a zero distance)"
  - "A swallow's notch: the outline runs from the crotch back to the swallow's point; notch sections are the rail-side piece only, measured from the stringer line, plain corner ends, no mirror"
  - "Fins are not written (brief decision 6); p08/p10/p45/p48/p49/p51/p54/p58 are left out"
duration: about 1 hour
completed: 2026-11-10
status: complete
actuals:
  tokens: 25000
  tasks: 3
  commits: 3
---

# Phase quick-261110-tvk Plan 01: Export .brd File Summary

**The 3D page's export button now downloads one scrambled AkuShaper `.brd` of the finished board (outline, bottom rocker, deck and a cross-section at every litres station, BOTTOM's cuts included), fitted to within 0.5 mm of the board on screen.**

## What the founder should open first

**Open the Fish.** Its swallow notch is the case most worth a look (the outline, and the notch sections, are written in a way the programs may or may not like). Open it in AkuShaper and in Shape3D, then the Shortboard with the Deep Single and 4 channels (the concaves and the channel steps should show in the cross-sections), then the flat Shortboard (its tail is squared, see below).

Three ready-made test files, made by our own writer from our own three test boards, are waiting so they can be opened before the page is ready:

- `/private/tmp/claude-501/-Users-kontoes-Code-shaper/86389bad-1284-4de0-86f8-1a82686fc51e/scratchpad/brd-out/fish.brd`
- `/private/tmp/claude-501/-Users-kontoes-Code-shaper/86389bad-1284-4de0-86f8-1a82686fc51e/scratchpad/brd-out/shortboard-deep-single-4-channels.brd`
- `/private/tmp/claude-501/-Users-kontoes-Code-shaper/86389bad-1284-4de0-86f8-1a82686fc51e/scratchpad/brd-out/shortboard-flat.brd`

(Each also has a `.plain.txt` beside it: the same board before scrambling. Our Fish file was also unlocked independently with `openssl enc -d -des-cbc` and matched our own plain text byte for byte.)

**Our header leaves out `p08`, `p45` and `p10`, which his TEST3 still had** (also `p48`, `p49`, `p51`, `p54`, and `p58`). His TEST3 opened without `p58`; this is the first time the programs will see a header without the name fields and without `p10` (a blank's file path on someone's PC). His real double-concave file has no `p10`/`p45` and his Fryer has no `p08`/`p10`, so AkuShaper writes files like that itself, but his first open of one of our files is the real proof. If either program complains, `p08`, `p45` and `p10` are the first three to put back.

## What changed, in plain English

- **The button** reads "Export .brd File", with "A board file for AkuShaper or Shape3D." under it. The "experimental" sentence is gone. One tap downloads `Fish 5'10.brd` (or `Untitled Board.brd` for an unnamed board); the line under the button names the file and says how many cross-sections it holds. It still works on a locked board and in a browser that can't draw in 3D, saves nothing, and Fins / Blank / Contour Stripes / Wire View / Room / the view controls never change a byte of the file.
- **The file** is the board's text in centimetres, tail at 0, locked the way AkuShaper locks its own files (the 12 characters `%BRD-1.02s00`, then DES-locked text). The lock was written from the standards (MD5 and DES) and checked against the published test values, against `openssl` and against the key and starting value the founder proved on 2026-11-10 (`8c41236a7fc96bce` / `7aff2c48277a18dd`).
- **Every curve** is a run of smooth curve knots fitted to points of the surface to within half a millimetre (1/50") both ways. Channel walls, the swallow's notch and a square tail's corners stay sharp knots; the outline's widest knot is the board's own wide point.
- **The zip, DXF, STL and XYZ writers and all their tests are untouched** and still pass; only the button stopped offering the zip (`exportForCnc` is kept, with a comment saying so).

## Numbers for the three test boards

| Board | Outline knots | Bottom knots | Deck knots | Sections | Most knots in a section | Most sharp knots in a section | File size | Worst stray from the board |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Shortboard, flat | 11 | 9 | 13 | 50 | 14 | 1 | 52,804 bytes | 0.499 mm |
| Fish (swallow) | 11 | 7 | 12 | 49 | 12 | 3 | 55,188 bytes | 0.498 mm |
| Shortboard, Deep Single + 4 channels | 13 | 9 | 13 | 50 | 16 | 5 | 62,580 bytes | 0.500 mm |

Every curve on every board is under 40 knots and inside the half-millimetre limit.

**Time:** `brdFile` (fit + text + scramble) takes about 180 ms warm for the Longboard (278 rings, 50 sections, 59.6 KB) in Node; the Mid-length is the same. The tap-time cost is well under a second.

## How a swallow's notch is written (brief decision 3, for the founder's overrule)

- The **outline** (`p32`) starts on the stringer at the **crotch**, runs back along the notch's edge to the **swallow's point** at x = 0 (a sharp knot), then along the rail to the nose.
- The **cross-sections inside the notch** carry the **rail-side piece only**: one curve from the notch wall out round the rail and back to the wall, its distance across measured from the stringer line (so its first knot stands off the stringer, x > 0), with plain corner ends and no mirrored handle. Sections outside the notch start and end on the stringer with a level handle and the mirrored handle across it, like the founder's egg.

## The three words changed beyond the brief's

Discretion call (three lines named the old button or said "files"):

- `browserCantDraw.line2`: "Export .brd File still works — the file doesn't need the drawing."
- `exportWorking`: "Making the file…"
- `exportFailed`: "Couldn't make the file — try again."

## Deviations from Plan

**1. [Rule 1 - Bug in the plan's assumption] A squared tail gets no extra empty section.**
- **Found during:** Task 2 round-trip test.
- **Issue:** The preset Shortboard's tail is squared (4" wide at x = 0), so a real litres slice already stands at station 0. The plan always wrote an empty section at 0 and at the length, which would put two sections at station 0.0 (and the plan's test, "stations rising from 0.0", could not hold).
- **Fix:** An empty tip section is written only where no real section stands at that tip. The Fish and the other pointed tips still get both. The section count is then `slices + 2` for pointed ends and fewer for a squared tail or nose. `sectionCount` (the number on the status line) is still the real sections only.
- **Files:** `lib/export/brd.ts`, `lib/export/brd.test.ts`. **Commit:** c694c1fb.
- **For the founder:** the flat Shortboard is therefore the file whose tail-end section is a real one. Worth opening to confirm AkuShaper is happy with a first section that is not the empty one.

**2. [Test expectation, not the product] Channel sharp-knot count.**
- The plan expected some section with at least 8 sharp knots. On the 4-channel board the most is 5: in this app's channels each step has one vertical wall (2 sharp corners) and a ramp, two steps a side give 4, plus the rail's hard edge. The test now asserts the cut board's sharpest section has at least 4 more sharp knots than the flat board's. The channels are present and sharp.
- **Commit:** c694c1fb.

**3. [Rule 2 - correctness] The fitter draws a span straight when it has no point left to split at but is still off by more than the tolerance**, so accuracy never loses to the knot count. It never triggered on the test boards.
- **Commit:** c694c1fb.

## Other facts worth knowing

- **Rocker datum.** A cut board's stringer bottom can sit above the surface's z = 0 (the lowest point of the whole bottom is a rail edge, e.g. Deep Single: stringer 5.09 mm vs rail 0.20 mm at the deepest station), so the bottom rocker curve in the file reads a few mm above 0 there. Sections are measured from the stringer, as the format wants.
- **Browser specs (`three-d-export.spec.ts`, the `x-3d` case of `board-lock-screens.spec.ts`) were NOT run here.** The dev server cannot start in this worktree: Turbopack stops with "Symlink [project]/node_modules is invalid, it points out of the filesystem root" (the linked `node_modules`). Not worked around, per the plan. Left for the orchestrator to run from the main checkout: `PW_PORT=3117 npx playwright test e2e/three-d-export.spec.ts e2e/board-lock-screens.spec.ts -g "Export|x-3d" --project=desktop`. They type-check and lint clean.
- **The 3D desktop baseline picture will differ.** `e2e/desktop-baseline.spec.ts` pins the 3D panel (`three-d-desktop.png`), which shows the export button and its note; both words changed. It was not touched. The orchestrator should inspect the diff and re-record it from the main checkout.
- **AGENTS.md:** the dev server did not touch it (nothing to leave out of the commits).

## Verification run here

- `npx vitest run` on `lib/geometry/bezier-fit.test.ts`, `lib/export/brd.test.ts`, `lib/export/brd-scramble.test.ts`, `lib/export/formats.test.ts`: 92 tests pass. `lib/export/cnc-files.test.ts` (guard for the surface and its readers): 39 pass. The whole suite was not run (the orchestrator's).
- `npx next typegen && npx tsc --noEmit`: clean. `npm run lint`: 0 errors (one old unused-variable warning in `lib/db/import-designs-action.test.ts`, not ours).
- `npm run build` skipped (does not work in a worktree).
- No founder `.brd` file was copied into the repo or a fixture; tests use only the app's own boards, published vectors and openssl's outputs.

## Commits

- f0fdb839: The 3D page can now lock a board file the way AkuShaper locks its own
- c694c1fb: A board can now be written as an AkuShaper .brd file
- 411737d6: The 3D page's export button now downloads one AkuShaper .brd file of the board

## Known Stubs

None.

## Threat Flags

None. No new network call, route, database change or saved value; the board's name reaches the download name only through `boardFileStem` plus a fixed `.brd`, and never the file's text.

## Self-Check: PASSED

All created files exist (`lib/export/md5.ts`, `des.ts`, `brd-scramble.ts`, `brd.ts`, their tests, `lib/geometry/bezier-fit.ts` and its test) and commits f0fdb839, c694c1fb and 411737d6 are on `close-bottom-17`.
