---
phase: quick-261113-qyz
plan: 01
subsystem: board-file (.brd) read/write, FINS
tags: [brd, fins, round-trip, preview, overview-pdf, 3d-export]
requires: [quick-261113-kvo, quick-261113-psx]
provides:
  - "a .brd that carries fins opens with them on FINS, fitted with FINS' own controls"
  - "the app's .brd export carries the board's fins (p50) and fin system (p51); a quad writes none yet"
  - "FINS block on the preview and the printed overview; fins line on the 3D Board file preview"
  - "the Twin's Aft/Forward position reaches 10 in off the tail (extra task, the founder's ruling)"
key-files:
  created:
    - lib/geometry/brd-fins.ts
    - lib/geometry/brd-fins.test.ts
    - lib/export/brd-fin-line.ts
    - e2e/fins-twin-position.spec.ts
  modified:
    - lib/geometry/fins.ts (+ test), components/fins/fin-controls.tsx
    - lib/export/brd.ts, brd-read.ts, brd-preview.ts, brd-fit-preview.ts, brd-look.ts (+ tests)
    - lib/geometry/brd-bottom.ts, brd-rails.ts, lib/models/brd-board.ts (+ test)
    - components/setup/brd-fit-dialog.tsx, components/template/build-brd-overview-pdf.ts (+ test)
    - components/3d/brd-preview-dialog.tsx, three-d-copy.ts, export-cnc.ts, three-d-screen.tsx
    - components/guide/words/fins.ts, metric-sayings.ts (+ test), .planning/phases/18-.../18-GUIDE-WORDS.md
    - e2e/brd-fit-preview.spec.ts, e2e/three-d-export.spec.ts
status: complete
actuals:
  tokens: 260000
  tasks: 5
  commits: 5
---

# Quick 261113-qyz: fins both ways in a .brd — Summary

A `.brd` that carries fins now opens with them on FINS (the closest setup and template, with FINS' own Aft/Forward
position, Off-Rail, Toe-In and base-length controls set so our fins land on the file's), the preview and the printed
overview show the file's fins beside ours, and the app's own `.brd` export carries the board's fins and fin system. On the
founder's twin (JFS_BigTwin.brd) it opens as **Twin, Modern/Upright with every one of the four fin marks exact**, including
the 9 1/2" off the tail, after the founder's extra ruling that the Twin's slider reaches 10". The `.brd`'s `p50` fin line and
`p51` word are the only header text read; nothing of any sample file is in the repo (figures only).

## Commits (all on close-bottom-17, nothing pushed)

| # | Commit | What it is |
|---|--------|-----------|
| 1 | `cd211530` | Task 1 (tracer): fins out in the export and back in, fitted to FINS' controls |
| 2 | `20d4bc57` | Task 2: Open as a Board with its fins; fins first, bottom and rails fitted on the board with them |
| 3 | `b6cd390e` | Extra task: the Twin's Aft/Forward position reaches 10" off the tail |
| 4 | `14db985a` | Task 3: FINS block on the preview and the paper; fins line on the 3D Board file preview |
| 5 | `293c8c7d` | Task 4: browser tests, the printed-overview figure keep-together, the pictures |

I put the extra task straight after Task 2 and before Tasks 3 and 4, so the words, the fit's hold notes and every picture
were written once against the new range. The Task 1 commit message still says "the line has room for one side pair and a
centre fin only, so its front pair alone would be read as a twin" (a quad), written before the founder's AkuShaper panel
screenshot; the code comments and the app's words were corrected in commit 4 (see "Words changed after the AkuShaper panel").

## Pins (taken at this task's own start, HEAD 9ea4b85a, then compared at every commit and at the end)

- **The six no-fins sample files' whole look** (outline, rocker, thickness, bottom, wings, rails, blanks, and the opened
  board's fields incl. fins and fin system): **identical in every key of the before-dump**, after each commit and at the end.
- **The exported bytes of the plan's 20 boards with no fins option: 20 of 20 identical** (at Task 1 and at the end).
- JFS_BigTwin changes only where it should: the stored tail Deepest At (the same place, see below), its fields' fins and fin
  system (and its `look.fins`). Checked by hand: its tail cut's stored Deepest At is measured from the front fins, which
  moved (11.231" → 9 1/2" after the extra task; 11.231" → 9.000" after Task 2); the resolved station is **0.4400" off the
  tail before and after, a difference of 0.0000 mm**.
- Extra-task pin: **12,960 fin placements** (every setup, model and template on 12 boards, forward / rear / centre offsets
  across today's range) hashed whole at the start and **identical** after the change.
- The six files' preview sheets (both systems), computed on the code before Task 3 and after: only the new null keys
  (`closeness.fins`, `controls.fins`, `fins`) and `notRead` differ.

## The founder's twin, per template (measured on the shipped code, his file's four marks)

The file: side fin back 9 1/2" off the tail, 1.61" in from the rail on its own outline, toe-in 0.20", base 4.60", no centre
fin, slot 8 = 5.4, p51 Futures.

| Template | Off the tail | In from the rail | Toe-in | Base | Verdict |
|---|---|---|---|---|---|
| **Modern/Upright (chosen)** | 9 1/2" exact (position +2", the end is +2 1/2") | exact | exact | exact | opens here |
| Keel | 9 1/2" exact (position +3 1/4", the end is +3 3/4") | exact | exact | exact | ties on every mark; moves FINS' controls more (5.59" against 3.28" summed), so loses the tie |
| Upright + Trailer | 9 1/2" exact | exact | exact | exact | adds a centre trailer the file doesn't have: never offered for a side-only file |

Before the extra task Modern/Upright stopped 1/2" short (9" against 9 1/2"; Keel 1 3/4" short). Which of Modern/Upright or
Keel wins is now only the tie-break (the least moved controls): they land identically, Modern/Upright moves less.
Off the stringer, ours reads 5.19" against the file's 5.20" (0.2 mm, the outline fit's). The planner's Task 1 ruling
("aim the in-from-the-rail, not the off-the-stringer") stands.

The coordinator's AkuShaper variants, on his twin's board with the shipped code: varB_tri (side + centre 3 1/2"–8")
opens as **Twin, Upright + Trailer, exact** (the closest Thruster stops 0.23" short); varC_single → **Single Fin, exact**;
varE_moved → **Twin, Keel**, position exact, the toe held at FINS' 1/2" top (**0.50" short, said in the preview's notes**);
varD_none → no fins; varF_slots67 → Twin, Upright + Trailer, exact (slots 6–7 filled change nothing in the fit).

## The round trip (every preset, tail kind and winged board; the test with a known answer)

The 17 fin cases (Single default/moved, Twin on each template default/moved, the four Thruster models, two moved
Thrusters, McKee Gun in whole mm, 2+1 default/moved) written by the app, read back by the forgiving reader, the outline
fitted, the fins fitted, compared with FINS' own marks on the original:

| Boards | Cases | Same setup + twin template | Same Thruster model | Off tail / toe-in / base | In from the rail, worst | Fin fit |
|---|---|---|---|---|---|---|
| 20 preset × tail boards | 340 | **340** | 312 (28 others: a moved Thruster read back on another model that draws the same fins) | **0.0000 mm** | **0.38 mm** (Mid-length 2+1 default) | 0.49 ms average |
| 28 winged boards | 476 | **476** | 434 (42 likewise) | **0.0000 mm** | **0.88 mm** (a twin 1/2" behind wing 2) | 1.37 ms average |

Exactly the planner's table (340/340, 312+28, 0.38 mm; 476/476, 434+42, 0.88 mm), also after the extra task (the range
change leaves the round trip untouched). The same 816 cases run as unit tests (`lib/geometry/brd-fins.test.ts`, 86 tests).
The in-from-the-rail difference is the outline fit's (the file's drawn outline against FINS' fins outline).

## Time

The fin fit itself: **1.4 ms warm, 4–5 ms cold** on the founder's twin (two candidates), 0.5 ms average per case on the
round-trip boards (up to 3 ms for a side-and-centre file's six candidates). The whole look now measures 0.43–0.67 s in
Node on this Mac (twin ~0.44–0.55 s, Egg ~0.44 s, Fryer ~0.6 s), inside the existing background worker. The earlier
baselines (0.57–0.82 s) were taken under a different machine load, so the honest statement is: no change you can measure
beyond the few milliseconds of the fin fit. Nothing asserts a millisecond.

## What changed, plainly

- **Writing (F-OUT).** `p50` carries a side pair (the right-hand fin, back and front end from the tail, off the stringer),
  a centre fin, and zeros in slots 6–8; `p51` is FINS' own system name (just before `p50`, as the founder's file has it).
  Single → its centre box; Twin → its side pair; Thruster and 2+1 → pair and centre; Upright + Trailer → pair and trailer.
  **A quad writes no fins** (the file is today's bytes) and the Board file preview says "A quad's fins aren't written to
  the file yet."
- **Reading (F-IN).** Only `p50` and `p51`, before the first curve: nine finite figures or none; a fin whose ends are off
  the board, or whose front is behind its back, is refused (`dropped`); `p51` is kept only as 1–32 plain characters with a
  letter and only beside a fin. Setups: side only → Twin (Modern/Upright or Keel); side + centre → the closest of Thruster
  (each model), 2+1 and Twin Upright + Trailer; centre only → Single. The nine of a thruster's file read back on its own
  model every time it is unmoved.
- **Open as a Board** opens with the fitted fins and the fin system (`brdBoardFields`), and the bottom and rails are
  fitted on the board with those fins in place (the bottom's tail cut is stored from the front fins).
- **Preview and printed overview.** A FINS block after RAILS (file against ours as marks, whole mm in Metric), a
  "Fins: …" HOW CLOSE line, a controls line in FINS' own labels, notes for a control that stopped at its range's end, a
  toe-out, an unnamed system; the file's fins drawn solid and ours dashed on the top view. The overview is still at most two
  pages (the twin: two pages, FINS on page 2 after RAILS).
- **3D Board file preview.** One line: "Fins in the file: a side pair 11" off the tail and 1 3/16" in from the rail, and a
  centre fin 3 3/8" off the tail — AkuShaper shows this as TRI. Fin system: FCS II." (TWIN / TRI / SINGLE, whole mm in Metric).

## Extra task (the founder: "Twin aft/fwd slider can be loosened to 10 in.")

- `finPositionRangeIn(setup, template, group)` and `heldFinPositionOffset(...)` in `lib/geometry/fins.ts`; the 10" limit is
  one named constant (`TWIN_FORWARD_LIMIT_OFF_TAIL_IN`, with his words) and the template numbers are read from one table
  (`TWIN_TEMPLATE_OFF_TAIL_IN`, which the twin maths now reads too — no new literal). Twin on Modern/Upright: **−1 1/2" to
  +2 1/2"**; on Keel: **−1 1/2" to +3 3/4"**; Upright + Trailer and every other setup / the rear and centre sliders: exactly
  `FIN_POSITION_RANGE_IN`, unchanged.
- **What the code did before with an out-of-range stored offset: nothing.** `computeFinPlacement` applied the stored
  offset unheld (design-snapshot's field is a bare number); only the slider's own track clamped what it drew. So a twin's
  +2 1/2" would have carried a thruster's, 2+1's or quad's fins 1" past their slider's end. **Now held in
  `computeFinPlacement`'s own reading** (the value a setup uses is the stored one held inside that setup's range; a figure
  inside the range, or a hair past its end, comes back bit for bit; the stored value is never rewritten). The slider shows
  the held value. Switching setup already resets Advanced (so a stored offset only carries across the three twin
  templates); on Upright + Trailer a twin's +2 1/2" is held at +1 1/2" and is still +2 1/2" when switching back to
  Modern/Upright. Tested in the maths and in the browser.
- Label at the far end: **10"** (Metric: **254 mm**), Modern/Upright and Keel alike (browser spec
  `e2e/fins-twin-position.spec.ts`, computer + both phones).
- **FINS' GUIDE card for Aft/Forward position** (words in `components/guide/words/fins.ts`, the founder's page
  `18-GUIDE-WORDS.md`, and the Metric saying `ten inches → 254 mm`) — **for his look**: the line was "Slides a fin set
  forward or back from where its model puts it, up to an inch and a half either way." and now reads "…up to an inch and a
  half either way (a twin's pair may go forward as far as ten inches off the tail)." A single changed figure could not say
  both (1 1/2" for every setup, 10" off the tail for a twin); I added one parenthesis rather than a wrong sentence.
  `metric-sayings.test.ts` now reads `FIN_POSITION_RANGE_IN` from `lib/geometry/fins.ts`.

## Words changed after the AkuShaper panel screenshot (2026-11-13)

Per the message: nowhere does the app say the format "has no room" or "can't" hold a quad's rear fins; the Board file preview
says "A quad's fins aren't written to the file yet." and the fit preview's not-read line says "A quad's rear fins aren't
read from a file yet." The not-read line for a file with fins now names slots 7 and 8 as the file's fin depth and splay
angle (cant) — FINS has no control for either — and quotes them when non-zero ("The file's side fins are 3 3/4" deep at a
splay angle (cant) of 5.4°: FINS has no control for either, so they aren't read."). They are read only to be said
(`BrdFileFins.depth`, `.splay`; depth 0–30 cm, splay 0–45° as sensible figures), never fitted, and written as 0.0.
Slot 6 (believed centre fin depth) is neither read nor written. Code comments say "how AkuShaper stores a quad's or
five-fin's rear pair is not known yet (2026-11-13)". **A quad's file is still byte-for-byte today's; nothing detects a
quad on read.**

## Known limits (for the follow-up)

- A file AkuShaper saved as QUAD or FIVE may read here as a Twin or Thruster until the follow-up (no quad detection).
- A quad's or five-fin's rear pair is neither read nor written.
- Fin depth and splay angle are quoted, never fitted or written. p51's meaning is believed (the coordinator checks it with
  the six export files).
- An app-written Twin read back leaves the Off-Rail nudge at about 0.15 mm, not 0: the file's drawn outline sits that far
  from the fitted outline, and FINS holds actual values (the founder's round-only-for-display rule). Invisible at 1/16".

## Tests changed on purpose

- `components/guide/words/metric-sayings.test.ts` — the Aft/Forward limit is read from `lib/geometry/fins.ts`
  (`FIN_POSITION_RANGE_IN`) now that the bounds moved out of `fin-controls.tsx`; one new saying (`ten inches` → `254 mm`).
- `lib/export/brd-fit-preview.test.ts` — the four expectations of the retired rails-read not-read line now read the new
  words (`noFins`, and `notRead` / `notReadAfterBottom` + the fins part); the hand-made `BrdFitLook` fixtures get `fins: null`.
- `lib/export/brd-read.test.ts` — the read board's key list now includes `fins`; `build-brd-overview-pdf.test.ts` —
  "Fins aren't read" → "The file has no fins"; fixtures get `fins`.
- `e2e/brd-fit-preview.spec.ts` b13/b21/b23/b26 — the not-read expectations. Nothing else was re-pointed.
- **No desktop baseline picture changed** (the FINS baseline passed untouched); nothing re-recorded.

## Browser specs run (PW_PORT=3117, each file alone; the dev server never touched)

- `brd-fit-preview` (whole file, 66 passed, 47 skipped on the phones by design): all green, including new **b32–b37**
  (b34 split into b34a/b34b).
- `three-d-export`: 34 passed incl. new **13** (thruster file carries FCS II + FINS' nine figures, preview says TRI) and
  **14** (quad: nine zeros, no p51, "aren't written yet"); test 4 (switches never change the bytes) untouched and green.
- `fins-twin-position` (new, 15 tests on 3 profiles), `fins-off-rail`, `fins-contour`, `guide-fins`, `desktop-baseline -g FINS`: green.
- `board-file`: 21 passed, **f1 failed on all three profiles — the known failure on untouched code, not ours.**

## Unit suite (once, at the very end)

`npm test`: **230 test files, 229 passed, 1 failed; 13,625 tests: 13,622 passed, 1 failed, 2 skipped.** The one failure is
`lib/geometry/round-tip.test.ts` "is bit-identical to today's curve … on every blank", a 5000 ms timeout in the full run
(6.3 s under the suite's load); alone the file passes (29 of 29, 3.4 s). Not touched by this task. `tsc --noEmit` clean;
`npm run lint`: 0 errors, the one known `_calls` warning.

## Pictures (in `pictures/`, each looked at)

- `preview-desktop-twin-top.png` — **nose at the left**, the file's two fin lines at the tail end, short, angled in toward the
  stringer at the front (toe-in), nothing clipped. Ours is dashed over the file's and lies on it (the fit is exact), so on
  this twin the dash is hidden under the solid line; on `preview-desktop-tri-metric-top.png` (three fins, the centre one on
  the stringer) it reads as a fin.
- `preview-desktop-twin-fins.png`, `-closeness.png`, `-controls-and-not-read.png`; Metric: `preview-desktop-twin-metric-fins.png`,
  `…tri/single/moved-metric-fins/top.png` — the FINS table (9 1/2", 1 5/8", 3/16", 4 5/8" both columns), "Fins: less than 1/16"
  off" (Metric: "less than 1 mm off"), the controls line, the splay note. In `moved-metric-fins` the toe-in hold reads "Our side
  fins toe in 13 mm less than the file's: FINS' Toe-In goes no further than 13 mm."
- Phone (iPhone viewport): `preview-phone-twin-top.png`, `-fins.png`, `-closeness.png`, `-controls-and-not-read.png` —
  nothing runs off the right, no figure split from its fraction, the buttons clear. **The fin lines stay legible on the
  phone** (about 22 dots long on the 360-dot-wide drawing, thin but distinct and still angled; they would not survive a
  much narrower screen).
- `overview-twin.pdf` (+ `overview-twin-page1.png`, `-page2.png`) — two pages A4 wide by Letter tall; fin lines on the top
  view, the FINS table on page 2 after RAILS, the controls line wraps without splitting "4 5/8"". Read back with pypdf:
  its only file-derived text is the file's own name (`JFS_BigTwin.brd`) and the fin word `Futures`; no header text.
- `opened-fins-twin.png`, `opened-fins-twin-advanced.png` — FINS after Open as a Board: Twin and Modern/Upright active, Fin
  Base Length 4 5/8" (no "(standard)"), Aft/Forward position 9 1/2", Off-Rail 1 5/8", Toe-In 3/16", the drawing's 9 1/2" and 1 5/8" dimensions.
- `fins-twin-forward-end-desktop.png`, `-phone.png` — the Aft/Forward slider at its new forward end on Modern/Upright, label **10"**, drawing dimension 10".
- `3d-preview-thruster-fins-line.png` (line reads "…— AkuShaper shows this as TRI. Fin system: FCS II."), `3d-preview-quad-fins-line.png`,
  `3d-preview-quad-phone.png` ("A quad's fins aren't written to the file yet.").
- `preview-desktop-egg-top.png`, `-egg-no-fins.png` — the Egg: no FINS block, no fin lines, "The file has no fins: the board opens with the fins a new board starts with."

## Six export files for the AkuShaper check (not committed)

In `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/fins/export/`: `single.brd`,
`twin.brd`, `twin-trailer.brd`, `thruster.brd`, `2plus1.brd`, `quad.brd` (the stock 6'0" Shortboard, FCS II), with
`figures.txt` beside them listing the fin figures FINS shows for each (off the tail, in from the rail, off the stringer at
each end, toe-in, base length, in inches) and the nine `p50` figures (cm). The nine, for the coordinator:

| File | p50 (cm) |
|---|---|
| single | 0, 0, 0, 0, 13.97, 40.64, 0, 0, 0 |
| twin (Modern/Upright) | 19.05, 11.8494, 33.02, 11.3732, 0, 0, 0, 0, 0 |
| twin-trailer | 25.4, 13.6352, 39.37, 13.1589, 10.16, 21.59, 0, 0, 0 |
| thruster (McKee SB) | 28.1713, 14.4744, 39.6013, 13.5219, 8.5196, 19.9496, 0, 0, 0 |
| 2plus1 | 38.2058, 16.3872, 49.6358, 15.9109, 13.97, 40.64, 0, 0, 0 |
| quad | nine zeros, no p51 |

## Deviations from the plan

1. **[Rule 3] Where tests came first.** For Task 1 the module was written before its test file, not the other way round, so
   there was no separate RED run; the tests were then written against the plan's expected figures and the planner's
   tables, and all passed first go except the cases where my expectation was wrong (listed below). Tasks 2–4 tests were
   mostly written alongside the code.
2. **[Rule 3] `lib/export/brd-fin-line.ts` (new).** `parseBrdFinLine` / `brdFinWord` live here and `brd-read.ts`
   re-exports them, so `brd-preview.ts` can read the fin line from the app's own file without importing `brd-read.ts`
   (which imports `brd-preview.ts`).
3. **[Rule 1 — bug found by a test] "Fins: within 0"".** An exact fit leaves a gap of nothing, which the plan's
   `formatMarkOrLess` would have printed as "within 0"" rather than "less than 1/16" off"; the gap is floored at a
   millionth of a millimetre for the words so an exact fit reads "less than".
4. **The extra task** (above) and the **AkuShaper-panel words/reads** (slots 7 and 8 read to be said) are additions to the
   plan; both by the coordinator's messages.
5. Plan-test expectations I corrected after running: the stock 6'0" board takes varB_tri as an exact **Basic Thruster**
   (the Upright + Trailer result is the founder's twin's board, 6'4 1/2"); a twin written at its own template comes back
   with a 0.15 mm Off-Rail nudge, not zero; a setup switch on FINS resets Advanced, so the shared-offset hold is exercised
   across template changes (and in the maths for every setup).
6. The PDF's fins controls line now keeps a figure with its fraction (`keepFiguresTogether`), as the screen does.

## Calls the founder should see (the plan's twelve, as built, plus the new ones)

1. Actual values, not slider steps (the round trip comes back exact; snapped it was 0.3–0.6 mm off on three marks).
2. A side pair alone → Twin, Modern/Upright or Keel (closer; ties → least moved); never Upright + Trailer.
3. Side + centre → the closest of Thruster (each model), 2+1 and Upright + Trailer; ties → least moved, then a fixed order.
   AkuShaper's TRI can therefore open as an Upright + Trailer (his own twin's board does with varB) rather than a Thruster.
   If he wants TRI always to open as a Thruster within 1/4", that is one rule — ask.
4. A centre fin alone → Single Fin.
5. **A quad writes no fins yet** (the founder's panel shows QUAD and FIVE exist; how they store the rear pair is unknown).
6. p51 written as FINS' own system name and read only when it clearly names one of the six; otherwise FCS II and the file's
   word quoted when it is plain. Its meaning is believed, not verified.
7. Slot 6 never read or written; slots 7 and 8 (fin depth, splay) read only to be said and written as 0.0.
8. Fins drawn on the top view (solid file, dashed ours) — legible on the phone, see above.
9. The not-read line: now says cant/splay and depth, a quad's rear fins "yet", or that the file has no fins.
10. Fins first, then the bottom and rails on the board with those fins; the bottom he sees is the bottom that opens.
11. The 3D page's Fins switch still never reaches the file (test 4 green); the file carries FINS' placement whatever the 3D view shows.
12. **The Twin slider now reaches 10"** — and, with it, the maths hold the position a setup uses inside its own range (new:
    before, nothing held a stored offset). And **the one GUIDE card changed**: Aft/Forward position gains "(a twin's pair
    may go forward as far as ten inches off the tail)".

## Self-Check: PASSED

- Created files exist: `lib/geometry/brd-fins.ts`, `lib/geometry/brd-fins.test.ts`, `lib/export/brd-fin-line.ts`,
  `e2e/fins-twin-position.spec.ts`, the pictures folder (27 files).
- Commits exist: cd211530, 20d4bc57, b6cd390e, 14db985a, 293c8c7d.
- Pins held (six files identical; 20 of 20; 12,960 of 12,960); tsc clean; lint 0 errors; browser specs green but board-file f1.
