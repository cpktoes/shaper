# Architecture Research — v1.2 "Rails Finished, Phone Ready"

**Domain:** Integration architecture for a subsequent milestone on an existing, shipped Next.js app (Shaper)
**Researched:** 2026-09-07
**Confidence:** HIGH — every claim below is grounded in a specific file/line read from the live repo (`main`, clean tree) plus the original prototype (`reference/project/Rails.dc.html`), not inferred from planning docs alone.

## Standard Architecture (as it exists today)

### System Overview

```
app/layout.tsx (root)                                    <- ClerkProvider > html > body
  UnitsProvider > ThemeProvider > DesignProvider (design-store.tsx)
    SiteNav (fixed header, px-12 py-6, no breakpoints)
    app/design/layout.tsx  <- SignInBanner + {children}, NO aside/main here
      app/design/{outline,rocker,rails,fins,volume}/page.tsx
        each renders ONE *-editor.tsx component that owns its OWN
        <div flex-nowrap> <aside w-[340..400]/> <main flex-1><TabbedPanel/></main> </div>
      app/design/summary/page.tsx -> OrderForm (2-page CSS-print sheet, own layout, no aside/main)
```

There is **no shared two-column shell**. `app/design/layout.tsx` (`/Users/kontoes/Code/shaper/app/design/layout.tsx`) only mounts `SignInBanner` and passes through a full-height flex `div` — it does not touch the aside+main split at all. That split is written out, nearly verbatim, five separate times:

| File | Wrapper | Aside | Main |
|---|---|---|---|
| `components/outline/outline-editor.tsx:187,197,224` | `flex min-h-0 w-full flex-1 flex-nowrap` | `max-w-[400px] flex-1 basis-[340px]` | `min-w-0 flex-1 basis-[480px]` |
| `components/rocker/rocker-editor.tsx:151,159,199` | same | same | same |
| `components/fins/fin-placement-editor.tsx:129,135,165` | same | same | same |
| `components/rails/rail-band-editor.tsx:195,201,229` | same | same | same |
| `components/volume/volume-estimator.tsx:29,30,39` | same | same | same |

`volume-estimator.tsx`'s own doc comment even says it "mirror[s] `components/rails/rail-band-editor.tsx`'s aside + main shell." The codebase already has a documented pattern for exactly this situation — see `components/viewer/tabbed-panel.tsx`'s doc comment (lines 4-9): *"Said once rather than six times… copying the markup a fifth and sixth time is exactly how a treatment drifts, which this codebase has already been bitten by."* `TabbedPanel` is what that lesson produced; the aside+main shell is the next thing that needs the same treatment.

## Integration Point 1 — The responsive shell

**Finding:** the two-column layout is duplicated in 5 files, not centralized. There is no single choke point to patch. Zero responsive breakpoints (`sm:`/`md:`/`lg:`/`@container`) exist anywhere in `components/outline`, `components/rocker`, `components/fins`, `components/rails`, `components/volume`, `components/design`, or `app/layout.tsx` — confirmed by grep. `app/globals.css` defines no `--breakpoint-*` overrides, so Tailwind v4's stock breakpoints (`sm`=40rem/640px, `md`=48rem/768px, etc.) are available but unused today.

**Smallest *correct* change is NOT a per-screen breakpoint bolted onto 5 files independently** — that's the fast path but it's the exact drift `TabbedPanel`'s own comment warns against, and phone layout will need iterating (aside becomes a drawer, or stacks, or a bottom sheet) across all five screens in lockstep. The correct move is a **new shared layout component** — e.g. `components/design/design-screen-shell.tsx` exporting something like:

```tsx
export function DesignScreenShell({ aside, main, footer }: { aside: ReactNode; main: ReactNode; footer?: ReactNode }) { ... }
```

that all five `*-editor.tsx`/`volume-estimator.tsx` files render into instead of hand-writing the `flex-nowrap`/`aside`/`main` triplet. Do this extraction **first**, in a plan of its own, changing nothing visually (desktop pixel-for-pixel identical) — then add the phone behavior (stack `aside` above `main`, or collapse `aside` behind a toggle/sheet) in exactly one place afterward. This mirrors how `TabbedPanel` itself was introduced.

**Viewport breakpoint, not container query.** The order-form print path (`app/design/summary/order-form.css`) already uses `@container`/`cqw` units, but for a different job — scaling *typography* inside a fixed-width printed sheet, not switching *layout* between phone and desktop. The aside+main split's real constraint is physical device width (a phone in portrait vs. a laptop), which viewport media queries (`md:flex-row`) model directly; container queries would need a wrapping container with `container-type: inline-size` for no real benefit here, since the shell already spans the full viewport width in every case that matters. Recommend Tailwind's `md:` (768px) as the stack/row cutover, matching `340px (aside min) + 480px (main min) ≈ 820px` combined minimum — i.e., roughly where the shell would start clipping today anyway.

**Also touches:** `SiteNav` (`components/site-nav.tsx:37`) is `px-12 py-6` with no responsive variants — on a phone that header alone eats a large share of vertical height. `app/layout.tsx`'s `body` is `h-full overflow-hidden` (line 91) with no `dvh` fallback anywhere in `app/globals.css` — mobile Safari/Chrome's dynamic address bar means a fixed `h-full`/`100vh` shell can clip or leave a gap; this should move to `100dvh` (or Tailwind's `h-dvh`) as part of the phone work, not treated as a rails-specific concern.

## Integration Point 2 — The SVG editors and touch

**Good news, largely already there.** Both drag-capable editors already use **React Pointer Events**, not mouse events, with `setPointerCapture`/`releasePointerCapture` and `touch-action: none` on the hit target:

- `components/outline/outline-viewer.tsx` — `toBoardPoint` (line 387), `handleDragMove` (399), `handleDragStart` (408, calls `event.currentTarget.setPointerCapture(event.pointerId)` at 412), `handleDragEnd` (415). Hit circle at line 644-653 carries `className="cursor-grab touch-none active:cursor-grabbing"` and `onPointerDown`.
- `components/rocker/rocker-viewer.tsx` — identical shape: `toBoardPoint` (706), `handleDragMove` (716), `handleDragStart` (726), `handleDragEnd` (733), same `touch-none` hit circle pattern.

Pointer Events already unify mouse, touch and pen — a phone drag on either viewer should **already basically work** without an event-model change. `fins` and `volume` have **no drag interaction at all** (confirmed by grep: no `onPointerDown`/`touch-none` in `components/fins/*.tsx` or `components/volume/*.tsx`) — fin placement is slider/input-driven only, so "touch drag on the outline, rocker and foil editors" (PROJECT.md's own phrasing) is accurate: only outline and rocker/foil need drag-touch work, not fins.

**What actually needs to change for phone:**

1. **Hit-target size.** Both viewers define the same three constants near their top (`outline-viewer.tsx:91-97`, `rocker-viewer.tsx:111-117`): `DRAG_TARGET_OUTER_PX = 7`, `DRAG_TARGET_RING_PX = 1.6`, `DRAG_TARGET_CORE_PX = 2.6`, and critically `DRAG_HIT_PX = 15` — a 15px-radius (30px-diameter) invisible hit circle. That is well under the ~44px touch-target guideline. This is a **numeric bump, not an architecture change** — but since the constant is copy-pasted between the two files (not shared), bump both, or extract to a shared constant in `components/viewer/callout-primitives.tsx` while you're there (that file already centralizes `CALLOUT_PX`, `DRAG`-adjacent sizing conventions don't exist there yet but it's the natural home). Note `handleUnit` (both files, derived from `useSvgFitScale`) already converts the px constant into SVG user units based on live render scale — bumping the constant is enough; no projection math changes.
2. **Pinch-zoom does not exist today.** Neither viewer reads `event.scale`, multi-touch, or a zoom transform; the SVG `viewBox` is fixed per render (`verticalViewBox`/`horizontalViewBox` in `outline-viewer.tsx:438-487`, computed from board geometry, not user zoom). Adding pinch-zoom means introducing a new transform layer (a CSS `transform: scale()`/pan wrapper, or a second SVG group with a zoom/pan matrix) **on top of** the existing projection code — `toBoardPoint`'s `getScreenCTM().inverse()` approach (line 389-391) already reads the actual on-screen transform matrix off the content group, so it should keep working correctly through an added zoom transform as long as the zoom is applied to (or above) the group `toBoardPoint` reads `getScreenCTM()` from (`contentRef.current`). This is the one place a naive pinch-zoom implementation could silently break drag math — verify `contentRef` still points at the group carrying the *full* accumulated transform (rotation + zoom) after adding zoom, not a sibling.
3. **Scroll-vs-drag conflict.** `touch-action: none` is already set on the hit circles (good — stops a touch-drag on a handle from scrolling the page), but the surrounding `<aside>` panels use native `overflow-y-auto` scrolling (`rail-band-editor.tsx:202`, same pattern elsewhere) — on the phone-stacked layout (Integration Point 1), verify the *aside's* scroll doesn't fight the *main* SVG's touch handling once they're stacked vertically instead of side-by-side.

**Fins and Volume:** no drag today, so no touch-drag work needed there — but their controls (`components/fins/fin-controls.tsx`, `components/volume/volume-controls.tsx`, and `components/rails/rail-controls.tsx`) use `components/ui/slider.tsx` (Base UI). Verify that slider's thumb hit target and the app's `.slider-accent` styling (referenced in `TabbedPanel`'s own doc comment as a place the codebase was "bitten" by copy-paste drift) are touch-usable — this is a shared component, so a slider-thumb-size fix there benefits every screen at once, same "fix once" principle as `TabbedPanel`.

## Integration Point 3 — `halveDeckMark1` and `lib/geometry/rail-bands.ts`

**Important correction to the milestone's own framing.** PROJECT.md says the INSTRUCTIONS example rail "uses a `halveDeckMark1` variant that `lib/geometry/rail-bands.ts` does not have yet." Tracing the actual prototype source (`reference/project/Rails.dc.html`) shows this flag is **dead code in the prototype itself**:

- Line 1359: `this.computeSection({ thickness: howToReadThickness, ratioTopPct: 60, family: 3, domed: s.howToReadDomed, domedBandBase: 6, scale: 1, halveDeckMark1: true })`
- Line 703 (the method's own signature): `computeSection({ thickness, ratioTopPct, family, domed, domedBandBase, scale = 1, cornerCutOffsetOverride, removeCornerCut, singleTuck, bottomTuck3Override, symmetrical, hardEdge })` — **`halveDeckMark1` is not in this destructuring list.** JavaScript silently drops the unused property; it has zero effect on the returned `deckMark1`, `deckMark2`, or any other field.
- Grepping the entire prototype file for `halveDeckMark1` turns up exactly one hit: the dead call-site argument at line 1359. No other function reads it. The "Deck 1" callout label in `buildPlot` (line 1100: `{ x: px(-r.deckMark1), y: py(thickness), text: 'Deck 1', ... }`) reads the plain, unhalved `deckMark1` — same as every other rail plot.
- This exact ambiguity was already flagged in a pre-existing todo, `.planning/todos/pending/2026-08-21-rails-instructions-page.md` (line 42): *"Note `halveDeckMark1: true` — the example uses a variant of the section computation. Check whether the current `computeSection` supports it or whether it needs a parameter."* The check has now been done: it doesn't need a parameter, because the prototype's own flag was never wired up.

**What this means for the plan:** `lib/geometry/rail-bands.ts`'s existing `computeRailSection` (public wrapper, line 488) and its private `computeSectionInches` (line 223) already produce the correct, prototype-faithful numbers for the INSTRUCTIONS example rail with **no new parameter, no signature change, and no port of a "halving" behavior that doesn't exist**. Calling `computeRailSection({ boardThickness: inchesToMm(3.5 or 3), ratioTopPercent: 60, family: 3, domedBandBase: inchesToMm(6), ... , domed: s.howToReadDomed })` with today's existing inputs is the correct port.

**This is a decision point for the roadmapper/planner, not a closed question**, because two readings are both defensible:
1. **Treat it as inert** (my recommendation, given the evidence): the geometry module needs *no* change for this milestone. The INSTRUCTIONS example rail is just another call to the existing `computeRailSection`, and PROJECT.md's "this milestone touches the geometry math" premise is not required by the facts — flag this back to the user/roadmapper explicitly rather than silently adding unused code to satisfy a false premise.
2. **Treat it as a missed intent**: if the founder actually wants Deck Mark 1 visually halved on the INSTRUCTIONS example (maybe for legibility in a compact callout diagram, independent of what the prototype's bug did), that would be a genuine new, small, pure addition to `rail-bands.ts` — e.g., an optional `deckMark1Scale` (or equivalent) on `RailSectionSpec`/`ComputeRailSectionInput`, defaulting to `1` everywhere except the new INSTRUCTIONS call site. That would need: a new exported parameter (not a separate function — `computeRailSection` already threads every other section-level knob this way), a unit test in `lib/geometry/rail-bands.test.ts` for the new branch, and a **golden-fixture regeneration**, not hand-transcription (Rule 1).

**Golden fixture consequence either way:** `scripts/extract-prototype-rails-golden.mjs` extracts and *executes* the prototype's own `computeSection` (and friends) via `new Function(...)` (see `extractMethod`, line 31, and its usage at line 103) rather than reimplementing the formulas — this is the mechanism CLAUDE.md's Rule 1 requires ("never hand-transcribe an expected number — regenerate the fixture"). Today's script has **no `howToRead`-specific extraction** (confirmed: no `howToRead` string anywhere in the script). Whichever reading above is chosen, add a new fixture case to this script — call the extracted `computeSection` with the exact `howToReadResult` inputs (`thickness: 3.5` flat / `3` domed, `ratioTopPct: 60, family: 3, domedBandBase: 6, scale: 1`, plus `halveDeckMark1: true` if reading 2 is chosen and the extraction is updated to actually apply it) and write the result into `lib/geometry/__fixtures__/prototype-rails-golden.json` under a new key (e.g. `howToRead`), then assert against it in `lib/geometry/rail-bands.test.ts`. Never hand-type the expected `deckMark1`/`apexCenter`/etc. values.

## Integration Point 4 — The rails screen's tab structure

`components/rails/rail-band-editor.tsx` owns the tabs directly:

- `type RailPage = "viewer" | "data";` (line 13)
- `const [activePage, setActivePage] = useState<RailPage>("viewer");` (line 114) — **local component state, not design-store** (consistent with `sectionOpen`/`advancedOpen` on the same lines — the file's own doc comment at line 69-71 is explicit: *"UI-only state (which sections/Advanced disclosures are open, which page is active) stays local — it never touches the design itself."*)
- Rendered via the shared `TabbedPanel` (`components/viewer/tabbed-panel.tsx`) at line 230: `tabs={[{ id: "viewer", label: "VIEWER" }, { id: "data", label: "DATA" }]}`, with the two page bodies as sibling `{activePage === "viewer" && (...)}` / `{activePage === "data" && (...)}` blocks (lines 235, 268).

**A third INSTRUCTIONS tab slots in with minimal shape change**, entirely inside this file plus one new content component:

1. Widen the union: `type RailPage = "viewer" | "data" | "instructions";`
2. Add a third tab entry to the `tabs` array passed to `TabbedPanel`: `{ id: "instructions", label: "INSTRUCTIONS" }`.
3. Add a third `{activePage === "instructions" && <RailInstructions .../>}` block — a **new** component, e.g. `components/rails/rail-instructions.tsx`, holding the Flat/Domed toggle (`howToReadDomed`, local `useState`, same pattern as `sectionOpen` — this is view state, not board design, so it should NOT go on `design-store` or persist with the saved board) and the callout-labeled example-rail plot.
4. `TabbedPanel` itself needs **no change** — it's generic over `T extends string` and already handles N tabs; `tabs.length > 1` (line 74) already gates interactivity correctly for 3 tabs same as 2.

**The plot itself is new work, not a `RailSectionPlot` reuse-as-is.** `rail-section-plot.tsx`'s own doc comment (lines 4-9) explicitly scoped callouts *out*: *"restricted to a single, always-expanded plot: no `cropXMin`/actual-size handling, no callouts (those belong to the out-of-scope Instructions page)."* The prototype's `howToRead` plot (lines 371-392 of `Rails.dc.html`) renders the same grid/refLines/segments/dots/ticks primitives `RailSectionPlot` already draws, **plus** a `callouts` array of plain absolutely-positioned `<span>` text labels (not the chip+leader style `components/viewer/callout-primitives.tsx` uses for outline/rocker). Recommend extending `RailSectionPlot` with an optional `callouts` prop (reusing its existing `px`/`py` projection, `computeRailPlotBounds`, `buildRailPlotGrid`) rather than forking a second plot component — the projection math must stay identical between the two contexts since the callouts point at specific segment endpoints.

## Integration Point 5 — The print path

There are **two structurally different print mechanisms** in this app today, and the plan needs to pick the right one for the instructions sheet:

1. **CSS print of live React** — `components/summary/order-form.tsx` (the `/design/summary` screen). Two `<Sheet>` pages: page 1 is the order form, **page 2 (line 535, `variant="reference"`) is already "the shaper's reference" and already renders `RailSectionPlot` and `RailDataTable`** for rail bands (imports at lines 57-58, usage from line 328 on). Printing is triggered by `window.print()` (`useOrderFormPrintFit`, `components/summary/use-print-fit.ts`, `printOrderForm` at line 150), fitted via `@media print` CSS in `app/design/summary/order-form.css` and the hook's own `beforePrint`/`afterPrint` DOM measurement (`measurePxPerInch()` at line 58 — measures actual CSS px-per-inch via a live `1in`-wide probe div, rather than assuming 96, specifically because "a zoomed or high-DPI context is not 96").
2. **jsPDF-built downloads** — `components/template/build-overview-pdf.ts`, `build-template-pdf.ts`, `build-strip-pdf.ts`, all triggered from one shared `components/template/export-preview-dialog.tsx` (uses `components/ui/dialog.tsx`, a Base UI `Dialog`). These programmatically draw vector content into a PDF; they don't render live DOM at all — "Overview Sheet," "Full Sized Template," and "Full Sized Template - Paper Saver" are the three cards in that dialog's picker (lines 74-90).

**"Include Rail Band Instructions in Print" (PROJECT.md) attaches most naturally to path 1, the Order Form's reference sheet (page 2), not to the jsPDF template builders.** Reasoning: page 2 already exists specifically to carry rail-band data/plots for a shaper working at the bench; it's rendered as live React (so the new INSTRUCTIONS content — the same component built for Integration Point 4 — can be reused directly, not redrawn as PDF vector primitives); and the pre-existing todo (`.planning/todos/pending/2026-08-21-rails-instructions-page.md`, lines 47-50) explicitly separates this from the tab-porting work and flags it as print-path work to decide "together" with whichever print work is already in flight — this research confirms page 2 of the Order Form is that print path. Building it into the jsPDF builders instead would mean re-implementing the callout plot as jsPDF vector drawing calls, duplicating the SVG-based component built for the screen — avoid that.

**What must be honoured:**
- **v1.1 units rules.** Everything under `app/design/summary/` and `components/summary/` already reads through `lib/geometry/measure-display.ts`'s display boundary and `useUnits()` (`components/units-provider.tsx`) — the new instructions content must go through the same boundary (dims in cm-to-1-decimal, marks in whole mm, per CLAUDE.md's Rule 2 restatement of the v1.1 split) rather than hand-formatting numbers. `RailSectionPlot`'s own `buildRailPlotGrid` (rail-section-plot.tsx:144) already branches on `system` and routes labels through `formatMarkBare` — the new callout labels for INSTRUCTIONS should follow the identical pattern, not invent a second formatter.
- **1:1 template scale.** `use-print-fit.ts`'s scaling (the `zoom` fallback at line 126) only engages `if (overflow > 1)` per sheet — it must never fire on a sheet that's supposed to print true-to-scale. If the instructions sheet's plot is meant to print at any specific scale (the prototype's version isn't 1:1, it's just a diagram — see line 1547's `zoom:0.74` fixed-shrink, unrelated to `use-print-fit.ts`'s auto-fit), keep it explicitly separate from the Full Sized Template's actual 1:1 guarantee; don't let one shared auto-fit scale silently rescale a true-size drawing elsewhere on the same printed stack. Per-sheet fitting (already the architecture — "Each sheet is sized and measured independently," `use-print-fit.ts` lines 6-10) is exactly what protects this.
- **Where the toggle's state lives.** The checkbox needs to be set on the *Rails* screen (matching the prototype's own placement, line 278-280) but read on the *Summary* screen when building the printed page. That's cross-screen state, which — per `components/design/design-store.tsx`'s own stated purpose ("every design screen reads and writes one board-design object through this context… so a value changed on one screen is immediately visible on every other screen") — means it belongs on the shared store, not a local `useState` in `rail-band-editor.tsx`. Whether it should be **persisted** with the saved board (like `railsImportFoilThickness`, a real `DesignState` field serialized on every autosave, `design-store.tsx:87,137,346,560`) or treated as an ephemeral session preference not written to Postgres is a genuine open decision for the plan — flag it rather than assuming either way.

## Integration Point 6 — The 1:1 "View Full Sized" modal

**Existing dialog primitive:** `components/ui/dialog.tsx` (Base UI `Dialog`, vendored — `Dialog`, `DialogContent`, `DialogTrigger`, `DialogHeader`, `DialogFooter`, etc.), already used for `components/template/export-preview-dialog.tsx`, `components/auth/sign-in-dialog.tsx`, `components/setup/rename-dialog.tsx`, `components/setup/board-name-prompt.tsx`. This is the right primitive for the new modal — it handles focus trap, `Escape`, backdrop, and portal rendering for free, and the codebase already leans on it for exactly this kind of "screen over the current one" UI.

Note: `components/fins/toe-aim-table-modal.tsx` is built with **plain markup instead** (its own comment says "No dialog primitive is vendored under components/ui/, so this is built with plain markup"), but `components/ui/dialog.tsx` was actually added earlier (2026-08-27, Phase 2 — `git log` confirms) than that comment was written (2026-09-05) — the comment is stale/inaccurate for future work. **Use `components/ui/dialog.tsx`, do not copy `toe-aim-table-modal.tsx`'s plain-markup pattern.**

**Actual-size rendering is a separate, already-solved sub-problem** — reuse, don't reinvent: `components/summary/use-print-fit.ts:58-65` already has a `measurePxPerInch()` helper that measures live CSS px-per-inch via a `1in`-wide probe `div`'s `getBoundingClientRect()`, specifically because a zoomed/high-DPI context isn't reliably 96px/in. The prototype's own actual-size view (`Rails.dc.html` line 489) takes the opposite, simpler stance: *"Plotted at true 1:1 scale, assuming your browser renders CSS inches at the standard 96px/in… if it doesn't match, adjust your browser zoom until it does"* — i.e., the prototype hard-codes the standard-screen assumption with **no calibration step**, exactly matching PROJECT.md's stated requirement ("standard-screen assumption, same as the prototype, with no calibration step").

Given CLAUDE.md's own precedent that `use-print-fit.ts` deliberately keeps its *own* copy of unit-conversion logic because it scales *paper*, not board dimensions ("`components/summary/use-print-fit.ts` has its own copy on purpose"), the "View Full Sized" modal is the same category of thing — a screen/DOM-scaling concern, not a design-value conversion — so it should get its **own** small hook (e.g. `components/rails/use-actual-size-fit.ts`) rather than importing from `components/summary/`. It can either reuse `measurePxPerInch()`'s exact technique (a fresh copy, matching the established pattern) or go further with the prototype's own harder assumption (fixed 96px/in, zero DOM measurement) — recommend copying the *measured* approach (`measurePxPerInch`) since it's already proven in this codebase and degrades gracefully, but this is a legitimate product call for the plan to make explicitly rather than silently picking one.

**Render target:** the modal should render `RailSectionPlot` (or the section's underlying `RailSectionOutput`) at `width = <board measurement in inches> * pxPerInch` CSS pixels directly — i.e., an SVG sized by explicit `width`/`height` px attributes (not a percentage `viewBox`-fit as the normal VIEWER tab does), scaled 1:1 to the measured screen DPI. This is structurally close to what `use-print-fit.ts` does for the printed page box (`printableBoxPx()`, line 67) — computing a physical-inch box in CSS px and pinning an element to it — just applied to a `<Dialog>` instead of a `@media print` sheet.

## Build Order

Given the dependency shape above, the sensible sequence is:

**Phase A — Foundational refactors (no new user-visible behavior), can run in parallel:**
1. Extract the shared `DesignScreenShell` layout component from the 5 duplicated aside+main blocks (Integration Point 1) — desktop-pixel-identical, sets up the single place phone stacking will land later.
2. Resolve the `halveDeckMark1` question (Integration Point 3) — get an explicit answer (inert vs. real new parameter) before building the INSTRUCTIONS example rail on top of it; either way, this is `lib/geometry/rail-bands.ts` + its test file + `scripts/extract-prototype-rails-golden.mjs`, fully independent of any UI work.
3. Move `reference/project/assets/rail-bands-plan-bg.png` into `public/` — trivial, unblocks the plan-view work, no dependency on anything else.

**Phase B — Rails screen completion (depends on Phase A #2 for its data, not on #1 or #3 except the plan view needing #3):**
4. INSTRUCTIONS tab (Integration Point 4): extend `RailPage` union, add tab entry, build `rail-instructions.tsx`, extend `RailSectionPlot` with optional callouts.
5. Board-outline plan/side reference view + legend checkboxes — this was previously blocked on the rails screen not having outline access; the shared `design-store.tsx` (Phase 1 of v1.0) already removed that blocker, so it's unblocked today. Depends on #3 (background asset in `public/`).
6. "View Full Sized" modal (Integration Point 6) — depends on nothing above except `components/ui/dialog.tsx` (already exists); can run in parallel with #4/#5.
7. "Include Rail Band Instructions in Print" (Integration Point 5) — depends on #4 existing (reuses its content component) and on deciding the state-ownership question (design-store field vs. ephemeral). Do this **after** #4, not concurrently, since it reuses #4's output.

**Phase C — Phone support (depends on Phase A #1 for the shell, otherwise independent of Phase B):**
8. Apply the phone breakpoint inside `DesignScreenShell` (stack/collapse aside) — one change, inherited by all five screens.
9. Bump `DRAG_HIT_PX` (and sibling constants) in `outline-viewer.tsx` and `rocker-viewer.tsx` for touch-sized targets; verify slider thumb sizing in `components/ui/slider.tsx`.
10. Pinch-zoom on outline/rocker viewers — depends on #8 (final on-screen sizing) but not on #9; verify `toBoardPoint`'s `getScreenCTM()` read survives whatever zoom-transform layer is added.
11. `SiteNav` and root `body`/`html` height fixes (`h-dvh`, responsive header padding) — can happen any time in Phase C, ideally early since every other phone fix is easier to verify once the outer chrome behaves.
12. Full-app phone sweep (sign in → preset → rack → all 5 design screens → save → summary) — last, once 8-11 land, since it's the acceptance pass across everything Phase C touched plus Phase B's new INSTRUCTIONS tab and plan view (those also need phone verification, so this step implicitly depends on Phase B being done too).

**Parallelizable across phases:** Phase A and the start of Phase C (steps 9, 11) have no interdependency and can run concurrently with Phase B once Phase A is done. Step 7 (print instructions) is the one piece of Phase B that should be sequenced *after* step 4 rather than alongside it.

## New vs. Modified — Summary Table

| Component/File | New or Modified | Notes |
|---|---|---|
| `components/design/design-screen-shell.tsx` | **NEW** | Extracted shared aside+main layout; replaces duplicated markup in 5 files |
| `components/outline/outline-editor.tsx` | Modified | Adopt shared shell; later, phone breakpoint behavior inherited |
| `components/rocker/rocker-editor.tsx` | Modified | Same |
| `components/fins/fin-placement-editor.tsx` | Modified | Same |
| `components/rails/rail-band-editor.tsx` | Modified | Adopt shared shell; add third `RailPage` tab; add print-toggle wiring |
| `components/volume/volume-estimator.tsx` | Modified | Adopt shared shell |
| `components/outline/outline-viewer.tsx` | Modified | Bump `DRAG_HIT_PX`/hit-target constants; add pinch-zoom transform layer |
| `components/rocker/rocker-viewer.tsx` | Modified | Same |
| `lib/geometry/rail-bands.ts` | Modified (pending decision) | Only if `halveDeckMark1` is a real, new optional parameter — otherwise untouched |
| `lib/geometry/rail-bands.test.ts` | Modified | New test case for INSTRUCTIONS example rail values (golden-fixture-backed) |
| `scripts/extract-prototype-rails-golden.mjs` | Modified | Add a `howToRead` extraction/fixture entry |
| `lib/geometry/__fixtures__/prototype-rails-golden.json` | Regenerated (never hand-edited) | Via `npm run golden` / `npm run golden:rails` |
| `components/rails/rail-instructions.tsx` | **NEW** | INSTRUCTIONS tab content — Flat/Domed toggle, callout-labeled example rail |
| `components/rails/rail-section-plot.tsx` | Modified | Add optional `callouts` prop, reusing existing `px`/`py` projection |
| `components/rails/rail-board-outline-plot.tsx` (name TBD) | **NEW** | Plan/side reference view, ports `buildBoardOutlinePlot`/`planRefPaths`/`sideRefPaths` |
| `public/rail-bands-plan-bg.png` | **NEW** (moved) | From `reference/project/assets/rail-bands-plan-bg.png` |
| `components/rails/view-full-sized-modal.tsx` (name TBD) | **NEW** | Uses `components/ui/dialog.tsx`; 1:1 rendering |
| `components/rails/use-actual-size-fit.ts` (name TBD) | **NEW** | Own copy of px-per-inch measurement, mirroring `use-print-fit.ts`'s deliberate duplication pattern |
| `components/summary/order-form.tsx` | Modified | Page 2 gains the instructions sheet when the toggle is on |
| `components/design/design-store.tsx` | Modified | New field for the print-instructions toggle (persisted or ephemeral — open decision) |
| `components/site-nav.tsx` | Modified | Responsive header sizing/padding |
| `app/globals.css` | Modified | `h-dvh` or equivalent dynamic-viewport-height handling |
| `components/ui/slider.tsx` | Possibly modified | Touch target sizing, if it needs one — check before assuming |
| `components/template/*.ts`, `export-preview-dialog.tsx` | **NOT touched** | Instructions-in-print attaches to the Order Form's CSS-print path, not the jsPDF builders |

## Anti-Patterns to Avoid

### Anti-Pattern 1: Fixing the aside+main layout five times independently
**What people do:** patch a `md:flex-col` breakpoint directly into each of the 5 `*-editor.tsx`/`volume-estimator.tsx` files without extracting a shared component first.
**Why it's wrong:** guarantees the next visual tweak (a 6th screen, or a different phone treatment) drifts across files again — exactly the failure mode `TabbedPanel`'s own doc comment names as already having happened once in this codebase.
**Do this instead:** extract `DesignScreenShell` first (Phase A), add the phone behavior once inside it.

### Anti-Pattern 2: Building the `halveDeckMark1` parameter because the prototype "has" it
**What people do:** port `halveDeckMark1: true` into `computeRailSection` as a new parameter that halves `deckMark1`, on the assumption the prototype's call site proves the intent.
**Why it's wrong:** the prototype's own `computeSection` signature never consumes that argument — it has zero effect in the reference implementation. Porting a behavior the "source of truth" never actually executed risks producing a number that disagrees with what the prototype visually shows (which is the plain, unhalved value).
**Do this instead:** verify against the regenerated golden fixture (extracted from the prototype's actual executed code) before adding any new geometry parameter; if the founder wants real halving for legibility, that is a **new** product decision, not a "port."

### Anti-Pattern 3: Drawing the instructions sheet as jsPDF vector calls
**What people do:** add the instructions content to `components/template/build-overview-pdf.ts` or a new `build-*-pdf.ts` builder, matching the other three printable artifacts' mechanism.
**Why it's wrong:** duplicates the SVG/callout rendering work already built for the screen (Integration Point 4) as a second, PDF-vector-primitive implementation that can silently drift from the on-screen version — and the existing "reference" page (Order Form page 2) already exists specifically for exactly this kind of rail-band print content.
**Do this instead:** attach to `components/summary/order-form.tsx`'s page 2, reusing the live React component built for the INSTRUCTIONS tab.

## Sources

- `/Users/kontoes/Code/shaper/app/layout.tsx`, `/Users/kontoes/Code/shaper/app/design/layout.tsx`, `/Users/kontoes/Code/shaper/components/site-nav.tsx` — shell/layout structure
- `/Users/kontoes/Code/shaper/components/outline/outline-editor.tsx`, `outline-viewer.tsx` — aside+main pattern, pointer-event drag, hit-target constants
- `/Users/kontoes/Code/shaper/components/rocker/rocker-editor.tsx`, `rocker-viewer.tsx` — same, plus foil integration
- `/Users/kontoes/Code/shaper/components/fins/fin-placement-editor.tsx`, `toe-aim-table-modal.tsx` — no drag, stale dialog-primitive comment
- `/Users/kontoes/Code/shaper/components/volume/volume-estimator.tsx` — shell duplication, explicit "mirrors rail-band-editor.tsx" comment
- `/Users/kontoes/Code/shaper/components/rails/rail-band-editor.tsx`, `rail-controls.tsx`, `rail-data-table.tsx`, `rail-section-plot.tsx` — tab structure, local UI-state pattern, plot projection math, deliberate callout-scope exclusion
- `/Users/kontoes/Code/shaper/components/viewer/tabbed-panel.tsx`, `callout-primitives.tsx` — shared-component precedent, callout/chip primitives
- `/Users/kontoes/Code/shaper/lib/geometry/rail-bands.ts` — `computeRailSection`, `computeSectionInches`, `RailSectionSpec`
- `/Users/kontoes/Code/shaper/scripts/extract-prototype-rails-golden.mjs` — golden-fixture extraction mechanism (executes prototype source via `new Function`)
- `/Users/kontoes/Code/shaper/reference/project/Rails.dc.html` (lines 279-281, 358-521, 690-730, 940-1150, 1281-1420, 1503, 1540-1600) — prototype source of truth; confirms `halveDeckMark1` is unconsumed dead code; instructions-page markup; print-bundling mechanism (`window.open`/iframe, not reusable)
- `/Users/kontoes/Code/shaper/components/summary/order-form.tsx`, `use-print-fit.ts`, `app/design/summary/order-form.css` — CSS-print path, `measurePxPerInch`, per-sheet auto-fit, reference-page rail content
- `/Users/kontoes/Code/shaper/components/template/export-preview-dialog.tsx`, `build-overview-pdf.ts`, `build-template-pdf.ts`, `build-strip-pdf.ts` — jsPDF print path (distinct from CSS print)
- `/Users/kontoes/Code/shaper/components/ui/dialog.tsx` — existing Base UI dialog primitive, `git log` confirming it predates the stale comment in `toe-aim-table-modal.tsx`
- `/Users/kontoes/Code/shaper/components/design/design-store.tsx` — shared cross-screen state mechanism, `railsImportFoilThickness` as precedent for a persisted non-geometry design toggle
- `/Users/kontoes/Code/shaper/.planning/todos/pending/2026-08-21-rails-instructions-page.md`, `2026-08-21-rails-viewer-extras.md` — pre-existing scoping notes for this exact work, including the original `halveDeckMark1` question this research resolves
- `/Users/kontoes/Code/shaper/.planning/PROJECT.md` — milestone goal, active requirements, key decisions ledger

---
*Architecture research for: Shaper v1.2 — Rails Finished, Phone Ready*
*Researched: 2026-09-07*
