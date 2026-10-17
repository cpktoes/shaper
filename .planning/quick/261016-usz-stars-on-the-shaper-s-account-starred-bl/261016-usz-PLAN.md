---
phase: quick-261016-usz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/starred-blanks-preference.ts
  - lib/starred-blanks-preference.test.ts
  - lib/db/schema.ts
  - drizzle/0011_starred_blanks.sql
  - drizzle/meta/0011_snapshot.json
  - drizzle/meta/_journal.json
  - lib/db/queries.ts
  - lib/starred-blanks-server.ts
  - app/actions/starred-blanks.ts
  - lib/starred-blanks-account.test.ts
  - lib/db/ownership.test.ts
  - lib/account/account-data.test.ts
  - scripts/check-preference-columns.ts
  - components/starred-blanks-provider.tsx
  - app/layout.tsx
  - components/account/your-data-copy.ts
  - e2e/blank-picker.spec.ts
  - .planning/quick/261016-usz-stars-on-the-shaper-s-account-starred-bl/261016-usz-SUMMARY.md
autonomous: true
requirements: [QT-261016-usz]
estimate:
  # One executor in its own git worktree. Three tasks: the join rule (pure, tested); the account column, its
  # read, its save and the development migration with its proof; the browser hand-off, the browser proof and the
  # gates. The nearest sample, plan 15-04 (schema + action + dev migration), took 111k. Calibration: factor 1,
  # 0 samples (estimate-calibration, 2026-10-16).
  tokens: 180000
  raw_tokens: 180000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "Signed in, every star and unstar shows at once and is then saved on the shaper's account, in order, the last one winning (D-03)."
    - "Signed in on another device, the popup shows the account's stars: on a signed-in page load the account's list replaces the browser's copy, so a star removed on the phone stays removed on the computer (D-04)."
    - "Stars made in a browser while signed out are joined into the account the next time the shaper signs in there: the account's stars first, then the browser-only ones in the order they were starred, and the joined list is saved to the account (D-04)."
    - "When a different shaper signs in on the same browser, none of the first shaper's synced stars go into the second shaper's account: only stars made while signed out (and still starred) are joined (D-04, P-1)."
    - "Signed out, the popup behaves exactly as part 1 shipped it: stars kept in this browser across reloads, and starring sends nothing to the server (D-02)."
    - "Starring never changes a board or marks it unsaved; a failed account read never breaks a page and never overwrites or empties the account's stars (D-07, P-3)."
    - "The development database has the starred_blanks column, proven by the read-only check printing `starred_blanks text (6 of 6 columns)` and exiting 0 (D-01, D-08)."
  artifacts:
    - path: "lib/starred-blanks-preference.ts"
      provides: "the to-join key, the account hand-off type, the action's input reader, the join rule, the sign-in decision and the per-star change rule — pure"
      contains: "shaper-starred-blanks-to-join"
    - path: "drizzle/0011_starred_blanks.sql"
      provides: "the additive migration: one nullable text column on user_preferences"
      contains: "ADD COLUMN \"starred_blanks\" text"
    - path: "lib/starred-blanks-server.ts"
      provides: "resolveStarredBlanksHandoff — the guarded account read the root layout awaits"
      contains: "account-unreadable"
    - path: "app/actions/starred-blanks.ts"
      provides: "saveStarredBlanksPreference — signed-in only, allow-listed, upserts starred_blanks and updated_at"
      contains: "starredBlanks"
    - path: "components/starred-blanks-provider.tsx"
      provides: "StarredBlanksProvider with a handoff prop, the to-join list and the background account write"
      contains: "saveStarredBlanksPreference"
    - path: "scripts/check-preference-columns.ts"
      provides: "the read-only proof that a database holds starred_blanks (6 of 6 user_preferences columns)"
      contains: "starred_blanks"
  key_links:
    - from: "app/layout.tsx"
      to: "lib/starred-blanks-server.ts"
      via: "resolveStarredBlanksHandoff() awaited in the same Promise.all as the other four hand-offs"
      pattern: "resolveStarredBlanksHandoff\\(\\)"
    - from: "app/layout.tsx"
      to: "components/starred-blanks-provider.tsx"
      via: "the resolved hand-off passed as the provider's handoff prop"
      pattern: "<StarredBlanksProvider handoff="
    - from: "components/starred-blanks-provider.tsx"
      to: "lib/starred-blanks-preference.ts"
      via: "decideStarredBlanksHandoff on load / sign-in / sign-out, applyStarChange on every tap — the provider never re-judges a star"
      pattern: "decideStarredBlanksHandoff\\("
    - from: "components/starred-blanks-provider.tsx"
      to: "app/actions/starred-blanks.ts"
      via: "createPreferenceWriteQueue whose save is saveStarredBlanksPreference"
      pattern: "createPreferenceWriteQueue"
    - from: "app/actions/starred-blanks.ts"
      to: "lib/db/schema.ts (userPreferences.starredBlanks)"
      via: "insert … onConflictDoUpdate setting only starredBlanks and updatedAt, after parseStarredBlanksInput"
      pattern: "starredBlanks: value, updatedAt"
---

<objective>
Stars on the shaper's account — sketch 015 B, part 2 of 2. Part 1 (quick 261015-ve9, live) keeps ROCKER's ☆ stars in
the browser only. This plan saves them on a signed-in shaper's account so they follow the shaper to any device. Signed
out, stars stay in the browser, exactly as part 1 shipped them.

What a shaper will notice:
- Signed in, a blank starred on the computer shows under ★ STARRED on the phone.
- A star removed on one device stays removed on the others.
- Stars made while signed out join the account at the next sign-in.
- A second shaper on the same browser never inherits the first shaper's stars.

Purpose: the founder's decisions of 2026-10-15 ("signed in, stars are saved on the shaper's account and follow them to
any device; signed out, the browser remembers them, like the Imperial/Metric choice") and 2026-10-16 ("go ahead with
part 2, stars on my account").

Output:
- A new nullable `starred_blanks` column (migration 0011), migrated on the DEVELOPMENT branch only, with proof.
- The join rule, pure and tested.
- The account read, the save action and the browser hand-off.
- The browser proof and `261016-usz-SUMMARY.md` for the founder.

Shape: pure rule, then database, then browser. There is no separate tracer task: this is the sixth instance of the
account-preference pattern (units, print option, fit defaults, blank makers, rack order). Task 3's gates run the whole
path end to end.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<decisions>
The founder's decisions, from `261016-usz-BRIEF.md` "Decided" (numbered here D-01 to D-09 in the brief's own order).
They are locked.

- **D-01 Where.** A new nullable `text` column `starred_blanks` on `user_preferences`, holding `starredBlanksJson`'s JSON
  — exactly how `hidden_blank_makers` (0007) and `rack_order` (0009) are stored. Additive migration, the next number,
  made with `npm run db:generate -- --name starred_blanks < /dev/null`.
- **D-02 Signed out.** Nothing changes from part 1. Stars live in this browser only.
- **D-03 Signed in.** The account is where stars live. The server reads the account's list in one guarded read beside
  the others the root layout already does, and hands it to `StarredBlanksProvider`. Every star and unstar shows at once
  (the browser copy), then saves to the account through a server action in order, last write wins (the makers
  provider's write queue, `lib/preference-handoff.ts`).
- **D-04 Nothing starred is ever lost, and a star removed on one device stays removed on the others.**
  - Stars made while signed out are JOINED into the account at the next sign-in in that browser: account first, then
    the browser-only ones. The joined list is written back to the account.
  - Otherwise, on a signed-in load the account's list REPLACES the browser copy.
  - The browser keeps track of which of its stars have not yet joined an account. That rule is pure and tested in
    `lib/`.
  - A different shaper signing in on the same browser gets none of the first shaper's synced stars. Only stars made
    while signed out are joined.
- **D-05 No cookie.**
- **D-06 The server action** (mirrors `app/actions/blank-makers.ts`):
  - It needs a signed-in user. Signed out, it writes nothing and returns quietly.
  - Every value goes through the existing allow-list parser.
  - It upserts only `starred_blanks` and `updated_at`.
- **D-07** Starring never changes a board or marks it unsaved.
- **D-08** `scripts/check-preference-columns.ts` learns the new column: 6 of 6 `user_preferences` columns, with its header
  comment, printed line, counts and exit rule all updated.
- **D-09** If `/privacy` or `/terms` lists what an account stores item by item, add starred blanks there. Checked at plan
  time: `content/legal/privacy.md` and `content/legal/terms.md` speak only of "your designs", "your settings" and
  "cookies that remember your settings". Neither lists account settings item by item, so **neither changes**.

**Planner's choices (for the founder to confirm or overrule; each is reasoned from D-03/D-04):**
- **P-1 — A to-join LIST, not a yes/no flag.** localStorage key `shaper-starred-blanks-to-join` holds the stars made
  while signed out that have not yet joined an account, as `[maker, name]` pairs in starring order. A yes/no flag can't
  tell a star made while signed out from a star that came down from shaper A's account, so it would join A's stars into
  shaper B's account. The list is read through the same allow-list as the stars themselves.
- **P-2 — A part-1 browser counts every star as made while signed out.** Until part 2 writes the to-join key, it does
  not exist. So a browser carrying part 1's stars joins all of them into the account at its first signed-in load after
  this ships. Nothing starred before today is lost. From that load on, the key always exists, possibly empty.
- **P-3 — A failed account read is its own state, `account-unreadable`.** This covers a database hiccup, or a column not
  there yet. The page never breaks (D-03) and shows the browser copy. A star made then is treated like a signed-out star
  (it waits in the to-join list). Nothing is saved, replaced or cleared.
  - Why: folding a failed read into "the account has no stars" would make the next join save just the browser's stars
    over the account's real list. That would lose stars, which D-04 forbids.
- **P-4 — The browser reconciles with the account when the page loads, and when the shaper signs in or out.** It does
  not reconcile on every server refresh. A board save refreshes the page, and replacing the stars then could drop a
  star whose save is still on its way.
- **P-5 — Unstarring while signed out a star that came from the account only changes this browser.** At the next
  sign-in the account's list shows again, and that star comes back: never lost.
  - Why: a "removed while signed out" list would unstar whichever account signs in next, possibly another shaper's.
- **P-6 — The action refuses a value that is not a list**, writing nothing. Otherwise it keeps exactly what the
  allow-list keeps. So unstarring the last star saves `[]`, and the account then holds no stars.
- **P-7 — The Your data page's delete sentence names starred blanks.** It is the one place that lists what an account
  keeps item by item ("units, fit and tip defaults, blank makers and your rack order"). Deleting an account deletes its
  stars too, so the sentence would otherwise be incomplete. /privacy and /terms are unchanged per D-09.
- **P-8 — A join only takes to-join stars that are still starred in this browser.** A tampered or out-of-date to-join
  list can add nothing the shaper can't see. Beyond `STARRED_BLANKS_MAX` (500) a join drops the overflow, the same cap
  part 1 already enforces.

Accepted, not planned: if a signed-in star's save fails all three retries (about 20 seconds) and the page is then
reloaded, the account's older list wins. That is the last-write-wins rule every account preference follows.
</decisions>

<context>
@CLAUDE.md
@.claude/CLAUDE.md
@.planning/quick/261016-usz-stars-on-the-shaper-s-account-starred-bl/261016-usz-BRIEF.md
@.planning/quick/261015-ve9-blank-picker-popup-pick-a-blank-by-sight/261015-ve9-02-SUMMARY.md

Read before building (each once):
- `lib/starred-blanks-preference.ts` and `lib/starred-blanks-preference.test.ts` (all — part 1's exports, which do
  not change).
- `components/starred-blanks-provider.tsx` (all — part 1's provider) and `components/blank-makers-provider.tsx` (all —
  the write queue, `reconciledRef`, the adopt and promote effects this plan copies).
- `lib/preference-handoff.ts` (`createPreferenceWriteQueue`, `PreferenceWriteQueue`).
- `lib/blank-makers-server.ts` (all — the guarded read), `app/actions/blank-makers.ts` (all — the action's shape),
  `lib/db/queries.ts` lines 126–165 (`readBlankMakersPreference`, `readRackOrder`).
- `lib/db/schema.ts` lines 85–111 (`userPreferences`).
- `lib/db/ownership.test.ts` lines 60–200 (the action ledgers).
- `lib/account/account-data.test.ts` lines 40–100 (the typed `preferencesRow` fixture).
- `scripts/check-preference-columns.ts` (all).
- `drizzle/0009_rack_order.sql` (the one-line shape 0011 must match).
- `app/layout.tsx` lines 60–160.
- `components/account/your-data-copy.ts` line 33.
- `e2e/blank-picker.spec.ts` lines 30–60 and 280–355 (the stars tests and their helpers).
</context>

<executor_environment>
These rulings come from the orchestrator. Follow them as written.
- **Where to work.**
  - Your own agent worktree, forked from the session worktree `claude/elastic-joliot-3e9625` (equal to the live
    `main` 0d77fa37 plus this plan).
  - Never touch the main checkout `/Users/kontoes/Code/shaper` or the `main` branch. Never push. Never `cd` into
    another worktree.
  - Another session is researching custom rocker in its own worktree. Leave it alone.
  - If `node_modules` is missing:
    `ln -s /Users/kontoes/Code/shaper/.claude/worktrees/elastic-joliot-3e9625/node_modules node_modules`. Do not
    commit it.
  - Run `npx next typegen` before `npx tsc --noEmit`. A fresh worktree has no `.next/types` until you do.
  - Never start `next dev` yourself. The only dev server is the one Playwright starts on your port.
- **The database: development only.**
  - Generate the migration inside your worktree with `npm run db:generate -- --name starred_blanks < /dev/null`. It
    needs no database. If it refuses for want of a database address, prefix it with
    `MIGRATE_ENV_FILE=/Users/kontoes/Code/shaper/.env.local`.
  - Migrate the DEVELOPMENT branch from inside your worktree with
    `MIGRATE_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install drizzle-kit migrate`. Run it TWICE.
    `drizzle.config.ts` loads that file itself, and the migrations folder resolves to your worktree's `drizzle/`.
  - Prove it with
    `CHECK_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/check-preference-columns.ts`.
    Run it once BEFORE migrating (expect `starred_blanks missing (5 of 6 columns)`, exit 1) and once AFTER (expect
    `starred_blanks text (6 of 6 columns)`, exit 0). Drizzle prints "applied successfully" even when it applied
    nothing, so only the check proves it.
  - **NEVER run `npm run db:migrate:prod`**, `vercel env pull`, or anything that names a production env file.
    Production belongs to the orchestrator and the founder, before the push.
  - Never read, print, copy or edit any `.env*` file. If the sandbox refuses a database command, stop trying. Do not
    work around it. Record the exact refused command in the SUMMARY under "For the orchestrator", and carry on with the
    gates that need no database.
- **Gates.** Everything runs INSIDE your worktree.
  - `npm test`: the 6 failures in `components/design/slider-row.test.ts` are known and happen only in a worktree (two
    copies of React through the linked `node_modules`). Every other test must pass.
  - Playwright:
    - Run `IS_WEBPACK_TEST=1 PW_PORT=3191 npx playwright test …`, after checking `lsof -nP -iTCP:3191 -sTCP:LISTEN` is
      empty (or is your own earlier server).
    - For a long run, detach it: `(IS_WEBPACK_TEST=1 PW_PORT=3191 nohup npx playwright test … > <log outside the repo>
      2>&1; echo E2E_EXIT=$? >> <log>) &`. Then poll the log until `E2E_EXIT` appears, and read the pass/fail line
      yourself.
    - A lone failure in a file this plan doesn't touch, on a cold webpack server: re-run that file alone before
      suspecting the change.
  - The production build check: `npm run build` does not work in a worktree. Use `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk
    CLERK_SECRET_KEY=sk_live_fake-not-a-secret-for-playwright-only DATABASE_URL=postgresql://user:pass@localhost:5432/shaper
    SHAPER_BLANKS_SOURCE=seed-csv npx next build --webpack`. These are playwright.config's deliberate non-secrets. Run
    it after Playwright has finished.
- **Rule 1 / Rule 2.**
  - Every rule about stars lives in `lib/`, pure and tested. The provider only calls those rules.
  - Nothing here is a measurement. If a test needs a length, it uses `mm()` / `inchesToMm()`, branded, never a raw
    number or a literal 25.4.
  - Tests use made-up `[maker, name]` pairs. They never hand-type catalogue figures.
- **No checkpoints.** The founder's checks go in the SUMMARY.
- **Commits.**
  - One per task, plus the SUMMARY.
  - Subjects in plain English for a shaper (the suggested ones are fine).
  - Each message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Stage files by name. Never `git add -A`, never `git stash`.
- **Scratch files** go in `/private/tmp/claude-501/-Users-kontoes-Code-shaper--claude-worktrees-elastic-joliot-3e9625/690c62e9-244d-4b1b-b385-cc5c85f83ce0/scratchpad/`,
  never under `.planning/` or the repo.
- **Scope.** Stay inside `files_modified`. A one-line compile fix elsewhere is allowed if the SUMMARY records it. Do
  not edit STATE.md, ROADMAP.md, CLAUDE.md, the BRIEF, or anything under `content/legal/`.
- **Code comments.** Plain English, citing D-NN / P-NN, quick 261016-usz and 2026-10-16. The founder is they/them.
</executor_environment>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: The rules for which stars join an account at sign-in, pure and tested</name>
  <files>lib/starred-blanks-preference.ts, lib/starred-blanks-preference.test.ts</files>
  <read_first>lib/starred-blanks-preference.ts (all), lib/starred-blanks-preference.test.ts (all), lib/blank-makers-preference.ts (lines 1–25 and 160–190 — the header voice and decideBlankMakersHandoff), lib/preference-handoff.ts (lines 1–60)</read_first>
  <behavior>
    New tests in `lib/starred-blanks-preference.test.ts`. Use made-up pairs, e.g. `["Maker A", "One"]`. Part 1's
    tests stay as they are.
    - `STARRED_BLANKS_TO_JOIN_STORAGE_KEY` is `shaper-starred-blanks-to-join`, and differs from
      `STARRED_BLANKS_STORAGE_KEY`.
    - `parseStarredBlanksInput` (P-6):
      - `null`, `undefined`, a string, a number and a plain object give `null`;
      - `[]` gives `[]`;
      - a list gives exactly what `parseStarredBlanks` keeps: junk entries, empty or 121-character strings and repeats
        dropped, at most 500.
    - `joinStarredBlanks(account, browserOnly)`:
      - the account's stars come first, in their order, then each browser-only star not already on the account, in
        its order;
      - a star on both appears once, in the account's place;
      - 499 on the account plus 3 browser-only gives 500 (the first browser-only one kept);
      - 500 on the account gives the account unchanged;
      - neither input is mutated.
    - `decideStarredBlanksHandoff({ handoff, browser, toJoin })`:
      - **signed out:**
        - `starred` equals the browser list;
        - `writeBrowser`, `writeToJoin` and `saveToAccount` are all `null`, even when a to-join list is present.
      - **`account-unreadable` (P-3):** the same as signed out. `writeToJoin` is `null`, so the waiting stars are kept,
        and nothing is saved.
      - **signed in, `toJoin` `[]` — the account replaces the browser:**
        - browser `[A, B]`, account `[A]` gives `starred` `[A]`, `writeBrowser` `[A]`, `saveToAccount` `null`,
          `writeToJoin` `null`. This is "unstarred on the phone stays unstarred on the computer";
        - browser equal to the account gives `writeBrowser` `null`;
        - account `[]` with browser `[X, Y]` (another shaper's synced stars) gives `starred` `[]`, `writeBrowser` `[]`,
          `saveToAccount` `null`. This is the no-leak case.
      - **signed in, joining (P-1):**
        - browser `[S, X]`, `toJoin` `[X]`, account `[P]` gives `starred` `[P, X]`, `writeBrowser` `[P, X]`,
          `saveToAccount` `[P, X]`, `writeToJoin` `[]`. S, another account's synced star, is not joined.
        - When every to-join star is already on the account, `saveToAccount` is `null` and `writeToJoin` is `[]`.
      - **signed in, `toJoin` `null` — a part-1 browser (P-2):**
        - browser `[X, Y]`, account `[Y, Z]` gives `starred` `[Y, Z, X]`, `saveToAccount` `[Y, Z, X]`, `writeToJoin`
          `[]`;
        - browser `[]`, account `[A]` gives `starred` `[A]`, `writeToJoin` `[]` (now written), `saveToAccount` `null`.
      - **a stale to-join star (P-8):** `toJoin` `[Q]` with Q not in the browser joins nothing, and `saveToAccount` is
        `null`.
    - `applyStarChange({ savesToAccount, starred, toJoin, vendor, name, on })`:
      - Gives `null` whenever `withStar` changes nothing: already starred, not starred, at the cap, or an over-long name.
      - **Browser only** (`savesToAccount: false`):
        - starring adds the blank to both `starred` and `toJoin`, and `save` is `null`;
        - unstarring a to-join star removes it from both;
        - unstarring a star NOT in `toJoin` (one that came from an account) removes it from `starred` and leaves
          `toJoin` unchanged (P-5);
        - with `toJoin` `null` (a part-1 browser), `toJoin` becomes the whole new `starred` list.
      - **Account** (`savesToAccount: true`):
        - starring gives `save` equal to the new list and `toJoin` `null`;
        - unstarring gives `save` equal to the new list;
        - unstarring a blank that is also in a non-null `toJoin` removes it there too;
        - otherwise `toJoin` is `null`.
  </behavior>
  <action>
    Implements D-04 and P-1, P-2, P-3, P-5, P-6, P-8. Write the failing tests first, then add these exports to
    `lib/starred-blanks-preference.ts`. Change nothing that part 1 exported. Keep the file pure: no React, Next,
    Clerk, browser global or database import, and no `localStorage` reference (the provider passes the stored values
    in).
    - `STARRED_BLANKS_TO_JOIN_STORAGE_KEY = "shaper-starred-blanks-to-join"` (P-1).
    - `StarredBlanksHandoff`: a union, `{ kind: "signed-out" }`, `{ kind: "signed-in"; account: StarredBlank[] }` or
      `{ kind: "account-unreadable" }` (P-3). This is what the server resolves and the layout passes down. It must stay
      plain data so it can cross from server to browser.
    - `parseStarredBlanksInput(value: unknown): StarredBlank[] | null`. It is `null` unless `Array.isArray(value)`;
      otherwise `parseStarredBlanks(value)` (P-6, D-06).
    - `joinStarredBlanks(account, browserOnly): StarredBlank[]`. It runs the account's list followed by the browser-only
      list through `parseStarredBlanks`, which already keeps the first of any repeat and stops at the cap (D-04, P-8).
    - `decideStarredBlanksHandoff({ handoff, browser, toJoin })` returns
      `{ starred, writeBrowser, writeToJoin, saveToAccount }`, each write `null` when there is nothing to write. The rules
      are exactly the behaviour block's:
      - signed out or unreadable: show the browser list and write nothing;
      - signed in: the joining stars are `toJoin ?? browser`, filtered to those still in `browser` (compare with
        `starKey`). Then `joined = joinStarredBlanks(handoff.account, joining)`.
        - `writeBrowser` is `joined` only when its `starredBlanksJson` differs from the browser's.
        - `saveToAccount` is `joined` only when it differs from the account's.
        - `writeToJoin` is `[]` whenever `toJoin` was `null` or non-empty.
    - `applyStarChange({ savesToAccount, starred, toJoin, vendor, name, on })` returns `{ starred, toJoin, save } | null`.
      Build it on `withStar`, with the rules exactly as the behaviour block says (P-5 for the browser-only unstar).
    - Rewrite the file header's part-2 paragraph to describe what is now here:
      - signed in, the account is where stars live (D-03);
      - the to-join list and why it is a list (P-1);
      - part 1's browsers (P-2);
      - the unreadable state (P-3).
      Keep the untrusted-value paragraph.

    Commit: `Starred blanks can join a shaper's account — the rules for which stars move to the account at sign-in,
    and which stay put, checked on their own`.
  </action>
  <verify>
    <automated>npx vitest run lib/starred-blanks-preference.test.ts && npx next typegen && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'shaper-starred-blanks-to-join' lib/starred-blanks-preference.ts` is 1.
    - `grep -cE '^export (function|const|type|interface) (decideStarredBlanksHandoff|joinStarredBlanks|applyStarChange|parseStarredBlanksInput|StarredBlanksHandoff|STARRED_BLANKS_TO_JOIN_STORAGE_KEY)\b' lib/starred-blanks-preference.ts` is 6.
    - `grep -cE '^import .*from "(react|next/|@clerk|@/lib/db|@/components)' lib/starred-blanks-preference.ts` is 0.
    - Part 1's exports are unchanged: `grep -cE '^export (function|const|type) (starKey|parseStarredBlanks|parseStarredBlanksText|starredBlanksJson|withStar|STARRED_BLANKS_STORAGE_KEY|STARRED_BLANKS_MAX|StarredBlank)\b' lib/starred-blanks-preference.ts` is 8.
    - The verify command exits 0.
  </acceptance_criteria>
  <done>The join rule, the sign-in decision and the per-star change rule exist as pure functions. Tests prove: the account replaces the browser copy; stars made while signed out join, after the account's; another account's synced stars never join; a part-1 browser joins all its stars; a failed read changes nothing.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: A place on the account for starred blanks, its read and its save — development database migrated and proven</name>
  <files>scripts/check-preference-columns.ts, lib/db/schema.ts, drizzle/0011_starred_blanks.sql, drizzle/meta/0011_snapshot.json, drizzle/meta/_journal.json, lib/db/queries.ts, lib/starred-blanks-server.ts, app/actions/starred-blanks.ts, lib/starred-blanks-account.test.ts, lib/db/ownership.test.ts, lib/account/account-data.test.ts</files>
  <read_first>scripts/check-preference-columns.ts (all), lib/db/schema.ts (lines 85–111), drizzle/0009_rack_order.sql, lib/db/queries.ts (lines 1–30 and 126–165), lib/blank-makers-server.ts (all), app/actions/blank-makers.ts (all), lib/db/ownership.test.ts (lines 60–200), lib/account/account-data.test.ts (lines 40–100), lib/models/rack-report.test.ts (lines 1–30 — the vi.mock idiom)</read_first>
  <behavior>
    `lib/starred-blanks-account.test.ts` (new). It mocks `@clerk/nextjs/server` (`auth`), `@/lib/db/client` (`db`
    with a recording `insert` → `values` → `onConflictDoUpdate` chain) and `@/lib/db/queries`
    (`readStarredBlanksPreference`). It never reaches a database.
    - `saveStarredBlanksPreference` (D-06, P-6):
      - signed out (`auth` resolves `{ userId: null }`): no `insert` call, and it resolves `undefined`;
      - signed in with `null`, a string or an object: no `insert` call;
      - signed in with a list holding a valid pair, a repeat, a 121-character name and a number: exactly one `insert`,
        into `userPreferences`;
      - its `values` are `{ clerkUserId: <the session id>, starredBlanks: <starredBlanksJson of the cleaned list> }`;
      - its `onConflictDoUpdate` target is `userPreferences.clerkUserId`, and its `set` keys are exactly
        `starredBlanks` and `updatedAt` (a `Date`);
      - `[]` saves `"[]"`;
      - 600 distinct valid pairs save the first 500;
      - `auth` is called before `insert` (a shared call log).
    - `resolveStarredBlanksHandoff` (D-03, P-3):
      - signed out gives `{ kind: "signed-out" }` and never calls the read;
      - signed in gives `{ kind: "signed-in", account }` with the read's list;
      - signed in with the read rejecting gives `{ kind: "account-unreadable" }`, calls `console.error` once (spy and
        silence it), and never throws.
    - `lib/db/ownership.test.ts` gains the new action file in every ledger. The new "exports exactly" test expects
      `["saveStarredBlanksPreference"]`.
    - `lib/account/account-data.test.ts`: the typed `preferencesRow` gains `starredBlanks`, and the "carries every
      settings column" test asserts the export carries it exactly as stored.
  </behavior>
  <action>
    Implements D-01, D-03, D-06 and D-08, P-3 and P-6. Work in this order. The order is the before-and-after proof.

    1. **`scripts/check-preference-columns.ts` (D-08).**
       - Add `{ name: "starred_blanks", type: "text" }` to `NEW_COLUMNS` after `rack_order`, with a one-line comment
         (quick 261016-usz, migration 0011: the blanks a shaper starred in ROCKER's PICK A BLANK popup).
       - Add `'starred_blanks'` to the `information_schema` select's `in (…)` list.
       - Update the header comment:
         - the column list and the migration it comes from;
         - the printed first line's example, ending `rack_order text, starred_blanks text (6 of 6 columns)`;
         - "Exits 1 when fewer than 6 of the 6 columns match".
       - Add a production runbook paragraph for quick 261016-usz, in the same form as the 261008-lsy one. It is
         ADDITIVE, so it runs BEFORE the push, the founder only, from the checkout that carries migration 0011 and the
         Vercel link: check first (expected `starred_blanks missing (5 of 6 columns)`, exit 1), then
         `npm run db:migrate:prod`, then check again (expected `starred_blanks text (6 of 6 columns)`, exit 0, one more
         migration recorded). Use the same trap-guarded one-liners.
       - The exit rule already reads `NEW_COLUMNS.length`. Leave the `models: locked` line and `--before-drop` /
         `--thin-tips` / `--verbose` as they are.
       - Then run the development check once: `starred_blanks missing (5 of 6 columns)`, exit 1. Note the "migrations
         recorded" count.
    2. **`lib/db/schema.ts` (D-01).**
       - Add `starredBlanks: text("starred_blanks")` after `rackOrder`. Its comment: quick 261016-usz; JSON text of
         `[maker, name]` pairs in starring order; null = never starred on this account; read through
         `lib/starred-blanks-preference.ts`'s allow-list.
       - Extend the table's doc comment by one sentence, as 260926-wmf did.
    3. **Generate:** `npm run db:generate -- --name starred_blanks < /dev/null`. This writes
       `drizzle/0011_starred_blanks.sql`, `drizzle/meta/0011_snapshot.json` and an updated `_journal.json`. Open the
       `.sql`. It must be the single statement `ALTER TABLE "user_preferences" ADD COLUMN "starred_blanks" text;`, the
       same shape as 0009. Anything else (a drop, a rename prompt, a second statement) means stop and report.
    4. **Migrate development** with the recipe in `<executor_environment>`, twice, then run the check:
       `starred_blanks text (6 of 6 columns)`, exit 0, recorded count one higher than in step 1. Copy all three printed
       lines into the SUMMARY (they print no secrets).
    5. **`lib/db/queries.ts`.** Add `readStarredBlanksPreference(clerkId: string): Promise<StarredBlank[]>`, a copy of
       `readBlankMakersPreference`:
       - one select of `userPreferences.starredBlanks` only, scoped `eq(userPreferences.clerkUserId, clerkId)`;
       - its result run through `parseStarredBlanksText`, so no row, a null column or malformed text gives `[]`;
       - the same read-only doc comment.
    6. **`lib/starred-blanks-server.ts`** (new, P-3). `resolveStarredBlanksHandoff(): Promise<StarredBlanksHandoff>`,
       modelled on `lib/blank-makers-server.ts`:
       - `await auth()`; no user gives `{ kind: "signed-out" }`;
       - otherwise try the read and return `{ kind: "signed-in", account }`;
       - on any failure, `console.error("Shaper: failed to read starred blanks preference", error)` and return
         `{ kind: "account-unreadable" }`. It never throws.
       - Its header explains why a failed read is not "no stars" (P-3), and that there is no cookie (D-05).
    7. **`app/actions/starred-blanks.ts`** (new, `"use server"`, D-06). `saveStarredBlanksPreference(starred: readonly
       StarredBlank[]): Promise<void>`, a copy of `saveBlankMakersPreference`'s shape:
       - `await auth()` first; no user means return quietly;
       - `parseStarredBlanksInput(starred)`; `null` means return without writing;
       - `const value = starredBlanksJson(parsed)`;
       - `db.insert(userPreferences).values({ clerkUserId: userId, starredBlanks: value }).onConflictDoUpdate({ target:
         userPreferences.clerkUserId, set: { starredBlanks: value, updatedAt: new Date() } })`.
       - No cache refresh: the screen already changed in the browser.
       - Keep the parameter type free of parentheses, so the ownership ledger's signature reader parses it.
       - Its header copies blank-makers' identity paragraph (the writing identity comes only from the session).
    8. **Tests**, as the behaviour block says: the new `lib/starred-blanks-account.test.ts`, the ownership ledger
       entries (and the first two tests' titles naming the new file), and the account-data fixture.

    Commit: `The shaper's account gets a place to keep starred blanks (development database only), and saving to it
    checks every star and needs a signed-in shaper`.
  </action>
  <verify>
    <automated>npx vitest run lib/starred-blanks-account.test.ts lib/db/ownership.test.ts lib/account/account-data.test.ts lib/starred-blanks-preference.test.ts && npx next typegen && npx tsc --noEmit && CHECK_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/check-preference-columns.ts</automated>
  </verify>
  <acceptance_criteria>
    - `cat drizzle/0011_starred_blanks.sql` is exactly `ALTER TABLE "user_preferences" ADD COLUMN "starred_blanks" text;`, and `grep -cE 'ALTER|DROP|CREATE|RENAME' drizzle/0011_starred_blanks.sql` is 1.
    - `grep -c '"tag": "0011_starred_blanks"' drizzle/meta/_journal.json` is 1.
    - `grep -c 'starredBlanks: text("starred_blanks")' lib/db/schema.ts` is 1.
    - `grep -c 'name: "starred_blanks", type: "text"' scripts/check-preference-columns.ts` is 1, and `grep -c "6 of 6" scripts/check-preference-columns.ts` is at least 2.
    - The development check printed `starred_blanks text (6 of 6 columns)` and exited 0 after the migration. It printed `starred_blanks missing (5 of 6 columns)` and exited 1 before it. Both outputs are in the SUMMARY.
    - `grep -c "await auth()" app/actions/starred-blanks.ts` is 1, and `grep -c "saveStarredBlanksPreference" lib/db/ownership.test.ts` is at least 1.
    - `npm run db:migrate:prod` appears nowhere in this task's shell history.
    - The verify command exits 0.
  </acceptance_criteria>
  <done>The development database has the column, proven before and after. The account's list can be read, and a failed read is reported as unreadable. A signed-in shaper's stars can be saved through an allow-listed, session-scoped action, and the ownership and export ledgers know the new column.</done>
</task>

<task type="auto">
  <name>Task 3: Stars follow a signed-in shaper to any device — the browser hand-off, the browser proof and the gates</name>
  <files>components/starred-blanks-provider.tsx, app/layout.tsx, components/account/your-data-copy.ts, e2e/blank-picker.spec.ts, .planning/quick/261016-usz-stars-on-the-shaper-s-account-starred-bl/261016-usz-SUMMARY.md</files>
  <read_first>components/starred-blanks-provider.tsx (all), components/blank-makers-provider.tsx (all), app/layout.tsx (lines 60–160), e2e/blank-picker.spec.ts (lines 30–60 and 280–355), components/account/your-data-copy.ts (lines 26–36)</read_first>
  <action>
    Implements D-02, D-03, D-04, D-05, D-07 and P-1 to P-5 and P-7.

    **`components/starred-blanks-provider.tsx`** gains a `handoff: StarredBlanksHandoff` prop. It keeps the context
    value `{ starred, isStarred, setStarred }` exactly as it is, so no popup or card file changes. It is a near copy of
    `BlankMakersProvider`. Every rule is a call into Task 1's functions; the provider re-judges nothing.
    - **Module level.** Beside part 1's store, add:
      - `blockedToJoinRaw`, the page-memory fallback;
      - `getToJoinRaw()`, which returns `null` when the key was never written (P-2);
      - `writeToJoinToBrowser(list)`, for `STARRED_BLANKS_TO_JOIN_STORAGE_KEY`, with the same try/catch shape as
        `writeToBrowser`.
      Still no cookie (D-05).
    - **Snapshots.**
      - `reconciledRef` starts `handoff.kind !== "signed-in"`.
      - While not reconciled, `getSnapshot` returns `starredBlanksJson(handoff.account)`, so a signed-in page never
        shows a stale browser copy; after that it reads storage as part 1 does.
      - `getServerSnapshot` stays `"[]"`.
    - **The write queue.** Copy BlankMakersProvider's lazy `createPreferenceWriteQueue` with save =
      `saveStarredBlanksPreference`, plus its dispose-on-unmount effect (D-03).
    - **Reconcile (P-4).** One effect on `[handoff]`, guarded by a `lastReconciledKindRef`. It runs only when
      `handoff.kind` differs from the last kind it reconciled: the first mount, a sign-in and a sign-out. It:
      1. reads the browser list and the to-join list (`null` when never written);
      2. calls `decideStarredBlanksHandoff`;
      3. writes `writeBrowser` and `writeToJoin` when non-null;
      4. sets `reconciledRef` true and emits;
      5. then requests `saveToAccount` through the queue when non-null.
      A server refresh that keeps the same kind does nothing, so a star whose save is still on its way is never
      replaced (P-4).
    - **`setStarred`.**
      1. Read the browser list fresh from `getSnapshot()` and the to-join list from `getToJoinRaw()`.
      2. Call `applyStarChange` with `savesToAccount: handoff.kind === "signed-in"`. `null` means return.
      3. Write `starred`, and `toJoin` when non-null.
      4. Set `reconciledRef` true and emit synchronously, so the star fills on this tap (D-03).
      5. Then request `save` when non-null.
      Signed out or unreadable, `save` is always null, so no request leaves the browser (D-02, P-3). A star never
      touches the design store (D-07).
    - **Rewrite the file header for part 2:**
      - the three hand-off states;
      - account replaces, signed-out stars join (D-04);
      - the to-join list (P-1, P-2);
      - reconciling on load and sign-in/out only (P-4);
      - no cookie (D-05).
      Keep the raw-string snapshot paragraph.

    **`app/layout.tsx`.**
    - Add `resolveStarredBlanksHandoff()` as a fifth entry in the existing `Promise.all`, so it costs no extra wait.
    - Pass `<StarredBlanksProvider handoff={starredBlanksHandoff}>`.
    - Update the doc comment ("Four handoffs" becomes five, naming the starred blanks' account list, quick 261016-usz)
      and the JSX comment above the provider.

    **`components/account/your-data-copy.ts` (P-7).** The second `consequences` line becomes `Your settings are deleted:
    units, fit and tip defaults, blank makers, starred blanks and your rack order.` Change nothing else on that page.
    Do not touch `content/legal/` (D-09: neither document lists account settings item by item).

    **`e2e/blank-picker.spec.ts`.** In `PICK A BLANK — stars (D-06)`, add one desktop test: signed out, a star waits in
    this browser to join an account at the next sign-in, and nothing is sent to the server (quick 261016-usz). It:
    - opens ROCKER and the popup;
    - records every request carrying a `next-action` header from just before the first star tap to just after the
      unstar;
    - stars the first fitting card;
    - checks localStorage `shaper-starred-blanks-to-join` parses to `[[vendor, name]]`;
    - unstars it, and checks that key parses to `[]`;
    - checks the recorded server-action requests number 0.
    The existing stars tests stay exactly as they are. They prove part 1's signed-out behaviour is unchanged.

    **Gates, in order.** Record every result in the SUMMARY.
    1. `npx next typegen && npx tsc --noEmit`.
    2. `npm run lint`.
    3. `npm test`. Only the 6 known slider-row failures are allowed.
    4. Playwright on port 3191, all three projects: `e2e/blank-picker.spec.ts e2e/blank-makers.spec.ts
       e2e/app-settings.spec.ts e2e/rocker-blanks.spec.ts`.
    5. The `npx next build --webpack` check with the fake environment from `<executor_environment>`.

    Commit (code): `Signed in, starred blanks follow a shaper to any device; stars made while signed out join the
    account at the next sign-in`.

    **Then write `261016-usz-SUMMARY.md`** (`status: complete`). Commit it alone with subject `docs(quick-261016-usz):
    summary — starred blanks on the shaper's account`. It holds:
    - what a shaper sees, in plain words;
    - the three development check lines, before and after;
    - every gate's result;
    - the decisions D-01 to D-09 and the planner's choices P-1 to P-8, for the founder to confirm or overrule;
    - **"For the orchestrator — production, before the push"**: the three commands from the check script's new runbook
      paragraph, with their expected lines;
    - **"For the founder to check"**, signed in, after go-live (or on a dev server signed in to a development
      account):
      1. Star two blanks on the computer, open ROCKER's popup on the phone: both are under ★ STARRED.
      2. Unstar one on the phone, reload the computer: it stays unstarred.
      3. Sign out on the computer, star a third blank, sign back in: all three show, the account's two first, and the
         third shows on the phone after a reload.
      4. Sign out, sign in as a second account on the same browser: none of the first account's stars appear.
      5. Change Imperial/Metric, a fit default, a blank maker and the rack order once each: each still saves. This is
         the every-column-on-insert check.
      6. Your data, Export my designs: the file's `settings` carries `starredBlanks`; the delete warning names starred
         blanks.
  </action>
  <verify>
    <automated>npx next typegen && npx tsc --noEmit && npm run lint && npx vitest run lib/starred-blanks-preference.test.ts lib/starred-blanks-account.test.ts lib/db/ownership.test.ts lib/account/account-data.test.ts lib/units-isolation.test.ts && IS_WEBPACK_TEST=1 PW_PORT=3191 npx playwright test e2e/blank-picker.spec.ts -g "stars"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'resolveStarredBlanksHandoff()' app/layout.tsx` is 1, and `grep -c '<StarredBlanksProvider handoff=' app/layout.tsx` is 1.
    - `grep -cE 'decideStarredBlanksHandoff\(|applyStarChange\(|createPreferenceWriteQueue|saveStarredBlanksPreference' components/starred-blanks-provider.tsx` is at least 4.
    - `grep -cE '^import .*from "@/lib/db' components/starred-blanks-provider.tsx` is 0.
    - `grep -c 'shaper-starred-blanks-to-join' e2e/blank-picker.spec.ts` is at least 1.
    - `grep -c 'blank makers, starred blanks and your rack order' components/account/your-data-copy.ts` is 1.
    - `git diff --quiet 0d77fa37 -- content/legal` exits 0 (D-09: unchanged).
    - `npm test` fails only in `components/design/slider-row.test.ts` (6 tests).
    - The Playwright run of the four named specs on all three projects ends with no failure caused by this change. Any re-run is recorded in the SUMMARY.
    - The `next build --webpack` check exits 0.
    - `261016-usz-SUMMARY.md` exists with `status: complete`, the development check lines, the production commands and the founder's six checks.
    - The verify command exits 0.
  </acceptance_criteria>
  <done>
    - A signed-in page shows the account's stars, joins any signed-out stars after them and saves the result.
    - Every tap shows at once and then saves in order.
    - A signed-out browser behaves exactly as in part 1 and keeps a to-join list.
    - All gates are green except the known worktree-only failures.
    - The SUMMARY tells the orchestrator the production order and tells the founder what to check.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → Server Action | `saveStarredBlanksPreference`'s argument is untrusted and could be anything a script sends |
| localStorage → provider | both stored lists (stars, to-join) can be written by any script or extension on the device |
| session → database | the writing identity must come only from Clerk's session, never from the client |
| deploy → production schema | Drizzle names every column on each `user_preferences` insert, so code knowing `starred_blanks` before production has it breaks every account preference save |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-usz-01 | Tampering | app/actions/starred-blanks.ts input | medium | mitigate | `parseStarredBlanksInput`: a non-list writes nothing; else only `[maker, name]` string pairs of 1–120 chars, repeats dropped, at most 500 (P-6); proven in lib/starred-blanks-account.test.ts |
| T-usz-02 | Spoofing / Elevation | app/actions/starred-blanks.ts identity | high | mitigate | `await auth()` before any statement; no id parameter; insert sets `clerkUserId` from the session; lib/db/ownership.test.ts ledgers the file |
| T-usz-03 | Information disclosure | a shared browser, two shapers | medium | mitigate | only to-join stars (made while signed out, still starred here) ever join; a signed-in load replaces the browser copy; reconcile on load and sign-in/out (P-1, P-4, P-8); decide tests prove the no-leak cases |
| T-usz-04 | Tampering | localStorage to-join list | low | mitigate | read through the same allow-list; a join keeps only stars also in the browser list (P-8), so a tampered list can only re-join the shaper's own visible stars into their own account |
| T-usz-05 | Denial of service | oversized action payload / column | low | mitigate | Next's Server Action body limit, the 500-pair cap and the 120-character text limit bound the stored JSON |
| T-usz-06 | Tampering (data loss) | a failed account read | medium | mitigate | `account-unreadable` state: nothing replaced, saved or cleared (P-3); proven in both test files |
| T-usz-07 | Denial of service | production schema order | high | transfer | additive migration: the orchestrator runs `npm run db:migrate:prod` and the read-only check with the founder BEFORE the push; the executor never touches production |
| T-usz-08 | Information disclosure | star names rendered | low | accept | stars render as React text and an aria-label only, unchanged from part 1 (T-ve9-05) |
</threat_model>

<verification>
- `npx next typegen && npx tsc --noEmit`, `npm run lint`: clean.
- `npm test`: everything green except the 6 known worktree-only failures in `components/design/slider-row.test.ts`.
- The development branch's read-only check: `starred_blanks missing (5 of 6 columns)` (exit 1) before, and
  `starred_blanks text (6 of 6 columns)` (exit 0) after migrating twice.
- Playwright on port 3191: `blank-picker`, `blank-makers`, `app-settings`, `rocker-blanks`, all three projects.
- `next build --webpack` with the fake environment: exit 0.
- `content/legal/` unchanged; `npm run db:migrate:prod` never run by the executor.
</verification>

<success_criteria>
- Signed in, stars are saved on the shaper's account and read back on any device. A signed-in load replaces the
  browser copy with the account's list.
- Stars made while signed out join the account at the next sign-in, after the account's own, and only those join.
- Signed out, nothing changes from part 1, and starring sends nothing to the server.
- A failed account read never breaks a page and never overwrites the account.
- The development database holds `starred_blanks`, proven 6 of 6. Production is untouched, and its three commands are
  written in the check script and the SUMMARY.
</success_criteria>

<production_order>
For the orchestrator and the founder only. The executor never runs any of this. The change is ADDITIVE, so production
migrates BEFORE the push (CLAUDE.md "Database").

Run from the checkout that carries migration 0011 and the Vercel link (`.vercel/`): the main checkout
`/Users/kontoes/Code/shaper`, after the task's commits are merged into local `main`, unpushed.
1. Check before (read-only):
   `bash -c 'trap "rm -f .env.production.pull" EXIT INT TERM; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-preference-columns.ts'`
   Expect three lines:
   - `user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text, rack_order text, starred_blanks missing (5 of 6 columns); extra_center_thickness_mm absent (expected absent)`;
   - `models: locked boolean (1 of 1 columns)`;
   - `drizzle migrations recorded: 11`.
   Exit 1.
2. `npm run db:migrate:prod`.
3. Check again (the same one-liner). Expect `… rack_order text, starred_blanks text (6 of 6 columns); …`, `models:
   locked boolean (1 of 1 columns)`, `drizzle migrations recorded: 12`. Exit 0.
4. Only then push `main`. Then, on the live site, the founder runs the six signed-in checks in the SUMMARY.
</production_order>

<output>
Create `.planning/quick/261016-usz-stars-on-the-shaper-s-account-starred-bl/261016-usz-SUMMARY.md` when done (Task 3).
</output>
