---
quick_id: 260910-kz2
artifact: browser-reading
task: 3
ran_by: orchestrator, on the main checkout (a worktree executor cannot — `npm run dev` fails there)
date: 2026-09-10
verdict: PASS — the instructions sheet keeps its example rail from 268 dots up, and nothing that ships moved
---

# Browser reading — the narrow-page fix measured

## The defect, gone

Clipping per sheet in print media on the touch path, and the example rail's own SVG on sheet 3:

| page area (dots) | clipped [s1, s2, s3] | figure card | example rail SVG |
|---|---|---|---|
| 268 | [85, 0, **0**] | 166.72 | **36 x 17** |
| 300 | [7, 0, **0**] | 218.94 | **55 x 27** |
| 330 | [0, 0, **0**] | 275.72 | 76 x 37 |
| 360 | [0, 0, **0**] | 308.73 | 88 x 42 |
| 390 | [0, 0, **0**] | 341.73 | 100 x 48 |
| 420 | [0, 0, **0**] | 374.72 | 112 x 54 |
| 450 | [0, 0, **0**] | 407.73 | 124 x 60 |
| 480 | [0, 0, **0**] | 440.73 | 136 x 66 |
| 531 | [0, 0, **0**] | 496.83 | 157 x 76 |

**Before this fix the example rail was 0 x 0 at every one of those widths and the sheet clipped by up to 45px.**
It now has a real size at all of them, and the sheet clips nowhere from 268 dots up. Passed on `iphone`
(WebKit-mobile) and `android` (Chromium-mobile).

## Nothing that ships moved

| page area | figure card | drawing |
|---|---|---|
| 560 | **502.00** | **373.84 x 472.00** |
| 618 (his phone) | **502.00** | **373.84 x 472.00** |
| 733 (a computer) | **502.00** | **373.84 x 472.00** |
| 900 | **502.00** | **373.84 x 472.00** |

Identical to the numbers `e2e/summary-rail-key.spec.ts` already pins. Desktop: sheet **733.44 x 990.55** at
window widths 900, 1280 and 1600, card 502.00 at each — unchanged.

## The three protected gates

`e2e/summary-print-touch-box.spec.ts` + `e2e/summary-rail-key.spec.ts` + `e2e/summary-print-size.spec.ts`:
**19 passed**. Verified by diff that this task edited none of them, nor `app/design/summary/order-form.css`.

## Full suite

`npm run test:e2e`: **190 passed, 0 failed**. `npm test`: 2444 passed. `npm run build`: clean.

## Carried forward, not fixed here

**Sheet 1 (the order form's front page) clips below about 320 dots** — 85-91px at 268, 7-14px at 300, nothing
from 330 up. That is a **pre-existing floor in a sheet this task never touched**, and 320 dots is roughly 3.3in
of paper, narrower than a 4x6 photo, so no real paper reaches it. The spec reports all three sheets' clipping in
its console line but asserts only on the instructions sheet, with the numbers and the reasoning recorded in a
comment so a future reader neither mistakes it for a regression nor widens the assertion back.
