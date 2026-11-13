# Brief — quick 261113-hyy: a .brd's wings

Fifth step of opening a `.brd`. Read first, in `.planning/quick/`: `261113-d9b-*` (the closest-fit look),
`261113-et0-*` (Open as a Board, the tables, Print Overview), `261113-gwo-*` (a blank per maker — built),
`261113-gwr-*` (bottom contours — planned, BUILT JUST BEFORE this task) — BRIEF, PLAN and SUMMARY where they
exist. Anchor your plan on function and section names, not line numbers; the executor re-reads every file as it
then stands.

## The founder (2026-11-13, after trying the import on the dev server — locked, word for word)

> "On outlines with wings, like they Flyer, let's try to fit the tail block and the outline above the wing as
> best as possible. The wing can be added to bring the curve in, but currently we're taking a halfway approach
> to the wing which will make it harder to match. The preview needs to state where the wing is, how deep it is,
> and how much of a run along stringer there is. (but this makes me think we should be able to match this with
> our wings tab pretty closely by default)."

("The Flyer" is his `~/Downloads/Fryer-5'7-Squash-Flyer-Twin.brd`: today its closest fit is one smooth curve
that splits the difference across the flyers — the outline's widest gap is 2.8 mm at 7 1/16" from the tail,
"where the file is narrower than our fit".)

Read as:

- **W1 — Find the wing.** Tell, from the file's outline alone, whether it has a wing (a step inward on the way
  to the tail) and where: its position off the tail, its depth (how far the outline steps in), and its run
  along the stringer (how long the step takes) — in the terms the app's WINGS tab uses
  (`lib/geometry/wings.ts`: `Wing` — station, depth, run, radius; ranges `WING_POSITION_MIN_IN`,
  `WING_DEPTH_RANGE_IN`, `WING_RUN_RANGE_IN`, `wingPositionTop`, `MAX_WINGS` = 2, the order rule
  `clampWingStations`; steps `WING_STEP_IN` / `WING_STEP_MM`). A file with no wing must never grow one: a smooth
  hip or a file's drawing wobble is not a wing (say the rule and the measured margin).
- **W2 — Fit the curve AROUND the wing, not through it.** When a wing is found, the base outline (the
  `OutlineSpec` the sliders make) is fitted to **the outline above the wing** (nose-ward of it) **and the tail
  block** — not to the stepped stretch — so the wing "brings the curve in". Mind how the app builds a winged
  outline (construction A in `wings.ts`: ahead of the wing the outline IS the curve; behind it the wing's depth
  is taken out and fades linearly to nothing at the tail pod, so the tail block keeps its number): the honest
  target is that **base curve + our wing, drawn by the app's own `applyWings`, lies on the file's outline** end
  to end. Measure what that construction can and cannot follow behind the wing on the Fryer.
- **W3 — Our wing, by default.** The closest fit now INCLUDES the wing (up to two), on values the WINGS tab's
  sliders can show, inside their ranges and order rule, no fin lock (`lock: null`). The dashed line in the
  preview and on the printed overview is the winged outline. Open as a Board opens with the wing on the WINGS
  tab, editable like any wing.
- **W4 — Say it.** The preview and the printed overview state, for each wing found: where it is (off the tail),
  how deep, and how much run along the stringer — **the file's wing as measured** beside **our wing as fitted**
  — in the shaper's system through `units.ts` / `measure-display.ts`. The outline's HOW CLOSE line is then the
  winged fit's. The "not read" line loses "wings or flyers" (rails stay until the rails task).

## My calls (flag what you change)

- Files with no wing (the Egg, the 6'2, the Scoop, and every export of a wingless board) must fit EXACTLY as
  they do today — same controls, same figures. Prove it in the tests.
- The round trip is the test with a known answer: a preset with one wing, and one with two, written by the
  app's own `.brd` writer (check how `lib/export/brd.ts` writes a winged outline — it may or may not carry the
  step), read back, must come back with those wings (position, depth, run within a slider step or two) and the
  same base curve.
- The corner radius: fit it only if it is cheap and stable; otherwise open with the app's default radius and
  say so.
- Fins: `outlineForFins` reads the step sharp, and wing 1 can lock to the front fins — do NOT lock on import
  (a `.brd` carries no fin positions we read); say in the preview nothing about locks.
- Speed: the whole preview fit must stay well under a second; say the measured time with and without a wing.
- A second look at the fit's method is allowed where the wing needs it (e.g. the tail block read from the file
  behind the wing), but the wingless path must not move.

## House rules that bite here

- Work in THIS checkout: `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17`, branch
  `close-bottom-17`. Never `cd` into a subfolder; never touch `/Users/kontoes/Code/shaper` itself. Nothing is
  pushed. No database change (a saved board already holds wings).
- **A dev server is running from this checkout on port 3117** with the browser suite's own settings; the
  founder is trying the feature on it. Playwright with `PW_PORT=3117` reuses it. Never stop it, never start
  another `next dev` or a build in this checkout, never run the whole suite.
- The four AkuShaper sample files in `~/Downloads` (`6'10-Widepoint-Fwd-Egg.brd`,
  `6'2-Round-Tail---Double-Concave.brd`, `Fryer-5'7-Squash-Flyer-Twin.brd`, `Scoop-Noserider.brd`) are never
  committed nor their text copied into the repo; pictures and PDFs made from them go in this task's
  `pictures/`. Only the Fryer has flyers — for more winged test shapes use the app's own exports and hand-made
  outlines built from the format's facts. Scratch stays under
  `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/`
  (earlier scripts: `brdfit/`, `et0/`, `gwo/`, `gwr/`).
- Rule 1 (pure and tested in `lib/geometry/`), Rule 2 (units), plain English. The sketch findings skill
  (`sketch-findings-shaper`, wings.md) holds the wing's drafting and maths decisions.
- `e2e/board-file.spec.ts` test f1 fails on untouched code — known, not ours.
