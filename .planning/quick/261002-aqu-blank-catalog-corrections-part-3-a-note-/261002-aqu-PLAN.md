---
phase: quick-261002-aqu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/blanks/prune.ts
  - lib/blanks/prune.test.ts
  - scripts/seed-blanks.ts
  - db/seed/blanks/us_blanks_stations.csv
  # Only if a picture fails AND the difference is proven to come from this round (Task 3 step 3). Expected: nothing
  # re-recorded.
  - e2e/desktop-baseline.spec.ts-snapshots/
  - .planning/quick/261002-aqu-blank-catalog-corrections-part-3-a-note-/261002-aqu-SUMMARY.md
autonomous: true
requirements: [QT-261002-aqu, TODO-2026-10-01-fix-the-blank-catalogue-dims]
estimate:
  # One executor in its own git worktree. Three tasks:
  # - Task 1: one small pure module and its test file written, about sixty lines of the seed script changed, the
  #   unit suite, tsc and lint.
  # - Task 2: one tool run, one read-back probe, two generator runs, the unit suite.
  # - Task 3: the browser suite in three foreground runs (~35 min), five reference pictures viewed, tsc, lint, SUMMARY.
  # estimate-calibration: factor 1, 0 samples, so confidence is low. Part 1 (three tasks, one writing code) used about
  # 156k; part 2 (two tasks, no code) was planned at 85k.
  tokens: 140000
  raw_tokens: 140000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "On ROCKER's DATASHEET, each of the twelve rows in 261002-aqu-CORRECTIONS.md section A now carries a note saying the catalog page prints a different inch figure from its centimetre figure and that the app uses the centimetre one (for example the 9'2\"A's centre width: catalog prints 21 1/4\" but 56.52 cm; used the cm value, 22 1/4\") — the founder's decision 1 of 2026-10-02. No number on any row moves."
    - "The US Blanks blank the catalog page titles 10'0\"T is listed on ROCKER as 10'10\"T on all 15 of its rows, its tail-tip row's note says why, and its catalog address (sups/1010T), page (76) and every number are unchanged — the founder's decision 2 of 2026-10-02."
    - "Nothing outside the list moves: every other blank and station reads exactly as before, still 101 US Blanks / 33 Arctic Foam / 28 Marko Foam with 158 pickable; the Arctic and Marko files, the four presets' blanks and both Phase 11 fixtures are byte-identical; the pinned-blanks generator still reports 9 blanks differing from today's catalogue."
    - "Running the blank seed with --prune takes out of the blanks table exactly the blanks that are no longer in the catalogue files — one plain line per blank removed, each removal matched on both maker and name — and then its usual checks run; without --prune the seed works exactly as before and can never remove anything, and when an out-of-date blank is in the table its failure names it and says to run again with --prune; --check with --prune is refused before any database work."
    - "The removal fails closed: when the catalogue it read is empty, or when more than 5 blanks (MAX_BLANKS_REMOVED_PER_RUN) would go in one run, the seed removes nothing and exits 1 with one line saying why — proven by unit tests of the pure function the script uses, with no database."
    - "A board a shaper already saved never moves (it carries its own copy of its blank); the unit suite passes with the new prune tests added and no existing test edited; the type check, lint and the whole browser suite pass; no reference picture is re-recorded unless proven."
  artifacts:
    - path: "lib/blanks/prune.ts"
      provides: "readSeedOptions, staleBlanks, planBlankRemoval and MAX_BLANKS_REMOVED_PER_RUN — the pure rules for which stored blanks are out of date and when the seed may remove them"
      contains: "MAX_BLANKS_REMOVED_PER_RUN = 5"
    - path: "lib/blanks/prune.test.ts"
      provides: "unit tests of the three functions (no database) and a source-contract test of the seed's one removal statement"
      contains: "planBlankRemoval"
    - path: "scripts/seed-blanks.ts"
      provides: "the --prune option, the refusal of --check with --prune, the plain hint line, and its header documentation with the production one-liner"
      contains: "--prune"
    - path: "db/seed/blanks/us_blanks_stations.csv"
      provides: "the twelve new notes and the 10'10\"T name on its 15 rows (with its name note on T0), CRLF kept"
      contains: "\"10'10\"\"T\",T0"
    - path: ".planning/quick/261002-aqu-blank-catalog-corrections-part-3-a-note-/261002-aqu-SUMMARY.md"
      provides: "what changed for a shaper, the founder's two decisions of 2026-10-02, what --prune is for and how it is kept safe, the evidence, and the post-merge steps"
      contains: "status: complete"
  key_links:
    - from: "scripts/seed-blanks.ts"
      to: "lib/blanks/prune.ts"
      via: "readSeedOptions (before the env file is read), planBlankRemoval (after the upsert, before any removal), staleBlanks (the hint line)"
      pattern: "planBlankRemoval"
    - from: "scripts/seed-blanks.ts"
      to: "the blanks table"
      via: "one removal statement, db.delete(blanks) where vendor AND name match, run only with --prune and only for blanks the plan returned"
      pattern: "eq\\(blanks\\.vendor"
    - from: ".planning/quick/261002-aqu-blank-catalog-corrections-part-3-a-note-/261002-aqu-corrections.json"
      to: "db/seed/blanks/us_blanks_stations.csv"
      via: "261002-aqu-apply-corrections.py, run once from the worktree root; writes nothing unless every old note is found and exactly 15 rows carry the old name"
      pattern: "27 lines changed in db/seed/blanks/us_blanks_stations.csv"
    - from: "db/seed/blanks/*.csv"
      to: "the ROCKER list and DATASHEET"
      via: "lib/blanks/seed-files.ts readSeedCatalog (the tests, the generators, the seed and the browser suite's SHAPER_BLANKS_SOURCE=seed-csv all read it)"
      pattern: "readSeedCatalog"
---

<objective>
(Wording rule for every commit message and the SUMMARY: refer to the founder as "the founder" or "they" — never "he" or "she".)

Part 3 of the blank-catalogue corrections, applying the two decisions the founder made on 2026-10-02 by question card,
exactly as `261002-aqu-CORRECTIONS.md` lists them:

1. **"Yes, add the notes"** — twelve US Blanks rows where the catalog's INCH label is the slip (the app already holds
   the page's centimetre figure, which is right) gain a DATASHEET note saying so. No number changes.
2. **"Yes, rename it"** — the blank the catalog page titles `10'0"T` is the `10'10"T` (its length is 10'9 3/8" and its
   catalog address is `sups/1010T`); the app now lists it as `10'10"T`, and its tail-tip row's note says why.

The founder approved the rename knowing the old `10'0"T` row then has to be taken out of the blank list once, on the
development database and the live one, with a step prepared for them to run. So this round also teaches
`scripts/seed-blanks.ts` a new, explicit `--prune` option that removes blanks no longer in the catalogue files — narrow,
opt-in and fail-closed. The wording of the notes (in the JSON) and the design of `--prune` are this plan's, not the
founder's.

Purpose: the founder's todo `2026-10-01-fix-the-blank-catalogue-dims-the-founder-knows-are-wrong.md` ("still open: small
notes") — a shaper holding the catalog page sees why the app differs from the inch figure printed there, and finds the
10'10"T under its real name.

Output: one `feat(seed):` commit (the pure rules, their tests and the `--prune` option), one `fix(blanks):` commit (the
one catalogue file), an optional proven `test(e2e):` commit (expected: none), and the SUMMARY committed last.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/quick/261002-aqu-blank-catalog-corrections-part-3-a-note-/261002-aqu-CORRECTIONS.md
@.planning/quick/261002-aqu-blank-catalog-corrections-part-3-a-note-/261002-aqu-apply-corrections.py
@scripts/seed-blanks.ts
@lib/blanks/seed-files.ts

Facts measured by the orchestrator on 2026-10-02, on a throwaway copy of `main` at 7981cf1 (parts 1 and 2 included) —
confirm cheaply, do not re-derive:

- **The JSON.** `261002-aqu-corrections.json` is `{ files: { "db/seed/blanks/us_blanks_stations.csv": { rows, renames } } }`.
  `rows` holds 13 entries, each `{ vendor, blank, station, page, cells: [], flag_old, flag_new, why }` — the twelve
  notes of CORRECTIONS section A plus the name note on `10'0"T` station `T0` (listed under the OLD name; the tool edits
  notes before it renames). `flag_old` is `""` for an empty note; two rows (8'9"Y N48, 10'4"B SUP EPS N36) already had
  a note and `flag_new` appends to it with "; ". `renames` holds one entry `{ vendor: "US Blanks", old: "10'0\"T",
  new: "10'10\"T", rows: 15 }`.
- **The tool** takes ONE argument, the JSON's path, and writes the path the JSON names relative to the current
  directory — so it runs from the worktree root. Dry run printed exactly `27 lines changed in db/seed/blanks/us_blanks_stations.csv`
  (12 notes + 15 renamed rows, the T0 row counted once). It asserts CRLF, that every line round-trips, every old note,
  exactly 15 rows under the old name and none under the new one, and writes nothing unless all pass.
- **The reader.** `readSeedCatalog(dir?)` (`lib/blanks/seed-files.ts`) takes an optional directory, so a probe can read
  BASE's files from a scratch copy and HEAD's from the repo. A station has `label`, `fromTailMm`, `rockerMm`,
  `thicknessMm`, `widthMm` and `flag` — an EMPTY note reads as `null`. `isPickable` and `isWellFormedBlankRecord` are in
  `lib/blanks/catalog.ts`.
- **Counts stay** 101 US Blanks / 33 Arctic Foam / 28 Marko Foam (162), 158 pickable. Presets: regenerating
  `lib/blanks/preset-blanks.generated.json` leaves it byte-identical. Pinned blanks:
  `scripts/extract-phase11-golden-blanks.ts` reports "(37 blanks, 9 differ from today's catalogue)" before and after,
  both Phase 11 fixtures byte-identical.
- **Nothing names the blank** `10'0"T` in lib/, components/, app/, e2e/ or scripts/; it is not a preset blank and not
  one of Phase 11's pinned blanks. **Unit suite** on the changed catalogue: 3,614 passed, 2 skipped, 0 failed, no test
  edited.
- **The seed today** (read it whole — it is ~160 lines): `main()` reads `--check` from `process.argv.slice(2)`, loads the
  env file (`SEED_ENV_FILE`, default `.env.local`), dynamically imports `drizzle-orm`, the client, the schema and the
  lib/ readers (the client reads DATABASE_URL the moment it loads), reads the catalogue, runs ONE
  `INSERT … ON CONFLICT (vendor, name) DO UPDATE` unless `--check`, then read-only checks: totals and per-vendor counts
  against the catalogue, and every stored blank must read back exactly as its CSV rows; it sets `process.exitCode = 1`
  on any mismatch. It never removes a row. After this round's rename, a database seeded before (development and
  production both hold `US Blanks 10'0"T`) would gain a `10'10"T` row, keep the old one, hold 163, and fail with
  "expected 162 blanks, found 163".
- **Tests that police database statements.** `lib/db/ownership.test.ts` reads `app/design/actions.ts`, `lib/db/queries.ts`,
  the `app/actions/*.ts` files, `lib/db/blanks.ts` and `lib/db/schema.ts` only; NOTHING reads `scripts/`, and nothing
  constrains a DELETE outside those files. `lib/db/blanks.ts` must stay SELECT-only (its contract test enforces it), so
  the removal lives in the script. That file's `stripComments` helper (lines 23–30) is the idiom for a source-contract
  test. No other test reads `scripts/seed-blanks.ts`.
- **Test style in lib/blanks/**: `vitest` `describe`/`it`/`expect`, small literal fixtures of `{ vendor, name }` objects
  (see `lib/blanks/vendors.test.ts` lines 12–24), and a drift guard against `readSeedCatalog()` where it helps.
- **Saved boards** carry their blank's rows by value (`BoardBlank.copy`); the ROCKER list is read fresh from the table
  each time. A row leaving the table moves no saved board.
- **Browser suite** reads the catalogue from the CSVs (`SHAPER_BLANKS_SOURCE=seed-csv`), never a database, so the seed
  change cannot be exercised there. Part 2's run: desktop 180 passed, iphone 199, android 206, 0 failed after a re-run.
  KNOWN FLAKE: on a COLD webpack dev server in a fresh worktree, `e2e/undo-redo.spec.ts:91` and `:250` (desktop) failed
  once and passed on every re-run; that spec never reads the blank catalogue.
- **Reference pictures**: `rocker-desktop-desktop-darwin.png` shows the default board with no blank picked; its visible
  list rows are 6'2"A, 6'2"AX, 6'2" MF, 6'4" SBM — none in this round. The other four show no blank at all.
- **Worktree setup**: a fresh worktree may have no `node_modules`; clone the main checkout's with
  `cp -Rc /Users/kontoes/Code/shaper/node_modules ./node_modules` from the worktree root (git-ignored, APFS copy-on-write,
  seconds). If tsc reports missing generated route types, run `npx next typegen` first.
- **The executor has NO database.** Never run `scripts/seed-blanks.ts` in ANY mode — not even `--check --prune` to watch
  the refusal. The orchestrator proves `--prune` on the development database after the merge (it holds exactly one
  out-of-date row, `US Blanks 10'0"T`), and the founder runs the production one-liner on their own go.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: The seed learns to remove a blank that has left the catalogue files — only with --prune, never more than five, never on an empty catalogue</name>
  <files>lib/blanks/prune.ts, lib/blanks/prune.test.ts, scripts/seed-blanks.ts</files>
  <read_first>scripts/seed-blanks.ts (all of it, header included), lib/blanks/vendors.ts lines 1–30 and lib/blanks/vendors.test.ts lines 1–50 (module header voice and test style), lib/db/ownership.test.ts lines 23–30 (stripComments) and 179–203 (the blank read's SELECT-only contract)</read_first>
  <behavior>
    readSeedOptions(args):
    - [] gives status "ok", check false, prune false; ["--check"] gives check true; ["--prune"] gives prune true.
    - ["--check", "--prune"] and ["--prune", "--check"] give status "refused" with a reason naming both options.
    - An argument it does not know (e.g. ["--verbose"]) is ignored exactly as today: status "ok", both false.
    staleBlanks(stored, catalogue):
    - Nothing stale: the same pairs in a different order give [].
    - One renamed blank: stored holds US Blanks 10'0"T plus others, the catalogue holds US Blanks 10'10"T plus the same
      others, and the result is exactly [{ vendor: "US Blanks", name: "10'0\"T" }].
    - A blank from a maker the catalogue does not have (e.g. "Clark Foam") is stale.
    - Maker and name are matched as a PAIR: the same name under another maker is stale, and a pair is never joined into
      one string (stored { vendor: "US", name: "Blanks 9'0\"" } against catalogue { vendor: "US Blanks", name: "9'0\"" }
      is stale); matching is exact — "us blanks" or a trailing space is stale.
    - Duplicates and ordering: a stale pair given twice is returned once; the result is sorted by vendor, then name, in
      plain code-unit order; each returned object holds only vendor and name, even when given whole records.
    - Empty catalogue: every stored pair is stale (the function states the plain truth; the refusal is planBlankRemoval's).
    - Drift guard: staleBlanks(readSeedCatalog(), readSeedCatalog()) is [].
    planBlankRemoval(stored, catalogue):
    - Nothing stale gives status "remove" with an empty list; one stale gives status "remove" with that one.
    - Exactly MAX_BLANKS_REMOVED_PER_RUN stale gives "remove" with all of them; one more gives "refused", and the reason
      contains both String(MAX_BLANKS_REMOVED_PER_RUN) and the stale count.
    - An EMPTY catalogue gives "refused" (checked first — with a full table and with an empty one), the reason saying the
      catalogue files gave no blanks.
    - MAX_BLANKS_REMOVED_PER_RUN is 5.
    The seed's one removal statement (source contract, comments stripped from scripts/seed-blanks.ts):
    - exactly one `db.delete(` call; it is `db.delete(blanks)` and its own statement's `.where(` uses `and(` with both
      `eq(blanks.vendor,` and `eq(blanks.name,`;
    - no `db.execute(`, no `sql` tagged template, and no raw `delete from` text anywhere in the script;
    - `readSeedOptions(` appears before `loadEnvFile(`; `.onConflictDoUpdate(` and `planBlankRemoval(` both appear before
      `db.delete(`.
  </behavior>
  <action>
0. Setup. Confirm `git rev-parse --show-toplevel` is your worktree (not /Users/kontoes/Code/shaper) and run every
   command from that root. If `node_modules` is missing, run `cp -Rc /Users/kontoes/Code/shaper/node_modules ./node_modules`.
   Note BASE with `git merge-base HEAD main` (shell variables do not survive between commands — paste the hash or write
   `$(git merge-base HEAD main)` each time). Run `npm test` once and note the count (expected 3,614 passed, 2 skipped).
   If the sandbox refuses a compound command as too complex, run its parts separately — that is not a deviation.

1. RED. Write `lib/blanks/prune.test.ts` first, covering every case in the behavior block, in the style of
   `lib/blanks/vendors.test.ts` (small literal `{ vendor, name }` fixtures; read every limit from the module's exported
   constant except the one test that pins it at 5). For the source-contract `describe`, read `scripts/seed-blanks.ts`
   with `readFileSync` from the repo root (resolve it from `import.meta.url` the way `lib/db/ownership.test.ts` does) and
   strip comments with a local copy of that file's five-line `stripComments` (say so in a one-line comment); slice each
   statement from its `db.delete(` to the next `;`. Run `npx vitest run lib/blanks/prune.test.ts` and see it fail
   because the module does not exist yet.

2. GREEN — `lib/blanks/prune.ts`, pure: it imports nothing (no React, browser, database or Node import; a header comment
   says so in the voice of `vendors.ts`'s header, and says what the module is for: the seed's rules for which stored
   blanks have left the catalogue files and when it may remove them). Exports:
   - type `BlankKey` = `{ vendor: string; name: string }`.
   - `MAX_BLANKS_REMOVED_PER_RUN = 5` with a doc comment: a rename or a withdrawal moves one or two blanks; more than
     five in one run means the catalogue files were mis-read, so the seed refuses rather than empty the table.
   - `readSeedOptions(args: readonly string[])` returning `{ status: "ok"; check: boolean; prune: boolean }` or
     `{ status: "refused"; reason: string }`. Exact matches of `--check` and `--prune`, as today's `includes`; anything
     else ignored. Both together are refused with one line, wording: `--check only reads and never removes anything, so
     it can't be combined with --prune: run the seed with --prune first, then --check on its own`.
   - `staleBlanks(stored: readonly BlankKey[], catalogue: readonly BlankKey[]): BlankKey[]` — build a Map from vendor
     to a Set of names out of the catalogue (never a joined key string), keep each stored pair whose exact vendor and
     name are not in it, once each, as a fresh `{ vendor, name }`, sorted by vendor then name with plain `<` / `>`
     comparison (not `localeCompare`), so the printed lines read the same on every run.
   - `planBlankRemoval(stored, catalogue)` returning `{ status: "remove"; blanks: BlankKey[] }` or
     `{ status: "refused"; reason: string }`. First, an empty catalogue is refused: `Refusing to remove any blank: the
     catalogue files gave no blanks at all, so every blank in the table would look out of date — nothing was removed`.
     Then more than the limit is refused: `Refusing to remove any blank: <n> blanks in the table are not in the
     catalogue files, and one run may remove at most <MAX> — check the catalogue files were read correctly; nothing was
     removed`. Otherwise "remove" with `staleBlanks`' list (possibly empty).
   Run the test file until green.

3. `scripts/seed-blanks.ts` — the `--prune` option. Keep every existing behaviour without `--prune` exactly as it is.
   - Import the three functions and the constant statically, with a relative import (`../lib/blanks/prune`) like the
     script's other lib/ imports; the module is pure, so it is safe to load before the env file (say so in a short
     comment beside the existing "Relative imports on purpose" one).
   - First thing in `main()`, BEFORE the env file is read: `readSeedOptions(process.argv.slice(2))`; on "refused",
     `console.error` the reason, set `process.exitCode = 1` and return — no env file, no import of the client, no
     statement. `checkOnly` becomes the parsed `check`, and a new `prune` the parsed `prune`.
   - Add `and` and `eq` to the existing dynamic `drizzle-orm` import.
   - Right after the upsert (still inside the not-check branch), only when `prune`: SELECT `{ vendor, name }` from
     `blanks`, call `planBlankRemoval(those rows, catalog)`. On "refused": `console.error` the reason, set
     `process.exitCode = 1`, remove nothing, and fall through to the usual read-only checks (they report what the table
     holds). On "remove" with an empty list: print `nothing to remove: every blank in the table is in the catalogue
     files`. Otherwise, for each blank in the plan, one statement: `db.delete(blanks).where(and(eq(blanks.vendor,
     blank.vendor), eq(blanks.name, blank.name))).returning({ vendor: blanks.vendor, name: blanks.name })`, and print
     one line per row it returns: `removed (no longer in the catalogue): <vendor> <name>`. Values travel as parameters,
     never through `sql.raw`. One statement per blank on purpose: each is constrained on maker AND name, and a run cut
     short is safe to repeat. This must be the script's ONLY delete.
   - In the read-only checks, after the count check: compute `staleBlanks(stored, catalog)`; when `prune` was NOT given
     and it is non-empty, print one more `console.error` line, e.g. `  no longer in the catalogue files: US Blanks
     10'0"T — run the seed with --prune to remove it` (`them` for more than one; names joined with ", "), and set
     `process.exitCode = 1`. With `--prune` given this line is never printed (a refusal has already said why).
   - The header comment, same voice as the rest: replace the "Safe to run again" paragraph's implication that the seed
     never removes with a plain statement that, WITHOUT `--prune`, it only ever adds or updates and can never remove a
     blank. Add a `--prune` paragraph: what it does (after the upsert, removes every blank in the table whose maker and
     name are no longer in the catalogue files, one line per blank removed, matched on both maker and name); WHEN to use
     it (after a blank is renamed in, or withdrawn from, the catalogue files — the next plain run would otherwise fail
     its count check and name the blank); its guards (refuses, removing nothing and exiting 1, when the catalogue read
     is empty or more than `MAX_BLANKS_REMOVED_PER_RUN` (5) blanks would go in one run; `--check` never writes, so
     `--check --prune` is refused before any database work); and that a saved board is never affected (it carries its
     own copy of its blank). In the Commands list add `npx --no-install tsx scripts/seed-blanks.ts --prune` under
     development, keep the existing production one-liner unchanged, and add a second production one-liner — "after a
     blank is renamed or withdrawn" — identical except that the seeding invocation (the first tsx run, not the
     `--check`) carries `--prune`.

4. Prove it: `npx vitest run lib/blanks/prune.test.ts`, then `npm test` (step 0's count plus the new tests, 0 failed, no
   existing test edited), `npx tsc --noEmit` and `npm run lint` clean. `git diff --exit-code $(git merge-base HEAD main) -- db lib/db`
   must be clean (no catalogue file, no database read file touched). Do NOT run the seed script in any mode.

5. Commit exactly the three files. Subject in plain English for a shaper, prefix `feat(seed):`, written fresh — say what
   it lets the founder do: take a blank that has been renamed or withdrawn out of the online blank list, only when they
   asks for it with --prune. Body, two to four plain sentences: why now (the next commit renames the 10'0"T, and the
   database would otherwise keep the old name beside the new one); the guards (both maker and name must match, nothing
   happens without --prune, at most five at once, never on an empty catalogue, --check never writes); saved boards are
   unaffected; nothing was run against any database. End with the attribution line from the environment's instructions.
  </action>
  <verify>
    <automated>npx vitest run lib/blanks/prune.test.ts && npm test && npx tsc --noEmit && npm run lint && git diff --exit-code $(git merge-base HEAD main) -- db lib/db</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run lib/blanks/prune.test.ts` passes every case in the behavior block, including the empty catalogue, the 5-and-6 boundary and the source contract.
    - `npm test` passes with step 0's count plus the new file's tests; `git diff --name-only $(git merge-base HEAD main) -- '*.test.ts'` lists only `lib/blanks/prune.test.ts`.
    - `lib/blanks/prune.ts` has no line beginning with `import` (it is pure and self-contained); `lib/db/blanks.ts` is byte-identical to BASE.
    - `scripts/seed-blanks.ts` names `--prune` in its header with both production one-liners (with and without `--prune`) and the development `--prune` command.
    - `npx tsc --noEmit` and `npm run lint` are clean; the commit holds exactly the three files; the seed was not run.
  </acceptance_criteria>
  <done>The seed has a `--prune` option that removes only blanks no longer in the catalogue files, matched on maker and name, refuses on an empty catalogue or more than five, is refused with `--check`, and changes nothing without it; the pure rules behind it are unit-tested without a database; one `feat(seed):` commit holds the three files.</done>
</task>

<task type="auto">
  <name>Task 2: Apply the twelve notes and the 10'10"T rename to the US Blanks catalogue file and prove nothing else moved</name>
  <files>db/seed/blanks/us_blanks_stations.csv</files>
  <read_first>.planning/quick/261002-aqu-blank-catalog-corrections-part-3-a-note-/261002-aqu-CORRECTIONS.md (the locked list), .planning/quick/261002-aqu-blank-catalog-corrections-part-3-a-note-/261002-aqu-corrections.json, lib/blanks/seed-files.ts</read_first>
  <action>
The corrections are LOCKED (the founder's two decisions of 2026-10-02): apply exactly `261002-aqu-corrections.json` with
its tool; never edit the CSV, the JSON or the tool by hand, and never add, drop or alter a correction. The tool and the
JSON stay in the quick-task folder as the record.

1. Before the tool runs, in your session scratch directory (OUTSIDE the repository, never committed):
   - write BASE's three catalogue files into a `base-csv` folder with `git show BASE:db/seed/blanks/<file>` redirected,
     one per file (keep the bytes) — the read-back probe compares against these;
   - run `npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase11-golden-blanks.ts` and note its last
     line (expected "(37 blanks, 9 differ from today's catalogue)"); `git diff --exit-code -- lib/geometry/__fixtures__/phase11-foil-golden-blanks.json` clean.
2. Run the tool exactly once, from the worktree root:
   `python3 .planning/quick/261002-aqu-blank-catalog-corrections-part-3-a-note-/261002-aqu-apply-corrections.py .planning/quick/261002-aqu-blank-catalog-corrections-part-3-a-note-/261002-aqu-corrections.json`.
   Expected output, exactly one line: `27 lines changed in db/seed/blanks/us_blanks_stations.csv`. Anything else, or an
   assertion, is a STOP-and-report with the exact output — do not retry, do not edit any file.
3. Diff shape: `git diff --numstat BASE -- db` lists exactly one line, `27 27 db/seed/blanks/us_blanks_stations.csv`;
   `git diff --exit-code BASE -- db/seed/blanks/arctic_foam_stations.csv db/seed/blanks/marko_foam_stations.csv` clean;
   a `python3 -c` check finds no bare newline in the changed file once every CRLF is removed.
4. Read the catalogue back through the tested reader with a throwaway tsx probe in the scratch directory (never
   committed), run with `npx --no-install tsx --tsconfig ./tsconfig.json <probe>`. It loads the JSON (UTF-8),
   `readSeedCatalog()` (HEAD) and `readSeedCatalog(<scratch>/base-csv)` (BASE), and types no figure and no name —
   every expectation comes from the JSON or from BASE. Let `headName(vendor, blank)` map a name through the JSON's
   `renames`.
   - For each of the 13 `rows` entries: at BASE the blank (`vendor`, `blank`) has exactly one station with that `label`
     and its `flag` equals `flag_old` (an empty `flag_old` means `null`); at HEAD the blank (`vendor`,
     `headName(vendor, blank)`) has exactly one station with that `label` and its `flag` equals `flag_new` exactly.
   - For the rename: at HEAD the blank under `new` has exactly `rows` (15) stations and no blank carries `old`; at BASE
     the blank under `old` has `rows` stations and no blank carries `new`.
   - Nothing else moved: set the flag of the 13 listed stations aside on both sides and rename BASE's record through
     `renames`; then both catalogues hold the same vendor + name pairs in the same order, and `JSON.stringify` of every
     HEAD record equals that of its BASE record. This covers every number, length, litres figure, catalog address and
     page — including the renamed blank's `sups/1010T` and page 76.
   - Exactly as many records differ between HEAD and BASE (before the set-aside) as there are distinct blanks named in
     the JSON's `rows` and `renames` (13).
   - Every HEAD record passes `isWellFormedBlankRecord`, and HEAD's per-vendor counts and `isPickable` count equal
     BASE's (101 / 33 / 28, 158 pickable).
   Print one line, e.g. `13 notes read back; US Blanks 10'0"T is 10'10"T on all 15 stations; 13 blanks changed, nothing
   else moved (101 / 33 / 28, 158 pickable)`, built from the data, and exit non-zero on any mismatch. A mismatch is a
   stop-and-report.
5. Presets: run `npx --no-install tsx --tsconfig ./tsconfig.json scripts/generate-preset-blanks.ts`, then
   `git diff --exit-code -- lib/blanks/preset-blanks.generated.json` must be clean (no preset blank is in this round).
   A difference is a stop-and-report: restore it with `git checkout -- lib/blanks/preset-blanks.generated.json` and
   report what changed.
6. Phase 11's pinned blanks: re-run `npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase11-golden-blanks.ts`;
   expected last line again "(37 blanks, 9 differ from today's catalogue)"; then
   `git diff --exit-code BASE -- lib/geometry/__fixtures__/phase11-foil-golden-blanks.json lib/geometry/__fixtures__/phase11-foil-golden.json`
   clean.
7. `npm test`: every test passes with Task 1's end count (no test is edited in this task). A failing test is a
   stop-and-report — do not edit any test. `git status --short` must list only the CSV (restore `next-env.d.ts` or
   `AGENTS.md` with `git checkout --` if a tool rewrote them).
8. Commit exactly the CSV. Subject in plain English for a shaper, prefix `fix(blanks):`, written fresh (never copied
   from parts 1 or 2): the US Blanks 10'0"T is now listed as the 10'10"T it is, and twelve rows whose catalog inch
   label is misprinted now say so. Body, two to four plain sentences: these apply the founder's two decisions of
   2026-10-02; no number changes — on those twelve rows the app already holds the page's centimetre figure, and each
   note says what the page prints; the renamed blank keeps its catalog address, page and every number; the online
   blank list still holds the old name until the seed is run once with --prune (previous commit); saved boards are
   unaffected and no preset's blank changed. End with the attribution line.
  </action>
  <verify>
    <automated>git diff --numstat $(git merge-base HEAD main) -- db && git diff --exit-code $(git merge-base HEAD main) -- db/seed/blanks/arctic_foam_stations.csv db/seed/blanks/marko_foam_stations.csv lib/blanks/preset-blanks.generated.json lib/geometry/__fixtures__/phase11-foil-golden.json lib/geometry/__fixtures__/phase11-foil-golden-blanks.json && npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase11-golden-blanks.ts && git diff --exit-code -- lib/geometry/__fixtures__/phase11-foil-golden-blanks.json && npm test</automated>
  </verify>
  <acceptance_criteria>
    - The tool's single run printed exactly `27 lines changed in db/seed/blanks/us_blanks_stations.csv`.
    - `git diff --numstat BASE -- db` shows `27 27` for the US Blanks file and nothing else; the file is CRLF throughout.
    - The read-back probe prints its one line (13 notes, the 15-station rename, 13 blanks changed, nothing else moved, 101 / 33 / 28, 158 pickable) and exits 0.
    - The Arctic and Marko files, `lib/blanks/preset-blanks.generated.json` and both Phase 11 fixtures are byte-identical to BASE; the pinned-blanks generator reports 9 differing before and after.
    - `npm test` passes with Task 1's end count; this task's commit holds exactly the one CSV.
  </acceptance_criteria>
  <done>The US Blanks catalogue file carries exactly the 27 changed lines of the locked list, read back through the tested reader with nothing else moved, the presets' blanks and Phase 11's recorded boards untouched, every unit test green with no test edited, and one `fix(blanks):` commit holds exactly the CSV.</done>
</task>

<task type="auto">
  <name>Task 3: The browser suite, the desktop reference pictures, types, lint and the SUMMARY</name>
  <files>e2e/desktop-baseline.spec.ts-snapshots/ (only a picture proven to show something this round changed — expected none), .planning/quick/261002-aqu-blank-catalog-corrections-part-3-a-note-/261002-aqu-SUMMARY.md</files>
  <read_first>playwright.config.ts lines 13–60 (port and the seed-csv catalogue source), e2e/desktop-baseline.spec.ts lines 55–115 (how the pictures are taken)</read_first>
  <action>
The suite starts its own dev server and reads the catalogue from the CSVs (`SHAPER_BLANKS_SOURCE=seed-csv`), so the
notes and the rename reach it; the seed change cannot be exercised there (no database). Always use
`PW_PORT=3183 IS_WEBPACK_TEST=1`; never ports 3000, 3100, 3120, 3181, 3182 or 3190; never touch `.next/dev/lock`; never
edit a spec.

1. Run the whole browser suite as three foreground commands, one per project, each with a 600000 ms timeout:
   `PW_PORT=3183 IS_WEBPACK_TEST=1 npx playwright test --project=desktop --reporter=line`, then the same with
   `--project=iphone` and `--project=android`. If a run is cut off by the timeout, re-run that project with
   run_in_background and wait for it to exit. Note each project's passed / skipped / failed counts (part 2's: desktop
   180, iphone 199, android 206 passed, 0 failed).
2. Expected: everything passes. KNOWN FLAKE: if the ONLY failures of a project's run are in `e2e/undo-redo.spec.ts`,
   re-run that project once; if the re-run is clean, record both runs in the SUMMARY and carry on. Any other failure,
   or the same failure twice, is a stop-and-report unless step 3 proves it is a desktop reference picture whose
   difference comes from this round: write what failed and its error verbatim into the SUMMARY and stop; do not fix
   it, do not edit a spec.
3. Reference pictures. Open each of the five PNGs in `e2e/desktop-baseline.spec.ts-snapshots/` with Read. None should
   show anything this round changed: the ROCKER picture has no blank picked and its visible rows (6'2"A, 6'2"AX,
   6'2" MF, 6'4" SBM) show no note and no blank in this round; the other four show no blank. If all five
   desktop-baseline tests passed, re-record nothing. Only if one failed: re-record it alone with
   `PW_PORT=3183 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop --update-snapshots=all -g "<its test title>"`,
   write BASE's copy to your scratch directory with `git show BASE:e2e/desktop-baseline.spec.ts-snapshots/<file>`, Read
   old and new, and keep the new picture ONLY if its sole difference is the renamed blank's name or a note from the
   JSON; otherwise restore it with `git checkout BASE -- e2e/desktop-baseline.spec.ts-snapshots/<file>` and
   stop-and-report. If a picture was kept, run `PW_PORT=3183 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop`
   once more (all five pass) and commit only that PNG with your own plain-English subject (prefix `test(e2e):`) saying
   what the picture now shows and why, plus the attribution line.
4. `npx tsc --noEmit` (if a fresh worktree reports missing generated route types, run `npx next typegen` first) and
   `npm run lint` — both clean. `npm run build` is NOT run here (Turbopack cannot build in a worktree; the orchestrator
   builds on main). No database step of any kind.
5. If `git status --short` shows `next-env.d.ts`, `AGENTS.md` or anything else rewritten by the dev server or typegen,
   restore it with `git checkout --`. `git diff --name-only BASE -- lib components app e2e scripts` must list exactly
   `lib/blanks/prune.test.ts`, `lib/blanks/prune.ts` and `scripts/seed-blanks.ts` (plus a proven PNG, if any).
6. Write the SUMMARY at `.planning/quick/261002-aqu-blank-catalog-corrections-part-3-a-note-/261002-aqu-SUMMARY.md`
   inside the worktree (if your Write tool refuses the path, write it in your scratch directory and `cp` it in), with
   `status: complete` in its frontmatter. Plain English for a shaper first:
   - the founder's two decisions of 2026-10-02, made by question card: "Yes, add the notes" and "Yes, rename it" — and
     that they approved the rename knowing the old row has to be taken out of the blank list once, on this computer's
     database and the live one, with a step prepared for them. Say plainly that the wording of the twelve notes and the
     design of `--prune` are this plan's, not the founder's;
   - what a shaper now sees: on ROCKER the blank listed as 10'0"T is listed as 10'10"T, with its tail-tip row's note
     saying why, and twelve DATASHEET rows say the catalog's inch label disagrees with its centimetre figure and the app
     uses the centimetre one (one or two examples from CORRECTIONS section A, e.g. the 9'2"A's centre width 22 1/4");
     no number on any blank changed;
   - what `--prune` is for and how it is kept safe, for a non-developer: it takes a renamed or withdrawn blank out of
     the online blank list only when asked; both maker and name must match; nothing happens without it; it refuses if
     the catalogue reads empty or more than five blanks would go at once; `--check` never removes anything; saved boards
     are never affected because each carries its own copy of its blank;
   - that no preset's blank changed and Phase 11's recorded boards are untouched.
   Then the evidence: BASE, the commit hashes, the new unit tests and the unit counts before and after each task, the
   tool output, the diff numstat, the read-back probe's line, the preset file check, the pinned-blanks generator's
   "9 differ" before and after, the three Playwright results (and any undo-redo re-run, both runs recorded), which
   pictures were re-recorded and why (or that none were), tsc and lint, and that the seed was never run. End with what
   is still to do after the merge, in this order: the orchestrator runs `npm run build` on main; on the development
   database, `npx --no-install tsx scripts/seed-blanks.ts --prune` from the main checkout (expected: exactly one
   `removed (no longer in the catalogue): US Blanks 10'0"T` line, then `blanks: 162 …; pickable: 158` and
   `matching the catalogue CSVs exactly: 162 of 162`), then `--check` on its own; and, on the founder's go, push,
   deploy, and the founder runs the production one-liner with `--prune` from the seed's header. Nothing is pushed and
   nothing goes to production in this task.
7. Commit the SUMMARY as the LAST commit in the worktree, subject `docs(quick-261002-aqu): summary` followed by a short
   plain-English phrase of your own, plus the attribution line — the worktree is removed after the merge and an
   uncommitted SUMMARY would be lost. Do not touch CLAUDE.md, ROADMAP.md, STATE.md, the todo file, parts 1 and 2's
   folders, app code or any test.
  </action>
  <verify>
    <automated>PW_PORT=3183 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop && npx tsc --noEmit && npm run lint && test -f .planning/quick/261002-aqu-blank-catalog-corrections-part-3-a-note-/261002-aqu-SUMMARY.md && git diff --name-only $(git merge-base HEAD main) -- lib components app e2e scripts</automated>
  </verify>
  <acceptance_criteria>
    - All three Playwright projects pass (an undo-redo-only failure clean on its one re-run counts, both runs recorded), or the run stopped and the SUMMARY reports the failure verbatim.
    - Every PNG under `e2e/desktop-baseline.spec.ts-snapshots/` is byte-identical to BASE's, unless re-recorded with its proof recorded in the SUMMARY.
    - `npx tsc --noEmit` and `npm run lint` are clean; under lib/, components/, app/, e2e/ and scripts/ only `lib/blanks/prune.ts`, `lib/blanks/prune.test.ts` and `scripts/seed-blanks.ts` differ from BASE (plus a proven PNG, if any).
    - The SUMMARY has `status: complete`, attributes the two decisions to the founder on 2026-10-02 and the notes' wording and `--prune`'s design to the plan, and lists the post-merge steps including the development `--prune` run's expected output.
    - `git log --format=%s -1` starts with `docs(quick-261002-aqu): summary`, and `git status --short` is empty.
  </acceptance_criteria>
  <done>The browser suite passes on the corrected catalogue, no reference picture holds a stale or unexplained difference, types and lint are clean, and the SUMMARY is committed last in the worktree.</done>
</task>

</tasks>

<source_coverage>
| Source | Item | Covered by |
|--------|------|-----------|
| GOAL (todo) | "Still open: small notes" on the blank catalogue | Task 2 (the twelve notes and the name note) |
| Founder decision 1 (2026-10-02) | "Yes, add the notes" — twelve rows, no number change | Task 2 steps 2–4 |
| Founder decision 2 (2026-10-02) | "Yes, rename it" — 10'0"T to 10'10"T on 15 rows, T0 name note, slug/page/numbers kept | Task 2 steps 2–4 |
| Founder approval | the old row removed once from the development and live blank lists, a step prepared for them | Task 1 (`--prune` + header one-liner); SUMMARY post-merge steps (Task 3 step 6) |
| Orchestrator design | `--prune` after the upsert, one line per removed blank, DELETE on vendor AND name, ends 162 of 162 | Task 1 step 3; the 162 run is the orchestrator's after the merge |
| Orchestrator design | without `--prune` unchanged; hint line naming stale blanks | Task 1 step 3 |
| Orchestrator design | `--check --prune` refused before any database work | Task 1 steps 2–3 (`readSeedOptions`, unit-tested; source contract orders it before `loadEnvFile`) |
| Orchestrator design | pure stale function in lib/, tests for nothing stale / rename / unknown vendor / duplicates-ordering / empty catalogue | Task 1 steps 1–2 |
| Orchestrator design | refuse on empty catalogue or more than 5 (named constant, stated in the line) | Task 1 step 2 (`planBlankRemoval`, `MAX_BLANKS_REMOVED_PER_RUN`) |
| Orchestrator design | header documents the option, when to use it, both production one-liners | Task 1 step 3 |
| Orchestrator design | ownership test checked; `lib/db/blanks.ts` stays SELECT-only | Context (nothing polices scripts/); Task 1 step 4 diff gate on lib/db |
| Counts / presets / pinned blanks | 101/33/28, 158 pickable; preset blanks byte-identical; 9 differ | Task 2 steps 4–6 |
| Excluded | station numbers, catalog addresses (incl. the 6'9"EAX and 11'8"BG repeats), Arctic and Marko files, running the seed, build, push, production | CORRECTIONS "Not changed"; constraints |
</source_coverage>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| catalog page to catalogue file | What a shaper reads on the maker's page crosses into the app's notes and names here |
| catalogue files to the blanks table | The seed writes, and now may remove, rows in the live blank list every shaper's ROCKER screen reads |
| the founder's shell to production | The `--prune` one-liner runs against the production database with the pulled env |
| catalogue to saved boards | A saved board carries its own copy of its blank; nothing here may reach it |
| tests to recorded numbers | A reference picture re-recorded without proof can hide a regression |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-aqu-01 | Tampering (a mis-read or truncated catalogue empties the live blank list) | `--prune` in scripts/seed-blanks.ts | high | mitigate | `planBlankRemoval` refuses on an empty catalogue and on more than `MAX_BLANKS_REMOVED_PER_RUN` (5) stale blanks, removing nothing and exiting 1; unit-tested at the 5/6 boundary and on an empty catalogue; removal runs only after a successful upsert. |
| T-aqu-02 | Tampering (the wrong blank removed) | the removal statement | high | mitigate | One `db.delete(blanks)` per blank, `where(and(eq(blanks.vendor, …), eq(blanks.name, …)))`, values as parameters; stale pairs matched exactly as pairs, never a joined string (unit-tested); a source-contract test pins it as the script's only delete and forbids raw SQL deletes. |
| T-aqu-03 | Elevation (removal without being asked) | seed options | high | mitigate | Removal only with the explicit `--prune`; without it the script can never reach the delete; `--check --prune` refused by `readSeedOptions` before the env file is read (unit-tested; source contract orders it before `loadEnvFile`). |
| T-aqu-04 | Repudiation (a blank silently disappears) | seed output | medium | mitigate | One `removed (no longer in the catalogue): <maker> <name>` line per row the statement returns; the plain run's failure names any left-over blank and says to use `--prune`; the header documents when to use it. |
| T-aqu-05 | Tampering (a wrong note or name reaches a shaper) | us_blanks_stations.csv | medium | mitigate | Only the locked JSON is applied, by a tool that refuses to write unless every old note is found and exactly 15 rows carry the old name; the read-back probe checks all 13 notes and the rename against the JSON and every other record against BASE; numstat must be 27/27. |
| T-aqu-06 | Tampering (a saved board or a Phase 11 number moves) | saved boards, phase11 fixtures | high | mitigate | Boards carry their blank by value; no migration; generator still reports 9 differing with both fixtures byte-identical; whole unit suite green. |
| T-aqu-07 | Denial of service (the old and new names both listed briefly) | ROCKER list during a `--prune` run | low | accept | Between the upsert and the delete the table holds both names for a moment; harmless, and gone by the end of the run. |
| T-aqu-08 | Tampering with test evidence | e2e/desktop-baseline.spec.ts-snapshots/ | medium | mitigate | A picture is kept only if its sole difference is the renamed blank's name or a JSON note, recorded in the SUMMARY; expected none. |
| T-aqu-09 | Information disclosure | env handling | low | accept | Unchanged: the connection string is never printed; the executor has no env file and never runs the seed. |
| T-aqu-SC | Tampering | npm/pip installs | low | accept | No package is installed; the tool uses Python's standard library only. |
</threat_model>

<verification>
- `git log --oneline $(git merge-base HEAD main)..HEAD` shows the `feat(seed):` commit, the `fix(blanks):` commit, an
  optional proven `test(e2e):` commit (expected: none), and the SUMMARY commit last.
- `git diff --numstat $(git merge-base HEAD main) -- db` lists only `27 27 db/seed/blanks/us_blanks_stations.csv`;
  `git diff --exit-code $(git merge-base HEAD main) -- db/seed/blanks/arctic_foam_stations.csv db/seed/blanks/marko_foam_stations.csv lib/db lib/blanks/preset-blanks.generated.json lib/geometry/__fixtures__/phase11-foil-golden.json lib/geometry/__fixtures__/phase11-foil-golden-blanks.json` is clean.
- `npm test`, `npx tsc --noEmit`, `npm run lint` and all three Playwright projects are green in the worktree.
- The seed script was never run; the orchestrator proves `--prune` on the development database after the merge.
</verification>

<success_criteria>
- The twelve rows carry their notes and the 10'10"T reads under its real name exactly as CORRECTIONS.md lists them —
  the founder's decisions 1 and 2 of 2026-10-02 — with no number moved anywhere.
- The seed can take the old `10'0"T` row out of a database with `--prune`, and only with it; it cannot empty the table
  on a mis-read catalogue, and its rules are unit-tested without a database.
- No other blank, station, Arctic or Marko number, preset blank or recorded Phase 11 number changed; no saved board moved.
- No expected number or name was typed into a probe; every check reads its expectation from the JSON, from BASE or from
  a generator.
</success_criteria>

<output>
Create `.planning/quick/261002-aqu-blank-catalog-corrections-part-3-a-note-/261002-aqu-SUMMARY.md` (Task 3, step 6) and
commit it as the worktree's last commit.
</output>
