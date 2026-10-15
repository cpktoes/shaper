# Blank top view (ROCKER): a nose printed 0 wide

## Design Decisions

**A nose printed 0 wide is drawn round, by a parabola from the tip** (012 C; the founder, 2026-10-07: "C looks great
and seems like the simplest update too"). Inside the last printed width station a blank's half-width is `a·√d + b·d`,
`d` the distance in from the tip, so the outline leaves the tip straight across the stringer and meets that station at
its printed width and at the curve's own slope. `a` and `b` come from the printed widths alone: nothing is set, nothing
is stored. Everything from that station back is the square-root curve exactly, and every printed station still reads
its printed number. At the very tip it rounds like a circle of radius 8" to 12" on the catalogue's blanks. The same
rule would apply to a 0-wide tail, though no catalogue blank prints one. It falls back to the square-root curve on a
blank whose printed widths are more pointed than a straight line to the tip (none is).

Why it matters: 43 of the catalogue's 162 blanks print a 0-wide nose, with the last printed width 3" in (all eight
of Arctic Foam's), 6" in (twenty-one of US Blanks' twenty-three) or 12" in (all twelve of Marko's and two US Blanks);
the square-root curve run straight to the 0 drew a point, each rail meeting the stringer at 57° to 73°.

Built the same day, quick 261007-c3h: `lib/geometry/round-tip.ts` wraps the blank's width curve under the live
square-root rule only; `buildBlankTopView` adds 24 samples per tip spaced evenly in √(distance from the tip) so the
drawn line stays within 0.15 mm of the curve; the sketch's own `curves.js` is kept at
`reference/sketches/012-round-nose-curves.js` and a golden generated from it checks the app on all 43 blanks. The width
curve is shared with the fit check, so a board flagged too wide inside the last printed station can come to fit.

## CSS Patterns
The mini top view's strokes, pinned to screen pixels as the app's mini display draws them:
```css
.foam  { fill: color-mix(in srgb, var(--surf-ink-muted) 24%, transparent); }         /* --outline-foam-shade */
.blank { stroke: color-mix(in srgb, var(--surf-ink-muted) 60%, transparent); stroke-width: 1; } /* --outline-blank-line */
.board { fill: var(--surf-board-fill); stroke: var(--surf-ink); stroke-width: 1.5; }
.stringer { stroke-dasharray: 16 4 4 4; } .station { stroke-dasharray: 5 4; }          /* --outline-station-line */
```
Printed measuring points are 3px dots in the blank line's colour.

## What to Avoid
- Running the square-root curve straight into the 0 at the tip: a pointed nose where the foam is round.
- A control point across the stringer (012 B, the founder's first idea): one cubic from the last station to the
  tip arrives perpendicular, but it needs a handle share to pick — a third of the chord looked right, yet it is a
  number to store or hard-code, and B at a third sat close to C anyway.

## Origin
Sketch 012 (blank-round-nose), 2026-10-07, built the same day. Source in `sources/012-blank-round-nose/`.
