---
quick_id: 261124-x9h
date: 2026-11-24
source: the founder, 2026-11-24 — his question about BOTTOM changes for a closer .brd fit, spikes 003 and 004, and his word to build the Spiral Vee fix
---

# Let Open a board file try the Spiral Vee on its own — decisions (locked)

## The founder's words

1. "are there any corrections we can make to our bottom contour page/controls that would allow the .brd import to become
   more accurate?"
2. "yes, measure the belly shape first and I'd also like to tackle the spiral vee issue (double concave inside a vee
   tail). Use GSD for this." — and "make sure this runs on Fable 5.1" (Fable 5.2 is the one available; he accepted it).
3. After the spikes: "Yes, planning on fable, and builder on opus is fine."

## What was measured

`.planning/spikes/004-spiral-vee-fit/README.md` (VALIDATED; its scripts in `spike-source.tar.gz` there, the trial patch
included). Read it whole before planning — its Investigation Trail says exactly why the fit misses and where the trial
candidate went.

- Today SAtwin.brd opens as Flat Entry · Early Double Concave 7/64" · Panel Vee 1/4", 1.61 / 0.12 mm widest / typical
  bottom miss. The seed never reaches for the Spiral Vee (its starting Start is 14" short of the file's), and the fit swaps
  one section at a time, so "flat centre + Spiral Vee" is two swaps away and never scored; the only Spiral Vee it scores
  sits on the centre double and falls under the 0.25 mm extra-cut bar.
- Fix (b), recommended and the one to build: offer the Spiral Vee alone as one more candidate before the name choice.
  SAtwin → Flat · Flat · Spiral Vee, 0.39 / 0.06 mm; the other eleven files identical to the hundredth, names unchanged;
  the twelve open in 14.8 s against 14.6 s.
- Spike 003 (belly shape, INVALIDATED) is context only: no belly change is in this task.

## Decisions

- **D-01 — One extra candidate, exactly spike 004's fix (b).** The .brd bottom fit also scores the Spiral Vee on its own
  (no centre cut), fitted and polished like any candidate, before the cut names are chosen. Not the general form (b':
  every close candidate with one cut dropped — slower on testLB, 2.77 → 3.71 s), not the loosened extra-cut bar
  (rejected: worse on 92Log, renames the Groveler and testLB), not freeing Vee Lift or Smoothness in the polish.
- **D-02 — The choice rules are untouched:** fewest cuts, `BRD_BOTTOM_EXTRA_CUT_MM` (0.25 mm), the Tri-Plane last, the
  rails-first try, and the polish's guard. The new candidate competes under them like any other.
- **D-03 — Nothing on BOTTOM changes, and saved boards are identical.** No slider, range, step, name, GUIDE word or
  database change; `foamOff` and the stored shape are not touched. Only what a newly opened .brd is fitted to changes.
- **D-04 — Tests.** A synthetic round trip: a board the app builds with a Spiral Vee tail and no centre cut, exported to
  .brd and opened again, comes back as a Spiral Vee with no centre cut. Every existing brd suite and round-trip case still
  passes (the spike ran the app's 178 round-trip cases with the trial on). The header comment in
  `lib/geometry/brd-bottom.ts` that describes the candidates is corrected to say this one exists. The founder's sample
  files are never committed, copied into the repo or named in a test (standing rule).
- **D-05 — Measured through the real import** (`brdLookFromBytes`) on all twelve sample files in `~/Downloads` (skip
  `_decrypt` copies; test-curves-v2.brd duplicates quadtesting.brd): the SUMMARY tables every file's bottom and rails
  widest / typical miss, cut names, and open time, before and after. They should match the spike's fix (b) table; any
  file that differs from it is a finding to report, not to tune away.
- **D-06 — Models:** planner on Fable, executor on Opus (the founder, 2026-11-24).

## Out of scope

The nose misses on 92Log, Scoop-Noserider and testLB (spike 003's finding — a later question); a belly shape control;
quadtesting's rolled vee; pushing (the founder says when).
