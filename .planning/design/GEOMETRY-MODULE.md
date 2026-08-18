# Approved Design: Core Geometry Module

**Status:** Approved by founder 2026-08-18 (pre-implementation design, from the build guide's geometry design prompt)
**Feeds:** Phase 1 (outline, rail band, fins, units), Phase 3 (volume, templates, tests), Phase 4 (rocker/foil editors)
**Location when built:** `lib/geometry/` — pure TypeScript, no UI/browser/database imports, unit tests required

## Confirmed decisions

1. **Volume approach**: Cross-section integration (~50 stations, Simpson's rule). Sections built from half-width + foil thickness + a named rail profile (`boxy` / `medium` / `tapered`). Expected accuracy ±2–3% for v1; refined later by rail-band data. **Approved.**
2. **Rocker convention**: Measured with the board bottom-up on a flat surface, tip lift off the flat. **Approved.**
3. **Template style**: Default **half-template** (stringer to rail — trace, flip, trace), full outline available as option. Tiled 1:1 across letter/A4 with alignment marks and overlap strip, output as pure SVG text. **Approved.**

## Core principles

- One coordinate system: station 0 at tail tip → nose; width from stringer out; height from lowest point of bottom curve.
- Metric internal (`Mm` branded type); inches/litres only at the UI boundary via the units module (`formatFeetInches`, `formatInchesFraction`, `parseImperial`, etc.). The math never sees an inch.
- Branded number types (`Mm`, `Degrees`, `Litres`) so units can't be mixed silently.
- Outline stored as half-outline (symmetry automatic, matches half-template workflow).
- Tail shapes are a discriminated union — each variant carries exactly its own measurements (`swallow` has `crotchDepth`+`endWidth`, `squash` has `endWidth`, `pin`/`round`/`roundedPin` bare). Wings are separate outline features (station, depth, hard/soft) combinable with any tail.
- Outline/rocker/foil Bézier segments must be monotonic in x (no fold-backs) so "value at station X" is fast and well-defined; enforced by `validateBoard`.
- Fin placement and rail-band functions are sockets: the founder's compiled formulas and the Claude Design prototype's calculators (arriving in `reference/`, guide stage 07) supply the real content.

## Type & function inventory (approved signatures)

- `lib/geometry/units.ts` — `Mm`/`Degrees`/`Litres` brands; `mmToInches`, `inchesToMm`, `formatFeetInches`, `formatInchesFraction(denom 8|16|32)`, `parseImperial` (returns `Mm | null`), `cubicMmToLitres`
- `lib/geometry/board.ts` — `Point2D`, `BezierSegment {p0,c0,c1,p1}`, `TailShape` (union), `Wing`, `OutlineSpec {segments, tail, wings, widePointStation}`, `RockerSpec {noseRocker, tailRocker, curve}`, `FoilSpec {curve, maxThicknessStation}`, `RailProfile`, `FinConfig ('single'|'twin'|'thruster'|'quad'|'twoPlusOne')`, `FinBoxType ('glassOn'|'singleBox'|'twinTab'|'singleTab')`, `FinSetupSpec`, `BoardSpec` (the saved model's geometry payload)
- `lib/geometry/sample.ts` — `sampleOutline(board, station): Mm` (half-width), `sampleRocker`, `sampleFoil`
- `lib/geometry/section.ts` — `crossSectionAt(board, station): Point2D[]` (closed polygon), `crossSectionArea` (shoelace)
- `lib/geometry/volume.ts` — `computeVolume(board, stations≈50): VolumeResult {total, byThirds {tail, middle, nose}}`
- `lib/geometry/fins.ts` — `calculateFinPlacement(board): FinPlacementResult {positions[{role, stationFromTail, offsetFromStringer, toe, cant}], method, notes}` — one strategy per `FinConfig`, sourced from founder's compiled formulas
- `lib/geometry/template.ts` — `generateOutlineTemplate(board, paper {size letter|a4, marginMm, overlapMm}, style 'half'(default)|'full'): TemplateResult {pages[{svg,row,col}], columns, rows, style}`
- `lib/geometry/validate.ts` — `validateBoard(board): {ok, problems[]}` (width bounds, x-monotonicity, physically possible tail measurements)

## Test expectations (from build guide + Core Value)

- Every geometry function has Vitest unit tests.
- Known-good board fixtures: e.g. a 6'2" × 20½" × 2⅝" shortboard with an industry-recognized volume; get 2–3 real measured boards from shapers as fixtures.
- Volume validated against those fixtures; fin placement validated against the founder's compiled tables.
