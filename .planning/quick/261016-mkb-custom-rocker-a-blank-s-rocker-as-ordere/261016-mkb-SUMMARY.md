---
phase: quick-261016-mkb
status: complete
subsystem: rocker-custom-rocker
tags: [rocker, blanks, custom-rocker, popup, saved-blanks, sketch-016, us-blanks-notation, migration-0012]
plans: [01, 02, 03]
completed: 2026-10-17
---

# Quick 261016-mkb: Custom rocker — a blank's rocker as ordered, saved as the shaper's own blank

Sketch 016 D, built in three plans with your look between each, and live on www.shaperassistant.com on
2026-10-17 after you migrated production (migration 0012, the `user_blanks` table) and said go.

## What changed for a shaper

- **A blank's rocker as the maker makes it.** On ROCKER, right under the blank card, **Customize Rocker ›** opens a
  popup laid out like the ROCKER page: NOSE and TAIL, each a Rocker slider (1/16", 1 mm in Metric, up to +2") beside
  a Bend starts slider (whole inches from 3" in to the centre), a second change per end that must start nearer the
  tip and stacks on the first (`+1/2"N +1/2"N18"` lifts the nose tip exactly 1"), and ↺ Natural rocker. No change can
  take any part of the blank below its low point — the slider stops at that floor and says so.
- **The note is written the US Blanks way, on every maker's blank, always in inches:** `-1/4"N18" +1/8"T36"`.
- **The popup's drawing is the only coloured one:** the bent blank with the natural rocker dashed behind it, a mark
  where each bend starts, the first change's outline red and the second's blue (US Blanks' catalogue page 11), with
  the page's zoom. **Show my board** is off by default — the blank alone with its printed thickness and its rocker as
  ordered at its five stations, the centre as zero — and on, your board in the blank with its own five stations.
- **Every custom rocker in use is a saved blank of your own**, starred the moment it is saved: Use and save as a new
  blank, or Use and edit current blank when the board already uses one. Signed in it lives on your account; signed
  out, in this browser. In Pick a Blank it is a card under ★ STARRED marked Saved by you, beside the maker's natural
  blank, with Natural Rocker over Custom Rocker in its table and a Remove that asks once.
- **Every blank is named the same way, its rocker on its own line** — `Natural` on the makers' blanks — on the BLANK
  button, the picker's cards, the DATASHEET's group label (with Natural Rocker over Custom Rocker rows on a custom
  blank), the order form (`US Blanks 9'4"B Natural — centered`) and the phone's ☰ ROCKER tile.
- **On the page itself a custom blank draws as any blank** — the bent foam alone. Switching to another blank starts
  from natural again; Remove This Blank keeps the board's figures. Every board saved before reads exactly as it did.

## Proven, not drawn

The bend and the floor reproduce your sketch to the digit (golden fixture written by the sketch's own code); the
note's reader agrees with US Blanks' 282 published listings; bending never changes a blank's thickness, width or
fit. Unit tests 5,666; types and lint clean; the full browser suite on a quiet machine 1,174 passed with three
load-timeouts that pass alone; the production build from the main checkout clean.

## Your rulings during the build (2026-10-16/17)

- The planner's measured choices P-1 … P-24 stand as recorded in the three plan summaries.
- **The order form's Blank line** can end in "…" on the longest blank names with a note or a slide (P-24) — you chose
  to live with it (2026-10-17). A wrap or a smaller line is a printed-sheet change for another day.
- The migration became **0012** because quick 261016-usz's stars column reached production first as 0011; the journal
  time was moved behind it so production applied it (a renamed file keeping its old time would have been skipped).

## Known limits and follow-ups

- Blanks saved while signed out stay in that browser until the sign-in join ships (with the stars' join).
- "Export my designs" does not include saved blanks.
- `e2e/blank-makers.spec.ts:202` on the emulated iPhone times out in every full run (since before any screen
  changed) and passes alone — the picker is heavy on that emulation; worth a `test.slow()` or a lighter setup.
- Pick-lists (US Blanks' per-blank listings, Arctic's named rockers) are the next task, per the research plan.

## The record

- Plans and summaries: `261016-mkb-01…03-PLAN.md` / `-SUMMARY.md`; pictures in `pictures/`.
- Research: `.planning/spikes/CUSTOM-ROCKER-PLAN.md`, spikes 001–002; sketch `.planning/sketches/016-custom-rocker/`.
- Merged to main as 029da65e; production migrated by the founder at 16:20 PDT, pushed 16:24 PDT, 2026-10-17.
