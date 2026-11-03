# Quick 261102-gec — Rails v2: the brief for the planner

Written by the orchestrator on 2026-11-02 from the founder's request (section 1, verbatim and LOCKED), what the
orchestrator verified before planning (section 2, F-numbered facts), the split into two plans (section 3), rulings
(section 4) and pointers (section 5). The planner reads this file first and treats sections 1 and 4 as locked; it may
add its own measured facts and its own choices in the plans, each marked as a planner's choice so the founder can
overrule it.

## 1. The founder's brief (verbatim, locked)

> Rails v2 on a new branch: the RAILS screen running my "Chris Rails v2" sheets, with the finished rail and a fuller
> Advanced menu
>
> Work on a new branch, `rails-v2`, cut from main. Nothing on this branch merges to main, pushes, deploys or migrates
> production until I say so. I want to live with it before it replaces the old way. Plan it as two plans with my look in
> the browser between them (the rules first, then the controls and the drawing), and show me pictures before each commit.
>
> ### What I want
> The RAILS screen should calculate rails from my two new sheets instead of today's rules, draw the finished rail, and
> give each rail a fuller Advanced menu. The page I signed off is the reference: "Chris Rails v2",
> https://claude.ai/artifact/N4p4DdmiCdma2UHQE1eXX1. Its script has the sheets' rules between `/* calc:start */` and
> `/* calc:end */`, and the finished rail between `/* finish:start */` and `/* finish:end */`. Its numbers match the
> workbook cell for cell. Save those two blocks into the repo as the reference source for the fixture script.
>
> ### Sources
> - Workbook: Google Drive, "Surfboard Shaping and Design/rails/Chris Rails v2.xlsx" (saved 10:03 on 2026-11-02), sheets
>   "Chris Center Rail v2" and "Chris Nose&Tail Rail v2". Read the saved file, not Excel's autosave. If I've saved a newer
>   version, diff it against the rules below and tell me what changed before using it.
> - Finished-rail curve: sketch 018 (.planning/sketches/018-finished-rail-curve/index.html), the "Blended halfway" style
>   only. I picked it over "One even round".
>
> ### The rules (inches as in the sheet; store and compute in mm like everything else)
> t = the thickness the sheet works from: the board thickness on a flat deck, the tapered rail thickness on a domed one.
> T = the board thickness. s = "Scaled from center by" (1 on the center; 0.75 by default on the nose and tail).
> - Apex Thickness (the sheet's "Apex Length") = (-0.125 × Family + 1.375) × t × 0.35 × s
> - Apex Center = t × the bottom part of the ratio
> - Rail Mark 1 = Apex Center + Apex Thickness / 2; Rail Tuck 1 = Apex Center - Apex Thickness / 2
> - The apex must fit on the rail. At the ends of the Ratio it can run off: Family 1 at 80/20 puts Rail Tuck 1 below the
>   bottom, and at 20/80 Rail Mark 1 goes above the deck. When that happens (after any nudge), Apex Thickness shrinks
>   evenly about the Apex Center until Rail Tuck 1 is 1/16" above the bottom and Rail Mark 1 is 1/16" below the deck. It
>   stays centred on the Apex Center, and the Apex Thickness label says it was trimmed to fit.
> - Domed Deck Band = 2.4 × T (not scaled)
> - Deck Mark 1 = T × s; Deck Mark 2 = Deck Mark 1 / 2; Deck Mark 3 = 1.8 × T × s
> - Bottom Tuck 1 = Rail Tuck 1 × 0.577 (Fred's 30° tool), or Deck Mark 1 when Sym is on
> - Bottom Tuck 2 = Bottom Tuck 1 / 2
> - Bottom Tuck 3 = Rail Tuck 1, or Deck Mark 3 when Sym is on
> - No corner cut. No rounding inside the rules; marks show to the 1/16" or whole mm as usual.
> - Drawing: the deck line runs from t at the rail to T at the Domed Deck Band. Band 1 runs from Rail Mark 1 to the deck
>   at Deck Mark 1; Band 2 from the Band 1 line at Deck Mark 2 to the deck at Deck Mark 3. Tuck 1 runs from Rail Tuck 1
>   to the bottom at Bottom Tuck 1; Tuck 2 from the Tuck 1 line at Bottom Tuck 2 to the bottom at Bottom Tuck 3.
>
> ### Inputs, per rail, as today with three changes
> Board thickness (imported from ROCKER & foil as today), Deck Profile, Family, Ratio and Sym. A new board starts with
> today's values. The changes:
> - Ratio runs from 20/80 to 80/20 (today it stops at 30/70 and 70/30). Keep the marks under its track in today's style.
> - Ratio moves in halves, so 62.5/37.5 is reachable.
> - Deck Profile stops at 75% (my sheet's minimum rail thickness). A saved board set below 75% draws at 75%.
>
> ### Advanced menu, per rail
> - Nose and tail only: "Scaled from center by", 0.50 to 1.00 in 0.05 steps, default 0.75. It scales Apex Thickness, Deck
>   Mark 1 and Deck Mark 3 (Deck Mark 2 follows Deck Mark 1), never the dome.
> - Tweak sliders that nudge each mark off its formula, starting at 0: Apex Thickness, Deck Mark 1, Deck Mark 2, Deck
>   Mark 3, Bottom Tuck 1, Bottom Tuck 2 and Bottom Tuck 3. A nudge is a plus-or-minus amount (deck marks ±1/2", the
>   others ±1/4", in 1/16" or 1 mm steps). It's saved as the amount, so the mark still follows thickness, family and ratio
>   afterwards. Each label shows the mark and its nudge, e.g. "Deck Mark 1 — 2 5/8" (+1/8")".
> - A mark that depends on another uses that one's nudged value first, then adds its own nudge. Deck Mark 2 is half the
>   nudged Deck Mark 1. The Apex Thickness nudge moves Rail Mark 1 and Rail Tuck 1 evenly about the Apex Center, which
>   carries through to the bottom tucks. A moved Deck Mark 2 or Bottom Tuck 2 stays on its band's line.
> - Keep marks sensible: nothing below 1/16", Deck Mark 2 inside Deck Mark 1, and Bottom Tuck 3 at least 1/16" beyond
>   Bottom Tuck 1 (today's rule).
> - Use Single Tuck on every rail, as today: Tuck 2 goes, Rail Tuck 1 runs straight to Bottom Tuck 3, and the Bottom
>   Tuck 1 and 2 sliders hide.
> - Hard Edge on the tail only, as today, with today's default. Its tuck sliders hide while it's on.
> - Corner Cut Offset and Remove go, because the new rules have no corner cut.
> - Reset Advanced Settings puts every nudge back to 0, the scale back to 0.75, and Single Tuck and Hard Edge back to
>   their defaults.
>
> ### Finished rail
> Draw the finished rail on each VIEWER cross-section. It's the shape the cuts leave, with every corner blended halfway
> into the bands either side of it. Draw it as a 3px ink line over the bands, filled with the app's board fill under the
> grid, with "Finished Rail" in the key. Add a Finished Rail on/off switch that only changes the view and isn't saved
> with the board. It always meets the rail at the Apex Center.
>
> ### House rules
> - Rule 1: all of this maths lives in lib/geometry/ (rework rail-bands.ts on the branch, plus a pure finished-rail
>   module), with unit tests for every export. Expected numbers come from fixtures a script generates: the workbook's own
>   saved values for its two input sets, plus cases across the input ranges (including both ends of the Ratio) from the
>   reference page's calc block, the way quick 261007-c3h used a sketch as its reference. Never hand-type an expected
>   number. Test the finished rail too: it never goes past a cut, and it meets the rail only at the Apex Center.
> - Rule 2: every conversion goes through units.ts; marks read in whole mm in Metric.
> - Saved boards: new settings (the scale and the nudges) must default to 0.75 and 0 so every saved board still opens;
>   old corner-cut settings are ignored. Check how rails are saved (lib/models/design-snapshot.ts and the database
>   schema). If a database change turns out to be needed, stop and tell me, because this branch must not migrate
>   production.
> - Everything else that reads the rails must follow: the DATA tab (its Corner Cut rows go), the INSTRUCTIONS wording,
>   the Summary order form, the full-size view, and the RAILS picture in the phone menu.
> - Volume reads the rail profile, so board litres will change. Keep volume on the cut, faceted profile as today, show me
>   the before-and-after litres for the presets, and ask me before switching volume to the finished curve.
> - Phone: the new Advanced sliders must be touch-sized and work in the phone layout; run the phone e2e tests.
> - Explain every change to me in plain English: what it does to the board and the screen.

## 2. Facts the orchestrator verified (2026-11-02)

- **F1 — The workbook is the 10:03 save and it agrees with the rules.** Google Drive holds one "Chris Rails v2.xlsx"
  (file id 1of0p4GGWBKJPPYi-5hRt9aWmDDzw_CR1), modified 2026-11-02 18:03:09 UTC = 10:03:09 PST — the save the reference
  page was built from; there is no newer save, so no diff is owed. Read through Drive, its two saved input sets and
  every calculated cell match section 1's rules and the reference page's `sheetV2` cell for cell:
  - Center sheet: flat, Board Thickness 2.5, Family 3, Top Part of Ratio 62.5% (shown "63%"), Sym FALSE → Apex Length
    0.875, Apex Center 0.9375, Rail Mark 1 1.375, Rail Tuck 1 0.5, Domed Deck Band 6, Deck Marks 2.5 / 1.25 / 4.5,
    Bottom Tucks 0.2885 / 0.14425 / 0.5. Its chart series: Band 2 starts at (−1.25, 1.9375) on the Band 1 line, Tuck 2
    starts at (−0.14425, 0.25) on the Tuck 1 line.
  - Nose & Tail sheet: flat, Board Thickness 1.625, Family 1, Top 62.5%, Sym FALSE, Scaled from center by 75% → Apex
    Length 0.533203125, Apex Center 0.609375, Rail Mark 1 0.875976563, Rail Tuck 1 0.342773438, Domed Deck Band 3.9 (not
    scaled), Deck Marks 1.21875 / 0.609375 / 2.19375, Bottom Tucks 0.197780273 / 0.098890137 / 0.342773438.
  - The sheet's own notes: "Max Rail thickness = Board Thickness; Min Rail Thickness = Board thickness *.75" (hence
    Deck Profile stops at 75%); Bottom Tuck 1 "Fred tool 30deg cuts … StartPoint*.577, then rounded to 1/16" — the
    founder's rule says NO rounding inside the rules; the sheet's cells carry none either (0.2885, not 5/16).
- **F2 — The reference blocks are in the repo.** `reference/sketches/018-chris-rails-v2.js` holds the page's calc and
  finish blocks byte for byte under a provenance header (the c3h pattern, `reference/sketches/012-round-nose-curves.js`).
  ESLint ignores `reference/**`; the c3h generator loads its reference with `createRequire(...)(path)`, but the 012 file
  exports its functions (`module.exports`) — this one does NOT (it is the page's script, plain `const`/`function`
  declarations), so the generator must evaluate the file's text (`node:vm` — `runInNewContext(src + "; ({ SHEET,
  sheetV2, thicknesses, segments, finishedCurve, foam, cutChain })")` or the like). Never edit the file's body; a header
  comment is the only part that is ours. The page's `META`/`todayApp` are its comparison overlay of today's app, not a
  rule.
- **F3 — The reference covers the sheet, not the app's extras.** The calc block has no apex trim, no nudges, no 1/16"
  floors, no Single Tuck and no Hard Edge (the page says so: "Today's app also has Corner Cut, Single Tuck, the tail's
  Hard Edge … this page leaves them out"). Its `segments()` puts Tuck 2's start at `[-bt2, rt1 / 2]` — the midpoint of
  the Tuck 1 line, which is only right while Bottom Tuck 2 = Bottom Tuck 1 / 2 (no nudge). So the golden covers the
  un-nudged, un-trimmed, two-tuck, no-hard-edge cases; the trim, the nudges, the floors, Single Tuck and Hard Edge are
  proven by RULE tests (properties and relations, never a typed expected number). The finished rail with a Hard Edge
  comes from sketch 018's own `blendRun` (index.html lines ~715-760: a `hardEdge` argument keeps the corner at (0,0)
  sharp — `const sharp = hardEdge && |V.x|<1e-6 && |V.y|<1e-6`), which the page's copy does not carry.
- **F4 — Rails are saved inside the `models.snapshot` jsonb column; no database change is needed.** The shape is
  validated by Zod only (`railSectionSpecSchema`, lib/models/design-snapshot.ts lines 336-352). New fields with a default
  on read follow the existing precedent `forwardOffRailNudge: z.number().catch(0)` (rule 9 of that file). The old fields
  `cornerCutOffsetOverride`, `removeCornerCut` and `bottomTuck3Override` must still be ACCEPTED on read (old rows carry
  them) and ignored, and no longer written. `DESIGN_SNAPSHOT_VERSION` and its rules (the file's doc comment) say how a
  format change is recorded — follow them. `lib/db/schema.ts` is untouched; `npm run db:generate` must produce no
  migration.
- **F5 — Today's module and its readers.** `lib/geometry/rail-bands.ts` (774 lines) keeps an inch-domain core
  (`computeSectionInches`, `buildProfilePointsInches`, `buildSegmentDefsInches`, `buildRailDataGroupsInches`) with Mm at
  the boundary; `RAIL_SECTION_CONSTANTS` holds `scale` and `domedBandBase` per section (both go: scale becomes a stored
  per-rail setting, the dome band is 2.4 × T); `computeRailBands` clamps the tapered rail thickness to the 1/16"
  (`roundToSixteenthInch`) exactly as the page's `thicknesses()` does (`r16`). Files that read the spec, the constants or
  the result and must follow (grep done; `.claude/worktrees/*` copies are other sessions' — ignore them):
  `lib/geometry/volume.ts` (F7), `lib/geometry/presets.ts` (12 section specs carrying cornerCut/bottomTuck3Override
  fields), `lib/geometry/preset-source.ts` (prints a spec's fields for the "Copy preset values" button — keep its
  round-trip test green), `lib/geometry/screen-tiles.ts` (`railsTileArt` via `railPlotDots` — the RAILS picture in the
  phone menu), `lib/geometry/design.ts`, `lib/geometry/foil.ts`, `lib/geometry/fins.ts`, `lib/blanks/preset-blanks.ts`,
  `lib/models/design-snapshot.ts`, `components/design/design-store.tsx`, `components/rails/{rail-controls, rail-band-
  editor, rail-section-plot, rail-data-table, rail-instructions, rail-callouts, rail-reference-paths, rail-plan-side-
  figure, view-full-sized-dialog, rail-legend-provider, rail-legend-ticks}`, `components/summary/order-form.tsx` (reuses
  `RailSectionPlot` + `RailDataTable`), `scripts/extract-phase14-today-golden.ts` and `scripts/phase14-before-after.ts`
  (must still type-check), and the tests beside each. Browser specs that name rail marks or limits: `e2e/phone-
  rails.spec.ts`, `e2e/summary-planing.spec.ts`, `e2e/summary-rail-key.spec.ts`; specs that reach RAILS from another
  screen and read its labels (the 261005-big lesson: grep every spec for the LABELS you change, not the route) —
  `e2e/rocker-blanks.spec.ts` reads Center Rail's "Board Thickness"; also `e2e/summary-rail-instructions-fit.spec.ts`,
  `e2e/template-rails-panels.spec.ts`, `e2e/phone-screens.spec.ts`, `e2e/phone-screen-tiles.spec.ts`,
  `e2e/board-lock-screens.spec.ts`. Desktop baselines under `e2e/*-snapshots/` for RAILS will change (re-record with
  `--update-snapshots`, local only).
- **F6 — Today's controls.** `components/rails/rail-controls.tsx`: Deck Profile slider `min={66}` with the value
  inverted (`166 - deckPercent`, lines 172-228); Ratio 30-70 in whole steps (`clampFinite(sliderValue(v), 30, 70)`, line
  289) with hand-placed marks under its track — `30/70` at the left end and `50/50` centred (lines 113-121); the 70/30
  mark was DROPPED by fast task 184 (2026-10-19) because in a half-width column it ran into 60/40 — so "today's style"
  is a left-end mark and a centre mark; whether a right-end `80/20` fits is the same question, to be MEASURED (the
  founder's words then: "drop the 70/30 marks"). Family and Ratio are the one hand-built slider pair (level since fast
  184); every other control is `SliderRow` (touch-sized by the `coarse` pointer variant — new sliders use it). Advanced
  today: Corner Cut Offset (+ Remove), Bottom Tuck 3 (+ Use Single Tuck), Hard Edge (tail), ↺ Reset Advanced Settings;
  `resetAdvanced` at line 199. Defaults today (`DEFAULT_RAIL_BAND_SPEC`): deckPercent 100, family 3, ratioTopPercent 60,
  symmetrical false, singleTuck false, tailHardEdge true; thickness nose 1.31" / center 2.5" / tail 1.56" when not
  imported from the foil.
- **F7 — Volume.** `lib/geometry/volume.ts` `computeCrossSectionVolume` (lines 520-644) re-runs `computeRailSection` +
  `buildRailProfile` at 51 stations, blending `deckPercent`, `ratioTopPercent`, `scale` and `domedBandBase` continuously
  between the three anchors and taking the discrete fields (`family`, `symmetrical`, `removeCornerCut`, `singleTuck`,
  `cornerCutOffsetOverride`, `bottomTuck3Override`) from the nearest anchor. With the new rules the dome band derives
  from thickness, `scale` is the stored per-rail setting (centre 1), and the nudges are per-rail settings (blend or
  nearest-anchor: the planner decides and says why). Volume STAYS on the faceted, cut profile. The presets' litres
  before and after are owed to the founder (section 4, R5).
- **F8 — Branch and tree.** `rails-v2` was cut from `main` at 36d701d8 (== origin/main) and carries one commit:
  7b7995b2 "docs(sketch): sketch 018 — the finished rail curve, Blended halfway picked" (the sketch files, untracked
  since 2026-10-20, with the MANIFEST row's winner filled in). The working tree holds this brief, the task folder with an
  empty `pictures/`, and `reference/sketches/018-chris-rails-v2.js` — all uncommitted; the planner commits them with its
  plans (R11). Nothing on this branch merges, pushes, deploys or migrates.
- **F9 — Execution facts.** Executors run in agent worktrees forked from this branch's HEAD (`worktree.baseRef: head`):
  symlink `node_modules` from the main checkout (`ln -s /Users/kontoes/Code/shaper/node_modules`), unlink it before the
  merge; `npm run build` does not work in a worktree — `npx tsc --noEmit` is the type gate there and the orchestrator
  builds from the main checkout after each merge; Playwright runs inside a worktree with `PW_PORT=<unique>
  IS_WEBPACK_TEST=1 npx playwright test <spec>`; never a broad `pkill`; never `next dev` from the main checkout during a
  wave (one `next dev` per checkout; the founder's own server may hold port 3000 or 3005); a pure-geometry probe needs
  no dev server (`npx tsx`). The planner measures in a throwaway copy: `rsync -a --exclude node_modules --exclude .next
  --exclude .git --exclude '.env*' --exclude .claude/worktrees --exclude test-results /Users/kontoes/Code/shaper/
  <scratchpad>/plan-copy/` then symlink `node_modules`; delete any copied `client_secret_*.json`.
- **F10 — Pictures precedent.** Quick 261007-c3h's executor shot before-and-after pictures with a scratch Playwright
  script (archived as `pictures/shoot-source.tar.gz` — never loose `.ts`/`.mjs` under `.planning`, tsc and lint read
  them) at 1280×800 and on an iPhone 14, saved under the task folder's `pictures/`; the orchestrator showed them to the
  founder before merging. The same here (R2).

## 3. The split: two plans in this one quick id

Precedents: quick 261007-fnz and 261014-wii (two plans, the founder's look between them, the second plan amended by
SendMessage after the look). The planner writes BOTH plans now; plan 02 may be revised after the founder's look.

- **Plan 01 — the rules.** `lib/geometry/rail-bands.ts` reworked to section 1's rules (the new spec fields with their
  defaults; the apex trim; the nudges and floors; Single Tuck and Hard Edge as today; no corner cut; the dome band 2.4 ×
  T; the drawn segments per the "Drawing" rule — Band 2 and Tuck 2 START ON THEIR BAND'S LINE at the nudged mark, not at
  a fixed midpoint); the pure finished-rail module (`lib/geometry/finished-rail.ts`: the cut shape and the halfway blend,
  a hard edge kept sharp; exported as a point list / path data in mm the plot can draw) with its tests; the golden
  generator + fixture (`scripts/extract-rails-v2-golden.ts` → `lib/geometry/__fixtures__/rails-v2-golden.json`: the
  workbook's two saved sets from `SHEET`, plus a grid across thickness, Deck Profile (flat and domed), Family 1-5, Ratio
  20/80 … 80/20 in halves, Sym on/off, scale 0.5-1.0 — keeping only cases where the apex fits, since the page has no
  trim — and the finished rail's sampled points from `finishedCurve`); the storage (`design-snapshot.ts`, the presets,
  `preset-source.ts`); everything that merely READS results so the branch builds and every test passes (the DATA tab's
  Corner Cut rows gone; the plot, callouts, reference paths, tile art, order form, instructions wording; the
  old Corner Cut Offset/Remove and Bottom Tuck 3 override controls removed from the sidebar so it compiles — the FULL
  Advanced menu, the new Ratio/Deck ranges and the drawn finished rail wait for plan 02); the presets' litres before and
  after; before-and-after pictures. After plan 01 the founder looks at RAILS in the browser: the sidebar reads as today
  (thickness, Deck Profile, Family, Ratio, Sym; Advanced holding only Single Tuck, Hard Edge, Reset) while the drawing
  and the DATA tab already show the new marks.
- **Plan 02 — the controls and the drawing.** Ratio 20/80-80/20 in halves with its marks; Deck Profile stopping at 75%;
  the Advanced menu per rail (Scaled from center by on nose and tail; the seven nudge sliders with their labels
  "<mark> — <value> (<±nudge>)" and the "trimmed to fit" note on Apex Thickness; Single Tuck hiding Bottom Tuck 1 and 2;
  Hard Edge hiding the tail's tuck sliders; Reset); the finished rail drawn on each VIEWER cross-section (3px ink over
  the bands, the board fill under the grid, "Finished Rail" in the key) with its on/off switch (view state, never
  saved); the full-size view; the phone layout with touch-sized sliders; the phone e2e tests; the RAILS desktop baseline;
  after pictures (desktop, the Advanced menu open, the finished rail on and off, an iPhone 14).

## 4. Rulings (orchestrator, from the founder's brief — locked)

- **R1 — Two plans, one quick id**, executed one after the other, each in its own worktree forked from the branch's tip
  at that moment; the founder looks in the browser between them.
- **R2 — Pictures before each commit lands on the branch.** Each plan's executor saves pictures under the task folder's
  `pictures/` (plan 01: before AND after — the before pictures FIRST from the unchanged code; plan 02: after) at
  1280×800 and on an iPhone 14, for the Shortboard preset at least (every rail's section visible, the DATA tab too), and
  the orchestrator shows them to the founder before merging the worktree. The shooting script is archived as a
  `.tar.gz` beside the pictures.
- **R3 — Nothing merges to main, pushes, deploys or migrates.** No database migration (F4). If the planner finds one
  would be needed, it stops and says so in its return instead of planning around it.
- **R4 — The apex trim is a rule test, not a golden**, because the sheet has no trim (F3): after the Apex Thickness nudge,
  Apex Thickness = min(formula + nudge, 2 × (Apex Center − 1/16"), 2 × (t − 1/16" − Apex Center)), never below 0 — so
  Rail Tuck 1 ≥ 1/16" and Rail Mark 1 ≤ t − 1/16", both still centred on the Apex Center; the result carries a flag the
  label reads ("trimmed to fit"). t here is the rail-side thickness (the tapered rail thickness on a domed deck).
- **R5 — Volume stays on the cut, faceted profile.** Plan 01 produces the four presets' litres before and after (a table in
  the SUMMARY, computed by running the app's own volume code — the planner may measure it at plan time in the scratch
  copy and write the numbers into the plan as expectations the executor confirms, never as typed truths). Switching
  volume to the finished curve is NOT planned; the founder decides later.
- **R6 — Plain English everywhere the founder reads**: plan objectives, commit subjects, the SUMMARY ("what it does to
  the board and the screen", never which component re-renders).
- **R7 — Deck Profile floor 75%**: the slider stops at 75; `computeRailBands` computes a saved `deckPercent` below 75 as 75
  without rewriting the stored value (the board is only rewritten when the shaper moves the slider).
- **R8 — Ratio 20-80 in halves (0.5 steps)**; marks in today's style (F6): `20/80` at the left end and `50/50` centred.
  A right-end `80/20` mark is the same question fast 184 answered for `70/30` (it ran into the value readout in the
  half-width column): measure in headless Chromium with the app's Inter at the real column width on a 360-dot phone and
  on a computer; keep it if it reads cleanly, drop it as fast 184 did if not, and say which in the plan. The value
  readout "Ratio — 62.5/37.5" must fit the half-width column too.
- **R9 — Keep `MIN_BOTTOM_TUCK_SEPARATION_IN`** (Bottom Tuck 3 ≥ Bottom Tuck 1 + 1/16") and the 1/16" floor on every
  mark after nudges; Deck Mark 2 ≤ Deck Mark 1 − 1/16".
- **R10 — "Scaled from center by"** is a stored per-rail number (the planner names the field); the centre's is always 1 and
  has no slider; nose and tail 0.50-1.00 in 0.05 steps, default 0.75. It scales Apex Thickness, Deck Mark 1 and Deck
  Mark 3 only (Deck Mark 2 follows Deck Mark 1); never the dome band.
- **R11 — The planner commits its own plans, this brief and the reference file** on `rails-v2` as one docs commit
  (`docs(quick-261102-gec): plans — …`), so each executor's worktree carries them (the pre-dispatch commit step is
  excluded by the section manifest). Commit nothing else. The `pictures/` folder stays empty until an executor fills it.
- **R12 — The old Bottom Tuck 3 override becomes the Bottom Tuck 3 nudge**; a saved board's old override is ignored (the
  new rule's derived Bottom Tuck 3 differs anyway) and the SUMMARY tells the founder so. Old corner-cut settings are
  ignored (the founder's rule).
- **R13 — The finished rail**: a pure module, tested for (a) never outside the cut shape (every sampled point inside or on
  the foam polygon the cuts leave), (b) on a tucked rail it meets the rail line (x = 0) only at the Apex Center, (c) a
  Hard Edge tail keeps its corner sharp and runs down the wall (sketch 018's rule — the "only at the Apex Center" test
  does not apply to a hard edge; the test says so), (d) agreement with the reference `finishedCurve`'s sampled points
  on the golden cases to 1e-6 inch (its `X0` is the drawing's left edge — pass the same). The on/off switch is view
  state: the planner picks where it lives (the VIEWER toolbar as FINS' callouts icon, fast 181, is the precedent) and it
  defaults ON, as on the reference page; it is never written to the board's data. The full-size view draws the finished
  rail under the same switch.
- **R14 — Single Tuck and Hard Edge as today**, including Hard Edge's default (true on the tail).
- **R15 — Phone**: every new slider is `SliderRow` (touch-sized), the Advanced menu works in the stacked phone layout, and
  the phone e2e tests run (`npm run test:e2e:phone` inside the worktree with `PW_PORT`).

## 4b. The founder's answers to the planner's questions (2026-11-02, while plan 01 ran — locked)

Asked by the orchestrator after reading both plans; each answer confirms the planner's choice, so plan 02 stands as
written.

- **Hard Edge stays under Ratio on the tail** (PC16), not in Advanced.
- **The finished rail is a screen aid only**: drawn on the VIEWER and the full-size view, never on the printed order
  form (PC21).
- **Sym moves to its own line under the Ratio marks** (PC15), because "Ratio — 62.5/37.5" plus the Sym box no longer fit
  the half-width column side by side.
- **The guard rails stay** (PC4, PC5 and the 1/16" floors): at 80/20 with Family 1-3 on the default thicknesses Bottom
  Tuck 1 and 2 read 1/16" and Bottom Tuck 3 reads 1/8".
- **Volume moves to the finished curve** (answered after plan 01's litres table, 2026-11-02: "Switch to the finished
  curve"): plan 03, written by the planner the same day, wave 3 after plan 02 — one basis for every quoted litre,
  the cut, faceted profile kept only as the base of the exact sum (plan 03's D-V1, PV1-PV7).

## 5. Pointers

- The reference page's two blocks: `reference/sketches/018-chris-rails-v2.js` (F2). The page itself is an Artifact the
  planner cannot read; everything it needs is in the file and in section 1.
- Sketch 018: `.planning/sketches/018-finished-rail-curve/index.html` (bundled app maths + the finished-rail code with
  the `hardEdge` sharp corner, `blendRun` ~line 719) and its `README.md`.
- Today's maths and its tests: `lib/geometry/rail-bands.ts`, `lib/geometry/rail-bands.test.ts`,
  `lib/geometry/__fixtures__/prototype-rails-golden.json`, `scripts/extract-prototype-rails-golden.mjs` (the old golden —
  its tests go or are rewritten; the prototype's rules are retired on this branch).
- The c3h pattern for a sketch-sourced golden: `.planning/quick/261007-c3h-rocker-s-top-view-and-the-fit-check-a-bl/`
  (PLAN, SUMMARY, pictures), `scripts/extract-round-nose-golden.ts`, `lib/geometry/round-tip.test.ts`.
- Storage: `lib/models/design-snapshot.ts` (rules 1-9 in its doc comment; `railSectionSpecSchema` line 336),
  `lib/models/design-snapshot.test.ts`, `lib/models/saved-board-open.test.ts`.
- Controls and drawing: `components/rails/rail-controls.tsx`, `rail-band-editor.tsx`, `rail-section-plot.tsx` (colour map
  line ~92; the plot draws `segments` and `railPlotDots`), `rail-callouts.ts`, `rail-reference-paths.ts`,
  `rail-data-table.tsx`, `rail-instructions.tsx`, `view-full-sized-dialog.tsx`; the toolbar-button precedent
  `components/fins/` (fast 181) and `components/viewer/` for `ViewerToolbarButton`; `components/ui/slider-row` (SliderRow)
  and `components/design/measure-field.tsx`.
- Volume: `lib/geometry/volume.ts` lines 460-644, `volume.test.ts`; presets' litres: `lib/geometry/presets.ts`,
  `presets.test.ts` (records figures), `scripts/phase14-before-after.ts` (a before/after litres script precedent).
- Units: `lib/geometry/units.ts` (`inchesToMm`, `mmToInches`, `roundToSixteenthInch`, the mark/dim formatters);
  CLAUDE.md Rule 2 (marks in whole mm in Metric; nudge steps 1/16" or 1 mm).
- Project rules: `CLAUDE.md` (Rules 1 and 2, the Layout section's three switches), `.claude/CLAUDE.md`.
- Memory of what bites: `~/.claude/projects/-Users-kontoes-Code-shaper/memory/shaper-screen-rebuild-cadence.md` and
  `shaper-gsd-execute-phase-gotchas.md` (worktree node_modules, PW_PORT, one `next dev` per checkout, Playwright calls a
  straight SVG line hidden, a slider's thumb intercepts clicks on its hint line, NBSP vs Playwright regex).

## 4c. The founder's rulings after plan 02's look (2026-11-02, with plan 02 merged at 1bac8b0e — locked)

The founder, on localhost:3005 with plan 02 live, in two messages:

> "I think the finished rail icon should look more like a finished rail. I also think we should add another icon that
> ghosts the bands so that the finished rail is clearly seen."

> "Deck mark 2 and Bottom Tuck 2 don't need sliders. Always in the middle is great. I would like to add an advanced
> slider for the domed deck mark though."

> "lets go with the ghost icon to hid the bands. These too look way to similar." (on the first pair of glyphs, seen
> live — both drawn around the same curve)

- **R16 — done as a fast task, not a plan (2026-11-02):** the Finished Rail button's glyph is a solid, smooth rail
  silhouette (`FinishedRailIcon`, `components/viewer/toolbar-button.tsx`) and a second toggle beside it, Ghost Bands
  (`GhostBandsIcon`: the cut chain dashed with its mark dots), fades the bands, their connectors and every mark dot but
  the Apex Center's to `GHOST_BANDS_OPACITY` (0.3, `rail-section-plot.tsx`) while the finished rail shows; disabled
  while it is hidden; view-only like the Finished Rail switch, passed into View Full Sized the same way. The shared
  button class gained its `disabled:` look. `e2e/rails-advanced.spec.ts` test 11 proves it.
- **R17 — plan 04 (this quick id): the Deck Mark 2 and Bottom Tuck 2 nudges go.** `RAIL_NUDGE_KEYS` loses `deckMark2`
  and `bottomTuck2`; Deck Mark 2 is always half the (nudged) Deck Mark 1 and Bottom Tuck 2 always half the (nudged)
  Bottom Tuck 1 — the sheet's own C17/C20, with no amount to add. Their sliders leave the Advanced menu; a board saved
  on this branch with either amount opens with it ignored (Zod strips unknown keys; nothing is rewritten until the
  shaper saves). `RAIL_NUDGE_NAMES`, `RAIL_NUDGE_LIMIT_IN`, `ZERO_RAIL_NUDGES`, rule 10 of `design-snapshot.ts`
  ("seven" becomes six), the presets, the golden script and every test that counts or names the nudges follow.
- **R18 — plan 04: a Domed Deck Band nudge.** A new key `domedDeckBand` in `RAIL_NUDGE_KEYS`: the dome mark = 2.4 × T
  + its nudge, never scaled (the dome was never scaled), on every rail. The founder's first ruling (2026-11-02):
  "Let's do + or - 2", but never closer than 1" to deck mark 3." The planner then measured that a literal inch
  reaches boards nobody nudged (the sheet's 2.4T sits under 1" past 1.8T·s on any rail thinner than 1 5/8" at full
  scale — the un-nudged default nose at scale 1.00 would move, 119 golden cases, a few tip stations of every
  preset's volume). Put to the founder, the **final ruling (2026-11-02): "I was afraid of that. Let's keep the ±2"
  slider, but never let it equal Deck Mark 3."** So the slider runs −2" to +2" in 1/16" (or 1 mm) steps
  (`RAIL_NUDGE_LIMIT_IN.domedDeckBand` = 2 — the one nudge wider than ±1/2"), and the guard is the house minimum:
  the dome mark is clamped to at least 1/16" (`MIN_RAIL_MARK_IN`) beyond the (nudged) Deck Mark 3, applied after
  Deck Mark 3 is settled — exactly the rule Bottom Tuck 3 keeps against Bottom Tuck 1. Because 2.4T − 1.8T·s is at
  least 0.6T, the formula alone never comes within 1/16" of Deck Mark 3 on any real rail, so the guard can only ever
  hold the slider: every un-nudged board draws exactly as the sheet says, no golden case changes, no preset's litres
  move. Listed after Deck Mark 3 in the menu, label
  `Domed Deck Band — 5 3/8" (0")` in the house form (the founder did not object to either). Moving the dome moves
  where the deck line reaches full thickness, so Band 1's and Band 2's deck ends ride the new line (nothing else about
  the rules changes); the DATA tab's Domed Deck Band row, the callouts, the volume and the finished rail all read the
  result as they already do. Reset Advanced Settings puts it back to 0 with the rest. On a flat deck (t = T) the dome
  mark only moves its own green dot and the Domed Deck Band line's end — the deck line is flat either way.
