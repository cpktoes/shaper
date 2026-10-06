# Sketch Wrap-Up Summary

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
