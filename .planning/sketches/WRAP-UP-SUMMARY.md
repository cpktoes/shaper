# Sketch Wrap-Up Summary

## Wrap-up of 2026-10-14

**Date:** 2026-10-14
**Sketches processed:** 3 (3 included, 0 excluded)
**Design areas:** Wings (new), Blank top view (new); the four earlier areas unchanged
**Skill output:** `./.claude/skills/sketch-findings-shaper/`

### Included Sketches
| # | Name | Winner | Design Area |
|---|------|--------|-------------|
| 012 | blank-round-nose | C — Parabola from the tip | Blank top view |
| 013 | wings-on-the-outline | A — Tail re-drawn to your block | Wings |
| 014 | wings-tab | B — The window grows with the wing | Wings |

### Design Direction
A new feature on a curve is applied after the curve the app already draws, never a new curve family: the outline
audit of 2026-10-14 found the two-span Bézier sound, so a wing is a step whose depth fades out by the tail pod, and a
blank's 0-wide nose is a parabola from the tip fixed by the printed widths alone. Wings get their own tab on the
TEMPLATE page with the tail 26" closer and only the wing controls beside it, in the Template builder's own dress; the
window grows once a wing passes 24", every number moves in sixteenths, and the grab points come with Show construction.

### Key Decisions
- **Wing geometry:** up to two; position 2" to the centre or the front fin's edge plus an offset; depth 1/16" to 1";
  run 0 to 2"; a corner radius capped at what fits the step; ahead of the nearest wing the curve is untouched; two
  wings stack. Adding the first turns on Show fins and opens "Dial in your wing placement…".
- **The tab:** ADD WINGS, then WINGS · n; the sidebar swaps; the view holds still during a drag.
- **Lessons:** audit the maths before drawing; a window that re-frames mid-drag carries the thing away; two grab
  points on a sharp corner overlap.

---

## Wrap-up of 2026-10-05

**Date:** 2026-10-05
**Sketches processed:** 11 (10 included, 1 excluded)
**Design areas:** Drawing & callouts, Board orientation, Phone chrome, Board Rack
**Skill output:** `./.claude/skills/sketch-findings-shaper/`

## Included Sketches
| # | Name | Winner | Design Area |
|---|------|--------|-------------|
| 001 | viewer-callout-system | D — Hybrid (rails) | Drawing & callouts |
| 002 | input-output-distinction | C — Dual system | Drawing & callouts |
| 003 | stringer-and-station-lines | B — Distinct centreline | Drawing & callouts |
| 004 | clean-interior-svg | A — Aligned rail | Drawing & callouts |
| 006 | orientation-switch | Rotate in place, corner button | Board orientation |
| 007 | phone-screens-in-menu | C1 — Tiles from your board | Phone chrome |
| 008 | next-screen-button | B — Back + Next | Phone chrome |
| 009 | phone-swipe-rack | B — Turns as it passes | Board Rack |
| 010 | sideways-board-rack | A — Drawing rack, turn follows the cursor | Board Rack |
| 011 | phone-rack-reorder | A — Hold and drag | Board Rack |

## Excluded Sketches
| # | Name | Reason |
|---|------|--------|
| 005 | horizontal-board-view | Superseded by 006: rotate the board in place instead of rebuilding the page |

## Design Direction
The board viewers read as technical drawings a shaper already knows how to read, with restraint
throughout: one ink for dimensions, meaningful dashes for the reference lines, nothing but faint lines
inside a board, and values on fixed rails. Phones save every dot: there's no tab bar, ☰ opens screen tiles
drawn from the current board, and Back + Next ends every screen. On the home page, "Your Boards" becomes
the **Board Rack**. Boards stand sideways at one true scale on one floor line, name and dims running up
beside each, and the board you're on turns its real turn (worked out from its own rocker, thickness and
outline) to show its outline. It turns as the cursor or the thumb passes, and the shaper sets the order.

## Key Decisions
- **Layout:** values on fixed rails (inputs as left-gutter chips, outputs on one right rail); width picks
  the layout, pointer picks the sizing, height picks short-screen behaviour. The Board Rack is one row per
  15–18 boards on a computer (rows balanced, one scale for all), and one swipeable row on a phone, with
  Shape a New Board kept on the first screen.
- **Palette:** the app's own `--surf-*` themes, no new hues; accent for interaction, the warning colour never
  for information (the unsaved board is informational).
- **Typography:** Inter; uppercase tracked headings and calls to action; vertical one-line board words
  (name semibold, card line muted) reading tail to nose.
- **Spacing:** drafting rails and fixed constants rather than per-label offsets; 48-dot rack slots on a
  computer, 40 on a phone.
- **Interaction:** the Template board rotates in place from one corner button; the Board Rack turns boards
  as the cursor sweeps (settling after about 180 ms) or as they pass the middle of a phone's swipe; boards
  move by dragging on a computer (or ⋯ → Move left / Move right, Alt + arrow) and by holding about 420 ms
  then sliding on a phone, with the rack scrolling at the screen's edge; the unsaved board stays first
  until it's saved.
