---
phase: 15-the-board-rack
plan: 10
subsystem: the founder's device check of the phone and iPad rack (D-11)
tags: [board-rack, device-check, hold-and-drag, D-11, safari, ipad, android]
status: complete
requires:
  - 15-07 (the swipe rack)
  - 15-09 (hold-and-drag, the status pill)
  - 15-11 (⋯ Move rows gated by the D-11 switch)
  - the code review's fixes (c58a5b0 — Back keeps a moved order on the practice rack)
provides:
  - D-11 ruled on real devices — "keep": hold-and-drag stays; `PHONE_MOVE_VIA_MENU` remains `false`
  - the UI-SPEC's three real-device backstops answered (E04 long names sideways, E09 the pill off Open This Board, the carried board's z-order) and the review's WR-05 (the Safari touch path) closed by a person
affects:
  - 15-12 (reads the ruling: the phone's ⋯ stays Rename, Duplicate, Delete — D-12 holds)
  - 15-13 (go-live with hold-and-drag on, as designed)
tech-stack:
  added: []
  patterns:
    - a device check runs the practice rack from the main checkout on a Wi-Fi-reachable dev server with the test-only flag set (`.claude/launch.json` → `practice-rack-wifi`, port 3005), so no real board is ever touched
key-files:
  created: []
  modified: []
decisions:
  - "D-11 ruled keep (2026-10-06): hold-and-drag ships on phones and iPads; the prepared ⋯ → Move fallback is not taken and its switch stays off"
  - "The two things found while building — the phone caption's height (Open This Board's tap box ~3 dots into the Shape a New Board line) and a carried board drawn under its neighbours for ~110 ms — are fine as they are, by the founder's eye on both devices"
metrics:
  duration: ~25 min (the founder's walk; the server up for the walk only)
  completed: 2026-10-06
  tasks: 2
  files: 0
---

# Plan 15-10 — The founder's device check, and the D-11 ruling

## What happened

The practice rack (15 and 30 stand-in boards, `/test-rack`) ran from the main checkout at the tree
`0e40365` (plans 15-01 to 15-11 plus the code review's fixes), on a dev server reachable over the house
Wi-Fi with the test-only flag set — the `practice-rack-wifi` entry added to `.claude/launch.json`
(`SHAPER_RACK_STAND_IN=1 npm run dev -- -H 0.0.0.0 -p 3005`). No database was involved: the practice
rack keeps a moved order in the dev server's memory. The founder opened
`http://192.168.1.28:3005/test-rack` and `…/test-rack?boards=30` on their **iPad 9th gen (Safari)** and an
**Android phone**, each held upright and then sideways, and went through the twelve checks in the parked
note plus the move → open → Back check. The server was stopped as soon as they answered.

## The ruling

**"keep."** The founder's words, in full: *"looks and feels great on all."*

No file changes: `components/setup/rack-config.ts` is untouched (`git diff --quiet HEAD -- components/setup/rack-config.ts`
exits 0), `PHONE_MOVE_VIA_MENU` stays `false`, and nothing was pushed. Hold-and-drag goes live on phones
and iPads as designed in sketch 011 A; the prepared ⋯ → Move left / Move right fallback stays as a switch
that is never flipped, and D-12 holds (the phone's ⋯ is Rename, Duplicate and Delete).

## What the check answered, device by device

The founder's verdict covered every check on both devices in both orientations; they reported nothing
that looked or felt wrong. By check:

| # | Check | Answers | Verdict |
|---|-------|---------|---------|
| 1 | Swipe: boards turn as they pass the middle; the rack settles on one board with its caption | R6, D-07 | fine |
| 2 | Hold ~½ s → swell → lift → slide → let go; no page scroll under the finger; the "Moved …" pill | R8, D-11, T-15-28 | fine |
| 3 | A quick swipe that starts on a board only moves the rack | 15-09 Task 3 | fine |
| 4 | Carrying to the screen's edge scrolls the rack along | 15-09 edge scroll | fine |
| 5 | The unsaved board refuses to lift and says it stays first | R9 | fine |
| 6 | A long name, sideways, still reads and is cut sensibly | UI-SPEC E04 backstop (15-07) | fine |
| 7 | After a move the pill does not cover Open This Board | UI-SPEC E09 backstop (15-09) | fine |
| 8 | The phone caption's height — its tap box ~3 dots into the Shape a New Board line | found in 15-07 | fine as is |
| 9 | A carried board drawn under its neighbours for ~110 ms | found in 15-09 | fine as is |
| 10 | Safari: hold → lift → slide → drop, no page scroll under a carried board | review WR-05 | fine |
| 11 | Safari: an abandoned hold lifts nothing and opens nothing | review WR-05 | fine |
| 12 | Safari: no iOS callout or selection loupe on a long press | review WR-05 | fine |
| + | Move a board, Open This Board, Back — the moved order is still there | review CR-01 fix | fine |

So the one real risk the research named (RESEARCH Pitfall 1, older iPad Safari's touch handling) did not
bite: the iPad 9th gen handled the hold, the carry and the drop. The review's WR-05 — the touch path proven
only on Chromium by Playwright — is closed by this walk rather than by a test, as the fix report ruled.

## Verification

- Task 1's precondition held: 15-01 to 15-09 (and 15-11 plus the review fixes) merged into `board-rack`,
  `npm test` green on the tree (4,296 passed), and the phone spec passed on the merged tree in the full
  suite (829 passed / 0 failed, 04:07 2026-10-06).
- Task 2's verify command (`npx vitest run components/setup/rack-config.test.ts components/setup/rack-source.test.ts`
  and `e2e/board-rack-phone.spec.ts`) re-run after the ruling: see the orchestrator's tracking commit for
  the result (nothing changed in the code, so it is the same tree the full suite passed on).
- Acceptance on "keep": the rack-config file is unchanged; this summary names the ruling and the devices;
  `git status -sb` shows `main` unchanged against its upstream — nothing pushed.

## Deviations

- The device check happened at the end of the overnight build (early morning Tuesday 2026-10-06 Pacific)
  rather than Tuesday daytime — the founder was ready sooner. Nothing else differs from the plan.
- `.claude/launch.json` gained the `practice-rack-wifi` entry (a reusable way to run the practice rack
  over Wi-Fi for later device checks) — an orchestrator chore committed on its own, not a plan file.

## Self-Check: PASSED

- `components/setup/rack-config.ts` unchanged; `PHONE_MOVE_VIA_MENU = false`.
- The ruling, the founder's words and both devices are recorded here and as a dated note under D-11 in
  `15-CONTEXT.md`.
- The dev server is stopped; nothing was pushed.
