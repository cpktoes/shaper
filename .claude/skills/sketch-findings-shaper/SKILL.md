---
name: sketch-findings-shaper
description: Validated design decisions, CSS patterns, and visual direction from Shaper Assistant's sketch experiments — the drafting grammar of the board viewers, rotating the board in place, the phone's screen tiles and Back + Next, and the Board Rack (boards standing sideways at one scale, turning their real turn, reordered by drag or hold-and-drag). Auto-loaded during UI implementation on shaper.
---

<context>
## Project: shaper

Shaper Assistant is a web app for designing surfboards; its users are shapers and surfers, not developers.
The board viewers should read as **technical drawings a shaper already knows how to read**, like a real
shaping template, not as app UI with numbers floating on it. Restraint is the whole point: one ink for
dimensions, one dash for stations, one dash for the stringer, no colour doing decorative work, and
no arbitrary placement. On phones the founder's rule is "phone real estate is expensive, we need to save
all of it."

Reference points: traditional drafting conventions (extension lines, end ticks, value in a break,
long-short-short centreline), real full-size shaping templates, the app's own palettes in `app/globals.css`,
an iPhone's home screen (hold an icon, slide it), and a surf shop's board rack.

Sketch sessions wrapped: 2026-10-05 (sketches 001–011; 005 excluded as superseded by 006)
</context>

<design_direction>
## Overall Direction

- **Palette:** the app's own themes only (Daylight and Slate in the sketches; the live contract is the
  `--surf-*` tokens in `app/globals.css`). No new hues. The accent marks interaction (a carried board, a
  drop gap), and the warning colour is never used for anything informational.
- **Drawing:** board fill with an ink edge; faint reference lines with meaningful dashes (stringer
  `16 4 4 4`, stations `5 4`, widepoint `2 3`); nothing but faint lines inside a board; labels as SVG text.
- **Type:** Inter; uppercase tracked labels (`tracking-architectural`, 0.15em) for headings and calls to
  action; 20px semibold names; 12px semibold muted card lines.
- **Layout:** values snap to fixed rails; the screen switches stay separate (width = layout,
  pointer = control size, height = short-screen behaviour).
- **Interaction:** direct and physical where it helps the shaper read a board (a board turns its real
  turn, worked out from its own rocker, thickness and outline), plain and predictable everywhere else.
  Everything works on older Safari: no CSS 3D, no scroll-driven animations.
</design_direction>

<findings_index>
## Design Areas

| Area | Reference | Key Decision |
|------|-----------|--------------|
| Drawing & callouts | references/drawing-and-callouts.md | Drafting dimension lines on fixed rails; computed values get dimension lines, inputs get chips; no text inside a board |
| Board orientation | references/board-orientation.md | Rotate the Template board in place from one corner button; vertical by default, not remembered |
| Phone chrome | references/phone-chrome.md | No tab bar: ☰ opens six screen tiles drawn from the current board; Back + Next end every screen |
| Board Rack | references/board-rack.md | Boards stand sideways at one true scale and turn their real turn as the cursor or thumb passes; the shaper sets the order (drag / hold-and-drag); the unsaved board stays first |

## Theme

The sketches' palettes are in `sources/themes/app-slate.css` (dark) and `sources/themes/app-daylight.css`
(light), copied from `app/globals.css` on 2026-10-03. The app's `globals.css` is the source of truth; never
copy a value from these files into the app without checking it there.

## Source Files

The original sketch pages (all variants, winner starred) and their READMEs are preserved in `sources/`.
Each `index.html` is self-contained and opens in any browser.
</findings_index>

<metadata>
## Processed Sketches

- 001-viewer-callout-system
- 002-input-output-distinction
- 003-stringer-and-station-lines
- 004-clean-interior-svg
- 006-orientation-switch
- 007-phone-screens-in-menu
- 008-next-screen-button
- 009-phone-swipe-rack
- 010-sideways-board-rack
- 011-phone-rack-reorder

processed_sketches: [001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011]
(005 reviewed and excluded: superseded by 006)
</metadata>
