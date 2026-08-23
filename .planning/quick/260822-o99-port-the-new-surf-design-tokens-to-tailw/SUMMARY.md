---
gsd_summary_version: 1.0
quick_id: 260822-o99
slug: port-the-new-surf-design-tokens-to-tailw
date: 2026-08-22
status: complete
commits:
  - 3b1856f feat(design): port the surf design tokens to Tailwind v4
  - f28cbe8 feat(design): move every surface onto the white surf ground
---

# Summary — Surf design tokens + core layout setup

Task 1 of a 3-task design pivot. Tasks 2 (typography) and 3 (controls/selection)
follow as separate quick tasks.

## What shipped

**Token port.** The design language arrived as a Tailwind v3 `tailwind.config.js`.
This project runs Tailwind v4, which has no JS config — the file would have been
inert. Every token now lives in an `@theme static` block in `app/globals.css` under
the same utility names the v3 `theme.extend` block would have produced:
`bg-surf-base`, `text-surf-black`, `bg-surf-accent-cyan`, `bg-surf-accent-orange`,
`text-surf-muted`, `font-display`, `font-body`, `tracking-architectural`.

`static` rather than bare `@theme`: bare tree-shakes theme variables that no utility
references, which would have silently dropped the ones the `:root` aliases and the
SVG board viewers reach through `var()`. Verified by compiling and grepping output.

Space Grotesk and Inter load through `next/font/google`; declared, not yet applied.

**Surfaces.** `bg-surf-base` universally. The `--outline-*` surface tokens were
re-pointed at the surf palette so the 200-700 line control panels land on white
without a class-by-class rewrite — and so the near-white sidebar text (`#f7f4ee`)
did not turn invisible on a white ground. The hardcoded warm hexes (`#e4ddc9`,
`#f3efe3`, `#2b2924`, `#6b6355`) are gone.

**Space.** The 2D preview containers on outline, rails and fins lost their
rounded-border boxes; the canvas columns carry the emptiness instead. Hairlines
survive only where separation is structural — nav underline, sidebar/canvas divide,
the summary grid's adjacent cards, the floating aim-table modal.

## Verification

Lint clean (9 pre-existing warnings in `scripts/`, untouched). 633 tests pass. All
six screens checked in-browser at 1440x900 and 1280x720; no console or server errors.

## Deliberately left alone

- **Accent color.** Cyan vs orange is an open founder decision, so neither is applied
  and `--outline-accent` stays amber — visible on section headers, the Print Summary
  button, active nav links and selected fin/tail chips. Task 3 resolves it.
- **Typography.** Font families, uppercase, tracking and text sizes are Task 2. Some
  warm-grey text hexes (`#8a8272`, `#a49b86`) remain and get converted there.
- **Setup screen preset cards and the rails/fins tab strips.** These are selection
  controls — Task 3's explicit scope.

## Raised for review

1. **Contrast — RESOLVED.** `text-surf-muted` shipped from the source config at
   `#9E9E9E`, which is 2.68:1 on white and fails WCAG AA's 4.5:1 for the body copy and
   labels it carries. Founder approved darkening it; the token is now `#6b6b6b` at
   5.33:1, keeping a clear step down from surf-black's 18.9:1.

   Knock-on: `--outline-station-line` derives from the same token and is specified as
   faint. Its mix dropped 55% -> 36% so it still composites to `#cacaca` on white and
   stays behind the board outline rather than competing with it. The `/20` hairlines
   go `#ececec` -> `#e1e1e1`, marginally more present and still razor-thin.
2. **Latent bug found in passing.** `@theme inline` declares `--font-sans: var(--font-sans)`,
   which is self-referential — nothing defines `--font-sans` at `:root`, so the
   `font-sans` utility on `<html>` resolves to nothing and Geist Sans never applied.
   Left as-is because Task 2 moves everything onto `font-body`, which supersedes it.
   Geist Sans can then be dropped from the font loads.
