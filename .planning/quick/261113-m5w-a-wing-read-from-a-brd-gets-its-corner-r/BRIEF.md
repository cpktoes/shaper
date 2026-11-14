# Brief — quick 261113-m5w: a .brd's wing gets its corner radius from the file too

Follows quick 261113-hyy (wings found and fitted — read its BRIEF, PLAN and SUMMARY first:
`.planning/quick/261113-hyy-a-brd-s-wings-are-found-and-fitted-the-o/`). Anchor on function names, not line
numbers.

## The founder (2026-11-13 — locked)

After seeing the Fryer open with its wing (Position 7 3/8", Depth 1/4", Vertical run 3/8", Corner radius 0"):

> "Update wings to adjust beyond starting values"

Asked which change he meant, he picked: **"Fit the corner radius too"** — a wing read from a file also gets its
Corner radius from the file instead of always opening sharp. The option he picked carried my promise: *"I tried
this once: on the Fryer it came out about 1/16" and wobbled, so I'd re-measure and only round a corner when the
file clearly has one."*

So: every wing control the WINGS tab has is now fitted from the file (position, depth, run, corner radius);
only the fin lock stays off.

## What hyy measured (its PLAN, "The corner radius (my call: not fitted)")

Fitting the radius was tried and dropped as unstable: on the Fryer it came out 0.07" and changed the gap by
under a tenth of a mm; on round trips of the app's own rounded wings the radius traded against run and position
(a rounded wing came back with a slightly long run, sitting a little forward — e.g. 0.80" for a 0.5" run on the
app's default wing 2). That instability is the thing to solve, not to hide.

## What I expect (my calls — flag what you change)

- **Measure first, in scratch** (`scratchpad/m5w/`; hyy's scripts are in `scratchpad/hyy/` — `detect.ts`,
  `wfit.ts` `alt` mode `ALT=3`, `rt.ts`, `rt2.ts`, `final.ts`). Find a method that brings the radius back
  honestly on the round trips with a known answer — the app's own winged boards written by its `.brd` writer
  with radius 0, 1/8", 1/4", and at the radius slider's top (`wingRadiusTop`, `maxWingRadius`,
  `effectiveWingRadius` in `lib/geometry/wings.ts`), one wing and two — AND brings run and position back
  closer than today when the wing is rounded (today's "long run, sits forward" should go). Ideas, not orders:
  fit run + radius + position jointly on the step's own stretch of outline only (a narrow window around the
  step, dense samples from the file's Béziers there rather than the board-wide sampling); or measure the
  corner's roundness directly (how far the file's corner sits inside the sharp corner made by the lines either
  side) and solve the radius from that; mind how dense the writer's own outline knots are at a step.
- **Only round a corner the file clearly has.** A rule with a measured margin: when the file's step is sharp
  (or the evidence is within the writer's/sampler's own noise), the wing opens sharp (radius 0) and nothing
  else about it moves from what hyy fits today. Say the threshold and the margin on both sides (sharp wings
  that stay sharp; rounded wings that come back rounded).
- The radius is a slider on the WINGS tab: fitted inside its range (never more than fits — `maxWingRadius`),
  kept as the actual value found (the founder's rule: round only for display), shown through the tab's own
  formatting.
- **The Fryer:** say what its flyer's corners really are with the new method (file measured vs ours fitted),
  and the outline's gap before/after (today 1.29 mm at 9/16" from the tail, typical 0.41 mm). If the Fryer's
  corners are within the noise, it opens sharp exactly as today and the preview says so — that is a fine
  answer.
- **Words.** The Wing line in the preview and on the printed overview now says the corners for both sides —
  the file's as measured and ours as fitted ("sharp corners" or the radius). One builder in
  `lib/export/brd-fit-preview.ts`, tested. While there, fix the phone wrap inside a mixed number on the Wing
  line ("7" at a line's end, "7/16"" on the next) — keep a measurement together (a no-break join between the
  whole number and its fraction on that line; mind `e2e` regexes vs no-break spaces — memory note: NBSP breaks
  Playwright text regexes unless the test allows it).
- **Nothing else moves.** Wingless files fit exactly as today (hyy's snapshot test stays green, never
  re-recorded); a sharp-winged file's position / depth / run come back exactly as hyy's (pin the Fryer's and
  the round trips' figures before changing anything, and say any that move and why); no fin lock; the WINGS
  tab's own "Add a wing" default unchanged; `outlineForFins` still reads the step sharp.
- Speed: say the fit's time with a rounded wing before/after (two wings with wing 2 rounded was the slow case:
  440–530 ms warm).

## House rules that bite here

- Work in THIS checkout: `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17`, branch
  `close-bottom-17` (HEAD f6b62984). Never `cd` into a subfolder; never touch `/Users/kontoes/Code/shaper`
  itself. Nothing is pushed. No database change (a saved wing already holds its radius).
- **A dev server is running from this checkout on port 3117**; the founder is trying the feature on it.
  Playwright with `PW_PORT=3117` reuses it. Never stop it, never start another `next dev` or a build, never run
  the whole suite.
- **A rails task (261113-kvo) is planned and will be built right after this one in the same files' neighbours**
  (`brd-fit-preview.ts`, the dialog, the overview PDF). Keep this task's footprint small: `lib/geometry/brd-wings.ts`
  and its tests, the Wing words, and the tests that read them.
- The four AkuShaper sample files in `~/Downloads` are never committed nor their text copied into the repo;
  only the Fryer has flyers. Pictures made from it go in this task's `pictures/` (the Fryer's tail close-up,
  the Wing line on a computer and an upright phone, the opened WINGS tab). Scratch stays under
  `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/`.
- Rule 1 (pure and tested in `lib/geometry/`), Rule 2 (units), plain English. Browser tests in
  `e2e/brd-fit-preview.spec.ts` continue after b21 — the rails plan has already reserved b22–b27, so use
  **b28 onward**. `e2e/board-file.spec.ts` test f1 fails on untouched code — known, not ours.
