# Phase 9: The Design Screens on a Phone - Research

**Researched:** 2026-09-08
**Domain:** Responsive layout retrofit + touch input for an existing SVG-based design tool (Next.js 16 / React 19 / Tailwind v4), plus first-time Playwright installation
**Confidence:** HIGH (all load-bearing numbers came from reading and hand-tracing the actual geometry code, not from memory)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Inherited constraints (settled before this discussion):**
- One shared shell first. Extract one `components/design/design-screen-shell.tsx`, desktop-pixel-
  identical, and add the phone layout there once. Fixing the layout five times is the phase's main
  risk.
- The `dvh` root and Next 16's `viewport` export land early (`app/layout.tsx`), before any
  per-screen work.
- Playwright is installed in this phase (`@playwright/test`, dev dependency only) with iPhone and
  Android device profiles — the milestone's only new dependency. Until it lands, desktop regression
  protection is a disciplined manual mouse-and-keyboard pass that each plan's verification states
  explicitly.
- Touch drag reuses the Pointer Events + `setPointerCapture` + `touch-action: none` pattern already
  running in `outline-viewer.tsx` and `rocker-viewer.tsx`. No gesture library; no duplicate mouse
  handlers beside the pointer handlers.
- A phone layout that "works" by hiding a control is a regression, not a fix. The two deliberate
  exceptions and why they are not regressions are in D-05.
- Station spacing is measured during planning before a new hit-zone radius is chosen — today's
  `DRAG_HIT_PX = 15` gives a 30px target, under the 44px guideline.
- Typed fields get 16px text on touch so iOS stops zooming on focus (`measure-field.tsx` is 14px
  today); the viewers get `select-none` and `-webkit-touch-callout: none` so the long-press popup
  cannot fire mid-drag.
- No pinch-zoom: the drawings fill the phone's width instead.
- The units rules do not move. Every number on the new phone surfaces reads through
  `lib/geometry/measure-display.ts` under the v1.1 dims-in-cm/marks-in-mm split, and new
  design-screen files join `lib/units-isolation.test.ts`.

**D-01:** The drawing is pinned at the top and the controls scroll beneath it. On an upright phone
the drawing takes about two-thirds of the screen height (a ceiling, not a rule) and the controls
region the remaining third.

**D-02:** On the phone the drawing is the control wherever it can be. The drag points and, where
they do not clutter the small drawing, the construction lines are on by default on phones. Desktop
keeps exactly what it has today (off by default behind its toolbar toggle, PHON-05).

**D-03:** Sliders that duplicate a draggable point fold into one closed "Fine adjust" group at the
bottom of the controls. Fold on TEMPLATE: Width/Offset, Tail Rail/Nose Rail, Tail Angle/Fullness,
Nose Angle/Fullness. Fold on ROCKER: Nose Angle, Nose Smoothness, Nose Flatness, Tail Flatness,
Tail Smoothness, Tail Angle. Stay in the open: Board Length, Nose/Tail Rocker, all five foil
thicknesses, every RAILS/FINS/VOLUME control, every non-slider control. Fold state is screen-only,
never saved.

**D-04:** Data tables (rocker DATASHEET, rails DATA, fins data panel) keep their columns and scroll
sideways inside their own box. The page never scrolls sideways.

**D-05:** Two deliberate exceptions to the no-hidden-controls rule: (1) the rotate button is absent
on phones — turning the phone does that job; (2) the View Full Sized dialog's on-screen check bar
and 100%-zoom caveat are absent on phones — the view is not true size there, so a true-size check
would mislead; the Print button and printed bar remain. Nothing else is removed.

**D-06:** A bottom tab bar holds the six screens (TEMPLATE, ROCKER, RAILS, VOLUME, FINS, SUMMARY,
today's `NAV_LINKS` order) along the bottom of the phone, bottom-anchored with
`env(safe-area-inset-bottom)`.

**D-07:** Each tab is a label only, in the app's small-caps heading treatment. No screen icons are
invented.

**D-08:** The top bar keeps the wordmark and Save; the gear and account control go behind one menu
button. Save keeps its wording. Units/Theme (`SettingsMenu`) and the account control
(`NavAuthControl`) are reached from the one menu.

**D-09:** The board follows the phone. On both TEMPLATE and ROCKER, the board stands nose-up when
the phone is upright and lies flat (nose left) when the phone is sideways. Orientation is view
state, never saved.

**D-10:** Desktop orientation is untouched — the desktop default and its rotate button behave
exactly as today.

**D-11:** The rotate button is absent on phones — the phone's own orientation is the only
orientation control there.

**D-12:** The RAILS screen shows one cross-section at a time on a phone, with a Nose/Center/Tail
switch (Phase 8's View Full Sized idiom). Each rail gets the full width and fits the pinned area.

**D-13:** View Full Sized on a phone shrinks the rail to fit the width; Print still prints true
size. On a phone the dialog shows one plain line, no check bar, no zoom caveat. The print path is
unchanged.

**D-14:** PHON-04's "foil points" are read as the rocker screen's existing points — the outline's
five points (`OutlineDragTarget`) and the rocker's four Bezier curve handles
(`SideProfileDragTarget`). The foil stays slider-only on phone and desktop; foil drag is deferred.

**D-15:** When finger-sized hit zones would overlap, the nearest point to the touch wins. One hit
test picks the closest point within finger reach. Same rule for mouse and touch. Lives beside the
drag solvers in `lib/geometry/` with tests (Rule 1).

**D-16:** A touch starts moving the point straight away, exactly as a mouse press does — one
pointer path for both, no movement threshold.

**D-17:** While a finger drags a point, a temporary readout appears beside it showing the same
words/numbers as the slider(s) that point drives, in the shaper's chosen system. Touch only, never
for a mouse; goes when the finger lifts.

### Claude's Discretion

- **Landscape layout:** at `shell:` width (≥820px) the screen returns to the desktop sidebar-
  beside-canvas shell with the board lying flat, regardless of phone/desktop origin — one
  breakpoint answers both.
- **What triggers what:** the stacked layout is a viewport-width breakpoint (`--breakpoint-shell`
  in `@theme static`); finger-sized targets, 16px inputs, enlarged hit zones, the on-by-default
  overlay and the drag readout follow the pointer (`@media (pointer: coarse)`).
- **The shell's exact numbers:** pinned area height per screen/orientation, `TabbedPanel` strip
  placement, Fine adjust group wording/position, sideways-scroll affordance, VOLUME's layout (one
  column, card then controls, nothing pinned), RAILS INSTRUCTIONS scroll behaviour (scrolls as a
  whole, controls region collapsed).
- **"Construction lines where possible":** judged per screen; drag points themselves always on.
- **The one menu:** shape, whether `SettingsMenu`/`NavAuthControl` render inside it or open in turn.
- **The drag readout's look:** chip styling (`CalloutChip` idiom), offset above the finger,
  behaviour at a drag limit.
- **The sign-in nudge banner:** stays compact/dismissable as-is; Phase 10 owns sign-in itself.
- **The fins viewer and rails INSTRUCTIONS figure:** simply fit the phone's width; no orientation
  rule.
- **Proving "desktop-pixel-identical":** recommendation is Playwright desktop-viewport screenshots
  before/after, diffed; planner picks the mechanism.
- **Playwright and CI:** recommendation — the phone suite gates every push beside the geometry
  suites; a desktop mouse-drag test on the outline viewer joins as PHON-05's standing proof; device
  profiles are an iPhone and a Pixel-class Android from Playwright's `devices` list, exact models at
  the planner's discretion.
- **Which rail shows first on RAILS (D-12):** the first open section, Nose when all are collapsed.

### Deferred Ideas (OUT OF SCOPE)

- Sign-in, sign-up and the account menu's own flows on a phone; the setup screen, presets and the
  rack; the summary and the on-screen order form; the real-device end-to-end pass (all Phase 10,
  PHON-07 to PHON-10).
- Pinch-zoom or pan on the viewers, a magnifier or drag-with-offset aid, a calibrated actual-size
  view, printing from a phone (the requirements' future list).
- Foil drag points — a new inverse-geometry capability (`lib/geometry/foil-drag.ts`), its own
  requirement in a later phase.
- Any new geometry: nothing under `lib/geometry/` changes the numbers it produces.
- Landscape phone tab placement and the exact landscape layout — decided only as a recommendation;
  revisit if the UI-SPEC or real-device use in Phase 10 finds it wrong.
- The Phase 8 print-bug follow-up (View Full Sized check-bar background/rail-name-on-print) — filed
  as a `/gsd-quick` task, not this phase (and already resolved per STATE.md's quick task
  `260908-q0n`, which predates this research session).
- Several reviewed-but-not-folded todos (copy-spec-to-clipboard, finished-board photo uploads, fins
  imported-tail curve behaviour, presets for rails/fins, bottom contours, order-form branding) — all
  unrelated capabilities, not this phase's work.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PHON-01 | Every desktop control reachable on the phone; nothing overlapping or hidden | Architecture Pattern 3 (shell extraction, including the two per-screen exceptions that must not be lost); Validation Architecture test map |
| PHON-02 | Page fits the phone's visible area as Safari's toolbar comes and goes; no clipped content, no trapped scroll | Code Examples' `viewport` export (verified field shapes); State of the Art row on `dvh` precedent already in this codebase |
| PHON-03 | Sliders/buttons/tabs/typed fields sized for a finger; typed number field does not zoom | Pitfall 4 (16px-not-maximumScale); Pattern 2 (`coarse:` custom variant) |
| PHON-04 | Thumb-drag on outline/rocker points; hit zones sized for a finger, not overlapping, no long-press popup | Summary's station-spacing arithmetic; Pitfall 2 (nearest-point-wins is a structural change); Pitfall 3 (missing `select-none`/`-webkit-touch-callout`); Code Examples' nearest-point pick |
| PHON-05 | Desktop mouse drag and keyboard operation exactly as today, on every viewer touched | Pattern 4 (today's exact pointer-event wiring, quoted verbatim, as the byte-for-byte baseline); note that no SVG keyboard-drag exists to preserve |
| PHON-06 | Board drawings use the full phone width | Pitfall 1 (the ROCKER vertical-frame aspect-ratio risk to this exact requirement) |
| TEST-01 | Playwright installed with iPhone/Android profiles; automated tests prove stacked layout + touch drag on at least the outline viewer | Standard Stack (version/install); Code Examples (CDP touch-drag pattern, config shape); Validation Architecture (full test map, Wave 0 gaps) |
</phase_requirements>

## Summary

This phase does not add product features — it makes five existing, desktop-only design screens
work on a phone, using the codebase's own existing patterns (Pointer Events, `TabbedPanel`,
`ViewerToolbarButton`, `SliderRow`) rather than any new library. The two switches the UI-SPEC
locks — a `--breakpoint-shell: 820px` width breakpoint and a `pointer: coarse` custom variant —
are both genuinely new tokens; neither exists in `app/globals.css` today, and this research
confirms via the installed Tailwind v4 source and official docs that a custom `--breakpoint-shell`
token automatically produces both a `shell:` (min-width) and a `max-shell:` (max-width) variant,
which is the exact mechanism the desktop-untouched contract depends on.

The single highest-risk finding from this research is arithmetic, not architectural: **the
ROCKER screen's nose-up (vertical) frame has a native aspect ratio of roughly 1:1.6 (narrower than
tall)**, because its card rails reserve a fixed-ceiling width on the cross axis while the long axis
is the board's full length. Fitting that frame inside a modest height budget (UI-SPEC's own 45dvh)
forces the SVG's `preserveAspectRatio="meet"` fit to become height-bound, which means the drawing
renders well short of the phone's full width — the opposite failure from what PHON-06 asks for.
This is worked out with real numbers below (Common Pitfall 1) and needs a planner decision before
implementation, not during it.

The second load-bearing finding is that **`nearest-point-wins` (D-15) is not a copy-edit, it is a
structural change** to both viewers' drag start: today each drag point owns its own `onPointerDown`
on its own transparent `<circle>`, so when two enlarged touch targets overlap, the browser's native
hit-testing resolves the ambiguity by paint order (last-drawn element wins), not by distance to the
touch point. Implementing D-15 means moving hit-testing out of per-circle handlers and into one
delegated pick (computed in `lib/geometry/`, per Rule 1) that runs on a single pointerdown listener
and finds the closest point whose enlarged radius contains the touch.

Station-spacing arithmetic (worked below) is reassuring for the outline viewer: even at the
UI-SPEC's own worst-case board (60" length, 25" widepoint), the tightest neighbouring pair of drag
points is comfortably wider apart on screen than a 44px target at every realistic phone render
scale this research modelled. The floor-of-18px fallback in the UI-SPEC is a safety margin, not
something the numbers below show is likely to be needed for the outline. The rocker's own four
points are also comfortably spaced in the *canonical* (pre-rotation) coordinate space that both
orientations share — rotation is a pure rotation, so it preserves point-to-point distance; the
open risk on ROCKER is entirely the frame-width problem above, not spacing between its four points.

**Primary recommendation:** Build the shared shell first exactly as the roadmap orders it, wire
the two breakpoint/pointer switches into `app/globals.css` before any per-screen work, and run the
rocker vertical-frame arithmetic in this document through `rockerViewLayout()` directly (a five-
minute Vitest/Node script) at the real device viewport heights before locking ROCKER's pinned-area
percentage — do not carry UI-SPEC's 45dvh figure into a plan unchecked.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Stacked vs. sidebar-beside-canvas layout | Browser/Client (CSS) | — | Pure CSS breakpoint (`shell:`/`max-shell:`), server-rendered both ways, no JS media query (UI-SPEC's own "no flash" requirement) |
| Touch target sizing (44px targets, 16px inputs) | Browser/Client (CSS) | — | `pointer: coarse` custom variant, orthogonal to the width breakpoint |
| Drag hit-testing / nearest-point-wins | Browser/Client (event handling) | `lib/geometry/` (pure pick function) | The pick itself must be pure and tested (Rule 1); the event wiring that calls it is a component concern |
| Hit-zone radius / station spacing | `lib/geometry/` (constants only) | Browser/Client (SVG radius) | The radius is a UI constant, not board geometry, but its *legality* (no overlap) depends on geometry the pure layer already computes |
| Drag readout chip (D-17) | Browser/Client (SVG overlay) | — | Reads the same `SliderRow` label/value strings; no new geometry |
| Viewport/`dvh` root, safe-area insets | Frontend Server (Next `viewport` export) + Browser/Client (CSS) | — | The `viewport` export is a Server Component export (`app/layout.tsx`); the `dvh`/`env()` consumption is CSS |
| Bottom tab bar / compact top bar navigation | Browser/Client | — | Client-side route links, same as today's `SiteNav` |
| Playwright test harness | Dev tooling (build-time only) | — | Never ships to the browser bundle; `devDependencies` only |
| Board math (outline/rocker/rail/fin/volume) | `lib/geometry/` | — | **Unchanged by this phase** — no formula in `lib/geometry/` may be edited; only new pure helpers (nearest-point pick) may be added |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@playwright/test` | 1.63.0 [VERIFIED: npm registry — `npm view @playwright/test version`, run 2026-09-08; published 2026-09-04] | Browser automation for layout + touch-drag tests | Official Microsoft package, already prescribed by CLAUDE.md/AGENTS.md ("Playwright remains prescribed") |

### Supporting
None — the phase's own inherited constraint is "no gesture library, no duplicate mouse handlers." No other package is needed: Tailwind v4's own `--breakpoint-*`/custom-variant mechanism covers both switches, and Pointer Events are a browser API already in use.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pointer Events (already in use) | Hammer.js / react-use-gesture / @use-gesture/react | Explicitly out of scope — REQUIREMENTS.md's "Out of Scope" list names "Any gesture library... the existing Pointer Events pattern and Base UI already do the job" |
| CDP touch-dispatch for the one Playwright touch test | `page.touchscreen.tap()` | `touchscreen` can only tap, not drag (see Code Examples/Playwright below) — insufficient for PHON-04's drag proof |

**Installation:**
```bash
npm i -D @playwright/test
npx playwright install --with-deps chromium webkit
```
Only `chromium` and `webkit` are needed: the recommended device profiles are one Android (Chromium
engine) and one iPhone (WebKit engine) — no `firefox` install is required for this phase's device
matrix.

**Version verification:** `npm view @playwright/test version` returned `1.63.0`, published
2026-09-04 per `npm view @playwright/test time.modified` [VERIFIED: npm registry, checked
2026-09-08].

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@playwright/test` | npm | This exact version published 4 days before this research (2026-09-04); package itself has shipped continuously for years | 54,399,047/week | `github.com/microsoft/playwright` | **SUS** (reason: `"too-new"`, from `gsd-tools query package-legitimacy check`) | Approved — see note below |

**Note on the SUS verdict:** the automated check flags `@playwright/test` `1.63.0` only because
*this specific patch version* was published within the tool's "too new" recency window — the
signals it also reports (54M weekly downloads, `deprecated: false`, official `microsoft/playwright`
repo, no suspicious `postinstall`) are unambiguous evidence this is the genuine, actively-maintained
Microsoft package, not a slopsquat. Per the Package Legitimacy Gate protocol, the SUS verdict still
stands and the planner must add a `checkpoint:human-verify` task before running `npm i -D
@playwright/test`, even though this researcher's own read of the signals is that it is a false
positive driven entirely by Playwright's own frequent release cadence, not by any property of the
package's trustworthiness.

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `@playwright/test` — planner must add
`checkpoint:human-verify` before the install task, per protocol.

## Architecture Patterns

### System Architecture Diagram

```
                     ┌─────────────────────────────────────────┐
                     │  app/layout.tsx (Server Component)       │
                     │  - viewport export (width/initialScale/  │
                     │    viewportFit/interactiveWidget)        │
                     │  - <html>/<body> height chain → dvh       │
                     └───────────────┬───────────────────────────┘
                                     │ renders (both branches, always)
                     ┌───────────────▼───────────────────────────┐
                     │  app/globals.css (@theme static)          │
                     │  - --breakpoint-shell: 820px  → shell: /  │
                     │    max-shell: variants                    │
                     │  - @custom-variant coarse (pointer:coarse)│
                     └───────────────┬───────────────────────────┘
                                     │ gates, via className alone
              ┌──────────────────────┼──────────────────────────┐
              ▼ max-shell (< 820px)                              ▼ shell (≥ 820px, unchanged)
  ┌───────────────────────────┐                     ┌─────────────────────────────┐
  │ Phone shell                │                     │ Desktop shell (today's)      │
  │ - compact top bar          │                     │ - SiteNav full link row      │
  │ - pinned drawing (dvh cap) │                     │ - aside (340px) + main (480+)│
  │ - scrolling controls       │                     │   BYTE-IDENTICAL             │
  │ - bottom tab bar           │                     └─────────────────────────────┘
  └──────────┬──────────────────┘
             │ both shells render the SAME underlying editor content
             ▼
  ┌────────────────────────────────────────────────────────────┐
  │ design-screen-shell.tsx (NEW — extracted from 5 editors)     │
  │  wraps: OutlineViewer / RockerViewer / RailSectionPlot /      │
  │         FinViewer / VolumeCalculationCard                    │
  └──────────────────────┬─────────────────────────────────────┘
                          │ pointer events (coarse gates radius/16px/readout only)
                          ▼
  ┌────────────────────────────────────────────────────────────┐
  │ outline-viewer.tsx / rocker-viewer.tsx                        │
  │  onPointerDown (NEW: delegated, nearest-point pick)           │
  │    → lib/geometry/{outline,rocker}-drag.ts (nearest pick, NEW)│
  │    → solveOutlineDrag / solveSideProfileDrag (UNCHANGED)      │
  │  onPointerMove/Up/Cancel (already svg-level, unchanged)       │
  └────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
components/design/
├── design-screen-shell.tsx   # NEW — the aside/main + phone stack extraction
components/outline/
├── outline-viewer.tsx        # touched: hit-zone radius, select-none/-webkit-touch-callout,
│                              #          delegated onPointerDown, readout chip
components/rocker/
├── rocker-viewer.tsx         # same touches, plus D-14's scope note (foil stays slider-only)
├── rocker-view-frame.ts      # touched only if the vertical frame's card-rail reserve changes
lib/geometry/
├── outline-drag.ts           # + nearestOutlineDragTarget (pure, tested)
├── rocker-drag.ts            # + nearestSideProfileDragTarget (pure, tested)
app/
├── layout.tsx                # + viewport export, dvh root
├── globals.css               # + --breakpoint-shell, @custom-variant coarse
e2e/                          # NEW — Playwright tests, outside vitest's lib/**, components/** globs
├── phone-layout.spec.ts
├── touch-drag.spec.ts
playwright.config.ts          # NEW
```

### Pattern 1: Width breakpoint via a custom `@theme` token (Tailwind v4)
**What:** Declaring `--breakpoint-shell: 820px` inside `@theme` (this codebase uses `@theme
static`, which only changes whether *unused* tokens still emit a CSS custom property — it does not
change variant generation) makes Tailwind v4 generate both a `shell:` (`@media (width >= 820px)`)
and a `max-shell:` (`@media (width < 820px)`) variant automatically, no extra configuration.
**When to use:** Any time a single breakpoint needs both a "wide" and "narrow" utility without a
duplicate raw `@media` rule.
**Example:**
```css
/* Source: https://tailwindcss.com/docs/responsive-design (Tailwind v4 custom breakpoints), fetched 2026-09-08 */
@theme static {
  --breakpoint-shell: 820px;
}
```
```html
<div class="hidden max-shell:flex">Phone-only bottom bar</div>
<div class="max-shell:hidden">Desktop link row</div>
```
[VERIFIED via WebFetch of tailwindcss.com/docs/responsive-design, 2026-09-08 — confirmed against
the installed `tailwindcss@4.3.3` [VERIFIED: `node_modules/tailwindcss/package.json`]]

### Pattern 2: Pointer-type gating via a custom variant
**What:** `@custom-variant coarse (@media (pointer: coarse))`, declared exactly beside the existing
`@custom-variant dark` block [VERIFIED: `app/globals.css:59-68`, quoted below], so `coarse:` gates
touch-only sizing independently of viewport width.
**When to use:** Any rule that must follow the pointer, not the width (44px targets, 16px inputs,
enlarged hit-zone radius, the drag readout chip, the construction-overlay default).
**Existing sibling to copy, quoted verbatim:**
```css
/* Source: app/globals.css:59-68 */
@custom-variant dark {
  &:where(.dark, .dark *) {
    @slot;
  }
  @media (prefers-color-scheme: dark) {
    &:where(:root:not(.light), :root:not(.light) *) {
      @slot;
    }
  }
}
```
[VERIFIED: `app/globals.css:59-68`]

### Pattern 3: The existing five-editor shell markup (what gets extracted)
Every one of the five editors currently repeats the same three-layer wrapper. Quoted verbatim from
each file so the planner can diff the extraction against a ground truth, not a paraphrase.

**`outline-editor.tsx`** [VERIFIED: `components/outline/outline-editor.tsx:186-227`]:
```tsx
<div className="flex min-h-0 w-full flex-1 flex-nowrap">
  {!wideView && (
    <aside className="flex h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] flex-col border-r border-surf-line-faint bg-surf-sidebar text-surf-ink">
      <div className="min-h-0 flex-1 overflow-y-auto p-10">{/* OutlineControls */}</div>
      {process.env.NODE_ENV === "development" && (
        <div className="flex-none border-t border-surf-line-faint p-4">{/* dev preset button */}</div>
      )}
    </aside>
  )}
  <main className={wideView ? "flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-0 bg-surf-canvas p-1" : "... p-3"}>
    <TabbedPanel bare={wideView} tabs={[{ id: "viewer", label: "VIEWER" }]} active="viewer">{/* viewerContent */}</TabbedPanel>
  </main>
</div>
```

**`rocker-editor.tsx`** — identical `aside`/`main` class strings [VERIFIED:
`components/rocker/rocker-editor.tsx:151-202`], two `TabbedPanel` tabs (VIEWER, DATASHEET) instead
of one, and its own `wideView` state, mirroring outline's byte for byte.

**`rail-band-editor.tsx`** — **one real difference**: the root `<div>` carries `data-print-hide`
[VERIFIED: `components/rails/rail-band-editor.tsx:208`], which `outline-editor.tsx`,
`rocker-editor.tsx`, `fin-placement-editor.tsx` and `volume-estimator.tsx` do **not** carry (that
attribute is read by `app/design/rails/actual-size.css`'s `@media print` rules — the shell
extraction must accept this attribute as an optional per-screen prop, not assume it can be dropped
or added to all five). The `aside`/`main` class strings are otherwise identical to outline's
[VERIFIED: `components/rails/rail-band-editor.tsx:214-242`]. Three tabs (VIEWER/DATA/INSTRUCTIONS),
no dev-only footer difference (rails has one too, same class string). `ViewFullSizedDialog` renders
inside the VIEWER tab, not outside the two-column root.

**`fin-placement-editor.tsx`** — identical `aside`/`main` [VERIFIED:
`components/fins/fin-placement-editor.tsx:129-165`], three tabs (VIEWER/DATA/MODEL INFO), and **one
element rendered outside the two-column root entirely**: `<ToeAimTableModal>` is a sibling of
`<aside>`/`<main>`, not nested in either [VERIFIED: `components/fins/fin-placement-editor.tsx:197-
203`]. The shell extraction must leave room for a "modal siblings" slot alongside its two columns,
or fins will need to keep this render outside the shared component.

**`volume-estimator.tsx`** — the one screen whose `<aside>` is **not** a `flex flex-col` wrapper
around a separately-scrolling inner div: `aside` itself carries `overflow-y-auto p-10` directly
[VERIFIED: `components/volume/volume-estimator.tsx:30`], because it has no dev-only footer to pin
below a scroller. One `TabbedPanel` tab ("ESTIMATE") with `panelClassName="overflow-y-auto"`
[VERIFIED: `components/volume/volume-estimator.tsx:42`] — Volume is also the only screen whose
`main` region itself needs to scroll (no drawing to pin), which is why the UI-SPEC's phone table
gives VOLUME "none — one column, card then controls" rather than a pinned/scroll split.

**What could break a "desktop-pixel-identical" extraction, concretely:**
- Dropping the `data-print-hide` attribute on RAILS (would put the sidebar/tab-strip on the printed
  View Full Sized page — the exact regression `08-07-PLAN.md` already fixed once, quick task
  `260908-q0n`).
- Forcing every `aside` into the `flex-col` + separate-scroll-div shape (VOLUME's aside is
  currently a single scrolling block; wrapping it identically-but-differently could still be pixel-
  identical, but only if verified — see Environment Availability below on the
  Playwright-screenshot-diff mechanism the UI-SPEC recommends).
- Losing the fins-only "sibling outside the two columns" slot (`ToeAimTableModal`) — if the shell
  only accepts two children (aside content, main content), fins has nowhere to put this dialog.
- The dev-only "Copy preset values" footer exists on outline/rocker/rails/fins but genuinely absent
  on volume (no `process.env.NODE_ENV === "development"` block in `volume-estimator.tsx` at all) —
  the shell must make this footer optional, not assumed-present.

### Pattern 4: Pointer Events drag, today's exact shape (what D-15/D-16/PHON-04 build on)
Both viewers already implement one pointer path for mouse and touch — no separate touch handlers
exist to remove, only to enlarge/restructure. Quoted verbatim:

```tsx
// Source: components/outline/outline-viewer.tsx:642-654 (rocker-viewer.tsx:930-943 is the same shape)
{dragTargets.map((d) => (
  <circle
    key={d.target}
    cx={d.cx}
    cy={d.cy}
    r={DRAG_HIT_PX * handleUnit}
    fill="transparent"
    className="cursor-grab touch-none active:cursor-grabbing"
    onPointerDown={(event) => handleDragStart(d.target, event)}
  />
))}
```
[VERIFIED: `components/outline/outline-viewer.tsx:644-654`, `components/rocker/rocker-viewer.tsx:
933-943`]

`onPointerMove`/`onPointerUp`/`onPointerCancel` are already attached once, at the `<svg>` root, not
per-circle [VERIFIED: `components/outline/outline-viewer.tsx:540-542`,
`components/rocker/rocker-viewer.tsx:753-755`], and `handleDragStart` already calls
`event.currentTarget.setPointerCapture(event.pointerId)` [VERIFIED:
`components/outline/outline-viewer.tsx:408-413`, `components/rocker/rocker-viewer.tsx:726-731`].

**What is missing today, confirmed absent by reading both files in full:**
- No `select-none` or `-webkit-touch-callout: none` anywhere in either viewer or on the `<svg>`
  root — this is exactly what will produce the long-press text-selection popup PHON-04 forbids.
- No `onKeyDown`/`tabIndex` on any hit circle — there is no keyboard-drag feature to preserve or
  break. **PHON-05's "keyboard operation... exactly as they do today" refers to the sidebar's
  ordinary focusable controls (sliders, buttons, typed fields via `SliderRow`/`measure-field.tsx`/
  `components/ui/button.tsx`), not to any keyboard-operable drag on the SVG points — none exists.**
  A plan that tries to "preserve" SVG keyboard-drag behaviour would be preserving something that
  was never built.
- `event.preventDefault()` is already called in `handleDragStart` on both viewers [VERIFIED:
  `components/outline/outline-viewer.tsx:410`, `components/rocker/rocker-viewer.tsx:728`], which
  helps but does not by itself suppress the iOS long-press-to-select-text callout on the underlying
  text/SVG — that needs the explicit `-webkit-touch-callout: none`/`select-none` CSS.
- Hit-testing is per-circle (native SVG event dispatch), never a shared distance computation — see
  the D-15 restructuring note in Common Pitfalls.

### Anti-Patterns to Avoid
- **Adding a gesture library for the touch drag:** explicitly out of scope (REQUIREMENTS.md); the
  existing Pointer Events path already does everything D-14/D-15/D-16 need.
- **A JS `matchMedia` check driving the stacked-vs-desktop layout:** the UI-SPEC is explicit that
  both shells render server-side, gated by CSS class alone (`hidden max-shell:flex` /
  `max-shell:hidden`) — a JS-driven layout switch would reintroduce the flash-of-wrong-layout the
  contract exists to avoid.
- **Sizing the pinned drawing area purely from a fixed `dvh` percentage without checking the
  frame's own aspect ratio against it** — this is exactly Common Pitfall 1 below.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-touch input | A custom touch event abstraction, or a gesture library | The existing Pointer Events + `setPointerCapture` path | Already proven on both viewers; unifying mouse/touch in one code path is the whole point of Pointer Events |
| Responsive breakpoint switching | A `useMediaQuery` hook + conditional render | Tailwind v4's `--breakpoint-*` token + `shell:`/`max-shell:` variants | Zero-JS, no hydration flash, matches the codebase's existing "declared once in `@theme static`" convention |
| Touch-vs-mouse styling | `navigator.maxTouchPoints`/UA sniffing | `@custom-variant coarse (@media (pointer: coarse))` | CSS media feature is the correct signal for "does this pointer benefit from bigger targets", independent of device class |
| Simulating a mobile drag in tests | A third-party Playwright touch-gesture plugin | Chromium's own CDP `Input.dispatchTouchEvent` via `context.newCDPSession()` | First-party API, documented by Playwright itself, no added dependency |
| Nearest-point hit-testing | Reaching for a spatial-index/quadtree library | A plain `Math.hypot` loop over 4-5 points | The point counts here are 4 (rocker) and 5 (outline) — an O(n) scan is the correct-complexity solution, not premature optimisation |

**Key insight:** every "don't hand-roll" in this phase resolves to "the tool is already in the
codebase or the platform" — this phase's actual risk is arithmetic and layout-composition
correctness (the rocker aspect ratio, the desktop-pixel-identical extraction), not missing
capability.

## Common Pitfalls

### Pitfall 1: The ROCKER vertical frame's aspect ratio fights a fixed dvh ceiling
**What goes wrong:** D-09 requires the ROCKER screen to render nose-up (`orientation="vertical"`)
on a portrait phone, exactly like TEMPLATE. But unlike TEMPLATE's vertical frame (aspect ratio
≈0.81, width:height), ROCKER's vertical frame reserves a fixed-ceiling card-rail band on **both**
sides of the board along the cross axis, while the long axis is the board's full length scaled to
fill `VIEW_W - 2*PAD_X = 820` units [VERIFIED: `components/rocker/rocker-view-frame.ts:219-221,
367, 502-505`]. Working the actual formula through for a 72" board with `fitToBoard: true`,
`stationRails: "full"` (exactly what `rocker-editor.tsx` passes [VERIFIED:
`components/rocker/rocker-editor.tsx:235-243`]):
- `scale = 820 / 72 = 11.389`
- `maxDeckIn = ROCKER_LIFT_RANGE_IN.max (9) + FOIL_THICKNESS_RANGE_IN.max (5) = 14` [VERIFIED:
  `lib/geometry/rocker.ts:117`, `lib/geometry/foil.ts:38`]
- Vertical frame's cross-axis (`width` field) ≈ `maxDeckIn*scale + ~389` (constant card/gutter/gap
  terms) ≈ `159 + 389 = 548` units
- Vertical frame's long-axis (`height` field) ≈ `boardSpan (820) + maxCardHeight (~74) + 8 ≈ 902`
  units
- **Frame aspect ratio ≈ 548:902 ≈ 0.61** — noticeably narrower/taller than TEMPLATE's 0.81.

At the UI-SPEC's own 45dvh ceiling, on a typical phone this is height-bound (the SVG's
`preserveAspectRatio="xMidYMid meet"` fit picks `min(containerW/frameW, containerH/frameH)`, and
`containerH/frameH` is the smaller term whenever the pinned-area height budget is anywhere near
45% of a normal phone screen). Illustrative numbers: a 375×~315px pinned box against this 548×902
frame renders at scale ≈0.35, drawing only ≈191px wide out of the 375px available — **about half
the screen's width goes unused**, directly contradicting PHON-06 ("board drawings use the full
phone width").
**Why it happens:** the rocker viewer's card-rail reservation (`cardBandDepth`, `maxCardPinScale`)
was designed and tuned entirely for the desktop editor's fixed-aspect panel, never for a
height-capped phone box; nobody has yet run this module's own math against a phone-sized frame.
**How to avoid:** before locking ROCKER's pinned-area percentage in a plan, run
`rockerViewLayout({ lengthIn: 72, maxDeckIn: 14, orientation: "vertical", fitToBoard: true,
stationRails: "full" })` directly (a five-minute script, or a new Vitest case) to get the exact
`width`/`height`, then check `min(deviceWidth/width, budgetHeight/height)` against real device
viewport heights (iPhone SE 667px, iPhone 14 844px, minus the compact top bar/bottom tab
bar/safe-area). If it's height-bound short of full width, the plan needs one of: (a) a taller
ceiling for ROCKER (closer to TEMPLATE's 66dvh, or higher), (b) a narrower card-rail reservation on
phones specifically (a new `rockerViewLayout` input, which is new layout code, not just wiring), or
(c) confirming with the founder that ROCKER's phone reading is acceptable narrower-than-full-width
given the trade-off. This is squarely inside CONTEXT.md's own warning: "a phone layout that 'works'
by hiding a control is a regression" — a drawing that shrinks well inside its available width has
the same flavour of failure even though nothing is hidden.
**Warning signs:** any plan that copies UI-SPEC's "up to 45dvh" table cell into a task without a
citation to a script run against `rocker-view-frame.ts`'s real output.

### Pitfall 2: Native SVG hit-testing does not implement "nearest wins" for overlapping circles
**What goes wrong:** today, each drag point's transparent hit-circle carries its own
`onPointerDown` [VERIFIED: `components/outline/outline-viewer.tsx:644-654`]. When two circles
overlap (exactly what enlarging `DRAG_HIT_PX` from 15 to 22 is expected to cause on tight boards),
a pointerdown inside the overlap region is delivered to whichever circle the browser's hit-testing
picks — in SVG this is normally the topmost element in paint order (later in the DOM), **not**
whichever circle's centre is closer to the touch point. This can silently violate D-15 even after
the radius is enlarged correctly.
**Why it happens:** the current code was written when 15px circles never overlapped at desktop
scale, so per-element `onPointerDown` was sufficient and simpler.
**How to avoid:** move the pick to one delegated handler — either on the `<svg>` root (already
holds `onPointerMove`/`onPointerUp`) or a single full-canvas invisible pointer-catcher rendered
above the drag targets — that converts the touch point to board coordinates (`toBoardPoint`,
already exists) and calls a new pure function (`nearestOutlineDragTarget`/
`nearestSideProfileDragTarget` in `lib/geometry/outline-drag.ts`/`rocker-drag.ts`, per Rule 1) which
returns the closest target whose enlarged radius contains the point, ties broken by enumeration
order (per the UI-SPEC's own tie rule). The per-circle `onPointerDown` handlers should be removed
in favour of this one delegated pick, or reduced to a mouse-only fast path (mouse targets never
overlap at 15px, so leaving per-circle handlers for the unprefixed/non-`coarse` case is a legitimate
option, but the `coarse:`-enlarged case must go through the delegated pick).
**Warning signs:** a plan that adds only a CSS/prop change to the existing per-circle `onPointerDown`
without adding a new function to `lib/geometry/` is very likely not actually implementing D-15,
only enlarging the radius.

### Pitfall 3: iOS long-press callout is not suppressed anywhere today
**What goes wrong:** neither viewer sets `select-none` or `-webkit-touch-callout: none` anywhere
[confirmed absent by full read of both files]. A long touch-and-hold on a drag point (or on the SVG
text near it) will trigger iOS Safari's text-selection/callout popup mid-drag, exactly the failure
PHON-04 names.
**Why it happens:** these properties were never needed until now — desktop has no long-press
gesture.
**How to avoid:** add `select-none` (Tailwind utility, already used elsewhere in the codebase, e.g.
`components/ui/slider.tsx:30`) and an explicit `WebkitTouchCallout: "none"` inline style (Tailwind
has no built-in utility for this vendor property) on every draggable hit-circle **and**,
defensively, the drawing's root `<svg>` — per CONTEXT.md's own inherited-constraint wording.
**Warning signs:** a plan that adds `select-none` only to the hit-circles and skips the SVG root,
when the phase's own constraint list explicitly calls out both.

### Pitfall 4: iOS zoom-on-input-focus should be fixed with font-size, never with `maximumScale`/`userScalable`
**What goes wrong:** the two most commonly reached-for fixes for iOS auto-zooming a focused input
are (a) setting the input's `font-size` to ≥16px, or (b) disabling zoom entirely via
`maximum-scale=1, user-scalable=no` in the viewport meta tag. UI-SPEC has already chosen (a) — the
`coarse:text-base` (16px) rule on typed fields — but a planner unfamiliar with the tradeoff could
be tempted to also add `maximumScale`/`userScalable` "just to be safe."
**Why it happens:** both fixes visibly solve the same symptom, so they look interchangeable.
**How to avoid:** do **not** set `maximumScale`/`userScalable` in the `viewport` export. Disabling
pinch-zoom is a WCAG 2.1 Success Criterion 1.4.4 (Resize Text) violation — it removes a shaper's
ability to zoom for any reason, not just to escape the auto-zoom, and the 16px-input fix alone is
sufficient and is what the UI-SPEC already specifies. The `viewport` export in this phase should
carry `width`, `initialScale`, `viewportFit`, and (per D-06's safe-area need) `interactiveWidget` —
nothing that disables scaling. [CITED: css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom,
searched 2026-09-08 — "Using maximum-scale and user-scalable=no kills the user's ability to
pinch-zoom for any reason, which violates WCAG 2.1 1.4.4"]
**Warning signs:** any `viewport` export literal containing `maximumScale` or `userScalable`.

### Pitfall 5: `data-print-hide` and the fins-only modal are easy to lose in a naive shell extraction
**What goes wrong:** see Architecture Pattern 3 above — RAILS' `data-print-hide` root attribute and
FINS' `ToeAimTableModal` sibling are the two structural exceptions to an otherwise-identical
five-screen shell. A shell component that hard-codes "wrap exactly `aside` + `main`, nothing else"
will either drop the print-hide behaviour (regressing the fix in quick task `260908-q0n`) or leave
FINS with nowhere to render its modal.
**How to avoid:** design the shell's props to accept an optional root `data-*` passthrough and an
optional "outside the two columns" children slot from the start, verified against all five editors
before considering the extraction done.

## Code Examples

### The `viewport` export this phase needs (Next 16, verified field names)
```tsx
// Source: node_modules/next/dist/lib/metadata/types/extra-types.d.ts:45-54 (Viewport fields),
// node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};
```
The exact `ViewportLayout` shape, quoted verbatim: `width?: string | number`, `height?: string |
number`, `initialScale?: number`, `minimumScale?: number`, `maximumScale?: number`, `userScalable?:
boolean`, `viewportFit?: 'auto' | 'cover' | 'contain'`, `interactiveWidget?: 'resizes-visual' |
'resizes-content' | 'overlays-content'` [VERIFIED:
`node_modules/next/dist/lib/metadata/types/extra-types.d.ts:45-54`]. Per Pitfall 4, this phase's
export should carry none of `maximumScale`/`userScalable`. `interactiveWidget` choice
(`resizes-content` vs the default `resizes-visual`) affects whether the bottom tab bar visually
sits above the iOS keyboard or gets covered by it — this is a planner decision the UI-SPEC doesn't
settle explicitly; `resizes-content` is the safer default for a bottom-anchored bar since it keeps
layout height in sync with the visible viewport rather than leaving the tab bar under the keyboard.

### Delegated nearest-point pick (the shape D-15 needs; not yet in the codebase)
```ts
// New function, alongside outlineDragPoints/solveOutlineDrag in lib/geometry/outline-drag.ts —
// pure, testable in isolation, per Rule 1.
export function nearestOutlineDragTarget(
  points: OutlineDragPointAt[],
  touch: OutlineDragPoint,
  hitRadiusMm: Mm,
): OutlineDragTarget | null {
  let best: OutlineDragTarget | null = null;
  let bestDistSq = Infinity;
  for (const p of points) {
    const dx = p.point.station - touch.station;
    const dy = p.point.halfWidth - touch.halfWidth;
    const distSq = dx * dx + dy * dy;
    if (distSq <= hitRadiusMm * hitRadiusMm && distSq < bestDistSq) {
      best = p.target;
      bestDistSq = distSq;
    }
  }
  return best; // enumeration order in outlineDragPoints() already breaks ties deterministically
}
```

### Playwright touch drag via CDP (Chromium only — see rationale below)
```ts
// Source: pattern confirmed across Playwright's own touch-events docs and community examples
// [CITED: playwright.dev/docs/touch-events; github.com/arjunattam/playwright-touch-events;
// searched 2026-09-08]. Chromium-only: Input.dispatchTouchEvent is a CDP method with no WebKit
// equivalent exposed through Playwright.
const cdp = await page.context().newCDPSession(page);
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [{ x: startX, y: startY }],
});
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchMove",
  touchPoints: [{ x: endX, y: endY }],
});
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchEnd",
  touchPoints: [],
});
```
**Why Chromium, and why this over `page.dispatchEvent`:** `page.touchscreen` can only `tap()`, not
drag [CITED: playwright.dev/docs/api/class-touchscreen, searched 2026-09-08 — "The Touchscreen
class is limited to emulating tap gestures"]. `locator.dispatchEvent('pointerdown', {pointerType:
'touch', ...})` is a *synthetic* DOM event (`isTrusted: false`) that does not reliably interact with
real `setPointerCapture()` redirection the way a browser-native input does, and it does not exercise
the real OS/browser touch pipeline the app's `touch-action: none`/coarse-pointer CSS depends on.
Chromium's CDP `Input.dispatchTouchEvent` is trusted, native-pipeline input, which is why it is the
standard recommended approach for this exact gap; it is Chromium-only, which is precisely why the
UI-SPEC's Android (Chromium) device profile, not the iPhone (WebKit) one, should carry the one
required touch-drag test (TEST-01 only requires it on "at least the outline viewer" — it does not
require it on both engines).

### Playwright config shape
```ts
// playwright.config.ts — new file
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: "http://localhost:3100" },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 14"] } },   // defaultBrowserType: webkit
    { name: "android", use: { ...devices["Pixel 7"] } },    // defaultBrowserType: chromium
  ],
});
```
Port `3100` (not `3000`) avoids colliding with a shaper's own `npm run dev` per CLAUDE.md's own dev
workflow. `devices['iPhone 14']` and `devices['Pixel 7']` each bundle a `defaultBrowserType` —
WebKit for the iPhone profile, Chromium for the Pixel profile [CITED: Playwright's own
`deviceDescriptorsSource.json`, via WebSearch 2026-09-08 — "Each descriptor bundles the five
emulation options plus a default browser engine: WebKit for Apple devices, Chromium for Android
ones"] — so `npx playwright install --with-deps chromium webkit` covers both projects without a
`firefox` install.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `middleware.ts` for Clerk | `proxy.ts` | Next.js 16 rename | Already correctly migrated in this repo [VERIFIED: `proxy.ts:1-4`, comment cites the exact Next 16 doc path] — no action needed this phase, noted only because AGENTS.md warns this is a breaking-change area |
| `100vh` for full-viewport height | `100dvh` (dynamic viewport height) | Mobile-Safari-toolbar-aware unit, already precedented once in this codebase (`components/template/export-preview-dialog.tsx:231`, `components/rails/view-full-sized-dialog.tsx:134`) | This phase extends the same pattern to the root `<html>`/`<body>` height chain, which today is plain `h-full` [VERIFIED: `app/layout.tsx:69,94`] |

**Deprecated/outdated:** nothing else in this phase's domain — the codebase's own patterns
(Pointer Events, Tailwind v4 `@theme`, Next `viewport` export) are all current.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The illustrative pinned-area height budgets used in Pitfall 1's arithmetic (e.g. "~315px available at 45dvh on a ~700px-tall viewport") are estimates, not measured against a real compact-top-bar + bottom-tab-bar + safe-area height, which do not exist yet | Common Pitfalls / Pitfall 1 | If real chrome heights differ meaningfully, the exact render scale changes, but the *qualitative* finding (ROCKER's vertical frame is narrower-than-tall and will tend to go height-bound before TEMPLATE's does) holds regardless — chrome height differences change the severity, not the direction, of the problem |
| A2 | The outline/rocker station-spacing worked examples used the UI-SPEC's own default rail-length/angle/fullness/smoothness/flatness values at the extreme length+width combination, since the phase's own instruction ("shortest length paired with widest widepoint") does not specify the other sliders | Standard Stack / Common Pitfalls (spacing arithmetic in Summary) | A shaper could set an even more extreme combination of angle/fullness sliders that tightens spacing further at some station; the UI-SPEC's own fallback (shrink radius to an 18px floor, then lean on D-15) already anticipates this and does not depend on this research's specific numbers being exhaustive |
| A3 | `interactiveWidget: "resizes-content"` is recommended over the platform default (`resizes-visual`) for the bottom tab bar's keyboard interaction, but this was not explicitly settled in CONTEXT.md or the UI-SPEC | Code Examples / viewport export | If wrong, a focused typed field on a phone could leave the bottom tab bar visually behind the on-screen keyboard rather than above it — a minor layout defect, not a functional break, and easily corrected by flipping one literal |

**If this table is empty:** N/A — three items above need confirmation but none blocks planning;
they are documented so a plan can state its own choice explicitly rather than silently inheriting
an unverified default.

## Open Questions

1. **Does the UI-SPEC's 45dvh ROCKER pinned-area figure survive contact with `rocker-view-frame.ts`'s real numbers?**
   - What we know: the exact formula and a worked example at 72" length (Pitfall 1 above) shows the
     vertical frame is aspect-ratio 0.61 (narrower than TEMPLATE's 0.81), which tends toward
     height-bound rendering at a fixed dvh ceiling.
   - What's unclear: the exact chrome heights (compact top bar + bottom tab bar + safe-area inset)
     that will actually ship, which this research could not measure because they don't exist yet.
   - Recommendation: the planner should run `rockerViewLayout()` against the real, decided chrome
     heights for at least an iPhone SE-class (667px tall) and iPhone 14-class (844px tall) viewport
     before finalising ROCKER's pinned-area percentage, and adjust the ceiling (not just accept a
     narrower-than-full-width drawing) if the numbers come out as this research's estimate suggests.

2. **Should the phone's rocker pinned area draw the drag points/construction overlay at all if the frame math forces a very small drawing?**
   - What we know: D-02 mandates the overlay on by default on touch for both TEMPLATE and ROCKER;
     nothing in CONTEXT.md or the UI-SPEC conditions this on drawing size.
   - What's unclear: whether a drawing rendered well under full width (per Open Question 1, if
     unresolved) would make the enlarged 22px hit-zones start overlapping in practice, even though
     the canonical-space arithmetic in this document shows healthy spacing before any render-scale
     shrinkage is applied.
   - Recommendation: resolve Open Question 1 first; if the resulting render scale is materially
     smaller than this research's illustrative 0.35-0.72 range, re-run the spacing arithmetic in
     Summary at the actual resolved scale before locking the hit-zone radius for ROCKER specifically
     (TEMPLATE's numbers are not at similar risk, per the arithmetic already shown).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@playwright/test` | TEST-01 | ✗ (not yet installed) | latest is 1.63.0 | None — this is the phase's own installation task |
| Chromium (Playwright browser) | Android device profile, CDP touch-drag test | ✗ (installed via `npx playwright install`) | bundled with 1.63.0 | None needed — install step is part of the phase |
| WebKit (Playwright browser) | iPhone device profile, layout-only tests | ✗ (installed via `npx playwright install`) | bundled with 1.63.0 | None needed |
| Real iPhone/Android hardware | Real-device Safari toolbar check (mentioned in Validation Architecture below, manual) | Not verified in this session | — | Phase 10 owns the real-device end-to-end pass (PHON-10); this phase's own manual check can substitute a physical device the founder has on hand, or emulator/simulator as a lesser fallback |

**Missing dependencies with no fallback:** none — `@playwright/test` and its browsers are the
phase's own install task, not a pre-existing gap.

**Missing dependencies with fallback:** real hardware for the Safari-toolbar-behaviour manual check
— any physical iPhone (or, failing that, Xcode Simulator/a real Android device) suffices for this
phase's own manual verification; the *automated* proof (TEST-01) does not require real hardware at
all, only Playwright's device emulation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 [VERIFIED: `package.json` devDependencies] for `lib/`/`components/**/*.test.ts`; `@playwright/test` 1.63.0 (new, this phase) for `e2e/` |
| Config file | `vitest.config.ts` (existing, `include: ["lib/**/*.test.ts", "components/**/*.test.ts"]` [VERIFIED: `vitest.config.ts:6`]); `playwright.config.ts` (new, `testDir: "./e2e"`) |
| Quick run command | `npm test` (vitest); `npx playwright test --project=android e2e/touch-drag.spec.ts` (one Playwright spec) |
| Full suite command | `npm test` (all geometry suites) + `npx playwright test` (all phone/device projects) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|-------------|
| PHON-01 | Every desktop control reachable on phone, nothing overlapping | Playwright layout/screenshot | `npx playwright test e2e/phone-layout.spec.ts` | ❌ Wave 0 |
| PHON-02 | Page fits phone's visible area, `dvh`-aware, no trapped scroll | Playwright viewport-resize assertion | `npx playwright test e2e/phone-layout.spec.ts` | ❌ Wave 0 |
| PHON-03 | 44px-class targets; typed number field does not zoom | Playwright bounding-box + computed-style assertions | `npx playwright test e2e/touch-sizing.spec.ts` | ❌ Wave 0 |
| PHON-04 | Thumb drag on outline/rocker points; no long-press popup; no overlap | Playwright CDP touch-drag (Chromium/Android project) | `npx playwright test --project=android e2e/touch-drag.spec.ts` | ❌ Wave 0 |
| PHON-05 | Desktop mouse drag + keyboard operation unchanged | (a) Playwright desktop-viewport mouse-drag test, (b) manual mouse/keyboard pass on every touched viewer | `npx playwright test e2e/desktop-regression.spec.ts` (Playwright); manual pass documented in each plan's verification | ❌ Wave 0 |
| PHON-06 | Drawings use full phone width | Playwright bounding-box-vs-viewport-width assertion | `npx playwright test e2e/phone-layout.spec.ts` | ❌ Wave 0 |
| TEST-01 | Playwright installed with iPhone+Android profiles; layout+touch-drag proven | Meta-requirement — covered by the above | `npm i -D @playwright/test && npx playwright test` | ❌ Wave 0 |
| Nearest-point-wins (D-15) | Pure function correctness at overlapping-circle boundary cases | Vitest unit test | `npm test -- outline-drag` / `npm test -- rocker-drag` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` (fast, existing geometry suites — must stay green per CLAUDE.md)
  plus the single most relevant new Playwright spec, run headed/against the dev server locally.
- **Per wave merge:** full `npm test` + full `npx playwright test` (both projects).
- **Phase gate:** full suite green, **plus** the manual desktop mouse/keyboard regression pass
  (PHON-05) explicitly recorded in the executing plan's verification, **plus** a real-device Safari
  toolbar check before this phase is called done — DevTools/emulator viewport resizing does not
  reproduce the actual `dvh` recalculation Safari's disappearing toolbar triggers.

### Wave 0 Gaps
- [ ] `playwright.config.ts` — framework install and config, none exists today
- [ ] `e2e/` directory — none exists today; must sit outside `vitest.config.ts`'s
      `lib/**/*.test.ts`/`components/**/*.test.ts` globs, which it automatically does by living at
      the repo root
- [ ] `e2e/phone-layout.spec.ts` — covers PHON-01, PHON-02, PHON-06
- [ ] `e2e/touch-sizing.spec.ts` — covers PHON-03
- [ ] `e2e/touch-drag.spec.ts` — covers PHON-04, using the Chromium/Android project and CDP touch
      dispatch (see Code Examples)
- [ ] `e2e/desktop-regression.spec.ts` — covers PHON-05's automated half; standing proof that
      desktop mouse-drag still works after every phone change
- [ ] `lib/geometry/outline-drag.test.ts` / `rocker-drag.test.ts` — extend with cases for the new
      nearest-point pick function, including an explicit overlapping-circles tie case

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | This phase touches no auth surface; `proxy.ts` already keeps every route open (D-01, unchanged) [VERIFIED: `proxy.ts:1-27`] |
| V3 Session Management | No | Unchanged |
| V4 Access Control | No | Unchanged — confirmed `/design/outline` (and every design route) is reachable signed-out via `clerkMiddleware()` with no `.protect()` call anywhere [VERIFIED: `proxy.ts:16`, comment: "calls no `.protect()` anywhere... D-01 keeps every route in the app open to a signed-out shaper"], which is also why the Playwright tests in this phase need no authentication setup |
| V5 Input Validation | Marginal | The drag readout/nearest-point pick take pointer coordinates already bounded by SVG viewBox math and existing `quantise`/clamp logic in `outline-drag.ts`/`rocker-drag.ts` (unchanged) — no new unvalidated input surface is introduced |
| V6 Cryptography | No | Not applicable to this phase |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Untrusted/synthetic touch-event injection via dev tools (real users, not this app's own code) | Tampering | Out of scope — this is a client-rendered board editor with no server-trusted state derived from pointer coordinates; a manipulated drag can only mis-set the shaper's own local board fields, which the store's existing clamp/quantise logic already bounds |
| XSS via `dangerouslySetInnerHTML`/`document.write` on the new touch UI (readout chip, tab bar) | Tampering/Information Disclosure | Continue the existing posture: no string-built SVG markup, no raw HTML injection anywhere in this phase's new code (matches `outline-viewer.tsx`'s and `rocker-viewer.tsx`'s own documented threat posture, T-QO-01) |

## Sources

### Primary (HIGH confidence)
- `components/outline/outline-viewer.tsx`, `components/rocker/rocker-viewer.tsx`,
  `components/rocker/rocker-view-frame.ts`, `lib/geometry/outline.ts`, `lib/geometry/outline-drag.ts`,
  `lib/geometry/rocker.ts`, `lib/geometry/rocker-drag.ts`, `lib/geometry/board.ts`,
  `lib/geometry/foil.ts`, `components/viewer/callout-primitives.tsx` — all read in full this
  session; every board-geometry number in this document was hand-traced from these files' actual
  formulas, not estimated.
- `components/outline/outline-editor.tsx`, `components/rocker/rocker-editor.tsx`,
  `components/rails/rail-band-editor.tsx`, `components/fins/fin-placement-editor.tsx`,
  `components/volume/volume-estimator.tsx` — read in full for the shell-extraction comparison.
- `app/globals.css` (breakpoint/theme sections), `app/layout.tsx`, `app/design/layout.tsx`,
  `proxy.ts`, `package.json`, `vitest.config.ts`, `components/settings-menu.tsx`,
  `components/site-nav.tsx`, `components/design/save-button.tsx`, `components/design/measure-field.tsx`,
  `components/ui/slider.tsx`, `components/viewer/tabbed-panel.tsx`, `components/auth/nav-auth-control.tsx`
  — all read in full this session.
- `node_modules/next/dist/lib/metadata/types/extra-types.d.ts` — the authoritative `Viewport` type
  shape for this installed Next.js version.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md` — the
  official bundled Next.js 16 docs for the `viewport` export.
- `npm view @playwright/test version` / `time.modified` — run directly this session, 2026-09-08.
- `gsd-tools query package-legitimacy check --ecosystem npm @playwright/test` — run this session.

### Secondary (MEDIUM confidence)
- tailwindcss.com/docs/responsive-design, fetched via WebFetch 2026-09-08, cross-checked against
  the installed `tailwindcss@4.3.3` — custom-breakpoint `max-*` variant generation.
- Playwright's `deviceDescriptorsSource.json` content, css-tricks.com's 16px-input-zoom article,
  playwright.dev's touch-events/touchscreen docs — all found and quoted via WebSearch 2026-09-08,
  each corroborated by multiple independent results in the same search.

### Tertiary (LOW confidence)
- None — every claim in this document is either a direct file read (this session) or a WebFetch/
  WebSearch result cross-checked against at least one other independent source in the same query.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — one new dependency (`@playwright/test`), version and publish date directly
  checked against the npm registry this session.
- Architecture: HIGH for the shell-extraction and breakpoint mechanics (all read from source);
  MEDIUM for the exact ROCKER phone render scale (Pitfall 1's numbers are a worked formula, correct
  in kind, but depend on chrome heights not yet decided — see Assumption A1/Open Question 1).
- Pitfalls: HIGH — all five pitfalls are grounded in code actually read this session, not general
  mobile-web folklore (the touch-callout and nearest-point-wins findings in particular came directly
  from reading both viewers' full pointer-event wiring).

**Research date:** 2026-09-08
**Valid until:** 30 days for the architecture/pitfalls sections (stable, in-repo code); the
Playwright version pin should be re-checked at plan time if more than a few days pass, given the
package's own fast release cadence noted in the Package Legitimacy Audit.
