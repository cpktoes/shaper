# Project Research Summary

**Project:** Shaper — milestone v1.2 "Rails Finished, Phone Ready"
**Domain:** Surfboard design web app (2D calculators + printable templates); subsequent milestone on a shipped Next.js 16 / React 19 / Tailwind v4 app
**Researched:** 2026-09-07
**Confidence:** HIGH

## Executive Summary

v1.2 adds two unrelated things to a working app: it finishes the rails screen the prototype always had (an INSTRUCTIONS tab, an option to print that sheet, a 1:1 "View Full Sized" view of the rail cross-section, and a plan/side reference showing where each rail section sits on the board), and it makes every screen usable on a phone, touch-first. The four research passes converge on one headline: **neither half needs a new runtime dependency.** Touch drag is already solved in this codebase — `components/outline/outline-viewer.tsx` and `rocker-viewer.tsx` use Pointer Events with `setPointerCapture` and `touch-action: none`, which is the exact pattern to reuse. Responsive layout is Tailwind v4's built-in breakpoints and container queries. The only addition is a dev dependency, `@playwright/test`, which the build guide already prescribes and which this milestone finally justifies because its deliverable (touch on a real viewport) is something Vitest cannot exercise.

The second headline corrects the milestone's own premise. PROJECT.md originally said the INSTRUCTIONS example rail needs a `halveDeckMark1` geometry variant. It does not: the prototype passes that flag once, at the call site on `reference/project/Rails.dc.html` line 1359, and `computeSection`'s parameter list on line 704 never reads it — so it has no effect in the prototype either. This was verified independently by the orchestrator, and PROJECT.md has been corrected. **No new geometry math is needed**; the existing `computeRailSection` already produces the example rail as the prototype drew it. What Rule 1 still requires is a new golden-fixture entry for the example rail's inputs (extracted from the prototype by `scripts/extract-prototype-rails-golden.mjs`, never hand-typed) and a test that pins it. Where FEATURES.md and PITFALLS.md still describe `halveDeckMark1` as a gating variant or ask for a differential test, they predate this verification — treat the finding here as settled.

The main risks are integration risks, not novelty. The aside+main shell is duplicated in five editor files with zero breakpoints, so phone layout must be built once in an extracted shell, not patched five times. The order form's print output is ruler-true and was proven byte-identical in v1.1, so the new instructions sheet must attach to the order form's existing reference page (live React under `@media print`), not the jsPDF builders, and must be proven not to change the toggle-off output. On phones, the known iOS traps are all present today — `h-full`/`overflow-hidden` viewport chains, a 14px `measure-field` that triggers input zoom, missing `select-none`/`-webkit-touch-callout`, and hit targets that shrink as the viewer narrows. Each has a cheap, known prevention.

## Key Findings

### Recommended Stack

Nothing new at runtime. Touch dragging copies the existing Pointer Events pattern; layout uses Tailwind v4's CSS-first `@theme` breakpoints (already in `app/globals.css`) and built-in `@container` queries; Base UI's Slider, Dialog and Tabs already handle touch (its 2026 changelog shows active touch fixes) and only need hit-target sizing in this repo's `components/ui/*` wrappers. Next.js 16's `Viewport` export (`viewportFit`, `interactiveWidget` — verified in the installed `.d.ts`) is currently absent from `app/layout.tsx` and should be added once. The 1:1 view needs no library: CSS `mm`/`in` units are spec-defined at 96 CSS px per inch, honest on the vast majority of phones and laptops, and wrong only under browser zoom or a misreported external monitor — exactly why the milestone scopes out calibration.

**Core technologies:**
- Native Pointer Events + `touch-action: none` + `setPointerCapture`: touch drag on SVG handles — already in production in this repo; a gesture library would be redundant
- Tailwind v4 breakpoints and `@container` queries: stacking the shell on phones — built into core, no plugin, no `tailwind.config.js`
- `@playwright/test ^1.63.0` (dev only) with `devices['iPhone 13']` / a Pixel profile: proving touch drag, responsive collapse and the full-size modal on emulated phone viewports — prescribed by the build guide, unblocked by this milestone
- CSS absolute units computed once through `lib/geometry/units.ts`: the "View Full Sized" 1:1 rendering — never multiply by `devicePixelRatio`, never inline 25.4 or 96 in a component

See STACK.md for the explicit "What NOT to Use" table (gesture libraries, the v3 container-queries plugin, UA-sniffing layout libraries, a calibration flow, swapping Base UI for Radix, any E2E framework other than Playwright).

### Expected Features

Comparable tools split into "phone is view-only" (Figma mobile, AkuShaper's approval link) and "phone is a first-class touch surface" (Procreate, and the directly relevant iShaper, a phone-native surfboard designer). Shaper's "every screen works end to end" puts it in the second camp, which is achievable because its editors are controlled-vocabulary curves of 5–9 stations, not open canvases. Every draggable point already has a slider and a typed field for exact numbers, so touch drag only has to be good enough to shape by eye.

**Must have (table stakes):**
- Touch-sized controls (44px-class targets) across sign-in, presets, rack, all five design screens and the summary — users expect this
- Responsive layout on every screen, viewers filling the phone screen — a screen that doesn't reflow reads as broken
- Direct touch drag on outline/rocker/foil points with correctly sized, non-overlapping hit zones (today's `DRAG_HIT_PX = 15` gives a 30px target, under the guideline)
- The INSTRUCTIONS tab as a third tab beside VIEWER and DATA, following the technical-drawing convention of a legend next to the working view
- An "Include Rail Band Instructions in Print" checkbox matching the app's existing print-option pattern, in the shaper's chosen units

**Should have (competitive):**
- "View Full Sized" 1:1 rail cross-section on screen — no surfboard competitor found offers an unprinted to-scale reference
- The plan/side reference view with legend checkboxes — shows *where* a number applies, reinforcing the core value
- The Flat/Domed toggle on the live example rail — turns a legend into a teaching tool

**Defer (v2+):**
- Pinch-zoom/pan on the viewers — imports gesture-conflict bugs to solve a problem fill-the-screen sizing already solves; the ARCHITECTURE.md build order lists it, FEATURES.md rules it out, and the milestone brief asked for viewers that fill the screen, so it stays out of v1.2
- A magnifier/loupe or drag-with-offset — the slider/typed path already covers precision
- A calibrated (credit-card) actual-size view — the printed template already carries the ruler-true guarantee
- A reduced "view-only" phone mode — contradicts the milestone's requirement

### Architecture Approach

Every integration point is a real file. The aside+main layout is duplicated in `outline-editor.tsx`, `rocker-editor.tsx`, `rail-band-editor.tsx`, `fin-placement-editor.tsx` and `volume-estimator.tsx` with no shared component; the codebase's own `TabbedPanel` doc comment already warns about this drift, so the first phone step is extracting a `DesignScreenShell`, desktop-pixel-identical, and adding the phone breakpoint there once. The rails screen's tabs are a `RailPage` union plus local `useState` rendered through `TabbedPanel`, so a third tab is a contained addition. Two print pipelines exist — the order form's CSS-print DOM (`components/summary/order-form.tsx`, whose page 2 already renders `RailSectionPlot` and `RailDataTable` as "the shaper's reference") and the jsPDF builders under `components/template/` — and the instructions sheet belongs on the former, reusing the same React component built for the tab. The print toggle is set on the rails screen and read on the summary screen, so it is cross-screen state and belongs on the shared design store, with "persist with the board or keep it ephemeral" left as a product decision. The 1:1 modal uses `components/ui/dialog.tsx` and its own copy of `use-print-fit.ts`'s live-probe px-per-inch measurement, following that file's deliberate-duplication convention.

**Major components:**
1. `components/design/design-screen-shell.tsx` (NEW) — the one place the aside+main layout lives and the one place phone stacking lands
2. `components/rails/rail-instructions.tsx` (NEW) + an optional `callouts` prop on `rail-section-plot.tsx` — the INSTRUCTIONS tab, reused verbatim on the order form's reference page
3. `components/rails/rail-board-outline-plot.tsx` (NEW) — ports `buildBoardOutlinePlot`, `planRefPaths`, `sideRefPaths` and the legend checkboxes, reading outline state from the shared design store; background PNG moved to `public/`
4. `components/rails/view-full-sized-modal.tsx` (NEW) — Base UI Dialog rendering the section at physical CSS units with a plain-English zoom caveat
5. `scripts/extract-prototype-rails-golden.mjs` + `lib/geometry/rail-bands.test.ts` (MODIFIED) — a `howToRead` fixture entry executed from the prototype's own `computeSection`; `lib/geometry/rail-bands.ts` itself is untouched
6. `app/layout.tsx`, `components/site-nav.tsx`, `components/ui/slider.tsx`, `components/design/measure-field.tsx`, the outline/rocker viewers (MODIFIED) — `dvh` root, `viewport` export, touch sizing, 16px inputs, `select-none`
7. `components/template/*` — NOT touched; the jsPDF builders stay exactly as v1.1 proved them

### Critical Pitfalls

1. **Fixing the layout five times** — extract the shell first; add the breakpoint once. A phone layout that "works" by hiding a control is a regression, not a fix: every desktop-reachable control needs a phone-reachable equivalent.
2. **Breaking the ruler-true print output** — attach the instructions sheet to the order form's per-sheet-fitted page 2, never to the jsPDF builders; prove the toggle-off output byte-identical using Phase 7's PDF-diff method before calling it done. Do not copy the prototype's `zoom:0.74` constant.
3. **Porting the prototype's dead flag as a feature** — `halveDeckMark1` is inert in the reference; add no parameter for it. Regenerate the golden fixture from the prototype's executed code; never hand-transcribe the example rail's numbers.
4. **iOS specifics that are all present today** — `100vh`/`h-full` chains clip under Safari's toolbar (use `dvh` once at the root); `measure-field.tsx`'s 14px text triggers zoom-on-focus (16px on touch); missing `select-none`/`-webkit-touch-callout: none` lets the long-press callout fire mid-drag; `touch-action: none` must cover the gesture surface, not just the hit circle.
5. **Regressing desktop while adding touch** — do not duplicate mouse handlers beside pointer handlers; keep the single Pointer Events path and run a manual desktop-mouse pass on every viewer touched, plus a keyboard/screen-reader spot check on every new control.

## Implications for Roadmap

Phase numbering continues from v1.1 (Phases 5–7), so v1.2 starts at Phase 8. The two halves share almost no risk and could run in either order; rails first is recommended because it is the smaller, more contained port, gives an early visible win, and means the final phone sweep covers the new rails surfaces too.

### Phase 8: The Rails Screen, Finished
**Rationale:** A faithful port from an in-repo prototype with every integration point already located; independent of the shell refactor, so it can't be blocked by phone work.
**Delivers:** The INSTRUCTIONS tab (live example rail, named callouts, Flat/Domed toggle) with its background art moved to `public/`; a `howToRead` golden-fixture entry and test; the plan/side reference view with legend checkboxes; "View Full Sized" at 1:1 with an honest caveat; the "Include Rail Band Instructions in Print" toggle on the shared store, rendered on the order form's reference page, obeying the v1.1 units rules.
**Addresses:** Every rails item in the FEATURES.md launch list.
**Avoids:** Pitfalls 9–14 — dead-flag porting, hand-typed fixtures, coordinate-system drift in the ported SVGs, the print-pipeline choice, print regression, and the 1:1 honesty caveat. Verification: `npm test` and a `npm run golden` diff showing the new entry; the toggle-off PDF re-diff; a side-by-side of the plan/side view against the prototype.

### Phase 9: The Design Screens on a Phone
**Rationale:** Everything phone-related depends on the shared shell and the root viewport fix existing first; the five design screens are where touch drag lives, so they are the hard half.
**Delivers:** `DesignScreenShell` extracted (desktop pixel-identical) and stacking below the breakpoint; `dvh` root and the `viewport` export; touch-sized sliders, buttons and tabs; enlarged, spacing-checked hit zones on the outline, rocker and foil points; 16px inputs; `select-none` and callout suppression on the viewers; Playwright installed with phone device profiles and a first touch-drag test.
**Uses:** Native Pointer Events, Tailwind v4 breakpoints/container queries, `@playwright/test`.
**Implements:** Components 1 and 6 above.

### Phase 10: The Whole App on a Phone
**Rationale:** The remaining screens (sign-in, setup and presets, the rack, the summary and order form, the site nav) are breadth work on standard patterns, and the end-to-end sweep only means something once Phases 8 and 9 have landed.
**Delivers:** Every remaining screen reflowing and touch-sized; safe-area handling wherever a control is bottom-anchored; a full sign-in → preset → rack → design → save → summary pass on a real iPhone and a real Android phone, plus a desktop-mouse regression pass and an accessibility spot check.

### Phase Ordering Rationale

- Rails work touches `rail-band-editor.tsx` (new tab) before the shell extraction rewrites the same file's layout; doing them sequentially avoids a merge of two large edits to one file.
- The shell extraction and the root `dvh`/viewport fix are prerequisites for every other phone change, so they open Phase 9 rather than being scattered.
- Print integration is sequenced after the INSTRUCTIONS component exists because it reuses it — building the sheet first would mean building it twice.
- The final sweep sits last so it exercises the new rails surfaces on a phone as well as the retrofitted ones.

### Research Flags

Phases likely needing deeper research or discussion during planning:
- **Phase 8:** two product decisions for discuss-phase — whether the print toggle defaults on (the prototype's default) or off, and whether it persists with the saved board or stays a session preference; the "View Full Sized" caveat wording; the exact plan/side coordinate port needs a visual side-by-side against the prototype.
- **Phase 9:** a measurement pass on station spacing to confirm 44px hit zones don't overlap on the outline/rocker/foil curves; real-device checks (DevTools emulation misses the iOS callout, sticky hover and toolbar behaviour); which screens gain bottom-anchored controls decides the safe-area CSS.

Phases with standard patterns (skip research-phase):
- **Phase 10:** Clerk's prebuilt sign-in UI, shadcn cards and Tailwind breakpoints are all documented, well-trodden patterns; the work is breadth, not novelty.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against this repo's installed packages, Next 16's `.d.ts`, the CSS spec's 96px/inch definition and Base UI's dated 2026 release notes; the touch pattern is already running in production here |
| Features | MEDIUM-HIGH | Touch sizing and interaction guidance is well established (Apple HIG, Android, WCAG 2.5.5, NN/g); surfboard-tool precedent rests on iShaper's own public copy, not hands-on use |
| Architecture | HIGH | Every integration point cited by file and symbol from reading the live code; `halveDeckMark1` traced and independently re-verified by the orchestrator |
| Pitfalls | HIGH | Fifteen pitfalls grounded in direct inspection of the viewers, the root layout, `measure-field.tsx` and both print pipelines; iOS behaviours are stable platform facts |

**Overall confidence:** HIGH

### Gaps to Address

- Print toggle default and persistence: decide in Phase 8's discuss-phase, not in a plan.
- Hit-zone spacing on the curves: measure during Phase 9 planning before choosing the new radius.
- Safe-area CSS: enumerate during Phase 10 planning once the phone nav/control placement is known.
- No Playwright suite exists yet: until Phase 9 lands one, desktop-regression protection for touch changes is a disciplined manual pass, and each phase's verification should say so explicitly.
- The four detail files were written before the `halveDeckMark1` verification landed; where FEATURES.md or PITFALLS.md treat it as a real variant, this summary and the corrected PROJECT.md take precedence.

## Sources

### Primary (HIGH confidence)
- This repository: `components/outline/outline-viewer.tsx`, `components/rocker/rocker-viewer.tsx`, `components/rails/*`, `components/summary/order-form.tsx`, `components/summary/use-print-fit.ts`, `components/design/design-store.tsx`, `app/layout.tsx`, `app/globals.css`, `lib/geometry/rail-bands.ts`, `scripts/extract-prototype-rails-golden.mjs`, `reference/project/Rails.dc.html` (lines 704 and 1359)
- Installed `next` package type definitions — `Viewport` (`viewportFit`, `interactiveWidget`)
- W3C Pointer Events and CSS Values and Units specifications — pointer capture; 1in = 96px reference pixel
- Base UI release notes (2026) — touch-related fixes in Dialog, popups and scroll locking
- Tailwind CSS v4 documentation — `@theme` breakpoints, built-in container queries
- npm registry — `@playwright/test` 1.63.x, `@base-ui/react` 1.8.0

### Secondary (MEDIUM confidence)
- Apple Human Interface Guidelines, Android accessibility guidance, WCAG 2.5.5, Nielsen Norman Group — touch target sizing and touch interaction patterns
- iShaper App Store / marketing copy — phone-native surfboard design precedent
- 2026 guides on iOS Safari `dvh`, input zoom-on-focus and Playwright device emulation

### Tertiary (LOW confidence)
- Competitor behaviour for Figma mobile, Shapr3D, Procreate, AkuShaper — from public documentation, not hands-on testing

---
*Research completed: 2026-09-07*
*Ready for roadmap: yes*
