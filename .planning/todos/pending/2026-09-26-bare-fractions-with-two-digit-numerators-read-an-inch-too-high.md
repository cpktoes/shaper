---
created: 2026-09-27T01:50:00.000Z
title: Bare fractions with two-digit numerators read an inch too high in Imperial fields
area: units
severity: major
files:
  - lib/geometry/units.ts
  - lib/geometry/units.test.ts
---

## Problem

Found by plan 12-02's executor while testing the planer-pass counter (2026-09-26), and confirmed
by the orchestrator on the branch base with a throwaway probe:

| Typed | Stored as | Should be |
|-------|-----------|-----------|
| `11/16` | 1 1/16" | 11/16" |
| `13/16` | 1 3/16" | 13/16" |
| `15/16` | 1 5/16" | 15/16" |
| `10/16` | 1" | 5/8" |
| `1 11/16`, `0 11/16`, `3/16`, `9/16` | correct | — |

Any Imperial typed field (a width, a thickness, a station, a fin measure) that a shaper fills with a
bare two-digit-numerator fraction quietly gets a whole inch too much, with no error shown. Single-digit
numerators are fine, and a leading whole number (even `0`) makes it parse correctly.

**Cause:** in `parseImperial` (`lib/geometry/units.ts` ~:382) the regex
`^(-?\d+(?:\.\d+)?)?\s*(?:(\d+)\s*\/\s*(\d+))?$` lets the optional whole-number group take the first
digit of `11`, leaving `1/16` for the fraction group. A whole number followed directly by a fraction with no
space between them is not a form anyone types, so the fix is to require whitespace (or a hyphen) between the
whole and the fraction when both are present, or to try the fraction-only match first.

## Solution

Quick task: fix the regex so a bare `NN/DD` fraction is parsed as a fraction alone, add the cases above to
`lib/geometry/units.test.ts` (both the bare forms and the still-correct `1 11/16` / `0 11/16` forms), and
then drop the `0 11/16"` workaround comment 12-02 left in `lib/geometry/measure-display.test.ts` (that test
must still pass unchanged once the parser is right). Not a Phase 12 file — do it as its own quick task after
the phase lands.
