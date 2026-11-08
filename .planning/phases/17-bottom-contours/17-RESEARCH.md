# Phase 17: BOTTOM — Bottom Contours a Shaper Can Map, Measure and Cut - Research

**Researched:** 2026-11-08
**Domain:** pure surfboard geometry (a foam-off function and its readers), the app's section/surface/litres pipeline, a new design screen in the existing Next 16 / React 19 / Tailwind v4 / Base UI shell, the saved-board snapshot, the order form
**Confidence:** HIGH for the maths, the seam, the litres pin, the saving and the plumbing (all run or read this session); MEDIUM for how RAILS should read the lifted rail (two readings measured, the founder's call on one board type); MEDIUM for phone drawing speed (Node timings only)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Every decision below is the founder's unless marked otherwise. Most were ruled on sketches 019, 020 and 021 between
2026-11-06 and 2026-11-08 and are recorded in their READMEs in his words; the discussion of 2026-11-08 added D-03's
center-cut clause, D-09, D-14, D-18, D-08's and D-11's "as they stand", D-10's "starts only" and D-28 — all on the
brief's proposed readings, which he took ("Take all three"; the four open points left on the sketch's own answers).

#### Where the screen lives
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

#### The cuts and the one number
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

#### The channels
- **D-10:** **Channels live inside the TAIL card, none to start, Parallel the opening run, the shape his.** *"Stagger
  looks good now. B: Inside Tail, Channel Default = none. Wings rule should have a selector, narrowest outline by
  default. Run default is parallel to stringer."* (2026-11-07). Under the tail's own cut: Channels None / 4 / 6 / 8 —
  picking a count brings that count's starting width (2 1/2" · 1 3/4" · 1 1/4") unless the shaper has set one; Channel
  Width (one number at every station); Off Stringer (0 by default — the stringer is the first peak); Start, Deepest At,
  End; Depth; Smoothness (a straight ramp at 0 to a scooped one at 100); Run — Parallel to the stringer (laid out at the
  deepest station and ruled straight; the outer ones run out through the rail where the outline narrows), With the rail
  (the last wall keeps its distance off the rail, so the set narrows toward the tail together; once the gaps have
  closed the outer channels run OUT through the rail, never pinching every channel), or Toe-in (splayed at the front
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

#### The drawings
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

#### GUIDE
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

#### Wings
- **D-19:** **The wing rule is a selector, Narrowest outline by default, one setting for the whole bottom.** On a board
  with a wing a WINGS row above the three sections — *Measure Off Rail from* — offers **Narrowest outline** (the real
  rail behind the wing's inner corner, and ahead of it the curve less the wing's full depth carried forward, so the
  reference never steps and no cut ever crosses the rail) or *Natural outline, before the wing* (the curve the shaper
  drew before the wing, which sits outside the real rail behind the wing by the wing's take fading to the tail pod, so a
  concave or the outer channel can run out through the step), with one line under it saying what each means. Nothing
  on a wingless board. (His two candidates of 2026-11-06, both drawn on a winged Fish in sketch 020, the selector his
  ruling of 2026-11-07.)

#### Everything reads the one number
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

#### Saving
- **D-24:** **One new optional field on the board's snapshot; absent means flat; no database change.** A board saved
  before this phase reopens flat with nothing rewritten on open (as Phase 14 and Phase 16 added optional fields at
  version 5); a board saved with a bottom reopens with every number exact; board files (Save board as file… / Open a
  board file… / Import my designs) carry the field the same way. The field's name and whether the version stamp moves
  are the planner's call inside `parseSnapshot`'s existing tolerance rules. — **Reversibility:** costly — a saved
  shape; a later change needs a parser rule.

#### Units, paper and phones
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

#### Shipping
- **D-28:** **One go-live at the end.** As Phase 16's 16-13: the full suite, his device checks, one push on his go, a
  live check. A second go-live only if he asks for one at plan approval (the maths-first waves change nothing visible
  while the presets stay flat). Pictures before every merge and his look between plans; this phase's branch, never his
  checkout or his dev server on port 3005; nothing pushed without his go. (The brief's reading A7, taken 2026-11-08.)

#### Rulings at the screen contract (the founder, 2026-11-08, on the contract's discretion calls)
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

### Claude's Discretion
- The saved field's name and the version stamp (D-24); the sidebar's and page's titles (the sketch reads "BOTTOM
  CONTOURS — Map, measure and cut the bottom"); the BOTTOM tile's picture; the viewer's opening station (the sketch opens
  at the wide point); the exact DATA and order-form wording; accessible names for every new slider and the cutting-line
  handle; the shade's ink and the contour lines' weight per theme (the sketch: the muted ink at 4% per 1/32"); how the
  square-rail slab reads the thickness at a station; the warning sentence's words (D-09); which Phase 16 board set the
  litres pin uses.

### Deferred Ideas (OUT OF SCOPE)
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

#### Reviewed Todos (not folded)
- "Run the Shape3D acceptance test on the export zip" — Phase 16's open item; unrelated to the bottom, though the CNC
  files this phase changes should be among what he opens when he gets to it.
- "A GUIDE tab on every design page" — deferred above.
- "Show live coordinates under the pointer on the Template and Rocker curves", "Open the blank's own catalog page from
  the app", "Fix the blank catalogue dims the founder knows are wrong", "Give every slider in the app a spoken name and
  a spoken value", "Hold the ghost still until the control is released", "Clear the TEMPLATE toolbar off the readings on
  a sideways phone", "Add finished board photo uploads with ratings", "Brand the order form for paid shapers", "Decide
  what happens when a thin board's tip sits below its center", "Tape-check a real Arctic blank against the new curve",
  "Estimator rows read actual thickness" — unrelated; matched on keywords.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (17-SPEC.md) | Research Support |
|----|--------------------------|------------------|
| R1 | BOTTOM screen between ROCKER and RAILS; eight everywhere | §H: `NAV_LINKS` and the typed `TILE_KIND` make the build fail until BOTTOM has a tile; every seven-counting spec listed (UI-SPEC §16 plus five more); six desktop pictures move in the nav row only |
| R2 | Five cuts behind eighteen names | §A: the sketch's `NAMES` table ported line for line; 1,680 starting cuts on 105 boards all keep Start ≥ Deepest ≥ End and stay on the board |
| R3 | One foam-off number; cuts stack; thickness is planed | §A/§B: `foamOff` is a plain sum (order-independent, so "shaping order" is a listing order); ≥ 0 is automatic; the 1/4" floor never bites at the stringer on any preset — the rails at a thinned tip do, so the seam clamps per column |
| R4 | Controls per cut in RAILS' dress | §A (`keepStationsInOrder` = the sketch's `normalize`), §J (every slider's `measureSlider` call and its Metric range, measured) |
| R5 | Channels inside TAIL | §A: `channelFit`/`channelEdges`/`channelMarks`/`chStart` ported; the runs, the fit and the stagger clamp reproduced; §B: walls as slot pairs in the ring |
| R6 | Top view: shade + 1/16" lines | §I: the sketch's band code measured (1,360–2,536 rects, 93–173 KB a redraw); one path per 1/32" level instead; 4.6–11.1 ms a grid in Node |
| R7 | The cross-section | §C: the ghost is the litres' own bottomed ring; §I: gauges read `foamOff` |
| R8 | DATA | §A/§G: DATA rows every 6" cost 0.6–1.1 ms; the first line's `Foam off` = before − now (VOLUME's figures), which is NOT the sketch's plan integral on the Longboard (Open Question 1) |
| R9 | GUIDE | §L: the cartoon reads `cutFoamOff` on the open board; words verbatim from `17-GUIDE-WORDS.md` |
| R10 | WINGS selector | §E: Narrowest and Natural reproduced exactly on the winged Fish; a proposed `narrowestOutlineAt` in `wings.ts` |
| R11 | Everything reads the one number | §B: ONE seam in `boardSectionsWith` (a column map on each finished half); flat 102/102 bit-identical; mesh closed and within −0.025% … −0.086% of the litres on 20 cut boards; §C RAILS; §D FINS |
| R12 | One optional saved field, no DB change | §F: `bottom` optional at version 5, the wings' "absent key" pattern; board files go through `parseSnapshot` already |
| R13 | Rule 2 | §J: every formatter named and run; 36" prints `91.4 cm`, the station label's own digits |
| R14 | Paper: a BOTTOM CONTOURS page; Overview lines | §K: the page joins an order form that can already have three sheets (Rail Band Instructions) — the sheet count and page numbers must count it |
| R15 | Shown before it ships; one go-live | §L, Validation Architecture; D-28 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Rule 1:** every formula in `lib/geometry/`, pure (no React, browser API or database import), every exported function unit-tested, expected values from the app's own functions or script-generated fixtures — never a hand-typed number. Fixtures come from scripts that EXECUTE the reference code (the sketch-016 precedent).
- **Rule 2:** every conversion of a design value through `lib/geometry/units.ts` / `measure-display.ts`; storage metric (`Mm`); marks in whole mm, dims in cm to one decimal; no `25.4` (or `10`) anywhere else — the sketch's own `IN = 25.4` must NOT be ported literally into `lib/` (it lives only in the never-imported reference copy).
- **Layout:** width (820, `max-shell`/`shell`) picks the layout; pointer (`coarse`) the control size; height (inline `[@media(max-height:500px)]`) the short-screen rules; no fourth switch, no JS width test for layout. (`useSvgClientSize` asks a drawing's OWN box — the readout-card precedent.)
- **Database:** no change in this phase (the bottom lives in the snapshot JSON column); `lib/db/schema.ts` and `drizzle/` untouched.
- **Commands:** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run test:e2e` (own dev server on 3100, `PW_PORT=` overrides), `npm run test:e2e:prod`; `npm run build` from the main checkout only.
- **AGENTS.md:** this Next.js differs from training data; read `node_modules/next/dist/docs/` before writing Next code (the new route is an App Router page beside the seven others — copy `app/design/rails/page.tsx`'s shape).
- **Plain English** for every word a shaper reads, every commit message and every summary.
- **GSD workflow** for every edit; nothing pushed/deployed without the founder's go; never his checkout or port 3005.
- **Stack prescribed** (`.claude/CLAUDE.md`): no new package (C5).

## Summary

The phase is buildable as designed, and the hard part — making one foam-off number reach the litres, the 3D board and the CNC files without disturbing a flat board — has been run end to end in scratch this session. The sketch's maths (template.html lines 326–553, SHA-1 `53cbf011…`) is pure and was executed unchanged in Node: on today's app boards it reproduces every figure the brief names — **0.7466 L** off the Shortboard (deep single), **0.3137 L** off the Fish (panel vee), **3.3288 L** off the Longboard (teardrop, belly, rolled vee), **0.5443 L** for the planning memory's test single. A line-for-line TypeScript port reading the app's own functions at full precision agrees with the sketch's own code to **1.2e-13 mm** once the sketch is fed finely sampled arrays (4,801 stations) — so the golden fixture can be generated by executing the sketch exactly as the 016 precedent does, and the app's `bottom.ts` must match it to round-off.

**The seam is one place:** inside `boardSectionsWith` (volume.ts), each finished half-section — the very ring the 3D board draws (`drawn ?? blended ?? sampledFinishedRail`, board-surface.ts:241) — has its bottom lifted by the foam off at (station, distance from the stringer) with the deck held exactly where it was planed, and the section's area is corrected by the ring difference (the level-variant pattern D-31/D-34/D-37 already use). Every reader follows for free: the litres, the 3D surface, the STL, the DXF slices and the XYZ. With a flat bottom it is the identity: **102 of 102** Phase 16 boards reproduce today's live litres to all 17 digits even with the map run (no shortcut), and with cuts the surface stays **watertight on all 20 boards tried** (0 open, non-manifold, mis-wound or zero-area triangles; four presets + winged Fish × flat/opening/+8 channels/every section and channel at 1/2") with the mesh **−0.025% to −0.086%** of the litres — inside Phase 16's (−0.15%, 0] relation.

Three findings change what the founder will see or what the planner must write. (1) On the four short-railed boards the finished-board litres drop agrees with the sketch's plan integral within 0.3%, but on the **Longboard it is 2.81 L, not 3.33 L**: its rolled rail starts ~4" off the stringer, and a belly's foam out there is foam the rail banding already takes; DATA's `Foam off` (before − now, VOLUME's figures, UI-SPEC) will therefore read 2.81 L where the sketch printed 3.33 L. (2) The **1/4" stringer floor never bites on any preset** (singles shallow to nothing at the tips by design), but vees, bellies and channels run out at full depth at a tip and **lift the bottom past the deck at the rails** of a thinned tip (e.g. a Rolled Belly Entry inverts 342 columns at the Shortboard's nose) — the seam must clamp every column, not only the stringer. (3) The sketch read the fins with **Import Template off**; the app opens with it on, so the Shortboard's front fins are at **11"** (sketch 10 7/8") and the Mid-length's at **12"** (sketch 10 7/8"), moving every fin-anchored starting number; the golden must use the app's own fin station.

**Primary recommendation:** port the sketch's maths into `lib/geometry/bottom.ts` against a golden made by executing `reference/sketches/021-bottom-maths.js` on 4,801-station arrays; pin today's live litres on the 102 boards BEFORE touching `volume.ts`; then add an optional `foamOffAt(station, across)` sampler to `CrossSectionVolumeInput` and apply the column map once at the end of `boardSectionsWith`'s loop, with a per-column floor.

## How every number here was produced

- **Nothing in the repo was edited** except this file. Scratch lives at `/private/tmp/claude-501/-Users-kontoes-Code-shaper--claude-worktrees-beautiful-fermi-ad3fb7/a6d92625-d457-4168-abef-fe2122d412e3/scratchpad/r17/` (written `SCR/` below). Sketch sources were extracted into sibling folders `…/scratchpad/src-019-bottom-contours/`, `src-020-bottom-channels/`, `src-021-bottom-guide/` (021's archive is byte-identical to the orchestrator's `…/scratchpad/sk021/`, SHA-1 `53cbf011a3144c40185da1e10e651751133375bf`).
- Run as `npx --no-install tsx --tsconfig ./tsconfig.json SCR/<script>.ts` from the worktree root (it imports the worktree's `lib/` by absolute path), or `node SCR/<script>.cjs SCR`. Node v24.19.0 on the founder's Mac; timings are order-of-magnitude.
- `SCR/board-data-now.ts` — sketch 021's own `board-data.ts`, import paths re-pointed at this worktree, writing `SCR/boards-now.json` (the board figures are unchanged since the sketch; only `litres` and `sections` moved with later Phase 16 plans).
- `SCR/021-bottom-maths.js` — the PROTOTYPE of the proposed reference copy: template.html lines 326–553 byte for byte, a `let DATA` stub before and a `module.exports` after. `SCR/020-maths.js` the same for sketch 020 (lines 319–542).
- `SCR/sketch-figures.cjs`, `SCR/sketch020-figure.cjs`, `SCR/ch-variants.cjs` — the sketch's own figures. `SCR/boards.ts` + `SCR/port.ts` — the five boards as full-precision closures and the line-for-line TS port. `SCR/q-figures.ts`, `q-figures-on.ts`, `q-fins.ts`, `q-fins2.ts`, `q-wing.ts`, `q-order.ts`, `q-units.ts` — figures by topic. `SCR/seam.ts`, `q-seam.ts`, `q-seamF.ts`, `q-railgap.ts`, `q-edge.ts`, `q-floor.ts`, `q-floor2.ts` — the seam. `SCR/surf/board-surface.ts` (a copy of the app's file whose `./volume` import is re-pointed at `SCR/surf/bwrap.ts`, which bottoms each section) + `q-mesh.ts` — the mesh. `q-flatpin.ts` — the 102-board flat proof (writes `SCR/phase17-live-litres-now.json`). `q-cost.ts`, `q-cost2.ts` — timings and SVG size. `q-golden-proto.ts` — the golden pipeline prototype.
- **Not run:** the count of saved boards on the development database. The report scripts read it through the main checkout's env file (`scripts/check-saved-boards.ts:43-47`), which this run may neither name nor touch. The last recorded count is **30 saved boards on production, 30 open** (16-13-SUMMARY.md:63, the go-live of 2026-11-06). The saving plan's report run is an orchestrator step.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| The cuts, the starting numbers, `foamOff`/`cutFoamOff`, channels, layout marks, floor flags, DATA rows, shade bands, contour lines, pencil lines, section and gauge geometry, cartoon geometry, print lines | `lib/geometry/bottom.ts` (+ `bottom-draw.ts`, `bottom-print.ts` if it grows) — pure | — | Rule 1; D-05 "every reader calls that one function" |
| Narrowest / Natural reference rail | `lib/geometry/wings.ts` (`narrowestOutlineAt`, reads its private `prepare`/`fadeAt`) | `bottom.ts` picks by rule | The wing's take and fade are wings.ts internals |
| Front-fin station and toe | `lib/geometry/fins.ts` (`frontFinStation(placement)`, `frontFinToeDegrees`) | `design.ts` helper for `summarizeDesign` | One rule the store, the rack cards and the reports share |
| Lifting each section's bottom (litres, 3D, STL, DXF, XYZ) | `lib/geometry/volume.ts` (`boardSectionsWith`, one optional sampler on `CrossSectionVolumeInput`) | `board-surface.ts` (ring point count per board; wall slots) | D-05/D-21: one section function; volume.ts keeps taking samplers, never outlines |
| Building the sampler from the board (notch inner, fins, wing rule) | `lib/geometry/design.ts` (`designCrossSectionInput(…, bottom?)`, `DesignSummaryFields.bottom`) | the store, `three-d-screen.tsx`, `summarizeDesign` | The three existing builders of the input (design-store.tsx:1269, three-d-screen.tsx:317, design.ts:345) |
| RAILS reading the lifted rail | `lib/geometry/design.ts` (a RAILS-only `railsOnTheBottom`) | `rail-bands.ts` unchanged | Must not move `summarizeDesign`'s centre thickness (the rack card's headline) |
| Saved field | `lib/models/design-snapshot.ts` (zod, optional, forgiving) | `board-file.ts` (already routes through `parseSnapshot`) | The parser is the validation boundary |
| State, undo keys, autosave | `components/design/design-store.tsx` | — | Beside `rails` and `fins` |
| The screen | `app/design/bottom/page.tsx`, `components/bottom/*` | `DesignScreenShell`, `TabbedPanel`, `SliderRow`, `callout-primitives` | UI-SPEC |
| FINS' contour | `components/fins/fin-viewer.tsx` (draws `bottom.ts` geometry) | — | D-23, read-only |
| Paper | `components/summary/order-form.tsx` (+ a `bottom-contours-sheet.tsx`), `components/template/build-overview-pdf.ts` (`overviewSpecLines`) | `bottom-print.ts` words | D-29 |
| Database | none | none | D-24 |

## Standard Stack

### Core (all already installed — verified this session)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.3.6 | the eighth route | the app's framework [VERIFIED: node_modules/next/package.json] |
| react | 19.2.8 | the screen | [VERIFIED: package.json] |
| zod | 4.4.3 | the snapshot field's schema | the parser's own library (design-snapshot.ts:162) [VERIFIED: node_modules/zod/package.json] |
| vitest | 4.1.11 | unit + relation tests | [VERIFIED: node_modules/vitest/package.json] |
| @playwright/test | 1.63.0 | three-device browser specs | chromium-1243, webkit-2359 installed [VERIFIED: ~/Library/Caches/ms-playwright] |
| tsx | (devDependency) | golden and pin scripts | the 016 precedent runs through it |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Column map at the end of `boardSectionsWith` | Rebuilding each station's rail at `T − lift` and mapping (option F) | Measured: equal to the column map within 0.4% on the short-railed boards, 18% LESS foam on the Longboard and needs two section builds per station; rejected |
| One `<path>` per 1/32" level | The sketch's one `<rect>` per band | 1,360–2,536 nodes and 93–173 KB per redraw vs ≤ ~32 paths |
| Resample the bottom run with wall slots | Keep 24 bottom points | 24 points smear a channel wall into a ramp: 0.8% of the channels' foam lost (0.0091 L of 1.1279 L on the Shortboard + 6 channels); acceptable for litres, wrong for the files' walls |

**Installation:** none (C5).

## Package Legitimacy Audit

No package is installed by this phase (C5: "No new package"). The audit is empty by design.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| — | — | — | — | — | — | none installed |

**Packages removed due to [SLOP] verdict:** none. **Packages flagged as suspicious [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
 shaper's controls (BOTTOM panel, FINS moves, TEMPLATE edits, the wing rule)
          │
          ▼
 store: state.bottom (BoardBottom, stations from the nearest tip / from the front fins)
          │            ▲ undo keys "bottom:<section>:<fields>", autosave, open-board copy, snapshot
          │            │
          ▼            │
 resolveBottom(bottom, board facts) ── board facts = length, wide point, widePointWidth,
          │                              front-fin station + raw toe (computeFinPlacement),
          │                              railAt = max(sampleOutline, foamHalfWidth),
          │                              refAt = narrowestOutlineAt | curveHalfWidthAt,
          │                              thicknessAt (side profile), notch inner
          ▼
 foamOff(resolved, station, fromStringer)  ◄── THE one number (sum of cutFoamOff, floor-clamped)
     │        │         │           │            │                 │
     ▼        ▼         ▼           ▼            ▼                 ▼
 top view  section   DATA rows   GUIDE      designCrossSectionInput(…, foamOffAt)
 shade +   + gauges  + layout    cartoons        │
 lines     + ghost   marks       (cutFoamOff)    ▼
                                           boardSectionsWith: each finished half
                                           → column map (deck fixed, bottom lifted,
                                             per-column floor) → drawn + area corrected
                                                 │
                     ┌───────────────┬───────────┼─────────────┬──────────────┐
                     ▼               ▼           ▼             ▼              ▼
                 litres (VOLUME,  3D surface   STL         DXF slices      XYZ
                 rack, tile,      (mesh)       (mesh)      (rings)         (rings)
                 order form)
 RAILS: railsOnTheBottom(effectiveRails, lift at tail12/centre/nose12) → RAILS plots + DATA only
 FINS: the same shade/lines functions in FINS' units, under the fin lines (Import Template ticked)
```

### Recommended Project Structure
```
lib/geometry/
├── bottom.ts            # types, NAMES + starting numbers, resolve, foamOff, cutFoamOff, channels, marks, floor flags,
│                        #   DATA rows, litres line (before/now/foam off from VOLUME's figures)
├── bottom-draw.ts       # shade bands (paths per 1/32" level), 1/16" contour polylines, pencil lines, section +
│                        #   gauges, cartoon geometry, tile art (pure; returns board millimetres / numbers)
├── bottom-print.ts      # the Overview Sheet / order-form words
├── bottom.test.ts, bottom-draw.test.ts, bottom-print.test.ts, phase17-litres-pin.test.ts
└── __fixtures__/bottom-golden.json, phase17-litres-pin.json
reference/sketches/021-bottom-maths.js           # byte-for-byte template.html 326–553, never imported by the app
scripts/extract-sketch021-bottom-golden.mjs      # executes the reference copy → bottom-golden.json
scripts/extract-phase17-litres-pin.ts            # run ONCE before volume.ts changes
app/design/bottom/page.tsx
components/bottom/                               # bottom-editor, bottom-controls, bottom-top-view, bottom-section,
                                                 #   bottom-data, bottom-guide (+ guide words), bottom-cartoon
lib/models/bottom-report.ts (+ test)             # the read-only saved-board report
```

### Pattern 1: the one number, ported line for line
**What:** `cutOff` (template.html lines 502–524) per cut kind; `foamOff` the sum; `fadeAt` (455–459) smoothstep with full depth to a tip; `cutHalfWidth` (466–470) Off Rail from the reference rail with the Teardrop's square-root closing; `doubleMarks` (472) keeps the flat and trough in order; `channelFit`/`channelEdges`/`channelMarks`/`chStart`/`chFade` (463–500).
**Facts measured:** every term is ≥ 0 (`sec`, `rise`, `chan` ≥ 0 on u, r ∈ [0,1]), so the sum is order-independent and `Math.max(0, …)` is defensive; "shaping order" is the order cuts are LISTED (DATA columns, print lines), not an arithmetic order. Channels add the same litres whatever the sections are (`SCR/ch-variants.cjs`: +0.3787 L under a deep single, a test single and a flat centre alike).
**Port, not paraphrase:** keep the sketch's constants as named exports (`PINCH` 3", `OFF_RAIL_MIN` 1/2", the double's 1/4" and 85%, the stagger's 1" lead-in, the 0.004 "on" threshold, the 1/32" shade step) — each written through `inchesToMm`, never `25.4`.

### Pattern 2: the seam — a column map on the finished half (Option D)
**What:** for each section the loop has finished (after the wing move and the tail roll), take `half = drawn ?? blended ?? sampledFinishedRail(result, domed, halfWidth)` (the very choice of `placedHalfSection`, board-surface.ts:241), and for every point after the deck run (index > `SECTION_POINTS.deck − 1`, the apex):

`h' = h + f(y) · (1 − min(1, h / top(y)))`, with `top(y)` = the deck run's height at that y, and `f(y) = min(foamOffAt(station, y), max(0, top(y) − 1/4"))`

The deck run is untouched (exactly where it was planed); a bottom point (h = 0) rises by exactly f; the rail's lower run rises in proportion and the apex stays. Then `area' = area + (ring(mapped) − ring(half))` — the D-31 "level variant" (volume.ts:1189-1196 does the same for wings). Set `drawn = mapped`. `foamOffAt` takes the distance from the section's INSIDE edge (stringer, or a swallow's notch wall) and adds the notch inner itself, so `volume.ts` still takes samplers only (its design rule, volume.ts:527-533).
**Why this rule:** the deck must not move (a contour only takes foam from below, D-05); at the stringer it is exactly "gap under the straightedge"; it is the sketch's own ghost rule generalised (the sketch's `fix = (h) => f + h·(T − f)/T` is this map with `top ≡ T`, template line 740 of the archive); it needs no second section build. Guard `top > 0` (a 0/0 at a tip edge gives NaN).

### Pattern 3: absent means flat, never rewritten (the wings precedent)
`bottom: bottomSchema.optional().catch(undefined)` in `designFieldsSchema`, a parsed `undefined` key deleted (`withoutUnreadWings`, design-snapshot.ts:635-640, is the model), and `designSnapshotFields` writes `bottom` only when it differs from `DEFAULT_BOTTOM`, so a board never touched on BOTTOM saves key for key as before.

### Anti-Patterns to Avoid
- **Re-deriving foam off in a component** (the shade, the section, FINS, the order form): every reader calls `bottom.ts`.
- **Lowering `rails.*.boardThickness` inside `deriveEffectiveRails`:** that value is `summarizeDesign`'s centre thickness (design.ts:355, via `railValues.centerThickness`) — the rack card's headline dim — and VOLUME's estimator rows. RAILS' lift is a separate RAILS-only derivation.
- **Copying board-data.ts's fin read:** it built fields without `finsImportTemplate` (the standalone calculator); the store's default is `true` (design-store.tsx:261). Read the store's `finPlacement` chain (`outlineForFins` → `importedFinTailFromOutline` → `computeFinPlacement`, design-store.tsx:1101-1226).
- **Formatting the toe from the sketch's 2-decimal angle:** `(Math.round(1.9525·100)/100).toFixed(1)` is `"1.9"`; the raw angle's `toFixed(1)` is `"2.0"` (Fish). Format once, from the raw value.
- **A rect per band in React:** 2,536 nodes rebuilt per slider tick.
- **Changing `SECTION_POINTS` for every board:** the ring sample count enters the level corrections of blends (`fadingSectionArea`), so a global change moves flat litres. Only a board with a cut gets the denser bottom run.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| The cut maths | a "cleaner" re-derivation | the sketch's functions ported line for line, proven against the executed reference copy | The founder approved those pictures; 1.2e-13 mm agreement is achievable |
| Where the rail is | your own outline sampling | `sampleOutline`, `foamHalfWidth`, `curveHalfWidthAt`, `wingFootprint`/`placedWings` | Swallow notch, diamond V, wings, rounded steps already solved |
| A wing's take ahead of the step | a new fade | wings.ts's private `prepare`/`fadeAt` behind one new export | Narrowest must equal the real rail behind the inner corner (measured 0.000") |
| Front fins | your own fin maths | `computeFinPlacement` through the store's chain | Wing locks, Import Template, sharp-cornered fin outline |
| Section geometry | a separate "bottomed section" builder | the column map inside `boardSectionsWith` | One section function (D-05) |
| Watertightness, enclosed volume | new checks | `meshCheck`, `enclosedVolumeMm3` (board-surface.ts) | Already the Phase 16 relation tools |
| Slider domains | per-slider metric maths | `measureSlider` (measure-display.ts:321), `metricSliderRange` (units.ts:192) | Inward rounding, the 1e-9 nudge |
| Undo coalescing | timers | `noteEdit(key)` / `patchKey` (design-store.tsx:746-755) | One drag = one step |
| Snapshot tolerance | a version bump | rule-12/13 style optional fields at version 5 | main drops unknown keys |

**Key insight:** every hard edge case (swallow notch, diamond V, wings, tip fit, tail roll, hard-edge fades) is already solved inside the section function; applying the bottom AFTER those, on the ring they produce, inherits all of them.

## Answers by question

### A. The one number, ported — figures and `bottom.ts`'s shape

**Reproduced (the sketch's own code, `SCR/sketch-figures.cjs`, on today's boards):**

| Board | Opening cuts (sketch 021 `STARTS`) | Litres off (sketch) | Full-precision port (`q-figures.ts`) | Port, fine grid 640×128 |
|---|---|---|---|---|
| Shortboard | Flat Entry · Deep Single Concave · Flat Exit | 0.7466 | 0.7466 | 0.7466 |
| Fish | Flat Entry · Flat Center · Panel Vee | 0.3137 | 0.3137 | 0.3136 |
| Mid-length | Blended Nose Concave · Shallow Single · Spiral Vee | 1.1795 | 1.1798 | 1.1797 |
| Longboard | Teardrop · Continuous Belly · Rolled Vee | 3.3288 | 3.3288 | 3.3292 |
| Fish, winged | Flat Entry · Flat Center · Extending Single | 0.1278 | 0.1278 | 0.1278 |

- **Test single** (3/16", 2" off the rail, 16" from the nose to 6" from the tail, deepest (36 + 10.88)/2 as test.cjs line 118 typed it): **0.5443 L** (sketch and port). By smoothness 0 / 50 / 100: 0.54428 / 0.54430 / 0.54433 L — the CONTEXT's "0.5442 L at 0, 50 and 100" reads 0.5443 at four places; smoothness moves it by 5e-6 L.
- **Six channels:** with 021's numbers (D-11: 5/16", 12" lead) they add **+0.3787 L** (inner longest) / **+0.3784 L** (outer, the default) on the Shortboard; with sketch 020's archived numbers (1/4", 10" lead, With the rail) **+0.2372 L** (Parallel +0.2811). The CONTEXT/SPEC's **"+0.26 L" does not reproduce** from either archive; it must not be typed as a relation — the golden carries the real value.
- **With the app's real front-fin station** (Import Template ticked, the store's default — `q-figures-on.ts`): Shortboard fins 11.0000" → opening 0.7468 L, +6 channels 0.3816 L; Fish 7.5" → 0.3137, +0.3025; Mid-length 12.0000" → **1.2285 L** (vs the sketch's 1.1795), +0.3956; Longboard 5.5" → 3.3288, +0.2740; winged Fish 7.5" → 0.1278, +0.3068.
- **Starting numbers are always in order** (`q-order.ts`): 1,680 starting cuts (16 names + channels on 105 boards: the five, plus the 100 Phase 16 boards that carry fins) — none out of Start ≥ Deepest ≥ End, none off the board. Front-fin stations over the set: 5.500" to 10.875" (standalone fins); 26 single-fin boards.

**Proposed `lib/geometry/bottom.ts` shape** (names are proposals; the planner may rename):

```ts
// Values from the sketch's NAMES table (template.html 367–401) — ported as data, each figure through inchesToMm.
export type BottomSectionKey = "nose" | "center" | "tail";
export type BottomCutKind = "flat" | "belly" | "vee" | "single" | "double";
export const BOTTOM_CUT_NAMES = {
  nose: ["Flat Entry", "Rolled Belly Entry", "Teardrop Nose Concave", "Blended Nose Concave", "Slight Single Concave Entry", "Reverse Vee Nose"],
  center: ["Flat Center", "Deep Single Concave", "Shallow Single Concave", "Early Double Concave", "Continuous Belly / Rolled Mid", "Tri-Plane Hull Center"],
  tail: ["Flat Exit", "Double Concave Exit", "Panel Vee", "Spiral Vee", "Rolled Vee", "Extending Single Concave"],
} as const;                                     // order = D-04 = the Select's order
export type BottomCutName = (typeof BOTTOM_CUT_NAMES)[BottomSectionKey][number];

/** One section's cut as STORED. The kind comes from the name (one table), never stored. Stations are the
 *  distance from the section's NEAREST tip (nose cuts from the nose, center/tail cuts from the tail — D-07), except
 *  the tail cut's Deepest At, stored from the front fins (signed, + toward the nose — D-03). */
export interface BottomCutSpec {
  name: BottomCutName;
  offRail: Mm; offStringer: Mm; troughAt: Mm;   // marks
  start: Mm; deepest: Mm; end: Mm;              // dims (see above for what each is measured from)
  depth: Mm; veeLift: Mm;                       // marks; a vee/belly's depth is its lift at the rail
  smoothness: number;                           // 0..100, steps of 5
  closesToPoint: boolean;                       // shown on the nose singles; ticked by the Teardrop's numbers
}
export interface BottomChannelsSpec {
  count: 0 | 4 | 6 | 8; width: Mm; offStringer: Mm;
  startFromFins: Mm; deepestFromFins: Mm; end: Mm;   // end from the tail
  depth: Mm; smoothness: number;
  run: "parallel" | "rail" | "toe"; longest: "inner" | "outer" | "same"; stagger: Mm;
}
export interface BoardBottom {
  nose: BottomCutSpec; center: BottomCutSpec; tail: BottomCutSpec; channels: BottomChannelsSpec;
  wingRule: "narrowest" | "natural";
}
export const DEFAULT_BOTTOM: BoardBottom;       // three flats, channels count 0 with D-11's numbers kept for later

/** The board facts a bottom is read against — built once per board by design.ts. */
export interface BottomBoard { length: Mm; widePoint: Mm; widePointWidth: Mm; frontFins: Mm; toeDegrees: number /* raw */;
  railAt(s: Mm): Mm; refAt(s: Mm, rule): Mm; thicknessAt(s: Mm): Mm; notchInner(s: Mm): Mm; }

export function startingCut(section, name, board): BottomCutSpec;          // D-08, stored form
export function startingChannels(count, board, kept?): BottomChannelsSpec; // D-10/D-11 width-follows-count rule
export function keepStationsInOrder(cut, changed: "start" | "deepest" | "end"): BottomCutSpec; // sketch normalize
export function resolveBottom(bottom, board): ResolvedBottom;              // absolute stations from the tail
export function cutFoamOff(resolvedCut, board, s, y): Mm;                  // one cut alone (the sketch's lesson)
export function foamOff(resolved, board, s, y): Mm;                        // the one number
export function channelLayout(resolved, board, s): { edges; marks; fit };
export function bottomFloorFlags(resolved, board): { section; stations: Mm[] }[];
export function bottomDataRows(resolved, board): BottomDataRow[];          // every 6" from the tail
export function bottomLayoutMarks(resolved, board): { columns; rows };
export function bottomHasCut(bottom): boolean;                              // flat sections + count 0 → false
```

- **Stacking rule:** a sum of the per-cut `cutFoamOff` (nose, center, tail, channels — the order they are listed), each ≥ 0. Overlapping cuts add; "a single into a double leaves the stringer as the ridge" falls out because a double takes 0 inside Off Stringer.
- **The floors:** `foamOff` returns `min(sum, max(0, thicknessAt(s) − 1/4"))` — no point of the bottom deeper than the stringer may go (D-09). The seam additionally clamps per column against the finished section (`top(y) − 1/4"`, Pattern 2). The caller learns it from `bottomFloorFlags`: for each cut, the stations (scanned on a 1/2" grid, and every 6" for DATA) where that cut's own `cutFoamOff` at the stringer would leave less than 1/4" — the warning's `{at}` is the one nearest that cut's own tip. **Measured (`q-floor2.ts`): no starting cut, and no single at 1/2" with its end at a tip, ever meets the stringer floor on the five boards** (singles shallow to nothing near a tip by `PINCH`); the tip thicknesses are 0.438"–0.938". The floor that DOES bite is at the rails (§B, Open Question 2).
- **Fin-anchored stations (D-03):** `deepest` of the TAIL cut and the channels' `startFromFins`/`deepestFromFins` are stored relative to `frontFinStation(placement)` = the largest `offTail` of the marks whose `role` is `"front"`, or of all marks when none is (a single fin: its own trailing edge — the Longboard's 5 1/2"). On read, `resolveBottom` clamps to [0, L] and keeps order with the fin-anchored station winning: Start := max(Start, Deepest), End := min(End, Deepest) — on read only, never written back (Open Question 4). A single fin has no toe: `toeDegrees` 0, Run `toe` behaves as Parallel and the option reads `Toe-in (no toe)`.

### B. How the cut reaches the litres, the 3D board and the files

- **The seam:** `CrossSectionVolumeInput` (volume.ts:534-558) gains `foamOffAt?: (station: Mm, across: Mm) => Mm`; `boardSectionsWith` (volume.ts:1048-1276) applies Pattern 2 to each section it pushes (one helper wrapping the three `sections.push(…)` at :1102, :1246, :1268/:1273) when the sampler is present. `designCrossSectionInput` (design.ts:102-115) takes an optional `bottom` and board facts and supplies the sampler only when `bottomHasCut`. `buildBoardSurface` (board-surface.ts:262) calls `boardSections` and `placedHalfSection` reads `section.drawn` first (board-surface.ts:241) — so the surface, `cncFiles(surface, …)` (lib/export/cnc-files.ts:58) and its STL/DXF/XYZ writers carry the cut with no change of their own.
- **Flat is bit-identical (`q-flatpin.ts`):** on all **102** boards of `phase16SurfaceBoards()`, running the map with f ≡ 0 (no shortcut), recomputing each area and re-integrating gives today's `summarizeDesign(fields).volumeLitres.toPrecision(17)` exactly, and every area delta is `Object.is(Δ, 0)`. **Today's live litres match none of the three Phase 16 pins** (each pinned an older rule), so this phase needs its own pin: `phase17-litres-pin.json` from today's live rule (the 102 values are in `SCR/phase17-live-litres-now.json`, e.g. `"shortboard|asis|hard": "29.613058210973708"`), generated by a script BEFORE `volume.ts` is touched, as 16-01 did.
- **With cuts (`q-seam.ts`, `q-seamF.ts`, fins as the sketch read them):**

| Board | Case | Sketch plan integral | Seam (ring as drawn, 24 bottom pts) | Seam (bottom run 400 pts) | Seam ÷ sketch |
|---|---|---|---|---|---|
| Shortboard | opening | 0.7466 | 0.7468 | 0.7466 | 1.0000 |
| Shortboard | test single | 0.5443 | 0.5445 | 0.5443 | 1.0000 |
| Shortboard | opening + 6 ch | 1.1279 | 1.1188 | 1.1279 | 1.0000 |
| Shortboard | every cut + 8 ch at 1/2" | 2.0660 | 2.0466 | 2.0631 | 0.9986 |
| Fish | opening / + 6 ch | 0.3136 / 0.6180 | 0.3136 / 0.6251 | 0.3136 / 0.6179 | 0.9997 / 0.9999 |
| Mid-length | opening / + 6 ch | 1.1797 / 1.5446 | 1.1786 / 1.5371 | 1.1784 / 1.5395 | 0.9989 / 0.9967 |
| **Longboard** | **opening** | **3.3292** | 2.8134 | **2.8134** | **0.8451** |
| Longboard | every cut + 8 ch at 1/2" | 5.5314 | 4.7668 | 4.7658 | 0.8616 |
| Fish, winged | opening / + 6 ch | 0.1278 / 0.4319 | 0.1281 / 0.4293 | 0.1280 / 0.4324 | 1.0019 / 1.0011 |

  The Longboard's gap is real geometry (`q-edge.ts`): its finished rail's bottom edge stands only **34–42%** of the half-width out from the stringer (2.87"–4.57"), against 91–100% on the other four. The sketch integrates over a square-railed slab to the outline; the litres count the finished board, where much of a belly's or vee's foam near the rail is foam the rail banding takes anyway. (A full rebuild at `T − lift`, option F, takes even less: 2.30 L — rejected.)
- **Mesh vs litres with cuts (`q-mesh.ts`, the app's own `buildBoardSurface` copied with the bottomed sections):**

| Board | flat | opening | opening + 8 ch | every cut + 8 ch at 1/2" | build ms |
|---|---|---|---|---|---|
| Shortboard | −0.042% | −0.043% | −0.061% | −0.073% | 68–105 |
| Fish | −0.040% | −0.040% | −0.045% | −0.049% | 59–78 |
| Mid-length | −0.025% | −0.028% | −0.042% | −0.053% | 49–78 |
| Longboard (the longest) | −0.051% | −0.053% | −0.048% | −0.046% | 67–87 |
| Fish, winged | −0.040% | −0.039% | −0.069% | −0.086% | 55–66 |

  Every one of the 20 meshes: 0 open edges, 0 non-manifold, 0 mis-wound, 0 zero-area triangles. The relation holds by construction (the litres count the very ring drawn); keep Phase 16's one-sided tolerance (−0.15%, 0].
- **A channel's wall in the ring:** with the fixed 24-point bottom run a wall is smeared into a ramp (the 0.0091 L under-count above, and no vertical face in the STL). Recommend: on a board with channels, re-lay the bottom run to a fixed per-board count — 24 + 2 slots per possible wall (4 a side) = 32 — with each wall's top and foot at the same y (the wall's own, just outside / just inside) and the rest spread evenly between; a wall that hasn't started (stagger) or has no depth collapses to one welded point (`weldKey`, board-surface.ts:246) and its degenerate quads are skipped by `tri` (board-surface.ts:403), the tips' existing mechanism. `HALF_POINTS` becomes the board's ring length (board-surface.ts:78 and 10 uses); `BOTTOM_EDGE` is unchanged (the extra points come after it). Mark the wall rows like `bottomEdge` (`SurfaceRing.bottomEdge`, used by board-surface-render.ts:119-126) with sharpness 1, so the screen's normals split there ("a sharp row, as the hard edge is"). The tip edge (`tipEdge`, :220) must emit the same count.
- **The swallow:** each notch station is two pieces whose inside edge is the notch wall (`inner = sampleOutline − halfWidth`, board-surface.ts:291-293). `foamOffAt` adds that inner, so a cut is read at its true distance from the stringer; the notch itself is air and never cut; the stringer-side wall runs from the lifted bottom (h = f(inner)) to the deck — the wall's own slots interpolate between the half's last and first points (board-surface.ts:327-331), so no change. Channels whose walls fall inside the notch simply don't exist there.
- **The diamond V:** the sketch's `foamOff` returns 0 wherever `sampleOutline` is 0 — behind the tail block, i.e. the whole V is uncut. Recommend the rail for vees/bellies be `railAt(s) = max(sampleOutline, foamHalfWidth)` (the V's own edge there; identical elsewhere), so a vee runs out the V like the rest of the tail (Open Question 7).
- **The tail roll:** applied before the bottom (the roll scales heights, "the bottom left alone", volume.ts:1199-1204); `tailRollFoam` reads `area × (1 − rollScale)`, so with the corrected area the roll's foam follows the cut to second order. Measured litres above include it.

### C. RAILS works from what the bottom leaves (D-22)

- **What RAILS reads today:** `rails.*.boardThickness` from `deriveEffectiveRails` (design.ts:191-203: `foil.nose12`, `foil.center`, `foil.tail12` when imported). `boardSectionsWith` never reads those three — it uses `thicknessAt(station)` per station (volume.ts:1054, :1077) — so they feed only RAILS' plots/DATA (`computeRailBands`), VOLUME's estimator rows (`deriveRailValues`) and `summarizeDesign`'s headline `centerThickness` (design.ts:355).
- **Recommendation:** (1) the litres/3D/files read the lifted rail through the seam's column map, per station, automatically; (2) RAILS' three plots, DATA and its readout card read `boardThickness − lift(anchor)` through a RAILS-only `railsOnTheBottom(effectiveRails, liftAt)` where `liftAt(s) = foamOff(s, railAt(s))` (DATA's own "Rail lift" column) at the tail 12", centre and nose 12" stations (`foilStationPoints`, volume.ts:1056-1059); flat bottom ⇒ lift 0 ⇒ the same object returned (no RAILS figure moves; prove with `computeRailBands` deep-equal on the 102 boards). `deriveEffectiveRails` and `summarizeDesign` stay as they are. A concave's lift at the rail is 0 (`sec(1, r) = 0`), so a concave never moves RAILS (D-22's parenthesis), measured: Fish/Mid-length centre lift 0.000".
- **How close the two are (`q-railgap.ts`):** at the tail 12" anchor, RAILS' rail computed at `T − lift` and set on the lift lies within **0.20 mm** of the column-mapped 3D rail on the Fish (lift 0.150") and **0.18 mm** on the Mid-length (0.183") — the same curve. On the **Longboard** (lift 0.237" at the tail, 0.371" at the centre under its belly) the two differ by **15.5 mm and 24.5 mm**, because its rolled rail reaches 7" in. That is the founder's call (Open Question 3).
- **What RAILS shows:** no new control or word (UI-SPEC §8) — on a vee/belly board its three imported thicknesses (`imported-readout.ts:99-111`, caption `From ROCKER & FOIL`) and band figures read the thinner rail; the caption is UI-SPEC open item 3.
- **The ghost on BOTTOM (D-13):** draw the station's own bottomed ring from `boardSections` (the `drawn` the litres count) rather than re-sampling `sampledFinishedRail` and moving it — the sketch's ghost (`fix`) is the same map with `top ≡ T`, so the founder's picture is kept and the ghost can never disagree with the 3D board.

### D. FINS shows the contour; the front fins (D-03, D-10's Toe-in)

- `FinMark` [VERIFIED: lib/geometry/fins.ts:177-188] — `role: FinRole; side: -1 | 0 | 1; offTail: Mm; lateral: Mm; leadingOffTail: Mm; leadingLateral: Mm; baseLength: Mm; toe: Mm; lateralKind: FinLateralKind; lateralValue: Mm | null;` and `export type FinRole = "front" | "rear" | "center";` [VERIFIED: fins.ts:83].
- **Measured (`q-fins.ts`, `q-fins2.ts`):** Shortboard thruster front pair trailing edge 10.8750" (Import Template off) / **11.0000"** (on), base 4.5", toe 1/4" → **3.1798°**; Fish twin 7.5000" both ways, base 5.5", toe 3/16" → **1.9525°** (prints `2.0°` from the raw angle; the sketch printed `1.9°` after rounding to 1.95); Mid-length quad front 10.8750" / **12.0000"**, 3.1798°; Longboard single (role `center`) 5.5000", toe 0. Presets carry no `finsImportTemplate` (`presetDesignFields` → undefined), the store fills `true` (design-store.tsx:261).
- **FINS' drawing:** `SCALE = 14` units per inch, `ORIGIN_X = 260`, `TAIL_Y = 320` (fin-viewer.tsx:43-45); the tail fill and ink at :663-664; the fin lines at :687-704 (dashed by role there). Draw the shade paths and 1/16" lines between the fill (:663) and the outline stroke, from `bottom-draw.ts` in board millimetres mapped by FINS' own transform, `--outline-pencil-line`, strokes `× zoomUnit`. Draw it only while FINS' Import Template is ticked — otherwise FINS draws the generic tail, not this board's (edge case). A flat board adds no element, so FINS' reference picture does not move.

### E. The reference rail on a winged board (D-19)

Measured on the winged Fish (`q-wing.ts`: wing at 11.5", 1/4" deep, 1" run, inner corner 10.5", tail pod 0):

| From the tail | Real rail | Natural (`curveHalfWidthAt`) | Narrowest | Narrowest − rail | Natural − rail |
|---|---|---|---|---|---|
| 6" | 6.611" | 6.754" | 6.611" | 0.000" | +0.143" |
| 10" | 7.374" | 7.612" | 7.374" | 0.000" | +0.238" |
| 10.5" (inner corner) | 7.459" | 7.709" | 7.459" | 0.000" | +0.250" |
| 11" (in the step) | 7.679" | 7.804" | 7.554" | −0.125" | +0.125" |
| 11.5" (the wing) | 7.896" | 7.896" | 7.646" | −0.250" | 0.000" |
| 20" | 9.171" | 9.171" | 8.921" | −0.250" | 0.000" |

- **Narrowest** = `curveHalfWidthAt(g, s) − Σ depth × fade(s)` with `fade = clamp((s − pod)/(inner − pod), 0, 1)` and **no step share** (board-data.ts's `narrowAt`): it IS the real rail behind the inner corner (0.000" at every station measured) and the curve less the full depth ahead. wings.ts's `takeAt` (:453-461) is that sum WITH the share; propose `export function narrowestOutlineAt(g, s)` beside it, reusing the private `prepare` (:436) and `fadeAt` (:448). With two wings the sum covers both.
- **Effect:** the Extending Single (2" off) takes 0.1278 L under Narrowest, 0.1329 L under Natural; its edge stands 2.000" off the real rail at 6" under Narrowest and 1.857" under Natural; ahead of the wing Narrowest puts it 2.250" off the real rail. Six channels fit at 1 3/4" either way (last wall 1.665" off the reference under Narrowest, 1.844" under Natural).

### F. Saving (D-24)

- Facts: `export const DESIGN_SNAPSHOT_VERSION = 5;` [VERIFIED: lib/models/design-snapshot.ts:200]; `designFieldsSchema` is `z.object({ outline, rocker, foil, rails, fins, volume, finsImportTemplate, railsImportFoilThickness, boardName, finSystem, blank }).partial()` [VERIFIED: design-snapshot.ts:514-528]; the optional-forgiving pattern `z.number().min(…).max(…).optional().catch(undefined)` then a transform that leaves no key [VERIFIED: :439-458]; parse returns the eleven fields with defaults (:722-734).
- **Recommend:** field name `bottom` (a twelfth top-level key, optional); version stays **5** for rule 6's reason (zod's default object strips unknown keys, so `main` and a rolled-back deployment open the board flat — the documented trade-off of rules 12/13). Schema: names as `z.enum` per section (an unknown name → that section reads its flat), counts `z.union([0,4,6,8])`, run/longest enums, `wingRule` enum, every number finite and bounded to its slider's range widened to the board-length bound (stations within ±2 × `BOARD_LENGTH_RANGE_IN.max`), smoothness 0–100; each sub-object `.catch(<that part's default>)` so one bad value never rejects the board; the whole `bottom` `.optional().catch(undefined)`; an undefined key deleted after parse. `parseSnapshot` returns no `bottom` key when absent; the store fills `DEFAULT_BOTTOM` into STATE (not into the snapshot); `designSnapshotFields` (design-store.tsx:1500-1528) adds `bottom` only when `!isDefaultBottom(state.bottom)` — so an untouched board's save is key for key what it was, and a flat board saved after BOTTOM was visited and reset is too.
- **Board files:** `buildBoardFile` → `buildSnapshot(fields)` and `readBoardEntry` → `parseSnapshot` (board-file.ts:77-83, :168-176) — the field rides along with no file-format change; `Import my designs` uses the same reader.
- **Rack cards:** `rackBoardFigures(fields)` calls `summarizeDesign(fields)` (rack-models.ts:55-58) — `DesignSummaryFields` must gain `bottom?`, `fins?`, `finsImportTemplate?` so a saved board's card counts its cut (T-04-11: never two litres for one board). Presets carry no bottom → unchanged.
- **The report:** a `lib/models/bottom-report.ts` + `scripts/check-saved-boards.ts --bottom-report` (read-only, ids and litres only, the 14-D-18 pattern): every saved board opens, `bottomHasCut` false on every one (none can have one before go-live), litres equal to the pin's rule. Run by the orchestrator on the development branch and by the founder on production (the env-file rule).

### G. The store (D-01, D-27)

- `DesignState` (design-store.tsx:177-…) gains `bottom: BoardBottom`; `DEFAULT_DESIGN_STATE` (:254-271) `bottom: DEFAULT_BOTTOM`; `historySnapshot` (:669-690) and `designSnapshotFields` (:1500-1528) add it; `applyPreset`/`applyModel` reset or read it (presets flat).
- **Actions and undo keys** (the `noteEdit` rule, :746-755; `updateRailSection` :871 is the model): `pickBottomCut(section, name)` — `noteEdit(null)`, sets `startingCut(section, name, board)`; `updateBottomCut(section, patch)` — `noteEdit(\`bottom:${section}:${patchKey(patch)}\`)`, applies `keepStationsInOrder` in the same step; `setBottomClosesToPoint(section, on)`, `setChannelCount(n)`, `setChannelRun`, `setChannelLongest`, `setBottomWingRule` — `noteEdit(null)`; `updateChannels(patch)` — `noteEdit(\`bottom:channels:${patchKey(patch)}\`)`. Every action starts with `if (lockedRef.current) return;`. Session-only (not saved, not undoable): the live cut, the section station, Height, the finished-rail tick.
- **Derived per change** (`q-cost.ts`, `q-cost2.ts`, Node on the Mac; budget ×3–6 for a mid-range phone):

| What | Shortboard opening | Shortboard 3 cuts + 8 ch | Longboard opening + 8 ch |
|---|---|---|---|
| one `foamOff` call | 1.23 µs | 3.38 µs | 0.29 µs |
| shade grid 120 × 65 | 5.6 ms | 11.1 ms | 5.5 ms |
| the sketch's table 241 × 14 | 2.9 ms | 5.0 ms | 2.7 ms |
| DATA rows every 6" | 0.6 ms | 0.9 ms | 0.8 ms |
| the section at one station | 0.45 ms | 0.19 ms | 0.19 ms |
| litres today → with the seam | 6.5 → 15.9 ms (scratch double-builds; the real seam adds ~5 ms) | — | 2.6 → 9.5 ms |

  Memoise the resolved bottom on (board facts, `state.bottom`) and the shade grid on (resolved, board); a slider drag recomputes ~10–25 ms in Node. Keep the 120 × 64 grid (the founder's picture); if a Pixel 7 at 4× CPU throttle drops below 30 frames while dragging, fall back to 60 × 32 while a pointer is down (measure; UI-SPEC open item 4).

### H. The eighth screen's plumbing (D-01, D-02)

- `NAV_LINKS` [VERIFIED: components/site-nav.tsx:31-39] is `{ href: "/design/outline", label: "TEMPLATE" }, { href: "/design/rocker", label: "ROCKER" }, { href: "/design/rails", label: "RAILS" }, { href: "/design/volume", label: "VOLUME" }, { href: "/design/fins", label: "FINS" }, { href: "/design/summary", label: "SUMMARY" }, { href: "/design/3d", label: "3D" }` — insert `{ href: "/design/bottom", label: "BOTTOM" }` third. Gap class today `"flex items-center gap-3 lg:gap-4 xl:gap-5"` [VERIFIED: site-nav.tsx:96] → UI-SPEC §10's `gap-1.5 lg:gap-3 xl:gap-5`.
- `TILE_KIND: Record<NavLink["href"], ScreenTileKind>` [VERIFIED: components/design/screen-tiles.tsx:64-72] — typed on the list, so the build fails until `"/design/bottom": "bottom"` exists; `ScreenTileKind = "template" | "rocker" | "rails" | "volume" | "fins" | "summary" | "threeD"` [VERIFIED: lib/geometry/screen-tiles.ts:255] gains `"bottom"`; `screenTileLines` (:260-275) gains `bottom`; the grid `"grid grid-cols-4 gap-2 shell:grid-cols-7"` [VERIFIED: screen-tiles.tsx:263] → `shell:grid-cols-8`. `screenWord("BOTTOM")` is `Bottom` already (lib/screen-steps.ts:40-46).
- **Sideways tiles, confirmed by arithmetic from Phase 16's measured seven:** sheet inner at 844 = 7 × 110.3 + 6 × 8 = 820.1 → eight tiles (820.1 − 56)/8 = **95.5**; at 863: 7 × 113.0 + 48 = 839 → **97.9**; a real iPhone's 47-dot insets replace the 12-dot padding (`pr-[max(0.75rem,env(safe-area-inset-right))]`, phone-menu.tsx:97) → (820.1 − 70 − 56)/8 = **86.8** — the UI-SPEC's three figures hold. The desktop row's widths need a browser and were not re-measured here.
- **Specs that list or count the screens** — UI-SPEC §16's list, plus these it missed: `e2e/phone-home.spec.ts:48-62, :131` (`expectSevenTilesInMenu`, "seven links"), `e2e/error-pages.spec.ts`, `e2e/legal-pages.spec.ts`, `e2e/phone-screens.spec.ts`, `e2e/prod/phone-controls-clear-undo.spec.ts` (all import `SCREENS`/the helper and follow it once it has eight), `e2e/contact.spec.ts:133-139` and `e2e/privacy.spec.ts:104-110` (hand lists of six design addresses — add BOTTOM for coverage), `e2e/old-safari-buttons.spec.ts:146`, `e2e/board-name-band.spec.ts:132, :244, :247`. `SCREENS` [VERIFIED: e2e/helpers/screens.ts:14-22] gains BOTTOM third; `expectSevenTilesInMenu` (:74-80) becomes eight.
- **Desktop pictures: there are SIX, not five** — `outline`, `rocker`, `rails`, `volume`, `fins` and `three-d` (`e2e/desktop-baseline.spec.ts-snapshots/*-desktop-darwin.png`; `three-d` was added at 16-12). All six move in the nav row only; Back/Next sit below the fold at 800 tall (looked at: the RAILS picture shows no step nav), so ROCKER's `Bottom →` and RAILS' `← Bottom` don't reach them. FINS' picture is unchanged by D-23 (presets are flat).

### I. Drawing the shade and the lines (D-12)

- **The sketch's band code** (template.html 597–626): for each of 120 columns, 65 samples across, and each 1/32" level up to the column's deepest, one `<rect>` per run of samples at or over that level, mirrored. **Measured (`q-cost.ts`) on the drawing's own scale:** Shortboard opening 612 rects / 40 KB; Shortboard + 8 ch 2,194 / 152 KB; Shortboard three cuts + 8 ch 2,472 / 173 KB; Longboard opening 1,738 / 114 KB; Longboard + 8 ch **2,536 rects + 8 contour paths, 169 KB**; Longboard three cuts + 8 ch 1,360 / 93 KB. The tile at 40 × 12: 206–750 rects.
- **Recommend:** `bottomShadeBands` returns, per 1/32" level, the list of rectangles in board millimetres; the component joins each level into ONE `<path d>` (`M x y h w v h h −w z` per rect) with `fill-opacity` 0.04 — rects of one level never overlap, so the picture is identical and the node count is the number of levels (≤ 16 for one 1/2" cut, ≤ ~48 at the worst stacking). Contour lines: one `<path>` per 1/16" level, as the sketch. Pencil lines: one path per kind per cut. All clipped to the outline (`clipPath`), strokes in screen pixels through `useSvgFitScale` (callout-primitives.tsx:153), `vectorEffect="non-scaling-stroke"` only on the GUIDE cartoons (the UI-SPEC's rule).
- **The cutting line and drag:** the TEMPLATE precedent — pointer handlers on the SVG with `setPointerCapture` (outline-viewer.tsx:655, :663) and the drawing group's `getScreenCTM()` for client → board (outline-viewer.tsx:559-566); `drag-selection.ts`'s `TAP_MAX_TRAVEL_PX = 8` separates a tap from a drag. BOTTOM's top view has no zoom (no corner toolbar), so one handler on the SVG: press/move → station = clamp(L/2 − (x − 500)/k, 0, L) (the sketch's `stationAt`, template 1137-1141), `touch-none select-none`; the `Section at` slider is the keyboard path (no drawing handle takes keys today).

### J. Rule 2 (D-25)

Run (`q-units.ts`): `formatDim` 36" → `36"` / **`91.4 cm`**, `formatDimBare` → `91.4` — the station's own digits; 12" → `30.5 cm` (= `stationLabel`, measure-display.ts:253-255); 23 7/16" → `59.5 cm`; 10 7/8" → `27.6 cm`. `formatMark` 1/16" → `2 mm`, 3/16" → `5 mm`, 1/4" → `6 mm`, 5/16" → `8 mm`, **1/2" → `13 mm`**, 2 1/4" → `57 mm`. `measureSlider` Metric: Depth 0–**12** step 1 (a stored 1/2" shows its thumb pinned at 12 under a `13 mm` label — measureSlider's documented clamp, no write); Off Rail 0–152; Channel Width 13–101; Stagger 0–200 step 10. `metricSliderRange` [VERIFIED: lib/geometry/units.ts:192-206] rounds inward with the 1e-9 nudge. Formatters: marks `formatMark`/`formatMarkBare` (measure-display.ts:81, :86); dims `formatDim`/`formatDimBare` (:63, :72); length `formatLength` (:210); headers `columnUnitSuffix` (:284); a new `formatBottomStation` beside `formatThinningStart` (blank-reasons.ts:285); the station slider on the `thinningStartSlider` grid (blank-reasons.ts:310-322: 1/2" Imperial, 10 mm Metric); parsing (if a typed field is added) `parseImperial`/`parseMetric` (units.ts:411, :221). Litres `toFixed(2)`; toe `toFixed(1)` on the raw angle.

### K. Paper (D-26, D-29)

- **The order form already has an optional third sheet:** `const sheetCount = printRailInstructions ? 3 : 2;` (components/summary/order-form.tsx:262) — the Rail Band Instructions page. The BOTTOM CONTOURS page makes the count `2 + (bottomHasCut ? 1 : 0) + (printRailInstructions ? 1 : 0)`; recommend it sits third, before the instructions (D-29: "after page 2"), so Page N of M counts it. UI-SPEC §8 does not mention this interplay — the planner must, and must prove both flat cases (2 and 3 sheets) byte-identical.
- The page in the order form's dress (`FormBox`, the print block `order-form.css:501`, the `break-before: page` rules at `order-form.css:795-796`); the drawings from `bottom-draw.ts` (no new maths), the sections at each cut's deepest station, DATA's two tables, the How to shape notes verbatim from the same source the GUIDE uses.
- **The Overview Sheet:** `overviewSpecLines(outline, geometry, system, wings)` (build-overview-pdf.ts:126-170) — add an optional `bottomLines: string[]` (from `bottom-print.ts`) pushed after `Template Area` with `WING_ROW_INDENT`; `[]` adds nothing, so a flat board's list is byte-for-byte today's (the wings' D4 rule). The Full Sized Template and the Paper Saver take nothing (prove by a source/inventory test that their builders never import `bottom`).

### L. Testing design

- **The reference copy:** `reference/sketches/021-bottom-maths.js` = header comment ("REFERENCE COPY — never edited … template.html SHA-1 53cbf011a3144c40185da1e10e651751133375bf … lines 326–553") + `let DATA = { U: [], boards: [] };` + **template.html lines 326–553 byte for byte** (units formatters, the curves, `NAMES`, `makeChannels`, `STARTS`, `makeCut`, `state`, `setBoard`, `allCuts`, `sampleArr`… `markColumns`; none touch the DOM — checked) + a `module.exports` of `setData`, `use(id, units, wingRule)`, `state`, `B`, and the functions. Prototype: `SCR/021-bottom-maths.js` (built by slicing the archive; runs in Node).
- **The golden script:** `scripts/extract-sketch021-bottom-golden.mjs` builds `DATA.boards` from the APP — the five boards (four presets as `phase16Boards()` `asis` + the winged Fish of board-data.ts) — with arrays sampled at **4,801 stations at full precision** (no 0.1 mm rounding) and `fin`/`toeDeg` from the store's own chain (Import Template ticked, raw angle). Measured (`q-golden-proto.ts`): with 4,801 stations the sketch's own code and a closure port agree to **1.23e-13 mm** over 230,580 probes and **4.4e-16 L**; with the sketch's 241 stations the litres differ by 1.3e-3 L — so 241 is too coarse for a golden. Records: for every name on every board at its starting numbers (alone, and with the board's opening cuts), `foamOff`/`cutOff` on a 25 × 13 grid whose stations are multiples of L/4800 (the arrays' own stations, so the sketch interpolates nothing); `litresOff`; `marksOf`/`markColumns` every 6"; `channelEdges`/`channelMarks`/`channelFit`/`chStart` for 4/6/8 × the three runs × the three Longest on the Shortboard and the Fish; `refAt` under both wing rules on the winged Fish. Size budget ≈ 1 MB (precedent: rails-v2-golden.json 1.07 MB, phase14-today-golden.json 1.27 MB).
- **The litres pin:** `scripts/extract-phase17-litres-pin.ts` writes `phase17-litres-pin.json` (`toPrecision(17)`, 102 boards, provenance "GENERATED … before the bottom seam — never re-run") in the plan's FIRST task; `phase17-litres-pin.test.ts`: every board with no bottom, and with `DEFAULT_BOTTOM`, and with a bottom whose sections are flat and whose channels are 0 but whose numbers are non-default, reads the pin to the last digit; every preset card's `presetSummary` too.
- **Relation tests (never a typed figure):** (a) `foamOff` equals the golden at every probe within 1e-9 mm; (b) one cut's shape is probed with `cutFoamOff`, never the total (the Shortboard's single runs under its channels — the sketch's lesson); (c) litres before − after equals Simpson of the seam's area deltas, and lies between the bottom-run-only integral and the golden's plan integral (the Longboard proves the gap is the rail); (d) mesh volume within (−0.15%, 0] of the litres with cuts on the five boards, `meshCheck` all zero, with channels; (e) DATA's stringer-left = `thicknessAt(s) − foamOff(s, 0)` at every row, and the gauge's "at the stringer" the same number; (f) a CNC slice's lowest point at the stringer stands `foamOff(s, 0)` above the rocker; (g) RAILS: flat → `computeRailBands` deep-equal; a vee → the tail anchor's `boardThickness` = planed − `foamOff(tail12, railAt)`; (h) Narrowest = real rail behind the inner corner, = curve − depth ahead; (i) smoothness moves the litres by under 1e-4 L on the test single; (j) every name's starting cut keeps Start ≥ Deepest ≥ End on the 105 boards; (k) the floor: `foamOff ≤ thicknessAt − 1/4"` everywhere; no column of any bottomed ring inverted on the five boards with every cut at 1/2" + 8 channels at 1/2".
- **Browser specs (three devices; `PW_PORT=33NN IS_WEBPACK_TEST=1 npx playwright test …` in a worktree):** new `e2e/bottom-screen.spec.ts` (desktop: panel, picking each name, the shade and lines draw, the section follows a drag and a tap, Height, ruler at 1024/1280 and absent at 820, DATA's tables, the locked board, Metric), `e2e/phone-bottom.spec.ts` (iphone/android: the 66dvh pin, NOSE · CENTER · TAIL, the TAIL panel scrolls with channels, sideways floor 360 and the column scrolls, the page never scrolls), `e2e/bottom-guide.spec.ts` (19 cards, tags, 3/2/1 across, scrolling inside the folder), `e2e/bottom-saving.spec.ts` (save/reopen exact, undo/redo one step per drag, board file round trip, a board without the field opens flat), `e2e/fins-contour.spec.ts` (contour under the fins; a fin move carries the tail cut's Deepest), `e2e/summary-bottom-page.spec.ts` (third page only with a cut; fit on both papers; page marks), plus the eight-count amendments (§H) and `e2e/site-nav-width.spec.ts`.

### M. Open questions — see `## Open Questions`.

### N. Edge Coverage and Prohibitions — see the two tables at the end, for `17-SPEC.md`.

## Runtime State Inventory

Not a rename/refactor phase in the sense of the template, but one runtime item matters:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Saved boards' `snapshot` JSON (30 on production at 16-13; development count not taken — env-file rule). None can carry `bottom` before go-live. | None at go-live (absent = flat); the read-only `--bottom-report` proves every board opens flat and unchanged |
| Live service config | None — verified: no service holds a screen list (Vercel Analytics counts pages by address, a new address simply appears) | None |
| OS-registered state | None | None |
| Secrets/env vars | None — no new variable | None |
| Build artifacts | `.next/dev/types` after a new route in a fresh worktree (`npx next typegen` before `tsc`, memory) | Run typegen in each executor worktree |
| Browser storage | `shaper-open-board` (localStorage) holds the in-progress board's snapshot fields | Carries `bottom` automatically once `designSnapshotFields` has it; an old copy without it reopens flat |

## Common Pitfalls

### Pitfall 1: The sketch's fins are not the app's fins
**What goes wrong:** fixtures and pictures built from board-data.ts put the Shortboard's front fins at 10 7/8" and the Mid-length's at 10 7/8"; the app (Import Template ticked) puts them at 11" and 12". **How to avoid:** the golden reads the store's chain. **Warning sign:** a DATA "front fins" row 1/8" or 1 1/8" off FINS' own number.

### Pitfall 2: Typing the brief's figures as expectations
0.54 / 0.75 / 0.31 / 3.33 L are the sketch's plan integrals; the app's litres drop is 2.81 L on the Longboard, and "+0.26 L" reproduces from no archive. Relations only, against the generated golden.

### Pitfall 3: Inverted columns at a thinned tip
A vee, belly or channel that runs out at full depth lifts the bottom past the deck at the rails near a tip (`q-floor.ts`: Rolled Belly Entry inverts 342 columns at the Shortboard's nose; Panel Vee + 8 channels at 1/2" invert 58–78 columns at every tail). The 3D mesh folds and the litres go wrong. **Avoid:** the per-column floor in the seam; a relation test with every cut at 1/2".

### Pitfall 4: NaN at a tip edge
`h / top` with top = 0 gives NaN and poisons the area. Guard `top > 0` (the scratch map does).

### Pitfall 5: The rack card and VOLUME disagree
If `summarizeDesign` doesn't receive `bottom` (and the fins to resolve it), a saved board's rack card keeps the flat litres while VOLUME counts the cut (threat T-04-11). Extend `DesignSummaryFields` and every caller that builds fields from a snapshot.

### Pitfall 6: Moving the headline thickness
Lowering `rails.center.boardThickness` in `deriveEffectiveRails` changes the rack card's thickness and VOLUME's estimator. RAILS' lift is RAILS-only.

### Pitfall 7: A global ring-count change
Changing `SECTION_POINTS` moves blended stations' level corrections and therefore flat litres. Only boards with a cut get the denser bottom run.

### Pitfall 8: The toe's double rounding
`1.9°` vs `2.0°` on the Fish. One `toFixed(1)` on the raw angle.

### Pitfall 9: Counting seven (and five pictures)
Five more specs than §16 lists; six desktop pictures, not five. After the nav merges, every seven-count spec is red until the eight-count plan merges — same plan (planner rulings).

### Pitfall 10: The order form's page count
The Rail Band Instructions sheet is optional; "Page N of M" and the flat byte-identity must hold for both 2 and 3 sheets.

### Pitfall 11: Nose stations stored from the tail
A nose cut stored as a distance from the tail moves off the nose when TEMPLATE's length changes (and a Rolled Belly Entry that started at the tip no longer does). Store each section from its nearest tip (D-07), fin-anchored ones from the fins.

### Pitfall 12: 3D's first draw in WebKit and the suite
Unchanged from Phase 16 (≈5 s first frame on iphone); a cut adds ~10–40 ms to the build (`q-mesh.ts`: 49–105 ms per surface).

## Code Examples

### The column map (scratch, `SCR/seam.ts` → proposed inside `boardSectionsWith`)
```typescript
// half: [y (from the section's inside edge), h (above the planed bottom)], deck run first (indices 0..DECK_LAST),
// then the rail run to the bottom edge, then the bottom run back to the inside edge (finished-rail.ts:635-637).
const DECK_LAST = SECTION_POINTS.deck - 1;              // SECTION_POINTS = { deck: 48, rail: 32, bottom: 24 } (finished-rail.ts:630)
function bottomedHalf(half: HalfSectionPoints, foamOffAt: (y: number) => number, floor: number): HalfSectionPoints {
  return half.map(([y, h], k) => {
    if (k <= DECK_LAST) return [y, h];                   // the deck never moves
    const top = deckHeightAt(half, y);                   // interpolate the deck run at y
    if (!(top > 0)) return [y, h];                       // a tip edge: nothing to cut, never 0/0
    const f = Math.min(foamOffAt(y), Math.max(0, top - floor));
    return [y, h + f * (1 - Math.min(1, h / top))];      // bottom (h = 0) rises by f; the apex stays
  });
}
// in the loop, once a section is final:
//   const half = section.drawn ?? section.blended ?? sampledFinishedRail(section.result, section.domed, section.halfWidth);
//   const drawn = bottomedHalf(half, (y) => input.foamOffAt!(station, y), inchesToMm(FOIL_THICKNESS_RANGE_IN.min));
//   section = { ...section, drawn, area: section.area + (sampledSectionArea(drawn) - sampledSectionArea(half)) };
```
`FOIL_THICKNESS_RANGE_IN = { min: 0.25, max: 5, step: 0.0625 }` [VERIFIED: lib/geometry/foil.ts:55].

### The golden pipeline (scratch, `SCR/q-golden-proto.ts`)
```typescript
const sk = require(".../reference/sketches/021-bottom-maths.js");          // byte-for-byte lines 326–553
const N = 4801;                                                            // stations, full precision
sk.setData({ U: [], boards: boards.map((b) => ({ id: b.id, L: b.L, wide: b.wide, widePointWidth: b.widePointWidth,
  fin: frontFinStation(storePlacement(b)), toeDeg: rawToe(b), litres: b.litres,
  curve: arr(railAt), natural: arr(curveHalfWidthAt), narrow: arr(narrowestOutlineAt), foam: arr(foamHalfWidth), thick: arr(thicknessAt) })) });
sk.use("shortboard"); sk.state.cuts.center = sk.makeCut("center", "Deep Single Concave", sk.B);
golden.push({ board: "shortboard", name: "Deep Single Concave", foamOff: grid.map(([s, y]) => sk.foamOff(s, y)), litresOff: sk.litresOff() });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat bottom implied (litres = finished rail on a flat bottom) | One foam-off number read by every section | this phase | Every litres reader must pass the bottom |
| Seven design screens | Eight | this phase | Specs, tiles, pictures, CLAUDE.md, the skill |
| `HALF_SECTION_POINT_COUNT` fixed per ring | Per-board ring length when the bottom has channels | this phase (recommended) | board-surface.ts generalises `HALF_POINTS` |

**Deprecated/outdated:** the "+0.26 L for six channels" figure (sketch 020 era); the sketch's 241-station arrays as a test basis.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A mid-range phone runs the shade grid 3–6× slower than Node on the Mac | §G | Dragging feels slow; the 60 × 32 fallback while dragging covers it |
| A2 | The founder wants the litres (and DATA's Foam off) to read the finished board, not the sketch's square-slab integral | §B, OQ1 | DATA's first line and VOLUME disagree with the sketch's 3.33 L picture; he may want the slab figure shown as well |
| A3 | Extending the 1/4" floor to every column (not only the stringer) is acceptable | §A, OQ2 | A vee/belly/channels near a tip cut less than set without the founder knowing why |
| A4 | Storing nose stations from the nose (not the tail) is acceptable for D-24's "costly" saved shape | §A, Pitfall 11 | A length change would move nose cuts relative to the tip |
| A5 | 32 bottom points (24 + 8 wall slots) are enough for the files' channel walls | §B | Thin channels' floors coarse in the STL; raise the count |

## Open Questions

1. **DATA's "Foam off" on a board with a long rolled rail.** What we know: the finished-board litres drop is 2.81 L for the Longboard's opening cuts; the sketch printed 3.33 L (a square-railed slab to the outline). On the other four boards the two agree within 0.3%. What's unclear: whether he wants the slab figure (the foam the contour itself removes from the planed blank) shown too. **Recommendation:** keep the UI-SPEC rule (before − now, VOLUME's own figures, so two screens never disagree); tell him at plan approval with the Longboard's two numbers side by side.
2. **The floor at the rails of a thinned tip.** What we know: the stringer floor never bites on any preset; full-depth vees/bellies/channels at a tip lift the bottom past the deck at the rails (342 columns for a Rolled Belly Entry at the Shortboard's nose). **Recommendation:** the seam never leaves less than 1/4" under the deck anywhere (no cut where the rail is already thinner than that); the warning sentence gains a rail form — *"This cut meets the 1/4" floor at the rails near the nose: it is cut shallower there than set."* — his words to correct.
3. **RAILS on a lifted rail (D-22) for a long rolled rail.** What we know: RAILS' rail at `T − lift` and the 3D's column-mapped rail are the same curve (≤ 0.20 mm) on the short-railed boards and differ by up to 24.5 mm on the Longboard's belly. **Recommendation:** RAILS' three anchors read `T − lift` (D-22 as written); on the Longboard show him both pictures at plan approval; check the readout caption `From ROCKER & FOIL` (UI-SPEC open item 3) — suggest `From ROCKER, FOIL & BOTTOM` only when a lift is present.
4. **A fin move that carries a tail cut's Deepest past its Start or End.** **Recommendation:** on read the fin-anchored station wins and the other is pushed (Start = max(Start, Deepest), End = min(End, Deepest)); nothing is written back until the shaper next drags a slider; the slider shows the pushed value.
5. **FINS' Import Template off.** The fins then sit on a generic tail. **Recommendation:** the fin-anchored stations still follow FINS' placement as shown; FINS draws no contour while unticked (its drawing is not this board's tail).
6. **Nose stations stored from the nose.** **Recommendation:** yes (Pitfall 11) — it follows D-07's "taped from the nearest tip" into storage, so a length change keeps every cut at its tip. His yes at plan approval because D-24 is costly to change later.
7. **The diamond's V.** The sketch never cuts it. **Recommendation:** vees and bellies run out the V (rail = the V's edge there), as on every other tail.
8. **The Fish's toe reads 2.0°, not the sketch's 1.9°.** **Recommendation:** print the raw angle once (`Toe-in · 2.0°`); D-10's "2°" stands.
9. **One go-live (D-28).** Unchanged; the maths waves change no live figure while presets are flat (pin proves it).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | scripts, tests | ✓ | 24.19.0 | — |
| tsx (in node_modules) | golden + pin scripts | ✓ | devDependency | — |
| Vitest | unit/relation tests | ✓ | 4.1.11 | — |
| Playwright + browsers | three-device specs | ✓ | 1.63.0; chromium-1243, webkit-2359 | — |
| Development database (Neon) | the saved-board report | ✓ (not reached from this run) | — | Orchestrator runs it via the main checkout's env file |
| Founder's iPhone/iPad/Pixel | device checks at the gate | founder | — | Playwright emulation until the gate |

**Missing dependencies with no fallback:** none. **Missing with fallback:** the dev-database count (orchestrator step).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 (node; `lib/**/*.test.ts`, `components/**/*.test.ts`, vitest.config.ts) + Playwright 1.63.0 (iphone = iPhone 14 WebKit, android = Pixel 7 Chromium, desktop = Desktop Chrome 1280 × 800; playwright.config.ts:92-96) |
| Config file | `vitest.config.ts`, `playwright.config.ts`, `playwright.prod.config.ts` |
| Quick run command | `npx vitest run lib/geometry/bottom.test.ts lib/geometry/bottom-draw.test.ts lib/geometry/phase17-litres-pin.test.ts lib/geometry/volume.test.ts lib/geometry/board-surface.test.ts lib/export` |
| Full suite command | `npm test && npx tsc --noEmit && npm run lint && npm run test:e2e` (+ `npm run test:e2e:prod` and `npm run build` from the main checkout after the screen wave and before the go-live) |
| Estimated runtime | quick ≈ 20 s; full unit ≈ 70 s; full browser 20 min–2 h by machine load |

Executors run Playwright from their worktrees as `PW_PORT=33NN IS_WEBPACK_TEST=1 npx playwright test <specs>` (ports 3301–3320 for this phase; Turbopack cannot resolve `next` in a worktree); `npx next typegen` once in a fresh worktree before `tsc`; the production specs and `npm run build` only from the main checkout.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R1 | eight links, tiles, Back/Next; `Bottom →`; four-over-four upright, one row sideways (floor 92) | unit + e2e | `npx vitest run lib/screen-steps.test.ts lib/geometry/screen-tiles.test.ts`; `npx playwright test e2e/step-nav.spec.ts e2e/phone-screen-tiles.spec.ts e2e/phone-sideways-top-bar.spec.ts e2e/site-nav-width.spec.ts` | ✅ amend |
| R2 | each name's starting cut on each preset, in order; five vees, five different sections | unit (golden) + e2e | `npx vitest run lib/geometry/bottom.test.ts`; `npx playwright test e2e/bottom-screen.spec.ts --project=desktop` | ❌ Wave 0 |
| R3 | `foamOff` = golden; ≥ 0; stacking; the floor; `cutFoamOff` probes | unit | `npx vitest run lib/geometry/bottom.test.ts` | ❌ Wave 0 |
| R4 | controls per cut; Start ≥ Deepest ≥ End kept by the dragged slider; undo one step | unit + e2e | `npx vitest run lib/geometry/bottom.test.ts`; `npx playwright test e2e/bottom-screen.spec.ts e2e/bottom-saving.spec.ts` | ❌ Wave 0 |
| R5 | channels: abut at Width, fit/squeeze, runs, Longest, Stagger clamp | unit (golden) | `npx vitest run lib/geometry/bottom.test.ts -t channels` | ❌ Wave 0 |
| R6 | shade per 1/32", lines per 1/16", pencil lines, fins solid, cutting line drag/tap | unit + e2e | `npx vitest run lib/geometry/bottom-draw.test.ts`; `npx playwright test e2e/bottom-screen.spec.ts` | ❌ Wave 0 |
| R7 | section, gauges ≥ 1/16" only, ruler from 548/625 dots, ghost = the bottomed ring | unit + e2e | `npx vitest run lib/geometry/bottom-draw.test.ts`; `npx playwright test e2e/bottom-screen.spec.ts --project=desktop` | ❌ Wave 0 |
| R8 | DATA first line adds up (before − now = Foam off; now = VOLUME's); rows every 6"; stringer left = T − foamOff(s,0) | unit + e2e | `npx vitest run lib/geometry/bottom.test.ts -t DATA` | ❌ Wave 0 |
| R9 | 19 cards, words = 17-GUIDE-WORDS.md, tags, 3/2/1 across, scroll inside | unit + e2e | `npx vitest run components/bottom/guide-words.test.ts`; `npx playwright test e2e/bottom-guide.spec.ts` | ❌ Wave 0 |
| R10 | Narrowest = real rail behind the inner corner; Natural = curve; selector only on a winged board | unit + e2e | `npx vitest run lib/geometry/wings.test.ts lib/geometry/bottom.test.ts -t wing` | ✅ amend + ❌ |
| R11 | flat pin 102/102 bit-identical; litres = seam integral; mesh (−0.15%, 0] with cuts, watertight with channels; slices carry the cut; RAILS flat unchanged / vee lowered; FINS contour; fin move carries stations | unit + e2e | `npx vitest run lib/geometry/phase17-litres-pin.test.ts lib/geometry/volume.test.ts lib/geometry/board-surface.test.ts lib/export lib/geometry/design.test.ts`; `npx playwright test e2e/fins-contour.spec.ts` | ❌ Wave 0 (pin first) |
| R12 | absent → flat, no key written; exact round trip; board file; crafted values forgiven | unit + e2e | `npx vitest run lib/models/design-snapshot.test.ts lib/models/board-file.test.ts lib/models/bottom-report.test.ts`; `npx playwright test e2e/bottom-saving.spec.ts` | ✅ amend + ❌ |
| R13 | marks in mm, dims in cm; 36" = `91.4 cm`; Depth slider 0–12 mm | unit + e2e | `npx vitest run lib/geometry/bottom.test.ts -t units` | ❌ Wave 0 |
| R14 | the page only with a cut; 2- and 3-sheet flat byte-identity; Overview lines; nothing on the Full Sized Template/Paper Saver | unit + e2e | `npx vitest run lib/geometry/bottom-print.test.ts components/template`; `npx playwright test e2e/summary-bottom-page.spec.ts e2e/summary-planing.spec.ts` | ❌ Wave 0 |
| R15 | pictures; one gate | manual | founder look per plan; 16-13-style gate | — |
| C4 | locked board: pickers greyed, view controls live; signed out identical | e2e + unit | `npx playwright test e2e/board-lock-screens.spec.ts`; `npx vitest run components/design/board-lock-scope.test.ts` | ✅ amend |
| C5/C8 | no new package; no schema diff | gate | `git diff --stat main -- package.json package-lock.json drizzle lib/db/schema.ts` empty | — |

### Sampling Rate
- **Per task commit:** the quick command plus the task's named spec on `--project=desktop` (and the phone projects for layout tasks).
- **Per wave merge:** `npm test`, `npx tsc --noEmit`, `npm run lint`, the full `npm run test:e2e` on the merged branch; after the nav wave every seven-count spec moves in the same plan; desktop pictures re-recorded from the main checkout after a looked-at diff (six of them).
- **Phase gate:** full suite, `npm run build` and `npm run test:e2e:prod` green on the phase tip before `/gsd-verify-work`; the `--bottom-report` on development (orchestrator) and production (founder).

### Wave 0 Gaps
- [ ] `scripts/extract-phase17-litres-pin.ts` + `lib/geometry/__fixtures__/phase17-litres-pin.json` + `lib/geometry/phase17-litres-pin.test.ts` — FIRST, before `volume.ts` changes.
- [ ] `reference/sketches/021-bottom-maths.js` + `scripts/extract-sketch021-bottom-golden.mjs` + `lib/geometry/__fixtures__/bottom-golden.json` + `lib/geometry/bottom.test.ts`.
- [ ] `lib/geometry/bottom-draw.test.ts`, `lib/geometry/bottom-print.test.ts`, `lib/models/bottom-report.test.ts`, `components/bottom/guide-words.test.ts`.
- [ ] e2e: `bottom-screen`, `phone-bottom`, `bottom-guide`, `bottom-saving`, `fins-contour`, `summary-bottom-page` specs; `e2e/helpers/screens.ts` eight.
- [x] Framework install: none needed.

## Security Domain

### Applicable ASVS Categories (Level 1)
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | works signed out (C4) |
| V3 Session Management | no | — |
| V4 Access Control | no | the save path's existing ownership check (`app/design/actions.ts` re-parses every save) |
| V5 Input Validation | yes | zod in `parseSnapshot`: enums for names/counts/runs/longest/wingRule; finite, bounded numbers; `.catch` per part so a crafted value reads flat, never rejects or crashes the rack |
| V6 Cryptography | no | — |
| V12 Files | yes (board files) | the existing board-file reader (size caps, `parseSnapshot`) — no new file type |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A saved/imported `bottom` with NaN, 1e9 or negative depths/stations | Tampering / DoS | bounded zod schema with `.catch` defaults; `resolveBottom` clamps stations to [0, L] |
| A crafted channel count or huge array that makes the drawing loop explode | DoS | count is an enum {0,4,6,8}; no arrays in the field; fixed grid sizes |
| A board that makes the surface fold (inverted columns) | Integrity | the per-column floor; `meshCheck` relation test |
| GUIDE/print text injection via the board name | Tampering | React text nodes; the PDF writer's existing text path |

## Sources

### Primary (HIGH confidence)
- The sketch's own code, executed: `.planning/sketches/021-bottom-guide/sketch-source.tar.gz` → template.html (SHA-1 53cbf011…), lines 326–553; sketch 020's archive, lines 319–542.
- The app's code read this session: `lib/geometry/volume.ts` (:463-558, :657-672, :960-1455), `board-surface.ts` (:1-520), `design.ts` (all), `wings.ts` (:370-569), `fins.ts` (:75-199, :1579-1600), `finished-rail.ts` (:628-866), `rail-bands.ts` (:170-240, :511-602, :730-996), `outline.ts` (:160-232), `units.ts` (:185-230), `measure-display.ts` (:55-345), `blank-reasons.ts` (:275-330), `lib/models/design-snapshot.ts` (:1-735), `board-file.ts`, `rack-models.ts`, `components/design/design-store.tsx` (selected ranges), `components/site-nav.tsx`, `components/design/screen-tiles.tsx`, `lib/geometry/screen-tiles.ts`, `lib/screen-steps.ts`, `e2e/helpers/screens.ts`, `components/fins/fin-viewer.tsx`, `components/summary/order-form.tsx`, `components/template/build-overview-pdf.ts`.
- Scratch measurements in `SCR/` (listed above), every figure in this file.

### Secondary (MEDIUM confidence)
- `.planning/phases/16-3d-board-and-cnc-export/16-RESEARCH.md`, `16-VALIDATION.md`, `16-13-SUMMARY.md` (the saved-board count).

### Tertiary (LOW confidence)
- Phone frame-rate scaling from Node timings (A1).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nothing new; versions read from node_modules.
- Architecture (the seam, the pin, the mesh): HIGH — run end to end on 102 + 20 boards.
- RAILS reading: MEDIUM — two readings measured; the Longboard needs the founder.
- Pitfalls: HIGH — each found by a run.

**Research date:** 2026-11-08
**Valid until:** 2026-12-08 (stable code; re-check if `volume.ts` or `board-surface.ts` change before planning ends)

## Edge Coverage (for the SPEC)

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| A cut running past its own section | R3 | resolved | Stations are free along the board; `foamOff` sums wherever cuts overlap (sketch D-05) |
| Overlapping cuts (a single into a double; a spiral vee; channels into a single) | R3, R5 | resolved | Plain sum of non-negative terms; a double is 0 inside Off Stringer, so the stringer stays the ridge; channels add +0.3784 L whatever the sections are |
| Start ≥ Deepest ≥ End | R4 | resolved | `keepStationsInOrder` (the dragged slider wins, others pushed, one undo step); 1,680 starting cuts on 105 boards all in order |
| An end (or start) on a tip | R3 | resolved | Full depth to the tip (`fadeAt`), as the founder saw; the floor clamps where the foam is thin |
| A concave narrower than 3" | R3 | resolved | Depth × min(1, half-width / 3") (`PINCH`) — why the stringer floor never bites |
| The Teardrop's closing | R4 | resolved | √((s − End)/(Deepest − End)) of the half-width behind Deepest; the tick box on all three nose singles, ticked by the Teardrop's numbers (D-32) |
| The floor at a thinned tip (stringer) | R3, D-09 | resolved | `foamOff ≤ T(s) − 1/4"`; flags per cut; never met by any preset at its starting numbers or at 1/2" |
| The floor at a thinned tip (rails) | R3, R11 | unresolved | Open Question 2 — recommended per-column floor in the seam; his words for the rail warning |
| A channel set that won't fit inside the rail | R5 | resolved | `channelFit`: width squeezed to leave 1/2" at the deepest station, label says so (muted) |
| With the rail's run-out | R5 | resolved | Gaps close with the reference; outer channels run out through the rail (`channelEdges` keeps only walls > 1/2" off the stringer) |
| A stagger too long | R5 | resolved | `chStart` stops 1" ahead of Deepest |
| Toe-in on a single fin | R5 | resolved | toe 0 → behaves as Parallel; option reads `Toe-in (no toe)` |
| Toe-in angle display | R5, R13 | resolved | raw angle, one `toFixed(1)`: Shortboard 3.2°, Fish 2.0° (not the sketch's 1.9°) |
| A winged board, Narrowest | R10 | resolved | Real rail behind the inner corner (0.000" measured), curve − depth ahead |
| A winged board, Natural | R10 | resolved | `curveHalfWidthAt`; a cut can run through the step; selector absent on a wingless board |
| Two wings | R10 | resolved | Narrowest sums both wings' depth × fade |
| A board with no blank (hand-set rocker) | R3, R11 | resolved | `thicknessAt` is the foil's; the seam is indifferent |
| A board whose fins move (FINS) | R11, D-03 | resolved | Tail Deepest and channel Start/Deepest stored from the front fins; resolved on read |
| Fins move a tail cut's Deepest past Start or End | R4, R11 | unresolved | Open Question 4 — recommended: Deepest wins on read, nothing rewritten |
| FINS Import Template off | R11 | unresolved | Open Question 5 — recommended: stations follow FINS as placed; no contour drawn on FINS |
| A locked board | C4 | resolved | Pickers/sliders greyed; tabs, Height, Section at, the drag, the finished-rail tick live; store guard |
| Signed out | C4 | resolved | Identical; the open-board copy carries `bottom` |
| Metric | R13 | resolved | Formatters run: marks mm, dims cm, 36" = `91.4 cm`; Depth slider max 12 under a 13 mm label for a stored 1/2" |
| A saved board from before this phase | R12 | resolved | No key → flat; nothing rewritten; version 5 |
| A crafted or out-of-range `bottom` | R12 | resolved | Per-part `.catch`, enums, bounds; never rejects the board |
| A board file / Import my designs | R12 | resolved | Through `parseSnapshot` already |
| A board opened on `main` after a save here | R12 | resolved | Unknown key dropped → opens flat (rule 6 trade-off, as rules 12/13) |
| Swallow tail | R11 | resolved | Two pieces; `foamOffAt` adds the notch inner; the notch is air; the wall runs from the lifted bottom |
| Diamond tail | R11 | unresolved | Open Question 7 — recommended: cut the V (`railAt = max(sampleOutline, foamHalfWidth)`) |
| The 3D surface and STL with channels | R11 | resolved | Watertight on 20 boards with 8 channels at 1/2"; wall slots recommended for vertical walls |
| Mesh volume vs litres with cuts | R11 | resolved | −0.025% to −0.086% on 20 boards; Phase 16's (−0.15%, 0] kept |
| The litres pin (flat) | R11, acc 3 | resolved | 102/102 bit-identical with the map run; new `phase17-litres-pin.json` before `volume.ts` changes |
| The Longboard's litres vs the sketch | R8, R11 | unresolved | Open Question 1 — finished board 2.81 L vs slab 3.33 L |
| RAILS on a vee/belly | R11, D-22 | unresolved | Open Question 3 — RAILS-only `T − lift` at the anchors; Longboard differs from 3D by up to 24.5 mm |
| Order form with the Rail Band Instructions sheet ticked | R14 | resolved | Sheet count 2 + cut + instructions; BOTTOM CONTOURS third; both flat cases byte-identical |
| Nose stations when TEMPLATE's length changes | R12 | unresolved | Open Question 6 — recommended: stored from the nose |
| A short screen / sideways phone | D-27 | resolved | UI-SPEC: `growOnShortScreen`, 360-dot floor, the column scrolls |

## Prohibitions (for the SPEC)

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|-----------------------|
| No reader may compute foam off itself; every reader calls `lib/geometry/bottom.ts` | R11, D-05 | resolved | Code review; a source-grep test that no component or `lib/export` file names `cutOff`/`sec(`/`rise(` maths |
| `volume.ts` must NOT import outlines, wings, fins or `bottom.ts`; it takes one optional sampler | R11 | resolved | Import-graph test; the sampler is built in `design.ts` |
| A flat bottom must NOT change any litres figure, any preset card, any RAILS figure or any CNC file | R11, acc 3 | resolved | `phase17-litres-pin.test.ts` (102 boards, toPrecision(17)); `computeRailBands` deep-equal; the export pin |
| `summarizeDesign`'s centre thickness and VOLUME's estimator rows must NOT read the rail lift | R11 | resolved | design.test.ts relation on a vee board |
| No column of any section may be inverted (bottom above deck) | R11 | resolved | Per-column floor; relation test with every cut at 1/2" + 8 channels |
| The presets must NOT open with a contour | R14, D-04 | resolved | `presetDesignFields` carries no bottom; `bottomHasCut` false on every preset |
| `DESIGN_SNAPSHOT_VERSION` must NOT change; `parseSnapshot` must NOT add a `bottom` key to a board without one | R12, D-24 | resolved | design-snapshot.test.ts: absent → no key; re-save key-for-key |
| No database change (`lib/db/schema.ts`, `drizzle/`) | R12, C8 | resolved | `git diff --stat main -- drizzle lib/db/schema.ts` empty |
| No new package | C5 | resolved | `git diff main -- package.json package-lock.json` empty |
| No `25.4` (or bare `10` mm/cm conversion) outside `units.ts`; the sketch's `IN` must not be ported | Rule 2 | resolved | The existing grep test over `lib/`/`components/` |
| No contour on the Full Sized Template or the Paper Saver; no card gauge | R14, D-26 | resolved | Their builders never import `bottom`; source test |
| `three` must NOT be imported outside `components/3d/board-scene.ts` (the bottom reaches 3D through the surface only) | C5 | resolved | Phase 16's source-grep test |
| GUIDE cards must NOT be buttons or put a cut on the board | R9, deferred | resolved | e2e: no role=button in the GUIDE list |
| No fourth layout switch; no JS width test for layout (only a drawing's own box size) | C3 | resolved | Code review; UI-SPEC's two own-box questions only |
| The reference copy must NOT be edited, and the app must NOT import it | Rule 1 | resolved | Its header; an import-graph test |
| No hand-typed expected litres or foam-off figure in any test (0.54 / 0.75 / 0.31 / 3.33 / 0.26 L) | Rule 1, C1 | resolved | Fixtures generated by executing the sketch; review |
| Nothing pushed, deployed or migrated without the founder's go; never his checkout or port 3005 | C8, D-28 | resolved | The 16-13-style gate plan (`autonomous: false`) |
