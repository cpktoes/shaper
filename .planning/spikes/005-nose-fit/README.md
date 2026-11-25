---
spike: 005
idea: brd-bottom-fit
name: nose-fit
type: standard
validates: "Given 92Log, Scoop-Noserider and testLB, whose widest .brd bottom miss sits in the nose, when the import gets the one change the nose needs, then their widest bottom miss drops well below today's (1.58 / 1.18 / 2.08 mm) and no file gets worse"
verdict: PARTIAL
related: [003, 004]
tags: [brd-import, bottom, nose, concave, fit]
---

# Spike 005: what the nose needs for "Open a board file…" to match 92Log, Scoop-Noserider and testLB

**Verdict: PARTIAL.** One change lowers the widest bottom miss on all three files and makes none of the twelve worse, but
not by as much as hoped, and none of the three comes under 1 mm on it alone:

| | Today | With an Edge Roll on a nose concave | And a Rolled Vee offered to a flat tail |
|---|---|---|---|
| 92Log | 1.58 / 0.44 | 1.28 / 0.38 | 1.28 / 0.38 |
| Scoop-Noserider | 1.18 / 0.36 | 1.01 / 0.37 | 1.01 / 0.37 |
| testLB | 2.08 / 0.26 | 1.45 / 0.21 | 1.00 / 0.16 |

(Widest / typical bottom miss in mm, through the real import. The other nine files open exactly as today.)

The three noses turned out to be three different problems that share one feature. On every nose section of all three
files the bottom **turns up toward the rail well inside the rail itself**, 1.3" to 4.6" in, outside the concave's edge.
BOTTOM has one cut a section, and a concave leaves the bottom dead level from its edge out to the rail, so nothing draws
that turned-up edge. Taken one section at a time, a concave plus a roll outside it draws every nose section of the three
files within 0.62 mm (most within 0.3); on the sections that hold each file's widest miss a concave alone, of any
shape, leaves 0.55 to 2.08 mm.

Through the whole import the gain is smaller than that, for two reasons measured below: the score is the widest gap
anywhere on the board, and on 92Log and Scoop the nose shares that widest gap with the tail's belly (spike 003's
subject); and part of what moved 92Log and Scoop needs no new control at all (the import never tries a shallow nose
concave on a board whose nose it first read as flat).

## What This Validates

Where the widest bottom miss on the three files really sits, what today's fit puts in each nose and why it cannot follow
the file, and which single change to the import or to BOTTOM closes the most of it without making any of the twelve
sample files worse or slow to open.

## How to Run

Everything ran from a detached scratch worktree (removed afterwards); the app's own source was never changed. The
scripts, the trial code as one diff, and the raw outputs are in `spike-source.tar.gz`.

```bash
S=<a scratch folder>
git -C /Users/kontoes/Code/shaper worktree add --detach $S/wt HEAD        # HEAD was 2f7db642
ln -s /Users/kontoes/Code/shaper/node_modules $S/wt/node_modules
tar -xzf spike-source.tar.gz -C $S && git -C $S/wt apply $S/spike-source/trial-code.diff
# from the repo root; ROOT picks the checkout, OUT the result file. With no SPIKE_ switch set the code is today's.
OUT=before.json npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/measure.mts
SPIKE_STARTS=nose SPIKE_POLISH=roll-nose SPIKE_GATE_MM=1 ROOT=$S/wt OUT=roll.json npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/measure.mts
node $S/spike-source/cmp.mjs before.json roll.json x      # before and after, file by file
npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/diag.mts        # each nose section, the file's whole half against ours
npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/nosefit.mts     # what each nose section could reach on its own
git -C /Users/kontoes/Code/shaper worktree remove --force $S/wt
```

Switches read by the trial code:

- `SPIKE_STARTS=nose` (the nose tried afresh after the polish) or `nose,tail` (and a Rolled Vee offered to a flat tail).
- `SPIKE_GATE_MM=1` (those restarts only on a file whose widest miss is over 1 mm).
- `SPIKE_POLISH=` any of `roll-nose`, `shape-nose`, `shape-single`, `smooth-nose`, `smooth-single`, `smooth-all`.
- `SPIKE_SHAPE=power` or `edge` (the across-curve family for `shape-`).
- `SPIKE_READ=rail`, `railmeasure` or `window` (how the bottom is read near the rail).
- `SPIKE_ROLL=grid` (the roll in the name choice too), `SPIKE_DEBUG=1` or `2`.

The sample files are the founder's `~/Downloads/*.brd`, read only (the `_decrypt` copies skipped, test-curves-v2 treated
as quadtesting).

## Investigation Trail

**1. Baseline.** `measure.mts` through `brdLookFromBytes` on main (which now holds quick 261124-x9h) reproduces spike 004's
after-table to the hundredth: 92Log 1.58 / 0.44, Scoop 1.18 / 0.36, testLB 2.08 / 0.26, SAtwin 0.39 / 0.06, and the other
eight as recorded. With the trial code patched in and every switch off, every stored number and every measured section
value on all twelve files is identical to main.

**2. Where each miss really sits** (`diag.mts`, `whole.mts`; `results/diag-before.txt`, `results/whole-before-v.txt`;
picture `nose-where.png`). Each nose section's whole half, the file's against ours as it opens (BOTTOM's cuts with the
fitted rail standing on them), not only the part the bottom is scored on. A miss here is always measured against the
height at the stringer, so the rocker cannot be in it; and the file's and our half-widths agree within 0.1" on every
section named below except testLB's last two (0.14" and 0.19" narrow, 2" and 1" from the nose tip).

- **92Log** (109.5" long; the fit reads four sections).
  - *94.5" from the tail (15" back from the nose): 1.58 mm, 7.3" out from the stringer, 1.9" in from the rail.* The file's
    bottom is level within 0.2 mm out to 4.6", then dips to 1.63 mm below the stringer at 7.1" out (78% of the way), then
    turns up into the rail. That is a real shape: a concave about 1/16" deep with a wide flat middle. Our rail begins at
    the same place (79%), so this is the bottom, not the rail and not the reading width. Today's fit leaves the nose flat.
  - *106.9" (2.6" from the nose tip): 1.25 mm at the very edge of the reading width, 4.4" out.* Here the file's rail has
    already turned up inside the reading width, and so has ours: our finished section is within 0.28 mm of the file
    right across. The bottom miss is scored against the cuts alone, so the 1.25 is the reading, not the board.
  - The nose is not alone at the top: the tail section (15.7") is also 1.58 mm and the wide point (51.5") 1.40 mm, both at
    the edge of the reading width, where the file's belly rolls later and harder than ours (spike 003).
- **Scoop-Noserider** (110"; five sections). Three sections tie at 1.18 mm:
  - *73.7" (36" back from the nose), at the edge of the reading width, 10.2" out.* The file's concave bottoms out 8.7" out
    (77% of the way, 2.6" in from the rail) and climbs back to the stringer's height by 10.2". Ours is still going down
    there. Our rail does not begin until past the reading width, so this is a real turned-up edge our bottom cannot draw.
  - *97.7" (12" from the nose), 7.9" out.* The file's concave deepens steadily to 9.9 mm at 7.85" out (86%) and then
    turns up sharply; ours is a bell, 8.6 mm at the same place and already flattening. 85.7" is the same at 0.96 mm.
  - *12.0", in the tail, at the edge of the reading width.* The belly again. So Scoop's widest miss is shared between the
    nose and the tail's belly, and nothing done to the nose alone can take it below what the belly allows.
- **testLB** (108"; 31 sections). This file is read rails first, so each section's reading width stops where our rail was
  first found to begin: 45% to 81% of the way out in the nose, about 30% in the tail.
  - *96.0", 102.5" and 106.0": 2.08 mm each, all at the edge of the reading width* (7.5", 5.9" and 3.8" out); 93.0" is 1.76
    and 99.4" 1.73 the same way. The file's nose concave is deepest 57% to 62% of the way out, 3.6" to 4.6" in from the
    rail, and from there the bottom rolls up to the rail. Ours stays level from the concave's edge.
  - *About a quarter of that 2.08 is the reading, not the board.* After the reading widths were set, the rail was fitted
    again and its inner edge moved about an inch further in (to 64% to 71% of the way). So across the last inch of each
    reading width our rail is already climbing with the file, but the bottom miss is scored against the cuts alone. At
    96.0", 7.5" out, the board that opens is 0.03 mm from the file where the bottom miss says 2.08. Scored against the
    finished section the nose's widest is 1.62 mm (99.4", 4.9" out), and the whole file reads 1.62 / 0.25.
  - Behind the nose, the nine tail sections are 1.17 to 1.45 mm: a roll in the tail with no cut on it, hidden until now
    behind the nose (spike 003 found it lowers only the typical figure while the nose pins the widest).

**3. What the fit puts in each nose today, and why it cannot follow** (`results/before.log`, `dump.mjs`).

| File | Nose cut today | Its numbers |
|---|---|---|
| 92Log | Flat Entry | none |
| Scoop-Noserider | Blended Nose Concave 11/32" | Off Rail 15/16", Start at the nose tip, Deepest At 16 1/2" from the nose, End 43" from the nose, Smoothness 70 |
| testLB | Teardrop Nose Concave 3/8" | Off Rail 3 9/16", Start 4 3/4", Deepest At 17 1/2", End 42 3/4" from the nose, Smoothness 70 |

Three reasons, each measured:

- **One cut a section, and a concave is level outside its edge.** A single concave takes foam from the stringer out to
  its edge (the rail less Off Rail) and nothing beyond. The files all rise again outside that edge. A belly or a vee is the
  cut that lifts toward the rail, but the nose can hold only one of the two, and on 92Log and Scoop the centre cut is
  already the board's belly, with its own Depth and flat panel.
- **The concave's across-curve.** Ours runs between a straight line (Smoothness 0) and a bell that flattens at both the
  stringer and the edge (100). Scoop's deepens like a parabola and meets its edge at a crisp corner. Smoothness is not
  moved by the import, and no value of it draws that.
- **The search.** On 92Log the nose was read flat at the first step and never revisited: a nose cut has to earn 0.25 mm
  on its own, one swap at a time, and while the belly sections also sit at 1.4 to 1.6 mm it cannot.

`nosefit.mts` and `nosefit2.mts` put numbers on the first two, off line: each nose section fitted on its own with every
number free, so these are the best any cut of that kind could do there, not what the import reaches (widest / typical mm).

| Section | In the import today | One concave, today's curve | One concave, a power curve | Concave + a roll from its own edge to the rail | Concave + a roll with its own inner edge |
|---|---|---|---|---|---|
| 92Log 94.5" | 1.58 | 1.09 / 0.37 | 1.18 / 0.27 | 0.57 / 0.32 | 0.52 / 0.30 |
| 92Log 106.9" | 1.25 | 1.25 / 0.22 | 1.25 / 0.22 | 0.28 / 0.15 | 0.28 / 0.15 |
| Scoop 73.7" | 1.18 | 1.13 / 0.34 | 1.13 / 0.31 | 0.32 / 0.15 | 0.19 / 0.09 |
| Scoop 85.7" | 0.96 | 0.72 / 0.38 | 0.72 / 0.14 | 0.72 / 0.35 | 0.42 / 0.21 |
| Scoop 97.7" | 1.18 | 0.70 / 0.25 | 0.55 / 0.09 | 0.70 / 0.25 | 0.62 / 0.27 |
| testLB 93.0" | 1.76 | 1.07 / 0.33 | 1.07 / 0.31 | 0.19 / 0.06 | 0.11 / 0.05 |
| testLB 96.0" | 2.08 | 1.57 / 0.52 | 1.57 / 0.48 | 0.20 / 0.07 | 0.09 / 0.04 |
| testLB 99.4" | 1.73 | 1.69 / 0.61 | 1.69 / 0.64 | 0.11 / 0.05 | 0.07 / 0.04 |
| testLB 102.5" | 2.08 | 2.00 / 0.63 | 2.00 / 0.63 | 0.11 / 0.06 | 0.07 / 0.02 |
| testLB 106.0" | 2.08 | 2.08 / 0.29 | 2.08 / 0.29 | 0.04 / 0.01 | 0.08 / 0.02 |

The roll is what every one of these sections is missing; the power curve matters only on Scoop's two forward sections
(with both, they come to 0.15 and 0.11). The roll wanted is 0.16" to 0.46" at the rail, inside Depth's 1/2".

**4. First trials, in the polish only** (`results/first-trials.txt`). The polish moves the chosen cuts' sliders and never
changes a name. Each new freedom was added as a second pass after today's, kept only when the shown miss improved.

- *Smoothness freed* (an existing slider) on the nose cut: Scoop 1.18 to 1.14; 92Log 1.57 (a second polish pass alone
  does that) and testLB unmoved.
- *A power curve on a nose concave* (a new number): nothing at all on Scoop, although off line it fits its nose far
  better. From where today's polish stops, no small move of one or two sliders lowers the widest gap, because three
  sections hold it at once.
- *The Edge Roll, polish only:* testLB 2.08 to 1.45 / 0.24; Scoop and 92Log unmoved (92Log has no nose concave to hang it on).
- *The reading: ours scored as the finished section* (`SPIKE_READ=rail`): testLB 1.45 / 0.22, the others unmoved, and
  testLB's rails typical miss rises 0.80 to 0.92. *Reading widths cut back to where the settled rail begins*
  (`SPIKE_READ=window`): testLB 1.45 / 0.20, but 92Log gets worse (1.61 / 0.44, rails 1.68 / 0.53). Rejected.

**5. Surprise: the roll in the name choice flips testLB's reading order** (`SPIKE_ROLL=grid`). Offered to the grid
search as one more slider, the roll lets the bottom-first reading claim the soft rail of the founder's longboard as
bottom: it came in as Teardrop + Tri-Plane Hull Center + Rolled Vee at 2.01 / 0.61, and the rails-first reading (closer
by only 0.11 mm on the whole section, short of the 0.25 it must win by) lost. That is the very trade the header of
`brd-rails.ts` warns about. So the roll stays out of the name and order choice, as the polish itself does.

**6. Surprise: much of 92Log and Scoop is search, not model** (`explore2.mts`, `results/explore2-*.txt`). Starting the
polish again with the nose swapped for a Blended Nose Concave 1/16" deep, and nothing new on BOTTOM, takes 92Log from
1.58 to 1.23 (the 1/16" concave is the dip beside the rail of step 2) and Scoop from 1.18 to 1.04. With a much wider
search than could ship (24 to 28 starts a file), the roll reaches 1.17 on 92Log, 1.00 on Scoop and 1.45 on testLB; the roll
with the power curve 1.13, 0.72 and 1.45; and the roll with a Rolled Vee offered to testLB's flat tail 0.99.

**7. The trials head to head, with one shippable search** (step 6's restart, built into the trial code as
`SPIKE_STARTS=nose`). After today's polish, untouched, the nose is tried afresh: a Blended Nose Concave from 1/16", and
the fitted nose concave once more, each polished with the trial's new freedom. The closest shown fit is kept; a start
that changes a name must be 0.25 mm closer (the fit's own bar for another cut). `SPIKE_GATE_MM=1` runs this only on a
file whose widest miss is still over 1 mm, so a file already under 1 mm is never touched. Results are in the next section.

**8. The app's own round trips.** `bottom.test.ts`, `brd-bottom.test.ts`, `brd-fit-preview.test.ts` and `brd-look.test.ts`
(1,385 cases, among them the boards the app writes and reads back) pass in the worktree with the Edge Roll trial
switched on (`results/vitest-roll.txt`).

## Results

Widest / typical miss in mm through the real import (`brdLookFromBytes`). "Open" is the fastest of three, every mode on
every file in one warmed process, as spike 004 took them (`timing.mts`, `results/timing-warm.md`). The machine was shared
and ran today's own code about 1.7 times slower than spike 004 recorded it (testLB 4.75 s against 2.77 s), so read the
seconds as before-and-after, not against the 3 s rule directly.

### The recommended change, all twelve files: an Edge Roll on a nose concave

After today's polish, on a file whose widest miss is still over 1 mm, the nose is tried once more as a Blended Nose
Concave from 1/16" with a 1/8" Edge Roll, polished with the roll free, and kept when it is 0.25 mm closer.

| File | Bottom before | Bottom after | Rails before | Rails after | Cuts after | Open before | Open after |
|---|---|---|---|---|---|---|---|
| 92Log | 1.58 / 0.44 | 1.28 / 0.38 | 1.65 / 0.44 | 1.64 / 0.45 | Blended Nose Concave 1/16", Edge Roll 0.17" · Continuous Belly 1/2" · Rolled Vee 0.42" (the nose was Flat Entry) | 1.77 s | 4.10 s |
| Scoop-Noserider | 1.18 / 0.36 | 1.01 / 0.37 | 2.70 / 0.78 | 2.20 / 0.68 | Blended Nose Concave 0.35", Edge Roll 0.30" · Continuous Belly 0.31" · Panel Vee 1/16" (names unchanged) | 2.03 s | 4.54 s |
| testLB | 2.08 / 0.26 | 1.45 / 0.21 | 5.01 / 0.80 | 4.98 / 0.72 | Blended Nose Concave 0.37", Edge Roll 0.11" · Flat · Flat (the nose was a Teardrop) | 4.75 s | 5.19 s |
| quadtesting | 6.43 / 0.82 | identical | 55.49 / 2.08 | identical | same | 1.52 s | 2.22 s |
| SAtri | 0.40 / 0.06 | identical | 2.52 / 0.32 | identical | same | 1.84 s | 1.84 s |
| SAtwin | 0.39 / 0.06 | identical | 2.52 / 0.32 | identical | same | 1.89 s | 1.83 s |
| mid | 0.56 / 0.09 | identical | 1.76 / 0.42 | identical | same | 2.17 s | 2.20 s |
| JFS_BigTwin | 0.70 / 0.32 | identical | 1.42 / 0.35 | identical | same | 0.69 s | 0.68 s |
| 6'10 Widepoint Fwd Egg | 0.77 / 0.21 | identical | 1.67 / 0.49 | identical | same | 0.65 s | 0.65 s |
| 6'2 Round Tail Double Concave | 0.55 / 0.17 | identical | 2.08 / 0.42 | identical | same | 3.45 s | 3.46 s |
| 6'4 Double Wing Groveler | 0.54 / 0.12 | identical | 1.20 / 0.43 | identical | same | 1.03 s | 1.04 s |
| Fryer 5'7 Squash Flyer Twin | 0.49 / 0.21 | identical | 0.93 / 0.30 | identical | same | 3.10 s | 3.06 s |
| Total | | | | | | 24.9 s | 30.8 s |

"Identical" means every stored number and every measured section value matched main.

- **Did any file get worse?** No file's bottom is worse on widest plus typical, which is what the fit scores. Two
  figures move the wrong way by 0.01 mm: Scoop's typical bottom miss (0.36 to 0.37) and 92Log's typical rails miss (0.44
  to 0.45). Every other rails figure on the three files is better or the same; Scoop's rails widest falls 2.70 to 2.20.
- **Open time: this is the weak point.** The restart more than doubles the open time on 92Log and Scoop (2.3 s and 2.5 s
  more here) and adds 0.4 s on testLB and 0.7 s on quadtesting (tried, nothing kept). Nothing on the eight files under
  1 mm. On this machine that is past 3 s on all three targets. Scaled to spike 004's timings of the same code it would be
  about 2.4 s, 2.5 s and 3.0 s: at the limit on testLB, which is already at 2.8 s today. A build would have to trim it.
- **The founder's rulings:** kept. Every Depth and every roll is inside 1/2" (the largest roll fitted is 0.30"); the
  shallowest nose concave is the 1/16" the fit already holds to. Like every polished number, a roll lands between steps
  and BOTTOM would show it rounded to 1/64". Nothing was measured past a ruling, because no trial ran into one.

### The trials head to head, on the three files

All with the same restart and the 1 mm gate, except the last row. In the first five rows the other nine files are
identical to today.

| Trial | New on BOTTOM | 92Log bottom (rails) | Scoop bottom (rails) | testLB bottom (rails) | Open, the three files |
|---|---|---|---|---|---|
| Today | | 1.58 / 0.44 (1.65 / 0.44) | 1.18 / 0.36 (2.70 / 0.78) | 2.08 / 0.26 (5.01 / 0.80) | 1.77 · 2.03 · 4.75 s |
| The nose tried afresh, nothing else | nothing | 1.23 / 0.40 (1.50 / 0.51) | 1.04 / 0.43 (2.99 / 0.68) | unchanged | 3.18 · 3.65 · 5.00 s |
| **Edge Roll on a nose concave** | one slider | 1.28 / 0.38 (1.64 / 0.45) | 1.01 / 0.37 (2.20 / 0.68) | 1.45 / 0.21 (4.98 / 0.72) | 4.10 · 4.54 · 5.19 s |
| Edge Roll, and a Rolled Vee 1/4" offered to a flat tail | one slider | same | same | 1.00 / 0.16 (4.99 / 0.61), tail Rolled Vee 1/4" | 4.10 · 4.57 · 7.39 s |
| A power across-curve on a nose concave | one slider | 1.24 / 0.35 (1.52 / 0.51) | 0.84 / 0.26 (2.74 / 0.58) | unchanged (no gain kept) | 4.93 · 4.99 · 5.32 s |
| Rail-aware reading (ours scored as the finished section; no restart) | nothing | 1.58 / 0.41 (same) | unchanged | 1.45 / 0.22 (5.01 / 0.92) | 2.06 · 2.05 · 4.95 s |

Read across:

- **Only the Edge Roll lowers all three and worsens nothing.** It is also the only trial that helps the rails on all
  three, because the turned-up edge it draws is what the rail fit was straining to reach.
- **The restart alone is most of 92Log and Scoop**, with nothing new on BOTTOM, but it leaves testLB where it is, and on
  Scoop it trades the widest for the typical (0.36 to 0.43) and for the rails (2.70 to 2.99 widest).
- **The power curve is Scoop's best single trial (0.84)** and does nothing for testLB. On 92Log it is the restart's gain.
- **The rail-aware reading gets testLB's 1.45 with nothing new**, but makes its rails typical miss worse (0.80 to 0.92)
  and moves neither of the others. It also changes what "bottom miss" means on every file (SAtri reads 0.38 for 0.40),
  which the rows above it do not.
- **Smoothness freed** (existing sliders, same restart, no gate; `results/restart-ungated.txt`): 92Log 1.23 / 0.29, Scoop
  1.06 / 0.35, testLB 2.08 / 0.25 with every cut's Smoothness free, and mid gets 0.01 mm worse, as spike 004 found.
- **Without the 1 mm gate** the roll also went onto the Round Tail (a 7/32" roll for 0.01 mm of typical miss), and the
  roll with the power curve put a 1/2" roll on the Fryer that took its rails from 0.93 to 4.41 mm. The gate is what keeps
  a number the file cannot see off a board that already fits.
- **The tail offer** takes testLB to 1.00 / 0.16, but it is a second change, and 2.2 s more on that file.

### What a build would need

**The recommended change: an Edge Roll on a nose concave.**

- **What it does to a board on BOTTOM.** One new slider on the three nose concaves (Teardrop Nose Concave, Blended Nose
  Concave, Slight Single Concave Entry), 0 to 1/2", starting at 0. Above 0, the bottom outside the concave's edge (the
  line Off Rail already sets) rolls up to the rail, by that much at the rail. It stands in full from the nose tip back to
  the concave's Deepest At and fades to nothing by its End. It is a lift, like a vee or a belly: it never takes foam off
  the stringer, it thins the rail, and litres, the 3D board, the .brd export, DATA, the printed sheet and RAILS' rail
  lift all follow it through the one foam-off number. In shaper's words it is the soft turned-up nose rail of a
  noserider, or a chine, drawn as part of the bottom.
- **Its name is the founder's to choose.** Candidates only: "Edge Roll", "Rail Roll", "Roll Outside".
- **Choices the trial made that a build should put to him:** the roll's curve is fixed at the Rolled Vee's own (Smoothness
  60; straight, like a chine, measured as close on every section but testLB's last two); it starts exactly at the
  concave's edge (its own inner edge would fit a little closer, at the cost of a second slider); and it holds to the nose
  tip ahead of the concave's Start (testLB's last 5" want the roll where the concave has already faded out).
- **Saved boards: unchanged.** The number is optional; absent reads 0 and the new branch is skipped, so the old
  arithmetic runs to the last bit. Measured: trial code in and switched off, all twelve files identical to main; switched
  on, the eight files already under 1 mm and quadtesting identical. No database change (the bottom lives in the snapshot
  JSON; the snapshot reader would need to accept and bound the new key).
- **In the import.** The roll is scored the fast way (its across part worked out once per Off Rail, like a cut's base);
  the polish gains it as one more slider on a nose concave; and after the polish, on a file whose widest miss is still
  over 1 mm, the nose is tried once more as a Blended Nose Concave from 1/16" with a 1/8" roll, kept only when the shown
  miss is at least 0.25 mm closer. Never in the name or order choice (step 5).
- **Rough scope.** `lib/geometry/bottom.ts` (the stored and the read cut, about fifteen lines in `cutFoamOffParts`);
  `lib/geometry/brd-bottom.ts` (the scorer's buffers, the polish field, the restart: about sixty lines);
  `lib/models/design-snapshot.ts` (the key); one slider row on BOTTOM for three names and a GUIDE card in the founder's
  words; the fit sheet's words for the roll. The section drawing, DATA, print, 3D, litres and the .brd writer already read
  the foam-off number.
- **Tests.** Default equals today on every fixture; the roll's own unit tests (nothing inside the edge, the whole roll at
  the rail, the fade behind Deepest At, held to the tip); the fast scorer held to the slow `sectionsFoamOff` with a roll
  on; a board the app writes with a nose concave and a roll reads back with both; the twelve-file table again, with the
  open times on a quiet machine.
- **Open time is the risk.** See the times above. The trial already runs a single restart; a build may need to trim that
  polish (its two Nelder-Mead restarts are most of its cost) to keep testLB inside 3 s.

**The cheaper first step, with nothing new on BOTTOM: the nose restart alone.** After the polish, on a file still over
1 mm, try the nose once more as a Blended Nose Concave from 1/16" and keep it when it is 0.25 mm closer. 92Log 1.58 to
1.23 and Scoop 1.18 to 1.04; testLB and the other nine untouched. It costs Scoop 0.07 mm of typical miss and 0.29 mm on
its rails' widest, which the Edge Roll version does not. About twenty lines in `polishBrdBottom`, one unit test on a
board the app writes, no saved-board, schema or BOTTOM change.

**What is left after either.** On 92Log and Scoop the tail's belly now holds the widest gap level with the nose (spike
003's belly shape, and Depth's 1/2" on 92Log). On Scoop the nose concave's own across-curve is the next 0.2 mm (the
power-curve trial: 0.84 alone, 0.72 to 0.78 with the roll and a wider search). On testLB the nose tip's last two sections
and the 5 mm rail miss at the tip (a board built on a blank) remain.

### Pictures

- `nose-where.png`: six nose sections, the file's whole half against the board that opens today. It shows where the
  file turns up against where our rail begins and where the reading width ends.
- `nose-sections.png`: the file's bottom, today's fit and the Edge Roll trial at the nose sections of the three files,
  inside the reading width.

### Limits of this spike

- Three files, two of them longboards by the founder's own hand and one noserider. A turned-up edge outside a nose
  concave on a shortboard is not in the sample.
- The eight files already under 1 mm were deliberately left alone (the 1 mm gate). Without the gate the roll moved the
  Round Tail's typical miss 0.17 to 0.16 and nothing else, so nothing was lost by it.
- The restart is one start chosen from the 24 to 28 tried off line. On 92Log it lands 0.05 mm short of the search-only
  answer (1.28 against 1.23); trying both would close that at the price of another polish.
- Times were taken on a shared machine and are only good as before-and-after ratios.
