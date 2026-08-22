---
quick_id: 260822-nbz
slug: summary-volume-rows-and-one-page-print
date: 2026-08-22
status: planned
source: user report 2026-08-22 — Summary's Volume card omits rows the Volume page shows; Summary print spills to multiple pages
files_modified:
  - components/volume/volume-calculation-card.tsx
  - components/summary/use-print-fit.ts
  - app/design/summary/summary.css
---

# Quick Task: Volume parity on the Summary, and a print that really is one landscape page

## 1. The Summary's Volume card is a subset, not a copy

`volume-calculation-card.tsx` has two branches. The `compact` one (Summary) drops rows the full
Volume screen shows:

- `Center Thickness` — when not importing a template
- `Tail` / `Center` / `Nose Cross-Section Thickness` — the three rows gated on `result.geomReady`,
  which is exactly the "importing from template and rails" case the user is looking at

The compact branch gets those rows. What it keeps out is chrome, not data: the "Volume Calculation"
heading (the card already has a title) and the closing disclaimer paragraph.

This is now cheap to do — quick task `260822-n02` made the Volume card content-height, so extra rows
grow the card and Fin Placement takes what is left, instead of squeezing the fin diagram.

## 2. The print sheet spills onto a second page

Measured with the print rules applied at a 1600x900 window:

- natural print layout **1600 x 1306**
- `useSummaryPrintFit`'s hardcoded target is `PAGE_W 1030 x PAGE_H 750`, giving zoom 0.574 and a
  scaled sheet of **919 x 750**
- a US Letter landscape page at 0.4in margins is **979 x 739**; A4 landscape is **1045 x 717**

So the sheet is 11px too tall for Letter and 33px too tall for A4. `PAGE_H = 750` is simply taller
than either page's printable height. Two more things make it worse:

**The margins are not pinned.** `@page` sets `size: landscape` but no margin, so the printable area
moves with whatever the shaper has in their print dialog. A target measured against one margin
setting is wrong for another.

**The measurement happens in the screen layout, not the print layout.** `beforeprint` fires before
the browser relays out for print. The hook measures the root at the *window's* width — 1600px here —
but the page prints at ~995px, where the same grid reflows taller. So even a correct target measured
at the wrong width under-estimates the printed height. At a narrow window it is worse still: the
summary is a 2233 x 3728 single column on screen, nothing like what prints.

### The fix

**Pin the margins** so the printable box is knowable: `@page { size: landscape; margin: 8mm }`.

**Derive the target from real paper**, not a magic number. Take the smaller of Letter and A4
landscape in each axis so the sheet fits whichever the printer holds, and convert inches to CSS px
with a 1in probe element rather than assuming 96dpi:

```
min width  = 11in    (Letter)  - 2*8mm = 10.37in
min height = 8.27in  (A4)      - 2*8mm =  7.64in
```

**Measure at the print width.** In `beforeprint`, set the root's width to the printable width before
reading `scrollHeight`, so the layout being measured is the layout that prints. Then, because `zoom`
scales that width down too, lay out a second pass at `PAGE_W / z1` so the scaled result fills the
page rather than letterboxing:

```ts
el.style.width = `${PAGE_W}px`;
const z1 = Math.min(1, PAGE_H / el.scrollHeight);
let scale = z1;
if (z1 < 1) {
  const layoutWidth = PAGE_W / z1;
  el.style.width = `${layoutWidth}px`;
  // PAGE_W / layoutWidth is z1, so this can only ever shrink — both axes stay inside the page.
  scale = Math.min(1, PAGE_H / el.scrollHeight, PAGE_W / layoutWidth);
}
el.style.zoom = String(scale);
```

`afterprint` must clear the inline width as well as the zoom.

## Verify

- With the print rules applied, the scaled sheet fits inside **both** Letter and A4 landscape
  printable boxes, measured, at a wide window and at a narrow one.
- The Volume card on the Summary shows the same rows as the Volume screen when importing.
- `npm test`, `tsc`, `eslint` clean.
