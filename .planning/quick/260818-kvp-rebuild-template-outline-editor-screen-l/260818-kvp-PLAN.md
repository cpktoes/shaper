---
phase: quick-260818-kvp
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - vitest.config.ts
  - lib/geometry/units.ts
  - lib/geometry/units.test.ts
  - lib/geometry/board.ts
  - lib/geometry/outline.ts
  - lib/geometry/outline.test.ts
  - lib/geometry/__fixtures__/prototype-outline-golden.json
  - scripts/extract-prototype-golden.mjs
  - app/page.tsx
  - app/design/outline/page.tsx
  - app/globals.css
  - components/outline/outline-editor.tsx
  - components/outline/outline-controls.tsx
  - components/outline/outline-viewer.tsx
  - components/outline/tail-shape-icon.tsx
autonomous: true
requirements: [OUTL-01, VIZ-01, UNIT-01]

estimate:
  tokens: 95000
  raw_tokens: 95000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A shaper opens the app and lands on the outline editor with the prototype's default board drawn: 6'0\" long, 19\" widepoint, -1/2\" offset, squash tail"
    - "Moving any control redraws the outline immediately and updates the Tail @ 12\", Nose @ 12\", Widepoint and Center callouts"
    - "Selecting a tail shape (pin / round / diamond / squash / swallow) applies that shape's preset values and visibly changes the tail of the drawn outline"
    - "Every dimension shown on screen reads in inches (fractions of an inch) or feet-and-inches, while every stored value in the design state is metric millimetres"
    - "`npm test` proves the ported outline math reproduces the prototype's own numbers for 8 fixture board states, to within 1e-6 inch"
    - "A round or pin tail forces the tail block to zero width; a diamond tail's depth is capped at 5\" and at 2\" less than the tail block width"
  artifacts:
    - lib/geometry/units.ts
    - lib/geometry/board.ts
    - lib/geometry/outline.ts
    - lib/geometry/units.test.ts
    - lib/geometry/outline.test.ts
    - lib/geometry/__fixtures__/prototype-outline-golden.json
    - scripts/extract-prototype-golden.mjs
    - vitest.config.ts
    - app/design/outline/page.tsx
    - components/outline/outline-editor.tsx
    - components/outline/outline-controls.tsx
    - components/outline/outline-viewer.tsx
    - components/outline/tail-shape-icon.tsx
  key_links:
    - "Control onChange -> inchesToMm() at the boundary -> BoardSpec state (the single place inches enter the model)"
    - "BoardSpec.outline -> buildOutline() -> OutlineGeometry -> viewer SVG path + callouts"
    - "prototype-outline-golden.json <- scripts/extract-prototype-golden.mjs <- reference/project/Template.dc.html (regenerated, never hand-edited)"
    - "app/page.tsx redirect -> /design/outline"
---

<objective>
Rebuild the Claude Design prototype's Template Builder as the first real screen of the Next.js app: a pure-TypeScript outline geometry module under `lib/` with golden tests pinned to the prototype's own output, plus the outline editor screen (sidebar controls + live SVG viewer) at `/design/outline`.

Purpose: The outline is the foundation every later calculator reads from (rail bands, fin placement, volume all sample the outline). Porting it faithfully — proven by tests that compare against the prototype's actual math, not against numbers someone typed in — is what makes the rest of the app trustworthy. This is also the first vertical slice through the real stack: metric-internal geometry, imperial display, Tailwind v4 + shadcn UI.

Output: `lib/geometry/{units,board,outline}.ts` with Vitest coverage, a regenerable golden fixture extracted from `reference/project/Template.dc.html`, and a working `/design/outline` screen for browser review.

Requirements covered: OUTL-01 (shape an outline curve constrained to the board's length/width), VIZ-01 (2D visualization of the outline as the design is shaped — outline portion only), UNIT-01 (inches on screen, metric inside). SETUP-01 is partially advanced (length and width are enterable here; thickness arrives with the foil/volume screen).
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.claude/CLAUDE.md
@AGENTS.md
@.planning/design/GEOMETRY-MODULE.md
@reference/project/Template.dc.html
@package.json
@app/globals.css
</context>

<scope_boundaries>
IN scope: units module, outline geometry, outline editor screen (sidebar + SVG viewer), Vitest setup.

OUT of scope — do NOT build any of these, even if the prototype has them:
- Rocker, rail band, foil, fin placement, volume math (later phases)
- Printing: no "Print Full Size Template", no "Print Overview Sheet", no "Copy Template Specs" button. The prototype's print paths (`printFullSizeTemplate`, `onPrintSpecs`) are NOT ported.
- Fin-mark overlay on the viewer, and the prototype's `seed` / `onSync` cross-screen sync props
- The prototype's centimetre units toggle (this app displays inches only, per the project's units constraint)
- Persistence, auth, database, deployment

No tracer task: the architecture is already fixed by the project's geometry constraint (pure TypeScript math under `lib/`, UI on top) and by the approved geometry design, so a thin end-to-end slice would prove nothing that is still in question. The three tasks are a dependency chain — units, then the math that converts through them, then the screen that renders it — not speculative horizontal layers.
</scope_boundaries>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Vitest harness + units module (inches/millimetres boundary)</name>
  <files>package.json, vitest.config.ts, lib/geometry/units.ts, lib/geometry/units.test.ts</files>
  <read_first>
    - .planning/design/GEOMETRY-MODULE.md ("Type & function inventory" — the approved signature list for units.ts)
    - reference/project/Template.dc.html lines 309-326 (`round16`, `toFrac`, `disp` — the exact fraction formatting to reproduce)
    - tsconfig.json (note `include` covers `**/*.ts`, so test files are type-checked by `next build`)
  </read_first>
  <behavior>
    - `mmToInches(inchesToMm(19))` returns 19 within 1e-9
    - `MM_PER_INCH` is 25.4
    - `formatInchesFraction(inchesToMm(19))` returns `19"`
    - `formatInchesFraction(inchesToMm(18.5))` returns `18 1/2"` (fraction reduced, not `18 8/16"`)
    - `formatInchesFraction(inchesToMm(19.0625))` returns `19 1/16"`
    - `formatInchesFraction(inchesToMm(18.96875))` returns `19"` (rounds up to a whole inch and carries)
    - `formatInchesFraction(inchesToMm(-0.5))` returns `-1/2"`
    - `formatInchesFraction(inchesToMm(0))` returns `0"`
    - `formatInchesFraction(inchesToMm(0.03125), 32)` returns `1/32"` (denominator argument honoured)
    - `formatFeetInches(inchesToMm(72))` returns `6'0"` — NOT `5'11 15/16"`; float drift from the millimetre round-trip must be rounded away before the feet/inches split
    - `formatFeetInches(inchesToMm(78))` returns `6'6"`; `formatFeetInches(inchesToMm(60))` returns `5'0"`
    - `parseImperial` accepts `6'0"`, `6'`, `19 1/2`, `18.5"`, `1/2` and returns the matching millimetre value
    - `parseImperial` returns null for an empty string and for unparseable text
    - `cubicMmToLitres(1_000_000)` returns 1
  </behavior>
  <action>
    Install the test harness and build the units boundary that every other module and the whole UI will convert through.

    1. Install Vitest as a dev dependency: `npm install -D vitest`. Vitest is the unit-test framework prescribed by the project's stack constraint in `.claude/CLAUDE.md`, so this introduces no new technology choice. Do not add any other package in this task. After installing, run `npm ls vitest` and confirm it resolves to the `vitest` package from the npm registry, and check `git diff package.json` so that only the expected dependency line was added (threat T-QO-SC).

    2. Add npm scripts: `test` runs `vitest run`, `test:watch` runs `vitest`.

    3. Create `vitest.config.ts` with `defineConfig` from `vitest/config`: test environment `node` (the geometry module is pure and needs no DOM), `include` limited to `lib/**/*.test.ts`, and a `resolve.alias` mapping `@` to the project root so the `@/` path alias from tsconfig also resolves inside tests. Do NOT enable Vitest globals — every test file imports `describe`, `it` and `expect` from `vitest` explicitly, because tsconfig's `include` covers `**/*.ts` and undeclared globals would fail the TypeScript pass during `next build`.

    4. Create `lib/geometry/units.ts` implementing the approved inventory from `.planning/design/GEOMETRY-MODULE.md`:
       - Branded number types `Mm`, `Degrees`, `Litres` using the intersection-with-unique-brand pattern, each with a constructor helper (`mm`, `degrees`, `litres`) that casts a plain number to the brand. The brands exist so a raw inch number can never be silently passed where millimetres are expected.
       - `MM_PER_INCH` constant of 25.4.
       - `mmToInches(value: Mm): number` and `inchesToMm(value: number): Mm`.
       - `cubicMmToLitres(volumeMm3: number): Litres` — divide by 1,000,000.
       - `formatInchesFraction(value: Mm, denominator: 8 | 16 | 32 = 16): string` — port the prototype's `toFrac` (lines 309-320): capture the sign, take the absolute value, round to the nearest 1/denominator, split whole and fractional parts, carry when the fraction rounds up to a full inch, reduce the fraction by repeatedly halving numerator and denominator while the numerator is even, and render as `19"` when there is no fraction or `18 1/2"` when there is. A zero whole part with a fraction renders without a leading zero, e.g. `1/2"`.
       - `formatFeetInches(value: Mm): string` — round the inch value to the nearest 1/16 FIRST, then take feet as the floor of inches divided by 12 and render the remainder through `formatInchesFraction`, producing `6'0"`. Rounding first is what prevents 1828.8 mm from printing as `5'11 15/16"`.
       - `parseImperial(input: string): Mm | null` — accept an optional feet part (digits followed by an apostrophe), an optional whole-inch part, an optional space-separated fraction (`a/b`), and an optional trailing double-quote; also accept a plain decimal such as `18.5`. Return the total converted to millimetres, or null when the input is empty, whitespace-only, or does not match.
       Add a file header comment stating the module's contract: millimetres are the only unit the geometry math ever sees; inches and feet exist solely at this boundary.

    5. Create `lib/geometry/units.test.ts` covering every case listed in the behavior block above, importing `describe`/`it`/`expect` from `vitest`.
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && npm test 2>&1 | tail -20</automated>
  </verify>
  <done>`npm test` runs Vitest and all `lib/geometry/units.test.ts` cases pass, including `formatFeetInches(inchesToMm(72))` returning `6'0"` and `formatInchesFraction(inchesToMm(18.5))` returning `18 1/2"`.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Port the prototype's 3-knot Bezier outline engine to metric TypeScript, pinned by golden tests</name>
  <files>lib/geometry/board.ts, lib/geometry/outline.ts, scripts/extract-prototype-golden.mjs, lib/geometry/__fixtures__/prototype-outline-golden.json, lib/geometry/outline.test.ts, package.json</files>
  <read_first>
    - reference/project/Template.dc.html lines 505-623 — `buildGeometry(s)`, the entire outline engine. Port this statement for statement.
    - reference/project/Template.dc.html lines 212-231 — the prototype's default state values.
    - reference/project/Template.dc.html lines 809-819 — the five tail-type presets applied when a tail button is clicked.
    - .planning/design/GEOMETRY-MODULE.md — the approved type inventory and the tail-shape discriminated-union rule.
  </read_first>
  <behavior>
    - For each of the 8 golden fixtures, the ported `buildOutline` reproduces the prototype's `tailWidthAt12`, `noseWidthAt12`, `wpY`, `cw`, `bw`, `centerCloseY` and `diamondDepthEff` to within 1e-6 inch after converting back from millimetres, and `area` to within 1e-6 relative
    - For each fixture, the half-width sampled every 3 inches along the board matches the prototype's half-width at the same station to within 1e-6 inch
    - The widepoint really is the maximum: the largest half-width across all sampled points equals the widepoint half-width
    - Sampled points are ordered by station, non-decreasing, and every half-width is greater than or equal to zero
    - Area is positive for every fixture, and for the default board falls between 45% and 90% of the length-by-width bounding box (a sanity band, not a golden value)
    - Plausibility for the default 6'0" x 19" squash board: tail width at 12" lands between 9" and 16", nose width at 12" between 8" and 15", and both are less than the widepoint width
    - A pin or round tail forces the tail block half-width to zero regardless of what end width the caller supplies
    - A diamond tail with 5" requested depth and a 4" tail block clamps the effective depth to exactly 2" (the block-minus-2-inches rule); a diamond with 3" depth and a 10" block keeps its full 3"
    - A swallow tail sets the centre closing station to its crotch depth; every other tail shape leaves it at zero
    - The widepoint station is clamped to no closer than 16" from either end: an offset of +30" on a 6'0" board yields a widepoint station of 56", and -30" yields 16"
  </behavior>
  <action>
    Port the outline engine into metric TypeScript and prove the port is faithful by comparing it against the prototype's own executed math.

    STEP A — types. Create `lib/geometry/board.ts` with, per the approved design:
    - `Point2D { x: Mm; y: Mm }` (generic 2D point) and `BezierSegment { p0: Point2D; c0: Point2D; c1: Point2D; p1: Point2D }`.
    - An explicit axis-convention comment for the outline: `x` is the station measured from the tail tip toward the nose, `y` is the half-width measured out from the stringer.
    - `OutlinePoint { station: Mm; halfWidth: Mm }` — named fields, used for all sampled output, so the axis roles can never be confused.
    - `TailShape` as a discriminated union on a `kind` field: `pin` and `round` carry nothing; `squash` carries `endWidth: Mm`; `diamond` carries `endWidth: Mm` and `depth: Mm`; `swallow` carries `endWidth: Mm` and `crotchDepth: Mm`. Note in a comment that the approved design also lists `roundedPin`, which the prototype does not implement, so it is deliberately absent until there is a real shaping rule for it.
    - `OutlineSpec` holding the parametric controls: `length: Mm`, `widePointWidth: Mm` (full width, not half), `widePointOffset: Mm` (positive toward the nose from centre), `railLength: number` (0-100, the prototype's widepoint vector), `noseAngle: Degrees` (35-90), `noseFullness: number` (0-100), `tailAngle: Degrees` (30-90), `tailFullness: number` (0-100), `tail: TailShape`.
    - `BoardSpec { outline: OutlineSpec }` — the single board-design object. Add a comment that rocker, foil, rails and fins become sibling keys in later phases, so screens added later extend this object rather than reshaping it.
    - `DEFAULT_BOARD_SPEC` built from the prototype's defaults converted to millimetres: length 72", widePointWidth 19", widePointOffset -0.5", railLength 50, noseAngle 55, noseFullness 25, tailAngle 60, tailFullness 50.5, tail squash with endWidth 4".
    - Also export `TAIL_PRESETS`, one entry per tail kind, holding the prototype's preset values from lines 809-819: pin sets tailAngle 65 and tailFullness 50; round sets tailAngle 90 and tailFullness 90; diamond sets endWidth 10", tailAngle 30, tailFullness 30, depth 3"; squash sets endWidth 5", tailAngle 45, tailFullness 50; swallow sets endWidth 8", tailAngle 30, tailFullness 0, crotchDepth 3". The UI reads these when a tail button is clicked.

    STEP B — the engine. Create `lib/geometry/outline.ts` exporting `buildOutline(spec: OutlineSpec): OutlineGeometry` and `sampleOutline(geometry: OutlineGeometry, station: Mm): Mm`. Port `buildGeometry` (lines 505-623) statement for statement, with exactly these deliberate changes and no others:

    1. AXIS SWAP — this is the single biggest transcription hazard, so do it once, consciously, everywhere. The prototype stores points as `[y, x]` where `y` is the station and `x` is the half-width. The port uses named fields: prototype `y` becomes `station`, prototype `x` becomes `halfWidth`. Consequently the tangent directions swap too: the tail direction `{x: sin(tailAngle), y: cos(tailAngle)}` becomes `{ station: cos(tailAngle), halfWidth: sin(tailAngle) }`; the nose direction `{x: -sin(noseAngle), y: cos(noseAngle)}` becomes `{ station: cos(noseAngle), halfWidth: -sin(noseAngle) }`; the widepoint direction `{x: 0, y: 1}` becomes `{ station: 1, halfWidth: 0 }`. The golden test in step D is the safety net that catches any mistake here.

    2. METRIC CONSTANTS — only four constants in the engine carry a unit, and each converts through `inchesToMm`: the 16" end margin that clamps the widepoint station, the 5" absolute cap on diamond depth, the 2" tail-block margin subtracted for diamond depth, and the 12" stations at which the tail and nose widths are read. Everything else is dimensionless and ports unchanged: the 0.48 handle cap, the 0.92 overshoot factor, the widepoint multiplier `0.8 + railLength / 100 * 0.8`, the tail and nose fullness percentages, the 80-step sampling, and the 1e-6 guards that test direction components (those compare unit-vector components, which have no unit).

    3. DEAD CODE — the prototype declares `HANDLE_FRAC = 0.33` and never uses it. Do not port it.

    4. TAIL RULES, driven by the union instead of a string plus loose fields: pin and round pin the tail block half-width to zero (the prototype's `bwPinned`); squash uses half its end width; diamond uses half its end width, sets the tail pod station to its effective depth, where effective depth is the requested depth clamped to at least zero, at most 5", and at most the end width minus 2"; swallow uses half its end width, keeps the tail pod station at zero, and sets the centre closing station to its crotch depth. All other shapes leave the centre closing station at zero.

    5. SAMPLING — 80 steps per segment, with segment 0 sampled from step 0 and segment 1 from step 1 so the shared widepoint knot appears once, giving 161 points. Clamp every sampled half-width to the range zero through the widepoint half-width (the prototype's absolute bound: the widepoint is the maximum by definition). Sort the points by station ascending.

    6. `sampleOutline` is the prototype's `xAtY` — walk consecutive sampled points, find the pair bracketing the requested station, and linearly interpolate the half-width; when the station is past the end, return the last point's half-width. Match that fallback exactly rather than throwing.

    7. AREA — trapezoid sum across consecutive sampled points, half the sum of the two half-widths times the station delta, then doubled for the full outline. Return it in square millimetres and let the UI convert for display.

    8. RETURN SHAPE — `OutlineGeometry` carrying: `length`, `halfWidePointWidth`, `halfTailBlockWidth`, `tailBlockPinned` (true for pin and round), `widePointStation`, `tailPodStation`, `centreCloseStation`, `effectiveDiamondDepth`, `knots` (three entries, each a point plus its tangent), `handles` (the four construction handles, each a from/to pair, used by the viewer's construction-line overlay), `segments` (the two derived `BezierSegment`s — this is where the approved design's segment representation lives: derived from the parameters, never stored), `points` (the 161 `OutlinePoint`s), `area` in square millimetres, and `tailWidthAt12in` / `noseWidthAt12in` as FULL widths (twice the sampled half-width). Name those last two for the imperial station they describe, with a comment that 12" from each end is the shaper's standard measuring station, which is why an imperial number survives in a metric type name.

    STEP C — golden fixture extraction. Create `scripts/extract-prototype-golden.mjs`, a Node script that reads `reference/project/Template.dc.html` as text, locates the `buildGeometry(s) {` method, brace-matches forward to its closing brace, and evaluates the extracted body with the `Function` constructor taking a single `s` parameter. This works without stubbing anything because `buildGeometry` references no component state and no outer scope — verify that before relying on it. Extracting and executing the reference implementation is what makes the fixture trustworthy: do NOT hand-copy or retype the prototype's math into the script, because a transcription error there would silently validate a wrong port.

    Run the extracted function over 8 fixture states and write `lib/geometry/__fixtures__/prototype-outline-golden.json`. The fixtures, all in the prototype's inch-based state shape:
    - `default`: the prototype defaults verbatim — lengthIn 72, centerWidth 19, wpOffset -0.5, tailBlockWidth 4, tailType squash, swallowDepth 3, diamondDepth 3, widepointVector 50, tailAngle 60, tailVector 50.5, noseAngle 55, noseVector 25.
    - `pin`: defaults with tailType pin, tailAngle 65, tailVector 50.
    - `round`: defaults with tailType round, tailAngle 90, tailVector 90.
    - `diamond`: defaults with tailType diamond, tailBlockWidth 10, tailAngle 30, tailVector 30, diamondDepth 3.
    - `squash`: defaults with tailType squash, tailBlockWidth 5, tailAngle 45, tailVector 50.
    - `swallow`: defaults with tailType swallow, tailBlockWidth 8, tailAngle 30, tailVector 0, swallowDepth 3.
    - `longboard`: lengthIn 108, centerWidth 23, wpOffset 3, tailBlockWidth 12, tailType squash, tailAngle 50, tailVector 60, noseAngle 70, noseVector 60, widepointVector 70, swallowDepth 3, diamondDepth 3.
    - `diamondClamped`: defaults with tailType diamond, tailBlockWidth 4, diamondDepth 5, tailAngle 30, tailVector 30 — this one exercises the block-minus-2-inches clamp and must come out at 2" effective depth.

    Each recorded case stores its input state plus `tailWidthAt12`, `noseWidthAt12`, `area`, `wpY`, `cw`, `bw`, `centerCloseY`, `diamondDepthEff`, and a `halfWidthAtStations` array of station/halfWidth pairs sampled every 3 inches from 0 up to and including the board length (using the prototype's own interpolation). Sampling the whole curve, not just the endpoints, is what pins the shape rather than a few summary numbers. Add an npm script `golden` that runs the extractor, and a header comment in the JSON's sibling documentation or the script noting the file is generated and must never be hand-edited.

    STEP D — tests. Create `lib/geometry/outline.test.ts` importing `describe`/`it`/`expect` from `vitest` and the golden JSON. For every fixture, translate the prototype's inch state into an `OutlineSpec` (converting through `inchesToMm`, mapping tailType to the right `TailShape` variant with the matching end width and depth), call `buildOutline`, convert the results back to inches, and assert against the golden values within the tolerances in the behavior block. Then add the invariant, clamp, tail-rule and plausibility assertions listed in the behavior block. Keep the plausibility bands wide — they exist to catch an order-of-magnitude or axis-swap error, not to re-encode the golden numbers.
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && node scripts/extract-prototype-golden.mjs && npm test 2>&1 | tail -30</automated>
  </verify>
  <done>The golden fixture regenerates from the reference HTML, and `npm test` passes every golden-parity, invariant, clamp, tail-rule and plausibility case in `lib/geometry/outline.test.ts`.</done>
</task>

<task type="auto">
  <name>Task 3: Build the outline editor screen (sidebar controls + live SVG viewer)</name>
  <files>app/page.tsx, app/design/outline/page.tsx, app/globals.css, components/outline/outline-editor.tsx, components/outline/outline-controls.tsx, components/outline/outline-viewer.tsx, components/outline/tail-shape-icon.tsx</files>
  <read_first>
    - node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md and 05-server-and-client-components.md — REQUIRED by AGENTS.md before writing any Next.js code in this repo; this Next.js version differs from training data.
    - reference/project/Template.dc.html lines 25-153 — the sidebar markup: section order, labels, slider ranges and steps, disabled/dimmed rules.
    - reference/project/Template.dc.html lines 156-196 — the viewer SVG structure and callout overlay.
    - reference/project/Template.dc.html lines 651-728 — the viewer's scale, path, reference-line and callout de-overlap math.
    - reference/project/Template.dc.html lines 330-373 — the tail-shape icon glyph generator.
    - app/globals.css and components.json — the existing Tailwind v4 token conventions and shadcn configuration.
  </read_first>
  <action>
    Build the screen. Work in millimetres everywhere in state and geometry; convert to inches only when rendering a label or reading a control value.

    1. Add the shadcn primitives the controls need: run `npx shadcn add slider label button select checkbox separator card`. The shadcn CLI is already a project dependency and `components.json` is already configured for the `base-nova` style with `@base-ui/react` installed, so this pulls in generated component source, not a new framework. If a component is unavailable in the registry for this style, fall back to a native HTML control styled with Tailwind rather than adding a new package.

    2. Theme tokens in `app/globals.css`: add the prototype's palette as CSS custom properties in `:root` and expose them through the existing `@theme inline` block, following the mapping convention already in the file. The values, taken from the prototype: accent `#c98d3a`, sidebar background `#2b2924`, page background `#f7f4ee`, board fill a light tint of the accent, construction-line teal `#4d8a86`, station-line blue `#4472C4`, widepoint knot `#a8425f`, ink `#1c1b19`. Do not restyle the existing shadcn neutral tokens.

    3. `app/design/outline/page.tsx` — a server component that exports `metadata` with a title naming the outline editor, and renders `<OutlineEditor />`. Follow the layouts-and-pages guide you just read for this Next.js version.

    4. `app/page.tsx` — replace the Next.js scaffold with a redirect to `/design/outline` using `redirect` from `next/navigation`, so opening the app lands the user on the editor.

    5. `components/outline/outline-editor.tsx` — a client component (`"use client"`) that owns the design state: a single `BoardSpec` object in `useState` seeded from `DEFAULT_BOARD_SPEC`, plus local view state for whether construction lines are shown. Derive the geometry with `useMemo` over `board.outline` calling `buildOutline`, and pass geometry plus an update callback down. Keeping one board-design object (rather than a dozen loose fields) is what lets the rocker, rails, fins and volume screens plug in later without reshaping state. Lay out a fixed-width sidebar (about 360px, scrollable, dark) beside a flexible viewer area.

    6. `components/outline/outline-controls.tsx` — the sidebar, reproducing the prototype's sections and order: a "Template Builder" heading with its subtitle; BOARD LENGTH (a feet select of 5 through 10, an inches select of 0 through 11, and a slider from 60 to 120 in 1" steps — all three clamp the total to 60-120"); NOSE CONTROLS (Nose Angle 35-90 step 1, labelled Pointy to Round; Fullness 0-100 step 0.25, labelled Thin to Full); WIDEPOINT CONTROLS (Widepoint Width 16-25 step 1/8"; Offset -12 to 12 step 1/4", labelled Tail to Nose; Rail Length 0-100 step 0.25, labelled Short to Long); TAIL CONTROLS (a five-button grid of tail shapes with glyph icons, then Tail Block 0-16 step 1/8", then a Depth control, then Tail Angle 30-90 step 1 and Fullness 0-100 step 0.25); and a Settings section with a "View Construction Lines" checkbox.

    Disabled and pinned behaviour, matching the prototype exactly: with a pin or round tail the Tail Block control is disabled and reads zero and its row is dimmed; the Depth control is enabled only for diamond and swallow, ranging 1-5" step 1/16" for diamond and 1-8" step 1/16" for swallow, and dimmed otherwise; with a diamond tail the Tail Angle control is disabled and dimmed; when a diamond's requested depth exceeds the cap, show the prototype's note that depth is clamped to 2" less than the tail block. Clicking a tail-shape button applies that shape's entry from `TAIL_PRESETS` — the preset overwrites end width, angle, fullness and depth, exactly as the prototype does.

    Every slider works in the inch domain: derive its displayed value with `mmToInches` rounded to the control's step, and write back through `inchesToMm`. Reject any non-finite value and clamp to the control's documented range before it reaches state (threat T-QO-02). Every numeric readout in a label renders through `formatInchesFraction`, and the board length also through `formatFeetInches`. Percentage and angle controls display as plain numbers with their `%` or `°` suffix.

    7. `components/outline/outline-viewer.tsx` — the live SVG, ported from the prototype's render math but computed in millimetres. Use a 340 by 620 viewBox with 30 horizontal and 24 vertical padding. Scale is the smaller of the horizontal fit against the widepoint half-width and the vertical fit against the board length, applied uniformly to both axes so tangent visuals stay geometrically true. Map a station to a Y pixel measuring up from the bottom padding, and a half-width to an X pixel offset from the centreline at half the view width. Draw, in this order: the filled outline path (the sampled points up the right side, the same points reversed and negated down the left side, then a line to the centre closing point on the stringer, then close — the closing point is what cuts a swallow's notch); a dashed centreline; dashed reference lines at the 12" tail station, the 12" nose station, the widepoint station and the midpoint, each clipped to the actual half-width the curve has there; and, when construction lines are enabled, the handle lines and knot/handle dots mirrored on both sides, using the knot and construction colours from the theme.

    Overlay the callouts as absolutely positioned elements above the SVG: values in a right-justified column at the negative gap and names in a left-justified column at the positive gap, where the gap is the widepoint half-width plus about 1.16". The callouts are Tail @ 12", Nose @ 12", Widepoint, Center, and how far forward or back of centre the widepoint sits. Port the prototype's de-overlap pass: sort by vertical position and push entries apart to a minimum 26px gap, but never move the two 12"-station callouts, which must stay aligned with their dashed lines. Add the length callout above the nose, reading feet-and-inches followed by the total inches.

    All SVG geometry is rendered through JSX attributes holding numbers computed from the geometry module. Never build SVG markup as a string and inject it, and never use `document.write` or open a print window — the prototype's print paths are out of scope for this task (threat T-QO-01).

    8. `components/outline/tail-shape-icon.tsx` — port the prototype's icon glyph generator (the Catmull-Rom path builder, the per-shape base-width curve, and the outline path assembler) to render the five tail-shape button icons. This is decorative glyph math in an arbitrary icon space, not board geometry, so it deliberately stays in the component layer rather than under `lib/geometry` — say so in a header comment so the placement does not look like a violation of the project's geometry constraint.

    9. Do not build anything from the out-of-scope list in this plan's scope boundaries.
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && npm test 2>&1 | tail -5 && npm run build 2>&1 | tail -25</automated>
    <human-check>Run `npm run dev` and open http://localhost:3000. Confirm: the root URL lands on the outline editor; a 6'0" board with a 19" widepoint and a squash tail is drawn; dragging Widepoint Width, Offset, Nose Angle, Rail Length and the Fullness sliders redraws the board immediately and updates the callouts; clicking each of the five tail-shape buttons visibly changes the tail and applies its preset; the Tail Block control dims and reads zero for pin and round; the Depth control is live only for diamond and swallow; the Tail Angle control dims for diamond; toggling View Construction Lines shows and hides the knot dots and handle lines. Then stop for founder review — do not deploy.</human-check>
  </verify>
  <done>`npm run build` succeeds and `npm test` still passes; opening the app in a browser shows the outline editor at `/design/outline` with the prototype's default board drawn, every control live, and all dimensions displayed in inches while state is stored in millimetres.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → local build | Dev-dependency install (Vitest) and shadcn registry component generation bring third-party code into the repo |
| user control input → geometry model | Slider and select values cross into the design state and drive rendering math |
| geometry output → browser DOM | Computed numbers become SVG attributes and text nodes |

No network requests, no persistence, no authentication and no user-generated content exist in this scope, so the usual injection, authorization and data-exposure surfaces are absent.

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-QO-01 | Tampering | outline-viewer.tsx SVG rendering | medium | mitigate | All SVG values are numbers from `buildOutline`, rendered as JSX attributes only. No string-built markup, no `dangerouslySetInnerHTML`, no `document.write` and no `window.open` — the prototype's print paths are explicitly not ported. |
| T-QO-02 | Denial of Service | outline-controls.tsx input handlers | low | mitigate | Every control clamps to its documented range and rejects non-finite values before writing to state, so a NaN or unbounded value cannot produce a runaway scale or an unbounded sample loop. |
| T-QO-03 | Information Disclosure | scripts/extract-prototype-golden.mjs | low | accept | The extractor evaluates code from a repo-local reference file at development time only, never at build or runtime, and the file is founder-supplied and already committed. Accepted: no untrusted input reaches it. |
| T-QO-SC | Tampering | npm install (`vitest`), `npx shadcn add` | high | mitigate | No RESEARCH.md package audit exists for this quick task, so packages are treated per the fallback policy. Both are pre-vetted by project artifacts rather than by model suggestion: Vitest is named in the prescribed stack in `.claude/CLAUDE.md`, and `shadcn` is already a dependency in `package.json` with `components.json` configured. Executor confirms `npm ls vitest` resolves to the official package and reviews `git diff package.json` so no unexpected dependency is added. Adding any package beyond these two requires stopping and asking the founder. |
</threat_model>

<verification>
- `npm test` passes: units formatting/parsing cases and outline golden-parity, invariant, clamp, tail-rule and plausibility cases.
- `node scripts/extract-prototype-golden.mjs` regenerates the fixture from `reference/project/Template.dc.html` and produces no diff, proving the committed golden values still come from the reference implementation.
- `npm run build` compiles the app with no TypeScript errors, including the test files that tsconfig's `include` covers.
- Browser review at `/design/outline` confirms the screen matches the prototype's Template Builder in structure and behaviour.
- No geometry math lives outside `lib/geometry/` except the decorative tail-shape icon glyph generator, which carries a header comment explaining why.
</verification>

<success_criteria>
1. `lib/geometry/units.ts`, `board.ts` and `outline.ts` are pure TypeScript with no UI, browser or database imports, and every exported function has Vitest coverage.
2. The ported outline math reproduces the prototype's own output for 8 fixture board states to within 1e-6 inch on widths and stations, sampled every 3 inches along the whole curve — not only at endpoints.
3. All design state is stored in millimetres with branded types; inches appear only in control values and displayed labels.
4. The outline editor renders at `/design/outline` with the prototype's sidebar sections, slider ranges, tail-shape presets, disabled/pinned rules, live SVG board, reference lines, callouts and construction-line toggle.
5. The board-design state is a single extensible object, so rocker, rails, fins and volume screens can be added later without reshaping it.
6. Nothing from the out-of-scope list was built, and no package beyond Vitest and shadcn-generated components was added.
</success_criteria>

<output>
Create `.planning/quick/260818-kvp-rebuild-template-outline-editor-screen-l/260818-kvp-SUMMARY.md` when done.
</output>
