---
phase: quick-261112-c2d
plan: 01
subsystem: export
tags: [brd, channels, 3d, akushaper]
requires:
  - phase: quick-261110-veo
    provides: the .brd writer and its channel-wall handling
provides:
  - brdLeavesChannelsOut and brdFileBottom in lib/export/brd.ts
  - the .brd export written from the board before its channels are cut
  - the line "Channels are left out of the file — cut them by hand." on the 3D page
affects: [3d export, .brd file]
tech-stack:
  added: []
  patterns: [export builds a second channel-less surface inside the tap only when the board has channels]
key-files:
  created: []
  modified:
    - lib/export/brd.ts
    - lib/export/brd.test.ts
    - components/3d/three-d-screen.tsx
    - components/3d/three-d-controls.tsx
    - components/3d/three-d-copy.ts
    - e2e/three-d-export.spec.ts
key-decisions:
  - "The file carries the board with Channels switched off by the app's own None; every nose, center and tail cut and the wing rule are kept."
  - "A board without channels is handed back its own bottom (same object), so its file is byte for byte as before."
  - "The writer's channel-wall code (wall knots, the 3 mm lean, 1 1/2 inch section spacing) stays, untouched and tested."
status: complete
completed: 2026-11-12
actuals:
  tokens: 6200
  tasks: 2
  commits: 2
---

# Phase quick-261112-c2d Plan 01: The .brd export leaves channels out Summary

**Export .brd File on a board with channels now writes the board as it stands before the channels are cut, concaves and vees kept, and the 3D page says so in one line under the button.**

## What a shaper gets

- On a board with 4, 6 or 8 channels, the downloaded file is the same, byte for byte, as the same board with Channels set to None. Every nose, center and tail cut (concave, vee, belly) is still in it.
- On the 4-channel Deep Single Shortboard, the file holds 13 cross-sections. Each has 6 knots: the usual five places (bottom at the stringer, bottom edge, widest point, shoulder, deck at the stringer) plus one extra knot the writer adds board-wide so the sections can follow the concave. The channel walls' pair of knots are gone, and the only corner any section has is at the bottom edge.
- A board without channels is written exactly as before.
- The 3D drawing keeps its channels; nothing the screen draws changed.
- Under the export button, a board with channels shows "Channels are left out of the file — cut them by hand." A board without channels does not. A swallow-tail board with channels shows the swallow line first, then this one.

## Tasks

1. **Tracer: the file leaves the channels out** — commit `b900a77c`. `brdLeavesChannelsOut` and `brdFileBottom` in `lib/export/brd.ts` (header rewritten to say so, wall handling noted as kept), one new describe block in `lib/export/brd.test.ts`, the export tap in `three-d-screen.tsx` building a second channel-less surface only when there are channels, and browser case 7. Verify passed (Vitest 83 of 83; case 7 passed), so the plan carried on without stopping.
2. **The 3D page's line** — commit `5f1a67ca`. `exportChannelsNote` in the copy file, the prop and a `data-three-d-export-channels` div in `three-d-controls.tsx`, passed from the screen; browser checks in cases 1, 5, 7 and a new case 8.

## Verification

- `npx vitest run lib/export/brd.test.ts`: 83 passed (all existing wall tests unchanged).
- `npx next typegen && npx tsc --noEmit`: clean.
- `npm run lint`: 0 errors, 1 warning that was already there in `lib/db/import-designs-action.test.ts` (not touched).
- `e2e/three-d-export.spec.ts` on the desktop project: 8 passed.
- 3D desktop baseline (`e2e/desktop-baseline.spec.ts -g "3D"`): passed unchanged, nothing re-recorded.

## Deviations from Plan

**1. [Rule 1 - Plan assumption wrong] The channel-less Deep Single file has six knots a section, not five**
- **Found during:** Task 1, running the new test.
- **Issue:** The plan and brief say "five knots a section". On the Deep Single the writer's own fit adds one knot board-wide (role `added`, within `BRD_ADDED_KNOTS_MAX`) because the five base knots cannot follow the concave within the 1 mm section target. That is the writer's existing, correct behaviour, and it is the same for the same board with Channels None.
- **Fix:** The test asserts what the ruling is really about: the roles other than `added` equal the flat Shortboard's five, no `wallFoot` or `wallTop` role, every section has the same knot count, and a corner only at `bottomEdge`. Browser case 7 asserts the same count on every section. The writer was not changed.
- **Files modified:** `lib/export/brd.test.ts`, `e2e/three-d-export.spec.ts`.
- **Commit:** `b900a77c`.

**2. [Process] RED run skipped**
- The two small functions were written just before their tests, so the tests were not seen failing on missing exports first. The new tests do fail if `brdFileBottom` stops dropping the channels (the text-equality test compares against the Channels None board).

AGENTS.md was not rewritten by the dev server; nothing to leave out of the commits.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `lib/export/brd.ts` exports `brdFileBottom` and `brdLeavesChannelsOut`: found.
- Commits `b900a77c` and `5f1a67ca` are on branch `close-bottom-17`.
