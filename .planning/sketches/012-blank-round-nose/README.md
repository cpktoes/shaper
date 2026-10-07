---
sketch: 012
name: blank-round-nose
question: "When a blank prints its nose tip 0 wide, how should its outline reach the tip on ROCKER's top view?"
winner: "C"
tags: [viewer, rocker, top-view, blank, geometry]
---

# Sketch 012: A nose printed 0 wide

## Design Question
The founder (2026-10-07): "For blanks with a 0 N0 value, the nose should have maximum roundness. i.e. The
spline control point would be perpendicular to the stringer, so that the spline essentially starts totally
perpendicular to the stringer before curving through the next data points."

Today the blank's outline on ROCKER's top view (quick 261006-qfm) is the square-root curve through every
printed width (`lib/geometry/root-curve.ts`, the "fall"), run straight to the 0 at the tip. That curve reaches
the stringer at an angle, so the nose draws as a point, with each rail meeting the stringer at about 57° to
73° on the blanks below. In the catalogue 43 of the 162 blanks print a 0-wide nose: all eight of Arctic Foam's
such blanks print their last width 3" in (N3), twenty-one of US Blanks' twenty-three print it 6" in (N6), and
all twelve of Marko's plus US Blanks' 11'2"C and 11'8"C print it 12" in (N12). No blank prints a 0-wide tail.
So the rule has to look right over a 3", a 6" and a 12" last segment, and one of each is in the sketch.

## How to View
open .planning/sketches/012-blank-round-nose/index.html

Five real blanks, each as the mini display draws it on a computer (nose left, the same strokes and dashes
as the app) with the last 30" of the nose four times closer beside it. The US Blanks 7'4"SP and 9'4"B
carry the Mid-length and Longboard presets where ROCKER places them; the Arctic Foam 9'3" LB, Marko Foam 9'1"
Machine All and US Blanks 11'2"C are drawn alone. The bar switches the board and the measuring points on and
off; on B it also has the handle-length slider. The ⚙ tools switch Slate / Daylight and the mini's width.

## Variants
- **A: Today — a point** (baseline): the live curve, exactly as the app draws it (the page's copy of the app's
  pchip and square-root rule reproduces the app's own samples to within 0.000001").
- **B: Control point across the stringer** (the founder's idea): today's curve up to the last printed station,
  then one cubic curve to the tip. Its handle at the station lies along today's own slope there, so nothing
  kinks; its handle at the tip points straight across the stringer, so the outline arrives perpendicular. Both
  handles are a share of the chord between the two points — a third by default (3 1/2" on the 7'4"SP), the
  slider runs 15% to 60%.
- **C: Parabola from the tip ★ (the founder's pick)**: inside the last printed station the half-width is a·√d + b·d, d the distance in
  from the tip — a parabola with its point on the stringer, which is the shape every round nose has at its very
  tip — with a and b fixed by the printed width at the station and today's slope there. Nothing to set. At the
  tip it rounds like a circle of radius 8" to 12" on these five blanks (the circle through the tip and the last
  station is 9" to 11"). Falls back to today's curve on a blank whose printed widths are more pointed than a
  straight line to the tip; none in the catalogue is.
- **Side by side**: all three on each nose — dotted today, blue B at the slider's handle length, solid C.

## What to Look For
- Which nose looks like the foam, on all three spans? Arctic's 3" round is tight; Marko's 12" span is where
  B and C differ most.
- On B, does one handle share suit every span, or does the 12" span want its own? Try 20% and 50%.
- On the Longboard: under today's curve the preset's own nose runs right along the blank's edge between
  N0 and N6 (the fit check still passes — the 1" width margin holds — but the drawing says "no room"). With
  either rounded nose there is foam beside the rail again.
- In the side-by-side view, how far apart are B at ⅓ and C? If they are close enough, C is the simpler build:
  no number to pick and nothing to store.

## Tested
In headless Chromium at 1440 px, Slate and Daylight: every tab renders the five cells with no console
errors; the page's curve code matches the app's `blankWidthAt` on all five blanks to 5e-7" over 373 to 551
samples each (`check012.mjs` in the source archive); B and C both stay monotone from the last printed station
to the tip on every blank, and C is never pointed. The slider redraws B live; the board and the measuring
points switch off and on.

## If it gets built
- The width curve lives in `lib/geometry` (`blank-fit.ts`'s `attributeCurve` → `root-curve.ts`) and is read by
  the fit check as well as the drawing: a rounder nose means more foam beside the stringer inside the last
  printed station, so a board flagged "too wide" there could come to fit. Saved boards would redraw. It needs
  golden fixtures and tests like every curve (CLAUDE.md Rule 1), and `root-curve.test.ts`'s "never strays
  between stations" rule still holds, since both B and C stay between the station's width and 0.
- Only the last printed segment changes, and only when the tip prints 0 and the station before it prints more.
  Everything from that station back is today's curve, exactly, and every printed station still reads its
  printed number.
- B stores nothing new if the handle share is a constant; C stores nothing at all. The side view and the fit's
  thickness curve are untouched: this is width only.
- The same rule would apply to a 0-wide tail, though no catalogue blank prints one.

## Outcome (2026-10-07)
**Winner: C, the parabola from the tip**, chosen by the founder from the page: "C looks great and seems like
the simplest update too." Inside the last printed width station a blank's nose is drawn as a parabola with its
point on the stringer, so the outline leaves the tip straight across the stringer and meets that station at its
printed width and at the curve's own slope. The two numbers that shape it come from the printed widths alone;
nothing is set and nothing is stored. The control point (B) was not chosen: it needs a handle share to pick.

## Built (2026-10-07)
Quick task 261007-c3h, the same day: `lib/geometry/round-tip.ts` wraps the blank's width curve so a tip printed 0
wide is the parabola from the tip inside the last printed station, applied under the live square-root rule only;
`buildBlankTopView` adds 24 samples per tip spaced evenly in √(distance from the tip) so the drawn line stays within
0.15 mm of the curve; the sketch's own `curves.js` is kept at `reference/sketches/012-round-nose-curves.js` and a
golden generated from it (`scripts/extract-round-nose-golden.ts`) checks the app on all 43 affected blanks. Before and
after pictures of the real screen are in the task folder's `pictures/`. Merged locally on main (1687852); the push
waits for the founder's word.

## Pictures
`pictures/`: `a-today-slate.png`, `b-control-point-slate.png` (and `-daylight`), `c-parabola-slate.png`,
`side-by-side-slate.png` (and `-daylight`), and B on the Longboard at 20% and 50% handles.

## Source
`sketch-source.tar.gz` holds the scratch files behind `index.html`: the page template, the curve code (the
app's pchip and square-root rule ported line for line, plus B and C), the build step that inlines them with
the data, the script that pulled the blanks and boards from the app's own geometry
(`npx --no-install tsx --tsconfig ./tsconfig.json sketch012-data.ts` from the repo root), the check against
the app's samples, and the picture scripts.
