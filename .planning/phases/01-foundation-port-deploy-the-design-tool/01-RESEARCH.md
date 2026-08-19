# Phase 1: Foundation — Port & Deploy the Design Tool - Research

**Researched:** 2026-08-19
**Domain:** Next.js 16 (App Router) client-state wiring + first Vercel production deployment
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**New-design entry flow (setup screen)**
- **D-01:** A setup screen is the entry point for starting a design. It presents board-type preset cards: the core four — Shortboard, Fish, Mid-length, Longboard. Groveler and Gun presets are deferred (see Deferred Ideas).
- **D-02:** Each preset sets **dims + outline character** — not just length/width/thickness, but nose angle, fullness, tail shape, etc., so a Fish starts looking like a fish.
- **D-03:** Preset values workflow: Claude drafts sensible per-type values → the user tunes each preset **in the live outline editor** (they need access to the template maker to adjust nose/tail angle, fullness, tail shape and see what the default curves actually look like) → tuned values are captured back as the preset definitions. The plan must include a way to read/capture the current outline state as a preset (a dev-only "copy current values" affordance is acceptable).
- **D-04:** Clicking a preset card drops the user **straight into the outline editor** with the preset applied — no intermediate dims-tweaking step on the setup screen. Dims are adjusted in the editor via the existing sliders.

**Landing page & nav**
- **D-05:** `/` (root) **is** the setup screen — it replaces the current redirect to `/design/outline`. No separate marketing page in Phase 1. — **Reversibility:** reversible
- **D-06:** The SHAPER wordmark in the nav links home to the setup screen. The five design tabs (TEMPLATE / RAILS / VOLUME / FINS / SUMMARY) stay as-is; no new tab.
- **D-07:** The in-progress design survives in-session: the store keeps the current board while the tab is open, and the setup screen shows a "Continue current board" card alongside the presets. Picking a new preset replaces the current board **with a confirm**. Real persistence arrives in Phase 2.
- **D-08:** Preset cards show **outline thumbnails** rendered from each preset's actual curve (reuse existing outline viewer geometry), so a shaper instantly recognizes fish vs longboard.

### Claude's Discretion
- **Vercel deployment mechanics** — production setup, URL, preview deploys: user did not select this area; use sensible defaults (deploy from `main`, default vercel.app URL acceptable for Phase 1).
- **Prototype-parity / done checklist** — what remains to port from `reference/` is Claude's judgment against the phase success criteria; rocker and foil editors are explicitly Phase 4.
- **Setup screen layout details** beyond the decisions above.

### Deferred Ideas (OUT OF SCOPE)
- **Groveler & Gun presets** — add to the preset roster after the core four ship (later Phase 1 pass or backlog)
- **Saved boards on the setup screen with a working/done status indicator** — Phase 2 (Accounts & Saved Designs); the status indicator is an addition Phase 2 doesn't currently spell out
- **Community board database** — boards built by other (free/low-tier) users, rateable by the community, sortable by board type, length, rating, etc. — v2 sharing milestone (extends SHAR2-01/02 with ratings + browsing)
- **localStorage persistence of in-progress board** — considered for Phase 1, deliberately left to Phase 2's real persistence
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-01 | User can start a new design by entering overall board dimensions (length, width, thickness) | Setup screen presets (D-01/D-02) seed dims into the existing `OutlineSpec`; user fine-tunes via the already-built `OutlineControls` sliders (length/width) after landing in the outline editor per D-04. See Architecture Patterns → Pattern 2. |
| OUTL-01 | User can shape an outline curve constrained to the board's overall length/width | Already delivered — `lib/geometry/outline.ts` + `components/outline/outline-controls.tsx` (length 60-120in, widePointWidth 16-25in slider bounds) `[VERIFIED: components/outline/outline-controls.tsx:139,244]`. No new work beyond preset seeding. |
| RAIL-01 | App calculates rail band dimensions (thickness/apex/tuck) at stations, derived from outline | Already delivered — `lib/geometry/rail-bands.ts` with Vitest golden tests (`lib/geometry/rail-bands.test.ts`). No new work this phase. |
| FIN-01 | User can select a fin configuration (single, thruster, quad, twin/2+1) | Already delivered — `components/fins/fin-controls.tsx` + `lib/geometry/fins.ts`. No new work this phase. |
| FIN-02 | App calculates fin placement (position, angle, toe) per configuration | Already delivered — `lib/geometry/fins.ts` (`computeFinPlacement`), Vitest-covered. No new work this phase. |
| FIN-03 | User can view calculated fin placement overlaid on the board outline | Already delivered — `components/fins/fin-viewer.tsx` + `OutlineViewer`'s `finMarks` prop (also reused for preset thumbnails, see Pattern 3). No new work this phase. |
| VIZ-01 | User can view a 2D visualization of outline, rocker, rail contour, fin placement as they shape | Already delivered across the five design screens; rocker/foil visualization explicitly deferred to Phase 4 per CONTEXT.md Claude's Discretion note. See Validation Architecture — manual-only, no automated visual regression suite exists. |
| UNIT-01 | UI displays dimensions in inches and volume in litres, regardless of internal metric storage | Already delivered — `lib/geometry/units.ts` conversion boundary, used throughout. New preset/setup-screen code must route all display through this boundary too (see Architecture Patterns → Pattern 2, preset dims defined in mm via `inchesToMm()`). |

</phase_requirements>

## Summary

Four of the five design screens (Template/outline, Rails, Fins, Volume, Summary) and all their
`lib/geometry` math were already ported in prior quick tasks, each with Vitest golden tests
extracted from the `reference/` prototype `[VERIFIED: package.json:12, ran `npm run test` → 562
tests / 5 files passed]`. What remains to close Phase 1 is: (1) a new setup/entry screen at `/`
per the approved UI-SPEC, (2) promoting shared chrome (`SiteNav`, and — a gap the UI-SPEC does not
itself surface — `DesignProvider`) from the nested `/design` layout up to the root layout so `/`
can read and write the same in-memory board, (3) a small `lib/geometry/presets.ts` module of the
four board-type presets plus a store action to apply one, and (4) the first Vercel deployment of a
project that has no `.vercel` directory and no prior deploy history.

The codebase runs Next.js 16.3.1 with React 19.2 and Turbopack-by-default `[VERIFIED:
package.json:12-16]` — a version with real breaking changes from the Next.js most training data
describes (App Router now requires `LayoutProps<'/route'>`-style typed helpers, `middleware.ts` is
deprecated in favor of `proxy.ts`, PPR is reached via `cacheComponents` not `experimental.ppr`,
etc.) `[CITED: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md]`. The existing
root layout, `app/page.tsx`, and `app/design/layout.tsx` already follow the Next 16 conventions
correctly (`LayoutProps<"/">` typed helper, synchronous `redirect()` from a Server Component) — the
planner should extend those exact patterns, not fall back to remembered Next 13/14 idioms.

**Primary recommendation:** Promote both `<SiteNav />` and `<DesignProvider>` to `app/layout.tsx`
(not just the nav, as the UI-SPEC states) so `/` and `/design/*` share one board-state instance
across navigation; build the setup screen as a new `app/page.tsx` + `components/setup/*` client
tree consuming `useDesign()`; add a `lib/geometry/presets.ts` with Vitest coverage for the four
board-type presets; then connect the existing public GitHub repo to Vercel via the dashboard "Import
Project" flow (zero-config for Next.js) and deploy `main`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Setup screen UI (preset cards, hero, confirm dialog) | Browser / Client | — | Pure client interaction, no server data; matches existing `app/design/*` screens which are all client components under a client Provider |
| Preset definitions (dims + outline character per board type) | Browser / Client (`lib/geometry/presets.ts`) | — | Pure data + pure functions, no I/O — same tier as `lib/geometry/board.ts`'s `DEFAULT_BOARD_SPEC`/`TAIL_PRESETS` |
| In-progress board state ("continue current board") | Browser / Client (`DesignProvider` via React context) | — | `useState`, no persistence (explicitly deferred to Phase 2 per CONTEXT.md D-07); must be promoted to root layout so `/` and `/design/*` share the instance |
| Outline/rail/fin/volume geometry math | Browser / Client (`lib/geometry/*`, pure TS) | — | Project constraint: all geometry math is pure TypeScript under `lib/`, framework-agnostic, unit-tested in isolation `[CITED: /Users/kontoes/Code/shaper/.claude/CLAUDE.md]` |
| Outline/preset-thumbnail rendering (SVG) | Browser / Client (`components/outline/outline-viewer.tsx`) | — | Client-rendered SVG driven by geometry output; no SSR-specific concern |
| Static asset / page delivery | CDN / Static (Vercel Edge Network) | Frontend Server (SSR) | Next.js on Vercel serves prerendered static pages (confirmed by `next build` output below — every route is `○ (Static)`) from the CDN, with the framework itself running as the deploy target's build/runtime layer |
| Deployment pipeline | CDN / Static (Vercel platform) | — | Git-push-to-deploy; no custom backend/API tier exists yet in this phase |

## Package Legitimacy Audit

**No new npm packages are introduced by this phase.** The one new UI primitive needed — an
AlertDialog for the replace-board confirmation (UI-SPEC D-07) — is added via the shadcn CLI
(`npx shadcn add alert-dialog`), which generates a `components/ui/alert-dialog.tsx` file built on
`@base-ui/react/alert-dialog`. `@base-ui/react` is already a declared dependency
(`package.json:14`, `^1.7.0`) and its `alert-dialog` subpath already exists in
`node_modules/@base-ui/react/alert-dialog` `[VERIFIED: ran `find node_modules/@base-ui/react
-maxdepth 1 -iname "*alert*"` this session, path exists]` — every other installed shadcn primitive
in this codebase (`Button`, `Select`, `Slider`, `Checkbox`, `Separator`) is already built the same
way on a `@base-ui/react/*` subpath import `[VERIFIED: components/ui/button.tsx:1,
components/ui/select.tsx:4, components/ui/slider.tsx:1 — all import from `@base-ui/react/*`]`. No
`npm install` step is required; the CLI only writes a local component file.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| *(none — no new package installs this phase)* | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                              ┌────────────────────────────┐
                              │  Vercel Edge / CDN          │
                              │  (git push main → build →   │
                              │   deploy, zero-config)      │
                              └──────────────┬───────────────┘
                                             │ prerendered static routes
                                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Browser (client)                                                          │
│                                                                            │
│  app/layout.tsx (root, Server Component)                                 │
│   └─ <DesignProvider>  ← PROMOTED HERE (currently only in /design)        │
│       └─ <SiteNav />   ← PROMOTED HERE (currently only in /design)        │
│           ├─ "/" → app/page.tsx (NEW: setup screen)                      │
│           │     ├─ preset cards (4, compile-time constants)              │
│           │     │     ↓ click → applyPreset() → store.outline overwrite  │
│           │     ├─ "Continue current board" card (reads store.boardName) │
│           │     └─ AlertDialog (replace-board confirm)                   │
│           │                                                              │
│           └─ "/design/*" → existing 5 screens (outline/rails/fins/       │
│                 volume/summary), each: useDesign() → lib/geometry/*      │
│                 pure fns → derived values → SVG/table render             │
│                                                                            │
│  useDesign() reads/writes ONE React-context state object                 │
│  (in-memory only; no persistence — Phase 2)                              │
└──────────────────────────────────────────────────────────────────────────┘
```

Primary use case trace: user lands on `/` → clicks a preset card → `applyPreset(preset)` merges
preset's `OutlineSpec` (+ any future dims fields) into the shared store → client-side navigation to
`/design/outline` (same `DesignProvider` instance, no remount) → `OutlineEditor` reads the now-preset-
seeded `outline` from `useDesign()` and renders it immediately.

### Recommended Project Structure
```
app/
├── layout.tsx              # root layout — promote SiteNav + DesignProvider here
├── page.tsx                # NEW: setup screen (was `redirect(...)`)
├── design/
│   ├── layout.tsx           # simplify: no longer owns SiteNav/DesignProvider
│   └── {outline,rails,fins,volume,summary}/page.tsx   # unchanged
components/
├── setup/                  # NEW
│   ├── setup-screen.tsx     # page-level client component, orchestrates state
│   ├── preset-card.tsx      # one preset card incl. thumbnail
│   ├── continue-board-card.tsx
│   └── replace-board-dialog.tsx   # wraps new components/ui/alert-dialog.tsx
├── design/
│   └── design-store.tsx     # extend: add `applyPreset`, `hasBoardInProgress` (or similar)
lib/geometry/
├── presets.ts               # NEW: BOARD_PRESETS (4 entries), pure data
└── presets.test.ts          # NEW: Vitest coverage
```

### Pattern 1: Client context provider promoted to root layout
**What:** Move `<DesignProvider>` (and `<SiteNav />`, which already reads `useDesign`-adjacent
nothing but needs to render on `/` too) from `app/design/layout.tsx` up into `app/layout.tsx`.
**When to use:** Whenever a client-side context needs to be shared across route segments that sit
at different points in the segment tree (here: `/` and `/design/*` are siblings under root, not
parent/child, so a provider mounted only inside `/design/layout.tsx` is invisible to `/`).
**Why it matters here:** D-07 requires the setup screen to show a "Continue current board" card
reading the live in-progress board, and D-04 requires a clicked preset to be visible immediately
inside the outline editor. Both require `DesignProvider` to be a single instance that outlives
navigation between `/` and `/design/*` — which only happens if it is mounted in a layout common to
both, i.e. the root layout.
**Example:**
```tsx
// Source: existing app/design/layout.tsx (pattern to lift), verified this session
// app/layout.tsx (after)
import { SiteNav } from "@/components/site-nav";
import { DesignProvider } from "@/components/design/design-store";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <DesignProvider>
          <SiteNav />
          {children}
        </DesignProvider>
      </body>
    </html>
  );
}

// app/design/layout.tsx (after) — no longer owns SiteNav/DesignProvider
export default function DesignLayout(props: LayoutProps<"/design">) {
  return <div className="flex min-h-0 flex-1 flex-col">{props.children}</div>;
}
```
**Consequence to plan for:** `SiteNav`'s active-tab logic (`pathname === link.href`) already
returns `false` for all five tabs when `pathname === "/"` `[VERIFIED: components/site-nav.tsx:32,
quoted: `const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);`]` — this
already satisfies D-06's "no tab highlighted while there" with zero changes to `SiteNav` itself.

### Pattern 2: Preset as a patch into existing store actions (no new state shape)
**What:** A preset is just an `OutlineSpec` (the exact type already in `lib/geometry/board.ts`) plus
optional non-outline fields (fin config, board name) applied via the store's existing
`updateOutline(patch: Partial<OutlineSpec>)`-style action, not a new parallel state tree.
**When to use:** Any time a "starter template" needs to seed several already-existing state slices.
**Example:**
```typescript
// lib/geometry/presets.ts (new file, sibling to board.ts)
import type { OutlineSpec } from "./board";
import { degrees, inchesToMm } from "./units";

export interface BoardPreset {
  id: "shortboard" | "fish" | "midlength" | "longboard";
  name: string;
  descriptor: string; // one-line copy, see UI-SPEC Copywriting Contract
  outline: OutlineSpec;
}

export const BOARD_PRESETS: readonly BoardPreset[] = [
  {
    id: "fish",
    name: "Fish",
    descriptor: "Wide and flat, for small-to-mid days",
    outline: {
      length: inchesToMm(66),      // ← placeholder, user tunes live per D-03
      widePointWidth: inchesToMm(20.5),
      widePointOffset: inchesToMm(0),
      railLength: 60,
      noseAngle: degrees(70),
      noseFullness: 60,
      tailAngle: degrees(45),
      tailFullness: 20,
      tail: { kind: "swallow", endWidth: inchesToMm(9), crotchDepth: inchesToMm(2) },
    },
  },
  // shortboard, midlength, longboard entries...
];
```
**Note on D-03 workflow:** CONTEXT.md requires a way to "read/capture the current outline state as
a preset (a dev-only 'copy current values' affordance is acceptable)". The cheapest implementation
consistent with the codebase's conventions is a dev-only button (rendered only when
`process.env.NODE_ENV === "development"`, mirroring no existing precedent in this codebase but a
standard Next.js pattern `[CITED: node_modules/next/dist/docs — NODE_ENV is a standard Next.js env
var]`) that `console.log(JSON.stringify(outline, null, 2))`s the live `OutlineSpec` from
`useDesign()`, which the user copies into `presets.ts` by hand. This keeps the tuning loop inside
the existing outline editor (per D-03) with no new persistence layer.

### Pattern 3: Outline-viewer reuse for preset thumbnails (D-08)
**What:** `OutlineViewer` already takes `geometry: OutlineGeometry` + `outline: OutlineSpec` and
renders pure SVG with no dependency on the shared store — it can be called once per preset, each
with `buildOutline(preset.outline)` computed locally in the setup screen.
**Caveat found in code:** `OutlineViewer` unconditionally renders six absolutely-positioned text
callouts (dimension labels) sized at 14px/13px, with a `compact` prop that only shrinks them to
`var(--summary-font-callout, 10px)` `[VERIFIED: components/outline/outline-viewer.tsx:36-38,264-298]`
— there is no prop to hide callouts entirely. At preset-card thumbnail size (much smaller than the
340×620 viewBox this component assumes, and smaller than the Summary dashboard's `compact` usage),
these callouts will very likely overlap or overflow the card. The planner should treat "does
`OutlineViewer` render legibly at preset-card thumbnail size, or does it need a new `hideCallouts`
prop / a stripped-down sibling component" as an open item to resolve during planning, not assume it
drops in unchanged.
**Example:**
```tsx
// Source: components/outline/outline-editor.tsx:36-44 (existing call pattern to replicate)
const geometry = buildOutline(preset.outline);
<div className="relative aspect-[340/620] ...">
  <OutlineViewer geometry={geometry} outline={preset.outline} showConstruction={false} compact />
</div>
```

### Anti-Patterns to Avoid
- **Duplicating `<DesignProvider>` in both `app/layout.tsx` and `app/design/layout.tsx`:** creates
  two separate context instances; `/design/*` screens would silently stop reflecting a preset
  applied from `/`. Remove it from `app/design/layout.tsx` entirely when promoting.
- **Reaching for `localStorage`/`sessionStorage` to persist the in-progress board across reloads:**
  explicitly deferred to Phase 2 (CONTEXT.md Deferred Ideas) — do not add this in Phase 1 even as a
  "nice to have."
- **Using `useEffect` to sync derived setup-screen state back into the store:** the existing store
  already establishes a no-effects-that-write-state convention (`design-store.tsx`'s own doc
  comment: "no effects that write state") `[VERIFIED: components/design/design-store.tsx:9]` —
  preset application should be a single `setState` call inside an event handler, not an effect.
- **Hand-rolling a confirm modal instead of the shadcn/base-ui AlertDialog:** UI-SPEC explicitly
  calls for `npx shadcn add alert-dialog` — don't build a custom `<div role="dialog">` when the
  registry component (with focus trap, escape handling, and the same visual language as
  `Select`/`Slider`) is one command away.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirm-before-destructive-action dialog | Custom modal/portal/focus-trap | `npx shadcn add alert-dialog` → `@base-ui/react/alert-dialog` | Focus trap, escape-to-cancel, and ARIA roles are exactly the kind of accessibility surface a hand-rolled `<div>` gets subtly wrong; the primitive is one CLI command away and matches every other UI primitive already in `components/ui/` |
| Preset outline thumbnails | A second, simplified outline-drawing routine | `buildOutline()` (lib/geometry/outline.ts) + `OutlineViewer` (component) | The whole point of D-08 ("reuse existing outline viewer geometry") is that thumbnail and full editor must draw from the identical pure geometry function — a second drawing routine risks the thumbnail lying about what the preset actually produces |
| Deployment CI/CD | Custom GitHub Actions build+deploy workflow | Vercel's native Git integration (dashboard "Import Project", auto-detects Next.js) | Vercel is built by the Next.js maintainers specifically for zero-config Next.js deploys; a custom Action would have to reimplement build detection, preview-deployment-per-PR, and edge caching that Vercel provides for free on connect `[CITED: web search result, dev.to "Complete Guide to Deploying Next.js Apps in 2026"]` |

**Key insight:** Every "don't hand-roll" in this phase is really the same insight restated: the
codebase already has the primitive (geometry function, UI component, or platform) that solves the
problem — the risk is duplicating it slightly differently rather than not knowing it exists.

## Runtime State Inventory

> Not applicable — this phase is not a rename/refactor/migration. It is net-new UI (setup screen)
> plus a first deployment. `app/page.tsx`'s existing `redirect("/design/outline")` is being replaced
> with new content, not renamed; there is no stored data, live service config, OS-registered state,
> secret, or build artifact carrying an old name that this phase must migrate.

## Common Pitfalls

### Pitfall 1: Provider promotion breaks the existing `/design/layout.tsx` height chain
**What goes wrong:** `app/design/layout.tsx`'s wrapping `<div className="flex min-h-0 flex-1 flex-col">`
exists specifically to pass full-height flex sizing down from `app/layout.tsx`'s `body` (`min-h-full
flex flex-col`) to the editor screens `[VERIFIED: app/design/layout.tsx:5-10, quoted: "Both editors
size themselves with flex-1 against a full-height parent (see app/layout.tsx's min-h-full flex flex-
col body), so this column has to pass that height through rather than collapsing it."]`. If
`DesignProvider`/`SiteNav` are lifted to root but the flex-height wrapping isn't preserved
consistently on both the new `/` tree and the simplified `/design` tree, one of the two will lose
its full-height layout.
**Why it happens:** Moving a provider up a layout level is easy to do purely for state-sharing and
forget it was also carrying layout-critical wrapper divs.
**How to avoid:** When restructuring `app/layout.tsx`, keep the exact `flex min-h-0 flex-1 flex-col`
wrapper div in play (move it up with the provider, or duplicate the class list precisely) and
visually verify both `/` and `/design/outline` fill the viewport after the change.
**Warning signs:** The design screens' `flex-1` panels collapse to their content height instead of
filling the viewport after this refactor.

### Pitfall 2: First-ever Vercel deploy surfaces build issues invisible in local `next dev`
**What goes wrong:** `next build` (Turbopack, production mode) enforces stricter TypeScript/ESLint
gating than `next dev`; a project with zero prior deploys has never been build-checked in CI.
**Why it happens:** Local development mostly exercises `next dev`; `next build` was only run once
in research (this session) and passed cleanly `[VERIFIED: ran `npm run build` this session — output:
"✓ Compiled successfully in 1963ms", "Finished TypeScript in 2.8s", all 6 routes prerendered as
`○ (Static)`]`, but every new file this phase adds (`app/page.tsx` rewrite, new `components/setup/*`,
`lib/geometry/presets.ts`) is a fresh chance to reintroduce a build-only error.
**How to avoid:** Run `npm run build` locally as a pre-deploy check before connecting/pushing to
Vercel, in addition to `npm run test` and `npm run lint`.
**Warning signs:** Vercel's first deploy fails at the build step with a TypeScript or ESLint error
that never surfaced in `next dev`.

### Pitfall 3: Node.js version mismatch between local dev and Vercel's default runtime
**What goes wrong:** Next.js 16 requires Node.js 20.9+ (LTS); Node 18 is no longer supported
`[CITED: node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md — table: "Node.js
20.9+ | Minimum version now 20.9.0 (LTS); Node.js 18 no longer supported"]`. This machine runs
Node v24.19.0 locally `[VERIFIED: ran `node --version` this session]`, comfortably above the floor,
but Vercel's project-level Node.js version setting defaults per-account and may not match.
**Why it happens:** No `.vercel` directory or `vercel.json` exists yet — this project has never been
configured on Vercel, so no Node version has been pinned.
**How to avoid:** During Vercel project setup, confirm (or set) the Node.js version to 20.x or later
in Project Settings → General → Node.js Version.
**Warning signs:** Vercel build fails with an "unsupported engine" or `EBADENGINE` warning/error.

### Pitfall 4: Confusing the two coexisting visual languages when styling the setup screen
**What goes wrong:** The codebase has two parallel color systems — the shadcn neutral theme
(`--background`, `--card`, etc.) and the `outline-*` brand palette (`--outline-accent`,
`--outline-sidebar-bg`, `--outline-page-bg`) used by every existing design screen
`[VERIFIED: app/globals.css:52-112, quoted: `--color-outline-accent: var(--outline-accent);` ...
`--outline-accent: #c98d3a;` ... `--outline-sidebar-bg: #2b2924;` ... `--outline-page-bg: #f7f4ee;`]`.
The UI-SPEC deliberately mixes them (shadcn neutral for setup-screen layout, `outline-accent` amber
as the one accent color) — using the wrong token family for a given element (e.g. `--card` instead
of `--outline-page-bg` for the setup screen canvas, or vice versa) will look inconsistent with the
UI-SPEC's Color section.
**Why it happens:** Two theme systems in one `globals.css` is easy to cross-reference incorrectly
when a component is new (unlike the existing screens, which each committed to one system already).
**How to avoid:** Follow the UI-SPEC's Color table literally — `var(--background)`/`var(--card)` for
dominant/secondary, `var(--outline-accent)` only for the specific accent uses listed (selected/hover
card border, "Start Shaping"/"Continue This Board" labels, focus ring).
**Warning signs:** Setup screen cards render with the dark `outline-sidebar-bg` background, or the
nav bar (which stays dark/brand per spec) gets accidentally re-themed to the neutral palette.

## Code Examples

### Existing preset-button pattern to model `applyPreset` on
```typescript
// Source: components/outline/outline-controls.tsx:283-309 (verified this session) — the existing
// TAIL_PRESETS click handler is the direct precedent for "click a preset → overwrite several
// OutlineSpec fields at once" that a board-type preset should follow:
onClick={() =>
  onChange({
    tail: preset.tail,
    tailAngle: preset.tailAngle,
    tailFullness: preset.tailFullness,
  })
}
```

### Store action shape to add (`design-store.tsx`)
```typescript
// New action, following the existing updateOutline/updateFins pattern exactly
// (components/design/design-store.tsx:116-129, verified this session):
const applyPreset = (preset: BoardPreset) =>
  setState((prev) => ({ ...prev, outline: preset.outline /* + any other seeded slices */ }));
```

### Vitest test file convention to follow for `presets.test.ts`
```typescript
// Source: lib/geometry/outline.test.ts pattern (file exists, imports buildOutline and asserts
// against lib/geometry/__fixtures__/prototype-outline-golden.json) — presets.test.ts should at
// minimum assert every BOARD_PRESETS entry produces a valid OutlineGeometry via buildOutline()
// without throwing, and that dims stay within the OutlineControls slider bounds (length 60-120in,
// widePointWidth 16-25in) documented in components/outline/outline-controls.tsx:139,244.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next lint` command | ESLint CLI directly (`eslint`) | Next.js 16 | Already reflected in this repo's `package.json:9` (`"lint": "eslint"`) — no action needed, just don't reintroduce `next lint` |
| Synchronous `params`/`searchParams` access | Always async (`await params`) | Next.js 15→16 (16 removes the compat shim) | Not directly relevant to this phase's static routes (no dynamic segments), but any future dynamic route in this codebase must use the async form from day one |
| `middleware.ts` | `proxy.ts` | Next.js 16 | Not applicable — this project has no middleware/proxy file; noted so the planner doesn't introduce a now-deprecated `middleware.ts` if auth middleware is anticipated for Phase 2 |
| Manual Webpack/Turbopack flag (`--turbopack`) | Turbopack on by default for `dev`/`build` | Next.js 16 | Already reflected — `package.json` scripts have no `--turbopack` flag, matching the new default |

**Deprecated/outdated:** `next/legacy/image`, `images.domains` config, `serverRuntimeConfig`/
`publicRuntimeConfig` — none of these are used anywhere in this codebase currently
`[VERIFIED: grepped app/ components/ lib/ for "legacy/image", "serverRuntimeConfig" — no matches]`,
so no migration burden exists; noted only so the planner doesn't reach for these deprecated APIs
when building the setup screen.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exact numeric preset values (length/width/nose angle/tail shape etc.) for Shortboard/Mid-length/Longboard, and the illustrative Fish values shown in Code Examples | Architecture Patterns → Pattern 2 | Low — CONTEXT.md D-03 explicitly makes these Claude-drafted-then-user-tuned; the plan should treat all numeric preset values as placeholders the user adjusts live in the outline editor, not final numbers to implement as-is |
| A2 | Vercel's zero-config Next.js detection and default Node.js version behavior in 2026 | Common Pitfalls → Pitfall 3, Don't Hand-Roll table | Low-medium — sourced from a web search summary, not Vercel's own current docs page; if Vercel's dashboard flow has changed materially, the planner/executor should verify against vercel.com/docs at execution time |
| A3 | `process.env.NODE_ENV === "development"` gating is an acceptable, idiomatic way to hide the dev-only "copy current preset values" affordance in this codebase | Architecture Patterns → Pattern 2 | Low — no existing precedent in this codebase for env-gated UI, but it's a standard Next.js/React idiom; if the user wants a different mechanism (e.g., a query param, or removing it before commit), the plan should surface that as a decision point |

## Open Questions

1. **Does `OutlineViewer` need a new prop to hide/shrink callouts for thumbnail-scale rendering?**
   - What we know: `OutlineViewer` has a `compact` prop that shrinks callout font size to
     `var(--summary-font-callout, 10px)` but cannot hide them, and D-08 requires "reuse existing
     outline viewer geometry" for four simultaneous preset-card thumbnails, each much smaller than
     any existing usage (340×620 editor, or Summary's `compact` embedding).
   - What's unclear: Whether the existing `compact` mode is legible enough at card-thumbnail size,
     or whether a `hideCallouts` prop (or a new minimal sibling component using the same
     `buildOutline()` geometry but only the SVG `<path>`) is needed.
   - Recommendation: The planner should scope a small spike/verification task early in
     implementation — render one preset thumbnail at the actual card size from the UI-SPEC's
     spacing scale and visually confirm before committing to reusing `OutlineViewer` unchanged
     versus adding a prop.

2. **Exact tuned values for the four presets (per D-03's workflow) are not yet captured.**
   - What we know: CONTEXT.md is explicit that Claude drafts initial values, the user tunes them
     live in the outline editor, and the tuned values get captured back into `presets.ts`. This is a
     two-pass process that can't fully complete inside a single planning/research pass.
   - What's unclear: Whether the plan should ship with the Claude-drafted placeholder values and
     treat "user tunes and finalizes presets" as a distinct plan-time or execution-time checkpoint,
     or whether tuning should happen synchronously during plan execution.
   - Recommendation: Plan for two waves — (1) implement the preset mechanism with draft values and
     the dev-only capture affordance, (2) a `checkpoint:human-verify`-style task where the user tunes
     each preset in the live editor and the captured values replace the drafts before Phase 1 is
     considered done.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Local dev, build | ✓ | v24.19.0 `[VERIFIED: ran `node --version`]` | — |
| npm | Package management | ✓ | 11.17.0 `[VERIFIED: ran `npm --version`]` | — |
| Vercel CLI | Deployment | ✗ | — | Not required — deploy via Vercel dashboard "Import Project" (Git integration), which needs no local CLI |
| GitHub remote (`cpktoes/shaper`) | Vercel Git integration | ✓ | public repo, `main` default branch `[VERIFIED: ran `gh repo view cpktoes/shaper`, `git remote -v`]` | — |
| Existing Vercel project | First deploy | ✗ (no `.vercel` dir, no prior deploy) | — | None needed — this phase's deployment task *is* creating the first Vercel project |

**Missing dependencies with no fallback:** none — the one "missing" item (Vercel project) is the
deliverable of this phase's deployment task, not a blocker.

**Missing dependencies with fallback:** Vercel CLI (optional; dashboard Git-import flow is the
Claude's-discretion default per CONTEXT.md and needs no local tool install).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 `[VERIFIED: package.json:31]` |
| Config file | `vitest.config.ts` — `include: ["lib/**/*.test.ts"]`, node environment, `@/*` alias `[VERIFIED: vitest.config.ts]` |
| Quick run command | `npm run test` (currently `vitest run`) |
| Full suite command | `npm run test` (same — small suite, 562 tests / 5 files run in ~1s `[VERIFIED: ran `npm run test` this session]`) |

**Gap:** No component/UI test framework is installed (no `@testing-library/react`, no Playwright,
despite CLAUDE.md's constraint naming Playwright for e2e as the prescribed tool — it has not been
installed yet in this codebase `[VERIFIED: grepped package.json devDependencies — no
`@testing-library/*` or `playwright` entries]`). All existing test coverage is `lib/geometry/*`
pure-function golden tests; the setup screen's UI (D-01 through D-08) has no automated test path
today.

### Phase Requirement → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SETUP-01 | User enters overall dims and starts a new design | manual-only (no e2e framework) | — | ❌ Wave 0 (Playwright not installed; out of scope to install just for this) |
| OUTL-01 | Shape outline constrained to dims | unit (existing) | `npm run test -- outline` | ✓ `lib/geometry/outline.test.ts` |
| RAIL-01 | Rail band dims (thickness/apex/tuck) calculated | unit (existing) | `npm run test -- rail-bands` | ✓ `lib/geometry/rail-bands.test.ts` |
| FIN-01/02/03 | Fin config select + calculated placement + overlay | unit (existing, calc only — overlay itself is visual) | `npm run test -- fins` | ✓ `lib/geometry/fins.test.ts` |
| VIZ-01 | 2D visualization of outline/rail/fin | manual-only | — | ❌ (visual; covered by existing `OutlineViewer`/`RailSectionPlot`/`FinViewer` components, no automated visual regression suite exists) |
| UNIT-01 | Inches/litres display | unit (existing) | `npm run test -- units` | ✓ `lib/geometry/units.test.ts` |
| *(new)* preset application | New unit test for `lib/geometry/presets.ts` | unit | `npm run test -- presets` | ❌ Wave 0 — file to be created this phase |

### Sampling Rate
- **Per task commit:** `npm run test` (whole suite; fast enough — ~1s — to run in full every time)
- **Per wave merge:** `npm run test && npm run build` (build catches TS/route errors the test suite
  can't)
- **Phase gate:** `npm run build` green + manual UAT walkthrough of the 5 success criteria (no
  automated e2e exists) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `lib/geometry/presets.test.ts` — covers the new preset module (bounds-checking against
      `OutlineControls`' slider min/max, `buildOutline()` doesn't throw for any preset)
- [ ] No Playwright/e2e install planned this phase — SETUP-01/VIZ-01's user-facing flows remain
      manual-UAT verified, consistent with this codebase's current state (not a regression this
      phase introduces)

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` `[VERIFIED: .planning/config.json]`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes (light) | Client-only architecture with no server-side trust boundary yet — the geometry-in-`lib/` pure-function boundary (project constraint) is itself the relevant architectural control: no user input reaches a database or another service this phase |
| V2 Authentication | no | No accounts/auth exist yet (ACCT-01..03 are Phase 2) |
| V3 Session Management | no | No sessions — in-memory client state only, explicitly non-persistent this phase |
| V4 Access Control | no | No access-controlled resources exist yet |
| V5 Input Validation | yes | Slider/numeric inputs already clamp via `clampFinite(value, min, max)` before entering state `[VERIFIED: components/outline/outline-controls.tsx:34-37]` — new preset-application code and any new setup-screen numeric input (if the plan adds one) must follow the same clamp-before-store pattern, not trust raw values |
| V6 Cryptography | no | No cryptographic operations in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unvalidated preset/state values producing NaN/Infinity in geometry math | Tampering (of local client state, low severity — no server trust boundary crossed) | Same `clampFinite`-before-store pattern already used throughout `outline-controls.tsx`; extend it to any new preset-selection or dims-entry code path |
| XSS via unescaped board name / preset descriptor text | Tampering/Information Disclosure | Existing code renders all user/preset text as plain JSX children (React auto-escapes) — never introduce `dangerouslySetInnerHTML` for board name or preset copy; `OutlineViewer`'s own doc comment already states this constraint (`"never dangerouslySetInnerHTML, no document.write/window.open (threat T-QO-01)"`) `[VERIFIED: components/outline/outline-viewer.tsx:9-11]` |
| Vercel deployment exposing preview/dev-only affordances (the D-03 "copy current values" dev button) in production | Information Disclosure | Gate the dev-only capture button behind `process.env.NODE_ENV === "development"` so it is stripped from the production build Vercel serves (see Open Question / Assumption A3) |

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` — Next.js 16 breaking-change reference, read in full this session
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md` — `LayoutProps` helper, root layout conventions
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md` — confirms current `redirect()` API matches existing `app/page.tsx` usage
- Local codebase, read directly this session: `components/design/design-store.tsx`, `app/page.tsx`, `app/layout.tsx`, `components/site-nav.tsx`, `app/design/layout.tsx`, `lib/geometry/board.ts`, `components/outline/outline-viewer.tsx`, `components/outline/outline-editor.tsx`, `components/outline/outline-controls.tsx`, `lib/geometry/units.ts`, `components/ui/card.tsx`, `app/globals.css`, `package.json`, `tsconfig.json`, `.planning/config.json`, `components.json`
- `npm run test` (562 tests / 5 files passed) and `npm run build` (clean production build, all 6 routes prerendered static) — run live this session

### Secondary (MEDIUM confidence)
- WebSearch: "Vercel deploy Next.js 16 Turbopack App Router git integration production deployment 2026" — confirms zero-config Git-integration deploy flow remains current for 2026

### Tertiary (LOW confidence)
- None used without a HIGH/MEDIUM-confidence cross-check.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all versions read directly from `package.json`/`node_modules`
- Architecture: HIGH — every claim about existing code (store shape, layout structure, component props) verified by reading the actual files this session
- Pitfalls: HIGH for Next.js 16/build/layout pitfalls (verified against bundled docs + live `npm run build`); MEDIUM for the Vercel-specific pitfall (web search only)

**Research date:** 2026-08-19
**Valid until:** 30 days (stable domain — no fast-moving dependencies; Next.js 16 docs are the authoritative bundled reference and won't drift under this project without an explicit upgrade)
