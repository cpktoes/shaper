---
phase: 04-rocker-foil-editors
verified: 2026-08-29T16:25:00Z
status: human_needed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Open /design/rocker and move the four rocker sliders and five thickness sliders one at a time"
    expected: "The drawn side profile (bottom curve = rocker, deck curve = rocker + thickness) redraws immediately on each move, with no reload or lag"
    why_human: "Live SVG redraw from slider input is a rendering/interaction behavior; unit tests only prove sampleRocker/sampleFoil are correct functions, not that the browser actually redraws on change"
  - test: "On /design/rocker, switch to the DATASHEET tab, type '2 5/8', 'banana', and \"6'2\" into different cells"
    expected: "'2 5/8' commits and reprints as 2 5/8\"; 'banana' shows a plain-English error line and reverts; 6'2 reads as 74\""
    why_human: "Focus/blur/Enter parse-commit-revert behavior is a DOM interaction not exercised by imperial-field.tsx's own (non-existent in this plan) component test — confirmed only by code inspection"
  - test: "Drag a construction point (rocker or deck) directly on the /design/rocker drawing, in both horizontal and rotated-vertical orientation"
    expected: "The curve follows the pointer; the matching sidebar slider and datasheet cell move to the identical value in real time"
    why_human: "Pointer-event-to-store wiring in rocker-viewer.tsx is proven correct by rocker-drag.ts's pure-function unit tests (23 cases) but the actual screen-transform/pointer-capture interaction was never run in a browser"
  - test: "Change centre thickness on /design/rocker, then open /design/rails"
    expected: "Rail band numbers reflect the new thickness immediately; changing only a rocker lift leaves every rail band number unchanged"
    why_human: "The store wiring (deriveEffectiveRails, effectiveRails memo) is unit-tested in isolation; cross-screen live propagation while navigating between routes needs a browser session"
  - test: "On /design/rails, confirm the 'Use Board's Rocker & Foil Thickness' checkbox is checked by default, dims the three thickness sliders, uncheck/move/re-check/uncheck again"
    expected: "Sliders enable when unlinked, show the shaper's own last manual value, and that manual value survives any number of link flips untouched"
    why_human: "The plan's own human-check step for this exact behavior was not exercised in the worktree session (no dev server); this is a stateful UI interaction, not a pure function"
  - test: "On /design/volume, change a thickness on /design/rocker and come back; toggle the Volume screen's import switches off/on"
    expected: "The headline litres figure moves with the foil while importing; toggling the switches off shows the quick estimator's figure instead, and the screen says which method is in force"
    why_human: "deriveQuotedVolumeLitres and the store memos are unit-tested; the cross-screen live number and the on-screen method-disclosure copy were never viewed in a browser"
  - test: "Compare the litres shown on /design/volume, the Summary order form, a saved board's home-screen rack card, and the printed template export preview for the same board"
    expected: "All four show the identical number and move together when a thickness changes"
    why_human: "grep confirms no consumer reads the old volumeResult.volumeLitres field directly, but visually confirming the four screens agree requires opening the running app"
  - test: "Start a new board from each of the four presets (Shortboard, Fish, Mid-length, Longboard) and open /design/rocker for each"
    expected: "Each preset reads as its own board type from the side: the Fish flatter and thicker, the Longboard with more nose lift, the Shortboard with the most rocker overall"
    why_human: "Bounds/ordering invariants are unit-tested, but whether the drawn curve actually reads as 'a fish' to a shaper is a visual/design judgment, not a mechanical check"
  - test: "Open /design/summary, print-preview both sheets with the shortest board at maximum nose lift and again with a 9-foot longboard, in Daylight and Slate themes"
    expected: "The rocker box shows the real curve and real lift values, the sheet still prints as exactly two pages, and nothing clips at the extremes"
    why_human: "Print-layout and theme-contrast fidelity at extreme input values is a rendering check that needs a browser/print-preview session, not something grep or a unit test can see"
---

# Phase 4: Rocker & Foil Editors Verification Report

**Phase Goal:** Users can shape a rocker curve and a foil profile as first-class, interactive parts
of the design, with rail band and volume recalculating live as they adjust either — completing the
"shaper features" milestone's editor work.
**Verified:** 2026-08-29
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (roadmap success criterion) | Status | Evidence |
|---|---|---|---|
| 1 | User can define a rocker curve and see the rail band and 2D visualization update live | ✓ VERIFIED (code) / needs browser confirmation for "live" claim | `lib/geometry/rocker.ts` (`RockerSpec`, `sampleRocker`, four station lifts), `components/rocker/rocker-controls.tsx` (4 rocker sliders), `components/rocker/rocker-viewer.tsx` draws from `sampleRocker`. Rail-band wiring: `deriveEffectiveRails` reads `foil.nose12/center/tail12` only (not rocker) — confirmed by design, and unit-tested in `design.test.ts` that a rocker-only change leaves rail bands untouched. See caveat below: rocker itself is structurally excluded from rail-band math (D-11) — this is correct per the design's own decision, not a gap. |
| 2 | User can define a foil (thickness distribution) and see the live volume figure update | ✓ VERIFIED (code) | `lib/geometry/foil.ts` (`FoilSpec`, `sampleFoil`, five stations), `components/design/design-store.tsx`'s `crossSectionVolume`/`quotedVolumeLitres` memos depend on `state.foil` and `effectiveRails`, both of which depend on `state.foil`. `deriveQuotedVolumeLitres` unit-tested to change with foil, not with rocker. |
| 3 | Rocker and foil inputs are saved and restored correctly on save/reopen | ✓ VERIFIED (code) | `DESIGN_SNAPSHOT_VERSION` bumped to 2; `rockerSpecSchema`/`foilSpecSchema` added to `designFieldsSchema`'s `.partial()`; `parseSnapshot` backfills `DEFAULT_ROCKER_SPEC`/`DEFAULT_FOIL_SPEC` on absence; `applyModel` restores `snapshot.rocker`/`snapshot.foil`; `designSnapshotFields` writes `state.rocker`/`state.foil` on every save. Round-trip, missing-key and version-1-shaped-snapshot cases all pass in `lib/models/design-snapshot.test.ts`. |

**Score:** 3/3 roadmap success criteria structurally verified in code. All three additionally carry a
"live" / "reopen" behavioral claim that only a running browser session can confirm end-to-end — see
Human Verification below. No SUMMARY across all 5 plans reports a dev server was ever started in
this worktree session, so the "live redraw" and "cross-screen agreement" claims are code-complete
but browser-unconfirmed for every plan in the phase, consistently.

### PLAN-Level Must-Haves (representative sample, cross-checked against code)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 4 | ROCKER tab exists between TEMPLATE and RAILS, routes to a working screen | ✓ VERIFIED | `components/site-nav.tsx` NAV_LINKS order: TEMPLATE, ROCKER, RAILS, VOLUME, FINS, SUMMARY. `app/design/rocker/page.tsx` renders `<RockerEditor />`. `npm run build` confirms `/design/rocker` compiles as a real route. |
| 5 | Curve is monotone by construction (no fold-back) | ✓ VERIFIED | `lib/geometry/monotone-spline.ts` implements Fritsch-Carlson; `rocker.test.ts`/`foil.test.ts` assert no-fold-back for default, extreme and all-zero specs. |
| 6 | Every station adjustable three ways (slider, drag, typed) and all three agree | ✓ VERIFIED | `rocker-controls.tsx` (9 sliders), `rocker-datasheet.tsx` (`ImperialField` per station), `rocker-drag.ts`'s `solveSideProfileDrag` proven slider-representable by 23 unit tests in `rocker-drag.test.ts`. |
| 7 | RAILS link — thickness has one source of truth, rocker cannot move rail bands | ✓ VERIFIED | `deriveEffectiveRails` takes no rocker argument (structural guarantee); `design.test.ts` asserts foil-only mapping and rocker-independence. Default-on link toggle in `rail-controls.tsx` with `disabled` gating verified via grep; preserves hand-typed value across flips per `applyPreset`/`toggleRailsImportFoilThickness` logic. |
| 8 | One litres figure everywhere the app quotes volume | ✓ VERIFIED | `grep -rn 'volumeResult\.volumeLitres' components/summary/ components/setup/ components/template/` returns nothing — every consumer reads `quotedVolumeLitres`. Blank-datasheet validation passes at 1.01% deviation (well within the 10% bar), confirmed by running `lib/geometry/volume.test.ts` directly. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `lib/geometry/monotone-spline.ts` | Fritsch-Carlson sampler | ✓ VERIFIED | Exports `sampleMonotoneSpline`, `monotoneSlopes`; no React/browser import; used by rocker.ts and foil.ts |
| `lib/geometry/rocker.ts` | RockerSpec + sampler | ✓ VERIFIED | Exports `RockerSpec`, `DEFAULT_ROCKER_SPEC`, `ROCKER_LIFT_RANGE_IN`, `rockerStationPoints`, `sampleRocker` |
| `lib/geometry/foil.ts` | FoilSpec + sampler | ✓ VERIFIED | Exports `FoilSpec`, `DEFAULT_FOIL_SPEC`, `FOIL_THICKNESS_RANGE_IN`, `foilStationPoints`, `sampleFoil`; defaults confirmed equal to `DEFAULT_RAIL_BAND_SPEC`/`DEFAULT_VOLUME_SPEC` by passing unit test |
| `components/rocker/rocker-viewer.tsx` | Side-profile SVG | ✓ VERIFIED | Calls `sampleRocker`/`sampleFoil`; no `dangerouslySetInnerHTML`; svg absolutely positioned (compact mode used by order-form) |
| `components/rocker/rocker-editor.tsx` | Screen shell | ✓ VERIFIED | Renders `RockerControls`, `RockerDatasheet`, toolbar (rotate/hide-outline/construction), dev-only capture button |
| `app/design/rocker/page.tsx` | Route | ✓ VERIFIED | Compiles in `npm run build`, renders `<RockerEditor />` |
| `lib/geometry/rocker-drag.ts` | Inverse drag solve | ✓ VERIFIED | Exports `sideProfileDragPoints`, `solveSideProfileDrag`, `SIDE_PROFILE_DRAG_LIMITS`; no React/browser import |
| `lib/geometry/design.ts` additions | `deriveEffectiveRails`, `deriveQuotedVolumeLitres` | ✓ VERIFIED | Both present, substantive (not stubs), unit-tested |
| `lib/geometry/volume.ts` additions | `computeCrossSectionVolume`, `simpsonIntegrate` | ✓ VERIFIED | `SIMPSON_PANEL_COUNT = 50` (even, asserted by test); Simpson integrator reproduces exact integrals of const/linear/quadratic/cubic; blank-datasheet validation passes |
| `lib/geometry/__fixtures__/blank-datasheet-golden.json` | Hand-entered validation fixture | ✓ VERIFIED | Exists, contains `provenance`, `statedVolumeLitres: 77.17`, five-element arrays |
| `lib/geometry/presets.ts` | All 4 presets carry rocker/foil | ✓ VERIFIED | `grep -c 'rocker: {'` and `grep -c 'foil: {'` both report 4; `applyPreset` wires `preset.rocker`/`preset.foil` onto the store (a Rule 2 deviation caught and fixed within plan 04-05, confirmed present in current code) |
| `components/summary/order-form.tsx` rocker box | Real curve, not placeholder | ✓ VERIFIED | `RockerViewer` + `formatInchesFraction` present; `grep -n 'High.*Medium.*Low'` returns nothing |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `rocker-viewer.tsx` | `rocker.ts`/`foil.ts` | `sampleRocker`/`sampleFoil` | ✓ WIRED | Both imported and called at every drawn station |
| `design-store.tsx` | `design-snapshot.ts` | `designSnapshotFields` carries `rocker`/`foil` | ✓ WIRED | Confirmed in `designSnapshotFields` memo (line 551-576) |
| `design-snapshot.ts` | `rocker.ts`/`foil.ts` | `parseSnapshot` backfills `DEFAULT_ROCKER_SPEC`/`DEFAULT_FOIL_SPEC` | ✓ WIRED | Confirmed at parseSnapshot's return object |
| `design-store.tsx` | `design.ts` | `effectiveRails` memo → `deriveEffectiveRails` → feeds `railBands` | ✓ WIRED | `railBands = useMemo(() => computeRailBands(effectiveRails), [effectiveRails])` |
| `design-store.tsx` | `design.ts` | `quotedVolumeLitres` memo → `deriveQuotedVolumeLitres` | ✓ WIRED | Confirmed at lines 493-495 |
| `rail-controls.tsx` | `design-store.tsx` | link checkbox → `toggleRailsImportFoilThickness` | ✓ WIRED | Confirmed via grep in code review and source |
| `order-form.tsx`/`board-rack-card.tsx`/`export-preview-dialog.tsx` | `design-store.tsx` | `quotedVolumeLitres` | ✓ WIRED | Grep gate confirms no remaining reference to the old estimator-only field |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|---|---|---|---|---|
| ROCK-01 | 04-01, 04-02, 04-03, 04-05 | User can define a rocker curve (nose/tail profile) | ✓ SATISFIED | Rocker module, sliders, drag, datasheet, presets all implemented and tested |
| FOIL-01 | 04-01, 04-02, 04-03, 04-04, 04-05 | User can define a foil (thickness distribution) | ✓ SATISFIED | Foil module, sliders, drag, datasheet, rails link, volume integration, presets all implemented and tested |

No orphaned requirements: both IDs REQUIREMENTS.md maps to Phase 4 appear in plan frontmatter across
this phase's 5 plans.

### Anti-Patterns Found

None. Scanned all 22 files this phase created or modified for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER`
and "not yet implemented"/"coming soon" style strings — zero matches. No stub `return null`/`return
{}`/`return []` patterns outside legitimate guard clauses (empty-array-guard in the spline sampler,
early-return-null in a private helper, pointer-transform guard in the viewer).

### Code Review Findings (04-REVIEW.md, already on record)

Two WARNING-level findings exist from the phase's own code review and remain unfixed at time of this
verification — neither blocks a roadmap success criterion:

- **WR-01**: RAILS screen's disabled thickness sliders (`NT_THICKNESS_BOUNDS`/`CENTER_THICKNESS_BOUNDS`
  in `rail-controls.tsx`) have narrower min/max than `FOIL_THICKNESS_RANGE_IN`. When the link is on and
  a shaper dials a foil value outside the RAILS slider's own hardcoded range (e.g. a thin fish tail),
  the disabled slider's thumb renders pinned/clipped at the wrong end while its label still shows the
  correct number. Confirmed still present in current code (`min: 1, max: 2.5` for nose/tail,
  `min: 1.75, max: 3.5` for center). This is a **display inconsistency only** — `computeRailBands`
  reads the real value, not the slider's range, so no wrong number is ever computed or shown as text.
- **WR-02**: `applyPreset` doesn't reset the autosave failure-backoff counter that `applyModel` does —
  a minor UX-only inconsistency (a new board could wait up to 30s longer than necessary for its first
  autosave after several prior failures), self-correcting after one save cycle.

Neither finding contradicts any of the phase's 3 roadmap success criteria or blocks a must-have; both
are pre-existing, disclosed findings from the phase's own review, appropriately scoped as warnings
rather than blockers.

### Automated Verification

- `npm test` (full suite): **1135 passed, 1135 total, 23 test files** — matches every SUMMARY's
  claimed count.
- `npm run build`: succeeds from the main checkout; `/design/rocker` compiles as a real static route
  alongside the other five design screens.
- `npm test -- lib/models/design-snapshot.test.ts lib/geometry/design.test.ts lib/geometry/volume.test.ts lib/geometry/rocker.test.ts lib/geometry/foil.test.ts lib/geometry/rocker-drag.test.ts lib/geometry/presets.test.ts`: 371/371 passed, confirming every phase-specific geometry suite independently.
- `grep -rln 'RockerViewer' components/ app/`: exactly the three intended call sites (`rocker-editor.tsx`, `rocker-viewer.tsx`, `order-form.tsx`) — D-04's "no other screen gains a side profile" holds.
- `grep -rn 'volumeResult\.volumeLitres' components/summary/ components/setup/ components/template/`: empty — D-13's "one figure everywhere" gate holds.

### Human Verification Required

Every plan's own SUMMARY.md flags the same limitation: no dev server was started in the executing
worktree session, so every "live redraw," "drag-to-match-slider," "cross-screen litres agreement,"
and "preset reads as its own board type" claim is code-complete and unit-test-backed but has never
been observed in a running browser. Nine items are listed in this report's frontmatter
`human_verification` block, consolidated from the `<human-check>` steps documented across all 5
plans (04-01 through 04-05) plus each SUMMARY's own `human_judgment: true` coverage entries. These
cover: live slider redraw, typed-entry parse/error/revert, drag-to-slider agreement, the rocker→rails
thickness link, the rails override toggle round-trip, live volume propagation, cross-screen litres
agreement, preset visual differentiation, and Summary print-fidelity at extremes.

### Gaps Summary

No gaps found. Every roadmap success criterion and every PLAN-level must-have sampled resolves to
structurally VERIFIED in the codebase: the code exists, is substantive (not a stub), is wired through
real data-flow paths (not hardcoded/static), and is backed by passing automated tests including the
full 1135-test suite and a successful production build. The two code-review WARNINGs are disclosed,
non-blocking, and don't touch any must-have. The phase is held at `human_needed` rather than `passed`
purely because the "live" and "cross-screen agreement" behavioral claims that are central to the
phase goal's wording ("recalculating live") have not yet been confirmed by anyone actually operating
the running app — every plan's own SUMMARY says as much. This is a browser UAT pass, not a code gap.

---

_Verified: 2026-08-29_
_Verifier: Claude (gsd-verifier)_
