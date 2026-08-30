---
phase: 260829-ugd
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/rocker/rocker-viewer.tsx
  - components/rocker/rocker-editor.tsx
autonomous: true
requirements: [UGD-01, UGD-02]
subsystem: rocker-editor
tags: [rocker, toolbar, wide-view, sidebar, cleanup]

estimate:
  tokens: 9000
  raw_tokens: 9000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "The ROCKER screen's drawing toolbar carries three buttons: rotate the board, construction lines, hide the sidebar."
    - "Pressing the hide-sidebar button on ROCKER collapses the controls sidebar and hands that room to the drawing, exactly the way the same button behaves on the TEMPLATE screen."
    - "Pressing it again brings the sidebar back and restores whatever the construction-lines setting was before wide view forced it on."
    - "The faint dashed plan-view width reference is gone from the rocker drawing at every board length and in both orientations, and no button offers to bring it back."
    - "The printed order form's rocker box on /design/summary looks and prints exactly as it did before."
    - "npm test stays green and npm run lint reports no problem that was not already there."
  artifacts:
    - components/rocker/rocker-editor.tsx
    - components/rocker/rocker-viewer.tsx
  key_links:
    - "rocker-editor's wideView state -> the three places wide view acts: the aside's render gate, main's padding, and TabbedPanel's bare prop."
    - "rocker-editor's wideView -> its preWideViewConstruction partner, which is the only thing that stops a shaper being left on a construction-lines setting they never chose."
    - "RockerViewer's deleted props -> components/summary/order-form.tsx's call site, which never passed either of them, so the order form is unchanged BY CONSTRUCTION rather than by a guard."
    - "lib/geometry/outline.ts's sampleOutline -> its four surviving consumers; it is shared geometry and must not be deleted with the overlay."
---

<objective>
Bring the ROCKER screen's drawing toolbar in line with the TEMPLATE screen: give it the same
hide-the-sidebar button, and take away the board-outline reference overlay and the button that
toggled it.

Purpose: the shaper works the rocker curve on a drawing that should be as big as the window
allows, and the ghosted plan-view outline drawn behind the side profile turned out to be noise
rather than a reference. After this change the two editing screens carry the same wide-view
affordance, so switching between them feels like one application.

Output: two edited files — `components/rocker/rocker-viewer.tsx` and
`components/rocker/rocker-editor.tsx`. No new modules, no geometry changes, no new dependencies.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.claude/CLAUDE.md

@components/rocker/rocker-editor.tsx
@components/rocker/rocker-viewer.tsx
@components/outline/outline-editor.tsx
</context>

<planner_findings>
Read before executing — these are facts checked against the code, not assumptions.

1. **The overlay is entirely local to two files.** `showOutlineReference` appears only in
   `rocker-editor.tsx` (state + button + one prop) and `rocker-viewer.tsx` (prop + one render
   branch). Nothing in `lib/` exists solely to draw it.

2. **`sampleOutline` must NOT be deleted.** It lives in `lib/geometry/outline.ts` and is consumed
   by `components/design/design-store.tsx`, `components/rocker/rocker-datasheet.tsx`,
   `lib/geometry/design.ts` and `lib/geometry/volume.ts`'s callers. Only its *import into
   `rocker-viewer.tsx`* goes. Same for the `OutlineGeometry` type. This is the CLAUDE.md Rule 1
   check the constraints asked for, and the answer is: nothing in `lib/` is overlay-only.

3. **`outlineGeometry` stays in `rocker-editor.tsx`'s `useDesign()` destructure.** It feeds
   `<RockerDatasheet>` as well as the viewer; only the viewer's use of it goes.

4. **The Summary order form is unaffected before anyone tries.** Its call is
   `<RockerViewer rocker foil length hideCallouts />` — it never passed `outlineGeometry`, so the
   reference path was already `null` there and nothing was ever drawn. The order form file should
   come out of this plan with a zero-line diff.

5. **The TEMPLATE screen's wide view acts in exactly three places** (`outline-editor.tsx`):
   the `<aside>` is wrapped in `{!wideView && (...)}` so it leaves the tree rather than shrinking;
   `<main>`'s padding drops `p-3` to `p-1`; and `<TabbedPanel>` takes `bare={wideView}`, which
   removes the tab strip and one nested padded card. It deliberately does NOT swap `<TabbedPanel>`
   for a plain `<div>` — same element type at the same tree position keeps React from tearing down
   the drawing and any in-flight drag on every toggle (recorded there as WR-02).

6. **The construction-state memory is real and must come across.** Entering wide view stores the
   current construction setting, then forces construction lines on; leaving restores the stored
   value. Both are set inside the click handler, never from a render-time effect — the repo's lint
   config rejects setting state during render, and doing it caused a real bug in plan 02-05.

7. **Toolbar slot arithmetic.** ROCKER is currently rotate `right-0`, board-outline `right-10`,
   construction `right-20`. After the removal, construction moves up to `right-10` and the new
   hide-sidebar button takes `right-20` — which puts the three in the same left-to-right order the
   TEMPLATE screen has (rotate, [export], construction, wide view).

8. **No React rendering test infrastructure exists.** `vitest.config.ts` runs a node environment
   over `lib/**/*.test.ts` and `components/**/*.test.ts` — `.ts` only, so no JSX can be rendered in
   a test. UI behaviour here is proven by the grep gates below plus the post-merge browser pass;
   the full suite's job is to prove nothing else broke.

9. **This plan uses two `auto` tasks, not a leading tracer.** Each task is already a complete
   end-to-end change to one screen across the two files that make it up; a "thinnest path through
   every layer" slice would be a smaller version of Task 1 with no architecture left to prove.
</planner_findings>

<planner_assumptions>
Flag these to the founder in the summary; none of them blocked planning.

- **"Show template" read as the board-outline reference overlay.** The rocker viewer's ghosted
  plan-view curve is the only thing on that screen matching "the template" being shown, and it has
  a dedicated corner button, which matches "and its button". Nothing else on the rocker screen
  shows a template.
- **Wide view forcing construction lines on is carried across deliberately.** The founder asked for
  "same action as on template", and that memory-and-force behaviour is part of what the template's
  button does. A shaper may still be surprised that pressing "hide sidebar" also switches the
  construction lines on — worth confirming in the browser pass, and it is a two-line change to drop
  if unwanted.
- **The DATASHEET tab goes out of reach while wide view is on**, because wide view removes the tab
  strip. The TEMPLATE screen has only one tab so this never came up there. It is self-correcting —
  the hide-sidebar button sits inside the VIEWER tab and stays on screen, so one press brings the
  strip back — but it is a real difference between the two screens.
- **The construction-lines button keeps its current neutral pressed state.** Its accent fill was
  reserved for the button being deleted, so the accent is now unclaimed on this toolbar. Matching
  the TEMPLATE screen's accent-filled construction button is a one-line flip, but the founder did
  not ask for a colour change and this plan does not make one.
- **Phase 04's planning documents are left alone.** `04-02-PLAN.md`, `04-02-SUMMARY.md` and
  `04-UI-SPEC.md` describe the toggle as built; they are a record of what happened at the time, not
  a live contract, and rewriting a completed phase's summary would falsify history. The removal is
  recorded in this quick task's own summary instead.
</planner_assumptions>

<tasks>

<task type="auto">
  <name>Task 1: Take the board-outline reference off the rocker drawing</name>
  <files>components/rocker/rocker-viewer.tsx, components/rocker/rocker-editor.tsx</files>
  <reversibility rating="reversible">Deleting a view-only overlay; the code stays in git history and nothing persisted depends on it.</reversibility>
  <read_first>
    `components/rocker/rocker-viewer.tsx` — the file-header block comment, `RockerViewerProps`, the
    sampling loop, and the render block just above the solid `boardPath`.
    `components/rocker/rocker-editor.tsx` — the file-header block comment and the toolbar buttons.
    Planner findings 1-4 and 7 above.
  </read_first>
  <action>
In `components/rocker/rocker-viewer.tsx`:

Delete the two optional props that drive the plan-view width reference — the boolean flag that
defaults to true, and the optional `OutlineGeometry` — from the props interface, from the
destructured parameter list of the component, and delete their JSDoc blocks with them.

Delete the two imports that existed only for that reference: the `OutlineGeometry` type import and
the `sampleOutline` value import from `@/lib/geometry/outline`. Do not touch
`lib/geometry/outline.ts` itself and do not delete either export — planner finding 2 lists four
other consumers, so this is shared geometry, not overlay-only code.

Delete the accumulator array that collects the reference's sampled points, the `if` branch inside
the sampling loop that fills it, the path-string builder that turns it into an SVG `d` attribute,
and the conditional `<path>` element that renders it (the faint dashed one sitting between the
baseline line and the solid board path). Leave the baseline `<line>` above it exactly as it is —
that dashed line is the rocker's own zero reference and it stays. Leave `boardPath` and everything
below it untouched.

Rewrite the prose the deletion falsifies: the file-header paragraph that documents the reference
goes entirely, and the sentence in the orientation paragraph that lists the physically drawn
elements drops the reference from its list. The phase-04 decision id cited by those two passages
(and by the two deleted prop comments) must not survive anywhere in this file.

In `components/rocker/rocker-editor.tsx`:

Delete the `showOutlineReference` state pair, the whole toolbar button that toggled it, and the two
props it fed to `<RockerViewer>`. Remove `LayoutTemplateIcon` from the lucide-react import — it has
no other use in this file — and keep `LocateFixedIcon`.

Keep `outlineGeometry` in the `useDesign()` destructure and keep passing it to `<RockerDatasheet>`
(planner finding 3). Keep the `fitToBoard`, `showConstruction`, `onDrag`, `orientation` and
`outlineGeometry`-free props on `<RockerViewer>` otherwise unchanged.

Move the construction-lines button from `right-20` to `right-10`, so the toolbar reads as a
contiguous pair with no hole where the deleted button was.

Rewrite the two stale passages: the file-header sentences that describe the deleted toggle and call
the construction button its sibling, and the construction button's own comment — whose entire
stated reason for taking a neutral rather than accent pressed state was that the accent was
reserved for the button now being deleted. Keep the neutral pressed state exactly as it is; this
task changes no colours. Replace that justification with the current truth: the accent fill is now
unclaimed on this toolbar, and matching the TEMPLATE screen's accent-filled construction button
would be a one-line flip the founder has not asked for. The phase-04 decision id that appears in
both of those passages must not survive in this file; the different decision id cited for the
DATASHEET tab is still true and stays.
  </action>
  <verify>
    <automated>
npm test
npm run lint
npx tsc --noEmit

# Code-only view of both files (own-line comments filtered out), so a rewritten
# comment can never satisfy or defeat these counts.
CODE=$(grep -vE '^[[:space:]]*(\*|//|/\*)' components/rocker/rocker-viewer.tsx components/rocker/rocker-editor.tsx)
echo "$CODE" | grep -c 'showOutlineReference'   # expect 0
echo "$CODE" | grep -c 'LayoutTemplateIcon'     # expect 0
echo "$CODE" | grep -c 'sampleOutline'          # expect 0
echo "$CODE" | grep -c 'outlineRefP'            # expect 0

# Prose freshness: this decision id appeared ONLY in the passages being rewritten.
grep -c 'D-08' components/rocker/rocker-viewer.tsx components/rocker/rocker-editor.tsx  # expect 0 for both files
grep -c 'D-07' components/rocker/rocker-editor.tsx                                      # expect >= 1 (DATASHEET citation survives)

# Shared geometry untouched, datasheet still fed, toolbar contiguous.
grep -c 'sampleOutline' lib/geometry/outline.ts          # expect >= 1
grep -c 'outlineGeometry' components/rocker/rocker-editor.tsx  # expect >= 2
echo "$CODE" | grep -c 'right-10'   # expect 1
echo "$CODE" | grep -c 'right-20'   # expect 0

# The printed order form must come out of this task with a zero-line diff.
git status --porcelain components/summary/order-form.tsx  # expect no output
    </automated>
    <human-check>
Post-merge, in the browser (the executor works in a git worktree where Turbopack cannot resolve
`next`, so `npm run dev` is the orchestrator's to run):
1. Open /design/rocker. The toolbar has two buttons: rotate, and construction lines. The
   board-outline button is gone.
2. The faint dashed curve that used to arc behind the board is gone. The one dashed line still
   there is the flat baseline under the board — that one is correct and stays.
3. Rotate to nose-up and back; still no ghost curve at either orientation, at 5'0" and at 10'0".
4. Switch to the DATASHEET tab and back — the table is unchanged.
5. Open /design/summary and check the order form's rocker box: same board, same position, same box.
    </human-check>
  </verify>
  <done>
The rocker drawing shows the board and its baseline only. No control offers a board-outline
overlay. `npm test` is green, `npm run lint` reports nothing new, and
`components/summary/order-form.tsx` and `lib/geometry/outline.ts` are both unmodified. No comment
in either edited file still describes the removed overlay.
  </done>
</task>

<task type="auto">
  <name>Task 2: Give the rocker screen the template's hide-sidebar button</name>
  <files>components/rocker/rocker-editor.tsx</files>
  <read_first>
    `components/outline/outline-editor.tsx` — its `wideView`/`preWideViewConstruction` state pair,
    `handleToggleWideView`, the fourth toolbar button, the `{!wideView && (...)}` aside gate, the
    `<main>` padding branch and the `bare={wideView}` prop on `<TabbedPanel>`.
    Planner findings 5, 6 and 7 above.
  </read_first>
  <action>
Mirror the TEMPLATE screen's wide view into `components/rocker/rocker-editor.tsx`. This is a
faithful local mirror, not a shared extraction: `outline-editor.tsx` does not export any of it, and
this screen already keeps its own copies of the rotate glyph and the preset-capture handler for the
same reason.

Add the same two pieces of local view state the template keeps — a `wideView` boolean and a
`preWideViewConstruction` boolean, both starting false, both deliberately unpersisted so a reload
always comes back with the sidebar showing. Document them the way their counterparts are
documented: view preference, not design data.

Add the same click handler. Entering wide view remembers the current construction-lines setting,
switches construction lines on, and sets wide view. Leaving restores the remembered setting and
clears wide view. Set both values inside the handler, never from a render-time effect — the repo's
lint config rejects setting state during render (planner finding 6).

Add the toolbar button as the third one, at `right-20` (rotate is `right-0` and construction is
`right-10` after Task 1). Copy the template's button faithfully: the same box class string, its
`aria-pressed` binding to the wide-view state, its state-dependent `aria-label` and `title` pair,
and the swap between the two lucide-react panel icons for the two states. Never accent-filled —
that fill is not this button's.

Wrap the `<aside>` in a gate so it leaves the tree entirely while wide view is on, rather than
being resized. Its internal structure — the scrolling controls region plus the flex-none
development-only preset footer — is untouched; a quick task already had to fix that footer once
because it was only pinned by luck.

Branch `<main>`'s padding from `p-3` to `p-1` while wide view is on, matching the template.

Pass the wide-view state to the existing `<TabbedPanel>` through its `bare` prop rather than
branching between `<TabbedPanel>` and a plain `<div>`: same component at the same tree position, so
React's reconciler never tears down and rebuilds the drawing and any in-flight drag on a toggle
(planner finding 5). Leave the `tabs`, `active` and `onSelect` props exactly as they are.

Record one thing in a comment that the TEMPLATE screen never had to: `bare` removes the tab strip,
and this screen has two tabs, so the DATASHEET tab is out of reach while wide view is on. That is
safe because the button that turns wide view on lives inside the VIEWER tab's own toolbar and stays
on screen in both states — so the active tab is invariantly the viewer whenever wide view is on,
and one press always brings the strip back.
  </action>
  <verify>
    <automated>
npm test
npm run lint
npx tsc --noEmit

CODE=$(grep -vE '^[[:space:]]*(\*|//|/\*)' components/rocker/rocker-editor.tsx)
echo "$CODE" | grep -c 'wideView'                # expect >= 6
echo "$CODE" | grep -c 'preWideViewConstruction' # expect >= 3
echo "$CODE" | grep -c 'PanelLeftOpenIcon'       # expect >= 2 (import + use)
echo "$CODE" | grep -c 'PanelLeftCloseIcon'      # expect >= 2
echo "$CODE" | grep -c 'bare={wideView}'         # expect 1
echo "$CODE" | grep -c 'right-20'                # expect 1
echo "$CODE" | grep -c 'useEffect'               # expect 0 (handler-set state, not a render effect)

# The template screen is the source being mirrored, not a file this task edits.
git status --porcelain components/outline/outline-editor.tsx  # expect no output
    </automated>
    <human-check>
Post-merge, in the browser:
1. Open /design/rocker. The toolbar now has three buttons: rotate, construction lines, hide
   sidebar — the same trio, in the same order and the same style, as on /design/outline.
2. Press hide sidebar. The controls sidebar disappears, the tab strip disappears, and the drawing
   fills the window. Nose-left the board gets wider; rotate to nose-up and it gets taller.
3. Construction lines have switched on, exactly as they do on the template screen.
4. Press the button again. The sidebar and the tab strip come back, and the construction lines
   return to whatever they were before — off if they were off, on if they were on.
5. Drag a control point while wide view is on, then toggle wide view: the drawing does not flicker
   or reset, and the sliders still track the curve.
6. Switch to DATASHEET, back to VIEWER, then hide the sidebar and show it again — DATASHEET is
   still there and still selected-able.
7. Do steps 1-4 on /design/outline as well: the template screen behaves exactly as it always has.
    </human-check>
  </verify>
  <done>
The rocker screen's hide-sidebar button collapses the sidebar and the tab strip, hands that room to
the drawing, and restores both plus the previous construction-lines setting when pressed again —
matching /design/outline. `npm test` is green, `npm run lint` reports nothing new, and
`components/outline/outline-editor.tsx` is unmodified.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| *(none new)* | This plan adds no input path, no network call and no persisted field. Both changes are local React view state and SVG attributes computed from design state that is already validated on the way in (the Zod envelope in the design store). |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-UGD-01 | Tampering | `RockerViewer`'s prop surface (`components/rocker/rocker-viewer.tsx`) | low | mitigate | Deleting two optional props could silently change how an unnoticed consumer renders. Mitigated by `npx tsc --noEmit` in both tasks plus Task 1's `git status --porcelain components/summary/order-form.tsx` gate, which proves the only other call site is untouched. |
| T-UGD-02 | Information Disclosure | Wide-view state (`components/rocker/rocker-editor.tsx`) | low | accept | `wideView` and `preWideViewConstruction` are local React state, never written into the saved-board snapshot and never sent to the server, so a saved design cannot pick up a view preference. |
| T-UGD-03 | Denial of Service | Deleted sampling branch (`components/rocker/rocker-viewer.tsx`) | low | accept | Removing per-frame `sampleOutline` calls from the 61-sample render loop only reduces work; there is no path where deleting them costs anything. |

No package-manager installs are introduced by this plan, so no supply-chain gate applies.
</threat_model>

<verification>
Run in the worktree, in this order:

1. `npm test` — the full suite must stay green (1217 tests across 24 suites as of 260829-tmj). No
   test file is added or changed by this plan; the suite's job here is to prove the geometry layer
   is untouched.
2. `npm run lint` — 0 errors. Nine pre-existing warnings are expected in files this plan never
   touches; no new warning in `components/rocker/*`.
3. `npx tsc --noEmit` — the only acceptable errors are the two known phantom `LayoutProps` errors in
   `app/layout.tsx` and `app/design/layout.tsx`, caused by a gitignored `next-env.d.ts` being absent
   from a fresh worktree. Anything else is a real failure.
4. Every grep gate in both tasks' `<automated>` blocks returns its expected count.
5. `git status --porcelain` names only `components/rocker/rocker-viewer.tsx` and
   `components/rocker/rocker-editor.tsx` (plus this plan's own planning files).

Do NOT run `npm run build` or `npm run dev` in the worktree — Turbopack cannot resolve `next`
through a worktree symlink. The orchestrator builds after merge.
</verification>

<success_criteria>
- The rocker viewer toolbar shows rotate, construction lines and hide sidebar, in that order,
  matching the template screen's styling and behaviour.
- Hiding the sidebar on the rocker screen collapses the sidebar and the tab strip and enlarges the
  drawing; showing it again restores both plus the previous construction-lines setting.
- No board-outline reference is drawn on the rocker screen and no control offers one.
- `sampleOutline` and `OutlineGeometry` remain exported from `lib/geometry/outline.ts` and their
  four other consumers still compile.
- `components/summary/order-form.tsx` and `components/outline/outline-editor.tsx` have zero-line
  diffs.
- `npm test` green, `npm run lint` clean of new problems, `npx tsc --noEmit` clean apart from the
  two known worktree phantoms.
- No comment in either edited file still describes the removed overlay.
- Two atomic commits, one per task, each written in plain English about what the screen does now.
</success_criteria>

<output>
Create `.planning/quick/260829-ugd-rocker-screen-add-the-template-s-hide-si/260829-ugd-SUMMARY.md`
when done.

Carry into the summary: the post-merge browser steps from both `<human-check>` blocks (the executor
cannot run the dev server in a worktree), and the four items in `<planner_assumptions>` — especially
that wide view switches construction lines on, and that phase 04's planning documents still describe
the removed toggle as built.
</output>
