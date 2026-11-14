---
phase: quick-261113-psx
plan: 01
type: execute
wave: 1
depends_on: [quick-261113-kvo]
files_modified:
  - lib/geometry/rail-bands.ts
  - lib/geometry/rail-bands.test.ts
  - lib/geometry/volume.ts
  - lib/geometry/volume.test.ts
  - lib/geometry/blank-reasons.ts
  - lib/geometry/blank-reasons.test.ts
  - lib/geometry/__fixtures__/phase16-boards.ts
  - lib/geometry/__fixtures__/phase14-preset-figures.json
  - lib/geometry/phase14-preset-figures.test.ts
  - lib/geometry/phase16-surface-litres-pin.test.ts
  - lib/geometry/phase17-litres-pin.test.ts
  - lib/geometry/phase17-channel-litres.test.ts
  - lib/geometry/board-surface.test.ts
  - lib/geometry/brd-fit.test.ts
  - lib/geometry/brd-bottom.test.ts
  - components/template/build-brd-overview-pdf.test.ts
  - lib/models/design-snapshot.ts
  - lib/models/design-snapshot.test.ts
  - lib/models/rail-character-report.ts
  - lib/models/rail-character-report.test.ts
  - lib/models/surface-report.ts
  - lib/models/surface-report.test.ts
  - lib/models/hard-edge-report.ts
  - lib/models/tail-blend-report.ts
  - lib/models/tail-blend-report.test.ts
  - scripts/check-saved-boards.ts
  - lib/geometry/guide-rails.ts
  - lib/geometry/guide-rails.test.ts
  - .planning/phases/18-a-guide-on-every-page/18-GUIDE-WORDS.md
  - components/design/design-store.tsx
  - components/rails/rail-controls.tsx
  - e2e/rails-advanced.spec.ts
  - e2e/three-d-hard-edge.spec.ts
  - e2e/desktop-baseline.spec.ts
  - e2e/desktop-baseline.spec.ts-snapshots/
  - .planning/quick/261113-psx-a-new-board-s-tail-rail-blends-from-star/pictures/
autonomous: true
requirements: [PSX-R1-default, PSX-R2-old-rules-by-name, PSX-R3-everything-follows, PSX-R4-tests, PSX-R5-report, PSX-R6-pictures]

estimate:
  tokens: 260000
  raw_tokens: 260000
  tasks: 4
  confidence: low
  # estimate-calibration: factor 1, 0 samples. Raw = kvo's four-task plan (320k raw, 150k actual) less the fit search:
  # the maths is one small rule, the bulk is ~300 re-pointed tests (most one line), four browser specs and pictures.

must_haves:
  truths:
    - "A board that says nothing — a new board, every preset, every saved board that never moved the two sliders — reads Tail Rail Blends From = 12\" (HARD_EDGE_BLENDS_FROM_RANGE_IN.min, the bottom of its own slider) and Tail Rail Ends At = the top of its own slider (the board's centre on the 1/2\" grid: 36\" on the stock 6'0\", 37\" Shortboard, 34\" Fish, 43\" Mid-length, 54\" Longboard; 36 1/2\" on a 73 7/8\" board), so both RAILS and 3D sliders sit at their ends with labels that agree, in Imperial and Metric (PSX-R1)"
    - "A stored pair inside its windows is kept exactly; anything absent, crafted or outside its window reads the new default; the two never cross; the tail 12\" station is always the full tail rail (weight exactly 1) (PSX-R1)"
    - "The litres, the 3D board and the CNC / .brd exports read the new default: the preset cards read 29.6, 34.6, 49.4 and 72.3 L (the Longboard was 72.4) and the stock 6'0\" still 30.29 L on VOLUME (PSX-R1, PSX-R3)"
    - "Go-live 1's and plan 16-15's rules (HARD_EDGE_FADE, RAIL_CHARACTER_FADE) read D-30's old default (18\" and L/6 + 18\") by name, so the 40-, 74- and 102-board pins and the rail-character and surface reports reproduce their recorded figures to the last digit; every pin of the live rule written before this change reads its boards with D-30's pair stored and reproduces its figures bit for bit (PSX-R2, PSX-R4)"
    - "Reset Advanced Settings on the tail still deletes both fields, and now lands on 12\" and the top of Ends At's slider; the RAILS GUIDE card shows the new pair, a dashed push that fits, and every label inside its box (PSX-R3)"
    - "`scripts/check-saved-boards.ts --tail-blend-report` prints, read-only, every saved board whose litres the new default moves — id, the two settings before and after, litres before and after, the move — and nothing else (PSX-R5)"
    - "The founder's pictures exist: RAILS → TAIL RAIL → Advanced at the new defaults on a new Shortboard and Longboard (computer and upright phone), the 3D Longboard's tail-to-centre rail before and after, and the GUIDE card (PSX-R6)"
  artifacts:
    - path: lib/geometry/rail-bands.ts
      provides: "defaultTailRailBlendsFrom(length), defaultTailRailEndsAt(blendsFrom, length), hardEdgeWindowOnGrid(window); the live readers hardEdgeBlendsFrom / hardEdgeEndsAt on the new default; D-30 by name: D30_HARD_EDGE_BLENDS_FROM_IN, D30_HARD_EDGE_ENDS_AT_RULE_IN, d30DefaultHardEdgeEndsAt(length), d30HardEdgeBlendsFrom(rails, length), d30HardEdgeEndsAt(rails, length), withD30TailRailBlend(rails, length)"
    - path: lib/geometry/volume.ts
      provides: "HARD_EDGE_FADE and RAIL_CHARACTER_FADE read the d30 readers; SMOOTH_SURFACE_FADE has its own `at` on the live readers (one private factory, so the two `at`s cannot drift)"
    - path: lib/models/tail-blend-report.ts
      provides: "tailBlendLitresMove(fields), tailBlendReportLines(rows) for the new --tail-blend-report"
  key_links:
    - from: components/rails/rail-controls.tsx and components/3d/three-d-controls.tsx (unchanged)
      to: lib/geometry/rail-bands.ts hardEdgeBlendsFrom / hardEdgeEndsAt -> lib/geometry/blank-reasons.ts hardEdgeBlendsFromSlider / hardEdgeEndsAtSlider -> rail-bands.ts hardEdgeWindowOnGrid
      via: "the default Ends At is worked out on the very grid the slider's top is, so the thumb sits at its end"
    - from: lib/geometry/volume.ts SMOOTH_SURFACE_FADE.at (live litres, 3D, exports)
      to: lib/geometry/rail-bands.ts hardEdgeBlendsFrom / hardEdgeEndsAt
      via: "railCharacterFadeAt(live readers); RAIL_CHARACTER_FADE = railCharacterFadeAt(d30 readers)"
---

# Quick 261113-psx — Tail Rail Blends From 12" and Ends At the top of its slider, as the default

The founder (2026-11-13, word for word): "Let's change Tail Rail Blends From  12" and Ends At the max value as the new default."
Read `BRIEF.md` (this folder) first; it is the orchestrator's brief and its house rules bind every task.

## READ THIS FIRST — what the planner measured (2026-11-13)

### 0. LOUD: the flagged call moves shown figures more than the brief's preset numbers suggest

The brief's call (a saved board that never moved the two sliders follows the new default) is kept. The four presets move
as the brief said, **but**:

- **The Longboard's own home-page card changes its shown digit: 72.4 L → 72.3 L** (72.388 → 72.343 L with its real blank,
  −0.045 L; SUMMARY's order form says the same; VOLUME 72.39 → 72.34). Fish's VOLUME figure 34.65 → 34.64 (card 34.6 stays).
- **Other kinds of board move more than any preset.** On the 102 Phase 16 stand-in boards (every preset × every tail shape
  × Hard Edge on/off, the D-32 tail variants, the winged boards): 85 move, median 0.006 L, **largest +0.325 L** (a hard-edged
  9'0" Longboard: 74.66 → 74.98) and **−0.197 L** (a 9'0" with a Use Single Tuck tail: 73.24 → 73.04); **18 of 102 change
  their card's one-decimal litres**, 49 their VOLUME two-decimal figure; 13 rise, 72 fall. A real saved long board with a
  hard-edged or single-tucked tail can move 0.2-0.3 L.
- So Task 3 builds a read-only `--tail-blend-report` (the 14 D-18 report rule: every go-live that moves saved litres has
  had one) for the founder to run on production before the push. He can drop it; nothing else depends on it.

### 1. The defaults, before → after (resolved by the readers)

| Board | Length | Centre | Blends From | Ends At |
|---|---|---|---|---|
| stock (a new visit) | 6'0" | 36" | 18" → **12"** | 30" → **36"** |
| Shortboard | 6'2" | 37" | 18" → 12" | 30 1/2" → **37"** |
| Fish | 5'8" | 34" | 18" → 12" | 29 1/2" → **34"** |
| Mid-length | 7'2" | 43" | 18" → 12" | 32 1/2" → **43"** |
| Longboard | 9'0" | 54" | 18" → 12" | 36" → **54"** |
| a board 73 1/4" or 73 7/8" long | | 36 5/8", 36 15/16" | 18" → 12" | → **36 1/2"** (the slider's top, 1/8"-7/16" short of the centre) |

Sliders at the new default (measured on 12 lengths, 60"-120"): in Imperial both thumbs sit exactly at their ends and the
labels agree. In Metric the labels read `30.5 cm` and the centre (`91.4 cm` on 6'0", `94.0 cm` on 6'2", `137.2 cm` on 9'0")
and the thumbs sit at the whole-centimetre track's ends (310 mm; 910 / 930 / 1370 mm) — the same as any half-inch value in
Metric today. The first keyboard step from there goes to 32.0 cm (Blends From) and 90.0 cm (Ends At, 6'0").

The 12" anchor station is exactly the new Blends From (both `inchesToMm(12)` = 304.79999999999995 mm) on all four presets,
so RAILS' tail plot stays a full tail rail (tip weight exactly 1).

### 2. Litres as the cards show them (real blanks; `scratchpad/psx/scripts/litres.mts`, `cards.mts`, `stock.mts`)

| Board | Before → after (L) | Card / SUMMARY (1 dp) | VOLUME (2 dp) |
|---|---|---|---|
| Shortboard (Hard Edge) | 29.613 → 29.612 (−0.001) | 29.6 | 29.61 |
| Fish (Hard Edge) | 34.649 → 34.645 (−0.004) | 34.6 | **34.65 → 34.64** |
| Mid-length (Hard Edge, tail Family differs) | 49.404 → 49.398 (−0.006) | 49.4 | 49.40 |
| Longboard (tucked, tail Family differs) | 72.388 → 72.343 (−0.045) | **72.4 → 72.3** | **72.39 → 72.34** |
| stock 6'0" (Hard Edge) | 30.2874 → 30.2850 | — | 30.29 (unchanged: the VOLUME baseline picture should hold) |
| Hard Edge flipped: Shortboard / Fish tucked | 0.000 / 0.000 (their tails are then the centre's rail: nothing blends) | | |
| Hard Edge flipped: Mid-length tucked | 49.365 → 49.356 (−0.009) | 49.4 | 49.37 → 49.36 |
| Hard Edge flipped: Longboard hard | 73.306 → 73.600 (**+0.294**) | 73.3 → 73.6 | |
| No blank (the brief's figures) | Shortboard −0.002, Fish −0.003, Mid −0.006, Longboard −0.044 | | |

Why so little on the short boards: the old blend's middle was (18 + 30 1/2)/2 = 24 1/4" from the tail, the new one's
(12 + 37)/2 = 24 1/2" — nearly the same. On the 9'0" it moves from 27" to 33".

### 3. How far the finished rail moves (the 3D board's ring, largest gap in mm between before and after; `rail-move.mts` + `rail-compare.cjs`)

| Board | 15" | 18" | 21" | 24" | 27" | 30" | 33" | 36" | 39" | 42"+ | worst |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Shortboard (hard) | 0.71 | 2.17 | 1.50 | 0.00 | 0.71 | 0.61 | 0.23 | 0.02 | | | 2.24 at 19 1/2" |
| Fish (hard) | 0.88 | 2.60 | 1.78 | 0.23 | 0.40 | 0.23 | 0.02 | | | | 2.67 at 19 1/2" |
| Mid-length (hard) | 0.47 | 1.49 | 1.04 | 0.29 | 1.17 | 1.15 | 0.70 | 0.40 | 0.15 | 0.01 | 1.57 at 19 1/2" |
| Longboard (as preset) | 0.01 | 0.05 | 0.04 | 0.06 | 0.22 | 0.38 | 0.48 | 0.45 | 0.34 | 0.24 → 0 | 0.48 at 34 1/2" |
| Longboard, Hard Edge ticked | 2.04 | **6.47** | 2.89 | 1.40 | 3.40 | 4.61 | 4.96 | 4.42 | 3.18 | 2.12 → 0 | 6.47 at 18" |
| Shortboard / Fish, Hard Edge off | 0 everywhere | | | | | | | | | | |

Nothing moves at 12" or at the centre. What moves is the rail's bottom edge: at 18" the hard edge used to be full; it is now
about 15% blended toward the tucked rail.

### 4. The .brd rails fit (quick 261113-kvo) on the six files (`brd.mts` + `brd-compare.cjs`; figures only)

| File (usable sections) | New board's rails | Fitted worst / typical, before → after | Settings | Order, bottom |
|---|---|---|---|---|
| 6'10 Egg (3) | 7.51/2.38 → 7.51/2.36 | 2.07/0.73 → **2.07/0.70**; its 16.2" section **1.70 → 1.15** | **tail: Ratio 50/50 → 49/51 and Domed Deck Band +1/2"**; centre, nose the same | bottom-first; bottom the same |
| 6'2 Round Tail (4) | 8.00/2.05 the same | 2.11/0.48 the same | the same | the same |
| Fryer 5'7 (3) | 5.58 → 5.57 / 1.47 | 1.14/0.37 the same | the same | the same |
| Scoop Noserider (5) | 5.60/2.16 the same | 3.22/0.89 the same | the same | the same |
| mid.brd (28, written by this app) | 5.50/0.98 → 5.43/0.99 | 1.76/0.41 → **2.18/0.43** (worst at 27.8") | the same | the same |
| testLB.brd (33, written by this app) | 22.23/3.88 → 21.42/3.92 | 5.00/0.85 the same | the same | rails-first; the same |

Read: the fit's own assumption ("between the three, RAILS blends one rail into the next") now holds better wherever a tail
differs from its centre — on the four AkuShaper files that is only the Egg (Hard Edge), which comes closer. The Round Tail,
Fryer, Scoop and testLB have tails of the centre's character, so nothing blends and nothing moves. `mid.brd` was written
by this app under the old default, so it carries the old 18"→32 1/2" blend and its sections between 24" and 39" now sit a
little further from ours (23.9" 1.51→1.74, 27.8" 1.76→2.18, 31.8" 1.74→1.70, 35.3" 1.41→1.24, 38.8" 0.96→0.91). No order,
no bottom name or figure changes on any file.

The app's own round trip (the overview-PDF test's board: Shortboard, Hard Edge, 1/4" Deep Single, 3/16" Panel Vee tail):
bottom `Panel Vee 3/16"` (0.91 mm) → **`Rolled Vee 3/16"`** (0.55 mm; gwr's known Panel/Rolled swap) and the rails fit
now finds the tail's Hard Edge (before: Hard Edge off, Family 4, 71/29; after: Hard Edge on, Family 3, 65/35; 2.49/0.42 →
2.42/0.34 mm). The moved-slider round trip "Panel Vee 3/16" from 30", deepest 8"": the vee's start came back 4.000" off
before (exactly the test's 4" limit) and 5.333" off after.

### 5. Which unit tests the change moves (scratch runs of the whole unit suite)

The planner applied the change in a scratch copy (`scratchpad/psx/tree2`, approach below; maxWorkers 6, no load timeouts):
13,458 tests, **300 fail, every one listed in Tasks 1-3**: rail-bands 6, volume 5, design-snapshot 2, guide-rails 6,
guide-pages 1, guide words/rails 1, phase14-preset-figures 4, phase16-surface pin 56, phase17 litres pin 170, phase17
channel litres 25, board-surface 1 (wireLines hash), brd-fit 21 (snapshots), brd-bottom 1, build-brd-overview-pdf 1. Still
green with no edit: the 40-board and 74-board pins (old rules by name), every report test, brd-rails' round trips H1-H10,
brd-fit-preview, bottom, finished-rail, every other suite. A first run with EVERY reader on the new default (old rules
included) failed 436, including all 74 pins of go-live 1's rule — that is why the old rules read D-30 by name.

Goldens: no `prototype-*` or `rails-v2` golden moves. `phase14-preset-figures.json` is regenerated by its own script
(litres only: Shortboard 29.61306 → 29.61163, Fish 34.64901 → 34.64488, Mid 49.40388 → 49.39777, Longboard on its recorded
blank 73.61420 → 73.56736; no thickness or rocker number moves). The pin JSONs (`phase16-*`, `phase17-*`) are never
regenerated (their generators refuse); their tests read the boards as D-30 read them. Measured: with D-30's resolved pair
stored on each of the 102 boards, the live rule reads the phase-17 pin **102/102 to the last digit**; RAIL_CHARACTER_FADE on
the d30 readers reads the 102-board pin 102/102.

### Scratch (outside the repo; `S` = `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad`)

Scripts in `S/psx/scripts/`, each taking a code root as its argument, run from the checkout root as
`npx --prefix <checkout> tsx --tsconfig <root>/tsconfig.json <script> <root>` (root = the checkout, or a scratch tree):
`litres.mts`, `cards.mts`, `stock.mts`, `walk.mts` (litres along the browser tests' slider walks), `rail-move.mts` +
`rail-compare.cjs`, `brd.mts` + `brd-compare.cjs` (reads `~/Downloads`; prints figures only), `boards102.mts`,
`sliders.mts`, `d30pin.mts`, `concave-rt.mts`, `levelvar.mts`, `guidelabel.mts`, `guidecap.mts`, `anchor12.mts`.
`S/psx/tree2/` is the planner's rough version of Task 1 (`S/psx/scripts/approachA.cjs`) plus the GUIDE push fallback
(Task 3) and a logging line in brd-bottom.test.ts — a reference for shape only; write the real code clean. `S/psx/tree/` is
the checkout as it stands (plus that logging line). `S/psx/a-suite.json` / `naive-suite.json` are the two suite reports.
Never copy a sample file or its text into the repo.

## My calls (for the founder)

1. **(see 0)** Saved boards that never moved the sliders follow the new default — the brief's call, unchanged — and a
   read-only `--tail-blend-report` is built so he sees every real board's move before the push. Drop it if not wanted.
2. **Ends At's default is the top of its own slider, not the exact centre.** On a board whose centre is not on a 1/2" step
   (a 73 7/8" board: centre 36 15/16") it is 36 1/2" — the slider's own top, so the thumb sits at its end and the label agrees.
   Every preset and every whole-inch length has its centre on the grid, so there it IS the centre. Worked out on the very
   grid the slider uses (`hardEdgeWindowOnGrid`, moved from `blank-reasons.ts` into `rail-bands.ts` so the two can never
   disagree), never from the shaper's chosen system (Rule 2: the default cannot depend on Metric).
3. **The old rule stays callable by name**, as Phase 14 D-25 set ("never a second argument on the live one"): 18" and
   L/6 + 18" live on under D-30 names, read only by go-live 1's and plan 16-15's named rules, the old reports and the pins.
4. **The GUIDE card's dashed "what if"**: at the new default the pair cannot move together (both sit at their ends), so the
   dashed push now moves Blends From alone 6" toward the nose — `dashed · 18" · 37"` on the Shortboard (Metric 45.5 cm), a
   longer hard edge. Before it was the pair moved 6" (`24" · 36 1/2"`). The founder's words page
   (`18-GUIDE-WORDS.md`) has this card's tag and caption on its line; only those two app figures change, never his words.
5. **Shortening a board**: a stored Ends At beyond the new centre now reads the centre (the slider's top) — before it jumped
   back to L/6 + 18" (30" on a 6'0"). Lengthen it again and the stored figure comes back (a stored value is never rewritten
   until the slider moves). A stored Blends From outside its window reads 12".
6. **The .brd round trip on a hard-edged board**: the app's own Shortboard with a 3/16" Panel Vee now opens as a Rolled Vee
   3/16" (closer overall) with the tail's Hard Edge found; a Panel Vee moved to 30" comes back with its start 5 1/3" off
   (4" before, the test's limit). That test keeps its old board (D-30's pair stored) so it still guards the bottom fit, and
   the new figure is reported. A .brd this app wrote BEFORE this change (mid.brd) carries the old blend and reads up to
   0.42 mm further off between 24" and 39".
7. **Kept as is**: the preview's line "Tail Rail Blends From and Ends At are left where a new board puts them." (still true);
   the Advanced menu's caption; the GUIDE card's is / does / how words (none quotes a default).

## How the old default stays reproducible (read before Task 1)

- The live readers `hardEdgeBlendsFrom(rails, length)` and `hardEdgeEndsAt(rails, length)` keep their names and signatures
  (every screen, the store, the 3D page and the exports call them) and read the NEW default. They never take a defaults
  argument (D-25).
- D-30's readers are separate exports with today's exact bodies: `d30HardEdgeBlendsFrom`, `d30HardEdgeEndsAt` (on
  `D30_HARD_EDGE_BLENDS_FROM_IN = 18`, `D30_HARD_EDGE_ENDS_AT_RULE_IN = 18`, `d30DefaultHardEdgeEndsAt(length)` = today's
  default-end function renamed, body unchanged). Share one private forgiving-read helper between the two pairs so the window
  logic cannot drift; the d30 pair must return today's numbers bit for bit.
- `withD30TailRailBlend(rails, length)` returns the rails with BOTH fields stored as D-30 resolved them. The live rule then
  reads exactly what the site read before this change (measured 102/102 bit for bit). Every pin of the LIVE rule written
  before this change, and the new report's "before", use it. Add a fixture helper beside `phase16Boards` in
  `lib/geometry/__fixtures__/phase16-boards.ts` that applies it to a board's fields (e.g. `asD30Read(fields)`).
- Rule of thumb for every test: a test whose subject IS the default or the live litres is re-pointed to the new figures,
  worked out by the code's own functions (never typed); a test whose subject is something else and that pins figures taken
  before this change (a hash, a snapshot, a JSON pin, a fit-precision bar) reads its boards with D-30's pair stored, and says
  so in one comment line.

<context>
@.planning/quick/261113-psx-a-new-board-s-tail-rail-blends-from-star/BRIEF.md
@CLAUDE.md
@AGENTS.md
@lib/geometry/rail-bands.ts
@lib/geometry/volume.ts
@lib/geometry/blank-reasons.ts
@.planning/quick/261113-kvo-a-brd-s-rail-shapes-are-read-from-its-cr/261113-kvo-SUMMARY.md
</context>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<objective>
Make the tail rail's blend default the founder's new one — Tail Rail Blends From at the 12" station and Tail Rail Ends At at
the top of its own slider (the board's centre) — everywhere a board says nothing, with go-live 1's and plan 16-15's rules
and every pin and report written before it still reproducing their figures by name; every word, GUIDE card, browser test and
baseline picture that states or draws the old default follows; a read-only saved-boards report shows the real moves; and
the founder gets pictures to look at.

Purpose: by default the tail's rail now blends evenly from the 12" station to the centre, the way the nose's does — the
founder's ruling after seeing .brd rails fitted (quick 261113-kvo).
Output: four commits on `close-bottom-17` (one per task), pictures in this task's `pictures/`, a SUMMARY (written, not
committed). Nothing pushed, no database change, no build, the dev server on 3117 left running.
</objective>

<tasks>

<task type="tracer">
  <name>Task 1: the new default, end to end through the maths — readers, sliders, litres and 3D rule, with D-30 kept by name</name>
  <files>lib/geometry/rail-bands.ts, lib/geometry/rail-bands.test.ts, lib/geometry/blank-reasons.ts, lib/geometry/blank-reasons.test.ts, lib/geometry/volume.ts, lib/geometry/volume.test.ts</files>
  <read_first>BRIEF.md; this plan's "How the old default stays reproducible"; lib/geometry/rail-bands.ts from `HARD_EDGE_BLENDS_FROM_RANGE_IN` to `hardEdgeEndsAtWindow` and the `RailBandSpec` docs; lib/geometry/blank-reasons.ts `hardEdgeRangeIn`, `hardEdgeBlendsFromSlider`, `hardEdgeEndsAtSlider`; lib/geometry/volume.ts `HARD_EDGE_FADE`, `RAIL_CHARACTER_FADE`, `SMOOTH_SURFACE_FADE`, `boardSectionEnds`, and the BLENDING RULE doc above `computeCrossSectionVolume`; `S/psx/scripts/approachA.cjs` (the rough shape)</read_first>
  <behavior>
    - A board that says nothing reads Blends From = `inchesToMm(HARD_EDGE_BLENDS_FROM_RANGE_IN.min)` and Ends At = the top of `hardEdgeWindowOnGrid(hardEdgeEndsAtWindow(blendsFrom, length))`, on 6'0" (36"), 5'8" (34"), 6'2" (37"), 7'2" (43"), 9'0" (54"), 73 1/4" and 73 7/8" (36 1/2"), the 30" test length (half the slider's minimum; 15") and 120" (60"). Expected values from the functions, never typed except the founder's own figures checked against them.
    - `hardEdgeBlendsFromSlider` / `hardEdgeEndsAtSlider` views of the default: Imperial value equals min (Blends From) and max (Ends At) exactly; Metric value equals the view's min / max (clamped) and the label is `formatDim` of the stored default.
    - The forgiving reads hold as today, against the new default: a stored 20"/26" pair kept; garbage, a start below 12" or past its window, an end past the centre or under start + 2" all read the default; a crossed pair keeps its start and reads the top of Ends At's window; every pair over the existing sweep of stored values and lengths is ordered and inside its windows.
    - The D-30 readers reproduce today's figures: the existing default-end tests (the founder's five lengths, L/3 − 18 inches short of the centre, the 29" start clamped to start + 2", the short board's clamp) move under `d30HardEdgeBlendsFrom` / `d30HardEdgeEndsAt` / `d30DefaultHardEdgeEndsAt` unchanged in figure.
    - `withD30TailRailBlend(rails, length)` stores exactly what the d30 readers resolve, and the live readers read that stored pair back exactly.
    - volume: go-live 1's rule (`HARD_EDGE_FADE.weight`) and plan 16-15's (`RAIL_CHARACTER_FADE.at`) on a board that says nothing still blend from 18" to D-30's end; the live rule (`boardSections`, `SMOOTH_SURFACE_FADE.at`) blends from 12" to the centre; the tail 12" station's tip weight under the live rule is exactly 1 on all four presets (`anchor12.mts` measured it).
  </behavior>
  <action>
    rail-bands.ts (PSX-R1, PSX-R2): add `hardEdgeWindowOnGrid(window)` — the inch range rounded inward onto the 1/2" grid, never inverted — moved verbatim from blank-reasons.ts's private `hardEdgeRangeIn` (same `HARD_EDGE_ENDS_AT_RANGE_IN.step`, same 1e-9 guards). Add `defaultTailRailBlendsFrom(length)` = the bottom of Blends From's own window (`blendsFromWindow(length).min`, i.e. `HARD_EDGE_BLENDS_FROM_RANGE_IN.min` — no new inch literal) and `defaultTailRailEndsAt(blendsFrom, length)` = `inchesToMm` of the top of `hardEdgeWindowOnGrid(endsAtWindow(blendsFrom, length))`. The live `hardEdgeBlendsFrom` / `hardEdgeEndsAt` keep their names and signatures and fall back to these (Ends At's default computed from the RESOLVED Blends From, then clamped into its window as today). Rename today's constants and default-end function to the D-30 names in this plan's "How the old default stays reproducible" (bodies unchanged), add `d30HardEdgeBlendsFrom` / `d30HardEdgeEndsAt` with today's reader bodies through one shared private helper, and `withD30TailRailBlend(rails, length)` (generic over the rails type, returns a copy with both fields stored). Rewrite the docs: `RailBandSpec.tailHardEdgeBlendsFrom` / `tailHardEdgeEndsAt` (absent now reads 12" and the top of Ends At's slider — the founder, 2026-11-13, quick 261113-psx, his words quoted; D-30's 18" and L/6 + 18" kept by name for the old rules), the readers' docs, and the D-30 block (say it is the old rule, read only by the named old rules, the old reports and the pins).
    blank-reasons.ts: `hardEdgeBlendsFromSlider` / `hardEdgeEndsAtSlider` call `hardEdgeWindowOnGrid` from rail-bands.ts; delete the private copy. No behaviour change (its existing tests must pass unedited except for any default they pin); add the behaviour bullet's slider-view test.
    volume.ts (PSX-R2): factor the body of `RAIL_CHARACTER_FADE.at` into one private `railCharacterFadeAt(blendsFrom reader, endsAt reader)`; `RAIL_CHARACTER_FADE = { at: railCharacterFadeAt(d30 readers) }` (still no `fit`), `SMOOTH_SURFACE_FADE = { at: railCharacterFadeAt(live readers), fit: (unchanged) }`, and `HARD_EDGE_FADE.weight` reads the d30 readers. `boardSectionEnds` stays on `SMOOTH_SURFACE_FADE`. Update the docs: HARD_EDGE_FADE's and RAIL_CHARACTER_FADE's (they read D-30's default by name), SMOOTH_SURFACE_FADE's (its own `at` since this task), and the BLENDING RULE paragraph's defaults (`hardEdgeBlendsFrom`, the 12" station unless the board says otherwise; `hardEdgeEndsAt`, the board's centre on a 6'0" — 36" — unless it says otherwise).
    rail-bands.test.ts: re-point the six failing tests per the behaviour bullets — move today's D-30 figure tests under the d30 names unchanged; write the new-default tests from the functions. volume.test.ts: re-point its five failures — "blends from 18" to 30"" becomes the new pair (both inside the tail half; Blends From equals the tail 12" anchor rather than past it); "reads exactly as a board that says 18" and 30"" becomes "…that says 12" and the top of Ends At's slider"; "carrying only the old single Ends At reads its Blends From as 18"" becomes 12"; "two sharp ends stay sharp" and any other rule a test builds from `RAIL_CHARACTER_FADE.at` to stand for the LIVE rule with one fit set back (`held`, the D-34 `old` rule, the tuck tests' `corner`) take `SMOOTH_SURFACE_FADE.at` (tests that mean plan 16-15's rule keep `RAIL_CHARACTER_FADE`). "On every board of the forty, at the defaults, every blending station is the level-variant area of its two ends": the new default reaches stations the old never did — a pin tail's 12"-18" stations, narrower than their rail — where the live blend uses each end's fitted half (`endHalf` in `boardSectionsWith`: `fittedFinishedRail` when the rail does not fit its room). Build the expected halves the same way (each end's `drawn` half when it has one, else `sampledFinishedRail`, and the matching exact areas); if the live blend then still disagrees, stop and report it — it would be a real 3D/litres fault on narrow tails (`levelvar.mts` shows the two stations: Longboard pin tail at 12.96" and 15.12").
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/rail-bands.test.ts lib/geometry/blank-reasons.test.ts lib/geometry/volume.test.ts lib/geometry/phase16-litres-pin.test.ts lib/geometry/phase16-live-litres-pin.test.ts lib/models/hard-edge-report.test.ts lib/models/rail-character-report.test.ts lib/models/surface-report.test.ts</automated>
    <automated>npx tsc --noEmit</automated>
    <automated>npx --prefix /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 tsx --tsconfig ./tsconfig.json /private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/psx/scripts/cards.mts /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17  # prints 29.6 / 34.6 / 49.4 / 72.3 L</automated>
    <automated>npx --prefix /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 tsx --tsconfig ./tsconfig.json /private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/psx/scripts/sliders.mts /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17  # every line "at its start" / "at its end"</automated>
  </verify>
  <done>The live readers read 12" and the top of Ends At's slider on every length; the sliders sit at their ends; the four cards read 29.6, 34.6, 49.4, 72.3 L; the d30 readers and the 40-/74-board pins and the three report tests are green unedited; tsc clean. Commit: "A new board's tail rail now blends from the 12" station all the way to the centre by default, and the old 18" start is kept by name for the records that need it".</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: every pin and record taken before the change keeps reading its own figures — and the one that is meant to move is regenerated</name>
  <files>lib/geometry/__fixtures__/phase16-boards.ts, lib/geometry/__fixtures__/phase14-preset-figures.json, lib/geometry/phase16-surface-litres-pin.test.ts, lib/geometry/phase17-litres-pin.test.ts, lib/geometry/phase17-channel-litres.test.ts, lib/geometry/board-surface.test.ts, lib/geometry/brd-fit.test.ts, lib/geometry/brd-bottom.test.ts, components/template/build-brd-overview-pdf.test.ts, lib/models/design-snapshot.test.ts</files>
  <read_first>this plan's "How the old default stays reproducible" and section 5; each test file's own header (every one says what it pins and whether it may be re-recorded — obey it); scripts/extract-phase14-preset-figures.ts header</read_first>
  <behavior>
    - The 102-board surface pin: "with only the tips' fit on, it reads the pin / reads above the pin" holds again (its boards read as D-30 read them); the third loop (live vs tips' fit only, within 0.1 L and never equal) stays on the boards as they are (it compares like with like and passes today).
    - The phase-17 litres pin (170) and the channel pin (25): their boards read as D-30 read them; every relation in those files holds as before.
    - board-surface "wireLines' output is what it was before, bit for bit": the hash is NEVER re-recorded; the 74 surfaces it hashes are built from boards read as D-30 read them (a local list beside `BUILT_LIVE`; other tests keep `BUILT_LIVE`).
    - brd-fit's two snapshot describes, "a file with no wing fits exactly as before" (12) and "a sharp-winged file fits exactly as before (quick 261113-m5w)" (9): the snapshots are NEVER re-recorded; the round trips those snapshot tests use write boards read as D-30 read them (every other brd-fit test may keep the boards as they are).
    - brd-bottom "the Shortboard with sliders moved" (and the other round trips in that describe): the SHORT / MID builders write boards read as D-30 read them, so the bottom fit's precision is tested on the same files as before; log nothing in the committed test. Record the new-default figure (the vee's start 5 1/3" off) in the SUMMARY.
    - build-brd-overview-pdf "prints … the fitted names": assert the tail cut name the look itself fitted (`look.bottom.bottom.tail.name`) rather than the literal "Panel Vee" (the board now reads Rolled Vee 3/16", measured), keeping every other word check.
    - design-snapshot rule 13 (2): a board saved without either setting reads the new default (worked out by the live readers); a board saved with only the first, single Ends At keeps it and reads Blends From 12".
    - phase14-preset-figures: regenerated, never edited: `git diff` of the JSON shows only the four `litres` values changed (thicknesses and rocker identical).
  </behavior>
  <action>
    Per D-25's precedent and the brief's item 4 (PSX-R2, PSX-R4): add the fixture helper (e.g. `asD30Read(fields)`, on `withD30TailRailBlend(fields.rails, fields.outline.length)`) to lib/geometry/__fixtures__/phase16-boards.ts with a doc line naming quick 261113-psx, and refresh that file's `…|infade` comment (the 22" wing sits inside both D-30's fade and the new 12"-to-centre one). Apply it in exactly the places the behaviour bullets name, each with a one-line comment: "pinned before quick 261113-psx moved the tail rail's default blend; read as D-30 read it". Re-point design-snapshot.test.ts's two rule-13 tests to the live readers' new figures. Change the overview PDF test's "Panel Vee" expectation to the look's own fitted tail name. Regenerate the preset record with `npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase14-preset-figures.ts --step tips` from the checkout root and check the diff is litres-only; edit phase14-preset-figures.test.ts only if it pins a figure by hand (it should not). Do not touch any pin JSON under lib/geometry/__fixtures__/ other than phase14-preset-figures.json, and do not run any `extract-phase16-*` / `extract-phase17-*` script (they refuse, by design).
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/phase16-surface-litres-pin.test.ts lib/geometry/phase17-litres-pin.test.ts lib/geometry/phase17-channel-litres.test.ts lib/geometry/board-surface.test.ts lib/geometry/brd-fit.test.ts lib/geometry/brd-bottom.test.ts components/template/build-brd-overview-pdf.test.ts lib/models/design-snapshot.test.ts lib/geometry/phase14-preset-figures.test.ts</automated>
    <automated>git -C /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 diff --stat -- lib/geometry/__fixtures__/  # only phase14-preset-figures.json and phase16-boards.ts</automated>
    <automated>npx vitest run --maxWorkers=6  # the whole unit suite; read its last line in its own call; a test over 5 s under load is re-run alone before it counts</automated>
  </verify>
  <done>The whole unit suite is green except the guide's three files (Task 3); no snapshot, hash or pin JSON was re-recorded; the preset record's diff is litres only. Commit: "The records taken before the new tail-rail default keep reading their own figures, and the preset cards' recorded litres are re-measured".</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: what a shaper reads follows — the RAILS GUIDE card, the words, the old reports on D-30, and a saved-boards report of the moves</name>
  <files>lib/geometry/guide-rails.ts, lib/geometry/guide-rails.test.ts, .planning/phases/18-a-guide-on-every-page/18-GUIDE-WORDS.md, components/design/design-store.tsx, components/rails/rail-controls.tsx, lib/models/design-snapshot.ts, lib/models/hard-edge-report.ts, lib/models/rail-character-report.ts, lib/models/rail-character-report.test.ts, lib/models/surface-report.ts, lib/models/surface-report.test.ts, lib/models/tail-blend-report.ts, lib/models/tail-blend-report.test.ts, scripts/check-saved-boards.ts</files>
  <read_first>lib/geometry/guide-rails.ts `blendsPush`, `blendsFigure` (its `endsLabel` hold-inside logic) and the blends card in `buildRailsGuide`; lib/geometry/guide-rails.test.ts's blends tests; components/guide/words/rails.test.ts (holds the built tag and caption to the words page); lib/models/hard-edge-report.ts + .test.ts (the shape to copy); scripts/check-saved-boards.ts header and its `--hard-edge-report` wiring; `S/psx/scripts/guidelabel.mts`, `guidecap.mts`</read_first>
  <behavior>
    - GUIDE (Shortboard, Imperial): tag `12" · 37"`, caption `dashed · 18" · 37"` (Metric `30.5 cm · 94.0 cm`, `dashed · 45.5 cm · 94.0 cm`); every card but Import still has a pushed variant; the blends card draws two pushed marks; every label inside its box at every fit, including the Longboard in Metric at the narrowest card (with the new default, Blends From's `30.5 cm` runs 0.9 past the window's tail edge — 230.9-292.9 against an edge at 292 — measured by `guidelabel.mts`).
    - A stored mid pair (e.g. 20"/26") still pushes as a pair, 6" toward the centre, as today.
    - rail-character report: its two settings are printed as D-30 read them (its figures are D-30's two rules); surface report: "after" is the live rule on the board as D-30 read it (go-live 2's figures, reproduced) — both tests re-pointed with the app's own functions.
    - tail-blend report: for each saved board whose litres move, `<id>: blends from <before> → <after> · ends at <before> → <after> — <litres before> → <litres after> L (<move>)` (settings in Imperial through `formatDim`, `(default)` where the board stores none of its own; litres to two places, the move to four, largest move first), a header `tail-blend report: N saved boards; k open[, d did not open]; m whose litres move` and a closing `largest move: <id>, <move> L` (or `largest move: none`); "before" = `summarizeDesign` on the board with `withD30TailRailBlend`, "after" = `summarizeDesign` on the board as stored. A board that does not open is counted, never printed; no name, account, snapshot or connection string is ever printed. Unit-tested on the phase16 stand-ins (expected lines built from the app's own functions; a stored pair inside its window moves nothing and is not listed).
  </behavior>
  <action>
    GUIDE (PSX-R3, my call 4): in `blendsPush`, after the two pair tries, try Blends From alone toward the centre by the push (inside `hardEdgeBlendsFromWindow` for the current Ends At), then Ends At alone toward the tail (inside `hardEdgeEndsAtWindow` for the current Blends From); else null; update its doc. In `blendsFigure`, hold Blends From's figure inside the window's tail edge the way Ends At's is held inside its nose edge (measured with `guideTextBox` at `GUIDE_MIN_FIT`, sliding back under its own mark by just what it needs). Re-point guide-rails.test.ts's blends tests to the new figures through the readers and `guidePush` (the "pushes by the page's push amounts" case: on the default Shortboard Blends From moves by the push and Ends At stays; add the stored-pair case). In `.planning/phases/18-a-guide-on-every-page/18-GUIDE-WORDS.md`, on the `**Tail Rail Blends From · Tail Rail Ends At**` line only, change the two app figures to the new tag and caption exactly as the builder prints them; no other character of the page.
    Words: design-store.tsx (the two setters' docs: a board without it reads 12" / the top of Ends At's slider; `resetRailAdvanced`'s doc and its inline comment: back to the 12" station and the board's centre, still by deleting both keys), rail-controls.tsx (the stored-pair prop doc and the Reset comment), design-snapshot.ts rule 13 (absent reads the default pair — 12" and the top of Ends At's slider since quick 261113-psx; D-30's 18" and L/6 + 18" before), hard-edge-report.ts's header (its "after" is the live rule, which since this task blends from 12" to the centre). No visible text on any screen changes in this task except the GUIDE card's figures.
    Reports (PSX-R5): rail-character-report.ts prints its settings with the d30 readers; surface-report.ts's "after" reads the board through `withD30TailRailBlend`; re-point both tests. New lib/models/tail-blend-report.ts (pure; the shape of hard-edge-report.ts) + test; wire `--tail-blend-report` in scripts/check-saved-boards.ts beside `--hard-edge-report`, with its header paragraph and the production command line in the form the founder's terminal accepts (the `--surface-report` line's form), never changing the exit code. Do not run it against any database in this task.
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/guide-rails.test.ts lib/geometry/guide-pages.test.ts components/guide/words/rails.test.ts lib/models/rail-character-report.test.ts lib/models/surface-report.test.ts lib/models/tail-blend-report.test.ts lib/models/hard-edge-report.test.ts</automated>
    <automated>npx tsc --noEmit && npm run lint  # one known old warning</automated>
    <automated>git -C /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 diff -U0 -- .planning/phases/18-a-guide-on-every-page/18-GUIDE-WORDS.md  # one line changed</automated>
  </verify>
  <done>The guide's three test files and the four report tests are green; the words page differs on one line; tsc and lint clean. Commit: "The RAILS guide card shows the new tail-rail blend and what a longer hard edge looks like, the help notes say the new default, and a saved-boards report lists every board the new default moves".</done>
</task>

<task type="auto">
  <name>Task 4: the browser tests and pictures — RAILS, 3D, VOLUME and the .brd preview on the new default, and the founder's look</name>
  <files>e2e/rails-advanced.spec.ts, e2e/three-d-hard-edge.spec.ts, e2e/desktop-baseline.spec.ts, e2e/desktop-baseline.spec.ts-snapshots/ (only if a picture changed), .planning/quick/261113-psx-a-new-board-s-tail-rail-blends-from-star/pictures/</files>
  <read_first>BRIEF.md house rules (dev server on 3117: never stop it, never start another `next dev`, never a build, never the whole browser suite); e2e/rails-advanced.spec.ts's "Tail Rail Blends From and Ends At" describe; e2e/three-d-hard-edge.spec.ts; e2e/three-d-screen.spec.ts test 9; e2e/desktop-baseline.spec.ts's RE-RECORDED notes; `S/kvo/shoot/shots.config.ts` + `shots.spec.ts` (the picture-script precedent); `S/psx/scripts/walk.mts` (litres along each walk)</read_first>
  <action>
    Browser tests (PSX-R4), each figure from the app's own readers and formatters (STOCK_END / the Shortboard's own end = `formatDim(hardEdgeEndsAt({}, length), "imperial")`, never a default function by name): rails-advanced — test 1 reads `12"` and `36"` at the defaults; Home on Ends At now does nothing to Blends From, so walk Blends From End (→ 30", VOLUME 30.29 → 30.32) then Ends At Home (→ 32", 30.31) and reload keeping 30"/32"; test 2 Ends At Home lands on 14" with Blends From 12", and the tucked tail's Ends At End reaches the centre (30.25 → 30.24); test 3 the coupling from 12"/36"; test 4 move both off their ends (e.g. Blends From one step up, Ends At one step down), Reset → 12"/36" with both keys gone, Undo back; test 5 Metric reads `30.5 cm` / `91.4 cm` and the first step lands where `hardEdgeBlendsFromSlider(…, "metric")` puts it (32.0 cm; a whole millimetre stored); test 7 locked rows read the defaults; test 8 the crossed 26"/20" pair reads 26" and the centre; test 9 one move that changes the litres (Ends At Home, 30.29 → 30.27); test 10 the Shortboard reads its own centre (37") and Home then Reset returns to it. three-d-hard-edge — same defaults; "End" on Ends At is now a no-op, so move it Home (and back) where the tests need a change; keep every "litres move" assertion true by the `walk.mts` figures. Run each spec alone: `PW_PORT=3117 npx playwright test e2e/rails-advanced.spec.ts`, then e2e/three-d-hard-edge.spec.ts, `e2e/three-d-screen.spec.ts -g "Hard Edge Ends At"`, e2e/guide-rails.spec.ts, e2e/brd-fit-preview.spec.ts, e2e/phone-screen-tiles.spec.ts, and `e2e/desktop-baseline.spec.ts --project=desktop`. A changed baseline: read its diff picture first (only the 3D board's tail rail should differ; VOLUME should still read 30.29 L), then `--update-snapshots`, re-run, and add a RE-RECORDED note to desktop-baseline.spec.ts in the file's own style (date, quick 261113-psx, what moved, pixel count, SHA-256 first 8 old → new). Never re-record blind. `e2e/board-file.spec.ts` f1 is a known failure, not ours.
    Pictures (PSX-R6) with a scratch Playwright script outside the repo (the kvo `shoot` precedent, `reuseExistingServer`, port 3117), into this task's `pictures/`: RAILS → TAIL RAIL → Advanced open on a new Shortboard and a new Longboard at the new defaults, on a computer (desktop project) and an upright iPhone 14; the 3D board's tail half from the same camera before and after on the Longboard — as the preset (moves ≤ 0.48 mm, say so) and with Hard Edge ticked (up to 6.5 mm at 18") — where "before" is the same kept board with Blends From 18" and Ends At 36" stored (bit for bit the old default's drawing; no old code needed); and the RAILS GUIDE card for Tail Rail Blends From · Ends At on the Shortboard and the Longboard. Look at every picture before saying it shows what it should. Put a one-line litres before/after table (section 2's figures) in the SUMMARY.
  </action>
  <verify>
    <automated>PW_PORT=3117 npx playwright test e2e/rails-advanced.spec.ts</automated>
    <automated>PW_PORT=3117 npx playwright test e2e/three-d-hard-edge.spec.ts</automated>
    <automated>PW_PORT=3117 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop</automated>
    <automated>PW_PORT=3117 npx playwright test e2e/brd-fit-preview.spec.ts</automated>
    <automated>ls /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/.planning/quick/261113-psx-a-new-board-s-tail-rail-blends-from-star/pictures/</automated>
  </verify>
  <done>Each spec green on its own (board-file f1 excepted); any re-recorded baseline has its diff read and a RE-RECORDED note; the pictures exist and were looked at. Commit: "Browser tests open the tail rail's new default on a computer and both phones, and pictures of RAILS, the 3D board and the guide card for a look".</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| saved board → readers | a stored or crafted Blends From / Ends At (a saved board, a board file, a kept board in the browser) |
| production database → report | the new report reads every saved board |
| ~/Downloads sample files → scratch | the founder's AkuShaper files, never in the repo |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-psx-01 | Tampering | `hardEdgeBlendsFrom` / `hardEdgeEndsAt` | medium | mitigate | the forgiving reads stay (a value outside its window, garbage or a crossed pair reads a valid pair); Task 1's sweep and garbage tests re-pointed, not removed; design-snapshot rule 13 unchanged |
| T-psx-02 | Information disclosure | `tail-blend-report.ts`, check-saved-boards.ts | medium | mitigate | prints board ids, two settings and litres only; never a name, account, snapshot or connection string; a board that does not open is counted, never printed; read-only, one select; the founder runs it |
| T-psx-03 | Information disclosure | scratch scripts reading ~/Downloads | low | mitigate | figures only in the plan, SUMMARY and pictures; no sample file or its text committed (`git status` before each commit) |
| T-psx-04 | Repudiation | pins and snapshots | medium | mitigate | no hash, snapshot or pin JSON re-recorded; old figures reproduced by name; only phase14-preset-figures.json regenerated, by its own script, litres-only diff |
</threat_model>

<verification>
- `npx vitest run --maxWorkers=6` green (Task 2 onward), `npx tsc --noEmit` and `npm run lint` clean (one known warning).
- The specs in Task 4 green one at a time on 3117; baselines either unchanged or re-recorded after reading the diff.
- `git log --oneline -4` shows the four task commits; `git status` shows only the untracked PLAN, BRIEF, SUMMARY (and nothing from ~/Downloads).
</verification>

<success_criteria>
- A new Shortboard's RAILS → TAIL RAIL → Advanced reads `Tail Rail Blends From — 12"` and `Tail Rail Ends At — 37"`, both sliders at their ends; the 3D page's two rows read the same; Reset returns there.
- The four cards read 29.6, 34.6, 49.4, 72.3 L; the stock 6'0" VOLUME 30.29 L.
- The 40-, 74- and 102-board pins, the phase-17 pins, the wingless .brd snapshot and the wireLines hash pass without being re-recorded.
- The SUMMARY carries sections 0-4's tables re-measured on the shipped code, the brd-bottom new-default figure, the report's production command, and the calls above for the founder.
</success_criteria>

<output>
Create `.planning/quick/261113-psx-a-new-board-s-tail-rail-blends-from-star/261113-psx-SUMMARY.md` when done (do not commit it).
</output>
