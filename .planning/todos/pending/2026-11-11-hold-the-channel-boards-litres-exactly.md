---
created: 2026-11-11
title: Hold the channelled boards' litres exactly, and let the record be made again
area: tests
severity: minor
files:
  - lib/geometry/phase17-channel-litres.test.ts
  - lib/geometry/__fixtures__/phase17-channel-litres-pin.json
  - scripts/extract-phase17-channel-litres-pin.ts
  - lib/geometry/volume.ts
  - lib/geometry/rail-bottom.ts
  - lib/geometry/bottom-draw.ts
source: Phase 17 fix-wave code review (17-FIXWAVE-REVIEW.md, WR-03, IN-01 to IN-03), 2026-11-11
resolves_phase:
---

# Hold the channelled boards' litres exactly

## Problem

The record of 49 channelled boards' litres (17-19) was taken before the solid-board fix (17-20), so the test now holds
the 24 soft-rail boards only loosely (within 0.01 L, or 0.15 L on the Longboard) against real changes of +0.0025 L and
+0.0634 L. Its "to the last digit" branch runs on none of the 49 boards and nothing fails if it never runs. Today's
litres for a channelled soft-rail board are written down nowhere, and the script that made the record refuses to run
again, so it cannot be made again if a starter board changes.

Also noted by the same review, none of them giving a wrong figure a shaper would see:

- IN-01: slightly negative section areas at the tail roll's stations on the Fish with a Rolled Vee and channels (there
  before the fix waves; well under 0.001 L).
- IN-02: where a channel would be as deep as the rail is thick, RAILS holds its floor at the deck while the solid board
  ends the foam (no stock board reaches it; it belongs with D-45, the deep-channel warning).
- IN-03: the section gauge's comment names two places for the rail lift; the behaviour is right ("Match DATA").

## What is needed

A fresh record of the channelled boards' litres made from the live maths by a script that can run again, a test that
holds every board to it exactly and fails if any branch never runs, and the three notes above tidied or ruled on.
