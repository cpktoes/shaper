---
phase: quick-261113-kvo
plan: 01
subsystem: board-file-preview
tags: [brd, rails, rail-fit, bottom-windows, background-worker, open-as-board]
requires:
  - quick-261113-hyy (wings found and fitted)
  - quick-261113-m5w (a wing's corner radius)
provides:
  - "A .brd's cross-sections give RAILS' three rails the closest settings RAILS' own controls make, and Open as a Board opens with them"
  - "A rolled rail stops reading as a belly: the bottom is read only out to where our fitted rail begins (the founder's longboard)"
  - "The preview and the printed overview carry a RAILS block beside BOTTOM; the 'not read' line is about the fins alone"
  - "Picking a .brd says Reading the file... at once and the file is read and fitted in a background worker"
affects:
  - "the fins task (if any): fins are now the only thing a .brd does not give the board"
key-files:
  created:
    - lib/geometry/brd-rails.ts
    - lib/geometry/brd-rails.test.ts
    - lib/export/brd-look.ts
    - lib/export/brd-look.test.ts
    - components/setup/brd-look.worker.ts
  modified:
    - lib/geometry/brd-bottom.ts
    - lib/geometry/brd-bottom.test.ts
    - lib/export/brd-fit-preview.ts
    - lib/export/brd-fit-preview.test.ts
    - lib/models/brd-board.ts
    - lib/models/brd-board.test.ts
    - components/setup/brd-fit-dialog.tsx
    - components/setup/open-board-file.tsx
    - components/setup/board-file-copy.ts
    - components/template/build-brd-overview-pdf.ts
    - components/template/build-brd-overview-pdf.test.ts
    - e2e/brd-fit-preview.spec.ts
decisions:
  - "The planner's measured method ported cleanly and reproduces its table (one deliberate reading of the file's rail region, below)"
  - "No fast copy of the one-station section: the app's own boardSections is used for every trial, and the nearest-point search is made faster instead"
  - "The worker runs under this Next.js's Turbopack dev server on Chromium, WebKit and Android Chrome; the main-thread fallback is kept"
status: complete
actuals:
  tokens: 150000
  tasks: 4
  commits: 5
---

# Quick 261113-kvo: a .brd's rail shapes are read from its cross-sections and fitted to RAILS' own controls

Open a board file and, besides the outline, rocker, thickness, wings and bottom, the board now comes with its rails: the three
rails (tail 12", centre, nose 12") are set to the closest thing RAILS' own sliders and boxes can make to the file's cross-sections.
The preview and the printed overview show the file's rail solid and ours dashed at all three places, with a Nose / Centre / Tail
table of what was set, in RAILS' own words, and how close each is. Open as a Board lands on a RAILS page whose Deck Profile, Family,
Ratio, boxes and Advanced menu already hold it. The one thing the file still does not give is the fins, and the "not read" line now
says only that. Picking a file says "Reading the file..." straight away and the page is never held up while the file is worked out.

**No cut name, depth or slider changed on any of the founder's four AkuShaper files, or on `mid.brd`.** The only board whose bottom
changes is the founder's own longboard (`testLB.brd`), on purpose: its soft rolled rail stopped reading as a belly (below).

Five commits on `close-bottom-17`, nothing pushed, no database change, no build run, and the dev server on 3117 was left running (the
browser tests and the picture script reused it). The PLAN, BRIEF and this SUMMARY are not committed.

- `68d8949f` Task 1: the rail fit, the bottom's narrowed windows, the two orders (maths and tests only)
- `32ace14d` Task 2: the RAILS block on screen and paper; Open as a Board carries the rails
- `81657a27` Task 3: "Reading the file..." and the background worker
- `ff333911` three small fixes found by looking at the pictures (see Deviations)
- `734694d7` Task 4: browser tests b23-b27 and the pictures and printed overviews

## How close the rails come (my own run, the shipped code, `S/kvo/before-after.ts` and `check.ts`)

Worst / typical gap in millimetres over the rail region (the outer 3" of the bottom, round the widest point, over the deck to the
stringer) of every usable cross-section (more than 1" from a tip), measured on the very board that opens, bottom and all.

| File (usable sections) | A new board's rails | Fitted rails | At the three sections the fit reads (tail, centre, nose) | Plan's table |
|---|---|---|---|---|
| 6'10 Egg (3) | 7.51 / 2.38 | **2.07 / 0.73** | 1.70, 1.81, 2.07 | 2.07 / 0.72 |
| 6'2 Round Tail (4) | 8.00 / 2.05 | **2.11 / 0.48** | 2.11, 1.54, 1.07 | 2.11 / 0.48 |
| Fryer 5'7 (3) | 5.58 / 1.47 | **1.14 / 0.37** | 0.90, 0.83, 1.14 | 1.14 / 0.37 |
| Scoop Noserider (5) | 5.60 / 2.16 | **3.22 / 0.89** | 1.18, 1.80, 1.94 | 3.22 / 0.89 |
| mid.brd (28) | 5.50 / 0.98 | **1.76 / 0.41** | 0.90, 0.77, 0.67 | 1.76 / 0.41 |
| testLB.brd (33) | 22.23 / 3.88 (see below) | **5.00 / 0.85** (rails first) | 1.16, 0.83, 2.19 | 4.98 / 0.85 |

Every figure is within 0.02 mm of the plan's (Egg typical 0.73 against 0.72; testLB worst 5.00 against 4.98). The fitted rails are
two to six times closer than a new board's on all four of the founder's files. For testLB the "new board's rails" figure is measured on
the board that now opens (flat centre and tail); the plan's 9.69 / 1.91 was measured on the old belly bottom, so the two are not the
same baseline.

The per-file settings (what did the work) are the plan's table to the step: the Egg's Deck Profile at its 75% floor with the Domed Deck
Band at +2", the Round Tail's boxy/med 60-65 with the dome, the Fryer's Use Single Tuck on all three, the Scoop's plain Deck Profile
and Ratio with a +2" dome on the nose, `mid.brd`'s Hard Edge tail and Bottom Tuck 1, and testLB's Symmetrical 50/50-ish rails with a
0.85 scaled nose. Deck Profile, Ratio and the Domed Deck Band do most of the work.

## The order rule's outcome, and the bottoms

Bottom first (the brief's order) on all six; rails first was **tried only on testLB.brd** (some whole section over 4 mm off with a vee
or belly read there) and taken because it came out far closer over the whole sections, bottom and rail together (the plan measured 9.30 mm
worst bottom-first against 4.99 rails-first; the bar is 0.25 mm).
No window narrowed on any other file (our rail meets the bottom inside the 9/10 line, or less than 1/4" past it, at every section).

| File | Bottom before | Bottom now |
|---|---|---|
| Egg | Flat Entry, Flat Center, Panel Vee 1/8" | **the same** |
| Round Tail | Teardrop 1/16", Deep Single 1/8", Double Concave Exit 1/8" | **the same** |
| Fryer | Blended Nose 1/16", Deep Single 3/16", Double Concave Exit 1/8" | **the same** |
| Scoop | Blended Nose 5/16", Tri-Plane 1/4", Panel Vee 1/8" | **the same** |
| mid.brd | Blended Nose 1/2", Flat Center, Panel Vee 3/16" | **the same** |
| testLB.brd | Teardrop 1/2", Tri-Plane 1/2", Rolled Vee 3/8" (5.25 mm off) | Teardrop 7/16", Flat Center, Flat Exit (its Symmetrical rail starts 0.6-6.8" in from the widest point) |

"The same" is proved, not eyeballed: I dumped the outline, rocker, thickness, wing, bottom (every figure of every section), planed
bottom line and the opened board's fields of all six files from the untouched code first (`S/kvo/pin-before.json`) and compared at the
end (`pin-compare.ts`): the five are identical to the last digit. testLB's outline and wings are identical too; its rocker and thickness
at the nose move because its nose concave is now 7/16" rather than 1/2" (the concave lift is 5.8 mm, was 8.1 mm) and the stringer is
planed for that lift by gwr's own rule.

## Round trips (the test with a known answer)

Boards written by the app's own `.brd` writer on the stock 6'0", read back and fitted by the whole look. Fitted rail value (worst plus
typical) against the written rails' own value on the same read-back board; all inside the 0.2 mm bar, and the same as the plan's.

| Case | Comes back | Fitted / written (mm) |
|---|---|---|
| H1 a new board's rails | exactly (nose scale 1.00 -> 0.95) | 1.15 / 1.15 |
| H2 Hard Edge off | exactly | 0.84 / 0.89 |
| H3 centre Deck Profile 85% | exactly | 1.09 / 1.08 |
| H4 Symmetrical 50/50 everywhere (a log's rail) | **rails first**, flat bottom, Symmetrical 50/50, 50/50, 49.5/50.5 | 0.87 / 0.90 |
| H5 tail Use Single Tuck + Sharp Bottom Tuck | exactly | 0.99 / 0.99 |
| H6 nose 70/30 Family 1 | 69/31 Family 3 with Apex Thickness +1/16" (the same rail) | 1.16 / 1.15 |
| H7 centre 90%, Deck Mark 1 +1/4", dome +1", Bottom Tuck 3 -1/4" | the same shape by other marks (85%, Family 2) | 1.16 / 1.07 |
| H8 a 1/4" Deep Single Concave | bottom exactly; rails within 1 point of Ratio | 1.08 / 1.08 |
| H9 a 3/16" Panel Vee tail | bottom as Rolled Vee 3/16" (gwr's known vee swap); rails exactly | 1.43 / 1.42 |
| H10 50/50 and 80% everywhere | centre and tail exactly; nose 52.5/47.5 at 85% scaled 0.85 | 1.37 / 1.38 |

All ten run in 9 s together in the unit suite (no need to cut the list). Where several settings draw nearly the same rail (H6, H7)
the shape is what the fit stands behind; the words may differ from the board's original.

## The stringer (R5)

Fitting rails never moves the rocker, thickness or stringer: those are fitted to the file's stringer before the rails exist, and only
the bottom's concaves plan the board lower (gwr's rule, unchanged). On the 3D board's own stringer deck and bottom lines, fitted rails
against a new board's rails, over every ring both boards share: Egg 0.00 mm (identical), Scoop 0.0098, Round Tail 0.0093, Fryer 0.0085,
mid 0.0009, testLB 1e-14 mm (all under the 0.01 bar; the Round Tail shares 64 of its 213 rings because a rail drawn into its room near
a tip shifts a station or two). Unit-tested on H1, H4 and H8 too. gwr's finished-stringer test still passes with the rails in the fields.

## Time

Node (`process.cpuUsage`, this Mac at a load of 3-16, so every figure is high; the planner measured at 2.5-4): the whole look,
cold, first call in a fresh process: Egg 0.92-1.00 s, Round Tail 0.82-0.89, Fryer 0.74-0.87, Scoop 0.62-0.65, mid 0.74-0.79, testLB
2.65-3.37 s. The rails' own part is about 0.27 s warm (0.33-0.40 cold) on the Egg. Inside the plan's budget (rails' part under 450 ms,
four files under 1.0 s, mid under 1.4 s, testLB under 3.5 s) at the quieter loads; the busiest runs (load 16) sat right at the edge.
Applied from the plan's fallback list: none of the four. What made the difference was making the nearest-point search skip any
segment that cannot be the nearest (same answer, 20% off the fit).

Browser, dev server on 3117, longest stretch the page was held up (a `longtask` observer), and the time from picking to the dialog:

| File | Before (rails fit on the page) longest stretch / to dialog | After (worker) longest stretch / to dialog | "Reading the file..." shown after |
|---|---|---|---|
| Egg | 369-449 ms / 0.51-0.79 s | 93-157 ms / 0.88-1.16 s | 64-220 ms |
| Round Tail | 542-588 ms / 0.69-0.76 s | 64-77 ms / 0.90-0.94 s | 68-85 ms |
| Fryer | 542-598 ms / 0.68-0.76 s | 61-73 ms / 0.87-0.90 s | 64-74 ms |
| Scoop | 513-551 ms / 0.66-0.71 s | 110-127 ms / 0.97-0.99 s | 74-81 ms |
| mid.brd | 840-865 ms / 1.0-1.1 s | 89-99 ms / 1.38 s | 76-80 ms |
| testLB.brd | 2771-2814 ms / 2.9-3.0 s | 129 ms / 3.0 s | 69-71 ms |

So the page is held up for 0.06-0.16 s instead of 0.4-2.8 s. Three of six are under the 100 ms aim (Round Tail, Fryer, mid.brd); the
others (the Egg's cold first run 157 ms, the Scoop 110-127, testLB 129) are the dialog's own first paint (building the sheet and drawing the sections on the page after the answer arrives), which the
plan said to report separately. The time to the dialog is 0.2-0.4 s longer on the short files (starting a worker, copying the file in
and the look back); testLB is unchanged. Close and the rest of the page are live the whole time. b22 also logs the longest gap between
20 ms ticks while reading (83-289 ms depending on machine load).

## Printed overview

Every overview is two pages, each 595.28 x 792 (A4 wide by Letter tall), BOTTOM and RAILS together on page 2, none refused or three
pages, read back with pypdf: Egg, Round Tail, Squash Flyer, Scoop Noserider (Imperial), Scoop and Squash Flyer in Metric, `mid.brd` and
`testLB.brd`. In unit tests the flat Shortboard, the Mid-length and the concave Shortboard at section Height 1, 2, 4 and 8 in both
systems are one or two pages, and BOTTOM and RAILS are always on the same page, RAILS after BOTTOM. If page 2 ever cannot hold both,
RAILS alone takes a third page (tested with deliberately long notes; no real file needs it). No page holds a trace of the file's text:
I scanned every PDF for `(cp [`, `p35 :` and `(p36` and found none.

## Pictures (`pictures/`) and what I saw in them

I looked at every screenshot and at seven of the sixteen page images (the Egg's page 2, the Metric Scoop's page 2, the Metric Squash
Flyer's pages 1 and 2, testLB's pages 1 and 2, `mid.brd`'s page 2: the longest and the Metric ones); the other nine come from the same
builder, and the pypdf read-back confirms two pages of 595.28 x 792 with every expected word on each. Nose at the left everywhere; the
file's rail solid and ours dashed lie together round the rail in every section at true height; the visible differences are small (the
Round Tail's centre deck, where the dashed line sits just inside the solid for a stretch, and the edge of its tail rail). The table
names every section read and every fitted setting; nothing is clipped at any page foot or screen edge; on the phone nothing runs off
the right and no figure is split from its unit.
- `preview-desktop-{egg,round-tail,squash-flyer,noserider,testlb}-rails.png`, `...-round-tail-rails-metric.png` (the 3" rail region
  note reads 7.6 cm, whole-millimetre marks), `preview-phone-round-tail-rails.png` and `...-rails-table.png` (iPhone 14: drawings stack and
  stay inside the screen; the table keeps its three columns with the words wrapping, no figure split from its unit)
- `preview-desktop-testlb-bottom-before.png` (gwr's: a 1/2" Tri-Plane belly and a Rolled Vee) and `preview-desktop-testlb-bottom.png` (now)
- `opened-rails-{egg,squash-flyer}.png` and `...-tail-advanced.png`: RAILS after Open as a Board, the centre's plot and readouts, and the
  tail's Advanced menu showing the Fryer's Use Single Tuck ticked and its Apex Thickness +1/8" and Deck Mark 3 +1/2"
- `reading-the-file.png`: the line under the button while testLB is read
- `overview-*.pdf` (eight) with `overview-*-page1.png` and `-page2.png`

## Browser tests

`e2e/brd-fit-preview.spec.ts` is green on desktop, iPhone and Android (93 tests, 37 skipped where the spec says one computer is
enough, 55 passed in the last full run plus the b22 rerun). New: b22 the line, the worker and the page staying live (it holds that a
worker was started and logs the stall; it asserts no millisecond figure, because that flakes with machine load); b23 the RAILS block
(three sections each with a file and a fit line, 18 table cells, the Rails lines, the tail's tucks in RAILS' words, drawings inside the
phone's screen); b24 Open as a Board (kept board's rails equal to the fields within 1e-9, 0.01 on the iPhone; on a computer RAILS
shows the centre's Ratio and Family and the tail's Use Single Tuck and Sharp Bottom Tuck ticked and Hard Edge off); b25 a log's rail
goes rails-first with every bottom flat and each Ticked cell Symmetrical; b26 a file with no cross-sections; b27 the printed overview.
b21 and the not-read expectations in b13 changed to the fins sentence. `e2e/board-file.spec.ts` fails only its known f1 (a last-digit
figure, the same message) on all three projects.

## Deviations from the plan, and why

1. **The file's rail region is resampled to its own 120 points** (`prepared()` in `brd-rails.ts`). Read literally, the plan cuts the
   region from the half already resampled to 120. That gave the Fryer 1.12 / 0.50 instead of the plan's 1.14 / 0.37 (a different local
   optimum: no Single Tuck found). Cutting the region from the finely sampled half, from one point before it starts, and resampling
   that to 120 reproduces the plan's whole table. This makes the rail, not the long bottom run, carry the weight. It is documented in
   the code. Nothing else about the measure differs.
2. **No fast copy of the one-station section.** The plan allowed one only if tests held it equal to `boardSections`; I measured first:
   the exact path costs 0.14 ms a section against 0.10 for an exact fast copy (the tabled one differs by 0.004-0.009 mm). That was
   about 16% of a trial, so I kept every trial on the app's own `ghostRail(boardSections(...))` (nothing to drift) and made the gap
   search skip distant segments instead. Times are inside the budget.
3. **The window is narrowed only where our rail begins more than 1/4" inside the 9/10 line, in the rails-first order too** (the plan's
   step 10 text). The planner's scratch narrowed every section; testLB's bottom comes out Teardrop 7/16" as the plan's table says.
4. **Tests were written after the code, not before** for the new maths (I explored the method for parity first); the new tests do
   pass and fail meaningfully (the window tests, the round trips, the region and gap tests, the PDF page tests).
5. **Commit guard**: the task told me to commit on `close-bottom-17` in this checkout, which is not an `agent-*` branch, so I applied
   the protected-branch half of the guard only (never main, master, develop, trunk or release/*).
6. **A fourth source commit, `ff333911`**, from looking at the pictures: the BOTTOM note still said "the rail itself isn't read yet"
   (now "or less where our fitted rail begins (the rail is read below)"); the RAILS note quoted a bare 3" in Metric (now 7.6 cm
   through `formatDim`, with a test); and a phone's narrow table could split "1" from "mm" (`keepFiguresTogether` on the table cells).
7. **Existing tests changed for the new words**: the not-read expectations (b13/b21, three unit tests), the staging test for
   suggested blanks (RAILS adds two lines to page 1, so on the longest case the blanks go to page 2 from the start: the middle stage
   is gone), and the "block stays on one page" test, whose lean sheet now also cuts the RAILS block to its one line.
8. **`brdRailLines`, `brdRailLineGap`, `newBoardRailSetting`, `brdRailWholeValue` are extra exports** (tests and the look use them).
9. **A load flake that is not ours**: `lib/geometry/brd-fit.test.ts` "finishes the Longboard well inside a second" read 1.13 s once
   when 14 suites ran at a machine load of 19; alone it passes in 0.8 s. It times only the side fit, which this task did not touch.

## Known limits (findings, with the number)

- A deck crowned right across: RAILS' deck is flat inside the Domed Deck Band; the Egg's nose keeps falling from the stringer. Deck
  Profile runs to its 75% floor and the dome to its limit and the rail is still 2.07 mm off, 4 3/8" in from the rail.
- Between the three stations our rail blends straight: the Scoop's own sections between its centre and nose are 3.22 mm and 2.65 mm
  off, while the three it reads are within 1.9.
- A board built on a blank: about 5 mm on a long board (the founder's longboard, 5.00), because the fit opens a hand-set five-station
  foil and a rail's marks follow thickness.
- A soft rolled rail is told from a belly only by fitting the rail first (testLB, the log round trip H4); rails first alone would ruin
  the Scoop (3.22 -> 7.58 mm), hence two orders and the 0.25 mm bar.
- Not fitted: Tail Rail Blends From and Ends At (an AkuShaper file's few sections cannot show them); they stay a new board's, and the
  RAILS block says so.
- Several settings draw nearly the same rail, so the words may differ from the board's original (Family against Apex Thickness, the
  scale against the deck marks).
- The drawings are at true height on one scale (RAILS' own way), so a rail is small beside a section 18-23" wide and the dashed line
  hides inside the solid one where they agree; the how-close line and table say what the eye cannot.
- On paper the Advanced cell can break "Deck Mark 3" from its figure across two lines (the PDF wraps at spaces; the screen does not).
- The fit takes 0.6-1.0 s of CPU on a four-file board and 2.7-3.4 s on testLB at a busy machine; the worker hides all of it from the
  page, but the dialog still opens that much later (see Time).
- Not tested: a swallow tail. `ghostRail` gives the ring from the section's inside edge, not the notch wall, so a swallow 12" in is the
  one place a rail's position could be off; none of the six files has one.

## Calls for the founder (the plan's "My calls", each flagged)

1. **Two orders, the closer wins.** Bottom first, rails first only for a section over 4 mm off with a vee or belly read and kept only if
   0.25 mm closer. On his files only testLB goes rails first. Is that the right priority between a bottom and a rail?
2. **No cut name changes on his four files.** Stated plainly above, with the before/after table.
3. **The fit leans on the Advanced menu where the deck is crowned** (Deck Profile at 75% and the dome at +2" on the Egg's nose and the
   Scoop's and Round Tail's noses). Ask whether a wider dome range or a crown control is wanted (not in this task).
4. **Tail Rail Blends From / Ends At are not fitted.**
5. **The words may not be the board's original** (nearly the same rail by different settings).
6. **The not-read line becomes** "Fins aren't read from the file: the board opens with the fins a new board starts with." when the
   rails are read; with no usable section today's line stays and the RAILS block says its one unread line.
7. **True height, one scale, no Height picker** on the RAILS drawings. They are small; a picker like BOTTOM's is a small follow-up.
8. **The look runs in a background worker** with the line; the dev server's worker works on Chromium, WebKit and Android Chrome, so
   the page-itself fallback is kept but never used in the tests.
9. **Honest limits** (above).
10. New from me: **the file's rail region is resampled to its own 120 points** (Deviation 1) - the one choice not in the plan's
    words; it is what reproduces the plan's numbers.

## Self-Check: PASSED

- `npx tsc --noEmit` clean; `npm run lint` 0 errors (the one known warning in `import-designs-action.test.ts`).
- Unit suites touched, all green (one load flake, see Deviation 9): brd-rails, brd-bottom, brd-fit, brd-wings, brd-fit-preview, brd-look,
  brd-board, brd-blank-suggest, brd-blank-words, brd-read, rail-bands, build-brd-overview-pdf, build-overview-pdf, units-isolation:
  745 tests, 744 on the busy run and the flake passing alone.
- Browser: `brd-fit-preview` green on desktop, iPhone and Android; `board-file` fails only its known f1.
- The five commits exist (`git log`); the working tree holds only the untracked PLAN, BRIEF and this SUMMARY; no sample file, scratch
  script or sample text is in the repo.
