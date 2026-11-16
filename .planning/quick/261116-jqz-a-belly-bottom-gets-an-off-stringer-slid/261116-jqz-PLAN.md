---
phase: quick-261116-jqz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/bottom.ts
  - lib/geometry/bottom-draw.ts
  - lib/geometry/bottom-print.ts
  - components/bottom/bottom-controls.tsx
  - lib/geometry/bottom-belly-panel.test.ts
  - lib/models/design-snapshot.test.ts
  - e2e/bottom-belly-panel.spec.ts
  - e2e/bottom-panel.spec.ts
  - e2e/bottom-metric.spec.ts
  - lib/geometry/brd-bottom.ts
  - lib/geometry/brd-bottom.test.ts
  - lib/export/brd-fit-preview.ts
  - lib/export/brd-fit-preview.test.ts
  - .planning/quick/261116-jqz-a-belly-bottom-gets-an-off-stringer-slid/pictures/
autonomous: false
requirements: [D-01, D-02, D-03, D-04, D-05, D-06, D-07]

estimate:
  tokens: 170000
  raw_tokens: 170000
  tasks: 3
  confidence: low
  # estimate-calibration: factor 1, 0 samples. One row rule on the panel, two kind tests in DATA's readers, one mark list
  # and one choice rule in the .brd fit, three existing test expectations re-pointed, one new unit file, one new browser
  # spec with five pictures, and the twelve-file measurement through the real import.

must_haves:
  truths:
    - "On BOTTOM, a Rolled Belly Entry (nose) and a Continuous Belly / Rolled Mid (center) show an Off Stringer slider in the Tri-Plane's place in the row order, same label, 0\" to 9\", 1/16\" steps, 1 mm in Metric (D-01)"
    - "A belly opens with Off Stringer 0\" and reads, draws, prints and weighs exactly as before: every existing golden, litres pin, GUIDE card and baseline passes, and no existing test line changes except the three listed re-pointings (D-02)"
    - "With Off Stringer moved, the belly keeps a flat panel either side of the stringer and rolls from its edge out to the rail: the foam taken off (so litres, the 3D board and the .brd export), BOTTOM's panel pencil line, DATA's Center flat (or Nose flat) column, the floor check and the printed sentence ('; panel 3\" off the stringer.') all follow it (D-03)"
    - "A belly's Off Stringer survives a save, a board file and a reload with no schema or database change (D-02)"
    - "Opening a .brd moves a belly's Off Stringer in the slider refinement on the same grid as the Tri-Plane's (D-04), and the Tri-Plane Hull Center is kept only when it scores at least 1 mm closer than the closest bottom without one; in a tie or near tie any other name wins (D-05)"
    - "Through the real import, 92Log.brd and Scoop-Noserider.brd come in with a Continuous Belly / Rolled Mid center, and the SUMMARY tables all twelve of the founder's files before and after (D-06)"
    - "The fit stays as fast as today on the twelve files, and every round trip of the app's own boards comes back as today except the three Tri-Plane cases D-05 re-points (D-07)"
  artifacts:
    - path: components/bottom/bottom-controls.tsx
      provides: "cutRows: Off Stringer on a double, on the Tri-Plane, and on both bellies"
    - path: lib/geometry/bottom.ts
      provides: "markColumnsOf / marksOf give a belly's panel the flat column exactly as a vee's"
    - path: lib/geometry/brd-bottom.ts
      provides: "BRD_BOTTOM_TRI_PLANE_MM (1 mm); chooseBrdBottom(pool, seed), the choice with the Tri-Plane reached for last; refine's mark list moves a belly's offStringer"
    - path: lib/export/brd-fit-preview.ts
      provides: "acrossWords names a belly's Off Stringer when it is over 0\""
    - path: lib/geometry/bottom-belly-panel.test.ts
      provides: "every reader follows a belly's panel; a 0\" panel changes nothing"
    - path: e2e/bottom-belly-panel.spec.ts
      provides: "the browser proof on desktop and android, the reload proof and the founder's pictures"
  key_links:
    - from: components/bottom/bottom-controls.tsx (Center Off Stringer slider on a belly)
      to: components/design/design-store.tsx updateBottomCut (unchanged)
      via: "the existing MarkRow onChange writes { offStringer }; a belly is not a double, so nothing re-keeps it"
    - from: lib/geometry/bottom.ts cutFoamOffParts
      to: "litres, the 3D board, the .brd export, the floor check"
      via: "already reads cut.offStringer for a vee or a belly; no change, only proof"
    - from: lib/geometry/brd-bottom.ts fitBottomToBrd
      to: lib/geometry/brd-bottom.ts chooseBrdBottom
      via: "the pool (seed refined + every neighbour) and the refined seed go in; the chosen candidate comes out"
---

<objective>
A belly bottom gets the Tri-Plane's Off Stringer slider: a flat panel each side of the stringer, the belly rolling from
the panel's edge out to the rail (D-01). It opens at 0", so nothing that exists moves (D-02), and every reader of the
bottom follows it (D-03). Then the .brd import learns the same slider (D-04) and reaches for the Tri-Plane Hull Center
last (D-05), so the founder's 92Log.brd and Scoop-Noserider.brd come in as belly bottoms (D-06) at no cost in speed (D-07).

Purpose: the founder's words, 2026-11-16: "92log.brd is pretty clearly a belly bottom and the .brd import should reflect
this", "add the off-stringer measurement for belly BOTTOM types", and "tri-hull should be the rarest bottom type."

Output: the slider and its readers on BOTTOM, DATA and paper; the fit's belly sweep and the Tri-Plane rule; a unit file,
a browser spec on a computer and a phone, five pictures, and the twelve-file table in the SUMMARY.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@AGENTS.md
@.planning/quick/261116-jqz-a-belly-bottom-gets-an-off-stringer-slid/261116-jqz-CONTEXT.md
@lib/geometry/brd-bottom.ts
@components/bottom/bottom-controls.tsx

## READ THIS FIRST: what the planner measured (2026-11-16, scratch copy of lib/, repo source untouched)

The prototype is a copy of `lib/` at `/private/tmp/claude-501/-Users-kontoes-Code-shaper/002e2a58-3c43-4c8e-bbb5-e9c435113dd2/scratchpad/jqz/proto/`
with the two fit changes behind switches. The measuring script is
`/private/tmp/claude-501/-Users-kontoes-Code-shaper/002e2a58-3c43-4c8e-bbb5-e9c435113dd2/scratchpad/jqz/measure.mts`: it takes a checkout root, then
file paths, runs `brdLookFromBytes` (the real import, reading windows and both rail orders included), and prints each file's
three cuts, widest and typical miss and seconds. The founder's files stay in `~/Downloads` and are only ever read from there.

### 1. The twelve files through the real import (widest / typical miss, mm; run one after another for the seconds)

| File | Today (main 7fcd9a18) | With D-04 + D-05 at 1 mm |
|---|---|---|
| 92Log | Reverse Vee Nose 1/8" · Tri-Plane 1/2" panel 4 3/8" · Rolled Vee 7/16" — 1.89 / 0.58, 1.0 s | Flat Entry · **Continuous Belly 3/8" panel 2 9/16"** · Rolled Vee 7/16" — 2.14 / 0.71, 1.4 s |
| Scoop-Noserider | Blended Nose Concave 5/16" · Tri-Plane 1/4" panel 7 1/2" · Panel Vee 1/8" — 1.92 / 0.54, 0.6 s | Blended Nose Concave 5/16" · **Continuous Belly 3/16"** · Panel Vee 1/8" — 1.92 / 0.52, 0.7 s |
| quadtesting | Flat Entry · Tri-Plane 1/2" (panel 0") · Panel Vee 1/2" — 5.79 / 0.66, 1.1 s | Flat Entry · **Continuous Belly 1/2"** · Panel Vee 1/2" — 6.46 / 0.84, 1.2 s |
| SAtri | Flat · Flat · Spiral Vee 1/8" — 0.66 / 0.04 | unchanged |
| SAtwin | Flat · Early Double Concave 1/8" · Panel Vee 1/4" — 1.63 / 0.22 | unchanged |
| mid | Blended Nose Concave 1/2" · Flat · Panel Vee 3/16" — 0.85 / 0.09 | unchanged |
| testLB | Teardrop 7/16" · Flat · Flat — 2.39 / 0.34, 3.8 s | unchanged, 3.1 s |
| JFS_BigTwin | Flat · Flat · Panel Vee 1/8" — 0.70 / 0.36 | unchanged |
| 6'10 Widepoint Fwd Egg | Flat · Flat · Panel Vee 1/8" — 0.84 / 0.27 | unchanged |
| 6'2 Round Tail Double Concave | Teardrop 1/16" · Deep Single 1/8" · Double Concave Exit 1/8" — 0.95 / 0.27 | unchanged |
| 6'4 Double Wing Groveler | Flat · Deep Single 1/8" · Flat — 0.83 / 0.14 | unchanged |
| Fryer 5'7 Squash Flyer Twin | Blended Nose 1/16" · Deep Single 3/16" · Double Concave Exit 1/8" — 1.04 / 0.31 | unchanged |

All twelve take 13.4 s in total today and 13.3 s with the change. D-04 alone changes nothing (the Tri-Plane still wins
all three). D-05 alone puts a Flat Center on 92Log (2.74 / 1.03), not a belly. Both together are needed for D-06.

### 2. The margin (D-05): 1 mm kept

On the fit's own score (widest + mean, read sections and blends), the Tri-Plane was this much closer than the closest
bottom without one: 92Log 0.55 mm on the first fit and 0.06 mm on the refit with our rail's windows, Scoop 0.09 mm,
quadtesting 0.86 mm. On the other nine it was never closer. So:

| Margin | 92Log | Scoop | quadtesting |
|---|---|---|---|
| 0 or 0.25 mm | Tri-Plane | Tri-Plane | Tri-Plane |
| 0.5 mm | Tri-Plane | belly | Tri-Plane |
| 0.75 mm | belly | belly | Tri-Plane |
| 1 mm or 1.5 mm | belly | belly | belly |

The plan keeps the founder's 1 mm. It is the only figure listed that meets D-05's "rarest" on quadtesting too.
quadtesting's tail is a vee 1 1/8" deep, more than the Panel Vee's 1/2" can reach. Either center cut there stands in for the
missing vee depth, not for a tri-plane hull. Record it in the SUMMARY as a question for the founder: at 0.75 mm
quadtesting keeps its Tri-Plane, about 0.7 mm closer at the widest point.

### 3. What D-05 does to the app's own Tri-Plane round trips (the one deviation from D-07)

`lib/geometry/brd-bottom.test.ts` writes a Tri-Plane at its starting 1/8" depth to a file, reads it back and expects a vee
in the center. Three cases do this: the Shortboard alone, and the Shortboard and Mid-length with a Panel Vee. Read back from
a file, a 1/8" Tri-Plane and a Continuous Belly with a flat panel are a near tie: the belly scores 0.07 mm closer, 0.02 mm
farther and 0.20 mm farther in the three cases. D-05 gives every near tie to the belly, so all three come back as a
Continuous Belly at the same 1/8" depth, no further from the file than the written bottom. These three expectations are
re-pointed (Task 3). They are the only round trips that change. Every other cut alone, every other mix and every
moved-slider case comes back as today (measured: 50 of 53 pass unchanged).

The Tri-Plane is rare, not gone. A 7/16" or 1/2" Tri-Plane, alone or with a Panel Vee, on the Shortboard and the
Mid-length, comes back as a Tri-Plane 1.5 to 2.85 mm clear of the closest other bottom. At 3/8" and shallower it mostly
comes back as a panelled belly.

### 4. A rails round trip the belly fix breaks (the checkpoint, Task 2)

`lib/geometry/brd-rails.test.ts` "H4 (a log's soft 50/50 rail) goes rails-first" writes a flat-bottomed board with soft
50/50 rails and expects the import to read the rails first and bring back a flat bottom. Today the bottom-first pass reads
that rail as Rolled Belly Entry · Tri-Plane · Rolled Vee, 5.75 mm off at the widest. That is over the 4 mm that triggers the
rails-first try (`BRD_RAIL_FIRST_TRY_MM` in `lib/geometry/brd-rails.ts`, used at `lib/export/brd-fit-preview.ts` line 246),
and rails-first wins (0.83 against 6.25). With either D-04 or D-05, the bottom-first pass reads a panelled belly
instead, only 3.94 mm off, so rails-first is never tried and H4 fails. Measured fixes:
- a 3 mm trigger: H4 passes, every brd suite passes (except §3's three), and the twelve files read exactly as in §1
  (Scoop then tries rails-first and keeps bottom-first: 0.7 s to 1.4 s);
- trying rails-first always (0 mm): rejected, because it turns 92Log into Teardrop · Flat · Panel Vee with rolled rails,
  against the founder's own reading of that board.
The coordinator has said the rail question is out of scope, so this plan builds no rail change unless the founder picks
one at Task 2.

### 5. What already follows a belly's panel (proof only, no code)

`cutFoamOffParts` already lifts a belly from `cut.offStringer` (bottom.ts ~L863), so litres, the 3D board, the .brd export
and the floor check's rail form (it reads `cutFoamOff`) follow without a change. `cutPencilLines` (bottom-draw.ts ~L345)
already draws a `panel` line for any vee or belly over 0", and `cutLine` (bottom-print.ts ~L123) already prints
`; panel X off the stringer`. Only two readers test `kind === "vee"`: `markColumnsOf` and `marksOf` (bottom.ts ~L1423 and
~L1445). The schema already stores and bounds `offStringer` on every cut (0 to 12", design-snapshot.ts L557/L568), and
`updateBottomCut` re-keeps across marks for a double only. So the store and the schema don't change, and there is no
migration (D-02). BOTTOM's GUIDE has one card per cut, not one per slider, so no GUIDE test asks for a new card.

## House rules for the executor

- Never `cd` into a subfolder or worktree; use absolute paths and `git -C`. In a fresh worktree run `npx next typegen` before
  `tsc`. Browser runs use `PW_PORT=3141`. Commit messages in plain English for shapers (what changes on the board or the
  screen), sent with `git commit -F -`, ending with the Co-Authored-By line. Do not push. Leave the SUMMARY and the
  pictures uncommitted for the orchestrator.
- Rule 1: every formula stays in `lib/geometry/`; the panel works nothing out. Rule 2: every figure on screen and paper goes
  through `measure-display.ts`; no new 25.4.
- Tests type no expected figure. Expected values come from the app's own functions (`formatMark`, `cutFoamOff`,
  `bottomLayoutMarks`, `resolveCut`); inch inputs like `inchesToMm(3)` are fine. The founder's files are never copied,
  committed or named in a test (D-06).
- Record BASE first (`git -C <checkout> rev-parse HEAD`) on the SUMMARY's first lines. At the end,
  `git diff -U0 $BASE -- '*.test.ts' '*.spec.ts' ':!lib/geometry/brd-bottom.test.ts' ':!e2e/bottom-panel.spec.ts' ':!e2e/bottom-metric.spec.ts' ':!lib/geometry/brd-rails.test.ts' | grep -E '^-[^-]'`
  prints nothing. In those four files, quote every removed line in the SUMMARY with its reason. brd-rails.test.ts may change
  only if Task 2 picks `rewrite-h4`. `git diff --quiet $BASE -- lib/geometry/__fixtures__ e2e/*-snapshots` succeeds.
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: A belly's panel end to end: the Off Stringer slider to DATA's flat column, the drawing, the foam and paper</name>
  <files>components/bottom/bottom-controls.tsx, lib/geometry/bottom.ts, lib/geometry/bottom-draw.ts, lib/geometry/bottom-print.ts, lib/geometry/bottom-belly-panel.test.ts, lib/models/design-snapshot.test.ts, e2e/bottom-belly-panel.spec.ts, e2e/bottom-panel.spec.ts, e2e/bottom-metric.spec.ts</files>
  <behavior>
    - On every phase16 board, both bellies at their starting numbers have `offStringer` 0 and give no layout-mark column and no `panel` pencil line (D-02)
    - On the Shortboard, a Continuous Belly / Rolled Mid with offStringer = inchesToMm(3): bottomLayoutMarks has a `center:flat` column; each row where the cut is on reads exactly the cut's offStringer, and every other row is null (D-03)
    - The same for a Rolled Belly Entry at inchesToMm(2): a `nose:flat` column
    - bottomPencilLines gives that cut one `panel` line whose every point sits at ±offStringer across (D-03)
    - cutFoamOff of the panelled belly is 0 at every y ≤ offStringer, at every 1/2" station, and above 0 somewhere past it; the Shortboard's litres (summarizeDesign or the app's own litres call) differ from the 0" belly's (D-03)
    - Floor check: with Off Stringer 9" on a 1/2" Rolled Belly Entry, bottomFloorFlags flags no station whose railAt is ≤ 9", because the cut takes nothing there (D-03)
    - bottomPrintLines' center line for the panelled belly ends with `; panel ${formatMark(offStringer, system)} off the stringer.` in Imperial and Metric; at 0" the line is unchanged (D-03)
    - Snapshot (appended describe in design-snapshot.test.ts): a center belly with offStringer 3" and a nose belly with 2" round-trip key for key; a belly saved at 0" opens at 0" (D-02)
  </behavior>
  <action>
Record BASE (house rules) and start the SUMMARY with it.

RED: create `lib/geometry/bottom-belly-panel.test.ts` with the behaviour above. Build boards the way `bottom-trough.test.ts`
does (`phase16Boards()` and `designBottomBoard` with `buildOutline`, `designSideProfile(fields, LIVE_DESIGN_RULES)` and
`designFinPlacement`), and set the panel by spreading `offStringer: inchesToMm(x)` over `startingCut(...)`. Append the
snapshot describe to `lib/models/design-snapshot.test.ts` (append only), using the same parse path the trough block there
uses. Run them and watch them fail: the column and marks tests fail; the foam, pencil and print tests may already pass,
because those readers already follow (READ THIS FIRST §5). That is expected.

GREEN (D-01, D-03):
- `lib/geometry/bottom.ts`: in `markColumnsOf` and `marksOf`, a belly passes the panel test the vee passes today, i.e.
  `(cut.kind === "vee" || cut.kind === "belly")` with the same `BOTTOM_DATA_EDGE` and `< W` checks. A belly at 0" reads as
  today. Update the doc comment of `cutFoamOffParts` ("a vee or a belly lifts from Off Stringer: the Tri-Plane's flat panel,
  or a belly's") and of `markColumnsOf`.
- `lib/geometry/bottom-draw.ts` and `lib/geometry/bottom-print.ts`: change the comments only, to name a belly's panel beside
  the Tri-Plane's (PencilKind doc, cutPencilLines' and bottomPencilLines' docs, cutLine's comment). Their code already
  follows (§5).
- `components/bottom/bottom-controls.tsx` `cutRows`: push `"offStringer"` for a double, the Tri-Plane Hull Center or any
  belly (`cut.kind === "belly"`), in the same place in the row order. Update the doc comment's "Shown for" sentence. The
  existing `MARK_ROWS.offStringer` gives the label, 0" to 9", 1/16" steps, 1 mm in Metric, the "At the stringer" hint and
  the spoken name `Center Off Stringer` / `Nose Off Stringer` (D-01). No store or schema change (§5, D-02).
- `e2e/bottom-panel.spec.ts`: add `belly: ["Off Stringer", ...STATIONS, "Smoothness"]` to `ROWS`, map "Rolled Belly Entry"
  and "Continuous Belly / Rolled Mid" to `"belly"` in `KIND_OF`, and refresh the comment above `ROWS`. `e2e/bottom-metric.spec.ts`
  `cutFields`: the same rule as `cutRows`. That spec never opens a belly; it is kept as the panel's twin.

Tracer browser check: create `e2e/bottom-belly-panel.spec.ts`. Copy `dismissStrips`, `openBottom` (Shortboard preset) and
the retried pick from `e2e/bottom-trough.spec.ts`, pointed at the CENTER card (`Center Cut`, `[data-bottom-card="center"]`,
`showBottomSection(page, "center")` before every reach into it), plus `bottomFloorScanSettled` and the no-break-space fold.
Do not call `forgetOpenBoardOnEveryLoad`, because this spec reloads on purpose. Run on `desktop` and `android`, skip `iphone`.
1. Pick "Continuous Belly / Rolled Mid". The slider `BOTTOM_COPY.sliderName("center", BOTTOM_COPY.offStringer)` exists and
   its label line reads 0". There is no `[data-bottom-pencil="panel"]`, and DATA has no `[data-bottom-marks]` table.
   Picture `belly-panel-0-<project>.png` (VIEWER, the Off Stringer row scrolled into view).
2. Focus the slider by its exact spoken name and press ArrowRight 48 times (1/16" a press, from 0" to 3"). The label reads
   3" (parsed with `parseImperial`). A `panel` pencil path is drawn. Picture `belly-panel-3-<project>.png`. In DATA a
   `center:flat` column exists and every filled cell reads the slider's figure. On desktop also take
   `belly-panel-data-desktop.png`.
3. Reload. Poll until the page is back on BOTTOM; the Center Off Stringer label still reads 3" (D-02, through the kept open
   board, which reads the same schema as a save and a board file).
Save pictures with `testInfo.outputPath(...)`, copy the five into this task folder's `pictures/`, and look at each one
(Read the image) before calling the drawing done: the dotted panel line should run parallel to the stringer, 3" out.

GREEN gates; commit, e.g. "A belly bottom gets an Off Stringer slider: a flat panel each side of the stringer, the belly
rolling from its edge to the rail, on BOTTOM, in DATA and on paper".
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/bottom-belly-panel.test.ts lib/geometry/bottom.test.ts lib/geometry/bottom-draw.test.ts lib/geometry/bottom-print.test.ts lib/geometry/bottom-trough.test.ts lib/models/design-snapshot.test.ts components/bottom && npx tsc --noEmit && PW_PORT=3141 npx playwright test e2e/bottom-belly-panel.spec.ts e2e/bottom-panel.spec.ts --project=desktop --project=android</automated>
  </verify>
  <done>Both bellies show Off Stringer; at 0" every reader is as before, and at 3" the panel line, DATA's flat column, the foam, the floor check and the printed sentence follow; the belly's figure survives a reload; the unit files, tsc and both browser specs pass on desktop and android; five pictures are in pictures/ and were looked at; one commit.</done>
</task>

<task type="checkpoint:decision" gate="blocking">
  <name>Task 2: The founder's call on a log's soft rail (H4), before the fit changes</name>
  <decision>How the .brd import treats a log's soft 50/50 rail over a flat bottom once a belly can carry a flat panel (READ THIS FIRST §4)</decision>
  <context>The belly fix (D-04, D-05) makes the bottom-first pass read a soft rolled rail as a panelled belly only 3.94 mm
off. That is under the 4 mm that sets off the rails-first try, so the existing round trip "H4 (a log's soft 50/50 rail)
goes rails-first" fails. The coordinator said the rail question is out of scope, so this plan makes no rail change on its
own. The orchestrator may answer this from the founder before the executor starts. The answer then goes in the executor's
prompt and this checkpoint is passed straight through.</context>
  <options>
    <option id="gate-3mm">
      <name>Try rails-first from 3 mm instead of 4 mm</name>
      <pros>One constant (`BRD_RAIL_FIRST_TRY_MM` in lib/geometry/brd-rails.ts, and the "4 mm" in its header doc). Measured: H4 comes back flat as today, every brd suite passes except §3's three, and the twelve files read exactly as in §1.</pros>
      <cons>It touches the rail ordering, which the coordinator ruled out of scope. Scoop-Noserider's import takes 0.7 s longer (it tries rails-first and keeps bottom-first).</cons>
    </option>
    <option id="rewrite-h4">
      <name>Accept it and re-point H4</name>
      <pros>No rail code changes.</pros>
      <cons>A log with soft 50/50 rails and a flat bottom then imports as a Rolled Belly Entry and a panelled Continuous Belly with the rails left at the bottom-first fit, which is what quick 261113-kvo fixed. The founder's own longboard file (testLB) is not affected: its rails-first still wins.</cons>
    </option>
    <option id="stop">
      <name>Stop after Task 1</name>
      <pros>The BOTTOM slider ships; the import is left for its own task.</pros>
      <cons>92Log and Scoop still import as Tri-Planes (D-04 to D-06 not delivered).</cons>
    </option>
  </options>
  <resume-signal>Select: gate-3mm, rewrite-h4, or stop</resume-signal>
</task>

<task type="auto" tdd="true">
  <name>Task 3: The .brd import moves a belly's panel and reaches for the Tri-Plane last; the twelve files measured; the gates</name>
  <files>lib/geometry/brd-bottom.ts, lib/geometry/brd-bottom.test.ts, lib/export/brd-fit-preview.ts, lib/export/brd-fit-preview.test.ts (and, only under gate-3mm, lib/geometry/brd-rails.ts; only under rewrite-h4, lib/geometry/brd-rails.test.ts)</files>
  <behavior>
    - chooseBrdBottom on synthetic candidates (specs built with startingCut, values set by hand): a Tri-Plane-center candidate 0.99 mm below the closest other loses; at exactly 1 mm below, it wins; a Tri-Plane seed with another candidate 0.1 mm behind loses (seed stickiness never saves a Tri-Plane); with no Tri-Plane in the pool it returns exactly what today's rule returns (the seed when within BRD_BOTTOM_EXTRA_CUT_MM and among the fewest cuts, else the fewest cuts' closest) (D-05)
    - Exact sections (the test file's own `sectionsOf`) of a 3/8" Continuous Belly with offStringer 1 1/2" on the Shortboard and the Mid-length: fitBottomToBrd returns a belly center with offStringer within 1/16" of 1 1/2" and closeness.largest under 0.1 mm (planner measured 1.500" and 0.00 on both) (D-04)
    - Exact sections of a Tri-Plane at its starting 1/8": the center comes back as a belly with offStringer > 0 (measured 4" and 5 1/16"), the near tie going to the belly (D-05)
    - Read back from a written file (the test file's own builder and fitText): a 1/2" Tri-Plane, alone and with a Panel Vee, on the Shortboard and the Mid-length, comes back as a Tri-Plane (measured 2.2 to 2.85 mm clear of any other) (D-05: rarest, not gone)
    - In the existing round trips, a written Tri-Plane center is expected back as a belly at the same depth; every other kind, depth and closeness check is unchanged (READ THIS FIRST §3)
    - brdFitSheet's Across row names a belly's Off Stringer (`Off Stringer 3"`) when it is over 0", and reads `—` at 0" as today
  </behavior>
  <action>
Before any code, act on Task 2's answer: `stop` ends the plan here (write the SUMMARY with Task 1 only); `gate-3mm` adds
the one constant change below; `rewrite-h4` adds the H4 re-pointing below.

RED: append the new describes to `lib/geometry/brd-bottom.test.ts` (choice rule, belly panel on exact sections, Tri-Plane
near tie on exact sections, deep Tri-Plane read back), and the Across-row case to `lib/export/brd-fit-preview.test.ts`.
Build the second case by spreading a panelled belly into an existing look's `bottom.bottom.center`. Re-point the existing
round trips: in `check`, the expected center kind for a written "Tri-Plane Hull Center" becomes "belly", through a small
named helper with a comment citing D-05 and READ THIS FIRST §3. The depth and "how close" checks stay as they are. Run and
watch them fail.

GREEN, `lib/geometry/brd-bottom.ts` (Rule 1):
- Export `BRD_BOTTOM_TRI_PLANE_MM: Mm = mm(1)`, documented like its neighbours: the Tri-Plane Hull Center is the rarest
  bottom (the founder, 2026-11-16) and is kept only when it scores at least this much closer than the closest bottom
  without one.
- In refine's `marks` list, a belly (`kind === "belly"`) gets `["offStringer"]` exactly as the Tri-Plane does, swept over
  the same grid (every 1/4" over 0" to 9", then every 1/16" within reach of the best), no keep, and a move only when it gains
  `BRD_BOTTOM_MOVE_GAIN_MM` (D-04). `marksKey` already carries offStringer, so a moved panel rebuilds its base.
- Export `chooseBrdBottom<T extends { specs: Record<BottomSectionKey, BottomCutSpec>; value: number }>(pool: readonly T[], seed: T): T`.
  Candidates whose center is "Tri-Plane Hull Center" stay in the pool only when the pool holds no other candidate, or when
  the closest of them scores at most the closest other's value minus `BRD_BOTTOM_TRI_PLANE_MM`. Otherwise they are dropped
  before today's rule runs. Today's rule, moved here unchanged: closest, the near set within `BRD_BOTTOM_EXTRA_CUT_MM`, the
  fewest cuts, the seed kept when it is near and among the fewest, else the fewest cuts' closest (D-05: every other name
  keeps today's rules). `fitBottomToBrd` calls it in place of its last four lines, passing `best` as the seed.
- Header doc: add D-04 to step 4 ("its across marks": a belly's Off Stringer like the Tri-Plane's), and add to step 5 the
  Tri-Plane rule with the measured figures of §2.

`lib/export/brd-fit-preview.ts` `acrossWords`: a belly over 0" returns `mark(w.offStringer, spec.offStringer)`, otherwise
the `noValue` it returns today. Update the doc line.

Only under `gate-3mm`: `BRD_RAIL_FIRST_TRY_MM` becomes `mm(3)` in `lib/geometry/brd-rails.ts`, and its header doc's
"more than 4 mm" becomes 3 mm, with §4's measured reason in one sentence. Only under `rewrite-h4`: H4's test is re-pointed
to what the import now reads (bottom-first; the cuts and rail ratios read off the look, never typed), and its name says why.

GREEN gates. Then measure D-06 through the real import with the planner's script, from the main checkout as cwd and with the
worktree's own tsconfig:
`npx tsx --tsconfig <worktree>/tsconfig.json /private/tmp/claude-501/-Users-kontoes-Code-shaper/002e2a58-3c43-4c8e-bbb5-e9c435113dd2/scratchpad/jqz/measure.mts <worktree> ~/Downloads/<each of the twelve files>`.
If the scratch script is gone, rewrite it in your own scratchpad: per file, `brdLookFromBytes(bytes, name)`, then the three
cuts' names, depths and offStringer, then `look.bottom.closeness.largest` / `typical`. Run the twelve one after another (not
in parallel) so the seconds compare. Check 92Log and Scoop-Noserider have a Continuous Belly / Rolled Mid center. Compare
every row with §1 and explain any difference in the SUMMARY.

The gates, each read to its exit line:
- `npx vitest run --maxWorkers=6` (the whole unit suite: every golden, litres pin, GUIDE test, .brd export and brd suite;
  brd-fit's "finishes the Longboard well inside a second" times only the outline and rocker fit, and must still pass),
  `npx tsc --noEmit`, `npm run lint`.
- `PW_PORT=3141 npx playwright test e2e/bottom-belly-panel.spec.ts e2e/bottom-*.spec.ts e2e/phone-bottom.spec.ts e2e/summary-bottom-page.spec.ts --project=desktop --project=android`,
  then `PW_PORT=3141 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` (a changed baseline is a finding, never a re-record).
- The house rules' two `git diff` gates against BASE.

Commit, e.g. "Opening a .brd now finds a belly bottom's flat panel and reaches for the Tri-Plane Hull Center last".

SUMMARY in plain English for the founder: what the slider does to the board; the twelve-file table before and after (§1 as
the before, your own run as the after); the margin table (§2) and the quadtesting question; that an app-drawn 1/8"
Tri-Plane now comes back from its own file as a panelled Continuous Belly, while a 7/16" or deeper one comes back as a
Tri-Plane (§3); Task 2's answer and what it did; every removed test line in the four allowed files with its reason.
  </action>
  <verify>
    <automated>npx vitest run --maxWorkers=6 && npx tsc --noEmit && npm run lint && PW_PORT=3141 npx playwright test e2e/bottom-belly-panel.spec.ts e2e/bottom-panel.spec.ts --project=desktop --project=android && git diff --quiet "$(head -20 .planning/quick/261116-jqz-a-belly-bottom-gets-an-off-stringer-slid/261116-jqz-SUMMARY.md | grep -oE '[0-9a-f]{40}' | head -1)" -- lib/geometry/__fixtures__ e2e/*-snapshots</automated>
    <human-check>The founder opens 92Log.brd and Scoop-Noserider.brd on the live site after the push: each comes in with a Continuous Belly / Rolled Mid center, and 92Log's shows its Off Stringer on BOTTOM.</human-check>
  </verify>
  <done>A belly's Off Stringer moves in the fit; the Tri-Plane is kept only when 1 mm closer; 92Log and Scoop-Noserider import with a belly center; the twelve-file table is in the SUMMARY; the whole unit suite, tsc, lint, the BOTTOM browser specs and the desktop baselines pass; no fixture or baseline changed; one commit.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| stored board → `bottomCutSchema` | a saved board, a board file or the browser's kept open board can carry any belly `offStringer` |
| a `.brd` file → `fitBottomToBrd` | any file's sections drive the fit's search and its choice |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-jqz-01 | Tampering | belly `offStringer` in `bottomCutSchema` | low | accept | Already bounded 0 to 12" by `bottomAcrossSchema` (a bad cut falls back to the section's default, as today). A panel wider than the rail lifts nothing at that station (`W > F` in `cutFoamOffParts`), so no NaN or negative foam is possible; Task 1's 9" floor test exercises it |
| T-jqz-02 | Denial of service | the fit's belly sweep | low | mitigate | The sweep is the Tri-Plane's existing bounded grid (37 coarse + at most 6 fine trials per belly per round, 3 rounds); the twelve files measured 13.4 s → 13.3 s in total; Task 3 re-measures the seconds |
| T-jqz-03 | Repudiation | goldens, litres pins, baselines, round trips | medium | mitigate | No fixture or baseline re-recorded (`git diff --quiet` gate); removed test lines allowed only in four named files, each quoted with its reason in the SUMMARY |
</threat_model>

<verification>
- `npx vitest run --maxWorkers=6` green; `npx tsc --noEmit` and `npm run lint` clean.
- `e2e/bottom-belly-panel.spec.ts` green on desktop and android; the existing BOTTOM specs and `desktop-baseline.spec.ts` green.
- The house rules' two `git diff` gates against BASE hold.
- The SUMMARY's twelve-file table shows 92Log.brd and Scoop-Noserider.brd with a Continuous Belly / Rolled Mid center.
</verification>

<success_criteria>
- On the Shortboard, a Continuous Belly / Rolled Mid with Off Stringer 3" draws a panel line 3" out, DATA's Center flat
  column reads 3" wherever the cut is on, the printed sheet says "panel 3" off the stringer", and a reload keeps it.
- A belly at 0" is exactly today's belly everywhere.
- 92Log.brd and Scoop-Noserider.brd import with a belly center; the other nine read as today (quadtesting as §1 says).
- Five pictures in the task folder; the SUMMARY carries the margin question and Task 2's answer.
</success_criteria>

<output>
Create `.planning/quick/261116-jqz-a-belly-bottom-gets-an-off-stringer-slid/261116-jqz-SUMMARY.md` when done (do not commit it).
</output>
