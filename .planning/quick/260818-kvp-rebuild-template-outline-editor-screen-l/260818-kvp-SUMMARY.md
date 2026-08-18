---
phase: quick-260818-kvp
plan: 01
subsystem: geometry-and-outline-editor
tags: [geometry, units, outline, svg, next-app-router, tailwind-v4, shadcn]
status: complete
dependency-graph:
  requires: []
  provides:
    - lib/geometry/units.ts (Mm/Degrees/Litres brands, inch<->mm conversion, imperial formatting/parsing)
    - lib/geometry/board.ts (Point2D, BezierSegment, OutlinePoint, TailShape union, OutlineSpec, BoardSpec, DEFAULT_BOARD_SPEC, TAIL_PRESETS)
    - lib/geometry/outline.ts (buildOutline, sampleOutline, OutlineGeometry)
    - /design/outline screen (outline editor: sidebar controls + live SVG viewer)
  affects:
    - app/page.tsx (redirects to /design/outline)
    - app/globals.css (adds outline-* theme tokens)
tech-stack:
  added:
    - vitest@4.1.11 (dev dependency, prescribed by project stack constraint)
    - shadcn-generated components: slider, select, checkbox, card, label, separator (via `npx shadcn add`, no new npm package)
  patterns:
    - Branded Mm/Degrees/Litres number types; math functions only ever consume/return branded types, inches convert at the UI boundary
    - Single BoardSpec { outline } state object in the editor, extended (not reshaped) by later screens
    - Geometry golden-tested against an extracted, executed copy of the prototype's own math (never hand-transcribed)
key-files:
  created:
    - lib/geometry/units.ts
    - lib/geometry/units.test.ts
    - lib/geometry/board.ts
    - lib/geometry/outline.ts
    - lib/geometry/outline.test.ts
    - lib/geometry/__fixtures__/prototype-outline-golden.json
    - scripts/extract-prototype-golden.mjs
    - vitest.config.ts
    - app/design/outline/page.tsx
    - components/outline/outline-editor.tsx
    - components/outline/outline-controls.tsx
    - components/outline/outline-viewer.tsx
    - components/outline/tail-shape-icon.tsx
    - components/ui/slider.tsx
    - components/ui/select.tsx
    - components/ui/checkbox.tsx
    - components/ui/card.tsx
    - components/ui/label.tsx
    - components/ui/separator.tsx
  modified:
    - package.json (test/test:watch/golden scripts, vitest devDependency)
    - app/page.tsx (redirect to /design/outline)
    - app/globals.css (outline-* palette tokens)
decisions:
  - "Axis swap done once at the port boundary (prototype [y,x] station/halfWidth -> named station/halfWidth fields), verified by golden parity across all 8 fixtures rather than by inspection"
  - "Diamond-depth clamp, tail-block pinning, and centre-close-station rules are driven by the TailShape discriminated union instead of loose string+field state"
  - "Outline palette added as outline-* prefixed CSS custom properties (own namespace) rather than overwriting the shadcn neutral --accent/--sidebar-* tokens, so future non-outline UI is unaffected"
  - "Tail-shape button grid built as native styled <button> elements rather than the shadcn Button primitive — the glyph-icon grid's dark/accent toggle states don't map cleanly onto Button's variant system"
metrics:
  duration: ~2.5 hours
  completed: 2026-08-18
actuals:
  tokens: 27805
  tasks: 3
  commits: 3
---

# Quick Task 260818-kvp: Rebuild Template Outline Editor Screen (Live) Summary

Ported the Claude Design prototype's Template Builder outline engine into a pure-TypeScript, metric, unit-tested `lib/geometry` module and rebuilt it as the first real screen of the app at `/design/outline`, with golden tests that reproduce the prototype's own math (not hand-typed reference numbers) to within 1e-6 inch across 8 fixture boards.

## What Was Built

**Task 1 — Vitest harness + units boundary** (`lib/geometry/units.ts`): Branded `Mm`/`Degrees`/`Litres` number types, `mmToInches`/`inchesToMm`, `formatInchesFraction` (ported from the prototype's `toFrac`, including fraction reduction and carry-to-whole-inch), `formatFeetInches` (rounds to 1/16 before splitting feet/inches to avoid millimetre round-trip drift printing `5'11 15/16"` instead of `6'0"`), `parseImperial`, and `cubicMmToLitres`. 21 Vitest cases.

**Task 2 — Outline geometry engine** (`lib/geometry/board.ts`, `lib/geometry/outline.ts`): `buildOutline(spec: OutlineSpec): OutlineGeometry` ported statement-for-statement from the prototype's `buildGeometry` (reference/project/Template.dc.html lines 505-623), with the axis swap (prototype `[y,x]` -> named `station`/`halfWidth`), the four unit-carrying constants converted through `inchesToMm`, and tail rules driven by the `TailShape` discriminated union. `scripts/extract-prototype-golden.mjs` extracts and *executes* the prototype's own `buildGeometry` (brace-matched out of the reference HTML, never hand-copied) to produce `lib/geometry/__fixtures__/prototype-outline-golden.json` — 8 fixture boards, each sampled every 3 inches along the whole curve. 105 Vitest cases covering golden parity, invariants, tail-shape clamps (diamond depth cap, pin/round pinning, swallow centre-close), and the widepoint-station margin clamp.

**Task 3 — Outline editor screen** (`components/outline/*`, `app/design/outline/page.tsx`, `app/page.tsx`, `app/globals.css`): A client component (`OutlineEditor`) owns a single `BoardSpec` in state, derives `OutlineGeometry` via `useMemo`, and passes it to a sidebar (`OutlineControls`, reproducing the prototype's Board Length / Nose / Widepoint / Tail Controls sections with disabled/pinned/clamped rules) and a live SVG viewer (`OutlineViewer`, reproducing the prototype's scale math, reference lines, de-overlapping callouts, and construction-line overlay). `TailShapeIcon` ports the prototype's Catmull-Rom glyph generator for the five tail-shape buttons. The root route redirects to `/design/outline`.

## Deviations from Plan

None — plan executed as written. Minor implementation choices (documented above under `decisions`) were made within the plan's explicit fallback allowances:

1. **[Native fallback within plan's own allowance] Tail-shape button grid uses native `<button>` elements, not the shadcn `Button` primitive.** The plan's Task 3 action explicitly permits "If a component is unavailable in the registry for this style, fall back to a native HTML control styled with Tailwind rather than adding a new package." `Button` *was* available and generated, but its variant system (default/outline/secondary/ghost/destructive) doesn't express the prototype's dark-sidebar/accent-toggle glyph-button look without fighting the component's built-in classes, so a plain styled `<button>` was used instead — consistent with the spirit of the plan's fallback clause. No new package was added either way.
2. **Sliders and the feet/inches selects use the shadcn `Slider`/`Select` primitives** (built on `@base-ui/react`), which have a different API shape than a native `<input type="range">`/`<select>` (value/onValueChange rather than value/onChange with a DOM event). This added integration work but matches the plan's explicit instruction to add and use these primitives.
3. **`components/ui/card.tsx`, `label.tsx`, `separator.tsx` were generated per the plan's Task 3 step 1 but are not yet wired into any component.** The Template Viewer panel, section headings, and control labels were built as plain styled `div`s that already match the prototype's exact visual structure; these three shadcn primitives remain available in the codebase for future screens (rocker, rail, fin, volume) to adopt without needing to re-run `npx shadcn add`.

## Verification

- `npm test`: 126/126 passing (21 units cases + 105 outline cases — golden parity, invariants, tail-shape rules, widepoint clamp).
- `node scripts/extract-prototype-golden.mjs`: regenerates `lib/geometry/__fixtures__/prototype-outline-golden.json` from `reference/project/Template.dc.html` with **zero diff** against the committed fixture, confirming the golden values still come from the reference implementation, not from a stale or hand-edited copy.
- `npm run build`: compiles with zero TypeScript errors (including test files, which tsconfig's `include` covers), produces static routes for `/`, `/_not-found`, and `/design/outline`.
- Runtime smoke check: started the dev server and fetched `/` (307 redirect to `/design/outline`) and `/design/outline` (200), confirming the rendered HTML contains "Template Builder", "Tail @ 12", "Nose @ 12", "Widepoint", the default squash tail selection, and the default board length `6'0"` — with no compile or runtime errors in the dev server log.
- Interactive browser click-through (dragging sliders, clicking tail-shape buttons, toggling construction lines) was **not** performed in this run per the execution constraint to verify only via `npm test` and `npm run build`; the plan's `<human-check>` step is available for founder review via `npm run dev`.

## Known Stubs

None. All controls read from and write to the single `BoardSpec` state object; nothing renders a hardcoded empty value or placeholder text.

## Threat Flags

None beyond what the plan's threat model already covers (T-QO-01 SVG rendering, T-QO-02 input clamping, T-QO-03 dev-time-only golden extractor, T-QO-SC package provenance) — all three mitigations were implemented as specified: no string-built SVG markup or `dangerouslySetInnerHTML`/`document.write`/`window.open`; every slider/select handler clamps to its documented range and rejects non-finite values before writing to state; the golden extractor only ever runs via `npm run golden` at development time; `npm ls vitest` confirmed the official package and `git diff package.json` showed only the expected single dependency line.

## Self-Check: PASSED

Verified below.
