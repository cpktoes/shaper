# Phase 17: BOTTOM — Bottom Contours a Shaper Can Map, Measure and Cut — Specification

**Created:** 2026-11-08, from the founder's rulings on sketches 019, 020 and 021 (2026-11-06 to 2026-11-08) and the
planning session of 2026-11-06 that preceded them. The three sketch READMEs record every ruling in his own words; this
brief gathers them into requirements so the discussion, the screen contract and the plans all work from one page.
**Requirements:** 15 from the founder's words and rulings, plus 8 carried constraints.
**Source:** `.planning/sketches/019-bottom-contours/README.md`, `020-bottom-channels/README.md`,
`021-bottom-guide/README.md` (and `021-bottom-guide/index.html`, the page as it will be built), the `## Bottom`
sections of `.planning/sketches/MANIFEST.md`, the todo
`.planning/todos/pending/2026-11-06-set-the-bottom-contours-starting-numbers-from-the-shop.md` (the research and the
starting numbers per cut) and the original ask,
`.planning/todos/pending/2026-08-23-build-in-bottom-contours-with-shading-and-selectable-shapes.md`.

## Goal

A shaper maps, measures and cuts the bottom of the board they designed. A new design screen, **BOTTOM**, sits between
ROCKER and RAILS — the shop order: after the outline is cut and the blank planed to thickness, before the rails are
banded. Each of three sections, Nose, Center and Tail, takes one of six named cuts (a flat, a belly, a vee, a single or
a double concave under the names a shaper uses), and the tail can take four, six or eight channels cut last. The page
shows the bottom from above with every cut as a shade and a contour line at every 1/16" of depth, a cross-section at a
station the shaper slides along the board with the depths dimensioned the way a gauge would read them, a DATA table of
depths and layout marks every 6", and a GUIDE that teaches each cut with a cartoon drawn from the open board. One number
drives all of it — the foam taken off at a station and a distance from the stringer — so VOLUME's litres, the 3D board,
the CNC files and RAILS all read the same cut.

The founder's words (2026-11-06): *"looking down on the template to mark out the shapes and locations, and a cross
section view that moves up and down the board, showing the blend and depth"*; the panel *"very similar to RAILS"*;
*"as real as possible and be simple to follow dims for shaping it"*.

## Requirements

The founder's words are quoted where there are words; the sentence after each is the requirement as this phase reads
it. The sketch or ruling each one rests on is in brackets.

1. **R1 — A BOTTOM screen of its own, between ROCKER and RAILS.** The eighth design screen: TEMPLATE · ROCKER · BOTTOM
   · RAILS · VOLUME · FINS · SUMMARY · 3D, with its own route, nav link, phone tile (eight tiles: four by two upright,
   one row sideways) and Back/Next place — ROCKER's Next goes to BOTTOM, BOTTOM's Next to RAILS. Every place that counts
   seven screens counts eight. It stays between ROCKER and RAILS because RAILS works from what the bottom leaves, and the
   fins are read, not waited for: the front-fin station and toe are calculated from the outline. [the founder,
   2026-11-06 and 2026-11-08 *"Let's leave as is"*]
2. **R2 — Five cuts behind eighteen names, in three sections.** Nose: Flat Entry, Rolled Belly Entry, Teardrop Nose
   Concave, Blended Nose Concave, Slight Single Concave Entry, Reverse Vee Nose. Center: Flat Center, Deep Single
   Concave, Shallow Single Concave, Early Double Concave, Continuous Belly / Rolled Mid, Tri-Plane Hull Center. Tail:
   Flat Exit, Double Concave Exit, Panel Vee, Spiral Vee, Rolled Vee, Extending Single Concave. Each name is a flat, a
   belly, a vee, a single concave or a double concave with its own starting numbers. Bonzer is left out. [sketch 019]
3. **R3 — Contours only take foam away, cuts stack in shaping order, one number drives everything.** The app's thickness
   is the PLANED number and the contour comes out of it: a concave leaves the rail line on the rocker and lifts the
   stringer, a vee or belly leaves the stringer and lifts the rails, and the page shows what the stringer finishes at.
   A section's cut may run past its section; where cuts overlap they stack (a single into a double leaves the stringer
   as the ridge; a spiral vee is a double cut into a vee; channels cut last into whatever the sections leave). The one
   number is the foam off at (station, distance from the stringer), the sum of the cuts, never below zero. Depth runs 0
   to 1/2" in 1/16" steps. [the planning memory, 2026-11-06; sketch 019]
4. **R4 — The controls per cut, in RAILS' dress.** INPUTS (the imported Length, Width and Thickness, "Thickness is the
   planed number"), then NOSE, CENTER and TAIL cards, each a Cut picker of its six names and, by the cut: Off Rail; Off
   Stringer (the flat left at the stringer on every double, and the Tri-Plane's flat panel); Trough At (doubles); Start,
   Deepest At and End taped from the NEAREST tip (the nose for the Nose section, the tail for Center and Tail), every
   station slider running nose (left) to tail (right); Depth; Smoothness (straight to the edge → rounded out); Vee Lift
   (Spiral Vee); "Closes to a point toward the center" on the three nose single concaves, ticked by the Teardrop's starting
   numbers (*sharpened 2026-11-08 at the screen contract: the sketch shows the box on every nose single*). Start ≥ Deepest ≥
   End along the board is kept. A board opens with every section flat. [sketches 019, 020; *"yes"* to the nearest tip]
5. **R5 — Channels inside the TAIL card, none to start, Parallel the opening run.** *"B: Inside Tail, Channel Default =
   none … Run default is parallel to stringer."* Under the tail's own cut: Channels None / 4 / 6 / 8 (picking a count
   brings that count's starting width — 2 1/2" · 1 3/4" · 1 1/4" — unless the shaper has set one), Channel Width (one
   number at every station), Off Stringer (0: the stringer is the first peak), Start, Deepest At, End, Depth,
   Smoothness (a straight ramp → a scooped one), Run (Parallel to the stringer · With the rail · Toe-in at the front
   fins' angle read from FINS, "no toe" on a single fin), Longest (Inner pair · Outer pair · All the same) and Stagger
   (how much shorter each channel out from the longest pair starts; hidden for All the same). **The shape is the
   founder's:** one sawtooth out from the stringer — the stringer a peak, each channel's floor deepening outward to a
   vertical wall at the rail side, the top of that wall the next channel's peak, no flat ridge between; the walls ruled
   at Width, 2 × Width, 3 × Width; the last wall's distance off the rail read out, not set, and a set that would not fit
   inside the rail squeezed and saying so; no Wall control. Every channel is deepest at the same station and they end
   together; a wall is ruled and cut only from its own channel's start. [sketch 020, the founder 2026-11-06/07]
6. **R6 — The bottom seen from above: the shade with the lines at 1/16".** *"shades and lines are the way to go, but
   lets make the contour lines at 1/16"."* Nose left like ROCKER: the outline and stringer, the wide point and the front
   fins ticked and named on one rail above, the live section's Start · Deepest · End ticked and taped on one rail below,
   each cut as a faint wash darker where deeper with a line at every 1/16" of depth over it, the pencil lines a shaper
   would rule (a concave's edge, a double's flat and trough, a tri-plane's panel, every channel wall — stepping where the
   channels stagger), the fin boxes drawn at their FINS placement, and the section's cutting line as the drawing
   convention's dash-dot with a grab dot: drag it, or tap the board, and the section follows. [sketches 019–021; fin
   note 2 of 2026-11-08]
7. **R7 — The cross-section at that station.** The planed slab with the square rails BOTTOM finds (no bands yet), the
   planed bottom as a dashed straightedge rail to rail, the cut above it, Height ×1 / ×2 / ×4 / ×8 labelled on the
   drawing, a break line when the slab would not fit, and gauge-style dimensions where a shaper would put a gauge: the
   gap under the straightedge at the stringer, the lift at each rail, a double's trough and a channel's floor on their
   own lines, the stringer left; a label only when it would read at least 1/16" (1 mm), never 0". One scale for every
   station, set so the wide point's section spans 95% of its box, the rail-lift value reading under the straightedge
   when there is no room beside the rail. The finished rail from RAILS sits on what the contour left as a ghost, OFF
   until its box is ticked. On a wide screen a ruler laid from the stringer under the straightedge ticks every layout
   mark of the cut being edited (the ruler's fate is an open question below). No readouts in the viewer: *"the space is
   better used for visualization."* [sketches 019–021, rounds 2, 4 and 5]
8. **R8 — DATA.** The first line: foam off, the litres now and before contours, what the stringer finishes at the
   center and the planed figure. Then every 6" from the tail (the honest centimetre conversion in Metric) — width,
   deepest cut, rail lift, stringer left — with the wide point's and the front fins' rows in full ink; and a second
   table, *Layout marks · off the stringer*, one column per mark (the sections' edges, flats and troughs, then every
   channel wall) so the sheet alone lays the bottom out station by station. [sketches 019, 020]
9. **R9 — GUIDE, the third tab.** *"a third tab that is informational and teaches the user VERY briefly (like 1-2
   sentences) and with a cartoon, what each contour type does, is, and looks like."* Nineteen cards — the eighteen names
   grouped Nose / Center / Tail and the channels — each with its name, a cartoon drawn by the VIEWER's own code on the
   board the shaper has open (from above with that one cut's shade and pencil lines and the cutting line, and the
   section across it at its deepest point at ×8 over the straightedge), two sentences (what it is and looks like; what
   it does) and, under a dashed rule, a *How to shape* note in the shop's words. The cuts on the board now are tagged
   *On this board*; switching boards redraws every cartoon. Three cards across on a computer, one on a phone, scrolling
   inside the folder. The sentences and notes are first drafts for the founder's pen (open question below). [sketch
   021; *"The Guide looks awesome. Love everything about it."*]
10. **R10 — The wing rule is a selector.** *"Wings rule should have a selector, narrowest outline by default."* On a
    board with a wing a WINGS row above the three sections — *Measure Off Rail from* — offers **Narrowest outline** (the
    real rail behind the wing and that narrower line carried forward past it, so no cut ever crosses the rail; the
    opening choice) or *Natural outline, before the wing* (the curve drawn before the wing, which sits outside the real
    rail behind it, so a cut can run out through the step), with one line under it saying what each means; nothing on a
    wingless board. One setting for the whole bottom. [sketches 020, 021]
11. **R11 — Everything reads the one number.** VOLUME's litres count the cut (a flat board's litres do not move); the 3D
    board shows the contour and the CNC files (DXF, XYZ slices, STL) carry it; RAILS works from what the bottom leaves —
    the rail's thickness at a station less the rail lift there; FINS shows the contour under the fins on its tail
    drawing; and the fin-driven stations (a tail cut's Deepest At, the channels' Start and Deepest At) are stored as a
    distance from the front fins so a fin move on FINS carries them. [the planning memory; the founder's three fin notes
    of 2026-11-08]
12. **R12 — Saved with the board, no database change.** The bottom is a new optional field of the board's snapshot;
    absent means flat, so every board saved before this phase reopens flat and unchanged, and nothing is rewritten on
    open. Board files (Save board as file… / Open a board file…) carry it the same way. No migration. [the planning
    memory]
13. **R13 — Rule 2 throughout.** Depth, Off Rail, Off Stringer, Trough At, Channel Width, the lifts and the thicknesses
    are marks (whole millimetres in Metric; 1/16" steps in Imperial); Start, Deepest At, End, Stagger, the stations and
    the widths are dims (centimetres to one decimal); litres read the same in both. Every conversion through
    `lib/geometry/units.ts`. [CLAUDE.md Rule 2; sketch 019]
14. **R14 — On paper: a page for the bottom, no full-size contour.** *"an image and some measurements is good enough"*
    (2026-11-06); then, at the screen contract (2026-11-08): *"I think I'd like a more substantial way of portraying how to
    shape contours. I'd like to keep it all on a double sided sheet but for now a new page would be acceptable and I'll
    likely reorganize the sheet later."* No contour is drawn on the Full Sized Template or the Paper Saver and there is no
    card gauge; the order form gains a third page, BOTTOM CONTOURS, printed only when the bottom has a cut — the bottom from
    above with its shade, lines and layout marks, a section at each cut's deepest station, DATA's two tables and the *How
    to shape* notes — and the Overview Sheet one line per cut; the page's dress is the screen contract's (D-29). The
    presets stay flat, so their cards' litres do not move. [the founder, 2026-11-06 and 2026-11-08]
15. **R15 — Shown before it ships.** Pictures before every merge and the founder's look between plans; one go-live gate
    at the end as Phase 16's 16-13 had (the full suite, his device checks, one push on his go, a live check) — a second
    go-live only if he asks for one at plan approval; nothing pushed without his go. [the project's habit]

## Carried constraints

- **C1** Geometry pure and tested in `lib/geometry/` with relation tests and script-generated goldens; never a hand-typed
  expected number (CLAUDE.md Rule 1). The one number — foam off at (station, distance from the stringer) — is one
  function every reader calls; the sketch's own integration figures (the test single's 0.54 L on the Shortboard, six
  channels 0.26 L more) are the first relation checks.
- **C2** Every number through `lib/geometry/units.ts` (Rule 2 as R13 reads it).
- **C3** Width picks the layout, pointer the control size, height the short-screen rules; no fourth switch (CLAUDE.md
  Layout). The phone stack: the drawing pinned above, the NOSE · CENTER · TAIL switch, one section's controls beneath;
  a phone keeps the depths and loses the ruler.
- **C4** Sign-in is a nudge, never a gate: BOTTOM works signed out and on a locked board (controls locked, drawing live).
- **C5** No new package.
- **C6** Browser specs on three devices; the desktop reference pictures re-recorded only where the nav row changes, with
  the diff eyeballed; the practice rack for signed-out tests.
- **C7** Plain English in every word a shaper reads, every commit message and every summary.
- **C8** Nothing pushed, deployed or migrated without the founder's go; work on this phase's branch, never the founder's
  checkout or his dev server on port 3005.

## Out of scope

Bonzer bottoms; a contour printed full size or a card gauge; contour controls on the 3D screen (it shows the cut and
has none); a GUIDE tab on the other pages (todo `2026-11-08-a-guide-tab-on-every-page.md`, sketch 022); GUIDE cards
that put a cut on the board when tapped (the tab is informational, as asked); presets with contours; reading a contour
in from Shape3D or AkuShaper files; a third drawing per vee in the GUIDE (asked as a question in sketch 021, not ruled).

## Acceptance criteria

1. The nav, the phone sheet and Back/Next show eight screens; ROCKER's Next reads `Bottom →` and BOTTOM's `Rails →` (the
   app's `screenWord` writes a screen's word in title case — corrected 2026-11-08 at the screen contract).
2. Every one of the eighteen names opens on its starting numbers on each preset with Start ≥ Deepest ≥ End, draws its
   shade and lines, its section and its DATA rows; the five vees draw five different sections.
3. A board with every section flat and no channels counts the litres it counts today, bit for bit, and every preset
   card's litres is unchanged.
4. For a cut, the litres VOLUME shows, the 3D board's surface, the STL's enclosed volume and DATA's stringer-left column
   all agree with the one foam-off function (relation tests on the four presets and the winged Fish).
5. Channels: 4 / 6 / 8 abut from the stringer at Width each, the last wall's distance off the rail is read out, a set
   that will not fit is squeezed and says so, the three runs rule the walls as sketch 020 describes, and the length order
   steps the fronts on the top view and the ruler.
6. RAILS' rail thickness at a station reads the planed thickness less the rail lift there; FINS' tail drawing shows the
   contour; moving the fins on FINS moves a tail cut's Deepest At and the channels' Start and Deepest At with them.
7. A saved board from before this phase opens flat with nothing rewritten; a board saved with a bottom reopens with every
   number exact; a board file carries it.
8. Metric reads every mark in whole millimetres and every dim in centimetres to one decimal, on screen and in DATA.
9. The phone stack, the sideways phone and the desktop shell each pass their browser specs; the GUIDE scrolls inside the
   folder and the page never scrolls as a whole on a phone.
10. The order form prints its BOTTOM CONTOURS page only when the bottom has a cut, and the Overview Sheet its lines, as
    the screen contract says; a flat board's sheets are byte-identical to today's; the Full Sized Template and the Paper
    Saver draw no contour.
11. The whole unit suite, type check, lint, the named browser specs on three devices and a production build pass.

## Ambiguity Report — what the discussion must settle

Almost everything above is ruled. These are the open points, in the founder's own order of mention:

| # | Open point | Where it stands | Proposed reading (for his yes or correction) |
|---|---|---|---|
| A1 | The GUIDE's sentences and *How to shape* notes | First drafts from shaping lore in sketch 021's `GUIDE` and `HOW` tables; his to correct | Build with the drafts; put all nineteen cards' words in front of him as one page he can mark up before planning ends, and fold his edits in as a plan task |
| A2 | The ruler of layout marks under the section | Draws on a wide screen only (a section box wider than about 625 px), for the cut being edited only; he could not find it (*"I don't see a ruler of the ticks you talk of"*) | Keep it, computer only, for the live cut — DATA's layout-marks table is the phone's and the printed version |
| A3 | A staggered set: do the ends and the deepest station stagger too? | Only the starts stagger now; one maker (DHD) is known to fade the inner channel before the tail | Starts only, as built; the Stagger label says where the shortest pair starts |
| A4 | The starting numbers per cut and for the channels | The researched set went into the sketch at his word (the starting-numbers todo has the sources); the teardrop's length was his one flag | Carry the sketch's numbers into the geometry fixtures as they stand; he corrects any at plan approval or at the UAT |
| A5 | Fin-relative stations beyond the tail | He ruled a tail cut's Deepest At and the channels' Start and Deepest At follow the front fins | The Center cuts whose starting numbers mention the fins (Deep Single's deepest, Early Double's deepest and end, the hull's end) are stations once set and do not follow the fins |
| A6 | A cut deeper than the foam left near a thinned tip | Not ruled; a 1/2" cut can meet a tip thinned to 1/4" | Drawn as set and flagged in warning ink under the slider and in DATA, as Phase 14 treats a start set too close; the maths never takes the stringer below the 1/4" floor |
| A7 | One go-live or two | Phase 16 had two because its first wave changed live litres; here a flat board's litres do not move | One go-live at the end (R15); his call at plan approval |
