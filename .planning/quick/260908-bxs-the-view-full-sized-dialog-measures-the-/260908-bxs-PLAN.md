---
phase: quick-260908-bxs
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/rails/view-full-sized-dialog.tsx
  - components/rails/view-full-sized-dialog.test.ts
autonomous: true
requirements: [QT-260908-bxs]

estimate:
  tokens: 9000
  raw_tokens: 9000
  tasks: 1
  confidence: low

must_haves:
  truths:
    - "Opening View Full Sized still draws the rail at true physical size — the plot box's pixel width equals its inch value times the screen's measured pixels-per-inch (96 on a standard screen at 100% zoom)."
    - "The check bar inside the dialog is still exactly two inches wide on screen, and its caption still comes from formatCalibrationMark."
    - "`npm run lint` reports zero errors — the react-hooks/set-state-in-effect error at view-full-sized-dialog.tsx:71 is gone."
    - "The screen's inch is still measured fresh every time the dialog opens, not once per page load, so a shaper who changes browser zoom and reopens the dialog gets the new reading."
    - "The measurement runs once per open, not once per render — flipping between the Nose, Center and Tail tabs inside the open dialog does not re-measure anything."
    - "Nothing about printing changes: the dialog still prints from the real inch numbers carried in --vfs-w-in / --vfs-h-in, not from the measured pixel value."
  artifacts:
    - "components/rails/view-full-sized-dialog.tsx — the px-per-inch reading moved out of an effect and onto a stable mount-time ref callback"
    - "components/rails/view-full-sized-dialog.test.ts — two new source-contract cases (state is set from a useCallback ref, never from an effect; the one-inch probe still exists)"
  key_links:
    - "measureRef must be attached to an element Base UI unmounts when the dialog closes. The check-bar box qualifies: DialogContent renders through DialogPortal (Base UI Dialog.Portal), which renders its children only while the dialog is open, so the callback fires once on every open."
    - "The ref callback must be created by useCallback with an empty dependency array. An inline arrow would be a new function identity on every render, and React detaches and re-attaches a *changed* callback ref each render — that would append, measure and remove a probe element continuously while the dialog sits open."
    - "The ref callback must have a block body that returns nothing. React 19 treats a value returned from a ref callback as a cleanup function and errors on anything else, so the concise `node && setPxPerInch(...)` form is forbidden."
    - "app/design/rails/actual-size.css reads --vfs-w-in / --vfs-h-in on the same two boxes for its @media print rule. Those custom properties and that file stay exactly as they are — the print path must not start depending on the measured pixel value."
    - "lib/geometry/units.ts stays the only place a design value is converted: the existing test forbidding 25.4 / 2.54 in this file still runs unchanged (CLAUDE.md Rule 2)."
---

<objective>
Make the View Full Sized dialog take its pixels-per-inch reading **when its content appears on
screen**, instead of updating state from inside an effect — which clears the one error
`npm run lint` is currently reporting.

Purpose: plan 08-04 gave the dialog a live one-inch probe (D-13) so the rail is drawn at true
physical size rather than at an assumed 96 pixels per inch. The reading itself is right; only its
trigger is wrong. It sits in an effect that immediately sets state, which React's own lint rule
flags as a cascading render, and which is the long way round to say "measure when this appears."
A mount-time ref callback says that directly, in one hop instead of two.

Output: the same measurement, the same numbers on screen, the same printed output — reached
without a state update inside an effect, plus two source-contract tests that keep it that way.
Two files, one commit, plus the SUMMARY.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@components/rails/view-full-sized-dialog.tsx
@components/rails/view-full-sized-dialog.test.ts

Read only if a detail below turns out to be unclear — do not re-read what this plan already states:
@components/ui/dialog.tsx
@app/design/rails/actual-size.css
</context>

<measured_facts>
Measured on this checkout at planning time. Treat as given; do not re-derive.

1. **The error, verbatim.** `npx eslint components/rails/view-full-sized-dialog.tsx` reports
   exactly one problem, one error, zero warnings:
   `71:5 error ... react-hooks/set-state-in-effect`, pointing at
   `setPxPerInch(measurePxPerInch())` inside the hook at lines 67–74.

2. **Where the effect hook is named in this file — three places, and only three.** The import on
   line 18; the hook call on line 69; and one `//` comment on line 101 that mentions it in passing
   (the `wasOpen` note). Removing the first two leaves the name in a comment only, and the test
   file strips comments before asserting, so a "this file contains no effect hook" assertion is
   clean and needs no edit to line 101.

3. **The dialog's content really is unmounted when closed.** `DialogContent` in
   `components/ui/dialog.tsx` renders `DialogPortal` → `DialogOverlay` + `DialogPrimitive.Popup`.
   Base UI's `Dialog.Portal` renders its children only while the dialog is open (there is no
   `keepMounted` set here), so every element inside `DialogContent` mounts on open and unmounts
   after close. Mounting IS the "the dialog just opened" signal.

4. **`DialogContent` cannot take the ref without editing a third file.** Base UI's `Dialog.Popup`
   is a `ForwardRefExoticComponent` whose `Popup.Props` type has `ref` omitted, and
   `DialogContent`'s props are exactly `DialogPrimitive.Popup.Props & { showCloseButton?: boolean }`.
   TypeScript would reject `ref` there as an excess property. Editing `components/ui/dialog.tsx` is
   out of scope for this task, so the ref goes on a plain DOM element inside the dialog instead.

5. **The chosen element: the check-bar box** (`data-actual-size-box="check-bar"`, line 140). It is
   inside `DialogContent`, so fact 3 applies. It is rendered unconditionally — not behind a tab —
   and flipping Nose/Center/Tail only re-renders the same element at the same tree position
   (`TabbedPanel` keeps its panel div keyed and passes `children` straight through), so a tab
   switch never remounts it and never re-measures. And it is itself one of the two boxes sized by
   the measurement, so the reading and its use sit on the same element.

6. **Existing tests.** `components/rails/view-full-sized-dialog.test.ts` has 8 cases, all
   source-contract style: read the real source, strip comments, assert a structural property. One
   of them already builds its needle from parts (`["device", "PixelRatio"].join("")`) so the
   assertion's own text can never match itself — the new "no effect hook" case follows that idiom.

7. **`useCallback` is established here.** `components/theme-provider.tsx`,
   `components/units-provider.tsx` and `components/print-instructions-provider.tsx` all use it. No
   new import beyond swapping one React named import for another.

8. **Test baseline on clean `main`:** 41 test files, 2224 passed, 2 skipped.
</measured_facts>

<!-- planner-discipline-allow: useEffect -->
<!-- planner-discipline-allow: useEffect( -->

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Measure the screen's inch when the dialog's content appears, not from inside an effect</name>

  <files>components/rails/view-full-sized-dialog.tsx, components/rails/view-full-sized-dialog.test.ts</files>

  <read_first>
    Read `components/rails/view-full-sized-dialog.tsx` lines 56–74 (the probe and the hook), line 18
    (the React import), line 108 (the call site) and lines 139–151 (the check-bar box). Read
    `components/rails/view-full-sized-dialog.test.ts` in full — the new cases must match its
    existing idiom exactly.
  </read_first>

  <behavior>
    Two new source-contract cases in `components/rails/view-full-sized-dialog.test.ts`, written and
    run BEFORE the source change so both start red:

    - Test A — "sets its measured px-per-inch from a ref callback, never from an effect": read the
      stripped dialog source, find the index of the literal `setPxPerInch(measurePxPerInch())`, take
      everything before it, collect every React-hook-shaped call with `/\buse[A-Z]\w*\(/g`, and
      assert the LAST one is `useCallback(`. Then, as a blunt second guard in the same case, build
      the needle from parts the way the existing devicePixelRatio case does — join `"use"` and
      `"Effect("` — and assert the stripped source does not contain it. Fails today because the last
      hook before the setter is the effect hook, not `useCallback(`.
    - Test B — "measures the screen with a live one-inch probe (D-13)": assert the stripped source
      matches `/width:\s*1in/` and calls `document.createElement(`, so the probe technique the true
      size depends on cannot be quietly swapped for an assumed constant. Passes today; it is the
      regression guard that the refactor must not disturb the probe itself.

    All 8 existing cases must still pass, unedited. Do not weaken, rename or delete any of them.
  </behavior>

  <action>
    Write the two tests first and watch Test A fail, then make the source change.

    In `components/rails/view-full-sized-dialog.tsx`:

    1. Leave `measurePxPerInch()` (lines 56–63) and its doc comment **exactly as they are** — the
       measurement, the hidden `width:1in` probe and the fallback to 96 when the reading comes back
       non-positive are all correct and are the whole of D-13. Only the trigger moves.

    2. Rewrite `useMeasuredPxPerInch` so it takes no arguments and returns a two-element tuple
       typed `[number, (node: HTMLElement | null) => void]`. Inside it: keep
       `const [pxPerInch, setPxPerInch] = useState(96);`, then create
       `const measureRef = useCallback(...)` whose callback takes `(node: HTMLElement | null)`, has a
       **block body** (braces), and does `if (node) { setPxPerInch(measurePxPerInch()); }` — with an
       **empty dependency array**. Return `[pxPerInch, measureRef]`. Two things are load-bearing and
       must not be "tidied" later: the empty dep array, because React re-attaches a ref callback
       whose identity changed and an inline arrow would therefore re-measure the DOM on every single
       render; and the block body, because React 19 reads a returned value from a ref callback as a
       cleanup function and errors on anything else, so the concise `node && setPxPerInch(...)` form
       is wrong here.

    3. Delete the old effect-based body of that hook and drop `useEffect` from the React import on
       line 18, adding `useCallback` in its place — nothing else in this file uses the effect hook
       (measured fact 2). The line becomes an import of `useCallback`, `useState` and the
       `type CSSProperties` it already carries.

    4. Rewrite the hook's own doc comment (lines 65–66) to state the real reason, because the
       current one is now wrong as well as stale. The truth: the probe is appended to
       `document.body`, not to the dialog, so it would read correctly at any moment — the reading is
       tied to the dialog's content appearing purely for **freshness**, so a shaper who changes
       browser zoom and reopens the dialog gets a new reading rather than a stale one. Note in the
       comment that the callback is deliberately stable and why (point 2 above).

    5. At the call site (line 108), replace `const pxPerInch = useMeasuredPxPerInch(open);` with
       `const [pxPerInch, measureRef] = useMeasuredPxPerInch();`. The `open` prop is still used by
       `<Dialog open={open}>` and by the `wasOpen` default-tab reset — do not touch either.

    6. Add `ref={measureRef}` to the check-bar box, the div carrying
       `data-actual-size-box="check-bar"` at line 140. Record in the SUMMARY that this is the
       element chosen and why (measured fact 5): it is inside `DialogContent`, which Base UI mounts
       only while the dialog is open, and a tab switch re-renders it rather than remounting it, so
       the measurement happens exactly once per open. Leave its `style` block, its
       `--vfs-w-in` custom property, its caption and the plot box below it completely untouched.

    Do NOT reach for `useLayoutEffect`, `useSyncExternalStore`, a lazy `useState` initializer that
    touches the DOM during render, or a `requestAnimationFrame` wrapper — the first keeps the lint
    error, the second and third move DOM work into render, and the fourth only hides the pattern.
    Do NOT add a dependency, edit `components/ui/dialog.tsx`, edit
    `app/design/rails/actual-size.css`, or change any number a shaper sees.
  </action>

  <reversibility rating="reversible">A two-file refactor with no data, schema or API surface; reverting is a single `git revert`.</reversibility>

  <verify>
    <automated>npx eslint components/rails/view-full-sized-dialog.tsx && npx vitest run components/rails</automated>
    <human-check>The orchestrator opens the rails screen after merge, clicks View Full Sized, and checks that the check bar still measures two inches against a ruler and that the plot box's on-screen pixel width equals its inch value times 96 on a standard screen at 100% zoom — then flips Nose/Center/Tail and confirms the sizes hold.</human-check>
  </verify>

  <done>
    `npx eslint components/rails/view-full-sized-dialog.tsx` reports 0 problems. All 10 cases in
    `view-full-sized-dialog.test.ts` pass (8 existing, unedited, plus the 2 new ones), and the whole
    `components/rails` suite is green. The dialog file no longer names the effect hook outside a
    comment, and `setPxPerInch` is called only from inside the `useCallback` ref.
  </done>

</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| shaper's browser → the true-size drawing | No user input crosses here. The probe is an element the app builds itself from a literal style string; nothing a shaper types, and nothing from the database, reaches it. |
| measured px-per-inch → the rail a shaper cuts foam to | This number scales a drawing a shaper is invited to hold a ruler and a scrap of foam against (D-13/D-14). A wrong reading is a wrong-size rail, silently. |
| screen sizing → printed sheet | `app/design/rails/actual-size.css` prints from `--vfs-w-in` / `--vfs-h-in` through CSS `1in`, deliberately NOT from the measured pixel value (08-04 SUMMARY). That separation must survive this change. |
| render loop → the DOM | The probe writes to `document.body` and removes itself. How often that happens is decided by how the callback is attached. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-bxs-01 | Tampering | measured px-per-inch → true-size plot and check bar | high | mitigate | `measurePxPerInch()` and its non-positive-reading fallback to 96 are copied nowhere and edited nowhere — only the trigger moves. Guarded by new Test B (the one-inch probe still exists), by the unchanged 96 initial state, and by the orchestrator's post-merge ruler check on the two-inch bar. |
| T-bxs-02 | Denial of service | ref-callback identity | medium | mitigate | An unstable (inline) callback ref is re-attached by React on every render, which would append, measure and remove a probe element continuously while the dialog is open. Mitigated by requiring `useCallback` with an empty dependency array, stated twice in the action and asserted by Test A (the setter's nearest enclosing hook must be `useCallback(`). |
| T-bxs-03 | Tampering | printed sheet via `actual-size.css` | medium | mitigate | The print path must keep reading real inches, not measured pixels. Mitigated by leaving both custom properties, both boxes' `style` blocks and the CSS file entirely untouched, and by `files_modified` naming only two files. |
| T-bxs-04 | Tampering | display boundary (`lib/geometry/units.ts`) | low | mitigate | A refactor near unit-sensitive code could invite an inlined conversion. The existing case forbidding `25.4` / `2.54` in this file runs unchanged in this task's gate, alongside `lib/units-isolation.test.ts` in the full run. |
| T-bxs-05 | Information disclosure | the probe element | low | accept | The probe is zero-height, hidden, pointer-events-none, carries no content, and is removed in the same synchronous block that creates it. Unchanged by this task. |
| T-bxs-06 | Repudiation | the D-13 rationale | low | mitigate | The hook's doc comment currently gives a reason that stops being true once the trigger moves. Step 4 replaces it with the actual reason (freshness on reopen) rather than leaving a comment that misleads the next reader. |
| T-bxs-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package is installed and none is needed — `useCallback` already ships with React and is already used in three providers in this codebase. |
</threat_model>

<verification>
- `npx eslint components/rails/view-full-sized-dialog.tsx` → **0 problems**. This is the point of
  the task; it currently reports 1 error at 71:5.
- `npm run lint` → **0 errors**. Warnings elsewhere are pre-existing and acceptable — record the
  warning count in the SUMMARY so a later run can tell whether this task moved it.
- `npx vitest run components/rails` green.
- `npm test` fully green. Baseline on clean `main` at planning time: **41 test files, 2224 passed,
  2 skipped**. This task ADDS 2 cases and edits no existing assertion, so the file count must stay
  at 41 and the passed count must rise by 2 — record the new totals.
- `npx tsc --noEmit` clean apart from the known phantom `LayoutProps` errors, which are not this
  task's and are expected in a worktree.
- `npm run build` is NOT run from a worktree — Turbopack cannot resolve `next` there.
- `git status` shows exactly the two files in `files_modified` changed, nothing added, nothing
  deleted.
- The orchestrator checks in a browser after merge: open the rails screen, click View Full Sized,
  and confirm the plot is still drawn in real inches — the `data-actual-size-box="plot"` box's
  pixel width equals its `--vfs-w-in` value times the measured px-per-inch (96 on a standard screen
  at 100% zoom) — and that the check bar is 2 in wide. Then flip Nose/Center/Tail and confirm both
  hold, and that no probe element is left behind in `document.body`.
</verification>

<success_criteria>
- A shaper sees no change whatsoever: the rail still opens at true size, the check bar still
  measures two inches against a ruler, the tabs still work, and printing is untouched.
- `npm run lint` no longer reports an error, and the one it was reporting is gone at the source
  rather than silenced with a disable comment.
- The measurement is taken once each time the dialog opens — not once per page load, and not once
  per render.
- Two files changed, one commit, with a subject a shaper could read, e.g.
  `fix(quick-260908-bxs): View Full Sized measures the screen's inch when it opens, without a state update inside an effect`.
- No existing test assertion weakened or removed; no tracked file deleted; no dependency added; no
  edit to `components/ui/dialog.tsx` or `app/design/rails/actual-size.css`.
</success_criteria>

<output>
Create `.planning/quick/260908-bxs-the-view-full-sized-dialog-measures-the-/260908-bxs-SUMMARY.md` when done.

Record in it, in plain English: which element the ref callback was attached to and why that one
(and why `DialogContent` itself could not take it without editing a third file); why the callback
has to be stable and what would go wrong with an inline arrow; the exact `eslint` output for the
single file before and after; the `npm run lint` error and warning counts after; the `npm test`
totals before and after with the number of cases added; and confirmation that
`measurePxPerInch()`, the two `--vfs-*` custom properties, `components/ui/dialog.tsx` and
`app/design/rails/actual-size.css` were all left untouched, plus what that means for printing.
</output>
