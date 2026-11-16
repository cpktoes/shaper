---
quick_id: 261116-jqz
date: 2026-11-16
source: the founder, 2026-11-16 — his report on 92Log.brd, his question about sliders, and his ruling the same afternoon
---

# A belly bottom gets an Off Stringer slider, and the .brd import reaches for the Tri-Plane last — decisions (locked)

## The founder's words

1. "the .brd import is using tri-plane hull bottom types way more than it should. 92log.brd is pretty clearly a belly bottom
   and the .brd import should reflect this. We should look at the most common bottom types first."
2. "can we get a better fit with belly and vee options if we adjust sliders from the defaults?"
3. "add the off-stringer measuremnt for belly BOTTOM types. And tri-hull should be the rarest bottom type."

## What the orchestrator measured before asking (scratch scripts, nothing committed)

- `lib/geometry/brd-bottom.ts` `fitBottomToBrd`: the seed search picked a belly center for 92Log; the neighbour stage then put
  the Tri-Plane Hull Center in its place because it scored about 0.7 mm closer (score = widest gap + mean gap) than the best
  all-belly bottom, and any name wins once it is `BRD_BOTTOM_EXTRA_CUT_MM` (0.25 mm) closer. No name is preferred over another
  except by fewest cuts.
- Of the founder's twelve sample files in `~/Downloads`, the Tri-Plane won on three: 92Log.brd, Scoop-Noserider.brd (both
  have belly forward sections: flat near the stringer, rolling up hard near the rail) and quadtesting.brd (a vee tail).
- Why: `cutFoamOffParts` lifts a belly from `offStringer` out to the rail, `depth × fade × rise((y − F) / (W − F), r)`, and a
  belly's `offStringer` is always 0 (no slider; `components/bottom/bottom-controls.tsx` `cutRows` shows Off Stringer only on
  a double and the Tri-Plane). A belly that rolls from the stringer cannot follow a bottom that stays flat for the inner
  two-thirds; the Tri-Plane's flat panel can. The refine stage moves Start, Deepest At, End and Depth for a belly, and across
  marks only for singles, doubles and the Tri-Plane (`offStringer`). It never moves Smoothness.
- Scratch measure on 92Log (without the import's reading windows, so not the app's own figures — relative only): flat nose,
  belly center, Rolled Vee tail as the refine leaves it, widest 2.9 mm / typical 1.0 mm; the same with the belly's roll
  starting 7 1/2" off the stringer, 2.1 / 0.5; Reverse Vee nose, Tri-Plane center, Rolled Vee tail with every slider moved,
  2.1 / 0.4. So a belly with a flat panel fits about as closely as the Tri-Plane.

## Decisions

- **D-01 — Off Stringer on both belly cuts:** Rolled Belly Entry (nose) and Continuous Belly / Rolled Mid (center) show an
  Off Stringer slider on BOTTOM, the same slider the Tri-Plane has (same label, same range 0"–9", 1/16" steps, 1 mm in
  Metric): a flat panel each side of the stringer, and the belly rolls from its edge out to the rail. The maths already reads
  `offStringer` for a belly (`cutFoamOffParts`); this is the control, the readers that ignore it for a belly, and the fit.
  Vees other than the Tri-Plane are not in this task.
- **D-02 — Nothing that exists moves:** a belly's starting Off Stringer stays 0", so every saved board, preset, GUIDE card,
  recorded litre and golden fixture stays exactly as it is. A stored belly cut already carries `offStringer` (the saved-board
  schema stores it on every cut); check it survives a save and a reload for a belly, and add nothing to storage if it does.
  No database migration.
- **D-03 — Every reader of a belly follows its panel**, as each already does for the Tri-Plane's: the foam taken off (so
  litres, the 3D board and the .brd export follow), BOTTOM's drawing (the panel pencil line), DATA's layout-marks table (the
  flat column), the floor check, and the printed BOTTOM CONTOURS sheet's sentence ("panel X off the stringer" when it is over
  0"). Where a reader tests `kind === "vee"` for the panel today, a belly must pass the same test. A belly at 0" reads, draws
  and prints exactly as today.
- **D-04 — The .brd import moves a belly's Off Stringer** in its slider refinement, as it moves the Tri-Plane's, over the same
  grid (every 1/4", then every 1/16" within reach of the best).
- **D-05 — The Tri-Plane Hull Center is the rarest bottom: the import reaches for it last.** It is kept only when it fits
  clearly closer than the closest bottom without one — at least 1 mm closer on the fit's own score — and in every tie or
  near-tie it loses to any other name. The planner may propose a different margin if the measurement on the twelve files shows
  1 mm is wrong, and must say why. Every other name keeps today's rules.
- **D-06 — The result, measured through the real import** (`brdLookFromBytes`, with its reading windows), on all twelve of
  the founder's files: 92Log.brd and Scoop-Noserider.brd come in with a belly center, not a Tri-Plane, and the SUMMARY tables
  every file's three cuts and widest/typical miss before and after. The founder's files are never committed, copied into the
  repo or named in a test (standing rule); tests use synthetic sections and the app's own fixture boards.
- **D-07 — The fit stays fast:** the brd-fit suite's "finishes the Longboard well inside a second" holds, and a round trip of
  the app's own boards (export → import) comes back as today.

## Out of scope

The other rarer names (Spiral Vee, Reverse Vee Nose, Teardrop Nose Concave) keep today's rules; the fit still does not move
Smoothness; an Off Stringer for Panel Vee, Rolled Vee or Reverse Vee Nose; BOTTOM's GUIDE words and cartoons (they draw each
cut at its starting numbers, where a belly's panel is 0") — if a GUIDE test demands a card for the new slider, stop and say so
rather than writing the founder's words.

## The founder's answers to the plan's two questions (2026-11-16, after planning)

- **D-08 — The rails-first try starts at 3 mm** (`gate-3mm`, the founder's pick of three): `BRD_RAIL_FIRST_TRY_MM` goes from 4 mm
  to 3 mm, so a log with a flat bottom and soft 50/50 rails still imports as one (test H4) once a belly with a panel reads
  that bottom more closely than the Tri-Plane did. RAILS itself does not change. This is Task 2's decision; the executor does
  not stop for it.
- **D-09 — The Tri-Plane margin stays 1 mm** (the founder's pick of two): quadtesting.brd comes in with a belly center too.
