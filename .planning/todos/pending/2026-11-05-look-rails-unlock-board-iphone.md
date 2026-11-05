---
created: 2026-11-05
title: board-lock-screens' look-rails case fails on the iPhone project, the Unlock Board button not found
area: e2e (board lock)
severity: medium
files:
  - e2e/board-lock-screens.spec.ts
found_by: the 16-16 executor, 2026-11-05; fails the same way on de1d5e2f, before 16-16
---

## Problem

`e2e/board-lock-screens.spec.ts`, "look-rails", on the iphone project: the Unlock Board button is not found. Phase 16's
quiet A/B runs on pre-phase code saw this spec fail identically, so it may predate the phase.

## Needed

A look before go-live 2's full gate: a real failure on an upright iPhone or a test that lost its target.
