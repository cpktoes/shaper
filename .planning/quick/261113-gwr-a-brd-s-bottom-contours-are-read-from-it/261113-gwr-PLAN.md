---
phase: quick-261113-gwr
plan: 01
type: execute
wave: 1
depends_on: [quick-261113-gwo]
files_modified:
  - lib/export/brd-read.ts
  - lib/export/brd-read.test.ts
  - lib/geometry/bottom.ts
  - components/bottom/bottom-controls.tsx
  - lib/geometry/brd-fit.ts
  - lib/geometry/brd-fit.test.ts
  - lib/geometry/brd-bottom.ts
  - lib/geometry/brd-bottom.test.ts
  - lib/export/brd-fit-preview.ts
  - lib/export/brd-fit-preview.test.ts
  - lib/models/brd-board.ts
  - lib/models/brd-board.test.ts
  - components/setup/open-board-file.tsx
  - components/setup/brd-blank-suggestions.tsx
  - components/setup/brd-fit-dialog.tsx
  - components/template/build-brd-overview-pdf.ts
  - components/template/build-brd-overview-pdf.test.ts
  - e2e/brd-fit-preview.spec.ts
  - .planning/quick/261113-gwr-a-brd-s-bottom-contours-are-read-from-it/pictures/
autonomous: true
requirements: [GWR-1-read, GWR-2-fit, GWR-3-show, GWR-4-open, GWR-5-proof]

estimate:
  tokens: 260000
  raw_tokens: 260000
  tasks: 3
  confidence: low
  # factor 1, no calibration samples. Raw = et0's three-task plan (190k) plus a bounded reader block, an exact search, the
  # slider refinement (the founder's amendment) and a second drawing on screen and paper. One executor, this worktree,
  # three tasks in order (the orchestrator's split).

must_haves:
  truths:
    - "A .brd's cross-sections are read (forgivingly, bounded) and kept whole on the read board, so the rails task can reuse them; a file with no usable section is still looked at exactly as before, with one plain line that its bottom couldn't be read (GWR-1)"
    - "The fit picks, for each of BOTTOM's three sections, one of the founder's names and a depth on the Depth slider's own 1/16\" grid, from 0 to 1/2\" — seeded by the closest of every bottom the three menus and the slider make at the names' starting numbers — and then moves each fitted cut's Start, Deepest At and End along the board, and the chosen cut's one or two across marks, on BOTTOM's own slider steps, re-comparing every other name of each section with its sliders free; never channels, never wings; a file section within 1 mm of flat is flat (GWR-2; the founder, 2026-11-13: \"can yo adjust our starting and ending sliders to get a better fit for the Fryers and Scoop nose boards?\")"
    - "The Fryer's tail comes back as the double concave it is (Double Concave Exit, its Trough At moved out to 4 5/8\") and the Scoop's nose concave runs at full depth from 22\" from the nose to the nose; the whole look of a file (both side-profile fits and the bottom) stays under 0.5 s of CPU on this Mac for each of the four AkuShaper files (the bottom alone measured 0.18–0.33 s with the machine heavily loaded) (GWR-2)"
    - "A board with a known bottom, written by the app's own .brd writer and read back, fits to the same cut kind and depth in every section — sliders moved off their starting numbers included, which come back within 4\" (stations) and 1/8\" (across marks) when one cut was moved — and to the same planed rocker and thickness as the same board written flat (GWR-2, GWR-5)"
    - "The founder's rule (2026-11-13): the file's rocker is the finished board's, along the stringer; ours is the board before contours. Under a flat, vee or belly the two are the same line, so the opened board's rocker and thickness are exactly today's; under a concave the finished stringer reads more by the concave's depth there, so the board is planed that much lower and thicker — the smooth five-station rocker is fitted to the file's stringer less our concave, and any leftover ripple is reported in the closeness figure, never chased (GWR-2, GWR-4)"
    - "The side view's dashed line, the rocker and thickness tables and the closeness figures compare the file's finished stringer with ours; one line under the rocker table says what the two rockers are, and when a concave lifts the stringer another gives by how much and where (GWR-3, GWR-4)"
    - "The preview gains a BOTTOM block: three cross-sections (the file's own sections nearest 12\" from the tail, the centre and 12\" from the nose), the file's bottom solid and ours dashed, exaggerated by their own Height pick opening at x4; a table with Nose, Centre and Tail across and, down, where each section was read, what the file measures there in the founder's kinds, the cut and depth we fitted, its fitted Start · Deepest At · End, and its across marks; and a fourth HOW CLOSE line for the bottom saying where the widest gap is (GWR-3)"
    - "The printed overview carries the same BOTTOM block and the bottom line under OUR CLOSEST FIT; it stays one page unless the two views would fall under 45 mm, when the BOTTOM block goes onto a second page — never a clipped page, never a third (GWR-3)"
    - "Open as a Board opens the fitted bottom on BOTTOM, editable like any board, with the planed rocker and thickness; the not-read line keeps rails and wings only (GWR-4)"
  artifacts:
    - path: lib/export/brd-read.ts
      provides: "readAnyBrd now also reads the p35 cross-sections into ReadBrdBoard.sections (station, the whole half section sampled in mm, the knots as read); BRD_READ_MAX_SECTIONS"
    - path: lib/geometry/brd-bottom.ts
      provides: "The bottom fit: brdBottomSections, brdBottomBlends, readBrdBottom, brdFittedBottomBoard, brdBottomFromPicks, fitBottomToBrd (exact seed search, then the slider refinement and the neighbour names), measureBrdBottom, brdStringerLift, and the constants BRD_BOTTOM_WINDOW / BRD_BOTTOM_ACROSS_STEPS / BRD_BOTTOM_FLAT_MM / BRD_BOTTOM_PREFER_MM / BRD_BOTTOM_EXTRA_CUT_MM / BRD_BOTTOM_MOVE_GAIN_MM / BRD_BOTTOM_BLEND_MAX_IN / BRD_BOTTOM_STATION_COARSE_IN / BRD_BOTTOM_MARK_COARSE_IN / BRD_BOTTOM_BELLY_SHARE"
    - path: lib/geometry/brd-fit.ts
      provides: "fitBoardToBrd(lines, stringerLift?) — the planed refit; BrdFit.stringerLift at the five stations"
    - path: lib/export/brd-fit-preview.ts
      provides: "brdFitLook (the whole flow), BrdFitLook.bottom and .planedBottom, the sheet's bottom block, the stringer note, brdBottomRows, brdBottomFrames"
    - path: components/setup/brd-fit-dialog.tsx
      provides: "The BOTTOM block on screen, with its own Height picker"
    - path: components/template/build-brd-overview-pdf.ts
      provides: "The BOTTOM block on paper, and the second-page rule"
  key_links:
    - from: components/setup/open-board-file.tsx
      to: lib/export/brd-fit-preview.ts brdFitLook -> lib/geometry/brd-bottom.ts fitBottomToBrd -> lib/geometry/brd-fit.ts fitBoardToBrd(lines, lift)
      via: "one pure call when a .brd is picked; the look carries the board, the planed fit, the bottom fit and the planed bottom line"
    - from: components/setup/brd-fit-dialog.tsx Open as a Board
      to: lib/models/brd-board.ts brdBoardFields(fit, fileName, bottom) -> readBoardEntry -> onOpen -> design-store applyBoardFile
      via: "the same door a JSON board takes; the bottom rides in the snapshot's optional bottom field (Phase 17, D-24)"
    - from: components/setup/brd-blank-suggestions.tsx
      to: lib/geometry/brd-blank-suggest.ts suggestBlanks
      via: "its bottom line becomes look.planedBottom (the file's stringer less our concaves), so a blank is matched to what is planed"
---

<objective>
The founder, 2026-11-13, after seeing the editable board's pictures (locked): *"It looks promising, so we should then try
to fit bottom contours and rail shapes too."* This plan is the **bottom contours** half (BRIEF.md): read a `.brd`'s
cross-sections, fit BOTTOM's cuts to them, show the file's sections beside ours on the preview and the printed overview,
and open the board with those cuts. Rails are the next task and reuse this task's reading of the sections.

**Amended the same day, before it was built** (the founder, after reading the planner's findings, word for word): *"On
bottom, can yo adjust our starting and ending sliders to get a better fit for the Fryers and Scoop nose boards?"* — so the
fit no longer stops at each name's starting numbers: it moves each cut's Start, Deepest At and End (and the chosen cut's
one or two across marks) on BOTTOM's own slider steps, and compares the names again with their sliders free. And on the
rocker, confirmed in his words: *"the rocker is tricky becasue we're trying to balance a foil without contours and square
rails with a finished boards rocker along the stringer (which isn't always as smooth as the pre controured rocker). But,
for concaves the stinger rocker will always be more, and with flat, vee or belly the stringer rocker will always match."*

Purpose: a shaper who opens an AkuShaper/Shape3D board gets its bottom too — the closest bottom BOTTOM's own menus and
Depth slider make, with an honest account of how close that is and where.

Output: pure, tested reading and fitting in `lib/`; the BOTTOM block on the preview and on paper; Open as a Board
carrying the bottom; browser proof on a computer and both phones; pictures and PDFs of the four AkuShaper files.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
Work ONLY in `W` = `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17` (branch `close-bottom-17`). Scratch:
`S` = `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad`. Never `cd`
into a subfolder: absolute paths and `git -C W`. Never touch `/Users/kontoes/Code/shaper` itself. Nothing is pushed.

**Quick 261113-gwo (the blank suggestion) is built, in this same worktree** (commits a8628817, c1ae95f5, 8dcc2f56). It adds
a SUGGESTED BLANKS block under the rocker table (`components/setup/brd-blank-suggestions.tsx`, `lib/geometry/brd-blank-suggest.ts`,
`lib/export/brd-blank-words.ts`, `app/api/blank-catalog/route.ts`, the dialog and the PDF builder) and browser tests up to
b12. **Re-read each file as it stands before editing it, and find things by function and section name, never by line
number.** Quick 261113-hyy (wings: the file's wing, the outline above it, the tail block) is planned next and built AFTER
this task; it changes the outline fit in `lib/geometry/brd-fit.ts`, so keep your changes in that file to the planed
stringer (the `stringerLift` parameter and record) and touch nothing in the outline fit.

Read first (once each): this task's `BRIEF.md`; `.planning/quick/261113-et0-*/261113-et0-SUMMARY.md` and the gwo SUMMARY
(when it exists); `W/CLAUDE.md` (Rule 1, Rule 2, plain English) and `W/AGENTS.md`; the Phase 17 decisions D-04, D-05,
D-06, D-08, D-24, D-42 in `W/.planning/phases/17-bottom-contours/17-CONTEXT.md`.

House rules: Playwright only with `PW_PORT=3117` (the founder's dev server from this checkout is running there — never
stop it, never start another `next dev`, never run the whole suite). `e2e/board-file.spec.ts` test f1 fails on untouched
code (a last-digit figure) — known, not ours. `npx tsc --noEmit`, `npm run lint` and the touched unit tests clean before
each commit. The four AkuShaper files in `~/Downloads` (`6'10-Widepoint-Fwd-Egg.brd`, `6'2-Round-Tail---Double-Concave.brd`,
`Fryer-5'7-Squash-Flyer-Twin.brd`, `Scoop-Noserider.brd`) and the founder's own `mid.brd` / `testLB.brd` are NEVER copied
into the repo, nor any of their text; scripts that read them live under `S/gwr/`. The plan and BRIEF are never committed
by you. Commit messages and the SUMMARY in plain English (what a shaper sees); end each commit message with the
attribution line your session gives you.
</context>

## What the planner measured (2026-11-13)

Scratch scripts in `S/gwr/` (`raw.ts`, `files.ts`, `own.ts`, `flatwin.ts`, `lbshape.ts`, `fit.ts`, `fit2.ts`, `exhaust.ts`,
`fit3.ts`, `rt.ts`, `rt3.ts`, `rtfull.ts`, `lift.ts`, `final.ts`; run with
`W/node_modules/.bin/tsx --tsconfig W/tsconfig.json <script> <files…>`, `S/gwr/node_modules` links to `W/node_modules`).

**What the files hold.** AkuShaper's `p35` block holds one `(p36 <station cm> -1.0 -1.0` section per station, each a run of
`(cp [...] <bool> false)` knots from the bottom at the stringer `(0,0)`, out along the bottom to a bottom-edge knot, round
the rail to its widest point, to the deck at the stringer; x is out from the stringer, y up from the stringer's bottom (cm).
The four files carry 4–5 knots a section (the Fryer's tail section 4, the rest 5 — **knot counts differ between sections**),
a one-knot all-zero section closing each tip, and after every section of the 6'2 a `gps : (` block of two `(gp [x,y])`
guide points closed by `)`. The app's own writer writes 20–35 sections, same layout, no `gps`.

**What their bottoms are** (the bottom's height relative to the stringer, read from the stringer out to 9/10 of the
section's widest reach — see the window below — at the file's section nearest each of the three stations):

| File | Tail (≈12" from the tail) | Centre | Nose (≈12" from the nose) |
|------|------|------|------|
| 6'10 Egg | vee, rail 2.35 mm above the stringer (16 3/16" from the tail) | flat (0.84 mm) | flat (0.70 mm, 13 1/16" from the nose) |
| 6'2 Round Tail Double Concave | double concave, troughs 1.33 mm above the stringer, rail edge 2 mm below (12") | single concave 2.91 mm | single concave 1.72 mm (11 3/8" from the nose) |
| Fryer 5'7 Squash Flyer | double concave, troughs 2.68 mm (10 9/16") | single concave 4.75 mm | single concave 2.42 mm (8 7/8" from the nose) |
| Scoop Noserider | belly 3.53 mm (rise bunched toward the rail) | belly 5.98 mm | single concave 9.86 mm (12 5/16" from the nose) |

**Stage 1 only — the closest bottom the menus and Depth slider make at the names' starting numbers** (the seed of the
method below; superseded by the amendment's table further down, kept for comparison):

| File | Nose · Center · Tail | Largest gap / typical | Where |
|------|------|------|------|
| Egg | Flat Entry · Flat Center · Panel Vee 1/8" | 0.84 / 0.23 mm | the centre section (36 11/16" from the nose), its own 0.84 mm drawing departure |
| 6'2 | Teardrop Nose Concave 1/16" · Deep Single Concave 1/8" · Double Concave Exit 1/16" | 0.95 / 0.30 mm | 11 3/8" from the nose, 6" out |
| Fryer | Blended Nose Concave 1/16" · Deep Single Concave 3/16" · Panel Vee 1/16" | 1.74 / 0.58 mm | 10 9/16" from the tail, 3 7/8" out |
| Scoop | Blended Nose Concave 3/8" · Tri-Plane Hull Center 3/16" · Panel Vee 1/16" | 3.37 / 0.96 mm | 36 5/16" from the nose, 9 5/16" out |
| mid.brd (the founder's own export) | Blended Nose Concave 1/2" · Flat Center · Panel Vee 3/16" | 0.76 / 0.09 mm | 26 sections read |

- The Fryer's tail is a double concave whose troughs stand about 4 1/2" out; Double Concave Exit opens its trough at 3"
  (its starting number), so under starting numbers a 1/16" Panel Vee comes closer. The Scoop's nose concave is deepest
  nearer the nose than any nose cut's starting Deepest At. **The amendment below fixes both by moving the sliders.** (A
  plain search over every across mark too was measured first: Fryer 1.15 → 0.89 mm, but 14–30 s and odd picks; the
  amendment's cheap way does better in a fraction of the time.)
- **Round trips** (the Shortboard and the Mid-length, each of the 15 non-flat names alone at its starting depth, and four
  mixes, written by `brdText`, read back, fitted): every one comes back with the same kind and depth in every section;
  the names come back too except that **Panel Vee and Rolled Vee swap** (both vees, smoothness 0 vs 60; inside the window
  the writer's sections, drawn to within 1 mm, cannot tell them apart).
- **Searches compared:** a section-at-a-time search got stuck (Reverse Vee Nose came back as two bellies; a spurious 1/16"
  tail double appeared); a best-move greedy did worse on the Fryer (1.75 → 2.42 mm). **Trying every bottom** — 41 choices a
  section (the flat, and 5 names x 8 depths), 68,921 bottoms — is exact and takes 50–300 ms with the parts precomputed and
  a bottom dropped as soon as it cannot win. That is the method.

**The window: from the stringer out to 9/10 of the section's widest reach.** The app's own flat exports (every preset and
every rail variant of `phase16RailCharacterBoards`, the longboard aside) stray at most 0.90 mm from flat inside 0.85–0.9
of the reach; at 0.93–0.95 the rail's turn starts showing (1–1.6 mm). AkuShaper's bottom-edge knots sit at 0.98–0.99 of the
reach. **The longboard is the honest limit:** its soft 50/50 rail rolls up from about 6" in (10 mm at 0.8 of the reach), so
the founder's own `testLB.brd` reads its rail roll as a 1/2" belly (largest gap 10.6 mm). Only fitting the rail can
separate a rolled rail from a belly — the rails task (next) narrows this window to where the fitted rail begins.

**Flat tolerance: 1 mm** (`BRD_BOTTOM_FLAT_MM`). A file section whose bottom never strays more than 1 mm from the
stringer's height across the window reads flat, and the fit treats it as exactly flat. Why 1 mm: this app's own writer
draws its sections to within 1 mm (`BRD_SECTION_TARGET_MM`; measured worst 0.90 mm on a flat board, 0.94 mm on a
Blended Nose Concave); AkuShaper's near-flat sections stray 0.51–0.84 mm; the smallest real contour in the four files is
1.33 mm and the smallest depth the slider makes is 1/16" (1.59 mm). Half a slider step (1/32", 0.79 mm) would call the
egg's 0.84 mm centre a cut and sits under the writer's own 0.9 mm noise.

**A concave lifts the stringer (D-05), so the board must be planed lower.** The file's `p33` line is the finished
stringer. et0's fit plans the board to that line; a fitted concave then lifts the stringer by its depth again, and the
board opens that much thinner and higher than the file wherever a concave is: by 3/8" at the Scoop's nose 12", 3/16" at
the Fryer's centre. Measured fix: refit the planed rocker and thickness to the file's stringer **less** the concaves'
lift there. Round trip, Shortboard with a 1/4" Deep Single Concave: the refit's rocker and foil come back within 0.03–0.1 mm
of the same board written flat (centre thickness 2.254" both; without the fix 2.087"); the Mid-length the same; a nose
and tail concave pair within 0.5 mm at worst (nose tip thickness). The founder's `mid.brd`: rocker gap 4.59 → 0.90 mm.
For the four files the stringer lift at the five stations is 0 (egg), up to 2.04 mm (6'2 centre), 3.27 mm (Fryer centre),
9.52 mm (Scoop nose 12"). The rocker/thickness closeness figures then compare the finished stringers (6'2: rocker 1.16 →
1.92 mm, thickness 0.84 → 1.51; Fryer 3.11 → 1.85, 1.55 → 2.11; Scoop 2.47 → 2.18, 2.67 → 5.45 — the Scoop's thickness gap
grows because our nose concave's fade along the board is not the file's; before the fix the true gap was the lift on top).
These closeness figures were taken with the stage-1 bottoms; Task 1's check script re-measures them with the final fit.

**The founder confirmed this rule on 2026-11-13** (quoted in the objective): the file's rocker is the FINISHED board's,
along the stringer; ours (ROCKER's five stations and the foil) is the board BEFORE contours, square rails, no cuts. Under a
flat, vee or belly the two are the same line, so nothing changes; under a concave the finished stringer reads more, by the
concave's depth at the stringer there, so the board is planed that much lower. The finished stringer "isn't always as
smooth" as the rocker before contours: where our concave does not start and end exactly where the file's does, the file's
stringer less our concave keeps a small local ripple. The five-station rocker is smooth by construction and is NOT bent to
chase it; the ripple shows honestly in the rocker closeness figure, and the line under the rocker table says what the two
rockers are. Fitting the concave's Start and End along the board (the amendment) is what keeps that ripple small.

### The amendment, measured (2026-11-13): the sliders fitted too

Scratch `S/gwr/refine3.ts` (the fast refiner), `fit7.ts` (the whole two-stage fit), `blend.ts`, `memo.ts`, `rt4.ts` (round
trips with moved sliders). **BOTTOM's controls, read from the code:** Start, Deepest At and End are one slider each
(`bottomStationSlider` in `lib/geometry/blank-reasons.ts`): the track is the distance from the NOSE, 1/2" steps in Imperial
(10 mm in Metric), 0 to the board's length rounded inward; a drag stores the station through `storeCutStation` and keeps
Start ≥ Deepest ≥ End through `keepStationsInOrder`, the dragged one winning (`updateBottomCut` in the design store). The
across marks (`MARK_ROWS` in `components/bottom/bottom-controls.tsx`): Off Rail 0–6", Off Stringer 0–9", Trough At
1/2"–8", Depth and Vee Lift 0–1/2", all in 1/16" steps; a double's mark drag also runs `keepStationsInOrder(…, "deepest")`.
Every non-flat cut has the three station sliders; a single and a double have Off Rail; a double and the Tri-Plane have Off
Stringer; a double has Trough At.

**The final fits of the four files** (stations as BOTTOM's labels read them — Nose cuts from the nose, Center and Tail cuts
from the tail; "a → b" = starting number → fitted; worst gap over the file's own sections):

| File | Nose | Center | Tail | Worst / typical |
|------|------|--------|------|------|
| 6'10 Egg | Flat Entry | Flat Center | Panel Vee 1/8", Start 27 5/16" → 44" | 0.84 / 0.27 mm (the centre's own drawing wobble) |
| 6'2 Round Tail | Teardrop Nose Concave 1/16" (starting numbers) | Deep Single Concave 1/8" (starting numbers) | **Double Concave Exit 1/8"**, Start 23 1/8" → 42 7/8", Deepest At 11 1/8" → 13 7/8", Trough At 3" → 3 11/16" | 0.95 / 0.27 mm |
| Fryer 5'7 | Blended Nose Concave 1/16" (starting numbers) | Deep Single Concave 3/16", Start 51" → 62 1/2", Deepest At 22 5/8" → 26 1/2", End 4" → 8", Off Rail 2" → 5/16" | **Double Concave Exit 1/8"**, Start 22 3/4" → 42", Off Rail 1" → 0, **Trough At 3" → 4 5/8"** | 1.01 / 0.30 mm (was 1.74) |
| Scoop Noserider | **Blended Nose Concave 5/16"**, Start 2" → 0 (at the nose, so it runs at full depth to the tip), Deepest At 12" → 22", End 36" → 42" | Tri-Plane Hull Center 1/4", Start 96" → 73 1/2" | Panel Vee 1/8", Start 36 3/4" → 78 1/2" | 1.92 / 0.54 mm (was 3.37) |

The Fryer's tail is the double concave again, its trough out where the file's is; the Scoop's nose concave now covers
the file's deep stretch (9.9 mm at 12 5/16" from the nose, 7.6 mm at 24 5/16") at full depth from 22" to the tip.
The founder's own `mid.brd`: Blended Nose Concave 1/2" · Flat Center · Panel Vee 3/16" (Start 28 3/4" → 25"), 0.85 mm.
`testLB.brd` (soft rails, the known limit): 5.25 mm.

**Time** (CPU time of the whole bottom fit in Node through `tsx`, on this 8-core Mac while other agents kept it at a
load of 11–40, so the true figure is lower): Egg 250 ms, 6'2 312, Fryer 179, Scoop 287; `mid.brd` (26 sections) 375 ms,
`testLB.brd` (32) 624 ms. Stage 1 is 50–130 ms of it.

**What it took, measured in turn:**
- *Refining only the stage-1 winner's sliders* helped the Scoop (3.37 → 1.23 mm) but could never bring the Fryer's
  double back: no tail double was in the running. *Refining the top 12 stage-1 bottoms* — same. **What works:** refine
  the winner, then put every other name of each section in its place (at its best depth, the others as refined), refine
  that cut alone, fully refine the best three of those, and choose again (the "neighbours").
- *Without a guard between the file's sections* the sliders overfit the 3–5 sections an AkuShaper file has: the Fryer
  got a 7/16" nose concave that faded from nothing to full depth in 2 1/2" between two sections. **Fix:** compare the
  bottom also at stations between the file's sections — no more than 6" apart — as the blend of the two neighbouring
  sections at the same share of the window, which is how AkuShaper and Shape3D draw a board between its sections (the
  founder's finding of 2026-11-10, recorded in `lib/export/brd.ts`). Blended from the flat-tested targets, so two flat
  sections blend flat.
- *Gains:* a slider move must bring the fit at least 0.1 mm closer (`BRD_BOTTOM_MOVE_GAIN_MM`); 0.25 mm stopped moves
  the mixes need. A cut that is not in the seed must bring it at least 0.25 mm closer (`BRD_BOTTOM_EXTRA_CUT_MM`): at
  0.1 mm a round trip gained a spurious 1/16" nose cut; at 0.25 mm all 20 round trips come back and the four files are
  unchanged. Ties within that go to the seed's names, then the closer value (choosing by menu order picked a belly over
  a Tri-Plane).
- *A station move tries the depth one step either side too* (the two trade off): without it a cut moved 8" stuck at
  the wrong depth.
- *Speed:* a cut's work at a point is exactly its depth x its fade at that station x its work at full fade and 1 mm
  depth (every cut but one that closes to a point, the Teardrop's box). So a station or depth trial costs one `fadeAt`
  per section, not a cut per point; and the board's readers asked at the same few stations are remembered. That took
  the stage-2 search from 1.7–2.8 s to the figures above.
- **Round trips** (the 15 names alone at their starting numbers, four mixes, and five cases with sliders moved: a Deep
  Single Concave with Deepest At 8" toward the nose; a Double Concave Exit with Trough At 4 1/2" and Off Rail 1/2"; a
  Blended Nose Concave starting at the nose, deepest 18" from it; a Panel Vee from 30", deepest 8"; a three-cut mix with
  moves): **20 of 20 bring back every section's kind and depth.** The moved sliders of the four one-cut cases come back
  within 1 1/2" (the concaves' stations), 4" (the vee's Start and Deepest At — a vee's fade is the gentlest, so its
  stations show least) and 1/16" (Trough At, Off Rail); in the three-cut mix the kinds and depths come back but the
  center's Off Rail lands 1" off and the tail's Trough At 5/16". Names swap only within a section and a kind (Deep ↔ Shallow Single, Slight
  Single → Blended, Panel ↔ Rolled Vee): once the sliders move, two names of one kind in one section are the same cut
  with different starting numbers. A slider left at its starting number can drift up to 6" (the writer's sections are
  drawn to about 1 mm, so a far station costs nothing). In 19 of 20 the bottom found is at least as close to the file
  as the bottom that was written; the three-cut mix is 0.14 mm further (a search limit, within the 0.2 mm the test allows).

## The method, written out (Task 1 implements exactly this)

1. **Reading the sections** (`readAnyBrd`): see Task 1. Each kept section: station (mm), `points` = its knots sampled with
   `sampleKnots(knots, BRD_PREVIEW_SECTION_STEPS)` (mm), and `knots` as read (cm).
2. **The file's bottom at a section** (`brdBottomSections`): drop sections with fewer than 2 points and any whose station is
   less than `BRD_FIT_TIP_SKIP_MM − 0.5 mm` from either tip (the half-millimetre allows for the file's rounding of a station
   written at exactly 1"). From the section's points take index 0 up to the first point holding the largest x (the widest
   reach), keeping only points whose x is larger than the last kept point's. `reach` = that largest x; window =
   `BRD_BOTTOM_WINDOW x reach`; `across[j] = window x j / BRD_BOTTOM_ACROSS_STEPS`, j = 0…24; `file[j]` = the kept run's
   height at `across[j]` by straight-line interpolation (past the run's ends: its end value) minus the first kept point's
   height. `flat` = every `|file[j]| <= BRD_BOTTOM_FLAT_MM`; the fit's target is all zeros when flat, else `file`. Sort by
   station.
3. **What the file measures there** (`readBrdBottom(across, file)`), in the founder's kinds, T = `BRD_BOTTOM_FLAT_MM`,
   `end` = the last value, `top` = the largest, `low` = the smallest: flat when every |value| <= T, depth 0; else **double**
   when `top > T` and `top − end > T` (troughs standing above the stringer, the bottom falling again outboard), depth
   `top`; else **vee or belly** when `end > T`, depth `end` — belly when the value halfway across (index 12) is less than
   `BRD_BOTTOM_BELLY_SHARE` (1/3) of `end`, else vee (a straight vee reads 0.5, Rolled Vee 0.37, a full belly 0.28); else
   **single**, depth `−low`. It describes the file; it never picks the fit.
4. **The board the fit is measured on** (`brdFittedBottomBoard(fit)`): `designBottomBoard(fit.outline,
   buildOutline(fit.outline), designSideProfile({ outline, rocker, foil, blank: null }, LIVE_DESIGN_RULES),
   designFinPlacement({ outline }))` — `designFinPlacement` with no fins reads `DEFAULT_FIN_PLACEMENT_SPEC` and Import
   Template on, exactly the picks `brdBoardFields` opens with.
**Stage 1 — the seed: every name and depth at the starting numbers, over the file's own sections (steps 5–8).**

5. **The choices** per section key, in each menu's own order (`BOTTOM_CUT_NAMES`): the flat name once (depth 0); every other
   name at steps 1…`BOTTOM_DEPTH_RANGE_IN.max / BOTTOM_MARK_STEP_IN` (8), depth `inchesToMm(steps x BOTTOM_MARK_STEP_IN)`.
   A choice's spec is `{ ...startingCut(key, name, board, tail), depth }` (flat: `startingCut` alone) — every other number is
   the name's starting number (D-08). `tail` matters only for a center single concave (D-42 reads only whether the tail is a
   vee): precompute two variants of each center single — tail not a vee (`undefined`) and tail a vee (`TAIL_VEE_NAMES[0]`)
   — and use the one matching each bottom's tail.
6. **Parts, precomputed once**: the points are every (section i, j). For every choice (and variant), `resolveCut(key, spec,
   board)` once, then `cutFoamOffParts(cut, board, "narrowest", station_i, across_ij)` at every point, its `concave` and
   `lift` stored in a `Float64Array`. Per point also `railOk = board.railAt(station) > 0` and
   `cap = max(0, board.thicknessAt(station) − BOTTOM_FLOOR)`.
7. **Every bottom**, loops nose (outer), center, tail (inner): at each point `foam = railOk ? min(max(0, cN + cC + cT), cap)
   + max(0, lN + lC + lT) : 0` — added in the order nose, center, tail, so it equals `sectionsFoamOff` of that bottom to the
   last bit; `h = foam − foam at that section's j = 0`; `gap = |target − h|`. Keep a running largest gap and sum; **drop the
   bottom the moment its largest gap exceeds the best value so far + `BRD_BOTTOM_PREFER_MM`** (its value can only be larger,
   so it can never be chosen); else value = largest + sum / points. Remember every bottom whose value was within the best so
   far + `BRD_BOTTOM_PREFER_MM` (indices only).
8. **The seed**: among the remembered bottoms whose value is within the FINAL best + `BRD_BOTTOM_PREFER_MM` (0.1 mm), the
   one with the fewest cuts (non-flat sections), then the smallest total of steps, then the earliest in the menus (nose
   index, then center, then tail), then the smaller value. So a cut is never added for less than a tenth of a millimetre,
   and a tie never invents depth. Built as a bottom by `brdBottomFromPicks`: `structuredClone(DEFAULT_BOTTOM)` with nose,
   center (built with the picked tail's name, D-42) and tail replaced — channels as `DEFAULT_BOTTOM` (none), wing rule
   Narrowest. Never channels, never wings, at any stage.

**Stage 2 — the sliders (the founder's amendment), over the file's sections AND the blends between them (steps 9a–9e).**

9a. **The blends** (`brdBottomBlends(sections)`): between each two neighbouring read sections more than
    `BRD_BOTTOM_BLEND_MAX_IN` (6") apart, `n − 1` evenly spaced stations, `n = ceil(gap / 6")`; at the share `t` of the way:
    reach = the two reaches blended, across = the same 25 shares of `BRD_BOTTOM_WINDOW x reach`, and the target at each
    index j = `(1 − t) x targetA[j] + t x targetB[j]` (the two sections' flat-tested targets, so two flat sections blend
    flat). None before the first read section or after the last. Doc-comment why: a 3D program draws a board between two of
    its sections as their blend (the founder's finding of 2026-11-10 in `lib/export/brd.ts`), so this is the file as those
    programs draw it, and without it the sliders overfit an AkuShaper file's 3–5 sections (measured: a 7/16" concave fading
    to nothing in 2 1/2" between two of the Fryer's sections). Stage 2 scores the read sections and the blends together,
    every point weighted the same; the figures SHOWN are measured on the read sections only (step 10).
9b. **The fast form of a cut** (exact for every cut whose Closes to a point box is off): a cut's concave and lift at a point
    of section i are `depth x fadeAt(start, deepest, end, station_i, length)` times its work at full fade and 1 mm depth —
    the latter worked out once per cut shape by `cutFoamOffParts` on a copy of the resolved cut with `start = length,
    deepest = 0, end = 0, depth = 1 mm, veeLift = veeLift / depth` (on that copy `fadeAt` returns 1 everywhere), and worked
    out again only when an across mark (Off Rail, Off Stringer, Trough At) changes — including when `keepStationsInOrder`
    moves a double's marks after Deepest At moved. A cut with Closes to a point ticked (the Teardrop's) is worked out point
    by point on every trial. Give the search the board through a wrapper that remembers `railAt`, `curveAt`,
    `narrowestAt`, `foamAt`, `thicknessAt` and `notchInner` per station (it only ever asks at the same few stations). No
    array is allocated per trial: one scratch buffer per cut. The value is the same as stage 1's: at each point
    `min(max(0, concave sum), cap) + max(0, lift sum)` less its section's j = 0 figure, against the target; largest +
    mean.
9c. **Refining a bottom** (`refine(specs, which cuts, rounds = 3)`): for each non-flat cut in the order tail, center, nose:
    - **Start, then Deepest At, then End**, each: the candidate stations are BOTTOM's own slider grid, taken from
      `bottomStationSlider(mm(0), length, "imperial")` (`toMm(min + k x step)` for every k up to `(max − min) / step`) —
      never restated; first every `BRD_BOTTOM_STATION_COARSE_IN / step` grid points (every 4"), then every grid point
      within 3 1/2" of the best coarse one. A candidate spec is made exactly the way a drag makes it:
      `keepStationsInOrder(key, { ...spec, ...storeCutStation(key, field, station, board) }, field, board, "narrowest")`.
      Each candidate is tried at the cut's depth and one Depth step either side (inside the range). Take the best; keep it
      only if it is at least `BRD_BOTTOM_MOVE_GAIN_MM` (0.1 mm) closer than the bottom as it stood.
    - **Depth**: every step 1…8; the same 0.1 mm rule.
    - **Its across marks, the cheap way** — only the ones that shape that cut across: a single concave's Off Rail; a
      double's Trough At, then its Off Rail; the Tri-Plane Hull Center's Off Stringer; a vee or belly has none. Candidates
      on the slider's own range and 1/16" step (`BOTTOM_MARK_RANGES_IN`, `BOTTOM_MARK_STEP_IN`): every 1/4"
      (`BRD_BOTTOM_MARK_COARSE_IN`), then each 1/16" within 3/16" of the best; a double's candidate goes through
      `keepStationsInOrder(key, spec, "deepest", board, "narrowest")` as the store does for a mark drag; the same 0.1 mm
      rule.
    Repeat the round until nothing moves, at most `rounds` times.
9d. **The neighbours, one round**: `seed = refine(stage-1 seed)`. Then, for every section and every OTHER name of its menu
    (15 in all): that name at its starting numbers (a center single built for the seed's tail, D-42) in that section's
    place, at the depth step 1…8 that scores best with the other two cuts as refined (a flat: depth 0), then — for a cut —
    `refine` of that cut alone (2 rounds), for a flat `refine` of the other cuts. Then `refine` in full (3 rounds) the three
    of those 15 that came out closest.
9e. **The choice**: among the refined seed and the 15, those within `BRD_BOTTOM_EXTRA_CUT_MM` (0.25 mm) of the closest;
    of those, the fewest cuts; of those, the refined seed if it is one, else the closest. (Measured: 0.1 mm let a round
    trip gain a spurious 1/16" cut; choosing by menu order picked a belly over a Tri-Plane.)
9f. **The bottom**: the chosen specs as a `BoardBottom` (`structuredClone(DEFAULT_BOTTOM)` with the three cuts replaced).
    Every station or mark the fit moved sits on its slider's own step; one it left is the name's starting number, exactly
    as a freshly picked cut holds it (BOTTOM shows an off-grid starting number where it is). `fitBottomToBrd` returns it
    measured (step 10) on the read sections.
10. **Measured for showing** (`measureBrdBottom(bottom, sections, board)`): `ours[j] = sectionsFoamOff(resolved, board,
    station, across_j) − sectionsFoamOff(…, station, 0)` (the plain slow path, so what is shown is the app's own number);
    per section its largest |file − ours| and where across; overall largest, mean (typical) over every point, and the
    station and across of the largest — against the file's OWN figures (not the flattened target), so the egg's 0.84 mm is
    reported.
11. **The stringer lift** (`brdStringerLift(bottom, board)`): `(s) => sectionsFoamOff(resolveBottom(bottom, board), board, s,
    0)` — non-zero only under a concave.
12. **The flow** (`brdFitLook(board)`, lib/export): `first = fitBoardToBrd(lines)`; no section read → `{ board, fit: first,
    bottom: null, planedBottom: board.bottom }`; else `board0 = brdFittedBottomBoard(first)`, `found =
    fitBottomToBrd(sectionLines, board0)`, `lift = brdStringerLift(found.bottom, board0)`; if `lift` is 0 at all 201 stations
    `L x i / 200` → `fit = first`, `planedBottom = board.bottom`; else `fit = fitBoardToBrd(lines, lift)` and `planedBottom =
    board.bottom` with each point moved down by `lift` at its own station; finally `bottom = measureBrdBottom(found.bottom,
    found.sections, brdFittedBottomBoard(fit))` so the figures shown are the board that opens.

## Changes to the brief, and my calls (flag every one in the SUMMARY for the founder)

1. **The planed rocker and thickness are refitted under a concave** (the brief said "everything else as et0 left it") —
   **confirmed by the founder, 2026-11-13** ("for concaves the stinger rocker will always be more, and with flat, vee or
   belly the stringer rocker will always match"): without it a concave board opens thinner and higher than the file by
   the concave's depth (Scoop nose 12": 3/8"), and a concave board's round trip does not come back. Boards without a
   concave (the egg, every vee or belly) are untouched to the last bit. The rocker and thickness tables' "Our fit"
   figures become our finished stringer's (identical to today's when nothing lifts the stringer); under the rocker table
   one line always says what the two rockers are, and a second, when a concave lifts the stringer, says by how much and
   where. The leftover ripple where our concave's ends miss the file's is reported, never chased.
2. **gwo's blank suggestion is matched to the planed line** (the file's stringer less our concaves): the blank is what is
   planed; the concave is cut afterwards. Identical to gwo's today on a board with no concave.
3. **"Cut kind and depth" is a name, a depth and the cut's sliders** (amended at the founder's request): the fit picks the
   name and depth, then moves that cut's Start, Deepest At and End along the board and its one or two across marks, on
   BOTTOM's own slider steps, and compares every other name of each section with its sliders free too. Smoothness, Vee
   Lift and Closes to a point stay the name's own. Once the sliders move, two names of one kind in one section are the same
   cut with different starting numbers, so the name shown may be either (Deep or Shallow Single Concave, Panel or Rolled
   Vee); the kind, the depth and the sliders are what the fit stands behind.
4. **The grids are BOTTOM's Imperial ones in both systems**: depths and marks on 1/16" (D-06: "0 to 1/2" in 1/16"
   steps", and every starting number sits on it), stations on the station sliders' 1/2" grid from the nose. In Metric the
   sliders then move in whole millimetres (marks) and 10 mm (stations) from there, exactly as they do from any preset's
   starting numbers. The board is the same whichever system the shaper picked when it was opened.
5. **Three drawings, at the file's own sections nearest 12" from the tail, the centre and 12" from the nose** — real file
   sections, the same three the table reads (one per row; each section used once; a file with fewer sections leaves a
   row with "No section here"). Drawing all of a file's sections would mean 20–35 for the app's own files.
6. **The drawings show the bottom only, over the part that is read** (stringer to 9/10 of the reach, mirrored rail to
   rail), not the whole section with its deck: at x4 a whole section would need BOTTOM's break line. They get their own
   Height pick opening at x4 (BOTTOM's section opens at x4, D-13); the side view's stays at x1.
7. **The bottom's closeness is a fourth HOW CLOSE line** ("Bottom: within …, typically … — the widest gap at the section
   12" from the tail, 3 7/8" out from the stringer"), and the controls list gains a Bottom line.
8. **Second page only when needed**: the overview stays one page unless the two views would get less than 45 mm, when the
   BOTTOM block moves to a second page (the brief: one page the aim, never clipped).
9. **The mark sliders' ranges and step move from `components/bottom/bottom-controls.tsx` into `lib/geometry/bottom.ts`**
   (`BOTTOM_MARK_STEP_IN`, `BOTTOM_DEPTH_RANGE_IN`, `BOTTOM_MARK_RANGES_IN`) so the fit imports them instead of restating
   them; the station sliders' grid is read from `bottomStationSlider` itself.
10. **The bottom is also compared between the file's sections**, as the blend of its neighbours (step 9a) — the file as
    AkuShaper and Shape3D draw it; the figures shown are still the file's own sections'.
11. **The table turns round** to carry the sliders: Nose, Centre and Tail across; down, Read at, The file, Our fit, Start ·
    Deepest At · End, and Across (the fitted marks) — on screen and on paper alike.
12. **Honest limits:** soft rolled rails read as belly until the rails task (testLB.brd); a slider the fit did not need
    can sit anywhere the file's few sections cannot see (it stays at the name's starting number unless moving it gains
    0.1 mm); in a mix of three moved cuts the sliders come back only roughly (kind and depth exactly).

## Interfaces (Task 1 adds; Tasks 2–3 use these names)

```ts
// lib/export/brd-read.ts
export const BRD_READ_MAX_SECTIONS = 64;
export interface ReadBrdSection {
  station: Mm;                 // along the board from the tail
  points: P2[];                // the whole half section sampled (out from the stringer, up from the stringer's bottom), stringer bottom first, round the rail, to the deck
  knots: BrdReadKnot[];        // as read, centimetres (the rails task re-samples from these if it needs to)
}
// ReadBrdBoard gains: sections: ReadBrdSection[]   (tail to nose; [] when none usable)

// lib/geometry/bottom.ts (moved out of components/bottom/bottom-controls.tsx's MARK_ROWS / MARK_STEP_IN, values unchanged)
export const BOTTOM_MARK_STEP_IN = 1 / 16;
export const BOTTOM_DEPTH_RANGE_IN = { min: 0, max: 0.5 } as const;
export const BOTTOM_MARK_RANGES_IN = {
  offRail: { min: 0, max: 6 }, offStringer: { min: 0, max: 9 }, troughAt: { min: 0.5, max: 8 },
  depth: BOTTOM_DEPTH_RANGE_IN, veeLift: { min: 0, max: 0.5 },
} as const;
// (the station sliders' grid stays where it is: bottomStationSlider in lib/geometry/blank-reasons.ts)

// lib/geometry/brd-fit.ts
export function fitBoardToBrd(given: BrdLines, stringerLift?: (station: Mm) => number): BrdFit;
// BrdFit gains: stringerLift: Record<RockerStationKey, Mm>   (all mm(0) without a lift)

// lib/geometry/brd-bottom.ts — pure
export const BRD_BOTTOM_WINDOW = 0.9;
export const BRD_BOTTOM_ACROSS_STEPS = 24;
export const BRD_BOTTOM_FLAT_MM: Mm;        // mm(1)
export const BRD_BOTTOM_PREFER_MM: Mm;      // mm(0.1)  stage 1: a cut must earn 0.1 mm
export const BRD_BOTTOM_EXTRA_CUT_MM: Mm;   // mm(0.25) stage 2's choice: a cut not in the seed must earn 0.25 mm
export const BRD_BOTTOM_MOVE_GAIN_MM: Mm;   // mm(0.1)  a slider moves only for 0.1 mm closer
export const BRD_BOTTOM_BLEND_MAX_IN = 6;   // blends between read sections no more than 6" apart
export const BRD_BOTTOM_STATION_COARSE_IN = 4; // the station sweep's coarse spacing (then every slider step near the best)
export const BRD_BOTTOM_MARK_COARSE_IN = 1 / 4; // the across-mark sweep's coarse spacing (then every 1/16" near the best)
export const BRD_BOTTOM_BELLY_SHARE = 1 / 3;
export interface BrdSectionLine { station: Mm; points: readonly P2[] }
export interface BrdBottomReading { kind: BottomCutKind; depth: Mm }
export interface BrdBottomSection {
  station: Mm; reach: Mm;
  across: Mm[]; file: Mm[]; flat: boolean; reads: BrdBottomReading;
  ours: Mm[]; gap: { largest: Mm; across: Mm };       // [] and 0 until measured
}
export interface BrdBottomFit {
  bottom: BoardBottom;
  sections: BrdBottomSection[];
  closeness: { largest: Mm; typical: Mm; station: Mm; across: Mm };
}
export function brdBottomSections(sections: readonly BrdSectionLine[], length: Mm): BrdBottomSection[];
export interface BrdBottomTarget { station: Mm; across: Mm[]; target: Mm[] }   // what a search scores against
export function brdBottomBlends(sections: readonly BrdBottomSection[]): BrdBottomTarget[]; // the read sections' targets and the blends between, tail to nose
export function readBrdBottom(across: readonly number[], file: readonly number[]): BrdBottomReading;
export function brdFittedBottomBoard(fit: Pick<BrdFit, "outline" | "rocker" | "foil">): BottomBoard;
export type BrdBottomPicks = Record<BottomSectionKey, { name: BottomCutName; steps: number }>;
export function brdBottomFromPicks(picks: BrdBottomPicks, board: BottomBoard): BoardBottom;
export function fitBottomToBrd(sections: readonly BrdSectionLine[], board: BottomBoard): BrdBottomFit | null; // null: no section read
export function measureBrdBottom(bottom: BoardBottom, sections: readonly BrdBottomSection[], board: BottomBoard): BrdBottomFit;
export function brdStringerLift(bottom: BoardBottom, board: BottomBoard): (station: Mm) => Mm;

// lib/export/brd-fit-preview.ts
export interface BrdFitLook { board: ReadBrdBoard; fit: BrdFit; bottom: BrdBottomFit | null; planedBottom: P2[] }
export function brdFitLook(board: ReadBrdBoard): BrdFitLook;
// Task 2:
export interface BrdBottomRow { key: BottomSectionKey; section: BrdBottomSection | null }
export function brdBottomRows(look: BrdFitLook): BrdBottomRow[];              // nose, center, tail
export const BRD_BOTTOM_DRAWING_WIDTH = 1000;
export interface BrdBottomDrawing { key: BottomSectionKey; file: P2[]; fit: P2[]; straightedge: { x1: number; x2: number; y: number }; stringer: { x: number; y1: number; y2: number } }
export interface BrdBottomFrames { width: number; height: number; heightAsked: SectionHeight; heightDrawn: number; drawings: BrdBottomDrawing[] }
export function brdBottomFrames(rows: readonly BrdBottomRow[], height: SectionHeight): BrdBottomFrames;
// BrdFitSheet gains: closeness.bottom: string | null; rockerLines: string; stringerNote: string | null; controls.bottom: string | null;
//   bottom: { read: true; caption: string;
//             columns: { key: BottomSectionKey; label: string; drawingCaption: string | null }[];   // Nose, Centre, Tail
//             rows: { key: "at" | "file" | "fit" | "stations" | "across"; label: string; cells: [string, string, string] }[];
//             notes: string[] }
//         | { read: false; caption: string; line: string }
//   (drawingCaption = BRD_FIT_COPY.bottomSectionCaption(at, formatDim(2 x reach)) for a column with a section, else null;
//    the CROSS-SECTIONS caption is made where the frames are, from sectionHeightLabel of brdBottomFrames' heights)
// lib/models/brd-board.ts
export function brdBoardFields(fit, fileName, bottom?: BoardBottom | null): DesignSnapshotFields | null;
```

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Read the cross-sections, fit the bottom exactly, and plane the board under a concave — lib, tested</name>
  <files>lib/export/brd-read.ts, lib/export/brd-read.test.ts, lib/geometry/bottom.ts, components/bottom/bottom-controls.tsx, lib/geometry/brd-fit.ts, lib/geometry/brd-fit.test.ts, lib/geometry/brd-bottom.ts, lib/geometry/brd-bottom.test.ts, lib/export/brd-fit-preview.ts, lib/export/brd-fit-preview.test.ts, components/setup/open-board-file.tsx, components/setup/brd-blank-suggestions.tsx, plus every test or spec that builds a ReadBrdBoard or a BrdFitLook by hand (find them with grep; at plan time components/template/build-brd-overview-pdf.test.ts, lib/geometry/brd-blank-suggest.test.ts, lib/export/brd-blank-words.test.ts, e2e/brd-fit-preview.spec.ts)</files>
  <read_first>W/lib/export/brd-read.ts and its test (the bounded reader, parseKnot, the "never looks at the cross-sections" test); W/lib/export/brd.ts (brdText's p35 block, BRD_SECTION_TARGET_MM, BRD_SECTIONS_MAX, brdFileBottom, brdBottomStations, readBrdText's section layout) and W/lib/export/brd.test.ts's cutSurface/surfaceAndText helpers (how a board with a bottom is written); W/lib/export/brd-preview.ts (sampleKnots, BRD_PREVIEW_SECTION_STEPS); W/lib/geometry/bottom.ts (BoardBottom, BOTTOM_CUT_NAMES, startingCut, resolveCut, cutFoamOffParts, sectionsFoamOff, BOTTOM_FLOOR, isTailVee, TAIL_VEE_NAMES, DEFAULT_BOTTOM, bottomHasCut); W/components/bottom/bottom-controls.tsx (MARK_STEP_IN, MARK_ROWS); W/lib/geometry/bottom.ts again for keepStationsInOrder, storeCutStation, fadeAt, stationFromNearestTip; W/lib/geometry/blank-reasons.ts (bottomStationSlider — the station sliders' grid); W/components/design/design-store.tsx updateBottomCut (how a drag stores a station or a mark); W/lib/geometry/design.ts (designBottomBoard, designFinPlacement, designSideProfile); W/lib/geometry/brd-fit.ts (fitSideProfile, fitBoardToBrd, BrdFit, BRD_FIT_TIP_SKIP_MM); W/lib/export/brd-fit-preview.ts (BrdFitLook) and W/components/setup/open-board-file.tsx (where the look is made); W/components/setup/brd-blank-suggestions.tsx (the suggestBlanks call); S/gwr/exhaust.ts, S/gwr/refine3.ts, S/gwr/fit7.ts, S/gwr/blend.ts, S/gwr/memo.ts and S/gwr/fitlib.ts (the planner's measured search, to compare against — never copy them into the repo; the plan's method is the specification, where they differ the plan wins).</read_first>
  <behavior>
    - readAnyBrd on a hand-made AkuShaper-layout text (made-up numbers only; Windows line ends; header p01/p03/p04 and a folder-path field; p32–p34 simple curves; p35 with a one-knot all-zero section at 0.0, two 5-knot sections whose knots carry `true false`, the first followed by a `gps : (` block of two `(gp [x,y])` lines and `)`, then a one-knot end section and the closing `)`): ok, the outline/bottom/deck as before, sections.length 2, stations in mm (centimetresToMm), each section's points start at (0, 0) and its knots are the 5 read; the plain and the stamped (scrambleBrd) copies read the same.
    - A section with one bad knot line is dropped and the board still reads with the others; a section whose station is outside the board by more than 1 cm is dropped; more than BRD_READ_MAX_SECTIONS sections keeps the first 64; a section with more than BRD_READ_MAX_KNOTS knots is dropped; a file with no p35 block reads with sections []; the app's own Shortboard file reads every fitted section (curves.sections.length of them, the two one-knot tips dropped). Replace the old "never looks at the cross-sections" test with: junk inside a section drops that section only.
    - readBrdBottom: all values within 1 mm → flat, depth 0; a straight rise to 3 mm → vee 3; 3 x (1 − cos(πu/2)) → belly; a fall to −4 mm → single 4; a rise to 2.5 mm at 60% then back to 0.5 → double 2.5.
    - brdBottomSections on a made-up 1000 mm board: a section at 10 mm from the tail is left out, one at exactly 25.4 mm is kept; reach is the widest x; across runs 0…0.9 x reach in 24 steps; a section straying 0.9 mm reads flat, 1.1 mm does not.
    - brdFittedBottomBoard(fit) agrees with designBottomBoard of brdBoardFields(fit, name)'s fields (length, widePoint, widePointWidth, frontFins, toeDegrees; railAt and thicknessAt at 50 stations to 1e-9).
    - brdBottomBlends: two read sections 20" apart get three blends at 5", 10", 15" in (ceil(20/6) = 4 spaces), each target the straight blend of the two targets at the same index; two flat sections blend to all zeros; sections 6" or less apart get none; nothing outside the first and last read section.
    - The fast form (step 9b) is exact: for 200 seeded random bottoms (any names but the Teardrop, any depths, stations on the slider grid, marks on their grid) the fast value equals the value computed through resolveBottom + sectionsFoamOff at the same points to 1e-9; a Teardrop goes the slow way and also agrees.
    - fitBottomToBrd: the app's flat Shortboard file → every section flat and every cut flat; a made-up case whose targets are exactly one bottom's at its starting numbers → that bottom, no slider moved; the same with that bottom's Deepest At moved 10" on the slider grid → the moved Deepest At comes back within 1"; the chosen bottom's measured closeness equals measureBrdBottom of it to 1e-9; every station the fit moved is on bottomStationSlider's grid (|(length − station) / step − round| < 1e-9 in inches) and every mark it moved on its 1/16" grid inside BOTTOM_MARK_RANGES_IN; returns null for no sections.
    - Round trips (module-scope builders, one file per case, written the way brd.test.ts's surfaceAndText writes a board with a bottom): on the Shortboard each of the 15 non-flat names alone at its starting depth; the mixes Deep Single Concave + Double Concave Exit, Tri-Plane Hull Center + Panel Vee, Teardrop Nose Concave + Shallow Single Concave + Spiral Vee, Blended Nose Concave 1/16" + Deep Single Concave 3/16" + Rolled Vee 1/8"; and the moved-slider cases (each station put on the slider grid the way a drag does, through storeCutStation + keepStationsInOrder): Deep Single Concave with Deepest At 8" toward the nose; Double Concave Exit 1/8" with Trough At 4 1/2" and Off Rail 1/2"; Blended Nose Concave 1/4" with Start at the nose and Deepest At 18" from the nose; Panel Vee 3/16" with Start 30" and Deepest At 8" from the tail; Teardrop 3/16" deepest 14" from the nose + Deep Single 3/16" Off Rail 1" + Double Concave Exit 1/8" Trough At 4". Every section's cut KIND and DEPTH come back (names may swap within a section and kind); in the four one-cut moved cases each moved station comes back within 4" and each moved mark within 1/8" (as resolved stations from the tail and stored marks, whatever the name); in every case the fitted bottom's value against the file is no more than 0.2 mm above the written bottom's own value against the same file (planner measured: 19 of 20 at or below it, the three-cut mix +0.14). Also the four mixes on the Mid-length, kind and depth. If the file takes more than 60 s, keep every kind in every section once plus the five moved cases, and say so in the SUMMARY.
    - fitBoardToBrd(lines) with no lift is unchanged (every existing brd-fit test green) and its stringerLift is all zero; with a lift: fit.lines.bottom[i] = centre + rockerAt(s) + lift(s) and fit.lines.deck[i] = centre + rockerAt(s) + thicknessAt(s), where centre is the lowest of (file bottom − lift) at L/2; the closeness equals a fit of the lowered lines (lines.bottom minus lift) drawn the same way; stringerLift[key] = lift at each rockerStationPositions station.
    - brdFitLook: the flat Shortboard's look has fit deep-equal to fitBoardToBrd(lines) and planedBottom === board.bottom; a Shortboard with a 1/4" Deep Single Concave, written and read back: bottom picks a single concave 4 steps deep in the center, and the look's planed rocker and foil are within 1 mm of the flat Shortboard's own look at every station (planner measured 0.1 mm worst here, 0.5 mm for a Blended Nose Concave + Extending Single Concave pair); a ReadBrdBoard with sections [] gives bottom null.
    - **The founder's rule, as two tests.** (1) A flat, vee or belly fit leaves the board exactly as today: for the app's own files of the Shortboard with a Panel Vee, with a Continuous Belly / Rolled Mid, and flat (first assert their fitted bottoms hold no single or double concave), `brdFitLook(board).fit` deep-equals `fitBoardToBrd(lines)` (rocker, foil, lines, closeness, to the last digit) and `planedBottom === board.bottom`. (2) A concave fit lowers the planed rocker by its depth along the stringer: for the Deep Single Concave file, at every point of `board.bottom`, `planedBottom[i][1] === board.bottom[i][1] − brdStringerLift(look.bottom.bottom, brdFittedBottomBoard(first fit))(x)` and that lift is positive under the concave and zero where it has faded out; and `look.fit.lines.bottom` (the drawn finished stringer) less the planed rocker line (centre + rockerAt) equals the lift at every drawn station to 1e-9.
  </behavior>
  <action>
Write the tests above first (RED), then the code (GREEN). Rule 1 throughout: pure, millimetres via `mm()`, every inch figure through `inchesToMm`, nothing rounded (the founder: a board keeps actual values; only the Depth control's 1/16" steps are steps).

**lib/export/brd-read.ts.** Keep the header comment's facts, replace "Reading stops at the cross-sections, which are never read (R3)" with what is read now (quick 261113-gwr, the founder's words, the bounds). Stop breaking out of the loop after the third curve; on `p35 : (` enter a section mode that runs until its closing `)` or the line cap: a line `(p36 <num> …` starts a section (station = `Number` of the first figure, centimetres; anything not finite marks the section bad); a knot line goes through `parseKnot` (null, or past `BRD_READ_MAX_KNOTS`, marks the section bad); a line `gps : (` skips every line up to and including the next lone `)`; a lone `)` closes the open section — kept only when it is good, has 2 or more knots, its station converted with `centimetresToMm` lies within the board ±`BRD_REACH_MM`, and every sampled point (`sampleKnots(knots, BRD_PREVIEW_SECTION_STEPS)`) is finite — or, with no section open, ends the block; any other line inside a section marks it bad. At `BRD_READ_MAX_SECTIONS` kept sections stop reading sections. Nothing in the section block can make the file unreadable or throw out of `readAnyBrd`; the outline, bottom and deck rules are unchanged. Sort kept sections by station. Export `ReadBrdSection` and the cap; `ReadBrdBoard.sections` is required.

**lib/geometry/bottom.ts**: add `BOTTOM_MARK_STEP_IN`, `BOTTOM_DEPTH_RANGE_IN` and `BOTTOM_MARK_RANGES_IN` beside the other constants with a doc comment citing D-06 and UI-SPEC §1; **components/bottom/bottom-controls.tsx**: `MARK_STEP_IN` becomes the import and every `MARK_ROWS` entry's `rangeIn` reads `BOTTOM_MARK_RANGES_IN[field]` (values unchanged; nothing else in that file moves).

**lib/geometry/brd-fit.ts** (only this — quick 261113-hyy rewrites the outline fit after you, so leave every outline line alone): `fitBoardToBrd(given, stringerLift?)` passes the lift to `fitSideProfile`, which, when it is set, fits to `bottom` = `given.bottom` with each point lowered by `stringerLift(mm(x))` (the deck unchanged — the planed deck is the finished deck) and draws `ourBottom` as `low + stringerLift(s)` (our finished stringer); every other line of the fit is untouched, so the five-station rocker stays smooth by construction, follows the file's stringer less our concave, and the closeness it reports is our finished stringer against the file's — the honest home of any ripple where our concave's ends miss the file's. `BrdFit.stringerLift` holds the lift at each `rockerStationPositions` station (mm(0) without one). Extend the header comment with one paragraph in the founder's words of 2026-11-13 (quoted in the objective): the file's rocker is the finished board's along the stringer, ours the board before contours; under a flat, vee or belly the two match and nothing changes; under a concave the finished stringer reads more by the concave's depth, so the board is planed exactly that much lower; and the round trip it was measured on.

**lib/geometry/brd-bottom.ts** (new; header comment: the brief's quote and the founder's amendment quote, the method in a shaper's words, the window, the 1 mm flat rule and why, the blends and why, the seed search and its 0.1 mm preference, the slider refinement on BOTTOM's own steps and its 0.1 mm gain, the neighbours and the 0.25 mm bar for a cut, the limits): implement "The method, written out" steps 2–11 (9a–9f included) exactly, with the interfaces above. The seed search (steps 5–8) is one private function and never calls `resolveBottom` or `sectionsFoamOff` inside the 68,921-bottom loop; the refinement (9b–9e) uses the fast form, a remembering board wrapper and scratch buffers, never an allocation per trial. Import the station grid from `blank-reasons.ts` (`bottomStationSlider`) and the mark ranges and step from `bottom.ts` — no slider figure is written in this file. Imports from `bottom.ts`, `blank-reasons.ts`, `design.ts`, `outline.ts`, `brd-fit.ts` (types, `BRD_FIT_TIP_SKIP_MM`), `units.ts`; no React, browser or database import.

**lib/export/brd-fit-preview.ts**: `BrdFitLook` gains `bottom` and `planedBottom`; add `brdFitLook(board)` (step 12; doc-comment the flow). Change nothing else here in this task.

**Callers**: `components/setup/open-board-file.tsx` makes its look with `brdFitLook(board)` (its `fields` stay `brdBoardFields(look.fit, file.name)` until Task 2). `components/setup/brd-blank-suggestions.tsx` passes `bottom: inputs.look.planedBottom` to `suggestBlanks` in place of the file's own bottom line, with a one-line comment (the blank is what is planed; the concave is cut afterwards — identical on a board with no concave). If gwo's call no longer takes a line that way, do not restructure gwo: leave it and record it under "Found, not fixed". Update every hand-built `ReadBrdBoard` (`sections: []`) and `BrdFitLook` (use `brdFitLook(board)`, or add `bottom: null, planedBottom: board.bottom` where the look is made-up lines) so tsc is clean.

Then write `S/gwr/check.ts` (imports `readAnyBrd` and `brdFitLook` by absolute path from W, reads the four AkuShaper files and `mid.brd`, `testLB.brd`, prints each file's three cuts with depth, every slider moved off its starting number (from → to, in BOTTOM's words), the bottom closeness on the read sections, the rocker and thickness closeness, and the CPU time of `brdFitLook` via `process.cpuUsage`) and run it. Compare with the planner's amendment table: the kinds and depths must match; names, moved sliders and gaps should match (a gap within 0.1 mm) — where they differ, the plan's method is what counts: say what differs and why in the SUMMARY rather than tuning numbers to the table. **Time budget:** `brdFitLook` (both side-profile fits and the bottom) under 500 ms CPU for each of the four AkuShaper files on this Mac (planner: 180–330 ms for the bottom fit alone with the machine at a load of 11–40; report the load with the times). If over, apply in this order and re-measure: drop the depth-either-side tries in the station sweep to the last round only; refine fully only the best two neighbours; coarse station spacing 8". Report the times and anything applied. Keep the script and its output out of the repo.
  </action>
  <verify>
    <automated>/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/vitest run --root /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 lib/export/brd-read.test.ts lib/geometry/brd-bottom.test.ts lib/geometry/brd-fit.test.ts lib/export/brd-fit-preview.test.ts lib/models/brd-board.test.ts lib/geometry/brd-blank-suggest.test.ts lib/export/brd-blank-words.test.ts lib/geometry/bottom.test.ts components/bottom components/template/build-brd-overview-pdf.test.ts lib/export/brd.test.ts lib/units-isolation.test.ts && /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/tsc --noEmit -p /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/tsconfig.json && npm --prefix /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 run lint && /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/tsx --tsconfig /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/tsconfig.json /private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/gwr/check.ts</automated>
  </verify>
  <done>New tests fail before the code and pass after; every existing test in the touched files stays green; the check script's kinds and depths match the planner's table and its times are inside the budget (or the fallbacks are applied and reported); tsc and lint clean (the one known old lint warning aside). One commit, plain English, e.g. "The app can now read a .brd's cross-sections and work out the closest bottom BOTTOM's own cuts and sliders make, planing the board lower under a concave so its stringer stays the file's (maths and tests only)".</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The BOTTOM block on the preview and the printed overview; Open as a Board carries the bottom</name>
  <files>lib/export/brd-fit-preview.ts, lib/export/brd-fit-preview.test.ts, lib/models/brd-board.ts, lib/models/brd-board.test.ts, components/setup/brd-fit-dialog.tsx, components/setup/open-board-file.tsx, components/template/build-brd-overview-pdf.ts, components/template/build-brd-overview-pdf.test.ts, e2e/brd-fit-preview.spec.ts</files>
  <read_first>The files of Task 1 as committed; W/lib/export/brd-fit-preview.ts as it stands (BRD_FIT_COPY, closenessSentence, gapWhere, sideTable, brdFitSheet, brdFitFramesInBox); W/components/setup/brd-fit-dialog.tsx (FitBody, FitTable, the HeightPicker use, CAPTION_CLASS, railLineProps, gwo's block); W/components/bottom/bottom-section.tsx (HeightPicker and its `which` prop); W/lib/geometry/bottom-draw.ts (SectionHeight, sectionHeightLabel, how bottomSection fits a cut that would leave its room); W/components/template/build-brd-overview-pdf.ts (Item kinds, heightOf, the under-list, the box-height rule, the foot check, its cell-shrink rule, gwo's block); W/lib/models/brd-board.ts and W/lib/models/design-snapshot.ts rule 14 (the optional bottom); W/lib/geometry/measure-display.ts (formatMark, formatMarkOrLess, formatDim).</read_first>
  <behavior>
    - brdBottomRows: for the round-trip Deep Single Concave Shortboard the three rows are the file sections nearest MEASURE_STATION_MM, L/2 and L − MEASURE_STATION_MM, each used once (assigned by the nearest pair first); a made-up look with two sections leaves exactly one row with section null; bottom null gives three null rows.
    - brdBottomFrames: drawings in nose, center, tail order for the rows that have a section; each file and fit line is mirrored about x = 500 (first point's x = 1000 − last point's x, to 1e-9) and runs over the section's window; one scale across for all three (the widest window spans 1000 less the air); at x4 the height (less pads) is four times x1's unless capped, when heightDrawn < heightAsked and the label reads the drawn factor through sectionHeightLabel; a flat file still has a non-zero height.
    - brdFitSheet, Imperial and Metric: closeness.bottom is closenessSentence("Bottom", …) with "out from the stringer" and the section's station words, null when bottom is null; the bottom table has three columns Nose, Centre, Tail and five rows: `at` (gapWhere of the column's section, or "No section here"), `file` (the kind word plus formatMark(depth); "Flat" alone), `fit` (the name plus formatMark(depth); the flat name alone), `stations` (for a cut: `${start} · ${deepest} · ${end} from the nose` for the Nose cut and `… from the tail` for the others, each formatBottomStation of stationFromNearestTip of the RESOLVED cut, exactly BOTTOM's own label figures; "—" for a flat) and `across` (the fitted marks the cut has, in BOTTOM's words: a single `Off Rail 5/16"`; a double `Trough At 4 5/8" · Off Rail 0"` with its Off Stringer when it has one; the Tri-Plane `Off Stringer 4 7/8"`; "—" for a vee, a belly or a flat), every figure a mark through formatMark; the slider words (Start, Deepest At, End, Off Rail, Off Stringer, Trough At) equal BOTTOM_COPY's (a test imports components/bottom/bottom-copy to check); notes = the window note and the sections-read line; `rockerLines` is always the founder's two-rockers line; stringerNote non-null exactly when some station's stringerLift > 0; the rocker table's "Our fit" = fit.rocker + stringerLift − stringerLift.center and the thickness table's = fit.foil − stringerLift (unchanged figures for the flat Shortboard); controls.bottom lists the three fitted cells; notRead reads "Rails and wings or flyers aren't read from the file. Add these by hand once the board is open." when the bottom was read and today's sentence when it was not, with bottom = { read: false, line } then.
    - brdBoardFields(fit, name, bottom): with a bottom that cuts (bottomHasCut) the fields carry it and it reads back deep-equal through readBoardEntry; flat or absent → no bottom key (et0's test stays); for the concave round trip the opened board's finished stringer (designSideProfile(fields).rockerAt(s) + sectionsFoamOff at y = 0 on brdFittedBottomBoard(fit), less the same at L/2) equals fit.lines.bottom less its centre value within 0.05 mm at all 201 stations (report the measured worst).
    - buildBrdOverviewPdf: the BOTTOM block prints (caption, three drawings with captions, the table, the notes) and controls.bottom; one page for the flat Shortboard and Midlength and the concave Shortboard at side Height 1, 2 and 4 with sections at 4, in both systems; never more than two pages for any case of the existing matrix (Height 8, 200-letter names, the made-up 10'0" board) and every baseline inside its own page; a look with bottom null prints the unread line; the units-isolation walk stays green.
  </behavior>
  <action>
**lib/export/brd-fit-preview.ts.** Add to `BRD_FIT_COPY`: `bottomCaption` "BOTTOM"; `bottomSectionsCaption(heightLabel)` → `CROSS-SECTIONS · ${heightLabel}`; `bottomSectionCaption(where, width)` → `${where} · ${width} wide`; `bottomColumns` { nose: "Nose", center: "Centre", tail: "Tail" }; `bottomRowLabels` { at: "Read at", file: "The file", fit: "Our fit", stations: "Start · Deepest At · End", across: "Across" }; `bottomSliderWords` { start: "Start", deepestAt: "Deepest At", end: "End", offRail: "Off Rail", offStringer: "Off Stringer", troughAt: "Trough At" } (BOTTOM_COPY's own words, copied because lib/ cannot import a component; the test pins them equal); `fromNose`/`fromTail` (list) → `${list} from the nose` / `${list} from the tail`; `noValue` "—" (the stations and across cells read the fitted cuts resolved on `brdFittedBottomBoard(look.fit)`, the board that opens); `rockerLines` "The file's rocker is the finished board's, along the stringer; ours is the board before contours. Under a concave the finished rocker reads more, by the concave's depth there; under a flat, vee or belly the two are the same line." (the founder's rule of 2026-11-13 in a line; shown under the rocker table always, on screen and paper); `bottomKinds` { flat: "Flat", belly: "Belly", vee: "Vee", single: "Single concave", double: "Double concave" }; `noSection` "No section here"; `bottomWindowNote` "The bottom is read across each of the file's cross-sections, from the stringer to nine-tenths of the way out to the rail; the rail itself isn't read yet. A section that is all but flat reads as flat."; `sectionsRead(used, total, tipSkip)` → `Read from ${used} of the file's ${total} cross-sections; the ones within ${tipSkip} of a tip are left out.`; `bottomUnread` "The file's bottom couldn't be read: it has no cross-sections we could use, so the board opens with a flat bottom."; `stringerNote(lift, station)` → `Our fit's concaves lift its stringer by up to ${lift} (at ${station}): the figures above are the finished stringer's. The board is planed that much lower there, and ROCKER shows the rocker before contours once the board is open.`; `bottomLine(nose, center, tail)` → `Bottom: ${nose} · ${center} · ${tail}`; `notReadAfterBottom` "Rails and wings or flyers aren't read from the file. Add these by hand once the board is open." (keep `notRead` for the unread case). `closenessSentence` accepts "Bottom". The bottom's close words: largest/typical via formatMarkOrLess, `where` = `at the section ${gapWhere(station)}, ${formatMark(across)} out from the stringer`, side null. `total` in sectionsRead = `look.board.sections.length`; `used` = `look.bottom.sections.length`; tipSkip = formatDim(BRD_FIT_TIP_SKIP_MM). The stringer note names the station (sideLabel) with the largest stringerLift and that lift through formatMark. Add `brdBottomRows` and `brdBottomFrames` (interfaces above): width 1000 units; air 30 units a side; pads 16 units top and bottom; `kx = (1000 − 60) / (2 x the largest window)`; `up` = max(1, the largest file or fit value of the drawn rows), `down` = max(1, −the smallest); `ky = kx x height`, but when `(up + down) x ky > 260 − 32` use `ky = (260 − 32) / (up + down)`; `height = 32 + (up + down) x ky`; baseline `y0 = 16 + up x ky`; a value v across a at x = 500 ± a x kx, y = y0 − v x ky (up is up); each line runs from the window's left end through the stringer to its right end; the straightedge runs the widest window plus 10 units each way at y0; the stringer tick from y0 − up x ky to y0 + down x ky; `heightDrawn = ky / kx`. Every word and figure of the block goes into `brdFitSheet` so the dialog and the paper print the same.

**lib/models/brd-board.ts**: `brdBoardFields(fit, fileName, bottom?)` adds `bottom` to the fields only when `bottom && bottomHasCut(bottom)`; update the header comment (the bottom opens with the board; flat leaves no key, as a new board).

**components/setup/open-board-file.tsx**: `fields = brdBoardFields(look.fit, file.name, look.bottom?.bottom ?? null)`.

**components/setup/brd-fit-dialog.tsx**: a fourth HOW CLOSE line `data-brd-fit-close-bottom` when `sheet.closeness.bottom`; `data-brd-fit-rocker-lines` (always) and `data-brd-fit-stringer-note` (when set) after the rocker-use line and point notes; then the BOTTOM block `data-brd-fit-bottom` placed after gwo's suggestions block and before OUR CLOSEST FIT: its caption (CAPTION_CLASS), when read: `frames = useMemo(() => brdBottomFrames(brdBottomRows(look), sectionHeight), …)`; the caption row with `BRD_FIT_COPY.bottomSectionsCaption(sectionHeightLabel(frames))` and a second `<HeightPicker which="section">` in `data-brd-fit-section-height` holding its own state opening at 4 (`useState<SectionHeight>(4)`); the drawings in a grid `grid gap-3 grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]`, each a figure `data-brd-fit-section={key}` with its column's `drawingCaption` (`data-brd-fit-section-caption`) and an `<svg viewBox="0 0 1000 {height}" className="w-full h-auto">` drawing the straightedge and stringer as the top view draws its stringer, the file line `data-brd-fit-line="file"` in the file's ink and our line `data-brd-fit-line="fit"` with `railLineProps(1)`, all strokes `vectorEffect="non-scaling-stroke"`; a full-width table `data-brd-fit-bottom-table` (caption-less; a header row of an empty cell and `th scope="col"` Nose / Centre / Tail; five rows `data-brd-fit-bottom-row={at|file|fit|stations|across}`, each a `th scope="row"` label in muted ink and three `td data-brd-fit-cell={nose|center|tail}`; text-xs, cells wrap, tabular figures — on an upright phone the three columns stay and their words wrap); `data-brd-fit-bottom-note` lines. When unread: `data-brd-fit-bottom-unread` with the line, no drawings. `data-brd-fit-control="bottom"` under the controls when set. Print Overview hands the section height to the PDF builder too.

**components/template/build-brd-overview-pdf.ts**: options gain `sectionHeight`; the builder takes `frames = brdBottomFrames(brdBottomRows(look), sectionHeight)` and prints the CROSS-SECTIONS caption as `BRD_FIT_COPY.bottomSectionsCaption(sectionHeightLabel(frames))`, exactly as the dialog does; new Item kinds `sections` (the three drawings in one row, cell width (CW − 2 x 4) / 3, each scaled by cellWidth / 1000, its caption above in the caption font, upper-cased as the screen's CSS does; the file line and our line as single `doc.lines` paths in the file and fit strokes, straightedge and stringer in the stringer stroke; height = caption pitch + the largest drawing height + 1.5) and `bottomTable` (label column 30 mm, then three equal columns: header Nose/Centre/Tail, the five rows of the sheet, each cell wrapped to its column at the table font up to two lines — a row as tall as its tallest cell — then the same cell-shrink rule as the station tables for a word still too wide; height = caption + header + the rows' lines + 1.5). The under-list gains the bottom HOW CLOSE line after the thickness one, the rocker-lines line and the stringer note after the point notes, then (after gwo's block) the BOTTOM caption, the sections item, the table and the notes — or the caption and the unread line — then OUR CLOSEST FIT with the bottom line, then not-read. Add `BRD_OVERVIEW_LAYOUT.minViewsWithBottom: 45`: lay out with the BOTTOM block on page 1; when that leaves the views' box (less the caption gap) under 45 mm, lay out page 1 without the BOTTOM block, `addPage` the same size and draw the BOTTOM block from the top margin of page 2; when page 1 still leaves the views under `minDrawingHeight`, throw as today. Check every baseline against the foot of its own page. Update the header comment (one page the aim; a second only for the BOTTOM block). Update the tests per the behavior list; `lib/units-isolation.test.ts` walks this folder.

**e2e/brd-fit-preview.spec.ts**: keep every existing test compiling and green with the new words — read words from `BRD_FIT_COPY` and expected text from `brdFitSheet(brdFitLook(…))`; no new tests yet.
  </action>
  <verify>
    <automated>/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/vitest run --root /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 lib/export/brd-fit-preview.test.ts lib/models/brd-board.test.ts components/template/build-brd-overview-pdf.test.ts components/template/build-overview-pdf.test.ts lib/geometry/brd-bottom.test.ts lib/export/brd-blank-words.test.ts lib/units-isolation.test.ts && /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/tsc --noEmit -p /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/tsconfig.json && npm --prefix /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 run lint && PW_PORT=3117 /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/playwright test -c /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/playwright.config.ts brd-fit-preview</automated>
  </verify>
  <done>New tests fail first and pass after; the Overview Sheet's own tests and units-isolation stay green; every existing preview browser test passes on desktop, iPhone and Android with the new words; tsc and lint clean. One commit, plain English, e.g. "The .brd preview and its printed overview now show the file's bottom beside ours — three cross-sections, a nose/centre/tail table and how close — and Open as a Board opens with those bottom cuts".</done>
</task>

<task type="auto">
  <name>Task 3: Browser proof on a computer and both phones, and pictures and printed overviews of the four files for the founder's look</name>
  <files>e2e/brd-fit-preview.spec.ts, .planning/quick/261113-gwr-a-brd-s-bottom-contours-are-read-from-it/pictures/</files>
  <read_first>W/e2e/brd-fit-preview.spec.ts as it stands (its helpers: surfaceOf, boardFile, lookOf/sheetOf, pickFile, dialogOf, storedOpenBoard, keptRaw, startPresetAndComeBack, sameWithin, tablesOf, gwo's catalogue helpers, and the last test number); W/lib/export/brd.test.ts's cutSurface/surfaceAndText (writing a board with a bottom); W/components/bottom/ (the hooks BOTTOM's cut menus show their names by, e.g. data-bottom-cut-echo); S/et0/shoot/ (the picture script to copy) and S/et0/pdfcheck.py.</read_first>
  <action>
**New browser tests**, numbered on from the spec's last (gwo leaves b12): a module-scope `boardFile` variant writes the Shortboard with a starting Deep Single Concave (1/4") and a starting Panel Vee tail (3/16") the way brd.test.ts writes a board with a bottom (`designCrossSectionInput(…, { bottom, board })`, `brdText(surface, { bottomStations: brdBottomStations(resolveBottom(bottom, board)) })`); every expected word and figure comes from `brdFitSheet(brdFitLook(readAnyBrd(bytes).board), …)` and `brdBoardFields` worked out in the spec — exact on desktop and Android, by shape on the iPhone as the file already does.
- **(all three) the BOTTOM block.** Pick the concave Shortboard: three `[data-brd-fit-section]` (nose, center, tail), each with a file and a fit line; the bottom table's fifteen cells (five rows x Nose/Centre/Tail, the fitted Start · Deepest At · End and Across among them) and the bottom HOW CLOSE line equal the sheet's; the rocker-lines line and the stringer note show; the rocker table's cells equal the sheet's; the section Height picker opens at x4, and x8 changes the CROSS-SECTIONS caption to `BRD_FIT_COPY.bottomSectionsCaption(sectionHeightLabel(brdBottomFrames(brdBottomRows(look), 8)))` while the side view's Height stays x1; each drawing's caption equals its row's `drawingCaption`. The flat Shortboard: no stringer note, every table row's file and fit cells read flat.
- **(all three) Open as a Board carries the bottom.** Fresh home page, pick the concave Shortboard, Open as a Board: the kept board (`storedOpenBoard`) holds `bottom` equal to `brdBoardFields(look.fit, "Shortboard.brd", look.bottom.bottom).bottom` — every cut's name, depth, stations and marks — (desktop within 1e-9, iPhone within 0.01 mm) and the fit's planed rocker and foil; go to /design/bottom and see the three fitted cut names on BOTTOM (by its own hooks or their visible text) and, on a computer, the fitted Start · Deepest At · End words of the center cut on its sliders' labels.
- **(desktop) a file with no cross-sections.** The Shortboard's text cut off before `p35 : (` and saved plain: the preview opens, `[data-brd-fit-bottom-unread]` holds the sheet's line, no section drawing, the not-read line is today's sentence, and Open as a Board opens with no bottom key.
- **(desktop) the printed overview of the concave board** fetched from the print frame: one page (`/\/Type \/Page\b/g` once), MediaBox 595.27… x 792, holding "BOTTOM", "Deep Single Concave" and "Our fit".
Run the spec, then `e2e/board-file.spec.ts` (its f1 is the known failure — confirm it is the only one, with the same last-digit message).

**Pictures and printed overviews** — copy the et0 shoot to `S/gwr/shoot/` (`reuseExistingServer`, PW_PORT=3117, testDir there) and write into `W/.planning/quick/261113-gwr-a-brd-s-bottom-contours-are-read-from-it/pictures/`: `preview-desktop-<key>-bottom.png` (body scrolled to the BOTTOM block) for egg, round-tail, squash-flyer, noserider; `preview-desktop-noserider-bottom-x8.png`; `preview-desktop-round-tail-bottom-metric.png`; `preview-phone-round-tail-bottom.png` (iPhone 14); `preview-desktop-testlb-bottom.png` (the founder's own longboard file: the soft-rail limit, for his look); `overview-<key>.pdf` for the four (Imperial, opening heights) plus `overview-noserider-metric.pdf`, each rendered with `qlmanage -t -s 1600 -o <pictures> <pdf>`; `opened-bottom-round-tail.png`, `opened-bottom-squash-flyer.png` (its tail card with the moved Trough At showing) and `opened-bottom-noserider.png` (BOTTOM on a computer after Open as a Board; the noserider's nose card with its moved Start, Deepest At and End). Read every PDF back with `S/gwr/pdfcheck.py` (plain `python3`, pypdf): page count (one expected; report any two), each page 595.28 x 792, the file's name, "BOTTOM" and the fitted names in the text. Look at every picture and say what you saw: nose left; both lines readable in each section; the 6'2's and the Fryer's tail sections show their doubles (troughs above the stringer) with ours following; the Scoop's nose section its deep concave against ours; nothing clipped at any page foot; the table names which section each column was read at and every fitted slider.

Commit the spec and the pictures only — `git -C W status --porcelain` must list nothing else (no scratch script, no .brd, no AkuShaper text). Then write the SUMMARY in plain English: what a shaper sees; the measured table of the four files with every moved slider (from the check script, not copied from this plan); the round trips, moved sliders included; the flat tolerance, the window, the blends and why; how the founder's rocker rule was used (flat, vee or belly: the board exactly as before; concave: planed lower by its depth, the leftover ripple reported, never chased); every item of "Changes to the brief, and my calls" for the founder's ruling; the times; the page counts; honest limits (soft rails read as belly until the rails task — the testLB picture; names within one kind may swap; a slider the file's few sections cannot see stays at its starting number; a three-cut mix's sliders come back only roughly; the real print window and the BOTTOM page on his devices are his look).
  </action>
  <verify>
    <automated>PW_PORT=3117 /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/playwright test -c /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/playwright.config.ts brd-fit-preview board-file; python3 /private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/gwr/pdfcheck.py /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/.planning/quick/261113-gwr-a-brd-s-bottom-contours-are-read-from-it/pictures/*.pdf</automated>
  </verify>
  <done>Every brd-fit-preview test passes on desktop, iPhone and Android (skips only where the spec says one computer is enough); board-file.spec.ts fails only its known f1; every PDF reads back with its page count reported and the expected words; the pictures are in pictures/ and were looked at; the working tree holds only the spec and the pictures before the commit. One commit, plain English, e.g. "Browser tests open a .brd's bottom on a computer and both phones and open it on BOTTOM, and pictures and printed overviews of four AkuShaper boards' bottoms for a look". SUMMARY written.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| picked file -> browser | A `.brd` is anyone's file; its sections are now read too. |
| fit -> design store | The fitted bottom becomes part of a board every page edits and Save sends to the server. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-gwr-01 | Denial of service | readAnyBrd's section block; fitBottomToBrd | medium | mitigate | Sections capped at 64 and knots at 200 each inside the existing byte and line caps; a bad section is dropped, never thrown; the seed search is a fixed 68,921 bottoms over at most 64 x 25 points with early dropping, and the slider refinement a fixed budget (one neighbour round, at most 3 rounds a refinement, a fixed grid of trials; blends only between sections more than 6" apart, so at most one per 6" of board) — the founder's own 32-section file measured 0.62 s CPU on a loaded machine; unit tests for every cap. |
| T-gwr-02 | Tampering | brdBoardFields with a bottom | high | mitigate | The bottom is built only from the app's own names, starting numbers and 1/16" depths up to 1/2", and passes `readBoardEntry` (rule 14's bounded, forgiving bottom reader) before `onOpen`, as a JSON board's bottom does; unit-tested to read back deep-equal. |
| T-gwr-03 | Information disclosure | the AkuShaper sample files | medium | mitigate | Read only by scratch scripts outside the repo; Task 3 confirms the working tree holds only the spec and the pictures before committing. |
| T-gwr-04 | Information disclosure | the file's sections | low | accept | Read and fitted in the browser; nothing is sent anywhere; no database change (the bottom already lives in the snapshot, D-24). |
</threat_model>

<verification>
- Unit: brd-read, brd-bottom, brd-fit, brd-fit-preview, brd-board, brd-blank-suggest, brd-blank-words, bottom, components/bottom, build-brd-overview-pdf, build-overview-pdf, brd, units-isolation green.
- `npx tsc --noEmit` and `npm run lint` clean (the known old warning aside).
- Browser: e2e/brd-fit-preview.spec.ts green on desktop, iPhone and Android; e2e/board-file.spec.ts fails only its known f1.
- Scratch: S/gwr/check.ts gives the planner's kinds and depths for the four files, says where names, sliders or gaps differ, and stays inside the 500 ms CPU budget per file.
- Paper: every overview PDF read back; page counts reported; every page 210 x 279.4 mm.
</verification>

<success_criteria>
- GWR-1: sections read, bounded and forgiving, kept whole; a file without usable sections looks as before plus one plain line.
- GWR-2: the closest bottom BOTTOM's menus, Depth slider, station sliders and across marks make, every moved value on its slider's step, flat within 1 mm, never channels or wings; the Fryer's tail a double concave again, the Scoop's nose concave where the file has it; round trips come back, moved sliders included; the founder's rocker rule: flat, vee or belly leaves the board exactly as before, a concave planes it lower by its depth.
- GWR-3: three cross-sections (file solid, ours dashed, own Height pick), the Nose/Centre/Tail table naming each section and every fitted slider, the two-rockers line, a Bottom HOW CLOSE line, the same on paper on one page whenever the views keep 45 mm.
- GWR-4: Open as a Board opens the cuts on BOTTOM, editable; the not-read line keeps rails and wings only.
- GWR-5: unit, browser, pictures and PDFs as listed, each looked at.
</success_criteria>

<output>
Create `.planning/quick/261113-gwr-a-brd-s-bottom-contours-are-read-from-it/261113-gwr-SUMMARY.md` when done.
</output>
