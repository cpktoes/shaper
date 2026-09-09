---
phase: quick-260909-hmn
plan: 01
subsystem: ui
tags: [tailwind, playwright, fins, responsive]

requires:
  - phase: 09
    provides: phone-shell layout (width `shell` breakpoint, `coarse` pointer variant), FinViewer component
provides:
  - a third, height-driven layout switch on the FINS tail plot, independent of the existing width and pointer axes
affects: [fins, phone-layout]

actuals:
  tokens: 2300
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Inline Tailwind arbitrary variant `[@media(max-height:500px)]:` for a single-consumer, screen-height-driven layout switch, instead of promoting it to a named `app/globals.css` variant"

key-files:
  created:
    - e2e/phone-fins-landscape.spec.ts
  modified:
    - components/fins/fin-viewer.tsx
    - CLAUDE.md

key-decisions:
  - "The short-screen condition is written inline in components/fins/fin-viewer.tsx as the Tailwind arbitrary variant [@media(max-height:500px)], not promoted to a named variant in app/globals.css, because FinViewer is its only consumer today (per Phase 9's own precedent for single-consumer conditions)"
  - "500px is the threshold: comfortably clear of every measured sideways-phone height (Pixel 7 360, iPhone 14 340) and every measured full-height case (664-839)"

requirements-completed: [QT-260909-hmn]

coverage:
  - id: D1
    description: "On a screen shorter than 500 dots (a phone held sideways), the FINS Base Length key moves beside the tail plot instead of beneath it, and the plot fills at least 95% of the viewer's height"
    requirement: QT-260909-hmn
    verification:
      - kind: e2e
        ref: "e2e/phone-fins-landscape.spec.ts › FINS with the phone held sideways › the fin key moves beside the tail plot and the plot fills the short viewer's height"
        status: pass
    human_judgment: false
  - id: D2
    description: "On a full-height screen (desktop, tablet, upright phone) the FINS legend stays beneath the plot and the plot shares height with it as before, with no change to the five desktop reference screenshots"
    requirement: QT-260909-hmn
    verification:
      - kind: e2e
        ref: "e2e/phone-fins-landscape.spec.ts › FINS on a full-height screen › the fin key stays beneath the tail plot and the plot keeps sharing the viewer's height"
        status: pass
      - kind: e2e
        ref: "playwright: full suite, all three projects — e2e/desktop-baseline.spec.ts snapshots unchanged"
        status: pass
    human_judgment: false
  - id: D3
    description: "CLAUDE.md's Layout section records viewport height as a third switch, independent of the existing width (`shell`) and pointer (`coarse`) switches"
    requirement: QT-260909-hmn
    verification:
      - kind: manual_procedural
        ref: "CLAUDE.md Layout section, paragraph beginning 'A third switch answers a different question again'"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-09
status: complete
---

# Quick Task 260909-hmn: Sideways-phone FINS legend beside the tail plot Summary

**On any screen shorter than 500 dots — a phone held sideways is the real case — the FINS Base Length key now sits in a column to the right of the tail drawing instead of stacked underneath it, so the drawing itself gets the height the legend used to take: measured 116x89 to 211x162 on a Pixel 7 held sideways.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-09T13:12:00Z (approx, worktree spawn)
- **Completed:** 2026-09-09T13:38:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 new)

## Accomplishments

- FINS tail-plot viewer now switches from a stacked column to a row whenever the viewport is shorter than 500px, moving the Base Length key beside the drawing and handing the freed height to the drawing itself.
- New `e2e/phone-fins-landscape.spec.ts` proves both the sideways-phone case (legend right of plot, plot fills ≥95% of viewer height) and the full-height case (legend beneath plot, unchanged from before); confirmed failing against the unchanged component before the fix, then passing after.
- Full Playwright suite (all three projects, including the five desktop reference screenshots) stays green with no baseline rewritten — the change reaches only screens under 500px tall.
- CLAUDE.md's Layout section now documents this as a third, independent switch: width picks the layout, pointer picks the sizing, height (new) picks whether the FINS key sits beside or beneath the drawing.

## Task Commits

1. **Task 1: On a short screen, put the fin key beside the tail plot instead of under it** - `c33f12a` (fix)
2. **Task 2: Write down the third switch, then prove nothing else on the app moved** - `358cfa5` (docs)

_No TDD-style test/feat split was used here — the new spec file was written and run against the unchanged component first (confirmed failing), then the component change was made and the spec confirmed green, all as one task commit per the plan's own instructions._

## Files Created/Modified

- `components/fins/fin-viewer.tsx` - Three className strings gained `[@media(max-height:500px)]:`-prefixed classes (`flex-row`/`items-stretch`/`gap-2` on the viewer wrapper, `min-w-0` on the plot wrapper, `justify-center` on the legend); `data-fin-plot` and `data-fin-legend` test hooks added; one comment added explaining the height-only condition, the `items-stretch` load-bearing detail, and the measured payoff. No unprefixed class, geometry, viewBox, formula or label touched.
- `e2e/phone-fins-landscape.spec.ts` - New spec: "FINS with the phone held sideways" (Pixel 7 landscape, `android` project only) asserts the screen really is short (`matchMedia` + exact viewport dims) then that the legend sits right of the plot and the plot fills ≥95% of the viewer's height; "FINS on a full-height screen" (`desktop` project only) asserts the mirror image and that the ratio stays under 0.95.
- `CLAUDE.md` - Two sentences appended to the end of the Layout section's phone-switches paragraph, naming viewport height as a third, independent axis alongside the `shell` width breakpoint and the `coarse` pointer variant.

## Decisions Made

- Kept the condition inline in `fin-viewer.tsx` rather than promoting it to a named `app/globals.css` variant, per the plan's own decision record — `FinViewer` is the only consumer today, and promoting is a five-line change if a second consumer ever appears.
- Used `iPhone 14 landscape` was deliberately excluded from the sideways-phone assertion (only used the measured-facts callout that it is a 750px-wide shell, below the 820px `shell` breakpoint, so it renders the phone-stacked shell rather than the desktop one the plan measured against) — the spec's header comment records why, matching the plan's own reasoning.
- `Pixel 7 landscape`'s device descriptor include a `defaultBrowserType` field that Playwright rejects when spread into a describe-level `test.use` (it's a worker-scoped option only valid in the config's own `projects` list); stripped it before spreading the rest of the descriptor. Not called out in the plan's measured facts, but a mechanical fix needed to make the plan's own described test pattern run (Rule 3 - blocking).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stripped `defaultBrowserType` from the `Pixel 7 landscape` device descriptor before spreading it into `test.use`**
- **Found during:** Task 1 (writing `e2e/phone-fins-landscape.spec.ts`)
- **Issue:** `test.use({ ...devices["Pixel 7 landscape"] })` at the describe level threw "Cannot use({ defaultBrowserType }) in a describe group, because it forces a new worker" — Playwright only accepts that field from the config file's own `projects` list, not from a per-file `test.use`.
- **Fix:** Copied the descriptor into a local object and deleted `defaultBrowserType` from it before spreading the rest (viewport, touch, scale factor, user agent) into `test.use`. The `android` project already pins chromium in `playwright.config.ts`, so the browser choice was never in question.
- **Files modified:** e2e/phone-fins-landscape.spec.ts
- **Verification:** Spec runs and passes on the `android` project; `npm run lint` and `npx tsc --noEmit` clean.
- **Committed in:** c33f12a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to make the plan's own specified test pattern runnable at all under this Playwright version. No scope creep — no other line in the spec or component changed as a result.

## Issues Encountered

None beyond the deviation above.

## Human verification deferred

Per `workflow.human_verify_mode` (end-of-phase) and the orchestrator's ruling that this task must not stop for a human mid-run, the plan's Task 1 `<human-check>` was not performed interactively by a human during this run. It is deferred to end-of-phase UAT:

- Open `/design/fins` in a browser and drag the window until it is under 500 dots tall: the Base Length key should hop to the right of the tail drawing and the drawing should grow to fill the height. Drag it taller again and the key should drop back underneath.

The automated equivalent (the new Playwright spec, run on real `Pixel 7 landscape` and `desktop` viewport geometry) passed and is the primary proof; the human-check above is a supplementary visual confirmation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- No blockers. The change is fully contained to `components/fins/fin-viewer.tsx`, one new spec file, and one CLAUDE.md paragraph.
- `app/globals.css`, `e2e/phone-screens.spec.ts`, `e2e/phone-layout.spec.ts`, `e2e/desktop-baseline.spec.ts`, and everything under `lib/geometry/` are untouched, as required — verified by `git diff --name-only` against the pre-task base and by the full Playwright suite's zero baseline-snapshot changes.
- A sibling in-flight quick task is editing `components/viewer/*` and `e2e/phone-layout.spec.ts` in a separate worktree; this task did not touch either.

---
*Phase: quick-260909-hmn*
*Completed: 2026-09-09*
