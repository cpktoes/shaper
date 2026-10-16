---
sketch: 016
name: custom-rocker
question: "With a blank picked on ROCKER, how does a shaper set the blank's rocker as ordered from the maker — nose and tail changes in the US Blanks notation, up to two per end — and how do the drawing, the blank's name and the DATASHEET show it?"
winner: null
tags: [rocker, blank, custom-rocker, sidebar, viewer, datasheet, phone, notation, us-blanks]
---

# Sketch 016: Custom rocker on ROCKER

## Design Question
The founder (2026-10-16): *"we need another worktree to look at how to address custom rocker … Is there consistency
between the naming/functionality that we can take advantage of to append a blank name with the custom rocker values and
show what that would look like in our app viewer?"* Then, after the research (`.planning/spikes/CUSTOM-ROCKER-PLAN.md`):
*"I like the idea of the US Blanks notation as it's descriptive even for other mfgs."* Typed changes only in the first
build ("any user doing custom rockers could look at a named alternative rocker and just enter its values"), the note in
inches in both systems, steppers rather than typing, *"but some custom rockers have a 2 point defined adjustment so we
need to plan for that too."*

So the question left is **where the control lives and how it reads**, and how the custom rocker shows on the drawing,
the blank's name and the DATASHEET.

## How to View
open .planning/sketches/016-custom-rocker/index.html

Computer (1280 × 900), phone upright (390 × 664) or phone sideways (844 × 340) from the bar; Slate or Daylight and
Imperial or Metric from the ⚙ Sketch tools; the Longboard preset in the US Blanks 9'4"B or the Shortboard in the 6'3"RP;
a row of real listed rockers to try (Natural, `-1/2"N24" +1/2"T24"`, `-1/4"N18" +1/8"T36" +1/8"T18"`, `+1/2"T`,
`-1 1/2"N`, `-2"T` reverse). Slide the changes, pick where each bend starts, add a second change, type in C's field,
switch to the DATASHEET. The ⚙ tools also switch the tip close-ups off.

Published for the founder's phone (private to the founder's account): https://claude.ai/artifact/VHmeU2C9rgSpaRpQ9inAmt
— on a phone the mock-up fills the screen and follows how the phone is held; Options holds the switches.

## Variants
- **A: The ROCKER section, two rows** — with a blank picked the sidebar's ROCKER section (today hidden, because the
  rocker comes off the blank) comes back as *the blank's rocker as ordered*: a NOSE block and a TAIL block, each a
  Change slider in 1/16" (1 mm in Metric) with a value box, Less rocker / More rocker beneath, a "Bend starts" chooser
  (At the centre · 6" · 12" · 18" · 24" · 30" · 36" · 48" in from that tip), and "+ Add a second nose change" for a
  maker's two-point adjustment. The note (`-1/4"N18" +1/8"T36" +1/8"T18"`) reads on the section line; ↺ Natural rocker
  clears it.
- **B: Inside the BLANK card** — the same rows live in the BLANK button's card, under the blank's name, behind a
  "Set a custom rocker ›" line. Everything about the blank in one place; no new section in the sidebar.
- **C: One field in the notation** — a text field typed the way the maker writes it, read back in words as you type
  ("Nose −1/4" from 18" in · Tail +1/8" from 36" in · Tail +1/8" from 18" in"), with a plain line when it can't be read.
- **All three side by side.**

In every variant the same things happen around the control:
- **The drawing**: the bent blank draws as the blank always has; the natural rocker runs dashed behind it in the blank's
  line; a short dashed mark crosses the blank where each bend starts (the Thinning Starts mark's own grammar); the
  board's five stations read the custom figures. At true proportion a 1/4" change is a few pixels on a computer, so the
  sketch adds **nose and tail close-ups** under the drawing (computer only), the natural dashed against the custom at a
  readable scale, with the tip's natural → custom figure and "bend from 18" in". Whether these earn their room is one of
  the questions.
- **The blank's name**: `9'4"B` on the first line with its litres, the note on the next line in the same ink, on the
  BLANK button and in the viewer's caption; `US Blanks 9'4"B -1/4"N18" +1/8"T36" +1/8"T18" — centered` on the order
  form.
- **The DATASHEET**: the BLANK group label carries the note; its Rocker row reads the custom figures at the catalogue's
  five stations (nose and tail tips exact) with the printed natural beneath each in small type; the footnote says so.
- **Units**: every figure follows Imperial/Metric (marks in whole millimetres); the note stays in inches — it is the
  maker's order code, like the blank's name (the founder's decision, 2026-10-16).

**Round two (the founder, 2026-10-16: "the user can save that blank for later. It should not replace the natural
rocker blank, but essentially add a new blank to our catalogue" … "which should always be starred when saved"):**
"Save this blank for later" under the rows keeps the custom rocker as a blank of the shaper's own —
`US Blanks 9'4"B -1/4"N18" +1/8"T36" +1/8"T18"` — starred the moment it is saved, so it sits at the top of the PICK A
BLANK popup under ★ STARRED with "Saved by you", its station table reading the rocker as ordered and a line to check it
on the foam; the natural 9'4"B stays listed under FITS THIS BOARD. "✓ Saved in your blanks · Remove" takes it out again.
Open Change blank › in the sketch to see the popup (`pictures/a-computer-picker-saved.png`, `a-phone-picker-saved.png`).

The maths is spike 002's even bend on the app's own curves: the two boards' natural side profiles were dumped by the
app's own code (`designSideProfile`, `prepareBlank`), and each change adds *amount × u²* past its bend point. A change
that moves the blank's low point re-levels there, as the app levels every blank; the sketch says so in a line under the
rows. The fit never changes.

## What to Look For
- Can you set a listed rocker in under a minute on a phone, including a two-point tail?
- Does the natural dashed line read as a reference, not a second blank? Are the unlabelled bend marks enough?
- Tip close-ups: worth their room on a computer, or does the app's zoom do? (They are off on a phone.)
- The name: note on its own line under the name, or run on as one name? And on a phone's screen tile (`On a 9'4"B…`)?
- The DATASHEET's BLANK Rocker row: custom with natural beneath, or two rows, or a footnote only?
- A, B or C — or A with C's field as a second way in for a shaper who has the maker's code?

## Not drawn
The TOP VIEW inset, the toolbar's real buttons, the fit flag, Remove This Blank's effect, the picker popup, the hand-set
rocker's own section (no blank), and the order form page itself (its line is quoted on the DATASHEET tab).
