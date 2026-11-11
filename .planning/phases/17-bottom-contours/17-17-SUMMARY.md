---
phase: 17-bottom-contours
plan: 17
subsystem: volume-readout-words
tags: [volume, imported-readout, guide-words, gap-closure, G-17-5, words-only]
requires:
  - phase: 17-bottom-contours
    provides: "BOTTOM's foam off and the finished rail inside the 51-section litres (D-20, D-34)"
  - phase: 18-a-guide-on-every-page
    provides: "VOLUME's GUIDE words page and the test that holds the module to it (D-09)"
provides:
  - "VOLUME's INPUTS card foot: the founder's sentence saying what the litres count"
  - "VOLUME's GUIDE Import Designed Board card naming BOTTOM and the finished RAILS rails"
  - "VOLUME's desktop baseline re-taken for the longer foot"
affects: [volume, guide, desktop-baseline]
tech-stack:
  added: []
  patterns: ["words page edited first, module in the same commit, words test holds them equal"]
key-files:
  created:
    - .planning/phases/17-bottom-contours/pictures/17-17-volume-words.png
    - .planning/phases/17-bottom-contours/pictures/17-17-pictures-source.tar.gz
  modified:
    - lib/geometry/imported-readout.ts
    - lib/geometry/imported-readout.test.ts
    - e2e/volume-fins-panels.spec.ts
    - e2e/imported-readout.spec.ts
    - .planning/phases/18-a-guide-on-every-page/18-GUIDE-WORDS.md
    - components/guide/words/volume.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
key-decisions:
  - "The founder's sentence goes in as VOLUME's foot character for character; the caption `From TEMPLATE and ROCKER & FOIL` stays so every test that finds the card by caption still finds it."
  - "The ESTIMATE tab's own lines and the Estimated Volume GUIDE card are left alone (not ruled) and named as a follow-up below."
status: complete
metrics:
  completed: 2026-11-10
actuals:
  tokens: 3500
  tasks: 2
  commits: 2
---

# Phase 17 Plan 17: VOLUME says what the litres count — Summary

**On VOLUME, the small card under INPUTS now ends with the founder's own sentence, "Counts the finished rail shape from RAILS and the bottom contours from BOTTOM.", and the GUIDE's Import Designed Board card names BOTTOM and the finished rails too — no litres figure moved.**

## What changed for a shaper

- On the VOLUME screen, under the board's Length, Width and Thickness, the card used to say only "Rail shapes from RAILS". It now says the litres count the finished rail shape from RAILS and the bottom contours from BOTTOM. That was already true of the number (the walk-through checked it); the page just never said so.
- The sentence has no figure in it, so Imperial and Metric read the very same words, on a computer and on a phone.
- On the GUIDE tab, the Import Designed Board card now reads "…51 real cross-sections with the finished RAILS rails and the BOTTOM contours…" and tells the shaper to "Finish TEMPLATE, ROCKER, BOTTOM and RAILS first". Its middle line is unchanged.
- The litres (30.29 L on the default board), the card's caption, every other card and every other picture are exactly as they were.

## Tasks

| Task | What | Commit |
| ---- | ---- | ------ |
| 1 (tracer) | The INPUTS card's foot is the founder's sentence; a new Metric check proves the foot is identical; the unit test and two browser specs that pinned the old foot read the new one | d3fbc3a0 |
| 2 | The words page and the GUIDE words change together; VOLUME's desktop picture re-taken with a dated note; the founder's picture made and its script archived | 35a22afb |

Tracer gate: the browser specs for the readout passed on the computer and on both phones; two phone "walk four screens" tests hit their 30-second limit on a machine under heavy load and passed when re-run alone with a longer limit (see Verification).

## Deviations from Plan

None to the work. Process notes: the machine was under very heavy load while this ran (load average 90 to 140 from other sessions), so a few browser tests that walk several screens timed out at their default 30 seconds; each passed alone. No code was changed to get them through.

## Verification

- `npx vitest run lib/geometry/imported-readout.test.ts` — 29 passed (RED seen first: 2 failures before the foot changed). `npx vitest run components/guide/words` — 52 passed.
- `npx tsc --noEmit` clean; `npm run lint` — 0 errors, 1 existing warning in `lib/db/import-designs-action.test.ts` (not this plan's).
- Browser, `e2e/volume-fins-panels.spec.ts` and `e2e/imported-readout.spec.ts` on desktop, iPhone and Android: all passed, except the two iPhone "walk ROCKER, RAILS, VOLUME, FINS" tests (lines 337 and 352), which timed out at 30 s under load on the first run and passed re-run alone with `--timeout=150000` (readout heights unchanged apart from VOLUME's, which grew by the extra wrapped line on a phone).
- Browser, `e2e/guide-volume.spec.ts`, `e2e/desktop-baseline.spec.ts`, `e2e/step-nav.spec.ts` on desktop: all passed after VOLUME's picture was re-taken, except step-nav line 176 (a whole-board walk), which timed out at 30 s under load and passed alone (1.5 min).
- VOLUME's desktop picture: 13705 pixels changed, all inside x 40-358, y 335-502 (the side panel from the card's foot down). The drawing, the top row, the ESTIMATE card and the other five pictures did not move. SHA-256 first 8 characters old to new: f4d7cc62 to bec057d3. Rendered by the webpack dev server on port 3317 in this worktree; to be confirmed under Turbopack from the main checkout after the merge.
- Full unit suite (`npm test`) on this heavily loaded machine: the first run (load average above 100) ended 25 tests failed in 11 files, every one a time-out under load. A second full run, after both commits and with the load down, ended 12114 passed and 2 failed, both time-outs in `lib/geometry/board-surface-render.test.ts` and `lib/geometry/bottom.test.ts`; those two files re-run alone pass (1160 tests, 25 s). Nothing the plan touched fails.

## Founder's look: Approved (2026-11-11)

The founder looked at the four pictures and approved the words as shown ("Approved"); merged onto claude/bottom-uat-17-d1559c as a171822b.

- `.planning/phases/17-bottom-contours/pictures/17-17-volume-words.png` — four pictures side by side. Left to right: VOLUME's side panel at an 820-dot computer window, at 1280, on a 390-dot phone (the controls under the drawing), and the GUIDE tab's Import Designed Board card. He should see the card end with "Counts the finished rail shape from RAILS and the bottom contours from BOTTOM." wrapping to two or three lines inside the card at every width, nothing crossing the card's edge; and the GUIDE card saying "with the finished RAILS rails and the BOTTOM contours" and "Finish TEMPLATE, ROCKER, BOTTOM and RAILS first". (The round "N" in the corner of each picture is the development server's own badge, not part of the app.)
- `e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png` — VOLUME's re-taken desktop picture; only the card's foot and what sits under it moved down a line.
- The script that made the pictures is archived as `pictures/17-17-pictures-source.tar.gz`.

## Possible follow-up (not ruled)

Left exactly as they are, for the founder's word:

- The ESTIMATE tab's foot sentence, "…checkable against a published blank's own stated volume" — no longer true of a board with a concave on its bottom.
- The ESTIMATE tab's italic line under the litres, "From the board's own finished cross-sections along its length."
- The quick-estimate rows above the litres (Template Area and the three Cross-Section Thickness rows plus the Length-Weighted figure): they come from the three-station estimator and do not move with a cut, while the litres under them do.
- The GUIDE's Estimated Volume card's how line ("once the template, foil and rails are set"), which does not name BOTTOM.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, data path or schema; words only.
