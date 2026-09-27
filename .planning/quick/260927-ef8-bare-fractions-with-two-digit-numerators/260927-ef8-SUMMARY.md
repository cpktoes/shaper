---
phase: quick-260927-ef8
plan: 01
subsystem: geometry / units
tags: [imperial, parsing, typed-fields, bugfix]
status: complete
requires: []
provides:
  - "parseImperial reads a fraction typed on its own whole, whatever its numerator (11/16 = eleven sixteenths)"
affects:
  - "Every Imperial typed field (through commitTypedMeasure, the only caller)"
tech-stack:
  added: []
  patterns:
    - "Inch part read as exactly one of two anchored shapes: whole-or-decimal optionally followed by whitespace and an unsigned fraction, or an optionally signed bare fraction"
key-files:
  created: []
  modified:
    - lib/geometry/units.ts
    - lib/geometry/units.test.ts
    - lib/geometry/measure-display.test.ts
decisions:
  - "A minus in front of a bare fraction is read, not refused: -11/16 is minus eleven sixteenths, and -1/2 (refused before) now reads as minus a half"
  - "A whole number glued onto a fraction with no space (191/2) reads as one fraction (191 halves); the field clamps it and shows the result, so it is never silent"
metrics:
  duration: "about 6 minutes"
  completed: 2026-09-27
actuals:
  tokens: 1830
  tasks: 2
  commits: 3
---

# Quick 260927-ef8: Bare fractions with two-digit numerators Summary

**What changed for the shaper:** typing 11/16", 13/16" or 15/16" into any Imperial box now saves
exactly that, rather than quietly adding an inch (1 1/16", 1 3/16", 1 5/16"). Typing 10/16" now saves
5/8" instead of 1". Everything typed with a space between the whole number and the fraction
(`2 11/16`, `19 1/2`) reads exactly as before.

## What was done

**Task 1 (tracer), the parser fix, commit `a75caf1`.** In `parseImperial`, the inch part used to be one
pattern where the whole number could take the first digit of `11`, which left `1/16` for the
fraction. It is now two anchored shapes that can't overlap:
1. A whole or decimal number, optionally signed, optionally followed by at least one whitespace
   character (`\s+`) and an unsigned fraction.
2. A fraction on its own, with an optional leading minus.

The doc comment now describes this grammar. The feet prefix, the trailing-quote strip and the total
are unchanged. `measure-display.ts` is not edited, because `commitTypedMeasure` is the only caller and
it picks up the fix automatically.

Tests added:
- `units.test.ts` has 15 reading cases and 3 refused cases. Every expected value is written as
  arithmetic on the typed fraction (`11 / 16`, `6 * 12 + 11 / 16`, `-(2 + 11 / 16)`).
- `measure-display.test.ts` has one `commitTypedMeasure` test on an Imperial mark field clamped to
  1/2"–5" (a range that holds both 11/16" and 1 1/16", so the clamp can't hide the bug). Typing
  `11/16` commits 11/16" and typing `10/16` commits 5/8".

**RED count: 10 failing tests before the fix.** Nine were parseImperial cases: `11/16`, `13/16`,
`15/16`, `10/16`, `11/16"`, `21/16`, `6' 11/16"`, `-11/16` and `-1/2`. The tenth was the
commitTypedMeasure 11/16 test. The single-digit, whole-part and refused cases already passed, as the
plan predicted. After the fix both files pass (176/176).

**Tracer gate:** after the commit I re-ran the two files' automated checks (176 passed), then went on
to Task 2 as the orchestrator ruled. There was no mid-plan checkpoint.

**Task 2, removing the workaround, commit `6308b74`.** The planer-pass sweep used to put a `0 ` in
front of printed bare fractions to get around this bug. I deleted the workaround and its comment
(numstat +1/−7), so the sweep now reads `printed` directly. It passes with no assertion changed.

**Plan-time consequences, confirmed with a probe after the fix:**
- These still read the same as before: `1 / 2` → 0.5, `19 1 / 2` → 19.5, a tab as the separator →
  19.5, `18.5 1/2` → 19, `6'2"` → 74, `5'11 15/16"` → 71.9375, `-0 11/16` → −0.6875.
- These are still refused (null): `2-11/16`, `+1/2`, `1/0`.
- One reading changed on purpose: `191/2` now gives 95.5 (191 halves), as the plan states.

## Gates

After each task:
- `npx vitest run`: 3043 passed, 2 skipped.
- `npx tsc --noEmit`: 0 errors, after `npx next typegen`.
- `npm run lint`: 0 errors. It shows 11 warnings, all of them existing unused-eslint-disable
  directives in files this task didn't touch.

No build, dev server or Playwright run, per the orchestrator's rulings.

## Deviations from Plan

None. The plan was carried out as written.

## Human verification deferred to end-of-phase UAT

None. Nothing in this change is on screen beyond the value a typed box saves, and the
commitTypedMeasure test covers that.

## Known Stubs

None.

## Commits

- `a75caf1` fix: typing 11/16" (or 13/16", 15/16") into an Imperial field now gives exactly that, not an inch more
- `6308b74` test: the planer-pass check reads a printed 11/16" straight back, now that typing it works

## Self-Check: PASSED

- lib/geometry/units.ts, lib/geometry/units.test.ts and lib/geometry/measure-display.test.ts are all
  modified, and both commits are in the worktree branch log.
