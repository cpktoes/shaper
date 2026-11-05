---
phase: 16-3d-board-and-cnc-export
plan: 17
subsystem: 3D fins, FINS' twin defaults, the 3D viewer's corner, the wire view
status: complete
tags: [geometry, fins, 3d, viewer, toolbar, wire-view, D-16, D-17, D-21, D-22, D-25, D-35, D-36, D-42]
requires:
  - "16-16: the surface as merged, boardOutlineLoop, the refusing-pin idiom, three-d-desktop's last recording"
  - "16-15: ThreeDTailRail, the panel's first group"
  - "16-12: EXPORT, three-d-export case 4"
  - "16-11: setStripes, the ghost, THREE_D_COPY's switch words"
  - "16-10: placedFins, finSolid, the fin picture harness"
  - "16-09: the corner toolbar, ViewerZoomRow"
provides:
  - "lib/geometry/fin-outline.ts: FIN_TEMPLATES, FIN_ROLE_TEMPLATE, FIN_ROLE_DEPTH_IN, FIN_QUAD_REAR_OF_FRONT, FIN_SINGLE_BASE_OF_DEPTH, FIN_TWO_PLUS_ONE_SHORTER_IN, FIN_THICKNESS_IN, finTemplateFootprint; finOutline by Rule A; eight roles; FinOutline.footprint and .template"
  - "lib/geometry/fins.ts: TWIN_FORWARD_BASE_IN, defaultForwardBaseLength, twinTemplateChange; resetAdvanced(setup, twinTemplate)"
  - "lib/geometry/board-surface.ts: wireLines, wireSegments, WIRE_RING_STEP_IN, WIRE_LINE_SPACING_IN; SurfaceRing.right and .left; BoardSurface.width"
  - "lib/geometry/__fixtures__/phase16-fin-cases.ts (phase16FinCases, finMeasures), phase16-fin-pin.json, scripts/extract-phase16-fin-pin.ts (refuses to re-run)"
  - "components/3d/three-d-show-buttons.tsx: ThreeDShowButtons (Fins, Blank, Contour Stripes, Wire View)"
  - "components/viewer/toolbar-button.tsx: ContourStripesIcon"
  - "components/3d/board-scene.ts: setWire; BoardSceneInput.wire"
affects: [16-13]
tech-stack:
  added: []
  patterns:
    - "A fourth refusing pin generator, committed alone before the maths changed"
    - "A fin is a template stretched by Rule A: every expected figure follows from the template, so tests assert relations"
    - "Rings keep their half-sections slot for slot (`right`, `left`), so a line between two rings runs along the mesh's own edges"
    - "aria-disabled, not disabled, on a toolbar button whose tooltip must still show"
key-files:
  created:
    - lib/geometry/__fixtures__/phase16-fin-cases.ts
    - lib/geometry/__fixtures__/phase16-fin-pin.json
    - lib/geometry/phase16-fin-pin.test.ts
    - scripts/extract-phase16-fin-pin.ts
    - components/3d/three-d-show-buttons.tsx
    - e2e/three-d-wire.spec.ts
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-17-outlines.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-17-fins-before-after.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-17-quad-and-keel.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-17-toolbar.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-17-wire-view.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-17-pictures-source.tar.gz
  modified:
    - lib/geometry/fin-outline.ts
    - lib/geometry/fin-outline.test.ts
    - lib/geometry/fins.ts
    - lib/geometry/fins.test.ts
    - lib/geometry/board-surface.ts
    - lib/geometry/board-surface.test.ts
    - components/fins/fin-controls.tsx
    - components/3d/board-scene.ts
    - components/3d/three-d-controls.tsx
    - components/3d/three-d-copy.ts
    - components/3d/three-d-screen.tsx
    - components/viewer/toolbar-button.tsx
    - components/viewer/toolbar-button.test.ts
    - components/design/board-lock-scope.test.ts
    - e2e/viewer-toolbar.spec.ts
    - e2e/three-d-show.spec.ts
    - e2e/three-d-export.spec.ts
    - e2e/three-d-zoom.spec.ts
    - e2e/board-lock-screens.spec.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/three-d-desktop-desktop-darwin.png
key-decisions:
  - "The wire view's long-line count reads the board's stated width, its wide point: the figure a shaper quotes, so a 6'0\" × 20\" board gives 20. The founder said \"center width\"; the width exactly at the board's middle can fall a hair short and lose a line"
  - "The rings stand evenly about the board's middle, as many as whole 1 1/2\" steps fit the length, so a 6'0\" board draws 48 and none falls on a tip with no width"
  - "A long line sits in the middle of its own inch, so an even count leaves the stringer clear and an odd count runs down it"
  - "Inside a swallow's notch a long line holds its share of the piece, wall to rail, so each piece gets every line and none stands in the air"
duration: about 3 hours
completed: 2026-11-05
metrics:
  tasks: 3 of 4 (the fourth is the founder's look)
actuals:
  tokens: 47000
  tasks: 3
  commits: 4
---

# Phase 16 Plan 17: Real fin shapes per setup, the switches as corner icons, and the wire view Summary

Every fin on the 3D board is now a basic real fin for its setup, stretched to FINS' own base and standing on FINS' dots; a keel's FINS base is the whole fin; a twin's base defaults to 5 1/2" upright and 6 1/2" keel; Fins, Blank, Contour Stripes and a new # for Wire View are icons in the drawing's corner; and the panel reads TAIL RAIL, VIEW, EXPORT.

## What changes for the founder

- **The fins look like fins.** Five shapes replace the one plain outline: a raked side fin (a thruster's three, a quad's fronts and centre), an upright twin, a cut-away keel, a small upright fin (a quad's rears, a 2+1's side bites, the trailer) and the classic raked longboard single (a 2+1's centre too, an inch shorter).
- **A change of base on FINS stretches the whole fin along the board.** Its depth stays.
- **A quad's rears are 25% shallower than its fronts:** 3.375" against 4.5".
- **A keel's FINS base is the whole fin,** leading edge to heel, both on FINS' dots. A 6.5" base is a 6.5" fin. The fin touches the board only along the front of that, 4.28" on a 6.5" keel, and the heel hangs over a gap behind it. The heel sits straight over the trailing dot, about 1" off the bottom. The body higher up rakes past it, as every fin's tip does.
- **FINS' twin defaults:** upright 5.5", keel 6.5", Upright + Trailer 5.5". Press Reset, switch to a twin, or change the twin template with the base not set by hand, and you get these. Only the leading dot moves. A base you set is kept.
- **No saved board and no preset changes.** A keel saved at 4.5" stays 4.5" until you press Reset or change its twin template, and keeps its "(standard)" label, as you ruled.
- **The switches are icons.** Fins (TEMPLATE's fin icon), Blank (ROCKER's blank-from-above icon), Contour Stripes (a new stripes icon) and # for Wire View sit beside Wide view, filled when on. The zoom row sits under them at every width.
- **Blank is dimmed on a hand-set board,** with its reason in its tooltip. A phone has no hover, so there the dimming is all it shows.
- **Wire View draws the board in thin lines:** a ring every 1 1/2", one long line per whole inch of width on the deck and again on the bottom, one outline loop at the rail's apex, near side only, on a plain foam. It and Contour Stripes are one look at a time.
- **None of this reaches the CNC files,** the litres, the saved board or undo.

## Pictures

All in `.planning/phases/16-3d-board-and-cnc-export/pictures/`, the scripts in `16-17-pictures-source.tar.gz`.

- `16-17-outlines.png`: every role flat on a 1" grid, today dashed and after solid, the keel at 4.5" and 6.5" with FINS' two dots.
- `16-17-fins-before-after.png`: every setup from below and aside, Side and Bottom, before and after.
- `16-17-quad-and-keel.png`: the quad's rear beside its front; the keel before, at 6.5" and at 4.5".
- `16-17-toolbar.png`: the corner on a computer, each switch pressed, a hand-set board, the panel before and after, and four phone views.
- `16-17-wire-view.png`: his Shape3D picture above the Fish and the Longboard, end-on, three-quarter and from below; the Fish on a white page for his call (not built); two dark themes; the corner on a computer and an iPhone.

### Every preset's fins, today and after

A pair is listed once. "Behind" is measured from the trailing dot on the board. Today's figures are the pin's; after is the app's, at FINS' new defaults.

| Board and setup | Fin | Shape | FINS' base | Root | Depth today → after | Area today → after (in²) | Sweep today → after | Tip behind today → after | Rearmost behind after |
|---|---|---|---|---|---|---|---|---|---|
| Shortboard opened | front | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Shortboard opened | center | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Shortboard single | center | single | 10.50" | 4.32" | 6.167" → 6.167" | 21.0 → 16.9 | 22.4° → 32.2° | 0.38" → 1.73" | 2.55" |
| Shortboard twin/upright | front | twin | 5.50" | 5.50" | 5" → 5" | 17.4 → 20.8 | 26.2° → 37.6° | 0.21" → 1.10" | 2.47" |
| Shortboard twin/keel | front | keel | 6.50" | 4.28" | 5" → 5" | 16.6 → 22.3 | 19.3° → 43.8° | -0.50" → 0.43" | 1.45" |
| Shortboard twin/trailer | front | twin | 5.50" | 5.50" | 5" → 5" | 17.4 → 20.8 | 26.2° → 37.6° | 0.21" → 1.10" | 2.47" |
| Shortboard twin/trailer | center | small | 4.50" | 4.50" | 4.5" → 3.375" | 15.6 → 11.8 | 30.2° → 39.1° | 0.37" → 0.50" | 1.84" |
| Shortboard thruster | front | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Shortboard thruster | center | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Shortboard 2plus1 | center | single | 10.50" | 3.62" | 6.167" → 5.167" | 21.0 → 11.9 | 22.4° → 32.2° | 0.38" → 1.45" | 2.13" |
| Shortboard 2plus1 | front | small | 4.50" | 4.50" | 4.5" → 3.5" | 15.6 → 12.3 | 30.2° → 38.1° | 0.37" → 0.50" | 1.84" |
| Shortboard quad | front | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Shortboard quad | rear | small | 4.50" | 4.50" | 4.25" → 3.375" | 14.7 → 11.8 | 31.6° → 39.1° | 0.36" → 0.50" | 1.84" |
| Fish opened | front | twin | 5.50" | 5.50" | 5" → 5" | 21.0 → 20.8 | 30.6° → 37.6° | 0.21" → 1.10" | 2.47" |
| Fish single | center | single | 10.50" | 3.97" | 5.667" → 5.667" | 17.8 → 14.3 | 22.0° → 32.2° | 0.31" → 1.59" | 2.34" |
| Fish twin/upright | front | twin | 5.50" | 5.50" | 5" → 5" | 17.4 → 20.8 | 26.2° → 37.6° | 0.21" → 1.10" | 2.47" |
| Fish twin/keel | front | keel | 6.50" | 4.28" | 5" → 5" | 16.6 → 22.3 | 19.3° → 43.8° | -0.50" → 0.43" | 1.45" |
| Fish twin/trailer | front | twin | 5.50" | 5.50" | 5" → 5" | 17.4 → 20.8 | 26.2° → 37.6° | 0.21" → 1.10" | 2.47" |
| Fish twin/trailer | center | small | 4.50" | 4.50" | 4.5" → 3.375" | 15.6 → 11.8 | 30.2° → 39.1° | 0.37" → 0.50" | 1.84" |
| Fish thruster | front | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Fish thruster | center | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Fish 2plus1 | center | single | 10.50" | 3.27" | 5.667" → 4.667" | 17.8 → 9.7 | 22.0° → 32.2° | 0.31" → 1.31" | 1.93" |
| Fish 2plus1 | front | small | 4.50" | 4.50" | 4.5" → 3.5" | 15.6 → 12.3 | 30.2° → 38.1° | 0.37" → 0.50" | 1.84" |
| Fish quad | front | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Fish quad | rear | small | 4.50" | 4.50" | 4.25" → 3.375" | 14.7 → 11.8 | 31.6° → 39.1° | 0.36" → 0.50" | 1.84" |
| Mid-length opened | front | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Mid-length opened | center | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Mid-length opened | rear | small | 4.00" | 4.00" | 4.25" → 3.375" | 13.2 → 10.5 | 29.1° → 35.9° | 0.36" → 0.44" | 1.64" |
| Mid-length single | center | single | 10.50" | 5.02" | 7.167" → 7.167" | 28.3 → 22.9 | 23.0° → 32.2° | 0.53" → 2.01" | 2.96" |
| Mid-length twin/upright | front | twin | 5.50" | 5.50" | 5" → 5" | 17.4 → 20.8 | 26.2° → 37.6° | 0.21" → 1.10" | 2.47" |
| Mid-length twin/keel | front | keel | 6.50" | 4.28" | 5" → 5" | 16.6 → 22.3 | 19.3° → 43.8° | -0.50" → 0.43" | 1.45" |
| Mid-length twin/trailer | front | twin | 5.50" | 5.50" | 5" → 5" | 17.4 → 20.8 | 26.2° → 37.6° | 0.21" → 1.10" | 2.47" |
| Mid-length twin/trailer | center | small | 4.50" | 4.50" | 4.5" → 3.375" | 15.6 → 11.8 | 30.2° → 39.1° | 0.37" → 0.50" | 1.84" |
| Mid-length thruster | front | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Mid-length thruster | center | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Mid-length 2plus1 | center | single | 10.50" | 4.32" | 7.167" → 6.167" | 28.3 → 16.9 | 23.0° → 32.2° | 0.53" → 1.73" | 2.55" |
| Mid-length 2plus1 | front | small | 4.50" | 4.50" | 4.5" → 3.5" | 15.6 → 12.3 | 30.2° → 38.1° | 0.37" → 0.50" | 1.84" |
| Mid-length quad | front | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Mid-length quad | center | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Mid-length quad | rear | small | 4.50" | 4.50" | 4.25" → 3.375" | 14.7 → 11.8 | 31.6° → 39.1° | 0.36" → 0.50" | 1.84" |
| Longboard opened | center | single | 10.50" | 6.30" | 9" → 9" | 44.5 → 36.1 | 23.7° → 32.2° | 0.81" → 2.52" | 3.72" |
| Longboard single | center | single | 10.50" | 6.30" | 9" → 9" | 44.5 → 36.1 | 23.7° → 32.2° | 0.81" → 2.52" | 3.72" |
| Longboard twin/upright | front | twin | 5.50" | 5.50" | 5" → 5" | 17.4 → 20.8 | 26.2° → 37.6° | 0.21" → 1.10" | 2.47" |
| Longboard twin/keel | front | keel | 6.50" | 4.28" | 5" → 5" | 16.6 → 22.3 | 19.3° → 43.8° | -0.50" → 0.43" | 1.45" |
| Longboard twin/trailer | front | twin | 5.50" | 5.50" | 5" → 5" | 17.4 → 20.8 | 26.2° → 37.6° | 0.21" → 1.10" | 2.47" |
| Longboard twin/trailer | center | small | 4.50" | 4.50" | 4.5" → 3.375" | 15.6 → 11.8 | 30.2° → 39.1° | 0.37" → 0.50" | 1.84" |
| Longboard thruster | front | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Longboard thruster | center | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Longboard 2plus1 | center | single | 10.50" | 5.60" | 9" → 8" | 44.5 → 28.5 | 23.7° → 32.2° | 0.81" → 2.24" | 3.30" |
| Longboard 2plus1 | front | small | 4.50" | 4.50" | 4.5" → 3.5" | 15.6 → 12.3 | 30.2° → 38.1° | 0.37" → 0.50" | 1.84" |
| Longboard quad | front | side | 4.50" | 4.50" | 4.5" → 4.5" | 15.6 → 15.4 | 30.2° → 35.4° | 0.37" → 0.95" | 2.16" |
| Longboard quad | rear | small | 4.50" | 4.50" | 4.25" → 3.375" | 14.7 → 11.8 | 31.6° → 39.1° | 0.36" → 0.50" | 1.84" |

### The keel at 4.5" and 6.5" (FINS' base, the whole footprint)

| FINS' base | Root | Area | Sweep | Highest point behind the trailing dot | Rearmost behind it | Cut-away length | Gap at 1/4" · 1/2" · 1" · 1 1/2" · 2" behind the root's end | Nearest the body comes to the bottom, away from the root, Shortboard · Fish · Mid-length · Longboard |
|---|---|---|---|---|---|---|---|---|
| 4.5" | 2.96" | 15.5 in² | 33.6° | 0.30" | 1.01" | 1.54" | 0.10" · 0.17" · 0.27" · 0.59" · past the heel | 0.11" · 0.11" · 0.12" · 0.14" |
| 6.5" | 4.28" | 22.3 in² | 43.8° | 0.43" | 1.45" | 2.22" | 0.07" · 0.13" · 0.22" · 0.28" · 0.39" | 0.09" · 0.11" · 0.13" · 0.18" |

### What the twin defaults move (every preset, FINS' Reset)

| Board | Twin template | Base today → after | Leading dot off the tail today → after | Trailing dot off the tail | Off-rail and toe |
|---|---|---|---|---|---|
| Shortboard | upright | 4.50" → 5.50" | 12.00" → 13.00" | 7.50" (unchanged) | unchanged |
| Shortboard | keel | 4.50" → 6.50" | 10.75" → 12.75" | 6.25" (unchanged) | unchanged |
| Shortboard | trailer | 4.50" → 5.50" | 14.50" → 15.50" | 10.00" (unchanged) | unchanged |
| Fish | upright | 4.50" → 5.50" | 12.00" → 13.00" | 7.50" (unchanged) | unchanged |
| Fish | keel | 4.50" → 6.50" | 10.75" → 12.75" | 6.25" (unchanged) | unchanged |
| Fish | trailer | 4.50" → 5.50" | 14.50" → 15.50" | 10.00" (unchanged) | unchanged |
| Mid-length | upright | 4.50" → 5.50" | 12.00" → 13.00" | 7.50" (unchanged) | unchanged |
| Mid-length | keel | 4.50" → 6.50" | 10.75" → 12.75" | 6.25" (unchanged) | unchanged |
| Mid-length | trailer | 4.50" → 5.50" | 14.50" → 15.50" | 10.00" (unchanged) | unchanged |
| Longboard | upright | 4.50" → 5.50" | 12.00" → 13.00" | 7.50" (unchanged) | unchanged |
| Longboard | keel | 4.50" → 6.50" | 10.75" → 12.75" | 6.25" (unchanged) | unchanged |
| Longboard | trailer | 4.50" → 5.50" | 14.50" → 15.50" | 10.00" (unchanged) | unchanged |

### The wire view's counts, per preset

| Board | Length × width | Rings | Long lines on the deck | On the bottom | Ring loops drawn (a swallow's two pieces count twice) | Outline loop points | Line segments |
|---|---|---|---|---|---|---|---|
| Shortboard | 74.0" × 18.75" | 49 | 18 | 18 | 49 | 419 | 17841 |
| Fish | 68.0" × 20.25" | 45 | 20 | 20 | 47 | 436 | 17410 |
| Mid-length | 86.0" × 21.25" | 57 | 21 | 21 | 57 | 480 | 22074 |
| Longboard | 108.0" × 22.50" | 72 | 22 | 22 | 72 | 555 | 27287 |

### The corner, at 1x

The row, the zoom row and the board's nearest dot below the canvas's top, across all four presets in the first view and the five views. "Dots under" counts board dots under either row, outside the canvas's rounded corner. Measured in Chromium at each size, the phones emulated with a touch screen.

| Screen | Canvas | Corner row | Zoom row | Board's nearest dot | Dots under |
|---|---|---|---|---|---|
| 1280 × 800 | 804 × 615 | 194 × 34, 5 icons | 168 × 34 at 40 | 153 | 0 |
| 820 × 800 | 404 × 615 | 194 × 34, 5 icons | 168 × 34 at 40 | 248 | 0 |
| Pixel 7, 412 × 839 | 402 × 523 | 154 × 34, 4 icons | hidden at 1x | 200 | 0 |
| iPhone 14, 390 × 664 | 380 × 407 | 154 × 34, 4 icons | hidden at 1x | 141 | 0 |
| 320 × 568 | 310 × 344 | 154 × 34, 4 icons | hidden at 1x | 121 | 0 |
| sideways iPhone, 844 × 390 | 482 × 312 | 194 × 34, 5 icons | hidden at 1x | 54 | 0 |

The plan's own table was measured with three switches and a phone row of 114 dots; the fourth switch adds one 34-dot icon and its gap. The plan's nearest-dot figures of 61 and 124 become 54 and 121 here: these are all four presets as built after 16-16, and the row is 34 dots deep, so every screen stays clear.

## The founder's rulings as built

| Ruling (2026-11-04 and 2026-11-05) | As built |
|---|---|
| Q1: the whole fin stretches along the board, its depth stays | `finOutline`, Rule A: every control point (x, y) becomes (x·B, y·D) |
| Q2: a keel's whole footprint on the dots, "a 6" base = 6" base fin" | `placedFins`: footprint = FINS' base, root = footprint / 1.52, centred on the FINS line; each end within 0.05 mm of its dot |
| The heel, where the cut-away ends, on the trailing dot | `finTemplateFootprint("keel")` reads the heel's x from the template, never the outline's greatest u |
| Q3: a quad's rears the small fin at 0.75 × the fronts | `FIN_QUAD_REAR_OF_FRONT`, `FIN_ROLE_TEMPLATE.quadRear` |
| Q4: a 2+1's centre at feet − 1 | `FIN_TWO_PLUS_ONE_SHORTER_IN`; 6.17" on the 7'2", 8" on the 9'0" |
| Q5: the classic raked single | `FIN_TEMPLATES.single`; no D-fin |
| The trailer small and upright at 3.375" | `FIN_ROLE_TEMPLATE.trailer`, the same depth rule as a quad's rears |
| Twins default 5.5" upright, 6.5" keel | `TWIN_FORWARD_BASE_IN`; Upright + Trailer 5.5", the planner's reading |
| Older saved keels: "Leave it" | No stored field changes; `twinTemplateChange` and Reset are the only ways a default arrives |
| The wire view's density | `WIRE_RING_STEP_IN` 1.5, `WIRE_LINE_SPACING_IN` 1, whole inches rounded down, deck and bottom |
| One outline ring at the apex | `boardOutlineLoop(surface)`, the very loop the CNC outline file carries |
| One look at a time with Contour Stripes | One piece of screen state, `look`, in `three-d-screen.tsx` |

## Proofs

- **The pin:** 84 fins across 32 cases, generated from today's code and committed alone in `c00fdd4e`. The generator refuses to run now (checked).
- **Tests failed before the maths was in place:** with today's `fin-outline.ts` put back, 32 of the pin's 35 cases failed and `fin-outline.test.ts` could not load. See the deviations for the order of work.
- **Every fin stands where the pin says** but for what the rulings moved, and then by exactly that, worked out from the pin.
- **Unit tests:** `npm test` 9302 passed, 2 skipped, 1 failed: `lib/models/rack-stand-in.test.ts`' 1-to-100 sweep, the known timeout, which passes alone (34 of 34).
- **`npx tsc --noEmit`** clean. **`npm run lint`** 0 errors, 1 warning that was there already (`lib/db/import-designs-action.test.ts`).
- **Browser, on the iphone, android and desktop projects, port 3217:** `three-d-show`, `three-d-wire` and `viewer-toolbar` 51 passed, 33 skipped; `three-d-export` and `three-d-zoom` 23 passed, 22 skipped; `three-d-view`, `three-d-screen` and `three-d-hard-edge` 56 passed, 13 skipped; `fins-off-rail`, `touch-sizing` and `volume-fins-panels` 62 passed, 61 skipped. (Skips are the cases each project does not own.)
- **`board-lock-screens`:** 39 passed, 18 skipped, 3 failed, none of them on the 3D screen; x-3d passed on all three projects. See below.
- **Desktop baseline:** 6 of 6 after the one re-recording. The other five pictures passed before it, unchanged, and VOLUME still reads 30.29 L.
- **Near side only is a real test:** with the foam briefly made see-through, `three-d-wire` case 2 failed (33 lines crossed against a limit of 24). Restored, it passes.
- **The zip** with Fins, Blank, Contour Stripes and Wire View flipped is byte for byte the first.
- **Untouched:** `lib/export/`, `components/viewer/zoom-viewport.tsx`, `lib/models/design-snapshot.ts`, `drizzle/`, `lib/db/schema.ts`, `lib/geometry/presets.ts`, both FINS golden fixtures and the prototype extractor.

### The locked-board failures

None is on the 3D screen. s-fins and p-screens pass through FINS, and s-fins fails the same on the old code. All five failures are in the spec's rack set-up or a timing window.

| Case | This plan's code | The Task 1 commit, before any change |
|---|---|---|
| s-fins, desktop | failed 2 of 3 alone, and in the full run | failed 2 of 3 alone |
| look-volume, iphone | failed three runs, passed in the final full run | failed once alone |
| x-rails, iphone | failed three runs (a late save request from the print tick's own 500 ms window), passed in the final full run | failed 1 of 3 at a different step, passed 3 others |
| p-screens and look-template, iphone | failed in the full run, passed alone | not run |

`look-rails` on the iphone project, the known failure, passed in the final full run. Under the load of this machine these cases are flaky, so the orchestrator's gate on the main checkout is the one to trust.

## Deviations from Plan

### The 3D reference picture changed in more than the plan said

**The fin shows in `three-d-desktop`, so the diff is wider than the ruling's "only the panel's SHOW section and the corner".** The plan expected the fins to be out of sight at rest. The thruster's near fin shows below the rail at the first view, so its new shape is in the picture.

- 39603 pixels in the panel from SHOW's old place down (x 20–358, y 270–796).
- 4462 in the corner row left of Wide view.
- 219 in the near fin (x 1049–1095, y 506–523).
- 28 by one level of 255 in Wide view's and the zoom row's icons.
- One dark pixel on the deck at (1064, 416), a software-drawing artifact.

The board itself did not move: with Fins off, the canvas before and after differs in 0 of 1977840 colour values. I re-recorded once on that proof, because the fin's change is this plan's own purpose. **The orchestrator should confirm that reading of its ruling.** SHA-256, old to new: d7842e75 to 34d8a19c.

**The dark pixel:** it appears only in headless Chromium's software drawing. Every fin's solid stays inside its outline, the dot is gone at 10x, and the same board on this Mac's graphics chip (Metal) draws none. It is in the reference picture, so a future software-drawing change could move it.

### Order of work

- **One re-recording, in Task 2b's commit.** The plan allows this. At Task 2's commit alone the 3D baseline does not match; it does from Task 2b's.
- **The pictures and this summary are in a fourth commit,** after Task 2b, because the toolbar and wire pictures show the finished four-switch corner.
- **Task 2's fin maths was written before its tests,** not after. I then put today's maths back to confirm the tests failed on it, and restored the new maths. One commit per task, per the ruling, so there is no separate failing-test commit.

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The pin generator stopped type-checking once `FIN_TEMPLATES` existed**
- **Found during:** Task 2
- **Issue:** `"FIN_TEMPLATES" in finOutline` narrowed the module to `never`.
- **Fix:** a named import of `placedFins` beside the namespace import. The pin itself is unchanged.
- **Files modified:** `scripts/extract-phase16-fin-pin.ts`
- **Commit:** b3ef9331

**2. [Rule 3 - Blocking] Wire lines needed the surface's slots**
- **Found during:** Task 2b
- **Issue:** a ring's vertices are welded, so a 1 1/2" station between two rings could not be worked out point for point.
- **Fix:** `SurfaceRing` now carries `right` and `left`, and `BoardSurface` carries `width`. No position, triangle or file changes.
- **Files modified:** `lib/geometry/board-surface.ts`
- **Commit:** d3414096

### Small differences

- The before server ran on port 3219, by the orchestrator's ruling, not the plan's 3218.
- `three-d-show` case 10 also runs on a sideways iPhone, beside the plan's 320-dot phone.
- `components/3d/board-scene.ts` changed for the wire look, as Task 2b added to the plan; the fins' colour and the lights did not.
- The wire picture adds a white-page row for his call. It changes the ground token in that picture only; nothing is built.
- Keel areas read 22.3 in² here against the plan's 22.4: the 24-sample outline against the plan's rounded figure.

## Known limitations (left alone on purpose)

- A saved twin keeps the forward base it was saved with, and its label still reads "(standard)" because that word reads the overridden flag alone.
- The shared corner touch box measures 44 by the house's rule and 42 by its own computed box, because its `::after` sits inside the button's 1-px border. The four switches wear it as every corner icon does.
- FINS' bases for quad rears, side bites and the trailer (4.0–4.5") are longer than real fins of their depth, so those fins draw a little more raked than real ones. That is true to FINS (D-25).
- The side fin, the twin and the single are joint fits across makers; the keel and the small fin are each fitted to one published fin, rounded to two decimals. No name appears anywhere and no foil is drawn.
- The drawing's lines are one screen dot wide on every device, so on a sharp phone they read finer than on a computer.
- The stringer keeps its 3 mm ribbon in Wire View, so close in it is heavier than the other lines.

## Self-Check: PASSED

The five pictures, the archive, the six new source files and commits c00fdd4e, b3ef9331 and d3414096 exist; no scratch script is loose in the repo or under `.planning`.

## Founder's look

Pending — presented by the orchestrator at the Wave 12 checkpoint.
