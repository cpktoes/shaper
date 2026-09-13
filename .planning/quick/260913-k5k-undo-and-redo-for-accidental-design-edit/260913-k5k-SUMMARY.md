---
phase: quick-260913-k5k
plan: 01
subsystem: ui
tags: [undo-redo, react, playwright, design-store, keyboard-shortcuts]

requires:
  - phase: 10-the-whole-app-on-a-phone
    provides: "the phone shell, the max-shell: breakpoint, PhoneTabBar/PhoneTopBar's hidden max-shell:flex mount idiom, the data-print-hide convention"
provides:
  - "lib/design-history.ts: a pure, React-free undo/redo module (stacks, 500ms coalescing window, 50-step cap, keyboard-shortcut decision, typed-field guard), fully tested with controlled timestamps"
  - "components/design/design-store.tsx wired so every design mutator files a coalescing key before its own setState, one effect records the resulting edit after commit, and Cmd/Ctrl+Z / Shift+Cmd/Ctrl+Z step the shared board state back and forward"
  - "components/design/phone-undo-bar.tsx: a floating pair of 44px round arrow buttons above the phone tab bar, present only once there is something to undo or redo"
  - "e2e/undo-redo.spec.ts: browser proof on desktop and iPhone, plus a re-run of the five desktop-baseline screenshots showing nothing moved for a mouse"
affects: [design-store, phone-chrome, e2e-suite]

actuals:
  tokens: 15400
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "A session-only undo/redo history lives beside a React store the same way lib/models/autosave.ts's decision module lives beside the autosave effect: pure stacks and pure decisions in lib/, a thin ref-plus-effect wiring layer in the component that owns the state — never a push inside a setState updater, because updaters must stay pure and StrictMode runs them twice."
    - "A history-recording effect that reruns on a memoized snapshot's identity must also compare the snapshot's VALUES, not just its object reference, before deciding whether an edit really happened — a spread like { ...prev.x, ...patch } always produces a new object even when patch carries no real change, and a naive identity-only check would file a phantom step for a no-op interaction (discovered here via a typed field's commit-on-blur)."

key-files:
  created:
    - lib/design-history.ts
    - lib/design-history.test.ts
    - components/design/phone-undo-bar.tsx
    - components/design/phone-undo-bar.test.ts
    - e2e/undo-redo.spec.ts
  modified:
    - components/design/design-store.tsx
    - app/design/layout.tsx

key-decisions:
  - "boardName is structurally excluded from the undo snapshot (Omit<DesignSnapshotFields, \"boardName\">) rather than guarded as a special case — a typed board name can never record a step because the memo simply never looks at it, so the browser's own text-undo always owns that field."
  - "The history-recording effect skips a blur-commit that produces no real value change (deep-equality check added after Task 2's own commit, once Task 3's browser test exposed it) — a shaper who taps into a typed field and taps back out without changing anything must not spend a real undo step doing nothing visible."
  - "No desktop gear-menu entry for undo/redo, per the plan's own judgement call: SettingsMenuContent is a shared preferences popup (Units, Theme), not an actions menu, and Cmd+Z is already the most universally known shortcut on a computer. Flagged here for the founder if a later pass wants it visible."

requirements-completed: [QT-260913-k5k]

coverage:
  - id: D1
    description: "A shaper can take back the last thing they did to any of the five design screens with Cmd/Ctrl+Z, and put it back with Shift+Cmd/Ctrl+Z, on a computer."
    requirement: QT-260913-k5k
    verification:
      - kind: unit
        ref: "lib/design-history.test.ts (20 cases: stacks, redo-thrown-away-by-a-new-edit, coalescing, the cap, the keyboard shortcut, the typed-field guard)"
        status: pass
      - kind: e2e
        ref: "e2e/undo-redo.spec.ts#desktop: one drag is one step back, and redo puts it forward again"
        status: pass
    human_judgment: false
  - id: D2
    description: "One drag or one slider sweep collapses into a single undo step, not one step per pointer move."
    requirement: QT-260913-k5k
    verification:
      - kind: unit
        ref: "lib/design-history.test.ts (coalescing describe block, including the 50-edits-10ms-apart case)"
        status: pass
      - kind: e2e
        ref: "e2e/undo-redo.spec.ts#desktop: one drag is one step back, and redo puts it forward again"
        status: pass
    human_judgment: false
  - id: D3
    description: "Cmd/Ctrl+Z inside a typed measurement box is left to the browser's own text undo; the shortcut still works immediately after a slider move (the case a naive any-input-focused guard would break)."
    requirement: QT-260913-k5k
    verification:
      - kind: unit
        ref: "lib/design-history.test.ts (isTextEntryTarget describe block)"
        status: pass
      - kind: e2e
        ref: "e2e/undo-redo.spec.ts#desktop: typing in a measurement box is left to the browser, and the shortcut still reaches the board once focus leaves it"
        status: pass
      - kind: e2e
        ref: "e2e/undo-redo.spec.ts#desktop: the shortcut still works right after a slider move"
        status: pass
    human_judgment: false
  - id: D4
    description: "A phone shows a pair of 44px round arrow buttons above the tab bar once there is something to take back, and nothing before that."
    requirement: QT-260913-k5k
    verification:
      - kind: unit
        ref: "components/design/phone-undo-bar.test.ts (5 source-contract cases)"
        status: pass
      - kind: e2e
        ref: "e2e/undo-redo.spec.ts#iphone: the on-screen undo/redo control appears once there is something to take back"
        status: pass
    human_judgment: false
  - id: D5
    description: "Nothing changes for a mouse at desktop width — the five desktop screenshot baselines pass untouched and unregenerated."
    verification:
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts (TEMPLATE, ROCKER, RAILS, VOLUME, FINS — all five, desktop project)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Opening a different preset or a saved board clears the undo history — Cmd+Z can never drag a piece of the board just closed into the board just opened."
    requirement: QT-260913-k5k
    verification: []
    human_judgment: true
    rationale: "Proven by code inspection (applyPreset/applyModel both reset pendingEditKeyRef and call setHistory(emptyHistory()) beside their existing state replacement) and by the plan's own must_have, but not exercised by an automated test in this task — a human check on a real screen (switch presets, confirm Cmd+Z does nothing) is recorded under Human Verification below."

duration: 45min
completed: 2026-09-13
status: complete
---

# Quick Task 260913-k5k: Undo and Redo for Accidental Design Edits Summary

**Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z now step a board's outline, rocker, foil, rails, fins and volume back and forward one movement at a time, with a matching pair of round arrow buttons on a phone — all session-only, all provably one-step-per-drag, and provably invisible to a mouse at desktop width.**

## Performance

- **Duration:** 45 min (approx.)
- **Started:** 2026-09-13T14:43:58-07:00
- **Completed:** 2026-09-13T15:22:55-07:00 (plus this summary)
- **Tasks:** 3 completed (Task 3 executed directly per orchestrator ruling, not deferred as a checkpoint)
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments

- **`lib/design-history.ts`** — a pure, React-free module with no imports at all: `DesignHistory<T>`'s past/future stacks, `emptyHistory`, `recordEdit` (the 500ms `COALESCE_WINDOW_MS` coalescing rule and the 50-entry `HISTORY_LIMIT` cap), `undo`/`redo`/`canUndo`/`canRedo`, `undoShortcut` (reads a plain keyboard-event shape into `"undo" | "redo" | null`), and `isTextEntryTarget` (the guard that blocks a text box but never a slider's own `<input type="range">`). Written test-first: `lib/design-history.test.ts`'s 20 cases were all committed failing before the module existed, then all made to pass.
- **`components/design/design-store.tsx`** wired so every design-mutating action — `updateOutline`, `updateRocker`, `updateFoil`, `updateRailSection`, `updateFins`, `updateVolume`, and every discrete toggle (`toggleTailHardEdge`, `setFinsImportTemplate`, `toggleRailsImportFoilThickness`, `setFinSystem`, `toggleImportTemplateDimensions`, `toggleImportRailThickness`) — files a coalescing key in a ref before its own `setState`, and one `useEffect` keyed on a nine-field `historySnapshot` (the ten-field `DesignSnapshotFields` minus `boardName`) records the edit after it actually commits. `applyPreset`/`applyModel` clear the history alongside their existing state replacement. `undoEdit`/`redoEdit` spread exactly those nine fields back into state — `modelId`, `saveStatus` and `boardName` are never touched — and mark the board dirty, so the existing autosave effect persists an undone board exactly like any other edit. A `window` `keydown` listener reads `undoShortcut`, defers entirely to the browser when `isTextEntryTarget` says the focused element is a text box, and calls `undoEdit`/`redoEdit` otherwise.
- **`components/design/phone-undo-bar.tsx`** — a small floating pair of 44px round buttons (Undo2Icon/Redo2Icon), `pointer-events-none` on the wrapper so the gap around them passes a tap through, `data-print-hide` so it never reaches a printed page, mounted with the same `hidden max-shell:flex` width switch `PhoneTabBar`/`PhoneTopBar` already use. Returns `null` until there is something to undo or redo, so a freshly loaded screen is untouched. Mounted in `app/design/layout.tsx` immediately before `PhoneTabBar`.
- **A real bug found and fixed mid-task** (see Deviations below): a typed measurement field's blur-commit was quietly filing a phantom undo step even when nothing visible changed, because the recording effect only checked object identity. Fixed with a value-level (JSON) comparison alongside the identity check.
- **`e2e/undo-redo.spec.ts`** — four browser cases run from this worktree (Task 3's own ruling: a worktree CAN run Playwright with `IS_WEBPACK_TEST=1` to select webpack over Turbopack): a real mouse drag undone and redone in one press each; a typed Board Length field keeping the shortcut to itself while focused and releasing it once focus moves elsewhere; the shortcut still working immediately after a slider move; and the iPhone project's on-screen control appearing only once there is something to undo, both buttons measuring 44×44.

## Task Commits

Each task was committed atomically:

1. **Task 1a (RED): failing tests for the undo/redo rules** - `342beaa` (test)
2. **Task 1b (GREEN): the pure undo/redo module** - `2776145` (feat)
3. **Task 2: wire history into the store, add the phone control** - `22cee39` (feat)
4. **Fix (found during Task 3's browser proof): stop a text field's blur from spending a phantom undo step** - `23e75c9` (fix)
5. **Task 3: the browser proof — desktop, iPhone, and the desktop baselines untouched** - `b58fa13` (test)

## Files Created/Modified

- `lib/design-history.ts` - the pure undo/redo rules: stacks, coalescing, the cap, the keyboard decision, the typed-field guard.
- `lib/design-history.test.ts` - 20 Vitest cases with controlled timestamps, driving every branch.
- `components/design/design-store.tsx` - history state, the recording effect, `noteEdit`/`patchKey` helpers, `undoEdit`/`redoEdit`, the keyboard listener, and the deep-equality fix to the recording effect's skip condition.
- `components/design/phone-undo-bar.tsx` - the floating phone control.
- `components/design/phone-undo-bar.test.ts` - 5 source-contract cases (hidden/max-shell:flex, pointer-events-none/auto, data-print-hide, coarse:size-11 x2, the early return null).
- `app/design/layout.tsx` - mounts `<PhoneUndoBar />` immediately before `<PhoneTabBar />`; doc comment extended to name it as a sixth job.
- `e2e/undo-redo.spec.ts` - the browser proof, four cases across the desktop and iphone projects.

## Decisions Made

- `boardName` is structurally excluded from the undo snapshot — the memo simply never lists it, so a typed name can never record a step by construction, not by a separate guard that could drift.
- Discrete toggles (hard-edge, import-template flags, fin system) all record with a `null` coalescing key, so two flips of the same switch are always two undo steps, never folded into one the way a drag is.
- No desktop gear-menu entry for undo/redo, per the plan's own flagged judgement call — `SettingsMenuContent` is a shared preferences popup, not an actions menu, and Cmd+Z needs no extra discoverability on a computer.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A text field's blur was spending a phantom undo step on a no-op edit**
- **Found during:** Task 3, while writing and running the "typing in a measurement box" browser case
- **Issue:** `MeasureField`'s `onBlur` always re-commits its raw text on parse success, regardless of whether the parsed value actually differs from the current one — and `design-store.tsx`'s recording effect only compared the memoized `historySnapshot` object by REFERENCE, which changes on every mutator call even for an unchanged value (`{ ...prev.x, ...patch }` always allocates a new object). The practical trigger: Board Length's default (72in = 1828.8mm) displays as "182.9 cm", and a blur re-parse of that exact text snaps to 1829mm exactly — a real, if imperceptible, 0.2mm value change that legitimately (correctly) recorded its own undo step, on top of whichever edit came before it. Separately, a shaper who taps into any typed field and taps back out with no edit at all would, before this fix, spend a real undo step reverting nothing visible.
- **Fix:** The recording effect now also skips when `JSON.stringify(before) === JSON.stringify(historySnapshot)`, alongside the existing reference check — a cheap, correct guard against "the object changed but nothing in it did."
- **Files modified:** `components/design/design-store.tsx`
- **Verification:** `lib/design-history.test.ts` and the whole Vitest suite stayed green throughout (this fix lives entirely in the wiring layer, not the pure module); `e2e/undo-redo.spec.ts`'s typed-field case passes with this fix in place.
- **Committed in:** `23e75c9`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for correctness — without it, "ONE accidental movement is ONE step back" would have a silent exception at its own zero-movement edge (a text field visited and left unchanged). No scope creep: the fix lives entirely inside `design-store.tsx`, already a declared file for this plan.

## Issues Encountered

The Board Length field's round-trip precision (display rounds to one decimal centimetre, re-parse snaps to the nearest whole millimetre) means blurring that specific field can file a REAL, if invisible, tiny value change even after the phantom-entry fix above — this is a pre-existing property of `MeasureField`/`commitTypedMeasure` (Phase 6), unrelated to and out of scope for this task, and not a bug this task introduced. `e2e/undo-redo.spec.ts`'s typed-field test accounts for it by pressing the undo shortcut up to three times (in practice, at most two) after moving focus off the field, rather than asserting an exact step count a rounding coincidence could silently flip.

## User Setup Required

None - no external service configuration required.

## Human Verification Deferred

Per this task's own orchestrator ruling, Task 3 (originally `checkpoint:human-verify`) was executed directly rather than deferred — the full Playwright suite ran from this worktree with `IS_WEBPACK_TEST=1` selecting webpack over Turbopack. One item from the plan's own `<how-to-verify>` remains a genuine human check, since it asks for a real screen and a real account, neither reachable from an automated run in this sandbox:

- Move a slider on RAILS, press Cmd+Z, watch the number and the drawing go back; press Shift+Cmd+Z, watch them return.
- Open a different preset from the setup screen and confirm Cmd+Z does nothing afterward (the history cleared with the board) — proven by code inspection (`applyPreset`/`applyModel` both reset the pending-edit ref and call `setHistory(emptyHistory())`) but not exercised by an automated test in this task.
- If signed in, confirm the Save control cycles "Saving…" → "Saved" after an undo, the same as any other edit.

## Next Phase Readiness

- All 5 commits are in this worktree, on top of `10be49b2` (main at dispatch): `342beaa`, `2776145`, `22cee39`, `23e75c9`, `b58fa13`.
- Full local verification in this worktree: `npm test` (61 files, 2488 passed, 2 skipped), `npx tsc --noEmit` (clean except two pre-existing `LayoutProps` errors unrelated to this task — see `deferred-items.md`, a worktree-only artifact from `.next/types` never being generated here), `npm run lint` (clean), and the full Playwright suite (`PW_PORT=3135 IS_WEBPACK_TEST=1 npx playwright test`) — **230 passed, 223 skipped, 0 failed**, including all five desktop baseline screenshots matching with no regeneration (`git status e2e/desktop-baseline.spec.ts-snapshots/` clean).
- No database, schema or migration touched; no `.env*` file touched.
- `.planning/quick/260913-k5k-undo-and-redo-for-accidental-design-edit/deferred-items.md` records the one worktree-environment-only `tsc` finding (pre-existing, unrelated to this task's files).

---
*Phase: quick-260913-k5k*
*Completed: 2026-09-13*
