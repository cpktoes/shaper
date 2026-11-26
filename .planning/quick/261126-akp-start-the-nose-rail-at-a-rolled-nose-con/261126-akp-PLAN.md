---
phase: quick-261126-akp
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/bottom.ts
  - lib/geometry/rail-bands.ts
  - lib/geometry/volume.ts
  - lib/geometry/design.ts
  - lib/geometry/rail-start.test.ts
  - lib/geometry/bottom-rail-roll.test.ts
  - components/design/design-store.tsx
  - lib/export/brd-fit-preview.ts
  - components/rails/rails-copy.ts
  - components/rails/rail-controls.tsx
  - components/rails/rail-band-editor.tsx
  - e2e/rails-rail-start.spec.ts
  - .planning/quick/261126-akp-start-the-nose-rail-at-a-rolled-nose-con/261126-akp-scripts.tar.gz
autonomous: true
requirements: [D-01, D-02, D-03, D-04, D-05, D-06, D-07]

estimate:
  tokens: 230000
  raw_tokens: 230000
  tasks: 3
  confidence: low
  # estimate-calibration: factor 1, 0 samples. About 90 lines of maths over four lib/geometry files (ported from spike 009's
  # trial diff), one new unit test file and one amended case, the import measured against a scratch copy of BASE (twelve files
  # twice, three app Longboards, about 300 boards for identity), then one store memo, one slider flag and note, one browser spec,
  # and the RAILS and BOTTOM browser specs. Task 2 can end the run (the stop condition): Task 3 is then not spent.

must_haves:
  truths:
    - "On a board whose nose concave (Teardrop Nose Concave, Blended Nose Concave or Slight Single Concave Entry) has a Rail Roll of 1/16\" or more, wherever RAILS' Bottom Tuck 3 starts further in from the rail than the concave's Off Rail mark, it is pulled out to the mark, Bottom Tuck 1 and 2 scaled with it, in full from the nose tip back to Deepest At and fading to the rail's own by End with no step (D-01, D-02)"
    - "A roll under 1/16\" pulls only part of the way, eased in smoothly from nothing at 0: a 1/64\" roll moves a Longboard's litres by less than a quarter of what a 1/16\" roll does (D-03)"
    - "The rule never pushes a rail in: every board with roll 0, every board without a nose concave, and every stock Shortboard, Mid-length and Fish with any roll draws byte-identical sections, litres, .brd bytes and RAILS figures (D-04, D-06)"
    - "The litres, the 3D board, the .brd export, BOTTOM's drawings, the printed sheets and RAILS' plot, DATA, readout, phone tile and Rail Band Reference all read the one pulled rail (D-01, D-05)"
    - "While a roll stands, RAILS' Bottom Tuck 3 slider is greyed on each card the pull moves, with a short note naming BOTTOM's mark; at roll 0 it works again with the shaper's own nudge untouched; no stored value is rewritten and there is no migration (D-05, D-07)"
    - "Through the real import, none of the founder's twelve files is worse and no file opens more than about 2.5 s slower than today, or the run stopped with the numbers and nothing past the drawing rule was built (CONTEXT stop condition)"
  artifacts:
    - path: lib/geometry/bottom.ts
      provides: "RAIL_ROLL_FULL_PULL, railRollEaseIn, railStartLimiter (where a rolled nose concave lets the rail start, and how much of the pull stands)"
      contains: "railStartLimiter"
    - path: lib/geometry/rail-bands.ts
      provides: "RailStartLimit, RAIL_PULL_FLOOR, railSectionPulledToMark, railSectionOutputWith"
      contains: "railSectionPulledToMark"
    - path: lib/geometry/volume.ts
      provides: "CrossSectionVolumeInput.railStartAt, applied to every rail section boardSectionsWith builds"
      contains: "railStartAt"
    - path: lib/geometry/design.ts
      provides: "designCrossSectionInput carries railStartAt only for a rolled nose concave; railBandsPulledToMark for RAILS' three cards"
      contains: "railBandsPulledToMark"
    - path: lib/geometry/rail-start.test.ts
      provides: "the rule's own tests: ease-in, limiter, never pushed in, proportions, no step along the board, Longboard end to end, identity on every other board"
      contains: "261126-akp"
    - path: e2e/rails-rail-start.spec.ts
      provides: "RAILS' Bottom Tuck 3 greyed with its note on a rolled Longboard, live again at roll 0 with its nudge kept, live on a rolled Shortboard"
      contains: "Bottom Tuck 3"
    - path: .planning/quick/261126-akp-start-the-nose-rail-at-a-rolled-nose-con/261126-akp-SUMMARY.md
      provides: "the twelve-file table, open times with load, the Longboard litres table, the identity count, the note's draft words"
  key_links:
    - from: "lib/geometry/design.ts designCrossSectionInput"
      to: "lib/geometry/volume.ts boardSectionsWith, and through it the litres, 3D board, .brd export, BOTTOM's sections and the import's rail fit (brd-rails.ts spreads the same input)"
      via: "railStartAt: railStartLimiter(resolved, board), only when it is not null"
      pattern: "railStartAt"
    - from: "lib/geometry/volume.ts boardSectionsWith (the three computeRailSection calls)"
      to: "lib/geometry/rail-bands.ts railSectionPulledToMark"
      via: "each base, tip and single rail result pulled with the limit at its own station"
      pattern: "railSectionPulledToMark\\(computeRailSection"
    - from: "components/design/design-store.tsx railBandsOnBottom"
      to: "lib/geometry/design.ts railBandsPulledToMark, before railBandsOnTheBottom"
      via: "the same limiter at the three anchors; its pulled map exposed for RAILS' slider"
      pattern: "railBandsPulledToMark\\("
---

<objective>
Draw a rolled nose concave the way the founder shapes one: he marks how close the nose concave comes to the rail first, then
shapes the rail and blends the two. So where one of BOTTOM's three nose concaves has a Rail Roll, RAILS' Bottom Tuck 3 (the
line he draws) is pulled out to the concave's Off Rail mark, all three bottom tucks scaled together, and the roll becomes the
blend from the mark to the rail (D-01). The pull follows the roll's own share along the board (D-02), eases in over the first
1/16" of roll (D-03), and only ever pulls a rail out (D-04). RAILS reads the pulled marks and greys its Bottom Tuck 3 slider
with a short note while a roll stands (D-05). Every other board is byte-identical (D-06). Nothing stored changes (D-07).

Spike 009 measured this rule (its rule A) and found the founder's 92Log opens with its rails further off and rolled Longboards
open 2 to 7 s slower. The founder's import rules stand: none of the twelve files worse, no more than about 2.5 s added to open.
Task 2 measures that before any screen work, tries the smallest import-side fix if needed, and STOPS the run with the numbers
if nothing keeps every file at or better than today.

Purpose: a rolled Longboard nose looks like the rail the founder shapes, starting at his mark, rather than a soft rail rolling
in from 4" or 5" with the roll shaped away under it (spike 008).

Output: the rule in lib/geometry with its tests, the import measured against today, and (if the import passes) RAILS' greyed
slider and note with a browser spec. The SUMMARY in a shaper's words with the numbers.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@AGENTS.md
@.planning/quick/261126-akp-start-the-nose-rail-at-a-rolled-nose-con/261126-akp-CONTEXT.md
@.planning/spikes/009-rail-from-concave-mark/README.md

Read as needed (one pass each): `.planning/spikes/008-longboard-nose-roll/README.md` (why the roll hides under the Longboard's
soft rail); `.planning/quick/261125-mf8-add-a-rail-roll-to-the-nose-concaves-on-/261125-mf8-SUMMARY.md` (how the Rail Roll is
built); `lib/geometry/bottom.ts` lines 805-960 (refAt, smoothstep, railRollAlong, railRollAcross, cutFoamOffParts) and
1340-1358 (stationReaders); `lib/geometry/rail-bands.ts` lines 520-545 (RailSectionResult) and 1034-1172
(RailSectionOutput, computeRailSectionOutput, computeRailBands); `lib/geometry/volume.ts` lines 538-590
(CrossSectionVolumeInput) and 1560-1740 (boardSectionsWith's rail sections); `lib/geometry/design.ts` lines 180-220
(designCrossSectionInput) and 350-478 (bottomRailLift, railsOnTheBottom, railBandsOnTheBottom); `lib/geometry/brd-rails.ts`
lines 250-280 (the import's rails are built from the same input); `lib/geometry/bottom-rail-roll.test.ts` lines 1-110 (the
board helpers to reuse) and 333-376.

## READ THIS FIRST: what to take from spike 009's trial code

The trial code is `trial-code.diff` inside `.planning/spikes/009-rail-from-concave-mark/spike-source.tar.gz`. Extract the
archive into a NEW, EMPTY folder in your own scratchpad (never under the repo or your worktree) and read the diff there.
Main has not changed under lib/ or components/ since the spike's base (dff59dc0), so its line numbers hold.

Port, renamed and with every environment switch removed:
- `s9RailStartLimiter` (bottom.ts) as `railStartLimiter`, with one change: its `share` is the roll's along-the-board share
  (`railRollAlong`) times the new ease-in (D-03), and the rule C fraction is gone.
- `s9PulledToMark` (volume.ts) in its `"all"` mode only, as `railSectionPulledToMark` in rail-bands.ts, with one change: the
  1/8" floor never pushes a tuck in (see Task 1).
- The `s9Pull` wrapper at boardSectionsWith's three `computeRailSection(sectionInput(...))` calls, reading a new
  `railStartAt` input field.
- `s9Fields` in design.ts, reduced to: `railStartAt` set only when the limiter is not null.

Do NOT port: rule B (`s9RollSampler`, `s9RollOff`, the `rollOffAt` field and `bottomedHalfSection`'s `rollAt` parameter), the
`"tuck3"` and `"finished"` modes, anything in `lib/export/brd-fit-preview.ts` (the two import tweaks, the `__s9` log, the
exports of `bottomOn` / `liftedStep` / `settleLook`).

## What spike 009 measured (compare against these; never type them into a test)

- Rolled Longboards (roll 1/16" to 1/4"): litres +0.38 to +1.41 L against the same board today; with the ease-in a roll of
  1/16" and above is the full pull, so these should reproduce; 1/64" to 3/64" are new and smaller.
- RAILS' nose card on the Longboard, Blended 3/16" with a 1/4" roll: Bottom Tuck 1 / 2 / 3 1.71" / 0.86" / 3.08" today,
  0.90" / 0.45" / 1.62" pulled. The Slight's pull also reaches the Longboard's centre card at 37%.
- Shortboard, Mid-length, Fish: every rolled board byte-identical (the mark is further in than the rail starts).
- The import: 92Log rails 1.64 / 0.45 -> 1.93 / 0.50 mm (bottom and cuts the same); testLB the same to the hundredth;
  Scoop-Noserider identical; the other nine identical. Rolled app Longboards opened 2.0 s, 4.6 s and 7.3 s slower.
- **Expect Task 2 to stop.** The ease-in does not reach 92Log (its fitted roll, 11/64", is past 1/16") nor the three
  rolled Longboards timed (1/8" and 1/4" rolls), so unless a fix in Task 2 works, the founder's rules are broken as spike 009
  measured. Do not spend past Task 2's time box on fixes.

## The stop condition (CONTEXT, exactly)

A file is **worse** when any of its four figures (widest and typical bottom miss, widest and typical rails miss, in mm, as
the preview rounds them to 0.01) is higher than today's, or any of its three cut names differs from today's. A file or board
is **slow** when its fastest-of-three open time is more than 2.5 s above today's in the same paired round. The twelve files
and the three rolled app Longboards spike 009 timed (Blended 3/16" with a 1/4" roll, Teardrop 3/16" with a 1/4" roll, Slight
Single Concave Entry 1/8" with a 1/8" roll) are all judged. Any worse or slow item, after the fix attempts, means STOP.

## The measuring recipe

`W` is your worktree's root (`git rev-parse --show-toplevel`), `BASE` its starting commit (`git -C "$W" rev-parse HEAD`
before any edit), `X` the new empty scratch folder the spike archive was extracted into (`$X/spike-source/...`). Run every
command from `W` as the working directory; never `cd` into a subfolder. The tsconfig MUST be the measured checkout's own.

```
git -C "$W" worktree add --detach "$X/base" "$BASE"
ln -s /Users/kontoes/Code/shaper/node_modules "$X/base/node_modules"
uptime; ROOT="$X/base" npx --no-install tsx --tsconfig "$X/base/tsconfig.json" "$X/spike-source/scripts/measure.mts" base1 3
uptime; ROOT="$W"      npx --no-install tsx --tsconfig "$W/tsconfig.json"      "$X/spike-source/scripts/measure.mts" after1 3
# ...a second round base2 / after2, then the verdict script (Task 2) and, at the very end:
git -C "$W" worktree remove --force "$X/base"
```

`measure.mts` reads the founder's files in place from `~/Downloads` (skipping the `_decrypt` copies and
`test-curves-v2.brd`, a duplicate of quadtesting), writes `$X/spike-source/out/<label>.json`, and must print "12 files". Never
copy a sample file anywhere, never commit one, never name one in a test. If `W` has no `node_modules`, use the project's
recipe: `rsync -a --link-dest=/Users/kontoes/Code/shaper/node_modules /Users/kontoes/Code/shaper/node_modules/ "$W/node_modules/"`.

## House rules for the executor

- Geometry in `lib/geometry/`, pure and tested (CLAUDE.md Rule 1); every inch figure through `lib/geometry/units.ts` (Rule 2).
- Never `cd` into a subfolder or a worktree: absolute paths and `git -C`. Never `rm` with an unguarded variable.
- In a fresh worktree run `npx next typegen` before `npx tsc --noEmit` if route types are missing.
- Browser runs use `PW_PORT=3157` (not 3100, 3127, 3137 or 3141). The suite reuses any server already on its port.
- `npm run build` and `npm run test:e2e:prod` cannot run in a worktree: leave them for the orchestrator after the merge.
- Do not push. No migration, no database change, no change to a saved board's shape (D-07).
- Run each gate in its own call and read it to its exit line. A test that times out only under the whole suite's load is
  re-run alone and both results reported.
- Commit messages and the SUMMARY in plain shaper's English (CLAUDE.md).
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: A rolled nose concave pulls Bottom Tuck 3 out to its mark — from BOTTOM's cut to the litres, the .brd and RAILS' marks</name>
  <files>lib/geometry/bottom.ts, lib/geometry/rail-bands.ts, lib/geometry/volume.ts, lib/geometry/design.ts, lib/geometry/rail-start.test.ts, lib/geometry/bottom-rail-roll.test.ts</files>
  <read_first>
    - The trial diff (see "READ THIS FIRST"), lines 115-325
    - lib/geometry/bottom.ts lines 805-960 and 1340-1358
    - lib/geometry/rail-bands.ts lines 520-545 and 1034-1172
    - lib/geometry/volume.ts lines 538-590 and 1560-1740
    - lib/geometry/design.ts lines 180-220 and 350-478
    - lib/geometry/bottom-rail-roll.test.ts lines 1-110 (PRESETS, noseBottom, sectionsOf) and 333-376
  </read_first>
  <behavior>
    - railRollEaseIn: 0 at a roll of 0 (and below), 1 at 1/16" and above, strictly increasing between when sampled every 1/256", equal to bottom.ts's own smoothstep of roll over 1/16" (D-03)
    - railStartLimiter is null on DEFAULT_BOTTOM, on each of the three nose concaves with no roll, on a nose concave with a roll but Depth 0, and on a Rolled Belly Entry or Reverse Vee Nose; not null on the three nose concaves with a roll (D-01)
    - Where not null, at a station s it returns inFromRail = the rail less the concave's edge (max(0, railAt − max(0, refAt − Off Rail)), as railRollAcross reads it) and share = railRollAlong × railRollEaseIn(roll); null where the rail is 0 or the share is 0 (behind End) (D-02)
    - railSectionPulledToMark hands back the very same object when the limit is null, the share is 0, the section is a hard edge, or Bottom Tuck 3 already starts no further in than the mark (D-04)
    - Otherwise Bottom Tuck 3 becomes BT3 − share × (BT3 − inFromRail), never below RAIL_PULL_FLOOR (1/8") unless it was already below it, and never above its own value: swept over marks, shares and every preset's three cards, the pulled Bottom Tuck 3 is never further in than the unpulled one (D-04)
    - Bottom Tuck 1 and 2 scale by the same factor (their ratio to Bottom Tuck 3 is unchanged); every other field of the result is the same value (D-01)
    - End to end, the preset Longboard with each nose concave at its starting numbers, Depth 3/16", Rail Roll 1/4": RAILS' nose card (railBandsPulledToMark at the nose anchor over computeRailBands(railsOnTheBottom(...))) reads Bottom Tuck 3 equal to the limiter's inFromRail there (or the floor), pulled.nose is true and pulled.tail false; the Slight's centre card is pulled too (D-01, D-02)
    - Along the board, the nose card's result pulled with the limit at stations every 1/8" from the nose tip back past End never changes by more than 1.5 × the steepest slope the smoothstep allows (worked out from that board's own Deepest At, End, Bottom Tuck 3 and mark), and equals the unpulled Bottom Tuck 3 at and behind End; boardSections with and without railStartAt are identical at every station behind End (D-02)
    - Litres (summarizeDesign): a Longboard with a 1/16" roll holds more than its roll-0 twin; the gain at 1/64" is less than a quarter of the gain at 1/16" (D-03)
    - Identity: on the Shortboard, Mid-length and Fish with each nose concave at a 1/4" roll, the litres (Object.is), JSON of boardSections, and the .brd text (brdText over buildBoardSurface, one board per preset) are the same with railStartAt as without it, and railBandsPulledToMark hands back the very same bands; on every preset plain, with each nose concave at roll 0, at Depth 0 with a roll, and with a belly, designCrossSectionInput carries no railStartAt key at all (D-04, D-06)
  </behavior>
  <action>
Write the failing tests first in a new `lib/geometry/rail-start.test.ts` (the behaviours above), reusing the board helpers
of `bottom-rail-roll.test.ts` (copy `PRESETS`, `noseBottom` and the input builder; `vi.setConfig({ testTimeout: 60_000 })` as
that file does). Every expected value is worked out by the app's own functions and constants; only inch inputs such as
`inchesToMm(1 / 4)` are typed (CLAUDE.md Rule 1: this rule is not in the prototype, so it has no golden). Its header names
quick 261126-akp and D-01..D-07. Run it red, then build:

1. `lib/geometry/rail-bands.ts` (pure; imports nothing from bottom.ts): export the `RailStartLimit` interface
   (`inFromRail: Mm` in from the rail's edge, `share: number` 0..1), `RAIL_PULL_FLOOR` (1/8" through `inchesToMm`), and
   `railSectionPulledToMark(result, limit)` per the behaviours: target `BT3 − share × (BT3 − inFromRail)`, then
   `max(target, min(BT3, RAIL_PULL_FLOOR))`, and the same object back when that equals BT3. This floor differs from the
   trial's on purpose: the trial's could push a Bottom Tuck 3 already under 1/8" back in toward the stringer, which D-04
   forbids. Also export `railSectionOutputWith(output, result)`: the output with `result` replaced and `profile`, `segments`,
   `bounds` (with the output's own `stringer`) and `dataGroups` (with its own `domed`) rebuilt by `buildRailProfile`,
   `buildRailSegments`, `railPlotBounds` and `buildRailDataGroups`, so a pulled card's plot, DATA and readout all read the
   pulled marks.
2. `lib/geometry/bottom.ts`, beside `railRollAlong` / `railRollAcross`: `RAIL_ROLL_FULL_PULL` (1/16" through `inchesToMm`),
   `railRollEaseIn(roll)` (0 at or below 0, 1 at or above `RAIL_ROLL_FULL_PULL`, `smoothstep(roll / RAIL_ROLL_FULL_PULL)`
   between: smooth and monotone, D-03), and `railStartLimiter(resolved, board)` ported from the spike's limiter (it reads
   `resolved.nose`, guards `kind === "single" && railRoll > 0 && depth > 0`, uses `stationReaders`, returns null for a board
   it does not touch). Import `RailStartLimit` as a type only. Doc comments name quick 261126-akp, D-01..D-04, and say that
   "where the rail starts" is Bottom Tuck 3, the line the shaper draws, not the sanded rail (D-01).
3. `lib/geometry/volume.ts`: an optional `railStartAt?: (station: Mm) => RailStartLimit | null` on `CrossSectionVolumeInput`
   (doc: absent, every section is exactly as it was), read once per station in `boardSectionsWith`, and every rail result
   that function builds (the base and tip results of a blended section and the single result) wrapped in
   `railSectionPulledToMark(computeRailSection(...), limit)`. No other change to how a section is built.
4. `lib/geometry/design.ts`: in `designCrossSectionInput`, when a resolved bottom exists and `railStartLimiter` is not null,
   add `railStartAt` (spread conditionally, so every other board's input is key for key what it always was, D-06). Update
   its doc comment. Add `railBandsPulledToMark(bands, limiter, anchors)` returning `{ bands, pulled }`: each card pulled with
   the limit at its own anchor (`railSectionOutputWith` when its result moved), `pulled` true exactly where the result
   moved; when nothing moved, or the limiter is null, the very same `bands` object and one shared all-false `pulled`
   record. It never reads or writes a stored value (D-07). Doc: it runs after `computeRailBands(railsOnTheBottom(...))` and
   before `railBandsOnTheBottom`; RAILS-only, VOLUME's estimator rows never read it.
5. `lib/geometry/bottom-rail-roll.test.ts`, the case "the litres fall with a roll, and fall again with a bigger one": keep
   it exactly for the Shortboard, Mid-length and Fish; for the Longboard assert instead that a 1/8" roll holds more litres
   than none (the pull puts the foam back, D-01) and a 1/4" roll fewer than 1/8" (the bigger roll takes some back), with a
   comment naming quick 261126-akp. This is the one existing expectation the rule changes on purpose; quote the removed
   lines in the SUMMARY.

Read no environment switch anywhere. Touch nothing under `lib/geometry/__fixtures__`, the presets, the GUIDE words or the
saved-board reader (`lib/models/design-snapshot.ts`).

Commit: `feat(quick-261126-akp): a rolled nose concave now starts the nose rail at its Off Rail mark` (body in a shaper's
words: what a rolled Longboard nose now looks like, that a roll under 1/16" eases in, and that every other board is unchanged).
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/rail-start.test.ts lib/geometry/bottom-rail-roll.test.ts lib/geometry/rail-bands.test.ts lib/geometry/volume.test.ts lib/geometry/design.test.ts && npx tsc --noEmit && npx eslint lib/geometry/bottom.ts lib/geometry/rail-bands.ts lib/geometry/volume.ts lib/geometry/design.ts lib/geometry/rail-start.test.ts lib/geometry/bottom-rail-roll.test.ts</automated>
  </verify>
  <done>The new test file passes with every behaviour above; the amended Longboard case passes; tsc and eslint exit 0; the four
lib files hold `railStartLimiter`, `railSectionPulledToMark`, `railStartAt` and `railBandsPulledToMark`; one commit.</done>
</task>

<task type="auto">
  <name>Task 2: Measure the import against today — twelve files, open times, identity — and STOP unless every file is at or better than today</name>
  <files>.planning/quick/261126-akp-start-the-nose-rail-at-a-rolled-nose-con/261126-akp-scripts.tar.gz (plus, only if a fix passes, the one or two import files it touches among lib/export/brd-fit-preview.ts, lib/geometry/brd-rails.ts, lib/geometry/brd-bottom.ts and their tests)</files>
  <precondition>`ls ~/Downloads/*.brd` lists the founder's sample files (twelve once the `_decrypt` copies and test-curves-v2.brd are skipped); if not, halt and report.</precondition>
  <read_first>
    - "The stop condition" and "The measuring recipe" in the context above
    - $X/spike-source/scripts/measure.mts, board.mts, litres.mts, time9.mts, same.mjs
    - lib/export/brd-fit-preview.ts settleLook and brdFitLook (only if a fix is needed)
  </read_first>
  <action>
All scripts and outputs live under `X`, never under the repo. Make the scratch BASE checkout per the recipe.

1. **Identity (D-06).** Adapt the spike's `litres.mts` into `$X/scripts/identity.mts` that takes `ROOT`, builds the same case
   list through `board.mts` (every preset plain; each nose concave at Depth 1/16" to 1/4" and roll 0 to 1/4"; the bellies,
   the Reverse Vee Nose, the mixed and Tri-Plane boards), plus on the Longboard each nose concave at Depth 3/16" with rolls of
   1/64", 1/32" and 3/64", and writes per board the litres and digests of the .brd bytes and of every section ring. Drop the
   rules loop: run it once with `ROOT` at the BASE checkout and once at `W`, then compare. Expected: every board identical
   except the rolled Longboards; report the count. Any other board that moves is a bug in Task 1: fix it there (amend with a
   new commit) before going on. From the same two runs, write the Longboard litres table for the SUMMARY: each nose concave,
   litres today and now at roll 0, 1/64", 1/32", 3/64", 1/16", 1/8", 1/4" (the ease-in visible at the small rolls, D-03).
2. **The twelve files.** Two paired rounds of `measure.mts` per the recipe (base1, after1, base2, after2), `uptime` printed
   before each. Check that `same.mjs base1 base2` reports 0 of 12 differ (the measurement is stable).
3. **The three rolled app Longboards.** Adapt the spike's `time9.mts` into `$X/scripts/time-lb.mts` without its switch modes:
   it builds the three boards named in the stop condition through `board.mts` under its own `ROOT`, writes them with the app's
   own writer and times `brdLookFromBytes`, fastest of 3. Run it on BASE and on `W`, paired, with `uptime`.
4. **The verdict.** Write `$X/scripts/verdict.mjs`: from the paired runs it prints, per file and per Longboard, the four
   figures and the three cut words before and after, the open-time change in the quieter round, and WORSE or SLOW per the
   stop condition's definitions; it ends with one line, PASS or STOP, and exits 0 on PASS, 1 on STOP. If a round's one-minute
   load average is over 8, run another round later and judge on the quietest; report every round.
5. **If STOP: the smallest import-side fix, time-boxed to three candidates or about 45 minutes of measuring.** Candidates, in
   order of how small they are: (a) the rails refit at the nose following the pulled tucks (the import's rail fit seeded or
   searched from the marks the rule leaves, rather than from a rail that cannot stand there); (b) the fit scoring a roll
   under the rule (a fitted roll judged on the board drawn under the rule, rails included); (c) the fitted Off Rail held no
   further out than where the fitted rails' own Bottom Tuck 3 starts at the nose, so the rule has nothing to pull on the
   board that opens (D-04), with the bottom polished again under that limit. Each candidate must not add a new roll search
   or change a reading width (spike 008's trials are out of scope, CONTEXT "Not in this task"). After each, re-run steps 2
   and 3 on `W` against the same BASE outputs and the verdict. A candidate that passes is kept: re-run step 1 if it touched
   shared code, add a unit case for its rule in the existing import test file it belongs to (never naming a sample file),
   run that file, and commit it alone as `fix(quick-261126-akp): ...` in a shaper's words.
6. **If no candidate passes: STOP the run.** Save each candidate's diff as `$X/out/candidate-N.diff`, restore the files it
   touched to Task 1's commit with `git -C "$W" checkout -- <those files>`, pack the archive (step 7), write the SUMMARY with
   `status: stopped` and the full tables, and end your run with a report that starts with the word STOPPED and gives the
   numbers. Do NOT start Task 3. Task 1's commit stays on the branch, unmerged; the orchestrator takes it to the founder.
7. **The archive.** Pack `$X/scripts`, `$X/spike-source/out` (only this task's outputs and the spike scripts you ran) and a
   short `README.txt` (what each script does, the commands, BASE) as `261126-akp-scripts.tar.gz` in the quick folder. Its
   listing must hold only `README.txt`, `scripts/` and `out/` entries. Remove the scratch BASE worktree with
   `git -C "$W" worktree remove --force "$X/base"`.
  </action>
  <verify>
    <automated>node "$X/scripts/verdict.mjs" base1 after1 base2 after2; echo "verdict exit $?"; tar -tzf /Users/kontoes/Code/shaper/.planning/quick/261126-akp-start-the-nose-rail-at-a-rolled-nose-con/261126-akp-scripts.tar.gz | grep -vE '^(\./)?(README\.txt|scripts/|out/)'; git -C "$W" worktree list</automated>
  </verify>
  <done>The identity count shows only rolled Longboards changed; the verdict printed PASS (possibly after one committed fix),
or the run ended STOPPED with every table in the SUMMARY and Task 3 not started; the archive lists only README.txt, scripts/
and out/; the scratch BASE worktree is gone from `git worktree list`.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3 (only after a PASS): RAILS reads the pulled marks and greys Bottom Tuck 3 with a note while a roll stands</name>
  <files>components/design/design-store.tsx, lib/export/brd-fit-preview.ts, components/rails/rails-copy.ts, components/rails/rail-controls.tsx, components/rails/rail-band-editor.tsx, e2e/rails-rail-start.spec.ts</files>
  <read_first>
    - components/design/design-store.tsx lines 640-670 (the context's RAILS fields) and 1340-1510 (railAnchors, railBands, railsOnBottom, railBandsOnBottom)
    - lib/export/brd-fit-preview.ts lines 1180-1186 (railOutputs)
    - components/rails/rail-controls.tsx lines 40-80, 150-260 (props, nudgeRow) and 430-490 (the Advanced fold)
    - components/rails/rail-band-editor.tsx lines 50-70 and 300-330
    - components/design/slider-row.tsx (its `disabled` prop greys the row)
    - e2e/rails-advanced.spec.ts lines 90-130 (openAdvanced, nudgeLabel) and e2e/bottom-rail-roll.spec.ts lines 1-60 (opening a preset, the Rail Roll slider)
  </read_first>
  <behavior>
    - Longboard (desktop and android): Bottom Tuck 3's nudge stepped once to +1/16" on the Nose rail; after picking a Blended Nose Concave on BOTTOM and stepping its Rail Roll to 1/8", RAILS' Nose rail Bottom Tuck 3 slider is disabled, the note shows under it, and its label still reads the +1/16" nudge beside the pulled mark (D-05)
    - Back on BOTTOM with the Rail Roll at 0, RAILS' Bottom Tuck 3 slider is enabled again, the note is gone, and its label reads exactly what it read before the roll (D-05, D-07)
    - Shortboard with a Blended Nose Concave and a 1/4" roll: the Nose rail's Bottom Tuck 3 slider stays enabled and no note shows (D-04)
  </behavior>
  <action>
1. `components/design/design-store.tsx`: memo the limiter (`railStartLimiter(resolvedBottom, bottomBoard)`); build the
   unpulled RAILS bands exactly as today (`railBands` while `railsOnBottom === effectiveRails`, else
   `computeRailBands(railsOnBottom, "sixteenths", railStringers)`), pass them through `railBandsPulledToMark` at
   `railAnchors`, and hand its `bands` to `railBandsOnTheBottom`. Expose its `pulled` record on the context as
   `railsPulledToMark: Record<RailSectionKey, boolean>` with a doc comment (D-05: true where a rolled nose concave's mark
   sets that card's Bottom Tuck 3). `railBands`, `railsOnBottom`, the litres and VOLUME's estimator rows are untouched; on a
   board the rule does not touch, `railBandsOnBottom` is the very object it is today.
2. `lib/export/brd-fit-preview.ts` `railOutputs`: pass its bands through the same `railBandsPulledToMark` with
   `railStartLimiter(resolved, board)` and its `anchors`, so the preview's RAILS drawings show the rail the board opens with.
   One call; nothing else in the import changes here.
3. `components/rails/rails-copy.ts` (new, pure strings, importable by a browser spec): `RAILS_COPY.bottomTuck3FromBottom`,
   first draft for the founder (D-05, short): "The nose concave's Off Rail mark on BOTTOM sets where this rail starts while
   it has a Rail Roll." You may tighten it; quote the final words in the SUMMARY as a draft for his approval.
4. `components/rails/rail-band-editor.tsx` passes `railsPulledToMark` down; `components/rails/rail-controls.tsx` takes it
   (`RailControls` prop, then `RailSectionControls` as one boolean) and, only on the Bottom Tuck 3 row, passes `disabled` to
   its `SliderRow` and renders the note directly under it in the page's existing small muted text
   (`text-xs text-surf-ink-muted font-normal`), with a `data-rail-start-note` attribute for the spec. Render the note only
   while that card is pulled, so the Advanced rows `e2e/rails-advanced.spec.ts` lists on a plain board are unchanged. The
   row's label keeps reading `output.result` (now the pulled marks) and the shaper's own nudge; the slider's spoken name does
   not change; Reset Advanced Settings behaves as today. Decision logic stays in lib (Rule 1): the component only reads the
   boolean. If a drag on a short rail ever pushes Bottom Tuck 3 past a mark set very close to the rail, the slider greys at
   that moment and roll 0 frees it; do not invent another rule, report it in the SUMMARY if you see it.
5. `e2e/rails-rail-start.spec.ts` (new, desktop and android) for the three behaviours, following `bottom-rail-roll.spec.ts`
   for opening a preset (Longboard and Shortboard from `BOARD_PRESETS`) and the Rail Roll slider (`BOTTOM_COPY`), and
   `rails-advanced.spec.ts` for opening the Nose rail's Advanced fold and reading a nudge label. Expected words come from
   `RAILS_COPY`; no figure is typed except the step counts. Use `forgetOpenBoardOnEveryLoad(page)` where a test opens a second
   preset.

Gates, each in its own call: `npx tsc --noEmit`; `npx eslint` on every touched file; `npm test` (the whole unit suite, read
its exit line); `PW_PORT=3157 npx playwright test e2e/rails-rail-start.spec.ts e2e/rails-advanced.spec.ts
e2e/rails-one-scale.spec.ts e2e/rails-channels.spec.ts e2e/guide-rails.spec.ts e2e/bottom-rail-roll.spec.ts
e2e/bottom-panel.spec.ts e2e/summary-rail-key.spec.ts --project=desktop --project=android` and `PW_PORT=3157 npx playwright
test e2e/phone-rails.spec.ts e2e/phone-bottom.spec.ts --project=iphone --project=android`. A worktree's dev server needs the
hardlinked node_modules recipe above.

Commit: `feat(quick-261126-akp): RAILS shows where a rolled nose concave starts the rail, and greys Bottom Tuck 3 there`.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx vitest run lib/geometry/rail-start.test.ts && PW_PORT=3157 npx playwright test e2e/rails-rail-start.spec.ts --project=desktop --project=android</automated>
    <human-check>On the Longboard, BOTTOM: pick a Blended Nose Concave and drag its Rail Roll to 1/8". RAILS, Nose rail: the
plot's lowest rail band now starts at the concave's mark (about 1 5/8" in), DATA's Bottom Tuck 3 reads it, Advanced's Bottom
Tuck 3 slider is greyed with the note under it, and VOLUME's litres went up. Roll back to 0: everything as it was, the slider
live again.</human-check>
  </verify>
  <done>Every gate above exits 0 (load-only timeouts re-run alone and both results reported); RAILS' cards, DATA, readout,
phone tile and Rail Band Reference read the pulled marks; the slider greys with its note only while a card is pulled; one commit.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| .brd file bytes -> import | A board file from anywhere is read and fitted (`brdLookFromBytes`); the rule now runs on the board that opens |
| design state -> drawn board | The pull is derived from stored settings at draw time; nothing flows back into storage |
| founder's sample files -> repo | Twelve private files are read in place for measurement only |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-akp-01 | Denial of service | import (`settleLook` / `brdFitLook`) on a rolled nose | medium | mitigate | Task 2 times every file and three rolled Longboards against today, paired with load; over +2.5 s is STOP |
| T-akp-02 | Tampering | saved boards (`lib/models/design-snapshot.ts`, the store) | medium | mitigate | the pull is computed, never written (D-07); the spec proves the shaper's nudge reads the same after roll 0; protected-file diff check |
| T-akp-03 | Information disclosure | the founder's sample files | medium | mitigate | read in place from ~/Downloads, never copied or named in a test; the archive listing is checked to hold only README.txt, scripts/ and out/ |
| T-akp-04 | Tampering | geometry a shaper cuts foam to | high | mitigate | identity on about 300 boards against BASE (only rolled Longboards move); never-pushed-in swept in unit tests; Task 2 STOP keeps a worse import from shipping |
| T-akp-05 | Elevation of privilege | none (no auth, routes or server code touched) | low | accept | the change is pure client-side geometry and one RAILS control |
</threat_model>

<verification>
- `npm test`, `npx tsc --noEmit` and eslint on every touched file exit 0 (Task 3's gates; Task 1's when Task 2 stops).
- The code adds no environment read and none of the trial's names (comment lines excluded):
  `git -C "$W" diff "$BASE" -- lib components app | grep -E '^\+' | grep -vE '^\+\s*(//|\*|/\*)' | grep -E 'process\.env|S9_|s9[A-Z]'` prints nothing.
- Protected files unchanged: `git -C "$W" diff --quiet "$BASE" -- lib/geometry/__fixtures__ e2e/desktop-baseline.spec.ts-snapshots db drizzle lib/db lib/models/design-snapshot.ts lib/geometry/presets.ts components/guide/words components/bottom/bottom-guide-words.ts CLAUDE.md` exits 0.
- `git -C "$W" diff --name-only "$BASE"` lists only this plan's `files_modified` (plus any committed Task 2 fix's files).
- Task 2's identity count: only rolled Longboards differ from today.
- Task 2's verdict: PASS, or the run ended STOPPED with its tables.
- Every test line removed since BASE is quoted in the SUMMARY (`git -C "$W" diff -U0 "$BASE" -- '*.test.ts' '*.spec.ts' | grep -E '^-[^-]'`).
</verification>

<success_criteria>
- A rolled Longboard nose starts its rail at the concave's mark, eased in over the first 1/16" of roll, fading out with the
  roll along the board; every other board is byte-identical (D-01..D-04, D-06).
- RAILS shows the pulled marks everywhere it shows marks, and its Bottom Tuck 3 slider greys with a short note while a roll
  stands, live again at roll 0 with the shaper's own value (D-05, D-07).
- None of the founder's twelve files is worse and no open is more than about 2.5 s slower, or the run stopped with the numbers
  for the founder.
- The SUMMARY, in a shaper's words, carries: the twelve-file table (before / after figures, cut words, open times with load),
  the three Longboards' open times, the identity count, the Longboard litres table at 0 to 1/4" of roll, RAILS' nose card
  Bottom Tuck 1 / 2 / 3 before and after for the three concaves, the note's draft words, any fix tried and its numbers, and
  every removed test line.
</success_criteria>

<output>
Create `.planning/quick/261126-akp-start-the-nose-rail-at-a-rolled-nose-con/261126-akp-SUMMARY.md` when done (`status: stopped`
if Task 2 stopped the run). Commit code per task as above; leave the SUMMARY and the scripts archive for the orchestrator
unless its prompt says otherwise.
</output>
