---
created: 2026-11-11
title: Run the production-build browser tests on the BOTTOM fixes that went live 2026-11-11
area: tests
severity: minor
files:
  - e2e/prod/
  - playwright.prod.config.ts
source: Phase 17 fix-wave go-live gate (17-UAT.md), 2026-11-11
resolves_phase:
---

# Run the production-build browser tests on the BOTTOM fixes

## Problem

The seven fixes from the founder's BOTTOM walk-through went live on 2026-11-11 as main `93c0ea8f` after the type check,
lint, the unit suite, the full browser suite, a production build and the desktop pictures. The five production-build
browser tests under `e2e/prod/` (error pages, phone controls, slider dots, the practice rack, 3D) were NOT run: they
need the machine's own settings file, which lives only in the main folder, and that folder was on another branch. The
founder was told before he said Go.

## What is needed

`npm run test:e2e:prod` from the main folder once it is on `main` at or after `93c0ea8f` (the 3D spec matters most:
17-20 changed the solid board's sections). Record the result in `17-UAT.md`'s gate table.
