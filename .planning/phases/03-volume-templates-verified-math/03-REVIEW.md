---
phase: 03-volume-templates-verified-math
reviewed: 2026-08-28T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - .github/workflows/ci.yml
  - app/design/summary/order-form.css
  - components/outline/outline-editor.tsx
  - components/summary/order-form.tsx
  - components/template/build-overview-pdf.test.ts
  - components/template/build-overview-pdf.ts
  - components/template/build-template-pdf.test.ts
  - components/template/build-template-pdf.ts
  - components/template/export-preview-dialog.tsx
  - lib/geometry/design.test.ts
  - lib/geometry/outline.ts
  - lib/geometry/overview-layout.test.ts
  - lib/geometry/overview-layout.ts
  - lib/geometry/template.test.ts
  - lib/geometry/template.ts
  - lib/geometry/units.test.ts
  - lib/geometry/units.ts
  - package.json
  - vitest.config.ts
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-08-28
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

This phase adds the PDF export pipeline (Overview Sheet + tiled Full Template), the Wide View
toggle on the Outline screen, the order-form's Export Template entry point, and supporting
geometry (`lib/geometry/template.ts`, `lib/geometry/overview-layout.ts`) and units additions
(`squareMmToSquareInches`). `npm test` (991 tests, 19 files), `npm run lint`, and `tsc --noEmit`
all pass clean on the current tree, and the new geometry modules stay pure and heavily tested per
CLAUDE.md Rule 1 — `lib/geometry/template.ts` and `lib/geometry/overview-layout.ts` have no
React/browser/jsPDF imports, and `MEASURE_STATION_MM` was correctly hoisted to a single shared
export rather than being re-derived.

No blocking defects were found: nothing here crashes, loses data, or produces an incorrect *board*
dimension. The findings below are one genuine display bug (a confusing, untested printed label for
a real class of input), one React reconciliation issue that quietly discards component state on a
new UI toggle, one untested geometry fallback path, and a readability/hardening cleanup or two.

## Warnings

### WR-01: Overview Sheet prints a nonsensical "WP OFFSET — 0" forward/back" for a small but real widepoint offset

**File:** `components/template/build-overview-pdf.ts:166-206`

**Issue:** `overviewStationLines` decides whether to merge the CENTER and WIDEPOINT stations into
one `"WIDEPOINT / CENTER"` line using a floating-point-equality epsilon:

```ts
if (Math.abs(offset) < 1e-6) {
  return [noseTwelve, { label: "WIDEPOINT / CENTER", station: geometry.widePointStation }, tailTwelve];
}
```

`1e-6` mm is a tolerance for numerical noise (float rounding), not for "this offset prints as
zero." When the offset is small but genuinely non-zero — anywhere below roughly 1/32in
(~0.4mm), which is easily reachable by dragging the widepoint marker a tiny amount — the two
stations are kept **separate**, and `overviewWpOffsetLabelText` is called to print the
secondary label:

```ts
export function overviewWpOffsetLabelText(offset: Mm): string {
  const direction = offset > 0 ? "forward" : "back";
  return `WP OFFSET — ${formatInchesFraction(mm(Math.abs(offset)))} ${direction}`;
}
```

`formatInchesFraction` rounds to the nearest 1/16in by default, so for such an offset the
magnitude prints as `0"`, producing a printed sheet that reads:

```
WP OFFSET — 0" forward
```

— a separate WIDEPOINT line with a direction word attached to a zero magnitude, which is
confusing on a document a shaper is meant to trust. This is exactly the class of bug
`formatSignedInchesFraction` (`lib/geometry/units.ts:98-109`) already had to be fixed for once in
this same codebase — its own comment explains the fix: *"The sign is decided by what was PRINTED,
not by the raw value... normalised to 0" here rather than in that function."* `overviewWpOffsetLabelText`
reintroduces the same anti-pattern by deciding "forward"/"back" from the raw, unrounded value.

This exact boundary (a non-zero offset that rounds to `0"` at print precision, e.g.
`inchesToMm(0.015625)`) is the same value `lib/geometry/units.test.ts:80-81` already uses to prove
`formatSignedInchesFraction` handles it correctly — but no test in
`components/template/build-overview-pdf.test.ts` exercises this case for
`overviewStationLines`/`overviewWpOffsetLabelText`; the existing tests only cover exactly `0` and a
full `-1in` offset.

**Fix:** Decide the merge (and the direction word) from the *printed* magnitude, not the raw
float, e.g.:

```ts
export function overviewWpOffsetLabelText(offset: Mm): string {
  const magnitude = formatInchesFraction(mm(Math.abs(offset)));
  if (magnitude === '0"') return 'WP OFFSET — 0"';
  const direction = offset > 0 ? "forward" : "back";
  return `WP OFFSET — ${magnitude} ${direction}`;
}
```

and/or merge the CENTER/WIDEPOINT lines whenever the offset rounds to `0"` at the sheet's own
display precision, rather than at `1e-6` mm — matching the semantics the `"merges into one
WIDEPOINT / CENTER line when the offset is zero"` test already documents.

### WR-02: Toggling Wide View remounts the entire viewer/export-dialog subtree

**File:** `components/outline/outline-editor.tsx:144-266, 321-329`

**Issue:** `viewerContent` is pulled into a variable specifically so wide view can "swap out the
chrome AROUND this content — not the content itself" (the comment at line ~140). But the two
branches that render it wrap it in structurally different parents:

```tsx
{wideView ? (
  <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-surf-line bg-surf-panel p-1">
    {viewerContent}
  </div>
) : (
  <TabbedPanel tabs={[{ id: "viewer" as const, label: "VIEWER" }]} active="viewer">
    {viewerContent}
  </TabbedPanel>
)}
```

`TabbedPanel` (a component, rendering a `<>` fragment with a tab strip plus two nested `div`s —
see `components/viewer/tabbed-panel.tsx:62-113`) and a plain `div` are different element types at
the same tree position. React's reconciler unmounts and remounts the whole subtree whenever the
element type at a given position changes between renders — sharing the same `viewerContent`
JS object reference does not prevent this. So every time a shaper clicks Wide View, `OutlineViewer`,
the rotate/construction/export buttons, and `ExportPreviewDialog` are all destroyed and rebuilt
from scratch: any in-flight drag, hover state, focus ring, or CSS transition inside that subtree is
silently discarded, and the SVG drawing does a full remount rather than a smooth re-layout.

**Fix:** Keep the same element type wrapping `viewerContent` in both branches (e.g. always render
inside the same host `div`, and conditionally render the tab strip above it / vary only the
`panelClassName`/padding), so React can diff attributes instead of tearing down and rebuilding the
subtree. If `TabbedPanel`'s chrome is only needed for the non-wide-view case, consider giving
`TabbedPanel` a `bare`/`hideChrome` mode instead of branching the wrapper element itself.

### WR-03: `nameBlockPlacement`'s fallback can position the name/dims box outside page 0's printable range

**File:** `lib/geometry/template.ts:647-677`

**Issue:** When no station band on page 0 is wide enough to hold the name+dims box at its real
size (the "unusually narrow-nosed board" case the comment names), the function falls back to:

```ts
const fallbackTop = Math.max(searchFloor + boxHeightMm, searchCeiling);
return { pageIndex: page.index, topStation: mm(fallbackTop), halfWidthStart };
```

If `searchFloor + boxHeightMm > searchCeiling` (i.e. the box is taller than the entire available
band on page 0), `fallbackTop` exceeds `searchCeiling`, which is `page.stationRange[1]` (clamped to
`geometry.length`) — the page's own nose-most printable edge. The returned `topStation` (and
therefore the box drawn by `drawNameBlock` in `build-template-pdf.ts`) can then sit partly or
fully past the page's own printable station range, i.e. off the sheet or overlapping content it
was supposed to avoid.

This path is not covered by any test — every `BOARD_PRESETS` case (the only inputs exercised in
`lib/geometry/template.test.ts` / `build-template-pdf.test.ts`) has a wide enough nose that the
normal search always succeeds, so the fallback is entirely unverified.

**Fix:** Clamp the fallback to the page's own bounds (e.g. `Math.min(fallbackTop, searchCeiling)`,
accepting that the box may then be taller than the available band rather than run off the page),
and add a regression test for a deliberately narrow-nosed custom outline that forces this branch.

### WR-04: Broken JSX indentation around the order form's drawings row

**File:** `components/summary/order-form.tsx:279-434`

**Issue:** The block containing the rail-section plots, the rocker placeholder, and the Color
Design & Logos panel has drifted out of alignment with the surrounding JSX — for example lines
307-317 sit flush-left instead of nested under the `flex-[2]` column div opened at line 308, and
the closing tags from line 429 onward step back unevenly. The nesting is still structurally
balanced (verified by counting open/close tags), so this doesn't change behavior, but the
indentation no longer reflects the actual DOM nesting, which makes the block materially harder to
read and increases the chance a future edit closes the wrong element.

**Fix:** Re-run the formatter (or manually re-indent) this block so indentation matches nesting
depth.

## Info

### IN-01: CI workflow does not set explicit least-privilege `permissions:`

**File:** `.github/workflows/ci.yml:1-27`

**Issue:** The workflow has no top-level `permissions:` block, so the `GITHUB_TOKEN` used by
`actions/checkout` and `actions/setup-node` gets whatever the repository's default token
permissions are (which can be broader than `read` depending on org/repo settings). This workflow
only checks out code, installs dependencies, and runs test/lint/build — it never needs write
access to contents, issues, PRs, or packages.

**Fix:** Add an explicit least-privilege block, e.g.:

```yaml
permissions:
  contents: read
```

### IN-02: `templateFileName` and `overviewFileName` duplicate identical slugify logic

**File:** `components/template/build-template-pdf.ts:745-755`, `components/template/build-overview-pdf.ts:371-382`

**Issue:** Both functions implement the same `trim → lowercase → replace non-alphanumerics with
`-` → strip leading/trailing `-`` slug rule, with a different fixed suffix (`-template.pdf` vs.
`-overview.pdf`). The duplication is called out and justified in `build-overview-pdf.ts`'s own
comment ("kept as a sibling function rather than an import so this module's download naming
doesn't reach into the tiled template's own file for a one-line string transform"), which is a
reasonable call, but it does mean a future change to the slug rule (e.g. handling of unicode board
names) has to be made in two places to stay consistent.

**Fix:** No action required given the documented rationale; consider a tiny shared
`slugifyBoardName` helper (e.g. in `lib/geometry/units.ts` or a small `lib/text.ts`) if the rule
ever needs to change, so the two file-naming functions can't drift apart silently.

---

_Reviewed: 2026-08-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
