---
status: complete
phase: 08-the-rails-screen-finished
source: [08-VERIFICATION.md]
started: 2026-09-08T14:57:02Z
updated: 2026-09-08T20:57:27Z
automated_pass: "2026-09-08 — headless Chrome 152 over the DevTools protocol plus the app's browser pane, against localhost:3005 at commit 737fbbc, signed out; evidence in the session scratchpad (findings.md, shots/, pdfpng/)"
---

## Current Test

[testing complete]

## Tests

### 1. INSTRUCTIONS tab example rail names every mark legibly
expected: Open /design/rails, click INSTRUCTIONS. In both Flat and Domed the example rail names all eleven marks: Deck 3, Deck 1 and Deck 2 above their points, Domed Taper at the deck line's end, then Rail Mk1 / Corner Cut / Apex / Tuck 1 stacked beside the apex, Bottom Tuck 2 beside its mid-tuck point, and Bottom Tuck 1 and Bottom Tuck 3 hanging BELOW the axis with a leader line up to their marks. (That is the layout quick task 260908-cme asked for; it deliberately differs from the prototype, whose card is attached for reference.) Judge with your eyes: every name reads clearly; the four names in the apex column read as four separate lines (they sit 13px apart); Bottom Tuck 1 clears the row of axis numbers; Bottom Tuck 3's leader does not look like it strikes through the '1' tick. Already measured in Imperial (headless Chrome 152 and the pane): card fixed at 350px, every name inside the drawing, no name overlapping another, caption 3 1/2" Flat / 3" Domed. Screenshots sent: card1-flat-imperial-light.png, card1-domed-imperial-light.png, proto-card1-flat.png. (Metric has its own axis-number problem, recorded as test 9.)
result: pass

### 2. The plan/side figure shows the whole example board at once
expected: On the INSTRUCTIONS tab the "Turning Marks Into Rail Bands" figure shows the whole example board without scrolling (capped at about 472px tall), the card stays legible and light in both light and dark themes, and in Metric the station labels and the tail-distance range read in centimetres with the unit carried once.
result: pass
source: automated
evidence: "Figure box 373.9×472px (cap 472, aspect 499:630), label font 11.96px, whole board inside a 678px-tall column; white card rgb(255,255,255) with its #e4ddc9 border in light AND dark (body rgb(18,20,26), prose rgb(242,244,247), legend rgb(161,168,180)); Imperial 12\" / @Center / 12\" and '16-22\" off Tail'; Metric 30.5 cm / @Center / 30.5 cm and '40.6-55.9 cm off Tail', step 3 identical; screenshots figure-*-{light,dark}.png and card2-top-*.png reviewed."

### 3. Legend boxes toggle only their own line families
expected: Untick all nine legend boxes, then tick a mixed subset: exactly the ticked line families draw, while the board outline, the side strip and the station labels always stay.
result: pass
source: automated
evidence: "All ticked: plan {orange solid 6, orange dashed 2, blue solid 6, blue dashed 2, green 2}, side {black 4, red solid 3, red dashed 1, purple solid 1, purple dashed 1}. All nine unticked: plan empty, side only the 4 black outline paths; image, 12\"/@Center/12\" labels and taper note still present, figure height unchanged. Deck Marks 1 + Rail Band 1 + Tuck blend ticked: plan {orange solid 6}, side {black 4, red dashed 1, purple dashed 1} and nothing else. Re-ticking all restores the exact baseline counts."

### 4. View Full Sized measures true on screen
expected: At 100% browser zoom, open View Full Sized from the rails VIEWER toolbar and hold a ruler against the on-screen check bar (2 in / 50.8 mm) and against a known rail mark, in Imperial and in Metric — only a physical ruler can close this one. Already measured: the check bar is drawn at exactly 2 × the browser's measured pixels-per-inch (192px at 96), the rail at its inch size × the same factor (8.69 in wide for the default board), unchanged across Nose/Center/Tail and when the window is narrow (the dialog pans sideways, the drawing never shrinks); with the Nose section collapsed the dialog opens on Center with all three tabs offered; captions read 2" / 50.8 mm; no stray measuring element is left behind after flipping tabs.
result: pass

### 5. View Full Sized prints true
expected: Print the View Full Sized dialog with "Fit to page" off, in both systems. The printed check bar and a known rail mark measure true with a ruler, and no rails-screen chrome (sidebar, tab strip, toolbar) reaches the printed page.
result: issue
reported: "Shaper (after Test 4): \"the print button here results in a very poorly laid out print screen though.\" Automated print-to-PDF (headless Chrome 152, Letter and A4, both systems): the printed page is shifted half a dialog up and to the left — the check bar, the 'assumes a standard screen' line and the left ~3 in of the rail fall off the page; only the right part of the plot and the legend print. What does print is at true size (PDF transform 0.75), so the geometry is right and only the placement is wrong. Fixing the placement alone is not enough: with translate reset, Chrome shrinks the page to 82% (transform 0.6166) because the 8.69 in-wide true-size drawing is wider than portrait paper, so the check bar would print at about 1.6 in. Signed out, the 'Sign in and your boards are saved' banner also prints at the top of the page."
severity: major
source: automated + shaper

### 6. The print preference follows the account and never flashes
expected: Sign in on a second browser or profile: tick "Include Rail Band Instructions in Print" in one, reload the other and confirm the tick follows the account; then sign out and confirm the browser keeps its own value. Already measured signed out: ticking writes the cookie and localStorage together; the server itself renders the box ticked and the page marks "of 3" on reload (no unticked-to-ticked flash); the summary's mirror box and the rails box always agree; unticking reverses all of it, in both systems.
result: pass

### 7. The order form is unchanged unticked and gains one fixed page ticked
expected: With the box unticked, look at the summary's print preview in Imperial and Metric and confirm pages 1 and 2 are exactly what they were before this milestone (layout, values, the note, the "of 2" marks) — you are the only baseline; no pre-phase build can be run here. Then tick the box and confirm the third page reads as a proper reference sheet. Already measured (headless Chrome): unticked = 2 sheets marked "of 2"; ticked = 3 sheets marked "of 3", the third always the Flat rail with all eleven names and every legend line whatever the INSTRUCTIONS tab shows; every sheet lands in its 733×991 print box with nothing clipped or overflowing; A4 prints exactly 2 / 3 pages in both systems (third-page render sent: imperial-ticked-a4-p3.pdf.png). The blank first and last pages on Letter at 100% are already recorded as test 10 — no need to report them again.
result: pass

### 8. The production column exists
expected: In the Neon console, on the production branch, user_preferences has a print_rail_instructions boolean column; or, signed in on https://shaper-coral.vercel.app, tick the box and confirm it is still ticked in a private window signed in as the same account (a plain reload is not proof, because the cookie keeps the box ticked even if the account write failed).
result: pass

### 9. In Metric, every number on the INSTRUCTIONS example rail reads clearly
expected: With Metric chosen, the example rail's axis numbers stay readable — nothing collides along the bottom axis and nothing is clipped at the left edge — in both Flat and Domed.
result: issue
reported: "Automated DOM check and screenshot (Metric, INSTRUCTIONS tab, Flat and Domed): the example rail's bottom-axis numbers (210 … 20, 10 mm, 0) collide into one unreadable run of digits, and the left-axis numbers (90 … 20 and '10 mm') are clipped at the plot's left edge so 80 reads as 30 and '10 mm' as 'm'. Imperial is clean. The VIEWER plots in Metric only lose the left edge of '10 mm'; the printed third sheet is clean because it draws the plot larger. Screenshot sent: card1-flat-metric-light.png."
severity: minor
source: automated

### 10. The order form prints at 100% with no blank pages
expected: Printing the summary order form at 100% on Letter gives exactly the sheets and nothing else — two pages unticked, three ticked — with no blank leading or trailing page.
result: issue
reported: "Shaper (with Test 6): \"Pass, but the print has to be 97% or smaller to avoid a blank 1st and 5th page.\" and then: \"without the instructions page, I still get the blank first and last pages (1 and 4)\" Automated print-to-PDF agrees: on Letter, unticked prints 4 pages and ticked 5 — a blank first page, the sheets, a blank last page — while A4 prints 2 / 3. Not new to this phase: the wrapper and print rules involved are byte-identical to the pre-phase code."
severity: minor
source: shaper + automated

## Summary

total: 10
passed: 7
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-08-5
  truth: "Printing the View Full Sized dialog gives a page with the check bar and the rail at true physical size and nothing but the dialog's own content on it"
  status: failed
  reason: "User reported: the print button here results in a very poorly laid out print screen though. Automated print-to-PDF (Chrome 152, Letter and A4, both systems) shows why: the page is shifted half a dialog up and left — the check bar, the caveat line and the left ~3 in of the rail fall off the page; only the right part of the plot and the legend print. Fixing the shift alone makes Chrome shrink the page to 82%, so the check bar would print at about 1.6 in."
  severity: major
  test: 5
  root_cause: "components/ui/dialog.tsx centers DialogContent with Tailwind v4's -translate-x-1/2 -translate-y-1/2, which compile to the CSS `translate` property; app/design/rails/actual-size.css's print rule for [data-view-full-sized-dialog] resets position, inset and transform but not `translate`, so the now-static dialog is still offset by half its own width and height (measured in print media: plot at x −417px, check bar at y −124px). Adding `translate: none !important` puts everything on the page (plot at x 303, bar at y 84), but then Chrome's automatic shrink-to-fit scales the whole page to 82% (PDF CTM 0.6166 instead of 0.75) because the true-size drawing — 8.69 in wide for the default board — plus the dialog's padding is wider than portrait paper's ~7.7 in printable width. Secondary: components/auth/sign-in-banner.tsx carries no data-print-hide, so a signed-out shaper also gets the banner on the page."
  artifacts:
    - path: "app/design/rails/actual-size.css"
      issue: "print rule resets transform but not translate; no page orientation/size that lets an 8.69 in drawing print unscaled"
    - path: "components/ui/dialog.tsx"
      issue: "-translate-x-1/2 -translate-y-1/2 (CSS translate) survive into print"
    - path: "components/auth/sign-in-banner.tsx"
      issue: "no data-print-hide; prints when signed out"
  missing:
    - "translate: none !important on [data-view-full-sized-dialog] inside the print block"
    - "a page the true-size drawing fits without Chrome's automatic shrink — e.g. a landscape @page (11 in wide) emitted only while the dialog is open, with the dialog's own padding/border dropped in print — then re-measure: the PDF transform must stay 0.75 and the check bar 144pt"
    - "data-print-hide on the sign-in banner"
  debug_session: ""
- gap_id: G-08-9
  truth: "In Metric, every number on the INSTRUCTIONS example rail reads clearly"
  status: failed
  reason: "Automated DOM + screenshot check: in Metric the example rail's bottom-axis numbers (210 … 20, 10 mm, 0) collide into one unreadable run and the left-axis numbers (90 … 20, '10 mm') are clipped at the plot's left edge ('80' reads '30', '10 mm' reads 'm'); Imperial is clean."
  severity: minor
  test: 9
  root_cause: "components/rails/rail-section-plot.tsx draws a Metric tick label every 10 mm and keeps LEFT_PAD = 22 viewBox units for the y-axis labels — sized for Imperial single digits at the VIEWER's render scale. The INSTRUCTIONS card (components/rails/rail-instructions.tsx, fixed 350px card) renders the same plot at fit scale 0.785 (457px wide for a 582.8-unit viewBox), where the screen-pinned 14px labels are about 18 viewBox units across: 22 x-axis labels then need more width than the axis has and overlap, and two-digit y labels plus '10 mm' overflow the 22-unit left pad and are clipped by the svg's default overflow:hidden. Measured: 14 label-on-label overlaps along the x axis, 9 y labels outside the svg box; the VIEWER plots (scale 1.2) lose only the left edge of '10 mm'; the printed third sheet (scale ~1.8) is clean."
  artifacts:
    - path: "components/rails/rail-section-plot.tsx"
      issue: "Metric axis-label density and LEFT_PAD assume Imperial digit widths at a larger render scale"
    - path: "components/rails/rail-instructions.tsx"
      issue: "renders the plot small enough (fit=\"height\" in a 350px card) that the Metric labels no longer fit"
  missing:
    - "thin the Metric x-axis labels when the plot renders small (e.g. every 20 or 50 mm, or by available px per label) and give the y-axis labels room (wider LEFT_PAD in Metric or svg overflow visible), keeping the VIEWER and printed sheets pixel-identical in Imperial"
  debug_session: ""
- gap_id: G-08-10
  truth: "Printing the summary order form at 100% on Letter gives exactly the sheets — two pages unticked, three ticked — with no blank leading or trailing page"
  status: failed
  reason: "User reported: Pass, but the print has to be 97% or smaller to avoid a blank 1st and 5th page. — and with the instructions page off: without the instructions page, I still get the blank first and last pages (1 and 4). Automated print-to-PDF (Chrome 152) reproduces it: Letter unticked = [blank][sheet 1][sheet 2][blank], ticked = [blank][1][2][3][blank]; A4 = 2 / 3 pages."
  severity: minor
  test: 10
  root_cause: "components/summary/order-form.tsx's data-order-form-page wrapper keeps `px-6 py-8` in print, and app/design/summary/order-form.css's print block zeroes only the root's gap and max-width, not that padding. components/summary/use-print-fit.ts fits every sheet to min(Letter, A4) minus the 8mm @page margins × 0.995 = 990.5px, while Letter's printable height at that margin is 995.6px — five pixels of slack — so the wrapper's 32px top padding pushes sheet 1 onto page 2 (page 1 prints blank) and its 32px bottom padding spills a blank last page; A4's extra 66px of height absorbs both, which is why A4 prints clean. Pre-existing since Phase 7 (whose print audit checked clipping and zoom, never page count); the shaper's 97% workaround simply buys back the 32px."
  artifacts:
    - path: "components/summary/order-form.tsx"
      issue: "data-order-form-page wrapper's py-8 (and px-6) padding is not removed for print"
    - path: "app/design/summary/order-form.css"
      issue: "print block strips the root's gap/max-width but not the wrapper's padding"
    - path: "components/summary/use-print-fit.ts"
      issue: "printable box assumes the sheet is the only thing on the page; nothing accounts for wrapper padding"
  missing:
    - "zero the wrapper's padding in the print block (`[data-order-form-page] { padding: 0 !important }`) or fold it into the fit, then re-count pages on Letter at 100% (unticked 2, ticked 3) in both systems and confirm A4 is unchanged"
  debug_session: ""
