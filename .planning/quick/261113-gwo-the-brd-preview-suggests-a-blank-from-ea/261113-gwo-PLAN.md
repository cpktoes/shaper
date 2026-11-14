---
phase: quick-261113-gwo
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/brd-blank-suggest.ts
  - lib/geometry/brd-blank-suggest.test.ts
  - lib/export/brd-blank-words.ts
  - lib/export/brd-blank-words.test.ts
  - lib/export/brd-fit-preview.ts
  - app/api/blank-catalog/route.ts
  - lib/blank-catalog-route.test.ts
  - components/setup/brd-blank-suggestions.tsx
  - components/setup/brd-fit-dialog.tsx
  - components/template/build-brd-overview-pdf.ts
  - components/template/build-brd-overview-pdf.test.ts
  - e2e/brd-fit-preview.spec.ts
  - .planning/quick/261113-gwo-the-brd-preview-suggests-a-blank-from-ea/pictures/
autonomous: true
requirements: [BRIEF-S1, BRIEF-S2, BRIEF-S3, BRIEF-S4, BRIEF-S5, BRIEF-S6]

estimate:
  tokens: 150000
  raw_tokens: 150000
  tasks: 3
  confidence: low
  # estimate-calibration: factor 1, no samples, confidence low. Raw = 261113-d9b's actual 150k for three tasks (a new lib
  # module with a search, a dialog block, a browser spec). One executor, this worktree, the three tasks in order.

must_haves:
  truths:
    - "When a .brd preview is open, a SUGGESTED BLANKS block under the rocker-use line names one blank from each blank maker the shaper shows (BLANK MAKERS ticks), chosen among the blanks the fitted board fits in by the app's own fit rules and the shaper's own App Default Settings (Extra Length, Planer Max Depth, Width Margin, Deck Skin, Tip Style), as the one whose rocker under the board comes closest to the file's bottom line (S1)"
    - "Each maker's line gives the blank's name as the maker writes it, how close its rocker gets (the widest gap, from 1 inch in at each tip, and where, from the nearer end), and the rocker differences at the nose tip, nose 12, tail 12 and tail tip against the file's own figures in the ROCKER table (+ more rocker than the file, - less) (S1)"
    - "A maker with no blank this board fits in reads '<maker>: no blank this board fits in.' and never a bad match (S2)"
    - "Where one Customize Rocker change per end brings that blank at least 1/16 inch closer, the line adds the maker's order code (always inches, as formatRockerNote writes it) and how close it then gets; every change sits inside Customize Rocker's own limits (whole-inch bend start 3 inches in to the centre, within +/-2 inches, never under its floor) (S3)"
    - "The same words print on the one-page overview, still one page, in the shaper's system: gaps and differences as marks, where as a dim, blank names and order codes as the maker writes them (S4)"
    - "Open as a Board still opens the fit with no blank picked; nothing is picked for the shaper (S5)"
    - "The catalogue is fetched from the server only when a .brd preview is open, once per page visit; the home page makes no catalogue request on load; if it cannot load the block says so in one quiet line and Print Overview, Open as a Board and Close all still work; the .brd never leaves the browser (S6)"
  artifacts:
    - path: lib/geometry/brd-blank-suggest.ts
      provides: "brdBlankFitContext, suggestBlanks (one pick per maker), bendsToward (one change per end, checked exactly), BRD_BEND_STEP_MM, BRD_BEND_TIE_MM, BRD_BEND_MIN_GAIN_MM, BRD_SUGGEST_STEPS"
    - path: lib/export/brd-blank-words.ts
      provides: "BRD_BLANK_COPY and brdBlankWords(state, look, system) -> BrdBlankWords (caption, intro, lines) for the dialog and the paper alike"
    - path: app/api/blank-catalog/route.ts
      provides: "GET: the pickable catalogue as JSON (loadPickableBlanks), never rejecting"
    - path: components/setup/brd-blank-suggestions.tsx
      provides: "useBrdBlankWords(look, system) (fetch once, prepare once, suggest after paint) and the BrdBlankSuggestions block"
  key_links:
    - from: components/setup/brd-blank-suggestions.tsx
      to: app/api/blank-catalog/route.ts -> lib/db/blanks.ts loadPickableBlanks
      via: "fetch('/api/blank-catalog') once per page visit, started only when the block mounts inside an open .brd preview"
    - from: components/setup/brd-blank-suggestions.tsx
      to: lib/geometry/brd-blank-suggest.ts suggestBlanks -> lib/geometry/blank-fit.ts listBlanks / boardOnBlank
      via: "the same BoardFitContext ROCKER's useBlankList builds for the opened board (no blank, the fit's foil, the shaper's live cut and fit rules)"
    - from: components/setup/brd-fit-dialog.tsx Print Overview
      to: components/template/build-brd-overview-pdf.ts
      via: "the block's BrdBlankWords passed in the print options; one block of body lines after the point notes"
---

<objective>
Third step of opening a `.brd` (the founder, 2026-11-13: "Maybe suggest a blank (from each mfg?) that gets the rocker very
close"). The closest-fit preview, and the one-page overview it prints, gain one small block: for each blank maker, the blank
this board fits in whose rocker under the board comes closest to the file's, how close, the rocker differences at the
stations a shaper reads, and, where it helps, the Customize Rocker order that brings it closer. A suggestion only: nothing is
picked (BRIEF-S5).

Purpose: the ROCKER table already shows "their rocker data"; this turns its line "pick a blank on ROCKER and use Customize
Rocker" into named blanks and an order code.
Output: a pure, tested suggestion module; a words builder; a public read-only catalogue route; the block in the preview and on
paper; browser proof and pictures.

Read first: `.planning/quick/261113-gwo-the-brd-preview-suggests-a-blank-from-ea/BRIEF.md` (the founder's words and house
rules), then this plan's measurement section. Rule 1 (pure maths in lib/geometry, tested), Rule 2 (units through units.ts /
measure-display.ts) and plain English everywhere (commit messages and SUMMARY included).
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/261113-gwo-the-brd-preview-suggests-a-blank-from-ea/BRIEF.md
@.planning/quick/261113-et0-open-a-brd-as-an-editable-board-from-the/261113-et0-SUMMARY.md
@CLAUDE.md
@AGENTS.md
@lib/geometry/blank-fit.ts
@lib/geometry/custom-rocker.ts
@lib/geometry/brd-fit.ts
@lib/export/brd-fit-preview.ts
@components/setup/brd-fit-dialog.tsx
@components/template/build-brd-overview-pdf.ts
@components/rocker/use-blank-list.ts
@lib/db/blanks.ts
</context>

## What the planner measured (2026-11-13, scratch scripts in the session scratchpad `gwo/`)

Scripts (never in the repo): `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/gwo/rank.ts`
(rank the catalogue), `bend.ts` / `bend2.ts` / `bend3.ts` (the bend solver; `bend3.ts` with `TOL=0.03125` is the chosen
rule), `trip.ts` (the round trip). Run with the worktree's `node_modules/.bin/tsx --tsconfig <worktree>/tsconfig.json`, the
four AkuShaper files from `~/Downloads` as arguments. The catalogue is the committed CSVs (219 pickable blanks).

**The method (what the code must do — written out in Task 1):** build the board exactly as ROCKER's `useBlankList` would judge
the opened board (no blank yet: the fit's length, outline, centre and two tips; no fine-tunes; the shaper's own Deck Skin and
Tip Style; fine-tunes on the Deck), run the app's own `listBlanks` over the catalogue, and for every blank that FITS lay the
board on it at the verdict's own placement (`boardOnBlank`) and measure the rocker gap against the file: both lines measured
as lift off their own centre (the board's `rockerAt(s) - rockerAt(L/2)`; the file's `lineLowestAt(bottom, s) -
lineLowestAt(bottom, L/2)`, the same measure as the ROCKER table), at the 400-step grid the fit's own closeness uses, the last
inch at each tip left out. Per maker the smallest largest-gap wins.

**Speed (Node, warm):** reading the CSVs 25–33 ms and preparing all 219 blanks 12–22 ms (once per visit); judging the whole
catalogue for one board 25–93 ms (Fryer 25, 6'2 62, egg 85, Scoop 93; up to ~330 ms on a cold first run); the gap for every
fitting blank 4–18 ms in all; the bends 8–32 ms per suggested blank (4 blanks: 40–110 ms). The full suggestion is ~80–220 ms in
Node. It runs once, after the catalogue arrives and after the block has painted its "Looking for blanks…" line, so the preview
itself stays instant.

**Round trip (the test the brief asked for):** each preset in its own blank (`phase16Boards()` labels
`shortboard|asis|hard`, `fish|asis|hard`, `midlength|asis|hard`, `longboard|asis|hard`), written by the app's own `.brd`
writer, read back and fitted: US Blanks' suggestion is the preset's own blank every time — Shortboard 6'3"RP 0.29 mm, Fish
5'10"RP 0.67 mm, Midlength 7'4"SP 0.72 mm, Longboard 9'3"Y 3.48 mm (the app's export rounds the tips, so the longboard's
fitted tail tip is thinner than the board's own and the Pin deck thinning differs near the tail, 3.2" in). The swallow and
diamond variants are not usable for this test (the fit makes a squash, so the outline changes).

**Results on the four AkuShaper files** (Tip Style Pin deck, the out-of-the-box defaults; inches; natural = the blank's own
rocker; bends = one Customize Rocker change per end, the rule below; "—" = no change gets it 1/16" closer):

| File | Maker | Suggested blank | Natural: widest gap | With Customize Rocker |
|------|-------|-----------------|---------------------|-----------------------|
| 6'10 Egg | US Blanks | 7'6"EAX (board 1 3/16" toward the tail) | 0.396 (1" from the tail) | +1/8"N +7/16"T: 0.165 |
| | Arctic Foam | 7'9" SBF | 0.409 (1" from the tail) | -1/4"N +9/16"T39": 0.048 |
| | Marko Foam | 7'5" Machine All | 0.275 | — |
| | Millennium Foam | 7'5"HS | 0.255 (1" from the nose) | -1/8"N27" +3/16"T: 0.169 |
| 6'2 Round Tail | US Blanks | 6'5"R | 0.182 | +1/16"N +1/8"T37": 0.119 |
| | Arctic Foam | 6'8" SBF | 0.168 | -1/16"N -1/8"T: 0.071 |
| | Marko Foam | 6'9" Regular | 0.412 | -7/16"N18" -1/8"T27": 0.203 |
| | Millennium Foam | 7'1"DG | 0.241 | -7/16"T21": 0.108 |
| Fryer 5'7 | US Blanks | 6'7"P | 0.343 | — (best 0.292) |
| | Arctic Foam | 6'4" SBM | 0.203 | — (best 0.173) |
| | Marko Foam | 6'4" TP | 0.438 | -7/16"N +1/2"T: 0.252 |
| | Millennium Foam | 6'6"DG | 0.227 | — (best 0.201) |
| Scoop Noserider | US Blanks | 9'9"B | 0.477 | -7/16"N +5/16"T: 0.178 |
| | Arctic Foam | 9'9" LB | 0.639 | -3/8"N +3/4"T: 0.152 |
| | Marko Foam | 10'0" MK | 0.875 | -1"N +15/16"T: 0.256 |
| | Millennium Foam | 9'9"P | 0.346 | +7/16"T: 0.103 |

Every maker has a fitting blank for all four files (between 4 and 97 per maker). The widest gaps sit mostly within a few inches
of a tip, where Pin deck takes the tip thinning off the bottom and lifts the board's tip rocker; under Tip Style Bottom the
picks change (e.g. the Fryer's Millennium pick becomes 5'10"F at 0.210"), which is why the shaper's own Tip Style is used.
Honest headline: with the default Pin deck no stock blank comes within 1/8" of these four files (3/16" to 7/8" at worst); one
Customize Rocker change per end brings the best of them to about 1/16" and most to 1/8"–1/4".

**Customize Rocker — kept, because it is cheap and reliable.** A bend adds `amount × u²` past its start (`bendAt`), so with the
board at a fixed placement the board's centre-referenced lift is the natural lift plus `amount × g(s)`, where `g(s) =
bendAt(one 1 mm change, x(s)) - bendAt(same, x(L/2))` and `x(s)` is the blank station (`blankStationOf`). Levelling drops out
because both lines are measured off their own centre, and the bend never changes thickness or width, so the fit verdict
stands. That linear model matched the exact check (`withCustomRocker` then `boardOnBlank`) to the thousandth of an inch on all
sixteen. Searching every start and every 1/16" amount for one change per end costs 8–32 ms per blank.
Two things measured and ruled out: (a) a second change per end (65 × 65 amounts × ~800 start pairs per end, millions of
tries: not cheap, and one change already reaches most of the gain); (b) picking the blank by its BENT result — it chooses
absurd blanks (a 7'8"A bent +2"N33" +1 9/16"T for the 5'7" Fryer), so the blank is chosen by its natural rocker and the bends
are worked out for that blank only. The plain best-gap bend sometimes orders something odd (-2"N7", -2"N9" -2"T7"), so each
end takes the SMALLEST amount whose gap is within 1/32" of that end's best (then the start nearest the centre), and the bends
are shown only when the exact check comes out at least 1/16" closer than natural.

## How the catalogue reaches the browser today, and how it reaches the preview

ROCKER's page (`app/design/rocker/page.tsx`) calls `loadPickableBlanks()` without awaiting and streams the promise to the
sidebar; `components/rocker/use-blank-list.ts` prepares and judges it in the browser. The home page cannot stream it (it must
not get heavier for everyone, and the preview opens long after the page). This version of Next says Server Functions are for
mutations (`node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`, "Good to know") and points reads at a
Route Handler (`15-route-handlers.md`: GET handlers are not cached by default; this app does not use Cache Components). So: a
public GET route `app/api/blank-catalog/route.ts` answering `Response.json(await loadPickableBlanks())` — the same never-
rejecting loader, so the browser suite's `SHAPER_BLANKS_SOURCE=seed-csv` dev server (port 3117) reads the CSVs and production
reads Neon. The block fetches it once per page visit, only when it mounts (inside an open `.brd` preview). `proxy.ts` already
runs Clerk on `/api` with no `.protect()`, so the route is open to a signed-out shaper like every page (D-01).

## Changes to the brief, and my calls (flag all of them in the SUMMARY)

1. **Placement** is the verdict's own (the fitting placement closest to centre — where Pick a Blank lands the board when the
   blank is picked), not a rocker-seeking slide; so the figures are exactly what ROCKER shows after the pick. One egg pick sits
   1 3/16" toward the tail; the words do not mention placement (Pick a Blank puts it there).
2. **Tip Style and fit rules are the shaper's own live App Default Settings** (as the brief says). They change which blank wins.
3. **Customize Rocker: one change per end**, smallest amount within 1/32" of that end's best, shown only when at least 1/16"
   closer. Bends are worked out for the suggested blank only (see above for why not the bent ranking).
4. **Makers the shaper has switched off** in BLANK MAKERS are left out, because Pick a Blank would not show their blanks.
5. **Route Handler, not a Server Action**, for the read (Next's own guidance). No database change, no migration.
6. **On paper:** the block prints when the suggestions are ready; if the catalogue did not load, the quiet line prints; if the
   shaper prints before they are ready (a second or so), the block is left off the page.
7. **"Very close" is not what the stock catalogue gives these four files** under Pin deck (3/16" to 7/8"); the words quote the
   true figures. Tracer-first is not used: the maths was measured end to end by the planner; the order is lib, screen, paper.
8. Two small exports in `lib/export/brd-fit-preview.ts` (`gapWhere`, `lessThan`) so the "where" and "less than" rules stay one
   rule each; everything else is in new files, so quick 261113-gwr (bottom contours, built after this) meets one block in the
   dialog and one in the PDF builder.

## Interfaces (Task 1 adds these; Tasks 2–3 use the names)

- `lib/geometry/brd-blank-suggest.ts` (pure; imports only `./blank`, `./blank-fit`, `./custom-rocker`, `./brd-fit`,
  `./outline`, `./rocker`, `./units`, `./bezier-fit` types):
  - `BRD_SUGGEST_STEPS = 400` (the same steps the fit's closeness uses), `BRD_BEND_STEP_MM = inchesToMm(1/16)`,
    `BRD_BEND_TIE_MM = inchesToMm(1/32)`, `BRD_BEND_MIN_GAIN_MM = inchesToMm(1/16)`.
  - `interface BrdBlankCut { deckSkin: Mm; tipStyle: TipStyle }`.
  - `brdBlankFitContext(fit: Pick<BrdFit, "outline" | "foil">, cut: BrdBlankCut): BoardFitContext`.
  - `interface BrdRockerGap { largest: Mm; at: Mm }` (at = distance from the tail).
  - `interface BrdBlankBends { spec: BlankRockerSpec; largest: Mm; at: Mm }`.
  - `interface BrdBlankPick { record: BlankRecord; placement: Mm; gap: BrdRockerGap; lift: Record<"noseTip" | "nose12" | "tail12" | "tailTip", Mm>; bends: BrdBlankBends | null }`.
  - `interface BrdBlankSuggestion { vendor: string; pick: BrdBlankPick | null }`.
  - `suggestBlanks(input: { fit: Pick<BrdFit, "outline" | "foil">; bottom: readonly P2[]; prepared: readonly PreparedBlank[]; makers: readonly string[]; cut: BrdBlankCut; settings: FitSettings }): BrdBlankSuggestion[]` — one entry per `makers` item, in that order.
  - `bendsToward(prepared: PreparedBlank, ctx: BoardFitContext, placement: Mm, bottom: readonly P2[]): BrdBlankBends | null`.
- `lib/export/brd-blank-words.ts`: `type BrdBlankState = { status: "loading" } | { status: "unavailable" } | { status: "ready"; suggestions: BrdBlankSuggestion[] }`;
  `interface BrdBlankWords { caption: string; intro: string | null; lines: string[][] }` (one inner array per maker or one
  quiet line; each inner array is a maker's head line then, optionally, its Customize Rocker line); `BRD_BLANK_COPY`;
  `brdBlankWords(state: BrdBlankState, look: BrdFitLook, system: UnitsSystem): BrdBlankWords`.
- `lib/export/brd-fit-preview.ts`: `export function gapWhere(at: Mm, length: Mm, system: UnitsSystem): string` (the existing
  inline rule in `closeWords`, moved out, `closeWords` calling it) and `export` on the existing `lessThan`.

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: The suggestion maths and its words, in lib, tested</name>
  <files>lib/geometry/brd-blank-suggest.ts, lib/geometry/brd-blank-suggest.test.ts, lib/export/brd-blank-words.ts, lib/export/brd-blank-words.test.ts, lib/export/brd-fit-preview.ts</files>
  <read_first>lib/geometry/blank-fit.ts (boardOnBlank, listBlanks, judgeBlank, blankStationOf, BoardFitContext), lib/geometry/custom-rocker.ts (bendAt, floorOf, normalizeSpec, withCustomRocker, formatRockerNote, ROCKER_CHANGE_MAX_MM, ROCKER_BEND_MIN_FROM_TIP_IN), components/rocker/use-blank-list.ts (how the board's ctx is built — copy it, not a new rule), lib/geometry/brd-fit.ts (lineLowestAt, BRD_FIT_TIP_SKIP_MM, brdFileStations), lib/export/brd-fit-preview.ts (closeWords, lessThan, BRD_FIT_COPY style), lib/geometry/brd-fit.test.ts lines 150–180 and lib/models/brd-board.test.ts (how a preset is written as a .brd and read back), the scratch script gwo/bend3.ts (the measured solver)</read_first>
  <behavior>
    - Round trip (BRIEF-S1): for `shortboard|asis|hard`, `fish|asis|hard`, `midlength|asis|hard`, `longboard|asis|hard` from `phase16Boards()`, written with `buildBoardSurface` + `brdText`, read with `readAnyBrd`, fitted with `fitBoardToBrd`, suggested against the committed catalogue (`readSeedCatalog(SEED_CSV_DIR)`, `isPickable`, `prepareBlank`, prepared once for the file) with `DEFAULT_BLANK_CUT`'s skin and Tip Style and `DEFAULT_FIT_DEFAULTS`' three fit rules: the US Blanks pick's name equals the preset's own blank (6'3"RP, 5'10"RP, 7'4"SP, 9'3"Y); its gap is under 1 mm for the first three and under 4 mm for the longboard; its bends are null for the first three.
    - Every pick fits: `judgeBlank(prepared, brdBlankFitContext(fit, cut), settings)` says fits for it, at the pick's placement.
    - Every pick is its maker's closest: on the Shortboard trip, no other fitting blank of that maker has a smaller gap (brute check over `listBlanks(...).fits`).
    - A maker with nothing that fits gets `pick: null` (settings with Extra Length 200": all four null; still four entries, in the makers' order); a `makers` list of one maker gives one entry.
    - Bends find a known order: with the Shortboard trip's ctx (`brdBlankFitContext(fit, cut)`), build a bottom polyline of 401 points `[s, rockerAt(s)]` from `boardOnBlank(withCustomRocker(prepared6x3RP, spec), ctx.board, 0)` where spec is nose -1/4" from 18" in and tail +1/8" from the centre; `bendsToward(prepared6x3RP, ctx, mm(0), thatBottom)` returns bends whose exact gap is under 1 mm (natural is about 4.7 mm there), with at most one change per end, each amount a whole number of 1/16" within +/-2" and at or above `floorOf`, each start a whole inch at least 3" in or the centre.
    - `bends.largest` is the exact figure: it equals a fresh `boardOnBlank(withCustomRocker(...))` measurement, not the model's.
    - Words (Imperial): a ready state gives caption `SUGGESTED BLANKS`, the intro, and per maker a head line `<vendor> <name>: within <mark>, the widest gap <where>. Nose <signed>, nose 12" <signed>, tail 12" <signed>, tail <signed>.`; a pick with bends adds `Customize Rocker to <order code>: within <mark>.`; a null pick reads `<vendor>: no blank this board fits in.`; a gap under 1/16" reads `within less than 1/16"`.
    - Words (Metric): marks in whole mm (`within 10 mm`, `Nose +3 mm`), where in cm (`2.5 cm from the tail`), the order code still in inches (`-1/4"N18"`).
    - Loading gives the one line `Looking for blanks…` (no intro); unavailable gives the one quiet line (no intro).
    - `closenessSentence` and every existing brd-fit-preview test still pass after the `gapWhere` / `lessThan` extraction.
  </behavior>
  <action>
Write the tests first (both test files), run them and see them fail, then write the code (per BRIEF-S1, S2, S3, S4).

`lib/geometry/brd-blank-suggest.ts` — the header comment says what it is (quick 261113-gwo, the founder's ask quoted), the
measured method, and why the blank is chosen by its natural rocker and the bends by the tie rule. Pure (Rule 1), millimetres,
nothing rounded.

`brdBlankFitContext(fit, cut)`: geometry = `buildOutline(fit.outline)`; board = length `fit.outline.length`, centerThickness
`fit.foil.center`, noseTip `fit.foil.noseTip`, tailTip `fit.foil.tailTip`, both 12" offsets `mm(0)`, deckSkin and tipStyle from
`cut`, fineTuneSurface `DEFAULT_BLANK_CUT.fineTuneSurface`, no Thinning Starts; halfWidthAt `(s) => sampleOutline(geometry, s)`;
widePointStation `geometry.widePointStation`. This is exactly what `useBlankList` builds for a board with no blank picked.

The gap measure (one private helper, used for natural and bent alike): L = `ctx.board.length`; grid = `s = L*i/BRD_SUGGEST_STEPS`
for i = 0..400, kept when `BRD_FIT_TIP_SKIP_MM <= s <= L - BRD_FIT_TIP_SKIP_MM`; file lift at s = `lineLowestAt(bottom, s) -
lineLowestAt(bottom, L/2)` (worked out once per file); the board's lift on a blank = `ob.rockerAt(s) - ob.rockerAt(L/2)` with
`ob = boardOnBlank(prepared, ctx.board, placement)`; largest = the biggest absolute difference over the grid, at = its station
(the first on a tie).

`suggestBlanks`: ctx = `brdBlankFitContext`; keep only prepared blanks whose `record.vendor` is in `makers`; `list =
listBlanks(kept, ctx, settings)`; for each verdict in `list.fits` (already ordered by length then name) measure its gap at
`verdict.placement`; per maker the verdict with the strictly smallest largest gap wins (so on a tie the shorter blank, by the
list's own order). The pick's `lift` holds the board's centre-referenced lift on that blank at `rockerStationPositions(L)`'s
noseTip, nose12, tail12 and tailTip stations. `bends = bendsToward(winner.prepared, ctx, winner.placement, bottom)`. Makers with
no fitting verdict get `pick: null`. Return one entry per `makers` item, in that order.

`bendsToward` (the measured solver, written out): Lb = blank length; x(s) = `blankStationOf(mm(s), placement, L, Lb)`; xc =
x(L/2); residual r_i = file lift minus the natural board lift at grid station i; centreIn =
`Math.floor(mmToInches(mm(Lb/2)) + 1e-9)`; starts = the centre (no `fromTip`) then every whole inch from
`ROCKER_BEND_MIN_FROM_TIP_IN` up to centreIn - 1. Solve the nose first, over grid stations with s >= L/2, then the tail over
s <= L/2 with the chosen nose change as the "others" for its floor. For one end and one start: shape g_i = `bendAt({ changes:
[that change with amount mm(1)] }, Lb, x(s_i)) - bendAt(same, Lb, xc)`; skip a start whose shape is all zero; amounts are
`k * BRD_BEND_STEP_MM` for whole k from `Math.round(floorOf(prepared, change, others, BRD_BEND_STEP_MM) / BRD_BEND_STEP_MM)` up
to `Math.round(ROCKER_CHANGE_MAX_MM / BRD_BEND_STEP_MM)` (whole steps, never an accumulated sum); worst(start, a) = max_i |r_i -
a*g_i|. The no-change candidate has worst = max |r_i| on that half. Choose: least = the smallest worst; among candidates with
worst <= least + `BRD_BEND_TIE_MM`, the smallest |amount|, then the centre start, then the larger whole inch, then the smaller
worst. A chosen amount of 0 is no change. spec = `normalizeSpec({ changes: [nose?, tail?] }, Lb)`; if it is natural return
null. Exact check: largest/at from the gap measure on `withCustomRocker(prepared, spec)` at the same placement. Return null
unless that largest is at least `BRD_BEND_MIN_GAIN_MM` under the natural largest; otherwise `{ spec, largest, at }`.

`lib/export/brd-fit-preview.ts`: move `closeWords`'s inline where-rule into an exported `gapWhere(at, length, system)` (same
words: from the tail when at <= length/2, else from the nose, both through `formatDim`) and have `closeWords` call it; add
`export` to `lessThan`. Nothing else in that file changes.

`lib/export/brd-blank-words.ts` (pure; every word in `BRD_BLANK_COPY`, the founder rewords after his look): caption
`SUGGESTED BLANKS`; intro `One blank from each maker that this board fits in by your App Default Settings, its rocker closest to
the file's. The figures are the board's rocker on that blank against the file's ROCKER figures: + is more rocker, - less; the
gaps leave out the last inch at each end.`; loading `Looking for blanks…`; unavailable `The blank catalog didn't load, so no
blank is suggested. Pick one on ROCKER.`; the none line is the maker's name followed by `: no blank this board fits in.`; head
line and bends line as in the behaviour list. `brdBlankWords`: L = `look.fit.outline.length`; the file's figures come from
`brdFileStations(look.board)` (the same figures the ROCKER table shows); each difference is pick lift minus the file's lift at
that station through `formatSignedMark`; gaps through `formatMarkOrLess` then `lessThan` (so "within less than 1/16""); where
through `gapWhere(gap.at, L, system)`; the 12" label through `stationLabel(system)`; the blank as `${record.vendor}
${record.name}`; the order code through `formatRockerNote(bends.spec)` (always inches — Rule 2's third printed-page note).
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/brd-blank-suggest.test.ts lib/export/brd-blank-words.test.ts lib/export/brd-fit-preview.test.ts lib/geometry/brd-fit.test.ts lib/geometry/custom-rocker.test.ts lib/units-isolation.test.ts && npx tsc --noEmit && npm run lint</automated>
  </verify>
  <done>Both new test files pass (they failed before the code existed), the round trip names each preset's own blank, every existing brd-fit-preview and brd-fit test still passes, tsc and lint clean (the one known old lint warning aside). Commit 1, plain English, e.g. "The board-file preview can work out, for each blank maker, the blank this board fits in whose rocker comes closest to the file's, and the Customize Rocker order that brings it closer (maths and tests only)".</done>
</task>

<task type="auto">
  <name>Task 2: The catalogue reaches the preview, and the block shows under the rocker table</name>
  <files>app/api/blank-catalog/route.ts, lib/blank-catalog-route.test.ts, components/setup/brd-blank-suggestions.tsx, components/setup/brd-fit-dialog.tsx</files>
  <read_first>node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md (AGENTS.md: read before page code), lib/db/blanks.ts (loadPickableBlanks never rejects), lib/db/blanks.test.ts (vi.stubEnv for SHAPER_BLANKS_SOURCE), lib/clerk-webhook-route.test.ts (how a route is imported into a lib test), lib/blanks/catalog.ts (isWellFormedBlankRecord, isPickable), components/blank-makers-provider.tsx (useBlankMakers().hidden), lib/blanks/vendors.ts (KNOWN_BLANK_VENDORS, shownBlankVendors), components/fit-defaults-provider.tsx (useFitDefaults: defaults, settings), components/setup/brd-fit-dialog.tsx (FitBody, the rocker-use line and point notes)</read_first>
  <action>
Per BRIEF-S6 and S1/S4/S5.

`app/api/blank-catalog/route.ts`: one exported `GET` that returns `Response.json(await loadPickableBlanks())` — nothing else,
no request reading, no cache headers (Route Handlers are not cached by default here). A header comment: public, read-only, the
same owner-less catalogue ROCKER already streams to every visitor; never rejects, so a failure is `{ status: "unavailable" }`.
`lib/blank-catalog-route.test.ts`: with `vi.stubEnv("SHAPER_BLANKS_SOURCE", "seed-csv")` the GET answers 200 and a body with
status ok and more than 100 blanks, each well formed; and, after `vi.resetModules()` and a `vi.doMock` of `@/lib/db/blanks`
whose `loadPickableBlanks` resolves `{ status: "unavailable" }`, a fresh import of the route answers 200 with exactly that body
(the route passes the loader's answer through untouched; the loader's own failure paths are already tested in
`lib/db/blanks.test.ts`).

`components/setup/brd-blank-suggestions.tsx` ("use client"):
- A module-level cache of one in-flight-or-done promise for the catalogue. `fetch("/api/blank-catalog")`; a non-OK answer, a
  thrown fetch, a body whose status is not ok, or no record left after keeping only `isWellFormedBlankRecord` and `isPickable`
  records, all resolve to unavailable and clear the cache (so a later preview tries again); success stays cached for the visit.
  The fetch starts only inside an effect of the hook below, never at module load.
- `useBrdBlankWords(look: BrdFitLook, system: UnitsSystem): BrdBlankWords`: state starts loading; loads the catalogue; prepares
  it once (`prepareBlank` over the records, memoised on the records); makers = `shownBlankVendors(hidden)` from
  `useBlankMakers()`; cut = `{ deckSkin: defaults.deckSkin, tipStyle: defaults.tipStyle }` and `settings` from
  `useFitDefaults()`. When the prepared catalogue, the look, the cut, the three fit rules or the makers change, schedule
  `suggestBlanks({ fit: look.fit, bottom: look.board.bottom, prepared, makers, cut, settings })` with `window.setTimeout(…, 0)`
  (so "Looking for blanks…" paints first; clear the timer on cleanup) and store `{ status: "ready", suggestions }`. Words =
  `brdBlankWords(state, look, system)` memoised on state, look and system (a units switch re-words, never re-searches).
- `BrdBlankSuggestions({ words })`: a `data-brd-blanks` wrapper with the caption in `CAPTION_CLASS` (from
  `components/3d/brd-preview-dialog`), the intro as a muted `text-xs` paragraph (`data-brd-blanks-intro`), then one
  `data-brd-blanks-maker` block per entry, its lines as `text-xs text-surf-ink` paragraphs, a Customize Rocker line marked
  `data-brd-blanks-bends`; the quiet loading/unavailable line carries `data-brd-blanks-status` with `role="status"`. Plain text
  only, never HTML. Same tokens as the dialog's other blocks; wraps on a phone.

`components/setup/brd-fit-dialog.tsx` — the ONE block (keep the edit small; quick 261113-gwr edits this file after you): in
`FitBody` call `const blanks = useBrdBlankWords(look, system)` beside the existing `sheet` memo, and render
`<BrdBlankSuggestions words={blanks} />` directly after the `div` that holds the rocker-use line and the point notes. Do not
touch Open as a Board: it still opens the fit with no blank (S5). Update the component's header comment with one sentence about
the block.
  </action>
  <verify>
    <automated>npx vitest run lib/blank-catalog-route.test.ts lib/db/blanks.test.ts lib/db/ownership.test.ts lib/auth && npx tsc --noEmit && npm run lint && curl -s http://localhost:3117/api/blank-catalog | head -c 120</automated>
  </verify>
  <done>The route test passes both ways; the 3117 dev server answers `{"status":"ok","blanks":[...` at /api/blank-catalog (read only — never stop or restart it); opening a .brd preview on 3117 shows SUGGESTED BLANKS under the rocker-use line with four maker lines; tsc and lint clean. Commit 2, plain English, e.g. "The board-file preview now names a suggested blank from each maker under the rocker table, with the Customize Rocker order where it helps; the blank catalogue is fetched only when a board file is being looked at".</done>
</task>

<task type="auto">
  <name>Task 3: The block on the printed overview, browser proof, and pictures for the founder</name>
  <files>components/template/build-brd-overview-pdf.ts, components/template/build-brd-overview-pdf.test.ts, components/setup/brd-fit-dialog.tsx, e2e/brd-fit-preview.spec.ts, .planning/quick/261113-gwo-the-brd-preview-suggests-a-blank-from-ea/pictures/</files>
  <read_first>components/template/build-brd-overview-pdf.ts (the `under` item list, heightOf, the one-page throw), its test (the four boards x systems x heights loop), e2e/brd-fit-preview.spec.ts (boardFile, pickFile, dialogOf, b6/b7/b9 shapes), /Users/kontoes/.claude/projects/-Users-kontoes-Code-shaper/memory/shaper-pdf-and-browser-verification.md (PDF read-back with pypdf), the et0 shoot scripts in the scratchpad `et0/shoot/` and `et0/pdfs.ts`</read_first>
  <action>
Per BRIEF-S4 and S6.

PDF: add an optional `blanks?: BrdBlankWords | null` to `BuildBrdOverviewPdfOptions`. In `under`, right after
`...sheet.pointNotes.map(body)`, when `blanks` is given and its status is not loading (the dialog passes null while loading):
a gap, the caption item (bold, caption size, like HOW CLOSE), the intro as a body item when present, and every line of every
maker as a body item. Nothing else in the builder moves; the drawings shrink to make room exactly as they already do, and the
existing one-page throw still guards. In `brd-fit-dialog.tsx`'s `handlePrint`, pass `blanks` (the hook's words) in the print
options, or null while they are still loading — one property, nothing else.
PDF test: the existing four boards x Imperial/Metric x Height 1, 2, 4, 8 build one page WITH a ready four-maker block (build the
words from `suggestBlanks` on the preset trip boards or from a hand-made `BrdBlankState` with four picks, each with bends, the
longest case) and the page text holds `SUGGESTED BLANKS` and each maker's name; with `blanks` absent the page is unchanged
(same text as before).

Browser (`PW_PORT=3117`, reuse the founder's server — never start one; run only this spec and `e2e/board-file.spec.ts`):
- b10 (all three projects): before any file is picked the page has made no request to `/api/blank-catalog`; pick the
  Shortboard's `.brd` (the spec's `boardFile("shortboard|asis|hard")` style) — the SUGGESTED BLANKS block appears with four
  `data-brd-blanks-maker` entries in the order US Blanks, Arctic Foam, Marko Foam, Millennium Foam, the US Blanks entry naming
  `6'3"RP`; exactly one catalogue request was made; record the time from the preview opening to the four lines showing in the
  SUMMARY (expect well under 2 s on all three; fail over 5 s); on the phones the footer's three buttons still sit in view and
  do not overlap (reuse b6's checks).
- b11 (desktop): route `**/api/blank-catalog` to a 500 — the one quiet line shows (`data-brd-blanks-status`), Print Overview
  still makes its one-page PDF, Open as a Board still opens the fit on TEMPLATE with no blank.
- b12 (desktop): Open as a Board after the suggestions show still opens with no blank picked (ROCKER's BLANK button reads as it
  does for a board with none).
`e2e/board-file.spec.ts` f1 fails on untouched code (known, not ours); everything else in both specs passes.

Pictures for the founder (in this task's `pictures/`, looked at one by one before the commit): with a scratch shoot script under
the scratchpad's `gwo/` (adapt `et0/shoot`), load each of the four AkuShaper files from `~/Downloads` into the 3117 home page:
`suggest-desktop-{egg,round-tail,squash-flyer,noserider}.png` (preview body scrolled to the block), one Metric
(`suggest-desktop-noserider-metric.png`), one iPhone 14 (`suggest-phone-egg.png`), and the printed overviews
`overview-{egg,round-tail,squash-flyer,noserider}.pdf` each with a rendered `.pdf.png`. Read each PDF back with pypdf: one page,
595.28 x 792 pt, holding SUGGESTED BLANKS. Check the figures on the pictures against the plan's measured table (they should
match within the display rounding). The AkuShaper files and their text are never copied into the repo.
  </action>
  <verify>
    <automated>npx vitest run components/template/build-brd-overview-pdf.test.ts lib/geometry/brd-blank-suggest.test.ts lib/export && npx tsc --noEmit && npm run lint && PW_PORT=3117 npx playwright test e2e/brd-fit-preview.spec.ts</automated>
  </verify>
  <done>The overview prints one page with the block in both systems at every Height; b10–b12 pass on their projects and every older test in the spec still passes; board-file.spec.ts passes apart from the known f1; the pictures and PDFs are in pictures/ and were looked at; SUMMARY records the browser times, the four files' suggestions and every call from "Changes to the brief". Commit 3, plain English, e.g. "The printed board-file overview carries the suggested blanks too; browser tests on a computer and both phones, and pictures of the four AkuShaper boards' suggestions". Do not commit the PLAN or BRIEF (the orchestrator does).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser -> GET /api/blank-catalog | public, no input read; answers the owner-less catalogue |
| server -> Neon (or the committed CSVs in the browser suite) | the existing read-only `loadPickableBlanks` |
| route answer -> the preview's maths | JSON from our own server, checked again in the browser |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-gwo-01 | Information disclosure | app/api/blank-catalog/route.ts | low | accept | The catalogue is public data ROCKER already streams to any visitor; no account data, no request data read |
| T-gwo-02 | Tampering | brd-blank-suggestions.tsx catalogue read | low | mitigate | Every record kept only if `isWellFormedBlankRecord` and `isPickable`; anything else reads as "didn't load" |
| T-gwo-03 | Denial of service | the route | low | accept | One read per preview per visit (cached in the page), the same cost as one ROCKER visit |
| T-gwo-04 | Information disclosure | the .brd file | medium | mitigate | The fetch is a bare GET with no body or query; the file and its lines never leave the browser (b10 checks the one request) |
| T-gwo-05 | Tampering | blank names in the block and the PDF | low | mitigate | Painted as React text and jsPDF text only; never HTML |
</threat_model>

<verification>
- All three tasks' automated checks pass; `npx tsc --noEmit` and `npm run lint` clean (the one known old warning aside).
- `git status` after commit 3 shows only the PLAN and BRIEF untracked; no AkuShaper file or text in the repo.
- No database migration, nothing pushed, the 3117 dev server untouched.
</verification>

<success_criteria>
A shaper who opens an AkuShaper `.brd` sees, under the ROCKER table, one named blank per maker they show, how close its rocker
gets and where, the four station differences, and where it helps the Customize Rocker order and how close that gets; the
printed overview carries the same; nothing is picked for them; a catalogue that cannot load costs one quiet line.
</success_criteria>

<output>
Create `.planning/quick/261113-gwo-the-brd-preview-suggests-a-blank-from-ea/261113-gwo-SUMMARY.md` when done (plain English;
the suggestions per file as shown on screen; the browser times; every call in "Changes to the brief" flagged for the founder).
</output>
