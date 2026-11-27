---
phase: quick-261127-kkw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/__fixtures__/nose-blend-boards.ts
  - lib/geometry/__fixtures__/nose-blend-pin.json
  - scripts/extract-nose-blend-pin.ts
  - lib/geometry/nose-blend-pin.test.ts
  - lib/geometry/rail-bands.ts
  - lib/geometry/rail-bands.test.ts
  - lib/geometry/volume.ts
  - lib/geometry/volume.test.ts
  - lib/geometry/board-surface.ts
  - lib/geometry/board-surface.test.ts
  - lib/geometry/blank-reasons.ts
  - lib/models/design-snapshot.ts
  - lib/models/design-snapshot.test.ts
  - components/design/design-store.tsx
  - components/design/design-store.test.ts
  - components/rails/rail-controls.tsx
  - components/rails/rail-band-editor.tsx
  - components/3d/three-d-controls.tsx
  - components/3d/three-d-copy.ts
  - e2e/nose-rail-blend.spec.ts
  - e2e/rails-advanced.spec.ts
  - e2e/three-d-hard-edge.spec.ts
  - lib/geometry/guide-rails.ts
  - lib/geometry/guide-rails.test.ts
  - lib/geometry/guide-pages.test.ts
  - components/guide/words/rails.ts
  - components/guide/words/rails.test.ts
  - components/guide/words/volume.test.ts
  - components/guide/words/metric-sayings.test.ts
  - components/guide/guide-words.ts
  - components/guide/guide-words.test.ts
  - components/guide/rails-guide.tsx
  - e2e/guide.spec.ts
  - e2e/guide-rails.spec.ts
  - .planning/milestones/v1.5-phases/18-a-guide-on-every-page/18-GUIDE-WORDS.md
  - .planning/quick/261127-kkw-add-a-centre-to-nose-rail-blend-control-/261127-kkw-scripts.tar.gz
  - .planning/quick/261127-kkw-add-a-centre-to-nose-rail-blend-control-/261127-kkw-SUMMARY.md
autonomous: true
requirements: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08]

estimate:
  tokens: 200000
  raw_tokens: 200000
  tasks: 3
  confidence: low
  # estimate-calibration: factor 1, 0 samples. About 250 lines of product code over nine files (every one a twin of the tail's
  # own), a one-time record of 142 boards, a unit sweep per layer, one new browser spec on three profiles, one GUIDE card with
  # its words, and the whole unit suite plus eight browser specs at the end.

must_haves:
  truths:
    - "On RAILS, the Nose Rail card's Advanced fold ends: the note the tail's rows carry, Nose Rail Blends From (12\" on a board that says nothing), Nose Rail Ends At (the top of its slider, the board's centre), then Reset Advanced Settings; the Center Rail's fold has no blend rows and the Tail Rail's two rows are exactly as they were (D-01, D-04)"
    - "A board that stores neither nose key reads today's rule exactly: the nose's rail full at and ahead of the nose 12\" station, gone at and behind the centre station; its litres to all 17 digits, every vertex of its 3D surface and every byte of its .brd file equal a record taken from the code before this change, on the four presets, the 102 pinned boards and 40 hand-set boards whose nose rail differs from the centre's; the 102-board, 74-board and channelled-board pins pass with their records untouched (D-02)"
    - "On a board whose nose rail differs from the centre's (the stock 6'0\" with the nose's Symmetrical ticked), moving Nose Rail Ends At moves VOLUME's litres and the 3D board gets a ring at each end of the blend; on a board whose nose rail is the centre's, moving either slider changes its label and nothing else (D-01, D-08)"
    - "Nose Rail Blends From runs 12\" to 30\" from the nose in 1/2\" steps (10 mm in Metric) and Ends At from 2\" past it to the board's centre, each slider's window following the other's value through the tail's own window functions; on a board whose centre is nearer than 32\" Blends From tops out 2\" short of the centre (22\" on a 4'0\"); both read as dims, 30.5 cm and 91.4 cm in Metric on the stock board (D-03)"
    - "The 3D page's Rail Blend Controls shows the nose's two rows above the tail's two, reading and writing the same two values RAILS does: moved on 3D, RAILS reads it; moved on RAILS, 3D follows; a locked board greys them on both pages (D-04)"
    - "The two keys are stored in millimetres from the nose tip, optional, read forgivingly (anything that is not a number inside its window reads the default and costs the board nothing else); the snapshot version stays 5 and no database file changes; the Nose Rail card's Reset Advanced Settings deletes both keys in one undo step; one drag is one undo step (D-06)"
    - "Opening a .brd file is unchanged: no file under lib/export and neither lib/geometry/brd-rails.ts nor brd-fit.ts changes, an opened board carries no nose key, and the founder's twelve sample files measure the same before and after, file by file (D-07)"
    - "RAILS' GUIDE has eighteen cards: Nose Rail Blends From · Nose Rail Ends At sits before the tail's card, drawn from the board's own nose with the pair pushed in muted dashes, its three sentences on the words page and in the words module, held to each other line for line (D-05)"
  artifacts:
    - path: lib/geometry/rail-bands.ts
      provides: "the two stored keys on RailBandSpec; noseBlendsFrom and noseEndsAt (what the sliders show); noseBlendStations (what the litres and the 3D board read)"
      contains: "export function noseBlendStations"
    - path: lib/geometry/volume.ts
      provides: "railCharacterFadeAt reading the nose's stations through a third reader; SMOOTH_SURFACE_FADE on the live one, RAIL_CHARACTER_FADE on the fixed one"
      contains: "noseBlendStations"
    - path: lib/geometry/__fixtures__/nose-blend-pin.json
      provides: "the one-time record: 142 boards' litres, 44 surfaces' digests, 12 board files' digests, from the code before the nose keys"
      contains: "GENERATED by scripts/extract-nose-blend-pin.ts"
    - path: lib/geometry/nose-blend-pin.test.ts
      provides: "the identity proof, to the last digit and byte"
      min_lines: 60
    - path: lib/models/design-snapshot.ts
      provides: "rule 15 and the two optional, forgiving keys on the rails schema"
      contains: "noseRailBlendsFrom"
    - path: components/rails/rail-controls.tsx
      provides: "the nose card's two rows and their note, last before Reset"
      contains: "Nose Rail Blends From"
    - path: components/3d/three-d-controls.tsx
      provides: "ThreeDNoseRail, drawn above ThreeDTailRail inside Rail Blend Controls"
      contains: "export function ThreeDNoseRail"
    - path: e2e/nose-rail-blend.spec.ts
      provides: "the two rows on RAILS and on 3D, one value on both, on a computer and the phones"
      min_lines: 150
    - path: lib/geometry/guide-rails.ts
      provides: "the eighteenth card, its push and its drawing of the nose from above"
      contains: "noseBlends"
    - path: components/guide/words/rails.ts
      provides: "the card's three sentences, the founder's first drafts"
      contains: "Nose Rail Blends From · Nose Rail Ends At"
  key_links:
    - from: "lib/geometry/volume.ts SMOOTH_SURFACE_FADE"
      to: "lib/geometry/rail-bands.ts noseBlendStations"
      via: "railCharacterFadeAt's third reader, called with anchors.center and anchors.nose"
      pattern: "railCharacterFadeAt\\(hardEdgeBlendsFrom, hardEdgeEndsAt, noseBlendStations\\)"
    - from: "lib/geometry/board-surface.ts surfaceStations"
      to: "lib/geometry/rail-bands.ts noseBlendStations"
      via: "a ring at each end of the nose's blend when the nose's rail differs from the centre's"
      pattern: "noseBlendStations\\("
    - from: "components/rails/rail-band-editor.tsx"
      to: "components/design/design-store.tsx setNoseRailBlendsFrom / setNoseRailEndsAt"
      via: "RailControls' two new callbacks"
      pattern: "setNoseRailBlendsFrom"
    - from: "components/3d/three-d-controls.tsx ThreeDNoseRail"
      to: "components/design/design-store.tsx"
      via: "useDesign's two setters, the very ones RAILS calls"
      pattern: "setNoseRailEndsAt\\("
    - from: "components/guide/words/rails.ts"
      to: ".planning/milestones/v1.5-phases/18-a-guide-on-every-page/18-GUIDE-WORDS.md"
      via: "components/guide/words/rails.test.ts, exact string equality card for card"
      pattern: "Nose Rail Blends From · Nose Rail Ends At"
---

<objective>
Give the nose's rail its own blend control, a twin of the tail's: **Nose Rail Blends From** and **Nose Rail Ends At**, measured
from the nose (the founder, 2026-11-27: "I think we need to add a center to nose rail blend control like we did for the tail";
"1-5 as suggested, it's for shaping by hand"). The nose's rail as set runs full from the tip back to Blends From, fades by the
same level-ended curve, and is the centre's rail by Ends At. This reverses his Phase 16 ruling of 2026-11-04 (D-32: "We don't
need slider controls." / "Only the tail rail gets the users blend."), and every comment that quotes that ruling as the reason
the nose has no control says so.

Purpose: a shaper working by hand can now say where the nose's rail hands over to the centre's, see it on the 3D board and
read it on RAILS, exactly as for the tail.

Identity (D-02, the hard requirement): a board that stores neither new key draws, counts litres, prints and exports byte for
byte as on main today. The proof is recorded before the code changes and held by a test; nothing already pinned is re-recorded.

Output: the two stored keys and their readers, the litres' and 3D board's rule reading them, RAILS' and 3D's rows, a GUIDE card
with its first-draft words on the words page, a one-time record with its test, a browser spec, and a SUMMARY in a shaper's
words.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@./AGENTS.md
@.planning/quick/261127-kkw-add-a-centre-to-nose-rail-blend-control-/261127-kkw-CONTEXT.md

Code the executor reads (line numbers on main b4e90aa4):
- lib/geometry/rail-bands.ts: `RailBandSpec` (~246-277), the ranges (~279-301), `HardEdgeWindow`, `storedInside`, `clampInto`,
  `blendsFromWindow`, `endsAtWindow`, `readBlendsFrom`, `readEndsAt`, `hardEdgeWindowOnGrid`, `defaultTailRailBlendsFrom`,
  `defaultTailRailEndsAt`, `hardEdgeBlendsFrom`, `hardEdgeEndsAt` (~327-435), the D-30 readers (~437-478),
  `hardEdgeBlendsFromWindow` / `hardEdgeEndsAtWindow` (~480-497)
- lib/geometry/volume.ts: `tailHardEdgeWeight` (~799), `railCharacterOf` / `railCharacterDifferences` (~861-883),
  `noseRailWeight` (~890-903), `railCharacterFadeAt` (~989-1010), `RAIL_CHARACTER_FADE` (~1012-1032), `SMOOTH_SURFACE_FADE`
  (~1034-1050), `boardSectionsWith` (anchors ~1476-1480, the rule's call ~1603-1609), `computeCrossSectionVolume`'s doc
  (~1764-1800)
- lib/geometry/rocker.ts `rockerStationPositions` (~348): the centre station is `mm(length / 2)`, the nose 12" station
  `mm(length - MEASURE_STATION_MM)`
- lib/geometry/board-surface.ts `surfaceStations` (~171-222)
- lib/geometry/blank-reasons.ts: the two formatters and the two slider helpers (~351-387); lib/geometry/measure-display.ts
  `measureSlider` (~393)
- lib/models/design-snapshot.ts: rule 13 (~143-155), the outer bounds (~470-480), `railBandSpecSchema` (~482-515)
- components/design/design-store.tsx: the type docs (~533-549), the two setters (~1076-1102), `resetRailAdvanced` (~1126-1160),
  the context value (~2237)
- components/rails/rail-controls.tsx: props (~40-81, ~150-184), `tailRailRows` (~268-315), the Advanced fold (~428-529),
  `RailControls` (~577-704); components/rails/rail-band-editor.tsx (~50-62, ~316-334)
- components/3d/three-d-controls.tsx: `ThreeDTailRail`, `ThreeDRailBlend` (~111-188); components/3d/three-d-copy.ts (~48-58)
- lib/geometry/guide-rails.ts whole; components/guide/words/rails.ts whole; components/guide/words/read-words-page.ts (how the
  page is read); the words page's `## RAILS` section (~224-320)
- Tests that already cover the tail and get twins: lib/geometry/rail-bands.test.ts (~972-1148), lib/geometry/volume.test.ts
  (~923-1190, ~1276, ~1375), lib/geometry/board-surface.test.ts (~205-260), lib/models/design-snapshot.test.ts (~1069-1160),
  components/design/design-store.test.ts (its `handler(...)` source reader), e2e/rails-advanced.spec.ts (helpers ~58-170, test
  "1." ~175-205, the Tail Rail describe ~816-1207, helpers ~1211-1265), e2e/three-d-hard-edge.spec.ts (helpers ~39-120),
  lib/geometry/guide-rails.test.ts whole
- Precedents for the record: scripts/extract-phase16-surface-litres-pin.ts and lib/geometry/phase16-surface-litres-pin.test.ts
  (a one-time record that refuses to run again), lib/geometry/__fixtures__/phase16-boards.ts (the 102 boards), lib/export/brd.test.ts
  `flatSurface` (how a test builds a surface and a board file from a board)

This plan adds no route, layout, metadata, server action or package: every component edit follows the file it sits in. If
anything Next-specific turns out to be needed, read the guide under node_modules/next/dist/docs/ first (AGENTS.md).
</context>

## How the default stays today's rule (D-02), worked out at plan time

Today the nose's weight at a station ahead of the centre is `noseRailWeight(station, anchors.center, anchors.nose)`: 0 at and
behind the centre station `mm(length / 2)`, 1 at and ahead of the nose 12" station `mm(length - MEASURE_STATION_MM)`, and
`t²(3 − 2t)` between. Three facts decide the design:

1. **The tail's weight function cannot be reused mirrored.** `tailHardEdgeWeight(distanceFromNose, from, ends)` is the same
   curve on paper, but it differs from `noseRailWeight` in the last bits (measured: up to 6.7e-16 across a blend). So the nose
   keeps `noseRailWeight`, body untouched, and only the two stations it is given change.
2. **The tail's default end cannot be reused for the litres.** `defaultTailRailEndsAt` is the centre rounded inward onto the
   1/2" grid: 36 1/2" on a 73 7/8" board, whose centre is 36 15/16". Today's nose rule ends at the true centre. So there are
   two readers: what the slider **shows** (the tail's own defaults: 12" and the slider's top) and what the litres and the 3D
   board **read** (stations from the tail).
3. **The read is structural, not arithmetic.** `noseBlendStations(rails, length, centre, nose12)` hands back the very `nose12`
   it was given when Blends From is absent or refused, and the very `centre` when Ends At is; only a stored, valid value turns
   into `mm(length - stored)`. A board with neither key therefore makes the identical call with the identical three doubles.
   The same holds in `surfaceStations`: the two stations it adds are the anchors already in its list, and the list's own
   duplicate check drops them, so the ring list is unchanged.

The keys are measured from the nose tip (D-06) and become stations from the tail as `length - value`. Each key defaults on its
own: an absent Ends At always means the true centre, whatever Blends From holds, so dragging one slider never moves the other's
meaning. Measured at plan time: on every whole-inch length from 4'0" to 12'0" the pair a drag stores at the sliders' own ends
(12" and the top) resolves to the two anchors bit for bit, so dragging away and back leaves such a board as it was; on a board
whose centre is off the 1/2" grid the label reads the slider's top while the untouched blend ends at the true centre, which is
D-02's own ruling.

**Short boards (D-03).** The windows are the tail's, read from the nose tip: Blends From 12" to min(30", centre − 2"), Ends At
from Blends From + 2" to the centre. A board shorter than 5'4" has its centre nearer than 32", so Blends From tops out 2" short
of the centre: 22" on a 4'0" (Ends At 14" to 24"), 26" on a 4'8", 28" on a 5'0". Both tips' windows end at the centre and never
pass it, so the two blends can meet there and never overlap. 12" is inside the window on every board the app draws (4'0" up).

**What the control moves** (emulated at plan time through `summarizeDesignWith`): the stock 6'0", whose nose rail is the
centre's, 30.2850 L at every setting (D-08); the same board with the nose's Symmetrical ticked, 29.96 L untouched, 30.22 L with
Ends At at 14", 29.77 L with Blends From at 30"; the Shortboard preset 29.6116 L untouched, 29.5816 L with Ends At at 14". No
test types these figures; they say which board a browser test can see move at VOLUME's two decimals.

**Plan-time cross-check of the record's recipe** (main b4e90aa4; not expected values for any test): `shortboard|asis|hard`
litres `29.611625570636800`, surface digest begins `ca65dbe7a7cd`, board-file digest begins `4d52745b2aae`;
`sweep|73.875|symmetrical` surface `9defa156963b`, file `e66f8cdc3e43`. The whole record (142 litres, 44 surfaces, 12 files)
took under 15 seconds. If the executor's first record does not begin with these, either its base is not main's `lib/` or its
recipe differs from the one in Task 1: stop and say which.

## Every reader of the tail's two keys, and what the nose gets

| Reader | Where | The nose |
|---|---|---|
| `tailHardEdgeBlendsFrom` / `tailHardEdgeEndsAt` on `RailBandSpec` | rail-bands.ts | TWIN: `noseRailBlendsFrom` / `noseRailEndsAt`, millimetres from the nose tip |
| `hardEdgeBlendsFrom` / `hardEdgeEndsAt` | rail-bands.ts | TWIN, the shown values: `noseBlendsFrom` / `noseEndsAt`, on the same private `readBlendsFrom` / `readEndsAt` and the same two defaults |
| (none) | rail-bands.ts | NEW: `noseBlendStations`, what the litres and the 3D board read |
| `hardEdgeBlendsFromWindow`, `hardEdgeEndsAtWindow`, `hardEdgeWindowOnGrid`, the `HARD_EDGE_*` ranges | rail-bands.ts | SHARED as they are: a window measured from a tip; comments say "from its own tip" |
| `d30HardEdgeBlendsFrom`, `d30HardEdgeEndsAt`, `d30DefaultHardEdgeEndsAt`, `withD30TailRailBlend` | rail-bands.ts | LEFT ALONE: D-30's old tail rule, by name |
| `tailHardEdgeWeight` | volume.ts | LEFT ALONE (fact 1 above) |
| `noseRailWeight` | volume.ts | body untouched, not one operator; COMMENT corrected |
| `railCharacterFadeAt` | volume.ts | CHANGED: a third reader, the nose's stations |
| `SMOOTH_SURFACE_FADE` (the live rule) | volume.ts | reads `noseBlendStations` |
| `RAIL_CHARACTER_FADE` (plan 16-15's rule, by name) | volume.ts | LEFT on the fixed nose rule, whatever a board stores; COMMENT corrected |
| `HARD_EDGE_SWITCH`, `HARD_EDGE_FADE` | volume.ts | LEFT ALONE |
| `computeCrossSectionVolume`'s doc ("with no control") | volume.ts | COMMENT corrected |
| `surfaceStations` | board-surface.ts | TWIN: a ring at each end of the nose's blend when the nose's rail differs |
| `formatHardEdgeBlendsFrom` / `formatHardEdgeEndsAt`, `hardEdgeBlendsFromSlider` / `hardEdgeEndsAtSlider` | blank-reasons.ts | SHARED, called with the nose's two values; comments say so; no code change |
| rule 13, `railBandSpecSchema` | design-snapshot.ts | TWIN keys, rule 15 |
| `setTailHardEdgeBlendsFrom` / `setTailHardEdgeEndsAt`, `resetRailAdvanced` | design-store.tsx | TWIN setters; the Nose Rail card's Reset deletes the nose's two |
| `tailRailRows` and its props | rail-controls.tsx, rail-band-editor.tsx | TWIN rows on the nose card; three comments corrected |
| `ThreeDTailRail`, `ThreeDRailBlend`, the copy | three-d-controls.tsx, three-d-copy.ts | TWIN `ThreeDNoseRail`; three comments corrected |
| `blendsPush`, `blendsFigure`, the card, its words | guide-rails.ts, words/rails.ts, the words page | TWIN card |
| `brdRailsSpec`, `fitBrdTailBlend`, `BrdTailBlend`, the preview's Rails line | brd-rails.ts, lib/export/brd-fit-preview.ts | LEFT ALONE (D-07) |
| hard-edge-report, rail-character-report, tail-blend-report, surface-report, check-saved-boards | lib/models, scripts | LEFT ALONE: records of past changes |
| `buildRailsPresetSource` | preset-source.ts | LEFT ALONE: it prints neither tip's blend, and no preset stores one |
| the dated re-record note quoting D-32 | e2e/desktop-baseline.spec.ts ~131 | LEFT ALONE: a log entry, not a rule |

Three calls the decisions leave to the planner, made here and reported to the orchestrator: the nose's two keys are put back by
the **Nose Rail card's own** Reset Advanced Settings (as the tail's are by the tail's; neither card's Reset touches the other's
pair); the nose's rows and card come **before** the tail's on 3D and in the GUIDE, the order RAILS' cards run; and the GUIDE
card always draws the nose's rail line, since a nose always has a rail where a tail does not always have a hard edge.

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: the record first, then Nose Rail Blends From and Ends At work on RAILS, from the saved board to the litres (D-01, D-02, D-03, D-06, D-07, D-08)</name>
  <files>lib/geometry/__fixtures__/nose-blend-boards.ts, lib/geometry/__fixtures__/nose-blend-pin.json, scripts/extract-nose-blend-pin.ts, lib/geometry/nose-blend-pin.test.ts, lib/geometry/rail-bands.ts, lib/geometry/rail-bands.test.ts, lib/geometry/volume.ts, lib/geometry/volume.test.ts, lib/geometry/board-surface.ts, lib/geometry/board-surface.test.ts, lib/geometry/blank-reasons.ts, lib/models/design-snapshot.ts, lib/models/design-snapshot.test.ts, components/design/design-store.tsx, components/design/design-store.test.ts, components/rails/rail-controls.tsx, components/rails/rail-band-editor.tsx, e2e/nose-rail-blend.spec.ts, e2e/rails-advanced.spec.ts</files>
  <read_first>The two plan sections above (how the default stays today's rule; the reader table). Every file and range under "Code the executor reads" down to rail-band-editor.tsx. The record's precedents: scripts/extract-phase16-surface-litres-pin.ts, lib/geometry/phase16-surface-litres-pin.test.ts, lib/geometry/__fixtures__/phase16-boards.ts, lib/export/brd.test.ts `flatSurface`. e2e/rails-advanced.spec.ts helpers and its Tail Rail describe.</read_first>
  <behavior>
    - Record (lib/geometry/nose-blend-pin.test.ts), green on the untouched code and at every later commit: the record names its generator and holds exactly the boards the fixture builds (142 litres, 44 surfaces, 12 files); every board's `summarizeDesign(fields).volumeLitres.toPrecision(17)` is the recorded string; every recorded surface digest and board-file digest is reproduced; no board of the sets has either nose key; every sweep board's nose differs from its centre (`railCharacterDifferences(rails, "nose")` is not empty).
    - Readers (rail-bands.test.ts, a describe beside the tail's): `noseBlendsFrom` and `noseEndsAt` read 12" and the top of Ends At's slider on a board that says nothing, at the founder's presets' lengths and at lengths whose centre is off the 1/2" grid, and equal `hardEdgeBlendsFrom` / `hardEdgeEndsAt` of a board carrying the same two numbers under the tail's keys (one rule, two tips); a stored 20"/26" pair reads as stored; garbage (a string, NaN, Infinity, null, a negative, an object), an out-of-window value and a crossing pair read the defaults; over a sweep of stored values and lengths every resolved pair is ordered and inside its windows.
    - Stations (rail-bands.test.ts): given two sentinel anchors that are not the board's real stations, `noseBlendStations` on a board with neither key returns those two numbers themselves (`toBe`), which proves no arithmetic touches the default; a stored valid Blends From alone gives `mm(length - stored)` and the sentinel centre; a stored valid Ends At alone gives the sentinel nose 12" and `mm(length - stored)`; a refused value gives its sentinel; with the real anchors, over the sweep, `goneAt` is never behind the centre and `fullFrom - goneAt` is at least 2".
    - Litres' rule (volume.test.ts, a describe beside "D-32 the whole rail character blends"): on boards with neither key (the Shortboard, the Fish, the 73 7/8" sweep board) the live rule's nose weight at every litres station and a fine sweep ahead of the centre is `noseRailWeight(station, anchors.center, anchors.nose)` exactly (`toBe`); with 18"/30" stored it is 1 at and ahead of `length - 18"`, 0 at and behind `length - 30"`, a half midway, never falls toward the nose, and is within 1e-12 of the tail's weight at the mirrored distance; the station area has no step at either mark; the nose 12" station is the full nose rail at every stored Blends From; on a board whose nose rail is the centre's any stored pair leaves the litres the very same number (`toBe`, D-08); on the stock board with the nose's Symmetrical ticked a stored Ends At of 14" changes the litres; `RAIL_CHARACTER_FADE`, by name, reads the same litres with and without a stored nose pair; garbage and a crossing pair read as the untouched board (`toBe`); on the six sweep lengths whose centre is on the 1/2" grid, the pair a drag stores at the sliders' own ends gives the untouched board's litres (`toBe`).
    - 3D rings (board-surface.test.ts, beside the tail's off-grid case): a nose blend set off the grid (20 1/2" and 33" from the nose, on a board whose nose rail differs) gets a ring exactly at `length - 20 1/2"` and `length - 33"`, the nose's rail ahead of the first and the centre's behind the second as `boardSections` says, the mesh watertight, the litres' gap inside the tail case's own bound.
    - Saved boards (design-snapshot.test.ts, rule 15, the twin of rule 13's describe): a board saved without either key opens with no such key and no such text in its rails; a stored 20"/26" pair is kept exactly; one key alone is kept; a value that could sit on no board opens with no key and the rest of the rails exactly as saved; a crossing pair is kept as stored and read as a valid pair; a pair round-trips through `buildSnapshot` and `parseSnapshot` at version 5.
    - Store (design-store.test.ts, source contract): each new setter starts with the lock check before its `noteEdit`, has its own coalescing key, writes only its key; `resetRailAdvanced` destructures both nose keys out for the nose; both setters are on the context value.
    - Opening a file (in nose-blend-pin.test.ts): the rails `brdRailsSpec` builds, with and without a fitted tail blend, carry neither nose key (D-07).
    - Browser (e2e/nose-rail-blend.spec.ts, RAILS, every project): on the stock board the Nose Rail's Advanced fold ends note, Blends From, Ends At, Reset, with the default figures from the app's own readers and formatter; moving Ends At to its lowest changes its label and leaves VOLUME's Estimated Volume text as it was (D-08); then, with Ends At back at its top and the nose's Symmetrical ticked, VOLUME's text is read, Ends At is moved to its lowest again, and VOLUME's text is different; a reload keeps both labels; the board this browser keeps stores `noseRailEndsAt` as `inchesToMm(14)` and no Blends From key until that slider moves.
  </behavior>
  <action>
Setup. Note the worktree's starting commit as BASE. If the worktree has no node_modules, hardlink main's (`rsync -a --link-dest=/Users/kontoes/Code/shaper/node_modules /Users/kontoes/Code/shaper/node_modules/ <worktree>/node_modules/`); run `npx next typegen` if route types are missing. Never cd into a subfolder; use absolute paths and `git -C`. Scratch files live in your own scratchpad, never under the repo, the worktree or .planning.

Step 0, before any product file changes: two before-runs in scratch, for D-02's presets and D-07's files. (a) Unpack `.planning/quick/261125-v2f-open-a-board-file-brings-back-a-nose-con/261125-v2f-scripts.tar.gz` into a NEW empty scratch folder S and run its `measure.mts` as its README says, with ROOT the worktree, label `kkw-t12-before`, one open each; it must print "12 files" and no line with two exclamation marks. The founder's .brd files are read where they are in ~/Downloads, never copied, committed, packed or named in a test. If the sandbox cannot read ~/Downloads, say so in the SUMMARY: D-07 then rests on the unchanged files and the unit case, and the orchestrator runs this pair from the main checkout. (b) A scratch script of your own in S that, for each of `BOARD_PRESETS`, takes `presetDesignFields(preset)` (lib/blanks/preset-blanks.ts: the preset as its card opens it today) with `railsImportFoilThickness: true` and `volume: DEFAULT_VOLUME_SPEC`, and prints the label, the litres to 17 digits, the surface digest and the board-file digest by the recipe below; save its output as `kkw-presets-before.txt`.

Step 1, the record, its own commit, still before any product file changes (D-02). Create lib/geometry/__fixtures__/nose-blend-boards.ts (test support: only the record's script and test import it, and it is the one file here that may import `node:crypto`, for the two digests, so nothing a screen imports may ever import it) exporting: the eight sweep lengths in inches 48, 56, 63.5, 72, 73.875, 86, 108 and 144 (both ends of the range, two with a centre nearer than 30", two whose centre is off the 1/2" grid); the five one-setting changes to the stock nose rail named `knifey` (family 5), `boxy` (family 1), `symmetrical`, `single-tuck` and `sharp-tuck`; `noseBlendSweepBoards()`, the 40 hand-set boards labelled `sweep|<length>|<nose>`, each with `outline: holdOutlineToLength({ ...DEFAULT_BOARD_SPEC.outline, length })`, the stock rocker and foil, `DEFAULT_RAIL_BAND_SPEC` with that one nose change, `railsImportFoilThickness: true`, `DEFAULT_VOLUME_SPEC` and `blank: null`; `noseBlendPinBoards()`, the 102 of `phase16SurfaceBoards()` under their own labels followed by the 40; the four preset labels `shortboard|asis|hard`, `fish|asis|hard`, `midlength|asis|hard` and `longboard|asis|soft` (each preset on its recorded blank with its own Hard Edge); the surface builder (as brd.test.ts's `flatSurface`); the surface digest, SHA-256 in hex over the raw bytes of `positions`, then `indices`, then `faceKinds`; and the board-file digest, SHA-256 in hex of `brdFile(surface, "Board").data`. Create scripts/extract-nose-blend-pin.ts on the model of scripts/extract-phase16-surface-litres-pin.ts: run from the repository root with the repo's own tsx, it writes lib/geometry/__fixtures__/nose-blend-pin.json holding a provenance line (generated by that script, from the app before the nose's blend had sliders, the HEAD commit and the date, never hand-edit), `litres` for all 142 boards (`toPrecision(17)`, strings), `surfaces` for the four presets and all 40 sweep boards, and `files` for the four presets and the eight `symmetrical` sweep boards; and it REFUSES to run once lib/geometry/rail-bands.ts exports `noseBlendStations`, because from then on it would only record the new code against itself. Run it once, compare the cross-check figures in the plan, write lib/geometry/nose-blend-pin.test.ts from the first `<behavior>` bullet (each board its own case, a generous timeout on the surface and file cases as the suite's other slow tests have), see it pass, and commit these four files alone: `test(quick-261127-kkw): record today's litres, 3D shape and board-file bytes on 142 boards, before the nose rail's blend gets its sliders`. The JSON is never regenerated or edited after this commit.

Step 2, the tests for everything else in `<behavior>`, written first and seen to fail (the readers and setters do not exist yet). Every expected figure is the app's own (`inchesToMm`, `formatDim`, the readers, the windows); none is typed.

Step 3, the maths, per D-01, D-03, D-06. In lib/geometry/rail-bands.ts add `noseRailBlendsFrom?: Mm` and `noseRailEndsAt?: Mm` to `RailBandSpec`, each documented as the tail's are: millimetres from the nose tip, absent on every board saved before quick 261127-kkw and on every preset, absent reads today's rule, always read through the readers. Add `noseBlendsFrom(rails, length)` and `noseEndsAt(rails, length)`, the values the sliders show, built on the same private `readBlendsFrom` and `readEndsAt` with the same two defaults as the tail's readers, so the window logic cannot drift between the tips. Add `noseBlendStations(rails, length, centre, nose12)` returning `fullFrom` and `goneAt` as stations from the tail: Blends From is taken when it is a finite number inside `blendsFromWindow(length)`, Ends At when it is a finite number inside `endsAtWindow` of the shown Blends From; a taken value becomes `mm(length - value)`; anything else returns the anchor it was handed, untouched. Its doc comment states the three facts from the plan's section in the file's voice, and that an untouched Ends At is the true centre while its slider shows its top (D-02). Correct `RailBandSpec`'s doc sentence that says the nose's blend is automatic and stores nothing, and reword `HardEdgeWindow`'s and the two window functions' comments to "from its own tip". Do not touch the D-30 readers.

In lib/geometry/volume.ts give `railCharacterFadeAt` a third parameter typed as `typeof noseBlendStations`; in its nose branch, after the unchanged early return for a nose that matches the centre, read the two stations through it with `anchors.center` and `anchors.nose` and return `noseRailWeight(station, goneAt, fullFrom)`. Add a module-private fixed reader that returns the two anchors as given, and pass it from `RAIL_CHARACTER_FADE` (D-30's readers stay its first two arguments); pass `noseBlendStations` from `SMOOTH_SURFACE_FADE`. `noseRailWeight`'s body is not touched, not one operator. Correct four comments: `noseRailWeight`'s (the founder's D-32 words stay as the history, followed by his 2026-11-27 reversal and what its two station arguments now are), `RAIL_CHARACTER_FADE`'s nose bullet (this old rule keeps the fixed nose blend whatever a board stores), `SMOOTH_SURFACE_FADE`'s (it reads the nose's two settings since quick 261127-kkw), and `computeCrossSectionVolume`'s "with no control" sentence.

In lib/geometry/board-surface.ts `surfaceStations`, after the tail's block and under the same kind of guard for the nose, push the nose's two stations from `noseBlendStations(rails, length, anchors[2].station, anchors[3].station)` when they are inside the board; extend the doc comment. On an untouched board both are already in the list and its duplicate check drops them.

In lib/geometry/blank-reasons.ts change comments only: the two formatters and the two slider helpers also serve the nose's pair, measured from the nose tip.

In lib/models/design-snapshot.ts add rule 15 to the header, in rule 13's voice: the two keys, millimetres from the nose tip, absent on every earlier board and reading today's nose rule, forgiving on read exactly as the tail's two, version stays 5 for rule 6's reason, no database change. Add the two keys to `railBandSpecSchema` with the tail's own outer bounds and `.optional().catch(undefined)`, and to the transform that leaves no key behind for a refused value.

Step 4, the store, per D-06. In components/design/design-store.tsx add `setNoseRailBlendsFrom` and `setNoseRailEndsAt` beside the tail's two, the same shape: nothing on a locked board, `noteEdit("rails:nose:railBlendsFrom")` and `noteEdit("rails:nose:railEndsAt")` so one drag is one undo step, the one key written. In `resetRailAdvanced` the nose's Reset rebuilds the rails without both nose keys (destructured out, never set to undefined), as the tail's does without the tail's two; the tail's Reset leaves the nose's pair and the nose's leaves the tail's. Document both on the context type, put both on the context value, and correct the reset's comments.

Step 5, RAILS, per D-04 and D-08. In components/rails/rail-controls.tsx add the two callbacks to `RailControlsProps` and the nose's stored pair and callbacks to `RailSectionControlsProps`, and draw the nose's rows where the tail's are drawn, last before Reset: either a twin of `tailRailRows` or one shared row builder both tips call. The note is the tail's own sentence, held once in a module constant so it is not typed twice. The rows read `Nose Rail Blends From — <figure>` and `Nose Rail Ends At — <figure>`, their sliders are named `Nose Rail blends from` and `Nose Rail ends at`, and their spoken values end `from the nose`; the figures come from `noseBlendsFrom` / `noseEndsAt`, the ranges from `hardEdgeBlendsFromSlider` / `hardEdgeEndsAtSlider` and the text from `formatHardEdgeBlendsFrom` / `formatHardEdgeEndsAt`, so no unit is converted in the component (Rule 2). They always show, as the tail's do on a tail that matches the centre, with no new words (D-08); `SliderRow` greys them on a locked board. The tail's rows keep their text, order, spoken names and markup exactly. Correct the three comments that say the nose has no row, noting the founder's 2026-11-27 reversal of D-32. In components/rails/rail-band-editor.tsx pass the two setters.

Step 6, the browser. Write e2e/nose-rail-blend.spec.ts with the RAILS cases from `<behavior>`, copying the few helpers it needs from e2e/rails-advanced.spec.ts (`dismissStrips`, `openRails`, `showRail`, `openAdvanced`, `advancedRows`, `estimatedVolume`, the kept-board reader) rather than exporting them. In e2e/rails-advanced.spec.ts change exactly two tests: "1." expects the nose's three new rows (the note, Blends From, Ends At) between Sharp Bottom Tuck and Reset, and the centre's list is the nose's without the scale and without those three; "11." becomes: the centre's Advanced has neither blend row, the nose's has its own two and never the tail's. Quote every removed test line in the SUMMARY (`git -C <worktree> diff -U0 <BASE> -- '*.test.ts' '*.spec.ts' | grep -E '^-[^-]'`).

Step 7, the proof again. Run the record's test and the pins that must pass untouched (below); repeat Step 0's two runs with the labels `kkw-t12-after` and `kkw-presets-after.txt`; `same.mjs kkw-t12-before kkw-t12-after` must say 12 files compared, 0 differ, and the two preset files must be identical. If anything differs, stop and report it as a deviation; never regenerate the record.

Commit: `feat(quick-261127-kkw): RAILS: the nose rail gets Blends From and Ends At sliders like the tail's; a board that never moves them is cut exactly as before`.
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/nose-blend-pin.test.ts lib/geometry/rail-bands.test.ts lib/models/design-snapshot.test.ts components/design/design-store.test.ts lib/geometry/phase16-surface-litres-pin.test.ts lib/geometry/phase16-live-litres-pin.test.ts lib/geometry/phase17-channel-litres.test.ts && npx tsc --noEmit</automated>
    Then, each in its own call and read to its exit line: `npx vitest run lib/geometry/volume.test.ts lib/geometry/board-surface.test.ts lib/export/brd.test.ts lib/geometry/brd-rails.test.ts lib/models/tail-blend-report.test.ts lib/geometry/phase16-litres-pin.test.ts lib/geometry/phase17-litres-pin.test.ts`; `PW_PORT=3161 npx playwright test e2e/nose-rail-blend.spec.ts`; `PW_PORT=3161 npx playwright test e2e/rails-advanced.spec.ts --project=desktop`. And: `git -C <worktree> log --format=%h -- lib/geometry/__fixtures__/nose-blend-pin.json` lists one commit; `git -C <worktree> diff --name-only <BASE> -- lib/geometry/__fixtures__` lists only the two new files.
  </verify>
  <done>The record is committed alone from the untouched code and reproduced to the last digit and byte after the change; the 102-board, 74-board, 40-board and channelled-board pins pass with no fixture touched; the twelve files and the four presets as their cards open them are the same before and after (or the SUMMARY says the files could not be read here); the Nose Rail card shows its two rows, moves VOLUME's litres on a board whose nose differs and nothing on one whose nose is the centre's, and a reload keeps them; two commits.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: the same two sliders on the 3D page, one value on both pages, with the reset, the lock and Metric proven in the browser (D-03, D-04, D-06)</name>
  <files>components/3d/three-d-controls.tsx, components/3d/three-d-copy.ts, e2e/nose-rail-blend.spec.ts, e2e/three-d-hard-edge.spec.ts</files>
  <read_first>components/3d/three-d-controls.tsx `ThreeDTailRail` and `ThreeDRailBlend`; components/3d/three-d-copy.ts ~48-58; e2e/three-d-hard-edge.spec.ts whole (its `openThreeD`, `litres`, the kept-board seeding, why iPhone is skipped); e2e/rails-advanced.spec.ts tests "3." to "8." of the Tail Rail describe and the helpers under them (`stockBoardFields`, `keepOpenBoard`, `pageLines`, `centimetres`); components/design/board-lock-scope.test.ts and components/design/slider-row.test.ts (what they scan).</read_first>
  <behavior>
    - 3D shares the value (desktop and android; iPhone skipped as three-d-hard-edge.spec.ts skips it): with Rail Blend Controls opened, the nose's two rows sit above the tail's two and read the stock defaults; Nose Rail Ends At moved to its lowest on 3D reads the same figure on RAILS' nose row; Nose Rail Blends From moved on RAILS reads the same on 3D; on the stock board with the nose's Symmetrical ticked, the move made on 3D changes VOLUME's Estimated Volume text; both sliders take keyboard focus and nothing in the group is inert; the tail's group still holds exactly two sliders.
    - Coupled (every project, RAILS): Ends At stops 2" past Blends From and Blends From stops 2" short of Ends At, with the figures the tail's test "3." uses, read from the nose.
    - Reset and Undo (every project): the Nose Rail's Reset Advanced Settings puts both rows back to the defaults and the kept board then holds neither nose key; one Undo brings both back; with a tail pair and a nose pair both set, the tail's Reset leaves the nose's rows as set and the nose's Reset leaves the tail's.
    - Metric (every project): the rows read `30.5 cm` and `91.4 cm` on the stock board through the app's formatter; a keyboard step lands on the whole-centimetre track and each step after is 1.0 cm, stored as a whole millimetre.
    - Locked (every project): on a locked board both rows are greyed and their sliders disabled on RAILS, and on 3D (desktop and android).
    - A board kept with a nose pair that crosses (26" / 20") opens reading 26" and the top of Ends At's slider, never a crossed pair.
  </behavior>
  <action>
Per D-04, in components/3d/three-d-copy.ts add the nose's five entries beside the tail's, the same words RAILS prints: `Nose Rail Blends From`, `Nose Rail Ends At`, the two spoken slider names `Nose Rail blends from` and `Nose Rail ends at`, and the spoken distance ending `from the nose`; correct the block's comment (the nose has its own two settings since the founder's 2026-11-27 reversal of D-32).

In components/3d/three-d-controls.tsx add and export `ThreeDNoseRail`, the twin of `ThreeDTailRail`: it reads `effectiveRails` and the board's length, the shown pair through `noseBlendsFrom` / `noseEndsAt`, the two slider views and the two figures through the same four helpers RAILS uses, and writes through `setNoseRailBlendsFrom` / `setNoseRailEndsAt`: one value, not two kept in step. Its wrapper carries its own data attribute (`data-three-d-nose-rail`), so every existing test scoped to the tail's group keeps its two sliders. In `ThreeDRailBlend` draw it between the note and `ThreeDTailRail` (the nose first, as RAILS' cards run). Correct the two comments that quote D-32 as the reason the nose has no row. Add one sentence to e2e/three-d-hard-edge.spec.ts's header comment saying the nose got its own rows in quick 261127-kkw and are covered by e2e/nose-rail-blend.spec.ts; change no test there.

Write the `<behavior>` cases into e2e/nose-rail-blend.spec.ts first and see the 3D ones fail, then add the rows. Copy the helpers the new cases need from the two existing specs; every figure is from the app's own readers and formatters (`noseBlendsFrom({}, length)`, `noseEndsAt({}, length)`, `formatDim`, `inchesToMm`), never typed. A board kept in the browser is seeded the way rails-advanced.spec.ts's test "8." seeds its crossing pair.

Look before calling it done: with the dev server on port 3161, take a Playwright screenshot of RAILS with the Nose Rail's Advanced open (desktop and one phone profile) and of 3D with Rail Blend Controls open (desktop) into your scratchpad, read them, and say in the SUMMARY what each shows.

Commit: `feat(quick-261127-kkw): 3D: Rail Blend Controls shows the nose rail's two sliders above the tail's, the same two values RAILS shows`.
  </action>
  <verify>
    <automated>npx vitest run components/design/board-lock-scope.test.ts components/design/slider-row.test.ts components/3d && npx tsc --noEmit</automated>
    Then, each in its own call and read to its exit line: `PW_PORT=3161 npx playwright test e2e/nose-rail-blend.spec.ts` (every project); `PW_PORT=3161 npx playwright test e2e/three-d-hard-edge.spec.ts` (every project).
  </verify>
  <done>The nose's two rows are on 3D above the tail's and share RAILS' values both ways; coupling, Reset with one Undo, Metric, the lock and a crossing pair are proven on a computer and the phones; the tail's 3D spec passes unchanged; one commit.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: a GUIDE card for the nose's blend, its first-draft words on the words page, then every gate and the SUMMARY (D-05)</name>
  <files>lib/geometry/guide-rails.ts, lib/geometry/guide-rails.test.ts, lib/geometry/guide-pages.test.ts, components/guide/words/rails.ts, components/guide/words/rails.test.ts, components/guide/words/volume.test.ts, components/guide/words/metric-sayings.test.ts, components/guide/guide-words.ts, components/guide/guide-words.test.ts, components/guide/rails-guide.tsx, e2e/guide.spec.ts, e2e/guide-rails.spec.ts, .planning/milestones/v1.5-phases/18-a-guide-on-every-page/18-GUIDE-WORDS.md, .planning/quick/261127-kkw-add-a-centre-to-nose-rail-blend-control-/261127-kkw-scripts.tar.gz, .planning/quick/261127-kkw-add-a-centre-to-nose-rail-blend-control-/261127-kkw-SUMMARY.md</files>
  <read_first>lib/geometry/guide-rails.ts whole (`RAILS_GUIDE_CARD_IDS`, `RAILS_GUIDE_PUSH_FIELDS`, `RAILS_GUIDE_SECTION`, `blendsPush`, `blendsFigure`, the card list); lib/geometry/guide-draw.ts `guideWindowFit` (the nose is at the left of every window) and `guideTextBox`; lib/geometry/guide-rails.test.ts whole; components/guide/words/rails.ts, rails.test.ts and read-words-page.ts; the words page's header and `## RAILS` section; e2e/guide-rails.spec.ts; the project skill `sketch-findings-shaper` for the viewers' drafting grammar.</read_first>
  <behavior>
    - Words (components/guide/words/rails.test.ts): RAILS is eighteen cards; the module equals the page card for card in order; the Shortboard gives the page's tag and caption on every card, fifteen tags and seventeen captions.
    - Counts: the five pages are 22, 14, 18, 8 and 23 cards, 85 in all, wherever a test or a comment states them (guide-words.test.ts, guide-words.ts, words/volume.test.ts, words/metric-sayings.test.ts, guide-pages.test.ts, e2e/guide.spec.ts).
    - Builder (lib/geometry/guide-rails.test.ts): eighteen ids in the words page's order with the nose's card just before the tail's; the nose's card is the one card drawn at the nose; on the Shortboard its tag is the shown pair through `formatDim` and reads `12" · 37"`, its caption `dashed · 18" · 37"`, as the page says; a stored mid pair is pushed as a pair toward the centre; in Metric the tag and caption read centimetres to one decimal; the drawing is 176 tall, carries two pushed marks, keeps both figures whole, inside the window and clear of each other on all four presets, on the short board and on every fixture board of guide-pages.test.ts in both systems.
    - Browser (e2e/guide-rails.spec.ts): the existing data-driven cases pass with eighteen cards; the Metric case also reads the nose card's tag as two centimetre figures.
  </behavior>
  <action>
Per D-05, on the words page change the RAILS count line to 18 cards and insert the new card between Sharp Bottom Tuck's block and the tail's card, in the page's own line format (the name in bold, then the tag on the Shortboard `12" · 37"`, then the caption `dashed · 18" · 37"`, then the three lines), with the founder's first drafts exactly as CONTEXT D-05 gives them: name `Nose Rail Blends From · Nose Rail Ends At`; is: Where the nose's rail fades into the centre's: it runs as set from the nose to Blends From, fades, and is the centre's rail by Ends At. does: A longer nose rail carries the nose's shape further back down the board; a shorter one hands over to the centre's rail sooner. how: Pencil Blends From and Ends At on the rail from the nose; shape the nose's rail ahead of the first mark and blend it progressively into the centre's rail by the second. Add the same card to components/guide/words/rails.ts in the same place, character for character, and bring its header comment's count up. Leave the page's intro sentence and every other card's words as they are: they are the founder's to mark up, and the orchestrator is told the intro still names only the centre and the tail.

In lib/geometry/guide-rails.ts add the card id `noseBlends` just before `blends`, its push field, and `nose` as the rail it draws. Generalise the pair's push so both tips use one function over a pair and the board's length (the windows are the same from either tip), giving the nose's card the pushed pair read through `noseBlendsFrom` / `noseEndsAt`. Draw the card as the tail's twin, mirrored: the strip with the nose's station cut and the window over the nose end; the window named `Nose, from above`, one rail from the stringer out, running from a little past the nose tip to the same distance past Ends At as the tail's window runs past its own; the nose's rail drawn just inside the outline, in the finished rail's role from the tip to Blends From and in the faint dashed role from Blends From to Ends At, always (a nose always has a rail); both marks across the rail and the pushed pair in muted dashes; each mark's figure under the stringer, Blends From's running toward the nose and Ends At's toward the tail, each held inside the window by the mirrored form of the tail's two clamps. Tag and caption are the tail's own form on the nose's pair. Bring the file's header and count comments up to eighteen, and say there that the nose's blend card draws the nose. Update components/guide/rails-guide.tsx's comment count.

Write the tests first: every place lib/geometry/guide-rails.test.ts special-cases the tail's blend card gains the nose's twin, and the count tests named in `<behavior>` move to 18 and 85. Quote every removed test line in the SUMMARY.

Look at the picture before calling the drawing done: Playwright screenshots of the new card on the Shortboard, the Longboard and a 4'0" board, on the desktop and at a 360-wide phone, into your scratchpad; read each and describe it in the SUMMARY (figures whole, inside the box, clear of each other; the rail line and its fade where the marks say).

Commit: `feat(quick-261127-kkw): RAILS' GUIDE: a card for Nose Rail Blends From and Ends At, first-draft words on the words page`.

Then the gates, each in its own call and read to its exit line: `npm test` (a time-limit failure in a file this plan does not touch is re-run alone and both results reported); `npx tsc --noEmit`; `npm run lint`; `PW_PORT=3161 npx playwright test e2e/nose-rail-blend.spec.ts`; `PW_PORT=3161 npx playwright test e2e/rails-advanced.spec.ts`; `PW_PORT=3161 npx playwright test e2e/three-d-hard-edge.spec.ts`; `PW_PORT=3161 npx playwright test e2e/guide-rails.spec.ts e2e/guide.spec.ts`; `PW_PORT=3161 npx playwright test e2e/phone-rails.spec.ts`; `PW_PORT=3161 npx playwright test e2e/three-d-screen.spec.ts e2e/template-rails-panels.spec.ts e2e/board-lock-screens.spec.ts --project=desktop`; `PW_PORT=3161 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` (the six pictures must pass as they are: both folds are closed in them; never update a snapshot, and report a difference with its diff picture rather than re-recording). Protected: `git -C <worktree> diff --quiet <BASE> -- e2e/desktop-baseline.spec.ts-snapshots db drizzle lib/db lib/export lib/geometry/presets.ts lib/geometry/brd-rails.ts lib/geometry/brd-fit.ts lib/geometry/preset-source.ts lib/models/hard-edge-report.ts lib/models/rail-character-report.ts lib/models/tail-blend-report.ts lib/models/surface-report.ts scripts/check-saved-boards.ts CLAUDE.md` exits 0; `git -C <worktree> diff --name-only <BASE> -- lib/geometry/__fixtures__` lists only the record's two new files; `git -C <worktree> diff --name-only <BASE>` lists only this plan's files_modified. `npm run build` and `npm run test:e2e:prod` do not run in a worktree; they are the orchestrator's after the merge. Nothing is pushed.

Pack Step 0's and Step 7's scratch outputs (the two twelve-file runs with `same.mjs`'s line, the two preset files, your preset script) and a short README.txt (what each file is, and that no .brd is in it) into `.planning/quick/261127-kkw-add-a-centre-to-nose-rail-blend-control-/261127-kkw-scripts.tar.gz`; list it and confirm no `.brd` entry. Never leave a loose scratch script under .planning.

Write `261127-kkw-SUMMARY.md` in plain shaper's English: what a shaper now sees on RAILS, on 3D and in the GUIDE, and what the two sliders do to the board; that a board that never moves them is unchanged, with the proof in numbers (how many boards the record holds and that all reproduce, the pins that passed untouched, the four presets and the twelve files before and after); what a short board and a board whose length is not a whole inch do; the three calls the plan made (each card's own Reset, the nose before the tail, the card's rail line always drawn); the removed test lines quoted; the pictures looked at; the gates with their counts; anything that deviated. Leave the SUMMARY and the archive uncommitted for the orchestrator unless its prompt says otherwise.
  </action>
  <verify>
    <automated>npx vitest run components/guide lib/geometry/guide-rails.test.ts lib/geometry/guide-pages.test.ts lib/geometry/nose-blend-pin.test.ts && npx tsc --noEmit</automated>
    Then the gates listed in the action, each read to its exit line.
  </verify>
  <done>RAILS' GUIDE shows eighteen cards with the nose's blend card before the tail's, its words on the words page and in the module held line for line; the whole unit suite, tsc, lint and the listed browser specs on port 3161 pass; the six desktop pictures are unchanged; protected paths unchanged; the archive is packed with no .brd; the SUMMARY is written; four code commits in all, nothing pushed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| stored board -> board reader | a saved board's JSON (a database row, the browser's kept copy, or a board file a shaper opens) is untrusted until `design-snapshot.ts` reads it, and its two nose keys are untrusted until the readers in `rail-bands.ts` have placed them |
| the founder's sample files -> the before and after measurement | twelve .brd files in ~/Downloads, read in place |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-kkw-01 | Tampering | `railBandSpecSchema` nose keys (design-snapshot.ts) | low | mitigate | rule 15: each key bounded to what could sit on some board (12"-30"; 14" to the longest board's centre), `.optional().catch(undefined)`, a refused value leaves no key and the rest of the board opens as saved (design-snapshot.test.ts) |
| T-kkw-02 | Tampering | `noseBlendsFrom` / `noseEndsAt` / `noseBlendStations` (rail-bands.ts) | low | mitigate | every read goes through the tail's own windows: a value outside this board's window or a pair that crosses reads the default, so the two stations are always at least 2" apart and never behind the centre (rail-bands.test.ts sweep) |
| T-kkw-03 | Denial of service | `noseRailWeight` given the two stations (volume.ts) | low | mitigate | the readers' 2" least blend keeps the divisor away from zero, and the function's own two early returns answer before it divides; the weight is held into 0 to 1 as before |
| T-kkw-04 | Information disclosure | the founder's ~/Downloads .brd files | low | mitigate | read where they are; never copied, committed, named in a test or packed; the archive's listing is checked for no .brd |
| T-kkw-SC | Tampering | package installs | low | accept | this plan installs no package and changes no lockfile |
</threat_model>

<verification>
- D-02: `lib/geometry/nose-blend-pin.test.ts` reproduces all 142 litres, 44 surfaces and 12 board files recorded before the change; the record's JSON has one commit; the 102-board, 74-board, 40-board and channelled-board pins pass with `lib/geometry/__fixtures__` otherwise untouched; the four presets as their cards open them and the twelve sample files are the same before and after.
- D-01, D-03, D-08: the readers' and the rule's unit sweeps; the browser spec's RAILS cases on three profiles.
- D-04: the browser spec's 3D cases on a computer and a phone; the tail's own specs pass unchanged apart from rails-advanced's tests "1." and "11.".
- D-05: the words test holds the module to the words page; eighteen and 85 everywhere a count is stated; the card's pictures looked at.
- D-06: the snapshot tests for rule 15; no file under db, drizzle or lib/db changes; Reset and Undo in the browser.
- D-07: nothing under lib/export, and neither brd-rails.ts nor brd-fit.ts, changes; an opened board's rails carry no nose key.
</verification>

<success_criteria>
The nose's rail has its two sliders on RAILS and on 3D, one value on both, with the tail's ranges, formatting, note, lock,
Reset and undo behaviour; its GUIDE card and first-draft words are in place; a board that stores neither key is proven
unchanged to the last digit and byte against a record taken before the change, with nothing already pinned re-recorded;
opening a .brd is untouched; four code commits in the worktree; SUMMARY and archive ready for the orchestrator; nothing pushed.
</success_criteria>

<output>
Create `.planning/quick/261127-kkw-add-a-centre-to-nose-rail-blend-control-/261127-kkw-SUMMARY.md` when done.
</output>
