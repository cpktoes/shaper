---
spike: 007
idea: brd-bottom-fit
name: nose-roll-round-trip
type: comparison
validates: "Given the app's own boards written to .brd with a nose concave 1/16\"–1/4\" deep and a Rail Roll 1/16\"–1/4\", when the import prefers a nose concave with a roll over a belly in the nose, then they open as a nose concave with a roll close to what was written, and the founder's twelve files stay the same or closer"
verdict: PARTIAL
related: [005, 006]
tags: [brd-import, bottom, nose, concave, rail-roll, round-trip, fit]
---

# Spike 007: a nose concave with a Rail Roll, written by the app and opened again

**Verdict: PARTIAL.** On the Shortboard, the Mid-length and the Fish the recommended change works. Of the 144 boards
written with a nose concave and a Rail Roll, **143 open as a nose concave with a roll** (today 62), and 140 of them have
the roll and the depth back within 1/16" of what was written (today 55). The leftover centre belly that stood in for the
roll is gone on all but 12 of them (today it stays on 117). Not one board written with a real belly and no nose concave
opens with a concave: **the false-concave rate is 0 of 48**, the same as today. The founder's twelve files open
exactly as they do today: eleven identical to the last digit, testLB identical to the hundredth (its nose is found from
the dish seed, 0.001 mm closer), none worse, none closer. Opening costs 0.3 to 1.1 s more on the three files mf8
already retries, and nothing on the other nine; a test board tried for its dish costs 0.5 to 2.0 s more.

The **Longboard** is the part that does not follow: 15 of its 48 come back with a concave and a roll (today 5). That is a
different problem, measured below: the Longboard's widest bottom miss sits in its tail (0.91 mm, 94" from the nose, with
or without any nose cut), and its nose is read rails first, so the bottom reading stops halfway out and sees little of
the roll. Judging the Longboard's nose on its own sections brings back one more board, not the rest.

**The recommended combination** (ideas 2, 3 and 4, and the founder's tie rule):

1. **When to try the roll:** as today on a file still over 1 mm, and also whenever the file's own nose shows **a dish
   that turns up again before the rail** (idea 2's reading of the shape across the nose). Idea 1's trigger, "the nose came
   in as a belly", finds nothing the dish reading does not, and it would make every board with a real belly pay for the
   retry, so it is not in the recommendation.
2. **Where to start the roll from**, each start polished once with the roll free: the nose concave the fit already found,
   with its own name (idea 4), and one **seeded from the dish** (its depth, Off Rail at the dish's lowest point, and the
   roll the turn-up needs). Where the fit found no nose concave, today's fresh 1/16" Blended Nose Concave with a 1/8" roll
   takes the first start's place; and on a file still over 1 mm the fresh start is tried as well, as mf8 does today
   (Scoop-Noserider's roll is found only from it).
3. **Drop the leftover centre cut** (idea 3): the best of those starts is polished once more with the centre set to Flat
   (when it is not Flat already). The existing fewest-cuts rule then prefers it whenever it is within 0.25 mm.
4. **The tie margin: 0.05 mm** (widest plus typical). A nose concave with a Rail Roll that takes the place of a belly
   (a Rolled Belly Entry in the nose, or a centre belly or vee taken down to Flat) without adding a cut wins when it is no
   more than 0.05 mm further off. Anything from 0 to 0.10 mm gives exactly the same answers on all 296 test boards and
   the twelve files; the first real belly turns into a concave at 0.11 mm.

## What This Validates

Whether "Open a board file…" can be made to bring back the Rail Roll that BOTTOM now writes on a nose concave (quick
261125-mf8), when the founder's ruling is applied: *"concave in the nose is super common and should win."* Four ideas,
alone and together, measured on 296 of the app's own boards written to .brd and opened again, and on the founder's twelve
sample files: which of them brings the concave and its roll back close to what was written, what "about equally" should
be in millimetres, whether any real belly gets turned into a concave, and what each costs in seconds to open.

## How to Run

Everything ran from a detached scratch worktree at main d36cb614 (removed afterwards); the app's own source was never
changed. The scripts, the trial code as one diff (`trial-code.diff`) and every raw output are in `spike-source.tar.gz`.

```bash
S=<a scratch folder>
git -C /Users/kontoes/Code/shaper worktree add --detach $S/wt d36cb614
ln -s /Users/kontoes/Code/shaper/node_modules $S/wt/node_modules
tar -xzf spike-source.tar.gz -C $S && git -C $S/wt apply $S/spike-source/trial-code.diff
# With no S7_ switch set the trial code is today's code exactly (all twelve files identical, by digest).
# The collect run: every start, with and without the centre dropped, polished and logged, on every board (296 boards).
# (S7_TIE only changes which candidate is kept, not what is logged; the replay re-decides every board.)
$S/spike-source/scripts/run-grid.sh collect 6 S7_TRIG=always S7_STARTS=own,fresh,seed,slight,teardrop S7_DROP=1 S7_TIE=0
node $S/spike-source/scripts/sweep.mjs collect main            # every idea alone, in pairs, together; the tie margin swept
node $S/spike-source/scripts/prune.mjs collect 0.05             # cheaper searches
# The recommended trial through the real import, and today's code, on the same 296 boards:
$S/spike-source/scripts/run-grid.sh hyb 6 S7_MODE=rec S7_TRIG=sig S7_TIE=0.05 S7_HYBRID=1
$S/spike-source/scripts/run-grid.sh base 6
node $S/spike-source/scripts/findingb.mjs base hyb              # Finding B's boards, and per board / per name
node $S/spike-source/scripts/realdiff.mjs base hyb              # the controls: invented rolls, false concaves, worse boards
# The twelve files, fastest of 3, main before and after the trial (from the repo root):
ROOT=$S/wt S7_MODE=rec S7_TRIG=sig S7_TIE=0.05 S7_HYBRID=1 npx --no-install tsx --tsconfig $S/wt/tsconfig.json \
  $S/spike-source/scripts/measure.mts t12-hyb 3
# Other switches: S7_TRIG=belly+sig (idea 1 as well), no S7_HYBRID (all three starts on every tried board),
# S7_NOSESCORE=1 (judge on the nose half only), S7_FLATROLL=1 (idea 5: a nose concave's Depth may go to ~0 in the retry).
git -C /Users/kontoes/Code/shaper worktree remove --force $S/wt
```

The grid script (`grid.mts`) builds each board from the app's own preset (`phase16Boards()`, the same boards
`lib/geometry/presets.ts` makes), sets the nose with `startingCut` and the written Depth and Rail Roll, draws it with
`buildBoardSurface`, writes it with the app's own `brdText`, and opens the bytes with `brdLookFromBytes`, as
`lib/export/brd-look.test.ts` does. The sample files are the founder's `~/Downloads/*.brd`, read where they are (the
`_decrypt` copies skipped, test-curves-v2 treated as quadtesting).

## Investigation Trail

**1. Baseline.** The trial code with every switch off opened all twelve files identically to main (one digest over the
fitted cuts, every measured section and the fitted rails), and main reproduces the mf8 SUMMARY's twelve-file table to the
hundredth. Today's round trip reproduces Finding B: the Mid-length with a Blended Nose Concave 3/16" and a 1/8" or 3/16"
roll comes back as a concave plus a centre Continuous Belly (0.69 and 0.81 mm); 1/4" deep with a 1/4" roll, 1.15 mm and
no roll; a Slight Single Concave Entry 3/16" with a 1/4" roll as a Rolled Belly Entry (1.53 mm on the Mid-length); and
the Longboard 0.91 mm with no roll.

**The test grid**, all four presets, nothing pruned: each of the three nose concaves at Depth 1/16", 1/8", 3/16", 1/4"
with a Rail Roll of 1/16", 1/8", 3/16", 1/4" (192 boards); the same with no roll (48); and 56 boards with no roll at all:
a Rolled Belly Entry alone (16), a centre Continuous Belly alone (16), both (8), a Reverse Vee Nose (4), a centre
Tri-Plane Hull (4), and a Blended Nose Concave 1/8" over a real centre belly 1/8" or 1/4" (8, the "mixed" boards).
Today: **67 of 192** come back as a nose concave with a roll; only 29 come back with no other cut; 130 keep a stray
centre or tail cut.

**2. One search, replayed many ways.** Each idea changes either *when* the roll is tried, *where it starts from*, or
*what is kept*. So one collect run polished every start on every board (the fitted concave, the fresh 1/16" Blended, the
dish-seeded start, a fresh Teardrop and a fresh Slight Single Concave Entry, each with the centre kept and with the centre
set to Flat) and logged every result. `sim.mjs` then replays the choice for any trigger, any set of starts and any tie
margin. The replay of today's rule agrees with the real baseline on **296 of 296** boards, and the replay of the
three-start trial (`rec`) agreed with its own real run through the import on 294 of 296 (the two others: the Fish, Slight Single
Concave Entry 1/8" with a 1/4" roll, opened better in the real run, 0.30 mm against 1.36; and one Longboard came back a
Blended where the replay said Teardrop, same miss). So the tables below are the import's own answers.

**3. Each idea alone** (replayed; c+r = back as a nose concave with a roll, of 192; the controls are the boards written
with no roll, 48, and with a belly and no nose concave, 48):

| Idea | Concave + roll back | Roll and depth within 1/16" | With no other cut | Widest / typical mm | Invented rolls | False concaves |
|---|---|---|---|---|---|---|
| Today | 67 | 57 | 29 | 0.82 / 0.13 | 2 | 0 |
| 1 Try the roll whenever a belly stands in the nose | 99 | 85 | 31 | 0.78 / 0.12 | 2 | 0 |
| 2 The dish that turns up, as the trigger | 104 | 89 | 31 | 0.77 / 0.12 | 2 | 0 |
| 2 The dish as the trigger and the seed | 113 | 99 | 31 | 0.76 / 0.11 | 3 | 0 |
| 3 Drop the leftover centre cut (only on files over 1 mm) | 80 | 77 | 75 | 0.77 / 0.11 | 2 | 0 |
| 4 Start from the fitted concave (over 1 mm) | 74 | 64 | 31 | 0.82 / 0.13 | 2 | 0 |
| 4 All three names fresh (over 1 mm) | 81 | 70 | 31 | 0.75 / 0.11 | 2 | 0 |

- **Idea 1 works but is the wrong trigger.** It fires on 139 of the 192 rolled boards, and on 40 of the 48 real belly
  boards, every one of which then pays for the retry and keeps its belly anyway. The dish reading of idea 2 fires on 166
  of the 192, on 5 of the 48 nose concaves with no roll, and on **none of the 48 belly boards**: a belly is lowest at the
  stringer, so it has no dish. Every rolled board idea 1 catches, idea 2 catches too: put together, belly-or-dish gives
  exactly the same answers as dish alone, on every board.
- **The dish signature** (`polishBrdBottom`, trial code), per nose section in the front half of the board, on the file's
  own bottom across the reading width: the lowest point and how far out it is; the *dish* (how far below the stringer's
  height that lowest point is) and the *turn* (how much the bottom climbs back from it to the edge of what is read). It
  counts when the lowest point is at least 30% of the way out and short of the edge, the dish is at least 0.5 mm and the
  turn at least 0.3 mm. The seed takes the deepest dish as the Depth, Off Rail from the rail to the lowest point of the
  section that turns up most, and the roll that the turn needs at the edge of the reading (1/16" to 1/2").
- **Idea 3 is what clears the stray cut** (29 → 75 with no other cut, on its own) and what brings the depth back true:
  with the leftover belly gone, the concave stops sharing the dish with it.
- **Idea 4 helps where a fresh 1/16" start forgets what the fit found** (Finding B's fifth item: 1/4" deep with a 1/4"
  roll comes back 1/4" deep with 15/64", 0.36 mm). Fresh starts of the Teardrop and the Slight Single Concave Entry as
  well bring the *written name* back more often (81 → 98 of the boards back with a roll), but take two more polishes and
  cost the Blended Nose Concave nine of its own; once a roll is on, the three concaves draw nearly the same nose and the
  fit cannot reliably tell them apart. Not recommended.

**4. Together** (replayed, tie margin 0.05 mm):

| Combination | Concave + roll | Within 1/16" | No other cut | Widest / typical | Polishes a tried board |
|---|---|---|---|---|---|
| 1+3 (belly trigger, fresh start, drop) | 132 | 124 | 125 | 0.72 / 0.10 | 2 |
| 2+3 (dish trigger and seed, drop) | 147 | 135 | 135 | 0.69 / 0.10 | up to 4 |
| 2+4 (dish; fitted concave, fresh and seed) | 145 | 129 | 32 | 0.71 / 0.10 | up to 3 |
| 2+3+4, every start with and without the drop | 158 | 145 | 147 | 0.66 / 0.09 | 4.6 |
| 2+3+4, all three starts, the drop on the best start only | 157 | 144 | 142 | 0.67 / 0.09 | 3.4 |
| 2+3+4, no fresh start where a concave was fitted | 158 | 145 | 143 | 0.67 / 0.10 | 2.7 |
| **2+3+4, no fresh start where a concave was fitted, unless the file is over 1 mm (recommended)** | **158** | **145** | **143** | **0.67 / 0.10** | **3.0** |
| 1+2+3+4 (belly or dish as the trigger) | same answers as 2+3+4 on every board | | | | 3.1, on 40 more boards (the real bellies, tried for nothing) |

Dropping the fresh start where a concave was fitted looks as good on the test boards, and saves a polish, but it loses
Scoop-Noserider's whole gain from quick mf8 (1.01 → 1.18 mm): that file's roll is found only from the fresh start. So the
recommendation keeps the fresh start on a file still over 1 mm (exactly what mf8 runs today) and leaves it out on a file
tried only for its dish. On the test boards this does slightly better than running all three starts everywhere: starting
from the fitted concave rather than a fresh Blended keeps the written name more often (step 6).

**5. The tie margin, measured** (`sweep2.mjs`, `tiediff.mjs`, `margins.txt`). With the standing rules unchanged (fewest
cuts may be 0.25 mm further off; a renamed nose or an extra cut must be 0.25 mm closer), a tie margin of 0, 0.05 or
0.10 mm gives identical answers on every board. Without any tie rule (the import as it is), two boards lose their concave
because renaming the nose from a Rolled Belly Entry has to earn 0.25 mm: the Fish, Slight Single Concave Entry 1/16" with
a 1/8" roll (1.68 mm as a belly, 1.44 mm as a concave with a roll: closer, but only by 0.24) and the Longboard, Slight
Single Concave Entry 1/16" with a 1/16" roll. Raised, the margin starts turning real bellies into concaves:

| Tie margin (mm, widest + typical) | 0–0.10 | 0.15 | 0.30 | 0.40 | 0.50 | 0.75 |
|---|---|---|---|---|---|---|
| Belly boards opened as a nose concave (of 48), with the belly trigger | 0 | 1 | 2 | 3 | 5 | 10 |

The first is the Longboard with a Rolled Belly Entry 1/8" (today it opens as a Rolled Belly 3/16" over a 1/2" Tri-Plane
Hull, 2.39 mm, so it is over the gate and tried); its nearest concave is 0.11 mm further off. With the dish trigger the
belly boards under 1 mm are never tried at all, so the margin can only matter on a belly file already over 1 mm.

**How it sits with the other rules.** The tie margin is an exception to one rule only: the 0.25 mm a *renamed nose* must
earn. It applies when, and only when, the new nose is a concave with a Rail Roll, it replaces a belly (the nose's own
Rolled Belly Entry, or a centre belly or vee that goes to Flat), and it adds no cut. It does not touch the 0.25 mm an
*extra cut* must earn, and that is what keeps a real centre belly from growing a concave in front of it: on the Fish with
a centre Continuous Belly 1/16", a concave-with-roll nose *over the kept belly* is 0.10 mm closer and is still refused,
because it is one cut more. The fewest-cuts rule is unchanged and does most of the work: dropping the leftover belly
leaves fewer cuts, so it may be up to 0.25 mm further off and still win, which is how 9 boards trade a little closeness for
the cut that was written (step 6). The Tri-Plane last, the rails-first try and the polish's own guard are not touched:
everything here happens after them, inside the nose retry.

**6. Through the real import** (today is `base`). Three runs of all 296 boards, each through `brdLookFromBytes`:

- `rec`, belly-or-dish trigger, all three starts: 157 back as a concave with a roll; it agrees with its replay on 294 of
  296.
- `recsig`, the dish trigger alone, all three starts: the same answers as `rec` on 294 boards; the other two are mixed
  boards (a Blended Nose Concave 1/8" over a real centre belly) that the belly trigger retried and brought 0.02 and
  0.07 mm closer with the same cuts, and the dish trigger leaves as today.
- `hyb`, **the recommendation**: 158 back as a concave with a roll, 145 within 1/16", 144 with no other cut. It differs
  from `recsig` on 15 boards: 10 keep the fitted name (a Teardrop or a Slight Single Concave Entry) where `recsig` turned
  it into a Blended, mostly at the same miss (the Mid-length, Slight 3/16" with a 1/8" roll comes closer, 0.70 → 0.50 mm);
  one more comes back with its roll (the Shortboard, Slight 3/16" with a 1/16" roll, its leftover belly gone); three are a
  little further off, the most the Fish, Teardrop 1/8" with a 1/16" roll (0.53 → 0.72 mm, still closer than today's
  0.77). Everything below is `hyb`.

**7. The Longboard.** Three things hold it back, measured (`where-longboard.txt`, `longboard-why.txt`,
`lbnose-diff.txt`):

- **It is read rails first on 43 of its 48 rolled boards** (the other three presets: 2 of 144). So each nose section is
  read only out to where our fitted rail begins, 47% to 71% of the way to the rail, and a Rail Roll lives outside the
  concave's edge, 1 3/4" in from the rail: almost all of it is in the part that is never read as bottom.
- **So the dish rarely shows.** On 26 of those 43 the file's nose, as read, has no dish that turns up again, so nothing is
  tried (and the board is under 1 mm). Where it does show (17), 12 come back with their concave and roll.
- **Its widest miss is in the tail**: 0.91 mm, 94" from the nose, on the plain Longboard with no nose cut at all. No nose
  choice can move that figure, so every nose candidate is judged on the typical figure alone. Trying it the other way
  (each candidate judged on the nose half's sections only, never letting the whole board's widest grow; `S7_NOSESCORE=1`)
  brought one more board back (15 → 16) and one 1/2" roll that is plainly wrong. Not recommended.

The roll the bottom reading cannot see is taken up by the fitted rail instead (the Longboard's rails miss is 4.99 mm
today and with the trial). Bringing it back would mean reading the bottom past where our rail begins, which spike 005
found makes 92Log worse; it is a separate question.

**8. A Rail Roll on a flat nose (idea 5, needs a BOTTOM change).** Built only as a trial switch (`S7_FLATROLL=1`: in the nose retry a concave's Depth may
go below 1/16", to a hair above 0, so its roll stands on a nose that is all but flat). BOTTOM cannot draw that today: a nose
concave at Depth 0 takes no foam and its roll none either (mf8). **No test board needs it**: every board was written with
a concave at least 1/16" deep, and of the 28 that come back at the 1/16" floor, 23 were written at 1/16"; the other five
are Longboards (step 7). **No sample file needs it**: on the twelve files it changes only 92Log (its nose concave goes from
4/64" to 3/64" with a 10/64" roll; bottom 1.28 → 1.31 mm, rails 1.64 → 1.57) and Scoop-Noserider (roll 19/64" → 20/64";
bottom 1.01 / 0.37 → 1.01 / 0.38, rails 2.20 → 2.45, worse). Neither is a clear gain. Not recommended; it stays the
founder's call as a BOTTOM change.

## Results

### The round trip, per board and per name (today → recommended, through the real import)

| Boards (192 written with a nose concave and a roll) | Concave + roll back | Roll and depth within 1/16" | No stray centre or tail cut | Widest / typical mm |
|---|---|---|---|---|
| **All** | **67 → 158** | **57 → 145** | **29 → 144** | **0.82 / 0.13 → 0.67 / 0.09** |
| Shortboard | 22 → 48 of 48 | 19 → 48 | 10 → 47 | 0.75 / 0.13 → 0.57 / 0.08 |
| Mid-length | 18 → 47 of 48 | 16 → 45 | 6 → 42 | 0.78 / 0.13 → 0.57 / 0.09 |
| Fish | 22 → 48 of 48 | 20 → 47 | 9 → 43 | 0.68 / 0.12 → 0.45 / 0.08 |
| Longboard | 5 → 15 of 48 | 2 → 5 | 4 → 12 | 1.08 / 0.13 → 1.07 / 0.12 |
| Teardrop Nose Concave written | 29 → 52 of 64 | 25 → 49 | 13 → 50 | 0.74 / 0.11 → 0.66 / 0.09 |
| Blended Nose Concave written | 25 → 58 of 64 | 20 → 50 | 13 → 52 | 0.77 / 0.11 → 0.62 / 0.09 |
| Slight Single Concave Entry written | 13 → 48 of 64 | 12 → 46 | 3 → 42 | 0.96 / 0.15 → 0.72 / 0.10 |
| Rail Roll 1/16" | 12 → 41 of 48 | 11 → 38 | 11 → 37 | 0.81 / 0.12 → 0.73 / 0.12 |
| Rail Roll 1/8" | 9 → 39 of 48 | 7 → 36 | 4 → 37 | 0.78 / 0.13 → 0.66 / 0.09 |
| Rail Roll 3/16" | 18 → 40 of 48 | 18 → 36 | 6 → 34 | 0.85 / 0.13 → 0.64 / 0.08 |
| Rail Roll 1/4" | 28 → 38 of 48 | 21 → 35 | 8 → 36 | 0.86 / 0.13 → 0.63 / 0.08 |
| Depth 1/16" | 22 → 36 of 48 | 22 → 34 | 18 → 32 | 0.92 / 0.14 → 0.82 / 0.12 |
| Depth 1/4" | 17 → 43 of 48 | 12 → 36 | 3 → 39 | 0.75 / 0.12 → 0.62 / 0.09 |

Within 1/32" on both roll and depth: 35 → 138. The mean miss of the roll that comes back is 0.019" (today 0.024") and of
the depth 0.011" (today 0.022"). The rails' widest miss is 2.71 → 2.63 mm on average.

**The name.** The concave comes back, but often not under the name it was written with: of the Teardrops written, 33
come back as a Blended Nose Concave with a roll and 19 as a Teardrop with a roll; of the Slight Single Concave Entries,
29 as a Blended and 19 as themselves (`names-hyb.txt`). Today's import already does this (29 Teardrops came back Blended with
a roll), because the roll is not part of choosing the name, and with a roll on, the three concaves draw nearly the same
nose. In all, 93 of the 158 come back under the written name. Fresh starts of
all three names as well would add about two more polishes on every tried board for a modest gain (replayed: 81 → 98 with
all three starts); not recommended, but it is the lever if the name matters to the founder.

### Finding B's boards

Widest / typical bottom miss in mm.

| Board written | Today | Trial |
|---|---|---|
| Mid-length Blended Nose Concave 3/16", Rail Roll 1/8" | Blended Nose Concave 3/16" + Continuous Belly 7/64"; 0.69 / 0.15 | Blended Nose Concave 13/64", Rail Roll 1/8"; 0.69 / 0.09 |
| Mid-length Blended Nose Concave 3/16", Rail Roll 3/16" | Blended Nose Concave 3/16" + Continuous Belly 5/32"; 0.81 / 0.13 | Blended Nose Concave 3/16", Rail Roll 5/32"; 0.36 / 0.05 |
| Mid-length Blended Nose Concave 1/8", Rail Roll 1/8" | Blended Nose Concave 1/8" + Continuous Belly 1/8"; 0.91 / 0.13 | Blended Nose Concave 9/64", Rail Roll 7/64"; 0.65 / 0.07 |
| Shortboard Blended Nose Concave 3/16", Rail Roll 1/16" | Blended Nose Concave 9/64", Rail Roll 1/32"; 0.86 / 0.14 | Blended Nose Concave 3/16", Rail Roll 3/64"; 0.26 / 0.08 |
| Longboard Blended Nose Concave 3/16", Rail Roll 1/4" | Blended Nose Concave 7/64" + Continuous Belly 5/64"; 0.91 / 0.11 | Blended Nose Concave 7/64", Rail Roll 5/64"; 0.91 / 0.11 |
| Mid-length Slight Single Concave Entry 3/16", Rail Roll 1/4" | Rolled Belly Entry 3/16" + Shallow Single Concave 9/64"; 1.53 / 0.26 | Blended Nose Concave 3/16", Rail Roll 15/64"; 0.36 / 0.05 |
| Shortboard Slight Single Concave Entry 3/16", Rail Roll 3/16" | Rolled Belly Entry 11/64" + Deep Single Concave 3/16"; 0.93 / 0.20 | Blended Nose Concave 3/16", Rail Roll 11/64"; 0.75 / 0.04 |
| Mid-length Blended Nose Concave 1/4", Rail Roll 1/4" | Blended Nose Concave 13/64" + Continuous Belly 13/64"; 1.15 / 0.15 | Blended Nose Concave 1/4", Rail Roll 15/64"; 0.36 / 0.06 |
| Mid-length Blended Nose Concave 3/16", Rail Roll 1/4" | Blended Nose Concave 3/16", Rail Roll 7/32" + Continuous Belly 1/16"; 0.36 / 0.05 | Blended Nose Concave 3/16", Rail Roll 15/64"; 0.36 / 0.05 |
| Fish Blended Nose Concave 3/16", Rail Roll 1/4" | Blended Nose Concave 3/16", Rail Roll 13/64" + Continuous Belly 1/16"; 0.36 / 0.07 | Blended Nose Concave 3/16", Rail Roll 15/64"; 0.30 / 0.06 |

Items 1, 2, 4 and 5 of Finding B are fixed on these boards: the 1/8" and 3/16" rolls come back as rolls (item 1), the
leftover 1/16" belly is gone (item 2), the Slight Single Concave Entry comes back as a nose concave with a roll, not a
Rolled Belly Entry (item 4, though under the Blended name), and 1/4" deep with a 1/4" roll keeps its depth and roll
(item 5). Item 3, the Longboard, is not (step 7). Picture: `nose-sections.png`.

### The controls

- **False concaves: 0 of 48.** No board written with a belly and no nose concave (Rolled Belly Entry, centre Continuous
  Belly, both, Reverse Vee Nose, Tri-Plane Hull) opens with a nose concave, today or with the trial. With the dish trigger
  none of them is even tried.
- **The mixed boards** (a Blended Nose Concave 1/8" over a real centre belly 1/8" or 1/4", 8 boards): every one keeps its
  centre belly where it kept it today (the Longboard 1/8" belly was already lost today). Three are tried (their nose shows
  a dish): two Shortboards come back 0.03 mm closer, one of them with an invented 1/32" roll; the Longboard's 1/16" nose
  changes its name from Blended to Teardrop at the same miss.
- **Invented rolls, on the 48 nose concaves written with no roll: 4 (today 2), all on the Longboard.** The two new ones:
  the Teardrop 3/16" (today Teardrop 3/16" plus a 1/16" centre belly, now a Blended 5/32" with a 7/64" roll in place of
  that belly, the same 0.91 mm) and the Blended 1/8" (today a Rolled Belly 19/64" over a 1/2" centre belly, 3.10 mm; now a
  Blended 1/16" with a 9/32" roll over the belly, 2.19 mm). On the Shortboard, Mid-length and Fish no roll is invented.
- **Boards whose widest miss grew: 9, by 0.01 to 0.13 mm**, all on the Shortboard and Fish, every one trading a leftover
  centre cut for the single nose concave with a roll that was written (e.g. the Shortboard, Blended 1/8" with a 1/16"
  roll: today Blended 1/8" + Continuous Belly 1/16", 0.48 mm; trial Blended 1/8", Rail Roll 3/64", 0.58 mm). That is the
  fewest-cuts rule doing what it is for.

### The founder's twelve files

Widest / typical bottom miss and widest / typical rails miss in mm, through `brdLookFromBytes`. "Today" is main
d36cb614, which matches the mf8 SUMMARY's table to the hundredth (`main-loaded.json`, `t12-main-a.json`). "Identical"
means one digest over the fitted cuts, every measured section value and the fitted rails matched.

| File | Tried? | Bottom today | Bottom trial | Rails today | Rails trial | Cuts |
|---|---|---|---|---|---|---|
| 6'10-Widepoint-Fwd-Egg | no | 0.77 / 0.21 | identical | 1.67 / 0.49 | identical | Flat · Flat · Panel Vee 6/64" |
| 6'2-Round-Tail---Double-Concave | no | 0.55 / 0.17 | identical | 2.08 / 0.42 | identical | Teardrop Nose Concave 4/64" · Deep Single Concave 8/64" · Double Concave Exit 8/64" |
| 6'4-Double-Wing-Groveler | no | 0.54 / 0.12 | identical | 1.20 / 0.43 | identical | Flat · Deep Single Concave 7/64" · Flat |
| 92Log | over 1 mm, dish | 1.28 / 0.38 | identical | 1.64 / 0.45 | identical | Blended Nose Concave 4/64", Rail Roll 11/64" · Continuous Belly 32/64" · Rolled Vee 27/64" |
| Fryer-5'7-Squash-Flyer-Twin | no | 0.49 / 0.21 | identical | 0.93 / 0.30 | identical | Blended Nose Concave 4/64" · Deep Single Concave 12/64" · Double Concave Exit 7/64" |
| JFS_BigTwin | no | 0.70 / 0.32 | identical | 1.42 / 0.35 | identical | Flat · Flat · Panel Vee 7/64" |
| SAtri | no | 0.40 / 0.06 | identical | 2.52 / 0.32 | identical | Flat · Flat · Spiral Vee 8/64" |
| SAtwin | no | 0.39 / 0.06 | identical | 2.52 / 0.32 | identical | Flat · Flat · Spiral Vee 8/64" |
| Scoop-Noserider | over 1 mm, dish | 1.01 / 0.37 | identical | 2.20 / 0.68 | identical | Blended Nose Concave 22/64", Rail Roll 19/64" · Continuous Belly 20/64" · Panel Vee 4/64" |
| mid | no | 0.56 / 0.09 | identical | 1.76 / 0.42 | identical | Blended Nose Concave 32/64" · Flat · Panel Vee 12/64" |
| quadtesting | over 1 mm | 6.43 / 0.82 | identical | 55.49 / 2.08 | identical | Flat · Continuous Belly 32/64" · Panel Vee 32/64" |
| testLB | over 1 mm, dish | 1.45 / 0.21 | 1.45 / 0.21 (typical 0.214 → 0.213) | 4.98 / 0.72 | 4.98 / 0.72 | Blended Nose Concave 24/64", Rail Roll 7/64" · Flat · Flat (Off Rail 3 3/4" → 3 13/16") |

The dish shows on exactly the three files mf8 already retries (92Log, Scoop-Noserider, testLB), and on none of the eight
files under 1 mm, so those eight are never tried. No file comes closer either: on all three the fresh 1/16" start mf8
already uses (or, on testLB, the seed, a hair closer) is still the best, and dropping the centre cut never wins (92Log's
and Scoop's centre bellies are real, 1/2" and 5/16").

### Open times

Seconds to open, through `brdLookFromBytes`, one process per run, one file after another. The twelve files are the
fastest of 3; main was timed four times around the trials (two before, two after) and the fastest kept. The machine had
just finished the grid runs: load average 9 falling to 3.6 during the final pair (`twelve-times.txt`). The grid's own
seconds were taken six runs at a time on a busy machine and are not used.

| File | Today | Trial | More |
|---|---|---|---|
| 6'10-Widepoint-Fwd-Egg | 0.47 | 0.50 | 0.03 |
| 6'2-Round-Tail---Double-Concave | 1.90 | 1.96 | 0.06 |
| 6'4-Double-Wing-Groveler | 0.81 | 0.82 | 0.01 |
| 92Log | 2.12 | 2.89 | **0.77** |
| Fryer-5'7-Squash-Flyer-Twin | 1.73 | 1.67 | none |
| JFS_BigTwin | 0.47 | 0.47 | none |
| SAtri | 1.12 | 1.13 | 0.01 |
| SAtwin | 1.12 | 1.13 | 0.01 |
| Scoop-Noserider | 2.21 | 3.26 | **1.05** |
| mid | 1.41 | 1.38 | none |
| quadtesting | 1.29 | 1.37 | 0.08 |
| testLB | 3.06 | 3.35 | **0.29** |
| Total | 17.7 | 19.9 | 2.2 |

**The eight files under 1 mm cost nothing**: they are not tried, and the dish reading itself is a few dozen comparisons a
section (every difference above is within a run's own wobble). The three nose files cost 0.3 to 1.1 s more, well inside
the founder's 2.5 s (with all three starts on every tried board, the full search, Scoop was 1.38 s more).

The app's own boards, one open each, quiet machine (`quick-times.txt`; today timed three times, the run straight after
the trial shown, the fastest of the three):

| Board written | Today | Trial | More |
|---|---|---|---|
| Shortboard, Blended 3/16", roll 1/16" | 1.41 | 1.91 | 0.50 |
| Mid-length, Blended 1/8", roll 1/8" | 1.20 | 2.84 | 1.64 |
| Mid-length, Blended 3/16", roll 3/16" | 2.00 | 3.91 | 1.91 |
| Mid-length, Blended 1/4", roll 1/4" | 2.08 | 4.03 | 1.95 |
| Mid-length, Slight Single 3/16", roll 1/4" | 3.67 | 4.58 | 0.91 |
| Mid-length, Rolled Belly Entry 1/8" (control) | 0.89 | 0.89 | none |
| Mid-length, centre Continuous Belly 1/8" (control) | 0.85 | 0.88 | 0.03 |
| Longboard, Blended 3/16", roll 1/4" | 3.83 | 5.76 | 1.93 |

A board with a nose concave and a roll costs up to about 2 s more to open; a board with a belly costs nothing. With all
three starts on every tried board, the Mid-length boards cost up to 3.0 s more and the Longboard 3.5 s, over the founder's
2.5 s; that is why the recommendation leaves the fresh start out on a board tried only for its dish.

## The recommended tie margin

**0.05 mm on the widest plus typical miss**, as an exception to the 0.25 mm a renamed nose must earn, only for a nose
concave with a Rail Roll replacing a belly without adding a cut. Measured: 0 to 0.10 mm all give the same answers on all
296 test boards and all twelve files; the first real belly opens as a concave at 0.11 mm. 0.05 mm sits halfway, so a
real file a little different from the test boards still has room before a belly is misnamed. In shaper's terms: two nose
shapes within 0.05 mm of each other are the same nose to the tape, and then the concave is named.

## What a build would need

**What changes for a shaper.** Open a board file… on a board whose nose has a concave and then turns up toward the rail
(the shape BOTTOM's Rail Roll draws) opens with that nose concave and its Rail Roll on the NOSE card, at about the depth
and roll that were written, and without a stray 1/16" belly in the CENTER card. A board with a real belly opens exactly
as it does today. The preview's BOTTOM table names the roll as it already does (`Off Rail 1 5/8" · Rail Roll 11/64"`).
The founder's twelve files open exactly as today, and the three nose files take 0.3 to 1.1 s
longer. A board tried for its dish takes up to about 2 s longer. The Longboard mostly still opens without its roll (the
roll is taken up by its rail); that is a separate question about how far out the bottom is read.

**Saved boards unchanged.** Only the import's search changes. No new slider, no new key on a saved board, no database
change, no migration. BOTTOM draws exactly as it does today (idea 5 is not in this).

**Scope** (all in `lib/geometry/brd-bottom.ts`, `polishBrdBottom`, after today's polish and guard):

- the dish reading of the file's nose sections (a small pure function: lowest point, dish, turn; and the seed it gives);
- the trigger: still over `BRD_BOTTOM_NOSE_RETRY_MM`, or a dish that turns up;
- the starts, each polished with the roll free (`scorer.polish(..., true)`): the fitted nose concave if there is one
  (else today's fresh 1/16" Blended Nose Concave with a 1/8" roll), the dish seed if there is a dish, and on a file still
  over 1 mm today's fresh start as well; then the best of them once more with the centre set to Flat (only when the
  centre is not already Flat);
- the choice among them and today's answer: a new constant for the tie margin (`BRD_BOTTOM_CONCAVE_TIE_MM = 0.05`), the
  fewest-cuts rule and the 0.25 mm bars as they are, exactly as `S7_MODE=rec S7_TRIG=sig S7_HYBRID=1` does it in
  `trial-code.diff` (the trial's `globalThis` logging and the other switches are scaffolding, not part of a build).

**Tests.**

- A round trip in `lib/export/brd-look.test.ts` like mf8's: the Mid-length with a Blended Nose Concave 3/16" and a 1/8"
  roll opens as a nose concave with a roll within 1/16" and a Flat centre (today a Continuous Belly); the same with a
  Slight Single Concave Entry 3/16" and a 1/4" roll opens as a nose concave with a roll (today a Rolled Belly Entry); 1/4"
  deep with a 1/4" roll keeps its roll (today none).
- The control: the Mid-length with a centre Continuous Belly 1/8" and with a Rolled Belly Entry 1/8" open exactly as
  today, and are never retried (the dish reading finds nothing).
- The dish reading on its own (`brd-bottom.test.ts`): it fires on a written concave with a roll, not on a belly, a vee or
  a flat nose.
- The twelve files' table re-measured (as mf8 did with `measure.mts`): eleven identical by digest, testLB the same to
  the hundredth, and the open times beside today's.
