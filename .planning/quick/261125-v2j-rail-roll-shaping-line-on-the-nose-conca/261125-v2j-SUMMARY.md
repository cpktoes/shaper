---
phase: quick-261125-v2j
plan: 01
status: complete
subsystem: bottom-guide, printed-bottom-page
tags: [guide, words, print, order-form, bottom, rail-roll]
requires: [quick-261125-mf8 (the Rail Roll on BOTTOM's nose concaves)]
provides:
  - RAIL_ROLL_HOW and guideHowOnPaper (components/bottom/bottom-guide-words.ts)
  - BottomSheetLayout.topViewRoom; bottomTopViewBox's room cap
affects: [BOTTOM's GUIDE tab, the order form's BOTTOM CONTOURS page]
tech-stack:
  added: []
  patterns: [the fit rule gives the picture's room by whole dots instead of the browser squeezing it]
key-files:
  created: []
  modified:
    - components/bottom/bottom-guide-words.ts
    - components/bottom/bottom-guide-words.test.ts
    - .planning/milestones/v1.5-phases/17-bottom-contours/17-GUIDE-WORDS.md
    - components/summary/bottom-sheet-fit.ts
    - components/summary/bottom-sheet-fit.test.ts
    - components/summary/bottom-contours-sheet.tsx
    - e2e/helpers/bottom-print.ts
    - e2e/summary-bottom-page.spec.ts
    - e2e/summary-planing.spec.ts
decisions:
  - "The Rail Roll's line ends the How to shape of the three nose concaves on the GUIDE always, and on paper only when the board's nose concave has a Rail Roll above 0"
  - "When a printed bottom page's own parts fill it after its tables have left, the bottom picture is drawn the fewest whole dots smaller that make it fit; the tables' sheet decision is unchanged, so no board prints a sheet more or fewer"
metrics:
  duration: about 1 h 10 min
  completed: 2026-11-25
actuals:
  tokens: 12500
  tasks: 3
  commits: 3
---

# Quick 261125-v2j: The Rail Roll's shaping line on the nose-concave cards, and a printed page that never runs off

**The founder's Rail Roll line now ends the How to shape on BOTTOM's three nose-concave GUIDE cards, and it prints on the
BOTTOM CONTOURS page only when the board's nose concave actually has a roll. A page whose drawings and notes fill it now draws
the bottom-from-above picture a few dots smaller, by rule, instead of running over the sheet.**

## What changes for a shaper

**On the GUIDE.** The Teardrop Nose Concave, the Blended Nose Concave and the Slight Single Concave Entry now end their How to
shape with, word for word:

> Cut the concave first. Then plane from its edge out to the rail, taking the Rail Roll off at the rail, and blend it smooth.

It shows on those three cards every time, in Imperial and in Metric (there is no number in it). Every other card, and every
card's picture, is unchanged. The founder's words page (`17-GUIDE-WORDS.md`) has the same line on cards 3, 4 and 5, plus a dated
note saying when paper prints it. The test that holds the page and the code together line for line still passes.

**On the printed page.** A nose concave's How to shape on the BOTTOM CONTOURS page ends with the line only when that board's
nose concave has a Rail Roll above 0, the same rule the printed cut sentence already uses for the roll. With no roll, the page
prints exactly the note and the layout it always did.

## Why the Fish ran 3.5 dots short, and the fix

With the line added, the stock Fish's Teardrop note is one line longer on paper (from 3 lines to 4, about 14 dots on a phone's
sheet). That Fish, with a cut in every section and 8 channels, already sends its two tables to their own sheet, and once they
leave, the page holds only the bottom from above, the cross-sections and the notes. It had 10.3 dots to spare. One more line
took 13.8, so it came up 3.5 short.

The real gap was in the layout rule. It only ever knew how to move the **tables** (to their own sheet, then their notes, then
one table a sheet). It assumed the picture, the sections and the notes always fit once the tables had gone. When they didn't,
the browser quietly squeezed the bottom picture, labels and all, and no test saw it.

**The fix:** the bottom-from-above picture is the one part of the page built to give way, so the rule now gives it room itself.
When the page's own parts would leave less than the 4-dot hairline, the board inside the picture is drawn one whole dot smaller
at a time until the page fits, and no smaller than that. Only the board shrinks. The NOSE/CENTER/TAIL/CHANNELS names, the
labels and the Start/Deepest/End rows under it stay full size. Whether the tables get their own sheet is still decided the old
way, so **no board prints a sheet more or fewer**.

- Stock Fish, every cut, 8 channels, 1/8" Rail Roll on the Teardrop: the board is drawn in 153 dots of room instead of 161
  (95%). Page spare -3.54 → 5.02 dots.
- The same Fish with no roll: unchanged (161 dots, 10.26 spare).
- Stock Longboard with a roll: unchanged (113 dots, 47.78 spare). Its page has plenty of room.

## Boards without a Rail Roll whose printed picture changes

I re-ran the full "split's reach" layout sweep: 4 shapes × 20 lengths (4'0" to 12'0") × 3 widths × 11 bottoms × 2 systems,
5,280 layouts with a cut. I compared it line by line with the same sweep run before any change. **Only the picture's room and
the page spare moved, and only on the 94 layouts that didn't fit before.** Every other field of every layout is identical. The
94 are 47 boards, each in Imperial and Metric, and every one has a cut in every section and 8 channels on a board wide for its
length. All 47 are now drawn at **166 dots** of board room. Before the fix the browser was squeezing these pictures by up to
about 21 dots. Now the rule does it, by whole dots, labels untouched. After the change the tightest page in the sweep has 4.35
dots to spare.

| Shape | Length × width (inches), natural room → 166 dots |
|---|---|
| Shortboard | 48×16 (180), 48×18.75 (190), 48×25 (190), 54×18.75 (187), 54×25 (190), 60×18.75 (169), 60×25 (190), 66×25 (190), 72×25 (187), 78×25 (173), 96×31 (174) |
| Fish | 48×16 (180), 48×20.25 (190), 48×25 (190), 54×20.25 (190), 54×25 (190), 60×20.25 (182), 60×25 (190), 66×25 (190), 72×25 (187), 78×25 (173), 96×31 (174) |
| Mid-length | 48×16 (180), 48×21.25 (190), 48×25 (190), 54×21.25 (190), 54×25 (190), 60×21.25 (190), 60×25 (190), 66×21.25 (174), 66×25 (190), 72×25 (187), 78×25 (173), 96×31 (174) |
| Longboard | 48×16 (180), 48×22.5 (190), 48×25 (190), 54×22.5 (190), 54×25 (190), 60×22.5 (190), 60×25 (190), 66×22.5 (184), 66×25 (190), 72×22.5 (169), 72×25 (187), 78×25 (173), 96×31 (174) |

The four stock boards as they open, with every bottom the tests use, keep their full picture.

## Measured on real printed sheets

The fit sweep (`e2e/summary-planing.spec.ts`, "fits its sheet") now covers seven boards, 14 tests, all passing. Each is printed
on a computer's sheet and a phone's at nine widths, in both systems, with nothing clipped, the picture never squeezed by the
browser, and the PDFs one page a sheet. On the two new boards, the least room between the page's last line and the page mark:

| Board | Least clear of mark on the real page | Rule's own page spare |
|---|---|---|
| Stock Fish, every cut, 8 channels, 1/8" Rail Roll on the Teardrop | 16.8 dots (phone sheet 733, both systems) | 5.02 dots |
| 5'6" × 25" Fish, every cut, 8 channels | 14.3 dots (phone sheet 618, Metric) | 4.92 dots |

As before, the rule is the more cautious of the two: the real page always has more room than the arithmetic says.

## Tasks and commits

| Task | What | Commit |
|---|---|---|
| 1 | The line on the three cards and the words page; paper prints it only with a roll | f0f97f7e |
| 2 | The printed page's picture gives the room a full page lacks, by the rule | e8bb8be5 |
| 3 | Two more real-page fit boards, the line read off the printed page, the gates | 8e614a5c |

## Every test line removed or changed since BASE (fd9560ee)

Only these lines left the test files. Everything else was added.

- `components/bottom/bottom-guide-words.test.ts`: the imports
  `import { BOTTOM_CUT_NAMES } from "@/lib/geometry/bottom";` and
  `import { BOTTOM_GUIDE_WORDS, GUIDE_SPACING, guideHow } from "./bottom-guide-words";` gained names. Nothing else changed.
- `components/summary/bottom-sheet-fit.test.ts`: the import `import { BOTTOM_GUIDE_WORDS, guideHow } from "@/components/bottom/bottom-guide-words";`
  gained names. The one changed assertion, in "the cuts, notes and both tables are the app's own":
  `expect(layout.notes[index]).toEqual({ head: cut.head, how: guideHow(card, system) });` is now
  `expect(layout.notes[index]).toEqual({ head: cut.head, how: guideHowOnPaper(card, system, roll) });`, with `roll` read from
  the resolved cut (0 for channels). Alongside it: a note printed at 0 never ends with the line.
- `e2e/summary-bottom-page.spec.ts`: the import `import { BOTTOM_GUIDE_WORDS, guideHow } from "../components/bottom/bottom-guide-words";` gained names.
- `e2e/summary-planing.spec.ts`: the import `import { bottomSheetLayout } from "../components/summary/bottom-sheet-fit";`
  gained `bottomTopViewBox`. The fit describe's comment changed from "five boards" to seven.

## Gates

- `npx vitest run` on the two unit files: 387 passed. New cases were seen failing first in both tasks.
- `npm test` (whole unit suite): 14,116 passed, 2 failed, 2 skipped. Both failures were time limits in files this plan doesn't
  touch, hit while the browser sweep was loading the machine: `lib/geometry/brd-fit.test.ts` "finishes the Longboard well inside
  a second" and `lib/geometry/finished-rail.test.ts` "Sharp Bottom Tuck … drops that corner's blend…" (5.1 s against a 5 s
  limit). Run alone: both files pass, 193 of 193.
- `npx next typegen && npx tsc --noEmit`: exit 0. `npx eslint` on all eight touched code and test files: exit 0.
- `PW_PORT=3157 npx playwright test e2e/bottom-guide.spec.ts --project=desktop -g "nineteen cards"`: 8 passed (the tracer check).
- `PW_PORT=3157 npx playwright test e2e/summary-planing.spec.ts --project=desktop -g "fits its sheet"`: 14 passed.
- `PW_PORT=3157 npx playwright test e2e/summary-bottom-page.spec.ts e2e/bottom-guide.spec.ts e2e/bottom-metric.spec.ts e2e/phone-bottom.spec.ts`
  (every project): 40 passed, 41 skipped (each test's own one-engine skips), exit 0.
- D-05 protected files: `git diff --quiet fd9560ee -- lib db drizzle components/bottom/bottom-guide.tsx components/bottom/bottom-cartoon.tsx components/bottom/bottom-controls.tsx components/design components/setup CLAUDE.md e2e/desktop-baseline.spec.ts-snapshots`
  exits 0. `git diff --name-only fd9560ee` lists exactly the plan's nine `files_modified`.
- Not run here (the orchestrator's, from main): `npm run build`, `npm run test:e2e:prod`.

## Deviations from Plan

**1. [Rule 1 - Bug] Test-only type slip fixed in Task 2's commit.** The rolling-cards list in `bottom-guide-words.test.ts`
(Task 1) was typed too narrowly, so `tsc` failed on it, although vitest passed. I annotated it `BottomCutName[]` in Task 2's
commit (e8bb8be5), which says so. No product code was affected.

Otherwise the plan ran as written.

## Two checks for the founder

1. Open BOTTOM's GUIDE. The Teardrop Nose Concave, Blended Nose Concave and Slight Single Concave Entry cards end their How to
   shape with your line. No other card has it.
2. Open the stock Fish, put a cut in every section (Teardrop nose, Early Double Concave center, Spiral Vee tail) and 8
   channels, and give the Teardrop a Rail Roll. Print: the Teardrop's note ends with the line and the BOTTOM CONTOURS page is
   whole. The board in the top picture is drawn a touch smaller. Set the Rail Roll back to 0: the line is gone and the picture
   is its full size again.

## Self-Check: PASSED

- All nine modified files exist; commits f0f97f7e, e8bb8be5 and 8e614a5c are in the branch's log.
