---
phase: quick-260909-hos
plan: 01
subsystem: ui
tags: [css, print, playwright, pdf, summary]

requires:
  - phase: 08
    provides: the Summary order form's two-page print path (G-08-10), `useOrderFormPrintFit`, `order-form.css`'s `@media print` block
provides:
  - the printed order form's size as a plain CSS fact in paper units, true before any JavaScript runs, so it prints correctly from a phone at 100% the same way it already did from a computer
affects: [summary, printing]

actuals:
  tokens: 6800
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A printed element's size can be declared twice on purpose — once in CSS as the source of truth (true the instant print media applies), once inline by JavaScript that exists only to force a layout it needs to measure — pinned together by a source-contract test that fails the moment the two numbers disagree"
    - "Reading a real printed PDF's page geometry back out with only node:zlib (inflate each stream object, keep the ones carrying both a `cm` and an `re` operator) instead of adding a PDF-parsing dependency"

key-files:
  created:
    - e2e/summary-print-size.spec.ts
  modified:
    - app/design/summary/order-form.css
    - components/summary/use-print-fit.ts
    - components/summary/order-form-print.test.ts
    - CLAUDE.md

key-decisions:
  - "The e2e spec waits for the sheet COUNT to reach its expected number (2, or 3 with Rail Band Instructions on) rather than for 'any sheet' — the Rail Band Instructions preference is resolved server-side first and only converges to the localStorage value the test sets after a post-hydration re-render, so a naive 'first sheet visible' wait raced the third sheet's appearance and printed too early"
  - "The contract test (Task 2) interprets the stylesheet's own literal mm figure against a fixed CSS_MM_PER_INCH=25.4 (the real, unchangeable unit-system fact), not against use-print-fit.ts's own MM_PER_INCH constant — using the hook's constant on both sides of the comparison would let a drift in that exact constant cancel out and go undetected"

requirements-completed: [QT-260909-hos]

coverage:
  - id: D1
    description: "The order form's printed sheet is sized by the print stylesheet itself, in paper units, before any JavaScript runs — proven by printing a real PDF with the app's print JavaScript suppressed and measuring the page geometry back out of it"
    requirement: QT-260909-hos
    verification:
      - kind: e2e
        ref: "e2e/summary-print-size.spec.ts › prints two pages at true size even when the browser never runs the print handler"
        status: pass
      - kind: e2e
        ref: "e2e/summary-print-size.spec.ts › the Rail Band Instructions sheet gets the same page box"
        status: pass
    human_judgment: false
  - id: D2
    description: "The printed sheet is unchanged in size and scale when the print JavaScript DOES run — no regression to today's working desktop print"
    requirement: QT-260909-hos
    verification:
      - kind: e2e
        ref: "e2e/summary-print-size.spec.ts › prints two pages at true size with the print handler running"
        status: pass
    human_judgment: false
  - id: D3
    description: "The stylesheet's printed-box numbers and use-print-fit.ts's own constants can never silently drift apart — a test fails the moment they do"
    requirement: QT-260909-hos
    verification:
      - kind: unit
        ref: "components/summary/order-form-print.test.ts › the stylesheet's printed sheet box and the print handler's own box describe the same piece of paper"
        status: pass
    human_judgment: false
  - id: D4
    description: "The Summary screen, and every other screen, renders exactly as before — the five desktop reference pictures match without being re-recorded"
    requirement: QT-260909-hos
    verification:
      - kind: e2e
        ref: "playwright: full suite, all three projects — e2e/desktop-baseline.spec.ts snapshots unchanged"
        status: pass
    human_judgment: false
  - id: D5
    description: "The order form actually prints at 100% from a phone, at the correct physical size (about 194 x 262 mm), in both Imperial and Metric"
    requirement: QT-260909-hos
    verification: []
    human_judgment: true
    rationale: "No phone or printer is reachable from this environment. The automated PDF-geometry proof (D1/D2) covers the mechanism this fix relies on — a sheet sized by the stylesheet rather than by JavaScript that may not have run — but the founder's own printer and ruler are the only way to confirm the physical result, per the plan's own deferred verification section."

duration: ~35min
completed: 2026-09-09
status: complete
---

# Quick Task 260909-hos: Order form prints at its right size from a phone at 100% Summary

**The Summary order form's printed sheet size is now a plain fact of the print stylesheet — three `calc()` declarations built from `use-print-fit.ts`'s own paper-size constants — so it prints correctly at 100% whether or not the app's print JavaScript actually reaches the browser's print snapshot, which is what was silently failing on a phone and forcing the founder to print at 86%.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-09T13:46:00Z (approx, worktree spawn)
- **Completed:** 2026-09-09T14:10:30Z
- **Tasks:** 3
- **Files modified:** 5 (1 new)

## Accomplishments

- `app/design/summary/order-form.css`'s `@media print` block now declares the printed root's width and every sheet's width and height in paper units (`calc(min(8.5in, 8.27in) - 16mm)` etc.) — the same four numbers `useOrderFormPrintFit` already used, just now true as CSS before any JavaScript runs.
- New `e2e/summary-print-size.spec.ts` prints the order form to a real PDF (Chromium `page.pdf()`, `desktop` project only) and reads the page geometry straight out of the file with nothing but `node:zlib` — no PDF library added. It proves: two pages at exactly 0.75 points-per-screen-dot with the print handler running; the same two pages at the same size with the handler's `beforeprint`/`afterprint` registration suppressed (the phone's actual situation); and three correctly-sized pages with the Rail Band Instructions sheet turned on. The two suppressed-handler cases were watched failing at today's broken sizes (755 x 647 and 755 x 892 dots) before the CSS fix, and passing at the right size (734 x 991 dots) after.
- `components/summary/order-form-print.test.ts` gained one contract test that reads both files' real source and checks the stylesheet's `calc()` expressions and the hook's `PORTRAIT_PAPER_IN`/`PAGE_MARGIN_MM`/`FIT_SAFETY` constants still describe the same sheet of paper, to within 0.02 screen dots. Watched failing with a paper figure nudged in the stylesheet, with a message naming exactly which number moved.
- `use-print-fit.ts` gained a head-comment paragraph (no logic, constant, or branch touched) recording that the stylesheet is now the source of truth and the hook's own remaining job is just forcing the printing layout into existence to measure overflow.
- `CLAUDE.md`'s Rule 2 carve-out now names `order-form.css`'s print block alongside `use-print-fit.ts` as the second place allowed its own inch/mm figures, and says why.
- Full Playwright suite (all three projects, all 5 desktop reference screenshots) run after every task and stayed green throughout, with zero baseline snapshot files rewritten.

## Task Commits

1. **Task 1: Make the printed sheet's size a fact of the stylesheet, and print a PDF to prove it** - `2a00535` (fix)
2. **Task 2: Pin the stylesheet's paper numbers to the handler's, so they cannot drift apart** - `c2943e9` (test)
3. **Task 3: Write down where paper units are allowed, then prove nothing on any screen moved** - `5010aaa` (docs)

_Task 2 was written as a single TDD-idiom commit (test added, watched failing, restored, verified passing), matching the plan's own instruction rather than a separate RED/GREEN commit split — the same idiom the file's three existing contract tests already use._

## Files Created/Modified

- `app/design/summary/order-form.css` - Added a `width` declaration to the `[data-order-form-root]` print rule and `width`/`height` declarations to the `[data-order-form-sheet]` print rule (the one carrying `aspect-ratio: auto`), all three built from `use-print-fit.ts`'s own `PORTRAIT_PAPER_IN`/`PAGE_MARGIN_MM`/`FIT_SAFETY` constants written as literal inch/mm figures (not their metric equivalents, which round to a different sub-pixel value). Rewrote the comment above the extended rule and added a paragraph to the file's head comment explaining the stylesheet is now the source of truth for the printed size.
- `components/summary/use-print-fit.ts` - Comment-only: one new head-comment paragraph explaining the stylesheet now owns the printed size and the hook's own inline writes exist only to force the printing layout for its overflow measurement. No constant, branch, or line of logic changed (confirmed by diffing against the pre-task base).
- `components/summary/order-form-print.test.ts` - One new test case (`printedSheetRuleBody`, `extractDeclarationValue`, `parseCalcNumbers` helpers, plus a `CSS_MM_PER_INCH` constant alongside the file's existing `CSS_REFERENCE_PX_PER_INCH`) asserting the stylesheet's and hook's printed-box numbers agree.
- `e2e/summary-print-size.spec.ts` - New spec. `extractPageGeometries()` walks a PDF's raw bytes, inflates every `stream`/`endstream` object with `node:zlib`, and keeps the ones carrying both a `cm` and an `re` operator (the page content streams) to read the content-transform scale and every drawn rectangle. `assertPageIsCorrect()` checks scale is 0.75±0.001 and at least one rectangle lands within 1.5 dots of 733.44 x 990.55. Three cases: print handler running, print handler suppressed (this is the case that reproduces the phone bug and failed before the fix), and Rail Band Instructions on with the handler suppressed.
- `CLAUDE.md` - Extended the existing Rule 2 parenthetical about `use-print-fit.ts`'s own inch/mm figures to also name `order-form.css`'s print block, and noted a test enforces the two never disagreeing.

## Decisions Made

- The e2e spec's third case initially raced the Rail Band Instructions sheet's appearance — `PrintInstructionsProvider` resolves its initial value server-side (no cookie is set by the test) and only reconciles to the localStorage value the test's `addInitScript` wrote after a post-hydration re-render. Waiting for "any `[data-order-form-sheet]` visible" resolved as soon as the first two (always-present) sheets appeared, before the third existed, printing a 2-page PDF instead of 3. Fixed by waiting for the sheet locator's COUNT to reach the expected number (`toHaveCount(2)` / `toHaveCount(3)`) instead — Playwright's auto-retrying assertion waits out the extra render pass.
- Task 2's contract test interprets the stylesheet's literal `mm` figure against a new `CSS_MM_PER_INCH = 25.4` constant (CSS's own fixed unit-system fact, the same role `CSS_REFERENCE_PX_PER_INCH = 96` already plays in this file) rather than against `use-print-fit.ts`'s own `MM_PER_INCH` constant. Using the hook's constant to interpret both sides of the comparison would let a hypothetical drift in `MM_PER_INCH` itself cancel out and never surface — using the true physical constant on the CSS side means a change to any of the plan's four named constants (`PORTRAIT_PAPER_IN`, `PAGE_MARGIN_MM`, `FIT_SAFETY`, `MM_PER_INCH`) without a matching stylesheet change is guaranteed to fail this test.

## Deviations from Plan

None - plan executed exactly as written. The four constants named in the plan (`PORTRAIT_PAPER_IN`, `PAGE_MARGIN_MM`, `FIT_SAFETY`, `MM_PER_INCH`) all get covered by Task 2's contract test per the decision above, which the plan's own behavior spec implied but didn't spell out mechanically.

## Issues Encountered

- Fresh worktree's `npx tsc --noEmit` initially failed on `Cannot find name 'LayoutProps'` in `app/design/layout.tsx` and `app/layout.tsx` — a known fresh-worktree gap (Next.js route types not yet generated in this checkout). Resolved by running `npx next typegen` once, per the orchestrator's own note; no source file was touched to fix this.

## Human verification deferred

Per `workflow.human_verify_mode` (end-of-phase) and the orchestrator's ruling that Task 1 (a `tracer`) must not stop for a human mid-run, none of this task's checks were performed interactively by a human. Deferred to end-of-phase UAT:

- Open `/design/summary` in a browser and use the browser's own Print preview at 100%: each sheet should fill its page with nothing cropped and no blank page at the end. (Task 1's `<human-check>`.)
- **The check this fix actually exists for, which no machine in this environment can run:** on the phone, open the Summary screen and print the order form at **100%** — no hand-dialled scale — once with the gear menu set to **Imperial** and once to **Metric** (the dimensions row carries different text in each, and a longer row is what would push a sheet over). Each sheet should land on its own page, whole, with no blank page after the last, exactly as it does from a computer.
- With a ruler on the printed page, the sheet's printed border should measure about **194 x 262 mm** (**7 5/8 x 10 5/16 in**).
- Worth knowing while checking: the Summary screen is Phase 10's screen, and PHON-09 says printing stays a desktop job there. This task changed only how the printed page is *sized* — the Summary screen's on-screen layout is untouched, and making its on-screen preview fit a phone's screen is quick task 260909-i7r, a sibling task landing separately.

The automated PDF-geometry proof (`e2e/summary-print-size.spec.ts`, run on real Chromium print output with the app's own print JavaScript deliberately suppressed — the mechanism behind the phone's failure) is the primary proof and passed on all three cases; the founder's own printer and ruler are the only way to confirm the physical result end-to-end.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- No blockers. The change is fully contained to the five files named in the plan's `files_modified`: `app/design/summary/order-form.css`, `components/summary/use-print-fit.ts`, `components/summary/order-form-print.test.ts`, `e2e/summary-print-size.spec.ts`, and `CLAUDE.md`.
- `lib/geometry/`, `components/ui/*`, `app/globals.css`, `e2e/phone-screens.spec.ts`, `e2e/phone-layout.spec.ts`, and `e2e/desktop-baseline.spec.ts` are untouched — verified by `git diff --name-only` against the pre-task base (`a445867`) and by the full Playwright suite's zero baseline-snapshot changes across three separate full-suite runs (once per task).
- No dependency was added — confirmed `package.json`/`package-lock.json` carry no diff against the pre-task base. The PDF reader uses only `node:zlib`.
- A sibling quick task (260909-i7r) is scaling the on-screen sheet for phones and will land separately; this task did not touch `order-form.tsx`'s screen classes or anything outside `@media print`.

## Self-Check: PASSED

All five modified/created files confirmed present on disk; all three task commit hashes (`2a00535`, `c2943e9`, `5010aaa`) confirmed present in `git log`.
