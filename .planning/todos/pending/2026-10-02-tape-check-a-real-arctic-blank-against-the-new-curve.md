---
created: 2026-10-02
title: Tape-check a real Arctic blank against the new bottom curve
area: geometry
priority: minor
source: Phase 14, decision D-08 (the check comes after go-live, and gates nothing)
---

# Tape-check a real Arctic blank against the new bottom curve

## What

When an Arctic Foam blank is in the bay, measure its bottom rocker every 6" along the stringer on the
one-page sheet `.planning/phases/14-realistic-surfboard-flow/arctic-blank-tape-check-sheet.pdf`, and
compare each reading with what the app's new square-root curve draws between the blank's five printed
stations (`npx --no-install tsx --tsconfig ./tsconfig.json scripts/phase14-before-after.ts --step curves
--samples <folder>` writes the curve samples; the ROCKER DATASHEET shows the blank's numbers too).

Record the result here: the blank, the date, the largest difference and where along the blank it falls.
A real Marko Foam blank would be a second check.

## Why

The curves went live on 2026-10-02 (Phase 14 go-live 1) on the catalogue evidence alone: on US Blanks
rockers cut down to five stations the new curve redraws the hidden stations three times closer than
today's did (0.112" → 0.035" average miss), Marko's own blanks agree, and Arctic's printed litres agree
within 1%. A tape on real foam is the one check the catalogue cannot give. The founder chose (D-08) to
ship first and measure when a blank is at hand; this todo keeps that measurement from being forgotten.

## Done when

A real Arctic (and ideally a Marko) blank's bottom has been measured every 6" and compared with the app's
curve, and the result — within the printed stations' tolerance, or a difference worth a correction — is
recorded in this file and read back to the founder.
