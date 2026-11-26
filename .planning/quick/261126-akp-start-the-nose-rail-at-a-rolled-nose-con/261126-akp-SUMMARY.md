---
phase: quick-261126-akp
plan: 01
status: stopped
parked: "2026-11-26 by the founder (\"2, park it\"); the code is kept on branch archive/261126-akp-rail-from-mark (a3bc5a22), not merged"
subsystem: geometry (bottom, rails, litres) and the .brd import
tags: [bottom, rails, nose, concave, rail-roll, longboard, brd-import, stopped]
requires: [quick-261125-mf8 (the Rail Roll), spike 009 (rule A)]
provides:
  - "railStartLimiter, railRollEaseIn, RAIL_ROLL_FULL_PULL (bottom.ts)"
  - "RailStartLimit, RAIL_PULL_FLOOR, railSectionPulledToMark, railSectionOutputWith (rail-bands.ts)"
  - "CrossSectionVolumeInput.railStartAt (volume.ts)"
  - "railBandsPulledToMark, RailsPulledToMark (design.ts)"
affects: [litres, 3D board, .brd export, .brd import, BOTTOM drawings, printed sheets]
tech-stack:
  added: []
  patterns: ["an optional closure on CrossSectionVolumeInput, set only when the rule applies, so every other board's input is key for key what it was"]
key-files:
  created:
    - lib/geometry/rail-start.test.ts
    - .planning/quick/261126-akp-start-the-nose-rail-at-a-rolled-nose-con/261126-akp-scripts.tar.gz
  modified:
    - lib/geometry/bottom.ts
    - lib/geometry/rail-bands.ts
    - lib/geometry/volume.ts
    - lib/geometry/design.ts
    - lib/geometry/bottom-rail-roll.test.ts
decisions:
  - "STOPPED at Task 2 under the plan's stop condition: the drawing rule makes 92Log's rails worse and makes the three rolled app Longboards open with different cuts, two of them over 2.5 s slower; none of the three import-side fixes tried keeps every file at or better than today"
  - "The pull's floor never pushes a Bottom Tuck 3 that is already under 1/8\" back in (differs from the spike's trial floor on purpose, D-04)"
metrics:
  duration: "about 45 min"
  completed: 2026-11-26
actuals:
  tokens: 9100
  tasks: 2
  commits: 1
---

# Quick 261126-akp: start the nose rail at a rolled nose concave's mark (STOPPED at the import check)

**The drawing rule is built and tested (Task 1, commit a3bc5a22, left on the branch and not merged). Then the import check
(Task 2) stopped the run, as the plan expected it might.** On a rolled Longboard nose, RAILS' Bottom Tuck 3 is now pulled out
to the nose concave's Off Rail mark. The pull eases in over the first 1/16" of roll, fades out with the roll along the board,
and never moves any other board. But the founder's two rules for opening a .brd are broken:

- **92Log opens with its rails further off**: 1.64 / 0.45 mm today, 1.93 / 0.50 mm with the rule (the bottom and the cuts are
  unchanged).
- **The three rolled app Longboards open with different cuts** (a 1/2" Continuous Belly appears that was never shaped, and on
  the Slight board a Rolled Vee too). Two of them open more than 2.5 s slower: +4.4 s and +6.7 s.

I tried three import-side fixes. None keeps every file at or better than today, so Task 3 (RAILS' greyed slider and note) was
not started. Nothing past the drawing rule was built.

## What Task 1 does to a board (built, committed, not merged)

On a board whose nose is a Teardrop Nose Concave, Blended Nose Concave or Slight Single Concave Entry with a Rail Roll:

- **The rail starts at the mark (D-01).** Wherever the nose rail's Bottom Tuck 3 starts further in from the rail than the
  concave's Off Rail mark, it is pulled out to the mark. Bottom Tuck 1 and 2 are scaled with it, so the rail keeps its own
  shape. "Where the rail starts" means Bottom Tuck 3, the line the shaper draws, not the sanded rail.
- **Along the board (D-02)** the pull is full from the nose tip back to the concave's Deepest At and fades to nothing by its
  End, the same share the roll itself uses. There is no step anywhere, and behind End every section is exactly today's.
- **Ease-in (D-03).** A roll of 1/16" or more pulls all the way. Below that it pulls part of the way, easing in from nothing
  at 0 on the board's own smoothstep.
- **Never pushed in (D-04).** The rule only ever pulls a rail out toward its edge. The pull stops at 1/8" in from the rail. A
  Bottom Tuck 3 that is already closer than 1/8" is left alone. The spike's trial floor could push one back in; this one can't.
- **One rail everywhere it is built (D-01).** The litres, the 3D board, the .brd export and BOTTOM's sections all read the one
  pulled rail. `railBandsPulledToMark` is ready to feed RAILS' cards, but no screen calls it yet, because Task 3 was not built.
- **Nothing stored changes (D-07).** The pull is worked out at draw time. Nothing saved is rewritten and there is no migration.

### RAILS' cards on the Longboard (Depth 3/16", Rail Roll 1/4"), Bottom Tuck 1 / 2 / 3

Worked out by the app's own code (`railscard.mts` in the archive). The tail card never moves.

| Nose concave (its Off Rail) | Nose card, today | Nose card, pulled | Centre card |
|---|---|---|---|
| Teardrop Nose Concave (2.25") | 1.71" / 0.86" / 3.08" | 1.25" / 0.62" / 2.25" | unchanged |
| Blended Nose Concave (1.63") | 1.71" / 0.86" / 3.08" | 0.90" / 0.45" / 1.62" | unchanged |
| Slight Single Concave Entry (2.00") | 1.71" / 0.86" / 3.08" | 1.11" / 0.56" / 2.00" | 2.91" / 1.45" / 5.23" → 2.24" / 1.12" / 4.04" |

The Blended figures match spike 009's to the hundredth.

### The Longboard's litres, Depth 3/16", today → now

| Roll | Teardrop | Blended | Slight Single Concave Entry |
|---|---|---|---|
| 0 | 74.52 → 74.52 (+0.00) | 74.49 → 74.49 (+0.00) | 74.29 → 74.29 (+0.00) |
| 1/64" | 74.52 → 74.57 (+0.06) | 74.49 → 74.54 (+0.06) | 74.28 → 74.49 (+0.21) |
| 1/32" | 74.51 → 74.71 (+0.20) | 74.48 → 74.68 (+0.20) | 74.27 → 74.97 (+0.70) |
| 3/64" | 74.50 → 74.84 (+0.34) | 74.48 → 74.81 (+0.34) | 74.26 → 75.46 (+1.20) |
| 1/16" | 74.49 → 74.89 (+0.40) | 74.47 → 74.87 (+0.39) | 74.25 → 75.65 (+1.40) |
| 1/8" | 74.47 → 74.86 (+0.39) | 74.46 → 74.85 (+0.39) | 74.21 → 75.60 (+1.39) |
| 1/4" | 74.41 → 74.79 (+0.38) | 74.43 → 74.81 (+0.38) | 74.12 → 75.49 (+1.37) |

The ease-in shows at the small rolls. A 1/64" roll moves the litres by about a seventh of what a 1/16" roll does (D-03).

### Identity (D-06)

309 boards were built by today's code and by Task 1's: every preset plain; each nose concave at Depth 1/16" to 1/4" and roll
0 to 1/4"; the bellies, the Reverse Vee Nose, the mixed and Tri-Plane boards; and the Longboard's small rolls. **252 are
identical** in litres, .brd bytes and every section. **The 57 that moved are exactly the 57 rolled Longboards.** Every rolled
Shortboard, Mid-length and Fish is byte-identical.

## Task 2: the import, measured (STOP)

Two paired rounds, today's code (BASE 5a55b5fa) and then Task 1's, back to back. One-minute load 3.54 and 3.62. Both rounds
gave the same figures (`same.mjs`: base1 → base2 and after1 → after2, 0 of 12 differ). Open times are judged on the quieter
round. Figures are bottom widest / typical miss and rails widest / typical miss, in mm.

| File | Today | With the rule | Open time (s) | Verdict |
|---|---|---|---|---|
| 6'10-Widepoint-Fwd-Egg | 0.77 / 0.21 · 1.67 / 0.49 | same | 0.51 → 0.47 | ok |
| 6'2-Round-Tail---Double-Concave | 0.55 / 0.17 · 2.08 / 0.42 | same | 1.95 → 1.95 | ok |
| 6'4-Double-Wing-Groveler | 0.54 / 0.12 · 1.20 / 0.43 | same | 0.81 → 0.81 | ok |
| **92Log** | 1.28 / 0.38 · 1.64 / 0.45 | 1.28 / 0.38 · **1.93 / 0.50** | 2.88 → 2.89 | **WORSE** |
| Fryer-5'7-Squash-Flyer-Twin | 0.49 / 0.21 · 0.93 / 0.30 | same | 1.67 → 1.67 | ok |
| JFS_BigTwin | 0.70 / 0.32 · 1.42 / 0.35 | same | 0.46 → 0.47 | ok |
| SAtri | 0.40 / 0.06 · 2.52 / 0.32 | same | 1.12 → 1.14 | ok |
| SAtwin | 0.39 / 0.06 · 2.52 / 0.32 | same | 1.12 → 1.11 | ok |
| Scoop-Noserider | 1.01 / 0.37 · 2.20 / 0.68 | same | 3.29 → 3.28 | ok |
| mid | 0.56 / 0.09 · 1.76 / 0.42 | same | 1.41 → 1.39 | ok |
| quadtesting | 6.44 / 0.82 · 55.49 / 2.08 | same | 1.37 → 1.37 | ok |
| testLB | 1.45 / 0.21 · 4.98 / 0.72 | same to the hundredth (its digest moves) | 3.35 → 3.38 | ok |

Every file keeps its three cut names. 92Log still opens as Blended Nose Concave 4/64" with an 11/64" Rail Roll, Continuous
Belly 32/64", Rolled Vee 27/64".

**The three rolled app Longboards** (written by the app's own .brd writer, opened through the real import):

| Board | Today: cuts · figures | With the rule: cuts · figures | Open time (s) | Verdict |
|---|---|---|---|---|
| Blended 3/16", roll 1/4" | Blended 7/64" r5/64" · Flat · Flat · 0.91 / 0.11 · 5.00 / 0.61 | Blended 15/64" r25/64" · **Continuous Belly 32/64"** · Flat · 2.55 / 0.56 · 4.92 / 0.87 | 5.55 → 7.23 (+1.68) | WORSE |
| Teardrop 3/16", roll 1/4" | Teardrop 12/64" · Flat · Flat · 0.91 / 0.07 · 4.96 / 0.63 | Teardrop 11/64" r15/64" · **Continuous Belly 11/64"** · Flat · 0.91 / 0.08 · 5.03 / 0.67 | 3.46 → 7.85 (**+4.39**) | WORSE, SLOW |
| Slight 1/8", roll 1/8" | Teardrop 8/64" · Flat · Flat · 0.91 / 0.10 · 5.01 / 0.63 | **Blended** 14/64" r20/64" · **Continuous Belly 32/64" · Rolled Vee 13/64"** · 1.40 / 0.31 · 5.02 / 0.73 | 3.17 → 9.90 (**+6.73**) | WORSE, SLOW |

Round 2 agrees: 5.54 → 7.18, 3.45 → 7.86, 3.15 → 10.01 s. **Verdict: STOP.**

### Why 92Log gets worse

92Log's fitted Off Rail (0.83") is outside where its real nose rail starts. When the board opens, the rule pulls that rail out
to the mark by up to 3/4", so the rails are refit around a pull the file's real rail never had (spike 009's finding,
reproduced). Today's rails fit the file better than any rail that has to start at that mark.

### The import-side fixes tried (time-boxed: three candidates, about 15 minutes of measuring)

| Candidate | What it does | 92Log | testLB | Longboards | Result |
|---|---|---|---|---|---|
| (c) Off Rail held | The import fits its rails with no pull, exactly as today. The opened concave's Off Rail is then held in to where those rails' Bottom Tuck 3 starts, so the rule has nothing to pull. The opened board is measured with the rule on. | rails better, 1.25 / 0.41, but bottom typical **0.38 → 0.42** | bottom **1.45 / 0.21 → 1.59 / 0.32** | unchanged from the rule alone (same cuts, +1.6 to +6.8 s) | fails |
| (c) + polish | As (c), with the bottom polished again under the held Off Rail, then held once more | rails **1.91 / 0.49**, bottom typical **0.42**, roll 11/64" → 10/64" | bottom **1.59 / 0.32** | (not run: the twelve already fail) | fails |
| (a) reading widths follow the pulled rail | Where a fitted nose concave has a roll, the bottom is read out to where the rule pulls our rail, in both orders (spike 009's tweak 1, with no switch) | identical to the rule alone: **1.93 / 0.50** | identical | identical cuts, +1.8 to +7.6 s (load rose to 12-18 during this run) | fails |

Candidate (b) (the fit scoring a roll under the rule) was not tried. To score a roll under the rule, the import would have to
choose a different roll for the board, and CONTEXT puts "any change to how the import chooses a roll" out of this task. It
also could not help the three app Longboards (next paragraph).

**Why no import-side fix can pass the Longboards as the stop condition reads.** Under candidate (c), the import's working
steps are today's own, and the three Longboards still open with different cuts and 1.6 to 6.8 s slower. Their .brd file
itself changed: the app now writes the pulled rail into it. So the import is reading a different file, not misreading the same
one. Holding those boards to today's cuts would mean making the import read a nose rail that starts at the mark as a rolled
concave, which is a roll-reading change (spike 008's ground, out of scope).

The candidates' diffs are in the archive (`out/candidate-*.diff`). The files they touched (`lib/export/brd-fit-preview.ts`,
`lib/geometry/brd-rails.ts`) are restored to Task 1's commit.

## What the founder is asked

The drawing rule stands on the branch as commit a3bc5a22, tested, with every other board byte-identical. Shipping it as
written breaks his two import rules on 92Log and on rolled app Longboards. The choices as I see them:

1. Accept that rolled Longboards open further off and slower (relax the import rules for rolled nose concaves), then build
   Task 3 (RAILS' greyed slider and note).
2. Keep today's drawing and drop the rule (spike 009's own recommendation).
3. A separate task on how the import reads a rail that starts at the mark (a roll-reading change, out of scope here).

## RAILS' note (Task 3, not built): draft words for approval

"The nose concave's Off Rail mark on BOTTOM sets where this rail starts while it has a Rail Roll." (the plan's first draft,
unchanged, since the note was not built)

## Deviations from Plan

- **[Rule 1 - test] The along-the-board "no step" walk starts where the board has a rail.** At the nose tip itself the board
  has no width, so there is no rail and no section to draw. The limiter is null there by its own rule (no rail). Measuring the
  step from that point to the first real station would compare against a section that does not exist. The test's allowance
  for each 1/8" step is 1.5 × the smoothstep's steepest slope over the gap, plus the mark's own move between the two
  stations. Near the tip the board is narrower than Off Rail, so there the mark follows the rail.
- **TDD order.** The test file and the code went into one commit (as the plan's single Task 1 commit asks). The code was
  written just before the tests, not after a red run. Every behaviour in the plan's list has a case, and all 26 pass.
- **Task 3 not started (the plan's stop condition).**

## Test lines changed

No test line was removed (`git diff -U0 BASE -- '*.test.ts' '*.spec.ts' | grep '^-[^-]'` prints nothing). One existing
expectation changes on purpose. "The litres fall with a roll, and fall again with a bigger one" kept its two lines for the
Shortboard, Mid-length and Fish:

```
      expect(litres[1], id).toBeLessThan(litres[0]);
      expect(litres[2], id).toBeLessThan(litres[1]);
```

For the Longboard it now asserts instead that a 1/8" roll holds more litres than none (the pull puts foam back) and a 1/4" roll
fewer than 1/8".

## Gates

- `npx vitest run` on rail-start, bottom-rail-roll, rail-bands, volume and design: 5 files, 1,087 tests pass.
- `npm test`, the whole unit suite: 243 files, 14,172 tests pass, 2 skipped (exit 0).
- `npx tsc --noEmit`: exit 0 (after `npx next typegen` in the fresh worktree). `npx eslint` on the six touched files: exit 0.
- No environment read or trial name in the diff. Protected files unchanged. The diff lists only Task 1's six files.
- Not run, because Task 3 was not built: the browser specs, `npm run build`, `npm run test:e2e:prod`.

## Self-Check: PASSED

- lib/geometry/rail-start.test.ts: FOUND
- .planning/quick/261126-akp-start-the-nose-rail-at-a-rolled-nose-con/261126-akp-scripts.tar.gz: FOUND (README.txt, scripts/, out/ only; no .brd)
- commit a3bc5a22: FOUND
- scratch BASE worktree: removed (not in `git worktree list`)
