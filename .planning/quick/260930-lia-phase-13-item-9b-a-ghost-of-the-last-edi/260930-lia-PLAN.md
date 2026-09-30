---
phase: quick-260930-lia
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/outline-ghost.ts
  - lib/outline-ghost.test.ts
  - components/design/design-store.tsx
  - components/outline/outline-viewer.tsx
  - components/outline/outline-editor.tsx
  - app/globals.css
  - e2e/outline-ghost.spec.ts
autonomous: true
requirements: [QT-260930-lia, 13-SPEC-item-9b]

estimate:
  # One executor in its own git worktree, forked from the commit that carries this plan. Three tasks:
  # - Task 1 (tracer): a ~70-line pure helper with ~150 lines of tests, ~25 lines in the store, ~50 in the
  #   viewer, 2 in the editor, ~20 lines of CSS, the first ~90 lines of a browser spec, desktop runs.
  # - Task 2: ~30 lines in the editor (the toolbar button) and ~90 more spec lines, runs on all three projects.
  # - Task 3: a 6-line print rule, ~150 more spec lines, the full browser suite split by project (~14 min of
  #   wall time, three foreground runs), and the SUMMARY — the heaviest output.
  # estimate-calibration: factor 1, 0 samples, so confidence is low.
  tokens: 140000
  raw_tokens: 140000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "On a board nobody has edited yet (a new board, a preset just started, or a saved board just opened), TEMPLATE looks exactly as it does today: no ghost, no ghost button, the toolbar buttons where they always were, and the desktop reference screenshot unchanged."
    - "After one drag of a point on the drawing, or one slider movement, a thin dashed outline of the board as it was just before that edit is drawn over the board's pale fill and under its dark outline line, behind every grab point, at the same size and in the same place as the live board, so the two shapes compare directly. It turns with the board when the drawing is rotated."
    - "The ghost stays until the next outline edit replaces it, and then shows the shape one edit back. An edit elsewhere that leaves the outline alone (a rocker, rail or fin change) leaves the ghost where it is. Undo steps the ghost back with the board: after undoing the only edit there is no ghost; after two edits, one undo shows the starting shape as the ghost. Redo is never used to pick it. Opening a different board clears it."
    - "Once a ghost exists, a ghost button joins the viewer's toolbar row at its far left, pressed (aria-pressed true, named 'Hide the ghost of the last edit'), and every existing button stays exactly where it was. Pressing it hides the ghost and the button reads 'Show the ghost of the last edit' with aria-pressed false; pressing again brings the same ghost back. The choice is not remembered: a reload, or leaving TEMPLATE and coming back, brings it back on, the same as the construction-lines button."
    - "The ghost never reaches paper or anywhere but TEMPLATE: printing the TEMPLATE screen leaves it off; the home screen's preset cards and the SUMMARY sheet's template windows never draw it (even with a ghost on TEMPLATE at that moment); ROCKER and the other screens have none."
    - "The ghost can never catch a thumb or the mouse (pointer-events none), so grabbing a point that sits on or near the ghost line still shapes the board."
    - "The ghost line reads in all four themes at 3:1 or better against both the panel behind the board and the board's own fill (measured at plan time: Daylight 3.94 / 3.55, Chalk 3.94 / 3.42, Slate 5.30 / 4.60, Phosphor 4.32 / 3.77)."
  artifacts:
    - path: "lib/outline-ghost.ts"
      provides: "pickOutlineGhost (the ghost rule over an undo history) and outlinesMatch (value equality for two outlines)"
      contains: "export function pickOutlineGhost"
    - path: "lib/outline-ghost.test.ts"
      provides: "Unit proof of the ghost rule, including the real recordEdit/undo stacks from lib/design-history.ts"
      contains: "pickOutlineGhost"
    - path: "components/design/design-store.tsx"
      provides: "outlineGhostGeometry on the design context, picked from this session's undo history"
      contains: "pickOutlineGhost(history.past, state.outline)"
    - path: "components/outline/outline-viewer.tsx"
      provides: "The optional ghostGeometry prop and the ghost path drawn inside the rotated group"
      contains: "data-outline-ghost"
    - path: "components/outline/outline-editor.tsx"
      provides: "The ghost toolbar button (local on/off, on by default) and the pass-through to the viewer"
      contains: "GhostIcon"
    - path: "app/globals.css"
      provides: "--outline-ghost and --outline-ghost-dash in the derived outline tokens, and the print rule that hides the ghost"
      contains: "--outline-ghost:"
    - path: "e2e/outline-ghost.spec.ts"
      provides: "Browser proof on iphone, android and desktop"
      contains: "data-outline-ghost"
  key_links:
    - from: "components/design/design-store.tsx"
      to: "lib/outline-ghost.ts"
      via: "useMemo calling pickOutlineGhost over the undo history's past stack and the live outline, then buildOutline on the result"
      pattern: "pickOutlineGhost\\(history\\.past, state\\.outline\\)"
    - from: "components/outline/outline-editor.tsx"
      to: "components/outline/outline-viewer.tsx"
      via: "ghostGeometry prop, passed only by the TEMPLATE editor and only while the toggle is on"
      pattern: "ghostGeometry=\\{"
    - from: "components/outline/outline-viewer.tsx"
      to: "app/globals.css"
      via: "the ghost path's stroke and dash read the two new tokens"
      pattern: "var\\(--outline-ghost\\)"
    - from: "app/globals.css"
      to: "components/outline/outline-viewer.tsx"
      via: "the @media print block hides [data-outline-ghost]"
      pattern: "\\[data-outline-ghost\\]"
---

<objective>
Phase 13 optional item 9b (13-SPEC.md; the founder's todo of 2026-09-27: "add a ghost image on the template page so
that when you edit, you still have a reference of your last edit").

On the TEMPLATE screen, after a shaper drags a point or moves a slider, the outline as it was one edit ago stays on
screen as a thin dashed "ghost" behind the live outline, so every edit becomes a side-by-side comparison: is the nose
fuller now, did the tail get wider. A button in the viewer's toolbar hides it. It is a screen aid only: never printed,
never on the home screen's cards or the SUMMARY sheet, never on any other screen.

Purpose: judging an edit today means remembering the old shape or flicking undo and redo back and forth.

Output: three commits on the executor's worktree branch (never pushed), plus the SUMMARY committed in the worktree.
No new geometry, no new npm package, no database change, no change to how any saved board opens or what it shows.

Scope note for the orchestrator: this fits one plan cleanly. One thing found at plan time is recorded for the founder
rather than fixed here (P-6: on a phone held sideways, the drawing's "Tail @ 12"" read-out already sits mostly under
the Wide view button today). The item stays optional before the Wednesday 2026-10-07 freeze.
</objective>

<decisions>
The founder's decisions (2026-09-30, locked):

- **F-1 — Which shape.** The ghost is the outline as it was ONE EDIT AGO, taken from the undo history: one drag or one
  slider movement back. No "as saved" reference and no pinning.
- **F-2 — It stays, with a hide button.** The ghost stays until the next edit replaces it. A button in the viewer
  toolbar, built with `ViewerToolbarButton` and its `pressed` prop, turns it off. On by default.
- **F-3 — TEMPLATE only.** Nothing on ROCKER or any other screen. Nothing on paper: not the printed order form, the
  Full Sized Template, the Overview Sheet or the Paper Saver. Nothing in the preset-card thumbnails or the order
  form's template windows (the `hideCallouts` consumers of `OutlineViewer`: `components/setup/card-thumbnail.tsx`
  and `components/summary/order-form.tsx`).

The orchestrator's rulings (restated so the executor and the tests agree):

- **O-1 — The exact ghost rule.** The ghost is the outline of the most recent undo-history entry, searching `past`
  from its top (the end of the array) downward, whose outline differs in value from the live outline. When no entry
  differs (a board nobody has edited, a board just opened from the rack or started from a preset, or a history in
  which every step changed something other than the outline) there is no ghost. The redo stack (`future`) is never
  read. Consequences, all pinned by tests:
  1. One drag or one slider movement is one history step (`recordEdit` folds a continuous movement into one entry
     within 500 ms), so after it the ghost is the shape from before it. While a drag is still under way the ghost is
     already the shape from before the drag, a live comparison.
  2. A second outline edit (after a pause longer than 500 ms) moves the ghost on to the shape after the first edit.
  3. An edit on another screen that leaves the outline alone (a rocker, rail, fin or volume change) records a step
     whose outline equals the live one; it is skipped, so the reference a shaper set up on TEMPLATE survives.
  4. **Right after Undo:** the board goes back one step and the ghost goes back with it; it is always the shape one
     outline step back in the history from what is on screen. After undoing the only edit (A to B, then undo), the
     board is A again and there is no ghost. After two edits (A to B to C), one undo shows B with ghost A; redo
     shows C with ghost B again.
  5. Opening a different board (a preset, or a saved board from the rack) empties the history, so there is no ghost.
- **O-2 — Rule 1.** The ghost is a second drawing of numbers that already exist: its outline comes from the history,
  its geometry from the existing `buildOutline`, and it is drawn through the same point projection the live outline
  uses. The rule that picks it is a pure helper in `lib/` with unit tests. Nothing in `lib/geometry/` changes.
- **O-3 — The look.** A thin dashed stroke with no fill, behind the live outline line and behind every grab point,
  `pointer-events: none`, coloured through theme tokens in `app/globals.css`'s three-layer system (`@theme static`
  stays as it is), and drawn inside the same rotate group as the live outline so it turns with the board.
- **O-4 — Screen only.** The `@media print` block keeps it off paper, the way it keeps the board's fill off the
  printed template. The `hideCallouts` consumers never receive it: it is a prop only the TEMPLATE editor passes.
- **O-5 — Executor mechanics** (the `<verification>` section spells them out).

Choices made at plan time (the planner's discretion, recorded so the executor does not re-decide them):

- **P-1 — Where the rule lives.** `lib/outline-ghost.ts`, beside `lib/design-history.ts`, not in `lib/geometry/`: it
  is a rule about the edit history, not board maths, and `design-history.ts` is deliberately generic and knows
  nothing about boards. It exports `pickOutlineGhost` (the O-1 rule) and `outlinesMatch` (value equality for two
  outlines, key order ignored, every field compared including the nested tail, so a field added to `OutlineSpec`
  later is compared automatically). `pickOutlineGhost` returns the history entry's own outline object, not a copy,
  so the store's geometry memo stays the same object for the whole of a drag and the ghost is built once per new
  ghost rather than once per frame.
- **P-2 — Where it is computed.** In the design store, beside `outlineGeometry`: a memo over `history.past` and
  `state.outline` calls `pickOutlineGhost`, a second memo calls `buildOutline` on the result, and the context
  exposes `outlineGhostGeometry` (an `OutlineGeometry` or `null`). The store is the only place the history is
  visible. Nothing about the ghost is saved, autosaved, or added to either snapshot.
- **P-3 — The hide button shows only while there is a ghost to hide.** It is appended LAST in the TEMPLATE toolbar's
  JSX, so it lands at the row's far left (the toolbar's own documented growth rule) and no existing button moves. It
  is present exactly when `outlineGhostGeometry` is not `null`, whether the ghost is showing or hidden. This follows
  the phone undo bar's precedent in this app ("nothing new appears until there is something to undo"). A consequence
  worth stating: on a freshly opened board the toolbar and the drawing are byte-for-byte what they are today, so
  **the TEMPLATE desktop baseline does NOT need re-recording** and `e2e/viewer-toolbar.spec.ts` (which measures a
  freshly loaded screen) keeps passing unchanged. The executor must not re-record any baseline; a failing baseline is
  a stop-and-report (see Task 3).
- **P-4 — Whether the on/off choice is remembered: it is not.** This mirrors the construction-lines toggle exactly:
  plain `useState` inside `OutlineEditor` (on by default), never stored, so a reload or leaving TEMPLATE and coming
  back brings the ghost back on. Why: the ghost itself is session-only (the undo history is never saved), so a
  remembered "off" would outlive the thing it hides, and the neighbouring toolbar toggle already behaves this way.
  Leaving TEMPLATE and returning keeps the ghost itself (the history lives in the store) but resets the toggle to on.
- **P-5 — How it sits behind the live outline without a second board silhouette hook.** The live board is one path
  today (`data-board-silhouette="outline"`, fill plus dark line), and a dozen browser tests and the link-preview
  capture find it by that hook. The board's fill is opaque, so a ghost drawn before it would vanish wherever the old
  shape lies inside the new one. So, only while a ghost is drawn: (1) the hooked path keeps its `d`, fill and
  `strokeWidth` but draws no line (`stroke="none"`), painting the board's fill; (2) the ghost path comes next; (3) an
  unhooked copy of the live outline (`data-board-ink-line`, fill none, the same ink stroke and width,
  `pointer-events: none`, `aria-hidden`) draws the dark line on top. SVG already paints a path's fill before its line,
  so the pixels of the live board are unchanged; the ghost simply sits between the two. With no ghost the markup is
  exactly today's single path.
- **P-6 — Colour, weight and dash.** Stroke `--outline-ghost: color-mix(in srgb, var(--surf-ink-muted) 80%,
  transparent)`, width 1.25 drawing units (the live line is 2, the station lines 1; it scales with the drawing like
  the live line), dash `--outline-ghost-dash: 8 5` (long dashes, distinct from the stringer's `16 4 4 4`, the
  stations' `5 4` and the widepoint's `2 3`). Muted ink, not the accent: the accent means "you can grab this", and
  the ghost is a reference. Contrast, computed at plan time with WCAG relative luminance (the checker reproduced the
  ratios already documented in `globals.css`: Phosphor warning-ink 16.75, line-faint on panel 4.13 / 1.56 / 3.80),
  blending 80% of the muted ink over each background:

  | Theme | ghost vs panel (outside the board) | ghost vs board fill (inside) | live ink vs ghost |
  |-------|------|------|------|
  | Daylight | 3.94 | 3.55 | 3.47 |
  | Chalk | 3.94 | 3.42 | 3.44 |
  | Slate | 5.30 | 4.60 | 3.00 |
  | Phosphor | 4.32 | 3.77 | 2.08 |

  Every ghost figure clears the 3:1 bar for a meaningful graphic. The last column is how different the ghost is from
  the live line; in Phosphor (all greens) the dash and the thinner width carry that difference. `--surf-ink-muted` is
  assigned in all six contract blocks (light, dark, the four themes) and in the print block, so the derived token
  follows every theme with no per-theme copy. There is no automated contrast test in this repo; these numbers go in
  the CSS comment and the SUMMARY.
- **P-7 — Measured facts the orchestrator's brief assumed differently (recorded, nothing to do):**
  1. Viewer toolbar buttons are 34 by 34 px on a phone, not 44: measured at plan time on the iPhone 14 and Pixel 7
     profiles (Export Template and the construction toggle both 34x34). `e2e/touch-sizing.spec.ts` only measures
     `[data-slot="button"]` buttons of the `h-8`/`size-8` variants, so it never measures a toolbar button. The ghost
     button matches its neighbours at 34 px. Growing every toolbar button to 44 px on a touch screen is a
     whole-toolbar change for the founder to call, not part of this item.
  2. With a ghost present, the toolbar row gains 40 px on its left. Measured at plan time with a stand-in button:
     upright iPhone 14 (the new button at x 242-276, the board's nose tip near x 204) and Pixel 7 and the 1280 by 800
     desktop cover nothing. On a phone held sideways (844 by 390, desktop shell), the drawing's "Tail @ 12""
     read-out (x 673-724, y 159-210) ALREADY sits mostly under the Wide view button (x 692-726) today; the new button
     (x 652-686) would cover the rest of it once a ghost exists. Pre-existing, not fixed here; the SUMMARY lists it for
     the founder as a possible follow-up.
</decisions>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@/Users/kontoes/Code/shaper/CLAUDE.md
@/Users/kontoes/Code/shaper/AGENTS.md
@/Users/kontoes/Code/shaper/.planning/STATE.md
@/Users/kontoes/Code/shaper/.planning/phases/13-ready-for-the-shapers/13-SPEC.md
@/Users/kontoes/Code/shaper/.planning/todos/pending/2026-09-27-show-a-ghost-of-the-last-edit-on-the-template-screen.md

Read before touching (paths relative to the worktree root):
- lib/design-history.ts and lib/design-history.test.ts (the `past`/`future` stacks, `recordEdit` folding, `undo`,
  `redo`; the test file's style for controlled timestamps)
- components/design/design-store.tsx (the `history` state near line 464, `historySnapshot` whose `outline` field is
  `state.outline`, the recording effect near line 561, `outlineGeometry` near line 737, `undoEdit`/`redoEdit`, the
  context value near line 1214, and the `DesignContextValue` interface's "Derived values" section)
- components/outline/outline-viewer.tsx (`outlinePath` at lines 347-359, the rotate group and the hooked silhouette
  path at lines 908-915, the construction overlay's `pointerEvents="none"` pattern, the `hideCallouts` prop docs)
- components/outline/outline-editor.tsx (the toolbar at lines 114-180 and the construction toggle's local-state
  pattern at lines 36-90)
- components/viewer/toolbar-button.tsx (`ViewerToolbarButton`'s `pressed` prop; `ViewerToolbar`'s
  `flex-row-reverse` growth rule: a new button is appended at the end of the JSX and lands at the far left)
- app/globals.css (the DERIVED outline tokens block around lines 620-768 and its comments; the `@media print` block
  from line 784)
- lib/geometry/board.ts (`OutlineSpec`, `TailShape`, `DEFAULT_BOARD_SPEC`) and lib/geometry/units.ts (`mm`, `degrees`)
- e2e/undo-redo.spec.ts (mouse drag, slider nudge through the thumb's own range input, the shortcut, the phone undo
  bar), e2e/touch-drag.spec.ts (the android-only CDP touch drag), e2e/viewer-toolbar.spec.ts (`measureToolbar`),
  e2e/summary-blank.spec.ts line 95 (client-side navigation through a visible nav link)
</context>

<interfaces>
Existing contracts the executor builds on (verified at plan time, HEAD d9d6e2e):

- `lib/design-history.ts`: `interface DesignHistory<T> { past: T[]; future: T[]; lastKey: string | null; lastAt: number }`;
  `emptyHistory<T>()`; `recordEdit<T>(history, before: T, key: string | null, at: number)` (a fold keeps the same
  `past` array object, so a memo keyed on `history.past` does not re-run mid-drag); `undo<T>(history, current: T)`
  and `redo<T>(history, current: T)` return `{ history, restored } | null`; `COALESCE_WINDOW_MS = 500`.
- `components/design/design-store.tsx`: `const [history, setHistory] = useState<DesignHistory<DesignHistorySnapshot>>(emptyHistory)`;
  `DesignHistorySnapshot` has `outline: OutlineSpec`; `outlineGeometry = useMemo(() => buildOutline(state.outline), [state.outline])`;
  `buildOutline`, `OutlineGeometry` and `useMemo` are already imported there.
- `lib/geometry/board.ts`: `OutlineSpec` = `length`, `widePointWidth`, `widePointOffset` (Mm), `tailRailLength`,
  `noseRailLength` (number), `noseAngle` (Degrees), `noseFullness` (number), `tailAngle` (Degrees), `tailFullness`
  (number), `tail: TailShape` where `TailShape` is `{kind:"pin"} | {kind:"round"} | {kind:"squash"; endWidth} |
  {kind:"diamond"; endWidth; depth} | {kind:"swallow"; endWidth; crotchDepth}`. `DEFAULT_BOARD_SPEC.outline` is a
  ready-made valid outline to spread variants from.
- `components/outline/outline-viewer.tsx`: `outlinePath` projects `geometry.points` (right rail, then the left rail
  reversed) through `pxX(mmToInches(halfWidth))` / `lenToY(mmToInches(station))`, then the centre-close point from
  `geometry.centreCloseStation`, formatting every number with `toFixed(2)`. `pxX` uses the constant `centerlineX`
  and `lenToY` the constant `tailPy`; the only board-dependent factor is `scale`, fitted to the LIVE board's length.
- `lucide-react` 1.32.0 ships `GhostIcon` (checked: `dist/esm/icons/ghost.mjs`).
- `@playwright/test` 1.63.0: `locator.filter({ visible: true })` is available and already used in this suite.
</interfaces>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1 (tracer): after one edit, TEMPLATE draws the outline as it was one edit ago as a faint dashed ghost behind the live board</name>
  <files>lib/outline-ghost.ts, lib/outline-ghost.test.ts, components/design/design-store.tsx, components/outline/outline-viewer.tsx, components/outline/outline-editor.tsx, app/globals.css, e2e/outline-ghost.spec.ts</files>
  <read_first>lib/design-history.ts, lib/design-history.test.ts, components/design/design-store.tsx (lines 440-590, 730-740, 1166-1280), components/outline/outline-viewer.tsx (lines 176-360 and 900-920), components/outline/outline-editor.tsx (lines 185-200), app/globals.css (lines 620-770), lib/geometry/board.ts (lines 55-130), e2e/undo-redo.spec.ts</read_first>
  <behavior>
    - pickOutlineGhost over an empty past returns null.
    - One past entry whose outline differs from the live one: returns that entry's own outline object (same reference, checked with toBe).
    - Top entry's outline equals the live one (a rocker edit made on another screen), the entry below differs: returns the lower entry's outline (O-1 point 3).
    - Every entry's outline equals the live one: returns null.
    - An entry whose outline has the same values as the live one but is a different object with its keys in a different order counts as the same and is skipped.
    - A difference only inside the tail counts: a squash endWidth of mm(100) against mm(110), and a pin tail against a round one.
    - Two differing entries, past [A, B] with live C: returns B, the most recent, not A.
    - Driven by the real stacks from lib/design-history.ts with controlled timestamps and snapshots shaped like the store's (an object with an outline field): A then edit to B returns A; B then a second edit to C more than COALESCE_WINDOW_MS later returns B; two moves under the same key inside the window fold into one step and still return A; undo from C returns B as the restored board and A as the ghost; undo from B (the only edit) leaves an empty past and returns null; redo puts C back and the ghost is B again; the future stack is never read (the undone shape is never returned as a ghost).
    - outlinesMatch: true for an outline and a key-reordered copy; false when any one scalar field differs; false when the tail kind differs; false when a tail dimension differs.
  </behavior>
  <action>
Build the thinnest path from the undo history to the screen, in four layers, per F-1, O-1, O-2 and O-3. No toolbar
button yet (Task 2), no print rule yet (Task 3).

1. **The rule, red first (P-1).** Write `lib/outline-ghost.test.ts` from the behavior list, see it fail, then write
   `lib/outline-ghost.ts`: a header comment in this repo's style (what the ghost is, the O-1 rule in plain words
   including what Undo does, and why it is not in `lib/geometry/`), an exported `outlinesMatch(a: OutlineSpec, b:
   OutlineSpec): boolean` built on a small private recursive value-equality over plain data (primitives by `===`;
   arrays by length and element; objects by the same set of own keys, each value equal; key order ignored), and an
   exported generic `pickOutlineGhost<T extends { outline: OutlineSpec }>(past: readonly T[], live: OutlineSpec):
   OutlineSpec | null` that walks `past` from the last index down and returns the first entry's own `outline` for
   which `outlinesMatch` is false, else `null`. It takes no `future` argument at all, so redo can never feed it.
   Imports: the `OutlineSpec` type only. No React, no browser API. Fixtures in the test file are variants spread from
   `DEFAULT_BOARD_SPEC.outline` with every changed value written through `mm()` or `degrees()` from
   `lib/geometry/units.ts`, never a raw number in an `Mm` or `Degrees` field (vitest does not type-check branded
   types; the build does). The stack-driven cases import `emptyHistory`, `recordEdit`, `undo`, `redo` and
   `COALESCE_WINDOW_MS` from `lib/design-history.ts` and pass explicit timestamps.

2. **The store (P-2).** In `components/design/design-store.tsx`, right after the `outlineGeometry` memo, add a memo
   named `outlineGhost` that calls `pickOutlineGhost(history.past, state.outline)` with dependencies
   `[history.past, state.outline]`, and a memo named `outlineGhostGeometry` that is `buildOutline(outlineGhost)` or
   `null`, depending only on `[outlineGhost]`. Add `outlineGhostGeometry: OutlineGeometry | null` to
   `DesignContextValue` in its "Derived values" section with a doc comment (TEMPLATE's last-edit ghost, the O-1 rule
   by name, session-only and never saved, `null` on a board nobody has edited) and to the context `value` object
   beside `outlineGeometry`. Do not touch `historySnapshot`, `designSnapshotFields`, the recording effect, `undoEdit`,
   `redoEdit`, `applyPreset` or `applyModel`: the ghost is read from the history, never written into it.

3. **The drawing (P-5, P-6, O-3).** In `components/outline/outline-viewer.tsx`:
   - Add an optional prop `ghostGeometry?: OutlineGeometry | null` to `OutlineViewerProps`, documented in the style
     of its neighbours: TEMPLATE-editor-only, the outline as it was one edit ago, drawn at the live board's own scale
     and position so a change of length shows as a real change of length; omitted by the order form and the preset
     cards, which is what keeps it off paper and off thumbnails by construction; also ignored whenever
     `hideCallouts` is on. Destructure it with default `null`.
   - Turn today's `outlinePath` expression into a local function `silhouettePath(g: OutlineGeometry): string` that
     builds exactly the same string from `g` (right rail points, the left rail reversed, then `g`'s own centre-close
     point, then `Z`, every number through `toFixed(2)`, the same `pxX`/`lenToY`). Then `outlinePath` is
     `silhouettePath(geometry)`, byte-identical to today, and `ghostPath` is `silhouettePath(ghostGeometry)` when
     `ghostGeometry` is set and `hideCallouts` is off, else `null`. Move code, do not rewrite the arithmetic.
   - Add a module constant `GHOST_STROKE_WIDTH = 1.25` with a one-line reason (thinner than the live line's 2,
     heavier than the 1-unit station lines, scales with the drawing like the live line).
   - In the rotate group, where the hooked silhouette path is drawn today: the hooked path keeps `d={outlinePath}`,
     its fill and `strokeWidth={2}`, and its `stroke` becomes `"none"` only while `ghostPath` is set (exactly
     `var(--outline-ink)` otherwise, so the no-ghost markup is unchanged). While `ghostPath` is set, draw right after
     it, in this order: the ghost path (`data-outline-ghost`, `d={ghostPath}`, fill none, stroke
     `var(--outline-ghost)`, width `GHOST_STROKE_WIDTH`, `strokeDasharray="var(--outline-ghost-dash)"`,
     `pointerEvents="none"`, `aria-hidden`), then the live ink line (`data-board-ink-line`, `d={outlinePath}`, fill
     none, stroke `var(--outline-ink)`, width 2, `pointerEvents="none"`, `aria-hidden`). Both come before the station
     lines, the construction overlay, the grab points, the fin marks and the callouts, so everything else stays on
     top. A short comment above them says why the line is split from the fill (P-5).

4. **The editor.** In `components/outline/outline-editor.tsx`, read `outlineGhostGeometry` from `useDesign()` and pass
   `ghostGeometry={outlineGhostGeometry}` to the `OutlineViewer` (Task 2 puts the toggle in front of it).

5. **The tokens (P-6).** In `app/globals.css`'s DERIVED `:root` block, beside `--outline-blank-line`, add
   `--outline-ghost: color-mix(in srgb, var(--surf-ink-muted) 80%, transparent);` with a comment carrying the P-6
   contrast table (panel and fill figures per theme, and how they were computed), and, in the callout-system dash
   group beside `--outline-station-dash`, `--outline-ghost-dash: 8 5;` with a one-line reason. Do not touch
   `@theme static`, any ramp, any theme block or the print block in this task.

6. **The browser proof, first cases.** Create `e2e/outline-ghost.spec.ts` with a header comment (what it proves, why
   iPhone uses a slider nudge instead of a drag: Playwright's WebKit has no trusted touch drag, as
   `e2e/slider-touch.spec.ts` explains) and local copies of the banner/toolbar-tip dismissal helper and the
   `thumbInputFor` helper, as every spec in this suite copies them. Desktop-only cases now: (a) a freshly loaded
   TEMPLATE has zero `[data-outline-ghost]` and zero `[data-board-ink-line]` elements; (b) after pressing "Show
   construction lines" and making the same mouse drag on the widepoint as `e2e/undo-redo.spec.ts`, the ghost path
   exists and its `d` equals the hooked silhouette's `d` read before the drag, the hooked silhouette's `d` now
   differs from it, and the ghost's computed `pointer-events` is `none`; (b2) a second mouse drag on the widepoint
   starting from its new position still changes the Offset label (the ghost never catches the mouse).

Commit (explicit paths, one commit): subject `feat: TEMPLATE now keeps a faint dashed ghost of the outline as it was
one edit ago behind the live board (quick 260930-lia)`, a plain-English body for a shaper (what appears on the
drawing, when it changes, that nothing is saved or printed differently), ending with the co-author trailer line your
own environment specifies.
  </action>
  <verify>
    <automated>npx vitest run lib/outline-ghost.test.ts lib/design-history.test.ts components/design/design-store.test.ts && npm test && npm run lint -- --max-warnings 0 && npx next typegen && npx tsc --noEmit && PW_PORT=3171 IS_WEBPACK_TEST=1 npx playwright test e2e/outline-ghost.spec.ts e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts e2e/undo-redo.spec.ts --project=desktop</automated>
  </verify>
  <done>The helper's tests pass (RED seen first), the whole unit suite, lint and tsc are green, and on the desktop project a drag leaves a dashed ghost whose `d` is the pre-drag outline while the five desktop baseline screenshots, the drag regression and undo/redo still pass untouched. One commit.</done>
</task>

<task type="auto">
  <name>Task 2: a ghost button in the TEMPLATE toolbar hides and shows the ghost, on by default, not remembered</name>
  <files>components/outline/outline-editor.tsx, e2e/outline-ghost.spec.ts</files>
  <read_first>components/outline/outline-editor.tsx (whole file, as left by Task 1), components/viewer/toolbar-button.tsx, e2e/viewer-toolbar.spec.ts (`measureToolbar`, the 6 px gap, the 40 px desktop step)</read_first>
  <action>
Per F-2, P-3 and P-4:

1. In `OutlineEditor`, add `const [showGhost, setShowGhost] = useState(true);` with a doc comment in the style of the
   `orientation` and `constructionOverride` comments: view state, not design data, deliberately not a stored
   preference (P-4's reason in one or two sentences), so a reload or a return to TEMPLATE brings it back on.
2. Pass `ghostGeometry={showGhost ? outlineGhostGeometry : null}` to the viewer (replacing Task 1's plain pass-through).
3. Append, as the LAST child of `ViewerToolbar` (after the Wide view button), rendered only while
   `outlineGhostGeometry !== null`, a `ViewerToolbarButton` with `onClick` flipping `showGhost`, `pressed={showGhost}`,
   `label` "Hide the ghost of the last edit" while on and "Show the ghost of the last edit" while off, and a lucide
   `GhostIcon` at `size-6` (import it beside the other lucide icons). No `className` gate: it shows at every width
   and on every pointer, like the construction toggle, because the ghost is as useful on a phone. Its comment says
   why it is appended last (the row's growth rule keeps every other button where it was), why it only exists while
   there is a ghost (P-3, the phone undo bar's precedent), and that it is 34 px like its neighbours (P-7).
4. Extend `e2e/outline-ghost.spec.ts`, desktop cases: (c1) on a freshly loaded TEMPLATE no button's name matches
   /ghost of the last edit/; (c2) record the Export Template and Rotate buttons' boxes, make the Task 1 drag, then
   the "Hide the ghost of the last edit" button is visible with `aria-pressed="true"`, it is the last visible button
   of the `[data-viewer-toolbar]` row in DOM order, its right edge sits one button width plus 6 px left of the
   previous visible button's left edge (plus or minus 1), and Export Template and Rotate have not moved (plus or
   minus 1); (c3) pressing it removes every `[data-outline-ghost]` and `[data-board-ink-line]`, the button is now
   named "Show the ghost of the last edit" with `aria-pressed="false"`, the hooked silhouette's `d` is unchanged,
   and pressing it again brings back a ghost with the same `d` as before; (c4) not remembered: turn it off,
   `page.reload()`, make the drag again, and the button reads "Hide the ghost of the last edit", pressed.
5. Phone cases (skip on desktop): on iphone, the edit is one ArrowRight on the Nose Angle slider through
   `thumbInputFor` (as `e2e/undo-redo.spec.ts`'s iphone case does); on android it is a CDP touch drag on the
   widepoint copied from `e2e/touch-drag.spec.ts` (the construction overlay is already on for a touch screen). Then:
   the ghost button appears as the last visible button of the row, pressed; Export Template has not moved; tapping
   it hides the ghost and flips the name and `aria-pressed`; tapping again brings it back.

Commit: subject `feat: a ghost button in TEMPLATE's viewer toolbar hides or shows the last-edit ghost; it appears once
there is something to compare (quick 260930-lia)`, plain-English body, the co-author trailer line from your
environment.
  </action>
  <verify>
    <automated>npm test && npm run lint -- --max-warnings 0 && npx tsc --noEmit && PW_PORT=3171 IS_WEBPACK_TEST=1 npx playwright test e2e/outline-ghost.spec.ts e2e/viewer-toolbar.spec.ts e2e/desktop-baseline.spec.ts e2e/phone-layout.spec.ts</automated>
  </verify>
  <done>On all three projects the button appears only once a ghost exists, at the row's far left with nothing else moved, hides and shows the ghost with correct names and `aria-pressed`, and is back on after a reload. `viewer-toolbar.spec.ts` and all five desktop baselines pass unchanged, with no snapshot updated. One commit.</done>
</task>

<task type="auto">
  <name>Task 3: the ghost never prints and never shows off TEMPLATE, and the whole rule is proved on iPhone, Android and desktop</name>
  <files>app/globals.css, e2e/outline-ghost.spec.ts</files>
  <read_first>app/globals.css (the @media print block, lines 784-835), e2e/summary-blank.spec.ts (around line 95, client-side navigation), e2e/undo-redo.spec.ts (the shortcut and the phone undo bar)</read_first>
  <action>
Per F-3, O-1 and O-4:

1. **Off paper.** In `app/globals.css`'s `@media print` block, after the `:root:root:root { }` rule and inside the
   media block, add a rule that sets `display: none` on `[data-outline-ghost]`, with a comment in the file's voice:
   the ghost is a screen aid like the board's fill; printing the TEMPLATE screen from the browser must never put a
   second, older outline on paper where a shaper might cut to it; the printed template, Overview Sheet, Paper Saver
   and order form never draw it anyway, because they never receive it.

2. **Browser proof, the rest.** Extend `e2e/outline-ghost.spec.ts` so these run on all three projects unless noted
   (the edit is the desktop mouse drag, the android CDP touch drag, or the iphone Nose Angle nudge, as in Task 2):
   - (a) every project: a freshly loaded TEMPLATE has no ghost, no ink-line copy and no ghost button.
   - (b) every project: after one edit, the ghost's `d` equals the hooked silhouette's `d` read before the edit, and
     the live `d` differs.
   - (d) print, every project: with a ghost present, `page.emulateMedia({ media: "print" })` hides the ghost while the
     hooked silhouette stays visible; back to `"screen"`, the ghost is visible again.
   - (e) other screens, every project: with a ghost present, go to SUMMARY by clicking the visible SUMMARY link
     (`getByRole("link", { name: "SUMMARY", exact: true }).filter({ visible: true }).first()`, as
     `e2e/summary-blank.spec.ts` does; never `page.goto`, which reloads and wipes the in-memory board and would make
     this proof empty), wait for a `[data-board-silhouette="outline"]` to be visible, and expect zero
     `[data-outline-ghost]`; click the visible TEMPLATE link and expect the ghost back with the same `d` (proof the
     board kept it, so its absence on SUMMARY was real); then click a visible `a[href="/"]` link to the home screen,
     wait for a preset card's `[data-board-silhouette="outline"]`, and expect zero `[data-outline-ghost]`. Also go to
     ROCKER by its visible link and expect zero `[data-outline-ghost]`.
   - (f) one edit ago, desktop: focus the Nose Angle slider's range input, ArrowRight, read the live `d` (call it
     d1), wait 700 ms (longer than the 500 ms fold window, with a comment saying so), ArrowRight again: the ghost's
     `d` is d1, not the original.
   - (g) Undo, desktop: after (f)'s two nudges, ControlOrMeta+KeyZ makes the live `d` equal d1 and the ghost `d` equal
     the original; Shift+ControlOrMeta+KeyZ makes the ghost `d` equal d1 again. After a single drag on a fresh board,
     one ControlOrMeta+KeyZ leaves zero `[data-outline-ghost]` and no ghost button (O-1 point 4).
   - (g2) Undo, phones: after one edit, tapping the `[data-phone-undo-bar]` Undo button leaves zero
     `[data-outline-ghost]`.
   - (h) rotation, desktop: with a ghost present, press "Rotate the board to horizontal"; the ghost's nearest
     ancestor `g` carrying a `transform` has `rotate(-90)`, the same group as the hooked silhouette.

3. **Runs.** Targeted first: `e2e/outline-ghost.spec.ts`, `e2e/touch-drag.spec.ts`, `e2e/undo-redo.spec.ts`,
   `e2e/phone-home.spec.ts`, `e2e/summary-blank.spec.ts` and `e2e/desktop-baseline.spec.ts` on all projects. Then the
   full browser suite in THREE FOREGROUND runs, one per project, because the whole suite takes about 14 minutes and a
   single tool call cannot wait that long: `PW_PORT=3171 IS_WEBPACK_TEST=1 npx playwright test --project=desktop`,
   then `--project=iphone`, then `--project=android`. Never start a run in the background and return while it runs.
   Record each project's passed/failed/skipped counts for the SUMMARY.
   If any desktop baseline fails: do NOT re-record. Open the diff image. A fresh board must be byte-for-byte what it
   was (P-3), so any difference on an untouched board is a bug in this plan's work: fix it if it is plainly this
   work, otherwise stop and report the diff in the SUMMARY.

Commit: subject `feat: the last-edit ghost never prints and never shows on the home screen's cards, the SUMMARY sheet
or any other screen (quick 260930-lia)`, plain-English body, the co-author trailer line from your environment.
  </action>
  <verify>
    <automated>npm test && npm run lint -- --max-warnings 0 && npx tsc --noEmit && PW_PORT=3171 IS_WEBPACK_TEST=1 npx playwright test e2e/outline-ghost.spec.ts e2e/touch-drag.spec.ts e2e/undo-redo.spec.ts e2e/phone-home.spec.ts e2e/summary-blank.spec.ts e2e/desktop-baseline.spec.ts</automated>
  </verify>
  <done>Print media hides the ghost on every project; SUMMARY, the home screen's cards and ROCKER never draw it while TEMPLATE still holds it; the one-edit-ago, undo, redo and rotation cases pass; the full suite is green on all three projects with no snapshot updated. One commit, then the SUMMARY committed in the worktree.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| screen → paper | What is drawn to help a shaper judge an edit must not become a line on a printed template someone cuts foam to |
| session memory → saved board | The ghost comes from this session's undo history, which is never saved; it must not leak into a saved board or an autosave |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-lia-01 | Tampering (a wrong line on paper) | app/globals.css print block, outline-viewer.tsx | medium | mitigate | The printed paths (order form template windows, Full Sized Template, Overview Sheet, Paper Saver) never receive `ghostGeometry`; the viewer ignores it under `hideCallouts`; `@media print` hides `[data-outline-ghost]` for anyone printing TEMPLATE itself. Proven by test (d) on all three projects. On screen the ghost is dashed, thinner and muted so it is never mistaken for the board. |
| T-lia-02 | Tampering (saved design) | components/design/design-store.tsx | medium | mitigate | The ghost is two read-only memos over the history; `historySnapshot`, `designSnapshotFields`, the recording effect, undo/redo and both board-swap handlers are untouched, so nothing about the ghost can be saved, autosaved or recorded as an undo step. The unchanged design-store source-contract tests and undo-redo spec guard this. |
| T-lia-03 | Denial of service (a slow drag) | components/design/design-store.tsx | low | accept | `pickOutlineGhost` usually stops at the first entry it reads, the history holds at most 50 entries, and it returns the entry's own object, so `buildOutline` runs once per new ghost, not once per frame of a drag (the fold keeps the same `past` array). |
| T-lia-04 | Information disclosure | lib/outline-ghost.ts | low | accept | No data leaves the browser: no network call, no storage, nothing logged. |
| T-lia-05 | Denial of service (a blocked grab) | outline-viewer.tsx ghost and ink-line paths | low | mitigate | Both carry `pointer-events: none` and sit before every grab point; the delegated pointer handler on the svg is unchanged. Proven by (b2), the second drag. |
| T-lia-SC | Tampering | npm installs | low | accept | No package is installed. `GhostIcon` ships in the lucide-react already installed. |
</threat_model>

<verification>
Executor mechanics (O-5):

- You run in your own git worktree forked from the commit that carries this plan. If the worktree has no
  `node_modules`, symlink the main checkout's (`ln -s /Users/kontoes/Code/shaper/node_modules node_modules`; the
  repo's `.gitignore` already ignores that name). Run `npx next typegen` before the first `npx tsc --noEmit`.
- After every task: `npm test`, `npm run lint -- --max-warnings 0`, `npx tsc --noEmit`, and that task's Playwright
  command, always with `PW_PORT=3171 IS_WEBPACK_TEST=1` (Turbopack cannot resolve `next` inside a worktree; port 3100
  is the suite's default and 3000 is the founder's). Playwright's browsers are already installed.
- Every Playwright run is in the foreground. Never pass `--update-snapshots`. Never re-record a baseline (P-3).
- Do not run `npm run build` (it cannot run in a worktree; the orchestrator runs it on main after the merge).
- One commit per task with explicit `git add <paths>`, subjects in plain English for a shaper as written in each
  task. Do not touch STATE.md, ROADMAP.md, 13-SPEC.md, 13-UAT.md, CLAUDE.md or the todo file. Never push.
- Commit the SUMMARY inside the worktree (see `<output>`).
- No human checkpoints: `workflow.human_verify_mode` is end-of-phase, so the founder's checks go in the SUMMARY
  under "Human verification deferred".

Grep checks the orchestrator can re-run after the merge:
- `grep -c "export function pickOutlineGhost" lib/outline-ghost.ts` is 1.
- `grep -c "pickOutlineGhost(history.past, state.outline)" components/design/design-store.tsx` is 1.
- `grep -c "data-outline-ghost" components/outline/outline-viewer.tsx` is at least 1, and
  `grep -rln "ghostGeometry" components/` lists exactly `components/outline/outline-viewer.tsx` and
  `components/outline/outline-editor.tsx`.
- `grep -c "\[data-outline-ghost\]" app/globals.css` is at least 1, and `git diff d9d6e2e -- app/globals.css` shows no change
  inside `@theme static` or any ramp or theme block.
- `git diff --stat d9d6e2e -- e2e/*-snapshots` is empty.
</verification>

<success_criteria>
- On TEMPLATE, after any drag or slider move, the outline as it was one edit ago shows as a thin dashed ghost over the
  board's fill and under its line, behind every grab point, at the same size and place, turning with the board; it
  follows the O-1 rule through further edits, edits on other screens, undo and redo.
- A ghost button appears at the toolbar's far left once there is a ghost, on by default, hides and shows it, and is
  back on after a reload; no existing button moves.
- Never on paper, never on the home screen's cards, the SUMMARY sheet, ROCKER or any other screen.
- A freshly opened board looks exactly as it does today: all five desktop baselines and `viewer-toolbar.spec.ts` pass
  unchanged.
- Unit suite, lint, tsc and the full browser suite (all three projects) green.
- Left for the founder, after the merge and before any push:
  1. on a computer: drag a point on TEMPLATE and judge whether the ghost is faint enough yet easy to see, in the
     theme they use (and ideally one light and one dark theme);
  2. on their own iPhone: drag a point with a thumb, check the ghost follows, and check the ghost button is easy to
     hit at its 34 px size;
  3. decide whether P-7's sideways-phone finding (the "Tail @ 12"" read-out under the toolbar) deserves its own todo;
  4. give the go to push.
</success_criteria>

<output>
Create `.planning/quick/260930-lia-phase-13-item-9b-a-ghost-of-the-last-edi/260930-lia-SUMMARY.md` and commit it inside
the worktree (`docs(quick-260930-lia): summary — the last-edit ghost on TEMPLATE`). In plain English it covers:
- what a shaper sees on TEMPLATE after an edit, and what happens on a second edit, on another screen, on Undo and Redo;
- the ghost button: when it appears, what it does, and that the choice is not remembered (and why);
- that it never prints and never shows on the home screen, the SUMMARY sheet or any other screen;
- the colour choice and the P-6 contrast table;
- the three commits and the test counts (unit, and the browser suite per project);
- that no desktop baseline was re-recorded, and why none needed to be;
- "Human verification deferred": the four founder steps from success_criteria;
- "Found, not fixed": P-7's two findings (toolbar buttons are 34 px on phones; the sideways-phone read-out).
</output>
