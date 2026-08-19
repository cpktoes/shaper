---
phase: 01-foundation-port-deploy-the-design-tool
plan: 01
subsystem: ui
tags: [nextjs, react, tailwind, client-state, flexbox, vitest]

requires: []
provides:
  - "lib/geometry/presets.ts: BOARD_PRESETS, 4 tested board-type presets (dims + outline character)"
  - "applyPreset action on the shared design store"
  - "/ as the setup screen (D-05), replacing the redirect to /design/outline"
  - "One DesignProvider + SiteNav instance shared by / and every /design/* screen"
  - "Viewport-height-correct layout across all five design screens (sidebar scrolls, viewer fits, no page-level scroll)"
affects: [01-02, 01-03, 01-04]

actuals:
  tokens: 5840
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Preset-as-complete-spec: BoardPreset carries a whole OutlineSpec, applied via a single setState replacing the outline wholesale (not a Partial patch) — models updateOutline's shape but for a full-spec overwrite."
    - "flex-nowrap + explicit h-full for aside/main two-column screens: flex-wrap defeats align-items:stretch's single-line container-height distribution even when only one line results, so every aside+main shell needs flex-nowrap (or an explicit height) rather than flex-wrap to stay bounded."
    - "body clamped to h-full + overflow-hidden (not min-h-full) so viewport height is a hard ceiling; per-panel overflow-y-auto opts in to its own scroll region instead of the whole page scrolling."

key-files:
  created:
    - lib/geometry/presets.ts
    - lib/geometry/presets.test.ts
    - components/setup/setup-screen.tsx
  modified:
    - components/design/design-store.tsx
    - app/layout.tsx
    - app/design/layout.tsx
    - app/page.tsx
    - components/site-nav.tsx
    - app/design/summary/summary.css
    - components/outline/outline-editor.tsx
    - components/rails/rail-band-editor.tsx
    - components/fins/fin-placement-editor.tsx
    - components/volume/volume-estimator.tsx

key-decisions:
  - "DesignProvider and SiteNav promoted to app/layout.tsx (not just SiteNav as UI-SPEC literally said) so / and /design/* share one board-state instance across client-side navigation."
  - "SHAPER wordmark made a real Link to / (D-06) during checkpoint fixes — without it there was no client-side path home, forcing full-page reloads that always drop in-memory state and masquerading as a persistence bug."
  - "body uses h-full + overflow-hidden instead of min-h-full, and every aside+main design-screen shell uses flex-nowrap + explicit h-full instead of flex-wrap, so panels are viewport-bounded with per-panel scroll rather than page-level scroll or silent cropping."
  - "Mobile/phone-width layout (cards overlapping the sidebar below ~640px) explicitly deferred by the user to a later phase — logged as a todo, not fixed here."

patterns-established:
  - "Board-type presets are pure data in lib/geometry/, same tier as board.ts's DEFAULT_BOARD_SPEC/TAIL_PRESETS, authored exclusively through inchesToMm()/degrees() and bounds-tested against the editor's own slider ranges."
  - "Root-layout-mounted client providers for state shared across sibling top-level routes (not just parent/child layouts)."

requirements-completed: [SETUP-01, OUTL-01, UNIT-01]

coverage:
  - id: D1
    description: "BOARD_PRESETS: 4 board-type presets (Shortboard/Fish/Mid-length/Longboard), each a complete, bounds-valid OutlineSpec"
    requirement: SETUP-01
    verification:
      - kind: unit
        ref: "lib/geometry/presets.test.ts#BOARD_PRESETS > has exactly 4 entries with the four unique board-type ids"
        status: pass
      - kind: unit
        ref: "lib/geometry/presets.test.ts#BOARD_PRESETS > every OutlineSpec field lies inside its OutlineControls slider range"
        status: pass
      - kind: unit
        ref: "lib/geometry/presets.test.ts#BOARD_PRESETS > tail-shape fields lie inside their own slider ranges"
        status: pass
      - kind: unit
        ref: "lib/geometry/presets.test.ts#BOARD_PRESETS > length/widePointWidth/widePointOffset round-trip inchesToMm to within 1e-9in"
        status: pass
    human_judgment: false
  - id: D2
    description: "/ is the setup screen; clicking a preset applies it and navigates to /design/outline with the curve already drawn"
    requirement: SETUP-01
    verification:
      - kind: manual_procedural
        ref: "Task 3 checkpoint — steps 1-3, user-verified in browser"
        status: pass
    human_judgment: true
    rationale: "Client-side navigation + shared-store visibility is a real end-to-end UI flow; no e2e framework exists this phase (RESEARCH.md Wave 0 gap), so this can only be proven by human walkthrough."
  - id: D3
    description: "One DesignProvider instance serves / and every /design/* screen — edits survive navigation between them"
    requirement: OUTL-01
    verification:
      - kind: manual_procedural
        ref: "Task 3 checkpoint — step 3 (edit a slider, navigate away and back via nav tabs and the SHAPER wordmark, value persists)"
        status: pass
    human_judgment: true
    rationale: "Provider-instance identity across client-side navigation is only observable by driving the real app; grep-based checks (provider count = 1 in each layout file) are the automated proxy but the behavior itself needed a human confirmation."
  - id: D4
    description: "Every design screen fills the viewport height correctly: sidebar scrolls independently, viewer fits without cropping, no page-level scroll"
    requirement: UNIT-01
    verification:
      - kind: manual_procedural
        ref: "Task 3 checkpoint — step 4, plus two prior checkpoint-feedback rounds fixed and re-verified by the user in-browser"
        status: pass
    human_judgment: true
    rationale: "Layout/scroll behavior at real viewport sizes is inherently a visual judgment call; verified here via headless-Chrome CDP measurement during fixing, then confirmed by the user's own browser at their own window size."

duration: 91min
completed: 2026-08-19
status: complete
---

# Phase 1 Plan 1: End-to-End Preset-to-Editor Tracer Summary

**Preset-driven setup screen wired end-to-end into a single shared board-state provider, with two real layout bugs found and fixed along the way: no client-side path home, and every design screen silently cropping/failing to scroll instead of respecting the viewport.**

## Performance

- **Duration:** 91 min (commit-to-commit; excludes time waiting on checkpoint responses)
- **Started:** 2026-08-19T20:12:14Z
- **Completed:** 2026-08-19T21:43:42Z
- **Tasks:** 3 (tracer, test coverage, human checkpoint)
- **Files modified:** 13

## Accomplishments
- Four board-type presets (`lib/geometry/presets.ts`) as pure, bounds-tested data — Shortboard, Fish, Mid-length, Longboard — each a complete `OutlineSpec` authored through `inchesToMm()`/`degrees()`
- `/` is now the real setup screen (D-05): pick a preset, land straight in the outline editor with that preset's curve already drawn
- One `DesignProvider` + `SiteNav` instance promoted to the root layout, so `/` and every `/design/*` screen share the same live board across client-side navigation
- Fixed two real bugs surfaced by checkpoint review: the SHAPER wordmark had no link home (forcing state-losing full reloads), and every design screen's sidebar/viewer silently overflowed the viewport instead of respecting it (`flex-wrap` was defeating `align-items: stretch`'s height distribution)
- `lib/geometry/presets.test.ts`: 21 new tests — roster identity, geometry validity, slider-range bounds, tail-variant bounds, units round-trip, non-empty copy — all with teeth (verified a widened value fails the suite)

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "pick a board type and shape it" — one path, every layer (tracer)** - `5d68370` (feat)
2. **Checkpoint fix: SHAPER wordmark links home, clamp body height so only panels scroll** - `eb28764` (fix)
3. **Checkpoint fix: sidebar/viewer columns now respect available viewport height** - `06cd6e4` (fix)
4. **Task 2: Pin the preset roster with Vitest bounds and round-trip coverage** - `ae9a2f6` (test)
5. **Task 3: Confirm the preset-to-editor path and the promoted layout** - human checkpoint, approved (no code commit — verification only)

**Plan metadata:** committed alongside this SUMMARY.md

## Files Created/Modified
- `lib/geometry/presets.ts` - `BoardPreset` type + `BOARD_PRESETS` (4 entries), pure data
- `lib/geometry/presets.test.ts` - 21 tests: roster, geometry validity, bounds, tail variants, units round-trip
- `components/setup/setup-screen.tsx` - the setup screen's client component; deliberately unstyled (plan 02 builds the real UI)
- `components/design/design-store.tsx` - added `applyPreset` action
- `app/layout.tsx` - promoted `DesignProvider`/`SiteNav`; body clamped to `h-full overflow-hidden`
- `app/design/layout.tsx` - reduced to the height-passthrough wrapper only
- `app/page.tsx` - replaced `redirect()` with `<SetupScreen />`
- `components/site-nav.tsx` - SHAPER wordmark is now `<Link href="/">`
- `app/design/summary/summary.css` - print path releases the new body height/overflow clamp
- `components/outline/outline-editor.tsx`, `components/rails/rail-band-editor.tsx`, `components/fins/fin-placement-editor.tsx`, `components/volume/volume-estimator.tsx` - aside+main shell switched from `flex-wrap` to `flex-nowrap` + explicit `h-full`

## Decisions Made
- Promoted both `DesignProvider` and `SiteNav` to the root layout (RESEARCH.md's primary recommendation), not just the nav as UI-SPEC's literal text said — required for `/` and `/design/*` to share one board instance.
- SHAPER wordmark made a real `Link` to `/` (D-06) — discovered missing during checkpoint review; without it there was no way to trigger a genuine client-side "go home" navigation, so the only way home was a URL-bar reload that always drops in-memory state (by design, no persistence until Phase 2), which looked exactly like a state-persistence bug.
- `body` uses `h-full overflow-hidden` (not `min-h-full`) and every aside+main design-screen shell uses `flex-nowrap` + explicit `h-full` (not `flex-wrap`) — `flex-wrap` was silently defeating `align-items: stretch`'s "single line stretches to the container's own definite height" behavior, so panels were sizing to their own content instead of the available space. Confirmed via a real headless-Chrome DevTools Protocol measurement session, not by inspection alone.
- Mobile/phone-width layout (cards overlapping the sidebar below ~640px, surfaced in the Task 3 checkpoint) explicitly deferred by the user to a later phase — logged as `.planning/todos/pending/2026-08-19-mobile-phone-width-layout-polish.md`, not fixed in this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SHAPER wordmark had no link back to `/`**
- **Found during:** Task 1 checkpoint re-verification (user report: board "resets" when navigating home and back)
- **Issue:** `components/site-nav.tsx` rendered "SHAPER" as a plain `<span>`, not a link. The only way to reach `/` from `/design/*` was editing the URL bar — a full page reload that always drops in-memory state (no persistence yet), which presented as a broken one-provider-instance assumption.
- **Fix:** Wordmark is now `<Link href="/">` per CONTEXT.md D-06 (already an approved decision, just not yet implemented in this plan's file list).
- **Files modified:** `components/site-nav.tsx`
- **Verification:** Re-ran full test/lint/build; confirmed via curl that the rendered `<a href="/">` exists; user re-verified in browser.
- **Committed in:** `eb28764`

**2. [Rule 1 - Bug] `body` used `min-h-full`, letting the whole page scroll instead of individual panels**
- **Found during:** Task 1 checkpoint re-verification (user report: control panel drives page height instead of scrolling independently)
- **Issue:** `min-h-full` is a minimum only — any screen's sidebar content taller than the viewport grew `body` past 100vh, so the whole page scrolled instead of the `overflow-y-auto` panels every screen already had.
- **Fix:** `body` now uses `h-full overflow-hidden`, clamped exactly to the viewport. `app/design/summary/summary.css`'s print block explicitly releases this clamp so printing/`useSummaryPrintFit` aren't affected.
- **Files modified:** `app/layout.tsx`, `app/design/summary/summary.css`
- **Verification:** Full test/lint/build re-run; rendered `<body>` class confirmed via curl.
- **Committed in:** `eb28764`

**3. [Rule 1 - Bug] `flex-wrap` on every aside+main shell defeated stretch-based height distribution**
- **Found during:** Second checkpoint re-verification round (user report: sidebar still doesn't scroll, viewer is cropped, "make sure to account for the nav bar too" — on all four two-column design screens)
- **Issue:** The row wrapping `aside`+`main` used `flex-wrap`, which computes each flex line's cross-size from its items' own content rather than the container's definite height — even when only one line results. `aside`/`main` were sizing to content (846px) instead of their real 518px share, so the sidebar's `overflow-y-auto` never had anything to scroll (its box had already grown to fit) and the viewer overflowed past its card, both silently clipped only by `body`'s own `overflow-hidden` with no scrollbar anywhere.
- **Fix:** Switched to `flex-nowrap` (both columns already handle narrow widths via `flex-1`/`min-w`) and gave both columns an explicit `h-full`. Applied identically across all four screens sharing this shell.
- **Files modified:** `components/outline/outline-editor.tsx`, `components/rails/rail-band-editor.tsx`, `components/fins/fin-placement-editor.tsx`, `components/volume/volume-estimator.tsx`
- **Verification:** Diagnosed and confirmed via a live headless-Chrome DevTools Protocol session (`getBoundingClientRect`/`scrollHeight`/`clientHeight` measurements) at a constrained 1366×650 viewport across all 6 routes, before and after the fix; screenshotted at 650px and 900px window heights; full test/lint/build re-run; user re-verified in browser.
- **Committed in:** `06cd6e4`

---

**Total deviations:** 3 auto-fixed (all Rule 1 — bugs found during checkpoint review, not scope creep)
**Impact on plan:** All three were genuine layout/navigation bugs blocking the plan's own `must_haves` (one-provider-instance visibility, viewport-fill). None expanded scope beyond making the tracer's stated behavior actually work as specified.

## Issues Encountered
- No `mcp__computer-use__*`/browser-automation tools were available in this execution context to visually inspect the reported layout bug directly. Worked around this by driving a local headless Chrome instance (`--headless --screenshot` for visual confirmation, plus a hand-rolled Chrome DevTools Protocol client using only Node built-ins — no new npm dependency installed) to get ground-truth `getBoundingClientRect`/`scrollHeight`/`clientHeight` measurements rather than reasoning about the CSS blind. This is how the true root cause (`flex-wrap` defeating `stretch`) was found on the second re-verification round, after a first fix (`min-h-0` additions) that looked plausible but measured as a no-op.

## User Setup Required

None - no external service configuration required.

## Known Deferred Items

- **Mobile/phone-width layout** (~<640px): the top nav degrades acceptably (shrinks to its own minimum width and stops), but the aside+main design-screen shell has no responsive breakpoint yet — sidebar and viewer overlap at phone widths. User explicitly deferred this to a later phase during the Task 3 checkpoint. Logged as `.planning/todos/pending/2026-08-19-mobile-phone-width-layout-polish.md`.
- **Preset numeric values are Claude-drafted placeholders** (per CONTEXT.md D-03, RESEARCH.md assumption A1) — bounds-correct but not yet shaper-tuned. Plan 04's live-tuning pass replaces them.
- FIN-01/02/03 and VIZ-01 edge coverage remain `unclassified`/unresolved per this plan's `planner_assumptions` — carried forward to plan 04 as an explicit human-verified walkthrough, not covered by this plan's `must_haves`.

## Next Phase Readiness
- The preset → store → geometry → render path is proven end-to-end and production-quality, not a throwaway — plan 02 can build the real UI-SPEC card layout directly on top of `components/setup/setup-screen.tsx` without redoing the wiring.
- One shared `DesignProvider` instance is confirmed correct across all routes; no remaining architectural risk on that assumption.
- Viewport-height layout is now correct and verified across all five design screens at both constrained and comfortable window sizes — a solid foundation for plan 02's UI work.
- No blockers for plan 02.

## Self-Check: PASSED

All 13 code files (3 created, 10 modified) plus the deferred-item todo and this SUMMARY confirmed
present on disk; all 4 task-commit hashes (`5d68370`, `eb28764`, `06cd6e4`, `ae9a2f6`) confirmed
present in `git log`.

---
*Phase: 01-foundation-port-deploy-the-design-tool*
*Completed: 2026-08-19*
