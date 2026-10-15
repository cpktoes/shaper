---
sketch: 013
name: wings-on-the-outline
question: "How does a wing read on the TEMPLATE outline — and what happens to the tail behind it?"
winner: "A"
tags: [viewer, template, outline, wings, fins, geometry, controls]
---

# Sketch 013: Wings on the outline

## Design Question
The founder (2026-10-14): up to two wings on a board, each **1/16" to 1" deep** (toward the stringer), with an
**offset of 0 to 1" along the stringer**, and running **from a sharp wing to a smooth bump** — "maybe a smoothing
slider that smooths the offset over a curve length of 0 to 3 inches". A wing's position along the board can be
**locked to the front fin**, with an offset from the fin. And, added while this was being built: whenever a wing is
added, a **Show fins** setting on the TEMPLATE page switches on (fin marks only, no dims) and a popup says *"Dial in
your wing placement. Edit fin placement on the fins page, then return to the template to fine tune the wing."*

Nothing about wings exists in the app today. The approved geometry design of 2026-08-18 reserved one line for them
("separate outline features — station, depth, hard/soft — combinable with any tail") and the audit run before this
sketch (2026-10-14) found the outline curve sound enough to carry them: two cubic Bézier spans, never wider than
the widepoint, smooth through the 12" stations, with the nose and tail shape already controllable. A wing is a
deliberate break in that curve, not a reason to replace it.

This sketch asks two things at once, because a wing cannot be judged without its controls: **how the step reads on
the drawing**, and **what the three shape numbers and the fin lock feel like to drive**.

## How the four numbers are read here
- **Position** — the station where the outline leaves the curve you drew (the nose-side edge of the step). With
  "Position marks: its middle" the number is the step's middle instead. Locked, it is the front fin's trailing or
  leading edge plus an offset of −3" to +3".
- **Depth** — how far the outline steps in toward the stringer, 1/16" to 1".
- **Run** — how far along the stringer the step itself travels: 0 is a square step, 1" an angled one.
- **Smoothing** — the step's two corners eased, half the length at each: 0 is a sharp wing, 3" a smooth bump. The
  step's whole length along the board is run + smoothing.

## How to View
open .planning/sketches/013-wings-on-the-outline/index.html

The app's TEMPLATE screen for the default board or any of the four presets, drawn with the app's own curve (this
page's copy reproduces the app's 161 points to within a millionth of an inch) and its own callout grammar, with the
last 26" of the tail three times closer above it. The thruster, twin and quad fins sit exactly where the FINS page
puts them with Import Template ticked (the Longboard is a single fin, so its lock is unavailable). The sidebar is
the TEMPLATE page's controls as the sketch needs them: the board, how many wings, each wing's four numbers and its
fin lock, and the Settings (Show fins, Show construction, Show the curve without wings). Every slider is live. The
⚙ tools switch Slate / Daylight and the tail window (20", 26", 32").

## Variants
- **A: Tail re-drawn to your block** — ahead of the wing nearest the nose the outline is your curve exactly; behind
  each wing its depth is taken out and fades to nothing at the tail pod, so the tail block keeps the number on its
  chip. Two wings add up, like a staircase.
- **B: Tail moved in** — behind a wing the whole tail is narrower by the depth, all the way down: the tail block
  narrows by twice the depth, and a pin or round tail reaches zero width early.
- **C: Flyer — width added ahead** — the curve you drew is the tail; ahead of the wing the outline is widened by
  the depth, fading back to your curve by the widepoint. The tail block and the 12" tail width are untouched.
- **Side by side** — all three on one tail: dotted the curve with no wing, solid ink A, blue B, dashed ink C.

## What to Look For
- Which construction is what you'd cut: does a wing take width out of the tail (A, B) or add it ahead of the fins
  (C)? Should the tail block you set survive the wing (A) or not (B)? Try B on the Mid-length's round tail.
- Drag Run and Smoothing on one wing: does run + smoothing cover every wing you've shaped, from a hard winger to a
  bump? Is 3" of smoothing enough, and is half-at-each-corner the right way to spread it?
- Lock a wing to the fin. Trailing or leading edge — which do you measure a wing from? Try the Fish (twin, fins
  7 1/2" off the tail) and the Mid-length (quad).
- Position marks: the point where the outline leaves your curve, or the middle of the step? A sharp wing has an
  obvious corner to measure to; a 3" bump does not.
- Two wings close together (try 11" and 13"): do the chips and read-outs stay legible? That is sketch 015's
  question, visible here early.
- The popup: once per board, or every time a wing is added? And should "Open FINS" really leave the page?

## Tested
In headless Chromium at 1440 px, Slate and Daylight, every tab renders with no console errors; the page's copy of
the app's curve matches the app's own 161 points on all five boards to 5e-7" (`check013.mjs` in the source archive);
with wings off every construction reproduces the base curve exactly; with two wings on, none ever rises above the
widepoint or below zero, A keeps the tail block, B narrows it by twice the depth; the step profile is monotone from
0 to 1 for every run/smoothing pairing tried. Adding a wing from None switches Show fins on and opens the popup
(`popup-slate.png`).

## If it gets built
- A wing is a new outline feature in `lib/geometry` (station, depth, run, smoothing, and the fin lock), applied
  after today's curve. Boards without wings redraw identically, so nothing saved changes shape. Every reader of
  the outline — the printed templates, FINS' tail drawing, volume, the Board Rack's turn, the ☰ tiles — follows
  through the one builder and sampler.
- The fin lock reads the FINS page's placement, so the two screens share state; the popup is how the shaper is told.
- The drag handles on the TEMPLATE screen would want a wing corner to grab (sketch 014's question), and the chips
  and right-rail read-outs need a rule for wings close together (sketch 015).

## Outcome (2026-10-14)
**Winner: A, the tail re-drawn to the block you set** — the founder: "construction wise, we definitely want to go A."
Ahead of the wing nearest the nose the outline is the curve the shaper drew; behind each wing its depth is taken out
and fades to nothing at the tail pod, so the tail block keeps the number on its chip, and two wings add up like a
staircase. The same review moved the controls question on to sketch 014 (a WINGS tab on the TEMPLATE page) and added
two rules there: a wing may sit anywhere from 6" to the board's centre (a stinger), and the WINGS tab shows no board
length or other template control.

## Pictures
`pictures/`: `a-slate.png`, `b-slate.png`, `c-slate.png`, `x-slate.png` (and `-daylight` for each), `a-slate-one-wing-sharp.png`,
`a-slate-phone.png`, `popup-slate.png`.

## Source
`sketch-source.tar.gz` holds the scratch files behind `index.html`: the page template, the curve code (the app's
`buildOutline` ported line for line, plus the three constructions and the step profile), the build step that inlines
them with the data, the script that pulled the five boards and their fin placement from the app's own geometry
(`npx --no-install tsx sketch013-data.ts` from the repo root), the check against the app's points, and the picture script.
