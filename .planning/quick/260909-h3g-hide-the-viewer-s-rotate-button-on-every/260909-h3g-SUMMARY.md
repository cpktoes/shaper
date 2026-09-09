---
phase: quick-260909-h3g
plan: 01
subsystem: ui
tags: [tailwind, playwright, viewer-toolbar, responsive]

requires: []
provides:
  - "TEMPLATE and ROCKER's Rotate button is hidden on any touch pointer, at any width — not only below the 820px shell breakpoint"
  - "Landscape-phone Playwright coverage (Pixel 7 landscape) proving the rotate button stays hidden on a wide touch device"
affects: [phone-layout, viewer-toolbar]

actuals:
  tokens: 3223
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "coarse pointer variant can now gate a control's PRESENCE, not just its size — first use of `coarse:hidden` in the codebase"

key-files:
  created: []
  modified:
    - components/outline/outline-editor.tsx
    - components/rocker/rocker-editor.tsx
    - app/globals.css
    - CLAUDE.md
    - e2e/phone-layout.spec.ts

key-decisions:
  - "Fixed by hiding the dead button rather than making it work: on a coarse pointer the drawn orientation already follows the device's own portrait/landscape query, so honoring the Rotate button there would mean overriding the device's own orientation — the opposite of what D-09/D-10 established and not what the founder asked for."
  - "Wide view keeps its width-only gate (no pointer hide added) because a touchscreen laptop at desktop width genuinely still has a sidebar worth hiding — only Rotate had nothing left to do."
  - "Playwright's own `Pixel 7 landscape` descriptor bundles `defaultBrowserType: 'chromium'`, which `test.use` cannot set inside a `describe` (Playwright forces a new worker for that). Destructured it out of the spread and asserted the describe's `android`-only skip covers the same chromium requirement instead."

patterns-established:
  - "A `test.use({...devices[...]})` device descriptor overriding a whole describe must strip `defaultBrowserType` if present — that field is describe-illegal in Playwright and only the top-level config or file scope may set it."

requirements-completed: [QT-260909-h3g]

coverage:
  - id: D1
    description: "The Rotate button on TEMPLATE and ROCKER is hidden on any touch pointer at any width (not just below 820px), closing the touchscreen-laptop/landscape-phone edge case 09-02-SUMMARY.md left open"
    requirement: "QT-260909-h3g"
    verification:
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts#phone held sideways — the rotate button stays gone even at a width wide enough for the desktop layout > the rotate button is gone on both TEMPLATE and ROCKER, even though the screen is wide enough for the desktop layout"
        status: pass
      - kind: automated_ui
        ref: "grep count of className=\"max-shell:hidden coarse:hidden\" in outline-editor.tsx and rocker-editor.tsx (== 2)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A mouse-driven desktop is completely unaffected: same Rotate icon, same corner, same click, on both TEMPLATE and ROCKER, at every width"
    requirement: "QT-260909-h3g"
    verification:
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts#desktop shell — unchanged > the rotate button is visible and the drag targets stay hidden until the construction toggle is pressed"
        status: pass
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts#desktop shell — unchanged > the rotate button is visible on ROCKER too"
        status: pass
      - kind: e2e
        ref: "PW_PORT=3115 npx playwright test --project=desktop e2e/desktop-baseline.spec.ts (all five baseline screenshots unchanged, no --update-snapshots run)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every other toolbar icon (construction lines, wide view) is untouched on every device, and every comment/doc sentence describing the old width-only rule now describes the real width-AND-pointer rule"
    verification:
      - kind: automated_ui
        ref: "grep counts: 0 stale 'Gated on width, not pointer' claims, 0 stale 'gated on width like Rotate above' claims, wide-view buttons still className=\"max-shell:hidden\" (== 2)"
        status: pass
    human_judgment: false
duration: 55min
completed: 2026-09-09
status: complete
---

# Quick Task 260909-h3g: Hide the dead Rotate button on every touch screen Summary

**Rotate button on TEMPLATE and ROCKER now hides on any touch pointer (`coarse:hidden`), not just below the 820px shell breakpoint — closing the landscape-phone and touchscreen-laptop edge case where the button did nothing when tapped.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-09-09T12:05:00Z (approx, worktree branch check)
- **Completed:** 2026-09-09T13:00:00Z (approx)
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Both editors' Rotate button now carries `max-shell:hidden coarse:hidden` (was `max-shell:hidden` only), so it disappears on any touch device regardless of viewport width — a phone held sideways (844px iPhone 14, 863px Pixel 7) no longer brings the dead button back.
- Wide view's button on both screens is untouched (`max-shell:hidden` only) — it still does a real job on a touchscreen laptop at desktop width.
- All four button comments, the `coarse` custom-variant comment in `app/globals.css`, and CLAUDE.md's Layout paragraph rewritten to describe the real width-AND-pointer rule instead of the stale width-only claim.
- New Playwright coverage using `devices["Pixel 7 landscape"]` (863px, chromium — the descriptor that actually reproduces the founder's complaint; `iPhone 14 landscape` emulates only 750px and would prove nothing) asserts its own coarse-pointer/over-820px preconditions before checking the rotate button is hidden on both TEMPLATE and ROCKER.
- New desktop guard test confirms Rotate stays visible on ROCKER (TEMPLATE was already covered), proving pointer — not width — is what changed.

## Task Commits

Each task was committed atomically:

1. **Task 1: the rotate icon stops showing on any touch screen, however wide** - `091ee1c` (fix)
2. **Task 2: prove it with a phone held sideways, and prove the mouse still keeps its button** - `428bc4b` (test)

**Plan metadata:** committed together with this SUMMARY in this worktree (docs commit follows).

## Files Created/Modified
- `components/outline/outline-editor.tsx` - Rotate button gains `coarse:hidden`; both button comments rewritten
- `components/rocker/rocker-editor.tsx` - Same fix and comment rewrite, mirrored
- `app/globals.css` - One sentence added to the `coarse` custom-variant's comment; no CSS rule changed
- `CLAUDE.md` - Layout paragraph's pointer-picks-sizing sentence widened to cover presence for this one control
- `e2e/phone-layout.spec.ts` - New landscape-phone describe (Pixel 7 landscape) plus a desktop ROCKER rotate-visible guard test

## Decisions Made
- Hid the button rather than making it work — see `key-decisions` in frontmatter for the full rationale (D-09/D-10 already drives orientation from the device on a coarse pointer).
- Kept wide view untouched; only Rotate lost its purpose on a coarse pointer.
- Stripped `defaultBrowserType` out of the `Pixel 7 landscape` device spread before passing it to `test.use` inside a `describe`, since Playwright disallows setting that field there (it forces a new worker) — confirmed by first attempt failing with `Cannot use({ defaultBrowserType }) in a describe group`. The describe's own `android`-only skip already guarantees chromium, so nothing is lost.

## Deviations from Plan

None - plan executed exactly as written. The `defaultBrowserType` issue above was a plan-time-unforeseen mechanical Playwright constraint discovered while writing Task 2's test, not a deviation from what the plan asked for — it was fixed inline as part of implementing the task's own instructions (Rule 3, blocking issue, resolved without changing any package or test intent).

## Issues Encountered
- First run of the new landscape test failed immediately with `Cannot use({ defaultBrowserType }) in a describe group, because it forces a new worker.` Fixed by destructuring `defaultBrowserType` out of `devices["Pixel 7 landscape"]` before spreading the rest into `test.use`.
- `npx tsc --noEmit` initially failed with `Cannot find name 'LayoutProps'` in `app/layout.tsx` and `app/design/layout.tsx` — a fresh worktree has no `.next/types` yet (that global type is generated by `next dev`/`next build`, neither of which runs standalone here). Resolved with `npx next typegen`, which regenerates just the route types without a full build; no source file was touched and the two-error state was purely a worktree environment gap, not a defect in this task's changes.

## Human verification deferred

The plan's Task 2 `<human-check>` (its own words: "On the founder's own phone, open TEMPLATE and turn the phone sideways...") was not run against a physical device in this execution — `workflow.human_verify_mode` is end-of-phase, so this is deferred to end-of-phase UAT per the orchestrator's ruling. Everything the automated suite can prove (the coarse-pointer/over-820px preconditions, the button hidden on both screens at 863px chromium landscape, the mouse-driven desktop unaffected on both screens, no baseline screenshot regenerated) passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both editors and the shared toolbar comments are internally consistent again; no other quick task or phase plan depends on this change.
- The sibling agent editing the rails dialog/tests in a parallel worktree is unaffected — no file this task touched overlaps with `components/rails/*`, `e2e/phone-rails.spec.ts`, `e2e/keyboard-focus.spec.ts`, or `components/viewer/toolbar-button.tsx`.
- Founder's own physical-device check (phone held sideways, TEMPLATE and ROCKER) remains open for end-of-phase UAT.

## Self-Check: PASSED

- FOUND: components/outline/outline-editor.tsx (className="max-shell:hidden coarse:hidden" present)
- FOUND: components/rocker/rocker-editor.tsx (className="max-shell:hidden coarse:hidden" present)
- FOUND: app/globals.css (coarse variant comment updated)
- FOUND: CLAUDE.md (Layout paragraph updated)
- FOUND: e2e/phone-layout.spec.ts (landscape describe + desktop ROCKER guard test present)
- FOUND commit 091ee1c (fix task 1)
- FOUND commit 428bc4b (test task 2)
- Full Playwright suite: 195 total, 103 passed, 92 skipped (project-scoped), 0 failed
- `npx vitest run`: 45 files, 2311 passed, 2 skipped (2313) — unchanged baseline
- `npx tsc --noEmit`: exit 0
- `npm run lint`: 0 errors, 12 warnings (unchanged pre-existing baseline)
- `git status --porcelain` for the two editor files: clean after the red-then-green probe
- No file under `e2e/*-snapshots/` modified; no baseline screenshot regenerated
- `package.json`/`package-lock.json`: no diff after `npm install --no-audit --no-fund`

---
*Phase: quick-260909-h3g*
*Completed: 2026-09-09*
