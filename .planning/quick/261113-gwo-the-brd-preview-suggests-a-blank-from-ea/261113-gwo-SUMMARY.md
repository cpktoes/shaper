---
phase: quick-261113-gwo
plan: 01
subsystem: board-file-preview
tags: [brd, blank-suggestion, customize-rocker, print-overview, route-handler]
requires:
  - quick-261113-d9b (closest-fit preview)
  - quick-261113-et0 (tables, Print Overview, Open as a Board)
provides:
  - "SUGGESTED BLANKS block in the .brd preview and on the one-page overview"
  - "GET /api/blank-catalog (public, read-only)"
affects:
  - quick-261113-gwr (bottom contours, built next in the same dialog and PDF builder)
key-files:
  created:
    - lib/geometry/brd-blank-suggest.ts
    - lib/geometry/brd-blank-suggest.test.ts
    - lib/export/brd-blank-words.ts
    - lib/export/brd-blank-words.test.ts
    - app/api/blank-catalog/route.ts
    - lib/blank-catalog-route.test.ts
    - components/setup/brd-blank-suggestions.tsx
  modified:
    - lib/export/brd-fit-preview.ts
    - components/setup/brd-fit-dialog.tsx
    - components/template/build-brd-overview-pdf.ts
    - components/template/build-brd-overview-pdf.test.ts
    - e2e/brd-fit-preview.spec.ts
decisions:
  - "The blank is chosen by its own (natural) rocker; the Customize Rocker order is worked out afterwards for that blank only"
  - "One Customize Rocker change per end, smallest amount within 1/32 inch of the end's best, shown only when at least 1/16 inch closer"
  - "Route Handler (GET), not a Server Action, for the catalogue read"
status: complete
actuals:
  tasks: 3
  commits: 4
---

# Quick 261113-gwo: the board-file preview suggests a blank from each maker

Open a `.brd` and, under the ROCKER table, a SUGGESTED BLANKS block now names one blank from each blank maker the shaper shows:
how close its rocker gets to the file's and where, how much more or less rocker it has at the nose tip, nose 12", tail 12" and
tail tip, and, where one Customize Rocker change at each end brings it at least 1/16" closer, the maker's order code and how
close that gets. The same words print on the one-page overview, which is still one page. Nothing is picked for the shaper:
Open as a Board still opens with no blank, and Close still changes nothing.

## What a shaper sees, per file

The suggested blank per maker, as shown on screen (Imperial, the out-of-the-box Pin deck Tip Style and default fit rules).
"Its own rocker" is the widest gap between the blank's rocker under the board and the file's, from 1 inch in at each tip;
"With Customize Rocker" is the order and how close the really bent blank then gets ("-" means no single change per end
brings it 1/16" closer, so no line is shown). The figures are what the screen shows rounded to 1/16"; the measured value is
beside it.

| File | Maker | Suggested blank | Its own rocker: widest gap (where) | With Customize Rocker |
|------|-------|-----------------|------------------------------------|-----------------------|
| 6'10 Egg | US Blanks | 7'6"EAX | within 3/8" (0.396"), 1" from the tail | +1/8"N +7/16"T: within 3/16" (0.165") |
| | Arctic Foam | 7'9" SBF | within 7/16" (0.409"), 1" from the tail | -1/4"N +9/16"T39": within 1/16" (0.048") |
| | Marko Foam | 7'5" Machine All | within 1/4" (0.275"), 11 1/4" from the nose | - |
| | Millennium Foam | 7'5"HS | within 1/4" (0.255"), 1" from the nose | -1/8"N27" +3/16"T: within 3/16" (0.169") |
| 6'2 Round Tail | US Blanks | 6'5"R | within 3/16" (0.182"), 8 11/16" from the tail | +1/16"N +1/8"T: within 1/8" (0.117") |
| | Arctic Foam | 6'8" SBF | within 3/16" (0.168"), 1 1/8" from the tail | -1/16"N -1/8"T: within 1/16" (0.071") |
| | Marko Foam | 6'9" Regular | within 7/16" (0.412"), 1 1/8" from the nose | -7/16"N18" -1/8"T27": within 3/16" (0.203") |
| | Millennium Foam | 7'1"DG | within 1/4" (0.241"), 1 1/8" from the tail | -7/16"T21": within 1/8" (0.108") |
| Fryer 5'7 | US Blanks | 6'7"P | within 5/16" (0.343"), 6 3/8" from the tail | - |
| | Arctic Foam | 6'4" SBM | within 3/16" (0.203"), 17 9/16" from the nose | - |
| | Marko Foam | 6'4" TP | within 7/16" (0.438"), 9 3/8" from the tail | -7/16"N +1/2"T: within 1/4" (0.252") |
| | Millennium Foam | 6'6"DG | within 1/4" (0.227"), 7 7/8" from the tail | - |
| Scoop Noserider | US Blanks | 9'9"B | within 1/2" (0.477"), 4 11/16" from the nose | -7/16"N +5/16"T: within 3/16" (0.178") |
| | Arctic Foam | 9'9" LB | within 5/8" (0.639"), 6 5/16" from the tail | -3/8"N +3/4"T: within 1/8" (0.152") |
| | Marko Foam | 10'0" MK | within 7/8" (0.875"), 1 15/16" from the nose | -1"N +15/16"T: within 1/4" (0.256") |
| | Millennium Foam | 9'9"P | within 3/8" (0.346"), 4 1/8" from the tail | +7/16"T: within 1/8" (0.103") |

Every maker had a blank this board fits in for all four files, so no "no blank this board fits in" line shows on any of them.
The measured values match the planner's table to three decimals except one cell (see Deviations, call 2).

**The honest headline, for the founder:** the brief hoped for a blank that gets the rocker "very close". With the default
Pin deck, no stock blank comes within 1/8" of any of these four files (3/16" to 7/8" at worst), mostly because Pin deck takes
the tip thinning off the bottom and lifts the board's tip rocker near the tips. One Customize Rocker change at each end brings
most of them to about 1/8"-1/4" and the best to about 1/16". The block says the true figures; it does not flatter them.

## Real browser timings

Dev server on port 3117 (an unminified development build, on a machine that was also running the unit suite), from the file
being chosen to all four makers showing: the preview itself appears at once and the block reads "Looking for blanks…" first.

- b10, first full spec run: computer 675 ms, iPhone 698 ms, Android 2996 ms.
- b10 repeated three times: iPhone 1078 / 751 / 1059 ms, Android 1155 / 1519 / 1067 ms, computer 2896 / 3602 / 3406 ms (the
  machine was busy with the full unit suite at the time; the first computer run, quiet, was 675 ms).
- Picture script, quiet machine, computer: egg 668 ms, round tail 948 ms, squash flyer 872 ms, noserider 943 ms (Metric 965 ms);
  iPhone 14: 1042 ms.
- Longest single blocked stretch of the browser's main thread while a file was opened (long-task observer, computer): egg
  602 ms, round tail 300 ms, squash flyer 252 ms, noserider 352 ms; the earlier 90-255 ms stretches in each run are the file
  being fitted and the dialog drawn, which were there before this task. The last one is most likely the catalogue being
  prepared and searched; I did not separate the two inside the browser.
- In plain Node (warm): preparing all 219 blanks 39 ms; the whole suggestion for one file 71-201 ms.
- The test fails over 5 s; nothing came near it.

## What was built

1. **The maths, in `lib/`, tested (commit a8628817).** `lib/geometry/brd-blank-suggest.ts`: the board is built the way ROCKER's
   blank list judges a board with no blank picked, the app's own `listBlanks` judges the whole catalogue with the shaper's own
   Extra Length, Planer Max Depth, Width Margin, Deck Skin and Tip Style, and each fitting blank is laid on at the verdict's own
   placement (where Pick a Blank would put it). The widest gap is measured as lift off each line's own centre on the 400-step
   grid the fit already uses, the last inch at each tip left out. `bendsToward` finds one Customize Rocker change per end by a
   straight-line model and then checks the winner on the really bent blank. `lib/export/brd-blank-words.ts` words it all once
   for the screen and the paper, in the shaper's system (marks in whole mm, where in cm, the order code always in inches).
   `gapWhere` and `lessThan` are now exported from `brd-fit-preview.ts` so those two rules stay one rule each.
2. **The catalogue route and the block (commit c1ae95f5).** A public, read-only `GET /api/blank-catalog` returns the same
   never-rejecting loader's answer ROCKER already streams. `components/setup/brd-blank-suggestions.tsx` fetches it only when a
   preview mounts, once per page visit, prepares the blanks once, runs the search one tick after the "Looking for blanks…" line
   has painted, and keeps only well-formed pickable records. One block in the dialog.
3. **The paper, browser proof and pictures (commit 8dcc2f56).** One block in the PDF builder; the dialog passes the block when it is
   ready (or the quiet line), and leaves it off if the shaper prints while it is still looking.

## Tests

- Round trip (the test the brief asked for): each preset shaped in its own blank, written by the app's own `.brd` writer, read
  back and fitted. US Blanks' suggestion is the preset's own blank every time: Shortboard 6'3"RP, Fish 5'10"RP, Midlength
  7'4"SP, Longboard 9'3"Y, each well inside its gap limit; no bends for the first three.
- Every pick fits at the placement it names; every pick is its maker's closest (brute force over the fitting list); a maker
  with nothing that fits gets no pick, with one entry per maker in order; a known Customize Rocker order is found, stays inside
  Customize Rocker's own limits, and `largest` equals a fresh measurement of the bent blank.
- Words in both systems, loading and "didn't load".
- Route: 200 and a well-formed catalogue with the CSV source; passes the loader's `unavailable` through untouched as a 200.
- PDF: four boards x Imperial/Metric x Height 1, 2, 4, 8, each with the longest four-maker block (every maker with a
  Customize Rocker line), one page; a board with both tips coming to a point at Height x8 in both systems, one page; absent,
  null or loading leaves the page byte-for-byte as it was (creation time and id aside); the quiet line prints.
- Browser: b10 (computer, iPhone, Android), b11 and b12 (computer).

## Deviations from Plan

### The planner's eight departures from the brief (flagged for the founder)

1. **Placement is the verdict's own** (where Pick a Blank would land the board), not a rocker-seeking slide, so the figures are
   exactly what ROCKER shows after the pick. One egg pick sits 1 3/16" toward the tail; the words do not mention placement.
2. **Tip Style and the fit rules are the shaper's own live App Default Settings**, as the brief says; they change which blank
   wins (under Tip Style Bottom the picks change, for example the Fryer's Millennium pick).
3. **Customize Rocker: one change per end**, smallest amount within 1/32" of that end's best, shown only when at least 1/16"
   closer; worked out for the suggested blank only (choosing the blank by its bent result picks absurd blanks).
4. **Makers the shaper has switched off** in BLANK MAKERS are left out, because Pick a Blank would not show their blanks.
5. **Route Handler, not a Server Action**, for the read (Next's own guidance in this version). No database change, no migration.
6. **On paper:** the block prints when the suggestions are ready; if the catalogue did not load the quiet line prints; if the
   shaper prints before they are ready, the block is left off the page.
7. **"Very close" is not what the stock catalogue gives these four files** under Pin deck (3/16" to 7/8"); the words quote the
   true figures. Tracer-first was not used: the maths was measured end to end by the planner, so the order was lib, screen, paper.
8. **Two small exports** in `lib/export/brd-fit-preview.ts` (`gapWhere`, `lessThan`); everything else is in new files, so
   quick 261113-gwr meets one block in the dialog and one in the PDF builder.

### My own calls

**1. [Rule 3 - small addition] A `status` on the block's words.** The dialog and the paper both need to tell the quiet lines
(looking, didn't load) from the real block, and the PDF builder must leave the block off while it is still looking. Rather
than sniff the copy, `BrdBlankWords` carries `status: "loading" | "unavailable" | "ready"` beside the plan's caption, intro and
lines. Commit a8628817 and c1ae95f5 (added with the component).

**2. [Tie rule, one cell differs from the planner's table] Whole steps, not accumulated sums.** The plan says the bend amounts
are whole multiples of 1/16", never an accumulated sum, and ties go to the smallest amount, then the centre start. The planner's
scratch script added 1/16" repeatedly, so equal amounts differed by a float hair and the tie went the wrong way in one place.
Mine compares whole steps. The one cell that moves: 6'2 Round Tail, US Blanks 6'5"R, tail change `+1/8"T` from the centre
(0.117") instead of `+1/8"T37"` (0.119"). Every other cell equals the planner's table to three decimals.

**3. [Process] The new unit tests passed on their first run.** I wrote both test files before the code, but did not run them
red first (their imports could not resolve before the modules existed, which is a trivial red). They pass, and every figure
they check is read from the app's own functions.

**4. [Layout] The Customize Rocker line is indented a little on screen** (to show it belongs to the blank above it) and is a
plain body line on paper, as the plan said ("every line of every maker as a body item").

**5. [Extra checks] b10 also re-opens the preview in the same visit and checks there is still one request; b11 also checks
that a failed catalogue is not remembered (a later look succeeds) and that an aborted request reads the same quiet line.**

**6. [Skipped, as told] No `next build`**, because the founder's dev server is on this checkout. No whole-suite run of the
browser tests; only `e2e/brd-fit-preview.spec.ts` (all three projects), `e2e/board-file.spec.ts` and the picture scripts.

## Verification

- Unit: the touched suites (`brd-blank-suggest` 17, `brd-blank-words`, `brd-fit-preview`, `brd-fit`, `custom-rocker`,
  `units-isolation`: 400 tests across six files; `lib/export` + route + suggest: 379 across ten files; `build-brd-overview-pdf`
  75) pass. The whole `vitest run` (13,129 tests, 224 files, on a machine at load average 30-40): 13,120 passed, 7 failed, all
  on the default five-second limit. Six were in files this task did not touch (`design-snapshot`, `surface-report`,
  `blank-fit` x2, `board-surface-render`, `round-tip`) and pass when run again (449 of 449 across those five files). The
  seventh was mine, the longboard round-trip case (writing a board as a .brd and fitting it is slow), at 5.09 s; it now has a
  60 s limit (a fourth, small commit, 9d16b45d).
- `npx tsc --noEmit` clean; `npm run lint` clean apart from the one old warning in `lib/db/import-designs-action.test.ts`.
- Browser (port 3117): `e2e/brd-fit-preview.spec.ts` 22 passed, 14 skipped (the computer-only tests on the phone profiles, as
  before), 0 failed. `e2e/board-file.spec.ts` 21 passed, 3 failed: test f1 on all three profiles, the known last-digit
  difference (`1917.6999999999998` against `1917.7`), on untouched code.
- The route answers signed out: 200 and the catalogue (curl against 3117, with Clerk reporting `signed-out`); `proxy.ts` runs
  Clerk on `/api` with no `.protect()`, and `lib/auth` open-access tests still pass.

## Pictures

In `pictures/`, each looked at one by one:

- `suggest-desktop-egg.png`, `suggest-desktop-round-tail.png`, `suggest-desktop-squash-flyer.png`, `suggest-desktop-noserider.png`,
  `suggest-desktop-noserider-metric.png` (the block scrolled into view on a computer; every line fully readable, nothing clipped,
  the footer buttons in view).
- `suggest-phone-egg.png` (iPhone 14, upright): the block wraps cleanly, the intro and four makers all readable, the three
  footer buttons in view.
- `overview-egg.pdf`, `overview-round-tail.pdf`, `overview-squash-flyer.pdf`, `overview-noserider.pdf`,
  `overview-noserider-metric.pdf`, each with a `.pdf.png` picture of the page. Read back with pypdf: one page, 595.28 x 792 pt,
  holding SUGGESTED BLANKS, all four maker names and the file's name. The egg (two point notes, the tightest page) still fits.
- The figures on every picture match the table above within display rounding. The AkuShaper files themselves, and their text,
  are not in the repo; only these pictures and printed overviews are.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register: the one new surface is `GET /api/blank-catalog`, which is the plan's T-gwo-01/03 (public
catalogue, no request read, no identity). Every record is checked again in the browser (`isWellFormedBlankRecord`,
`isPickable`), names are painted as text only, and the bare GET carries nothing from the file (b10 checks the one request).

## Self-Check: PASSED

All created files exist; the four commits are on `close-bottom-17` (a8628817, c1ae95f5, 8dcc2f56, and the small timing fix 9d16b45d); the pictures and PDFs are in `pictures/`.
