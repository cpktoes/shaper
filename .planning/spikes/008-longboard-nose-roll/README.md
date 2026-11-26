---
spike: 008
idea: brd-bottom-fit
name: longboard-nose-roll
type: comparison
validates: "Given the app's Longboard written to .brd with each nose concave 1/16\"–1/4\" deep and a Rail Roll 1/16\"–1/4\", when the import reads or fits the nose so a roll outside the concave's edge is seen even on a board read rails first, then most come back with their concave and roll, no real belly or roll-0 board gains an invented roll, and the founder's twelve files stay the same or closer"
verdict: INVALIDATED
related: [005, 006, 007]
tags: [brd-import, bottom, rails, nose, concave, rail-roll, longboard, round-trip, fit]
---

# Spike 008: why the Longboard's Rail Roll does not come back, and whether anything in the import can bring it back

**Verdict: INVALIDATED.** No way of reading or judging the nose brings the Longboard's Rail Roll back as a measurement. Two
trials raise the count of Longboards that come back "with a concave and a roll" from 15 to 26 and 27 of 48, but the roll they
come back with has nothing to do with the roll that was written: across the boards, the roll back and the roll written
are not related at all (a correlation of 0.00 to 0.11; on the Shortboard, Mid-length and Fish it is 0.97 to 0.99). Those same
two trials make the founder's testLB worse (1.45 / 0.21 to 2.08 / 0.26 mm, its roll lost), so they fail the "none worse" rule
too. Today's 15 are no better: a written 1/4" roll comes back on average as 1/64" (correlation -0.06). On the Longboard the
roll that comes back today is landed on, not read.

**The reason is the board, not the search.** The app's Longboard has a soft, rolled nose rail whose rail band starts about
5" in from the rail's edge (44% to 59% of the way out from the stringer). A nose concave's edge (its Off Rail, 1 5/8") and
the whole Rail Roll outside it sit underneath that rail. When BOTTOM and RAILS draw the board, the rail stands on the bottom
and each point of the rail is lifted by the roll less the higher up the rail it stands. So on the finished Longboard a 1/4"
Rail Roll moves the foam by at most 2.6 mm, right at the nose tip, about 1/2" in from the rail's edge and 7 to 9 mm up the
rail; 16" back it is 1.4 mm; a 1/16" roll is at most 0.6 mm. Averaged over the nose, a roll changes the file by 0.03 to
0.12 mm on the Longboard, against 0.16 to 0.64 mm on the Mid-length and Shortboard. And RAILS can draw that same finished
nose rail without any roll: with the written concave put back on the board that opens and the roll swept from 0 to 1/2",
refitting the rails each time, the finished nose's typical miss moves by only 0.02 to 0.07 mm across every roll, with no low
point at the written one. The roll is shaped into the rail, so the file cannot say how much of the rail's roll-under is "Rail Roll" and
how much is "rail".

What the spike did find, for the founder to weigh:

- **One trial makes the Longboard's nose concave itself come back truer, at the price of fewer rolls** (T3b, the founder's
  order: the bottom, then the rail, then the bottom read again out to where that rail really begins). Depth back within 1/16"
  on 32 of 48 (today 26), invented rolls 1 of 12 (today 4), and a real centre belly under a nose concave comes back
  (the mixed board with a 1/4" belly: today lost, now a 3/16" Continuous Belly). But concave-with-roll falls to 11, and testLB's
  widest bottom miss grows 1.45 to 1.52 mm (its typical improves 0.213 to 0.196), so it also fails "none worse" as it stands.
- **Reading the nose to nine-tenths on a rails-first board (idea 3 as asked) is the worst of all**: the bottom then claims the
  soft rail, the board flips to bottom first, and 46 of 48 come back with a stray centre or tail cut, mostly a 1/2" belly (spike 005's warning, measured).
- **Nothing here needs a RAILS or BOTTOM change, and nothing is recommended to build.** Bringing the Longboard's roll back
  would need a change to what a Rail Roll does on a board whose rail starts inside the concave's edge (the founder's say; see
  "What a build would need").

## What This Validates

Whether "Open a board file…" can bring back a nose concave with its Rail Roll on the app's own Longboard (the board the founder
says matters most: "Thats the most common to have a nose concave"), now that it does so on the Shortboard, Mid-length and
Fish (quick 261125-v2f). Four ways through, as the founder's brief named them, plus variants, each measured through the real
import (`brdLookFromBytes`) on 48 rolled Longboards and 26 Longboard controls, the founder's twelve files, and the other three
presets.

## How to Run

Everything ran from a detached scratch worktree at main f8cecca8 (removed afterwards); the app's own source was never changed.
Scripts, the trial code as one diff (`trial-code.diff`) and every raw output are in `spike-source.tar.gz`.

```bash
S=<a scratch folder>
git -C /Users/kontoes/Code/shaper worktree add --detach $S/wt f8cecca8
ln -s /Users/kontoes/Code/shaper/node_modules $S/wt/node_modules
tar -xzf spike-source.tar.gz -C $S && git -C $S/wt apply $S/spike-source/trial-code.diff
# With no S8_ switch set the trial code is today's code exactly (the 74 Longboards and the twelve files identical).
# The Longboard grid (74 boards) per trial, one after another (from the repo root):
$S/spike-source/scripts/run-trials.sh $S/wt "lb-base:" "lb-t1:S8_T1=1" "lb-t4:S8_JUDGE=nose" "lb-t3i:S8_T3=iter"
node $S/spike-source/scripts/table.mjs lb-base=Today lb-t4=T4 lb-t3i=T3b      # the README's Longboard table
node $S/spike-source/scripts/lbroll.mjs lb-base lb-t4                           # written roll against the roll back
# The other three presets (222 boards) for a trial; the twelve files; the plain boards:
ONLY= NOT=longboard $S/spike-source/scripts/run-trials.sh $S/wt "oth-t4:S8_JUDGE=nose"
$S/spike-source/scripts/run-twelve.sh $S/wt 3 "t12-base:" "t12-t4:S8_JUDGE=nose"
ROOT=$S/wt npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/scripts/plain.mts base
# The probes behind the Investigation Trail (each prints its own table):
ROOT=$S/wt CASES="longboard|Blended Nose Concave|d3|r4;longboard|none" npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/scripts/probe1.mts
ROOT=$S/wt PRESETS=longboard,midlength,shortboard npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/scripts/probe2.mts
ROOT=$S/wt CASES="longboard|Blended Nose Concave|d3|r4" npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/scripts/probe5.mts
git -C /Users/kontoes/Code/shaper worktree remove --force $S/wt
```

The switches (all in `trial-code.diff`; with none set, the code is today's):

| Switch | Trial |
|---|---|
| `S8_T1=1` | **T1**: the dish is also read on the nose sections at the usual nine-tenths width, for the retry's trigger and seed only; the polish and the choice score the bottom as today. |
| `S8_T1=2` | **T1b**: the same, but the wide reading replaces the narrow one whenever it shows a dish. |
| `S8_JUDGE=whole` | **T2**: on a board read rails first, every polished try of the nose retry, plus the closest nose concave with its roll swept 0 to 1/2" in 1/16" steps, is judged again on the finished board: the bottom lifted as the import lifts it, the rails refit from where they stood (as `brdFitLook` refits them), and the whole sections, bottom and rail together, measured on every section. The fit's own choice rules (fewest cuts, 0.25 mm, the 0.05 mm concave tie) then choose on that figure. |
| `S8_JUDGE=nose` | **T4**: T2 judged on the front half's sections only, so the tail's fixed 0.91 mm cannot hide the nose. |
| `S8_T3=wide` | **T3a**: on the rails-first try, when the nose read to nine-tenths shows a dish, the front half is read to nine-tenths (the rail let begin further out at the nose). |
| `S8_T3=iter` | **T3b**: on a board read rails first, once the polished bottom and the refit rails stand, the bottom is read again out to where those rails now begin; the grid, the polish and the nose retry run once more, the rails are refit, and the second pass is kept when the whole sections are no further off. |

The test boards are made exactly as spike 007's and quick v2f's grid made them (`grid.mts`, unchanged but for spike 008's log):
the app's own Longboard (`phase16Boards()`, the same board `lib/geometry/presets.ts` makes, 9', 108" as written), BOTTOM's
`startingCut` for each nose concave at the written Depth and Rail Roll, drawn with `buildBoardSurface`, written with the app's
own `brdText` and opened with `brdLookFromBytes`. The sample files are the founder's `~/Downloads/*.brd`, read where they are
(the `_decrypt` copies skipped, test-curves-v2 treated as quadtesting).

## Investigation Trail

**1. Baseline.** The trial code with every switch off opened all 74 Longboards exactly as quick v2f's own after-run
(`same.mjs v2f-after lb-base`: 0 of 74 differ) and all twelve files by digest as v2f recorded them (0 of 12 differ). Today:
15 of 48 rolled Longboards back as a nose concave with a roll, 5 within 1/16", 4 of 12 roll-0 boards with an invented roll,
0 false concaves.

**2. Why the Longboard is read rails first** (`probe1.mts`, `results/probe1.txt`). The import always tries the bottom first:
it reads each section's bottom from the stringer out to nine-tenths of the way to the rail and fits BOTTOM's cuts to that.
On the Longboard that reading runs 4" to 5" into the rail itself, because the Longboard's nose rail is a soft, Symmetrical,
rolled rail whose band begins about 5" in from the rail's edge:

| 108" Longboard, Blended Nose Concave 3/16" with a 1/4" roll | 47" from the nose | 32" | 16" | 8.6" | 2" |
|---|---|---|---|---|---|
| Half-width (to the rail's edge) | 11.24" | 11.01" | 9.89" | 8.47" | 5.08" |
| Where the written rail leaves the bottom | 5.00" (44%) | 5.23" (48%) | 5.31" (54%) | 4.90" (58%) | 2.97" (58%) |
| The concave's edge (Off Rail 1 5/8"): the roll lives outside this | 9.62" | 9.38" | 8.26" | 6.85" | 3.46" |
| Bottom-first reading width (nine-tenths) | 10.12" | 9.91" | 8.90" | 7.62" | 4.57" |
| Rails-first reading width (where rails fitted on a flat bottom begin) | 4.92" | 5.73" | 6.39" | 5.94" | 3.50" |

Read to nine-tenths, the soft rail looks like a deep belly: the bottom-first answer is a Rolled Belly Entry 1/16" over a
Continuous Belly 7/16", 4.18 mm off on the bottom, and the whole section (bottom and rail together) is 6.2 mm off. That is
over the 3 mm, with a belly in it, that sets off the rails-first try: rails fitted on a flat bottom, the bottom read only out
to where those rails begin, then the rails polished on that bottom. Whole sections 5.01 mm, 1.2 mm closer, so rails first
wins. The plain Longboard with no cut at all goes the same way (bottom first: a Rolled Belly 3/16" over a 1/2" Tri-Plane
Hull, whole 5.13 mm; rails first: flat, flat, flat, 4.98 mm). This is the import doing the right thing: the Longboard's bottom
really does end where its rail begins, about halfway out.

**In shaper's terms:** on this board the concave's edge mark and the whole Rail Roll are under the rail. The founder's order
is "shape the bottom contour in first (mark how close the nose concave comes to the rail), then shape the rail and blend them".
On the Longboard the rail that is then shaped starts 2" to 5" inside the concave's mark, so the rail takes away the
concave's outer part and almost all of the roll. What survives of the roll in the finished foam is a slightly more tucked-under
lower rail.

**3. How much of the roll survives in the file** (`probe2.mts`, `probe3.mts`; `results/probe2.txt`, `results/probe3-*.txt`).
Each board written twice, with the roll and without it, and the two files compared section by section over the nose:

| Board, Blended Nose Concave | Roll 1/16" (1.6 mm): biggest change / average | Roll 1/8" (3.2 mm) | Roll 1/4" (6.4 mm) |
|---|---|---|---|
| Longboard | 0.62 / 0.03 mm | 1.24 / 0.06 mm | 2.49 / 0.12 mm |
| Mid-length | 1.28 / 0.16 mm | 2.56 / 0.26 mm | 5.08 / 0.53 mm |
| Shortboard | 1.35 / 0.17 mm | 2.68 / 0.35 mm | 5.15 / 0.64 mm |

Where it sits, the 1/4" roll at 16" from the nose: on the Longboard it moves the foam 1.36 mm, 0.54" in from the rail's edge,
where the rail already stands 9.2 mm up; on the Mid-length 3.7 mm, 0.29" in, on the bottom itself. On the Longboard nothing
of the roll is left behind about 32" from the nose. So the roll's trace on a Longboard is a fifth of what it is on the other boards,
and it is on the rail, outside every bottom reading width (which stops 3" to 4" in from the rail).

**4. The oracle: can the finished board tell the written roll at all?** (`probe4.mts`, `probe5.mts`; `results/probe4.txt`,
`results/probe5.txt`). After the real import, the written nose concave (its true depth, Off Rail and stations) was put on the
board that opens, the roll swept 0 to 1/2", the rails refit each time (from where they stood, and afresh), and three judges
read over the nose half: the whole section both ways, RAILS' own rail region, and the underside alone.

| Longboard Blended 3/16", written roll 1/4", written concave on | roll 0 | 1/16" | 1/8" | 3/16" | **1/4" (written)** | 3/8" | 1/2" |
|---|---|---|---|---|---|---|---|
| Whole nose sections, typical mm (rails refit from where they stood) | 0.612 | 0.605 | 0.600 | 0.601 | **0.608** | 0.596 | 0.626 |
| Rail region, typical mm | 0.915 | 0.911 | 0.903 | 0.903 | **0.910** | 0.880 | 0.913 |
| Whole nose sections, rails refit afresh | 0.645 | 0.630 | 0.611 | 0.621 | **0.616** | 0.643 | 0.679 |

Flat to within a few hundredths of a millimetre from no roll to 3/8", with the low point somewhere else each time (on the
board written with 1/8" the lowest is at 1/4" one way and 1/16" the other). The noise of refitting the rails is bigger than the
roll's whole signal. Taken with the fitted (too shallow) concave instead of the written one, every roll only makes the nose
further off. The widest rails miss, 5.0 mm, is at the very nose tip's rail edge on every Longboard, roll or none, and no
nose choice moves it.

**5. Today's 15 are not measurements either** (`lbroll.mjs`). Per written roll, the average roll back on the Longboard:

| Written roll | 1/16" | 1/8" | 3/16" | 1/4" | Correlation, written against back |
|---|---|---|---|---|---|
| Longboard, today | 3.4/64" (5 of 12 with a roll) | 1.6/64" (4 of 12) | 3.3/64" (4 of 12) | 0.8/64" (2 of 12) | -0.06 |
| Shortboard / Mid-length / Fish, today | 3.0–3.3/64" (all) | 6.9–7.7/64" | 10.3–11.4/64" | 14.9–15.2/64" | 0.97 to 0.99 |

The Longboard rolls that come back today are about 1/16" whatever was written, roll-0 boards included: near the nose tip the
narrow reading width just reaches past the concave's edge, where the written rail is already climbing, and the polish stands a
small roll in for that climb.

**6. Each trial, head to head** (the Longboard table under Results).

- **T1, the dish read out to nine-tenths for the decision alone.** Read that wide, every rolled Longboard shows a dish, and so
  does every roll-0 Longboard with a concave: the "turn" it reads is the written rail climbing, not the roll (its seed is
  mostly the largest roll there is, 1/2", with Off Rail at its 6" maximum). It sets off the retry on 26 more rolled boards,
  and the retry, still scored on the narrow reading that cannot see the roll, keeps today's answer on 24 of them: 15 → 16.
  Identical on all twelve files.
- **T2 and T4, the roll judged with the rails refit (the founder's shaping order).** 15 → 27 and 26, invented rolls 4 → 2 and 1.
  But the roll they choose is the lowest wiggle in step 4's flat line: a written 1/4" Teardrop comes back with 5/16", a
  written 1/8" Slight Single Concave Entry with 3/8", and many come back with none (correlation 0.00 and 0.11). On twelve
  boards the judge drops the small roll the bottom reading had stood in for the rail's climb near the tip, and the bottom's
  widest miss grows (0.91 to as much as 2.83 mm). On testLB it loses the roll spike 005 found there (bottom 1.45 / 0.21 →
  2.08 / 0.26 mm, rails 4.98 / 0.72 → 5.01 / 0.80; step 7). Guarded so a choice may not make the bottom further off (replayed from T4's
  own log, `replay-t4g.mjs`): 18 of 48, 7 within 1/16", correlation 0.09. Still not a measurement.
- **T3a, the nose read to nine-tenths on the rails-first try (the rail let begin further out).** The bottom reading then takes
  4" of soft rail for bottom, the rails-first bottom gets worse than the bottom-first one, and 47 of 48 boards flip to bottom
  first with a 1/2" Continuous Belly or Tri-Plane Hull: 30 back "with a roll", none clean, 46 with a stray cut, bottom 1.07 →
  2.43 mm, invented rolls 4 → 9. testLB gets a belly and a vee (typical 0.21 → 0.42). This is spike 005's warning, measured on
  the Longboard: reading the bottom past where our rail begins makes it worse.
- **T3b, the bottom read again out to where the finished rails begin.** The flat-bottom rails begin up to an inch further out
  than the written rail does (6.39" against 5.31" at 16" from the nose), so the rails-first reading takes an inch of climbing
  rail for bottom and comes back with a concave about half as deep as written (3/16" written, 7/64" back). Once the rails stand
  on the fitted concave, they begin within a quarter inch of where the written rail does (4.6" to 5.5"). Reading the bottom
  again there: depth within 1/16" 26 → 32, invented rolls 4 → 1, roll-0 boards come back exactly as written (Blended 1/4", Teardrop
  3/16"), and the mixed board with a real 1/4" centre belly gets its belly back (3/16"). But it also stops reading the sliver of
  climbing rail near the tip that the small rolls stood in for, so concave-with-roll falls 15 → 11. On testLB the widest
  bottom miss grows 1.45 → 1.52 mm (typical 0.213 → 0.196, rails 0.72 → 0.71).
- **T3a and T3b together:** as T3a.

**7. The finished-section judge on the founder's longboard.** testLB is the one file of the twelve read rails first. Its
retry today renames its Teardrop 24/64" into a Blended Nose Concave 24/64" with a 7/64" roll because the bottom reading sees
the roll (its concave is deepest 57–62% out and rolls up inside the reading, spike 005): on the bottom that is 0.68 mm closer
(1.67 against 2.34 mm, widest plus typical). Judged on the finished nose instead, with the rails refit, it is only 0.14 mm
closer, because the refit rails take up the roll there too; that is short of the 0.25 mm a renamed nose must earn, so T2 and
T4 keep the Teardrop with no roll. The finished-section judge, the one that "should" see a roll the rail covers, is the judge
that loses a real one.

## Results

### The Longboard grid, per trial

48 rolled Longboards (three nose concaves × Depth 1/16"–1/4" × Rail Roll 1/16"–1/4"); 12 roll-0 Longboards (the same concaves,
no roll); 12 with a belly and no nose concave (Rolled Belly Entry, centre Continuous Belly, both, Reverse Vee Nose, Tri-Plane
Hull); 2 with a Blended Nose Concave over a real centre belly. Bottom and rails figures are the rolled boards' mean widest /
typical, mm. "Correlation" is the written roll against the roll back, over the boards that come back with one (1 = the roll
is read; 0 = it is not).

| Trial | Back as a concave with a roll | Roll and depth within 1/16" | Depth within 1/16" | Correlation | No other cut | Stray centre or tail cut | Bottom | Rails | Read rails first | Invented rolls (roll 0) | False concaves |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Today | 15 of 48 | 5 | 26 | -0.06 | 12 | 6 | 1.07 / 0.12 | 4.99 / 0.67 | 43 of 48 | 4 of 12 | 0 of 12 |
| T1 dish to nine-tenths | 16 | 5 | 26 | 0.04 | 13 | 6 | 1.07 / 0.12 | 4.99 / 0.67 | 43 | 4 | 0 |
| T1b (wide replaces narrow) | 16 | 3 | 25 | 0.10 | 13 | 6 | 1.07 / 0.12 | 4.99 / 0.67 | 43 | 4 | 0 |
| T2 roll + rails, whole board | 27 | 9 | 26 | 0.00 | 23 | 6 | 1.14 / 0.12 | 4.98 / 0.67 | 43 | 2 | 0 |
| T4 roll + rails, nose only | 26 | 9 | 26 | 0.11 | 22 | 6 | 1.14 / 0.12 | 4.98 / 0.67 | 43 | 1 | 0 |
| T4 guarded (replayed) | 18 | 7 | — | 0.09 | — | — | — | — | 43 | 2 | 0 |
| T3a nose read wide | 30 | 6 | 16 | 0.11 | 0 | 46 | 2.43 / 0.46 | 5.29 / 0.91 | 1 | 9 | 0 |
| T3b bottom read again | 11 | 4 | 32 | -0.13 | 8 | 5 | 1.07 / 0.12 | 4.98 / 0.67 | 43 | 1 | 0 |
| T3a + T3b | 30 | 6 | 16 | 0.11 | 0 | 45 | 2.41 / 0.46 | 5.29 / 0.90 | 1 | 9 | 0 |

Boards that differ from today (of 74): T1 3, T1b 12, T2 29, T4 27, T3a 56, T3b 34, T3a+T3b 62 (`same.mjs`). Every
board's cuts and figures are in `results/lb-*.jsonl`; `results/realdiff-lb-*.txt` lists each control that moved.

### The controls

- **False concaves (12 Longboards with a belly and no nose concave): 0 in every trial.** None is even tried by T1, T2 or T4.
- **Invented rolls (12 roll-0 Longboards with a nose concave): today 4.** T1 4, T2 2, T4 1, T3b 1 — fewer, but T2 and T4 get
  there by dropping a roll whatever was written, which is the same thing that costs the rolled boards theirs. T3a 9.
- **The mixed boards** (a Blended Nose Concave 1/8" over a real 1/8" or 1/4" centre belly): today both lose their belly. T2 and
  T4 change only the nose (one loses its roll, bottom 0.82 → 1.45 mm); T3b brings the 1/4" belly back as a 3/16" Continuous Belly (bottom 1.37 → 0.74 mm).
- **The plain Longboard** (no cut at all): identical under T1, T1b, T2, T4 and T3a (by digest; Flat · Flat · Flat, 0.91 / 0.05 mm, rails 4.97 / 0.65, read rails
  first). Under T3b the same cuts and widest, typical 0.049 → 0.048 mm. The plain Shortboard, Mid-length and Fish are identical
  under every trial (`results/plain-*.json`).

### The other three presets (Shortboard, Mid-length, Fish: 222 boards)

Today (quick v2f's after-run, which the trial code with no switch reproduces): Shortboard 48 of 48 back with their concave
and roll, Mid-length 47, Fish 48; 0 invented rolls and 0 false concaves on all three. Only two of these 144 rolled boards are
read rails first, so T2, T3 and T4 can only reach those two.

| Trial (222 boards each) | Boards that differ from today | Shortboard / Mid-length / Fish back with a roll | What changed |
|---|---|---|---|
| T1 | 0 | 48 / 47 / 48 | nothing |
| T4 | 1 | 48 / 47 / 48 | **worse**: the Mid-length, Slight Single Concave Entry 3/16" with a 1/4" roll (read rails first): roll 15/64" → 5/16" and bottom 0.36 / 0.05 → 1.44 / 0.12 mm |
| T3b | 1 | 48 / 47 / 48 | **closer**: the Fish, Slight Single Concave Entry 1/4" with a 1/4" roll (read rails first): a stray 1/16" Rolled Vee in the tail is gone, roll 3/16" → 15/64", bottom 0.52 / 0.11 → 0.34 / 0.06 mm |

T2 shares T4's code path and judge on these boards and was not re-run on them; T3a was not run on them (it fails on the
Longboard and on testLB). So no trial drops the other three presets below 48 / 47 / 48, but T4 makes one of them much worse.

### The founder's twelve files

Widest / typical bottom miss and widest / typical rails miss in mm, through `brdLookFromBytes`; "identical" means one digest
over the fitted cuts, every measured section value and the fitted rails matched today's. Today equals quick v2f's after-run on
all twelve, by digest.

| File | Read | Today: bottom · rails · cuts | T1 | T2 / T4 | T3a | T3b |
|---|---|---|---|---|---|---|
| 6'10-Widepoint-Fwd-Egg | bottom first | 0.77 / 0.21 · 1.67 / 0.49 · Flat · Flat · Panel Vee 6/64" | identical | identical | identical | identical |
| 6'2-Round-Tail---Double-Concave | bottom first | 0.55 / 0.17 · 2.08 / 0.42 · Teardrop 4/64" · Deep Single 8/64" · Double Concave Exit 8/64" | identical | identical | identical | identical |
| 6'4-Double-Wing-Groveler | bottom first | 0.54 / 0.12 · 1.20 / 0.43 · Flat · Deep Single 7/64" · Flat | identical | identical | identical | identical |
| 92Log | bottom first | 1.28 / 0.38 · 1.64 / 0.45 · Blended 4/64", Rail Roll 11/64" · Continuous Belly 32/64" · Rolled Vee 27/64" | identical | identical | identical | identical |
| Fryer-5'7-Squash-Flyer-Twin | bottom first | 0.49 / 0.21 · 0.93 / 0.30 · Blended 4/64" · Deep Single 12/64" · Double Concave Exit 7/64" | identical | identical | identical | identical |
| JFS_BigTwin | bottom first | 0.70 / 0.32 · 1.42 / 0.35 · Flat · Flat · Panel Vee 7/64" | identical | identical | identical | identical |
| SAtri | bottom first | 0.40 / 0.06 · 2.52 / 0.32 · Flat · Flat · Spiral Vee 8/64" | identical | identical | identical | identical |
| SAtwin | bottom first | 0.39 / 0.06 · 2.52 / 0.32 · Flat · Flat · Spiral Vee 8/64" | identical | identical | identical | identical |
| Scoop-Noserider | bottom first | 1.01 / 0.37 · 2.20 / 0.68 · Blended 22/64", Rail Roll 19/64" · Continuous Belly 20/64" · Panel Vee 4/64" | identical | identical | identical | identical |
| mid | bottom first | 0.56 / 0.09 · 1.76 / 0.42 · Blended 32/64" · Flat · Panel Vee 12/64" | identical | identical | identical | identical |
| quadtesting | bottom first | 6.43 / 0.82 · 55.49 / 2.08 · Flat · Continuous Belly 32/64" · Panel Vee 32/64" | identical | identical | identical | identical |
| **testLB** | **rails first** | 1.45 / 0.21 · 4.98 / 0.72 · Blended 24/64", Rail Roll 7/64" · Flat · Flat | identical | **worse**: 2.08 / 0.26 · 5.01 / 0.80 · Teardrop 24/64", no roll | **worse**: 1.46 / 0.42 · 5.09 / 0.83 · Teardrop 28/64", roll 14/64" · Continuous Belly 32/64" · Rolled Vee 15/64" | **widest worse**: 1.52 / 0.20 · 4.99 / 0.71 · Blended 25/64", roll 6/64" |

(T1b: testLB typical 0.213 → 0.212 mm, rails 4.98 → 4.99; the other eleven identical. T3a + T3b: testLB 2.46 / 0.35, worse.)

**The three real longboards.** 92Log and Scoop-Noserider are read bottom first (their rails begin near the rail's edge), so
only T1 can reach them, and T1 leaves them identical: their nose dish already shows on the narrow reading and they are retried
today. testLB is the only file read rails first; it is the founder's own version of exactly this problem, and every trial that
changes it makes it worse on the widest figure. Its roll today (7/64") comes from its concave rolling up inside the reading
width, which the trials that look past the reading width lose.

### Open times

Seconds to open through `brdLookFromBytes`, fastest of 3, every trial timed back to back with today in one process (the
trial code reads its switches on every call), `time8.mts`. The machine was shared with another project's test run all
evening: the grid runs above saw load averages of 20 to 120, so their own seconds are not used. The table below is the
quietest pass, load 5 to 14 (`results/times-2.log`); T2 costs the same as T4 (same code path) and was not timed separately.

| Board or file | Today | T1 | T4 | T3b |
|---|---|---|---|---|
| Longboard, Blended 3/16", roll 1/4" | 5.71 | 5.83 (+0.12) | 8.65 (+2.94) | 7.14 (+1.43) |
| Longboard, Teardrop 3/16", roll 1/4" | 3.63 | 4.02 (+0.39) | 4.91 (+1.28) | 4.34 (+0.71) |
| Longboard, Slight 1/8", roll 1/8" | 3.32 | 3.47 (+0.15) | 4.26 (+0.94) | 3.84 (+0.52) |
| Longboard, plain | 2.80 | 2.77 | 2.83 | 3.09 (+0.29) |
| 92Log | 3.11 | 3.12 | 3.08 | 3.07 |
| Scoop-Noserider | 3.90 | 3.80 | 3.77 | 3.76 |
| testLB | 3.75 | 3.93 (+0.18) | 5.43 (+1.68) | **7.17 (+3.42)** |

The other nine files were timed in the earlier pass (load 6 to 19, `results/times-files.log`): none of the trials runs any
new work on them (all are read bottom first, and T1's wide reading shows nothing new; every digest is identical), and their
times moved by up to ±1.6 s in both directions from one mode to the next (SAtri 1.66 → 3.26, SAtwin 3.30 → 1.32), which is
the machine, not the code. On a rails-first Longboard, T4 costs about 1 to 3 s more (thirteen rail refits) and T3b 0.3 to
1.4 s more (a second bottom fit); on testLB T3b is 3.4 s more, past the founder's 2.5 s.

### Picture

`longboard-nose.png`: three Longboards (Blended 3/16" with a 1/4" roll, Teardrop 3/16" with a 1/4" roll, Slight Single
Concave Entry 1/8" with a 1/8" roll), each at about 2", 8" and 16" back from the nose tip, the outer 4" of the half section,
bottom and rail together: the written file (black), the same board written with no roll (grey, dotted), what opens today
(blue, dashed) and with T4 (orange). The roll's whole trace is the gap between black and grey: a thin sliver low on the rail
near the tip. Today's and T4's finished sections lie on the written one about equally well, whether T4 gives the board no roll
(the Blended, where it keeps today's), 5/16" (the Teardrop) or 3/8" (the Slight, where the orange rail at the tip visibly
climbs away from the file). The dotted marks show where the bottom reading stops and where the written concave's edge is.

## What a build would need

**Nothing in the import, from this spike.** None of the trials passes the founder's three tests together (most back with the
concave and roll, no invented rolls, none of the twelve files worse), and the two that raise the count do it with a roll that
is not read from the file. Shipping either would put a random roll on Longboard noses, and lose testLB's real one.

**What would make the Longboard's roll readable is a change to the board, which is the founder's call** (BOTTOM and RAILS,
not measured here beyond the trace in step 3). Today a Rail Roll on a nose concave is drawn as a lift on the bottom, and on a
board whose rail starts inside the concave's edge most of that lift is shaped away by the rail. Two directions, both of which
would change how a saved Longboard with a roll looks and its litres:

- **The rail starts at the concave's edge where a nose concave has a roll** (spike 006's "Blend to Concave"): RAILS' nose rail
  band begins at Off Rail's mark instead of its own Bottom Tuck 3, so the roll is the blend from the concave's mark to the
  rail, in the founder's order. Then the roll is the whole shape outside the mark and the file carries it.
- **The roll lifts the rail in full** rather than less the higher the rail stands, so it survives the rail.

Either would need its own spike: it changes the written Longboards, and whether RAILS could still mimic the roll would have to
be measured again.

**What could be built without the founder's say, if he wants the Longboard's concave truer rather than its roll:** T3b
(read the bottom again out to where the finished rails begin) brings the Longboard's nose-concave depth back within 1/16" on
32 of 48 (today 26), cuts invented rolls to 1 of 12, and finds a real centre belly the import misses today. It costs a second
bottom fit on every board read rails first (0.3 to 1.4 s more on the app's Longboards, 3.4 s more on testLB, past the founder's 2.5 s), shows fewer rolls (11 of 48), and moves testLB's widest bottom miss
1.45 → 1.52 mm (its typical 0.213 → 0.196), so as measured it breaks the "none worse" rule and is not recommended as it stands.

**What the founder would see if he asked "why didn't my Longboard's roll come back"**, in words a preview could carry: "This
board's rail rolls in from well off the rail, past where the nose concave stops, so the Rail Roll is part of the rail here and
the file cannot tell the two apart." The preview already says the first half of this (`railsFirstNote`).
