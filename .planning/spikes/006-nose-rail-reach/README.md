---
spike: 006
idea: brd-bottom-fit
name: nose-rail-reach
type: comparison
validates: "Given the three nose files, when the rail is allowed to start further in at the nose instead of adding a Rail Roll to the bottom, then the finished board fits as close or closer with nothing new on BOTTOM"
verdict: INVALIDATED
related: [005]
tags: [brd-import, rails, bottom, nose, bottom-tuck, rail-roll, fit]
---

# Spike 006: can a wider nose rail do the Rail Roll's job?

**Verdict: INVALIDATED.** Letting the rail start further in at the nose does not do it. Given the freedom, the import
never takes it on any of the three files: 92Log, Scoop-Noserider and testLB open exactly as today. Pushed in by hand, the
wider rail makes every one of them worse, steadily, the further in it goes. The Rail Roll (spike 005's Edge Roll) is
still the only trial that brings all three closer, and it does so on both ways of scoring the bottom.

The founder's question was fair: "doesn't the actual rail handle that section?" In his shaping order it does. He marks
the concave's edge on the bottom, then shapes the rail and blends the two. But RAILS as it is built cannot make that
blend, for a reason of shape and not of range:

- **Our rail's bottom is flat facets that start climbing the moment the rail begins** (at Bottom Tuck 3) and run
  straight up to the rail's edge.
- **The files stay down, then turn up late and hard**, like a hockey stick. Between the concave's edge and the last inch
  before the rail the file's bottom is still at the concave's level or below it.

So a rail that begins further in is too high everywhere between its start and the file's real turn-up. And on 92Log the
file dips 1.6 mm below the stringer's height beside the rail: no rail can draw that, because a rail only rises from the
bottom it stands on. That part is genuinely the bottom's.

## What This Validates

Whether the turned-up edge outside the nose concave on the three files can be drawn by RAILS, with nothing new on BOTTOM:
by an existing RAILS setting, by a wider range on one, or by letting the rail fit read further in.

## How to Run

Everything ran from a detached scratch worktree (removed afterwards) holding spike 005's trial code plus three switches;
the app's own source was never changed. Scripts, the trial code as one diff and the raw outputs are in
`spike-source.tar.gz`.

```bash
S=<a scratch folder>
git -C /Users/kontoes/Code/shaper worktree add --detach $S/wt HEAD        # HEAD was de40789b
ln -s /Users/kontoes/Code/shaper/node_modules $S/wt/node_modules
tar -xzf spike-source.tar.gz -C $S && git -C $S/wt apply $S/spike-source/trial-code.diff
# from the repo root; ROOT picks the checkout, OUT the result file
ROOT=$S/wt OUT=base.json npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/measure.mts
SPIKE_BT3_IN=3 ROOT=$S/wt OUT=bt3.json npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/measure.mts
node $S/spike-source/table.mjs . base bt3                 # the three bottom scores and the rails, file by file
SPIKE_BT3_IN=4 ROOT=$S/wt npx --no-install tsx --tsconfig ./tsconfig.json $S/spike-source/sweep.mts   # the rail pushed in by hand
git -C /Users/kontoes/Code/shaper worktree remove --force $S/wt
```

Switches added for this spike: `SPIKE_BT3_IN=n` (Bottom Tuck 3's nudge may reach +n inches where today it stops at
+3/4"; the import tries it on the nose rail), `SPIKE_BT3_ALL=1` (on all three rails), `SPIKE_STRIP_IN=n` (the rail fit
scores the outer n inches of the bottom where today it scores 3"). The Rail Roll is spike 005's
`SPIKE_STARTS=nose SPIKE_POLISH=roll-nose SPIKE_GATE_MM=1 SPIKE_ONE=1`.

## Investigation Trail

**1. What on RAILS decides where the rail's bottom begins.** One mark: **Bottom Tuck 3**, the distance in from the rail,
on the bottom, where the rail's bottom band starts. Inside it the bottom is BOTTOM's; outside it the rail's facets climb
to the rail's edge. A shaper does not set it directly. It follows other RAILS settings (`computeSectionInches` in
`lib/geometry/rail-bands.ts`):

- **Ratio and the rail's thickness.** Bottom Tuck 3 is the bottom share of the rail's thickness less half the Apex
  Thickness. A thicker rail, or more of it below the apex (30/70 rather than 60/40), starts further in.
- **Symmetrical.** Ticked, the bottom copies the deck: Bottom Tuck 3 becomes 1.8 times the board's thickness there, times
  Scaled from center by. That is a far wider rail, 2" to 5" in on a longboard nose.
- **Advanced: the Bottom Tuck 3 slider**, which moves the mark up to 3/4" either way off its formula.
- **Scaled from center by** (nose and tail), which tightens a Symmetrical rail's marks.

So RAILS can already move the rail's start in, and the import already searches every one of these. What it chose for each
nose today:

| File | Nose rail today | Where our rail begins in the nose |
|---|---|---|
| 92Log | 32.5/67.5, Scaled 0.85, Bottom Tuck 3 nudged 1/2" in (of the 3/4" it may use) | 1.6" in at 94.5", 1.0" in at 106.9" |
| Scoop-Noserider | 50/50, Scaled 0.60, Bottom Tuck 3 on its formula | 0.8" to 1.0" in |
| testLB | Symmetrical, 40/60, Scaled 0.85 | 2.8" in at 96", 5" in at 75" to 79" |

Two things stand out. On 92Log and Scoop the fit had room left on the existing slider and did not use it. And RAILS has
no notion of the concave's edge: Bottom Tuck 3 is measured in from the rail and is the same whatever BOTTOM's Off Rail
says. A vee or a belly thins the rail by its lift at the rail (`railsOnTheBottom`); a concave changes nothing in RAILS.
There is no "blend to the concave's mark" today.

**2. Three ways to score the bottom, so a rail that does the work is not counted as a bottom miss** (`measure.mts`).

- *Cuts alone:* today's shown figure. The file against BOTTOM's cuts, inside the reading width.
- *Finished, reading width:* the file against our finished section (cuts with the rail standing on them), same width.
- *Finished, to nine-tenths:* the same, from the stringer to nine-tenths of the way to the rail on every section,
  whatever the reading width. This one cannot be flattered by a reading width that narrows, which matters on testLB (read
  rails first, its nose is read only 45% to 81% of the way out, and it scores 3.09 here against 2.08 on cuts alone).

**3. The wider nose rail through the real import** (`results/table-all.txt`).

- *Bottom Tuck 3 free to +3" on the nose rail:* 92Log, Scoop and testLB identical to today, to the last stored number.
  The fit is offered the reach and declines it. One other file takes it: the 6'10 Egg's nose third comes in from 0.70 to
  0.48 mm (finished, to nine-tenths) and its rails typical from 0.49 to 0.47; its whole-file bottom figures barely move (0.77 / 0.21 to 0.77 / 0.20).
  quadtesting's rails typical moves 2.08 to 2.05. The other seven are identical.
- *On all three rails:* the same, plus testLB's typical figures a little better (bottom 0.26 to 0.23, rails 0.80 to
  0.77) from its tail. Its widest does not move.
- *The rail fit reading 5" in instead of 3"* (with the free tuck): no bottom figure improves on any file. 92Log gets
  worse (1.58 / 0.44 to 1.63 / 0.47). The rails figures move both ways but are no longer like for like, because the
  figure itself now covers a wider strip.

**4. The rail pushed in by hand** (`sweep.mts`, `results/sweep.txt`; the picture). Today's fitted board, the nose rail's
Bottom Tuck 3 moved further in, nothing else touched. Widest / typical miss over the nose sections, finished, to
nine-tenths:

| Nose rail | 92Log | Scoop | testLB |
|---|---|---|---|
| Today | 1.60 / 0.28 | 1.19 / 0.45 | 3.10 / 0.54 |
| Bottom Tuck 3 nudged 3/4" in (today's limit) | 1.64 / 0.37 | 2.20 / 0.48 | 3.39 / 0.74 |
| 1 1/4" in | 2.91 / 0.57 | 3.74 / 0.58 | 3.62 / 0.96 |
| 1 3/4" in | 4.13 / 0.77 | 4.76 / 0.71 | 3.88 / 1.18 |
| 3" in | 6.12 / 1.27 | 6.24 / 1.04 | 4.46 / 1.60 |
| Symmetrical switched (on for 92Log and Scoop, off for testLB) | 6.79 / 1.04 | 7.70 / 1.05 | 6.90 / 0.93 |
| Scaled from center by 1.00 | 1.60 / 0.28 | 1.19 / 0.45 | 3.35 / 0.67 |

Worse at every step, on every file, and the rail fit's own score agrees (92Log 1.65 to 2.89 at 1 1/4"; Scoop 2.70 to
3.72). One section goes the other way: testLB's last but one, 2" from the nose tip, improves from 1.52 to 0.25 mm with
the tuck 3/4" further in, while the ten sections behind it get worse. That is the rail blending from one anchor to the
next along the board, not something a wider nose rail can use.

**5. Why, in the picture** (`nose-rail-reach.png`). On 92Log at 94.5" the wider rail (dotted) leaves the bottom 6" out
and climbs in a straight line, while the file is still going down to its dip at 7.1" and only turns up at 7.6". On Scoop
at 97.7" the file's concave is still deepening at 7.9" out, where the wider rail is already 2 mm above it. The file's
turn-up is short and steep and sits right against the rail; what it needs inboard of that is a bottom that keeps to the
concave, then curves up. The Rail Roll's curve does that because it starts at the concave's own edge and rises slowly at
first.

**6. The Rail Roll on the same scores, and both together.** With the Rail Roll in, the free tuck changes nothing on the
three files (identical to the Rail Roll alone), so "both" buys nothing here.

## Results

Widest / typical miss in mm through the real import. Open times are the fastest of three in one warmed process
(`results/timing-warm.md`); the machine was shared, so read them as before-and-after.

### Head to head on the three files

| | Trial | Bottom, cuts alone | Bottom, finished, reading width | Bottom, finished, to nine-tenths | Rails | Open |
|---|---|---|---|---|---|---|
| 92Log | Today | 1.58 / 0.44 | 1.58 / 0.41 | 1.58 / 0.41 | 1.65 / 0.44 | 1.81 s |
| | Wider nose rail allowed | identical | identical | identical | identical | 1.80 s |
| | Rail Roll | 1.28 / 0.38 | 1.28 / 0.38 | 1.31 / 0.39 | 1.64 / 0.45 | 4.26 s |
| | Both | as Rail Roll | as Rail Roll | as Rail Roll | as Rail Roll | 4.13 s |
| Scoop-Noserider | Today | 1.18 / 0.36 | 1.19 / 0.36 | 1.18 / 0.36 | 2.70 / 0.78 | 2.06 s |
| | Wider nose rail allowed | identical | identical | identical | identical | 2.24 s |
| | Rail Roll | 1.01 / 0.37 | 1.06 / 0.37 | 1.04 / 0.37 | 2.20 / 0.68 | 4.61 s |
| | Both | as Rail Roll | as Rail Roll | as Rail Roll | as Rail Roll | 4.69 s |
| testLB | Today | 2.08 / 0.26 | 1.62 / 0.25 | 3.09 / 0.59 | 5.01 / 0.80 | 4.72 s |
| | Wider nose rail allowed | identical | identical | identical | identical | 4.74 s |
| | Rail Roll | 1.45 / 0.21 | 1.45 / 0.21 | 2.70 / 0.52 | 4.98 / 0.72 | 5.34 s |
| | Both | as Rail Roll | as Rail Roll | as Rail Roll | as Rail Roll | 5.38 s |

- **The Rail Roll's gain is real on the finished board, not an artefact of how the bottom is scored.** It is a little
  smaller there on Scoop (1.18 to 1.04, against 1.01 on cuts alone) and the same or larger on the other two.
- **It is not better on every section.** In the picture, 92Log at 106.9" goes from 0.28 to 1.08 mm and testLB at 102.5"
  from 1.05 to 1.20, traded for the sections that held the widest miss. The whole-file figures above are what the fit
  scores.
- **Can the rail follow a turn-up that starts 1" to 2" inboard?** Not with the rail RAILS draws. Scoop's concave
  bottoming out and turning up needs a curve that stays low and then rises; the rail's facets rise at once. 92Log's dip
  beside the rail is below the stringer's height and is the bottom's own (a 1/16" nose concave draws it; spike 005).

### All twelve files, the wider nose rail allowed (Bottom Tuck 3 free to +3" on the nose rail)

| File | Bottom, cuts alone | Bottom, finished, to nine-tenths | Rails | Open before | Open after |
|---|---|---|---|---|---|
| 92Log | 1.58 / 0.44 → identical | 1.58 / 0.41 → identical | 1.65 / 0.44 → identical | 1.81 s | 1.80 s |
| Scoop Noserider | 1.18 / 0.36 → identical | 1.18 / 0.36 → identical | 2.70 / 0.78 → identical | 2.06 s | 2.24 s |
| testLB | 2.08 / 0.26 → identical | 3.09 / 0.59 → identical | 5.01 / 0.80 → identical | 4.72 s | 4.74 s |
| quadtesting | 6.43 / 0.82 → 6.43 / 0.82 | 6.41 / 0.82 → 6.41 / 0.82 | 55.49 / 2.08 → 55.49 / 2.05 | 1.60 s | 2.52 s |
| SAtri | 0.40 / 0.06 → identical | 0.40 / 0.05 → identical | 2.52 / 0.32 → identical | 1.91 s | 1.90 s |
| SAtwin | 0.39 / 0.06 → identical | 0.39 / 0.06 → identical | 2.52 / 0.32 → identical | 1.89 s | 1.89 s |
| mid | 0.56 / 0.09 → identical | 0.56 / 0.09 → identical | 1.76 / 0.42 → identical | 2.23 s | 2.22 s |
| JFS_BigTwin | 0.70 / 0.32 → identical | 0.70 / 0.32 → identical | 1.42 / 0.35 → identical | 0.72 s | 0.71 s |
| 6'10 Widepoint Fwd Egg | 0.77 / 0.21 → 0.77 / 0.20 | 0.77 / 0.21 → 0.77 / 0.20 | 1.67 / 0.49 → 1.67 / 0.47 | 0.69 s | 0.96 s |
| 6'2 Round Tail Double Concave | 0.55 / 0.17 → identical | 0.55 / 0.17 → identical | 2.08 / 0.42 → identical | 3.54 s | 3.54 s |
| 6'4 Double Wing Groveler | 0.54 / 0.12 → identical | 0.54 / 0.12 → identical | 1.20 / 0.43 → identical | 1.05 s | 1.12 s |
| Fryer 5'7 Squash Flyer Twin | 0.49 / 0.21 → identical | 0.49 / 0.21 → identical | 0.93 / 0.30 → identical | 3.13 s | 3.13 s |
| Total | | | | 25.3 s | 26.8 s |

No file gets worse. Nothing gets usefully better either. The Egg and quadtesting open about 0.3 s and 0.9 s slower
(the rail fit has more to try); the three nose files cost nothing because nothing is taken.

### What a wider nose rail would do to a board the app builds

If Bottom Tuck 3's slider on RAILS were given more reach (say to 3" in):

- **Saved boards: unchanged.** Every stored nudge is inside today's 3/4" and reads the same. Only a board whose shaper
  then pushes the slider past 3/4" changes, and only that board.
- **RAILS drawing:** on such a board the rail's bottom band starts further in and the bottom facet is longer and
  flatter: a softer, more rolled-under rail. **Litres** fall a little with it, and the 3D board, the .brd export and the
  printed rail bands follow, as they do for any RAILS change.
- **The import:** one file of twelve (the Egg) would open with a slightly closer nose rail; the three nose files would
  not change. About ten lines (the limit in `rail-bands.ts`, the fit's reach in `brd-rails.ts`), plus the slider's range
  on RAILS and its GUIDE card.

It is a harmless option for a shaper who wants a wider tuck, but it is not a fix for these three files.

### Recommendation, in the founder's shaping order

His order: "I generally shape the bottom contour in first (i.e. mark how close the nose concave comes to the rail, etc).
Then, I shape the rail and blend them together."

- **The mark** is BOTTOM's Off Rail on the nose concave. The app has it.
- **The blend** from that mark out to the rail is what the three files have and the app lacks. RAILS cannot make it
  today: its rail starts a set distance in from the rail and climbs in flat facets, and it does not know where the
  concave ends.
- **The Rail Roll is that blend.** It starts at the concave's mark, curves up to the rail, and the rail's bands then
  stand on it. The measurements pick its shape; which page holds the slider is a separate choice and changes no number.
  By his order it belongs to the rail step, so it could be shown on RAILS' nose rail (candidate words only: "Blend to
  Concave") while being stored with the nose concave, whose edge it needs. On BOTTOM it reads as a roll drawn on the
  bottom, which is the less faithful telling of how he shapes.

So: **Rail Roll, not a wider rail, and not both.** A wider rail adds nothing on top of it on these files. Spike 005's
figures, cautions (the open time, the 1 mm gate) and build notes stand as written; the only new question for him is which
page the slider lives on.

### Picture

- `nose-rail-reach.png`: six nose sections, the outer two-thirds of each half: the file, today's finished section, the
  nose rail's Bottom Tuck 3 moved a further 1 1/4" in, and the Rail Roll.

### Limits of this spike

- The rail was widened only through settings RAILS has. A rail whose bottom band is a curve instead of flat facets, or
  one that starts at the concave's mark, was not built: in shape that is the Rail Roll by another name.
- RAILS fits three rails (tail, centre, nose 12" back from the tip) and blends between them. Scoop's 73.7" section lies
  between the centre and the nose rail, so no nose setting reaches it fully; the Rail Roll does, because it follows the
  concave.
- Three files, as in spike 005. Times from a shared machine.
