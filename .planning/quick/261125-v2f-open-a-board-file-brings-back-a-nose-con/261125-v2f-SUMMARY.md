---
phase: quick-261125-v2f
plan: 01
status: complete
base: 1590a6af574d525582bb4df28ad90c56854c5f5d
subsystem: board-file import (lib/geometry/brd-bottom.ts)
tags: [brd-import, bottom, rail-roll, nose-concave]
requires: [quick 261125-mf8 (Rail Roll on BOTTOM's nose concaves), spike 007]
provides: [brdNoseDish, chooseBrdNoseRetry, BRD_BOTTOM_CONCAVE_TIE_MM, BRD_BOTTOM_DISH_* constants, the widened nose retry in polishBrdBottom]
affects: [Open a board file (.brd) only; nothing on BOTTOM, no saved board, no database]
tech-stack:
  added: []
  patterns: [pure geometry in lib/geometry, expected figures from the app's own functions and constants]
key-files:
  created:
    - lib/export/brd-nose-roll.test.ts
  modified:
    - lib/geometry/brd-bottom.ts
    - lib/geometry/brd-bottom.test.ts
    - .planning/quick/261125-v2f-open-a-board-file-brings-back-a-nose-con/261125-v2f-scripts.tar.gz
decisions:
  - "Opening a .brd also tries the nose concave with a Rail Roll when the file's nose shows a dish that turns up again before the rail (0.5 mm deep, lowest 30% out, climbing 0.3 mm), not only when the fit is over 1 mm (D-01)"
  - "The founder's tie: a nose concave with a Rail Roll that replaces a belly without adding a cut wins within 0.05 mm (D-03); the tie also asks that the concave actually carries a roll"
metrics:
  duration: about 55 minutes
  completed: 2026-11-25
actuals:
  tokens: 10200
  tasks: 3
  commits: 2
---

# Quick 261125-v2f: Open a board file brings back a nose concave with its Rail Roll

BASE: `1590a6af574d525582bb4df28ad90c56854c5f5d` (worktree branch `worktree-agent-a26640f1ece918e81`).

**One line:** when a board file's nose shows a dish that climbs back up before the rail, Open a board file now brings back the
nose concave with its Rail Roll and a flat centre. Before, most of the app's own boards with a roll came back without the roll,
and a stray 1/16" belly in the centre stood in for it. The founder's twelve files open exactly as they did this morning.

## What changes when the founder opens a board file

- **A nose concave with a Rail Roll comes back as one.** A board saved from BOTTOM with a Blended, Teardrop or Slight Single
  Concave Entry nose and a Rail Roll, then opened again, shows on the NOSE card a nose concave at about the depth and roll it
  was written with (within 1/16"). The CENTER and TAIL cards are Flat, with no leftover 1/16" Continuous Belly. The preview's
  BOTTOM table reads the same, with Off Rail and the Rail Roll in the nose's Across cell.
- **How it decides.** A nose concave with a roll is lowest well out from the stringer and climbs back up before the rail. A
  belly is lowest at the stringer and never does that. So when the file's own nose sections show that dish, the import tries the
  nose concave with a roll even if the fit was already under a millimetre. It makes up to three tries: the nose concave it
  already found, a start read off the dish itself, and (on a file still over a millimetre) the fresh 1/16" start it used before.
  When the centre holds a cut, the best of those is also tried with the centre flat, so the roll can take that cut's place.
- **The founder's ruling, "concave in the nose is super common and should win".** A nose concave with a Rail Roll that replaces
  a belly without adding a cut now wins even when it is up to 0.05 mm further off than the belly (widest plus typical miss).
  Before, a renamed nose had to earn a full 0.25 mm. Every other rule is unchanged: fewest cuts, 0.25 mm for a renamed nose or
  an extra cut, the Tri-Plane last, the rails-first try.
- **A real belly opens exactly as before.** None of the 48 test boards written with a belly and no nose concave comes back as a
  concave, before or after.

## What stays the same

- **BOTTOM itself:** no slider, range, name, GUIDE word or stored shape changes. Every saved board, preset, fixture and golden
  is identical, and there is no database change. Only what a newly opened .brd is fitted to changes.
  (`git diff --quiet BASE -- lib/geometry/bottom.ts lib/geometry/__fixtures__ lib/export/brd-fit-preview.ts lib/export/brd-look.test.ts lib/models components e2e db drizzle CLAUDE.md` exits 0.)
- **The founder's twelve files:** eleven are identical by digest. testLB's typical bottom miss moves 0.214 to 0.213 mm (its
  Off Rail 3 3/4" to 3 13/16"). Its widest, its cuts, its roll and its rails are unchanged.

## The twelve files, through the real import

The bottom and rails columns are identical before and after on every file except testLB's typical miss. Open time is the
fastest of three opens. "Paired" means timed back to back at load 7-8: the base code from a copy exported to scratch, then the
build. The first after-run was taken at load 30-46, while another build ran, so its times are not comparable and are not used.

| File | Bottom widest / typical mm (before -> after) | Rails widest / typical | Cuts after (with roll) | Open s, paired: before -> after |
|---|---|---|---|---|
| 6'10-Widepoint-Fwd-Egg | 0.774 / 0.212 = | 1.67 / 0.49 | Flat Entry · Flat Center · Panel Vee 6/64" | 0.56 -> 0.49 |
| 6'2-Round-Tail---Double-Concave | 0.553 / 0.166 = | 2.08 / 0.42 | Teardrop 4/64" · Deep Single Concave 8/64" · Double Concave Exit 8/64" | 1.97 -> 1.89 |
| 6'4-Double-Wing-Groveler | 0.544 / 0.118 = | 1.20 / 0.43 | Flat Entry · Deep Single Concave 7/64" · Flat Exit | 0.81 -> 0.82 |
| 92Log | 1.283 / 0.381 = | 1.64 / 0.45 | Blended 4/64", Rail Roll 11/64" · Continuous Belly 32/64" · Rolled Vee 27/64" | 2.11 -> 2.83 (+0.72) |
| Fryer-5'7-Squash-Flyer-Twin | 0.486 / 0.210 = | 0.93 / 0.30 | Blended 4/64" · Deep Single Concave 12/64" · Double Concave Exit 7/64" | 1.72 -> 1.69 |
| JFS_BigTwin | 0.696 / 0.323 = | 1.42 / 0.35 | Flat Entry · Flat Center · Panel Vee 7/64" | 0.48 -> 0.48 |
| SAtri | 0.395 / 0.055 = | 2.52 / 0.32 | Flat Entry · Flat Center · Spiral Vee 8/64" | 1.15 -> 1.15 |
| SAtwin | 0.391 / 0.063 = | 2.52 / 0.32 | Flat Entry · Flat Center · Spiral Vee 8/64" | 1.13 -> 1.14 |
| Scoop-Noserider | 1.014 / 0.370 = | 2.20 / 0.68 | Blended 22/64", Rail Roll 19/64" · Continuous Belly 20/64" · Panel Vee 4/64" | 2.29 -> 3.35 (+1.06) |
| mid | 0.564 / 0.091 = | 1.76 / 0.42 | Blended 32/64" · Flat Center · Panel Vee 12/64" | 1.48 -> 1.45 |
| quadtesting | 6.435 / 0.824 = | 55.49 / 2.08 | Flat Entry · Continuous Belly 32/64" · Panel Vee 32/64" | 1.31 -> 1.41 (+0.10) |
| testLB | 1.453 / 0.214 -> 1.453 / 0.213 | 4.98 / 0.72 | Blended 24/64", Rail Roll 7/64" · Flat Center · Flat Exit | 3.15 -> 3.49 (+0.34) |
| **All twelve** | | | | **18.2 -> 20.2 s** |

The eight files under 1 mm do no new work, and their times move by 0.08 s or less either way, which is wobble. The three nose
files (92Log, Scoop-Noserider, testLB) take +0.72 / +1.06 / +0.34 s, against spike 007's +0.77 / +1.05 / +0.29 s. quadtesting is
tried for being over 1 mm and keeps its old answer, at +0.10 s. Load: the before-run 8.5-11.5, the paired timing 7-8, the
after-run 30-46.

`same.mjs`: `spike-t12-main -> t12-before` 0 differ; `spike-t12-hyb -> t12-after` 0 differ; `t12-before -> t12-after` testLB alone.

## The 296-board grid (the app's own boards written to a .brd and opened again)

The 192 boards have a nose concave 1/16" to 1/4" deep with a Rail Roll 1/16" to 1/4". `same.mjs spike-base grid-before` and
`spike-hyb grid-after` both report 0 of 296 differ, so the build reproduces spike 007's trial board for board.

| Boards | Back as a concave with a roll | Roll and depth within 1/16" | With no other cut | Widest / typical mm |
|---|---|---|---|---|
| **All 192** | **67 -> 158** | **57 -> 145** | **29 -> 144** | 0.82 / 0.13 -> 0.67 / 0.09 |
| Shortboard | 22 -> 48 of 48 | 19 -> 48 | 10 -> 47 | 0.75 / 0.13 -> 0.57 / 0.08 |
| Mid-length | 18 -> 47 of 48 | 16 -> 45 | 6 -> 42 | 0.78 / 0.13 -> 0.57 / 0.09 |
| Fish | 22 -> 48 of 48 | 20 -> 47 | 9 -> 43 | 0.68 / 0.12 -> 0.45 / 0.08 |
| Longboard | 5 -> 15 of 48 | 2 -> 5 | 4 -> 12 | 1.08 / 0.13 -> 1.07 / 0.12 |
| Teardrop (64) | 29 -> 52 | 25 -> 49 | 13 -> 50 | 0.74 / 0.11 -> 0.66 / 0.09 |
| Blended (64) | 25 -> 58 | 20 -> 50 | 13 -> 52 | 0.77 / 0.11 -> 0.62 / 0.09 |
| Slight Single Concave Entry (64) | 13 -> 48 | 12 -> 46 | 3 -> 42 | 0.96 / 0.15 -> 0.72 / 0.10 |

**Finding B's boards** (the leftover centre belly), before -> after:

| Board written | Before | After |
|---|---|---|
| Mid-length Blended 3/16", roll 1/8" | Blended 3/16" + Continuous Belly 7/64"; 0.69 / 0.15 | Blended 13/64", roll 1/8"; 0.69 / 0.09 |
| Mid-length Blended 3/16", roll 3/16" | Blended 3/16" + Continuous Belly 5/32"; 0.81 / 0.13 | Blended 3/16", roll 5/32"; 0.36 / 0.05 |
| Mid-length Blended 1/8", roll 1/8" | Blended 1/8" + Continuous Belly 1/8"; 0.91 / 0.13 | Blended 9/64", roll 7/64"; 0.65 / 0.07 |
| Shortboard Blended 3/16", roll 1/16" | Blended 9/64", roll 1/32"; 0.86 / 0.14 | Blended 3/16", roll 3/64"; 0.26 / 0.08 |
| Longboard Blended 3/16", roll 1/4" | Blended 7/64" + Continuous Belly 5/64"; 0.91 / 0.11 | Blended 7/64", roll 5/64"; 0.91 / 0.11 |
| Mid-length Slight 3/16", roll 1/4" | Rolled Belly Entry 3/16" + Shallow Single Concave 9/64"; 1.53 / 0.26 | Blended 3/16", roll 15/64"; 0.36 / 0.05 |
| Shortboard Slight 3/16", roll 3/16" | Rolled Belly Entry 11/64" + Deep Single Concave 3/16"; 0.93 / 0.20 | Blended 3/16", roll 11/64"; 0.75 / 0.04 |
| Mid-length Blended 1/4", roll 1/4" | Blended 13/64" + Continuous Belly 13/64"; 1.15 / 0.15 | Blended 1/4", roll 15/64"; 0.36 / 0.06 |
| Mid-length Blended 3/16", roll 1/4" | Blended 3/16", roll 7/32" + Continuous Belly 1/16"; 0.36 / 0.05 | Blended 3/16", roll 15/64"; 0.36 / 0.05 |
| Fish Blended 3/16", roll 1/4" | Blended 3/16", roll 13/64" + Continuous Belly 1/16"; 0.36 / 0.07 | Blended 3/16", roll 15/64"; 0.30 / 0.06 |

**The controls:**

- **False concaves:** 0 of 48 belly boards before and after.
- **Invented rolls:** on boards written with no roll, 2 of 48 before and 4 of 48 after, all four Longboards, the case the
  spike already reported. (1) Longboard Blended 3/16" no roll: Blended 1/16", roll 1/16"; 1.60 / 0.17 became Teardrop 7/64",
  roll 1/8"; 1.34 / 0.13. (2) Longboard Blended 1/4": the same both runs. (3) Longboard Teardrop 3/16": Teardrop + Continuous
  Belly 1/16"; 0.91 / 0.12 became Blended 5/32", roll 7/64"; 0.91 / 0.11. (4) Longboard Blended 1/8": Rolled Belly Entry +
  Continuous Belly; 3.10 / 0.33 became Blended 1/16", roll 9/32" + Continuous Belly; 2.19 / 0.52.
- **Boards whose widest miss grew** (D-05's accepted cost, each giving up a leftover centre cut for the single cut that was
  written, by the fewest-cuts rule): nine boards, 0.01 to 0.13 mm. They are Shortboard Blended 1/4" r3/16 (0.43 -> 0.48), Fish
  Blended 3/16" r3/16 (0.24 -> 0.25), Shortboard Blended 1/8" r1/16 (0.48 -> 0.58), Shortboard Slight 1/16" r1/16 (0.75 -> 0.80),
  Shortboard Slight 1/16" r1/8 (1.05 -> 1.18), Fish Teardrop 1/8" r1/8 (0.60 -> 0.67), Fish Blended 1/8" r1/4 (0.26 -> 0.30),
  Fish Slight 3/16" r1/8 (0.44 -> 0.44), Shortboard Teardrop 3/16" r3/16 (0.29 -> 0.36).
- **Belly-plus-nose-concave boards that changed:** 3 of 8. Two Shortboards come back 0.03 mm closer, one of them with a 1/32"
  roll. The Longboard's 1/16" nose is renamed Teardrop at the same 0.82 / 0.15.

## Accepted costs (D-05), as measured

These are exactly the costs spike 007 reported to the founder before he said build:

- Nine boards' widest miss grows 0.01 to 0.13 mm (listed above).
- A Teardrop or a Slight Single Concave Entry often comes back named Blended Nose Concave (Slight: 48 back with a roll, and
  the same-name count across all 192 is 111 -> 110).
- About 1 s more to open the three nose files, and up to about 2 s on an app-written board tried for its dish. In the grid's
  parallel run, the average open of a rolled board went from 2.9 to 4.7 s.

## The one rewritten mf8 test (told to the founder before the build)

One of mf8's cases recorded that the Shortboard, written with a 3/16" Blended Nose Concave and a 1/16" Rail Roll, opened with
no roll and with the leftover centre belly. That is exactly what this task removes, so the case now records that the roll comes
back and the centre is flat. Its three removed lines (`git diff -U0 BASE -- '*.test.ts' '*.spec.ts' | grep -E '^-[^-]'`, which
prints nothing else):

```
-  it("a 1/16\" Rail Roll, whose grid answer is already under the millimetre gate: no retry, the grid's names and no roll", () => {
-    for (const key of KEYS) expect(polished[key].name).toBe(grid.bottom[key].name);
-    expect(noRollKey(polished)).toBe(true);
```

The new title is "a 1/16\" Rail Roll, whose grid answer is under the millimetre gate: the nose's dish brings the retry, and the
roll takes the leftover centre belly's place (quick 261125-v2f)". It still checks that the grid answer is under the gate. It
now also checks the following: the grid's centre holds a cut and no roll; the polished nose keeps the grid's name, with a roll
within 1/32" of 1/16"; the centre and tail are flat; the widest miss is strictly smaller.

**The tie's roll condition, in one sentence:** the founder's 0.05 mm allowance only applies when the concave that replaces the
belly actually carries a Rail Roll. Replayed on the spike's own results, this changes no answer.

## What it does not fix (out of scope)

- The Longboard's rails-first read: 15 of its 48 rolled boards come back with the roll, and the rest keep it in the rail.
- Keeping a Teardrop's or a Slight's own name.
- A roll on a flat nose (idea 5, D-04).
- The concave's own curve across the board.
- RAILS.

## Tests added

- `lib/export/brd-nose-roll.test.ts`: twelve round trips through the real import. **Seven rolled boards** come back as a nose
  concave with roll and depth within 1/16" and a flat centre and tail: the Mid-length Blended 3/16" r1/8, Fish Blended 1/8"
  r1/16, Mid-length Teardrop 1/8" r1/8, Mid-length Slight 3/16" r1/8 and r1/4, Mid-length Blended 1/4" r1/4, and the Fish Slight
  1/16" r1/8, which needs the founder's tie. **Five controls** come back as written with no roll: a centre Continuous Belly,
  a Rolled Belly Entry, and a Blended 3/16" with no roll on the Shortboard, the Mid-length and the Fish.
- `lib/geometry/brd-bottom.test.ts`:
  - The dish reading fires on a Blended 3/16" with a 1/16", 1/8" or 1/4" roll, and its seed gives back the written roll and
    depth within 1/64".
  - It shows nothing on a concave with no roll (Blended and Teardrop), a Rolled Belly Entry, a Reverse Vee Nose, a centre belly
    or a flat bottom.
  - The chooser's rules are checked in numbers: the tie (only with a roll), the two 0.25 mm bars, rounding noise, today kept
    when nothing passes, and fewest cuts.
  - A source check confirms none of the spike's switches were ported.

## Gates

- `npm test`: **242 files passed, 14093 tests passed, 2 skipped, exit 0** (524 s, load 33-53).
- `npx tsc --noEmit`: exit 0. `npx eslint` on the three touched files: exit 0.
- `PW_PORT=3147 npx playwright test e2e/brd-fit-preview.spec.ts e2e/board-file.spec.ts e2e/brd-home-weight.spec.ts --project=desktop --project=iphone --project=android`:
  **100 passed, 47 skipped, exit 0** (7.5 min). No screenshot baseline changed, and the working tree is clean after the run.
- `git diff --name-only BASE`: the three code files plus the re-packed archive. The removed test lines are only the three
  quoted above. The D-04 `git diff --quiet` exits 0.
- The eight .brd unit suites together: 448 passed.
- **Left for the orchestrator after the merge:** `npm run build` and `npm run test:e2e:prod`, neither of which runs in a
  worktree. Nothing was pushed and there was no migration.

## Deviations from Plan

None in the code: it is ported line for line from spike 007's recommended path, and the build reproduces the spike on all 296
grid boards and all twelve files. There are two notes on the measuring:

- The orchestrator's prompt said to leave the SUMMARY and the re-packed archive uncommitted, so they are left for it (the plan
  said to commit them).
- The after-run's open times were taken under a heavy load from the other build (30-46). So the twelve files were timed again,
  back to back at load 7-8, against a copy of the base code exported to scratch, and those paired times are the ones reported.
  Their digests equal the main runs.

## Human check (the founder, on localhost after the merge)

On the Mid-length, set BOTTOM's NOSE to a Blended Nose Concave 3/16" with a Rail Roll of 1/8". On 3D, Export .brd File and
save it. Open a board file… with that file. The preview's BOTTOM table should read a nose concave with Off Rail and a Rail
Roll in its Across cell, and Flat in the centre. Opened as a board, BOTTOM's NOSE should show the concave with a Rail Roll of
about 1/8", and the CENTER card should be Flat (before this change it showed a Continuous Belly). Then testLB.brd, 92Log.brd
and Scoop-Noserider.brd should open exactly as they did this morning.

## Commits

- `953a4ccf` feat(quick-261125-v2f): opening a .brd brings a nose concave back with its Rail Roll, without a stray belly in the centre
- `7707ee85` test(quick-261125-v2f): the app's own boards with a rolled nose concave open back with their roll, and real bellies stay bellies

## Self-Check: PASSED

- FOUND: lib/geometry/brd-bottom.ts, lib/geometry/brd-bottom.test.ts, lib/export/brd-nose-roll.test.ts, the re-packed archive
  (75 entries, no .brd)
- FOUND: commits 953a4ccf, 7707ee85
