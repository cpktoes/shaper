# Brief — quick 261113-gwr: a .brd's bottom contours

Fourth step of opening a `.brd` (read first: `.planning/quick/261113-d9b-*/` and `.planning/quick/261113-et0-*/`
— BRIEF, PLAN, SUMMARY; both built today on this branch — and `.planning/quick/261113-gwo-*/BRIEF.md`, the blank
suggestion, planned in parallel with this and BUILT JUST BEFORE it: it adds a block under the preview's rocker
table and on the printed overview, so anchor your plan on function and section names, not line numbers).

## The founder (2026-11-13, after seeing the editable board's pictures — locked)

> "It looks promising, so we should then try to fit bottom contours and rail shapes too."

THIS task is **bottom contours** only. Rails are the next task, planned after this one is built (it will reuse
this task's reading of the cross-sections) — do not fit rails here, but read and keep the whole section so the
rails task does not have to read the file a second way.

## What exists

- `lib/export/brd-read.ts` `readAnyBrd` reads the outline, bottom and deck lines — NOT yet the cross-sections
  (`p35`, `(p36 <station> …` blocks; each a half section from the stringer on the bottom, round the rail, to the
  stringer on the deck; AkuShaper files carry 5–7, each with the same knot count, some with a `gps` guide-point
  block; the first and last may be zero-size tips). The app's own writer (`lib/export/brd.ts`) writes 20–35.
- The app's bottom: `lib/geometry/bottom.ts` (Phase 17 — `BoardBottom`: a cut per section key nose / center /
  tail, kinds flat / belly / vee / single / double, depths in 1/16" steps to 1/2", channels and wings separate),
  `bottom-draw.ts`, `rail-bottom.ts`, the BOTTOM page (`components/bottom/`), and the GUIDE cards with the
  founder's own names for the cuts. Read the Phase 17 decisions that bind this (the roadmap entry and
  `.planning/phases/17-bottom-contours/` CONTEXT) — e.g. depth steps, "thickness is planed", channels never in a
  `.brd`, presets flat.
- The app's own `.brd` writer writes a board's contours into the sections (`brdFileBottom`: channels left out).
  So the round trip is the test with a known answer: a board with a known bottom, written, read back, must fit
  to that same bottom.

## What I expect (my calls — flag what you change)

1. **Read** the sections (forgiving, bounded like the rest of `readAnyBrd`; a file with no usable sections is
   still looked at exactly as today, with a plain line that its bottom could not be read).
2. **Fit** (`lib/geometry/`, pure, tested): from each section's bottom half — the height of the bottom across
   the width relative to the stringer and to the rail's bottom edge — to the app's `BoardBottom`: the cut kind
   and depth at each of the app's own section keys / stations (wherever the app's model says a cut applies),
   depths as the app's controls allow them (its own steps and range — never restated). A bottom within a
   tolerance of flat is **flat**: do not invent a 1/64" concave from a file's rounding. Never channels, never
   wings. Report closeness the way the preview already does (largest gap, where) and say which of the file's
   sections each figure came from, since an AkuShaper file has only 5–7 of them.
   Measure first on the four AkuShaper files (the 6'2 is a double concave by name; the others may well be flat,
   belly or vee) and on the app's own exports of boards with each cut — and put what you find in the plan.
3. **Show it**: the preview gains cross-sections — the file's section in solid ink, our fitted section dashed —
   at the stations where the file has them (or the app's three section keys, whichever is honest), in the
   drafting style BOTTOM's own cross-section uses (the bottom's shape exaggerated in height the way BOTTOM does,
   with its Height picker if that is how BOTTOM reads), plus a small table: the cut and depth we fitted at
   nose / centre / tail beside what the file measures there. The same on the printed overview — it may now need
   a second page; one page stays the aim, never a clipped one.
4. **Open as a Board** carries the fitted bottom (it opens with those cuts on BOTTOM, editable like any board).
   Everything else as et0 left it. The "not read" line loses "bottom contours" and keeps rails and wings.
5. **Proof**: unit tests (round trips for every cut kind; the forgiving reader on a hand-made AkuShaper-layout
   text with a `gps` block); the browser spec extended (desktop + both phones); pictures and PDFs of the four
   AkuShaper files for the founder's look in this task's `pictures/`, each one looked at.

## House rules that bite here

- Work in THIS checkout: `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17`, branch
  `close-bottom-17`. Never `cd` into a subfolder; never touch `/Users/kontoes/Code/shaper` itself. Nothing is
  pushed. No database change: check that a saved board already holds a bottom (Phase 17) so nothing new is stored.
- **A dev server is already running from this checkout on port 3117** with the browser suite's own settings
  (the founder is trying the feature on it). Playwright with `PW_PORT=3117` reuses it. Never stop it, never
  start another `next dev` in this checkout, never run the whole suite.
- The four AkuShaper sample files in `~/Downloads` (`6'10-Widepoint-Fwd-Egg.brd`,
  `6'2-Round-Tail---Double-Concave.brd`, `Fryer-5'7-Squash-Flyer-Twin.brd`, `Scoop-Noserider.brd`) are never
  committed nor their text copied into the repo. Scratch stays under
  `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/`
  (earlier scripts: `brdfit/`, `et0/`, `peek.ts`).
- Rule 1 (geometry pure and tested in `lib/geometry/`), Rule 2 (units; a depth is a mark), plain English.
  The founder's standing rule: a board keeps actual values, rounding is for display — but a control that only
  moves in steps is set on a step (say which you chose and why).
- `e2e/board-file.spec.ts` test f1 fails on untouched code — known, not ours.
