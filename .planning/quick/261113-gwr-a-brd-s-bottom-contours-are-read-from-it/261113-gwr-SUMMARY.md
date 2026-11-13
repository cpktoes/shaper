---
phase: quick-261113-gwr
plan: 01
subsystem: board-file-preview
tags: [brd, bottom-contours, cross-sections, print-overview, open-as-board]
requires:
  - quick-261113-d9b (closest-fit preview)
  - quick-261113-et0 (tables, Print Overview, Open as a Board)
  - quick-261113-gwo (suggested blanks)
provides:
  - "A .brd's cross-sections read, kept whole, and fitted to BOTTOM's own cuts and sliders"
  - "The BOTTOM block on the preview and the printed overview"
  - "Open as a Board opens with the fitted bottom"
affects:
  - quick-261113-hyy (wings, built next in lib/geometry/brd-fit.ts)
  - the rails task (reuses ReadBrdBoard.sections)
key-files:
  created:
    - lib/geometry/brd-bottom.ts
    - lib/geometry/brd-bottom.test.ts
  modified:
    - lib/export/brd-read.ts
    - lib/geometry/bottom.ts
    - components/bottom/bottom-controls.tsx
    - lib/geometry/brd-fit.ts
    - lib/export/brd-fit-preview.ts
    - lib/models/brd-board.ts
    - components/setup/brd-fit-dialog.tsx
    - components/setup/open-board-file.tsx
    - components/setup/brd-blank-suggestions.tsx
    - components/template/build-brd-overview-pdf.ts
    - e2e/brd-fit-preview.spec.ts
decisions:
  - "The fit is the planner's measured method, ported exactly; parity with the plan's table proved on all four AkuShaper files"
  - "A flat, vee or belly leaves the opened board exactly as before; a concave plans it lower by its depth along the stringer"
  - "The overview keeps one page only when the two views keep 45 mm; otherwise the BOTTOM block takes a second page (and, if a page is still too crowded, the suggested blanks go with it)"
status: complete
actuals:
  tasks: 3
  commits: 3
---

# Quick 261113-gwr: a .brd's bottom contours are read, fitted, shown and opened

Open an AkuShaper or Shape3D board and the app now reads the file's cross-sections, finds the closest bottom BOTTOM's own
cuts and sliders can make, and shows it: three of the file's cross-sections with ours dashed over them, a Nose / Centre /
Tail table of what the file measures and what we fitted (cut, depth, Start · Deepest At · End, across marks), and a fourth
HOW CLOSE line. The same block prints. Open as a Board opens with those cuts on BOTTOM, editable like any board's, with no
blank picked; Close still changes nothing; the `.brd` never leaves the browser.

Three commits on `close-bottom-17`: `1d3ee2de` (reading and fitting, maths and tests only), `e28b9649` (the preview, the paper and
Open as a Board), `844dd910` (browser tests, pictures and printed overviews). Nothing pushed, no database change, no build run
(the dev server on 3117 was left alone, and no other `next dev` or `next build` was started).

## What the fit found, for the four AkuShaper files and the founder's own two

Worked out by `brdFitLook` (the whole flow) in a scratch script outside the repo. "a -> b" is the cut's starting number moving to
the fitted one, on BOTTOM's own slider steps. "Worst / typical" is the widest and the average gap against the file's own
cross-sections, in millimetres.

| File | Nose | Centre | Tail | Worst / typical |
|------|------|--------|------|-----------------|
| 6'10 Egg | Flat Entry | Flat Center | Panel Vee 1/8", Start 27 5/16" -> 44" | 0.84 / 0.27 (the centre's own drawing wobble) |
| 6'2 Round Tail | Teardrop Nose Concave 1/16" | Deep Single Concave 1/8" | **Double Concave Exit 1/8"**, Start 23 1/16" -> 42 7/8", Deepest At 11 1/16" -> 13 7/8", Trough At 3" -> 3 11/16" | 0.95 / 0.27 |
| Fryer 5'7 | Blended Nose Concave 1/16" | Deep Single Concave 3/16", Start 51" -> 62 1/2", Deepest At 22 9/16" -> 26 1/2", End 4" -> 8", Off Rail 2" -> 5/16" | **Double Concave Exit 1/8"**, Start 22 11/16" -> 42", Off Rail 1" -> 0", **Trough At 3" -> 4 5/8"** | 1.01 / 0.30 |
| Scoop Noserider | **Blended Nose Concave 5/16"**, Start 2" -> 0" (runs at full depth to the tip), Deepest At 12" -> 22", End 36" -> 42" | Tri-Plane Hull Center 1/4", Start 96" -> 73 1/2" | Panel Vee 1/8", Start 36 11/16" -> 78 1/2" | 1.92 / 0.54 |
| mid.brd (founder's) | Blended Nose Concave 1/2" | Flat Center | Panel Vee 3/16", Start 28 11/16" -> 25" | 0.85 / 0.09 |
| testLB.brd (founder's longboard) | Teardrop Nose Concave 1/2", Start 3" -> 1/2", End 38" -> 43" | Tri-Plane Hull Center 1/2", Start 94" -> 108", Deepest At 54" -> 12", End 13" -> 12", Off Stringer 7 1/4" -> 5 3/8" | Rolled Vee 3/8", Start 36" -> 63", Deepest At 13" -> 0" | 5.25 / 0.68 (the soft-rail limit, below) |

What each file's sections measure (kind and depth the app reads): Egg tail vee 2.4 mm, centre and nose flat; 6'2 tail double concave
1.3 mm, centre single 2.9 mm, nose single 1.7 mm; Fryer tail double 2.7 mm, centre single 4.8 mm, nose single 2.4 mm; Scoop tail
belly 3.5 mm, centre belly 6.0 mm, nose single 9.9 mm. Every figure sits on its slider's own step and inside its own range: a
test checks it for every cut the fit moves.

## Parity with the planner's table (the thing I was asked to prove)

I ported the method into `lib/geometry/brd-bottom.ts` cleanly (no environment switches, none of the scratch code copied as it
was) and ran the repo code on the four files in `~/Downloads` (scratch script `scratchpad/gwr/parity.ts`). Every name, depth,
moved slider and gap is the plan's:

| File | Names and depths | Moved sliders | Worst gap, plan -> repo | Typical, plan -> repo |
|------|------------------|---------------|--------------------------|------------------------|
| Egg | same | Panel Vee Start 27 5/16" -> 44" same | 0.84 -> 0.84 | 0.27 -> 0.27 |
| 6'2 | same | tail Start, Deepest At, Trough At same | 0.95 -> 0.95 | 0.27 -> 0.27 |
| Fryer | same | centre Start/Deepest At/End/Off Rail, tail Start/Off Rail/Trough At same | 1.01 -> 1.01 | 0.30 -> 0.30 |
| Scoop | same | nose Start/Deepest At/End, centre Start, tail Start same | 1.92 -> 1.92 | 0.54 -> 0.54 |

`mid.brd` (0.85) and `testLB.brd` (5.25) also match the plan. Where the plan prints a starting number to the nearest quarter
inch (Fryer tail Start "22 3/4"") the repo prints the exact starting number (22 11/16"): the same figure, not a difference of method.

## Round trips (the test with a known answer)

A board with a known bottom, written by the app's own `.brd` writer, read back and fitted: the 15 non-flat names alone on the
Shortboard, the four mixes on the Shortboard and again on the Mid-length, four one-cut cases with sliders moved (Deep Single with
Deepest At 8" toward the nose; Double Concave Exit with Trough At 4 1/2" and Off Rail 1/2"; Blended Nose Concave starting at the nose
with Deepest At 18" from it; Panel Vee from 30" with Deepest At 8") and the three-cut mix with moves. **Every section's cut kind
and depth come back in all 28**; each found bottom is no more than 0.2 mm further from the file than the bottom that was written;
the moved stations of the four one-cut cases come back within 4" and the moved marks within 1/8".

## The founder's rocker rule, and how the opened board's numbers moved

The file's rocker is the finished board's along the stringer; ours is the board before contours. A flat, vee or belly fit leaves the
opened board exactly as it was before this task, to the last digit (two tests: the Shortboard flat, with a Panel Vee, and with a
Continuous Belly each give the same fit as `fitBoardToBrd(lines)` and the file's own line to plane to). A concave lowers the planed
rocker by the concave's depth along the stringer (a test: the planed line is the file's less the lift at every point, and the drawn
finished stringer less the planed rocker is the lift at all 201 stations to 1e-9; and the opened board's finished stringer, read
back from BOTTOM, is the file's within 1.4e-14 mm at all 201 stations). The smooth five-station rocker is never bent to chase the
ripple where our concave's ends miss the file's: it shows in the closeness figure.

Measured on the real files (lift at the five stations, the board's centre thickness before -> after, and how far the finished
stringer would have been from the file had the board NOT been planed lower):

| File | Concave's lift at tail 12" / centre / nose 12" | Centre thickness | Unplaned board would miss the file by (rocker / thickness) | Planed, as shown (rocker / thickness) |
|------|-----|------|------|------|
| Egg | 0 / 0 / 0 | 2.598" -> same | (nothing lifts) | 0.86 / 0.55 mm (as before) |
| 6'2 | 1.27 / 2.04 / 0.87 mm | 2.687" -> 2.768" | 3.75 / 3.35 mm | 1.92 / 1.51 mm |
| Fryer | 0.53 / 4.37 / 2.08 mm | 2.308" -> 2.480" | 6.52 / 4.94 mm | 2.67 / 1.19 mm |
| Scoop | 0 / 0 / 7.94 mm | same (the nose concave lifts only there) | 10.38 / 9.71 mm | 3.19 / 2.83 mm |
| mid.brd | 0 / 0 / 12.70 mm | same | 12.82 / 13.78 mm | 0.90 / 2.12 mm |
| testLB | 0 / 0 / 8.12 mm | same | 8.21 / 8.89 mm | 1.89 / 1.93 mm |

(The first-fit figures with no lift, kept for comparison: 6'2 1.16 / 0.84, Fryer 3.11 / 1.55, Scoop 2.47 / 2.67, mid 4.59 / 2.85,
testLB 5.23 / 4.05 — the plan's mid.brd figure, 4.59 -> 0.90, comes out exactly.) The Scoop's rocker and thickness gaps get a
little larger than the unplaned first fit's own (2.47 -> 3.19, 2.67 -> 2.83): that is the honest cost of comparing finished
stringers, since our nose concave's fade along the board is not the file's. It is what the plan predicted for the thickness.

## Timings

**Node, CPU time of the whole `brdFitLook` (both side fits and the bottom), this Mac at a load average of about 6-7, three runs
cold / warm / warm:** Egg 431 / 269 / 167 ms; 6'2 404 / 368 / 375; Fryer 228 / 218 / 224; Scoop 386 / 336 / 372. All four are under the
500 ms budget, so **none of the plan's cut-backs was applied**. The founder's own files, outside the budget: mid.brd (28 sections)
about 530-560 ms; testLB.brd (33) about 815-845 ms. The bottom fit alone: 186-308 ms for the four AkuShaper files.

**Browser (the dev server on 3117, an unminified development build, the machine at a load average of 11-32 from other work),
longest single blocked stretch of the main thread while a file is read, fitted and the preview drawn, two rounds:** Egg 239 / 364 ms;
6'2 419 / 789; Fryer 695 / 465; Scoop 1131 / 1054; mid.brd about 2.0 s; testLB.brd 2.8-3.1 s. The preview with its BOTTOM block is on
screen 0.5-1.5 s after the file is chosen for the four AkuShaper files (2.3-3.5 s for the founder's two many-section files).
A production build on an idle machine will be several times quicker; I could not measure that (no build allowed here).

## Pages

Every printed overview of the four AkuShaper files is **two pages** (595.28 x 792, A4 wide by Letter tall, read back with pypdf: the file's
name, BOTTOM, CROSS-SECTIONS, the fitted names, Our fit and the table words are all there). Page 1 is what the overview always was (the two
views, HOW CLOSE with its new bottom line, the tables, the two-rockers line and the lift note, the suggested blanks, our closest fit, the not-read
line); page 2 is the BOTTOM block. The Scoop in Metric is the one that crowds page 1 (a long maker block in millimetres): there the suggested
blanks go to page 2 too, ahead of BOTTOM. Page 1 of every file was looked at in a picture and nothing is clipped at any foot.

| Overview | Pages | On page 2 |
|----------|-------|-----------|
| overview-egg.pdf | 2 | BOTTOM |
| overview-round-tail.pdf | 2 | BOTTOM |
| overview-squash-flyer.pdf | 2 | BOTTOM |
| overview-noserider.pdf | 2 | BOTTOM |
| overview-noserider-metric.pdf | 2 | SUGGESTED BLANKS, then BOTTOM |

## Pictures looked at (all in this task's `pictures/`)

`preview-desktop-{egg,round-tail,squash-flyer,noserider}-bottom.png`, `preview-desktop-noserider-bottom-x8.png`,
`preview-desktop-round-tail-bottom-metric.png`, `preview-phone-round-tail-bottom.png` (iPhone 14), `preview-desktop-testlb-bottom.png`,
`opened-bottom-{round-tail,squash-flyer,noserider}.png` and, per overview PDF, `-page1.png` and `-page2.png` rendered with
`qlmanage`. What I saw: nose on the left everywhere; the file's line solid and ours dashed readable in every section, and where the
two agree they lie on top of each other; the 6'2's and the Fryer's tail sections show their doubles (troughs standing above the
stringer) with ours following; the Scoop's nose section a deep concave with ours alongside, plain at x4 and clear at x8; the Egg's
sections nearly flat (it is nearly flat) with a faint vee in the tail; the table names which section each column was read at and
every fitted slider, in Imperial and in Metric (marks in whole millimetres, stations in centimetres to one decimal); on the iPhone
the three sections stack, the table keeps its three columns with the words wrapping, and nothing is cut off; the opened BOTTOM pages
show the fitted names and sliders (the Fryer's tail card with Trough At 4 5/8" and Start 42", the Scoop's nose card with Start 0",
Deepest At 22", End 42"). One thing for the founder's eye: **on paper the cross-sections print small** (a few millimetres tall at the
default x4, because one 60 mm cell holds a whole board width; the deep concaves read, the flat ones are nearly flat). The paper uses the
Height picked in the preview (x4 unless changed), so a shaper who wants them larger taps x8 before Print Overview.

## Tests

Unit: the 14 touched suites (brd-read, brd-bottom, brd-fit, brd-fit-preview, brd-board, brd-blank-suggest, brd-blank-words, bottom,
components/bottom, build-brd-overview-pdf, build-overview-pdf, brd, units-isolation) **1786 tests, all green**; `tsc --noEmit` clean;
`npm run lint` clean apart from the one old `import-designs-action.test.ts` warning. New: the reader on a hand-made AkuShaper layout with a
`gps` block (plain, Windows-ended and stamped copies read the same; every way a section can be bad; the caps), `readBrdBottom`, the
sections, the blends, the fast form of a cut equal to `resolveBottom` + `sectionsFoamOff` to 1e-9 over 200 random bottoms (a Teardrop
and a Spiral Vee too), the 28 round trips, the stringer lift, the planed fit, `brdFitLook` (the two founder-rule tests), the BOTTOM block's
rows, drawings and words in both systems (including the slider words held equal to `BOTTOM_COPY`'s), `brdBoardFields` with a bottom
(deep-equal through the board reader) and the PDF's pages.

Browser (`PW_PORT=3117`, only the specs named): `e2e/brd-fit-preview.spec.ts` **33 passed, 18 skipped** (the skips are the tests that say one
computer is enough), 0 failed, on desktop, iPhone and Android, including the five new tests b13-b17; `e2e/board-file.spec.ts` 21 passed and
**only f1 failed** (on all three projects, the known last digit: `458.80019999999996` against `458.8002`); `e2e/bottom-metric.spec.ts` on
desktop passed (it exercises the mark sliders whose ranges moved into `bottom.ts`).

## Changes to the brief that were built as the plan wrote them (for the founder's ruling)

1. The planed rocker and thickness are refitted under a concave (confirmed by the founder's own words, quoted in the plan).
2. gwo's suggested blank is matched to the planed line (the file's stringer less our concaves): the blank is what is planed, the
   concave is cut afterwards. Identical to gwo's on a board with no concave.
3. "Cut kind and depth" is a name, a depth and the cut's sliders; the name shown may be either of two of one kind (Deep or Shallow Single,
   Panel or Rolled Vee).
4. The grids are BOTTOM's Imperial ones in both systems (1/16" marks, half-inch stations from the nose).
5. Three drawings at the file's own sections nearest 12" from the tail, the centre and 12" from the nose.
6. The drawings show the bottom only, over the part that is read, with their own Height pick opening at x4.
7. The bottom's closeness is a fourth HOW CLOSE line.
8. The BOTTOM block moves to a second page when the two views would get under 45 mm (see Deviations: this is every real file).
9. The mark sliders' step and ranges moved from `bottom-controls.tsx` into `bottom.ts` (values unchanged).
10. The bottom is also compared between the file's sections (the blends), the figures shown still the file's own sections'.
11. The table turned round (Nose, Centre, Tail across).
12. Honest limits, below.

## Deviations from Plan

### Auto-fixed and own calls

**1. [Rule 1 - Bug in the planner's scratch method] A Spiral Vee's remembered work was reused after its depth changed.** The scratch
refiner rebuilt a cut's remembered work only when an across mark changed, but a Spiral Vee's lift is its Vee Lift, not its depth, so the
work stored at unit depth carries Vee Lift / depth and goes stale when the depth moves. The key now includes that ratio (for every other cut
it is 0 and nothing changes). No AkuShaper file picks a Spiral Vee, so the parity table is unaffected; a test refines a Spiral Vee and holds
the result to the slow way.

**2. [Plan expectation not met] The plan expected one page for the flat Shortboard, the Midlength and the concave Shortboard at side Height 1, 2
and 4.** Measured: with the BOTTOM block on page 1 the two views get 40 mm (46.1 mm of room less the 6.1 mm caption gap), under the plan's own 45 mm
rule, so the block goes to page 2 in every real case; and a concave file adds a three-line lift note on top. I kept the plan's rule and
number rather than gut the words, so a real overview is two pages. The existing page-count checks (the unit tests and browser b9/b11) now say
"one or two, never more, every page A4 by Letter", a bottom that could not be read stays one page, and a "lean" sheet is tested to prove the
one-page path still works.

**3. [Rule 3 - blocking] The Scoop in Metric with the real suggested blanks was refused ("the overview's words leave no room"),** found when
the picture script's Print Overview showed "The overview couldn't be made". So there is a second step down: if the views are still under the
plain 30 mm minimum once BOTTOM has moved to page 2, the suggested blanks go to page 2 as well (in the screen's order, blanks then BOTTOM). A
test walks a page getting more crowded: BOTTOM to page 2, then blanks with it, then refused. Likewise the single "bottom couldn't be read" line
moves to page 2 only when the plain minimum would be lost, never for a 45 mm rule.

**4. [Test shape] Four round-trip claims in the plan were tightened to what is true.** "A made-up case whose targets are exactly one bottom's, no
slider moved" holds for a single concave but not for a vee, whose faint ends are called flat by the 1 mm rule, so the fit then moves its stations
a few inches; and "Deepest At moved 10" comes back within 1"" came back 2-5.5" off in the synthetic dense-section case (the same 1 mm rule hides
a concave's faint ends). The tests use the single concave unmoved and a 6" move (within 1"), and the real writer round trips above hold the
planner's tolerances. Made-up sections for those two tests are under 6" apart so no blends are added.

**5. [Rule 2] Exports beyond the plan's list:** `brdBottomScorer` (the scorer and refiner, so a test can hold the fast form to the slow one),
`BrdFitBottomBlock` / `BrdFitBottomColumn` / `BrdFitBottomRow` and `BRD_BOTTOM_DRAWING_WIDTH` types and constant.

**6. [Own call] The stringer note is shown when a station of the five has a lift above 0,** as the plan says. A concave that lifts the stringer only
between two of the five stations would show the planed board but no note; none of the six real files is like that.

### Auth gates

None.

## Honest limits

- A soft rolled rail reads as a belly until rails are fitted: the founder's own longboard (`testLB.brd`) comes out with a 1/2" Tri-Plane and a 3/8"
  Rolled Vee and a 5.25 mm worst gap, because its 50/50 rails roll up from about 6" in. The rails task narrows the window to where the fitted rail begins.
- Names may swap within one kind in one section (Deep for Shallow Single, Panel for Rolled Vee): once sliders move they are the same cut with
  different starting numbers; the kind, depth and sliders are what the fit stands behind.
- A slider the file's few sections cannot see stays at the name's starting number (an AkuShaper file has 3-5 usable sections).
- In a mix of three moved cuts the sliders come back only roughly (kind and depth exactly); a vee's stations show least.
- The 1 mm flat rule: a section within 1 mm of flat is flat, so the Egg's 0.84 mm centre is its own drawing wobble and is reported, not fitted.
- The real print window, the BOTTOM block on his own phone and the two many-section files' speed in a production build are the founder's look.

## Known Stubs

None.

## Threat Flags

None new: the one new parsing surface (the cross-sections) is bounded as the plan's T-gwr-01 says (64 sections, 200 knots each, a bad section
dropped never thrown, a fixed search budget) and the fitted bottom reaches the design only through the board reader (T-gwr-02, tested to read
back deep-equal). The AkuShaper files were read only by scratch scripts outside the repo; the committed pictures and PDFs hold numbers and
words only, never a file's text (scanned for `(cp [`, `p35 :` and `(p36` and none found).

## Self-Check: PASSED

Files found: `lib/geometry/brd-bottom.ts`, `lib/geometry/brd-bottom.test.ts`, the pictures folder's PDFs and PNGs, `e2e/brd-fit-preview.spec.ts`.
Commits found: `1d3ee2de`, `e28b9649`, `844dd910`. The plan, the brief and this summary are not committed (the orchestrator commits the docs).
