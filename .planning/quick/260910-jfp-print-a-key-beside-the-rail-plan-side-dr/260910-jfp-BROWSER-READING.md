---
quick_id: 260910-jfp
artifact: browser-reading
task: 3
ran_by: orchestrator, on the main checkout (a worktree executor cannot — `npm run dev` fails there)
date: 2026-09-10
commands:
  - PW_PORT=3108 npx playwright test e2e/summary-rail-key.spec.ts
  - PW_PORT=3108 npx playwright test e2e/summary-print-touch-box.spec.ts e2e/summary-print-size.spec.ts
  - npm run test:e2e
verdict: PASS — the key costs nothing, the drawing is unchanged, and both protected print gates are untouched
---

# Browser reading — the printed key measured, not asserted

## The sweep: does the key cost anything?

Identical on all three projects (`iphone`/WebKit-mobile, `android`/Chromium-mobile, `desktop`), at all seven
page-area widths:

| page area (dots) | card height, key ON | card height, key OFF | drawing width ON | drawing width OFF | key visible | overflow ON | overflow OFF |
|---|---|---|---|---|---|---|---|
| 560 | 501.98px | 501.98px | 373.84px | 373.84px | yes | ok, ok, ok | ok, ok, ok |
| **618 (his phone)** | **501.98px** | **501.98px** | **373.84px** | **373.84px** | **yes** | **ok, ok, ok** | **ok, ok, ok** |
| 680 | 501.98px | 501.98px | 373.84px | 373.84px | yes | ok, ok, ok | ok, ok, ok |
| 733 (computer) | 501.98px | 501.98px | 373.84px | 373.84px | yes | ok, ok, ok | ok, ok, ok |
| 760 | 501.98px | 501.98px | 373.84px | 373.84px | yes | ok, ok, ok | ok, ok, ok |
| 812 | 501.98px | 501.98px | 373.84px | 373.84px | yes | ok, ok, ok | ok, ok, ok |
| 900 | 501.98px | 501.98px | 373.84px | 373.84px | yes | ok, ok, ok | ok, ok, ok |

**The card's height is the same number with the key on and with it off, at every width, on every engine** — so
the example rail drawing above (the only flexible band, and the one with 184px at his page width) loses nothing.
**The drawing keeps 373.84px** — it goes flush left instead of centred and the key takes the blank column that
was already there. **`overflow=[ok, ok, ok]`** on all three sheets in both states: the sheet still fits.

## The entries

`the key lists exactly the lines the shaper left ticked, in the legend's own order` — **passed on all three
projects**, covering nine ticked, a partial set, and none ticked (where no key element is rendered at all and
the drawing simply re-centres, leaving no stray heading or empty bordered column).

## The two protected gates — untouched and still green

- `e2e/summary-print-touch-box.spec.ts` + `e2e/summary-print-size.spec.ts`: **13 passed**, including
  260910-2ny's own THE MEASUREMENT case and the desktop control at an unchanged 733.44 x 990.55 dots.
- Verified by diff that this task edited neither file, nor `app/design/summary/order-form.css`.

## Full suite

`npm run test:e2e`: **185 passed, 0 failed** (166 skipped — project-gated, as always).
`npm test`: 2434 passed. `npm run build`: clean. `npm run lint`: 0 errors.

## Rendered and looked at

A real Chromium PDF of the third sheet was rendered and inspected. The key sits in one column to the right of the
plan and side drawings, nine entries deep, each dot the colour of the line it names — orange for the Deck Marks
and Band 1, blue for Deck Marks 3 and Band 2, green for Deck Mark 3 Center, red for the Rail Marks and Band,
purple for the Rail Tucks and the tuck blend — matching the drawing beside it. The "Taper Tuck to a Sharp Edge
at 16-22" off Tail" note keeps its own place in the middle column, and the example rail above is undisturbed.

## One thing carried forward, not fixed here

At a **390-dot** page area (a phone's own 390px screen, NOT a print width) the instructions sheet already
overflows its box by 44px with the example rail squeezed to zero, and the key is deliberately not drawn below
its `KEY_ROW_MIN_WIDTH_PX` threshold. That condition is **pre-existing**, was measured before this task began,
and is neither worsened nor fixed by it. It is a screen-preview width only — his printed page is ~618 dots.

## Test-infrastructure note

The sweep case first failed on `iphone` and `android` with `Test timeout of 30000ms exceeded` on a click — not
an assertion. Every width it reached had already reported correct numbers. The case toggled the ticks through the
UI at each of seven widths (126 clicks); it now toggles once per state and sweeps all seven within it (18 clicks),
and carries `test.setTimeout(90_000)` with the measured justification in a comment. No coverage was dropped: same
seven widths, same per-width on/off comparison, same overflow assertions.
