---
phase: 07-metric-on-paper
reviewed: 2026-09-06T23:16:15Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - CLAUDE.md
  - app/design/summary/order-form.css
  - components/summary/dimension-fit.test.ts
  - components/summary/dimension-fit.ts
  - components/summary/order-form.tsx
  - components/template/build-overview-pdf.test.ts
  - components/template/build-overview-pdf.ts
  - components/template/build-strip-pdf.test.ts
  - components/template/build-strip-pdf.ts
  - components/template/build-template-pdf.test.ts
  - components/template/build-template-pdf.ts
  - components/template/export-preview-dialog.tsx
  - lib/geometry/measure-display.test.ts
  - lib/geometry/measure-display.ts
  - lib/geometry/template.test.ts
  - lib/geometry/template.ts
  - lib/geometry/units.test.ts
  - lib/geometry/units.ts
  - lib/units-isolation.test.ts
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-09-06T23:16:15Z
**Depth:** standard
**Files Reviewed:** 18 (CLAUDE.md read as project context, 18 source/test files reviewed)
**Status:** issues_found

## Summary

Phase 7 wires the shaper's chosen units system into the four print surfaces (Overview Sheet,
Full Sized Template, Paper Saver, Summary order form). I read every file in scope end to end,
cross-checked the mm/cm "dims vs marks" family rule at every call site, verified the imperial
branch of each new function reduces to the byte-identical formatter it replaced, and confirmed
the frozen characterisation pins in `lib/geometry/template.ts` never see a metric branch (D-01
is upheld: the scale square stays a literal `inchesToMm(2)` in both systems, and no geometry
function takes a `system` parameter — only text composition does).

This is a well-built phase. Every defaulted `system: UnitsSystem = "imperial"` parameter in
`lib/geometry/template.ts` is proven load-bearing by `lib/units-isolation.test.ts`'s
`no production call site is silently imperial by omission` describe block, and I traced that
regex-based guard by hand — it correctly requires the word `system` on the same source line as
each defaulted-function call, and every real call site in the three jsPDF builders does supply
it. I independently re-derived several of the D-01/D-02/D-06/D-07 worked examples (the `50.8 mm`
calibration caption, the `914 mm from tail — rail 273 mm` registration line, the name block's
`cm`-once dims row) against the source and they match. Imperial byte-identity holds everywhere I
checked: every imperial branch calls the pre-existing formatter (`formatInchesFraction`,
`formatFeetInches`) with no new logic in between, and the test suites assert this directly for
every changed call site.

I did find one real, unverified risk in the "nothing physical moved" success criterion, which I
substantiated by running the actual code against the shipped presets (details below) — it did not
reproduce a live failure on any of the app's presets, but it is a genuine, untested gap in a class
of defect (page-0 furniture escaping the outline or overlapping) that this exact module has had to
fix repeatedly in its own commit history. See WR-01.

## Warnings

### WR-01: Full Sized Template's page-0 furniture containment/overlap is untested in Metric, and the name-block box height is provably system-dependent

**File:** `components/template/build-template-pdf.test.ts` (missing coverage), production code at
`components/template/build-template-pdf.ts:729-772` (`nameBlockContent`, `resolvePageZeroFurniture`)

**Issue:** The Full Sized Template's page-0 furniture — the board name + dims block, the how-to
box, and the 2in scale square — has an extensive, hard-won set of containment/overlap tests
(`page-0 furniture never overlaps`, `page-0 furniture is fully inside the alignment box`, `name
block containment`, `templateHowToBoxPlacement / howToBoxRect`, `templateScaleSquarePlacement /
scaleSquareRect`). Every one of these describe blocks builds its options via `buildOptions` /
`buildOptionsFor` / `buildOptionsForOutline`, all of which hardcode `system: "imperial" as const`.
I grepped the whole file for `"metric"` and confirmed none of the containment/overlap assertions
ever run against a Metric options object.

This matters because `nameBlockContent(doc, dims, system)` wraps `templateNameBlockDimsText`'s
output to the box's own inner width, and the wrapped *line count* — which directly drives the
box's height, which in turn drives `nameBlockPlacement`'s search and (via the `interior` fallback
branches) `howToBoxPlacement`'s and `scaleSquarePlacement`'s own placement — depends on the actual
string lengths, which differ between systems. I verified this is not a hypothetical concern by
running the real functions against every shipped preset:

```
shortboard  imperial: 3 lines / 25.6mm   metric: 2 lines / 21.4mm
fish        imperial: 3 lines / 25.6mm   metric: 2 lines / 21.4mm
midlength   imperial: 3 lines / 25.6mm   metric: 2 lines / 21.4mm
longboard   imperial: 3 lines / 25.6mm   metric: 3 lines / 25.6mm
```

For the four shipped presets and the three wide/edge-case variants the how-to-box tests use
(`widest-shortboard`, `widest-longboard`, `fullnose-longboard`), Metric's box is always the same
height or shorter than Imperial's, so containment happens to hold today (I checked — see below).
But nothing proves that direction generally: `howToBoxPlacement`'s and `scaleSquarePlacement`'s
own "last resort" fallback branches are documented as "does not prove containment — only that the
box stays on the sheet," and are reached whenever no station band clears the required half-width.
A future preset, an unusually long board name interacting with the dims row's own wrap width, or a
future change to the metric number formatting (e.g. widening a field) could push a Metric board's
name-block box taller than its Imperial counterpart and into that unproven fallback — exactly the
class of defect this file's own comments record fixing three separate times already (post-checkpoint
defects 3 and 4, quick tasks 260903-18d/fqv/h7t all exist because furniture escaped the outline or
overlapped on some board). This is the phase's own stated success criterion 5 ("nothing on paper
moved," specifically no printed furniture escaping the curve or overlapping) with zero automated
coverage in the one system it was added for.

I confirmed empirically (via a throwaway probe test, not committed) that all four shipped presets
and all three wide/edge variants pass containment in Metric today, at both paper sizes — so this is
a coverage gap, not a currently-reproducing bug.

**Fix:** Parametrize the existing containment/overlap describe blocks in
`build-template-pdf.test.ts` over both systems (`for (const system of ["imperial", "metric"] as
const)`), the same way `build-strip-pdf.test.ts` and `build-overview-pdf.test.ts` already do for
their own system-dependent text. At minimum, add one Metric run of `page-0 furniture never
overlaps` / `page-0 furniture is fully inside the alignment box` / `templateHowToBoxPlacement` /
`templateScaleSquarePlacement` across `BOARD_PRESETS` and `WIDE_TEMPLATE_CASES`, mirroring the
existing Imperial-only `it.each` blocks:

```ts
for (const system of ["imperial", "metric"] as const) {
  it.each(BOARD_PRESETS)(`$id (letter, ${system}): no two furniture rectangles overlap`, (preset) => {
    const options = { ...buildOptions("letter"), boardName: preset.name, system };
    const rects = templatePageZeroFurnitureRects(options);
    // ...existing overlap assertions...
  });
}
```

### WR-02: `templateNameBlockDimsText`'s Metric Offset composition strips a unit suffix by regex rather than calling a bare formatter

**File:** `components/template/build-template-pdf.ts:713-714`
**Issue:**
```ts
const signedOffset = formatSignedDim(dims.widePointOffset, system);
const offsetText = system === "metric" ? signedOffset.replace(/ cm$/, "") : signedOffset;
```
This works correctly today only because `formatSignedDim`'s metric branch always terminates in a
literal `" cm"` (verified in `lib/geometry/measure-display.ts:98-105` and its tests). It is the
only place in the four print surfaces that derives a "bare" value by stripping a known suffix from
a unit-suffixed formatter's output, rather than calling a dedicated bare formatter the way every
other bare value in this same dims row does (`formatDimBare` for Length/Nose/Widepoint/Tail). If
`formatSignedDim`'s metric spacing or unit ever changes (e.g. a locale-driven `5.1cm` with no
space, or a future non-ASCII unit), this regex silently stops matching and a stray `" cm"` would
appear mid-sentence in the name block's running dims text — a defect that would only surface on a
printed page, since no test currently exercises the suffix format changing.

**Fix:** Add a `formatSignedDimBare` to `lib/geometry/measure-display.ts`, mirroring
`formatDimBare`'s relationship to `formatDim`, and call it here instead of stripping a suffix by
regex:
```ts
export function formatSignedDimBare(value: Mm, system: UnitsSystem): string {
  if (system === "metric") {
    const printed = formatCentimetres(value);
    if (printed === "0.0" || printed === "-0.0") return "0";
    return printed.startsWith("-") ? printed : `+${printed}`;
  }
  return formatSignedInchesFraction(value);
}
```

## Info

### IN-01: `computeStripFurniture`'s dynamically-computed name-box height diverges from the frozen pin's fixed constant, without a comment cross-referencing the gap

**File:** `components/template/build-strip-pdf.ts:323-339`, `lib/geometry/template.test.ts:220-224`
**Issue:** The frozen characterisation pin (`quick task 260902-kon`) computes the strip's own name
block placement using a fixed `nameBoxHeightMm: NAME_BOX_HEIGHT_MM` (20mm, imperial-era single-line
height). Production code (`computeStripFurniture`) instead derives the real height from
`nameBlockContent(doc, dims, system).height`, which — per WR-01 above — can be 21.4mm–25.6mm
depending on system and preset. This divergence is orthogonal to the frozen pin's own stated scope
(it explicitly only pins the scale square's literal numbers, not the name block, per its own doc
comment), so it isn't a defect in the pin itself, but it means the Paper Saver's own name-block
placement scan (`scanPagesForNameBlock`) is — like the tiled template's — never exercised in the
test suite against a Metric-sized box height in a containment-focused test.
**Fix:** No code change required; consider extending `build-strip-pdf.test.ts`'s existing
containment tests (`stripFurnitureRects`) to run over both systems for the same reason given in
WR-01, since the same class of latent risk applies here.

---

_Reviewed: 2026-09-06T23:16:15Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
