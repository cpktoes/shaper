# Phase 4: Rocker & Foil Editors - Context

**Gathered:** 2026-08-29
**Status:** Ready for planning

<domain>
## Phase Boundary

The last two design surfaces become first-class, interactive editors: the **rocker** (the
board's bottom curve seen from the side — nose and tail lift measured up from a flat surface)
and the **foil** (thickness distribution along the length, which stacked on the rocker line
forms the deck curve). Rail-band numbers respond live through shared thickness, the litres
figure gets the accurate cross-section method the approved geometry design has always
earmarked for this phase, and both rocker and foil save and restore with a model (ROCK-01,
FOIL-01, roadmap success criteria 1–3). Bottom contours, blank picking/recommendation,
billing, and sharing stay out.

**Codebase reality check (2026-08-29):** unlike Phases 1–3, there is almost nothing to port.
The prototype never had rocker or foil editors — its Rails page drew a side profile from
hard-coded generic rocker numbers (`reference/project/Rails.dc.html` `buildSideProfile`,
labelled "generic shortboard assumptions"), and thickness was three typed values. These
editors are net-new design work. The math direction, however, is already approved:
`.planning/design/GEOMETRY-MODULE.md` (founder-approved 2026-08-18) fixes the rocker
convention (board bottom-up on a flat surface, tip lift off the flat) and prescribes the
~50-station Simpson cross-section volume that `lib/geometry/volume.ts` deviation 3 has been
waiting to receive. The save format was built for this moment: `lib/models/design-snapshot.ts`
fills fields that didn't exist when a board was saved from the matching `DEFAULT_*` constants.

</domain>

<decisions>
## Implementation Decisions

### Where the editors live
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

### The rocker/foil model — blank-datasheet language
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

### Thickness flows forward (rocker → rails)
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

### Presets
- **D-12:** All four board-type presets (Shortboard, Fish, Mid-length, Longboard) gain
  **full side-profile character** — tuned rocker + thickness values per type, using the same
  tune-in-the-live-editor, capture-back workflow Phase 1 used for outlines (a dev-only
  "copy current values" affordance is acceptable again). "A Fish starts looking like a fish"
  now applies from the side too.

### The litres number
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` — Phase 4 goal and the three success criteria (rocker live with
  rail band + 2D viz, foil live with volume, save/restore)
- `.planning/REQUIREMENTS.md` — ROCK-01 and FOIL-01 definitions
- `.planning/PROJECT.md` — constraints: geometry pure and tested under `lib/`, metric storage
  with inches/litres display, plain-English shaper audience, prescribed stack

### Geometry ground truth
- `.planning/design/GEOMETRY-MODULE.md` — the founder-approved design this phase finally
  implements: rocker convention (bottom-up on flat, tip lift), `RockerSpec`/`FoilSpec`
  shapes, ~50-station Simpson `computeVolume`, monotonic-spline validation rule
- `lib/geometry/volume.ts` (header comment) — deviation 3 (the Simpson upgrade arrives with
  the foil editor — this phase) and deviation 2 (the litre-constant divergence to revisit
  when it does)
- `lib/models/design-snapshot.ts` (header comment) — the snapshot-version rule this phase
  exercises: new top-level fields fill from `DEFAULT_*` constants for older saves

### Design language
- `.planning/sketches/MANIFEST.md` — the drafting callout grammar every viewer follows
  (dimension lines on rails, input chips vs computed dimension lines, nothing but faint
  lines inside the board silhouette), and sketch 006's rotate-in-place button pattern

### Prototype prior art (what exists — and what not to keep)
- `reference/project/Rails.dc.html` — `buildSideProfile` (~line 779): the side-profile
  drawing to supersede; its rocker numbers are hard-coded generic assumptions, its
  deck-over-bottom construction and plan-view alignment are useful prior art
- `reference/project/Volume.dc.html` — the estimator being kept as the standalone mode, and
  its real-geometry path's cross-section reasoning (~line 457)

### The blank-datasheet exemplar
- Arctic Foam 7'3" SBF datasheet — an image shared during discussion, not a repo file; its
  format is fully described in Specific Ideas below. If the user drops it into `reference/`,
  add the path here. Format: width / thickness / rocker quoted at nose tip, nose 12",
  center, tail 12", tail tip; stated blank volume 77.17 L; rocker referenced from the bottom.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/geometry/outline-drag.ts` — the inverse-solve pattern for direct manipulation (drag →
  spec fields, every result slider-representable, caps imported not restated); the rocker/foil
  construction-line dragging should follow it exactly
- `components/outline/outline-editor.tsx` toolbar — rotate-in-place button (D-03) and the
  construction-lines toggle pattern (D-08) both already live here to be mirrored
- `lib/geometry/units.ts` — `parseImperial` and `formatInchesFraction` for typed datasheet
  entry (D-06); the 25.4 rule applies as always
- `lib/geometry/rail-bands.ts` — `computeSection` produces the real deck/rail/tuck section
  shapes the prototype's real-geometry volume path already leaned on; candidate input to the
  Simpson cross-sections
- `lib/geometry/presets.ts` + Phase 1's capture-back workflow — extend each preset with
  rocker/foil values (D-12)
- `components/design/design-store.tsx` — gains rocker/foil state; the single-thickness rule
  (D-09) restructures where `boardThickness` lives so rails reads the shared value unless
  overridden (D-10)
- `lib/models/design-snapshot.ts` — bump `DESIGN_SNAPSHOT_VERSION`, add rocker/foil schemas;
  the tolerate-missing-fields machinery is already written and tested
- `components/summary/order-form.tsx` — `RockerTicks` placeholder and its reserved box are
  the D-04 landing site

### Established Patterns
- Geometry math pure under `lib/geometry/`, no React/browser imports, every export
  unit-tested — the rocker/foil spline, sampling, and Simpson volume all land there
- Golden fixtures come from the prototype (`npm run golden`) — **except** the new volume
  math, which has no prototype ancestor: its known-good values are blank-datasheet fixtures
  (D-14), hand-entered with provenance comments
- Metric internally (branded `Mm`/`Litres`), inches at the edge; blank datasheets quote both
  inches and cm — the UI shows inches per UNIT-01
- One screen per route under `app/design/*`; shared store in the root layout; autosave
  captures the whole design snapshot, so new fields ride it automatically
- "Import from earlier step vs. manual" toggles already exist on Volume and Fins — the Rails
  override (D-10) and the estimator's standalone mode (D-13) reuse that idiom

### Integration Points
- `components/site-nav.tsx` — `NAV_LINKS` gains ROCKER after TEMPLATE (D-02)
- New route `app/design/rocker/` + `components/rocker/` per-screen UI
- `components/rails/rail-controls.tsx` — thickness inputs rewire to the shared value + the
  override toggle (D-09/D-10)
- `components/volume/*` — the accurate path becomes the designed-board figure; the estimator
  stays behind the standalone mode (D-13); rack cards and Summary already read
  `volumeResult` from the store, so they inherit the accurate number
- CI (`.github/workflows/`) already runs all geometry suites on push — new suites join it

</code_context>

<specifics>
## Specific Ideas

- The Arctic Foam 7'3" SBF datasheet is the mental model for the whole screen: width,
  thickness, and rocker columns at five stations (example values — width 5 1/16" / 16 13/16" /
  23 1/2" / 17 1/2" / 9 3/4"; thickness 1 1/2" / 2 5/8" / 3 3/4" / 2 1/2" / 1 5/8"; rocker
  5 9/16" / 2 1/4" / 0 / 1 1/4" / 2 9/16"; blank volume 77.17 L). "These are the types of
  dimensions we can have users input to create real rocker profiles."
- "Always reference rocker from the bottom of the board and the thicknesses will define the
  deck profile" — the user's own formulation of the model.
- "Rocker precedes rails" — the forward flow, with fins-taking-tail-width-from-the-outline as
  the in-app precedent; and rails "needs an option to override … for those just using rails
  as a standalone calculator."
- The ROCKER screen should read as *your board's own blank datasheet* — and later become the
  landing spot for the blank picker (deferred).
- Same trust ethos as ever: every rocker number is checkable with a straightedge on a flat
  floor; the litres figure is checkable against a published blank.

</specifics>

<deferred>
## Deferred Ideas

- **Blank picker / blank-recommendation tool** — select a real blank (e.g. Arctic Foam
  7'3" SBF) and the app fills or suggests rocker/thickness values, or recommends a blank
  that fits the designed board. User's words: "later I think I'd like to be able to select a
  blank and have a blank recommend tool." The five-station datasheet model (D-05) is
  deliberately shaped so blank data can drop straight in. Future phase / backlog.

### Reviewed Todos (not folded)
- **Bottom contours** (`.planning/todos/pending/2026-08-23-build-in-bottom-contours-with-shading-and-selectable-shapes.md`)
  — its rocker dependency arrives this phase, but it is a new capability needing its own
  requirement ID and roadmap slot. **Design consideration for the planner:** contour depth is
  measured off the rocker line, so the rocker model/spline API should not assume the bottom
  is the final surface — leave room for a later contour to reference it. Not folded.
- **Presets for rails & fins** (`2026-08-21-presets-for-rails-and-fins.md`) — adjacent to
  D-12 but its scope (rail bands, fin setups) stays its own backlog item.
- **Copy-spec to clipboard** (`2026-08-21-copy-spec-to-clipboard.md`) — cross-screen polish;
  would cover the new ROCKER screen whenever it lands. Backlog.
- **Rails instructions page, Rails viewer extras, Units toggle/global settings, Photo
  uploads, Mobile layout polish, Fins imported-tail curve, Blending-curves paper-saver** —
  keyword matches only (same verdict as Phase 3's review); none are rocker/foil work. Backlog.

</deferred>

---

*Phase: 4-Rocker & Foil Editors*
*Context gathered: 2026-08-29*
