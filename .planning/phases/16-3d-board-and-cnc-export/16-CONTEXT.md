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
- **D-30:** **The hard edge's blend has a start AND an end, both the shaper's choice, on RAILS and on the 3D panel as one value.** The founder at the Wave 2 look, 2026-11-04: "The hard edge blend needs a blend sharp edge from AND a blend to. Currently the blend is happening over too short a distance but that should be the user's choice." and "I'd like that control on both the rails and the 3-D pages and they feed each other. Changing one changes the other." Two rows on the tail's Advanced menu while Hard Edge is on, above Reset: **Hard Edge Blends From** (12"–30" in 1/2", never below the 12" mark so RAILS' tail plot at its own station stays a full hard edge; 18" unless moved) and **Hard Edge Ends At** (at least 2" past the start, out to the board's centre station; 30" unless moved) — "the Ends At should be where the rail has fully blended into the centre's tuck(s)" (D-27's tuck source, unchanged). Both stored on the tail rail spec as optional forgiving fields (`tailHardEdgeBlendsFrom`, `tailHardEdgeEndsAt`; version stays 5; a crossed or out-of-range pair resolves to a valid one), both reset with Reset Advanced Settings in one undo, Metric in 1 cm steps. The 3D panel shows the same two sliders bound to the same design-store value (a later plan: 16-06/16-07's panel), dimmed with a reason while the tail's Hard Edge is off. The weight is 1 to Blends From, smoothstep to 0 at Ends At; the litres, the preset figures (regenerated), the VOLUME reference picture and the saved-boards report follow. Amends D-20 and D-27 (the fixed 12" start, the 14"–24" range and the 18" default) and UI-SPEC §17 (one row becomes two; the 3D panel gains both). Carried out in plan 16-02 (the RAILS half and the maths) before LITRES_TIP; 16-03's surface, accepted as drawn at the same look, follows through `boardSections`. — **Reversibility:** costly — a second stored field and the litres of every hard-edged board move once more.

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
