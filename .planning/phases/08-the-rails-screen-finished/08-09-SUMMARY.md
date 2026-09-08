---
phase: 08-the-rails-screen-finished
plan: 09
subsystem: ui
tags: [print, css, order-form, summary, page-fit]

requires:
  - phase: 08-07
    provides: "components/auth/sign-in-banner.tsx carries data-print-hide, which order-form.css's own [data-print-hide] rule already acts on — needed so the sign-in banner isn't the thing that pushes a signed-out print onto an extra page while this plan's fix is measured."
provides:
  - "app/design/summary/order-form.css — the print block zeroes the page wrapper's screen padding (both axes), closing the 32px gap that pushed Letter onto four/five pages instead of two/three"
  - "components/summary/order-form-print.test.ts — new source-contract test pinning the padding reset and the stylesheet/hook margin mirror, so a future edit can't silently reintroduce either"
  - "components/summary/use-print-fit.ts — comment-only third numbered item recording that Letter leaves only about five printed pixels of slack, so anything else in the printed flow costs a whole page"
affects: [08-06-production-migration, phase-08-uat]

actuals:
  tokens: 2700
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A stylesheet/hook pair that promises to mirror the same numeric constant in prose (order-form.css's @page margin and use-print-fit.ts's PAGE_MARGIN_MM) is pinned by a test that reads both files' real source and compares the extracted numbers directly, rather than restating either as a literal — the same source-contract idiom lib/units-isolation.test.ts and view-full-sized-dialog.test.ts already use, extended to cross-file numeric mirrors instead of single-file structural properties."

key-files:
  created:
    - components/summary/order-form-print.test.ts
  modified:
    - app/design/summary/order-form.css
    - components/summary/use-print-fit.ts

key-decisions:
  - "The padding reset lands on the print block's existing [data-order-form-page] rule (the one that already pins the wrapper white) rather than a second rule for the same element — one rule, two related resets, one comment explaining both."
  - "The new test's third assertion (fitted sheet height + wrapper padding fits inside the shortest paper's printable height) derives every number from the two files' own constants — @page's margin, PAGE_MARGIN_MM, MM_PER_INCH, FIT_SAFETY, and the PORTRAIT_PAPER_IN array read structurally — rather than pasting 995.6 or 990.5 as literals, per the plan's own instruction."
  - "use-print-fit.ts's head comment was extended from 'Two things this originally got wrong' to 'Three things', even though item 3 (Letter's five-pixel slack) is a lesson about a bug that lived in order-form.css, not in this hook — the plan asked for the reason Letter has no room to spare to be written where the box is computed, and the two-item frame already established the voice to extend."

requirements-completed: [PRNT-06]

coverage:
  - id: D1
    description: "Printing the order form at 100% on US Letter gives exactly the sheets and nothing else — two pages with the instructions box unticked, three with it ticked, in Imperial and in Metric; A4 unchanged in both systems; each sheet's own content, layout and page marks are unchanged; the summary screen's on-screen layout is unchanged."
    requirement: "PRNT-06"
    verification:
      - kind: unit
        ref: "components/summary/order-form-print.test.ts#zeroes the page wrapper's screen padding in print, so a future tidy-up cannot quietly put the blank pages back"
        status: pass
      - kind: unit
        ref: "components/summary/order-form-print.test.ts#the fitted sheet, plus the wrapper's now-zero padding, fits inside the shortest portrait paper's printable height"
        status: pass
    human_judgment: true
    rationale: "The source-contract tests pin that the padding reset exists and that the resulting arithmetic fits Letter's printable height, but the actual page-count claim (exactly 2/3 pages, no blank first/last page, on real Letter and A4 paper) requires a running dev server and a print-to-PDF or ruler check. npm run dev could not start in this worktree (node_modules/next is absent outside the main checkout, the same limitation plan 08-07 documented) — carried to the orchestrator's post-merge print-to-PDF measurement on main and to end-of-phase UAT per the plan's own instructions."
  - id: D2
    description: "The 8mm page margin declared in order-form.css's @page block and the millimetre value use-print-fit.ts mirrors as PAGE_MARGIN_MM can no longer drift apart unnoticed — a test reads both files' own constants and fails if they disagree."
    requirement: "PRNT-06"
    verification:
      - kind: unit
        ref: "components/summary/order-form-print.test.ts#the stylesheet's @page margin and use-print-fit.ts's PAGE_MARGIN_MM mirror the same number"
        status: pass
    human_judgment: false
  - id: D3
    description: "The reason Letter has no room to spare — about five printed pixels of slack once a sheet is fitted to the page box — is recorded as a third numbered item in use-print-fit.ts's head comment, in the voice of the two items already there, with no change to PAGE_MARGIN_MM, FIT_SAFETY or any behaviour in that file."
    verification:
      - kind: other
        ref: "git diff components/summary/use-print-fit.ts — comment-only diff, confirmed line-by-line before commit"
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-09-08
status: complete
---

# Phase 08 Plan 09: The Order Form's Blank Letter Pages, Closed Summary

Removes the 32px of on-screen padding above and below the order form's paper — the screen desk it
sits on — from the print path, closing gap G-08-10: on US Letter the form used to print a blank
page, then the form, then another blank page, because that padding ate the roughly five printed
pixels of slack Letter's printable box leaves once a sheet is fitted to it. A4 had 66px more room
and always absorbed it, which is why the bug only ever showed on Letter and why printing at 97%
"fixed" it by buying back exactly those pixels elsewhere.

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files created:** 1
- **Files modified:** 2

## Accomplishments

- `app/design/summary/order-form.css`'s print block now zeroes the `[data-order-form-page]`
  wrapper's padding (`px-6 py-8` on screen) on the same rule that already pins that wrapper white,
  with a comment explaining why: on paper the sheet IS the page, so the screen's "desk" around it
  has nothing to sit on, and Letter has no spare pixels to give it. The side padding goes with it
  too, so the pinned sheet gets its full print width back rather than being cropped by the
  wrapper's now-narrower inner box. Nothing outside `@media print` changed — the on-screen order
  form is pixel-identical.
- A new source-contract test, `components/summary/order-form-print.test.ts`, reads the real source
  of both files (never restates a number as a literal) and asserts three things: the padding reset
  is still present, `order-form.css`'s `@page` margin and `use-print-fit.ts`'s `PAGE_MARGIN_MM`
  are the same number, and the fitted sheet plus the wrapper's now-zero padding fits inside the
  shortest portrait paper's printable height. Bumping the `@page` margin to 9mm locally made the
  margin-mirror assertion fail as expected; the margin was put back to 8mm before committing.
- `components/summary/use-print-fit.ts`'s head comment gained a third numbered item (comment-only
  diff, confirmed by `git diff`) recording that Letter leaves only about five printed pixels of
  slack once a sheet is fitted to the page box, so anything else in the printed flow — the screen
  padding this plan removes, the sign-in banner plan 08-07 hid — costs a whole page. No change to
  `PAGE_MARGIN_MM`, `FIT_SAFETY`, or any behaviour in that file.

## Task Commits

Each task was committed atomically:

1. **Task 1: The paper's screen padding comes off for print** - `1360d62` (fix)
2. **Task 2: The page box can no longer drift without a test noticing** - `bc9f13d` (test)

## Files Created/Modified

- `app/design/summary/order-form.css` - the `[data-order-form-page]` print rule now zeroes
  padding alongside its existing `background: #fff !important;`, with the padding-removal
  reasoning added to the rule's comment
- `components/summary/order-form-print.test.ts` - new file, 3 source-contract assertions: padding
  reset present, `@page` margin and `PAGE_MARGIN_MM` match, fitted-sheet-plus-padding arithmetic
  fits Letter's printable height — all derived from the two files' own constants, none hand-typed
- `components/summary/use-print-fit.ts` - head comment only: "Two things" became "Three things",
  with a new item 3 explaining Letter's five-pixel slack and naming both consumers of that budget
  (this plan's padding fix and plan 08-07's sign-in banner fix)

## Decisions Made

See `key-decisions` in the frontmatter above for the full reasoning on: landing both resets on the
existing white-background rule rather than a second rule; deriving every number in the third test
assertion from the files' own constants rather than pasting computed literals; and extending the
"Two things this originally got wrong" frame to three items even though item 3 is a lesson about a
bug that lived in a different file.

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched their `<action>` text directly; no
Rule 1-4 auto-fixes were needed.

## Issues Encountered

None. As anticipated by the plan's own "Worktree limits" execution note and already documented by
plan 08-07's SUMMARY, `npm run dev` cannot start in this worktree — `node_modules/next` is absent
here (`node_modules` in this worktree holds only a `.vite` cache), consistent with Turbopack's
inability to resolve `next` outside the main checkout. The print-to-PDF page-count measurement
described in the plan's `<verification>` section was therefore not taken here; per the plan's
explicit instruction this is recorded as a one-line note rather than faked or treated as a
failure. `npx tsc --noEmit` reports the two pre-existing `LayoutProps` errors in
`app/design/layout.tsx` and `app/layout.tsx` that prior worktree executions in this phase (08-05,
08-07) have already documented as a known worktree artifact unrelated to this plan's changes —
neither file was touched here. `npx vitest run` is green in full: 42 test files, 2252 passed, 2
skipped (pre-existing skips, unrelated to this plan).

## User Setup Required

None - no external service configuration required.

## Human Verification Deferred to End-of-Phase UAT

Per `workflow.human_verify_mode: end-of-phase`, every `<human-check>` in this plan was not
performed by this executor and is carried forward for the phase's UAT pass, along with the
print-to-PDF measurement this worktree could not run:

- **Print-to-PDF measurement** (the plan's own `<verification>` steps 1-6, with plan 08-07's
  sign-in banner `data-print-hide` change present): load `/design/summary` signed out,
  `Page.printToPDF` on Letter (8.5 x 11) and A4 (8.27 x 11.69), `printBackground: true`, no CSS
  page-size preference, with the instructions box unticked and ticked, in Imperial and Metric —
  eight counts total. Expected: **2** pages unticked and **3** ticked, every time (before this
  plan, Letter gave 4 and 5). Confirm each PDF still carries its page marks and no page is blank,
  and that the sheet is fully inside the page box horizontally as well as vertically.
- **Task 1:** Print the summary order form at 100% on US Letter with the instructions box
  unticked — exactly two pages, no blank first or last page. Tick the box — exactly three.
- **Task 1:** Do the same on A4 and confirm it is unchanged, then look at the summary screen
  afterwards to confirm the paper still sits with the same air around it as before.

## Next Phase Readiness

- G-08-10 is closed pending the end-of-phase print-to-PDF measurement and ruler/visual checks
  above.
- The source-contract test now makes a future accidental reintroduction of the padding, or a
  future drift between the stylesheet's margin and the hook's copy of it, fail `npx vitest run`
  immediately rather than surviving unnoticed the way this bug did through a Phase 7 print audit
  and a Phase 8 phase review.
- No blockers for any later phase 08 plan or for the wave's merge.

## Self-Check: PASSED

- FOUND: app/design/summary/order-form.css
- FOUND: components/summary/order-form-print.test.ts
- FOUND: components/summary/use-print-fit.ts
- FOUND: commit 1360d62
- FOUND: commit bc9f13d

---
*Phase: 08-the-rails-screen-finished*
*Completed: 2026-09-08*
