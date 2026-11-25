---
spike: 003
idea: brd-bottom-fit
name: belly-shape-fit
type: comparison
validates: "Given 92Log, Scoop-Noserider and testLB, when a belly gains one shape number the fit may move, then the widest bottom miss drops (target under 1 mm) and no file gets worse"
verdict: INVALIDATED
related: [004]
tags: [brd-import, bottom, belly, fit]
---

# Spike 003: would a Belly Shape control let the .brd import match a file's bottom more closely?

**Verdict: INVALIDATED.** A belly shape number does not bring the widest bottom miss under 1 mm on any of the three files.
Through the real import, with a search a build could ship: 92Log 1.58 → 1.56 mm, Scoop-Noserider 1.18 → 1.05 mm, testLB
2.08 → 2.08 mm. The files' bellies do have a different shape from ours (measured below), but the belly is not what holds
the widest miss where it is. On all three files the widest miss sits in the **nose**.

## What This Validates

Whether one new number on a belly's across-the-board shape, searched by "Open a board file…" along with what it already
moves, lowers the widest and typical bottom miss on the three files earlier research blamed on "a soft belly the cuts
cannot draw", without making any of the twelve sample files worse.

## How to Run

Everything ran from a detached scratch worktree (removed afterwards); the app's own source was never changed. The scripts,
the trial code as a diff, and the raw outputs are in `spike-source.tar.gz`.

```bash
# 1. a scratch worktree, node_modules symlinked from the main checkout
git -C /Users/kontoes/Code/shaper worktree add --detach <scratch>/wt HEAD
ln -s /Users/kontoes/Code/shaper/node_modules <scratch>/wt/node_modules
# 2. the trial code (four small patches to lib/geometry/bottom.ts and brd-bottom.ts; trial-code.diff is their sum)
python3 -I patch.py <scratch>/wt && python3 -I patch2.py <scratch>/wt && python3 -I patch3.py <scratch>/wt && python3 -I patch4.py <scratch>/wt
# 3. measure, from the worktree folder (ROOT picks the checkout; the trial is off unless SPIKE_FAMILY is set)
OUT=before.json npx --no-install tsx --tsconfig ./tsconfig.json measure.mts                       # from the main checkout
SPIKE_FAMILY=power SPIKE_SEARCH=safe ROOT=<scratch>/wt OUT=final-power.json npx --no-install tsx --tsconfig ./tsconfig.json measure.mts
node cmp.mjs before.json final-power.json x        # the before/after table
node picture.cjs <out folder> <picture folder>     # the two PNGs
```

Switches read by the trial code: `SPIKE_FAMILY` (`power`, `blend`, `late`), `SPIKE_SEARCH` (`polish`, `refine`, `safe`),
`SPIKE_STARTS` (`full`, `lite`), `SPIKE_BELLY_DEPTH_MAX_IN` and `SPIKE_SKIP_ABOVE_IN` (diagnostics only). The sample files
are the founder's `~/Downloads/*.brd` (read only; the `_decrypt` copies skipped, test-curves-v2 treated as quadtesting).

## Investigation Trail

**1. Baseline.** `measure.mts` through `brdLookFromBytes` reproduced the recorded table to the hundredth (92Log 1.58/0.44,
Scoop 1.18/0.36, testLB 2.08/0.26). With the trial code patched in but switched off, every spec and every section value on
all twelve files was identical to main.

**2. How the shapes actually differ** (`shape.mjs`, `results/shape-offline.txt`). Each belly-reading section taken on its own:

- **The file's belly is flat through the middle and turns up harder toward the rail.** On 92Log and Scoop the bottom's
  height grows like the distance out to the power of about 2.3 near the stringer and 2.9 to 3.1 toward the rail: close to
  a cubic. Ours is a quarter cosine wave, which starts rolling right at the stringer (a power of about 2) and eases off
  toward the rail. So ours is too full in the middle and too soft at the rail.
- **Today's fit already fakes that** with the Off Stringer panel (flat for 4", then roll) plus a tail vee stacked on top.
  It works on one section; it cannot follow a board that narrows, because the panel is a fixed 4" while the file's roll
  scales with the width (Scoop: 7.7" half-width near the tail, 11.5" at the wide point).
- **On 92Log the Depth ceiling binds before the shape does.** At the wide point the file's bottom is 14.4 mm above the
  stringer at the edge of the reading window and heading for 21 to 24 mm at the rail. Depth stops at 1/2" (12.7 mm), so
  the fit uses the belly at full depth plus a Rolled Vee run nearly the whole board.
- **testLB has no belly in its fit at all.** Its tail sections do roll (about 1.4 mm inside a narrow window; today's
  curve matches them within 0.07 mm on their own), but a centre belly there lowers only the typical figure, by less than
  the 0.25 mm a new cut must earn. Its widest miss (2.08 mm) is in the nose.

**3. Pivot: the belly sections are not where the widest miss is** (`belly-only.mts`, `results/belly-only.txt`). Scoring
only the belly sections, with the fit's own names and a many-starts search:

| Belly sections alone, widest / typical mm | Today's belly | Power | Blend to u⁴ | Blend to u³ |
|---|---|---|---|---|
| 92Log (behind 90"), Depth to 1/2" | 0.66 / 0.30 | 0.70 / 0.31 | 0.72 / 0.38 | 0.74 / 0.32 |
| 92Log, a belly's Depth to 1" (diagnostic) | 0.58 / 0.24 | 0.39 / 0.19 | 0.40 / 0.17 | 0.34 / 0.17 |
| Scoop (behind 60"), Depth to 1/2" | 0.35 / 0.14 | 0.24 / 0.09 | 0.23 / 0.12 | 0.34 / 0.20 |

So today's controls already draw both bellies within 0.66 and 0.35 mm. "A soft belly the cuts cannot draw" does not hold.
The whole-file figure is a largest-gap score, and it is pinned elsewhere:

- **92Log: one nose section, 94.5" from the tail.** The file's bottom dips 1.49 mm just inside the rail (7.3" out) and
  comes back up 0.58 mm at the window's edge. No cut centred on the stringer draws that; one concave alone gets no closer
  than 1.08 mm there (`nose.mjs`). The fit leaves the nose flat and misses by 1.58 mm. The 106.9" section misses 1.25 mm
  the same way. See `92log-sections.png`, right panel.
- **Scoop: the nose concave, 73.7" to 97.7".** The file's concave deepens steadily to its edge and then turns up sharply
  into the rail; ours is a bell that flattens before its edge. Three nose sections sit at 0.96 to 1.18 mm. The same
  harder-toward-the-rail signature as the belly, but in the concave. See `scoop-sections.png`, right panel.
- **testLB: the nose, 93" to 106".** A concave with a rolled edge outside it: two cuts wanted in one section.

**4. The trial number, three families** (each draws today's belly exactly at its default; `trial-code.diff`):

- **power**: today's curve raised to a power, default 1, range 0.5 to 3. Over 1 the middle flattens and the roll comes
  later and harder; under 1 it rolls from nearer the stringer, toward a vee.
- **blend**: a blend from today's curve (0) to a quartic (1): flat most of the way, then up hard at the rail.
- **late**: the same blend toward a cubic, the file's own measured power.

**5. Three ways to search it.**

- *In the polish only, one pass.* Names never change. It barely used the number, and the extra dimension made the local
  search wander: 92Log came back 1.59/0.47 (blend) and 1.64/0.47 (late), slightly worse than today's 1.58/0.44. A plain
  "add one more slider to the polish" is not safe.
- *In the grid search too.* It can change names: 92Log (power) became Reverse Vee Nose · belly · Flat Exit at 1.60/0.56,
  worse. Not safe either.
- *"Safe": today's polish first, untouched, then four restarts with the number free, kept only when the shown miss is no
  worse than today's polish.* A file with no belly never enters the second step. This is the one tabled below.

**6. Search or model?** A many-starts polish with **no** new number (`results/fair-none.log`) already takes Scoop from
1.18 to 1.01 mm. With the number and the same heavy search (about ten times the polish's work; not shippable as is) Scoop
reaches 0.89 to 0.95 mm and 92Log stays at 1.56 to 1.58. So of Scoop's possible 0.29 mm, about 0.17 is search and about
0.12 is the shape number. Where the number does help Scoop, it is mostly by running the belly up into the nose, where its
late, hard roll stands in for the turned-up edge outside the nose concave.

**7. Diagnostic: Depth past 1/2".** Letting a belly's Depth run to 1" in the polish (not proposed; the founder's ruling
keeps 1/2") does nothing for 92Log's whole-file figure (still pinned at 1.56 by the nose) but takes quadtesting from 6.43
to 2.43 mm with no shape number at all, and 2.03 mm with one.

## Results

### The twelve files, before and after (the real import; power family, "safe" search)

Widest / typical bottom miss in mm; seconds to open, run one file after another on a loaded machine (load average 13 to
16, spike 004 running beside it), so the seconds are indicative.

| File | Bottom before | Bottom after | Cuts (after; names unchanged on all twelve) | Open before | Open after |
|---|---|---|---|---|---|
| 92Log | 1.58 / 0.44 | 1.56 / 0.28 | Flat Entry · Continuous Belly 1/2", panel 4.28" → 0.52", shape 2.0 · Rolled Vee 0.44" → 0.31" | 1.7 s | 3.0 s |
| Scoop-Noserider | 1.18 / 0.36 | 1.05 / 0.42 | Blended Nose Concave · Continuous Belly 0.29" → 1/2", panel 4.14" → 1.32", shape 3.0 · Panel Vee | 1.6 s | 5.2 s |
| testLB | 2.08 / 0.26 | 2.08 / 0.26 | Teardrop Nose Concave · Flat · Flat (identical) | 3.5 s | 3.9 s |
| quadtesting | 6.43 / 0.82 | 5.53 / 0.62 | Flat Entry · Continuous Belly 1/2", shape 0.5 (toward a vee) · Panel Vee 1/2" | 1.4 s | 2.3 s |
| SAtri | 0.40 / 0.06 | identical | Flat · Flat · Spiral Vee | 1.3 s | same work |
| SAtwin | 1.61 / 0.12 | identical | Flat · Early Double Concave · Panel Vee | 1.2 s | same work |
| mid | 0.56 / 0.09 | identical | Blended Nose Concave · Flat · Panel Vee | 1.9 s | same work |
| JFS_BigTwin | 0.70 / 0.32 | identical | Flat · Flat · Panel Vee | 0.7 s | same work |
| 6'10 Widepoint Fwd Egg | 0.77 / 0.21 | identical | Flat · Flat · Panel Vee | 1.4 s | same work |
| 6'2 Round Tail Double Concave | 0.55 / 0.17 | identical | Teardrop · Deep Single · Double Concave Exit | 2.4 s | same work |
| 6'4 Double Wing Groveler | 0.54 / 0.12 | identical | Flat · Deep Single · Flat | 1.2 s | same work |
| Fryer 5'7 Squash Flyer Twin | 0.49 / 0.21 | identical | Blended Nose · Deep Single · Double Concave Exit | 2.3 s | same work |
| Total | | | | 20.5 s | 27.7 s |

The same run with the blend family: 92Log 1.57 / 0.42, Scoop 1.07 / 0.39, quadtesting unchanged at 6.43 / 0.82, the other
nine identical; 24.5 s in all. "Identical" means every stored number and every measured section value matched main.

- **Did any file get worse?** No file's bottom is worse on widest plus typical, which is what the fit scores. But
  Scoop's typical miss rises (0.36 → 0.42, power; 0.39, blend) while its widest falls, and its **rails** widest miss moves
  2.70 → 3.05 mm with the power family (2.56 with blend). 92Log's rails typical moves 0.44 → 0.50 (power).
- **Added open time:** about 1.3 s on 92Log, 3.2 to 3.6 s on Scoop (past the 3 s limit of quick 261116-tqs, D-08), under
  1 s on quadtesting, nothing on the nine files without a belly.
- **The three targets against the claim:** none comes under 1 mm with a shippable search. testLB does not move at all.

### What a BOTTOM control would need (if it were built anyway)

- **What it does to a board.** One number on a belly (Rolled Belly Entry, Continuous Belly / Rolled Mid). At its
  starting value the belly is today's. One way, the bottom stays flatter through the middle and rolls later and harder
  toward the rail (a log's hull); the other way it rolls from nearer the stringer, toward a vee. It changes the rail's
  lift not at all (Depth is still the lift at the rail), but it changes how much foam comes off between the stringer and
  the rail, so litres, the 3D board, the .brd export, DATA and the printed sheet all follow it.
- **Range.** Power family: 0.5 to 3, starting at 1. The fits landed at 2.0 (92Log), 3.0, the end of the range (Scoop),
  and 0.5 (quadtesting). On a slider that would read better as a percentage or a named scale than as a power.
- **Saved boards at its default.** Identical: the number is optional, absent reads the default, and at the default the
  new branch is skipped, so the old arithmetic runs to the last bit. Measured: trial off, all twelve files identical to
  main; trial on, the nine files without a belly identical. No database change (the bottom lives in the snapshot JSON; the
  snapshot reader would need to accept and bound the new key).
- **It overlaps Smoothness.** A belly already shows a Smoothness slider, which blends the same curve toward a straight
  vee. The new number's "fuller" half does nearly the same job, so a real control should probably cover only the
  "later, harder" direction, or replace Smoothness on a belly.
- **Candidate slider names (suggestions for the founder only):** "Roll" or "Belly Shape".
- **The build, roughly:** the number on the stored cut and the resolved cut; one line in `cutFoamOffParts`; a row on
  BOTTOM for the two belly names; the snapshot reader; a GUIDE card (the founder's words); the section drawing, DATA and
  print already read `sectionsFoamOff` and follow. In the import: the "safe" two-step polish, the fit sheet's words, and
  a faster restart scheme to stay inside 3 s. Tests: default-equals-today on the fixtures, the new curve's own unit
  tests, the twelve-file table again.

### Where the evidence points instead

In order of what each would buy on these files:

1. **The nose is the limit on all three.** A concave with a turned-up edge outside it (Scoop, testLB) or a dip beside
   the rail (92Log) is what pins the widest miss. One cut per section cannot draw both. That is a question about the
   reading window in the nose, or a second nose cut, not about the belly.
2. **A heavier search with today's controls** takes Scoop to about 1.0 mm with nothing new on BOTTOM.
3. **The concave's own across-shape** shows the same signature as the belly (the file deepens steadily to its edge; ours
   flattens early). Off line, a plain power curve cut the typical miss on Scoop's two forward nose sections from about
   0.32–0.38 to 0.09–0.13 mm, though not the widest (`results/nose-offline.txt`; not through the import).
4. **Depth past 1/2" on a belly** is what quadtesting wants (6.43 → 2.43 mm) and what 92Log's wide point wants once the
   nose is out of the way. The founder's standing ruling keeps 1/2".

### Pictures

- `92log-sections.png`: the file, today's fit and the trial at 15.7", 51.5" and 94.5". The trial matches the tail belly
  much better (1.58 → 0.56 mm) and the whole file does not move, because the nose section on the right is untouched.
- `scoop-sections.png`: the same at 12.0", 57.7" and 73.7". The trial trades the tail section (1.18 → 0.58) against the
  wide point (0.42 → 0.90) to level every section at 1.05 mm; the nose concave's edge on the right is what it levels to.
