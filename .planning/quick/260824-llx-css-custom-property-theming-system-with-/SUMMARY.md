---
id: 260824-llx
slug: css-custom-property-theming-system-with-
date: 2026-08-24
type: quick
status: complete
---

# CSS custom property theming system (light + dark) — summary

## What shipped

A three-layer theming system in `app/globals.css` (ramps → semantic contract → Tailwind
bridge), plus light and dark themes, plus one defect fix that the dark theme exposed.

**The load-bearing decision:** the bridge holds `var()` indirection instead of literal hex
(`--color-surf-base: var(--surf-ground)`), inside `@theme static` rather than `@theme inline`.
`static` still emits every token as a real custom property at `:root`, so the 20 places that
read `var(--color-surf-*)` straight out of TSX keep working; `inline` would have inlined the
values into utilities and stopped emitting the properties, breaking exactly those call sites.
That one choice is why **228 utility call sites and `app/layout.tsx` needed zero changes** and
still theme correctly.

## Verified, not assumed

- `npm run build` ✓ · `npx tsc --noEmit` ✓ · `npm test` 638/638 ✓ · browser console clean
- Compiled CSS confirmed to contain the indirection (`--color-surf-base:var(--surf-ground)`),
  both dark blocks, the ramps, and a `@media print` block that forces the light ramp.
- The `dark:` variant compiles to **both** `:where(.dark, .dark *)` and
  `@media (prefers-color-scheme:dark) :where(:root:not(.light), …)`, so shadcn's `dark:`
  utilities in `components/ui/*` stay in step with the tokens.
- All six cascade cases exercised live in the browser:

  | OS preference | class on `<html>` | result |
  |---|---|---|
  | dark | *(none)* | dark, `color-scheme: dark` — **no JS involved** |
  | dark | `.light` | light (override wins) |
  | dark | `.dark` | dark |
  | light | *(none)* | light |
  | light | `.dark` | dark (override wins) |
  | light | `.light` | light |

- Contrast computed numerically (WCAG 2.1 relative luminance), not eyeballed — the AA test
  was removed on 2026-08-24, so a throwaway checker was used and first validated by
  reproducing all eight ratios already asserted in the file's comments.

## Contrast results

Light values are **unchanged** from the published palette; every existing ratio is preserved.

| pairing | light | dark |
|---|---|---|
| ink on ground | 18.88 | 16.71 |
| ink-muted on ground / well | 5.33 / 4.89 | 7.69 / 8.01 |
| accent-ink on ground | 5.39 | 11.84 |
| warning-ink on ground | 5.00 | 8.63 |
| on-accent on accent | 12.28 | 12.28 |
| on-warning on warning | 5.97 | 5.97 |
| line on ground (3:1 bar) | 3.03 | 3.70 |

`--surf-accent` (#00e5ff) is 1.54:1 on white. Not a failure — it is a fill only, never text
and never a bare stroke, always carries `--surf-on-accent` (12.28:1) and its own 1px boundary.
Documented at the token.

## Two defects found and fixed

1. **shadcn `--muted-foreground`** was `oklch(0.556)` = 4.35:1 on `--muted` — under the 4.5:1
   bar, and `text-muted-foreground` on `bg-muted` is a pairing shadcn's own primitives
   produce. Now `oklch(0.54)` = 4.61:1. Visually indistinguishable.
2. **The rail plot's board outline vanished in dark.** `hardEdge`, `boardConn`, `bottomConn`
   and `railConn` in `components/rails/rail-section-plot.tsx` were all `#1c1b19` — 17.21:1 on
   white but **1.07:1** on the dark ground. These four are not categorical data hues; they
   draw the board's own edge, an ink role. Repointed at `var(--color-surf-ink)`. The six
   genuine data hues were left untouched per the standing rule that they stay outside the
   brand palette; all six clear 3:1 in both themes (lowest: tuck1 at 3.44:1 in dark).

Also fixed in passing: `--outline-board-fill` mixed the accent into a hardcoded `white`, the
one value that could not follow a theme. It now mixes into `--surf-ground`, with a per-theme
strength (6% light / 12% dark / 0% print).

## Deliberately NOT done

- **A toggle control.** The system is driven by `.dark`/`.light` on `<html>`; building the
  button plus persistence is a separate change. Note that persisting an explicit override is
  the *only* part that would need an inline script — the default paint never does.
- **shadcn `--border` / `--input`** fail WCAG 1.4.11 non-text contrast (1.26:1 light,
  1.31:1 dark, against a 3:1 bar). Raising them would visibly thicken every hairline in an
  app whose design language is explicitly razor-thin hairlines — a founder decision, not a
  silent fix.
- **Reinstating the AA test** (`lib/design/palette.test.ts`, removed 2026-08-24). Offered,
  not done unasked; it was declined once already.
