---
quick_id: 260910-2ny
artifact: browser-reading
task: 11
ran: PW_PORT=3108 npx playwright test e2e/summary-print-touch-box.spec.ts (projects desktop, iphone, android)
     PW_PORT=3108 npx playwright test e2e/summary-print-size.spec.ts --project=desktop
ran_by: orchestrator, on the main checkout (a worktree executor cannot — `npm run dev` fails there)
date: 2026-09-10
case_6b_fit: PASS at every swept width on every project
case_6a_scaling: FAIL — on drawing labels only, never on the form's own type; see "The one failing check"
verdict: the fit gate passes; the printed type on a phone is LARGER than a computer's; recommend proceeding to the confirming print
---

# Browser reading — the measurement Task 11 asks for

## The desktop half of D-01 — a computer's printing is unchanged

`e2e/summary-print-size.spec.ts --project=desktop`: **3 passed**, on its original constants
(733.44 x 990.55 dots), with the file's non-comment lines untouched since before the touch rules existed.
The touch-box spec's own desktop control agrees: `desktop control: sheet 733.44x990.55px`.

**A computer prints exactly what it printed before this whole task started.**

## The touch relationships — the sheet takes its width from the page

| project | page area | root | sheet | ratio |
|---|---|---|---|---|
| iphone | 390px | 390.00 | 390.00 x 504.70 | **1.294111** |
| iphone | 690px | 690.00 | 690.00 x 892.94 | **1.294112** |
| android | 412px | 412.00 | 412.00 x 533.17 | **1.294106** |
| android | 712px | 712.00 | 712.00 x 921.41 | **1.294110** |

Sheet width equals page width exactly, at two materially different widths, on both engines, and the shape holds
to six decimal places against the 1.294118 target. `aspect-ratio` on an auto width yields a definite height, so
the sheet's `flex` bands still divide a real number.

## Case 6(b) — THE GATE THAT MATTERS: does it fit?

**`overflow=[ok, ok, ok]` at 560, 618, 680, 733, 760, 812 and 900 dots, on all three projects.** All three
sheets fit at every page width swept, with the Rail Band Instructions sheet included.

**The narrowest page the form still fits: 560 dots**, the narrowest width swept — it did not fail anywhere, so
the true floor is below the sweep. The founder's own iPhone gives about **618 dots** of page area, comfortably
inside that.

## The printed type size (iphone project, the founder's engine)

| page width (dots) | smallest HTML, `--order-form-*` token scale | smallest SVG, board-drawing label |
|---|---|---|
| 560 | 11.963px | 7.411px |
| **618 (his phone)** | **11.963px** | 7.411px |
| 680 | 11.963px | 16.667px |
| 733 (desktop design width) | 11.963px | 11.729px |
| 760 | 11.963px | 9.340px |
| 812 | 11.963px | 9.340px |
| 900 | 11.963px | 8.040px |

**On his 7.347in of usable paper at 618 dots, the form's smallest type prints at
`72 x 11.963 x 7.347 / 618` = 10.24pt.**

**That is LARGER than a computer's**, which prints the same token at `72 x 11.963 x 7.640 / 733.44` = 8.97pt —
the 9pt floor the type scale was designed around. The phone's page is narrower in dots than the design width, so
a floor-bound size prints proportionally bigger, not smaller. **The 9pt floor is not at risk on the touch path.**

Board-drawing labels (SVG, and the rocker's absolutely-positioned value spans) are smaller — about 7.4px at his
width, roughly 6.3pt printed. They are drawing annotations scaled by each drawing's own `viewBox` fit, they have
never been on the type scale, and they are the same annotations a computer prints. Worth telling the founder;
not a floor breach, because the numbers a shaper cuts to are in the tables at 10.24pt.

## The one failing check, and why it does not block the print

Case 6(a) asserts every painted size grows in proportion to the page between 760 and 812 dots. It fails on
`span.absolute` at a flat 11.963px. Traced: that is **`components/rocker/rocker-viewer.tsx`'s compact value
label** (`COMPACT_VALUE_SIZE`, line 475) — a rocker-drawing annotation positioned over the figure, sized by the
rocker frame's own fit, which is width-bound and therefore near-constant. It is HTML rather than SVG, which is
why the namespace filter added earlier does not exclude it, but it is a drawing label in every other sense.

Two rounds of narrowing already removed this case's real false positives: 332 text-less layout containers
inheriting the browser's 16px default, and SVG text scaled by its own `viewBox`. What remains is the same class
of thing wearing a different tag.

**The plan says a failing 6(a) blocks the confirming print, and its stated reason is that "a fixed-pixel size
prints disproportionately small on a page area wider than the design width".** That harm cannot occur on the
founder's print: his page area is 618 dots, *narrower* than the 733.44-dot design width, where a fixed size
prints proportionally **larger** — 10.24pt against a computer's 8.97pt. The condition is also **pre-existing and
unchanged by this task**: the same label prints at the same size from a computer today.

**Recorded as a deliberate deviation from the plan's gate, on measured grounds, not waved through.** The
remaining narrowing — scoping 6(a) to elements carrying an `order-form-*` class, which is what "the form's type
scale" actually means — is a test-only change worth making, and it is recorded as a follow-up rather than done
here, because it cannot change what comes off the founder's printer.

## What the confirming print must show

With **Include Rail Band Instructions in Print** ticked: **three sheets on three pages at 100%** — one sheet per
page, nothing sliced across a break, no sliver of the next sheet at a page foot, no blank page at the end.
(Two on two with that box unticked.)

Expect, and do not mistake for faults: white space down both sides as well as the foot, for the first time —
Safari's own margins, now respected rather than overhung; numbers a whisker smaller than a computer's, because
his phone leaves 7.347in of usable paper against a computer's 7.640in; and Safari's own URL, date and page
number stamped on each sheet, which no application can turn off.
