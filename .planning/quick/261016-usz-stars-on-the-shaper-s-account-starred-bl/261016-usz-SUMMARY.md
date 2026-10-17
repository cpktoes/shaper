---
phase: quick-261016-usz
plan: 01
subsystem: account preferences / ROCKER blank picker
status: complete
tags: [starred-blanks, account-preference, drizzle-migration, server-action]
requires:
  - quick 261015-ve9 (part 1: stars in the browser, the PICK A BLANK popup)
provides:
  - user_preferences.starred_blanks (migration 0011, development branch only)
  - lib/starred-blanks-preference.ts join rules (decideStarredBlanksHandoff, applyStarChange, joinStarredBlanks, parseStarredBlanksInput)
  - lib/starred-blanks-server.ts resolveStarredBlanksHandoff
  - app/actions/starred-blanks.ts saveStarredBlanksPreference
affects:
  - app/layout.tsx (a fifth account hand-off)
  - components/starred-blanks-provider.tsx (handoff prop, waiting-to-join list, background save)
  - Your data page's delete warning
tech-stack:
  added: []
  patterns: [the account-preference pattern, sixth instance]
key-files:
  created:
    - lib/starred-blanks-server.ts
    - app/actions/starred-blanks.ts
    - lib/starred-blanks-account.test.ts
    - drizzle/0011_starred_blanks.sql
    - drizzle/meta/0011_snapshot.json
  modified:
    - lib/starred-blanks-preference.ts
    - lib/starred-blanks-preference.test.ts
    - lib/db/schema.ts
    - lib/db/queries.ts
    - drizzle/meta/_journal.json
    - lib/db/ownership.test.ts
    - lib/account/account-data.test.ts
    - scripts/check-preference-columns.ts
    - components/starred-blanks-provider.tsx
    - app/layout.tsx
    - components/account/your-data-copy.ts
    - e2e/blank-picker.spec.ts
decisions:
  - "P-1 to P-8 built exactly as the plan proposed; nothing chosen beyond them"
metrics:
  duration: "about 50 minutes (22:25 to 23:15 local, 2026-10-16)"
  completed: 2026-10-16
actuals:
  tokens: 18900
  tasks: 3
  commits: 3
---

# Quick 261016-usz: stars on the shaper's account (summary)

**Signed in, the blanks a shaper stars in ROCKER's PICK A BLANK popup are saved on their account and show on every
device. Stars made while signed out join the account at the next sign-in, after the account's own. Signed out,
nothing changes from part 1.**

## What a shaper sees

- **Signed in.** Star a blank on the computer and it shows under ★ STARRED in the popup on the phone. Each star or
  unstar shows at once, then saves to the account in the background, and the latest tap always wins.
- **A star removed on one device stays removed.** When a signed-in page loads, the account's list replaces whatever
  the browser had kept.
- **Stars made while signed out aren't lost.** They wait in that browser. At the next sign-in there they are added
  after the account's own stars, and the combined list is saved.
- **A shared browser doesn't leak stars.** If a second shaper signs in on the same browser, none of the first
  shaper's stars go into the second shaper's account. Only stars made while signed out are added.
- **Signed out.** The popup works exactly as part 1 shipped it, and starring sends nothing to the server.
- **If the account can't be read** (a database hiccup, or the new column not there yet), the page still opens, shows
  the browser's own stars, and nothing on the account is overwritten or emptied.
- Starring still never changes a board or marks it unsaved.
- The Your data page's delete warning now reads: "Your settings are deleted: units, fit and tip defaults, blank makers,
  starred blanks and your rack order." Export my designs already carries every settings column, so `starredBlanks` is
  in the file automatically. A unit test proves it.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 9793f8a9 | Starred blanks can join a shaper's account — the rules for which stars move to the account at sign-in, and which stay put, checked on their own |
| 2 | 837f400c | The shaper's account gets a place to keep starred blanks (development database only), and saving to it checks every star and needs a signed-in shaper |
| 3 | f8acaea0 | Signed in, starred blanks follow a shaper to any device; stars made while signed out join the account at the next sign-in |

## The development database (migrated twice, then proven)

The migration file is exactly one line, `ALTER TABLE "user_preferences" ADD COLUMN "starred_blanks" text;`, the same
shape as 0009.

Before (`CHECK_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/check-preference-columns.ts`), exit 1:

```
user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text, rack_order text, starred_blanks missing (5 of 6 columns); extra_center_thickness_mm absent (expected absent)
models: locked boolean (1 of 1 columns)
drizzle migrations recorded: 12
```

`MIGRATE_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install drizzle-kit migrate` ran twice. Both runs
printed "migrations applied successfully!" and exited 0.

After, exit 0:

```
user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text, rack_order text, starred_blanks text (6 of 6 columns); extra_center_thickness_mm absent (expected absent)
models: locked boolean (1 of 1 columns)
drizzle migrations recorded: 13
```

The development branch records 12 migrations before this one, one more than the 11 files 0000–0010. That count was
already there before this task; it is only noted here. Production's expected counts, below, are the plan's
(11, then 12). Trust what production's own check prints.

## Gates

| Gate | Result |
|------|--------|
| `npx next typegen` then `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0, no warnings |
| `npm test` | The only true failures are the 6 known worktree-only ones in `components/design/slider-row.test.ts`. The first two full runs also had 10 and then 7 timeouts at 5 s, in whole-catalogue geometry loops this task never touches (`blank-fit`, `blank-card-art`, `round-tip`). Another session's Playwright had the machine at load 72 on 8 cores. Run alone, those three files passed 143/143. Run with `--testTimeout=60000`, the suite gave 5323 passed, 6 failed (slider-row only), 2 skipped. |
| Playwright, port 3191, `IS_WEBPACK_TEST=1`, all three projects | All 159 tests in the four specs passed or were skipped by design. Each run was in the foreground, one spec group at a time, because the whole set would not finish inside one 10-minute call. `blank-picker`: 26 passed, 40 skipped. `blank-makers` + `app-settings`: 41 passed, 3 skipped, 1 timeout (see the re-run below). `rocker-blanks`: 48 passed. |
| Playwright re-runs | **(a)** `blank-makers.spec.ts:202` on iPhone ran out of its 30 s at a `fill("")` partway through. Re-run alone: `blank-makers` on iPhone, 5/5 passed. **(b)** In two earlier `-g "stars"` runs, part 1's star test (`blank-picker.spec.ts:288`, the first test on a cold webpack server) ran out of its 30 s. The page snapshot showed the star had landed (★ STARRED · 1, button "Unstar …"). Re-run alone it passed in 20.4 s, and it passed again in the full `blank-picker` run. It is load-sensitive near its limit; this change did not break it. |
| The new e2e test (signed out: the to-join key gets `[[vendor, name]]` after a star and `[]` after the unstar; no `next-action` request) | passed every time it ran |
| `npx next build --webpack` with playwright.config's fake environment | exit 0, "Compiled successfully" |
| `content/legal/` unchanged since 0d77fa37 | `git diff --stat` empty |
| `npm run db:migrate:prod` | never run |

## Decisions (for the founder to confirm or overrule)

D-01 to D-09 are the founder's own, built as written:
- **D-01:** a nullable `starred_blanks` text column holds the JSON list.
- **D-02:** nothing changes signed out.
- **D-03:** signed in, the account is where stars live, saved through the write queue.
- **D-04:** nothing starred is lost, and a star removed on one device stays removed. Signed-out stars join after the
  account's own.
- **D-05:** no cookie.
- **D-06:** the action needs a signed-in user, uses the allow-list, and upserts only `starred_blanks` and `updated_at`.
- **D-07:** a star never touches a board.
- **D-08:** the check script now covers 6 of 6 columns.
- **D-09:** `/privacy` and `/terms` don't list settings item by item, so they are unchanged.

The planner's choices, all built as proposed:
- **P-1 — the stars waiting to join an account are a LIST, not a yes/no flag.** It is stored under
  `shaper-starred-blanks-to-join`. That is what keeps one shaper's stars out of another shaper's account.
- **P-2 — a part-1 browser joins all its stars once,** at its first signed-in load after this ships.
- **P-3 — "account unreadable" is its own state.** Nothing is saved, replaced or cleared, and a star made then waits to
  join.
- **P-4 — the browser matches itself to the account only on page load, sign-in and sign-out.** It never does so on an
  ordinary refresh, such as the one a board save triggers.
- **P-5 — unstarring an account star while signed out changes only this browser.** At the next sign-in the account's
  list brings the star back.
- **P-6 — the action refuses anything that isn't a list.** `[]` saves as no stars.
- **P-7 — the Your data delete warning names starred blanks.**
- **P-8 — a join only takes waiting stars still starred here,** and stops at 500.

Accepted, not planned (from the plan): if a signed-in star's save fails all three retries (about 20 seconds) and the
page is then reloaded, the account's older list wins. Every account preference follows that last-write-wins rule.

One behaviour worth knowing, which the plan didn't spell out: the browser matches itself to the account when the
sign-in state changes. Switching straight from one signed-in account to another without signing out in between would
not trigger that match until the next full page load. That switch only exists if Clerk's multi-session mode is turned
on. Normally signing out comes between two shapers, and the provider handles that.

## For the orchestrator — production, before the push

ADDITIVE, so production migrates BEFORE `main` is pushed (CLAUDE.md "Database"). Every insert into `user_preferences`
names every column, so a deploy that knew `starred_blanks` before production had it would break the Imperial/Metric,
fit-default, blank-maker and rack-order saves. Run this from the main checkout once these commits are merged into
local `main`, unpushed, with the founder present. The same three commands are now in `scripts/check-preference-columns.ts`'s
header.

1. Check before (read-only):
   `bash -c 'trap "rm -f .env.production.pull" EXIT INT TERM; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-preference-columns.ts'`
   Expect `… rack_order text, starred_blanks missing (5 of 6 columns); extra_center_thickness_mm absent (expected absent)`,
   `models: locked boolean (1 of 1 columns)` and the current migration count (the plan expects 11). Exit 1.
2. `npm run db:migrate:prod`
3. Check again with the same one-liner. Expect `… rack_order text, starred_blanks text (6 of 6 columns); …`,
   `models: locked boolean (1 of 1 columns)` and a count one higher (the plan expects 12). Exit 0.
4. Only then push `main`.

Nothing was refused by the sandbox. Every development-branch command ran.

## For the founder to check

Signed in, after go-live. A dev server signed in to a development account works too.

1. Star two blanks on the computer, then open ROCKER's PICK A BLANK on the phone: both are under ★ STARRED.
2. Unstar one on the phone, then reload the computer: it stays unstarred.
3. Sign out on the computer, star a third blank, then sign back in: all three show, the account's two first. The third
   also shows on the phone after a reload.
4. Sign out, then sign in as a second account on the same browser: none of the first account's stars appear.
5. Change Imperial/Metric, a fit default, a blank maker and the rack order once each: each still saves. This checks the
   every-column-on-insert risk.
6. On Your data, Export my designs: the file's `settings` carries `starredBlanks`, and the delete warning names starred
   blanks.

## Deviations from Plan

**1. [Rule 1 — acceptance check] The action's header comment named `await auth()`**
- **Found during:** Task 2.
- **Issue:** the plan's check expects `await auth()` exactly once in `app/actions/starred-blanks.ts`. The copied header
  comment made it twice.
- **Fix:** reworded the comment to "the session check (Clerk's `auth()`)". The code is unchanged.
- **Commit:** 837f400c.

**2. Gate procedure.** Playwright ran as three foreground runs (one spec group each) rather than one detached run. The
orchestrator's ruling requires foreground runs, and the whole set doesn't fit in one 10-minute foreground call on a
loaded machine. Same four specs, all three projects.

**3. SUMMARY handling (orchestrator ruling).** This file is written, copied to the session worktree and removed from the
agent worktree. It is not committed, and STATE.md and ROADMAP.md are not touched. That replaces the plan's
"commit the SUMMARY alone".

Otherwise the plan was executed as written.

## Known Stubs

None.

## Threat Flags

None. The new Server Action is the plan's own T-usz-01/02/05 surface, mitigated as planned and in the ownership ledger.

## Self-Check: PASSED

- All created files exist: `lib/starred-blanks-server.ts`, `app/actions/starred-blanks.ts`,
  `lib/starred-blanks-account.test.ts`, `drizzle/0011_starred_blanks.sql`, `drizzle/meta/0011_snapshot.json`.
- Commits 9793f8a9, 837f400c and f8acaea0 are on branch `worktree-agent-a42b47484348da481`.
