# Phase 17: BOTTOM — Bottom Contours a Shaper Can Map, Measure and Cut - Context

**Gathered:** 2026-11-08
**Status:** Ready for planning

<domain>
## Phase Boundary

A shaper maps, measures and cuts the bottom of the board they designed, on a new design screen called **BOTTOM**
between ROCKER and RAILS. Each of three sections — Nose, Center and Tail — takes one of six named cuts (a flat, a
belly, a vee, a single or a double concave, under the names a shaper uses), and the tail can take four, six or eight
channels cut last. The bottom is seen from above with every cut as a shade and a contour line at each 1/16" of depth,
in a cross-section at a station the shaper slides along the board with the depths dimensioned as a gauge reads them,
in a DATA table of depths and layout marks every 6", and in a GUIDE that teaches each cut with a cartoon drawn from the
open board. One number drives all of it — the foam taken off at a station and a distance from the stringer — so
VOLUME's litres, the 3D board, the CNC files and RAILS all read the same cut.

The founder's words (2026-11-06): *"looking down on the template to mark out the shapes and locations, and a cross
section view that moves up and down the board, showing the blend and depth"*; a panel *"very similar to RAILS"*; *"as
real as possible and be simple to follow dims for shaping it"*. His verdict on the page as sketched (021, 2026-11-07/08):
*"The Guide looks awesome. Love everything about it."* … *"This all seems really great."* … *"Put the proposed starting
numbers into the sketch, and I think we're done here."*

**Not in this phase:** Bonzer bottoms; a contour printed full size or a card gauge; contour controls on the 3D screen;
a GUIDE on the other pages (its own todo and sketch 022); GUIDE cards that put a cut on the board when tapped; presets
with contours; reading a contour in from Shape3D or AkuShaper files; a database change.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**15 requirements are locked.** See `17-SPEC.md` for full requirements, boundaries, and acceptance criteria. The
founder locked it on 2026-11-08 ("Lock the brief").

Downstream agents MUST read `17-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):** the BOTTOM screen between ROCKER and RAILS (R1); five cuts behind eighteen names in three
sections (R2); the one foam-off number, cuts stacking and only taking foam away, the planed thickness (R3); the controls
per cut in RAILS' dress (R4); channels inside TAIL (R5); the top view's shade and lines (R6); the cross-section (R7);
DATA (R8); the GUIDE tab (R9); the WINGS selector (R10); VOLUME, the 3D board, the CNC files, RAILS and FINS reading the
cut, fin-driven stations following the front fins (R11); one optional saved field, no database change (R12); Rule 2
(R13); numbers not contours on paper, presets flat (R14); pictures and one go-live gate (R15).
**Out of scope (from SPEC.md):** Bonzer; printed contours or a card gauge; contour controls on 3D; a GUIDE on other
pages; tappable GUIDE cards; presets with contours; importing contours from files; a third drawing per vee.

</spec_lock>

<decisions>
## Implementation Decisions

Every decision below is the founder's unless marked otherwise. Most were ruled on sketches 019, 020 and 021 between
2026-11-06 and 2026-11-08 and are recorded in their READMEs in his words; the discussion of 2026-11-08 added D-03's
center-cut clause, D-09, D-14, D-18, D-08's and D-11's "as they stand", D-10's "starts only" and D-28 — all on the
brief's proposed readings, which he took ("Take all three"; the four open points left on the sketch's own answers).

### Where the screen lives
- **D-01:** **BOTTOM is the third screen, between ROCKER and RAILS** — TEMPLATE · ROCKER · BOTTOM · RAILS · VOLUME · FINS
  · SUMMARY · 3D. His shop order: after the outline is cut and the blank planed to near finished thickness, before rail
  banding; and RAILS works from what the bottom leaves (D-22). He asked once whether the fins should come first and chose
  *"Let's leave as is"* (2026-11-08) because the fins are read, not waited for (D-03). Back and Next follow: ROCKER's Next
  goes to BOTTOM, BOTTOM's Next to RAILS. Every place that counts seven screens — `NAV_LINKS`, the phone's ☰ sheet, the
  Back/Next chain, the browser specs — counts eight. — **Reversibility:** reversible — a nav order and a tile count.
- **D-02:** **Eight phone tiles: four by two upright, one row of eight sideways** — the same width-alone rule that puts
  seven tiles 4 + 3 upright and in one row on a short screen today (Phase 16 D-03). The tiles get narrower in the row;
  the sideways floor is measured again (seven needed the 120 → 104 change). The tile's picture is the UI-SPEC's.
- **D-03:** **The fins are read from the outline, and fin-driven stations ride with the front fins.** The front-fin
  station and toe are calculated from the outline (`computeFinPlacement`), so BOTTOM ticks FRONT FINS on its top view
  and opens every tail cut deepest there without waiting for FINS. The stations that are defined from the fins — a TAIL
  cut's Deepest At and the channels' Start and Deepest At — are STORED as a distance from the front fins, so a fin move
  on FINS carries them (his first fin note, 2026-11-08). The CENTER and NOSE cuts whose starting numbers mention the fins
  (the Deep Single's deepest halfway from the wide point to the fins, the Early Double's deepest and end, the hull's end)
  are plain stations once set and do not follow the fins (the brief's reading A5, taken 2026-11-08). —
  **Reversibility:** costly — the saved field's shape and every reader of those stations.

### The cuts and the one number
- **D-04:** **Eighteen names, five cuts, three sections; every board opens flat.** Nose: Flat Entry, Rolled Belly Entry,
  Teardrop Nose Concave, Blended Nose Concave, Slight Single Concave Entry, Reverse Vee Nose. Center: Flat Center, Deep
  Single Concave, Shallow Single Concave, Early Double Concave, Continuous Belly / Rolled Mid, Tri-Plane Hull Center.
  Tail: Flat Exit, Double Concave Exit, Panel Vee, Spiral Vee, Rolled Vee, Extending Single Concave. Each name is a
  flat, a belly, a vee, a single concave or a double concave (Spiral Vee is a double with a Vee Lift; the Tri-Plane is a
  vee with a flat panel at the stringer; the Reverse Vee Nose is a vee under the nose). Bonzer is out. A new board and
  every preset open with all three sections flat and no channels, so no card's litres moves.
- **D-05:** **Thickness is the planed number; contours only take foam away; one number drives everything.** The app's
  thickness is what the blank is planed to and the contour comes out of it: a concave leaves the rail line on the
  rocker and lifts the stringer, a vee or belly leaves the stringer and lifts the rails, and the page shows what the
  stringer finishes at. The one number is **foam off at (station, distance from the stringer)** — the sum of the cuts,
  never below zero. Cuts stack in shaping order: the three sections, then the channels last, into whatever the sections
  leave (a single into a double leaves the stringer as the ridge; a spiral vee is a double cut into a vee; a section's
  cut may run past its section and stack where it overlaps another). Every reader — the shade, the section, DATA, the
  litres, the 3D board, the CNC files, RAILS, FINS — calls that one function. — **Reversibility:** costly — every
  reader is written against it.
- **D-06:** **Depth runs 0 to 1/2" in 1/16" steps; the section curves are the sketch's.** Depth is a mark (1/16" steps;
  whole millimetres in Metric). Smoothness 0–100 runs a cut from straight-to-the-edge to rounded-out. The sketch's
  curves are the starting point research confirms or improves on without changing what the founder saw: with u from 0
  to 1 across the cut and r = smoothness/100, a concave's depth profile is `(1−r)(1−u) + r(1+cos πu)/2` and a lift's is
  `(1−r)u + r(1−cos(πu/2))`; along the board the depth fades by smoothstep Start → Deepest → End; an end that lands on
  a tip runs out at full depth; a concave narrower than 3" shallows in proportion (no slot at a tip); the Teardrop closes
  to a point by a square-root taper of its half-width — the "Closes to a point toward the center" box shows on all three
  nose single concaves and is ticked by the Teardrop's starting numbers alone, as the sketch has it (*sharpened
  2026-11-08 at the screen contract; R4 reads the same*). Smoothness does not move the litres (0.5442 L at 0, 50 and 100 on
  the test single). (Claude's working, accepted by the founder as drawn.)
- **D-07:** **Start, Deepest At and End are taped from the nearest tip** — the nose for the Nose section, the tail for
  Center and Tail (*"yes"*, 2026-11-06). Every station slider runs nose (left) to tail (right) like the drawing; the
  Center and Tail sliders fill from the thumb to the tail as ROCKER's Tail Thinning Starts does. Start ≥ Deepest ≥ End
  along the board is kept by the controls.
- **D-08:** **The starting numbers per name are the researched set, as they stand in sketch 021.** *"Put the proposed
  starting numbers into the sketch"* (2026-11-08); left as they are at the discussion. They move from the sketch's
  `NAMES` table into the geometry fixtures as the number a shaper sees the moment a name is picked (the table is in
  `<specifics>`; the sources are in the starting-numbers todo). They remain his to correct at plan approval or at the UAT
  on the live page; the teardrop's length was his one flag and is now 36".
- **D-09:** **A cut deeper than the foam left near a thinned tip is drawn as set and flagged.** The maths never takes
  the stringer below the app's 1/4" floor; the slider shows the depth as set, one sentence in warning ink under it and
  the DATA row say the cut meets the floor — the same treatment Phase 14 gives a Thinning Start set too close (D-21
  there). (The brief's reading A6, taken 2026-11-08.)

### The channels
- **D-10:** **Channels live inside the TAIL card, none to start, Parallel the opening run, the shape his.** *"Stagger
  looks good now. B: Inside Tail, Channel Default = none. Wings rule should have a selector, narrowest outline by
  default. Run default is parallel to stringer."* (2026-11-07). Under the tail's own cut: Channels None / 4 / 6 / 8 —
  picking a count brings that count's starting width (2 1/2" · 1 3/4" · 1 1/4") unless the shaper has set one; Channel
  Width (one number at every station); Off Stringer (0 by default — the stringer is the first peak); Start, Deepest At,
  End; Depth; Smoothness (a straight ramp at 0 to a scooped one at 100); Run — Parallel to the stringer (laid out at the
  deepest station and ruled straight; the outer ones run out through the rail where the outline narrows), With the rail
  (the last wall keeps its distance off the rail, so the set narrows toward the tail together; once the gaps have
  closed the outer channels run OUT through the rail, never pinching every channel — held to exactly that at the
  go-live gate, D-43), or Toe-in (splayed at the front
  fins' angle read from FINS — 3.2° on the Shortboard, 2° on the Fish; a single fin has no toe and the choice says so);
  Longest — Inner pair, Outer pair or All the same — and Stagger (how much shorter each channel out from the longest
  pair starts; 2" to start, 1/2" steps, hidden for All the same; a stagger too long stops an inch ahead of the deepest
  station so the shortest channel keeps a lead-in). **The shape:** *"a channel is actually more like a quick V that goes
  into a vertical wall … the stringer is also a peak of a V and each channel's peak is the new start of the next V"* —
  one sawtooth out from the stringer: the stringer a peak, each channel's floor deepening outward to a vertical wall at
  the RAIL side whose top is the next channel's peak, no flat ridge between; the walls ruled at Width, 2 × Width,
  3 × Width (Wall 1, Wall 2, Wall 3 on the ruler and in DATA); the last wall's distance off the rail READ OUT on the
  Width label with the ramp's angle, never set, and a set that would not fit inside the rail squeezed and saying so; no
  Wall control (*"I don't think the wall control is necessary"*). Every channel is deepest at the same station and they
  end together; a wall is ruled and cut only from its own channel's start, so the fronts step on the top view and the
  walls appear one by one on the ruler as the section moves aft. **Only the starts stagger** (the ends and the deepest
  station do not — left as built, 2026-11-08). A channel narrower than an inch shallows out, as a concave does.
- **D-11:** **The channels' starting numbers:** 5/16" deep, from 12" ahead of the front fins, deepest at the front fins,
  out the tail, Off Stringer 0, Smoothness 0, Parallel, the OUTER pair longest with a 2" stagger — the research of
  2026-11-08, put into the sketch at his word and left as they stand.

### The drawings
- **D-12:** **The top view is the shade WITH the lines, at every 1/16" of depth.** *"shades and lines are the way to
  go, but lets make the contour lines at 1/16"."* (2026-11-06, choosing sketch 019's C over the 1/8" drawn). Nose left
  like ROCKER: the board fill and ink edge, the stringer's dash, the wide point and the front fins ticked and named on
  one rail above the board, the live cut's Start · Deepest · End ticked and taped on one rail below (from the nearest
  tip, D-07); each cut a faint wash darker where deeper with a line at every 1/16" over it; the pencil lines a shaper
  would rule — a concave's edge, a double's flat (Off Stringer) and trough, a tri-plane's panel, every channel wall,
  stepping where the channels stagger; the fin boxes drawn at their FINS placement (his second fin note); the section's
  cutting line as the drawing convention's dash-dot with a grab dot in the accent — drag it, or tap the board, and the
  section follows. Sketch 004's "faint lines only inside the outline" rule bends for the shade on this page alone, by
  his choice.
- **D-13:** **The cross-section is a gauge's view.** The planed slab with the square rails BOTTOM finds (no bands yet),
  the planed bottom as a dashed straightedge rail to rail, the cut above it; Height ×1 / ×2 / ×4 / ×8 labelled on the
  drawing (×4 the opening pick on the viewer, ×8 in the GUIDE's cartoons); a break line when the slab would not fit;
  dimension lines where a shaper would put a gauge — the gap under the straightedge at the stringer, the lift at each
  rail, a double's trough and a channel's floor on their own lines, the stringer left when the whole slab is drawn — a
  label drawn only when it would read at least 1/16" (1 mm), never 0". One scale for every station, set so the wide
  point's section spans 95% of its box (20 dots of air a side); the rail-lift value reads under the straightedge at the
  right rail when there is no room beside the rail, beside it at a narrow station; the stringer-left dimension draws
  only when there is room (*"maximize the width of the cross-section … near full screen width at the board's wide
  point"*, 2026-11-08). The finished rail from RAILS sits on what the contour left as a ghost line, OFF until its box
  is ticked (*"Maybe don't show the finished rails from rails by default"*).
- **D-14:** **The ruler of layout marks stays, on a computer, for the cut being edited.** Under the straightedge a ruler
  laid from the stringer ticks every layout mark of the live cut with its distance (a single's edge; a double's flat,
  trough and edge; every channel wall), on a wide screen only (a section box wider than about 625 px — it needs 92 px
  for its second row of values); a phone keeps the depths alone, and DATA's layout-marks table (D-16) is the phone's
  and the paper's version. (He could not find it on his first look — *"I don't see a ruler of the ticks you talk of"* —
  it was shown to him in a close picture; left as built, 2026-11-08.)
- **D-15:** **No readouts in the viewer.** *"I don't think we need the 3 readouts. I think the space is better used for
  visualization."* (2026-11-07). The drawings take the room; foam off, the litres now and before contours, and what the
  stringer finishes at the center against the planed figure are the first line of DATA.
- **D-16:** **DATA is two tables under that line.** Every 6" from the tail (the honest centimetre conversion in Metric):
  width, deepest cut, rail lift, stringer left — the wide point's and the front fins' rows in full ink; then *Layout
  marks · off the stringer*, every 6", one column per mark — the sections' edges, flats and troughs, then every channel
  wall — so the sheet alone lays the bottom out station by station, the way channel walls are ruled onto a blank.

### GUIDE
- **D-17:** **GUIDE is the third tab after VIEWER and DATA: nineteen cards, each a cartoon and three short texts.** *"a
  third tab that is informational and teaches the user VERY briefly (like 1-2 sentences) and with a cartoon, what each
  contour type does, is, and looks like. With so many Vee options, I think we need a clear idea how they differ."*
  (2026-11-07). The eighteen names grouped Nose / Center / Tail, then the channels; each card its name, a cartoon drawn
  by the VIEWER's own code on the board the shaper has open (from above with that one cut's shade and the pencil lines a
  shaper would rule and the dash-dot cutting line where the section is taken; the section across it at its deepest
  point, Height ×8, the planed bottom a dashed straightedge beneath — the same `cutOff` and dashes as the viewer, lines
  keeping their width at any card size), two sentences — what it is and looks like (ink), what it does (muted) — and,
  under a dashed rule, a **How to shape** note in the shop's words (*"Would also be nice to add a 'how to shape' note
  too"*, 2026-11-08). The five vees draw five different sections. The cuts on the board now are tagged *On this board*;
  switching boards redraws every cartoon. Three cards across on a computer scrolling inside the folder, one across on a
  phone scrolling inside the pinned drawing area, the page never scrolling as a whole. Cards are not tappable.
- **D-18:** **The words are first drafts for the founder's pen, gathered in `17-GUIDE-WORDS.md`.** All 57 lines (19 ×
  three) are copied from sketch 021 into that page so he can mark them up; the plans build with the drafts as they stand
  and carry his corrections in as one task; a card he leaves alone ships as written; the UAT on the live page is the last
  chance. (Left as proposed, 2026-11-08.)

### Wings
- **D-19:** **The wing rule is a selector, Narrowest outline by default, one setting for the whole bottom.** On a board
  with a wing a WINGS row above the three sections — *Measure Off Rail from* — offers **Narrowest outline** (the real
  rail behind the wing's inner corner, and ahead of it the curve less the wing's full depth carried forward, so the
  reference never steps and no cut ever crosses the rail) or *Natural outline, before the wing* (the curve the shaper
  drew before the wing, which sits outside the real rail behind the wing by the wing's take fading to the tail pod, so a
  concave or the outer channel can run out through the step), with one line under it saying what each means. Nothing
  on a wingless board. (His two candidates of 2026-11-06, both drawn on a winged Fish in sketch 020, the selector his
  ruling of 2026-11-07.)

### Everything reads the one number
- **D-20:** **VOLUME counts the cut.** The litres read the foam actually left: a board with every section flat and no
  channels counts today's litres bit for bit (a pin on the Phase 16 board set first, as 16-01 did), and no preset card's
  litres moves because the presets stay flat. The sketch's integration gives the first relation checks: the planning
  memory's test single (3/16", 2" off the rail, 16" off the nose to 6" off the tail) takes 0.54 L off the Shortboard;
  six channels take 0.26 L more than the same cuts without them.
- **D-21:** **The 3D board shows the cut and the CNC files carry it; 3D has no contour controls.** The bottom of every
  section ring (`boardSections` / the surface's lofted rings) drops by the foam off at that station and distance from
  the stringer, so the mesh, the STL's enclosed volume, the DXF slices and the XYZ files all carry the contour and the
  mesh-volume-versus-litres relation test still holds. He leaned this way on 2026-11-06 and it was agreed: the 3D screen
  only shows it.
- **D-22:** **RAILS works from what the bottom leaves.** The rail's thickness at a station is the planed thickness less
  the rail lift there (a vee or belly lifts the rails; a concave leaves them), which is why BOTTOM comes before RAILS.
  Research settles how that thickness reaches the rail-band maths (the three thickness stations RAILS imports from the
  foil) without changing a flat board's rails.
- **D-23:** **FINS shows the contour under the fins** on its tail drawing (his third fin note, 2026-11-08) — the shade
  and lines of the tail cut and the channels under the fin boxes, read-only.

### Saving
- **D-24:** **One new optional field on the board's snapshot; absent means flat; no database change.** A board saved
  before this phase reopens flat with nothing rewritten on open (as Phase 14 and Phase 16 added optional fields at
  version 5); a board saved with a bottom reopens with every number exact; board files (Save board as file… / Open a
  board file… / Import my designs) carry the field the same way. The field's name and whether the version stamp moves
  are the planner's call inside `parseSnapshot`'s existing tolerance rules. — **Reversibility:** costly — a saved
  shape; a later change needs a parser rule.

### Units, paper and phones
- **D-25:** **Rule 2:** Depth, Off Rail, Off Stringer, Trough At, Channel Width, the lifts and the per-station thicknesses
  (DATA's `stringer left`, `planed` and `stringer finishes` figures, the gauge readings) are MARKS (whole millimetres in
  Metric; 1/16" steps in Imperial); Start, Deepest At, End, Stagger, the stations and the widths are DIMS (centimetres to
  one decimal; a 36" station reads the same digits as the station's own label); the INPUTS card's Length, Width and
  Thickness are the board's headline dims, read exactly as VOLUME's imported card reads them (CLAUDE.md Rule 2: a
  board's headline thickness is a dim, `5.7 cm`, and the same number is a mark, `57`, in a datasheet column — both correct
  for what they show); litres the same in both; every conversion through `lib/geometry/units.ts`. (*Sharpened 2026-11-08
  at the screen contract, whose first draft had read "the thicknesses" as every thickness.*)
- **D-26:** **On paper, numbers, not contours.** *"an image and some measurements is good enough."* (2026-11-06). No
  contour on the Full Sized Template or the Paper Saver, no card gauge; the order form and the Overview Sheet carry the
  bottom's names and numbers (the three cuts and the channels with their depths and marks) in lines the UI-SPEC settles;
  the presets stay flat.
- **D-27:** **Phones follow the three switches.** Below 820 dots the stacked layout: the drawing pinned above (the top
  view and the section sharing it), the NOSE · CENTER · TAIL switch, one section's controls beneath (the TAIL panel
  scrolls when it carries channels); the GUIDE one card across; no ruler; the sideways phone and the short-screen rules
  as every other screen. Width picks the layout, pointer the control size, height the short-screen rules.

### Shipping
- **D-28:** **One go-live at the end.** As Phase 16's 16-13: the full suite, his device checks, one push on his go, a
  live check. A second go-live only if he asks for one at plan approval (the maths-first waves change nothing visible
  while the presets stay flat). Pictures before every merge and his look between plans; this phase's branch, never his
  checkout or his dev server on port 3005; nothing pushed without his go. (The brief's reading A7, taken 2026-11-08.)

### Rulings at the screen contract (the founder, 2026-11-08, on the contract's discretion calls)
- **D-29:** **The bottom gets a printed page of its own, for now.** Asked whether the order form should carry the bottom as
  a small box on page 2 or a paragraph inside PLANING, the founder: *"I think I'd like a more substantial way of portraying
  how to shape contours. I'd like to keep it all on a double sided sheet but for now a new page would be acceptable and
  I'll likely reorganize the sheet later."* So the order form gains a **third page, BOTTOM CONTOURS**, printed only when
  the bottom has a cut (a flat board's two pages are byte-identical to today's): the bottom seen from above with its shade,
  lines and layout marks, a cross-section at each cut's deepest station with its gauge readings, DATA's two tables and the
  *How to shape* note of every cut on the board — the drawing, the sections and the measurements a shaper lays the bottom
  out from. The page's exact dress is the screen contract's (§8) and his to correct at plan approval; folding it back into
  a double-sided sheet is a later reorganisation of his, outside this phase. The Overview Sheet keeps its one line per cut.
  (Supersedes D-26's "lines the UI-SPEC settles" for the order form; D-26's rule that nothing reaches the Full Sized
  Template or the Paper Saver stands.) — **Reversibility:** reversible — a print layout.
- **D-30:** **The ruler of layout marks draws from a 1024-dot window, values only.** Told the ruler and the gauge words
  needed a 625-dot section box and so appeared only from about 1100 dots wide, he chose *"Ruler from 1024 too, values
  only"*: from a section box of about 548 dots (a 1024 window) the ruler draws its ticks and values with no caption and the
  gauge readings read as values alone; from 625 dots the `OFF THE STRINGER` caption and the gauge words join; below 548 (a
  narrow desktop window, every phone) there is no ruler, as D-14 says. (Sharpens D-14.)
- **D-31:** **The fins on BOTTOM's top view are FINS' own base lines** — the fin colour, solid, at the FINS placement, no
  dots or dimensions — which is what his "fin boxes" (D-12) meant; the app has no fin-box drawing and gains none.
- **D-32:** **"Closes to a point toward the center" shows on all three nose single concaves**, ticked by the Teardrop's
  starting numbers alone, as the sketch has it (confirms D-06's and R4's sharpened reading).

### Rulings from the planning research (2026-11-08) — the research's recommendations, taken as Claude's reading for the founder's overrule at plan approval
The research (`17-RESEARCH.md`) ran the sketch's own maths unchanged on the app's boards and ported it line for line; nine
things it found needed a ruling, none against a founder's word. Each is taken as recommended and flagged for his look.
- **D-33:** **The 1/4" floor holds on every column, rails included.** The stringer floor never bites on any preset, but a
  full-depth vee, belly or channel at a thinned tip would lift the bottom past the deck at the rails (342 columns on a
  Rolled Belly Entry at the Shortboard's nose). The one number is clamped so no column is ever cut where the foam is already
  thinner than 1/4"; the warning sentence gains a rail form (*"This cut meets the 1/4" floor at the rails near the nose: it is
  cut shallower there than set."* — words his to correct). Extends D-09.
- **D-34:** **DATA's `Foam off` is the finished board's foam** — VOLUME's litres before less now, so two screens never
  disagree. On a long rolled rail that is less than the sketch's slab figure (the Longboard's opening cuts: 2.81 L finished,
  3.33 L in the sketch, which counted foam out to the outline that the rail banding takes anyway); the other four boards
  agree within 0.3%. The two Longboard figures go to the founder side by side at plan approval.
- **D-35:** **RAILS reads the lifted rail at its three anchors, in a RAILS-only step.** The rail's thickness at each anchor
  station is the planed thickness less the rail lift there (D-22 as written), applied only to RAILS' own figures — never to
  `summarizeDesign`'s headline thickness (the rack card) or VOLUME's estimator rows. On short rails this matches the 3D
  board's column-mapped rail within 0.2 mm; on the Longboard's belly it differs by up to 24.5 mm, so both pictures go to the
  founder at plan approval. The readout caption may read `From ROCKER, FOIL & BOTTOM` only when a lift is present
  (UI-SPEC open item 3).
- **D-36:** **A fin move that carries a tail cut's Deepest past its Start or End:** on read the fin-anchored Deepest wins and
  the other is pushed to it (Start = max(Start, Deepest); End = min(End, Deepest)); nothing is written back until the shaper
  next moves a slider; the slider shows the pushed value.
- **D-37:** **FINS with Import Template off:** the fin-anchored stations still follow FINS' placement as shown; FINS draws no
  contour while unticked, because its drawing is not this board's tail.
- **D-38:** **The diamond tail's V is cut** — vees and bellies run out the V, the rail there being the V's edge (`railAt =
  max(sampleOutline, foamHalfWidth)`), as Phase 16's D-05 treats the V as foam; the sketch never cut it.
- **D-39:** **Nose cuts' stations are stored from the nose**, Center and Tail cuts' from the tail — D-07's "taped from the
  nearest tip" carried into storage, so a length change on TEMPLATE keeps every cut at its tip. Flagged for his yes because
  D-24's saved shape is costly to change later.
- **Figures corrected by the research (D-06, D-20):** the sketch's fins were read with Import Template off; the app's front
  fins sit at 11" on the Shortboard (sketch 10 7/8") and 12" on the Mid-length, so the golden fixture uses the app's own fin
  station and the Mid-length's opening cuts take 1.23 L; the test single's litres are 0.5443 L at every Smoothness; "six
  channels take +0.26 L" does not reproduce (sketch 020's numbers give 0.237 L, sketch 021's 0.378 L) — every such figure is
  a RELATION against the generated fixture, never a literal; the Fish's toe prints `2.0°` from the raw angle (the sketch's
  1.9° was a double rounding).
- **Also found:** the order form already has an optional third sheet (Rail Band Instructions), so the BOTTOM CONTOURS page's
  numbering counts it and both flat cases stay byte-identical; there are six desktop reference pictures, not five, all
  moving in the nav row only; five more browser specs count the screens (UI-SPEC §16 is amended by the research's list);
  today's live litres match none of the Phase 16 pins, so this phase pins its own `phase17-litres-pin.json` before
  `volume.ts` changes.

### Rulings at the executions' looks (the founder, 2026-11-08)
- **D-40:** **A vee or belly never takes thickness off the stringer; its lift runs out through the rail and thins it — no lip,
  ever.** At plan 17-03's look the founder saw the 1/4"-everywhere floor (D-33) leave a small downward lip at a thin tip's rail
  edge and ruled: *"Belly and Vee should never take thickness off the stringer. The result is a lifted, thinned rail … no
  lips should ever be present. The contour should extend to the rail and make it effectively thinner."* and *"It should not
  remove overall thickness of the tail station in question."* So: the station's thickness at the stringer is untouched by a
  vee or belly (the stringer is their zero); the lift runs all the way out to the rail, whatever the foam there, and the rail
  is simply thinner for it; where the lifted bottom would meet the planed deck the foam ends there (the rail's edge moves in —
  never a bottom above the deck, never a step back to the planed bottom); the 1/4" floor of D-09 stays at the stringer, where
  only a concave can reach it, and a concave still never leaves the stringer under 1/4"; a rail left thinner than 1/4" by a
  lift is flagged in warning ink (the rail form of D-33's sentence), not clamped. D-33's "no cut where the foam is already
  thinner than 1/4"" is withdrawn for vees and bellies. — **Reversibility:** reversible — one rule in `bottom.ts`'s seam.
- **D-41:** **RAILS shows the lifted, thinned rail.** *"… which should be carried through to the RAILS page. This should
  represent the angle in the bottom of the displayed rail in the viewer to represent the real rail shape, post bottom
  contouring."* — and, a minute later, *"i.e. contour before rail shaping"*: the bottom is cut before the rails are shaped, so the rail RAILS bands is the lifted, thinned one. So D-22/D-35 are more than a thickness figure: the RAILS page's rail cross-section plots draw the bottom
  under the rail at the vee's or belly's angle (the real rail shape after the bottom is cut), and the rail's thickness at
  each station is the thinned figure; a concave, which leaves the rails, changes nothing on RAILS. Carried by plan 17-04.

- **D-42:** **A center single concave fades out before a tail vee peaks.** At 17-03's second look the founder saw a test
  board whose Shallow Single Concave and Rolled Vee both peaked at the front fins and read the whole bottom as thinned;
  told the stringer's 1/8" was the concave's own hollow (D-05), he confirmed it — *"Ah, got it. This shouldn't really exist
  much in real life. So yes, a concave hollows the stringer and this makes sense."* — and chose to have the single run out
  first: when the tail cut is a vee (Panel Vee, Rolled Vee or Spiral Vee), a center single concave opens deepest halfway
  from the wide point to the front fins and ends AT the front fins, so it has run out where the vee is deepest (the Deep
  Single already peaks there and only its End moves from 4" to the fins; the Shallow Single's Deepest moves ahead from the
  fins to that halfway station). Picking a tail vee while the center holds a single still at its starting numbers moves
  that single the same way in one undoable step; a single set by hand is never touched. Carried by plan 17-05 with the rest
  of the names and their starting numbers (sharpens D-08). *Sharpened at 17-05's look (2026-11-08): the re-seat works both ways — switching the tail from a vee back to a flat or a concave puts a single still sitting on the vee's numbers back on its original numbers ("Yes, both ways"); and the researched opening vees stand even though two of them (the Fish's Panel Vee, the Mid-length's Spiral Vee, 3/16" each) leave the tail rail's edge under 1/4" in the last few inches and so show D-40's thin-rail warning on a fresh pick — "Warn, keep the numbers": the warning is honest information, the numbers are his to tune at the UAT.* — **Reversibility:** reversible — starting numbers.

### Rulings at the go-live gate (the founder, 2026-11-10)
- **D-43:** **Channels laid With the rail never bunch at the tail: they narrow to an inch, then run straight, and the outer ones run out through the rail.**
  The code review (WR-02) found the code following the last sketch's rule — the room inside the rail shared equally
  among the channels at every station, so on a narrow tail all of them closed to slivers together — against D-10's
  words. Shown both, the founder ruled: *"the channels with the rail shoud never bunch at the tip. the early wording
  was correct. They either are straight, or splay in (toe in with the fins) or out (following the rail line) but never
  meet at a single point."* As built (`channelRailWidth` in `lib/geometry/bottom.ts`, commit f4e156d0): a With-the-rail
  channel follows the rail while that leaves it 1/2" more than an inch; it is never narrower than an inch (or than the
  set's own Width, when that is under an inch); the change from following the rail to running straight is eased over
  1/2" of width so no wall kinks; from there the walls run straight to the tail and the outer channels run out through
  the rail, exactly as a Parallel set's do. Parallel and Toe-in are untouched, number for number. What follows from it:
  a With-the-rail set takes a little more foam than it did (Shortboard six channels 0.33 → 0.37 L; Parallel's 0.38 L is
  unchanged); a set an inch wide or under laid With the rail is the Parallel set from the deepest station back; and the
  thin-rail note and the foam's knife edge (D-40), which With the rail could never reach before, now show where a
  channel runs out through a thin tail rail — at the Shortboard's tail with 4, 6 or 8 channels and at the Midlength's
  1 3/4" station with 6 or 8 (Parallel reaches them at more stations). The sketch's golden figures are kept as they
  were made: Parallel and Toe-in are still held to them exactly, With the rail is held to them as a relation (the
  sketch's width put through the new rule), because the sketch is the picture he was shown and the rule is his ruling
  on it. An inch and the 1/2" ease are Claude's numbers, shown to him on the real page for his look (sharpens D-10).
  *Changed by D-44 the same day: the walls' shape — straight lines that fan at an Angle, no longer the rail's own curve. The inch, the ease, "never meet at a single point" and running out through the rail all stand.*
- **D-44:** **Both angled channel runs get an Angle the shaper can set — the rail's own, or the fins' toe-in, until he sets one — and With-the-rail walls are straight lines that fan.**
  At his look at the real page (2026-11-10) the founder sent a photo of three channelled boards and ruled: *"Along the
  rail is subtle, like the middle board in this image."* and *"The toe in and splayed out (along rail) needs an angle
  adjustment. Set default by the rail and the fins toe in, but overiderable."* In the photo the walls are straight
  lines that fan gently, not curves that copy the outline. D-43 stands in spirit: the channels never meet at a point.
  As built (`channelDefaultAngle`, `channelEdges`, `switchChannelRun`, `snapChannelAngle` in `lib/geometry/bottom.ts`):
  - **One new stored number**, the channels' `angle`, in degrees — or none, which means "this run's own". A board saved
    before the slider opens with none and loses nothing else; a board whose bottom is the opening one still saves no
    bottom; no version change, no database change.
  - **An Angle row** directly under Run and Longest, drawn only for With the rail and Toe-in: a slider from 0° to 15°
    in half degrees, reading `9.1° · the rail's own` or `3.2° · the fins' toe-in` (a single fin:
    `0.0° · these fins have no toe-in`) until it is moved, then `7.5° · set by hand · the rail's own is 9.1°` /
    `5.0° · set by hand · the fins' toe-in is 3.2°`, with a small Reset that is there only while the angle is by hand.
    One slow drag is one Undo; Reset is one Undo. The Run menu's three options are now plain — `Parallel`,
    `With the rail`, `Toe-in` — the angle having moved to its own row (this replaces 17-UI-SPEC.md's `Toe-in · 3.2°`
    and `Toe-in (no toe)` option words, which that page still shows as first built).
  - **With the rail**: every wall is a straight line. The last wall passes through its place at Deepest At at the
    Angle, closing toward the stringer going to the tail and opening toward the nose; the wall beside the stringer
    stays at Off Stringer; the walls between share the turn evenly, so every channel is the same width at any one
    station. At 0° the set is a Parallel set, number for number.
  - **Toe-in**: unchanged in shape — every channel keeps its Width and the whole set is turned — but turned at the
    Angle in use rather than always at the fins' toe. On a single fin it is Parallel until an angle is set by hand.
  - **Print**: the Overview Sheet's channels line carries the angle in use for both angled runs
    (`With the rail · 9.1°`, `Toe-in · 3.2°`; a single fin `Toe-in · 0.0°`), in degrees in both systems.
  The numbers and rules below are OURS, shown to him on the real page for his look, and his to change:
  - *The fan* — that the walls between the stringer's and the last share the turn evenly (the other choice: every wall
    at the same angle, which is Toe-in's shape mirrored).
  - *"The rail's own"* — the straight line of the rail from the channels' Deepest At to their Start (the longest
    pair's), measured off the stringer, on the rail the wing rule reads. Laid at it the last wall is exactly as far
    off the rail at Start as at Deepest At. With six channels on their starting numbers it is 9.1° on the Shortboard,
    9.5° on the Fish, 10.4° on the Mid-length and 11.2° on the Longboard; it moves when Start or Deepest At moves.
  - *0° to 15° in 0.5° steps.* The first touch of the slider takes an own angle such as 9.07° onto the half-degree
    marks.
  - *A different Run puts the angle back to that run's own*; a different channel count keeps an angle set by hand.
  - *The plain Run names*, the word `Reset`, the slider's end marks `0.0°` and `15.0°`, and the by-hand line on a
    single fin (`5.0° · set by hand · these fins have no toe-in`).
  - *A saved angle the slider could never give* (past 15°, below 0°, not a number) *reads as none* — the run's own —
    rather than being pulled to the nearest end; nothing else about the channels is touched.
  - *D-43's inch and 1/2" ease are kept*, and they are the one place a With-the-rail wall is not a straight line:
    behind Deepest At, where the fan would take a channel under an inch, the walls bend over that 1/2" into running
    parallel, an inch apart. Ahead of Deepest At every wall is exactly straight. Eight channels on their starting
    1 1/4" reach the inch almost at once behind Deepest At.
  What follows from it, six channels on their starting numbers at the rail's own angle: each channel is 2.39" wide at
  Start, 1 3/4" at the front fins and 1.22" at the tail on the Shortboard (Fish 2.42" / 1 3/4" / 1.34"; Mid-length
  2.48" / 1 3/4" / 1.14"; Longboard 2.55" / 1 3/4" / 1.39"); the last wall runs out through the rail before the tail
  on the Shortboard and the Mid-length and stays inside it on the Fish and the Longboard; the set takes 0.38 L on the
  Shortboard, the same as Parallel to two places (D-43's rule took 0.37 L). The sketch's golden figures are kept as
  they were made and never edited: Parallel and Toe-in on its own angle are still held to them exactly; With the
  rail is no longer compared with the sketch's walls at all (its starting numbers, fit and starts still are), and is
  proved from the rule itself instead. BOTTOM's GUIDE is not reworded (sharpens D-10, changes D-43's wall shape).
  *Approved by the founder at his look at the real page (2026-11-10): "Angle and warning approved." — the Angle as
  built, with every choice listed above as OURS left as it stands.*
- **D-45:** **A channel cut deeper than the foam keeps today's warning and today's numbers for go-live; a clearer sentence comes afterwards.**
  The code review's WR-01: a concave is held to the 1/4" stringer floor, but a channel's depth has no floor, so where a
  channel is deeper than the foam above it — a thin tail rail — the foam ends at that channel's wall (D-40's knife edge
  applied to a channel), and the screen warns the shaper. Claude put it to the founder with a recommendation — keep the
  warning and the numbers for go-live, write a clearer sentence afterwards — and he ruled (2026-11-10): *"Angle and
  warning approved."* So no code changes for WR-01 in this phase: no floor is added under a channel, the litres, the 3D
  board and the STL keep the rule they have, and the warning's wording (the review's IN-02 — it speaks only of the rail)
  is a follow-up after go-live, with the words shown to him before they ship.

### Claude's Discretion
- The saved field's name and the version stamp (D-24); the sidebar's and page's titles (the sketch reads "BOTTOM
  CONTOURS — Map, measure and cut the bottom"); the BOTTOM tile's picture; the viewer's opening station (the sketch opens
  at the wide point); the exact DATA and order-form wording; accessible names for every new slider and the cutting-line
  handle; the shade's ink and the contour lines' weight per theme (the sketch: the muted ink at 4% per 1/32"); how the
  square-rail slab reads the thickness at a station; the warning sentence's words (D-09); which Phase 16 board set the
  litres pin uses.

### Folded Todos
- **Build in bottom contours with shading and selectable shapes** (`todos/pending/2026-08-23-…`) — the original ask
  (2026-08-23): selectable shapes, shading, the maths in `lib/`, and the open question of where the contour lives. This
  phase is that todo; it moves to `todos/completed/` with the phase's close.
- **Set the BOTTOM page's starting numbers for each contour name from the shop** (`todos/pending/2026-11-06-…`) — the
  research and the proposed numbers are already applied to the sketch (D-08, D-11); the todo closes when the founder has
  corrected or accepted them on the live page at the UAT.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The phase, in the founder's words
- `.planning/phases/17-bottom-contours/17-SPEC.md` — Locked requirements R1–R15, carried constraints, acceptance
  criteria and the Ambiguity Report (all seven points now settled above) — MUST read before planning
- `.planning/phases/17-bottom-contours/17-GUIDE-WORDS.md` — the GUIDE's 57 lines as the plans build them (D-18)
- `.planning/sketches/021-bottom-guide/README.md` — the page as it will be built, five rounds of rulings verbatim;
  `index.html` beside it is the reference drawing (open it); `sketch-source.tar.gz` holds the template whose `NAMES`,
  `makeChannels`, `GUIDE` and `HOW` tables, `foamOff` / `cutOff` / `channelEdges` / `channelMarks` / `channelFit` maths
  and `cartoon` drawing are the working the phase ports into `lib/geometry/` — and `board-data.ts`, which shows which
  app functions the sketch read its boards from
- `.planning/sketches/020-bottom-channels/README.md` — Off Stringer, the channel model, the ruler and the layout-marks
  table, the wing rule on the winged Fish
- `.planning/sketches/019-bottom-contours/README.md` — the page's two views, the control set, the shade's three
  variants and the rulings on them
- `.planning/sketches/MANIFEST.md` §"Bottom contours", §"Bottom channels and layout marks", §"The GUIDE tab" — the
  summaries; sketch 004's inside-the-outline rule this page bends
- `.planning/todos/pending/2026-11-06-set-the-bottom-contours-starting-numbers-from-the-shop.md` — the research table
  behind every starting number (D-08, D-11)
- `.planning/todos/pending/2026-08-23-build-in-bottom-contours-with-shading-and-selectable-shapes.md` — the original ask
  and its knock-on list (volume, rails at the apex, print)

### The project's rules
- `CLAUDE.md` — Rule 1 (geometry pure and tested, fixtures never typed), Rule 2 (marks and dims; the shaper picks the
  system, metric in the data), the Layout section's three switches, the Database rule (no migration here)
- `.claude/skills/sketch-findings-shaper/SKILL.md` and `references/drawing-and-callouts.md` — the viewers' drafting
  grammar (the dash-dot cutting line, extension lines and end ticks, the break line); `references/phone-chrome.md` — the
  tiles and Back + Next; `references/wings.md` — the wing's footprint and fade the Narrowest rule reads
  (sketches 019–021 are not yet wrapped into this skill — their READMEs are the findings)

### Earlier phases this one leans on
- `.planning/phases/16-3d-board-and-cnc-export/16-CONTEXT.md` — D-05 (one section function feeds the litres, the 3D
  board and the STL; a swallow is two pieces), D-20/D-27/D-30–D-32 (the tail rail's fade), D-33/D-34 (the deck smooth
  across a wing; no tip flip), D-16 (the files hold the bare board); `16-SPEC.md` R2 (the mesh-volume relation test)
- `.planning/milestones/` archives of Phase 14 (`14-CONTEXT.md`: the planed thickness and the 1/4" floor, a start set
  too close drawn as set and flagged — D-09's precedent; Thinning Start as a dim) and Phase 12 (the bottom planed to
  centre thickness as planer passes) — find them under `.planning/milestones/*-phases/`

### The code the cut is read from and written into
- `lib/geometry/volume.ts` — `boardSections` / `computeCrossSectionVolume`: the stations and sections the litres count
  (D-20, D-21)
- `lib/geometry/board-surface.ts`, `lib/geometry/board-surface-render.ts`, `lib/export/` — the lofted rings, the STL,
  DXF and XYZ writers (D-21)
- `lib/geometry/outline.ts` (`buildOutline`, `sampleOutline`, `curveHalfWidthAt`, `foamHalfWidth`, `tailCutStation`),
  `lib/geometry/wings.ts` (`wingFootprint`, `placedWings`) — the rail the cuts are measured from and the Narrowest rule
  (D-19)
- `lib/geometry/fins.ts` (`computeFinPlacement`, the front marks and toe) — the front-fin station and angle (D-03,
  D-10's Toe-in)
- `lib/geometry/board-profile.ts`, `lib/geometry/design.ts` (`designSideProfile`, `designCrossSectionInput`,
  `deriveEffectiveRails`) — the planed thickness and bottom at every station (D-05)
- `lib/geometry/rail-bands.ts`, `lib/geometry/finished-rail.ts` — the rail maths that must read the lifted rail (D-22)
  and the finished rail the ghost draws (D-13)
- `lib/geometry/units.ts` — every mark and dim (D-25)
- `lib/models/design-snapshot.ts` (`DESIGN_SNAPSHOT_VERSION = 5`, `parseSnapshot`), `lib/models/board-file.ts` — the
  saved field (D-24)
- `components/design/design-store.tsx`, `design-screen-shell.tsx`, `step-nav.tsx`, `screen-tiles.tsx`,
  `phone-menu.tsx`, `slider-row.tsx`, `use-viewer-media.ts`; `components/site-nav.tsx` (`NAV_LINKS`) — the eighth
  screen's plumbing (D-01, D-02, D-27)
- `components/rails/rail-band-editor.tsx`, `rail-controls.tsx`, `rail-data-table.tsx`, `rail-section-plot.tsx` — the
  sidebar's three-section dress and the DATA table pattern BOTTOM copies (D-04, D-16)
- `components/viewer/tabbed-panel.tsx`, `callout-primitives.tsx`, `toolbar-button.tsx` — VIEWER · DATA · GUIDE and the
  drawing's callouts (D-12, D-17)
- `components/rocker/` — the nose-left top view with the blank (the closest drawing to BOTTOM's top view)
- `components/fins/fin-viewer.tsx` — the tail drawing that gains the contour (D-23)
- `components/summary/` and `app/design/summary/order-form.css` — the order form and Overview Sheet lines (D-26)
- `e2e/phone-screen-tiles.spec.ts`, `e2e/desktop-baseline.spec.ts` and every spec that counts seven screens (D-01)

### Deferred work this phase must not swallow
- `.planning/todos/pending/2026-11-08-a-guide-tab-on-every-page.md` — a GUIDE on TEMPLATE, ROCKER, RAILS, VOLUME and
  FINS (sketch 022 is being drawn in a sibling session)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/rails/rail-band-editor.tsx` + `rail-controls.tsx`: the three-section sidebar (Nose / Center / Tail cards
  with a per-section picker and sliders, the upright phone's section switch, `growOnShortScreen`) — BOTTOM's panel is
  "very similar to RAILS" by the founder's word, so the same card, picker and slider pieces carry over.
- `components/viewer/tabbed-panel.tsx`: VIEWER · DATA tabs today; GUIDE is a third tab in the same strip (22 dots drawn,
  44-dot touch box on a coarse pointer).
- `components/design/slider-row.tsx` and `measure-field.tsx`: marks and dims with Rule 2 formatting; the Thinning Start
  slider on ROCKER is the model for a station slider taped from a tip.
- `lib/geometry/volume.ts`'s `boardSections`: the one place the stations and their sections are built — the foam-off
  function plugs in there once and every reader (litres, 3D, STL) sees it.
- `lib/geometry/outline.ts`'s `foamHalfWidth` / `sampleOutline` / `curveHalfWidthAt` and `wings.ts`'s `wingFootprint`:
  the real rail, the wingless curve and the wing's fade the Narrowest and Natural rules are built from (sketch 020's
  `board-data.ts` already reads them).
- `lib/geometry/fins.ts`'s `computeFinPlacement`: the front marks' station and `atan2(toe, baseLength)` angle (3.2° on
  the Shortboard, 2° on the Fish, 0 on a single).
- The drawing grammar in `components/viewer/callout-primitives.tsx` and the sketch-findings skill: dash-dot centrelines,
  extension lines with end ticks, the break line.
- The Phase 16 board set and `phase16-litres-pin` test: the pattern for pinning today's litres before `volume.ts` is
  touched.

### Established Patterns
- Rule 1: every formula in `lib/geometry/`, pure, with relation tests and script-made fixtures; the sketch's own
  `foamOff` integration figures (0.54 L, +0.26 L) are the first relations, never typed as expected numbers but
  recomputed by the app's function against the sketch's scratch export.
- Rule 2: marks in whole mm, dims in cm to one decimal, through `units.ts`; a 36" station prints the station's own label.
- Optional snapshot fields at version 5 with absent-means-default (Phase 14's two blank values, Phase 16's
  `tailHardEdgeEndsAt`): `parseSnapshot` tolerates absence and never rewrites on open.
- Layout: width 820 picks the layout, pointer the size, height the short-screen rules; nothing new reads any of them for
  another purpose. The sketch's phone stack came from a CSS width rule, never a JS `innerWidth` test.
- A new screen's plumbing is one list (`NAV_LINKS`) feeding the nav row, the ☰ tiles and Back + Next; `screenWord`
  turns a label into a route word; the specs count the screens.
- Every plan ends with the founder's look at pictures; nothing pushed without his go; one dev server per checkout.

### Integration Points
- `NAV_LINKS` gains `{ href: "/design/bottom", label: "BOTTOM" }` after ROCKER; `app/design/bottom/page.tsx` is the
  eighth route; the tiles and Back/Next follow the list.
- The design store gains the bottom's state beside `rails` and `fins`, with undo/redo and autosave as the others; the
  snapshot gains the optional field (D-24).
- `boardSections` reads the foam off at every station across each ring's bottom (D-20, D-21); RAILS' thickness inputs
  read the lifted rail (D-22); `fin-viewer.tsx` draws the tail cut and channels under the fin boxes (D-23); the order
  form and Overview Sheet gain their lines (D-26).

</code_context>

<specifics>
## Specific Ideas

- The founder's three fin notes (2026-11-08), answering his own question about the page's place: store the fin-driven
  stations as a distance from the front fins; draw the fin boxes on the BOTTOM top view, not just the station line; show
  the contour under the fins on the FINS tail drawing.
- His table of the classic channel setups (2026-11-06): Merrick's 4–6 deep channels strictly parallel; Biolos's splayed
  channels aligned to the fins' toe-in; Rusty's concave-nested, semi-parallel channels with flared edges (the stacking
  into a single covers the nesting) — the three runs of D-10.
- The sketch's opening cuts per preset, for the pictures and the tests (every board opens flat in the app — D-04):
  Shortboard: Flat Entry · Deep Single Concave · Flat Exit (0.75 L); Fish: Flat Entry · Flat Center · Panel Vee
  (0.31 L); Mid-length: Blended Nose Concave · Shallow Single Concave · Spiral Vee; Longboard: Teardrop Nose Concave ·
  Continuous Belly / Rolled Mid · Rolled Vee (3.33 L); the winged Fish: Extending Single Concave.
- **The starting numbers (D-08), as sketch 021 opens them** — stations as inches from the tail, nose cuts from the nose
  tip; L = length, wide = the wide point, fins = the front fins, Off = Off Rail, OffS = Off Stringer:

  | Name | Off / OffS / Trough | Start → Deepest → End | Depth | Smooth |
  |---|---|---|---|---|
  | Rolled Belly Entry | — | tip → 1/3 back → 45% back (55% from the tail) | 3/8" | 100 |
  | Teardrop Nose Concave | 2 1/4" | 3" → 20" → 38" back, closing to a point | 1/4" | 70 |
  | Blended Nose Concave | 1 5/8" | 2" → 12" → 36" back | 3/16" | 70 |
  | Slight Single Concave Entry | 2" | 12" back → wide → wide − 6" | 1/16" | 50 |
  | Reverse Vee Nose | — | 3" back → 1/3 back → fins + 4" | 3/16" lift | 0 |
  | Deep Single Concave | 2" | 16" from the nose → (wide + fins)/2 → 4" | 1/4" | 50 |
  | Shallow Single Concave | 2" | 2L/3 → fins → 4" | 1/8" | 50 |
  | Early Double Concave | 2" / 1" / 4" | wide → fins + 6" → fins + 2" | 1/8" | 60 |
  | Continuous Belly / Rolled Mid | — | 8" from the nose → wide → fins | 3/8" | 100 |
  | Tri-Plane Hull Center | OffS = half the wide width − 4" | 14" from the nose → L/2 → fins | 1/8" lift | 0 |
  | Double Concave Exit | 1" / 3/4" / 3" | fins + 12" → fins → 4" | 1/8" | 50 |
  | Panel Vee | — | L/3 → fins → 0 | 3/16" lift | 0 |
  | Spiral Vee | 1" / 3/4" / 3", Vee Lift 3/16" | fins + 12" → fins → 0 | 1/8" | 50 |
  | Rolled Vee | — | L/3 → fins → 0 | 1/4" lift | 60 |
  | Extending Single Concave | 2" | fins + 12" → fins → 4" | 3/16" | 50 |
  | Channels (4 / 6 / 8) | width 2 1/2" / 1 3/4" / 1 1/4", OffS 0 | fins + 12" → fins → 0; outer pair longest, stagger 2" | 5/16" | 0 |

- The sketch-source archives hold the maths as the founder saw it; porting it keeps his pictures true. Two lessons from
  the sketches worth carrying: a check of one cut's shape must probe that cut's own foam, not the total (the Shortboard's
  single runs under its channels); channels that follow the rail must run OUT through the rail once their gaps have
  closed, never be squeezed to nothing at the pod.

</specifics>

<deferred>
## Deferred Ideas

- **A GUIDE tab on every design page** — TEMPLATE, ROCKER, RAILS, VOLUME and FINS, in 021's dress (the founder,
  2026-11-08: *"I think every page needs a guide like this"*); todo `2026-11-08-a-guide-tab-on-every-page.md`, sketch 022
  under way in a sibling session; after BOTTOM ships.
- **Staggering a channel set's ends and deepest station** (one maker, DHD, fades the inner channel before the tail) —
  left as starts-only; revisit if he asks after cutting one.
- **A third drawing per vee in the GUIDE** (three stacked sections to show a spiral vee twisting) — asked in sketch 021,
  not ruled.
- **Tapping a GUIDE card to put that cut on the board** — the tab is informational, as asked.
- **Bonzer bottoms**; **a contour printed full size or a card gauge** (*"an image and some measurements is good enough"*);
  **presets with contours** (he may change them later); **reading a contour from Shape3D or AkuShaper files**.

### Reviewed Todos (not folded)
- "Run the Shape3D acceptance test on the export zip" — Phase 16's open item; unrelated to the bottom, though the CNC
  files this phase changes should be among what he opens when he gets to it.
- "A GUIDE tab on every design page" — deferred above.
- "Show live coordinates under the pointer on the Template and Rocker curves", "Open the blank's own catalog page from
  the app", "Fix the blank catalogue dims the founder knows are wrong", "Give every slider in the app a spoken name and
  a spoken value", "Hold the ghost still until the control is released", "Clear the TEMPLATE toolbar off the readings on
  a sideways phone", "Add finished board photo uploads with ratings", "Brand the order form for paid shapers", "Decide
  what happens when a thin board's tip sits below its center", "Tape-check a real Arctic blank against the new curve",
  "Estimator rows read actual thickness" — unrelated; matched on keywords.

</deferred>

---

*Phase: 17-bottom-contours*
*Context gathered: 2026-11-08*
