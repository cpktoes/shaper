# Brief — quick 261113-si7: boards from 4 feet to 12 feet, and up to 31" wide from 8 feet up

Anchor on function and constant names, not line numbers; the executor re-reads every file as it then stands.

## The founder (2026-11-13 — locked, word for word)

> "We should also increase the max length of a possible board to 12 feet. And width extended to 31 inches for
> boards over 8 ft."

Today (`lib/geometry/board.ts`): `BOARD_LENGTH_RANGE_IN = { min: 60, max: 120 }` (5'0" to 10'0") and
`WIDEPOINT_WIDTH_RANGE_IN = { min: 16, max: 25 }`.

and, after I read "over 8 ft" back to him as "longer than 8'0"" and said the 5'0" minimum stays:

> "8'0" should be included in the wider range, and lets drop the min length to 4'"

Read as (all three locked):

- **L-max — Length up to 12'0"** (144").
- **L-min — Length down to 4'0"** (48"; it was 5'0").
- **W — Width up to 31" on a board of 8'0" or longer** (96" itself INCLUDED); a board under 8'0" keeps today's
  25" top. The 16" minimum width stays unless the measuring shows a 4'0" board needs it lower — report, do not
  change without a reason.

## Where it reaches (found by grep, 2026-11-13 — find the rest)

The two constants are read by: `board.ts`, `outline-drag.ts` (and `OUTLINE_SLIDER_LIMITS`: wide point offset
±12", Tail Block 0–16"), `components/outline/outline-controls.tsx`, `outline-viewer.tsx`, `guide-outline.ts`,
`template.ts` (the Full Sized Template: its notes say 25" "genuinely exceeds one page's usable…" — the page
maths was built around a 12.5" half-width), `components/template/build-template-pdf*`, `components/summary/
dimension-fit.ts` and `bottom-sheet-fit`, `components/rocker/rocker-view-frame.ts`, `components/volume/
volume-controls.tsx`, `components/viewer/drag-spacing`, `lib/models/design-snapshot.ts` (a board file / saved
board outside 30"–240" is refused; `HARD_EDGE_ENDS_AT_MAX_MM` follows the length top), `board-surface.ts`,
`lib/export/brd-read.ts` / `brd-fit.ts` / `brd-fit-preview.ts` (a `.brd` longer than the range is "out of
range" today — a 12' file should now open), `__fixtures__/phase14-stress-set.ts`, and tests / specs
(`rocker.test`, `foil.test`, `blank-fit.test`, `units.test`, `measure-display.test`, `custom-rocker-art.test`,
`rail-bands.test`, `template.test`, `e2e/rocker-cut`, `summary-planing`, `summary-blank`).

## What I expect (my calls — flag what you change)

1. **Measure first** (scratch `scratchpad/si7/`, `npx tsx` from the checkout root). Before designing anything,
   build boards at the new corners — 12'0" × 23", 12'0" × 31", 10'6" × 31", 8'0" × 31", 7'11 15/16" × 25",
   **4'0" × 16", 4'0" × 25", 4'6" × 20"** (the new short end), and the old corners 10'0" × 25" and 5'0" × 16" as
   the controls — as longboard-shaped presets and as gliders / SUP-ish shapes
   (round nose, wide tail), and run every calculator and page builder over them. Say what breaks or looks
   wrong, with the number:
   - **Outline:** `buildOutline` at 31" and 144" with every tail kind; wide point offset ±12" on a 12' board
     (is ±12" still a sensible window, or should it scale? — say, do not change unless something breaks);
     Tail Block's 16" top against a 31" board; wings (`wingPositionTop`, depth ranges).
   - **Rocker / foil / blanks:** `rockerStationPositions`, the hand-set five-station rocker and foil at 12';
     **the blank catalogue** — which blanks from each of the four makers a 12'0" × 31" board fits in (the seed
     CSV / `lib/blanks/`): if NO blank fits the new corners, say so plainly, and say what ROCKER shows then
     (the Pick a Blank cards, "no blank fits" words, the fallback profile). The thickness ranges at the
     stations — is today's top enough for a 12' glider? (report, do not widen unless asked).
   - **Rails / bottom / volume:** rail stations, Tail Rail Ends At (now the centre: 72" on a 12'), the bottom's
     Start / Deepest At / End sliders and across sliders (Off Rail, Trough At) at a 15.5" half-width, the
     litres (a 12'0" × 31" × 4"-ish board is 200+ L — do the litres labels, the VOLUME page's sliders/targets
     and any "L" formatting hold three digits?), and `volume-controls.tsx`'s own use of the ranges.
   - **Fins:** `computeFinPlacement` on a 31"-wide, 12' board for every setup (the McKee longboard quad model's
     own length rules, `tailWidth12`, off-rail windows) — any NaN, negative, or fin off the board is a finding.
   - **3D and exports:** `board-surface.ts` mesh, the STL / DXF / XYZ zip and the `.brd` writer at the new
     corners (sizes, time), the 3D camera framing a 12' board.
   - **Paper:** the Full Sized Template and Paper Saver (page counts, whether a 15.5" half-width fits the
     page tiling at all — `template.ts`'s own notes say 12.5" already exceeds one page's usable width; say
     how many pages a 12'0" × 31" needs on Letter and A4 and whether anything is clipped), the Overview Sheet,
     the Summary order form's dimension cells (`dimension-fit.ts`: `12'0"` and `31"` and `365.8 cm` /
     `78.7 cm` in their boxes), the `.brd` overview PDF.
   - **Drawing on screen:** every viewer's fit of a 12' × 31" board (TEMPLATE, ROCKER side view and top view,
     BOTTOM, RAILS plots' width axis at a 15.5" half-width, VOLUME, FINS tail drawing, SUMMARY tiles), the
     home page's preset / rack cards and the Board Rack (boards stand at ONE scale — a 12' board beside a 5'8"
     fish: does the rack's height rule hold, on a phone too?), the phone's screen tiles.
   - **Speed:** anything that scales with length (sections, mesh rings, sampling) — time the slowest paths at
     12' against 10'.
2. **The change, pure and tested (Rule 1).** Length: the constant. Width: ONE function in `lib/geometry/`
   that gives a board's width range from its length (never a second literal scattered about), used by the
   slider, the drag, the forgiving reads, the `.brd` fit and the guide. **What happens when a wide board is
   shortened to under 8'** — my call: the board keeps its stored width and the value USED and shown is held
   to that length's top (25"), coming back if the board is lengthened again (the same forgiving-read pattern
   the tail rail settings use); say what the slider and label do at that moment. A saved board inside today's
   ranges must compute exactly as before — pin the four presets' and a spread of boards' figures first.
2b. **The short end (4'0") is its own list of risks — measure each:** the five rocker / foil stations sit 12" in
   from each tip (`rockerStationPositions`) — on a 48" board the 12" stations are 12" from the centre; the rail
   stations; Tail Rail Blends From (12" minimum) and Ends At (the centre, 24") — is there still 2" between
   them on a 4'0" (the `HARD_EDGE_MIN_BLEND_IN` rule, `blendsFromWindow`)?; the tips' Thinning Starts; wide
   point offset ±12" on a 48" board (half the board is 24"); nose / tail rail lengths; wings
   (`wingPositionTop`); the bottom's Start / Deepest At / End windows; fin templates (a thruster's front fins
   ~11" up and a twin now reaching 10" on a 48" board; `tailWidth12`); the blank catalogue's shortest blanks
   (a 4'0" board in a 5'x blank — placement, 'fits' rules); the litres; `design-snapshot.ts`'s refusal bounds
   (half the minimum to twice the maximum: 24"–288" — say whether that still makes sense); the Board Rack's
   one scale with a 4' board beside a 12'; the Full Sized Template's page count at the short end. Anything
   that crosses, goes negative, or divides by a zero-width window is a finding to fix here.
3. **Fix only what the new sizes break.** Anything the measuring shows is merely ugly or could be better at
   12' goes in a list for the founder, not into the build, unless it is a clipped drawing, a wrong number, a
   crash, or a page that refuses — those are fixed here. If the list of real breakages is long (more than
   about four tasks), split: this task does the ranges + the calculators + the screens; paper (templates) or
   3D/export fixes become named follow-up tasks stated at the top of the plan.
4. **Opening files:** a saved board, a JSON board file and a `.brd` at up to 12' / 31" open; the refusal
   bounds in `design-snapshot.ts` and `brd-read.ts` follow the constants; the words that quote the range
   ("between 5'0" and 10'0"" or the like — find them: refusals, helper lines, GUIDE cards, INSTRUCTIONS,
   the Privacy/Terms pages if they mention sizes, `CLAUDE.md` if it does) follow in both unit systems.
5. **Tests:** unit tests for the width-by-length function and the hold; every test that pins the old top is
   re-pointed on purpose; golden fixtures regenerate by their own scripts only if their inputs change (they
   should not); browser specs for TEMPLATE's Length and Width sliders at the new ends on a computer and an
   upright phone, and one walk each of a 12'0" × 31" board and a 4'0" × 16" board through all seven screens
   checking nothing clips or crosses.
   Desktop baseline pictures should not change (no preset changes) — if one does, read the diff first.
6. **For the founder's look** (`pictures/`): a 4'0" board on TEMPLATE, ROCKER, RAILS and FINS; a 12'0" × 31" board on TEMPLATE, ROCKER (with what the blank
   picker says), RAILS, FINS, SUMMARY and 3D on a computer; TEMPLATE on an upright phone; the Full Sized
   Template's first page and page count for it; and a short table of the numbers (litres, pages, blanks that
   fit).

## House rules that bite here

- Work in THIS checkout: `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17`, branch
  `close-bottom-17`. Never `cd` into a subfolder; never touch `/Users/kontoes/Code/shaper` itself. Nothing is
  pushed. **No database change** (lengths and widths are numbers already stored; if you find a database or
  schema constraint on size, stop and say so).
- **A dev server is running from this checkout on port 3117**; the founder is using it. Playwright with
  `PW_PORT=3117` reuses it. Never stop it, never start another `next dev` or a build, never run the whole
  browser suite.
- **While planning, another agent is editing source files in this checkout (quick 261113-qyz, fins in a
  `.brd`, and the Twin's Aft/Forward range).** The planner edits nothing in the repo but its own PLAN file and
  commits nothing; no `git stash` / `checkout` / `restore`. A scratch run that fails on a half-edited file is
  retried later, not worked around. The executor for this task starts only after that one lands, and pins its
  figures at its own start.
- Rule 1 (pure and tested in `lib/geometry/`), Rule 2 (dims in cm to one decimal in Metric: 365.8 cm,
  78.7 cm; units only through `units.ts` / `measure-display.ts`), plain English everywhere a shaper reads.
- The sample `.brd` files in `~/Downloads` are never committed nor their text.
- `e2e/board-file.spec.ts` test f1 fails on untouched code — known, not ours. `npm run lint` has one old
  warning.
