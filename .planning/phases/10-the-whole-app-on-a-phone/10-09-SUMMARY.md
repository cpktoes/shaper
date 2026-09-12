---
phase: 10-the-whole-app-on-a-phone
plan: 09
subsystem: ui
tags: [tailwind, css, playwright, responsive, setup-screen, gap-closure, floor]

requires:
  - phase: 10-06
    provides: "the three-quarters-of-the-scroller card-height cap this plan gives a floor and re-gates onto the pointer"
provides:
  - "app/globals.css's --setup-card-thumb-min-h (220px) and --setup-card-thumb-max-h (max(floor, three-quarters share)) — the board picture's height decided in exactly one place"
  - "components/setup/card-thumbnail.tsx's board-picture cap, now gated on a coarse (touch) pointer instead of the phone/desktop layout switch, so it reaches a phone whichever layout its width selects and never reaches a desktop mouse"
  - "e2e/phone-home.spec.ts's constants guard extended to the floor and the composed cap, a crossover precondition on the three-quarters test, and the 819/820px boundary rewritten as a pointer proof"
  - "e2e/phone-setup-landscape.spec.ts's shared body rewritten to assert the board's own formula and a 40x150 CSS px floor, with the next-card-visibility check made conditional on the measured régime rather than assumed"
affects: [setup-screen, card-thumbnail, preset-card, board-rack-card]

actuals:
  tokens: 8500
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A height cap composed as max(a named floor, a named share) in one CSS custom property, so a non-positive result is structurally impossible for any viewport height — the fix for a formula with no lower bound that a real device found could reach zero."
    - "Gating a sizing cap on the coarse: pointer variant instead of the max-shell:/shell: layout variant, so the cap survives a later change to which layout a given width selects (this plan runs one wave ahead of that revert, deliberately)."

key-files:
  created: []
  modified:
    - app/globals.css
    - components/setup/card-thumbnail.tsx
    - e2e/phone-home.spec.ts
    - e2e/phone-setup-landscape.spec.ts

key-decisions:
  - "The floor is 220px — a Claude ruling, not a founder decision, with a stated basis: D-08 measured (and the founder rejected) a card at which the four presets drew 26-39 dots wide, calling that a sliver; at 220px of picture the four presets measured 42-63px wide and about 202px tall in this run's own browser measurement (see Measured Figures below), clear of the rejected band. This number is explicitly NOT settled — plan 10-08's re-sweep puts it to the shaper by name, same as D-08's landscape ruling was."
  - "The cap's gate moved from max-shell: (width-and-height layout switch) to coarse: (pointer alone), per this project's own CLAUDE.md doctrine: width picks the layout, the pointer picks how big a thing draws. This is also what makes the plan correct on both sides of the sideways-layout revert (D-10) landing in the next wave — the cap no longer needs to know which layout a width selected."
  - "e2e/phone-setup-landscape.spec.ts's shared body no longer asserts a flat card-to-scroller ratio band. It now pins the actual formula (min(width*620/340, max(floor, share))) and makes the next-card-visibility check conditional on which régime a viewport measures into, computed from the page's own custom properties rather than a hard-coded viewport list."
  - "Tailwind's max-h-(--custom-property) shorthand was already in use in this codebase for max-height (components/ui/select.tsx's max-h-(--available-height)), contrary to the plan's own flagged assumption that it was unproven for max-height specifically. Verified anyway per the plan's non-vacuity requirement: computed max-height read off a rendered page confirms the rule compiles and resolves correctly on both pointer types."

requirements-completed: [PHON-08]

coverage:
  - id: D1
    description: "A board picture's height cap can never resolve to nothing, whatever the screen — proved by a formula assertion (min(width*620/340, max(floor, share))) rather than a spot check at one viewport."
    requirement: PHON-08
    verification:
      - kind: e2e
        ref: "e2e/phone-setup-landscape.spec.ts#the board never resolves to a sliver: every outline clears 40x150 CSS px, and the picture box's height equals max(floor, share) — at 750x340 on the iphone project"
        status: pass
      - kind: e2e
        ref: "e2e/phone-setup-landscape.spec.ts's shared body, run at all three sideways viewports (750x340, 844x390, 863x360) via the three describes' own tests"
        status: pass
      - kind: e2e
        ref: "e2e/phone-home.spec.ts#the top bar's real height and the card's real chrome gap still match the CSS constants the height cap is derived from, and the composed cap equals what those constants imply"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both phones this suite runs upright are unmoved: the three-quarters rule still governs, guarded by a crossover precondition that fails loudly rather than silently re-banding if it ever stops being true."
    verification:
      - kind: e2e
        ref: "e2e/phone-home.spec.ts#every preset card is about three-quarters of the scroller's visible height... (iphone, android)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A desktop mouse sees an unchanged card at 819 and 820 dots wide, and the cap cannot reach it at any width — proved as a pointer fact, not a width-boundary fact, and confirmed non-vacuous."
    verification:
      - kind: e2e
        ref: "e2e/phone-home.spec.ts#at 819px and at 820px, on a fine (mouse) pointer, the board picture box never gets the height cap at all — it follows only its own width and the 340/620 ratio (desktop project)"
        status: pass
      - kind: other
        ref: "Non-vacuity: with the coarse: prefix temporarily removed from card-thumbnail.tsx, the 819px case fails (measured 137.7px gap between actual and ratio height); restored, both widths pass"
        status: pass
    human_judgment: false
  - id: D4
    description: "The card's height is decided in exactly one place (app/globals.css), and a change to either measured constant is forced through it — the structural half of 10-REVIEW-2.md WR2-02, finished."
    verification:
      - kind: other
        ref: "grep -n 'setup-card-thumb' app/globals.css shows both declarations in the same :root block as --phone-top-bar-h and --setup-card-chrome-h; grep -c 'coarse:max-h-(--setup-card-thumb-max-h)' components/setup/card-thumbnail.tsx reports 1"
        status: pass
    human_judgment: false
  - id: D5
    description: "Non-vacuity for the new floor test: reverting app/globals.css alone (git checkout --) makes the new test fail, and re-applying the patch makes it pass again."
    verification:
      - kind: other
        ref: "Reverted app/globals.css, re-ran e2e/phone-setup-landscape.spec.ts's new test — failed with NaN (the two new custom properties no longer existed); re-applied the patch — passed"
        status: pass
    human_judgment: false
duration: ~50min (including a 9.8-minute full-suite run)
completed: 2026-09-11
status: complete
---

# Phase 10 Plan 09: The Board Picture Gets a Floor It Can Never Fall Below — Summary

**A board card's picture can no longer shrink to nothing on any screen: it now caps at whichever is bigger, a 220-dot floor or three-quarters of the screen, and that cap now follows a finger instead of a screen width — so it reaches a phone whichever layout its screen happens to pick, and never reaches a desktop mouse at all.**

## Performance

- **Duration:** ~50 min (including a required 9.8-minute full three-project Playwright run)
- **Tasks:** 3 of 3
- **Files modified:** 4 (0 created, 4 modified)

## Accomplishments

- **The picture can no longer resolve to nothing.** A real phone held sideways on 2026-09-11
  found the board picture shrinking toward zero — the old formula subtracted a fixed amount of
  card text from a budget that shrinks with the screen, with nothing stopping it going negative.
  `app/globals.css` now declares `--setup-card-thumb-min-h: 220px` (the floor) and
  `--setup-card-thumb-max-h: max(floor, three-quarters share)` (the whole cap), so a non-positive
  result is structurally impossible for any viewport height.
- **The cap moved from the layout axis to the pointer axis.** `card-thumbnail.tsx`'s class changed
  from `max-shell:max-h-[...]` (the width-and-height layout switch) to
  `coarse:max-h-(--setup-card-thumb-max-h)` (the touch-pointer variant) — CLAUDE.md's own rule
  applied honestly: width picks the layout, the pointer picks how big a thing draws. This also
  means the plan is correct on both sides of the sideways-layout revert (D-10) landing in the next
  wave, since the cap no longer needs to know which layout a width selects.
- **The standing guard now covers all four constants, not two.** `e2e/phone-home.spec.ts`'s
  constants test reads `--setup-card-thumb-min-h` and the composed `--setup-card-thumb-max-h` off
  the page too, and checks the composed cap against what the three primitives (floor, top-bar
  height, card chrome) and the viewport's own height actually imply — closing the gap
  10-REVIEW-2.md WR2-02 named, where nothing previously proved the declared numbers and the
  rendered result agreed with each other.
- **The three-quarters test got a tripwire, not a wider band.** A crossover precondition now runs
  before it, computed from the same primitives the cap reads, and fails with an explicit message
  if this viewport ever drops to or below the crossover — so a future change can never silently
  turn this test into a measurement of the floor while still reading as "three-quarters" passing.
- **The 819/820px boundary test became the strongest desktop-no-change proof in the file.**
  Previously a width-boundary proof (the cap applied below 820px, stopped exactly at it); now,
  because the cap reads the pointer, a mouse gets no cap at EITHER width, and the test proves it —
  computed `max-height` resolves to `none` at both 819 and 820 on the `desktop` project, confirmed
  non-vacuous by temporarily removing the `coarse:` gate and watching 819 fail.
- **The sideways sheet stopped asking about the layout.** `e2e/phone-setup-landscape.spec.ts`'s
  header and shared body no longer reference which layout a width selects (the word "shell"
  appears exactly once in the file now, in the header sentence that explicitly disclaims the
  question). The shared body pins the actual formula and a 40x150 CSS px floor at all three
  viewports, and makes the next-card-visibility check conditional on which régime a viewport
  measures into — computed from the page's own custom properties, never a hard-coded viewport
  list — so a future viewport added here gets the right branch automatically.

## Measured Figures (read off a rendered page, not calculated)

All figures below came from real Playwright runs against this checkout on 2026-09-11, per the
plan's own "measure, do not calculate" instruction.

| What | Measured value |
|---|---|
| Preset outline widths at 750x340 (iphone project) | 51.7, 63.2, 51.0, 42.6 CSS px — all clear the 40px floor |
| Preset outline heights at 750x340 | ~201.9-202.0 CSS px — all clear the 150px floor |
| Computed `max-height` on the board picture box, iphone project (390x664, upright) | `293.40625px` — a positive value, confirming the class compiles |
| Computed `max-height` on the board picture box, desktop project (1280x800) | `none` — confirming the cap never reaches a mouse |
| Régime crossover (touch, 400px wide, varying height) | between 566px (floor still governs, `max-height: 220px`) and 567px (share overtakes it, `max-height: 220.65625px`) — matches the plan's own algebraic estimate of ~566.125px within 1px |
| Régime at 750x340, 844x390 and 863x360 (all three sideways viewports this suite runs) | **floor governs at all three** — computed share is 50.4px, 87.9px and 65.4px respectively, all below the 220px floor |
| Non-vacuity: `app/globals.css` reverted, new floor test re-run | Failed — `NaN` (the two new custom properties no longer existed) |
| Non-vacuity: `coarse:` gate temporarily removed from `card-thumbnail.tsx`, 819/820 test re-run | Failed at 819px — measured gap of `137.74px` between actual and ratio-implied height |

## Task Commits

1. **Task 1: The board can never vanish — give its picture a floor, and one place the sum lives**
   - `babd803` (test) — RED: the new floor/formula test in `e2e/phone-setup-landscape.spec.ts`'s
     750x340 describe, failing against today's un-floored cap (measured 11.47px wide, below the
     40px minimum)
   - `351e6a9` (feat) — GREEN: `--setup-card-thumb-min-h` and `--setup-card-thumb-max-h` in
     `app/globals.css`, the class and doc-comment rewrite in `card-thumbnail.tsx`
2. **Task 2: Three-quarters still means three-quarters, and a mouse still gets no cap at all**
   - `cd07b17` (test) — the constants guard extended, the crossover precondition added, and the
     819/820px test rewritten as a pointer proof, all in `e2e/phone-home.spec.ts`
3. **Task 3: The sideways sheet asks about the board, not about the layout**
   - `0988667` (test) — the header and shared body of `e2e/phone-setup-landscape.spec.ts` rewritten
     to drop every reference to which layout a width selects, replaced with the formula assertion
     and a régime-computed next-card check

## Files Modified

- `app/globals.css` — the floor and the composed cap, declared beside the two constants they read
- `components/setup/card-thumbnail.tsx` — the class moved to the `coarse:` pointer gate; doc
  comment rewritten to describe the box that now exists
- `e2e/phone-home.spec.ts` — constants guard extended, crossover precondition added, 819/820px
  test rewritten as a pointer proof
- `e2e/phone-setup-landscape.spec.ts` — header and shared body rewritten to be layout-agnostic; one
  new dedicated test in the 750x340 describe pinning the floor/formula directly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The doc comment's own literal quoting of the new Tailwind class inflated a grep count from 1 to 2**
- **Found during:** Task 1's own acceptance-criteria check (`grep -c` must equal 1)
- **Issue:** The rewritten doc comment in `card-thumbnail.tsx` quoted the exact string
  `coarse:max-h-(--setup-card-thumb-max-h)` inside backticks to explain the class, which made
  `grep -c` count two matches (the comment and the real class) instead of the one the acceptance
  criteria requires.
- **Fix:** Reworded the comment to describe the class without repeating its exact literal text.
- **Files modified:** `components/setup/card-thumbnail.tsx` (comment only, no behavior change)
- **Commit:** folded into `351e6a9` (the GREEN commit was made after this fix, not before)

**2. [Rule 1 - Bug] The word "shell" appeared twice in phone-setup-landscape.spec.ts, not once**
- **Found during:** Task 3's own acceptance-criteria check (`grep -n 'shell'` must show only the
  header's disclaimer)
- **Issue:** A second, non-header comment in the shared body's two-up-grid check also used the
  word "shell" ("not from the phone/desktop shell switch"), which would have made the acceptance
  check's "only the header" claim false.
- **Fix:** Reworded that comment to say "not from which layout the width selects" instead, keeping
  the same meaning without the word.
- **Files modified:** `e2e/phone-setup-landscape.spec.ts` (comment only)
- **Commit:** folded into `0988667`

No other deviations. The plan's own flagged assumption that `max-h-(--…)` was "unproven" for
max-height specifically turned out to be slightly off — `components/ui/select.tsx` already uses
`max-h-(--available-height)` — but the plan's own acceptance criteria (measure the computed value
on a real page) still applied and still passed, so no plan change was needed.

## Human Verification Deferred (per the plan's own instruction)

- **Whether 220px is the right floor at all.** This is explicitly a Claude ruling with a stated
  basis (see key-decisions above), not a founder decision. Plan 10-08's re-sweep puts the number
  itself to the shaper by name, the same way D-08's landscape ruling was — this plan does not
  settle it, it only makes sure the number in place today can never resolve to zero.
- **Whether a fish still reads as a fish sideways, in the hand, at 220px of picture.** No automated
  test can answer this; the 2026-09-11 sweep already named it unanswerable by a machine. Every
  measured viewport in this run keeps the four presets' outline widths distinct at whole-pixel
  resolution (42.6-63.2px at 750x340), but "distinct on a screen" and "tellable apart in a
  shaper's hand" are not the same test.

## Verification Run (this plan's own required checks)

- `npx tsc --noEmit` — exits 0.
- `npx vitest run` — 59 test files, 2461 passed, 2 skipped, 0 failed.
- `PW_PORT=3125 IS_WEBPACK_TEST=1 npx playwright test` (full suite, all three projects) —
  **217 passed, 200 skipped (per-project scoping), 0 failed, 9.8 minutes.**
- Desktop screenshot baselines under `e2e/*-snapshots/` — untouched (`git status --short` on that
  directory reports nothing); the suite run above includes them and they pass without
  re-recording.
- `git diff --stat` confirms only the four files this plan's frontmatter names were touched:
  `app/globals.css`, `components/setup/card-thumbnail.tsx`, `e2e/phone-home.spec.ts`,
  `e2e/phone-setup-landscape.spec.ts`.

## Next Phase Readiness

- No blockers. Every task's acceptance criteria is met and measured, not calculated; the full
  suite is green across all three Playwright projects and the full Vitest suite.
- This plan was written to run before plan 10-10's sideways-layout revert (D-10) lands, precisely
  because the cap no longer depends on which layout a width selects. Nothing here needs to change
  when that revert lands.
- The floor's own value (220px) is still an open question for plan 10-08's re-sweep, as this
  plan's own text says it should be.

## Self-Check: PASSED

All 4 files listed in "Files Modified" confirmed present on disk. All 4 commit hashes (`babd803`,
`351e6a9`, `cd07b17`, `0988667`) confirmed present in `git log --oneline --all`. No missing items.

---
*Phase: 10-the-whole-app-on-a-phone*
*Completed: 2026-09-11*
