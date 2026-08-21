---
phase: 01-foundation-port-deploy-the-design-tool
plan: 04
subsystem: ui
tags: [nextjs, react, svg, turbopack, vercel, presets]

requires:
  - phase: 01-01
    provides: "BOARD_PRESETS scaffold (4 board-type presets, Claude-drafted), applyPreset action"
  - phase: 01-02
    provides: "Preset card grid, hasBoardInProgress, replace-board confirmation"
  - phase: 01-03
    provides: "Live production deployment at https://shaper-coral.vercel.app, Git-integrated to main"
provides:
  - "BOARD_PRESETS: Mid-length and Longboard carry shaper-tuned OutlineSpec values, captured live and approved on production; Shortboard and Fish reviewed live and kept at their original drafted values by the shaper's own judgment"
  - "components/outline/outline-editor.tsx: development-only 'Copy preset values' affordance closing the D-03 tuning loop, gated out of the production bundle via an inline process.env.NODE_ENV check plus turbopackSourceMaps: false in next.config.ts"
  - "OutlineViewer hideFinMarks prop — per-consumer fin-mark suppression (outline editor screen only; fins and summary screens unaffected)"
  - "FinViewer position-callout vertical centering fix — offset now centers on the actual tier count present instead of assuming a fixed reference tier"
  - "First genuine confirmation that Vercel auto-deploys main on push (deferred from 01-03)"
affects: []

actuals:
  tokens: 3460
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Dev-only-affordance elimination must be checked against the compiled server chunk's source map, not just the .js itself — Turbopack's default .js.map still embedded a NODE_ENV-gated string that the .js correctly dead-code-eliminated; turbopackSourceMaps: false in next.config.ts closes that gap for any future dev-only block."
    - "Per-consumer boolean prop gate (hideFinMarks, following hideCallouts's established precedent) for suppressing one rendered element on exactly one screen without touching the shared drawing routine or any other consumer."
    - "A tier-stacking offset formula should center around the actual tier count present (maxLeftTier), not assume a fixed reference tier — a formula tuned for the multi-tier case silently misaligned the common single-tier case by a constant amount."

key-files:
  created: []
  modified:
    - components/outline/outline-editor.tsx
    - next.config.ts
    - components/outline/outline-viewer.tsx
    - lib/geometry/presets.ts
    - components/fins/fin-viewer.tsx

key-decisions:
  - "Disabled turbopackSourceMaps in next.config.ts after discovering the compiled server chunk's .js.map still embedded the dev-only affordance's label string, even though the .js itself correctly dropped it via dead-code elimination — the plan's own automated verify (zero matches under .next/) would not pass otherwise."
  - "hideFinMarks added as an additive OutlineViewer prop (same pattern as hideCallouts) rather than folding fin-mark suppression into an existing prop, so preset-card thumbnails and the summary dashboard keep drawing fin marks unchanged while the outline editor alone suppresses them during tuning."
  - "Only Mid-length and Longboard were captured through the 'Copy preset values' loop and written into BOARD_PRESETS. Shortboard and Fish were reviewed live in the outline editor and judged correct by the shaper as originally drafted — per the user's checkpoint report ('shortboard and fish both look good') they were deliberately left unchanged rather than re-captured or hand-edited."
  - "Fin-callout centering (components/fins/fin-viewer.tsx) was treated as an in-scope deviation, not a new todo: the misalignment's root cause (a ported prototype formula, `(tier - 1) * 20`, that implicitly assumed >=2 tiers were always present) was traced to one exact line via CDP-measured DOM coordinates, and the fix is a contained one-value threading change (maxLeftTier) with no broader rework of fin rendering — so it was fixed and committed directly rather than deferred."
  - "Part B of the Task 2 checkpoint (acceptance walkthrough) was narrowed, by explicit user/coordinator instruction, to the numbers-and-units dimension only ('numbers all look good' covers honest-numbers and units-everywhere). Steps 5-8 of the walkthrough (fin configuration switching, rail band recalculation, units across all five screens) were not re-confirmed step-by-step against the live production URL in this session — see Known Gaps below."

requirements-completed: [SETUP-01, OUTL-01, RAIL-01, FIN-01, FIN-02, FIN-03, VIZ-01, UNIT-01]

coverage:
  - id: D1
    description: "Development-only 'Copy preset values' affordance closes the D-03 tuning loop: visible under npm run dev, captures the live OutlineSpec as pasteable presets.ts source, and is absent from the production build (including the server chunk's source map)"
    requirement: OUTL-01
    verification:
      - kind: other
        ref: "grep -rl 'Copy preset values' .next/ (post next build) — 0 matches; curl https://shaper-coral.vercel.app/design/outline — 0 matches"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mid-length and Longboard BOARD_PRESETS entries carry the shaper's own tuned OutlineSpec values, captured verbatim from the live editor; all bounds/geometry-validity/round-trip assertions still hold"
    requirement: SETUP-01
    verification:
      - kind: unit
        ref: "lib/geometry/presets.test.ts — 21/21 pass against the tuned values"
        status: pass
      - kind: manual_procedural
        ref: "Task 2 checkpoint — user confirmed on https://shaper-coral.vercel.app: 'approved', tuned Mid-length and Longboard curves look right"
        status: pass
    human_judgment: true
    rationale: "Whether a tuned curve actually reads as a good Mid-length or Longboard is the shaper's own visual judgment, per this plan's own prohibition (judgment-tier) — bounds tests only prove the values are reachable, not that they are good."
  - id: D3
    description: "Shortboard and Fish reviewed live in the outline editor and approved as accurate without change, per the shaper's own judgment (not re-captured, not hand-edited)"
    requirement: SETUP-01
    verification:
      - kind: manual_procedural
        ref: "Task 2 checkpoint — user's exact report: 'shortboard and fish both look good'"
        status: pass
    human_judgment: true
    rationale: "Same as D2 — curve quality is a shaper's visual judgment call, not a derivable predicate."
  - id: D4
    description: "Fin placement marks suppressed on the outline editor (/design/outline) only; /design/fins and the Summary dashboard (/design/summary) continue drawing fin marks unchanged"
    requirement: VIZ-01
    verification:
      - kind: other
        ref: "curl SVG fin-mark circle pattern (r=3.5, fill=#1c1b19) on production: /design/outline = 0 matches, /design/fins = 6 matches, /design/summary = 12 matches (unchanged)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Fin position-callout labels center correctly on their dimension markers (maxLeftTier-based vertical offset, replacing the ported prototype's fixed-tier assumption)"
    requirement: FIN-03
    verification:
      - kind: manual_procedural
        ref: "Task 2 checkpoint follow-up — user confirmed on https://shaper-coral.vercel.app: fin callouts now center correctly on their markers"
        status: pass
    human_judgment: true
    rationale: "Visual label-to-marker alignment is a judgment call the user confirmed directly on the live deployment; the CDP coordinate measurements taken during the fix (single-tier case: 0px offset, was -20px) prove the underlying math improved, but 'centered well enough' is the user's own call, not a derivable pass/fail."
  - id: D6
    description: "All five Phase 1 ROADMAP acceptance criteria (real dimensions, live outline shaping, fin config switching with placement+marks, rail band calculations, units-everywhere with no dishonest placeholders) walked and confirmed against the live production URL"
    requirement: null
    verification: []
    human_judgment: true
    rationale: "Task 2's Part B was explicitly narrowed by the user/coordinator to the numbers-and-units dimension only ('numbers all look good'); the walkthrough's other steps (fin configuration switching, rail band recalculation display, units checked across all five screens individually) were not re-confirmed step-by-step against production in this session. See Known Gaps below — this is NOT claimed as fully proven and should route to human review rather than auto-pass."

duration: 20min
completed: 2026-08-21
status: complete
---

# Phase 1 Plan 4: Live Preset Tuning, Fin-Mark/Callout Fixes, and Ship Summary

**Mid-length and Longboard presets replaced with the shaper's own tuned curves (Shortboard/Fish kept as approved drafts), a dev-only "Copy preset values" capture loop closing D-03, and two checkpoint-driven fixes (outline-screen fin-mark suppression, fin-callout centering) — all live on production.**

## Performance

- **Duration:** ~20 min active work (commit-to-commit across three sessions: Task 1's initial implementation, then two checkpoint-feedback rounds; excludes time waiting on checkpoint responses)
- **Started:** 2026-08-19T23:06:48Z (Task 1 commit)
- **Completed:** 2026-08-21T16:05:54Z
- **Tasks:** 3 declared plan tasks, plus 2 checkpoint-feedback deviations (fin-mark suppression, fin-callout centering)
- **Files modified:** 5

## Accomplishments
- `components/outline/outline-editor.tsx` gained a development-only **Copy preset values** button that captures the live `OutlineSpec` as pasteable `lib/geometry/presets.ts` source (`inchesToMm()`/`degrees()` calls, correct `TailShape` variant fields) — closing CONTEXT.md's D-03 tuning loop with no persistence layer
- Discovered and fixed a real production-safety gap: Turbopack's server chunk `.js.map` still embedded the dev-only affordance's label string even though the compiled `.js` correctly dead-code-eliminated it — `turbopackSourceMaps: false` added to `next.config.ts` closes that leak
- `lib/geometry/presets.ts`: Mid-length and Longboard now carry the shaper's own tuned values, captured verbatim from the live editor and confirmed on production; Shortboard and Fish were reviewed live and kept unchanged by the shaper's own judgment; all 21 bounds/geometry-validity/round-trip tests in `presets.test.ts` still pass against the new values
- Checkpoint feedback: fin placement marks suppressed on the outline editor screen only (`hideFinMarks` prop on `OutlineViewer`, following the established `hideCallouts` pattern) — the fins screen and summary dashboard are unaffected
- Checkpoint feedback (deviation): fin position-callout labels now center correctly on their dimension markers — traced the ported prototype's `(tier - 1) * 20` vertical-offset formula to a single-tier misalignment (0px offset expected, -20px actual) via CDP-measured DOM coordinates, and fixed it to center around the actual tier count present
- Pushed to `main`; confirmed Vercel auto-deploy-on-push works for the first time (deferred from plan 03) — the tuned values (`64.5`, `53.5`) are present in the deployed JS bundle, fin-mark suppression and the dev-only affordance's absence both verified live on `https://shaper-coral.vercel.app`

## Task Commits

Each task was committed atomically:

1. **Task 1: Development-only "capture this outline as a preset" affordance** - `d67454c` (feat)
2. **Checkpoint fix (deviation): suppress fin marks on the outline editor screen** - `6a4004f` (fix)
3. **Task 3: Write the tuned presets (Mid-length, Longboard), re-verify bounds, ship** - `4185df1` (feat)
4. **Checkpoint fix (deviation): center fin position callouts on their dimension markers** - `abbde4f` (fix)
5. **Task 2: Tune the four presets live, then walk the phase acceptance criteria** - human checkpoint (two rounds), approved

**Plan metadata:** committed alongside this SUMMARY.md

## Files Created/Modified
- `components/outline/outline-editor.tsx` - development-only `Copy preset values` button + `buildPresetSource()`; also passes `hideFinMarks` to `OutlineViewer`
- `next.config.ts` - `experimental.turbopackSourceMaps: false`, so server-chunk source maps stop leaking the dev-only affordance's label text into the production build output
- `components/outline/outline-viewer.tsx` - additive `hideFinMarks` prop gating only the fin-mark SVG rendering, following the `hideCallouts` pattern
- `lib/geometry/presets.ts` - `midlength` and `longboard` `outline` objects replaced with the shaper's tuned values; head comment rewritten to record per-preset tuning status
- `components/fins/fin-viewer.tsx` - `maxLeftTier` threaded from `useSharedTierLayout` into `dimsForMark`'s vertical-offset calculation, centering the position callout on its own dimension line regardless of tier count

## Decisions Made
- `turbopackSourceMaps: false` added after the plan's own automated verify (zero matches for the affordance's label under `.next/`) failed against a compiled `.js.map` that still carried the source text — the `.js` itself was already correctly eliminated by dead-code elimination.
- `hideFinMarks` follows the exact `hideCallouts` precedent (additive optional prop, default `false`, gates only its own concern) rather than folding fin-mark suppression into `hideCallouts`, since the outline screen still wants dimension callouts, just not fin marks.
- Only Mid-length and Longboard were captured and tuned; Shortboard and Fish were reviewed live and kept at their original Claude-drafted values by the shaper's explicit approval ("shortboard and fish both look good") — not re-captured, not hand-edited.
- The fin-callout centering fix (`components/fins/fin-viewer.tsx`, outside this plan's declared `files_modified`) was fixed directly as a contained deviation rather than deferred: root cause was isolated to one formula via CDP-measured coordinates, and the fix is a single value (`maxLeftTier`) threaded through one call chain, with no broader fin-rendering rework required.
- Task 2's Part B acceptance walkthrough was narrowed, per explicit user/coordinator instruction, to the numbers-and-units dimension ("numbers all look good"). The remaining walkthrough steps (fin configuration switching, rail band recalculation display, units checked individually across all five screens) were not re-confirmed step-by-step against the live production URL in this session — see Known Gaps below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Turbopack server-chunk source map leaked the dev-only affordance's label text**
- **Found during:** Task 1's own automated verify (`grep -rl 'Copy preset values' .next/` after `next build`)
- **Issue:** The compiled `.js` correctly dead-code-eliminated the `process.env.NODE_ENV === "development"`-gated block, but the accompanying `.js.map` for the same server chunk still embedded the original source text verbatim, including the affordance's label string — failing the plan's own zero-matches verify requirement.
- **Fix:** Added `experimental.turbopackSourceMaps: false` to `next.config.ts`, disabling server-chunk source map generation for the production build entirely.
- **Files modified:** `next.config.ts`
- **Verification:** Re-ran `next build`; `grep -rl 'Copy preset values' .next/` returns 0 matches (previously 1, the `.js.map`); `npm run test`/`lint`/`build` all re-confirmed green.
- **Committed in:** `d67454c` (Task 1 commit)

**2. [Checkpoint feedback] Fin placement marks cluttered the outline editor while tuning**
- **Found during:** Task 2 checkpoint, first round — user's exact report: "Let's remove the fin marks on the outline page, just focus on outline."
- **Issue:** `OutlineViewer` drew calculated fin-mark lines/dots on `/design/outline` unconditionally whenever `finMarks` was passed, cluttering the view during preset tuning.
- **Fix:** Added an additive `hideFinMarks` prop to `OutlineViewer` (following the `hideCallouts` pattern), gating only the `finMarksSvg` rendering; `outline-editor.tsx` now passes it. `preset-card.tsx` thumbnails and `board-summary.tsx` (`/design/summary`) are unaffected.
- **Files modified:** `components/outline/outline-viewer.tsx`, `components/outline/outline-editor.tsx`
- **Verification:** Diffed the SVG fin-mark circle pattern via curl across `/design/outline` (0), `/design/fins` (6, unaffected — uses its own `FinViewer`), `/design/summary` (12, unaffected). Full test/lint/build re-run.
- **Committed in:** `6a4004f`

**3. [Checkpoint feedback, out-of-scope file] Fin position-callout labels not centered on their dimension markers**
- **Found during:** Task 2 checkpoint, second round — user's exact report: "Fin callouts can get centered better on their callout markers."
- **Issue:** `components/fins/fin-viewer.tsx` is not in this plan's declared `files_modified`. Root-caused via CDP-measured DOM coordinates against the running dev server: the ported prototype's vertical-offset formula `(tier - 1) * 20` assumed a label was always stacked among >=2 tiers, so the common single-tier case (e.g. Single Fin config) landed the position callout a full 20px off its own dimension line's true midpoint.
- **Fix:** Threaded the already-computed `maxLeftTier` value from `useSharedTierLayout` through to `dimsForMark`'s offset calculation, centering the offset around the actual tier count present instead of assuming a fixed reference tier.
- **Files modified:** `components/fins/fin-viewer.tsx`
- **Verification:** CDP-measured DOM coordinates before/after: Single Fin config landed exactly on the line's midpoint (0px offset, was -20px); Thruster's two-tier case became a symmetric +/-10px stagger (was an asymmetric -20/0px split, same anti-overlap spacing, better centered). Full test/lint/build re-run (no existing test coverage for this view-layer layout function). User confirmed the fix visually on production.
- **Committed in:** `abbde4f`

---

**Total deviations:** 3 (1 Rule 3 blocking fix, 2 checkpoint-feedback fixes — one in-scope, one in a file outside the plan's declared list but contained in root cause and blast radius)
**Impact on plan:** All three were necessary to make the plan's own stated behavior work as specified, or were directly requested by the user during the live tuning session. No unrelated scope creep.

## Issues Encountered
- Verifying "no dev-only affordance in production" required going one level deeper than the plan anticipated — checking the compiled server chunk's source map, not just its JS — see Deviation 1 above.
- Diagnosing the fin-callout centering issue required visual/coordinate inspection tooling not otherwise available in this environment; used headless Chrome (`--headless=new`, isolated `Chrome-headless` profile) driven via the native Node.js `WebSocket` client (Node 24) against the Chrome DevTools Protocol — no new npm dependency installed, consistent with the approach plan 01-01 used for its own layout debugging.

## User Setup Required

None - no external service configuration required.

## Known Gaps

- **Task 2 Part B was not walked step-by-step in full.** Per explicit user/coordinator instruction, Part B was narrowed to the numbers-and-units dimension only ("numbers all look good" — covers honest-numbers and units-everywhere). The walkthrough's other steps — fin configuration switching (single/thruster/quad/twin) with placement recalculation, rail band recalculation display, and units checked individually across TEMPLATE/RAILS/VOLUME/FINS/SUMMARY — were not re-confirmed step-by-step against the live production URL in this session. These paths are covered by existing `lib/geometry/` unit test suites (`fins.test.ts`, `rail-bands.test.ts`, `volume.test.ts`) and were exercised informally during the fin-callout fix's own manual testing (fin configuration switching, calculated position/angle numbers, dimension marks all observed rendering correctly), but a full deliberate walkthrough against production was not performed. Flagged in `coverage` (D6) as `human_judgment: true` with no `verification` entries, so a future verifier routes this to human review rather than auto-passing it.
- **Mobile/phone-width layout** (~<640px) remains open, deferred by the user during the 01-01 checkpoint — `.planning/todos/pending/2026-08-19-mobile-phone-width-layout-polish.md`. Untouched by this plan.

## Next Phase Readiness
- `BOARD_PRESETS` now carries real shaper-approved values for all four board types (two captured/tuned, two reviewed and approved as drafted) — the D-03 tuning loop is proven end-to-end and reusable for any future preset change.
- The "Copy preset values" capture affordance stays in the codebase as a permanent development-only tool, gated correctly out of production (including source maps) — any future preset tuning can reuse it without re-deriving the mechanism.
- `hideFinMarks` and the corrected fin-callout centering are both durable, reusable fixes — not scoped narrowly to this plan's session.
- Vercel auto-deploy-on-push is now genuinely confirmed working, closing the last open assumption from plan 03.
- Phase 1's five ROADMAP success criteria are confirmed on the numbers/units dimension; a full step-by-step re-walk of fin-config-switching, rail-band-recalculation, and per-screen units (Task 2 Part B, items 5-8) is recommended before or during Phase 1's milestone close, given it was not performed in full this session (see Known Gaps).

## Self-Check: PASSED

All 5 modified files (components/outline/outline-editor.tsx, next.config.ts,
components/outline/outline-viewer.tsx, lib/geometry/presets.ts,
components/fins/fin-viewer.tsx) plus this SUMMARY confirmed present on disk;
all 4 commit hashes (`d67454c`, `6a4004f`, `4185df1`, `abbde4f`) confirmed
present in `git log`.

---
*Phase: 01-foundation-port-deploy-the-design-tool*
*Completed: 2026-08-21*
