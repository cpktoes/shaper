---
phase: 17-bottom-contours
plan: 19
subsystem: litres-pin
status: complete
tags: [bottom, channels, litres, pin, gap-closure, G-17-6]
requires:
  - 17-01 (the pin-first habit, D-20)
  - the founder's ruling on G-17-6 (17-UAT.md test 6, 2026-11-10)
provides:
  - the litres of 49 channelled boards, written by the app as it stands before 17-20
  - a test that holds today's litres to that record to the last digit
  - the "before" pictures of the finished rail's ring under the channels
affects:
  - 17-20 (turns the equality into the before-and-after relations and retakes the pictures)
tech-stack:
  added: []
  patterns: [pin-first, generated-fixture-with-provenance, script-refuses-to-rerun-after-the-seam]
key-files:
  created:
    - lib/geometry/__fixtures__/phase17-channel-boards.ts
    - scripts/extract-phase17-channel-litres-pin.ts
    - lib/geometry/__fixtures__/phase17-channel-litres-pin.json
    - lib/geometry/phase17-channel-litres.test.ts
    - .planning/phases/17-bottom-contours/pictures/17-19-before.png
    - .planning/phases/17-bottom-contours/pictures/17-19-pictures-source.tar.gz
  modified: []
requirements: [R11, R15]
actuals:
  tokens: 2900
  tasks: 2
  commits: 3
completed: 2026-11-10
---

# Phase 17 Plan 19: the channelled boards' litres, written down before the fix

Before 17-20 changes how channels meet the finished rail, the app itself has written down what 49 boards with channels read in litres today, a test holds today's litres to that record to the last digit, and there is a picture of the channels under the finished rail as the site draws them now. Nothing on the site changes in this plan.

## What was done

**Task 1 (tracer) — commit `0de444e3`.** The 49 boards are the four presets (Shortboard, Fish, Mid-length, Longboard), each with the tail's Hard Edge on and off, each with a flat tail and a Rolled Vee tail, each with 4, 6 and 8 channels on their starting numbers (48), plus the diagnosis's own RAILS board: the Fish, Hard Edge, Rolled Vee, eight channels at Off Stringer 3". A one-time script has the app write each board's litres (`summarizeDesign(...).volumeLitres.toPrecision(17)`) into `phase17-channel-litres-pin.json`, with a provenance line. The script refuses to run once `lib/geometry/volume.ts` mentions `sectionsOffAt` (17-20's new input), so the record can only ever hold the litres from before the fix. The test checks the set has 49 uniquely named boards that all carry channels, that the record names exactly those boards, and that every board's litres today equals its record to the last digit; it also prints the table below.

**Task 2 — commit `a3ccd375`.** Pictures of BOTTOM's section with "Show the finished rail from RAILS" ticked, Height x4, the section 6" from the tail, on the Longboard (rolled rail, six channels) and on the Shortboard with its tail's Hard Edge unticked on RAILS (six channels); and the 3D screen's own Bottom view of each board's underside. They are composed into one captioned sheet. The script is archived so 17-20 can retake the same pictures as the "after".

## Founder's look: Pending

Open `/Users/kontoes/Code/shaper/.claude/worktrees/agent-a80d6bfe6ecadba60/.planning/phases/17-bottom-contours/pictures/17-19-before.png` (after merge: `.planning/phases/17-bottom-contours/pictures/17-19-before.png`). It is one sheet with two rows:

- **Top row, the Longboard with six channels, 6" from the tail.** Left: BOTTOM's cross-section — the sawtooth channels along the bottom and, in thin grey, the finished rail's ring curving in at both edges; this is the ring the litres count, drawn as the site draws it today, before the fix. Middle: the board from above with the cutting line near the tail. Right: the 3D screen's Bottom view, the board's underside with the channels at the tail.
- **Bottom row, the Shortboard with a soft tail (Hard Edge unticked), six channels, 6" from the tail.** Same three pictures. Here the grey finished-rail line at each edge is a narrow sliver beside the outermost channel walls.

What he should see is today's behaviour: the finished rail's outline and the channels are drawn independently of each other, which is what G-17-6 is about. 17-20 retakes these exact pictures for the side-by-side.

3D underside: the 3D screen's own "Bottom" view button could be driven from a script, so the underside pictures are included (no 3D file was touched).

## Litres pinned, in plain English

What each board reads in litres today. Each cell is the board's volume with that many channels.

| Board | Tail | 4 channels | 6 channels | 8 channels |
|---|---|---|---|---|
| Shortboard, Hard Edge tail | flat | 29.2330 | 29.2287 | 29.2542 |
| Shortboard, Hard Edge tail | Rolled Vee | 28.8658 | 28.8609 | 28.8868 |
| Shortboard, soft tail | flat | 29.1971 | 29.1932 | 29.2182 |
| Shortboard, soft tail | Rolled Vee | 28.8423 | 28.8376 | 28.8633 |
| Fish, Hard Edge tail | flat | 34.3490 | 34.3451 | 34.3749 |
| Fish, Hard Edge tail | Rolled Vee | 33.9978 | 33.9938 | 34.0237 |
| Fish, soft tail | flat | 34.3166 | 34.3127 | 34.3426 |
| Fish, soft tail | Rolled Vee | 33.9736 | 33.9697 | 33.9996 |
| Mid-length, Hard Edge tail | flat | 49.0109 | 49.0124 | 49.0337 |
| Mid-length, Hard Edge tail | Rolled Vee | 48.5730 | 48.5747 | 48.5958 |
| Mid-length, soft tail | flat | 48.9744 | 48.9760 | 48.9969 |
| Mid-length, soft tail | Rolled Vee | 48.5496 | 48.5512 | 48.5722 |
| Longboard, Hard Edge tail | flat | 74.3257 | 74.3262 | 74.3504 |
| Longboard, Hard Edge tail | Rolled Vee | 73.8173 | 73.8177 | 73.8401 |
| Longboard, soft tail | flat | 73.3600 | 73.3633 | 73.3800 |
| Longboard, soft tail | Rolled Vee | 72.9750 | 72.9784 | 72.9933 |

The 49th board, the diagnosis's RAILS board (Fish, Hard Edge, Rolled Vee, eight channels at Off Stringer 3"): **34.1215 L**.

These are the "before" column; 17-20's summary completes the "after". The labels in the pin are `<preset>|<hard or soft>|<flat or rolled-vee>|<count>`, for example `longboard|soft|rolled-vee|6`. Every digit is stored to 17 places in `phase17-channel-litres-pin.json`.

## Deviations from Plan

None to the work. Two small notes:

- The commit messages end with `Co-Authored-By: Claude Sonnet 5.5`, the attribution the session instructed, not the Opus line the plan text carried.
- Picking six channels on BOTTOM moves the section to the channels' deepest station (11" on the Shortboard), so the picture script moves the section to 6" after picking channels, not before. Worth knowing when 17-20 retakes the pictures.

## Verification

- `npx vitest run lib/geometry/phase17-channel-litres.test.ts lib/geometry/phase17-litres-pin.test.ts` — 261 passed.
- `npx tsc --noEmit` — clean. `npm run lint` — 0 errors, the one known warning (`lib/db/import-designs-action.test.ts:42`).
- `npm test` — under this machine's load (load average about 100, three executors plus other sessions) the full run finished with 25 failures in 12 files of 210. The one I re-ran alone, `lib/models/surface-report.test.ts` ("every one of the 102 moves"), timed out at 5 s with 6.9 s measured and is a known load timeout; this plan adds only new files and edits none, so none of the failures can come from it. The other eleven files' names were not captured (the output was tailed); they should be re-run alone at the next quiet moment before the phase's gate.

## Known Stubs

None.

## Threat Flags

None. T-17-25 is mitigated as planned: the pin is written only by the script, the script refuses to run once `volume.ts` names `sectionsOffAt`, the file carries a provenance line, and the test holds today's litres to it exactly.

## Self-Check: PASSED

- Files present: the four geometry/script files and both picture files (listed under key-files).
- Commits present: `0de444e3` (Task 1), `a3ccd375` (Task 2).
