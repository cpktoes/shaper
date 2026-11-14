# Brief — quick 261113-kvo: a .brd's rail shapes

Sixth step of opening a `.brd`. Read first, in `.planning/quick/`: `261113-d9b-*` (the closest-fit look),
`261113-et0-*` (Open as a Board, the tables, Print Overview), `261113-gwo-*` (a blank per maker),
`261113-gwr-*` (bottom contours — its section reader and its limits), `261113-hyy-*` (wings) — BRIEF, PLAN and
SUMMARY of each. Anchor your plan on function and section names, not line numbers; the executor re-reads every
file as it then stands.

## The founder (2026-11-13 — locked, word for word)

> "It looks promising, so we should then try to fit bottom contours and rail shapes too."

and, on what the fit is balancing:

> "the rocker is tricky becasue we're trying to balance a foil without contours and square rails with a finished
> boards rocker along the stringer"

Bottom contours and wings are built. This task is **rail shapes**.

## What it means here

A `.brd`'s cross-sections (`ReadBrdBoard.sections`, kept whole by 261113-gwr's reader in `lib/export/brd-read.ts`)
each carry the finished rail: the bottom's turn up at the edge, the tuck, the apex, and the deck's roll down to
it. The app's RAILS page builds a rail from its own controls — the rail bands (v2, "Chris Rails v2"), the
finished rail, and the Advanced menu (see `lib/geometry/rail-bands.ts` and whatever sits beside it today,
`components/rails/`, `computeRailSectionOutput`, the RAILS GUIDE cards in `lib/geometry/guide-*.ts` for what
each control does in a shaper's words; memory note: Rails v2 went live 2026-11-03 as quick 261102-gec, with
`.planning/quick/261102-gec-*` holding its plans). **Find out first what a saved board holds for its rails and
which controls a shaper can move** — never restate a range, read it from the code.

Read as:

- **R1 — Measure first (this is the plan's first job, in scratch, before any design).** For each of the four
  AkuShaper files and the app's own exports (`~/Downloads/mid.brd`, `testLB.brd`), at the app's own three rail
  stations (whatever RAILS uses — find it): how close can the app's rail model, with every control a shaper can
  move, come to the file's section from where the rail begins out to the apex and over onto the deck? Say it in
  mm, per file and per station, and show which controls did the work. If the model cannot follow a kind of rail
  (a hard down rail, a 50/50 egg rail, a pinched rail, a chine), say so plainly with the number — that is a
  finding, not a failure.
- **R2 — The fit.** The closest rail the RAILS controls make at each station, pure and tested in
  `lib/geometry/` (Rule 1), every value inside its control's range and on a step the control can show where the
  control snaps (where it does not snap, keep actual values — the founder's rule: round only for display).
- **R3 — Stop the rail reading as a belly.** 261113-gwr reads the bottom "from the stringer to nine-tenths of
  the way out to the rail" and so a soft rolled rail reads as a belly (`testLB.brd`: 5.25 mm off). Once the
  rail is fitted, the bottom's reading width at each section should stop where the fitted rail begins, and the
  bottom fit re-read on that width. Measure what that does to all six files; the four AkuShaper bottoms that
  fit today must not get worse (say the before/after per file). If narrowing changes a fitted cut's name on one
  of the founder's four files, flag it loudly in the plan — do not hide it.
- **R4 — Say it and open it.** The preview and the printed overview gain a RAILS block in the family of the
  BOTTOM block: the file's rail solid, ours dashed, at the three stations (drawn at true proportions or with a
  stated zoom — a rail is small; find what RAILS' own viewer does and follow it), the fitted control values in
  the RAILS page's own words, and how close. Open as a Board opens with the fitted rails on RAILS. The
  "not read" line then loses "Rails" (if nothing is left unread, the line goes or says what still is not read —
  fins, for one; your call, flagged).
- **R5 — The thickness and rocker rule still holds.** The foil is "a foil without contours and square rails":
  check whether fitting rails changes what the opened board's thickness or rocker should be (it should not —
  the stringer line is the stringer line), and prove the opened board's stringer still matches the file as it
  does after gwr.

## My calls (flag what you change)

- Speed matters now: the whole look already blocks the page 0.3–1.1 s on the four files on the dev server and
  2–3 s on the app's own 30-section exports. The rails fit must add little (say the measured ms), and the plan
  should include **moving the whole fit off the page's main thread or showing a plain "Reading the file…" state
  while it works** — whichever is simpler and honest; measure before and after. If that is too much for this
  task, split it out as its own quick and say so at the top of the plan.
- The printed overview is two pages today (BOTTOM on page 2). RAILS goes on page 2 with it; never a third page
  for the founder's four files; nothing refused.
- The round trip is the test with a known answer: each preset (and a few with Advanced menu values moved),
  written by the app's own `.brd` writer (check what `lib/export/brd.ts` writes for a section's rail — it may
  already carry the finished rail), read back, must bring back the rail controls within a step or two.
- Files with nothing to say about rails (a file with no sections, or sections too close to a tip) keep the
  app's default rails and the preview says so in one line.
- Wingless / flat-bottomed / every existing figure: the outline, rocker, thickness, wing and blank figures of
  all six files must not move. Pin them before you change anything.

## House rules that bite here

- Work in THIS checkout: `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17`, branch
  `close-bottom-17` (HEAD f6b62984). Never `cd` into a subfolder; never touch `/Users/kontoes/Code/shaper`
  itself. Nothing is pushed. No database change (check that a saved board already holds every rail control you
  fit — if it does not, stop and say so).
- **A dev server is running from this checkout on port 3117** with the browser suite's own settings; the
  founder is trying the feature on it. Playwright with `PW_PORT=3117` reuses it. Never stop it, never start
  another `next dev` or a build in this checkout, never run the whole suite.
- The four AkuShaper sample files in `~/Downloads` (`6'10-Widepoint-Fwd-Egg.brd`,
  `6'2-Round-Tail---Double-Concave.brd`, `Fryer-5'7-Squash-Flyer-Twin.brd`, `Scoop-Noserider.brd`) are never
  committed nor their text copied into the repo; pictures and PDFs made from them go in this task's
  `pictures/`. Scratch stays under
  `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/` (make
  `kvo/`; earlier scripts: `brdfit/`, `et0/`, `gwo/`, `gwr/` — `fit7.ts`, `parity.ts` — and `hyy/`).
- Rule 1 (pure and tested in `lib/geometry/`), Rule 2 (units through `units.ts` / `measure-display.ts`; rail
  band marks are marks — whole mm in Metric), plain English everywhere a shaper reads.
- `e2e/board-file.spec.ts` test f1 fails on untouched code — known, not ours. Browser tests in
  `e2e/brd-fit-preview.spec.ts` continue after b21.
