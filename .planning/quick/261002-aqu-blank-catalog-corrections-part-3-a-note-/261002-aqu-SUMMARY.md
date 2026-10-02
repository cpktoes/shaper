---
phase: quick-261002-aqu
plan: 01
subsystem: blank-catalogue
tags: [blanks, catalogue, seed, prune, us-blanks]
requires: []
provides:
  - twelve DATASHEET notes on US Blanks rows whose catalog inch label is misprinted
  - the US Blanks 10'0"T listed as the 10'10"T it is, on all 15 of its rows
  - "--prune option for scripts/seed-blanks.ts (explicit, guarded, unit-tested without a database)"
affects: [ROCKER blank list, ROCKER DATASHEET, scripts/seed-blanks.ts]
tech-stack:
  added: []
  patterns: [pure decision module in lib/blanks with a source-contract test on the script's one delete]
key-files:
  created:
    - lib/blanks/prune.ts
    - lib/blanks/prune.test.ts
  modified:
    - scripts/seed-blanks.ts
    - db/seed/blanks/us_blanks_stations.csv
decisions:
  - "The founder's two decisions of 2026-10-02 (by question card) are applied exactly as listed: 'Yes, add the notes' and 'Yes, rename it'."
  - "The wording of the twelve notes (in the corrections JSON) and the design of --prune are the plan's, not the founder's."
metrics:
  tasks: 3
  commits: 3
status: complete
actuals:
  tokens: 6000
  tasks: 3
  commits: 3
---

# Phase quick-261002-aqu Plan 01: Blank catalogue corrections, part 3 Summary

Twelve US Blanks datasheet rows now say the catalog's inch label disagrees with its centimetre figure, the blank the catalog page titles 10'0"T is listed as the 10'10"T it is, and the blank loader gained a guarded `--prune` option so the old name can be taken out of the online blank list once.

## What changed for a shaper

**The founder's two decisions of 2026-10-02**, made by question card:

1. **"Yes, add the notes"** - twelve US Blanks rows where the catalog prints an inch figure that disagrees with its own centimetre figure now carry a DATASHEET note saying so. The app already held the page's centimetre figure, which is the right one, so no number moves. Example: the 9'2"A's centre width reads 22 1/4"; its note says "width: catalog prints 21 1/4" but 56.52 cm here; used the cm value (22 1/4")".
2. **"Yes, rename it"** - the blank the catalog page titles `10'0"T` is really the `10'10"T` (its length is 10'9 3/8" and its catalog address is `sups/1010T`). On ROCKER it is now listed as 10'10"T on all 15 of its rows, and its tail-tip row's note says why. Its catalog address, page (76) and every number are unchanged.

The founder approved the rename knowing the old `10'0"T` row then has to be taken out of the blank list once, on this computer's (development) database and on the live one, with a step prepared for them to run.

**The plan's own choices, not the founder's:** the exact wording of the twelve notes (held in `261002-aqu-corrections.json`) and the design of `--prune`.

No number on any blank changed. No preset's blank changed, and Phase 11's recorded boards are untouched. Boards a shaper already saved never move: each carries its own copy of its blank.

## What --prune is for, and how it is kept safe

When a blank is renamed or withdrawn, the blank loader (`scripts/seed-blanks.ts`) used to leave the old one sitting in the online blank list for good, and its own count check would then fail. `--prune` takes such a blank out, and only when asked.

- Nothing is removed unless `--prune` is typed; a plain run can never remove anything.
- A blank goes only when both its maker and its name are missing from the catalogue files, matched exactly as a pair, one removal per blank.
- It prints one line per blank removed: `removed (no longer in the catalogue): <maker> <name>`.
- It refuses, removing nothing and exiting 1, when the catalogue reads empty, or when more than 5 blanks would go in one run (`MAX_BLANKS_REMOVED_PER_RUN`) - either means the files were mis-read.
- `--check` only reads, so `--check --prune` is refused before any database work.
- Without `--prune`, a plain run whose table holds an out-of-date blank now names it and says to run again with `--prune`.
- Saved boards are never affected, because each carries its own copy of its blank.

The header of `scripts/seed-blanks.ts` documents it, with the development command and a second production one-liner for "after a blank is renamed or withdrawn".

## Evidence

- **BASE:** `525ef09d3deb7c75e28b0e46966d81c4188fbb3e` (the plan commit; parts 1 and 2 are in it).
- **Commits:**
  - `d843aeb` feat(seed): the --prune option (prune.ts, prune.test.ts, seed-blanks.ts - exactly three files)
  - `7426ab3` fix(blanks): the twelve notes and the 10'10"T rename (exactly the one CSV)
  - this summary, committed last
- **Unit tests:** before Task 1 3,614 passed, 2 skipped; after Task 1 3,633 passed, 2 skipped (19 new tests in `lib/blanks/prune.test.ts`: option parsing, the stale-blank rules including pairs, exact matching, duplicates and ordering, an empty catalogue, the 5-and-6 boundary, a drift guard against the real catalogue, and the source contract on the seed's one delete). After Task 2 still 3,633 passed, 2 skipped. No existing test edited.
- **The tool's single run, one line:** `27 lines changed in db/seed/blanks/us_blanks_stations.csv`
- **Diff shape:** `git diff --numstat BASE -- db` was exactly `27 27 db/seed/blanks/us_blanks_stations.csv`; the Arctic Foam and Marko Foam files byte-identical to BASE; no bare newline in the changed file (CRLF throughout).
- **Read-back probe** (throwaway, reads every expectation from the JSON or BASE): `13 notes read back; US Blanks 10'0"T is 10'10"T on all 15 stations; 13 blanks changed, nothing else moved (101 / 33 / 28, 158 pickable)`
- **Presets:** `scripts/generate-preset-blanks.ts` re-run; `lib/blanks/preset-blanks.generated.json` byte-identical to BASE.
- **Pinned blanks generator** (`scripts/extract-phase11-golden-blanks.ts`): before the tool `(37 blanks, 9 differ from today's catalogue)`; after the tool `(37 blanks, 10 differ from today's catalogue)`. See the deviation below. Both Phase 11 fixtures byte-identical to BASE either way.
- **Browser suite** (`PW_PORT=3183 IS_WEBPACK_TEST=1`, one project per run): desktop 180 passed, 148 skipped, 0 failed (10.4 min); iphone 199 passed, 129 skipped, 0 failed (14.0 min); android 206 passed, 122 skipped, 0 failed (11.8 min). No undo-redo re-run was needed.
- **Reference pictures:** all five desktop-baseline pictures were viewed and none shows a note or the renamed blank (ROCKER shows no blank picked, rows 6'2"A, 6'2"AX, 6'2" MF, 6'4" SBM). All five desktop-baseline tests passed; no picture was re-recorded and every PNG is byte-identical to BASE.
- **Types and lint:** `npx tsc --noEmit` clean (after `npx next typegen` in the fresh worktree), `npm run lint` clean.
- **Scope:** under lib/, components/, app/, e2e/ and scripts/ only `lib/blanks/prune.ts`, `lib/blanks/prune.test.ts` and `scripts/seed-blanks.ts` differ from BASE; `db/` differs only in the one CSV; `lib/db` is byte-identical.
- **The seed script was never run, in any mode.** No database was touched and no `.env*` file was created or named.

## Deviations from Plan

**1. [Plan expectation off by one - recorded, not a code change] The pinned-blanks generator reports 10 differing, not 9.**
- **Found during:** Task 2 step 6.
- **Cause:** `US Blanks 8'2"AX` is one of the twelve locked note rows (N18, page 49), and it is also one of Phase 11's 37 pinned boards. The generator counts a pinned blank as "differing" when today's record is not identical to the one at commit 7b2a499, and a new note is part of the record. Before the tool it was "same as today's catalogue"; after, it differs by that note alone. The read-back probe proved no number of any blank moved.
- **Impact:** none. Both Phase 11 fixtures (`phase11-foil-golden-blanks.json`, `phase11-foil-golden.json`) are byte-identical to BASE, the generator rewrites the same bytes, and the whole unit suite passes. The plan's "9 differ before and after" was a measurement the locked list could not satisfy; the true figure after this round is 10.
- **Action taken:** continued (the data is locked and the figure is a status line, not a number a board uses). The orchestrator may want to amend any later expectation of "9".

No other deviations. The plan was otherwise executed as written.

## Known Stubs

None.

## Threat Flags

None. `--prune` is the one new write path and is the plan's own mitigated threat (T-aqu-01 to T-aqu-04); nothing new at a trust boundary.

## Still to do after the merge, in this order

1. The orchestrator runs `npm run build` on main.
2. On the development database, from the main checkout: `npx --no-install tsx scripts/seed-blanks.ts --prune`. Expected: exactly one `removed (no longer in the catalogue): US Blanks 10'0"T` line, then `blanks: 162 ...; pickable: 158` and `matching the catalogue CSVs exactly: 162 of 162`. Then `--check` on its own.
3. On the founder's go: push, let Vercel deploy, and the founder runs the production one-liner with `--prune` from the seed's header.

Nothing is pushed and nothing went to production in this task.

## Self-Check: PASSED

- FOUND: lib/blanks/prune.ts, lib/blanks/prune.test.ts, scripts/seed-blanks.ts, db/seed/blanks/us_blanks_stations.csv
- FOUND commits d843aeb and 7426ab3 on the worktree branch
