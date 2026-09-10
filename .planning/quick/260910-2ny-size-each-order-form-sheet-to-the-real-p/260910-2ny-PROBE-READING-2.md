---
quick_id: 260910-2ny
artifact: probe-reading
round: 2
gate: task-7 confirming print — FAILED
verdict: the touch box applies correctly but cannot work — iOS does not honour an absolute inch WIDTH; the sheet must take its width from the page
device: iPhone, Safari, printed at 100% from https://www.shaperassistant.com/design/summary, 2026-09-10 11:53
source_pdf: "Board Order Form — Shaper Assistant 2.pdf" (4 pages, US Letter)
---

# Second reading — the confirming print failed, and it names the real lever

Still **4 pages for 3 sheets**. But the failure has moved, and the two prints together are decisive because the
CSS width was IDENTICAL in both while only the height changed.

## What is now proven to work

- **`(pointer: coarse)` matches on the founder's iPhone.** The sheet printed at ratio **1.2945** against the
  1.294118 the touch rule asks for. `data-print-touch` was set, the touch rule won, and the JS handler agreed
  with it. That whole mechanism is sound and should be kept.
- The sheet got **4.6% shorter** (11.832in -> 11.288in printed), matching the 4.18% the box was cut by.

## The measurement that kills the current approach

| | CSS sheet | printed | scale |
|---|---|---|---|
| before the fix | 7.6400 x 10.3182in (1.3505) | 8.758 x 11.832in (1.3509) | **1.1464** |
| after the fix  | 7.6400 x  9.8870in (1.2941) | 8.719 x 11.288in (1.2945) | **1.1413** |

**The same 7.640in of CSS printed at 8.758in and then 8.719in.** iOS Safari does not honour an absolute inch
width. It scales the document by ~1.144 regardless of the sheet's height, so the sheet overhangs the 7.347in
printable width by ~19% on both edges and its height scales with it into 11.29in of a 9.821in page.

**Implied model, predictive on both samples:** iOS lays the print out at a viewport of about **715 CSS px** and
maps that across the **full 8.5in paper width**, then draws its own 0.579in margins on top of the result
(733.438px / 715px x 8.5in = 8.72in — matches to 0.01in). Under that mapping 1 CSS px prints as 1/84.1in, not
1/96in, and only the first **618px** of a sheet lands inside the printable width at all.

**Therefore no HEIGHT can fix this.** To fit at a printed width of 8.719in the sheet's ratio would have to be at
or below 9.821 / 8.719 = **1.1264** — 13% squarer than the paper, visibly distorting the form, and calibrated to
one phone's margins. That is not a fix, it is a fudge.

## The lever, and the evidence it works

**Round 1's probe already demonstrated the answer and it was overlooked:** that page's outer wrapper carried no
absolute width, and it printed at **exactly 7.347in x 9.821in** — the printable box, margins honoured, nothing
overhanging. A viewport-relative layout is scaled to FIT by iOS; an absolute-width layout is not.

So a touch sheet must take its **width from the page** (relative, not inches) and its **height from its shape**
(`aspect-ratio`, which still yields a definite height so the `fr` bands divide it rather than going
content-proportional — the constraint `use-print-fit.ts`'s head comment exists to protect).

## What must be measured before asking for another print

`[data-order-form-root]` is the `@container` every `cqw` type size resolves against, and both the print
stylesheet and `useOrderFormPrintFit` currently pin it to the same absolute 7.640in. Making the touch path
viewport-relative therefore changes the container width on a phone, and with it the printed type size, which has
a **hard 9pt floor** (`order-form.css`'s type-scale comment: "The floor is 9pt — 12px — and nothing on either
sheet prints below it"). Measure the printed type size on the touch path and state it before the founder prints
again. Under the implied model a 12px floor at a 402px container would print at roughly 12/84.1 in = 0.143in =
10.3pt — above the floor, but that is an inference from the model, not a measurement.

## Costs to state plainly when this ships

A phone's sheet will print slightly SMALLER in absolute terms than a computer's — 7.347in wide against the
computer's 7.640in — because it now respects Safari's own margins instead of overhanging them. That is the
correct trade and it is the first time the phone's print will be a whole sheet on a whole page.

## Standing founder rulings, unchanged

- Desktop output must not change. `e2e/summary-print-size.spec.ts` stays green on 733.44 x 990.55 dots.
- Forced page breaks stay.
- The rails "View Full Sized" dialog is out of scope permanently.
- No new copy on the Summary screen.
