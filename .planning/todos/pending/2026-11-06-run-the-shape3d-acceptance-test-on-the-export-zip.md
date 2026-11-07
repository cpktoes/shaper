---
created: 2026-11-06
title: Run the Shape3D acceptance test on the Export 3D Files zip
area: 3d
severity: minor
files:
  - components/3d/export-cnc.ts
  - .planning/phases/16-3d-board-and-cnc-export/16-UAT.md
source: Phase 16 close-out, R8 left open by the founder 2026-11-06
resolves_phase:
---

# Run the Shape3D acceptance test on the Export 3D Files zip

## Problem

Shape3D has never opened the files the live Export 3D Files button produces. The founder shipped without the
test ("shape3d I'll have to come back to", 2026-11-06), and the button's caption says the export is experimental
and Shape3D may or may not import the files yet. The file layout is a published contract (D-14), now live unverified.

## Solution

Run the Fish's zip through Shape3D's Scan import, as in 16-RESEARCH.md §C and test 1 of 16-UAT.md: the .dxf as a
Board with the board unit set to mm, one slice file as a Slice, the outline file as an Outline, the .stl as a scan.
Each should load with the tail at x = 0, the deck up and the length in millimetres. If all pass, the caption can
lose "experimental" and R8 closes. If any fail, change only what Shape3D refused.
