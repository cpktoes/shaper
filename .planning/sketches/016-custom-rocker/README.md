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

**Round three (the founder, 2026-10-16):**
- *"Let's write natural after the blank name just like we would when defining a custom rocker, this seems way more
  consistent and let the customer know that the values are natural."* So every blank is named the same way: the name,
  then its rocker — `9'4"B` / `Natural`, or `9'4"B` / `-1/4"N18" +1/8"T36" +1/8"T18"` — on the BLANK button, the
  picker's cards, the viewer's caption (`Your board on US Blanks 9'4"B Natural`), the DATASHEET's group label and the
  order form (`US Blanks 9'4"B Natural — centered`).
- *"I don't think the close-ups are necessary."* Gone.
- *"Let's put the rocker text on its own line, including natural for the natural rocker."* Done everywhere above.
- *"A custom rocker card should show the natural rocker and below it the new values on another line. I don't wanna
  waste space on the title, but the user clearly needs to know which one is which. I think we could write the word
  natural, or NAT for natural and then the word rocker or the actual value with [the] adjustment."* So a card's table
  (and the DATASHEET's BLANK block) has a natural row with the catalogue's figures and, on a custom blank, a second
  row holding the ordered figures. The title line stays the blank's name alone.

**Round four (the founder, 2026-10-16):** *"The data table name can be Custom Rocker. There's no need to repeat all of
the dimensions since that is the appended name line of the blank."* So the two rows read **Natural Rocker** and
**Custom Rocker** (NAT is an accepted short form), and the adjustment is written once, on the name line.

**Round five (the founder, 2026-10-16) — the control is settled as a new variant, D:**
- *"I also think we should add an advanced menu just like we have on other pages that hides the custom blank controls
  until you open the advanced menu and click [the] Customize Rocker button, which has a similar effect as the Add
  Wings button — in fact, let's make the custom rocker controls in a big popup window. When using a blank with
  customized rocker the button changes to Edit Custom Rocker where the pop-up would then allow further alteration and
  the ability to save it — [as an] edit, or create [a] new blank."* So **D**: an ADVANCED section at the foot of the
  sidebar (FINS' own `DisclosureHeading`, closed by default) with one button, **Customize Rocker ›** / **Edit Custom
  Rocker ›**, opening a popup the size of PICK A BLANK: the drawing on top (upright on a phone), NOSE and TAIL rows,
  ↺ Natural rocker, and a footer of Cancel · Save as a new blank · Use on this board, plus Save changes to this blank
  when the board uses a saved custom blank. The sidebar shows only the result; A, B and C stay as the alternatives seen.
- *"When switching to a different blank, yes, we should clear custom rocker and start from natural."*
- *"We don't want any rocker values to go negative. A negative rocker where the nose or tail would be below the
  centerpoint is not a realistic board."* Each slider now stops at the floor that keeps every part of the blank at or
  above the centre's height (its left hint says "Floor — the tip would drop below the centre" when it's there), and
  the −2"T reverse preset lands on that floor instead. The founder recalls the makers limiting changes to about ±2";
  +2" stays the top.
- The phone's screen tile: the rocker text on every horizontal screen; on an upright phone only if it doesn't shrink
  the tile's board drawing.

**Round six (the founder, 2026-10-16):** *"Move the customize rocker button underneath the choose blank card. On the
pop-up, the options should be use and save as a new blank, or use and edit current blank. The second option should
only be shown if editing an already customized rocker; if the rocker started as natural, only the 'use and save as a
new blank' should show. The controls panel should be on the left, and scroll independently of a fixed viewer window on
a phone. The viewer window should remain fixed and the controls scroll in the space underneath it just like the
standard rocker page."* All applied: no ADVANCED section — the button sits right under the blank card; the popup is
laid out like the ROCKER page (rows left and scrolling, drawing right; on an upright phone the drawing pinned on top,
the rows scrolling beneath); the footer is Cancel · **Use and save as a new blank**, with **Use and edit current blank**
only when the board already uses one of the shaper's custom blanks. So every custom rocker in use is a saved blank; a
draft put back to natural offers "Use the natural rocker".

**Round seven (the founder, 2026-10-16):** *"When adding two nose rocker adjustments, the first one must be further
away from the nose than the second one, so limit the second one accordingly. The math should be such that the first
curve is fully applied then the second is applied in addition to the first, meaning if we add a half inch nose rocker
from center and a half inch nose rocker from 18 inches, the total height above natural at the tip should be 1 inch.
Rather than a drop-down, converted to a slider in 1 inch increments; the rocker and the position sliders can be on the
same row."* Applied: each change is one row of two sliders — Rocker (1/16") and Bend starts (1" steps, from 3" in to
the centre); a second change's Bend starts slider stops one inch nearer the tip than the first's, and moving the first
pushes the second in front of it. The stacking is the even bend's own sum, checked on the sketch's build: natural nose
tip 4 3/4", `+1/2"N +1/2"N18"` → 5 3/4", exactly 1" more.

**Round eight (the founder, 2026-10-16):** *"Just like the US Blanks catalog let's show the deviation from natural
as a red outline for the first adjustment and a blue that will show up in all of our themes as the second adjustment.
Refer to page 11 of the catalogue."* The September 2026 catalogue's page 11 ("Rocker Selection cont'd") draws the
6'4"EA three ways, the adjusted outline — deck and bottom — red over the first adjustment's span and blue over the
second's, the formula's figures in the same colours. The sketch now draws exactly that over the bent blank, with the
popup's header colouring the note the same way; two colour tokens per theme (`--adj-1`, `--adj-2`) chosen to read on
Slate and Daylight.

**Round nine (the founder, 2026-10-16):** *"We definitely need a show board toggle, I think it's very useful to see
only the blank at times. Let's make the default to not show the board."* The popup's drawing has a **Show my board**
switch, off by default: the blank alone on its bottom plane, its nose and tail figures (natural → as ordered) on the
rails, the red and blue adjustments over it; switched on, the board sits in the blank with the five stations as the
page draws them.

**Round ten (the founder, 2026-10-16): a drawing bug, caught by the founder.** *"I'm seeing positive rocker, but the
image is displaying it as reduced rocker"* and *"one of the examples said nose rocker was from center but the red line
only went back about 18 inches."* The popup's drawing coloured the red and blue spans from the board's current rocker,
not from the draft being edited, so the overlay could follow a different curve from the foam — and read as less rocker,
or start at the saved blank's 18" bend while the draft said the centre. The figures were right throughout (for `+1/2"T`
the tail tip reads 3 1/2" → 4", the 12" station +9/32"); the overlay now follows the curve it is drawn on. The build
must never carry two specs into one drawing: the geometry hands its own spec to the drawing (the fix here), and a unit
test should read the overlay's span off the same spec as the curve.

**Round eleven (the founder, 2026-10-16):** *"The red and blue lines on the customize rocker should only be on the
customize rocker pop-up. We don't need the colored lines after the change has been saved, and the user is back using
the regular parts of the app."* — *"The red and blue line are just so you could see in real time what that change is
doing to the actual curve of the blank."* So the overlay is a live aid inside the popup only; the VIEWER afterwards
shows the bent blank with the natural rocker dashed behind it, nothing coloured.

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
