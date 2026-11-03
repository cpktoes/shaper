---
phase: quick-261103-drw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/rack-art.ts
  - lib/geometry/rack-art.test.ts
  - e2e/board-rack-turn.spec.ts
  - e2e/board-rack.spec.ts
  - .claude/skills/sketch-findings-shaper/references/board-rack.md
  - .planning/quick/261103-drw-the-board-rack-turns-swallow-and-diamond/pictures/
  - .planning/quick/261103-drw-the-board-rack-turns-swallow-and-diamond/261103-drw-SUMMARY.md
autonomous: true
requirements: [QT-261103-drw]
estimate:
  # One executor in its own worktree forked from main (after fd38cf1d, Rails v2 live). Three tasks: before pictures +
  # the one-rule turn in rack-art.ts with its relation tests failing first; the browser proof on both racks + after
  # pictures; gates, docs and the SUMMARY. Every figure below was measured at plan time on main with a draft of exactly
  # this change in a scratch copy (rack-room, wings-readers, rack-models, rack-stand-in and rack-layout suites all
  # green on the draft), so the executor confirms rather than discovers. Calibration: factor 1, 0 samples.
  tokens: 120000
  raw_tokens: 120000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "On the Board Rack a swallow tail (the Fish) turns as a swallow all the way round: edge-on its notch is hidden (the far tail tip fills it, as on a real board), it opens as the board turns, and fully turned it is exactly TEMPLATE's notch — no square tail and no jump near 89.5 degrees."
    - "A diamond tail turns as a diamond all the way round: no thin spike sticking out behind a squared-off tail. Its point shows only the tail's own thickness times cos(angle) — about 2 dots at 60 degrees and under half a dot at 85 on the computer's rack — exactly as every pin tail's point already does."
    - "Every board changes smoothly as it turns: the drawing has the same number of points at every angle, and no point moves more than 2 x (greatest deck height + greatest half-width) x the angle step between two frames. Measured: 0.53 mm (0.1 dot) per tenth of a degree at worst, against 69.85 mm (12.4 dots) across today's switch on the Fish and 50.35 mm (9.0 dots) on a diamond."
    - "At rest every board still shows exactly its side profile, and fully turned exactly its TEMPLATE outline (every TEMPLATE point present, in order, and every other point on its lines)."
    - "The room the rack opens around a turning board and the place its words stand read the very same drawing: the reach changes by at most 0.29 mm (0.05 dot) anywhere and by at most 0.024 mm at mid-turn, and lib/geometry/rack-room.test.ts passes untouched — no word crosses a board."
    - "A swallow's dashed stringer starts at the crotch of its notch, so no line is drawn across the open notch (today the turned Fish's stringer runs down into the empty V)."
  artifacts:
    - path: "lib/geometry/rack-art.ts"
      provides: "one turn rule at every angle: buildRackBoardArt's drawn stations (sections) and swallow notch, turnedBoardPoints closing the tail through the notch's opening, drawnSpan over the same stations, stringerPoints from the crotch"
      contains: "notch"
    - path: "lib/geometry/rack-art.test.ts"
      provides: "the relations: side profile at rest, TEMPLATE outline turned, no snap (same point count, bounded move), the notch opening, the diamond's V, the stringer"
      contains: "no snap"
    - path: "e2e/board-rack-turn.spec.ts"
      provides: "the browser proof on the hover rack (computer) and the swipe rack (both phones): the Fish and a diamond swept through the turn"
      contains: "data-turn"
  key_links:
    - from: "components/setup/hover-rack.tsx and components/setup/swipe-rack.tsx (unchanged)"
      to: "lib/geometry/rack-art.ts turnedBoardPath / halfExtent / spineAnchorX"
      via: "the same calls as today; only what rack-art hands back changes"
      pattern: "turnedBoardPath\\(board\\.art"
    - from: "lib/geometry/rack-art.ts drawnSpan"
      to: "lib/geometry/rack-art.ts turnedBoardPoints"
      via: "both read art.sections with the same sectionCentre/sectionHalf expressions, so the room equals the drawing's own left and right exactly"
      pattern: "art\\.sections"
---

<objective>
The founder, on the live site (2026-11-03): "The board rack renders swallow and diamond tails slowly. the board spins
with either a nipple or square tail then jumps to the correct tail. Can we clean up this rendering so it's smooth?"

The cause, measured at plan time: the rack draws a turning board from 65 cross-sections (each an ellipse — the
outline's half-width across, half the thickness deep) and, from 1.562 radians (about 89.5 degrees) up, swaps to the
TEMPLATE silhouette — a different set of points. A cross-section can't carry a swallow's notch, so the Fish turns
with a square tail; and the outline sampler (`sampleOutline`) reads a half-width of 0 for every station behind a
diamond's tail block (its past-the-end fallback returns the nose's 0), so a diamond turns with a 60-76 mm spike of
the tail's thickness behind a squared-off tail block — the "nipple". At the switch both snap to the real tail.

This plan removes the switch rather than hiding it: one rule at every angle, built from the TEMPLATE outline's own
stations, that is exactly the side profile at rest, exactly the TEMPLATE outline turned, and opens a swallow's notch
continuously in between. The racks themselves do not change — only what `lib/geometry/rack-art.ts` hands them.

Purpose: the Board Rack is the first thing a shaper sees; a tail that changes shape mid-turn reads as a broken drawing.
Output: the one-rule turn with relation tests, a browser proof on both racks, before/after pictures for the founder.
Nothing pushes or deploys: the task merges to main after the founder's look; the founder decides the push.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.claude/CLAUDE.md
@lib/geometry/rack-art.ts
@lib/geometry/rack-art.test.ts
@lib/geometry/rack-room.test.ts
@lib/geometry/outline.ts
@lib/geometry/screen-tiles.ts
@e2e/board-rack.spec.ts
@e2e/board-rack-phone.spec.ts
@.claude/skills/sketch-findings-shaper/references/board-rack.md

Plan-time pictures (uncommitted, in the MAIN checkout — read them by absolute path from the worktree; they show the
target): `/Users/kontoes/Code/shaper/.planning/quick/261103-drw-the-board-rack-turns-swallow-and-diamond/pictures/plan-fish-swallow.png`
and `.../pictures/plan-diamond.png` (the Fish and a Shortboard with the Diamond tail button at 0, 30, 60, 85, 89 and 90
degrees at the computer rack's own scale, today in grey/black, the new rule in magenta, with a 3x tail close-up). The
draft that produced every figure here, including a complete candidate `rack-art.ts`, is archived beside them as
`plan-source.tar.gz` (`plan-source/rack-art.candidate.ts`, plus the measuring scripts `new-rule.ts`, `measure.ts`,
`continuity.ts`, `browser-checks.ts`, `maxdeck.ts` and `pictures.ts`; they ran from `scratch-drw/` inside a copy of the
repo, and `pictures.ts` expects today's file copied to `lib/geometry/rack-art-today.ts` beside the candidate). Use the
candidate as a cross-check, not a paste: the tests come first and the comments must be written for this file.

Worktree rulings (from the project's execute gotchas): symlink main's `node_modules` into the worktree if it has none;
run `npx next typegen` once before `npx tsc --noEmit`; every Playwright run (including `--list`) uses
`PW_PORT=3179 IS_WEBPACK_TEST=1`; never start a server in `/Users/kontoes/Code/shaper` (the founder's review server
on 3005 holds its dev lock); no `git stash`; no `--update-snapshots`; never `cd` into another worktree; the SUMMARY is
written at the relative path inside this worktree. Do not run `npm run build` in the worktree (Turbopack cannot
resolve `next` there) — the orchestrator builds from main after the merge.

## The measured facts this plan rests on (main at fd38cf1d, scratch draft of exactly this change)

- Today on the Fish (swallow, crotch 69.8 mm) the polygon has 130 points below the switch and 323 from it; the
  largest change between two frames 0.1 degree apart is 69.85 mm = 12.4 dots at the 7'0" hover scale (0.178 dot/mm),
  all of it at 89.4 -> 89.5 degrees. A Shortboard with the Diamond tail button: stations 0, 29.4 and 58.7 mm read
  half-width 0 (the spike), and the jump is 50.35 mm = 9.0 dots.
- Under the new rule: the same point count at every angle (Fish 492, diamond Shortboard 451, Shortboard with the
  swallow button 500); the largest move between frames 0.1 degree apart is 0.53 mm (0.095 dot, the Fish at 3 degrees,
  where the notch climbs fastest) and 0.38 mm on the diamond. Over 59 boards (the four presets x the five tail
  buttons, with and without their blank, plus the 15 practice boards) the largest point move per 0.1 degree is 0.863
  of (maxDeck + maxHalf) x 0.1 degree (the hand-set Twin Fish 5'8" at 3 degrees).
- Why the move bound is 2 x (maxDeck + maxHalf) x the angle step: an outer point is xc +/- ext, and
  |d xc / d angle| = |(rocker + deck)/2 - tMid| x sin <= maxDeck / 2 (0 <= rocker <= deck <= maxDeck), while
  |d ext / d angle| = |half^2 - b^2| x sin x cos / ext <= max(half, b); so an outer point moves at most
  (maxDeck / 2 + maxHalf) per radian. The notch's inner points and its apex get the same budget, doubled; they never
  needed more than 0.863 of the undoubled figure on the 59 boards measured.
- The notch formula below equals a brute-force minimum over the cut ellipse to 0 mm over 4,000 random sections.
- The Fish's notch, new rule (visible depth of 69.8 mm, width at the tail): 1 deg 1.4 mm / 4.4 mm; 5 deg 19.8 / 22.1;
  10 deg 36.6 / 44.1; 30 deg 57.6 / 127.0; 60 deg 65.6 / 220.0; 85 deg 69.2 / 253.0; 90 deg 69.8 / 254.0 (= the
  tail's full width, the TEMPLATE V).
- Diamond tip (Shortboard with the Diamond button, tail-tip thickness 23.8 mm): its flat is the tip's thickness x
  cos(angle) — 20.6 mm (3.7 dots) at 30 deg, 11.9 mm (2.1 dots) at 60, 2.1 mm (0.37 dot) at 85, 0.4 mm at 89 (7'0"
  hover scale; 1.6 / 0.28 dots at the practice rack's 0.134 dot/mm). Mid-length with the button: 9.5 mm (1.7 dots) at
  60, 1.7 mm (0.30 dot) at 85. That is the same point every pin tail already draws, not a nipple: the founder's nipple
  was the 60-76 mm spike, 13.5 mm wide at 60 degrees and 13.6 dots tall.
- Room: over 35 boards x 901 angles the reach (`halfExtent`) moves by at most +0.29 mm (0.05 dot; Step-Up 6'6" at
  89.5 deg, where the new rule still carries the section centre's cos-weighted offset that the switch dropped); below
  the old switch at most 0.03 mm; at 30/45/60 degrees at most 0.013/0.024/0.017 mm (0.002-0.004 dot).
- `maxDeck` over the drawn stations equals today's 65-station figure on all 55 boards checked (the nose tip is the
  highest deck); `maxHalf` rises by at most 0.018 mm (the outline's own widepoint is now a drawn station); the lowest
  rocker anywhere is 0.
- With the draft in place: `rack-room.test.ts`, `wings-readers.test.ts`, `rack-models.test.ts`,
  `rack-stand-in.test.ts` and `rack-layout.test.ts` pass untouched (182 tests); in `rack-art.test.ts` exactly the
  tests that index today's polygon or name the switch fail (21) — the ones this plan rewrites. In the full unit run
  `blank-fit.test.ts` once timed out under load; it never reads the rack art and passes alone.
- Browser reads simulated on the drawn path strings (two-decimal dots): a horizontal line a quarter of the way up the
  Fish's notch crosses the new drawing 2 times at 0 degrees and 4 times at every whole-dot cursor step from 8 degrees
  up (hover) / 9 degrees up (swipe); today it crosses 2 times at every angle below 89.5. Half-way up a diamond's V the
  new drawing is at least sin(angle - 1 deg) x the V's own width there at every step (margin 0.1-2.2 dots from 10 to
  80 degrees); today it falls short by up to 16.3 dots. Largest move per 1-dot cursor step: Fish 1.24 (hover) / 1.42
  (swipe) dots, diamond 0.97 / 1.09, against bounds of 3.1-3.8 dots from the rule below.
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Before pictures, then the swallow and diamond tails drawn by one turn rule (geometry and its relation tests, failing first)</name>
  <files>lib/geometry/rack-art.ts, lib/geometry/rack-art.test.ts, .planning/quick/261103-drw-the-board-rack-turns-swallow-and-diamond/pictures/ (before-*.png, shoot-source.tar.gz)</files>
  <read_first>lib/geometry/rack-art.ts (all), lib/geometry/rack-art.test.ts (all), lib/geometry/outline.ts lines 141-215 (interpolateHalfWidth, the tail kinds: a diamond's outline points start at its depth D with centreCloseStation 0; a swallow's start at 0 with centreCloseStation = crotchDepth), lib/geometry/screen-tiles.ts silhouette(), lib/geometry/board.ts TAIL_PRESETS, e2e/board-rack.spec.ts (openRack, centreOf, freshPracticeRack setup, test 12's slotCentre recipe, startABoardAndComeBack), e2e/board-rack-phone.spec.ts (holdScrollAt, releaseScroll, the two-frame turn read), the two plan pictures named in context.</read_first>
  <behavior>
    - At rest (0 deg) the first sections.length points are rocker - tMid and the next sections.length (reversed) are deck - tMid at every drawn station; every tail-closing point lies on the tail's end line between them.
    - Turned (90 deg) every TEMPLATE silhouette point (x = 0 - w) appears in order, and every point lies on the silhouette's lines (distance to its nearest segment at most 1e-9 mm).
    - No snap: same point count at every tenth of a degree from 0 to 90, and no point moves more than 2 x (maxDeck + maxHalf) x (0.1 deg in radians) between neighbouring tenths — for the presets, the hand-set Shortboard, and every preset with each of the five TAIL_PRESETS buttons, with and without its blank. Fails today (the count changes at 89.5).
    - A swallow's notch: at 0 deg every closing point is the tail's middle point; its depth (highest closing station) and its width at the tail (first closing x minus last closing x) never shrink from one tenth of a degree to the next; at 90 deg it reaches the crotch exactly (centreCloseStation, 0); each inner-edge point equals the least (or, mirrored, greatest) projected position of its cut cross-section, found by brute force over the cut ellipse's boundary at 30, 60 and 85 deg; every closing point lies between the drawn outer edges at its station. Fails today (no notch below 89.5).
    - A diamond's V: every drawn station behind the tail block has a half-width on the straight line from the tip (centreCloseStation, 0) to the outline's first point; the tip's drawn width is exactly (deck - rocker) x cos(angle) at the tip station. Fails today (half-width 0 there).
    - At every whole degree every drawn station's half-width (right - left) / 2 lies between half x sin(angle) and half x sin(angle) + (deck - rocker)/2 x cos(angle) (replaces the just-below-the-switch test).
    - The stringer: a swallow's starts at its crotch, every other board's at the tail; at rest it lies on the deck edge, turned on the centreline, and in between inside the drawn outer edges at its station.
  </behavior>
  <action>
**A. Before pictures (base tree, no code changed yet).** Build a picture script in your own scratch folder (not in the
repo): a `shots.config.ts` that spreads the worktree's `playwright.config.ts` with `testDir` set to the scratch folder,
`webServer.cwd` set to the worktree and `reuseExistingServer: true`, and a `shots.spec.ts` whose computer shots run
only on the desktop project and phone shots only on the iphone project. Run it as `PW_PORT=3179 IS_WEBPACK_TEST=1
SHOOT_TAG=before npx playwright test -c <scratch>/shots.config.ts --project=desktop --project=iphone`. It must
hold a board at a chosen angle through the racks' REAL input — not by calling the geometry — because the founder's
complaint is about what the rack shows (its scale, its neighbours, the room it opens, the words beside it); the plan's
own pictures already cover exact-angle geometry frames. How it holds an angle:
- Hover rack (desktop project, 1280 x 800): on arrival at `/test-rack` only board 1 is turned and stands on its own
  slot centre, so slot k's centre is board 1's button centre + (k - 1) x HOVER_SLOT (test 12's recipe in
  e2e/board-rack.spec.ts). The rack turns a board by the cursor's distance d from its slot centre:
  angle = 90 x (1 - d / 48) degrees, straight from the pointer with no easing. So move the cursor to
  slotCentre(k) + round(48 x (1 - target / 90)) and read the board's `data-turn` back after two animation frames for
  the caption (the browser rounds the cursor to whole dots, so a target lands within about 1.9 degrees).
- Swipe rack (iphone project): the phone spec's holdScrollAt recipe — set the scroller's scroll-snap-type to none and
  its scrollLeft to (index - f) x slot, or (index + f) x slot for the first board, so the screen's middle sits f slots
  from that board: angle = 90 x (1 - f). Read the slot from the rack root's data-rack-slot. Put the snapping back after.
- The Fish is practice board 2 (the four presets come first). The diamond is a board in progress: on `/test-rack`
  click the first Start Shaping, on /design/outline click the button named "diamond" (exact), then go back — the
  in-progress board stands first on the rack (startABoardAndComeBack's recipe), on the computer and on a phone alike.
  The Diamond button sets the TAIL_PRESETS diamond tail (10" tail block, 3" deep) on whichever preset that is.
Shoot, for SHOOT_TAG before/after, eight pictures at device scale 3, each clipped to the board and its two neighbours
with the floor line: `hover-fish-45`, `hover-fish-88`, `hover-diamond-45`, `hover-diamond-88`, `phone-fish-45`,
`phone-fish-88`, `phone-diamond-45`, `phone-diamond-88` (prefixed `before-` / `after-`, the actual data-turn in the
console log). For SHOOT_TAG table, take no pictures. In every mode print a table per board and rack: data-turn, the
drawn path's point count (M/L commands in the body path's d), and for the Fish the number of times a horizontal line a
quarter of the way up its notch crosses the drawn outline (scale = the path's height in dots / the board's length in
mm, the notch depth from buildOutline of the board's own outline: centreCloseStation), for the diamond the drawn width
half-way up its V (effectiveDiamondDepth / 2). The before table is the browser's own record of the snap (expected: 130
points, then 323 at 90; 2 crossings below 90). Save the before PNGs under
`.planning/quick/261103-drw-the-board-rack-turns-swallow-and-diamond/pictures/` and archive the script folder (config
+ spec, no node_modules) as `pictures/shoot-source.tar.gz` there.

**B. The tests first (RED).** Rewrite `lib/geometry/rack-art.test.ts` to the behaviour list above. Keep the tests
that still hold (the 65-station builder test, the throw, the hand-set board, the paths, words never crossing,
designSideProfile, halfExtent at rest and turned, drawnSpan equal to the drawing's own min and max at every degree).
Rewrite the ones that index today's polygon or name the switch. Build the extra boards from the app's own pieces
(presetDesignFields, TAIL_PRESETS, buildOutline, designSideProfile) — no typed millimetre anywhere (CLAUDE.md Rule 1);
every expected figure is a relation. The no-snap test asserts the point count first, then the move bound. Run it and
see the new relations fail on today's code for the right reasons (point count changes at the switch; no notch;
half-width 0 inside the V). Commit: "test: the Board Rack must keep every tail's shape at every angle of the turn
(fails today: the Fish turns square, a diamond turns with a spike)".

**C. The one-rule turn (GREEN)** in `lib/geometry/rack-art.ts`. The racks call it exactly as today.
1. Remove the switch constant (the 1.562-radian export at the top of the file) and every branch that reads it;
   grep the repo — only rack-art.test.ts imported it.
2. The tail-aware edge: the outline's points as (station, halfWidth), led by (centreCloseStation, 0) when
   centreCloseStation is behind the first point (a diamond's tip). Half-width at a station = linear interpolation
   along it, the same arithmetic as outline.ts's interpolateHalfWidth. Do not change `sampleOutline` (prototype parity
   and the litres read it); say in a comment why the rack reads its own edge (the past-the-end fallback reads 0
   inside a diamond's V).
3. `RackBoardArt` keeps `length`, `stations` (65 even stations — the stringer's — now with `half` from the tail-aware
   edge, identical to sampleOutline everywhere except inside a diamond's V; wings-readers.test.ts proves the identity
   on a winged board) and `silhouette`, and gains: `sections` — the drawn stations tail to nose: the 65 even stations,
   the outline's own stations and the tail's closing station, de-duplicated by exact value, from the edge's first
   station to the length, each with rocker and deck from the profile (assertFinite each, as today) and half from the
   tail-aware edge; `notch` — only when centreCloseStation is ahead of the outline's first point (a swallow): the
   sections from that first point to the crotch inclusive, and the notch edge a(s) = w0 x (c - s) / (c - s0) at each
   (w0, s0 = the outline's first point, c = centreCloseStation), else null; `closeStation` = centreCloseStation.
   `maxDeck`, `tMid` = maxDeck / 2 and `maxHalf` are now taken over `sections` (identical deck figure on every board
   measured, so at rest every board stands exactly where it stands today; update the builder test to read them from
   sections).
4. `turnedBoardPoints(art, theta)`: cos, sin; for each section the centre xc = ((rocker + deck)/2 - tMid) x cos and
   reach ext = sqrt(((deck - rocker)/2)^2 cos^2 + half^2 sin^2) — today's sectionCentre/sectionHalf. The polygon is the
   low edge (xc - ext) tail to nose, then the high edge (xc + ext) nose to tail — this order makes the turned board
   read in the TEMPLATE silhouette's own order (x = 0 - w first) — then the tail's closing points:
   - no notch: one point (closeStation, xc at that section) — the middle of the tail's end line, TEMPLATE's own
     closing point when turned;
   - a notch: for each notch section j, with b = (deck - rocker)/2, w = half, a = the notch edge and r = min(1, a / w)
     (r = 1 when w is 0): the inner edge g_j = min(a sin - b sqrt(1 - r^2) cos, ext_j). Why: the tail there is two
     pieces, each the cross-section ellipse from a out to the rail; projected at the angle, a piece's position is
     u sin + v cos, which rises along the ellipse's lower arc, so its nearest point to the centreline is where the cut
     meets the lower arc, v = -b sqrt(1 - (a/w)^2): exactly g. A gap shows only where g is positive, so edge-on the far
     piece fills the notch (g at the tail tip is a sin, 0 at rest), the notch opens as the board turns, and at 90
     degrees g = a: the TEMPLATE V. The min with ext keeps every inner point inside the drawn edges, so drawnSpan stays
     exact. Let k be the first j with g_j at or below 0 (it always exists: at the crotch g = -b cos). The notch's
     apex (s*, x*) is the linear crossing of g between j = k - 1 and k (station and xc interpolated by the same
     fraction), or (s0, xc_0) when k is 0. The closing points are, for j ascending, (s_j, xc_j + g_j) while j < k else
     (s*, x*); then, for j descending, (s_j, xc_j - g_j) while j < k else (s*, x*). Every notch section always
     contributes one point per side, so the count never changes; the ones past the apex sit on it, never forming a
     slit up the middle (the body path strokes its outline, so a slit would draw).
5. `drawnSpan`: the least xc - ext and greatest xc + ext over `sections`, written with the same expressions as the
   polygon so the existing toEqual check holds. `halfExtent` and `spineAnchorX` are unchanged on top of it.
6. `stringerPoints`: with a notch, the crotch section then the even stations past it; otherwise the 65 as today.
   The stringer cannot run through a notch that is cut away; its opacity on the racks stays sin(angle).
7. Rewrite the file's header comment for the one rule (no switch; the notch opening; why the edge is tail-aware) in
   plain words for the next reader.
Run the rack tests GREEN. Commit: "Board Rack: swallow and diamond tails keep their shape all the way round — the
notch opens as the board turns, the diamond keeps its point, no jump at the end of the turn".

**D. Tracer check, end to end.** Run the shoot script again with SHOOT_TAG=table (same port and flags): the
Fish's and the diamond's point counts must now be the same at 45, 88 and 90, the Fish's quarter-way line must cross 4
times at 45 and 88, and the diamond's half-way width must be at least sin(data-turn - 1 deg) x its V width there.
Record both tables (before, now) for the SUMMARY.
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/rack-art.test.ts lib/geometry/rack-room.test.ts lib/geometry/wings-readers.test.ts lib/models/rack-models.test.ts lib/models/rack-stand-in.test.ts lib/geometry/rack-layout.test.ts &amp;&amp; test "$(git grep -c 'RACK_OUTLINE_SWITCH' -- lib components e2e | wc -l | tr -d ' ')" = "0" &amp;&amp; ls .planning/quick/261103-drw-the-board-rack-turns-swallow-and-diamond/pictures/before-hover-fish-45.png .planning/quick/261103-drw-the-board-rack-turns-swallow-and-diamond/pictures/shoot-source.tar.gz</automated>
  </verify>
  <done>Eight before pictures and the shoot-source archive exist; the new relation tests were seen failing on today's code and pass now; rack-room, wings-readers, rack-models, rack-stand-in and rack-layout pass untouched; no switch constant is left anywhere; the tracer table shows the real rack drawing the same point count at every angle and the Fish's notch open mid-turn; two commits with plain-English subjects.</done>
</task>

<task type="auto">
  <name>Task 2: The browser proof on both racks — the Fish and a diamond swept through the turn without a jump — and the after pictures</name>
  <files>e2e/board-rack-turn.spec.ts, e2e/board-rack.spec.ts, .planning/quick/261103-drw-the-board-rack-turns-swallow-and-diamond/pictures/ (after-*.png)</files>
  <read_first>e2e/board-rack.spec.ts (setup helpers, test 4, test 12, startABoardAndComeBack, waitForTurnsToFinish), e2e/board-rack-phone.spec.ts (holdScrollAt, releaseScroll, the two-frame read, project gating), e2e/helpers/practice-rack.ts, lib/models/rack-models.ts rackBoardFigures, lib/models/rack-stand-in.ts standInRackRows.</read_first>
  <action>
1. New spec `e2e/board-rack-turn.spec.ts` (setup as board-rack.spec.ts's: the banner and toolbar tip dismissed, a
   fresh practice rack). Plain-English test names. Shared reading: after each move wait two animation frames, then read
   the board's data-turn and its body path's d (the first path in its data-rack-art group); parse d into points; scale
   = the path's height / the board's length in mm (every point spans tail to nose at every angle). For the Fish, its
   art from rackBoardFigures(standInRackRows(15)[1].snapshot) and its notch depth from buildOutline of that snapshot's
   outline. Every board on one rack shares one scale, so take the scale from the Fish (or any practice board) when
   reading the in-progress board. For the diamond, rebuild its art from the preset the first Start Shaping opens
   (presetDesignFields of that preset with TAIL_PRESETS.diamond's tail, tailAngle and tailFullness; designSideProfile,
   buildOutline, buildRackBoardArt) and check the identity rather than assume it: the drawn path's height / scale
   equals that preset's length within 1%. The V's depth (effectiveDiamondDepth) and its half-width half-way up come
   from the same buildOutline.
   Relations asserted at every step (all derived, no typed dots):
   - the drawn outline has the same number of points at every step;
   - no point moves more than 2 x (maxDeck + maxHalf) x scale x (|change in data-turn| + 1) degrees in radians between
     two steps (the unit test's rule, widened by the whole-degree rounding of data-turn);
   - the Fish: a horizontal line a quarter of the way up its notch crosses the outline twice at data-turn 0 and four
     times at every step from data-turn 10 up (measured: 4 from 8-9 degrees);
   - the diamond: for every step with data-turn from 10 to 80, the drawn width half-way up the V is at least
     2 x the V's half-width there x sin(data-turn - 1 deg) x scale - 0.1 dot (today it falls 16 dots short).
   (a) Computer, desktop project only (skip others as board-rack.spec.ts does), two tests: sweep the cursor over the
   Fish from board 3's slot centre to its own in 1-dot steps (test 12's slotCentre recipe, at the boards' centre
   height); and, on a page with the diamond in progress (Start Shaping, the "diamond" button, back — it stands first),
   from board 2's slot centre to board 1's. (b) Phone, iphone and android projects (skip desktop), the same two tests
   with the scroll held (snapping off) f slots from the board — scrollLeft (1 - f) x slot for the Fish, f x slot for
   the in-progress diamond at index 0 — f from 1 to 0 in 1/slot steps; put the snapping back at the end.
2. `e2e/board-rack.spec.ts` test 4 counted points as a stand-in for "which of the two drawings": one rule now draws
   the same count at rest and turned, so rewrite it to the shapes themselves — the turned board 1's path is as wide,
   for its height, as its TEMPLATE outline (2 x the silhouette's widest half-width / length, from its art), and the
   resting board 2's as wide as its side profile (drawnSpan at 0 / length), each within 1%. Keep the test's name and
   number; drop the vertexCount helper if nothing else uses it.
3. Run `PW_PORT=3179 IS_WEBPACK_TEST=1 npx playwright test e2e/board-rack-turn.spec.ts e2e/board-rack.spec.ts
   e2e/board-rack-phone.spec.ts e2e/test-rack.spec.ts` (all three projects). A Playwright SVG visibility check
   calls a straight line hidden — read attributes, never toBeVisible on a path.
4. After pictures: the shoot script with SHOOT_TAG=after (same eight names, prefixed after-). Look at each pair; the
   Fish's tail must show its notch at 45 and 88, the diamond its point with no spike.
Commit: "e2e: the Board Rack's Fish and a diamond turn without a jump on a computer and on both phones".
  </action>
  <verify>
    <automated>PW_PORT=3179 IS_WEBPACK_TEST=1 npx playwright test e2e/board-rack-turn.spec.ts e2e/board-rack.spec.ts e2e/board-rack-phone.spec.ts e2e/test-rack.spec.ts &amp;&amp; ls .planning/quick/261103-drw-the-board-rack-turns-swallow-and-diamond/pictures/after-phone-diamond-88.png</automated>
  </verify>
  <done>The new spec passes on desktop, iphone and android; board-rack.spec.ts test 4 checks the drawn shapes instead of point counts and passes; the other rack specs pass unchanged; eight after pictures sit beside the before ones.</done>
</task>

<task type="auto">
  <name>Task 3: Gates, the drawing grammar's note, and the SUMMARY for the founder</name>
  <files>.claude/skills/sketch-findings-shaper/references/board-rack.md, .planning/quick/261103-drw-the-board-rack-turns-swallow-and-diamond/261103-drw-SUMMARY.md, .planning/quick/261103-drw-the-board-rack-turns-swallow-and-diamond/pictures/</files>
  <read_first>.claude/skills/sketch-findings-shaper/references/board-rack.md ("The turn maths", around line 80).</read_first>
  <action>
1. In the skill's board-rack reference, replace the line that says the rack switches to the TEMPLATE silhouette near
   89.5 degrees with the one rule: the drawn stations include the outline's own and the tail's closing point, a
   diamond's tip is a station, a swallow's notch closes the tail through its inner edges (the g formula, one line),
   hidden edge-on and the TEMPLATE V turned; a swallow's stringer starts at the crotch. Name this quick task.
2. Gates in the worktree: `npm test` (if blank-fit.test.ts times out under load, re-run it alone — it never reads the
   rack art); `npx next typegen` then `npx tsc --noEmit`; `npm run lint`; the Task 2 Playwright command again. Grep:
   no switch constant left in lib, components or e2e; `git diff --stat` touches nothing under components/ and leaves
   lib/geometry/rack-room.test.ts untouched.
3. SUMMARY (in this worktree): plain English first — what the founder will see on the rack, the before/after picture
   paths, the before and now tables from Task 1 D, the measured facts (step-to-step move today vs now, the diamond
   tip's flat at 60/85, the room change), every test rewritten and why, and three things for the founder's look:
   the notch begins to open from the first degree (a real swallow seen just off edge-on shows its two tips); the
   turned Fish's stringer now stops at the crotch; a part-turned diamond's point shows the tail's thickness, as a pin
   tail's does. Also record, as a separate finding not fixed here: `sampleOutline` reads a half-width of 0 inside a
   diamond's V, and the litres read through it, so a diamond-tailed board's volume leaves out the V (its plan area on
   the Shortboard with the Diamond button: 2 x 1/2 x 76.2 mm x 127 mm = 9,677 mm^2, both sides) — worth its own task
   if the founder wants it.
4. Commit the pictures, the reference note and the SUMMARY: "docs: the Board Rack's smooth swallow and diamond turn —
   before and after pictures, and the drawing note".
  </action>
  <verify>
    <automated>npm test &amp;&amp; npx tsc --noEmit &amp;&amp; npm run lint &amp;&amp; test -z "$(git diff --name-only $(git merge-base HEAD main) -- components lib/geometry/rack-room.test.ts)" &amp;&amp; test -f .planning/quick/261103-drw-the-board-rack-turns-swallow-and-diamond/261103-drw-SUMMARY.md</automated>
  </verify>
  <done>Every gate green; the skill reference describes the one rule; the SUMMARY carries the pictures, tables, measured facts and the three founder-look items plus the separate diamond-litres finding; all commits on the worktree branch, nothing pushed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| saved board snapshot -> rack art | A saved board's outline and side profile feed the drawing; already validated by rackModelsFromRows and buildRackBoardArt's finite checks |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-261103-01 | Denial of service | rack-art turnedBoardPoints on every frame | low | accept | The drawn path grows from 130 points at rest / 323 turned to about 450-500 at every angle; only boards whose angle changed rewrite their path each frame (hover-rack.tsx's turned check), and drawnSpan stays a single pass over the drawn stations. Measured cost is a few hundred points per turning board. |
| T-261103-02 | Tampering | buildRackBoardArt with a malformed saved outline | low | mitigate | Every new drawn station passes the same assertFinite checks as today (rocker, deck, half-width), so a board whose picture cannot be worked out is still dropped before the rack draws it (WR-05); the notch edge divides by (crotch - first station) only when that is positive. |
</threat_model>

<verification>
- `npx vitest run lib/geometry/rack-art.test.ts lib/geometry/rack-room.test.ts` green; rack-room.test.ts byte-identical to main.
- The new browser spec green on desktop, iphone and android; the four rack specs green.
- No switch constant anywhere in lib, components or e2e; nothing under components/ changed.
- Eight before and eight after pictures plus shoot-source.tar.gz under the task's pictures/ folder.
</verification>

<success_criteria>
The Fish and a diamond-tailed board turn on both racks with the same tail shape all the way round — the notch opening
smoothly, the diamond's point never a spike — with no visible jump anywhere in the turn; at rest and fully turned every
board looks exactly as it does today (apart from the Fish's stringer no longer running into its notch); the room and
the words are unchanged to within 0.05 dot. Merged to main only after the founder's look; the founder decides the push.
</success_criteria>

<output>
Create `.planning/quick/261103-drw-the-board-rack-turns-swallow-and-diamond/261103-drw-SUMMARY.md` (inside the worktree) when done.
</output>
