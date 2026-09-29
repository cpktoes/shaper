---
phase: quick-260928-tst
plan: 01
subsystem: summary
tags: [nextjs, react, playwright, vitest, print, order-form]

requires:
  - phase: quick-260928-r9h
    provides: "lib/geometry/planing.ts's planingBox, the PLANING column on page 2 beside the condensed Rail Bands table, and e2e/summary-planing.spec.ts's 24 browser tests"
provides:
  - "lib/geometry/planing.ts — planingTable(profile, planerMaxDepth, system), replacing planingBox: a Deck/Bottom PLANING table with a Foam Off row and a Passes row"
  - "Page 2's PLANING box redrawn as a real <table>, styled to the rail table's own header rule, row rule and --summary-font-label/--summary-font-row type sizes"
  - "The column widened from 20% to 28% of the Shaping Data column, floored at min-content so no planing number is ever clipped"
  - "e2e/summary-planing.spec.ts reworked: 24 browser tests against the new table's data-planing-* hooks, old data-planing-item/-value/-note/-empty hooks retired"
  - "A measured 560-dot hand-off to item 8b: the rail table and PLANING table no longer fit side by side there, so the rail labels wrap"
affects: [phase-13-item-8b, phase-13-item-9, phase-13-item-9b]

actuals:
  tokens: 17500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A printed panel reworked into a real <table> keeps the type-scale aliasing pattern from item 8 (--summary-font-* on the order-form root), and a table's own value-column sizing (rather than fixed flex shares) is what let the column afford the wider content without the flex-ratio math item 8 used"

key-files:
  created: []
  modified:
    - lib/geometry/planing.ts
    - lib/geometry/planing.test.ts
    - components/summary/order-form.tsx
    - app/design/summary/order-form.css
    - e2e/summary-planing.spec.ts

key-decisions:
  - "Zero skin reads none / 0 passes, not a dash — a dash is reserved for 'no blank picked' (the rail table's own idiom for 'nothing here')"
  - "The pass depth lives in the footnote under the table, not a row or the caption, since a footnote wraps freely and never widens the table; it reads 'At the center' because the Deck figure is the deck skin, identical to the DATASHEET's own FOAM OFF Deck cell at Center"
  - "Passes print as bare whole numbers ('3'), the rail table's own label-plus-value idiom, not formatPasses' 'N passes' wording"
  - "Row labels are Foam Off (the DATASHEET's own group name) and Passes (short for the PLANING caption's own passes)"
  - "Metric carries its own unit on every Foam Off value (' mm'), since each column mixes a depth row with a count row and a header unit would sit over the pass counts too"
  - "No blank picked: the same table prints with a dash in all four cells and the footnote says to pick a blank — one layout either way, never an empty box"
  - "Width: 28% of the Shaping Data column, floored at the table's own min-content width — the founder's own 'there's room to make the column wider' plus a guarantee no planing number is ever cut off at any print width"
  - "At 560 dots the rail table and the PLANING table can no longer sit side by side; the rail labels wrap there instead of the planing table shrinking below its own numbers — handed to item 8b with the measured numbers and two candidate levers"

requirements-completed: [QT-260928-tst, 13-SPEC-item-8]

coverage:
  - id: D1
    description: "planingTable is one pure, tested function wording the Deck/Bottom table in both systems: no blank (dashes + footnote), a real blank (Foam Off + Passes rows), zero skin (none/0), many passes, the -0\" and negative-gap edges, and a wired check against a real Marko Foam blank's own DATASHEET FOAM OFF cells"
    requirement: "QT-260928-tst"
    verification:
      - kind: unit
        ref: "lib/geometry/planing.test.ts#planingTable — the order form's PLANING table (quick 260928-tst)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Page 2's PLANING box is a real <table> matching the rail table's header rule, row rule and type-scale variables, with data-planing-table/-header/-row/-label/-cell/-footnote hooks, at 28% width floored at min-content"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit; npm run lint -- --max-warnings 0 (order-form.tsx, order-form.css)"
        status: pass
      - kind: e2e
        ref: "e2e/summary-planing.spec.ts (24 tests) — listed but not run by this executor; the orchestrator runs the suite"
        status: unknown
    human_judgment: true
    rationale: "Visual layout, print fidelity and the founder's own paper check require the orchestrator's browser run and a headless print-to-PDF pass, not covered by unit tests alone."
  - id: D3
    description: "No planing number is ever cut off at any print width from a computer print down to 618 dots, and the rail markings stay one line there; the 560-dot case is measured and handed to item 8b rather than silently passing"
    verification:
      - kind: e2e
        ref: "e2e/summary-planing.spec.ts's widest-strings case (case D) — listed but not run by this executor"
        status: unknown
    human_judgment: true
    rationale: "Requires the orchestrator's Playwright run at every phone print width plus a real PDF check; the 560-dot hand-off also needs the founder's own read of the measured numbers before item 8b is planned."
---

# Quick Task 260928-tst: The PLANING Column Becomes a Deck/Bottom Table Summary

**The order form's page-2 PLANING box is now a small table laid out exactly like the rail markings beside it — Deck and Bottom as column headers, Foam Off and Passes as rows, at the rail table's own type size — with a pass count for the deck as well as the bottom, and a wider column that can never clip a number.**

## What the table shows

The founder, after seeing item 8's printed page: *"Let's organize this like the rail dims. Deck and Bottom are headers. Font size should match the other dim text, and I'd like to add a #of passes for the deck too. There's room to make the column wider too if that helps the layout better."*

With a blank picked, the table reads (skin 1/8", centre gap 3/8", Planer Max Depth 1/8"):

| | Deck | Bottom |
|---|---|---|
| Foam Off | `1/8"` (Imperial) / `3 mm` (Metric) | `3/8"` / `10 mm` |
| Passes | `1` / `1` | `3` / `4` |

Footnote: `At the center, at 1/8" a pass — your Planer Max Depth.` (Imperial) / `At the center, at 3 mm a pass — your Planer Max Depth.` (Metric). Metric's Bottom count is one more than Imperial's — 10 printed mm over 3 printed mm rounds up to 4 — the same printed-number rule ROCKER's own pass count already follows.

Edge cases, worded exactly:
- **A skin of none:** Foam Off deck reads `none` (not `0"`), Passes deck reads `0` — zero is a true, printable answer, not a dash.
- **Many passes** (skin 1", gap 1 3/16" at a 1/16" depth): `1"` · `1 3/16"` Foam Off, `16` · `19` Passes; the Metric equivalent (skin 25.4mm, gap 30mm at a 2mm depth) reads `25 mm` · `30 mm`, `13` · `15`.
- **No blank picked:** the same table prints, with the rail table's own `—` in all four cells and the footnote `Pick a blank on ROCKER for the planing numbers.` — one layout either way, never an empty box that reads like something failed to print.

Every string comes from one pure, tested function, `planingTable` in `lib/geometry/planing.ts`, reading only `blank.cut.deckSkin` and `blank.centerGap` through the same formatters ROCKER and the DATASHEET already use — `formatDeckSkin`, `formatMark`/`unsignedZeroMark`, and `planerPasses`. There is no second formula and no conversion factor. A unit test pins that the Deck's Foam Off figure equals the DATASHEET's own FOAM OFF Deck cell at Center, on a real Marko Foam blank read from the seeded catalogue.

## Where the pass depth lives, and why

The depth (`your Planer Max Depth`) lives in the footnote under the table rather than in a row or the caption. A footnote wraps freely and never widens the table — putting it in a row or the caption would cost exactly the width the Deck/Bottom numbers need. It reads "At the center" because the Deck figure is the deck skin, identical to the DATASHEET's own FOAM OFF Deck cell at Center — the phrase is true for both columns even though the Deck figure itself doesn't vary along the board.

Passes print as bare whole numbers (`3`), the rail table's own label-plus-value idiom, rather than `formatPasses`' "3 passes" wording, which would repeat the row label and cost about 45px per cell the column doesn't have on a phone print.

## The new column width

28% of the Shaping Data column (up from 20%), floored at the table's own `min-content` width so no planing number is ever cut off at any print size:

| print size | PLANING width | rail rows one line? |
|---|---|---|
| computer (Letter/A4) | 193.6 px | yes |
| touch 618 | 165.1 px (floor; 28% alone would be 161.3) | yes, 7.7px margin |
| touch 680–900 | 178.6–240.2 px | yes |
| touch 560 | 165.1 px (floor) | **NO** — rail labels wrap instead |

On a computer print the table needs about 25%; the rail markings stay one line up to 38% there. At 618 dots (the founder's own phone page) the 28% share alone would be only 161.3px, but the floor lifts it to the table's own 165px, and the rail markings still fit one line up to 172.8px — a 7.7px margin.

## The 560-dot hand-off to item 8b

At 560 dots the rail table and the PLANING table can no longer sit side by side: the rail table's own minimum is 399px and the PLANING table's is about 165px, 568px against a 518px Shaping Data column — 50px short. After this task the rail labels wrap there instead (rail content 400 → 415px Imperial / 433px Metric in a 291px box), where before item 8's 20% column stacked label over value and never wrapped.

Two levers are handed to item 8b, both measured at plan time:
- Stack PLANING under Rail Bands on a narrow sheet (costs about 110px of page-2 height on a phone print).
- Move the Metric `(mm)` out of the rail column headers and raise the rail label share to about 2.2 — the rail minimum then falls to about 355px, set by `Hard Edge` at 60.5px, leaving the pair 524px against 518 — comfortable at 618, about 6px short at 560.

8b's own core problem (the rail table taller than its box at every phone width at or under 733) is unchanged by this task.

## Page 1 and the rail table's own file are unchanged

Nothing under `components/rails`, `components/rocker`, `lib/models`, `lib/db` or `db/` changed (mechanically verified: `git diff --name-only` against those paths is empty across all three commits).

## `npm test` count

- Before this task's first commit: 3,333 passed | 2 skipped.
- After Task 1 (new `planingTable` tests added, `planingBox` still present): 3,346 passed | 2 skipped.
- After Task 3 (the old `planingBox` describe block removed): 3,333 passed | 2 skipped — same total as the starting point, since the 13 old tests were retired and 13 new ones (in the same file, testing the new function) replaced them one-for-one in the running count.
- Lint (`npm run lint -- --max-warnings 0`) and `npx tsc --noEmit` were clean after every task.

## Browser tests expected to move (for the orchestrator)

Not run by this executor — the orchestrator runs `npx playwright test e2e/summary-planing.spec.ts` and the full suite (`npm run test:e2e`, in the background):

- `e2e/summary-planing.spec.ts` (reworked, `npx playwright test --list` confirms `Total: 24 tests in 1 file`): expected green on all three projects. Case D's console line at 560 shows the known rail wrap (rail row spread and rail content vs box are logged, not asserted, there), handed to item 8b.
- `summary-print-size.spec.ts`, `summary-print-touch-box.spec.ts`, `summary-preview.spec.ts`, `summary-blank.spec.ts`, `summary-rail-key.spec.ts` and `summary-rail-instructions-fit.spec.ts`: expected to **HOLD** — they print the default board with no blank (the dashes table and the pick-a-blank footnote), no sheet overflows its page box (the rail box's height share is unchanged), and the table's text uses the rail table's own CSS variables plus `order-form-micro` on the footnote, which touch-box's own sampling already covers.
- `desktop-baseline.spec.ts` has no Summary screenshot; `phone-trip.spec.ts` only checks the sheet is visible.

Also for the orchestrator: a headless print-to-PDF before and after, on Letter and A4, in Imperial and Metric, with the default board and with a blank-picked board with Quad fins — checked for page 1 identical to before, PLANING as a small table beside RAIL BANDS with `Deck`/`Bottom` at the same height and weight as `Nose`/`Center`/`Tail`, the footnote with the pass depth, dashes with no blank, the quad's fin numbers clearing SHAPER USE ONLY, and Metric reading ` mm` on every Foam Off value — then shown to the founder, with `<for_item_8b>` recorded against item 8b.

## Commits

1. `ed416ea` — `feat(summary): the planing numbers as a Deck/Bottom table, with a pass count for the deck (quick 260928-tst)`
2. `08873fa` — `feat(summary): the PLANING column prints as a Deck/Bottom table the size of the rail marks (quick 260928-tst)`
3. `d23bbfb` — `test(summary): the PLANING table checked against ROCKER in both systems, on Letter, A4 and every phone print width (quick 260928-tst)`

## Deviations from Plan

None — plan executed exactly as written, task by task, gate by gate. One internal naming choice worth recording: the new e2e measurement fields were named `planingPanelOverflow`/`planingFormBoxEl` rather than the more obvious `planingBoxOverflow`/`planingBoxEl`, because those names would have contained the literal old function name `planingBox` as a substring — which the plan's own retirement grep (`grep -rn 'planingBox\|...'`) checks for repo-wide. Caught and renamed before the final grep, not a scope change.

## Threat Flags

None — no new attack surface. This is a display-only rework of an existing printed panel: no new network, database, or third-party surface; the same side-profile fields (`blank.cut.deckSkin`, `blank.centerGap`) flow through the same boundary formatters as before.

## Self-Check: PASSED

- FOUND: lib/geometry/planing.ts
- FOUND: lib/geometry/planing.test.ts
- FOUND: components/summary/order-form.tsx
- FOUND: app/design/summary/order-form.css
- FOUND: e2e/summary-planing.spec.ts
- FOUND commit ed416ea
- FOUND commit 08873fa
- FOUND commit d23bbfb
