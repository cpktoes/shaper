---
phase: quick-260910-2ny
plan: 01
subsystem: ui
tags: [css-print, next-public-folder, playwright, ios-safari]

requires: []
provides:
  - "public/__print-probe.html — a hidden, self-contained static probe page that lets the founder
    print from his own iPhone and hand back a PDF answering whether iOS Safari resolves 100vh/100vw
    against the real printed page area. Built in Task 1, deleted again in Task 6 once its one
    question was answered."
  - "A phone-only print rule (`[data-order-form-root][data-print-touch] [data-order-form-sheet]`
    in app/design/summary/order-form.css) that gives a touch device's Summary order form sheet a
    shorter, paper-shaped box, while leaving a computer's printed sheet byte-identical to before."
  - "components/summary/order-form-print.test.ts's source-contract cases, which now also pin the
    phone rule to the same PORTRAIT_PAPER_IN/PAGE_MARGIN_MM constants use-print-fit.ts uses for the
    desktop box, so the two can never quietly drift apart."
  - "e2e/summary-print-touch-box.spec.ts — a new browser spec (written, not yet run in this
    worktree — see Deviations) measuring the phone box on Chromium, WebKit-iPhone and
    WebKit-Android, plus a real Chromium PDF proving the shorter sheet still paginates one sheet
    per page."
affects: [260910-2ny-Task-7]

actuals:
  tokens: 13600
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A hidden public/ probe page (noindex, zero external requests) as the only way to settle a
      print-engine question no CLI or emulator can answer — build it, get a human to print it on
      the real device, read the PDF, then delete it."
    - "A phone-only print box expressed as a SHAPE (a ratio applied to a width the sheet already
      has) rather than a SIZE, so it survives an automatic width-shrink the app cannot see or
      control — proved with a one-line inequality (a paper-shaped box fits inside any uniform
      margin) rather than a fudge factor."
    - "A DOM attribute written once at mount from a screen-media `matchMedia` query
      (`data-print-touch`), read only by print-media CSS — keeps the print stylesheet from ever
      having to ask a printer what kind of pointer it has, and keeps 'which device' out of a print
      media query that would otherwise test the page, not the screen."

key-files:
  created:
    - public/__print-probe.html (Task 1, deleted again in Task 6)
    - e2e/summary-print-touch-box.spec.ts
  modified:
    - components/summary/order-form-print.test.ts
    - app/design/summary/order-form.css
    - components/summary/use-print-fit.ts
    - components/summary/order-form.tsx
    - components/rocker/rocker-view-frame.ts
    - e2e/summary-print-size.spec.ts (comment-only — see Deviations)

key-decisions:
  - "Followed the plan's spec for Task 1's probe verbatim — no architectural deviations, no Rule 4
    escalations (recorded in the original Task-1 summary, kept below unmodified)."
  - "The founder's own iPhone print sent this plan down research fallback (b) — a phone-only box —
    because `100vh`/`100vw` in the probe resolved to the SCREEN viewport (402 x 750 CSS px), not the
    printed page. A page-relative mechanism was therefore refuted before Tasks 3-6 ever started;
    see 260910-2ny-PROBE-READING.md."
  - "The touch sheet's height is a RATIO — `min(11 / 8.5, 11.69 / 8.27)`, the squarest of the two
    portrait papers this form already fits (US Letter) — applied to the same width expression the
    desktop rule already uses, never a literal number. Proof: for a portrait page with a uniform
    margin on every side, the printable box's ratio is at or above the paper's own height/width for
    any margin from zero upward, so a sheet built to that ratio fits inside whatever uniform margin
    a touch device's browser picks. Measured against the founder's own iPhone page (9.82in /
    7.34in = 1.3379): the chosen ratio (1.294118) leaves 3.3% to spare."
  - "`FIT_SAFETY` (0.995) and the `zoom` overflow guard were both KEPT on the desktop path, reversing
    the original plan's intent to remove them. The original plan assumed (from RESEARCH.md Finding
    1) that iOS slices a continuous ribbon, which would make a proportional shave accumulate across
    sheets. The founder's iPhone print DISPROVED that: `SHEET A TOP`/`BOTTOM` landed together on one
    page and `SHEET B`'s pair on the next, so iOS fragments and honours forced breaks exactly like
    every other engine measured. `FIT_SAFETY` is part of the desktop box the measured e2e gate pins
    (D-01), so it stays untouched; the touch height does not use it at all — it carries 3.3% of
    headroom by construction and does not need one."
  - "The touch height is derived in `use-print-fit.ts` as `TOUCH_SHEET_RATIO = Math.min(...PORTRAIT_PAPER_IN.map(p => p.height / p.width))`
    rather than a second literal — it can only ever mean 'the squarest paper we claim to fit', and
    it cannot silently drift from the same four constants the desktop box already shares with the
    stylesheet."
  - "The touch attribute (`data-print-touch`) is decided from the POINTER, at mount, in a separate
    `useEffect` from the print-time one — never from a width, and never inside `beforePrint`. A
    width query in print media tests the PAGE, not the screen, which would either match on a
    computer (wrecking D-01) or miss an iPad (a coarse pointer on a wide screen, running the same
    WebKit print path an iPhone does). `beforePrint` then reads the attribute the mount effect
    already wrote, rather than asking the media query a second time, so the inline height it writes
    can never disagree with the CSS rule that is about to apply."
  - "Added `[data-order-form-sheet] + [data-order-form-sheet] { break-before: page; }` beside the
    existing per-sheet `break-after: page` (D-03) — belt and braces, not a repair. Verified at plan
    time (and unchanged by this session) that the print buttons sit outside
    `[data-order-form-root]`, so the existing `:last-child` reset already prevents a trailing blank
    page; the new rule is what keeps that true if the tree around the sheets ever changes."
  - "Moved the sheet's `overflow: hidden` print backstop out of the `[data-order-form-root][data-printing]`
    scope and made it unconditional. That scoping rested on the (now-disproven) belief that a
    phone's print path never applies the print handler's work; unconditional, it holds whether or
    not any JavaScript ever runs. `data-printing` itself is still written by the handler, kept only
    because `e2e/summary-print-size.spec.ts`'s middle case still reads its absence to prove the
    handler was really suppressed there."
  - "Four comment sites were found false against the founder's iPhone print and corrected in place,
    following the plan's own comment audit exactly (no site outside that audit's list was touched):
    `order-form.css`'s head comment and its printed-sheet-box rule comment (both claimed a phone
    never ran the print handler and printed roughly 86% too big — corrected to say the handler runs
    there, and the 86% is Safari's own automatic width shrink); `use-print-fit.ts`'s head comment
    (same false story, same correction); and `e2e/summary-print-size.spec.ts`'s head comment's third
    'fact' (claimed the suppressed-handler case reproduces what a phone's print path actually did —
    corrected to say it is a deliberate simulation, not a description, now that the probe print
    showed `beforeprint` really does fire on iOS). Three further sites got one added clause each,
    per the plan's audit, rather than a rewrite: the `@page` margin comment (iOS ignores it
    entirely); the root-width comment (cut the false 'phone failure' attribution, kept the load-
    bearing half); and `rocker-view-frame.ts`'s `ORDER_FORM_ROCKER_BOX_PX` comment (recorded the
    4.18%-shorter touch box costs the rocker frame nothing — still width-bound — and repointed a
    dangling `<post_merge_check>` reference at Task 7)."

requirements-completed: [PRNT-06]

coverage:
  - id: D1
    description: "public/__print-probe.html exists, is self-contained, and its bands/flags populate
      correctly (Task 1, unchanged this session)"
    verification:
      - kind: e2e
        ref: "recorded in the original Task-1 summary section below"
        status: pass
    human_judgment: false
  - id: D2
    description: "The probe renders and prints under a real browser engine (Task 1, unchanged this
      session)"
    verification:
      - kind: other
        ref: "recorded in the original Task-1 summary section below"
        status: pass
    human_judgment: false
  - id: D3
    description: "The stylesheet's phone rule and use-print-fit.ts's touch height describe the same
      box; the phone rule changes only height, never width; it keys on the pointer attribute the
      handler writes, not a width"
    verification:
      - kind: unit
        ref: "components/summary/order-form-print.test.ts — 3 new cases, RED against pre-Task-4
          source (confirmed 3 failing, 4 passing), GREEN after Task 4 (7/7 passing)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A touch device's sheet is 733.44 x 949.16 CSS px (ratio 1.294118), a computer's
      sheet stays 733.44 x 990.55; both derived from the same PORTRAIT_PAPER_IN/PAGE_MARGIN_MM
      constants the desktop box already used"
    verification:
      - kind: unit
        ref: "components/summary/order-form-print.test.ts's new case, evaluating both the CSS
          calc() expression and the hook's own arithmetic at CSS's fixed 96px/25.4mm-per-inch,
          within 0.02 dots — PASS. Independently re-verified with `node -e` against the same
          constants outside the test file: width 733.4476px, touch height 949.167px, desktop height
          990.550px, touch/desktop = 0.9582 (4.18% shorter)."
        status: pass
      - kind: e2e
        ref: "e2e/summary-print-touch-box.spec.ts asserts this same box across desktop/iphone/android
          — written this session but NOT run in this worktree; see Deviations. Left for the
          orchestrator on a clean checkout."
        status: pending
    human_judgment: false
  - id: D5
    description: "The desktop gate (e2e/summary-print-size.spec.ts) still passes on its current
      733.44 x 990.55 constants, with not one non-comment line changed"
    verification:
      - kind: other
        ref: "`git diff -U0 -- e2e/summary-print-size.spec.ts | grep -E '^[+-]' | grep -vE '^(\\+\\+\\+|---)' | grep -vE '^[+-][[:space:]]*(\\*|/\\*|\\*/|//)'` — empty output, confirmed before
          committing Task 4"
        status: pass
      - kind: e2e
        ref: "PW_PORT=3108 npx playwright test e2e/summary-print-size.spec.ts --project=desktop —
          NOT run in this worktree; see Deviations. Left for the orchestrator on a clean checkout."
        status: pending
    human_judgment: false
  - id: D6
    description: "Three sheets (with Rail Band Instructions on) still make exactly three PDF pages
      with the touch box forced on, and exactly three without it (control)"
    verification:
      - kind: e2e
        ref: "e2e/summary-print-touch-box.spec.ts's two page-count cases — written this session but
          NOT run in this worktree; see Deviations. Left for the orchestrator on a clean checkout."
        status: pending
    human_judgment: false
  - id: D7
    description: "public/__print-probe.html no longer exists and nothing outside .planning/
      references it"
    verification:
      - kind: other
        ref: "`test ! -e public/__print-probe.html` and `grep -rl '__print-probe' --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git --exclude-dir=.planning .` — both confirmed empty/passing"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-09-10
status: complete
---

# Quick Task 260910-2ny — Tasks 3-6 of 7: a phone gets a shorter, paper-shaped sheet

**Built and committed the phone-only print fix (Tasks 3-6): a contract test that failed on purpose,
the phone print rule and hook wiring that made it pass, a new browser spec measuring the box across
three engines, and the temporary probe page's removal. Task 7 — the founder's own confirming iPhone
print of the real order form — is still outstanding and cannot be performed by this executor.**

## Performance

- **Duration:** 55 min (this session — Tasks 3, 4, 5, 6)
- **Tasks:** 4 of 7 this session (Tasks 1 and 2 were already done and are recorded unchanged below;
  Task 7 is next, and is a blocking `checkpoint:human-action` this executor cannot perform)
- **Files modified:** 7 (1 created, 5 modified, 1 deleted)
- **Commits:** 4 (`6d0f97d`, `30dfd9f`, `625bf81`, `288c211`)

## Why Task 7 is still outstanding

Task 7 asks the founder to print the real order form from his own iPhone at 100% and report what
came off the printer — three sheets, three pages, no manual scaling. That is a physical action on
a physical device this executor has no access to, and per this plan's own `<execution_gate>` and
the run's orchestrator rulings, execution stops before it. Everything measurable on this machine —
the source-contract test, the desktop diff gate, the desktop and A4/Letter arithmetic — is green;
what remains is the one thing no browser in this repo can prove: what iOS Safari's own print
pipeline actually does with the box this session built for it.

## Task 3 — the contract test first, RED before anything was fixed

Added three new cases to `components/summary/order-form-print.test.ts` (commit `6d0f97d`), all
confirmed to fail against Task-2-era source and pass again once Task 4 landed:

1. **The phone rule and the print handler's own box describe the same piece of paper.** Extracts
   the phone rule's `height` declaration, checks its width figures and margin against
   `PORTRAIT_PAPER_IN`/`PAGE_MARGIN_MM`, checks its ratio pairs are `PORTRAIT_PAPER_IN`'s own
   height/width pairs (not a paper the handler has never heard of), then evaluates both sides at
   CSS's fixed 96px/25.4mm-per-inch and requires them within 0.02 dots.
2. **The phone rule changes only the height.** Asserts the rule declares no `width`, that its height
   value carries no viewport unit and no percentage, and that the rule appears later in the file
   than the desktop sheet rule (source order as the belt to the selector's own specificity braces).
3. **The phone rule keys on the pointer, not a width.** Reads the `data-print-*` attribute name
   straight out of the CSS selector, then asserts `use-print-fit.ts`'s comment-stripped,
   whitespace-collapsed source carries that same attribute name and the coarse-pointer media query
   as quoted strings.

Confirmed before committing: the three new cases failed (the phone rule and touch height did not
exist yet), and the four pre-existing cases — which cover the desktop box this whole plan leaves
untouched — still passed. `npm run lint` clean (12 pre-existing warnings, 0 errors, no new ones).

## Task 4 — GREEN, and every stale comment corrected

Four source files changed (commit `30dfd9f`):

- **`app/design/summary/order-form.css`.** Left the existing desktop `[data-order-form-sheet]` box
  rule untouched. Added, immediately after it: the phone-only height rule
  (`[data-order-form-root][data-print-touch] [data-order-form-sheet] { height: calc((min(8.5in,
  8.27in) - 16mm) * min(11 / 8.5, 11.69 / 8.27)) !important; }`); an adjacent-sibling
  `break-before: page` (plus the legacy `page-break-before: always` alias) beside the existing
  `break-after` pair, asking for the break between two sheets from both sides (D-03); and moved the
  `overflow: hidden` backstop out from under `[data-order-form-root][data-printing]` to apply
  unconditionally. Corrected the four false comment sites and added the three one-sentence clauses
  the plan's comment audit called for (see `key-decisions` above for the exact list).
- **`components/summary/use-print-fit.ts`.** Added `TOUCH_PRINT_ATTRIBUTE`, `COARSE_POINTER_QUERY`
  and a derived `TOUCH_SHEET_RATIO` constant; a new mount-time `useEffect` that sets/clears
  `data-print-touch` on the root from `matchMedia("(pointer: coarse)")` and follows its `change`
  event; and, inside `beforePrint`, a branch that reads that same attribute back off the root to
  choose the sheet height — the touch path uses `page.width * TOUCH_SHEET_RATIO`, the desktop path
  is `page.height * FIT_SAFETY`, byte-for-byte unchanged. Rewrote the head comment's false closing
  paragraph.
- **`components/summary/order-form.tsx`** and **`components/rocker/rocker-view-frame.ts`** each got
  one added sentence (no code changes) — see `key-decisions` above.
- **`e2e/summary-print-size.spec.ts`** — comment-only correction to its head comment's third "fact".
  Confirmed with a diff gate before committing that no non-comment line moved.

Gates run: `npx vitest run components/summary/order-form-print.test.ts` (7/7 green),
`npx tsc --noEmit` (only the two documented pre-existing `LayoutProps` errors, no new ones),
`npm test` (55 files, 2420 passing — the documented 2417 baseline plus Task 3's three new cases —
2 skipped), `npm run lint` (0 errors, 12 pre-existing warnings, unchanged), the diff gate on
`e2e/summary-print-size.spec.ts` (empty output — comment-only). **The Playwright desktop gate
(`PW_PORT=3108 npx playwright test e2e/summary-print-size.spec.ts --project=desktop`) could not be
run in this worktree — see Deviations below.**

Independently re-verified the touch-box arithmetic outside the test file, with `node -e` against
the same four constants: width 733.4476px, touch height 949.167px (vs. desktop's 990.550px —
0.9582 of it, 4.18% shorter), matching both the plan's own figures and the vitest contract test's
own evaluation.

## Task 5 — a new browser spec measuring the phone box in three engines

Wrote `e2e/summary-print-touch-box.spec.ts` (commit `625bf81`), a new file — `e2e/summary-print-size.spec.ts`
was not modified again and its helpers were not lifted out into anything shared, so that file's own
one permitted comment edit (Task 4) stays its only change. Four cases:

1. **A computer's sheet is untouched (D-01).** Desktop project only: no `data-print-touch`
   attribute, sheet box 733.44 x 990.55 CSS px within a dot, read directly off computed style after
   `page.emulateMedia({ media: "print" })` (no `beforeprint` needs to run — the stylesheet's own
   `!important` declarations apply the instant print media does).
2. **A touch device's sheet is the shape of the paper.** `iphone`/`android` projects only: asserts
   `window.matchMedia("(pointer: coarse)")` matches first (the load-bearing precondition, in the
   house style, so a project that silently stopped emulating touch cannot pass by accident), then
   the root carries the attribute, then the sheet box is 733.44 x 949.16 within a dot AND its
   height/width ratio is 1.294118 within half a thousandth — the ratio assertion is what proves WHY
   the box is that shape, not just that the numbers happen to match.
3. **The shorter sheet still makes one sheet per page, nothing blank at the end (D-03).** Desktop
   only (`page.pdf()` is Chromium-headless only): forces the touch attribute on, turns on Rail Band
   Instructions, prints a real Letter PDF, and counts PDF *page objects* (`/Type /Page`, never
   `/Type /Pages`) rather than pages carrying drawn content — a blank page still gets a page object,
   so this is what actually catches a trailing blank page a content-stream count would miss. Expects
   exactly 3.
4. **The control.** Same three sheets, same PDF, without the attribute forced on — also expects
   exactly 3, so case 3 cannot pass on a stylesheet that never worked without anyone noticing which
   half was being measured.

Gates run: `npm test` (55/55 files, 2420 passing, 2 skipped — unchanged), `npm run lint` (0 errors,
unchanged). **Both Playwright commands in this task's `<verify>` block — the new spec across all
three projects, and the desktop gate re-run — could not be executed in this worktree; see
Deviations below.**

## Task 6 — the probe leaves the live site

Deleted `public/__print-probe.html` (commit `288c211`, D-02). Re-confirmed at commit time (not
taken on trust, since Tasks 4 and 5 had touched files since the plan was written) that nothing
outside `.planning/` references it: `grep -rl '__print-probe' --exclude-dir=node_modules
--exclude-dir=.next --exclude-dir=.git --exclude-dir=.planning .` came back empty. No todo was
filed about the rails "View Full Sized" dialog (D-05) — it stayed untouched, as the founder closed
that follow-up permanently.

Gates run after deletion: `test ! -e public/__print-probe.html` (pass), the grep above (pass),
`npm test` (55/55, 2420 passing, 2 skipped), `npm run lint` (0 errors, unchanged).

## Task Commits

1. Task 1 (done previously): the print probe page — `e1dc83d` (feat)
2. Task 3: the contract test, RED — `6d0f97d` (test)
3. Task 4: the phone rule + hook wiring, GREEN, comments corrected — `30dfd9f` (fix)
4. Task 5: the new browser spec measuring the phone box — `625bf81` (test)
5. Task 6: the probe deleted — `288c211` (chore)

_No plan-metadata commit yet — the orchestrator handles that once this SUMMARY and STATE.md are in
place, per this run's constraints. This SUMMARY.md is left uncommitted and modified on disk for the
orchestrator to pick up._

## Files Created/Modified

- `public/__print-probe.html` — created Task 1, **deleted again in Task 6** once its one question
  (does iOS Safari resolve `100vh`/`100vw` against the printed page?) was answered.
- `components/summary/order-form-print.test.ts` — three new source-contract cases pinning the phone
  box to the desktop box's own constants.
- `app/design/summary/order-form.css` — the phone-only height rule, the adjacent-sibling forced
  break, the unconditional overflow backstop, and four corrected comment sites.
- `components/summary/use-print-fit.ts` — `TOUCH_PRINT_ATTRIBUTE`, `COARSE_POINTER_QUERY`,
  `TOUCH_SHEET_RATIO`, the mount-time pointer effect, and the `beforePrint` branch that reads it.
- `components/summary/order-form.tsx` — one added sentence noting the touch box in the sizing
  paragraph.
- `components/rocker/rocker-view-frame.ts` — one added paragraph recording the touch box costs the
  rocker frame nothing (still width-bound), and a repointed dangling reference.
- `e2e/summary-print-size.spec.ts` — one comment-only correction (Task 4); untouched again in Task 5.
- `e2e/summary-print-touch-box.spec.ts` — new file, the phone-box browser measurement (Task 5).

## Decisions Made

See `key-decisions` in the frontmatter above for the full list with reasoning. In short: kept
`FIT_SAFETY` and the `zoom` guard (the founder's print disproved the assumption that made the
original plan want them gone); derived `TOUCH_SHEET_RATIO` rather than hardcoding it; decided the
touch attribute from the pointer at mount, never from a width or inside `beforePrint`; added the
adjacent-sibling break as belt-and-braces, not a repair; made the overflow backstop unconditional;
and corrected exactly the comment sites the plan's own audit named — no site outside that list was
touched, and nothing marked "still true" in the audit was rewritten.

## Deviations from Plan

**The desktop Playwright gate and the new touch-box browser spec could not be run in this
worktree — this is a discovered environment limitation, not a code defect, and it is the one
substantive deviation this session has.**

Task 4's and Task 5's own `<precondition>` blocks anticipated one failure mode — another process
already holding `.next/dev/lock` — and gave an explicit fallback for it ("if the lock exists, do
not start a server ... leave the browser run to the orchestrator on a clean checkout"). What was
actually hit is a different, more fundamental one: `npm run dev` fails inside this worktree with
the exact same error CLAUDE.md already documents for `npm run build`:

```
Turbopack build encountered 1 error:
./app
Error: Could not find the Next.js package (next/package.json)
Resolved from: <worktree>/app
Filesystem root used for resolution: <worktree>
```

This is the documented "npm run build fails inside a worktree... Expected, not a failure, do not
work around it" limitation (this run's orchestrator ruling #3) — it turns out to also apply to
`npm run dev`, not just `npm run build`, because both go through the same Turbopack module
resolution. Diagnosed directly (one `npm run dev -- --port 3108` run, confirmed the identical
error, then stopped — no further attempts, no workaround). Applied the plan's own escape hatch by
analogy: made every source edit, ran every non-browser gate (`npx tsc --noEmit`, `npm test`,
`npm run lint`, the diff gate) to green, wrote the new browser spec in full, and left the four
Playwright commands (the desktop re-run in Task 4, the new spec's three-project run plus the
desktop re-run in Task 5) for the orchestrator to run against a clean checkout.

**What was independently verified in place of the browser run:** the vitest contract test
(`order-form-print.test.ts`) evaluates the CSS `calc()` expression and the hook's own arithmetic
numerically and requires them to agree to within 0.02 dots — this passing is strong evidence the
two files describe the same box, even without a browser rendering it. A second, fully independent
`node -e` calculation outside the test file (see Task 4 above) reproduced the same width/height/
ratio figures the plan itself derived at planning time. What neither of these can do is prove a
real browser lays the box out this way, or that three sheets with the shorter box really do land as
three PDF pages — that is exactly what `e2e/summary-print-touch-box.spec.ts` is written to measure,
and exactly what is still unmeasured pending a clean-checkout run.

No other deviations. Rule 1-3 auto-fixes: none needed — the plan's own arithmetic and file contents
matched what was found in the repo at each task's start.

## Human verification deferred to end-of-phase UAT

Per this run's orchestrator rulings (no mid-plan human-verify checkpoints; this project runs
`workflow.human_verify_mode: "end-of-phase"`), no `<human-check>` items were raised during Tasks 3-6
— every one of this session's own `<verify>` blocks was either run automatically or, where the
worktree could not run it (the browser gates above), left for the orchestrator with the reason
recorded rather than silently skipped.

**Task 7 itself is the deferred human verification for this entire plan**, and it is unusual in
being the plan's own last task rather than an incidental `<human-check>`: the founder needs to
print the real Summary order form from his own iPhone at 100% (no pinching, no percentage typed
in) and confirm three sheets came off as three pages, with the rail band table's last row present.
Everything else in this plan is measurable on a machine; that one step is not.

## Issues Encountered

- The worktree's inability to run `next dev` (see Deviations above) was the only blocker this
  session hit. It was diagnosed with a single direct `npm run dev -- --port 3108` invocation
  (confirmed to fail identically to `npm run build`'s already-documented worktree limitation), then
  not repeated — no further attempts were made to work around it, per this run's orchestrator
  ruling #3 ("Expected, not a failure, do not work around it").
- Task 1's probe-verification issue (a `fullPage` screenshot artifact) remains recorded, unchanged,
  in the section below — it was resolved in that session and had no bearing on this one.

## User Setup Required

None for Tasks 3-6. Task 7 (next) needs the orchestrator to push to `main`, wait for the Vercel
deploy, confirm `https://www.shaperassistant.com/design/summary` loads and that
`https://www.shaperassistant.com/__print-probe.html` no longer returns the probe, and then hand the
founder the print steps in the plan's own Task 7 `<how-to-verify>`.

## Next Phase Readiness

- Tasks 3-6 are committed on this worktree's branch (`6d0f97d`, `30dfd9f`, `625bf81`, `288c211`)
  and ready to ship once the orchestrator merges and pushes to `main`.
- **Before or immediately after merging, the orchestrator should run the four Playwright commands
  this worktree could not run** (see Deviations): the desktop gate re-run from Tasks 4 and 5, and
  the new `e2e/summary-print-touch-box.spec.ts` across all three projects — on a clean checkout
  where `next dev` actually resolves.
- Task 7 (blocking `checkpoint:human-action`) is next: push, confirm the live URLs, have the
  founder print the real order form from his iPhone at 100%, and record the outcome per the plan's
  own Task 7 instructions. If a sheet still splits, the single lever named in the plan is the ratio
  in `order-form.css`'s phone rule and the matching `TOUCH_SHEET_RATIO` derivation in
  `use-print-fit.ts`.

---

# Original Task 1 record (unchanged from the prior session)

## Quick Task 260910-2ny — Task 1 of 6: the print probe page

**Built and committed the self-contained iPhone print probe (`public/__print-probe.html`); this
plan's remaining five tasks were, at that point, genuinely unfinished and waited on the founder's
own test print.**

### Performance

- **Duration:** 25 min
- **Started:** 2026-09-10T16:29:00Z
- **Completed:** 2026-09-10T16:54:56Z
- **Tasks:** 1 of 6 (this plan is executed in two goes with a human in the middle, per its own
  `<execution_gate>`)
- **Files modified:** 1

### Accomplishments

- Built `public/__print-probe.html`: one self-contained static file (no React, no imports, no
  build step, no external request of any kind) carrying all five sections the plan specified:
  1. The vh/inch ruler pair — ten `10vh`-tall bands beside twelve `1in`-tall bands, each marked
     with a `data-vh-band`/`data-in-band` attribute and a right-aligned cumulative figure, first
     band carrying the "PRINT PROBE — quick task 260910-2ny" caption.
  2. The width bar — a `100vw`-wide, clip-overflowed bar with quarter-inch ticks out to 9in (whole
     inches hand-coded as full-height labelled hairlines; the in-between quarters drawn as a single
     CSS repeating-gradient background rather than 27 more elements), a heavier red `TODAY
     7.6401in` tick, and a second `100vw` wrapper beneath holding a `7.6401in` filled bar with an
     end marker.
  3. The break test — two `100vh` blocks, each requesting `break-after: page` (and the legacy
     `page-break-after: always` alias), labelled SHEET A/B TOP and BOTTOM.
  4. The flags — three fixed-size monospace boxes written by inline JS (`JS: yes` on
     `DOMContentLoaded`, `BEFOREPRINT: fired` from inside a `beforeprint` listener, and a
     `VIEWPORT <w> <h>` readout), beside a 2in x 2in scale-check square captioned `50.8 mm`.
  5. How to read this — five plain-English lines naming the exact readings to take off the printed
     PDF, including that the page declares `@page { size: portrait; margin: 8mm; }`.
- Verified structurally and behaviourally with a Playwright script (kept in the session scratchpad,
  never committed, per the plan's own instruction): exactly one network request for the whole page
  load, the correct band counts, all three flags populate correctly, and a real Chromium PDF export
  comes back with at least three pages (measured five, at Letter size).
- Additionally rendered the probe through Chromium's own print pipeline (`page.pdf`) and read the
  raw text back out with `pypdf` — every ruler figure, the TODAY tick, both break-test blocks' top
  and bottom labels, all three flags (including the post-dispatch `BEFOREPRINT: fired`), the
  how-to-read list, and the `50.8 mm` caption all appear correctly and in DOM order across the five
  generated pages.
- `npm run lint` clean (0 errors); `npm test` matched the documented green baseline exactly: 55
  files, 2417 passed, 2 skipped.

### Task Commits

1. Task 1: the print probe page — build it, then STOP — `e1dc83d` (feat)

### Files Created/Modified

- `public/__print-probe.html` — the hidden, self-contained iPhone print probe. Not linked from
  anywhere in the app; reachable only by its exact URL. **Deleted again in Task 6 (this session)
  once its one question was answered (D-02).**

### Decisions Made

- Followed the plan's spec for the probe verbatim — no architectural deviations, no Rule 4
  escalations.
- Encoded the width bar's 27 unlabelled quarter-inch ticks as one CSS `repeating-linear-gradient`
  background instead of 27 separately hand-placed `<div>`s.
- Verified against a real Chromium-generated PDF (via `page.pdf` + `pypdf` text extraction) in
  addition to the plan's required DOM-level Playwright checks, since a full-page screenshot of a
  `vh`-heavy document turned out to be an unreliable verification method in its own right.

### Issues Encountered

- A first attempt to visually sanity-check the probe with Playwright's `page.screenshot({ fullPage:
  true })` produced a corrupted-looking image, an artifact of `fullPage` resizing the viewport
  mid-capture against a `vh`-relative layout — not a bug in the probe. Re-verified with a fixed
  viewport and the real `page.pdf()` output instead.
- `npx tsc --noEmit` (not part of Task 1's own `<verify>`) reported the same two pre-existing
  `LayoutProps` errors this session's own runs also show — unrelated, expected inside a worktree.

---
*Phase: quick-260910-2ny*
*Completed: 2026-09-10*
