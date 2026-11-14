---
phase: quick-261113-kvo
plan: 01
type: execute
wave: 1
depends_on: [quick-261113-hyy]
files_modified:
  - lib/geometry/brd-rails.ts
  - lib/geometry/brd-rails.test.ts
  - lib/geometry/brd-bottom.ts
  - lib/geometry/brd-bottom.test.ts
  - lib/export/brd-fit-preview.ts
  - lib/export/brd-fit-preview.test.ts
  - lib/export/brd-look.ts
  - lib/export/brd-look.test.ts
  - lib/models/brd-board.ts
  - lib/models/brd-board.test.ts
  - components/setup/brd-look.worker.ts
  - components/setup/open-board-file.tsx
  - components/setup/board-file-copy.ts
  - components/setup/brd-fit-dialog.tsx
  - components/template/build-brd-overview-pdf.ts
  - components/template/build-brd-overview-pdf.test.ts
  - e2e/brd-fit-preview.spec.ts
  - .planning/quick/261113-kvo-a-brd-s-rail-shapes-are-read-from-its-cr/pictures/
autonomous: true
requirements: [KVO-R1-measure, KVO-R2-fit, KVO-R3-window, KVO-R4-show-open, KVO-R5-stringer, KVO-SPEED]

estimate:
  tokens: 320000
  raw_tokens: 320000
  tasks: 4
  confidence: low
  # factor 1, no calibration samples. Raw = gwr's three-task plan (260k) plus a fourth task (the worker) and a second
  # order of fitting. One executor, this worktree, the four tasks in order.

must_haves:
  truths:
    - "A .brd's cross-sections give each of RAILS' three rails (the tail 12\", the centre, the nose 12\") the closest settings RAILS' own controls make — Deck Profile, Family, Ratio, Symmetrical, the tail's Hard Edge and the Advanced menu (Scaled from center by, the six nudges, Use Single Tuck, Sharp Bottom Tuck) — every value inside its control's range and on its slider's step; a control is moved off a new board's value only when that brings the rail at least 0.1 mm closer (KVO-R2)"
    - "On the founder's four AkuShaper files the fitted rails come within 1.1-3.2 mm at worst and 0.4-0.9 mm typically of every usable cross-section (today's new-board rails: 5.6-8.0 / 1.5-2.4 mm), measured on the very board that opens, bottom and all (KVO-R1, KVO-R2)"
    - "The bottom's reading width at a section stops where our fitted rail begins whenever that is more than 1/4\" inside the 9/10 window, and the bottom is re-read on those widths; none of the four AkuShaper bottoms changes a name or a figure; a soft rolled rail (testLB.brd, a Symmetrical 50/50 log rail) is fitted rails-first and stops reading as a belly (KVO-R3)"
    - "The preview and the printed overview carry a RAILS block in the family of the BOTTOM block — the file's rail solid and ours dashed at the three sections, at true height as RAILS draws them, a Nose / Centre / Tail table of the fitted settings in RAILS' own words and how close, a Rails HOW CLOSE line — and Open as a Board opens with those rails on RAILS; the not-read line no longer mentions rails (KVO-R4)"
    - "Fitting rails never moves the stringer: the opened board's rocker, thickness and finished stringer are what the bottom fit makes them, to 0.01 mm on the 3D board's own stringer lines (KVO-R5)"
    - "Picking a .brd shows \"Reading the file…\" at once and the page stays live while the file is read and fitted in a background worker (longest blocked stretch of the page under 100 ms on the dev server); if a worker can't be made, the line still shows before the work starts (KVO-SPEED)"
    - "Every outline, rocker, thickness, wing and blank figure of all six files is what it was before this task; a file with no usable section opens with a new board's rails and says so in one line"
  artifacts:
    - path: lib/geometry/brd-rails.ts
      provides: "The rail fit: brdRailTarget, brdRailGap, brdRailWholeGap, brdOurRailHalf, fitBrdRailAnchor, fitBrdRails (seed, moves, prune, the tips' alignment), brdRailBegins, brdRailWindows, measureBrdRails, brdRailsSpec, brdRailRows and the BRD_RAIL_* constants"
    - path: lib/geometry/brd-bottom.ts
      provides: "brdBottomSections / brdBottomBlends / fitBottomToBrd read an optional window per section (default 9/10 of the reach, exactly as today)"
    - path: lib/export/brd-fit-preview.ts
      provides: "brdFitLook's two orders and the choice; BrdFitLook.rails; the sheet's RAILS block, Rails HOW CLOSE and controls lines, brdRailFrames; the new not-read line"
    - path: lib/export/brd-look.ts
      provides: "brdLookFromBytes(bytes, fileName): read, fit and fields in one pure call, shared by the worker and the fallback"
    - path: components/setup/brd-look.worker.ts
      provides: "The background worker that runs brdLookFromBytes off the page"
    - path: components/setup/brd-fit-dialog.tsx
      provides: "The RAILS block on screen"
    - path: components/template/build-brd-overview-pdf.ts
      provides: "The RAILS block on paper, riding with BOTTOM on page 2"
  key_links:
    - from: components/setup/open-board-file.tsx
      to: components/setup/brd-look.worker.ts -> lib/export/brd-look.ts brdLookFromBytes -> lib/export/brd-fit-preview.ts brdFitLook -> lib/geometry/brd-rails.ts fitBrdRails
      via: "bytes posted to the worker; the look and the fields come back by structured clone; main-thread fallback after the Reading line has painted"
    - from: lib/export/brd-fit-preview.ts brdFitLook
      to: lib/geometry/brd-bottom.ts fitBottomToBrd(sections, board0, windows)
      via: "the bottom re-read on the windows where our fitted rail begins (R3)"
    - from: components/setup/brd-fit-dialog.tsx Open as a Board
      to: lib/models/brd-board.ts brdBoardFields(fit, fileName, bottom, rails) -> readBoardEntry -> onOpen -> design-store applyBoardFile
      via: "the rails ride in the snapshot's own rails field; every rail control is already saved there (design-snapshot rules 10-13); no database change"
---

## What the planner measured (2026-11-13) — read this first

Scratch scripts in `S/kvo/` (`S` = `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad`):
`lib.ts` (read a file, open the look), `model.ts` (a candidate rail, the uniform rails), `fast.ts` (one station's section, a copy
of `boardSectionsWith`'s single-rail path), `gap2.ts` (the rail-region gap and the whole-section gap), `lean.ts` (the search),
`pipeline.ts` (rail-begins, narrowed windows, the honest measure), `pipeline2.ts` (bottom-first: rails, alignment, narrowing),
`pipeline3.ts` (rails-first), `final.ts` (the method below end to end: the table), `rt.ts` (round trips), `r5.ts` (the stringer),
`check-fast.ts`, `plot.ts` (pictures for the planner's own look, `S/kvo/pics/`). Run from the worktree root with
`STARTS=1 SEEDSYM=1 W/node_modules/.bin/tsx --tsconfig W/tsconfig.json S/kvo/final.ts`. They read the four AkuShaper files
and the founder's `mid.brd` / `testLB.brd` from `~/Downloads`; nothing of theirs is in this plan but measured figures.

### What a saved board holds, and which controls a shaper can move (read from the code)

A board's rails are `RailBandSpec` (`lib/geometry/rail-bands.ts`): three `RailSectionSpec`s (nose, centre, tail) plus the tail's
`tailHardEdge`, `tailHardEdgeBlendsFrom`, `tailHardEdgeEndsAt`. Every one is saved in the snapshot already (design-snapshot rules
10–13, rule 11: the tail's Symmetrical and Hard Edge never both on) — **no database change**. RAILS' controls per rail
(`components/rails/rail-controls.tsx`): Deck Profile (stored `deckPercent`, 75–100, the slider's step `deckProfileSliderStep` of
that rail's thickness, label shows the tapered thickness), Family 1–5 (whole steps, `railFamilyLabel`), Ratio 20–80 in 0.5
(`RAIL_RATIO_RANGE`), Symmetrical, the tail's Hard Edge; Advanced: Scaled from center by (nose and tail, `RAIL_SCALE_RANGE`
0.50–1.00 in 0.05), the six nudges (`RAIL_NUDGE_KEYS`, limits `RAIL_NUDGE_LIMIT_IN`, step `RAIL_NUDGE_STEP_IN` 1/16"), Use Single
Tuck, Sharp Bottom Tuck, the tail's two blend sliders. Each rail's board thickness is imported from the foil (a `.brd` opens with
`railsImportFoilThickness: true`), so it is not a rail control here (R5).

**The three stations RAILS bands** are the foil's tail 12", centre and nose 12" (`railAnchorStations` / `foilStationPoints`) — the
same three the BOTTOM block reads (12" from each tip and L/2). Between them `boardSectionsWith` (volume.ts) blends Deck Profile,
Ratio, the scale and the nudges in straight lines and the five boxes (Hard Edge, Family, Symmetrical, Single, Sharp) by the D-32
fades (the tail between Blends From and Ends At, the nose by a smoothstep from the centre to the nose 12"). The board's own
cross-sections (the litres, the 3D board, the `.brd` writer) are those sections, bottom included (`bottomedHalfSection`).

### How close the rail model comes (R1)

Measured on **the board that opens** (our outline, rocker, foil and fitted bottom, through the app's own `boardSections`), against
each usable file section (more than 1" from a tip), over **the rail region**: the outer 3" of the bottom, round the widest point and
over the whole deck to the stringer — each file point's nearest distance to our whole section, and each of our points' nearest
distance to the file's, largest and mean (millimetres).

| File | New-board rails today (worst / typical) | Fitted (worst / typical) | At the three sections the fit reads (tail · centre · nose) | Where the worst is |
|------|------|------|------|------|
| 6'10 Egg | 7.51 / 2.37 | **2.07 / 0.72** | 1.70 · 1.81 · 2.07 | the nose section (13 1/16" from the nose), on the deck about 4 3/8" in from the rail |
| 6'2 Round Tail | 8.00 / 2.04 | **2.11 / 0.48** | 2.11 · 1.54 · 1.07 (and 0.77 at 72.6") | 12" from the tail, at the bottom of the rail |
| Fryer 5'7 | 5.58 / 1.46 | **1.14 / 0.37** | 0.90 · 0.83 · 1.14 | 8 7/8" from the nose, on the bottom about 7/16" in from the rail |
| Scoop Noserider | 5.60 / 2.15 | **3.22 / 0.89** | 1.18 · 1.80 · 1.94 (and **3.22** at 73.7", 2.65 at 85.7") | 73.7" from the tail — between the centre and the nose — on the deck about 8" in from the rail |
| mid.brd (the founder's, 28 sections) | 5.50 / 0.98 | **1.76 / 0.41** | 0.90 · 0.77 · 0.67 | 27.8" from the tail, between the tail and centre stations |
| testLB.brd (the founder's longboard, 33) | 9.69 / 1.91 | **4.98 / 0.85** (rails-first, R3) | 1.16 · 0.83 · 2.19 | 1" from the nose tip; 3.9–4.1 mm at 71–75" |

**"Closely enough", the bar used:** every section the fit reads within 1/8" (3.2 mm) and the typical gap under 1/32" (0.8 mm) — a
shaper reads a rail mark to 1/16" and this app's own writer draws a section to 1 mm. All twelve anchor sections of the four files
are within 1/8" (worst 2.11 mm); six of the twelve within 1/16"; typical 0.37–0.89 mm (the Scoop's 0.89 just over). **It is worth
showing**: against 5.6–8.0 mm for the rails a new board starts with, the fit is two to six times closer everywhere. The pictures
(`S/kvo/pics/*.svg.png`) show the dashed fitted rail lying on the file's line round the rail on every file.

**What did the work** (`final.ts`, bottom-first for all but testLB; new-board values: Family 3 "med", 60/40, Deck Profile 100%,
nothing ticked, tail Hard Edge on, scale 1.00, nudges 0):

| File | Tail | Centre | Nose |
|------|------|--------|------|
| Egg | boxy · 50/50 · Deck Profile 75% · Hard Edge | boxy · 60/40 · 77.5% · Deck Mark 1 −1/2" · Deck Mark 3 +1/4" · Domed Deck Band +1" | boxy · 62.5/37.5 · 75% · Apex Thickness −1/4" · Deck Mark 1 −1/2" · Deck Mark 3 +1/2" · Domed Deck Band +2" |
| 6'2 | boxy/med · 65/35 · 78.6% · Apex −1/8" · Dome +2" | boxy/med · 60/40 · 77.3% · Dome +1/2" | boxy/med · 60/40 · 75% · Dome +1" |
| Fryer | med · 66/34 · 95.8% · Use Single Tuck · Apex +1/8" · Deck Mark 3 +1/2" | med · 65/35 · 87.5% · Single · Deck Mark 1 −1/4" · Dome +1/2" | med · 60/40 · 75% · Single · Dome +2" |
| Scoop | med · 55/45 · 82.1% | med · 60/40 · 91.7% | med · 50/50 · 75% · Dome +2" |
| mid.brd | med · 60/40 · 92.9% · Hard Edge | med · 55.5/44.5 · 81.8% · Deck Mark 3 −1/2" · Bottom Tuck 1 +1/8" | med · 50/50 · 96.4% |
| testLB | med · 27.5/72.5 · 81.3% · Symmetrical · Deck Mark 1 +1/4" · Dome −1" · Bottom Tuck 3 +1/2" | med · 50/50 · 100% · Symmetrical | med · 40/60 · 79.2% · Symmetrical · scale 0.85 · Apex +1/8" · Deck Mark 3 −1/2" · Dome −1/2" |

Deck Profile, Ratio and the Domed Deck Band do most of the work. The files' decks are fuller-domed than a new board's (Deck Profile
75–96%) and their apexes lower (Ratio 55–66 on top).

**What the model cannot follow, with the number** (findings, not failures):
- **A deck crowned right across.** RAILS' deck is flat inside the Domed Deck Band (`deckYFor`); the Egg's nose deck keeps falling
  all the way out from the stringer. The fit pushes Deck Profile to its 75% floor and the Domed Deck Band to its +2" limit and still
  misses by 2.07 mm, 4 3/8" in from the rail.
- **Between the three stations.** Our rail blends straight from one station's numbers to the next. The Scoop's own sections at 73.7"
  and 85.7" (between its centre and nose) are 3.22 and 2.65 mm off while the sections the fit reads are 1.80 and 1.94.
- **A tip whose boxes differ from the centre's reaches back past its station.** With the Egg's nose fitted Symmetrical and the centre
  not, the nose's smoothstep fade put 6% of a Symmetrical rail into the Egg's centre section 4.3" ahead of the centre — 1.25 → 3.88
  mm. Hence the alignment step (method step 6): the tips take the centre's Family and boxes when that is closer over the whole board.
- **A soft 50/50 rail read bottom-first** reads as a belly (testLB; the round trip H4 below). Only fitting the rail first separates
  them (R3).
- **A board built on a blank** can't come back closer than about 5 mm on a long board: the fit opens a hand-set five-station foil,
  not the blank's own thickness curve, and a rail's marks follow the thickness (the Longboard preset's own rails miss its own file by
  4.97 mm worst on a flat bottom; the fit reaches 5.03–5.22, the same floor).
- **Not fitted, on purpose:** Tail Rail Blends From and Ends At (an AkuShaper file's 3–5 sections can't see where a tail's rail
  blends; they stay where a new board puts them).
- **Several settings draw nearly the same rail:** Family against Apex Thickness, Scaled from center by against the deck-mark nudges,
  the Advanced marks against each other (round trip H7). The shape is what the fit stands behind; the words may differ from the
  board's original.

### R3 — narrowing the bottom's reading width, measured on all six files

Two orders were measured. **Bottom-first** (the brief's order): today's bottom (9/10 window) → rails fitted on it → each section's
window narrowed to where our fitted rail meets the bottom when that is more than 1/4" inside the 9/10 window → the bottom re-read
on those widths → rails polished on the new board. **Rails-first:** rails fitted on a flat bottom → windows → the bottom read on
them → rails polished. Rails-first alone ruins the Scoop (it reads the Scoop's rolled-in tail edge as rail: Tri-Plane 1/4" → Deep
Single Concave 1/16", Panel Vee → Flat Exit, whole-section worst 3.22 → 7.58 mm) and does worse on `mid.brd` (1.76 → 2.57), but it
is the only order that separates a soft 50/50 rail from a belly. So the method runs bottom-first, **tries rails-first only when
bottom-first leaves some whole section more than 4 mm off and its bottom has a vee or a belly**, and takes it only when it is at
least 0.25 mm closer over the whole sections (bottom and rail together).

| File | Bottom today | Bottom after this task | Bottom closeness at the 9/10 window, before → after | Whole section (bottom + rail) worst, bottom-first / rails-first |
|------|------|------|------|------|
| Egg | Flat Entry · Flat Center · Panel Vee 1/8" | **the same** (no window narrowed) | 0.84 → 0.84 | 2.07 / not tried |
| 6'2 | Teardrop 1/16" · Deep Single 1/8" · Double Concave Exit 1/8" | **the same** | 0.95 → 0.95 | 2.11 / not tried |
| Fryer | Blended Nose 1/16" · Deep Single 3/16" · Double Concave Exit 1/8" | **the same** | 1.04 → 1.04 | 1.12 / not tried |
| Scoop | Blended Nose 5/16" · Tri-Plane 1/4" · Panel Vee 1/8" | **the same** | 1.92 → 1.92 | 3.22 / not tried |
| mid.brd | Blended Nose 1/2" · Flat Center · Panel Vee 3/16" | **the same** | 0.85 → 0.85 | 1.76 / not tried |
| testLB.brd | Teardrop 1/2" · Tri-Plane 1/2" · Rolled Vee 3/8" | **Teardrop 7/16" · Flat Center · Flat Exit** (rails-first; windows stop where its Symmetrical rail begins, 0.6–6.8" in from the widest point) | 5.25 → 16.0 against the old 9/10 window, because the rolled rail out there now counts as rail, not bottom (the check script reports the figure on the windows it is read on) | 9.30 / **4.99** |

**No fitted cut changes its name on any of the founder's four files** — nor its depth, nor a slider. On those four, our fitted rails meet the bottom
inside the 9/10 window (or less than 1/4" past it) at every section, so no window narrows, and no whole section is more than 4 mm off,
so rails-first is never tried (bottom-first worst: 1.12–3.22 mm). The one file whose bottom changes is the founder's own longboard: its rolled 50/50 rail
stops reading as a 1/2" Tri-Plane belly and a 3/8" Rolled Vee, and opens as a flat centre and tail with Symmetrical rails.

### Round trips (the test with a known answer)

Boards written by the app's own `.brd` writer, read back, fitted by the whole method. **Hand-set boards** (`stock|hard`, no blank),
so the read-back board's thickness is the written one's; "floor" is the written rails' own figure on the read-back board (the writer
draws a section to about 1 mm, and our outline and thickness fits differ from the file by a hair).

| Case (on the stock 6'0") | Comes back | Rail worst, fitted / floor |
|------|------|------|
| H1 the new board's rails | exactly (60/40, 100%, Family 3, tail Hard Edge), nose scale 1.00 → 0.95 | 1.01 / 1.01 |
| H2 Hard Edge off | exactly | 0.69 / 0.75 |
| H3 centre Deck Profile 85% | exactly | 0.94 / 0.94 |
| H4 Symmetrical 50/50 everywhere, Hard Edge off (a log's rail) | bottom-first: a 1/2" Tri-Plane belly + 3/16" Rolled Vee, 4.85 mm. **Rails-first, chosen: flat bottom, Symmetrical 50/50 · 50/50 · 49.5/50.5** | 0.72 / — |
| H5 tail Use Single Tuck + Sharp Bottom Tuck, Hard Edge off | exactly | 0.85 / 0.85 |
| H6 nose 70/30, Family 1 | 69/31, Family 3 with Apex Thickness +1/16" (the same rail) | 1.01 / 1.01 |
| H7 centre 90%, Deck Mark 1 +1/4", Domed Deck Band +1", Bottom Tuck 3 −1/4" | the same shape by other marks (85%, Family 2, no nudges) | 0.99 / 0.94 |
| H8 a 1/4" Deep Single Concave | bottom exactly; rails within 1 point of Ratio | 0.93 / 0.93 |
| H9 a 3/16" Panel Vee tail | bottom as Rolled Vee 3/16" (gwr's known vee swap); rails exactly | 1.26 / 1.26 |
| H10 50/50 and 80% everywhere | centre and tail exactly; nose 52.5/47.5 at 85% with scale 0.85 | 1.19 / 1.19 |

The four presets (each on its blank) come back at their floors with Ratio within 3.5 and Deck Profile within one step; the
Longboard preset's floor is the ~5 mm noted above.

### R5 — the stringer

The 3D board's stringer deck and bottom lines (`boardStringerLines`) with the fitted rails against the same board with a new
board's rails: identical on the Egg; within 0.01 mm on the 6'2, the Fryer and the Scoop (near the tips, where a rail is drawn into
its room). Rails never move the rocker or the thickness: those are fitted to the file's stringer before the rails, and the bottom's
concave lift (gwr's rule) is the only thing that plans the board lower. Where R3 re-reads a bottom (testLB), the planed rocker and
thickness are refitted for the new bottom by gwr's own rule — so the opened board's finished stringer still matches the file as
after gwr.

### Time

Node through `tsx`, this Mac at a load of 2.5–4 (the scratch is not tuned). Today's look (wall): 0.28–0.44 s for the four files,
0.63 s `mid.brd`, 0.84 s `testLB.brd`. **The whole bottom-first flow with the rails, CPU (`process.cpuUsage`): 0.81–0.97 s for the
four files**, 1.05 s `mid.brd`; so the rails add about 0.4–0.6 s of CPU each. Of that, the seed search is 0.22–0.37 s wall (~700–1,000
trials at ~0.28 ms: a section 0.10 ms, its gap 0.14 ms), the alignment 0–0.09 s, the rest is building the opened board and measuring.
`testLB.brd`: bottom-first 1.99 s CPU (it narrows and re-reads its bottom, 0.83 s) and rails-first 1.18 s more — about 3.2 s in all.
One start of the search was measured as close as three (1,400–1,800 trials). On the dev server the page already blocks 0.3–1.1 s on
the four files and 2–3 s on the app's own long files; with the rails it would be roughly 1–3 s and 5–9 s, which is why Task 3 moves
the whole look into a background worker.

---

<objective>
The founder, 2026-11-13 (locked, word for word): *"It looks promising, so we should then try to fit bottom contours and rail shapes
too."* and *"the rocker is tricky becasue we're trying to balance a foil without contours and square rails with a finished boards
rocker along the stringer"*. Bottom contours (261113-gwr) and wings (261113-hyy) are built. This plan is **rail shapes**: fit RAILS'
own controls to a `.brd`'s cross-sections, re-read the bottom where the fitted rail begins so a rolled rail stops reading as a belly,
show the file's rails beside ours on the preview and the printed overview, open the board with those rails, and stop the look from
freezing the page while it works.

Purpose: a shaper who opens an AkuShaper or Shape3D board gets its rails too — the closest rail RAILS' own sliders and boxes make,
with an honest account of how close and where.

Output: pure, tested fitting in `lib/`; the RAILS block on screen and paper; Open as a Board carrying the rails; the look in a
background worker with a "Reading the file…" line; browser proof on a computer and both phones; pictures and PDFs of the four files.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
Work ONLY in `W` = `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17` (branch `close-bottom-17`, HEAD f6b62984 when
planned). Scratch: `S` = `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad`
(make your scripts in `S/kvo/`; the planner's are there). Never `cd` into a subfolder: absolute paths and `git -C W`. Never touch
`/Users/kontoes/Code/shaper` itself. Nothing is pushed. No database change. Never name `.env*` paths in Bash.

Read first (once each): this task's `BRIEF.md`; "What the planner measured" above; the SUMMARY of `261113-gwr-*` and of
`261113-hyy-*` (both in `W/.planning/quick/`); `W/CLAUDE.md` (Rule 1, Rule 2, plain English) and `W/AGENTS.md` (this Next.js is
not the one you know: read `W/node_modules/next/dist/docs/` before writing the worker). **Re-read each file as it stands before
editing it, and find things by function and section name, never by line number** — gwr and hyy changed most of them.

House rules: **a dev server runs from this checkout on port 3117** (the founder tries features on it). Playwright only with
`PW_PORT=3117` (it reuses that server) — never stop it, never start another `next dev`, never `next build`, never run the whole
suite. `e2e/board-file.spec.ts` test f1 fails on untouched code (a last-digit figure) — known, not ours; browser tests in
`e2e/brd-fit-preview.spec.ts` continue after b21. `npx tsc --noEmit`, `npm run lint` (one old warning in
`import-designs-action.test.ts` is known) and the touched unit tests clean before each commit. The four AkuShaper files in
`~/Downloads` and the founder's `mid.brd` / `testLB.brd` are NEVER copied into the repo, nor any of their text; scripts that read
them live under `S/kvo/`; pictures and PDFs made from them go in this task's `pictures/` only. The plan, the BRIEF and the SUMMARY are
never committed by you. Commit messages and the SUMMARY in plain English (what a shaper sees); end each commit message with the
attribution line your session gives you.
</context>

## The method, written out (Task 1 implements exactly this; where the scratch differs, the plan wins)

**Terms.** *Usable sections*: the file's sections more than `BRD_FIT_TIP_SKIP_MM − 0.5 mm` from either tip (gwr's rule). *A half*:
one rail's half section as points `(out from the stringer, up)`, **stringer bottom first**, round the widest point, to the deck at the
stringer. *The file's half*: `sampleKnots(section.knots, BRD_RAIL_SAMPLE_STEPS)` (48 steps a span — finer than the reader's 16),
resampled by arc length to `BRD_RAIL_TARGET_POINTS` (120); heights are already from the stringer bottom. *Our half at a station
with rails R*: `ghostRail(boardSections({ ...input, rails: R }, [station]), station)` (bottom-draw.ts — the very ring the litres,
the 3D board and the `.brd` writer read; `input` is the opened board's `designCrossSectionInput` with the fitted bottom),
**reversed** to stringer bottom first, every height less its stringer-bottom point's. *The anchor sections*: the usable section
nearest each of tail 12", L/2 and L − 12", each used once, nearest pairs first (gwr's `brdBottomRows` rule — share one helper);
an anchor with none keeps a new board's values.

1. **The rail region of a half** (`brdRailRegion`): find the first point holding the largest `x` (the widest point, at `reach`);
   the region is every point from the first bottom-run point whose `x >= reach − BRD_RAIL_STRIP_MM` (3") to the end — the outer 3"
   of the bottom, the widest point and the whole deck.
2. **The gap** (`brdRailGap(file, ours)`): for every file point in its rail region, its nearest distance to our WHOLE half polyline;
   for every one of our points in our rail region, its nearest distance to the file's WHOLE half; `largest` and `mean` over all those
   distances; the point of the largest, and whether it lies on the deck (above the file's widest point's height and more than 1/4" in),
   at the rail (within 1/4" of the widest point) or on the bottom, and how far in from the rail. `value = largest + mean`.
   **The whole-section gap** (`brdRailWholeGap`) is the same with every point of both halves (no region). **A board's values**: over
   every usable section, the largest of the sections' largest plus the mean of their means — the rail value with the rail gap, the
   whole value with the whole-section gap.
3. **A candidate** is one rail's settings: Family, Ratio, Deck Profile, Symmetrical, Use Single Tuck, Sharp Bottom Tuck, (tail)
   Hard Edge, Scaled from center by (tips), the six nudges. *Uniform rails* of a candidate put it on all three anchors (the centre's
   scale 1; `tailHardEdge` its Hard Edge) — so at any station the section is exactly that candidate (no fade). The search scores a
   candidate at its anchor's section with uniform rails (measured: a single copy of `boardSectionsWith`'s one-rail path equals the
   app's section to the last bit; you may port such a copy for speed if a test holds it equal to `ghostRail(boardSections(...))`
   to 1e-9 over 200 seeded random candidates, as gwr's fast form was held).
4. **The seed** (per anchor; new-board values: Family 3, Ratio 60, Deck Profile 100%, nothing ticked, tail Hard Edge on, scale 1,
   nudges 0). Deck Profile's grid is `100 − k x deckProfileSliderStep(mmToInches(that rail's thickness as the opened board's RAILS
   reads it — the foil's at the anchor))`, down to 75. Score Ratio 20, 25 … 80 × Deck Profile every `round(5 / step)` grid points
   × {Symmetrical off, on} at Family 3, nothing else ticked, Hard Edge off; on the tail also every Ratio × Deck Profile with Hard
   Edge on (Symmetrical off — rule 11). At the three best, also try each of {Single}, {Sharp}, {Single + Sharp}, {Symmetrical},
   {Symmetrical + Single}, {Symmetrical + Sharp} (none with Hard Edge). The best of all starts the descent — unless it is not at least
   `BRD_RAIL_MOVE_GAIN_MM` (0.1 mm) closer than the new-board values, which then start it.
5. **The descent.** Rounds of *main moves* until nothing moves (at most 6): Ratio ±0.5, ±1, ±2.5, ±5 (inside 20–80); Deck Profile
   ±1, ±2, ±3 grid steps (inside 75–100); Family every other value; Symmetrical toggled (never while Hard Edge); Single toggled and
   Sharp toggled (never while Hard Edge); on the tail Hard Edge toggled (turning it on turns Symmetrical, Single and Sharp off). Then
   rounds (at most 6) of *Advanced moves* followed by main moves, until neither moves: Scaled from center by (tips) −0.15, −0.1,
   −0.05, +0.05 on its 0.05 grid inside 0.50–1.00; each nudge ±1, ±2, ±4, ±8 sixteenths (the Domed Deck Band also ±16) inside its
   `RAIL_NUDGE_LIMIT_IN`, on the 1/16" grid (`inchesToMm(k / 16)`); Bottom Tuck 1 and 3 skipped while Hard Edge, Bottom Tuck 1 while
   Single. In each group the closest candidate is kept only when it is at least 0.1 mm closer than the rail as it stands.
   **The prune**: while some setting off its new-board value (a nudge, the scale, a box, Family) can be put back costing no more
   than `BRD_RAIL_PRUNE_MM` (0.1 mm), put back the one that costs least. (Measured: one start does as well as three.)
6. **The alignment** (whole board, the real fades): for each tip whose Family, Symmetrical, Single or Sharp differ from the centre's,
   a variant taking the centre's (its Hard Edge kept; a Hard Edge tail takes only the Family), polished by step 5 with those boxes
   and Family held. Of {as fitted, nose aligned, tail aligned, both}, score each by the board's rail value over every usable section
   with the real rails (`brdRailsSpec`), and take the one with the fewest tips differing from the centre among those within
   `BRD_RAIL_ALIGN_PREFER_MM` (0.1 mm) of the closest, then the closer. (Measured: the Egg 3.88 → 2.07 mm.)
7. **Where our rail begins** (`brdRailBegins`): on the opened board with the fitted rails and NO bottom, at each usable section, our
   half's widest `x` less the `x` of the last bottom-run point still on the bottom (height ≤ 1e-6) walking out from the stringer —
   how far in from the widest point our finished rail meets the bottom.
8. **The windows** (`brdRailWindows`): each usable section's bottom window = `min(BRD_BOTTOM_WINDOW x reach, reach − begins)`, and a
   section counts as narrowed only when that is more than `BRD_RAIL_NARROW_MIN_MM` (1/4") inside `BRD_BOTTOM_WINDOW x reach`
   (otherwise it keeps exactly today's window). Never wider than today's.
9. **Bottom-first** (the look, `brdFitLook`): `first = fitBoardToBrd(lines)`; the bottom exactly as gwr fits it today (with its
   planed refit); rails by steps 4–6 on that board; windows by steps 7–8; if any section narrowed: the bottom re-read with
   `fitBottomToBrd(sections, brdFittedBottomBoard(first), windows)`, its lift, the planed refit `fitBoardToBrd(lines, lift, first)`
   when it lifts, then the rails polished on that board (step 5 from the fitted values, boxes and Family held). Measure (step 11).
10. **Rails-first**, only when bottom-first's board whole-section largest is over `BRD_RAIL_FIRST_TRY_MM` (4 mm) AND its bottom holds a
    vee or a belly (`cutKind` of any section): rails by steps 4–6 on the FLAT board of `first`; windows by steps 7–8 (every section that
    narrows); the bottom fitted on them, its lift, the planed refit; the rails polished on that board (boxes and Family held). Chosen
    only when its board whole value is at least `BRD_RAIL_FIRST_GAIN_MM` (0.25 mm) closer than bottom-first's. Doc-comment why: the
    order decides who claims a rise near the rail — a bottom read first takes a rolled 50/50 rail for a belly (the log-rail round
    trip, testLB), a rail fitted first takes a rolled-in bottom edge for rail (the Scoop: measured 3.22 → 7.58 mm) — so the closer
    of the two wins, and the bottom's reading is kept unless the rail's is clearly closer.
11. **Measured for showing** (`measureBrdRails`): every usable section against our half with the chosen rails on the board that opens
    (the slow, exact way): per section the rail gap (largest, mean, where); overall largest, typical (mean of means), the station and
    where of the largest; and the anchors' rows. The bottom is measured as gwr measures it, on the windows it was read on.
12. **The opened rails** (`brdRailsSpec`): each anchor's `RailSectionSpec` = a new board's section (`DEFAULT_RAIL_BAND_SPEC[key]`'s
    legacy keys) with the fitted Deck Profile, Family, Ratio, boxes, scale (the centre's 1) and nudges, and `boardThickness` = the
    fit's foil at that anchor (`nose12`, `center`, `tail12`) — what `deriveEffectiveRails` puts there anyway, so unticking Import
    Foil Thickness later shows real numbers; `tailHardEdge` = the tail's Hard Edge; no blend keys (a new board's). Nothing rounded:
    every value is already on its control's grid.

## My calls (flag each in the SUMMARY for the founder's ruling)

1. **Two orders, the closer wins** (step 10) — the brief's order is bottom-first; rails-first is tried only for a whole section more
   than 4 mm off with a vee or belly read, and taken only for 0.25 mm. On his files only `testLB.brd` goes rails-first.
2. **No cut name changes on his four files** (R3) — stated plainly in the SUMMARY, with the before/after table.
3. **The fit leans on the Advanced menu where the deck is crowned**: Deck Profile at its 75% floor and the Domed Deck Band at its +2"
   limit on the Egg's nose and the Scoop's and 6'2's noses. Ask him whether a wider dome range or a crown control is wanted (not in
   this task).
4. **Tail Rail Blends From / Ends At are not fitted**; they stay a new board's.
5. **The words may not be the board's original**: Family against Apex Thickness, the scale against the deck marks, one mark against
   another draw nearly the same rail; the shape is what the fit stands behind.
6. **The not-read line becomes**: "Fins aren't read from the file: the board opens with the fins a new board starts with." whenever
   the file has usable sections; with none, today's line stays (bottom and rails both unread) beside the two unread lines.
7. **The RAILS drawings are at true height, one scale for all three**, over the stretch RAILS' own plot shows (2" beyond the fitted
   Domed Deck Band, `railPlotBounds`), the widest of the three, never past the stringer — RAILS draws a rail at true proportions;
   no Height picker. The fit's 3" rail region is said in a note.
8. **The look runs in a background worker** (Task 3) with a "Reading the file…" line, falling back to the page itself after the line
   has painted when a worker can't be made.
9. **Honest limits** in the SUMMARY: between stations the rail blends straight (the Scoop's 73.7"/85.7"); a deck crowned right
   across; a blank-built board's ~5 mm floor; the soft rail separated only rails-first; the speed figures.

## Interfaces (Task 1 adds; Tasks 2–4 use these names)

```ts
// lib/geometry/brd-rails.ts — pure (imports: rail-bands, design, volume, bottom-draw (ghostRail), bottom (cutKind), foil,
// outline, fins, units, brd-fit types/consts, bezier-fit P2). No React, browser, database, or lib/export import.
export const BRD_RAIL_STRIP_MM: Mm;            // inchesToMm(3)
export const BRD_RAIL_SAMPLE_STEPS = 48;
export const BRD_RAIL_TARGET_POINTS = 120;
export const BRD_RAIL_MOVE_GAIN_MM: Mm;        // mm(0.1)
export const BRD_RAIL_PRUNE_MM: Mm;            // mm(0.1)
export const BRD_RAIL_ALIGN_PREFER_MM: Mm;     // mm(0.1)
export const BRD_RAIL_NARROW_MIN_MM: Mm;       // inchesToMm(1 / 4)
export const BRD_RAIL_FIRST_TRY_MM: Mm;        // mm(4)
export const BRD_RAIL_FIRST_GAIN_MM: Mm;       // mm(0.25)
export interface BrdRailLine { station: Mm; points: readonly P2[] }   // the file's half, stringer bottom first, sampled at 48 steps a span (brdFitLook samples it)
export interface BrdRailSetting { family: RailFamily; ratio: number; deckPercent: number; symmetrical: boolean; singleTuck: boolean;
  sharpBottomTuck: boolean; hardEdge: boolean; scale: number; nudges: RailMarkNudges }
export type BrdRailSettings = Record<RailSectionKey, BrdRailSetting>;
export interface BrdRailBoard { input: CrossSectionVolumeInput; anchors: RailAnchorStations; length: Mm; foil: FoilSpec }
export function brdRailBoard(fit: Pick<BrdFit, "outline" | "rocker" | "foil">, bottom: BoardBottom | null): BrdRailBoard; // the board brdBoardFields opens
export function brdOurRailHalf(board: BrdRailBoard, rails: RailBandSpec, station: Mm): P2[];
export function brdRailRegion(half: readonly P2[]): P2[];
export interface BrdRailGap { largest: Mm; mean: Mm; at: P2; where: "deck" | "rail" | "bottom"; inFromRail: Mm }
export function brdRailGap(file: readonly P2[], ours: readonly P2[]): BrdRailGap;
export function brdRailWholeGap(file: readonly P2[], ours: readonly P2[]): { largest: Mm; mean: Mm };
export function brdRailsSpec(settings: BrdRailSettings, foil: FoilSpec): RailBandSpec;
export function brdAnchorSections<T extends { station: Mm }>(sections: readonly T[], length: Mm): Record<RailSectionKey, T | null>; // shared with brdBottomRows
export function fitBrdRails(lines: readonly BrdRailLine[], board: BrdRailBoard, from?: BrdRailSettings): BrdRailSettings; // steps 4-6 (5 only, boxes held, when `from`)
export function brdRailBegins(fit: Pick<BrdFit, "outline" | "rocker" | "foil">, rails: RailBandSpec, stations: readonly Mm[]): Mm[];
export function brdRailWindows(lines: readonly BrdRailLine[], begins: readonly Mm[]): { windows: (Mm | undefined)[]; narrowed: boolean };
export interface BrdRailSection { station: Mm; file: P2[]; ours: P2[]; gap: BrdRailGap }
export interface BrdRailsFit {
  settings: BrdRailSettings; rails: RailBandSpec; order: "bottom-first" | "rails-first";
  read: Record<RailSectionKey, Mm | null>;   // the file section each anchor was fitted to
  sections: BrdRailSection[];                // every usable section, tail to nose, measured on the board that opens
  closeness: { largest: Mm; typical: Mm; station: Mm; where: BrdRailGap["where"]; inFromRail: Mm };
  narrowed: boolean;                         // some bottom window stopped where our rail begins
}
export function measureBrdRails(lines: readonly BrdRailLine[], board: BrdRailBoard, settings: BrdRailSettings, extra: Pick<BrdRailsFit, "order" | "read" | "narrowed">): BrdRailsFit;

// lib/geometry/brd-bottom.ts — the optional window, default exactly today's
export function brdBottomSections(sections: readonly BrdSectionLine[], length: Mm, windows?: readonly (Mm | undefined)[]): BrdBottomSection[]; // windows[i] for sections[i]
// BrdBottomSection gains window: Mm (the across stations run 0..window); brdBottomBlends blends `window` as it blends `reach`
export function fitBottomToBrd(sections: readonly BrdSectionLine[], board0: BottomBoard, windows?: readonly (Mm | undefined)[]): BrdBottomFit | null;

// lib/export/brd-fit-preview.ts
// BrdFitLook gains: rails: BrdRailsFit | null
// Task 2: BRD_FIT_COPY.railsCaption "RAILS", railSectionsCaption(label), railSectionCaption(where, width), railColumns, railRowLabels
//   { at: "Read at", deck: "Deck Profile", shape: "Family · Ratio", ticked: "Ticked", advanced: "Advanced", close: "How close" },
//   railWords (RAILS' own: "Deck Profile", "Family", "Ratio", "Symmetrical", "Hard Edge", "Scaled from center by", "Use Single Tuck",
//   "Sharp Bottom Tuck" — the nudge names come from RAIL_NUDGE_NAMES), railLine(nose, centre, tail), railsUnread, railNotes…,
//   notReadAfterRails; closenessSentence accepts "Rails"
export interface BrdRailRow { key: RailSectionKey; section: BrdRailSection | null }
export function brdRailRows(look: BrdFitLook): BrdRailRow[];   // nose, centre, tail
export interface BrdRailDrawing { key: RailSectionKey; file: P2[]; fit: P2[]; bottomLine: { x1: number; x2: number; y: number } }
export interface BrdRailFrames { width: number; height: number; span: Mm; drawings: BrdRailDrawing[] }
export function brdRailFrames(rows: readonly BrdRailRow[], look: BrdFitLook): BrdRailFrames;
// BrdFitSheet gains: closeness.rails: string | null; controls.rails: string | null;
//   rails: { read: true; caption; drawingsCaption; columns: { key; label; drawingCaption: string | null }[];
//            rows: { key: "at" | "deck" | "shape" | "ticked" | "advanced" | "close"; label; cells: [string, string, string] }[]; notes: string[] }
//        | { read: false; caption; line }

// lib/models/brd-board.ts
export function brdBoardFields(fit, fileName, bottom?: BoardBottom | null, rails?: RailBandSpec | null): DesignSnapshotFields | null;

// lib/export/brd-look.ts (Task 3)
export type BrdLookResult =
  | { ok: true; look: BrdFitLook; fields: DesignSnapshotFields | null }
  | { ok: false; problem: "unreadable" | "out-of-range" | "too-big"; length?: Mm };
export function brdLookFromBytes(bytes: Uint8Array, fileName: string): BrdLookResult;
```

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Fit RAILS' controls to a .brd's cross-sections, re-read the bottom where our rail begins, and keep the stringer — lib, tested</name>
  <files>lib/geometry/brd-rails.ts, lib/geometry/brd-rails.test.ts, lib/geometry/brd-bottom.ts, lib/geometry/brd-bottom.test.ts, lib/export/brd-fit-preview.ts, lib/export/brd-fit-preview.test.ts, lib/models/brd-board.ts, lib/models/brd-board.test.ts, plus every test or spec that builds a BrdFitLook by hand (grep `planedBottom:` in the `*.test.ts` files and `e2e/` — add `rails: null`; `lib/geometry/side-profile.ts` and `components/bottom/bottom-copy.ts` use the word for something else and are not touched)</files>
  <read_first>W/lib/geometry/rail-bands.ts (RailSectionSpec, RailBandSpec, DEFAULT_RAIL_BAND_SPEC, RAIL_RATIO_RANGE, RAIL_SCALE_RANGE, RAIL_NUDGE_KEYS / _LIMIT_IN / _STEP_IN / _NAMES, deckProfileSliderStep, effectiveDeckPercent, railFamilyLabel, railPlotBounds, computeRailSectionOutput); W/lib/geometry/finished-rail.ts (sectionFinishedRail, sampledFinishedRail, fittedFinishedRail, finishedRailReach, SECTION_POINTS); W/lib/geometry/volume.ts (boardSections, boardSectionsWith — the one-rail path and the fades, RAIL_CHARACTER_FADE, railCharacterOf, bottomedHalfSection); W/lib/geometry/bottom-draw.ts (ghostRail); W/lib/geometry/design.ts (designCrossSectionInput, designSideProfile, deriveEffectiveRails, designBottomBoard, designFinPlacement, railAnchorStations, LIVE_DESIGN_RULES); W/lib/models/design-snapshot.ts rules 10–13 (what a saved board's rails hold; rule 11); W/components/rails/rail-controls.tsx (every control, its range, its step); W/lib/geometry/brd-bottom.ts (brdBottomSections, brdBottomBlends, fitBottomToBrd, measureBrdBottom, brdFittedBottomBoard, brdStringerLift); W/lib/export/brd-fit-preview.ts (brdFitLook, brdBottomRows); W/lib/export/brd-preview.ts (sampleKnots); W/lib/models/brd-board.ts; S/kvo/fast.ts, gap2.ts, lean.ts, pipeline.ts, pipeline2.ts, pipeline3.ts, final.ts, rt.ts (the planner's measured method — never copy them into the repo; the plan's method is the specification).</read_first>
  <behavior>
    - brdRailRegion / brdRailGap / brdRailWholeGap on made-up halves: a half against itself is 0; a half against itself moved 2 mm up has largest 2 to 1e-9 and region points only beyond reach − 3"; a difference only on the bottom 5" in from the rail shows in the whole gap and not in the rail gap; `where` reads "deck", "rail" or "bottom" for a bump placed on each, with inFromRail to 0.1 mm.
    - brdRailBoard(fit, bottom) agrees with the board brdBoardFields(fit, name, bottom) opens (designCrossSectionInput of its fields: halfWidthAt, thicknessAt and the bottom sampler at 50 stations to 1e-9) — the rails fitted are measured on the board that opens.
    - brdOurRailHalf with a section's own rails equals placedHalfSection / ghostRail of boardSections at that station, reversed and lowered, to 1e-9; if a fast copy is ported (method step 3), it equals the slow way to 1e-9 over 200 seeded random candidates (every box, Hard Edge, every nudge on its grid), on a flat board, a concave board and a vee board.
    - brdAnchorSections picks the nearest section to 12" / L/2 / L − 12" each once (nearest pairs first); brdBottomRows now uses it and every existing brdBottomRows test stays green.
    - fitBrdRails returns every value on its control's grid and inside its range (Ratio a multiple of 0.5 in 20–80; Deck Profile = 100 − k x the anchor's step, ≥ 75; Family 1–5; scale a multiple of 0.05 in 0.5–1, the centre 1; every nudge k/16" inside its limit; never tail Symmetrical with Hard Edge; Single and Sharp off under Hard Edge).
    - **Round trips** (module-scope builders, one written file per case, the way S/kvo/rt.ts writes them: `buildBoardSurface` → `brdText` → `readAnyBrd`; on the hand-set `stock|hard` board of phase16RailCharacterBoards): H1–H10 of the plan's table through brdFitLook. Every case: the fitted rail value over the file's usable sections no more than 0.2 mm above the written rails' own value on the same read-back board. H1, H2, H3, H5, H8, H9, H10: every rail's Hard Edge, Symmetrical, Single and Sharp exactly the written ones; Ratio within 2.5; Deck Profile within 2 of its grid steps. H4: order "rails-first"; the bottom flat in all three sections; all three rails Symmetrical with Ratio within 2.5 of 50. H8: the bottom's kind and depth as written. If the file takes more than 60 s, keep H1, H4, H5, H8 and say so in the SUMMARY.
    - brdBottomSections with no windows is exactly today's (every existing brd-bottom test green, the four files' parity unchanged in the check script); with a window for a section, its across runs 0…window in 24 steps and `window` is stored; brdBottomBlends blends windows as it blends reaches; fitBottomToBrd passes windows through.
    - brdRailWindows: never wider than 9/10 of the reach; a section whose rail begins only 1/8" past the 9/10 window keeps undefined (today's), one 1/2" past narrows; narrowed is true only then.
    - brdFitLook: a ReadBrdBoard with sections [] gives rails null and the look exactly as before (fit, bottom null, planedBottom); for the flat stock board's file the look's fit deep-equals fitBoardToBrd(lines) and its bottom is flat (the gwr founder-rule tests stay green: a flat, vee or belly leaves the fit to the last digit); order "bottom-first" and narrowed false for H1.
    - **R5:** for H1, H4 and H8 the 3D board's stringer lines (`boardStringerLines(buildBoardSurface(...))` of the opened fields) with the fitted rails equal those with DEFAULT_RAIL_BAND_SPEC to 0.01 mm on every shared ring; gwr's finished-stringer test (the opened board's finished stringer equals fit.lines.bottom less its centre within 0.05 mm) holds with the rails in the fields.
    - brdBoardFields(fit, name, bottom, rails): the rails ride in the fields and read back deep-equal through readBoardEntry; absent → DEFAULT_RAIL_BAND_SPEC exactly (et0's and gwr's tests stay green).
  </behavior>
  <action>
Write the tests above first (RED), then the code (GREEN). Rule 1 throughout: pure, millimetres via `mm()`, every inch figure through
`inchesToMm`, nothing rounded (the founder: a board keeps actual values; the controls' own grids are steps, not rounding).

**lib/geometry/brd-rails.ts** (new). Header comment: the founder's two quotes (objective), what the fit does in a shaper's words
(the three rails, the seed, the moves on RAILS' own steps and the 0.1 mm rule, the prune, the alignment and why — the Egg's 3.88 →
2.07 mm — the rail region and why 3", where the rail begins, the narrowed windows, the two orders and why the closer wins), the limits
(the plan's "What the model cannot follow"). Implement "The method, written out" steps 1–8 and 11–12 with the interfaces above; the
search reads every range and step from rail-bands.ts (no slider figure is restated) and works in millimetres with inch grids built
through `inchesToMm`. A candidate is tried once (remember tried candidates by their settings). `fitBrdRails` with `from` runs step 5
only, boxes and Family held (the polish). Doc-comment every constant with the measurement it came from.

**lib/geometry/brd-bottom.ts** — only the optional windows: `brdBottomSections(sections, length, windows?)` uses `windows[i] ??
BRD_BOTTOM_WINDOW x reach` as section i's window and stores it as `window` on `BrdBottomSection`; `brdBottomBlends` blends `window`
like `reach`; `fitBottomToBrd(sections, board0, windows?)` passes them through. Every line of the search untouched; the header gains
one paragraph (quick 261113-kvo: a section's window stops where our fitted rail begins when that is more than 1/4" inside 9/10).

**lib/export/brd-fit-preview.ts** — `brdFitLook(board)`: steps 9–11 (bottom-first, rails-first when triggered, the choice), sampling
each usable section's knots with `sampleKnots(knots, BRD_RAIL_SAMPLE_STEPS)` into `BrdRailLine`s; share the "bottom → lift → planed
refit" piece between today's path and the re-reads; `BrdFitLook.rails`; doc-comment the flow. `brdBottomRows` uses
`brdAnchorSections`. Change nothing else here in this task.

**lib/models/brd-board.ts** — `brdBoardFields(fit, fileName, bottom?, rails?)`: `rails: rails ?? DEFAULT_RAIL_BAND_SPEC`; header
comment updated (the rails open with the board, in the snapshot's own rails; no new storage). Callers stay as they are until Task 2.

Then write `S/kvo/check.ts` (imports `readAnyBrd` and `brdFitLook` by absolute path from W; reads the four AkuShaper files and
`mid.brd`, `testLB.brd`; prints per file the order, the bottom before/after (names and figures), the three rails' settings in RAILS'
words, the rail closeness (worst / typical / where) and each usable section's figure, the R3 windows that narrowed, and the CPU time
of `brdFitLook` via `process.cpuUsage` with the machine's load) and run it. Compare with the plan's tables: the bottom names and
figures of the four files must match the "Bottom after this task" column exactly (no change); the order must be bottom-first for
all but testLB; rail worst and typical within 0.3 mm of the plan's (the search has ties — say what differs and why in the SUMMARY
rather than tuning to the table). **Time budget** (CPU, `process.cpuUsage`, this Mac, report the load): the rails' part (everything this task adds
to `brdFitLook`) under 450 ms for each of the four AkuShaper files, the whole look under 1.0 s; `mid.brd` under 1.4 s; `testLB.brd`
under 3.5 s (planner, untuned: 0.4–0.6 s added, 0.81–0.97 s whole, 1.05 s, ~3.2 s). If over,
apply in this order and re-measure: port the one-station fast copy (step 3); file halves at 90 points instead of 120; nudge steps
±1, ±4 (±16 the dome) only; the seed's Deck Profile every ~8% instead of 5%. Report the times and anything applied. Keep the script
and its output out of the repo.
  </action>
  <verify>
    <automated>/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/vitest run --root /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 lib/geometry/brd-rails.test.ts lib/geometry/brd-bottom.test.ts lib/geometry/brd-fit.test.ts lib/geometry/brd-wings.test.ts lib/export/brd-fit-preview.test.ts lib/models/brd-board.test.ts lib/geometry/brd-blank-suggest.test.ts lib/export/brd-blank-words.test.ts lib/export/brd-read.test.ts lib/geometry/rail-bands.test.ts components/template/build-brd-overview-pdf.test.ts lib/units-isolation.test.ts && /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/tsc --noEmit -p /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/tsconfig.json && npm --prefix /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 run lint && /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/tsx --tsconfig /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/tsconfig.json /private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/kvo/check.ts</automated>
  </verify>
  <done>New tests fail before the code and pass after; every existing test in the touched suites green; the check script shows the four AkuShaper bottoms unchanged, the orders as planned, the rail figures within 0.3 mm of the plan's (or the difference explained), and times inside the budget (or the fallbacks applied and reported); tsc and lint clean (the known warning aside). One commit, plain English, e.g. "Opening a .brd now works out the closest rails RAILS' own sliders and boxes make from the file's cross-sections, and reads a rolled rail as a rail rather than a belly (maths and tests only)".</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The RAILS block on the preview and the printed overview; Open as a Board carries the rails</name>
  <files>lib/export/brd-fit-preview.ts, lib/export/brd-fit-preview.test.ts, components/setup/brd-fit-dialog.tsx, components/setup/open-board-file.tsx, components/template/build-brd-overview-pdf.ts, components/template/build-brd-overview-pdf.test.ts, e2e/brd-fit-preview.spec.ts</files>
  <read_first>The files of Task 1 as committed; W/lib/export/brd-fit-preview.ts as it stands (BRD_FIT_COPY, closenessSentence, gapWhere, bottomSheetParts, brdBottomFrames, brdFitSheet, wingLines); W/components/setup/brd-fit-dialog.tsx (FitBody, BottomBlock, CAPTION_CLASS, railLineProps, the controls list, the not-read line); W/components/rails/rail-controls.tsx (the words each control shows: "Deck Profile — {tapered thickness} (Tapered Thickness)", "Family — {railFamilyLabel}", "Ratio — {top}/{bottom}", "Symmetrical", "Hard Edge", "Scaled from center by — {0.00}", the nudge labels, "Use Single Tuck", "Sharp Bottom Tuck"); W/components/design/design-store.tsx (how RAILS' outputs are built: effectiveRails → railsOnTheBottom → computeRailBands — the Deck Profile figure RAILS shows when the board opens); W/lib/geometry/rail-bands.ts railPlotBounds; W/lib/geometry/measure-display.ts (formatMark, formatMarkOrLess, formatSignedMark, formatDim); W/components/template/build-brd-overview-pdf.ts (Item kinds, heightOf, the second-page rule `onSecondPage`, drawItems, the foot checks).</read_first>
  <behavior>
    - brdRailRows: nose, centre, tail; each the section its anchor was fitted to (BrdRailsFit.read), or null; rails null gives three nulls.
    - brdRailFrames: drawings in nose, centre, tail order for rows with a section; one scale across (the span = the widest of the three rows' `−railPlotBounds(result).xAxisMin` of our fitted rail there, never past the stringer, fills 1000 units less the air); true height (ky = kx); the rail at the right, x running in toward the stringer to the left; each file and fit line runs only over the span; the bottom line at the stringer bottom's height across the span.
    - brdFitSheet, Imperial and Metric: closeness.rails = closenessSentence("Rails", …) with the where words ("on the deck 4 3/8\" in from the rail", "at the rail", "on the bottom 3/8\" in from the rail"), null when rails is null; the rails table's three columns and six rows: `at` (gapWhere or "No section here"), `deck` (the tapered thickness RAILS' own Deck Profile label will show for that rail when the board opens, through formatMark — marks: whole mm in Metric), `shape` (`${railFamilyLabel} · ${top}/${bottom}`), `ticked` (the ticked boxes in RAILS' words — Symmetrical, Hard Edge on the tail, Use Single Tuck, Sharp Bottom Tuck — joined " · ", or "—"), `advanced` (Scaled from center by 0.85 on a tip when not 1.00, then each moved nudge `${RAIL_NUDGE_NAMES[k]} ${formatSignedMark(v)}`, or "—"), `close` (that column's section: `within ${formatMarkOrLess(largest)}, typically ${formatMarkOrLess(mean)}`); notes: the rail-region note, the sections-read line, the rails-first note when order is rails-first, the Tail Rail Blends From / Ends At note; controls.rails = railLine of the three; the words Symmetrical, Hard Edge, Use Single Tuck, Sharp Bottom Tuck, Deck Profile, Family, Ratio and Scaled from center by each appear in rail-controls.tsx's source (a test reads the file as text); notRead = notReadAfterRails whenever rails is read, today's sentence otherwise, and rails = { read: false, line: railsUnread } then.
    - The open fields: the dialog's Open as a Board fields are brdBoardFields(look.fit, name, look.bottom?.bottom ?? null, look.rails?.rails ?? null) — a test on the round-trip H5 look reads them back through readBoardEntry with the tail's Single and Sharp ticked and Hard Edge off.
    - buildBrdOverviewPdf: the RAILS block prints after BOTTOM (caption, the three drawings with captions, the table, the notes) and controls.rails and the Rails HOW CLOSE line; the RAILS block always rides with the BOTTOM block (page 1 if it holds both, else page 2); for the flat stock Shortboard, the Mid-length and the concave Shortboard at side Height 1, 2, 4 and 8 in both systems the PDF is one or two pages, never more; if page 2 would overflow, RAILS alone goes to a third page (never for these cases); a look with rails null prints the unread line; every baseline inside its own page; the units-isolation walk stays green.
  </behavior>
  <action>
**lib/export/brd-fit-preview.ts.** Add the copy (interfaces above) to `BRD_FIT_COPY`, in plain words: `railsCaption` "RAILS";
`railSectionsCaption(label)` → `CROSS-SECTIONS · ${label}` with `sectionHeightLabel({ heightAsked: 1, heightDrawn: 1 })`
("TRUE HEIGHT"); `railSectionCaption(where, width)` → `${where} · ${width} wide` (the section's full width as a dim); `railColumns` {
nose: "Nose", center: "Centre", tail: "Tail" }; `railRowLabels` (above); `railWords` (RAILS' own words, copied because lib cannot
import a component; the test pins them to rail-controls.tsx's text); `railRegionNote` "Each rail is read from the outer 3\" of the
file's bottom, round the rail and over the deck to the stringer, against our board's own cross-section at the same place — our
bottom included. Between the three, RAILS blends one rail into the next."; `railsFirstNote` "This file's rail rolls in from well off
the rail, so its rails were fitted first and its bottom read only out to where our rail begins."; `railBlendNote` "Tail Rail Blends
From and Ends At are left where a new board puts them."; `railsUnread` "The file's rails couldn't be read: it has no cross-sections we
could use, so the board opens with a new board's rails."; `railLine(nose, centre, tail)` → `Rails: Nose ${nose} · Centre ${centre} ·
Tail ${tail}` (each `${family} ${top}/${bottom}` plus `, ${ticked}` when any box is ticked); `notReadAfterRails` "Fins aren't read
from the file: the board opens with the fins a new board starts with." `closenessSentence` accepts "Rails". The deck cell's figure
is the one RAILS shows (`computeRailSectionOutput` through the same pieces the design store uses on the opened board — effective
rails, the bottom's rail lift — so the preview and RAILS can't disagree). Add `brdRailRows` and `brdRailFrames` (interfaces above;
air 30 units a side, pads 12 top and bottom). Every word and figure goes into `brdFitSheet` so the dialog and the paper print the same.

**components/setup/open-board-file.tsx**: `fields = brdBoardFields(look.fit, file.name, look.bottom?.bottom ?? null, look.rails?.rails ?? null)`.

**components/setup/brd-fit-dialog.tsx**: a `data-brd-fit-close-rails` HOW CLOSE line after the bottom's when set; the RAILS block
`data-brd-fit-rails` right after the BOTTOM block and before OUR CLOSEST FIT, in the BOTTOM block's family: its caption
(CAPTION_CLASS), the CROSS-SECTIONS caption, the drawings in the same auto-fit grid (`data-brd-fit-rail-section={key}` figures with
`data-brd-fit-rail-section-caption`, an `<svg viewBox="0 0 1000 {height}" className="w-full h-auto">` with the file line
`data-brd-fit-line="file"` in the file's ink and ours `data-brd-fit-line="fit"` with `railLineProps(1)`, the bottom line as the
BOTTOM block draws its straightedge, every stroke `vectorEffect="non-scaling-stroke"`), the table `data-brd-fit-rails-table` laid out
as the bottom table (rows `data-brd-fit-rails-row={at|deck|shape|ticked|advanced|close}`, cells `data-brd-fit-cell={nose|center|tail}`),
notes `data-brd-fit-rails-note`; unread: `data-brd-fit-rails-unread`. `data-brd-fit-control="rails"` in the controls list.

**components/template/build-brd-overview-pdf.ts**: new Item kinds for the rail drawings (three in a row, each scaled by cell width /
1000, captions above, the two lines as single `doc.lines` paths in the file and fit strokes) and the rails table (as `bottomTable`,
six rows); the HOW CLOSE rails line after the bottom's; the RAILS items appended to the BOTTOM block's list so they ride with it
(`underBottom` or its successor), the rails control line in OUR CLOSEST FIT, the new not-read line. If page 2 would overflow, the RAILS
items alone go to a third page from the top margin; update the header comment (one page the aim; BOTTOM and RAILS share page 2;
a third page only if page 2 cannot hold RAILS, which no real file has needed). Tests per the behavior list.

**e2e/brd-fit-preview.spec.ts**: keep every existing test compiling and green with the new words (expected text from
`brdFitSheet(brdFitLook(…))`); no new tests yet.
  </action>
  <verify>
    <automated>/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/vitest run --root /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 lib/export/brd-fit-preview.test.ts lib/models/brd-board.test.ts components/template/build-brd-overview-pdf.test.ts components/template/build-overview-pdf.test.ts lib/geometry/brd-rails.test.ts lib/units-isolation.test.ts && /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/tsc --noEmit -p /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/tsconfig.json && npm --prefix /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 run lint && PW_PORT=3117 /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/playwright test -c /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/playwright.config.ts brd-fit-preview</automated>
  </verify>
  <done>New tests fail first and pass after; the Overview Sheet's own tests and units-isolation green; every existing preview browser test passes on desktop, iPhone and Android with the new words; tsc and lint clean. One commit, plain English, e.g. "The .brd preview and its printed overview now show the file's rails beside ours at three cross-sections, with the fitted RAILS settings and how close, and Open as a Board opens with those rails".</done>
</task>

<task type="auto">
  <name>Task 3: Read and fit the file in a background worker, with a "Reading the file…" line; timings before and after</name>
  <files>lib/export/brd-look.ts, lib/export/brd-look.test.ts, components/setup/brd-look.worker.ts, components/setup/open-board-file.tsx, components/setup/board-file-copy.ts, e2e/brd-fit-preview.spec.ts</files>
  <read_first>W/node_modules/next/dist/docs/ (search for "Worker": the Turbopack page and lazy-loading's magic comments — `new Worker(new URL(...), import.meta.url)` is supported); W/components/setup/open-board-file.tsx (lookAtBrd, handlePick, the status line, the pick-again rule); W/components/setup/board-file-copy.ts; W/lib/export/brd-read.ts (readAnyBrd, BRD_READ_MAX_BYTES, the problems); W/lib/export/brd-fit-preview.ts (brdLengthWords); W/e2e/brd-fit-preview.spec.ts (pickFile, dialogOf).</read_first>
  <action>
**Before you change anything, measure.** Copy et0's picture script to `S/kvo/shoot/` (reuseExistingServer, PW_PORT=3117, testDir
there) and write `S/kvo/shoot/timing.spec.ts`: on the desktop project, for each of the four AkuShaper files, `mid.brd` and
`testLB.brd` (paths from `~/Downloads`, read by the script, never copied), register a `PerformanceObserver` for `longtask` on the home
page, pick the file, wait for `[data-brd-fit]`, and report the longest long task and the time from the pick to the dialog. Run it
twice and keep the numbers (this is "before": the look with rails, on the page).

**lib/export/brd-look.ts** (new, pure): `brdLookFromBytes(bytes, fileName)` — the size check (`BRD_READ_MAX_BYTES` → "too-big"),
`readAnyBrd` (its problems through), `brdFitLook`, and the fields `brdBoardFields(look.fit, fileName, look.bottom?.bottom ?? null,
look.rails?.rails ?? null)`; any throw → `{ ok: false, problem: "unreadable" }`. Test: the app's own Shortboard file gives ok with the
same look as brdFitLook(readAnyBrd(bytes).board) (deep-equal) and fields; `structuredClone` of the result deep-equals it (the look
crosses to the page by structured clone: no functions, no class instances); empty bytes, junk and an out-of-range length give their
problems.

**components/setup/brd-look.worker.ts** (new): a module worker: `self.onmessage` takes `{ id, bytes, fileName }`, posts back `{ id,
result: brdLookFromBytes(bytes, fileName) }` (any throw → unreadable). No React, no DOM beyond the worker's own `self`.

**components/setup/board-file-copy.ts**: `reading: "Reading the file…"`.

**components/setup/open-board-file.tsx**: `lookAtBrd` reads the bytes, sets a `reading` state that shows the line in a muted
`<p data-brd-reading role="status" aria-live="polite">` under the button (the problem line stays as it is), then runs the look in the
worker — `new Worker(new URL("./brd-look.worker.ts", import.meta.url), { type: "module" })`, one per pick, terminated when it answers
or a newer pick starts; a pick counter so a stale answer is dropped — and falls back to `brdLookFromBytes` on the page after two
animation frames (so the line has painted) when `Worker` is missing, construction throws, or the worker errors. The answer: a problem
→ today's quiet lines (`brdTooBig`, `brdOutOfRange(...brdLengthWords(...))`, `brdUnreadable`); ok → `setLooking({ fileName, look,
fields })` as today. The line goes when the answer arrives. Update the header comment (the file is read in a background worker so the
page stays live; nothing leaves the browser).

**After:** run `S/kvo/shoot/timing.spec.ts` again (twice). Report before/after for each file: the longest long task and the time to
the dialog. The aim: the longest blocked stretch under 100 ms on every file (the dialog's own first paint aside — if that alone is
over 100 ms, report it separately). Then the whole `e2e/brd-fit-preview.spec.ts` on its three projects must stay green (the worker
answers in the dev server under Turbopack on Chromium and WebKit). If the worker cannot be made to work on the dev server after a
bounded try (say what failed), keep the fallback path only — the line still shows before the work — record the worker under
"Found, not fixed" as its own follow-up, and say so in the SUMMARY.

Add one browser test, `b22`, desktop only: pick the app's own Shortboard file — `[data-brd-reading]` shows "Reading the file…"
(catch it with `page.waitForSelector` set up before the pick) and then the dialog opens and the line is gone.
  </action>
  <verify>
    <automated>/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/vitest run --root /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 lib/export/brd-look.test.ts lib/export/brd-fit-preview.test.ts && /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/tsc --noEmit -p /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/tsconfig.json && npm --prefix /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 run lint && PW_PORT=3117 /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/playwright test -c /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/playwright.config.ts brd-fit-preview</automated>
  </verify>
  <done>The timing script's before and after figures recorded for six files; the page's longest blocked stretch under 100 ms with the worker (or the fallback recorded as a follow-up with the reason); every preview browser test green on desktop, iPhone and Android, b22 included; tsc and lint clean. One commit, plain English, e.g. "Opening a .brd now says Reading the file… straight away and works it out in the background, so the page never freezes while a long board is read".</done>
</task>

<task type="auto">
  <name>Task 4: Browser proof on a computer and both phones, and pictures and printed overviews of the four files for the founder's look</name>
  <files>e2e/brd-fit-preview.spec.ts, .planning/quick/261113-kvo-a-brd-s-rail-shapes-are-read-from-its-cr/pictures/</files>
  <read_first>W/e2e/brd-fit-preview.spec.ts as it stands (its helpers: boardFile, lookOf/sheetOf, pickFile, dialogOf, storedOpenBoard, keptRaw, startPresetAndComeBack, the gwr and hyy tests b13–b21, b22 from Task 3); W/components/rails/ (the hooks RAILS shows its readouts by — `[data-ratio-readout]`, the Family heading, the section tabs); S/gwr/shoot/ and S/gwr/pdfcheck.py (the picture and PDF scripts to copy).</read_first>
  <action>
**New browser tests**, numbered on from b22: module-scope board files written the way Task 1's round trips write them — the H5 board
(tail Use Single Tuck + Sharp Bottom Tuck, Hard Edge off) and the H4 log-rail board; every expected word and figure from
`brdFitSheet(brdFitLook(readAnyBrd(bytes).board), …)` and `brdBoardFields` worked out in the spec — exact on desktop and Android, by
shape on the iPhone as the file already does.
- **b23 (all three) the RAILS block.** Pick the H5 file: three `[data-brd-fit-rail-section]` (nose, centre, tail) each with a file and
  a fit line; the eighteen table cells and the Rails HOW CLOSE line equal the sheet's; the tail column's Ticked cell reads "Use Single
  Tuck · Sharp Bottom Tuck"; `[data-brd-fit-control="rails"]` equals the sheet's; the not-read line is the fins sentence. On a phone
  the drawings stay inside the screen.
- **b24 (all three) Open as a Board carries the rails.** Fresh home page, pick the H5 file, Open as a Board: the kept board
  (`storedOpenBoard`) holds `rails` equal to the fields' rails (desktop within 1e-9, iPhone within 0.01 mm); go to /design/rails and
  see, on a computer, the centre's "Ratio — {top}/{bottom}" readout and Family heading as fitted, and the tail's Single Tuck box ticked
  in its Advanced menu.
- **b25 (desktop) the log rail goes rails-first.** Pick the H4 file: every bottom cell of "Our fit" reads flat, the rails-first note
  shows, and each rail's Ticked cell reads "Symmetrical".
- **b26 (desktop) a file with no cross-sections**: `[data-brd-fit-rails-unread]` holds the sheet's line, no rail drawing, the not-read
  line is today's (rails and bottom contours), Open as a Board opens with a new board's rails.
- **b27 (desktop) the printed overview of the H5 board** from the print frame: one or two pages (`/\/Type \/Page\b/g`), each MediaBox
  595.27… x 792, holding "RAILS", "Use Single Tuck" and "Our fit".
Run the spec, then `e2e/board-file.spec.ts` (its f1 is the known failure — confirm it is the only one, same last-digit message).

**Pictures and printed overviews** — `S/kvo/shoot/` (from Task 3) writes into `W/.planning/quick/261113-kvo-a-brd-s-rail-shapes-are-
read-from-its-cr/pictures/`: `preview-desktop-<key>-rails.png` (body scrolled to the RAILS block) for egg, round-tail, squash-flyer,
noserider; `preview-desktop-round-tail-rails-metric.png`; `preview-phone-round-tail-rails.png` (iPhone 14);
`preview-desktop-testlb-rails.png` (the founder's longboard: rails-first, its bottom now flat-centred) and
`preview-desktop-testlb-bottom.png`; `opened-rails-egg.png` and `opened-rails-squash-flyer.png` (RAILS on a computer after Open as a
Board, the centre's plot and readouts); `overview-<key>.pdf` for the four (Imperial) plus `overview-noserider-metric.pdf`, each
rendered with `qlmanage -t -s 1600 -o <pictures> <pdf>` (page 2 too). Read every PDF back with the copied `pdfcheck.py` (plain
`python3`, pypdf): page count (two expected, never three), each page 595.28 x 792, the file's name, "BOTTOM", "RAILS" and the
fitted Ratio words in the text. **Look at every picture** and say what you saw: nose left; the file's rail solid and ours dashed
readable in every section and lying together round the rail; the Egg's nose deck where ours sits low (the crowned deck); the table
naming each section read and every fitted setting; nothing clipped at any page foot; on the phone the table keeps its three columns
with the words wrapping.

Commit the spec and the pictures only — `git -C W status --porcelain` must list nothing else (no scratch script, no .brd, no
AkuShaper text; scan the PDFs for `(cp [`, `p35 :` and `(p36` and find none). Then write the SUMMARY in plain English: what a shaper
sees; the measured table of the six files from the check script (not copied from this plan) — rails before/after, which settings did
the work, the order, the bottom before/after with **"no cut name changed on the four AkuShaper files"** stated plainly (or, if one
did, flagged at the very top); the round trips; how the stringer was kept (R5); the times before and after the worker; the page
counts; every item of "My calls" for the founder's ruling; honest limits.
  </action>
  <verify>
    <automated>PW_PORT=3117 /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/playwright test -c /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/playwright.config.ts brd-fit-preview board-file; python3 /private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/kvo/pdfcheck.py /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/.planning/quick/261113-kvo-a-brd-s-rail-shapes-are-read-from-its-cr/pictures/*.pdf</automated>
  </verify>
  <done>Every brd-fit-preview test passes on desktop, iPhone and Android (skips only where the spec says one computer is enough); board-file.spec.ts fails only its known f1; every PDF reads back as two pages at most with the expected words; the pictures are in pictures/ and were looked at; the working tree held only the spec and the pictures before the commit. One commit, plain English, e.g. "Browser tests open a .brd's rails on a computer and both phones and open them on RAILS, and pictures and printed overviews of four AkuShaper boards' rails for a look". SUMMARY written.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| picked file -> browser | A `.brd` is anyone's file; its sections now drive a search and a worker. |
| worker -> page | The look comes back by structured clone and becomes a board every page edits and Save sends. |
| fit -> design store | The fitted rails become part of a saved board. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-kvo-01 | Denial of service | fitBrdRails, the two orders | medium | mitigate | The reader's caps stand (64 sections, 200 knots); the search is a fixed budget (a fixed seed grid, at most 6 + 6 rounds of a fixed move list, one alignment of at most four variants, rails-first at most once, the bottom re-read at most once per order); the worker keeps the page live whatever it costs; times reported for the founder's 33-section file. |
| T-kvo-02 | Tampering | brdBoardFields with rails | high | mitigate | Every value is built from RAILS' own ranges and steps (tested), and the fields pass `readBoardEntry` (design-snapshot's rails schema, rule 11 included) before `onOpen`, as a JSON board's rails do; unit-tested to read back deep-equal. |
| T-kvo-03 | Tampering | the worker's answer | low | mitigate | The worker runs only the app's own code on the picked bytes; its answer is the same shape the page would compute and goes through the same `readBoardEntry` check; a stale answer (an older pick) is dropped by its id. |
| T-kvo-04 | Information disclosure | the AkuShaper sample files | medium | mitigate | Read only by scratch scripts outside the repo; Task 4 confirms the working tree holds only the spec and the pictures and scans the PDFs for file text before committing. |
| T-kvo-05 | Information disclosure | the file in the worker | low | accept | The worker is the page's own, in the same browser; nothing is sent anywhere; no database change. |
</threat_model>

<verification>
- Unit: brd-rails, brd-bottom, brd-fit, brd-wings, brd-fit-preview, brd-look, brd-board, brd-blank-suggest, brd-blank-words, brd-read, rail-bands, build-brd-overview-pdf, build-overview-pdf, units-isolation green.
- `npx tsc --noEmit` and `npm run lint` clean (the known old warning aside).
- Scratch: S/kvo/check.ts gives the four AkuShaper bottoms unchanged, the planned orders, rail figures within 0.3 mm of the plan's (or explained), times inside the budget.
- Browser: e2e/brd-fit-preview.spec.ts green on desktop, iPhone and Android (b22–b27 new); e2e/board-file.spec.ts fails only its known f1; the timing script's before/after recorded.
- Paper: every overview PDF read back; two pages at most; every page 210 x 279.4 mm.
</verification>

<success_criteria>
- KVO-R1: the measured table (this plan's, then the executor's own from the shipped code) says how close RAILS' controls come on every file and section, what did the work, and what the model cannot follow.
- KVO-R2: the closest rails RAILS' controls make, every value on its control's step and inside its range, pure and tested; round trips come back at the writer's own floor with the boxes exact.
- KVO-R3: the bottom stops where the fitted rail begins; the four AkuShaper bottoms unchanged (no name changes); the soft 50/50 rail read as rail.
- KVO-R4: the RAILS block on screen and paper; Open as a Board opens with the rails on RAILS; the not-read line is about fins.
- KVO-R5: the stringer, rocker and thickness unmoved by the rails (0.01 mm).
- KVO-SPEED: "Reading the file…" at once; the page live while the file is read; before/after measured.
</success_criteria>

<output>
Create `.planning/quick/261113-kvo-a-brd-s-rail-shapes-are-read-from-its-cr/261113-kvo-SUMMARY.md` when done.
</output>
</content>
</invoke>
