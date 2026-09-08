---
status: diagnosed
trigger: "Phase 8 UAT gap G-08-5 (test 5) — View Full Sized prints true"
created: 2026-09-08T21:02:28Z
updated: 2026-09-08T21:02:28Z
goal: find_root_cause_only
---

# View Full Sized: the printed page is shifted half a dialog off the page

## Symptoms
- Shaper: "the print button here results in a very poorly laid out print screen though."
- Automated print-to-PDF (headless Chrome 152, Letter and A4, Imperial and Metric): only the right part of the rail plot and the legend print; the check bar, the "assumes a standard screen" line and the left ~3 in of the rail are off the page. Signed out, the "Sign in and your boards are saved" banner prints at the top.

## Evidence
- Print-media DOM (dialog open, 1440px layout): plot box at x = -417px, check bar at y = -124px — the dialog sits half its own width left of, and half its height above, the page origin.
- PDF content transform of the as-shipped print is 0.75 (96 CSS px/in -> 72 pt), i.e. what does print IS true size; only the placement is wrong.
- Injecting `@media print { [data-view-full-sized-dialog] { translate: none !important } }` puts the dialog at x 0 / y 36 (below the banner), the check bar at (1206, 84) and the plot at (303, 158) — everything on the page. So the offset is the CSS `translate` property, not `transform`.
- components/ui/dialog.tsx centres DialogContent with `-translate-x-1/2 -translate-y-1/2`; in Tailwind v4 these compile to the `translate` property. app/design/rails/actual-size.css's print rule for `[data-view-full-sized-dialog]` resets `position`, `inset`, `transform`, `max-height`, `max-width` — but not `translate`.
- With translate reset, the PDF transform drops to 0.6166 (82%): Chrome's automatic shrink-to-fit kicks in because the true-size drawing (8.69 in wide for the default board: the shared axis runs from 8 in inboard to the apex) plus the dialog's own padding is wider than portrait paper's ~7.7 in printable width. The check bar would then print at about 1.6 in — no print-dialog setting turns that shrink off.
- The sign-in banner (components/auth/sign-in-banner.tsx, mounted in app/design/layout.tsx) carries no `data-print-hide`, so the `body:has([data-view-full-sized-dialog]) [data-print-hide]` rule never reaches it.

## Root cause
Two layers: (1) the print stylesheet neutralises `transform` but Tailwind v4's centring lives in `translate`, so the statically-positioned dialog keeps a -50%/-50% offset on paper; (2) once placed, an 8.69 in-wide true-size drawing cannot fit portrait Letter/A4, and Chrome scales the whole page down rather than clip, which defeats "true size".

## Files involved
- app/design/rails/actual-size.css — print rule misses `translate`; no page orientation for the true-size drawing
- components/ui/dialog.tsx — `-translate-x-1/2 -translate-y-1/2` survive into print
- components/auth/sign-in-banner.tsx — no `data-print-hide`

## Suggested fix direction
Add `translate: none !important` to the dialog's print rule; give the true-size page room without shrinking — e.g. a landscape `@page` (11 in wide) emitted only while the dialog is open (a `<style>` rendered inside the dialog, since @page cannot be gated by :has()), with the dialog's padding/border dropped in print; mark the banner `data-print-hide`. Re-measure with print-to-PDF: the content transform must stay 0.75 and the check bar 144 pt, on Letter and A4, in both systems.
