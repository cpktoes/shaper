# Sketch Manifest

## Design Direction

The board viewers should read as **technical drawings a shaper already knows how to read**, not as
app UI with numbers floating on it. The reference point is a real shaping template: light extension
lines, ticked dimension lines, values sitting in a break in the line, a centreline that announces
itself as the board's axis. Restraint is the whole point — one ink for dimensions, one dash for
stations, one dash for the stringer, and no colour doing decorative work. The palette is the app's
existing `--outline-*` tokens, not a new one; these sketches deliberately introduce no new hues.

The organising idea is that **arbitrary placement is the enemy**. Every defect measured in the
current fins viewer traces back to labels positioned by per-label pixel arithmetic. So the system
these sketches land on is one where offsets are structurally constrained: dimension lines snap to a
small fixed set of rails, and a new label must join a rail or define one, never land wherever it
happens to fit.

### Phone chrome (sketches 007–008, 2026-10-03)

The founder's rule for phones — "phone real estate is expensive, we need to save all of it" (Phase 13 item
9e) — applied to the six-screen tab bar: move the screens into the ☰ menu the way a sideways phone already
works, and let each screen end with a step-by-step "next screen" button so the usual walk through a board
needs no menu ("almost wizard like"). These two sketches use the app's own slate and daylight palettes
(`themes/app-slate.css`, `themes/app-daylight.css`), not the drafting palette above.

### Board rack (sketches 009–010, 2026-10-05)

The founder's idea: hold Your Boards sideways, like a shop rack. Skinny cards with the name and dims in one
line of vertical text and the board's rocker profile, and only the board you're on turns to its outline.
The founder wants all three of *see the whole quiver*, *compare rockers* (every board at one scale on one
floor line) and *fun to browse*. Show both a clean-drawing look and a real shop-rack look. Phones and
iPads swipe along the rack with the middle board turned (009, sketched first at the founder's request);
computers turn the board under the cursor (010). The turn is the board's real turn: each station's
cross-section projected at the turn angle, from the app's own rocker, thickness and outline.

Two requirements from the founder while 010 was being built (2026-10-05): the section is called **Board
Rack** ("rename it Board Rack rather than Your Boards"), and **"the user must be able to reorder the board
rack."** On a computer that is a drag along the rack (010). On a phone a sideways drag already swipes the
rack, so a board is held until it lifts and then slid along (011).

### A nose printed 0 wide (sketch 012, 2026-10-07)

The founder: "For blanks with a 0 N0 value, the nose should have maximum roundness. i.e. The spline control
point would be perpendicular to the stringer, so that the spline essentially starts totally perpendicular to
the stringer before curving through the next data points." Today ROCKER's top view runs the square-root width
curve straight into the 0 at the tip, so 43 of the catalogue's 162 blanks draw a pointed nose where the foam is
round. The sketch draws the live curve (A), the founder's control point across the stringer (B, with the handle
length to feel) and a parabola from the tip fixed by the printed numbers alone (C), on five real blanks — one
each for the catalogue's 3", 6" and 12" last printed segments — in the app's own top-view strokes.

### Wings on the outline (sketch 013, 2026-10-14)

The founder: up to two wings, each 1/16" to 1" deep toward the stringer, an offset of 0 to 1" along the stringer, and
"a sharp wing to a smooth bump" — a smoothing slider spreading the step over 0 to 3" of curve; a wing may be locked to
the front fin's position with an offset; adding a wing turns on a "Show fins" setting on the TEMPLATE page (marks, no
dims) and pops up "Dial in your wing placement. Edit fin placement on the fins page, then return to the template to
fine tune the wing." Before the sketch, a read-only audit of the outline maths (2026-10-14) found the two-span cubic
Bézier sound enough to carry wings — never wider than the widepoint, smooth through the 12" stations, nose and tail
shape already controllable — so the wing is drawn as a break applied after today's curve, not a new curve family. The
sketch draws three constructions on five real boards with the real fin placement: the tail re-drawn to the block you
set (A), the tail moved in (B), and a flyer that adds width ahead of the wing (C), every number on a live slider.

### The WINGS tab (sketch 014, 2026-10-14)

The founder, on seeing 013: "maybe we need an 'add wings' tab on the template page, which provides this zoomed in section
of the tail. Then go back to viewer for the full board. That simplifies the controls too, since the add wings tab would
only have the wing controls and the regular viewer doesn't need them at all." The sketch mocks today's TEMPLATE page with
that tab beside VIEWER (ADD WINGS until there is one, then WINGS · 1 or · 2), the tail close-up inside it, and three homes
for the controls: the sidebar swapping to them (A), a column inside the tab (B), and A with grab points on the drawing (C).

## Reference Points

- Traditional drafting / engineering-drawing conventions (extension lines, end ticks, value in a
  break, reference dimensions in parentheses, long-short-short centreline)
- Real full-size shaping templates, which the audience already reads
- The app's own `--outline-*` token palette in `app/globals.css`

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | viewer-callout-system | What grammar should dimension callouts use? | **D — Hybrid** (rails) | viewer, callouts, svg, drafting |
| 002 | input-output-distinction | How to distinguish computed values from user inputs? | **C — Dual system** (chips vs dimension lines) | viewer, information-design |
| 003 | stringer-and-station-lines | Should the stringer read differently from station lines? | **B — Distinct centreline** | viewer, reference-lines, consistency |
| 004 | clean-interior-svg | Where do values go once nothing may sit inside the outline? | **A — Aligned rail** | viewer, callouts, svg, refinement |
| 005 | horizontal-board-view | What does the Template screen look like with the board horizontal, nose left? | **C — Full-bleed** (layout premise superseded by 006) | viewer, layout, callouts, svg, post-mvp |
| 006 | orientation-switch | How does the shaper turn the board horizontal, without moving anything else? | **Rotate in place**, button in the viewer's upper-right | viewer, layout, icon, interaction, post-mvp |
| 007 | phone-screens-in-menu | With no tab bar at the bottom, how does an upright phone show which screen you're on and take you to another? | **C1 — Tiles from your board** (☰ sheet of six tiles, each drawn from the current board; no bottom tab bar) | phone, layout, navigation, chrome |
| 008 | next-screen-button | What does the step-by-step button under the last control look like? | **B — Back + Next** ("Together" tab: on 007-C1) | phone, navigation, wizard |
| 009 | phone-swipe-rack | On a phone or iPad, how does swiping along a sideways board rack feel, with the middle board turned to its outline? | **B — Turns as it passes** (in 010's Drawing look) | phone, home, board-rack, interaction, motion |
| 010 | sideways-board-rack | On a computer, what does the Board Rack look like, and how does a board turn and move under the cursor? | **A — Drawing rack**, turn follows the cursor | desktop, home, board-rack, interaction, motion, reorder |
| 011 | phone-rack-reorder | On a phone, where a sideways drag already swipes the rack, how does a shaper move a board to a new place? | **A — Hold and drag** (tried on a phone) | phone, home, board-rack, reorder, interaction |
| 012 | blank-round-nose | When a blank prints its nose tip 0 wide, how should its outline reach the tip on ROCKER's top view? | **C — Parabola from the tip** (nothing to set) | viewer, rocker, top-view, blank, geometry |
| 013 | wings-on-the-outline | How does a wing read on the TEMPLATE outline, and what happens to the tail behind it? | **A — Tail re-drawn to your block** (depth fades to nothing at the tail pod; two wings stack) | viewer, template, outline, wings, fins, geometry, controls |
| 014 | wings-tab | With wings on a WINGS tab of the TEMPLATE page, where do the wing controls live, and how is a wing grabbed? | _pending_ | template, wings, tabs, controls, sidebar, phone, interaction |

## Decisions These Lock In

1. **Callout grammar** — drafting dimension lines, every one snapped to a fixed rail. Shortest
   dimension nearest the part. Short spans place their value outside the ticks.
2. **Inputs vs outputs** — distinguished by *system*: computed values get dimension lines, inputs
   get gutter chips under a labelled header. Not by colour, not by punctuation.
3. **Per-page content** — Fins shows outputs only (inputs are in the sidebar and were judged
   clutter). Template shows both, because its dimensions are the subject of the screen.
4. **Reference lines** — stringer `16 4 4 4`, station lines `5 4`, both faint and identical on
   every page. The mid-length **centreline is static too**, so it shares the stringer's dash.
5. **Nothing inside the outline but faint lines** — no text crosses the silhouette (sketch 004).
6. **Outputs right, inputs left** — derived widths on one aligned right rail; input chips in the
   left gutter, each naming its own value. Length centred above the nose.
7. **Widepoint is an input even at centre** — it gets its own station line in the widepoint colour
   on a dotted dash, plus rail dots. Centre width is a derived output on the static centreline. On
   the current board the two lines land 4px apart and both widths read 19", so **colour is what
   separates them** — a dash difference alone is not legible at that distance. (Revised 2026-08-22:
   originally dots only, which read as an absence rather than a station.)
8. **Labels are SVG `<text>`**, not absolutely-positioned HTML.

9. **Phone screens move into ☰ as tiles drawn from the current board** (sketch 007 C1, round 2,
   2026-10-03) — on an upright phone the six-screen tab bar goes; ☰ opens a sheet of six tiles (the
   current one ticked) above Home, Contact, Privacy, Units, Theme and the account. Each tile is its
   screen's own drawing of the board, labels left out; Volume shows the board's real litres (never a
   made-up number). The 56 freed dots go to the controls (122 → 178 on an iPhone 14).
10. **Each design screen ends with Back + Next** (sketch 008 B) — "← previous" and "next →" side by side
   under the last control, in the order Template, Rocker, Rails, Volume, Fins, Summary; the first screen
   has only Next, the last only Back. ☰ is for jumping around; Back + Next is the usual walk.
11. **On a phone or iPad, Your Boards is a sideways rack you swipe** (sketch 009 B, 2026-10-05) — boards stand
   on their tails at one true scale on one floor line, name and dims running up beside each; every board turns
   to its outline as it passes the middle, following your thumb, and the rack settles with one board fully turned
   and its name, dims, Open and ⋯ underneath. The turn is worked out from the board's own rocker, thickness and
   outline. Drawn in the Drawing look (sketch 010 A).
12. **It's called the Board Rack, and the shaper sets its order** (the founder, 2026-10-05) — "Board Rack"
   replaces "Your Boards" as the heading, and boards can be moved within the rack. Today's automatic order
   (unsaved board first, then most recently touched) becomes the starting order only. The unsaved board stays
   first and can't be moved until it's saved (confirmed by the founder, 2026-10-05).
13. **On a computer, the Board Rack is drawn and turns as the cursor passes** (sketch 010 A, 2026-10-05) — the
   app's drafting style (board fill, ink edge, faint dashed height lines every foot or 50 cm, a floor line), all
   boards at one scale on one floor. Boards turn as the cursor sweeps along, the rack opening around the turning
   board; when the cursor stops, the nearest finishes turning, its name, dims, Open and ⋯ under it, and it stays
   turned when the cursor leaves. A board is moved by pressing and dragging it (into another row too), or with
   ⋯ → Move left / Move right, or Alt + arrow. The same Drawing look is used on the phone (009 B).
14. **On a phone or iPad, a board is moved by holding it until it lifts, then sliding it** (sketch 011 A,
   2026-10-05, tried on the founder's phone) — a quick swipe still moves the rack; a held board turns blue and
   follows the thumb, the others slide over, a mark shows the gap, and near the screen's edge the rack scrolls
   along; the dropped board comes to the middle and turns. The heading reads "hold to move".

15. **A nose printed 0 wide is drawn round, by a parabola from the tip** (sketch 012 C; the founder, 2026-10-07:
   "C looks great and seems like the simplest update too") — inside the last printed width station the blank's
   half-width is a·√d + b·d, d the distance in from the tip, so the outline leaves the tip straight across the
   stringer and meets that station at its printed width and at the curve's own slope. The two numbers come from
   the printed widths alone: nothing is set, nothing is stored. Everything from that station back is today's
   square-root curve, exactly, and every printed station still reads its printed number. The same rule would
   apply to a 0-wide tail, though no catalogue blank prints one. The founder's control point (B) was not chosen:
   it needs a handle share to pick. The width curve is shared with the fit check, so a board flagged too wide
   inside the last printed station can come to fit once this is built. Built the same day in quick 261007-c3h
   (`lib/geometry/round-tip.ts`; merged locally on main, the push on the founder's word).

16. **A wing takes its depth out behind the step and the tail block keeps its number** (sketch 013 A; the founder,
   2026-10-14: "construction wise, we definitely want to go A"). A wing is a step applied after today's curve: ahead of
   the wing nearest the nose the outline is the curve the shaper drew; behind each wing its depth (1/16" to 1") is taken
   out and fades to nothing at the tail pod, so the tail block stays as set and two wings add up like a staircase. The
   step has a run along the stringer (0 to 1") and a smoothing (0 to 3", eased half at each corner); its position is a
   station from the tail or the front fin's trailing or leading edge plus an offset. Boards without wings redraw
   identically. Adding a wing switches on a "Show fins" setting on the TEMPLATE page (marks only, no dims) and pops up
   "Dial in your wing placement. Edit fin placement on the fins page, then return to the template to fine tune the wing."

## Open Questions

- Phone chrome (007/008): ~~does a phone held sideways keep its screens list in ☰ or switch to the tiles
  too?~~ Answered: tiles too (the founder, 2026-10-03, "use on all screens that condense the top bar into a
  menu"; built in quick 261003-q2f, one row of six sideways). Do Back + Next also appear on a computer, at
  the foot of the sidebar? Does the freed height go to the
  controls (as sketched) or should the drawing's 66% cap grow?

- If the fins diagram is ever printed standalone, its inputs lose the sidebar. Reintroduce as chips,
  or use sketch 002 variant B's parenthesised reference dimensions for print only. Undecided.

## Affected Components

`components/outline/outline-viewer.tsx`, `components/fins/fin-viewer.tsx`, and their consumers
`outline-editor.tsx`, `fin-placement-editor.tsx`, `board-summary.tsx`, `preset-card.tsx`.
Sketch 012: `lib/geometry/root-curve.ts` / `blank-fit.ts` (the width curve the fit check and the top view
share), `lib/geometry/blank-top-view.ts`, `components/rocker/rocker-top-view.tsx`.
