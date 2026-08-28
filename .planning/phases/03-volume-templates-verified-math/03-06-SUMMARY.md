---
phase: 03-volume-templates-verified-math
plan: 06
subsystem: summary-print
tags: [print, css, order-form, color-mix, legibility]

requires:
  - phase: 03-volume-templates-verified-math
    provides: "03-04's summary/order-form rebuild (order-form.tsx, order-form.css, use-print-fit.ts) that this plan verifies on paper for the first time since the callout-system rebuild"
provides:
  - "Print-scoped legibility overrides of --outline-station-line and --outline-widepoint-line, scoped to the order form's own [data-order-form-page] hook"
affects: [03-07]

actuals:
  tokens: 9000
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Route-scoped @media print override of a globals.css CSS custom property, tripling the selector ([data-order-form-page] x3) to reach (0,3,0) specificity — the same trick globals.css's own print :root block uses to outrank an explicitly chosen theme class"

key-files:
  created: []
  modified:
    - app/design/summary/order-form.css

key-decisions:
  - "Raised --outline-station-line from 36% to 65% and --outline-widepoint-line from 45% to 75% for print only, inside order-form.css's existing @media print block rather than globals.css — the tiled 1:1 template PDF (03-01) does not read CSS and the Template editor screen is never printed, so route-scoping keeps the stronger lines off every surface that doesn't need them"
  - "Both overrides keep the color-mix form against the same base tokens (--surf-ink-muted, --outline-widepoint-knot) the screen values use, so no literal colour enters the stylesheet (260825-rqm lesson) and the print :root block's Daylight-forcing still governs the palette in every theme"
  - "Dash patterns left untouched — the widepoint dash is what distinguishes that line from the station lines and changing it would break the distinction the plan's action text warned against losing"

requirements-completed: []

coverage:
  - id: D1
    description: "order-form.css's @media print block raises --outline-station-line and --outline-widepoint-line via color-mix against the same base tokens the screen values use, with no literal colour introduced and no change to globals.css, the outline viewer, the callout primitives, or the print-fit hook"
    requirement: TMPL-01
    verification:
      - kind: unit
        ref: "npm run lint (0 errors), npm test (832/832 passed)"
        status: pass
      - kind: unit
        ref: "git diff app/globals.css | wc -l -> 0; git diff --name-only app/globals.css components/summary/ components/outline/outline-viewer.tsx components/viewer/ -> empty; git diff order-form.css | grep literal hex -> 0 matches"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Summary order form prints on two portrait pages with nothing clipped, the board undistorted, chips/output rail legible, and both faint reference lines (station and widepoint) visible on paper — for a default board and a 25in-widepoint board, from a narrow and a wide window, and in one dark theme"
    requirement: TMPL-01
    verification:
      - kind: other
        ref: "Human print-preview against main post-merge, dev server started by the orchestrator; shaper answered Approved to both pages fitting, reference lines legible at print scale, and dark theme printing white."
        status: pass
    human_judgment: true
    rationale: "Print fidelity — whether a low-alpha dashed/dotted line survives a real printer's rendering, and whether a wide-board card's different aspect still fits the page — can only be judged from an actual print preview or a printed page, not an automated test. This was Task 2 of 03-06-PLAN.md, a blocking checkpoint:human-verify gate, run against main after merge since this worktree-isolated agent could not run npm run dev (Turbopack cannot resolve next outside the main checkout)."

duration: ~20min
completed: 2026-08-28
status: complete
---

# Phase 03 Plan 06: Summary Order-Form Print Legibility Summary

**The order form's two faint outline reference tokens — the station lines and the widepoint dash — are raised for paper only, inside `order-form.css`'s own `@media print` block, using the same `color-mix` form and base tokens the screen values use; Task 2's print-preview checkpoint was run against main after merge and approved.**

## Performance

- **Duration:** ~20 min plus checkpoint review
- **Completed:** 2026-08-28
- **Tasks:** 2 of 2
- **Files modified:** 1

## Accomplishments

- `app/design/summary/order-form.css`'s `@media print` block gained a new rule overriding `--outline-station-line` (36% -> 65% `color-mix` against `--surf-ink-muted`) and `--outline-widepoint-line` (45% -> 75% `color-mix` against `--outline-widepoint-knot`), scoped to `[data-order-form-page][data-order-form-page][data-order-form-page]` — the order form's own outer hook, tripled to (0,3,0) specificity so it outranks any `:root.theme-<id>` class the same way globals.css's own tripled `:root` print block does.
- Both overrides read through to every consumer of those tokens (the outline viewer's stringer/station/widepoint lines and knots, and `callout-primitives.tsx`'s leader/extension lines) without touching any of those files — the custom properties inherit down from the order form's own wrapper.
- Verified the change touches paper only: `git diff app/globals.css` is empty, `components/summary/`, `components/outline/outline-viewer.tsx` and `components/viewer/` are all untouched, and no literal colour value (hex or otherwise) entered the stylesheet — the override is `color-mix` against the same theme-aware base tokens throughout.

## Task Commits

Each task was committed atomically:

1. **Task 1: Make the faint reference lines survive a printer** - `99ba4b8` (feat)
2. **Task 2: Print-preview verification** - `checkpoint:human-verify`, gate `blocking` — run by the orchestrator against main after merge; the shaper answered **Approved** to both pages fitting, lines legible, and dark theme printing white.

## Files Created/Modified

- `app/design/summary/order-form.css` - New `@media print` rule raising `--outline-station-line` and `--outline-widepoint-line`, scoped to a tripled `[data-order-form-page]` selector, with a comment explaining both the specificity discipline (matching globals.css's own tripled `:root` trick) and the no-literal-colour rule (260825-rqm)

## Decisions Made

- Route-scoped the override to `order-form.css` rather than `globals.css`, per the plan's explicit instruction — the tiled 1:1 template PDF (03-01) doesn't read CSS at all and the Template editor screen is never printed, so only this route needs stronger lines on paper.
- Tripled the `[data-order-form-page]` selector to reach (0,3,0) specificity, mirroring globals.css's own documented reasoning for tripling `:root` in its print block: a bare attribute selector would score (0,1,0), tied with the plain `:root` declaration that sets these tokens and below an explicitly chosen `:root.theme-<id>` at (0,2,0) — so an untripled override would silently lose on Slate or Phosphor.
- Raised the mix percentages (36%->65%, 45%->75%) rather than changing dash patterns, base tokens, or anything on screen — the plan was explicit that dash patterns distinguish the widepoint line from the station lines and that screen values must stay exactly as they are.

## Deviations from Plan

None - Task 1 executed exactly as written: only `order-form.css`'s `@media print` block was touched, the `color-mix` form and base tokens were preserved, dash patterns were left alone, and `globals.css`/the viewer/the callout primitives/the print-fit hook were all left untouched (confirmed by the acceptance-criteria diff checks).

## Issues Encountered

None. `npm run lint` reports 0 errors (9 pre-existing warnings in unrelated files, not touched by this task). `npm test` passes 832/832. This worktree had no `node_modules` at start and required `npm install` before either check could run — expected per this environment's constraints, not a deviation.

## Next Phase Readiness

**Plan is complete.** Task 2 of `03-06-PLAN.md`, a `checkpoint:human-verify` with `gate="blocking"`, was run by the orchestrator against main after merge (this worktree-isolated agent could not run `npm run dev`, Turbopack cannot resolve `next` outside the main checkout, and had no printer). The shaper print-previewed the order form and answered **Approved** to both pages fitting, reference lines legible, and dark theme printing white.

**What's ready:** Task 1's automated work is committed and green (832/832 vitest tests pass, `npm run lint` reports 0 errors, and every acceptance-criteria diff check in `03-06-PLAN.md` Task 1 passes). The print-scoped override is live on main.

## Self-Check: PASSED

- FOUND: app/design/summary/order-form.css
- FOUND commit: 99ba4b8

---
*Phase: 03-volume-templates-verified-math*
*Completed: 2026-08-28*
