---
phase: 08-the-rails-screen-finished
plan: 07
subsystem: ui
tags: [print, css, rails, view-full-sized-dialog, dialog]

requires:
  - phase: 08-04
    provides: "ViewFullSizedDialog, its measured px-per-inch probe, the check bar, the caveat line, the Print button, and app/design/rails/actual-size.css's @media print block — all shipped working except placement and page shape."
provides:
  - "app/design/rails/actual-size.css — the dialog's print rule also resets the CSS `translate` property (Tailwind v4's compiled centring, missed by the existing `transform: none`) and strips its screen-only padding/ring/corners/background"
  - "components/rails/view-full-sized-dialog.tsx — a plain <style> element carrying a landscape @page rule, mounted only while the dialog is open, giving the true-size rail room on paper without shrinking"
  - "components/auth/sign-in-banner.tsx — data-print-hide, so a signed-out print carries no account nudge"
  - "components/rails/view-full-sized-dialog.test.ts — 4 new source-contract assertions pinning all three changes"
affects: [08-06-production-migration]

actuals:
  tokens: 2018
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A CSS reset for a Tailwind v4-centred popup must reset both `transform` and `translate` — Tailwind v4 compiles `-translate-x-1/2 -translate-y-1/2` to the `translate` property, not `transform`, so a print rule that only resets `transform` leaves the popup half its own width/height off the page."
    - "A route-scoped @page rule that must apply only while a specific component is mounted (not route-wide) is rendered as a plain <style> element inside that component, not declared in the route's shared print stylesheet — @page cannot be scoped by a CSS selector, so route-wide would leak to every print of that route."

key-files:
  created: []
  modified:
    - app/design/rails/actual-size.css
    - components/rails/view-full-sized-dialog.tsx
    - components/rails/view-full-sized-dialog.test.ts
    - components/auth/sign-in-banner.tsx

key-decisions:
  - "translate: none !important added as a second, explicitly-commented reset beside the existing transform: none !important, rather than replacing it — both compiled CSS properties carry an offset from Tailwind v4's centring classes, and the plan's own measured evidence (.planning/debug/view-full-sized-print-offset.md) showed transform: none alone left the popup at x -417px / y -124px."
  - "The landscape @page rule is rendered as an unadorned <style>{'@page {...}'}</style> element inside DialogContent (no href, no stylesheet-precedence prop) rather than added to actual-size.css, so it exists in the document exactly as long as Base UI has the dialog's popup mounted and cannot leak into a plain print of the rails screen (WR-01)."
  - "data-print-hide on the sign-in banner's root div is a deliberate two-surface change: order-form.css's own [data-print-hide] rule is unguarded, so this one attribute also removes the banner from the printed order form (wanted, and a dependency of a later plan) — recorded in the banner's own file comment rather than left for the next reader to discover."

requirements-completed: [RAIL-04]

coverage:
  - id: D1
    description: "Printing the View Full Sized dialog puts the whole dialog on the page — check bar, caveat line and the entire rail drawing all on the paper, none of it off an edge — while staying true size (content transform 0.75, check bar 144pt) on Letter and A4, in both unit systems."
    requirement: "RAIL-04"
    verification:
      - kind: unit
        ref: "components/rails/view-full-sized-dialog.test.ts#resets the CSS translate property inside its print block (G-08-5)"
        status: pass
      - kind: unit
        ref: "components/rails/view-full-sized-dialog.test.ts#names an @page rule asking for landscape, so the true-size rail prints unshrunk (G-08-5)"
        status: pass
    human_judgment: true
    rationale: "The source-contract tests pin that the two CSS mechanisms exist and are wired correctly, but the actual PDF measurement (content transform 0.75, check bar 144pt, on paper, in both systems) requires a running dev server and a ruler/PDF check this worktree could not perform (Turbopack cannot resolve next here) — carried to end-of-phase UAT per the plan's own instructions."
  - id: D2
    description: "With the dialog closed, printing the rails screen is unchanged: portrait, the screen's own content, no landscape page and no hidden screen."
    requirement: "RAIL-04"
    verification:
      - kind: unit
        ref: "components/rails/view-full-sized-dialog.test.ts#declares no @page rule of its own, so the landscape page can never leak to a plain rails print (WR-01)"
        status: pass
      - kind: unit
        ref: "components/rails/view-full-sized-dialog.test.ts#hides the rails screen from print only while the dialog is open (WR-01)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A signed-out print of the actual-size rail carries no sign-in banner."
    requirement: "RAIL-04"
    verification:
      - kind: unit
        ref: "components/rails/view-full-sized-dialog.test.ts#the sign-in banner carries data-print-hide, so a signed-out print carries no account nudge (G-08-5, D-15)"
        status: pass
    human_judgment: true
    rationale: "The source-contract test pins the attribute exists; confirming it actually keeps the banner off a printed page requires the same ruler/PDF check as D1, deferred to end-of-phase UAT."

duration: ~25min
completed: 2026-09-08
status: complete
---

# Phase 08 Plan 07: View Full Sized Print Layout Fixed Summary

Two CSS fixes close gap G-08-5: the "View Full Sized" rail dialog's print rule now resets the
Tailwind v4 `translate` property Chrome was using to shift the popup half a dialog off the page,
and the dialog itself now emits its own landscape `@page` rule so the 8.69in-wide true-size rail
has room to print without Chrome auto-shrinking it. The sign-in banner also now carries
`data-print-hide` so a signed-out print carries no account nudge.

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `app/design/rails/actual-size.css`'s print rule for `[data-view-full-sized-dialog]` now resets
  `translate` alongside the existing `transform` reset (the root cause identified in
  `.planning/debug/view-full-sized-print-offset.md`), and drops the popup's screen-only padding,
  ring, rounded corners and background so every millimetre of paper goes to the drawing.
- `ViewFullSizedDialog` now renders a plain `<style>` element carrying `@page { size: landscape;
  margin: 8mm; }`, mounted only while the dialog is open (Base UI only renders the popup then), so
  the true-size rail gets 10.37in of printable width on Letter and 11.06in on A4 — both comfortably
  clear of the 8.69in default-board drawing — without ever declaring `@page` route-wide.
- `components/auth/sign-in-banner.tsx`'s outer element carries `data-print-hide`, so a signed-out
  shaper's printed actual-size page no longer carries the "Sign in and your boards are saved"
  banner (and, as a deliberate and documented knock-on, neither does the printed order form).
- Four new source-contract tests in `view-full-sized-dialog.test.ts` pin all three changes
  structurally, so a future edit can't silently drop the `translate` reset, the landscape `@page`
  rule, or the banner's print-hide attribute.

## Task Commits

Each task was committed atomically:

1. **Task 1: The whole drawing lands on the page, still at true size** - `4a28874` (fix)
2. **Task 2: Nothing but the dialog's own content reaches the paper** - `27a26a8` (fix)

## Files Created/Modified
- `app/design/rails/actual-size.css` - print rule for `[data-view-full-sized-dialog]` extended
  with `translate: none !important` (plus a comment explaining why it's a second reset, not a
  duplicate) and screen-only padding/ring/corner/background stripped for print
- `components/rails/view-full-sized-dialog.tsx` - renders a plain `<style>` element with a
  landscape `@page` rule, mounted only while the dialog is open
- `components/auth/sign-in-banner.tsx` - outer `<div>` carries `data-print-hide`, with a file
  comment recording the deliberate order-form knock-on
- `components/rails/view-full-sized-dialog.test.ts` - 4 new source-contract assertions (translate
  reset, landscape `@page` present in the dialog, no `@page` in the route-wide stylesheet, banner
  carries `data-print-hide`)

## Decisions Made
See `key-decisions` in the frontmatter above for the full reasoning on: keeping `translate: none`
as a second reset beside `transform: none` rather than replacing it; rendering the landscape
`@page` rule from the component rather than the stylesheet; and the deliberate two-surface effect
of the banner's `data-print-hide`.

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched their `<action>` text directly; no
Rule 1-4 auto-fixes were needed.

## Issues Encountered

None. As anticipated by the plan's own "Worktree limits" execution note, `npm run dev` refused to
start in this worktree (`Could not find the Next.js package (next/package.json)` — Turbopack
cannot resolve `next` from a worktree checkout), so the print-to-PDF measurements described in
`<verification>` were not taken here. Per the plan's explicit instruction, this is recorded as a
one-line note rather than faked or treated as a failure — those measurements, and the two ruler
checks below, run on `main` after the wave merges / at end-of-phase UAT.

## User Setup Required
None - no external service configuration required.

## Human Verification Deferred to End-of-Phase UAT

Per `workflow.human_verify_mode: end-of-phase`, every `<human-check>` in this plan was not
performed by this executor and is carried forward for the phase's UAT pass, along with the
print-to-PDF measurement this worktree could not run:

- **Print-to-PDF measurement** (the plan's own `<verification>` steps 1-6): open View Full Sized
  on `/design/rails`, print to PDF with `preferCSSPageSize: true`, on Letter and A4, in Imperial
  and Metric. Confirm the content transform is 0.75 and the check bar is 144pt on all four, with
  the check bar, the caveat line, the whole rail and the legend inside the page box. Also confirm
  the closed-dialog print stays portrait/screen-content, and that arriving at `/design/rails` via
  client-side navigation from `/design/summary` still prints the dialog landscape at 0.75.
- **Task 1:** Open View Full Sized, print it with "Fit to page" off, hold a ruler to the paper —
  the check bar measures 2in (50.8mm) and a known rail mark measures true, in both Imperial and
  Metric.
- **Task 1:** On the same printed page, confirm the check bar, the "assumes a standard screen"
  line, the whole rail and the legend are all on the paper with nothing running off an edge.
- **Task 2:** Signed out, print the open dialog and confirm the sign-in banner is not on the page.
- **Task 2:** Close the dialog and print the rails screen straight from the browser's own print
  command: it still prints the rails screen, portrait, exactly as before.

## Next Phase Readiness
- G-08-5 is closed pending the end-of-phase ruler/PDF verification above.
- No blockers for any later phase 08 plan or for 08-06's production migration.

## Self-Check: PASSED

- FOUND: app/design/rails/actual-size.css
- FOUND: components/rails/view-full-sized-dialog.tsx
- FOUND: components/rails/view-full-sized-dialog.test.ts
- FOUND: components/auth/sign-in-banner.tsx
- FOUND: commit 4a28874
- FOUND: commit 27a26a8

---
*Phase: 08-the-rails-screen-finished*
*Completed: 2026-09-08*
