# Phase 3: Volume, Templates & Verified Math - Context

**Gathered:** 2026-08-28
**Status:** Ready for planning

<domain>
## Phase Boundary

The "math is right" milestone: board volume (litres) recalculates live as the shaper adjusts the design (VOL-01), the shaper can download a full-size 1:1 printable template of the outline tiled across standard pages for taping together (TMPL-01), and the core geometry math in `lib/geometry/` is proven correct by Vitest suites that run in CI against known-good values. Rocker and foil editors are Phase 4; billing, sharing, CNC export stay out of scope.

**Codebase reality check (2026-08-28):** much of this phase's ground is already laid. `lib/geometry/volume.ts` is ported and tested (manual-factor path plus a real-geometry path using the drawn outline area and rail cross-sections), the Volume screen reads it live from the shared design store, and all 8 geometry suites pass locally against golden fixtures extracted from the prototype. What is genuinely missing: **CI does not exist** (no `.github/workflows/`), and **the 1:1 tiled template PDF is entirely new** — today's only print path (Summary order form) shrinks-to-fit one page, the opposite of a template.

</domain>

<decisions>
## Implementation Decisions

### Template delivery (how it reaches paper)
- **D-01:** The template is a **downloaded multi-page PDF** with true 1:1 physical size baked into the file — not a browser-print path. Prints identically on any home printer or at a print shop. Adds one small PDF-generation library (library choice is Claude's discretion).
- **D-02:** The shaper **picks Letter or A4** at export time, defaulting to Letter; the page count adjusts to the pick.
- **D-03:** The export button lives on **both** the Template screen and the Summary screen.
- **D-04:** Export is **preview-first**: a dialog shows how the board splits across pages (tile grid + page count, e.g. "8 pages — tape nose to tail") with the Letter/A4 pick, then Download.

### What's on the template
- **D-05:** It is a **half (spin) template** — one side of the outline curve with the stringer as the straight edge. Trace, flip, trace; symmetry comes free and paper is halved. — **Reversibility:** reversible — a full-outline layout could be added later without disturbing the half-template path.
- **D-06:** Working marks are **only**: the nose 12" mark, the tail 12" mark, the center mark, and the widepoint mark — "the marks a shaper needs" (user's words). **No** every-12" station ladder. These are the same stations the rail-band and volume calculators use.
- **D-07:** A **2"×2" scale-check square** prints on the first page (the nose page) so the shaper can verify 100% scale before taping anything.
- **D-08:** The **board name and core dims print inside the kept template area** — positioned so they survive the cut, never in a margin that gets trimmed off.
- **D-09:** Pages join by **overlap (~½") with match marks**, plus page labels ("3 of 8 — nose to tail"). Page order runs **nose to tail**; exact overlap size is Claude's discretion.
- **D-10:** A **small plain-English how-to box** sits on the nose page next to the scale square: print at 100% (no fit-to-page), measure the square, tape nose to tail.

### Claude's Discretion
- **Live volume (area not selected for discussion — sensible defaults):** the store already recomputes litres live from the drawn geometry. Verify that pipeline end-to-end and cover it with tests; whether litres get surfaced anywhere beyond the Volume screen (e.g. a nav readout) is a planning call, not a new capability mandate. The volume *method* is settled: the prototype's three-station approach stays until the Phase 4 foil editor brings the Simpson upgrade (recorded in `lib/geometry/volume.ts` header, deviation 3).
- **Verified math / CI (area not selected — sensible defaults):** GitHub Actions running the Vitest geometry suites on every push/PR (lint and build steps at planner's judgment). The prototype-extracted golden fixtures **are** the definition of known-good values. Playwright: CLAUDE.md earmarks its installation for Phase 3, but the roadmap's success criteria demand only Vitest-in-CI — install Playwright only if phase acceptance genuinely needs an e2e (e.g. exercising the PDF export), otherwise defer.
- PDF library choice, tile orientation per board size (portrait vs landscape pages), overlap size, file name, and all preview-dialog styling/wording (plain English, shaper audience).
- Print styling may borrow the sketch manifest's drafting grammar where it helps legibility; note the manifest's "no text inside the outline" rule is a *screen* rule — D-08 deliberately places name + dims inside the kept area on paper.

### Folded Todos
- **Verify and refit the Summary print sheet after the callout-system rebuild** (`.planning/todos/pending/2026-08-22-summary-print-after-callout-system.md`, frontmatter already says `resolves_phase: 3`) — the callout rebuild changed the outline viewBox/aspect the print sheet depends on and the print path was never exercised; this phase is the print phase, so it gets verified and refitted here.
- **Template screen: construction-lines toggle button + sidebar-minimize wide view** (`.planning/todos/pending/2026-08-27-template-construction-toggle-and-wide-view.md`) — requested by the user for "after Phase 2 ships", which is now; lands alongside the other Template-screen toolbar work this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` — Phase 3 goal and the three success criteria (live volume, Vitest-in-CI vs known-good values, tiled 1:1 template)
- `.planning/REQUIREMENTS.md` — VOL-01 and TMPL-01 definitions
- `.planning/PROJECT.md` — constraints: geometry pure and tested under `lib/`, metric storage with inches/litres display, plain-English audience, prescribed stack

### Design language & geometry ground truth
- `.planning/sketches/MANIFEST.md` — the drafting callout grammar (sketches 001–006), the decisions it locks, and its open print question (inputs losing their sidebar in print)
- `.planning/design/GEOMETRY-MODULE.md` — prescribes the Simpson foil integration that deliberately does NOT arrive until Phase 4; explains why volume.ts keeps the prototype method
- `lib/geometry/volume.ts` (header comment) — the recorded deviations: prototype's three-station method, the `CUBIC_INCHES_PER_LITRE` truncated-constant divergence, presentation split

### Folded todo files (full problem statements)
- `.planning/todos/pending/2026-08-22-summary-print-after-callout-system.md`
- `.planning/todos/pending/2026-08-27-template-construction-toggle-and-wide-view.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/geometry/outline.ts` + `lib/geometry/volume.ts` — the outline curve and volume math the template and live-volume work draw from; both already golden-tested. The 1:1 template path IS the outline geometry at physical scale (mm domain — no new math to invent, "just" faithful layout).
- `components/outline/outline-viewer.tsx` — outline rendering including the already-shipped orientation switch (sketch 006's rotate-in-place button in `outline-editor.tsx`); the horizontal-view todo is stale because of this.
- `components/summary/use-print-fit.ts` + `app/design/summary/order-form.css` — the existing shrink-to-fit print path. Its Letter/A4 page-box reasoning and `@page` margin discipline are prior art, but tiled 1:1 output is a **different** path — do not force the template through it. The folded refit todo touches exactly these files.
- `lib/geometry/units.ts` — `formatFeetInches` / `formatInchesFraction` for the D-08 name + dims block; the 25.4 rule applies (design-value conversions only through units.ts).
- `components/design/design-store.tsx` — board name, dims, outline geometry, and `volumeResult` all live here; the export reads the same store the screens do.
- All 8 Vitest suites + `lib/geometry/__fixtures__/*-golden.json` + `scripts/extract-prototype-*-golden.mjs` (`npm run golden`) — the known-good verification machinery CI will run.

### Established Patterns
- Geometry math pure under `lib/geometry/`, no React/browser imports, every export unit-tested against golden fixtures — the **page-tiling math (tile grid, overlap layout, mark positions) should follow the same pattern**: pure, testable functions, with the PDF library only consuming their output.
- Metric internally (branded `Mm`/`Litres`), inches/litres at the UI edge via units.ts. The PDF is a display surface: physical page placement converts at the boundary like any other display.
- Plain-English UI copy for a shaper audience (preview dialog, how-to box).
- One screen per route under `app/design/*`; shared store in the root layout.

### Integration Points
- Template screen toolbar (`components/outline/outline-editor.tsx`) — already hosts the rotate button; gains the construction-lines toggle, wide-view button, and template-export button (D-03).
- Summary screen (`components/summary/`) — gains the second export button (D-03); its print sheet gets the folded refit.
- `.github/workflows/` — does not exist; CI is net-new. `npm test` (all suites), plus lint/build at planner's judgment.
- `npm run build` gotcha: must run from the main checkout — Turbopack won't resolve next in a worktree (CLAUDE.md).

</code_context>

<specifics>
## Specific Ideas

- "The marks a shaper needs" — nose 12", tail 12", center, widepoint. Nothing more on the curve.
- The 2"×2" square exists so the shaper can put a tape measure on the print *before* trusting it — same trust ethos as the calculators.
- Board name + core dims must live on the template itself and survive the cut — the template is a workshop object that outlives the print session, not a document with a header.
- A wrong print scale fails silently and expensively (a 6'2" template at 97% is ~2" short, discovered after taping 8 pages) — the preview, the square, and the how-to box all exist to prevent that one failure.

</specifics>

<deferred>
## Deferred Ideas

None new — discussion stayed within phase scope.

### Reviewed Todos (not folded)
- **Horizontal board view option** (`2026-08-23-horizontal-board-view-option.md`) — **stale, already implemented**: the rotate-in-place button per sketch 006 ships in `components/outline/outline-editor.tsx`. Archive to `completed/` rather than defer.
- **Fins imported tail uses the generic polynomial curve** (`2026-08-21-fins-imported-template-width-branch.md`) — user already scoped the fallback as intended behaviour; remaining work is cosmetic curve appearance, not math correctness. Not a "math is right" item.
- **Copy-spec-to-clipboard**, **Rails instructions page**, **Rails viewer extras**, **Units toggle / global settings**, **Photo uploads with ratings**, **Mobile layout polish**, **Presets for rails and fins**, **Bottom contours** — keyword matches only; none are volume, template, or test work. Stay in the backlog.

</deferred>

---

*Phase: 3-Volume, Templates & Verified Math*
*Context gathered: 2026-08-28*
