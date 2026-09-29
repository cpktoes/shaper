---
phase: quick-260928-r9h
plan: 01
subsystem: summary
tags: [nextjs, react, playwright, vitest, print, order-form]

requires:
  - phase: 12
    provides: "Blank cuts (deck skin, tip style), BlankSideView.centerGap/foamOffBottom, planerPasses/formatPasses in measure-display.ts"
provides:
  - "lib/geometry/planing.ts — planingBox(profile, planerMaxDepth, system), the one tested place that words the PLANING column"
  - "A PLANING column on the order form's page 2 (Shaper Reference), beside a condensed Rail Bands table"
  - "e2e/summary-planing.spec.ts — 24 browser tests proving the column's words and the table's fit"
affects: [phase-13-item-9, phase-13-item-9b]

actuals:
  tokens: 14093
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A small printed panel's words live in one pure lib/geometry module (planing.ts), composed entirely from existing boundary formatters — no new formula, no new conversion factor"

key-files:
  created:
    - lib/geometry/planing.ts
    - lib/geometry/planing.test.ts
    - e2e/summary-planing.spec.ts
  modified:
    - components/rails/rail-data-table.tsx
    - components/summary/order-form.tsx
    - app/design/summary/order-form.css
    - .planning/todos/completed/2026-09-27-summary-needs-tip-thickness-and-deck-bottom-passes.md

key-decisions:
  - "The founder's 2026-09-29 redirect: no Tips box on page 1 (the rocker strip already prints the tip thicknesses); instead a PLANING column on page 2, beside the Rail Bands table, made room for by condensing the rail markings horizontally"
  - "The compact rail table's label column moves from flex-[1.4] to flex-[1.75] against 1 per value column; the DATA page's own full-width table keeps flex-[1.4]"
  - "PLANING is 20% of the Shaping Data column's width (--order-form-planing: 0.2), the Rail Bands box keeping the rest of the shared row"
  - "No blank picked: one plain line ('Pick a blank on ROCKER for the planing numbers.') rather than an empty box or a write-in line — a hand-worked figure could silently disagree with the app"
  - "The five-station FOAM OFF Deck/Bottom rows stay on ROCKER's own DATASHEET — five station columns do not fit the PLANING column's width, and a full-width row would make page 2 taller"

requirements-completed: [QT-260928-r9h, 13-SPEC-item-8]

duration: 55min
completed: 2026-09-29
status: complete
---

# Quick Task 260928-r9h: The Order Form Gets a PLANING Column Summary

**Page 2 of the printed order form now carries a PLANING column beside a condensed Rail Bands table — the Deck Skin, how much foam comes off the bottom at the center, and how many planer passes that is at your own Planer Max Depth, worded from one tested module rather than page 1.**

## What the PLANING column shows

Beside the rail band markings on page 2 (the Shaper Reference sheet), a new box captioned **PLANING**:

- **With a blank picked**, it holds three lines — label over value:
  - `Deck Skin` → `1/8"` (Imperial) / `3 mm` (Metric) — or `none` when the board takes no deck skin.
  - `Off Bottom @ Center` → `3/8"` / `10 mm`.
  - `Planer Passes` → `3 passes` (Imperial) / `4 passes` (Metric), with the note `at 1/8" a pass` / `at 3 mm a pass` underneath.
- **With no blank picked**, it holds one plain line instead: `Pick a blank on ROCKER for the planing numbers.`

Every number is read off the board's own side profile — the same `blank.cut.deckSkin` and `blank.centerGap` ROCKER's own Deck Skin slider and Center OFF BOTTOM readout already show — through the app's existing formatters (`formatDeckSkin`, `formatMark`, `planerPasses`/`formatPasses`). Nothing is computed twice; paper and screen read the same numbers because they come from the same place, `lib/geometry/planing.ts`.

The pass count is worked from the **printed** depth and pass depth — the same rule ROCKER's own "Planer passes at the center" uses — so Imperial and Metric can honestly read one pass apart on the same board (Metric's 10 printed mm over 3 printed mm rounds up to 4, one more than Imperial's 3/8" over 1/8"). A centre gap that would print as a negative zero reads `0"` / `0 mm`, never `-0"`.

## Where it sits, and how the rail table was condensed

The Rail Bands box and the new PLANING box now share one row on page 2. To make room:

- The compact rail table's label column moved from **1.4 to 1.75 shares** against 1 per value column (the DATA page's own full-width table is untouched, still at 1.4).
- PLANING takes **20%** of the Shaping Data column's width (`--order-form-planing: 0.2` in `order-form.css`), the same longhand pattern as page 1's own `--order-form-left`.

Measured before and after at the computer's print and all seven phone print widths, in both systems, with `Hard Edge` (the widest cell text any board can print) in every rail cell:

| print size | label col before → after | value col before → after | rail content / box, before → after | fin content / box, before → after | PLANING width |
|---|---|---|---|---|---|
| computer (Letter/A4) | 206.6 → 186.9 | 147.6 → 106.8 | 427.09 / 439.63 → 427.09 / 438.86 | 212.66 / 155.0 → 213.42 / 155.77 | 138.3 |
| touch 560 | 151.5 → 135.7 | 108.2 → 77.6 | 400 / 292.13 → 400 / 291.36 | — | 103.6 |
| touch 618 | 169.9 → 152.8 | 121.4 → 87.3 | 400 / 333.73 → 400 / 332.97 | — | 115.2 |
| touch 680 | 189.6 → 171.1 | 135.5 → 97.8 | 405.5 / 377.59 → 405.5 / 376.81 | — | 127.6 |
| touch 733 | 206.5 → 186.7 | 147.5 → 106.7 | 426.97 / 413.81 → 426.97 / 413.03 | — | 138.2 |
| touch 760 | 215.1 → 194.7 | 153.6 → 111.3 | 438.77 / 431.83 → 438.77 / 431.05 | — | 143.6 |
| touch 812 | 231.6 → 210.0 | 165.5 → 120.0 | 461.75 / 466.58 → 461.75 / 465.81 | — | 154.0 |
| touch 900 | 259.6 → 235.9 | 185.5 → 134.8 | 500.88 / 525.27 → 500.88 / 524.50 | — | 171.6 |

At every one of these widths, every rail row's own height and the header row's height are **identical before and after** — no value cell overflows. A quad's fin numbers (the widest box the Fin Placement panel ever has to hold) still clear the Shaper Use Only box on the computer print, with slightly more room after this change (3.4 → 4.2 px spare) because the Rail Bands box's own height held steady.

## Why page 1 is unchanged

The founder made this call directly: the ROCKER strip on page 1 already prints the five thickness figures, tips included, so there is no separate Tips box and no tip rows anywhere. No file that draws page 1 changed except `order-form.tsx`'s imports and its page-2 section — `.order-form-rocker`, `rocker-view-frame.ts` and every page-1 comment are byte-for-byte what they were.

## Why the five-station FOAM OFF rows stay on the DATASHEET

Five station columns (Nose Tip, Nose @ 12", Center, Tail @ 12", Tail Tip) cannot fit inside the PLANING column's ~138px width, and a full-width row spanning the whole sheet would make page 2 taller — which the plan's hard constraint (the rail table gets no taller) rules out. Those rows stay exactly where a shaper already reads them: ROCKER's own DATASHEET.

## A pre-existing finding, unrelated to this change

While measuring, it was confirmed that on a touch print at 733 dots and narrower, the rail table was **already** taller than its own box before this plan (427 in a 414px box at 733, 400 in 334 at 618, 400 in 292 at 560) — meaning the rail markings already run into the Fin Placement box on a phone print, today, on `main`. This plan's own before/after measurements are byte-identical at every one of these widths, so nothing here makes that better or worse. It is a candidate for its own todo, to be raised with the founder.

## Verification

- `npm test`: **3,320 passed** before this task's first commit → **3,333 passed | 2 skipped** after (no regressions; +13 new tests in `lib/geometry/planing.test.ts`).
- `npm run lint -- --max-warnings 0` and `npx tsc --noEmit`: clean after every task.
- `npx playwright test --list e2e/summary-planing.spec.ts` → `Total: 24 tests in 1 file` (8 tests × 3 projects: desktop, iphone, android). Four test bodies, each run for Imperial and Metric:
  - A. with no blank picked, the PLANING column says to pick a blank and nothing else (all projects)
  - B. with a blank picked, the PLANING column prints ROCKER's own Deck Skin, foam off the bottom at the center and planer passes (all projects)
  - C. on paper, with a blank picked, both pages print at true size on Letter and A4 with the PLANING column on the back (desktop only)
  - D. the rail markings never wrap and a quad's fins still clear the shop box, with the widest numbers any board can carry, on a computer's print and at every phone print width (desktop only)

**For the orchestrator to run** (not run by this executor): the full suite (`npm run test:e2e`) plus `npx playwright test e2e/summary-planing.spec.ts`. The existing specs that print page 2 — `summary-print-size.spec.ts`, `summary-print-touch-box.spec.ts`, `summary-preview.spec.ts`, `summary-blank.spec.ts`, `summary-rail-key.spec.ts`, `summary-rail-instructions-fit.spec.ts` — are all expected to HOLD: page 2 now carries the condensed table and the no-blank line, the rail rows keep their height, the new text carries the order-form token classes (touch-box case 6(a)), no sheet overflows (case 6(b)), and `summary-blank.spec.ts`'s Blank field is untouched. `desktop-baseline.spec.ts` has no Summary screenshot, so nothing to re-record. `phone-trip.spec.ts` only checks the Summary sheet is visible, so it holds.

Headless print-to-PDF before (commit `df4f05d`) and after, Letter and A4, Imperial and Metric, default board and a board with a blank + Quad fins, is the orchestrator's own next step, along with showing the founder the four after-PDFs.

## Deviations from Plan

None — plan executed exactly as written, task by task, gate by gate.

## Commits

1. `e7dd48d` — `feat(summary): one tested place words the planing numbers for the printed form (quick 260928-r9h)`
2. `f42cfe3` — `feat(summary): the Shaper Reference page gets a PLANING column beside the rail markings (quick 260928-r9h)`
3. `8972620` — `test(summary): browser checks for the PLANING column — both systems, Letter, A4 and every phone print width (quick 260928-r9h)`

## Self-Check: PASSED

- FOUND: lib/geometry/planing.ts
- FOUND: lib/geometry/planing.test.ts
- FOUND: e2e/summary-planing.spec.ts
- FOUND: .planning/todos/completed/2026-09-27-summary-needs-tip-thickness-and-deck-bottom-passes.md
- MISSING (correctly): .planning/todos/pending/2026-09-27-summary-needs-tip-thickness-and-deck-bottom-passes.md
- FOUND commit e7dd48d
- FOUND commit f42cfe3
- FOUND commit 8972620

## Orchestrator follow-up (2026-09-29)

The full browser run failed the new spec's layout test on desktop in both systems — at its non-vacuity guard, not at
the layout: it required more than 20 distinct Deck Skin strings (the control runs none–1", 17 sixteenths since quick
260928-lm6) and more than 20 distinct "at … a pass" notes (four Planer Max Depth settings in Imperial, five in
Metric). The guards now expect the true size of each range (`>= 17` skins; exactly one note per pass depth), committed
as `test(summary): the PLANING spec's spread guards match the real ranges`. Re-run: 16 passed, 8 skipped (the
desktop-only layout tests on the phone projects) — the no-wrap / fins-clear check passes in both systems.
