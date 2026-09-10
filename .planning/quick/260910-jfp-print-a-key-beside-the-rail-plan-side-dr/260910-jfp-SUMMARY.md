---
phase: quick-260910-jfp
plan: 01
subsystem: ui
tags: [rails, print, tailwind, container-queries, vitest, playwright]

requires:
  - phase: quick-260910-2ny
    provides: the touch print box and the design-width sweep this task's widths reuse
provides:
  - RailPlanSideFigure's opt-in showLineKey prop and its printed colour-dot-plus-name key
  - a shared RailLegendSwatch so the on-screen tick and the printed key can never disagree on ink
  - a written-but-not-yet-run browser proof (e2e/summary-rail-key.spec.ts) that the key costs no
    height and never shrinks the drawing
affects: [rails, summary-order-form, print]

actuals:
  tokens: 9600
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a card wrapping a flex row (drawing flex: 0 1 <cap>px, key flex-1) instead of a single
       centred child, with justify-center on the row reproducing the old mx-auto the moment the
       key is absent from the flow"
    - "a Tailwind named container query (@container/rail-key, @min-[486px]/rail-key:block) as the
       sole guard against the key ever costing the sheet a pixel of height"
    - "source-contract tests that recompute a derived constant from numbers extracted out of the
       stripped source text, rather than importing a \"use client\" component module that would
       drag in components/units-provider.tsx's server-action/DB import chain in a node-environment
       vitest run"

key-files:
  created:
    - components/rails/rail-plan-side-figure.test.ts
    - e2e/summary-rail-key.spec.ts
  modified:
    - components/rails/rail-plan-side-figure.tsx
    - components/rails/rail-legend-ticks.tsx
    - components/summary/rail-instructions-sheet.tsx
    - components/summary/rail-instructions-sheet.test.ts

key-decisions:
  - "Task 1's new test does NOT import rail-plan-side-figure.tsx as a module (unlike a lib/geometry
     pure-function test) — it is a \"use client\" component whose import chain reaches
     components/units-provider.tsx -> app/actions/units.ts -> lib/db/client.ts, which throws at
     import time with no live DATABASE_URL in this worktree. The derived-threshold assertion
     instead recomputes the same arithmetic from numbers extracted out of the comment-stripped
     source text, mirroring order-form-print.test.ts's own parseAspectRatio idiom."
  - "The key element is present in the DOM only when showLineKey is true AND at least one line is
     ticked (a JS-level gate), and separately hidden below the 486px row-width threshold by a CSS
     container query (hidden @min-[486px]/rail-key:block) — the two guards answer different
     questions (should a key exist at all vs. is there room to draw it) and neither substitutes for
     the other."

requirements-completed: []  # Task 3 (the browser gate) is outstanding — do not mark QT-260910-jfp
                             # or PRNT-05 complete until it has run and the reading is recorded.

duration: 45min
completed: 2026-09-10
status: incomplete
---

# Quick Task 260910-jfp: Print a Key Beside the Rail Plan/Side Drawing — Summary

**RailPlanSideFigure now draws an opt-in colour-dot-plus-name key beside its drawing, listing only
the lines the shaper left ticked, at no cost to the sheet's height — Tasks 1 and 2 are code-complete
and green; Task 3, the actual browser run that proves it on paper, is outstanding.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 2 of 3 completed (Task 3 is the orchestrator's — see below)
- **Files modified:** 6 (4 modified, 2 created)

## Accomplishments

- `RailPlanSideFigure` gained a second prop, `showLineKey` (default `false`), and its card was
  restructured from a single centred child into a flex row holding the drawing (unchanged
  internally, now a flex item capped at its old max width) and an optional key. `justify-center`
  on the row reproduces today's `mx-auto` the instant the key is absent from the flow — whether
  because `showLineKey` is off, every line is unticked, or the key's own container query has hidden
  it on a narrow page.
- The swatch that colours a legend entry is now a single shared component, `RailLegendSwatch`,
  used by both the RAILS tab's clickable ticks (`RailLegendTicks`) and the new printed key — so a
  dot can never print a different colour from the line it names, because both always read
  `entry.color`, itself always `REF_GROUP_SCREEN_COLORS[key]`.
- The key's own turn-on threshold (`KEY_ROW_MIN_WIDTH_PX`, 486) and its font size
  (`KEY_FONT_SIZE_PX`) are both derived from constants the drawing itself already used — nothing
  was typed by hand, and a source-contract test pins the derivation to the literal Tailwind class
  that has to carry the same number (Tailwind cannot compose a class name from a variable).
- `RailInstructionsSheet` (the order form's third, printed sheet) now asks for the key
  (`showLineKey`); the RAILS tab's own INSTRUCTIONS page does not, since it already shows the same
  nine names as clickable ticks and does not want a second, unclickable copy beside its own
  drawing — pinned by a new source-contract case reading `rail-instructions.tsx` directly.
- `e2e/summary-rail-key.spec.ts` was written (Task 2): it sweeps the same seven widths
  `e2e/summary-print-touch-box.spec.ts` already sweeps, and would prove on a real browser that the
  figure card's height never moves whether the key is drawn or not, the drawing itself never
  shrinks, the key is present and visible at every one of those widths, and it lists exactly the
  ticked lines in legend order. **It was written but not run — see "Task 3 — outstanding" below.**

## Task Commits

Each task was committed atomically:

1. **Task 1: the key itself — a colour dot and a name for every line still ticked** — `71a624a`
   (feat)
2. **Task 2: write the browser test that proves the key costs nothing — do not run it** —
   `14deabb` (test)

**Plan metadata:** not committed by this executor — `.planning/` docs (SUMMARY.md, STATE.md,
ROADMAP.md) are deliberately left uncommitted per the orchestrator's constraints, for the
orchestrator to copy out and commit once Task 3 has run.

## Verification Run (Tasks 1–2 only)

- `npx vitest run components/rails/rail-plan-side-figure.test.ts components/summary/rail-instructions-sheet.test.ts`
  — 27/27 passed (RED before the implementation, GREEN after — see Deviations below for the one
  correction to how the RED test reads the source).
- `npm test` — 56 files, 2434 passed, 2 skipped (pre-existing skips, untouched by this task), 0
  failed.
- `npx tsc --noEmit` — clean except two PRE-EXISTING errors in `app/layout.tsx` and
  `app/design/layout.tsx` (`Cannot find name 'LayoutProps'`), unrelated to any file this task
  touched — see "Known pre-existing condition" below.
- `npm run lint` — 0 errors, 12 pre-existing warnings (none in a file this task touched except one
  pre-existing `<img>` LCP warning on a line this task moved but did not otherwise edit), exit 0.
- `git diff --name-only -- e2e/summary-print-touch-box.spec.ts e2e/summary-print-size.spec.ts app/design/summary/order-form.css`
  — empty at every check. Neither printer gate nor the order form's stylesheet was touched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — blocking issue] `rail-plan-side-figure.test.ts` cannot import the component module directly**
- **Found during:** Task 1, first RED run.
- **Issue:** The plan's behavior spec implies checking `KEY_ROW_MIN_WIDTH_PX === 486` by import.
  `rail-plan-side-figure.tsx` is `"use client"` and imports `components/units-provider.tsx`, whose
  own import chain reaches `lib/db/client.ts`'s `neon(process.env.DATABASE_URL!)` — which throws
  at module-evaluation time with no live `DATABASE_URL` in this worktree (a plain `node`-environment
  Vitest run, same as every other `components/**/*.test.ts` in this repo — none of which imports a
  `"use client"` component module either; they all read source as text).
- **Fix:** The threshold-agreement test instead extracts `FIGURE_HEIGHT`, `FIGURE_GAP`,
  `FIGURE_MAX_RENDERED_HEIGHT`, `FIGURE_COLUMNS`, `KEY_GAP_PX` and `KEY_MIN_COLUMN_PX` as numbers
  out of the comment-stripped source text and recomputes the same arithmetic the source itself
  performs, then compares the result to 486 and to the literal Tailwind class string — the same
  "parse the text, recompute, compare" idiom `components/summary/order-form-print.test.ts`'s own
  `parseAspectRatio` already establishes for a different two-number contract. No production code
  changed; only how the test proves the number.
- **Files modified:** `components/rails/rail-plan-side-figure.test.ts`
- **Commit:** `71a624a`

None of Rules 1, 2 or 4 applied — no bugs found, no missing critical functionality, no
architectural change needed.

### Known pre-existing condition

`npx tsc --noEmit` reports two errors, both in files this task never touched
(`app/layout.tsx:75`, `app/design/layout.tsx:30`, both `Cannot find name 'LayoutProps'`). Confirmed
pre-existing and environment-only: this worktree has no `.next/` directory at all (no `next dev`
or `next build` has run here, and CLAUDE.md says not to run either), and `LayoutProps` is a Next.js
16 generated ambient type normally emitted into `.next/types` during a dev/build pass. Out of
scope per the SCOPE BOUNDARY rule — pre-existing failures in files unrelated to this task's changes.

## Known Stubs

None.

## Threat Flags

None — every threat in the plan's own STRIDE register (T-jfp-01 through T-jfp-05) was mitigated as
designed: the container-query threshold (T-jfp-01), the single shared colour expression
(T-jfp-02), and Task 3 existing as its own task rather than an unrun `<verify>` line (T-jfp-03).

## Human verification deferred

None from Tasks 1–2 — both were `type="auto"` with automated `<verify>` blocks only. Task 3 itself
carries a `<human-check>` (the founder confirming the change on his own printed sheet, or the
on-screen preview since D-09 makes the two the same DOM) — that is the orchestrator's to carry
forward once Task 3 has run, not this executor's.

---

## Task 3 — outstanding, addressed to the orchestrator

Task 3 could not be run by this executor (worktree, no Turbopack dev server). It is unchanged from
the plan. On a **clean checkout of `main`** (Chromium and WebKit already installed), run all three,
capturing full output including the console tables:

```
PW_PORT=3108 npx playwright test e2e/summary-rail-key.spec.ts
PW_PORT=3108 npx playwright test e2e/summary-print-touch-box.spec.ts
PW_PORT=3108 npx playwright test e2e/summary-print-size.spec.ts --project=desktop
```

**What the reading (`260910-jfp-BROWSER-READING.md`) must contain, at minimum** (per the plan's
own `<done>` for Task 3 — measured numbers, not a pass mark):

- The figure card's height with the key on (all nine lines ticked) and with it off (every line
  unticked) at each of the seven swept widths (560, 618, 680, 733, 760, 812, 900) — the pair that
  proves the placement is free. `e2e/summary-rail-key.spec.ts`'s first test logs exactly this table
  under the `[260910-jfp]` prefix.
- Whether the key was present and visible at every one of those seven swept widths.
- The entry counts and contents for nine ticked / seven ticked (with "Deck Marks 3" and "Rail
  Marks 1" unticked) / zero ticked, from `e2e/summary-rail-key.spec.ts`'s second test.
- The `overflow=[...]` row from `e2e/summary-print-touch-box.spec.ts`'s own sweep, UNCHANGED from
  `260910-2ny-BROWSER-READING.md`'s own recording — `overflow=[ok, ok, ok]` at all seven widths on
  all three projects (desktop, iphone, android) is the pass condition; this file was not edited by
  this task at all (verified by `git diff --name-only` above), so no drift is expected, but it must
  still be measured, not assumed.
- Confirmation that `e2e/summary-print-size.spec.ts --project=desktop` still measures a computer's
  sheet at 733.44 x 990.55 dots.

If anything fails, the plan is explicit: fix it and re-measure, do not write a reading around a
failure. Once the reading is written and all three specs pass, `requirements mark-complete` for
`QT-260910-jfp` and `PRNT-05`, and the state/roadmap/final-commit steps in
`execute-plan.md`'s `<state_updates>`/`<final_commit>` sections still apply — none of those ran
here, since this executor stopped at Task 2 by design.

## Self-Check: PASSED

- FOUND: `components/rails/rail-plan-side-figure.tsx`
- FOUND: `components/rails/rail-plan-side-figure.test.ts`
- FOUND: `components/rails/rail-legend-ticks.tsx`
- FOUND: `components/summary/rail-instructions-sheet.tsx`
- FOUND: `components/summary/rail-instructions-sheet.test.ts`
- FOUND: `e2e/summary-rail-key.spec.ts`
- FOUND commit `71a624a` (feat, Task 1)
- FOUND commit `14deabb` (test, Task 2)
