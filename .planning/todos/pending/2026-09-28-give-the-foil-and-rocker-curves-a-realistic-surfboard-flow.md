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
