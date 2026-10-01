---
phase: quick-260930-lia
plan: 01
subsystem: ui
tags: [react, svg, playwright, vitest, template-screen]

requires:
  - phase: 13-ready-for-the-shapers
    provides: "the TEMPLATE screen, the design store's undo/redo history, the viewer toolbar row"
provides:
  - "A faint dashed ghost of the outline as it was one edit ago, drawn behind the live board on TEMPLATE"
  - "A toolbar button that hides and shows the ghost, on by default, not remembered"
  - "lib/outline-ghost.ts: the pure rule (pickOutlineGhost, outlinesMatch) that picks the ghost from the undo history"
affects: [outline-viewer, design-store, template-screen]

actuals:
  tokens: 15600
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A screen-only comparison aid read straight from the session's own undo history, never stored or saved"
    - "Drawing a 'ghost' layer behind a live SVG shape by splitting a hooked path's fill from its line (stroke=none + an unhooked ink-line copy), so existing hooks/tests keep finding the same element"

key-files:
  created:
    - lib/outline-ghost.ts
    - lib/outline-ghost.test.ts
    - e2e/outline-ghost.spec.ts
  modified:
    - components/design/design-store.tsx
    - components/outline/outline-viewer.tsx
    - components/outline/outline-editor.tsx
    - app/globals.css
    - components/viewer/toolbar-button.test.ts

key-decisions:
  - "The ghost is the outline one edit ago, picked by walking the undo history from its most recent entry for the first one whose outline differs from the live one (O-1) — the founder's F-1/F-2/F-3 decisions, restated by the orchestrator so tests and code agree"
  - "The toolbar button is appended LAST in the JSX (the row's flex-row-reverse growth rule), so it lands at the far left and no existing button moves; it exists only once there is a ghost to hide (P-3)"
  - "The on/off choice is a plain useState, not a stored preference (P-4) — mirrors the construction-lines toggle"

requirements-completed: [QT-260930-lia, 13-SPEC-item-9b]

coverage:
  - id: D1
    description: "After a drag or slider move on TEMPLATE, the outline as it was one edit ago draws as a thin dashed line behind the live board, under its ink line, behind every grab point, turning with the board when rotated"
    requirement: "13-SPEC-item-9b"
    verification:
      - kind: unit
        ref: "lib/outline-ghost.test.ts#pickOutlineGhost"
        status: pass
      - kind: e2e
        ref: "e2e/outline-ghost.spec.ts#TEMPLATE's last-edit ghost"
        status: pass
    human_judgment: true
    rationale: "Whether the ghost reads as faint-but-legible on a real screen in the shaper's own theme is a visual judgment call the plan explicitly defers to the founder (success_criteria item 1)"
  - id: D2
    description: "The ghost follows the O-1 rule through a second edit, an edit on another screen, Undo and Redo"
    requirement: "13-SPEC-item-9b"
    verification:
      - kind: unit
        ref: "lib/outline-ghost.test.ts#pickOutlineGhost — driven by the real undo-history stacks"
        status: pass
      - kind: e2e
        ref: "e2e/outline-ghost.spec.ts#(f)(g)(g2) one edit ago / Undo / Redo"
        status: pass
    human_judgment: false
  - id: D3
    description: "A ghost button appears at the toolbar's far left once there is a ghost, on by default, hides and shows it, and is back on after a reload; no existing button moves"
    requirement: "13-SPEC-item-9b"
    verification:
      - kind: e2e
        ref: "e2e/outline-ghost.spec.ts#the ghost button"
        status: pass
    human_judgment: true
    rationale: "Whether the 34px button is easy to hit on the founder's own iPhone is a physical/visual judgment the plan defers to the founder (success_criteria item 2)"
  - id: D4
    description: "The ghost never reaches paper, the home screen's cards, the SUMMARY sheet, ROCKER, or any screen besides TEMPLATE"
    requirement: "13-SPEC-item-9b"
    verification:
      - kind: e2e
        ref: "e2e/outline-ghost.spec.ts#(d)(e) printing / other screens"
        status: pass
    human_judgment: false
  - id: D5
    description: "A freshly opened board looks exactly as it did before this item — all five desktop baselines and viewer-toolbar.spec.ts pass unchanged, no snapshot re-recorded"
    requirement: "13-SPEC-item-9b"
    verification:
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts, e2e/viewer-toolbar.spec.ts"
        status: pass
    human_judgment: false

duration: ~80min
completed: 2026-09-30
status: complete
---

# Phase 13 Quick Task 260930-lia: TEMPLATE's Last-Edit Ghost Summary

**On the TEMPLATE screen, after you drag a point or move a slider, the shape the board had just before that change stays drawn faintly behind the new one — a thin dashed line, in the same spot and at the same size — so you can see at a glance whether the nose got fuller or the tail got wider, instead of having to remember what it looked like a moment ago.**

## What a shaper sees

The ghost is always **the shape from one edit ago** — the last drag or slider move, whichever
screen control you used. It is drawn:

- **behind** the board's coloured fill and **under** its dark outline line, and behind every
  draggable point, so it never looks like part of the live board and never gets in the way of
  grabbing a point near it;
- as a **thin dashed muted-grey line**, never the bright accent colour the draggable points use —
  the accent means "you can grab this," and the ghost is only a reference;
- **turning with the board** if you rotate the drawing to horizontal — it is drawn inside the same
  rotated group as the live outline, so the two always agree.

**What happens on a second edit.** The ghost moves on to the shape right *after* your first edit —
so it is always "one step back from where you are right now," not frozen at the very start.

**What happens on another screen.** If you go shape a rail, a fin or the rocker and come back to
TEMPLATE, the ghost you had is untouched — only an *outline* edit moves it.

**Undo and Redo.** Undo steps the board back AND steps the ghost back with it — it is always the
shape one outline edit further back than what Undo just left on screen. Undo all the way back to a
board you haven't touched, and the ghost disappears (there is nothing further back to compare
against). Redo brings both forward again, in step.

**Opening a different board** — a preset, or a board from your rack — clears the ghost, since it
comes from this session's own undo history, which starts fresh for every new board.

## The ghost button

Once there is a ghost to hide, a **new icon button** joins the row in the top-right corner of the
TEMPLATE drawing — the same row Export Template, Rotate and the construction-lines button already
sit in. It always appears at the **far left** of that row, so none of the existing buttons ever
move. Pressing it hides the ghost and the button's name changes to "Show the ghost of the last
edit"; pressing it again brings back the exact same ghost.

**This choice is not remembered on purpose** — reloading the page, or leaving TEMPLATE for another
screen and coming back, always turns the ghost back on the next time you edit. The reasoning: the
ghost itself only exists for this one browsing session (nothing about it is ever saved to your
account), so a remembered "I turned it off" would outlive the very thing it was hiding, and the
construction-lines toggle right next to it already works the same way.

## Never on paper, never on another screen

- **Printing TEMPLATE** (Cmd/Ctrl+P straight from the browser) leaves the ghost off the page — it
  is a screen aid, like the board's own coloured fill, which already prints hollow.
- The **Full Sized Template, Overview Sheet, Paper Saver and the Summary order form** never draw it
  at all — none of those are ever handed the ghost's data in the first place, so there was nothing
  to additionally suppress there.
- The **home screen's preset cards** and **ROCKER** never show it either.
- Coming back to TEMPLATE, the board still has its own ghost waiting, proving its absence elsewhere
  was real and not just "the page hadn't drawn it yet."

## The colour choice (P-6)

The ghost's stroke is 80% of the app's muted-ink colour mixed over transparent, at 1.25 drawing
units wide (the live line is 2, the faint station lines are 1), dashed `8 5` — long dashes, visibly
different from the stringer's, the station marks' and the widepoint line's own dash patterns.
Computed at plan time with the same WCAG relative-luminance method the rest of the app's contrast
notes use, the ghost clears the 3:1 bar for a meaningful graphic against both backgrounds it can
sit over, in every theme:

| Theme | ghost vs page panel (outside the board) | ghost vs board fill (inside) |
|-------|------|------|
| Daylight | 3.94 | 3.55 |
| Chalk | 3.94 | 3.42 |
| Slate | 5.30 | 4.60 |
| Phosphor | 4.32 | 3.77 |

## Performance

- **Duration:** ~80 min
- **Tasks:** 3/3 completed
- **Files modified:** 8 (3 created, 5 modified — see Task Commits below)
- **Commits:** 3 task commits + this summary commit

## Task Commits

1. **Task 1 (tracer): the ghost itself — the rule, the store, the drawing** — `f60fb00` (feat)
   - `lib/outline-ghost.ts` (new): `pickOutlineGhost` and `outlinesMatch`, the O-1 rule over the
     undo history, pure and unit-tested (19 cases, including against the real `recordEdit`/`undo`/
     `redo` stacks from `lib/design-history.ts`)
   - `components/design/design-store.tsx`: two new memos (`outlineGhost`, `outlineGhostGeometry`)
     and the `outlineGhostGeometry` field on the design context
   - `components/outline/outline-viewer.tsx`: the optional `ghostGeometry` prop, the
     `silhouettePath` helper extracted so the ghost draws through the same projection the live
     board uses, and the split-fill/ghost/ink-line drawing order (P-5)
   - `components/outline/outline-editor.tsx`: passes the ghost through to the viewer
   - `app/globals.css`: the two new derived tokens, `--outline-ghost` and `--outline-ghost-dash`
   - `e2e/outline-ghost.spec.ts` (new): the desktop drag proof and the "never catches the mouse"
     proof
   - RED/GREEN: `lib/outline-ghost.test.ts` was written and run failing (the module didn't exist
     yet) before `lib/outline-ghost.ts` was written to make it pass — both land in this one commit,
     as the plan's execution mechanics specify for this quick task's single-commit-per-task rule.

2. **Task 2: the toolbar button** — `4e4da62` (feat)
   - `components/outline/outline-editor.tsx`: the `showGhost` view state and the new
     `ViewerToolbarButton`, appended last so it lands at the toolbar's far left
   - `components/viewer/toolbar-button.test.ts`: updated a source-contract test's expected button
     count for TEMPLATE (4 → 5)
   - `e2e/outline-ghost.spec.ts`: button-appearance, toggle and not-remembered proofs on desktop,
     iPhone and Android

3. **Task 3: off paper, off every other screen, full cross-project proof** — `7507baf` (feat)
   - `app/globals.css`: the `@media print` rule hiding `[data-outline-ghost]`
   - `e2e/outline-ghost.spec.ts`: the remaining cases — fresh load, one edit, printing, every other
     screen, one-edit-ago, Undo/Redo (desktop keyboard and the phone undo bar), and rotation — on
     all three Playwright projects

## Files Created/Modified

- `lib/outline-ghost.ts` — the pure rule that picks which past outline (if any) is the ghost
- `lib/outline-ghost.test.ts` — 19 unit tests for that rule
- `components/design/design-store.tsx` — computes the ghost from the session's undo history
- `components/outline/outline-viewer.tsx` — draws the ghost, with pointer-events off
- `components/outline/outline-editor.tsx` — the show/hide toggle and wiring
- `app/globals.css` — the ghost's colour/dash tokens and its print-hide rule
- `components/viewer/toolbar-button.test.ts` — updated button-count expectation
- `e2e/outline-ghost.spec.ts` — the full browser proof, all three projects

## Decisions Made

All decisions were the founder's (F-1/F-2/F-3) or the orchestrator's restatement of them (O-1
through O-5) and the planner's discretionary choices (P-1 through P-7), all recorded in the plan's
own `<decisions>` section — none were re-made during execution. Nothing in this run required a new
decision outside what the plan already specified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `components/viewer/toolbar-button.test.ts`'s button-count assertion**
- **Found during:** Task 2
- **Issue:** A source-contract test asserts TEMPLATE's editor renders exactly 4
  `<ViewerToolbarButton` elements — a true count before this item, now stale now that a 5th
  (conditionally-rendered) button exists in the source.
- **Fix:** Updated the expected count from 4 to 5, with a comment explaining the new count.
- **Files modified:** `components/viewer/toolbar-button.test.ts`
- **Verification:** `npm test` passes (3607 passed, 2 skipped, same as before this fix)
- **Committed in:** `4e4da62` (part of Task 2's commit)

**2. [Rule 1 - Bug] XPath rotation assertion never matched an SVG `<g>`**
- **Found during:** Task 3, writing test (h)
- **Issue:** `locator.locator("xpath=ancestor::g[@transform][1]")` timed out — SVG elements sit in
  the SVG XML namespace, and a bare, unprefixed XPath tag-name test (`g`) never matches a
  namespaced element inside a mixed HTML/SVG document.
- **Fix:** Used `local-name()='g'` instead, which compares the tag's local name regardless of
  namespace. Confirmed with a throwaway debug spec before applying the fix (deleted before the
  final commit).
- **Files modified:** `e2e/outline-ghost.spec.ts`
- **Verification:** the rotation test (h) passes on desktop.
- **Committed in:** `7507baf` (part of Task 3's commit)

**3. [Rule 1 - Bug] `<nextjs-portal>` dev-mode overlay intercepted a tab-bar link click**
- **Found during:** Task 3, writing test (e) on iPhone and Android
- **Issue:** Clicking the TEMPLATE tab in the phone bottom tab bar timed out — Next's dev-mode
  indicator (`<nextjs-portal>`, bottom-left of the viewport, only present under `next dev`)
  physically sits over part of the tab bar and intercepts a real pointer click there. This is a
  dev-server-only artifact; `e2e/phone-trip.spec.ts` had already found and documented the same
  issue for the bottom tab bar.
- **Fix:** Used `.dispatchEvent("click")` instead of `.click()` for the SUMMARY/TEMPLATE/ROCKER/home
  link navigations in test (e), matching `e2e/phone-trip.spec.ts`'s own established pattern — this
  fires the DOM click event straight on the `<a>`, which is what Next's `<Link>` listens for, so it
  still proves the link's own handler navigates, without racing the dev-only overlay.
- **Files modified:** `e2e/outline-ghost.spec.ts`
- **Verification:** test (e) passes on desktop, iPhone and Android.
- **Committed in:** `7507baf` (part of Task 3's commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 — bugs/stale assertions found while proving the
plan's own behavior, none of them a scope or architecture change).
**Impact on plan:** None outside the planned surface. All three fixes were necessary to get a
truthful green test run; no scope creep.

## Issues Encountered

None beyond the three auto-fixed items above.

## Test Counts

**Unit (Vitest):** 3607 passed, 2 skipped (pre-existing, unrelated) across 92 test files — 19 of
those tests are new, in `lib/outline-ghost.test.ts`.

**Browser (Playwright), full suite, foreground, one project at a time:**

| Project | Passed | Skipped | Failed |
|---------|--------|---------|--------|
| desktop | 160 | 108 | 0 |
| iphone | 176 | 92 | 0 |
| android | 185 | 83 | 0 |

Every skip is another spec's own project filter (e.g. an android-only CDP touch case skipped on
desktop) — none are new to this item.

## No desktop baseline was re-recorded

The plan's P-3 decision predicted this and it held: the ghost button is appended last in the
toolbar's JSX and shows only once `outlineGhostGeometry !== null`, so a freshly loaded board's
toolbar and drawing are byte-for-byte what they were before this item. All five desktop baseline
screenshots (`e2e/desktop-baseline.spec.ts`) and `e2e/viewer-toolbar.spec.ts` (which measures a
freshly loaded screen) passed unchanged across all three task commits — no `--update-snapshots` was
ever run, and `git diff d9d6e2e -- e2e/*-snapshots` is empty.

## Human verification deferred

Per the plan's `success_criteria`, these four checks are left for the founder, on a real device,
before anything is pushed:

1. **On a computer:** drag a point on TEMPLATE and judge whether the ghost reads as faint-but-easy-
   to-see, in the theme used day to day (and ideally also in one light and one dark theme).
2. **On the founder's own iPhone:** drag a point with a thumb, confirm the ghost follows, and check
   that the ghost button is easy to hit at its 34px size (matching its neighbours, not the 44px
   touch-target floor).
3. **Decide** whether P-7's sideways-phone finding (below) deserves its own follow-up todo.
4. **Give the go to push** — nothing in this quick task was pushed; it lives on the worktree branch
   only.

## Found, not fixed (P-7, recorded for the founder)

Both measured at plan time, neither touched by this execution:

1. **Viewer toolbar buttons are 34×34px on a phone, not 44px.** The ghost button matches its
   neighbours (Export Template, the construction toggle) at that existing size.
   `e2e/touch-sizing.spec.ts` only measures `[data-slot="button"]` buttons of the `h-8`/`size-8`
   variants, so it has never measured a toolbar button either way. Growing every toolbar button to
   44px is a whole-toolbar change, outside this item's scope.
2. **On a phone held sideways**, the drawing's "Tail @ 12"" read-out already sits mostly under the
   Wide View button today, independent of this item. With a ghost present, the new toolbar button
   would cover the rest of it once a ghost exists (measured with a stand-in button at plan time).
   Pre-existing, not introduced by this item.

## Threat Flags

None - no new attack surface. The ghost reads only from client-side state already in memory (the
undo history), writes nothing new, makes no network request, and the printed/other-screen paths
were proven closed by test rather than merely asserted.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

This item is complete and self-contained. Nothing here blocks or is blocked by any other Phase 13
item. The four "Human verification deferred" checks above are the only remaining step before this
work is pushed to `main`.

---
*Quick task: 260930-lia*
*Phase: 13-ready-for-the-shapers (optional item 9b)*
*Completed: 2026-09-30*

## Self-Check: PASSED

- All 8 key files confirmed present on disk.
- All 3 task commits (`f60fb00`, `4e4da62`, `7507baf`) confirmed in `git log`.
