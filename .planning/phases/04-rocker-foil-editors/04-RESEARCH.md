# Phase 4: Rocker & Foil Editors - Research

**Researched:** 2026-08-29
**Domain:** In-repo geometry/UI extension — no new external stack. The domain is "how do the
existing lib/geometry + design-store + snapshot patterns extend to a new curve type," not
"which framework do we adopt."
**Confidence:** HIGH for architecture/patterns (all derived from reading this session's own
codebase); MEDIUM for the numerical-methods choices (spline family, Simpson station count
parity), which are corroborated by external sources but not yet implemented/tested here.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Rocker and foil share **one screen** — a single side-profile drawing where the
  bottom curve is the rocker and the deck curve is rocker + thickness. The shaper always sees
  the real side view of the board while editing either.
- **D-02:** The screen is a new **ROCKER** tab placed after TEMPLATE:
  `TEMPLATE · ROCKER · RAILS · VOLUME · FINS · SUMMARY` — the nav follows shaping order
  (outline, then rocker/foil, then rails). — **Reversibility:** reversible — a nav array entry
  and route rename.
- **D-03:** The side profile draws **horizontal, nose left, by default** (the app's
  established horizontal convention from sketches 005/006), and the screen carries the same
  **rotate-in-place button** the Template screen has, because blank datasheets read
  vertically — nose up, columns side by side.
- **D-04:** The Summary order form's reserved **ROCKER box gets the real curve** this phase
  (it was built as a placeholder "until the rocker screen exists" — `RockerTicks` in
  `components/summary/order-form.tsx`). No other screens gain a side profile; the prototype's
  Rails-page side profile is *not* restored.
- **D-05:** The curve model speaks the language of a **surfboard blank datasheet** (the user
  supplied an Arctic Foam 7'3" SBF sheet as the exemplar): **five stations — nose tip,
  nose 12", center, tail 12", tail tip.** Rocker is always measured up from the bottom, so
  the center is the 0 reference and four lift values define the rocker line. Thickness is
  defined at **all five** stations and sets the deck curve on top of the rocker line —
  including real tip thicknesses, which replace `volume.ts`'s hard-coded 1/2" / 3/8" tip
  assumptions. — **Reversibility:** costly — the station set becomes the stored `RockerSpec`/
  `FoilSpec` shape in every saved snapshot; changing it later means another snapshot-version
  bump and default-filling story, not a local edit.
- **D-06:** Two ways to shape the curves, both first-class: **construction lines and sliders
  very similar to the outline generator** (including the outline editor's drag behaviour), and
  **direct typed entry of the station values** so a shaper can copy numbers straight off a
  blank datasheet. Typed entry accepts the imperial fractions shapers read on those sheets.
- **D-07:** The screen presents a **full datasheet view**: width (read-only, derived from the
  drawn outline), thickness, and rocker at each of the five stations — the page reads as the
  board's own blank sheet, ready to compare against a real blank when ordering foam.
- **D-08:** A toolbar button **hides the outline/width reference** to focus on the rocker
  alone — same toggle pattern as the Template screen's construction-lines button.
- **D-09:** Thickness on the ROCKER page and the RAILS page is **the same value** — one
  source of truth in the store; changing it on either page changes both. The design flows
  forward the way fins already derive tail width from the outline step: rocker precedes
  rails. — **Reversibility:** costly — un-sharing later means re-introducing a second
  thickness store and reconciling every consumer (rails spec, snapshot, autosave).
- **D-10:** RAILS gains an **override option** so it still works as a **standalone
  calculator**: a shaper who just wants rail-band numbers can switch off the link and type
  thickness directly — the same "import from earlier step vs. manual" pattern the Volume and
  Fins screens already use.
- **D-11:** The rocker *line* by itself does **not** change rail-band numbers — thickness is
  the coupling. Adjusting only rocker redraws the side profile (and Summary box); band dims
  move when thickness moves. No invented rocker-to-rail formulas.
- Note for the planner: the ROCKER page holds five thickness stations; RAILS consumes three
  of them (nose 12", center, tail 12"). The tips exist only on the side profile and feed the
  volume integration.
- **D-12:** All four board-type presets (Shortboard, Fish, Mid-length, Longboard) gain
  **full side-profile character** — tuned rocker + thickness values per type, using the same
  tune-in-the-live-editor, capture-back workflow Phase 1 used for outlines (a dev-only
  "copy current values" affordance is acceptable again). "A Fish starts looking like a fish"
  now applies from the side too.
- **D-13:** A board designed in the app gets the **accurate cross-section litres** (the
  GEOMETRY-MODULE Simpson method, now that foil + real tip thicknesses exist) and that figure
  shows **everywhere the app quotes volume** — Volume screen, rack cards, Summary. The
  **quick estimator survives as the Volume screen's standalone mode** (board-type slider +
  factor tables, import toggles off) — mirroring the Rails standalone decision. Neither path
  is deleted.
- **D-14:** The new math is **validated against published blank datasheets** — model a real
  blank's five stations (e.g. the Arctic Foam 7'3" SBF, stated 77.17 L) with rails set
  full/boxy and require the computed litres to land close. This is the chosen known-good
  source; the user declined measured-board fixtures, CAD cross-checks, and estimator sanity
  bands. Datasheet numbers are hand-entered from a published external authority with
  provenance comments — the one sanctioned exception to "goldens come from the prototype,"
  because this math has no prototype ancestor.
- **D-15:** Older saved boards reopening under the new math **just show the better number** —
  they load with a default side profile (snapshot versioning fills it) and the accurate
  litres, no ceremony, no migration note.

### Claude's Discretion

- Spline construction between the five stations: fitting method, handle behaviour, and
  monotonicity enforcement (GEOMETRY-MODULE's no-fold-backs rule), plus which sliders exist
  beyond the station values. The outline editor's inverse-solve discipline applies: every
  drag result must be slider-representable.
- Rails override mechanics: toggle default (linked, for boards designed in the app), wording,
  and whose values win when re-linking.
- Simpson integration details: station count (~50 per the approved design), and whether
  cross-sections use the rail-band module's real computed sections or the design doc's named
  rail profiles — prefer whichever is truthful to the drawn board; record the choice.
- Tip-thickness defaults for a finished board (presets will set their own).
- Datasheet-view layout, drafting-grammar application per the sketch manifest, typed-entry
  parsing/formatting (via `lib/geometry/units.ts` — `parseImperial`,
  `formatInchesFraction`), and all plain-English copy.
- Validation tolerance against the blank datasheet volume (a blank is uncut foam with
  square-ish rails — pick the fullest rail treatment and justify the tolerance).
- Revisit `CUBIC_INCHES_PER_LITRE` per volume.ts deviation 2: the accurate path should use
  the exact `cubicMmToLitres`; the ported estimator keeps its prototype-faithful constant.

### Deferred Ideas (OUT OF SCOPE)

- **Blank picker / blank-recommendation tool** — select a real blank (e.g. Arctic Foam
  7'3" SBF) and the app fills or suggests rocker/thickness values, or recommends a blank
  that fits the designed board. User's words: "later I think I'd like to be able to select a
  blank and have a blank recommend tool." The five-station datasheet model (D-05) is
  deliberately shaped so blank data can drop straight in. Future phase / backlog.
- **Bottom contours** — its rocker dependency arrives this phase, but it is a new capability
  needing its own requirement ID and roadmap slot. Design consideration for the planner:
  contour depth is measured off the rocker line, so the rocker model/spline API should not
  assume the bottom is the final surface — leave room for a later contour to reference it.
  Not folded.
- **Presets for rails & fins**, **Copy-spec to clipboard**, **Rails instructions page, Rails
  viewer extras, Units toggle/global settings, Photo uploads, Mobile layout polish, Fins
  imported-tail curve, Blending-curves paper-saver** — reviewed, none are rocker/foil work,
  stay backlog.
</user_constraints>

## Project Constraints (from CLAUDE.md)

- **Geometry math lives in `lib/geometry/`, pure and tested** — no React, browser API, or
  database imports; every exported function gets unit tests; never inline a formula in a
  component. Applies directly to `rocker.ts`, `foil.ts`, and the Simpson volume path.
- **Never hand-transcribe an expected number — regenerate the fixture.** Existing fixtures come
  from `scripts/extract-prototype-*-golden.mjs` executing the prototype's own code; the new
  volume math has no prototype ancestor, so D-14 is the founder-sanctioned exception —
  hand-entered blank-datasheet fixtures with provenance comments, not auto-extracted.
  `npm run golden` regenerates the four *existing* fixtures and must stay green; it does not
  (and should not) generate the new blank-datasheet fixture.
- **Inches and litres on screen, metric in the data.** Every conversion of a design value goes
  through `lib/geometry/units.ts` (`parseImperial`, `formatInchesFraction`, `inchesToMm`,
  `mmToInches`); never reach for `25.4` anywhere else. Applies to the ROCKER screen's typed
  datasheet entry (D-06) and the accurate litres figure (D-13).
- **Plain-English explanations** — users are shapers and surfers, not developers. Any
  in-app copy, commit message, or summary this phase produces should describe what changes to
  the board or the screen, not implementation detail.
- **Stack is prescribed** (Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4,
  shadcn/ui, Vitest) — confirmed via `package.json`; no substitution proposed by this research.
- **Always push code before migrating production** — not applicable this phase unless a
  database schema change is introduced; rocker/foil persistence rides the existing
  `boardSnapshot` JSON column via `design-snapshot.ts`'s version-tolerant schema, so no new
  Drizzle migration is expected. If the planner determines a schema (not just JSON-shape)
  change is needed, this rule governs the deploy order.

## Summary

Phase 4 has almost no net-new *stack* to research — no new package, no new framework, no new
service. What it needs is a correct extension of patterns this codebase has already established
four times over (outline, rail bands, fins, volume): a pure `lib/geometry/*` module per new
concept, a `DEFAULT_*` constant, a derive/inverse-drag pair mirroring `outline-drag.ts`, and a
store field wired through `design-snapshot.ts`'s version-tolerant schema. The two things that
are genuinely new are (1) a **monotone spline** through the five blank-datasheet stations — the
prototype's own `buildSideProfile` used an unconstrained Catmull-Rom curve that can fold back,
which the approved design doc explicitly forbids — and (2) the **Simpson's-rule volume
integration** that `lib/geometry/volume.ts` has been carrying a documented IOU for since Phase 3
("deviation 3"). Both are well-understood numerical methods (Fritsch-Carlson/PCHIP-style monotone
Hermite interpolation; composite Simpson's rule with an even number of panels) that should be
hand-written and unit-tested in TypeScript exactly like every other formula in `lib/geometry/`,
not imported from a math/spline package — nothing in this repo pulls in a numerics library today,
and CLAUDE.md Rule 1 already commits to hand-rolled, tested formulas as the trust model.

The one already-solved building block worth calling out because it removes real risk from this
phase: `lib/geometry/outline.ts` already exports `sampleOutline(geometry, station): Mm`, matching
GEOMETRY-MODULE.md's approved `sample.ts` signature exactly, just living in `outline.ts` instead
of a separate file. The Simpson volume integration can call this directly for half-width at each
of its ~50 stations — the missing piece is only the foil-thickness sampler (new) and a per-station
rail-shape sampler (new, built by interpolating the existing `RailSectionSpec`/`computeRailSection`
machinery between the nose/center/tail sections rather than inventing a new "named rail profile"
shortcut).

**Primary recommendation:** Build `lib/geometry/rocker.ts` and `lib/geometry/foil.ts` as new
peer modules to `rail-bands.ts`/`fins.ts` (DEFAULT_* spec, compute function, monotone-by-
construction spline sampler), add a `rocker-drag.ts` mirroring `outline-drag.ts`'s inverse-solve
discipline, extend `volume.ts` with a second exported function (`computeVolumeAccurate` or
similar — keep the existing three-station `computeVolume` untouched as the estimator's engine per
D-13) that Simpson-integrates cross-sections built from `sampleOutline` + a foil-thickness sample
+ an interpolated rail cross-section, and thread the new `RockerSpec`/`FoilSpec` through
`design-store.tsx`, `design-snapshot.ts` (version bump, `.partial()` tolerance preserved), and
`presets.ts` (D-12) exactly the way `RailBandSpec`/`FinPlacementSpec`/`VolumeSpec` already are.

## Architectural Responsibility Map

This app has no separate backend business-logic tier — everything computes client-side in
`lib/geometry/` (pure TS) driven by `components/design/design-store.tsx` (React context), with
Postgres only as a persistence boundary reached through one Server Action (`saveModel`). The
map below uses this app's real tiers rather than a generic web-app tier list.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Rocker curve shaping (sliders + drag) | Browser/Client | — | Pure state + `lib/geometry/rocker.ts`, same as outline editing today |
| Foil thickness shaping (sliders + typed entry) | Browser/Client | — | Same as rocker; `parseImperial`/`formatInchesFraction` already client-boundary code |
| Live rail-band recalc from shared thickness | Browser/Client | — | Derived `useMemo` in `design-store.tsx`, mirrors `deriveRailValues`/`effectiveFins` |
| Live 2D side-profile visualization | Browser/Client | — | New SVG viewer component, same pattern as `outline-viewer.tsx`/`fin-viewer.tsx` |
| Accurate Simpson cross-section volume | Browser/Client | — | Synchronous pure computation in `lib/geometry/volume.ts`, no server round-trip |
| Rocker/foil persistence (save/restore) | Database/Storage | Browser/Client | Postgres via `saveModel` Server Action + `design-snapshot.ts`; client triggers autosave |
| Preset side-profile values (Shortboard/Fish/Mid/Longboard) | Browser/Client | — | Static data in `lib/geometry/presets.ts`, no persistence tier involved |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ROCK-01 | User can define a rocker curve (nose and tail rocker profile) for the board | New `lib/geometry/rocker.ts` module + `rocker-drag.ts` inverse-solve, ROCKER screen wired to shared store, D-05/D-06/D-07 station model |
| FOIL-01 | User can define a foil (thickness distribution along the length of the board) | New `lib/geometry/foil.ts` module, five-station thickness feeding both rails (D-09) and the accurate volume path (D-13) |
</phase_requirements>

## Standard Stack

### Core

No new runtime dependency is needed. Every capability this phase requires — monotone spline
interpolation, Simpson's-rule numerical integration, imperial-fraction parsing — has a documented
closed-form implementation short enough to hand-write and unit test, matching this codebase's
existing practice (`lib/geometry/*` contains zero third-party math/geometry libraries today;
`package.json`'s only non-framework dependencies are `jspdf`, `zod`, and the UI kit).

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| *(none — hand-written)* | — | Monotone cubic spline through the 5 rocker/foil stations | Fritsch-Carlson / PCHIP-style tangent constraint is ~30 lines of TS; adding a spline package for one closed-form formula would be the first math dependency in the repo and contradicts CLAUDE.md Rule 1's "pure, tested, in `lib/`" model [ASSUMED — a repo-consistency recommendation, not an external requirement] |
| *(none — hand-written)* | — | Composite Simpson's-rule volume integration | GEOMETRY-MODULE.md already specifies this as a hand-rolled ~50-station integration; `volume.ts`'s existing trapezoidal integration in the estimator path is the direct precedent for style |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^4.4.3 (already installed) [VERIFIED: package.json] | Extends `design-snapshot.ts`'s schema with `rocker`/`foil` fields | Every new snapshot field, same as `outlineSpecSchema`/`railBandSpecSchema` today |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written monotone Hermite spline | `d3-shape`'s `curveMonotoneX`, or a small npm package like `cubic-spline` | Pulls in a UI/DOM-adjacent charting library (d3-shape) or an unaudited micro-package for one formula this codebase can own, test, and keep inside `lib/geometry/`'s no-dependency, pure-TS posture — not recommended |
| Hand-written Simpson integration | A numerical-methods package (e.g. `numeric`, `ml-matrix`) | Massive overkill for one closed-form quadrature rule; the prototype's own volume math (already ported into `volume.ts`) sets the precedent of hand-writing this class of formula |

**Installation:**
```bash
# No new packages this phase.
```

**Version verification:** N/A — no new packages recommended. If the planner later decides a
spline/numerics package is warranted, run `npm view <package> version` and the Package
Legitimacy Gate before adding it; none is recommended here.

## Package Legitimacy Audit

**No external packages are installed by this phase.** All new geometry (monotone spline
sampling, Simpson's-rule integration) is hand-written TypeScript under `lib/geometry/`, following
the pattern established by every prior phase's ports (`outline.ts`, `rail-bands.ts`, `fins.ts`,
`volume.ts`) — none of which depend on a third-party math library. The Package Legitimacy Gate
therefore does not apply; if a future planning pass decides to add a spline/numerics package
despite the recommendation above, run the gate at that time.

**Packages removed due to [SLOP] verdict:** none (none proposed)
**Packages flagged as suspicious [SUS]:** none (none proposed)

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                 DesignProvider (client)                  │
                    │  components/design/design-store.tsx                     │
                    │                                                          │
  ROCKER screen ───▶│  state.rocker: RockerSpec ──┐                           │
  (typed entry /     │  state.foil:   FoilSpec ────┤                          │
   drag / sliders)   │                              ▼                         │
                    │                     ┌─────────────────┐                 │
                    │                     │ derived (useMemo)│                │
                    │                     │  effectiveRails  │──▶ RAILS screen│
                    │                     │  (thickness link,│    (override   │
                    │                     │   D-09/D-10)     │     toggle)    │
                    │                     └────────┬─────────┘                │
                    │                              │                          │
                    │                     ┌────────▼─────────┐                │
                    │                     │  volumeResult     │──▶ VOLUME +   │
                    │                     │  (Simpson, D-13)  │    Summary +  │
                    │                     └───────────────────┘    rack cards│
                    │                                                          │
                    │  designSnapshotFields (extended) ──▶ saveModel ────────┼──▶ Postgres
                    └─────────────────────────────────────────────────────────┘
                                     ▲
                                     │ applyModel (reopen)
                                     │ parseSnapshot fills RockerSpec/FoilSpec
                                     │ defaults for pre-Phase-4 rows (D-15)
                                     │
                              lib/models/design-snapshot.ts
```

Entry points: the new ROCKER screen's controls (sliders, drag targets, typed datasheet fields)
and the RAILS screen's override toggle both write into the same store. Processing: pure functions
in `lib/geometry/rocker.ts` / `foil.ts` sample the monotone curve at any station; `volume.ts`'s
new Simpson path composes `sampleOutline` (existing) + the foil sampler (new) + an interpolated
rail cross-section (new, built from existing `computeRailSection`/`buildRailProfile`). Output:
the 2D side profile viewer, the Summary order form's rocker box (D-04), and every consumer of
`volumeResult`.

### Recommended Project Structure

```
lib/geometry/
├── board.ts              # add RockerSpec, FoilSpec types + DEFAULT_* (extends BoardSpec)
├── rocker.ts              # NEW — mirrors rail-bands.ts: spec, DEFAULT_ROCKER_SPEC, sampleRocker, monotone spline
├── rocker-drag.ts          # NEW — mirrors outline-drag.ts: inverse-solve for construction-line drag
├── foil.ts                 # NEW — mirrors rocker.ts: spec, DEFAULT_FOIL_SPEC, sampleFoil
├── foil-drag.ts            # NEW — same pattern as rocker-drag.ts (or folded into rocker-drag.ts if the two share a viewer)
├── volume.ts                # ADD: second exported compute function (Simpson path), keep existing computeVolume for the estimator (D-13)
├── design.ts                 # ADD: deriveEffectiveRails (D-09 thickness-linking), extend summarizeDesign if needed
└── presets.ts                  # EXTEND: each BoardPreset gains rocker + foil (D-12)

components/rocker/            # NEW — mirrors components/rails/, components/fins/
├── rocker-editor.tsx           # screen shell, mirrors outline-editor.tsx (toolbar: rotate D-03, hide-outline-reference D-08)
├── rocker-controls.tsx          # sidebar sliders + typed datasheet fields (D-06)
└── rocker-viewer.tsx            # side-profile SVG (bottom curve = rocker, deck curve = rocker+thickness), D-01/D-07

app/design/rocker/                # NEW route, page.tsx renders <RockerEditor />
```

### Pattern 1: New geometry module per concept (established 4x already)

**What:** Each design concept (outline, rail bands, fins, volume) gets its own
`lib/geometry/<concept>.ts` with a `<Concept>Spec` interface, a `DEFAULT_<CONCEPT>_SPEC`
constant, and a pure `compute<Concept>(spec): <Concept>Result` function. No React/browser/DB
imports; every export unit-tested.

**When to use:** Rocker and foil are new first-class design concepts (ROCK-01, FOIL-01), so each
gets its own file rather than being folded into `board.ts` (which stays types-only) or
`rail-bands.ts` (which stays rail-specific).

**Example:**
```typescript
// Source: lib/geometry/rail-bands.ts (this session, read in full) — the pattern to mirror
export interface RailSectionSpec { boardThickness: Mm; deckPercent: number; /* ... */ }
export const DEFAULT_RAIL_BAND_SPEC: RailBandSpec = { /* ... */ };
export function computeRailBands(spec: RailBandSpec): RailBandsOutput { /* ... */ }
```

### Pattern 2: Inverse-drag solve, one file per draggable concept

**What:** `lib/geometry/outline-drag.ts` turns a dragged screen point back into spec-field
patches, snapping every result to its slider's step/bounds (`quantise`) so a drag can never reach
a value the sidebar can't reproduce. CONTEXT.md's discretion note explicitly says rocker/foil
construction-line dragging "should follow it exactly."

**When to use:** Any time D-06's "construction lines and sliders" drag interaction is built for
the five rocker/foil stations.

**Example:**
```typescript
// Source: lib/geometry/outline-drag.ts (this session, read in full)
function quantise(value: number, limit: Limit): number {
  if (!Number.isFinite(value)) return limit.min;
  const snapped = Math.round(value / limit.step) * limit.step;
  const clamped = Math.min(limit.max, Math.max(limit.min, snapped));
  return Math.round(clamped / limit.step) * limit.step;
}
```

### Pattern 3: Derived "effective" value instead of a sync effect (D-09's thickness link)

**What:** `design-store.tsx`'s own doc comment is explicit: "no reducer library, and every
design-field mutator sets state directly rather than through a synchronization effect that
mirrors one piece of state into another." The existing precedent for "value on screen A drives a
default on screen B, with an override" is `effectiveVolume`
(`lib/geometry/design.ts::deriveEffectiveVolume`) and `effectiveFins`
(`design-store.tsx`'s `finsImportTemplate` memo) — both `useMemo`d derived values, never an
effect that writes back into `state.rails`.

**When to use:** D-09 (thickness flows rocker → rails) + D-10 (rails override toggle) is
structurally identical to the existing Volume-screen import-toggle pattern.

**Example:**
```typescript
// Source: lib/geometry/design.ts (this session, read in full)
export function deriveEffectiveVolume(
  volume: VolumeSpec,
  templateValues: VolumeTemplateValues,
  railValues: VolumeRailValues,
): VolumeSpec {
  if (!volume.importTemplateDimensions) return volume;
  const centerThickness = volume.importRailThickness ? railValues.centerThickness : volume.centerThickness;
  return { ...volume, length: templateValues.length, width: templateValues.widePointWidth, centerThickness };
}
```
Recommend an analogous `deriveEffectiveRails(rails: RailBandSpec, foil: FoilSpec, rocker: RockerSpec): RailBandSpec`
(or a narrower `deriveRailThickness` per-section) that `design-store.tsx` calls the same way, with
a new per-section `RailSectionSpec` field (e.g. `thicknessOverride: Mm | null`, mirroring
`bottomTuck3Override`'s null-means-linked convention already used twice in this same file) rather
than duplicating `boardThickness` as two independently-mutated fields.

### Pattern 4: Import/override toggle UI (D-10's "standalone calculator" requirement)

**What:** The exact `<Checkbox checked={...} onCheckedChange={...} />` idiom already used twice
on the Volume screen for "import from earlier step vs. manual."

**Example:**
```typescript
// Source: components/volume/volume-controls.tsx lines 87-96 (this session, read in full)
{railAvailable && (
  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-surf-ink-muted font-normal">
    <Checkbox
      checked={effectiveVolume.importRailThickness}
      onCheckedChange={() => onToggleImportRailThickness()}
      disabled={!effectiveVolume.importTemplateDimensions}
    />
    Calculate Volume Based on Template and Rail Data
  </label>
)}
```
D-10's rails override toggle should read the same way, defaulted to linked/imported (per
"boards designed in the app" being the common case) with a manual-entry path that survives even
when the rocker/foil screen has never been touched.

### Anti-Patterns to Avoid

- **Unconstrained Catmull-Rom through the five stations:** the prototype's own
  `buildSideProfile` (`reference/project/Rails.dc.html` line 800, `this.catmullRomC(bottomPts)`)
  is exactly this — useful as *prior art for the drawing shape*, but it carries no monotonicity
  guarantee. GEOMETRY-MODULE.md's "no fold-backs" rule (validated via a `validateBoard` function
  that does not exist yet in this codebase — confirmed by search, see Common Pitfalls) means a
  plain Catmull-Rom port would let a shaper's typed values fold the rocker line back on itself.
  Use a monotone-constrained method instead (Fritsch-Carlson / PCHIP-style tangents) — see Code
  Examples.
- **A sync effect mirroring rocker/foil thickness into `rails.*.boardThickness`:** explicitly
  forbidden by this codebase's own established rule (see Pattern 3). Use a derived `useMemo`
  value instead.
- **Inventing a new rocker-to-rail-band formula:** D-11 is explicit — "No invented
  rocker-to-rail formulas." The rocker *line* only redraws the side profile; only *thickness*
  (the foil) is the coupling to rail bands.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Snapshot version tolerance for new top-level fields | A custom "is this field present" branch per screen | `design-snapshot.ts`'s existing `.partial()` + `DEFAULT_*` backfill pattern (already built, already tested) | It's the exact mechanism D-15 relies on ("older saved boards just show the better number... no migration note") — the file's own doc comment says this is precisely what Phase 4 exercises |
| Imperial fraction parsing for typed datasheet entry (D-06) | A new parser for `5 9/16"` style values | `lib/geometry/units.ts`'s `parseImperial`/`formatInchesFraction` (already handles feet, decimals, fractions, negative offsets) | Already tested, already the one place 25.4 is allowed to appear (CLAUDE.md Rule 2) |
| Half-width at an arbitrary station along the drawn outline | A new interpolation routine | `lib/geometry/outline.ts`'s already-exported `sampleOutline(geometry, station): Mm` | Matches GEOMETRY-MODULE.md's approved `sample.ts` signature exactly; already implemented and battle-tested by every other screen that reads outline width |

**Key insight:** Every "don't hand-roll" item above is not a third-party library — it's *code
this repo already wrote for a different screen*. The main integration risk in this phase is
reinventing a sibling module's already-solved problem, not reaching for an external dependency.

## Common Pitfalls

### Pitfall 1: Composite Simpson's rule requires an even number of panels

**What goes wrong:** GEOMETRY-MODULE.md specifies "~50 stations, Simpson's rule." The classic
composite Simpson's 1/3 formula alternates 4-2-4-2…-4 weights and is only exact for an **even**
number of subintervals (an **odd** number of sample points) [CITED:
esurveying.net/earthwork-quantity/area-calculation-simpsons-1-3rd-rule,
civilprojectsonline.com/surveying-and-levelling/methods-of-calculation-of-areas-in-surveying-simpsons-rule].
"~50" is not itself a valid panel count for the naive formula — implement with (e.g.) 51 stations
(50 panels) or add an odd-panel remainder rule, and unit-test the boundary case explicitly.

**Why it happens:** "~50" reads like a round number to hard-code, but Simpson's rule's weight
pattern is parity-sensitive in a way trapezoidal integration (used by the existing three-station
estimator) is not.

**How to avoid:** Pick a concrete even panel count (e.g. 50) and assert it in a named constant;
add a unit test that would fail loudly (wrong total weight) if the constant were ever set to an
odd number.

**Warning signs:** Volume computed via the accurate path drifts from the blank-datasheet fixture
(D-14) by more than the chosen tolerance in a way that scales with station count changes.

### Pitfall 2: The approved GEOMETRY-MODULE.md `RockerSpec`/`FoilSpec` signatures are stale

**What goes wrong:** GEOMETRY-MODULE.md (2026-08-18, pre-discussion) specifies
`RockerSpec {noseRocker, tailRocker, curve}` and `FoilSpec {curve, maxThicknessStation}` — a
2-value-per-curve model. CONTEXT.md's D-05 (2026-08-29, post-discussion, **locked**) instead
specifies:

> "**five stations — nose tip, nose 12", center, tail 12", tail tip.** Rocker is always measured
> up from the bottom, so the center is the 0 reference and four lift values define the rocker
> line. Thickness is defined at **all five** stations..."
> [VERIFIED: .planning/phases/04-rocker-foil-editors/04-CONTEXT.md:53-58]

**Why it happens:** The approved design doc predates the founder's blank-datasheet exemplar
session; nothing in this codebase or docs set has reconciled the two.

**How to avoid:** Follow CONTEXT.md D-05 (locked decision, and the more recent, more specific
source) — `RockerSpec` should carry 4 fields (`noseTip`, `nose12`, `tail12`, `tailTip`; center is
implicitly 0), `FoilSpec` should carry 5 fields (`noseTip`, `nose12`, `center`, `tail12`,
`tailTip`). Document this divergence from the approved design doc in `board.ts`'s header comment,
the same way `volume.ts`'s header documents its own 4 numbered deviations from
GEOMETRY-MODULE.md/the prototype — this codebase has an established convention for recording
exactly this kind of "the approved design says X, we deliberately did Y" note.

### Pitfall 3: Rails needs only 3 of the 5 foil stations — don't wire all 5

**What goes wrong:** `RailSectionSpec.boardThickness` exists once per section (nose/center/tail —
3 values). The foil has 5 stations. Naively binding `rails.nose.boardThickness` to
`foil.noseTip` (rather than `foil.nose12`) would silently use the wrong station.

**How to avoid:** CONTEXT.md is explicit: "the ROCKER page holds five thickness stations; RAILS
consumes three of them (nose 12", center, tail 12"). The tips exist only on the side profile and
feed the volume integration." [VERIFIED: .planning/phases/04-rocker-foil-editors/04-CONTEXT.md:84-86]
Map `foil.nose12 → rails.nose`, `foil.center → rails.center`, `foil.tail12 → rails.tail`; keep
`foil.noseTip`/`foil.tailTip` out of the rails wiring entirely.

**Warning signs:** Rail band numbers on the RAILS screen don't match what the ROCKER datasheet's
own nose-12"/tail-12" thickness columns show.

### Pitfall 4: Two litre constants must not both feed "the accurate number"

**What goes wrong:** `volume.ts` documents (deviation 2, header comment) that the existing
estimator deliberately uses the prototype's truncated `CUBIC_INCHES_PER_LITRE = 61.0237` instead
of the exact `cubicMmToLitres`, and says explicitly: "the divergence should be revisited when the
foil-based Simpson `computeVolume` ... replaces this method." [VERIFIED: lib/geometry/volume.ts:16-20,
quoted: "This module keeps the prototype's constant so the port is bit-faithful ... the divergence
should be revisited when the foil-based Simpson computeVolume (see deviation 3) replaces this
method."] The new accurate path must call `cubicMmToLitres` (exact); the kept-alongside estimator
(D-13's standalone mode) legitimately keeps `CUBIC_INCHES_PER_LITRE`. Don't accidentally
standardize both on one constant, and don't accidentally leave the new path using the old one.

**How to avoid:** New Simpson path computes cubic mm directly and converts with
`cubicMmToLitres`; existing `computeVolume` (renamed conceptually to "the estimator path" but
possibly kept as-is per CONTEXT.md's discretion note) is untouched.

### Pitfall 5: No `validateBoard`/monotonicity-enforcement function exists yet

**What goes wrong:** GEOMETRY-MODULE.md's "Bézier segments must be monotonic in x... enforced by
`validateBoard`" describes a function (`lib/geometry/validate.ts`) that a repo-wide search
confirms does not exist anywhere in this codebase today [VERIFIED: `grep -rn validateBoard
lib/ components/` returned zero matches, run this session]. Building a full `validateBoard`
implementation is out of this phase's stated scope (ROCK-01/FOIL-01 + the three roadmap success
criteria say nothing about a validation report UI).

**How to avoid:** Enforce the no-fold-back rule *by construction* — pick a spline family that is
monotone by definition (Fritsch-Carlson/PCHIP-style tangent constraints) rather than fitting an
unconstrained curve and then validating it after the fact. This satisfies GEOMETRY-MODULE's rule
without requiring a new validator module, and matches CONTEXT.md's own discretion note ("The
outline editor's inverse-solve discipline applies: every drag result must be slider-representable" —
i.e., the constraint should live in the math, not a separate check).

## Code Examples

### `sampleOutline` — already built, ready to consume for the Simpson stations' half-width

```typescript
// Source: lib/geometry/outline.ts lines 141-149 (this session, read in full)
/**
 * Samples the half-width at a given station by linearly interpolating
 * between the two bracketing sampled points. When the station is past the
 * end, returns the last point's half-width (matches the prototype's
 * `xAtY` fallback exactly, rather than throwing).
 */
export function sampleOutline(geometry: OutlineGeometry, station: Mm): Mm {
  return mm(interpolateHalfWidth(geometry.points, station));
}
```

### Prototype's side-profile station model — prior art for the drawing shape, NOT the spline method

```javascript
// Source: reference/project/Rails.dc.html lines 782-807 (this session, read this section)
buildSideProfile(lenToY, height, thicknesses) {
  const THICK_SCALE = 16, THICK_PAD = 16, tipThickness = 0.3;
  const bottomStations = [
    { x: 0, h: 4.5 }, { x: 12, h: 1.25 }, { x: 36, h: 0 }, { x: 60, h: 0.375 }, { x: 72, h: 2 },
  ];
  const deckStations = [
    { x: 0, h: bottomStations[0].h + tipThickness },
    { x: 12, h: bottomStations[1].h + thicknesses.nose, label: `Nose @ 12" — ${this.disp(thicknesses.nose)}` },
    { x: 36, h: bottomStations[2].h + thicknesses.center, label: `Center — ${this.disp(thicknesses.center)}` },
    { x: 60, h: bottomStations[3].h + thicknesses.tail, label: `Tail @ 12" — ${this.disp(thicknesses.tail)}` },
    { x: 72, h: bottomStations[4].h + tipThickness },
  ];
  // ... catmullRomC(bottomPts) / catmullRomC(deckPtsRev) draws the curve (UNCONSTRAINED — see Pitfall 5)
}
```
This confirms the "generic shortboard assumptions" CONTEXT.md refers to (hard-coded nose 4.5"/1.25",
center 0", tail 0.375"/2", fixed `tipThickness = 0.3` for both ends) and is exactly what D-05's
real 5-station model with real tip thickness replaces. The **deck-over-bottom construction**
(deck height = bottom height + thickness at that station) is correct prior art to keep; the
**Catmull-Rom curve fit** is not (see Pitfall 5).

### Existing 3-station shoelace/trapezoid volume method — precedent for the Simpson closing-polygon technique

```typescript
// Source: lib/geometry/volume.ts lines 186-195, 265-279 (this session, read in full)
function stationEffThickness(profile: [number, number][], boardThickness: number, halfWidth: number): number {
  if (!halfWidth) return 0;
  const poly: [number, number][] = [[-halfWidth, boardThickness], ...profile, [-halfWidth, 0]];
  return shoelaceArea(poly) / halfWidth;
}
// ...
const trapz = (a: number, b: number, d: number) => ((a + b) / 2) * d;
const totalArea =
  trapz(tipThickness, tailEffIn, 12) +
  trapz(tailEffIn, centerEffIn, halfLen - 12) +
  trapz(centerEffIn, noseEffIn, L - 12 - halfLen) +
  trapz(noseEffIn, tipThickness, 12);
```
The new Simpson path is the same shoelace-polygon-per-station idea, generalized from 3 fixed
stations + trapezoidal weighting to ~50 (even count) stations + Simpson weighting — the closing-
polygon technique (`[-halfWidth, thickness] ... profile ... [-halfWidth, 0]`) does not need to
change, only the number of stations and the integration weights.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Unconstrained Catmull-Rom spline through hard-coded rocker stations (prototype's `buildSideProfile`) | Monotone-constrained spline (Fritsch-Carlson/PCHIP-style) through 4-5 shaper-entered stations | This phase | Prevents a physically-impossible folded rocker line; makes the curve user-editable for the first time |
| 3-station trapezoidal volume estimate (prototype-faithful, kept as D-13's standalone mode) | ~50-station Simpson cross-section integration reading the real drawn foil + rail bands | This phase (GEOMETRY-MODULE.md deviation 3, documented since Phase 3) | Accurate, checkable-against-a-published-blank litres number (D-14); estimator survives unchanged as a fallback |

**Deprecated/outdated:**
- Hard-coded "generic shortboard assumptions" rocker (`reference/project/Rails.dc.html`'s
  `bottomStations` array) and the hard-coded 1/2"/3/8" tip thicknesses in `volume.ts`'s estimator
  path: superseded for boards that use the new rocker/foil editors (D-05), but the estimator path
  itself is explicitly kept (D-13) for the standalone quick-estimate mode, so this constant is
  *not* deleted — only bypassed when real foil data exists.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | New geometry lives in `lib/geometry/rocker.ts` + `lib/geometry/foil.ts` as two separate files (rather than one `lib/geometry/rocker-foil.ts`, or folded into `board.ts`) | Architecture Patterns / Recommended Project Structure | Low — purely a file-organization choice; the planner can consolidate without changing any formula, since it mirrors an established pattern (rail-bands.ts/fins.ts are already separate concept files) rather than dictating one |
| A2 | Rail cross-sections for the ~50 Simpson stations should be built by *interpolating the existing `RailSectionSpec` parameters* (family, ratioTopPercent, deckPercent, etc.) between nose/center/tail and re-running `computeRailSection`, rather than using GEOMETRY-MODULE.md's originally-approved "named rail profile (boxy/medium/tapered)" shortcut | Summary; Recommended Project Structure | Medium — this is the more faithful-to-the-drawn-board interpretation per CONTEXT.md's own discretion note ("prefer whichever is truthful to the drawn board; record the choice"), but the exact interpolation function (linear in station? held constant per third?) is not specified anywhere and is a real design decision for the plan, not just an implementation detail |
| A3 | `DESIGN_SNAPSHOT_VERSION` bumps from 1 to 2 when rocker/foil fields are added | Architecture Patterns / System Architecture Diagram | Low — this is what the file's own doc comment says the version field is for; the only risk is forgetting the `.partial()` + `DEFAULT_*` backfill wiring for the two new top-level keys |
| A4 | New route is `/design/rocker` with `components/rocker/*`, inserted into `site-nav.tsx`'s `NAV_LINKS` between TEMPLATE and RAILS | Architecture Patterns / Recommended Project Structure | Low — directly matches CONTEXT.md D-02's locked nav order; only the exact route slug (`rocker` vs. something else) is inferred, not specified verbatim in CONTEXT.md |
| A5 | No new npm package is needed for the monotone spline or Simpson integration | Standard Stack | Low-Medium — if the monotone Hermite implementation proves fiddly to get exactly right (tangent formula edge cases at the two end stations), a small, well-vetted spline utility could reduce risk, but this would be the first math dependency in the repo and should be a deliberate call, not a default |

**If this table is empty:** N/A — see rows above.

## Open Questions

1. **Exact interpolation method for rail cross-section shape across ~50 Simpson stations**
   - What we know: CONTEXT.md leaves this to Claude's Discretion, explicitly framing it as
     "whether cross-sections use the rail-band module's real computed sections or the design
     doc's named rail profiles — prefer whichever is truthful to the drawn board; record the
     choice."
   - What's unclear: The precise interpolation function between the three known `RailSectionSpec`s
     (nose/center/tail) at arbitrary intermediate stations — this codebase has no precedent for
     interpolating a *parametric spec* (family, ratio, deckPercent) rather than a *sampled value*.
   - Recommendation: Station-linear interpolation of each numeric `RailSectionSpec` field between
     the three known sections (clamped/held constant past the outer two sections toward the
     tips), then call the existing `computeRailSection` at each Simpson station — reuses the real
     formula rather than approximating with a named profile, and needs no new UI.

2. **Internal representation of the monotone spline (control points vs. tangent-derivative pairs)**
   - What we know: CONTEXT.md's discretion note names "fitting method, handle behaviour, and
     monotonicity enforcement" as open, and requires "every drag result must be
     slider-representable" (the outline editor's inverse-solve discipline).
   - What's unclear: Whether the stored `RockerSpec`/`FoilSpec` should carry only the 4/5 station
     values (with the spline re-derived on every read, à la `buildOutline`) or also cache
     Fritsch-Carlson tangents.
   - Recommendation: Store only the station values (matches `OutlineSpec`'s own pattern of storing
     parametric inputs, not derived Bezier data) and recompute tangents inside
     `sampleRocker`/`sampleFoil`, mirroring how `buildOutline` derives `BezierSegment`s fresh from
     `OutlineSpec` every call.

3. **Tip-thickness defaults for a finished (non-preset) new board**
   - What we know: D-05's note explicitly defers this ("Tip-thickness defaults for a finished
     board (presets will set their own)" is listed under Claude's Discretion).
   - What's unclear: What `DEFAULT_FOIL_SPEC.noseTip`/`tailTip` should be for a board started from
     scratch (not a preset) — the prototype's `tipThickness = 0.3` constant is one candidate but
     is explicitly called out as a "generic assumption" being replaced.
   - Recommendation: Use a physically sensible default in the 1/4"–3/8" range (thinner than the
     Arctic Foam blank's own tip values, since a *finished, glassed* board's foil tip is typically
     thinner than a rough blank's) and flag it for the founder to sanity-check in review, since it
     is not derivable from any cited source in this session.

## Environment Availability

Skipped — this phase has no new external dependencies (no new services, CLIs, or runtimes; all
work is TypeScript/React inside the existing Next.js + Vitest toolchain already verified working
in Phases 1-3).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.11 [VERIFIED: package.json] |
| Config file | `vitest.config.ts` [VERIFIED: file exists at repo root] |
| Quick run command | `npm test -- lib/geometry/rocker.test.ts` (per new file, once created) |
| Full suite command | `npm test` (runs `vitest run`, all `lib/**/*.test.ts`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ROCK-01 | Rocker curve sampling is monotone and matches typed/dragged station values | unit | `npm test -- lib/geometry/rocker.test.ts` | ❌ Wave 0 |
| ROCK-01 | Rocker drag inverse-solve is slider-representable (round-trip) | unit | `npm test -- lib/geometry/rocker-drag.test.ts` | ❌ Wave 0 |
| ROCK-01 | Rail-band thickness follows rocker/foil unless overridden (D-09/D-10) | unit | `npm test -- lib/geometry/design.test.ts` | ⚠️ file exists, needs new cases |
| FOIL-01 | Foil thickness sampling at arbitrary station | unit | `npm test -- lib/geometry/foil.test.ts` | ❌ Wave 0 |
| FOIL-01 | Simpson volume integration matches blank-datasheet fixture within tolerance (D-14) | unit | `npm test -- lib/geometry/volume.test.ts` | ⚠️ file exists, needs new Simpson-path cases + new fixture |
| Roadmap criterion 3 | Rocker/foil save and reload correctly, including pre-Phase-4 boards defaulting cleanly (D-15) | unit | `npm test -- lib/models/design-snapshot.test.ts` | ⚠️ file exists, needs version-bump + backfill cases |
| D-12 | All four presets carry tuned rocker/foil values, structurally valid | unit | `npm test -- lib/geometry/presets.test.ts` | ⚠️ file exists, needs new cases |

### Sampling Rate

- **Per task commit:** targeted `npm test -- <changed test file>`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `lib/geometry/rocker.test.ts` — covers ROCK-01 (new file)
- [ ] `lib/geometry/rocker-drag.test.ts` — covers ROCK-01 drag round-trip (new file)
- [ ] `lib/geometry/foil.test.ts` — covers FOIL-01 (new file)
- [ ] `lib/geometry/__fixtures__/blank-datasheet-golden.json` — hand-entered per D-14 (Arctic Foam
      7'3" SBF, 77.17 L stated), with provenance comments — the one sanctioned exception to
      "goldens come from the prototype" since this math has no prototype ancestor
- [ ] Existing `lib/geometry/volume.test.ts`, `design.test.ts`, `presets.test.ts`,
      `lib/models/design-snapshot.test.ts` all need new cases, not new files

## Security Domain

`security_enforcement: true`, ASVS level 1, block on `high` [VERIFIED: .planning/config.json].
This phase adds no new authentication, session, or access-control surface — it extends the
existing autosave/save path (`saveModel` Server Action, already behind Clerk's nudge-only
middleware per Phase 2's `lib/auth/open-access.test.ts`) with two new snapshot fields, and adds
no network calls, file uploads, or new user-facing auth flows.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Unchanged — Clerk `clerkMiddleware()`, no new auth surface |
| V3 Session Management | No | Unchanged |
| V4 Access Control | No | Unchanged — `saveModel` already scopes writes to the signed-in shaper's own rows (Phase 2) |
| V5 Input Validation | Yes | Extend `design-snapshot.ts`'s Zod schema with `rockerSpecSchema`/`foilSpecSchema` (`z.number()` per branded field, same pattern as every existing field) |
| V6 Cryptography | No | No crypto work in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed/out-of-range rocker or foil values submitted directly to `saveModel` (bypassing the UI sliders/clamps) | Tampering | Zod schema validates shape/type only (matches this codebase's existing posture — client clamps ranges, server validates structure, same as `outlineSpecSchema` today); worth a code-review note but not a new pattern to invent this phase |
| A pre-Phase-4 saved board missing rocker/foil fields entirely | — (data integrity, not a threat) | `design-snapshot.ts`'s existing `.partial()` + `DEFAULT_*` backfill already handles this; ensure the two new fields are added to that backfill chain (D-15) |

## Sources

### Primary (HIGH confidence — read directly this session)

- `.planning/phases/04-rocker-foil-editors/04-CONTEXT.md` — locked decisions D-01 through D-15,
  discretion areas, deferred ideas
- `.planning/design/GEOMETRY-MODULE.md` — approved core geometry design (rocker convention,
  Simpson volume, monotonicity rule)
- `lib/geometry/volume.ts`, `rail-bands.ts`, `outline.ts`, `outline-drag.ts`, `board.ts`,
  `design.ts`, `units.ts`, `presets.ts` — full read, this session
- `lib/models/design-snapshot.ts`, `components/design/design-store.tsx` — full read, this session
- `components/rails/rail-controls.tsx`, `components/volume/volume-controls.tsx`,
  `components/outline/outline-editor.tsx`, `components/site-nav.tsx`,
  `components/summary/order-form.tsx` (RockerTicks) — full/partial read, this session
- `reference/project/Rails.dc.html` (`buildSideProfile`, lines 782-894) — read this session
- `.planning/sketches/MANIFEST.md` — drafting grammar decisions

### Secondary (MEDIUM confidence — WebSearch, corroborated by multiple independent results)

- [Monotone cubic interpolation (Wikipedia)](https://en.wikipedia.org/wiki/Monotone_cubic_interpolation) — Fritsch-Carlson criteria for monotone-preserving cubic Hermite splines
- [PchipInterpolator — SciPy v1.18.0 Manual](https://docs.scipy.org/doc/scipy/reference/generated/scipy.interpolate.PchipInterpolator.html) — reference implementation approach for monotone piecewise cubic interpolation
- [Area Calculation using Simpsons One Third Rule for Volume](https://esurveying.net/earthwork-quantity/area-calculation-simpsons-1-3rd-rule) — even-panel-count requirement for the classic Simpson's 1/3 composite rule
- [Methods of Calculation of Areas in Surveying | Simpson's Rule – Civil Engineering Projects](https://www.civilprojectsonline.com/surveying-and-levelling/methods-of-calculation-of-areas-in-surveying-simpsons-rule/) — cross-section volume integration via Simpson's rule, corroborating GEOMETRY-MODULE.md's chosen method

### Tertiary (LOW confidence)

- None used for load-bearing claims; all numerical-method claims above were cross-checked against
  at least two independent search results.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependency, verified against `package.json` and this session's
  read of every relevant existing module
- Architecture: HIGH — every pattern cited was read in full this session from the actual
  codebase, not inferred from documentation
- Numerical methods (spline, Simpson): MEDIUM — the methods are well-established and
  cross-checked via WebSearch, but not yet implemented/tested in this repo; treat station-parity
  and tangent-formula details as implementation risk to retire during planning/execution, not as
  settled fact
- Pitfalls: HIGH — grounded in direct repo reads (grep for `validateBoard`, header-comment quotes
  from `volume.ts`, CONTEXT.md quotes with line numbers)

**Research date:** 2026-08-29
**Valid until:** No external expiry — this is an internal-architecture research doc with no
third-party API/library surface to go stale; re-verify only if CONTEXT.md or GEOMETRY-MODULE.md
changes before planning.
