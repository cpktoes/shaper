---
quick_id: 261125-v2f
date: 2026-11-25
source: the founder, 2026-11-25 — after quick 261125-mf8 (Rail Roll) and spike 007
---

# Open a board file brings back a nose concave with its Rail Roll — decisions (locked)

## The founder's words

1. "Any ideas on how to get the board to import with the rail roll even with the shallow concaves?"
2. "Sure, concave in the nose is super common and should win." (the ruling behind the tie margin)
3. After spike 007's report: "1 yes build it."
4. Models: planning on Fable normally; Fable is out until 2026-11-27 03:00, so this plan runs on Opus (the founder chose Opus for spike 007 on the same grounds). Executor on Opus.

## What was measured

`.planning/spikes/007-nose-roll-round-trip/README.md` (PARTIAL) — read it whole, especially "What a build would need", and its
`spike-source.tar.gz` (the trial patch as a diff, the round-trip grid harness, the twelve-file measure). Unpack only into scratch.

Expected after (spike 007, recommended combination 2+3+4, tie 0.05 mm): of 192 app-written boards with a nose concave
1/16"–1/4" and a Rail Roll 1/16"–1/4", back as a nose concave with a roll 67 → 158, roll and depth within 1/16" 57 → 145, no stray
centre cut 29 → 144; Shortboard 48/48, Mid-length 47/48, Fish 48/48, Longboard 15/48. False concaves 0 of 48 real-belly boards.
The founder's twelve files: bottom and rails exactly as today (eleven identical by digest, testLB to the hundredth); open time
+0.77 s 92Log, +1.05 s Scoop-Noserider, +0.29 s testLB, nothing on the eight under 1 mm.

## Decisions

- **D-01 — Build spike 007's ideas 2 + 3 + 4, nothing else.** (2) Read the shape across the nose: a dish at least 0.5 mm deep,
  lowest at least 30% of the way out, then turning back up at least 0.3 mm, triggers a nose-concave-with-roll try and seeds its
  start. (3) The fit may drop a leftover centre cut that the roll replaces. (4) The roll try starts from the nose concave the fit
  already found (its depth and its name), not from a fresh 1/16" Blended Nose Concave. Idea 1 (try on every belly) is not built.
  The spike's thresholds are the starting values; the plan may name them as constants with the spike's figures.
- **D-02 — Files still over 1 mm keep today's retry** (mf8's fresh Blended Nose Concave from 1/16" with a 1/8" roll, its bar
  unchanged) — Scoop-Noserider needs it.
- **D-03 — The founder's tie rule, in numbers:** a nose concave with a Rail Roll that replaces a belly without adding a cut wins
  when it is within 0.05 mm of the belly's fit (widest plus typical). It is an exception only to the 0.25 mm a renamed nose must
  earn. Fewest cuts, the 0.25 mm extra-cut bar, the Tri-Plane last, the rails-first try and the polish's guard are unchanged.
- **D-04 — Nothing on BOTTOM changes.** No slider, range, name, GUIDE word or stored shape; saved boards identical; no database
  change. Only what a newly opened .brd is fitted to changes. A roll on a flat nose (idea 5) is not built.
- **D-05 — Accepted costs (reported to the founder before he said build):** nine test boards' widest miss grows 0.01–0.13 mm
  (each swapping a leftover centre cut for the written single cut, by the fewest-cuts rule); a Teardrop or Slight Single Concave
  Entry often comes back named Blended Nose Concave; up to about 1 s more to open the three nose files, about 2 s on some
  app-written boards. The Longboard stays mostly without its roll (read rails first) — out of scope.
- **D-06 — Tests.** Unit round trips of app-written boards (a representative slice of spike 007's grid, kept fast: at least a
  shallow 1/16"–1/8" roll on the Mid-length and the Fish, a Teardrop and a Slight, and a 1/4"-deep-1/4"-roll Mid-length) come
  back as a nose concave with a roll within 1/16" and no stray centre cut; the controls: a real centre belly with no nose concave
  still comes back a belly, and a roll-0 board invents no roll (Shortboard, Mid-length, Fish). Every existing brd suite and
  round-trip case still passes; mf8's tests untouched. The header comment in `lib/geometry/brd-bottom.ts` that lists the fit's
  tries is updated. The founder's sample files are never committed, copied into the repo or named in a test.
- **D-07 — Measured through the real import** (`brdLookFromBytes`) on all twelve sample files in `~/Downloads` (skip `_decrypt`
  copies; test-curves-v2.brd duplicates quadtesting.brd), before and after, widest/typical bottom and rails, cut names with
  roll, open time with `uptime` noted; plus the round-trip grid score before and after. Any figure that differs from spike 007's
  is a finding to report, not to tune away.

## Out of scope

The Longboard's rails-first read; keeping a Teardrop's or Slight's name; a roll on a flat nose; the concave's own across-curve;
RAILS; pushing (the founder says when).
