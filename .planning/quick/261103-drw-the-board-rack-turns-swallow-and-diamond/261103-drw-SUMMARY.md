---
phase: quick-261103-drw
plan: 01
status: complete
subsystem: board-rack
tags: [board-rack, rack-art, swallow-tail, diamond-tail, turn, geometry]
requirements: [QT-261103-drw]
dependency_graph:
  requires: [lib/geometry/outline.ts buildOutline points + centreCloseStation, lib/geometry/screen-tiles.ts silhouette]
  provides: [one turn rule at every angle in lib/geometry/rack-art.ts — sections, notch, closeStation]
  affects: [components/setup/hover-rack.tsx and swipe-rack.tsx (unchanged code, new drawing)]
tech-stack:
  added: []
  patterns: [one drawing rule from rest to fully turned, relation tests with a bound read off the board's own size]
key-files:
  created:
    - e2e/board-rack-turn.spec.ts
  modified:
    - lib/geometry/rack-art.ts
    - lib/geometry/rack-art.test.ts
    - e2e/board-rack.spec.ts
    - .claude/skills/sketch-findings-shaper/references/board-rack.md
decisions:
  - "The Board Rack draws a turning board by one rule at every angle: no switch to the TEMPLATE outline near 89.5 degrees."
  - "A swallow's notch opens from the first degree of turn, with no hold (the founder, 2026-11-03)."
  - "A turned swallow's dashed stringer stops at the crotch (the founder, 2026-11-03)."
  - "A diamond-tailed board's litres (the V left out through sampleOutline) is a separate task after this one; nothing here touches volume or sampleOutline (the founder, 2026-11-03)."
metrics:
  duration: 40min
  completed: 2026-11-03
  tasks: 3
  files: 5
estimate:
  tokens: 120000
  tasks: 3
actuals:
  tokens: 15000   # chars/4 over the added lines of the realized diff and this SUMMARY
  tasks: 3
  commits: 5
---

# Quick 261103-drw: the Board Rack turns swallow and diamond tails smoothly

Your report from the live site: "The board rack renders swallow and diamond tails slowly. The board spins with either
a nipple or square tail then jumps to the correct tail." Fixed on this worktree's branch. Nothing is pushed or
deployed. It merges to main after you've had a look, and the push is your call.

## What you will see on the rack

- **The Fish turns as a swallow the whole way round.** When the board is edge-on, its notch is hidden: the far tail
  tip fills it, just as on a real board seen from the side. The notch starts to open from the very first degree of
  turn and keeps opening until, fully turned, it is exactly TEMPLATE's notch. The Fish no longer turns with a square
  tail and then jumps to a swallow at the end.
- **A diamond turns as a diamond.** The thin spike that stood out behind a squared-off tail block (the "nipple") is
  gone. The V behind the tail block is drawn from the outline itself. Its point shows only the tail's own thickness,
  shrinking as the board turns: about 2 dots at 60 degrees and under half a dot at 85 on the computer's rack. That is
  exactly how every pin tail's point already looks.
- **There is no jump anywhere in the turn.** Every board is drawn with the same points at every angle. Between two
  frames a tenth of a degree apart no point moves more than half a millimetre on the board, about a tenth of a dot.
  The old drawing jumped 12.4 dots on the Fish and 9.0 dots on a diamond.
- **The turned Fish's dashed stringer now stops at the crotch.** Before, it ran down into the empty V.
- **Everything else looks as it did.** Every board standing at rest still shows exactly its side profile. Every
  board fully turned still shows exactly its TEMPLATE outline. The room the rack opens around a turning board, and
  where its words stand, changes by at most 0.05 dot. Your computer's reference pictures of the five design screens
  passed unchanged.

## Before and after pictures

Each picture shows the board and its two neighbours, at 3x, held mid-turn through the rack's own input: the cursor on
a computer, the held scroll on an iPhone. All of them are in `.planning/quick/261103-drw-the-board-rack-turns-swallow-and-diamond/pictures/`:

| What | Before | After |
|------|--------|-------|
| The Fish on the computer's rack, half-turned (45 degrees) | `before-hover-fish-45.png`: square tail | `after-hover-fish-45.png`: the notch open |
| The Fish on the computer's rack, nearly turned (88 degrees) | `before-hover-fish-88.png`: square tail | `after-hover-fish-88.png`: TEMPLATE's notch |
| A Shortboard with the Diamond button, computer, 45 degrees | `before-hover-diamond-45.png`: the spike | `after-hover-diamond-45.png`: the V |
| The same diamond, computer, 88 degrees | `before-hover-diamond-88.png`: the spike behind a square block | `after-hover-diamond-88.png`: the V |
| The Fish on the iPhone's rack, 45 and 88 degrees | `before-phone-fish-45.png`, `before-phone-fish-88.png` | `after-phone-fish-45.png`, `after-phone-fish-88.png` |
| The diamond on the iPhone's rack, 45 and 88 degrees | `before-phone-diamond-45.png`, `before-phone-diamond-88.png` | `after-phone-diamond-45.png`, `after-phone-diamond-88.png` |

The script that took them is archived beside them as `pictures/shoot-source.tar.gz`.

## What the real rack drew, before and now

Read in the browser from the rack's own drawing, at each angle the cursor or the scroll held. "Points" is how many
points the board's outline is drawn with. For the Fish, "crossings" counts how many times a level line a quarter of
the way up its notch crosses the drawing: 2 means no notch shows, 4 means the notch is open. For the diamond, the
margin is the drawn width half-way up the V, less the V's own width there seen at that angle (less one degree). A
negative margin means the V is missing.

**The Fish (hover rack on the computer; the iPhone's swipe rack read the same, within a degree of rounding):**

| Angle | Before: points | Before: crossings | Now: points | Now: crossings |
|------:|------:|------:|------:|------:|
| 0 | 130 | 2 | 492 | 2 |
| 9 | 130 | 2 | 492 | 4 |
| 30 | 130 | 2 | 492 | 4 |
| 45 | 130 | 2 | 492 | 4 |
| 60 | 130 | 2 | 492 | 4 |
| 81 | 130 | 2 | 492 | 4 |
| 88 | 130 | 2 | 492 | 4 |
| 90 | **323** | 4 | 492 | 4 |

**The Shortboard with the Diamond button (hover rack on the computer):**

| Angle | Before: points | Before: margin (dots) | Now: points | Now: margin (dots) |
|------:|------:|------:|------:|------:|
| 0 | 130 | +3.75 | 451 | +3.75 |
| 9 | 130 | +1.06 | 451 | +2.09 |
| 30 | 130 | **-5.23** | 451 | +0.82 |
| 45 | 130 | **-9.33** | 451 | +0.48 |
| 60 | 130 | **-12.81** | 451 | +0.26 |
| 81 | 130 | **-16.14** | 451 | +0.05 |
| 88 | 130 | **-16.83** | 451 | +0.02 |
| 90 | **323** | 0.00 | 451 | +0.01 |

On the iPhone the diamond read the same way. Before: 130 points, margin -4.66 at 29 degrees down to -15.83 at 88,
then 323 points at 90. Now: 451 points at every angle, margin +1.90 at 9 degrees down to 0.00 at 88.

## Measured facts (scratch measurements on the presets and practice boards)

- **Step to step:** 59 boards were swept through the turn a tenth of a degree at a time: the four presets with each of
  the five tail buttons, with and without their blank, plus the 15 practice boards. The largest point move was 0.586
  mm, on the hand-set Twin Fish 5'8" at 3 degrees. That is 0.863 of the board's (greatest deck height + greatest
  half-width) x 0.1 degree, well inside the doubled bound the tests use. On the Fish the largest move is 0.53 mm
  (0.095 dot), at 3 degrees, where the notch opens fastest. On the diamond it is 0.38 mm (0.068 dot). The old jumps
  were 69.85 mm (12.4 dots) on the Fish and 50.35 mm (9.0 dots) on the diamond (the plan's measurement on main).
- **The Fish's notch** (69.8 mm deep), how deep it shows open and how wide at the tail: 1 degree, 1.4 / 4.4 mm;
  5 degrees, 19.8 / 22.1; 10 degrees, 36.6 / 44.1; 30 degrees, 57.6 / 127.0; 60 degrees, 65.6 / 220.0; 85 degrees,
  69.2 / 253.0; 90 degrees, 69.8 / 254.0, which is the tail's full width, TEMPLATE's V.
- **The diamond's point** (Shortboard with the Diamond button; the tail tip is 23.8 mm thick). How wide it shows
  is the tip's thickness x cos(angle): 20.6 mm (3.7 dots) at 30 degrees, 11.9 mm (2.1 dots) at 60, 2.1 mm (0.37 dot)
  at 85 and 0.4 mm at 89, all at the computer rack's 7'0" scale (0.178 dot per mm). The old drawing read a half-width
  of 0 at 0, 29.4 and 58.7 mm up the V: that was the spike.
- **The room:** across the 59 boards and every tenth of a degree, how far a board reaches from its axis changes by at
  most 0.289 mm (0.05 dot). That is on the Step-Up 6'6" at 89.5 degrees, where the old drawing dropped a small offset
  the new rule keeps. Below 89.5 degrees it changes by at most 0.040 mm, and at 30 / 45 / 60 degrees by at most 0.028
  / 0.031 / 0.017 mm (under 0.006 dot). The greatest deck height is identical to before on every board. The greatest
  half-width rises by at most 0.018 mm, because the outline's own widest point is now a drawn station.
  `lib/geometry/rack-room.test.ts` passes untouched: no word crosses a board.

## How it works, in one paragraph

The rack used to draw a turning board from 65 cross-sections and, from about 89.5 degrees up, swap to the TEMPLATE
outline, which is a different set of points. A cross-section can't carry a notch, so the Fish turned square. The
outline reader the rack used reads a width of 0 for anything behind a diamond's tail block, so a diamond turned with
a spike the tail's thickness wide. Now the rack draws the outline's own stations as well as the 65, so fully turned
the drawing is the TEMPLATE outline, and it has the same points at every angle. It reads the width along the
outline's own points, starting from the diamond's tip. A swallow's tail is treated as two pieces of foam, one each
side of the notch. At any angle, the notch shows open only where you could see between the two pieces. All of it is
in `lib/geometry/rack-art.ts`. Neither rack's own code changed.

## Tests rewritten, and why

`lib/geometry/rack-art.test.ts`. Every expected figure is a relation read off the app's own geometry; no millimetre
is typed. The boards are the four presets, the hand-set Shortboard, and every preset with each of the five tail
buttons, with and without its blank (45 boards).

- **Kept:** the 65-station builder check (its greatest deck and half-width now read from the drawn stations), the
  throw on a non-number, the hand-set board, the paths, words never crossing, `designSideProfile`, the room at rest
  and turned, and the room equal to the drawing's own left and right at every degree. The last two now run on all 45
  boards.
- **Rewritten, because they named the switch or counted today's points:**
  - at rest: the low edge is the rocker and the high edge the deck at every drawn station, with the tail closed on
    its end line;
  - turned: every TEMPLATE point appears in order, and every other point lies on TEMPLATE's lines;
  - the "just below the switch" bound became the same bound at every whole degree;
  - the swallow-closes-at-the-crotch check became the notch checks;
  - the stringer check now reads edges at any station.
- **New:**
  - **no snap:** the same point count at every tenth of a degree, and no point moving more than 2 x (greatest deck
    + greatest half-width) x the step. Seen failing on the old code: 130 points became 323 at 89.5 degrees;
  - **the notch:** hidden edge-on, never closing as the board turns, the TEMPLATE V turned, and each inner edge
    equal to a brute-force search of its cut cross-section at 30, 60 and 85 degrees;
  - **the diamond's V:** the width runs straight from the tip. Seen failing on the old code: half-width 0 at 29.4 mm
    up the V;
  - **the diamond's point:** it shows exactly its thickness x cos(angle);
  - **the drawn stations:** the 65, the outline's own and the tail's closing station.
- `e2e/board-rack-turn.spec.ts` (new) sweeps the Fish and a Diamond-button Shortboard through the turn one dot at a
  time: by cursor on the computer, by held scroll on the iPhone and the Android phone. At every step it checks the
  same point count, the move bound (widened by a degree for the whole-degree turn reading), the Fish's notch open
  from 10 degrees, and the diamond's V at least as wide as the V seen at that angle. Run against the old drawing it
  fails at the jump on both boards.
- `e2e/board-rack.spec.ts` check 4 used to tell a turned board from a resting one by counting points (300 or more
  against 140 or fewer). The count is now the same, so it checks the shapes instead: the turned board is as wide for
  its length as its TEMPLATE outline, and the resting one as its side view, each within 1%.

## For your look

1. **The notch begins to open from the first degree.** That is what a real swallow shows just off edge-on: its two
   tips. You asked for no hold.
2. **The turned Fish's stringer now stops at the crotch**, as you asked, rather than running across the open notch.
3. **A part-turned diamond's point shows the tail's thickness**, shrinking to nothing as it turns. That is the same
   as a pin tail's point, and it is not the old spike: the spike was 60-76 mm long, 13.5 mm wide at 60 degrees and
   13.6 dots tall.

## A separate finding, not fixed here (your ruling: its own task, next)

`sampleOutline` reads a half-width of 0 inside a diamond's V, and the litres are worked out through it. So a
diamond-tailed board's volume leaves out the V. Its plan area on the Shortboard with the Diamond button is
2 x 1/2 x 76.2 mm x 127 mm = 9,677 mm², both sides together. As you ruled, that is a separate task after this one.
Nothing here touches the volume, `sampleOutline` or the litres records.

## Gates (in this worktree)

- `npm test`: 156 files, 6381 passed, 2 skipped, 0 failed.
- `npx next typegen` then `npx tsc --noEmit`: clean. `npm run lint`: clean.
- Rack suites while building: rack-art, rack-room, wings-readers, rack-models, rack-stand-in and rack-layout,
  687 passed.
- Playwright, `e2e/board-rack-turn.spec.ts e2e/board-rack.spec.ts e2e/board-rack-phone.spec.ts e2e/test-rack.spec.ts`
  (all three projects, port 3179, webpack):
  - first run: 74 passed, 111 skipped, 1 failed. The failure was the run's very first test on a cold dev server: the
    rack page wasn't compiled within 5 seconds (board-rack-phone check 1, iPhone). It passed when re-run alone.
  - final run: 75 passed, 111 skipped, 0 failed.
- `e2e/board-rack-turn.spec.ts` alone: 6 passed, 6 skipped. Against the old drawing (computer only), its 2 checks
  failed at the jump, as they should.
- `e2e/desktop-baseline.spec.ts` (desktop): 5 passed. No reference picture changed, so nothing was re-recorded.
- Nothing changed under `components/`. `lib/geometry/rack-room.test.ts` is byte-identical to main. No switch
  constant is left anywhere.

## Deviations from Plan

1. **[Rule 3] The picture script holds time still.** The computer's rack settles on the nearest board 180 ms after
   the cursor stops, and the phone's 120 ms after the scroll stops. Either could fire while a picture was being
   taken. So the script pauses the page's clock (Playwright's `page.clock`) and steps the frames by hand. Every
   picture is a frame you would see while still moving.
2. **[Rule 1] The phone pictures at 88 degrees hold the scroll at least one whole dot off the board.** A phone's
   scroller drops a fraction of a dot, which first landed the "88" picture fully turned. The before pictures were
   re-shot with the fix, before any code changed.
3. **[Rule 1] A check in my own new diamond test was wrong.** It asked for more drawn stations inside the V than
   even ones, but the V holds exactly the even ones. It now asks for at least as many. Fixed in the change commit
   (`864cb7be`).
4. **[Rule 1] The browser sweeps start one dot past the neighbour's slot centre and accept 89 or 90 at the end**,
   rather than 0 and 90 exactly. The browser rounds the cursor and the scroll to whole dots, which can leave the last
   step half a dot short of turned.
5. **Extra gate:** the desktop reference pictures were run (5 passed, unchanged), as the orchestrator asked.
6. **The room at mid-turn:** I measured at most 0.031 mm over 59 boards, where the plan said 0.024 mm over 35. That
   is still under 0.006 dot.
7. **Load flakes, re-run alone:** board-rack-phone check 1 on the iPhone (cold server, first run), and the iPhone
   diamond pictures (the same cold-load timeout once), re-shot alone.

## TDD Gate Compliance

RED `adf5d847` (test), then GREEN `864cb7be` (the change), then the browser proof `8a891ffe`, then the pictures
and the drawing note, then this SUMMARY. In the RED commit the
headline relations failed for their own reasons: the count changed at 89.5 degrees, the half-width was 0 inside the
V, and there was no notch. Tests reading the new fields (`sections`, `notch`) failed because those didn't exist yet.

## Threat Flags

None. No new endpoint, input or storage. Every new drawn station passes the same finite-number checks as before, so a
board whose picture can't be worked out is still dropped before the rack draws it. The notch edge divides only by
the notch's own length, which is positive for a swallow.

## Self-Check: PASSED

- FOUND: lib/geometry/rack-art.ts, lib/geometry/rack-art.test.ts, e2e/board-rack-turn.spec.ts, e2e/board-rack.spec.ts,
  .claude/skills/sketch-findings-shaper/references/board-rack.md
- FOUND: 16 pictures (8 before, 8 after) and pictures/shoot-source.tar.gz; no loose .ts in pictures/
- FOUND commits: adf5d847, 864cb7be, 8a891ffe, 45a0a750
