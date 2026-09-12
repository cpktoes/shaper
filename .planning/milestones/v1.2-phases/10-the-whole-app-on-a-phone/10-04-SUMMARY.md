---
phase: 10-the-whole-app-on-a-phone
plan: 04
subsystem: testing
tags: [playwright, uat, real-device, responsive, ios]

requires:
  - phase: 10-01
    provides: touch-sized dialog close-X and typed fields
  - phase: 10-02
    provides: touch-sized account controls and banner dismiss
  - phase: 10-03
    provides: the shortened board card and the home-route tab-bar rule
provides:
  - "e2e/phone-trip.spec.ts — the signed-out whole trip walked by machine on both phone projects, plus a desktop regression pass"
  - "10-SWEEP.md — the real-device sweep sheet, now carrying the shaper's own results"
  - "The finding that the app's phone/desktop layout switch is keyed to a width a real sideways iPhone does not have"
affects: [phone-layout, responsive-shell, setup-screen, toolbar-tip]

actuals:
  tokens: 12000
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A real-device sweep sheet that records the green automated run it was handed with, so a failure found by hand is provably a new finding"

key-files:
  created:
    - e2e/phone-trip.spec.ts
    - .planning/phases/10-the-whole-app-on-a-phone/10-SWEEP.md
  modified: []

key-decisions:
  - "The automated trip covers the signed-out half only. Clerk never settles under the suite's fake publishable key (measured on all three projects 2026-09-11: useUser().isLoaded stays false indefinitely), so no sign-in-gated screen is reachable in a browser test. No self-skipping test was left standing in for the signed-in half."
  - "A phone held sideways should stay a phone (shaper's decision, 2026-09-11). Implemented as width < 820px OR (coarse pointer AND height < 500px) rather than 'any touch device', so a narrow desktop window, an iPad sideways and a touch laptop all keep today's behaviour."
  - "A board card should be about three-quarters of the visible height — one whole board plus the top of the next (shaper's decision, 2026-09-11). The cap becomes height-relative rather than a fixed 387px, correct in both orientations by construction."

patterns-established:
  - "Width is not a proxy for 'this is a phone': a real iPhone is ~844px wide held sideways. Device questions belong to the pointer and the viewport height, never to width alone."

requirements-completed: []

coverage:
  - id: D1
    description: "The signed-out whole trip — home, a preset, all six screens by tapping the bar, the summary, and back home — walked once by machine on both phone profiles before a phone is handed over"
    requirement: PHON-10
    verification:
      - kind: e2e
        ref: "e2e/phone-trip.spec.ts#the whole trip, walked once by machine before the founder is handed a phone"
        status: pass
    human_judgment: false
  - id: D2
    description: "The real-device sweep sheet, walked by the shaper on a real iPhone and a real Android phone"
    requirement: PHON-10
    verification:
      - kind: manual_procedural
        ref: ".planning/phases/10-the-whole-app-on-a-phone/10-SWEEP.md#results--sweep-run-2026-09-11"
        status: fail
    human_judgment: true
    rationale: "Signing in, a real thumb, a real iOS keyboard and a real phone turned sideways cannot be reproduced by any emulator. The sweep found three failures and one new request."

duration: 22min
completed: 2026-09-11
status: complete
---

# Phase 10 Plan 04: The Real-Device Sweep — Summary

**The app was put in a shaper's hands on two real phones, and the phones found what no emulator could: the app decides "this is a phone" by screen width, and a real iPhone held sideways is too wide to qualify.**

## Performance

- **Duration:** ~22 min of agent work, plus the shaper's own sweep
- **Tasks:** 2 of 3 executed by agent; task 3 is the sweep itself, executed by the shaper
- **Files created:** 2

## Accomplishments

- **The machine pass** (`e2e/phone-trip.spec.ts`) walks the signed-out trip end to end on both phone profiles plus a desktop regression pass, so a broken route costs a test run rather than the shaper's time. It is honest about its six blind spots (sign-in, the rack's dialogs, the iOS long-press callout, sticky hover, Safari's collapsing toolbar, a real safe-area inset) and hands every one of them to the sweep.
- **The sweep sheet** was handed over against a fully green run (types clean, 2456 unit tests, 207 browser tests, build green at `40c17ba`), so every failure the shaper found is provably new rather than something the tests would have caught.
- **The sweep found a real architectural defect** that three separate symptoms trace back to — see below.

## Task Commits

1. **Task 1: the machine pass over the whole trip** — `d4ede0b` (test), merged as `40c17ba`
2. **Task 2: the sweep sheet** — `4f0b0c8` (docs)
3. **Task 3: the sweep itself** — executed by the shaper; results recorded in `10-SWEEP.md`

## What the sweep found

| Question | Verdict |
|---|---|
| Clerk avatar's real tap size | **Fail (inconclusive).** "Looks the same to me." D-05's pre-authorised `!` fallback is now required. |
| iOS keyboard over a rename / name field | **Pass.** "Works great." D-03's open caveat is closed. |
| Two cards side by side, sideways | **Two-up passes; height fails.** "Way too tall. Even vertical, the boards are bigger than the screen." |
| Where the tabs land sideways | **The assumption failed.** "iPhone switches to top nav bar when horizontal." |
| Sign-in | **Pass.** "Sign in works great." |

**The single cause behind three of those:** the app treats *screen width under 820px* as "this is a
phone". A real iPhone held sideways is about 844px wide, so it stops being a phone at exactly the
moment its screen is shortest. Measured 2026-09-11: a board card is 550px tall upright with 608px
visible (1.11 cards fit), and **757px tall sideways with 237px visible (0.31 of a card fits)** —
because the card's height cap is switched on by that same width rule and therefore switches off
sideways. The already-built "Hide Toolbar" tip is gated the same way and vanishes sideways too,
which is exactly when a shaper wants the height back.

The 750px figure the plan trusted for a sideways iPhone came from the test tool's emulated device,
not from hardware, and is recorded as fact in CLAUDE.md's Layout section. **That line is wrong.**

## Decisions Made

- **A phone held sideways stays a phone.** Rather than "any touch device is a phone" — which would
  newly turn an iPad and a touch laptop into phones, something nobody asked for and CLAUDE.md
  explicitly designed against — the switch becomes `width < 820px` OR `(coarse pointer AND height <
  500px)`. Purely additive: every current behaviour is preserved and only a genuinely short touch
  screen is newly included. 500px is already this codebase's number for "short screen".
- **A board card should be about three-quarters of the visible height**, so one whole board plus the
  top of the next is visible and it is obvious the list scrolls.

## Deviations from Plan

- **The plan assumed a sideways iPhone is 750px wide and stays in the phone layout.** It is ~844px
  and does not. This is the plan's central factual error and the reason the sweep was worth running.
- **The executor agent could not complete task 2 itself.** It paused mid-task waiting on its own
  background test run; the harness treated that as completion, so the orchestrator merged its work
  and removed its worktree, and the agent then reported the worktree as destroyed. Nothing was lost —
  its commit is on `main` and its final sweep-sheet wording was recovered from its report and used.
  `SendMessage` is unavailable in this session, so a paused agent cannot be resumed; the orchestrator
  finished task 2 directly.

## Follow-up Required

Four items for gap closure, in dependency order:

1. **Make the layout switch height-aware** — `width < 820px` OR `(coarse AND height < 500px)`.
   Centralised in `app/globals.css` as a custom variant; 107 usages across 15 files inherit it
   without edits. Correct CLAUDE.md's Layout section in the same change.
2. **Make the board card's height cap viewport-relative** (~75% of visible height), which then holds
   in both orientations by construction.
3. **Apply D-05's pre-authorised fallback** to Clerk's avatar trigger (`coarse:p-2!`), and put the
   re-measurement back on the next sweep — a tap target cannot be verified by eye.
4. **Let the "Hide Toolbar" tip show sideways** — same gate change as item 1; the tip itself needs
   no rewording.

## Self-Check: PASSED (with sweep failures recorded, not hidden)

Tasks 1 and 2 delivered and committed. Task 3 executed by the shaper and its failures recorded
verbatim. No requirement ID is marked complete: PHON-10 explicitly failed the real-device sweep, and
PHON-07 is only partly evidenced (sign-in passed; sign-up and the account menu were not reported).
