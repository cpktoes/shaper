---
phase: 17-bottom-contours
scope: fix waves 17-17 to 17-23 (git diff 556162ba 93c0ea8f -- . ':!.planning')
reviewed: 2026-11-12T03:55:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - components/bottom/bottom-copy.ts
  - components/design/design-store.tsx
  - components/guide/words/volume.ts
  - components/rails/rail-section-plot.tsx
  - components/summary/bottom-contours-sheet.tsx
  - components/summary/bottom-sheet-fit.ts
  - lib/geometry/__fixtures__/phase17-channel-boards.ts
  - lib/geometry/__fixtures__/phase17-channel-litres-pin.json
  - lib/geometry/board-surface.ts
  - lib/geometry/bottom-draw.ts
  - lib/geometry/bottom.ts
  - lib/geometry/design.ts
  - lib/geometry/imported-readout.ts
  - lib/geometry/rail-bands.ts
  - lib/geometry/rail-bottom.ts
  - lib/geometry/volume.ts
  - scripts/extract-phase17-channel-litres-pin.ts
  - components/summary/bottom-sheet-fit.test.ts
  - lib/geometry/board-surface.test.ts
  - lib/geometry/design.test.ts
  - lib/geometry/phase17-channel-litres.test.ts
  - lib/geometry/rail-bottom.test.ts
  - lib/geometry/volume.test.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 17 fix waves (17-17 to 17-23): Code Review Report

**Reviewed:** 2026-11-12T03:55:00Z (2026-11-11 evening, Pacific)
**Depth:** standard
**Files Reviewed:** 23 (17 source files, 6 test files read only to judge what they really prove)
**Status:** issues_found

## Summary

The seven fix plans were read as one change: `git diff 556162ba 93c0ea8f -- . ':!.planning'`. They are already live.
Suspicions were tested by running the app's own `lib/geometry` functions from throwaway scripts, on the 49 channelled
fixture boards and on harder versions of them, and — for the litres and the 3D rings — by running the very same
checks against the code as it stood before the wave (`556162ba`). Every number below is one the code produced.

**Nothing found gives a shaper a wrong litres figure, a wrong DATA figure, a broken 3D board or a crash.** No blocker.

**Three things should be fixed or ruled on (WR-01 to WR-03):**

- On the Longboard's rolled rail with channels, RAILS' thin bottom line stops in mid-air at the last bottom mark, up
  to about 1/8" above where the tuck band starts, and the channel wall that stands under the tuck is not on the thin
  line at all. The printed order form's Rail Band Reference never draws the Finished Rail, so on paper that is all a
  shaper sees.
- A board from 9'7" to 10'0" with channels still prints only the first of the three notes on its tables sheet. "Make
  it fit" was done for the stock 9'0" Longboard and holds up to 9'6".
- The test that guards the channel boards' litres holds no board "to the last digit" (that branch never runs), and
  the soft-rail boards are held only inside 0.01 L and 0.15 L — two and a half to four times the change the wave
  actually made.

**What was checked and found sound:**

- **The solid board's sections (litres, 3D, CNC files).** 245 channelled boards — the 49 fixture boards as they are,
  then with channels 1/2" deep, With the rail, Toe-in, and at Off Stringer 0 with a 3" width — 14,205 sections,
  the tail roll's own stations included. No value that is not a number, no point of the underside above the deck,
  no fold (the underside never steps back outboard), every wall's top and foot on one line, every ring the board's
  own length. 646 of those sections stand a wall under the rail's curve. The same checks on the code before the
  wave give the same result, so the new layout broke nothing.
- **The litres, against an independent count.** Each section's ring was compared with a fine count (20,000 slices)
  of "the higher of the lifted rail and the channel's floor, under the deck". On the 152 sections with a wall under
  the curve the ring is within 1.7 mm² of it (about 0.05% of the section). Longboard sections that missed that count
  by up to 22.5 mm² before the wave are no longer among the worst. The largest misses left are on the Fish's swallow
  35 mm from the tail (25 to 45 mm² of about 1,000 to 1,350); they are the same to the digit before and after the
  wave, may be the probe's own reading of the notch, and were not chased.
- **A channel floor above the deck.** Never, on any of the above. Under the rail's curve the foam ends only where
  the channel's floor reaches the deck — the same rule as before the wave, now also read at the wall's own place, so
  9 more of the 14,205 sections end there (all on the 1/2"-deep versions).
- **RAILS' drawing.** 245 boards (stock, 1/2" deep, Off Stringer 0, With the rail, and with a Deep Single Concave
  centre), 294 sections that carry a bottom: no value that is not a number, nothing above the section's thickness,
  the Finished Rail's underside never above its own top side, channel points always in order.
- **Speed in the design store.** `railBandsOnTheBottom` now runs for every board on every change, but a flat board
  with no channels returns at once without sampling. On a channelled board it takes 2.4 ms on average (14 ms on the
  first call), and the Finished Rail's channel cut 0.4 ms a section, at most 969 line pieces. Not a slow screen.
- **Print fit — rows and sheets.** Every length from 8'0" to 10'0" by the inch, six tails, two noses, two centres,
  0/4/6/8 channels, both systems: 8,924 tables sheets, never less than 4.8 dots to spare. No row is clipped and the
  tighter rows never add or drop a sheet. (What does fall short is the notes — WR-02.)
- **Rule 1 and Rule 2.** No formula in a component; no `25.4`, no inch literal and no stray `10` outside
  `lib/geometry/units.ts` anywhere in the diff; the new 1/64" step is `inchesToMm(1 / 64)`.
- **RAILS against the solid board.** Both read the channel's floor as "the sections' foam plus the channel, straight
  up", from the same two functions (`sectionsFoamOff`, `channelFoamOff`), and both place walls from
  `channelWallsAt`. The one place they part is an edge case (IN-02).
- **The tests.** The volume, rail-bottom, design, board-surface and sheet-fit additions carry counters that fail if a
  loop checks nothing. The exception is WR-03.
- **Security.** Nothing new is read from a user, the network or the database. The new script reads and writes two
  fixed paths inside the repository.

Not run: the full unit suite, the browser suite, a dev server, `tsc`. Only
`lib/geometry/phase17-channel-litres.test.ts` was run (53 passed).

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: On a rolled rail with channels, RAILS' thin bottom line ends in mid-air at the last bottom mark

**File:** `components/rails/rail-section-plot.tsx:625-641` (the bottom line is drawn only for the `bottomConn`
piece, from the plot's own left edge to the last bottom mark), `lib/geometry/rail-bottom.ts:175-197`
(`railBottomLine` ends at `railDrawnBottom(to)`, channel and all), `components/summary/order-form.tsx:513-518` (the
printed plots are drawn without the Finished Rail)

**Issue:** The thin bottom line carries the channels only as far out as the last bottom mark. Its end point is the
channel's floor there. The tuck band that starts at the same mark is drawn from the bottom *without* the channel
(`onBottom(seg.p1)`), because channels never move a band. So wherever a channel is still cut at that mark, the
bottom line stops above the band's start with nothing joining them, and any wall further out — under the tuck — is
drawn on the thick Finished Rail only.

Measured on the stock soft-rail Longboard's tail section, channels on their starting numbers (the last bottom mark
is 3.1"–3.5" in from the rail):

| Tail | 4 channels | 6 channels | 8 channels |
|---|---|---|---|
| Flat | 0.093" | 0.056" | 0.051" |
| Rolled Vee | 0.115" | 0.087" | 0.094" |

With channels 1/2" deep the gap reaches 0.18". The Shortboard, Fish and Mid-length show none on their starting
numbers (their last bottom mark is about 3/8" from the rail, where no channel is cut), and no Hard Edge tail does.
A picture rendered from the app's own functions confirms it: the grey bottom line ends at the channel floor, the
green tuck band starts below it, and the wall at about 2.7" in appears only once the Finished Rail is switched on.

**Why it matters to a shaper:** On RAILS the Finished Rail is on by default and covers the break. With it switched
off, and always on the printed order form's Rail Band Reference (`RailSectionPlot` is given no `finishedRail`
there), a Longboard with channels shows a bottom line that stops short and no sign of the outer wall. The founder's
ruling was that channels are cut into "both lines"; on this rail the thin line shows only part of them.

**Fix:** A look question for the founder, with two honest answers:

1. Carry the thin line on. Draw the channelled bottom from the last bottom mark outboard to where the channels cut
   nothing more (or to the apex), as its own thin piece under the tuck bands, so every wall is on both lines.
2. Close it. End the thin line with a straight drop back to the bottom the band stands on:

```ts
// lib/geometry/rail-bottom.ts, railBottomLine (channel branch)
const end = { x: to, y: railDrawnBottom(bottom, to) };
const foot = railBottomFall(bottom, to);
return [{ x: from, y: railDrawnBottom(bottom, from) }, ...between, end, ...(end.y !== foot ? [{ x: to, y: foot }] : [])];
```

   Simpler, but it draws a wall at the mark that is not a real wall.

Either way add a test on `longboard|asis|soft` with its starting channels: the bottom line's last point and the
next band's first point are the same point (or the line runs on past the mark).

### WR-02: A 9'7" to 10'0" board with channels still prints one note of three on its tables sheet

**File:** `components/summary/bottom-sheet-fit.ts:273-288`

**Issue:** When all the notes do not fit under the regular rows, the rows are tightened and the notes are then added
one at a time until one does not fit. For the stock 9'0" Longboard (19 rows) all three fit. The tables gain a row
at 9'1" and another at 9'7"; from 115" to 120" (21 rows) with any channels, tight rows leave 55.8 dots after the
first note and the other two need about 25 to 30 more. Measured, every inch from 115" to 120", 4, 6 and 8 channels,
every centre and tail cut, both systems: 1,296 layouts, each printing 1 note of 3. The two that drop are the
"Layout marks" note — the one that explains the channel columns — and the reference-rows note. Without channels
every length up to 10'0" prints all its notes (tightest: 4.8 dots to spare at 115").

The code and the plan say this on purpose ("only a hand-set board longer than any stock board stops short"), and
17-23's summary reports the stock Longboard only. But the founder's words were "the 9'+ Longboard's printed tables
sheet must keep all three notes", and 10'0" is a length the app offers (`BOARD_LENGTH_RANGE_IN.max`). The new test
(`bottom-sheet-fit.test.ts`, "the 9'+ Longboard's tables sheet prints every note") reads the ten Phase 16
Longboards, all 9'0", so it cannot see this.

**Why it matters to a shaper:** A 9'8" or 10'0" log with channels prints its tables without the sentence that says
how to read the channel marks. No row or figure is lost.

**Fix:** First make it visible: run the same test over `longboard|asis|soft` at every 6" from 9'0" to
`BOARD_LENGTH_RANGE_IN.max` with 0 and 8 channels. Then one of:

- find the 25 to 30 dots — the notes are counted at 116 letters a line, which the file itself says is "sometimes one
  over" (the channel note's 402 letters count as 4 lines); a measured line count for the tables sheet's full width,
  or a second tightening step (the two table headings, the gaps between notes), may be enough;
- or let the tables sheet's notes run in two columns under the tables;
- or take it to the founder as it is and correct the comments and 17-23's summary to say "up to 9'6"".

### WR-03: The channel litres test holds no board exactly, and the soft-rail boards only loosely

**File:** `lib/geometry/phase17-channel-litres.test.ts:44-47`, `:82`, `:114-125`;
`scripts/extract-phase17-channel-litres-pin.ts:29`

**Issue:** The test sorts the 49 boards into three rules. Run today, the split is 0 / 25 / 24:

- "the pinned litres to the last digit" — **no board**. On all 49 the outer channel reaches the rail somewhere near
  the tail, so the branch at `:117-118` never runs, and nothing in the file fails if it never does. The file's
  header still lists it as the first relation the test holds. (17-20's summary does say "none".)
- Hard Edge tails within 0.00001 L — 25 boards. Tight, and real.
- everything else within a cap — 18 boards within 0.01 L, 6 Longboards within 0.15 L. The wave moved them by at
  most +0.0025 L and +0.0634 L. So the cap is four times the Shortboard's real change and about two and a half times
  the Longboard's.

The litres the app shows today for a soft-rail board with channels are therefore not written down anywhere. A later
change could move a channelled Longboard by 0.08 L — most of a step on the rack card's one-decimal litres — and
this file would stay green. The mesh-against-litres tests would not catch it either: they compare the 3D board with
the litres, and both would move together. The shape tests in `volume.test.ts` would catch a change of rule at the
few sections they read; nothing holds the total.

Separately, the pin can never be made again: the script refuses to run once `volume.ts` names `sectionsOffAt`, and
the test checks that it refuses. If a preset is re-captured or the channels' starting numbers change, the "before"
figures go stale with no way to refresh them, and the test will have to be deleted rather than regenerated — the
opposite of Rule 1's "regenerate the fixture".

**Fix:** Write today's litres down with an ordinary, re-runnable generator, and hold them exactly:

```ts
// scripts/extract-phase17-channel-litres-golden.ts -> __fixtures__/phase17-channel-litres-golden.json
// (same boards, same toPrecision(17), no refusal — regenerate whenever the maths is meant to move)
it.each(BOARDS)("$label: today's litres to the last digit", ({ label, fields }) => {
  expect(summarizeDesign(fields).volumeLitres.toPrecision(17)).toBe(GOLDEN.litres[label]);
});
```

Keep the before-pin only for what it is — a record of the one-time change — and either delete the "exact" branch or
add `expect(ROWS.some((r) => r.rule === "exact")).toBe(false)` with a line saying why, so the header and the test
agree.

## Info

### IN-01: Sections with a negative area at the tail roll's own stations (there before this wave)

**File:** `lib/geometry/volume.ts:1497` (the section's area is the built area plus the ring's change),
`lib/geometry/volume.ts:1858` (`tailRollFoam` multiplies that area)

**Issue:** On the Fish with a Rolled Vee and channels, the sections the tail roll reads 1.9 mm and 4.3 mm from the
tail come back with a negative area (stock fixture `fish|soft|rolled-vee|4`: −34 and −27 mm²; up to −65 mm² at
1/2" deep). The built area there is the un-rolled figure, while the cut's change is measured on the rolled ring, and
near a swallow's prong tips the two do not agree. `tailRollFoam` then adds a few dozen cubic millimetres back. The
effect on the litres is well under 0.001 L. The same boards give the same figures on the code before the wave, so this
is not charged to it; it is recorded because "a negative value reaching the litres" was asked about.

**Fix:** Hold a section's area at 0 from below in `bottomed` (`Math.max(0, …)`), or measure the cut's change on the
same un-rolled half the built area describes. Low priority.

### IN-02: Where a channel is as deep as the rail is thick, RAILS holds it at the deck and the solid board ends the foam

**File:** `lib/geometry/rail-bottom.ts:88` and `:333` (held at `boardThickness`), `lib/geometry/volume.ts:1138-1163`
(the foam ends where the underside meets the deck)

**Issue:** RAILS draws a channel floor that would pass the deck as a flat at the section's thickness, with the rail
carrying on outboard of it. The litres, the 3D board and BOTTOM's section end the board at that point instead (the
first review's WR-01, still open with the founder). RAILS also holds against the section's flat thickness, not the
deck's own height near the rail's outermost point, which is lower. No stock board, and none of the 245 harder ones
tried here (channels at 1/2"), reaches either case at a RAILS section, so this is a note for whoever settles that
earlier finding: the two drawings should end up with one rule.

**Fix:** None now. When the deep-channel rule is decided, give `railSectionBottom` the same answer.

### IN-03: The section gauge's comment names two different places for the rail lift

**File:** `lib/geometry/bottom-draw.ts:942-948` (the comment), `:982` (the read)

**Issue:** The comment says the rail lift is "the vee's or belly's lift at the rail edge that remains (D-40), the
very figure DATA's Rail lift column reads". The code reads it at the outline's rail (`board.railAt(s)`), as DATA
does and as the founder ruled ("Match DATA"), and draws the tick at the drawing's rail edge (`drawing.railEdge`).
Those are the same place except where a vee has ended the foam inboard of the outline; there the figure is the lift
at the outline's rail (held at the slab's thickness) drawn beside a knife edge that stands lower. The behaviour
matches the ruling; the comment does not say which place wins.

**Fix:** Reword the comment: "read at the outline's rail, as DATA reads it; where the foam ends inboard of that the
tick still stands at the drawn edge".

---

_Reviewed: 2026-11-12T03:55:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
