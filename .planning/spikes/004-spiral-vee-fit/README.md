---
spike: 004
idea: brd-bottom-fit
name: spiral-vee-fit
type: standard
validates: "Given SAtwin.brd (a double concave inside a vee tail), when the Spiral Vee is fitted with the numbers or model change it needs, then the widest bottom miss drops well below 1.61 mm (target under 1 mm) and no file gets worse"
verdict: VALIDATED
related: [003]
tags: [brd-import, bottom, spiral-vee, double-concave, vee, fit]
---

# Spike 004: why SAtwin.brd's tail misses by 1.61 mm, and what fixes it

**Verdict: VALIDATED, and not the way the question expected.** The Spiral Vee as it is today draws SAtwin's tail to
**0.39 mm widest / 0.06 typical** (from 1.61 / 0.12). No model change, no new control and no new slider range is needed.
The fit never tries the Spiral Vee on its own on this file; adding that one candidate to the name choice fixes it. No
other of the twelve files moves, and opening the twelve takes 0.2 s longer in total.

## What This Validates

- Given SAtwin.brd (a double concave inside a vee tail),
- when the import is allowed to try "flat centre + Spiral Vee" as a candidate,
- then SAtwin opens as a Spiral Vee alone, 0.39 mm off at the widest, and the other eleven files open exactly as today.

It also shows what does **not** help: a change to the Spiral Vee's model (the vee's own Start / Deepest At / End, its own
Smoothness, its own flat panel) gains nothing measurable on SAtwin (0.40 to 0.40) and 0.02 mm on SAtri.

## How to Run

The scripts are in `spike-source.tar.gz` (nothing loose under `.planning`). They need a detached worktree with the
trial switches applied, never the main checkout:

```
S=<a scratch folder>
git -C /Users/kontoes/Code/shaper worktree add --detach $S/wt HEAD      # HEAD was 9544bffe
ln -s /Users/kontoes/Code/shaper/node_modules $S/wt/node_modules
tar -xzf spike-source.tar.gz -C $S && git -C $S/wt apply $S/spike-source/trial-switches.patch
# run from $S/wt, with SPIKE_ROOT=$S/wt:
npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/all.mts <label>       # the twelve files through brdLookFromBytes
npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/diag.mts SAtwin       # the fit's pool, and every section file vs ours
npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/e1.mts SAtwin         # existing controls freed, slow optimiser
npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/e2.mts SAtwin SAtri   # the model-change trial
npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/timing.mts            # fastest of three, modes interleaved
git -C /Users/kontoes/Code/shaper worktree remove --force $S/wt
```

The switches (environment variables read by the patched `lib/geometry/brd-bottom.ts`; with none set the code is today's):
`SPIKE_POLISH=veeLift[,smoothness]` (fix a), `SPIKE_BAR=0.1` (fix b, the bar loosened), `SPIKE_B=spiral` (fix b, the
recommended one), `SPIKE_B=drop` (fix b, the general form). The files read are the founder's twelve in `~/Downloads`
(the `_decrypt` copies and test-curves-v2.brd skipped), read only.

## Investigation Trail

1. **Baseline reproduced.** All twelve files through `brdLookFromBytes` match the 261116-tqs table to the hundredth.
   SAtwin: Flat Entry · Early Double Concave 7/64" · Panel Vee 1/4", 1.61 / 0.12, widest at the section 3 1/2" from the
   tail, 4" off the stringer (the outer end of what is read there).

2. **What the file's tail is.** SAtwin's last ten sections (1" to 28" from the tail) are a straight vee, about 3/16" at
   the rail, with a double concave about 1/8" deep in it. Both fade in from about 32" up the board, are full from about
   9", and both **run out through the tail at full depth**. The trough sits about 3" off the stringer and the double's
   outer edge about 1" in from the rail. That is the Spiral Vee's own starting shape almost number for number (Off Rail
   1", Trough At 3", depth 1/8", Vee Lift 3/16", ends at the tail); only Start is further up (32" against 18").

3. **What today's fit does with it** (see the picture). It draws the vee as a tail Panel Vee and the double as a
   *centre* Early Double Concave whose Deepest At and End both sit 6 1/2" from the tail. That double stops dead there,
   so the last 6" of the board is a plain vee: at the 3 1/2" and 1" sections the file's trough and ridge are missing and
   the straight vee overshoots near the rail by 1.61 and 1.42 mm.

4. **Was the Spiral Vee tried?** Yes, but only on top of the centre double. The seed (every name at its starting
   numbers) picks Early Double + Panel Vee, because the Spiral Vee's starting Start is 14" short of the file's. The fit
   then swaps one section at a time, so the only Spiral Vee it scores is "Early Double + Spiral Vee": 1.625 on the fit's
   own score against the seed's 1.840. That is 0.215 mm closer, short of the 0.25 mm an extra/other cut must earn
   (`BRD_BOTTOM_EXTRA_CUT_MM`), and it has the same number of cuts, so the seed's names stay. **"Flat centre + Spiral
   Vee" is two swaps away from the seed and is never scored at all.**

5. **Surprise 1: the model is not the limit.** Fitted on its own with exactly the sliders the fit already moves, the
   Spiral Vee scores 0.63 on the grid and 0.40 / 0.07 once polished. Result: Spiral Vee 1/8", Vee Lift 3/16" (untouched),
   Smoothness 50 (untouched), Start 32", Deepest At 2 1/2" ahead of the front fins, End at the tail, Off Rail 1 1/16",
   Off Stringer 11/16", Trough At 3 1/16".

6. **Surprise 2: today's two cuts could draw it too.** A centre double plus a tail Panel Vee with the same numbers is the
   Spiral Vee exactly (checked at 6,068 points inside the rail: they differ by under 1e-15 mm). So Early Double + Panel
   Vee can reach 0.40 as well. The search is stuck: running the centre double out to the tail only helps if Off Rail
   comes in from 1 1/2" to about 1" in the same move, and neither the grid search nor the polish makes that pair of moves.

7. **Fix (a), the numbers the fit does not move.** Vee Lift freed in the polish does nothing for SAtwin, because the
   chosen names hold no Spiral Vee (SAtri gains 0.02 mm). Smoothness freed as well happens to shake the stuck pair loose
   (SAtwin 0.40 with the old two names), but it moves six other files a little, makes mid 0.02 mm worse and Scoop's rails
   0.35 mm worse, and adds 21 more sliders' worth of search. The trough's Centered and By hand runs gain nothing here
   (Centered is worse, 0.66).

8. **Fix (b), the name choice.** Three forms measured:
   - the 0.25 mm bar loosened to 0.1 mm: SAtwin 0.37 as *two* doubles (Early Double + Spiral Vee), but the Groveler and
     testLB change names and 92Log gets worse. Rejected.
   - **one more candidate: where a tail Spiral Vee over a centre double is among the closest, also score it with the
     centre flat** (the Spiral Vee alone, both as it stood and afresh from its starting numbers). SAtwin 0.39 / 0.06,
     nothing else moves. Recommended.
   - the general form, every close candidate with any one of its cuts dropped: the same on SAtwin, 92Log's typical miss
     0.44 to 0.36 with the same names, 2 s more over the twelve. Not needed.

9. **Fix (c), a change to the Spiral Vee itself.** Measured without touching the model, by item 6: centre double + tail
   Panel Vee, started from the Spiral Vee's answer, is "a Spiral Vee whose vee has its own Start, Deepest At and End";
   freeing the vee's Smoothness makes it "panel or rolled"; freeing the vee's Off Stringer gives it its own width. SAtwin
   0.40 to 0.40 in all three, SAtri 0.40 to 0.38. What is left on SAtwin (0.39 mm, 28" from the tail) is a section the fit
   reads as flat because it strays under 1 mm (`BRD_BOTTOM_FLAT_MM`), not the tail.

10. **The app's own round trips.** `brd-bottom.test.ts`, `brd-fit-preview.test.ts` and `brd-look.test.ts` (178 cases,
    the boards the app writes and reads back) pass with either form of the new candidate switched on.

## Results

Widest / typical bottom miss in mm through the real import. "Open" is the fastest of three runs, the modes interleaved
(the machine was shared with spike 003, so single-run times wobble by a second or more; the fastest-of-three do not).

### Fix (b), recommended: try the Spiral Vee alone

| File | Bottom before | Bottom after | Rails before | Rails after | Names after | Open before | Open after |
|---|---|---|---|---|---|---|---|
| 6'10 Widepoint Fwd Egg | 0.77 / 0.21 | 0.77 / 0.21 | 1.67 / 0.49 | 1.67 / 0.49 | same | 0.46 s | 0.44 s |
| 6'2 Round Tail Double Concave | 0.55 / 0.17 | 0.55 / 0.17 | 2.08 / 0.42 | 2.08 / 0.42 | same | 1.86 s | 1.83 s |
| 6'4 Double Wing Groveler | 0.54 / 0.12 | 0.54 / 0.12 | 1.20 / 0.43 | 1.20 / 0.43 | same | 0.78 s | 0.78 s |
| 92Log | 1.58 / 0.44 | 1.58 / 0.44 | 1.65 / 0.44 | 1.65 / 0.44 | same | 1.03 s | 1.02 s |
| Fryer 5'7 Squash Flyer Twin | 0.49 / 0.21 | 0.49 / 0.21 | 0.93 / 0.30 | 0.93 / 0.30 | same | 1.70 s | 1.69 s |
| JFS_BigTwin | 0.70 / 0.32 | 0.70 / 0.32 | 1.42 / 0.35 | 1.42 / 0.35 | same | 0.45 s | 0.45 s |
| SAtri | 0.40 / 0.06 | 0.40 / 0.06 | 2.52 / 0.32 | 2.52 / 0.32 | same (Spiral Vee) | 1.04 s | 1.11 s |
| **SAtwin** | **1.61 / 0.12** | **0.39 / 0.06** | 2.52 / 0.37 | 2.52 / 0.32 | **Flat · Flat · Spiral Vee** (was Flat · Early Double Concave · Panel Vee) | 0.97 s | 1.11 s |
| Scoop-Noserider | 1.18 / 0.36 | 1.18 / 0.36 | 2.70 / 0.78 | 2.70 / 0.78 | same | 1.11 s | 1.10 s |
| mid | 0.56 / 0.09 | 0.56 / 0.09 | 1.76 / 0.42 | 1.76 / 0.42 | same | 1.43 s | 1.42 s |
| quadtesting | 6.43 / 0.82 | 6.43 / 0.82 | 55.49 / 2.08 | 55.49 / 2.08 | same | 1.05 s | 1.03 s |
| testLB | 2.08 / 0.26 | 2.08 / 0.26 | 5.01 / 0.80 | 5.01 / 0.80 | same | 2.77 s | 2.78 s |
| Total | | | | | | 14.6 s | 14.8 s |

- On BOTTOM: nothing new. SAtwin opens with one tail cut, a Spiral Vee, where today it opens with a centre Early Double
  Concave and a tail Panel Vee. Every slider, range and step is as it is.
- Saved boards: identical. Only what a newly opened `.brd` is fitted to changes; `foamOff` and the saved shape are not
  touched.
- With Vee Lift also freed in the polish (fix a on top): SAtwin 0.38 / 0.07, SAtri 0.38 / 0.04, nothing else moves. Worth
  0.02 mm; optional.

### Fix (b'), the general form: every close candidate with any one cut dropped

Same as the table above except: 92Log 1.58 / 0.44 to 1.56 / 0.36 (same names, rails 1.65 / 0.44 to 1.64 / 0.46), and the
open times: testLB 2.77 to 3.71 s, about 0.1 to 0.2 s more on most others, total 14.6 to 16.7 s. Nothing visible on
BOTTOM; saved boards identical.

### Fix (b), rejected: the extra-cut bar loosened from 0.25 mm to 0.1 mm

| File | Bottom before | Bottom after | Rails before | Rails after | Names after |
|---|---|---|---|---|---|
| 6'4 Double Wing Groveler | 0.54 / 0.12 | 0.47 / 0.11 | 1.20 / 0.43 | 1.26 / 0.50 | Flat · Deep Single Concave · Extending Single Concave |
| 92Log | 1.58 / 0.44 | 1.60 / 0.45 (worse) | 1.65 / 0.44 | 2.06 / 0.63 (worse) | same |
| SAtwin | 1.61 / 0.12 | 0.37 / 0.08 | 2.52 / 0.37 | 2.52 / 0.34 | Flat · Early Double Concave · Spiral Vee (two doubles) |
| testLB | 2.08 / 0.26 | 2.08 / 0.23 | 5.01 / 0.80 | 5.01 / 0.67 | Blended Nose Concave · Flat · Flat |
| the other eight | unchanged | | | | same |

The header of `brd-bottom.ts` already records why the bar is 0.25 (at 0.1 a round trip gained a spurious 1/16" cut). Open
times for this run were taken under load and are not quoted.

### Fix (a): the polish also moves Vee Lift, and Smoothness

| File | Before | Vee Lift freed | Vee Lift + Smoothness freed | Rails with both freed (before 2.70 / 0.78 on Scoop, 1.76 / 0.42 on mid) |
|---|---|---|---|---|
| 6'10 Widepoint Fwd Egg | 0.77 / 0.21 | same | 0.78 / 0.21 | same |
| 6'2 Round Tail Double Concave | 0.55 / 0.17 | same | 0.55 / 0.18 | 2.09 / 0.41 |
| 6'4 Double Wing Groveler | 0.54 / 0.12 | same | 0.54 / 0.13 | 1.20 / 0.42 |
| 92Log | 1.58 / 0.44 | same | 1.56 / 0.37 | 1.65 / 0.52 |
| Fryer 5'7 Squash Flyer Twin | 0.49 / 0.21 | same | 0.46 / 0.16 | 0.90 / 0.29 |
| JFS_BigTwin | 0.70 / 0.32 | same | same | same |
| SAtri | 0.40 / 0.06 | 0.38 / 0.04 | 0.36 / 0.06 | same |
| SAtwin | 1.61 / 0.12 | **1.61 / 0.12** | 0.40 / 0.08 (names unchanged) | 2.52 / 0.34 |
| Scoop-Noserider | 1.18 / 0.36 | same | 1.13 / 0.29 | **3.05 / 0.75 (worse)** |
| mid | 0.56 / 0.09 | same | **0.58 / 0.09 (worse)** | 1.81 / 0.42 (worse) |
| quadtesting | 6.43 / 0.82 | same | 5.76 / 0.64 | same |
| testLB | 2.08 / 0.26 | same | 2.08 / 0.25 | 5.01 / 0.81 |

- Names: unchanged on all twelve in both columns.
- Open time: Vee Lift alone adds one slider on a Spiral Vee only (SAtri), nothing measurable. Smoothness adds a slider
  to every cut; those runs were timed under load (55 s and 28 s for the twelve against 17 s) and are not a fair figure,
  but it is the costliest fix here.
- On BOTTOM: nothing new; both are existing sliders. A fitted Smoothness would open at an odd figure (42, 59) rather than
  the name's own 50 or 60.
- Saved boards: identical.
- Reading: Vee Lift alone does not touch the question. Smoothness fixes SAtwin by accident (it un-sticks the search,
  item 7) and breaks the "no file gets worse" condition. It does show quadtesting has 0.67 mm to gain from a rolled vee,
  which is a separate question.

### Fix (c): a change to the Spiral Vee's model (measured with a slow optimiser on the bottom alone, not the whole import)

| Trial (each draws exactly today's Spiral Vee at its default) | SAtwin | SAtri |
|---|---|---|
| The Spiral Vee as it is, polished | 0.40 / 0.07 | 0.40 / 0.05 |
| The vee with its own Start, Deepest At and End | 0.40 / 0.07 | 0.38 / 0.05 |
| and its own Smoothness (panel to rolled) | 0.40 / 0.07 | 0.38 / 0.04 |
| and its own Off Stringer (a flat panel at the stringer) | 0.40 / 0.07 | 0.38 / 0.05 |

Not worth building: at most 0.02 mm on the two files that hold this shape. It would have meant up to five new sliders
under the Spiral Vee. If the founder ever wants them for shaping reasons, candidate names (suggestions only):
"Vee Start" / "Vee End", and "Vee Panel". Saved boards would stay identical if those opened on the cut's own numbers.
The other nine founder files have no double inside a vee, so they cannot move under (c).

### What the real build would be

- One addition in `fitBottomToBrd` (`lib/geometry/brd-bottom.ts`), before `chooseBrdBottom`: when one of the closest
  candidates (the refined seed and the three fully refined neighbours) has a Spiral Vee tail over a centre double, add
  two more candidates to the pool: that bottom with the centre flat, refined; and flat centre + Spiral Vee from its
  starting numbers at its best depth, refined. `chooseBrdBottom` and its rules (fewest cuts, 0.25 mm, the Tri-Plane last)
  stay as written; the new candidate wins on them (0.63 against 1.84 on the grid, one cut against two).
- A unit test on a synthetic board the app writes itself: a Spiral Vee started well ahead of its starting Start (say
  fins + 26") comes back as a Spiral Vee alone. Worth checking first that it fails today.
- The header comment's "a double inside a vee tail" as a model limit (stage 6, and the 261116-tqs summary's reading) is
  wrong and should be corrected: it was the search.
- No BOTTOM, GUIDE, schema, migration or saved-board change. Open time about +0.15 s on a file with this shape, nothing
  on the others.
- Optional, separate: Vee Lift in the polish (0.02 mm on Spiral Vee files).

### Picture

`satwin-tail-sections.png`: half a cross-section at the file's four tail sections (1", 3 1/2", 6 1/2", 9" from the tail):
the file, today's fit, and the Spiral Vee alone.

### Limits of this spike

- Two of the twelve files hold a double inside a vee (SAtwin, SAtri), both by the same designer. A spiral vee whose vee
  and double start far apart, or whose vee is rolled, is not in the sample; (c) would be the place to look if one turns up.
- The remaining 0.39 mm on SAtwin is a section 28" from the tail that strays 0.74 mm and is read as flat by design.
- Times are from one Mac under shared load; only the fastest-of-three table should be quoted.
