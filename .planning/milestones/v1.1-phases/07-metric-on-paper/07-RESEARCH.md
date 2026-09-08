# Phase 7: Metric on Paper - Research

**Researched:** 2026-09-06
**Domain:** Print-surface unit formatting (jsPDF text composition + a client-component order form) built on the display boundary Phase 6 already proved
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** The 2in scale-check square stays exactly 2in in both systems; only its caption changes. Drawn from `inchesToMm(2)` in both `build-template-pdf.ts` and `build-strip-pdf.ts`, unchanged in Metric — no printed geometry changes anywhere in this phase.
- **D-02:** In Metric the caption and the matching how-to line read `50.8 mm` — the app's one millimetre value with a decimal (a calibration reference, not a shaping mark). Caption: `50.8 mm x 50.8 mm — measure before taping`; how-to line 2: `Measure the 50.8 mm square. It should be exactly 50.8 mm.` Derived from the same `SCALE_SQUARE_MM` constant through a formatter that keeps a tenth — never hand-typed, never `formatWholeMm`. Imperial keeps today's strings exactly.
- **D-03:** The Paper Saver's registration lines read whole millimetres on both sides — `914 mm from tail — rail 273 mm` where Imperial reads `36" from tail — rail 10 3/4"`. Neither number appears on any screen, so there is nothing to match against — both format as marks. Reversibility: costly.
- **D-04:** The Full Sized Template's mark labels follow Phase 6's table unchanged. The mark name takes the station label (`Nose 30.5 cm` in Metric — the stations themselves never move), and the figure beside it is the board's full width there, which is a dim and reads in centimetres: `Nose 30.5 cm — 40.0 cm`, `Centre — 51.4 cm`, `Tail Block — 15.2 cm`.
- **D-05:** The board never moves; text lands where it fits. In both systems the outline curve, every working mark, the page tiling, the alignment box, the registration lines and the scale square are identical. A label is free to sit at a different offset or break onto two lines when the metric string is a different width from the inch string it replaces. This is the working definition of success criterion 5 for the template: "nothing on paper moved" means the geometry, not the text placement.
- **D-06:** The template name block's seven-value dims row carries `cm` once, at the end of its centimetre values: `Length 188.0 · Nose 40.0 · Widepoint 51.4 · Offset +2.5 · Tail 36.8 · Thickness 6.7 cm · Volume 34.0 L`.
- **D-07:** Each of the order form's seven dimension cells carries its own unit — `188.0 cm`, `40.0 cm`, `51.4 cm`, `+2.5 cm`, `36.8 cm`, `6.7 cm`, `34.0 L`. Deliberately the opposite of D-06 on nearly the same list: a unit is carried once per line of running text, and a value standing alone in its own box carries its own.
- **D-08:** Every fin placement value on page 2 carries its own `mm` — `Off Tail 286 mm`, `Off Rail 32 mm`, `Toe 3 mm`, `Full Spread 421 mm`. Every `FinSummaryRow` already carries `family: "mark"` from Phase 6.
- **D-09:** The order form's layout is identical in both systems; a value that overflows shrinks rather than clips. No panel changes shape, gains a heading, or moves between systems. Where a metric string does not fit its cell, that value's type steps down until it does. No measurement ever ends in an ellipsis. Tighter guarantee than D-05: the order form is a designed sheet of fixed panels, the template is a working drawing.
- **D-10:** The Metric print audit is part of finishing this phase, not a follow-up — with Metric chosen, re-run the order form's overflow check on every compact panel, both sheets, both paper sizes (Letter and A4), then again on Imperial to confirm it is unchanged.
- **D-11:** Paper size stays uncoupled from the units choice. The export dialog opens on Letter in both systems, exactly as today. No new default, no new saved preference.
- **D-12:** No per-export units override. Everything printed follows the gear-menu chooser. A shaper who needs an inch template for someone else flips the chooser, prints, and flips back.

### Claude's Discretion

- The Overview Sheet's spec block: follows Phase 6's table with no new decisions needed (length as a dim, the `6'0" - 72"` dual form has no metric counterpart so Metric prints the single figure, widepoint width and tail block as dims in cm, swallow/diamond depth as marks in whole mm, angles/percentages unchanged, station labels via `stationLabel`). The area line is open: `Template Area: 1234.5 sq in (8.57 sq ft)` becomes cm² through `formatArea`, and the second parenthetical is dropped in Metric.
- A precision trap in the Overview Sheet: `overviewStationLines` decides whether to merge WIDEPOINT and CENTER from the PRINTED magnitude of the widepoint offset, deliberately rather than a raw-float epsilon — Metric prints to 0.1cm (1mm) where Imperial prints to 1/16in (~1.6mm), so the merge threshold genuinely differs by system. Keep the existing intent (decide from what is actually printed, in the active system) and pin both branches with a test.
- Where printed text is composed: `lib/geometry/template.ts` composes label text today (`stripRegistrationLabel`, `MARK_LABELS`, the `label` on `markPlacements`/`stripMarkSegments`) while importing `formatInchesFraction` — a pure geometry file doing display work, pinned by frozen fixtures. The planner chooses between threading `UnitsSystem` into those functions and moving text composition out to the three PDF builders. Either way CLAUDE.md Rule 2 holds: every conversion goes through `units.ts`/`measure-display.ts`, and no builder restates a factor. `use-print-fit.ts` keeps its own 25.4 — it scales paper sizes, not board dimensions.
- How the system reaches each surface: `order-form.tsx` is already a client component and can read `useUnits()` directly; `export-preview-dialog.tsx` is too and can pass a `system` field into the three `Build*PdfOptions` objects. Field name, whether it is required or defaulted, and how the existing PDF tests parameterise over both systems are the planner's call.
- Extending the ledger: `lib/units-isolation.test.ts`'s conversion ledger closed on the design-screen files in Phase 6, with a comment explicitly naming the order form as Phase 7's work. Grow it to cover the four print surfaces in the same idiom (a `converted` flag per file, a completeness assertion, banned-formatter checks) rather than starting a second mechanism, and update that comment.
- The mechanism behind D-09's shrink-to-fit, number styling, and all plain-English copy (the caption wording, the how-to line, any heading text) — including whether the how-to box's first line about turning off "Fit to page" needs a word changed. Imperial copy is untouched.
- Playwright stays uninstalled unless phase acceptance genuinely needs an end-to-end run. Formatting, label composition and the PDF builders' text output are all unit-testable; the print audit (D-10) is a human check in the browser's print preview.

### Deferred Ideas (OUT OF SCOPE)

- A per-export units override in the export dialog — would let a metric shaper hand an inch template to someone who reads inches without touching the chooser. Belongs in its own phase with its own requirement.
- Remember the last paper size a shaper used — a new saved preference of its own, unrelated to units. Its own phase.
- `sq ft` on the Overview Sheet — Imperial keeps its `(8.57 sq ft)` parenthetical; Metric drops it rather than inventing a square-metre equivalent. If a metric second area figure is ever wanted, it is a copy decision, not a units one.
- Eight reviewed-but-rejected pending todos (copy-spec-to-clipboard, rails INSTRUCTIONS page, rails viewer extras, finished-board photo uploads, mobile layout polish, fins imported tail curve, presets for rails/fins, bottom contours) — none is a printed output, all reviewed and rejected for this phase already in Phase 6.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| PRNT-01 | The Summary order form prints every measurement in the chosen system | `order-form.tsx` already reads as a client component (`"use client"`, pinned by `lib/units-isolation.test.ts:334-343`); every current call site using `formatInchesFraction`/`formatFeetInches`/`formatSignedInchesFraction` is catalogued in Architecture Patterns #3/#4 and Code Examples; `FinSummaryRow.family` is already `"mark"` everywhere (verified `lib/geometry/fins.ts:907-978`), so the fin panel needs only a formatter swap, not a classification decision |
| PRNT-02 | The Overview Sheet PDF prints in the chosen system | `overviewSpecLines`, `overviewLengthLabelText`, `overviewWpOffsetLabelText`, `overviewStationLines` are all already exported for testability (`build-overview-pdf.ts`, read in full) — Common Pitfalls and Open Questions #1 cover the precision-trap discretion item |
| PRNT-03 | The Full Sized Template and Paper Saver print marks, labels and name/dims block in the chosen system | Every text-composing function in `build-template-pdf.ts`/`build-strip-pdf.ts` catalogued (Architecture Patterns #1/#2); the frozen-pin risk that governs this requirement's success criterion 5 is fully documented in Summary and Common Pitfalls #1 |
| PRNT-04 | In Metric, the printed scale-check square is captioned in millimetres | D-01/D-02 (locked, no longer open) fully captured in User Constraints; Common Pitfalls #4 covers the two-file caption-string duplication risk; Validation Architecture names the exact test command |

</phase_requirements>

## Summary

This phase does not add a capability — it finishes threading the units chooser Phase 5 built and
the `measure-display.ts` boundary Phase 6 proved, into the four places a shaper puts on paper: the
Summary order form (`components/summary/order-form.tsx`, a client component), and three jsPDF
builders (`components/template/build-template-pdf.ts`, `build-strip-pdf.ts`,
`build-overview-pdf.ts`) reached through `export-preview-dialog.tsx`. All four exist today, all
four currently compose imperial strings by calling `lib/geometry/units.ts`'s raw formatters
(`formatInchesFraction`, `formatFeetInches`, `formatSignedInchesFraction`) directly, and none of
them reads `useUnits()` yet — that is the entire gap this phase closes.

The one genuine surprise, already flagged in CONTEXT.md and confirmed by reading the source this
session: `lib/geometry/template.ts` — a **pure geometry file**, subject to CLAUDE.md Rule 1 and
covered by three **frozen characterisation-pin `describe` blocks** in `template.test.ts` — composes
printed label TEXT today, not just numbers. `MARK_LABELS` (a static `Record`), `stripRegistrationLabel`,
and `stripMarkSegments`'s own label line all call `formatInchesFraction` and hardcode imperial-only
strings (`'Nose 12"'`, `'Tail 12"'`) directly inside the pure file the frozen pins hash. Any of the
three frozen pins hashes a JSON blob that includes these `label`/`text` string fields — so the
literal wording of these strings is part of what "frozen, never edit" protects, not just the
numbers. This is the load-bearing fact for planning this phase: **every function the frozen pins
hash must keep producing byte-identical output when called with no `UnitsSystem` argument (or an
explicit `"imperial"` default)** — the pins are cheap to keep green (the Imperial branch never
moves) and expensive to fix after the fact (recapturing eight digests per pin needs the same
split-the-proof-from-the-pin discipline the 260903-18d quick task used).

**Primary recommendation:** Thread `UnitsSystem` through every text-composing function the four
print surfaces call, always producing today's exact Imperial string when `system === "imperial"`
(proving this either by keeping a default parameter or by an explicit imperial-branch equality
test), format every metric value through `lib/geometry/measure-display.ts` (never restate a
formatter or a conversion factor at a jsPDF call site), and keep `lib/geometry/template.ts`'s pure
geometry (tile grid, page numbers, placements' numeric fields) completely untouched — only its
label-composing helpers gain a system argument, and the planner must choose (Claude's Discretion,
per CONTEXT.md) whether that composition stays in `template.ts` with `UnitsSystem` threaded through,
or moves out to the three PDF builders so the geometry file goes back to computing numbers only.

## Project Constraints (from CLAUDE.md)

- **Rule 1 (geometry pure and tested):** No React, browser API, or database imports in `lib/geometry/*.ts` files. Every exported function gets unit tests. Never inline a formula in a component. Never hand-transcribe an expected number — regenerate from a fixture (the one documented exception is a characterisation-pin digest, which by definition has no closed form — `template.test.ts:142-146` — that exception does not extend to any NEW label string this phase adds).
- **Rule 2 (units contract):** Dims (length, widths, headline thickness) read in centimetres to one decimal; marks (rail band, rocker, foil, and — per Phase 6's UAT amendment — every fin placement number) read in whole millimetres. Every conversion of a design value goes through `lib/geometry/units.ts`/`measure-display.ts` — never reach for `25.4` or `10` anywhere else, with `components/summary/use-print-fit.ts`'s own copy of `25.4` the one named, sanctioned exception (it scales paper sizes, not board dimensions). The units preference is display-only — switching never rewrites a saved design.
- **Plain-English communication:** Explain every change in terms of what it does to the board or the printed page, not which component re-renders — applies to commit messages, plans, and summaries produced for this phase.
- **Commands:** `npm test` (`vitest run`) must stay green, including the frozen `lib/geometry/template.test.ts` pins. `npm run build` must be run from the main checkout, not a worktree (Turbopack constraint, unrelated to this phase's own code but relevant if plans execute in a worktree).
- **No CNC/mixed-systems/per-board-units scope creep:** this phase must not add a units switch to the export dialog (D-12) or a new saved preference (D-11) — both explicitly out of scope per CONTEXT.md, consistent with REQUIREMENTS.md's "Out of Scope" table (no mixed measuring systems, no per-board units).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Reading the shaper's chosen units system | Frontend Server / Browser (`useUnits()`) | — | `UnitsProvider` is mounted once at `app/layout.tsx` root (server-resolved handoff, `components/units-provider.tsx:88-99`); every print surface is a client component already inside that tree |
| Formatting a design value into a printed string | Browser/Client (jsPDF builders run client-side; order form renders client-side) | Geometry/pure (`lib/geometry/measure-display.ts`) | The formatter itself is pure (no React/browser import, enforced by `lib/units-isolation.test.ts:60-73`); the client component/builder supplies `system` and calls it |
| Tile-grid / page-layout geometry (station ranges, half-width ranges, overlap, page count) | Geometry/pure (`lib/geometry/template.ts`) | — | Frozen by characterisation pins in `template.test.ts`; must never take a `UnitsSystem` argument that changes a numeric field |
| Printed label TEXT composed inside the geometry file today (`MARK_LABELS`, `stripRegistrationLabel`, `stripMarkSegments`'s label) | Geometry/pure today, by construction — **candidate to move to Client tier this phase** | Client (PDF builders) if moved | This is CONTEXT.md's "Claude's Discretion" item; either destination is architecturally valid as long as the frozen pins' Imperial-mode output never moves |
| PDF byte generation (jsPDF `doc.text`/`doc.line`/`doc.rect` calls) | Browser/Client (`build-*-pdf.ts`, no `"use client"` needed since they're plain functions called from client components) | — | Already the existing architecture; unchanged by this phase |
| Paper-size scaling for print-fit (`use-print-fit.ts`'s own `25.4`) | Browser/Client | — | Explicitly NOT part of the units boundary — CLAUDE.md's own sanctioned exception; scales physical paper geometry, not a design value |

## Standard Stack

No new libraries this phase. Every dependency below is already installed and in use; this phase
extends existing modules, it does not introduce new ones.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsPDF | ^4.2.1 [VERIFIED: package.json] | Builds the three printable PDFs (`build-template-pdf.ts`, `build-strip-pdf.ts`, `build-overview-pdf.ts`) | Already the one PDF library in the codebase; no reason to add a second |
| Vitest | (project's existing version, unchanged) | Unit-tests every text-composing function this phase touches | House test runner; `vitest run` is `npm test` |

### Supporting
None — this phase reuses `lib/geometry/measure-display.ts` and `lib/geometry/units.ts` (both already built) and `components/units-provider.tsx`'s `useUnits()` (already built). No supporting package is added.

### Alternatives Considered
Not applicable — no new library decision exists in this phase.

**Installation:** None — no `npm install` needed.

## Package Legitimacy Audit

**Not applicable.** This phase installs no external packages. It only extends existing, already-installed modules (`jsPDF`, already-authored `lib/geometry/*` files). No package-legitimacy check was run because there is nothing to check.

## Architecture Patterns

### System Architecture Diagram

```
useUnits() (root-mounted UnitsProvider, app/layout.tsx)
        │
        │  system: "imperial" | "metric"
        ▼
┌───────────────────────────┐        ┌──────────────────────────────┐
│ order-form.tsx            │        │ export-preview-dialog.tsx     │
│ (already "use client")    │        │ (already "use client")        │
│ reads useUnits() directly │        │ reads useUnits(), passes      │
│                           │        │ `system` into Build*PdfOptions│
└──────────┬────────────────┘        └───────────┬────────────────────┘
           │                                      │
           │ calls measure-display.ts             │ calls Build*Pdf(options)
           │ formatters with `system`             │ with options.system
           ▼                                      ▼
┌─────────────────────┐          ┌────────────────────────────────────┐
│ measure-display.ts  │◄─────────┤ build-template-pdf.ts               │
│ (pure, no React)    │          │ build-strip-pdf.ts                  │
│ formatDim/formatMark│          │ build-overview-pdf.ts               │
│ formatSignedDim etc.│          │ (jsPDF doc.text/.line/.rect calls)  │
└─────────────────────┘          └───────────────┬────────────────────┘
                                                  │ calls (numeric layout +
                                                  │  today: label TEXT too)
                                                  ▼
                                  ┌────────────────────────────────────┐
                                  │ lib/geometry/template.ts            │
                                  │ (pure; frozen characterisation pins │
                                  │  in template.test.ts hash its       │
                                  │  output — numbers AND label strings)│
                                  └────────────────────────────────────┘
```

A shaper's click on the gear-menu chooser never crosses into `lib/geometry/template.ts` unless the
planner deliberately threads `system` into it — the pure tile-grid math stays reachable with zero
units awareness if label composition is moved out to the PDF builders instead (see Claude's
Discretion below).

### Recommended Project Structure

No new files/folders. Existing structure, unchanged:
```
components/summary/
├── order-form.tsx          # gains useUnits() + measure-display.ts calls
├── use-print-fit.ts         # UNCHANGED — its own 25.4 stays (paper geometry, not a design value)
components/template/
├── export-preview-dialog.tsx  # gains useUnits(), passes `system` into Build*PdfOptions
├── build-template-pdf.ts      # text-composing functions gain a `system: UnitsSystem` parameter
├── build-strip-pdf.ts         # same
├── build-overview-pdf.ts      # same
lib/geometry/
├── template.ts              # PURE tile-grid math UNCHANGED; label-composing helpers either
                              #  gain `system` here, or move out (Claude's Discretion)
├── measure-display.ts        # UNCHANGED code, new call sites only
├── units.ts                  # UNCHANGED
lib/
├── units-isolation.test.ts   # ledger extended to the four print surfaces (Claude's Discretion)
```

### Pattern 1: Thread `system` through a jsPDF options object, never a hidden default

**What:** Every `Build*PdfOptions` interface (`BuildTemplatePdfOptions`, `BuildStripPdfOptions`,
`BuildOverviewPdfOptions`) needs a `system: UnitsSystem` field so a caller can never forget to pass
it and silently get an old default.
**When to use:** Every one of the three builders, plus `templateMarkDimensionText`,
`templateMarkLabelText`, `templateNameBlockDimsText`, `nameBlockContent`, `templateHowToLines`,
`overviewSpecLines`, `overviewLengthLabelText`, `overviewWpOffsetLabelText` — every exported
text-composing helper in the three builder files, which are already exported specifically so text
can be tested without rendering a page (their own doc comments say so:
`components/template/build-template-pdf.ts:328-340`, `:654-669`, `:471-481`).
**Example (today's imperial-only signature, verified this session):**
```typescript
// Source: components/template/build-template-pdf.ts:332-340 (read this session)
export function templateMarkDimensionText(placement: TemplateMarkPlacement): string {
  return formatInchesFraction(mm(placement.halfWidthExtent * 2));
}
export function templateMarkLabelText(placement: TemplateMarkPlacement): string {
  return `${placement.label} — ${templateMarkDimensionText(placement)}`;
}
```
The planner's plan should change these to accept `system: UnitsSystem` and call
`formatDim(mm(placement.halfWidthExtent * 2), system)` instead — this is a **dims**-family value
per D-04 (a board's full width at a station), not a mark, even though it's drawn beside a *mark*
tick on the template.

### Pattern 2: `formatDim`/`formatMark`/`formatSignedDim`/`formatLength` are the only conversion path

**What:** Every metric string on paper composes through `lib/geometry/measure-display.ts`, never
through a bare `formatCentimetres`/`formatWholeMm` call at the print-surface call site, and never
through a restated `25.4`/`10` factor.
**When to use:** Everywhere `formatInchesFraction`/`formatFeetInches`/`formatSignedInchesFraction`
is called today in `order-form.tsx`, `build-template-pdf.ts`, `build-strip-pdf.ts`,
`build-overview-pdf.ts`.
**Example (verified — the exact functions available, `lib/geometry/measure-display.ts:62-114`):**
```typescript
// Source: lib/geometry/measure-display.ts (read this session)
export function formatDim(value: Mm, system: UnitsSystem): string {
  return system === "metric" ? `${formatCentimetres(value)} cm` : formatInchesFraction(value);
}
export function formatMark(value: Mm, system: UnitsSystem): string {
  return system === "metric" ? `${formatWholeMm(value)} mm` : formatInchesFraction(value);
}
export function formatSignedDim(value: Mm, system: UnitsSystem): string { /* ... */ }
export function formatLength(value: Mm, system: UnitsSystem): string {
  return system === "metric" ? `${formatCentimetres(value)} cm` : formatFeetInches(value);
}
```
`formatDimBare`/`formatMarkBare` exist for the table-header-carries-the-unit case (D-10) — not
needed on any of the four print surfaces per CONTEXT.md's decisions (every standalone print value
carries its own unit: D-07, D-08).

### Pattern 3: The order form already has everything it needs to read `useUnits()`

**What:** `components/summary/order-form.tsx` opens with `"use client"`
(`order-form.tsx:1`, verified) and is pinned as a client component by
`lib/units-isolation.test.ts:334-343`. No new provider, no prop threading — call `useUnits()`
directly inside `OrderForm()`, exactly like `export-preview-dialog.tsx` will.
**When to use:** Once, at the top of `OrderForm()`.
**Example:**
```typescript
// New call inside OrderForm() — order-form.tsx currently destructures useDesign() at line 162-175
const { system } = useUnits();
```

### Pattern 4: Fin panel rows already carry their own `family` — read it, don't decide it

**What:** `lib/geometry/fins.ts`'s `FinSummaryRow.family: MeasureFamily` and
`FinSummaryGroup.fullSpreadFamily: MeasureFamily | null` are already populated on every row
(verified this session — every literal in the file's `sections` builder tags `family: "mark"`,
`lib/geometry/fins.ts:907-978`). The order form's fin panel (`order-form.tsx:590-608`) currently
calls `formatInchesFraction(row.value, 16)` directly — swap that for
`formatMark(row.value, system)` (never `formatDim`, since every row is `"mark"`).
**When to use:** The page-2 Fin Placement panel only.

### Anti-Patterns to Avoid
- **Restating a conversion factor at a print call site:** `use-print-fit.ts`'s own `25.4` is the
  ONE sanctioned exception (it scales physical paper dimensions, not a design value) — CLAUDE.md
  names it explicitly. No new `25.4` or `/10` may appear in any of the four print-surface files.
- **Calling `formatCentimetres`/`formatWholeMm` directly from a print surface:** these are
  `measure-display.ts`'s own internal building blocks; a print surface calls `formatDim`/`formatMark`/etc.,
  never the bare centimetre/millimetre formatters — mirrors the same rule Phase 6's ledger already
  enforces for the design screens (`lib/units-isolation.test.ts:167-173`'s `BANNED_DISPLAY_FORMATTERS`
  list).
- **Giving `lib/geometry/template.ts`'s pure numeric fields a units-dependent VALUE:** a
  `UnitsSystem` argument may change a *label string* this file returns, but must never change a
  `station`, `halfWidthExtent`, `topStation`, `halfWidthStart`, or any other millimetre number the
  frozen pins hash as part of the *layout*. Confirm by construction: `computeTemplateLayout`,
  `computeTemplateMarks`, `computeStripLayout`, `templatePageBoxes`, `computeTailClosure`,
  `tailClosureSegments`, `nameBlockPlacement`, `scaleSquarePlacement`, `howToBoxPlacement` need NO
  units argument at all — the board never moves (D-05).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Metric string formatting | A new `mmToCm`/`toFixed` call in a print file | `lib/geometry/measure-display.ts`'s `formatDim`/`formatMark`/`formatSignedDim`/`formatLength` | Already proven across 15 design-screen files; a second implementation risks a rounding-tie disagreement with the design screens the shaper compares against |
| Reading the shaper's chosen system in a jsPDF builder | A prop threaded manually from each page component | `useUnits()` read once in `export-preview-dialog.tsx`/`order-form.tsx`, passed as a plain `system` field on the options object | The builders are plain functions (no React), so `system` MUST arrive as a field, never a hook call inside `build-*-pdf.ts` itself — but the CALLER should use the existing hook, not invent a second units-reading mechanism |
| Verifying "the order form still reads correctly in both systems" | A rendered-DOM snapshot test | A source-contract test in the `lib/units-isolation.test.ts` idiom (grep the stripped source for banned formatters / required imports) | `vitest.config.ts`'s own `include` list is `lib/**/*.test.ts` and `components/**/*.test.ts` — **not** `.test.tsx` — so no JSX-rendering test file will even be collected; this is a structural constraint, not a preference (verified: `vitest.config.ts`, read this session) |

**Key insight:** every formatting decision this phase needs already has a house answer from Phase
6 — the only new work is composing NEW strings (dims-row separators, mark labels, how-to captions)
that Phase 6 never had to write, because Phase 6 never touched a print surface.

## Common Pitfalls

### Pitfall 1: Recapturing a frozen digest instead of proving it didn't need to move

**What goes wrong:** A plan touches `lib/geometry/template.ts`'s `MARK_LABELS` or
`stripRegistrationLabel` to add a metric branch, the pin's digest changes (because the label
STRING is part of what's hashed even for the unchanged Imperial call), and the executor
"fixes" the failing test by re-running the fixture generator and pasting in new digests —
silently erasing the proof that geometry didn't move.
**Why it happens:** The frozen digest hashes `JSON.stringify(combined)` where `combined` includes
`marks`, `placements` (with their `label` field), `lineSegments` (with `label`), and other
label-bearing structures (`template.test.ts:104-114`, `:175-183`, verified this session) — a purely
textual change to a label still changes the digest, even though "nothing moved."
**How to avoid:** Every call to a template.ts function inside the frozen `describe` blocks
(`template.test.ts:80-120`, `:148-191`, `:217-290`) calls `markPlacements`, `markLineSegments`,
`nameBlockPlacement`, `computeStripLayout`, `stripLabelRows`, etc. with **no units argument at all**
today. If the planner threads `system` into these functions, it MUST default to (or the test must
explicitly call with) `"imperial"` so the exact same string comes out — proving this requires
either (a) a default parameter value of `"imperial"` on every threaded function, or (b) a
new, narrow test that asserts `functionName(..., "imperial")` produces byte-identical output to a
snapshot captured before the change (the `260903-18d` quick task's own "split the proof from the
pin" idiom — capture a NEW seven-of-eight-style pin before touching source, if the change is not
purely additive).
**Warning signs:** `npm test` reports a failing digest in `template.test.ts` after what was meant
to be an additive (units-parameter) change — this is a hard stop, not something to fix by
recapturing.

### Pitfall 2: Treating a mark-tick's own printed WIDTH as a "mark" family value

**What goes wrong:** `templateMarkDimensionText` prints the board's full width at a station (e.g.
the width beside the "Nose 12\"" tick) — this reads as a **dims**-family number (D-04:
`Nose 30.5 cm — 40.0 cm`, the `40.0 cm` is a dim), even though it sits beside a mark's tick and the
tick's own STATION LABEL becomes a mark-family-adjacent string (`stationLabel()`, cm to one
decimal, same family as dims per Phase 6 D-03). Calling `formatMark` here instead of `formatDim`
would print `400 mm` instead of `40.0 cm` — wrong per D-04's explicit example.
**Why it happens:** The tick itself measures a small thing (a mark), but the number printed beside
it is the board's own width at that station — a size a shaper quotes, not a small measurement
taken with a rule.
**How to avoid:** Follow D-04 literally: `Nose 30.5 cm — 40.0 cm`, `Centre — 51.4 cm`,
`Tail Block — 15.2 cm` — every one of these trailing numbers is `formatDim`, never `formatMark`.
The station's own label (`Nose 30.5 cm`) uses `stationLabel(system)` composed with the mark's name
(`"Nose "`/`"Tail "` prefix), which is a DIFFERENT function than the trailing dimension.
**Warning signs:** A Metric template prints `400 mm` (a mark-family value) beside a mark whose name
already reads in cm — a shaper reading two adjacent numbers in two different metric families on
the same line is exactly the confusion D-03 (Paper Saver) already fixed by unifying a line's family.

### Pitfall 3: `MARK_LABELS`'s station-name literals are hardcoded Imperial text today

**What goes wrong:** `const MARK_LABELS: Record<keyof TemplateMarks, string> = { noseTwelve: 'Nose 12"', tailTwelve: 'Tail 12"', ... }` (`template.ts:196-202`, verified this session) hardcodes
the imperial `12"` string into the label name itself — there is no metric branch today. A naive
fix might leave these untouched and only convert the trailing dimension, producing a Metric print
that reads `Nose 12" — 40.0 cm` (the station name still says `12"` in Metric, contradicting D-04's
explicit `Nose 30.5 cm — 40.0 cm`).
**Why it happens:** `MARK_LABELS` was written before Phase 5/6 existed; it predates the units
chooser entirely.
**How to avoid:** `MARK_LABELS` (or whatever replaces it) must become a function of `system`,
composing `"Nose " + stationLabel(system)` and `"Tail " + stationLabel(system)` for the two
twelve-inch marks (`stationLabel` already exists — `measure-display.ts:155-157` — and already
produces `30.5 cm`/`12"` correctly); `center`/`widepoint`/`tailBlock`/`"Widepoint / Center"` are
plain English words with no unit inside them and need no system branch at all.
**Warning signs:** A Metric-mode print still contains the literal substring `12"` anywhere in a
mark label — grep for it in the rendered text during verification.

### Pitfall 4: The scale-square caption and how-to lines are duplicated across two builder files

**What goes wrong:** `build-template-pdf.ts`'s `drawScaleSquare` (line 323) and
`build-strip-pdf.ts`'s `SCALE_SQUARE_CAPTION_TEXT` (line 77) both hardcode
`'2" x 2" — measure before taping'` as separate string literals in separate files (each file's own
header comment explains this is deliberate — the strip module doesn't import from the tiled
template module for a one-line string). A metric branch added to only one of the two silently
leaves the other imperial-only.
**Why it happens:** These are two independently-maintained sibling files by design (per each
file's own doc comment on not importing across for a one-line transform), so a search-and-replace
across "the caption" easily misses one.
**How to avoid:** Treat this as two separate, symmetric edits — one in each file — and verify both
via their own dedicated tests (`build-template-pdf.test.ts`, `build-strip-pdf.test.ts`), not one
shared test. Same applies to `templateHowToLines` (`build-template-pdf.ts`) — the Paper Saver has
no how-to box, so this one is single-file, but its own line 2 (`'Measure the 2" x 2" square...'`)
is the D-02 caption's sibling text and must change in lockstep with `drawScaleSquare`'s caption in
the SAME file.

### Pitfall 5: `order-form.tsx`'s Volume cell must NOT gain a `system` argument

**What goes wrong:** A blanket "route every number through the units boundary" pass could
accidentally wrap `quotedVolumeLitres.toFixed(1)` in a units-aware call.
**Why it happens:** Volume is the one number on the order form that visually sits beside six other
values that DO need conversion (the `DimensionCell` strip), making it an easy one to sweep in by
habit.
**How to avoid:** Litres read identically in both systems (CLAUDE.md Rule 2, UNIT-05,
Phase 6's `06-07`/`T-06-02` security register) — `quotedVolumeLitres.toFixed(1)} L` must stay
exactly as it is, with no `system` argument anywhere near it.
**Warning signs:** `lib/units-isolation.test.ts:452-468`'s forward guard
("the display boundary offers no units-system-dependent litres formatter") already fails the
whole suite if `measure-display.ts` ever names both `Litres` and `UnitsSystem` on the same line —
a durable, pre-existing guard this phase must not need to touch.

## Code Examples

### Reading `useUnits()` in the order form (new call site)
```typescript
// Source: components/units-provider.tsx (existing, read this session) — no new export needed
import { useUnits } from "@/components/units-provider";
// Inside OrderForm():
const { system } = useUnits();
// Then, e.g., replacing order-form.tsx:258's formatFeetInches(outline.length):
<DimensionCell label="Length" value={formatLength(outline.length, system)} />
```

### Threading `system` into the export dialog's PDF options
```typescript
// Source: components/template/export-preview-dialog.tsx:166-174 (read this session) — the `dims`
// object built here already gathers every value the three builders need; adding `system` is one
// more field on the same object, read from useUnits() once at the top of the component.
const dims = {
  length: templateValues.length,
  widePointWidth: templateValues.widePointWidth,
  centerThickness: railValues.centerThickness,
  noseWidth12in: outlineGeometry.noseWidthAt12in,
  tailWidth12in: outlineGeometry.tailWidthAt12in,
  widePointOffset: outline.widePointOffset,
  volumeLitres: quotedVolumeLitres,
  // system: system,  // new field — or a sibling field on the Build*PdfOptions object, planner's call
};
```

### The Paper Saver registration label — today's imperial-only composition (must gain a metric branch per D-03)
```typescript
// Source: lib/geometry/template.ts:1187-1192 (read this session)
/** The registration line's own printed text — station and rail half-width, both through
 * `formatInchesFraction` (CLAUDE.md Rule 2), e.g. `36" from tail — rail 10 3/4"` (locked
 * decision). */
function stripRegistrationLabel(station: Mm, halfWidth: Mm): string {
  return `${formatInchesFraction(station)} from tail — rail ${formatInchesFraction(halfWidth)}`;
}
```
Per D-03, the Metric branch reads `914 mm from tail — rail 273 mm` — both numbers `formatMark`
(whole millimetres, no decimal), because "unlike a board width, neither of these numbers appears on
any screen" so there is no dims-family precedent to match — CONTEXT.md's own reasoning, quoted
here so the planner does not re-derive it.

## State of the Art

Not applicable in the "framework changed" sense — this is a closed, single-codebase phase with no
external ecosystem shift. The relevant "old approach / current approach" is entirely internal:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Print surfaces compose imperial strings via raw `lib/geometry/units.ts` formatters | Print surfaces compose via `lib/geometry/measure-display.ts`, system-aware | This phase | The four print surfaces join the fifteen design-screen files Phase 6 already converted; `lib/units-isolation.test.ts`'s ledger comment (`:159-162`) already names the order form as "Phase 7," confirming this was the plan all along |

**Deprecated/outdated:** None — no library or pattern is being retired.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `MARK_LABELS`'s `noseTwelve`/`tailTwelve` should compose via `stationLabel(system)` rather than a hand-written per-system string table | Common Pitfalls #3 | Low — `stationLabel` already exists and is proven (Phase 6); the alternative (a hardcoded metric string) would just duplicate logic, not break correctness, but would violate CLAUDE.md's "every conversion through units.ts/measure-display.ts" rule |
| A2 | `templateMarkDimensionText`'s trailing width figure is `formatDim`, not `formatMark` | Common Pitfalls #2 | Medium — if built as `formatMark` instead, the template would print `400 mm` where D-04 requires `40.0 cm`; directly contradicts a locked CONTEXT.md decision, would need a rework, not just a copy fix |

**If this table were empty:** it is not — the two items above are inferences from combining
verified code with CONTEXT.md's locked decisions, not confirmed against a test or a second source;
both are LOW-MEDIUM risk and should be confirmed at plan-review or UAT rather than treated as
already proven.

## Open Questions

1. **Where does label composition for `lib/geometry/template.ts` end up living — in the pure
   geometry file (with `UnitsSystem` threaded through) or moved out to the three PDF builders?**
   - What we know: CONTEXT.md explicitly leaves this to Claude's Discretion. Both are
     architecturally valid; moving composition out keeps `template.ts` free of any
     `UnitsSystem`/formatter import at all, restoring its "pure geometry, no display work" posture
     (arguably closer to CLAUDE.md Rule 1's spirit — geometry math should stay display-agnostic);
     threading `system` through keeps the label text co-located with the numeric fields it decorates
     (`markPlacements`' `label`, `markLineSegments`' `label`), which is less code movement.
   - What's unclear: whether moving composition out is a larger diff than threading a parameter
     through, given `stripMarkSegments`'s label is computed alongside its own numeric fields inside
     the same loop (`template.ts:1256-1274`) — extracting it cleanly may require restructuring that
     loop to return raw station/halfWidth data and build the label text one layer up.
   - Recommendation: the planner should pick ONE approach for all three affected functions
     (`MARK_LABELS`'s use inside `markPlacements`/`markLineSegments`, `stripRegistrationLabel`,
     `stripMarkSegments`) rather than mixing — consistency here matters more than which side wins,
     since a mixed approach means two different places a future editor has to check for "does this
     file compose display text."

2. **Does the order form's unit-conversion work get its own new test file, or does it live entirely
   inside `lib/units-isolation.test.ts`'s existing ledger?**
   - What we know: `vitest.config.ts`'s `include` excludes `.test.tsx`, so no rendered-DOM test of
     `order-form.tsx` is possible in this repo's test setup; the ledger's existing "source-contract"
     idiom (grep the stripped source, assert imports/bans) is the only mechanically-enforceable
     pattern available for a `.tsx` file.
   - What's unclear: whether the planner extends `DESIGN_SCREEN_DISPLAY_FILES`-style tracking to a
     new list (e.g. `PRINT_SURFACE_DISPLAY_FILES`) inside the SAME `lib/units-isolation.test.ts`
     file, or a new sibling test file — CONTEXT.md's "Extending the ledger" discretion note says
     "grow it... rather than starting a second mechanism," which points toward the same file.
   - Recommendation: extend `lib/units-isolation.test.ts` in place, adding the four print-surface
     files to a parallel structure alongside `DESIGN_SCREEN_DISPLAY_FILES`, and update its own
     closing comment (currently naming the order form as "Phase 7... work," `:159-162`) once this
     phase's conversion actually lands.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (project's installed version — `node` environment, verified `vitest.config.ts`) |
| Config file | `vitest.config.ts` — `include: ["lib/**/*.test.ts", "components/**/*.test.ts"]` (note: `.test.ts` only, **not** `.test.tsx` — no JSX rendering is collected) |
| Quick run command | `npx vitest run lib/geometry/template.test.ts components/template/build-template-pdf.test.ts components/template/build-strip-pdf.test.ts components/template/build-overview-pdf.test.ts lib/units-isolation.test.ts` |
| Full suite command | `npm test` (== `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRNT-01 | Order form prints every measurement in the chosen system | source-contract (grep) | `npx vitest run lib/units-isolation.test.ts` | ❌ Wave 0 — needs a new print-surface entry in the ledger |
| PRNT-02 | Overview Sheet PDF prints in the chosen system | unit (exported text-composing functions) | `npx vitest run components/template/build-overview-pdf.test.ts` | ✅ file exists (240 lines today) — needs new `system`-parameterised cases |
| PRNT-03 | Full Sized Template + Paper Saver print marks/labels/name-dims-block in the chosen system | unit + frozen-pin regression | `npx vitest run components/template/build-template-pdf.test.ts components/template/build-strip-pdf.test.ts lib/geometry/template.test.ts` | ✅ files exist — needs new `system`-parameterised cases; frozen pins must stay green unmodified |
| PRNT-04 | Metric scale-check square captioned in mm, ruler-verifiable at true 1:1 | unit (caption text) | `npx vitest run components/template/build-template-pdf.test.ts components/template/build-strip-pdf.test.ts` | ✅ — needs a new case asserting the exact `50.8 mm` caption string (D-02) and that `SCALE_SQUARE_MM`'s numeric value is untouched |

### Sampling Rate
- **Per task commit:** the narrow quick-run command above (four to five targeted test files, well under 30s)
- **Per wave merge:** `npm test` (full suite — must stay green, per the phase's success criterion 5: the frozen `template.test.ts` pins must not go red)
- **Phase gate:** Full suite green before `/gsd-verify-work`, plus the human print-preview audit (D-10) on both sheets, both paper sizes, both systems

### Wave 0 Gaps
- [ ] `lib/units-isolation.test.ts` — add a print-surface parallel to `DESIGN_SCREEN_DISPLAY_FILES` (or extend it) naming `components/summary/order-form.tsx`, `components/template/build-template-pdf.ts`, `build-strip-pdf.ts`, `build-overview-pdf.ts`, each starting `converted: false` and flipped `true` as its own plan lands — mirrors the exact mechanism Phase 6 already used, so no new test infrastructure needs inventing, only new entries
- [ ] No new fixture/golden files are needed — every expected string in this phase's tests should be DERIVED (via `formatDim`/`formatMark`/`stationLabel` calls made inside the test itself, matching `template.test.ts`'s own header comment: "every expected value below is derived... never a hand-typed... figure, per CLAUDE.md Rule 1")
- [ ] Framework install: none — Vitest is already configured and running

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Phase touches no auth surface |
| V3 Session Management | No | Phase touches no session surface |
| V4 Access Control | No | Phase touches no access-control surface |
| V5 Input Validation | Yes (narrow) | `PaperSize` stays a closed compile-time union (`"letter" \| "a4"`, `lib/geometry/template.ts:40`, verified), never a validated free string; `UnitsSystem` is likewise a closed union (`"imperial" \| "metric"`, `lib/geometry/units.ts:45`, verified) — no new free-text input is introduced by this phase |
| V6 Cryptography | No | Not applicable — no crypto surface touched |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| A units-system value silently widened from a closed union to a free string (e.g. accepting any string and defaulting unrecognised ones to Imperial) | Tampering (of display truth, not data) | Keep `UnitsSystem`/`PaperSize` as literal unions throughout; TypeScript's own exhaustiveness checking on a `switch`/ternary over these two values is the whole mitigation — no runtime validation library needed for a value that never crosses a network or storage boundary |
| A print-surface regression that silently reintroduces a raw `formatInchesFraction`/`25.4` call, bypassing the display boundary | Tampering (of the "storage never changes, display-only" guarantee, UNIT-05) | `lib/units-isolation.test.ts`'s ledger mechanism (banned-formatter grep) — extend it to the four print surfaces per this phase's Wave 0 gap, exactly as Phase 6 did for the design screens |

## Sources

### Primary (HIGH confidence — read this session)
- `lib/geometry/template.ts` (1577 lines) — full read of the tile-grid/strip-layout module, its frozen-pin-relevant exports, and its label-composing helpers
- `lib/geometry/template.test.ts` (2224 lines, partial read: lines 1-1042) — the three frozen characterisation-pin `describe` blocks and their exact digest-input construction
- `components/template/build-template-pdf.ts` (1029 lines) — full read
- `components/template/build-strip-pdf.ts` (437 lines) — full read
- `components/template/build-overview-pdf.ts` (403 lines) — full read
- `components/summary/order-form.tsx` (689 lines) — full read
- `components/summary/use-print-fit.ts` (154 lines) — full read
- `lib/geometry/measure-display.ts` (349 lines) — full read
- `lib/geometry/units.ts` (385 lines) — full read
- `lib/units-isolation.test.ts` (470 lines) — full read
- `components/units-provider.tsx` (225 lines) — full read
- `components/template/export-preview-dialog.tsx` (335 lines) — full read
- `lib/geometry/fins.ts` — targeted grep + read of `FinSummaryRow`/`FinSummaryGroup`/`family`/`fullSpreadFamily` (lines 130-165, 900-978)
- `.planning/phases/07-metric-on-paper/07-CONTEXT.md` — full read (locked decisions D-01 through D-12, Claude's Discretion, Deferred Ideas)
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/config.json` — full read for phase requirements, project history, and workflow toggles
- `vitest.config.ts`, `package.json` — read for test-collection scope and installed `jsPDF` version

### Secondary (MEDIUM confidence)
None used — no external documentation lookup was needed for this phase; every fact came from reading the repository's own source and prior-phase artifacts directly.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; every fact verified by reading `package.json` and the existing modules directly
- Architecture: HIGH — the four print surfaces and their exact call chains were read in full this session
- Pitfalls: HIGH for the frozen-pin risk (verified by reading the exact `describe` block contents and what they hash) — MEDIUM for the two Assumptions Log items, which are correct inferences from CONTEXT.md's locked decisions but not yet confirmed against a written test

**Research date:** 2026-09-06
**Valid until:** No expiry driver — this is an internal-codebase phase with no external dependency to go stale; valid until the phase's own source files are next touched by an unrelated change
