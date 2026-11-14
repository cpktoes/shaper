---
phase: 16-3d-board-and-cnc-export
plan: 11
subsystem: 3D screen (the blank ghost, Contour Stripes, theme following, the loading picture)
status: complete
tags: [3d, blank, contour-stripes, theme, loading, D-08, D-11, D-12, D-16, D-17]
requires:
  - "16-06…16-10: mountBoardScene / BoardSceneHandle, the board's `centred` group, the fins group, SceneColours, readSceneColours, ThreeDShow (Fins), THREE_D_COPY (blank, noBlankHint, contourStripes, contourStripesHint, gettingReady)"
  - "lib/geometry/blank-top-view.ts buildBlankTopView; BlankSideView bottomAt / deckAt; rocker-top-view.tsx TOP_VIEW_SAMPLES (ROCKER's own sampling)"
  - "16-08: threeDTileArt, buildRackBoardArt"
provides:
  - "lib/geometry/blank-ghost.ts: buildBlankGhost, BlankGhost, GHOST_RING_POINTS, GHOST_RAIL_RADIUS_SHARE, GHOST_RAIL_RADIUS_MAX_SHARE_OF_HALF_WIDTH, GHOST_CORNER_EXPONENT"
  - "lib/geometry/three-d-tile-art.ts: threeDLoadingFrame (the loading picture framed as the first view at 1x)"
  - "BoardSceneHandle.setGhost(ghost, visible), setStripes(on), setColours(colours); STRIPE_PAIR_SLOPE_DEG"
  - "ThreeDShow: Fins, Blank (dimmed with its hint on a hand-set board), Contour Stripes (with its hint) — the SHOW section complete"
  - "e2e/three-d-show.spec.ts cases 3–8"
affects: [16-12]
tech-stack:
  added: []
  patterns:
    - "A see-through shell drawn after the board (renderOrder) with depthWrite off, in the board's own group, so it turns with it and never hides it"
    - "A zebra check as a ShaderMaterial: the reflection's angle round the room's tube axis over one pair's span, the edge softened by the angle's own derivative taken from the reflection vector (no seam at the wrap)"
    - "Theme following by repainting materials in place (a list of colours and the token each comes from), never a rebuild, so nothing moves"
    - "A dev-only candidate hook for the stripe density (`window.__shaper3dStripeSlopeDeg`), as 16-06's lighting candidates"
key-files:
  created:
    - lib/geometry/blank-ghost.ts
    - lib/geometry/blank-ghost.test.ts
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-11-blank-stripes-themes.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-11-pictures-source.tar.gz
  modified:
    - components/3d/board-scene.ts
    - components/3d/three-d-controls.tsx
    - components/3d/three-d-screen.tsx
    - e2e/three-d-show.spec.ts
    - lib/geometry/three-d-tile-art.ts
    - lib/geometry/three-d-tile-art.test.ts
decisions:
  - "Contour Stripes start at one dark-and-light pair per 12° of slope (the UI-SPEC's start point); 9° and 6° are shown beside it for the founder to choose"
  - "The ghost's section is a flat deck and bottom with superellipse rail corners (exponent 2.6) of radius half the blank's thickness, capped at 0.85 of the half-width near the tips"
  - "The ghost's veil is a little glossier than the foam (roughness 0.35) so it reads as glass"
  - "The loading line is in ink, not muted ink: it sits on the 3D ground, where muted ink falls to 2.26:1 in the light themes"
  - "Theme following re-reads the same five tokens the scene starts with; the ground is `--surf-3d-ground` (16-06's ruling), not `--surf-canvas` as the plan wrote"
metrics:
  duration: "about 80 minutes"
  completed: 2026-11-04
estimate:
  tokens: 105000
actuals:
  tokens: 13000
  tasks: 2
  commits: 3
---

# Phase 16 Plan 11: The blank, Contour Stripes, live theme colours and the loading picture Summary

The 3D board can now show the blank it is cut from as a see-through ghost round it, and swap its shading for contour
stripes that kink at a bump or a flat spot. Its colours follow the theme while the screen is open, and a quiet picture
of the board stands in while the drawing loads.

## What changes for the founder

- **A Blank tick box** sits under Fins in SHOW. It is unticked when the screen opens.
  - Tick it and the blank the board sits in on ROCKER is drawn round the board as glass. It uses the blank's printed
    widths (the line ROCKER's top view draws) and its prepared bottom and deck (the side view's curves).
  - Each station is a plain rounded section, never a maker's rail: a flat deck and bottom, with rails rounded to about
    half the blank's thickness. A one-dot line runs round its widest point, so you can see how far the foam reaches
    even where the glass is faint.
  - The glass is the muted ink at 18%, lit by the room. It is drawn over the board but never hides it.
  - The framing stays the board's, so a long blank can run past the edge of the window at 1x.
  - A blank that prints a width at its nose has a square nose, like the Fish's. A blank whose nose prints 0 is drawn
    round, like the Longboard's, by ROCKER's own rule.
  - On a hand-set board (no blank picked) the row is dimmed and can't be ticked. Under it, at full strength: "No blank
    on this board — pick one on ROCKER to see it here."
- **A Contour Stripes tick box** sits under Blank, with its line always shown: "Bands of light that kink at a bump or
  a flat spot." It is unticked when the screen opens.
  - Tick it and the foam's shading gives way to dark and light bands, half and half, with a soft one-dot edge. The
    bands are the reflections of a row of long tubes overhead in the room, running the way the board lies at rest.
  - The bands stay put in the room, slide over the board as you turn it, and bend where its shape bends. A flat shows
    as one broad band, a rail as a tight run of bands, and a bump or a flat spot as a kink.
  - Fins and the ghost draw as usual over the stripes, and the stringer stays on top.
  - **Density: one dark-and-light pair for every 12° of slope**, the starting point. The picture also shows 9° and 6°,
    so you can pick one. It is one number to change.
- **All three tick boxes only change the picture.** None is saved or undoable, none changes the board or the CNC files,
  and ticking any of them keeps the view exactly as it was. They work on a locked board. A tick made while the drawing
  is still loading applies when the board appears. They are dimmed only while a canvas message shows.
- **The colours follow the theme while the screen is open.** Switch the theme in App Default Settings, or let your
  computer change between light and dark under System, and the ground, foam, stringer, fins, ghost and stripes repaint
  at once. The turn, the zoom and the slide stay as they were. The foam is white in every theme, Phosphor included,
  under lighting B.
- **The loading picture.** While the drawing's code is still on its way, the window shows the board's turned outline,
  the 3D tile's own drawing, lying nose left at the size the lit board will take. After a second still loading,
  "Getting the 3D view ready…" appears under it. The lit board then replaces it in one frame, with no fade.

## For the founder (the four questions at this look)

1. Open `pictures/16-11-blank-stripes-themes.png`. Does the ghost read as the blank, glassy, showing the foam that comes
   off, without hiding the board?
2. Do the stripes read as a shaping check, with the bands bending where the shape bends, rather than as decoration? The
   density starts at 12° per pair, with 9° and 6° shown beside it.
3. The four themes: is the foam white everywhere, Phosphor included, and is the board's edge visible all round in
   Daylight and Chalk?
4. Is the hand-set board's Blank row dimmed, with its reason?

## The picture

`.planning/phases/16-3d-board-and-cnc-export/pictures/16-11-blank-stripes-themes.png` is the real app at /design/3d,
shot from this worktree's server on port 3211. It has:
1. Blank: the Fish in the first view, the Deck view and the Side view, and the Longboard's round-nosed blank.
2. Contour Stripes at 12°: the Fish in the first view and turned 30° and tipped 15°, and the Shortboard's Deck and
   Bottom views.
3. Contour Stripes at 9° and 6°, the Fish in the first view and turned.
4. The rest view in Daylight, Chalk, Slate and Phosphor, plus Slate with Blank ticked and Phosphor with Contour Stripes.
5. The panel's SHOW section on a hand-set board and on a board in a blank, and the loading picture (the drawing's code
   held back on purpose).

The scripts are in `pictures/16-11-pictures-source.tar.gz` (pictures.config.ts, shots.spec.ts, compose.js).

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (tracer) | The picked blank as a see-through ghost round the board, behind a Blank tick box that says why it's dimmed on a hand-set board | 5cac737c | lib/geometry/blank-ghost.ts (+test), components/3d/board-scene.ts, three-d-controls.tsx, three-d-screen.tsx, e2e/three-d-show.spec.ts |
| 2 | Contour Stripes, colours that follow the theme while the screen is open, and the loading picture | 36e1c0d4 | components/3d/board-scene.ts, three-d-controls.tsx, three-d-screen.tsx, lib/geometry/three-d-tile-art.ts (+test), e2e/three-d-show.spec.ts, the two pictures |
| 3 | The founder looks at the blank, the stripes and the four themes (checkpoint) | (this SUMMARY's commit) | this SUMMARY |

**Tracer gate:** after Task 1, `e2e/three-d-show.spec.ts` cases 3 and 4 passed on all three projects, and the ghost was
shot and looked at, before any Task 2 work. As in 16-06…16-10, the interactive tracer checkpoint is folded into the
orchestrator's single checkpoint at Task 3.

## Verification

- **`npx vitest run lib/geometry/blank-ghost.test.ts`: 32 passed.** The tests:
  - a hand-set board has no ghost, and every preset has one;
  - for each preset at ROCKER's sampling (120) and a coarser one (40), every section's deck and bottom on the stringer
    are the side view's `deckAt` / `bottomAt`, and both apexes are the top view's half-width at mid-thickness, to 1e-6 mm
    against the 32-bit stored value. No point of a section is wider, higher or lower than those;
  - the skin is closed (`meshCheck` zeros), wound outward, with unit normals;
  - the blank holds more foam than the board cut from it;
  - the outline runs round every station's widest point, both rails, plus a point at a 0-wide tip;
  - a tip printed 0 wide closes to a point on the stringer, and a tip with width closes flat;
  - a non-number figure gives no ghost (T-16-23).
- **`npx vitest run lib/geometry/three-d-tile-art.test.ts`: 33 passed**, including 5 new tests: the loading frame is the
  turned board's own box grown by 1 / 0.85 about its centre, and drawn into a canvas of any shape the board fills exactly
  85% of the tighter side.
- **`npm test`:** 7435 passed, 2 skipped. The one failure was the known heavy file, `lib/models/rack-stand-in.test.ts`,
  timing out under the shared machine's load. Run alone with `--testTimeout=120000` it passes (34/34).
- **`npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors.** The one warning, in `lib/db/import-designs-action.test.ts`,
  was there before.
- **`components/design/board-lock-scope.test.ts` and `components/3d/three-source.test.ts`:** pass. The two new
  `Checkbox`es carry `data-lock-exempt`, and three.js is still imported by board-scene.ts alone.
- **Browser runs on port 3211:**
  - `e2e/three-d-show.spec.ts`, `three-d-screen.spec.ts`, `three-d-view.spec.ts` and `three-d-zoom.spec.ts`, all three
    projects: **79 passed, 35 skipped** by design.
  - `e2e/three-d-hard-edge.spec.ts` and `e2e/desktop-baseline.spec.ts` on desktop: **7 passed**, so no desktop picture
    moved. `--update-snapshots` was never used.
- **What the new spec cases check:**
  - Case 3 (three projects): on the Fish, Blank is unticked and enabled with no hint. Ticking it changes more than 0.5%
    of the canvas with the turn and the crop kept. Unticking brings back the first picture, pixel for pixel on a
    computer.
  - Case 4 (three projects): on a hand-set Fish, Blank is disabled and unticked, its hint is shown, and Fins stays live.
  - Case 5 (three projects): with Contour Stripes ticked, more than 10% of the board is the stringer's dark. A small
    drag turns the board and the bands move (over 1% of the canvas changes). Unticking brings the shading back, and the
    hint is shown throughout.
  - Case 6 (desktop): switching to Slate through App Default Settings with the board turned repaints the ground to
    Slate's `--surf-3d-ground`. The turn is unchanged and the drawing never reloads.
  - Case 7 (desktop): with the drawing's chunk (learned from a first visit) held back 2.5 s, the loading picture's two
    paths show with `aria-busy="true"`. The line follows under the board. Then the lit board replaces both and
    `aria-busy` clears.
  - Case 8 (three projects): on a locked board, all three tick boxes are enabled and tick.
- **Acceptance greps:**
  - `ShaderMaterial` in board-scene.ts: 3.
  - `MutationObserver` in three-d-screen.tsx: 1.
  - `threeDTileArt(` in three-d-screen.tsx: 1.
  - `surf-accent` in board-scene.ts: 0.
  - `depthWrite: false` in board-scene.ts: 1.
  - The no-blank hint in three-d-copy.ts: 1.
  - `useDesign|design-store` in three-d-controls.tsx: **2, not 0.** See deviation 1.
- **D-16:** nothing in `lib/export/` was touched, and the CNC files still read the bare board alone. The ghost and the
  stripes live only in the scene.

## Deviations from Plan

### Auto-fixed Issues

**1. [Interpretation] The "switches never touch the board" grep can't read 0**
- **Issue:** the plan's acceptance grep expects `useDesign|design-store` to appear 0 times in three-d-controls.tsx. But
  that file also holds the HARD EDGE section (D-30, added after this plan was written). That section reads and writes
  the board's two tail values on purpose, so the file imports the store.
- **Fix:** the rule the grep stood for still holds. `ThreeDShow` reads nothing from the store: its three ticks come from
  the screen's own local state as props, and it calls no store setter. Its doc comment now says so.
- **Files modified:** none beyond the plan's.
- **Commit:** 5cac737c

**2. [Rule 2 - CLAUDE.md Rule 1] The loading picture's framing went into `lib/geometry/three-d-tile-art.ts`**
- **Issue:** placing the turned outline at the rest view's 1x size needs the board's unpadded box, grown by 1 / 0.85.
  Under CLAUDE.md Rule 1 that maths belongs in `lib/geometry/` with tests, not inline in a component, so it couldn't go
  in the screen.
- **Fix:** a new `threeDLoadingFrame(art)` returns the grown view box and the box's aspect ratio, with 5 tests in
  `three-d-tile-art.test.ts`. The screen still calls `threeDTileArt(` for the paths, once.
- **Files modified:** lib/geometry/three-d-tile-art.ts, lib/geometry/three-d-tile-art.test.ts (outside `files_modified`)
- **Commit:** 36e1c0d4

**3. [Rule 2 - Legibility] The loading line is in ink, not muted ink**
- **Issue:** the UI-SPEC put the line in 12/400 muted ink on the canvas. Since 16-06 the window's ground behind the board
  is `--surf-3d-ground`, which is darker than the canvas in the light themes. Muted ink there is 2.26:1.
- **Fix:** the line is 12/400 in `text-surf-ink`: 5.20 (Daylight, Chalk), 15.29 (Slate), 7.84 (Phosphor). Computed from
  the ramps.
- **Files modified:** components/3d/three-d-screen.tsx
- **Commit:** 36e1c0d4

**4. [Interpretation] The ground re-read is `--surf-3d-ground`**
- **Issue:** the plan lists `--surf-canvas` among the tokens to re-read. The scene's ground has been `--surf-3d-ground`
  since 16-06 (the founder's ground pick).
- **Fix:** the theme observer re-reads the same five tokens the scene starts with: `--surf-3d-ground`, `--surf-foam`,
  `--surf-on-foam`, `--surf-ink-muted` and `--outline-blank-line`. Spec case 6 checks the ground against
  `--surf-3d-ground`.
- **Files modified:** components/3d/three-d-screen.tsx
- **Commit:** 36e1c0d4

**5. [Test approach] Case 4's hand-set board comes from a kept open board with no blank**
- **Issue:** the plan suggested removing the blank on ROCKER, as `rocker-remove-blank.spec.ts` does.
- **Fix:** the spec keeps the Fish as the open board with `blank: null`. That is the very board Remove This Blank
  leaves, and it skips a second screen.
- **Files modified:** e2e/three-d-show.spec.ts
- **Commit:** 5cac737c

**6. [Test setup] Case 3 opens on the Fish, not the default board**
- **Issue:** the default board on a fresh visit to /design/3d is hand-set, with no blank, so Blank was disabled there.
- **Fix:** the case keeps the Fish preset as the open board, which opens in its blank.
- **Files modified:** e2e/three-d-show.spec.ts
- **Commit:** 5cac737c

### Other notes

1. **No new words and no new tokens.** `THREE_D_COPY` already carried all five strings, so three-d-copy.ts and
   app/globals.css are untouched. The Colour Bench needs nothing.
2. **A dev-only density hook.** Like 16-06's `window.__shaper3dLighting`, a picture script can set
   `window.__shaper3dStripeSlopeDeg` on a development server to shoot a density candidate (a whole divisor of 180, so the
   bands meet themselves where the reflection points straight down). A production build never reads it. The founder's
   pick becomes `STRIPE_PAIR_SLOPE_DEG`.
3. **Stored as 32-bit.** The ghost's positions are a `Float32Array`, as three.js draws them. The tests compare each with
   its expected value rounded the same way (`Math.fround`), to 1e-6 mm.
4. **A note for 16-16 (D-33/D-34) from the stripes.** At 12° the stripes show faint steps at some stations along the deck
   and a few small kinks at the tips. That is the zebra doing its job: it shows the loft's own station-to-station
   facets and the tip shaping 16-16 is planned to smooth.
5. **Nothing was written** to `lib/export/`, STATE.md, ROADMAP.md or any desktop picture.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model.
- **T-16-23** is mitigated: a non-finite blank figure gives no ghost (tested), and the Blank row stays dimmed with its
  reason. The sample count is ROCKER's own fixed count.
- **T-16-24** is mitigated: one `MutationObserver` and one media listener, disconnected on unmount. A recolour repaints
  in place and asks for one frame.

## Self-Check: PASSED

- FOUND: lib/geometry/blank-ghost.ts, lib/geometry/blank-ghost.test.ts, pictures/16-11-blank-stripes-themes.png,
  pictures/16-11-pictures-source.tar.gz, and every modified file listed.
- FOUND commits: 5cac737c, 36e1c0d4.
- No scratch script under the repo or `.planning`; the picture scripts are only in the archive.

## Founder's look

Presented by the orchestrator at the Wave 8 checkpoint, 2026-11-04, with the blank / stripes / themes picture. The
founder: "Approved"; Contour Stripes stay at 12° per pair; the blank's veil stays at 18% ("Fine as is"). Merged into
`board-3d` as a4c9efe0. The deviations (the loading line in full ink, the loading-frame helper in the tile-art module,
the theme re-read on the 3D ground token, the dev-only density hook) were accepted by the orchestrator.
