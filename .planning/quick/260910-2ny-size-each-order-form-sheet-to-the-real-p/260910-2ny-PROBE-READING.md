---
quick_id: 260910-2ny
artifact: probe-reading
gate: probe_gate
branch_taken: B
verdict: page-relative sizing REFUTED on iOS Safari — fall back to a phone-only box (research fallback (b))
device: iPhone, Safari, printed at 100% from https://www.shaperassistant.com/__print-probe.html
printed: 2026-09-10 10:45 local
source_pdf: "260910-2ny print probe (temporary — do not index).pdf" (5 pages, US Letter)
---

# Probe reading — what the founder's iPhone actually did

Measured from the drawing coordinates of the printed PDF, not from the text. The two rulers sit on the same
printed page, so every ratio below is scale-invariant: iOS's own shrink-to-fit cannot corrupt the reading.

## The scale, established first

The inch ruler's twelve `1in` bands printed **62.57pt** each (band pitch 125.1pt, alternating shading, band 12
spilling to page 2 — its `12in` label is the first text on page 2, which independently confirms the band count).

    1 CSS inch printed as 62.57pt  →  the document printed at 62.57 / 72 = 0.869 of true size.

**That 86.9% is the founder's own 86%.** It is not something he was choosing — it is iOS Safari's automatic
shrink-to-fit, and the print dialog's percentage was compounding on top of it.

## Band 1 — what `100vh` resolves to  (THE decisive reading)

The `10vh` bands printed **48.88pt** each.

    100vh = 10 x 48.88 = 488.8pt  =  488.8 / 62.57 = 7.812 CSS inches = 750 CSS px

## Band 3 — what `100vw` resolves to

The `.width-bar-wrap` printed **261.99pt** wide.

    100vw = 261.99 / 62.57 = 4.187 CSS inches = 402 CSS px

The `TODAY 7.6401in` bar printed 477.93pt (= 7.638 CSS in — correct to 0.03%), and its ticks were clipped after
`4in`, exactly where a 402px-wide viewport would cut them.

## The verdict on the founder's chosen mechanism

The page's own JS flag printed `VIEWPORT 402 711` — `window.innerWidth/innerHeight` at load, with Safari's
toolbar showing. The two measurements above give **402 x 750**: the same width, and the height Safari reports
once the toolbar is out of the way (the "large viewport", `lvh`).

    100vw = 402px = the SCREEN viewport width.   100vh = 750px = the SCREEN viewport height.
    Neither is the page area.

**`100vh` / `100vw` do NOT resolve against the page area in iOS Safari's print path.** Applied to the order
form, they would build a sheet 7.81in tall and **4.19in wide** — worse on width than the bug being fixed.

Per the founder's pre-agreed condition, this takes research fallback **(b), a phone-only box**, NOT (a).

## Three further facts this print established, all of which contradict what the source currently asserts

1. **iOS Safari DOES honour forced page breaks.** `SHEET A TOP` and `SHEET A BOTTOM` both printed on page 3;
   `SHEET B TOP` and `SHEET B BOTTOM` both on page 4. Research Finding 1 inferred "iOS inserted zero page
   breaks" from a constant page pitch in the order form's PDF; that inference was wrong — the pitch is just the
   page pitch. The order form's sheets fragment because they do not FIT, not because breaks are ignored.
   `break-inside: avoid` is dropped by every engine when a box exceeds one page, and that is what is happening.
2. **`beforeprint` DOES fire on iOS Safari.** The page printed `BEFOREPRINT: fired`. Both
   `components/summary/use-print-fit.ts` and `app/design/summary/order-form.css` carry head comments asserting
   the opposite ("a phone whose print path never ran this handler", "a phone whose print path never applied the
   handler's work to its print snapshot"). Those comments are now known to be false and must be corrected —
   the handler runs; what it computes is what is wrong.
3. **iOS Safari ignores `@page { margin: 8mm }`** and used uniform **0.579in (14.7mm)** margins, drawing its own
   URL/date header and page-number footer inside them. The printed content box was
   **7.34in x 9.82in** (528.55 x 707.12pt), consistent on every page.

## The real arithmetic of the bug, corrected

Safari shrink-to-fits by WIDTH. The sheet is 7.640in wide against a 7.34in printable width, so the whole sheet
is scaled by 7.34 / 7.640 = 0.961, which puts its height at 10.318 x 0.961 = **9.92in against 9.82in of page**.

**The sheet is only ~1.0% too tall once Safari's own shrink is accounted for** — far less than the 13% first
estimated — and that 1% is enough to fragment every sheet and turn three pages into four. `FIT_SAFETY`'s 0.5%
shave is already half of what is needed and simply does not go far enough.

What matters on iOS is therefore the sheet's ASPECT RATIO, since the width shrink is automatic:

    today            10.318 / 7.640 = 1.3505
    this iPhone       9.82  / 7.34  = 1.3379   <- must be at or below this
    Letter @ 0.579in  9.84  / 7.34  = 1.3406

## Founder's rulings taken with this reading

- **The rails "View Full Sized" dialog is explicitly OUT OF SCOPE, permanently.** "View full sized rails can be
  ignored, I like it how it is." Research Finding 6's follow-up is dropped, not deferred — do not raise it again.
- **Forced page breaks stay, and are the mechanism.** "The PDF should add page breaks, there's no reason to
  chance it, I'd rather force individual pages." Band 4 above proves iOS honours them, so the fix leans on
  explicit `break-after: page` per sheet rather than trusting sizing alone to land the breaks.
