---
phase: 17-bottom-contours
plan: 15
subsystem: printed-pages
status: checkpoint
tags: [bottom, contours, print, order-form, overview-sheet, letter, a4, metric]
requires:
  - 17-01..17-07 (the bottom's maths, its drawings and DATA's two tables)
  - 17-08..17-11 (the BOTTOM screen, its GUIDE and the How to shape words the page prints)
  - 17-14 (BOTTOM on phones, merged on the founder's approval as 2ff93db7)
provides:
  - the Overview Sheet's `Bottom:` lines — one line of words per cut under the template's own figures, in the shaper's system
  - the order form's BOTTOM CONTOURS page — the bottom from above, a section at each cut, DATA's two tables and a How to shape note per cut — printed only when the bottom has a cut
  - a second sheet, Bottom Contours · Tables, for a bottom whose cuts fill the page, so the tables print whole and nothing is dropped
  - page marks that count themselves — two sheets for a flat board, up to five with a full bottom and the Rail Band Instructions
  - proof that a flat board's printed pages, the Full Sized Template and the Paper Saver did not move
affects:
  - components/summary/order-form.tsx (the stack of sheets, the page marks, the sentence under the print buttons)
  - app/design/summary/order-form.css (the new page's type on a phone's print sheet)
  - components/template/build-overview-pdf.ts (the `Bottom:` lines and the room they need)
  - lib/units-isolation.test.ts (the ledger of print files learns the two new ones)
tech-stack:
  added: []
  patterns:
    - a print-only words helper beside the maths (lib/geometry/bottom-print.ts) so the Overview Sheet and the order form say a cut the same way
    - a fit rule that counts a page's parts before anything is drawn and decides one sheet or two, tested against every stock board
    - print truth read back from the PDF itself — page count, page marks and each part's words — never from a picture of the screen
    - ink that must print is a line or a filled shape in the drawing, never a background colour
key-files:
  created:
    - lib/geometry/bottom-print.ts
    - lib/geometry/bottom-print.test.ts
    - components/summary/bottom-contours-sheet.tsx
    - components/summary/bottom-sheet-fit.ts
    - components/summary/bottom-sheet-fit.test.ts
    - e2e/summary-bottom-page.spec.ts
    - e2e/helpers/bottom-print.ts
    - .planning/phases/17-bottom-contours/pictures/17-15-paper.png
    - .planning/phases/17-bottom-contours/pictures/17-15-paper-page.png
    - .planning/phases/17-bottom-contours/pictures/17-15-pictures-source.tar.gz
    - .planning/phases/17-bottom-contours/pictures/17-15-paper-small-depth.png
  modified:
    - components/summary/order-form.tsx
    - components/summary/order-form-print.test.ts
    - app/design/summary/order-form.css
    - components/template/build-overview-pdf.ts
    - components/template/build-overview-pdf.test.ts
    - components/template/export-preview-dialog.tsx
    - lib/geometry/bottom-source.test.ts
    - lib/units-isolation.test.ts
    - e2e/summary-planing.spec.ts
    - .planning/phases/17-bottom-contours/deferred-items.md
    - lib/geometry/units.ts
    - lib/geometry/units.test.ts
    - lib/geometry/measure-display.ts
    - lib/geometry/measure-display.test.ts
    - components/bottom/bottom-copy.ts
    - components/bottom/bottom-copy.test.ts
    - components/bottom/bottom-data.tsx
    - components/bottom/bottom-controls.tsx
    - e2e/bottom-metric.spec.ts
    - e2e/bottom-viewer.spec.ts
decisions:
  - The BOTTOM CONTOURS page falls third, after the double-sided pair and before the Rail Band Instructions, which stay last
  - When the picture, the sections, the tables and the notes cannot share one sheet, the two tables move whole to a sheet of their own — never shrunk, never cut short
  - The two tables sit side by side where they fit (six mark columns or fewer) rather than each at full width, so a Shortboard's whole bottom is one sheet
  - A section's height label (Height ×4) is written in the picture's top-left corner, where the screen writes it, because the longest cut names fill the caption row on their own
  - A straightedge reading with no clear place inside a small section moves beside its own tick, and every reading is repeated in words under the picture
  - No floor-warning ink on paper — the page prints what will be cut, and the warnings stay on the screen
  - On a phone's print sheet the page's type follows the sheet's width at 0.92 of the form's own scale, measured against page 2's own design width
  - A depth that is there never reads as a nought — under half a step of the tape it reads <1/16" (Metric <1 mm); under a quarter of a millimetre nothing is cut and the cell is still the dash (the founder, 2026-11-10)
  - DATA on the screen and the printed page draw their depth cells with one shared function, so they cannot drift
metrics:
  started: 2026-11-10T06:51:42Z
  reached_checkpoint: 2026-11-10T10:57:09Z
  duration: about 4 h 05 min on the clock, much of it waiting on a machine other sessions had under heavy load
  tasks_completed: 2 of 3 (the third is the founder's look)
  commits: 3 before this summary
  files_changed: 19 (16 of code and tests, 3 pictures and their source)
  after_the_look: 2026-11-10T16:35:43Z — one fix on the founder's word, 14 more files of code and tests, one new picture
actuals:
  tokens: 55600   # chars/4 over the realized diff of code and tests: 177,947 characters to the checkpoint, 44,405 more for the fix after the founder's look; pictures not counted
  tasks: 2
  commits: 6      # two task commits, the pictures, this summary; then the fix and its pictures and notes
---

# Phase 17 Plan 15: The Printed Bottom Summary

A board with a cut in its bottom now prints it: one line of words per cut on the Overview Sheet, and a new BOTTOM
CONTOURS page on the order form with the bottom seen from above, a cross-section at each cut, the depths and layout
marks, and how to shape it. A flat board prints exactly as it did before.

## What changes for the founder

**The Overview Sheet.** Under the template's own figures a board with cuts now carries a `Bottom:` head and one line
per cut, in the system the shaper picked:

- Imperial: `Center: Deep Single Concave` / `1/4", 58" to 4" from the tail, deepest 23 1/2"; 2" off the rail.` and
  `Channels: 6 at 1 3/4", 5/16" deep, 23" to 0" from the tail, deepest 11"; Parallel, outer pair longest, 2" stagger.`
- Metric: `6 mm, 147.3 to 10.2 cm from the tail, deepest 59.7 cm; 51 mm off the rail.` and
  `Channels: 6 at 44 mm, 8 mm deep, 58.4 to 0.0 cm from the tail, deepest 27.9 cm; Parallel, outer pair longest, 5.1 cm stagger.`

The drawing beside the words is untouched, and a flat board's sheet has no `Bottom:` head at all.

**The order form's new page.** A board with a cut prints a third page, BOTTOM CONTOURS, after the double-sided pair.
Top to bottom it reads:

1. **The bottom from above**, nose left, full width, with the wide point, the front fins, and each cut's Start,
   Deepest and End taped off the nearest tip.
2. **A cross-section at each cut's deepest station**, up to four, two across, drawn four times taller than life and
   labelled `HEIGHT ×4`, with its straightedge readings. Each box is headed by the cut's name
   (`Center: Deep Single Concave`) and repeats its stations and readings in words underneath.
3. **DATA's two tables** — Depths Under a Straightedge and Layout Marks off the stringer — every row.
4. **A How to shape note for each cut**, word for word as the GUIDE has it.

The page carries the same strip as page 2 — the logo, the board's name and its four numbers — because it comes off
the printer as a loose sheet and gets carried to the blank on its own.

**When it does not all fit.** A bottom with three or more cuts, and most Longboards, cannot put the picture, the
sections, both tables and the notes on one sheet. Then the two tables print whole on the next sheet, headed
`Bottom Contours · Tables`, with DATA's notes on reading them. Nothing is dropped and nothing is shrunk to fit.

**The pages count themselves.** Two for a flat board as always; one or two more for a bottom with a cut; one more for
the Rail Band Instructions when ticked, which stay last. Every page mark agrees (`Page 3 of 4`), and the sentence
under the print buttons says what will come out (`Two portrait pages, printed double-sided — plus a Bottom Contours
page and a Rail Band Instructions page.`). A flat board's two sentences are the old ones, word for word.

**What did not change.** A flat board's order form, the Full Sized Template, the Paper Saver, the BOTTOM screen, the
litres and every saved board. No database change.

## Tasks

| Task | What it did | Commit |
| ---- | ----------- | ------ |
| 1 | The Overview Sheet lists each bottom cut in one line; the full-size template stays a template | `04a89279` |
| 2 | The order form gains a BOTTOM CONTOURS page, only when the bottom has a cut | `f4f42e1b` |
| — | Pictures of the printed pages for the founder's look | `28101cee` |
| 3 | The founder's look | pending |

## Verification

### Checks on the code

| Check | Result |
| ----- | ------ |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0, one warning that was there before (`lib/db/import-designs-action.test.ts`, an unused name) |
| `npx vitest run components/summary` | 6 files, 319 passed, 3.56 s, exit 0 |
| `npm test` (every unit test) | 191 files, 11,768 passed, 2 skipped, 364.72 s, exit 0 |
| `grep -c "bottomHasCut" components/summary/order-form.tsx` | 2 (the plan asks for at least 1) |
| `components/summary/bottom-contours-sheet.tsx` exists and exports `BottomContoursSheet` | yes |

The first full `npm test` of Task 2 failed one test, and it was right to: `lib/units-isolation.test.ts` keeps a list
of every print file that reads the unit rules, and my two new files were not on it (1 failed, 11,767 passed, 391.46 s,
exit 1). Both files read every number through the display boundary and call none of the banned formatters, so they
were added to the list as converted, and the run above is the one after that.

Task 1's own run, before Task 2 began: `npm test` 190 files, 11,502 passed, 2 skipped, 336.24 s, exit 0.

### The printed pages, read back from the PDFs

Printed with headless Chrome from this plan's own build on port 3315, backgrounds off as a printer does, and read
back with pypdf. Nine order forms in the final batch, printed after the last change to the page:

| Board | Paper | Pages | Page marks | What page 3 holds | What page 4 holds |
| ----- | ----- | ----- | ---------- | ----------------- | ----------------- |
| Shortboard, Deep Single Concave + 6 channels | Letter (612 × 792) | 3 | Page 1–3 of 3 | caption, sections, readings, both tables, notes | — |
| the same | A4 (595.9 × 842.9) | 3 | Page 1–3 of 3 | the same | — |
| the same, Metric | Letter | 3 | Page 1–3 of 3 | the same, in mm and cm | — |
| the same, Rail Band Instructions ticked | Letter | 4 | Page 1–4 of 4 | the same | the Rail Band sheet |
| Longboard, its three opening cuts | Letter | 4 | Page 1–4 of 4 | caption, sections, readings, notes | caption, both tables |
| Shortboard, every section cut + 8 channels | Letter | 4 | Page 1–4 of 4 | caption, sections, readings, notes | caption, both tables |
| Longboard, every section cut + 8 channels | Letter | 4 | Page 1–4 of 4 | the same | the same |
| Fish, every section cut + 8 channels | Letter | 4 | Page 1–4 of 4 | the same | the same |
| Longboard, every cut + 8 channels, Metric | A4 | 4 | Page 1–4 of 4 | the same | the same (19 rows, 11 mark columns) |

No PDF has a blank extra page, and none has a part clipped or pushed off its sheet.

The Overview Sheet (Task 1): every PDF is one page; the flat Shortboard has no `Bottom:` head; the lines read as
quoted above in both systems. The Full Sized Template and the Paper Saver were built for boards with cuts and for
the same boards flat: 40 sheets compared, 0 different.

### A flat board, before and after

A flat Shortboard's order form was captured before the first edit to the order form and again after the last change
to the page — its markup, the position of every box, and its PDF on both papers, with and without the Rail Band
Instructions.

**Result: identical.** Markup and boxes match to the byte (unticked markup `83aa6b1f7ba1afe8`, boxes
`afbb514841da6d4b`; ticked markup `f07caf9d693fb411`, boxes `acd28a1c65a29ff0`). The PDFs are 2 pages unticked and 3
ticked on Letter (612 × 792) and A4 (595.92 × 842.88), their words identical, their marks still
`CUSTOM SURFBOARD ORDER … Page 1 of 2`, `SHAPER REFERENCE … Page 2 of 2`, and `RAIL BAND REFERENCE … Page 3 of 3`
when ticked.

The comparison was taken three times. The first, taken while the machine was under heavy load, differed — only in the
measured boxes of the drawings' lettering, with the markup and the PDF's words identical. That was the page being
measured before its typeface had loaded, not a change: the second take, alone, was identical, and so was the third,
after the last change to the page.

### Browser runs

All on port 3315 with webpack, one at a time. Other sessions had the machine under very heavy load for most of this
(a load average of 767 at its worst, about 450 an hour later, 15–70 by the end), and the runs below are given in the
order they happened, failures included.

| Spec | Projects | Passed | Failed | Skipped | Time | Exit | Note |
| ---- | -------- | ------ | ------ | ------- | ---- | ---- | ---- |
| `e2e/desktop-baseline.spec.ts`, on the base commit before any edit | desktop | 6 | 0 | 0 | 1.2 m | 0 | ruling 3's proof that the baseline passes under webpack |
| `e2e/summary-bottom-page.spec.ts`, first run | all three | 5 | 4 | 6 | 11.4 m | 1 | four phone page-load timeouts, under load |
| the same, phones alone | iphone, android | 2 | 2 | 6 | 4.4 m | 1 | two page-load timeouts; another job of mine was running beside it |
| **the same, final page** | all three | **9** | **0** | 6 | 4.7 m | **0** | |
| `e2e/summary-planing.spec.ts`, first run | all three | 16 | 16 | 28 | 16.4 m | 1 | load average about 767: eight timeouts in tests that were there before, and my eight new tests failing on a mistake in the test itself (below) |
| the new fit sweep alone, after the fix | desktop | 8 | 0 | 0 | 3.4 m | 0 | |
| **`e2e/summary-planing.spec.ts`, whole file again** | all three | **30** | **2** | 28 | 7.5 m | **1** | both failures are one older test (rail markings, both systems) running out of its 30 seconds mid-sweep |
| that older test alone, twice over (`--repeat-each=2`) | desktop | 4 | 0 | 0 | 1.6 m | 0 | passes when nothing runs beside it |
| `e2e/summary-rail-instructions-fit.spec.ts`, `summary-print-size.spec.ts`, `summary-print-touch-box.spec.ts` | all three | 18 | 0 | 18 | 2.1 m | 0 | |
| `e2e/desktop-baseline.spec.ts`, straight after the specs above | desktop | 4 | 2 | 0 | 1.3 m | 1 | FINS: 903 dots different, all in the drawing's four dimension numbers; 3D: ran out of 30 seconds waiting for the board to draw |
| **`e2e/desktop-baseline.spec.ts` alone, twice over** | desktop | **12** | **0** | 0 | 1.4 m | **0** | no baseline picture changed, none updated |

Three things in that table need saying plainly:

- **The mistake in my own test.** The new fit sweep measures the page at each phone width with the page told to
  behave as a screen in between, and it left the page that way before making its PDFs — so the PDFs were pictures of
  the screen, two pages instead of three or four. The page was never wrong: a PDF printed the ordinary way has exactly
  one page per sheet. The test now hands the choice back before it prints.
- **`summary-planing.spec.ts` has no single all-green run of the whole file.** Every test in it has passed on the
  final code — 30 in the whole-file run, and the remaining two (one older test in both systems) four times out of four
  alone. That older test sweeps eight widths inside a 30-second limit and ran out of time while the machine was busy.
  I did not change its limit; it is not mine and it passes alone.
- **The desktop baseline failed once before it passed twice.** FINS and 3D are screens this plan does not touch, the
  FINS difference was the lettering of four numbers (the same typeface-not-yet-loaded effect as the flat capture's
  first take), and the same code passed all six pictures twice in a row a minute later. No baseline was updated.

### Measured, for the founder

The fit sweep measures the new page on a computer's print and at every phone print width the other pages are swept
at (560 to 900 dots), for four boards in both systems. Every case: nothing clipped by its sheet, nothing clipped by
its box, the picture not squeezed, and the page clear of its page mark.

| Board | Computer print — clear of the page mark | Narrowest phone sheet (560 dots) — clear of the mark | Smallest type at 560 |
| ----- | ---- | ---- | ---- |
| Shortboard, Deep Single + 6 channels (one sheet, 14 rows a table) | 42.8 dots Imperial, 27.8 Metric | 37.3 Imperial, 36.2 Metric | 7.58 px |
| Longboard, a cut in every section (two sheets, 19 rows a table) | 172.3; tables' sheet 30.2 | 130.7; tables' sheet 52.8 | 7.58 px |
| Longboard, every section + 8 channels | 102.9 Imperial, 87.9 Metric; tables' sheet 66.2 | 83.2; tables' sheet 77.7 | 7.58 px |
| Fish, every section + 8 channels | 51.6 Imperial, 36.6 Metric; tables' sheet 208.1 | 44.5; tables' sheet 188.0 | 7.58 px |

On a computer's print the smallest type on the page is 12 px. On a phone's print sheet it follows the sheet: 7.58 px
at 560 dots, 8.74 at 618, 9.97 at 680, 11.03 at 733, 12.04 at 800. Those are dots on the phone's own sheet, which the
printer then scales up to the paper; the founder's own iPhone print is his check at go-live.

Which stock boards go to two sheets, by the fit rule: one sheet with the tables side by side for a Shortboard or Fish
with one or two cuts or channels alone, a Midlength with one or two section cuts or channels alone, and a Longboard
with a single section cut; two sheets for any board with three or more cuts, a Longboard with anything but one section
cut, and a Midlength with a section cut plus 6 channels.

## Deviations from Plan

### Followed a ruling instead of the plan

**1. The commit trailer.** The plan's environment note names an older trailer; every commit here ends with
`Co-Authored-By: Claude <noreply@anthropic.com>`, as ruling 5 says.

**2. One commit per task, not a failing-test commit then a passing one.** Task 1 is marked test-first. Ruling 5 asks for
one commit per task, so its tests were committed together with the code that passes them. See TDD Gate Compliance
below.

**3. A second picture.** Ruling 6 allows a second picture when one cannot hold the Letter page readable beside the
rest; `17-15-paper-page.png` is that page alone at full size.

### Files outside the plan's list

**4. [Rule 3 — needed to finish] `components/summary/bottom-sheet-fit.ts` and its test.** The plan puts the whole page
in one file. Deciding what a page can hold — one sheet or two, tables side by side or stacked, where a reading's
number goes — is arithmetic that has to be tested without a browser, so it lives in its own file with 265 tests over
a list of boards and bottoms in both systems, the longest board the app allows among them. Commit `f4f42e1b`.

**5. [Rule 3] `e2e/helpers/bottom-print.ts`.** The boards the two browser specs print (a Shortboard with a Deep Single
and 6 channels, the Longboard's cuts, the worst cases) are built once and shared, rather than written twice. Commit
`f4f42e1b`.

**6. [Rule 2 — a check that had to exist] `components/summary/order-form-print.test.ts`.** One new test pins the new
page's phone rule to page 2's own paper figures, so the stylesheet gains no inch or millimetre figure of its own.
Commit `f4f42e1b`.

**7. [Rule 1 — my own failing test] `lib/units-isolation.test.ts`.** The ledger of print files that read the unit rules
learns the two new files, both marked converted (they read through the display boundary and call no banned formatter).
The plan requires this test to pass and it could not without the two entries. Commit `f4f42e1b`.

**8. `.planning/phases/17-bottom-contours/deferred-items.md`.** Three things seen on the printed pages and left alone
(below) are added to the phase's list.

### Choices the plan left open, or that differ from the UI-SPEC — the founder's to change

**9. The two tables sit side by side where they fit.** The UI-SPEC draws them at full width, one above the other. Side
by side (six mark columns or fewer) is what lets a Shortboard's whole bottom print on one sheet; stacked, it would
always be two. Their headings take two lines (`From the / tail`) so both tables' rows line up across the page.

**10. `HEIGHT ×4` is written in each section's top-left corner, not beside the cut's name.** That is where the screen
writes it. The longest names (`Center: Continuous Belly / Rolled Mid`) fill a two-across box's caption row alone, and
the first version cut the label off.

**11. A reading's number goes where there is room.** In a small two-across section two readings can land on top of each
other (the Shortboard's Channels: `1/16"` and `3/8"`). A number with no clear place moves beside its own tick as the
number alone; if even that has no room it is left to the words under the picture, which always carry every reading.

**12. Paired section boxes are 100 dots high; a section alone on its row is 120.** The sizes are mine, and
the fit rule's answers above are counted at these heights. Every section in the pictures drew at four times life; the
shared drawing rule labels whatever height it used, so a cut too deep for its box would say so rather than be cut off.

**13. The picture of the bottom from above has its empty head room cropped,** so a full-width picture costs the page
less height than it does on the screen.

**14. DATA's notes on reading the tables print only on the tables' own sheet,** and only as many as fit under the
tables. On the Longboard with every cut and 8 channels, nineteen rows under eleven columns leave room for one of the
three. On a one-sheet page the room goes to the How to shape notes instead.

**15. No floor-warning ink on paper.** The screen's red warnings (a cut reaching the rail's or the stringer's floor) are
not printed. The page prints what will be cut.

**16. How to shape notes run in:** the cut's name in bold, then the words, one paragraph a cut — not a heading and a
paragraph each, which cost a line per cut.

**17. The tables' own sheet is titled `Bottom Contours · Tables`,** and the sentence under the print buttons says `a
Bottom Contours page` or `two Bottom Contours pages`.

**18. On a phone's print sheet the page's type is 0.92 of the form's own scale** and follows the sheet's width with no
12 px floor — the same repair page 2 already has, for the same reason. The 4 dots of spare the fit rule keeps come out
of the picture, the one part that can give way without losing a number.

**19. Task 1: the natural-outline note prints under a narrower condition than the plan words it.** It appears only when
the wing rule is Natural and that rule actually changes a measured line, so a board without wings is never told about
them.

### Raised for the founder — a plan figure that measured differently (ruling 8)

**20. The Overview Sheet's fullest list does not fit at its usual line spacing.** The plan assumes the `Bottom:` lines
fit under the existing figures. Measured, the fullest list needs 48 or 49 rows, which at 5 mm a row runs past US
Letter's margin. Only such a list is drawn tighter, at about 4.84 mm a row; every shorter list, and every flat board,
keeps 5 mm exactly. A long line wraps without splitting a mixed fraction (`23 1/2"` stays whole).

### Seen while building, and left alone

Recorded in `deferred-items.md`; none is this plan's to fix.

- The Channels note says "deepest at the front fins" even on a single-fin Longboard. The page prints GUIDE's words
  verbatim; the words are the GUIDE's.
- On a crowded picture from above, a cut's DEEPEST label is left out when it has no room between START and END — the
  screen's own label rule. On paper the stations line under each section carries it.
- DATA's tables show a `0` in places in Metric. It is what DATA shows on the screen; the cause was not looked into.
  **Fixed after the founder's look** — see "After the founder's look" below.
- The Longboard's page 3 (three sections, three notes) leaves a wide empty band under the notes — 172 dots clear of
  the page mark — because its tables are on the next sheet.

## Deferred Issues

None from this plan's own work. The pre-existing lint warning and the items above are outside it (the `0` in DATA was
fixed after the founder's look).

## Known Stubs

None. Every number on the page comes from the board being printed.

## Threat Flags

None. The plan adds no network call, no sign-in path, no file access and no stored field; it changes what is drawn for
the printer from data the page already holds.

## TDD Gate Compliance

Task 1 is marked `tdd="true"`, and there is no separate `test(...)` commit before its `feat(...)` commit: ruling 5 asks
for one commit per task, so `04a89279` carries the tests and the code together, and the git history cannot show a red
run. The plan itself is `type: execute`, not `type: tdd`, so no plan-level gate applies.

## After the founder's look (2026-11-10)

The founder looked at the pictures and the eight things put to him, and approved all but one. His words:

> "4 lets say <1/16 if it's not actually 0. all else approved."

Item 4 was the `0"` in the depths table: where a cut is too shallow to read at 1/16", the table printed `0"`, and DATA
on the screen did the same. Items 1 to 3 and 5 to 8 stood as recommended. The founder's-look heading below is left as
it was; the coordinator stamps it at the merge.

### What was built

**A depth that is there never reads as a nought.** Where a cut thins out to a third or a half of a millimetre, it is
too small for a tape to read, but it is not nothing — and `0"` reads as "no cut here". Such a cell now says the cut is
under the tape's smallest step:

| The depth at that station | Imperial | Metric (the head says mm) |
| --- | --- | --- |
| under a quarter of a millimetre — nothing is cut | `—` | `—` |
| from there up to half a step of the tape | `<1/16"` (up to 1/32", about 0.79 mm) | `<1` (up to 0.5 mm) |
| half a step and up | the mark, as before (`1/16"`, `1/8"` …) | the mark, as before (`1`, `2` …) |

Where a mark carries its own unit, Metric reads `<1 mm`. The dash line is unchanged, and every figure a tape can read
prints exactly as it did.

- **One rule, in the units files.** `formatInchesFractionOrLess` and `formatWholeMmOrLess` in `lib/geometry/units.ts`,
  and over them `formatMarkOrLess` (`<1/16"` / `<1 mm`) and `formatMarkOrLessBare` (`<1/16"` / `<1`) in
  `lib/geometry/measure-display.ts`. The switch is decided by what the plain mark would print, not by a second copy of
  the rounding, so the two can never disagree at the boundary. `formatMarkBare` is untouched for every other caller.
- **One cell for the screen and the paper.** `bottomDepthCell` in `components/bottom/bottom-copy.ts` draws the Deepest
  cut and Rail lift cells for DATA (`components/bottom/bottom-data.tsx`) and for the printed page
  (`components/summary/bottom-contours-sheet.tsx`). Each file had its own copy of the rule before; now neither does.

### Where the same nought could appear, and where it could not

| Place a bottom depth is read out | Could it read `0"` for a real cut? | What was done |
| --- | --- | --- |
| DATA's Deepest cut and Rail lift cells | Yes — 121 cells in a scan of the four stock boards (every cut on its own, three full bottoms, each channel count; both systems counted). After the fix: none | Fixed (the shared cell) |
| The printed page's Deepest cut and Rail lift cells | Yes — the same rows | Fixed (the shared cell) |
| The Overview Sheet's `Bottom:` lines — a cut's depth, a Spiral Vee's vee lift, the channels' depth | Only from a board file made outside the app: the sliders step a whole sixteenth or a whole millimetre | Same rule applied (`lib/geometry/bottom-print.ts`), tested with a stand-in depth |
| The BOTTOM side panel's Depth and Vee Lift labels | Only from such a file, for the same reason | Same rule applied (`components/bottom/bottom-controls.tsx`) |
| A section's gauge readings, on screen and on paper, and the readings repeated in words under each section | No — a gauge that would read nothing is never drawn (D-13, `gaugeReads`) | Left |
| The phone's BOTTOM screen | No readout of its own — it shows the same DATA table and the same side panel | Covered by the rows above |
| Stringer left | It is a thickness, not a depth | Left, as told |
| The layout marks table (distances off the stringer) | Not on any stock board — none reads zero. In theory an Imperial mark between 0.5 and 0.79 mm off the stringer would read `0"`; that is a distance, and "on the stringer" is true to a sixteenth | Left; said here so it is known |
| `… to 0" from the tail` in a `Bottom:` line or a stations line | That is a true zero — the tail itself | Left |

### Checked

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean, exit 0 |
| `npm run lint` | 0 errors, the 1 warning that was there before (`lib/db/import-designs-action.test.ts`), exit 0 |
| `npm test` (the whole unit suite) | 191 files, 11,799 passed, 2 skipped, 0 failed, exit 0 |
| Browser specs on port 3315 — `summary-bottom-page`, `bottom-metric`, `bottom-viewer`, all three projects | 57 tests: 24 passed, 32 skipped (each test names the one project it is for), 1 failed on a page-load timeout, exit 1. That one (`bottom-viewer.spec.ts:189`, the Height test — not touched by this fix) re-run alone twice: 2 passed, exit 0 |
| A flat board's order form, against the capture taken before the plan's first edit | Identical — markup, every box, and the printed words and page counts on US Letter and A4, unticked and with the Rail Band Instructions ticked |
| The printed pages, read back from the PDFs | See below |

Two of those runs were first taken while the machine was under heavy load from other sessions (load average over 40),
and are said plainly here:

- The first whole-suite run had 8 tests time out at 5 seconds, in five files this fix does not touch (`blank-fit`,
  `surface-report`, `board-surface-render`, `rack-art`, `round-tip`). Those five files alone: 842 passed. The whole
  suite again once the print jobs and the server had stopped: the clean run in the table.
- The first flat-board capture, taken while the pages were being re-printed, differed in one file: the boxes of the
  ticked form's lettering, 106 of them a font's width apart, with the markup and the printed words identical — the
  drawing's lettering font had not finished loading when the boxes were measured. Taken again on its own: identical in
  every file.

**What the unit tests now pin** — 5 files, 370 tests in the targeted run: the new formatters in both systems; the
boundary at half a step (0.79 mm reads `<1/16"`, 1/32" reads `1/16"`; 0.49 mm reads `<1`, 0.5 mm reads `1`); an actual
zero still reads `0"` / `0`; float noise is nothing; the dash line unmoved at a quarter of a millimetre; a 0.7 mm cut
reads `<1/16"` in Imperial and `1` in Metric; and the four stock boards with every section cut and 8 channels have no
nought in a depth cell and do have less-than cells. The `Bottom:` lines are tested with a stand-in 0.4 mm depth, vee
lift and channel depth.

**What the browser tests now pin:** on the printed page, in both systems, no Deepest cut or Rail lift cell reads a bare
nought, and the Longboard's tables sheet prints `<1/16"` and still prints the dash; on DATA, in both systems, the
Longboard's depth cells equal the rule row for row, with a less-than cell and a dash both present.

**The printed pages, read back from the PDFs with pypdf** (depth cells between the two table headings):

| Printed sheet | Before | After |
| --- | --- | --- |
| Longboard, three opening cuts — tables sheet, US Letter | `0"` at 102" | `<1/16"` at 102"; no bare nought |
| Shortboard, every cut + 8 channels — tables sheet, US Letter | `0"` at 30" | `<1/16"` at 30"; no bare nought |
| Longboard, every cut + 8 channels — tables sheet, US Letter | `0"` at 48" and 102" | `<1/16"` at both; no bare nought |
| Longboard, every cut + 8 channels — tables sheet, A4, Metric | `0` at 121.9 and 259.1 cm | `<1` at both; no bare nought |
| Fish, every cut + 8 channels — tables sheet, US Letter | not printed before | `<1/16"` at 30"; no bare nought |
| Shortboard, Deep Single Concave + 6 channels — US Letter and Metric | no such cell | no such cell; unchanged |

Every re-printed form kept its page count, its page marks and its parts (four sheets for the two-sheet bottoms, three
for the Shortboard's one-sheet page).

### Pictures

- `.planning/phases/17-bottom-contours/pictures/17-15-paper.png` (2400 × 7851) — re-made with the three sheets whose
  tables changed: the Longboard's tables sheet in view (c), and the Shortboard's and the Longboard's worst-case tables
  sheets in view (e). Views (a), (b), (d), (f) and (g) and the Shortboard's Metric page had no such cell and are the
  same prints as before.
- `.planning/phases/17-bottom-contours/pictures/17-15-paper-small-depth.png` (1800 × 1534) — new: the depths table
  close up for the Longboard with every cut and 8 channels, on paper (a real print) beside DATA on the screen, in
  Imperial (`<1/16"` at 48" and 102") and in Metric (`<1` at 121.9 and 259.1 cm).
- `17-15-paper-page.png` is unchanged (its board has no such cell). `17-15-pictures-source.tar.gz` gains the scripts
  that re-printed, read back and composed these.

### Files this fix touched

Beyond the plan's own list, because the rule belongs with the units and with DATA's cell:

- `lib/geometry/units.ts`, `lib/geometry/units.test.ts`
- `lib/geometry/measure-display.ts`, `lib/geometry/measure-display.test.ts`
- `components/bottom/bottom-copy.ts`, `components/bottom/bottom-copy.test.ts`
- `components/bottom/bottom-data.tsx`, `components/bottom/bottom-controls.tsx`
- `e2e/bottom-metric.spec.ts`, `e2e/bottom-viewer.spec.ts`

And within it: `lib/geometry/bottom-print.ts`, `lib/geometry/bottom-print.test.ts`,
`components/summary/bottom-contours-sheet.tsx`, `e2e/summary-bottom-page.spec.ts`.

No database change, no stored field, nothing a saved board holds: only how a number is shown.

## Founder's look: Approved (2026-11-10)

The founder, on the checkpoint card with the picture: *"4 lets say <1/16 if it's not actually 0.  all else approved."* A depth that is there but too small for a tape now reads <1/16" (Metric <1 mm) on DATA and on paper, never 0; the tables side by side, the tables' own sheet for three or more cuts, the Overview Sheet's tighter fullest list and the rest stood as recommended. Held unmerged at his word until the GUIDE on every page (Phase 18) was live, then merged on 2026-11-10. Merged as a4db2688.

The pictures are real prints — PDFs printed from this plan's own build and rendered — not pictures of the screen.

- `.planning/phases/17-bottom-contours/pictures/17-15-paper.png` (2400 × 7851) — all seven views with captions:
  (a) the BOTTOM CONTOURS page on US Letter for the Shortboard with a Deep Single Concave and 6 channels;
  (b) the same page on A4 beside it;
  (c) the Longboard with its three opening cuts — two sheets — and the Shortboard's page in Metric;
  (e) the worst case, every section cut and 8 channels, and where the tables went;
  (d) the whole order form with the Rail Band Instructions ticked, `Page 1 of 4` to `Page 4 of 4`;
  (f) the Overview Sheet's `Bottom:` lines close up, Imperial and Metric;
  (g) a flat Shortboard's order form before and after.
- `.planning/phases/17-bottom-contours/pictures/17-15-paper-page.png` (1700 × 2200) — view (a) alone, large enough to
  read every number.
- `.planning/phases/17-bottom-contours/pictures/17-15-pictures-source.tar.gz` — the scripts that printed, read back
  and composed them.

What the plan asks the founder to check:

1. The page reads top to bottom: the bottom from above with its marks, a section at each cut's deepest station with
   the gauge readings, the two tables, the How to shape notes.
2. A flat board prints exactly as before; the Full Sized Template and the Paper Saver show no contour.
3. The page's dress is mine to propose (D-29) — change anything; folding it back into the double-sided sheet stays
   your later job.

Answer "approved", or say what to change.

## Self-Check: PASSED

- Every file under key-files exists on disk (checked by listing them).
- Commits `04a89279`, `f4f42e1b` and `28101cee` are on this branch (`git log`).
- The plan's commits changed 19 files and deleted none.
- STATE.md and ROADMAP.md were not touched.

After the founder's look (2026-11-10), checked again:

- The fix is commit `90cb899c` on this branch (`git log`); the pictures and this write-up follow it in a `docs(17-15)`
  commit of their own.
- `17-15-paper-small-depth.png` is on disk beside the re-made `17-15-paper.png`.
- From the plan's starting point to the fix, 31 files changed and none was deleted; STATE.md, ROADMAP.md, the
  database's schema and its migrations are not among them.
- Nothing is listening on port 3315.
