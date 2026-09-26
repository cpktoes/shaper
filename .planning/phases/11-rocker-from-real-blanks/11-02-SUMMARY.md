---
phase: 11-rocker-from-real-blanks
plan: 02
subsystem: units-display-and-preferences
status: complete
tags: [units, measure-display, preferences, fit-defaults, blanks]
requires: []
provides:
  - "formatSignedMark(value, system) in lib/geometry/measure-display.ts"
  - "lib/fit-defaults-preference.ts: five fit/tip defaults, bounds, allow-list parser, cookie string + readers, per-field sign-in handoff"
affects:
  - "11-06 (fit-defaults Server Action + DB columns) will parse through parseFitDefaultValue / parseFitDefaultsPreference"
  - "11-08 (defaults provider + gear-menu dialog) will use FIT_DEFAULTS_RANGE_IN, the cookie helpers and decideFitDefaultsHandoff"
  - "The ROCKER THICKNESS section's Tweak hint will print through formatSignedMark"
tech-stack:
  added: []
  patterns:
    - "Third instance of the account-preference pattern (units, print toggle, fit defaults)"
    - "Per-field decidePreferenceHandoff for a multi-field preference"
key-files:
  created:
    - lib/fit-defaults-preference.ts
    - lib/fit-defaults-preference.test.ts
  modified:
    - lib/geometry/measure-display.ts
    - lib/geometry/measure-display.test.ts
decisions:
  - "decideFitDefaultsHandoff accepts account/browser as FitDefaultsPreference | null (null reads as five nulls), so the server resolver can pass 'no account row' straight through"
  - "parseFitDefaultValue allows 1e-6 mm of float slack at each bound and snaps it back onto the bound, so a value exactly on 12\" (or 0\") after an inch/mm round trip is kept rather than read as not chosen"
  - "adoptIntoBrowser and promoteToAccount both carry the full merged preference, so a promotion write can never blank a field the account already held"
metrics:
  duration: "about 6 minutes"
  completed: 2026-09-26
  tasks: 2
  files: 4
actuals:
  tokens: 6700
  tasks: 2
  commits: 4
---

# Phase 11 Plan 02: Signed shaping mark and the five fit defaults Summary

A thickness tweak can now read "+1/16"" in Imperial or "+2 mm" in Metric through the app's one
display boundary, and the five shaper defaults — Extra Length 2", Extra Center Thickness 3/8",
Width Margin 1", Nose Tip 5/16", Tail Tip 1/4" — exist as named, bounded settings with a reader
that treats every stored value as untrusted and settles sign-in one setting at a time.

## What a shaper gets from this

- **The Tweak hint has a formatter.** Under each 12" thickness on the new ROCKER screen, the
  amount a shaper nudged the foam by will read `+1/16"`, `-1/8"` or `0"` in Imperial, and `+2 mm`,
  `-2 mm` or `0 mm` in Metric. The sign is taken from what was actually printed, so a nudge too
  small to show never reads as `+0 mm` or `-0 mm`.
- **The five defaults are defined once.** What they are called, what they default to when nobody
  has chosen, and what a sane value is (Extra Length 0"–12", Extra Center Thickness 0"–1", Width
  Margin 0"–3", each tip 1/8"–1 1/2"). The two floors that hide a blank from the list (D-04) and
  the width margin (D-05) are settings here, not numbers baked into a filter.
- **Nothing it reads back can break the screen.** A hand-edited cookie, a garbage browser entry or
  an out-of-range number reads as "not chosen" and shows the default. It never throws.
- **Two devices don't fight.** Pick a tip on the laptop and a margin on the phone, then sign in:
  both survive, because each setting is settled on its own.

The account columns, the save action and the gear-menu dialog come in 11-06 and 11-08. This plan
is the pure part only.

## Tasks

| Task | Name | Commits | Files |
| ---- | ---- | ------- | ----- |
| 1 (tracer, TDD) | A fine-tune reads "+1/16"" or "+2 mm": the signed shaping mark | 935633b (RED), 9de018b (GREEN) | lib/geometry/measure-display.ts, lib/geometry/measure-display.test.ts |
| 2 (TDD) | The five fit and tip defaults: names, defaults, bounds, and a parser that trusts nothing | 20499d5 (RED), d086513 (GREEN) | lib/fit-defaults-preference.ts, lib/fit-defaults-preference.test.ts |

## Verification

- `npx vitest run lib/geometry/measure-display.test.ts lib/units-isolation.test.ts`: 99 passed (7 new `formatSignedMark` cases, including the R15 anchor: `2.374"` reads `2 3/8"`, stored `60.2996` mm computed through `inchesToMm`).
- `npx vitest run lib/fit-defaults-preference.test.ts`: 28 passed.
- Full `npx vitest run`: 64 files, 2552 passed, 2 skipped (both pre-existing skips).
- `npx tsc --noEmit`: exit 0 (after `npx next typegen` in the worktree, see Deviations).
- `npm run lint`: exit 0. The 12 warnings are all in pre-existing files; `npx eslint` on this plan's four files is clean.
- Purity: `grep -cE "from ['\"]react['\"]|@/lib/db" lib/fit-defaults-preference.ts` prints 0. The only `document`/`localStorage` mentions are in comments.
- No expected number is hand-typed as a millimetre figure: the Imperial expectations delegate to `formatSignedInchesFraction`, the Metric ones are built from `formatWholeMm` and cross-checked against the UI-SPEC copy table's `+1/16"` ↔ `+2 mm`, and every default and bound comes through `inchesToMm` or `DEFAULT_FOIL_SPEC`.

## TDD Gate Compliance

Both tasks have a `test(...)` RED commit followed by a `feat(...)` GREEN commit. Task 1's RED run
failed 6 of 7 new cases. The seventh, the R15 anchor, passed from the start because it exercises
the existing `formatMark` and pins current behaviour. Task 2's RED run failed at import because
the module did not exist yet. No refactor commits were needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `npx tsc --noEmit` failed on Next's generated `LayoutProps` type in a fresh worktree**
- **Found during:** Task 1 verification
- **Issue:** `app/layout.tsx` and `app/design/layout.tsx` reference `LayoutProps`, which Next.js generates into `.next/types/`. That folder exists in the main checkout but not in this new worktree, so the type gate failed for reasons unrelated to this plan.
- **Fix:** ran `npx next typegen` inside the worktree. It only writes the gitignored `.next/` folder, starts no dev server and touches nothing in the main checkout. `tsc` then exits 0.
- **Files modified:** none tracked.

**2. [Rule 2 - Correctness] Float slack at the bounds in `parseFitDefaultValue`**
- **Found during:** Task 2
- **Issue:** a strict comparison would read a value sitting exactly on a bound, plus float noise from an inch↔mm round trip (e.g. 12" + 1e-9 mm), as out of range, so the shaper's choice would silently revert to the default.
- **Fix:** allow 1e-6 mm of slack at each end and snap the result back onto the bound, so what comes out is always inside the range. Real out-of-range values (e.g. max + 1/16") are still rejected. Covered by a dedicated test.
- **Commit:** d086513

**3. [Rule 2 - Robustness] `decideFitDefaultsHandoff` accepts `null` for account/browser**
- **Found during:** Task 2
- **Issue:** the server resolver in 11-06 will have "no account row" as a real case.
- **Fix:** `null` reads as five nulls, so callers need no special case. This is additive; the plan's signature still type-checks.
- **Commit:** d086513

## Human verification deferred to end-of-phase UAT

- Task 1 is a tracer, but `workflow.human_verify_mode` is `end-of-phase`, so it did not stop. Its automated verify passed end-to-end. The on-screen check that the ROCKER THICKNESS hint reads `Tweak +1/16"` / `Tweak +2 mm` needs the screen built in later plans and belongs to end-of-phase UAT.

## Known Stubs

None. `lib/fit-defaults-preference.ts` has no consumers yet by design (11-06 and 11-08 wire it).
That is planned sequencing, not a stub.

## Threat Flags

None. The cookie and parser surfaces are exactly the ones in the plan's threat register (T-11-04
mitigated by the allow-list, T-11-05 by the try/catch readers, T-11-06 accepted). Both mitigations
are tested.

## Self-Check: PASSED

- FOUND: lib/geometry/measure-display.ts (exports formatSignedMark)
- FOUND: lib/fit-defaults-preference.ts
- FOUND: lib/fit-defaults-preference.test.ts
- FOUND commits: 935633b, 9de018b, 20499d5, d086513
