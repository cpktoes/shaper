# Phase 16: 3D Board and CNC Export - Context

**Gathered:** 2026-11-03
**Status:** Ready for planning

<domain>
## Phase Boundary

The board the shaper designed, drawn as a solid, realistic surface they can spin and move in every direction
under shaping-room lighting, on a seventh design screen called **3D**; and that surface taken away as files a
CNC shaping program (Shape3D, AkuShaper) reads as a 3D guide. The surface is built from the same cross-sections
the litres count — the finished rail at every station along the rocker, the foam actually there — so what the
shaper sees, what they export and what VOLUME counts are one and the same board.

The founder's words (2026-11-03): *"Lets start a new phase on a branch for 3D board rendering and how we might
export our board to a 3D board CNC like Akushaper or Shape3D. Perhaps using some form of XYZ cloud, and maybe a
new tab/page titled 3D? … I think the right idea is to create a .dxf file from a surface or wireframe model. I'd
like the board to look realistic in its rendering, and I would like to be able to move the board on the screen
and spin it in all directions. Ideally, It'll need shaping room lighting for seeing contours etc. And we'll want
to be able to export the data file. Maybe one day we can even import .brd and .s3d files (save that for later)."*

**Not in this phase:** bottom contours (concave, vee, channels — the app's bottom is flat across every
cross-section and stays so); reading Shape3D's or AkuShaper's own files (.s3d/.s3dx, .brd) into the app; any
database change.

</domain>

<decisions>
## Implementation Decisions

### Where the 3D screen lives
- **D-01:** **3D is the last screen, after SUMMARY** — TEMPLATE · ROCKER · RAILS · VOLUME · FINS · SUMMARY · 3D.
  The founder chose this over the recommended place between FINS and SUMMARY. Back and Next follow the same
  order: SUMMARY's Next goes to 3D, and 3D is the end of the chain (its Back goes to SUMMARY). Every place that
  assumes six screens — the desktop nav row, the phone's ☰ sheet, the Back/Next chain, the browser specs that
  count them — grows to seven. — **Reversibility:** reversible — a nav order and a tile count.
- **D-02:** **The screen is called 3D** everywhere: the nav link, the phone tile, the page title, the tab band.
- **D-03:** **The phone's ☰ sheet holds seven tiles: four by two upright (4 + 3), one row of seven sideways** —
  the same width-alone rule that puts six tiles three by two upright and in one row on a short screen today
  (`components/design/screen-tiles.tsx`); the tiles get a little narrower in the row, and nothing else on the
  sheet moves. (Rejected: the 3D tile alone on its own row; no 3D on a phone.)
- **D-04:** **The side panel holds the view controls and the export** — the switches (Fins, Blank, Contour
  stripes), the preset views (Deck, Bottom, Side, Nose, Tail), Reset view, and Export for CNC… with its one-line
  note (D-15). The drawing's own corner toolbar keeps the zoom and full-screen buttons the other screens have;
  there is no Rotate button, because the whole screen is for turning the board. On a phone the panel sits below
  the drawing in the stacked shell like every other screen, under the same width, pointer and short-screen rules.

### What the board shows
- **D-05:** **The surface is the litres' own cross-sections, lofted along the rocker** — at every station the
  finished-rail section `lib/geometry/volume.ts` builds for `computeCrossSectionVolume` (deck curve, the
  blended rail, the bottom and the tuck, the sharp bottom tuck where asked), placed on the side profile's own
  rocker and thickness (`lib/geometry/board-profile.ts`), with the foam actually there at the tail
  (`foamHalfWidth` / `tailCutStation` in `lib/geometry/outline.ts`: a swallow's notch is air, a diamond's V is
  foam; quick 261103-gcm). The 3D board, the STL file and the litres are one surface read three ways; a check
  that the mesh's enclosed volume agrees with VOLUME's litres is the natural test of it (Rule 1: a relation, not
  a typed number). A swallow's tail is TWO pieces at every station inside the notch — each from the notch's
  square wall to the rail, the air between them — exactly as the rack's turn builds it (quick 261103-drw) and
  never as "less foam from the stringer out" (the founder caught a mock-up drawing it that way as a diamond,
  2026-11-03). — **Reversibility:** reversible — a pure builder in `lib/geometry/`.
- **D-06:** **Fins are drawn: simple fin shapes standing at their FINS placement** — the fin system the shaper
  picked (single, twin, thruster, 2+1, quad), each fin at its distance off the tail and in from the rail with
  its toe-in from `lib/geometry/fins.ts`, a plain fin outline sized from the base length — never any maker's
  exact foil. A **Fins** switch hides them. (Rejected: boxes only; no fins.)
- **D-07:** **A stringer line runs down the centre** of the deck and the bottom and round the nose and tail —
  a thin dark line, the way a shaper's eye reads rocker and foil against the stringer. (Rejected: the 12"
  station marks as well; plain foam.)
- **D-08:** **The picked blank is drawn as a see-through ghost around the board, as a switch, off by default**
  — the blank's own prepared bottom, thickness and width curves (the ones ROCKER draws), glassy, so the shaper
  sees the foam that comes off. Only offered when a blank is picked on ROCKER; a hand-set board has no ghost.
  (Rejected: on by default; no blank.)
- **D-09:** **The flat bottom is drawn as designed and nothing on screen says so** — the same rule as every
  earlier phase (14 D-19, 15 D-15: nothing announced). The deferred bottom-contours todo carries the rest.

### Look, lighting and moving it
- **D-10:** **The lights are fixed in the room and the board turns under them** — low side lights along both
  rails and a soft overhead, like a blank held under the shaping bay's lights, so highlights and shadows move
  across the board as it turns, which is how a shaper reads contours. (Rejected: lights that follow the view; a
  switch between the two.)
- **D-11:** **The surface is raw shaped foam** — white, slightly matte, the stringer showing; not a glassed,
  polished board. (Rejected: glassed; a foam/glassed switch.)
- **D-12:** **Contour stripes as a switch, off by default** — the zebra-stripe check CAD and car-body people
  use: bands of light across the surface that bend where the shape bends, so a bump or a flat spot shows at
  once. (Rejected: station lines; lighting alone.)
- **D-13:** **Drag to spin, wheel or pinch to zoom, right-drag or two fingers to slide, preset views and Reset view.** Drag to spin in every direction; wheel or pinch to zoom; right-drag or two fingers to slide the
  board across the screen; preset views Deck, Bottom, Side, Nose and Tail; Reset view. On a touch screen the
  drawing's zoom buttons stay beside the pinch. No auto-turn when idle. Reduced motion: no glide after a drag,
  as the Board Rack does. (Rejected: spin and zoom only; a slow auto-turn.)

### The export
- **D-14:** **One download, three forms of the same board in a zip** — a **DXF** wireframe (the outline, the
  stringer profile along the deck and the bottom, and the slices, as 3D lines — what Shape3D's guide import
  reads); the **XYZ text set** (the same curves as plain text files: one for the outline, one for the profile,
  one per slice — the structure the founder found); and an **STL** of the very surface the screen draws (which
  Shape3D also takes as a scan, and AkuShaper's top plan exports). Nothing to choose; the shaper gets all three.
  — **Reversibility:** costly — once shapers have fitted boards to these files in Shape3D, the files' layout,
  axes and units are a published contract; changing them later means two generations of files in the wild.
- **D-15:** **Export for CNC… sits on the 3D screen's panel with one line under it:** *"Shape3D and AkuShaper
  read this as a guide and fit their own curves to it."* *(Planning note 2026-11-03: the sentence now names Shape3D only — D-23.)* — Shape3D's own page says the fit "is not guaranteed"
  and hand clean-up is often needed, and the shaper should hear that from us first. It works signed out, as every
  tool does (sign-in is a nudge, never a gate). (Rejected: on SUMMARY beside the print buttons; both places.)
- **D-16:** **The files hold the bare board only** — the shaped foam, whatever the screen's Fins and Blank
  switches say. A CNC cuts the blank; fins are boxed or glassed on later.

### Ruled after the discussion, from the mock-up (2026-11-03)
- **D-20:** **A tail's hard edge ends where the shaper sets it — a Hard Edge Ends At slider on the tail's Advanced menu on RAILS.** (Title Case on screen, the founder's ruling at the UI contract.)
  The founder's finding on the first 3D mock-up: "the bottom view shows a hard edge in
  the tail that should fade into the center tuck just in front of the fins (~16-20" from tail)". Today the maths
  switches the hard edge on or off at one point, halfway between the 12" station and the centre (volume.ts's
  `nearestAnchorSection`), a step the RAILS screen never shows and the 3D board would. The rule: the edge runs
  full from the tail to the 12" station, then blends smoothly into the tucked rail — each station's section the
  blend of the hard-edged and the tucked section, the weight easing from 1 at 12" to 0 at the set distance —
  and is gone from there on. The slider: 14" to 24" in 1/2" steps (Metric: centimetres to one decimal, through
  `units.ts` like a Thinning Start), **default 18"**, shown only while the tail's Hard Edge is on, under the
  tail's existing Advanced rows in the same slider idiom. Stored with the board as one optional field on the
  tail's rail spec; absent reads 18"; the saved-board version stays 5 with the reader's tolerance (Phase 14
  D-24, the wings' rule); no database change. **The litres take the same rule** (D-05: one surface), so VOLUME
  moves a little on hard-edged tails, the preset figures that carry a hard edge are regenerated by their script,
  and the saved-boards report before go-live (14 D-18) shows the move per board. Rejected: a fixed 18" with no
  control (the founder wants it his); ending just ahead of the fins (the rail maths would start reading fin
  placement, which it never has, in the spirit of Phase 4's "rails read no rocker"). — **Reversibility:**
  costly — a stored field on every hard-edged board from then on, and the litres of saved boards move once.

- **D-21:** **The 3D fins are generic and basic, one outline per role, with a true base.** The founder, 2026-11-03,
  during the planning research: "Also research fins that would be used in the 3D. Let's keep things as generic and
  basic as possible (single fin centered in the 10 in box, appropriate twin style, thruster, and quad setup with
  slightly smaller rear quads). Fin bases should be true and just scale the base, don't shrink the whole fin. All fins
  should be super basic and generic." So: a single fin centred in the 10" box at FINS' placement; a keel-style twin for
  the twin setup; the thruster's three alike; the quad's fronts like the thruster's sides and its rears with a slightly
  smaller base. Each fin's base is exactly FINS' base length for that fin, and a smaller fin is made by scaling its base
  only — depth and outline character stay; never the whole fin shrunk uniformly. No maker's foil or named template. The
  research (question M) proposes the generic outline, depth, rake and thickness per role; this supersedes the UI contract's
  "depth 1.0 × base, rake 0.25 × base" discretion call. — **Reversibility:** reversible — pure outlines in `lib/geometry/`.
- **D-22:** **A single fin's depth is the board's length in feet, read as inches.** The founder, 2026-11-03: "For single
  fins, let's use a fin size that equal the length of the board in feet, in inches (i.e. a 9ft board = 9" fin, an 7'6"
  board = 7.5" fin)". Depth is the fin's height from base to tip, the way single fins are sold; computed from the stored
  millimetre length through `units.ts`; the base stays true to FINS' base length for the single fin (D-21). The other
  setups keep the generic depth per role the research proposes. — **Reversibility:** reversible — one pure rule.

### Rulings from planning research (2026-11-03)
- **D-23:** **The export note names Shape3D only.** "Shape3D reads this as a guide and fits its own curves to it." — the founder's ruling on research question K1: nothing AkuShaper publishes says it reads DXF, STL or point text (its own page lists imports of Shape3D's `.s3dx` and DSD `.srf` only), so the note promises what is known; AkuShaper returns to it once an import is proven in its trial. Amends D-15's sentence everywhere it is written.
- **D-24:** **The slices are the litres' own stations.** About 50 per board, every station `crossSectionStations` counts with the tail cut's corner among them; a swallow's slice inside the notch is two pieces (one file holds both, separated by a blank line). Shape3D fits to as many as it is given; a shaper thins them there. (K2; rejected: Shape3D's eleven default guideline stations.) — **Reversibility:** costly — files in the wild.
- **D-25:** **The fins' figures, generic by design.** One outline per role, parametrised by its base alone (the research's M: base along the bottom, a convex leading cubic to the tip, a gently concave trailing cubic, a filleted tip; changing the base moves only the leading edge). Single: depth = the board's length in feet read as inches (D-22), **base 0.70 × depth, centred in the 10.5" box** (K4: a 9'0" board draws 9" deep on a 6.3" base, trailing edge at off-tail + (10.5" − base)/2); the 2+1's centre takes the same rule. Twin: 5.0" deep, upright tip 0.75" behind the trailing edge, keel tip above it; **the base is always FINS' value, a default keel's 4.5" included** (K5: the founder accepts it; raise the base on FINS and the 3D follows). Thruster: three alike, 4.5" deep. Quad: fronts 4.5", rears 4.25" deep, bases true to FINS. Upright, square to the bottom, no cant, root sunk ~1 mm; 1/4" thick for side fins, 3/8" for a single, edges rounded. Never in the files (D-16).
- **D-26:** **The files' forms.** A binary STL of the very triangles the screen draws (K3: binary unless his CNC shop asks for ASCII); an R12 ASCII DXF (`AC1009`, `$INSUNITS` 4 for millimetres, 3D polylines with flags 8/9 and vertices flagged 32, one layer per curve family); the text set as plain `x y z` millimetres, one point per line, in Shape3D's axes — X along the board toward the nose with the tail at x = 0, Y across, Z up toward the deck; one store-only zip with no dependency; one fineness for screen and files, 12.7 mm stations at 48/32/24 points round a section. Each writer has its own reader for the tests.
- **D-27:** **The hard edge fades as an area blend for the litres and a point blend for the surface, and the fade zone takes the centre's tuck settings.** Weight 1 to the 12" station, smoothstep down to 0 at the set distance, 0 beyond; each station's section is the blend of the hard-edged and the tucked section (areas for VOLUME, points for the mesh — they agree within 0.083% on the presets). In the fade zone the tucked section reads the CENTRE's `singleTuck` / `sharpBottomTuck` (the founder's own words, "fade into the center tuck"; RAILS hides the tail's while Hard Edge is on — research pitfall 8). The field is `RailBandSpec.tailHardEdgeEndsAt?: Mm`, optional and forgiving, version 5; the litres move on the presets (cards: Shortboard 29.61 → 29.59, Fish 34.65 → 34.64, Mid-length 49.41 → 49.38; Longboard none), the fixture is regenerated by its script and `volume.test.ts:504` is rewritten for the fade. Rejected: shrinking the tuck marks to zero (a rounded edge right after 12").
- **D-28:** **three.js alone, our own controller.** `three` pinned to 0.186.1 (`@types/three` 0.186.0 as a dev dependency), loaded only through `import()` from the 3D screen's client component; the model turns and the camera never moves, zoom and slide through `camera.setViewOffset`; no React Three Fiber or drei (their controls move the camera, against D-13, and cost about 120 KB more). Measured: 131 KB gzipped on the 3D route only; every other route untouched. All three Playwright projects draw WebGL with no launch flags; a sixth desktop reference picture may include the canvas; WebKit's canvas is never pinned.
- **D-29:** **The plans are approved and the phase ships in two go-lives.** The founder, 2026-11-04, at plan approval: the fade and the Hard Edge Ends At slider go live first on their own with their saved-boards report (16-04, after 16-02's merge records LITRES_TIP), and the 3D screen with the export follows as an additive second push (16-13, after main's first merge is brought back onto the branch). — **Reversibility:** reversible — a shipping order.
- **D-30:** **The hard edge's blend has a start AND an end, both the shaper's choice, on RAILS and on the 3D panel as one value.** The founder at the Wave 2 look, 2026-11-04: "The hard edge blend needs a blend sharp edge from AND a blend to. Currently the blend is happening over too short a distance but that should be the user's choice." and "I'd like that control on both the rails and the 3-D pages and they feed each other. Changing one changes the other." Two rows on the tail's Advanced menu while Hard Edge is on, above Reset: **Hard Edge Blends From** (12"–30" in 1/2", never below the 12" mark so RAILS' tail plot at its own station stays a full hard edge; 18" unless moved) and **Hard Edge Ends At** (at least 2" past the start, out to the board's centre station; unless moved it scales with the board's length — the founder's second ruling, 2026-11-04: "Default start = 18\". Default end at = L/3 − 18. Two independent values.", with L/3 − 18 being "inches short of the centre", so the default end from the tail is L/6 + 18 inches, rounded to the slider's 1/2": 30" on a 6'0", 29 1/2" on a 5'8", 30 1/2" on a 6'2", 32 1/2" on a 7'2", 36" on a 9'0"; the start's 18" default and the end's rule are independent of each other) — "the Ends At should be where the rail has fully blended into the centre's tuck(s)" (D-27's tuck source, unchanged). Both stored on the tail rail spec as optional forgiving fields (`tailHardEdgeBlendsFrom`, `tailHardEdgeEndsAt`; version stays 5; a crossed or out-of-range pair resolves to a valid one), both reset with Reset Advanced Settings in one undo, Metric in 1 cm steps. The 3D panel shows the same two sliders bound to the same design-store value (a later plan: 16-06/16-07's panel), dimmed with a reason while the tail's Hard Edge is off. The weight is 1 to Blends From, smoothstep to 0 at Ends At; the litres, the preset figures (regenerated), the VOLUME reference picture and the saved-boards report follow. Amends D-20 and D-27 (the fixed 12" start, the 14"–24" range and the 18" default) and UI-SPEC §17 (one row becomes two; the 3D panel gains both). Carried out in plan 16-02 (the RAILS half and the maths) before LITRES_TIP; 16-03's surface, accepted as drawn at the same look, follows through `boardSections`. — **Reversibility:** costly — a second stored field and the litres of every hard-edged board move once more.
- **D-31:** **One rule inside the fade — the litres count exactly the foam the 3D board draws.** The founder, 2026-11-04, on 16-03's follow-up finding: inside the fade the litres blended the two sections' AREAS (D-27) while the surface blended their POINTS, and a point-blended rail holds a little less foam; at the defaults every test board stayed inside the 0.15% rule (worst −0.146%), but a longboard with Hard Edge on and its fade run to the centre came out 0.21–0.30% under VOLUME (about 0.22 L on 74 L). Chosen: (a) the litres read the point-blended section's own area, computed from the very ring the surface draws, so VOLUME, the 3D board and the STL agree exactly; the point blend becomes one shared function both read. Rejected: (b) keeping both blends and widening the rule to 0.3% for long fades. The hard-edged litres move a hair once more before they ship (the preset figures regenerated, LITRES_TIP moves to 16-03's merge, go-live 1's gate re-runs). Amends D-27's area blend; D-05's promise ("one surface with the litres") now holds to the mesh's own fineness. — **Reversibility:** costly — the litres figure every hard-edged board quotes.
  *Implementation ruling (the orchestrator, 2026-11-04, on 16-03's measurement):* the drawn ring is a polygon of 48 + 32 + 24 straight segments sitting a hair inside the true curve, so counting it strictly would step the litres by up to 6.8e-4 of a station's area at each fade end (the stations outside the fade count exact curves). D-31 is carried out as the **level variant**: a fading station counts the drawn ring's area plus the two end sections' own polygon shortfalls blended by the weight — exactly today's area at weights 0 and 1 (the pin untouched, the fade continuous by construction), the drawn ring's shape inside. Measured: every hard-edged board's 3D-vs-VOLUME gap in one band, −0.035% to −0.070%, at the defaults and at both long fades.
- **D-32:** **The tail's whole rail character fades between Blends From and Ends At, and the nose's does the same over its own zone — a new plan after go-live 1.** The founder, 2026-11-04, reading the go-live 1 report: "we should also treat 'sharp bottom tuck' like a hard edge at the tail station. The same blend from and to applies, but now to the sharp edge rather than the hard 90deg edge. Also, if the center and/or nose have a sharp bottom tuck, the blend still applies, but maintains the sharper edge rather than a smooth round edge." Settled on one card: (1) what fades is the tail's WHOLE rail character — hard edge, Sharp Bottom Tuck and Single Tuck alike: the tail's rail as set holds full to Blends From and fades (the point blend of D-31) into the centre's rail as set by Ends At, the centre keeping its own sharp edge when its box is ticked, so no discrete difference between tail and centre switches at the old halfway point any more; (2) the NOSE fades too, but with NO sliders — the founder's second word a minute later: "The nose/center fade should be smoothly transitioned and most often will fade from a larger tuck at the center to a smaller tuck at the nose, and ultimately fades to almost nothing at about 2\" from the tip. The rule for center/nose blending should be to make the transition as smooth as possible. We don't need slider controls." — so the centre's rail character blends automatically into the nose's over the whole centre-to-nose span, ending about 2" from the nose tip, by whatever rule the planner measures smoothest (the nose has no hard edge; its character is its tucks); (3) WHEN: after go-live 1, as plan 16-15 in the next wave, shipping with go-live 2 and its own saved-boards report (the litres of sharp- or single-tucked tails move once more then). Orchestrator reading for the planner, flagged for the founder: the CONTINUOUS rail fields (apex thickness, deck marks, domed band) keep today's long blend from the 12" station to the centre; the zone governs the discrete character only. Amends D-27's tuck source (the fading station's target is the centre's rail as set) and extends D-30's rows to always show on the tail. — **Reversibility:** costly — the litres of tucked tails and noses move once more.
  *Plan 16-15's rulings (the founder, 2026-11-04, on the planner's measured questions):* the rail Family (Boxy to Knifey) and Symmetrical fade with the rest — "Yes, everything fades" — so no rail setting switches anywhere on the board (a Family difference alone had been a 0.9–1.1 mm step halfway along every preset's 3D board; the presets' litres move by thousandths, the Longboard card 72.35 → 72.40 L); "Only the tail rail gets the users blend. The nose is a default that always gets applied." — the rows are the tail rail's (`Tail Rail Blends From` / `Tail Rail Ends At`, the 3D group `Tail Rail`), the nose blends by a smoothstep from the centre to the nose 12" mark and the existing tip taper from there (the tuck about half its 12" size at 2" from the tip: "Yes, leave the tip as it is"); a finding older than the phase — the 1/16" rounding of a domed deck's rail thickness along the board — is filed as a to-do (`.planning/todos/pending/2026-11-04-domed-deck-rail-thickness-rounding.md`).

- **D-33:** **A wing is a step in the outline only; the deck stays smooth across it.** The founder, 2026-11-04, from the 3D board of a winged board (`pictures/founder-wing-deck-step.png`): "When a board has a wing, it's doing this funky thing where there's a step in the deck. Wings should be steps in the outline. The Deck should remain smooth across the wings location." Cause (read from the code at the look): every station's finished rail is built in the rail's own frame — the apex, the deck marks and the domed deck band measured in from the rail — and placed at the station's half-width (`placedHalfSection` in board-surface.ts over `boardSections`), so where the outline steps in at a wing the whole rail profile, deck dome included, shifts inward with it and the deck's height at a given distance from the stringer jumps. The rule: the deck and the bottom surfaces are continuous along the board through a wing; only the rail's position (and the outline the CNC files carry) steps. The litres' sections follow the same rule. Planned as its own small plan (16-16) after 16-15 (they share `boardSections` / `board-surface.ts`), before go-live 2; the planner measures the ledge today and the fix on winged boards and brings pictures. — **Reversibility:** costly — the litres of winged boards may move a hair.

- **D-34:** **No little flip at the tips.** The founder, 2026-11-04, from the 3D board: "the very tip of the nose and the tail (both tips on the swallow) have an unnecessary little flip/angle. Let's not do that little flip." The surface must run into each tip — the nose, a tail's tip, a swallow's two points — as a smooth continuation of the deck and the bottom curves, with no facet at an angle to them in the last stations (the likely cause, from the code: the loft closes a tip through a station with no foam placed as one point half the thickness up, and the last ring's finished rail at a tiny width — `placedHalfSection` / `surfaceStations` in board-surface.ts). Folded into plan 16-16 with D-33 (the same surface code), measured by the planner: the slope of the deck and bottom lines over the last 2" against the side profile's own slope, before and after. — **Reversibility:** reversible — a drawing rule; the litres unaffected unless the tip stations' areas change.
  *Plan 16-16's rulings (the founder, 2026-11-04, on the planner's measured questions):* behind a wing only the rail's own bands step in, easing to nothing at Deck Mark 3 (about 2½–3½" in from the rail), the deck inside exactly the board without its wing — "Yes" (measured: the deck ledge today 0.8–1.2 mm an inch in from the rail behind the default 3/16" wing, 3.6–5.3 mm behind a 1" wing; under the rule the rail stays within 0.5 mm of its shape on wings up to 1/2"; winged boards gain 0.01–0.07 L; rings at the wing's own step bring the 3D and CNC outlines within 0.05 mm of TEMPLATE, where today they cut a half-inch chamfer); under the board the flat bottom carries straight through and the tuck steps in with the rail — "Yes"; VOLUME counts the foam the fixed tips add — "Yes" (the Shortboard card 29.61 → 29.62 L, the others unchanged; pin and round tails up to +0.14 L; the tip flip today 16–43° off the side profile, after the fix under 0.02°). Plan 16-16 is wave 11; go-live 2 (16-13) wave 12.

- **D-35:** **The Fins, Blank and Contour Stripes switches become icons in the viewer's corner toolbar, and the fins get real shapes.** The founder, 2026-11-04, at the Wave 8–9 looks: "Move the fins and blank checkboxes to icons in the viewer. We already have a good fin icon. Also, the fins look really dumb. Quad rears should be 25% shorter than the fronts. The shape should be more realistic; do some research to find basic surfboard fin shapes for each of the fin setups." Asked about Contour Stripes: "An icon too" — so the panel's SHOW section goes and the three switches sit in the viewer's corner toolbar beside Wide view and the zoom row (the fin icon is TEMPLATE's fin-placement toolbar button's), as toolbar buttons in the viewers' grammar (own module, 44-dot touch boxes on a coarse pointer, pressed state, spoken names). The fins: the quad's rears 25% shorter (shallower) than its fronts; every role's outline drawn from researched basic fin shapes — a longboard single (a raked pivot/D-fin family), a fish keel and an upright twin, a thruster's sides and centre, a quad's fronts and rears, a 2+1's centre and side bites — each parametrised by FINS' base and the role's depth, with sweep, leading-edge curve and tip shape taken from published templates; a researcher gathers the shapes with sources first (16-17-RESEARCH.md), the planner measures them in a scratch copy. Amends D-21/D-25 (the one plain generic outline; the quad rears at 4.25"); D-16 unchanged (never in the files). Planned as 16-17 after 16-16, before go-live 2 (wave 12 → go-live 2 wave 13). — **Reversibility:** reversible — a drawing and a panel layout.
- **D-36:** **The fin rulings on 16-17: the whole fin stretches to FINS' base, a keel's whole footprint sits on the placement dots, and twins get their own default bases.** The founder, 2026-11-04, on 16-17's cards. Taken as recommended: when FINS' base changes the whole fin stretches along the board and its depth stays (amends 16-10's reading of D-21, where only the leading edge moved); the quad's rears are the small upright fin at 0.75 × the fronts' depth; the 2+1's centre is an inch shorter than a single (feet − 1, amends D-25); the single is the classic raked fin, no D-fin; the Upright + Trailer's centre trailer is the small upright fin at 3.375". The keel is a box keel with a cut-away heel, amended in his words: "But keep the actual leading and trailing edge of the fin on the placement dots. The user should specify a larger base keel fin. i.e. a 6\" base = 6\" base fin, and a 4.5\" base = 4.5\" base fin." So FINS' base is the keel's whole footprint along the board, and the root is the template's own fraction of it (the research's reading, FINS' base = the root, is overruled). A new default, his words: "Upright twins should default to 5.5. Keel should default to 6.5." That is FINS' default forward base for a twin, today 4.5" for every setup — the one FINS change in 16-17. Which point of the keel sits on the trailing dot: "The heel, where the cut-away ends"; the body higher up rakes past the dot as every fin's tip does. Older saved keels: "Leave it" — a keel saved at 4.5" stays 4.5" until Reset or a change of twin template, and keeps its "(standard)" label. 16-17's plan: "Approved". — **Reversibility:** reversible — a drawing and two default figures; no saved board's own numbers change.
- **D-37:** **A wing's step is a blend the two sides share, and the rail rolls straight up into the deck.** The founder, 2026-11-05, at 16-16's look, drawing a red line on the wing slice (`pictures/founder-wing-slice-red-line.png`): "Blend the rail up to the deck with the same radius." Then: "It looks like we're trying to blend the tail into the center, but I think what we need to do is blend both into eachother. At the location of the wing, the rail should blend directly into the deck." And: "behind the wing gets thicker to match up with the deck and rail ahead of the wing, and the rail ahead of the wing should be getting thinner to take some of the burden off the rail behind the wing from taking on all the thickness. i.e. they should share the blend." Amends D-33's ease out to Deck Mark 3 (16-16's Q1); the deck staying smooth across the wing stands. His picks from the candidates' pictures, 2026-11-05: the two sides share the step over "3\" each way" (not 4 × the wing's depth, not 8"), half and half at the wing; and on a truly square wing, whose top edge stayed crisp, "Roll the lip too" — a further rule, measured and shown to him before it is built. — **Reversibility:** costly — litres, the 3D board and the CNC files all read this rule.
- **D-38:** **The tail's rail is carried around the tip.** The founder, 2026-11-05, on the tips as pictured (no flip, ending square from the side): "The rail at the tail of the board can be carried around the tip, so there's usually a pretty mild rounding of the deck line for all tail types." Amends D-34 at the tail only; no flip stands everywhere, and the nose was not questioned. VOLUME keeps counting what the 3D board draws (D-31). His pick, 2026-11-05: "Medium: 1/3 over 1\"" — a third of the tip's thickness over the last inch, the roll's own foam counted exactly. This replaces the Shortboard's 29.62 from 16-16's Q3 with whatever the app then reads (about 29.61). — **Reversibility:** costly — as D-37.
- **D-39:** **Rail fades along the board go both ways.** The founder, 2026-11-05: "The same goes for other rail blending. They should blend into each other, not one into the other only. i.e. both directions not just one." Asked where that applies, he chose "Along the board: both rails move" over "Across the rail: deck and rail meet" and "Only the wing changes". The orchestrator told him the fade already moves each point straight between the two rails, half and half at its middle; the rule that changes is open until he has seen the fade's slices and the rail's thickness along the board. Having seen them, 2026-11-05: "Keep them as they are" — measured, both rails already move half and half inside a fade, and the Tail Rail sliders reach a longer fade on any board. 16-15's fade stands unchanged. — **Reversibility:** nothing changed.
- **D-40:** **A sharp tuck rounds cleanly into a round tuck.** The founder, 2026-11-05: "Just also make sure that a sharp tuck can blend into a round tuck nicely. Previously I was seeing that transition as a very small kink (typically center/nose). It's typical to have a sharp tuck at center that smooths/rounds toward the nose." Measured first on 16-16's branch; reopens 16-15's fade for this one transition only (D-39's "Keep them as they are" stands otherwise). A sharp edge stays sharp where both ends are sharp (D-32). — **Reversibility:** costly if the blend's rule changes — as D-37.
- **D-41:** **The rail contour must not read wavy, and no corner radius is added to a wing.** The founder, 2026-11-05, on the as-built pictures: "the short board and fish wings look good. The mId-lengh is all wavy and I do not like it. THe tails all look great. The sharp tuck looks good. And Wings should not get a corner radius. There's already a corner radius to turn the sharp wing into a bump (outline shape) and this discussion now should be soley to blend the rail contour so that it does not become wavy or have a weird step along the deck or rail itself." So the tails (D-38), the sharp tuck (D-40) and the Shortboard's and Fish's wings stand as built. The orchestrator reads "the fish wings look good" as closing the square-lip question from D-37: no lip rule is built, and the Fish's square step stays as built; he can overrule at the final look. The Mid-length's bands, thought to be the 1/16" rail-thickness rounding (the to-do of 2026-11-04), come forward from after the phase into 16-16, cause to be proven first. — **Reversibility:** costly — the litres and the 3D board of every domed board move.
- **D-42:** **A wire view of the board, a fourth corner icon.** The founder, 2026-11-05, with a Shape3D picture (`pictures/founder-wire-view-shape3d.png`, black lines across and along a white board, end-on and three-quarter): "I also really like this kind of a view. Can we make this a toggle also (maybe the icon can be a # sign)." Goes into 16-17 beside Fins, Blank and Contour Stripes; screen state, not saved (D-17). — **Reversibility:** reversible — a way of drawing.

### Carried forward
- **D-17:** **No database change.** The 3D screen reads the board in the design store; the switches and the
  view are screen state, not saved; the export is built in the browser from that state. (The project's Database
  rule therefore never applies to this phase.)
- **D-18:** **Nothing is announced on screen** (14 D-19, 15 D-15). The new nav link and tile speak for
  themselves.
- **D-19:** **Pictures before every merge, the founder's look between plans, nothing pushed without his go** —
  the cadence of every phase since 14. How many go-lives (one for the whole phase, or the 3D screen first and the
  export second) is the planner's proposal and the founder's call at plan approval.

### Claude's Discretion
- **The drawing library.** Nothing in the app draws with WebGL today, and this phase needs a real 3D renderer.
  Research names it (three.js, through `@react-three/fiber` with `@react-three/drei`'s orbit controls, is the
  leading candidate), measures what it adds to the bundle, and keeps it loaded only on the 3D route. The "no new
  package" constraint of Phases 14 and 15 is lifted for this one by its nature, and only for this.
- **Mesh fineness** — how many stations along the board and how many points round each section, and how the
  normals are smoothed so the foam reads as one surface and not as facets; the planer-cut sharpness the
  finished rail carries must survive (a sharp bottom tuck stays sharp).
- **The files' axes, units and names.** Millimetres, as everything stored is (Rule 2). Research confirms what
  Shape3D expects of a text guide — columns, units, which axis runs down the board, where zero is — before the
  writers are planned, and fixes the names (`<board name>-3d.zip` holding `<name>-outline.txt`,
  `<name>-profile.txt`, `<name>-slice-NN.txt`, `<name>.dxf`, `<name>.stl` is the starting point). The slices'
  stations are the research's call (the 51 the litres use, the 12" stations always among them, is the starting
  point).
- **The fins' shape and cant** — a plain, pleasant fin outline from the base length (depth in proportion), cant
  if FINS carries it, upright otherwise.
- **The blank ghost's look** and the exact light positions, colours and stripe density — from pictures, as the
  rack's figures were.
- **The 3D tile's picture** on the phone's sheet (the board turned three-quarters, in the tiles' own line
  weight, is the starting point).
- **A board the surface can't be built for** (the rack's "can't draw" boards, a board outside the app's length
  range): the screen shows a quiet line and no board, and Export is dimmed.
- **Browser tests for a WebGL screen** — research checks that headless Chromium and WebKit render it in the
  suite (software rendering) and what the specs can assert (the files' contents through the writers' own
  readers; the switches and views through the panel; a picture of the screen for the desktop baseline).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The phase and the project's rules
- `.planning/ROADMAP.md` — Phase 16's entry (opened 2026-11-03 on branch `board-3d`, commit 38341222)
- `CLAUDE.md` — Rule 1 (geometry pure and tested in `lib/geometry/`, no hand-typed expected number), Rule 2 (every
  conversion through `lib/geometry/units.ts`), the Layout section (width picks the layout, pointer the control
  size, height the short-screen rules — the 3D screen obeys all three), the Database section (not needed here)
- `.claude/skills/sketch-findings-shaper/references/board-rack.md` — the rack's turn: how a board is already
  projected in 3D from its stations and silhouette, its timings, and reduced motion

### The makers' import pages (what the export must satisfy)
- https://www.shape3d.com/products/ImportOption.aspx — Shape3D's import/scan option: DXF, STL or text; rotation
  and translation before the fit; "the outline, profile and slices curves will be adjusted to the guidelines";
  "the result of the automatic fitting is not guaranteed"; "hand design to clean up the shape is often needed"
- https://www.akushaper.com/ — AkuShaper's plans: imports Shape3D `.s3dx` and DSD `.srf`; exports OBJ, STL,
  IGES and DXF on the Heavyweight plan; "Import/Export outlines, rails, and rockers" on the Backyarder plan;
  `.brd` is theirs and unpublished (deferred)

### The code the surface is built from
- `lib/geometry/volume.ts` — `computeCrossSectionVolume`, `crossSectionStations` (the 51 stations, the tail
  cut's corner among them), `buildRailProfile` and `stationArea` (the finished-rail half-section per station)
- `lib/geometry/finished-rail.ts` — `sectionFinishedRail` and `FinishedRail` (`samples`, `chain`): the rail's
  finished curve at a station
- `lib/geometry/rail-bands.ts` — the rail marks every section is cut from, nudges and the sharp bottom tuck
- `lib/geometry/board-profile.ts` — `BoardSideProfile`: the rocker and thickness along the board, from the
  blank or hand-set
- `lib/geometry/outline.ts` — `sampleOutline`, `foamHalfWidth`, `tailCutStation`, `outlinePlanArea` (quick
  261103-gcm)
- `lib/geometry/rack-art.ts` — the turned polygon from stations plus silhouette (quick 261103-drw): the closest
  thing to a 3D board in the app today
- `lib/geometry/fins.ts` — fin systems, placement (off-tail, off-rail, toe-in, base length)
- `lib/geometry/design.ts` — `crossSectionFoam`, `summarizeDesign`: the one pipeline every reader of litres uses

### Where the screen plugs in
- `components/design/design-screen-shell.tsx` — the shell every design screen uses (drawing column, controls,
  short-screen scroll)
- `components/design/screen-tiles.tsx`, `components/design/phone-top-bar.tsx`, `components/site-nav.tsx`,
  `components/design/step-nav.tsx` — the six-screen assumptions that become seven
- `components/viewer/toolbar-button.tsx` and the five screens' viewers — the corner toolbar idiom
- `components/setup/board-file-download.ts`, `components/account/your-data-page.tsx`,
  `components/template/build-template-pdf.ts` — the app's download patterns (a Blob and a hidden link inside
  the page's own root; jsPDF for the printed sheets)

### Deferred work this phase must not swallow
- `.planning/todos/` — the todo titled "Build in bottom contours with shading and selectable shapes" (reviewed,
  kept deferred: D-09)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **The per-station finished-rail section** (`volume.ts` → `buildRailProfile`, `finished-rail.ts`): already a
  closed half-outline in millimetres at each of 51 stations, with the foam actually there; mirrored across the
  stringer and stacked along the rocker it is the loft. No new section maths is needed — only a builder that
  arranges existing sections into a surface, and three writers.
- **The side profile** (`board-profile.ts`): rocker and thickness at any station, blank or hand-set, with the
  tips' taper — the spine the sections ride on.
- **The rack's turn** (`rack-art.ts`): a projected 3D board already, proof the stations + silhouette carry
  enough to draw one; its reduced-motion rule and timings carry over.
- **The design store** (`components/design/design-store.tsx`): `effectiveRails`, `sideProfile`,
  `outlineGeometry`, the fins' placement and the blank — everything the screen reads, already memoised.
- **The download idiom** (`board-file-download.ts`): a Blob clicked through a hidden link inside the page's own
  root, synchronously in the tap for Safari; a zip is the one new piece (a small zip writer or JSZip — research).
- **The viewer toolbar** (`toolbar-button.tsx`) and the shell — the 3D screen is a sixth user of the same shell.

### Established Patterns
- Geometry pure in `lib/geometry/` with relation tests, goldens generated by scripts, never a typed number
  (Rule 1); the mesh's enclosed volume against VOLUME's litres is this phase's natural relation test.
- Three independent switches: width → layout, pointer → control size, height → short-screen rules. The 3D
  screen uses the shell and inherits all three; it adds no fourth.
- View state local to a screen (the RAILS Finished Rail and Ghost Bands switches): the 3D switches follow.
- Every number through `units.ts` (Rule 2): the files are millimetres as stored; nothing on the 3D screen quotes
  a number unless through the formatters.
- Browser specs on three devices, the five desktop reference pictures, the practice rack for signed-out tests.

### Integration Points
- A new route `app/design/3d/` beside the five others, in `app/design/layout.tsx`'s shell.
- `site-nav.tsx` (seven links), `screen-tiles.tsx` + `phone-top-bar.tsx` (seven tiles), `step-nav.tsx` (the
  chain ends at 3D), the `e2e` specs that count six screens, the ☰ sheet's phone chrome spec.
- `package.json`: the one new drawing dependency (and a zip writer if one is chosen), loaded only on the 3D route.

</code_context>

<specifics>
## Specific Ideas

- The founder's reading of Shape3D's import: *"Separate your point cloud into distinct text files (.txt or .xyz)
  for the Outline (top-down view of the perimeter), the Profile (side view of the deck and bottom stringer
  lines), and individual Slices (cross-sections from stringer to rail). Alternatively … a 3D .iges or .dxf
  surface/wireframe model, Shape3D can import that directly as a 3D guide."* — the XYZ set and the DXF in D-14
  follow that structure exactly.
- "Shaping room lighting for seeing contours" — low side lights are what a shaper uses to read a blank; D-10
  puts them in the room and turns the board under them.
- "Move the board on the screen and spin it in all directions" — D-13: slide as well as spin, not spin alone.
- The 3D board, the STL and the litres are one surface: a shaper who trusts VOLUME can trust the file.
- **The first mock-up** (`pictures/3d-board-mockup.png`, scripts in `pictures/3d-mockup-source.tar.gz`): the Fish
  lofted from the app's own maths at every half inch, drawn with three.js in headless Chromium (software WebGL
  renders — the suite can test this screen). The founder: *"The foam and lighting look right"* — two tubes at
  rail height along the walls, a soft overhead, the floor's bounce, matte foam, the zebra from a bank of tubes
  overhead. His two catches became D-05's swallow clause and D-20.

</specifics>

<deferred>
## Deferred Ideas

- **Reading Shape3D (.s3d/.s3dx) and AkuShaper (.brd) files into the app** — the founder's own "save that for
  later"; `.brd` is unpublished, `.s3dx` would need study.
- **Bottom contours** (concave, vee, channels) with shading and selectable shapes — its own phase; until then
  the bottom is flat and nothing says so (D-09).
- **A glassed, polished look** as a switch (rejected for now: foam reads contours best).
- **Lights that follow the view** as a switch (rejected for now).
- **Station lines** laid on the foam as a second contour aid (rejected for now).
- **A slow auto-turn when idle** (rejected for now).
- **Fins in the STL** following the screen's switch (rejected: the files hold the bare board).
- **Export on SUMMARY** beside the print buttons (rejected for now: the 3D panel only).
- **IGES or OBJ exports** (not asked for; Shape3D's page names DXF, STL and text).

### Reviewed Todos (not folded)
- "Build in bottom contours with shading and selectable shapes" — out of scope: a new capability with its own
  maths, controls and saved data; the 3D board draws the flat bottom the app has.
- "Show live coordinates under the pointer on the Template and Rocker curves" — unrelated; matched on keywords.
- "Open the blank's own catalog page from the app", "Give every slider in the app a spoken name and a spoken
  value", "Clear the TEMPLATE toolbar off the readings on a sideways phone" — unrelated; matched on keywords.

</deferred>

---

*Phase: 16-3d-board-and-cnc-export*
*Context gathered: 2026-11-03*
