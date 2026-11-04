# Phase 16: 3D Board and CNC Export - Research

**Researched:** 2026-11-03
**Domain:** WebGL rendering in Next 16 / React 19, lofting the litres' cross-sections into a closed mesh, CNC file formats (DXF, STL, XYZ text, zip), one rail-maths change (Hard Edge Ends At), generic fins
**Confidence:** HIGH for the geometry, the bundle, the browsers and the writers (all built and measured in a sandbox); MEDIUM for what Shape3D accepts (its manual read, no Shape3D run); LOW for AkuShaper (nothing published)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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
  read this as a guide and fit their own curves to it."* — Shape3D's own page says the fit "is not guaranteed"
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

### Deferred Ideas (OUT OF SCOPE)
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

### Added by the founder during this research (2026-11-03, via the coordinator) — treat as locked
- **Fins (question M):** *"Also research fins that would be used in the 3D. Let's keep things as generic and basic as possible (single fin centered in the 10 in box, appropriate twin style, thruster, and quad setup with slightly smaller rear quads). Fin bases should be true and just scale the base, don't shrink the whole fin. All fins should be super basic and generic."* This overrides the UI-SPEC §3 discretion call (depth 1.0 × base, rake 0.25 × base).
- **Single-fin size:** *"For single fins, let's use a fin size that equal the length of the board in feet, in inches (i.e. a 9ft board = 9" fin, an 7'6" board = 7.5" fin)"* — read as the fin's **depth**.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (16-SPEC.md) | Research Support |
|----|--------------------------|------------------|
| R1 | A seventh screen, 3D, after SUMMARY; nav, tile, Back/Next; every "six" becomes seven | §I: the code points, every spec that counts six (three the UI-SPEC's §15 missed), `screenWord` |
| R2 | The surface lofted from the litres' finished-rail sections, swallow two pieces, diamond V foam, mesh volume agrees with litres | §F: `boardSections` refactor proven bit-identical on 40 boards; loft closed and watertight on 40 boards; gap measured, tolerance proposed |
| R3 | Raw matte foam, stringer, rail-height lights + overhead fixed in the room | §A renderer (three.js, `MeshStandardMaterial`), §F normals (sharp edges kept by topology, not by angle) |
| R4 | Spin, zoom, slide, preset views, keyboard, no glide under reduced motion | §A: hand-rolled controller (model turns, camera fixed, zoom/slide via `setViewOffset`), why drei's controls don't fit |
| R5 | Fins switch (on) and Blank ghost (off) | §M fins (generic outlines, placement from `FinMark`), §H ghost from `buildBlankTopView` + `BlankSideView` |
| R6 | Contour Stripes switch | §A (a `ShaderMaterial`, the mock's reflection-vector zebra) |
| R7 | One zip: DXF + XYZ text set + STL, bare board, millimetres, named from the board | §D writers, §E zip (dependency-free, 61–102 ms per board in Node), file names through the shared stem |
| R8 | The files are what Shape3D takes | §C: Shape3D's manual — X along the board toward the nose, tail at x = 0, Z up toward the deck; DXF/G-code/text; slices found in Oyz planes; acceptance test for the founder |
| R9 | Hard Edge Ends At, 14"–24", default 18", the litres follow, presets regenerated | §G: field, schema, fade rule (area blend — the marks blend is discontinuous, measured), litres moved per preset, fixture diff, the one unit test that changes |
| R10 | Every word, state, size per the approved contract | §A/B/J: what the browser specs can assert on a WebGL canvas |
| R11 | Nothing stored, nothing announced | No database change found necessary; D-20's field rides the existing jsonb snapshot (§G) |
| R12 | Pictures before every merge | §B/J: the mock's headless-render pattern works in all three projects |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Rule 1:** every formula in `lib/geometry/` (or `lib/export/` for writers), pure — no React, browser API or database import — with unit tests; expected values from the app's own functions or script-generated fixtures, never hand-typed. The surface builder, the view turns, the 1x framing, the fin outline, the hard-edge weight and the file writers are all Rule 1 code.
- **Rule 2:** every conversion of a design value through `lib/geometry/units.ts`; storage metric; the files are millimetres in both systems. The single-fin depth rule ("feet in inches") is a conversion — it goes through `mmToInches`/`inchesToMm`, never `25.4` or `/12` inline outside units.ts (a named helper, e.g. `singleFinDepth(length)`).
- **Layout:** width picks the layout (820 line), pointer the control size (`coarse:`), height the short-screen rules (inline `[@media(max-height:500px)]`). The 3D screen adds no fourth switch.
- **Database:** additive changes migrate production first — not needed: D-20's field lives inside the saved board's jsonb snapshot (no column).
- **Commands:** `npm test`, `npm run lint`, `npm run build` (main checkout only — Turbopack won't resolve `next` in a worktree), `npm run test:e2e`, `npm run test:e2e:phone`, `npm run test:e2e:prod`. The suite's own dev server is port 3100 (`PW_PORT=` overrides).
- **AGENTS.md:** this Next.js has breaking changes; read `node_modules/next/dist/docs/` before writing Next code (done here for lazy loading: `01-app/02-guides/lazy-loading.md`).
- **Plain English** for every word a shaper reads, every commit and summary (CLAUDE.md, C7).
- **GSD workflow:** edits through GSD commands; nothing pushed/deployed without the founder's go (C8, D-19); branch `board-3d`.
- **Stack is prescribed** (`.claude/CLAUDE.md`): Next + TS + Tailwind v4 + shadcn; the renderer is the one new drawing dependency (C5).

## Summary

The phase is very buildable, and most of the risky parts were built in a sandbox during this research rather than guessed. The litres' per-station loop in `computeCrossSectionVolume` lifts cleanly into a shared `boardSections(…)` function — the litres of all 40 test boards (four presets × five tails × hard edge on/off) came out **bit-identical** through it — and a loft of those very sections, cut at the stringer (or at a swallow's notch wall), closes into a **watertight, consistently wound mesh on every one of the 40 boards**, with no zero-area triangles. The mesh always encloses a little less than VOLUME counts (a polyline sits inside the curve it samples): −0.13% to −0.26% at a screen-friendly fineness and at most −0.098% at the finer file fineness. That is the relation test R2 asks for, with a one-sided tolerance.

**three.js alone, pinned at 0.186.1, with a hand-rolled controller** is the recommendation, not React Three Fiber. The contract needs the board to turn under a fixed camera and fixed lights (UI-SPEC §3); drei's OrbitControls and TrackballControls move the camera, so the controller is custom either way, and the scene is tiny. three.js alone adds 131 KB gzipped to the 3D route only (measured in a real Next 16.3.6 Turbopack build: the chunk is referenced by no page and fetched by `import()` from the 3D screen's own client chunk); the R3F path adds about 248 KB and pulls in a reconciler mid-way through a v10 rewrite. All three Playwright projects draw WebGL headless with no new launch arguments (Chromium via SwiftShader, WebKit via the Mac's GPU), and both gave pixel-identical output across fresh launches.

The export is dependency-free: an R12 ASCII DXF of 3D polylines with `$INSUNITS = 4`, a binary STL of the very triangles drawn, plain `x y z` text, and a store-only zip with CRC-32 — about 80 lines each, re-read by their own readers, and `unzip -t` and an independent reader (fflate) both accept the zip. The whole export, including building the surface, takes 61–102 ms per preset in Node at the coarser fineness and 123–187 ms at the recommended finer one (zip 4.7–6.4 MB), so it can still be built synchronously inside the tap as Safari needs. Shape3D's own manual fixes the axes (X toward the nose with the tail at x = 0, Y across, Z up toward the deck) and says it reads DXF, G-code or text and finds slices as points lying in Oyz planes; nothing published says what AkuShaper imports, which is a question for the founder.

Three things the planner must know that the contract does not say: (1) the D-20 fade cannot be done by shrinking the tuck marks — that leaves a rounded bottom edge right after the 12" station, a measured 0.37% step in the section's area; blend the two sections' **areas** for the litres (exact, continuous) and the two sections' **points** for the surface (within 0.083% of each other on the presets). (2) A crease-angle normal rule cannot keep a Sharp Bottom Tuck sharp — its corner turns 7°–35° while ordinary rail points turn up to 60° — so the builder must mark the bottom-edge row and split normals there by a sharpness weight. (3) FINS' "base length" for a single fin is the **box** (10.5"), not the fin, so the single fin needs its own base (proposed: 0.70 × its depth, centred in the box).

**Primary recommendation:** extract `boardSections` first (a no-op for the litres, proven), build `lib/geometry/board-surface.ts` on it with the relation test, then the writers in `lib/export/`, then the screen on three.js 0.186.1 loaded by `import()` from a client component — and ship Hard Edge Ends At with the area-blend rule and the regenerated preset figures in its own commit.

## How every number here was produced

- **Nothing in the repo was edited** except this file. A sandbox copy (`rsync -a` excluding `node_modules`, `.next`, `.git`, `.env*`, `.claude/worktrees`; one stray `client_secret_*.json` the rsync carried was deleted from the copy; `node_modules` symlinked from main) lives at `/private/tmp/claude-501/-Users-kontoes-Code-shaper/83ff3531-9289-46f6-95de-7b57b8eb15bc/scratchpad/research16/sandbox/`. Its `lib/geometry/volume.ts` carries the `boardSections` refactor and, later in the session, the D-20 fade wired as the default.
- Measurement scripts are in `…/research16/m/`: `boards.ts` (the 40-board set), `q-litres-same.ts`, `surface.ts` (the loft), `q-surface.ts`, `q-tips-fade.ts`, `q-fade-area.ts`, `q-crease.ts`, `writers.ts`, `q-export.ts`, `q-fins.ts`. Run as `SB_ROOT=<sandbox> npx --no-install tsx --tsconfig ./tsconfig.json <script> [args]` from the sandbox root (or the repo root for `q-litres-same.ts`/`q-fins.ts`, which take the root as an argument and only read).
- **The 40-board set** (`boards.ts`): each of the four presets as `presetDesignFields` opens it, also re-cut with a swallow (10" end, 2.75" crotch), a diamond (10" end, 3" depth), a pin and a round tail, each with the tail hard edge on and off. (The Fish is already a swallow, so `fish|asis` equals `fish|swallow`; pin and round build the same outline.)
- **Bundle sizes:** a separate scratch package (`…/research16/pkgs/`, `npm install --ignore-scripts` into it, never the repo) bundled with the repo's own esbuild 0.28.2 (`--bundle --minify --format=esm`, React external), sizes by `wc -c`, `gzip -9`, Node's brotli. The route-isolation proof is a minimal Next 16.3.6 app in the same scratch folder, built with `next build` (Turbopack).
- **Browsers:** `…/research16/webgl/probe.cjs`, a `file://` page with a three.js loft, run with the repo's Playwright 1.63.0 and its installed browsers (chromium-1243, webkit-2359); no server, no port.
- **Timings** are Node 24.19 medians on a laptop; treat as order-of-magnitude.
- **Web sources** are cited inline; the Shape3D User Manual V8 and SCAN tutorial were downloaded and text-extracted with pypdf.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Per-station finished sections (shared by litres and surface) | `lib/geometry/volume.ts` (`boardSections`) | — | One function, so the litres and the board can't drift (D-05) |
| Surface loft, normals, enclosed volume, watertight check | `lib/geometry/board-surface.ts` (new, pure) | — | Rule 1; testable without WebGL |
| Hard-edge fade weight and its slider/formatter | `lib/geometry/volume.ts` / `rail-bands.ts`; formatter beside `formatThinningStart` | `components/rails/rail-controls.tsx` renders | Rule 1 + Rule 2 |
| View turns, 1x framing, zoom/slide state | `lib/geometry/view-3d.ts` (new, pure, own tiny quaternion maths) | 3D client component applies them | Rule 1 (UI-SPEC §14); keeps three.js out of `lib/` |
| Fin outlines (generic) | `lib/geometry/fin-outline.ts` (new, pure) | placement from `fins.ts` `FinMark` | Rule 1 |
| Blank ghost sections | `lib/geometry/` (reuse `buildBlankTopView`, `BlankSideView`) | renderer | Rule 1 |
| DXF / STL / XYZ / zip writers and readers | `lib/export/` (new, pure, no DOM) | — | Must not live in the renderer chunk (UI-SPEC §7: export works with no WebGL) |
| Export button, Blob download inside the tap | `components/3d/…` (client) | `components/setup/board-file-download.ts` idiom | Browser-only API |
| WebGL scene, lights, materials, controller, context loss | `components/3d/board-scene.ts` (client chunk, `import()`-loaded) | — | The only code that imports `three` |
| Nav / tiles / Back-Next | `components/site-nav.tsx`, `components/design/screen-tiles.tsx`, `lib/screen-steps.ts`, `lib/geometry/screen-tiles.ts` | e2e helpers | Existing single sources |
| D-20 stored field | `lib/models/design-snapshot.ts` (optional, forgiving) | `design-store.tsx` mutators | The parser is the validation boundary |
| Database | none | none | D-17 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `three` | **0.186.1, pinned exactly** (published 2026-09-24; 0.187.0 of 2026-10-30 is under two weeks old) | WebGLRenderer, PerspectiveCamera, BufferGeometry, MeshStandardMaterial, ShaderMaterial (stripes), DirectionalLight/HemisphereLight/AmbientLight | MIT, ~33M downloads/week, the reference WebGL library; tree-shakes to 131 KB gz for this scene [VERIFIED: npm registry + legitimacy seam; bundle measured] |
| `@types/three` | **0.186.0, devDependency, pinned** (2026-09-11) | Types for `three` | three ships no types; MIT, ~21M/week. Note it pulls dev-only transitive deps (`fflate ~0.8.3`, `meshoptimizer`, `@tweenjs/tween.js`, `@dimforge/rapier3d-compat`, `@types/webxr`, `@types/stats.js`) [VERIFIED: `npm view @types/three@0.186.0 dependencies`] |

### Supporting
None. The zip, DXF, STL and text writers are hand-written (§D, §E) — ~80 lines each, tested by re-reading.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| three.js alone | `@react-three/fiber` 9.8.x + `@react-three/drei` 10.7.9 | +114 KB gz on the 3D route (248 KB vs 134 KB, esbuild); R3F imports the whole `three` namespace; drei's camera controls move the camera, which the contract forbids (§A); R3F is mid-way to v10 (open issues #4026 "v10 alpha.6: remaining release work", #4032). Peer range `react >=19 <19.4` is fine for 19.2.8 |
| own store-only zip | `fflate` 0.8.3 (MIT, already in `node_modules` as a jspdf dependency, not a direct one) | fflate's `zipSync` store mode gives a byte-for-byte same-size file; its deflate cuts the Fish's zip from 2.31 MB to 0.61 MB but adds 142 ms in Node — too slow to sit comfortably inside the tap. Importing a transitive dependency is fragile. Use fflate only in a test, if at all |
| binary STL | ASCII STL | ~5× larger (≈250 vs 50 bytes a triangle); same content |

**Installation (executor, in the main checkout, behind the founder's go on the dependency):**
```bash
npm install --save-exact three@0.186.1
npm install --save-dev --save-exact @types/three@0.186.0
```

## Package Legitimacy Audit

| Package | Registry | Age (pinned version) | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| three | npm | 0.186.1: 40 days | 33.0M/wk | github.com/mrdoob/three.js | [SUS] only for `too-new` on *latest* 0.187.0; pinned 0.186.1 is clear of the 2-week rule; no postinstall | Approved at 0.186.1 |
| @types/three | npm | 0.186.0: 53 days | 21.4M/wk | DefinitelyTyped | [SUS] only for `too-new` on latest 0.187.0 | Approved at 0.186.0 (dev) |
| @react-three/fiber | npm | 9.8.2: 20 days | 9.3M/wk | github.com/pmndrs/react-three-fiber | [SUS] too-new (latest) | Not recommended (see Alternatives) |
| @react-three/drei | npm | 10.7.9: 39 days | 5.9M/wk | github.com/pmndrs/drei | [OK] | Not recommended |
| fflate | npm | 0.8.3: 2026-05-16 | 145.6M/wk | github.com/101arrowz/fflate | [OK]; note old lines 0.4.9–0.7.5 were all re-published on 2026-07-20 (odd; not investigated) | Not needed |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `three` and `@types/three` flagged only because their newest release is under two weeks old; pin the older versions above. The founder approves the one new dependency (C5) — a `checkpoint:human-verify` before the install is appropriate.

## Architecture Patterns

### System Architecture Diagram

```
 design store (board in memory: outline, rails, profile, fins, blank, boardName)
        │
        ▼
 lib/geometry  boardSections(input, stations) ──────────────► computeCrossSectionVolume ──► litres (VOLUME, cards)
        │      (finished rail at each station, hard-edge weight)
        ▼
 lib/geometry  buildBoardSurface(design, fineness) ── throws on a non-finite value / out-of-range board
        │      rings (half-sections cut at stringer / notch wall) → loft → caps → normals (+ sharp rows)
        ├────────────────────────────────┐
        ▼                                ▼
 lib/export  writers (pure)          components/3d (client)
   DXF  STL  XYZ  zip  ◄── same mesh    import("./board-scene")  ── fails ──► "didn't load" message
        │                                │  no WebGL context ──────────────► "can't draw" message (Export still live)
        ▼                                ▼
 Export for CNC… (in the tap)        three.js scene: board mesh + stringer + fins + ghost; lights fixed in room
   Blob → hidden link → click        controller: drag = turn board quaternion; wheel/pinch/right-drag = zoom/slide
   status line (role=status)          via camera.setViewOffset; render only on change
```

### Recommended Project Structure
```
lib/geometry/board-surface.ts      # rings, loft, caps, normals, enclosedVolume, isWatertight
lib/geometry/view-3d.ts            # preset view turns, 1x framing, turn-by-drag, zoom/slide state (no three import)
lib/geometry/fin-outline.ts        # generic fin outline by role, from base length; single-fin depth
lib/export/cnc-files.ts            # exportFiles(design) → [{name, bytes}] (calls board-surface)
lib/export/dxf.ts  stl.ts  xyz.ts  zip.ts   # each with its reader for the tests
components/3d/three-d-screen.tsx   # client: panel, canvas host, messages, status line
components/3d/board-scene.ts       # the ONLY importer of "three"; loaded by import()
app/design/3d/page.tsx             # route, metadata
```

### Pattern 1: one section function, two readers
**What:** move the body of the station loop in `computeCrossSectionVolume` (`lib/geometry/volume.ts:677-751`) into `export function boardSections(input, stations?)` returning `{ station, halfWidth, thickness, result, domed, hardWeight, hardResult?, area, blendArea }[]`; `computeCrossSectionVolume` maps `.area` into Simpson exactly as today.
**Proof:** sandbox `volume.ts` patched this way: 40 of 40 boards' litres bit-identical to the repo's (`q-litres-same.ts`, `toPrecision(17)` compared as strings); `volume.test.ts`, `presets.test.ts`, `design.test.ts` 387/387 pass.
**When:** first commit of the phase, before any surface code.

### Pattern 2: the ring at a station
Per station (sandbox `surface.ts`, `halfSection`):
1. `fr = sectionFinishedRail(result, domed)` (`lib/geometry/finished-rail.ts:545-553`); its `samples` run from the deck end at `x0` (= −(Domed Deck Band + 2"), `railPlotBounds`, `rail-bands.ts:717-724`) round the rail to the bottom end at `x0`; x = 0 at the rail, negative toward the stringer, y up from the bottom.
2. Place it at the outline: absolute x = `outer + sample.x`, where `outer` = `sampleOutline(geo, s)` inside a swallow's notch and `halfWidth` (= `foamHalfWidth`) everywhere else; `inner` = `outer − halfWidth` inside the notch (the notch wall), else 0 (the stringer).
3. If the curve starts outboard of `inner`, extend it flat along the deck at its first y and along the bottom at its last y (exactly the closure `stationArea` assumes, `volume.ts:601-605`); then **clip at x = inner** (insert the crossing points). Do not squeeze ("fit") the curve into a narrow station: tried, it opened 608 edges across the set.
4. Split into deck (start → the outermost point, the apex), rail (apex → first point with y ≤ 1e-9, the bottom edge) and bottom (→ end), and resample each by arc length to fixed counts — so the hard edge's corner and a Sharp Bottom Tuck's corner always land on the **same ring index** (the bottom-edge row).
5. The ring is that half and its mirror; points on the stringer plane are shared by both sides (weld), so the deck is one smooth surface across the stringer.

### Pattern 3: the swallow as two pieces, the tips closed
- Stations inside the notch get a **wall** strip (bottom-edge to deck-edge at x = inner) on each piece; at the crotch station inner = 0 and the two walls meet along one shared vertical edge, so the mesh stays closed with the two pieces joined only there (D-05: never "less foam from the stringer out"). The Fish's tail station 0 has zero width (`foamHalfWidth` at the tail end of a swallow is `max(0, outline − first.halfWidth) = 0`, `outline.ts:210-213`), so each piece comes to an edge.
- A diamond's V: `foamHalfWidth` gives the V's own width, linear to 0 at the tip (`outline.ts:206-209`); ordinary rings, no wall.
- A ring with no foam welds to one point; zero-length triangles are dropped at assembly; both ends get a fan cap. Result on 40 boards: 0 open or non-manifold edges, 0 inconsistently wound edges, 0 zero-area triangles (`q-surface.ts`).
- **Include the litres' own stations in the loft's station list** (`crossSectionStations(length, tailCutStation(geo))`) so every exported slice is literally a ring of the drawn mesh ("a slice file's points lie on the drawn surface", acceptance 5 — exact by construction, testable as vertex identity).

### Pattern 4: normals with sharp rows, not a crease angle
`q-crease.ts` (K = 24 deck points): ordinary points turn up to 32°–60° between neighbours (the tight longboard rail is the worst); a hard edge's corner is 90°; a Sharp Bottom Tuck's corner is 7°–35°. No single crease angle separates them, so `toCreasedNormals` (three's addon) would either facet the rail or round the sharp tuck. Instead: duplicate the bottom-edge row's vertices for the render mesh, give each copy `normalize(mix(smoothNormal, oneSidedNormal, sharpness))` with sharpness = the station's hard weight (1 up to 12", fading with D-20) or 1 where the station's nearest-anchor `sharpBottomTuck` is on. The notch wall's two edges and the end caps are always sharp. The STL uses the welded, un-duplicated mesh (it carries face normals only).

### Pattern 5: three.js only behind `import()`
```tsx
// components/3d/three-d-screen.tsx — "use client"
useEffect(() => {
  let live = true;
  import("./board-scene")                       // the only module importing "three"
    .then((m) => { if (live) setScene(m.mountBoardScene(host.current!, initial)); })
    .catch((err) => { console.error(err); if (live) setState("didnt-load"); });
  return () => { live = false; sceneRef.current?.dispose(); };
}, []);
```
Measured: a Next 16.3.6 Turbopack build of exactly this shape puts three in one chunk (536,721 bytes, 130,864 gzipped) that **no route's HTML references** (`/`, `/other`, `/design/3d` checked); only the 3D route's own client chunk names it. Prefer plain `import()` over `next/dynamic` here: it gives the three canvas states (loading picture, "didn't load", no WebGL) directly, and `next/dynamic`'s `ssr: false` must anyway sit in a client component (`node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`). [VERIFIED: built this session]

### Pattern 6: the controller (D-13) — the model turns, the camera never moves
- **Turn:** keep the board's orientation as a quaternion in `view-3d.ts` (four numbers; no three import in lib). A drag of (dx, dy) dots premultiplies a turn of `π·dx/short` about the screen's up axis and `π·dy/short` about its right axis (`short` = the canvas's shorter side: "dragging the length of the shorter side turns it half a turn"). Glide = the last angular velocity decaying over ~600 ms; none under `useReducedMotion`.
- **Zoom and slide without moving the camera:** `PerspectiveCamera.setViewOffset(fullW, fullH, x, y, fullW/zoom, fullH/zoom)` crops the picture the camera already takes — exactly the 2D viewers' viewBox zoom (1x–10x, zoom toward the pointer, slide follows the pointer exactly, clamp so the board's centre stays in the canvas). Lights are directional, so shading never changes with zoom or slide (UI-SPEC §3). Back to 1x = clear the offset. This keeps one zoom vocabulary with `components/viewer/zoom-math.ts`.
- **Gestures:** Pointer Events with `touch-action: none` on the canvas; one pointer turns, two pointers pinch-zoom about the midpoint and slide; right/middle button or Shift slides; `contextmenu` prevented on the canvas only; `wheel` with `passive: false`, ctrl+wheel = trackpad pinch in Chrome/Firefox, and Safari's `gesturestart/gesturechange` for its trackpad pinch [ASSUMED: Safari GestureEvent behaviour, verify on the founder's Mac]; `dblclick` = Back to 1x.
- **Keyboard:** arrows turn 15°, Shift+arrow slides 1/20 of the canvas, `+`/`=`/`-` zoom, `0` 1x, `Home` reset — `preventDefault` only while the canvas has focus.
- **Views:** each preset view is a target quaternion; animate by slerp over 400 ms with the rack's settle curve, instant under reduced motion; take the shorter arc (negate the target if the dot product is negative).
- **Render on demand:** one `requestAnimationFrame` scheduled per change; no loop at rest.

### Anti-Patterns to Avoid
- **OrbitControls/TrackballControls (three or drei):** they move the camera, so the highlights ride with the board — the opposite of D-10.
- **Re-using one `<canvas>` across mounts:** React 19 StrictMode mounts effects twice in dev; a renderer disposed with `forceContextLoss()` leaves that canvas's context lost. Create the `<canvas>` inside the effect, append it, and remove it in cleanup (each mount its own context). `e2e/prod/` exists precisely because StrictMode hides/creates such differences.
- **Importing `three` anywhere in `lib/` or in the export code:** it would drag 131 KB gz into whichever route imports it and break "export works with no WebGL".
- **A crease-angle normal rule** (Pattern 4).
- **Blending the hard edge by shrinking the tuck marks** (§G).
- **Typing litres or vertex counts into tests** (Rule 1): compare mesh volume to `computeCrossSectionVolume`, slices to mesh vertices.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rasterising, lighting, depth, MSAA | a WebGL renderer | three.js `WebGLRenderer` + `MeshStandardMaterial` | Physically based matte foam, tone mapping, context handling |
| Section shapes | new section maths | `boardSections` → `sectionFinishedRail` | The litres' own curve is the contract (D-05) |
| Outline / foam width / notch | new width code | `foamHalfWidth`, `sampleOutline`, `tailCutStation`, `silhouette()` (`screen-tiles.ts:86`) | Already encodes swallow/diamond rules |
| Fin positions and toe | new placement | `computeFinPlacement(...).marks` (`FinMark`) | Trailing and leading points already carry toe |
| File stem | a second name cleaner | lift `boardFileName`'s cleaning (`board-file.ts:93-107`) into one shared stem function | Two downloads must name a board the same way |
| Download in Safari | anything async | `board-file-download.ts:17-29` idiom | Safari drops downloads started after the tap |

(Hand-rolling the four writers *is* recommended: each format is small, fixed and fully specified, and re-reading proves them.)

## Answers by question

### A. The renderer
- **Recommend three.js 0.186.1 alone.** Versions: three 0.186.1 (2026-09-24), 0.187.0 (2026-10-30, too new); R3F 9.8.2 (2026-10-14), 9.8.1 (2026-09-24), peer `react >=19 <19.4`, `three >=0.156`; drei 10.7.9 (2026-09-25), peer `react ^19`, `@react-three/fiber ^9.0.0`, 22 runtime deps (camera-controls, three-stdlib, troika-three-text, hls.js, detect-gpu, …). All MIT. Repo health: three.js 117k stars, 397 open issues+PRs; R3F 33k, 29; drei 10k, 151 (gh API, 2026-11-04). [VERIFIED: npm registry, gh]
- **Bundle (esbuild, minified, React external):** three-only scene 537,583 B / **133,875 gz** / 110,986 br; R3F scene 929,340 / **248,294 gz** / 206,594 br (of which three 727 KB raw, R3F 165 KB); R3F + drei OrbitControls 946,205 / 253,242 gz; `import * as THREE` 742,871 / 188,884 gz. Next/Turbopack's own three chunk: 536,721 B / 130,864 gz.
- **Route isolation:** confirmed by build (Pattern 5).
- **Controls:** hand-rolled (Pattern 6) — drei offers nothing usable for a model-turning, fixed-camera contract, and its `PresentationControls` (turns a group) clamps polar/azimuth and springs back, which is not "every direction".

### B. Headless WebGL in the suite
`playwright.config.ts:92-99`: `iphone` = `devices["iPhone 14"]` (WebKit), `android` = `devices["Pixel 7"]` (Chromium), `desktop` = `devices["Desktop Chrome"]` at 1280×800 (Chromium). Probe (`webgl/probe.cjs`, `file://`, two fresh launches per config):

| Project | Extra args | WebGL | Renderer | Lit pixels (400×300) | Same picture both launches | Launch+render |
|---|---|---|---|---|---|---|
| desktop | none | WebGL2 | ANGLE (Vulkan / SwiftShader) | 8,993 | yes (hash eb54572) | 1.1 s |
| desktop | `--use-angle=swiftshader-webgl --enable-unsafe-swiftshader --ignore-gpu-blocklist` | WebGL2 | same | 8,993 | yes (same hash) | 0.7 s |
| android | none / same args | WebGL2 | same | 8,993 | yes (same hash) | 0.75 s |
| iphone (WebKit) | none | WebGL2 | "Apple GPU" (the Mac's hardware) | 8,984 | yes (775909d9) | 5.3 s |

- **No launch arguments are needed** in Playwright 1.63's headless shell; adding the mock's SwiftShader flags changes nothing. Do not add them to the config.
- **Desktop picture:** Chromium's software renderer gave identical pixels across fresh processes, so a sixth desktop reference picture can include the canvas **unmasked**, under the config's `maxDiffPixels: 100`. Caveat [ASSUMED]: a Playwright/Chromium upgrade may move canvas pixels; the standing rule (re-record only after eyeballing the diff) covers it. WebKit draws on the real GPU, so never pin a WebKit canvas picture.
- Budget WebKit's slower first draw (≈5 s here) in phone-spec timeouts.

### C. What Shape3D and AkuShaper import
**Shape3D (MEDIUM — its own manual, not run):**
- *Formats:* the product page lists "Import of scanned data" in DXF, STL and text as guidelines; "the outline, profile and slices curves will be adjusted to the guidelines"; "The result of the automatic fitting is not guaranteed"; "Hand design to clean up the shape is often needed" [CITED: https://www.shape3d.com/products/ImportOption.aspx]. The manual's Scan Option: "Choose the importation format "BOARD" and browse to open the file you want to import (DXF, G-Code, or text format)" [CITED: https://www.shape3d.com/Manuals/User_Manual_V8.pdf, p.66].
- *Axes:* "Check that everything is alright (tail at x=0, deck upward ...)"; "the X must be the length direction (towards the nose), the Y must be the width direction, and the Z must be the vertical direction (towards the deck)"; on reload "the data will be repositioned so that the tail is at x = 0" [CITED: User Manual V8 pp.66–68; SCAN Tutorial http://www.shape3d.com/manuals/SCAN_Tutorial.pdf].
- *Slices:* "You can tune the tolerance. It allows the importation of slices even if they are not right in the Oyz plan" — slices are recognised as points lying in planes of constant x; "You can also reduce the number of slices if too many of them have been scanned"; "DO NOT HESITATE TO DELETE THE SLICES THAT DO NOT LOOK NECESSARY; the less slices the smoother"; "Check the box "One side" if the file contains only half of the board" [CITED: manual pp.67–69].
- *Profile:* "Profile detection: "Stringer" … look for the stringer data around the X axis"; or "Profile … the software will look for the lowest and highest points of each slice to create the profile" [CITED: p.67].
- *Piece types:* "The Data Types Outline, Bottom, Deck, Thickness, and Slice … allow importing data to associate guidelines to a particular part of a board"; "the data of the type Slice will be imported to the selected slice" [CITED: pp.71–72].
- *Shape3D's own export* writes "The Outlines, the Profile (bottom+deck, whatever the Design Mode), and the Slices … as Polylines (in .txt, .dxf, .igs, or .vrl)", "If you type an Integer after Slices, the exported file will contain that number of slices distributed over the length", whole board as surface meshes in .dxf/.igs/.vrl [CITED: p.74]. So **one profile file holding deck and bottom matches Shape3D's own export** (D-14 as written).
- *Not published:* the text columns, separator and units; which DXF entities the importer reads. **Conservative choice:** one point per line, `x y z`, single spaces, `.` decimals, 3 decimals, millimetres, CRLF line ends, no header line; DXF as R12 3D POLYLINE/VERTEX (what BoardCAD, an open-source surfboard CAD, writes — it comments that its R14 LWPOLYLINE version was "buggy" [CITED: github.com/hornstein/boardcad-java `boardcad/export/DxfExport.java`]) with `$INSUNITS 4`. [ASSUMED: Shape3D reads millimetres from text when the board's unit is set to mm.]
- **Coordinates for every file:** x = distance from the tail tip toward the nose (0 at the tail tip), y = across (the board is symmetric; +y one rail), z = up toward the deck, z = 0 at the lowest point of the bottom (the side profile's rocker is already levelled to read 0 at its lowest, `board-profile.ts:139-140`). This is exactly Shape3D's stated frame.
- **AkuShaper (LOW):** its plans list "Import/Export outlines, rails, and rockers for duplicating boards" (Backyarder), "Import boards from Shape3d (.s3dx) and DSD (.srf)" (Up & Comer), "Export your 3D designs in OBJ, STL, IGES, and DXF" (Heavyweight) [CITED: https://www.akushaper.com/]. **No published import path for DXF, STL or point text was found**; forum users describe tracing images and typing guide points [CITED: forum.swaylocks.com threads "Aku shaper help needed", "problem with groundlevel in akushaper"]. The note D-15 locks ("Shape3D and AkuShaper read this as a guide…") is therefore unproven for AkuShaper — open question K1.
- **Acceptance test a shaper can run in Shape3D's trial:** (1) Scan import → Data format **BOARD** → load `{stem}.dxf` → the controller shows the tail at x = 0 and the deck up, and the length reads the board's length in millimetres (board unit set to mm) → tick automatic adjustment → OK → compare outline width at 12"/centre/12" with SUMMARY. (2) Same with one slice file into the active slice (Data format **Slice**), the outline file (Data format **Outline**). (3) If (1) mis-detects slices because the outline/profile polylines sit in the same file, retry with only the SLICES layer (the DXF puts each family on its own layer for exactly this). Record what works; the files' layout is then frozen (D-14 "costly").

### D. DXF and STL writers with no dependency
- **DXF (R12 ASCII):** `HEADER` with `$ACADVER`=`AC1009` ("AC1009 = R11 and R12"), `$INSUNITS` group 70 = **4** ("4 = Millimeters"), `$MEASUREMENT` = 1 ("1 = Metric") [CITED: Autodesk DXF reference, help.autodesk.com …GUID-A85E8E67…]; `ENTITIES`: `POLYLINE` with 66=1, 10/20/30 = 0, **70 = 8** (3D polyline) or **9** (closed 3D polyline), then `VERTEX` entries with 10/20/30 and **70 = 32** (3D polyline vertex), then `SEQEND` [CITED: Autodesk POLYLINE reference "8 = This is a 3D polyline"; ezdxf docs `VTX_3D_POLYLINE_VERTEX 32`]. Layers: `OUTLINE` (closed, TEMPLATE's `silhouette()` order with z = rocker + rail apex height), `PROFILE-DECK`, `PROFILE-BOTTOM` (highest and lowest point of each section tail→nose — equals the stringer except inside a swallow's notch, matching Shape3D's "Profile" detection), `SLICES` (one closed polyline per slice; **two** per slice inside a swallow's notch, one per piece).
- **STL (binary):** 80-byte header that must not begin with `solid` (e.g. `Shaper Assistant board {stem} mm`, ASCII only — mask non-ASCII), uint32 LE count, 50 bytes a triangle: normal + 3 vertices as float32 LE, uint16 attribute = 0; "STL files contain no scale information, and the units are arbitrary" [CITED: https://en.wikipedia.org/wiki/STL_(file_format)]. Millimetres; float32 is ample (≈0.0002 mm at 2.7 m).
- **Watertight check:** every undirected edge in exactly two triangles, every directed edge once (consistent winding) — on the indexed mesh in `board-surface.ts`, and again on the STL after welding identical float32 corners (`q-export.ts`: 0 open edges on all five boards tested).
- **Measured (`q-export.ts`, 12.7 mm / 24-16-12; the 48/32/24 sizes are in §E):** Fish: 49 slices (the tail station has no foam), DXF 377,832 B (52 polylines, 5,498 vertices), STL 1,799,984 B (35,998 triangles), outline 8,523 B, profile 6,105 B, a slice ~1.1–2.1 KB; zip 2,312,184 B. Shortboard 2.45 MB, Mid-length 2.68 MB, Longboard 3.14 MB.
- **Design:** `lib/export/{dxf,stl,xyz,zip}.ts`, each `write…` and `read…`, no DOM, no `three`; `lib/export/cnc-files.ts` builds the file list from the design (one call to the surface builder) and returns `{ files, sliceCount }` — the done line's `{n}` comes from here (UI-SPEC: "from the writer, never typed").

### E. The zip
- **Recommend the dependency-free store-only writer** (`writers.ts`: local headers, central directory, end record, CRC-32 table, UTF-8 flag bit 11 for names, a fixed DOS date so the same board zips to the same bytes). Its output for the Fish is the same size as fflate's store mode (2,312,184 B), passes `unzip -t` ("No errors detected"), and fflate's `unzipSync` reads all 53 entries.
- **Timing:** the whole export — surface build, 49–50 slices, DXF, STL, text, zip — median **61–102 ms** in Node at 24/16/12 points (zip 2.31–3.14 MB, `q-export.ts`) and **123–187 ms** at the recommended 48/32/24 (zip 4.68–6.37 MB, 74k–107k STL triangles, 0 open edges, `q-export-fine.ts`), 7 runs after a warm-up. Browser JS on a phone is commonly 2–4× slower [ASSUMED], i.e. roughly 0.25–0.75 s: still synchronous inside the tap, so no "Making the files…" state in the normal case; keep that state only as the contract's fallback, and prove the download on a real iPhone (UI-SPEC open item 3). If a phone proves too slow, export the files at 32/24/16 points rather than going asynchronous.

### F. The surface builder (R2, D-05)
- **Shared sections:** Pattern 1 (bit-identical litres).
- **Ring, pieces, tips, sharpness:** Patterns 2–4.
- **Fineness and the volume relation** (`q-surface.ts`, 40 boards; gap = (mesh − litres)/litres):

| Station step | Points deck/rail/bottom | Max \|gap\| | Mean \|gap\| | Vertices | Triangles | Node build |
|---|---|---|---|---|---|---|
| 25.4 mm | 16/12/8 | 0.544% | 0.391% | — | — | — |
| 25.4 mm | 24/16/12 | 0.291% | 0.208% | — | — | — |
| **12.7 mm** | **24/16/12** | **0.255%** | 0.166% | 13.8k–22.0k | 26.5k–42.3k | 26–60 ms |
| 6.35 mm | 24/16/12 | 0.250% | 0.154% | — | — | — |
| **12.7 mm** | **48/32/24** | **0.098%** | 0.054% | 28.0k–44.5k | 55k–87k | 73–115 ms |
| 6.35 mm | 48/32/24 | 0.092% | 0.041% | — | — | — |

  The gap is dominated by points round the section (a polyline inside a convex curve), not by station spacing, and the mesh is **always smaller** (sign +1 orientation, negative gap on all 40). Recommend **one fineness for screen and files: 12.7 mm stations (plus the litres' own stations, 12" stations, centre, tail cut, fade end) and 48/32/24 points** — about 55k–87k triangles, fine for WebGL. **Relation test:** `−0.15% ≤ gap ≤ 0` per preset and per synthetic tail (measured worst −0.098%).
- **Narrow tips:** a section designed for the station's thickness can be wider than the foam near a tip; cut at the stringer, the deck at the stringer sits below the side profile's thickness **only within 12" of a tip** (worst 5.43 mm at 13 mm from a pin tail; 1.29–1.89 mm near the presets' noses; `q-tips-fade.ts`). So the "Side view equals ROCKER's side" relation test must compare the deck only between the 12" stations, or compare against the mesh's highest point per station — not against `deckAt` at the tips.
- **A board the builder refuses:** throw an `Error` naming the first non-finite value (the rack's WR-05 rule, `rack-art.ts` `assertFinite`), and refuse a length outside `BOARD_LENGTH_RANGE_IN` (the stress set imports it from `lib/geometry/board.ts`). The screen shows the can't-build message; Export is dimmed.
- **Stringer (D-07):** a painted line, not geometry — draw it as a thin strip of the deck/bottom stringer vertices raised 0.2–0.4 mm (or a texture/shader band 3 mm wide, min 1 dot); on a swallow from the crotch forward and down the crotch's face (the rack's rule, `rack-art.ts:270-279`).

### G. Hard Edge Ends At (R9, D-20)
- **Field:** `RailBandSpec.tailHardEdgeEndsAt?: Mm`, beside `tailHardEdge` (`rail-bands.ts:213-218`: "The three rail sections plus the tail-only Hard Edge flag"), rather than on `RailSectionSpec` (which all three sections share). Absent reads `inchesToMm(18)`. (CONTEXT says "on the tail's rail spec"; Hard Edge itself "lives on the whole spec, not the section", `rail-bands.ts:162` — keeping them together is the least surprising reading.)
- **Snapshot:** in `railBandSpecSchema` (`lib/models/design-snapshot.ts`), `tailHardEdgeEndsAt: z.number().optional().catch(undefined)` plus a read-time range check (outside 14"–24" or not finite → treated as absent, nothing rewritten) — the Thinning Start precedent (Phase 14 D-24). Version stays 5. The deployed parser (`z.object` strips unknown keys) tolerates it; a re-save on a rolled-back site drops it (reads 18" again).
- **The fade rule — use the area blend:** weight w = 1 at and behind the 12" station (`foilStationPoints(...)[1].station`), smoothstep down to 0 at the set distance, 0 beyond (the mock's `hardWeight`). Litres station area = (1−w)·A_tucked + w·A_hard, each by the existing exact closed form — continuous at both ends, monotone. The surface blends the two resampled half-sections point by point (index-consistent by Pattern 2); on the presets the pointwise polygon's area is within **0.083%** of the linear area blend at every fade station (0.84% only on a longboard forced to a hard edge), and the loft still closes (`q-fade-area.ts`).
- **Rejected — shrinking the tuck marks to zero ("marks" blend):** it keeps exact sections but leaves the bottom corner rounded right after 12" (the halfway blend reaches half the near-vertical tuck band), a jump in the Fish's section area from 17,627.5 to 17,562.4 mm² between 12.0000" and 12.0001" (−0.37%), `q-tips-fade.ts`.
- **What moves** (`q-tips-fade.ts`, change in litres vs today's switch; today's switch sits halfway between 12" and the centre: Shortboard 24.5", Fish 23", Mid-length 27.5", Longboard 33"):

| Preset (hard edge as opened) | Today | Ends at 14" | 18" (default) | 24" |
|---|---|---|---|---|
| Shortboard (on) | 29.6122 L | −0.0260 | **−0.0219** | −0.0154 |
| Fish (on) | 34.6507 L | −0.0189 | **−0.0156** | −0.0094 |
| Mid-length (on) | 49.4062 L | −0.0324 | **−0.0289** | −0.0226 |
| Longboard (off) | 72.3514 L | 0 | 0 | 0 |

  On the cards (two decimals): 29.61 → 29.59, 34.65 → 34.64, 49.41 → 49.38. `DEFAULT_RAIL_BAND_SPEC.tailHardEdge` is `true` (`rail-bands.ts:235-240`), so the default board's VOLUME figures move and `volume-desktop.png` re-records with the nav row (UI-SPEC §17).
- **Fixture:** in the sandbox, `npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase14-preset-figures.ts --step tips` rewrote three lines of `phase14-preset-figures.json`: shortboard `29.61221883695839` → `29.590285807132283`, fish `34.65070010841522` → `34.63510323368067`, midlength `49.40616246063774` → `49.3772527599468`; thicknesses and rocker unchanged. The full unit suite then ran **6,776 passed, 1 failed, 2 skipped**; the one failure is `volume.test.ts:504` ("Sharp Bottom Tuck ticked on the centre (and on a hard-edge tail) keeps foam only at the stations nearest the centre…"), which asserts tail-nearest stations are untouched by the tail's Sharp Bottom Tuck — no longer true once those stations fade to tucked. Rewrite it for the fade, don't delete it.
- **Hidden-control pitfall:** in the fade zone the tucked section takes the *tail's* discrete tuck fields (`singleTuck`, `sharpBottomTuck`) by today's nearest-anchor rule — fields RAILS hides while Hard Edge is on (`showTucks`, `rail-controls.tsx:223`). The founder's words were "fade into the center tuck". Recommend the tucked side of the fade reads the **centre's** discrete tuck fields (continuous fields stay blended as today) — open question K6.
- **Formatter and slider:** `formatHardEdgeEndsAt(mm, system)` = `formatDim` (beside `formatThinningStart`, `blank-reasons.ts:278-280`); the slider via `measureSlider(value, {min: 14, max: 24}, 0.5, 10, system)` as `thinningStartSlider` does (`blank-reasons.ts:303-315`) — Metric step 10 mm, label to one decimal (`45.7 cm`).
- **Reset:** `resetRailAdvanced("tail")` (`design-store.tsx` ~930) deletes `tailHardEdgeEndsAt` in the same `setState` (one undo step). `toggleTailHardEdge` keeps it (off then on shows the same value). `RAIL_NUDGE_KEYS` and the presets are untouched (no preset stores the field; `preset-source.ts:171` prints `tailHardEdge` — add the new line only if a preset ever sets it).
- **Who else reads the hard edge:** `computeRailSectionOutput("tail", …, spec.tailHardEdge)` (`rail-bands.ts:805`) — RAILS' tail plot and DATA at the 12" station, where w = 1, so unchanged; the snapshot transform (Symmetrical vs Hard Edge); the store's toggles. The rack art, the order form and DATASHEET do not read it (they read litres, which move).

### H. Fins placement, the blank ghost, the loading picture
- **Fins:** see §M (outlines) — each `FinMark` (`fins.ts:177-188`) gives the trailing-edge point (`offTail`, `lateral`) and the leading-edge point (`leadingOffTail`, `leadingLateral`), so the base line carries toe already; `baseLength`; no cant field. Entry: `computeFinPlacement(deriveEffectiveFins(fins, finsImportTemplate, outlineForFins, geometry), importedTail)` exactly as the store does.
- **Blank ghost:** stations and half-widths from `buildBlankTopView(...).blankOutline` (`lib/geometry/blank-top-view.ts`, round tips handled), heights from the profile's `blank.bottomAt(s)` / `blank.deckAt(s)` (`board-profile.ts:106-108`); each section a simple rounded box (superellipse, rail radius ≈ half the blank's thickness) — a loft of those, `transparent`, opacity 0.18, `depthWrite: false`, drawn after the board; the widest outline as a line. Only when `sideProfile.blank` is non-null.
- **Loading picture / tile:** `threeDTileArt(art)` from `turnedBoardPoints(art, 50°)` and `stringerPoints(art, 50°)` (`rack-art.ts:245`, `:272`). Caveat: the rack is an orthographic turn of the stringer/outline silhouette, the rest view a 30° perspective of the finished-rail surface — the outlines match closely, not exactly; don't write an equality test between them.

### I. Nav, tiles, Back/Next, the specs that count six
- Confirmed: `screenWord` lower-cases the rest (`lib/screen-steps.ts:38-40`: `return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();`) → `3d`; `NAV_LINKS` (`components/site-nav.tsx:30-37`) six entries ending `{ href: "/design/summary", label: "SUMMARY" }`; the tile grid `grid grid-cols-3 gap-2 shell:grid-cols-6` (`components/design/screen-tiles.tsx:235`); `TILE_KIND: Record<NavLink["href"], ScreenTileKind>` (`:60-67`) fails to compile until `"/design/3d"` has a kind; `ScreenTileKind = "template" | "rocker" | "rails" | "volume" | "fins" | "summary"` (`lib/geometry/screen-tiles.ts:254`).
- **Corrections / additions to UI-SPEC §15:** the sideways 120-dot floor is at `e2e/phone-screen-tiles.spec.ts:172` (`expect(tile.width).toBeGreaterThan(120)`; `:152` is the test's title, which also says "over 120"). Missed by §15: **`e2e/phone-sideways-top-bar.spec.ts`** (walks `SCREENS`, `toHaveCount(SCREENS.length)`, "one row" at `:175`, titles saying six), **`e2e/phone-screen-tiles.spec.ts:407`** (`expect(heights).toHaveLength(6)`), and the ~20 specs that import `SCREENS` from `e2e/helpers/screens.ts` — adding 3D there makes every route loop visit the WebGL screen (fine headless, §B, but WebKit's ~5 s first draw needs headroom). Unit tests: `lib/screen-steps.test.ts`, `lib/geometry/screen-tiles.test.ts`.
- Desktop pictures: rule at `e2e/desktop-baseline.spec.ts:215-221` ("Re-record only for an intended desktop change, from the main checkout, after inspecting the diff"); the five shots at `:269-297`.
- `data-print-hide` vs `print:hidden`: UI-SPEC's finding stands (not re-measured).

### J. Testing design
- **Unit (vitest, node):** `boardSections` ≡ litres (refactor guard: litres of the 40-board set unchanged — generate a fixture from today's code before the refactor, Phase 14's "pin first"); the surface: watertight + consistent winding + no zero-area triangles; gap within (−0.15%, 0]; slices are mesh vertices; swallow pieces disjoint inside the notch (no triangle spans |y| < inner); diamond tip width 0; refusal of NaN / out-of-range length; the fade weight (1 at 12", 0 at the set distance, smoothstep between; continuity of station area across 12" and across the end); writers round-trip (write → read → same points to 1e-3 mm; STL count/length; zip CRCs; DXF header values and flags); `screenWord("3D") === "3D"`; fin outline relations (base length exact, depth exact, base scaling leaves depth and tip offset unchanged); snapshot: absent/garbage/out-of-range `tailHardEdgeEndsAt` reads 18" without rewriting.
- **Browser (dev server, three projects):** the switches/views/Reset through the panel; the canvas messages (no WebGL via `HTMLCanvasElement.prototype.getContext` stubbed to return null in `page.addInitScript`; can't build via a board out of range or a stubbed throw; didn't load via `page.route` aborting the scene chunk); Export: `const download = await page.waitForEvent("download")` after the click, read `await download.path()`, re-read with `lib/export/zip.ts`'s reader (Playwright transpiles TS imports and the repo's path alias), check names (`{stem}-3d.zip`, `{stem}.dxf`, …) and that the done line's `{n}` equals the slice files counted; locked board and signed out the same; the board actually drawn: a `data-frames` counter on the host set by the scene after each render, plus `canvas` screenshot bytes differing with Fins on vs off.
- **Production build (`e2e/prod/`):** the 3D screen draws once and survives navigation away and back (StrictMode/double-mount and context disposal differ between dev and prod); the three chunk loads only on `/design/3d` (collect network requests on `/design/outline` and assert none contains the scene chunk).
- **Pictures for the founder:** the mock's pattern — a Playwright script (not a spec) screenshotting the running screen per view and theme; headless Chromium is enough for the look; WebKit for a phone check.
- `IS_WEBPACK_TEST=1`: only appears in old baseline comments (`desktop-baseline.spec.ts` history in worktrees) as the dev-server mode those pictures were rendered with; not needed for this phase. Re-record the desktop pictures from the main checkout as the rule says.

### K. Open questions for the founder
See "Open Questions" below (K1–K6).

### L. Edge Coverage and Prohibitions
See the two tables near the end.

### M. Generic fins for the 3D board (the founder's ask, overriding UI-SPEC §3's fin proportions)
**What FINS gives today** (`q-fins.ts`, `computeFinPlacement` with Import Template on, each preset as opened and switched to each setup with `resetAdvanced`; inches, right-hand fin shown):

| Preset (length) | Setup | Fin | Off-tail (trailing) | Lateral | **Base** | Toe |
|---|---|---|---|---|---|---|
| Shortboard 6'2" | thruster (as opened) | side / centre | 11.0 / 3.375 | 5.677 / 0 | **4.5 / 4.5** | 0.25 / 0 |
| Fish 5'8" | twin, upright (as opened) | side | 7.5 | 5.844 | **5.5** | 0.187 |
| Fish | twin keel (reset) | side | 6.25 | 5.562 | **4.5** | 0.125 |
| Mid-length 7'2" | quad + centre (as opened) | front / rear / centre | 12.0 / 6.25 / 3.604 | 6.073 / 4.131 / 0 | **4.5 / 4.0 / 4.5** | 0.25 / 0.187 / 0 |
| Mid-length | single | box | 5.5 (box trailing edge) | 0 | **10.5 (the box)** | 0 |
| Longboard 9'0" | single (as opened) | box | 5.5 → leading 16.0 | 0 | **10.5 (the box)** | 0 |
| any | quad (reset) | front / rear | — | — | **4.5 / 4.5** | — |

- **The single's "base" is the box, not the fin.** `defaultCenterBaseLength` returns `inchesToMm(setup === "single" || setup === "2plus1" ? 10.5 : 4.5)` (`fins.ts:1472-1474`) and FINS' own note reads "Off-tail (box trailing edge) 4.5–6" (default 5.5"), centered, 0° toe/cant. Fin box 10.5" standard (8" boxes also exist); fore/aft is tuned by sliding in the box, not routing." (`fins.ts:1249`). A 9"-deep fin on a 10.5" base is not a plausible single fin. Real generic singles run base ≈ 0.65–0.77 × depth: Futures Gerry 7.75: height 7.80", base 5.40" (0.69) [CITED: futuresfins.com/products/gerry-7-75]; Captain Fin Andy Nieblas: 7.5" height, 5.77" base (0.77) [CITED: cleanlinesurf.com]; a 10" SUP single: base 6.5" (0.65) [CITED: collinsvillecanoe.com SBS Classic 100]. Kanoa sizes a 9.0" fin for 9'4"+ and 10" for 10'0"+ — close to the founder's feet rule [CITED: hawaiiansouthshore.com Kanoa Dahlin]. **Recommend: single depth D = board length in feet, as inches** (`singleFinDepth(length) = inchesToMm(mmToInches(length) / 12)` written in units-friendly form, no inline 25.4); **base = 0.70 × D** (Longboard 9'0": 9.0" deep, 6.3" base; Mid-length 7'2" if switched to single: 7.17" deep, 5.0" base); **the base centred in the box**: box from `offTail` to `offTail + 10.5"` (Longboard 5.5"–16.0"), fin trailing edge at `offTail + (10.5" − base)/2` (Longboard: 7.6", leading edge 13.9"). Open question K4 asks the founder to confirm "base from depth" since FINS has no fin base for a single. 2+1's centre takes the same single rule (its box is the same 10.5"); its side bites take the thruster side outline.
- **Twin (D = 5.0"):** keels run 4.5"–5.5" deep with long bases 6.1"–7.0" (FCS II CI Keel 5.15" deep / 6.41" base; FCS FK-2 4.49" / 7.01"; Ono 5.00" / 6.12") [CITED: retailer spec listings via WebSearch — evo.com, cleanlinesurf.com, surffcs.com.au]. Base from FINS as given (Fish upright 5.5", keel default 4.5" — shorter than any real keel; K5). Character: upright = tip 0.75" behind the trailing edge; keel = tip directly above the trailing edge (low, long, upright trailing edge), so a longer FINS base reads as a keel naturally.
- **Thruster (all three identical, D = 4.5"):** FCS Performer M: base 4.37", depth 4.55", sweep 33.7° [CITED: hawaiiansouthshore.com / easternlines.com Performer listings]. Base from FINS (4.5"); tip 0.75" behind the trailing edge.
- **Quad:** fronts = thruster side (D 4.5"); rears D = **4.25"** (FCS Performer M quad rears 4.09" base / 4.26" depth, 94% of the front's depth [CITED: same listings]) with the **base true to FINS** (Mid-length: 4.0"). FINS' reset gives rears 4.5" = fronts; then the rears differ only by the touch less depth.
- **The founder's rule as geometry:** each role fixes D, the tip's offset behind the trailing edge (R), a tip radius and a thickness; the base B comes from FINS (singles: 0.70 D). Changing B moves only the leading edge; depth, tip, trailing edge and character stay — "scale the base only, never the whole fin".
- **Outline (fin-local, millimetres; u along the base from the leading edge toward the tail, v depth from the base):** base (0,0)→(B,0); leading edge cubic (0,0) → tip T = (B + R, D) with controls (0.05(B+R), 0.40D) and (0.55(B+R), 0.95D) — a convex sweep; trailing edge cubic T → (B,0) with controls (B + 0.8R, 0.6D) and (B + 0.05D, 0.25D) — gently concave, meeting the base near 85°; tip filleted at radius r. Role constants (inches, converted once through `inchesToMm`): single D = feet-rule, R = 0.15D, r = 0.5; twin D 5.0, R upright 0.75 / keel 0, r 0.5; thruster/quad-front D 4.5, R 0.75, r 0.35; quad-rear D 4.25, R 0.75, r 0.35. Thickness: a flat extrusion, 1/4" at the root for side fins, 3/8" for a single, edges rounded (a bevelled `ExtrudeGeometry` is enough). All [ASSUMED] proportions, generic by design, tuned from pictures.
- **Placement and angle:** the base line runs from (`leadingOffTail`, `leadingLateral`) to (`offTail`, `lateral`) (toe included), the leading edge toward the nose; the fin plane contains that line and stands **square to the bottom** there: tilted along the board by the rocker's slope at the fin's centre station, root sunk ~1 mm into the foam so no gap shows; **no cant** (FinMark has none; FINS' single note says "0° toe/cant"). z of the root = the bottom at that station (flat across — the fins sit well inboard of any tuck).
- **Not in the files** (D-16).

## Common Pitfalls

### Pitfall 1: The litres and the board drift apart
**What goes wrong:** the surface re-derives sections its own way and VOLUME and the 3D board disagree. **Avoid:** Pattern 1 first, with a pin of today's litres. **Warning sign:** any section maths in `board-surface.ts`.

### Pitfall 2: A rounded hard edge just after 12"
**What goes wrong:** the fade done by shrinking tuck marks leaves a rounded edge at w → 1 (measured −0.37% step). **Avoid:** area blend for litres, pointwise blend for the surface. **Warning sign:** a station-area jump across 12.0000"/12.0001" in a test.

### Pitfall 3: Sharp edges smoothed (or every rail faceted)
**What goes wrong:** crease-angle normals. **Avoid:** Pattern 4 (topology + sharpness weight).

### Pitfall 4: StrictMode and lost contexts
**What goes wrong:** dev double-mount disposes the renderer, the second mount gets a lost context on the same canvas → blank screen in dev only (or only in prod). **Avoid:** canvas created per mount; `webglcontextlost` → `preventDefault()` and wait for `webglcontextrestored` (rebuild GPU resources, keep the view); a context that doesn't come back shows the no-WebGL message.

### Pitfall 5: `three` leaking into other routes or into the export
**Avoid:** one importer (`board-scene.ts`), loaded by `import()`; a prod spec asserting no scene chunk is requested on another route; writers in `lib/export/` with no `three` import (a source-grep unit test like the rack's `rack-source.test.ts`).

### Pitfall 6: The download lost on iPhone
**What goes wrong:** anything awaited before `link.click()` (including the dynamic scene chunk). **Avoid:** writers in the main route chunk, built synchronously in the click handler (measured 123–187 ms in Node at the recommended fineness).

### Pitfall 7: Tip comparisons that fail for honest reasons
**What goes wrong:** "Side view = ROCKER's side" asserted at the tips, where the cut section sits up to 5.4 mm under `deckAt`. **Avoid:** compare between the 12" stations, or compare `deckAt` with the mesh's highest point and allow the measured tip deficit only within 12" of a tip.

### Pitfall 8: Hidden tail tuck settings acting in the fade zone
See §G and K6.

### Pitfall 9: The single fin drawn 10.5" long
**What goes wrong:** using `FinMark.baseLength` (the box) as the fin's base. **Avoid:** §M's single rule.

### Pitfall 10: Counting six
Three spec sites UI-SPEC §15 missed (§I); `SCREENS` loops now visit the WebGL screen on WebKit.

### Pitfall 11: Slice files for a swallow with one piece
**Avoid:** two loops per notch slice (text: one after the other; DXF: two closed polylines).

### Pitfall 12: Prose that quotes numbers
Every figure above came from a script; tests generate theirs (Rule 1).

## Code Examples

### The shared sections (sandbox, abbreviated)
```ts
// lib/geometry/volume.ts — the loop body of computeCrossSectionVolume, unchanged, behind a name
export function boardSections(input: CrossSectionVolumeInput & { hardEdgeEndsAt?: Mm }, stations?: readonly Mm[]): BoardSection[] { … }
export function computeCrossSectionVolume(input: CrossSectionVolumeInput): CrossSectionVolumeResult {
  const sections = boardSections(input);
  const stationAreas = sections.map((s) => s.area);   // Simpson exactly as today
  …
}
```

### Closed-mesh checks (from sandbox `surface.ts`)
```ts
export function signedVolume(m: Mesh): number { /* Σ a·(b×c)/6 over triangles */ }
export function watertight(m: Mesh) { /* each undirected edge ×2, each directed edge ×1 */ }
```

### The writers' fixed values
DXF header `$ACADVER`/`AC1009`, `$INSUNITS` 70 = 4, `$MEASUREMENT` 70 = 1; POLYLINE 70 = 8 (9 closed), VERTEX 70 = 32; STL header 80 bytes not starting `solid`, uint32 LE count, 50 bytes/triangle; zip signatures 0x04034b50 / 0x02014b50 / 0x06054b50, version 20, flag 0x0800 (UTF-8 names), method 0 (store). Full scratch code: `…/research16/m/writers.ts`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SwiftShader fallback automatic in Chrome; needed flags in later versions | Playwright 1.63's headless shell gives WebGL2 via ANGLE/SwiftShader with no flags (measured) | — | The mock's flags are unnecessary |
| R3F 9 | R3F 10 in alpha | 2026 | Avoid adopting R3F mid-migration |
| three `examples/jsm` | `three/addons/*` export map (both work in 0.186.1) | r15x | Import addons via `three/addons/…` if any are used |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Shape3D reads text/DXF guide coordinates as millimetres when the board's unit is mm | C | Files import at the wrong scale; fix by a unit choice in Shape3D, or change the files (costly after release) |
| A2 | Shape3D's BOARD import from one DXF copes with outline/profile polylines beside the slices | C | Slice detection confused; mitigation: layers, or a slices-only DXF |
| A3 | Text format `x y z`, space, CRLF, no header is accepted | C | Import fails; acceptance test catches it before go-live |
| A4 | Phone JS 2–4× slower than Node → export ≈0.2–0.4 s in the tap | E | If slower, use the contract's "Making the files…" fallback |
| A5 | Safari trackpad pinch arrives as GestureEvents | A | Pinch on the founder's Mac doesn't zoom; wheel still does |
| A6 | A Playwright upgrade may move SwiftShader pixels | B | A canvas re-record; covered by the eyeball rule |
| A7 | Generic fin proportions (D per role, R, r, thickness, single base 0.70 D) | M | Looks off; tuned from pictures |
| A8 | Superellipse sections for the blank ghost read as the blank | H | Ghost looks too boxy/round; tune from pictures |

## Open Questions (RESOLVED)

1. **K1 — AkuShaper.** Nothing published says AkuShaper imports DXF, STL or point text (only .s3dx/.srf boards and images). The locked note says "Shape3D and AkuShaper read this as a guide…". Recommendation: the founder tries the zip in AkuShaper's trial before go-live; if it doesn't read it, the note names Shape3D only (a copy change to D-15).
2. **K2 — Which slices.** Research recommends the litres' own stations (49–50 non-empty slices; "one surface", and Shape3D lets the shaper reduce slices on a BOARD import). The alternative is Shape3D's default guideline stations (3", 6", 12", 18", 24" from each end plus the centre — 11 slices), easier to import one by one into a model's own slices. Founder's call; costly to change later (D-14).
3. **K3 — Binary STL.** Recommended (5× smaller, universal). Ask only if his CNC shop wants ASCII.
4. **K4 — Single fin base.** FINS has no fin base for a single (its 10.5" is the box). Research proposes base = 0.70 × depth, centred in the box (9'0" → 9" deep, 6.3" base). Confirm.
5. **K5 — Keel base.** FINS' keel default base is 4.5" while real keels run 6"–7". With "base true to FINS", a default keel looks like an upright fin. Keep (true to FINS), or change FINS' keel default (a FINS change, out of this phase)?
6. **K6 — "Fade into the center tuck".** In the fade zone, should the tucked rail take the centre's tuck settings (his words; research's recommendation) or the tail's own, which RAILS hides while Hard Edge is on?

### Rulings (the founder, 2026-11-03, written back as 16-CONTEXT.md D-23 to D-28)
| Question | Ruling |
|---|---|
| K1 AkuShaper | The note names Shape3D only (D-23). |
| K2 Slices | The litres' own stations, about 50 per board (D-24). |
| K3 STL | Binary (D-26; Claude's call, the founder was not asked). |
| K4 Single fin base | 0.70 × depth, centred in the 10.5" box (D-25). |
| K5 Keel base | Always FINS' value, the 4.5" default accepted (D-25). |
| K6 Fade zone tuck | The centre's tuck settings (D-27; from the founder's own words "fade into the center tuck"). |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build, tsx, vitest | ✓ | 24.19.0 | — |
| Playwright + browsers | specs, pictures | ✓ | 1.63.0; chromium-1243, chromium_headless_shell-1243, webkit-2359 | — |
| `three` / `@types/three` | renderer | ✗ (not installed) | — | install step (founder-approved dependency) |
| Shape3D trial | R8 acceptance | ✗ (founder's machine) | — | manual acceptance test (§C) |
| AkuShaper trial | K1 | ✗ | — | founder |
| Real iPhone / iPad | glide, pinch, download-in-tap | founder's | — | manual checks (UI-SPEC open items 2–3) |

**Missing dependencies with no fallback:** none blocking planning; R8's proof needs the founder in Shape3D.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 (node) + Playwright 1.63.0 |
| Config file | `vitest.config.ts`, `playwright.config.ts`, `playwright.prod.config.ts` |
| Quick run command | `npx vitest run lib/geometry/board-surface.test.ts lib/export` |
| Full suite command | `npm test && npm run lint && npm run test:e2e` (+ `npm run test:e2e:prod` before a go-live) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R1 | seven links/tiles, `3D →`, `screenWord("3D")` | unit + e2e | `npx vitest run lib/screen-steps.test.ts lib/geometry/screen-tiles.test.ts`; `npx playwright test e2e/step-nav.spec.ts e2e/phone-screen-tiles.spec.ts` | ✅ (amend) |
| R2 | litres unchanged by refactor; mesh closed; gap in (−0.15%, 0]; swallow two pieces; diamond V | unit | `npx vitest run lib/geometry/volume.test.ts lib/geometry/board-surface.test.ts` | ❌ Wave 0 (board-surface) |
| R3/R6 | drawn, stripes switch changes the picture | e2e | `npx playwright test e2e/three-d-screen.spec.ts` | ❌ |
| R4 | views, Reset, keys, reduced motion | unit (view-3d) + e2e | `npx vitest run lib/geometry/view-3d.test.ts` | ❌ |
| R5 | fins outline relations; Blank dimmed without a blank | unit + e2e | `npx vitest run lib/geometry/fin-outline.test.ts` | ❌ |
| R7/R8 | zip contents, names, slice count, round-trip, slices on mesh, STL watertight | unit + e2e (download) | `npx vitest run lib/export`; `npx playwright test e2e/three-d-export.spec.ts` | ❌ |
| R9 | weight rule, continuity, snapshot tolerance, slider visibility, reset | unit + e2e | `npx vitest run lib/geometry/volume.test.ts lib/models/design-snapshot.test.ts`; `npx playwright test e2e/rails-advanced.spec.ts` | ✅ (amend) |
| R10 | canvas messages, loading line, themes | e2e | `npx playwright test e2e/three-d-screen.spec.ts` | ❌ |
| R11 | no schema diff; no announcement text | gate | `git diff --stat main -- drizzle lib/db/schema.ts` empty | — |
| R12 | pictures | manual + script | founder look | — |

### Sampling Rate
- **Per task commit:** the quick command plus the touched spec on `--project=desktop`.
- **Per wave merge:** full unit suite, lint, `npm run test:e2e` on main.
- **Phase gate:** full suite green, `npm run build` from main, `npm run test:e2e:prod`, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] A pin of today's litres for the 40-board set (generated fixture) before `boardSections` lands.
- [ ] `lib/geometry/board-surface.test.ts`, `view-3d.test.ts`, `fin-outline.test.ts`, `lib/export/*.test.ts`.
- [ ] `e2e/three-d-screen.spec.ts`, `e2e/three-d-export.spec.ts`, one `e2e/prod/three-d.spec.ts`.
- [ ] `e2e/helpers/screens.ts` gains 3D; `expectSixTilesInMenu` becomes a seven-tile check.

## Security Domain

### Applicable ASVS Categories (Level 1)
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (works signed out, C4) |
| V3 Session Management | no | — |
| V4 Access Control | no | nothing stored |
| V5 Input Validation | yes | zod: `tailHardEdgeEndsAt` optional, `.catch(undefined)`, range-checked on read; board name cleaned by the shared stem before it names files |
| V6 Cryptography | no | CRC-32 is an integrity check, not security |
| V12 Files and Resources | yes | files generated client-side only; zip entry names from the cleaned stem (no `/` or `\`, `board-file.ts:93`), fixed suffixes; STL header ASCII-only |
| V14 Configuration | yes | exact-pinned `three`/`@types/three`; no postinstall; one importer |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path characters in a board name reaching zip entry names | Tampering | the shared stem cleaner (`UNSAFE_FILE_NAME_CHARACTERS` = `/[/\\:*?"<>|\u0000-\u001f\u007f]/g`, `board-file.ts:93`) |
| A saved board with a hostile `tailHardEdgeEndsAt` (NaN, 1e9) | Tampering/DoS | parse-time catch + range check → 18" |
| Supply-chain change in `three` | Tampering | exact pin, lockfile, legitimacy gate |
| A board that makes the builder loop or allocate wildly | DoS | refuse out-of-range length and non-finite values before building; fixed station/point counts |

## Edge Coverage (for the SPEC)

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| Swallow tail: two pieces from the notch wall to the rail | R2, acc 2 | resolved | Wall strips inside the notch, meeting at the crotch edge; closed on 40 boards; test that no triangle crosses \|y\| < inner inside the notch |
| Swallow tail end: zero foam width at station 0 | R2, R7 | resolved | Ring welds to an edge/point; slice 01 is the first station with foam (Fish: 34.925 mm) |
| Diamond tail: the V is foam, tip width 0 | R2 | resolved | `foamHalfWidth` V; no wall; tested on the 40-board set |
| Squash tail: non-zero end | R2 | resolved | Fan cap at station 0 |
| Pin / round tail and the nose tip | R2 | resolved | Zero-width rings weld; caps |
| Narrow stations near the tips (section wider than the foam) | R2, R4 | resolved | Cut at the stringer; deck below `deckAt` only within 12" of a tip (≤ 5.43 mm); Side-view relation test limited accordingly |
| Mesh volume vs litres | R2, acc 3 | resolved | Gap −0.098% worst at the recommended fineness; tolerance (−0.15%, 0] |
| Hard edge fade start (12") and end (set distance) | R9, acc 6 | resolved | Area blend, continuous; measured litres moves; RAILS' 12" plot unchanged |
| Fade zone tuck settings hidden on RAILS | R9 | unresolved | K6 |
| Hard Edge Ends At absent / garbage / out of range in a saved board | R9, acc 6 | resolved | Reads 18", nothing rewritten; version 5 |
| Hard Edge off then on | R9 | resolved | Value kept |
| Reset Advanced Settings | R9 | resolved | Deletes the field in the same undo step |
| Sharp Bottom Tuck / hard edge sharpness on screen | R3 | resolved | Topology-marked bottom-edge row with sharpness weight |
| No WebGL / context lost / chunk fails | R10, acc 7 | resolved | Three messages; Export still works (writers outside the chunk) |
| A board the builder can't build | R10 | resolved | Throws on non-finite / out-of-range; message; Export dimmed |
| Locked board, signed out | R7, acc 4 | resolved | View-side controls; Export built from the store |
| Long / odd board names in file names | R7 | resolved | Shared stem; `Untitled Board` fallback |
| Board with no blank | R5 | resolved | Blank row dimmed with its hint |
| Fins: single drawn from the box length | R5 | resolved | Single base = 0.70 × depth, centred in the 10.5" box (K4) |
| Fins: rear quads smaller | R5 | resolved | Base from FINS, depth 4.25" vs 4.5" |
| Fins never claim a maker's template | R5 | resolved | One generic outline per role, no names |
| Shape3D import of each file | R8 | unresolved | Founder's acceptance test in Shape3D's trial (§C) |
| AkuShaper import | R7, D-15 | unresolved | K1 |
| Export time on a phone | R7 | resolved with assumption | 123–187 ms Node at 48/32/24 (61–102 ms at 24/16/12); fallback state exists; real-iPhone check |
| WebKit's slower first draw in specs | R12, C6 | resolved | Timeouts with headroom |
| Theme switch while open | R10 | resolved | Re-read tokens via `getComputedStyle` on class/scheme change |

## Prohibitions (for the SPEC)

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|-----------------------|
| The surface must NOT compute its own sections; it reads `boardSections` | R2, D-05 | resolved | Code review + the litres pin + the volume relation test |
| `boardSections` must NOT change any litres figure (before D-20 lands) | R2 | resolved | 40/40 bit-identical; pinned fixture test |
| A swallow must NOT be drawn as less foam from the stringer out | R2, D-05 | resolved | Notch test (no triangle across the notch) |
| `three` must NOT be imported outside `components/3d/board-scene.ts`; never in `lib/` | C5, R7 | resolved | Source-grep unit test; prod spec: no scene chunk on other routes |
| The writers must NOT need WebGL or the scene chunk | R7, acc 7 | resolved | Export spec with `getContext` stubbed to null |
| The files must NOT include fins or the blank | D-16 | resolved | Unit test: STL triangle count equals the board mesh's |
| The files must NOT be in any unit but millimetres; no `25.4` outside `units.ts` | C2, Rule 2 | resolved | Writers take mm; lint/grep |
| The 3D fins must NOT claim to be, or copy, any maker's template or foil | R5, D-06 | resolved | One generic outline per role, parametrised only by base and role constants; no maker names in code or copy |
| A fin must NOT be shrunk uniformly; only its base changes with FINS' value | R5 (founder) | resolved | fin-outline test: changing base leaves depth, tip offset and trailing edge unchanged |
| The hard-edge fade must NOT step (no rounded edge at 12", no jump at the end) | R9 | resolved | Continuity tests across both ends |
| Opening a saved board must NOT write `tailHardEdgeEndsAt` | R9, R11 | resolved | Parser test on frozen input |
| No database or migration change | R11, D-17 | resolved | `drizzle/`, `lib/db/schema.ts` diff empty |
| Nothing on screen may announce the 3D screen or the moved litres | R11, D-18 | resolved | e2e: no new notice text |
| The camera must NOT move when the board turns; lights must NOT follow the view | R3, D-10 | resolved | Controller turns the model quaternion only; unit test on view-3d |
| No glide under reduced motion; no auto-turn ever | R4, D-13 | resolved | e2e with `reducedMotion: "reduce"` |
| No expected number typed from this research | C1 | resolved | Tests compute or read generated fixtures |
| Nothing pushed, deployed or migrated without the founder's go | C8, R12 | resolved | Plan checkpoints |
| No scratch scripts left in the repo or `.planning/` | environment | resolved | All scratch under the session scratchpad |

## Sources

### Primary (HIGH confidence): files opened this session
- `16-SPEC.md`, `16-CONTEXT.md`, `16-UI-SPEC.md`, `14-RESEARCH.md` (shape), `CLAUDE.md`, `.claude/CLAUDE.md`, `AGENTS.md`
- `lib/geometry/volume.ts:440-772`, `rail-bands.ts:80-259, 320-479, 590-669`, `finished-rail.ts:1-250, 436-619`, `outline.ts:100-339`, `design.ts` (whole), `board-profile.ts:84-353`, `fins.ts:177-188, 1246-1250, 1471-1474` (+ 940-1110 via shell), `rack-art.ts:56-140, 240-282` (shell), `blank-top-view.ts` (shell), `screen-tiles.ts:82-100, 252-275`, `lib/screen-steps.ts:37-40`, `components/site-nav.tsx:30-37`, `components/design/screen-tiles.tsx:58-67, 235`, `lib/models/board-file.ts:91-107`, `components/setup/board-file-download.ts`, `lib/models/design-snapshot.ts:370-425`, `components/design/design-store.tsx:862-950`, `components/rails/rail-controls.tsx:196-226, 336-425`, `lib/geometry/blank-reasons.ts:268-320`, `playwright.config.ts`, `e2e/phone-screen-tiles.spec.ts:150-175`, `e2e/desktop-baseline.spec.ts:205-225`, `e2e/helpers/screens.ts`, `scripts/extract-phase14-preset-figures.ts`, the mock archive
- `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`
- npm registry (`npm view`), the legitimacy seam, gh API (repo health), a Next 16.3.6 build, esbuild bundles, Playwright runs, the sandbox vitest run

### Secondary (MEDIUM)
- Shape3D: https://www.shape3d.com/products/ImportOption.aspx, https://www.shape3d.com/Products/ExportOption.aspx, User Manual V8 PDF (pp. 66–74), SCAN Tutorial PDF
- Autodesk DXF reference (HEADER variables; POLYLINE); ezdxf polyline docs; Wikipedia STL
- BoardCAD source (github.com/hornstein/boardcad-java)
- Fin specs: Futures Gerry 7.75, FCS Performer listings, FCS keel listings, Captain Fin, Kanoa

### Tertiary (LOW)
- AkuShaper: https://www.akushaper.com/ and Swaylocks forum threads (no import format documented)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — measured bundle and route isolation in a real build
- Architecture / surface: HIGH — built and checked on 40 boards
- Hard Edge Ends At: HIGH — implemented in the sandbox, fixture regenerated, suite run
- CNC formats: MEDIUM — Shape3D's manual, no Shape3D run; AkuShaper LOW
- Fins: MEDIUM — FINS figures measured; outlines generic by design

**Research date:** 2026-11-03
**Valid until:** any change to `volume.ts`, `finished-rail.ts`, `rail-bands.ts`, `outline.ts`, `fins.ts` or a three.js release adopted (about 14 days at this pace)
