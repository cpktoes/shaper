---
created: 2026-11-09
title: BOTTOM's GUIDE adopts the shared GUIDE card once Phase 17 and Phase 18 are both on main
area: ui
severity: minor
files:
  - components/bottom/bottom-guide.tsx
  - components/bottom/bottom-cartoon.tsx
  - components/guide/
source: Phase 18's context (D-14, D-19), 2026-11-09
resolves_phase:
---

# BOTTOM's GUIDE adopts the shared GUIDE card

## Problem

Phase 17 (BOTTOM, on branch `claude/beautiful-fermi-ad3fb7`) built its GUIDE tab first, with its own card in
`components/bottom/bottom-guide.tsx`. Phase 18 (A GUIDE on Every Page, on branch `page-guides`) builds the same card as a
shared component under `components/guide/` — the same dress, plus a value tag beside the name, a caption line under the
cartoon and a *Model info* block — so the five other pages read as one with BOTTOM. While the two phases are on separate
branches there are two cards.

## What is needed

Once both are on `main`: BOTTOM's GUIDE renders through the shared `GuideCard` / `GuideTab` (its cartoon stays its own), its
words module keeps its page-tested pattern, and `bottom-guide.tsx`'s private card goes. No change to what a BOTTOM card says or
draws; `e2e/bottom-guide.spec.ts` stays green. A quick task, after whichever phase lands second.
