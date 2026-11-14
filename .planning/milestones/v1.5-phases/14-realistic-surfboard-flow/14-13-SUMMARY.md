---
phase: 14-realistic-surfboard-flow
plan: 13
subsystem: geometry (blank fit, runs-out reasons)
status: complete
tags: [blank-fit, runs-out, thinning-starts, automatic, property-tests]
requires: ["14-10", "14-11"]
provides:
  - "RunsOutCause member thinningStart"
  - "runsOutClause arm: your {end} thinning starts too close to the tip"
  - "tip-flow.test.ts describes: the runs-out reason names a start set too close (UI-SPEC §10); Automatic reads only the planer cut, and the tweak, the skin and Tip Style keep their meanings (D-04, D-23, R7); Automatic does not flicker, the list stays fast, and the deck-tweak shortcut stays honest (D-23)"
affects: [blank list WON'T FIT rows, the BLANK section's flag, tweakExceedsDeckSkin doc]
tech-stack:
  added: []
  patterns: ["classify a runs-out by comparing the board with its own starts against the board on Automatic, both before any fine-tune"]
key-files:
  created: []
  modified:
    - lib/geometry/blank.ts
    - lib/geometry/blank-fit.ts
    - lib/geometry/blank-reasons.ts
    - lib/geometry/blank-reasons.test.ts
    - lib/geometry/tip-flow.test.ts
    - lib/geometry/blank-fit.test.ts
decisions:
  - "thinningStart fires where a start set by hand nearer the tip than Automatic's decides the thickness (the hand-set taper and the start itself), the tip setting is not under the floor, the board is under the floor there before fine-tunes with its own start, and Automatic would have left enough foam (automaticThicknessAt at least the floor)"
  - "Test (a) now expects thinningStart on its 6-inch hand-set boards; test (b-prime) expects the untweaked board's own cause and never fineTune"
metrics:
  duration: "about 75 minutes"
  completed: 2026-10-03
actuals:
  tokens: 10500
  tasks: 3
  commits: 4
---

# Phase 14 Plan 13: The runs-out reason names a start set too close, and Automatic's promises proven Summary

When a shaper sets a tip's Thinning Starts by hand too close to the tip and that leaves less than 1/4" of foam, the blank list and the flag now say `Less than 1/4" would be left 6" from the tail — your tail thinning starts too close to the tip` instead of blaming the blank for being too thick. Three describes in `tip-flow.test.ts` now prove the rest of the tip rule's promises on the real test boards: Automatic ignores the 12" fine-tunes, the Deck Skin and Tip Style; a 12" fine-tune stays a nudge on top of the taper; Tip Style only picks which surface the thinning comes off; Automatic's start glides as the board slides, never jumping back; and the blank list stays fast.

## What changed for a shaper

- **A new, truthful reason (UI-SPEC §10, D-05).** `RunsOutCause` gains its fifth member, **`thinningStart`**. Its sentence reads `your {end} thinning starts too close to the tip`, with no full stop, in both systems. It is not a new way to fail: the 1/4" floor already refused these boards, and only the reason changes. On the default 72" board at a 1" centre with both starts set by hand at 6", all 86 runs-out verdicts in the catalogue used to say "this blank is too thick for a 1" center". They now name the start.
- **The order, first match wins:** `offBlank`, then `tipSetting` (the station is inside that tip's OWN taper, however far in it starts), then `thinningStart`, then `fineTune`, then `thinCenter`.
- **A board with one start by hand and the other on Automatic** names the end that caused it. If a blank's nearest-to-fitting placement slides the board until the Automatic end runs out on its own, that end keeps its own reason. The hand-set start at the other end is never blamed. The Marko Foam 8'0" Gun is an example: with the nose start set by hand, its tail runs out at 12" where Automatic finds no steady start, and it reads `thinCenter`.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | A start set too close is named as the reason a board runs out, from the fit check to the sentence (tracer) | af0fcf5 |
| 2 | Automatic ignores the tweaks, the skin and the Tip Style, and the taper keeps every promise about the surfaces | a668c93 |
| 3 | Automatic moves smoothly as the board slides, the list stays fast, and the deck-tweak shortcut stays honest | c56083a |

## Measured figures (computed by the tests, never typed)

- **No flicker (D-23):** 91 (blank, centre) pairs from the stress set have an Automatic start past 12" at one or more of their three placements. Each was slid end to end in 1/16" steps (2,912 steps). A start moved on 424 of those steps, it never turned back, and the largest single move was exactly 1/2" (0.5000000000000018" in float). The test ran every qualifying pair, not every second one.
- **Size guard:** `listBlanks` over the 158 pickable blanks for the default 72" board at 2 1/2" on Automatic took **39.6 ms** in Node, against a 1 s budget. Phase 12's 250 ms nothing-fits guard in `blank-fit.test.ts` stays green and unedited. WebKit was not measured, so how it feels on a real phone is held out to the rehearsal walk (plan 14-18).
- **Shortcut property:** across all 1,635 stress boards under Tip Style Bottom on Automatic, the largest tip thinning at either 12" station is 0. It is never positive.
- **Invariance (D-04):** 251 stress boards have a start moved in past 12". Each was checked across 2 Tip Styles × 2 Deck Skins × 2 fine-tune surfaces × 5 tweak pairs (0, ±1/8" together, and ±1/8" opposed). Automatic's start was identical (`Object.is`) in every case.
- **Timing:** the three new describes take about 4 s, 3.5 s and 0.3 s in Node, each under the plan's 10 s.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The literal "strictly inside the hand-set stretch" test never fired, and would have taken a fine-tune's blame**
- **Found during:** Task 1
- **Issue:** The plan's test was `station < tips.tail.fromTip` with the tip not automatic, plus `automaticThicknessAt(station) >= floor`. A probe of the 86 runs-out verdicts on the plan's own boards (72", 1" centre, starts at 6") found every one sitting exactly AT the 6" start, because the planer cut is thinnest there. A strict `<` therefore left all 86 reading `thinCenter`, which contradicted the plan's must-have that test (a) flip to `thinningStart`. Making the boundary inclusive on its own causes a different error: a start set by hand at 12" plus a negative 12" fine-tune would read `thinningStart` instead of `fineTune`.
- **Fix:** `thinningStart` now fires where a start set by hand, nearer the tip than Automatic's start, decides the thickness. That covers stations nearer that tip than Automatic's start, so the hand-set taper and the start itself are included. Four more conditions apply: (a) that tip's setting is not under the floor, (b) the board is under the floor there before any fine-tune with its own start (`derivedThicknessAt`), (c) the board would have had enough foam there on Automatic (`automaticThicknessAt(station) >= floor`, as the plan says), and (d) the hand-set start is nearer the tip than Automatic's. Condition (d) is what lets the sentence honestly say "too close". A new test pins the fine-tune case: both starts set by hand at 12" with a nose tweak that takes the 12" station under the floor still reads `fineTune`.
- **Files modified:** lib/geometry/blank-fit.ts (`runsOutCause` and its doc)
- **Commit:** af0fcf5

**2. [Rule 1 - Test] Test (b′) in blank-fit.test.ts also changed**
- **Issue:** Test (b′) is "a fine-tune is not blamed where the board would be under the floor without it". It uses the same 6" hand-set boards, so its `thinCenter` expectation became `thinningStart` too.
- **Fix:** It now asserts what its title means: the cause is never `fineTune` and equals the untweaked board's own cause. Test (a) is retitled to name `thinningStart`, and a comment explains it was the `thinCenter` case before D-05. A separate test in tip-flow.test.ts keeps `thinCenter` reachable on Automatic and with a hand-set start: it uses a centre 1/16" over the floor, where Automatic finds no steady start.
- **Commit:** af0fcf5

**3. [Plan wording] "the nose, left on Automatic, never runs out"**
- The Partial test first asserted that the end left on Automatic never runs out. The Marko 8'0" Gun broke that honestly (see above). The test now asserts that a runs-out at the Automatic end never blames the hand-set start, and that most runs-outs sit at the hand-set end.

**4. [Speed] Task 2's Tip Style test** first made about 440k separate assertions (9.8 s). It now collects mismatches and asserts once per board set, as the rulings ask (0.1 s).

No file outside `files_modified` was touched. `phase11-foil.test.ts`, `design-snapshot.test.ts`, `package.json` and `package-lock.json` are byte-identical. `tweakExceedsDeckSkin`'s code body is unchanged: the only changes inside it are comment lines.

## TDD Gate Compliance

Tasks 2 and 3 are `tdd="true"`, but they prove properties that plans 14-08 and 14-10 already built. No implementation was owed, so there was no RED step: each property test passed on first run against the existing geometry. Task 1's behaviour change was driven the other way round. The existing test (a) was confirmed to still pass under the literal rule, which revealed the bug described in Deviation 1. After the fix, tests (a) and (b′) failed against the old expectations, and those expectations were then updated. Every task was committed once, as the orchestrator asked (one commit per task), not as separate test/feat pairs.

## Verification

- `npx vitest run lib/geometry/tip-flow.test.ts lib/geometry/blank-fit.test.ts lib/geometry/blank-reasons.test.ts`: 244 passed. One unrelated catalogue-wide test in blank-fit.test.ts, "the board's deck sits exactly the deck skin below…", hit Vitest's 5 s default once (5.3 s) while all three files ran together. It passes with `--testTimeout=120000`, per ruling 4.
- `npx tsc --noEmit` exits 0 (the switch over every cause is complete) and `npm run lint` exits 0.
- Acceptance greps: `"thinningStart"` appears 1 time in blank.ts and 2 times in blank-fit.ts. `thinning starts too close to the tip` appears 1 time in blank-reasons.ts. Each of the three describe titles appears once.

## Known Stubs

None.

## Threat Flags

None. This plan only changes how a runs-out is classified and adds tests. There is no new endpoint, input or storage.

## Self-Check: PASSED

- FOUND: lib/geometry/blank.ts, lib/geometry/blank-fit.ts, lib/geometry/blank-reasons.ts, lib/geometry/blank-reasons.test.ts, lib/geometry/tip-flow.test.ts, lib/geometry/blank-fit.test.ts
- FOUND commits: af0fcf5, a668c93, c56083a
