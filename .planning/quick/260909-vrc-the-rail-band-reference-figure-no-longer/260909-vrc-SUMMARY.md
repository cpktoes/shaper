---
quick_id: 260909-vrc
status: complete
completed: 2026-09-09
plan: 260909-vrc-PLAN.md
---

# Quick task 260909-vrc — The rail band reference figure follows the theme on screen

## What a shaper sees now

On Slate and Phosphor the rail band reference figure — on the RAILS INSTRUCTIONS tab and on the
Summary's third page — sits on the theme's own dark ground instead of a white box, with the board
outline in the theme's ink and the rail-mark red and tuck purple lifted so they still read. On
Daylight and Chalk nothing changes: same white panel, same prototype colours. On paper nothing
changes either: print forces the Daylight tokens, so the sheet prints white with the prototype's
exact hues.

## What changed

- `components/rails/rail-plan-side-figure.tsx`: the panel is `bg-surf-ground border-surf-line-faint`
  and the labels `text-surf-ink`; the strokes and legend swatches read `REF_GROUP_SCREEN_COLORS`.
- `components/rails/rail-reference-paths.ts`: `REF_GROUP_COLORS` (the prototype's own values, still
  pinned by the fidelity test) is untouched; new `REF_GROUP_SCREEN_COLORS` spreads it and swaps
  `black` → the ink token, `railMark1`/`railBand1` → `--surf-rail-mark`, `railTuck1`/`tuckBlend` →
  `--surf-rail-tuck`.
- `app/globals.css`: `--ramp-<theme>-rail-mark` / `-rail-tuck` on all four ramps (#C00000 / #7030A0
  on Daylight and Chalk; #e05050 / #a874e0 on Slate and Phosphor), `--surf-rail-mark` /
  `--surf-rail-tuck` in every theme block including the print block, and the `--color-surf-*`
  bridge for Tailwind.

- Follow-up (e1a41a0): the plan view is drawn over a raster crop of the prototype's background (white
  paper, grey grid), which still showed as a white block. Two more per-theme tokens,
  `--surf-raster-filter` (`none` on the light ramps, `invert(1)` on the dark) and
  `--surf-raster-blend` (`normal` / `screen`), are applied to that image through Tailwind
  arbitrary properties; read back on Slate as `invert(1)` + `screen` on screen and `none` +
  `normal` under print emulation.

## Measured

Contrast against each ground (WCAG relative luminance): the lifted red reads 4.76:1 on Slate and
5.21:1 on Phosphor (was 2.84 / 3.11); the lifted purple 5.47:1 / 5.98:1 (was 2.30 / 2.51); the
outline now takes the ink token (18.88:1 on Slate, was 1.07:1). The six other hues already cleared
3:1 on both grounds and are unchanged. Read back from a real browser in all four themes: on Slate
the panel is rgb(18, 20, 26) with strokes in the theme ink, #a874e0 and #e05050; under print
emulation every theme paints the panel white with the prototype strokes.

## Proof

`npx tsc --noEmit` clean; `npx vitest run` 2401 passed / 2 skipped (the prototype-fidelity test on
the colour map still passes because that map is unchanged); `npm run lint` 0 errors;
`PW_PORT=3100 npx playwright test` 166 passed, 0 failed, five desktop baselines unchanged (they
show the light theme, whose values did not move).

## Human verification deferred

- On the phone or desktop in Slate or Phosphor: RAILS → INSTRUCTIONS, and Summary page 3 with
  "Include Rail Band Instructions in Print" ticked — the figure sits on the dark ground and every
  line reads; print preview still shows white paper.
