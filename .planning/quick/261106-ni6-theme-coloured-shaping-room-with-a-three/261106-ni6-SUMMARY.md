---
phase: quick-261106-ni6
plan: 01
subsystem: ui
tags: [3d, three, theme, css-tokens, playwright]
status: complete

requires:
  - phase: 16-3d-board-and-cnc-export
    provides: the shaping bay, the Room switch, and the wall logos
provides:
  - The 3D room's walls and ceiling in the theme's colours, read from tokens in all six theme blocks
  - The Room icon's three steps (theme room, bright blue room, no room), not saved
  - With no room, only the back wall's line logo stays
  - The room fills the viewer to the faint line, with the corner icons where they were (the founder's addition, its own commit)
affects: [16-13 go-live 2, desktop-baseline 3D picture]

actuals:
  tokens: 9354
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A scene colour that follows the theme is a token in every block and a term in coloursKey, or a theme change can look like no change"
    - "A drawing can bleed over a card's pad in its own absolute box while the controls stay in the box they were in"

key-files:
  created: []
  modified:
    - app/globals.css
    - lib/geometry/shaping-bay.ts
    - lib/theme.test.ts
    - components/3d/board-scene.ts
    - components/3d/three-d-screen.tsx
    - components/3d/three-d-copy.ts
    - components/3d/three-d-show-buttons.tsx
    - e2e/three-d-bay.spec.ts
    - e2e/three-d-screen.spec.ts
    - e2e/three-d-show.spec.ts
    - e2e/three-d-wire.spec.ts
    - e2e/three-d-export.spec.ts
    - .planning/sketches/themes/colour-bench.html

key-decisions:
  - "The clip that rounds the drawing's corners is on the new drawing box, not on the viewer's card: on a phone the corner buttons sit flush with the card and their touch box reaches 5 dots past them, so clipping the card would cut 44 dots to 39."
  - "Wide view's bleed is 4 dots at every size, short screens included: the phone rules stand down in Wide view, as measured on both sideways phones."
  - "The keyboard's focus ring goes round the viewer's card, outside the picture, because the drawing's own edge would clip the old ring."

patterns-established:
  - "Pinning a corner row's place: measure from the card's inner edge before the change, then pin those numbers"

requirements-completed: [QT-261106-ni6]

metrics:
  duration: 113min
  completed: 2026-11-06
---

# Quick 261106-ni6 Plan 01: Theme-coloured shaping room Summary

**The 3D room now wears the theme's deep colour, the Room icon goes theme room, bright blue room, no room, one line logo stays with no room, and the room fills the viewer to its faint line with the corner icons unmoved.**

## Performance

- **Duration:** about 113 minutes, most of it browser runs
- **Started:** 2026-11-07T01:09:57Z
- **Completed:** 2026-11-07T03:03Z
- **Tasks:** 3 of 3, plus the founder's addition
- **Files modified:** 14

## What changes for a shaper

- **The room follows the theme.** Daylight opens in a deep green room, Chalk and Slate in deep blue, Phosphor in deep terminal green. The floor, shelves, strips and racks read the same in all four, and changing the theme recolours the walls and ceiling at once, with the board and the view left where they were.
- **The Room icon has three steps.** Theme room, then the bright blue room, then no room, then back. It is not saved. The tooltip says what the next click does. Going between the two rooms moves nothing, and a move under way carries on and lands. Walk Around is off only with no room.
- **Logos.** All four show in both rooms. With no room, only the line logo on the back wall stays.
- **The room reaches the faint line.** The white band of about 12 dots is gone, on the 3D screen only.
- **What did not change.** The middle of the board's foam differs by no more than one level between the two rooms, VOLUME's litres read the same, and the exported zip is the same with no room.

## Commits

| Task | Commit | What |
|------|--------|------|
| 1 | e3af1e2d | The walls and ceiling wear the theme's colours |
| 2 | 964133ce | The Room icon's three steps |
| 3 | 921b76e1 | Only the back wall's line logo stays with no room; every spec mended |
| Addition | 2a17c7ec | The room fills the viewer to the faint line |

## Measured values

**Test 20b's logo counts** (white dots, one desktop run, before the drawing grew by 24 dots):

| Region | With the room | No room |
|--------|---------------|---------|
| Far end wall's line logo (Nose view) | 793 | 0 |
| Side wall's circle (Side view) | 163 | 0 |

The test pins more than 100 with the room, and under a tenth of that with no room. It still passes at the new canvas size. The counts themselves were not read again after the drawing grew.

**Corner rows before the change, in dots from the card's inner edge.** These are pinned in test 12 to within a dot.

| Layout | Pad | Toolbar top / right | Zoom row top / right |
|--------|-----|---------------------|----------------------|
| Computer | 12 | 12 / 12 | 52 / 12 |
| Wide view | 4 | 4 / 4 | 44 / 4 |
| Sideways iPhone, sideways Pixel, short window | 0 | 0 / 0 (Pixel right 0.5) | 40 / 0 (Pixel right 0.5) |
| Sideways phone in Wide view | 4 | 4 / 4 | 44 / 4 |
| Upright phone | 0 | 0 / 0 | 40 / 0 |

**The fins part of test 10** did not need its interior-pixel rule. It passed as it was, so the rule was not added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The first focus ring drew over the picture**
- **Found during:** the addition, in the full browser run
- **Issue:** The drawing now runs to the card's edge, which clips the keyboard's ring, so the first fix drew the ring inside the canvas. Tests 3 and 4 of `e2e/three-d-zoom.spec.ts` then failed on the computer, because they find the board by what differs from the plain background and read the ring as part of the board (a box of 0 to 827 by 0 to 638). The tests were right: a keyboard user should not get a line over the picture either.
- **Fix:** The ring moved out to the viewer's card, in the same 3 dots of the same ink, through `panelClassName`. Neither zoom test was changed. Test 12 now proves the ring is on the card and that nothing is added over the drawing.
- **Files modified:** components/3d/three-d-screen.tsx, e2e/three-d-screen.spec.ts
- **Commit:** 2a17c7ec

### Changes to what was suggested

**2. The clip is not on the card.** The coordinator suggested `overflow-hidden` as `panelClassName`. That would cut the corner buttons' touch boxes from 44 dots to 39 on a phone, so the rounded clip is on the new drawing box instead. `tabbed-panel.tsx` is untouched and the toolbar cannot be clipped. The corner curve is the card's own, less its 1-dot line.

**3. Wide view on a short screen keeps its 4 dots.** The brief for the addition listed 0 for the short screen. That holds on the ordinary card, but in Wide view the phone rules stand down, and both sideways phones measured a 4-dot pad. The bleed follows the measurement.

**4. One bottom edge is allowed 1.5 dots, not 1.** On an upright phone the canvas box has its own fixed height and already stopped 0.77 dots (iPhone) to 1.27 dots (Pixel) short of the card's foot before this change. Test 12 allows 1.5 on that one edge, with a comment saying why. Every other edge is held to a dot.

**5. Four commits, not three.** The plan's three, plus the founder's addition on its own. Task 2's tests were written and seen to fail first, then committed with the code in one commit, so the task stayed one commit as the plan's success criteria ask.

### Tests whose meaning changed

- `e2e/three-d-bay.spec.ts` test 1: the wall is now the default theme's green, not blue.
- `e2e/three-d-screen.spec.ts` test 10: was "the room is the same in every theme"; now each theme's wall reads its own token. Its strip sample moved to the real strip (M3).
- `e2e/three-d-bay.spec.ts` tests 8e, 15, 15b and 16: reaching no room takes two presses, with the blue step asserted on the way.
- `e2e/three-d-bay.spec.ts` test 20: now reads the back wall's logo at all three steps.
- `e2e/three-d-show.spec.ts` `showView`, `e2e/three-d-wire.spec.ts` test 2 and `e2e/three-d-export.spec.ts` test 4: one more press.
- `e2e/three-d-screen.spec.ts` `expectMessage`: tightened, so a message must cover the drawing edge to edge.

No test was relaxed to pass, apart from the upright phone's 1.5 dots in new test 12 (item 4).

## Verification

- **Browser, after the last change:** 12 spec files on iPhone, Android and desktop: 320 passed, 94 skipped by design, 0 failed, EXIT 0. That is the plan's nine plus `phone-trip`, `step-nav` and `site-footer`, which also visit the 3D screen.
- **Browser, at the end of Task 3:** the plan's nine: 223 passed, 86 skipped, EXIT 0.
- **Unit:** `npm test`: 180 files, 9673 passed, 2 skipped.
- **Types and lint:** `npx tsc --noEmit` and `npx eslint` over the changed code: clean.
- **By eye:** computer, Wide view, upright iPhone, the can't-draw message and the keyboard ring, from screenshots at Playwright's Chromium and WebKit.

## Not done here

- **The desktop baseline.** `e2e/desktop-baseline.spec.ts` was neither run nor updated, as instructed. The 3D picture now differs for two reasons: the walls are deep Daylight, and the canvas grew from 804 by 615 to 828 by 639.
- **The rest of the Playwright suite.** Only specs that visit the 3D screen were run.
- **The Colour Bench's published copy** still needs republishing. Only the file in the repo carries the two new keys.
- **The founder's own check on port 3005,** from the plan's human-check: four themes, three presses each, a theme change with the room up, and the logos. Also not tried on real Safari or a real phone.

## Known Stubs

None.

## Threat Flags

None: no new input, network call, storage or database change. `data-bay-look` and `data-three-d-drawing` state only what is on screen.

## Self-Check: PASSED

All four commits are on the branch, and the key lines are in place: `data-bay-look`, `nextBayLook`, `paintRoom`, `parent: logos` and `data-three-d-drawing`.
