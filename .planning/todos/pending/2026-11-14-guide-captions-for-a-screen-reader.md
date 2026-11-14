---
created: 2026-11-14
title: GUIDE cards — should a drawing's caption be read to a screen reader
area: ui
severity: minor
files:
  - components/guide/guide-card.tsx
  - .planning/phases/18-a-guide-on-every-page/18-REVIEW.md
source: Phase 18 code review LW-05 and 18-VERIFICATION.md, carried at the v1.5 milestone close, 2026-11-14
resolves_phase:
---

# GUIDE cards — should a drawing's caption be read to a screen reader

## Problem

On every GUIDE card the drawing and the caption under it (for example "dashed, +1/2" at the center") are hidden from a screen
reader together, by the design contract. The two sentences and the How to shape note are read; the caption, which says what the
dashed line shows on this board, is not. The review (LW-05) put it to the founder as a question and it was never answered.

## What is needed

His word on whether the caption should be read aloud. If yes: the caption leaves the hidden figure (or the card gains a text
alternative saying the same), on all 84 cards and BOTTOM's, with the screen-reader checks in the GUIDE browser specs updated.
