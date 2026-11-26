---
phase: quick-261126-czw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/bottom.ts
  - lib/geometry/bottom-rail-roll.test.ts
  - components/bottom/bottom-controls.tsx
  - e2e/bottom-rail-roll.spec.ts
  - lib/geometry/brd-bottom.ts
  - lib/geometry/brd-bottom.test.ts
  - lib/export/brd-fit-preview.ts
  - lib/export/brd-look.test.ts
  - lib/models/design-snapshot.ts
  - lib/models/design-snapshot.test.ts
  - components/summary/bottom-sheet-fit.ts
  - components/summary/bottom-sheet-fit.test.ts
  - .planning/quick/261126-czw-fix-four-code-review-points-on-the-rail-/261126-czw-scripts.tar.gz
  - .planning/quick/261126-czw-fix-four-code-review-points-on-the-rail-/261126-czw-SUMMARY.md
autonomous: true
requirements: [D-01, D-02, D-03, D-04]

estimate:
  tokens: 120000
  raw_tokens: 120000
  tasks: 3
  confidence: low
  # estimate-calibration: factor 1, 0 samples. Four small code changes (about 60 lines of product code over six files), a test
  # per point, the twelve sample files and the 296-board grid measured once after (the "before" is v2f's archived after-run,
  # valid because lib/ is byte-for-byte unchanged since v2f's 7707ee85), the whole unit suite and four browser specs.

must_haves:
  truths:
    - "On BOTTOM, a Teardrop, Blended or Slight Single Concave Entry nose at Depth 0 shows its Rail Roll row greyed and its slider disabled, still reading the roll the shaper set; moving Depth above 0 brings the row back live with that same roll, untouched (D-01)"
    - "Dragging Depth to 0 never deletes or rewrites the stored roll: the saved board keeps its railRoll key at Depth 0, and a reload at Depth 0 keeps it (D-01)"
    - "While Depth is 0, everything that asks whether there is a roll for a shaper's reason answers no: the resolved cut's railRoll reads 0, so BOTTOM's floor note, DATA's floor note, the printed cut sentence, the printed GUIDE line and the .brd preview's Across cell all treat the nose as unrolled; the foam, litres, rails, 3D and export are unchanged because a Depth-0 cut already cut nothing (D-01)"
    - "Opening a .brd: the founder's 0.05 mm tie applies only when the try replaces a belly (a Rolled Belly Entry nose taken to a nose concave, or a centre Continuous Belly taken to flat); a centre Tri-Plane Hull Center (the one centre vee) replaced is held to the fit's ordinary rules. The twelve files open to the same digest; every grid board whose answer changes is listed, and each is a centre vee now kept (D-02)"
    - "A stored Rail Roll is read 0 to 1/2\" (BOTTOM_MARK_RANGES_IN.railRoll); past it the key is dropped and the cut and the rest of the board are kept; the slider's own top in Imperial and in Metric is kept; Depth's own 1\" outer bound is unchanged (D-03)"
    - "polishBrdBottom measures today's bottom once, not twice, and every file and grid board opens to the same digest apart from D-02's listed boards (D-04)"
    - "The printed bottom page's top-view room is found by a bounded search that gives exactly the dot-by-dot answer on every board the unit sweeps and the two printed-page browser specs cover, and never goes below half the picture's own room (D-04)"
  artifacts:
    - path: lib/geometry/bottom.ts
      provides: "railRollInUse (the roll a cut actually carries: 0 at Depth 0), resolveCut reading through it; railRollOf and tidyRailRoll unchanged (depth-blind, so the stored roll is kept)"
      contains: "export function railRollInUse"
    - path: components/bottom/bottom-controls.tsx
      provides: "MarkRow's disabled pass-through; the Rail Roll row disabled at Depth 0 and reading the stored roll"
      contains: "disabled"
    - path: lib/geometry/brd-bottom.ts
      provides: "chooseBrdNoseRetry's tie for a belly only; polishBrdBottom keeping its closeness results"
      contains: "centreBelly"
    - path: lib/models/design-snapshot.ts
      provides: "the Rail Roll's own reader bound at the slider's 1/2\""
      contains: "BOTTOM_MARK_RANGES_IN.railRoll"
    - path: components/summary/bottom-sheet-fit.ts
      provides: "bottomTopViewRoomThatFits (the bounded search) and BOTTOM_TOP_VIEW_MIN_ROOM_SHARE (the floor)"
      contains: "export function bottomTopViewRoomThatFits"
  key_links:
    - from: "lib/geometry/bottom.ts resolveCut"
      to: "railRollInUse(section, spec)"
      via: "the resolved cut's railRoll, read by the floor notes (bottom-controls.tsx, bottom-data.tsx), the printed sentence (bottom-print.ts) and the printed GUIDE line (bottom-sheet-fit.ts noteFor)"
      pattern: "railRoll: railRollInUse\\(section, spec\\)"
    - from: "lib/export/brd-fit-preview.ts acrossWords"
      to: "railRollInUse(key, spec)"
      via: "the preview's nose Across cell"
      pattern: "railRollInUse\\(key, spec\\)"
    - from: "components/summary/bottom-sheet-fit.ts bottomSheetLayout"
      to: "bottomTopViewRoomThatFits"
      via: "the top-view room once the tables have left the page"
      pattern: "bottomTopViewRoomThatFits\\("
---

<objective>
Fix the four code-review points on the Rail Roll before the push, exactly as the founder ruled ("fix 1-4. leave 5, then push";
point 5, the Teardrop's roll starting at Off Rail, is left as it is and appears nowhere in this plan):

- D-01: a nose concave at Depth 0 cuts nothing, roll included, so its Rail Roll row greys out (the page's own disabled look)
  and every "is there a roll" question a shaper sees answers no, while the stored roll is kept and comes back untouched.
- D-02: the founder's concave tie in `chooseBrdNoseRetry` applies to a belly replaced, never a vee.
- D-03: the board reader holds a stored roll to BOTTOM's own 0 to 1/2".
- D-04: two efficiency points with no change in any answer: `polishBrdBottom` stops measuring today's bottom twice, and the
  printed page's top-view room is searched instead of stepped down a dot at a time, with a floor.

Purpose: these land on main before the founder pushes. Identity (CONTEXT): every saved board, preset and opened file draws,
counts litres, prints and exports exactly as on main today, except D-01's words and greyed row on a Depth-0 nose concave with a
roll, D-02's boards whose centre vee a roll used to replace, and D-03's stored rolls over 1/2".

Output: the code and a test per point; the twelve files and the 296-board grid measured after; a SUMMARY in a shaper's words.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/quick/261126-czw-fix-four-code-review-points-on-the-rail-/261126-czw-CONTEXT.md
@.planning/quick/261125-mf8-add-a-rail-roll-to-the-nose-concaves-on-/261125-mf8-SUMMARY.md
@.planning/quick/261125-v2f-open-a-board-file-brings-back-a-nose-con/261125-v2f-SUMMARY.md
@.planning/quick/261125-v2j-rail-roll-shaping-line-on-the-nose-conca/261125-v2j-SUMMARY.md

Code the executor reads (line numbers on main bfae1b88):
- lib/geometry/bottom.ts: `BOTTOM_MARK_RANGES_IN` (~225), `ResolvedCut.railRoll` (~412), `resolveCut` (~454-484),
  `takesRailRoll` / `railRollOf` / `tidyRailRoll` (~491-511), `cutFoamOffParts` (~932: `cut.depth <= 0` returns nothing)
- components/bottom/bottom-controls.tsx: `MARK_ROWS` (~104), `cutRows` (~131), the floor note call (~292-297),
  `BottomSectionCard`'s row map (~412-445), `MarkRow` (~848-889)
- components/design/slider-row.tsx: `SliderRow`'s `disabled` prop (dims the row to `opacity-40` and disables the slider)
- components/outline/outline-controls.tsx ~378-440: the house pattern, TEMPLATE's Tail Block, Depth and Tail Angle rows greyed
  with `disabled` and no words
- lib/geometry/brd-bottom.ts: the fast scorer's `prepare` (~706: a cut at Depth 0 is flat before its roll is read),
  `chooseBrdNoseRetry` (~1332-1362), `polishBrdBottom` (~1390-1440)
- lib/export/brd-fit-preview.ts `acrossWords` (~1078-1094)
- lib/models/design-snapshot.ts: header rule 14's Rail Roll sentence (~178-184), the bottom bounds comment (~559-566),
  `bottomDepthSchema` (~567), `bottomCutSchema`'s `railRoll` (~595)
- components/summary/bottom-sheet-fit.ts: `bottomTopViewBox` (~67), `pageHeightWithoutTables` (~268), `PAGE.pictureScale`
  (~221), the room loop (~373-382), `bottomSheetSpare` (~412)
- Tests to extend: lib/geometry/bottom-rail-roll.test.ts (`noseBottom`, `NOSE_CONCAVES`, `PRESETS`, `ROLL`; the Depth-0 case
  ~316), e2e/bottom-rail-roll.spec.ts, lib/geometry/brd-bottom.test.ts (the chooser describe ~1021), lib/export/brd-look.test.ts
  (the mf8 round trip ~146-186), lib/models/design-snapshot.test.ts (the Rail Roll describe ~1659-1737),
  components/summary/bottom-sheet-fit.test.ts (`pageSpareAt`, `naturalRoom` ~419-422; the rolled sweep ~511; the split's reach
  `fitting` / `over` ~718-843)
</context>

## D-01 route: every reader of the roll, and what each does

The route is the one CONTEXT suggests: a new pure `railRollInUse(section, spec)` in `lib/geometry/bottom.ts` returns
`railRollOf(section, spec)` when `spec.depth > 0` and `mm(0)` otherwise, and `resolveCut` reads the roll through it. The
stored key and the two depth-blind helpers stay exactly as they are, which is what keeps the roll.

| Reader | Reads | Route |
|---|---|---|
| `resolveCut` (bottom.ts ~482) | spec | CHANGE: `railRoll: railRollInUse(section, spec)` |
| `cutFoamOffParts` / `railRollLift` (bottom.ts ~910-954) | resolved | none needed: a Depth-0 cut already returns nothing at ~936 |
| fast scorer `prepare` / `fullParts` (brd-bottom.ts ~689-730) | resolved | none: Depth 0 is flat before the roll is read; unit depth zeroes the roll |
| BOTTOM floor note (bottom-controls.tsx ~296) | resolved | follows `resolveCut`: no roll at Depth 0 |
| DATA floor note (bottom-data.tsx ~105) | resolved | follows `resolveCut` |
| printed cut sentence (bottom-print.ts ~106) | resolved | follows `resolveCut` (and `cutIsOn` already leaves a Depth-0 cut off the page) |
| printed GUIDE line (bottom-sheet-fit.ts ~248 `noteFor`) | resolved | follows `resolveCut` (notes exist only for printed cuts) |
| .brd preview Across cell (brd-fit-preview.ts ~1089) | spec | CHANGE (Task 2): `railRollInUse(key, spec)` |
| BOTTOM's Rail Roll row value (bottom-controls.tsx `MarkRow value`) | resolved | CHANGE: reads the stored `railRollOf(section, spec)`, so the greyed row still shows the roll that comes back |
| `railRollOf` itself, `tidyRailRoll` (bottom.ts), the store's `updateBottomCut` (design-store.tsx ~1540), the board reader (design-snapshot.ts ~604) | spec | UNCHANGED, depth-blind on purpose: Depth 0 never deletes the key |
| tie check in `chooseBrdNoseRetry` (brd-bottom.ts ~1354) | spec | UNCHANGED: every try's nose is at least 1/16" deep (the polish holds Depth to 1/16"-1/2", the fresh start is 1/16", the dish seed at least 1/16", and the fit's own concave is used only when its depth > 0), so Depth 0 never reaches it |
| retry start (brd-bottom.ts ~1405-1408) | spec | UNCHANGED: guarded by `today.nose.depth > 0` already |

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: a nose concave at Depth 0 greys its Rail Roll and keeps it, from the maths to the screen (D-01)</name>
  <files>lib/geometry/bottom.ts, lib/geometry/bottom-rail-roll.test.ts, components/bottom/bottom-controls.tsx, e2e/bottom-rail-roll.spec.ts</files>
  <read_first>The D-01 route table above; lib/geometry/bottom.ts ~402-511 and ~926-938; components/bottom/bottom-controls.tsx ~95-140, ~175-186, ~357-445, ~836-889; components/design/slider-row.tsx (the `disabled` prop); components/outline/outline-controls.tsx ~378-440; lib/geometry/bottom-rail-roll.test.ts ~55-110 and ~300-331; e2e/bottom-rail-roll.spec.ts whole.</read_first>
  <behavior>
    - Unit (bottom-rail-roll.test.ts, a new case beside "a nose concave with Depth 0 is not there"): for every preset and each of the three NOSE_CONCAVES, with `noseBottom(board, name, { depth: mm(0), railRoll: ROLL })`: `resolveBottom(...).nose.railRoll` is 0; the stored spec still has `railRoll === ROLL`; `railRollOf("nose", stored.nose)` is ROLL; `railRollInUse("nose", stored.nose)` is 0; `tidyRailRoll("nose", stored.nose)` returns the very same object with the key; `bottomPrintCuts(resolved)` (from ./bottom-print) holds no nose entry; and the same spec with Depth put back to 1/8" resolves `railRoll` to exactly ROLL again.
    - Unit: `railRollInUse` equals `railRollOf` for every depth above 0 (1/64", 1/8", 1/2") on the three nose concaves, and is 0 on a cut that takes no roll at any depth.
    - Browser (e2e/bottom-rail-roll.spec.ts, a new test in the existing describe, so iPhone stays skipped by its beforeEach): Shortboard, NOSE a Blended Nose Concave, Rail Roll taken to 1/8" (eight ArrowRight presses at 1/64") and its line read; focus the Nose Depth slider (`BOTTOM_COPY.sliderName("nose", BOTTOM_COPY.depth)`) and press Home: the Rail Roll slider is `toBeDisabled()` and its line still reads the same `formatBottomDepth` figure; a reload at Depth 0 keeps that figure and the slider still disabled; press End on Depth: the Rail Roll slider is `toBeEnabled()` and reads the same figure.
  </behavior>
  <action>
Per D-01, in lib/geometry/bottom.ts add and export `railRollInUse(section, spec: Pick<BottomCutSpec, "name" | "railRoll" | "depth">): Mm`, right after `railRollOf`: the stored roll through `railRollOf` when `spec.depth > 0`, else `mm(0)`. Its doc comment says, in the file's voice, that a nose concave at Depth 0 cuts nothing, roll included (`cutFoamOffParts`), so the roll it carries is none, while the stored roll is kept (`railRollOf` and `tidyRailRoll` never read the depth, the founder's 2026-11-26 ruling, quick 261126-czw, D-01). In `resolveCut` set `railRoll: railRollInUse(section, spec)`, and update the `ResolvedCut.railRoll` field comment (~412) to say it reads 0 while the cut's Depth is 0. Do not change `railRollOf`, `tidyRailRoll`, `takesRailRoll` or `cutFoamOffParts`; the foam is already none at Depth 0, so no board changes.

In components/bottom/bottom-controls.tsx give `MarkRow` an optional `disabled?: boolean` prop passed straight to `SliderRow`'s `disabled` (the lock still greys it on its own inside `SliderRow`). In `BottomSectionCard`'s row map, for the `railRoll` row pass `disabled={resolved.depth <= 0}` and `value={railRollOf(section, spec)}` (import `railRollOf` from the geometry); every other row keeps `value={resolved[row]}` and no `disabled`. The greyed row therefore still reads the roll the shaper set, and it is the house look: `SliderRow`'s `opacity-40` with its slider disabled, exactly TEMPLATE's Tail Block, Depth and Tail Angle rows. Add no words under the row: the page's existing disabled look carries none (D-01). Amend the `BottomControls` doc comment's "each row reads the RESOLVED cut" sentence to add that the Rail Roll row reads the stored roll and greys while Depth is 0, so dragging Depth back brings it back as it was. The floor note call (~292-297) and components/bottom/bottom-data.tsx need no edit: both read `resolvedBottom[section].railRoll`, which now answers no at Depth 0.

Write the two unit cases and the browser test from `<behavior>` first and watch the unit ones fail (`railRollInUse` missing, the resolved roll non-zero), then make them pass. Every expected figure is the app's own (`formatBottomDepth`, `inchesToMm`, `BOTTOM_DEPTH_STEP_IN`); no number is hand-typed. Commit: `fix(quick-261126-czw): BOTTOM: a nose concave's Rail Roll greys out while its Depth is 0 and comes back as it was, since a concave that deep cuts nothing`.

Worktree setup before the browser run: if the worktree has no node_modules, hardlink main's (`rsync -a --link-dest=/Users/kontoes/Code/shaper/node_modules /Users/kontoes/Code/shaper/node_modules/ <worktree>/node_modules/`); run `npx next typegen` if route types are missing. Never cd into a subfolder; use absolute paths and `git -C`.
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/bottom-rail-roll.test.ts && PW_PORT=3158 npx playwright test e2e/bottom-rail-roll.spec.ts --project=desktop --project=android</automated>
  </verify>
  <done>Both unit cases and the new browser test pass with the existing ones (desktop and Android); on BOTTOM a Depth-0 nose concave's Rail Roll is greyed and disabled, still showing the shaper's roll, and live again with the same roll above 0; the stored key survives Depth 0 and a reload; one commit.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: the concave tie for a belly only, one measurement fewer, and the preview's Across cell at Depth 0 (D-02, D-04, D-01)</name>
  <files>lib/geometry/brd-bottom.ts, lib/geometry/brd-bottom.test.ts, lib/export/brd-fit-preview.ts, lib/export/brd-look.test.ts</files>
  <read_first>lib/geometry/brd-bottom.ts ~1328-1440 (the chooser and the polish, docstrings included); lib/geometry/brd-bottom.test.ts ~1021-1080; lib/export/brd-fit-preview.ts ~1075-1095; lib/export/brd-look.test.ts ~140-190; the v2f archive's README.txt once unpacked (below).</read_first>
  <behavior>
    - Unit (brd-bottom.test.ts, the chooser describe, using its own `cut`, `flat`, `at`, `T`, `TIE`, `EXTRA`, `rolled`): today a Flat Entry over a Tri-Plane Hull Center (the one centre vee): the rolled concave over a flat centre (the same cut count) at `T + 0.8 * TIE` keeps today, and at `T - 1.04 * EXTRA` wins.
    - Unit: today a Flat Entry over a Continuous Belly / Rolled Mid: the rolled concave over a flat centre at `T + 0.8 * TIE` wins and at `T + 1.2 * TIE` keeps today (the tie still stands for a centre belly).
    - Unit (brd-look.test.ts, beside the mf8 round trip): take that test's opened look, copy it with the fitted nose's `depth` set to `mm(0)` and its `railRoll` kept, and `brdFitSheet` on the copy gives the nose Across cell Off Rail's words alone (`${offRail} ${formatMark(nose.offRail, system)}`), in both systems; on the unchanged look it still names the roll.
  </behavior>
  <action>
Per D-02, in `chooseBrdNoseRetry` replace the centre-lift flag that counts a belly or a vee with `centreBelly = centreKind === "belly"`, and make `replacesBelly` read it: the tie then applies only when today's nose is a belly and the try's a nose concave, or today's centre a belly and the try's flat. A centre vee replaced (the Tri-Plane Hull Center is the one centre vee) is held to the ordinary bars. Leave the tie's own roll check (`railRollOf("nose", t.specs.nose) > 0`) and every other bar as it is (the route table says why Depth 0 never reaches it). Fix the docstring's "today's centre a belly or a vee and the try's flat" to "a belly", citing the founder's ruling ("concave in the nose is super common and should win", spike 007 / quick v2f, about a roll read as a belly) and quick 261126-czw.

Per D-04, in `polishBrdBottom` measure each of `polished` and `bottom` once: keep `close(polished)` and `close(bottom)` in two constants, choose `today` from their widest-plus-typical figures with the same `<= ... + NOISE` comparison, and take `todayClose` as the chosen one's result instead of calling `close(today)` again. The `shown` helper stays for the tries. `todayTry.shown` stays `todayClose.largest + todayClose.typical`. Every answer must be identical (`measureBrdBottom` is pure); add a short comment that the closeness of the chosen bottom is reused, one measurement fewer per file (quick 261126-czw, D-04).

Per D-01 (its last reader), in lib/export/brd-fit-preview.ts `acrossWords` read `railRollInUse(key, spec)` in place of `railRollOf(key, spec)` (import it from the geometry; drop the `railRollOf` import if nothing else uses it), and add "and its Depth above 0" to the doc comment's roll clause.

Write the three behaviours as tests first and see the vee case fail on today's chooser and the Depth-0 Across case fail on today's preview; then change the code.

Measure (D-02 asks it, D-04 must show no change). Lib is byte-for-byte unchanged between v2f's 7707ee85 and this plan's base (checked at plan time; confirm `git -C <worktree> diff --quiet 7707ee85 <BASE> -- lib` exits 0, BASE being the worktree's starting commit), so v2f's archived after-runs are this task's "before": `t12-after` for the twelve files and `grid-after` for the 296 boards. If that check does not exit 0, take fresh before-runs from a temporary detached worktree of BASE (hardlinked node_modules) with the labels `czw-t12-before` and `czw-grid-before`, and compare against those instead. Task 1's change cannot move the import (a Depth-0 cut is flat to the scorer before its roll is read), so the after-run carries both tasks honestly. Unpack `.planning/quick/261125-v2f-open-a-board-file-brings-back-a-nose-con/261125-v2f-scripts.tar.gz` into a NEW empty folder in your own scratchpad (never under the repo or the worktree) and call every script by absolute path, as its README says. After the code change: the twelve files with `ROOT=<worktree> npx --no-install tsx --tsconfig <worktree>/tsconfig.json <S>/scripts/measure.mts czw-t12-after 1` (must print "12 files", no `!!` line), then `node <S>/scripts/same.mjs t12-after czw-t12-after` (expected: 0 differ; none of the twelve has a centre vee); the grid with `<S>/scripts/run-grid.sh <worktree> czw-grid-after 6 0 3` and then `... 6 3 6` (two calls, each a foreground command under ten minutes; 296 boards when both are done), then `node <S>/scripts/same.mjs grid-after czw-grid-after` and `node <S>/scripts/analyze.mjs grid-after czw-grid-after`. Every board `same.mjs` lists must be one whose answer before had replaced a centre Tri-Plane Hull Center (a vee) via the tie and now keeps it; record each with its cuts and widest / typical before and after. If any listed board is not that, stop and report it as a deviation rather than tuning anything. The founder's sample files are read where they are in ~/Downloads, never copied, committed or named in a test.

Commit: `fix(quick-261126-czw): opening a .brd: the founder's concave tie now only lets a rolled nose concave stand in for a belly, never for a centre vee, and the fit measures each bottom once`.
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/brd-bottom.test.ts lib/export/brd-look.test.ts lib/export/brd-fit-preview.test.ts lib/export/brd-nose-roll.test.ts</automated>
  </verify>
  <done>The three new cases pass with every existing .brd unit case; `same.mjs t12-after czw-t12-after` reports 0 differ; the grid's differing boards (if any) are all centre vees now kept and are listed with their figures for the SUMMARY; one commit.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: a stored Rail Roll held to 1/2", the printed page's room searched with a floor, then the gates and the SUMMARY (D-03, D-04)</name>
  <files>lib/models/design-snapshot.ts, lib/models/design-snapshot.test.ts, components/summary/bottom-sheet-fit.ts, components/summary/bottom-sheet-fit.test.ts, .planning/quick/261126-czw-fix-four-code-review-points-on-the-rail-/261126-czw-scripts.tar.gz, .planning/quick/261126-czw-fix-four-code-review-points-on-the-rail-/261126-czw-SUMMARY.md</files>
  <read_first>lib/models/design-snapshot.ts ~165-185, ~555-610; lib/models/design-snapshot.test.ts ~1659-1737; components/summary/bottom-sheet-fit.ts ~1-30, ~60-84, ~145-160, ~215-240, ~262-280, ~318-400; components/summary/bottom-sheet-fit.test.ts ~415-548 and ~718-843; lib/geometry/measure-display.ts `measureSlider` (~393).</read_first>
  <behavior>
    - Reader (design-snapshot.test.ts, the Rail Roll describe): a roll at the slider's top, `inchesToMm(BOTTOM_MARK_RANGES_IN.railRoll.max)`, comes back exactly and the board still works out (`summarizeDesign` finite litres); so does each slider's own top, `measureSlider(mm(0), BOTTOM_MARK_RANGES_IN.railRoll, BOTTOM_DEPTH_STEP_IN, BOTTOM_DEPTH_STEP_MM, system).toMm(view.max)` for Imperial and Metric (measured at plan time: both store exactly 12.7 mm, equal to the bound).
    - Reader: a roll just past the top (`+ 0.01` mm), 3/4" and 1" each leave no key and keep the cut and the outline (the BAD list's "just past the outer bound" entry moves to the new bound and gains 3/4" and 1").
    - Reader: a nose Depth of 3/4" with no roll still reads back as stored (Depth's 1" bound is unchanged).
    - Fit (bottom-sheet-fit.test.ts, a new describe): `bottomTopViewRoomThatFits(natural, floor, fits)` equals the dot-by-dot loop (from natural, step down while above 1 and not fitting) for every natural 1 to 190 and a linear `fits` like `room => 100 - 1.069 * room >= 4`, whenever that loop's answer is at or above the floor; it returns the floor when nothing at or above it fits; it returns natural without searching when natural fits; it asks `fits` at most about log2(natural) + 2 times.
    - Fit: in the split's reach describe and in the rolled sweep (the four shapes at every length, roll at the slider's top), every layout whose tables take their own sheet has `topViewRoom` exactly equal to the dot-by-dot oracle written in the test over `pageSpareAt` (from `naturalRoom`, step down while above 1 and under `BOTTOM_SHEET_SPARE`), and every such answer is above the floor (the floor is never reached on these boards; assert it, with a non-vacuity count of layouts that gave room).
  </behavior>
  <action>
Per D-03, in lib/models/design-snapshot.ts add `bottomRailRollSchema = z.number().min(0).max(inchesToMm(BOTTOM_MARK_RANGES_IN.railRoll.max))` beside `bottomDepthSchema` (import `BOTTOM_MARK_RANGES_IN` from @/lib/geometry/bottom; the inch-to-millimetre goes through `inchesToMm`, never a bare 25.4) and use it for the cut's `railRoll` with the same `.optional().catch(undefined)`, so a roll past 1/2" leaves no key and keeps the cut and the board (the file's documented rule for a bad roll). Leave `bottomDepthSchema` and Depth's 1" bound untouched. In header rule 14 replace "past the depth family's outer bound (1")" with the roll's own bound, the Rail Roll slider's top (1/2", `BOTTOM_MARK_RANGES_IN.railRoll`), and in the bounds comment above `bottomAcrossSchema` add one sentence that the Rail Roll is the one bottom value bounded at its slider's end rather than clear of it (the founder, 2026-11-26, quick 261126-czw), since the slider's top in both systems stores exactly that figure.

Per D-04, in components/summary/bottom-sheet-fit.ts export `BOTTOM_TOP_VIEW_MIN_ROOM_SHARE = 0.5` and a pure `bottomTopViewRoomThatFits(natural: number, floor: number, fits: (room: number) => boolean): number`: natural when it fits; the floor when the floor does not fit; otherwise a halving search between a fitting low end (from the floor) and a non-fitting high end (natural) that returns the largest whole room that fits. The page's height only grows with the room (`pageHeightWithoutTables` adds `room x PAGE.pictureScale` and nothing else moves, and IEEE adding and scaling keep that order), so this is exactly the room the dot-by-dot loop found. In `bottomSheetLayout`, where the tables have left the page, set `topViewRoom` from it with natural = `bottomTopViewBox(board, cuts.length).room`, floor = `Math.max(1, Math.ceil(natural * BOTTOM_TOP_VIEW_MIN_ROOM_SHARE))`, and `fits` = the same `spareAfter(... pageHeightWithoutTables(sheet, board, notes, room)) >= PAGE.spare` test the loop used; a page whose tables stay keeps its natural room as now. Rewrite the v2j comment block over it and the module/`topViewRoom` doc lines (~17, ~64, ~152, ~235) to say: the most whole dots of room that fit, found by halving rather than one dot at a time, and never under half the picture's own room. At that floor the rule stops giving: the picture is drawn at half its room and, if the page's own parts are still too tall, the browser's own give-way on the picture (the guard already in place) squeezes the rest, so nothing runs off the sheet. No board the tests or the two printed-page specs cover comes near it (v2j measured the deepest give at 166 of 190 dots).

Write the behaviours' tests first: the reader's new cases fail on the 1" bound, `bottomTopViewRoomThatFits` is missing; then make them pass. Rewriting the old "a roll at the outer bound is still a board the app can work out" case (1" kept) and the BAD list's 1"+1 entry is required by D-03: quote every removed test line in the SUMMARY (`git -C <worktree> diff -U0 <BASE> -- '*.test.ts' '*.spec.ts' | grep -E '^-[^-]'`).

Commit: `fix(quick-261126-czw): a saved board's Rail Roll is read only up to the slider's 1/2", and the printed bottom page finds its picture's room in a few steps instead of one dot at a time`.

Then the gates, each in its own call and read to its exit line: `npm test` (a time-limit failure in a file this plan does not touch is re-run alone and both results reported); `npx tsc --noEmit` (after `npx next typegen` if route types are missing); `npm run lint` (or `npx eslint` on every touched file if the whole-repo lint is slow, said so); `PW_PORT=3158 npx playwright test e2e/bottom-rail-roll.spec.ts` (every project); `PW_PORT=3158 npx playwright test e2e/bottom-panel.spec.ts --project=desktop`; `PW_PORT=3158 npx playwright test e2e/summary-bottom-page.spec.ts` (every project); `PW_PORT=3158 npx playwright test e2e/summary-planing.spec.ts --project=desktop -g "fits its sheet"`. Protected: `git -C <worktree> diff --quiet <BASE> -- lib/geometry/__fixtures__ e2e/desktop-baseline.spec.ts-snapshots db drizzle lib/db lib/geometry/presets.ts components/bottom/bottom-guide-words.ts components/design/design-store.tsx CLAUDE.md` exits 0, and `git -C <worktree> diff --name-only <BASE>` lists only this plan's files_modified. `npm run build` and `npm run test:e2e:prod` do not run in a worktree; they are the orchestrator's after the merge. Nothing is pushed.

Pack `<S>/scripts/` (unchanged), `<S>/out/czw-*` and a short README.txt (what each czw file is, the before labels it was compared with, and that no .brd is in it) into `.planning/quick/261126-czw-fix-four-code-review-points-on-the-rail-/261126-czw-scripts.tar.gz`; list it and confirm no `.brd` entry. Never leave loose scratch .ts/.mjs files under .planning.

Write `261126-czw-SUMMARY.md` in plain shaper's English: for each point, what changes on the screen or on paper and what stays (D-01: no words added, the row greys like TEMPLATE's; the greyed row still shows the roll; the litres and the board are unchanged); the twelve files and the grid before -> after with every board that changed (D-02); what happens at the room's floor (D-04); the removed test lines quoted; the gates with their counts. Leave the SUMMARY and the archive uncommitted for the orchestrator unless its prompt says otherwise.
  </action>
  <verify>
    <automated>npx vitest run lib/models/design-snapshot.test.ts components/summary/bottom-sheet-fit.test.ts lib/geometry/bottom-rail-roll.test.ts && npx tsc --noEmit</automated>
  </verify>
  <done>The reader keeps a roll up to and at 1/2" (both slider tops) and drops one past it with the cut kept; the printed page's room equals the dot-by-dot answer on every swept layout and never goes under the floor; the whole unit suite, tsc, lint and the four browser specs on port 3158 pass, each read to its exit line; protected paths unchanged; archive packed with no .brd; SUMMARY written; three code commits, nothing pushed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| stored board -> board reader | a saved board's JSON (database row, the browser's open-board copy, or a board file a shaper opens) is untrusted until `design-snapshot.ts` reads it |
| .brd file -> import fit | a board file's sections drive `polishBrdBottom` and `chooseBrdNoseRetry` |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-czw-01 | Tampering | `bottomCutSchema` railRoll (design-snapshot.ts) | low | mitigate | D-03: the roll is bounded 0 to 1/2" by `BOTTOM_MARK_RANGES_IN.railRoll`; anything else drops the key alone, the cut and board kept (tests in design-snapshot.test.ts) |
| T-czw-02 | Denial of service | `bottomTopViewRoomThatFits` (bottom-sheet-fit.ts) | low | mitigate | the search is bounded: at most about log2(190) + 2 page measurements, with a floor at half the natural room, replacing a loop of up to 189 steps |
| T-czw-03 | Tampering | `chooseBrdNoseRetry` via a crafted .brd | low | accept | the change only narrows when the tie applies; a crafted file can at worst open with a different, still valid bottom the shaper sees in the preview before opening |
| T-czw-04 | Information disclosure | the founder's ~/Downloads .brd files in measurement | low | mitigate | read in place only; never copied, committed, named in a test or packed (archive listing checked for no .brd) |
</threat_model>

<verification>
- D-01: a Depth-0 nose concave's Rail Roll slider is disabled and shows the kept roll; Depth above 0 restores it live and unchanged (browser test); the resolved roll reads 0 and the stored key stays (unit test); the foam is unchanged (the existing Depth-0 case).
- D-02: the chooser's vee and belly cases pass; the twelve files 0 differ; every differing grid board is a centre vee kept, listed in the SUMMARY.
- D-03: 1/2" and both slider tops kept; past it dropped with the cut kept; Depth's bound unchanged.
- D-04: the polish measures once fewer with identical digests; the room equals the dot-by-dot oracle on every swept layout, the floor never reached.
- Identity: `npm test`, tsc, lint and the four browser specs green; protected paths unchanged.
</verification>

<success_criteria>
All four review points fixed as the founder ruled, point 5 untouched; a test per point; every board, preset and file unchanged except D-01's greyed row and words on a Depth-0 rolled nose concave, D-02's listed centre-vee boards and D-03's rolls over 1/2"; three code commits in the worktree; SUMMARY and archive ready for the orchestrator; nothing pushed.
</success_criteria>

<output>
Create `.planning/quick/261126-czw-fix-four-code-review-points-on-the-rail-/261126-czw-SUMMARY.md` when done.
</output>
