---
phase: quick-260826-njn
plan: 01
subsystem: fins
tags: [geometry, fin-placement, mckee-longboard, quad, units]

requires:
  - phase: 01-04 (Fin Setup & Placement screen)
    provides: lib/geometry/fins.ts fin-placement engine and the Quad Model sidebar controls
provides:
  - A pure, unit-tested rule deciding which quad rear models a board of a given length may use
  - The fin engine falling back to McKee SB/Gun whenever McKee Longboard is out of range
  - The Quad Model panel showing McKee Longboard greyed out with a plain-English reason on a short board
affects: [fins, geometry]

actuals:
  tokens: 3520
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "New product rules with no prototype counterpart are enforced at the millimetre boundary in computeFinPlacement, never inside the ported inch core"
    - "Board-length comparisons against a foot/inch threshold are done in millimetres (both sides built through inchesToMm), never by converting back to inches, because the inch round-trip is lossy at the boundary value"

key-files:
  created: []
  modified:
    - lib/geometry/fins.ts
    - lib/geometry/fins.test.ts
    - components/fins/fin-controls.tsx
    - components/fins/fin-model-info.tsx

key-decisions:
  - "Fallback model is McKee SB/Gun (the neighbouring McKee rear-pair model, fitted across the shortboard/gun range), not the Basic - Spread model"
  - "The shaper's stored pick of McKee Longboard is never overwritten — only the calculated/displayed placement falls back, so lengthening the board back past 8'0\" restores their pick with no re-selection needed"
  - "The eight-foot comparison happens in millimetres at the one seam in computeFinPlacement, not inside the private inch core, per the module's existing statement-for-statement-port contract"

patterns-established:
  - "isQuadRearModelAvailable / effectiveQuadRearModel pair in lib/geometry/fins.ts: a pure predicate plus a pure resolver, with the resolver as the only thing components call — they never re-decide the rule themselves"

requirements-completed: [QUICK-260826-njn]

coverage:
  - id: D1
    description: "McKee Longboard quad fin numbers cannot be produced for a board under 8'0\", and can at exactly 8'0\" — the fallback happens through the public fin engine without overwriting the shaper's stored model choice"
    requirement: QUICK-260826-njn
    verification:
      - kind: unit
        ref: "lib/geometry/fins.test.ts#McKee Longboard quad model needs an eight-foot board"
        status: pass
      - kind: unit
        ref: "lib/geometry/fins.test.ts#computeFinPlacement golden parity (all 23 fixtures, unmodified)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Quad Model panel shows McKee Longboard greyed out with a plain-English reason on a short board, the highlighted pill always matches the model actually producing the numbers, and the 5th/Center fin tickbox reappears when the model falls back"
    requirement: QUICK-260826-njn
    verification:
      - kind: browser
        ref: "localhost:3000/design/fins — 6'0\" quad: McKee Longboard greyed, hint reads \"McKee Longboard needs a board 8'0\" or longer.\", clicking it does nothing"
        status: pass
      - kind: browser
        ref: "localhost:3000/design/fins — exactly 8'0\": option enabled, hint gone (floating-point boundary holds in the running app)"
        status: pass
      - kind: browser
        ref: "localhost:3000/design/fins — picked at 8'0\" then shortened to 7'6\": highlight follows to McKee SB/Gun, rear off-tail 7 15/16\" to 6\", spread 2 15/16\" to 2 9/16\", off-rail 1 5/16\" to 1 3/16\""
        status: pass
      - kind: browser
        ref: "localhost:3000/design/fins — relengthened to 8'6\": the shaper's McKee Longboard pick returns selected with its own numbers (not erased)"
        status: pass
      - kind: browser
        ref: "browser console — no errors"
        status: pass
    human_judgment: false
    rationale: "Run in the browser by the quick-task orchestrator after the executor returned; all four behaviours confirmed on the running app"

duration: 15min
completed: 2026-08-26
status: complete
---

# Quick Task 260826-njn: Disable the McKee Longboard Quad Model on a Short Board Summary

**McKee Longboard fin numbers can no longer come from a board under 8'0" — the fin engine now falls back to McKee SB/Gun automatically, and the Quad Model panel shows the option greyed out with a plain reason instead of hiding it.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments

- A shaper can no longer put the McKee Longboard fin model on a board shorter than eight feet. The option is still visible in the Quad Model panel — greyed out, not hidden — with a line underneath explaining it needs a board 8'0" or longer.
- If a shaper sets McKee Longboard on a long board and then shortens the board below eight feet, the fin numbers on screen switch immediately to McKee SB/Gun's numbers — because McKee's longboard formulas were never fitted below eight feet, so those numbers were never something the app should have kept showing.
- The shaper's own choice is remembered, not erased. Lengthen the board back to 8'0" or more, and McKee Longboard comes straight back — still selected, with its own numbers — with no need to re-pick it.
- The 5th/Center fin tickbox follows whichever model is actually producing the numbers: it's hidden while McKee Longboard is active (that model has no centre fin), and it reappears on a short board once the placement has fallen back to McKee SB/Gun.
- The eight-foot line is drawn in millimetres, not inches, because converting an eight-foot board back and forth loses a hair of precision (`mmToInches(inchesToMm(96))` comes out to `95.99999999999999`, not exactly 96). Comparing on the inch side would have wrongly rejected a board a shaper set to exactly 8'0" — this is recorded as a comment on the rule so nobody "simplifies" it back into the inch side later.

## Task Commits

Each task was committed atomically (Task 1 followed the RED/GREEN TDD cycle since it carried `tdd="true"`):

1. **Task 1: Teach the fin engine that the McKee Longboard model needs an eight-foot board**
   - `571bc64` (test) — failing tests for the cutoff rule and its fallback through the public engine
   - `2a855fc` (feat) — the rule itself (`isQuadRearModelAvailable`, `effectiveQuadRearModel`, the `MIN_MCKEE_LONGBOARD_QUAD_LENGTH` constant) wired into `computeFinPlacement`'s single seam
2. **Task 2: Grey the McKee Longboard option out on a short board and say why** - `bb86f57` (feat)

## Files Created/Modified

- `lib/geometry/fins.ts` — new exported cutoff constant, availability predicate and resolver directly under `QUAD_REAR_MODELS`; the fallback wired into `computeFinPlacement` at the one line that converts the spec's quad rear model into the inch core's input; the McKee Longboard shaper-facing note reworded from a preference to a requirement; deviation 7 added to the module's header documenting the new rule and why it lives at the millimetre boundary
- `lib/geometry/fins.test.ts` — new `describe` block pinning the rule on its own (cutoff constant, availability at 90in/95.9375in/96in/108in, resolution for all four quad rear models) and the fallback through the public engine (resolved numbers, `modelHeader`, `flags.isLongboardQuad`, `flags.quadCenterFinAvailable`, and the 5th/Center fin mark all following the model actually in force)
- `components/fins/fin-controls.tsx` — `PillButton` gained a `disabled` prop (native `disabled` attribute plus `cursor-not-allowed`/`opacity-40`, matching the rest of the app's disabled-control treatment); the Quad Model grid now drives each pill's highlight from the model actually in force and each pill's disabled state from the availability rule; a hint line appears under the grid when McKee Longboard is unavailable for the current board length
- `components/fins/fin-model-info.tsx` — the McKee Longboard reference-guide entry reworded to state the 8'0" requirement and name the McKee SB/Gun fallback

## Decisions Made

- Fallback model is McKee SB/Gun, the neighbouring McKee rear-pair model fitted across the shortboard/gun range a falling-back board now sits in — not the Basic - Spread model.
- The shaper's stored `quadRearModel` choice in the design store is never overwritten by the fallback. Only what's calculated and displayed changes; `DEFAULT_FIN_PLACEMENT_SPEC` and the onClick handler are untouched.
- The eight-foot comparison lives entirely in `lib/geometry/fins.ts` at the millimetre boundary in `computeFinPlacement`, not inside the private, statement-for-statement-ported inch core (`computeFinPlacementInches`) — keeping that core a faithful port with no new logic inside it.

## Deviations from Plan

None — plan executed exactly as written. Both tasks' `<action>` and `<behavior>` sections were followed as specified; no bugs, missing functionality, blocking issues, or architectural changes were encountered.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

The rule and its fallback are fully tested at the geometry layer (148/148 fin tests passing, including all 23 golden fixtures unmodified) and wired into the sidebar. `npm test`, `npm run lint`, and `npm run build` are all green.

**Human-check: done.** The plan's `<human-check>` was run in the browser after execution. On a 6'0" board the McKee Longboard pill is greyed with the reason line underneath and does not respond to a click; at exactly 8'0" it comes live and the hint disappears; picking it at 8'0" and shortening to 7'6" moves the highlight to McKee SB/Gun and switches the numbers off the longboard formulas (rear off-tail 7 15/16" to 6", spread 2 15/16" to 2 9/16"); relengthening to 8'6" brings the shaper's own McKee Longboard pick back, still selected, with its own numbers. Console clean. `D2` updated to `human_judgment: false` with the browser evidence recorded.

---
*Phase: quick-260826-njn*
*Completed: 2026-08-26*

## Self-Check: PASSED

All 4 modified source files and this SUMMARY.md exist on disk; all 3 task commits (`571bc64`, `2a855fc`, `bb86f57`) verified present in `git log`.
