# Orchestrator brief for quick 261014-wii — wings on the TEMPLATE page

Two plans in one quick id (the 261007-fnz precedent): `261014-wii-01-PLAN.md` and `261014-wii-02-PLAN.md`, executed
one after the other in their own worktrees, with the founder's look at the live screen between them. Everything
below was verified in this session (2026-10-14) unless marked "decide".

## What the founder decided (locked — do not revisit)

Read `.claude/skills/sketch-findings-shaper/references/wings.md` (the whole design, with the step's maths and
the rejected directions) and `.planning/sketches/MANIFEST.md` decisions 16–17. The essentials:

- **A wing is a step applied AFTER today's outline curve.** `lib/geometry/outline.ts`'s two-span cubic Bézier
  stays exactly as it is. Ahead of the wing nearest the nose the outline is the curve the shaper drew; behind
  each wing its depth is taken out and fades linearly to nothing at the tail pod (so the tail block keeps its
  number); two wings add up. A board with no wings must redraw byte-identically (the prototype golden parity
  test in `lib/geometry/outline.test.ts` must keep passing untouched).
- **Numbers, each in 1/16" steps (1 mm in Metric), up to two wings:** position 2" to the board's centre
  (length/2) — or locked to the front fin's trailing or leading edge plus an offset of −3" to +3"; depth 1/16"
  to 1"; run along the stringer 0 to 2"; corner radius 0 up to the largest radius whose two rounds fit the step
  (`maxRadius` in the sketch's curve code — the slider's top moves with run and depth). Position marks the
  wing's OUTER corner, where the step leaves the curve.
- **The WINGS tab** beside VIEWER on the TEMPLATE page: label `ADD WINGS` while the board has none, then
  `WINGS · 1` / `WINGS · 2`. It shows the last 26" of the tail at about three times the VIEWER's scale with the
  fins drawn where FINS puts them (marks only, no dims); once a wing's position passes 24" the window grows to
  `min(length, position + 3")`, so the drawing shrinks gradually and the tail and fins never leave. While the
  tab is open the sidebar holds ONLY the wing controls, in the Template builder's own dress (the same section
  headings and slider rows as `outline-controls.tsx`); no board length or other template control there. The
  VIEWER tab draws the whole board with the wings applied and a `WING n` chip per wing (`3/8" @ 11"`) in the
  left gutter, and no wing control anywhere.
- **Adding the first wing** switches on a **Show fins** setting (TEMPLATE Settings, beside Show construction;
  marks only, no dims; off by default; not saved) and opens a dialog: "Dial in your wing placement" / "Edit fin
  placement on the FINS page, then return to the TEMPLATE to fine tune the wing." with **Open FINS** (goes to
  /design/fins) and **Got it**.
- **Grab points** follow the viewer's Show construction setting, as the VIEWER's own drag points do: two per
  wing, drawn like the app's drag targets. The outer one slides the wing along the curve (or sets the fin
  offset when locked); the inner one hangs just below the inner corner on the depth dimension's line and sets
  depth (in/out) and run (along). **The window holds still while a grab point is held.** Values snap to 1/16".
- **Callouts** on the close-up keep the drafting grammar (sketch 014's close-up is the spec; its page is
  `.planning/sketches/014-wings-tab/index.html`, its pictures beside it).
- Still open, small, the founder will rule at the look: position marks the step's start (as sketched) or its
  middle; the popup once per board or every time; the radius slider's top as sketched. Build as sketched.

## Facts verified this session

F1. `buildOutline(spec)` returns `knots`, `handles`, `segments` (the raw Bézier control points), 161 sampled
    `points` (80 per span + 1, clamped to the widepoint half-width, sorted by station), `tailWidthAt12in`,
    `noseWidthAt12in`, `area`. `sampleOutline` interpolates `points` linearly. Readers: the TEMPLATE viewer
    draws a polyline through `points` and reads widths through `sampleOutline`; the three printed outputs
    (`lib/geometry/template.ts`, `components/template/build-*-pdf.ts`) read `points` per page and
    `sampleOutline` for page windows; `importedFinTailFromOutline` (lib/geometry/fins.ts) cuts `points` at 24"
    for FINS; volume, the blank fit check, the DATASHEET, the order form's `deriveTemplateValues` and the Board
    Rack's turn (`rack-art.ts`) read `sampleOutline`; the ☰ tiles (`screen-tiles.ts`) read `points`;
    `outline-drag.ts` reads `knots`/`handles`. Nobody evaluates the Bézier outside outline.ts. So: apply the
    wings inside `buildOutline` (or a wrapper it calls) so that `points` carry them, and every reader follows.
    Extra points through each step are fine (no reader assumes 161 — `grep -n 161 lib/geometry/*.test.ts` is
    empty); the no-wings output must stay exactly 161 points, byte-identical.
F2. The app has no exact sampler at an arbitrary station; the sketch's `exactHalfWidthAt` solves the Bézier
    for its station by bisection (the segments are monotone in station — the audit swept 164,025 slider
    combinations, none folds). The wing's step needs dense stations (the sketch adds every 0.05" through the
    step plus every corner twice, a hair apart, so a square step draws vertical). Recommend the same inside
    the app, in millimetres: base 161 points with the depth share applied, plus dense exact samples through
    each step.
F3. `OutlineSpec` is constructed in: `DEFAULT_BOARD_SPEC` (board.ts), the four `BOARD_PRESETS` (presets.ts),
    `PINNED_PRESET_OUTLINES` (a frozen test fixture — never edit), `outline-drag.ts` (Partial patches),
    `components/template/export-preview-dialog.tsx` and `build-template-pdf.ts` (own narrower types), and the
    saved-board schema `outlineSpecSchema` in `lib/models/design-snapshot.ts` (`DESIGN_SNAPSHOT_VERSION = 5`;
    boards saved under every earlier version must keep parsing, and `saved-board-open.test.ts` proves a
    newer-stamped board still opens). Decide: `wings?: Wing[]` optional, or required with `[]` and a schema
    default — either way a board with no `wings` key reads as no wings, and `preset-source.ts`'s "Copy preset
    values" printer must not print wings for presets (none have any).
F4. **Fins and wings — the founder's rule (2026-10-14, replacing an earlier ruling):** "When marking your off-rail
    fin measurements on a board with wings, you always mark from the true, actual rail line directly adjacent to
    where the fin is sitting, not the hypothetical original continuous rail line. Mark your distance up from the
    tail first to find your fore/aft positioning; from that exact horizontal line, measure inward from the physical
    edge of the foam to set your rail gap. Fins listen to the closest piece of physical rail next to them." So:
    - **Fin placement reads the WINGED outline**, exactly as today's Import Template path reads the drawn outline:
      `effectiveFins` takes the winged geometry's `tailWidthAt12in`, and `importedFinTailFromOutline` cuts the
      winged `points` at 24". The lateral ("in from the rail") is then measured from the real rail at the fin's
      own up-from-tail station by `tailHalfWidthAt(…, importedTail)` — no new maths; the FINS tail drawing shows
      the wings. Verified scenarios to test in fins.test.ts: a wing AHEAD of the fin (nose-ward of its trailing
      edge, step behind it) → the fin's lateral is measured from the narrower rail and moves inboard by the depth;
      a wing AT the fin's trailing edge (sharp step at that station) → the trailing mark reads the wider rail
      (`stepProfile` is 0 at the outer corner itself); the leading mark keeps today's toe rule.
    - **The lock's loop is real only in one corner.** Verified in fins.ts: the front and centre up-from-tail
      figures depend on length, plus, for the McKee models when the 12" tail width is ≤ 12.5", on that width
      (`narrowShiftShortboard = −0.4·w12 + 5.2875`, the gun's quadratic, the quad spreads on w12). A locked wing
      whose step crosses the 12" station on such a tail changes w12 and so its own target. Resolve it as a short
      fixed point in a pure lib/geometry function (`resolveWingStations(outlineSpec, finSpec)` or similar) that the
      store memoises: start from the fins placed on the outline with the locked wing at its last resolved station
      (the base outline on first resolve), rebuild the outline with the wing at (fin edge + offset), re-place the
      fins, repeat until the station moves by less than 1/32" (cap 3 passes; the gain is −0.4 per pass, so it
      settles in one or two), then snap to 1/16". Unlocked wings never loop. Tests: a 6'0" McKee thruster with a
      12" width of 12" and a locked wing at the trailing edge (converges, the fins read the winged rail), the
      default board (one pass), a single-fin board (no front fin → the lock is disabled with a note).
    - Store the lock as `{ lock: "front-trailing" | "front-leading" | null, finOffset }` beside the hand-set
      station, so unlocking keeps the last resolved station. Boards without wings are unchanged everywhere.

F5. Units (CLAUDE.md Rule 2): a wing's position from the tail is a DIM (the Thinning Start precedent: a
    distance along the board, centimetres to one decimal in Metric, set through `measureSlider` in 1/16" or
    1 mm steps); depth, run, corner radius and the fin offset are MARKS (whole millimetres in Metric). Chips
    and read-outs use `formatDim` / `formatMark` as the viewer does today. The dim/mark families are tagged
    where the number is worked out.
F6. **The golden (CLAUDE.md Rule 1):** the founder's chosen construction exists as code in
    `261014-wii-sketch-curves.js` inside `261014-wii-sketch-source.tar.gz` beside this brief (extract it into your scratch copy; never leave loose .js/.mjs under .planning — lint reads them) (the sketch's `curves.js`: `buildOutline` ported to
    inches — proven against the app's 161 points to 5e-7" — plus `wingShape`, `stepProfile`, `maxRadius`,
    `effectiveRadius`, `wingFootprint`, `wingedHalfWidth(g, wings, "a", s)`, `wingedPoints`), and
    `261014-wii-sketch-check.mjs` in the same archive runs its shape checks. Follow quick 261007-c3h's recipe exactly: copy the
    curve code byte-for-byte to `reference/sketches/013-wings-curves.js`, write
    `scripts/extract-wings-golden.ts` modelled on `scripts/extract-round-nose-golden.ts` (it EXECUTES the
    sketch's code over the five boards — default + four presets, specs read from the app — with a fixed set of
    wing settings: a sharp square step, an angled one, one rounded to its maximum, a stinger at 30" with a
    radius, two wings at 11" + 15 1/2", on squash, swallow (Fish), round (Mid-length) and pin tails; records
    full widths at the sketch's own sampled stations in inches converted with `mmToInches` only at the edge),
    and a test that the app matches it. The sketch is inches, the app millimetres; the sketch's base curve
    matches the app's within 5e-7", so measure the achievable tolerance in a scratch copy before fixing it in
    the plan (expect ≤ 2e-4 mm).
F7. Tests and baselines a wing touches: `outline.test.ts` golden parity (must stay green, untouched);
    `template.test.ts` frozen digests use `PINNED_PRESET_OUTLINES` (no wings → unchanged);
    `components/viewer/toolbar-button.test.ts` counts `<ViewerToolbarButton` per editor (a WINGS tab must not
    add one, or the count moves); `e2e/desktop-baseline.spec.ts`'s `outline-desktop-desktop-darwin.png` WILL
    change (the tab strip gains ADD WINGS) — re-record that one baseline (macOS-local, `--update-snapshots -g
    outline`); specs that read the tab strip or the sidebar's first heading: `e2e/board-name-band.spec.ts`,
    `board-lock-screens.spec.ts`, `phone-chrome.spec.ts`, `rocker-top-view.spec.ts`, `rocker-live-controls.spec.ts`
    (grep each for "VIEWER" / tab counts before assuming it survives). Forty specs open /design/outline; those
    that don't touch the strip or the sidebar's headings need nothing.
F8. UI facts: ROCKER's `rocker-editor.tsx` is the model for a tab list that DERIVES its active tab
    (`tabs.some(t => t.id === requested) ? requested : "viewer"`); the TEMPLATE editor passes `TabbedPanel`
    one VIEWER tab with `trailing={BoardNameTab}` and `compactOnPhone="drawing"`; `DesignScreenShell` takes
    `controls` (the sidebar's content) and appends `StepNav` and `SiteFooter` itself (the wing sidebar must
    NOT add its own Next). `showConstruction = constructionOverride ?? coarsePointer` — on a phone it is on by
    default, so grab points are on by default there too, like the VIEWER's drag points. The TEMPLATE viewer
    already takes `finMarks={finPlacement.marks}` with `hideFinMarks` — Show fins is `hideFinMarks={!showFins}`.
    `ExportPreviewDialog` is the dialog pattern (Base UI) for the popup. The sidebar dress: `SectionHeading`,
    `SliderRow`, `MeasureField`, `measureSlider` in `outline-controls.tsx` / `components/design/`.
F9. The close-up is the outline viewer at a tail window. `OutlineViewer` fits the whole board
    (`outlineViewMetrics` → `outlineViewFrame`); decide between a `window: { lo, hi }` prop on it and a
    sibling component that shares the primitives in `components/viewer/callout-primitives.tsx` (`CalloutChip`,
    `OutputRail`, `DimensionLine`, `DimensionTick`, the chip/rail x constants). Either way: nothing inside the
    board but faint lines; read-outs pushed apart when they would touch with an L-shaped leader keeping the
    true station (the sketch's `spread`); the toolbar's corner kept clear.
F10. Phone: today's stacked layout, the drawing's content and the controls' content swapped per tab; width
    picks the layout, pointer the sizing, height the short-screen rules (CLAUDE.md "Layout").
F11. Store: `updateOutline({ wings })` is enough for undo, autosave, the last-edit ghost and the dirty flag
    (the outline is in the snapshot). Show fins is screen state like Show construction, not saved.
F12. Runtime for measuring at plan time: no dev server from the main checkout (one `next dev` per checkout;
     the founder's own runs on port 3005). Measure in a throwaway copy: `rsync -a --exclude node_modules
     --exclude .next --exclude .git --exclude '.env*' --exclude .claude/worktrees` into your scratch dir, symlink
     `node_modules` to the main checkout's, run `npx vitest run` there, `npx tsx` scripts there.

## The two plans

**Plan 01 — the wings exist and the founder can drive them.** The geometry (`lib/geometry/wings.ts` or inside
outline.ts: the types, `maxRadius`, the step shape, construction A, the exact sampler, the dense points),
`buildOutline` applying them, the golden from the sketch's code with its test, the saved-board schema, the
WINGS tab with the close-up drawing (window rule, fins, chips, read-outs, the step's dimensions), the swapped
sidebar in the builder's dress (per wing: position, lock to front fin with edge + offset, depth, run, corner
radius with its moving top; add / remove; Settings: Show fins, Show construction), the fin lock on the base
outline (F4), the VIEWER's wing chips, Show fins switching on with the first wing and the popup. After it
merges, the founder looks at the live screen (their dev server on 3005 serves the main checkout).

**Plan 02 — grabbing, the phone, the proofs.** Grab points through `outline-drag.ts` (two new targets per
wing, snapping to 1/16", the window frozen for the length of a drag), the phone layout checked at both
phone sizes and sideways, the browser spec (`e2e/wings.spec.ts`: the tab, add a wing → Show fins on + popup,
the sidebar swap, the window growing past 24", grab points with Show construction, the lock, Metric), the
outline baseline re-record, the readers checked (prints unchanged without wings; a winged board prints the
step; FINS' tail drawing; the Board Rack and the tiles follow), and anything plan 01 deferred.

Balance the two by what the executor can finish in one run (the fnz plans were 52 and 76 minutes); keep
plan 01 the one that gives the founder something to look at.

## Rulings every executor prompt carries (also write them into each plan's own text)
- No human-verify checkpoint: `workflow.human_verify_mode` is end-of-phase; tracer tasks continue.
- The executor commits its SUMMARY inside its worktree (`docs(quick-261014-wii): …`); the orchestrator's
  docs commit tolerates it.
- Unit tests, `npx tsc --noEmit`, `npm run lint` and Playwright run INSIDE the worktree with a distinct
  `PW_PORT` (plan 01: 3171, plan 02: 3172) and `IS_WEBPACK_TEST=1`; never a dev server from the main checkout;
  never touch `.next/dev/lock`.
- Route every length through `mm()` / `inchesToMm()` even in tests (branded types; vitest does not type-check).
- Commit subjects in plain English about the board and the screen, each task its own commit, the
  `Co-Authored-By` trailer on each.
