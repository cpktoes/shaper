---
quick_id: 261125-mf8
date: 2026-11-25
source: the founder, 2026-11-25 — his question about BOTTOM changes for a closer .brd fit, spikes 005 and 006, his shaping order, and his four answers
---

# Add a Rail Roll to the nose concaves on BOTTOM, and fit it from a .brd — decisions (locked)

## The founder's words

1. After spike 005: "Rail Roll sounds good, but doesn't the actual rail handle that section? Looks like both the bottom and
   rails get a better fit with it, so maybe we proceed." — answered by spike 006 (a wider nose rail cannot draw it).
2. His shaping order: "in the app, i placed bottom first, because I generally shape the bottom contour in first (i.e. mark
   how close the nose concave comes to the rail, etc). Then, I shape the rail and blend them together."
3. His four answers (2026-11-25): "1 bottom. 2 all the way. 3 curved roll. 4 that's fine." — the slider lives on BOTTOM; the
   roll runs all the way to the nose tip; a curved roll, not a straight chine; up to about 2.5 s more to open a file is fine.
4. Models (standing from 2026-11-24): planning on Fable, building on Opus.

## What was measured

Read both whole before planning; the trial code is a diff inside spike 005's `spike-source.tar.gz` (unpack it in scratch,
never under `.planning` loose):

- `.planning/spikes/005-nose-fit/README.md` (PARTIAL) — where the nose misses sit, the Edge Roll trial, its twelve-file
  table, and "What a build would need" (the build's shape, scope and tests). This task builds that, renamed Rail Roll.
- `.planning/spikes/006-nose-rail-reach/README.md` (INVALIDATED) — RAILS' Bottom Tuck 3 freed to +3" never helps; the
  Rail Roll is the blend from the concave's mark that RAILS lacks. No RAILS change in this task.

Expected after (spike 005, through `brdLookFromBytes`): 92Log 1.58/0.44 → 1.28/0.38 mm, Scoop-Noserider 1.18/0.36 →
1.01/0.37, testLB 2.08/0.26 → 1.45/0.21 widest/typical bottom miss; rails 92Log 1.65 → 1.64, Scoop 2.70 → 2.20, testLB
5.01 → 4.98; the other nine files identical to the hundredth.

## Decisions

- **D-01 — The control.** "Rail Roll", one slider on BOTTOM in the three nose concaves (Teardrop Nose Concave, Blended Nose
  Concave, Slight Single Concave Entry), placed right beside that cut's Off Rail. 0 to 1/2", starting at 0. It is a height,
  so it steps, reads and prints like a BOTTOM depth: 1/64" reduced fractions, 0.1 mm in Metric, through
  `formatBottomDepth` and `lib/geometry/units.ts` (CLAUDE.md Rule 2's BOTTOM depth exception). No other cut gets it.
- **D-02 — What it does to the board.** Above 0, the bottom outside the concave's edge (the line Off Rail already sets)
  curves up to the rail, by the Rail Roll's amount at the rail. A **curved roll** (the founder's pick), the curve spike 005
  measured (the Rolled Vee's own at its Smoothness 60) — not a straight chine. It stands in full **from the nose tip** back
  to the concave's Deepest At and fades to nothing by the concave's End; it holds **all the way to the tip**, ahead of the
  concave's Start too (the founder: "all the way"). Nothing changes inside the concave's edge.
- **D-03 — It is a lift, like a vee or a belly.** It never takes foam off the stringer; it thins the rail. Litres, the 3D
  board, the .brd export, DATA, the printed sheets and RAILS' rail lift all follow through the one foam-off number
  (`foamOff` / `sectionsFoamOff`) — no reader gets its own copy of the formula (Rule 1). Any floor or thickness check that
  guards a cut's depth guards the roll the same way; the planner finds which apply.
- **D-04 — Saved boards are identical.** The number is optional on the stored cut; absent reads 0 and the new branch is
  skipped, so the old arithmetic runs to the last bit. The snapshot reader (`lib/models/design-snapshot.ts` or wherever the
  bottom is read) accepts and bounds the new key. No database change, no migration. Presets, fixtures and every GUIDE card
  picture stay identical.
- **D-05 — Open a board file.** As spike 005: the fast scorer gains the roll (its across part worked out once per Off Rail,
  like a cut's base); the polish gains it as one more slider on a nose concave; after the polish, on a file whose widest
  bottom miss is still over 1 mm, the nose is tried once more as a Blended Nose Concave from 1/16" with a 1/8" Rail Roll,
  polished with the roll free, kept by spike 005's own bar: at least `BRD_BOTTOM_EXTRA_CUT_MM` (0.25 mm) closer when the retry
  changes the nose's name, any gain when the nose already is a Blended Nose Concave. (Amended by the orchestrator at plan
  time: the first wording asked 0.25 mm of every retry, which was a transcription slip — the founder approved spike 005's
  measured table, and the strict bar would leave Scoop-Noserider unmoved. The plan's Finding A.) Never in
  the name or order choice. The choice rules, the Tri-Plane last, the rails-first try and the polish's guard are untouched.
  The fit sheet / preview names the roll where a cut has one, in the depth family's words.
- **D-06 — Open time.** Up to about 2.5 s more on a file is accepted (the founder, 2026-11-25), on files still over 1 mm
  after the polish; the eight files already under 1 mm must open in the same time. This relaxes quick 261116-tqs D-08's 3 s
  for those files only; don't spend more than the spike did.
- **D-07 — Words.** BOTTOM's row label "Rail Roll". A GUIDE card for it if BOTTOM's GUIDE has one card per control (the
  planner checks how BOTTOM's GUIDE words are held and tested — a words page and a test hold the code to it line for line
  on the other pages), drafted in the house style (two sentences on what it does, a How to shape note — in his order: mark
  the concave's edge, then roll the rail into it) and flagged in the SUMMARY as a first draft for the founder to mark up.
  The printed sentence that describes a bottom cut mentions the roll only when it is above 0.
- **D-08 — Tests.** Default equals today on every fixture and golden; the roll's own unit tests (nothing inside the edge,
  the whole roll at the rail, the fade from Deepest At to End, held to the tip, 0 = exactly today); the fast scorer held to
  the slow `sectionsFoamOff` with a roll on; a board the app writes with a nose concave and a Rail Roll, exported to .brd
  and opened again, comes back with both; the BOTTOM browser spec(s) that cover a nose concave's rows prove the slider on a
  computer and Android; e2e:prod stays green. The founder's sample files are never committed, copied into the repo or named
  in a test (standing rule).
- **D-09 — Measured through the real import** (`brdLookFromBytes`) on all twelve sample files in `~/Downloads` (skip
  `_decrypt` copies; test-curves-v2.brd duplicates quadtesting.brd): the SUMMARY tables every file's bottom and rails widest /
  typical miss, cut names (with the roll), and open time, before and after. They should match spike 005's table; any file
  that differs is a finding to report, not to tune away.
- **D-10 — Models:** planner on Fable, executor on Opus.

## Out of scope

RAILS changes (spike 006); the nose concave's own across-curve (spike 005's power curve, Scoop's next 0.2 mm); the tail
belly's shape and Depth past 1/2"; a Rail Roll on any cut but the three nose concaves; pushing (the founder says when).
