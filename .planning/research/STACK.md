# Stack Research

**Domain:** Touch-first responsive support + a ported instructions/print/full-size-view feature for an existing Next.js 16 / React 19 / Tailwind v4 surfboard-design app
**Researched:** 2026-09-07
**Confidence:** HIGH (versions and API shapes verified directly against `node_modules` in this repo and against npm registry; Base UI touch-fix changelog and Tailwind v4 container-query docs verified via web search)

This is a **subsequent-milestone** stack note. It only covers what v1.2 (Rails Finished, Phone Ready)
adds on top of the stack already in `package.json` — it does not re-litigate Next.js, React, Tailwind,
Clerk, Drizzle, or Vitest, all already installed and working.

## Recommended Stack

### Core additions

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| *(none — native APIs)* | Pointer Events + `touch-action` CSS | Drag SVG handles under mouse, pen and finger on outline, rocker, rail-band and fin screens | **Do not add a gesture library.** `outline-viewer.tsx` already implements the exact pattern needed: `onPointerDown` → `event.currentTarget.setPointerCapture(event.pointerId)` → `onPointerMove`/`onPointerUp`, with a `touch-action: none` comment already present on the draggable circle ("stops a touch drag scrolling the page instead of shaping the board"). The Pointer Events spec unifies mouse/touch/pen into one event model and `setPointerCapture` is exactly the primitive that makes a single-finger SVG drag work without a library — it is supported in every browser this app targets (Safari iOS 13+, Chrome, Firefox). The rocker viewer already follows the same pattern. Rails-screen drag targets (rail band control points, if any become draggable) and any new touch surfaces should copy this file's pattern, not introduce a new dependency. |
| `@playwright/test` | `^1.63.0` | E2E + device-emulation testing across the touch-first surface | Already prescribed in `AGENTS.md`/`CLAUDE.md` ("Playwright remains prescribed but not yet installed") and now justified: this milestone's actual deliverable is *touch working on real device viewports*, which Vitest (jsdom-less, node environment) cannot exercise — jsdom has no touch/pointer capture, no CSS layout, no viewport. Playwright's built-in device registry (`playwright.devices['iPhone 13']`, `devices['iPhone 13'].isMobile`, `hasTouch: true`) drives exactly the touch + narrow-viewport interactions this milestone needs to prove: dragging an SVG handle with a synthesized touch, using a Slider with a thumb, opening the full-size rail modal on a small screen. `^1.63.0` is current on npm as of this research; browsers are downloaded via `npx playwright install`. |

### What is genuinely new to the dependency tree

**Nothing.** The correct answer for both major asks (touch dragging, and rails-screen completion) is
zero new runtime dependencies, plus one new *dev* dependency (`@playwright/test`) that was already
on the roadmap. See "What NOT to Use" below for the specific libraries this milestone should
deliberately skip.

### Supporting Libraries (already installed — usage clarified for this milestone)

| Library | Version (installed) | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@base-ui/react` | `^1.7.0` (npm latest `1.8.0`, both satisfy the caret) | Slider, Dialog, Tabs, AlertDialog, Select, Checkbox, Separator, Input, Button primitives | Base UI has been actively hardening touch behaviour through 2026: v1.1.0 (Jan 2026) fixed a Safari touch-outside-bounds tap bug on the popup `openMethod`; v1.4.0 (Apr 2026) added scroll-locking for full-width anchored modal popups under touch input; and Dialog already special-cases touch-opened focus — "if the dialog is opened by touch, the popup itself is focused [instead of the first tabbable element] to avoid opening the virtual keyboard." Practical read for this milestone: **Slider, Dialog/AlertDialog and Tabs need no extra touch wiring to function** — they already fire from `pointerdown`/touch and are keyboard/AT-correct — but they need explicit *sizing* work, because Base UI (like Radix) ships unstyled/minimally-styled primitives and this repo's own `components/ui/*` wrappers currently size hit-targets for a mouse cursor, not a 44px-minimum finger target. That sizing is a Tailwind-class change in this repo's wrapper components, not a Base UI capability gap. |
| Tailwind CSS v4 | `^4` (`tailwindcss` + `@tailwindcss/postcss`) | Responsive breakpoints, container queries, layout | See the dedicated section below — v4's CSS-first `@theme` config is a genuine syntax change from v3 that the roadmapper/planner needs to know before writing any responsive class. |
| `lucide-react` | `^1.32.0` | Icons | No change needed; icon sizing for touch targets is a Tailwind class concern (e.g. wrap in a `size-11` button), not a library concern. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `@playwright/test` (new) | Cross-browser/device E2E, specifically mobile Safari/Chrome emulation | Install with `npm install -D @playwright/test && npx playwright install --with-deps chromium webkit`. Use `devices['iPhone 13']` (Chromium/WebKit both ship this descriptor) as the project's baseline phone profile — see Testing section below for the exact `playwright.config.ts` shape. |
| Chrome DevTools / Safari Web Inspector device toolbar | Manual UAT on the actual "View Full Sized" 1:1 modal | Playwright emulation is good for *interaction* testing (touch drag, tab order, responsive layout) but is explicitly **not** trustworthy for verifying the 1:1 physical-size claim (see the dedicated section below) — that has to be checked against a real device or a ruler. |

## Installation

```bash
# No new runtime dependencies.

# Dev dependency — Playwright, already prescribed by the build guide
npm install -D @playwright/test
npx playwright install --with-deps chromium webkit
```

## Detailed Findings

### 1. Pointer/touch input for SVG drag handles

**Verdict: native Pointer Events + `touch-action` CSS is sufficient. Do not add
`@use-gesture/react` or any gesture library.**

- The codebase already has the answer working in production: `components/outline/outline-viewer.tsx`
  (`handleDragStart`/`handleDragMove`/`handleDragEnd`, lines ~399-420) and
  `components/rocker/rocker-viewer.tsx` both drive SVG-handle dragging entirely off
  `onPointerDown` / `onPointerMove` / `onPointerUp` plus `setPointerCapture`/`releasePointerCapture`
  and a `touch-action: none` rule on the draggable element. That is the complete recipe for
  single-finger drag: pointer capture guarantees the move/up events keep arriving to the same
  element even if the finger/cursor moves off it, and `touch-action: none` stops the browser's
  own scroll/pan/zoom gesture recognizer from stealing the touch before your handler sees it.
- `@use-gesture/react` (npm latest **10.3.1**, `@use-gesture/core` `10.3.1`, peer dep
  `react: >= 16.8.0` — so React 19 is fine) is designed for compound multi-touch gestures: pinch,
  rotate, multi-finger pan, or drag-with-inertia/momentum physics. None of this milestone's asks
  need that: every drag target here is a single circular handle moved by one point of contact
  (mouse, pen, or one finger), the exact case Pointer Events was built for. Pulling in
  `@use-gesture/react` would add an abstraction over an API this codebase already uses directly,
  contradicting the project's stated small-dependency-surface value and Rule 1's "no browser
  API… in geometry code, keep UI code simple and inspectable" spirit.
- The one thing to actually add this milestone: apply the *same* pattern (pointer capture +
  `touch-action: none`) to any newly-touch-enabled drag surface on the rails screen (if the rail
  band editor grows draggable control points) and audit `fin-placement-editor.tsx` and
  `rail-band-editor.tsx` for any `onMouseDown`-only handlers that were never touch-enabled — grep
  found none currently using raw mouse-only handlers, but any new interactive SVG element should be
  built on this same three-callback pattern, not `onClick`/`onMouseDown`.
- One caveat worth flagging to the planner: `event.preventDefault()` inside `onPointerDown` (as
  `outline-viewer.tsx` already does) combined with `touch-action: none` in CSS is the correct
  belt-and-suspenders combo — CSS `touch-action` alone can be too coarse (it also has to be
  present on ancestor scroll containers, not just the handle, or iOS Safari's edge-swipe-back
  gesture can still intercept a drag that starts near the screen edge on a phone-width viewport,
  which is new territory this milestone actually reaches for the first time).

### 2. Tailwind CSS v4 — what differs from v3 for responsive/touch work

The project is already on `tailwindcss@^4` with `@tailwindcss/postcss`, so no version change is
needed — but v4's *configuration model* changed enough from v3 that the planner needs the syntax,
not just the version number:

- **Breakpoints are CSS custom properties declared in `@theme`, not a `tailwind.config.js`
  `theme.screens` object.** This repo's `app/globals.css` already has a `@theme static { ... }`
  block (used today for the colour bridge — see the file's own "THEMING SYSTEM" doc comment). The
  same block is where any custom breakpoint would go: `--breakpoint-xs: 30rem;` inside that
  existing `@theme static { }` rule. Default breakpoints (`sm`/`md`/`lg`/`xl`/`2xl`) still exist
  out of the box and don't need to be redeclared — this milestone very likely needs no custom
  breakpoint token at all, since the existing named ones (`sm: 640px`, `md: 768px`, `lg: 1024px`)
  already bracket "phone" vs "tablet/desktop" adequately for a stacked-below/side-by-side-above
  layout.
- **Container queries are built into core in v4 — no `@tailwindcss/container-queries` plugin
  needed** (that plugin is now a v3-only relic; confirmed current Tailwind docs: "As of Tailwind
  CSS v4.0, container queries are supported in the framework by default and the plugin is no
  longer required"). Usage: mark a parent `@container` (sets `container-type: inline-size`) or
  `@container/name` for a named container, then style children with `@sm:`, `@md:`, `@lg:`
  variants (e.g. `@md:flex-row`), which respond to the *container's* width, not the viewport's.
  This is the right primitive for this milestone's editor panels — a design screen's SVG viewer +
  control panel can each be sized against their own container rather than the whole viewport,
  which matters because a phone in landscape and a narrow desktop split-pane can hit the same
  pixel width but want different treatment relative to the viewport vs. the panel.
- **Recommended layout approach for "stacked-below on phone, side-by-side above":** for the
  top-level design-screen shell (the fixed `aside` + `main` two-column pattern named explicitly in
  the milestone context — found in `fin-placement-editor.tsx`, `outline-editor.tsx`,
  `volume-controls.tsx`, `rocker-editor.tsx`, `rail-band-editor.tsx`, `volume-estimator.tsx`), use
  a plain **viewport** breakpoint (`flex-col md:flex-row` or a `grid grid-cols-1 md:grid-cols-[...]`
  swap) since that decision is about the *window*, not a nested container. Reserve `@container`
  queries for content *inside* one of those panels that should adapt to the panel's own width
  regardless of overall screen size (e.g., a callout/legend list in the rails plan-view that should
  wrap differently in a narrow phone-portrait panel vs. a wide desktop sidebar of the same
  viewport-relative proportion). Don't reach for `@container` as a viewport-breakpoint replacement
  — that inverts cause and effect and makes the two-column-to-stacked collapse harder to reason
  about, since it would require wrapping the whole shell in a container context.
- **`dvh`/`svh`/`lvh` are core Tailwind v4 utilities now** (`h-dvh`, `min-h-dvh`, etc.) — relevant
  for the "viewers that fill the screen" requirement; see the viewport section below for why `dvh`
  matters specifically on iOS Safari.
- No v4-only utility is required to accomplish the stacked/side-by-side split beyond what's already
  installed; this is a matter of applying existing breakpoint/container-query primitives to markup
  that currently has none, not adding new Tailwind capability.

### 3. Base UI / shadcn primitives on touch

Confirmed via Base UI's own release notes (queried against the `base-ui.com/react/overview/releases`
changelog):

- **Dialog**: already touch-aware by design — when a dialog is opened via touch, focus goes to the
  popup itself rather than the first tabbable element, specifically to avoid triggering the mobile
  keyboard. v1.4.0 (Apr 2026) added scroll-locking for full-width anchored modal popups under touch
  input, directly relevant to the "View Full Sized" modal this milestone builds (a full-width,
  screen-filling modal is exactly the "full-width anchored popup" case that fix targets — verify
  the installed version (`^1.7.0`, which npm resolves to `1.8.0` today) is at least `1.4.0`, which
  it is).
- **Slider**: no touch-specific issues surfaced in the 2026 changelog; Base UI sliders use pointer
  events internally already. What needs *this repo's* attention is the wrapper in
  `components/ui/slider.tsx` — its thumb needs a large-enough hit area for a finger (Apple/Google
  guidance: 44×44 CSS px minimum), which is a Tailwind sizing change to the wrapper, not a Base UI
  configuration flag.
- **Tabs**: the INSTRUCTIONS tab this milestone adds sits on the existing rails-screen Tabs
  component; no touch-specific gap identified for Base UI Tabs. The concern here is layout only —
  tab-strip overflow/wrapping on a narrow phone width.
- **Base UI vs Radix on touch**: Base UI is the newer, actively-developed library (MUI/Radix-adjacent
  team) and has been shipping touch-specific bug fixes *monthly* through 2026 (Jan: Safari
  tap-outside-bounds fix; Apr: full-width modal scroll lock) — meaning touch behaviour is a live
  area of improvement, not a solved-and-frozen one. Practical implication for the planner: **pin to
  a Base UI version and re-check its own release notes if touch bugs surface during UAT**, since a
  point-release bump might already contain the fix (as happened with the two 2026 examples above)
  rather than requiring this app to work around it. Radix (the older library) has more historical
  touch-hardening simply from more years in production, but this project already committed to Base
  UI via shadcn's Base UI adapter (`shadcn/ui` changelog "2026-01 Base UI") and switching would be
  a much larger change than this milestone's scope — not recommended.
- **No config flags exist to "turn on" touch support** in any of these primitives — the touch
  handling is baked into the pointer-event-based implementation. There is nothing to enable; the
  work is sizing (hit targets) and layout (fitting a Dialog/Tabs/Slider into a narrow viewport),
  both Tailwind-class concerns in this repo's own `components/ui/*` wrapper files, not
  library-level Base UI configuration.

### 4. iOS Safari viewport / safe-area handling

This app's root layout currently declares **no `viewport` export at all** — only a `metadata`
export in `app/layout.tsx` — and clamps `body` to `h-full` (a `100%`/viewport-height chain via
`html`'s own `h-full`) with `overflow-hidden`. That combination is exactly the pattern that breaks
on iOS Safari's collapsing/expanding address-bar chrome, because `100vh`/`100%` on iOS Safari is
measured against the *largest* possible viewport (bar collapsed), so content clamped to `h-full`
can be cut off behind the address bar when it's expanded. This milestone's "viewers that fill the
screen" requirement is the first place this app will actually feel that bug, since nothing today
asks the layout to be pixel-exact against the viewport edge on a phone.

Concrete recommendations, verified against this repo's own `next` package types
(`node_modules/next/dist/lib/metadata/types/extra-types.d.ts`, `next@16.3.1`):

- **Add a `viewport` export to `app/layout.tsx`**, next to (not merged into) the existing
  `metadata` export — Next.js 16's App Router treats `viewport` as a separate, dedicated export
  from a `layout.tsx`/`page.tsx`, not a field on the `Metadata` object (the `Metadata` interface's
  `viewport` string field is explicitly `@deprecated Use the new viewport configuration (export
  const viewport: Viewport = { ... }) instead`, confirmed in the installed package's own
  `.d.ts`). Shape, confirmed from the same file:
  ```ts
  import type { Viewport } from "next";

  export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover", // enables env(safe-area-inset-*) — confirmed field name/values
                          // ('auto' | 'cover' | 'contain') in extra-types.d.ts
  };
  ```
  `interactiveWidget` (`'resizes-visual' | 'resizes-content' | 'overlays-content'`) is also a
  first-class field on this type as of Next 16 and is worth considering if the on-screen keyboard
  (typed dimension entry, per `CLAUDE.md`'s "typed imperial fractions") ever needs to *not* resize
  the layout on mobile — not required for this milestone but worth the planner knowing it exists
  rather than reaching for a JS visualViewport workaround.
- **Use `dvh` (dynamic viewport height), not `vh`, anywhere this milestone adds a
  screen-filling element** — e.g. the "View Full Sized" modal and any newly-added full-screen
  viewer. Tailwind v4 ships `h-dvh`/`min-h-dvh`/`max-h-dvh` utilities already (core, no plugin).
  The existing `h-full` chain rooted at `<html>`/`<body>` (`app/layout.tsx` lines 66/91) does not
  need to be torn out — `h-full` resolves against an ancestor's resolved height, and as long as
  *something* in the chain is viewport-height-anchored, changing that one anchor to `dvh` (e.g.
  `h-dvh` on `<html>` or `<body>` instead of `h-full`) propagates correctly, since every
  descendant is `h-full`, not `h-screen`/`vh`, already. This is a small, surgical change, not a
  rewrite of the layout.
- **Apply `env(safe-area-inset-*)` via Tailwind arbitrary values or a small CSS custom property**,
  since Tailwind v4 has no dedicated safe-area utility class built in (there is a `tailwindcss-safe-area`
  community plugin, but it is a thin wrapper around the same `env()` calls, and the project's
  values-driven small-surface preference argues for writing the two or three needed
  `padding: env(safe-area-inset-bottom)` rules directly rather than a new dependency for it —
  Tailwind v4 supports arbitrary CSS via `p-[env(safe-area-inset-bottom)]` or a custom utility in
  the existing `@theme` block). This matters for the bottom nav / control panel on notched/Dynamic
  Island phones, and for any full-screen "View Full Sized" overlay that must not draw its
  controls under the home-indicator bar.
- Do **not** add `viewport-fit=cover` without also handling safe-area insets — enabling `cover`
  alone (without `env()` padding somewhere) is what causes UI to visually collide with the notch,
  which is a regression, not an improvement.

### 5. Rendering a 1:1 actual-size element from CSS units alone

This is the "View Full Sized" rail cross-section requirement, and the milestone context is explicit
that it's a **standard-DPI assumption, no calibration UI** — which matches what CSS can actually
promise:

- CSS defines the `in`/`cm`/`mm`/`pt`/`pc` absolute length units by a fixed, spec-mandated ratio to
  `px`: **1 CSS inch = 96 CSS px**, always, by definition (CSS Values and Units spec) — regardless
  of the device's actual physical pixel density. This means `width: 3in` in CSS is *guaranteed* to
  compute to exactly `288px` — but that 288px is only physically 3 real-world inches on a display
  whose CSS pixel really does measure 1/96 inch, which is true for "reference pixel" — the
  original assumption baked into the web platform from a 96-DPI desktop monitor. Modern phones
  and high-DPI laptop screens report a `devicePixelRatio` (2x, 3x) but the *CSS* pixel is defined
  to still behave as that same reference-pixel size, and browsers do genuinely try to keep 1 CSS
  inch honest to a physical inch on higher-DPI panels by scaling — but this is where the accuracy
  limit actually lives.
- **The honest accuracy limit, to state plainly for the roadmapper**: CSS absolute units (`in`,
  `mm`, `cm`) are reliable for physical size *only* on displays the browser/OS correctly reports
  DPI for — which is the overwhelming majority of phones, tablets, and modern laptops (their OS
  supplies an accurate physical-pixel-density value the browser uses to scale the reference pixel
  correctly) but is **not guaranteed** for: (a) an external desktop monitor whose EDID/DPI the OS
  gets wrong or doesn't query, (b) a browser window that's been zoomed (page zoom changes the CSS
  px-to-physical-px ratio, and there is no way for the page to detect or correct for that), and
  (c) some older/uncommon Android devices with device manufacturers that misreport density. This
  is exactly why the milestone explicitly scopes out a calibration UI (a printed calibration
  square, as the app's own printed order form already does for that exact reason — see
  `CLAUDE.md`'s note on the two-inch scale-check square) and instead states the standard-DPI
  assumption plainly — that is the right, honest choice for an on-screen "hold against foam"
  reference, since a shaper's final cut still goes through the *printed* full-size template (which
  is separately proven exact, per the existing golden-fixture/ruler-verified pipeline), and the
  on-screen 1:1 view is explicitly a secondary convenience, not the source of truth.
- **Implementation**: no library is needed. Set the rail cross-section SVG's `width`/`height` (or a
  wrapping container's) directly in `mm` or `in` CSS units (e.g. `width: 76mm` for a rail band
  cross-section, computed from the same `Mm`-branded geometry values used everywhere else per
  `CLAUDE.md` Rule 2 — convert once, through `lib/geometry/units.ts`, to a CSS length string, never
  inline a `25.4`/`96` constant in a component). Do not use `window.devicePixelRatio` to try to
  "correct" the rendering yourself — that value describes the ratio between CSS px and *device* px
  for crisp bitmap rendering, not a physical-size correction, and multiplying by it would actively
  break the 1:1 promise on the (common, correctly self-reporting) high-DPI phones where CSS units
  already work correctly out of the box.
- **What to tell the shaper in the UI** (per this project's plain-English requirement): a short,
  honest caption near the "View Full Sized" control — something like "sized for a standard
  screen; if your browser is zoomed, reset it to 100% first" — is the right amount of caveat,
  matching the "standard-DPI assumption... no calibration step" framing already agreed in
  `PROJECT.md`.

### 6. Testing — Playwright and device emulation

Installing `@playwright/test` now is justified and correctly sequenced:

- **Version**: `@playwright/test@^1.63.0` (current on npm at research time).
- **Why now, not before**: Vitest (already the only test runner, `node` environment, per
  `CLAUDE.md`) is correct and sufficient for `lib/geometry/*` pure functions and will remain the
  tool for every new geometry function this milestone adds (the `halveDeckMark1` rail-bands
  variant noted in `PROJECT.md`'s milestone context still goes through Vitest + golden fixtures,
  not Playwright — Rule 1 is unaffected by this research). But this milestone's actual net-new
  surface — touch dragging, responsive collapse, a 1:1 modal, print-with-instructions — is UI
  behavior under real viewport/pointer conditions that no `node`-environment or even jsdom-based
  test can exercise, because jsdom has no layout engine, no CSS box model, and no pointer-capture
  implementation. This is the first milestone where that gap actually matters (prior milestones
  were desktop-only, mouse-only).
- **Standard device-emulation configuration** — `playwright.config.ts`:
  ```ts
  import { defineConfig, devices } from "@playwright/test";

  export default defineConfig({
    testDir: "./e2e",
    projects: [
      { name: "Desktop Chrome", use: { ...devices["Desktop Chrome"] } },
      { name: "Mobile Safari",  use: { ...devices["iPhone 13"] } },   // hasTouch: true, isMobile: true
      { name: "Mobile Chrome",  use: { ...devices["Pixel 7"] } },
    ],
  });
  ```
  Playwright's built-in device descriptors set viewport, `deviceScaleFactor`, `userAgent`, and
  critically `hasTouch: true` / `isMobile: true` together — using a raw custom viewport without a
  device descriptor will *not* automatically enable touch event synthesis, so always start from a
  `devices[...]` entry rather than hand-rolling a viewport size.
- **Touch interaction in a test**: Playwright's `locator.tap()` (not `.click()`) synthesizes a real
  touch sequence and is the right call for testing the SVG drag handles — a synthetic `.click()`
  on a `hasTouch: true` context does not exercise the same `pointerdown`/`touchstart` code path a
  real finger does.
  Playwright's Locator API supports drag via `dragTo()` for the pointer-capture pattern this app
  uses, or a manual `hover()`+`down()`+`move()`+`up()` sequence when precise multi-step drag
  control (matching this app's per-move geometry solve) is needed.
- **Explicit accuracy caveat to carry into planning**: as web research on 2026 Playwright practice
  notes, "emulation never replicates the device's network stack, GPU, or accelerometer" — and
  relevant here, it also cannot validate the *physical* 1:1 sizing claim from Section 5, since a
  CI runner has no real screen with a real DPI. Playwright is the right tool to prove touch drag
  *works* and layout *collapses correctly* at phone widths; it is not a substitute for a real
  device (or the manual DevTools/Web Inspector check) for verifying the "View Full Sized" modal is
  actually true-to-size.
- **Where tests should live**: this repo's `AGENTS.md`/`CLAUDE.md` currently document only
  `lib/**/*.test.ts` for Vitest; establish a parallel `e2e/` directory at the repo root for
  Playwright specs (the standard Playwright convention) rather than intermixing with
  `lib/geometry/`, keeping Rule 1's "no browser API in geometry code" boundary intact and legible.

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@use-gesture/react` / `react-use-gesture` | Solves multi-touch/pinch/inertia gesture composition this milestone doesn't need; the app already has a working, simpler pointer-events pattern in production (`outline-viewer.tsx`) | Native Pointer Events (`onPointerDown`/`onPointerMove`/`onPointerUp` + `setPointerCapture` + `touch-action: none`), copying the existing pattern |
| `hammer.js` or any other touch-gesture library | Unmaintained (hammer.js has had no meaningful release in years) and solves the same already-unneeded problem as `@use-gesture` | Same as above |
| `@tailwindcss/container-queries` plugin | Obsolete for this project — Tailwind v4 has container queries built into core; the plugin is a v3-only relic and would be dead weight/possible conflict if added on v4 | Bare `@container` on a parent + `@sm:`/`@md:`/`@lg:` variants on children (built in) |
| `tailwind.config.js` breakpoint overrides | v4's config model moved to CSS-first `@theme`; a `tailwind.config.js` `theme.screens` object is the v3 pattern and this repo's v4 setup (confirmed: only `app/globals.css`'s `@theme static` block, no `tailwind.config.js` screens override present) should not reintroduce it | `--breakpoint-*` custom properties inside the existing `@theme static { }` block in `app/globals.css`, only if a non-default breakpoint is truly needed (likely unnecessary this milestone) |
| A calibration-flow library or `window.devicePixelRatio`-based size-correction code for "View Full Sized" | The milestone explicitly scopes out calibration UI; a devicePixelRatio "correction" would break the (already-correct) 1:1 sizing on the majority of devices where the browser/OS already scales CSS reference pixels correctly | Plain CSS absolute units (`mm`/`in`) computed once through `lib/geometry/units.ts`, with a plain-English on-screen caveat about browser zoom |
| `react-responsive`, `react-device-detect`, or any JS-side viewport/UA-sniffing library for layout switching | Adds a runtime dependency and a hydration-mismatch risk (server doesn't know the client's viewport) for something Tailwind's CSS-only breakpoints already do without JS, and this app already avoids client-side layout branching per its existing architecture (viewport-driven Tailwind classes throughout) | Tailwind responsive/container-query classes (`md:flex-row`, `@md:...`), which resolve purely in CSS with no hydration risk |
| A safe-area Tailwind plugin (e.g. `tailwindcss-safe-area`) | Thin wrapper around 2-3 `env()` calls this milestone needs at most; not worth a dependency given the project's stated preference for a small surface | Arbitrary-value Tailwind classes (`pb-[env(safe-area-inset-bottom)]`) or a couple of custom properties added to the existing `@theme`/base layer in `app/globals.css` |
| Switching shadcn's underlying primitive library from Base UI to Radix to chase "better touch support" | Base UI is actively shipping touch fixes monthly through 2026 (confirmed in its own changelog) and this project already migrated onto it (per `.claude/CLAUDE.md`'s dated changelog note "January 2026 - Base UI"); a library swap is drastically out of proportion to this milestone's actual gaps, which are sizing/layout, not primitive capability | Stay on `@base-ui/react`; size the wrapper components in `components/ui/*` for touch targets, and track Base UI's own release notes if a specific touch bug is hit during UAT |
| Cypress, WebdriverIO, or any other E2E framework | Playwright is already the prescribed, planned choice in this project's own build guide and `CLAUDE.md`; introducing a different framework now would contradict "not to be substituted without discussion" | `@playwright/test` |

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@base-ui/react@^1.7.0` (resolves to `1.8.0`) | React `19.2.8` (installed) | No known React 19 incompatibility; Base UI targets React 19 as a first-class peer, and this repo is already running it in production with no issues reported |
| `@playwright/test@^1.63.0` | Node.js versions supported by Next.js 16 tooling | Standalone dev dependency, no peer conflicts with Next.js/React/Vitest; browsers installed separately via `npx playwright install` |
| Tailwind CSS `^4` (installed) | Next.js 16 App Router, Turbopack | Already working; no version change needed for this milestone's responsive/container-query work — v4's container-query support has been core since 4.0, well before this repo's pinned version |
| Pointer Events API | Safari iOS (all versions this app can realistically target), Chrome, Firefox | No polyfill needed; `setPointerCapture`/`releasePointerCapture` have been supported in Safari since iOS 13 |

## Sources

- This repository, directly: `package.json`, `app/layout.tsx`, `app/design/layout.tsx`,
  `components/outline/outline-viewer.tsx` (existing pointer-drag pattern), `components/ui/*.tsx`
  (confirms `@base-ui/react` import paths), `app/globals.css` (`@theme static` block already in
  use), `node_modules/next/dist/lib/metadata/types/extra-types.d.ts` (Next 16's `Viewport` type:
  `viewportFit`, `interactiveWidget` fields, confirmed directly from installed package) — HIGH confidence, verified against the actual installed code
- `npm view @use-gesture/react version` / `dependencies` / `peerDependencies` — HIGH confidence, live registry query, version `10.3.1`, peer `react: >= 16.8.0`
- `npm view @playwright/test version` — HIGH confidence, live registry query, version `1.63.0`
- `npm view @base-ui/react version` — HIGH confidence, live registry query, current npm latest `1.8.0`
- Web search: Tailwind CSS v4 docs and community sources (SitePoint, StaticMania, official
  tailwindcss.com/docs/responsive-design) on `@theme` breakpoints and built-in `@container` support
  in v4.0+ — MEDIUM-HIGH confidence (cross-referenced multiple sources agreeing on the same syntax)
- Web search: Base UI's own release notes (`base-ui.com/react/overview/releases/v1-1-0`,
  `v1-4-0`) and component docs (`base-ui.com/react/components/dialog`) for touch-specific fixes and
  the touch-vs-tabbable focus behavior — HIGH confidence (primary-source changelog)
- Web search: Playwright mobile-emulation guides (BrowserStack, qaskills.sh) for 2026 device
  registry and touch-emulation practice — MEDIUM confidence (community guides, cross-checked
  against Playwright's own documented `devices` API design, which is stable and long-standing)
- CSS Values and Units spec convention (96 CSS px = 1 CSS inch reference-pixel definition) — HIGH
  confidence, foundational and stable web-platform spec knowledge, not subject to 2026 drift

---
*Stack research for: touch-first mobile support + rails-screen completion, Shaper v1.2*
*Researched: 2026-09-07*
