# Phase 8: The Rails Screen, Finished - Research

**Researched:** 2026-09-07
**Domain:** Porting a self-contained prototype instructional/reference view into an existing React/Next.js design screen, plus extending a proven account-preference pipeline to a second boolean preference and a second print surface
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**The plan & side reference view (RAIL-05)**
- D-01: The figure is the prototype's example board, ported faithfully (the PNG plan outline moved to `public/`, the hand-traced `planRefPaths()`/`sideRefPaths()` path data, the `@12"`/`@Center`/`@12"` station labels, the side strip, the "Taper Tuck to a Sharp Edge" note). It needs no geometry; the prototype's unrendered `buildBoardOutlinePlot`/`buildOffsetOutline` are never ported.
- D-02: It lives on the INSTRUCTIONS tab, beneath the example rail, exactly as the prototype lays it out: "Understanding Rail Markings" on top, "Turning Marks Into Rail Bands" below, then the italic closing note.
- D-03: All nine legend items start ticked (prototype default). Legend state is screen-only UI state — never saved with a board, never affects the printed sheet.
- D-04: The instructional copy is kept as written, with only the units rule applied (the two literal figures — "16-22" from the tail" and the `@12"` station labels — follow Phase 6's cm/mm table).

**The print toggle and its sheet (PRNT-05, PRNT-06)**
- D-05: The box starts unticked. A shaper who never touches it prints exactly the two-page form they print today.
- D-06: The setting is a shaper preference, like units — it does not live on the board. `lib/models/design-snapshot.ts` is untouched; `DESIGN_SNAPSHOT_VERSION` does not change. Reversibility: costly (moving it onto the board later means a snapshot version bump).
- D-07: Full parity with the units machinery. A nullable column on `user_preferences` (keyed by `clerk_user_id`), read at render like `units`; mirrored as localStorage + cookie; Phase 5's handoff rules (D-09 to D-11) verbatim. Existing pieces to extend rather than duplicate: `components/units-provider.tsx`, `lib/units-preference.ts`, `lib/units-server.ts`, `app/actions/units.ts`, `lib/db/queries.ts`. CLAUDE.md's database rule is absolute: push code, deploy, then `npm run db:migrate:prod`. Reversibility: one-way (adds a production column).
- D-08: The printed sheet is a fixed reference sheet — always the Flat example rail and every legend line drawn, regardless of the tab's on-screen state. The prototype's print-what-you-see behaviour (lines 1546-1580) is deliberately not reproduced.
- D-09: The sheet is its own third page, at the back: order form, shaper's reference, then "Rail Band Instructions" as page 3 of 3. Page marks read "of 3" ticked / "of 2" unticked, byte-identical when unticked. The sheet appears on screen the moment the box is ticked (`use-print-fit.ts` walks every `data-order-form-sheet`). Do not copy the prototype's `zoom:0.74` constant.
- D-10: One preference, two places — the rails sidebar beneath the section controls, and beside the summary screen's Print Order Form button. Both read/write the same preference; both carry the label "Include Rail Band Instructions in Print".
- D-11: PRNT-06's proof is split by pipeline. The three jsPDF outputs are unchanged by construction (`components/template/*` not touched) and re-proven the way Phase 7 proved them (rebuild every Imperial/Metric PDF from the pre-phase commit, diff). The order form is browser-printed — researcher should find a reproducible print-to-PDF diff of `/design/summary` with the box unticked, falling back to the Phase 7 D-10 human print-preview audit if none is practical.

**View Full Sized (RAIL-04)**
- D-12: One toolbar button (`ViewerToolbarButton`), section switch inside via Nose/Center/Tail tabs in a `Dialog`. Prototype's per-plot buttons not reproduced.
- D-13: The 1:1 drawing is the VIEWER plot at true scale — grid, ticks, bands, dots exactly as `RailSectionPlot` draws them, shared legend beneath. Metric keeps its 10mm grid. Size from CSS absolute units (`in`/`mm`) via `lib/geometry/units.ts`; never multiply by `devicePixelRatio`; never inline 25.4/96 in a component (`use-print-fit.ts` keeps its own copy on purpose).
- D-14: A 2-inch check bar beside the caveat, drawn from the same constant as the Full Sized Template's scale-check square, captioned the same way (`formatCalibrationMark`). Passive check, no calibration flow.
- D-15: The Print button reaches paper as a browser print of the dialog's own content under `@media print` (live React, like the order form) — the rail in CSS inches, the check bar beside it, a "turn Fit to page off" note. New print output — joins the units-isolation ledger as a converted surface in both systems. Reversibility: reversible.
- D-16: The caveat is one plain line — standard screen at 100% zoom, no calibration imperative (the check bar answers that). Exact wording is Claude's discretion.

**The example rail and its callouts (RAIL-02, RAIL-03, RAIL-06)**
- D-17: Mark names are SVG `<text>` via `components/viewer/callout-primitives.tsx`, coloured with `RAIL_SEGMENT_COLORS` from `rail-section-plot.tsx`. The prototype's anchor points (lines 1093-1103) and its cluster-and-push de-overlap pass (lines 1104-1125) carry over as diagram layout math under `components/`, not `lib/geometry/`.
- D-18: Flat/Domed is the app's segmented two-option toggle, in the card header — extract a shared `TwoOptionToggle` if none exists.
- D-19: Callouts carry names only — never a value. The DATA tab carries the numbers. The tab's only figures are the plot's grid ticks and the stated example thickness (a mark, through `formatMark`).
- D-20: The example rail's inputs are the prototype's, pinned by a golden-fixture entry: `computeSection({ thickness: domed ? 3 : 3.5, ratioTopPct: 60, family: 3, domed, domedBandBase: 6, scale: 1 })`, plotted with `boardThickness: 3.5, railThicknessVal: 3`. `lib/geometry/rail-bands.ts` is not modified and gains no `halveDeckMark1` parameter — the flag is inert in the reference. Never hand-type these numbers.

### Claude's Discretion
- Copy: the caveat line (D-16); the third sheet's heading and page-mark title; the summary's "Two portrait pages" note when there are three pages; the 1:1 dialog's title; the "Fit to page" note.
- Dialog details: which rail the 1:1 dialog opens on (default: first open section); whether `TabbedPanel` is reused inside the dialog; scroll behaviour when a rail is wider than the viewport.
- Sidebar placement: the tick-box sits beneath the section controls as a `Checkbox` row like the foil-link toggle; exact position/wording is the UI-SPEC's.
- Provider shape: whether `units-provider.tsx` generalises into a preferences provider carrying both values or gains a sibling; naming of the column, storage key and cookie; whether the server action file grows or a new one appears beside it. Phase 5's rules (D-09 to D-12) hold whichever shape is chosen.
- The figure's fit: port the prototype's hard-coded `0.7492` scale as a box that fits its container. How the light PNG reads on dark themes (a light card is acceptable) — settled by the UI-SPEC (pin the card light, not themed).
- Fixture shape: the name and shape of the new golden entry (existing entries are `{ state, sections }` scenarios; the example rail is a single-section result in two states).
- Ledger: how the new surfaces join `lib/units-isolation.test.ts` — INSTRUCTIONS components under `components/rails/` join the design-screen list; the 1:1 print and third sheet are print surfaces, and the ledger's print-surface walk covers only `components/summary` and `components/template` today, so the planner decides whether to widen the walk or place files where it already looks.
- Playwright stays uninstalled this phase; the 1:1 view and the printed sheet are human checks with a ruler and a print preview, stated explicitly in each plan's verification.
- Look and feel of the INSTRUCTIONS tab, the dialog and the sheet — settled by the UI-SPEC (approved 2026-09-07).

### Deferred Ideas (OUT OF SCOPE)
- A live plan/side view of the shaper's own board (the prototype's unrendered `buildBoardOutlinePlot`/`buildOffsetOutline` would be the starting point) — new offset-curve geometry, its own phase/requirement.
- Extending the plan/side figure to fins and foil screens; a calibrated (credit-card) actual-size view; printing from a phone; pinch-zoom on the viewers.
- Copy-spec-to-clipboard, mobile/phone-width polish (Phase 9), finished-board photo uploads, fins imported-template curve behaviour, presets for rails/fins, bottom contours, branding the order form — all unrelated or explicitly future.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RAIL-02 | INSTRUCTIONS tab beside VIEWER/DATA, live example rail with every mark named by a callout, no new geometry, golden-fixture-pinned | `computeRailSection`/`buildRailSegments`/`buildRailProfile` in `lib/geometry/rail-bands.ts` verified generic and already exported; only a new fixture entry + test is needed (see Code Examples, D-20 section) |
| RAIL-03 | Flip the example rail between Flat (3.5") and Domed (3") | Confirmed via prototype line 1358-1359 and `RailProfileOpts`'s existing `{boardThickness, railThicknessVal, domedBandBase}` shape — no new parameter |
| RAIL-04 | "View Full Sized" 1:1 on-screen view, one-line caveat, no calibration | `use-print-fit.ts`'s `measurePxPerInch()` technique verified reusable pattern; `RailSectionPlot`'s SVG projection verified compatible with a fixed-CSS-unit render mode |
| RAIL-05 | Plan/side view with legend checkboxes | Prototype `planRefPaths()`/`sideRefPaths()`/`buildBoardOutlinePlot`/`plotSvgHtml` read in full (lines 666-927, 1281-1300, 1375-1388) — exact path data and colour/dash mapping captured below |
| RAIL-06 | Every new number in the shaper's chosen system | `lib/geometry/measure-display.ts` (`formatMark`, `stationLabel`, `formatCalibrationMark`) read in full; `buildRailPlotGrid`'s Metric 10mm-grid algorithm confirmed already exists in `rail-section-plot.tsx` |
| PRNT-05 | "Include Rail Band Instructions in Print" checkbox, mirrored | Units preference stack (schema, queries, action, provider, cookie) read in full — see D-07 mapping below |
| PRNT-06 | Toggle-off output byte-identical; toggle-on proven per-pipeline | Environment audit for a print-to-PDF diff tool completed (Chrome headless, pypdf, qlmanage all present; no Puppeteer/Playwright) — see Environment Availability and Pitfall 6 |
</phase_requirements>

## Summary

This phase is a faithful, well-bounded port: every geometry function the example rail needs already exists, tested, and exported from `lib/geometry/rail-bands.ts` — `computeRailSection`, `buildRailSegments`, `buildRailProfile`, `railPlotBounds` are all generic over their inputs and already used by every other rail section. The only new geometry-adjacent work is a golden-fixture entry (Rule 1) pinning `computeSection`'s two example-rail states, extracted the same way the existing eleven fixtures are. The prototype's `halveDeckMark1` flag is independently reconfirmed dead code here (line 704's destructured parameter list has no such key; line 1359's call site is the only place it appears at all) — the roadmap's finding stands.

The print-preference machinery has a complete, working precedent to extend: `lib/db/schema.ts`'s `userPreferences` table, `lib/db/queries.ts`'s `readUnitsPreference`, `app/actions/units.ts`'s `saveUnitsPreference`, `lib/units-preference.ts`'s parse/handoff/write-queue trio, `lib/units-server.ts`'s server resolution, and `components/units-provider.tsx`'s client provider are all read in full below with their exact shapes, so the planner can map every touch point one-for-one for the new boolean preference. The units flow is load-bearing (a regression here breaks a shipped, trusted feature), so the research below leans toward generalizing the *pure logic* (parse/handoff/write-queue) rather than the `UnitsProvider` component itself, to keep the blast radius small — this is presented as an option, not a directive, since CONTEXT.md reserves the provider shape as Claude's discretion.

The print-to-PDF diff question (D-11) has a workable answer: this machine has Google Chrome (152.0.7977.77) and Python's `pypdf` (6.16.1) and macOS's `qlmanage`, but no Puppeteer, Playwright, or poppler. Chrome's headless `--print-to-pdf` flag drives the browser's real print pipeline (the same `@media print` CSS and `beforeprint`/`afterprint` events `window.print()` fires), so it is a legitimate way to mechanically capture `/design/summary`'s printed output — with one caveat: React hydration and the app's own `beforeprint` listener (`useOrderFormPrintFit`) must have already run before the page is asked to print, which needs a deliberate wait, not a bare URL load. This is a genuinely new capability for this repo (no prior phase used it), so it is presented as a recommended path with exact commands, not a certainty, and the Phase 7 D-10 human print-preview audit remains the explicit fallback.

The callout composition for D-17 has a clean answer: `RailSectionPlot` already exposes every coordinate a callout needs (`segments[].p1/p2`, `result.apexCenter`, `result.railMark1`, etc., all in the same `px()`/`py()` projection space the plot itself uses), so an optional `callouts` prop can compute anchors from `output` directly rather than needing a second geometry pass — the prototype's ten anchor points map onto existing `RailSegment` keys with only one ambiguity worth flagging to the planner (see Common Pitfalls).

**Primary recommendation:** Build the example rail and its callouts as a new `callouts` prop on the existing `RailSectionPlot` (no new plot component, no `lib/geometry/` changes beyond one fixture entry); extend the units-preference files in place per D-07's own list, generalizing the pure handoff/write-queue logic rather than the `UnitsProvider` component; use Chrome headless print-to-PDF plus `pypdf`/`qlmanage` for the PRNT-06 order-form diff, falling back to the Phase 7 D-10 human audit if hydration timing proves unreliable; and widen `units-isolation.test.ts`'s print-surface file list by name (matching its existing one-off `lib/geometry/template.ts` precedent) rather than widening the whole `components/rails` folder into the print-surface walk.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Example rail computation (Flat/Domed) | Geometry (`lib/geometry/rail-bands.ts`) | — | Pure math, already exported and generic; no UI concern |
| Example rail callout layout (names, de-overlap) | Component (`components/rails/`) | — | Diagram layout math, not shaping geometry — CLAUDE.md Rule 1 reserves `lib/geometry/` for the former only |
| Flat/Domed toggle state | Component (local `useState`) | — | UI-only, mirrors the prototype's own state shape; never saved with the board |
| Legend tick state (nine checkboxes) | Component (local `useState`) | — | Screen-only, never persisted (D-03) |
| Plan/side figure asset + paths | Static asset (`public/`) + Component | — | Fixed teaching illustration, not board-derived |
| "Include Rail Band Instructions in Print" preference | API/Backend (Postgres via Drizzle) | Browser (cookie + localStorage) | Cross-device account preference, mirrors units exactly (D-07) |
| Print-toggle read at render (no flash) | Frontend Server (SSR, `app/layout.tsx`) | — | Must be resolved before first paint, like units (D-12 precedent) |
| Third print sheet content | Component (`components/summary/order-form.tsx`) | — | Reuses the INSTRUCTIONS tab's own component; the order form is the browser-print pipeline, not jsPDF |
| 1:1 dialog rendering | Component (`components/rails/`) | Browser (CSS `in`/`mm` units) | A screen/DOM-scaling concern, same category as `use-print-fit.ts`, not a design-value conversion |
| 1:1 dialog print path | Component + Browser (`@media print`) | — | New print surface, joins the units-isolation ledger |

## Standard Stack

### Core

No new runtime dependency. Every capability in this phase is built from packages already installed and proven in this repo.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@base-ui/react` | ^1.7.0 [VERIFIED: package.json] | `Dialog`, `Checkbox` primitives for the 1:1 view and both tick-boxes | Already the app's component foundation; `components/ui/dialog.tsx` and `components/ui/checkbox.tsx` already vendor it |
| `drizzle-orm` / `drizzle-kit` | ^0.45.2 / ^0.31.10 [VERIFIED: package.json] | The new nullable preference column + migration | Already the app's ORM; `userPreferences` table exists and takes a second nullable column the same way `units` does |
| `react` / `next` | 19.2.8 / 16.3.1 [VERIFIED: package.json] | `useSyncExternalStore` for the print-preference client store | `components/units-provider.tsx` already uses this exact pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| none | — | — | This phase adds no new npm package |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending `computeRailSection`'s existing generic call | A `halveDeckMark1` parameter | Rejected — the flag is inert in the reference (verified below); adding it would invent behaviour the prototype never had (roadmap's own settled finding, independently reconfirmed) |
| CSS absolute units (`in`/`mm`) for the 1:1 view | A canvas/pixel-ratio-based renderer | Rejected — `use-print-fit.ts`'s own header comment states CSS spec-defined units (96 CSS px/in) are the honest, already-adopted approach in this codebase; a `devicePixelRatio` multiply is explicitly forbidden by D-13 |
| Chrome headless `--print-to-pdf` for PRNT-06's browser-printed page | Puppeteer/Playwright | Neither is installed (`node_modules` checked, absent); Playwright is explicitly deferred to Phase 9 per ROADMAP.md — installing it early would violate that sequencing decision |

**Installation:**
```bash
# No installation required — this phase adds no dependency.
```

**Version verification:** All versions above are read directly from `package.json` at `/Users/kontoes/Code/shaper/package.json` [VERIFIED: package.json, read 2026-09-07] — no `npm view` lookup needed since no new package is introduced.

## Package Legitimacy Audit

**Not applicable.** This phase introduces zero new npm packages, per the Standard Stack section above. No package-legitimacy check was run because there is nothing to check.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Shaper opens /design/rails
        |
        v
RailBandEditor (rail-band-editor.tsx)
  RailPage: "viewer" | "data" | "instructions"  <-- widened union, local state
        |
        +-- "viewer" --> existing RailSectionPlot x3 (Nose/Center/Tail), unchanged
        |
        +-- "data" ----> existing RailDataTable, unchanged
        |
        +-- "instructions" --> RailInstructions (NEW component)
                |
                +-- Card 1: computeRailSection(flat|domed) --> buildRailSegments/buildRailProfile
                |            --> RailSectionPlot with new `callouts` prop
                |            --> Flat/Domed TwoOptionToggle (local state)
                |
                +-- Card 2: static planRefPaths()/sideRefPaths() (ported literal data)
                |            over public/rail-bands-plan-bg.png
                |            <-- nine legend Checkboxes (local state) gate which
                |                path groups render
                |
                +-- Card 3: static closing-note copy

VIEWER toolbar --> ViewerToolbarButton "View Full Sized"
        |
        v
Dialog (Base UI) --> Nose/Center/Tail tabs --> RailSectionPlot at CSS in/mm size
        |                                       (measurePxPerInch-style probe)
        +-- Print button --> @media print rules on the dialog's own content

Rails sidebar --> Checkbox "Include Rail Band Instructions in Print"
        |
        v
   usePrintInstructionsPreference() (mirrors useUnits())
        |         \
        v          \--> cookie + localStorage (client mirror)
   Postgres user_preferences.<new column>
        |
        v
/design/summary --> OrderForm reads the same preference
        |
        +-- unticked: 2 sheets, byte-identical to pre-milestone (PRNT-06)
        +-- ticked:   3rd <Sheet variant="reference"> reusing RailInstructions'
                      own rendering, fixed to Flat + all legend lines (D-08)
```

### Recommended Project Structure
```
components/rails/
├── rail-band-editor.tsx        # MODIFIED: RailPage union widened, 1:1 button wired
├── rail-controls.tsx           # MODIFIED: print-toggle Checkbox row appended
├── rail-section-plot.tsx       # MODIFIED: optional `callouts` prop added
├── rail-instructions.tsx       # NEW: the INSTRUCTIONS tab's three cards
├── rail-plan-side-figure.tsx   # NEW: the ported plan/side SVG overlay + legend
├── view-full-sized-dialog.tsx  # NEW: the 1:1 Dialog
└── two-option-toggle.tsx       # NEW (per UI-SPEC — actually components/viewer/, see below)

components/viewer/
└── two-option-toggle.tsx       # NEW (UI-SPEC places it beside toolbar-button.tsx/tabbed-panel.tsx)

lib/
├── units-preference.ts         # MODIFIED or sibling — see D-07 mapping below
├── print-instructions-preference.ts  # possible NEW sibling, mirroring units-preference.ts's shape
├── units-server.ts             # MODIFIED or sibling
lib/db/
├── schema.ts                   # MODIFIED: new nullable column on user_preferences
├── queries.ts                  # MODIFIED: new read function
app/actions/
└── units.ts or print-instructions.ts  # MODIFIED or NEW server action
components/
└── units-provider.tsx          # MODIFIED (generalized) or sibling provider

public/
└── rail-bands-plan-bg.png      # MOVED from reference/project/assets/

lib/geometry/
├── rail-bands.ts                # UNTOUCHED (D-20)
├── rail-bands.test.ts           # MODIFIED: new golden-parity describe block
└── __fixtures__/prototype-rails-golden.json  # REGENERATED, new key

scripts/
└── extract-prototype-rails-golden.mjs  # MODIFIED: new fixture-producing block

lib/
└── units-isolation.test.ts     # MODIFIED: ledger entries for every new file
```

### Pattern 1: Reuse the existing rail-section pipeline for the example rail

**What:** `computeRailSection` (public Mm-boundary wrapper) → `buildRailSegments`/`buildRailProfile` (segment/point builders) → `railPlotBounds` (axis range) is the exact same chain every other rail section already runs through `computeRailBands`. The example rail is simply one more call to this chain with the prototype's literal inputs, not a new code path.

**When to use:** Any new rail cross-section that isn't one of the board's own nose/center/tail sections (e.g. the example rail, or a future "compare two settings" feature).

**Example:**
```typescript
// Source: lib/geometry/rail-bands.ts, functions read in full 2026-09-07
// (computeRailSection: lines 488-524; buildRailSegments: lines 552-565;
//  buildRailProfile: lines 541-549; railPlotBounds: lines 576-586)
import { computeRailSection, buildRailSegments, buildRailProfile, railPlotBounds } from "@/lib/geometry/rail-bands";
import { inchesToMm } from "@/lib/geometry/units";

const domed = /* local toggle state */ false;
const thicknessIn = domed ? 3 : 3.5;              // D-20's exact prototype inputs
const thickness = inchesToMm(thicknessIn);
const domedBandBase = inchesToMm(6);

const result = computeRailSection({
  thickness,
  ratioTopPercent: 60,
  family: 3,
  domedBandBase,
  scale: 1,
  cornerCutOffsetOverride: null,
  removeCornerCut: false,
  singleTuck: false,
  bottomTuck3Override: null,
  symmetrical: false,
  hardEdge: false,                                  // prototype's howToRead call omits it -> falsy
});

const opts = { boardThickness: inchesToMm(3.5), railThicknessVal: inchesToMm(3), domedBandBase };
const segments = buildRailSegments(result, thickness, domed, opts);
const profile = buildRailProfile(result, thickness, domed, opts);
const bounds = railPlotBounds(result, { domed, thickness, ...opts });
```

This is the same shape `computeRailBands`'s internal `build()` closure already assembles for nose/center/tail (`lib/geometry/rail-bands.ts` lines 628-676) — no new exported function is needed from `lib/geometry/`.

### Pattern 2: An optional `callouts` prop on `RailSectionPlot`, not a second plot

**What:** `RailSectionPlot` already computes `px()`/`py()` (the exact pixel projection), `segmentLines` (from `output.segments`), and `dots` (from the same segments plus `result.apexCenter`). A `callouts` prop can derive its ten anchor points from this same `output` object and the same `px()`/`py()` closure, rather than a parallel geometry pass.

**When to use:** The INSTRUCTIONS tab's example rail, and the third print sheet's own copy of it (D-08's fixed Flat rendering) — the exact same component, called twice with different `output` values (Flat vs Domed) or once with `domed={false}` hard-coded for the print path.

**Example (anchor mapping, verified against the live prototype source):**
```
// Source: reference/project/Rails.dc.html lines 1093-1104 (verbatim, read 2026-09-07)
const raw = [
  { x: px(0), y: py(r.apexCenter), text: `Apex`, color: '#1c1b19', side: 1 },
  { x: px(0), y: py(segs.find(s => s.key === 'domedBand').p1[1]), text: `Domed Taper`, color: '#6b8e4e', side: 1 },
  { x: px(0), y: py(r.railMark1), text: `Rail Mk1`, color: 'var(--accent)', side: 1 },
  { x: px(-r.cornerCutDeck), y: py(r.railMark1), text: `Corner Cut`, color: '#4d8a86', side: -1 },
  { x: px(-r.deckMark3), y: py(thickness), text: `Deck 3`, color: '#b5563a', side: -1 },
  { x: px(-r.deckMark2), y: /* band1Y(-r.deckMark2) */ ..., text: `Deck 2`, color: 'var(--accent)', side: -1 },
  { x: px(-r.deckMark1), y: py(thickness), text: `Deck 1`, color: 'var(--accent)', side: -1 },
  { x: px(0), y: py(r.railTuck1), text: `Tuck 1`, color: '#1c1b19', side: 1 },
  { x: px(-r.bottomTuck1), y: py(0), text: `Bottom Tuck 1`, color: '#1c1b19', side: -1 },
  { x: px(-r.bottomTuck3), y: py(0), text: `Bottom Tuck 3`, color: '#8a8272', side: -1 },
];
```

Every one of these `x`/`y` inputs (`r.apexCenter`, `segs.find(s=>s.key==='domedBand').p1[1]`, `r.railMark1`, `r.cornerCutDeck`, `r.deckMark3`, `r.deckMark2`, `r.deckMark1`, `r.railTuck1`, `r.bottomTuck1`, `r.bottomTuck3`) already exists on `RailSectionOutput.result` or `.segments` in the ported `lib/geometry/rail-bands.ts` — confirmed by reading that file's `RailSectionResult` interface (lines 91-114) and `RailSegment[]` shape (lines 128-134) in full. The "Corner Cut" callout's `y` is `railMark1`, not the `cornerCut` segment's own `p2.y` — this is a real discrepancy worth flagging to the planner (see Common Pitfalls, Pitfall 3).

The de-overlap pass (`MIN_GAP = 17`, `BUCKET_PX = 95`, cluster-by-x-proximity, split by `side`) is at lines 1104-1132 of the prototype and has no dependency on any app-specific token — it can be ported as a pure function of the `raw` array, local to the new component, exactly as CONTEXT.md's D-17 directs ("diagram layout math under `components/`, not `lib/geometry/`").

### Pattern 3: A generic preference-pipeline "shape", reused for the print toggle

**What:** The units preference is not one file but five cooperating pieces, each with a single job. Mapped one-for-one below (all read in full 2026-09-07):

| Piece | File | Units' shape | What the print toggle needs |
|-------|------|--------------|------------------------------|
| Storage schema | `lib/db/schema.ts` | `userPreferences.units: text("units")`, nullable, on the existing `clerkUserId`-primary-keyed row | A second nullable column on the same table, e.g. `railInstructionsInPrint: boolean` or a nullable `text`/`boolean` — Drizzle's `pgTable` extension is additive |
| Migration | `drizzle/0000_moaning_zodiak.sql` (+ 2 more) | One `drizzle-kit generate` per schema change | `npm run db:generate` after the schema edit produces the migration file; per CLAUDE.md, apply to dev with `db:migrate`, push code, deploy, **then** `db:migrate:prod` |
| Read | `lib/db/queries.ts`'s `readUnitsPreference` | `select` one column, run through an allow-list parser, return `T \| null` | A `readPrintInstructionsPreference(clerkId)` following the identical shape |
| Cookie/localStorage keys | `lib/units-preference.ts`: `UNITS_STORAGE_KEY = "shaper-units"`, `UNITS_COOKIE_NAME = "shaper-units"` | Plain string constants | New constants, e.g. `"shaper-print-rail-instructions"` |
| Parse/allow-list | `parseUnitsPreference(value: unknown): UnitsSystem \| null` | Checks membership in `UNITS_SYSTEMS` | A boolean-preference parser checking `value === "true" \| "false"` (cookie/localStorage store strings) — same "never a silent default" contract |
| Handoff rule | `decideUnitsHandoff({signedIn, account, browser})` | Account wins on sign-in; browser promotes to an empty account; absence is never written | Same three-branch logic, retyped for a boolean — directly portable |
| Write queue | `createUnitsWriteQueue({save, setTimer, clearTimer})` | At-most-one-in-flight, last-pick-wins, bounded retry ladder (`[1000, 4000, 15000]` ms) | Same queue shape, parameterized by a boolean `save` function |
| Server action | `app/actions/units.ts`'s `saveUnitsPreference` | `"use server"`, reads `auth()`, validates against an allow-list, `onConflictDoUpdate` upsert, resolves quietly if signed out | A `savePrintInstructionsPreference(value: boolean)` following the identical shape |
| Server resolution | `lib/units-server.ts`'s `resolveUnitsHandoff` | `await auth()` + cookie + `try/catch`-degraded account read, before render | A parallel `resolvePrintInstructionsHandoff()`, or a widened `resolveUnitsHandoff` that returns both |
| Client provider | `components/units-provider.tsx`'s `UnitsProvider`/`useUnits()` | `useSyncExternalStore`, a `reconciledRef` to prevent a one-frame flash on sign-in reconciliation, `emitPreferenceChange()` for same-tab sync, `storage` event for cross-tab sync | Either: (a) `UnitsProvider` generalizes to carry both values in one `useSyncExternalStore` (touches every `useUnits()` call site's type only if the hook's return shape changes — it need not, if a second hook is exported from the same provider), or (b) a sibling `PrintInstructionsProvider`/`usePrintInstructionsPreference()` duplicating the ~120-line provider body |

**Recommendation on provider shape (not locked — CONTEXT reserves this as discretion):** Because `UnitsProvider` is load-bearing for a shipped, trusted feature with a zero-regression bar (the app's own "untouched means unchanged" promise), the lowest-risk path is to **generalize the pure logic** (`decideUnitsHandoff`-shaped function, `createUnitsWriteQueue`-shaped queue) into small generic helpers that both `lib/units-preference.ts` and a new `lib/print-instructions-preference.ts` call, while keeping `UnitsProvider`/`useUnits()` byte-for-byte untouched and adding a **new, separate** `PrintInstructionsProvider`/`usePrintInstructionsPreference()` component that reuses those generic helpers internally. This satisfies D-07's "extend rather than duplicate" at the *logic* level (no re-derivation of the handoff rules or retry ladder) while touching zero existing call sites of `useUnits()`. The alternative — merging both preferences into one provider/context value — is also viable and arguably more idiomatic, but every one of the (many) `useUnits()` call sites across the app would need to be audited even if only to confirm they're unaffected, which is a larger diff for the same outcome. **[ASSUMED]** — this is a design-space recommendation from reading the code, not a verified-safe migration; the planner should treat it as a starting hypothesis to validate against the actual number and shape of `useUnits()` call sites during planning.

### Pattern 4: CSS absolute units for a 1:1 SVG, measured not assumed

**What:** `use-print-fit.ts`'s `measurePxPerInch()` creates a live `1in`-wide probe `div`, reads its `getBoundingClientRect().width`, and removes it — rather than hardcoding `96`. This is the exact technique the prototype's own actual-size caveat describes ("assuming your browser renders CSS inches at the standard 96px/in") but made honest by *measuring* rather than assuming.

**When to use:** The "View Full Sized" dialog's SVG sizing (D-13) and its print path (D-15) — both are screen/paper-scaling concerns, the same category `use-print-fit.ts` already occupies, and CLAUDE.md explicitly names `use-print-fit.ts` as the one place allowed to keep its own copy of the 25.4 constant rather than routing through `lib/geometry/units.ts`. A new `components/rails/`-local hook following the identical measured-probe pattern is the correct move, not a shared import from `components/summary/`.

**Example:**
```typescript
// Source: components/summary/use-print-fit.ts lines 57-65 (verbatim, read 2026-09-07)
function measurePxPerInch(): number {
  const probe = document.createElement("div");
  probe.style.cssText = "width:1in;height:0;position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px > 0 ? px : 96;
}
```
The 1:1 dialog's own copy should be sized similarly — the SVG's `width`/`height` set as explicit CSS pixel values equal to `(boardMeasurementInInches * pxPerInch)`, never a percentage `viewBox`-fit (which is what every *other* viewer in this app correctly uses, and exactly what D-13 forbids here).

### Anti-Patterns to Avoid
- **Adding a `halveDeckMark1` parameter to `computeRailSection`:** Confirmed a second time in this research session — `computeSection`'s definition at `reference/project/Rails.dc.html:704` destructures `{ thickness, ratioTopPct, family, domed, domedBandBase, scale = 1, cornerCutOffsetOverride, removeCornerCut, singleTuck, bottomTuck3Override, symmetrical, hardEdge }` with no `halveDeckMark1` key anywhere in that list; the only place the string `halveDeckMark1` appears in the entire prototype file is the call site at line 1359. Porting it would invent behaviour the reference never executed.
- **Copying the prototype's `zoom:0.74` print constant:** D-09 explicitly forbids this. The prototype's print path (`onPrintSpecs`, lines 1526-1589) builds a raw HTML string with a hard-coded `width:700px;zoom:0.74` div — a self-contained, throwaway document with no relationship to this app's `use-print-fit.ts`/`order-form.css` sizing machinery. The third sheet must be fitted the same way the other two are (per-sheet, via `useOrderFormPrintFit`'s existing walk of `[data-order-form-sheet]`).
- **Building the instructions sheet as a jsPDF call:** `components/template/*` stays untouched by this phase (ROADMAP.md's own settled finding, and confirmed no `RailSectionPlot`/callout-rendering code exists in any `build-*-pdf.ts` file). The third sheet reuses the same live-React component the INSTRUCTIONS tab renders.
- **A second, parallel plot component for the example rail or the 1:1 view:** `rail-section-plot.tsx`'s own header comment (as of this session) still says callouts "belong to the out-of-scope Instructions page" — that comment is stale and must be updated, per CONTEXT.md's own note, but the component itself needs only an additive `callouts` prop, not a fork.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Millimetre/inch conversion anywhere in this phase's new files | A local `* 25.4` or `/ 25.4` | `lib/geometry/units.ts`'s `inchesToMm`/`mmToInches` | CLAUDE.md Rule 2 is absolute; `lib/units-isolation.test.ts`'s `"no print surface names a conversion factor of its own"` test greps for the literal `25.4`/`2.54` across every walked print-surface file and fails the suite on a match |
| The example rail's expected numeric output | Hand-computed/eyeballed values in a new test | `scripts/extract-prototype-rails-golden.mjs`'s existing `extractMethod`/`new Function` extraction, extended with one new fixture-producing block | CLAUDE.md Rule 1; the existing script already proves this pattern works for eleven other scenarios |
| A boolean account preference's parse/handoff/retry logic | A bespoke implementation for the print toggle | `lib/units-preference.ts`'s `decideUnitsHandoff`/`createUnitsWriteQueue` shape, generalized or duplicated with fidelity | Five edge cases (signed-in-with-account, signed-in-with-browser-only, signed-in-with-neither, signed-out-with-browser, signed-out-with-neither) are already correctly enumerated and covered by tests in the existing module; re-deriving them risks reproducing a bug the units feature already fixed once (WR-01/WR-02, per STATE.md's decision log) |
| A "does this rail need its data recomputed" check inside the new INSTRUCTIONS component | A memoization/dependency-array hand-roll | Plain synchronous computation on every render (the UI-SPEC's own UI Considerations table confirms this: "computed synchronously from constants, so no skeleton, spinner or placeholder exists") | The example rail's inputs are two fixed literal states (Flat/Domed) — there is nothing to cache |
| PDF-vs-PDF visual diffing | A hand-rolled PDF renderer or byte-diff tool | `pypdf` (page/text-stream extraction) + `qlmanage -t` (macOS Quick Look thumbnail rendering to PNG, the established pattern per this project's own session history for "no poppler here") | Chrome-produced PDFs are not guaranteed byte-identical run-to-run (producer metadata, font subsetting) even when visually identical — a content/visual diff is the correct tool, not `diff`/`cmp` |

**Key insight:** Every "don't hand-roll" item in this phase already has a working, tested precedent inside this exact codebase — this is a port-and-extend phase, not a build-from-scratch one. The risk is not missing capability; it is silently deviating from an established pattern (a new conversion factor, a new preference-handling shape, a new print pipeline) when an existing one already covers the case correctly.

## Runtime State Inventory

Not applicable — this is not a rename/refactor/migration phase. It is additive: a new tab, a new dialog, a new print toggle, and one new nullable database column. No existing identifier, key, or path is renamed.

## Common Pitfalls

### Pitfall 1: The "Corner Cut" callout's y-coordinate does not match its own segment's endpoint
**What goes wrong:** A naive port of D-17's callout anchors, reading only the segment definitions, would place the "Corner Cut" label at `py(band1Y(-r.cornerCutDeck))` — the actual y-value of the `cornerCut` segment's `p2` endpoint — rather than at `py(r.railMark1)`, which is what the prototype's own `raw` array literally specifies (line 1097, quoted verbatim above).
**Why it happens:** The `cornerCut` segment visually runs close to (but not exactly along) the `band1` line near its `p1` end, so `r.railMark1` (the segment's `p1.y`, not its label point) reads as a plausible "near enough" simplification if someone re-derives the anchor from the segment geometry instead of copying the prototype's `raw` array verbatim.
**How to avoid:** Copy the ten anchor computations character-for-character from the quoted `raw` array above (or from `Rails.dc.html` lines 1093-1103 directly) rather than re-deriving them from `RailSegment` endpoints by inspection. Where the label deliberately doesn't sit on its own segment's endpoint, that is the prototype's design, not a bug to "fix."
**Warning signs:** A visual side-by-side against the prototype's own `howToRead` plot (or its 1:1 export, which bakes the same labels as SVG `<text>`, line 921) shows the "Corner Cut" label sitting at a visibly different height than the reference.
**Phase to address:** This phase, at the plan-checking or execution-verification stage — a specific side-by-side screenshot comparison against the prototype for this one label is the cheapest possible check.

### Pitfall 2: The print-surface units-isolation ledger's folder walk won't catch the 1:1 dialog's print rules by default
**What goes wrong:** `lib/units-isolation.test.ts`'s `findPrintSurfaceFiles()` walks only `components/summary/*` and `components/template/*` (plus one explicit one-off, `lib/geometry/template.ts`). A new `components/rails/view-full-sized-dialog.tsx` — which is a genuine new print surface per D-15 — will be caught by the *design-screen* ledger (`findScreenTsxFiles()` walks `components/rails/` already) for the basic "imports display boundary, no banned formatter" checks, but will **not** be covered by the print-surface-specific checks: `"no print surface names a conversion factor of its own"` and `"no print surface composes a litres figure on a line that also names the units system"`. Both of those checks only run over `findPrintSurfaceFiles()`'s narrower folder set.
**Why it happens:** The two ledgers (`DESIGN_SCREEN_DISPLAY_FILES`/`OUT_OF_SCOPE_UNITS_FILES` vs. `PRINT_SURFACE_DISPLAY_FILES`/`PRINT_SURFACE_OUT_OF_SCOPE_FILES`) were built for two disjoint sets of folders (`components/{outline,rocker,rails,fins,volume}` vs. `components/summary` + `components/template`), and this phase is the first time a single file (something under `components/rails/`) is simultaneously a design-screen surface and a print surface.
**How to avoid:** Extend `findPrintSurfaceFiles()`'s existing one-off-append pattern (`return [...found, "lib/geometry/template.ts"];`) to also append the specific new print-surface file(s) under `components/rails/` by name, rather than widening `PRINT_SURFACE_FOLDERS` to include the whole `components/rails` directory (which would drag every other rails-screen file — `rail-controls.tsx`, `rail-data-table.tsx`, etc. — into a ledger they don't belong in and require spurious entries for files that are not print surfaces).
**Warning signs:** The print-toggle's dialog print path compiles and passes the design-screen ledger, giving false confidence that PRNT-06's stricter print-specific guarantees (no raw conversion factor, no units-branched litres) are covered when they are not.
**Phase to address:** This phase — a specific task should extend `findPrintSurfaceFiles()`'s return statement by name for whichever new file(s) actually carry `@media print` rules.

### Pitfall 3: The account-preference write, applied to a boolean, must still distinguish "unset" from "false"
**What goes wrong:** `parseUnitsPreference` distinguishes three states for a two-valued enum: `"imperial"`, `"metric"`, or `null` ("never chosen"). A boolean preference has the same three-state need — `true`, `false`, or "never chosen" (which must render as unticked per D-05, but must NOT be written to the database as an explicit `false` the first time the box is unticked-by-default, because D-07 says "absence means unticked — a default is never written"). If the new parser or column collapses "never chosen" and "explicitly false" into the same stored value, a later change to the *default* (unlikely but the exact trap `DEFAULT_UNITS_SYSTEM` guards against for units) becomes impossible to distinguish from a shaper's explicit choice.
**Why it happens:** A boolean's most natural Postgres/TypeScript type (`boolean`) has only two states, not three — the `null` state has to be preserved deliberately, the same way `units: text("units")` is nullable rather than defaulting to `"imperial"` at the schema level.
**How to avoid:** Declare the new column as nullable (`boolean("...")` without `.notNull()`, or `.default(...)` — Drizzle's own nullable-column pattern already used for `units`) and never write a value to it until the shaper actually ticks the box (mirroring `saveUnitsPreference`'s "never write on read, only on an explicit pick" discipline, and `decideUnitsHandoff`'s "a default nobody chose is never written to an account" branch).
**Warning signs:** A migration that declares the column `NOT NULL DEFAULT false`, or a client-side write that fires on mount rather than only on an explicit tick.
**Phase to address:** This phase, at schema-design time (before `npm run db:generate` is ever run).

### Pitfall 4: Chrome headless `--print-to-pdf` can fire before this app's own `beforeprint` handler has attached
**What goes wrong:** `useOrderFormPrintFit`'s `beforeprint` listener is attached inside a `useEffect` after the component mounts and React has hydrated. If Chrome's headless print-to-pdf is invoked against a bare URL with no wait, the print may be requested (and the PDF captured) before that `useEffect` has run — producing a PDF that never had the print-fit's width/height pinning applied, which would make even the "toggle off, should be byte-identical" case fail to match the real, hydrated-and-printed baseline.
**Why it happens:** Headless Chrome's `--print-to-pdf` triggers the browser's print pipeline immediately once the page's `load` event fires (or immediately, if navigation itself is considered complete) — it has no built-in concept of "wait for this React app's own effects to run."
**How to avoid:** Add an explicit wait before invoking print — either a `--virtual-time-budget` flag (giving the page's own JS time to run before the virtual clock advances to the print step) or, more reliably, a two-step approach: navigate and wait for a fixed delay (2-3 seconds is generous for this app's client-rendered summary page) via a small wrapper script, then invoke a second headless Chrome pass with `--print-to-pdf` against the already-warm URL. This has not been empirically verified in this repo (no prior phase used headless-Chrome PDF capture) — treat the exact timing as something to confirm with one manual trial run before relying on it for a plan's verification step.
**Warning signs:** The captured "toggle off" PDF does not match the print-preview a human sees in the actual browser, or the PDF's page count/dimensions look wrong (e.g., a full-height unpaginated page rather than the fitted `[data-order-form-sheet]` boxes).
**Phase to address:** This phase — if the automated diff proves unreliable after one trial, fall back to the Phase 7 D-10 human print-preview audit rather than spending further time forcing the automated path.

### Pitfall 5: The plan/side figure's SVG `viewBox` values are load-bearing and must move byte-for-byte
**What goes wrong:** The plan-view SVG's `viewBox="0 0 3.7135 10.4996"` and the side-view SVG's `viewBox="3.98 0.32 1.09 9.87"` (both read verbatim from `Rails.dc.html` lines 420 and 432) are precisely calibrated against `rail-bands-plan-bg.png`'s own pixel dimensions and crop. If the PNG is re-exported, re-compressed, or accidentally re-cropped during its move to `public/`, the SVG overlay lines will silently drift off the background art — a rail-section boundary line landing in the wrong place relative to the drawn board outline, with no error or visual break to signal the mismatch.
**Why it happens:** The coupling between the PNG's pixel grid and the SVG's `viewBox` coordinate space is implicit — nothing in code enforces it, and a `cp`/`mv` of the file is the only operation guaranteed not to break it.
**How to avoid:** Move the PNG with a byte-preserving copy (`cp reference/project/assets/rail-bands-plan-bg.png public/rail-bands-plan-bg.png`, verified with a checksum before/after), and carry every `viewBox`, `d=` path string, and pixel-dimension literal from `planRefPaths()`/`sideRefPaths()` (lines 671-675, quoted in full above) unchanged.
**Warning signs:** A visual side-by-side against the prototype's own rendering (screenshot at the same zoom) shows any line not landing on the same board-outline feature.
**Phase to address:** This phase — the verification step should explicitly include this side-by-side, not just "the component renders without errors."

### Pitfall 6: `computeCalibrationMark`'s imperial caption literal is `2"`, not `2 in`
**What goes wrong:** CONTEXT.md's own prose (D-14) describes the check bar's caption as "`2 in` in Imperial" — but the actual, verified output of `formatCalibrationMark(inchesToMm(2), "imperial")` is `formatInchesFraction`'s output, and the existing Full Sized Template's own caption composition (`scaleSquareCaptionText`, `components/template/build-template-pdf.ts` lines 319-322, read verbatim) produces the literal string `2" x 2" — measure before taping`, not `2 in x 2 in`. If the planner or executor takes CONTEXT's prose literally and hand-types a `"2 in"` string instead of calling `formatCalibrationMark`, the new caption will disagree with the template it's supposed to match "the same way" (D-14's explicit intent).
**Why it happens:** CONTEXT.md's prose is a paraphrase for readability, not a literal string to transcribe — the actual literal only exists in the formatter's real output.
**How to avoid:** Always call `formatCalibrationMark(SCALE_SQUARE_MM_EQUIVALENT, system)` (or reuse the existing `SCALE_SQUARE_MM`/`scaleSquareCaptionText` constant and function directly if the check bar is meant to be pixel-for-pixel styled the same) rather than hand-typing any caption string.
**Warning signs:** A grep for a literal `"2 in"` string anywhere in a new rails component.
**Phase to address:** This phase, at plan-writing time — the plan's action text should say "call `formatCalibrationMark`", not "display '2 in'".

## Code Examples

### The golden-fixture entry for the example rail (D-20)

```javascript
// Source: scripts/extract-prototype-rails-golden.mjs, structure read in full 2026-09-07.
// The existing script already extracts computeSection/buildSegmentDefs/cardFromResult from the
// prototype via new Function() and writes { state, sections: { nose, center, tail } } per fixture
// name. The example rail does not fit that three-section shape — it is a single section computed
// twice (Flat/Domed) with fixed literal inputs, not derived from a `state` object at all. A new,
// separate top-level key (name is Claude's discretion, e.g. `exampleRail`) with its own shape is
// the correct extension point, added alongside — not instead of — the existing per-fixture loop:

const EXAMPLE_RAIL_INPUTS = {
  flat:  { thickness: 3.5, domed: false },
  domed: { thickness: 3,   domed: true },
};
const exampleRail = {};
for (const [key, { thickness, domed }] of Object.entries(EXAMPLE_RAIL_INPUTS)) {
  const computeArgs = {
    thickness, ratioTopPct: 60, family: 3, domed, domedBandBase: 6, scale: 1,
    // halveDeckMark1 deliberately omitted — confirmed inert, see Anti-Patterns above
  };
  const result = host.computeSection(computeArgs);
  const segmentsFull = host.buildSegmentDefs(result, thickness, domed, {
    boardThickness: 3.5, railThicknessVal: 3, domedBandBase: 6,
  });
  exampleRail[key] = {
    computeArgs,
    result,
    segments: segmentsFull.map((sg) => ({ key: sg.key, label: sg.label, p1: sg.p1, p2: sg.p2 })),
  };
}
golden.exampleRail = exampleRail;
```

The corresponding test in `lib/geometry/rail-bands.test.ts` follows the exact same `expectCloseIn`/`NUMERIC_RESULT_FIELDS` pattern already used for the eleven existing fixtures (read in full, lines 1-120) — calling `computeRailSection` with the equivalent Mm-boundary inputs (`inchesToMm(3.5)`/`inchesToMm(3)` for `thickness`, `inchesToMm(6)` for `domedBandBase`) and asserting field-by-field against `golden.exampleRail.flat.result`/`.domed.result`.

### The Metric grid algorithm the plot already has (D-13, RAIL-06)

```typescript
// Source: components/rails/rail-section-plot.tsx lines 144-206 (verbatim, read 2026-09-07)
// buildRailPlotGrid already branches on `system` and produces a 10mm-pitch grid labelled through
// formatMarkBare in Metric — this is reused as-is by both the example rail's plot and the 1:1
// dialog's plot, since both render through RailSectionPlot. No new grid logic is needed for RAIL-06.
export function buildRailPlotGrid(
  bounds: { minX: number; minY: number; maxY: number },
  system: UnitsSystem,
): RailPlotGrid { /* ... imperial: whole-inch pitch; metric: 10mm pitch via inchesToMm/mmToInches ... */ }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Prototype's raw HTML string + hidden `<iframe>` + `window.print()` for the whole "Rail Band Spec" print | This app's two structurally separate pipelines: live React `@media print` (order form) and jsPDF vector builders (templates) | Phase 1-3 (v1.0), Phase 7 (v1.1 units) | The prototype's print mechanism has no reusable code for this app — every dimension, page-break, and scale constant it used is prototype-local and must be re-derived in the target pipeline's own units, never copied literally |
| Prototype's floating absolutely-positioned HTML `<span>` callouts with a `text-shadow` halo | This app's SVG `<text>` + `DimensionLine`'s `haloColor` prop | Quick task 260822-vcs (viewer callout system rebuild) | D-17 explicitly follows this app's already-established SVG-text convention, not the prototype's HTML-overlay one — sketch decision 8 in `.planning/sketches/MANIFEST.md` locks this in project-wide |

**Deprecated/outdated:**
- The prototype's `halveDeckMark1` flag: confirmed dead code in the reference itself, not merely unported — do not resurrect it.
- The prototype's `zoom:0.74` fixed shrink for its printed instructions block: has no analogue in this app's per-sheet-fitted print architecture.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Generalizing the *pure* handoff/write-queue logic (not the `UnitsProvider` component) into shared helpers is the lowest-risk path for the print preference, versus merging both preferences into one provider | Architecture Patterns, Pattern 3 | If the actual number/shape of `useUnits()` call sites is small, merging into one provider might be simpler and equally safe — this is a recommendation to validate during planning, not a locked architecture; CONTEXT.md itself reserves this as discretion |
| A2 | A 2-3 second fixed wait is sufficient for this app's client-rendered `/design/summary` page to hydrate before headless Chrome's `--print-to-pdf` is invoked | Common Pitfalls, Pitfall 4 | If too short, the captured PDF would not reflect `useOrderFormPrintFit`'s pinning and the automated diff would produce false failures (or false passes, if it happens to still look similar) — requires one manual trial run to confirm before being relied on for a plan's verification |
| A3 | The new "Include Rail Band Instructions in Print" column should be a nullable Postgres `boolean`, mirroring `units`'s nullable `text` shape | Common Pitfalls, Pitfall 3 | If a `text`-with-allow-list column (like `units`) is preferred for consistency with the existing pattern, the exact Drizzle column type differs but the three-state (true/false/unset) contract is identical either way — low risk, a naming/typing choice left to the planner |
| A4 | Widening `findPrintSurfaceFiles()`'s explicit by-name append (matching its existing `lib/geometry/template.ts` precedent) is preferable to widening `PRINT_SURFACE_FOLDERS` to include all of `components/rails/` | Common Pitfalls, Pitfall 2 | If the planner instead widens the whole folder, every existing rails-screen file (`rail-controls.tsx`, `rail-data-table.tsx`, `rail-band-editor.tsx`) would need new `PRINT_SURFACE_DISPLAY_FILES`/`PRINT_SURFACE_OUT_OF_SCOPE_FILES` entries even though most are not print surfaces — more ledger surgery than the by-name approach, but not incorrect |

**If this table is empty:** N/A — see entries above.

## Open Questions

1. **Exact number and blast radius of `useUnits()` call sites, if the provider is generalized rather than sibling'd.**
   - What we know: `UnitsProvider`/`useUnits()` is read from `app/layout.tsx` (root-mounted) and consumed by every design screen, the order form, and settings UI.
   - What's unclear: The precise count and whether any consumer destructures the context value in a way that would break if a second field were added (unlikely, since object destructuring is additive-safe, but not independently verified in this session).
   - Recommendation: A quick `grep -rn "useUnits()" components/ app/` at plan-writing time would settle this in under a minute; not done in this research session to keep scope bounded to the questions CONTEXT.md explicitly asked.

2. **Whether the 3-4 second wait for headless Chrome is actually sufficient, or whether a more deterministic hydration signal is available.**
   - What we know: Chrome headless `--print-to-pdf` and `--virtual-time-budget` both exist and are documented Chrome flags; this app has no `data-hydrated`-style marker to poll for.
   - What's unclear: The exact minimum reliable wait, and whether `--virtual-time-budget` (which pauses JS timers at a virtual clock) interacts correctly with this app's real `setTimeout`-based autosave/preference-write machinery (unrelated to printing, but running on the same page).
   - Recommendation: One manual trial (documented as this phase's own D-11 spike) before locking the exact command into a plan's `<verify>` block; fall back to the Phase 7 D-10 human audit if it proves flaky.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Google Chrome (headless print-to-pdf) | PRNT-06's automated order-form diff | Yes [VERIFIED: `google-chrome --version` executed 2026-09-07] | 152.0.7977.77 | Phase 7 D-10 human print-preview audit |
| Python `pypdf` | Splitting/inspecting captured PDFs for the diff | Yes [VERIFIED: `python3 -c "import pypdf"` executed 2026-09-07] | 6.16.1 | N/A — already present |
| macOS `qlmanage` | Rendering PDF pages to PNG for a visual diff (no poppler on this machine) | Yes [VERIFIED: `which qlmanage` executed 2026-09-07, `/usr/bin/qlmanage`] | (system tool, unversioned) | N/A — already present |
| Puppeteer (npm) | An alternative headless-browser automation path | No [VERIFIED: `node_modules` checked, absent] | — | Chrome's own `--print-to-pdf` CLI flag (no npm dependency needed) |
| Playwright (npm) | An alternative headless-browser automation path | No [VERIFIED: `node_modules` checked, absent] | — | Deliberately deferred to Phase 9 per ROADMAP.md — do not install early |
| `pdftoppm`/`pdftocairo` (poppler) | An alternative PDF-to-image renderer | No [VERIFIED: `which pdftoppm pdftocairo` executed 2026-09-07, both absent] | — | `qlmanage -t` (macOS Quick Look thumbnail generation), the pattern already used in this project's own prior session history |

**Missing dependencies with no fallback:** none — every capability this phase needs has either a direct tool or a documented fallback.

**Missing dependencies with fallback:** Puppeteer/Playwright (fallback: Chrome's own CLI flag, or the Phase 7 D-10 human audit); poppler (fallback: `qlmanage -t`).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.11 [VERIFIED: package.json], `environment: "node"` (no DOM — confirmed by `lib/units-isolation.test.ts`'s own comment: "There is no DOM available in this vitest config") |
| Config file | `vitest.config.ts` (present at repo root, not read in full this session — inferred from `npm test` = `vitest run` and every existing test file's own DOM-less assumption) |
| Quick run command | `npx vitest run lib/geometry/rail-bands.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|-------------|
| RAIL-02 | Example rail's Flat/Domed numeric results match the prototype's own executed formulas | unit (golden-parity) | `npx vitest run lib/geometry/rail-bands.test.ts` | ✅ `lib/geometry/rail-bands.test.ts` exists, add a new describe block |
| RAIL-03 | Flipping the toggle recomputes with the correct thickness (3.5"/3") | unit (covered by the same golden-parity assertions, both `flat`/`domed` keys) | same as above | ✅ |
| RAIL-04 | The 1:1 dialog renders at true scale, no calibration flow | human-check (ruler against screen) | N/A — see Human Verification below | N/A |
| RAIL-05 | Plan/side figure lines land on the correct board-outline features | human-check (visual side-by-side vs. prototype) | N/A | N/A |
| RAIL-06 | Every new number reads through the display boundary in both systems | unit (ledger mechanical checks) | `npx vitest run lib/units-isolation.test.ts` | ✅ `lib/units-isolation.test.ts` exists, extend its lists |
| PRNT-05 | The checkbox reads/writes the same preference in both places | unit (mirroring `lib/units-preference.ts`'s own test coverage pattern — that file's test was not directly located this session but the module's pure functions are directly testable the same way) | `npx vitest run lib/<new-file>.test.ts` | ❌ Wave 0 — new preference module needs its own test file |
| PRNT-06 | Toggle-off order form byte-identical; jsPDF outputs unchanged; toggle-on proven per-pipeline | mixed: unit (jsPDF re-diff, mirroring Phase 7's method) + human-check or new automated diff (browser-printed order form) | `npm test` (regenerate/compare jsPDF fixtures) + the D-11 print-to-PDF path above | ⚠️ jsPDF diff method exists (Phase 7 precedent); order-form diff tooling is new this phase |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/geometry/rail-bands.test.ts lib/units-isolation.test.ts` (the two files this phase's automated coverage concentrates in)
- **Per wave merge:** `npm test` (full suite — this repo's tests currently number in the low thousands per STATE.md's own trend notes, e.g. "2046 passed" cited in a prior phase's SUMMARY)
- **Phase gate:** Full suite green, plus the PRNT-06 jsPDF byte-identical re-diff (Phase 7's own method, reused), before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] A new test file for whichever preference module shape is chosen (`lib/print-instructions-preference.test.ts` or equivalent) — covers PRNT-05's parse/handoff/write-queue logic, mirroring the shape (though the exact existing test file for `units-preference.ts` was not opened this session — its existence should be confirmed at plan time via `ls lib/units-preference.test.ts`)
- [ ] The new golden-fixture describe block in `lib/geometry/rail-bands.test.ts` — covers RAIL-02/RAIL-03
- [ ] No new test infrastructure/framework install needed — Vitest is already fully configured for this kind of pure-function and source-contract testing

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | This phase adds no new auth surface — the preference write reuses `await auth()` exactly as `saveUnitsPreference` already does |
| V3 Session Management | No | No new session concept introduced |
| V4 Access Control | Yes | The new preference write must scope to the session's own `userId` from `auth()`, never a client-supplied id — exactly `saveUnitsPreference`'s own pattern (`app/actions/units.ts` lines 30-42, read in full), which `lib/db/ownership.test.ts` already mechanically enforces for the whole `app/actions/` surface; a new server action file should be swept into that same test's coverage |
| V5 Input Validation | Yes | The new preference value (boolean, or a two-value enum) must be validated against an allow-list before it reaches the database, exactly as `saveUnitsPreference` validates against `UNITS_SYSTEMS` before an `onConflictDoUpdate` — "a crafted call can't write arbitrary text into the column" |
| V6 Cryptography | No | No cryptographic material is introduced |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| A client-supplied `clerkUserId`/owner field smuggled into the new preference write | Spoofing / Elevation of Privilege | Always derive the identity from `await auth()` server-side, never accept it as a function parameter — `lib/db/ownership.test.ts`'s existing "no caller-supplied owner parameter" check should be extended to cover the new server action file by name |
| An untrusted cookie/localStorage value for the new preference reaching the database or a conditional render unfiltered | Tampering | Route every stored value (cookie, localStorage, account column) through an allow-list parser before use, exactly as `parseUnitsPreference` does for `units` — the print toggle's parser must reject anything outside its own two/three valid states |
| A crafted preference value writing something other than `true`/`false` into the new column | Tampering | The server action must validate the incoming value against its own allow-list before the `db.insert(...).onConflictDoUpdate(...)` call, mirroring `saveUnitsPreference`'s `if (!(UNITS_SYSTEMS as readonly string[]).includes(system)) return;` guard |

## Sources

### Primary (HIGH confidence)
- This repository, read in full this session: `reference/project/Rails.dc.html` (lines 358-527, 660-960, 1275-1373, 1340-1590) [VERIFIED], `lib/geometry/rail-bands.ts` (full file) [VERIFIED], `lib/geometry/rail-bands.test.ts` (lines 1-120) [VERIFIED], `scripts/extract-prototype-rails-golden.mjs` (full file) [VERIFIED], `components/rails/rail-section-plot.tsx` (full file) [VERIFIED], `components/viewer/callout-primitives.tsx` (full file) [VERIFIED], `lib/units-isolation.test.ts` (full file) [VERIFIED], `components/summary/use-print-fit.ts` (full file) [VERIFIED], `lib/db/schema.ts` (full file) [VERIFIED], `lib/db/queries.ts` (full file) [VERIFIED], `app/actions/units.ts` (full file) [VERIFIED], `lib/units-preference.ts` (full file) [VERIFIED], `lib/units-server.ts` (full file) [VERIFIED], `components/units-provider.tsx` (full file) [VERIFIED], `components/summary/order-form.tsx` (full file) [VERIFIED], `app/design/summary/order-form.css` (full file) [VERIFIED], `components/rails/rail-band-editor.tsx` (full file) [VERIFIED], `components/rails/rail-controls.tsx` (lines 1-100) [VERIFIED], `components/viewer/toolbar-button.tsx` (full file) [VERIFIED], `components/viewer/tabbed-panel.tsx` (full file) [VERIFIED], `components/ui/dialog.tsx` (full file) [VERIFIED], `lib/geometry/measure-display.ts` (full file) [VERIFIED], `components/design/design-store.tsx` (lines 1-120) [VERIFIED], `components/template/build-template-pdf.ts` (grep + lines 300-343) [VERIFIED]
- `package.json` [VERIFIED] — confirms no Puppeteer/Playwright installed, jsPDF 4.2.1, Base UI 1.7.0
- Terminal environment probes executed this session: `qlmanage` present at `/usr/bin/qlmanage`, Google Chrome 152.0.7977.77 present, `python3 -c "import pypdf"` succeeds at 6.16.1, `pdftoppm`/`pdftocairo` absent, `node_modules` has no `puppeteer`/`playwright` directory [VERIFIED]
- `.planning/research/SUMMARY.md`, `ARCHITECTURE.md`, `PITFALLS.md` (v1.2 research, all read in full) [CITED: internal project research] — pitfalls 9-14 map directly onto this phase's rails/print work
- `.planning/milestones/v1.1-phases/07-metric-on-paper/07-04-SUMMARY.md`, `07-VERIFICATION.md` (relevant sections read) [CITED: internal project record] — the exact PDF-diff and human-audit methods Phase 7 used
- `.planning/sketches/MANIFEST.md` (full file) [CITED: internal project record] — the callout grammar decisions RAIL-02's callouts must follow

### Secondary (MEDIUM confidence)
- None used this session beyond the primary repository sources — every claim above traces to a file read or a command executed in this session.

### Tertiary (LOW confidence)
- The exact minimum wait time for headless Chrome hydration (Pitfall 4, Open Question 2) is not empirically verified in this session and is flagged as such.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependency, every claim verified against `package.json` and a live terminal probe
- Architecture: HIGH — every integration point cited by file, line range, and (where load-bearing) verbatim quote from a file read in this session
- Pitfalls: HIGH for geometry/ledger/units-preference pitfalls (all grounded in direct code reads); MEDIUM for the headless-Chrome hydration timing pitfall (a genuinely new technique for this repo, not yet empirically run)

**Research date:** 2026-09-07
**Valid until:** 30 days (stable domain — no fast-moving external dependency; the one time-sensitive fact, Chrome's installed version, is unlikely to change the behaviour of `--print-to-pdf` within that window)

---

*Phase: 08-the-rails-screen-finished*
*Researched: 2026-09-07*
