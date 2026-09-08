---
phase: quick-260908-adg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/rails/rail-instructions.tsx
  - components/rails/rail-plan-side-figure.tsx
autonomous: true
requirements: [QT-260908-adg]

estimate:
  tokens: 35000
  raw_tokens: 35000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "The example rail is drawn again on the INSTRUCTIONS tab. Card 1 (\"Understanding Rail Markings\") stands 350px tall — the prototype's own card height — and the plot inside it has real width and real height, in both the Flat and the Domed state. Today that card renders 42px tall and its plot is 0x0."
    - "The whole example board in \"Turning Marks Into Rail Bands\" is on screen at once. The figure is capped at the size the prototype actually rendered it — 472px tall, about 374px wide — instead of stretching to whatever the column is wide. Today it renders 1052x1328px and a shaper sees only the nose."
    - "Both figures keep every part they already have, in the same proportions: the plan-view PNG, all nine overlay line families and their tick boxes, the side strip, the three station labels and the taper-tuck note. Nothing is cropped, hidden or re-laid-out — the figures only stop growing past a point."
    - "The figure's labels read at about 12px on screen, which is the prototype's own 16px label at its own 0.7492 rendering — the container-query font follows the capped box automatically, with no font size touched by hand."
    - "On a narrow column the plan/side figure still shrinks to fit rather than spilling out of its card. The cap is a ceiling, not a fixed size."
    - "The order form's printed third sheet still prints both figures, now at the prototype's own size, and it is not edited to make that happen — it composes the same two components."
    - "No number a shaper reads changes. No board dimension, no unit, no geometry, no formula. Both edits are the size of a drawing on a page."
  artifacts:
    - components/rails/rail-instructions.tsx
    - components/rails/rail-plan-side-figure.tsx
  key_links:
    - "`ExampleRailFigure` renders through `RailSectionPlot` with `fit=\"height\"`, whose SVG style is `height: 100%; width: auto`. A percentage height only resolves against an ancestor with a DEFINITE height. Card 1's `h-[350px]` is what supplies that definite height; the inner `flex min-h-0 flex-1 items-center justify-center` box must stay exactly as it is so the remaining space under the heading becomes the plot's height. Remove either half and the plot returns to 0x0."
    - "`flex-none` (not just dropping `flex-1`) is what stops card 1 shrinking below 350px inside the scroll column — a default `flex-shrink: 1` item in an overflowing flex column still collapses."
    - "The width cap must be DERIVED from the height cap and the two existing layout constants (`FIGURE_MAX_RENDERED_HEIGHT * FIGURE_CONTENT_WIDTH / FIGURE_HEIGHT`), never hand-typed, so it can never drift out of the 499:630 ratio the ported column widths already sum to."
    - "The cap belongs on the `@container` aspect-ratio div, not the outer light card. The label font is `clamp(9px, 3.2cqw, 20px)` measured against that container: capped at 373.85px it computes to 11.96px, which is the prototype's own 16px x 0.7492 = 11.99px. Cap the outer card instead and the labels would size off the wrong box."
    - "`components/summary/rail-instructions-sheet.tsx` imports and renders both of these figures for the order form's third printed sheet. It is NOT edited by this task; it inherits both size changes. `rail-instructions-sheet.test.ts` is a source-contract test over that file's text, so it stays green untouched — but the printed sheet's appearance genuinely changes and must be looked at."
    - "`lib/units-isolation.test.ts` walks `components/rails/rail-plan-side-figure.tsx` as a print-surface file and fails it if the source ever names 25.4 or 2.54. The new constants are CSS pixel sizes of a drawing on a page, not board dimensions, and carry no conversion factor — the same standing exception `components/summary/use-print-fit.ts` holds by name."
---

<objective>
Size the rails INSTRUCTIONS tab's two figures the way the prototype sized them, so a shaper can
actually see them: give the "Understanding Rail Markings" card the prototype's own fixed height so
its example rail has a box to draw in, and cap the "Turning Marks Into Rail Bands" figure at the
size the prototype rendered it, so the whole example board is on screen at once.

Purpose: the shaper opened the tab that is supposed to teach the rail marks and found the first
drawing missing entirely and the second one so large that only the nose of the example board was on
screen. Both come from the same root cause — the port sized these figures by how wide their column
happened to be, and let the column scroll. The prototype never did that: it fixed card 1 at 350px
and drew the plan/side figure into a 500px-tall box at a fixed 472px tall. This restores both.

Output: two class/style changes across two files, one commit each. No new component, no new
dependency, no test file edited, and no change to any number the app calculates or displays.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

@components/rails/rail-instructions.tsx
@components/rails/rail-plan-side-figure.tsx
</context>

<design_decision>

## Why card 1 gets a fixed height instead of a bigger share of the column

The tab body is a scrolling flex column (`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto`).
Card 1 is currently `flex min-h-0 flex-1 flex-col ...` inside it. In a flex column that is ALREADY
overflowing — card 2 alone measures 1644px — there is no free space for `flex-1` to claim, so
card 1 resolves to its content height (42px: heading and subtitle) and its `min-h-0 flex-1` figure
box resolves to 0. The example rail's SVG is `height: 100%` of that, so it draws at 0x0 and
disappears. This is not a rendering bug in the plot; the plot is being handed a zero-height box.

Growing card 1's share does not fix it, because a percentage height inside a scrolling column has
nothing definite to resolve against. A definite height does. The prototype already made exactly
that choice — `height: 350px; display: flex; flex-direction: column` on this same card
(`reference/project/Rails.dc.html` line 359) — so the fix is to port the height that was left out,
not to invent a new sizing scheme.

## Why the plan/side figure gets a maximum size rather than a percentage of its column

The port's standing note (UI-SPEC "The figure's fit", and CONTEXT.md under D-01) said to render the
prototype's fixed 499x630 layout as "a box that fits its container's available width/height"
instead of reproducing its hard-coded 0.7492 transform. The implementation fits WIDTH only, so at a
1052px-wide column the figure renders 1052x1328 and the column scrolls. That is the outcome the
shaper has now overruled: the whole example board has to be visible at once, which is what the
prototype delivered — 373.87 x 472px inside a 500px-tall box, centred, with the legend above it.

So the box keeps its responsive behaviour and gains a ceiling: it still fits the container's width,
up to the prototype's own rendered size. Below that width nothing changes. This is a `maxWidth` on
the existing aspect-ratio box, NOT a re-introduced CSS transform — the aspect box already scales the
PNG, both SVG overlays, the labels and the note together, and a transform would additionally break
the container query the label font depends on.

The cap is expressed as a height (472px = 630 x 0.7492, the prototype's own rendered height) with
the width derived from it through the existing constants, because the height is the number the
shaper cares about — it is what decides whether the board fits on screen.

## Why the printed sheet is not edited but must be looked at

`components/summary/rail-instructions-sheet.tsx` composes these two figures deliberately, so that
"the printed sheet can never drift from the screen that explains it" (D-08). That is working as
designed here: both size changes reach the printed third sheet with no edit to the sheet. Its test
is a source-contract test over the sheet's own text and stays green untouched. But the sheet's
printed appearance really does change — the plan/side figure will now sit centred at 374px wide on
a Letter page instead of filling the sheet's width — so the executor records that, and the shaper
looks at a print preview before this is called done.

</design_decision>

<tasks>

<task type="auto">
  <name>Task 1: Give the example-rail card the prototype's own 350px height so its plot draws again</name>
  <files>components/rails/rail-instructions.tsx</files>
  <read_first>
    - `components/rails/rail-instructions.tsx` lines 133-154 — the tab body's scroll column and
      card 1, including the inner figure box on line 151 and `ExampleRailFigure` on line 152.
    - `components/rails/rail-section-plot.tsx` lines 84-89 and 314-321 — the `fit` prop's doc and
      the `fit === "height"` SVG style (`height: 100%, width: auto, maxWidth: 100%`), which is why
      an ancestor with a definite height is required.
    - `reference/project/Rails.dc.html` line 359 — the prototype's own card:
      `height: 350px; display: flex; flex-direction: column`.
  </read_first>
  <action>
Change card 1's container element only — the div on line 135 that opens
"Understanding Rail Markings".

Its className is currently:
`flex min-h-0 flex-1 flex-col gap-3 rounded-lg border border-surf-line-faint p-5`

Make it:
`flex h-[350px] flex-none flex-col gap-3 rounded-lg border border-surf-line-faint p-5`

Every other class stays byte-for-byte, in that order. `flex-none` matters as much as the height:
a plain flex item still has `flex-shrink: 1`, so without it the card would compress below 350px in
the overflowing column and the figure would collapse again.

Do NOT touch anything else in the card. The inner figure box keeps
`flex min-h-0 flex-1 items-center justify-center` exactly as it is, and `ExampleRailFigure` keeps
`fit="height"` in its own file — those two are what turn the space left under the heading into the
plot's height. The heading row, the Flat/Domed toggle, the subtitle line and its thickness reading
are all unchanged.

Add a short comment immediately above that div saying why the height is fixed: it is the
prototype's own card height (Rails.dc.html line 359), and it is fixed rather than proportional
because a proportionally-sized card collapses to nothing inside a column that is already
overflowing, which is what left the example rail undrawn. Also amend the file's header comment
where it introduces card 1, so the "Understanding Rail Markings" clause names the fixed height as
ported from the prototype rather than leaving a reader to wonder why one card is sized and the
other two are not.

Write both comments in plain English about what a shaper sees, per CLAUDE.md — the drawing was
missing, and this is the box it needed.

Do not add, remove or reorder any element. Do not edit card 2, card 3, any test file, or any file
outside `components/rails/rail-instructions.tsx`.
  </action>
  <verify>
    <automated>grep -q 'flex h-\[350px\] flex-none flex-col gap-3 rounded-lg border border-surf-line-faint p-5' components/rails/rail-instructions.tsx && grep -q 'flex min-h-0 flex-1 items-center justify-center' components/rails/rail-instructions.tsx && grep -q 'fit="height"' components/rails/rail-instructions.tsx && npx vitest run components/rails components/summary components/viewer lib/units-isolation.test.ts 2>&1 | tail -8</automated>
    <human-check>On the rails screen's INSTRUCTIONS tab, the first card stands about 350px tall and the example rail is drawn inside it, at a readable size with its mark names beside it — in both the Flat and the Domed state of the toggle.</human-check>
  </verify>
  <done>Card 1 carries the fixed 350px height and cannot shrink; its inner figure box and the plot's
  `fit="height"` are untouched; the example rail draws at a real, non-zero size in both toggle
  states. The rails, summary, viewer and units-isolation suites are green with no test file edited.
  Committed on its own, with a plain-English subject such as
  `fix(quick-260908-adg): the example rail on the INSTRUCTIONS tab draws again, in a card the prototype's own height`.</done>
</task>

<task type="auto">
  <name>Task 2: Cap the plan and side figure at the prototype's rendered size so the whole board is visible</name>
  <files>components/rails/rail-plan-side-figure.tsx</files>
  <read_first>
    - `components/rails/rail-plan-side-figure.tsx` lines 3-16 (the header comment, including the
      sentence about fitting the container's width), lines 78-95 (the layout constants and
      `widthPercent`), lines 115-118 (`LABEL_FONT_SIZE`), lines 128-135 (the outer light card and
      the `@container` aspect-ratio box).
    - `reference/project/Rails.dc.html` lines 415-417 — the prototype's own box
      (`height: 500px; padding: 14px; overflow: hidden`, contents centred) holding a
      `373.87px x 472px` frame, in which the 499x630 layout is drawn at 0.7492.
  </read_first>
  <action>
Add two named constants directly after the existing `FIGURE_CONTENT_WIDTH` declaration (they must
come after it, since the width is derived from it):

- `FIGURE_MAX_RENDERED_HEIGHT = 472` — the height the prototype actually rendered this figure at
  (630 x 0.7492, inside its own 500px-tall box).
- `FIGURE_MAX_RENDERED_WIDTH` — derived as
  `(FIGURE_MAX_RENDERED_HEIGHT * FIGURE_CONTENT_WIDTH) / FIGURE_HEIGHT`, which lands on 373.85px,
  the prototype's own frame width. Derive it; never type the number.

Apply `FIGURE_MAX_RENDERED_WIDTH` as `maxWidth` in the inline style of the existing
`@container relative mx-auto w-full` div, alongside the `aspectRatio` it already carries. Nothing
else in that div or below it changes: the box keeps its 499:630 proportions, so the plan PNG, both
SVG overlays, the station labels and the taper note all shrink together exactly as they do now, and
`mx-auto` centres the capped box the way the prototype centred its frame.

The cap goes on that inner box and nowhere else. The outer light card keeps `mx-auto w-full` and
stays full width — the prototype's own box was full width, 500px tall, with its contents centred.
Do not cap the outer card, and do not re-introduce a CSS transform that shrinks the whole figure
(the prototype's hard-coded 0.7492 factor): the aspect box already does that job, and a transform
would also detach the container query that sizes the labels.

Say in a comment on the new constants why the label font needs no change: `LABEL_FONT_SIZE` is
`clamp(9px, 3.2cqw, 20px)` against this same container, so at the capped 373.85px it computes to
11.96px — which is the prototype's own 16px label at its own 0.7492 rendering. The cap therefore
brings the labels to the prototype's size automatically.

Rewrite the header comment's sentence that currently says the figure "lays the four columns out as
one box that scales to its container's width (never the prototype's own hard-coded `0.7492`
transform...)". It now fits the container's width UP TO the prototype's own rendered size, and the
reason is the shaper's: the whole example board has to be visible at once, not just its nose. Keep
the rest of that comment as it stands.

These are CSS pixel sizes of a drawing on a page, not board dimensions — no value here goes through
`lib/geometry/units.ts`, and no conversion factor is introduced (`lib/units-isolation.test.ts`
walks this file as a print surface and would fail it if one were).

Note in the SUMMARY that `components/summary/rail-instructions-sheet.tsx` renders this same
component for the order form's printed third sheet, so the printed figure is now capped at the same
size — the printed sheet is deliberately NOT edited, it inherits the change.

Do not edit any test file, `components/summary/*`, `components/template/*`, `lib/geometry/*`, or
`components/rails/rail-reference-paths.ts`. Do not delete any tracked file.
  </action>
  <verify>
    <automated>grep -q 'FIGURE_MAX_RENDERED_HEIGHT = 472' components/rails/rail-plan-side-figure.tsx && grep -q 'FIGURE_MAX_RENDERED_HEIGHT \* FIGURE_CONTENT_WIDTH' components/rails/rail-plan-side-figure.tsx && grep -q 'maxWidth' components/rails/rail-plan-side-figure.tsx && [ "$(grep -v '^ *\*' components/rails/rail-plan-side-figure.tsx | grep -v '^ *//' | grep -c 'scale(')" -eq 0 ] && npx vitest run components/rails components/summary lib/units-isolation.test.ts 2>&1 | tail -8</automated>
    <human-check>On the INSTRUCTIONS tab, the whole example board in "Turning Marks Into Rail Bands" is visible at once without scrolling the figure — it sits centred in its light card, no taller than 472px, with the station labels and the taper note readable. Narrowing the browser makes it shrink, not overflow. On the Summary screen's print preview with the rail instructions sheet turned on, the third sheet shows both figures at that same size and nothing runs off the page.</human-check>
  </verify>
  <done>The figure is capped at 472px tall and about 374px wide, derived from the existing layout
  constants rather than hand-typed; the cap sits on the container-query aspect box; no CSS transform
  was added; the header comment now states the fit rule accurately. The rails, summary and
  units-isolation suites are green with no test file edited. Committed on its own, with a subject
  such as
  `fix(quick-260908-adg): the plan and side figure shows the whole example board at once, at the prototype's own size`.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| shaper's browser → INSTRUCTIONS tab | No input crosses here. Both figures are fixed teaching illustrations with literal inputs; neither reads the design store, the database or any user text. |
| screen component → printed sheet | Both components are reused by the order form's third sheet, so a change on screen reaches paper without a second review. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-adg-01 | Tampering | `components/rails/rail-plan-side-figure.tsx` as a print surface | medium | mitigate | A size change to a shared component silently alters the printed reference sheet a shaper cuts foam against. Mitigated by keeping `components/summary/rail-instructions-sheet.tsx` unedited (so `rail-instructions-sheet.test.ts`'s source contract still binds), running that suite plus `lib/units-isolation.test.ts` in both tasks' gates, and requiring a print-preview look in Task 2's human check before this is called done. |
| T-adg-02 | Tampering | display boundary (`lib/geometry/units.ts`) | low | mitigate | New pixel constants next to a units-sensitive file could invite an inlined conversion. Mitigated by `lib/units-isolation.test.ts`, which already walks this file as a print surface and fails it if 25.4 or 2.54 ever appears; it runs in both tasks' gates. |
| T-adg-03 | Denial of service | INSTRUCTIONS tab rendering | low | accept | Both changes only bound a layout box; neither adds work per render, per frame or per board. |
| T-adg-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package is installed by this task and none is needed — both edits are CSS classes and inline style values in existing files. |
</threat_model>

<verification>
- `npx vitest run components/rails components/summary components/viewer lib/units-isolation.test.ts`
  green after each task.
- `npm test` fully green at the end. Baseline measured on clean `main` at planning time:
  **41 test files, 2208 passed, 2 skipped (2210)**. No test is added or edited by this task, so the
  counts must come back identical. A changed count means something was edited that should not have
  been.
- `npx tsc --noEmit` clean apart from the two known phantom `LayoutProps` errors, which are not this
  task's and are expected in a worktree.
- `npm run lint` clean.
- `npm run build` is NOT run from a worktree — Turbopack cannot resolve `next` there.
- `git status` shows exactly the two files in `files_modified` changed and nothing deleted.
- The orchestrator measures the result in a browser on localhost after merging: card 1 about 350px
  tall with an example-rail SVG of non-zero width and height, and the plan/side aspect box no taller
  than 472px at desktop width.
</verification>

<success_criteria>
- A shaper opening the INSTRUCTIONS tab sees the example rail drawn, and sees the whole example
  board in the second figure without scrolling it.
- Both figures match the prototype's own rendered sizes: a 350px card, and a 472px-tall figure about
  374px wide, centred.
- The plan/side figure still shrinks below that size on a narrow column instead of overflowing.
- The figure's labels land at roughly 12px with no font value edited, because the container query
  follows the capped box.
- The printed third sheet carries both figures at the same sizes, with its own file untouched.
- Two commits, one per task, each with a subject a shaper could read.
- No test file, geometry file, template file or summary file is edited, and no tracked file is
  deleted.
</success_criteria>

<output>
Create `.planning/quick/260908-adg-size-the-rails-instructions-tab-s-two-fi/260908-adg-SUMMARY.md` when done.

Record in it: the before/after class string on card 1 and the two new constants with their computed
values; the measured `npm test` counts before and after; confirmation that
`components/summary/rail-instructions-sheet.tsx` and every test file were left untouched, and the
resulting change to the printed third sheet's appearance stated in plain English; and both human
checks with what was seen — including the print preview of the third sheet.
</output>
