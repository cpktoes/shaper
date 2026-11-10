---
phase: 17-bottom-contours
fixed_at: 2026-11-10T20:16:17Z
review_path: .planning/phases/17-bottom-contours/17-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 2
skipped: 2
status: partial
---

# Phase 17: Code Review Fix Report

**Fixed at:** 2026-11-10T20:16:17Z
**Source review:** .planning/phases/17-bottom-contours/17-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (CR-01, WR-01, WR-02, WR-03)
- Fixed: 2 (CR-01, WR-03) — both are fixes to the board's maths, so both are marked for a human look
- Skipped: 2 (WR-01, WR-02) — both wait for the founder's ruling; no code was changed for either
- Out of scope, untouched: IN-01, IN-02, IN-03

The orchestrator ruled which findings to fix before this run: CR-01 and WR-03 fixed, WR-01 and WR-02 left for the
founder, the three Info findings not touched.

## Fixed Issues

### CR-01: Channels "With the rail" plus Off Stringer give a not-a-number at a narrow tail — wrong litres, a collapsed 3D tail and wrong CNC files

**Status:** fixed: requires human verification (a fix to the board's maths — the tests prove it, a shaper's eye should confirm it)
**Files modified:** `lib/geometry/bottom.ts`, `lib/geometry/volume.ts`
**Tests added in:** `lib/geometry/bottom.test.ts`, `lib/geometry/volume.test.ts`, `components/bottom/bottom-copy.test.ts`
**Commit:** a7cb13b1

**What was wrong, in the shaper's terms.** With channels laid With the rail and Off Stringer set above nothing, the
last inch or so of a narrow tail is narrower than the flat the shaper asked to keep beside the stringer. There is
no room for a channel there, but the maths still laid one of no width, and its depth came out as "not a number".
That one bad figure was read as "the foam ends here", so the tail's sections were cut short: the litres dropped by
up to about three times what the channels really take off, and the 3D board and the CNC files pinched at the tail.

**Applied fix — the review's three parts, exactly:**

1. A channel is kept at a station only where it has real width there — more than half a millimetre, measured from
   the stringer side of the board. Where there is no room, no channel is laid (`channelEdges`).
2. A channel of no width takes nothing off (`channelFoamOff`).
3. The section builder itself now treats a cut that is not a real number as "nothing taken off here", and never as
   "the foam ends here" (`bottomedHalfSection` in `lib/geometry/volume.ts`). This is the safety net: no future bad
   figure can pinch a board again.

**How With-the-rail channels narrow is unchanged** wherever they still have real width — a test rules them at every
1/8" from the tail to their Start and holds the walls to the same rule as before, and that test passes on the old
code and the new alike. Only a channel of no width is dropped.

**The litres, before and after** (how much the channels take off the board):

| Board, channels, Off Stringer 1/2" | Before | Now | Same board at Off Stringer 0 |
|---|---|---|---|
| Midlength, 6 at 1" | 0.4224 L | 0.1446 L | — |
| Shortboard, 8 at 3/4" | 0.2900 L | 0.1140 L | 0.1136 L |
| Shortboard, 6 at 1" | 0.3210 L | 0.1461 L | 0.1458 L |
| Longboard, 4 at 3/4" | 0.1114 L | 0.0719 L | — |

No board with Off Stringer at nothing changed its litres.

**The orchestrator's question — can the "last wall … off the rail" read-out go below nothing? Yes, it could.**
Nothing holds the Off Stringer slider (0 to 9") against the board's width, so on a narrow tail the worked-out
distance from the last wall to the rail went negative: on the Shortboard with 4 channels from Off Stringer 7", and
on the Midlength as far as about 1 3/4" below nothing at 9". The Channel Width line could then have read
`last wall -1 3/4" off the rail`. The read-out is now held at nothing in the maths (`channelReadout`), with a test
across the whole slider on all five boards and 4, 6 and 8 channels, and a second test on the words themselves in
both Imperial and Metric. No wording was changed. The printed Bottom Contours sheet never prints this figure.

**Tests added (8):**

- `lib/geometry/bottom.test.ts` — a new group, "CR-01: With-the-rail channels and an Off Stringer, where the tail
  is narrower than the flat and the last wall's keep", five tests: no channel of no width, and nothing ruled where
  there is no room; ruled exactly as before where a channel has real width; the foam taken off is always a real
  number, never below nothing and never more than the Depth; the sections end their foam only where the same board
  at Off Stringer 0 ends it, and the litres taken off agree within 0.03 L; the read-out never reads below nothing.
- `lib/geometry/volume.test.ts` — "a cut that is not a number takes nothing off and never ends the foam".
- `components/bottom/bottom-copy.test.ts` — "Channel Width never reads a distance below nothing, anywhere on Off
  Stringer's slider", once for Imperial and once for Metric.

Every expected value is a relation worked from the app's own functions (Rule 1) — no number was typed by hand.
Run against the code as it stood before the fix, five of the six `lib/` tests fail (the sixth, "ruled exactly as
before", passes on both, which is its point).

**Worth a human look:**

- The review said the Longboard and the Fish did not show the fault. Both did. The Longboard's litres were wrong
  too (the table's last row). The Fish produced the bad figure with 4 channels, though its litres did not move.
- Under With the rail a channel half a millimetre wide or less is now dropped rather than drawn as a sliver. That
  can also happen at Off Stringer 0, right at the tail's tip. It makes no measurable difference to the litres.

### WR-03: The section drawings never get the litres' knife edge — the screen and the printed sheet draw foam the litres and the 3D board do not have

**Status:** fixed: requires human verification (a fix to what is drawn — the tests prove the rule, the look is the founder's)
**Files modified:** `lib/geometry/bottom-draw.ts`, `components/design/design-store.tsx`, `components/bottom/bottom-section.tsx`, `components/summary/bottom-contours-sheet.tsx`
**Tests added in:** `lib/geometry/bottom-draw.test.ts`, `components/design/design-store.test.ts`
**Commit:** 1582dd7a

**What was wrong, in the shaper's terms.** Where a deep vee or deep channels cut right through the rail near a
tip, the litres, the 3D board and the CNC files end the foam at that knife edge (D-40). The section drawing worked
the edge out by its own rougher estimate, so on those few stations it drew foam further out than the board has —
up to about 9 mm (3/8") on a Shortboard with six channels 1/2" deep.

**Applied fix.**

- A small pure helper, `builtSectionAt(input, station)` in `lib/geometry/bottom-draw.ts`, builds the litres' own
  section at the one station a drawing shows, from the very input the litres are counted from. On a bottom that
  cuts nothing it builds nothing at all.
- The design store hands that out as `bottomSectionAt(station)`, so neither drawing builds a section of its own —
  the same rule the store already follows for the litres (the checker's W1). No formula sits in a component.
- Both drawings pass it on as the drawing's `seam`: the section on the BOTTOM screen
  (`components/bottom/bottom-section.tsx`) and each section on the printed Bottom Contours sheet
  (`SectionFigure` in `components/summary/bottom-contours-sheet.tsx`).
- On the screen it is remembered between redraws like the editor's other drawing work, and is rebuilt only when
  the board or the station changes. One section costs a quarter of a millisecond or so to build, so it does not
  need to be put off behind the drag.

**What changes for the shaper, and what does not.**

- Changes: only at stations where the foam really is cut through. With a Rolled Vee lifted 1/2" or six channels
  1/2" deep that is between 2 and 13 of a board's drawn stations, all near a tip. The rail-lift reading on the
  section follows the rail as drawn, so it moves with the rail on those same stations.
- Does not change: a flat bottom, and every stock starting bottom everywhere except the last few inches of a tip
  (the tail's last inch for Panel, Spiral and Rolled Vee and for 4 channels, its last 3" for 8 channels on the
  Midlength; the nose's last 4" for a Rolled Belly Entry). That is 14 of the 6,120 station-and-bottom pairs checked.
  Those draw exactly as before, point for point. **No printed section of a stock starting bottom changes** — the
  sheet prints each cut at its deepest station, and none of those has a knife edge.

**Tests added (8):**

- `lib/geometry/bottom-draw.test.ts` — a new group, "WR-03: a drawn section ends its foam where the litres end
  it", seven tests:
  - the helper's section is the litres' own: at each of the litres' stations it equals the one in their list, and
    at any other station the one the litres' builder makes there;
  - a flat bottom builds no section, and its drawing is the one it has always been;
  - one test per stock board (Shortboard, Fish, Midlength, Longboard): on every stock starting bottom — each named
    cut alone, the opening set, and 4, 6 and 8 channels — at every inch from tail to nose and at every station the
    sheet prints, the drawing with the litres' section is the same as the drawing without, point for point and
    reading for reading, wherever that section has no knife edge; and no printed station has one;
  - where the litres end the foam (Shortboard and Midlength with six channels 1/2" deep, Shortboard with a Rolled
    Vee lifted 1/2", Fish with a Panel Vee 1/2" deep) the drawing ends it at the same place, and at least one
    station on each board used to be drawn further out.
- `components/design/design-store.test.ts` — "a drawn section's knife edge comes from the litres' own input, on
  the screen and on the printed sheet": the store's reader builds from the litres' input alone, both drawings hand
  it to the drawing, and neither builds a section itself. The old code fails this test.

**No existing test or fixture changed value.** No test pinned the old drawing for a knife-edged case, so none had
to be updated, and no golden fixture moved.

## Skipped Issues

### WR-01: A channel cut deeper than the foam ends the whole board at that channel's wall

**File:** `lib/geometry/bottom.ts:766-771` with `lib/geometry/volume.ts:1094-1117`
**Reason:** skipped: awaiting the founder's ruling. No code was changed. This is the same deliberate rule as D-40's
knife edge — where a cut reaches the deck the foam ends — applied to a channel, and the screen already warns the
shaper when a channel goes deeper than the foam. Whether a channel should be held to a floor instead is the
founder's to rule.
**Original issue:** A concave is held to the 1/4" stringer floor, but a channel's depth is added with no limit.
Where a channel is deeper than the foam above it, the section ends at that channel's wall, and everything outboard
of it — the rest of the bottom and the rail — leaves the litres, the 3D board and the STL.

### WR-02: "With the rail" squeezes every channel to nothing at the pod — the outer channels never run out through the rail (contrary to D-10)

**File:** `lib/geometry/bottom.ts:864`
**Reason:** skipped: awaiting the founder's ruling. No code was changed. The code follows the final sketch's rule
(the whole set narrows together toward the pod); D-10's words say the outer channels should run out through the
rail instead. Which of the two is the board he wants is the founder's to rule. CR-01's fix was kept clear of it:
it drops only a channel of no width and leaves the way the set narrows untouched (proved by a test, above).
**Original issue:** D-10 says that once the gaps have closed the outer channels run out through the rail, "never
pinching every channel". The code divides the width left between Off Stringer and Off Rail equally among all the
channels on a side, so they all narrow together, and the 1" pinch rule then shallows all of them at once.

## Out of scope (not touched)

- **IN-01** — one bad sample blanks the whole top view (`lib/geometry/bottom-draw.ts:161`, `:229`).
- **IN-02** — the channels' floor warning speaks only of the rail (`components/bottom/bottom-copy.ts:263-272`).
- **IN-03** — a comment on "rail lift" that is narrower than the rule (`lib/geometry/design.ts:313-316`).

## Verification

**Where it ran:** in the branch's own checkout,
`/Users/kontoes/Code/shaper/.claude/worktrees/beautiful-fermi-ad3fb7`, on `claude/beautiful-fermi-ad3fb7` — the
same tree the two commits sit in. No separate isolated worktree, temporary branch or recovery marker was made for
this run (the orchestrator directed the work to this checkout), so these numbers can be reproduced from this tree
as it stands. The founder's own checkout was not touched. Nothing was pushed.

Each check was run on its own, after the second commit (1582dd7a):

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean, exit 0 |
| `npm run lint` | 0 errors, 1 warning — the known one at `lib/db/import-designs-action.test.ts:42`; no new warning |
| `npx vitest run --testTimeout=120000` (the whole suite) | 209 files passed of 209; 12,074 tests passed, 2 skipped, 0 failed; exit 0; 708 s |

The two skipped tests are the long-standing sample-PDF writers that only run when asked to write a file
(`components/template/build-strip-pdf.test.ts`, `components/template/build-template-pdf.test.ts`). No sweep timed
out.

Per fix, before each commit: the changed lines were re-read, the changed files type-checked and linted, and the
test files around the change run (CR-01: 4 files, 1,786 tests; WR-03: 18 files, 650 tests — all passed).

**Not run, by the run's rules:** the browser tests (Playwright), a production build and a dev server.

## Browser tests believed affected

They could not be run here, so every `e2e/bottom-*.spec.ts`, `e2e/phone-bottom.spec.ts` and
`e2e/summary-*.spec.ts` that touches the section drawing or the printed sheet was read instead.

**None is believed to fail.** The ones that come closest, and why each should still pass:

- `e2e/bottom-metric.spec.ts` — the only browser test that works out the section drawing itself (without the
  litres' section) and holds the page's readings to it. It looks at the Shortboard with a Deep Single Concave, a
  Spiral Vee and six channels, at the channels' deepest station (11" from the tail). Checked by hand with the app's
  own maths: that station has no knife edge, the rail is drawn at the same place with and without the litres'
  section, and the readings are identical. It would only disagree if its board were changed to one cut through at
  the station it looks at.
- `e2e/bottom-panel.spec.ts` — collects the section's drawn paths for the five vees and asks only that the five
  differ from one another; reads the Channel Width line at each count's starting width (still a real distance off
  the rail, so unchanged); never picks With the rail together with an Off Stringer.
- `e2e/bottom-viewer.spec.ts`, `e2e/bottom-screen.spec.ts`, `e2e/bottom-saving.spec.ts`, `e2e/bottom-wings.spec.ts`,
  `e2e/phone-bottom.spec.ts` — read the section's name, height, size and place on the screen, and litres read off
  the page itself; none reads the rail's end.
- `e2e/summary-bottom-page.spec.ts` — counts the printed sections and checks they are shown; its boards are stock
  starting bottoms, whose printed sections do not change.
- `e2e/desktop-baseline.spec.ts` — has no BOTTOM picture among its six baselines, so no baseline needs re-making.

No browser test sets channels With the rail and then moves Off Stringer, so none exercises CR-01's case.

---

_Fixed: 2026-11-10T20:16:17Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
