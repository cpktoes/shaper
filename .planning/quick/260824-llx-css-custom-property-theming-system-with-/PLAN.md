---
id: 260824-llx
slug: css-custom-property-theming-system-with-
date: 2026-08-24
type: quick
status: planned
---

# CSS custom property theming system (light + dark)

Give `app/globals.css` a real three-layer theming system so the surf design language can
render in more than one theme, without touching the 228 `surf-*` utility call sites or the
20 direct `var(--color-surf-*)` references in TSX.

## Why this is not just "add a `.dark` block"

A `.dark` block already exists — it flips shadcn's neutral oklch tokens. But the app is not
painted with those tokens. It is painted with the seven `--color-surf-*` brand tokens, which
are **hardcoded light-mode hex values** in `@theme static`. So today "dark mode" changes
almost nothing visible. The system has to make the *surf* palette themeable to be real.

## Design

Three layers, so a fourth theme is one block and no refactor:

1. **Ramps** (`--ramp-light-*`, `--ramp-dark-*`) — raw values, defined once at `:root`,
   never consumed by components. A new theme adds a new ramp.
2. **Contract** (`--surf-ground`, `--surf-ink`, …) — semantic role names. Each theme block
   assigns the contract from one ramp. This is the only layer components should ever grow
   new dependencies on.
3. **Tailwind bridge** (`@theme static`) — maps `--color-surf-*` to the contract so every
   existing utility and every direct `var()` reference keeps working unchanged.

Selectors, in cascade order:
- `:root` → light (the default; correct with **zero JS on first paint**)
- `@media (prefers-color-scheme: dark)` guarded by `:root:not(.light)` → system dark, also
  zero JS
- `:root.dark` → explicit dark, wins over system preference
- `:root.light` → explicit light, wins over system preference

Because `:root` alone is a complete theme, the first paint is always correct with no
inline script and no hydration flash. An inline script is only needed to *restore a
persisted override*, which is out of scope here.

## Naming convention

`--surf-<role>[-<modifier>]`, where the role names what the colour *does*, never what it
*is*. `--color-surf-black` cannot survive theming (in dark it would have to hold near-white);
`--surf-ink` can. Literal names are kept as deprecated aliases pointing at the contract.

Pairing rule encoded in the names: any `--surf-<x>` fill has a matching `--surf-on-<x>`
foreground, and any colour safe as text/stroke on the page ground carries the `-ink` suffix.

## Tasks

1. Restructure `app/globals.css` into ramps → contract → bridge; add the light and dark
   theme blocks and the `color-scheme` declarations.
2. Widen the `dark` custom variant to fire on system preference as well as `.dark`, so
   shadcn's `dark:` utilities stay in sync with the tokens.
3. Theme the `--outline-*` block (including a dark value for the widepoint knot, kept as a
   data colour, not folded into the brand palette).
4. Force the light ramp inside `@media print` — a template printed from dark mode must not
   come out as a black page.
5. Fix the one AA failure in the inherited shadcn palette: light `--muted-foreground`
   `oklch(0.556)` → `oklch(0.54)` (4.35:1 → 4.61:1 on `--muted`).
6. Verify: `npm run build`, `npx tsc --noEmit`, `npm test`, and confirm the generated CSS
   actually contains the themed custom properties.

## Contrast budget (verified numerically, not by eye)

Light values are **unchanged** from the published palette — every existing ratio is
preserved. Dark values were solved against the same 4.5:1 (text) / 3:1 (UI boundary) bars.

| pairing | light | dark |
|---|---|---|
| ink on ground | 18.88 | 16.71 |
| ink-muted on ground | 5.33 | 7.69 |
| ink-muted on well | 4.89 | 8.01 |
| accent-ink on ground | 5.39 | 11.84 |
| warning-ink on ground | 5.00 | 8.63 |
| on-accent on accent | 12.28 | 12.28 |
| on-warning on warning | 5.97 | 5.97 |
| line on ground (3:1 bar) | 3.03 | 3.70 |

`--surf-accent` (#00e5ff) is 1.54:1 on white and is **not** a failure: it is a fill only,
never text and never a bare stroke, and it always carries `--surf-on-accent` (12.28:1) plus
its own 1px boundary. That invariant is documented at the token.

## Out of scope (flagged, not silently done)

- **A toggle control.** The system is toggled by putting `.dark`/`.light` on `<html>`;
  building the button + persistence is a separate change.
- **`RAIL_SEGMENT_COLORS`** in `components/rails/rail-section-plot.tsx` — categorical data
  colours deliberately outside the brand palette. Several (`#1c1b19`) would be near-invisible
  on a dark ground and need their own pass.
- **shadcn border/input tokens** fail WCAG 1.4.11 (1.26:1 in light, 1.31:1 in dark) against
  the 3:1 non-text bar. Raising them would visibly thicken every hairline in the app, which
  is a design decision for the founder, not a silent fix.
