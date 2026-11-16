---
quick_id: 261115-mc1
status: complete
date: 2026-11-15
base: 3bc3b5a6fbfeaaa6a974f255170a1744a3d7abf0
commits: [b8f47313, 35bffc0a, 1ae0c553]
actuals:
  tokens: 120000
  tasks: 3
  commits: 3
---

BASE: 3bc3b5a6fbfeaaa6a974f255170a1744a3d7abf0

# Quick 261115-mc1: a double concave's trough runs Parallel, Centered or By hand

## What changed, in plain English

Every double concave (Early Double Concave in the center, Double Concave Exit and the Spiral Vee on the tail) now has a
**Trough** menu on BOTTOM, between Off Stringer and the station sliders:

- **Parallel** (where every double opens, and where every saved board stays): the trough sits the same distance off the
  stringer all the way along, as it always has. Trough At is the slider, shown only here.
- **Centered**: the trough sits halfway between the flat's edge and the cut's edge (the Off Rail line) at every station,
  so it follows the outline in toward a narrow tail: further from the stringer forward, closer toward the tail. There is
  no distance to set, so Trough At goes away.
- **By hand**: two sliders, **Trough at Start** and **Trough at End** (1/2" to 8", 1/16" steps, 1 mm in Metric), and the
  trough runs straight from one to the other, like a batten laid between two marks. Past either end it holds that end's
  figure. Picking By hand changes nothing on the board at first: both ends start at the old Trough At, and the board moves
  only when a slider does.

Everything that reads the trough follows the rule: the foam taken off (so the litres, the 3D board and the .brd file),
BOTTOM's dotted trough line, DATA's Tail trough column, the 1/4" floor check, and the printed BOTTOM CONTOURS sentence.
The rule and both By-hand distances are saved with the board, in a board file and in the kept open board; a bad stored
value is dropped on its own and never costs the board its cut. Opening a .brd still fits a double as Parallel
(`lib/geometry/brd-bottom.ts` is untouched).

## What the shaper sees (the words, for marking up)

All in `components/bottom/bottom-copy.ts` (`BOTTOM_COPY`) and `lib/geometry/bottom-print.ts`; one edit each to change.

- Menu label `Trough`; spoken name `Tail Trough` / `Center Trough`; options `Parallel` · `Centered` · `By hand`.
- Sliders `Trough at Start` and `Trough at End`, read like Trough At: `4" from the stringer`.
- The muted line under the menu:
  - Parallel: "The same distance off the stringer all the way along, pulled in only where the cut runs out of room."
  - Centered: "Halfway between the flat and the edge at every station, so it follows the outline in toward a narrow tail."
  - By hand: "A straight line from where you set it at the Start to where you set it at the End."
- Printed sentences (Parallel's is today's, unchanged):
  - Parallel: `...; 1" off the rail, flat 3/4" and trough 3" off the stringer.`
  - Centered: `...; 1" off the rail, flat 3/4" off the stringer and trough centered between the flat and the edge.`
  - By hand: `...; 1" off the rail, flat 3/4" off the stringer and trough 4" off it at the start, 1 1/2" at the end.`

## What it does on the Shortboard's Double Concave Exit

Read from the shipped code through the browser test (DATA's Tail trough column, inches off the stringer):

| Rule | 6" from tail | 12" | 18" |
|---|---|---|---|
| Parallel | 3 | 3 | 3 |
| By hand, 4" at Start, 1 1/2" at End | 1 3/4 | 2 9/16 | 3 5/16 |
| By hand, 1 1/2" at Start, 3 1/2" at End | rising toward the tail, on the straight line |  |  |
| Centered | (planner's measure) 2.59 | 3.42 | 3.97 |

The Centered row is the planner's measurement; the browser test proves each Centered cell is within 1/16" of the midpoint
of the same row's flat and edge, and the section picture shows the trough at 3 5/16" (11" from the tail) against
Parallel's 3". Pictures for the founder to look at are in `pictures/` (seven): BOTTOM's drawing under Parallel,
Centered and By hand on a computer and an Android phone, and DATA's layout marks under By hand on a computer.

## Proof that nothing else moved

- No existing test line, fixture, pin or baseline changed since BASE: the only edited test file is
  `lib/models/design-snapshot.test.ts` and its diff is additions only. `lib/geometry/__fixtures__`,
  `lib/geometry/brd-bottom.ts` and every `e2e/*-snapshots` baseline are untouched (`git diff --name-status` against BASE
  lists only the ten expected files).
- A newly picked double stores no new key. Explicit Parallel is bit-identical (`Object.is`) to an absent rule, and a
  just-switched By hand is bit-identical to Parallel, on every one of the 40 phase16 boards x three doubles x both wing
  rules (foam at every 1/2" station x 61 points, DATA's marks, the printed words).
- Whole unit suite: 237 files, 13866 passed, 2 skipped. `npx tsc --noEmit` clean. `npm run lint`: 0 errors, 1
  pre-existing warning (`lib/db/import-designs-action.test.ts`).
- Browser: `e2e/bottom-trough.spec.ts` passes on desktop and android; the ten existing BOTTOM specs (guide, metric,
  panel, saving, screen, side-view, viewer, wings, phone-bottom, summary-bottom-page) on desktop and android: 95 passed,
  0 failed (51 skipped by their own project guards); `desktop-baseline.spec.ts`: 6 passed, no baseline changed.

## One question for the founder: where By hand's two ends are held

The brief suggested keeping each By-hand distance against the cut's half-width at **its own station**. The plan chose
instead to keep Trough at Start and Trough at End **exactly as Trough At is kept today**: against the cut's half-width
at Deepest At (at least the flat + 1/4", at most 85% of it), and then the drawing, DATA and the foam apply the same
clamp station by station.

Why: a Spiral Vee ends at the tail, where on the Shortboard and Mid-length the cut is only about 1" wide. Holding End
against that 1" would pull the End slider in to about 3/4"-7/8" the moment By hand was picked, and the whole trough
would swing in toward the stringer (at 6" from the tail, from 3" to about 1 7/16"), breaking "switching to By hand
changes nothing". Keeping it like Trough At means switching changes nothing on any board (proven), and the End slider
stays free.

The cost, the same one Trough At already has: where a cut runs out of room near a narrow tail, the drawing pulls the
trough in there while the slider keeps the figure you set. So on a Spiral Vee run out to a narrow tail, a By-hand End of
3" will still be drawn at about 7/8" in the last inch or two, and the slider will still read 3".

**Question: is that fine, or would you rather the End slider itself refuse to go past what the cut has room for at the
End (it would then read about 3/4" on a narrow-tailed Spiral Vee and switching to By hand would pull the trough in)?**

## Deviations from Plan

None of substance. Two notes:

- The Trough menu lists all three rules from the start of Task 2 on (Task 1 showed Parallel and Centered only, as planned).
- `bottomCutSchema` has a small `.transform` that deletes an unset or bad `troughRun` / `troughStart` / `troughEnd` key,
  because zod's `.optional().catch(undefined)` leaves an `undefined` key behind and the plan asked for the key to be
  genuinely absent (so a board that never chose a rule stores and reads back exactly its old keys).

## Known Stubs

None.

## Threat Flags

None. The only new surface is three optional fields on a stored cut, each forgiving on its own (T-mc1-01), a
division guarded by the Start-equals-End case and clamped (T-mc1-02), and no fixture or baseline re-recorded (T-mc1-03).

## Notes for the next person

- Worktree browser runs need `rsync -a --link-dest=<main>/node_modules <main>/node_modules/ <wt>/node_modules/` first
  (the worktree's own `node_modules` held only `.vite`, so `next dev` could not start); `node_modules` is ignored by git.
- The first full run of the BOTTOM unit batch alongside `tsc` and `eslint` timed out one load-sensitive test once; it
  passed alone and in the full suite.

## Self-Check: PASSED

Files found: `lib/geometry/bottom-trough.test.ts`, `e2e/bottom-trough.spec.ts`, the seven pictures. Commits found:
b8f47313, 35bffc0a, 1ae0c553.

## The founder's ruling, 2026-11-15

On the open question — near a narrow tail, which gives way, the drawing or the End slider — the founder chose **"The drawing
pulls in, the slider keeps your figure"**: By hand's two ends stay held against the cut's width at Deepest At, as Trough At
is, so switching to By hand never moves the trough. As built; nothing changes.
