---
phase: 260829-vus
plan: 01
subsystem: ui
tags: [svg, print, rocker, callouts, order-form, viewer-frame, geometry]

# Dependency graph
requires:
  - phase: 260829-uue
    provides: "rocker-view-frame.ts's two-rail card layout (deck/bottom rails, showStationCards boolean) and rocker-viewer.tsx's card/readout split that this plan widened from a boolean into a three-mode stationRails/callouts contract"
provides:
  - "rocker-view-frame.ts: RockerStationRails ('full' | 'compact' | 'none'), compact band/row constants (COMPACT_VALUE_SIZE, COMPACT_DECK_BAND, COMPACT_BOTTOM_BAND, etc.), compactRows layout field, compactValueWidth, compactRailReadingXs (separation sweep), ORDER_FORM_ROCKER_BOX_PX, renderedUnitPx, compactValuePrintPx"
  - "rocker-viewer.tsx: callouts prop ('full' | 'compact' | 'none') replacing hideCallouts; CompactReading component; deck-envelope-based maxDeckIn for compact mode (threat T-VUS-01 mitigation)"
  - "order-form.tsx: ROCKER box now renders callouts=\"compact\" with a captionRight legend, five thickness readings above the board and four rocker readings below it"
affects: [summary, order-form, rocker-editor]

# Actuals (#2632)
actuals:
  tokens: 16947
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Compact/bare-value reading grammar (no card surface, no station name — position and side carry meaning) for print boxes too small for the card grammar, with a documented derivation of the printed box size and a separation sweep as the layout safety net"

key-files:
  created: []
  modified:
    - components/rocker/rocker-view-frame.ts
    - components/rocker/rocker-view-frame.test.ts
    - components/rocker/rocker-viewer.tsx
    - components/summary/order-form.tsx

key-decisions:
  - "showStationCards: boolean widened to stationRails: 'full' | 'compact' | 'none' in rocker-view-frame.ts, and hideCallouts: boolean widened the same way to callouts on RockerViewer, mechanically preserving old true/false behavior as 'full'/'none'"
  - "Compact mode reserves the LOADED board's own deck envelope (max of rockerLift+thickness across sampled stations) instead of the app-wide worst case, with a finite/positive fallback to the worst case for a corrupt saved design (threat T-VUS-01)"
  - "Compact readings are bare values (no CalloutChipFrame card, no station name) because the printed ROCKER box is 0.92in x 4.7in — too short for a card's two-row stack at 9pt; position (station) and side (deck=thickness, bottom=rocker) carry identity instead, reinforced by a new captionRight note on the box"
  - "compactRailReadingXs's three-pass separation sweep (push right, pull left, clamp first) is the safety net when natural station positions collide — proven against a synthetic wide frame in the stress test since four 300-unit readings cannot mathematically fit inside the real 900-unit frame without overlap"

patterns-established:
  - "Every band depth, row baseline, type size and reading x position for a new callout grammar lives in rocker-view-frame.ts and is unit-tested; the viewer component (rocker-viewer.tsx) derives none of it (Rule 1, extended to the third grammar)"

requirements-completed: [QT-260829-vus]

coverage:
  - id: D1
    description: "rocker-view-frame.ts decides the compact rails' complete geometry (bands, three row anchors, printed-width estimator, separation sweep, and a printed-size model pinning >=9pt for representative boards and >=8pt across the documented length/deck-envelope sweep)"
    requirement: "QT-260829-vus"
    verification:
      - kind: unit
        ref: "components/rocker/rocker-view-frame.test.ts — 17 new describe blocks under 'compact rails' / compactValueWidth / compactRailReadingXs"
        status: pass
    human_judgment: false
  - id: D2
    description: "rocker-viewer.tsx draws the three compact rows (5 thickness readings on the deck rail, 4 rocker readings split across two bottom rows) using only rocker-view-frame's exported geometry, with the /design/rocker editor path completely unaffected (no callouts prop passed there)"
    requirement: "QT-260829-vus"
    verification:
      - kind: unit
        ref: "npm test (1236 tests, full suite) — rocker-editor.tsx passes no callouts prop, compiles unchanged"
        status: pass
    human_judgment: true
    rationale: "Visual placement/legibility of the drawn readings on screen and in print can only be confirmed by opening the app — the executor cannot run npm run dev inside this worktree. The plan's own <post_merge_check> covers this."
  - id: D3
    description: "Summary order form's ROCKER box switched to callouts=\"compact\", gained a captionRight legend ('Thickness above, rocker below'), and its own flex share / box position on the sheet are unchanged"
    requirement: "QT-260829-vus"
    verification:
      - kind: unit
        ref: "npm test + npm run lint + npx tsc --noEmit (all clean) — grep confirms callouts=\"compact\" appears once as a JSX prop and .order-form-rocker's CSS block is untouched"
        status: pass
    human_judgment: true
    rationale: "The printed type size (the founder's own 9pt target / 8pt floor) is a derived, not measured, box model (ORDER_FORM_ROCKER_BOX_PX) — the executor cannot start the dev server or a print preview inside a worktree, so the founder's post-merge print check (carried below) is the only real verification of this number."

duration: ~30min
completed: 2026-08-30
status: complete
---

# Phase 260829-vus Plan 01: Summary order form ROCKER box gains its numbers back Summary

**Compact bare-value rail grammar for the printed ROCKER box: five thickness figures above the board, four rocker figures below (nose tip, nose @ 12", tail @ 12", tail tip), all sized and placed by a new, fully tested printed-size model in `rocker-view-frame.ts`.**

## Performance

- **Duration:** ~30 min (approximate — session start time was not recorded; the three task commits themselves span 22:49-23:28 local time)
- **Completed:** 2026-08-30T06:28:49Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- `rocker-view-frame.ts`'s `showStationCards: boolean` widened to `stationRails: "full" | "compact" | "none"` (`RockerStationRails`), with the old `true`/`false` behavior preserved byte-identically as `"full"`/`"none"` and pinned by the existing test suite's mechanical substitution.
- A complete compact-rail geometry model added to the same module: band constants (`COMPACT_VALUE_SIZE`, `COMPACT_DECK_BAND`, `COMPACT_BOTTOM_BAND`, etc.), three row anchors (`compactRows.deck` / `.bottomInner` / `.bottomOuter`), a printed-width estimator (`compactValueWidth`), a three-pass separation sweep (`compactRailReadingXs`) that keeps readings from overlapping, and a printed-size model (`ORDER_FORM_ROCKER_BOX_PX`, `renderedUnitPx`, `compactValuePrintPx`) — all derived from the order form's own on-page geometry and pinned by 17 new test suites (40 total in the file, all passing).
- `rocker-viewer.tsx` gained a `callouts` prop (`"full" | "compact" | "none"`, replacing `hideCallouts`) and a new `CompactReading` component that draws a bare value with a doglegged leader and a small 45-degree tick at the exact station it measures — no card surface, no station name. Compact mode also reserves only the loaded board's own deck envelope (not the app-wide worst case) so the profile stays as large as possible, with a corrupt-value fallback (threat T-VUS-01).
- `order-form.tsx`'s ROCKER box now renders `callouts="compact"` and carries a `captionRight="Thickness above, rocker below"` legend; the box's own size, position and flex share (`.order-form-rocker`'s 18%) are unchanged.
- Confirmed by reading (not assuming) that the print path needs no changes: `use-print-fit.ts` sizes sheets, not this box, and `order-form.css`'s `@media print` block already darkens `--outline-station-line` (the compact leaders' stroke) for paper; the tick and text colors (`--outline-dim-ink`, `--outline-ink`) already resolve to the sheet's own forced-Daylight ink in print, needing no separate override.

## Task Commits

Each task was committed atomically:

1. **Task 1: Decide the compact rails' geometry in the pure frame module** — `ca3e228` (feat)
2. **Task 2: Draw the compact readings in the rocker viewer** — `26c21b4` (feat)
3. **Task 3: Switch the order form's ROCKER box to the compact callouts** — `58767c6` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `components/rocker/rocker-view-frame.ts` — added `RockerStationRails`, compact band/row constants, `compactRows`, `compactValueWidth`, `compactRailReadingXs`, `ORDER_FORM_ROCKER_BOX_PX`, `renderedUnitPx`, `compactValuePrintPx`; widened `showStationCards` to `stationRails`
- `components/rocker/rocker-view-frame.test.ts` — mechanical `showStationCards`→`stationRails` substitution across the existing suite, plus 17 new describe blocks covering compact frame geometry, row bands, printed type size, `compactValueWidth`, and `compactRailReadingXs`
- `components/rocker/rocker-viewer.tsx` — `hideCallouts` widened to `callouts`; added `CompactReading`; reordered sampling so the deck envelope can be derived before the layout; three cleanly-separated render branches (full/compact/none)
- `components/summary/order-form.tsx` — ROCKER `FormBox` now passes `callouts="compact"` and a `captionRight` legend; module header prose and the box's own comment rewritten to describe the new grammar

## Decisions Made

See `key-decisions` in the frontmatter above — summarized: the boolean-to-union widening was mechanical and byte-identical for the two existing modes; compact mode reserves the loaded board's own deck envelope (not the worst case) with a corrupt-value fallback; readings are bare values (no card, no name) because the printed box is too short for the card grammar at 9pt; the separation sweep is the safety net for any real or synthetic over-subscription.

## Deviations from Plan

None — plan executed exactly as written across all three tasks. The one thing worth flagging as expected, not a deviation: between Task 2's commit and Task 3's commit, `npx tsc --noEmit` reported one non-phantom error in `order-form.tsx` (still calling the old `hideCallouts` prop) — this is the same kind of intra-plan, cross-task type gap the plan's own Task 1 action text calls out ("the viewer still calling the old field name failing to type-check until Task 2"). It resolved the moment Task 3 landed; the final `tsc --noEmit` run (after all three commits) reports zero non-phantom errors.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Post-Merge Check (founder, from the main checkout)

The executor cannot start the dev server or a print preview inside a worktree, so the printed type size — the number this whole plan is built around — can only be confirmed here. Carried forward verbatim from the plan's `<post_merge_check>`:

1. `npm run dev`, then open http://localhost:3000/design/summary.
2. The ROCKER box: five numbers above the board, four below it, and nothing below the middle of the board (the centre rocker reading is zero by construction and deliberately absent). The caption reads `ROCKER` with `Thickness above, rocker below` opposite it. Nothing is clipped by the box, and no two numbers touch.
3. Load or dial a 5'0" board, a 6'6" board and a 10'0" board in turn and re-check the box at each. The 10'0" board is the tight case: nose tip and nose @ 12" are only a tenth of the board apart, and they should sit on separate rows below the board with clear space between every number on a row.
4. Print preview (Cmd-P) both pages. Still exactly two pages, same layout, same box position. **Measure the printed numbers**: they should read about 9pt — roughly 1/8in cap height on paper — and must never look smaller than about 8pt. If they measure smaller, the box model in `rocker-view-frame.ts`'s `ORDER_FORM_ROCKER_BOX_PX` is off, and that one constant is where to correct it.
5. Print preview in a dark theme (Slate or Phosphor) too — the sheet must still print white with the callouts in the sheet's ink.
6. Open http://localhost:3000/design/rocker and confirm the editor screen is completely unchanged: the same two card rails, rotate button, construction lines and drag behaviour.

## Next Phase Readiness

- Nothing blocks continued work. This was a self-contained quick task; the compact grammar it introduced in `rocker-view-frame.ts` is generic enough to reuse anywhere else a bare-value rail is needed against a fixed printed size.
- Pending todo `2026-08-22-summary-print-after-callout-system.md` (verify and refit the Summary print sheet after the callout-system rebuild) remains open and is a natural place to fold in the founder's post-merge check above once performed.

---
*Phase: 260829-vus*
*Completed: 2026-08-30*

## Self-Check: PASSED

All four modified source files and this SUMMARY.md were confirmed present on disk; all three task commit hashes (`ca3e228`, `26c21b4`, `58767c6`) were confirmed present in `git log`.
