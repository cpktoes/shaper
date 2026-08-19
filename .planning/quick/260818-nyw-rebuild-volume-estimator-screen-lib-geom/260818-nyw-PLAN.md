---
phase: quick-260818-nyw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - scripts/extract-prototype-volume-golden.mjs
  - lib/geometry/__fixtures__/prototype-volume-golden.json
  - lib/geometry/volume.ts
  - lib/geometry/volume.test.ts
  - components/design/design-store.tsx
  - app/design/layout.tsx
  - components/outline/outline-editor.tsx
  - components/outline/outline-viewer.tsx
  - components/rails/rail-band-editor.tsx
  - components/fins/fin-placement-editor.tsx
  - components/fins/fin-controls.tsx
  - components/fins/fin-viewer.tsx
  - components/site-nav.tsx
  - app/design/volume/page.tsx
  - components/volume/volume-estimator.tsx
  - components/volume/volume-controls.tsx
  - components/volume/volume-calculation-card.tsx
autonomous: true
requirements: [VOL-01, VIZ-01, UNIT-01, OUTL-01, FIN-03]

estimate:
  tokens: 150000
  raw_tokens: 150000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A shaper opens /design/volume and sees the prototype's default state — Import Template Area ON, Calculate Volume Based on Template and Rail Data ON — with the Estimated Volume computed from the real template area and the real rail-band cross-sections, in litres with cubic inches underneath"
    - "With both import checkboxes ON, the Volume Calculation card shows the Template Area row plus Tail, Center and Nose Cross-Section Thickness rows and a Length-Weighted Effective Thickness row — the real-geometry path"
    - "Unticking Import Template Area re-enables the manual Board Length, Board Width and Center Thickness controls and switches the card to the factor path: Board Area (estimated), Weighted Thickness, and the three dimension rows"
    - "The Board Type slider (Performance to Beefy, 7 steps) is visible only when the rail-data path is off, and moving it changes the estimated volume — a 6'0\" x 19\" x 2 1/4\" board walks 26L to 32L in 1L steps across the seven positions"
    - "Editing the outline on /design/outline changes the Template Area and therefore the Estimated Volume on /design/volume, with no page reload and nothing saved anywhere"
    - "Editing a rail band's thickness or family on /design/rails changes the per-station cross-section thicknesses and therefore the Estimated Volume on /design/volume"
    - "The fins screen's Import Template Values checkbox is real: with it ticked the board length, tail width @12\" and tail shape come from the outline screen and the diagram draws the actual designed tail outline instead of the polynomial stand-in"
    - "The template screen draws the calculated fin marks on the outline — one accent line per fin from trailing edge to leading edge, with a dot at each end"
    - "Visiting any design screen directly by URL still works: every screen starts from the same defaults it had before this task"
    - "`npm test` proves the ported volume math reproduces the prototype's own numbers for both calculation paths, the rail-import fallback, and all seven board-type steps"
    - "A shaper can reach TEMPLATE, RAILS, VOLUME and FINS from the top nav on every design screen"
  artifacts:
    - lib/geometry/volume.ts
    - lib/geometry/volume.test.ts
    - lib/geometry/__fixtures__/prototype-volume-golden.json
    - scripts/extract-prototype-volume-golden.mjs
    - components/design/design-store.tsx
    - app/design/volume/page.tsx
    - components/volume/volume-estimator.tsx
    - components/volume/volume-controls.tsx
    - components/volume/volume-calculation-card.tsx
  key_links:
    - "DesignProvider (mounted in app/design/layout.tsx) -> one board-design object -> every /design/* screen reads and writes it"
    - "buildOutline() -> templateValues {area, length, widePointWidth, noseWidthAt12, tailWidthAt12} -> computeVolume() area + station half-widths"
    - "computeRailBands() -> per-section {boardThickness, profile} -> computeVolume() shoelace cross-sections"
    - "buildOutline().points + tail kind -> fin viewer's imported tail outline; computeFinPlacement().marks -> outline viewer's fin marks"
    - "prototype-volume-golden.json <- scripts/extract-prototype-volume-golden.mjs <- reference/project/Volume.dc.html + the already-generated outline and rails golden JSON (generated, never hand-edited)"
---

<objective>
Rebuild the Claude Design prototype's **Volume Estimator** as the fourth screen of the Next.js app, port its two calculation paths into `lib/geometry/volume.ts`, and introduce the shared board-design state that makes cross-screen values real.

Purpose: volume is the number a shaper quotes to a customer, and the prototype computes it two ways — a board-type factor estimate when nothing else is designed yet, and a real-geometry calculation that shoelaces the actual rail-band cross-sections once the template and rails exist. The second path only means anything if the outline screen's area and the rails screen's profiles actually reach the volume screen, which is why the shared design store lands in the same task rather than after it. Until now each screen owned its own disconnected state; from here there is one board design and four views onto it.

Output: `lib/geometry/volume.ts` (pure, metric-boundary, golden-tested against the prototype), a React-context design store mounted in `app/design/layout.tsx` with the three existing screens refactored onto it, the prototype's cross-screen behaviours (fins importing template values and drawing the real tail outline, template drawing fin marks), the `/design/volume` screen, and a VOLUME entry in the top nav.

**Not a tracer-first plan.** The architecture — a pure `lib/geometry/*` module + an extract-and-execute golden fixture + a Tailwind/shadcn screen under `app/design/*` — was proven three times over by quick tasks 260818-kvp, 260818-lm0 and 260818-mr2. The one genuinely new piece (the shared store) is deliberately Task 2's opening move and is proven by the three existing screens still working before any new screen consumes it.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/design/GEOMETRY-MODULE.md
@AGENTS.md
@lib/geometry/units.ts
@lib/geometry/board.ts
@lib/geometry/outline.ts
@lib/geometry/rail-bands.ts
@lib/geometry/rail-bands.test.ts
@scripts/extract-prototype-rails-golden.mjs
@scripts/extract-prototype-fins-golden.mjs
@components/outline/outline-editor.tsx
@components/rails/rail-band-editor.tsx
@components/fins/fin-placement-editor.tsx
@components/site-nav.tsx
@app/design/layout.tsx
@app/globals.css
</context>

<source_audit>

| Source | Item | Covered by |
|--------|------|------------|
| GOAL | `lib/geometry/volume.ts` — both calculation paths from `Volume.dc.html`, metric public API | Task 1 |
| GOAL | Factor path: 7-step `AREA_FACTORS` / `THICK_FACTORS` / `TYPE_LABELS` lookup | Task 1 |
| GOAL | Real-geometry path: shoelace cross-section area over rail profiles + trapezoidal length weighting | Task 1 |
| GOAL | Tip thickness 1/2" under 84" length, else 3/8" | Task 1 |
| GOAL | `importingRailThickness && !geomReady` fallback (centre thickness used raw, no factor) | Task 1 |
| GOAL | Litres conversion constant 61.0237 exactly as prototype, reconciled against `units.ts` | Task 1 |
| GOAL | Vitest golden tests via extract-and-execute against `Volume.dc.html` | Task 1 |
| GOAL | Shared design store (React context, no new deps) holding one board-design object | Task 2 |
| GOAL | Refactor outline / rails / fins screens to read and write the store | Task 2 |
| GOAL | Fins "Import Template Values" behaviour becomes real | Task 2 |
| GOAL | Real designed outline drawn behind the fins (prototype's `tailGeom`) | Task 2 |
| GOAL | Template screen draws fin marks | Task 2 |
| GOAL | `/design/volume` sidebar: import checkboxes, length/width/thickness controls, Board Type slider | Task 3 |
| GOAL | Volume Calculation card: area, per-station cross-sections, weighted thickness, litres + cu in, disclaimer | Task 3 |
| GOAL | VOLUME entry in the top nav | Task 3 |
| REQ | VOL-01 (calculate board volume) | Tasks 1, 3 |
| REQ | VIZ-01 (visualize the design) | Tasks 2, 3 |
| REQ | UNIT-01 (inches/litres at the surface, metric internally) | Tasks 1, 3 |
| REQ | OUTL-01 (outline curve) — extended here: its area and points now feed volume and fins | Task 2 |
| REQ | FIN-03 (placement overlaid on the board outline) — now the real outline, and marks on the template | Task 2 |
| RESEARCH | n/a — quick mode, no research phase | — |
| CONTEXT | n/a — no CONTEXT.md; scope decisions arrive inline as this task's constraints and are restated in `<scope_boundaries>` | — |

No unplanned items.
</source_audit>

<scope_boundaries>
**In scope:** the volume math module and its goldens, the shared design store, the surgical refactor of the three existing screens onto it, the three cross-screen behaviours listed above, the volume screen, and the nav entry.

**Explicitly out of scope — do not build, do not stub, do not leave a placeholder for:**
- Persistence of any kind — no localStorage, no database, no URL state. The store is in-memory and resets on reload. The prototype's `seed` / `seedVersion` / `applySeed` / `onSync` message-passing machinery exists only because its screens were separate documents; it has no analogue here and must not be recreated.
- The cm units toggle and the global units state (`units`, `toU`, `fromU`, `unitBounds`, `unitsOptions`) — inches only on screen. (Task 1's golden harness *does* snapshot the prototype's cm output, but only as a higher-precision probe of the same numbers; no cm code ships.)
- Theme picker / accent colour (`_themeVars`, the five `THEMES`) — use the `outline-*` palette tokens already in `app/globals.css`.
- "Copy Volume Spec" (`specLines`, `copyToast`, `onCopySpecs`), the sidebar "Settings" disclosure, and all print paths.
- Compact / embedded display modes (`compact`, `compactView`, `compactRowFontSize`, `compactTotalFontSize`, `compactVolumeValueFontSize`, `measureRootAvail`, `rootAvailH`, the ResizeObserver height plumbing).
- The Summary screen and its `summarySections`.

**Restyling.** Task 2 is a state refactor, not a visual change. Lift state out of the three editors and change nothing else about their markup, class names or layout. The only visual additions in Task 2 are the fins import checkbox, the imported tail outline, and the template's fin marks.

**Volume's two disclaimers.** `Volume.dc.html` computes a long, path-aware `disclaimerText` (lines 456-458) that its own markup never renders. The markup renders a short static italic line (line 145). Render the short static line only. Do not port the unrendered one.

**The approved geometry design says something else, deliberately.** `.planning/design/GEOMETRY-MODULE.md` prescribes `computeVolume` as a ~50-station Simpson integration over the foil. That model needs the foil editor, which is Phase 4 work. This task ports the prototype's three-station rail-profile method faithfully instead: prototype fidelity first, the Simpson upgrade arrives with the foil. Record this as a deliberate deviation in the module header and in the SUMMARY.
</scope_boundaries>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Port the volume math with extract-and-execute golden fixtures</name>
  <files>scripts/extract-prototype-volume-golden.mjs, lib/geometry/__fixtures__/prototype-volume-golden.json, lib/geometry/volume.ts, lib/geometry/volume.test.ts, package.json</files>

  <read_first>
    - `scripts/extract-prototype-fins-golden.mjs` — the harness to imitate. Volume's math is inline in `renderVals` exactly as Fins' is, so copy that script's shape: generated-file header warning, `extractMethod` paren-then-brace matcher, marker map, host built with `new Function`, per-fixture `host.state` assignment, JSON write. Volume needs no module-scope-constant recovery, so the `const SCALE = 14,` machinery drops out.
    - `lib/geometry/rail-bands.ts` lines 1-30 and 255-300 — the numbered port-header convention, the inch-domain-core / `Mm`-boundary split this module must follow, and `buildProfilePointsInches`' own comment describing the profile's coordinate frame (x=0 at the rail apex, x negative moving inboard toward the stringer, y = height off the bottom). That frame is what makes the prototype's closing polygon work.
    - `lib/geometry/rail-bands.ts` lines 500-660 — `buildRailProfile`, `RailSectionOutput` (`profile: Point2D[]`, `boardThickness: Mm`) and `computeRailBands`. These already produce, in millimetres, exactly the three profiles the volume math consumes; nothing new is needed on the rails side.
    - `lib/geometry/rail-bands.test.ts` — the golden-test convention: typed golden state, spec builder converting with `inchesToMm`, comparisons made in inches via `mmToInches`.
    - `lib/geometry/units.ts` — `formatInchesFraction` is the port of the prototype's `toFrac`, and `disp` in inch mode is exactly `toFrac`. Do not re-implement either. Note `cubicMmToLitres` and read the litre-constant deviation below before using it.
    - `reference/project/Volume.dc.html` lines 188-198 (state defaults), 235-242 (`syncFromTemplate`), 266-283 (`round16`, `toFrac`, `disp`, `toU`, `fromU`), 285-363 (the whole calculation: factor tables, availability flags, `geomReady` gating, `shoelaceArea`, `stationEffThickness`, the trapezoidal weighting, the fallback branch), 440-455 (the display fields).
    - `lib/geometry/__fixtures__/prototype-outline-golden.json` and `lib/geometry/__fixtures__/prototype-rails-golden.json` — the already-generated prototype output this harness composes its `templateValues` and `railValues` stubs from. Check the exact key names (`area`, `tailWidthAt12`, `noseWidthAt12`, `state.lengthIn`, `state.centerWidth`; `sections.{nose,center,tail}.{boardThicknessIn,profile}`) before writing the composer.
  </read_first>

  <behavior>
    - For every golden fixture, the ported `computeVolume` reproduces the prototype's `areaSqInDisplay`, `weightedThicknessDisplay`, `volumeLitersDisplay`, `volumeCuInDisplay`, `tailEffDisplay`, `centerEffDisplay` and `noseEffDisplay` strings character for character once each returned number is formatted the way the prototype formats it.
    - The same holds against the cm-mode snapshot of every fixture, which pins each cross-section thickness roughly sixteen times tighter than the 1/16" inch display can.
    - The factor path at 72" x 19" x 2 1/4" produces 26, 27, 28, 29, 30, 31 and 32 litres (to the prototype's own 2-decimal display) as `boardTypeIndex` walks 0 to 6 — the calibration the factor tables were tuned for.
    - `geomReady` is true only when the rail-thickness import is active AND all three profiles AND all three rail thicknesses AND all three template widths are present; any one missing drops to the fallback.
    - The `importingRailThickness && !geomReady` fallback uses the centre thickness raw, with no thickness factor applied — measurably different from the manual path at the same centre thickness on every board-type step except where the factor happens to be 1 (it never is).
    - Tip thickness switches at exactly 84": a board of 83.9375" uses 1/2" and a board of 84" uses 3/8", producing a smaller weighted thickness at the longer length for otherwise identical inputs.
    - `volumeLitres` equals `volumeCubicInches / 61.0237` exactly, not `volumeMm3 / 1e6`.
    - A null template with `importTemplateDimensions: true` behaves as not importing (`templateAvailable` false), and a null rail value likewise — the screen degrades to the manual factor path rather than throwing.
  </behavior>

  <action>
Build the golden harness first, then the math module, then the test — in that order, so the prototype's own numbers exist on disk before any porting judgement is made.

**A. `scripts/extract-prototype-volume-golden.mjs`.** Model it on `scripts/extract-prototype-fins-golden.mjs`. Keep the same generated-file header warning in your own words: this script extracts and EXECUTES the prototype's own `renderVals` and its helpers from `reference/project/Volume.dc.html`; never hand-copy or retype the prototype's math here, because that would validate a wrong port against a second hand-transcription instead of against the prototype; the output JSON is generated and must never be hand-edited.

Reuse the `extractMethod` helper verbatim in shape (find a definition-only literal marker, paren-match the parameter list, brace-match the body, throw loudly if either fails). Build the host from these markers, each unique to its definition line: `_themeVars() {`, `round16(x) {`, `toFrac(x) {`, `disp(inches) {`, `toU(inches) {`, `fromU(v) {`, and `renderVals() {`. Volume's `renderVals` reads no module-scope constants, so each can be a plain `new Function(params, body)` — no constant-recovery wrapper.

Stub the environment and nothing more: `host.setState = () => {}` (only ever called from event closures, never during evaluation), `host.rootRef = null`, and `host.props` set per fixture to `{ templateValues, railValues, compact: false }`.

**Compose the `templateValues` and `railValues` stubs from the two already-generated golden JSON files — never hand-write profile data.** Read `lib/geometry/__fixtures__/prototype-outline-golden.json` and `lib/geometry/__fixtures__/prototype-rails-golden.json` at the top of the script and throw a clear error naming `npm run golden` if either is absent. Those files are the recorded output of the prototype's own `buildGeometry` and `syncSnapshot`, so composing from them is the same thing as executing them, without re-running two harnesses. Compose exactly the field set the Sandbox shell passes (`Sandbox.dc.html` lines 209-224), and nothing more:

- `templateValuesFrom(outlineFixtureName)` -> `{ available: true, area: fx.area, lengthIn: fx.state.lengthIn, widepointWidth: fx.state.centerWidth, noseWidthAt12: fx.noseWidthAt12, tailWidthAt12: fx.tailWidthAt12 }`
- `railValuesFrom(railsFixtureName)` -> `{ available: true, noseThickness: fx.sections.nose.boardThicknessIn, centerThickness: fx.sections.center.boardThicknessIn, tailThickness: fx.sections.tail.boardThicknessIn, noseProfile: fx.sections.nose.profile, centerProfile: fx.sections.center.profile, tailProfile: fx.sections.tail.profile }`
- `railValuesFrom(name, { withoutProfiles: true })` -> the same object with the three profile fields omitted, for the fallback fixture.

Transcribe a `defaults` constant from the prototype's state block (lines 188-198): `units: 'in'`, `globalSettingsOpen: false`, `lengthIn: 72`, `width: 20`, `centerThickness: 2.5`, `boardTypeIndex: 3`, `copyToast: false`, `importTemplateDimensions: true`, `importRailThickness: true`, `rootAvailH: 0`. Then build these fixtures, each `{ state, template, rail }`:

| Fixture | State deviation from `defaults` | template | rail |
|---|---|---|---|
| `manualDefault` | `importTemplateDimensions: false`, `importRailThickness: false` | null | null |
| `manualPerformance` | as `manualDefault` + `boardTypeIndex: 0` | null | null |
| `manualBeefy` | as `manualDefault` + `boardTypeIndex: 6` | null | null |
| `manualLongboard` | as `manualDefault` + `lengthIn: 108`, `width: 23`, `centerThickness: 3.25`, `boardTypeIndex: 4` | null | null |
| `calibration0` … `calibration6` | as `manualDefault` + `lengthIn: 72`, `width: 19`, `centerThickness: 2.25`, `boardTypeIndex: 0..6` (seven fixtures) | null | null |
| `templateOnly` | `importRailThickness: false` | `default` | null |
| `templateOnlyLongboard` | `importRailThickness: false`, `lengthIn: 108`, `width: 23` | `longboard` | null |
| `templateOnlyBeefy` | `importRailThickness: false`, `boardTypeIndex: 6` | `default` | null |
| `railFallback` | `centerThickness: 2.5` (the value the real toggle would have synced from the rails) | `default` | `default` **without profiles** |
| `geomDefault` | — | `default` | `default` |
| `geomDomed` | — | `default` | `domedAll` |
| `geomHardEdgeOff` | — | `default` | `hardEdgeOff` |
| `geomSingleTuck` | — | `default` | `singleTuck` |
| `geomFamilyBoxy` | — | `default` | `familyBoxy` |
| `geomFamilyKnifey` | — | `default` | `familyKnifey` |
| `geomLongboard` | `lengthIn: 108`, `width: 23` | `longboard` | `default` |
| `geomPin` | — | `pin` | `domedCenter` |
| `geomSwallow` | — | `swallow` | `familyBoxy` |
| `geomDiamond` | — | `diamond` | `ratioExtremes` |
| `railUnavailable` | — | `default` | null |
| `templateUnavailable` | — | null | `default` |

For the importing fixtures, set `state.lengthIn` and `state.width` to the template's own `lengthIn` / `widepointWidth`, because that is what `syncFromTemplate` (lines 235-242) would have made them by the time the user sees the screen. `geomLongboard` therefore crosses the 84" tip-thickness branch while every other geometry fixture stays under it. `railUnavailable` and `templateUnavailable` pin the degradation behaviour when one screen's data is missing.

Per fixture, set `host.props` and `host.state`, call `host.renderVals()` once, and snapshot these fields: `templateAvailable`, `railAvailable`, `importingRailThickness`, `dimensionsDisabled`, `dimensionsOpacity`, `thicknessDisabled`, `thicknessOpacity`, `showDimensionRows`, `showGeomBreakdown`, `areaRowLabel`, `areaSqInDisplay`, `tailEffDisplay`, `centerEffDisplay`, `noseEffDisplay`, `weightedThicknessLabel`, `weightedThicknessDisplay`, `volumeLitersDisplay`, `volumeCuInDisplay`, `areaFactorDisplay`, `thicknessFactorDisplay`, `boardTypeIndex`, `lengthFeet`, `lengthInches`, `lengthDisplay`, `widthDisplay`, `centerThicknessDisplay`.

**Then snapshot every fixture a second time with `state.units` set to `'cm'`**, storing it as `valsCm` alongside `vals`. This is a precision probe, not a feature: the prototype's `disp` prints two decimal centimetres in cm mode versus sixteenths of an inch in inch mode, so the cm snapshot pins each cross-section thickness to about 0.004" instead of 0.0625" — through the prototype's own code path, with no extra machinery. Say exactly that in a comment so nobody later mistakes it for cm support.

Write `lib/geometry/__fixtures__/prototype-volume-golden.json` keyed by fixture name, each entry holding `state`, `template`, `rail`, `vals` and `valsCm`. Add `"golden:volume": "node scripts/extract-prototype-volume-golden.mjs"` to `package.json` and append it to the end of the existing `"golden"` chain — it must run after the outline and rails harnesses, since it reads their output.

**B. `lib/geometry/volume.ts`.** Open with the numbered port-header convention `rail-bands.ts` uses — every deliberate deviation, and nothing else:

1. INCH-DOMAIN CORE. Every constant in this calculation is an inch quantity: the two factor tables, the 12" stations the trapezoid splits on, the 84" length threshold, the 1/2" and 3/8" tip thicknesses. The prototype's arithmetic is ported statement-for-statement in inches in a private core, and the exported function converts `Mm` in and `Mm`/`Litres` out at the boundary. Same posture as `rail-bands.ts`; the inch core is never exported.
2. LITRE CONSTANT — a real, recorded divergence from `units.ts`. The prototype divides cubic inches by `61.0237`, which is a truncation of the exact 61.023744…; `units.ts`'s `cubicMmToLitres` is exact by definition (1 L = 1,000,000 mm3). They disagree by about 7.2e-7 relative — roughly 0.000025 L on a 35 L board. This module keeps the prototype's constant so the port is bit-faithful to the numbers a shaper has already been reading, exports it as `CUBIC_INCHES_PER_LITRE`, and does **not** call `cubicMmToLitres`. Note in the comment that this is the one place a geometry module deliberately bypasses the units boundary's own conversion, and that the divergence should be revisited when the foil-based Simpson `computeVolume` replaces this method.
3. MODEL DEVIATION FROM THE APPROVED DESIGN. `.planning/design/GEOMETRY-MODULE.md` prescribes a ~50-station Simpson integration over the foil. That needs the Phase 4 foil editor. This is the prototype's three-station rail-profile method, ported faithfully — prototype fidelity first.
4. PRESENTATION SPLIT. Returns numbers, never display strings; the caller formats through `formatInchesFraction`. Nothing here formats.
5. STATE AND EVENT WIRING EXCLUDED. `syncFromTemplate`, the two checkbox handlers, `applySeed`/`syncSnapshot`, copy-spec, compact mode, cm mode and `_themeVars` are screen and store concerns, not math.
6. UNRENDERED DISCLAIMER OMITTED. The prototype computes a long path-aware `disclaimerText` its own markup never renders; only the short static line the markup shows is reproduced, and it lives in the component, not here.

Export the constants exactly as the prototype writes them (lines 309-311), with its own tuning comment carried over: `AREA_FACTORS`, `THICKNESS_FACTORS` (the prototype's `THICK_FACTORS`), `BOARD_TYPE_LABELS`, `BOARD_TYPE_STEP_COUNT` (7), and `CUBIC_INCHES_PER_LITRE`.

Export `VolumeSpec` — `length: Mm`, `width: Mm`, `centerThickness: Mm`, `boardTypeIndex: number`, `importTemplateDimensions: boolean`, `importRailThickness: boolean` — and `DEFAULT_VOLUME_SPEC` built from the prototype's state defaults (72", 20", 2.5", index 3, both imports true).

Export `VolumeTemplateValues` — `area: number` (square millimetres, matching `OutlineGeometry.area`), `length: Mm`, `widePointWidth: Mm`, `noseWidthAt12: Mm`, `tailWidthAt12: Mm` — and `VolumeRailValues` — `noseThickness: Mm`, `centerThickness: Mm`, `tailThickness: Mm`, and `noseProfile` / `centerProfile` / `tailProfile` as `Point2D[] | null`, in the same coordinate frame `buildRailProfile` returns (x=0 at the rail apex, negative inboard; y off the bottom).

Export `VolumeResult` — `templateAvailable`, `railAvailable`, `importingTemplate`, `importingRailThickness`, `geomReady` (booleans); `area: number` (square millimetres, imported or estimated); `areaFactor`, `thicknessFactor` (numbers); `boardTypeLabel: string`; `tailCrossSectionThickness`, `centerCrossSectionThickness`, `noseCrossSectionThickness` (`Mm | null`, non-null only when `geomReady`); `weightedThickness: Mm`; `volumeCubicInches: number`; `volumeLitres: Litres`.

Export one function, `computeVolume(spec: VolumeSpec, template: VolumeTemplateValues | null, rail: VolumeRailValues | null): VolumeResult`.

Port lines 312-363 statement-for-statement into the inch core, keeping the prototype's own long comment (lines 322-328) explaining why the shoelace result is exact for that cross-section rather than a fudge factor. Give each of these five places a short comment of its own, because a silent transcription error here is expensive:

- `templateAvailable` requires `available` **and** a non-null `area`; `railAvailable` requires `available` **and** a non-null centre thickness. `importingTemplate` needs the toggle and availability; `importingRailThickness` needs its own toggle, rail availability **and** `importingTemplate` — the rail path can never be active without the template path.
- `stationEffThickness` closes the half cross-section into a polygon by prepending `[-halfWidth, boardThickness]` and appending `[-halfWidth, 0]` to the rail profile — the flat run of full-thickness, un-tapered foam from the profile's innermost point in to the stringer — then divides the shoelace area by the half width to back out an equivalent uniform thickness. `halfWidth` of zero returns zero rather than dividing.
- The three stations use different half widths: tail from `tailWidthAt12 / 2`, centre from `widePointWidth / 2`, nose from `noseWidthAt12 / 2`, each paired with that station's own board thickness.
- The trapezoidal weighting runs tip -> tail@12" -> centre -> nose@12" -> tip with spans of 12, `halfLen - 12`, `(L - 12) - halfLen`, and 12, where `halfLen = L / 2`. Total area divided by `L` is the weighted thickness. Keep the prototype's asymmetric third span exactly as written — do not "tidy" it into `halfLen - 12`.
- The fallback branch: when the rail import is on but geometry is incomplete, weighted thickness is the centre thickness **raw**; otherwise it is centre thickness times the board-type thickness factor. The area factor is applied only when the template area is not imported.

**C. `lib/geometry/volume.test.ts`.** Follow `rail-bands.test.ts`'s conventions. Type the golden JSON, and for each fixture build the `VolumeSpec` and the two value bags by converting the golden's inch numbers with `inchesToMm` (area converts as square inches to square millimetres). Call `computeVolume` once per fixture and assert:

- `areaSqInDisplay` — format as `${(areaSqIn).toFixed(1)} sq in${importingTemplate ? ' (imported)' : ''}` and compare exactly.
- `volumeLitersDisplay` and `volumeCuInDisplay` — `toFixed(2)` and `toFixed(1)` respectively, compared exactly.
- `weightedThicknessDisplay`, `tailEffDisplay`, `centerEffDisplay`, `noseEffDisplay` — through `formatInchesFraction(value, 16)`, with the em dash where the golden has one.
- The same four thickness fields against `valsCm`, formatted the prototype's way: `${(Math.round(mmToInches(v) * 2.54 * 100) / 100).toFixed(2)} cm`. This is the tight comparison; write a comment saying so.
- The boolean and label fields: `templateAvailable`, `railAvailable`, `importingRailThickness`, `showGeomBreakdown` (equals `geomReady`), `areaRowLabel`, `weightedThicknessLabel`, and `areaFactorDisplay` / `thicknessFactorDisplay` reconstructed from `areaFactor` / `thicknessFactor` / `boardTypeLabel`.

Then add three port-only tests — clearly commented as testing this module's own branch behaviour rather than comparing to a prototype fixture, since the prototype's own fixtures cannot isolate them:

- **The 84" boundary.** Build one synthetic template + rail pair, call `computeVolume` twice with template lengths of 83.9375" and 84", and assert the weighted thickness is strictly smaller at 84" (3/8" tips versus 1/2" tips) with every other input identical.
- **The litre constant.** Assert `volumeLitres` equals `volumeCubicInches / 61.0237` to within 1e-12, and that it differs from the exact `cubicMmToLitres` result by a relative amount near 7e-7 — so the deliberate divergence is pinned rather than accidental.
- **Degradation.** `computeVolume(spec, null, null)` with both import toggles on returns `templateAvailable: false`, `railAvailable: false`, `geomReady: false`, all three cross-section thicknesses null, and a finite volume from the factor path.
  </action>

  <verify>
    <automated>npm run golden:volume && npx vitest run lib/geometry/volume.test.ts</automated>
  </verify>

  <done>`lib/geometry/__fixtures__/prototype-volume-golden.json` holds 26 fixtures each with an `in` and a `cm` snapshot, regenerable with `npm run golden`; `lib/geometry/volume.ts` exports `computeVolume`, the factor tables and `CUBIC_INCHES_PER_LITRE` with a numbered port header recording the litre-constant and Simpson-model deviations; `npx vitest run lib/geometry/volume.test.ts` passes with every golden display string matching character for character.</done>
</task>

<task type="auto">
  <name>Task 2: Shared design store, screen refactor, and the prototype's cross-screen behaviours</name>
  <files>components/design/design-store.tsx, app/design/layout.tsx, components/outline/outline-editor.tsx, components/outline/outline-viewer.tsx, components/rails/rail-band-editor.tsx, components/fins/fin-placement-editor.tsx, components/fins/fin-controls.tsx, components/fins/fin-viewer.tsx</files>

  <read_first>
    - `components/outline/outline-editor.tsx`, `components/rails/rail-band-editor.tsx`, `components/fins/fin-placement-editor.tsx` — the three current state owners, in full. Each holds its spec in `useState` and derives with `useMemo`; each also holds UI-only state (which disclosures are open, which tab is active) that must stay local.
    - `app/design/layout.tsx` — where the provider mounts, and the flex-height contract the editors depend on.
    - `components/fins/fin-viewer.tsx` lines 55-90 and 320-345 — `buildOutlinePaths(shape, tailWidth12)` already builds its path from `tailOutlineHalfPoints`, which returns `{ points: Point2D[]; connector: Point2D | null }`. That is the same shape the imported outline needs to supply, so the override is a prop, not a rewrite.
    - `components/outline/outline-viewer.tsx` lines 36-60 — `pxX` and `lenToY`, the two functions the fin marks must be drawn through.
    - `lib/geometry/outline.ts` lines 57-90 — `OutlineGeometry`'s exported shape: `points`, `area`, `tailWidthAt12in`, `noseWidthAt12in`, `centreCloseStation`.
    - `lib/geometry/fins.ts` lines 41-130 — `FinPlacementSpec`, `FinTailShape` and `FinMark` (`offTail`, `lateral`, `leadingOffTail`, `leadingLateral`).
    - `reference/project/Sandbox.dc.html` lines 202-224 — the four derived bags the shell passed between screens, and the exact fields in each. The store's derived values are the same information computed from `lib/geometry` instead of message-passed.
    - `reference/project/Fins.dc.html` lines 649-688 — `syncFromTemplate` (length, tail shape and tail width @12" are what import overrides) and `importedOutlinePath` (the imported outline is the template's own points filtered to the first 24" plus the tail connector).
    - `reference/project/Template.dc.html` lines 178-182 and 276-284 — how the template draws fin marks (a 2px accent line from trailing to leading edge with a 3.5-radius dark dot at each end, mapped through the viewer's own `pxX` / `lenToY`), and the `tailGeom` connector rule.
  </read_first>

  <action>
**A. `components/design/design-store.tsx`** — a `"use client"` module exporting `DesignProvider` and `useDesign()`, built on React context and `useState`/`useMemo` only. No new dependencies, no reducer library, no effects that write state, no persistence.

State is one object with five keys: `outline: OutlineSpec` (from `DEFAULT_BOARD_SPEC.outline`), `rails: RailBandSpec` (`DEFAULT_RAIL_BAND_SPEC`), `fins: FinPlacementSpec` (`DEFAULT_FIN_PLACEMENT_SPEC`), `volume: VolumeSpec` (`DEFAULT_VOLUME_SPEC`), and `finsImportTemplate: boolean` (true, matching the prototype's own default). Expose one setter per slice — `updateOutline(patch)`, `updateRailSection(key, patch)`, `toggleTailHardEdge()`, `updateFins(patch)`, `updateVolume(patch)`, `setFinsImportTemplate(next)` — each a functional `setState` merge, so the three editors' existing call signatures barely change.

Derive everything else with `useMemo`, keyed on the narrowest slice each needs:

- `outlineGeometry = buildOutline(state.outline)`
- `railBands = computeRailBands(state.rails)`
- `templateValues: VolumeTemplateValues` from `outlineGeometry` — `{ area, length: state.outline.length, widePointWidth: state.outline.widePointWidth, noseWidthAt12: outlineGeometry.noseWidthAt12in, tailWidthAt12: outlineGeometry.tailWidthAt12in }`
- `railValues: VolumeRailValues` from `railBands` — each section's `boardThickness` and `profile`
- `effectiveFins: FinPlacementSpec` — `state.fins` unless `finsImportTemplate`, in which case `boardLength` comes from `state.outline.length`, `tailWidth12` from `outlineGeometry.tailWidthAt12in`, and `tailShape` from `state.outline.tail.kind`. Both unions use the same five names, so the mapping is a direct assignment; add a comment saying the two types are kept structurally aligned on purpose.
- `finPlacement = computeFinPlacement(effectiveFins)`
- `finTailOutline` — `null` when not importing; otherwise `{ points, connector }` in `tailOutlineHalfPoints`' own shape: `points` is `outlineGeometry.points` filtered to stations at or under 24 inches and mapped to `{ x: halfWidth, y: station }`, and `connector` is `{ x: 0, y: 0 }` for a diamond tail, `{ x: 0, y: outlineGeometry.centreCloseStation }` for a swallow, and null otherwise — the prototype's own rule at `Template.dc.html` line 276.
- `effectiveVolume: VolumeSpec` — `state.volume` with `length` and `width` replaced by the template's when `importTemplateDimensions` is on and the template is available, and `centerThickness` replaced by the rails' centre thickness when the rail import is additionally on. This is the derived-value equivalent of the prototype's `syncFromTemplate` (`Volume.dc.html` lines 235-242): it produces the same observable values without an effect that writes back into state. Comment it that way.
- `volumeResult = computeVolume(effectiveVolume, templateValues, railValues)`

Give the volume toggles the prototype's exact handoff semantics (lines 412-437), since they are the one place derived values must be written back into stored state:

- Toggling **Import Template Area** off also forces `importRailThickness` false, and copies the currently effective length and width into the stored manual fields, so the sliders start from what the shaper was just looking at rather than snapping back to 72"/20".
- Toggling it on needs no copy — the derived override takes over.
- Toggling **Calculate from Template and Rail Data** is a no-op while template import is off; toggling it off copies the currently effective centre thickness into the stored manual field.

Export `useDesign()` throwing a clear error when called outside the provider.

**B. `app/design/layout.tsx`** — wrap `props.children` in `<DesignProvider>`. Nothing else changes; the flex column stays exactly as it is.

**C. Refactor the three editors — lift state only, restyle nothing.**

- `outline-editor.tsx`: replace the local `board` state and the `buildOutline` memo with `const { outline, updateOutline, outlineGeometry, finPlacement } = useDesign()`. `showConstruction` stays local — it is a view preference, not design data. Pass `finPlacement.marks` down to `OutlineViewer`. Update the file's header comment: it no longer owns the design state, it reads it.
- `rail-band-editor.tsx`: replace the local `spec` state and the `computeRailBands` memo with the store's `rails`, `updateRailSection`, `toggleTailHardEdge` and `railBands`. `sectionOpen`, `advancedOpen` and `activePage` stay local. The shared-x-axis and legend logic is untouched.
- `fin-placement-editor.tsx`: replace the local `spec` state and both memos with the store's `effectiveFins`, `updateFins`, `finPlacement`, `finTailOutline`, `finsImportTemplate` and `setFinsImportTemplate`. `advancedOpen`, `settingsOpen`, `showCallouts`, `activeTab` and `toeTableOpen` stay local. The toe-aim-table memo now keys off `effectiveFins`.

**D. Fins: make Import Template Values real.** In `fin-controls.tsx`, add the prototype's checkbox (`Fins.dc.html` line 110) above the board-length control, using the same small muted label styling the other sidebar checkboxes use. When it is on, the Board Length, Tail Width @12" and Tail Shape controls are disabled and dimmed to `opacity: 0.45` with pointer events off on the tail-shape picker, exactly as the prototype does (`manualInputs`, `manualInputsOpacity`, `tailShapePointerEvents` at lines 1309-1311); their displayed values keep showing the imported numbers, because they read `effectiveFins`.

In `fin-viewer.tsx`, add an optional `outlineOverride?: { points: Point2D[]; connector: Point2D | null }` prop and have `buildOutlinePaths` use it in place of `tailOutlineHalfPoints(shape, tailWidth12)` when present. The rest of the path assembly — the mirror, the connector line, the catmull smoothing — is already written against that shape and must not change. The editor passes `finTailOutline`.

**E. Template: draw the fin marks.** In `outline-viewer.tsx`, accept an optional `finMarks?: FinMark[]` prop and render one group per mark inside the existing SVG, after the outline and before the callouts: a line from `(pxX(lateral), lenToY(offTail))` to `(pxX(leadingLateral), lenToY(leadingOffTail))` with `stroke-width` 2 in the accent colour, plus a filled dark circle of radius 3.5 at each end — the prototype's own `finMarksSvg` treatment at `Template.dc.html` lines 178-182 and 777-779. All coordinates are numbers computed in JSX attributes; never string-built markup, keeping the same posture the file's header already documents.

**Regression bar.** All 397 existing tests must still pass — this task changes no geometry math. If a test fails, the refactor changed behaviour and the refactor is wrong, not the test.
  </action>

  <verify>
    <automated>npx vitest run && npx tsc --noEmit && npm run build</automated>
  </verify>

  <done>One `DesignProvider` in `app/design/layout.tsx` owns the board design; the outline, rails and fins editors read and write it and are otherwise visually unchanged; the fins screen's import checkbox drives length, tail width and tail shape from the outline and draws the designed tail outline; the template screen draws the calculated fin marks; all 397 pre-existing tests still pass and `npm run build` succeeds.</done>
</task>

<task type="auto">
  <name>Task 3: The /design/volume screen and the VOLUME nav entry</name>
  <files>app/design/volume/page.tsx, components/volume/volume-estimator.tsx, components/volume/volume-controls.tsx, components/volume/volume-calculation-card.tsx, components/site-nav.tsx</files>

  <read_first>
    - `components/rails/rail-band-editor.tsx` and `components/rails/rail-controls.tsx` — the screen shell to mirror: the `aside` + `main` flex split, the sidebar's section-heading and slider markup, the `outline-*` palette tokens, and how `formatInchesFraction` / `formatFeetInches` are used for slider labels.
    - `components/rails/rail-data-table.tsx` — the card-and-rows treatment the Volume Calculation card should follow.
    - `components/design/design-store.tsx` (written in Task 2) — the exact names of `volume`, `effectiveVolume`, `updateVolume`, `volumeResult` and the two toggle handlers.
    - `lib/geometry/volume.ts` (written in Task 1) — `VolumeResult`'s fields and `BOARD_TYPE_STEP_COUNT`.
    - `reference/project/Volume.dc.html` lines 24-104 (the whole sidebar markup, including which controls are hidden versus dimmed) and lines 107-149 (the calculation card, including which rows are conditional and the exact static disclaimer text at line 145).
    - `components/site-nav.tsx` — the nav link list and active-state styling.
    - `app/design/rails/page.tsx` — the page-and-metadata pattern to copy.
  </read_first>

  <action>
**A. `components/volume/volume-controls.tsx`** — the sidebar, ported from `Volume.dc.html` lines 24-104 in order:

- Heading "Volume Estimator" with the subtitle "Approximate volume of a designed board".
- A "PRIMARY INPUTS" divider row in the same uppercase-accent style the rails sidebar uses.
- Checkbox **Import Template Area**, rendered only when `volumeResult.templateAvailable`.
- Checkbox **Calculate Volume Based on Template and Rail Data**, rendered only when `volumeResult.railAvailable`, and disabled while template import is off.
- **Board Length** — a feet select (4-10) and an inches select (0-11) side by side, plus a range slider from 60 to 120 in steps of 1. Label reads `{feet}'{inches}"`. The whole group is disabled and dimmed to `opacity: 0.4` while the template is imported (`dimensionsDisabled` / `dimensionsOpacity`).
- **Board Width** — slider 16 to 24 in steps of 0.125, label through `formatInchesFraction`, same disabled/dimmed rule.
- **Center Thickness** — slider 1.75 to 3.5 in steps of 0.0625, label through `formatInchesFraction`, disabled and dimmed while the rail data is imported (`thicknessDisabled` / `thicknessOpacity`).
- **Board Type** — slider 0 to 6 in steps of 1 with "Performance" and "Beefy" captions beneath. This control is **hidden entirely** while the rail path is active (the prototype wraps it in `!importingRailThickness`), not merely dimmed — the factors are unused on the geometry path.

Every slider value the shaper moves converts to `Mm` with `inchesToMm` at the handler, exactly as the other three screens do; `boardTypeIndex` is a bare integer and stays one. All displayed values come from the store's `effectiveVolume`, so the sliders show the imported numbers while imports are on.

**B. `components/volume/volume-calculation-card.tsx`** — the card from lines 107-149:

- Title "Volume Calculation".
- When the template is not imported, three rows first: Board Length (feet-inches), Board Width, Center Thickness.
- An area row whose label is "Template Area" when imported and "Board Area (estimated)" when not, and whose value is the area in square inches to one decimal, with " (imported)" appended when imported.
- When `geomReady`, three rows: Tail, Center and Nose Cross-Section Thickness, each through `formatInchesFraction`.
- A weighted-thickness row labelled "Length-Weighted Effective Thickness" when `geomReady` and "Weighted Thickness" otherwise.
- The total block: "Estimated Volume" against a large accent-strong `X.XX L` with `(Y.Y cu in)` beneath it in muted small text.
- At the bottom, pushed down with `mt-auto`, the italic disclaimer in muted small text — the static line the prototype's markup actually renders: "This is a rough estimate, not a 3D CAD model accurate calculation of volume." then "If comparing to a board of known dimensions and volume, you can tune the Board Type slider to calibrate for your purposes." (the prototype separates and trails the sentences with non-breaking spaces; plain spacing is fine, the words are not). Do not port the unrendered `disclaimerText`.

Every number in this card comes from `volumeResult`; the component performs no arithmetic beyond unit formatting.

**C. `components/volume/volume-estimator.tsx`** — the screen shell, mirroring `rail-band-editor.tsx`'s `aside` + `main` split and its `outline-*` tokens. No tab strip: the main column holds the single calculation card. Reads everything from `useDesign()`.

**D. `app/design/volume/page.tsx`** — the page, following `app/design/rails/page.tsx`, with metadata title "Volume Estimator — Shaper" and a one-line description.

**E. `components/site-nav.tsx`** — insert `{ href: "/design/volume", label: "VOLUME" }` between RAILS and FINS, matching the prototype's own tab order (`Sandbox.dc.html` lines 26-30). Update the file header comment to name four screens.

**Do not restart the dev server** — it is already running on port 3000 and picks these files up on its own.
  </action>

  <verify>
    <automated>npx tsc --noEmit && npm run build && npx vitest run</automated>
    <human-check>Open http://localhost:3000/design/volume. With both checkboxes ticked the card shows Template Area, three Cross-Section Thickness rows, Length-Weighted Effective Thickness and an Estimated Volume in litres with cubic inches beneath; the Board Type slider is not visible. Untick "Calculate Volume Based on Template and Rail Data" and the cross-section rows disappear, the Board Type slider appears, and the Center Thickness slider becomes editable. Untick "Import Template Area" and the length, width and thickness controls all become editable, starting from the values that were just imported. Change the outline on /design/outline and the Template Area and Estimated Volume both move. Change a rail thickness on /design/rails and the cross-section rows and volume both move.</human-check>
  </verify>

  <done>`/design/volume` renders the prototype's sidebar and Volume Calculation card driven entirely by `volumeResult`; VOLUME sits between RAILS and FINS in the nav on every design screen; `npm run build`, `npx tsc --noEmit` and `npx vitest run` all pass.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Shaper -> sidebar controls | All input is numeric slider/select values inside fixed ranges; no free text reaches the math except through the existing outline/fins controls, which already parse at their own boundary |
| Prototype HTML -> golden harness | `scripts/extract-prototype-volume-golden.mjs` evaluates code sliced out of a repo-local reference file with `new Function`, at build-tooling time only |
| Generated golden JSON -> test suite | `prototype-volume-golden.json` is generated and read back as typed fixture data |
| Cross-screen store -> every screen | One in-memory object is now shared by four screens; a bad write on one screen is visible on all of them |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-NYW-01 | Tampering | `scripts/extract-prototype-volume-golden.mjs` | medium | mitigate | The script only ever evaluates `reference/project/Volume.dc.html`, a committed repo-local file, at developer/CI time; it is never bundled into the app, never imported by `lib/`, and never fetches anything. It reads the two sibling golden JSONs by fixed relative path and throws a named error rather than falling back if either is missing. |
| T-NYW-02 | Information disclosure | `components/design/design-store.tsx` | low | accept | The store holds only board dimensions in memory, has no persistence, no network calls and no `localStorage`; the design is gone on reload. Accepted for this task; real persistence arrives with the Phase 2 model-saving work and carries its own review. |
| T-NYW-03 | Tampering | `components/outline/outline-viewer.tsx`, `components/fins/fin-viewer.tsx`, `components/volume/*` | medium | mitigate | All SVG and DOM output is rendered through JSX attributes holding numbers computed by `lib/geometry`; no string-built markup, no `dangerouslySetInnerHTML`, no `document.write` or `window.open`. Same posture the existing viewers already document. |
| T-NYW-04 | Denial of service | `lib/geometry/volume.ts` | low | mitigate | `stationEffThickness` returns zero on a zero half width instead of dividing, and `computeVolume` accepts null template/rail bags and degrades to the factor path — so a partially designed board cannot produce `NaN`/`Infinity` or throw into the render tree. Pinned by the degradation test. |
| T-NYW-SC | Tampering | npm/pip/cargo installs | high | mitigate | No new dependencies are introduced by this task — the store is React context and the screen uses the shadcn/Tailwind primitives already vendored in `components/ui/`. The package-legitimacy gate therefore has nothing to clear; if execution discovers a genuinely required new package, stop and raise a blocking human checkpoint before installing. |
</threat_model>

<verification>
1. `npm run golden` regenerates all four fixture files with no diff beyond the new volume one.
2. `npx vitest run` — the full suite, including the 397 pre-existing tests and the new volume goldens.
3. `npx tsc --noEmit` — no type errors, in particular no `any` leaking out of the golden JSON import.
4. `npm run build` — the production build succeeds.
5. `npm run lint`.
6. Manual browser pass on the already-running dev server, per Task 3's human check, plus a direct visit to each of `/design/outline`, `/design/rails`, `/design/fins` and `/design/volume` by URL to confirm each still works standalone from defaults.
</verification>

<success_criteria>
- `lib/geometry/volume.ts` reproduces both of the prototype's calculation paths, its rail-import fallback and its 61.0237 litre constant, proven by golden fixtures generated from `Volume.dc.html` itself and pinned at cm precision.
- One React-context design store holds the whole board design; the outline, rails, fins and volume screens are four views onto it, with no persistence and no message passing.
- Values flow across screens: outline area and station widths reach volume, rail profiles reach volume, outline length/tail width/tail shape and outline points reach fins, and calculated fin marks reach the template.
- The `/design/volume` screen matches the prototype's sidebar and Volume Calculation card, including which controls dim and which disappear.
- VOLUME appears between RAILS and FINS in the top nav on every design screen.
- All 397 pre-existing tests still pass; `npx tsc --noEmit` and `npm run build` are clean.
- Nothing is deployed; the dev server is left running untouched on port 3000 for the shaper's review.
</success_criteria>

<output>
Create `.planning/quick/260818-nyw-rebuild-volume-estimator-screen-lib-geom/260818-nyw-SUMMARY.md` when done.

Record in it, at minimum: the litre-constant reconciliation (prototype `61.0237` versus `units.ts`'s exact `cubicMmToLitres`, and why fidelity won); the deliberate deviation from `.planning/design/GEOMETRY-MODULE.md`'s Simpson-integration `computeVolume`, with the note that the Phase 4 foil work is where the two converge; and the shape of the design store's public API, since every screen added from here will consume it.
</output>
