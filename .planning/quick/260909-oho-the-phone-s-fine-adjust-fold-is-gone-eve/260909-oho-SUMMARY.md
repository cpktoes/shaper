---
phase: quick-260909-oho
plan: 01
subsystem: ui
tags: [playwright, tailwind, phone-layout, sliders]

requires:
  - phase: 09-the-design-screens-on-a-phone
    provides: "the phone shell, the max-shell: breakpoint, the original Fine adjust fold (D-03)"
provides:
  - "TEMPLATE and ROCKER sidebars on a phone show every slider in the same section, same order, as the desktop sidebar — nothing folded away"
  - "the shared Fine adjust disclosure component removed entirely"
  - "phone/touch e2e specs rewritten to prove sliders are simply on screen instead of opening a fold first"
  - "the production slider-dot check reduced to one profile-agnostic at-load assertion, since the fold was the app's only slider that ever loaded hidden"
affects: [phone-layout-e2e, touch-drag-e2e, slider-touch-e2e, prod-e2e]

actuals:
  tokens: 7900
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A phone-only fold is removed by deleting its header component and the two CSS rules (max-shell:order-N, max-shell:group-data-[...]:hidden) on each row it touched — the row's own markup and DOM position never change, so removing the fold is purely a class-string edit."

key-files:
  created: []
  modified:
    - components/outline/outline-controls.tsx
    - components/rocker/rocker-controls.tsx
    - app/globals.css
    - e2e/phone-layout.spec.ts
    - e2e/touch-drag.spec.ts
    - e2e/touch-sizing.spec.ts
    - e2e/slider-touch.spec.ts
    - e2e/prod/slider-dots.spec.ts

key-decisions:
  - "Decision D-03 (Phase 9 context, 09-CONTEXT.md line 85) is withdrawn by the founder on 2026-09-09: \"Let's just remove the 'fine adjustments' section and put the sliders where they are supposed to be.\" The CONTEXT.md record was left exactly as written, as history, and was not edited."

requirements-completed: [QT-260909-oho]

coverage:
  - id: D1
    description: "On a phone, TEMPLATE shows Width, Offset, Tail Rail, Nose Rail, Nose Angle/Fullness and Tail Angle/Fullness straight away, each in its own desktop-matching section, with no Fine adjust row anywhere."
    requirement: QT-260909-oho
    verification:
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts#phone controls — every slider sits in its own section > Width and Nose Angle are on screen the moment the page opens, with no Fine adjust row anywhere"
        status: pass
    human_judgment: false
  - id: D2
    description: "On a phone, ROCKER shows Nose/Tail Angle, Smoothness and Flatness in the Rocker section between Nose Rocker and Tail Rocker, matching the desktop sidebar."
    requirement: QT-260909-oho
    verification:
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts#phone controls — every slider sits in its own section > Width and Nose Angle are on screen the moment the page opens, with no Fine adjust row anywhere"
        status: pass
    human_judgment: false
  - id: D3
    description: "The desktop shell is byte-identical — every rule removed was max-shell:-gated, so the five desktop baseline screenshots match with no regeneration."
    verification:
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts (TEMPLATE, ROCKER, RAILS, VOLUME, FINS — all five, desktop project)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every slider still takes a finger anywhere on its bar (260909-kyz) and still shows its dot at load (260909-nvw), unweakened by this change."
    verification:
      - kind: e2e
        ref: "e2e/slider-touch.spec.ts (Cases A/B/C, android project)"
        status: pass
      - kind: e2e
        ref: "e2e/prod/slider-dots.spec.ts#every slider dot is positioned at load, on a phone and on a desktop alike"
        status: pass
    human_judgment: false
  - id: D5
    description: "The production build's slider-dot regression check (e2e/prod/slider-dots.spec.ts) actually runs against next start on main after the merge."
    verification: []
    human_judgment: true
    rationale: "next build/next start cannot run from a worktree (Turbopack will not resolve next outside the main checkout, per CLAUDE.md); the orchestrator runs npm run test:e2e:prod on main after merging."

duration: 33min
completed: 2026-09-10
status: complete
---

# Quick Task 260909-oho: The phone's Fine adjust fold is gone Summary

**Every slider on TEMPLATE and ROCKER now sits on a phone exactly where a shaper already sees it on a desktop screen — nothing is tucked behind a "Fine adjust" tap any more.**

## Performance

- **Duration:** 33 min
- **Started:** 2026-09-09T17:44:00Z (approx.)
- **Completed:** 2026-09-10T01:07:04Z
- **Tasks:** 3 completed
- **Files modified:** 9 (1 deleted, 8 edited)

## Accomplishments

- Deleted the shared "Fine adjust" fold header component (`components/design/fine-adjust-group.tsx`) outright — it had exactly two callers, both rewritten in the same commit.
- TEMPLATE's sidebar (`outline-controls.tsx`): the four rows that used to fold away (Nose Angle/Fullness, Width/Offset, Tail Rail/Nose Rail, Tail Angle/Fullness) are now plain rows in the section they were always written in — nothing moved in the DOM, only the two phone-only CSS rules on each row's wrapper were removed.
- ROCKER's sidebar (`rocker-controls.tsx`): the six shape controls (Nose/Tail Angle, Smoothness, Flatness) are back on the Rocker section's own spacing, matching the desktop sidebar exactly — the two `display: contents` overrides that used to let CSS `order` reach them are gone along with the fold.
- Rewrote `e2e/phone-layout.spec.ts`'s "phone Fine adjust group" test into "phone controls — every slider sits in its own section": it now proves Width and Nose Angle are visible with nothing tapped, that no "Fine adjust" button exists anywhere, and that Width sits above the Settings checkbox — proof it is back in the Widepoint Controls section rather than at the end of the list.
- `e2e/touch-drag.spec.ts`, `e2e/touch-sizing.spec.ts` and `e2e/slider-touch.spec.ts`: removed every tap that used to open the fold before reading a value, deleted the one test that measured the fold row's own tap size (there is no such row left to measure), and reworded two test titles that named the fold.
- `e2e/prod/slider-dots.spec.ts` reduced from two tests (open-the-fold, then a desktop sanity check) to one profile-agnostic test: every slider dot is positioned between 0-100% the moment TEMPLATE loads, on any of the three profiles — because the fold was the only slider anywhere in the app that ever loaded hidden, and it is gone.
- A stale `app/globals.css` comment that named the fold as one of thirteen call sites for `.focus-ring-accent` was trimmed to twelve and no longer mentions the fold.

## Task Commits

Each task was committed atomically:

1. **Task 1: Take the fold out — every slider back in its own section, proved in a real phone browser** - `ad27f9f` (fix)
2. **Task 2: Stop the browser tests tapping a row that is not there any more** - `853eb08` (test)
3. **Task 3: Rewrite the production dot check, then run everything including the five desktop pictures** - `afa91f0` (test)

## Files Created/Modified

- `components/design/fine-adjust-group.tsx` - deleted. The shared disclosure header for the fold; no longer needed.
- `components/outline/outline-controls.tsx` - dropped the fold import, state, four class-string constants and the trailing disclosure; four rows now carry a plain `flex gap-4` class.
- `components/rocker/rocker-controls.tsx` - dropped the fold import, state, the two `display: contents` wrappers and the trailing disclosure; three rows now carry a plain `flex items-end gap-4` class; header comment rewritten to describe the fold as removed history.
- `app/globals.css` - one comment trimmed (thirteen call sites → twelve, drops the Fine adjust mention).
- `e2e/phone-layout.spec.ts` - the "phone Fine adjust group" describe replaced with "phone controls — every slider sits in its own section"; two stale mentions of the fold in comments/titles fixed.
- `e2e/touch-drag.spec.ts` - seven fold taps and their explaining comments removed; everything else in the file untouched (shared with sibling quick task 260909-oge).
- `e2e/touch-sizing.spec.ts` - the test measuring the fold row's own tap size deleted.
- `e2e/slider-touch.spec.ts` - one fold tap removed, two test titles reworded.
- `e2e/prod/slider-dots.spec.ts` - rewritten from two tests to one, header comment explains why the fold-open half no longer applies.

## Decisions Made

- Decision D-03 from the Phase 9 context ("Sliders that duplicate a draggable point fold into one closed Fine adjust group") is withdrawn by the founder on 2026-09-09. The record in `.planning/phases/09-the-design-screens-on-a-phone/09-CONTEXT.md` (line 85) stays exactly as written, as history, and was not edited — it documents a decision that was made and later reversed, not a live instruction.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. One thing worth noting for future plans in this repo: the plan's own automated `<verify>` grep for Task 1 expects the literal identifier forms (`fine-adjust`, `FineAdjust`, `fineAdjust`, `FINE_ADJUST`) to appear in exactly one file after this change. In practice neither `components/ui/slider.tsx`'s historical note nor `rocker-controls.tsx`'s new header paragraph ever used those literal code-identifier forms — both only use the plain English phrase "Fine adjust" in prose, so the grep count comes back 0, not 1. The done criteria's prose (no functional fold code remains; the fold is mentioned only as history) is fully met; this is a minor mismatch in the plan's own self-check script, not a gap in the work.

## User Setup Required

None - no external service configuration required.

## Human verification deferred

None required for this task's own scope — every `<verify>` in the plan is automated, and `workflow.human_verify_mode` is end-of-phase per this task's orchestrator ruling. The one item still owed is infrastructural, not a review: `npm run test:e2e:prod` for the rewritten `e2e/prod/slider-dots.spec.ts` cannot run from a worktree (Turbopack will not resolve `next` outside the main checkout), so the orchestrator runs it on `main` after merging this worktree, alongside `npm run build`.

## Next Phase Readiness

- All three tasks are committed in this worktree (`ad27f9f`, `853eb08`, `afa91f0`), on top of `fb956cb` (main at dispatch).
- Full local pass in the worktree: `npx tsc --noEmit`, `npm run lint` (0 errors, only pre-existing unrelated warnings), `npx vitest run` (2381 passed, 2 skipped), and the full dev Playwright suite (`PW_PORT=3126 npx playwright test`) — 163 passed, 152 skipped (cross-project skip guards), 0 failed, including all five desktop baseline screenshots matching with no regeneration.
- Owed after merge, on `main`: `npm run build`, then `npm run test:e2e:prod` to confirm the rewritten `e2e/prod/slider-dots.spec.ts` passes against a real production build on all three profiles.
- Sibling quick task 260909-oge (the readout box staying outside the outline) still has cases to add to `e2e/touch-drag.spec.ts` — this task's edits there were kept surgical (only the fold taps and their comments removed) exactly so that addition can land cleanly.

---
*Phase: quick-260909-oho*
*Completed: 2026-09-10*
