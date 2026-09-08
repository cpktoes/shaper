---
status: diagnosed
trigger: "Phase 8 UAT gap G-08-10 (test 10) — order form prints blank first and last pages on Letter"
created: 2026-09-08T21:02:28Z
updated: 2026-09-08T21:02:28Z
goal: find_root_cause_only
---

# Order form: blank first and last pages on Letter at 100%

## Symptoms
- Shaper: "the print has to be 97% or smaller to avoid a blank 1st and 5th page" and, with the instructions page off, "I still get the blank first and last pages (1 and 4)".
- Automated print-to-PDF (Chrome 152): Letter unticked = [blank][sheet 1][sheet 2][blank] (4 pages), ticked = [blank][1][2][3][blank] (5); A4 = 2 / 3 pages. Hiding the sign-in banner changes nothing.

## Evidence
- In print media the sheets root sits 32px below the top of its wrapper: components/summary/order-form.tsx's `data-order-form-page` wrapper keeps `px-6 py-8`; app/design/summary/order-form.css's print block zeroes the root's `gap` and `max-width` but not that padding.
- components/summary/use-print-fit.ts fits each sheet to min(Letter, A4) minus the 8 mm @page margins, times 0.995: 733.4 x 990.5 px. Letter's printable height at 8 mm margins is 995.6 px — five pixels of slack. 32 px of padding above sheet 1 pushes it to page 2 (page 1 prints blank); 32 px below sheet 2/3 spills a blank last page. A4's printable height is 1061 px, which absorbs both.
- The wrapper's classes and the print rules are byte-identical to the pre-phase commit 3210103 — this predates Phase 8 (Phase 7's print audit checked clipping and zoom, never page count). Scaling to 97% simply buys back the 32 px.

## Root cause
Screen-only padding around the paper survives into print while the sheets are fitted to the page with no allowance for it; Letter has no slack, A4 does.

## Files involved
- components/summary/order-form.tsx — `data-order-form-page` wrapper padding
- app/design/summary/order-form.css — print block leaves the wrapper padding in place
- components/summary/use-print-fit.ts — printable box assumes the sheet is alone on the page

## Suggested fix direction
Zero the wrapper's padding in the print block (`[data-order-form-page] { padding: 0 !important }`), or fold it into the fit; then count pages on Letter at 100% (unticked 2, ticked 3) in both systems and confirm A4 and the on-screen layout are unchanged.
