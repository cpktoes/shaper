---
phase: quick-260909-oge
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/viewer/readout-placement.ts
  - components/viewer/readout-placement.test.ts
  - components/outline/outline-viewer.tsx
  - components/rocker/rocker-viewer.tsx
  - components/viewer/drag-readout-chip.test.ts
  - e2e/touch-drag.spec.ts
autonomous: true
requirements: [QT-260909-oge, PHON-04, PHON-05, TEST-01]

estimate:
  tokens: 120000
  raw_tokens: 86000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "On a phone, while a finger is shaping a control point on TEMPLATE, the little card of numbers never sits on top of the board. It steps out sideways, clear of the outline, and the curve being shaped stays in plain sight the whole time."
    - "Same on ROCKER: the card steps clear of the side profile — the rocker curve and the deck line above it — instead of sitting across the band."
    - "The card stays level with the finger. It only moves ACROSS the board, so it still reads at the height (the station) the thumb is working at, and a shaper's eye does not have to travel to find it."
    - "It goes to whichever side of the board the finger is nearer — thumb on the left rail, card to the left — so it never crosses the board to get out of the way."
    - "If that side has no room in the drawing, it goes to the other side; if neither side has room, it goes past the nose or the tail, whichever is nearer; and if nothing at all fits, it stays exactly where it sits today rather than doing something worse."
    - "A card that was already clear of the board does not move one unit. A remote drag with the thumb parked in an empty corner (yesterday's tap-to-pick work) still shows the card riding right beside the thumb, exactly as it does today."
    - "Nothing changes on a computer driven by a mouse. The card has never existed for a mouse (D-17/PHON-05), so no desktop pixel can move — the five desktop baseline screenshots stay green, unchanged and never regenerated."
    - "No board number changes anywhere. This task moves a label on the screen; every dimension, every calculator in lib/geometry/ and every saved design is untouched."
  artifacts:
    - components/viewer/readout-placement.ts
    - components/viewer/readout-placement.test.ts
    - components/outline/outline-viewer.tsx
    - components/rocker/rocker-viewer.tsx
    - e2e/touch-drag.spec.ts
  key_links:
    - "MEASURED AT PLAN TIME on a real Pixel 7 (headless Chromium, CDP touch, `/design/outline`): today's card genuinely covers the board — 11 of 25 sample points across the card land inside the outline's own fill or stroke during a widepoint drag (8 of 25 with the finger in the middle of the board, 3 of 25 on the nose handle). That 11/25 is the founder's complaint, measured, and it is the number the browser proof drives to zero."
    - "MEASURED: the TEMPLATE draws at 0.6693 screen px per viewBox unit, viewBox `-104 -16 514 638`, board occupying x 94.53..245.47 and y 24..596. Room beside the board: 198.53 units to the left, 164.53 to the right. The standing clearance READOUT_GAP_PX (24px) is 35.86 units at that scale, and the card itself measures 155..194 units wide by 77.70 tall. So on the widest cards the ideal 35.86-unit clearance does NOT fit beside the board (194.09 + 35.86 = 229.95 > 198.53) but the card itself does (198.53 - 194.09 = 4.44). This is why the rule must DEGRADE to sitting flush against the edge of the drawing rather than give up when the ideal clearance will not fit."
    - "MEASURED, and the single most important finding: the bounds the card may use are the VISIBLE drawing, not the viewBox. Both viewers draw `preserveAspectRatio=\"xMidYMid meet\"`, so the viewBox is letterboxed inside the `<svg>` box and the slack on the loose axis is real, paintable space — a probe rect drawn 20 units outside the viewBox on that axis was confirmed painted inside the svg's own client box. TEMPLATE is width-bound (no sideways slack, 22.97 units above and below); ROCKER is height-bound with 65.50 units of slack on EACH side. Clamp the card to the viewBox on ROCKER and the job is impossible: the card is 309.47 units wide, the gap beside the profile inside the viewBox is 289.09 — it does not fit. Allow the visible drawing and the gap becomes 354.59, so the card clears the profile with 45.12 units (22.8 screen px) to spare. Get this wrong and the ROCKER half of this task silently cannot work."
    - "MEASURED (ROCKER, drawn nose-up on a phone): rendered viewBox `-548.36 -1 548.36 902` at 0.5064 px/unit; the side profile is a thin band occupying rendered x -343.90..-289.09 (54.8 units thick) running the whole length y 40..860. Because the band runs the full length of the drawing, moving the card ALONG the board can never clear it — only moving it ACROSS can. Note also that on ROCKER the card sits `above` the finger in RENDERED terms, which with the board drawn nose-up means it sits toward the NOSE, i.e. straight along the band. That is why it grazes the profile today (1 of 25 points) and why sideways is the only fix."
    - "The card is drawn OUTSIDE the rotated content group, as a plain sibling `<g>` in rendered viewBox space, in BOTH viewers — so the silhouette handed to the placement rule must be mapped into that same rendered space through each viewer's own `toViewBoxPoint` before it is compared with the card's box. Compare a card in rendered space against a board in canonical space and the answer is silently wrong in exactly the orientation a phone uses (TEMPLATE nose-up is the identity map, but ROCKER nose-up is a 90-degree rotation, so the mistake shows up only on ROCKER)."
    - "The silhouette must be sampled AT THE STATIONS THE CARD SPANS, never taken as the board's overall bounding box. On TEMPLATE the nose handle's card sits up by the tip where the outline is only a few units wide — the local reading leaves it plenty of room, while the overall bounding box would wrongly report the board's widest point and shove the card further than it needs to go (or declare there is no room at all)."
    - "`components/viewer/drag-readout-chip.test.ts` strips comments and then asserts the viewers contain no bare `25.4`, no `dangerouslySetInnerHTML`, and that the identifier `touchDragTarget` appears more than three times per viewer. Keep that state's name and route every measurement through existing helpers. `components/viewer/drag-pick-wiring.test.ts` separately asserts EXACTLY ONE `onPointerDown` per viewer and no `onMouseDown`/`onTouchStart` handlers — this task adds no pointer handlers at all, so both stay green untouched."
    - "The five desktop baseline screenshots (`e2e/desktop-baseline.spec.ts-snapshots/`) are macOS-rendered, local-only, and are NEVER regenerated by this task. They stay green by construction: the card is built only when `touchDragTarget` is set, and only a `pointerType === 'touch'` branch ever sets it, so a mouse cannot produce one pixel of it."
    - "Green baseline on `main` at plan time: `npx vitest run` = 50 test files, 2370 passed, 2 skipped. This task adds exactly one unit test file, so the file count goes 50 -> 51 and no existing test's expectations change."
    - "NOTE for the executor: another session was working in this checkout while this plan was written, and it landed a diamond-tail pinned-angle fix (`6067644`) that edits `outlineReadoutLines` in `components/outline/outline-viewer.tsx`. Branch the worktree from the NEWEST `main`, not from the commit this plan was written against, and expect the tail handle's card to return one line or two depending on `geometry.tailAnglePinned`. That is upstream of the card's PLACEMENT code this task edits and does not conflict with it — but it does mean the card's width varies with the tail shape, which is one more reason the placement rule must measure the box it is actually given rather than assume a size."
    - "NOTE for the executor: a separate plan (`ef2110f`, quick 260909-oho) proposes removing the phone's `Fine adjust` fold. Several EXISTING cases in `e2e/touch-drag.spec.ts` open that disclosure with `getByRole('button', { name: 'Fine adjust' })`. If that work has landed by the time this task runs, those cases will already have been updated by it — leave them as you find them. None of the three cases THIS task adds needs the sidebar at all: they read the card and the board path out of the drawing itself."
---

<objective>
Keep the little card of numbers that appears while a finger shapes a point OFF the board: outside
the outline on TEMPLATE, outside the side profile on ROCKER — so the curve being shaped is never
under the card.

Purpose: the founder, shaping on his own phone, asked for it in one line — "for the tap sliders,
can we make the data box that appears stay OUTSIDE the outline shape?" Yesterday's tap-to-pick work
(260909-ktq) got his THUMB off the board by letting him shape from an empty corner, and the card
follows the thumb out there. But when he shapes a point directly — thumb straight on it, which is
still the fastest way to grab something — the card sits just above his finger, which is to say
right on top of the outline. Measured on a Pixel 7: 11 of 25 sample points across that card land
inside the board. He is watching a shape, and the readout is parked on it.

This is a placement change and nothing else. Same card, same words, same numbers, same formatting
through `measure-display.ts`, still touch-only, still gone the instant the finger lifts (D-17). It
simply steps aside when it would otherwise cover the board.

Output: one small pure module both drawings share
(`components/viewer/readout-placement.ts` — "push this box clear of that silhouette"), its unit
tests, both viewers calling it, and real (CDP) touch tests in the browser suite that put a finger
on the board and prove the card is clear of it. Three commits. Nothing under `lib/geometry/` is
touched, nothing under `components/ui/` is touched, no editor control changes, and on a
mouse-driven desktop not one rendered pixel is different.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@components/viewer/drag-selection.ts
@components/outline/outline-viewer.tsx
@components/rocker/rocker-viewer.tsx
@e2e/touch-drag.spec.ts
</context>

<execution_constraints>
Read this block before the first task and follow it for every task.

- **Work in a git worktree**, branched from `HEAD` on `main`. The founder's checkout has unrelated
  uncommitted work in it (see the last `key_links` note) — do not carry it, do not commit it.
- **`npm install --no-audit --no-fund` once** in the worktree before any Playwright run.
- **Playwright browsers are already installed.** Never run `npx playwright install`.
- **`PW_PORT=3125` on every Playwright invocation**, without exception. Port 3000 is the founder's
  own dev server and port 3100 is the suite's default — never take either.
- **Type-check with `npx tsc --noEmit`.** In a fresh worktree the generated route types may be
  missing; if `tsc` complains about them, run `npx next typegen` once, then re-run `tsc`.
- **Run unit tests with `npx vitest run`** — never bare `vitest` (it watches and hangs).
- **`npm run lint`** before the final commit.
- **Never pass `--update-snapshots`.** The five desktop baseline screenshots must match as they are.
- **Do not edit** `components/ui/*`, any editor control component, or any e2e spec other than
  `e2e/touch-drag.spec.ts`.
- **`npm run build` is the orchestrator's job on `main` after the merge** — do not run it from the
  worktree (Turbopack will not resolve `next` there).
- **Commit subjects in plain English for a shaper** — what the box does on the screen, never which
  component re-renders.
</execution_constraints>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: The number card steps aside instead of sitting on the outline (TEMPLATE, end to end)</name>
  <files>components/viewer/readout-placement.ts, components/viewer/readout-placement.test.ts, components/outline/outline-viewer.tsx, e2e/touch-drag.spec.ts</files>
  <read_first>
    - `components/viewer/drag-selection.ts` — the house style for a shared, pure, React-free
      interaction module in `components/viewer/`, and D-08's own reasoning for why it lives there
      rather than under `lib/geometry/`. Follow both.
    - `components/outline/outline-viewer.tsx` — the card's existing build (search `readoutChip`):
      it sizes the box from the driven lines, anchors it above the finger through `toViewBoxPoint`,
      centres it on the finger and clamps it to the four viewBox numbers. Also read `toViewBoxPoint`
      itself, `pxX`/`lenToY`, `outlineViewMetrics`, and how `outlinePath` is built from
      `geometry.points` (right side, then the mirrored left side, then the centre-close point).
    - `components/viewer/drag-readout-chip.test.ts` — the source-contract assertions that must stay
      green (see the `key_links` note).
  </read_first>
  <behavior>
    Write `components/viewer/readout-placement.test.ts` FIRST and watch it fail, then make it pass.

    The module under test is pure: numbers in, numbers out, no React, no DOM, no `lib/geometry/`
    import. It exports a `Rect` (`x`, `y`, `width`, `height`, in rendered viewBox units, y down), a
    `BoardSection` (`along`, `min`, `max` — one cross-section of the drawn board), a `BoardSilhouette`
    (`alongAxis: "x" | "y"` plus the sections), a helper `boardSection(edgeA, edgeB, alongAxis)` that
    turns two already-mapped viewBox points into one section, a `MIN_CLEARANCE_FRACTION` constant,
    and the rule itself, `placeReadoutClearOfBoard(box, silhouette, idealMargin, bounds, finger)`.

    The rule, in order:
    - Read the box's span along the board and across it, using `alongAxis` to decide which is which.
    - Collect the sections the box could sit over: every section whose `along` falls inside the box's
      own along-span widened by `idealMargin`, plus the nearest section on each side of that window,
      so a box straddling the gap between two samples still sees the board it straddles.
    - No sections collected (the box is already past the nose or the tail) — return the box exactly
      as given, same numbers, same object shape.
    - Take the widest cross-extent over the collected sections. If the box's cross-span does not
      overlap it, the card is already clear — return the box exactly as given.
    - Otherwise slide it across the board. Two candidates: LOW puts the box's far cross edge
      `idealMargin` short of the board's low edge; HIGH puts its near cross edge `idealMargin` past
      the board's high edge. If a candidate runs outside `bounds`, slide it back until it is flush
      with that edge of `bounds` rather than discarding it. Accept a candidate only if the daylight
      left between it and the board is at least `idealMargin * MIN_CLEARANCE_FRACTION`.
    - Try the side the finger's own cross coordinate is nearer to first (ties go LOW); take the
      other if the first is not accepted.
    - If neither side is accepted, keep the cross coordinate and move ALONG instead: BEFORE puts the
      box's far along edge short of the lowest section's `along`, AFTER puts its near along edge past
      the highest — same flush-to-`bounds` degrade, same clearance test, nearer-to-the-finger first.
    - If nothing is accepted, return the box exactly as given. The card stays where it sits today
      rather than doing something worse.
    - Sections may arrive in any order; the rule sorts them itself so a caller cannot get it wrong.

    Tests to write, one per line of behaviour:
    - a box already clear of the board comes back with identical numbers
    - a box over the board with the finger on the low side slides low, and lands exactly
      `idealMargin` clear of the widest section it spans
    - the mirror case with the finger on the high side slides high
    - a box whose nearer side cannot hold the ideal clearance but CAN hold the box degrades to flush
      against `bounds` and still comes back clear of the board
    - a box whose nearer side cannot hold it at all flips to the far side
    - a box with no room on either side moves past the nearer end of the board
    - a box with no room anywhere comes back with identical numbers
    - the same problem posed with `alongAxis: "x"` and with `alongAxis: "y"` gives mirror-image
      answers, so a rotated drawing is served by the same rule
    - sections shuffled into a random order give the same answer as sorted ones
    - a box spanning the gap between two sampled sections still sees the board (the bracketing rule)
    - `boardSection` reads the along coordinate off the named axis and sorts its two cross values
  </behavior>
  <action>
    Create `components/viewer/readout-placement.ts` implementing exactly the behaviour above, with a
    file-header doc comment in the same voice as `drag-selection.ts`: say plainly that this decides
    where a CARD sits and never what shape a board is, which is why it lives beside `drag-selection.ts`
    in `components/viewer/` rather than under `lib/geometry/` (per D-05 below and 260909-ktq's D-08),
    and that both drawings call it so they cannot drift apart. Set `MIN_CLEARANCE_FRACTION` to 0.25
    and explain it: less daylight than a quarter of the standing clearance reads to a shaper as the
    card touching the board, so a placement that tight is not worth taking.

    Then wire the TEMPLATE. In `outline-viewer.tsx`, inside the existing `if (touchDragTarget &&
    touchFingerBoard)` block only — leave every line of the card's sizing, anchoring, centring and
    existing viewBox clamp exactly as it is — add, after the clamp:

    - The board's silhouette in rendered space: map each entry of `geometry.points` to its two drawn
      rail edges (`pxX` of plus and minus the half-width in inches, at `lenToY` of its station), push
      both through `toViewBoxPoint`, and hand the pair to `boardSection` with
      `alongAxis` = `horizontal ? "x" : "y"` (the board's long axis lands on rendered x once the
      content group is rotated). Add one more, degenerate, section for the tail's centre-close point
      (`pxX(0)` at `lenToY(centerCloseIn)`, both edges the same point) so the little closing triangle
      at the tail counts as board too.
    - The visible drawing as `bounds`, NOT the viewBox: read the `<svg>` element's own box off
      `svgRef.current` and divide by `fitScale` to get its size in viewBox units, then centre that on
      the viewBox's own centre (both viewers draw `xMidYMid meet`, so the letterbox slack is even on
      both sides). Fall back to the four viewBox numbers if the element or the scale is not readable.
      This read is deliberately inside the card block, so it happens only while a finger is actually
      down on a touch device and never on any other render — say so in a comment, and say why it
      matters: on ROCKER the slack either side is 65.50 units and the card does not fit beside the
      profile without it.
    - Call `placeReadoutClearOfBoard` with that box, that silhouette, `READOUT_GAP_PX * handleUnit` as
      the ideal margin, those bounds, and the finger's own `anchor` point; assign the returned `x`/`y`
      into `readoutChip`.

    Also add a stable test hook to the board path: `data-board-silhouette="outline"` on the `<path>`
    that draws `outlinePath`. It is a data attribute, so it renders nothing and cannot move a pixel.

    Finally, add one case to `e2e/touch-drag.spec.ts` in the outline describe block (android/CDP only,
    same idiom as its neighbours): find, at run time, a screen point deep inside the board by sampling
    a grid across `[data-board-silhouette="outline"]`'s client rect and asking the path itself which
    samples are inside its fill; start a direct touch drag on the widepoint; move the finger to that
    interior point; then read `[data-readout-chip]`'s client rect, sample a 5x5 grid across it, map
    each sample into the path's own user space through `getScreenCTM().inverse()`, and assert that
    `isPointInFill` and `isPointInStroke` are both false for every one of the 25. Lift the finger and
    assert the card is gone, as its neighbours do. Comment why the check samples the path itself
    rather than comparing rectangles: an outline's bounding box is a rectangle and the outline is not,
    so a box comparison would fail a card that is honestly clear of the curve.
  </action>
  <verify>
    <automated>cd $WORKTREE && npx vitest run components/viewer/readout-placement.test.ts components/viewer/drag-readout-chip.test.ts components/viewer/drag-pick-wiring.test.ts</automated>
    <automated>cd $WORKTREE && npx tsc --noEmit</automated>
    <automated>cd $WORKTREE && PW_PORT=3125 npx playwright test --project=android e2e/touch-drag.spec.ts</automated>
  </verify>
  <done>Every unit test in `readout-placement.test.ts` passes; the two existing viewer source-contract suites still pass untouched; `tsc` is clean; and every case in `e2e/touch-drag.spec.ts` passes on the android project, including the new one proving all 25 sample points across the card sit outside the outline's fill and stroke while a finger shapes a point in the middle of the board.</done>
</task>

<task type="auto">
  <name>Task 2: The same for the ROCKER — the card steps clear of the side profile</name>
  <files>components/rocker/rocker-viewer.tsx, e2e/touch-drag.spec.ts</files>
  <precondition>Chromium is already installed for Playwright in this worktree (`npm install --no-audit --no-fund` has been run; `npx playwright install` is never run here).</precondition>
  <read_first>
    - `components/rocker/rocker-viewer.tsx` — its `readoutChip` block (identical in shape to the
      outline's), its `toViewBoxPoint` (a 90-degree rotation when the board is drawn nose-up, which
      is what a phone in portrait gets), `pxX`/`pxY`, and the `bottomPoints`/`deckPoints` arrays that
      the drawn `boardPath` is built from.
    - `components/rocker/rocker-editor.tsx` around the `boardOrientation` computation — on a phone in
      portrait the board is drawn nose-up, so the browser test below exercises the rotated map.
  </read_first>
  <action>
    Wire the rocker viewer to the same `placeReadoutClearOfBoard`, as a mirror of Task 1's outline
    wiring — same call, same argument order, no second copy of the rule.

    Its silhouette comes free from what the drawing already computed: `bottomPoints[i]` and
    `deckPoints[i]` share a station by construction, so map each pair through `toViewBoxPoint` and
    hand them to `boardSection` with `alongAxis` = `vertical ? "y" : "x"`. Its `bounds` are the
    visible drawing, read the same way as Task 1 — and here that is load-bearing, not a nicety:
    measured on a Pixel 7, the card is 309.47 units wide, the gap beside the profile inside the
    viewBox is 289.09 units (it does not fit) and the gap inside the visible drawing is 354.59 (it
    fits, with 45.12 units — about 23 screen px — to spare). Record that measurement in the comment
    so nobody later "tidies" the bounds back to the viewBox and quietly breaks this screen.

    Add `data-board-silhouette="profile"` to the `<path>` that draws `boardPath`.

    Then add two cases to `e2e/touch-drag.spec.ts`, in its rocker describe block:
    - **The card clears the profile.** Same shape as Task 1's case, against
      `[data-board-silhouette="profile"]`: find a point deep inside the profile at run time, start a
      direct touch drag on the nose tip handle, move the finger onto that interior point, and assert
      all 25 samples across `[data-readout-chip]` are outside the path's fill and stroke.
    - **A card that was already clear still rides the thumb.** Reuse the file's own
      `findEmptyCanvasProbe` helper: tap the nose tip handle to pick it, put a finger down on the
      empty-canvas probe and slide it a little, and assert the card is still centred on the finger
      within a tolerance of a few pixels — proving a placement that was already clear of the board is
      left exactly as yesterday's work put it, and that the new rule only fires when it is needed.
  </action>
  <verify>
    <automated>cd $WORKTREE && npx tsc --noEmit</automated>
    <automated>cd $WORKTREE && PW_PORT=3125 npx playwright test --project=android e2e/touch-drag.spec.ts</automated>
  </verify>
  <done>`tsc` is clean and every case in `e2e/touch-drag.spec.ts` passes on the android project — the seven that existed before this task, Task 1's outline case, and both new rocker cases.</done>
</task>

<task type="auto">
  <name>Task 3: Pin the new rule in place and prove the whole app is still green, computer included</name>
  <files>components/viewer/drag-readout-chip.test.ts</files>
  <precondition>Tasks 1 and 2 are committed in this worktree, and the five desktop baseline screenshots under `e2e/desktop-baseline.spec.ts-snapshots/` are the ones already committed on `main`.</precondition>
  <action>
    Add a small source-contract block to `components/viewer/drag-readout-chip.test.ts`, in the file's
    own existing idiom (read the real viewer source, assert a structural property — neither viewer can
    be rendered in this suite's node environment). Per viewer, assert that it imports
    `placeReadoutClearOfBoard` from `@/components/viewer/readout-placement`, that it calls it, that it
    builds its silhouette through `boardSection`, and that it carries the `data-board-silhouette` hook
    the browser tests depend on. That keeps a future edit from quietly reverting one drawing to the old
    placement while the other keeps the new one — the exact drift the shared module exists to prevent.

    Then run the whole suite and record the numbers in the summary: unit tests, types, lint, and the
    FULL browser suite across all three projects, so the desktop baselines are exercised as they are.
    Say plainly in the summary why the desktop cannot have changed: the card is built only when
    `touchDragTarget` is set, and only a `pointerType === "touch"` branch ever sets it, so a mouse
    never produces one pixel of it — the baselines are a check on that claim, not a thing to update.
  </action>
  <verify>
    <automated>cd $WORKTREE && npx vitest run</automated>
    <automated>cd $WORKTREE && npx tsc --noEmit</automated>
    <automated>cd $WORKTREE && npm run lint</automated>
    <automated>cd $WORKTREE && PW_PORT=3125 npx playwright test</automated>
  </verify>
  <done>`npx vitest run` reports 51 test files with every test passing and no existing expectation changed (the baseline on `main` was 50 files, 2370 passed, 2 skipped); `tsc` is clean; `lint` reports only the 12 pre-existing warnings in files this task never touched; and the full Playwright suite is green across all three projects with the five desktop baseline screenshots matching, unregenerated.</done>
</task>

</tasks>

<decisions>
Recorded so the founder can redirect any of them at review.

| ID | Decision |
|----|----------|
| D-01 | The card only moves when it would actually cover the board. A card already clear of the shape — including a remote drag with the thumb parked in an empty corner — is left exactly where today's code puts it. |
| D-02 | It moves ACROSS the board, not along it, so it stays level with the finger and still reads at the station the thumb is working at. |
| D-03 | It goes to whichever side the finger is nearer, so it never crosses the board to get out of the way; then to the other side if the first has no room; then past the nose or the tail, whichever is nearer; and if nothing fits, it stays put rather than doing something worse. |
| D-04 | The standing clearance is the same `READOUT_GAP_PX` (24px) the card already keeps above the finger — one clearance number, not two. Where the drawing is too tight for it, the card degrades to sitting flush against the edge of the drawing, and is only accepted there if at least a quarter of that clearance survives. |
| D-05 | The rule is a pure function in `components/viewer/readout-placement.ts`, beside `drag-selection.ts` — it decides where a CARD sits, never what shape a board is, so CLAUDE.md's Rule 1 boundary does not apply (following 260909-ktq's D-08). No new geometry helper is needed: both drawings already compute the very points their silhouettes are drawn from. |
| D-06 | The silhouette is handed over as sampled cross-sections in rendered viewBox coordinates, so one rule serves both drawings and both orientations without knowing which is which. |
| D-07 | The card may use the whole VISIBLE drawing, not just the viewBox — the letterbox slack either side of a `xMidYMid meet` drawing is real, paintable space, and on ROCKER the card does not fit beside the profile without it. |
| D-08 | The outline's silhouette includes the little closing triangle at the tail, so that counts as board too. |
| D-09 | Proof in the browser asks the board path itself whether each of 25 sample points across the card is inside its fill or on its stroke, rather than comparing two rectangles — an outline's bounding box is a rectangle and an outline is not. |
| D-10 | Touch only, by construction: the card has never existed for a mouse (D-17/PHON-05), so no desktop pixel can change. The five desktop baselines still run, unregenerated, as the check on that claim. |
</decisions>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| finger -> drawing | A touch position is the only input this task reads, and it is already bounded by the drawing's own hit testing. Nothing crosses a network or storage boundary. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-oge-01 | Tampering | `readout-placement.ts` | low | mitigate | The rule is pure arithmetic over numbers the viewer already computed; it writes no state, touches no design value, and cannot reach a board spec. Unit tests pin every branch. |
| T-oge-02 | Information disclosure | the card's text | low | accept | This task never changes what the card says — the same `measure-display.ts` strings as today, only placed differently. |
| T-oge-03 | Denial of service | the drag path | low | mitigate | The bounds read (`getBoundingClientRect`) is confined to the block that runs only while a finger is down on a touch device; it cannot run on a desktop render or on any render without a live touch drag. |
| T-oge-SC | Tampering | npm/pip/cargo installs | high | mitigate | Not applicable — this task installs no packages. `npm install` in the worktree restores the committed lockfile only. |
</threat_model>

<verification>
- `npx vitest run` — 51 files, all passing, no existing expectation changed.
- `npx tsc --noEmit` — clean.
- `npm run lint` — only the 12 pre-existing warnings.
- `PW_PORT=3125 npx playwright test` — full suite green across iphone, android and desktop.
- `PW_PORT=3125 npx playwright test --project=desktop e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts` — all five baseline screenshots match, unregenerated.
</verification>

<success_criteria>
- On a phone, shaping any point on TEMPLATE with a finger directly on it leaves the card clear of the outline — proved by 25 of 25 sample points sitting outside the path's fill and stroke, against a measured 11-of-25 inside before the change.
- The same on ROCKER, against the side profile.
- The card stays level with the finger, on the side the finger is nearer.
- A card that was already clear does not move, and the remote-drag card still rides the thumb.
- No board number, calculator or saved design changes.
- The desktop is untouched: five baseline screenshots match, unregenerated.
</success_criteria>

<output>
Create `.planning/quick/260909-oge-the-readout-box-that-appears-while-a-fin/260909-oge-SUMMARY.md` when done.
</output>
