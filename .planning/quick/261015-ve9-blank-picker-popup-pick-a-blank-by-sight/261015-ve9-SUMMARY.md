---
phase: quick-261015-ve9
status: complete
subsystem: rocker-blank-picker
tags: [rocker, blanks, popup, sketch-015, stars, filters]
plans: [01, 02]
completed: 2026-10-16
---

# Quick 261015-ve9: Pick a blank by sight — part 1

On ROCKER you now choose foam the way you'd read a blank maker's catalogue page: by looking at it.

## What changed

- **The BLANK section is one button.** With no blank it reads PICK A BLANK and a line like
  "196 blanks long enough for this board, 194 fit". With a blank it shows a small drawing of that
  blank, its name and litres, and CHANGE BLANK ›. The fit flag, Remove This Blank and the notes stay
  where they were.
- **It opens a popup of drawn blanks.** Every blank long enough for your board is a card: the blank
  from above over its rocker from the side, true to proportion, your board dashed on it where the
  app would place it, and the catalogue's own station table underneath. Picking a card puts that
  blank on your board.
- **A blank too thin at the center is now shown greyed instead of hidden**, under WON'T FIT THIS
  BOARD, with the same sentence the fit flag gives. Only a blank too short is left out.
- **Stars.** Every card has a ☆. Starred blanks sit in a ★ STARRED group at the top, kept in this
  browser. Starring never picks a blank or changes your board.
- **The filter bar**: search; the four makers as chips (the very same setting as App Default
  Settings → Blank Makers); Length and Nose rocker ranges; ★ Starred only; and a sort by length,
  nose rocker, center thickness or volume.
- **Flat or Upright**: Upright stands every blank nose-up with its key numbers beside it.
  **Show my board** turns your board's dashed outline on and off. Both are remembered.
- **Phones**: the popup fills the screen. Upright, the filters scroll sideways in one row. Held
  sideways, everything is one row and each card swaps its table for one line, e.g.
  `21 11/16" × 3 1/16" center · 4 7/8" nose`.
- **Metric** reads lengths and widths in centimetres and thicknesses and rocker in whole
  millimetres, as everywhere else. Daylight and Slate use the app's own colours.
- **A locked board** can open the popup, search, filter, sort and star, but not pick.
- **Your P-6 ruling (2026-10-16)**: every nose and tail rocker a card quotes — and the nose-rocker
  filter and sort — is the catalogue's printed figure, the same as the table. The Marko 10'2" M reads
  4 9/16" nose (the drawn curve alone would have said 4 5/16").

## Your review list — in the browser

1. The popup on a computer, an upright phone and a phone held sideways.
2. Flat and Upright cards; Show my board on and off.
3. Stars across a reload; ★ Starred only.
4. The maker chips against App Default Settings → Blank Makers.
5. Both ranges, and every sort.
6. Metric; Daylight and Slate.
7. A locked board.
8. A greyed too-thin card — on the default 6'0" two US Blanks (6'2"P and 6'3"EA) show greyed — and
   picking it.

## The planner's choices — confirm or overrule

- **P-1** A too-thin blank lands centred when picked (there's no placement where it fits).
- **P-2** The intro line is reworded: "Every blank listed is at least 2" longer than your board. A
  blank fits when it leaves room at the center for a 1/8" deck skin and a 1/8" bottom pass and your
  board sits inside it from tip to tip. Greyed blanks don't fit — the line under each says why."
- **P-3** When no listed blank is thick enough, the old "No blank is thick enough" message sits above
  the greyed cards.
- **P-4** The header counts "{cards showing} of {blanks long enough, all four makers} blanks · {fit} fit".
- **P-5** The "Showing … only — change in Settings" note stays in the sidebar under the button.
- **P-6** Overruled by you on 2026-10-16: printed figures everywhere. Done.
- **P-7** A star's name includes the maker ("Star US Blanks 6'2"A"), since two makers can use one name.
- **P-8** A maker chip's count is that maker's blanks long enough for your board, whatever else is set.
- **P-9** Clear Filters resets the search, both ranges and Starred only — not the makers, the sort or
  the two switches.
- **P-10** A starred blank shows only under ★ STARRED, not again in its fit group.
- **P-11** The range sliders' ends round outward to the next whole step, so the shortest and longest
  blank are always reachable.

## What part 2 adds

Stars saved on your account, so they follow you to any device: a new nullable `user_preferences`
column, migrated on production BEFORE the deploy (CLAUDE.md's additive rule), and at sign-in a
browser's stars join the account's.

## The full browser suite

Run in the agent worktree on 2026-10-16, one project at a time:

- **Computer:** 423 passed, 2 failed — the TEMPLATE screenshot that was already failing before this
  task, and one locked-board test that couldn't open its board in time on a cold server (passes
  re-run).
- **iPhone:** 352 passed, 1 failed — the same locked-board opening, on its first phone test (passes
  re-run).
- **Android:** 377 passed, 0 failed.

None of the three failures touches ROCKER or the popup.
