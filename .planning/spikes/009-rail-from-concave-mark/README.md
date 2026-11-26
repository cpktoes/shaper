---
spike: 009
idea: brd-bottom-fit
name: rail-from-concave-mark
type: comparison
validates: "Given a nose concave with a Rail Roll, when the nose rail starts at the concave's edge (the shaper's mark) instead of further in, so the roll is the blend from the mark to the rail, then the finished Longboard carries its roll, it opens from a .brd with the roll it was written with, and every board without a roll draws exactly as today."
verdict: INVALIDATED
related: [006, 007, 008]
tags: [brd-import, bottom, rails, nose, concave, rail-roll, longboard, round-trip, fit]
---

# Spike 009: start the nose rail at the concave's mark, so the Longboard's Rail Roll survives

**Verdict: INVALIDATED.** Starting the Longboard's nose rail at the concave's mark does what it says to the board, and
leaves every other board alone, but it does not bring the roll back from a file. Three of the four tests pass and the one
that matters fails:

- **The finished Longboard carries its roll: yes, loudly.** With the rail started at the mark (rule A, recommended of the
  variants), a rolled Longboard's nose is a different, harder-tucked rail: the written file moves by 0.51 mm on average
  over the nose (5.3 mm at most, 16" back) against today's 0.03 to 0.12 mm.
- **Every board without a roll draws exactly as today: yes.** Of the 340 test boards (every preset, plain, roll-0, belly
  and mixed boards), every one without a roll, and every rolled Shortboard, Mid-length and Fish, is byte-identical: the
  litres, every ring of the surface, and the .brd file. Only the 48 rolled Longboards change.
- **It opens with the roll it was written with: no.** 43 of 48 rolled Longboards now come back "with a concave and a
  roll" (today 15), but the roll they come back with is still unrelated to the roll written (correlation 0.05; today
  -0.06): about 1/4" whatever was written. The rule makes the file say *that* there is a roll; it does not make it say
  *how much*. A 1/16" roll and a 1/4" roll under rule A differ in the file by 0.15 mm on average, still a third of what
  they do on the Mid-length, and RAILS takes that up again.
- **And it makes things worse:** the Longboard's bottom miss nearly doubles (1.07 / 0.12 → 1.82 / 0.31 mm), 32 of 48 come
  back with a stray centre or tail cut (today 6), the founder's 92Log opens with its rails further off (1.64 / 0.45 →
  1.93 / 0.50 mm), and a rolled Longboard takes 2 to 7 s longer to open, past the 2.5 s allowed.

Every other variant (the finished rail exactly at the mark, Bottom Tuck 3 alone, the roll lifting the rail in full, the
rail pulled past the mark to give the roll its own strip of bottom) and both import tweaks did no better, and most did worse
on the founder's files. **Nothing here should be built for the import.** Whether rule A is wanted for how the app draws a
rolled Longboard, regardless of the import, is a separate question for the founder; the picture and "Decisions" below are
for that.

## What This Validates

Spike 008 found the Longboard's Rail Roll cannot come back from a .brd because the Longboard's soft nose rail starts 2" to
5" inside the nose concave's edge, so the whole roll sits under the rail and is shaped away. Its first suggested board change,
the founder's pick (2026-11-26), was to start the rail at the concave's mark, in his own shaping order: *"I generally shape
the bottom contour in first (i.e. mark how close the nose concave comes to the rail, etc). Then, I shape the rail and blend
them together."* This spike defines that rule, tries every reasonable way of drawing it, shows what each does to the four
presets and their litres, and runs the round trip and the founder's twelve files with the rule used both to write and to
open.

## How to Run

Everything ran from a detached scratch worktree at main dff59dc0 (removed afterwards); the app's own source was never changed.
The scripts, the trial code as one diff (`trial-code.diff`) and every raw output are in `spike-source.tar.gz`.

```bash
S=<a scratch folder>
git -C /Users/kontoes/Code/shaper worktree add --detach $S/wt dff59dc0
ln -s /Users/kontoes/Code/shaper/node_modules $S/wt/node_modules
tar -xzf spike-source.tar.gz -C $S && git -C $S/wt apply $S/spike-source/trial-code.diff
# With no S9_ switch set the trial code is today's code exactly (74 Longboards, 222 other boards and the twelve files identical).
# From the repo root. The rules on the app's boards (bottom tuck, where the rail leaves the bottom, litres, .brd digest):
ROOT=$S/wt RULES=",a,a2,af,b,ab,c" npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/scripts/rules.mts
ROOT=$S/wt RULES="a,af,a2,b,ab" npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/scripts/litres.mts   # 340 boards
# The Longboard grid (74 boards) per rule, then the other three presets (222), the twelve files:
$S/spike-source/scripts/run-trials.sh $S/wt "lb-base:" "lb-a:S9_RULE=a" "lb-af:S9_RULE=af" "lb-b:S9_RULE=b" "lb-c:S9_RULE=c"
$S/spike-source/scripts/run-trials.sh $S/wt "lb-ai:S9_RULE=a,S9_IMPORT=1" "lb-ai2:S9_RULE=a,S9_IMPORT=2"
ONLY= NOT=longboard $S/spike-source/scripts/run-trials.sh $S/wt "oth-a:S9_RULE=a"
$S/spike-source/scripts/run-twelve.sh $S/wt 1 "t12-base:" "t12-a:S9_RULE=a" "t12-af:S9_RULE=af" "t12-c:S9_RULE=c" "t12-b:S9_RULE=b"
node $S/spike-source/scripts/table.mjs lb-base=Today lb-a=A lb-af=Af lb-c=C lb-b=B ; node $S/spike-source/scripts/lbroll.mjs lb-a
node $S/spike-source/scripts/same.mjs t12-base t12-a                      # and same.mjs s8-v2f-after oth-a for the other presets
# The oracle (is the written roll findable at all), the signal, RAILS' nose card, open times, the picture:
ROOT=$S/wt RULES=",a,af,b,c" CASES="longboard|Blended Nose Concave|d3|r4;longboard|Teardrop Nose Concave|d2|r2;midlength|Blended Nose Concave|d3|r2" \
  npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/scripts/oracle2.mts
ROOT=$S/wt RULES=",a" npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/scripts/signal.mts
ROOT=$S/wt npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/scripts/railspage.mts
ROOT=$S/wt REPS=3 FILES=1 ONLY=92Log,Scoop,testLB,SAtri npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/scripts/time9.mts t.json "longboard|Blended Nose Concave|d3|r4"
ROOT=$S/wt RULES=",a" CASES="..." npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/scripts/picdata9.mts pic9.json
node $S/spike-source/scripts/picture9.cjs pic9.json a "rule A" rail-from-concave-mark.png
git -C /Users/kontoes/Code/shaper worktree remove --force $S/wt
```

The switches (all in `trial-code.diff`):

| Switch | What it does |
|---|---|
| `S9_RULE=a` | **Rule A, the rail from the mark.** Where the nose concave has a Rail Roll above 0, the rail's Bottom Tuck 3 may not be further in from the rail's edge than the concave's mark (Off Rail, measured as the roll itself measures it). Bottom Tuck 1 and 2 are scaled down with it, so the rail keeps its own proportions. |
| `S9_RULE=a2` | Rule A with Bottom Tuck 3 moved alone; Bottom Tuck 1 and 2 only as far as they must to stay inside it. |
| `S9_RULE=af` | Rule A measured on the finished rail: the place where the sanded rail meets the bottom (its blend included) is put on the mark, so Bottom Tuck 3 lands about 7/16" outside it. |
| `S9_RULE=b` | **Rule B, the rail on the rolled bottom.** The rail keeps its own shape, but the roll lifts it in full outside the mark, instead of less the higher up the rail (today). |
| `S9_RULE=ab` | Both. |
| `S9_RULE=c` | **Rule C, room for the blend.** The finished rail pulled further out than the mark, to half its distance from the rail (`S9_FRAC`, 0.5), so the roll has bottom of its own between the mark and the rail, as it does on the Shortboard. |
| `S9_IMPORT=1` | Import tweak 1: where the fitted nose concave has a roll, the bottom's reading width follows the rule's pulled rail instead of today's rail fitted on a flat bottom (both orders). |
| `S9_IMPORT=2` | Import tweak 2: tweak 1, and the rails-first try fits its rails on a bottom carrying a rolled nose concave (the one bottom-first found, else a fresh 1/16" Blended with a 1/8" roll). |

Along the board every pull follows the roll's own share (`railRollAlong`): all of it from the nose tip to the concave's
Deepest At, fading on BOTTOM's smoothstep to nothing at its End, so the rail returns to its own start with no step and no kink
(the smoothstep is flat at both ends). The test boards are spike 007/008's grid exactly (the app's own presets, `startingCut`
for each nose concave at Depth 1/16" to 1/4" and Rail Roll 1/16" to 1/4", written with `brdText`, opened with
`brdLookFromBytes`), now written and opened under the same rule in the same process. The sample files are the founder's
`~/Downloads/*.brd`, read where they are (the `_decrypt` copies skipped, test-curves-v2 treated as quadtesting).

## Investigation Trail

**1. Baseline.** With no switch, the trial code opened the 74 Longboards exactly as spike 008's own baseline (0 of 74 differ),
the other 222 boards as quick v2f's after-run, and the twelve files by digest as spike 008 recorded them (0 of 12 differ).

**2. Where the Longboard's nose rail starts, and what each rule does to it** (`rules.mts`, `results/rules-longboard.txt`).
On the app's Longboard (9', Symmetrical nose rail), Bottom Tuck 3, and where the finished rail actually leaves the bottom:

| Longboard, Blended Nose Concave 3/16" with a 1/4" roll | 2" from the nose | 8" | 16" | 24" | 32" | 40" |
|---|---|---|---|---|---|---|
| Half-width | 5.08" | 8.28" | 9.89" | 10.63" | 11.01" | 11.19" |
| The concave's mark (in from the rail) | 1 5/8" | 1 5/8" | 1 5/8" | 1 5/8" | 1 5/8" | none |
| How much of the pull stands (the roll's own share) | all | all | 0.93 | 0.50 | 0.07 | 0 |
| Today: Bottom Tuck 3 / rail leaves the bottom | 2.00" / 2.73" | 3.03" / 4.14" | 3.90" / 5.32" | 4.37" / 5.96" | 4.86" / 6.63" | 5.06" / 6.90" |
| Rule A | 1.62" / 2.22" | 1.62" / 2.23" | 1.78" / 2.44" | 3.00" / 4.10" | 4.64" / 6.33" | as today |
| Rule A2 (Bottom Tuck 3 alone) | 1.62" / 2.16" | 1.62" / 2.07" | 1.78" / 2.27" | 3.00" / 3.91" | 4.64" / 6.31" | as today |
| Rule Af (finished rail on the mark) | 1.19" / 1.62" | 1.18" / 1.62" | 1.35" / 1.87" | 2.77" / 3.79" | 4.61" / 6.29" | as today |
| Rule C (to half the mark) | 0.58" / 0.81" | 0.57" / 0.81" | 0.78" / 1.11" | 2.47" / 3.38" | 4.57" / 6.24" | as today |
| Rule B | as today (the rail keeps its shape; the roll lifts it in full) | | | | | |

The sanded rail always reaches a little further in than Bottom Tuck 3, because its blend at that last corner runs half
way into the flat bottom: about 0.6" on this nose under rule A. So "the rail starts at the mark" has two honest readings,
the tuck line on the mark (A) or the finished rail on the mark (Af). On the Shortboard, Mid-length and Fish the rail already
leaves the bottom 0.2" to 0.9" in from the edge, well outside a 1 5/8" mark, so A, A2 and Af change nothing there at all.

How far along the board it reaches depends on the concave (`anchors.mts`): the Teardrop's and the Blended's pull is gone by
36" to 38" from the nose, but the Slight Single Concave Entry's Deepest At is 50 1/2" back on the Longboard, so its pull holds
full strength for over four feet and only fades out 56 1/2" from the nose, past the board's middle.

**3. What it does to the board and its litres** (`litres.mts`, `results/litres.txt`, all 340 boards under each rule).
Under A, A2 and Af, **exactly the 48 rolled Longboards change; every other board is byte-identical** (litres, every
section ring the 3D board and the litres read, and the .brd bytes): all 4 plain presets, all 48 roll-0 nose concaves, all 56
belly, vee and mixed boards, and all 144 rolled Shortboards, Mid-lengths and Fish. Under B every rolled board of every preset
changes (the roll now lifts the rail on the Shortboard too), by -0.004 to -0.039 L there and -0.02 to -0.19 L on the Longboard.

The Longboard's litres, change against the same board with no roll:

| Longboard | Roll 1/16" | 1/8" | 3/16" | 1/4" |
|---|---|---|---|---|
| Teardrop, today | -0.03 L | -0.06 | -0.08 | -0.11 |
| Teardrop, rule A | **+0.37 L** | +0.34 | +0.30 | +0.27 |
| Blended, today | -0.02 L | -0.03 | -0.05 | -0.06 |
| Blended, rule A | **+0.38 L** | +0.36 | +0.34 | +0.32 |
| Slight Single Concave Entry, today | -0.04 L | -0.08 | -0.13 | -0.17 |
| Slight Single Concave Entry, rule A | **+1.37 L** | +1.31 | +1.26 | +1.20 |

(The same for every Depth.) The pull puts foam back under the nose: the soft rail that rolled in from 5" now starts at the
mark, so the bottom between them stays flat to the concave. Against today's rolled board, A adds +0.38 to +1.41 L (mean
+0.72), A2 +0.27 to +1.15, Af +0.47 to +1.72. **The step is at the first 1/64":** from roll 0 to the smallest roll the
board gains about 0.4 L (1.4 L with the Slight) and its nose rail changes shape all at once; every further step of roll then
takes a little back, as today. That is the rule as asked ("above 0"), and it is a decision for the founder (below).

**4. What the finished section looks like** (`rail-from-concave-mark.png`, `picdata9.mts`). Three Longboards at 2", 8" and
16" back from the nose, the outer 6" of the half section: today (blue dashed), rule A (orange), the same board with no roll
(grey dotted). Under A the rail at 8" and 16" no longer rolls in from 4" to 5" out; it leaves the bottom about 2 1/4" in, a
little inside the mark, and climbs harder, the lower rail a few millimetres fuller, the edge itself where it was. At 2" from the
nose the Teardrop's mark (2 1/4") is already outside its rail, so nothing changes there. Rule C (not pictured; `pic-c.png` in
the archive) turns the same noses into a boxy, low rail starting under an inch from the edge: a different board.

**5. The roll's signal in the file** (`signal.mts`, `results/signal.txt`): each file against the same board with no roll
("is there a roll?") and against the same board with a 1/16" roll ("how much?"), mean over the nose sections:

| Blended Nose Concave 3/16" | vs no roll, 1/16" / 1/8" / 1/4" roll | vs a 1/16" roll, 1/8" / 1/4" roll |
|---|---|---|
| Longboard, today | 0.03 / 0.06 / 0.12 mm | 0.03 / 0.09 mm |
| Longboard, rule A | **0.51 / 0.50 / 0.48 mm** (5.3 mm at 16") | 0.05 / 0.15 mm |
| Mid-length (today = A) | 0.16 / 0.32 / 0.53 mm | 0.16 / 0.40 mm |

Rule A makes the presence of a roll the loudest thing on the nose, louder than on the Mid-length, but the amount stays as
quiet as today. That is the whole result in one table: the pull is all-or-nothing, and only the roll's own lift (which RAILS
can mimic, spike 008) carries "how much".

**6. The oracle: given the written concave, can the file tell the roll?** (`oracle2.mts`, `results/oracle2-*.txt`). The
written bottom put on the board the file's outline fit makes, the roll swept 0 to 1/2", the rails refit each time (afresh, and
from the rails fitted at the written roll), judged on the whole nose sections:

| Whole nose sections, typical mm (rails afresh / by descent) | 0 | 1/16" | 1/8" | 3/16" | 1/4" | 3/8" | 1/2" |
|---|---|---|---|---|---|---|---|
| Mid-length Blended 3/16", **written 1/8"**, today | 0.41 | 0.37 | **0.32** | 0.38 | 0.47 | 0.66 | 0.85 |
| Longboard Blended 3/16", **written 1/4"**, today | 0.65 / 0.63 | 0.63 / 0.61 | 0.61 / 0.61 | 0.62 / 0.61 | **0.62** | 0.64 | 0.68 |
| same, rule A | 0.85 / 0.88 | 0.67 / 0.71 | 0.69 / 0.65 | 0.65 / 0.65 | **0.65** | 0.68 | 0.74 |
| same, rule Af | 0.95 / 0.99 | 0.73 / 0.73 | 0.72 / 0.70 | 0.71 / 0.69 | **0.69** | 0.74 | 0.83 |
| same, rule B | 0.68 / 0.73 | 0.63 / 0.68 | 0.61 / 0.71 | 0.60 / 0.61 | **0.62** | 0.65 / 0.62 | 0.73 / 0.72 |
| same, rule C | 0.80 / 0.93 | 0.65 / 0.77 | 0.71 / 0.73 | 0.68 / 0.68 | **0.67** | 0.72 | 0.85 |
| Longboard Teardrop 1/8", **written 1/8"**, today | 0.59 / 0.62 | 0.62 | **0.63** | 0.65 | 0.67 | 0.67 | 0.67 / 0.73 |
| same, rule A | 0.81 / 0.82 | 0.64 / 0.63 | **0.65** | 0.67 | 0.70 | 0.78 / 0.70 | 0.74 / 0.76 |
| same, rule C | 0.95 / 1.05 | 0.80 / 0.80 | **0.75** | 0.77 | 0.84 | 0.96 / 1.02 | 1.22 / 1.25 |

The Mid-length is what a readable roll looks like: a clear V, 0.05 mm a step either side of the written roll. On the Longboard
every rule draws a big step between no roll and any roll (the pull switching on), then a line flat to a few hundredths from
1/16" to 1/4", with its low point anywhere. Only C and Af put the low point on the written roll in some of these, by 0.01 to
0.03 mm, and C does it by redrawing the nose into a short rail the founder's longboards do not have (step 4).

**7. Through the real import** (the Longboard grid, Results). Every pulling rule raises "back as a concave with a roll" to
38 to 43 of 48, because the pull is loud and the bottom reading (which now runs past the mark onto the pulled rail) stands a
roll in for it. The roll that comes back is about 1/4" whatever was written. And the Longboard stops opening rails first (43 →
22 of 48 under A, 9 to 10 under Af and C): with the nose rail now short, reading the bottom first gets close enough at the nose
that the rails-first try no longer wins by its 0.25 mm, so the bottom is read out to nine-tenths along the whole board and the
soft rail behind the nose comes back as a stray 1/2" centre belly (32 to 44 of 48). The two import tweaks change nothing (tweak 1:
the reading width can only widen back to nine-tenths, and the boards that matter already read that far) or make it worse (tweak 2:
invented rolls 4 → 6, and a false concave, which spikes 007 and 008 never had: the Longboard with a 1/4" Rolled Belly
Entry opens as a 1/16" Blended Nose Concave). `steps.mts` logs
both orders on single boards.

**8. The founder's three longboards.** 92Log and testLB open with a Blended Nose Concave and a roll today, and Scoop-Noserider
too. Their bottoms and cuts are untouched by every rule (the bottom is chosen before the rails), but the board they open as
now pulls its rail to the fitted concave's mark, so the rails are refit around a pull the file's real rail never had: 92Log's
fitted Off Rail is 0.83", well outside where its rail begins (1.0" to 1.6" in), so A drags its nose rail out by up to about 3/4" and
the rails miss grows 1.64 / 0.45 → 1.93 / 0.50 mm (Af 3.64, C 5.04, B 2.68). testLB's fitted Off Rail is 3.79", so the pull
barely reaches its Symmetrical rail (rails the same to the hundredth; its litres 71.86 → 71.87 L). Scoop's rail already starts
outside its mark (identical under A and Af).

## Results

### The variants side by side

| Rule | What it does to the board | Rolled Longboard litres | Other presets | Roll back on the Longboard |
|---|---|---|---|---|
| Today | rail starts 2.7" to 6.9" in; the roll mostly shaped away under it | -0.02 to -0.17 L for the roll | — | 15 of 48, correlation -0.06 |
| **A: Bottom Tuck 3 to the mark, tucks scaled** | rail starts at the mark (its blend 0.6" inside), harder lower rail at the nose | **+0.38 to +1.41 L** | identical | 43 of 48, correlation 0.05 |
| A2: Bottom Tuck 3 alone | as A, the lowest tuck band steeper | +0.27 to +1.15 L | identical | (not run through the import) |
| Af: finished rail on the mark | as A, tucks about 7/16" further out | +0.47 to +1.72 L | identical | 43 of 48, correlation 0.44 |
| B: the roll lifts the rail in full | rail keeps its shape, its lower half and edge lifted by the roll | -0.02 to -0.19 L | **every rolled board changes** | 19 of 48, correlation 0.16 |
| C: rail to half the mark | a short, boxy nose rail under an inch from the edge | +0.57 to +2.11 L (three boards measured) | Mid-length changes slightly | 38 of 48, correlation 0.28 |

### The Longboard grid, per rule

48 rolled Longboards (three nose concaves × Depth 1/16" to 1/4" × Rail Roll 1/16" to 1/4"), 12 roll-0 Longboards, 14 with a
belly or vee and no nose concave or a mixed one; each written and opened under the same rule. Bottom and rails are the rolled
boards' mean widest / typical, mm. "Correlation" is the written roll against the roll back over the boards that come back with
one (1 = the roll is read; 0 = it is not; Shortboard, Mid-length and Fish today: 0.97 to 0.99).

| Rule | Back as a concave with a roll | Roll and depth within 1/16" | Depth within 1/16" | Correlation | No other cut | Stray centre or tail cut | Bottom | Rails | Read rails first | Invented rolls (roll 0) | False concaves |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Today | 15 of 48 | 5 | 26 | -0.06 | 12 | 6 | 1.07 / 0.12 | 4.99 / 0.67 | 43 of 48 | 4 of 12 | 0 of 12 |
| **A** | 43 | 8 | 29 | 0.05 | 16 | 32 | 1.82 / 0.31 | 5.73 / 0.95 | 22 | 4 | 0 |
| A + import tweak 1 | identical to A on all 74 | | | | | | | | | | |
| A + import tweak 2 | 42 | 4 | 29 | -0.06 | 13 | 33 | 1.75 / 0.33 | 5.77 / 0.96 | 18 | 6 | **1** |
| Af | 43 | 4 | 21 | 0.44 | 4 | 44 | 2.18 / 0.43 | 5.78 / 1.01 | 10 | 4 | 0 |
| Af + import tweak 1 | identical to Af on all 74 | | | | | | | | | | |
| B | 19 | 7 | 27 | 0.16 | 8 | 21 | 1.42 / 0.23 | 5.27 / 0.76 | 30 | 4 | 0 |
| C | 38 | 13 | 16 | 0.28 | 3 | 43 | 2.32 / 0.40 | 5.93 / 0.99 | 9 | 4 | 0 |
| C + import tweak 1 | identical to C on all 74 | | | | | | | | | | |

Per written roll under A, the average roll back is 17.1, 15.6, 12.7 and 18.5 /64" for 1/16", 1/8", 3/16" and 1/4" written
(`lbroll.mjs`). Under A the 26 controls (roll 0, belly, mixed, plain) open exactly as today; under Af two of them, under B and C six,
open with the same cuts but slightly different rails, because the small roll the import already invents on them now also pulls
their rail.

### The other three presets (Shortboard, Mid-length, Fish: 222 boards, rule A)

221 of 222 open exactly as today (`same.mjs s8-v2f-after oth-a`): 48 / 47 / 48 back with their concave and roll, 0 invented
rolls, 0 false concaves. The one that moves is a mixed Shortboard (Blended Nose Concave 1/8" with no roll over a 1/8" centre
belly): today it opens with an invented 2/64" roll, and under A that invented roll also pulls its opened rail, so its rails miss
grows 1.46 / 0.26 → 1.90 / 0.31 mm with the same cuts.

### The founder's twelve files

Widest / typical bottom and rails miss in mm through `brdLookFromBytes`; "identical" means one digest over the fitted cuts,
every measured section and the fitted rails matched today's. Today equals spike 008's baseline on all twelve, by digest.

| File | Today: bottom · rails · cuts | Rule A | Af | B | C |
|---|---|---|---|---|---|
| 6'10-Widepoint-Fwd-Egg | 0.77 / 0.21 · 1.67 / 0.49 · Flat · Flat · Panel Vee 6/64" | identical | identical | identical | identical |
| 6'2-Round-Tail---Double-Concave | 0.55 / 0.17 · 2.08 / 0.42 · Teardrop 4/64" · Deep Single 8/64" · Double Concave Exit 8/64" | identical | identical | identical | identical |
| 6'4-Double-Wing-Groveler | 0.54 / 0.12 · 1.20 / 0.43 · Flat · Deep Single 7/64" · Flat | identical | identical | identical | identical |
| **92Log** | 1.28 / 0.38 · 1.64 / 0.45 · Blended 4/64", Rail Roll 11/64" · Continuous Belly 32/64" · Rolled Vee 27/64" | **rails worse: 1.93 / 0.50** (bottom and cuts the same) | rails 3.64 / 0.57 | rails 2.68 / 0.51 | rails 5.04 / 0.57 |
| Fryer-5'7-Squash-Flyer-Twin | 0.49 / 0.21 · 0.93 / 0.30 · Blended 4/64" · Deep Single 12/64" · Double Concave Exit 7/64" | identical | identical | identical | identical |
| JFS_BigTwin | 0.70 / 0.32 · 1.42 / 0.35 · Flat · Flat · Panel Vee 7/64" | identical | identical | identical | identical |
| SAtri | 0.40 / 0.06 · 2.52 / 0.32 · Flat · Flat · Spiral Vee 8/64" | identical | identical | identical | identical |
| SAtwin | 0.39 / 0.06 · 2.52 / 0.32 · Flat · Flat · Spiral Vee 8/64" | identical | identical | identical | identical |
| **Scoop-Noserider** | 1.01 / 0.37 · 2.20 / 0.68 · Blended 22/64", Rail Roll 19/64" · Continuous Belly 20/64" · Panel Vee 4/64" | identical | identical | rails 2.39 / 0.76 | rails 3.01 / 0.70 |
| mid | 0.56 / 0.09 · 1.76 / 0.42 · Blended 32/64" · Flat · Panel Vee 12/64" | identical | identical | identical | identical |
| quadtesting | 6.43 / 0.82 · 55.49 / 2.08 · Flat · Continuous Belly 32/64" · Panel Vee 32/64" | identical | identical | identical | identical |
| **testLB** (rails first) | 1.45 / 0.21 · 4.98 / 0.72 · Blended 24/64", Rail Roll 7/64" · Flat · Flat | same to the hundredth (digest moves) | rails 4.98 / 0.71 | rails 5.39 / 0.74 | rails 4.98 / 0.78 |

How the three rolled files' boards change under A: the cuts and the bottom are exactly today's on all three. The board that
opens is drawn under the rule, so its nose rail is pulled to the fitted concave's mark: 92Log's by up to 3/4" (its fitted Off
Rail, 0.83", is outside where its real rail starts), litres 70.80 → 70.72 L once the rails are refit; testLB's barely (Off Rail
3.79"), 71.86 → 71.87 L; Scoop's not at all, 73.12 L (`opened.mts`, `results/opened.txt`).

### Open times

Fastest of 3, today and rule A back to back in one process (`time9.mts`, `out/times-*.log`). The machine was shared with
another project's test run (load averages 7 to 45 during the grids, up to 93); the rolled Longboards were timed twice and agree.

| Board or file | Load | Today | Rule A |
|---|---|---|---|
| Longboard, Blended 3/16", roll 1/4" | 10 (39 first pass) | 5.97 s | 8.01 s (+2.0; first pass +1.5) |
| Longboard, Teardrop 3/16", roll 1/4" | 14 (20) | 3.69 s | 8.27 s (**+4.6**) |
| Longboard, Slight 1/8", roll 1/8" | 9 (14) | 3.30 s | 10.57 s (**+7.3**) |
| Longboard, plain | 9 | 2.81 s | 2.79 s |
| 92Log | 8 | 3.49 s | 3.69 s |
| Scoop-Noserider | 19 | 4.12 s | 3.87 s |
| testLB | 18 | 3.81 s | 3.96 s |
| SAtri (unchanged) | 20 | 1.26 s | 1.26 s |

The other eight files do no new work under A (identical digests, no rolled concave on the board that opens). A rolled
Longboard costs 2 to 7 s more, past the 2.5 s the founder allowed on two of three: the import now tries both orders in full,
because rails first no longer wins outright.

### What RAILS would show

Built as a drawing rule, the same pull has to reach RAILS, or the page would band a rail the board does not have
(`railspage.mts`, `results/railspage.txt`). RAILS' nose card sits 12" back from the tip, where the pull is at full strength for
all three concaves:

| RAILS nose card, Longboard | Bottom Tuck 1 / 2 / 3 today | Under rule A |
|---|---|---|
| Blended 3/16", roll 1/4" | 1.71" / 0.86" / 3.08" | 0.90" / 0.45" / 1.62" |
| Teardrop 3/16", roll 1/4" | 1.71" / 0.86" / 3.08" | 1.25" / 0.62" / 2.25" |
| Slight 1/8", roll 1/8" | 1.84" / 0.92" / 3.30" | 1.11" / 0.56" / 2.00" |
| Shortboard, Mid-length, Fish (any) | 0.17" to 0.26" / … / 0.30" to 0.45" | unchanged |

Every place a shaper would see a different number on a rolled Longboard:

- **RAILS' nose card** (plot, DATA, readout), **the phone's RAILS tile** and **the order form's Rail Band Reference**: Bottom
  Tuck 1, 2 and 3 at the nose come in as above. A clean consequence once RAILS reads the rule (one place:
  `railBandsOnTheBottom` / `railsOnTheBottom`); a surprise if it does not. Rule 1 holds either way: the marks are still worked
  out, now from the concave's mark. The Advanced Bottom Tuck 3 slider (±3/4") is overridden at the nose while a roll stands.
- **The centre card too, with the Slight Single Concave Entry**: its pull still stands 37% strong at the Longboard's centre
  (63% on the Mid-length, 75% on the Fish, 100% on the Shortboard, where it changes nothing because the rail is already short).
- **VOLUME's Estimated Volume, the rack and preset cards, the Summary, Overview Sheet and Full Sized Template volume line**:
  +0.38 to +1.41 L (one place, the litres' own sections, so they all agree; a clean consequence). VOLUME's estimator rows read
  the planed rails and would not move.
- **The 3D board and Export .brd File**: the new nose (clean; it is the same sections).
- **BOTTOM's section drawing and its ghost rail**: the new nose (clean). BOTTOM's own figures (depth, Off Rail, roll) do not move.
- **Opening a .brd**: as measured above, worse.

## Decisions for the founder

1. **Should the app draw a rolled Longboard nose this way at all, now that it will not bring the roll back from a file?**
   Recommendation: no, not for the import. Draw it this way only if you want the board itself to look like this (the picture):
   the rail starting at your mark and the roll as the blend. If you do, rule A is the one to build.
2. **Only above roll 0, or on every nose concave?** As asked, the rail jumps to the mark at the first 1/64" of roll (+0.4 L, or
   +1.4 L with a Slight Single Concave Entry, in one click) and goes back when the roll goes to 0. Your shaping order says the
   rail always starts at the mark when there is a nose concave, roll or not; doing that would redraw every saved board with a
   nose concave (those are live), which this spike was told not to do. Recommendation: if built, ease the pull in over the
   first 1/16" of roll rather than jumping, and say so on the card.
3. **Which line is "the rail starts": Bottom Tuck 3, or the sanded rail?** A puts Bottom Tuck 3 on the mark and the sanded rail
   rounds about 5/8" inside it; Af puts the sanded rail on the mark (tucks about 7/16" further out, 0.1 to 0.3 L more).
   Recommendation: Bottom Tuck 3 (A): it is the line you draw.
4. **When the mark is closer to the rail than Bottom Tuck 1** (it always is on the Longboard's Symmetrical nose: Bottom Tuck 1
   is about 1 3/4" there): scale all three bottom tucks together (A) or move only Bottom Tuck 3 and squeeze the others inside it
   (A2, a steeper lowest band)? Recommendation: scale together (A); the rail keeps its own proportions.
5. **When Off Rail is wider than the rail band** (the mark further in than the rail already starts: every Shortboard, Mid-length
   and Fish): nothing changes. Recommendation: keep it that way; the rule only ever pulls a rail out, never pushes one in.
6. **RAILS' Bottom Tuck 3 at the nose while a roll stands: locked, greyed or quietly overridden?** Recommendation: the nose card
   shows the pulled marks with a line saying they come from the nose concave's mark on BOTTOM, and the Advanced Bottom Tuck 3
   slider greys out at the nose until the roll is 0. Overriding it silently would leave a slider that does nothing.
7. **The Slight Single Concave Entry's pull reaches past the middle of a Longboard** (Deepest At 50 1/2" back, gone by 56 1/2"),
   so it also changes RAILS' centre card. Keep the pull on the roll's own along-the-board share, or stop it at the nose card?
   Recommendation: the roll's own share, so the rail and the roll always fade together; tell the shaper the centre card moved.
8. **An invented roll now moves the rail too.** When the import puts a small roll on a file that had none (4 of 12 roll-0
   Longboards today), the rule would also pull that board's nose rail. Recommendation: one more reason not to build this for
   the import.

## What a build would need

**Nothing in the import; this spike does not recommend building the rule for it.** It does not make the Longboard's roll
readable (correlation 0.05), it makes the Longboard's bottom and rails further off, it makes 92Log's rails worse, and it costs a
rolled Longboard 2 to 7 s more to open. The roll on a soft-railed Longboard nose is, in your words, part of the blend, and the
file cannot say how much of that blend was "roll". The preview's existing note (`railsFirstNote`) is still the honest thing to
show.

**If the founder wants rule A for how the board is drawn** (decision 1), a build would be:

- **BOTTOM:** nothing new on the page. The nose concave's card could say "the rail starts at this mark" under Rail Roll.
- **RAILS:** the nose (and with the Slight, centre) card's bottom tucks read the pull (`railsOnTheBottom` and
  `railBandsOnTheBottom` in `design.ts`, the same `s9RailStartLimiter` idea); the Bottom Tuck 3 slider greyed at the nose while a
  roll stands; GUIDE's Bottom Tuck 3 card and the nose-concave cards get a sentence (18-GUIDE-WORDS.md first, for the founder).
- **VOLUME, print and export:** nothing to code. They all read `boardSections`, where the pull lives (`volume.ts`, the
  rail section's tucks scaled before it is sampled), so the litres, 3D board, .brd, Summary and printed sheets follow together.
- **The import:** needs to draw opened boards under the rule (automatic) and accept that rolled Longboards open further off,
  or be kept from fitting a roll at all on a board read rails first; neither was measured as acceptable here.
- **Saved boards:** the Rail Roll (quick 261125-mf8) is **not live**: origin/main is 2f7db642 (fetched 2026-11-26), 22 commits
  behind local main, and none of them carries a Rail Roll. So no saved production board has a roll and none could redraw. Only
  boards saved on the development database while testing mf8 could.
- **Scope:** one quick task for the drawing (about 60 lines: the limiter in `bottom.ts`, the pull in `volume.ts`, wiring in
  `design.ts`), one for RAILS' card and slider, one for the GUIDE words.
- **Tests:** every board without a roll byte-identical (the 340-board identity check in `litres.mts` is the model); the pull
  fades with the roll's own share, no step along the board; Bottom Tuck 3 never further in than the mark while a roll stands;
  the Shortboard, Mid-length and Fish untouched; the Longboard litres figures above as golden values; the twelve files' digests.

### Picture

`rail-from-concave-mark.png`: three Longboards (Blended 3/16" with a 1/4" roll, Teardrop 3/16" with a 1/4" roll, Slight Single
Concave Entry 1/8" with a 1/8" roll) at 2", 8" and 16" back from the nose, the outer 6" of the finished half section the app draws
(the ring the litres, 3D board and .brd file carry): today (blue dashed), rule A (orange), the same board with no roll (grey
dotted). Upright lines: the concave's mark (black dotted) and where each finished rail leaves the bottom. Litres beside each.
