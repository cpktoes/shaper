---
phase: quick-260909-i7r
plan: 01
subsystem: ui
tags: [css, container-queries, playwright, order-form, phone]

requires:
  - phase: quick-260909-hos
    provides: "The printed sheet's own physical size, declared in app/design/summary/order-form.css's @media print block and mirrored by components/summary/use-print-fit.ts — this quick task's screen-only scaler had to leave that block and its own test/spec untouched."
provides:
  - "A screen-only preview block in app/design/summary/order-form.css that always lays the order-form sheet stack out at its 880px design width and shrinks the whole picture (via `transform`, not `zoom`) to fit whatever screen it's on"
  - "A new wrapping element (`data-order-form-scaler`) around the sheet stack in components/summary/order-form.tsx that carries the sheet count and reserves the shrunken height so the page never scrolls past empty space"
  - "The Print Order Form / Export Template / Rail Band Instructions button row now wraps instead of overhanging both edges of a phone screen"
  - "components/summary/order-form-preview.test.ts pinning the preview's four borrowed numbers (sheet shape, stack gap, design width, page container) to their one source each"
  - "e2e/summary-preview.spec.ts proving the preview on both phone engines and confirming the desktop is unchanged"
affects: [10-the-whole-app-on-a-phone]

actuals:
  tokens: 8267
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Screen-only scaling of a design-width layout via CSS `transform: scale()` on a `@container`-driving root, with the scaled element's own reserved height derived from declared constants (never zoom, which breaks container-query units in WebKit)"

key-files:
  created:
    - components/summary/order-form-preview.test.ts
    - e2e/summary-preview.spec.ts
  modified:
    - app/design/summary/order-form.css
    - components/summary/order-form.tsx

key-decisions:
  - "The two custom properties the scale math needs (--order-form-design-width, --order-form-stack-gap) live on [data-order-form-scaler], not [data-order-form-page] as the plan literally specified — order-form-print.test.ts (owned by the sibling print quick task, not touched here) does a marker-based lookup for the FIRST rule whose selector is exactly `[data-order-form-page] {`, which is its own print rule; adding an earlier same-selector rule broke that test. The scaler is a valid common ancestor for both consumers (its own screen-media rule and the sheet stack it wraps), so the properties work identically from there."
  - "The @media screen block's container-type declaration uses `:where([data-order-form-page])` instead of the bare attribute selector, for the same reason — it keeps the rule from textually matching the print test's marker while costing nothing (the selector has zero competing specificity here)."
  - "Task 1's own e2e case ('the whole sheet is shrunk to fit the screen') does not assert page-wide scrollWidth==clientWidth, only that every sheet's edges lie inside the viewport. The page-wide sideways-scroll assertion is Task 3's alone, added once the button row's own overflow (independent of the sheet-scaling fix, and present in the codebase since before this quick task) is resolved."

requirements-completed: []

coverage:
  - id: D1
    description: "Each order-form sheet on a phone draws as a true shrunken picture of the printed page — full sheet laid out at 880px, transform-scaled down, every drawing and heading intact — instead of being re-laid-out at the phone's own width"
    verification:
      - kind: e2e
        ref: "e2e/summary-preview.spec.ts#the whole sheet is shrunk to fit the screen"
        status: pass
      - kind: e2e
        ref: "e2e/summary-preview.spec.ts#it is the same sheet a computer draws, only smaller"
        status: pass
    human_judgment: true
    rationale: "The e2e assertions prove the geometry (laid-out width, wordmark px, edges-in-viewport), but only a human looking at the actual shrunken drawings on a real phone can confirm the board outlines, rocker profile and rail sections read as legible artwork rather than just correct numbers — deferred per this plan's own verification section, item 7."
  - id: D2
    description: "A computer's Summary screen is unaffected at any width from 928px up — same sheet size, same centering, same wordmark size, five desktop reference screenshots unchanged"
    verification:
      - kind: e2e
        ref: "e2e/summary-preview.spec.ts#a computer still shows the order form at full size"
        status: pass
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts (all five screens)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The Rail Band Instructions third sheet gets the same preview treatment, with no dead space below the last sheet"
    verification:
      - kind: e2e
        ref: "e2e/summary-preview.spec.ts#the Rail Band Instructions sheet gets the same treatment"
        status: pass
    human_judgment: false
  - id: D4
    description: "The preview's four borrowed numbers (sheet aspect ratio, stack gap, design width, page container type) are pinned to their one true source each, so a future edit that drifts one of them fails loudly instead of leaving dead space or a clipped sheet"
    verification:
      - kind: unit
        ref: "components/summary/order-form-preview.test.ts (5 cases)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The Print Order Form button sits fully on the screen on a phone, and the Summary no longer scrolls sideways"
    verification:
      - kind: e2e
        ref: "e2e/summary-preview.spec.ts#the Print Order Form button sits fully on the screen on a phone"
        status: pass
    human_judgment: false
  - id: D6
    description: "Printing from a computer is byte-for-byte untouched: the print path, use-print-fit.ts, and order-form-print.test.ts are all unmodified, and the printed-sheet-size e2e spec still passes"
    verification:
      - kind: e2e
        ref: "e2e/summary-print-size.spec.ts (all three cases, desktop project)"
        status: pass
      - kind: unit
        ref: "components/summary/order-form-print.test.ts (unmodified, still green)"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-09-09
status: complete
---

# Quick Task 260909-i7r: On a Phone, the Summary Shows a True Preview of Each Order-Form Page

**A screen-only `transform: scale()` preview wraps the order-form sheet stack so a phone shows the same 880px-wide sheet a computer shows, shrunk as one picture — never re-laid-out at the phone's own width — and the Print Order Form button row now wraps instead of hanging off the screen edge.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-09-09T14:19:00Z
- **Completed:** 2026-09-09T14:41:00Z
- **Tasks:** 3
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- On a phone, the Summary's order form now shows every drawing (both board outlines, the rocker profile, all three rail sections) and every heading in its correct place — before this fix the sheet was redrawn at the phone's own ~342px width, which collapsed the whole drawings row and ran the dimension headings into each other
- The sheet is provably the *same document* a computer shows, only smaller: it lays out at 880px and its type computes to the same sizes (a 24.64px wordmark) on both phone browser engines, where before it fell to a 16px clamp floor
- A computer's Summary screen is byte-for-byte unaffected — same sizes, same centering, five desktop reference screenshots unchanged, and printing from a computer is completely untouched
- The Print Order Form button, which used to hang half off the left edge of a phone screen (and was the actual cause of the whole page scrolling sideways), now sits fully on screen

## Task Commits

Each task was committed atomically:

1. **Task 1: Draw the sheet at full size and shrink the whole picture to fit the phone** - `f904aba` (fix)
2. **Task 2: Pin the preview's borrowed numbers to the one place each of them comes from** - `141e1fb` (test)
3. **Task 3: Keep the Print Order Form button on the screen, and prove nothing else moved** - `00f0715` (fix)

_No plan-metadata/docs commit — REQUIREMENTS.md update was withheld per orchestrator instruction (see Deviations)._

## Files Created/Modified

- `app/design/summary/order-form.css` - New screen-only preview block: `@property` registration for the scale, the design-width/stack-gap constants (declared on the scaler, see Decisions), and the `@media screen` rules that measure the container, compute the scale via `tan(atan2(...))`, and apply it with `transform: scale()`
- `components/summary/order-form.tsx` - One new `data-order-form-scaler` wrapper around the sheet stack carrying `--order-form-sheet-count`; the stack's `w-full max-w-[880px]` classes moved out into the stylesheet's `--order-form-design-width`; the button row below the paper now wraps (`flex-wrap justify-center`)
- `components/summary/order-form-preview.test.ts` - NEW. Five cases pinning the stack height's shape figures to the sheet's own `aspect-ratio`, the stack gap to `2rem`/`gap-8`, the design width to one variable read in two places, the page wrapper's `container-type: inline-size`, and the print block's exclusion of every preview declaration
- `e2e/summary-preview.spec.ts` - NEW. Four cases (three phone-only, one desktop-only) proving the shrink-to-fit behavior, the "same document" claim (laid-out width and wordmark size), the three-sheet case, desktop-unchanged, plus a fifth case (added in Task 3) proving the Print Order Form button sits on screen and the page no longer scrolls sideways

## Decisions Made

1. **The scale's two input constants live on `[data-order-form-scaler]`, not `[data-order-form-page]` as the plan literally specified.** `components/summary/order-form-print.test.ts` (owned by the sibling print quick task 260909-hos, explicitly off-limits here) locates its own print rule by searching for the *first* occurrence of the literal string `[data-order-form-page] {` in the stylesheet. Adding an earlier rule with that exact selector — even an unrelated one just declaring two custom properties — silently redirected that search to the wrong rule and broke two of that test's assertions. The scaler element is a valid common ancestor for everything that needs these values (its own `@media screen` rule and the sheet stack it wraps), so moving the declarations there preserves the intended behavior without touching the untouchable file. Discovered and fixed while running the full `npx vitest run` verification step for Task 1, before committing.

2. **The `@media screen` block's `container-type: inline-size` rule uses `:where([data-order-form-page])` instead of the bare attribute selector**, for the identical reason — it keeps this rule's text from ever matching the print test's marker lookup, while adding no specificity that would change how anything cascades.

3. **Task 1's own "the whole sheet is shrunk to fit the screen" e2e case does not assert page-wide `scrollWidth === clientWidth`.** The plan's Task 1 action text calls for that assertion, but the page wrapper's sideways-scroll today is caused entirely by the (at that point still unfixed) button row hanging off both edges — a pre-existing, independent issue that Fact 6 in the plan itself measures and that Task 3 alone owns fixing. Asserting page-wide scroll parity inside Task 1's own case would have made that case fail until Task 3 landed, contradicting Task 1's own `<verify>` step (which must pass on its own). Task 1's case instead asserts every sheet's edges individually lie inside the viewport; Task 3 adds the true page-wide "nothing scrolls sideways" assertion once the row wraps, exactly as its own plan text calls for.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Custom-property placement moved off `[data-order-form-page]` to avoid breaking a sibling task's test**

- **Found during:** Task 1, running `npx vitest run` as part of verification before committing
- **Issue:** The plan's literal instructions place `--order-form-design-width` and `--order-form-stack-gap` on `[data-order-form-page]`. That selector text, appearing before the print path in the file, collided with `order-form-print.test.ts`'s marker-based search for its own (later) `[data-order-form-page]` rule — two of that untouched test's cases started failing.
- **Fix:** Declared both properties on `[data-order-form-scaler]` instead (a valid common ancestor for every consumer), and changed the screen-media `container-type` rule to use `:where([data-order-form-page])` for the same reason.
- **Files modified:** `app/design/summary/order-form.css` (within the same Task 1 commit)
- **Verification:** Full `npx vitest run` green (49 files, 2340 passed, 2 skipped), including the untouched `order-form-print.test.ts`
- **Committed in:** `f904aba` (Task 1 commit)

**2. [Rule 2/skip - orchestrator instruction] `.planning/REQUIREMENTS.md` not edited**

- **Found during:** Task 3
- **Issue:** The plan's Task 3 instructs annotating PHON-09 in `.planning/REQUIREMENTS.md` to note this quick task delivered the on-screen half early.
- **Fix:** Skipped per explicit orchestrator ruling ("requirement bookkeeping is orchestrator work"). Recorded here instead: **PHON-09 ("User can read the summary and the on-screen order form on a phone") has its on-screen order-form half delivered by this quick task (260909-i7r).** Phase 10 still owns reading the summary itself and the real-device walk-through; the box should not be ticked.
- **Files modified:** none
- **Committed in:** n/a (no commit made for this item)

---

**Total deviations:** 2 (1 auto-fixed bug, 1 orchestrator-directed skip)
**Impact on plan:** The custom-property relocation is a structural adaptation with identical visible behavior — verified byte-for-byte against every measured fact in the plan (scale formula, reserved height, wordmark size, print-path exclusion). No scope creep; no visible behavior differs from the plan's intent.

## Issues Encountered

None beyond the deviation above — no blockers, no auth gates, no architectural questions.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Human verification deferred

This plan's task 1 is a `tracer` task; per the orchestrator's ruling for this run, its checkpoint was not surfaced interactively — the automated `<verify>` (tsc/vitest/lint/grep/Playwright) was run and passed, and execution continued straight through Tasks 2 and 3 without pausing. The plan's own `<verification>` section items 7-9 are genuine human-judgment checks that a person should still do on a real phone before considering PHON-09's on-screen half fully closed:

- Open the Summary on a real phone. Each sheet should read as a shrunken photograph of the printed page — both board outlines, the rocker profile, all three rail sections, and the seven dimension headings each over their own number, with the paper's own line breaks. Type will be small (the deliberate trade for showing the real page); pinch-to-zoom is the browser's own and should work normally.
- Check it once with the gear menu set to Imperial and once set to Metric (the dimensions row's text differs between the two).
- Confirm the Print Order Form button is fully reachable under the paper and the page does not slide sideways when dragged.

## Next Phase Readiness

- The on-screen half of PHON-09 is done; Phase 10 (The Whole App on a Phone) still owns reading the summary itself and the real-device walk-through for PHON-09, plus PHON-07/08/10.
- `app/design/summary/order-form.css`'s print path, `components/summary/use-print-fit.ts`, `components/summary/order-form-print.test.ts` and `e2e/summary-print-size.spec.ts` (all owned by sibling quick task 260909-hos) are completely unmodified and their tests remain green.
- No blockers for Phase 10.

---
*Quick task: 260909-i7r*
*Completed: 2026-09-09*
