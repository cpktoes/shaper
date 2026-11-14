---
phase: quick-261113-si7
plan: 01
subsystem: geometry, template, rocker, summary
tags: [board-size, length-4-to-12, width-31-from-8ft, hold-on-read, rocker-cards, order-form-window]
requires: [quick-261113-qyz]
provides:
  - "Boards from 4'0\" to 12'0\" (48\"-144\"), up to 31\" wide from 8'0\" (96\" included), 25\" under 8'0\", 16\" at the least"
  - "lib/geometry/board-size.ts: widePointWidthRangeIn, widePointOffsetRangeIn, holdOutlineToLength (pure, tested)"
affects: [TEMPLATE, ROCKER, VOLUME, SUMMARY order form, board files, .brd, 3D, saved boards]
key-files:
  created:
    - lib/geometry/board-size.ts
    - lib/geometry/board.test.ts
    - components/viewer/outline-fixed-frame.test.ts
    - e2e/board-size-range.spec.ts
    - e2e/board-size-walk.spec.ts
  modified:
    - lib/geometry/board.ts, outline.ts, outline-drag.ts, units.ts, guide-outline.ts, brd-fit.ts, template.ts (comment)
    - lib/models/design-snapshot.ts
    - components/design/design-store.tsx, components/outline/outline-controls.tsx, components/outline/outline-viewer.tsx
    - components/volume/volume-controls.tsx, components/rocker/rocker-view-frame.ts, components/viewer/callout-primitives.tsx
    - components/summary/dimension-fit.ts, scripts/extract-phase11-foil-golden.ts
    - e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png (re-recorded, see below)
decisions:
  - "8'0\" is a wide board; a wide board shortened under 8'0\" is held on read in the store (draws, labels and saves 25\"), its own width comes back if lengthened before the Width is touched"
  - "The Offset gets its own window on boards under 4'8\" (8\" on a 4'0\", 11\" on a 4'6\")"
  - "ROCKER cards keep today's size and shrink only where the drawn 12\" spacing is shorter than the 10'0\" they were made for"
  - "The order form's template window keeps its size; a board wider for its length than 5'0\" x 25\" draws a little shorter in it"
  - "The saved-board refusal floor stays 30\""
metrics:
  tasks: 4
  commits: 4
  files-changed: 40 (plus 19 files in pictures/)
status: complete
actuals:
  tokens: 32000
  tasks: 4
  commits: 4
---

# Quick 261113-si7 — boards from 4'0" to 12'0", up to 31" wide from 8'0" up — Summary

**One-liner:** TEMPLATE, board files, saved boards, 3D and the printouts now take boards from 4'0" to 12'0" long and up to 31" wide from
8'0" up (25" under 8'0"), every board inside the old sizes computes and draws bit for bit as before, and the two drawings the new sizes
broke (ROCKER's station cards on a long board, the order form's template window on a short wide one) are fixed.

## READ THIS FIRST — what must land before this goes live

**si7-B is not built.** The BOTTOM CONTOURS tables' own sheet on a board over about 11'6": DATA's two tables carry a row every 6", so a
12'0" board has 25 rows and, with any cut that has layout marks, the two tables stacked on their own sheet overflow it by 26 dots (11'6"
still fits with 7 to spare). A number a shaper cuts foam to would be cut off the page. Fix in its own quick task (two tables, one sheet
each; `bottom-contours-sheet.tsx`, the order form's page count and `e2e/summary-planing.spec.ts`'s fit sweep follow). Until then the one
test that points short of 12'0" on purpose is `components/summary/bottom-sheet-fit.test.ts` ("the longest board before quick si7",
10'0"), with `it.todo("the longest board the app allows (12'0") keeps every row — quick si7-B")` beside it. **Do not go live without it.**

## Commits (nothing pushed)

| # | Commit | What it did for the board or the screen |
|---|---|---|
| 1 | `0131112e` | TEMPLATE makes 4'0"-12'0" boards, 31" wide from 8'0"; the hold on read; the Offset window; feet boxes 4'-12'; the pure size rules + tests; browser spec for the new ends (desktop + iPhone) |
| 2 | `13f9e7e0` | `.brd` fit, the GUIDE cards, saved boards, VOLUME's feet box, 3D's refusal words follow; tests that pinned the old ends re-pointed on purpose |
| 3 | `28887640` | ROCKER's cards shrink with the spacing on a board over 10'0" overall; the order form's template window draws a 4'0" x 25" whole |
| 4 | `7c0cba8b` | the walk through every screen at both ends, the re-recorded TEMPLATE reference picture, the founder's pictures |

## Parity with the plan's tables

- **The pin (before/after): 260 entries, identical, byte for byte** (the four presets, 160 boards 5'0"-10'0" x 16"-25" x five tails with
  litres, fins and template pages, and 96 ROCKER frames whose drawing spans 10'0" or less). The "before" taken at this HEAD
  (d234008e, after the fins task and the other agent's earlier commits) is byte-identical to the planner's own `pin-base.json`, so the
  tree's moves since the plan was measured changed none of those figures. "After" taken from a scratch copy of the finished code.
- Planner's measured figures reproduced: Full Sized Template for a 12'0" x 31" is **45 pages on Letter (15 x 3), 42 on A4**; Paper Saver
  20 / 21 strips; 4'0": 10 pages, 7 strips; 8'0" x 31": 30 pages; blanks that fit a 12'0" x 31": **2, both US Blanks (12'1" EPS, 12'6" EPS)**,
  10'6" x 31": 4, 8'0" x 31": 10, 4'0" x 25": 21; ROCKER's 12" spacing at 12'0": **68.3** (no blank), **65.0** (12'6" EPS blank), the old
  cards 74 wide overlapped by **5.7 / 9.0** units, now 60.3 / 57.0 wide (82% / 77%) with a clear 8.0; the 4'0" x 25" drag points stay over
  the 44-dot touch minimum.
- The first whole-suite run (after Task 1, before Tasks 2-3) failed 21 tests: the 19 the plan lists (ROCKER frame 5, measure-display 5,
  rail-bands 3, units, drag-spacing, design-snapshot, rack-models, board-surface, bottom-sheet-fit) plus 2 that only time out under load
  (`build-brd-overview-pdf`, `board-surface-render`) and pass alone. All 19 were fixed by Tasks 2-3 exactly as the plan assigns them.

## What was pinned, and whether it held

Held: the 260-entry pin; `holdOutlineToLength` hands back **the same object** for every preset and every board 5'0"-12'0" x 16"-25"
(and 8'0"-12'0" x 31") — a unit test asserts identity, not equality, because the store's memos and every baseline depend on it; the ROCKER
frames for every drawing spanning 10'0" or less (`cardScale` exactly 1, `cardWidth` exactly 74, the pin at its ceiling exactly the ceiling,
with and without a blank); the order form's template window (`fixedFrameHalfWidth` is the very number it was) and the scale of every
board 5'0"-12'0" in it (bit for bit). No golden fixture was regenerated (the foil-golden script keeps its own 5'0"-10'0" sweep so a re-run
reproduces the committed fixture; it was not run).

## Every test or picture re-pointed or re-recorded, and why

**Re-pointed on purpose (they pinned the old ends):**
- `units.test.ts` "BOARD_LENGTH_RANGE_IN ... lands on 1530-3040" -> 48-144in lands on 1220-3650 (done in Task 1's commit so that commit's touched suites are green).
- `measure-display.test.ts` (5): the Metric floor 1530 -> 1220 mm, `typedFieldBounds` Imperial {60,120} -> {48,144}, Metric {153,304} -> {122,365},
  the CR-01 regression's 15300 -> 12200 mm.
- `board-surface.test.ts`: refuses 47 7/8" and 144 1/8", naming 48"-144"; and now also builds a 4'0" and a 12'0" board.
- `drag-spacing.test.ts`: the tightest board is 4'0" x 25" (52.6 / 54.7 px apart, still over the 44 px two 22 px circles need).
- `bottom-sheet-fit.test.ts`: pinned at 10'0" + the `it.todo` for si7-B.
- `rail-bands.test.ts` (3): the short board is a literal 30" ("the shortest a saved board or file can carry"), not half of 4'0" (24").
- `rack-models.test.ts`: "just outside the length range" 50" -> 46".
- `rocker-view-frame.test.ts` (**three beyond "unchanged"**): the four the plan named pass unchanged; but `maxCardPinScale('vertical')`'s expected value
  was written from `BOARD_LENGTH_RANGE_IN.max` — re-pointed to the new named `ROCKER_CARD_REFERENCE_LENGTH_IN` (10'0"); the "title clear of the Nose @ 12"
  card" magnitude 100 -> 95 (measured **95.8** units at 4'0", the shortest board; 100+ when 5'0" was); the degenerate-length fallback test passes
  unchanged because I kept that fallback at the 10'0" reference (see deviations).
- Not in the plan's list, same reason: `dimension-fit.test.ts` now also sweeps widths to 31" and a 12'0" x 31" extreme (`30 15/16"`, `78.7 cm`,
  `365.8 cm` all keep their box; the two comments in `dimension-fit.ts` updated), `three-d-screen.spec.ts` and `summary-planing.spec.ts` comments.
- `e2e/rocker-cut.spec.ts` "the fixture board": sets 10'0" explicitly (feet box 10, inches 0) instead of pushing Length to End (now 12'0").

**Re-recorded:** exactly one picture, `e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png`. I read the diff first (a
pixel diff of the old picture against a fresh one): every pixel over the comparison's threshold is the Board Length slider's dot
(x 101-128, y 302-313, 152 pixels); the rest is faint rendering dust. The dot **moved right, not left as the plan guessed**: the stock 6'0"
board sits a quarter of the way along a 4'0"-12'0" track (it was a fifth along 5'0"-10'0"). The old picture still passed under the
config's 100-pixel allowance, so I re-recorded with `--update-snapshots=all -g TEMPLATE` for the picture to be true, then ran all six baselines green.

## Browser specs run (`PW_PORT=3117`, one file at a time, the founder's server untouched)

- `board-size-range.spec.ts` (new): desktop + iPhone, 6/6 green. Length End 12'0" / Home 4'0"; Width End 31" at 12'0" and at 8'0"; 7'11" reads 25" with
  the thumb at its end; back to 8'0" reads 31"; 4'0" Offset ends +8" / -8" (12" at 6'0"); Metric Length End 365.0 cm / Home 122.0 cm.
- `board-size-walk.spec.ts` (new): desktop 2/2 (all eight screens, both boards), iPhone 2/2 (TEMPLATE, ROCKER, FINS). Checks no console error,
  each drawing inside its panel, every word inside its drawing and not straddling the window edge, no sideways scroll; it first waits for the
  board's own length and width to show (an early version could have looked at the stock board on the phone).
- Desktop: `rocker-cut` fixture board, `summary-blank` + `summary-planing` (27/27), `desktop-baseline` (6/6 after the re-record),
  `three-d-screen` "can't-build".
- Desktop + iPhone: `board-length-picker`, `template-toolbar`, `guide-template`, `outline-ghost`, `rocker-panel`, `rocker-top-view`,
  `volume-fins-panels`, `summary-preview`, `summary-print-size` — all green (the iPhone-only/desktop-only skips are the specs' own).
- Not run: the whole browser suite (rule), `e2e/board-file.spec.ts` (test f1 fails on untouched code, known).

## Gates

- `npx tsc --noEmit`: clean. `npm run lint`: 0 errors, the one old warning (`import-designs-action.test.ts`).
- **`npm test`, the whole suite, exact output:** `Test Files  7 failed | 225 passed (232)` / `Tests  12 failed | 13664 passed | 2 skipped | 1 todo (13679)`,
  exit 1, 571 s. **All 12 are load, not code:** 10 are "Test timed out in 5000ms" (brd, blank-fit x3, finished-rail x3, round-tip, design-snapshot,
  surface-report) and 2 are timing assertions (`brd-fit`: 1155 ms against 1000 and 2349 against 1500). The machine was busy (two agents and the
  founder's server). Re-run of those seven files together: 720 passed, 1 timeout (`blank-fit` R7 deck skin), which then **passes alone (86/86)**.
  So 13,676 pass, 2 skipped, 1 todo (si7-B), with the known timing-flake class run alone. `round-tip` "bit-identical on every blank" (known) timed out in the
  full run and passed in the re-run.

## Deviations from the plan

1. **[Rule 3 - blocking] The size rules live in a new file, `lib/geometry/board-size.ts`**, not split across `board.ts` and `outline.ts`. The plan's own
   escape hatch ("only if that creates no import cycle") bit twice: `outline.ts` importing `board.ts` would make board -> rocker -> outline -> board a loop, and
   `outline-drag.ts` is imported by `outline.ts`'s side. The file imports only units and types; `board.ts` re-exports every name the plan lists there
   (`widePointWidthRangeIn`, `widePointOffsetRangeIn`, `holdOutlineToLength`, the constants), and `outline.ts` now takes its 16" end margin from the same
   file, so the Offset window and the drawing cannot disagree. `OUTLINE_SLIDER_LIMITS` reads the shared 12" / 1/4" constants.
2. **[Rule 1 - bug found] The order form's ROCKER box would have run off its drawing at 12'0".** The plan derives ROCKER's `FIXED_SCALE` from a named 10'0"
   reference so the cards keep their size; but the order form's path (`fitToBoard: false`) drew every board with no blank at that shared scale, so a 12'0"
   board (984 units) would overflow the 820-unit area. `resolveScale` now takes the smaller of the shared scale and the fit-to-area scale on that path
   too (the same rule a blank already had); for every board of 10'0" or less it is the shared scale exactly (a test asserts `toBe`). The degenerate-length
   fallback stays at the 10'0" reference (so a corrupt length still draws as it always did) — `resolveEffectiveLengthIn`.
3. **The Offset hold only acts on boards under 4'8".** The plan says "held into widePointOffsetRangeIn"; I hold only when that window is narrower than
   12", so a hand-made file with an Offset past 12" on a 6'0" board keeps drawing exactly as it does today ("a saved board inside the old ranges must
   compute exactly as before"). Nothing the UI can make is affected.
4. **Added `wholeFeetWithin(range)` to `units.ts` (+ test)** for the feet boxes on TEMPLATE and VOLUME (one derivation, no 4-12 literal).
5. The plan says "seven screens"; BOTTOM sits third, so the walk visits **eight**.
6. Task 1's commit leaves the whole suite red in files it does not touch (the list above), as the plan assigns them to Tasks 2-3; each commit's own
   touched suites were green.
7. **Another agent committed in this checkout while I worked** (`b1e94e3c` the `.brd` reader skips guide points inside an outline, `f1bf366a` the STATE log).
   Neither touches a file of mine; I staged by name only.

## Auth gates

None.

## The calls he should see

1. **8'0" is a wide board** (his ruling): the top is 31" from `inchesToMm(96)` less 1e-6 mm. Metric: 243.8 cm (95.98") reads 25", 243.9 cm reads 31".
2. **A wide board shortened under 8'0" is held, not rewritten.** The screen, the Width slider and a save all read 25" with the thumb at its end; the open
   board keeps its own width and gets it back when lengthened again until the Width slider itself is moved. **A save stores the held 25"**, so a board saved
   at 7'0" and lengthened later does not bring the old 31" back (it is gone from that save).
3. **The Offset slider's ends are where the wide point can really go** on a board under 4'8" (+/-8" at 4'0", +/-11" at 4'6"); +/-12" from 4'8" up as ever.
4. **The order form keeps its template window** (every existing print unchanged); a 4'0" x 25" draws about 20% shorter in it, whole, instead of losing its rails.
5. **ROCKER's cards keep today's size and shrink only on a drawing longer than 10'0" overall** (a 12'0" board in the 12'6" blank draws them at 77%, type
   included). That also fixes today's overlap for a 10'0" board in the 12'6" blank (it overlapped by 9 units already).
6. **A saved board still has to be at least 30" long** (not half of 4'0" = 24": that would put its centre on the 12" stations); the top is twice 12'0", 288".
7. **No fixture regenerated.** VOLUME's quick-estimate Width stays 16"-24" (its own); FINS' standalone ranges (already 4'-12') stay.
8. The 4'0" quad oddity is the model's own proportions: reported, not changed.

## Worth the founder's eye (not fixed here)

| Item | What I saw |
|---|---|
| **si7-B** | see the top of this file — the only blocker |
| Blanks for a 12'0" x 31" | Two fit, both US Blanks: 12'1" EPS and 12'6" EPS (32" wide; the 12'1"'s 5.19" centre allows a board to 4 15/16" thick). Pick a Blank says "3 blanks long enough for this board, 2 fit"; Millennium's 12'2"P is 26 15/16" wide and is listed under Won't fit. Arctic Foam has nothing over 10'9"; Marko's 12'0" MK-SUP-STD is not pickable (no thicknesses in its catalogue page) |
| Litres | 12'0" x 31" glider at a 3" centre: **135.8 L** (134.7 L on SUMMARY with a Spiral Vee and four channels); 4'0" x 16": 17.2 L, 4'0" x 25": 27.6 L. At a 4" centre the planner measured 159-165 L, not 200+ |
| Paper | Full Sized Template 12'0" x 31": 45 pages Letter, 42 A4; Paper Saver 20 / 21; from about a 30" width the template takes a third column; 9'0" x 31" moves the printed scale square off the corner on Letter (A4 already does this); the Paper Saver caption still says "<=20.5" wide" |
| SUMMARY at 12'0" | The rocker strip's nose-tip and @ 12" readings sit at the house 6-unit gutter, so `7/8" 1 5/16"` reads close to one run; a 10'0" board has 14 more units between them |
| SUMMARY BOTTOM picture (found by the walk) | The cross-section's "HEIGHT x4" label has its box 2.6 dots above its drawing's top edge on **every** board, any size (measured on a plain 6'0" too) — not new, not caused by this; the glyphs are probably fine, a one-dot look on paper would say |
| 3D room | A 12'0" fits the 6.4 m room only with the viewer against the end wall and the lens opened from 62 to 78.5 degrees (10'0": 64.6) — more perspective. The default view of the 12'0" glider looks short and stubby because it is seen end-on |
| `.brd` / blank list speed | Opening a 12'0" x 31" file: 3.6 s in Node (10'0" x 25": 2.0 s). A short wide board is the slow blank-list case (5'0" x 25" ~9.6 s, 4'0" x 25" ~11.9 s in Node) — not new, a little worse |
| FINS | On a 4'0" quad the rear fins' leading edge sits 1/4" ahead of the front fins' trailing edge; the Proportional thruster puts the fronts 22 1/2" up on a 12'0"; the standalone Tail Width @12" slider is 10-18" and a 31" glider reads ~24" there. The widest tail the FINS drawing can be asked to draw is now 15 1/8" half-width (labels looked clean on the 12'0" x 31" Quad) |
| Preset values on a 4'0" board | The walk's 4'0" board is the Longboard preset's rails/foil/fins/tail-block cut down: its Single Fin shows a 10 1/2" base and its tail block 8 1/2" — they are the preset's numbers, which look odd on four feet |
| Board Rack | One scale: beside a 12'0", a 5'8" fish stands at 47% of the rack and a 4'0" at 33% |
| Metric length | The 10 mm track's top is 365.0 cm (12'0" is 365.8 cm); bottom 122.0 cm (4'0" is 121.9 cm) |
| ROCKER at 4'0" | The frame is 433 units tall (5'0": 385), so in a wide panel a 4'0" draws a little smaller |
| BOTTOM page, 8'0" x 31" with every cut | The picture gives way by about 8 dots — the part made to give way |
| Offset / Tail Block / min width | +/-12" is 42-58% of a 12'0" (30-70% of a 5'0"); Tail Block 0-16" and the 16" minimum width kept |
| The old thumb | The re-recorded TEMPLATE picture: the Board Length dot sits a quarter of the way along (was a fifth) |

## Pictures (`pictures/` in this task's folder; I looked at each)

`4ft-x-16in-1-template`, `-2-rocker`, `-3-rails`, `-4-fins`; `12ft-x-31in-1-template`, `-2-rocker`, `-2b-rocker-pick-a-blank`, `-3-rails`, `-4-fins`
(Quad), `-5-summary`, `-6-3d`; `phone-12ft-x-31in-template`, `phone-4ft-x-16in-template`; `sliders-12ft-width-31`, `sliders-4ft-width-held-at-25`;
`rocker-cards-12ft-before-after` (built from the real layout numbers: the old 74-wide card put on the 12'0" spacing next to what the screen now draws);
`order-form-template-window-4ft-x-25in`; `template-12x31-page1-letter` (page 1 of 45); `numbers.md`.
What I saw: nothing clipped, overlapping or running off an edge in any of them. The 12'0" TEMPLATE board is whole with all five callouts, the
Width thumb at its end; ROCKER's cards at 12'0" have clear gaps; Pick a Blank lists the two US Blanks; FINS' labels sit well inside both rails at
a 15" half-width; the iPhone shows both boards whole with every callout and grab point inside the screen; the order form's two windows hold a
4'0" x 25" with margin on both rails; the sliders' dots sit at their ends.

## Known Stubs

None. (`it.todo` for si7-B is the one planned open item.)

## Threat Flags

None new. T-si7-01 (a hand-made short, wide board) mitigated: floor 30", top 288", widths held on read. T-si7-03 mitigated: the `.brd` refusal follows
`BOARD_LENGTH_RANGE_IN` and the fit clamps width and offset through the two functions. T-si7-02 accepted as planned. No database or schema change; no
database or schema constraint on a board's size was found.

## Self-Check: PASSED

- Files created exist: `lib/geometry/board-size.ts`, `lib/geometry/board.test.ts`, `components/viewer/outline-fixed-frame.test.ts`, `e2e/board-size-range.spec.ts`,
  `e2e/board-size-walk.spec.ts`, `pictures/` (19 files incl. `numbers.md`).
- Commits exist: `0131112e`, `13f9e7e0`, `28887640`, `7c0cba8b` (all on `close-bottom-17`, nothing pushed).
