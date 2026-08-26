---
phase: quick-260826-kim
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/setup/preset-card.tsx
autonomous: true
requirements: [QUICK-260826-kim]

estimate:
  tokens: 30000
  raw_tokens: 30000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "On the landing page, each board card now shows a faint hairline where the sand frame meets the white window inside it — a line on the inside edge of the sand border, which is exactly what the founder asked for."
    - "The line already around the board's own surface is untouched. There are now two faint lines on the card, one inside the other. That is the intent, not a duplicate."
    - "The board drawing keeps its exact 340:620 upright proportion, nothing is cropped, and the four cards still sit four-across on a wide window."
    - "The card still paints no line around its outside at rest, and hovering it or tabbing to it still lights up the accent edge and the accent ring."
    - "No new colour and no new token: this reuses --surf-line-faint, which already exists and is already wired to all four themes."
    - "The Continue Current Board card is untouched — it has no window to put a line inside — and the two cards' outer frames still match each other exactly."
    - "npm test and npm run lint are green."
  artifacts:
    - components/setup/preset-card.tsx
    - .planning/quick/260826-kim-faint-line-on-the-inside-edge-of-the-lan/260826-kim-SUMMARY.md
  key_links:
    - "The ONLY element that changes is the middle `<div>` in preset-card.tsx — the window box, currently `rounded-lg bg-surf-tab-active p-3`. Nothing above it or below it in the nesting is touched."
    - "The card button's `border border-transparent` slot must survive untouched. `hover:border-surf-accent-ink` and `focus-visible:border-surf-accent-ink` set colour only, not width, so removing or re-colouring that slot silently kills both interactive states. It was set to transparent deliberately in 260826-k5o — do not restore a resting colour on it."
    - "The well's own `border border-surf-line-faint` + `overflow-hidden` must survive untouched. That is the line from the founder's previous spec and it is already correct."
    - "MEASURED, and the single most important fact in this plan: --surf-ground, --surf-tab-active and --surf-panel hold the SAME hex in all four themes (Daylight/Chalk #ffffff, Slate #12141a, Phosphor #050805). --surf-canvas is the only distinct surface. So the six-layer stack renders as page colour -> sand -> line -> page colour -> line -> page colour -> board: the two hairlines are doing ALL of the separating work. Anyone who 'simplifies' either line away deletes the card's entire structure."
    - "MEASURED contrast for the new line against the two surfaces it sits between (canvas outside, tab-active inside): Daylight 3.01 / 4.13, Chalk 3.01 / 4.13, Phosphor 3.07 / 3.80 — all clear the 3:1 non-text bar. Slate is 1.43 / 1.56 and FAILS it on both sides. See the Slate note in Task 2; the SUMMARY must surface it."
---

<objective>
Draw a faint hairline on the inside edge of the landing card's sand frame — the boundary
between the sand band and the white window box that holds the board drawing.

Purpose: the founder has looked at the rebuilt card (260826-k5o) and wants one more edge,
verbatim: "still needs a faint line on the inside of the canvas colored border." The sand
band is that "canvas colored border"; the inside of it is where it meets the window box.
So the window box gains a border.

Output: one className edit in `components/setup/preset-card.tsx`, its now-stale docstring
and inline comment rewritten to describe the stack as it actually is, and a four-theme
browser verification.

The stack after this task, outermost first:
page (`--surf-ground`) -> sand frame (`--surf-canvas`, 12px band) -> **new faint line** ->
window (`--surf-tab-active`, 12px band) -> existing faint line -> panel (`--surf-panel`) ->
board.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.claude/CLAUDE.md
@components/setup/preset-card.tsx
@components/viewer/tabbed-panel.tsx
</context>

<decisions_already_made>
Do not re-open these. They were settled by measurement before this plan was written.

1. **The token is `--surf-line-faint`, not `--surf-line`.** The founder said "a faint line",
   and a specific instruction outweighs an inference from the design screens. In three of the
   four themes the two tokens hold the SAME value anyway (Daylight and Chalk `#897c58`,
   Phosphor `#3e783e`), so this is pixel-identical to the design-screen treatment there. Slate
   is the only theme where they differ, and Slate is where it costs something — see Task 2.

2. **The window box does NOT get `overflow-hidden`.** A border paints on the box's own edge
   and changes nothing about where its children sit. The window's only child is the well,
   which is already `overflow-hidden` and `rounded-lg` and clears the window's rounded corners
   by the full 12px inset on every side, so there is nothing for a second clipping context to
   protect. The 260826-k5o argument therefore still holds unchanged: a second clipping context
   here could only ever crop the board silently later. Leave it `visible`.

3. **The well keeps its existing faint line.** Two nested faint lines is the target state.

4. **The card button's resting edge stays transparent.** Do not restore a resting colour.

5. **`ContinueBoardCard` gets nothing from this task** and is not edited. It has no window box,
   by explicit decision in 260826-k5o.
</decisions_already_made>

<tasks>

<task type="tracer">
  <name>Task 1: Draw the line, and correct the comments that now describe the wrong card</name>
  <files>components/setup/preset-card.tsx</files>
  <reversibility rating="reversible">One className edit plus prose; `git revert` restores the previous card exactly.</reversibility>
  <action>
Make exactly one markup change. The middle `<div>` — the window box, currently
`className="rounded-lg bg-surf-tab-active p-3"` — becomes
`className="rounded-lg border border-surf-line-faint bg-surf-tab-active p-3"`.

That class ordering is not arbitrary: it matches the well on the line below it and the inner
content card in `components/viewer/tabbed-panel.tsx`, so all three of the app's window-inside-
a-frame boxes read the same way in a diff. Use it verbatim.

Touch nothing else in the markup. The card `<button>`'s className string is not edited. The
well's className string is not edited. `ContinueBoardCard` is not opened.

Then rewrite the file's two blocks of prose, which 260826-k5o wrote to describe a card that had
one drawn line and now has two. Both are load-bearing documentation, and both are currently
wrong in ways that would actively mislead the next editor:

The head-of-file docstring still asserts that the sand band alone is the card's boundary.
Correct it: the sand band is still the card's OUTER boundary and still paints no resting edge,
but its inner edge is now drawn.

The inline comment above the `return` is the badly stale one. It opens with a layer count that
is now short by two, and it contains an explicit instruction not to add an edge to the window
box — which is precisely what this task adds. Rewrite it to carry these facts, in the file's
existing voice and at its existing density (this file uses long explanatory comments; match
that, but do not pad):

  - the stack, outermost first, as listed in this plan's `<objective>`
  - that `--surf-ground`, `--surf-tab-active` and `--surf-panel` hold the same value in all
    four themes and `--surf-canvas` is the only distinct surface, so the two hairlines are
    doing all of the separating work. This is the fact most likely to be "fixed" by someone
    who has not measured it, and it is why neither line may be simplified away.
  - WHY this new edge is `line-faint` and not the `--surf-line` its design-screen counterpart
    in `tabbed-panel.tsx` uses: the founder asked for a faint line; the two tokens are the same
    value in three of four themes, so the choice only shows up in Slate. Record the measured
    Slate numbers (1.43:1 against canvas, 1.56:1 against tab-active, versus 3.39:1 and 3.70:1
    if it were `--surf-line`) so a future editor can see the cost rather than rediscover it.
  - the still-true warning that the card's resting outer edge must stay transparent because
    the hover and focus-visible states set colour only, not width.

Delete the sentence instructing that the window box carry no edge — it is now false, and a
false instruction in a comment is worse than no comment.
  </action>
  <verify>
    <automated>grep -c 'rounded-lg border border-surf-line-faint bg-surf-tab-active p-3' components/setup/preset-card.tsx</automated>
    <automated>grep -c 'overflow-hidden rounded-lg border border-surf-line-faint bg-surf-panel' components/setup/preset-card.tsx</automated>
    <automated>grep -c 'border border-transparent bg-surf-canvas' components/setup/preset-card.tsx</automated>
    <automated>grep -c 'Four layers' components/setup/preset-card.tsx</automated>
    <automated>npm run lint</automated>
    <automated>npm test</automated>
  </verify>
  <done>
The first three greps return 1 (window box now has the line; the well's line and the card's
transparent edge slot both survived untouched). The fourth returns 0 (the stale layer count is
gone). `npm run lint` and `npm test` are green. `git diff --stat` shows one file changed.
  </done>
</task>

<task type="auto">
  <name>Task 2: Measure the card in all four themes and prove nothing else moved</name>
  <precondition>The dev server is running on localhost:3000 (`npm run dev`) and a browser can be driven against it.</precondition>
  <files>(no source edits — measurement only)</files>
  <action>
Open the landing page at `http://localhost:3000/` in a wide window, so the preset grid is at
its four-across breakpoint.

**Measure the rendered values, do not read class names back.** Reading a className proves the
string is in the DOM; it does not prove the browser painted a line. Use `getComputedStyle` on
the window box and report `borderTopWidth`, `borderTopStyle` and the resolved `borderTopColor`
as an rgb triple, alongside the resolved `backgroundColor` of the sand frame outside it and of
the window box itself.

**Geometry — compare against a prediction, not against "unchanged".** The line WILL make the
well 2px narrower, and that is correct, not a regression: the window box is a block that fills
its parent's content width, `box-sizing: border-box` applies, so its own width is unchanged at
467px while its content box loses one pixel to each new border. Predicted, from the measured
`260826-k5o` baseline of card 493 -> window 467 -> well 443:

  - card border-box width: 493px (unchanged)
  - window box border-box width: 467px (unchanged — this is the load-bearing one)
  - well border-box width: 441px (was 443px — exactly the two new border pixels)
  - well aspect ratio: 0.5484 (UNCHANGED — this is the real pass/fail signal)
  - card height: about 4px shorter, since the well is aspect-constrained
  - the grid still lays out four cards across, with no wrap and no reflow

A well aspect ratio that is no longer 0.5484, a window box that is no longer 467px, a clipped
or squashed board, or a grid that reflowed are each a failure — stop and report rather than
adjusting padding to compensate.

Confirm the board drawing is not clipped: the SVG should still sit 1px inside the well (the
well's own border), with no new clipping at the window box's edge.

**All four themes**, and do the softest first so the worst case is seen while attention is
fresh: **Slate**, then Phosphor, then Daylight, then Chalk. Switch themes via the nav's
settings gear. In each theme record the resolved line colour and both neighbouring surface
colours, and state plainly whether the line is actually visible on screen.

Expect this, from the ramp values in `app/globals.css` (already computed — you are confirming,
not deriving):

  - Daylight  line `#897c58`  3.01:1 against canvas `#dfdcd3`, 4.13:1 against window `#ffffff`
  - Chalk     identical to Daylight
  - Phosphor  line `#3e783e`  3.07:1 against canvas `#142414`, 3.80:1 against window `#050805`
  - Slate     line `#333842`  1.43:1 against canvas `#1a1d25`, 1.56:1 against window `#12141a`

**The Slate result is the point of this task.** 1.43:1 is far below the project's 3:1 non-text
bar, and it is the same regime `tabbed-panel.tsx`'s own docstring describes as "present in the
DOM and invisible on screen" — the finding that moved the design panel's edge off `line-faint`
in 260825-pkq. So look at Slate honestly and say whether the line reads as a line, reads as a
smudge, or cannot be seen at all. Do not soften the answer to match the plan's expectation.

**Interactive states.** The cards carry `transition-colors` at 0.15s, which has already caused
one false alarm in this series. So trigger and read in SEPARATE calls: hover the card in one
call, then read the computed `borderTopColor` and `boxShadow` of the button in the next.
Repeat for keyboard focus (Tab to the card). Both must resolve to the accent colour, and the
2px accent ring must be present.

**Parity gate.** The two card components' outer `<button>` className strings were byte-identical
before this task and no test enforces it — only their docstrings do. Diff the two strings and
confirm they still match. If they do not, this task broke something it was not supposed to
touch.
  </action>
  <verify>
    <automated>diff <(grep -o 'flex w-full flex-col gap-2 rounded-xl[^"]*' components/setup/preset-card.tsx) <(grep -o 'flex w-full flex-col gap-2 rounded-xl[^"]*' components/setup/continue-board-card.tsx) && echo BUTTON_CLASSNAMES_IDENTICAL</automated>
    <automated>git diff --name-only | tr '\n' ' '</automated>
    <human-check>In the browser: the window box's computed border resolves to a real 1px solid line in all four themes; well aspect ratio is still 0.5484 and the window box is still 467px wide; the board is not clipped; the grid is still four across; hover and keyboard focus both still paint the accent edge and the 2px accent ring.</human-check>
  </verify>
  <done>
The className parity check prints BUTTON_CLASSNAMES_IDENTICAL and `git diff --name-only` lists
only `components/setup/preset-card.tsx`. All four themes measured and recorded with their line
and surface colours. Geometry matches the prediction: window box 467px, well 441px, aspect
0.5484, board unclipped, grid four across. Hover and focus-visible both confirmed painting the
accent, each read in a call separate from the one that triggered it. The Slate visibility
verdict is written down in plain words.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none introduced) | This task adds one CSS class to one presentational `<div>`. It crosses no trust boundary, reads no user input, adds no dependency, and touches no data path. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-kim-01 | Tampering | package manager installs | low | accept | No packages are installed by this task; no legitimacy gate is required. |
| T-kim-02 | Denial of Service | landing page render | low | accept | A 1px border on a block element adds no layout or paint cost of consequence; Task 2's geometry check confirms no reflow. |
</threat_model>

<verification>
1. `npm test` green — the geometry suites and the palette-adjacent tests are unaffected but must
   stay green.
2. `npm run lint` green.
3. Task 1's four greps return 1, 1, 1, 0.
4. Only `components/setup/preset-card.tsx` appears in `git diff --name-only`.
5. Four-theme browser measurement recorded, softest (Slate) first, with the visibility verdict
   stated plainly.
6. Geometry matches the prediction — window box 467px, well 441px, aspect 0.5484, four across,
   board unclipped.
7. Hover and focus-visible confirmed still painting the accent edge and ring, each read in a
   separate call from the one that triggered it.
8. The two cards' outer button className strings still byte-identical.

**No palette or contrast test exists.** `lib/design/palette.test.ts` was removed. Do not
reinstate it and do not tell the founder to run it — the contrast numbers in this plan were
computed by hand and are confirmed by looking at the screen.
</verification>

<success_criteria>
The landing card shows a faint hairline where the sand frame meets the white window, in every
theme where that line is visible at all; the board drawing and the grid are untouched; hover and
focus still work; the file's comments describe the card that now exists.
</success_criteria>

<output>
Create `.planning/quick/260826-kim-faint-line-on-the-inside-edge-of-the-lan/260826-kim-SUMMARY.md`
when done.

Write it in plain English, for a shaper and not a developer: what changed on the screen, not
which element got which class.

**The SUMMARY must lead with the Slate trade-off**, because it is the one thing the founder may
want to change and it costs him one word to change it:

> The new line uses the app's faintest line colour, because you asked for a faint line. In three
> of the four themes — Daylight, Chalk and Phosphor — that is the exact same colour the design
> screens use for the equivalent edge, so the card matches them pixel for pixel. Slate is the
> exception: there the faint colour is much darker than the design screens' edge (measured 1.43:1
> against the sand, where 3:1 is the point a line becomes reliably visible), so on Slate this new
> line is very quiet — [state here what it actually looked like]. If you want it to read the same
> on Slate as it does on `/design/rails`, say so and it becomes a one-word change: `line-faint`
> to `line`, which alters nothing in the other three themes.

Fill the bracketed part with what was actually seen on screen in Task 2, not with what was
predicted.

Also record: that the well got 2px narrower and the card about 4px shorter, which is simply the
new line's own thickness and not a change to the board's proportions; and that there are now two
faint lines nested on the card, which is intended.
</output>
