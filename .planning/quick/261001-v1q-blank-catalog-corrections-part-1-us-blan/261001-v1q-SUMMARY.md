---
phase: quick-261001-v1q
plan: 01
subsystem: blank-catalogue
tags: [blanks, catalogue, us-blanks, rocker, presets, tests]
requires: []
provides:
  - corrected US Blanks catalogue file (88 lines)
  - regenerated preset blanks (5'10"RP, 6'3"RP)
  - pinned Phase 11 blanks fixture, generator and test helper
  - station-position guard test over all 162 blanks
affects: [ROCKER blank list and DATASHEET, preset blanks]
tech-stack:
  added: []
  patterns: ["tests that replay recorded numbers read pinned data generated from git, like pinned-preset-outlines.ts"]
key-files:
  created:
    - scripts/extract-phase11-golden-blanks.ts
    - lib/geometry/__fixtures__/phase11-foil-golden-blanks.json
    - lib/geometry/__fixtures__/phase11-golden-blank.ts
  modified:
    - db/seed/blanks/us_blanks_stations.csv
    - lib/blanks/preset-blanks.generated.json
    - lib/geometry/phase11-foil.test.ts
    - lib/models/design-snapshot.test.ts
    - lib/geometry/blank-fit.test.ts
    - lib/blanks/catalog.test.ts
decisions:
  - "Phase 11's recorded boards are replayed against their blanks as committed in 7b2a499 (pinned from git), so later catalogue corrections cannot fail them."
metrics:
  tasks: 3
status: complete
actuals:
  tokens: 37000
  tasks: 3
  commits: 3
---

# Phase quick-261001-v1q Plan 01: Blank catalogue corrections, part 1 (US Blanks) Summary

**31 US Blanks station numbers now follow the inch figure printed on the catalog page, the three 9'8" EPS blanks are 9'8" long, the 6'3"RP reads 51.5 L, and the 10'0"T has a rounded nose, with Phase 11's recorded boards pinned to their own blanks so none of this can disturb them.**

## What changed, in a shaper's words

These are the corrections found by the 2026-10-01 check against the makers' catalog pages. The full list, with the page each one comes from, is in `261001-v1q-CORRECTIONS.md`; the founder has it for review.

- **31 station numbers on ROCKER.** The catalogue file's US Blanks numbers had been taken from the page's centimetre line, which on these rows is a slip (often a copy of the neighbouring row's). Each now reads the inch figure printed on the same page. For example the 6'3"EA's nose 6" rocker reads 3 5/16" (it read 3 15/16"), and the 5'10"RP's tail 12" rocker reads 7/8" (it read 11/16"). Each corrected row's DATASHEET footnote now says the page printed a different centimetre figure and the app used the inch value.
- **9'8" EPS, 9'8"X EPS, 9'8"XX EPS.** They were 9'0" long in the file; they are now 9'8" (116") with a 9'7 1/4" deck length. The nose-side stations moved with the nose and the centre sits at 58"; the tail-side stations and every rocker, thickness and width number are unchanged.
- **6'3"RP, the blank the Shortboard preset opens in.** It read 57.5 L (the blank's max width in centimetres pasted into the litres box); it now reads 51.5 L.
- **10'0"T.** Its nose tip is 0 wide, noted as a rounded nose the catalog does not print.
- **Nothing else moved.** 101 US Blanks, 33 Arctic Foam and 28 Marko Foam blanks; the Arctic and Marko files are byte-identical; the four presets still open in the 6'3"RP, 5'10"RP, 7'4"SP and 9'3"Y at placement 0.
- **Saved boards do not move.** A saved board carries its own copy of its blank, so only boards started from now on see the corrected rows.
- **Preset blanks.** The Shortboard preset's blank now shows 51.5 L, and the Fish preset's blank its corrected tail rocker.

**The four preset cards' litres are identical to the last digit, before and after the corrections** (shortboard 29.410053261414706, fish 35.04695638572988, midlength 50.27691945917586, longboard 75.30048759197255). The blank's catalogue litres show only on its ROCKER list row, and the rocker shapes the bottom, never the thickness, so the cards do not move.

## Tasks and commits

| Task | What | Commit |
|------|------|--------|
| 1 | Phase 11's recorded boards pinned to their blanks (generator, fixture, helper, three tests re-pointed) and the station-position guard test | `0e61651` |
| 2 | The 88 corrected lines applied with the locked tool, preset blanks regenerated | `5167409` |
| 3 | Browser suite, pictures, types, lint, this summary | this commit (no code change; no picture re-recorded) |

BASE (the starting commit): `d41f9b01314f28448b4c1c33861e85f463cbdc45`.

## Evidence

- **Tool output (single run):** `88 lines changed in db/seed/blanks/us_blanks_stations.csv`.
- **Diff shape:** `git diff --stat BASE -- db` lists one file, `db/seed/blanks/us_blanks_stations.csv`, 88 insertions and 88 deletions; Arctic and Marko files clean against BASE; the file has no bare newline once CRLFs are removed (1,286 CRLF lines). `phase11-foil-golden.json` byte-identical to BASE.
- **Read-back probe** (throwaway, outside the repo, reads every change through `readSeedCatalog` and compares against the corrections JSON, no typed figures): `all 104 changes read back (counts 101 / 33 / 28)` (32 cell changes with their flags, 4 blank-level entries covering lengths, deck lengths, litres, 24 moved stations and 4 flagged rows, and the three counts).
- **Preset blanks diff against BASE:** `picks` deep-equal (Shortboard 6'3"RP, Fish 5'10"RP, Mid-length 7'4"SP, Longboard 9'3"Y, all placement 0, none provisional). Exactly two blanks differ: US Blanks 5'10"RP (its T12 rocker 17.5006 mm to 22.225 mm, plus that row's new flag) and US Blanks 6'3"RP (`volumeLitres` 57.47 to 51.5, plus the flag on its T0 row). 7'4"SP and 9'3"Y are identical.
- **Pinned-blanks generator:** before the corrections `(37 blanks, 0 differ from today's catalogue)`, run twice with identical `shasum` (663da44d...). After the corrections `(37 blanks, 6 differ from today's catalogue)`, the six being 6'0"P, 6'5"R, 6'5"X EPS, 6'9"EAX, 7'11"A and 9'2"A, with the fixture byte-identical. That is the proof the pin does not depend on the live catalogue.
- **Unit tests:** at BASE 3,612 passed / 2 skipped. After Task 1 3,614 passed / 2 skipped (the two new tests: the pinned-set check and the station-position guard). After Task 2 3,614 passed / 2 skipped, with no test file touched in that commit.
- **Playwright** (`PW_PORT=3181 IS_WEBPACK_TEST=1`, own dev server, one project per run): desktop 180 passed / 148 skipped / 0 failed (11.1 min); iphone 199 passed / 129 skipped / 0 failed (14.0 min); android 206 passed / 122 skipped / 0 failed (10.1 min). The skips are each project's own project-specific skips, as at BASE.
- **Reference pictures:** none re-recorded. I opened all five (`fins`, `outline`, `rails`, `rocker`, `volume` under `e2e/desktop-baseline.spec.ts-snapshots/`); none shows the 6'3"RP's 57.5 L or the 5'10"RP's rocker (the ROCKER picture has no blank picked and lists 6'2"A, 6'2"AX, 6'2" MF, 6'4" SBM, none of them corrected), all five desktop-baseline tests pass, and `git status` is clean.
- **Types and lint:** `npx tsc --noEmit` clean (no `next typegen` needed); `npm run lint` clean.

## Deviations from Plan

None to the plan's steps or outcomes. Two environment notes, neither a code deviation:

- The fresh worktree had no `node_modules`; I cloned the main checkout's with `cp -Rc` (an APFS copy-on-write copy, ignored by git) so vitest, tsx, tsc and Playwright could run inside the worktree.
- The sandbox refused two compound shell commands as too complex to verify; I re-ran the same steps as separate commands. No work changed.

Nothing surprising turned up: the corrected catalogue passed every test and browser spec untouched, as the orchestrator's measurement predicted.

## Known Stubs

None.

## Threat Flags

None (no new network, auth, file-access or schema surface; no database, push or production step).

## Still to do after the merge (orchestrator)

1. `npm run build` on main (Turbopack cannot build in a worktree).
2. Reseed the development database from the main checkout and run the seed's `--check`.
3. Nothing goes to production in this task and nothing is pushed.

## Self-Check: PASSED

- Files present: `scripts/extract-phase11-golden-blanks.ts`, `lib/geometry/__fixtures__/phase11-foil-golden-blanks.json`, `lib/geometry/__fixtures__/phase11-golden-blank.ts`, the corrected CSV and the regenerated preset JSON.
- Commits present: `0e61651`, `5167409`.
