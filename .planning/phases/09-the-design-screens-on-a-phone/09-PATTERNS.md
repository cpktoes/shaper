# Phase 9: The Design Screens on a Phone - Pattern Map

**Mapped:** 2026-09-08
**Files analyzed:** 20
**Analogs found:** 18 / 20

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `components/design/design-screen-shell.tsx` (new) | component (layout shell) | request-response (render props) | `components/outline/outline-editor.tsx` (+ 4 siblings) | exact (extraction target) |
| `components/outline/outline-editor.tsx` (modified) | component | render | itself (pre-extraction) | exact |
| `components/rocker/rocker-editor.tsx` (modified) | component | render | `outline-editor.tsx` | exact |
| `components/rails/rail-band-editor.tsx` (modified) | component | render | `outline-editor.tsx` | exact (one prop diff: `data-print-hide`) |
| `components/fins/fin-placement-editor.tsx` (modified) | component | render | `outline-editor.tsx` | exact (one diff: modal sibling) |
| `components/volume/volume-estimator.tsx` (modified) | component | render | `rail-band-editor.tsx` | role-match (single-scroller aside, no dev footer) |
| `app/layout.tsx` (modified) | config/root layout | request-response | itself + `components/template/export-preview-dialog.tsx` (dvh precedent) | exact |
| `app/design/layout.tsx` (modified) | layout (passthrough) | request-response | itself | exact |
| `app/globals.css` (modified) | config (theme tokens) | n/a | itself (`@custom-variant dark`, `@theme static`) | exact |
| `components/outline/outline-viewer.tsx` (modified) | component (SVG viewer) | event-driven (pointer) | itself + `rocker-viewer.tsx` | exact |
| `components/rocker/rocker-viewer.tsx` (modified) | component (SVG viewer) | event-driven (pointer) | `outline-viewer.tsx` | exact |
| Bottom tab bar (new, likely `components/design/bottom-tab-bar.tsx`) | component (nav) | request-response | `components/site-nav.tsx` | role-match |
| Compact top bar (new, likely `components/design/compact-top-bar.tsx`) | component (nav) | request-response | `components/site-nav.tsx` | role-match |
| The one menu (new, likely inside compact top bar or `components/design/design-menu.tsx`) | component (menu) | event-driven | `components/settings-menu.tsx` | exact (Base UI Menu primitives idiom) |
| `components/rails/rail-band-editor.tsx` — one-at-a-time switch | component | event-driven (tab state) | `components/viewer/tabbed-panel.tsx` + `components/viewer/two-option-toggle.tsx` | exact |
| `components/rails/view-full-sized-dialog.tsx` (modified, phone note) | component (dialog) | request-response | itself | exact |
| `lib/geometry/outline-drag.ts` — `nearestOutlineDragTarget` (new fn) | utility (pure geometry) | transform | `outline-drag.ts`'s own `outlineDragPoints`/`solveOutlineDrag` | exact (same file) |
| `lib/geometry/rocker-drag.ts` — `nearestSideProfileDragTarget` (new fn) | utility (pure geometry) | transform | `rocker-drag.ts`'s own `sideProfileDragPoints`/`solveSideProfileDrag` | exact (same file) |
| `lib/geometry/outline-drag.test.ts` / `rocker-drag.test.ts` (new test cases) | test | n/a | `lib/geometry/outline-drag.test.ts` (existing) | exact |
| `playwright.config.ts` (new) | config | n/a | none in repo | no analog (see below) |
| `e2e/phone-layout.spec.ts`, `e2e/touch-drag.spec.ts` (new) | test (e2e) | event-driven | none in repo (vitest suites are the nearest sibling convention) | no analog (see below) |

## Pattern Assignments

### `components/design/design-screen-shell.tsx` (new)

**Analog:** the five editors' shared markup, quoted verbatim from three of them.

**The exact shape to extract** [VERIFIED `components/outline/outline-editor.tsx:186-227`, byte-identical in `components/rocker/rocker-editor.tsx:151-202`, `components/rails/rail-band-editor.tsx:208-242`, `components/fins/fin-placement-editor.tsx:129-165`]:
```tsx
<div className="flex min-h-0 w-full flex-1 flex-nowrap"> {/* rails adds data-print-hide here */}
  {!wideView && (   // outline/rocker only — rails/fins have no wideView, always render aside
    <aside className="flex h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] flex-col border-r border-surf-line-faint bg-surf-sidebar text-surf-ink">
      <div className="min-h-0 flex-1 overflow-y-auto p-10">
        {/* per-screen Controls component */}
      </div>
      {process.env.NODE_ENV === "development" && (
        <div className="flex-none border-t border-surf-line-faint p-4">
          <Button variant="ghost" size="sm"
            className="w-full border border-outline-sidebar-divider bg-outline-sidebar-input-bg text-outline-sidebar-text hover:border-surf-accent hover:bg-surf-accent hover:text-surf-on-accent"
            onClick={handleCopyPreset}>
            {justCopiedPreset ? "Copied!" : "Copy preset values"}
          </Button>
        </div>
      )}
    </aside>
  )}
  <main className={wideView
    ? "flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-0 bg-surf-canvas p-1"
    : "flex h-full min-h-0 min-w-0 flex-1 basis-[480px] flex-col gap-0 bg-surf-canvas p-3"}>
    <TabbedPanel bare={wideView} tabs={...} active={...}>{/* viewer/data content */}</TabbedPanel>
  </main>
</div>
```

**Volume's real difference** [VERIFIED `components/volume/volume-estimator.tsx:29-30`] — `aside` has no separate scroll div, no dev footer:
```tsx
<aside className="h-full min-h-0 w-full max-w-[400px] flex-1 basis-[340px] overflow-y-auto border-r border-surf-line-faint bg-surf-sidebar p-10 text-surf-ink">
  <VolumeControls ... />
</aside>
```

**Two structural exceptions the shell's props must accept (Pitfall 5):**
1. RAILS' root `data-print-hide` [VERIFIED `components/rails/rail-band-editor.tsx:208`] — must be an optional passthrough prop, not hard-coded on/off for all five.
2. FINS' `<ToeAimTableModal>` sibling rendered *outside* the `aside`/`main` two-column root [VERIFIED `components/fins/fin-placement-editor.tsx:197-203`] — the shell needs an "outside the columns" children slot.

**Phone stacking (new, per UI-SPEC):** gate the whole two-column layout under `shell:`/`max-shell:` (declared once in `app/globals.css`'s `@theme static`, see below); below the breakpoint render the pinned-drawing-over-scrolling-controls stack instead — same `aside`/`main` content, different wrapper classes, per UI-SPEC's per-screen pinned-height table.

---

### `app/layout.tsx` (dvh root + viewport export)

**Analog:** itself — the file being modified — plus the app's one existing `dvh` precedent.

**Current height chain to replace** [VERIFIED `app/layout.tsx:69,94`]:
```tsx
<html className={`${geistMono.variable} ${inter.variable} h-full antialiased`} suppressHydrationWarning>
  ...
  <body className="flex h-full flex-col overflow-hidden bg-surf-ground">
```

**Existing `dvh` precedent to follow** [VERIFIED per RESEARCH.md citing `components/template/export-preview-dialog.tsx:231`, `components/rails/view-full-sized-dialog.tsx:134`]:
```tsx
className="max-w-[95vw] sm:max-w-3xl max-h-[90dvh] overflow-y-auto ..."
```

**`viewport` export shape (Next 16 verified field names)**:
```tsx
import type { Viewport } from "next";
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};
```
Do not add `maximumScale`/`userScalable` (Pitfall 4 — WCAG violation).

**Where the bottom tab bar / compact top bar mount:** as siblings of `<SiteNav />`'s current single mount point, gated by `hidden max-shell:flex` / `max-shell:hidden` — see `components/site-nav.tsx` below for the exact class-gating idiom to mirror.

---

### `app/globals.css` — new tokens

**Analog:** the existing `@custom-variant dark` block, copied structurally [VERIFIED `app/globals.css:59-68`]:
```css
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

**New rules to add, same file, same `@theme static` block already declaring tokens:**
```css
@theme static {
  --breakpoint-shell: 820px; /* generates shell: and max-shell: variants automatically */
}
@custom-variant coarse (@media (pointer: coarse));
```
Usage: `hidden max-shell:flex` (phone-only), `max-shell:hidden` (desktop-only), `coarse:h-11` (touch-only sizing) — never a JS `matchMedia` check (Anti-Pattern, RESEARCH.md).

---

### `components/outline/outline-viewer.tsx` / `components/rocker/rocker-viewer.tsx` (touch drag)

**Analog:** each viewer is the analog for the other — both already share one shape.

**Today's exact per-circle hit target** [VERIFIED `components/outline/outline-viewer.tsx:644-654`, `components/rocker/rocker-viewer.tsx:933-943`]:
```tsx
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
`DRAG_HIT_PX = 15` [VERIFIED `outline-viewer.tsx:97`, `rocker-viewer.tsx:117`] — UI-SPEC raises this to 22 (coarse) / floor 18.

**Drag lifecycle already in place** [VERIFIED `outline-viewer.tsx:408-413,540-542`, `rocker-viewer.tsx:726-731,753-755`]:
```tsx
function handleDragStart(target: OutlineDragTarget, event: ReactPointerEvent<SVGElement>) {
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  // ...
}
// on the <svg> root, not per-circle:
onPointerMove={onOutlineDrag ? handleDragMove : undefined}
onPointerUp={onOutlineDrag ? handleDragEnd : undefined}
onPointerCancel={onOutlineDrag ? handleDragEnd : undefined}
```

**Missing today, confirmed absent by full read (must be added):** no `select-none`/`-webkit-touch-callout: none` anywhere in either file (Pitfall 3) — add `select-none` (Tailwind utility, precedent at `components/ui/slider.tsx:30` and `components/settings-menu.tsx`'s `Menu.RadioItem` className) plus an inline `style={{ WebkitTouchCallout: "none" }}` on every hit-circle and the root `<svg>`.

**D-15 nearest-point-wins — structural change (Pitfall 2):** today each circle owns its own `onPointerDown`; this must move to one delegated pick per file, calling the new pure function below, on a single pointerdown target (the `<svg>` root or a full-canvas invisible catcher) rather than per-circle handlers for the `coarse:` case.

**The drag readout chip (D-17):** built on `CalloutChip`/`CalloutChipFrame` [VERIFIED `components/viewer/callout-primitives.tsx:59,392,435`] — `CALLOUT_PX = { value: 14, name: 11, dim: 14, chipW: 104, chipH: 32 }`. Reuse `CalloutChipFrame` + SVG `<text>` exactly as `CalloutChip` composes them; the one deliberate difference is the value's ink color (`--surf-accent-ink` instead of `CalloutChip`'s usual `var(--outline-ink)`).

---

### `lib/geometry/outline-drag.ts` / `lib/geometry/rocker-drag.ts` — nearest-point pick (new pure functions)

**Analog:** the file's own existing exports and doc-comment discipline [VERIFIED `lib/geometry/outline-drag.ts:1-50`] — "One definition per formula," "Every result is slider-representable." New function follows the same file, same import style (`type { Mm }` from `./units`), no new dependency.

**Shape to add** (from RESEARCH.md's Code Examples, matching the existing `OutlineDragPointAt`/`OutlineDragTarget` types already in the file):
```ts
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
Mirror as `nearestSideProfileDragTarget` in `lib/geometry/rocker-drag.ts` against `sideProfileDragPoints`.

---

### `lib/geometry/outline-drag.test.ts` (analog for new geometry tests, incl. rocker-drag.test.ts)

**Analog:** itself — the existing suite structure to extend, not replace [VERIFIED `lib/geometry/outline-drag.test.ts:1-40`]:
```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD_SPEC, type OutlineSpec } from "./board";
import {
  OUTLINE_DRAG_LIMITS,
  type OutlineDragTarget,
  outlineDragPoints,
  solveOutlineDrag,
} from "./outline-drag";
import { buildOutline } from "./outline";
import { type Mm, degrees, inchesToMm, mm, mmToInches } from "./units";

const BASE = DEFAULT_BOARD_SPEC.outline;

function pointFor(spec: OutlineSpec, target: OutlineDragTarget) { /* ... */ }

describe("outlineDragPoints", () => {
  it("reports one grabbable point per target", () => { /* ... */ });
});
```
New `describe("nearestOutlineDragTarget", ...)` block goes in the same file, following the same `pointFor`/`ALL_TARGETS` fixtures already declared at the top.

---

### Bottom tab bar / Compact top bar (new)

**Analog:** `components/site-nav.tsx`, quoted in full [VERIFIED `components/site-nav.tsx`]:
```tsx
const NAV_LINKS = [
  { href: "/design/outline", label: "TEMPLATE" },
  { href: "/design/rocker", label: "ROCKER" },
  { href: "/design/rails", label: "RAILS" },
  { href: "/design/volume", label: "VOLUME" },
  { href: "/design/fins", label: "FINS" },
  { href: "/design/summary", label: "SUMMARY" },
] as const;

// active-link idiom to mirror for the bottom bar's top accent rule:
className={
  "border-b-2 pb-0.5 text-xs font-bold tracking-architectural uppercase transition-colors " +
  (active
    ? "border-surf-accent text-surf-ink"
    : "border-transparent text-surf-ink-muted hover:text-surf-ink")
}
```
Reuse `NAV_LINKS` verbatim (same order, same labels) rather than re-declaring it — `usePathname()` for the active check, `Link` from `next/navigation`, `data-print-hide` on the bar root exactly as `SiteNav` carries it [VERIFIED `components/site-nav.tsx:36`].

Compact top bar's right cluster (`Save`, divider, menu button) mirrors `SiteNav`'s existing right-cluster composition:
```tsx
<span aria-hidden className="ml-1 h-4 w-px bg-surf-line-faint" />
<SettingsMenu />
<span aria-hidden className="h-4 w-px bg-surf-line-faint" />
<SaveButton />
<NavAuthControl />
```

---

### The one menu (new — SettingsMenu + NavAuthControl combined)

**Analog:** `components/settings-menu.tsx`, quoted in full for the Base UI `Menu` idiom [VERIFIED `components/settings-menu.tsx`]:
```tsx
import { Menu } from "@base-ui/react/menu";

<Menu.Root>
  <Menu.Trigger aria-label="Settings" className="... rounded-md p-1 text-surf-ink-muted ...">
    <SettingsIcon aria-hidden className="size-4" />
  </Menu.Trigger>
  <Menu.Portal>
    <Menu.Positioner side="bottom" align="end" sideOffset={10} className="isolate z-50">
      <Menu.Popup className="min-w-64 origin-(--transform-origin) rounded-lg border border-surf-line-faint bg-surf-panel p-1.5 shadow-lg outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
        {/* Menu.RadioGroup for Units, Menu.RadioGroup for Theme, both siblings */}
      </Menu.Popup>
    </Menu.Positioner>
  </Menu.Portal>
</Menu.Root>
```
New "one menu" renders `SettingsMenu`'s existing content, a `Menu.Separator`/divider row, then `NavAuthControl` as a last row inside the same `Menu.Popup` — per UI-SPEC's explicit settlement, not a nested/second popup. Trigger icon changes to `MenuIcon`/`aria-label="Menu"`, sized `size-8` resting / `coarse:size-11` touch.

---

### RAILS one-at-a-time switch (Nose/Center/Tail on phone)

**Analog:** `components/viewer/tabbed-panel.tsx` (non-bare mode) [VERIFIED lines 1-80] — three-tab `PanelTab<T>` array, `active`/`onSelect` controlled state, the exact idiom Phase 8's View Full Sized dialog already uses for the same three-way choice per UI-SPEC. Do not build a new toggle component; reuse `TabbedPanel` with `tabs={[{id:"nose",label:"NOSE"},{id:"center",label:"CENTER"},{id:"tail",label:"TAIL"}]}`. `sectionOpen` state already exists in `rail-band-editor.tsx` [confirmed by CONTEXT.md/RESEARCH.md] to seed which tab opens first (Nose when none open).

Secondary analog for a segmented look: `components/viewer/two-option-toggle.tsx` [VERIFIED full file] — byte-copied `PillButton` styling (`rounded-md border px-1 py-2.5 text-[11px] font-bold`, active = `border-surf-on-accent bg-surf-accent text-surf-on-accent`) — useful only if `TabbedPanel` proves visually wrong for this spot; UI-SPEC already directs `TabbedPanel`.

---

### `components/rails/view-full-sized-dialog.tsx` phone note (D-13)

**Analog:** itself. Current dialog shell [VERIFIED lines 134, 198, 255]:
```tsx
className="max-w-[95vw] sm:max-w-3xl max-h-[90dvh] overflow-y-auto border-surf-line-faint bg-surf-panel text-surf-ink"
...
data-actual-size-box="check-bar"
...
Print
```
Phone branch (`max-shell:`) removes the `data-actual-size-box="check-bar"` element and the zoom-caveat sentence, replaces the title suffix, and keeps the `Print` button and Nose/Center/Tail tabs untouched — gate with the same `max-shell:hidden` / `hidden max-shell:block` class-pair idiom used elsewhere, not a JS check.

---

## Shared Patterns

### Width breakpoint / pointer variant (cross-cutting: shell, viewers, nav, dialogs)
**Source:** new addition to `app/globals.css`, structurally modeled on the existing `@custom-variant dark` block [VERIFIED `app/globals.css:59-68`].
**Apply to:** `design-screen-shell.tsx`, bottom tab bar, compact top bar, both viewers' touch sizing, `view-full-sized-dialog.tsx`'s phone branch, `measure-field.tsx`, `components/ui/slider.tsx`, `components/ui/button.tsx`.
```css
@theme static { --breakpoint-shell: 820px; }
@custom-variant coarse (@media (pointer: coarse));
```

### Screen-only view state (never saved, never in the snapshot)
**Source:** the existing `useState` pattern for `orientation`/`showConstruction`/`wideView`/`sectionOpen` in `outline-editor.tsx`/`rocker-editor.tsx`/`rail-band-editor.tsx`.
**Apply to:** the Fine adjust group's open/closed state, RAILS' phone-only active-rail tab, the drag readout's visibility.

### The `aside`/`main` flex shell (pre-extraction)
**Source:** `components/outline/outline-editor.tsx:186-227` (see full excerpt above).
**Apply to:** every one of the five editors as the extraction baseline for `design-screen-shell.tsx`; volume-estimator.tsx's simplified aside is the one variant to preserve as an option, not force into the four-screen shape.

### Pointer Events drag (mouse + touch, one path)
**Source:** `outline-viewer.tsx`/`rocker-viewer.tsx`'s existing `handleDragStart`/`onPointerMove`/`onPointerUp`/`onPointerCancel` (see excerpts above).
**Apply to:** both viewers only — no new gesture library, no duplicate handlers (explicit inherited constraint).

### `Button`/`Input`/`Slider` sizing
**Source:** `components/ui/slider.tsx` (`after:-inset-2` thumb hit area), `components/ui/button.tsx` (`h-8`/`size-8`), `components/ui/input.tsx` (`text-base md:text-sm`).
**Apply to:** every control in the controls scroller, gated by `coarse:` per the Touch sizing table in UI-SPEC — enlarge via a single class addition at each of these central components (fourteen call sites fixed at once), not per-caller overrides.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `playwright.config.ts` | config | n/a | First Playwright installation in this repo (TEST-01); no existing config to pattern-match. Use RESEARCH.md's Code Examples config shape (`testDir: "./e2e"`, `webServer` on port 3100, `devices["iPhone 14"]`/`devices["Pixel 7"]` projects) verbatim. |
| `e2e/phone-layout.spec.ts`, `e2e/touch-drag.spec.ts` | test (e2e) | event-driven | No Playwright tests exist yet; nearest sibling convention is the `lib/geometry/*.test.ts` vitest suites (describe/it structure, fixture-driven assertions) for *organization discipline* only — the actual touch-drag mechanics must follow RESEARCH.md's CDP `Input.dispatchTouchEvent` example (`page.context().newCDPSession(page)`), since `page.touchscreen` cannot drag. |

## Metadata

**Analog search scope:** `components/outline/`, `components/rocker/`, `components/rails/`, `components/fins/`, `components/volume/`, `components/design/`, `components/viewer/`, `components/ui/`, `components/`, `app/`, `lib/geometry/`
**Files scanned:** ~30 (five editors, both viewers, both drag-geometry files + their tests, site-nav, settings-menu, tabbed-panel, two-option-toggle, callout-primitives, slider-row, app/layout.tsx, app/design/layout.tsx, app/globals.css, view-full-sized-dialog.tsx, rail-band-editor.tsx)
**Pattern extraction date:** 2026-09-08
