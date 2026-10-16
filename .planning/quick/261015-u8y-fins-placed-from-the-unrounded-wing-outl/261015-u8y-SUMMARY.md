---
phase: quick-261015-u8y
plan: 01
subsystem: geometry / fins / wings
tags: [fins, wings, corner-radius, wing-lock, design-store]
requires:
  - quick-261014-wii (wings; D8 "fins listen to the closest piece of physical rail")
  - quick-261015-hz7 (slot locks)
provides:
  - outlineForFins: the outline every fin number is worked out from (wings sharp-cornered)
affects:
  - lib/geometry/wings.ts
  - lib/geometry/wing-lock.ts
  - components/design/design-store.tsx
tech-stack:
  added: []
  patterns:
    - "maths reads a sharpened copy, drawings read the real board; same object when nothing to sharpen"
key-files:
  created: []
  modified:
    - lib/geometry/wings.ts
    - lib/geometry/wings.test.ts
    - lib/geometry/wing-lock.ts
    - lib/geometry/wing-lock.test.ts
    - lib/geometry/design.ts
    - lib/geometry/fins.ts
    - components/design/design-store.tsx
    - components/fins/fin-viewer.tsx
    - e2e/wings.spec.ts
    - .claude/skills/sketch-findings-shaper/references/wings.md
    - .planning/sketches/014-wings-tab/README.md
decisions:
  - "D2: every fin calculation (12-inch width, in-from-the-rail tail, the wing lock's own fin placement) reads the wings with corner radius 0"
  - "D3: no wings, or all radii 0, hands back the very same outline object, so such a board is byte-identical"
  - "D4: FINS' tail drawing is cut from the rounded board; the maths tail is cut from the sharp one (two tails, one memo each)"
  - "P2: FINS' dimension lines read the maths tail so each line spans exactly its printed number"
  - "P4: resolveWingStations still returns the radius the shaper asked for"
metrics:
  tasks: 3
  commits: 4
status: complete
actuals:
  tokens: 11000
  tasks: 3
  commits: 4
---

# Phase quick-261015-u8y Plan 01: Fins placed from the unrounded wing outline Summary

Every fin number is now worked out as if the wing's corners were sharp, so turning a wing's corner-radius slider never moves a fin, while the rounded corners stay on every drawing and print.

## What changed for a shaper

- Turning a wing's corner-radius slider no longer moves any fin: distance off the tail, in from the rail, spread, toe and base length all stay put, whether the wing is locked to the fins or placed by hand.
- Sliding the wing, or changing its depth or run, still moves the fins beside it, exactly as the founder's earlier rule says ("Fins listen to the closest piece of physical rail next to them"). That rule now reads the sharp step.
- A locked wing settles at the same station at every radius, because the lock works out its fins from the same sharp-cornered board the screen does.
- Every drawing keeps its rounded corners: the board on every screen, the WINGS close-up, the prints, the rack, the litres, and FINS' own tail drawing (the founder: "keep the rounded corners on the FINS drawing.").
- On FINS, each fin's "in from the rail" is measured to the sharp step, not to the drawn rounded rail.
- A board with no wings, or with all corner radii at 0, places its fins exactly as before (the fins read the very same outline object).

## Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 (tracer) | a4353cf | Changing a wing's corner radius no longer moves the fins |
| 2 | 4a64451 | Tests prove a wing's corner radius never moves a fin, on every fin setup |
| 3 | 6dd962e | The wing notes say fins are set from the sharp step, and how far a rounded step reaches |
| summary | (this commit) | docs(quick-261015-u8y): summary — fins placed from the unrounded wing outline |

## TDD record (Task 1)

- RED, before any production code: `wing-lock.test.ts` "the narrow squash McKee SB quad: the locked wings settle at the same stations at every radius" failed (stations differed between radius 0 and the rounded radii), and the browser test failed on its marks assertion (the rear fin circles moved by about 0.34 drawing units, for example cx 203.90 against 203.57). The `outlineForFins` unit tests failed as "not a function".
- GREEN: with the helper, the lock and the store wired in, both pass.
- Mutation check on Task 2: making `outlineForFins` return its input unchanged made 14 of the new tests fail (every radius sweep, the narrow-station test, the radius-keeping test), so the sweeps are not vacuous. Restored afterwards.

## Gates (each read in its own call)

| Gate | Result |
| ---- | ------ |
| `npx vitest run` (whole suite) | exit 0 — 141 files, 5124 passed, 2 skipped (pre-existing skips) |
| `lib/geometry/wings`, `wing-lock`, `fins` tests | 319 passed after Task 1; wings + wing-lock 168 passed after Task 2 |
| radius sweep lines in the verbose report | 11 (`radius sweep:` one per board), all passing |
| `npx next typegen && npx tsc --noEmit` | exit 0 |
| `npx eslint` on the nine touched source files | exit 0 |
| `e2e/wings.spec.ts`, `phone-fins-labels`, `phone-fins-landscape`, `phone-screen-tiles` (all projects) | exit 0 — 92 passed, 124 skipped (project-gated tests), 0 failed |
| `e2e/desktop-baseline.spec.ts --project=desktop -g "FINS"` | exit 0 — 1 passed (the no-wing FINS screenshot matches unchanged, D3) |
| new browser test "moves no fin" (desktop) | RED then GREEN, passes in the full run too |
| `git diff 9058054 -U0 -- lib/geometry/wings.ts`, removed lines | 0 (wings.ts only gained lines, D1) |

No existing test line was edited (F7): `wings.test.ts`, `wing-lock.test.ts` and `e2e/wings.spec.ts` only gained imports, new `describe` blocks and one new `test`. `npm run build` was not run (it does not work in a worktree; the orchestrator runs it on main).

## Things the founder should know

- **FINS' dimension lines (P2, F4).** The dimension lines on FINS read the same sharp tail the fin maths read, so each line spans exactly its printed number. Where a rounded corner reaches a fin, the off-rail line's rail end therefore stands a hair outside the drawn rail: 0.024" on the Mid-length's rear-locked wing 2 at its top radius (a third of one of FINS' drawing units, under one screen dot); up to about 0.054 to 0.060" on 3/8" x 1/2" wings. If the founder would rather the lines touch the drawn rail (and run a hair shorter than their number), it is one prop to flip: pass the drawn tail to the viewer instead.
- **The 12-inch width (P3).** The dimmed "Tail Width @ 12"" row and the toe-aim table on FINS read the fins' own 12" width, the sharp one. On every board as "+ Add a wing" makes it, that equals the drawn board's 12" width exactly. It differs only when a rounded wing's step or fade reaches the 12" station (for example a front-locked wing 1 on the 12" line rounded to its top: FINS can read 36.9 cm where TEMPLATE reads 36.8 cm).
- **Saved boards (P5, F6).** No saved board is rewritten. A saved board whose rounded wing sits beside a fin shows the sharp-step fin positions the next time it opens. On the Mid-length as "+ Add" makes it, the rear fins sit 0.024" further out from the stringer; every printed fin number (off tail 6 1/4", off rail 1 1/4", toe 3/16") reads the same.

## Human verification deferred to the founder's look

- Open the Mid-length, add both wings, go to FINS, then back to TEMPLATE and slide wing 2's corner radius from its top to sharp: no fin number or fin mark on FINS should move, while the drawn tail corner on FINS still changes. (The desktop browser test already proves this headlessly; the founder's eye on the drawing is the part a test cannot give.)

## Deviations from Plan

None - plan executed exactly as written. The plan's `<executor_environment>` suggested symlinking `node_modules`; the orchestrator's ruling (an APFS clone, no symlink) was followed instead, and the stray `node_modules/node_modules` link was removed.

## Known Stubs

None.

## Threat Flags

None. Pure client-side geometry; no route, request, account, storage or package change. T-u8y-01 (a missing, negative or NaN radius counts as already sharp) is pinned by a unit test; T-u8y-02 (fin numbers a shaper cuts to) is covered by the eleven-board radius sweep and the browser test.

## Self-Check: PASSED

- `lib/geometry/wings.ts` contains `export function outlineForFins`: FOUND
- Commits a4353cf, 4a64451, 6dd962e on this branch: FOUND
- All gates above exit 0.
