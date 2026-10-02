---
created: 2026-09-28T20:38:12.889Z
title: Give the foil and rocker curves a realistic surfboard flow
area: rocker
severity: major
files:
  - lib/geometry/blank-fit.ts:233
  - lib/geometry/blank-fit.ts:283
  - lib/geometry/pchip.ts
  - lib/geometry/board-profile.ts
  - lib/geometry/foil.ts
  - lib/geometry/rocker.ts
  - components/rocker/rocker-viewer.tsx
---

## Problem

Captured from the founder on 2026-09-28, answering Phase 12's founder question 1 (the thin spot near a tip), in
their words: "I think the bigger issue is to improve the spline curve rules/type so that the curve never humps and
always has a realistic surfboard flow." Then: "Add the curve smoothing to the todos as major as discussed here for
it's own phase later (post Oct 10)."

**Scheduling (founder, 2026-09-28):** its own GSD phase after the Oct 10 showing, not part of Phase 13. Severity
major: it changes the numbers a shaper cuts foam to, which is the project's core value.

**What the hump is.** This was measured on 2026-09-28 with the app's own `boardOnBlank`. The scratch probe re-built
the 12-01/12-07 stress test: every pickable blank, a board 2" shorter than it, 2 1/4"–3" centres, slid to either
end and centred, 1,611 boards passing the centre floor.
- In the last 12" before each tip, `boardOnBlank` blends the plain planer cut (the blank's thickness shifted down
  by the centre gap) into the tip setting with a smoothstep weight. The weight is 0 and flat at the 12" station
  and 1 at the tip (`smoothstep` near line 233; the thickness formula is in the `boardOnBlank` doc comment).
- When the tip setting is thicker than what the blank leaves near the tip (common on long, thick blanks cut to a
  thin centre), the blend adds foam back only gradually. So the board comes out **thinnest about 10" from the tip
  (6.6"–10.9") and then gets thicker toward the tip**: a hump, not a taper.
- At today's default tips (1/2" nose, 5/8" tail), 92 of the 1,611 boards have such a thin spot below their own tip
  setting: 83 on blanks over 8'6", 9 on 7'–8'6" blanks, **none on short blanks, and none on the four presets**
  (each tapers steadily from its 12" station to its tip). The thin spot sits a median 0.12" below the tip setting.
- Typical case, still allowed: Arctic Foam 10'9" LB, 2 1/2" centre, centred, tail. It reads 0.546" at the 12"
  station, 0.505" at 10", 0.683" at 2" and 0.625" at the tip.
- Worst case, refused: Arctic Foam 10'6" G, 2 1/4" centre, slid toward the tail. It reads 0.099" at the 12"
  station, 0.072" at 11", 0.663" at 1" and 0.625" at the tip.
- Phase 12's "522 of 528" counted boards where the plain cut is thinner than the tip somewhere, so the app builds
  the tip back up. That is 528 at Phase 12's test tips (5/16" / 1/4") and 882 at today's tips. The boards that
  actually hump are 24 and 92 respectively.
- Phase 13 item 4 (2026-09-28) raises the floor from 1/8" to 1/4" anywhere, and the lowest tip setting to 1/4".
  That refuses the extreme humps (15 of the 1,611) but still allows the milder ones. This todo is the real fix.

**Folded in:** the 2026-09-26 todo "Smoother-looking drawn rocker curve without changing the PCHIP numbers" (moved
to `completed/`). The founder said then that "the PCHIP curves can look a little sharp". That todo kept the numbers
on PCHIP because Phase 11's R10/R15 and D-13 lock PCHIP for the rocker numbers: a plain cubic spline overshoots
at the nose. The founder's new words ask for the curve rules and type themselves to improve, so this phase may
revisit that lock **by the founder's decision**. What must survive is the reason for it: **no overshoot,
especially at the nose kick.**

## Solution

Its own phase after Oct 10 (`/gsd-phase` then `/gsd-discuss-phase`), shaped the way Phase 12 was. The first three
steps come before any code:

1. **Discuss with the founder** what "realistic surfboard flow" means in shaping terms.
   - Thickness never increases toward a tip (a steady taper from the centre, or at least from each 12" station
     to its tip).
   - How the nose kick and tail rocker should blend.
   - What should happen when the tip setting is thicker than the blank leaves. Options: cap the tip at the foam
     there, refuse the blank with a reason, or reshape the whole last 12" as one monotone curve through the 12"
     station and the tip.
2. **Research the curve types** that are smooth (continuous curvature, no facets, no kinks) and shape-preserving
   (never overshooting between known points). Candidates include Steffen's monotone method, monotone C2 or convex
   schemes, and constrained B-splines. Measure each against PCHIP on every seeded blank.
3. **Pin today's numbers first** in a golden generated from the last release tag (as Phase 12 did with v1.3),
   then write the new rules as named geometry tests before any screen moves:
   - thickness never humps;
   - the rocker never overshoots;
   - every preset and every stress-test board tapers into its tips.
4. **Decide the carry-over** for saved boards, whose derived numbers will move, and prove it on the development
   database and then on production with a read-only script.
5. Re-check presets, litres (VOLUME) and the printed sheets. Walk it with the founder on real devices.

Keep CLAUDE.md Rule 1: every formula lives in `lib/geometry/`, pure and tested, with expected values from fixtures,
never hand-typed.

## Founder's addition, 2026-10-01

At the close of the Phase 13 build evening, in their words: "after this we need to ... consider
different spline options to get smoother curves." That is this phase's research question: today the
rocker and thickness curves are PCHIP (Phase 11's R10/R15 — chosen for SciPy parity and no overshoot
at the nose, and never changed just to cure a faceted drawing). The options to compare, each against a
golden of today's numbers first: a monotone cubic with tension, a Catmull-Rom/cardinal family, a cubic
B-spline fitted through the stations, and a clamped natural spline with the tip rules on top — judged
on no hump near a tip, no kink or facet, no overshoot at the nose, and how far the five stored
thicknesses and the four rocker numbers move for the production boards.

## Founder's research direction, 2026-10-01 — US Blanks as the muse

The founder (verbatim): "does it make sense to look at the blank database and use US Blanks as a muse
(because they provide the most data points their curves are smoothest — except that I need to fix a few
dims before actually doing any analysis as not to introduce erroneous bias) for the type of curve that
should be created and where weighting is needed to allow the tips (specifically the nose) to smoothly,
but more rapidly ramp up on the blanks that have less fixed points."

The catalogue supports it: US Blanks has 101 blanks at 9–15 stations each (most 11–15), Arctic Foam 33
at 5–6, Marko 28 at 5–10. The experiment that makes it a measurement rather than a taste: for each US
Blank, keep only the stations a sparse catalogue would give (nose, 12", centre, 12", tail — the Arctic
pattern), fit every candidate curve through those few points, and score it against the blank's own
dense profile — per region (nose last 12", body, tail), per curve family — with the dims fixed first
and a robust fit that flags any station sitting far off every candidate as a possible catalogue typo
(the same scan then runs over Arctic and Marko before the founder's manual list is final). The nose
weighting the founder describes is then fitted, not guessed: PCHIP is monotone and derivative-limited,
so with two points in the last foot it draws the nose ramp too straight; a parametric tip model (a
power/exponential ramp blended into the body spline over the last N inches, its exponent fitted on the
US Blanks dense data) is the leading candidate. Caveat to carry: a US Blanks prior can bias Arctic and
Marko toward US Blanks' rocker style — so the tip model fills only the gaps between a sparse blank's
stations, never moves a station, and at least one real Arctic and one real Marko blank measured with a
tape at 6" intervals in the bay is the independent check.

## Founder's update, 2026-10-02 — sooner, and wider

After reading the research answer below, the founder (verbatim): "yes, add the findings to the todo, and
I think i want to tackle this very soon, before the 10th. New things to address - We should also
finalize a plan for the blanks deck. How do the new curves impact the board itslef? The idea is that
we're trying to help guide a shaper to a nice foil and so I'd like the board deck and bottom to also
follow the best splines. It seems logical that the board bottom will follow the same 5 point
root-squares model, and we may have to adjust my earlier recommendation that the tip thinning is from
the 12" mark only. May be better to let the user have a control for that actually that ranges 6" to
board center."

So, as of 2026-10-02:

- **Scheduling changed.** This is no longer "after the Oct 10 showing": the founder wants it before the
  10th. Phase 13's freeze is Wednesday Oct 7 evening, so how much is built before the freeze is the
  first decision listed at the end of this note.
- **Scope widened** from "which spline" to four things: the blank's bottom, the blank's deck, how the
  board's own deck and bottom follow, and where the tip thinning starts (a control from 6" to the
  board's centre instead of the fixed 12").

## Research findings, 2026-10-02 (measured — nothing built, no file of the app changed)

This is the "US Blanks as the muse" experiment described above, run on the catalogue as it stood after
the three correction rounds (quick 261001-v1q, 261001-www, 261002-aqu). The scratch scripts were not
kept; each method is described closely enough here to rebuild quickly. All figures are inches.

### 1. The rule that won: a square root, then the curve the app already uses

- **Square-root rise (rocker).** Take each station's lift above the blank's lowest station, take its
  square root (with a minus sign on the tail side of the lowest station), run today's PCHIP through
  those, and square the result: `y(x) = low + g(x)²`, where `g` is PCHIP through `±√(yᵢ − low)`.
- **Square-root fall (thickness, width).** The mirror image, measured down from the thickest (or
  widest) station: `y(x) = high − g(x)²`, where `g` is PCHIP through `±√(high − yᵢ)`.
- **Why it works.** Away from its low point a real rocker climbs about with the square of the distance
  (measured exponent: tail 1.9–2.1 all the way to the tip; nose 2.2 rising to about 3.0 in the last
  6"), and a real blank thins and narrows the same way (1.8–2.2). The square root of such a curve is
  close to a straight line, which five stations pin down; the curve itself they do not.
- **What it keeps** (checked on all 162 catalogue blanks): exact at every printed station; never
  outside two neighbouring stations, so the Phase 11 reason for PCHIP — no overshoot at the nose —
  survives; the low point is the lowest station, so the levelling rule (R11) stays exact.

### 2. Bottom rocker

The test: the 90 US Blanks that print a station every 6" near the tips are 68 distinct rockers once
sister blanks are merged. Each was cut down to the five Arctic stations (T0, T12, C, N12, N0), redrawn,
and scored at the 536 hidden stations.

| Curve through five stations | Average miss | Worst miss | Stays between neighbouring stations |
|---|---|---|---|
| Square-root PCHIP | 0.035 | 0.237 | always |
| PCHIP with tension, best setting (loosened 40%) | 0.055 | 0.279 | yes at that setting |
| Monotone smooth cubic (Hyman-filtered) | 0.060 | 0.297 | always |
| Cardinal / Catmull-Rom, best tension (0.2) | 0.063 | 0.413 | no — 134 of 162 blanks |
| Steffen's monotone | 0.072 | 0.549 | always |
| Akima | 0.073 | 0.532 | no |
| Cubic spline through the stations (not-a-knot) | 0.076 | 0.403 | no — 160 of 162, up to 5/16" |
| Catmull-Rom, no tension | 0.102 | 0.446 | no |
| Clamped natural spline, level at the centre | 0.109 | 0.462 | no |
| Today's PCHIP | 0.112 | 0.645 | always |
| Today's PCHIP plus a fitted power ramp in the last foot | 0.112 | 0.645 | always |
| Natural cubic spline | 0.121 | 0.555 | no |

- By region, today → square-root: tail last foot 0.038 → 0.028; tail body 0.075 → 0.029; nose body
  0.195 → 0.041; nose last foot 0.055 → 0.045. **The miss is in the body, not the last foot**: today's
  curve rides about 3/16" high between the nose 12" mark and the centre (5/8" at worst). That is why
  the tip ramp — the leading guess in the 2026-10-01 note above — gains nothing.
- Closer than today on 67 of the 68 rockers. The catalogue prints to 1/16", so about 1/32" is the
  floor; a regression trained on the US tables did not beat it.
- Seven stations (most Marko): 0.043 → 0.027. Nine or more: no difference, so one rule can serve every
  blank; US Blanks' own curves move 1/16" at most.
- **Another maker confirms it**: Marko's own 7–10-station blanks cut to five, 0.162 → 0.037 (18
  rockers; the 8'0" Gun and 10'6" Gun have zig-zag nose numbers and were left out — with them
  0.190 → 0.067).
- The bend change across a station — the "sharp" look — falls from a median 24-to-1 to 1.5-to-1 on the
  Arctic blanks. Swapping PCHIP for Steffen or a Hyman-filtered cubic inside the square-root step
  scores the same and is slightly smoother still: a taste call for side-by-side pictures.

### 3. Thickness, and so the blank's deck

Same test on thickness: 90 distinct US Blanks thickness curves, 712 hidden stations.

- Today's PCHIP: average miss 0.076, worst 0.428, and it reads **thin** between stations (bias −0.042).
- Square-root fall: average 0.050, worst 0.286, no bias; closer on 81 of 90. A Hyman-filtered cubic
  and a plain cubic spline tie on the average (0.049–0.050), so the gain here is smaller than for
  rocker, but the square-root fall keeps every guarantee and is the same machinery.
- Seven stations: 0.039 → 0.036. Marko's own blanks cut to five: 0.092 → 0.066 (median 0.067 → 0.033).
- **The deck stays derived** (R10: deck = bottom + thickness). Scored as a deck line at the hidden
  stations: today 0.073 average (worst 0.417) → 0.050 (worst 0.256). Drawing the deck line directly
  ties (0.050) but lets three blanks come out thicker than their thickest printed station, so there is
  no reason to add a third curve.

### 4. Width (not asked for, found on the way)

- 69 distinct US width curves, 546 hidden stations: today's PCHIP misses by 0.530 on average and reads
  **narrow** (bias −0.509); the square-root fall misses by 0.290 (median 0.180). Marko: 0.685 → 0.336.
- It changes verdicts: of 192 test boards drawn just inside an Arctic blank's width (default outline,
  centred, 1/4"–1" inside what the centre allows), 143 fit today and 170 fit with the new width curve —
  27 boards are refused today only because the blank is drawn too narrow between its stations.

### 5. An independent check the catalogues give for free: their own litres

Each catalogue prints a blank's litres. Width × thickness integrated along the blank should be a steady
multiple of that figure (under 1 because rails are rounded):

- US Blanks, 11–15 stations: catalogue litres ÷ integral = **0.91**.
- Arctic, five stations, today's curves: 0.925 (0.939 for the 8 ft and longer blanks) — the integral is
  short, the sign of curves drawn too thin and too narrow between stations.
- Arctic with the square-root thickness and width: **0.908** (0.914 for 8 ft and longer) — in line with
  US Blanks.
- Dense US Blanks cut to five stations: the integral drifts −2.37% under today's curves and −0.16%
  under the square-root pair.

So Arctic's own printed litres support the new curves; the tape-measure check above is still worth
doing for the bottom, which litres cannot see.

### 6. What moves on the board (the app's own `boardOnBlank`, today's tip rule kept)

Stress set, rebuilt as on 2026-09-28: every pickable blank, a board 2" shorter, centres 2 1/4"–3", slid
to either end and centred — 1,635 boards on today's catalogue (it was 1,611 before the corrections).

- **Arctic (348 boards).** The five rocker numbers a shaper reads: the centre does not move and the
  tail tip stays within 0.01 for nine boards in ten (0.04 at most); tail 12" drops 0.02; nose 12" drops
  0.04 (0.09 at most; 62 boards by more than 1/16"); nose tip drops 0.02 (0.08 at most). The two 12" thicknesses rise 0.016 (0.034 at most). Between stations the bottom
  moves 0.2 typically (0.44 at most), the thickness 0.09 (0.16), the deck 0.12 (0.32). Litres rise
  about 1.8% (0.8%–4.9%).
- **Marko (267).** Under 0.02 at the stations for most; the two 10'2" M blanks, which print no 12"
  station, move 0.29 at the tail 12" mark. Litres +0.2%.
- **US Blanks (1,020).** At a station the rocker moves 0.03 at most and the thickness 0.05; between
  stations 0.08. Litres +0.1% (0.5% at most).
- **Fit verdicts** (no width check): none of the 1,635 flips.
- **The four presets** (all on US Blanks blanks): every station number within 0.015. Litres:
  Shortboard 29.410 → 29.478, Fish 35.047 → 35.093, Mid-length 50.277 → 50.286, Longboard
  75.300 → 75.309 — so two cards change by 0.1 L and their recorded figures need re-recording.
- **A hand-set board** (no blank, the default 6'0"): the same five rocker and five thickness numbers
  redrawn — the bottom moves 0.145 at most (lower, 20" back from the nose), the thickness 0.09 (fuller),
  litres 30.06 → 30.51.

### 7. The thin spot near a tip: what causes it and what cures it

- **Cause.** Not the curve family: the count is the same on today's curves and the new ones (79 and 82
  of the 1,635 boards have a spot thinner than their own tip setting; the 2026-09-28 probe counted 92
  of 1,611). It happens when the level planer cut leaves less foam at the tip than the tip setting asks
  for — true at 1,514 of the 3,270 tips in this stress set — and the board is still thinner than its
  tip setting 12" in (62 tips). Starting the tip rule at 12" then has nowhere to go but down and back up.
- **Moving the start is the lever, as the founder guessed** — with today's S-shaped blend: start 12"
  → 82 boards with a thin spot, 200 that get thicker toward a tip somewhere; 18" → 8 and 105; 24" → 0
  and 65; 36" → 0 and 35. But spread to the centre that blend pushes the thickest point off the centre
  (246 boards), so the shape has to change along with the start.
- **A steady taper** — the planer cut exactly inside the start point, and from the start to the tip one
  curve that leaves the planer cut along its own slope and lands on the tip setting (tested as a
  parabola: `T(d) = tip + (2·sec − m)·d + ((m − sec)/W)·d²`, `sec = (P(W) − tip)/W`,
  `m = min(P′(W), 2·sec)`, never below 0, `d` = distance in from the tip, `W` = the start, `P` = the
  planer cut) — fixed at 12": 56 thin spots; at 18" and beyond: none.
- **An automatic start** — 12" unless the board there is too thin to run down to its tip steadily,
  then the first point further in that is thick enough (`P(W) ≥ tip` and `P′(W) ≤ 2·sec`): **no thin
  spot on any of the 1,635 boards**, no new board poking out of its blank, none under the 1/4" floor
  (10 are today). The start stays at 12" for 2,912 of the 3,270 tips, lands at 12–18" for 218, 18–24"
  for 97, 24–36" for 43, and never needs the centre. What is left is 12 boards, all on the US Blanks 9'9"B,
  whose thickest printed station is not its centre (they read 0.066 thicker there) — the blank's own
  shape, not the tip rule.
- With the start at 12" the five station numbers are today's; only the curve between the tip and the
  12" mark changes. Where the automatic start moves in, the 12" thickness rises — those are exactly the
  boards that hump today.

### 8. Catalogue cells no smooth curve explains (for the founder's corrections list)

Each prints the same figure in inches and centimetres on its page, so none is a transcription slip:
US Blanks 6'5"R tail 12" reads 11/16" where its neighbours (1 7/16" at 6", 9/16" at 18") say 15/16";
milder, 8'8" EPS tail 6" (1 15/16") and 6'2"P nose 6" (2 1/2"). Marko's 8'0" Gun and 10'6" Gun nose
numbers zig-zag. Dropping those blanks leaves the rocker result unchanged (0.106 → 0.031).

## Proposed plan, 2026-10-02 (Claude's recommendation — the founder has not decided)

**Step A — the curves.** No new control and no change to what a saved board stores.

1. The blank's bottom is drawn with the square-root rise.
2. The blank's thickness is drawn with the square-root fall; its deck stays bottom plus thickness.
3. The blank's width is drawn with the square-root fall.
4. A hand-set board (no blank) draws its five rocker numbers and its five thicknesses with the same
   two rules — this is the founder's "same 5 point root-squares model".
5. A board in a blank keeps following its blank: its bottom is the blank's bottom and its foil the
   blank's foil cut level, now drawn by the rules above. It is not re-drawn from its own five stations
   when the blank prints more — on a 15-station US Blanks blank that would throw real measurements
   away (about 1/32" on average, up to 1/4").

Order of work as the Solution above already says: a golden of today's numbers first, the rules as named
geometry tests, then the code. Two things to carry: the Phase 11 carry-over maths
(`lib/geometry/phase11-foil.ts`) must keep today's PCHIP so old boards convert exactly as before, and
the presets' recorded litres move on two cards.

**Step B — the tips.** A new control, a new stored field on a board's blank, more to rehearse.

1. "Thinning starts" on each board, from 6" to the board's centre, Automatic by default (section 7).
2. The steady taper replaces the S-shaped blend; the final shape is picked from side-by-side pictures.
3. It comes off whichever surface the Tip Style names, as today.
4. To settle in the phase: one start for both tips or one each; whether Fit & Tip Defaults carries it;
   what the 12" fine-tune means when the start is not at 12".

**Decisions that are the founder's:**

1. How much goes in before the Oct 7 freeze — Step A alone, both steps, or nothing until after the 10th.
2. The tip start: Automatic with a manual override, manual only (default 12", a thin spot flagged but
   not prevented), or 12" fixed with only the shape changed.
3. Saved boards: redraw with the new curves when opened (stations never move; an Arctic board shifts up
   to 7/16" between stations and reads 1–5% more litres), or keep old boards on today's curves until
   the shaper updates them (that needs a marker on each saved board).
4. Whether the hand-set board and the blank's width join Step A (recommended: both).
